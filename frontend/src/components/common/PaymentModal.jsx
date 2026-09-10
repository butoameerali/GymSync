import React, { useState, useEffect } from 'react';
import { CreditCard, Upload, Banknote } from 'lucide-react';
import { toast } from 'react-toastify';
import Modal from './Modal';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { useAuth } from '../../context/AuthContext';

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
  guestEmail = '',
  guestPhone = '',
  guestName = '',
  onPaymentSuccess,
  onPaymentRecorded
}) => {
  const [paymentMethod, setPaymentMethod] = useState(stripeAvailable ? 'Stripe' : 'Easypaisa');
  const [screenshotUrl, setScreenshotUrl] = useState('');
  const [configs, setConfigs] = useState([]);
  const [loading, setLoading] = useState(false);

  const { user, token: authContextToken, userName } = useAuth();
  const token = authContextToken || user?.token || localStorage.getItem('gymsync_token') || '';
  const effectiveUserName = guestName || (userName && userName !== 'Guest User' ? userName : (guestName || 'Guest User'));
  const effectiveUserEmail = guestEmail || user?.email || '';
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

  const handlePaymentSubmit = async (e, transactionRef = '', billingDetails = null) => {
    if (e && e.preventDefault) e.preventDefault();
    setLoading(true);

    try {
      if ((paymentMethod === 'Easypaisa' || paymentMethod === 'JazzCash') && !screenshotUrl.trim()) {
        toast.warn('Please provide a screenshot URL or reference for mobile payment authorization.');
        setLoading(false);
        return;
      }

      const finalUserName = billingDetails?.cardholderName || effectiveUserName;
      const finalEmail = billingDetails?.email || effectiveUserEmail;
      const rawProof = screenshotUrl.trim();
      const isUrl = rawProof.startsWith('http://') || rawProof.startsWith('https://') || rawProof.startsWith('data:');
      const resolvedRef = (transactionRef || (!isUrl ? rawProof : '')).trim();

      const payload = {
        paymentId: `PAY-${Date.now()}`,
        userName: finalUserName,
        customerEmail: finalEmail,
        customerPhone: guestPhone,
        cardholderName: billingDetails?.cardholderName || '',
        gymName: gymName || 'GymSync Platform',
        paymentType,
        paymentMethod,
        amount: Number(amount) || 50,
        commission15Percent,
        screenshotUrl: rawProof,
        transactionRef: resolvedRef,
        methodDetails: selectedConfig?.bankDetails || '',
        startNextMonth: startNextMonth,
        membershipType,
        joiningDate
      };

      const res = await fetch('/api/payments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify(payload)
      });

      const paymentData = await res.json().catch(() => ({}));

      if (res.ok) {
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
        toast.error(paymentData.message || 'Payment processing failed');
      }
    } catch {
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
          <div><strong>Number:</strong> <code>{selectedConfig.accountNumber || 'Pending Configuration'}</code></div>
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
                  defaultEmail={effectiveUserEmail}
                  defaultName={effectiveUserName !== 'Guest User' ? effectiveUserName : ''}
                  onSuccess={(refId, billingDetails) => {
                     handlePaymentSubmit(new Event('submit'), refId, billingDetails);
                  }}
                  setLoading={setLoading}
                  loading={loading}
               />
             </Elements>
          </div>
        )}

        {(paymentMethod === 'Easypaisa' || paymentMethod === 'JazzCash') && renderMobilePaymentInstructions()}

        {paymentMethod !== 'Stripe' && (
          <button 
            type="button" 
            onClick={(e) => handlePaymentSubmit(e, screenshotUrl.trim())} 
            className="btn btn-primary" 
            disabled={loading} 
            style={{ padding: '12px' }}
          >
            {loading ? 'Processing...' : `Confirm & Pay $${amount}`}
          </button>
        )}
      </form>
    </Modal>
  );
};

