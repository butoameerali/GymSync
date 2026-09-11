import React from 'react';
import { Target, Activity, Shield, AlertTriangle, Heart } from 'lucide-react';

const ProfileBioTab = ({ bio = {} }) => {
  const isProfileStarted = Boolean(bio.height || bio.gender || bio.trainingDaysPerWeek || bio.weight || bio.equipmentAccess || bio.mainGoalArea);

  return (
    <div className="glass-panel section-panel bio-panel">
      <div style={{display:'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px'}}>
        <h3 className="section-title"><Target size={20}/> Health & Biological Profile</h3>
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

      {!isProfileStarted ? (
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

          {/* Health, Medical & Dietary Facts */}
          <div className="bio-stat-card">
            <h4>Joint Pain / Discomfort</h4>
            <p style={{ color: bio.jointPain?.length > 0 && !bio.jointPain.includes('None') ? '#f59e0b' : 'var(--text-primary)' }}>
              {bio.jointPain?.length > 0 ? bio.jointPain.join(', ') : 'None Reported'}
            </p>
          </div>
          <div className="bio-stat-card">
            <h4>Past Injuries</h4>
            <p style={{ color: bio.injuries?.length > 0 && !bio.injuries.includes('None') ? '#f59e0b' : 'var(--text-primary)' }}>
              {bio.injuries?.length > 0 ? bio.injuries.join(', ') : 'None Reported'}
            </p>
          </div>
          <div className="bio-stat-card">
            <h4>Medical Conditions</h4>
            <p style={{ color: bio.medicalConditions?.length > 0 && !bio.medicalConditions.includes('None') ? '#ef4444' : 'var(--text-primary)' }}>
              {bio.medicalConditions?.length > 0 ? bio.medicalConditions.join(', ') : 'None Reported'}
            </p>
          </div>
          <div className="bio-stat-card">
            <h4>Physical Limitations</h4>
            <p style={{ color: bio.limitations?.length > 0 && !bio.limitations.includes('None') ? '#f59e0b' : 'var(--text-primary)' }}>
              {bio.limitations?.length > 0 ? bio.limitations.join(', ') : 'None Reported'}
            </p>
          </div>
          <div className="bio-stat-card">
            <h4>Dietary Preferences</h4>
            <p style={{ color: '#10b981' }}>
              {Array.isArray(bio.foodPreferences)
                ? (bio.foodPreferences.length > 0 ? bio.foodPreferences.join(', ') : 'Standard / No restrictions')
                : (bio.foodPreferences ? bio.foodPreferences : 'Standard / No restrictions')}
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProfileBioTab;
