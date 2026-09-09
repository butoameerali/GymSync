/**
 * Direct Supabase Upload Utility with TUS Resumable Uploads & RAM-Bypass
 *
 * Architecture:
 * - Files <= 6MB: Standard multipart upload to backend (/api/media/upload).
 * - Files > 6MB: TUS Resumable upload directly to Supabase Storage CDN endpoint.
 *   - Completely bypasses Node.js server RAM.
 *   - Emits real-time progress callbacks (0% -> 100%).
 *   - Automatically resumes from interrupted byte offsets across network hiccups.
 *   - Signed ticket negotiation via /api/media/resumable-ticket prevents exposing master secrets.
 */

import * as tus from 'tus-js-client';

export const LARGE_FILE_THRESHOLD = 6 * 1024 * 1024; // 6 MB

/**
 * Executes a TUS resumable upload directly from browser to Supabase Storage
 */
async function performTusResumableUpload({ endpoint, token, bucket, storagePath, file, onProgress }) {
  return new Promise((resolve, reject) => {
    const upload = new tus.Upload(file, {
      endpoint,
      retryDelays: [0, 1000, 3000, 5000],
      headers: {
        authorization: `Bearer ${token}`,
        'x-upsert': 'true',
      },
      uploadDataDuringCreation: true,
      removeFingerprintOnSuccess: true,
      metadata: {
        bucketName: bucket,
        objectName: storagePath,
        contentType: file.type || 'application/octet-stream',
      },
      chunkSize: 6 * 1024 * 1024,
      onError: (err) => {
        console.error('[TUS Upload Error]:', err);
        reject(err);
      },
      onProgress: (bytesUploaded, bytesTotal) => {
        if (bytesTotal > 0) {
          const percent = Math.round((bytesUploaded / bytesTotal) * 100);
          onProgress(percent);
        }
      },
      onSuccess: () => {
        onProgress(100);
        resolve(true);
      }
    });

    // Check for previous upload session to resume from offset
    upload.findPreviousUploads().then((previousUploads) => {
      if (previousUploads && previousUploads.length > 0) {
        upload.resumeFromPreviousUpload(previousUploads[0]);
      }
      upload.start();
    }).catch(() => {
      upload.start();
    });
  });
}

/**
 * Fallback direct signed PUT upload with backoff retry
 */
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
            reject(new Error(`Direct signed upload failed with HTTP ${xhr.status}`));
          }
        };

        xhr.onerror = () => reject(new Error('Network error during direct upload'));
        xhr.send(file);
      });
    } catch (err) {
      attempt++;
      if (attempt > maxRetries) throw err;
      await new Promise(r => setTimeout(r, attempt * 500));
    }
  }
}

/**
 * Unified Media Upload Entrypoint
 */
export async function uploadMediaWithProgress(file, options = {}) {
  const {
    folder = 'media',
    onProgress = () => {},
    token = localStorage.getItem('gymsync_token') || ''
  } = options;

  if (!file) {
    throw new Error('No file specified for upload.');
  }

  // 1. Files > 6MB: Negotiate TUS resumable ticket
  if (file.size > LARGE_FILE_THRESHOLD) {
    try {
      const ticketRes = await fetch('/api/media/resumable-ticket', {
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

      if (ticketRes.ok) {
        const ticketData = await ticketRes.json();
        if (ticketData.resumableAvailable && ticketData.tusEndpoint) {
          await performTusResumableUpload({
            endpoint: ticketData.tusEndpoint,
            token: ticketData.token,
            bucket: ticketData.bucket,
            storagePath: ticketData.storagePath,
            file,
            onProgress
          });

          return {
            success: true,
            mediaUrl: ticketData.publicUrl,
            directUpload: true,
            resumable: true
          };
        }
      }

      // If TUS ticket was unavailable, try signed upload URL
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
            directUpload: true,
            resumable: false
          };
        }
      }

      // If storage is unconfigured, reject >6MB instead of causing 50MB Node RAM buffering
      throw new Error(`File is ${(file.size / (1024 * 1024)).toFixed(1)}MB. Direct CDN upload is unconfigured, and files exceeding 6MB are not permitted on server fallback.`);
    } catch (err) {
      console.warn('Large file direct upload failed:', err.message);
      throw err;
    }
  }

  // 2. Small files (<= 6MB): Standard multipart server upload
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
            storage: data.storage,
            directUpload: false
          });
        } else {
          reject(new Error(data.message || `Upload failed with status ${xhr.status}`));
        }
      } catch (e) {
        reject(new Error('Invalid response from upload server'));
      }
    };

    xhr.onerror = () => reject(new Error('Network error during upload'));
    xhr.send(formData);
  });
}

export default uploadMediaWithProgress;
