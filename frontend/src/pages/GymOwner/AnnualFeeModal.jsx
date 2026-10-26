import React, { useState } from 'react';
import { CreditCard, CheckCircle, ShieldCheck, Sparkles, AlertCircle, Lock, Shield } from 'lucide-react';
import { toast } from 'react-toastify';
import Modal from '../../components/common/Modal';

const AnnualFeeModal = ({ isOpen, onClose, branch, onSuccess }) => {
  const [paymentMethod, setPaymentMethod] = useState('Card');
  const [transactionRef, setTransactionRef] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Stripe Card Details State
  const [cardholderName, setCardholderName] = useState('');
  const [cardNumber, setCardNumber] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [cvc, setCvc] = useState('');

  if (!branch) return null;

  const feeAmount = branch.annualSubscriptionFee || 20;

  // Format Card Number into 4-4-4-4 pattern
  const handleCardNumberChange = (e) => {
    const raw = e.target.value.replace(/\D/g, '').slice(0, 16);
    const parts = raw.match(/.{1,4}/g) || [];
    setCardNumber(parts.join(' '));
  };

  // Format Expiration Date into MM/YY pattern
  const handleExpiryChange = (e) => {
    let raw = e.target.value.replace(/\D/g, '').slice(0, 4);
    if (raw.length > 2) {
      raw = `${raw.slice(0, 2)}/${raw.slice(2)}`;
    }
    setExpiryDate(raw);
  };

  const handlePay = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const isCard = paymentMethod === 'Card';

      if (isCard) {
        if (!cardholderName.trim()) {
          toast.error('Please enter the cardholder name.');
          setIsSubmitting(false);
          return;
        }
        const cleanCard = cardNumber.replace(/\s+/g, '');
        if (cleanCard.length < 15) {
          toast.error('Please enter a valid 16-digit card number.');
          setIsSubmitting(false);
          return;
        }
        if (!expiryDate || expiryDate.length < 5) {
          toast.error('Please enter card expiration date (MM/YY).');
          setIsSubmitting(false);
          return;
        }
        if (!cvc || cvc.length < 3) {
          toast.error('Please enter 3 or 4-digit CVC code.');
          setIsSubmitting(false);
          return;
        }
      } else {
        if (!transactionRef.trim()) {
          toast.error(`Please enter the ${paymentMethod} Transaction ID (TID).`);
          setIsSubmitting(false);
          return;
        }
      }

      const token = localStorage.getItem('gymsync_token') || '';
      const payload = {
        paymentMethod,
        ...(isCard ? {
          cardholderName: cardholderName.trim(),
          cardNumber: cardNumber.replace(/\s+/g, ''),
          expiryDate: expiryDate.trim(),
          cvc: cvc.trim()
        } : {
          transactionRef: transactionRef.trim()
        })
      };

      const res = await fetch(`/api/gym-owner/gym/${branch._id}/pay-annual-fee`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || 'Payment processing failed');
      }

      if (data.isPendingApproval) {
        toast.info(data.message || 'Payment receipt submitted! Administration will verify your transaction before taking your gym online.');
      } else {
        toast.success(data.message || `Annual listing fee confirmed! "${branch.branchName || branch.name}" is now online.`);
      }

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

  const isCard = paymentMethod === 'Card';

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
        {isCard ? (
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
              ⚡ Instant Stripe Live Activation
            </strong>
            Card payment is verified instantly via Stripe secure gateway. Your facility will be published immediately on <strong>Explore Gyms</strong>.
          </div>
        ) : (
          <div style={{
            background: 'rgba(245, 158, 11, 0.08)',
            border: '1px solid rgba(245, 158, 11, 0.25)',
            borderRadius: '10px',
            padding: '12px 14px',
            fontSize: '0.82rem',
            color: 'var(--text-secondary)',
            lineHeight: 1.5
          }}>
            <strong style={{ color: '#f59e0b', display: 'block', marginBottom: '2px' }}>
              🛡️ Manual Verification Required
            </strong>
            After sending transfer via {paymentMethod}, submit your receipt TID below. GymSync administration will manually verify your transaction before taking your facility online.
          </div>
        )}

        {/* Payment Method Selector */}
        <div>
          <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '8px' }}>
            Choose Payment Method
          </label>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
            {[
              { id: 'Card', label: 'Credit / Debit (Stripe)', icon: '💳' },
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

        {/* STRIPE CARD FORM */}
        {isCard ? (
          <div style={{
            background: 'rgba(255, 255, 255, 0.02)',
            border: '1px solid var(--card-border)',
            borderRadius: '12px',
            padding: '16px',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2px' }}>
              <span style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                Cardholder &amp; Payment Details
              </span>
              <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                <Lock size={12} color="#10b981" /> 256-bit Stripe Secure
              </span>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                Cardholder Name *
              </label>
              <input
                type="text"
                required
                className="search-input"
                placeholder="Full Name as printed on card"
                value={cardholderName}
                onChange={e => setCardholderName(e.target.value)}
                style={{ width: '100%', padding: '9px 12px', fontSize: '0.85rem' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                Card Number *
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  type="text"
                  required
                  className="search-input"
                  placeholder="4242 •••• •••• 4242"
                  value={cardNumber}
                  onChange={handleCardNumberChange}
                  maxLength={19}
                  style={{ width: '100%', padding: '9px 12px', paddingRight: '40px', fontSize: '0.9rem', letterSpacing: '1px' }}
                />
                <CreditCard size={18} style={{ position: 'absolute', right: '12px', top: '10px', color: 'var(--text-secondary)' }} />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                  Expiration (MM/YY) *
                </label>
                <input
                  type="text"
                  required
                  className="search-input"
                  placeholder="12/28"
                  value={expiryDate}
                  onChange={handleExpiryChange}
                  maxLength={5}
                  style={{ width: '100%', padding: '9px 12px', fontSize: '0.85rem' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                  CVC / CVV *
                </label>
                <input
                  type="password"
                  required
                  className="search-input"
                  placeholder="3 digits"
                  value={cvc}
                  onChange={e => setCvc(e.target.value.replace(/\D/g, '').slice(0, 4))}
                  maxLength={4}
                  style={{ width: '100%', padding: '9px 12px', fontSize: '0.85rem' }}
                />
              </div>
            </div>

            <div style={{ fontSize: '0.74rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
              Authenticated checkout processed securely via Stripe. Your card data is encrypted and never stored on plain servers.
            </div>
          </div>
        ) : (
          /* MOBILE TRANSFER (EASYPAISA / JAZZCASH) */
          <>
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
                Transfer <strong>Rs. {Number(feeAmount).toLocaleString('en-US')}</strong> to the number above, then enter the Transaction ID (TID) from your SMS receipt below.
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, marginBottom: '6px' }}>
                {paymentMethod} Transaction ID (TID) *
              </label>
              <input
                type="text"
                className="search-input"
                required
                placeholder="e.g. TID-98234812 / 8392104921"
                value={transactionRef}
                onChange={e => setTransactionRef(e.target.value)}
                style={{ width: '100%', padding: '10px 12px' }}
              />
              <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '4px', display: 'block' }}>
                Admin will cross-check this TID before approving your facility to go live.
              </span>
            </div>
          </>
        )}

        {/* Modal Action Buttons */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '6px' }}>
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
              'Processing...'
            ) : isCard ? (
              <>
                <CheckCircle size={16} /> Pay Rs. {Number(feeAmount).toLocaleString('en-US')} via Stripe &amp; Go Online
              </>
            ) : (
              <>
                <CheckCircle size={16} /> Submit Receipt for Admin Verification
              </>
            )}
          </button>
        </div>
      </form>
    </Modal>
  );
};

export default AnnualFeeModal;