const StripePaymentForm = ({ amount, defaultEmail, defaultName, onSuccess, setLoading, loading }) => {
  const auth = useAuth();
  const token = auth?.token || auth?.user?.token || localStorage.getItem('gymsync_token') || '';
  const stripe = useStripe();
  const elements = useElements();
  const [email, setEmail] = useState(defaultEmail || '');
  const [cardholderName, setCardholderName] = useState(defaultName || '');
  const [cardError, setCardError] = useState('');

  useEffect(() => {
    if (defaultEmail) setEmail(prev => prev || defaultEmail);
    if (defaultName) setCardholderName(prev => prev || defaultName);
  }, [defaultEmail, defaultName]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!stripe || !elements) return;

    if (!email.trim() || !email.includes('@')) {
      toast.error('Please enter a valid billing email address.');
      return;
    }
    if (!cardholderName.trim()) {
      toast.error('Please enter the name on the card.');
      return;
    }

    setLoading(true);
    setCardError('');
    try {
      // 1. Create payment intent on the backend
      const res = await fetch('/api/payments/create-intent', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ 
          amount: Number(amount) || 50,
          email: email.trim(),
          cardholderName: cardholderName.trim()
        })
      });
      
      const data = await res.json();

      if (!res.ok || !data.clientSecret) {
        toast.error(data.message || 'Failed to initialize Stripe payment. Please check API keys.');
        return;
      }

      // 2. Confirm the payment with Stripe
      const cardElement = elements.getElement(CardElement);
      const result = await stripe.confirmCardPayment(data.clientSecret, {
        payment_method: {
          card: cardElement,
          billing_details: {
            name: cardholderName.trim(),
            email: email.trim()
          },
        }
      });

      if (result.error) {
        setCardError(result.error.message);
        toast.error(`Stripe payment failed: ${result.error.message}`);
      } else {
        if (result.paymentIntent?.status === 'succeeded') {
          onSuccess(result.paymentIntent.id, { email: email.trim(), cardholderName: cardholderName.trim() });
        }
      }
    } catch {
      toast.error('Error confirming Stripe payment.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
        <label style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Billing Email</label>
        <input
          type="email"
          required
          placeholder="e.g. yourname@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="search-input"
          style={{ width: '100%', padding: '10px 12px', fontSize: '0.9rem', borderRadius: '8px' }}
        />
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
        <label style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Name on Card</label>
        <input
          type="text"
          required
          placeholder="e.g. John Doe"
          value={cardholderName}
          onChange={(e) => setCardholderName(e.target.value)}
          className="search-input"
          style={{ width: '100%', padding: '10px 12px', fontSize: '0.9rem', borderRadius: '8px' }}
        />
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
        <label style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Card Details</label>
        <div style={{ 
          padding: '12px 14px', 
          background: '#ffffff', 
          borderRadius: '8px', 
          border: cardError ? '1px solid #ef4444' : '1px solid rgba(0,0,0,0.15)',
          boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.05)'
        }}>
          <CardElement 
            options={{ 
              style: { 
                base: { 
                  fontSize: '15px',
                  color: '#1f2937',
                  fontFamily: 'Inter, system-ui, sans-serif',
                  '::placeholder': { color: '#9ca3af' }
                },
                invalid: { color: '#ef4444' }
              } 
            }} 
            onChange={(e) => {
              if (e.error) setCardError(e.error.message);
              else setCardError('');
            }}
          />
        </div>
        {cardError && <span style={{ color: '#ef4444', fontSize: '0.8rem', marginTop: '2px' }}>{cardError}</span>}
      </div>

      <button 
        type="button" 
        onClick={handleSubmit} 
        className="btn btn-primary" 
        disabled={!stripe || loading} 
        style={{ padding: '12px', marginTop: '6px', fontWeight: 600 }}
      >
        {loading ? 'Processing Payment...' : `Pay $${amount} via Card`}
      </button>
    </div>
  );
};

export default PaymentModal;
