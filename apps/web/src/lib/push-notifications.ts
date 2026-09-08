// apps/web/src/lib/push-notifications.ts
// Browser Web Push Notification & In-App Alert Service

export async function requestPushPermission(): Promise<boolean> {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return false;
  }
  if (Notification.permission === 'granted') {
    return true;
  }
  if (Notification.permission !== 'denied') {
    const permission = await Notification.requestPermission();
    return permission === 'granted';
  }
  return false;
}

export function sendBrowserNotification(title: string, body: string, icon = '/favicon.ico') {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return;
  }

  if (Notification.permission === 'granted') {
    try {
      new Notification(title, {
        body,
        icon,
        badge: icon,
        tag: 'merit-pool-alert',
      });
    } catch (e) {
      console.warn('Browser notification error:', e);
    }
  }
}
