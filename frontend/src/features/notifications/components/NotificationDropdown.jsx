import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { CheckCheck, Trash2, Bell, Heart, MessageSquare, UserPlus, UserCheck, ShieldAlert, ExternalLink, Dumbbell, Utensils, TrendingDown, Award, Clock, BellOff } from 'lucide-react';
import { notificationService } from '../services/notificationService';
import webPushClient from '../services/webPushClient';
import './NotificationDropdown.css';

const getNotificationIcon = (type) => {
  switch (type) {
    case 'program_review': return <Award className="notif-type-icon review" size={16} color="#ec4899" />;
    case 'workout_reminder': return <Dumbbell className="notif-type-icon workout" size={16} color="#059669" />;
    case 'meal_reminder': return <Utensils className="notif-type-icon meal" size={16} color="#d97706" />;
    case 'progress_reminder': return <TrendingDown className="notif-type-icon progress" size={16} color="#2563eb" />;
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
  const [pushStatus, setPushStatus] = useState(null);

  useEffect(() => {
    webPushClient.getSubscriptionStatus().then(setPushStatus).catch(() => {});
  }, []);

  const handleEnablePush = async (e) => {
    e.stopPropagation();
    const res = await webPushClient.requestPermissionAndSubscribe();
    if (res.success) {
      setPushStatus({ supported: true, subscribed: true, permission: 'granted' });
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await notificationService.markAllAsRead(userName);
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
      if (setUnreadCount) setUnreadCount(0);
      window.dispatchEvent(new CustomEvent('gymsync_notifications_read', { detail: { unreadCount: 0 } }));
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
        window.dispatchEvent(new CustomEvent('gymsync_notifications_read', { detail: { delta: -1 } }));
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

  const handleSnooze = async (e, notifId) => {
    e.stopPropagation();
    try {
      await notificationService.snoozeNotification(notifId, 24);
      setNotifications(prev => prev.filter(n => n._id !== notifId));
      if (setUnreadCount && unreadCount > 0) {
        setUnreadCount(prev => Math.max(0, prev - 1));
      }
      window.dispatchEvent(new CustomEvent('gymsync_notifications_read', { detail: { delta: -1 } }));
    } catch (err) {
      console.error('Error snoozing notification:', err);
    }
  };

  const handleStop = async (e, notifId) => {
    e.stopPropagation();
    try {
      await notificationService.stopNotification(notifId);
      setNotifications(prev => prev.filter(n => n._id !== notifId));
      if (setUnreadCount && unreadCount > 0) {
        setUnreadCount(prev => Math.max(0, prev - 1));
      }
      window.dispatchEvent(new CustomEvent('gymsync_notifications_read', { detail: { delta: -1 } }));
    } catch (err) {
      console.error('Error stopping notification reminders:', err);
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

      {pushStatus?.supported && pushStatus?.permission === 'default' && (
        <div style={{ padding: '8px 14px', backgroundColor: 'rgba(5, 150, 105, 0.08)', borderBottom: '1px solid #10b981', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: '0.78rem', color: '#065f46', fontWeight: 500 }}>
            🔔 Enable workout &amp; meal reminders
          </span>
          <button
            onClick={handleEnablePush}
            style={{ fontSize: '0.75rem', padding: '4px 10px', borderRadius: '4px', backgroundColor: '#059669', color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 600 }}
          >
            Enable
          </button>
        </div>
      )}

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
                {notif.type === 'program_review' && (
                  <div style={{ display: 'flex', gap: '6px', marginTop: '6px' }} onClick={e => e.stopPropagation()}>
                    <button
                      type="button"
                      onClick={() => handleNotificationClick(notif)}
                      style={{
                        padding: '3px 8px',
                        borderRadius: '4px',
                        background: 'linear-gradient(135deg, #ec4899, #8b5cf6)',
                        color: '#fff',
                        border: 'none',
                        fontWeight: 700,
                        fontSize: '0.72rem',
                        cursor: 'pointer'
                      }}
                    >
                      Review
                    </button>
                    <button
                      type="button"
                      onClick={(e) => handleSnooze(e, notif._id)}
                      style={{
                        padding: '3px 8px',
                        borderRadius: '4px',
                        background: 'rgba(255, 255, 255, 0.08)',
                        color: '#94a3b8',
                        border: '1px solid rgba(255, 255, 255, 0.15)',
                        fontSize: '0.72rem',
                        cursor: 'pointer'
                      }}
                      title="Snooze for 24 hours"
                    >
                      Snooze
                    </button>
                    <button
                      type="button"
                      onClick={(e) => handleStop(e, notif._id)}
                      style={{
                        padding: '3px 8px',
                        borderRadius: '4px',
                        background: 'rgba(239, 68, 68, 0.12)',
                        color: '#f87171',
                        border: '1px solid rgba(239, 68, 68, 0.3)',
                        fontSize: '0.72rem',
                        cursor: 'pointer'
                      }}
                      title="Stop reminders"
                    >
                      Stop
                    </button>
                  </div>
                )}
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
