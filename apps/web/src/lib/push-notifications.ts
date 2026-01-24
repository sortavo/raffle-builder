export async function requestNotificationPermission(): Promise<boolean> {
  if (!('Notification' in window)) {
    console.log('Browser does not support notifications');
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

export function showBrowserNotification(
  title: string, 
  options?: NotificationOptions
): Notification | null {
  if (Notification.permission === 'granted') {
    return new Notification(title, {
      icon: '/icon-192.svg',
      badge: '/icon-192.svg',
      ...options
    });
  }
  return null;
}

export function canShowNotifications(): boolean {
  return 'Notification' in window && Notification.permission === 'granted';
}

export function getNotificationPermissionStatus(): NotificationPermission | 'unsupported' {
  if (!('Notification' in window)) {
    return 'unsupported';
  }
  return Notification.permission;
}
