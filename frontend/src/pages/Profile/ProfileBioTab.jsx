import React from 'react';
import { Target, Activity, Shield, AlertTriangle, Heart } from 'lucide-react';

const ProfileBioTab = ({ bio = {}, userName = 'User', isOwnProfile = true }) => {
  const isProfileStarted = Boolean(bio.height || bio.gender || bio.trainingDaysPerWeek || bio.weight || bio.equipmentAccess || bio.mainGoalArea);

  return (
    <div className="glass-panel section-panel bio-panel">
      <div style={{display:'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px'}}>
        <h3 className="section-title"><Target size={20}/> Health & Biological Profile</h3>
        {isOwnProfile && (
          <button
            className="btn btn-outline btn-sm"
            onClick={() => {
              localStorage.setItem('gymsync_onboarding_skip_date', '');
              window.dispatchEvent(new Event('open-onboarding'));
            }}
          >
            Edit Bio
          </button>
        )}
      </div>

      {!isProfileStarted ? (
        <div style={{textAlign: 'center', padding: '30px 0'}}>
          <p className="empty-text">
            {isOwnProfile 
              ? 'Your comprehensive biological profile is incomplete.' 
              : `${userName}'s biological profile has not been configured yet.`}
          </p>
          {isOwnProfile && (
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
          )}
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

          {/* Dietary Facts */}
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
