import React, { useState, useEffect } from 'react';
import { Dumbbell, CheckCircle } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const YourGym = () => {
  const [gymData, setGymData] = useState(null);
  const { user } = useAuth();

  const isSubscribed = localStorage.getItem('gymsync_is_subscribed') === 'true';

  useEffect(() => {
    if (isSubscribed) {
      const userId = user?._id || user?.id || 'mockUserId';
      fetch(`/api/gyms/my-gym/${userId}`)
        .then(res => res.json())
        .then(data => setGymData(data))
        .catch(err => console.error("Error fetching Gym Details", err));
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

  if (!gymData) {
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
        
        {/* Today's Training Tip */}
        <div className="glass-panel" style={{ padding: '30px' }}>
          <h2 style={{ marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <CheckCircle size={24} color="#10b981" /> Today's Training Tip
          </h2>
          <div style={{ marginBottom: '20px', padding: '20px', background: 'rgba(255,255,255,0.05)', borderRadius: '12px' }}>
            <h4 style={{ color: 'var(--text-secondary)', marginBottom: '10px' }}>What to do Today:</h4>
            <p style={{ fontSize: '1.1rem', lineHeight: '1.6' }}>{gymData.todayTrainingTip?.today || "Dynamic training plan loading..."}</p>
          </div>
          <div style={{ padding: '20px', background: 'rgba(255,255,255,0.05)', borderRadius: '12px' }}>
            <h4 style={{ color: 'var(--text-secondary)', marginBottom: '10px' }}>Tomorrow's Preview:</h4>
            <p style={{ fontSize: '1.1rem', lineHeight: '1.6' }}>{gymData.todayTrainingTip?.tomorrow || "Rest and recover."}</p>
          </div>
        </div>

        {/* Equipment Pictures */}
        <div className="glass-panel" style={{ padding: '30px' }}>
          <h2 style={{ marginBottom: '20px' }}>Required Equipment</h2>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
            {gymData.equipmentImages && gymData.equipmentImages.map((img, idx) => (
              <div key={idx} style={{ height: '150px', borderRadius: '12px', overflow: 'hidden', background: `url(${img}) center/cover` }}>
              </div>
            ))}
            {(!gymData.equipmentImages || gymData.equipmentImages.length === 0) && (
              <p style={{ color: 'var(--text-secondary)' }}>No equipment images uploaded by your gym owner yet.</p>
            )}
          </div>
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
