import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Activity, Mail, Lock, User, Briefcase, ArrowRight } from 'lucide-react';
import './AuthPortal.css';

const AuthPortal = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'user' // 'user' or 'gym_owner'
  });
  const [error, setError] = useState('');
  const navigate = useNavigate();

  // Auto-login caching check
  useEffect(() => {
    const token = localStorage.getItem('gymsync_token');
    const role = localStorage.getItem('gymsync_role');
    if (token && role && role !== 'guest') {
      navigate('/home');
    }
  }, [navigate]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleAuth = async (e) => {
    e.preventDefault();
    setError('');
    
    const endpoint = isLogin ? '/api/auth/login' : '/api/auth/register';

    try {
      
      // Map frontend roles to backend Enums
      let backendRole = 'User';
      if (formData.role === 'gym_owner') backendRole = 'GymOwner';

      const payload = isLogin 
        ? { email: formData.email, password: formData.password }
        : { ...formData, role: backendRole };

      if (payload.name) payload.name = payload.name.trim(); // Prevent whitespace corruption

      const res = await fetch(`${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      
      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.message || 'Authentication failed');
      }

      // Store auth data in localStorage
      localStorage.setItem('gymsync_token', data.token);
      localStorage.setItem('gymsync_role', data.role);
      localStorage.setItem('gymsync_user_name', data.name);
      
      // --- Offline Guest Migration Sweep ---
      const guestHistory = localStorage.getItem('gymsync_Guest_User_history');
      if (guestHistory) {
         const newKeyName = data.name.replace(/\s+/g, '_');
         
         const existingUserHistoryStr = localStorage.getItem(`gymsync_${newKeyName}_history`);
         let mergedHistory = JSON.parse(guestHistory);
         
         if (existingUserHistoryStr) {
            const existingHistory = JSON.parse(existingUserHistoryStr);
            mergedHistory = [...existingHistory, ...mergedHistory];
         }
         
         // Map to new account
         localStorage.setItem(`gymsync_${newKeyName}_history`, JSON.stringify(mergedHistory));
         
         // Map bio data
         const guestBio = localStorage.getItem('gymsync_Guest_User_bio_data');
         if (guestBio && !localStorage.getItem(`gymsync_${newKeyName}_bio_data`)) {
             localStorage.setItem(`gymsync_${newKeyName}_bio_data`, guestBio);
         }
         
         // Copy points/streak
         const guestPoints = localStorage.getItem('gymsync_Guest_User_points');
         const guestStreak = localStorage.getItem('gymsync_Guest_User_streak');
         if (guestPoints) localStorage.setItem(`gymsync_${newKeyName}_points`, guestPoints);
         if (guestStreak) localStorage.setItem(`gymsync_${newKeyName}_streak`, guestStreak);

         // Clean up the guest cache securely
         localStorage.removeItem('gymsync_Guest_User_history');
         localStorage.removeItem('gymsync_Guest_User_bio_data');
         localStorage.removeItem('gymsync_Guest_User_points');
         localStorage.removeItem('gymsync_Guest_User_streak');
         
         console.log('Successfully migrated offline guest data to permanent account!');
      }
      
      // Redirect to Home feed
      window.location.href = '/home';
      
    } catch (err) {
      // For local FYP testing if backend fails, mock success
      if (err.message.includes('Failed to fetch')) {
        console.warn("Backend unreachable, simulating mock login for FYP demonstration.");
        localStorage.setItem('gymsync_token', 'mock_token');
        localStorage.setItem('gymsync_role', formData.role);
        // Default to name from form for demo
        localStorage.setItem('gymsync_user_name', formData.name || 'Demo User');
        window.location.href = '/home';
      } else {
        setError(err.message);
      }
    }
  };

  const handleGuestLogin = () => {
    localStorage.setItem('gymsync_role', 'guest');
    localStorage.setItem('gymsync_user_name', 'Guest');
    localStorage.removeItem('gymsync_token'); // Guests don't need a token
    window.location.href = '/home'; // Guests go straight to home
  };

  return (
    <div className="auth-portal">
      <div className="auth-container">
        {/* Left Side: Brand Message (Facebook Style) */}
        <div className="auth-brand">
          <div className="brand-logo">
            <Activity color="#3b82f6" size={48} />
            <h1>GymSync</h1>
          </div>
          <p className="brand-tagline">
            Connect with gyms, train with AI, and share your fitness journey with the world.
          </p>
        </div>

        {/* Right Side: Auth Box */}
        <div className="auth-box glass-panel">
          <form onSubmit={handleAuth} className="auth-form">
            {!isLogin && (
              <div className="input-group">
                <User size={20} className="input-icon" />
                <input 
                  type="text" 
                  name="name" 
                  placeholder="Full Name" 
                  value={formData.name}
                  onChange={handleChange}
                  required 
                />
              </div>
            )}
            
            <div className="input-group">
              <Mail size={20} className="input-icon" />
              <input 
                type="email" 
                name="email" 
                placeholder="Email address" 
                value={formData.email}
                onChange={handleChange}
                required 
              />
            </div>
            
            <div className="input-group">
              <Lock size={20} className="input-icon" />
              <input 
                type="password" 
                name="password" 
                placeholder="Password" 
                value={formData.password}
                onChange={handleChange}
                required 
              />
            </div>

            {!isLogin && (
              <div className="role-selector">
                <p>Account Type:</p>
                <div className="role-options">
                  <label className={`role-btn ${formData.role === 'user' ? 'active' : ''}`}>
                    <input type="radio" name="role" value="user" onChange={handleChange} checked={formData.role === 'user'} />
                    <User size={16}/> User
                  </label>
                  <label className={`role-btn ${formData.role === 'gym_owner' ? 'active' : ''}`}>
                    <input type="radio" name="role" value="gym_owner" onChange={handleChange} checked={formData.role === 'gym_owner'} />
                    <Briefcase size={16}/> Gym Owner
                  </label>
                </div>
              </div>
            )}

            {error && <div className="error-message">{error}</div>}

            <button type="submit" className="btn btn-primary w-100 auth-submit-btn">
              {isLogin ? 'Log In' : 'Create Account'}
            </button>
            
            {isLogin && <a href="#" className="forgot-password">Forgotten password?</a>}
            
            <div className="divider"></div>
            
            <button 
              type="button" 
              className="btn btn-success w-100 switch-auth-btn"
              onClick={() => setIsLogin(!isLogin)}
            >
              {isLogin ? 'Create new account' : 'Already have an account?'}
            </button>

            <button 
              type="button" 
              className="btn btn-outline w-100 guest-btn mt-10"
              onClick={handleGuestLogin}
            >
              Continue as Guest <ArrowRight size={16} />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default AuthPortal;
