import React, { useState, useEffect } from 'react';
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
  Shield, 
  ShieldAlert, 
  UserCheck, 
  Settings, 
  LifeBuoy, 
  Sun, 
  Moon, 
  LogOut, 
  LogIn 
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

  // Privileged Roles
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
  const [showComplaintHub, setShowComplaintHub] = useState(false);

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

      const interval = setInterval(syncCounts, 10000);
      return () => clearInterval(interval);
    }
  }, [isLoggedIn, token, userName]);

  const handleLogout = () => {
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
        {/* Brand Header */}
        <Link to="/home" className="sidebar-brand">
          <div className="sidebar-brand-icon">
            <Activity size={24} />
          </div>
          <span className="sidebar-brand-title">GymSync</span>
        </Link>

        {/* Primary Navigation */}
        <div className="sidebar-nav-group">
          <Link to="/home" className={`sidebar-link ${isActive('/home') ? 'active' : ''}`}>
            <span className="sidebar-icon"><Home size={20} /></span>
            <span className="sidebar-label">Home</span>
          </Link>

          <Link to="/reels" className={`sidebar-link ${isActive('/reels') ? 'active' : ''}`}>
            <span className="sidebar-icon"><Film size={20} /></span>
            <span className="sidebar-label">Reels</span>
          </Link>

          {!isStaff && (
            <Link to="/ai-trainer" className={`sidebar-link ${isActive('/ai-trainer') ? 'active' : ''}`}>
              <span className="sidebar-icon"><Dumbbell size={20} /></span>
              <span className="sidebar-label">Workout Hub</span>
            </Link>
          )}

          {!isStaff && (
            <Link to="/your-gym" className={`sidebar-link ${isActive('/your-gym') ? 'active' : ''}`}>
              <span className="sidebar-icon"><Building2 size={20} /></span>
              <span className="sidebar-label">Your Gym</span>
            </Link>
          )}

          <Link to="/explore" className={`sidebar-link ${isActive('/explore') ? 'active' : ''}`}>
            <span className="sidebar-icon"><Compass size={20} /></span>
            <span className="sidebar-label">Explore Gyms</span>
          </Link>

          <Link to="/store" className={`sidebar-link ${isActive('/store') ? 'active' : ''}`}>
            <span className="sidebar-icon"><ShoppingBag size={20} /></span>
            <span className="sidebar-label">Store</span>
          </Link>

          {isLoggedIn && (
            <Link to="/messages" className={`sidebar-link ${isActive('/messages') || isActive('/chat') ? 'active' : ''}`}>
              <span className="sidebar-icon"><MessageSquare size={20} /></span>
              <span className="sidebar-label">Messages</span>
              {unreadChatCount > 0 && <span className="sidebar-badge">{unreadChatCount}</span>}
            </Link>
          )}

          {isLoggedIn && (
            <Link to="/notifications" className={`sidebar-link ${isActive('/notifications') ? 'active' : ''}`}>
              <span className="sidebar-icon"><Bell size={20} /></span>
              <span className="sidebar-label">Notifications</span>
              {unreadCount > 0 && <span className="sidebar-badge">{unreadCount}</span>}
            </Link>
          )}

          {/* Role-Specific Panels */}
          {isLoggedIn && (isAdmin || isModerator || isGymOwner || isFitnessInstructor || isGymTrainer || isStoreManager) && (
            <>
              <div className="sidebar-section-label">Management</div>
              {isAdmin && (
                <Link to="/admin" className={`sidebar-link ${isActive('/admin') ? 'active' : ''}`}>
                  <span className="sidebar-icon"><Shield size={20} /></span>
                  <span className="sidebar-label">Admin Panel</span>
                </Link>
              )}
              {isModerator && (
                <Link to="/moderator" className={`sidebar-link ${isActive('/moderator') ? 'active' : ''}`}>
                  <span className="sidebar-icon"><ShieldAlert size={20} /></span>
                  <span className="sidebar-label">Moderator Hub</span>
                </Link>
              )}
              {isGymOwner && (
                <Link to="/gym-owner" className={`sidebar-link ${isActive('/gym-owner') ? 'active' : ''}`}>
                  <span className="sidebar-icon"><Building2 size={20} /></span>
                  <span className="sidebar-label">Gym Owner</span>
                </Link>
              )}
              {isFitnessInstructor && (
                <Link to="/fitness-instructor" className={`sidebar-link ${isActive('/fitness-instructor') ? 'active' : ''}`}>
                  <span className="sidebar-icon"><Activity size={20} /></span>
                  <span className="sidebar-label">Instructor</span>
                </Link>
              )}
              {isGymTrainer && (
                <Link to="/gym-trainer" className={`sidebar-link ${isActive('/gym-trainer') ? 'active' : ''}`}>
                  <span className="sidebar-icon"><UserCheck size={20} /></span>
                  <span className="sidebar-label">Trainer Panel</span>
                </Link>
              )}
              {isStoreManager && (
                <Link to="/store-manager" className={`sidebar-link ${isActive('/store-manager') ? 'active' : ''}`}>
                  <span className="sidebar-icon"><ShoppingBag size={20} /></span>
                  <span className="sidebar-label">Store Manager</span>
                </Link>
              )}
            </>
          )}

          {/* Settings & Support */}
          {isLoggedIn && (
            <Link to="/settings" className={`sidebar-link ${isActive('/settings') ? 'active' : ''}`}>
              <span className="sidebar-icon"><Settings size={20} /></span>
              <span className="sidebar-label">Settings</span>
            </Link>
          )}

          {isLoggedIn && (
            <button 
              type="button" 
              className="sidebar-link" 
              onClick={() => setShowComplaintHub(true)}
              style={{ width: '100%', textAlign: 'left', cursor: 'pointer', background: 'none' }}
            >
              <span className="sidebar-icon" style={{ color: '#ef4444' }}><LifeBuoy size={20} /></span>
              <span className="sidebar-label">Help & Support</span>
            </button>
          )}
        </div>

        {/* Footer Area: Theme Toggle & User Info */}
        <div className="sidebar-footer">
          <button 
            type="button" 
            className="theme-toggle-btn" 
            onClick={toggleTheme}
            title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Mode`}
          >
            <div className="theme-toggle-left">
              {theme === 'dark' ? <Sun size={18} color="#f59e0b" /> : <Moon size={18} color="#3b82f6" />}
              <span>{theme === 'dark' ? 'Light Mode' : 'Dark Mode'}</span>
            </div>
          </button>

          {!isGuest ? (
            <div className="sidebar-user-card">
              <Link to="/profile" className="sidebar-user-info">
                <UserAvatar src={profilePic} name={userName} size={36} />
                <div className="sidebar-user-details">
                  <span className="sidebar-user-name">{userName}</span>
                  <span className="sidebar-user-role">{userRole}</span>
                </div>
              </Link>
              <button 
                type="button" 
                onClick={handleLogout} 
                className="sidebar-logout-btn" 
                title="Log Out"
                aria-label="Log Out"
              >
                <LogOut size={18} />
              </button>
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
