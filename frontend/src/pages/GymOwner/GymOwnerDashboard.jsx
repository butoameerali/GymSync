import React, { useState, useEffect } from 'react';
import { Building, Users, Calendar, DollarSign, Plus, CheckCircle, Clock, Edit, FileText, Dumbbell, Activity, UserCheck, Trash2, Lock, Sparkles, CreditCard, ShieldCheck, Eye, Banknote, RefreshCw, AlertCircle, ExternalLink } from 'lucide-react';
import { toast } from 'react-toastify';
import SkeletonLoader from '../../components/common/SkeletonLoader';
import Modal from '../../components/common/Modal';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import DashboardShell from '../../components/layout/DashboardShell';
import StatCard from '../../components/ui/StatCard';
import EquipmentManager from './EquipmentManager';
import OffersManager from './OffersManager';
import BranchVerificationModal from './BranchVerificationModal';
import BranchApplicationViewModal from './BranchApplicationViewModal';
import AnnualFeeModal from './AnnualFeeModal';
import { getSafeImageUrl } from '../../utils/imageUtils';
import './GymOwnerDashboard.css';

const GymOwnerDashboard = () => {
  const [activeTab, setActiveTab] = useState(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const urlTab = params.get('tab');
      if (urlTab) return urlTab;
      return localStorage.getItem('gym_owner_active_tab') || 'overview';
    } catch {
      return 'overview';
    }
  });

  const handleTabChange = (newTab) => {
    setActiveTab(newTab);
    try {
      localStorage.setItem('gym_owner_active_tab', newTab);
      const url = new URL(window.location.href);
      url.searchParams.set('tab', newTab);
      window.history.replaceState({}, '', url.toString());
    } catch {}
  };
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isEditingGym, setIsEditingGym] = useState(false);

  // Form states
  const [checkInName, setCheckInName] = useState('');
  const [checkInNotes, setCheckInNotes] = useState('');
  const [members, setMembers] = useState([]);
  const [selectedMemberId, setSelectedMemberId] = useState('');

  // Plan Creator Form State
  const [planForm, setPlanForm] = useState({
    memberName: '',
    planType: 'Workout',
    title: '',
    description: '',
    calories: 2200,
    protein: 150
  });

  const [photoFile, setPhotoFile] = useState(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  // Gym Profile Form State
  const [gymProfile, setGymProfile] = useState({
    name: '',
    location: '',
    monthlyFee: 50,
    admissionFee: 0,
    securityDeposit: 0,
    securityDepositRefundable: true,
    offersYearlyPlan: false,
    yearlyDiscountPercent: 0,
    guidanceTrainer: false,
    personalTrainer: false,
    personalTrainerMonthlyFee: 0,
    trainerNotes: '',
    bankDetails: '',
    description: 'A premium fitness facility.',
    equipmentListStr: 'Treadmills, Dumbbells, Power Racks, Cable Crossover, Smith Machine',
    weekdayTimings: '6:00 AM - 10:00 PM',
    weekendTimings: '8:00 AM - 8:00 PM'
  });

  // Trainer Management State
  const [trainers, setTrainers] = useState([]);
  const [showTrainerModal, setShowTrainerModal] = useState(false);
  const [trainerForm, setTrainerForm] = useState({ name: '', email: '', password: '' });
  const [showDeleteGymModal, setShowDeleteGymModal] = useState(false);
  const [isDeletingGym, setIsDeletingGym] = useState(false);
  const [tourRequests, setTourRequests] = useState([]);

  // Multi-Branch & Verification State
  const [branches, setBranches] = useState([]);
  const [organization, setOrganization] = useState(null);
  const [showBranchModal, setShowBranchModal] = useState(false);
  const [selectedBranchForModal, setSelectedBranchForModal] = useState(null);
  const [viewingApplicationBranch, setViewingApplicationBranch] = useState(null);
  const [branchToDelete, setBranchToDelete] = useState(null);
  const [isDeletingBranch, setIsDeletingBranch] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [branchToPay, setBranchToPay] = useState(null);

  // Member & Payment Management States
  const [paymentsData, setPaymentsData] = useState({
    pendingOnline: [],
    pendingCash: [],
    completed: [],
    rejected: [],
    stats: { totalCollected: 0, pendingOnlineCount: 0, pendingCashCount: 0, completedCount: 0 }
  });
  const [enrolledMembers, setEnrolledMembers] = useState([]);
  const [loadingPayments, setLoadingPayments] = useState(false);
  const [paymentActionLoading, setPaymentActionLoading] = useState(null);
  const [membersSubTab, setMembersSubTab] = useState('online');

  const ownerName = localStorage.getItem('gymsync_user_name') || 'Gym Owner';

  const fetchPaymentsAndMembers = async () => {
    setLoadingPayments(true);
    try {
      const token = localStorage.getItem('gymsync_token') || '';
      const [paymentsRes, membersRes] = await Promise.all([
        fetch('/api/gym-owner/payments', {
          headers: { 'Authorization': `Bearer ${token}` }
        }),
        fetch('/api/gym-owner/members', {
          headers: { 'Authorization': `Bearer ${token}` }
        })
      ]);

      if (paymentsRes.ok) {
        const pData = await paymentsRes.json();
        setPaymentsData(pData);
      }
      if (membersRes.ok) {
        const mData = await membersRes.json();
        setEnrolledMembers(mData.members || []);
      }
    } catch (err) {
      console.error('Failed to load payments or members:', err);
    } finally {
      setLoadingPayments(false);
    }
  };

  const handleConfirmPayment = async (paymentId, isCash = false) => {
    setPaymentActionLoading(paymentId);
    try {
      const token = localStorage.getItem('gymsync_token') || '';
      const res = await fetch(`/api/gym-owner/payments/${paymentId}/confirm`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to confirm payment');
      toast.success(data.message || (isCash ? 'Cash payment confirmed! Member activated.' : 'TID verified! Member activated.'));
      fetchPaymentsAndMembers();
      fetchDashboardData();
    } catch (err) {
      toast.error(err.message || 'Error confirming payment');
    } finally {
      setPaymentActionLoading(null);
    }
  };

  const handleRejectPayment = async (paymentId) => {
    const reason = window.prompt('Enter rejection reason (e.g. Invalid TID / Payment not received):', 'Transaction reference could not be verified in account statement');
    if (!reason) return;

    setPaymentActionLoading(paymentId);
    try {
      const token = localStorage.getItem('gymsync_token') || '';
      const res = await fetch(`/api/gym-owner/payments/${paymentId}/reject`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ reason })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to reject payment');
      toast.info('Payment rejected.');
      fetchPaymentsAndMembers();
    } catch (err) {
      toast.error(err.message || 'Error rejecting payment');
    } finally {
      setPaymentActionLoading(null);
    }
  };

  useEffect(() => {
    fetchDashboardData();
    fetchBranches();
  }, []);

  useEffect(() => {
    if (activeTab === 'members' || activeTab === 'overview') {
      fetchPaymentsAndMembers();
    }
  }, [activeTab]);

  const fetchBranches = async () => {
    try {
      const res = await fetch('/api/gym-verification/branches', {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('gymsync_token') || ''}` }
      });
      if (res.ok) {
        const data = await res.json();
        setBranches(Array.isArray(data.branches) ? data.branches : []);
        setOrganization(data.organization || null);
      }
    } catch (e) {
      console.error('Failed to fetch branches', e);
    }
  };

  const handleDeleteBranch = async () => {
    if (!branchToDelete?._id) return;
    setIsDeletingBranch(true);
    try {
      const res = await fetch(`/api/gym-verification/branch/${branchToDelete._id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('gymsync_token') || ''}`
        }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to remove branch');
      toast.success(data.message || 'Branch removed successfully');
      setBranchToDelete(null);
      fetchBranches();
      fetchDashboardData();
    } catch (err) {
      toast.error(err.message || 'Error deleting branch');
    } finally {
      setIsDeletingBranch(false);
    }
  };

  const fetchTourRequests = async (gymId) => {
    if (!gymId) return;
    try {
      const res = await fetch(`/api/gym-owner/tour-requests/${gymId}`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('gymsync_token') || ''}` }
      });
      if (res.ok) {
        const data = await res.json();
        setTourRequests(Array.isArray(data) ? data : []);
      }
    } catch (e) {
      console.error('Failed to fetch tour requests', e);
    }
  };

  const handleUpdateTourStatus = async (tourId, newStatus) => {
    try {
      const res = await fetch(`/api/gym-owner/tour-requests/${tourId}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('gymsync_token') || ''}`
        },
        body: JSON.stringify({ status: newStatus })
      });
      if (res.ok) {
        toast.success(`Tour marked as ${newStatus}`);
        if (dashboardData?.gym?._id) {
          fetchTourRequests(dashboardData.gym._id);
        }
      }
    } catch {
      toast.error('Failed to update tour status');
    }
  };

  const fetchDashboardData = async (targetGymId = null) => {
    setLoading(true);
    try {
      const url = targetGymId 
        ? `/api/gym-owner/dashboard/${ownerName}?gymId=${targetGymId}` 
        : `/api/gym-owner/dashboard/${ownerName}`;
      const res = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('gymsync_token') || ''}`
        }
      });
      if (res.ok) {
        const data = await res.json();
        setDashboardData(data);
        if (data.gym) {
          setGymProfile({
            name: data.gym.name || '',
            location: data.gym.location || '',
            monthlyFee: data.gym.monthlyFee ?? 50,
            admissionFee: data.gym.admissionFee ?? 0,
            securityDeposit: data.gym.securityDeposit ?? 0,
            securityDepositRefundable: data.gym.securityDepositRefundable ?? true,
            offersYearlyPlan: Boolean(data.gym.offersYearlyPlan || (Number(data.gym.yearlyDiscountPercent) > 0)),
            yearlyDiscountPercent: data.gym.yearlyDiscountPercent ?? 0,
            guidanceTrainer: Boolean(data.gym.trainerPolicy?.guidanceTrainer ?? (data.gym.trainerIncluded && !data.gym.trainerPolicy)),
            personalTrainer: Boolean(data.gym.trainerPolicy?.personalTrainer ?? false),
            personalTrainerMonthlyFee: data.gym.trainerPolicy?.personalTrainerMonthlyFee ?? 0,
            trainerNotes: data.gym.trainerPolicy?.notes || '',
            bankDetails: data.gym.bankDetails || '',
            description: data.gym.description || 'A premium fitness facility.',
            equipmentListStr: (data.gym.equipmentList && data.gym.equipmentList.length > 0)
              ? data.gym.equipmentList.join(', ')
              : 'Treadmills, Dumbbells, Power Racks, Cable Crossover, Smith Machine',
            weekdayTimings: data.gym.timings?.weekday || '6:00 AM - 10:00 PM',
            weekendTimings: data.gym.timings?.weekend || '8:00 AM - 8:00 PM'
          });

          // Fetch subscribed members for member dropdown
          fetchGymMembers(data.gym.name);
          fetchTrainers(data.gym.name);
          fetchTourRequests(data.gym._id);
        }
      }
    } catch (err) {
      console.error('Error fetching gym owner dashboard:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchGymMembers = async (gymName) => {
    try {
      const res = await fetch(`/api/users/gym-members/${encodeURIComponent(gymName)}`);
      if (res.ok) {
        const memberList = await res.json();
        setMembers(Array.isArray(memberList) ? memberList : []);
      }
    } catch (err) { console.error('Error fetching members:', err); }
  };

  const fetchTrainers = async (gymName) => {
    try {
      const res = await fetch(`/api/gym-owner/trainers/${gymName}`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('gymsync_token') || ''}` }
      });
      if (res.ok) setTrainers(await res.json());
    } catch (e) { console.error(e); }
  };

  const handleCreateTrainer = async (e) => {
    e.preventDefault();
    if (!trainerForm.name || !trainerForm.email || !trainerForm.password) {
      return toast.warn('All fields are required for creating a trainer account');
    }
    try {
      const res = await fetch('/api/gym-owner/trainers', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('gymsync_token') || ''}`
        },
        body: JSON.stringify({
          ...trainerForm,
          gymName: gymProfile.name || dashboardData?.gym?.name
        })
      });
      if (res.ok) {
        toast.success(`Gym Trainer account created for ${trainerForm.name}!`);
        setShowTrainerModal(false);
        setTrainerForm({ name: '', email: '', password: '' });
        fetchTrainers(gymProfile.name || dashboardData?.gym?.name);
      } else {
        const err = await res.json();
        toast.error(err.message || 'Failed to create trainer');
      }
    } catch {
      toast.error('Error creating trainer account');
    }
  };

  const handleCheckInSubmit = async (e) => {
    e.preventDefault();
    if (!checkInName.trim()) {
      toast.error('Please select or enter a member name');
      return;
    }

    try {
      const res = await fetch('/api/gym-owner/attendance/check-in', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('gymsync_token') || ''}`
        },
        body: JSON.stringify({
          gymId: dashboardData?.gym?._id || 'gym_demo_id',
          memberId: selectedMemberId || undefined,
          memberName: checkInName.trim(),
          notes: checkInNotes
        })
      });

      if (res.ok) {
        const newLog = await res.json();
        toast.success(`Check-in recorded for ${checkInName}`);
        setCheckInName('');
        setSelectedMemberId('');
        setCheckInNotes('');
        setDashboardData(prev => ({
          ...prev,
          todayAttendanceCount: (prev?.todayAttendanceCount || 0) + 1,
          todayAttendance: [newLog, ...(prev?.todayAttendance || [])]
        }));
      } else {
        const err = await res.json();
        toast.error(err.message || 'Check-in failed');
      }
    } catch {
      toast.error('Check-in error');
    }
  };

  const handleCheckOut = async (attendanceId) => {
    try {
      const res = await fetch(`/api/gym-owner/attendance/check-out/${attendanceId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('gymsync_token') || ''}`
        }
      });

      if (res.ok) {
        toast.info('Member checked out');
        setDashboardData(prev => ({
          ...prev,
          todayAttendance: prev.todayAttendance.map(a => a._id === attendanceId ? { ...a, status: 'CheckedOut', checkOutTime: new Date() } : a)
        }));
      }
    } catch {
      toast.error('Check-out failed');
    }
  };

  const handleSaveGymProfile = async (e) => {
    e.preventDefault();
    try {
      setUploadingPhoto(true);
      const gymId = dashboardData?.gym?._id || 'gym_demo_id';
      const res = await fetch(`/api/gym-owner/gym/${gymId}`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('gymsync_token') || ''}`
        },
        body: JSON.stringify({
          name: gymProfile.name,
          location: gymProfile.location,
          monthlyFee: Number(gymProfile.monthlyFee) || 0,
          admissionFee: Number(gymProfile.admissionFee) || 0,
          securityDeposit: Number(gymProfile.securityDeposit) || 0,
          securityDepositRefundable: Boolean(gymProfile.securityDepositRefundable),
          offersYearlyPlan: Boolean(gymProfile.offersYearlyPlan),
          yearlyDiscountPercent: gymProfile.offersYearlyPlan ? (Number(gymProfile.yearlyDiscountPercent) || 0) : 0,
          trainerPolicy: {
            guidanceTrainer: Boolean(gymProfile.guidanceTrainer),
            personalTrainer: Boolean(gymProfile.personalTrainer),
            personalTrainerMonthlyFee: Number(gymProfile.personalTrainerMonthlyFee) || 0,
            notes: gymProfile.trainerNotes || ''
          },
          bankDetails: gymProfile.bankDetails,
          description: gymProfile.description,
          equipmentList: gymProfile.equipmentListStr.split(',').map(item => item.trim()),
          timings: {
            weekday: gymProfile.weekdayTimings,
            weekend: gymProfile.weekendTimings
          }
        })
      });

      if (res.ok) {
        const savedGym = await res.json();
        let uploadSuccess = true;

        if (photoFile) {
          const targetGymId = savedGym._id || gymId;
          const formData = new FormData();
          formData.append('photo', photoFile);
          
          const photoRes = await fetch(`/api/gym-owner/gym/${targetGymId}/upload-photo`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${localStorage.getItem('gymsync_token') || ''}`
            },
            body: formData
          });

          if (photoRes.ok) {
            setPhotoFile(null);
          } else {
            uploadSuccess = false;
            toast.error('Failed to upload photo');
          }
        }

        if (uploadSuccess) {
          toast.success('Gym information updated successfully');
        }
        setIsEditingGym(false);
        fetchDashboardData();
      } else {
        const err = await res.json().catch(() => ({}));
        toast.error(err.message || 'Failed to update gym profile');
      }
    } catch {
      toast.error('Error saving gym details');
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleDeleteGym = async () => {
    setIsDeletingGym(true);
    try {
      const gymId = dashboardData?.gym?._id;
      if (!gymId || gymId === 'gym_demo_id') return;

      const res = await fetch(`/api/gym-owner/gym/${gymId}`, {
        method: 'DELETE',
        headers: { 
          'Authorization': `Bearer ${localStorage.getItem('gymsync_token') || ''}`
        }
      });

      if (res.ok) {
        toast.success('Gym successfully deleted');
        setDashboardData(prev => ({ ...prev, gym: null }));
        setIsEditingGym(false);
        setGymProfile({
          name: '',
          location: '',
          monthlyFee: 50,
          admissionFee: 0,
          bankDetails: '',
          description: ''
        });
        setShowDeleteGymModal(false);
      } else {
        toast.error('Failed to delete gym');
      }
    } catch {
      toast.error('Error deleting gym');
    } finally {
      setIsDeletingGym(false);
    }
  };

  const handleCreatePlan = async (e) => {
    e.preventDefault();
    if (!planForm.memberName || !planForm.title || !planForm.description) {
      toast.error('Please fill in all plan fields');
      return;
    }

    try {
      const res = await fetch('/api/gym-owner/plans', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('gymsync_token') || ''}`
        },
        body: JSON.stringify({
          gymId: dashboardData?.gym?._id || 'gym_demo_id',
          memberName: planForm.memberName,
          assignedBy: ownerName,
          planType: planForm.planType,
          title: planForm.title,
          description: planForm.description,
          nutritionMacros: {
            calories: planForm.calories,
            proteinGrams: planForm.protein
          }
        })
      });

      if (res.ok) {
        toast.success(`Assigned ${planForm.planType} plan to ${planForm.memberName}`);
        setPlanForm({
          memberName: '',
          planType: 'Workout',
          title: '',
          description: '',
          calories: 2200,
          protein: 150
        });
      }
    } catch {
      toast.error('Failed to create plan');
    }
  };

  return (
    <DashboardShell
      userRole="GymOwner"
      userName={ownerName || 'Gym Owner'}
      title="Gym Owner Control Panel"
      subtitle={dashboardData?.gym?.name || 'GymSync Partner Facility'}
      activeTab={activeTab}
      onTabChange={handleTabChange}
    >
      <div className="gym-owner-page">
        <div className="container owner-content" style={{ paddingTop: '10px' }}>
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
                {branches.some(b => b.approvalStatus === 'Approved' && (!b.subscriptionPaid || !b.isOnline) && b.listingStatus !== 'Pending Verification') && (
                  <div style={{
                    background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.15) 0%, rgba(16, 185, 129, 0.15) 100%)',
                    border: '1px solid rgba(59, 130, 246, 0.4)',
                    borderRadius: '14px',
                    padding: '16px 20px',
                    marginBottom: '24px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    gap: '12px'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                      <div style={{ background: '#3b82f6', color: '#fff', borderRadius: '10px', padding: '10px' }}>
                        <Sparkles size={24} />
                      </div>
                      <div>
                        <h4 style={{ margin: 0, fontSize: '1rem', color: 'var(--text-primary)' }}>
                          🎉 Facility Verification Approved!
                        </h4>
                        <p style={{ margin: '3px 0 0', fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                          Pay the annual partner listing fee (Rs. {Number(branches.find(b => b.approvalStatus === 'Approved' && (!b.subscriptionPaid || !b.isOnline))?.annualSubscriptionFee || 5000).toLocaleString('en-US')}/year) to take your gym live on Explore Gyms.
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      className="btn btn-primary"
                      onClick={() => {
                        const target = branches.find(b => b.approvalStatus === 'Approved' && (!b.subscriptionPaid || !b.isOnline));
                        if (target) {
                          setBranchToPay(target);
                          setShowPaymentModal(true);
                        }
                      }}
                      style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}
                    >
                      <CreditCard size={16} /> Pay Fee & Go Online
                    </button>
                  </div>
                )}

                <div className="stats-grid">
                  <div className="stat-card glass-panel">
                    <div className="stat-icon purple"><Users size={24} /></div>
                    <div>
                      <span className="stat-label">Enrolled Members</span>
                      <h3 className="stat-value">{dashboardData?.stats?.activeMembersCount ?? 0}</h3>
                    </div>
                  </div>

                  <div className="stat-card glass-panel">
                    <div className="stat-icon green"><UserCheck size={24} /></div>
                    <div>
                      <span className="stat-label">Today's Check-Ins</span>
                      <h3 className="stat-value">{dashboardData?.stats?.todayCheckIns ?? dashboardData?.todayAttendanceCount ?? 0}</h3>
                    </div>
                  </div>

                  <div className="stat-card glass-panel">
                    <div className="stat-icon blue"><DollarSign size={24} /></div>
                    <div>
                      <span className="stat-label">Est. Monthly Revenue</span>
                      <h3 className="stat-value">Rs. {dashboardData?.stats?.monthlyRevenue ?? 0}</h3>
                    </div>
                  </div>

                  <div className="stat-card glass-panel">
                    <div className="stat-icon amber"><DollarSign size={24} /></div>
                    <div>
                      <span className="stat-label">15% GymSync Commission Owed</span>
                      <h3 className="stat-value" style={{ color: '#f59e0b' }}>Rs. {(dashboardData?.stats?.commission15PercentOwed || 0).toFixed(2)}</h3>
                    </div>
                  </div>
                </div>

                {/* Quick Attendance Action */}
                <div className="glass-panel" style={{ padding: '24px', marginTop: '30px' }}>
                  <h3>Member Express Check-In</h3>
                  <form onSubmit={handleCheckInSubmit} style={{ display: 'flex', gap: '12px', marginTop: '16px', flexWrap: 'wrap' }}>
                    {members.length > 0 ? (
                      <select 
                        className="search-input"
                        style={{ flex: 1, minWidth: '220px' }}
                        value={selectedMemberId}
                        onChange={e => {
                          const val = e.target.value;
                          setSelectedMemberId(val);
                          const m = members.find(mem => String(mem._id) === val);
                          if (m) setCheckInName(m.name);
                        }}
                      >
                        <option value="">-- Select Gym Member --</option>
                        {members.map(m => (
                          <option key={m._id} value={m._id}>
                            {m.name} ({m.email}) • {m.gymMembershipType || 'Monthly'} Member
                          </option>
                        ))}
                      </select>
                    ) : (
                      <input 
                        type="text"
                        className="search-input"
                        style={{ flex: 1, minWidth: '200px' }}
                        placeholder="Enter Member Name..."
                        value={checkInName}
                        onChange={e => setCheckInName(e.target.value)}
                      />
                    )}

                    <input 
                      type="text"
                      className="search-input"
                      style={{ flex: 1, minWidth: '200px' }}
                      placeholder="Notes (e.g. Leg Day)..."
                      value={checkInNotes}
                      onChange={e => setCheckInNotes(e.target.value)}
                    />
                    <button type="submit" className="btn btn-primary">
                      Record Check-In
                    </button>
                  </form>
                </div>
              </div>
            )}

            {/* MY GYMS / BRANCHES MULTI-LOCATION MANAGEMENT TAB */}
            {activeTab === 'branches' && (
              <div className="branches-container">
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '24px',
                  flexWrap: 'wrap',
                  gap: '16px'
                }}>
                  <div>
                    <h3 style={{ margin: 0, fontSize: '1.35rem', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <Building size={24} color="#3b82f6" />
                      {organization?.name ? `${organization.name} Organization` : 'My Multi-Branch Fitness Network'}
                    </h3>
                    <p style={{ margin: '4px 0 0 0', color: 'var(--text-secondary)', fontSize: '0.88rem' }}>
                      Manage multiple facility locations, monitor branch verification stages, and submit compliance evidence.
                    </p>
                  </div>

                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={() => {
                      setSelectedBranchForModal(null);
                      setShowBranchModal(true);
                    }}
                    style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}
                  >
                    <Plus size={18} /> Add New Branch
                  </button>
                </div>

                {branches.length === 0 ? (
                  <div className="glass-panel" style={{ padding: '40px', textAlign: 'center', borderRadius: '16px' }}>
                    <Building size={48} color="#64748b" style={{ marginBottom: '16px' }} />
                    <h4 style={{ color: 'var(--text-primary)', marginBottom: '8px' }}>No Branches Configured</h4>
                    <p style={{ color: 'var(--text-secondary)', maxWidth: '480px', margin: '0 auto 20px' }}>
                      You haven't established any gym branches under your owner profile yet. Register your first location to initiate verified onboarding.
                    </p>
                    <button
                      type="button"
                      className="btn btn-primary"
                      onClick={() => {
                        setSelectedBranchForModal(null);
                        setShowBranchModal(true);
                      }}
                    >
                      <Plus size={16} /> Add First Gym Branch
                    </button>
                  </div>
                ) : (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '20px' }}>
                    {branches.map(b => {
                      const status = b.approvalStatus || 'Draft';
                      let statusBg = 'rgba(148, 163, 184, 0.15)';
                      let statusColor = '#94a3b8';
                      if (status === 'Approved') {
                        statusBg = 'rgba(16, 185, 129, 0.15)';
                        statusColor = '#10b981';
                      } else if (status === 'Pending Review' || status === 'Under Review') {
                        statusBg = 'rgba(59, 130, 246, 0.15)';
                        statusColor = '#3b82f6';
                      } else if (status === 'More Information Required') {
                        statusBg = 'rgba(249, 115, 22, 0.15)';
                        statusColor = '#f97316';
                      } else if (status === 'Rejected') {
                        statusBg = 'rgba(239, 68, 68, 0.15)';
                        statusColor = '#ef4444';
                      } else if (status === 'Suspended') {
                        statusBg = 'rgba(220, 38, 38, 0.15)';
                        statusColor = '#dc2626';
                      }

                      return (
                        <div key={b._id} className="glass-panel" style={{
                          padding: '24px',
                          borderRadius: '16px',
                          display: 'flex',
                          flexDirection: 'column',
                          justifyContent: 'space-between',
                          border: status === 'More Information Required' ? '1px solid rgba(249, 115, 22, 0.4)' : '1px solid var(--card-border)'
                        }}>
                          <div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                              <div>
                                <h4 style={{ margin: 0, fontSize: '1.15rem', color: 'var(--text-primary)', fontWeight: 700 }}>
                                  {b.branchName || b.name}
                                </h4>
                                <span style={{ fontSize: '0.8rem', color: '#3b82f6', fontWeight: 500 }}>
                                  {b.gymType || 'Fitness Facility'}
                                </span>
                              </div>
                              <span style={{
                                background: statusBg,
                                color: statusColor,
                                padding: '4px 10px',
                                borderRadius: '8px',
                                fontSize: '0.78rem',
                                fontWeight: 600,
                                textTransform: 'uppercase',
                                letterSpacing: '0.5px'
                              }}>
                                {status}
                              </span>
                            </div>

                            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '14px', lineHeight: '1.5' }}>
                              📍 {b.address || b.location || 'Address pending'}, {b.city || ''} {b.country ? `• ${b.country}` : ''}
                            </p>

                            {b.verificationApplication?.referenceId && (
                              <div style={{
                                background: 'var(--card-bg-light)',
                                padding: '8px 12px',
                                borderRadius: '8px',
                                fontSize: '0.78rem',
                                color: 'var(--text-secondary)',
                                marginBottom: '14px',
                                display: 'flex',
                                justifyContent: 'space-between'
                              }}>
                                <span>Ref: <strong>{b.verificationApplication.referenceId}</strong></span>
                                <span>Docs: {b.verificationApplication.documents?.length || 0} attached</span>
                              </div>
                            )}

                            {status === 'More Information Required' && b.verificationApplication?.missingRequirements?.length > 0 && (
                              <div style={{
                                background: 'rgba(249, 115, 22, 0.1)',
                                border: '1px solid rgba(249, 115, 22, 0.3)',
                                borderRadius: '8px',
                                padding: '10px 12px',
                                marginBottom: '14px',
                                fontSize: '0.8rem',
                                color: '#fdba74'
                              }}>
                                <strong>Action Required:</strong>
                                <ul style={{ margin: '4px 0 0 0', paddingLeft: '18px' }}>
                                  {b.verificationApplication.missingRequirements.map((req, i) => (
                                    <li key={i}>{req}</li>
                                  ))}
                                </ul>
                              </div>
                            )}

                            {/* Verification Approved - Online vs Awaiting Payment State */}
                            {status === 'Approved' && (
                              (b.subscriptionPaid && b.isOnline) ? (
                                <div style={{
                                  background: 'rgba(16, 185, 129, 0.1)',
                                  border: '1px solid rgba(16, 185, 129, 0.3)',
                                  borderRadius: '10px',
                                  padding: '10px 14px',
                                  marginBottom: '12px',
                                  display: 'flex',
                                  justifyContent: 'space-between',
                                  alignItems: 'center'
                                }}>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <span style={{ fontSize: '0.95rem' }}>🟢</span>
                                    <span style={{ fontSize: '0.82rem', fontWeight: 600, color: '#10b981' }}>
                                      Live & Online
                                    </span>
                                  </div>
                                  <span style={{ fontSize: '0.74rem', color: 'var(--text-secondary)' }}>
                                    Fee Paid (Rs. {b.annualSubscriptionFee || 20}/yr)
                                  </span>
                                </div>
                              ) : b.listingStatus === 'Pending Verification' ? (
                                <div style={{
                                  background: 'rgba(245, 158, 11, 0.1)',
                                  border: '1px solid rgba(245, 158, 11, 0.35)',
                                  borderRadius: '10px',
                                  padding: '12px 14px',
                                  marginBottom: '12px'
                                }}>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                                    <span style={{ fontSize: '0.95rem' }}>⏳</span>
                                    <strong style={{ fontSize: '0.85rem', color: '#f59e0b' }}>
                                      Payment Verification in Progress
                                    </strong>
                                  </div>
                                  <p style={{ margin: 0, fontSize: '0.78rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                                    Your annual fee payment receipt ({b.subscriptionPaymentMethod || 'Online Transfer'}) has been submitted and is currently being verified by GymSync administration. Your facility will go <strong>Live & Online</strong> automatically once verified.
                                  </p>
                                </div>
                              ) : (
                                <div style={{
                                  background: 'rgba(59, 130, 246, 0.09)',
                                  border: '1px solid rgba(59, 130, 246, 0.3)',
                                  borderRadius: '10px',
                                  padding: '12px 14px',
                                  marginBottom: '12px'
                                }}>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                                    <Sparkles size={16} color="#38bdf8" />
                                    <strong style={{ fontSize: '0.85rem', color: 'var(--text-primary)' }}>
                                      Verification Approved!
                                    </strong>
                                  </div>
                                  <p style={{ margin: 0, fontSize: '0.78rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                                    Pay the <strong>Rs. {Number(b.annualSubscriptionFee || 20).toLocaleString('en-US')}/year</strong> partner fee to take your facility live on Explore Gyms.
                                  </p>
                                  <button
                                    type="button"
                                    className="btn btn-primary btn-sm"
                                    style={{ marginTop: '10px', width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', fontSize: '0.82rem' }}
                                    onClick={() => {
                                      setBranchToPay(b);
                                      setShowPaymentModal(true);
                                    }}
                                  >
                                    <CreditCard size={15} /> Pay Rs. {b.annualSubscriptionFee || 20} & Activate Online
                                  </button>
                                </div>
                              )
                            )}
                          </div>

                          <div style={{ display: 'flex', gap: '10px', marginTop: '16px', alignItems: 'center', flexWrap: 'wrap' }}>
                            <button
                              type="button"
                              onClick={() => {
                                if (status === 'Draft' || status === 'More Information Required') {
                                  setSelectedBranchForModal(b);
                                  setShowBranchModal(true);
                                } else {
                                  setViewingApplicationBranch(b);
                                }
                              }}
                              className="btn btn-outline btn-sm"
                              style={{ flex: 1, minWidth: '130px', fontSize: '0.82rem' }}
                            >
                              {status === 'Draft' || status === 'More Information Required' 
                                ? 'Edit / Resubmit' 
                                : 'View Application'}
                            </button>
                            {status === 'Approved' && (
                              <>
                                <button
                                  type="button"
                                  onClick={() => {
                                    fetchDashboardData(b._id);
                                    setActiveTab('settings');
                                    setIsEditingGym(false);
                                  }}
                                  className="btn btn-primary btn-sm"
                                  style={{ fontSize: '0.82rem' }}
                                  title="Manage facility details, operational pricing, equipment, and trainers"
                                >
                                  Manage Facility
                                </button>
                                {(b.subscriptionPaid || b.isOnline) && (
                                  <button
                                    type="button"
                                    onClick={() => window.open(`/gym/${b._id}`, '_blank')}
                                    className="btn btn-outline btn-sm"
                                    style={{ fontSize: '0.82rem', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                                    title="View public gym profile on Explore Gyms"
                                  >
                                    <ExternalLink size={13} /> View Public
                                  </button>
                                )}
                              </>
                            )}
                            <button
                              type="button"
                              onClick={() => setBranchToDelete(b)}
                              className="btn btn-outline btn-sm"
                              style={{
                                color: '#ef4444',
                                borderColor: 'rgba(239, 68, 68, 0.35)',
                                background: 'rgba(239, 68, 68, 0.05)',
                                padding: '6px 12px',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '6px',
                                fontSize: '0.82rem'
                              }}
                              title="Delete / Remove this branch"
                            >
                              <Trash2 size={14} /> Remove
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* MEMBERS & PAYMENTS VERIFICATION TAB */}
            {activeTab === 'members' && (
              <div className="members-payments-container">
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '22px',
                  flexWrap: 'wrap',
                  gap: '14px'
                }}>
                  <div>
                    <h3 style={{ margin: 0, fontSize: '1.35rem', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <Users size={24} color="var(--primary-accent)" />
                      Members & Payment Verifications
                    </h3>
                    <p style={{ margin: '4px 0 0', color: 'var(--text-secondary)', fontSize: '0.88rem' }}>
                      Verify trainee transfer TIDs, confirm front-desk cash pass payments, and manage active memberships.
                    </p>
                  </div>

                  <button
                    type="button"
                    className="btn btn-outline btn-sm"
                    onClick={fetchPaymentsAndMembers}
                    disabled={loadingPayments}
                    style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                  >
                    <RefreshCw size={14} className={loadingPayments ? 'spin' : ''} /> Refresh List
                  </button>
                </div>

                {/* Stat Metrics */}
                <div className="stats-grid" style={{ marginBottom: '24px' }}>
                  <div className="stat-card glass-panel" style={{ cursor: 'pointer', border: membersSubTab === 'online' ? '1px solid var(--primary-accent)' : undefined }} onClick={() => setMembersSubTab('online')}>
                    <div className="stat-icon blue"><CreditCard size={22} /></div>
                    <div>
                      <span className="stat-label">Pending Online (TID)</span>
                      <h3 className="stat-value" style={{ color: paymentsData.stats?.pendingOnlineCount > 0 ? '#38bdf8' : 'inherit' }}>
                        {paymentsData.stats?.pendingOnlineCount || 0}
                      </h3>
                    </div>
                  </div>

                  <div className="stat-card glass-panel" style={{ cursor: 'pointer', border: membersSubTab === 'cash' ? '1px solid #10b981' : undefined }} onClick={() => setMembersSubTab('cash')}>
                    <div className="stat-icon green"><Banknote size={22} /></div>
                    <div>
                      <span className="stat-label">Pending Cash Passes</span>
                      <h3 className="stat-value" style={{ color: paymentsData.stats?.pendingCashCount > 0 ? '#10b981' : 'inherit' }}>
                        {paymentsData.stats?.pendingCashCount || 0}
                      </h3>
                    </div>
                  </div>

                  <div className="stat-card glass-panel" style={{ cursor: 'pointer', border: membersSubTab === 'directory' ? '1px solid #a855f7' : undefined }} onClick={() => setMembersSubTab('directory')}>
                    <div className="stat-icon purple"><Users size={22} /></div>
                    <div>
                      <span className="stat-label">Enrolled Members</span>
                      <h3 className="stat-value">{enrolledMembers.length}</h3>
                    </div>
                  </div>

                  <div className="stat-card glass-panel">
                    <div className="stat-icon orange"><DollarSign size={22} /></div>
                    <div>
                      <span className="stat-label">Total Verified Revenue</span>
                      <h3 className="stat-value">Rs. {Number(paymentsData.stats?.totalCollected || 0).toLocaleString('en-US')}</h3>
                    </div>
                  </div>
                </div>

                {/* Sub Tab Navigation */}
                <div style={{ display: 'flex', gap: '10px', marginBottom: '22px', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px', flexWrap: 'wrap' }}>
                  <button
                    type="button"
                    className={`btn btn-sm ${membersSubTab === 'online' ? 'btn-primary' : 'btn-outline'}`}
                    onClick={() => setMembersSubTab('online')}
                    style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                  >
                    <CreditCard size={15} />
                    <span>Pending Online TIDs</span>
                    {Boolean(paymentsData.stats?.pendingOnlineCount > 0) && (
                      <span style={{ background: '#ef4444', color: '#fff', padding: '1px 6px', borderRadius: '10px', fontSize: '0.72rem', fontWeight: 700 }}>
                        {paymentsData.stats.pendingOnlineCount}
                      </span>
                    )}
                  </button>

                  <button
                    type="button"
                    className={`btn btn-sm ${membersSubTab === 'cash' ? 'btn-primary' : 'btn-outline'}`}
                    onClick={() => setMembersSubTab('cash')}
                    style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                  >
                    <Banknote size={15} />
                    <span>Pending Cash Passes</span>
                    {Boolean(paymentsData.stats?.pendingCashCount > 0) && (
                      <span style={{ background: '#10b981', color: '#fff', padding: '1px 6px', borderRadius: '10px', fontSize: '0.72rem', fontWeight: 700 }}>
                        {paymentsData.stats.pendingCashCount}
                      </span>
                    )}
                  </button>

                  <button
                    type="button"
                    className={`btn btn-sm ${membersSubTab === 'directory' ? 'btn-primary' : 'btn-outline'}`}
                    onClick={() => setMembersSubTab('directory')}
                    style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                  >
                    <Users size={15} />
                    <span>Active Members Directory ({enrolledMembers.length})</span>
                  </button>
                </div>

                {/* SUB TAB 1: PENDING ONLINE TIDS */}
                {membersSubTab === 'online' && (
                  <div>
                    {paymentsData.pendingOnline?.length === 0 ? (
                      <div className="glass-panel" style={{ padding: '40px', textAlign: 'center' }}>
                        <CheckCircle size={44} color="#10b981" style={{ margin: '0 auto 12px' }} />
                        <h4 style={{ margin: '0 0 6px', color: 'var(--text-primary)' }}>All Online Payments Verified</h4>
                        <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.88rem' }}>
                          There are currently no trainee online payments or TIDs awaiting confirmation.
                        </p>
                      </div>
                    ) : (
                      <div style={{ display: 'grid', gap: '16px' }}>
                        {paymentsData.pendingOnline.map((item) => (
                          <div key={item._id} className="glass-panel" style={{ padding: '18px 20px', borderRadius: '14px', border: '1px solid rgba(59, 130, 246, 0.3)' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px', marginBottom: '12px' }}>
                              <div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                  <h4 style={{ margin: 0, fontSize: '1.05rem', color: 'var(--text-primary)' }}>{item.userName}</h4>
                                  <span style={{ background: 'rgba(59, 130, 246, 0.15)', color: '#38bdf8', padding: '2px 8px', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 600 }}>
                                    {item.membershipType} Pass
                                  </span>
                                </div>
                                <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
                                  📧 {item.customerEmail || 'No email provided'} | 📞 {item.customerPhone || 'No phone provided'}
                                </div>
                              </div>

                              <div style={{ textAlign: 'right' }}>
                                <div style={{ fontSize: '1.3rem', fontWeight: 800, color: 'var(--primary-accent)' }}>
                                  Rs. {Number(item.amount).toLocaleString('en-US')}
                                </div>
                                <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                                  Submitted {new Date(item.createdAt).toLocaleString()}
                                </span>
                              </div>
                            </div>

                            <div style={{
                              display: 'grid',
                              gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                              gap: '12px',
                              background: 'var(--card-bg-light, rgba(255,255,255,0.03))',
                              padding: '12px 16px',
                              borderRadius: '10px',
                              marginBottom: '14px',
                              fontSize: '0.84rem'
                            }}>
                              <div>
                                <span style={{ color: 'var(--text-secondary)', display: 'block', fontSize: '0.75rem' }}>Transaction ID (TID)</span>
                                <strong style={{ color: 'var(--text-primary)', fontFamily: 'monospace', fontSize: '0.95rem' }}>
                                  {item.transactionRef || 'N/A'}
                                </strong>
                              </div>
                              <div>
                                <span style={{ color: 'var(--text-secondary)', display: 'block', fontSize: '0.75rem' }}>Payment Method</span>
                                <strong style={{ color: 'var(--text-primary)' }}>{item.paymentMethod}</strong>
                              </div>
                              <div>
                                <span style={{ color: 'var(--text-secondary)', display: 'block', fontSize: '0.75rem' }}>Facility / Branch</span>
                                <strong style={{ color: 'var(--text-primary)' }}>{item.gymName}</strong>
                              </div>
                              <div>
                                <span style={{ color: 'var(--text-secondary)', display: 'block', fontSize: '0.75rem' }}>Requested Start Date</span>
                                <strong style={{ color: item.joiningDate && new Date(item.joiningDate) > new Date() ? '#38bdf8' : 'var(--text-primary)' }}>
                                  {item.joiningDate ? new Date(item.joiningDate).toLocaleDateString() : 'Immediate (Today)'}
                                </strong>
                              </div>
                            </div>

                            {item.screenshotUrl && (item.screenshotUrl.startsWith('http') || item.screenshotUrl.startsWith('data:')) && (
                              <div style={{ marginBottom: '14px' }}>
                                <a href={item.screenshotUrl} target="_blank" rel="noopener noreferrer" style={{ fontSize: '0.82rem', color: '#38bdf8', textDecoration: 'underline' }}>
                                  🖼️ View Payment Screenshot Proof
                                </a>
                              </div>
                            )}

                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                              <button
                                type="button"
                                className="btn btn-outline btn-sm"
                                onClick={() => handleRejectPayment(item._id)}
                                disabled={paymentActionLoading === item._id}
                                style={{ color: '#ef4444', borderColor: 'rgba(239, 68, 68, 0.4)' }}
                              >
                                Reject
                              </button>
                              <button
                                type="button"
                                className="btn btn-primary btn-sm"
                                onClick={() => handleConfirmPayment(item._id, false)}
                                disabled={paymentActionLoading === item._id}
                                style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                              >
                                {paymentActionLoading === item._id ? 'Verifying...' : (
                                  <>
                                    <CheckCircle size={15} /> Verify TID & Activate Member
                                  </>
                                )}
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* SUB TAB 2: PENDING CASH PASSES */}
                {membersSubTab === 'cash' && (
                  <div>
                    {paymentsData.pendingCash?.length === 0 ? (
                      <div className="glass-panel" style={{ padding: '40px', textAlign: 'center' }}>
                        <Banknote size={44} color="var(--text-secondary)" style={{ margin: '0 auto 12px' }} />
                        <h4 style={{ margin: '0 0 6px', color: 'var(--text-primary)' }}>No Pending Cash Bookings</h4>
                        <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.88rem' }}>
                          Trainees who select "Cash (Pay at Gym)" on your gym profile will appear here with their pass code.
                        </p>
                      </div>
                    ) : (
                      <div style={{ display: 'grid', gap: '16px' }}>
                        {paymentsData.pendingCash.map((item) => (
                          <div key={item._id} className="glass-panel" style={{ padding: '18px 20px', borderRadius: '14px', border: '1px solid rgba(16, 185, 129, 0.3)' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px', marginBottom: '12px' }}>
                              <div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                  <h4 style={{ margin: 0, fontSize: '1.05rem', color: 'var(--text-primary)' }}>{item.userName}</h4>
                                  <span style={{ background: 'rgba(16, 185, 129, 0.15)', color: '#10b981', padding: '2px 8px', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 600 }}>
                                    Cash at Counter
                                  </span>
                                </div>
                                <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
                                  📞 {item.customerPhone || 'Contact at arrival'} | 🏛️ {item.gymName}
                                </div>
                              </div>

                              <div style={{ textAlign: 'right' }}>
                                <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Amount to Collect:</span>
                                <div style={{ fontSize: '1.35rem', fontWeight: 800, color: '#10b981' }}>
                                  Rs. {Number(item.amount).toLocaleString('en-US')}
                                </div>
                              </div>
                            </div>

                            <div style={{
                              display: 'grid',
                              gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                              gap: '12px',
                              background: 'var(--card-bg-light, rgba(255,255,255,0.03))',
                              padding: '12px 16px',
                              borderRadius: '10px',
                              marginBottom: '14px',
                              fontSize: '0.84rem'
                            }}>
                              <div>
                                <span style={{ color: 'var(--text-secondary)', display: 'block', fontSize: '0.75rem' }}>Pass Code</span>
                                <strong style={{ color: 'var(--primary-accent)', fontFamily: 'monospace', fontSize: '1rem' }}>
                                  {item.trackingCode || item.paymentId}
                                </strong>
                              </div>
                              <div>
                                <span style={{ color: 'var(--text-secondary)', display: 'block', fontSize: '0.75rem' }}>Plan Requested</span>
                                <strong style={{ color: 'var(--text-primary)' }}>{item.membershipType} Pass</strong>
                              </div>
                              <div>
                                <span style={{ color: 'var(--text-secondary)', display: 'block', fontSize: '0.75rem' }}>Planned Join Date</span>
                                <strong style={{ color: 'var(--text-primary)' }}>
                                  {item.joiningDate ? new Date(item.joiningDate).toLocaleDateString() : 'Today'}
                                </strong>
                              </div>
                              <div>
                                <span style={{ color: 'var(--text-secondary)', display: 'block', fontSize: '0.75rem' }}>Reserved At</span>
                                <span style={{ color: 'var(--text-secondary)' }}>{new Date(item.createdAt).toLocaleDateString()}</span>
                              </div>
                            </div>

                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                              <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                                💡 When trainee visits gym desk and pays cash, click confirm to activate their membership.
                              </p>

                              <div style={{ display: 'flex', gap: '10px' }}>
                                <button
                                  type="button"
                                  className="btn btn-outline btn-sm"
                                  onClick={() => handleRejectPayment(item._id)}
                                  disabled={paymentActionLoading === item._id}
                                  style={{ color: '#ef4444', borderColor: 'rgba(239, 68, 68, 0.4)' }}
                                >
                                  Cancel Pass
                                </button>
                                <button
                                  type="button"
                                  className="btn btn-primary btn-sm"
                                  onClick={() => handleConfirmPayment(item._id, true)}
                                  disabled={paymentActionLoading === item._id}
                                  style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: '#10b981', borderColor: '#10b981' }}
                                >
                                  {paymentActionLoading === item._id ? 'Confirming...' : (
                                    <>
                                      <CheckCircle size={15} /> Confirm Cash Received & Activate
                                    </>
                                  )}
                                </button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* SUB TAB 3: ACTIVE MEMBERS DIRECTORY */}
                {membersSubTab === 'directory' && (
                  <div className="glass-panel" style={{ padding: '22px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                      <h4 style={{ margin: 0, fontSize: '1.05rem', color: 'var(--text-primary)' }}>
                        All Enrolled & Subscribed Trainees ({enrolledMembers.length})
                      </h4>
                    </div>

                    {enrolledMembers.length === 0 ? (
                      <div style={{ textAlign: 'center', padding: '30px', color: 'var(--text-secondary)' }}>
                        <Users size={36} style={{ marginBottom: '10px' }} />
                        <p style={{ margin: 0 }}>No active members enrolled yet.</p>
                      </div>
                    ) : (
                      <div className="table-responsive">
                        <table className="owner-table">
                          <thead>
                            <tr>
                              <th>Trainee</th>
                              <th>Facility</th>
                              <th>Plan</th>
                              <th>Start Date</th>
                              <th>Valid Until</th>
                              <th>Status</th>
                            </tr>
                          </thead>
                          <tbody>
                            {enrolledMembers.map((m) => (
                              <tr key={m._id}>
                                <td>
                                  <div>
                                    <strong style={{ color: 'var(--text-primary)' }}>{m.name}</strong>
                                    <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                                      {m.phone !== 'N/A' ? m.phone : m.email}
                                    </div>
                                  </div>
                                </td>
                                <td>{m.gymName}</td>
                                <td>
                                  <span style={{
                                    background: 'rgba(59, 130, 246, 0.1)',
                                    color: '#38bdf8',
                                    padding: '2px 8px',
                                    borderRadius: '6px',
                                    fontSize: '0.75rem',
                                    fontWeight: 600
                                  }}>
                                    {m.membershipType} Pass
                                  </span>
                                </td>
                                <td>{m.joiningDate ? new Date(m.joiningDate).toLocaleDateString() : 'N/A'}</td>
                                <td>{m.expiresAt ? new Date(m.expiresAt).toLocaleDateString() : 'Active'}</td>
                                <td>
                                  <span style={{
                                    padding: '2px 8px',
                                    borderRadius: '6px',
                                    fontSize: '0.75rem',
                                    fontWeight: 600,
                                    background: m.status === 'Active' ? 'rgba(16, 185, 129, 0.15)' : m.status === 'Upcoming' ? 'rgba(59, 130, 246, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                                    color: m.status === 'Active' ? '#10b981' : m.status === 'Upcoming' ? '#38bdf8' : '#ef4444'
                                  }}>
                                    {m.status}
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* ATTENDANCE TAB */}
            {activeTab === 'attendance' && (
              <div className="glass-panel" style={{ padding: '24px' }}>
                <h3>Today's Member Attendance Log</h3>
                <p style={{ color: 'var(--text-secondary)', marginBottom: '20px' }}>Track member visits in real-time</p>

                {dashboardData?.todayAttendance?.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '30px' }}>
                    <Clock size={40} color="var(--text-secondary)" style={{ marginBottom: '12px' }} />
                    <p style={{ color: 'var(--text-secondary)' }}>No member check-ins recorded today yet.</p>
                  </div>
                ) : (
                  <div className="table-responsive">
                    <table className="owner-table">
                      <thead>
                        <tr>
                          <th>Member Name</th>
                          <th>Check-In Time</th>
                          <th>Status</th>
                          <th>Notes</th>
                          <th>Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {dashboardData?.todayAttendance?.map(log => (
                          <tr key={log._id}>
                            <td><strong>{log.memberName}</strong></td>
                            <td style={{ color: 'var(--text-secondary)' }}>
                              {new Date(log.checkInTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </td>
                            <td>
                              <span className={`status-pill ${log.status === 'CheckedIn' ? 'active' : 'inactive'}`}>
                                {log.status}
                              </span>
                            </td>
                            <td style={{ color: 'var(--text-secondary)' }}>{log.notes || '-'}</td>
                            <td>
                              {log.status === 'CheckedIn' ? (
                                <button 
                                  className="btn btn-outline btn-sm"
                                  onClick={() => handleCheckOut(log._id)}
                                >
                                  Check Out
                                </button>
                              ) : (
                                <span style={{ color: '#10b981', fontSize: '0.85rem' }}>Completed</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* WORKOUT & DIET PLANS TAB */}
            {activeTab === 'plans' && (
              <div className="glass-panel" style={{ padding: '24px' }}>
                <h3>Create Custom Plan for Member</h3>
                <p style={{ color: 'var(--text-secondary)', marginBottom: '20px' }}>Assign personalized workout routines or diet schedules</p>

                <form onSubmit={handleCreatePlan} style={{ display: 'flex', flexDirection: 'column', gap: '16px', maxWidth: '600px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '6px' }}>Member Name</label>
                    <input 
                      type="text" 
                      required 
                      className="search-input" 
                      placeholder="Member Name (e.g. Sarah Connor)"
                      value={planForm.memberName}
                      onChange={e => setPlanForm({ ...planForm, memberName: e.target.value })}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '6px' }}>Plan Type</label>
                    <select 
                      className="search-input"
                      value={planForm.planType}
                      onChange={e => setPlanForm({ ...planForm, planType: e.target.value })}
                    >
                      <option value="Workout">Workout Routine</option>
                      <option value="Diet">Diet & Meal Plan</option>
                    </select>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '6px' }}>Plan Title</label>
                    <input 
                      type="text" 
                      required 
                      className="search-input" 
                      placeholder="e.g. 4-Week Hypertrophy Routine"
                      value={planForm.title}
                      onChange={e => setPlanForm({ ...planForm, title: e.target.value })}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '6px' }}>Plan Details & Instructions</label>
                    <textarea 
                      rows={4} 
                      required 
                      className="search-input"
                      style={{ resize: 'vertical' }} 
                      placeholder="Detail exercises, sets, reps, or meal choices..."
                      value={planForm.description}
                      onChange={e => setPlanForm({ ...planForm, description: e.target.value })}
                    />
                  </div>

                  <button type="submit" className="btn btn-primary" style={{ marginTop: '10px' }}>
                    Assign Plan to Member
                  </button>
                </form>
              </div>
            )}

            {/* FACILITY SETTINGS TAB */}
            {activeTab === 'settings' && (
              <div className="glass-panel" style={{ padding: '24px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                  <div>
                    <h3>Facility Information</h3>
                    <p style={{ color: 'var(--text-secondary)', margin: 0 }}>Update public gym info displayed on Explore Gyms page</p>
                  </div>
                  {dashboardData?.gym?._id && dashboardData.gym._id !== 'gym_demo_id' && !isEditingGym && (
                    <button className="btn btn-outline btn-sm" onClick={() => setIsEditingGym(true)}>
                      <Edit size={16} /> Edit Gig
                    </button>
                  )}
                </div>

                {/* Branch Switcher for multiple facility locations */}
                {branches && branches.length > 1 && (
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    padding: '10px 14px',
                    background: 'var(--card-bg-light, rgba(255,255,255,0.03))',
                    border: '1px solid var(--border-color, rgba(255,255,255,0.08))',
                    borderRadius: '10px',
                    marginBottom: '20px',
                    flexWrap: 'wrap'
                  }}>
                    <Building size={16} color="#3b82f6" />
                    <span style={{ fontSize: '0.84rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Managing Facility:</span>
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                      {branches.map(br => {
                        const isCurrent = dashboardData?.gym?._id === br._id;
                        return (
                          <button
                            key={br._id}
                            type="button"
                            onClick={() => {
                              fetchDashboardData(br._id);
                              setIsEditingGym(false);
                            }}
                            className={`btn btn-sm ${isCurrent ? 'btn-primary' : 'btn-outline'}`}
                            style={{ fontSize: '0.8rem', padding: '4px 10px' }}
                          >
                            {br.branchName || br.name} {isCurrent ? '✓' : ''}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {dashboardData?.gym?._id && dashboardData.gym._id !== 'gym_demo_id' && !isEditingGym ? (
                  <div className="gym-gig-display">
                    {dashboardData.gym.equipmentImages?.[0] && (
                      <div style={{ width: '100%', height: '200px', borderRadius: '12px', overflow: 'hidden', marginBottom: '20px' }}>
                        <img src={getSafeImageUrl(dashboardData.gym.equipmentImages[0])} alt="Gym Cover" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      </div>
                    )}
                    <h2 style={{ marginBottom: '10px' }}>{dashboardData.gym.name}</h2>
                    <p style={{ color: 'var(--text-secondary)', marginBottom: '15px' }}>
                      {dashboardData.gym.address || dashboardData.gym.location}
                      {dashboardData.gym.city ? `, ${dashboardData.gym.city}` : ''}
                      {dashboardData.gym.country ? `, ${dashboardData.gym.country}` : ''}
                    </p>
                    <div style={{ display: 'flex', gap: '20px', marginBottom: '20px', flexWrap: 'wrap' }}>
                      <div><strong>Monthly Fee:</strong> Rs. {dashboardData.gym.monthlyFee}</div>
                      <div><strong>Admission Fee:</strong> Rs. {dashboardData.gym.admissionFee || 0}</div>
                      <div><strong>Security Deposit:</strong> Rs. {dashboardData.gym.securityDeposit || 0} {dashboardData.gym.securityDepositRefundable !== false ? '(Refundable)' : '(Non-Refundable)'}</div>
                      <div><strong>Yearly Plan:</strong> {(dashboardData.gym.offersYearlyPlan || dashboardData.gym.yearlyDiscountPercent > 0) ? `Offered (${dashboardData.gym.yearlyDiscountPercent || 0}% discount)` : 'Not Offered (Monthly Only)'}</div>
                    </div>
                    {/* Trainer Policy Summary */}
                    <div style={{ background: 'var(--card-bg-light, rgba(255,255,255,0.03))', padding: '12px 16px', borderRadius: '10px', marginBottom: '20px', border: '1px solid var(--border-color, rgba(255,255,255,0.1))' }}>
                      <h4 style={{ margin: '0 0 8px 0', fontSize: '0.95rem' }}>Trainer Policy</h4>
                      <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                        <div>
                          Guide Trainer: <strong style={{ color: dashboardData.gym.trainerPolicy?.guidanceTrainer ? '#10b981' : 'inherit' }}>{dashboardData.gym.trainerPolicy?.guidanceTrainer ? 'Yes (Free Guidance)' : 'No'}</strong>
                        </div>
                        <div>
                          Personal Trainer: <strong style={{ color: dashboardData.gym.trainerPolicy?.personalTrainer ? '#10b981' : 'inherit' }}>{dashboardData.gym.trainerPolicy?.personalTrainer ? `Available (Rs. ${dashboardData.gym.trainerPolicy?.personalTrainerMonthlyFee || 0}/mo)` : 'Not Available'}</strong>
                        </div>
                      </div>
                      {dashboardData.gym.trainerPolicy?.notes && (
                        <p style={{ margin: '8px 0 0 0', fontSize: '0.85rem', color: 'var(--text-secondary)', fontStyle: 'italic' }}>
                          "{dashboardData.gym.trainerPolicy.notes}"
                        </p>
                      )}
                    </div>
                    {dashboardData.gym.description && (
                      <div style={{ background: 'rgba(255,255,255,0.05)', padding: '15px', borderRadius: '12px', marginBottom: '20px' }}>
                        <h4 style={{ marginBottom: '10px', color: 'var(--primary-accent)' }}>Gym Description (Post Info)</h4>
                        <p style={{ whiteSpace: 'pre-wrap', margin: 0, lineHeight: '1.6' }}>{dashboardData.gym.description}</p>
                      </div>
                    )}
                    <div style={{ marginTop: '20px', paddingTop: '20px', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
                      <button className="btn" style={{ background: '#ef4444', color: 'white' }} onClick={() => setShowDeleteGymModal(true)}>
                        Delete Gym Gig
                      </button>
                    </div>
                  </div>
                ) : (
                  <form onSubmit={handleSaveGymProfile} style={{ display: 'flex', flexDirection: 'column', gap: '16px', maxWidth: '600px' }}>
                    {['Approved', 'Pending Review', 'Under Review', 'More Information Required'].includes(dashboardData?.gym?.approvalStatus) && (
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px',
                        padding: '12px 14px',
                        background: 'rgba(59, 130, 246, 0.08)',
                        border: '1px solid rgba(59, 130, 246, 0.25)',
                        borderRadius: '8px',
                        fontSize: '0.85rem',
                        color: 'var(--text-secondary)'
                      }}>
                        <Lock size={16} color="#3b82f6" style={{ flexShrink: 0 }} />
                        <span>
                          <strong>Branch Identity Locked ({dashboardData?.gym?.approvalStatus}):</strong> Gym Name and Location are bound to your verified facility registration and cannot be modified.
                        </span>
                      </div>
                    )}

                    <div>
                      <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '6px' }}>Gym Name</label>
                      <input 
                        type="text" 
                        required 
                        disabled={['Approved', 'Pending Review', 'Under Review', 'More Information Required'].includes(dashboardData?.gym?.approvalStatus)}
                        className="search-input" 
                        style={['Approved', 'Pending Review', 'Under Review', 'More Information Required'].includes(dashboardData?.gym?.approvalStatus) ? { opacity: 0.7, cursor: 'not-allowed', background: 'rgba(255,255,255,0.02)' } : {}}
                        value={gymProfile.name}
                        onChange={e => setGymProfile({ ...gymProfile, name: e.target.value })}
                        title={['Approved', 'Pending Review', 'Under Review', 'More Information Required'].includes(dashboardData?.gym?.approvalStatus) ? 'Locked under verification' : ''}
                      />
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '6px' }}>Location &amp; Address</label>
                      <input 
                        type="text" 
                        required 
                        disabled={['Approved', 'Pending Review', 'Under Review', 'More Information Required'].includes(dashboardData?.gym?.approvalStatus)}
                        className="search-input" 
                        style={['Approved', 'Pending Review', 'Under Review', 'More Information Required'].includes(dashboardData?.gym?.approvalStatus) ? { opacity: 0.7, cursor: 'not-allowed', background: 'rgba(255,255,255,0.02)' } : {}}
                        value={gymProfile.location}
                        onChange={e => setGymProfile({ ...gymProfile, location: e.target.value })}
                        title={['Approved', 'Pending Review', 'Under Review', 'More Information Required'].includes(dashboardData?.gym?.approvalStatus) ? 'Locked under verification' : ''}
                      />
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '15px' }}>
                      <div>
                        <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '6px' }}>Monthly Subscription Fee (Rs.)</label>
                        <input 
                          type="number" 
                          required 
                          min="0"
                          className="search-input" 
                          value={gymProfile.monthlyFee}
                          onChange={e => setGymProfile({ ...gymProfile, monthlyFee: e.target.value })}
                        />
                      </div>

                      <div>
                        <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '6px' }}>Admission Fee (Rs.)</label>
                        <input
                          type="number"
                          min="0"
                          className="search-input"
                          value={gymProfile.admissionFee}
                          onChange={e => setGymProfile({ ...gymProfile, admissionFee: e.target.value })}
                        />
                      </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '15px' }}>
                      <div>
                        <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '6px' }}>Security Deposit (Rs.)</label>
                        <input
                          type="number"
                          min="0"
                          className="search-input"
                          placeholder="e.g. 2000 (0 if none)"
                          value={gymProfile.securityDeposit}
                          onChange={e => setGymProfile({ ...gymProfile, securityDeposit: e.target.value })}
                        />
                        <label style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', marginTop: '8px', fontSize: '0.85rem', cursor: 'pointer', color: 'var(--text-secondary)' }}>
                          <input
                            type="checkbox"
                            checked={gymProfile.securityDepositRefundable}
                            onChange={e => setGymProfile({ ...gymProfile, securityDepositRefundable: e.target.checked })}
                          />
                          Refundable Security Deposit
                        </label>
                      </div>
                    </div>

                    {/* Optional Yearly Plan Toggle */}
                    <div style={{ background: 'var(--card-bg-light, rgba(255,255,255,0.03))', border: '1px solid var(--border-color, rgba(255,255,255,0.1))', borderRadius: '10px', padding: '16px', marginBottom: '20px' }}>
                      <label style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', fontSize: '0.9rem', fontWeight: 600, cursor: 'pointer' }}>
                        <input
                          type="checkbox"
                          checked={Boolean(gymProfile.offersYearlyPlan)}
                          onChange={e => setGymProfile({ 
                            ...gymProfile, 
                            offersYearlyPlan: e.target.checked,
                            yearlyDiscountPercent: e.target.checked ? (gymProfile.yearlyDiscountPercent || 0) : 0
                          })}
                        />
                        Offer Yearly Membership Package (Optional)
                      </label>
                      <p style={{ margin: '4px 0 0 24px', fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                        Gym memberships are monthly by default. Enable this only if you want to offer trainees a 12-month advance package.
                      </p>

                      {gymProfile.offersYearlyPlan && (
                        <div style={{ marginTop: '12px', marginLeft: '24px', maxWidth: '340px' }}>
                          <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '6px' }}>Yearly Package Discount (%)</label>
                          <input
                            type="number"
                            min="0"
                            max="50"
                            className="search-input"
                            placeholder="e.g. 15 (0 for regular 12-month fee)"
                            value={gymProfile.yearlyDiscountPercent}
                            onChange={e => setGymProfile({ ...gymProfile, yearlyDiscountPercent: e.target.value })}
                          />
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.76rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
                            <span>Max 50% discount</span>
                            {Number(gymProfile.monthlyFee) > 0 && (
                              <span style={{ color: '#10b981', fontWeight: 600 }}>
                                Yearly Total: Rs. {Math.round(Number(gymProfile.monthlyFee) * 12 * (1 - (Number(gymProfile.yearlyDiscountPercent) || 0) / 100)).toLocaleString()}/yr
                              </span>
                            )}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Trainer Policy Section */}
                    <div style={{ background: 'var(--card-bg-light, rgba(255,255,255,0.03))', border: '1px solid var(--border-color, rgba(255,255,255,0.1))', borderRadius: '10px', padding: '16px' }}>
                      <h4 style={{ margin: '0 0 12px 0', fontSize: '0.95rem' }}>Trainer Policy &amp; Services</h4>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        <label style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', fontSize: '0.88rem', cursor: 'pointer' }}>
                          <input
                            type="checkbox"
                            checked={gymProfile.guidanceTrainer}
                            onChange={e => setGymProfile({ ...gymProfile, guidanceTrainer: e.target.checked })}
                          />
                          Guide trainer available (free, general guidance)
                        </label>

                        <label style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', fontSize: '0.88rem', cursor: 'pointer' }}>
                          <input
                            type="checkbox"
                            checked={gymProfile.personalTrainer}
                            onChange={e => setGymProfile({ ...gymProfile, personalTrainer: e.target.checked })}
                          />
                          Personal trainer available
                        </label>

                        {gymProfile.personalTrainer && (
                          <div style={{ marginLeft: '24px', marginTop: '4px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                            <div>
                              <label style={{ display: 'block', fontSize: '0.83rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                                Personal trainer monthly fee (Rs.)
                              </label>
                              <input
                                type="number"
                                min="0"
                                className="search-input"
                                style={{ maxWidth: '300px' }}
                                value={gymProfile.personalTrainerMonthlyFee}
                                onChange={e => setGymProfile({ ...gymProfile, personalTrainerMonthlyFee: e.target.value })}
                              />
                            </div>
                          </div>
                        )}

                        <div>
                          <label style={{ display: 'block', fontSize: '0.83rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                            Trainer Policy Notes (Optional)
                          </label>
                          <input
                            type="text"
                            maxLength={300}
                            className="search-input"
                            placeholder="e.g. Free general guidance trainers always on duty; 1-on-1 PT packages available"
                            value={gymProfile.trainerNotes}
                            onChange={e => setGymProfile({ ...gymProfile, trainerNotes: e.target.value })}
                          />
                        </div>
                      </div>
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '6px' }}>Gym Description (Post Info)</label>
                      <textarea 
                        rows={3} 
                        className="search-input" 
                        value={gymProfile.description}
                        onChange={e => setGymProfile({ ...gymProfile, description: e.target.value })}
                      />
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '6px' }}>Bank Details</label>
                      <input
                        type="text"
                        className="search-input"
                        placeholder="Enter UPI, IBAN, account info for subscriptions"
                        value={gymProfile.bankDetails}
                        onChange={e => setGymProfile({ ...gymProfile, bankDetails: e.target.value })}
                      />
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '6px' }}>Equipment Inventory List (Comma separated)</label>
                      <input
                        type="text"
                        className="search-input"
                        placeholder="Treadmills, Dumbbells, Smith Machine, Cable Crossover, Power Racks"
                        value={gymProfile.equipmentListStr}
                        onChange={e => setGymProfile({ ...gymProfile, equipmentListStr: e.target.value })}
                      />
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                      <div>
                        <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '6px' }}>Weekday Timings</label>
                        <input
                          type="text"
                          className="search-input"
                          placeholder="e.g. 6:00 AM - 10:00 PM"
                          value={gymProfile.weekdayTimings}
                          onChange={e => setGymProfile({ ...gymProfile, weekdayTimings: e.target.value })}
                        />
                      </div>
                      <div>
                        <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '6px' }}>Weekend Timings</label>
                        <input
                          type="text"
                          className="search-input"
                          placeholder="e.g. 8:00 AM - 8:00 PM"
                          value={gymProfile.weekendTimings}
                          onChange={e => setGymProfile({ ...gymProfile, weekendTimings: e.target.value })}
                        />
                      </div>
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '6px' }}>Upload Gym Photo</label>
                      <input
                        type="file"
                        accept="image/*"
                        className="search-input"
                        onChange={e => setPhotoFile(e.target.files?.[0] || null)}
                      />
                    </div>

                    <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                      <button type="submit" className="btn btn-primary" disabled={uploadingPhoto}>
                        {uploadingPhoto ? 'Saving...' : 'Save Facility Details'}
                      </button>
                      {dashboardData?.gym?._id && dashboardData.gym._id !== 'gym_demo_id' && (
                        <button type="button" className="btn btn-outline" onClick={() => setIsEditingGym(false)}>
                          Cancel
                        </button>
                      )}
                    </div>
                  </form>
                )}
              </div>
            )}

            {/* GYM TRAINERS TAB */}
            {activeTab === 'trainers' && (
              <div className="glass-panel" style={{ padding: '24px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                  <div>
                    <h3>Gym Trainers Directory</h3>
                    <p style={{ color: 'var(--text-secondary)', margin: 0 }}>Register and manage official trainers for {gymProfile.name || 'your gym'}</p>
                  </div>
                  <button className="btn btn-primary" onClick={() => setShowTrainerModal(true)}>
                    <Plus size={16} /> Register New Trainer
                  </button>
                </div>

                {showTrainerModal && (
                  <form
                    onSubmit={handleCreateTrainer}
                    className="glass-panel"
                    style={{
                      padding: '24px',
                      borderRadius: '12px',
                      marginBottom: '25px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '14px',
                      background: 'var(--card-bg-light)',
                      border: '1px solid var(--card-border)'
                    }}
                  >
                    <h4 style={{ margin: 0, color: 'var(--primary-accent)', fontSize: '1.05rem', fontWeight: 600 }}>Create Gym Trainer Credentials</h4>
                    <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                      Create login credentials for an official trainer assigned to {gymProfile.name || 'your gym'}.
                    </p>
                    <input type="text" required placeholder="Trainer Full Name" className="search-input" value={trainerForm.name} onChange={e => setTrainerForm({ ...trainerForm, name: e.target.value })} />
                    <input type="email" required placeholder="Trainer Email Address" className="search-input" value={trainerForm.email} onChange={e => setTrainerForm({ ...trainerForm, email: e.target.value })} />
                    <input type="password" required placeholder="Password" className="search-input" value={trainerForm.password} onChange={e => setTrainerForm({ ...trainerForm, password: e.target.value })} />
                    <div style={{ display: 'flex', gap: '10px', marginTop: '4px' }}>
                      <button type="submit" className="btn btn-primary">Create Trainer</button>
                      <button type="button" className="btn btn-outline" onClick={() => setShowTrainerModal(false)}>Cancel</button>
                    </div>
                  </form>
                )}

                <div className="table-responsive">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Trainer Name</th>
                        <th>Email</th>
                        <th>Role</th>
                        <th>Assigned Gym</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {trainers.length > 0 ? trainers.map(t => (
                        <tr key={t._id}>
                          <td><strong>{t.name}</strong></td>
                          <td>{t.email}</td>
                          <td><span className="category-badge">{t.role}</span></td>
                          <td>{t.assignedGymName || gymProfile.name}</td>
                          <td><span style={{ color: '#10b981', fontWeight: 600 }}>Active</span></td>
                        </tr>
                      )) : (
                        <tr>
                          <td colSpan="5" style={{ textAlign: 'center', padding: '30px', color: 'var(--text-secondary)' }}>
                            No trainers registered yet. Click "Register New Trainer" to create accounts for your gym staff.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* TOUR REQUESTS TAB */}
            {activeTab === 'tours' && (
              <div className="glass-panel" style={{ padding: '24px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
                  <div>
                    <h3 style={{ margin: 0 }}>Walkthrough Tour Inquiries</h3>
                    <p style={{ color: 'var(--text-secondary)', margin: '4px 0 0 0', fontSize: '0.88rem' }}>
                      Prospective members requesting in-person facility walkthroughs
                    </p>
                  </div>
                  <span className="badge" style={{ background: 'rgba(59,130,246,0.15)', color: '#60a5fa', padding: '6px 14px', borderRadius: '20px', fontSize: '0.82rem', fontWeight: 600 }}>
                    {tourRequests.filter(t => t.status === 'Pending').length} Pending Inquiries
                  </span>
                </div>

                {tourRequests.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-secondary)' }}>
                    <Calendar size={48} style={{ opacity: 0.3, margin: '0 auto 12px' }} />
                    <p>No tour booking inquiries received yet.</p>
                  </div>
                ) : (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '16px' }}>
                    {tourRequests.map(tour => (
                      <div key={tour._id} className="glass-panel" style={{ padding: '20px', border: '1px solid var(--border-color)', borderRadius: '12px', background: 'rgba(255,255,255,0.02)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                          <div>
                            <h4 style={{ margin: 0, fontSize: '1.05rem' }}>{tour.userName}</h4>
                            <span style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>{tour.userEmail}</span>
                          </div>
                          <span style={{ 
                            fontSize: '0.75rem', 
                            fontWeight: 'bold', 
                            padding: '4px 10px', 
                            borderRadius: '12px', 
                            background: tour.status === 'Confirmed' ? 'rgba(16,185,129,0.15)' : tour.status === 'Declined' ? 'rgba(239,68,68,0.15)' : 'rgba(245,158,11,0.15)',
                            color: tour.status === 'Confirmed' ? '#10b981' : tour.status === 'Declined' ? '#ef4444' : '#f59e0b'
                          }}>
                            {tour.status}
                          </span>
                        </div>

                        <div style={{ display: 'grid', gap: '8px', fontSize: '0.85rem', color: 'var(--text-primary)', marginBottom: '14px' }}>
                          <div><strong>📅 Date:</strong> {new Date(tour.tourDate).toLocaleDateString(undefined, { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' })}</div>
                          <div><strong>⏰ Time Slot:</strong> {tour.timeSlot}</div>
                          {tour.userPhone && <div><strong>📞 Phone:</strong> {tour.userPhone}</div>}
                          {tour.notes && <div><strong>📝 Notes:</strong> <em>"{tour.notes}"</em></div>}
                        </div>

                        {tour.status === 'Pending' && (
                          <div style={{ display: 'flex', gap: '10px' }}>
                            <button 
                              className="btn btn-primary btn-sm" 
                              style={{ flex: 1 }}
                              onClick={() => handleUpdateTourStatus(tour._id, 'Confirmed')}
                            >
                              Confirm Tour
                            </button>
                            <button 
                              className="btn btn-outline btn-sm" 
                              style={{ flex: 1, borderColor: '#ef4444', color: '#ef4444' }}
                              onClick={() => handleUpdateTourStatus(tour._id, 'Declined')}
                            >
                              Decline
                            </button>
                          </div>
                        )}
                        {tour.status === 'Confirmed' && (
                          <button 
                            className="btn btn-outline btn-sm w-100" 
                            onClick={() => handleUpdateTourStatus(tour._id, 'Completed')}
                          >
                            Mark Walkthrough Completed
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </>
        )}
        
        {activeTab === 'equipment' && dashboardData && (
          <EquipmentManager gymData={dashboardData.gym} onEquipmentUpdated={fetchDashboardData} />
        )}
        
        {activeTab === 'offers' && (
          <OffersManager />
        )}
      </div>
    </div>
      <ConfirmDialog
        isOpen={showDeleteGymModal}
        title="Delete Gym Gig"
        message="Are you sure you want to delete your Gym Gig? This will permanently remove your gym profile, subscription offerings, and associated data. This action cannot be undone."
        confirmText="Delete Gym"
        confirmVariant="danger"
        typedConfirmation="DELETE"
        loading={isDeletingGym}
        onConfirm={handleDeleteGym}
        onCancel={() => setShowDeleteGymModal(false)}
      />
      <ConfirmDialog
        isOpen={Boolean(branchToDelete)}
        title="Remove Gym Branch"
        message={`Are you sure you want to remove the branch "${branchToDelete?.branchName || branchToDelete?.name}"? All associated verification documents and data for this branch will be permanently deleted.`}
        confirmText="Remove Branch"
        confirmVariant="danger"
        loading={isDeletingBranch}
        onConfirm={handleDeleteBranch}
        onCancel={() => setBranchToDelete(null)}
      />
      {showBranchModal && (
        <BranchVerificationModal
          branch={selectedBranchForModal}
          onClose={() => {
            setShowBranchModal(false);
            setSelectedBranchForModal(null);
          }}
          onBranchUpdated={() => {
            fetchBranches();
            fetchDashboardData();
          }}
        />
      )}
      {viewingApplicationBranch && (
        <BranchApplicationViewModal
          branch={viewingApplicationBranch}
          onClose={() => setViewingApplicationBranch(null)}
          onManageBranch={(branch) => {
            fetchDashboardData(branch._id);
            setActiveTab('settings');
            setIsEditingGym(false);
          }}
        />
      )}
      {showPaymentModal && branchToPay && (
        <AnnualFeeModal
          isOpen={showPaymentModal}
          branch={branchToPay}
          onClose={() => {
            setShowPaymentModal(false);
            setBranchToPay(null);
          }}
          onSuccess={() => {
            fetchBranches();
            fetchDashboardData();
          }}
        />
      )}
    </DashboardShell>
  );
};

export default GymOwnerDashboard;
