import React, { useState, useEffect } from 'react';
import { CreditCard, Upload, Banknote } from 'lucide-react';
import { toast } from 'react-toastify';
import Modal from './Modal';

const PaymentModal = ({ isOpen, onClose, amount, title, gymName, paymentType = 'GymMembership', onPaymentSuccess }) => {
  const [paymentMethod, setPaymentMethod] = useState('Stripe');
  const [cardDetails, setCardDetails] = useState({ number: '4242 4242 4242 4242', expiry: '12/28', cvc: '123' });
  const [screenshotUrl, setScreenshotUrl] = useState('');
  const [configs, setConfigs] = useState([]);
  const [loading, setLoading] = useState(false);

  const userName = localStorage.getItem('gymsync_user_name') || 'Guest User';
  const commission15Percent = (Number(amount) || 0) * 0.15;

  useEffect(() => {
    if (!isOpen) return;

    const loadConfigs = async () => {
      try {
        const res = await fetch('/api/payments/config');
        if (res.ok) {
          const data = await res.json();
          setConfigs(data);
        }
      } catch (err) {
        console.error('Unable to load payment configs', err);
      }
    };

    loadConfigs();
  }, [isOpen]);

  const selectedConfig = configs.find(c => c.method === paymentMethod);

  const handlePaymentSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      if ((paymentMethod === 'Easypaisa' || paymentMethod === 'JazzCash') && !screenshotUrl.trim()) {
        toast.warn('Please provide a screenshot URL or reference for mobile payment authorization.');
        setLoading(false);
        return;
      }

      const payload = {
        paymentId: `PAY-${Date.now()}`,
        userName,
        gymName: gymName || 'GymSync Platform',
        paymentType,
        paymentMethod,
        amount: Number(amount) || 50,
        commission15Percent,
        screenshotUrl: screenshotUrl.trim(),
        transactionRef: paymentMethod === 'Stripe' ? `stripe-${Date.now()}` : '',
        methodDetails: selectedConfig?.bankDetails || ''
      };

      const res = await fetch('/api/payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-user-name': userName },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        const paymentData = await res.json();

        if (paymentMethod === 'Stripe') {
          toast.success('Stripe payment recorded successfully!');
        } else {
          toast.info('Payment proof submitted. Awaiting admin approval before unlock.');
        }

        if (paymentType !== 'PlatformSubscription' || paymentMethod === 'Stripe') {
          if (onPaymentSuccess) onPaymentSuccess(paymentData);
        }

        if (paymentType === 'PlatformSubscription' && paymentMethod !== 'Stripe') {
          toast.info('Your subscription will be completed after admin approval.');
        }

        onClose();
      } else {
        toast.error('Payment processing failed');
      }
    } catch (err) {
      toast.error('Error processing payment');
    } finally {
      setLoading(false);
    }
  };

  const renderMobilePaymentInstructions = () => {
    if (!selectedConfig) {
      return (
        <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
          Configure payment details in the admin dashboard to show the correct Easypaisa / JazzCash account information.
        </p>
      );
    }

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', background: 'rgba(0,0,0,0.05)', padding: '14px', borderRadius: '10px' }}>
        <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
          Transfer <strong>${amount}</strong> to <strong>{selectedConfig.method}</strong>:
        </p>
        <div style={{ display: 'grid', gap: '6px', fontSize: '0.92rem' }}>
          <div><strong>Number:</strong> <code>{selectedConfig.accountNumber || '03272450136'}</code></div>
          <div><strong>Bank / Wallet:</strong> {selectedConfig.bankDetails || selectedConfig.method}</div>
          <div><strong>Notes:</strong> {selectedConfig.notes || 'Upload a payment screenshot for admin approval.'}</div>
        </div>
        <input
          type="text"
          required
          className="search-input"
          placeholder="Paste screenshot URL or payment reference"
          value={screenshotUrl}
          onChange={e => setScreenshotUrl(e.target.value)}
        />
      </div>
    );
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title || `Complete Payment ($${amount})`}>
      <form onSubmit={handlePaymentSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
        <div style={{ background: 'rgba(59, 130, 246, 0.1)', border: '1px solid rgba(59, 130, 246, 0.3)', padding: '12px 16px', borderRadius: '12px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Total Fee:</span>
            <strong style={{ fontSize: '1.1rem', color: '#3b82f6' }}>${amount}</strong>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>15% GymSync Commission:</span>
            <span style={{ fontSize: '0.85rem', color: '#10b981', fontWeight: 600 }}>${commission15Percent.toFixed(2)}</span>
          </div>
        </div>

        <div>
          <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '8px', fontWeight: 600 }}>Select Payment Method</label>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
            <button
              type="button"
              className={`btn ${paymentMethod === 'Stripe' ? 'btn-primary' : 'btn-outline'}`}
              onClick={() => setPaymentMethod('Stripe')}
              style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px', padding: '12px 8px', fontSize: '0.8rem' }}
            >
              <CreditCard size={20} />
              <span>Stripe</span>
            </button>
            <button
              type="button"
              className={`btn ${paymentMethod === 'Easypaisa' ? 'btn-primary' : 'btn-outline'}`}
              onClick={() => setPaymentMethod('Easypaisa')}
              style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px', padding: '12px 8px', fontSize: '0.8rem' }}
            >
              <Upload size={20} />
              <span>Easypaisa</span>
            </button>
            <button
              type="button"
              className={`btn ${paymentMethod === 'JazzCash' ? 'btn-primary' : 'btn-outline'}`}
              onClick={() => setPaymentMethod('JazzCash')}
              style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px', padding: '12px 8px', fontSize: '0.8rem' }}
            >
              <Banknote size={20} />
              <span>JazzCash</span>
            </button>
          </div>
        </div>

        {paymentMethod === 'Stripe' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', background: 'rgba(0,0,0,0.03)', padding: '14px', borderRadius: '10px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', marginBottom: '4px', color: 'var(--text-secondary)' }}>Card Number</label>
              <input
                type="text"
                className="search-input"
                value={cardDetails.number}
                onChange={e => setCardDetails({ ...cardDetails, number: e.target.value })}
                placeholder="4242 4242 4242 4242"
              />
            </div>
            <div style={{ display: 'flex', gap: '10px' }}>
              <div style={{ flex: 1 }}>
                <label style={{ display: 'block', fontSize: '0.75rem', marginBottom: '4px', color: 'var(--text-secondary)' }}>Expiry</label>
                <input
                  type="text"
                  className="search-input"
                  value={cardDetails.expiry}
                  onChange={e => setCardDetails({ ...cardDetails, expiry: e.target.value })}
                  placeholder="MM/YY"
                />
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ display: 'block', fontSize: '0.75rem', marginBottom: '4px', color: 'var(--text-secondary)' }}>CVC</label>
                <input
                  type="text"
                  className="search-input"
                  value={cardDetails.cvc}
                  onChange={e => setCardDetails({ ...cardDetails, cvc: e.target.value })}
                  placeholder="123"
                />
              </div>
            </div>
            <p style={{ margin: 0, fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
              Enter valid card details for Stripe. Use the test card <code>4242 4242 4242 4242</code> in development.
            </p>
          </div>
        )}

        {(paymentMethod === 'Easypaisa' || paymentMethod === 'JazzCash') && renderMobilePaymentInstructions()}

        <button type="submit" className="btn btn-primary" disabled={loading} style={{ padding: '12px' }}>
          {loading ? 'Processing...' : `Confirm & Pay $${amount}`}
        </button>
      </form>
    </Modal>
  );
};

export default PaymentModal;
