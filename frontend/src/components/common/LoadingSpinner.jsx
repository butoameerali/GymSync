import React from 'react';

const LoadingSpinner = ({ size = 'medium', message = 'Loading...' }) => {
  const dimensions = size === 'small' ? '24px' : size === 'large' ? '48px' : '36px';

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '40px 20px',
      gap: '16px',
      color: 'var(--text-secondary, #94a3b8)'
    }}>
      <div style={{
        width: dimensions,
        height: dimensions,
        border: '3px solid rgba(255, 255, 255, 0.1)',
        borderTopColor: 'var(--primary-accent, #3b82f6)',
        borderRadius: '50%',
        animation: 'spin 0.8s linear infinite'
      }} />
      {message && <span style={{ fontSize: '0.9rem', fontWeight: 500 }}>{message}</span>}
      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default LoadingSpinner;
