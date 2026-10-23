import React, { useState, useEffect, useRef } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  Menu, 
  X, 
  Activity, 
  Bell, 
  MessageSquare, 
  Sun, 
  Moon, 
  Grip, 
  LifeBuoy, 
  ShoppingBag, 
  Film, 
  Home as HomeIcon, 
  Dumbbell, 
  Building2, 
  Compass, 
  Shield,
  ShieldAlert,
  Users,
  Settings
} from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import NotificationDropdown from '../../features/notifications/components/NotificationDropdown';
import MessageDropdown from '../../features/messages/components/MessageDropdown';
import { notificationService } from '../../features/notifications/services/notificationService';
import { messageService } from '../../features/messages/services/messageService';
import { toast } from 'react-toastify';
import { useAuth } from '../../context/AuthContext';
import UserAvatar from '../common/UserAvatar';
import ComplaintHubModal from '../common/ComplaintHubModal';
import './Navbar.css';

const Navbar = () => {
  const { theme, toggleTheme } = useTheme();
  const { user, userName: authName, userRole: authRole, logout } = useAuth();
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const token = user?.token || localStorage.getItem('gymsync_token') || '';
  const userRole = authRole || localStorage.getItem('gymsync_role') || '';
  const normalizedRole = userRole.toLowerCase().replace('_', '');
  const isGuest = userRole === 'guest' || !userRole || !token;
  const isLoggedIn = Boolean(userRole && userRole !== 'guest' && token);
  const isAdmin = normalizedRole === 'admin' || normalizedRole === 'superadmin' || normalizedRole === 'complaintmoderator';
  const isGymOwner = normalizedRole === 'gymowner';
  const isFitnessInstructor = normalizedRole === 'fitnessinstructor';
  const isGymTrainer = normalizedRole === 'gymtrainer';
  const isStoreManager = normalizedRole === 'storemanager';
  const isStaff = isAdmin || isGymOwner || isFitnessInstructor || isGymTrainer || isStoreManager;
  const userName = authName || user?.name || localStorage.getItem('gymsync_user_name') || 'User';

  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [unreadChatCount, setUnreadChatCount] = useState(0);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showMessages, setShowMessages] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [profilePic, setProfilePic] = useState('');
  const [hasGymSubscription, setHasGymSubscription] = useState(() => Boolean(localStorage.getItem('gymsync_user_gym')));
  const [subscribedGymName, setSubscribedGymName] = useState(() => localStorage.getItem('gymsync_user_gym') || '');
  
  // Friend Requests
  const [friendRequests, setFriendRequests] = useState([]);
  const [showRequests, setShowRequests] = useState(false);
  
  const location = useLocation();
  const profileDropdownRef = useRef(null);
  const notifDropdownRef = useRef(null);
  const messageDropdownRef = useRef(null);
  const gripDropdownRef = useRef(null);

  // Quick Action Launcher & Complaint Hub State
  const [showGripMenu, setShowGripMenu] = useState(false);
  const [showComplaintHub, setShowComplaintHub] = useState(false);

  // Close menus when route changes
  useEffect(() => {
    setIsMenuOpen(false);
    setShowProfileMenu(false);
    setShowNotifications(false);
    setShowMessages(false);
    setShowGripMenu(false);
  }, [location]);

  // Click outside to close dropdowns
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (notifDropdownRef.current && !notifDropdownRef.current.contains(event.target)) {
        setShowNotifications(false);
      }
      if (messageDropdownRef.current && !messageDropdownRef.current.contains(event.target)) {
        setShowMessages(false);
      }
      if (profileDropdownRef.current && !profileDropdownRef.current.contains(event.target)) {
        setShowProfileMenu(false);
        setShowRequests(false);
      }
      if (gripDropdownRef.current && !gripDropdownRef.current.contains(event.target)) {
        setShowGripMenu(false);
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
             const currentRole = localStorage.getItem('gymsync_role');
             if (user.role && currentRole && user.role !== currentRole) {
               localStorage.setItem('gymsync_role', user.role);
               window.location.reload();
             }
             if (user.profilePic) {
               setProfilePic(user.profilePic);
               localStorage.setItem(`gymsync_${userName.replace(/\s+/g, '_')}_pic`, user.profilePic);
             }
             if (user.receivedRequests) {
               setFriendRequests(Array.isArray(user.receivedRequests) ? user.receivedRequests : []);
             }
             const subscribedGym = user.subscribedGymName || '';
             setHasGymSubscription(Boolean(subscribedGym));
             setSubscribedGymName(subscribedGym);
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
        toast.error(`Failed to accept: ${err.message}`);
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
    window.location.href = '/login';
  };

  return (
    <nav className={`navbar ${isScrolled ? 'scrolled' : ''}`}>
      <div className="container nav-container">
        <Link to="/" className="nav-logo">
          <Activity className="logo-icon" size={32} />
          <span>GymSync</span>
        </Link>

        <div className={`nav-links ${isMenuOpen ? 'active' : ''}`}>
          <Link to="/home" className="nav-link" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <HomeIcon size={16} /> Home
          </Link>
          <Link to="/reels" className="nav-link" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Film size={16} color="#ec4899" /> Reels
          </Link>
          {!isStaff && (
            <Link to="/ai-trainer" className="nav-link text-gradient" style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 700 }}>
              <Dumbbell size={16} /> Workout Hub
            </Link>
          )}
          {!isStaff && (
            <Link to="/your-gym" className="nav-link" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Building2 size={16} /> Your Gym
            </Link>
          )}
          {!isStaff && (
            <Link to="/explore" className="nav-link" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Compass size={16} /> Explore Gyms
            </Link>
          )}
          {isLoggedIn && isAdmin && (
            <Link to="/admin" className="nav-link" style={{ color: 'var(--primary-accent)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Shield size={16} /> Admin Panel
            </Link>
          )}
          {isLoggedIn && isGymOwner && <Link to="/gym-owner" className="nav-link" style={{ color: '#8b5cf6', fontWeight: 600 }}>Gym Panel</Link>}
          {isLoggedIn && isFitnessInstructor && <Link to="/fitness-instructor" className="nav-link" style={{ color: '#10b981', fontWeight: 600 }}>Instructor Panel</Link>}
          {isLoggedIn && isGymTrainer && <Link to="/gym-trainer" className="nav-link" style={{ color: '#3b82f6', fontWeight: 600 }}>Trainer Panel</Link>}
          {isLoggedIn && isStoreManager && <Link to="/store-manager" className="nav-link" style={{ color: '#f59e0b', fontWeight: 600 }}>Store Panel</Link>}
          
          <div className="nav-auth-mobile">
            {!isLoggedIn ? (
              <Link to="/login" className="btn btn-primary" style={{width: '100%'}}>Log In / Register</Link>
            ) : (
              <button onClick={handleLogout} className="btn btn-outline" style={{width: '100%'}}>Log Out</button>
            )}
          </div>
        </div>

        <div className="nav-actions" style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
          
          {/* 3x3 Dots App Launcher (Store, Theme & Support Hub) */}
          <div className="grip-launcher-container" ref={gripDropdownRef} style={{ position: 'relative' }}>
            <button 
              onClick={() => {
                setShowGripMenu(prev => !prev);
                setShowNotifications(false);
                setShowMessages(false);
                setShowProfileMenu(false);
              }} 
              className="btn btn-icon" 
              style={{ 
                background: showGripMenu ? 'rgba(255, 255, 255, 0.1)' : 'none', 
                border: 'none', 
                color: 'var(--text-primary)', 
                cursor: 'pointer', 
                padding: '6px',
                borderRadius: '8px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'background 0.2s ease'
              }}
              title="Apps & Utilities"
              aria-label="Open Apps Menu"
            >
              <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
                <circle cx="3.5" cy="3.5" r="2" />
                <circle cx="10" cy="3.5" r="2" />
                <circle cx="16.5" cy="3.5" r="2" />
                <circle cx="3.5" cy="10" r="2" />
                <circle cx="10" cy="10" r="2" />
                <circle cx="16.5" cy="10" r="2" />
                <circle cx="3.5" cy="16.5" r="2" />
                <circle cx="10" cy="16.5" r="2" />
                <circle cx="16.5" cy="16.5" r="2" />
              </svg>
            </button>

            {showGripMenu && (
              <div 
                className="glass-panel" 
                style={{ 
                  position: 'absolute', 
                  top: '100%', 
                  right: '0', 
                  marginTop: '10px', 
                  width: '280px', 
                  padding: '12px', 
                  borderRadius: '16px', 
                  zIndex: 1000, 
                  boxShadow: '0 12px 40px rgba(0,0,0,0.5)',
                  background: 'var(--card-bg, #111827)',
                  border: '1px solid var(--card-border, rgba(255,255,255,0.1))'
                }}
              >
                <div style={{ padding: '4px 8px 10px', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary, #94a3b8)', textTransform: 'uppercase', letterSpacing: '0.5px', borderBottom: '1px solid rgba(255,255,255,0.06)', marginBottom: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span>GymSync Apps</span>
                  <span style={{ fontSize: '0.7rem', color: 'var(--primary-accent)' }}>Quick Access</span>
                </div>

                {/* 3:3 Column Grid */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
                  {/* Item 1: Store (Trainees / Members only; Admins see Admin Desk) */}
                  {isAdmin ? (
                    <Link
                      to="/admin"
                      onClick={() => setShowGripMenu(false)}
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px',
                        padding: '12px 6px',
                        borderRadius: '10px',
                        textDecoration: 'none',
                        color: 'var(--text-primary, #fff)',
                        background: 'rgba(255,255,255,0.03)',
                        border: '1px solid rgba(255,255,255,0.06)',
                        transition: 'all 0.2s ease',
                        cursor: 'pointer'
                      }}
                      onMouseEnter={e => {
                        e.currentTarget.style.background = 'rgba(99, 102, 241, 0.12)';
                        e.currentTarget.style.borderColor = 'rgba(99, 102, 241, 0.3)';
                      }}
                      onMouseLeave={e => {
                        e.currentTarget.style.background = 'rgba(255,255,255,0.03)';
                        e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)';
                      }}
                    >
                      <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: 'rgba(99, 102, 241, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Shield size={20} color="#818cf8" />
                      </div>
                      <span style={{ fontSize: '0.75rem', fontWeight: 600 }}>Admin Desk</span>
                    </Link>
                  ) : (
                    <Link
                      to="/store"
                      onClick={() => setShowGripMenu(false)}
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px',
                        padding: '12px 6px',
                        borderRadius: '10px',
                        textDecoration: 'none',
                        color: 'var(--text-primary, #fff)',
                        background: 'rgba(255,255,255,0.03)',
                        border: '1px solid rgba(255,255,255,0.06)',
                        transition: 'all 0.2s ease',
                        cursor: 'pointer'
                      }}
                      onMouseEnter={e => {
                        e.currentTarget.style.background = 'rgba(245, 158, 11, 0.12)';
                        e.currentTarget.style.borderColor = 'rgba(245, 158, 11, 0.3)';
                      }}
                      onMouseLeave={e => {
                        e.currentTarget.style.background = 'rgba(255,255,255,0.03)';
                        e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)';
                      }}
                    >
                      <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: 'rgba(245, 158, 11, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <ShoppingBag size={20} color="#f59e0b" />
                      </div>
                      <span style={{ fontSize: '0.75rem', fontWeight: 600 }}>Store</span>
                    </Link>
                  )}

                  {/* Item 2: Theme Toggle */}
                  <button
                    type="button"
                    onClick={() => {
                      toggleTheme();
                      setShowGripMenu(false);
                    }}
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px',
                      padding: '12px 6px',
                      borderRadius: '10px',
                      border: '1px solid rgba(255,255,255,0.06)',
                      background: 'rgba(255,255,255,0.03)',
                      color: 'var(--text-primary, #fff)',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease'
                    }}
                    onMouseEnter={e => {
                      e.currentTarget.style.background = 'rgba(99, 102, 241, 0.12)';
                      e.currentTarget.style.borderColor = 'rgba(99, 102, 241, 0.3)';
                    }}
                    onMouseLeave={e => {
                      e.currentTarget.style.background = 'rgba(255,255,255,0.03)';
                      e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)';
                    }}
                  >
                    <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: theme === 'dark' ? 'rgba(250, 204, 21, 0.15)' : 'rgba(129, 140, 248, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      {theme === 'dark' ? <Sun size={20} color="#facc15" /> : <Moon size={20} color="#818cf8" />}
                    </div>
                    <span style={{ fontSize: '0.75rem', fontWeight: 600 }}>{theme === 'dark' ? 'Light' : 'Dark'}</span>
                  </button>

                  {/* Item 3: Support / Complaints Desk */}
                  {isAdmin ? (
                    <Link
                      to="/admin?tab=complaints"
                      onClick={() => setShowGripMenu(false)}
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px',
                        padding: '12px 6px',
                        borderRadius: '10px',
                        textDecoration: 'none',
                        color: 'var(--text-primary, #fff)',
                        background: 'rgba(255,255,255,0.03)',
                        border: '1px solid rgba(255,255,255,0.06)',
                        transition: 'all 0.2s ease',
                        cursor: 'pointer'
                      }}
                      onMouseEnter={e => {
                        e.currentTarget.style.background = 'rgba(239, 68, 68, 0.12)';
                        e.currentTarget.style.borderColor = 'rgba(239, 68, 68, 0.3)';
                      }}
                      onMouseLeave={e => {
                        e.currentTarget.style.background = 'rgba(255,255,255,0.03)';
                        e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)';
                      }}
                    >
                      <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: 'rgba(239, 68, 68, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <MessageSquare size={20} color="#ef4444" />
                      </div>
                      <span style={{ fontSize: '0.75rem', fontWeight: 600 }}>Complaints</span>
                    </Link>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        setShowGripMenu(false);
                        setShowComplaintHub(true);
                      }}
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px',
                        padding: '12px 6px',
                        borderRadius: '10px',
                        border: '1px solid rgba(255,255,255,0.06)',
                        background: 'rgba(255,255,255,0.03)',
                        color: 'var(--text-primary, #fff)',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease'
                      }}
                      onMouseEnter={e => {
                        e.currentTarget.style.background = 'rgba(239, 68, 68, 0.12)';
                        e.currentTarget.style.borderColor = 'rgba(239, 68, 68, 0.3)';
                      }}
                      onMouseLeave={e => {
                        e.currentTarget.style.background = 'rgba(255,255,255,0.03)';
                        e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)';
                      }}
                    >
                      <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: 'rgba(239, 68, 68, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <LifeBuoy size={20} color="#ef4444" />
                      </div>
                      <span style={{ fontSize: '0.75rem', fontWeight: 600 }}>Support</span>
                    </button>
                  )}

                  {/* Item 4: Settings & Privacy */}
                  <Link
                    to="/settings"
                    onClick={() => setShowGripMenu(false)}
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px',
                      padding: '12px 6px',
                      borderRadius: '10px',
                      textDecoration: 'none',
                      color: 'var(--text-primary, #fff)',
                      background: 'rgba(255,255,255,0.03)',
                      border: '1px solid rgba(255,255,255,0.06)',
                      transition: 'all 0.2s ease',
                      cursor: 'pointer'
                    }}
                    onMouseEnter={e => {
                      e.currentTarget.style.background = 'rgba(56, 189, 248, 0.12)';
                      e.currentTarget.style.borderColor = 'rgba(56, 189, 248, 0.3)';
                    }}
                    onMouseLeave={e => {
                      e.currentTarget.style.background = 'rgba(255,255,255,0.03)';
                      e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)';
                    }}
                  >
                    <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: 'rgba(56, 189, 248, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Settings size={20} color="#38bdf8" />
                    </div>
                    <span style={{ fontSize: '0.75rem', fontWeight: 600 }}>Settings</span>
                  </Link>

                  {/* Item 5: Moderation Desk (Admin) vs Workout Hub (User) */}
                  {isAdmin ? (
                    <Link
                      to="/admin?tab=moderation"
                      onClick={() => setShowGripMenu(false)}
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px',
                        padding: '12px 6px',
                        borderRadius: '10px',
                        textDecoration: 'none',
                        color: 'var(--text-primary, #fff)',
                        background: 'rgba(255,255,255,0.03)',
                        border: '1px solid rgba(255,255,255,0.06)',
                        transition: 'all 0.2s ease',
                        cursor: 'pointer'
                      }}
                      onMouseEnter={e => {
                        e.currentTarget.style.background = 'rgba(168, 85, 247, 0.12)';
                        e.currentTarget.style.borderColor = 'rgba(168, 85, 247, 0.3)';
                      }}
                      onMouseLeave={e => {
                        e.currentTarget.style.background = 'rgba(255,255,255,0.03)';
                        e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)';
                      }}
                    >
                      <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: 'rgba(168, 85, 247, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <ShieldAlert size={20} color="#a855f7" />
                      </div>
                      <span style={{ fontSize: '0.75rem', fontWeight: 600 }}>Moderation</span>
                    </Link>
                  ) : (
                    <Link
                      to="/ai-trainer"
                      onClick={() => setShowGripMenu(false)}
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px',
                        padding: '12px 6px',
                        borderRadius: '10px',
                        textDecoration: 'none',
                        color: 'var(--text-primary, #fff)',
                        background: 'rgba(255,255,255,0.03)',
                        border: '1px solid rgba(255,255,255,0.06)',
                        transition: 'all 0.2s ease',
                        cursor: 'pointer'
                      }}
                      onMouseEnter={e => {
                        e.currentTarget.style.background = 'rgba(168, 85, 247, 0.12)';
                        e.currentTarget.style.borderColor = 'rgba(168, 85, 247, 0.3)';
                      }}
                      onMouseLeave={e => {
                        e.currentTarget.style.background = 'rgba(255,255,255,0.03)';
                        e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)';
                      }}
                    >
                      <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: 'rgba(168, 85, 247, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Dumbbell size={20} color="#a855f7" />
                      </div>
                      <span style={{ fontSize: '0.75rem', fontWeight: 600 }}>Workouts</span>
                    </Link>
                  )}

                  {/* Item 6: User Management (Admin) vs Explore Gyms (User) */}
                  {isAdmin ? (
                    <Link
                      to="/admin?tab=users"
                      onClick={() => setShowGripMenu(false)}
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px',
                        padding: '12px 6px',
                        borderRadius: '10px',
                        textDecoration: 'none',
                        color: 'var(--text-primary, #fff)',
                        background: 'rgba(255,255,255,0.03)',
                        border: '1px solid rgba(255,255,255,0.06)',
                        transition: 'all 0.2s ease',
                        cursor: 'pointer'
                      }}
                      onMouseEnter={e => {
                        e.currentTarget.style.background = 'rgba(16, 185, 129, 0.12)';
                        e.currentTarget.style.borderColor = 'rgba(16, 185, 129, 0.3)';
                      }}
                      onMouseLeave={e => {
                        e.currentTarget.style.background = 'rgba(255,255,255,0.03)';
                        e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)';
                      }}
                    >
                      <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: 'rgba(16, 185, 129, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Users size={20} color="#10b981" />
                      </div>
                      <span style={{ fontSize: '0.75rem', fontWeight: 600 }}>Users</span>
                    </Link>
                  ) : (
                    <Link
                      to="/explore"
                      onClick={() => setShowGripMenu(false)}
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px',
                        padding: '12px 6px',
                        borderRadius: '10px',
                        textDecoration: 'none',
                        color: 'var(--text-primary, #fff)',
                        background: 'rgba(255,255,255,0.03)',
                        border: '1px solid rgba(255,255,255,0.06)',
                        transition: 'all 0.2s ease',
                        cursor: 'pointer'
                      }}
                      onMouseEnter={e => {
                        e.currentTarget.style.background = 'rgba(16, 185, 129, 0.12)';
                        e.currentTarget.style.borderColor = 'rgba(16, 185, 129, 0.3)';
                      }}
                      onMouseLeave={e => {
                        e.currentTarget.style.background = 'rgba(255,255,255,0.03)';
                        e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)';
                      }}
                    >
                      <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: 'rgba(16, 185, 129, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Compass size={20} color="#10b981" />
                      </div>
                      <span style={{ fontSize: '0.75rem', fontWeight: 600 }}>Explore</span>
                    </Link>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Notification & Message Center */}
          {isLoggedIn && (
            <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
              
              {/* Message Center Button & Dropdown */}
              <div className="message-nav-container" ref={messageDropdownRef} style={{ position: 'relative' }}>
                <button 
                  className="btn btn-icon" 
                  style={{ background: 'none', border: 'none', color: 'var(--text-primary)', position: 'relative', cursor: 'pointer', padding: '6px' }}
                  onClick={() => {
                    setShowMessages(prev => !prev);
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
              <div className="notification-container" ref={notifDropdownRef} style={{ position: 'relative' }}>
                <button 
                  className="btn btn-icon" 
                  style={{ background: 'none', border: 'none', color: 'var(--text-primary)', position: 'relative', cursor: 'pointer', padding: '6px' }}
                  onClick={() => {
                    setShowNotifications(prev => !prev);
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
                <UserAvatar src={profilePic} name={userName} size={28} />
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
            <Link to="/login" className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
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

      <ComplaintHubModal 
        isOpen={showComplaintHub} 
        onClose={() => setShowComplaintHub(false)} 
      />
    </nav>
  );
};

export default Navbar;
