import React, { useState, useEffect } from 'react';
import { Building, Users, Calendar, DollarSign, Plus, CheckCircle, Clock, Edit, FileText, Dumbbell, Activity, UserCheck } from 'lucide-react';
import { toast } from 'react-toastify';
import SkeletonLoader from '../../components/common/SkeletonLoader';
import Modal from '../../components/common/Modal';
import './GymOwnerDashboard.css';

const GymOwnerDashboard = () => {
  const [activeTab, setActiveTab] = useState('overview'); // 'overview', 'attendance', 'plans', 'settings'
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isEditingGym, setIsEditingGym] = useState(false);

  // Form states
  const [checkInName, setCheckInName] = useState('');
  const [checkInNotes, setCheckInNotes] = useState('');

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
    bankDetails: '',
    description: 'A premium fitness facility.'
  });

  const ownerName = localStorage.getItem('gymsync_user_name') || 'Gym Owner';

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/gym-owner/dashboard/${ownerName}`, {
        headers: {
          'x-user-name': ownerName,
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
            bankDetails: data.gym.bankDetails || '',
            description: data.gym.description || ''
          });
        }
      }
    } catch (err) {
      console.error('Error fetching Gym Owner data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCheckInSubmit = async (e) => {
    e.preventDefault();
    if (!checkInName.trim()) {
      toast.error('Please enter a member name');
      return;
    }

    try {
      const res = await fetch('/api/gym-owner/attendance/check-in', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'x-user-name': ownerName,
          'Authorization': `Bearer ${localStorage.getItem('gymsync_token') || ''}`
        },
        body: JSON.stringify({
          gymId: dashboardData?.gym?._id || 'gym_demo_id',
          memberName: checkInName.trim(),
          notes: checkInNotes
        })
      });

      if (res.ok) {
        const newLog = await res.json();
        toast.success(`Check-in recorded for ${checkInName}`);
        setCheckInName('');
        setCheckInNotes('');
        setDashboardData(prev => ({
          ...prev,
          todayAttendanceCount: (prev?.todayAttendanceCount || 0) + 1,
          todayAttendance: [newLog, ...(prev?.todayAttendance || [])]
        }));
      }
    } catch (err) {
      toast.error('Check-in error');
    }
  };

  const handleCheckOut = async (attendanceId) => {
    try {
      const res = await fetch(`/api/gym-owner/attendance/check-out/${attendanceId}`, {
        method: 'PUT',
        headers: {
          'x-user-name': ownerName,
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
    } catch (err) {
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
          'x-user-name': ownerName,
          'Authorization': `Bearer ${localStorage.getItem('gymsync_token') || ''}`
        },
        body: JSON.stringify({
          name: gymProfile.name,
          location: gymProfile.location,
          monthlyFee: Number(gymProfile.monthlyFee),
          admissionFee: Number(gymProfile.admissionFee),
          bankDetails: gymProfile.bankDetails,
          description: gymProfile.description
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
              'x-user-name': ownerName,
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
      }
    } catch (err) {
      toast.error('Error saving gym details');
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleDeleteGym = async () => {
    if (!window.confirm('Are you sure you want to delete your Gym Gig? This cannot be undone.')) return;
    try {
      const gymId = dashboardData?.gym?._id;
      if (!gymId || gymId === 'gym_demo_id') return;

      const res = await fetch(`/api/gym-owner/gym/${gymId}`, {
        method: 'DELETE',
        headers: { 
          'x-user-name': ownerName,
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
      } else {
        toast.error('Failed to delete gym');
      }
    } catch (err) {
      toast.error('Error deleting gym');
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
          'x-user-name': ownerName,
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
    } catch (err) {
      toast.error('Failed to create plan');
    }
  };

  return (
    <div className="gym-owner-page">
      {/* Header */}
      <div className="gym-owner-header glass-panel">
        <div className="container header-flex">
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div className="gym-owner-icon">
              <Building size={32} color="#8b5cf6" />
            </div>
            <div>
              <h2>Gym Owner Control Panel</h2>
              <p>{dashboardData?.gym?.name || 'GymSync Partner Facility'}</p>
            </div>
          </div>

          <div className="owner-nav-tabs">
            <button 
              className={`tab-btn ${activeTab === 'overview' ? 'active' : ''}`}
              onClick={() => setActiveTab('overview')}
            >
              Overview
            </button>
            <button 
              className={`tab-btn ${activeTab === 'attendance' ? 'active' : ''}`}
              onClick={() => setActiveTab('attendance')}
            >
              <UserCheck size={16} /> Attendance
            </button>
            <button 
              className={`tab-btn ${activeTab === 'plans' ? 'active' : ''}`}
              onClick={() => setActiveTab('plans')}
            >
              <FileText size={16} /> Member Plans
            </button>
            <button 
              className={`tab-btn ${activeTab === 'settings' ? 'active' : ''}`}
              onClick={() => setActiveTab('settings')}
            >
              <Edit size={16} /> Facility Info
            </button>
          </div>
        </div>
      </div>

      <div className="container owner-content">
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
                {/* 10-Day Payment Warning Banner for 50% Subscription Feature Discount */}
                <div style={{ background: 'rgba(245, 158, 11, 0.15)', border: '1px solid rgba(245, 158, 11, 0.4)', borderRadius: '14px', padding: '16px 20px', marginBottom: '24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
                  <div>
                    <h4 style={{ color: '#f59e0b', margin: '0 0 4px 0', fontSize: '1.05rem', fontWeight: '700' }}>
                      ⚠️ Gym 50% Subscription Discount Status: Active (10-Day Warning Period)
                    </h4>
                    <p style={{ color: 'var(--text-secondary)', margin: 0, fontSize: '0.9rem' }}>
                      Your members enjoy 50% off AI Trainer, Diet Plans & Fitness Notifications. Please keep monthly feature payments up-to-date to prevent account suspension.
                    </p>
                  </div>
                  <span className="status-pill pending" style={{ fontSize: '0.85rem' }}>10 Days Warning</span>
                </div>

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
                      <h3 className="stat-value">${dashboardData?.stats?.monthlyRevenue ?? 0}</h3>
                    </div>
                  </div>

                  <div className="stat-card glass-panel">
                    <div className="stat-icon amber"><DollarSign size={24} /></div>
                    <div>
                      <span className="stat-label">15% GymSync Commission Owed</span>
                      <h3 className="stat-value" style={{ color: '#f59e0b' }}>${(dashboardData?.stats?.commission15PercentOwed || 0).toFixed(2)}</h3>
                    </div>
                  </div>
                </div>

                {/* Quick Attendance Action */}
                <div className="glass-panel" style={{ padding: '24px', marginTop: '30px' }}>
                  <h3>Member Express Check-In</h3>
                  <form onSubmit={handleCheckInSubmit} style={{ display: 'flex', gap: '12px', marginTop: '16px', flexWrap: 'wrap' }}>
                    <input 
                      type="text"
                      className="search-input"
                      style={{ flex: 1, minWidth: '200px' }}
                      placeholder="Enter Member Name..."
                      value={checkInName}
                      onChange={e => setCheckInName(e.target.value)}
                    />
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

                {dashboardData?.gym?._id && dashboardData.gym._id !== 'gym_demo_id' && !isEditingGym ? (
                  <div className="gym-gig-display">
                    {dashboardData.gym.equipmentImages?.[0] && (
                      <div style={{ width: '100%', height: '200px', borderRadius: '12px', overflow: 'hidden', marginBottom: '20px' }}>
                        <img src={dashboardData.gym.equipmentImages[0]} alt="Gym Cover" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      </div>
                    )}
                    <h2 style={{ marginBottom: '10px' }}>{dashboardData.gym.name}</h2>
                    <p style={{ color: 'var(--text-secondary)', marginBottom: '15px' }}>{dashboardData.gym.location}</p>
                    <div style={{ display: 'flex', gap: '20px', marginBottom: '20px' }}>
                      <div><strong>Monthly Fee:</strong> ${dashboardData.gym.monthlyFee}</div>
                      <div><strong>Admission Fee:</strong> ${dashboardData.gym.admissionFee || 0}</div>
                    </div>
                    {dashboardData.gym.description && (
                      <div style={{ background: 'rgba(255,255,255,0.05)', padding: '15px', borderRadius: '12px', marginBottom: '20px' }}>
                        <h4 style={{ marginBottom: '10px', color: 'var(--primary-accent)' }}>Gym Description (Post Info)</h4>
                        <p style={{ whiteSpace: 'pre-wrap', margin: 0, lineHeight: '1.6' }}>{dashboardData.gym.description}</p>
                      </div>
                    )}
                    <div style={{ marginTop: '20px', paddingTop: '20px', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
                      <button className="btn" style={{ background: '#ef4444', color: 'white' }} onClick={handleDeleteGym}>
                        Delete Gym Gig
                      </button>
                    </div>
                  </div>
                ) : (
                  <form onSubmit={handleSaveGymProfile} style={{ display: 'flex', flexDirection: 'column', gap: '16px', maxWidth: '600px' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '6px' }}>Gym Name</label>
                      <input 
                        type="text" 
                        required 
                        className="search-input" 
                        value={gymProfile.name}
                        onChange={e => setGymProfile({ ...gymProfile, name: e.target.value })}
                      />
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '6px' }}>Location & City</label>
                      <input 
                        type="text" 
                        required 
                        className="search-input" 
                        value={gymProfile.location}
                        onChange={e => setGymProfile({ ...gymProfile, location: e.target.value })}
                      />
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '6px' }}>Monthly Subscription Fee ($)</label>
                      <input 
                        type="number" 
                        required 
                        className="search-input" 
                        value={gymProfile.monthlyFee}
                        onChange={e => setGymProfile({ ...gymProfile, monthlyFee: e.target.value })}
                      />
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
                      <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '6px' }}>Admission Fee</label>
                      <input
                        type="number"
                        className="search-input"
                        value={gymProfile.admissionFee}
                        onChange={e => setGymProfile({ ...gymProfile, admissionFee: e.target.value })}
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
          </>
        )}
      </div>
    </div>
  );
};

export default GymOwnerDashboard;
