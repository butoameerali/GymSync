import React, { useState, useEffect } from 'react';
import { useAdminAuth } from '../../context/AdminAuthContext';
import {
  ShoppingBag,
  UserPlus,
  Package,
  Users,
  CheckCircle,
  XCircle,
  Mail,
  Lock,
  User,
  Shield,
  Edit,
  Trash2,
  Power,
  RotateCcw,
  Check,
  X
} from 'lucide-react';
import { toast } from 'react-toastify';
import AdminStoreOversight from '../../components/admin/AdminStoreOversight';

const StoreOversightPage = () => {
  const { authHeaders } = useAdminAuth();
  const [activeTab, setActiveTab] = useState('products'); // 'products' | 'managers'
  const [storeManagers, setStoreManagers] = useState([]);
  const [loading, setLoading] = useState(true);

  // Create Modal
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Edit Modal
  const [editingManager, setEditingManager] = useState(null);
  const [editName, setEditName] = useState('');
  const [editStatus, setEditStatus] = useState('Active');
  const [editPassword, setEditPassword] = useState('');

  // Delete Modal
  const [deletingManager, setDeletingManager] = useState(null);

  const fetchStoreManagers = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/store-managers', { headers: authHeaders() });
      if (res.ok) {
        const data = await res.json();
        setStoreManagers(data || []);
      }
    } catch (err) {
      console.error('fetchStoreManagers error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStoreManagers();
  }, []);

  const handleCreateManager = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch('/api/admin/store-managers', {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ name, email, password })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to provision store manager');
      toast.success(data.message || 'Store Manager created successfully');
      setName('');
      setEmail('');
      setPassword('');
      setShowInviteModal(false);
      fetchStoreManagers();
    } catch (err) {
      toast.error(err.message || 'Failed to provision Store Manager');
    } finally {
      setSubmitting(false);
    }
  };

  const handleOpenEdit = (m) => {
    setEditingManager(m);
    setEditName(m.name || '');
    setEditStatus(m.accountStatus || 'Active');
    setEditPassword('');
  };

  const handleSaveEdit = async (e) => {
    e.preventDefault();
    if (!editingManager) return;
    setSubmitting(true);
    try {
      const body = {
        name: editName,
        accountStatus: editStatus
      };
      if (editPassword.trim()) {
        body.password = editPassword.trim();
      }
      const res = await fetch(`/api/admin/store-managers/${editingManager._id}`, {
        method: 'PUT',
        headers: authHeaders(),
        body: JSON.stringify(body)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to update Store Manager');
      toast.success(data.message || 'Store Manager updated successfully');
      setEditingManager(null);
      fetchStoreManagers();
    } catch (err) {
      toast.error(err.message || 'Error updating manager');
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleStatus = async (m) => {
    const nextStatus = m.accountStatus === 'Active' ? 'Deactivated' : 'Active';
    try {
      const res = await fetch(`/api/admin/store-managers/${m._id}`, {
        method: 'PUT',
        headers: authHeaders(),
        body: JSON.stringify({ accountStatus: nextStatus })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to toggle status');
      toast.success(`Store Manager is now ${nextStatus}`);
      fetchStoreManagers();
    } catch (err) {
      toast.error(err.message || 'Error toggling manager status');
    }
  };

  const handleDeleteManager = async () => {
    if (!deletingManager) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/admin/store-managers/${deletingManager._id}`, {
        method: 'DELETE',
        headers: authHeaders()
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to revoke Store Manager');
      toast.success(data.message || 'Store Manager access revoked');
      setDeletingManager(null);
      fetchStoreManagers();
    } catch (err) {
      toast.error(err.message || 'Error revoking Store Manager');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      {/* Top Controls Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px', flexWrap: 'wrap', gap: '14px' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#fff', margin: '0 0 6px 0' }}>
            Store & Product Oversight
          </h1>
          <p style={{ color: '#9ca3af', fontSize: '0.88rem', margin: 0 }}>
            Review product catalog submissions, audit sales transactions, and manage authorized Store Managers.
          </p>
        </div>

        {activeTab === 'managers' && (
          <button
            onClick={() => setShowInviteModal(true)}
            className="btn-admin btn-admin-primary"
          >
            <UserPlus size={16} />
            <span>Provision Store Manager</span>
          </button>
        )}
      </div>

      {/* Tabs Switcher */}
      <div style={{ display: 'flex', gap: '10px', marginBottom: '24px', borderBottom: '1px solid #374151', paddingBottom: '12px' }}>
        <button
          onClick={() => setActiveTab('products')}
          style={{
            padding: '8px 18px',
            borderRadius: '8px',
            border: 'none',
            fontWeight: 700,
            fontSize: '0.9rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            background: activeTab === 'products' ? '#3b82f6' : '#1f2937',
            color: activeTab === 'products' ? '#fff' : '#9ca3af',
            transition: 'all 0.2s ease'
          }}
        >
          <Package size={17} />
          <span>Product Catalog & Approvals</span>
        </button>

        <button
          onClick={() => setActiveTab('managers')}
          style={{
            padding: '8px 18px',
            borderRadius: '8px',
            border: 'none',
            fontWeight: 700,
            fontSize: '0.9rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            background: activeTab === 'managers' ? '#3b82f6' : '#1f2937',
            color: activeTab === 'managers' ? '#fff' : '#9ca3af',
            transition: 'all 0.2s ease'
          }}
        >
          <Users size={17} />
          <span>Authorized Store Managers ({storeManagers.length})</span>
        </button>
      </div>

      {/* TAB 1: PRODUCT CATALOG & OVERSIGHT */}
      {activeTab === 'products' && (
        <div>
          <AdminStoreOversight />
        </div>
      )}

      {/* TAB 2: STORE MANAGERS CRUD */}
      {activeTab === 'managers' && (
        <div>
          <div className="admin-stat-grid" style={{ marginBottom: '24px' }}>
            <div className="admin-stat-card">
              <div className="stat-icon-wrapper" style={{ background: 'rgba(59, 130, 246, 0.15)', color: '#60a5fa' }}>
                <Users size={24} />
              </div>
              <div>
                <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#fff' }}>{storeManagers.length}</div>
                <div style={{ fontSize: '0.8rem', color: '#9ca3af' }}>Active Store Managers</div>
              </div>
            </div>

            <div className="admin-stat-card">
              <div className="stat-icon-wrapper" style={{ background: 'rgba(16, 185, 129, 0.15)', color: '#34d399' }}>
                <ShoppingBag size={24} />
              </div>
              <div>
                <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#fff' }}>Platform Store</div>
                <div style={{ fontSize: '0.8rem', color: '#9ca3af' }}>Isolated Scope & Protected Login</div>
              </div>
            </div>
          </div>

          <div className="admin-table-container">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Manager Name</th>
                  <th>Email</th>
                  <th>Role</th>
                  <th>Status</th>
                  <th>Provisioned By</th>
                  <th>Email Verified</th>
                  <th>Created At</th>
                  <th style={{ textAlign: 'center' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={8} style={{ textAlign: 'center', padding: '30px', color: '#9ca3af' }}>
                      Loading store managers...
                    </td>
                  </tr>
                ) : storeManagers.length === 0 ? (
                  <tr>
                    <td colSpan={8} style={{ textAlign: 'center', padding: '30px', color: '#9ca3af' }}>
                      No Store Managers provisioned yet. Use the button above to create one.
                    </td>
                  </tr>
                ) : (
                  storeManagers.map((m) => {
                    const status = m.accountStatus || 'Active';
                    const isActive = status === 'Active';
                    return (
                      <tr key={m._id}>
                        <td>
                          <div style={{ fontWeight: 600, color: '#fff' }}>{m.name}</div>
                        </td>
                        <td>{m.email}</td>
                        <td>
                          <span className="admin-badge" style={{ background: 'rgba(99, 102, 241, 0.2)', color: '#a5b4fc', borderColor: 'rgba(99, 102, 241, 0.3)' }}>
                            {m.role}
                          </span>
                        </td>
                        <td>
                          <span style={{
                            padding: '3px 8px',
                            borderRadius: '6px',
                            fontSize: '0.75rem',
                            fontWeight: 700,
                            background: isActive ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                            color: isActive ? '#34d399' : '#f87171'
                          }}>
                            {status}
                          </span>
                        </td>
                        <td>
                          <div>{m.invitedBy?.name || 'Administrator'}</div>
                          <div style={{ fontSize: '0.75rem', color: '#9ca3af' }}>{m.invitedBy?.email || ''}</div>
                        </td>
                        <td>
                          {m.isEmailVerified ? (
                            <span style={{ color: '#34d399', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.8rem' }}>
                              <CheckCircle size={14} /> Verified
                            </span>
                          ) : (
                            <span style={{ color: '#fbbf24', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.8rem' }}>
                              <XCircle size={14} /> Pending
                            </span>
                          )}
                        </td>
                        <td>{new Date(m.createdAt).toLocaleDateString()}</td>
                        <td>
                          <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                            <button
                              onClick={() => handleOpenEdit(m)}
                              className="btn-admin btn-admin-secondary"
                              style={{ padding: '5px 10px', fontSize: '0.78rem' }}
                              title="Edit Store Manager"
                            >
                              <Edit size={14} /> Edit
                            </button>
                            <button
                              onClick={() => handleToggleStatus(m)}
                              className="btn-admin btn-admin-secondary"
                              style={{
                                padding: '5px 10px',
                                fontSize: '0.78rem',
                                color: isActive ? '#f87171' : '#34d399'
                              }}
                              title={isActive ? 'Deactivate Manager' : 'Activate Manager'}
                            >
                              <Power size={14} /> {isActive ? 'Deactivate' : 'Activate'}
                            </button>
                            <button
                              onClick={() => setDeletingManager(m)}
                              className="btn-admin btn-admin-danger"
                              style={{ padding: '5px 10px', fontSize: '0.78rem' }}
                              title="Permanently Revoke Manager"
                            >
                              <Trash2 size={14} /> Revoke
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* PROVISION STORE MANAGER MODAL */}
      {showInviteModal && (
        <div className="admin-modal-overlay" onClick={(e) => e.target === e.currentTarget && setShowInviteModal(false)}>
          <div className="admin-modal-container" style={{ maxWidth: '480px' }}>
            <div className="admin-modal-header">
              <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 700, color: '#fff' }}>
                Provision Store Manager Account
              </h3>
              <button
                onClick={() => setShowInviteModal(false)}
                style={{ background: 'none', border: 'none', color: '#9ca3af', cursor: 'pointer', fontSize: '1.2rem' }}
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleCreateManager}>
              <div className="admin-modal-body">
                <p style={{ color: '#9ca3af', fontSize: '0.85rem', marginBottom: '16px' }}>
                  Store Managers can manage products, track inventory, and fulfill orders. They sign in through the public website portal and are strictly isolated to store responsibilities.
                </p>

                <div style={{ marginBottom: '14px' }}>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#d1d5db', marginBottom: '6px' }}>
                    Full Legal / Display Name
                  </label>
                  <div style={{ position: 'relative' }}>
                    <User size={18} style={{ position: 'absolute', left: '12px', top: '10px', color: '#6b7280' }} />
                    <input
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="e.g. John Store Manager"
                      style={{
                        width: '100%',
                        padding: '8px 12px 8px 38px',
                        background: '#111827',
                        border: '1px solid #374151',
                        borderRadius: '6px',
                        color: '#fff',
                        fontSize: '0.88rem'
                      }}
                    />
                  </div>
                </div>

                <div style={{ marginBottom: '14px' }}>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#d1d5db', marginBottom: '6px' }}>
                    Official Email
                  </label>
                  <div style={{ position: 'relative' }}>
                    <Mail size={18} style={{ position: 'absolute', left: '12px', top: '10px', color: '#6b7280' }} />
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="manager@gymsync.com"
                      style={{
                        width: '100%',
                        padding: '8px 12px 8px 38px',
                        background: '#111827',
                        border: '1px solid #374151',
                        borderRadius: '6px',
                        color: '#fff',
                        fontSize: '0.88rem'
                      }}
                    />
                  </div>
                </div>

                <div style={{ marginBottom: '16px' }}>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#d1d5db', marginBottom: '6px' }}>
                    Initial Password (Min 8 Characters)
                  </label>
                  <div style={{ position: 'relative' }}>
                    <Lock size={18} style={{ position: 'absolute', left: '12px', top: '10px', color: '#6b7280' }} />
                    <input
                      type="password"
                      required
                      minLength={8}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      style={{
                        width: '100%',
                        padding: '8px 12px 8px 38px',
                        background: '#111827',
                        border: '1px solid #374151',
                        borderRadius: '6px',
                        color: '#fff',
                        fontSize: '0.88rem'
                      }}
                    />
                  </div>
                </div>
              </div>

              <div className="admin-modal-footer">
                <button
                  type="button"
                  onClick={() => setShowInviteModal(false)}
                  className="btn-admin btn-admin-secondary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="btn-admin btn-admin-primary"
                >
                  {submitting ? 'Creating...' : 'Provision Store Manager'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT STORE MANAGER MODAL */}
      {editingManager && (
        <div className="admin-modal-overlay" onClick={(e) => e.target === e.currentTarget && setEditingManager(null)}>
          <div className="admin-modal-container" style={{ maxWidth: '480px' }}>
            <div className="admin-modal-header">
              <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 700, color: '#fff' }}>
                Edit Store Manager ({editingManager.email})
              </h3>
              <button
                onClick={() => setEditingManager(null)}
                style={{ background: 'none', border: 'none', color: '#9ca3af', cursor: 'pointer', fontSize: '1.2rem' }}
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleSaveEdit}>
              <div className="admin-modal-body">
                <div style={{ marginBottom: '14px' }}>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#d1d5db', marginBottom: '6px' }}>
                    Display Name
                  </label>
                  <input
                    type="text"
                    required
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      background: '#111827',
                      border: '1px solid #374151',
                      borderRadius: '6px',
                      color: '#fff',
                      fontSize: '0.88rem'
                    }}
                  />
                </div>

                <div style={{ marginBottom: '14px' }}>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#d1d5db', marginBottom: '6px' }}>
                    Account Status
                  </label>
                  <select
                    value={editStatus}
                    onChange={(e) => setEditStatus(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      background: '#111827',
                      border: '1px solid #374151',
                      borderRadius: '6px',
                      color: '#fff',
                      fontSize: '0.88rem'
                    }}
                  >
                    <option value="Active">Active</option>
                    <option value="Deactivated">Deactivated</option>
                    <option value="Banned">Banned</option>
                  </select>
                </div>

                <div style={{ marginBottom: '16px' }}>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#d1d5db', marginBottom: '6px' }}>
                    Reset Password (Optional — leave blank to keep unchanged)
                  </label>
                  <input
                    type="password"
                    minLength={8}
                    value={editPassword}
                    onChange={(e) => setEditPassword(e.target.value)}
                    placeholder="New password (min 8 chars)"
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      background: '#111827',
                      border: '1px solid #374151',
                      borderRadius: '6px',
                      color: '#fff',
                      fontSize: '0.88rem'
                    }}
                  />
                </div>
              </div>

              <div className="admin-modal-footer">
                <button
                  type="button"
                  onClick={() => setEditingManager(null)}
                  className="btn-admin btn-admin-secondary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="btn-admin btn-admin-primary"
                >
                  {submitting ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* REVOKE / DELETE MODAL */}
      {deletingManager && (
        <div className="admin-modal-overlay" onClick={(e) => e.target === e.currentTarget && setDeletingManager(null)}>
          <div className="admin-modal-container" style={{ maxWidth: '440px' }}>
            <div className="admin-modal-header">
              <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 700, color: '#f87171' }}>
                Revoke Store Manager Access
              </h3>
              <button
                onClick={() => setDeletingManager(null)}
                style={{ background: 'none', border: 'none', color: '#9ca3af', cursor: 'pointer', fontSize: '1.2rem' }}
              >
                ✕
              </button>
            </div>
            <div className="admin-modal-body">
              <p style={{ color: '#d1d5db', fontSize: '0.88rem', margin: '0 0 12px 0' }}>
                Are you sure you want to permanently revoke access for <strong>{deletingManager.name}</strong> ({deletingManager.email})?
              </p>
              <p style={{ color: '#9ca3af', fontSize: '0.8rem', margin: 0 }}>
                This will delete the Store Manager account and prevent them from logging in.
              </p>
            </div>
            <div className="admin-modal-footer">
              <button
                type="button"
                onClick={() => setDeletingManager(null)}
                className="btn-admin btn-admin-secondary"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={submitting}
                onClick={handleDeleteManager}
                className="btn-admin btn-admin-danger"
              >
                {submitting ? 'Revoking...' : 'Permanently Revoke'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StoreOversightPage;
