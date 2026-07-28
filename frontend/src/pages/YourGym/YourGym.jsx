import React, { useState, useEffect } from 'react';
import { Dumbbell, Calendar, FileText, Activity } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const YourGym = () => {
  const [gymData, setGymData] = useState(null);
  const [plans, setPlans] = useState([]);
  const [attendance, setAttendance] = useState([]);
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  const isSubscribed = !!localStorage.getItem('gymsync_user_gym');

  useEffect(() => {
    if (isSubscribed) {
      const userName = user?.name || localStorage.getItem('gymsync_user_name');
      fetch(`/api/gyms/my-gym-data/${userName}`)
        .then(res => res.json())
        .then(data => {
          if (!data.message) {
            setGymData(data.gym);
            setPlans(data.plans || []);
            setAttendance(data.attendanceLogs || []);
            setPosts(data.posts || []);
          }
          setLoading(false);
        })
        .catch(err => {
          console.error("Error fetching Gym Details", err);
          setLoading(false);
        });
    } else {
      setLoading(false);
    }
  }, [isSubscribed, user]);

  if (!isSubscribed) {
    return (
      <div className="container" style={{paddingTop: '150px', minHeight: '100vh', textAlign: 'center'}}>
        <div className="glass-panel" style={{padding: '50px', maxWidth: '600px', margin: '0 auto'}}>
          <Dumbbell size={64} color="var(--text-secondary)" style={{marginBottom: '20px'}}/>
          <h2 style={{marginBottom: '15px'}}>No Active Subscription</h2>
          <p style={{color: 'var(--text-secondary)', marginBottom: '30px'}}>You are not currently subscribed to any Gym on GymSync. Discover local gyms to unlock custom training plans and equipment guides.</p>
          <a href="/explore" className="btn btn-primary">Explore Gyms Near You</a>
        </div>
      </div>
    );
  }

  if (loading || !gymData) {
    return <div className="container" style={{paddingTop: '100px', textAlign: 'center'}}>Loading Dynamic Gym Data...</div>;
  }

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
