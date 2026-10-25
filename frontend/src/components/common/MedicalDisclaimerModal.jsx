import React, { useState } from 'react';
import { ShieldAlert, Check } from 'lucide-react';
import './Modal.css';

const MedicalDisclaimerModal = ({ onAccept }) => {
  const [accepted, setAccepted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleConfirm = async () => {
    if (!accepted || submitting) return;
    setSubmitting(true);
    setError('');
    try {
      const res = await onAccept('1.0');
      if (res && res.success === false) {
        setError(res.message || 'Failed to record acceptance. Please try again.');
        setSubmitting(false);
      }
    } catch (err) {
      setError(err.message || 'An unexpected error occurred.');
      setSubmitting(false);
    }
  };

  return (
    <div
      className="modal-backdrop"
      style={{
        zIndex: 99999,
        background: 'rgba(0, 0, 0, 0.75)',
        backdropFilter: 'blur(10px)',
        padding: '16px'
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="medical-disclaimer-title"
    >
      <div
        className="modal-content"
        style={{
          maxWidth: '560px',
          padding: '28px',
          borderRadius: '16px',
          background: 'var(--panel-bg, #151821)',
          border: '1px solid rgba(245, 158, 11, 0.3)',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
          <div
            style={{
              width: '44px',
              height: '44px',
              borderRadius: '12px',
              background: 'rgba(245, 158, 11, 0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#f59e0b',
              flexShrink: 0
            }}
          >
            <ShieldAlert size={26} />
          </div>
          <div>
            <h2
              id="medical-disclaimer-title"
              style={{
                margin: 0,
                fontSize: '1.25rem',
                fontWeight: 700,
                color: 'var(--text-primary)'
              }}
            >
              Medical & Health Disclaimer
            </h2>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
              Required Platform Safety Agreement
            </span>
          </div>
        </div>

        <div
          style={{
            maxHeight: '260px',
            overflowY: 'auto',
            padding: '14px',
            borderRadius: '10px',
            background: 'rgba(0, 0, 0, 0.15)',
            border: '1px solid var(--card-border, rgba(255, 255, 255, 0.08))',
            fontSize: '0.88rem',
            lineHeight: '1.6',
            color: 'var(--text-secondary)',
            marginBottom: '20px'
          }}
        >
          <p style={{ marginTop: 0, marginBottom: '12px' }}>
            GymSync provides general fitness information and a way to follow plans made by trainers.
            <strong> GymSync is not a medical service; it does not diagnose, treat, or prescribe.</strong>
          </p>
          <p style={{ marginBottom: '12px' }}>
            Content, workouts, and tools provided are for educational and informational purposes only
            and do not constitute medical, diagnostic, or dietary prescription advice.
          </p>
          <p style={{ marginBottom: '12px' }}>
            Anyone with a health condition, injury, or underlying medical concern must consult their
            own physician before starting any exercise or diet program.
          </p>
          <p style={{ marginBottom: 0 }}>
            Users are solely responsible for their own health and physical safety decisions.
          </p>
        </div>

        {error && (
          <div
            style={{
              padding: '10px 14px',
              borderRadius: '8px',
              background: 'rgba(239, 68, 68, 0.1)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              color: '#ef4444',
              fontSize: '0.85rem',
              marginBottom: '16px'
            }}
          >
            {error}
          </div>
        )}

        <label
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: '12px',
            cursor: 'pointer',
            padding: '10px',
            borderRadius: '8px',
            background: accepted ? 'rgba(16, 185, 129, 0.08)' : 'transparent',
            border: accepted ? '1px solid rgba(16, 185, 129, 0.25)' : '1px solid transparent',
            transition: 'all 0.2s ease',
            marginBottom: '20px'
          }}
        >
          <input
            type="checkbox"
            checked={accepted}
            onChange={(e) => setAccepted(e.target.checked)}
            disabled={submitting}
            style={{
              width: '18px',
              height: '18px',
              marginTop: '2px',
              accentColor: '#10b981',
              cursor: 'pointer'
            }}
          />
          <span
            style={{
              fontSize: '0.92rem',
              fontWeight: 600,
              color: 'var(--text-primary)',
              lineHeight: '1.4'
            }}
          >
            I understand and accept the Medical Disclaimer
          </span>
        </label>

        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <button
            type="button"
            className="btn btn-primary"
            disabled={!accepted || submitting}
            onClick={handleConfirm}
            style={{
              width: '100%',
              padding: '12px 24px',
              fontSize: '0.95rem',
              fontWeight: 700,
              borderRadius: '10px',
              background: accepted && !submitting ? '#10b981' : 'var(--border-color, #334155)',
              borderColor: accepted && !submitting ? '#10b981' : 'transparent',
              color: '#ffffff',
              cursor: accepted && !submitting ? 'pointer' : 'not-allowed',
              opacity: accepted && !submitting ? 1 : 0.6,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              transition: 'all 0.2s ease'
            }}
          >
            {submitting ? (
              'Recording acceptance...'
            ) : (
              <>
                <Check size={18} />
                Accept & Continue
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default MedicalDisclaimerModal;
