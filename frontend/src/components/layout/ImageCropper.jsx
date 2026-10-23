import React, { useState, useCallback } from 'react';
import Cropper from 'react-easy-crop';
import { X, Check } from 'lucide-react';

const ImageCropper = ({ imageSrc, onCropComplete, onCancel }) => {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);

  const handleCropComplete = useCallback((croppedArea, croppedAreaPixels) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  const createImage = (url) =>
    new Promise((resolve, reject) => {
      const image = new Image();
      image.addEventListener('load', () => resolve(image));
      image.addEventListener('error', (error) => reject(error));
      image.setAttribute('crossOrigin', 'anonymous');
      image.src = url;
    });

  const getCroppedImg = async (imageSrc, pixelCrop) => {
    const image = await createImage(imageSrc);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    if (!ctx) return null;

    const outWidth = pixelCrop?.width || image.naturalWidth || 400;
    const outHeight = pixelCrop?.height || image.naturalHeight || 400;

    canvas.width = Math.min(800, outWidth);
    canvas.height = Math.min(800, outHeight);

    // Clear transparent pixels so background is NOT black
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (pixelCrop) {
      ctx.drawImage(
        image,
        pixelCrop.x,
        pixelCrop.y,
        pixelCrop.width,
        pixelCrop.height,
        0,
        0,
        canvas.width,
        canvas.height
      );
    } else {
      ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
    }

    return new Promise((resolve) => {
      canvas.toBlob((blob) => {
        if (!blob) return;
        const reader = new FileReader();
        reader.readAsDataURL(blob);
        reader.onloadend = () => {
          resolve(reader.result);
        };
      }, 'image/png');
    });
  };

  const compressOriginalImage = async (url) => {
    try {
      const img = await createImage(url);
      const canvas = document.createElement('canvas');
      const maxDim = 800;
      let width = img.naturalWidth || img.width || 400;
      let height = img.naturalHeight || img.height || 400;
      if (width > maxDim || height > maxDim) {
        if (width > height) {
          height = Math.round((height * maxDim) / width);
          width = maxDim;
        } else {
          width = Math.round((width * maxDim) / height);
          height = maxDim;
        }
      }
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) return url;
      ctx.clearRect(0, 0, width, height);
      ctx.drawImage(img, 0, 0, width, height);
      return canvas.toDataURL('image/png');
    } catch {
      return url;
    }
  };

  const handleSave = async () => {
    try {
      const croppedImage = await getCroppedImg(imageSrc, croppedAreaPixels);
      onCropComplete(croppedImage);
    } catch (e) {
      console.error(e);
      const fallback = await compressOriginalImage(imageSrc);
      onCropComplete(fallback);
    }
  };

  const handleUseOriginal = async () => {
    const optimized = await compressOriginalImage(imageSrc);
    onCropComplete(optimized);
  };

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.88)', zIndex: 9999, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
      <div style={{ position: 'relative', width: '100%', maxWidth: '520px', height: '55%', background: '#1e293b', borderRadius: '16px', overflow: 'hidden' }}>
        <Cropper
          image={imageSrc}
          crop={crop}
          zoom={zoom}
          aspect={3 / 4}
          cropShape="rect"
          showGrid={true}
          onCropChange={setCrop}
          onCropComplete={handleCropComplete}
          onZoomChange={setZoom}
        />
      </div>
      <div style={{ marginTop: '16px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px', width: '100%', maxWidth: '380px' }}>
        <input 
          type="range" 
          value={zoom} 
          min={1} 
          max={3} 
          step={0.1} 
          onChange={(e) => setZoom(e.target.value)} 
          style={{ width: '100%' }}
        />
        <div style={{ display: 'flex', gap: '8px', width: '100%' }}>
          <button type="button" className="btn btn-outline" onClick={onCancel} style={{ flex: 1, padding: '10px', fontSize: '0.85rem', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '5px' }}>
            <X size={15}/> Cancel
          </button>
          <button type="button" className="btn btn-outline" onClick={handleUseOriginal} title="Keep original transparent cutout without cropping" style={{ flex: 1.2, padding: '10px', fontSize: '0.85rem', borderColor: '#10b981', color: '#10b981', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '5px' }}>
            Use Original
          </button>
          <button type="button" className="btn btn-primary" onClick={handleSave} style={{ flex: 1, padding: '10px', fontSize: '0.85rem', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '5px' }}>
            <Check size={15}/> Save
          </button>
        </div>
      </div>
    </div>
  );
};

export default ImageCropper;
