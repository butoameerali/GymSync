/**
 * Sanitizes image URLs to prevent mixed content, broken localhost links, and missing serverless upload 404s
 */
export const getSafeImageUrl = (
  url, 
  fallback = 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?q=80&w=600&auto=format&fit=crop'
) => {
  if (!url || typeof url !== 'string' || !url.trim()) return fallback;
  
  // If the image points to local dev backend or unpersisted local /uploads/ files
  if (
    url.includes('localhost:5000') || 
    url.startsWith('/uploads/') || 
    url.includes('/uploads/photo-')
  ) {
    return fallback;
  }

  return url;
};
