import React, { useState, useEffect } from 'react';
import { Dumbbell, Eye, Building2, ArrowRight, UserCheck } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

/**
 * AITrainerAssignedMode
 *
 * Case A (Gym Member): Renders trainer-assigned exercises in clean My AI Workout style.
 * Case B (Non-Gym Member): Informs user that this is for gym members and directs to Explore Gyms.
 */
const AITrainerAssignedMode = ({ dbExercises = [], startExercise }) => {
  const navigate = useNavigate();
  const [gymName, setGymName] = useState(() => localStorage.getItem('gymsync_user_gym') || '');
  const [isLoading, setIsLoading] = useState(false);
  const token = localStorage.getItem('gymsync_token');
  const userName = localStorage.getItem('gymsync_user_name');

  useEffect(() => {
    if (!token || !userName) {
      setGymName('');
      return;
    }

    // Verify gym subscription with backend profile
    setIsLoading(true);
    fetch(`/api/users/${userName}`, {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(res => (res.ok ? res.json() : null))
      .then(user => {
        if (user && user.subscribedGymName) {
          setGymName(user.subscribedGymName);
          localStorage.setItem('gymsync_user_gym', user.subscribedGymName);
        } else {
          setGymName('');
          localStorage.removeItem('gymsync_user_gym');
        }
      })
      .catch(err => console.warn('Failed to verify gym subscription:', err))
      .finally(() => setIsLoading(false));
  }, [token, userName]);

  // Case B: Not a gym member
  if (!token || !gymName) {
    return (
      <div
        className="glass-panel"
        style={{
          padding: '48px 24px',
          textAlign: 'center',
          borderRadius: '16px',
          border: '1px solid var(--card-border)',
          maxWidth: '640px',
          margin: '30px auto'
        }}
      >
        <div
          style={{
            width: '64px',
            height: '64px',
            borderRadius: '50%',
            background: 'rgba(59,130,246,0.12)',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: '20px'
          }}
        >
          <Building2 size={32} color="#3b82f6" />
        </div>
        <h2 style={{ fontSize: '1.35rem', color: 'var(--text-primary)', marginBottom: '10px' }}>
          Trainer Assigned Workouts
        </h2>
        <p
          style={{
            color: 'var(--text-secondary)',
            fontSize: '0.94rem',
            lineHeight: 1.6,
            maxWidth: '500px',
            margin: '0 auto 24px auto'
          }}
        >
          Yeh feature un users ke liye hai jo kisi gym ke member hain aur unka trainer unhe guide karta hai. (This feature is exclusively for members of registered gyms whose personal trainers prescribe customized workouts.)
        </p>
        <button
          type="button"
          className="btn btn-primary"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            padding: '10px 24px',
            borderRadius: '10px',
            fontSize: '0.95rem'
          }}
          onClick={() => navigate('/explore')}
        >
          Explore Gyms &amp; Join <ArrowRight size={16} />
        </button>
      </div>
    );
  }

  // Case A: Gym Member
  return (
    <div className="assigned-view glass-panel" style={{ padding: '24px', borderRadius: '16px' }}>
      <div style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
            <span
              style={{
                background: 'rgba(16,185,129,0.15)',
                color: '#10b981',
                padding: '4px 10px',
                borderRadius: '8px',
                fontSize: '0.8rem',
                fontWeight: 600,
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px'
              }}
            >
              <UserCheck size={14} /> Active Member: {gymName}
            </span>
          </div>
          <h2 style={{ display: 'flex', alignItems: 'center', gap: '10px', color: 'var(--text-primary)', margin: 0, fontSize: '1.4rem' }}>
            <Dumbbell size={24} color="var(--primary-accent)" /> Trainer Assigned Exercises
          </h2>
          <p style={{ color: 'var(--text-secondary)', margin: '6px 0 0 0', fontSize: '0.88rem' }}>
            Workout routines prescribed directly by your instructor at {gymName}.
          </p>
        </div>
      </div>

      <div className="exercise-grid">
        {(dbExercises.length > 0 ? dbExercises.slice(0, 12) : []).map((ex, idx) => (
          <div
            key={ex._id || ex.id || idx}
            className="exercise-card"
            style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}
          >
            <div>
              <div className="ex-card-header">
                <h4 style={{ margin: 0, fontSize: '1.05rem', color: 'var(--text-primary)' }}>{ex.name}</h4>
                <span
                  className="category-badge"
                  style={{
                    background: 'rgba(16, 185, 129, 0.2)',
                    color: '#10b981',
                    fontSize: '0.72rem',
                    padding: '2px 8px',
                    borderRadius: '10px',
                  }}
                >
                  Trainer Prescribed
                </span>
              </div>
              <span className="ex-category" style={{ display: 'inline-block', marginTop: '4px', fontSize: '0.8rem', color: '#3b82f6' }}>
                {Array.isArray(ex.targetMuscles) ? ex.targetMuscles.join(', ') : ex.category || 'Compound'}
              </span>
              <p className="ex-instructions" style={{ fontSize: '0.84rem', color: 'var(--text-secondary)', margin: '10px 0', lineHeight: 1.5 }}>
                {(ex.description || ex.instructions || 'Maintain controlled eccentric tempo and full range of motion.').substring(0, 90)}...
              </p>
              <div style={{ display: 'flex', gap: '12px', background: 'rgba(255,255,255,0.03)', padding: '8px 12px', borderRadius: '8px', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '12px' }}>
                <span>🎯 Target: <strong>{ex.defaultSets || 3} Sets</strong></span>
                <span>⚡ Reps: <strong>{ex.defaultReps || '8-12'}</strong></span>
              </div>
            </div>
            <button
              className="btn btn-primary btn-sm w-100"
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
              onClick={() => startExercise(ex)}
            >
              <Eye size={16} /> Start Exercise
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default AITrainerAssignedMode;
