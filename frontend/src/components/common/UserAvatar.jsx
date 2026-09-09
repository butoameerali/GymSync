import React, { useState } from 'react';

const AVATAR_GRADIENTS = [
  'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
  'linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%)',
  'linear-gradient(135deg, #10b981 0%, #047857 100%)',
  'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
  'linear-gradient(135deg, #ec4899 0%, #be185d 100%)',
  'linear-gradient(135deg, #06b6d4 0%, #0e7490 100%)'
];

const getGradientForName = (name) => {
  if (!name) return AVATAR_GRADIENTS[0];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % AVATAR_GRADIENTS.length;
  return AVATAR_GRADIENTS[index];
};

const UserAvatar = ({
  src,
  name = 'User',
  size = 40,
  className = '',
  style = {}
}) => {
  const [imgError, setImgError] = useState(false);

  const cleanName = typeof name === 'string' ? name.trim() : 'User';
  const initial = cleanName ? cleanName.charAt(0).toUpperCase() : 'U';
  const background = getGradientForName(cleanName);

  const containerStyle = {
    width: `${size}px`,
    height: `${size}px`,
    minWidth: `${size}px`,
    minHeight: `${size}px`,
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    flexShrink: 0,
    background,
    color: '#ffffff',
    fontWeight: '700',
    fontSize: `${Math.max(12, Math.floor(size * 0.42))}px`,
    lineHeight: 1,
    userSelect: 'none',
    boxShadow: '0 2px 6px rgba(0,0,0,0.12)',
    ...style
  };

  // Only attempt to render img if src exists and hasn't errored
  if (src && typeof src === 'string' && src.trim() && !imgError) {
    return (
      <div className={`user-avatar ${className}`} style={containerStyle}>
        <img
          src={src}
          alt=""
          onError={() => setImgError(true)}
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            display: 'block'
          }}
        />
      </div>
    );
  }

  return (
    <div className={`user-avatar ${className}`} style={containerStyle}>
      <span>{initial}</span>
    </div>
  );
};

export default UserAvatar;
