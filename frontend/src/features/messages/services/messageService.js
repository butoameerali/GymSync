import { get, post, patch } from '../../../services/api';

export const messageService = {
  getUnreadCount: async () => {
    return await get('/chat/unread-count');
  },

  getConversations: async (userName) => {
    return await get(`/chat/conversations/${encodeURIComponent(userName)}`);
  },

  getConversationMessages: async (user1, user2) => {
    return await get(`/chat/${encodeURIComponent(user1)}/${encodeURIComponent(user2)}`);
  },

  sendMessage: async (receiver, text) => {
    return await post('/chat', { receiver, text });
  },

  markConversationAsRead: async (contactName) => {
    return await patch(`/chat/read/${encodeURIComponent(contactName)}`, {});
  }
};
