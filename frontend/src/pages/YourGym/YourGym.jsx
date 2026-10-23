import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  Dumbbell, 
  Calendar, 
  FileText, 
  Activity, 
  MessageSquare, 
  AlertCircle, 
  CheckCircle, 
  Check, 
  Clock, 
  Sparkles,
  MapPin,
  ArrowRight
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import './YourGym.css';

const YourGym = () => {
  const [gymData, setGymData] = useState(null);
  const [plans, setPlans] = useState([]);
  const [attendance, setAttendance] = useState([]);
  const [posts, setPosts] = useState([]);
  const [membership, setMembership] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('updates'); // 'updates', 'plans', 'equipment', 'attendance'
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelSuccessMsg, setCancelSuccessMsg] = useState('');
  const { user } = useAuth();
  const navigate = useNavigate();

  const [isSubscribed, setIsSubscribed] = useState(() => Boolean(localStorage.getItem('gymsync_user_gym')));

  useEffect(() => {
    let isMounted = true;
    if (isSubscribed) {
      const userName = user?.name || localStorage.getItem('gymsync_user_name');
      
      const timeoutId = setTimeout(() => {
        if (isMounted) {
          setError("Request timed out while fetching gym data.");
          setLoading(false);
        }
      }, 10000);

      const token = localStorage.getItem('gymsync_token');
      fetch(`/api/gyms/my-gym-data/${encodeURIComponent(userName || '')}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      })
        .then(async res => {
          if (!res.ok) {
            const body = await res.json().catch(() => ({}));
            throw new Error(body.message || "Failed to fetch gym data");
          }
          return res.json();
        })
        .then(data => {
          clearTimeout(timeoutId);
          if (isMounted) {
            if (!data.message && data.gym) {
              setGymData(data.gym);
              setPlans(data.plans || []);
              setAttendance(data.attendanceLogs || []);
              setPosts(data.posts || []);
              setMembership(data.membership || null);
            } else {
              setError("No active gym data found for your account.");
            }
            setLoading(false);
          }
        })
        .catch(err => {
          clearTimeout(timeoutId);
          if (isMounted) {
            if (err.message === 'No active gym membership was found for this account.') {
              localStorage.removeItem('gymsync_user_gym');
              setIsSubscribed(false);
              return;
            }
            setError(err.message || "Failed to load gym data");
            setLoading(false);
          }
        });
    } else {
      setLoading(false);
    }

    return () => { isMounted = false; };
  }, [isSubscribed, user]);

  if (!isSubscribed) {
    return (
      <div className="your-gym-page">
        <div className="gym-hero-card" style={{ textAlign: 'center', padding: '48px 24px', alignItems: 'center' }}>
          <div className="gym-hero-icon" style={{ margin: '0 auto 16px' }}>
            <Dumbbell size={32} />
          </div>
          <h2 style={{ fontSize: '1.6rem', color: 'var(--text-primary)', margin: '0 0 8px 0' }}>Your Gym Portal</h2>
          <p style={{ color: 'var(--text-secondary)', maxWidth: '480px', margin: '0 auto 24px', lineHeight: 1.6 }}>
            You haven't joined a verified gym facility yet. Join a fitness center on GymSync to access assigned routines, trainer guidance, and equipment tracking.
          </p>
          <Link to="/explore" className="btn btn-primary">
            Explore Gyms to Join <ArrowRight size={16} />
          </Link>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="your-gym-page" style={{ textAlign: 'center', padding: '60px 0' }}>
        <div style={{ width: '40px', height: '40px', border: '3px solid var(--primary-accent)', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 16px' }}></div>
        <p style={{ color: 'var(--text-secondary)' }}>Loading your gym facility data...</p>
      </div>
    );
  }

  if (error || !gymData) {
    return (
      <div className="your-gym-page">
        <div className="gym-hero-card" style={{ textAlign: 'center', padding: '40px 24px', alignItems: 'center' }}>
          <Activity size={48} color="#ef4444" style={{ marginBottom: '16px' }} />
          <h2 style={{ color: 'var(--text-primary)', marginBottom: '10px' }}>Facility Information</h2>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '24px', maxWidth: '480px' }}>
            {error || "Could not retrieve facility details at this moment."}
          </p>
          <Link to="/home" className="btn btn-primary">Return to Home</Link>
        </div>
      </div>
    );
  }

  const togglePlanCompletion = async (planId, scheduleId) => {
    try {
      const token = localStorage.getItem('gymsync_token');
      const res = await fetch(`/api/gyms/plans/${planId}/schedule/${scheduleId}/complete`, { 
        method: 'PUT', 
        headers: token ? { Authorization: `Bearer ${token}` } : {} 
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      setPlans(current => current.map(plan => plan._id !== planId ? plan : {
        ...plan,
        schedule: plan.schedule.map(day => day._id === scheduleId ? { ...day, completedAt: data.completedAt } : day)
      }));
    } catch (err) { 
      setError(err.message || 'Could not update routine completion'); 
    }
  };

  const updateAutoRenew = async (autoRenew) => {
    try {
      const token = localStorage.getItem('gymsync_token');
      const res = await fetch('/api/users/membership-settings', { 
        method: 'PUT', 
        headers: { 
          'Content-Type': 'application/json', 
          ...(token ? { Authorization: `Bearer ${token}` } : {}) 
        }, 
        body: JSON.stringify({ autoRenew }) 
      });
      if (!res.ok) throw new Error('Could not update renewal preference');
      setMembership(current => ({ ...current, autoRenew }));
      setCancelSuccessMsg('');
    } catch (err) { 
      setError(err.message); 
    }
  };

  const handleCancelRenewal = async () => {
    try {
      const token = localStorage.getItem('gymsync_token');
      const res = await fetch('/api/users/membership-settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ cancelRenewal: true })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Could not cancel renewal');
      setMembership(current => ({ ...current, autoRenew: false }));
      setCancelSuccessMsg(data.message || 'Auto-renewal cancelled successfully.');
    } catch (err) {
      setError(err.message);
    }
  };

  const daysToExpiry = membership?.expiresAt ? Math.ceil((new Date(membership.expiresAt) - new Date()) / 86400000) : null;

  return (
    <div className="your-gym-page">
      {/* ── GYM HERO CARD ──────────────────────────────────────────────── */}
      <div className="gym-hero-card">
        <div className="gym-hero-header">
          <div className="gym-hero-icon">
            <Dumbbell size={32} />
          </div>
          <div className="gym-hero-info">
            <h1 className="gym-hero-name">
              {gymData.name || 'Your Gym Facility'}
              <span className="gym-badge-active">
                <Check size={12} /> Active Membership
              </span>
              {gymData.trainerIncluded && (
                <span className="gym-badge-trainer">
                  <Sparkles size={12} /> Trainer Included
                </span>
              )}
            </h1>
            {gymData.location && (
              <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '5px' }}>
                <MapPin size={14} /> {gymData.location}
              </span>
            )}
            <div className="gym-hero-actions">
              <Link to="/ai-trainer" className="btn btn-primary btn-sm">
                <Dumbbell size={16} /> Go to Workout Hub
              </Link>
              <button
                type="button"
                className="btn btn-outline btn-sm"
                onClick={() => navigate(`/messages?contact=${encodeURIComponent(gymData.ownerName || gymData.name || 'Gym')}`)}
              >
                <MessageSquare size={16} /> Message Gym
              </button>
            </div>
          </div>
        </div>

        {/* Membership Details & Auto-renew Banner */}
        {membership?.expiresAt && (
          <div className="membership-banner">
            <div className="membership-banner-details">
              <span className="membership-banner-title">
                {membership.type || 'Standard'} Plan · Expires {new Date(membership.expiresAt).toLocaleDateString()}
                {daysToExpiry <= 7 && daysToExpiry >= 0 && (
                  <span style={{ color: '#f59e0b', marginLeft: '6px' }}>({daysToExpiry} days remaining)</span>
                )}
              </span>
              <span className="membership-banner-sub">
                Auto-renewal: {membership.autoRenew ? (
                  <strong style={{ color: '#10b981' }}>Active</strong>
                ) : (
                  <strong style={{ color: 'var(--text-secondary)' }}>Off (No upcoming charges)</strong>
                )}
              </span>
            </div>
            <div>
              {membership.autoRenew ? (
                <button
                  type="button"
                  className="btn btn-sm btn-outline"
                  style={{ borderColor: '#ef4444', color: '#ef4444' }}
                  onClick={() => setShowCancelModal(true)}
                >
                  Cancel Renewal
                </button>
              ) : (
                <button
                  type="button"
                  className="btn btn-sm btn-outline"
                  style={{ borderColor: '#10b981', color: '#10b981' }}
                  onClick={() => updateAutoRenew(true)}
                >
                  Enable Auto-Renew
                </button>
              )}
            </div>
          </div>
        )}

        {cancelSuccessMsg && (
          <div style={{ color: '#10b981', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <CheckCircle size={15} /> {cancelSuccessMsg}
          </div>
        )}
      </div>

      {/* ── TABS NAVIGATION ────────────────────────────────────────────── */}
      <div className="your-gym-tabs">
        <button
          type="button"
          className={`your-gym-tab-btn ${activeTab === 'updates' ? 'active' : ''}`}
          onClick={() => setActiveTab('updates')}
        >
          <Activity size={16} /> Updates & Posts ({posts.length})
        </button>
        <button
          type="button"
          className={`your-gym-tab-btn ${activeTab === 'plans' ? 'active' : ''}`}
          onClick={() => setActiveTab('plans')}
        >
          <FileText size={16} /> Assigned Plans ({plans.length})
        </button>
        <button
          type="button"
          className={`your-gym-tab-btn ${activeTab === 'equipment' ? 'active' : ''}`}
          onClick={() => setActiveTab('equipment')}
        >
          <Dumbbell size={16} /> Equipment Status ({gymData.equipmentStatus?.length || 0})
        </button>
        <button
          type="button"
          className={`your-gym-tab-btn ${activeTab === 'attendance' ? 'active' : ''}`}
          onClick={() => setActiveTab('attendance')}
        >
          <Calendar size={16} /> Attendance Log ({attendance.length})
        </button>
      </div>

      {/* ── TAB CONTENT ────────────────────────────────────────────────── */}
      {/* 1. Updates & Posts Tab */}
      {activeTab === 'updates' && (
        <div className="gym-section-card">
          <h2 className="gym-section-title">
            <Activity size={20} color="var(--primary-accent)" /> Gym Announcements & Feed
          </h2>
          {posts.length === 0 ? (
            <div className="gym-empty-state">
              <Activity size={36} className="gym-empty-icon" />
              <p>No recent announcements posted by {gymData.name || 'your gym'} yet.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {posts.map((post, idx) => (
                <div key={idx} className="gym-list-item">
                  <p style={{ margin: 0, fontSize: '0.95rem', color: 'var(--text-primary)', lineHeight: 1.6 }}>
                    {post.content}
                  </p>
                  <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                    {new Date(post.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 2. Assigned Plans Tab */}
      {activeTab === 'plans' && (
        <div className="gym-section-card">
          <h2 className="gym-section-title">
            <FileText size={20} color="#10b981" /> Workout & Diet Routines
          </h2>
          {plans.length === 0 ? (
            <div className="gym-empty-state">
              <FileText size={36} className="gym-empty-icon" />
              <p>No custom plans have been assigned to your profile by trainers yet.</p>
              <Link to="/ai-trainer" className="btn btn-outline btn-sm">
                Generate with AI Trainer
              </Link>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {plans.map((plan, idx) => (
                <div key={idx} className="gym-list-item">
                  <h4 style={{ margin: '0 0 4px 0', color: plan.planType === 'Diet' ? 'var(--primary-accent)' : '#10b981' }}>
                    {plan.planType}: {plan.title}
                  </h4>
                  <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', margin: 0, whiteSpace: 'pre-wrap' }}>
                    {plan.description}
                  </p>
                  {plan.schedule?.map((day, sIdx) => (
                    <div key={sIdx} style={{ marginTop: '10px', paddingTop: '8px', borderTop: '1px solid var(--card-border)' }}>
                      <strong style={{ fontSize: '0.86rem', color: 'var(--text-primary)' }}>
                        {day.date ? new Date(day.date).toLocaleDateString() : day.day || 'Routine'}
                      </strong>
                      {day.exercises?.length > 0 && (
                        <p style={{ margin: '4px 0', fontSize: '0.84rem', color: 'var(--text-secondary)' }}>
                          {day.exercises.map(ex => `${ex.name} (${ex.sets || 3} sets)`).join(', ')}
                        </p>
                      )}
                      {day._id && (
                        <button 
                          className="btn btn-sm btn-outline" 
                          style={{ marginTop: '6px' }}
                          onClick={() => togglePlanCompletion(plan._id, day._id)}
                        >
                          {day.completedAt ? 'Completed ✓ (Undo)' : 'Mark Day Completed'}
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 3. Equipment Status Tab */}
      {activeTab === 'equipment' && (
        <div className="gym-section-card">
          <h2 className="gym-section-title">
            <Dumbbell size={20} color="#f59e0b" /> Facilities & Equipment Tracking
          </h2>
          {!gymData.equipmentStatus || gymData.equipmentStatus.length === 0 ? (
            <div className="gym-empty-state">
              <Dumbbell size={36} className="gym-empty-icon" />
              <p>Equipment tracking has not been configured by the facility owner yet.</p>
            </div>
          ) : (
            <div className="equipment-grid">
              {gymData.equipmentStatus.map((eq, idx) => (
                <div key={idx} className="gym-list-item" style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <strong style={{ fontSize: '0.95rem', color: 'var(--text-primary)' }}>{eq.name}</strong>
                    <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                      Qty: {eq.quantity} {eq.notes && `· ${eq.notes}`}
                    </div>
                  </div>
                  <span className={`equipment-badge ${eq.status === 'Available' ? 'available' : 'maintenance'}`}>
                    {eq.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 4. Attendance Log Tab */}
      {activeTab === 'attendance' && (
        <div className="gym-section-card">
          <h2 className="gym-section-title">
            <Calendar size={20} color="var(--primary-accent)" /> Member Check-In History
          </h2>
          {attendance.length === 0 ? (
            <div className="gym-empty-state">
              <Calendar size={36} className="gym-empty-icon" />
              <p>No check-in entries recorded for your membership yet.</p>
            </div>
          ) : (
            <div className="attendance-grid">
              {attendance.map((log, idx) => (
                <div key={idx} className="attendance-pill">
                  <h4 style={{ margin: '0 0 4px 0', fontSize: '0.9rem', color: 'var(--text-primary)' }}>
                    {new Date(log.checkInTime).toLocaleDateString()}
                  </h4>
                  <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Clock size={12} /> In: {new Date(log.checkInTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                  {log.checkOutTime && (
                    <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px' }}>
                      <Clock size={12} /> Out: {new Date(log.checkOutTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Cancel Confirmation Modal */}
      {showCancelModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: '20px' }}>
          <div className="gym-section-card" style={{ maxWidth: '440px', width: '100%', border: '1px solid rgba(239, 68, 68, 0.4)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#ef4444' }}>
              <AlertCircle size={24} />
              <h3 style={{ margin: 0, fontSize: '1.2rem', color: 'var(--text-primary)' }}>Cancel Auto-Renewal?</h3>
            </div>
            <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', lineHeight: 1.6, margin: 0 }}>
              Your membership will remain active until the end of the current billing cycle. Auto-charge will be deactivated immediately.
            </p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '8px' }}>
              <button
                type="button"
                className="btn btn-outline btn-sm"
                onClick={() => setShowCancelModal(false)}
              >
                Keep Active
              </button>
              <button
                type="button"
                className="btn btn-primary btn-sm"
                style={{ background: '#ef4444', borderColor: '#ef4444', color: '#ffffff' }}
                onClick={async () => {
                  await handleCancelRenewal();
                  setShowCancelModal(false);
                }}
              >
                Confirm Deactivate
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default YourGym;
