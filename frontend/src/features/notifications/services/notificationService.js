import { get, post, put, patch, del } from '../../../services/api';

export const notificationService = {
  getNotifications: async (userName, page = 1, limit = 20, isRead = '') => {
    let url = `/notifications/${encodeURIComponent(userName)}?page=${page}&limit=${limit}`;
    if (isRead !== '') url += `&isRead=${isRead}`;
    return await get(url);
  },

  getUnreadCount: async () => {
    return await get('/notifications/unread-count');
  },

  markSingleAsRead: async (notificationId) => {
    return await patch(`/notifications/item/${notificationId}/read`, {});
  },

  markAllAsRead: async (userName) => {
    try {
      return await patch('/notifications/read-all', {});
    } catch {
      if (userName) {
        return await patch(`/notifications/${encodeURIComponent(userName)}/read`, {});
      }
    }
  },

  deleteNotification: async (notificationId) => {
    return await del(`/notifications/item/${notificationId}`);
  },

  deleteAllNotifications: async (userName) => {
    try {
      return await del('/notifications/clear-all');
    } catch {
      if (userName) {
        return await del(`/notifications/${encodeURIComponent(userName)}/all`);
      }
    }
  },

  getPreferences: async () => {
    return await get('/notifications/preferences');
  },

  updatePreferences: async (preferences) => {
    return await put('/notifications/preferences', preferences);
  },

  getVapidPublicKey: async () => {
    return await get('/notifications/vapid-public-key');
  },

  subscribePush: async (subscription) => {
    return await post('/notifications/subscribe', subscription);
  },

  unsubscribePush: async (endpoint) => {
    return await del('/notifications/unsubscribe', { body: JSON.stringify({ endpoint }) });
  },

  snoozeNotification: async (notificationId, hours = 24) => {
    return await post(`/notifications/item/${notificationId}/snooze`, { hours });
  },

  stopNotification: async (notificationId) => {
    return await post(`/notifications/item/${notificationId}/stop`, {});
  }
};
