package com.odols.kimbiseo;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.Context;
import android.content.Intent;
import android.net.Uri;
import android.widget.RemoteViews;

public class MemoWidget extends AppWidgetProvider {
    @Override
    public void onUpdate(Context context, AppWidgetManager appWidgetManager, int[] appWidgetIds) {
        for (int appWidgetId : appWidgetIds) {
            RemoteViews views = new RemoteViews(context.getPackageName(), R.layout.widget_memo);

            // 위젯 탭 → 앱이 '새 메모' 화면으로 열림 (커스텀 스킴 딥링크)
            Intent intent = new Intent(Intent.ACTION_VIEW, Uri.parse("kimbiseo://compose/memo"));
            intent.setPackage(context.getPackageName());
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_SINGLE_TOP);

            int flags = PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE;
            PendingIntent pi = PendingIntent.getActivity(context, 0, intent, flags);

            views.setOnClickPendingIntent(R.id.widget_root, pi);
            appWidgetManager.updateAppWidget(appWidgetId, views);
        }
    }
}
