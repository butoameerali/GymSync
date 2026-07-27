import React, { useState, useEffect, useRef } from 'react';
import { Activity, Flame, Target, MapPin, Calendar, CheckCircle, Clock, DownloadCloud, Trash2, Shield, Lock, Camera } from 'lucide-react';
import ImageCropper from '../../components/layout/ImageCropper';
import './Profile.css';

const Profile = () => {
  const [activeTab, setActiveTab] = useState('history'); // 'history', 'posts', 'bio'
  const [isEditingBio, setIsEditingBio] = useState(false);
  
  // Stats
  const [stats, setStats] = useState({ points: 0, streak: 0 });
  const [history, setHistory] = useState([]);
  const [upcoming, setUpcoming] = useState([]);
  const [myPosts, setMyPosts] = useState([]);
  const userName = localStorage.getItem('gymsync_user_name') || 'Guest User';
  const userKey = userName.replace(/\s+/g, '_'); // normalize for local storage key
  const [profilePic, setProfilePic] = useState(localStorage.getItem(`gymsync_${userKey}_pic`) || '');
  const [rawImageSrc, setRawImageSrc] = useState(null);

  // Bio Data
  const [bio, setBio] = useState({
    height: '',
    weight: '',
    bodyType: 'healthy',
    fitnessGoals: '',
    location: ''
  });

  const fileInputRef = useRef(null);

  useEffect(() => {
    // Load local storage states for FYP Demo, scoped to userName
    const mockPoints = localStorage.getItem(`gymsync_${userKey}_points`) || '0';
    const mockStreak = localStorage.getItem(`gymsync_${userKey}_streak`) || '0';
    setStats({ points: parseInt(mockPoints), streak: parseInt(mockStreak) });

    const rawHistory = JSON.parse(localStorage.getItem(`gymsync_${userKey}_history`) || '[]');
    setHistory(rawHistory.reverse()); // Newest first

    // Function to load and sync bio data dynamically
    const loadBioData = () => {
      const bioFilled = localStorage.getItem(`gymsync_${userKey}_bio_filled`) === 'true' || localStorage.getItem('gymsync_bio_filled') === 'true';
      if (bioFilled) {
        const storedBio = localStorage.getItem(`gymsync_${userKey}_bio_data`) || localStorage.getItem(`gymsync_${userKey}_bio`);
        if (storedBio) {
          try {
            setBio(JSON.parse(storedBio));
            setUpcoming([
              { id: 'u1', name: 'Barbell Squats', date: 'Tomorrow, 8:00 AM' },
              { id: 'u2', name: 'Romanian Deadlifts', date: 'Tomorrow, 8:30 AM' }
            ]);
          } catch (e) {
            console.error("Error parsing bio data", e);
          }
        }
      }
    };

    loadBioData();

    // Listen for bio update event from OnboardingWizard or manual edits
    window.addEventListener('gymsync_bio_updated', loadBioData);

    // Fetch user profile from DB to sync profile picture across browsers
    if (userName !== 'Guest User') {
      fetch(`/api/users/${userName}`)
        .then(res => res.json())
        .then(user => {
          if (user && user.profilePic) {
            setProfilePic(user.profilePic);
            localStorage.setItem(`gymsync_${userKey}_pic`, user.profilePic);
          }
        })
        .catch(err => console.error("Error fetching profile from DB:", err));
    }

    // Fetch user posts
    fetch('/api/posts')
      .then(res => res.json())
      .then(data => {
        if(Array.isArray(data)) {
          // Filter posts authored by the currently logged-in user
          setMyPosts(data.filter(p => p.authorName === userName || p.author?.name === userName));
        }
      })
      .catch(err => console.error(err));

    return () => {
      window.removeEventListener('gymsync_bio_updated', loadBioData);
    };
  }, [userKey, userName]);

  const [validationErrors, setValidationErrors] = useState([]);

  const handleSaveBio = async (e) => {
    e.preventDefault();
    const errors = [];

    if (bio.weight && (isNaN(bio.weight) || Number(bio.weight) <= 0 || Number(bio.weight) > 400)) {
      errors.push("Please enter a valid weight between 1 and 400.");
    }
    if (bio.height && (isNaN(bio.height) || Number(bio.height) <= 0 || Number(bio.height) > 300)) {
      errors.push("Please enter a valid height between 1 and 300.");
    }

    if (errors.length > 0) {
      setValidationErrors(errors);
      return;
    }

    setValidationErrors([]);
    localStorage.setItem(`gymsync_${userKey}_bio_filled`, 'true');
    localStorage.setItem('gymsync_bio_filled', 'true');
    localStorage.setItem(`gymsync_${userKey}_bio_data`, JSON.stringify(bio));
    localStorage.setItem(`gymsync_${userKey}_bio`, JSON.stringify(bio));
    
    if (profilePic) {
      localStorage.setItem(`gymsync_${userKey}_pic`, profilePic);
      // Sync to MongoDB
      try {
        await fetch('/api/users/profile-pic', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: userName, profilePic })
        });
      } catch (err) {
        console.error("Failed to sync profile pic to DB");
      }
    }
    
    setIsEditingBio(false);
    window.dispatchEvent(new Event('gymsync_bio_updated'));
    
    // Auto generate mock upcoming schedule after bio fill
    setUpcoming([
      { id: 'u1', name: 'Barbell Squats', date: 'Tomorrow, 8:00 AM' },
      { id: 'u2', name: 'Romanian Deadlifts', date: 'Tomorrow, 8:30 AM' }
    ]);
  };

  const handlePicUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setRawImageSrc(reader.result);
      };
      reader.readAsDataURL(file);
    }
    // Reset file input so same file can be selected again
    if (e.target) e.target.value = null;
  };

  const onCropComplete = (croppedImage) => {
    setProfilePic(croppedImage);
    setRawImageSrc(null);
  };

  // Date formatting helpers
  const todayDate = new Date().toDateString();
  const todayHistory = history.filter(h => new Date(h.date).toDateString() === todayDate);
  const pastHistory = history.filter(h => new Date(h.date).toDateString() !== todayDate);

  return (
    <div className="profile-page">
      {/* Cover & Header */}
      <div className="profile-cover"></div>
      <div className="container">
        <div className="profile-header glass-panel">
          <div 
            className="profile-avatar avatar-clickable" 
            style={{ overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', cursor: 'pointer' }}
            onClick={() => fileInputRef.current && fileInputRef.current.click()}
            title="Change Profile Picture"
          >
            {profilePic ? (
              <img src={profilePic} alt="Profile" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : (
              userName.charAt(0).toUpperCase()
            )}
            <div className="avatar-overlay" style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0, transition: 'opacity 0.2s', borderRadius: '50%' }}>
              <Camera color="white" size={28} />
            </div>
          </div>
          <input type="file" ref={fileInputRef} accept="image/*" style={{display: 'none'}} onChange={handlePicUpload} />
          <div className="profile-info">
            <h1>{userName}</h1>
            <p className="bio-tagline">{bio.location ? <><MapPin size={16}/> {bio.location}</> : 'Fitness Enthusiast'}</p>
          </div>
          <div className="profile-stats">
            <div className="stat-badge pulse-blue">
              <Activity size={20} />
              <span>{stats.points} Pts</span>
            </div>
            <div className="stat-badge pulse-orange">
              <Flame size={20} />
              <span>{stats.streak} Days</span>
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="profile-tabs glass-panel">
          <button className={`tab-btn ${activeTab === 'history' ? 'active' : ''}`} onClick={() => setActiveTab('history')}>Workout History</button>
          <button className={`tab-btn ${activeTab === 'posts' ? 'active' : ''}`} onClick={() => setActiveTab('posts')}>Your Timeline</button>
          <button className={`tab-btn ${activeTab === 'bio' ? 'active' : ''}`} onClick={() => setActiveTab('bio')}>Health Bio</button>
          <button className={`tab-btn ${activeTab === 'privacy' ? 'active' : ''}`} onClick={() => setActiveTab('privacy')}>Privacy & Data</button>
        </div>

        <div className="profile-content">
          
          {/* HISTORY TAB */}
          {activeTab === 'history' && (
            <div className="history-grid">
              
              {/* Upcoming / AI Schedule */}
              <div className="glass-panel section-panel">
                <h3 className="section-title"><Calendar size={20}/> Upcoming AI Schedule</h3>
                {upcoming.length > 0 ? (
                  upcoming.map(up => (
                    <div key={up.id} className="history-item upcoming">
                      <Clock size={16} color="var(--primary-accent)"/>
                      <div style={{flex: 1}}>
                        <h4>{up.name}</h4>
                        <span className="time">{up.date}</span>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="empty-text">Complete your Bio Data to generate your AI Schedule.</p>
                )}
              </div>

              {/* Today's Exercises */}
              <div className="glass-panel section-panel">
                <h3 className="section-title"><CheckCircle size={20} color="#10b981"/> Today's Exercises</h3>
                {todayHistory.length > 0 ? (
                  todayHistory.map((h, i) => (
                    <div key={i} className="history-item completed">
                      <div>
                        <h4>{h.name}</h4>
                        <span className="time">+{h.pointsEarned} Points • {h.trackedViaAI ? 'AI Tracked' : 'Manual'}</span>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="empty-text">No exercises completed today. Head to the Workout Hub!</p>
                )}
              </div>

              {/* Past History */}
              <div className="glass-panel section-panel" style={{gridColumn: '1/-1'}}>
                <h3 className="section-title">Past Workouts</h3>
                <div className="past-history-list">
                  {pastHistory.map((h, i) => (
                    <div key={i} className="history-item">
                      <div>
                        <h4>{h.name}</h4>
                        <span className="time">{new Date(h.date).toLocaleDateString()} • +{h.pointsEarned} Pts</span>
                      </div>
                    </div>
                  ))}
                  {pastHistory.length === 0 && <p className="empty-text">No past workouts found.</p>}
                </div>
              </div>
            </div>
          )}

          {/* TIMELINE TAB (Facebook Style) */}
          {activeTab === 'posts' && (
            <div className="timeline-grid">
              {myPosts.length > 0 ? (
                myPosts.map(post => (
                  <div key={post._id} className="glass-panel post-card">
                    <div className="post-header">
                      <div className="avatar" style={{ overflow: 'hidden' }}>
                         {profilePic ? <img src={profilePic} alt="Profile" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : post.authorName?.charAt(0).toUpperCase() || 'U'}
                      </div>
                      <div>
                        <h4>{post.authorName || post.author?.name}</h4>
                        <span className="time">{new Date(post.createdAt).toLocaleDateString()}</span>
                      </div>
                    </div>
                    <p className="post-content">{post.content}</p>
                    {post.mediaUrl && (
                      <img src={`${post.mediaUrl}`} alt="Post" style={{ width: '100%', borderRadius: '12px', marginTop: '10px' }} />
                    )}
                    <div className="post-stats" style={{ display: 'flex', gap: '15px', marginTop: '15px', color: 'var(--text-secondary)' }}>
                      <span>{post.likes?.length || 0} Likes</span>
                      <span>{post.comments?.length || 0} Comments</span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="glass-panel section-panel">
                  <p className="empty-text">You haven't posted anything yet. Share your journey on the Home feed!</p>
                </div>
              )}
            </div>
          )}

          {/* BIO TAB */}
          {activeTab === 'bio' && (
            <div className="glass-panel section-panel bio-panel">
              <div style={{display:'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px'}}>
                <h3 className="section-title"><Target size={20}/> Bio</h3>
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
                  {/* Visual Body Progress Card */}
                  <div className="bio-stat-card full" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <h4 style={{ alignSelf: 'flex-start' }}>Saved Body Baseline</h4>
                    <div style={{ background: 'rgba(255,255,255,0.02)', padding: '20px', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.05)', marginTop: '10px' }}>
                      <svg viewBox="0 0 100 200" style={{ height: '200px' }}>
                        <circle cx="50" cy="20" r="12" fill="var(--primary-accent)" />
                        <ellipse cx="50" cy="50" rx={18 + ((bio.bodyFatVolume || 30)/20)} ry="10" fill="var(--primary-accent)" />
                        <path d={`M ${32 - ((bio.bodyFatVolume || 30)/20)} 50 Q ${25 - ((bio.bodyFatVolume || 30)/4)} 100 ${35 - ((bio.bodyFatVolume || 30)/12)} 130 L ${65 + ((bio.bodyFatVolume || 30)/12)} 130 Q ${75 + ((bio.bodyFatVolume || 30)/4)} 100 ${68 + ((bio.bodyFatVolume || 30)/20)} 50 Z`} fill="var(--primary-accent)" />
                        <path d={`M ${35 - ((bio.bodyFatVolume || 30)/12)} 130 L 42 190 L 50 140 L 58 190 L ${65 + ((bio.bodyFatVolume || 30)/12)} 130 Z`} fill="var(--primary-accent)" />
                      </svg>
                    </div>
                  </div>

                  <div className="bio-stat-card full">
                    <h4>Primary Path</h4>
                    <p>{bio.mainGoalArea || 'Not Set'}</p>
                  </div>
                  <div className="bio-stat-card">
                    <h4>Specific Goals</h4>
                    <p>{bio.goals?.length > 0 ? bio.goals.join(', ') : 'Not Set'}</p>
                  </div>
                  <div className="bio-stat-card">
                    <h4>Muscle Focus</h4>
                    <p>{bio.targetMuscles?.length > 0 ? bio.targetMuscles.join(', ') : 'Full Body'}</p>
                  </div>
                  <div className="bio-stat-card">
                    <h4>Current Weight</h4>
                    <p>{bio.weight} {bio.units === 'metric' ? 'kg' : 'lbs'}</p>
                  </div>
                  <div className="bio-stat-card">
                    <h4>Target Weight</h4>
                    <p>{bio.targetWeight} {bio.units === 'metric' ? 'kg' : 'lbs'}</p>
                  </div>
                  <div className="bio-stat-card full">
                    <h4>Medical Conditions</h4>
                    <p>{bio.medicalConditions?.length > 0 ? bio.medicalConditions.join(', ') : 'None Reported'}</p>
                  </div>
                  <div className="bio-stat-card full">
                    <h4>Joint & Muscle Issues</h4>
                    <p>{bio.injuries?.length > 0 ? bio.injuries.join(', ') : 'None Reported'}</p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* PRIVACY & DATA TAB */}
          {activeTab === 'privacy' && (
            <div className="glass-panel section-panel" style={{ maxWidth: '600px', margin: '0 auto' }}>
              <h3 className="section-title"><Shield size={20} color="var(--primary-accent)"/> Privacy & GDPR Controls</h3>
              <p style={{ color: 'var(--text-secondary)', marginBottom: '20px' }}>Manage your data privacy and control what others can see on your public profile.</p>

              <div style={{ background: 'rgba(255,255,255,0.05)', padding: '20px', borderRadius: '12px', marginBottom: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <h4 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><Lock size={16}/> Private Health Bio</h4>
                    <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: '5px 0 0 0' }}>Hide your Height and Weight from your public profile.</p>
                  </div>
                  <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
                    <input 
                      type="checkbox" 
                      checked={localStorage.getItem('gymsync_privacy_hideHealth') === 'true'} 
                      onChange={(e) => {
                        localStorage.setItem('gymsync_privacy_hideHealth', e.target.checked ? 'true' : 'false');
                        // Force a re-render by doing a tiny state update if needed
                        setActiveTab(prev => prev);
                        alert(`Health data is now ${e.target.checked ? 'PRIVATE' : 'PUBLIC'} on your profile.`);
                      }}
                      style={{ transform: 'scale(1.5)' }}
                    />
                  </label>
                </div>
              </div>

              <div style={{ background: 'rgba(255,255,255,0.05)', padding: '20px', borderRadius: '12px', marginBottom: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <h4 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><DownloadCloud size={16}/> Download My Data</h4>
                    <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: '5px 0 0 0' }}>Export a JSON copy of all your personal data (GDPR Right to Access).</p>
                  </div>
                  <button 
                    className="btn btn-outline btn-sm"
                    onClick={() => {
                      const data = {
                        bio, stats, history, myPosts,
                        profilePic: !!profilePic
                      };
                      const blob = new Blob([JSON.stringify(data, null, 2)], {type: 'application/json'});
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement('a');
                      a.href = url;
                      a.download = `GymSync_Data_${userName}.json`;
                      a.click();
                      URL.revokeObjectURL(url);
                    }}
                  >
                    Export Data
                  </button>
                </div>
              </div>

              <div style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', padding: '20px', borderRadius: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <h4 style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#ef4444' }}><Trash2 size={16}/> Delete Account</h4>
                    <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: '5px 0 0 0' }}>Permanently delete your account and all associated data.</p>
                  </div>
                  <button 
                    className="btn"
                    style={{ background: '#ef4444', color: 'white' }}
                    onClick={async () => {
                      if(window.confirm('Are you ABSOLUTELY sure you want to permanently delete your account? This cannot be undone!')) {
                        try {
                          await fetch(`/api/users/${userName}/delete`, { method: 'DELETE' }); // Optional backend endpoint
                          localStorage.clear();
                          window.location.href = '/login';
                        } catch (err) {
                          alert("Failed to delete account");
                        }
                      }
                    }}
                  >
                    Delete Account
                  </button>
                </div>
              </div>

            </div>
          )}

        </div>
      </div>
      {rawImageSrc && (
        <ImageCropper 
          imageSrc={rawImageSrc} 
          onCropComplete={onCropComplete} 
          onCancel={() => setRawImageSrc(null)} 
        />
      )}
    </div>
  );
};

export default Profile;
