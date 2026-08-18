import React, { useState, useEffect } from 'react';
import { Shield, Users, Building, ShoppingBag, AlertTriangle, CheckCircle, XCircle, Search, Filter, MessageSquare, Award, DollarSign, Send, Eye, FileText, PlusCircle, Trash2, Edit3, Dumbbell } from 'lucide-react';
import { toast } from 'react-toastify';
import SkeletonLoader from '../../components/common/SkeletonLoader';
import Modal from '../../components/common/Modal';
import DashboardShell from '../../components/layout/DashboardShell';
import StatCard from '../../components/ui/StatCard';
import { REGISTERED_DETECTORS } from '../../ai-detectors/registry.js';
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
  const userName = localStorage.getItem('gymsync_user_name') || 'Admin';
  const userRole = localStorage.getItem('gymsync_role') || 'Admin';
  const isSeniorAdmin = userRole === 'SuperAdmin' || userName.toLowerCase().includes('senior') || userName.toLowerCase() === 'admin manager';
  const isJuniorAdmin = userRole === 'Admin' && !isSeniorAdmin;

  // Complaint Chat State
  const [selectedComplaint, setSelectedComplaint] = useState(null);
  const [chatInput, setChatInput] = useState('');
  const [inspectionComplaint, setInspectionComplaint] = useState(null);

  // View Post Modal State
  const [viewPostModalData, setViewPostModalData] = useState(null);

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

  // Fitness Instructor Creation State
  const [instructorForm, setInstructorForm] = useState({ name: '', email: '', password: '' });
  const [isCreatingInstructor, setIsCreatingInstructor] = useState(false);

  const handleEditUser = async (account) => {
    const name = window.prompt('User name', account.name);
    if (name === null) return;
    const email = window.prompt('Email address', account.email);
    if (email === null) return;
    try {
      const res = await fetch(`/api/admin/users/${account._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('gymsync_token') || ''}` },
        body: JSON.stringify({ name, email })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      toast.success('User details updated');
      fetchAdminData();
    } catch (error) { toast.error(error.message || 'Could not update user'); }
  };

  const handleDeleteUser = async (account) => {
    if (!window.confirm(`Delete ${account.name}'s account? This cannot be undone.`)) return;
    try {
      const res = await fetch(`/api/admin/users/${account._id}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${localStorage.getItem('gymsync_token') || ''}` } });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      toast.success('User account deleted');
      fetchAdminData();
    } catch (error) { toast.error(error.message || 'Could not delete user'); }
  };

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
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('gymsync_token') || ''}` },
        body: JSON.stringify(instructorForm)
      });
      const data = await res.json();
      if (res.ok) {
        toast.success(`Fitness Instructor '${instructorForm.name}' created successfully! Account role set to FitnessInstructor.`);
        setInstructorForm({ name: '', email: '', password: '' });
        fetchAdminData();
      } else {
        toast.error(data.message || 'Failed to create instructor');
      }
    } catch (err) {
      toast.error('Error creating instructor account');
    } finally {
      setIsCreatingInstructor(false);
    }
  };

  // Pro Plan Price State
  const [proPriceInput, setProPriceInput] = useState(localStorage.getItem('gymsync_pro_plan_price') || '9.99');

  // Payment Config / Approval State
  const [paymentConfigs, setPaymentConfigs] = useState([]);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState('Easypaisa');
  const [configNumber, setConfigNumber] = useState('03272450136');
  const [configDetails, setConfigDetails] = useState('Easypaisa Account - GymSync Payments');
  const [configNotes, setConfigNotes] = useState('Send screenshot after payment transfer.');
  const [pendingPayments, setPendingPayments] = useState([]);

  // Exercise & Plan Management State
  const [dbExercises, setDbExercises] = useState([]);
  const [dbPlans, setDbPlans] = useState([]);
  const [exerciseSearch, setExerciseSearch] = useState('');
  const [editingExercise, setEditingExercise] = useState(null);
  const [isExerciseModalOpen, setIsExerciseModalOpen] = useState(false);
  const [exerciseForm, setExerciseForm] = useState({ name: '', targetMuscles: 'Chest, Shoulders', equipmentRequired: 'Dumbbells', difficulty: 'Beginner', mediaUrl: '', description: '', aiEnabled: false, detectorId: 'pushup_v1' });
  
  const [isPlanModalOpen, setIsPlanModalOpen] = useState(false);
  const [planForm, setPlanForm] = useState({ title: '', type: 'Exercise', category: 'Full Body', description: '' });

  useEffect(() => {
    fetchAdminData();
    fetchExerciseAndPlanData();
  }, []);

  const fetchExerciseAndPlanData = async () => {
    try {
      const exRes = await fetch('/api/exercises');
      if (exRes.ok) setDbExercises(await exRes.json());

      const planRes = await fetch('/api/plans/premade');
      if (planRes.ok) setDbPlans(await planRes.json());
    } catch (err) {
      console.error('Failed to fetch exercise and plan data:', err);
    }
  };

  const fetchAdminData = async () => {
    setLoading(true);
    try {
      // 1. Stats
      const statsRes = await fetch('/api/admin/stats', { headers: { 'Authorization': `Bearer ${localStorage.getItem('gymsync_token') || ''}` } });
      if (statsRes.ok) setStats(await statsRes.json());

      // 2. Users
      const usersRes = await fetch('/api/admin/users', { headers: { 'Authorization': `Bearer ${localStorage.getItem('gymsync_token') || ''}` } });
      if (usersRes.ok) setUsers(await usersRes.json());

      // 3. Gym Approvals
      const gymsRes = await fetch('/api/admin/gyms/pending', { headers: { 'Authorization': `Bearer ${localStorage.getItem('gymsync_token') || ''}` } });
      if (gymsRes.ok) setPendingGyms(await gymsRes.json());

      // 4. Reported Posts
      const postsRes = await fetch('/api/admin/posts/reported', { headers: { 'Authorization': `Bearer ${localStorage.getItem('gymsync_token') || ''}` } });
      if (postsRes.ok) setReportedPosts(await postsRes.json());

      // 5. Complaints
      const complaintsRes = await fetch('/api/complaints', { headers: { 'Authorization': `Bearer ${localStorage.getItem('gymsync_token') || ''}` } });
      if (complaintsRes.ok) setComplaints(await complaintsRes.json());

      // 6. Pending Cashback (Senior Admin)
      if (isSeniorAdmin) {
        const cashbackRes = await fetch('/api/admin/posts/pending-cashback', { headers: { 'Authorization': `Bearer ${localStorage.getItem('gymsync_token') || ''}` } });
        if (cashbackRes.ok) setPendingCashback(await cashbackRes.json());

        const logsRes = await fetch('/api/admin/audit-logs', { headers: { 'Authorization': `Bearer ${localStorage.getItem('gymsync_token') || ''}` } });
        if (logsRes.ok) setAuditLogs(await logsRes.json());
      }

      // 7. Store Products
      const productsRes = await fetch('/api/store/products');
      if (productsRes.ok) setProducts(await productsRes.json());

      if (isSeniorAdmin) {
        const configRes = await fetch('/api/payments/config', { headers: { 'Authorization': `Bearer ${localStorage.getItem('gymsync_token') || ''}` } });
        if (configRes.ok) {
          const configs = await configRes.json();
          setPaymentConfigs(configs);
          const defaultConfig = configs.find(c => c.method === selectedPaymentMethod) || configs[0];
          if (defaultConfig) {
            setConfigNumber(defaultConfig.accountNumber || '03272450136');
            setConfigDetails(defaultConfig.bankDetails || `${defaultConfig.method} Account`);
            setConfigNotes(defaultConfig.notes || 'Send screenshot after payment transfer.');
          }
        }
      }

      if (userRole === 'Admin' || userRole === 'SuperAdmin') {
        const pendingRes = await fetch('/api/payments/pending', { headers: { 'Authorization': `Bearer ${localStorage.getItem('gymsync_token') || ''}` } });
        if (pendingRes.ok) setPendingPayments(await pendingRes.json());
      }

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
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('gymsync_token') || ''}` },
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
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('gymsync_token') || ''}` },
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
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('gymsync_token') || ''}` },
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

  const handleSavePaymentConfig = async () => {
    try {
      const res = await fetch(`/api/payments/config/${selectedPaymentMethod}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('gymsync_token') || ''}` },
        body: JSON.stringify({ accountNumber: configNumber, bankDetails: configDetails, notes: configNotes })
      });
      if (res.ok) {
        const updated = await res.json();
        setPaymentConfigs(prev => prev.map(cfg => cfg.method === updated.method ? updated : cfg));
        toast.success(`${updated.method} payment instructions updated successfully`);
      }
    } catch (err) {
      toast.error('Failed to save payment configuration');
    }
  };

  const handleApprovePayment = async (paymentId) => {
    try {
      const res = await fetch(`/api/payments/${paymentId}/approve`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('gymsync_token') || ''}` }
      });
      if (res.ok) {
        toast.success('Payment approved successfully');
        setPendingPayments(prev => prev.filter(payment => payment._id !== paymentId));
      }
    } catch (err) {
      toast.error('Failed to approve payment');
    }
  };

  const handleSelectPaymentMethod = (method) => {
    setSelectedPaymentMethod(method);
    const config = paymentConfigs.find(c => c.method === method);
    if (config) {
      setConfigNumber(config.accountNumber || '03272450136');
      setConfigDetails(config.bankDetails || `${config.method} Account`);
      setConfigNotes(config.notes || 'Send screenshot after payment transfer.');
    }
  };

  // Senior Admin Review Cashback Handler
  const handleReviewCashback = async (postId, status) => {
    try {
      const res = await fetch(`/api/admin/posts/${postId}/review-cashback`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('gymsync_token') || ''}` },
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
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('gymsync_token') || ''}` },
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

  // Complaint Status Update Handler
  const handleComplaintStatus = async (complaintId, status) => {
    try {
      const res = await fetch(`/api/complaints/${complaintId}`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json', 
          'Authorization': `Bearer ${localStorage.getItem('gymsync_token') || ''}`
        },
        body: JSON.stringify({ status })
      });
      if (res.ok) {
        toast.success(`Complaint status updated to ${status}`);
        fetchAdminData();
      }
    } catch (err) {
      toast.error('Failed to update complaint status');
    }
  };

  // Add Product Handler (Store Management)
  const handleCreateProduct = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/store/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('gymsync_token') || ''}` },
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
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('gymsync_token') || ''}` },
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
    <DashboardShell
      userRole={userRole}
      userName={userName}
      title="Admin Control Center"
      subtitle={`${isSeniorAdmin ? 'Senior Super Admin (Highest Tier)' : 'Junior Admin'} Portal — Authenticated as ${userName}`}
      activeTab={activeTab}
      onTabChange={setActiveTab}
    >
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
            {!isJuniorAdmin && (
              <button className={`tab-btn ${activeTab === 'exercises_plans' ? 'active' : ''}`} onClick={() => setActiveTab('exercises_plans')}>
                <Dumbbell size={16} /> Exercise Library & Plans ({dbExercises.length})
              </button>
            )}
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
            <button className={`tab-btn ${activeTab === 'users_instructors' ? 'active' : ''}`} onClick={() => setActiveTab('users_instructors')}>
              <Users size={16} /> Users & Fitness Instructors
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
            {/* EXERCISE LIBRARY & PRE-MADE PLANS TAB */}
            {activeTab === 'exercises_plans' && !isJuniorAdmin && (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '15px' }}>
                  <div>
                    <h2>Master Exercise Library & Pre-Made Plans</h2>
                    <p style={{ color: 'var(--text-secondary)' }}>Manage 600+ exercises, edit GIF/Video demonstration URLs, and publish pre-made plans.</p>
                  </div>
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <button className="btn btn-primary" onClick={() => { setEditingExercise(null); setExerciseForm({ name: '', targetMuscles: 'Chest, Shoulders', equipmentRequired: 'Dumbbells', difficulty: 'Beginner', mediaUrl: '', description: '', aiEnabled: false, detectorId: 'pushup_v1' }); setIsExerciseModalOpen(true); }}>
                      <PlusCircle size={16} /> Add Exercise
                    </button>
                    <button className="btn btn-success" onClick={() => { setPlanForm({ title: '', type: 'Exercise', category: 'Full Body', description: '' }); setIsPlanModalOpen(true); }}>
                      <PlusCircle size={16} /> Create Pre-Made Plan
                    </button>
                  </div>
                </div>

                <div className="search-bar" style={{ marginBottom: '20px', maxWidth: '500px' }}>
                  <Search size={20} color="var(--text-secondary)" />
                  <input type="text" placeholder="Search exercises by name or muscle..." value={exerciseSearch} onChange={e => setExerciseSearch(e.target.value)} />
                </div>

                {/* PRE-MADE PLANS DISPLAY SECTION */}
                <div style={{ marginBottom: '30px' }}>
                  <h3 style={{ color: '#10b981', marginBottom: '15px' }}>Published Pre-Made Plans</h3>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '15px' }}>
                    {dbPlans.map(plan => (
                      <div key={plan._id} className="glass-panel" style={{ padding: '16px', border: '1px solid rgba(16, 185, 129, 0.3)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                          <h4 style={{ color: 'var(--text-primary)', margin: 0 }}>{plan.title}</h4>
                          <span className="category-badge" style={{ background: plan.type === 'Diet' ? 'rgba(245, 158, 11, 0.2)' : 'rgba(59, 130, 246, 0.2)', color: plan.type === 'Diet' ? '#f59e0b' : '#3b82f6' }}>
                            {plan.type} • {plan.category}
                          </span>
                        </div>
                        <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginTop: '8px' }}>{plan.description}</p>
                        <button className="btn btn-outline btn-sm" style={{ marginTop: '10px', color: '#ef4444', borderColor: '#ef4444' }} onClick={async () => {
                          if (confirm('Delete this pre-made plan?')) {
                            await fetch(`/api/plans/premade/${plan._id}`, {
                              method: 'DELETE',
                              headers: { 'Authorization': `Bearer ${localStorage.getItem('gymsync_token') || ''}` }
                            });
                            toast.success('Plan deleted');
                            fetchExerciseAndPlanData();
                          }
                        }}>
                          <Trash2 size={14} /> Delete Plan
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                {/* EXERCISES TABLE */}
                <h3 style={{ color: '#3b82f6', marginBottom: '15px' }}>Exercise Database ({dbExercises.length})</h3>
                <div className="glass-panel" style={{ padding: '0', overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                    <thead>
                      <tr style={{ background: 'rgba(0,0,0,0.4)', borderBottom: '1px solid var(--card-border)' }}>
                        <th style={{ padding: '12px 16px' }}>ID / Name</th>
                        <th style={{ padding: '12px 16px' }}>Target Muscles</th>
                        <th style={{ padding: '12px 16px' }}>Equipment</th>
                        <th style={{ padding: '12px 16px' }}>Difficulty</th>
                        <th style={{ padding: '12px 16px' }}>GIF/Video URL</th>
                        <th style={{ padding: '12px 16px', textAlign: 'right' }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {dbExercises.filter(ex => {
                        const searchLower = exerciseSearch.toLowerCase();
                        const nameMatch = (ex.name || '').toLowerCase().includes(searchLower);
                        const musclesStr = Array.isArray(ex.targetMuscles) ? ex.targetMuscles.join(' ') : String(ex.targetMuscles || '');
                        const muscleMatch = musclesStr.toLowerCase().includes(searchLower);
                        return nameMatch || muscleMatch;
                      }).slice(0, 100).map(ex => (
                        <tr key={ex._id || ex.exerciseId} style={{ borderBottom: '1px solid var(--card-bg)' }}>
                          <td style={{ padding: '12px 16px' }}>
                            <strong style={{ color: 'var(--text-primary)', display: 'block' }}>{ex.name}</strong>
                            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{ex.exerciseId}</span>
                          </td>
                          <td style={{ padding: '12px 16px', fontSize: '0.85rem' }}>
                            {Array.isArray(ex.targetMuscles) ? ex.targetMuscles.join(', ') : String(ex.targetMuscles || '')}
                          </td>
                          <td style={{ padding: '12px 16px', fontSize: '0.85rem' }}>{ex.equipmentRequired || 'Bodyweight'}</td>
                          <td style={{ padding: '12px 16px' }}>
                            <span className="category-badge" style={{ background: 'var(--card-border)', color: 'var(--text-secondary)' }}>{ex.difficulty || 'Beginner'}</span>
                          </td>
                          <td style={{ padding: '12px 16px', fontSize: '0.8rem', color: ex.mediaUrl ? '#10b981' : '#ef4444' }}>
                            {ex.mediaUrl ? '✓ Has Video/GIF' : '✕ No Media URL'}
                          </td>
                          <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                            <button className="btn btn-outline btn-sm" style={{ marginRight: '6px' }} onClick={() => {
                              setEditingExercise(ex);
                              setExerciseForm({
                                name: ex.name || '',
                                targetMuscles: Array.isArray(ex.targetMuscles) ? ex.targetMuscles.join(', ') : String(ex.targetMuscles || ''),
                                equipmentRequired: ex.equipmentRequired || 'Bodyweight',
                                difficulty: ex.difficulty || 'Beginner',
                                mediaUrl: ex.mediaUrl || '',
                                description: ex.description || '',
                                aiEnabled: Boolean(ex.aiDetection?.enabled || ex.isAiTrackable),
                                detectorId: ex.aiDetection?.detectorId || 'pushup_v1'
                              });
                              setIsExerciseModalOpen(true);
                            }}>
                              <Edit3 size={14} /> Edit / Add Media
                            </button>
                            <button className="btn btn-outline btn-sm" style={{ color: '#ef4444', borderColor: '#ef4444' }} onClick={async () => {
                              if (confirm(`Delete exercise ${ex.name}?`)) {
                                await fetch(`/api/exercises/${ex._id}`, {
                                  method: 'DELETE',
                                  headers: { 'Authorization': `Bearer ${localStorage.getItem('gymsync_token') || ''}` }
                                });
                                toast.success('Exercise deleted');
                                fetchExerciseAndPlanData();
                              }
                            }}>
                              <Trash2 size={14} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* EDIT/CREATE EXERCISE MODAL */}
                <Modal isOpen={isExerciseModalOpen} onClose={() => setIsExerciseModalOpen(false)} title={editingExercise ? `Edit Exercise: ${editingExercise.name}` : 'Create New Exercise'}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <div>
                      <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Exercise Name</label>
                      <input className="search-input" value={exerciseForm.name} onChange={e => setExerciseForm({ ...exerciseForm, name: e.target.value })} placeholder="e.g. Incline Dumbbell Bench Press" />
                    </div>
                    <div>
                      <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Target Muscles (comma separated)</label>
                      <input className="search-input" value={exerciseForm.targetMuscles} onChange={e => setExerciseForm({ ...exerciseForm, targetMuscles: e.target.value })} placeholder="Chest, Shoulders, Triceps" />
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                      <div>
                        <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Equipment Required</label>
                        <input className="search-input" value={exerciseForm.equipmentRequired} onChange={e => setExerciseForm({ ...exerciseForm, equipmentRequired: e.target.value })} />
                      </div>
                      <div>
                        <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Difficulty</label>
                        <select className="search-input" value={exerciseForm.difficulty} onChange={e => setExerciseForm({ ...exerciseForm, difficulty: e.target.value })}>
                          <option value="Beginner">Beginner</option>
                          <option value="Intermediate">Intermediate</option>
                          <option value="Advanced">Advanced</option>
                        </select>
                      </div>
                    </div>
                    <div>
                      <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>GIF or Video Demonstration URL (mediaUrl)</label>
                      <input className="search-input" value={exerciseForm.mediaUrl} onChange={e => setExerciseForm({ ...exerciseForm, mediaUrl: e.target.value })} placeholder="https://example.com/demo.mp4 or .gif" />
                    </div>
                    <div>
                      <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Description / Form Instructions</label>
                      <textarea className="search-input" style={{ height: '80px' }} value={exerciseForm.description} onChange={e => setExerciseForm({ ...exerciseForm, description: e.target.value })} />
                    </div>
                    <div style={{ background: 'rgba(59, 130, 246, 0.05)', border: '1px solid rgba(59, 130, 246, 0.2)', padding: '12px', borderRadius: '8px' }}>
                      <label style={{ fontSize: '0.85rem', fontWeight: 600, color: '#60a5fa', display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                        <input type="checkbox" checked={exerciseForm.aiEnabled} onChange={e => setExerciseForm({ ...exerciseForm, aiEnabled: e.target.checked })} />
                        Enable AI Camera Pose Detection (Optional)
                      </label>
                      {exerciseForm.aiEnabled && (
                        <div style={{ marginTop: '10px' }}>
                          <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Registered Detection Algorithm</label>
                          <select className="search-input" value={exerciseForm.detectorId} onChange={e => setExerciseForm({ ...exerciseForm, detectorId: e.target.value })}>
                            {REGISTERED_DETECTORS.map(d => (
                              <option key={d.id} value={d.id}>{d.name} (v{d.version} - {d.status})</option>
                            ))}
                          </select>
                          <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '4px', margin: 0 }}>
                            Only safe, pre-configured detector algorithms in the application registry can be selected.
                          </p>
                        </div>
                      )}
                    </div>
                    <button className="btn btn-primary w-100" style={{ marginTop: '10px' }} onClick={async () => {
                      if (!exerciseForm.name) return toast.error('Exercise name is required');
                      const payload = {
                        ...exerciseForm,
                        aiDetection: {
                          enabled: exerciseForm.aiEnabled,
                          detectorId: exerciseForm.aiEnabled ? exerciseForm.detectorId : null
                        }
                      };
                      const headers = {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${localStorage.getItem('gymsync_token') || ''}`
                      };
                      if (editingExercise) {
                        await fetch(`/api/exercises/${editingExercise._id}`, {
                          method: 'PUT',
                          headers,
                          body: JSON.stringify(payload)
                        });
                        toast.success('Exercise updated');
                      } else {
                        await fetch('/api/exercises', {
                          method: 'POST',
                          headers,
                          body: JSON.stringify(payload)
                        });
                        toast.success('Exercise created');
                      }
                      setIsExerciseModalOpen(false);
                      fetchExerciseAndPlanData();
                    }}>
                      {editingExercise ? 'Save Changes' : 'Create Exercise'}
                    </button>
                  </div>
                </Modal>

                {/* CREATE PRE-MADE PLAN MODAL */}
                <Modal isOpen={isPlanModalOpen} onClose={() => setIsPlanModalOpen(false)} title="Publish Standard Pre-Made Plan">
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <div>
                      <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Plan Title</label>
                      <input className="search-input" value={planForm.title} onChange={e => setPlanForm({ ...planForm, title: e.target.value })} placeholder="e.g. 30-Day Beginner Fat Loss Plan" />
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                      <div>
                        <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Plan Type</label>
                        <select className="search-input" value={planForm.type} onChange={e => setPlanForm({ ...planForm, type: e.target.value })}>
                          <option value="Exercise">Exercise Workout Plan</option>
                          <option value="Diet">Diet Nutrition Plan</option>
                        </select>
                      </div>
                      <div>
                        <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Category</label>
                        <input className="search-input" value={planForm.category} onChange={e => setPlanForm({ ...planForm, category: e.target.value })} placeholder="Weight Loss / Bulking / General" />
                      </div>
                    </div>
                    <div>
                      <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Description</label>
                      <textarea className="search-input" style={{ height: '80px' }} value={planForm.description} onChange={e => setPlanForm({ ...planForm, description: e.target.value })} />
                    </div>
                    <button className="btn btn-success w-100" style={{ marginTop: '10px' }} onClick={async () => {
                      if (!planForm.title) return toast.error('Plan title is required');
                      const sampleDetails = planForm.type === 'Diet' ? [
                        { meal: 'Breakfast', food: 'Oatmeal + 3 Eggs + Green Tea' },
                        { meal: 'Lunch', food: '150g Chicken + Brown Rice + Salad' },
                        { meal: 'Dinner', food: '150g Grilled Fish + Sautéed Veggies' }
                      ] : [
                        { day: 'Day 1', focus: 'Push & Core', exercises: ['Push-ups', 'Squats', 'Plank'] },
                        { day: 'Day 2', focus: 'Pull & Back', exercises: ['Rows', 'Bicep Curls', 'Superman'] }
                      ];

                      await fetch('/api/plans/premade', {
                        method: 'POST',
                        headers: {
                          'Content-Type': 'application/json',
                          'Authorization': `Bearer ${localStorage.getItem('gymsync_token') || ''}`
                        },
                        body: JSON.stringify({ ...planForm, details: sampleDetails })
                      });
                      toast.success('Pre-Made Plan published!');
                      setIsPlanModalOpen(false);
                      fetchExerciseAndPlanData();
                    }}>
                      Publish Pre-Made Plan
                    </button>
                  </div>
                </Modal>
              </div>
            )}

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

                {isSeniorAdmin ? (
                  <>
                  </>
                ) : (
                  <div className="glass-panel" style={{ padding: '24px', marginTop: '30px' }}>
                    <h3>Subscription Settings Restricted</h3>
                    <p style={{ color: 'var(--text-secondary)', marginBottom: '16px' }}>
                      Only Senior Super Admins can manage Pro Plan pricing and mobile wallet payment instruction settings.
                    </p>
                  </div>
                )}
                <div className="glass-panel" style={{ padding: '24px', marginTop: '30px' }}>
                  <h3>Pending Payment Approvals</h3>
                  <p style={{ color: 'var(--text-secondary)', marginBottom: '16px' }}>
                    Review screenshot-based subscription payments and approve them once verified.
                  </p>
                  {pendingPayments.length === 0 ? (
                    <p style={{ color: 'var(--text-secondary)' }}>No pending payments at this time.</p>
                  ) : (
                    <div className="table-responsive">
                      <table className="admin-table">
                        <thead>
                          <tr>
                            <th>User</th>
                            <th>Method</th>
                            <th>Amount</th>
                            <th>Reference</th>
                            <th>Status</th>
                            <th>Action</th>
                          </tr>
                        </thead>
                        <tbody>
                          {pendingPayments.map(payment => (
                            <tr key={payment._id}>
                              <td>{payment.userName}</td>
                              <td>{payment.paymentMethod}</td>
                              <td>${payment.amount}</td>
                              <td>{payment.screenshotUrl || payment.transactionRef || '—'}</td>
                              <td><span className="status-pill pending">{payment.status}</span></td>
                              <td>
                                <button className="btn btn-sm btn-primary" onClick={() => handleApprovePayment(payment._id)}>
                                  <CheckCircle size={14} /> Approve
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
                            <td>
                              {(post.reportedBy || []).map((r, idx) => (
                                <div key={idx} style={{ marginBottom: '4px', fontSize: '0.85rem' }}>
                                  <strong>{r.userName || r}:</strong> {r.reason ? `${r.reason} - ${r.explanation}` : ''}
                                </div>
                              ))}
                              {(!post.reportedBy || post.reportedBy.length === 0) && 'Community Users'}
                            </td>
                            <td>
                              <div style={{ display: 'flex', gap: '8px' }}>
                                <button className="btn btn-sm btn-outline" onClick={() => setViewPostModalData(post)}>
                                  <Eye size={14} /> View Post
                                </button>
                                <button className="btn btn-sm" style={{ background: '#ef4444', color: 'var(--text-primary)' }} onClick={() => handleModeratePost(post._id, 'delete')}>
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
                    <div style={{ marginTop: '30px', paddingTop: '20px', borderTop: '1px solid var(--card-border)' }}>
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
                                            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('gymsync_token') || ''}` }
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

                      <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                        <button className="btn btn-sm btn-outline" onClick={() => handleComplaintStatus(c._id, 'Pending')} style={{ flex: 1 }}>
                          Mark Pending
                        </button>
                        <button className="btn btn-sm btn-primary" onClick={() => handleComplaintStatus(c._id, 'Approved')} style={{ flex: 1, background: '#10b981', borderColor: '#10b981' }}>
                          Approve
                        </button>
                      </div>

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

            {/* USERS & FITNESS INSTRUCTORS TAB */}
            {activeTab === 'users_instructors' && (
              <div className="glass-panel" style={{ padding: '24px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                  <div>
                    <h3>Users & Fitness Instructors Management</h3>
                    <p style={{ color: 'var(--text-secondary)' }}>Create Fitness Instructor accounts and manage platform users</p>
                  </div>
                </div>

                {/* Form to Create Fitness Instructor */}
                <div style={{ background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.3)', padding: '20px', borderRadius: '16px', marginBottom: '30px' }}>
                  <h4 style={{ color: '#10b981', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
                    <PlusCircle size={20} /> Create New Fitness Instructor Account
                  </h4>
                  <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '16px' }}>
                    Instructors will be assigned the <strong>FitnessInstructor</strong> role to access the Fitness Instructor Portal (<code>/fitness-instructor</code>).
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
                      <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '6px' }}>Email / Login Username</label>
                      <input 
                        type="text" 
                        placeholder="e.g. sarah@gymsync.com" 
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
                      {isCreatingInstructor ? 'Creating...' : 'Create Instructor Account'}
                    </button>
                  </form>
                </div>

                {/* Registered Users List */}
                <div>
                  <h4>All Registered Platform Users & Accounts ({users.length})</h4>
                  <div className="table-responsive" style={{ marginTop: '15px' }}>
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
                        {users.map(u => (
                          <tr key={u._id}>
                            <td><strong>{u.name}</strong></td>
                            <td>{u.email}</td>
                            <td>
                              <span className="category-badge" style={{ background: u.role === 'FitnessInstructor' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(59, 130, 246, 0.2)', color: u.role === 'FitnessInstructor' ? '#10b981' : '#3b82f6' }}>
                                {u.role}
                              </span>
                            </td>
                            <td>{u.isBanned ? <span style={{ color: '#ef4444' }}>Banned</span> : <span style={{ color: '#10b981' }}>Active</span>}</td>
                            <td style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                              <button className="btn btn-outline btn-sm" onClick={() => handleEditUser(u)} title="Edit user name and email"><Edit3 size={14} /> Edit</button>
                              <button 
                                className={`btn btn-sm ${u.isBanned ? 'btn-primary' : 'btn-outline'}`}
                                onClick={async () => {
                                  try {
                                    const res = await fetch(`/api/admin/users/${u._id}/ban`, {
                                      method: 'PUT',
                                      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('gymsync_token') || ''}` },
                                      body: JSON.stringify({ isBanned: !u.isBanned })
                                    });
                                    if (res.ok) {
                                      toast.success(`User ${u.name} status updated`);
                                      fetchAdminData();
                                    }
                                  } catch (err) {
                                    toast.error('Failed to update ban status');
                                  }
                                }}
                              >
                                {u.isBanned ? 'Unban User' : 'Ban User'}
                              </button>
                              <button className="btn btn-outline btn-sm" style={{ color: '#ef4444', borderColor: '#ef4444' }} onClick={() => handleDeleteUser(u)} title="Delete this user account"><Trash2 size={14} /> Delete</button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
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
          <div style={{ maxHeight: '250px', overflowY: 'auto', background: 'var(--card-bg)', padding: '12px', borderRadius: '8px', marginBottom: '16px' }}>
            {(selectedComplaint?.chatMessages || []).length === 0 ? (
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>No messages yet. Start conversation below.</p>
            ) : (
              selectedComplaint?.chatMessages?.map((msg, i) => (
                <div key={i} style={{ marginBottom: '10px', textAlign: msg.senderName === userName ? 'right' : 'left' }}>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{msg.senderName} ({msg.role})</span>
                  <div style={{ background: msg.senderName === userName ? '#3b82f6' : 'var(--card-border)', padding: '8px 12px', borderRadius: '8px', display: 'inline-block', marginTop: '2px' }}>
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
                  headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('gymsync_token') || ''}` },
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
              <div key={i} style={{ marginBottom: '8px', borderBottom: '1px solid var(--card-bg)', paddingBottom: '6px' }}>
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

      {/* Reported Post Details Modal */}
      <Modal isOpen={Boolean(viewPostModalData)} onClose={() => setViewPostModalData(null)} title="Reported Post Details">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <h4 style={{ margin: '0 0 5px 0' }}>Author</h4>
            <p style={{ margin: 0 }}>{viewPostModalData?.authorName || 'Unknown'}</p>
          </div>
          <div>
            <h4 style={{ margin: '0 0 5px 0' }}>Content</h4>
            <p style={{ margin: 0, padding: '10px', background: 'var(--card-bg)', borderRadius: '8px' }}>
              {viewPostModalData?.content}
            </p>
          </div>
          {viewPostModalData?.mediaUrl && (
            <div>
              <h4 style={{ margin: '0 0 5px 0' }}>Media</h4>
              <img src={viewPostModalData.mediaUrl} alt="Post media" style={{ maxWidth: '100%', borderRadius: '8px', maxHeight: '300px', objectFit: 'contain' }} />
            </div>
          )}
          <button className="btn btn-outline" onClick={() => setViewPostModalData(null)}>Close Window</button>
        </div>
      </Modal>
    </div>
    </DashboardShell>
  );
};

export default AdminDashboard;
