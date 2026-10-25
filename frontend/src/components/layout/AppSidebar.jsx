import React, { useState, useEffect, useRef } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
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
  UserCheck,
  X 
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { notificationService } from '../../features/notifications/services/notificationService';
import { messageService } from '../../features/messages/services/messageService';
import UserAvatar from '../common/UserAvatar';
import ComplaintHubModal from '../common/ComplaintHubModal';
import './AppSidebar.css';

const AppSidebar = ({ isRail = false }) => {
  const location = useLocation();
  const navigate = useNavigate();
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

  const handleMenuNavigate = (path) => {
    setShowMenuPopover(false);
    navigate(path);
  };

  // Close popovers on route change
  useEffect(() => {
    setShowMenuPopover(false);
    setShowProfilePopover(false);
  }, [location.pathname]);

  // Click outside to dismiss popovers
  useEffect(() => {
    const handleClickOutside = (e) => {
      // Don't close if clicking inside the mobile drawer
      if (e.target && e.target.closest && e.target.closest('.mobile-menu-drawer')) {
        return;
      }
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

      const handleReadEvent = (e) => {
        if (e.detail && typeof e.detail.unreadCount === 'number') {
          setUnreadCount(e.detail.unreadCount);
        } else if (e.detail && typeof e.detail.delta === 'number') {
          setUnreadCount(prev => Math.max(0, prev + e.detail.delta));
        } else {
          setUnreadCount(0);
        }
      };
      window.addEventListener('gymsync_notifications_read', handleReadEvent);

      const interval = setInterval(syncCounts, 12000);
      return () => {
        clearInterval(interval);
        window.removeEventListener('gymsync_notifications_read', handleReadEvent);
      };
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
      <aside className={`app-sidebar ${isRail ? 'rail-mode' : ''}`}>
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
              <Link to="/your-gym" className={`sidebar-link hide-on-mobile ${isActive('/your-gym') ? 'active' : ''}`}>
                <span className="sidebar-icon"><Building2 size={22} /></span>
                <span className="sidebar-label">Your Gym</span>
              </Link>
            )}

            {!isStaff && (
              <Link to="/explore" className={`sidebar-link hide-on-mobile ${isActive('/explore') ? 'active' : ''}`}>
                <span className="sidebar-icon"><Compass size={22} /></span>
                <span className="sidebar-label">Explore Gyms</span>
              </Link>
            )}

            {/* Direct Staff Portal Access */}
            {isGymTrainer && (
              <Link to="/gym-trainer" className={`sidebar-link ${isActive('/gym-trainer') ? 'active' : ''}`}>
                <span className="sidebar-icon"><UserCheck size={22} /></span>
                <span className="sidebar-label">Trainer Portal</span>
              </Link>
            )}

            {isGymOwner && (
              <Link to="/gym-owner" className={`sidebar-link ${isActive('/gym-owner') ? 'active' : ''}`}>
                <span className="sidebar-icon"><Building2 size={22} /></span>
                <span className="sidebar-label">Owner Portal</span>
              </Link>
            )}

            {isFitnessInstructor && (
              <Link to="/fitness-instructor" className={`sidebar-link ${isActive('/fitness-instructor') ? 'active' : ''}`}>
                <span className="sidebar-icon"><Activity size={22} /></span>
                <span className="sidebar-label">Instructor Portal</span>
              </Link>
            )}

            {isStoreManager && (
              <Link to="/store-manager" className={`sidebar-link ${isActive('/store-manager') ? 'active' : ''}`}>
                <span className="sidebar-icon"><ShoppingBag size={22} /></span>
                <span className="sidebar-label">Store Manager</span>
              </Link>
            )}

            {isAdmin && (
              <Link to="/admin" className={`sidebar-link ${isActive('/admin') ? 'active' : ''}`}>
                <span className="sidebar-icon"><Shield size={22} /></span>
                <span className="sidebar-label">Admin Portal</span>
              </Link>
            )}

            {isModerator && (
              <Link to="/moderator" className={`sidebar-link ${isActive('/moderator') ? 'active' : ''}`}>
                <span className="sidebar-icon"><ShieldAlert size={22} /></span>
                <span className="sidebar-label">Moderator Hub</span>
              </Link>
            )}

            <Link to="/store" className={`sidebar-link hide-on-mobile ${isActive('/store') ? 'active' : ''}`}>
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
              <Link to="/notifications" className={`sidebar-link hide-on-mobile ${isActive('/notifications') ? 'active' : ''}`}>
                <span className="sidebar-icon"><Bell size={22} /></span>
                <span className="sidebar-label">Notifications</span>
                {unreadCount > 0 && <span className="sidebar-badge">{unreadCount}</span>}
              </Link>
            )}

            {/* Menu Button (Desktop & Mobile) */}
            <div className="sidebar-popover-wrapper" ref={menuPopoverRef}>
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
                <div className="sidebar-popover desktop-only-popover">
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

                  {isGymTrainer && (
                    <Link 
                      to="/gym-trainer" 
                      className="popover-item"
                      onClick={() => setShowProfilePopover(false)}
                    >
                      <UserCheck size={18} color="#3b82f6" />
                      <span>Trainer Portal</span>
                    </Link>
                  )}

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

      {/* Mobile Slide-Up Menu Drawer Container */}
      {showMenuPopover && (
        <div className="mobile-menu-drawer-backdrop" onClick={() => setShowMenuPopover(false)}>
          <div className="mobile-menu-drawer" onClick={(e) => e.stopPropagation()}>
            <div className="mobile-menu-drawer-handle" />
            <div className="mobile-menu-header">
              <div className="mobile-menu-header-title">
                <MenuIcon size={20} color="var(--primary-accent)" />
                <span>GymSync Menu</span>
              </div>
              <button 
                type="button" 
                className="mobile-menu-close-btn"
                onClick={() => setShowMenuPopover(false)}
                title="Close"
              >
                <X size={20} />
              </button>
            </div>

            <div className="mobile-menu-content">
              {/* Theme Toggle */}
              <button 
                type="button" 
                className="mobile-menu-item"
                onClick={() => {
                  toggleTheme();
                  setShowMenuPopover(false);
                }}
              >
                <div className="mobile-menu-item-icon">
                  {theme === 'dark' ? <Sun size={20} color="#f59e0b" /> : <Moon size={20} color="#3b82f6" />}
                </div>
                <div className="mobile-menu-item-info">
                  <span className="mobile-menu-item-title">
                    {theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
                  </span>
                  <span className="mobile-menu-item-sub">Appearance and theme</span>
                </div>
              </button>

              {/* Explore Partner Gyms (Consumers only) */}
              {!isStaff && (
                <button 
                  type="button" 
                  className="mobile-menu-item"
                  onClick={() => handleMenuNavigate('/explore')}
                >
                  <div className="mobile-menu-item-icon">
                    <Compass size={20} color="#10b981" />
                  </div>
                  <div className="mobile-menu-item-info">
                    <span className="mobile-menu-item-title">Explore Partner Gyms</span>
                    <span className="mobile-menu-item-sub">Find locations & facilities near you</span>
                  </div>
                </button>
              )}

              {/* Trainer Portal (Mobile Staff) */}
              {isGymTrainer && (
                <button 
                  type="button" 
                  className="mobile-menu-item"
                  onClick={() => handleMenuNavigate('/gym-trainer')}
                >
                  <div className="mobile-menu-item-icon">
                    <UserCheck size={20} color="#3b82f6" />
                  </div>
                  <div className="mobile-menu-item-info">
                    <span className="mobile-menu-item-title">Trainer Portal</span>
                    <span className="mobile-menu-item-sub">Manage members & routines</span>
                  </div>
                </button>
              )}

              {/* Store */}
              <button 
                type="button" 
                className="mobile-menu-item"
                onClick={() => handleMenuNavigate('/store')}
              >
                <div className="mobile-menu-item-icon">
                  <ShoppingBag size={20} color="var(--primary-accent)" />
                </div>
                <div className="mobile-menu-item-info">
                  <span className="mobile-menu-item-title">GymSync Store</span>
                  <span className="mobile-menu-item-sub">Supplements, gear & apparel</span>
                </div>
              </button>

              {/* Your Gym */}
              {!isStaff && (
                <button 
                  type="button" 
                  className="mobile-menu-item"
                  onClick={() => handleMenuNavigate('/your-gym')}
                >
                  <div className="mobile-menu-item-icon">
                    <Building2 size={20} color="#8b5cf6" />
                  </div>
                  <div className="mobile-menu-item-info">
                    <span className="mobile-menu-item-title">Your Gym</span>
                    <span className="mobile-menu-item-sub">Plans, equipment & attendance</span>
                  </div>
                </button>
              )}

              {/* Messages */}
              {isLoggedIn && (
                <button 
                  type="button" 
                  className="mobile-menu-item"
                  onClick={() => handleMenuNavigate('/messages')}
                >
                  <div className="mobile-menu-item-icon">
                    <MessageSquare size={20} color="#3b82f6" />
                  </div>
                  <div className="mobile-menu-item-info">
                    <span className="mobile-menu-item-title">Messages</span>
                    <span className="mobile-menu-item-sub">Direct conversations & chats</span>
                  </div>
                  {unreadChatCount > 0 && (
                    <span className="sidebar-badge">{unreadChatCount}</span>
                  )}
                </button>
              )}

              {/* Settings & Privacy */}
              {isLoggedIn && (
                <button 
                  type="button" 
                  className="mobile-menu-item"
                  onClick={() => handleMenuNavigate('/settings')}
                >
                  <div className="mobile-menu-item-icon">
                    <Settings size={20} color="var(--text-secondary)" />
                  </div>
                  <div className="mobile-menu-item-info">
                    <span className="mobile-menu-item-title">Settings & Privacy</span>
                    <span className="mobile-menu-item-sub">Account & security</span>
                  </div>
                </button>
              )}

              {/* Help & Support */}
              <button 
                type="button" 
                className="mobile-menu-item"
                onClick={() => {
                  setShowComplaintHub(true);
                  setShowMenuPopover(false);
                }}
              >
                <div className="mobile-menu-item-icon">
                  <LifeBuoy size={20} color="#ef4444" />
                </div>
                <div className="mobile-menu-item-info">
                  <span className="mobile-menu-item-title">Help & Support</span>
                  <span className="mobile-menu-item-sub">Contact moderators & support hub</span>
                </div>
              </button>

              {/* Staff Management Portals */}
              {isLoggedIn && isStaff && (
                <>
                  <div className="popover-divider" />
                  {isAdmin && (
                    <button type="button" className="mobile-menu-item" onClick={() => handleMenuNavigate('/admin')}>
                      <div className="mobile-menu-item-icon"><Shield size={20} color="var(--primary-accent)" /></div>
                      <div className="mobile-menu-item-info"><span className="mobile-menu-item-title">Admin Portal</span></div>
                    </button>
                  )}
                  {isModerator && (
                    <button type="button" className="mobile-menu-item" onClick={() => handleMenuNavigate('/moderator')}>
                      <div className="mobile-menu-item-icon"><ShieldAlert size={20} color="#f59e0b" /></div>
                      <div className="mobile-menu-item-info"><span className="mobile-menu-item-title">Moderation Hub</span></div>
                    </button>
                  )}
                  {isGymOwner && (
                    <button type="button" className="mobile-menu-item" onClick={() => handleMenuNavigate('/gym-owner')}>
                      <div className="mobile-menu-item-icon"><Building2 size={20} color="#8b5cf6" /></div>
                      <div className="mobile-menu-item-info"><span className="mobile-menu-item-title">Gym Owner Panel</span></div>
                    </button>
                  )}
                  {isFitnessInstructor && (
                    <button type="button" className="mobile-menu-item" onClick={() => handleMenuNavigate('/fitness-instructor')}>
                      <div className="mobile-menu-item-icon"><Activity size={20} color="#10b981" /></div>
                      <div className="mobile-menu-item-info"><span className="mobile-menu-item-title">Instructor Panel</span></div>
                    </button>
                  )}
                  {isGymTrainer && (
                    <button type="button" className="mobile-menu-item" onClick={() => handleMenuNavigate('/gym-trainer')}>
                      <div className="mobile-menu-item-icon"><UserCheck size={20} color="#3b82f6" /></div>
                      <div className="mobile-menu-item-info"><span className="mobile-menu-item-title">Trainer Panel</span></div>
                    </button>
                  )}
                  {isStoreManager && (
                    <button type="button" className="mobile-menu-item" onClick={() => handleMenuNavigate('/store-manager')}>
                      <div className="mobile-menu-item-icon"><ShoppingBag size={20} color="#f59e0b" /></div>
                      <div className="mobile-menu-item-info"><span className="mobile-menu-item-title">Store Manager</span></div>
                    </button>
                  )}
                </>
              )}

              {/* Profile & Logout */}
              <div className="popover-divider" />
              {isLoggedIn ? (
                <>
                  <button type="button" className="mobile-menu-item" onClick={() => handleMenuNavigate('/profile')}>
                    <div className="mobile-menu-item-icon"><UserIcon size={20} color="var(--primary-accent)" /></div>
                    <div className="mobile-menu-item-info">
                      <span className="mobile-menu-item-title">My Profile ({userName})</span>
                      <span className="mobile-menu-item-sub">View personal account</span>
                    </div>
                  </button>
                  <button type="button" className="mobile-menu-item danger" onClick={handleLogout}>
                    <div className="mobile-menu-item-icon"><LogOut size={20} color="#ef4444" /></div>
                    <div className="mobile-menu-item-info">
                      <span className="mobile-menu-item-title" style={{ color: '#ef4444' }}>Log Out</span>
                    </div>
                  </button>
                </>
              ) : (
                <button type="button" className="mobile-menu-item" onClick={() => handleMenuNavigate('/login')}>
                  <div className="mobile-menu-item-icon"><LogIn size={20} color="var(--primary-accent)" /></div>
                  <div className="mobile-menu-item-info">
                    <span className="mobile-menu-item-title">Log In to GymSync</span>
                  </div>
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      <ComplaintHubModal 
        isOpen={showComplaintHub} 
        onClose={() => setShowComplaintHub(false)} 
      />
    </>
  );
};

export default AppSidebar;
