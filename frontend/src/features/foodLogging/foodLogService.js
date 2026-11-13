/**
 * Food Logging & Pakistani Food Database API Client
 */

const API_BASE = '/api';

function getAuthHeaders() {
  const token = localStorage.getItem('gymsync_token') || '';
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  };
}

export const foodLogService = {
  // Search Pakistani Food database
  async searchFoods(query = '', category = 'all', limit = 40, filters = {}) {
    const params = new URLSearchParams();
    if (query) params.append('q', query);
    if (category && category !== 'all') params.append('category', category);
    if (filters && filters.tag && filters.tag !== 'all') params.append('tag', filters.tag);
    if (filters && filters.mealSlot && filters.mealSlot !== 'all') params.append('mealSlot', filters.mealSlot);
    if (filters && filters.minProtein) params.append('minProtein', filters.minProtein);
    if (filters && filters.maxCalories) params.append('maxCalories', filters.maxCalories);
    if (limit) params.append('limit', limit);

    const res = await fetch(`${API_BASE}/foods/search?${params.toString()}`);
    if (!res.ok) throw new Error('Failed to search Pakistani foods');
    return res.json();
  },

  // Get categories
  async getCategories() {
    const res = await fetch(`${API_BASE}/foods/categories`);
    if (!res.ok) throw new Error('Failed to fetch food categories');
    return res.json();
  },

  // Get single food item
  async getFoodById(id) {
    const res = await fetch(`${API_BASE}/foods/${id}`);
    if (!res.ok) throw new Error('Failed to fetch food details');
    return res.json();
  },

  // Record a meal log (today or backfill)
  async logMeal({ date, mealSlot, items, notes }) {
    const res = await fetch(`${API_BASE}/food-log`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ date, mealSlot, items, notes })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to log food');
    return data;
  },

  // Get food logs for a date
  async getFoodLogs(dateStr) {
    const params = new URLSearchParams();
    if (dateStr) params.append('date', dateStr);

    const res = await fetch(`${API_BASE}/food-log?${params.toString()}`, {
      headers: getAuthHeaders()
    });
    if (!res.ok) throw new Error('Failed to fetch food logs');
    return res.json();
  },

  // Delete a food log entry
  async deleteFoodLog(id) {
    const res = await fetch(`${API_BASE}/food-log/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders()
    });
    if (!res.ok) throw new Error('Failed to delete food log');
    return res.json();
  },

  // Get diet report (day or week)
  async getDietReport(dateStr, range = 'day') {
    const params = new URLSearchParams();
    if (dateStr) params.append('date', dateStr);
    params.append('range', range);

    const res = await fetch(`${API_BASE}/food-log/report?${params.toString()}`, {
      headers: getAuthHeaders()
    });
    if (!res.ok) throw new Error('Failed to fetch diet report');
    return res.json();
  }
};

export default foodLogService;
