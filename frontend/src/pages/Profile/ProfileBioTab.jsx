import React from 'react';
import { Target } from 'lucide-react';

const ProfileBioTab = ({ bio }) => {
  return (
    <div className="glass-panel section-panel bio-panel">
      <div style={{display:'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px'}}>
        <h3 className="section-title"><Target size={20}/> Health Bio</h3>
        <button
          className="btn btn-outline btn-sm"
          onClick={() => {
            localStorage.setItem('gymsync_onboarding_skip_date', '');
            window.dispatchEvent(new Event('open-onboarding'));
          }}
        >
          Edit Bio
        </button>
      </div>

      {!bio.mainGoalArea ? (
        <div style={{textAlign: 'center', padding: '30px 0'}}>
          <p className="empty-text">Your comprehensive biological profile is incomplete.</p>
          <button
            className="btn btn-primary"
            onClick={() => {
              localStorage.setItem('gymsync_onboarding_skip_date', '');
              window.dispatchEvent(new Event('open-onboarding'));
            }}
            style={{marginTop: '15px'}}
          >
            Start Assessment Now
          </button>
        </div>
      ) : (
        <div className="bio-summary-grid">
          <div className="bio-stat-card full">
            <h4>Primary Fitness Path</h4>
            <p>{bio.mainGoalArea || 'Not Set'}</p>
          </div>
          <div className="bio-stat-card">
            <h4>Specific Goals</h4>
            <p>{bio.goals?.length > 0 ? bio.goals.join(', ') : 'Not Set'}</p>
          </div>
          <div className="bio-stat-card">
            <h4>Plan Duration</h4>
            <p style={{ color: 'var(--primary-accent)', fontWeight: 'bold' }}>{bio.planDuration || '1 Month'}</p>
          </div>
          <div className="bio-stat-card">
            <h4>Weekly Frequency</h4>
            <p>{bio.trainingDaysPerWeek || 3} Days / Week</p>
          </div>
          <div className="bio-stat-card">
            <h4>Available Equipment</h4>
            <p>{bio.equipmentAccess || 'Full Gym'}</p>
          </div>
          <div className="bio-stat-card">
            <h4>Stamina Push-up Baseline</h4>
            <p style={{ color: '#10b981', fontWeight: 'bold' }}>{bio.pushupBaseline || 10} Reps</p>
          </div>
          <div className="bio-stat-card">
            <h4>Target Muscle Focus</h4>
            <p>{bio.targetMuscles?.length > 0 ? bio.targetMuscles.join(', ') : 'Full Body'}</p>
          </div>
          <div className="bio-stat-card">
            <h4>Gender</h4>
            <p>{bio.gender || 'Not Set'}</p>
          </div>
          <div className="bio-stat-card">
            <h4>Current Height</h4>
            <p>{bio.height ? `${bio.height} ${bio.units === 'imperial' ? 'in' : 'cm'}` : 'Not Set'}</p>
          </div>
          <div className="bio-stat-card">
            <h4>Current Weight</h4>
            <p>{bio.weight ? `${bio.weight} ${bio.units === 'imperial' ? 'lbs' : 'kg'}` : 'Not Set'}</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProfileBioTab;
