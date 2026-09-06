import React, { useState, useEffect } from 'react';
import Modal from './Modal';

const ConfirmDialog = ({
  isOpen,
  onClose,
  onConfirm,
  title = 'Confirm Action',
  message = 'Are you sure you want to proceed?',
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  isDanger = false,
  typedConfirmation = null, // e.g. 'DELETE'
  loading = false
}) => {
  const [typedInput, setTypedInput] = useState('');

  useEffect(() => {
    if (isOpen) {
      setTypedInput('');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const isConfirmDisabled = loading || (typedConfirmation && typedInput.trim() !== typedConfirmation);

  const handleConfirm = async () => {
    if (isConfirmDisabled) return;
    await onConfirm();
  };

  return (
    <Modal isOpen={isOpen} onClose={loading ? () => {} : onClose} title={title}>
      <div style={{ padding: '8px 0' }}>
        <p style={{ fontSize: '0.95rem', color: 'var(--text-primary)', marginBottom: '16px', lineHeight: 1.5 }}>
          {message}
        </p>

        {typedConfirmation && (
          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '6px' }}>
              Please type <strong style={{ color: isDanger ? '#ef4444' : 'var(--primary-accent)' }}>{typedConfirmation}</strong> to confirm:
            </label>
            <input
              type="text"
              disabled={loading}
              className="search-input"
              style={{ width: '100%', borderColor: isDanger ? '#ef4444' : undefined }}
              placeholder={`Type ${typedConfirmation}`}
              value={typedInput}
              onChange={(e) => setTypedInput(e.target.value)}
            />
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '10px' }}>
          <button
            type="button"
            disabled={loading}
            onClick={onClose}
            style={{
              padding: '8px 16px',
              borderRadius: '6px',
              border: '1px solid var(--card-border)',
              background: 'transparent',
              color: 'var(--text-secondary)',
              cursor: loading ? 'not-allowed' : 'pointer'
            }}
          >
            {cancelText}
          </button>
          <button
            type="button"
            disabled={isConfirmDisabled}
            onClick={handleConfirm}
            style={{
              padding: '8px 16px',
              borderRadius: '6px',
              border: 'none',
              background: isDanger ? '#ef4444' : 'var(--primary-accent)',
              color: '#fff',
              fontWeight: 'bold',
              cursor: isConfirmDisabled ? 'not-allowed' : 'pointer',
              opacity: isConfirmDisabled ? 0.6 : 1
            }}
          >
            {loading ? 'Processing...' : confirmText}
          </button>
        </div>
      </div>
    </Modal>
  );
};

export default ConfirmDialog;
