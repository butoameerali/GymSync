import React, { useState, useEffect } from 'react';
import { Shield, Users, Building, ShoppingBag, AlertTriangle, CheckCircle, XCircle, Search, Filter, MessageSquare, Award, DollarSign, Send, Eye, FileText, PlusCircle, Trash2, Edit3 } from 'lucide-react';
import { toast } from 'react-toastify';
import SkeletonLoader from '../../components/common/SkeletonLoader';
import Modal from '../../components/common/Modal';
import './AdminDashboard.css';

const AdminDashboard = () => {
  const [activeTab, setActiveTab] = useState('overview'); 
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [complaints, setComplaints] = useState([]);
  const [pendingGyms, setPendingGyms] = useState([]);
  const [reportedPosts, setReportedPosts] = useState([]);
  const [pendingCashback, setPendingCashback] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  // Admin Role Identity
  const userName = localStorage.getItem('gymsync_user_name') || 'Admin Manager';
  const userRole = localStorage.getItem('gymsync_role') || 'Admin';
  const isSeniorAdmin = userRole === 'SuperAdmin' || userName.toLowerCase().includes('senior') || userName.toLowerCase() === 'admin manager';

  // Complaint Chat State
  const [selectedComplaint, setSelectedComplaint] = useState(null);
  const [chatInput, setChatInput] = useState('');
  const [inspectionComplaint, setInspectionComplaint] = useState(null);

  // Cashback Form State
  const [cashbackContent, setCashbackContent] = useState('');
  const [cashbackAmount, setCashbackAmount] = useState(15);

  // Store Product Form State
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [productForm, setProductForm] = useState({ name: '', category: 'Proteins', price: 29.99, stock: 50, image: '' });

  // Broadcast Form State
  const [broadcastTitle, setBroadcastTitle] = useState('');
  const [broadcastType, setBroadcastType] = useState('ExclusiveEvent');
  const [broadcastMessage, setBroadcastMessage] = useState('');

  // Pro Plan Price State
  const [proPriceInput, setProPriceInput] = useState(localStorage.getItem('gymsync_pro_plan_price') || '9.99');

  useEffect(() => {
    fetchAdminData();
  }, []);

  const fetchAdminData = async () => {
    setLoading(true);
    try {
      // 1. Stats
      const statsRes = await fetch('/api/admin/stats', { headers: { 'x-user-name': userName } });
      if (statsRes.ok) setStats(await statsRes.json());

      // 2. Users
      const usersRes = await fetch('/api/admin/users', { headers: { 'x-user-name': userName } });
      if (usersRes.ok) setUsers(await usersRes.json());

      // 3. Gym Approvals
      const gymsRes = await fetch('/api/admin/gyms/pending', { headers: { 'x-user-name': userName } });
      if (gymsRes.ok) setPendingGyms(await gymsRes.json());

      // 4. Reported Posts
      const postsRes = await fetch('/api/admin/posts/reported', { headers: { 'x-user-name': userName } });
      if (postsRes.ok) setReportedPosts(await postsRes.json());

      // 5. Complaints
      const complaintsRes = await fetch('/api/complaints', { headers: { 'x-user-name': userName } });
      if (complaintsRes.ok) setComplaints(await complaintsRes.json());

      // 6. Pending Cashback (Senior Admin)
      if (isSeniorAdmin) {
        const cashbackRes = await fetch('/api/admin/posts/pending-cashback', { headers: { 'x-user-name': userName } });
        if (cashbackRes.ok) setPendingCashback(await cashbackRes.json());

        const logsRes = await fetch('/api/admin/audit-logs', { headers: { 'x-user-name': userName } });
        if (logsRes.ok) setAuditLogs(await logsRes.json());
      }

      // 7. Store Products
      const productsRes = await fetch('/api/store/products');
      if (productsRes.ok) setProducts(await productsRes.json());

    } catch (err) {
      console.error('Error fetching admin data:', err);
    } finally {
      setLoading(false);
    }
  };

  // Gym Approval Handler
  const handleGymApproval = async (gymId, status) => {
    try {
      const res = await fetch(`/api/admin/gyms/${gymId}/approval`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'x-user-name': userName },
        body: JSON.stringify({ status })
      });
      if (res.ok) {
        toast.success(`Gym application ${status}`);
        setPendingGyms(prev => prev.filter(g => g._id !== gymId));
      }
    } catch (err) {
      toast.error('Failed to update gym status');
    }
  };

  // Reported Post Moderation Handler
  const handleModeratePost = async (postId, action) => {
    try {
      const res = await fetch(`/api/admin/posts/${postId}/moderate`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'x-user-name': userName },
        body: JSON.stringify({ action })
      });
      if (res.ok) {
        toast.info(`Post report action '${action}' completed`);
        setReportedPosts(prev => prev.filter(p => p._id !== postId));
      }
    } catch (err) {
      toast.error('Failed to moderate post');
    }
  };

  // Create Cashback Post Handler
  const handleCreateCashback = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/admin/posts/cashback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-user-name': userName },
        body: JSON.stringify({ content: cashbackContent, cashbackAmount, authorName: userName })
      });
      if (res.ok) {
        const post = await res.json();
        if (post.approvalStatus === 'pending_approval') {
          toast.info('Cashback post submitted! Sent to Senior Super Admin for final approval.');
        } else {
          toast.success('Cashback promotion published live!');
        }
        setCashbackContent('');
      }
    } catch (err) {
      toast.error('Error creating cashback post');
    }
  };

  // Senior Admin Review Cashback Handler
  const handleReviewCashback = async (postId, status) => {
    try {
      const res = await fetch(`/api/admin/posts/${postId}/review-cashback`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'x-user-name': userName },
        body: JSON.stringify({ status })
      });
      if (res.ok) {
        toast.success(`Cashback post ${status}`);
        setPendingCashback(prev => prev.filter(p => p._id !== postId));
      }
    } catch (err) {
      toast.error('Failed to review cashback post');
    }
  };

  // Send Complaint Chat Message
  const handleSendChatMessage = async (complaintId) => {
    if (!chatInput.trim()) return;
    try {
      const res = await fetch(`/api/admin/complaints/${complaintId}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-user-name': userName },
        body: JSON.stringify({ text: chatInput, senderName: userName, role: userRole })
      });
      if (res.ok) {
        setChatInput('');
        toast.success('Reply sent to complaint thread');
        fetchAdminData();
      }
    } catch (err) {
      toast.error('Failed to send message');
    }
  };

  // Add Product Handler (Store Management)
  const handleCreateProduct = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/store/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-user-name': userName },
        body: JSON.stringify({ ...productForm, createdBy: userName })
      });
      if (res.ok) {
        const newP = await res.json();
        setProducts(prev => [newP, ...prev]);
        setIsProductModalOpen(false);
        toast.success('Product created successfully');
      }
    } catch (err) {
      toast.error('Error creating product');
    }
  };

  // Send Broadcast Announcement Handler
  const handleSendBroadcast = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/admin/broadcast', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-user-name': userName },
        body: JSON.stringify({ title: broadcastTitle, message: broadcastMessage, eventType: broadcastType })
      });
      if (res.ok) {
        toast.success('📢 Broadcast announcement sent to all GymSync Subscribers!');
        setBroadcastTitle('');
        setBroadcastMessage('');
      }
    } catch (err) {
      toast.error('Failed to send broadcast');
    }
  };

  return (
    <div className="admin-dashboard-page">
      {/* Header Banner */}
      <div className="admin-header glass-panel">
        <div className="container header-content">
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div className="admin-badge-icon">
              <Shield size={32} color="#3b82f6" />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <h2 style={{ margin: 0 }}>GymSync Admin Control Center</h2>
                <span className={`tier-badge ${isSeniorAdmin ? 'senior' : 'junior'}`}>
                  {isSeniorAdmin ? 'Senior Super Admin (Highest Tier)' : 'Junior Admin'}
                </span>
              </div>
              <p style={{ margin: '4px 0 0 0', color: 'var(--text-secondary)' }}>
                Authenticated as: <strong>{userName}</strong> ({userRole})
              </p>
            </div>
          </div>
        </div>

        {/* Admin Navigation Tabs */}
        <div className="container" style={{ marginTop: '20px' }}>
          <div className="admin-tabs">
            <button className={`tab-btn ${activeTab === 'overview' ? 'active' : ''}`} onClick={() => setActiveTab('overview')}>
              Overview & Revenue
            </button>
            <button className={`tab-btn ${activeTab === 'gym_approvals' ? 'active' : ''}`} onClick={() => setActiveTab('gym_approvals')}>
              <Building size={16} /> Gym Approvals ({pendingGyms.length})
            </button>
            <button className={`tab-btn ${activeTab === 'reported_posts' ? 'active' : ''}`} onClick={() => setActiveTab('reported_posts')}>
              <AlertTriangle size={16} /> Reported Posts ({reportedPosts.length})
            </button>
            <button className={`tab-btn ${activeTab === 'cashback' ? 'active' : ''}`} onClick={() => setActiveTab('cashback')}>
              <Award size={16} /> Cashback Workflow {isSeniorAdmin && `(${pendingCashback.length})`}
            </button>
            <button className={`tab-btn ${activeTab === 'complaint_chats' ? 'active' : ''}`} onClick={() => setActiveTab('complaint_chats')}>
              <MessageSquare size={16} /> Complaint Chats
            </button>
            <button className={`tab-btn ${activeTab === 'store' ? 'active' : ''}`} onClick={() => setActiveTab('store')}>
              <ShoppingBag size={16} /> Store Inventory
            </button>
            <button className={`tab-btn ${activeTab === 'broadcast' ? 'active' : ''}`} onClick={() => setActiveTab('broadcast')}>
              <Send size={16} /> Broadcast Events
            </button>
            {isSeniorAdmin && (
              <button className={`tab-btn ${activeTab === 'audit_logs' ? 'active' : ''}`} onClick={() => setActiveTab('audit_logs')}>
                <FileText size={16} /> Audit Logs
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="container admin-content">
        {loading ? (
          <div style={{ padding: '40px 0' }}>
            <SkeletonLoader height="120px" borderRadius="16px" />
          </div>
        ) : (
          <>
            {/* OVERVIEW & REVENUE TAB */}
            {activeTab === 'overview' && (
              <div>
                <div className="stats-grid">
                  <div className="stat-card glass-panel">
                    <div className="stat-icon green"><DollarSign size={24} /></div>
                    <div>
                      <span className="stat-label">Total Platform Revenue</span>
                      <h3 className="stat-value">${stats?.totalRevenue || 12450}</h3>
                    </div>
                  </div>
                  <div className="stat-card glass-panel">
                    <div className="stat-icon blue"><Users size={24} /></div>
                    <div>
                      <span className="stat-label">Registered Users</span>
                      <h3 className="stat-value">{stats?.totalUsers || 120}</h3>
                    </div>
                  </div>
                  <div className="stat-card glass-panel">
                    <div className="stat-icon purple"><Building size={24} /></div>
                    <div>
                      <span className="stat-label">Approved Gym Facilities</span>
                      <h3 className="stat-value">{stats?.totalGyms || 18}</h3>
                    </div>
                  </div>
                  <div className="stat-card glass-panel">
                    <div className="stat-icon amber"><AlertTriangle size={24} /></div>
                    <div>
                      <span className="stat-label">Pending Complaints</span>
                      <h3 className="stat-value">{stats?.pendingComplaints || 2}</h3>
                    </div>
                  </div>
                </div>

                {/* Pro Plan Pricing Management Card */}
                <div className="glass-panel" style={{ padding: '24px', marginTop: '30px' }}>
                  <h3>Pro Plan Subscription Pricing Settings</h3>
                  <p style={{ color: 'var(--text-secondary)', marginBottom: '16px' }}>
                    Configure the monthly subscription price for the GymSync Pro Plan (Unlocks AI Trainer, AI Chat, and Diet Plans across the platform).
                  </p>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', maxWidth: '400px' }}>
                    <div style={{ position: 'relative', flex: 1 }}>
                      <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', fontWeight: 'bold', color: 'var(--primary-accent)' }}>$</span>
                      <input 
                        type="number" 
                        step="0.01"
                        className="search-input"
                        style={{ paddingLeft: '28px', fontWeight: 'bold' }}
                        value={proPriceInput}
                        onChange={e => setProPriceInput(e.target.value)}
                      />
                    </div>
                    <button 
                      className="btn btn-primary"
                      onClick={() => {
                        localStorage.setItem('gymsync_pro_plan_price', proPriceInput);
                        toast.success(`Pro Plan subscription price updated to $${proPriceInput}/month!`);
                      }}
                    >
                      Save Pro Price
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* GYM APPROVALS TAB */}
            {activeTab === 'gym_approvals' && (
              <div className="glass-panel" style={{ padding: '24px' }}>
                <h3>Pending Gym Owner Registrations & Applications</h3>
                <p style={{ color: 'var(--text-secondary)', marginBottom: '20px' }}>Review facilities applying for official GymSync Gym Owner status</p>
                {pendingGyms.length === 0 ? (
                  <p style={{ color: 'var(--text-secondary)' }}>No pending gym applications.</p>
                ) : (
                  <div className="table-responsive">
                    <table className="admin-table">
                      <thead>
                        <tr>
                          <th>Facility Name</th>
                          <th>Location</th>
                          <th>Owner Name & Email</th>
                          <th>Monthly Fee</th>
                          <th>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {pendingGyms.map(gym => (
                          <tr key={gym._id}>
                            <td><strong>{gym.name}</strong></td>
                            <td>{gym.location}</td>
                            <td>{gym.ownerName} ({gym.ownerEmail || 'owner@gymsync.com'})</td>
                            <td>${gym.monthlyFee}/mo</td>
                            <td>
                              <div style={{ display: 'flex', gap: '8px' }}>
                                <button className="btn btn-sm btn-primary" onClick={() => handleGymApproval(gym._id, 'Approved')}>
                                  <CheckCircle size={14} /> Approve
                                </button>
                                <button className="btn btn-sm btn-outline" style={{ borderColor: '#ef4444', color: '#ef4444' }} onClick={() => handleGymApproval(gym._id, 'Rejected')}>
                                  <XCircle size={14} /> Reject
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* REPORTED POSTS MODERATION TAB */}
            {activeTab === 'reported_posts' && (
              <div className="glass-panel" style={{ padding: '24px' }}>
                <h3>Community Post Moderation Queue</h3>
                <p style={{ color: 'var(--text-secondary)', marginBottom: '20px' }}>Review posts reported by community fitness users</p>
                {reportedPosts.length === 0 ? (
                  <p style={{ color: 'var(--text-secondary)' }}>No reported posts pending review.</p>
                ) : (
                  <div className="table-responsive">
                    <table className="admin-table">
                      <thead>
                        <tr>
                          <th>Author</th>
                          <th>Content Snippet</th>
                          <th>Report Count</th>
                          <th>Reported By</th>
                          <th>Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {reportedPosts.map(post => (
                          <tr key={post._id}>
                            <td><strong>{post.authorName}</strong></td>
                            <td style={{ maxWidth: '300px' }}>{post.content}</td>
                            <td><span className="status-pill pending">{post.reportCount || 1} Reports</span></td>
                            <td>{(post.reportedBy || []).join(', ') || 'Community Users'}</td>
                            <td>
                              <div style={{ display: 'flex', gap: '8px' }}>
                                <button className="btn btn-sm" style={{ background: '#ef4444', color: '#fff' }} onClick={() => handleModeratePost(post._id, 'delete')}>
                                  <Trash2 size={14} /> Delete Post
                                </button>
                                <button className="btn btn-sm btn-outline" onClick={() => handleModeratePost(post._id, 'dismiss')}>
                                  Dismiss Report
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* CASHBACK WORKFLOW TAB */}
            {activeTab === 'cashback' && (
              <div className="cashback-container">
                <div className="glass-panel" style={{ padding: '24px', marginBottom: '30px' }}>
                  <h3>Create Cashback / Promotional Post</h3>
                  <p style={{ color: 'var(--text-secondary)', marginBottom: '20px' }}>
                    {isSeniorAdmin ? 'Senior Admin posts publish live immediately.' : 'Junior Admin posts require Senior Super Admin final approval.'}
                  </p>
                  <form onSubmit={handleCreateCashback} style={{ display: 'flex', flexDirection: 'column', gap: '16px', maxWidth: '600px' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '6px' }}>Cashback Content / Announcement</label>
                      <textarea 
                        rows={3} 
                        required
                        className="search-input"
                        placeholder="e.g., Special Weekend Promotion: Get 15% cashback on all annual gym memberships!"
                        value={cashbackContent}
                        onChange={e => setCashbackContent(e.target.value)}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '6px' }}>Cashback Amount ($)</label>
                      <input 
                        type="number" 
                        required
                        className="search-input"
                        value={cashbackAmount}
                        onChange={e => setCashbackAmount(e.target.value)}
                      />
                    </div>
                    <button type="submit" className="btn btn-primary" style={{ width: 'fit-content' }}>
                      <PlusCircle size={16} /> Submit Cashback Post
                    </button>
                  </form>
                </div>

                {isSeniorAdmin && (
                  <div className="glass-panel" style={{ padding: '24px' }}>
                    <h3>Senior Super Admin Approval Queue (Cashback Posts)</h3>
                    <p style={{ color: 'var(--text-secondary)', marginBottom: '20px' }}>Final authorization for cashback posts created by Junior Admins</p>
                    {pendingCashback.length === 0 ? (
                      <p style={{ color: 'var(--text-secondary)' }}>No cashback posts pending approval.</p>
                    ) : (
                      <div className="table-responsive">
                        <table className="admin-table">
                          <thead>
                            <tr>
                              <th>Created By</th>
                              <th>Content</th>
                              <th>Cashback Amount</th>
                              <th>Status</th>
                              <th>Final Approval Action</th>
                            </tr>
                          </thead>
                          <tbody>
                            {pendingCashback.map(p => (
                              <tr key={p._id}>
                                <td><strong>{p.authorName}</strong></td>
                                <td>{p.content}</td>
                                <td>${p.cashbackAmount}</td>
                                <td><span className="status-pill pending">Pending Senior Approval</span></td>
                                <td>
                                  <div style={{ display: 'flex', gap: '8px' }}>
                                    <button className="btn btn-sm btn-primary" onClick={() => handleReviewCashback(p._id, 'approved')}>
                                      <CheckCircle size={14} /> Approve & Publish
                                    </button>
                                    <button className="btn btn-sm btn-outline" style={{ borderColor: '#ef4444', color: '#ef4444' }} onClick={() => handleReviewCashback(p._id, 'rejected')}>
                                      <XCircle size={14} /> Reject
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}

                    {/* Subscription Refund Cashback Requests */}
                    <div style={{ marginTop: '30px', paddingTop: '20px', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
                      <h3>Subscription Refund Cashback Approvals</h3>
                      <p style={{ color: 'var(--text-secondary)', marginBottom: '16px' }}>
                        Review refund requests submitted via complaint tickets by Junior Admins
                      </p>
                      {complaints.filter(c => c.cashbackApprovalStatus === 'pending_higher_admin').length === 0 ? (
                        <p style={{ color: 'var(--text-secondary)' }}>No subscription refund cashback requests pending approval.</p>
                      ) : (
                        <div className="table-responsive">
                          <table className="admin-table">
                            <thead>
                              <tr>
                                <th>Ticket ID</th>
                                <th>User Name</th>
                                <th>Reason / Description</th>
                                <th>Refund Amount</th>
                                <th>Action</th>
                              </tr>
                            </thead>
                            <tbody>
                              {complaints.filter(c => c.cashbackApprovalStatus === 'pending_higher_admin').map(c => (
                                <tr key={c._id}>
                                  <td><strong>{c.complaintId}</strong></td>
                                  <td>{c.reporterName}</td>
                                  <td>{c.description}</td>
                                  <td>${c.refundAmount || 29.99}</td>
                                  <td>
                                    <button 
                                      className="btn btn-sm btn-primary"
                                      onClick={async () => {
                                        try {
                                          const res = await fetch(`/api/admin/complaints/${c._id}/approve-refund`, {
                                            method: 'PUT',
                                            headers: { 'Content-Type': 'application/json', 'x-user-name': userName }
                                          });
                                          if (res.ok) {
                                            toast.success('Refund Cashback Approved! User notified: "Your refund will be given shortly."');
                                            fetchAdminData();
                                          }
                                        } catch (err) {
                                          toast.error('Failed to approve refund');
                                        }
                                      }}
                                    >
                                      <CheckCircle size={14} /> Approve Refund Cashback
                                    </button>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* COMPLAINT CHATS & INSPECTION TAB */}
            {activeTab === 'complaint_chats' && (
              <div className="glass-panel" style={{ padding: '24px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                  <div>
                    <h3>Complaint Resolution Chat Interface</h3>
                    <p style={{ color: 'var(--text-secondary)' }}>Handle user tickets and engage in direct resolution chat</p>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px' }}>
                  {complaints.map(c => (
                    <div key={c._id} className="glass-panel" style={{ padding: '16px', background: 'rgba(255,255,255,0.02)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                        <strong>{c.complaintId}</strong>
                        <span className="status-pill pending">{c.status}</span>
                      </div>
                      <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                        <strong>Reporter:</strong> {c.reporterName} | <strong>Assigned:</strong> {c.assignedAdminName || 'Unassigned'}
                      </p>
                      <p style={{ fontSize: '0.85rem', margin: '8px 0' }}>{c.description}</p>
                      
                      <button className="btn btn-outline btn-sm" onClick={() => setSelectedComplaint(c)} style={{ marginTop: '8px', width: '100%' }}>
                        <MessageSquare size={14} /> Open Live Chat Thread
                      </button>

                      {isSeniorAdmin && (
                        <button className="btn btn-outline btn-sm" onClick={() => setInspectionComplaint(c)} style={{ marginTop: '6px', width: '100%', color: '#8b5cf6', borderColor: '#8b5cf6' }}>
                          <Eye size={14} /> Inspect Junior Admin Chat Log
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* STORE MANAGEMENT TAB */}
            {activeTab === 'store' && (
              <div className="glass-panel" style={{ padding: '24px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                  <div>
                    <h3>E-Commerce & Store Inventory Control</h3>
                    <p style={{ color: 'var(--text-secondary)' }}>All 3 Admins can manage products, prices, and stock quantities</p>
                  </div>
                  <button className="btn btn-primary btn-sm" onClick={() => setIsProductModalOpen(true)}>
                    <PlusCircle size={16} /> Add New Product
                  </button>
                </div>

                <div className="table-responsive">
                  <table className="admin-table">
                    <thead>
                      <tr>
                        <th>Product Name</th>
                        <th>Category</th>
                        <th>Price ($)</th>
                        <th>Stock Quantity</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {products.map(p => (
                        <tr key={p._id || p.id}>
                          <td><strong>{p.name}</strong></td>
                          <td>{p.category}</td>
                          <td>${p.price?.toFixed(2)}</td>
                          <td>{p.stock || 50} units</td>
                          <td><span className="status-pill active">{p.status || 'Approved'}</span></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* SUBSCRIBER EVENT BROADCAST TAB */}
            {activeTab === 'broadcast' && (
              <div className="glass-panel" style={{ padding: '24px' }}>
                <h3>Event Broadcast System (All Subscribers)</h3>
                <p style={{ color: 'var(--text-secondary)', marginBottom: '20px' }}>
                  Send instant broadcast announcements to all GymSync Subscribers about exclusive events, free gifts, and special announcements.
                </p>
                <form onSubmit={handleSendBroadcast} style={{ display: 'flex', flexDirection: 'column', gap: '16px', maxWidth: '600px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '6px', fontWeight: 600 }}>Broadcast Event Title</label>
                    <input 
                      type="text" 
                      required 
                      className="search-input" 
                      placeholder="e.g., VIP Subscriber Meetup & Free Protein Shaker Giveaway!"
                      value={broadcastTitle}
                      onChange={e => setBroadcastTitle(e.target.value)}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '6px', fontWeight: 600 }}>Event Category</label>
                    <select className="search-input" value={broadcastType} onChange={e => setBroadcastType(e.target.value)}>
                      <option value="ExclusiveEvent">Exclusive Subscriber Event</option>
                      <option value="FreeGift">Free Gift Opportunity</option>
                      <option value="SubscriberSpecial">Subscriber Special Announcement</option>
                    </select>
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '6px', fontWeight: 600 }}>Message Content</label>
                    <textarea 
                      rows={4} 
                      required 
                      className="search-input" 
                      placeholder="Enter event description, time, and instructions for subscribers..."
                      value={broadcastMessage}
                      onChange={e => setBroadcastMessage(e.target.value)}
                    />
                  </div>
                  <button type="submit" className="btn btn-primary" style={{ width: 'fit-content', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Send size={16} /> Send Broadcast to All Subscribers
                  </button>
                </form>
              </div>
            )}

            {/* AUDIT LOGS TAB (SENIOR SUPER ADMIN ONLY) */}
            {activeTab === 'audit_logs' && isSeniorAdmin && (
              <div className="glass-panel" style={{ padding: '24px' }}>
                <h3>Senior Super Admin System Audit Log</h3>
                <p style={{ color: 'var(--text-secondary)', marginBottom: '20px' }}>Monitor actions performed across the system by Junior Admins and staff</p>
                <div className="table-responsive">
                  <table className="admin-table">
                    <thead>
                      <tr>
                        <th>Timestamp</th>
                        <th>User & Role</th>
                        <th>Action</th>
                        <th>Target</th>
                        <th>Details</th>
                      </tr>
                    </thead>
                    <tbody>
                      {auditLogs.map(log => (
                        <tr key={log._id}>
                          <td style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                            {new Date(log.timestamp).toLocaleString()}
                          </td>
                          <td><strong>{log.user}</strong> ({log.role})</td>
                          <td><span className="status-pill pending">{log.action}</span></td>
                          <td>{log.targetEntity}</td>
                          <td style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{log.details}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Complaint Chat Thread Modal */}
      <Modal isOpen={Boolean(selectedComplaint)} onClose={() => setSelectedComplaint(null)} title={`Complaint Thread #${selectedComplaint?.complaintId}`}>
        <div>
          <div style={{ maxHeight: '250px', overflowY: 'auto', background: 'rgba(0,0,0,0.3)', padding: '12px', borderRadius: '8px', marginBottom: '16px' }}>
            {(selectedComplaint?.chatMessages || []).length === 0 ? (
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>No messages yet. Start conversation below.</p>
            ) : (
              selectedComplaint?.chatMessages?.map((msg, i) => (
                <div key={i} style={{ marginBottom: '10px', textAlign: msg.senderName === userName ? 'right' : 'left' }}>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{msg.senderName} ({msg.role})</span>
                  <div style={{ background: msg.senderName === userName ? '#3b82f6' : 'rgba(255,255,255,0.1)', padding: '8px 12px', borderRadius: '8px', display: 'inline-block', marginTop: '2px' }}>
                    {msg.text}
                  </div>
                </div>
              ))
            )}
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <input 
              type="text" 
              className="search-input" 
              placeholder="Type message to user..."
              value={chatInput}
              onChange={e => setChatInput(e.target.value)}
            />
            <button className="btn btn-primary" onClick={() => handleSendChatMessage(selectedComplaint?._id)}>
              <Send size={16} /> Send
            </button>
          </div>

          <button 
            className="btn btn-outline btn-sm" 
            style={{ marginTop: '12px', width: '100%', color: '#f59e0b', borderColor: '#f59e0b', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
            onClick={async () => {
              try {
                const res = await fetch(`/api/admin/complaints/${selectedComplaint._id}/request-refund`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json', 'x-user-name': userName },
                  body: JSON.stringify({ refundAmount: 29.99 })
                });
                if (res.ok) {
                  toast.info('Subscription refund cashback request sent to Higher Admin for approval!');
                  setSelectedComplaint(null);
                  fetchAdminData();
                }
              } catch (e) {
                toast.error('Failed to submit refund request');
              }
            }}
          >
            <Award size={14} /> Request Subscription Refund Cashback Approval ($29.99)
          </button>
        </div>
      </Modal>

      {/* Senior Super Admin Inspection Modal */}
      <Modal isOpen={Boolean(inspectionComplaint)} onClose={() => setInspectionComplaint(null)} title={`Senior Admin Audit Inspection #${inspectionComplaint?.complaintId}`}>
        <div>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
            Handled by Junior Admin: <strong>{inspectionComplaint?.assignedAdminName || 'Junior Admin'}</strong>
          </p>
          <div style={{ maxHeight: '300px', overflowY: 'auto', background: 'rgba(0,0,0,0.4)', padding: '16px', borderRadius: '10px' }}>
            {(inspectionComplaint?.chatMessages || []).map((m, i) => (
              <div key={i} style={{ marginBottom: '8px', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '6px' }}>
                <strong style={{ color: m.role?.includes('Admin') ? '#3b82f6' : '#fff' }}>{m.senderName} ({m.role}):</strong> {m.text}
              </div>
            ))}
          </div>
        </div>
      </Modal>

      {/* Product Creation Modal */}
      <Modal isOpen={isProductModalOpen} onClose={() => setIsProductModalOpen(false)} title="Add Store Inventory Product">
        <form onSubmit={handleCreateProduct} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '4px' }}>Product Name</label>
            <input type="text" required className="search-input" value={productForm.name} onChange={e => setProductForm({ ...productForm, name: e.target.value })} />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '4px' }}>Category</label>
            <select className="search-input" value={productForm.category} onChange={e => setProductForm({ ...productForm, category: e.target.value })}>
              <option value="Proteins">Proteins</option>
              <option value="Supplements">Supplements</option>
              <option value="Gym Wear">Gym Wear</option>
              <option value="Accessories">Accessories</option>
              <option value="Equipment">Equipment</option>
            </select>
          </div>
          <div style={{ display: 'flex', gap: '12px' }}>
            <div style={{ flex: 1 }}>
              <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '4px' }}>Price ($)</label>
              <input type="number" step="0.01" required className="search-input" value={productForm.price} onChange={e => setProductForm({ ...productForm, price: e.target.value })} />
            </div>
            <div style={{ flex: 1 }}>
              <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '4px' }}>Stock Quantity</label>
              <input type="number" required className="search-input" value={productForm.stock} onChange={e => setProductForm({ ...productForm, stock: e.target.value })} />
            </div>
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '4px' }}>Product Image URL</label>
            <input type="url" required placeholder="https://..." className="search-input" value={productForm.image} onChange={e => setProductForm({ ...productForm, image: e.target.value })} />
          </div>
          <button type="submit" className="btn btn-primary" style={{ marginTop: '10px' }}>
            Save Product to Store Inventory
          </button>
        </form>
      </Modal>
    </div>
  );
};

export default AdminDashboard;
