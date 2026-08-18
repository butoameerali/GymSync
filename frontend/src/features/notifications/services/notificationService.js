import { get, patch, del } from '../../../services/api';

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
    return await patch(`/notifications/${encodeURIComponent(userName)}/read`, {});
  },

  deleteNotification: async (notificationId) => {
    return await del(`/notifications/item/${notificationId}`);
  }
};
