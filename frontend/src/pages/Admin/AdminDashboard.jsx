import React, { useState, useEffect } from 'react';
import { Shield, Users, Building, ShoppingBag, AlertTriangle, CheckCircle, XCircle, Search, Filter, MessageSquare, Award } from 'lucide-react';
import { toast } from 'react-toastify';
import SkeletonLoader from '../../components/common/SkeletonLoader';
import Modal from '../../components/common/Modal';
import './AdminDashboard.css';

const AdminDashboard = () => {
  const [activeTab, setActiveTab] = useState('overview'); // 'overview', 'users', 'complaints', 'gyms'
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Complaint modal state
  const [selectedComplaint, setSelectedComplaint] = useState(null);
  const [moderatorReply, setModeratorReply] = useState('');

  useEffect(() => {
    fetchAdminData();
  }, []);

  const fetchAdminData = async () => {
    setLoading(true);
    try {
      // Fetch admin metrics
      const statsRes = await fetch('/api/admin/stats');
      if (statsRes.ok) {
        const statsData = await statsRes.json();
        setStats(statsData);
      }

      // Fetch users list
      const usersRes = await fetch('/api/admin/users');
      if (usersRes.ok) {
        const usersData = await usersRes.json();
        setUsers(usersData);
      }

      // Fetch complaints
      const complaintsRes = await fetch('/api/complaints');
      if (complaintsRes.ok) {
        const complaintsData = await complaintsRes.json();
        setComplaints(complaintsData);
      }
    } catch (err) {
      console.error('Error loading admin data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleRoleChange = async (userId, newRole) => {
    try {
      const res = await fetch(`/api/admin/users/${userId}/role`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: newRole })
      });

      if (res.ok) {
        toast.success(`User role successfully changed to ${newRole}`);
        setUsers(prev => prev.map(u => u._id === userId ? { ...u, role: newRole } : u));
      } else {
        toast.error('Failed to update user role');
      }
    } catch (err) {
      toast.error('Server error updating role');
    }
  };

  const handleBanToggle = async (userId, currentBanStatus) => {
    try {
      const res = await fetch(`/api/admin/users/${userId}/ban`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isBanned: !currentBanStatus, banReason: 'Policy violation' })
      });

      if (res.ok) {
        toast.info(`User status updated: ${!currentBanStatus ? 'Banned' : 'Active'}`);
        setUsers(prev => prev.map(u => u._id === userId ? { ...u, isBanned: !currentBanStatus } : u));
      }
    } catch (err) {
      toast.error('Failed to update ban status');
    }
  };

  const handleResolveComplaint = async (status) => {
    if (!selectedComplaint) return;
    try {
      const res = await fetch(`/api/complaints/${selectedComplaint._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          status, 
          adminReply: moderatorReply,
          moderatorName: 'Admin Moderator'
        })
      });

      if (res.ok) {
        toast.success(`Complaint status set to ${status}`);
        setComplaints(prev => prev.map(c => c._id === selectedComplaint._id ? { ...c, status, adminReply: moderatorReply } : c));
        setSelectedComplaint(null);
        setModeratorReply('');
      }
    } catch (err) {
      toast.error('Error resolving complaint');
    }
  };

  const filteredUsers = users.filter(u => 
    u.name?.toLowerCase().includes(searchTerm.toLowerCase()) || 
    u.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="admin-page">
      {/* Header */}
      <div className="admin-header glass-panel">
        <div className="container header-flex">
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div className="admin-badge-icon">
              <Shield size={28} color="#3b82f6" />
            </div>
            <div>
              <h2>GymSync Control Center</h2>
              <p>Platform Operations, RBAC Management & Community Governance</p>
            </div>
          </div>

          <div className="admin-nav-tabs">
            <button 
              className={`tab-btn ${activeTab === 'overview' ? 'active' : ''}`}
              onClick={() => setActiveTab('overview')}
            >
              Overview
            </button>
            <button 
              className={`tab-btn ${activeTab === 'users' ? 'active' : ''}`}
              onClick={() => setActiveTab('users')}
            >
              <Users size={16} /> Users & Roles
            </button>
            <button 
              className={`tab-btn ${activeTab === 'complaints' ? 'active' : ''}`}
              onClick={() => setActiveTab('complaints')}
            >
              <AlertTriangle size={16} /> Complaints Queue ({complaints.filter(c => c.status === 'Pending').length})
            </button>
          </div>
        </div>
      </div>

      <div className="container admin-content">
        {loading ? (
          <div style={{ padding: '40px 0' }}>
            <SkeletonLoader height="120px" borderRadius="16px" />
            <div style={{ marginTop: '20px' }}>
              <SkeletonLoader height="300px" borderRadius="16px" />
            </div>
          </div>
        ) : (
          <>
            {/* OVERVIEW TAB */}
            {activeTab === 'overview' && (
              <div className="overview-container">
                <div className="stats-grid">
                  <div className="stat-card glass-panel">
                    <div className="stat-icon blue"><Users size={24} /></div>
                    <div>
                      <span className="stat-label">Fitness Users</span>
                      <h3 className="stat-value">{stats?.totalUsers || 0}</h3>
                    </div>
                  </div>

                  <div className="stat-card glass-panel">
                    <div className="stat-icon purple"><Building size={24} /></div>
                    <div>
                      <span className="stat-label">Gym Owners</span>
                      <h3 className="stat-value">{stats?.totalGymOwners || 0}</h3>
                    </div>
                  </div>

                  <div className="stat-card glass-panel">
                    <div className="stat-icon amber"><Award size={24} /></div>
                    <div>
                      <span className="stat-label">Store Managers</span>
                      <h3 className="stat-value">{stats?.totalStoreManagers || 0}</h3>
                    </div>
                  </div>

                  <div className="stat-card glass-panel">
                    <div className="stat-icon red"><AlertTriangle size={24} /></div>
                    <div>
                      <span className="stat-label">Pending Complaints</span>
                      <h3 className="stat-value">{stats?.pendingComplaints || 0}</h3>
                    </div>
                  </div>
                </div>

                <div className="admin-summary-panels" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '24px', marginTop: '30px' }}>
                  <div className="glass-panel" style={{ padding: '24px' }}>
                    <h3>Internal RBAC Staff Roles</h3>
                    <p style={{ color: 'var(--text-secondary)', marginBottom: '16px' }}>Manage delegated platform permissions</p>
                    <div className="role-pills-list" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      <div className="role-pill-item">
                        <strong>Store Manager</strong>: Can manage store items, stock, and approve product orders.
                      </div>
                      <div className="role-pill-item">
                        <strong>Complaint Moderator</strong>: Can review reported content, issue warnings, and ban users.
                      </div>
                    </div>
                  </div>

                  <div className="glass-panel" style={{ padding: '24px' }}>
                    <h3>Recent System Activity</h3>
                    <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '16px' }}>
                      <li style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>• System check: All API microservices operational.</li>
                      <li style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>• Security: Password encryption & JWT RBAC active.</li>
                      <li style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>• Database: Connected to MongoDB Atlas cluster.</li>
                    </ul>
                  </div>
                </div>
              </div>
            )}

            {/* USERS & ROLES TAB */}
            {activeTab === 'users' && (
              <div className="glass-panel" style={{ padding: '24px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                  <h3>User Accounts & Role Assignment</h3>
                  <div className="search-input-wrapper" style={{ width: '300px' }}>
                    <Search size={18} className="search-icon" />
                    <input 
                      type="text" 
                      placeholder="Search users..." 
                      className="search-input"
                      value={searchTerm}
                      onChange={e => setSearchTerm(e.target.value)}
                    />
                  </div>
                </div>

                <div className="table-responsive">
                  <table className="admin-table">
                    <thead>
                      <tr>
                        <th>User</th>
                        <th>Email</th>
                        <th>Current Role</th>
                        <th>Assign Role (RBAC)</th>
                        <th>Status</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredUsers.map(user => (
                        <tr key={user._id}>
                          <td>
                            <div style={{ fontWeight: 600 }}>{user.name}</div>
                          </td>
                          <td style={{ color: 'var(--text-secondary)' }}>{user.email}</td>
                          <td>
                            <span className={`role-badge ${user.role?.toLowerCase()}`}>
                              {user.role}
                            </span>
                          </td>
                          <td>
                            <select 
                              className="role-select"
                              value={user.role}
                              onChange={(e) => handleRoleChange(user._id, e.target.value)}
                            >
                              <option value="User">Fitness User</option>
                              <option value="GymOwner">Gym Owner</option>
                              <option value="StoreManager">Store Manager</option>
                              <option value="ComplaintModerator">Complaint Moderator</option>
                              <option value="Admin">Admin</option>
                            </select>
                          </td>
                          <td>
                            {user.isBanned ? (
                              <span style={{ color: '#ef4444', fontWeight: 600 }}>Banned</span>
                            ) : (
                              <span style={{ color: '#10b981', fontWeight: 600 }}>Active</span>
                            )}
                          </td>
                          <td>
                            <button 
                              className={`btn btn-sm ${user.isBanned ? 'btn-outline' : 'btn-danger'}`}
                              onClick={() => handleBanToggle(user._id, user.isBanned)}
                            >
                              {user.isBanned ? 'Unban' : 'Ban User'}
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* COMPLAINTS TAB */}
            {activeTab === 'complaints' && (
              <div className="glass-panel" style={{ padding: '24px' }}>
                <h3>Community & Entity Reports Queue</h3>
                <p style={{ color: 'var(--text-secondary)', marginBottom: '20px' }}>Review reported users, posts, gyms, or products</p>

                {complaints.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '40px' }}>
                    <CheckCircle size={48} color="#10b981" style={{ marginBottom: '12px' }} />
                    <p style={{ color: 'var(--text-secondary)' }}>No active complaints reported!</p>
                  </div>
                ) : (
                  <div className="table-responsive">
                    <table className="admin-table">
                      <thead>
                        <tr>
                          <th>Complaint ID</th>
                          <th>Reporter</th>
                          <th>Reported Entity</th>
                          <th>Reason</th>
                          <th>Status</th>
                          <th>Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {complaints.map(complaint => (
                          <tr key={complaint._id}>
                            <td><strong>{complaint.complaintId}</strong></td>
                            <td>{complaint.reporterName}</td>
                            <td>
                              <span className="entity-tag">{complaint.reportedEntityType}</span> ({complaint.reportedEntityTitle || complaint.reportedEntityId})
                            </td>
                            <td style={{ color: 'var(--text-secondary)' }}>{complaint.reason}</td>
                            <td>
                              <span className={`status-pill ${complaint.status?.toLowerCase()}`}>
                                {complaint.status}
                              </span>
                            </td>
                            <td>
                              <button 
                                className="btn btn-primary btn-sm"
                                onClick={() => {
                                  setSelectedComplaint(complaint);
                                  setModeratorReply(complaint.adminReply || '');
                                }}
                              >
                                Review Report
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>

      {/* Complaint Review Modal */}
      {selectedComplaint && (
        <Modal 
          isOpen={Boolean(selectedComplaint)} 
          onClose={() => setSelectedComplaint(null)}
          title={`Review Complaint: ${selectedComplaint.complaintId}`}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Reported Entity:</span>
              <h4 style={{ margin: '4px 0' }}>{selectedComplaint.reportedEntityType} ({selectedComplaint.reportedEntityTitle})</h4>
            </div>

            <div>
              <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Reason & Description:</span>
              <p style={{ background: 'rgba(255,255,255,0.05)', padding: '12px', borderRadius: '8px', marginTop: '4px' }}>
                <strong>{selectedComplaint.reason}:</strong> {selectedComplaint.description}
              </p>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '6px' }}>
                Moderator Response / Decision Note:
              </label>
              <textarea 
                rows={3} 
                className="search-input"
                style={{ width: '100%', resize: 'none' }}
                placeholder="Explain resolution action..."
                value={moderatorReply}
                onChange={e => setModeratorReply(e.target.value)}
              />
            </div>

            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '10px' }}>
              <button 
                className="btn btn-outline" 
                onClick={() => handleResolveComplaint('Dismissed')}
              >
                Dismiss Complaint
              </button>
              <button 
                className="btn btn-primary" 
                onClick={() => handleResolveComplaint('Resolved')}
              >
                Resolve & Close
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default AdminDashboard;
