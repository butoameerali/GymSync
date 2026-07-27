import React, { useState } from 'react';
import { CreditCard, Upload, Banknote, ShieldCheck, CheckCircle } from 'lucide-react';
import { toast } from 'react-toastify';
import Modal from './Modal';

const PaymentModal = ({ isOpen, onClose, amount, title, gymName, onPaymentSuccess }) => {
  const [paymentMethod, setPaymentMethod] = useState('Stripe'); // 'Stripe', 'Screenshot', 'Cash'
  const [cardDetails, setCardDetails] = useState({ number: '4242 •••• •••• 4242', expiry: '12/28', cvc: '123' });
  const [screenshotUrl, setScreenshotUrl] = useState('');
  const [loading, setLoading] = useState(false);

  const userName = localStorage.getItem('gymsync_user_name') || 'Guest User';
  const commission15Percent = (Number(amount) || 0) * 0.15;

  const handlePaymentSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const payload = {
        paymentId: `PAY-${Date.now()}`,
        userName,
        gymName: gymName || 'GymSync Partner',
        paymentMethod,
        amount: Number(amount) || 50,
        commission15Percent,
        screenshotUrl,
        status: paymentMethod === 'Screenshot' ? 'PendingApproval' : 'Completed'
      };

      const res = await fetch('/api/payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-user-name': userName },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        if (paymentMethod === 'Screenshot') {
          toast.info('Payment screenshot uploaded! Awaiting Admin verification.');
        } else if (paymentMethod === 'Cash') {
          toast.success('Cash payment recorded. 15% GymSync commission billed to gym.');
        } else {
          toast.success('Stripe payment processed instantly!');
        }

        if (onPaymentSuccess) onPaymentSuccess(payload);
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

        {/* 3 Payment Methods Selector */}
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
              <span>Dummy Stripe</span>
            </button>

            <button
              type="button"
              className={`btn ${paymentMethod === 'Screenshot' ? 'btn-primary' : 'btn-outline'}`}
              onClick={() => setPaymentMethod('Screenshot')}
              style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px', padding: '12px 8px', fontSize: '0.8rem' }}
            >
              <Upload size={20} />
              <span>Upload Proof</span>
            </button>

            <button
              type="button"
              className={`btn ${paymentMethod === 'Cash' ? 'btn-primary' : 'btn-outline'}`}
              onClick={() => setPaymentMethod('Cash')}
              style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px', padding: '12px 8px', fontSize: '0.8rem' }}
            >
              <Banknote size={20} />
              <span>Cash at Gym</span>
            </button>
          </div>
        </div>

        {/* Method 1: Dummy Stripe */}
        {paymentMethod === 'Stripe' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', background: 'rgba(0,0,0,0.3)', padding: '14px', borderRadius: '10px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', marginBottom: '4px', color: 'var(--text-secondary)' }}>Card Number</label>
              <input type="text" className="search-input" value={cardDetails.number} onChange={e => setCardDetails({ ...cardDetails, number: e.target.value })} />
            </div>
            <div style={{ display: 'flex', gap: '10px' }}>
              <div style={{ flex: 1 }}>
                <label style={{ display: 'block', fontSize: '0.75rem', marginBottom: '4px', color: 'var(--text-secondary)' }}>Expiry</label>
                <input type="text" className="search-input" value={cardDetails.expiry} onChange={e => setCardDetails({ ...cardDetails, expiry: e.target.value })} />
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ display: 'block', fontSize: '0.75rem', marginBottom: '4px', color: 'var(--text-secondary)' }}>CVC</label>
                <input type="text" className="search-input" value={cardDetails.cvc} onChange={e => setCardDetails({ ...cardDetails, cvc: e.target.value })} />
              </div>
            </div>
          </div>
        )}

        {/* Method 2: Screenshot Upload */}
        {paymentMethod === 'Screenshot' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', background: 'rgba(0,0,0,0.3)', padding: '14px', borderRadius: '10px' }}>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: 0 }}>
              Transfer <strong>${amount}</strong> to Bank/Easypaisa Account <code>0300-1234567</code> and paste the screenshot URL or reference below.
            </p>
            <input 
              type="text" 
              required
              className="search-input" 
              placeholder="Paste screenshot URL or Reference ID..." 
              value={screenshotUrl} 
              onChange={e => setScreenshotUrl(e.target.value)} 
            />
          </div>
        )}

        {/* Method 3: Cash at Gym */}
        {paymentMethod === 'Cash' && (
          <div style={{ background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.3)', padding: '14px', borderRadius: '10px' }}>
            <p style={{ fontSize: '0.85rem', color: '#10b981', margin: 0, lineHeight: 1.5 }}>
              💵 Pay <strong>${amount}</strong> cash directly at the gym front desk. The gym will automatically remit the 15% GymSync commission ($${commission15Percent.toFixed(2)}).
            </p>
          </div>
        )}

        <button type="submit" className="btn btn-primary" disabled={loading} style={{ padding: '12px' }}>
          {loading ? 'Processing...' : `Confirm & Pay $${amount}`}
        </button>
      </form>
    </Modal>
  );
};

export default PaymentModal;
