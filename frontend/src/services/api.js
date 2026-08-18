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
