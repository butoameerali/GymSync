import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { CheckCheck, Trash2, Bell, Heart, MessageSquare, UserPlus, UserCheck, ShieldAlert, ExternalLink } from 'lucide-react';
import { notificationService } from '../services/notificationService';
import './NotificationDropdown.css';

const getNotificationIcon = (type) => {
  switch (type) {
    case 'like': return <Heart className="notif-type-icon like" size={16} />;
    case 'comment':
    case 'reply': return <MessageSquare className="notif-type-icon comment" size={16} />;
    case 'friend_request': return <UserPlus className="notif-type-icon request" size={16} />;
    case 'follow': return <UserCheck className="notif-type-icon follow" size={16} />;
    case 'system':
    case 'gmail_verification': return <ShieldAlert className="notif-type-icon system" size={16} />;
    default: return <Bell className="notif-type-icon default" size={16} />;
  }
};

const formatTimeAgo = (dateString) => {
  if (!dateString) return 'Just now';
  const seconds = Math.floor((new Date() - new Date(dateString)) / 1000);
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
};

const NotificationDropdown = ({ notifications, setNotifications, userName, onClose, unreadCount, setUnreadCount }) => {
  const navigate = useNavigate();

  const handleMarkAllRead = async () => {
    try {
      await notificationService.markAllAsRead(userName);
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
      if (setUnreadCount) setUnreadCount(0);
    } catch (err) {
      console.error('Failed to mark all as read:', err);
    }
  };

  const handleNotificationClick = async (notif) => {
    if (!notif.isRead) {
      try {
        await notificationService.markSingleAsRead(notif._id);
        setNotifications(prev => prev.map(n => n._id === notif._id ? { ...n, isRead: true } : n));
        if (setUnreadCount && unreadCount > 0) setUnreadCount(prev => Math.max(0, prev - 1));
      } catch (err) {
        console.error('Error marking notification read:', err);
      }
    }
    if (onClose) onClose();

    if (notif.link) {
      navigate(notif.link);
    } else {
      navigate('/notifications');
    }
  };

  const handleDelete = async (e, notifId, isRead) => {
    e.stopPropagation();
    try {
      await notificationService.deleteNotification(notifId);
      setNotifications(prev => prev.filter(n => n._id !== notifId));
      if (!isRead && setUnreadCount && unreadCount > 0) {
        setUnreadCount(prev => Math.max(0, prev - 1));
      }
    } catch (err) {
      console.error('Error deleting notification:', err);
    }
  };

  const recentNotifications = notifications.slice(0, 6);

  return (
    <div className="notification-dropdown glass-panel">
      <div className="notif-dropdown-header">
        <div className="notif-title-group">
          <h3>Notifications</h3>
          {unreadCount > 0 && <span className="notif-count-badge">{unreadCount} new</span>}
        </div>
        {unreadCount > 0 && (
          <button 
            className="btn-mark-all-read" 
            onClick={handleMarkAllRead}
            title="Mark all as read"
            aria-label="Mark all notifications as read"
          >
            <CheckCheck size={14} /> Mark read
          </button>
        )}
      </div>

      <div className="notif-dropdown-list">
        {recentNotifications.length === 0 ? (
          <div className="notif-empty-state">
            <Bell size={28} className="empty-bell-icon" />
            <p>No notifications yet</p>
          </div>
        ) : (
          recentNotifications.map((notif) => (
            <div
              key={notif._id}
              className={`notif-dropdown-item ${notif.isRead ? 'read' : 'unread'}`}
              onClick={() => handleNotificationClick(notif)}
              role="button"
              tabIndex={0}
            >
              <div className="notif-item-icon-col">
                {getNotificationIcon(notif.type)}
                {!notif.isRead && <span className="unread-dot-indicator" title="Unread" />}
              </div>

              <div className="notif-item-body">
                <p className="notif-message-text">{notif.message}</p>
                <span className="notif-time-stamp">{formatTimeAgo(notif.createdAt)}</span>
              </div>

              <button
                className="notif-delete-btn"
                onClick={(e) => handleDelete(e, notif._id, notif.isRead)}
                title="Delete notification"
                aria-label="Delete notification"
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))
        )}
      </div>

      <div className="notif-dropdown-footer">
        <Link to="/notifications" onClick={onClose} className="view-all-notif-link">
          View all notifications <ExternalLink size={14} />
        </Link>
      </div>
    </div>
  );
};

export default NotificationDropdown;
