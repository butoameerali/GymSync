import React, { useState, useEffect, useRef } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Menu, X, Activity, Bell, MessageSquare, Sun, Moon } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import NotificationDropdown from '../../features/notifications/components/NotificationDropdown';
import MessageDropdown from '../../features/messages/components/MessageDropdown';
import { notificationService } from '../../features/notifications/services/notificationService';
import { messageService } from '../../features/messages/services/messageService';
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
  const [unreadCount, setUnreadCount] = useState(0);
  const [unreadChatCount, setUnreadChatCount] = useState(0);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showMessages, setShowMessages] = useState(false);
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

      const syncCounts = async () => {
        try {
          const [notifData, chatData] = await Promise.all([
            notificationService.getNotifications(userName, 1, 10),
            messageService.getUnreadCount()
          ]);

          const notifList = notifData?.notifications || (Array.isArray(notifData) ? notifData : []);
          setNotifications(notifList);
          setUnreadCount(notifData?.unreadCount ?? notifList.filter(n => n && !n.isRead).length);
          setUnreadChatCount(chatData?.unreadCount || 0);
        } catch (err) {
          console.error("Error syncing unread counts:", err.message);
        }
      };

      syncCounts();

      // Fetch global profile pic & friend requests
      fetch(`/api/users/${userName}`, { headers: authHeader })
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
        syncCounts();
      }, 8000);
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

          {/* Notification & Message Center */}
          {isLoggedIn && (
            <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
              
              {/* Message Center Button & Dropdown */}
              <div className="message-nav-container" style={{ position: 'relative' }}>
                <button 
                  className="btn btn-icon" 
                  style={{ background: 'none', border: 'none', color: 'var(--text-primary)', position: 'relative', cursor: 'pointer', padding: '6px' }}
                  onClick={() => {
                    setShowMessages(!showMessages);
                    setShowNotifications(false);
                    setShowProfileMenu(false);
                  }}
                  title="Messages"
                  aria-label="Open messages"
                >
                  <MessageSquare size={22} />
                  {unreadChatCount > 0 && (
                    <span style={{ position: 'absolute', top: '-2px', right: '-4px', background: '#38bdf8', color: '#0f172a', fontSize: '0.65rem', padding: '1px 6px', borderRadius: '10px', fontWeight: 'bold' }}>
                      {unreadChatCount}
                    </span>
                  )}
                </button>

                {showMessages && (
                  <MessageDropdown
                    userName={userName}
                    onClose={() => setShowMessages(false)}
                    unreadChatCount={unreadChatCount}
                    setUnreadChatCount={setUnreadChatCount}
                  />
                )}
              </div>

              {/* Notification Center Button & Dropdown */}
              <div className="notification-container" style={{ position: 'relative' }}>
                <button 
                  className="btn btn-icon" 
                  style={{ background: 'none', border: 'none', color: 'var(--text-primary)', position: 'relative', cursor: 'pointer', padding: '6px' }}
                  onClick={() => {
                    setShowNotifications(!showNotifications);
                    setShowMessages(false);
                    setShowProfileMenu(false);
                  }}
                  title="Notifications"
                  aria-label="Open notifications"
                >
                  <Bell size={22} />
                  {unreadCount > 0 && (
                    <span style={{ position: 'absolute', top: '-2px', right: '-4px', background: '#ef4444', color: 'white', fontSize: '0.65rem', padding: '1px 6px', borderRadius: '10px', fontWeight: 'bold' }}>
                      {unreadCount}
                    </span>
                  )}
                </button>

                {showNotifications && (
                  <NotificationDropdown
                    notifications={notifications}
                    setNotifications={setNotifications}
                    userName={userName}
                    onClose={() => setShowNotifications(false)}
                    unreadCount={unreadCount}
                    setUnreadCount={setUnreadCount}
                  />
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
