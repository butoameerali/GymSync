import React from 'react';

const EmptyState = ({ title = 'No Data Available', message = 'There are no items to display at this time.', actionLabel, onAction }) => {
  return (
    <div className="glass-panel" style={{ padding: '32px 20px', textAlign: 'center', margin: '20px 0' }}>
      <div style={{ fontSize: '2.5rem', marginBottom: '12px', opacity: 0.7 }}>🏋️‍♂️</div>
      <h3 style={{ fontSize: '1.1rem', color: 'var(--text-primary)', marginBottom: '8px' }}>{title}</h3>
      <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', maxWidth: '400px', margin: '0 auto 16px auto' }}>{message}</p>
      {actionLabel && onAction && (
        <button className="btn-glow" onClick={onAction} style={{ padding: '8px 20px', fontSize: '0.85rem' }}>
          {actionLabel}
        </button>
      )}
    </div>
  );
};

export default EmptyState;
