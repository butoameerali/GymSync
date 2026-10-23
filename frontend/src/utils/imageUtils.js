/**
 * Sanitizes image URLs to prevent mixed content and broken localhost links in production
 */
export const getSafeImageUrl = (
  url, 
  fallback = 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?q=80&w=600&auto=format&fit=crop'
) => {
  if (!url || typeof url !== 'string') return fallback;
  
  // If the image points to local dev backend, strip localhost:5000 so it resolves via relative proxy
  if (url.includes('localhost:5000')) {
    return url.replace(/^https?:\/\/localhost:5000/, '');
  }

  return url;
};
