import React, { useState, useEffect, useCallback } from 'react';
import { PlusCircle, Edit3, Trash2, Search, RotateCcw, Shield, Clock, Lock, AlertTriangle, Eye, EyeOff, CheckCircle2 } from 'lucide-react';
import { toast } from 'react-toastify';
import Modal from '../common/Modal';
import EditUserModal from './EditUserModal';

const BAN_DURATIONS = [
  { label: '24 Hours (1 Day)', value: '24h' },
  { label: '7 Days (1 Week)', value: '7d' },
  { label: '30 Days (1 Month)', value: '30d' },
  { label: '1 Year (365 Days)', value: '1y' },
  { label: 'Permanent Ban', value: 'permanent' },
];

const UserManagement = ({ users = [], onRefresh }) => {
  const [activeTab, setActiveTab] = useState('active'); // 'active' | 'recycle_bin'
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('All');

  // Recycle Bin State
  const [recycleBinUsers, setRecycleBinUsers] = useState([]);
  const [loadingRecycleBin, setLoadingRecycleBin] = useState(false);

  // Admin Role Identity
  const currentUserRole = localStorage.getItem('gymsync_admin_role') || localStorage.getItem('gymsync_role') || 'Admin';
  const isSuperAdmin = currentUserRole === 'SuperAdmin';


  // Edit User Modal State
  const [editingUser, setEditingUser] = useState(null);
  const [isUpdatingUser, setIsUpdatingUser] = useState(false);

  // --- Sudo-Mode Modals State (Password Required) ---
  const [roleModal, setRoleModal] = useState({ isOpen: false, user: null, newRole: '', password: '', showPassword: false, loading: false });
  const [banModal, setBanModal] = useState({ isOpen: false, user: null, isBanned: true, banDuration: '7d', banReason: '', password: '', showPassword: false, loading: false });
  const [deleteModal, setDeleteModal] = useState({ isOpen: false, user: null, password: '', showPassword: false, loading: false });
  const [restoreModal, setRestoreModal] = useState({ isOpen: false, user: null, password: '', showPassword: false, loading: false });
  const [purgeModal, setPurgeModal] = useState({ isOpen: false, user: null, password: '', typedConfirmation: '', showPassword: false, loading: false });

  // Fetch Recycle Bin Users
  const fetchRecycleBin = useCallback(async () => {
    try {
      setLoadingRecycleBin(true);
      const res = await fetch('/api/admin/users?view=recycle_bin', {
        headers: { 'Authorization': `Bearer ${(localStorage.getItem('gymsync_admin_token') || localStorage.getItem('gymsync_token')) || ''}` }
      });
      if (res.ok) {
        const data = await res.json();
        setRecycleBinUsers(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      console.error('Failed to fetch recycle bin:', err);
    } finally {
      setLoadingRecycleBin(false);
    }
  }, []);

  useEffect(() => {
    fetchRecycleBin();
  }, [fetchRecycleBin]);

  const refreshAll = () => {
    if (onRefresh) onRefresh();
    fetchRecycleBin();
  };

  // Helper for Days Remaining in Recycle Bin
  const getDaysRemaining = (scheduledDate) => {
    if (!scheduledDate) return 15;
    const ms = new Date(scheduledDate).getTime() - Date.now();
    return Math.max(1, Math.ceil(ms / (24 * 60 * 60 * 1000)));
  };



  // 2. Edit User Details
  const handleSaveEditUser = async ({ name, email }) => {
    if (!editingUser) return;
    setIsUpdatingUser(true);
    try {
      const res = await fetch(`/api/admin/users/${editingUser._id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${(localStorage.getItem('gymsync_admin_token') || localStorage.getItem('gymsync_token')) || ''}`
        },
        body: JSON.stringify({ name, email })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      toast.success('User details updated successfully');
      setEditingUser(null);
      refreshAll();
    } catch (error) {
      toast.error(error.message || 'Could not update user');
    } finally {
      setIsUpdatingUser(false);
    }
  };

  // 3. Confirm Role Change (with Admin Password)
  const handleConfirmRoleChange = async (e) => {
    e.preventDefault();
    if (!roleModal.password) {
      toast.warn('Admin password is required to change roles.');
      return;
    }
    setRoleModal(prev => ({ ...prev, loading: true }));
    try {
      const res = await fetch(`/api/admin/users/${roleModal.user._id}/role`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${(localStorage.getItem('gymsync_admin_token') || localStorage.getItem('gymsync_token')) || ''}`
        },
        body: JSON.stringify({ role: roleModal.newRole, adminPassword: roleModal.password })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to update role');
      toast.success(data.message || `Role updated to ${roleModal.newRole}`);
      setRoleModal({ isOpen: false, user: null, newRole: '', password: '', showPassword: false, loading: false });
      refreshAll();
    } catch (err) {
      toast.error(err.message || 'Failed to update role');
      setRoleModal(prev => ({ ...prev, loading: false }));
    }
  };

  // 4. Confirm Ban / Unban (with Admin Password)
  const handleConfirmBan = async (e) => {
    e.preventDefault();
    if (!banModal.password) {
      toast.warn('Admin password is required.');
      return;
    }
    setBanModal(prev => ({ ...prev, loading: true }));
    try {
      const res = await fetch(`/api/admin/users/${banModal.user._id}/ban`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${(localStorage.getItem('gymsync_admin_token') || localStorage.getItem('gymsync_token')) || ''}`
        },
        body: JSON.stringify({
          isBanned: banModal.isBanned,
          banDuration: banModal.banDuration,
          banReason: banModal.banReason,
          adminPassword: banModal.password
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to update ban status');
      toast.success(data.message);
      setBanModal({ isOpen: false, user: null, isBanned: true, banDuration: '7d', banReason: '', password: '', showPassword: false, loading: false });
      refreshAll();
    } catch (err) {
      toast.error(err.message || 'Failed to update ban status');
      setBanModal(prev => ({ ...prev, loading: false }));
    }
  };

  // 5. Confirm Move to Recycle Bin (Soft Delete with Admin Password)
  const handleConfirmMoveToRecycleBin = async (e) => {
    e.preventDefault();
    if (!deleteModal.password) {
      toast.warn('Admin password is required to delete accounts.');
      return;
    }
    setDeleteModal(prev => ({ ...prev, loading: true }));
    try {
      const res = await fetch(`/api/admin/users/${deleteModal.user._id}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${(localStorage.getItem('gymsync_admin_token') || localStorage.getItem('gymsync_token')) || ''}`
        },
        body: JSON.stringify({ adminPassword: deleteModal.password })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to delete account');
      toast.success(data.message || 'Account moved to Recycle Bin (15-day grace period)');
      setDeleteModal({ isOpen: false, user: null, password: '', showPassword: false, loading: false });
      refreshAll();
    } catch (err) {
      toast.error(err.message || 'Failed to delete account');
      setDeleteModal(prev => ({ ...prev, loading: false }));
    }
  };

  // 6. Confirm Restore from Recycle Bin (with Admin Password)
  const handleConfirmRestore = async (e) => {
    e.preventDefault();
    if (!restoreModal.password) {
      toast.warn('Admin password is required to restore accounts.');
      return;
    }
    setRestoreModal(prev => ({ ...prev, loading: true }));
    try {
      const res = await fetch(`/api/admin/users/${restoreModal.user._id}/restore`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${(localStorage.getItem('gymsync_admin_token') || localStorage.getItem('gymsync_token')) || ''}`
        },
        body: JSON.stringify({ adminPassword: restoreModal.password })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to restore account');
      toast.success(data.message || 'Account restored successfully!');
      setRestoreModal({ isOpen: false, user: null, password: '', showPassword: false, loading: false });
      refreshAll();
    } catch (err) {
      toast.error(err.message || 'Failed to restore account');
      setRestoreModal(prev => ({ ...prev, loading: false }));
    }
  };

  // 7. Confirm Permanent Purge (Hard Delete by SuperAdmin)
  const handleConfirmPurge = async (e) => {
    e.preventDefault();
    if (purgeModal.typedConfirmation !== 'DELETE') {
      toast.warn('Please type DELETE to confirm permanent purge.');
      return;
    }
    if (!purgeModal.password) {
      toast.warn('SuperAdmin password is required.');
      return;
    }
    setPurgeModal(prev => ({ ...prev, loading: true }));
    try {
      const res = await fetch(`/api/admin/users/${purgeModal.user._id}/permanent`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${(localStorage.getItem('gymsync_admin_token') || localStorage.getItem('gymsync_token')) || ''}`
        },
        body: JSON.stringify({ adminPassword: purgeModal.password })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to permanently purge account');
      toast.success(data.message || 'Account permanently purged from database.');
      setPurgeModal({ isOpen: false, user: null, password: '', typedConfirmation: '', showPassword: false, loading: false });
      refreshAll();
    } catch (err) {
      toast.error(err.message || 'Failed to permanently purge account');
      setPurgeModal(prev => ({ ...prev, loading: false }));
    }
  };

  // Filtered lists
  const currentList = activeTab === 'active' ? users : recycleBinUsers;
  const filteredUsers = currentList.filter(u => {
    const matchesSearch = (u.name || '').toLowerCase().includes(search.toLowerCase()) ||
                          (u.email || '').toLowerCase().includes(search.toLowerCase());
    const matchesRole = roleFilter === 'All' || u.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  return (
    <div className="glass-panel" style={{ padding: '24px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '15px' }}>
        <div>
          <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Shield size={22} color="var(--primary-accent)" /> User Access & Account Lifecycle Management
          </h3>
          <p style={{ margin: '4px 0 0 0', color: 'var(--text-secondary)' }}>
            Admin Sudo-Mode: Role modifications, timed suspensions, and deletions require admin password verification.
          </p>
        </div>

        {/* View Switcher: Active Accounts vs Recycle Bin */}
        <div style={{ display: 'flex', background: 'rgba(255,255,255,0.05)', padding: '4px', borderRadius: '10px', gap: '4px' }}>
          <button
            type="button"
            onClick={() => setActiveTab('active')}
            style={{
              padding: '8px 16px',
              borderRadius: '8px',
              border: 'none',
              background: activeTab === 'active' ? 'var(--primary-accent, #3b82f6)' : 'transparent',
              color: activeTab === 'active' ? '#fff' : 'var(--text-secondary)',
              fontWeight: 600,
              fontSize: '0.88rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              transition: 'all 0.2s'
            }}
          >
            <CheckCircle2 size={16} /> Active Accounts ({users.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('recycle_bin')}
            style={{
              padding: '8px 16px',
              borderRadius: '8px',
              border: 'none',
              background: activeTab === 'recycle_bin' ? '#8b5cf6' : 'transparent',
              color: activeTab === 'recycle_bin' ? '#fff' : 'var(--text-secondary)',
              fontWeight: 600,
              fontSize: '0.88rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              transition: 'all 0.2s'
            }}
          >
            <Trash2 size={16} /> Recycle Bin ({recycleBinUsers.length})
          </button>
        </div>
      </div>



      {/* Recycle Bin Information Banner */}
      {activeTab === 'recycle_bin' && (
        <div style={{ background: 'rgba(139, 92, 246, 0.1)', border: '1px solid rgba(139, 92, 246, 0.3)', padding: '16px 20px', borderRadius: '12px', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <Clock size={24} color="#a78bfa" style={{ flexShrink: 0 }} />
          <div style={{ fontSize: '0.88rem', color: '#e2e8f0', lineHeight: 1.5 }}>
            <strong>Recycle Bin 15-Day Grace Period:</strong> Accounts here are soft-deleted and cannot log into the platform. Admins can click <strong>Restore</strong> at any time during the 15-day window. After 15 days, expired accounts are permanently purged.
          </div>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div style={{ display: 'flex', gap: '15px', flexWrap: 'wrap', marginBottom: '20px' }}>
        <div className="search-bar" style={{ flex: 1, minWidth: '220px' }}>
          <Search size={18} color="var(--text-secondary)" />
          <input 
            type="text" 
            placeholder={`Search ${activeTab === 'active' ? 'active users' : 'recycle bin'} by name or email...`} 
            value={search} 
            onChange={e => setSearch(e.target.value)} 
          />
        </div>
        <select 
          className="search-input" 
          style={{ width: 'auto', minWidth: '180px' }}
          value={roleFilter}
          onChange={e => setRoleFilter(e.target.value)}
        >
          <option value="All">All Roles</option>
          <option value="User">User</option>
          <option value="GymOwner">GymOwner</option>
          <option value="GymTrainer">GymTrainer</option>
          <option value="FitnessInstructor">FitnessInstructor</option>
          <option value="StoreManager">StoreManager</option>
          <option value="ComplaintModerator">ComplaintModerator</option>
          <option value="Admin">Admin</option>
          <option value="SuperAdmin">SuperAdmin</option>
        </select>
      </div>

      {/* Table: Active Accounts vs Recycle Bin */}
      <div className="table-responsive">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Role</th>
              <th>Status</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {filteredUsers.length === 0 ? (
              <tr>
                <td colSpan="5" style={{ textAlign: 'center', padding: '30px', color: 'var(--text-secondary)' }}>
                  {activeTab === 'active' 
                    ? 'No accounts matching your search criteria.'
                    : 'The Recycle Bin is empty.'}
                </td>
              </tr>
            ) : (
              filteredUsers.map(u => {
                const daysRemaining = getDaysRemaining(u.deletionScheduledPermanentAt);
                return (
                  <tr key={u._id}>
                    <td><strong>{u.name}</strong></td>
                    <td>{u.email}</td>
                    <td>
                      {activeTab === 'active' ? (
                        <select
                          className="search-input"
                          style={{ padding: '4px 8px', fontSize: '0.85rem' }}
                          value={u.role}
                          onChange={(e) => {
                            const newRole = e.target.value;
                            if (newRole !== u.role) {
                              setRoleModal({ isOpen: true, user: u, newRole, password: '', showPassword: false, loading: false });
                            }
                          }}
                        >
                          <option value="User">User</option>
                          <option value="GymOwner">GymOwner</option>
                          <option value="GymTrainer">GymTrainer</option>
                          <option value="FitnessInstructor">FitnessInstructor</option>
                          <option value="StoreManager">StoreManager</option>
                          <option value="ComplaintModerator">ComplaintModerator</option>
                          <option value="Admin">Admin</option>
                          <option value="SuperAdmin">SuperAdmin</option>
                        </select>
                      ) : (
                        <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{u.role}</span>
                      )}
                    </td>

                    {/* Status Badge */}
                    <td>
                      {activeTab === 'recycle_bin' ? (
                        <span style={{ background: 'rgba(139, 92, 246, 0.2)', color: '#c4b5fd', padding: '4px 10px', borderRadius: '12px', fontSize: '0.8rem', fontWeight: 600 }}>
                          🗑️ {daysRemaining} day{daysRemaining > 1 ? 's' : ''} left
                        </span>
                      ) : u.isBanned ? (
                        <span 
                          className="status-pill rejected" 
                          style={{ color: '#ef4444', cursor: 'help' }}
                          title={`Banned: ${u.banReason || 'Administrative suspension'}${u.bannedUntil ? ' (Until ' + new Date(u.bannedUntil).toLocaleDateString() + ')' : ' (Permanent)'}`}
                        >
                          Banned {u.bannedUntil ? `(${new Date(u.bannedUntil).toLocaleDateString()})` : '(Permanent)'}
                        </span>
                      ) : u.isDeactivated ? (
                        <span style={{ background: 'rgba(245, 158, 11, 0.2)', color: '#f59e0b', padding: '4px 10px', borderRadius: '12px', fontSize: '0.8rem', fontWeight: 600 }}>
                          Deactivated
                        </span>
                      ) : (
                        <span className="status-pill approved" style={{ color: '#10b981' }}>Active</span>
                      )}
                    </td>

                    {/* Actions */}
                    <td>
                      {activeTab === 'active' ? (
                        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                          <button 
                            className="btn btn-outline btn-sm" 
                            onClick={() => setEditingUser(u)} 
                            title="Edit user name and email"
                          >
                            <Edit3 size={14} /> Edit
                          </button>
                          
                          <button 
                            className={`btn btn-sm ${u.isBanned ? 'btn-primary' : 'btn-outline'}`}
                            onClick={() => {
                              setBanModal({
                                isOpen: true,
                                user: u,
                                isBanned: !u.isBanned,
                                banDuration: '7d',
                                banReason: u.isBanned ? '' : 'Violating community guidelines',
                                password: '',
                                showPassword: false,
                                loading: false
                              });
                            }}
                          >
                            {u.isBanned ? 'Unban' : 'Ban'}
                          </button>
                          
                          <button 
                            className="btn btn-outline btn-sm" 
                            style={{ color: '#ef4444', borderColor: '#ef4444' }} 
                            onClick={() => setDeleteModal({ isOpen: true, user: u, password: '', showPassword: false, loading: false })} 
                            title="Move account to 15-day Recycle Bin"
                          >
                            <Trash2 size={14} /> Delete
                          </button>
                        </div>
                      ) : (
                        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                          <button 
                            className="btn btn-primary btn-sm" 
                            style={{ background: '#10b981', borderColor: '#10b981' }}
                            onClick={() => setRestoreModal({ isOpen: true, user: u, password: '', showPassword: false, loading: false })}
                            title="Restore account back to active"
                          >
                            <RotateCcw size={14} /> Restore
                          </button>

                          {isSuperAdmin && (
                            <button 
                              className="btn btn-outline btn-sm" 
                              style={{ color: '#ef4444', borderColor: '#ef4444' }} 
                              onClick={() => setPurgeModal({ isOpen: true, user: u, password: '', typedConfirmation: '', showPassword: false, loading: false })}
                              title="Permanently erase account from database immediately"
                            >
                              <Trash2 size={14} /> Purge Now
                            </button>
                          )}
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Edit User Modal */}
      <EditUserModal
        isOpen={Boolean(editingUser)}
        onClose={() => setEditingUser(null)}
        user={editingUser}
        onSave={handleSaveEditUser}
        loading={isUpdatingUser}
      />

      {/* --- SUDO-MODE MODAL 1: Role Change --- */}
      {roleModal.isOpen && (
        <Modal isOpen={roleModal.isOpen} onClose={() => setRoleModal(prev => ({ ...prev, isOpen: false }))} title="Confirm Role Change">
          <form onSubmit={handleConfirmRoleChange} style={{ padding: '8px 0' }}>
            <div style={{ background: 'rgba(59, 130, 246, 0.1)', padding: '14px', borderRadius: '10px', marginBottom: '18px', border: '1px solid rgba(59, 130, 246, 0.25)' }}>
              <div style={{ fontSize: '0.9rem', marginBottom: '6px' }}>
                User: <strong>{roleModal.user?.name}</strong> ({roleModal.user?.email})
              </div>
              <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                Target Role: <strong style={{ color: '#93c5fd' }}>{roleModal.user?.role}</strong> → <strong style={{ color: '#60a5fa' }}>{roleModal.newRole}</strong>
              </div>
            </div>

            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '14px' }}>
              To prevent accidental privilege escalation, please verify your administrator password:
            </p>

            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '6px' }}>Admin Password</label>
              <div style={{ position: 'relative' }}>
                <input
                  type={roleModal.showPassword ? 'text' : 'password'}
                  required
                  placeholder="Enter your admin password"
                  value={roleModal.password}
                  onChange={e => setRoleModal({ ...roleModal, password: e.target.value })}
                  className="search-input"
                  style={{ paddingRight: '40px' }}
                  disabled={roleModal.loading}
                  autoFocus
                />
                <button
                  type="button"
                  onClick={() => setRoleModal(prev => ({ ...prev, showPassword: !prev.showPassword }))}
                  style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}
                >
                  {roleModal.showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button
                type="button"
                className="btn btn-secondary"
                disabled={roleModal.loading}
                onClick={() => setRoleModal(prev => ({ ...prev, isOpen: false }))}
              >
                Cancel
              </button>
              <button type="submit" className="btn btn-primary" disabled={roleModal.loading}>
                {roleModal.loading ? 'Verifying...' : 'Authorize Role Change'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* --- SUDO-MODE MODAL 2: Timed Ban / Unban --- */}
      {banModal.isOpen && (
        <Modal 
          isOpen={banModal.isOpen} 
          onClose={() => setBanModal(prev => ({ ...prev, isOpen: false }))} 
          title={banModal.isBanned ? `Ban Account: ${banModal.user?.name}` : `Unban Account: ${banModal.user?.name}`}
        >
          <form onSubmit={handleConfirmBan} style={{ padding: '8px 0' }}>
            <div style={{ background: banModal.isBanned ? 'rgba(239, 68, 68, 0.1)' : 'rgba(16, 185, 129, 0.1)', padding: '14px', borderRadius: '10px', marginBottom: '18px', border: banModal.isBanned ? '1px solid rgba(239, 68, 68, 0.25)' : '1px solid rgba(16, 185, 129, 0.25)' }}>
              <div style={{ fontSize: '0.9rem', marginBottom: '4px' }}>
                Target: <strong>{banModal.user?.name}</strong> ({banModal.user?.email})
              </div>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                Action: {banModal.isBanned ? 'Suspend account access' : 'Remove suspension and restore login'}
              </div>
            </div>

            {banModal.isBanned && (
              <>
                <div style={{ marginBottom: '16px' }}>
                  <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '6px' }}>
                    Ban Duration
                  </label>
                  <select
                    className="search-input"
                    value={banModal.banDuration}
                    onChange={e => setBanModal({ ...banModal, banDuration: e.target.value })}
                  >
                    {BAN_DURATIONS.map(d => (
                      <option key={d.value} value={d.value}>{d.label}</option>
                    ))}
                  </select>
                </div>

                <div style={{ marginBottom: '16px' }}>
                  <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '6px' }}>
                    Reason for Ban
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Terms violation, abusive behavior"
                    value={banModal.banReason}
                    onChange={e => setBanModal({ ...banModal, banReason: e.target.value })}
                    className="search-input"
                  />
                </div>
              </>
            )}

            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '6px' }}>
                Admin Password Required
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  type={banModal.showPassword ? 'text' : 'password'}
                  required
                  placeholder="Enter your admin password"
                  value={banModal.password}
                  onChange={e => setBanModal({ ...banModal, password: e.target.value })}
                  className="search-input"
                  style={{ paddingRight: '40px' }}
                  disabled={banModal.loading}
                  autoFocus
                />
                <button
                  type="button"
                  onClick={() => setBanModal(prev => ({ ...prev, showPassword: !prev.showPassword }))}
                  style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}
                >
                  {banModal.showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button
                type="button"
                className="btn btn-secondary"
                disabled={banModal.loading}
                onClick={() => setBanModal(prev => ({ ...prev, isOpen: false }))}
              >
                Cancel
              </button>
              <button 
                type="submit" 
                className={`btn ${banModal.isBanned ? 'btn-primary' : 'btn-outline'}`}
                style={banModal.isBanned ? { background: '#ef4444', borderColor: '#ef4444' } : {}}
                disabled={banModal.loading}
              >
                {banModal.loading ? 'Verifying...' : banModal.isBanned ? 'Confirm Ban' : 'Confirm Unban'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* --- SUDO-MODE MODAL 3: Soft Delete (Move to Recycle Bin) --- */}
      {deleteModal.isOpen && (
        <Modal isOpen={deleteModal.isOpen} onClose={() => setDeleteModal(prev => ({ ...prev, isOpen: false }))} title="Move Account to Recycle Bin">
          <form onSubmit={handleConfirmMoveToRecycleBin} style={{ padding: '8px 0' }}>
            <div style={{ background: 'rgba(239, 68, 68, 0.1)', padding: '14px', borderRadius: '10px', marginBottom: '18px', border: '1px solid rgba(239, 68, 68, 0.25)' }}>
              <div style={{ fontSize: '0.9rem', marginBottom: '6px' }}>
                Account: <strong>{deleteModal.user?.name}</strong> ({deleteModal.user?.email})
              </div>
              <div style={{ fontSize: '0.85rem', color: '#fca5a5', lineHeight: 1.4 }}>
                ♻️ <strong>15-Day Recovery Window:</strong> This account will NOT be immediately erased. It will be moved to the Recycle Bin for 15 days. During this period, an admin can click <strong>Restore</strong> to recover the account.
              </div>
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '6px' }}>Admin Password</label>
              <div style={{ position: 'relative' }}>
                <input
                  type={deleteModal.showPassword ? 'text' : 'password'}
                  required
                  placeholder="Enter your admin password"
                  value={deleteModal.password}
                  onChange={e => setDeleteModal({ ...deleteModal, password: e.target.value })}
                  className="search-input"
                  style={{ paddingRight: '40px' }}
                  disabled={deleteModal.loading}
                  autoFocus
                />
                <button
                  type="button"
                  onClick={() => setDeleteModal(prev => ({ ...prev, showPassword: !prev.showPassword }))}
                  style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}
                >
                  {deleteModal.showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button
                type="button"
                className="btn btn-secondary"
                disabled={deleteModal.loading}
                onClick={() => setDeleteModal(prev => ({ ...prev, isOpen: false }))}
              >
                Cancel
              </button>
              <button type="submit" className="btn btn-primary" style={{ background: '#ef4444', borderColor: '#ef4444' }} disabled={deleteModal.loading}>
                {deleteModal.loading ? 'Moving...' : 'Move to Recycle Bin'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* --- SUDO-MODE MODAL 4: Restore Account --- */}
      {restoreModal.isOpen && (
        <Modal isOpen={restoreModal.isOpen} onClose={() => setRestoreModal(prev => ({ ...prev, isOpen: false }))} title="Restore Account from Recycle Bin">
          <form onSubmit={handleConfirmRestore} style={{ padding: '8px 0' }}>
            <div style={{ background: 'rgba(16, 185, 129, 0.1)', padding: '14px', borderRadius: '10px', marginBottom: '18px', border: '1px solid rgba(16, 185, 129, 0.25)' }}>
              <div style={{ fontSize: '0.9rem', marginBottom: '6px' }}>
                Restore Account: <strong>{restoreModal.user?.name}</strong> ({restoreModal.user?.email})
              </div>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: 0 }}>
                This account will be removed from the Recycle Bin and returned to active status. The user will be able to log in again immediately.
              </p>
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '6px' }}>Admin Password</label>
              <div style={{ position: 'relative' }}>
                <input
                  type={restoreModal.showPassword ? 'text' : 'password'}
                  required
                  placeholder="Enter your admin password"
                  value={restoreModal.password}
                  onChange={e => setRestoreModal({ ...restoreModal, password: e.target.value })}
                  className="search-input"
                  style={{ paddingRight: '40px' }}
                  disabled={restoreModal.loading}
                  autoFocus
                />
                <button
                  type="button"
                  onClick={() => setRestoreModal(prev => ({ ...prev, showPassword: !prev.showPassword }))}
                  style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}
                >
                  {restoreModal.showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button
                type="button"
                className="btn btn-secondary"
                disabled={restoreModal.loading}
                onClick={() => setRestoreModal(prev => ({ ...prev, isOpen: false }))}
              >
                Cancel
              </button>
              <button type="submit" className="btn btn-primary" style={{ background: '#10b981', borderColor: '#10b981' }} disabled={restoreModal.loading}>
                {restoreModal.loading ? 'Restoring...' : 'Restore Account'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* --- SUDO-MODE MODAL 5: Permanent Purge (SuperAdmin Only) --- */}
      {purgeModal.isOpen && (
        <Modal isOpen={purgeModal.isOpen} onClose={() => setPurgeModal(prev => ({ ...prev, isOpen: false }))} title="⚠️ Permanently Purge Account">
          <form onSubmit={handleConfirmPurge} style={{ padding: '8px 0' }}>
            <div style={{ background: 'rgba(239, 68, 68, 0.15)', padding: '14px', borderRadius: '10px', marginBottom: '18px', border: '1px solid rgba(239, 68, 68, 0.4)' }}>
              <div style={{ fontSize: '0.9rem', color: '#fca5a5', fontWeight: 'bold', marginBottom: '6px' }}>
                IRREVERSIBLE ACTION
              </div>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: 0 }}>
                You are about to permanently delete <strong>{purgeModal.user?.name}</strong> ({purgeModal.user?.email}) from the database. This action CANNOT be recovered.
              </p>
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '6px' }}>
                Please type <strong style={{ color: '#ef4444' }}>DELETE</strong> to confirm:
              </label>
              <input
                type="text"
                required
                placeholder="DELETE"
                value={purgeModal.typedConfirmation}
                onChange={e => setPurgeModal({ ...purgeModal, typedConfirmation: e.target.value })}
                className="search-input"
                style={{ borderColor: '#ef4444' }}
              />
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '6px' }}>SuperAdmin Password</label>
              <div style={{ position: 'relative' }}>
                <input
                  type={purgeModal.showPassword ? 'text' : 'password'}
                  required
                  placeholder="Enter your SuperAdmin password"
                  value={purgeModal.password}
                  onChange={e => setPurgeModal({ ...purgeModal, password: e.target.value })}
                  className="search-input"
                  style={{ paddingRight: '40px' }}
                  disabled={purgeModal.loading}
                />
                <button
                  type="button"
                  onClick={() => setPurgeModal(prev => ({ ...prev, showPassword: !prev.showPassword }))}
                  style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}
                >
                  {purgeModal.showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button
                type="button"
                className="btn btn-secondary"
                disabled={purgeModal.loading}
                onClick={() => setPurgeModal(prev => ({ ...prev, isOpen: false }))}
              >
                Cancel
              </button>
              <button 
                type="submit" 
                className="btn btn-primary" 
                style={{ background: '#b91c1c', borderColor: '#b91c1c' }} 
                disabled={purgeModal.loading || purgeModal.typedConfirmation !== 'DELETE'}
              >
                {purgeModal.loading ? 'Purging...' : 'Permanently Erase'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};

export default UserManagement;
