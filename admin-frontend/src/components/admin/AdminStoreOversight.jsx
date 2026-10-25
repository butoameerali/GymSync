import React, { useState, useEffect, useCallback } from 'react';
import { 
  ShoppingBag, 
  CheckCircle, 
  XCircle, 
  Clock, 
  DollarSign, 
  Package, 
  TrendingUp, 
  User, 
  AlertTriangle, 
  RefreshCw, 
  Trash2, 
  Eye, 
  Check, 
  X 
} from 'lucide-react';
import { toast } from 'react-toastify';

const AdminStoreOversight = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeSubTab, setActiveSubTab] = useState('pending'); // 'pending' | 'all_products' | 'managers' | 'orders'
  const [statusFilter, setStatusFilter] = useState('All');
  const [rejectModal, setRejectModal] = useState({ isOpen: false, productId: null, productName: '', reason: '' });
  const [actionLoading, setActionLoading] = useState(false);

  const token = (localStorage.getItem('gymsync_admin_token') || localStorage.getItem('gymsync_token')) || '';

  const fetchOversight = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/store/admin/overview', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const result = await res.json();
        setData(result);
      } else {
        toast.error('Failed to load store oversight records');
      }
    } catch (err) {
      console.error('Error fetching store oversight:', err);
      toast.error('Network error loading store oversight');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchOversight();
  }, [fetchOversight]);

  const handleApprove = async (productId, productName) => {
    try {
      setActionLoading(true);
      const res = await fetch(`/api/store/products/${productId}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ status: 'Approved' })
      });
      if (res.ok) {
        toast.success(`Product '${productName}' approved! It is now live in the store.`);
        fetchOversight();
      } else {
        toast.error('Failed to approve product');
      }
    } catch (err) {
      toast.error('Error approving product');
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async (e) => {
    e.preventDefault();
    if (!rejectModal.reason.trim()) {
      toast.warn('Please provide a rejection reason');
      return;
    }
    try {
      setActionLoading(true);
      const res = await fetch(`/api/store/products/${rejectModal.productId}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ 
          status: 'Rejected', 
          reason: rejectModal.reason.trim() 
        })
      });
      if (res.ok) {
        toast.info(`Product '${rejectModal.productName}' rejected.`);
        setRejectModal({ isOpen: false, productId: null, productName: '', reason: '' });
        fetchOversight();
      } else {
        toast.error('Failed to reject product');
      }
    } catch (err) {
      toast.error('Error rejecting product');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = async (productId, productName) => {
    if (!window.confirm(`Are you sure you want to permanently delete '${productName}'?`)) return;
    try {
      setActionLoading(true);
      const res = await fetch(`/api/store/products/${productId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        toast.success(`Product '${productName}' deleted.`);
        fetchOversight();
      } else {
        toast.error('Failed to delete product');
      }
    } catch (err) {
      toast.error('Error deleting product');
    } finally {
      setActionLoading(false);
    }
  };

  if (loading && !data) {
    return (
      <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-secondary)' }}>
        <RefreshCw size={28} className="spin" style={{ margin: '0 auto 12px' }} />
        <p>Loading Store & Product Oversight telemetry...</p>
      </div>
    );
  }

  const metrics = data?.metrics || {};
  const pendingProducts = data?.pendingProducts || [];
  const allProducts = data?.allProducts || [];
  const managerStats = data?.storeManagerStats || [];
  const recentOrders = data?.recentOrders || [];

  const filteredProducts = allProducts.filter(p => {
    if (statusFilter === 'All') return true;
    return (p.status || '').toLowerCase() === statusFilter.toLowerCase();
  });

  return (
    <div className="admin-store-oversight">
      {/* Top Banner */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h3 style={{ margin: 0, fontSize: '1.35rem', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <ShoppingBag size={24} color="#f59e0b" /> Store & Inventory Oversight
          </h3>
          <p style={{ margin: '4px 0 0', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
            Audit product submissions, manage manager approval workflows, and verify sales records
          </p>
        </div>
        <button 
          onClick={fetchOversight}
          className="btn btn-outline" 
          style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem' }}
        >
          <RefreshCw size={14} className={loading ? 'spin' : ''} /> Refresh Telemetry
        </button>
      </div>

      {/* Metrics Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '24px' }}>
        <div className="glass-panel" style={{ padding: '18px', borderRadius: '12px', borderLeft: '4px solid #f59e0b' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', fontWeight: 600 }}>PENDING APPROVAL</span>
            <Clock size={20} color="#f59e0b" />
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, color: metrics.pendingCount > 0 ? '#f59e0b' : 'var(--text-primary)', marginTop: '8px' }}>
            {metrics.pendingCount || 0}
          </div>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Requires Admin review</span>
        </div>

        <div className="glass-panel" style={{ padding: '18px', borderRadius: '12px', borderLeft: '4px solid #10b981' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', fontWeight: 600 }}>TOTAL SALES REVENUE</span>
            <DollarSign size={20} color="#10b981" />
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#10b981', marginTop: '8px' }}>
            ${(metrics.totalSales || 0).toLocaleString()}
          </div>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{metrics.totalOrders || 0} customer orders</span>
        </div>

        <div className="glass-panel" style={{ padding: '18px', borderRadius: '12px', borderLeft: '4px solid #6366f1' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', fontWeight: 600 }}>UNITS SOLD</span>
            <TrendingUp size={20} color="#6366f1" />
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#818cf8', marginTop: '8px' }}>
            {metrics.totalUnitsSold || 0}
          </div>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Products purchased</span>
        </div>

        <div className="glass-panel" style={{ padding: '18px', borderRadius: '12px', borderLeft: '4px solid #38bdf8' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', fontWeight: 600 }}>CATALOG PRODUCTS</span>
            <Package size={20} color="#38bdf8" />
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--text-primary)', marginTop: '8px' }}>
            {metrics.totalProducts || 0}
          </div>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{metrics.approvedCount || 0} live in store</span>
        </div>
      </div>

      {/* Navigation Sub-tabs */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', borderBottom: '1px solid var(--card-border)', paddingBottom: '10px', flexWrap: 'wrap' }}>
        <button
          onClick={() => setActiveSubTab('pending')}
          style={{
            padding: '8px 16px',
            borderRadius: '8px',
            border: 'none',
            cursor: 'pointer',
            fontWeight: 600,
            fontSize: '0.85rem',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            background: activeSubTab === 'pending' ? 'var(--primary-accent)' : 'rgba(255,255,255,0.05)',
            color: activeSubTab === 'pending' ? '#fff' : 'var(--text-secondary)'
          }}
        >
          <Clock size={15} /> Approval Queue ({pendingProducts.length})
        </button>

        <button
          onClick={() => setActiveSubTab('all_products')}
          style={{
            padding: '8px 16px',
            borderRadius: '8px',
            border: 'none',
            cursor: 'pointer',
            fontWeight: 600,
            fontSize: '0.85rem',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            background: activeSubTab === 'all_products' ? 'var(--primary-accent)' : 'rgba(255,255,255,0.05)',
            color: activeSubTab === 'all_products' ? '#fff' : 'var(--text-secondary)'
          }}
        >
          <Package size={15} /> Full Catalog ({allProducts.length})
        </button>

        <button
          onClick={() => setActiveSubTab('managers')}
          style={{
            padding: '8px 16px',
            borderRadius: '8px',
            border: 'none',
            cursor: 'pointer',
            fontWeight: 600,
            fontSize: '0.85rem',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            background: activeSubTab === 'managers' ? 'var(--primary-accent)' : 'rgba(255,255,255,0.05)',
            color: activeSubTab === 'managers' ? '#fff' : 'var(--text-secondary)'
          }}
        >
          <User size={15} /> Store Manager Sales Performance ({managerStats.length})
        </button>

        <button
          onClick={() => setActiveSubTab('orders')}
          style={{
            padding: '8px 16px',
            borderRadius: '8px',
            border: 'none',
            cursor: 'pointer',
            fontWeight: 600,
            fontSize: '0.85rem',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            background: activeSubTab === 'orders' ? 'var(--primary-accent)' : 'rgba(255,255,255,0.05)',
            color: activeSubTab === 'orders' ? '#fff' : 'var(--text-secondary)'
          }}
        >
          <DollarSign size={15} /> Recent Orders ({recentOrders.length})
        </button>
      </div>

      {/* Sub-tab 1: Pending Approval Queue */}
      {activeSubTab === 'pending' && (
        <div>
          {pendingProducts.length === 0 ? (
            <div className="glass-panel" style={{ textAlign: 'center', padding: '40px', borderRadius: '12px' }}>
              <CheckCircle size={36} color="#10b981" style={{ marginBottom: '10px' }} />
              <h4 style={{ margin: '0 0 6px', color: 'var(--text-primary)' }}>No Products Pending Review</h4>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: 0 }}>
                All store manager product listings have been audited and approved.
              </p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {pendingProducts.map(p => (
                <div 
                  key={p._id} 
                  className="glass-panel"
                  style={{
                    padding: '16px',
                    borderRadius: '12px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    gap: '16px',
                    flexWrap: 'wrap',
                    borderLeft: '4px solid #f59e0b'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <img 
                      src={p.image} 
                      alt={p.name} 
                      style={{ width: '60px', height: '60px', borderRadius: '8px', objectFit: 'cover', background: '#1e293b' }}
                      onError={e => { e.target.style.display = 'none'; }}
                    />
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                        <span style={{ fontSize: '0.75rem', background: 'rgba(245, 158, 11, 0.2)', color: '#f59e0b', padding: '2px 8px', borderRadius: '4px', fontWeight: 600 }}>
                          PENDING APPROVAL
                        </span>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                          Category: {p.category}
                        </span>
                      </div>
                      <h4 style={{ margin: '0 0 4px', color: 'var(--text-primary)', fontSize: '0.95rem' }}>{p.name}</h4>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'flex', gap: '12px' }}>
                        <span>Price: <strong>${p.price}</strong></span>
                        <span>Stock: <strong>{p.stock}</strong></span>
                        <span>Submitted by: <strong>{p.createdBy || 'Store Manager'}</strong></span>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      onClick={() => handleApprove(p._id, p.name)}
                      disabled={actionLoading}
                      className="btn btn-primary"
                      style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', padding: '8px 14px', background: '#10b981', borderColor: '#10b981' }}
                    >
                      <Check size={14} /> Approve & Publish
                    </button>
                    <button
                      onClick={() => setRejectModal({ isOpen: true, productId: p._id, productName: p.name, reason: '' })}
                      disabled={actionLoading}
                      className="btn btn-outline"
                      style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', padding: '8px 14px', color: '#ef4444', borderColor: 'rgba(239, 68, 68, 0.4)' }}
                    >
                      <X size={14} /> Reject
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Sub-tab 2: Full Catalog Table */}
      {activeSubTab === 'all_products' && (
        <div className="glass-panel" style={{ borderRadius: '12px', overflow: 'hidden' }}>
          {/* Status filter buttons */}
          <div style={{ padding: '14px', display: 'flex', gap: '8px', borderBottom: '1px solid var(--card-border)' }}>
            {['All', 'Approved', 'Pending', 'Rejected'].map(s => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                style={{
                  padding: '4px 10px',
                  borderRadius: '20px',
                  fontSize: '0.78rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  border: '1px solid rgba(255,255,255,0.1)',
                  background: statusFilter === s ? 'var(--primary-accent)' : 'transparent',
                  color: statusFilter === s ? '#fff' : 'var(--text-secondary)'
                }}
              >
                {s}
              </button>
            ))}
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
              <thead>
                <tr style={{ background: 'rgba(255,255,255,0.03)', borderBottom: '1px solid var(--card-border)', color: 'var(--text-secondary)' }}>
                  <th style={{ padding: '12px 16px' }}>Product</th>
                  <th style={{ padding: '12px 16px' }}>Category</th>
                  <th style={{ padding: '12px 16px' }}>Price</th>
                  <th style={{ padding: '12px 16px' }}>Stock</th>
                  <th style={{ padding: '12px 16px' }}>Units Sold</th>
                  <th style={{ padding: '12px 16px' }}>Revenue</th>
                  <th style={{ padding: '12px 16px' }}>Submitted By</th>
                  <th style={{ padding: '12px 16px' }}>Status</th>
                  <th style={{ padding: '12px 16px' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredProducts.map(p => (
                  <tr key={p._id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                    <td style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <img src={p.image} alt={p.name} style={{ width: '36px', height: '36px', borderRadius: '6px', objectFit: 'cover' }} />
                      <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{p.name}</span>
                    </td>
                    <td style={{ padding: '12px 16px', color: 'var(--text-secondary)' }}>{p.category}</td>
                    <td style={{ padding: '12px 16px', color: '#10b981', fontWeight: 600 }}>${p.price}</td>
                    <td style={{ padding: '12px 16px', color: 'var(--text-primary)' }}>{p.stock}</td>
                    <td style={{ padding: '12px 16px', color: '#818cf8', fontWeight: 600 }}>{p.unitsSold || 0}</td>
                    <td style={{ padding: '12px 16px', color: '#10b981' }}>${((p.revenueGenerated) || 0).toLocaleString()}</td>
                    <td style={{ padding: '12px 16px', color: 'var(--text-secondary)' }}>{p.createdBy || 'Store Manager'}</td>
                    <td style={{ padding: '12px 16px' }}>
                      <span style={{
                        padding: '2px 8px',
                        borderRadius: '4px',
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        background: p.status === 'Approved' ? 'rgba(16, 185, 129, 0.15)' : p.status === 'Pending' ? 'rgba(245, 158, 11, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                        color: p.status === 'Approved' ? '#10b981' : p.status === 'Pending' ? '#f59e0b' : '#ef4444'
                      }}>
                        {p.status}
                      </span>
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <div style={{ display: 'flex', gap: '6px' }}>
                        {p.status !== 'Approved' && (
                          <button
                            onClick={() => handleApprove(p._id, p.name)}
                            className="btn btn-icon"
                            title="Approve Product"
                            style={{ background: 'rgba(16, 185, 129, 0.1)', color: '#10b981', border: 'none', padding: '6px', borderRadius: '4px', cursor: 'pointer' }}
                          >
                            <Check size={14} />
                          </button>
                        )}
                        <button
                          onClick={() => handleDelete(p._id, p.name)}
                          className="btn btn-icon"
                          title="Delete Product"
                          style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', border: 'none', padding: '6px', borderRadius: '4px', cursor: 'pointer' }}
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Sub-tab 3: Store Manager Sales Breakdown */}
      {activeSubTab === 'managers' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
          {managerStats.length === 0 ? (
            <div className="glass-panel" style={{ padding: '30px', textAlign: 'center', gridColumn: '1 / -1' }}>
              <p style={{ color: 'var(--text-secondary)', margin: 0 }}>No store manager product activity recorded yet.</p>
            </div>
          ) : (
            managerStats.map(m => (
              <div key={m.managerName} className="glass-panel" style={{ padding: '20px', borderRadius: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '14px' }}>
                  <div style={{ width: '42px', height: '42px', borderRadius: '50%', background: 'rgba(245, 158, 11, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#f59e0b' }}>
                    <User size={20} />
                  </div>
                  <div>
                    <h4 style={{ margin: 0, color: 'var(--text-primary)', fontSize: '1rem' }}>{m.managerName}</h4>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Store Manager</span>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', fontSize: '0.82rem' }}>
                  <div style={{ background: 'rgba(255,255,255,0.03)', padding: '10px', borderRadius: '8px' }}>
                    <span style={{ color: 'var(--text-secondary)', display: 'block' }}>Products Submitted</span>
                    <strong style={{ fontSize: '1.1rem', color: 'var(--text-primary)' }}>{m.totalListed}</strong>
                  </div>
                  <div style={{ background: 'rgba(255,255,255,0.03)', padding: '10px', borderRadius: '8px' }}>
                    <span style={{ color: 'var(--text-secondary)', display: 'block' }}>Approved & Live</span>
                    <strong style={{ fontSize: '1.1rem', color: '#10b981' }}>{m.approved}</strong>
                  </div>
                  <div style={{ background: 'rgba(255,255,255,0.03)', padding: '10px', borderRadius: '8px' }}>
                    <span style={{ color: 'var(--text-secondary)', display: 'block' }}>Units Sold</span>
                    <strong style={{ fontSize: '1.1rem', color: '#818cf8' }}>{m.unitsSold}</strong>
                  </div>
                  <div style={{ background: 'rgba(255,255,255,0.03)', padding: '10px', borderRadius: '8px' }}>
                    <span style={{ color: 'var(--text-secondary)', display: 'block' }}>Total Revenue</span>
                    <strong style={{ fontSize: '1.1rem', color: '#10b981' }}>${m.revenueGenerated.toLocaleString()}</strong>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Sub-tab 4: Recent Orders */}
      {activeSubTab === 'orders' && (
        <div className="glass-panel" style={{ borderRadius: '12px', overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
              <thead>
                <tr style={{ background: 'rgba(255,255,255,0.03)', borderBottom: '1px solid var(--card-border)', color: 'var(--text-secondary)' }}>
                  <th style={{ padding: '12px 16px' }}>Tracking Code</th>
                  <th style={{ padding: '12px 16px' }}>Customer / Email</th>
                  <th style={{ padding: '12px 16px' }}>Items Count</th>
                  <th style={{ padding: '12px 16px' }}>Total Amount</th>
                  <th style={{ padding: '12px 16px' }}>Payment</th>
                  <th style={{ padding: '12px 16px' }}>Order Status</th>
                  <th style={{ padding: '12px 16px' }}>Date</th>
                </tr>
              </thead>
              <tbody>
                {recentOrders.map(o => (
                  <tr key={o._id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                    <td style={{ padding: '12px 16px', fontFamily: 'monospace', color: '#818cf8', fontWeight: 600 }}>
                      {o.trackingCode || o.orderId}
                    </td>
                    <td style={{ padding: '12px 16px', color: 'var(--text-primary)' }}>
                      {o.userName || o.guestEmail || 'Guest Shopper'}
                    </td>
                    <td style={{ padding: '12px 16px', color: 'var(--text-secondary)' }}>
                      {o.items?.length || 0} item(s)
                    </td>
                    <td style={{ padding: '12px 16px', color: '#10b981', fontWeight: 700 }}>
                      ${o.totalAmount}
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <span style={{ fontSize: '0.75rem', padding: '2px 8px', borderRadius: '4px', background: o.paymentStatus === 'Paid' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(245, 158, 11, 0.15)', color: o.paymentStatus === 'Paid' ? '#10b981' : '#f59e0b', fontWeight: 600 }}>
                        {o.paymentStatus}
                      </span>
                    </td>
                    <td style={{ padding: '12px 16px', color: 'var(--text-secondary)' }}>
                      {o.orderStatus}
                    </td>
                    <td style={{ padding: '12px 16px', color: 'var(--text-secondary)', fontSize: '0.78rem' }}>
                      {new Date(o.createdAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Rejection Modal */}
      {rejectModal.isOpen && (
        <div className="modal-overlay" style={{ zIndex: 1100, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div className="modal-content glass-panel" style={{ maxWidth: '440px', width: '90%', padding: '20px', borderRadius: '12px', background: 'var(--card-bg, #111827)' }}>
            <h4 style={{ margin: '0 0 10px', color: '#ef4444', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <AlertTriangle size={18} /> Reject Product Listing
            </h4>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: '0 0 14px' }}>
              Provide a reason for rejecting <strong>'{rejectModal.productName}'</strong>:
            </p>
            <form onSubmit={handleReject}>
              <textarea
                rows={3}
                required
                placeholder="E.g., Inappropriate imagery, incorrect pricing, or missing health certifications..."
                value={rejectModal.reason}
                onChange={e => setRejectModal({ ...rejectModal, reason: e.target.value })}
                style={{ width: '100%', padding: '10px', borderRadius: '8px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.15)', color: '#fff', fontSize: '0.85rem', marginBottom: '14px' }}
              />
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                <button
                  type="button"
                  onClick={() => setRejectModal({ isOpen: false, productId: null, productName: '', reason: '' })}
                  className="btn btn-outline"
                  style={{ fontSize: '0.85rem', padding: '6px 14px' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="btn btn-primary"
                  style={{ fontSize: '0.85rem', padding: '6px 14px', background: '#ef4444', borderColor: '#ef4444' }}
                >
                  Confirm Rejection
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminStoreOversight;
