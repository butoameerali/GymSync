import { notificationService } from './notificationService';

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export const webPushClient = {
  isSupported() {
    return typeof window !== 'undefined' && 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
  },

  async registerServiceWorker() {
    if (!this.isSupported()) return null;
    try {
      const registration = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
      return registration;
    } catch (err) {
      console.warn('Service worker registration notice:', err);
      return null;
    }
  },

  async getSubscriptionStatus() {
    if (!this.isSupported()) return { supported: false, subscribed: false, permission: 'denied' };
    const permission = Notification.permission;
    try {
      const registration = await navigator.serviceWorker.ready;
      const sub = await registration.pushManager.getSubscription();
      return {
        supported: true,
        subscribed: Boolean(sub),
        permission
      };
    } catch {
      return { supported: true, subscribed: false, permission };
    }
  },

  async requestPermissionAndSubscribe() {
    if (!this.isSupported()) {
      return { success: false, reason: 'Push notifications are not supported on this browser.' };
    }

    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      return { success: false, reason: 'Notification permission was dismissed or denied.' };
    }

    const registration = await this.registerServiceWorker();
    if (!registration) {
      return { success: false, reason: 'Failed to initialize service worker.' };
    }

    try {
      const { publicKey } = await notificationService.getVapidPublicKey();
      if (!publicKey) {
        return { success: false, reason: 'Server VAPID public key not available.' };
      }

      const applicationServerKey = urlBase64ToUint8Array(publicKey);
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey
      });

      await notificationService.subscribePush(subscription.toJSON());
      return { success: true, subscription };
    } catch (err) {
      console.error('Push subscription failed:', err);
      return { success: false, reason: err.message || 'Push subscription failed.' };
    }
  },

  async unsubscribe() {
    if (!this.isSupported()) return;
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      if (subscription) {
        const endpoint = subscription.endpoint;
        await subscription.unsubscribe();
        await notificationService.unsubscribePush(endpoint);
      }
    } catch (err) {
      console.warn('Push unsubscription notice:', err);
    }
  }
};

export default webPushClient;
