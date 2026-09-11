import React, { useState, useEffect } from 'react';
import { DollarSign, Plus, Trash, EyeOff } from 'lucide-react';
import { toast } from 'react-toastify';

export default function OffersManager() {
  const [coupons, setCoupons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  
  const [form, setForm] = useState({
    code: '',
    discountType: 'Percentage',
    discountValue: 10,
    audience: 'AllUsers',
    usageLimit: 0,
    validUntil: new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0]
  });

  const fetchCoupons = async () => {
    try {
      const token = localStorage.getItem('gymsync_token');
      const res = await fetch('/api/gym-owner/coupons', { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      if (res.ok) setCoupons(data);
    } catch (err) {
      toast.error('Failed to load coupons');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCoupons();
  }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('gymsync_token');
      const res = await fetch('/api/gym-owner/coupons', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(form)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      toast.success('Coupon created successfully');
      setShowForm(false);
      fetchCoupons();
    } catch (err) {
      toast.error(err.message);
    }
  };

  const handleDeactivate = async (id) => {
    try {
      const token = localStorage.getItem('gymsync_token');
      const res = await fetch(`/api/gym-owner/coupons/${id}/deactivate`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Failed to deactivate');
      toast.success('Coupon deactivated');
      fetchCoupons();
    } catch (err) {
      toast.error(err.message);
    }
  };

  return (
    <div className="glass-panel" style={{ padding: '24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h2><DollarSign size={24} style={{ marginRight: '8px', verticalAlign: 'middle', color: '#10b981' }} /> My Offers</h2>
        <button className="btn btn-primary btn-sm" onClick={() => setShowForm(!showForm)}>
          <Plus size={16} /> Create Coupon
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleCreate} style={{ padding: '20px', background: 'rgba(255,255,255,0.05)', borderRadius: '12px', marginBottom: '20px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px' }}>
            <div className="form-group">
              <label>Coupon Code</label>
              <input type="text" className="form-control" required value={form.code} onChange={e => setForm({...form, code: e.target.value.toUpperCase()})} placeholder="e.g. SUMMER20" />
            </div>
            <div className="form-group">
              <label>Discount Type</label>
              <select className="form-control" value={form.discountType} onChange={e => setForm({...form, discountType: e.target.value})}>
                <option value="Percentage">Percentage (%)</option>
                <option value="Fixed">Fixed Amount ($)</option>
              </select>
            </div>
            <div className="form-group">
              <label>Discount Value</label>
              <input type="number" className="form-control" required min="1" value={form.discountValue} onChange={e => setForm({...form, discountValue: e.target.value})} />
            </div>
            <div className="form-group">
              <label>Audience</label>
              <select className="form-control" value={form.audience} onChange={e => setForm({...form, audience: e.target.value})}>
                <option value="AllUsers">All Users</option>
                <option value="NewMembersOnly">New Members Only</option>
              </select>
            </div>
            <div className="form-group">
              <label>Usage Limit (0 = Unlimited)</label>
              <input type="number" className="form-control" required min="0" value={form.usageLimit} onChange={e => setForm({...form, usageLimit: e.target.value})} />
            </div>
            <div className="form-group">
              <label>Valid Until</label>
              <input type="date" className="form-control" required value={form.validUntil} onChange={e => setForm({...form, validUntil: e.target.value})} />
            </div>
          </div>
          <div style={{ marginTop: '15px', textAlign: 'right' }}>
            <button type="submit" className="btn btn-primary">Save Coupon</button>
          </div>
        </form>
      )}

      {loading ? (
        <p>Loading offers...</p>
      ) : coupons.length === 0 ? (
        <p style={{ color: 'var(--text-secondary)' }}>No coupons created yet.</p>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                <th style={{ padding: '12px' }}>Code</th>
                <th style={{ padding: '12px' }}>Discount</th>
                <th style={{ padding: '12px' }}>Audience</th>
                <th style={{ padding: '12px' }}>Usage</th>
                <th style={{ padding: '12px' }}>Status</th>
                <th style={{ padding: '12px' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {coupons.map(c => (
                <tr key={c._id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', opacity: c.isActive ? 1 : 0.6 }}>
                  <td style={{ padding: '12px' }}><strong>{c.code}</strong></td>
                  <td style={{ padding: '12px' }}>{c.discountType === 'Percentage' ? `${c.discountValue}%` : `$${c.discountValue}`}</td>
                  <td style={{ padding: '12px' }}>{c.audience}</td>
                  <td style={{ padding: '12px' }}>{c.timesUsed} / {c.usageLimit === 0 ? '∞' : c.usageLimit}</td>
                  <td style={{ padding: '12px' }}>
                    {c.approvalStatus === 'Pending' ? <span style={{ color: '#f59e0b' }}>Pending</span> :
                     c.approvalStatus === 'Rejected' ? <span style={{ color: '#ef4444' }}>Rejected</span> :
                     c.isActive ? <span style={{ color: '#10b981' }}>Active</span> : <span style={{ color: '#94a3b8' }}>Inactive</span>}
                  </td>
                  <td style={{ padding: '12px' }}>
                    {c.isActive && (
                      <button className="btn btn-sm" onClick={() => handleDeactivate(c._id)} style={{ color: '#ef4444' }} title="Deactivate">
                        <EyeOff size={16} />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
