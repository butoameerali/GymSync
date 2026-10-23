import React, { useState, useEffect } from 'react';
import { CheckCircle, XCircle, CreditCard, DollarSign, Award, Save, RefreshCw, Shield, Lock, X } from 'lucide-react';
import { toast } from 'react-toastify';

const PaymentManagement = ({ isSeniorAdmin, onRefresh }) => {
  const [pendingPayments, setPendingPayments] = useState([]);
  const [pendingCashback, setPendingCashback] = useState([]);
  const [paymentConfigs, setPaymentConfigs] = useState([]);
  const [loading, setLoading] = useState(true);

  // Config Form State
  const [selectedMethod, setSelectedMethod] = useState('Easypaisa');
  const [configNumber, setConfigNumber] = useState('');
  const [configDetails, setConfigDetails] = useState('');
  const [configNotes, setConfigNotes] = useState('');
  const [isSavingConfig, setIsSavingConfig] = useState(false);

  // Sudo Mode Admin Password State
  const [showSudoModal, setShowSudoModal] = useState(false);
  const [adminPassword, setAdminPassword] = useState('');

  // Cashback Creation Form State
  const [cashbackContent, setCashbackContent] = useState('');
  const [cashbackAmount, setCashbackAmount] = useState(15);
  const [isCreatingCashback, setIsCreatingCashback] = useState(false);

  useEffect(() => {
    fetchPaymentData();
  }, []);

  const fetchPaymentData = async () => {
    setLoading(true);
    try {
      const headers = { 'Authorization': `Bearer ${localStorage.getItem('gymsync_token') || ''}` };

      const [paymentsRes, configsRes] = await Promise.all([
        fetch('/api/payments/pending', { headers }),
        fetch('/api/payments/config')
      ]);

      if (paymentsRes.ok) {
        setPendingPayments(await paymentsRes.json());
      }

      if (configsRes.ok) {
        const configs = await configsRes.json();
        setPaymentConfigs(configs);
        const active = configs.find(c => c.method === selectedMethod) || configs[0];
        if (active) {
          setSelectedMethod(active.method);
          setConfigNumber(active.accountNumber || '');
          setConfigDetails(active.bankDetails || '');
          setConfigNotes(active.notes || '');
        }
      }

      if (isSeniorAdmin) {
        const cashbackRes = await fetch('/api/admin/posts/pending-cashback', { headers });
        if (cashbackRes.ok) {
          setPendingCashback(await cashbackRes.json());
        }
      }
    } catch (err) {
      console.error('Failed to load payment management data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectMethod = (method) => {
    setSelectedMethod(method);
    const cfg = paymentConfigs.find(c => c.method === method);
    if (cfg) {
      setConfigNumber(cfg.accountNumber || '');
      setConfigDetails(cfg.bankDetails || '');
      setConfigNotes(cfg.notes || '');
    } else {
      setConfigNumber('');
      setConfigDetails('');
      setConfigNotes('');
    }
  };

  const handleApprovePayment = async (paymentId) => {
    try {
      const res = await fetch(`/api/payments/${paymentId}/approve`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('gymsync_token') || ''}`
        }
      });
      if (res.ok) {
        toast.success('Payment approved and membership / order updated!');
        fetchPaymentData();
        if (onRefresh) onRefresh();
      } else {
        const d = await res.json();
        toast.error(d.message || 'Payment approval failed');
      }
    } catch (err) {
      toast.error('Payment approval failed');
    }
  };

  const handlePromptSudoSave = (e) => {
    e.preventDefault();
    if (!configNumber.trim()) {
      toast.error('Please enter the account/phone number');
      return;
    }
    if (!configDetails.trim()) {
      toast.error('Please enter the account title/details');
      return;
    }
    setAdminPassword('');
    setShowSudoModal(true);
  };

  const executeSavePaymentConfig = async (e) => {
    e.preventDefault();
    if (!adminPassword.trim()) {
      toast.error('Admin password is required to save payment details');
      return;
    }

    setIsSavingConfig(true);
    try {
      const res = await fetch(`/api/payments/config/${selectedMethod}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('gymsync_token') || ''}`
        },
        body: JSON.stringify({
          accountNumber: configNumber.trim(),
          bankDetails: configDetails.trim(),
          notes: configNotes.trim(),
          adminPassword: adminPassword.trim()
        })
      });

      const data = await res.json();
      if (res.ok) {
        toast.success(`${selectedMethod} payment configuration updated successfully!`);
        setShowSudoModal(false);
        setAdminPassword('');
        fetchPaymentData();
      } else {
        toast.error(data.message || 'Failed to update payment settings');
      }
    } catch (err) {
      toast.error('Failed to update payment configuration');
    } finally {
      setIsSavingConfig(false);
    }
  };

  const handleCreateCashback = async (e) => {
    e.preventDefault();
    if (!cashbackContent.trim()) {
      toast.warn('Please provide promotional message content');
      return;
    }
    setIsCreatingCashback(true);
    try {
      const res = await fetch('/api/admin/posts/cashback', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('gymsync_token') || ''}`
        },
        body: JSON.stringify({
          content: cashbackContent.trim(),
          cashbackAmount: Number(cashbackAmount) || 15
        })
      });
      if (res.ok) {
        toast.success(isSeniorAdmin ? 'Cashback offer published to timeline!' : 'Submitted to Senior SuperAdmin for review!');
        setCashbackContent('');
        fetchPaymentData();
      } else {
        const d = await res.json();
        toast.error(d.message || 'Failed to submit cashback post');
      }
    } catch (err) {
      toast.error('Failed to submit cashback post');
    } finally {
      setIsCreatingCashback(false);
    }
  };

  const handleReviewCashback = async (postId, status) => {
    try {
      const res = await fetch(`/api/admin/posts/${postId}/review-cashback`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('gymsync_token') || ''}`
        },
        body: JSON.stringify({ status })
      });
      if (res.ok) {
        toast.success(`Cashback post ${status.toLowerCase()}!`);
        fetchPaymentData();
      }
    } catch (err) {
      toast.error('Review failed');
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* 1. Pending Payments Queue */}
      <div className="glass-panel" style={{ padding: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <div>
            <h3 style={{ margin: 0 }}>Pending Payment Verifications</h3>
            <p style={{ margin: '4px 0 0 0', color: 'var(--text-secondary)' }}>
              Review manual mobile wallet (Easypaisa / JazzCash) transactions and approve membership activations.
            </p>
          </div>
          <button className="btn btn-outline btn-sm" onClick={fetchPaymentData}>
            <RefreshCw size={14} /> Refresh
          </button>
        </div>

        {pendingPayments.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '30px', color: 'var(--text-secondary)' }}>
            <CreditCard size={40} style={{ opacity: 0.3, marginBottom: '8px' }} />
            <p>No pending payments awaiting verification.</p>
          </div>
        ) : (
          <div className="table-responsive">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Member</th>
                  <th>Method</th>
                  <th>Amount</th>
                  <th>Reference / Screenshot</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {pendingPayments.map(p => (
                  <tr key={p._id}>
                    <td><strong>{p.userName}</strong></td>
                    <td>{p.paymentMethod}</td>
                    <td><strong>${p.amount}</strong></td>
                    <td>
                      {p.screenshotUrl ? (
                        <a href={p.screenshotUrl} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--primary-accent)' }}>
                          View Screenshot Proof
                        </a>
                      ) : (
                        <code>{p.transactionRef || 'No Reference'}</code>
                      )}
                    </td>
                    <td><span className="status-pill pending">{p.status}</span></td>
                    <td>
                      <button 
                        className="btn btn-sm btn-primary"
                        onClick={() => handleApprovePayment(p._id)}
                      >
                        <CheckCircle size={14} /> Verify & Approve
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 2. Payment Configuration Settings */}
      {isSeniorAdmin && (
        <div className="glass-panel" style={{ padding: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
            <Shield size={20} color="var(--primary-accent, #6366f1)" />
            <h3 style={{ margin: 0 }}>Mobile Payment Receiving Accounts (Sudo Protected)</h3>
          </div>
          <p style={{ margin: '0 0 20px 0', color: 'var(--text-secondary)', fontSize: '0.88rem' }}>
            Configure the official recipient accounts and instructions shown to users during checkout. Changes require Admin Password verification.
          </p>

          <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
            <button 
              type="button"
              className={`btn btn-sm ${selectedMethod === 'Easypaisa' ? 'btn-primary' : 'btn-outline'}`}
              onClick={() => handleSelectMethod('Easypaisa')}
            >
              Easypaisa Account
            </button>
            <button 
              type="button"
              className={`btn btn-sm ${selectedMethod === 'JazzCash' ? 'btn-primary' : 'btn-outline'}`}
              onClick={() => handleSelectMethod('JazzCash')}
            >
              JazzCash Account
            </button>
          </div>

          <form onSubmit={handlePromptSudoSave} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px', maxWidth: '800px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '6px' }}>
                Account / Mobile Phone Number *
              </label>
              <input
                type="text"
                required
                className="search-input"
                value={configNumber}
                onChange={e => setConfigNumber(e.target.value)}
                placeholder="e.g. 03XXXXXXXXX"
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '6px' }}>
                Account Title / Holder Name *
              </label>
              <input
                type="text"
                required
                className="search-input"
                value={configDetails}
                onChange={e => setConfigDetails(e.target.value)}
                placeholder="Account Title Name"
              />
            </div>

            <div style={{ gridColumn: '1 / -1' }}>
              <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '6px' }}>
                Transfer Instructions & Notes for Users
              </label>
              <textarea
                rows="2"
                className="search-input"
                value={configNotes}
                onChange={e => setConfigNotes(e.target.value)}
                placeholder="Instructions shown to user on Payment Modal..."
              />
            </div>

            <div style={{ gridColumn: '1 / -1' }}>
              <button type="submit" className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Lock size={16} /> Save {selectedMethod} Settings (Requires Password)
              </button>
            </div>
          </form>
        </div>
      )}

      {/* SUDO MODE PASSWORD MODAL */}
      {showSudoModal && (
        <div className="modal-overlay" style={{ zIndex: 1200, display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={() => setShowSudoModal(false)}>
          <div 
            className="modal-content glass-panel" 
            style={{ 
              maxWidth: '460px', 
              width: '90%', 
              borderRadius: '16px', 
              padding: '24px', 
              background: 'var(--card-bg, #111827)',
              border: '1px solid rgba(99, 102, 241, 0.3)',
              boxShadow: '0 25px 50px rgba(0,0,0,0.6)'
            }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ background: 'rgba(99, 102, 241, 0.15)', padding: '8px', borderRadius: '10px', color: 'var(--primary-accent, #818cf8)' }}>
                  <Lock size={20} />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.1rem', color: 'var(--text-primary)' }}>Admin Sudo Verification</h3>
                  <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>Updating {selectedMethod} Receiving Details</span>
                </div>
              </div>
              <button 
                onClick={() => setShowSudoModal(false)}
                className="btn btn-icon"
                style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}
              >
                <X size={18} />
              </button>
            </div>

            <p style={{ fontSize: '0.84rem', color: 'var(--text-secondary)', lineHeight: 1.4, margin: '0 0 16px 0' }}>
              Modifying official platform receiving accounts is a privileged financial operation. Please confirm your administrative password to apply changes.
            </p>

            <form onSubmit={executeSavePaymentConfig} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '6px' }}>
                  Admin Password *
                </label>
                <input
                  type="password"
                  required
                  autoFocus
                  placeholder="Enter your current password..."
                  value={adminPassword}
                  onChange={e => setAdminPassword(e.target.value)}
                  className="search-input"
                  style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.15)', color: '#fff' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '6px' }}>
                <button
                  type="button"
                  className="btn btn-outline"
                  onClick={() => setShowSudoModal(false)}
                  disabled={isSavingConfig}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={isSavingConfig || !adminPassword.trim()}
                  style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
                >
                  {isSavingConfig ? 'Authenticating...' : 'Confirm & Apply Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 3. Cashback Promotions Workflow */}
      <div className="glass-panel" style={{ padding: '24px' }}>
        <h3 style={{ margin: '0 0 8px 0' }}>Promotional Cashback Offers</h3>
        <p style={{ margin: '0 0 20px 0', color: 'var(--text-secondary)' }}>
          Publish promotional cashback discounts and rebates to the community timeline.
        </p>

        <form onSubmit={handleCreateCashback} style={{ display: 'flex', flexDirection: 'column', gap: '14px', maxWidth: '650px', marginBottom: '30px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '6px' }}>
              Cashback Rebate Amount ($)
            </label>
            <input
              type="number"
              min="1"
              max="500"
              className="search-input"
              value={cashbackAmount}
              onChange={e => setCashbackAmount(e.target.value)}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '6px' }}>
              Promotional Announcement Content
            </label>
            <textarea
              rows="3"
              required
              className="search-input"
              placeholder="e.g. Special Weekend Gym Promotion! Get $15 cashback upon subscribing to any certified facility..."
              value={cashbackContent}
              onChange={e => setCashbackContent(e.target.value)}
            />
          </div>

          <div>
            <button type="submit" className="btn btn-primary" disabled={isCreatingCashback}>
              <Award size={16} /> {isCreatingCashback ? 'Publishing...' : 'Publish Cashback Post'}
            </button>
          </div>
        </form>

        {isSeniorAdmin && pendingCashback.length > 0 && (
          <div>
            <h4>Pending Junior Admin Cashback Posts Requiring Approval</h4>
            <div style={{ display: 'grid', gap: '12px', marginTop: '12px' }}>
              {pendingCashback.map(p => (
                <div key={p._id} className="glass-panel" style={{ padding: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <span className="category-badge" style={{ background: 'rgba(245,158,11,0.2)', color: '#f59e0b' }}>
                      Rebate: ${p.cashbackAmount}
                    </span>
                    <p style={{ margin: '8px 0 0 0' }}>{p.content}</p>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Submitted by: {p.authorName}</span>
                  </div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button className="btn btn-sm btn-primary" onClick={() => handleReviewCashback(p._id, 'approved')}>
                      Approve
                    </button>
                    <button className="btn btn-sm btn-outline" style={{ color: '#ef4444', borderColor: '#ef4444' }} onClick={() => handleReviewCashback(p._id, 'rejected')}>
                      Reject
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PaymentManagement;
