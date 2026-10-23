import React, { useState, useEffect, useRef } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  Activity, 
  Home, 
  Film, 
  Dumbbell, 
  Building2, 
  Compass, 
  ShoppingBag, 
  MessageSquare, 
  Bell, 
  Menu as MenuIcon, 
  Settings, 
  LifeBuoy, 
  Sun, 
  Moon, 
  LogOut, 
  User as UserIcon, 
  LogIn, 
  ChevronUp, 
  Shield, 
  ShieldAlert, 
  UserCheck 
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { notificationService } from '../../features/notifications/services/notificationService';
import { messageService } from '../../features/messages/services/messageService';
import UserAvatar from '../common/UserAvatar';
import ComplaintHubModal from '../common/ComplaintHubModal';
import './AppSidebar.css';

const AppSidebar = () => {
  const location = useLocation();
  const { theme, toggleTheme } = useTheme();
  const { user, userName: authName, userRole: authRole, logout } = useAuth();

  const token = user?.token || localStorage.getItem('gymsync_token') || '';
  const userRole = authRole || localStorage.getItem('gymsync_role') || '';
  const normalizedRole = userRole.toLowerCase().replace(/[_\s]/g, '');
  const isGuest = userRole === 'guest' || !userRole || !token;
  const isLoggedIn = Boolean(userRole && userRole !== 'guest' && token);
  const userName = authName || user?.name || localStorage.getItem('gymsync_user_name') || 'Guest';

  // Privileged Staff Roles
  const isAdmin = normalizedRole === 'admin' || normalizedRole === 'superadmin';
  const isModerator = normalizedRole === 'complaintmoderator';
  const isGymOwner = normalizedRole === 'gymowner';
  const isFitnessInstructor = normalizedRole === 'fitnessinstructor';
  const isGymTrainer = normalizedRole === 'gymtrainer';
  const isStoreManager = normalizedRole === 'storemanager';
  const isStaff = isAdmin || isModerator || isGymOwner || isFitnessInstructor || isGymTrainer || isStoreManager;

  const [unreadCount, setUnreadCount] = useState(0);
  const [unreadChatCount, setUnreadChatCount] = useState(0);
  const [profilePic, setProfilePic] = useState('');
  
  // Popovers
  const [showMenuPopover, setShowMenuPopover] = useState(false);
  const [showProfilePopover, setShowProfilePopover] = useState(false);
  const [showComplaintHub, setShowComplaintHub] = useState(false);

  const menuPopoverRef = useRef(null);
  const profilePopoverRef = useRef(null);

  // Close popovers on route change
  useEffect(() => {
    setShowMenuPopover(false);
    setShowProfilePopover(false);
  }, [location.pathname]);

  // Click outside to dismiss popovers
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuPopoverRef.current && !menuPopoverRef.current.contains(e.target)) {
        setShowMenuPopover(false);
      }
      if (profilePopoverRef.current && !profilePopoverRef.current.contains(e.target)) {
        setShowProfilePopover(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Sync Unread Count & Profile Photo
  useEffect(() => {
    if (isLoggedIn && token) {
      const authHeader = { Authorization: `Bearer ${token}` };

      const syncCounts = async () => {
        try {
          const [notifData, chatData] = await Promise.all([
            notificationService.getNotifications(userName, 1, 10),
            messageService.getUnreadCount()
          ]);
          const notifList = notifData?.notifications || (Array.isArray(notifData) ? notifData : []);
          setUnreadCount(notifData?.unreadCount ?? notifList.filter(n => n && !n.isRead).length);
          setUnreadChatCount(chatData?.unreadCount || 0);
        } catch (err) {
          // Graceful network fallback
        }
      };

      syncCounts();

      fetch(`/api/users/${userName}`, { headers: authHeader })
        .then(res => res.ok ? res.json() : null)
        .then(data => {
          if (data && data.profilePic) {
            setProfilePic(data.profilePic);
          }
        })
        .catch(() => {});

      const interval = setInterval(syncCounts, 12000);
      return () => clearInterval(interval);
    }
  }, [isLoggedIn, token, userName]);

  const handleLogout = () => {
    setShowProfilePopover(false);
    if (logout) {
      logout();
    } else {
      localStorage.removeItem('userInfo');
      localStorage.removeItem('gymsync_token');
      localStorage.removeItem('gymsync_role');
      localStorage.removeItem('gymsync_user_name');
      localStorage.removeItem('gymsync_subscribed');
    }
    window.location.href = '/login';
  };

  const isActive = (path) => {
    if (path === '/home' && (location.pathname === '/' || location.pathname === '/home')) return true;
    return location.pathname.startsWith(path);
  };

  return (
    <>
      <aside className="app-sidebar">
        {/* Top: Brand Logo & Navigation */}
        <div className="sidebar-top">
          <Link to="/home" className="sidebar-brand">
            <div className="sidebar-brand-icon">
              <Activity size={22} />
            </div>
            <span className="sidebar-brand-title">GymSync</span>
          </Link>

          <nav className="sidebar-nav-group">
            <Link to="/home" className={`sidebar-link ${isActive('/home') ? 'active' : ''}`}>
              <span className="sidebar-icon"><Home size={22} /></span>
              <span className="sidebar-label">Home</span>
            </Link>

            <Link to="/reels" className={`sidebar-link ${isActive('/reels') ? 'active' : ''}`}>
              <span className="sidebar-icon"><Film size={22} /></span>
              <span className="sidebar-label">Reels</span>
            </Link>

            {!isStaff && (
              <Link to="/ai-trainer" className={`sidebar-link ${isActive('/ai-trainer') ? 'active' : ''}`}>
                <span className="sidebar-icon"><Dumbbell size={22} /></span>
                <span className="sidebar-label">Workout Hub</span>
              </Link>
            )}

            {!isStaff && (
              <Link to="/your-gym" className={`sidebar-link ${isActive('/your-gym') ? 'active' : ''}`}>
                <span className="sidebar-icon"><Building2 size={22} /></span>
                <span className="sidebar-label">Your Gym</span>
              </Link>
            )}

            <Link to="/explore" className={`sidebar-link ${isActive('/explore') ? 'active' : ''}`}>
              <span className="sidebar-icon"><Compass size={22} /></span>
              <span className="sidebar-label">Explore Gyms</span>
            </Link>

            <Link to="/store" className={`sidebar-link ${isActive('/store') ? 'active' : ''}`}>
              <span className="sidebar-icon"><ShoppingBag size={22} /></span>
              <span className="sidebar-label">Store</span>
            </Link>

            {isLoggedIn && (
              <Link to="/messages" className={`sidebar-link ${isActive('/messages') || isActive('/chat') ? 'active' : ''}`}>
                <span className="sidebar-icon"><MessageSquare size={22} /></span>
                <span className="sidebar-label">Messages</span>
                {unreadChatCount > 0 && <span className="sidebar-badge">{unreadChatCount}</span>}
              </Link>
            )}

            {isLoggedIn && (
              <Link to="/notifications" className={`sidebar-link ${isActive('/notifications') ? 'active' : ''}`}>
                <span className="sidebar-icon"><Bell size={22} /></span>
                <span className="sidebar-label">Notifications</span>
                {unreadCount > 0 && <span className="sidebar-badge">{unreadCount}</span>}
              </Link>
            )}

            {/* Menu Button & Secondary Flyout Menu (Desktop Sidebar Only) */}
            <div className="sidebar-popover-wrapper hide-on-mobile" ref={menuPopoverRef}>
              <button 
                type="button" 
                className={`sidebar-link ${showMenuPopover ? 'active' : ''}`}
                onClick={() => {
                  setShowMenuPopover(prev => !prev);
                  setShowProfilePopover(false);
                }}
                title="More Options"
              >
                <span className="sidebar-icon"><MenuIcon size={22} /></span>
                <span className="sidebar-label">Menu</span>
              </button>

              {showMenuPopover && (
                <div className="sidebar-popover">
                  {/* Your Gym (Mobile shortcut) */}
                  {!isStaff && (
                    <Link to="/your-gym" className="popover-item show-on-mobile-flex" onClick={() => setShowMenuPopover(false)}>
                      <Building2 size={18} color="var(--primary-accent)" />
                      <span>Your Gym</span>
                    </Link>
                  )}

                  {/* Messages (Mobile shortcut) */}
                  {isLoggedIn && (
                    <Link to="/messages" className="popover-item show-on-mobile-flex" onClick={() => setShowMenuPopover(false)}>
                      <MessageSquare size={18} color="#3b82f6" />
                      <span>Messages</span>
                      {unreadChatCount > 0 && <span className="sidebar-badge" style={{ marginLeft: 'auto' }}>{unreadChatCount}</span>}
                    </Link>
                  )}

                  {/* Notifications (Mobile shortcut) */}
                  {isLoggedIn && (
                    <Link to="/notifications" className="popover-item show-on-mobile-flex" onClick={() => setShowMenuPopover(false)}>
                      <Bell size={18} color="#f59e0b" />
                      <span>Notifications</span>
                      {unreadCount > 0 && <span className="sidebar-badge" style={{ marginLeft: 'auto' }}>{unreadCount}</span>}
                    </Link>
                  )}

                  {/* Theme Switcher */}
                  <button 
                    type="button" 
                    className="popover-item"
                    onClick={() => {
                      toggleTheme();
                      setShowMenuPopover(false);
                    }}
                  >
                    {theme === 'dark' ? <Sun size={18} color="#f59e0b" /> : <Moon size={18} color="#3b82f6" />}
                    <span>{theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}</span>
                  </button>

                  {/* Store Link */}
                  <Link to="/store" className="popover-item" onClick={() => setShowMenuPopover(false)}>
                    <ShoppingBag size={18} color="var(--primary-accent)" />
                    <span>GymSync Store</span>
                  </Link>

                  {/* Settings */}
                  {isLoggedIn && (
                    <Link to="/settings" className="popover-item" onClick={() => setShowMenuPopover(false)}>
                      <Settings size={18} />
                      <span>Settings & Privacy</span>
                    </Link>
                  )}

                  {/* Help & Support Hub */}
                  <button 
                    type="button" 
                    className="popover-item"
                    onClick={() => {
                      setShowComplaintHub(true);
                      setShowMenuPopover(false);
                    }}
                  >
                    <LifeBuoy size={18} color="#ef4444" />
                    <span>Help & Support</span>
                  </button>

                  {/* Role Specific Management Panels if staff */}
                  {isLoggedIn && isStaff && (
                    <>
                      <div className="popover-divider" />
                      {isAdmin && (
                        <Link to="/admin" className="popover-item" onClick={() => setShowMenuPopover(false)}>
                          <Shield size={18} color="var(--primary-accent)" />
                          <span>Admin Portal</span>
                        </Link>
                      )}
                      {isModerator && (
                        <Link to="/moderator" className="popover-item" onClick={() => setShowMenuPopover(false)}>
                          <ShieldAlert size={18} color="#f59e0b" />
                          <span>Moderation Hub</span>
                        </Link>
                      )}
                      {isGymOwner && (
                        <Link to="/gym-owner" className="popover-item" onClick={() => setShowMenuPopover(false)}>
                          <Building2 size={18} color="#8b5cf6" />
                          <span>Gym Owner Panel</span>
                        </Link>
                      )}
                      {isFitnessInstructor && (
                        <Link to="/fitness-instructor" className="popover-item" onClick={() => setShowMenuPopover(false)}>
                          <Activity size={18} color="#10b981" />
                          <span>Instructor Panel</span>
                        </Link>
                      )}
                      {isGymTrainer && (
                        <Link to="/gym-trainer" className="popover-item" onClick={() => setShowMenuPopover(false)}>
                          <UserCheck size={18} color="#3b82f6" />
                          <span>Trainer Panel</span>
                        </Link>
                      )}
                      {isStoreManager && (
                        <Link to="/store-manager" className="popover-item" onClick={() => setShowMenuPopover(false)}>
                          <ShoppingBag size={18} color="#f59e0b" />
                          <span>Store Manager</span>
                        </Link>
                      )}
                    </>
                  )}

                  {/* Mobile Profile & Logout */}
                  {isLoggedIn ? (
                    <div className="show-on-mobile-flex" style={{ flexDirection: 'column', gap: '4px' }}>
                      <div className="popover-divider" />
                      <Link to="/profile" className="popover-item" onClick={() => setShowMenuPopover(false)}>
                        <UserIcon size={18} color="var(--primary-accent)" />
                        <span>My Profile ({userName})</span>
                      </Link>
                      <button type="button" className="popover-item danger" onClick={handleLogout}>
                        <LogOut size={18} color="#ef4444" />
                        <span>Log Out</span>
                      </button>
                    </div>
                  ) : (
                    <div className="show-on-mobile-flex" style={{ flexDirection: 'column', gap: '4px' }}>
                      <div className="popover-divider" />
                      <Link to="/login" className="popover-item" onClick={() => setShowMenuPopover(false)}>
                        <LogIn size={18} color="var(--primary-accent)" />
                        <span>Log In</span>
                      </Link>
                    </div>
                  )}
                </div>
              )}
            </div>
          </nav>
        </div>

        {/* Bottom: Profile Trigger & Popover */}
        <div className="sidebar-bottom">
          {!isGuest ? (
            <div className="sidebar-popover-wrapper" ref={profilePopoverRef}>
              <button 
                type="button" 
                className="sidebar-profile-btn"
                onClick={() => {
                  setShowProfilePopover(prev => !prev);
                  setShowMenuPopover(false);
                }}
              >
                <div className="sidebar-profile-left">
                  <UserAvatar src={profilePic} name={userName} size={34} />
                  <div className="sidebar-profile-details">
                    <span className="sidebar-profile-name">{userName}</span>
                    <span className="sidebar-profile-role">{userRole}</span>
                  </div>
                </div>
                <ChevronUp size={16} className="sidebar-profile-arrow" style={{ color: 'var(--text-secondary)' }} />
              </button>

              {/* Profile Popover with View Profile & Logout */}
              {showProfilePopover && (
                <div className="sidebar-popover">
                  <Link 
                    to="/profile" 
                    className="popover-item"
                    onClick={() => setShowProfilePopover(false)}
                  >
                    <UserIcon size={18} color="var(--primary-accent)" />
                    <span>View Profile</span>
                  </Link>

                  <div className="popover-divider" />

                  <button 
                    type="button" 
                    className="popover-item danger"
                    onClick={handleLogout}
                  >
                    <LogOut size={18} color="#ef4444" />
                    <span>Log Out</span>
                  </button>
                </div>
              )}
            </div>
          ) : (
            <Link to="/login" className="sidebar-link active" style={{ justifyContent: 'center' }}>
              <LogIn size={18} />
              <span className="sidebar-label">Log In</span>
            </Link>
          )}
        </div>
      </aside>

      <ComplaintHubModal 
        isOpen={showComplaintHub} 
        onClose={() => setShowComplaintHub(false)} 
      />
    </>
  );
};

export default AppSidebar;
