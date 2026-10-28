import React, { useState, useEffect } from 'react';
import { X, Image as ImageIcon, Check, Sparkles, AlertCircle } from 'lucide-react';
import { toast } from 'react-toastify';
import { getSafeImageUrl } from '../../utils/imageUtils';

const COVER_PRESETS = [
  'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?q=80&w=1470&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1540497077202-7c8a3999166f?q=80&w=1470&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1571902943202-507ec2618e8f?q=80&w=1470&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1584735935682-2f2b69dff9d2?q=80&w=1470&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1517838277536-f5f99be501cd?q=80&w=1470&auto=format&fit=crop'
];

const LOGO_PRESETS = [
  'https://images.unsplash.com/photo-1517838277536-f5f99be501cd?q=80&w=300&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1574680096145-d05b474e2155?q=80&w=300&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1581009146145-b5ef050c2e1e?q=80&w=300&auto=format&fit=crop'
];

const EditMediaModal = ({ isOpen, onClose, gym, type = 'cover', onMediaSaved }) => {
  const isCover = type === 'cover';
  const initialValue = isCover 
    ? (gym?.equipmentImages?.[0] || gym?.photos?.[0] || '')
    : (gym?.logo || localStorage.getItem(`gymsync_${gym?.ownerName}_pic`) || '');

  const [imageUrl, setImageUrl] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setImageUrl(initialValue);
    }
  }, [isOpen, initialValue]);

  if (!isOpen || !gym) return null;

  const token = localStorage.getItem('gymsync_token') || '';

  const handleSave = async (e) => {
    e.preventDefault();
    if (!imageUrl.trim()) {
      toast.error('Please enter a valid image URL or select a preset');
      return;
    }

    setIsSaving(true);
    try {
      const payload = {};
      if (isCover) {
        payload.equipmentImages = [imageUrl.trim()];
        if (Array.isArray(gym.photos)) {
          payload.photos = [imageUrl.trim(), ...gym.photos.slice(1)];
        }
      } else {
        payload.logo = imageUrl.trim();
        // Also update local user avatar if owner matches
        if (gym.ownerName) {
          localStorage.setItem(`gymsync_${gym.ownerName.replace(/\s+/g, '_')}_pic`, imageUrl.trim());
        }
      }

      const res = await fetch(`/api/gym-owner/gym/${gym._id || gym.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify(payload)
      });

      const updatedGym = await res.json();
      if (!res.ok) throw new Error(updatedGym.message || 'Failed to update image');

      toast.success(isCover ? '🎉 Cover photo updated successfully!' : '🎉 Gym logo updated successfully!');
      if (onMediaSaved) {
        onMediaSaved(updatedGym);
      }
      onClose();
    } catch (err) {
      toast.error(err.message || 'Error updating image');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose} style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.75)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 9999,
      padding: '20px'
    }}>
      <div 
        className="glass-panel" 
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%',
          maxWidth: '500px',
          background: 'var(--bg-secondary, #151821)',
          border: '1px solid var(--border-color)',
          borderRadius: '16px',
          padding: '24px',
          boxShadow: '0 20px 40px rgba(0,0,0,0.5)',
          color: 'var(--text-primary)'
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '40px',
              height: '40px',
              borderRadius: '10px',
              background: 'rgba(59, 130, 246, 0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--primary-accent)'
            }}>
              <ImageIcon size={22} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 700 }}>
                {isCover ? 'Update Facility Cover Banner' : 'Update Gym Logo / Profile Avatar'}
              </h3>
              <p style={{ margin: 0, fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                {isCover ? 'Showcase your gym floor to prospective trainees' : 'Represent your brand on feeds & public discovery'}
              </p>
            </div>
          </div>
          <button 
            type="button" 
            onClick={onClose}
            style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSave}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.82rem', color: 'var(--text-secondary)', marginBottom: '4px', fontWeight: 600 }}>
                Image Web URL
              </label>
              <input
                type="url"
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                placeholder="https://images.unsplash.com/..."
                required
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: '8px',
                  background: 'var(--card-bg, rgba(255,255,255,0.05))',
                  border: '1px solid var(--border-color)',
                  color: 'var(--text-primary)',
                  boxSizing: 'border-box'
                }}
              />
            </div>

            {/* Quick Presets */}
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '6px' }}>
                Or select a high-resolution preset:
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: `repeat(${isCover ? 5 : 3}, 1fr)`, gap: '8px' }}>
                {(isCover ? COVER_PRESETS : LOGO_PRESETS).map((p, idx) => (
                  <div
                    key={idx}
                    onClick={() => setImageUrl(p)}
                    style={{
                      height: isCover ? '46px' : '56px',
                      borderRadius: isCover ? '6px' : '50%',
                      overflow: 'hidden',
                      cursor: 'pointer',
                      border: imageUrl === p ? '2px solid var(--primary-accent)' : '1px solid var(--border-color)',
                      transition: 'all 0.2s',
                      position: 'relative'
                    }}
                  >
                    <img src={p} alt="Preset" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  </div>
                ))}
              </div>
            </div>

            {/* Live Preview */}
            {imageUrl && (
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                  Live Preview:
                </label>
                <div style={{
                  height: isCover ? '120px' : '90px',
                  width: isCover ? '100%' : '90px',
                  margin: isCover ? '0' : '0 auto',
                  borderRadius: isCover ? '10px' : '50%',
                  overflow: 'hidden',
                  border: '1px solid var(--border-color)',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.2)'
                }}>
                  <img src={getSafeImageUrl(imageUrl)} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                </div>
              </div>
            )}
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px' }}>
            <button
              type="button"
              onClick={onClose}
              className="btn btn-outline btn-sm"
              style={{ padding: '8px 16px' }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="btn btn-primary btn-sm"
              style={{ padding: '8px 18px', display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              <Check size={15} />
              {isSaving ? 'Saving...' : 'Save & Update'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditMediaModal;
