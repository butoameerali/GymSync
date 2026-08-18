import { apiFetch, apiJson } from './api';

export const postService = {
  async getPosts() {
    try {
      const res = await apiFetch('/api/posts');
      if (!res.ok) return [];
      const data = await res.json();
      return Array.isArray(data) ? data : [];
    } catch (err) {
      console.error('Error fetching posts:', err);
      return [];
    }
  },

  async createPost(formData) {
    const res = await apiFetch('/api/posts', {
      method: 'POST',
      body: formData
    });
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.message || 'Failed to create post');
    }
    return await res.json();
  },

  async likePost(postId) {
    return await apiJson(`/api/posts/${postId}/like`, { method: 'POST' });
  },

  async addComment(postId, text) {
    return await apiJson(`/api/posts/${postId}/comment`, {
      method: 'POST',
      body: JSON.stringify({ text })
    });
  },

  async deleteComment(postId, commentId) {
    return await apiJson(`/api/posts/${postId}/comment/${commentId}`, { method: 'DELETE' });
  },

  async addReply(postId, commentId, text) {
    return await apiJson(`/api/posts/${postId}/comment/${commentId}/reply`, {
      method: 'POST',
      body: JSON.stringify({ text })
    });
  },

  async deleteReply(postId, commentId, replyId) {
    return await apiJson(`/api/posts/${postId}/comment/${commentId}/reply/${replyId}`, { method: 'DELETE' });
  },

  async reportPost(postId, reason, explanation) {
    return await apiJson(`/api/posts/${postId}/report`, {
      method: 'POST',
      body: JSON.stringify({ reason, explanation })
    });
  },

  async removePostWithReason(postId, reason) {
    return await apiJson(`/api/admin/posts/${postId}/remove-with-reason`, {
      method: 'DELETE',
      body: JSON.stringify({ reason })
    });
  }
};
