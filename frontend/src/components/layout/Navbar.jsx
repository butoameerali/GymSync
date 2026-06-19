import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Menu, X, Activity, Bell } from 'lucide-react';
import './Navbar.css';

const Navbar = () => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const userRole = localStorage.getItem('gymsync_role');
  const isGuest = userRole === 'guest';
  const isLoggedIn = userRole && userRole !== 'guest';
  const userName = localStorage.getItem('gymsync_user_name') || 'User';

  const [notifications, setNotifications] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [profilePic, setProfilePic] = useState('');
  
  // Friend Requests
  const [friendRequests, setFriendRequests] = useState([]);
  const [showRequests, setShowRequests] = useState(false);

  useEffect(() => {
    if (isLoggedIn) {
      // Fetch notifications
      fetch(`/api/notifications/${userName}`)
        .then(res => res.json())
        .then(data => setNotifications(Array.isArray(data) ? data : []))
        .catch(err => console.error("Error fetching notifications", err));
        
      // Fetch global profile pic & friend requests
      fetch(`/api/users/${userName}`)
        .then(res => res.json())
        .then(user => {
           if(user && !user.message) {
             if (user.profilePic) {
               setProfilePic(user.profilePic);
               localStorage.setItem(`gymsync_${userName.replace(/\s+/g, '_')}_pic`, user.profilePic);
             }
             if (user.receivedRequests) {
               setFriendRequests(Array.isArray(user.receivedRequests) ? user.receivedRequests : []);
             }
           }
        })
        .catch(err => console.error(err));

      const interval = setInterval(() => {
        fetch(`/api/notifications/${userName}`)
          .then(res => res.json())
          .then(data => setNotifications(Array.isArray(data) ? data : []))
          .catch(err => console.error("Interval Error", err));
          
        fetch(`/api/users/${userName}`)
          .then(res => res.json())
          .then(user => {
             if(user && !user.message && user.receivedRequests) {
               setFriendRequests(Array.isArray(user.receivedRequests) ? user.receivedRequests : []);
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
        headers: { 'Content-Type': 'application/json' },
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
    localStorage.removeItem('gymsync_token');
    localStorage.removeItem('gymsync_role');
    localStorage.removeItem('gymsync_user_name');
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
          <Link to={isLoggedIn ? "/home" : "/explore"} className="nav-link">Home</Link>
          <Link to="/explore" className="nav-link">Explore Gyms</Link>
          <Link to="/ai-trainer" className="nav-link text-gradient" style={{fontWeight: 700}}>Workout Hub</Link>
          {isLoggedIn && <Link to="/your-gym" className="nav-link">YourGym</Link>}
          <Link to="/store" className="nav-link">Store</Link>
          
          <div className="nav-auth-mobile">
            {!isLoggedIn ? (
              <Link to="/" className="btn btn-primary" style={{width: '100%'}}>Log In / Register</Link>
            ) : (
              <button onClick={handleLogout} className="btn btn-outline" style={{width: '100%'}}>Log Out</button>
            )}
          </div>
        </div>

        <div className="nav-actions" style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
          
          {/* Notification Center */}
          {isLoggedIn && (
            <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
              
              {/* Notifications */}
              <div className="notification-container" style={{ position: 'relative' }}>
                <button 
                  className="btn btn-icon" 
                  style={{ background: 'none', border: 'none', color: 'white', position: 'relative', cursor: 'pointer' }}
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
                  {notifications.filter(n => !n.isRead).length > 0 && (
                    <span style={{ position: 'absolute', top: '-5px', right: '-5px', background: '#ef4444', color: 'white', fontSize: '0.6rem', padding: '2px 6px', borderRadius: '10px', fontWeight: 'bold' }}>
                      {notifications.filter(n => !n.isRead).length}
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
            <div className="profile-dropdown-container" style={{ position: 'relative' }}>
              <button 
                className="btn btn-outline profile-btn-mobile" 
                style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 12px', borderRadius: '30px', border: '1px solid rgba(255,255,255,0.2)' }}
                onClick={(e) => {
                  const menu = e.currentTarget.nextElementSibling;
                  menu.style.display = menu.style.display === 'block' ? 'none' : 'block';
                }}
              >
                <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: 'var(--primary-accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 'bold', overflow: 'hidden', flexShrink: 0 }}>
                  {profilePic ? <img src={profilePic} alt="Me" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : userName.charAt(0).toUpperCase()}
                </div>
                <span className="profile-text-mobile">Profile</span>
              </button>
              
              {/* Dropdown Menu */}
              <div className="glass-panel profile-dropdown-menu" style={{ display: 'none', position: 'absolute', top: '100%', right: '0', marginTop: '10px', width: '200px', padding: '10px', borderRadius: '12px', zIndex: 1000 }}>
                <Link to="/profile" style={{ display: 'block', padding: '10px', color: 'white', textDecoration: 'none', borderRadius: '8px' }} onMouseEnter={e => e.target.style.background='rgba(255,255,255,0.1)'} onMouseLeave={e => e.target.style.background='transparent'}>View Profile</Link>
                <div style={{ height: '1px', background: 'rgba(255,255,255,0.1)', margin: '5px 0' }}></div>
                <button onClick={handleLogout} style={{ width: '100%', textAlign: 'left', padding: '10px', background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', borderRadius: '8px' }} onMouseEnter={e => e.target.style.background='rgba(239,68,68,0.1)'} onMouseLeave={e => e.target.style.background='transparent'}>Log Out</button>
              </div>
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
