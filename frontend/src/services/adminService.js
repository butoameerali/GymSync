import { apiFetch, apiJson } from './api';

export const adminService = {
  async getAdminStats() {
    try {
      const res = await apiFetch('/api/admin/stats');
      if (!res.ok) return null;
      return await res.json();
    } catch (err) {
      console.error('Error fetching admin stats:', err);
      return null;
    }
  },

  async getUsers() {
    try {
      const res = await apiFetch('/api/admin/users');
      if (!res.ok) return [];
      const data = await res.json();
      return Array.isArray(data) ? data : [];
    } catch (err) {
      return [];
    }
  },

  async updateUserRole(userId, role) {
    return await apiJson(`/api/admin/users/${userId}/role`, {
      method: 'PUT',
      body: JSON.stringify({ role })
    });
  },

  async toggleUserBan(userId, isBanned, banReason = '') {
    return await apiJson(`/api/admin/users/${userId}/ban`, {
      method: 'PUT',
      body: JSON.stringify({ isBanned, banReason })
    });
  },

  async getAuditLogs() {
    try {
      const res = await apiFetch('/api/admin/audit-logs');
      if (!res.ok) return [];
      const data = await res.json();
      return Array.isArray(data) ? data : [];
    } catch (err) {
      return [];
    }
  }
};
