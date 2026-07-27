/* 김비서 — FCM 백그라운드 메시지 + 알림 클릭 처리 서비스워커 */
importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: "AIzaSyCG8hJWK6lCs7IVqa1xG4AHN5WLxvWhF04",
  authDomain: "my-planner-59bf7.firebaseapp.com",
  databaseURL: "https://my-planner-59bf7-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "my-planner-59bf7",
  storageBucket: "my-planner-59bf7.firebasestorage.app",
  messagingSenderId: "265250715344",
  appId: "1:265250715344:web:df6f4fe0f98e823c5c50d5"
});

const messaging = firebase.messaging();

// data-only 메시지용 폴백(notification 포함 메시지는 브라우저가 자동 표시)
messaging.onBackgroundMessage((payload) => {
  const n = (payload && payload.notification) || {};
  self.registration.showNotification(n.title || "📅 김비서", {
    body: n.body || "",
    icon: "icon-192.png",
    badge: "icon-192.png"
  });
});

self.addEventListener('notificationclick', (e) => {
  e.notification.close();
  e.waitUntil((async () => {
    const all = await clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const c of all) { if ('focus' in c) return c.focus(); }
    if (clients.openWindow) return clients.openWindow('./');
  })());
});
