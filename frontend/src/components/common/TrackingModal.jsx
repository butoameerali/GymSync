import React, { useState, useEffect } from 'react';
import { Search, Package, MapPin, Truck, CheckCircle2, Clock, AlertCircle, Copy, Check, ExternalLink } from 'lucide-react';
import Modal from './Modal';
import { toast } from 'react-toastify';

const TrackingModal = ({ isOpen, onClose, initialCode = '' }) => {
  const [code, setCode] = useState(initialCode);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (initialCode) {
      setCode(initialCode);
      handleTrack(initialCode);
    } else {
      setResult(null);
      setError('');
    }
  }, [isOpen, initialCode]);

  const handleTrack = async (searchCode) => {
    const query = (searchCode || code).trim();
    if (!query) {
      setError('Please enter a tracking code or ID');
      return;
    }

    setLoading(true);
    setError('');
    setResult(null);

    try {
      // 1. Try Store Order lookup
      let res = await fetch(`/api/store/track/${encodeURIComponent(query)}`);
      if (res.ok) {
        const data = await res.json();
        setResult(data);
        return;
      }

      // 2. Try Gym Registration / Payment lookup
      res = await fetch(`/api/payments/track/${encodeURIComponent(query)}`);
      if (res.ok) {
        const data = await res.json();
        setResult(data);
        return;
      }

      // If neither found
      setError('No order or gym registration found with this tracking code. Please verify and try again.');
    } catch (err) {
      setError('Network error while looking up tracking status. Please check your connection.');
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = (text) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    toast.success('Tracking code copied to clipboard!');
    setTimeout(() => setCopied(false), 2000);
  };

  const getStoreOrderStepIndex = (status) => {
    switch (status) {
      case 'Pending': return 1;
      case 'Processing': return 2;
      case 'Shipped': return 3;
      case 'Delivered': return 4;
      case 'Cancelled': return -1;
      default: return 1;
    }
  };

  const getGymStepIndex = (status) => {
    switch (status) {
      case 'PendingApproval': return 1;
      case 'Completed': return 3;
      case 'Rejected': return -1;
      default: return 1;
    }
  };

  const storeSteps = [
    { title: 'Order Placed', desc: 'Received' },
    { title: 'Processing', desc: 'Packed' },
    { title: 'Dispatched', desc: 'In Transit' },
    { title: 'Delivered', desc: 'Completed' }
  ];

  const gymSteps = [
    { title: 'Application Submitted', desc: 'Received' },
    { title: 'Verification', desc: 'Reviewing' },
    { title: 'Active Membership', desc: 'Ready for Gym' }
  ];

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Track Order / Registration" maxWidth="580px">
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        {/* Search Input Box */}
        <form onSubmit={(e) => { e.preventDefault(); handleTrack(); }} style={{ display: 'flex', gap: '8px' }}>
          <div style={{ position: 'relative', flex: 1 }}>
            <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
            <input
              type="text"
              placeholder="e.g. GS-ORD-849201 or GS-GYM-194029"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              className="search-input"
              style={{ width: '100%', padding: '12px 12px 12px 38px', borderRadius: '10px', fontSize: '0.9rem' }}
            />
          </div>
          <button type="submit" className="btn btn-primary" disabled={loading} style={{ padding: '0 20px', borderRadius: '10px', whiteSpace: 'nowrap' }}>
            {loading ? 'Searching...' : 'Track'}
          </button>
        </form>

        {error && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '12px', borderRadius: '8px', background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', fontSize: '0.85rem' }}>
            <AlertCircle size={18} />
            <span>{error}</span>
          </div>
        )}

        {/* Tracking Result View */}
        {result && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '18px', background: 'var(--card-bg-light, rgba(255,255,255,0.03))', padding: '18px', borderRadius: '12px', border: '1px solid var(--card-border)' }}>
            {/* Header info */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '10px', borderBottom: '1px solid var(--card-border)', paddingBottom: '14px' }}>
              <div>
                <span style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--text-secondary)', fontWeight: 600 }}>
                  {result.type === 'StoreOrder' ? 'Store Merchandise Order' : 'Gym Membership Registration'}
                </span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '2px' }}>
                  <strong style={{ fontSize: '1.1rem', color: 'var(--text-primary)' }}>{result.trackingCode || result.orderId || result.paymentId}</strong>
                  <button onClick={() => handleCopy(result.trackingCode || result.orderId)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--primary-accent)', padding: '2px' }} title="Copy Code">
                    {copied ? <Check size={16} color="#10b981" /> : <Copy size={16} />}
                  </button>
                </div>
              </div>

              <div style={{ textAlign: 'right' }}>
                <span style={{ 
                  display: 'inline-block',
                  padding: '4px 10px', 
                  borderRadius: '20px', 
                  fontSize: '0.8rem', 
                  fontWeight: 600,
                  background: (result.orderStatus === 'Delivered' || result.status === 'Completed') ? 'rgba(16, 185, 129, 0.15)' : 'rgba(59, 130, 246, 0.15)',
                  color: (result.orderStatus === 'Delivered' || result.status === 'Completed') ? '#10b981' : '#3b82f6'
                }}>
                  {result.orderStatus || result.status || 'Processing'}
                </span>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
                  {new Date(result.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                </div>
              </div>
            </div>

            {/* Stepper Visualization */}
            {result.type === 'StoreOrder' ? (
              <div style={{ padding: '10px 0' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', position: 'relative' }}>
                  {storeSteps.map((s, idx) => {
                    const stepNum = idx + 1;
                    const activeIndex = getStoreOrderStepIndex(result.orderStatus);
                    const isDone = activeIndex >= stepNum;
                    const isCurrent = activeIndex === stepNum;

                    return (
                      <div key={idx} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1, position: 'relative', zIndex: 1 }}>
                        <div style={{
                          width: '32px',
                          height: '32px',
                          borderRadius: '50%',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          background: isDone ? 'var(--primary-accent)' : 'var(--card-bg, #333)',
                          color: isDone ? '#fff' : 'var(--text-secondary)',
                          border: isCurrent ? '2px solid #38bdf8' : '1px solid var(--card-border)',
                          fontWeight: 'bold',
                          fontSize: '0.8rem'
                        }}>
                          {isDone ? <Check size={16} /> : stepNum}
                        </div>
                        <span style={{ fontSize: '0.75rem', fontWeight: 600, marginTop: '6px', color: isDone ? 'var(--text-primary)' : 'var(--text-secondary)', textAlign: 'center' }}>
                          {s.title}
                        </span>
                        <span style={{ fontSize: '0.68rem', color: 'var(--text-secondary)', textAlign: 'center' }}>
                          {s.desc}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div style={{ padding: '10px 0' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', position: 'relative' }}>
                  {gymSteps.map((s, idx) => {
                    const stepNum = idx + 1;
                    const activeIndex = getGymStepIndex(result.status);
                    const isDone = activeIndex >= stepNum;

                    return (
                      <div key={idx} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1, position: 'relative', zIndex: 1 }}>
                        <div style={{
                          width: '32px',
                          height: '32px',
                          borderRadius: '50%',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          background: isDone ? '#10b981' : 'var(--card-bg, #333)',
                          color: isDone ? '#fff' : 'var(--text-secondary)',
                          fontWeight: 'bold',
                          fontSize: '0.8rem'
                        }}>
                          {isDone ? <Check size={16} /> : stepNum}
                        </div>
                        <span style={{ fontSize: '0.75rem', fontWeight: 600, marginTop: '6px', color: isDone ? 'var(--text-primary)' : 'var(--text-secondary)', textAlign: 'center' }}>
                          {s.title}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Courier / Shipping Details */}
            {result.type === 'StoreOrder' && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', background: 'rgba(0,0,0,0.05)', padding: '12px', borderRadius: '8px', fontSize: '0.85rem' }}>
                <div>
                  <span style={{ color: 'var(--text-secondary)', display: 'block', fontSize: '0.75rem' }}>Courier / Service</span>
                  <strong>{result.courierName || 'Pending Assignment'}</strong>
                </div>
                <div>
                  <span style={{ color: 'var(--text-secondary)', display: 'block', fontSize: '0.75rem' }}>Carrier Tracking #</span>
                  <strong>{result.trackingNumber || 'Available upon dispatch'}</strong>
                </div>
                <div>
                  <span style={{ color: 'var(--text-secondary)', display: 'block', fontSize: '0.75rem' }}>Destination</span>
                  <span style={{ color: 'var(--text-primary)' }}>{result.shippingAddress}</span>
                </div>
                <div>
                  <span style={{ color: 'var(--text-secondary)', display: 'block', fontSize: '0.75rem' }}>Estimated Arrival</span>
                  <strong>{result.estimatedDeliveryDate ? new Date(result.estimatedDeliveryDate).toLocaleDateString() : '3 - 5 Business Days'}</strong>
                </div>
              </div>
            )}

            {/* Gym Registration Details */}
            {result.type === 'GymRegistration' && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', background: 'rgba(0,0,0,0.05)', padding: '12px', borderRadius: '8px', fontSize: '0.85rem' }}>
                <div>
                  <span style={{ color: 'var(--text-secondary)', display: 'block', fontSize: '0.75rem' }}>Facility / Gym</span>
                  <strong>{result.gymName}</strong>
                </div>
                <div>
                  <span style={{ color: 'var(--text-secondary)', display: 'block', fontSize: '0.75rem' }}>Membership Tier</span>
                  <strong>{result.membershipType || 'Monthly'} Pass</strong>
                </div>
                <div>
                  <span style={{ color: 'var(--text-secondary)', display: 'block', fontSize: '0.75rem' }}>Registered Name</span>
                  <span>{result.userName}</span>
                </div>
                <div>
                  <span style={{ color: 'var(--text-secondary)', display: 'block', fontSize: '0.75rem' }}>Pass Access Status</span>
                  <strong style={{ color: result.status === 'Completed' ? '#10b981' : '#f59e0b' }}>
                    {result.status === 'Completed' ? '✅ Ready For Entry (Show Code at Desk)' : '⏳ Awaiting Gym Verification'}
                  </strong>
                </div>
              </div>
            )}

            {/* Items Summary */}
            {Array.isArray(result.items) && result.items.length > 0 && (
              <div>
                <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '8px' }}>
                  Ordered Items ({result.items.reduce((s, i) => s + (i.quantity || 1), 0)})
                </span>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {result.items.map((item, i) => (
                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.85rem', padding: '6px 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                      <span>{item.name} <span style={{ color: 'var(--text-secondary)', fontSize: '0.75rem' }}>x{item.quantity}</span></span>
                      <strong>${((item.price || 0) * (item.quantity || 1)).toFixed(2)}</strong>
                    </div>
                  ))}
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '6px', fontSize: '0.9rem', fontWeight: 'bold' }}>
                    <span>Total Paid</span>
                    <span style={{ color: 'var(--primary-accent)' }}>${result.totalAmount}</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </Modal>
  );
};

export default TrackingModal;
