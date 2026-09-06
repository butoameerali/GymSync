import React, { useState } from 'react';
import { PlusCircle, Edit3, Trash2, Search, UserCheck } from 'lucide-react';
import { toast } from 'react-toastify';
import EditUserModal from './EditUserModal';
import ConfirmDialog from '../common/ConfirmDialog';

const UserManagement = ({ users, onRefresh }) => {
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('All');

  // Create Instructor State
  const [instructorForm, setInstructorForm] = useState({ name: '', email: '', password: '' });
  const [isCreatingInstructor, setIsCreatingInstructor] = useState(false);

  // Edit User Modal State
  const [editingUser, setEditingUser] = useState(null);
  const [isUpdatingUser, setIsUpdatingUser] = useState(false);

  // Delete User Confirmation State
  const [deletingUser, setDeletingUser] = useState(null);
  const [isDeletingUser, setIsDeletingUser] = useState(false);

  const handleCreateInstructor = async (e) => {
    e.preventDefault();
    if (!instructorForm.name || !instructorForm.email || !instructorForm.password) {
      toast.warn('Please fill in all fields');
      return;
    }
    setIsCreatingInstructor(true);
    try {
      const res = await fetch('/api/admin/create-instructor', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('gymsync_token') || ''}`
        },
        body: JSON.stringify(instructorForm)
      });
      const data = await res.json();
      if (res.ok) {
        toast.success(`Fitness Instructor '${instructorForm.name}' created successfully!`);
        setInstructorForm({ name: '', email: '', password: '' });
        if (onRefresh) onRefresh();
      } else {
        toast.error(data.message || 'Failed to create instructor');
      }
    } catch (error) {
      toast.error(error.message || 'Error creating instructor');
    } finally {
      setIsCreatingInstructor(false);
    }
  };

  const handleSaveEditUser = async ({ name, email }) => {
    if (!editingUser) return;
    setIsUpdatingUser(true);
    try {
      const res = await fetch(`/api/admin/users/${editingUser._id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('gymsync_token') || ''}`
        },
        body: JSON.stringify({ name, email })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      toast.success('User details updated successfully');
      setEditingUser(null);
      if (onRefresh) onRefresh();
    } catch (error) {
      toast.error(error.message || 'Could not update user');
    } finally {
      setIsUpdatingUser(false);
    }
  };

  const handleConfirmDeleteUser = async () => {
    if (!deletingUser) return;
    setIsDeletingUser(true);
    try {
      const res = await fetch(`/api/admin/users/${deletingUser._id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('gymsync_token') || ''}`
        }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      toast.success(`Account for ${deletingUser.name} deleted`);
      setDeletingUser(null);
      if (onRefresh) onRefresh();
    } catch (error) {
      toast.error(error.message || 'Could not delete user');
    } finally {
      setIsDeletingUser(false);
    }
  };

  const handleToggleBan = async (user) => {
    try {
      const res = await fetch(`/api/admin/users/${user._id}/ban`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('gymsync_token') || ''}`
        },
        body: JSON.stringify({ isBanned: !user.isBanned })
      });
      if (res.ok) {
        toast.success(`User ${user.name} status updated`);
        if (onRefresh) onRefresh();
      } else {
        const d = await res.json();
        toast.error(d.message || 'Failed to update ban status');
      }
    } catch (err) {
      toast.error('Failed to update ban status');
    }
  };

  const handleUpdateRole = async (userId, newRole) => {
    try {
      const res = await fetch(`/api/admin/users/${userId}/role`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('gymsync_token') || ''}`
        },
        body: JSON.stringify({ role: newRole })
      });
      if (res.ok) {
        toast.success(`Role updated to ${newRole}`);
        if (onRefresh) onRefresh();
      } else {
        const d = await res.json();
        toast.error(d.message || 'Role update failed');
      }
    } catch (err) {
      toast.error('Failed to update role');
    }
  };

  const filteredUsers = (users || []).filter(u => {
    const matchesSearch = (u.name || '').toLowerCase().includes(search.toLowerCase()) ||
                          (u.email || '').toLowerCase().includes(search.toLowerCase());
    const matchesRole = roleFilter === 'All' || u.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  return (
    <div className="glass-panel" style={{ padding: '24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '15px' }}>
        <div>
          <h3 style={{ margin: 0 }}>Users & Account Management</h3>
          <p style={{ margin: '4px 0 0 0', color: 'var(--text-secondary)' }}>
            Manage platform members, assign specialized roles, and control access permissions.
          </p>
        </div>
      </div>

      {/* Form to Create Fitness Instructor */}
      <div style={{ background: 'rgba(16, 185, 129, 0.08)', border: '1px solid rgba(16, 185, 129, 0.25)', padding: '20px', borderRadius: '16px', marginBottom: '30px' }}>
        <h4 style={{ color: '#10b981', display: 'flex', alignItems: 'center', gap: '8px', margin: '0 0 8px 0' }}>
          <PlusCircle size={20} /> Create New Fitness Instructor Account
        </h4>
        <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', marginBottom: '16px' }}>
          Instructors receive the <strong>FitnessInstructor</strong> role to author workout routines, diet templates, and articles.
        </p>
        <form onSubmit={handleCreateInstructor} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px', alignItems: 'end' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '6px' }}>Instructor Full Name</label>
            <input 
              type="text" 
              placeholder="e.g. Coach Sarah Jenkins" 
              value={instructorForm.name} 
              onChange={e => setInstructorForm({ ...instructorForm, name: e.target.value })} 
              className="search-input"
              required
            />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '6px' }}>Email / Username</label>
            <input 
              type="email" 
              placeholder="sarah@gymsync.com" 
              value={instructorForm.email} 
              onChange={e => setInstructorForm({ ...instructorForm, email: e.target.value })} 
              className="search-input"
              required
            />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '6px' }}>Password</label>
            <input 
              type="password" 
              placeholder="Password" 
              value={instructorForm.password} 
              onChange={e => setInstructorForm({ ...instructorForm, password: e.target.value })} 
              className="search-input"
              required
            />
          </div>
          <button type="submit" className="btn btn-primary" disabled={isCreatingInstructor} style={{ background: '#10b981', borderColor: '#10b981', padding: '12px' }}>
            {isCreatingInstructor ? 'Creating...' : 'Create Account'}
          </button>
        </form>
      </div>

      {/* Filter and Search Bar */}
      <div style={{ display: 'flex', gap: '15px', flexWrap: 'wrap', marginBottom: '20px' }}>
        <div className="search-bar" style={{ flex: 1, minWidth: '220px' }}>
          <Search size={18} color="var(--text-secondary)" />
          <input 
            type="text" 
            placeholder="Search by name or email..." 
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

      {/* Registered Users List */}
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
                  No accounts matching your search criteria.
                </td>
              </tr>
            ) : (
              filteredUsers.map(u => (
                <tr key={u._id}>
                  <td><strong>{u.name}</strong></td>
                  <td>{u.email}</td>
                  <td>
                    <select
                      className="search-input"
                      style={{ padding: '4px 8px', fontSize: '0.85rem' }}
                      value={u.role}
                      onChange={(e) => handleUpdateRole(u._id, e.target.value)}
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
                  </td>
                  <td>
                    {u.isBanned ? (
                      <span className="status-pill rejected" style={{ color: '#ef4444' }}>Banned</span>
                    ) : (
                      <span className="status-pill approved" style={{ color: '#10b981' }}>Active</span>
                    )}
                  </td>
                  <td>
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
                        onClick={() => handleToggleBan(u)}
                      >
                        {u.isBanned ? 'Unban' : 'Ban'}
                      </button>
                      <button 
                        className="btn btn-outline btn-sm" 
                        style={{ color: '#ef4444', borderColor: '#ef4444' }} 
                        onClick={() => setDeletingUser(u)} 
                        title="Delete this user account"
                      >
                        <Trash2 size={14} /> Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))
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

      {/* Delete User Typed Confirmation Modal */}
      <ConfirmDialog
        isOpen={Boolean(deletingUser)}
        onClose={() => setDeletingUser(null)}
        onConfirm={handleConfirmDeleteUser}
        title={`Delete Account: ${deletingUser?.name}`}
        message={`Are you sure you want to permanently delete ${deletingUser?.name}'s account? This action cannot be reversed.`}
        confirmText="Permanently Delete Account"
        isDanger={true}
        typedConfirmation="DELETE"
        loading={isDeletingUser}
      />
    </div>
  );
};

export default UserManagement;
