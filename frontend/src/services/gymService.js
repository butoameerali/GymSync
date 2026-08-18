import { apiFetch, apiJson } from './api';

export const gymService = {
  async getGyms() {
    try {
      const res = await apiFetch('/api/gyms');
      if (!res.ok) return [];
      const data = await res.json();
      return Array.isArray(data) ? data : [];
    } catch (err) {
      console.error('Error fetching gyms:', err);
      return [];
    }
  },

  async getGymDetails(gymId) {
    return await apiJson(`/api/gyms/${gymId}`);
  },

  async registerGym(gymData) {
    return await apiJson('/api/gyms', {
      method: 'POST',
      body: JSON.stringify(gymData)
    });
  },

  async getPendingGyms() {
    try {
      const res = await apiFetch('/api/admin/gyms/pending');
      if (!res.ok) return [];
      const data = await res.json();
      return Array.isArray(data) ? data : [];
    } catch (err) {
      return [];
    }
  },

  async approveGym(gymId) {
    return await apiJson(`/api/admin/gyms/${gymId}/approve`, { method: 'PUT' });
  },

  async checkInMember(userName, gymName) {
    return await apiJson('/api/gym-owner/attendance/check-in', {
      method: 'POST',
      body: JSON.stringify({ userName, gymName })
    });
  },

  async checkOutMember(attendanceId) {
    return await apiJson(`/api/gym-owner/attendance/check-out/${attendanceId}`, { method: 'PUT' });
  }
};
