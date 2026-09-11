import React, { useState } from 'react';
import { AlertCircle } from 'lucide-react';
import { toast } from 'react-toastify';

export const MissedSessionCard = ({ planId, missedSession, onResolved }) => {
  const [loading, setLoading] = useState(false);

  const handleResolve = async (reason) => {
    setLoading(true);
    try {
      const token = localStorage.getItem('gymsync_token') || '';
      const res = await fetch(`/api/ai/saved-plans/${planId}/missed-sessions/${missedSession.dayNumber}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ reasonCode: reason })
      });
      if (res.ok) {
        toast.success(`Workout rescheduled. Adjusting today's intensity slightly.`);
        onResolved();
      } else {
        toast.error('Failed to resolve missed session.');
      }
    } catch (err) {
      toast.error('An error occurred.');
    }
    setLoading(false);
  };

  return (
    <div style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid #ef4444', borderRadius: '12px', padding: '16px', marginBottom: '20px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#ef4444', fontWeight: 'bold', marginBottom: '10px' }}>
        <AlertCircle size={20} />
        <span>Missed Workout Detected</span>
      </div>
      <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '16px' }}>
        We noticed you missed your scheduled workout for Day {missedSession.dayNumber}. What happened?
      </p>
      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
        {['Busy', 'Pain', 'Work/Study', 'Other Activity'].map(reason => (
          <button
            key={reason}
            disabled={loading}
            onClick={() => handleResolve(reason)}
            style={{
              padding: '6px 12px',
              borderRadius: '20px',
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.1)',
              color: 'var(--text-primary)',
              cursor: loading ? 'not-allowed' : 'pointer',
              fontSize: '0.85rem'
            }}
          >
            {reason}
          </button>
        ))}
      </div>
    </div>
  );
};
