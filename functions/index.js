/* 김비서 — 매분 실행되어 도래한 일정 알림을 FCM으로 발송 */
const { onSchedule } = require("firebase-functions/v2/scheduler");
const { initializeApp } = require("firebase-admin/app");
const { getDatabase } = require("firebase-admin/database");
const { getMessaging } = require("firebase-admin/messaging");

initializeApp({
  databaseURL: "https://my-planner-59bf7-default-rtdb.asia-southeast1.firebasedatabase.app"
});

const ICON = "https://odols7582.github.io/planner/icon-192.png";
const LINK = "https://odols7582.github.io/planner/";
const WEEK = ["일", "월", "화", "수", "목", "금", "토"];

exports.sendScheduleAlarms = onSchedule(
  { schedule: "every 1 minutes", timeZone: "Asia/Seoul", region: "asia-southeast1" },
  async () => {
    const db = getDatabase();
    const now = Date.now();

    // 사진(diaries) 다운로드를 피하려고 meta 키로 uid 목록만 확보
    const metaSnap = await db.ref("/meta").get();
    const uids = Object.keys(metaSnap.val() || {});

    for (const uid of uids) {
      const [schSnap, tokSnap, memSnap] = await Promise.all([
        db.ref(`/users/${uid}/schedules`).get(),
        db.ref(`/users/${uid}/fcmTokens`).get(),
        db.ref(`/users/${uid}/memos`).get(),
      ]);
      const tokens = Object.keys(tokSnap.val() || {});
      if (!tokens.length) continue;

      const schedules = schSnap.val() || {};
      for (const sid of Object.keys(schedules)) {
        const s = schedules[sid];
        if (!s || s.alarm === undefined || s.alarm === null || s.done) continue;
        const t = s.time || "09:00";
        const dt = new Date(`${s.date}T${t}:00+09:00`).getTime();
        if (isNaN(dt)) continue;
        const at = dt - Number(s.alarm) * 60000;
        if (s.notified === at) continue;              // 이미 발송됨
        if (now >= at && now < at + 6 * 60000) {       // 도래 후 6분 이내
          await sendAndMark(db, uid, sid, at, tokens, s);
        }
      }

      // 메모 ~분 후 알림
      const memos = memSnap.val() || {};
      for (const mid of Object.keys(memos)) {
        const m = memos[mid];
        if (!m || !m.remindAt || m.notified) continue;
        const at = Number(m.remindAt);
        if (!isNaN(at) && now >= at && now < at + 6 * 60000) {
          await sendMemoAndMark(db, uid, mid, tokens, m);
        }
      }
    }
  }
);

function buildBody(s) {
  const day = new Date(`${s.date}T00:00:00+09:00`);
  const [ , m, d ] = s.date.split("-").map(Number);
  const w = WEEK[day.getDay()];
  const when = s.allday ? "종일" : (s.time || "");
  const memo = s.memo ? " · " + s.memo : "";
  return `${m}월 ${d}일 (${w}) ${when}${memo}`.trim();
}

async function sendAndMark(db, uid, sid, at, tokens, s) {
  const message = {
    tokens,
    notification: { title: "📅 " + (s.title || "일정"), body: buildBody(s) },
    webpush: {
      headers: { Urgency: "high", TTL: "600" },   // 즉시 전달(배터리 절약에 밀리지 않게) + 10분 후 만료
      notification: { icon: ICON, badge: ICON, requireInteraction: true },
      fcmOptions: { link: LINK },
    },
  };
  try {
    const res = await getMessaging().sendEachForMulticast(message);
    console.log(`알림 발송 "${s.title}" → 성공 ${res.successCount}/${tokens.length} (at=${new Date(at).toISOString()}, now=${new Date().toISOString()})`);
    const removals = [];
    res.responses.forEach((r, i) => {
      if (!r.success) {
        const code = r.error && r.error.code;
        if (
          code === "messaging/registration-token-not-registered" ||
          code === "messaging/invalid-argument"
        ) {
          removals.push(db.ref(`/users/${uid}/fcmTokens/${tokens[i]}`).remove());
        }
      }
    });
    await Promise.allSettled(removals);
  } catch (e) {
    // 발송 실패는 무시(다음 분에 재시도되지 않도록 아래에서 notified 마킹)
  }
  await db.ref(`/users/${uid}/schedules/${sid}/notified`).set(at);
}

async function sendMemoAndMark(db, uid, mid, tokens, m) {
  const message = {
    tokens,
    notification: { title: "📝 " + (m.title || "메모"), body: (m.content || "").slice(0, 100) },
    webpush: {
      headers: { Urgency: "high", TTL: "600" },
      notification: { icon: ICON, badge: ICON, requireInteraction: true },
      fcmOptions: { link: LINK },
    },
  };
  try {
    const res = await getMessaging().sendEachForMulticast(message);
    console.log(`메모알림 "${m.title}" → 성공 ${res.successCount}/${tokens.length}`);
  } catch (e) {}
  await db.ref(`/users/${uid}/memos/${mid}/notified`).set(true);
}
