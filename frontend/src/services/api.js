// Core API HTTP wrapper with automatic Authorization Bearer token insertion

const getAuthHeaders = (isJson = true) => {
  const token = localStorage.getItem('gymsync_token') || '';
  return {
    ...(isJson ? { 'Content-Type': 'application/json' } : {}),
    ...(token ? { 'Authorization': `Bearer ${token}` } : {})
  };
};

export const apiFetch = async (url, options = {}) => {
  const isFormData = options.body instanceof FormData;
  const headers = {
    ...getAuthHeaders(!isFormData),
    ...(options.headers || {})
  };

  const response = await fetch(url, {
    ...options,
    headers
  });

  return response;
};

export const apiJson = async (url, options = {}) => {
  const res = await apiFetch(url, options);
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    const err = new Error(errorData.message || `HTTP error ${res.status}`);
    err.status = res.status;
    err.data = errorData;
    throw err;
  }
  return await res.json();
};

export const get = async (endpoint) => {
  const url = endpoint.startsWith('/api') ? endpoint : `/api${endpoint.startsWith('/') ? '' : '/'}${endpoint}`;
  return await apiJson(url, { method: 'GET' });
};

export const post = async (endpoint, data) => {
  const url = endpoint.startsWith('/api') ? endpoint : `/api${endpoint.startsWith('/') ? '' : '/'}${endpoint}`;
  return await apiJson(url, {
    method: 'POST',
    body: JSON.stringify(data)
  });
};

export const put = async (endpoint, data) => {
  const url = endpoint.startsWith('/api') ? endpoint : `/api${endpoint.startsWith('/') ? '' : '/'}${endpoint}`;
  return await apiJson(url, {
    method: 'PUT',
    body: JSON.stringify(data)
  });
};

export const patch = async (endpoint, data = {}) => {
  const url = endpoint.startsWith('/api') ? endpoint : `/api${endpoint.startsWith('/') ? '' : '/'}${endpoint}`;
  return await apiJson(url, {
    method: 'PATCH',
    body: JSON.stringify(data)
  });
};

export const del = async (endpoint) => {
  const url = endpoint.startsWith('/api') ? endpoint : `/api${endpoint.startsWith('/') ? '' : '/'}${endpoint}`;
  return await apiJson(url, { method: 'DELETE' });
};
