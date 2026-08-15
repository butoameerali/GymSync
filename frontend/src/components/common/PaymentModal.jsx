import React, { useState, useEffect } from 'react';
import { CreditCard, Upload, Banknote } from 'lucide-react';
import { toast } from 'react-toastify';
import Modal from './Modal';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js';

const stripePublishableKey = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY;
const stripePromise = stripePublishableKey ? loadStripe(stripePublishableKey) : null;
const stripeAvailable = Boolean(stripePublishableKey);

const PaymentModal = ({
  isOpen,
  onClose,
  amount,
  title,
  gymName,
  paymentType = 'GymMembership',
  startNextMonth = false,
  membershipType = 'Monthly',
  joiningDate = null,
  onPaymentSuccess,
  onPaymentRecorded
}) => {
  const [paymentMethod, setPaymentMethod] = useState(stripeAvailable ? 'Stripe' : 'Easypaisa');
  const [screenshotUrl, setScreenshotUrl] = useState('');
  const [configs, setConfigs] = useState([]);
  const [loading, setLoading] = useState(false);

  const userName = localStorage.getItem('gymsync_user_name') || 'Guest User';
  const commission15Percent = (Number(amount) || 0) * 0.15;

  useEffect(() => {
    if (!isOpen) return;
    setPaymentMethod(stripeAvailable ? 'Stripe' : 'Easypaisa');

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

  const handlePaymentSubmit = async (e, transactionRef = '') => {
    if (e && e.preventDefault) e.preventDefault();
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
        transactionRef: transactionRef,
        methodDetails: selectedConfig?.bankDetails || '',
        startNextMonth: startNextMonth,
        membershipType,
        joiningDate
      };

      const res = await fetch('/api/payments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(localStorage.getItem('gymsync_token') ? { Authorization: `Bearer ${localStorage.getItem('gymsync_token')}` } : {})
        },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        const paymentData = await res.json();

        if (onPaymentRecorded) {
          onPaymentRecorded(paymentData);
        }

        // The parent owns the single confirmation surface when a callback is provided.
        // This prevents a toast and a confirmation modal from appearing together.
        if (!onPaymentRecorded) {
          if (paymentData.status === 'Completed') {
            toast.success('Stripe payment recorded successfully!');
          } else {
            toast.info('Payment proof submitted. Awaiting admin approval before unlock.');
          }
        }

        // Manual payments remain locked until an administrator approves them.
        if (paymentData.status === 'Completed') {
          if (onPaymentSuccess) onPaymentSuccess(paymentData);
        }

        if (!onPaymentRecorded && paymentType === 'PlatformSubscription' && paymentMethod !== 'Stripe') {
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
      <form onSubmit={(e) => { e.preventDefault(); }} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
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
          <div style={{ display: 'grid', gridTemplateColumns: stripeAvailable ? 'repeat(3, 1fr)' : 'repeat(2, 1fr)', gap: '10px' }}>
            {stripeAvailable && (
              <button
                type="button"
                className={`btn ${paymentMethod === 'Stripe' ? 'btn-primary' : 'btn-outline'}`}
                onClick={() => setPaymentMethod('Stripe')}
                style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px', padding: '12px 8px', fontSize: '0.8rem' }}
              >
                <CreditCard size={20} />
                <span>Stripe</span>
              </button>
            )}
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
             <Elements stripe={stripePromise}>
               <StripePaymentForm 
                  amount={amount} 
                  onSuccess={(refId) => {
                     handlePaymentSubmit(new Event('submit'), refId);
                  }}
                  setLoading={setLoading}
                  loading={loading}
               />
             </Elements>
          </div>
        )}

        {(paymentMethod === 'Easypaisa' || paymentMethod === 'JazzCash') && renderMobilePaymentInstructions()}

        {paymentMethod !== 'Stripe' && (
          <button type="button" onClick={(e) => handlePaymentSubmit(e, '')} className="btn btn-primary" disabled={loading} style={{ padding: '12px' }}>
            {loading ? 'Processing...' : `Confirm & Pay $${amount}`}
          </button>
        )}
      </form>
    </Modal>
  );
};

const StripePaymentForm = ({ amount, onSuccess, setLoading, loading }) => {
  const stripe = useStripe();
  const elements = useElements();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!stripe || !elements) return;

    setLoading(true);
    try {
      // 1. Create payment intent on the backend
      const res = await fetch('/api/payments/create-intent', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(localStorage.getItem('gymsync_token') ? { Authorization: `Bearer ${localStorage.getItem('gymsync_token')}` } : {})
        },
        body: JSON.stringify({ amount: Number(amount) || 50 })
      });
      
      const data = await res.json();

      if (!res.ok || !data.clientSecret) {
        toast.error('Failed to initialize Stripe payment. Please check API keys.');
        return;
      }

      // 2. Confirm the payment with Stripe
      const result = await stripe.confirmCardPayment(data.clientSecret, {
        payment_method: {
          card: elements.getElement(CardElement),
          billing_details: {
            name: localStorage.getItem('gymsync_user_name') || 'Guest User',
          },
        }
      });

      if (result.error) {
        toast.error(`Stripe payment failed: ${result.error.message}`);
      } else {
        if (result.paymentIntent?.status === 'succeeded') {
          onSuccess(result.paymentIntent.id);
        }
      }
    } catch (err) {
      toast.error('Error confirming Stripe payment.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div style={{ padding: '10px', background: '#fff', borderRadius: '4px', border: '1px solid #ccc' }}>
        <CardElement options={{ style: { base: { fontSize: '16px' } } }} />
      </div>
      <button type="button" onClick={handleSubmit} className="btn btn-primary" disabled={!stripe || loading} style={{ padding: '12px', marginTop: '15px' }}>
        {loading ? 'Processing...' : `Pay $${amount} via Stripe`}
      </button>
    </>
  );
};

export default PaymentModal;
