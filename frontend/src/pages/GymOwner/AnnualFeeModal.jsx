import React, { useState } from 'react';
import { CreditCard, CheckCircle, ShieldCheck, Sparkles, AlertCircle, X, DollarSign } from 'lucide-react';
import { toast } from 'react-toastify';
import Modal from '../../components/common/Modal';

const AnnualFeeModal = ({ isOpen, onClose, branch, onSuccess }) => {
  const [paymentMethod, setPaymentMethod] = useState('Card');
  const [transactionRef, setTransactionRef] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!branch) return null;

  const feeAmount = branch.annualSubscriptionFee || 20;

  const handlePay = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const token = localStorage.getItem('gymsync_token') || '';
      const res = await fetch(`/api/gym-owner/gym/${branch._id}/pay-annual-fee`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          paymentMethod,
          transactionRef: transactionRef.trim() || undefined
        })
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || 'Payment processing failed');
      }

      toast.success(data.message || `Annual listing fee confirmed! "${branch.branchName || branch.name}" is now online.`);
      if (onSuccess) {
        onSuccess(data.gym);
      }
      onClose();
    } catch (err) {
      toast.error(err.message || 'Error completing annual fee payment');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Activate Facility Online"
    >
      <form onSubmit={handlePay} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
        {/* Facility Summary Box */}
        <div style={{
          background: 'var(--card-bg-light)',
          border: '1px solid var(--card-border)',
          borderRadius: '12px',
          padding: '16px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '10px'
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
              <h4 style={{ margin: 0, fontSize: '1.05rem', color: 'var(--text-primary)' }}>
                {branch.branchName || branch.name}
              </h4>
              <span style={{
                background: 'rgba(16, 185, 129, 0.15)',
                color: '#10b981',
                padding: '2px 8px',
                borderRadius: '6px',
                fontSize: '0.72rem',
                fontWeight: 600,
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px'
              }}>
                <ShieldCheck size={12} /> Verified
              </span>
            </div>
            <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
              📍 {branch.address || branch.location || 'Branch location'}, {branch.city || ''}
            </p>
          </div>

          <div style={{ textAlign: 'right' }}>
            <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Annual Partner Fee
            </span>
            <div style={{ fontSize: '1.45rem', fontWeight: 800, color: 'var(--primary-accent)' }}>
              Rs. {Number(feeAmount).toLocaleString('en-US')} <span style={{ fontSize: '0.8rem', fontWeight: 500, color: 'var(--text-secondary)' }}>/ year</span>
            </div>
          </div>
        </div>

        {/* Benefits notice */}
        <div style={{
          background: 'rgba(59, 130, 246, 0.08)',
          border: '1px solid rgba(59, 130, 246, 0.25)',
          borderRadius: '10px',
          padding: '12px 14px',
          fontSize: '0.82rem',
          color: 'var(--text-secondary)',
          lineHeight: 1.5
        }}>
          <strong style={{ color: 'var(--primary-accent)', display: 'block', marginBottom: '2px' }}>
            🚀 Instant Live Activation
          </strong>
          Once payment is confirmed, your gym will be published immediately on <strong>Explore Gyms</strong>, allowing local trainees to discover your facility, browse equipment, and book in-person walkthrough tours.
        </div>

        {/* Payment Method Selector */}
        <div>
          <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '8px' }}>
            Choose Payment Method
          </label>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
            {[
              { id: 'Card', label: 'Credit / Debit', icon: '💳' },
              { id: 'Easypaisa', label: 'Easypaisa', icon: '📱' },
              { id: 'JazzCash', label: 'JazzCash', icon: '⚡' }
            ].map(m => (
              <button
                key={m.id}
                type="button"
                onClick={() => setPaymentMethod(m.id)}
                style={{
                  padding: '12px 10px',
                  borderRadius: '10px',
                  border: paymentMethod === m.id ? '2px solid var(--primary-accent)' : '1px solid var(--border-color)',
                  background: paymentMethod === m.id ? 'rgba(59, 130, 246, 0.12)' : 'var(--card-bg, rgba(255,255,255,0.02))',
                  color: 'var(--text-primary)',
                  cursor: 'pointer',
                  textAlign: 'center',
                  fontWeight: paymentMethod === m.id ? 600 : 400,
                  fontSize: '0.85rem',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '4px',
                  transition: 'all 0.2s ease'
                }}
              >
                <span style={{ fontSize: '1.2rem' }}>{m.icon}</span>
                <span>{m.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Mobile Transfer Account Instructions */}
        {paymentMethod !== 'Card' && (
          <div style={{
            background: 'rgba(59, 130, 246, 0.06)',
            border: '1px solid rgba(59, 130, 246, 0.2)',
            borderRadius: '10px',
            padding: '12px 14px',
            fontSize: '0.84rem',
            lineHeight: 1.5
          }}>
            <div style={{ fontWeight: 600, color: 'var(--text-primary)', marginBottom: '4px' }}>
              GymSync Official {paymentMethod} Account:
            </div>
            <div style={{ color: 'var(--text-secondary)' }}>
              Account Number: <strong style={{ color: 'var(--text-primary)' }}>{paymentMethod === 'Easypaisa' ? '0345-9876543' : '0300-1234567'}</strong>
            </div>
            <div style={{ color: 'var(--text-secondary)' }}>
              Account Title: <strong style={{ color: 'var(--text-primary)' }}>GymSync Platform (Billing)</strong>
            </div>
            <div style={{ marginTop: '6px', fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
              Transfer <strong>Rs. {Number(feeAmount).toLocaleString('en-US')}</strong> to the number above, then enter the Transaction ID (TID) from your SMS/app receipt below.
            </div>
          </div>
        )}

        {/* Payment Details Input */}
        <div>
          <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, marginBottom: '6px' }}>
            {paymentMethod === 'Card' ? 'Card Authorization Reference (Optional)' : `${paymentMethod} Transaction ID (TID) *`}
          </label>
          <input
            type="text"
            className="search-input"
            required={paymentMethod !== 'Card'}
            placeholder={paymentMethod === 'Card' ? 'e.g. Card Authorization Ref' : 'e.g. TID-98234812'}
            value={transactionRef}
            onChange={e => setTransactionRef(e.target.value)}
            style={{ width: '100%', padding: '10px 12px' }}
          />
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
          <button
            type="button"
            className="btn btn-outline"
            onClick={onClose}
            disabled={isSubmitting}
          >
            Cancel
          </button>

          <button
            type="submit"
            className="btn btn-primary"
            disabled={isSubmitting}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '10px 20px' }}
          >
            {isSubmitting ? (
              'Processing Activation...'
            ) : (
              <>
                <CheckCircle size={16} /> Pay Rs. {Number(feeAmount).toLocaleString('en-US')} & Go Online
              </>
            )}
          </button>
        </div>
      </form>
    </Modal>
  );
};

export default AnnualFeeModal;
