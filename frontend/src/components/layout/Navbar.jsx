import React, { useState, useEffect, useRef } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Menu, X, Activity, Bell, Sun, Moon } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import './Navbar.css';

const Navbar = () => {
  const { theme, toggleTheme } = useTheme();
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const token = localStorage.getItem('gymsync_token') || '';
  const userRole = localStorage.getItem('gymsync_role') || '';
  const normalizedRole = userRole.toLowerCase().replace('_', '');
  const isGuest = userRole === 'guest' || !userRole || !token;
  const isLoggedIn = Boolean(userRole && userRole !== 'guest' && token);
  const isAdmin = normalizedRole === 'admin' || normalizedRole === 'superadmin' || normalizedRole === 'complaintmoderator';
  const isGymOwner = normalizedRole === 'gymowner';
  const isFitnessInstructor = normalizedRole === 'fitnessinstructor';
  const isGymTrainer = normalizedRole === 'gymtrainer';
  const userName = localStorage.getItem('gymsync_user_name') || 'User';

  const [notifications, setNotifications] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [profilePic, setProfilePic] = useState('');
  const [hasGymSubscription, setHasGymSubscription] = useState(false);
  
  // Friend Requests
  const [friendRequests, setFriendRequests] = useState([]);
  const [showRequests, setShowRequests] = useState(false);
  
  const location = useLocation();
  const profileDropdownRef = useRef(null);

  // Close menus when route changes
  useEffect(() => {
    setIsMenuOpen(false);
    setShowProfileMenu(false);
    setShowNotifications(false);
  }, [location]);

  // Click outside to close dropdowns
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (profileDropdownRef.current && !profileDropdownRef.current.contains(event.target)) {
        setShowProfileMenu(false);
        setShowNotifications(false);
        setShowRequests(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (isLoggedIn && token) {
      const authHeader = { 'Authorization': `Bearer ${token}` };

      // Fetch notifications
      fetch(`/api/notifications/${userName}`, { headers: authHeader })
        .then(res => res.ok ? res.json() : [])
        .then(data => setNotifications(Array.isArray(data) ? data : []))
        .catch(err => console.error("Error fetching notifications", err));
        
      // Fetch global profile pic & friend requests
      fetch(`/api/users/${userName}`)
        .then(res => res.ok ? res.json() : null)
        .then(user => {
           if(user && !user.message) {
             if (user.profilePic) {
               setProfilePic(user.profilePic);
               localStorage.setItem(`gymsync_${userName.replace(/\s+/g, '_')}_pic`, user.profilePic);
             }
             if (user.receivedRequests) {
               setFriendRequests(Array.isArray(user.receivedRequests) ? user.receivedRequests : []);
             }
             const subscribedGym = user.subscribedGymName || '';
             setHasGymSubscription(Boolean(subscribedGym));
             if (subscribedGym) localStorage.setItem('gymsync_user_gym', subscribedGym);
             else localStorage.removeItem('gymsync_user_gym');
           }
        })
        .catch(err => console.error(err));

      const interval = setInterval(() => {
        fetch(`/api/notifications/${userName}`, { headers: authHeader })
          .then(res => res.ok ? res.json() : [])
          .then(data => setNotifications(Array.isArray(data) ? data : []))
          .catch(err => console.error("Interval Error", err));
          
        fetch(`/api/users/${userName}`)
          .then(res => res.ok ? res.json() : null)
          .then(user => {
             if(user && !user.message && user.profilePic) {
               setProfilePic(user.profilePic);
               localStorage.setItem(`gymsync_${userName.replace(/\s+/g, '_')}_pic`, user.profilePic);
             }
             if(user && !user.message) {
               if (user.receivedRequests) {
                 setFriendRequests(Array.isArray(user.receivedRequests) ? user.receivedRequests : []);
               }
               const subscribedGym = user.subscribedGymName || '';
               setHasGymSubscription(Boolean(subscribedGym));
               if (subscribedGym) localStorage.setItem('gymsync_user_gym', subscribedGym);
               else localStorage.removeItem('gymsync_user_gym');
             }
          })
          .catch(err => console.error("Interval Error", err));
      }, 10000);
      return () => clearInterval(interval);
    }
  }, [isLoggedIn, userName]);

  const handleAcceptRequest = async (senderName, notificationId) => {
    try {
      const res = await fetch('/api/users/accept', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('gymsync_token') || ''}`
        },
        body: JSON.stringify({ senderName, receiverName: userName, notificationId })
      });
      if (!res.ok) {
        const err = await res.json();
        console.error("Backend failed:", err.message);
        alert(`Failed to accept: ${err.message}`);
        return;
      }
      // Update notification text directly
      setNotifications(notifications.map(n => n._id === notificationId ? { ...n, message: `You are now friends with ${senderName}!` } : n));
    } catch (err) { console.error(err); }
  };

  const handleLogout = () => {
    localStorage.removeItem('userInfo');
    localStorage.removeItem('gymsync_token');
    localStorage.removeItem('gymsync_role');
    localStorage.removeItem('gymsync_user_name');
    localStorage.removeItem('gymsync_subscribed');
    window.location.href = '/'; // Redirect to auth portal
  };

  return (
    <nav className={`navbar ${isScrolled ? 'scrolled' : ''}`}>
      <div className="container nav-container">
        <Link to="/" className="nav-logo">
          <Activity className="logo-icon" size={32} />
          <span>GymSync</span>
        </Link>

        <div className={`nav-links ${isMenuOpen ? 'active' : ''}`}>
          <Link to="/home" className="nav-link">Home</Link>
          {!isAdmin && !isGymOwner && !isFitnessInstructor && !isGymTrainer && <Link to="/explore" className="nav-link">Explore Gyms</Link>}
          {!isAdmin && !isGymOwner && !isFitnessInstructor && !isGymTrainer && <Link to="/ai-trainer" className="nav-link text-gradient" style={{fontWeight: 700}}>Workout Hub</Link>}
          {isLoggedIn && !isAdmin && !isGymOwner && !isFitnessInstructor && !isGymTrainer && hasGymSubscription && <Link to="/your-gym" className="nav-link">YourGym</Link>}
          <Link to="/store" className="nav-link">Store</Link>
          {isLoggedIn && isAdmin && <Link to="/admin" className="nav-link" style={{ color: 'var(--primary-accent)', fontWeight: 600 }}>Admin Panel</Link>}
          {isLoggedIn && isGymOwner && <Link to="/gym-owner" className="nav-link" style={{ color: '#8b5cf6', fontWeight: 600 }}>Gym Panel</Link>}
          {isLoggedIn && isFitnessInstructor && <Link to="/fitness-instructor" className="nav-link" style={{ color: '#10b981', fontWeight: 600 }}>Instructor Panel</Link>}
          {isLoggedIn && isGymTrainer && <Link to="/gym-trainer" className="nav-link" style={{ color: '#3b82f6', fontWeight: 600 }}>Trainer Panel</Link>}
          
          <div className="nav-auth-mobile">
            {!isLoggedIn ? (
              <Link to="/" className="btn btn-primary" style={{width: '100%'}}>Log In / Register</Link>
            ) : (
              <button onClick={handleLogout} className="btn btn-outline" style={{width: '100%'}}>Log Out</button>
            )}
          </div>
        </div>

        <div className="nav-actions" style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
          
          <button 
            onClick={toggleTheme} 
            className="btn btn-icon" 
            style={{ background: 'none', border: 'none', color: 'var(--text-primary)', cursor: 'pointer', padding: '6px' }}
            title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Mode`}
          >
            {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
          </button>

          {/* Notification Center */}
          {isLoggedIn && (
            <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
              
              {/* Notifications */}
              <div className="notification-container" style={{ position: 'relative' }}>
                <button 
                  className="btn btn-icon" 
                  style={{ background: 'none', border: 'none', color: 'var(--text-primary)', position: 'relative', cursor: 'pointer' }}
                  onClick={() => {
                    setShowNotifications(!showNotifications);
                    // Mark as read when opened
                    if (!showNotifications && notifications.some(n => !n.isRead)) {
                      fetch(`/api/notifications/${userName}/read`, { method: 'PUT' });
                      setNotifications(notifications.map(n => ({...n, isRead: true})));
                    }
                  }}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path><path d="M13.73 21a2 2 0 0 1-3.46 0"></path></svg>
                  {(Array.isArray(notifications) ? notifications : []).filter(n => n && !n.isRead).length > 0 && (
                    <span style={{ position: 'absolute', top: '-5px', right: '-5px', background: '#ef4444', color: 'white', fontSize: '0.6rem', padding: '2px 6px', borderRadius: '10px', fontWeight: 'bold' }}>
                      {(Array.isArray(notifications) ? notifications : []).filter(n => n && !n.isRead).length}
                    </span>
                  )}
                </button>
              
              {showNotifications && (
                <div className="glass-panel notification-dropdown" style={{ position: 'absolute', top: '100%', right: '-50px', marginTop: '15px', width: '300px', padding: '0', borderRadius: '12px', zIndex: 1000, overflow: 'hidden', boxShadow: '0 10px 30px rgba(0,0,0,0.5)' }}>
                  <div style={{ padding: '15px', borderBottom: '1px solid rgba(255,255,255,0.1)', background: 'rgba(0,0,0,0.2)' }}>
                    <h4 style={{ margin: 0 }}>Notifications</h4>
                  </div>
                  <div style={{ maxHeight: '350px', overflowY: 'auto' }}>
                    {notifications.length > 0 ? notifications.map((n, idx) => (
                      <div key={idx} style={{ padding: '15px', borderBottom: '1px solid rgba(255,255,255,0.05)', background: n.isRead ? 'transparent' : 'rgba(16, 185, 129, 0.1)', display: 'flex', gap: '10px', alignItems: 'start' }}>
                        <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: n.isRead ? 'transparent' : '#10b981', marginTop: '6px', flexShrink: 0 }}></div>
                        <div style={{ width: '100%' }}>
                          <p style={{ margin: 0, fontSize: '0.9rem' }}>{n.message}</p>
                          <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>{new Date(n.createdAt).toLocaleTimeString()}</span>
                          {n.type === 'friend_request' && n.message.includes('sent you a friend request') && (
                            <div style={{ marginTop: '10px' }}>
                              <button 
                                className="btn btn-primary btn-sm" 
                                style={{ padding: '6px 12px', fontSize: '0.8rem', width: '100%' }} 
                                onClick={(e) => { 
                                  e.stopPropagation(); 
                                  const senderName = n.message.replace(' sent you a friend request!', '');
                                  handleAcceptRequest(senderName, n._id); 
                                }}
                              >
                                Accept Request
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    )) : (
                      <p style={{ padding: '20px', textAlign: 'center', color: 'var(--text-secondary)', margin: 0, fontSize: '0.9rem' }}>No notifications yet.</p>
                    )}
                  </div>
                  <div style={{ padding: '10px', textAlign: 'center', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
                    <Link to="/profile" style={{ fontSize: '0.8rem', color: 'var(--primary-accent)', textDecoration: 'none' }} onClick={() => setShowNotifications(false)}>View All Activity</Link>
                  </div>
                </div>
              )}
              </div>
            </div>
          )}

          {!isGuest ? (
            <div className="profile-dropdown-container" ref={profileDropdownRef} style={{ position: 'relative' }}>
              <button 
                className="btn btn-outline profile-btn-mobile" 
                style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 12px', borderRadius: '30px', border: '1px solid rgba(255,255,255,0.2)', cursor: 'pointer' }}
                onClick={() => setShowProfileMenu(!showProfileMenu)}
              >
                <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: 'var(--primary-accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 'bold', overflow: 'hidden', flexShrink: 0 }}>
                  {profilePic ? <img src={profilePic} alt="Me" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : userName.charAt(0).toUpperCase()}
                </div>
                <span className="profile-text-mobile">Profile</span>
              </button>
              
              {/* Dropdown Menu */}
              {showProfileMenu && (
                <div className="glass-panel profile-dropdown-menu" style={{ position: 'absolute', top: '100%', right: '0', marginTop: '10px', width: '200px', padding: '10px', borderRadius: '12px', zIndex: 1000, boxShadow: '0 10px 30px rgba(0,0,0,0.3)' }}>
                  <Link to="/profile" onClick={() => setShowProfileMenu(false)} style={{ display: 'block', padding: '10px', color: 'var(--text-primary)', textDecoration: 'none', borderRadius: '8px', fontWeight: 500 }} onMouseEnter={e => e.target.style.background='var(--card-bg)'} onMouseLeave={e => e.target.style.background='transparent'}>View Profile</Link>
                  <div style={{ height: '1px', background: 'var(--card-border)', margin: '5px 0' }}></div>
                  <button onClick={handleLogout} style={{ width: '100%', textAlign: 'left', padding: '10px', background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', borderRadius: '8px', fontWeight: 500 }} onMouseEnter={e => e.target.style.background='rgba(239,68,68,0.1)'} onMouseLeave={e => e.target.style.background='transparent'}>Log Out</button>
                </div>
              )}
            </div>
          ) : (
            <Link to="/" className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
               <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 'bold' }}>?</div>
               Log In
            </Link>
          )}
          
          <button 
            className="mobile-menu-btn" 
            onClick={() => setIsMenuOpen(!isMenuOpen)}
          >
            {isMenuOpen ? <X size={28} /> : <Menu size={28} />}
          </button>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
