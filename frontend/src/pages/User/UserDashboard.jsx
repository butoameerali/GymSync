import React, { useState, useEffect } from 'react';
import { Activity, Dumbbell, Flame, MapPin, Calendar, Award, AlertTriangle, FileText, ChevronRight, PlusCircle, Building } from 'lucide-react';
import { toast } from 'react-toastify';
import { useNavigate } from 'react-router-dom';
import SkeletonLoader from '../../components/common/SkeletonLoader';
import ComplaintModal from '../../components/common/ComplaintModal';
import DashboardShell from '../../components/layout/DashboardShell';
import StatCard from '../../components/ui/StatCard';
import './UserDashboard.css';

const UserDashboard = () => {
  const [activeTab, setActiveTab] = useState('overview'); // 'overview', 'plans', 'complaints'
  const [userData, setUserData] = useState(null);
  const [workoutProgress, setWorkoutProgress] = useState(null);
  const [gymData, setGymData] = useState(null);
  const [userComplaints, setUserComplaints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isComplaintModalOpen, setIsComplaintModalOpen] = useState(false);
  const [selectedComplaint, setSelectedComplaint] = useState(null);
  const [chatInput, setChatInput] = useState('');

  const navigate = useNavigate();
  const userName = localStorage.getItem('gymsync_user_name') || 'Fitness User';

  useEffect(() => {
    fetchUserData();
  }, []);

  const fetchUserData = async () => {
    setLoading(true);
    const token = localStorage.getItem('gymsync_token') || '';
    const headers = token ? { 'Authorization': `Bearer ${token}` } : {};

    try {
      // Fetch user dashboard analytics
      const res = await fetch(`/api/users/dashboard/${userName}`, { headers });
      if (res.ok) {
        const data = await res.json();
        setUserData(data);
      }

      // Fetch server authoritative workout progress
      const progressRes = await fetch('/api/users/workout-progress', { headers });
      if (progressRes.ok) {
        const pData = await progressRes.json();
        setWorkoutProgress(pData);
      }

      // Fetch user gym membership data & assigned plans
      const gymRes = await fetch(`/api/gyms/my-gym-data/${userName}`, { headers });
      if (gymRes.ok) {
        const gData = await gymRes.json();
        setGymData(gData);
      }

      // Fetch user submitted complaints
      const complaintsRes = await fetch('/api/complaints', { headers });
      if (complaintsRes.ok) {
        const allComplaints = await complaintsRes.json();
        setUserComplaints(Array.isArray(allComplaints) ? allComplaints.filter(c => c && c.reporterName === userName) : []);
      }
    } catch (err) {
      console.error('Error fetching user dashboard:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSendChatMessage = async (complaintId) => {
    if (!chatInput.trim()) return;
    try {
      const res = await fetch(`/api/complaints/${complaintId}/chat`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('gymsync_token') || ''}`
        },
        body: JSON.stringify({ text: chatInput, senderName: userName })
      });
      if (res.ok) {
        setChatInput('');
        toast.success('Reply sent to complaint thread');
        fetchUserData();
        
        // Update selected complaint in memory
        const updatedChat = await res.json();
        if (selectedComplaint && selectedComplaint._id === complaintId) {
          setSelectedComplaint({ ...selectedComplaint, chatMessages: updatedChat });
        }
      }
    } catch (err) {
      toast.error('Failed to send message');
    }
  };

  return (
    <DashboardShell
      userRole="User"
      userName={userName}
      title="User Fitness Portal"
      subtitle="Track your workouts, gym membership, and assigned training plans"
      activeTab={activeTab}
      onTabChange={setActiveTab}
    >
      <div className="user-dashboard-page">
        {/* Header */}
      <div className="user-dashboard-header glass-panel">
        <div className="container header-flex">
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div className="user-avatar-badge">
              <Activity size={32} color="#3b82f6" />
            </div>
            <div>
              <h2>Welcome back, {userName}!</h2>
              <p>Track your workouts, gym memberships, custom plans, and platform tickets.</p>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
            <button 
              className="btn btn-outline btn-sm"
              onClick={() => setIsComplaintModalOpen(true)}
            >
              <AlertTriangle size={16} /> File Report / Complaint
            </button>
            <button 
              className="btn btn-primary btn-sm"
              onClick={() => navigate('/ai-trainer')}
            >
              Launch AI Trainer <ChevronRight size={16} />
            </button>
          </div>
        </div>

        <div className="container" style={{ marginTop: '20px' }}>
          <div className="user-nav-tabs">
            <button 
              className={`tab-btn ${activeTab === 'overview' ? 'active' : ''}`}
              onClick={() => setActiveTab('overview')}
            >
              Overview & Progress
            </button>
            <button 
              className={`tab-btn ${activeTab === 'plans' ? 'active' : ''}`}
              onClick={() => setActiveTab('plans')}
            >
              <FileText size={16} /> Assigned Workout & Diet Plans
            </button>
            <button 
              className={`tab-btn ${activeTab === 'complaints' ? 'active' : ''}`}
              onClick={() => setActiveTab('complaints')}
            >
              <AlertTriangle size={16} /> My Reports & Complaints ({userComplaints.length})
            </button>
          </div>
        </div>
      </div>

      <div className="container user-dashboard-content">
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
            {activeTab === 'overview' && (() => {
              const totalWorkouts = workoutProgress?.completedDays?.length ?? userData?.stats?.totalWorkouts ?? 0;
              const caloriesBurned = userData?.stats?.caloriesBurned ?? (totalWorkouts * 240);
              const runningDistance = userData?.stats?.runningDistanceKm ?? 0;
              const streak = workoutProgress?.streak ?? userData?.stats?.currentStreakDays ?? 0;
              
              const cachedPlan = (() => {
                try {
                  const userKey = userName.replace(/\s+/g, '_');
                  return JSON.parse(localStorage.getItem(`gymsync_${userKey}_ai_plan`) || 'null');
                } catch (e) {
                  return null;
                }
              })();
              const todayDayItem = cachedPlan?.interactive_calendar?.[0];

              return (
                <div className="overview-container">
                  {/* Stats Grid */}
                  <div className="stats-grid">
                    <div className="stat-card glass-panel">
                      <div className="stat-icon blue"><Dumbbell size={24} /></div>
                      <div>
                        <span className="stat-label">Total Workouts</span>
                        <h3 className="stat-value">{totalWorkouts}</h3>
                      </div>
                    </div>

                    <div className="stat-card glass-panel">
                      <div className="stat-icon amber"><Flame size={24} /></div>
                      <div>
                        <span className="stat-label">Est. Calories Burned</span>
                        <h3 className="stat-value">{caloriesBurned} kcal</h3>
                      </div>
                    </div>

                    <div className="stat-card glass-panel">
                      <div className="stat-icon green"><Activity size={24} /></div>
                      <div>
                        <span className="stat-label">Outdoor Run Distance</span>
                        <h3 className="stat-value">{runningDistance} km</h3>
                      </div>
                    </div>

                    <div className="stat-card glass-panel">
                      <div className="stat-icon purple"><Award size={24} /></div>
                      <div>
                        <span className="stat-label">Current Active Streak</span>
                        <h3 className="stat-value">{streak} Days 🔥</h3>
                      </div>
                    </div>
                  </div>

                  {/* Today's Workout Command Center Card */}
                  <div className="glass-panel" style={{ padding: '24px', marginTop: '24px', border: '1px solid rgba(59, 130, 246, 0.3)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                          <span className="badge" style={{ background: 'rgba(59,130,246,0.15)', color: '#60a5fa', padding: '4px 10px', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 'bold' }}>
                            TODAY'S MISSION
                          </span>
                        </div>
                        <h3 style={{ margin: '0 0 6px 0', fontSize: '1.25rem' }}>
                          {todayDayItem?.workout_title || "Full Body Readiness & Hypertrophy"}
                        </h3>
                        <p style={{ color: 'var(--text-secondary)', margin: 0, fontSize: '0.88rem' }}>
                          {workoutProgress?.completedDays?.includes(1)
                            ? "✅ Today's workout completed! Great job on your consistency."
                            : `${todayDayItem?.exercises?.length || 4} Exercises scheduled • AI form verification & sequential tracking enabled.`}
                        </p>
                      </div>
                      <button 
                        className="btn btn-primary"
                        style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 20px', fontSize: '0.95rem' }}
                        onClick={() => navigate('/ai-trainer')}
                      >
                        <Dumbbell size={18} />
                        {workoutProgress?.completedDays?.includes(1) ? "Review Today's Workout" : "Start Today's Workout"}
                      </button>
                    </div>
                  </div>

                  {/* Quick Action Hub */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px', marginTop: '20px' }}>
                    <div className="glass-panel" onClick={() => navigate('/ai-trainer')} style={{ cursor: 'pointer', padding: '16px', textAlign: 'center', border: '1px solid var(--border-color)', background: 'rgba(255,255,255,0.02)', borderRadius: '12px' }}>
                      <Dumbbell size={24} color="#3b82f6" style={{ margin: '0 auto 8px' }} />
                      <div style={{ fontWeight: '600', fontSize: '0.9rem' }}>Workout Hub</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>AI & Manual Sets</div>
                    </div>
                    <div className="glass-panel" onClick={() => navigate('/running')} style={{ cursor: 'pointer', padding: '16px', textAlign: 'center', border: '1px solid var(--border-color)', background: 'rgba(255,255,255,0.02)', borderRadius: '12px' }}>
                      <Activity size={24} color="#10b981" style={{ margin: '0 auto 8px' }} />
                      <div style={{ fontWeight: '600', fontSize: '0.9rem' }}>Outdoor Run</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Live GPS Tracker</div>
                    </div>
                    <div className="glass-panel" onClick={() => navigate('/explore')} style={{ cursor: 'pointer', padding: '16px', textAlign: 'center', border: '1px solid var(--border-color)', background: 'rgba(255,255,255,0.02)', borderRadius: '12px' }}>
                      <MapPin size={24} color="#f59e0b" style={{ margin: '0 auto 8px' }} />
                      <div style={{ fontWeight: '600', fontSize: '0.9rem' }}>Find Gyms</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Discovery & Tours</div>
                    </div>
                    <div className="glass-panel" onClick={() => setActiveTab('plans')} style={{ cursor: 'pointer', padding: '16px', textAlign: 'center', border: '1px solid var(--border-color)', background: 'rgba(255,255,255,0.02)', borderRadius: '12px' }}>
                      <FileText size={24} color="#a855f7" style={{ margin: '0 auto 8px' }} />
                      <div style={{ fontWeight: '600', fontSize: '0.9rem' }}>My Routines</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Assigned Programs</div>
                    </div>
                  </div>

                  {/* Gym Membership Card */}
                  {gymData?.gym?.name || userData?.user?.subscribedGymName ? (
                    <div className="glass-panel" style={{ padding: '24px', marginTop: '24px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <Building size={28} color="var(--primary-accent)" />
                          <div>
                            <h3 style={{ margin: 0 }}>{gymData?.gym?.name || userData?.user?.subscribedGymName}</h3>
                            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                              {gymData?.membershipType || userData?.user?.gymMembershipType || 'Active Pass'} • Subscribed
                            </p>
                          </div>
                        </div>
                        <button className="btn btn-outline btn-sm" onClick={() => navigate('/your-gym')}>
                          View Gym Facilities <ChevronRight size={16} />
                        </button>
                      </div>
                      <div style={{ background: 'rgba(255,255,255,0.03)', padding: '16px', borderRadius: '12px' }}>
                        <p style={{ color: 'var(--text-primary)', margin: 0 }}>
                          <strong>Today's Facility Tip:</strong> {gymData?.gym?.todayTrainingTip?.today || "Dynamic warm-up recommended before heavy lifting. Keep hydrated."}
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="glass-panel" style={{ padding: '24px', marginTop: '24px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                          <div style={{ padding: '12px', borderRadius: '12px', background: 'rgba(255,255,255,0.04)' }}>
                            <Building size={28} color="var(--text-secondary)" />
                          </div>
                          <div>
                            <h3 style={{ margin: '0 0 4px 0' }}>No Active Gym Membership</h3>
                            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', margin: 0 }}>
                              Find certified fitness centers, schedule physical facility tours, and train with professional trainers.
                            </p>
                          </div>
                        </div>
                        <button className="btn btn-primary btn-sm" onClick={() => navigate('/explore')}>
                          <MapPin size={16} /> Explore Nearby Gyms
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })()}

            {/* ASSIGNED PLANS TAB */}
            {activeTab === 'plans' && (
              <div className="glass-panel" style={{ padding: '24px' }}>
                <h3>Assigned Workout & Nutrition Routines</h3>
                <p style={{ color: 'var(--text-secondary)', marginBottom: '20px' }}>Plans assigned by your Gym Owner, Trainer, or GymSync AI Trainer</p>

                {gymData?.plans && gymData.plans.length > 0 ? (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px' }}>
                    {gymData.plans.map((p, idx) => (
                      <div key={p._id || idx} className="glass-panel" style={{ padding: '20px', background: 'rgba(59, 130, 246, 0.05)', border: '1px solid rgba(59, 130, 246, 0.2)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                          <span className="feature-tag" style={{ background: p.planType === 'Diet' ? '#10b981' : 'var(--primary-accent)', color: '#fff' }}>{p.planType || 'Workout'} Routine</span>
                          <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Assigned by {p.assignedBy || 'Gym Owner'}</span>
                        </div>
                        <h4>{p.title}</h4>
                        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', margin: '10px 0' }}>
                          {p.description}
                        </p>
                        <button className="btn btn-primary btn-sm" onClick={() => navigate('/your-gym')}>
                          View Full Routine on Your Gym Page
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px' }}>
                    <div className="glass-panel" style={{ padding: '20px', background: 'rgba(59, 130, 246, 0.05)', border: '1px solid rgba(59, 130, 246, 0.2)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                        <span className="feature-tag" style={{ background: 'var(--primary-accent)', color: 'var(--text-primary)' }}>Workout Routine</span>
                        <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Standard Template</span>
                      </div>
                      <h4>4-Week Hypertrophy & Power Plan</h4>
                      <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', margin: '10px 0' }}>
                        3 sets of Push-ups, Bodyweight Squats, Romanian Deadlifts, and 45s Planks.
                      </p>
                      <button className="btn btn-outline btn-sm" onClick={() => navigate('/ai-trainer')}>
                        Generate AI Plan
                      </button>
                    </div>

                    <div className="glass-panel" style={{ padding: '20px', background: 'rgba(16, 185, 129, 0.05)', border: '1px solid rgba(16, 185, 129, 0.2)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                        <span className="feature-tag" style={{ background: '#10b981', color: 'var(--text-primary)' }}>Nutrition Plan</span>
                        <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>AI Prescription</span>
                      </div>
                      <h4>High-Protein Recovery Diet</h4>
                      <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', margin: '10px 0' }}>
                        Target: 2,200 kcal | 160g Protein. Oats, lean chicken breast, eggs, and electrolytes.
                      </p>
                      <button className="btn btn-outline btn-sm" onClick={() => navigate('/ai-trainer')}>
                        View Nutrition Guide
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* MY COMPLAINTS TAB */}
            {activeTab === 'complaints' && (
              <div className="glass-panel" style={{ padding: '24px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                  <div>
                    <h3>My Submitted Reports & Complaints</h3>
                    <p style={{ color: 'var(--text-secondary)' }}>Track review status and moderator replies</p>
                  </div>
                  <button className="btn btn-primary btn-sm" onClick={() => setIsComplaintModalOpen(true)}>
                    <PlusCircle size={16} /> File New Complaint
                  </button>
                </div>

                {userComplaints.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '40px' }}>
                    <AlertTriangle size={40} color="var(--text-secondary)" style={{ marginBottom: '12px' }} />
                    <p style={{ color: 'var(--text-secondary)' }}>You haven't filed any complaints yet.</p>
                  </div>
                ) : (
                  <div className="table-responsive">
                    <table className="user-table">
                      <thead>
                        <tr>
                          <th>Report ID</th>
                          <th>Target Type</th>
                          <th>Reason</th>
                          <th>Status</th>
                          <th>Moderator Reply</th>
                          <th>Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {userComplaints.map(complaint => (
                          <tr key={complaint._id}>
                            <td><strong>{complaint.complaintId}</strong></td>
                            <td>{complaint.reportedEntityType} ({complaint.reportedEntityTitle})</td>
                            <td style={{ color: 'var(--text-secondary)' }}>{complaint.reason}</td>
                            <td>
                              <span className={`status-pill ${complaint.status?.toLowerCase()}`}>
                                {complaint.status}
                              </span>
                            </td>
                            <td style={{ color: 'var(--text-secondary)' }}>
                              {complaint.adminReply || 'Pending moderator review'}
                            </td>
                            <td>
                              <button className="btn btn-outline btn-sm" onClick={() => setSelectedComplaint(complaint)}>
                                View Chat
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

      {/* Complaint Submission Modal */}
      <ComplaintModal 
        isOpen={isComplaintModalOpen}
        onClose={() => {
          setIsComplaintModalOpen(false);
          fetchUserData();
        }}
      />

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
              placeholder="Type message to admin..."
              value={chatInput}
              onChange={e => setChatInput(e.target.value)}
            />
            <button className="btn btn-primary" onClick={() => handleSendChatMessage(selectedComplaint?._id)}>
              Send
            </button>
          </div>
        </div>
      </Modal>
    </div>
    </DashboardShell>
  );
};

export default UserDashboard;
