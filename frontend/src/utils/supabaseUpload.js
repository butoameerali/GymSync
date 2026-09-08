/**
 * Direct Supabase Upload Utility with Progress Tracking & RAM-Bypass
 * 
 * For files > 6MB:
 * 1. Requests a short-lived signed upload URL from `/api/media/signed-upload-url`.
 * 2. Directly streams binary data from browser to Supabase Storage CDN using XMLHttpRequest.
 * 3. Bypasses Node.js server RAM completely and eliminates memory buffering.
 * 4. Implements automatic retry logic with backoff for network resilience.
 * 
 * For smaller files or when Supabase is not configured:
 * Gracefully falls back to standard multipart upload (`/api/media/upload`) with progress monitoring.
 */

const LARGE_FILE_THRESHOLD = 6 * 1024 * 1024; // 6 MB

async function attemptDirectSignedUpload(signedUrl, file, onProgress, maxRetries = 2) {
  let attempt = 0;
  while (attempt <= maxRetries) {
    try {
      return await new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open('PUT', signedUrl, true);
        xhr.setRequestHeader('Content-Type', file.type || 'application/octet-stream');

        xhr.upload.onprogress = (event) => {
          if (event.lengthComputable) {
            const percent = Math.round((event.loaded / event.total) * 100);
            onProgress(percent);
          }
        };

        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            onProgress(100);
            resolve(true);
          } else {
            reject(new Error(`Direct CDN upload HTTP ${xhr.status}`));
          }
        };

        xhr.onerror = () => reject(new Error('Network error during direct CDN upload'));
        xhr.send(file);
      });
    } catch (err) {
      attempt++;
      if (attempt > maxRetries) throw err;
      // Exponential backoff: 500ms, 1000ms
      await new Promise(r => setTimeout(r, attempt * 500));
    }
  }
}

export async function uploadMediaWithProgress(file, options = {}) {
  const {
    folder = 'media',
    onProgress = () => {},
    token = localStorage.getItem('gymsync_token') || ''
  } = options;

  if (!file) {
    throw new Error('No file specified for upload.');
  }

  // 1. If large file (>6MB), attempt direct signed CDN upload
  if (file.size > LARGE_FILE_THRESHOLD) {
    try {
      const signedRes = await fetch('/api/media/signed-upload-url', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          fileName: file.name,
          folder,
          contentType: file.type || 'application/octet-stream',
          fileSize: file.size
        })
      });

      if (signedRes.ok) {
        const signedData = await signedRes.json();
        if (signedData.directUploadAvailable && signedData.signedUrl) {
          await attemptDirectSignedUpload(signedData.signedUrl, file, onProgress);
          return {
            success: true,
            mediaUrl: signedData.publicUrl,
            directUpload: true
          };
        }
      }
    } catch (err) {
      console.warn('Direct upload negotiation/transfer failed, falling back to server upload:', err.message);
    }
  }

  // 2. Standard server upload fallback with progress
  return await new Promise((resolve, reject) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('folder', folder);

    const xhr = new XMLHttpRequest();
    xhr.open('POST', '/api/media/upload', true);
    if (token) {
      xhr.setRequestHeader('Authorization', `Bearer ${token}`);
    }

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) {
        const percent = Math.round((event.loaded / event.total) * 100);
        onProgress(percent);
      }
    };

    xhr.onload = () => {
      try {
        const data = JSON.parse(xhr.responseText || '{}');
        if (xhr.status >= 200 && xhr.status < 300 && (data.success || data.mediaUrl || data.url)) {
          onProgress(100);
          resolve({
            success: true,
            mediaUrl: data.mediaUrl || data.url,
            directUpload: false
          });
        } else {
          reject(new Error(data.message || data.error || 'Upload failed'));
        }
      } catch (e) {
        reject(new Error('Invalid response from media server'));
      }
    };

    xhr.onerror = () => reject(new Error('Network error during media upload'));
    xhr.send(formData);
  });
}

export default uploadMediaWithProgress;
