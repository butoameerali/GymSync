import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Dumbbell, Calendar, FileText, Activity } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const YourGym = () => {
  const [gymData, setGymData] = useState(null);
  const [plans, setPlans] = useState([]);
  const [attendance, setAttendance] = useState([]);
  const [posts, setPosts] = useState([]);
  const [membership, setMembership] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { user } = useAuth();

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
      }, 10000); // 10s fallback timeout

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
            console.error("Error fetching Gym Details", err);
            // A previous pending/failed payment could leave this browser flag
            // behind. Clear only that stale flag so the member sees the proper
            // membership state instead of a broken data page.
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
      <div className="container" style={{paddingTop: '150px', minHeight: '100vh', textAlign: 'center'}}>
        <div className="glass-panel" style={{padding: '50px', maxWidth: '600px', margin: '0 auto'}}>
          <Dumbbell size={64} color="var(--text-secondary)" style={{marginBottom: '20px'}}/>
          <h2 style={{marginBottom: '15px'}}>No Active Subscription</h2>
          <p style={{color: 'var(--text-secondary)', marginBottom: '30px'}}>You are not currently subscribed to any Gym on GymSync. Discover local gyms to unlock custom training plans and equipment guides.</p>
          <Link to="/explore" className="btn btn-primary">Explore Gyms Near You</Link>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="container" style={{paddingTop: '150px', minHeight: '100vh', textAlign: 'center'}}>
        <div style={{ width: '40px', height: '40px', border: '3px solid var(--primary-accent)', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 20px' }}></div>
        <p style={{ color: 'var(--text-secondary)' }}>Loading Dynamic Gym Data...</p>
      </div>
    );
  }

  if (error || !gymData) {
    return (
      <div className="container" style={{paddingTop: '150px', minHeight: '100vh', textAlign: 'center'}}>
        <div className="glass-panel" style={{padding: '50px', maxWidth: '600px', margin: '0 auto'}}>
          <Activity size={64} color="#ef4444" style={{marginBottom: '20px'}}/>
          <h2 style={{marginBottom: '15px'}}>Data Unavailable</h2>
          <p style={{color: 'var(--text-secondary)', marginBottom: '30px'}}>{error || "We couldn't retrieve your gym details. Your gym owner might not have published their data yet."}</p>
          <Link to="/home" className="btn btn-primary">Return Home</Link>
        </div>
      </div>
    );
  }

  const togglePlanCompletion = async (planId, scheduleId) => {
    try {
      const token = localStorage.getItem('gymsync_token');
      const res = await fetch(`/api/gyms/plans/${planId}/schedule/${scheduleId}/complete`, { method: 'PUT', headers: token ? { Authorization: `Bearer ${token}` } : {} });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      setPlans(current => current.map(plan => plan._id !== planId ? plan : { ...plan, schedule: plan.schedule.map(day => day._id === scheduleId ? { ...day, completedAt: data.completedAt } : day) }));
    } catch (err) { setError(err.message || 'Could not update routine completion'); }
  };

  const updateAutoRenew = async (autoRenew) => {
    try {
      const token = localStorage.getItem('gymsync_token');
      const res = await fetch('/api/users/membership-settings', { method: 'PUT', headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) }, body: JSON.stringify({ autoRenew }) });
      if (!res.ok) throw new Error('Could not update renewal preference');
      setMembership(current => ({ ...current, autoRenew }));
    } catch (err) { setError(err.message); }
  };

  const daysToExpiry = membership?.expiresAt ? Math.ceil((new Date(membership.expiresAt) - new Date()) / 86400000) : null;

  return (
    <div className="container" style={{ paddingTop: '100px', minHeight: '100vh', paddingBottom: '60px' }}>
      <div className="glass-panel" style={{ padding: '40px', marginBottom: '30px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px', marginBottom: '20px' }}>
          <div style={{ background: 'var(--accent-gradient)', padding: '20px', borderRadius: '12px' }}>
            <Dumbbell size={40} color="white" />
          </div>
          <div>
            <h1>{gymData.name || 'Your Premium Gym'}</h1>
            <p style={{ color: 'var(--primary-accent)', fontWeight: 'bold' }}>Active Membership</p>
          </div>
        </div>
        {membership?.expiresAt && <div style={{ padding: '14px', borderRadius: '10px', background: daysToExpiry <= 7 ? 'rgba(245, 158, 11, .15)' : 'rgba(16, 185, 129, .1)' }}>
          <strong>{membership.type || 'Membership'} membership</strong> · expires {new Date(membership.expiresAt).toLocaleDateString()}{daysToExpiry <= 7 && ` (${Math.max(daysToExpiry, 0)} days left)`}
          <label style={{ display: 'block', marginTop: '8px', fontSize: '.9rem' }}><input type="checkbox" checked={Boolean(membership.autoRenew)} onChange={event => updateAutoRenew(event.target.checked)} /> Auto-renew my membership</label>
        </div>}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '30px' }}>
        
        {/* Posts from Gym */}
        <div className="glass-panel" style={{ padding: '30px' }}>
          <h2 style={{ marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Activity size={24} color="#8b5cf6" /> Gym Updates & Posts
          </h2>
          {posts.length === 0 ? (
            <p style={{ color: 'var(--text-secondary)' }}>No recent updates from your gym.</p>
          ) : (
            <div style={{ display: 'grid', gap: '15px' }}>
              {posts.map((post, idx) => (
                <div key={idx} style={{ padding: '15px', background: 'rgba(255,255,255,0.05)', borderRadius: '12px' }}>
                  <p style={{ margin: 0, fontSize: '1rem', lineHeight: '1.5' }}>{post.content}</p>
                  <small style={{ color: 'var(--text-secondary)', display: 'block', marginTop: '10px' }}>
                    {new Date(post.createdAt).toLocaleDateString()}
                  </small>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Workout and Diet Plans */}
        <div className="glass-panel" style={{ padding: '30px' }}>
          <h2 style={{ marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <FileText size={24} color="#10b981" /> Assigned Plans
          </h2>
          {plans.length === 0 ? (
            <p style={{ color: 'var(--text-secondary)' }}>You don't have any custom plans assigned yet.</p>
          ) : (
            <div style={{ display: 'grid', gap: '15px' }}>
              {plans.map((plan, idx) => (
                <div key={idx} style={{ padding: '15px', background: 'rgba(255,255,255,0.05)', borderRadius: '12px' }}>
                  <h4 style={{ margin: '0 0 5px 0', color: plan.planType === 'Diet' ? '#3b82f6' : '#10b981' }}>
                    {plan.planType}: {plan.title}
                  </h4>
                  <p style={{ fontSize: '0.95rem', lineHeight: '1.5', color: 'var(--text-secondary)', whiteSpace: 'pre-wrap' }}>
                    {plan.description}
                  </p>
                  {plan.schedule?.map((day, scheduleIndex) => (
                    <div key={scheduleIndex} style={{ marginTop: '10px', paddingTop: '10px', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
                      <strong style={{ fontSize: '.88rem' }}>{day.date ? new Date(day.date).toLocaleDateString() : day.day || 'Scheduled routine'}</strong>
                      {day.exercises?.length > 0 && <p style={{ margin: '5px 0', fontSize: '.88rem', color: 'var(--text-secondary)' }}>{day.exercises.map(exercise => `${exercise.name}${exercise.sets ? ` (${exercise.sets} × ${exercise.reps || ''})` : ''}`).join(', ')}</p>}
                      {day.dietInstructions && <p style={{ margin: '5px 0 0', fontSize: '.88rem', color: '#60a5fa' }}>Diet: {day.dietInstructions}</p>}
                      {day._id && <button className="btn btn-sm btn-outline" style={{ marginTop: '8px' }} onClick={() => togglePlanCompletion(plan._id, day._id)}>{day.completedAt ? 'Completed ✓ (undo)' : 'Mark day complete'}</button>}
                    </div>
                  ))}
                  {plan.assignedBy && <small style={{ color: 'var(--text-secondary)' }}>Assigned by {plan.assignedBy}</small>}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Attendance Calendar Log */}
        <div className="glass-panel" style={{ padding: '30px', gridColumn: '1 / -1' }}>
          <h2 style={{ marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Calendar size={24} color="#f59e0b" /> Attendance Log
          </h2>
          {attendance.length === 0 ? (
            <p style={{ color: 'var(--text-secondary)' }}>You have no recorded check-ins yet.</p>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '15px' }}>
              {attendance.map((log, idx) => (
                <div key={idx} style={{ padding: '15px', background: 'rgba(255,255,255,0.05)', borderRadius: '12px', borderLeft: `4px solid ${log.status === 'CheckedIn' ? '#10b981' : '#8b5cf6'}` }}>
                  <h4 style={{ margin: '0 0 5px 0' }}>{new Date(log.checkInTime).toLocaleDateString()}</h4>
                  <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                    Check-in: {new Date(log.checkInTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                  {log.checkOutTime && (
                    <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                      Check-out: {new Date(log.checkOutTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  )}
                  {log.notes && (
                    <p style={{ margin: '8px 0 0 0', fontSize: '0.9rem', fontStyle: 'italic', color: '#cbd5e1' }}>
                      "{log.notes}"
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

      </div>

      <div style={{ marginTop: '40px', padding: '20px', borderTop: '1px solid rgba(255,255,255,0.1)', textAlign: 'center' }}>
        <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: '1.5' }}>
          <strong>Legal Policy:</strong> Subscriptions can be canceled at any time. Fees are strictly non-refundable. Only security deposits (if applicable) are refundable according to local government guidelines and the Gym's individual policies.
        </p>
      </div>
    </div>
  );
};

export default YourGym;
