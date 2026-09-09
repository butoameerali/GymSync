import { get, post, patch } from '../../../services/api';

export const messageService = {
  getUnreadCount: async () => {
    return await get('/chat/unread-count');
  },

  getConversations: async (userName) => {
    return await get(`/chat/conversations/${encodeURIComponent(userName)}`);
  },

  getConversationMessages: async (user1, user2, options = {}) => {
    const params = new URLSearchParams();
    if (options.limit) params.set('limit', options.limit);
    if (options.before) params.set('before', options.before);
    if (options.paginated) params.set('paginated', 'true');
    const query = params.toString();
    return await get(`/chat/${encodeURIComponent(user1)}/${encodeURIComponent(user2)}${query ? `?${query}` : ''}`);
  },

  sendMessage: async (receiver, text) => {
    return await post('/chat', { receiver, text });
  },

  markConversationAsRead: async (contactName) => {
    return await patch(`/chat/read/${encodeURIComponent(contactName)}`, {});
  }
};
