import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, CheckCheck, Trash2, Heart, MessageSquare, UserPlus, UserCheck, ShieldAlert, ChevronRight, Filter, Dumbbell, Utensils, TrendingDown, Award, Clock, BellOff } from 'lucide-react';
import { notificationService } from '../../features/notifications/services/notificationService';
import './NotificationsPage.css';

const getNotificationIcon = (type) => {
  switch (type) {
    case 'program_review': return <Award className="page-notif-icon review" size={18} color="#ec4899" />;
    case 'workout_reminder': return <Dumbbell className="page-notif-icon workout" size={18} color="#059669" />;
    case 'meal_reminder': return <Utensils className="page-notif-icon meal" size={18} color="#d97706" />;
    case 'progress_reminder': return <TrendingDown className="page-notif-icon progress" size={18} color="#2563eb" />;
    case 'like': return <Heart className="page-notif-icon like" size={18} />;
    case 'comment':
    case 'reply': return <MessageSquare className="page-notif-icon comment" size={18} />;
    case 'friend_request': return <UserPlus className="page-notif-icon request" size={18} />;
    case 'follow': return <UserCheck className="page-notif-icon follow" size={18} />;
    case 'system':
    case 'gmail_verification': return <ShieldAlert className="page-notif-icon system" size={18} />;
    default: return <Bell className="page-notif-icon default" size={18} />;
  }
};

const formatTimestamp = (dateString) => {
  if (!dateString) return '';
  const date = new Date(dateString);
  return date.toLocaleString('en-US', {
    month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
  });
};

const groupNotificationsByDate = (notifications) => {
  const groups = { today: [], yesterday: [], older: [] };
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfYesterday = new Date(startOfToday.getTime() - 86400000);

  notifications.forEach(notif => {
    const notifDate = new Date(notif.createdAt);
    if (notifDate >= startOfToday) {
      groups.today.push(notif);
    } else if (notifDate >= startOfYesterday) {
      groups.yesterday.push(notif);
    } else {
      groups.older.push(notif);
    }
  });

  return groups;
};

const NotificationsPage = () => {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // 'all' or 'unread'
  const [unreadCount, setUnreadCount] = useState(0);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const navigate = useNavigate();

  const userName = localStorage.getItem('gymsync_user_name') || 'User';

  const loadNotifications = async (targetPage = 1, isReadFilter = '') => {
    setLoading(true);
    try {
      const res = await notificationService.getNotifications(userName, targetPage, 20, isReadFilter);
      const newItems = res?.notifications || (Array.isArray(res) ? res : []);
      setNotifications(prev => targetPage === 1 ? newItems : [...prev, ...newItems]);
      setUnreadCount(res?.unreadCount || 0);
      setHasMore(targetPage < (res?.pages || 1));
      setLoading(false);
    } catch (err) {
      console.error('Error loading notifications page:', err);
      setLoading(false);
    }
  };

  useEffect(() => {
    const isReadParam = filter === 'unread' ? 'false' : '';
    setPage(1);
    loadNotifications(1, isReadParam);
  }, [filter, userName]);

  const handleMarkAllRead = async () => {
    try {
      await notificationService.markAllAsRead(userName);
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
      setUnreadCount(0);
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
        setUnreadCount(prev => Math.max(0, prev - 1));
        window.dispatchEvent(new CustomEvent('gymsync_notifications_read', { detail: { delta: -1 } }));
      } catch (err) {
        console.error('Failed to mark read:', err);
      }
    }

    if (notif.link) {
      navigate(notif.link);
    }
  };

  const handleDelete = async (e, notifId, isRead) => {
    e.stopPropagation();
    try {
      await notificationService.deleteNotification(notifId);
      setNotifications(prev => prev.filter(n => n._id !== notifId));
      if (!isRead) setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (err) {
      console.error('Failed to delete notification:', err);
    }
  };

  const handleDeleteAll = async () => {
    if (!window.confirm('Are you sure you want to delete all notifications?')) return;
    try {
      await notificationService.deleteAllNotifications(userName);
      setNotifications([]);
      setUnreadCount(0);
      window.dispatchEvent(new CustomEvent('gymsync_notifications_read', { detail: { unreadCount: 0 } }));
    } catch (err) {
      console.error('Failed to delete all notifications:', err);
    }
  };

  const handleSnooze = async (e, notifId) => {
    e.stopPropagation();
    try {
      await notificationService.snoozeNotification(notifId, 24);
      setNotifications(prev => prev.filter(n => n._id !== notifId));
      setUnreadCount(prev => Math.max(0, prev - 1));
      window.dispatchEvent(new CustomEvent('gymsync_notifications_read', { detail: { delta: -1 } }));
    } catch (err) {
      console.error('Failed to snooze notification:', err);
    }
  };

  const handleStop = async (e, notifId) => {
    e.stopPropagation();
    try {
      await notificationService.stopNotification(notifId);
      setNotifications(prev => prev.filter(n => n._id !== notifId));
      setUnreadCount(prev => Math.max(0, prev - 1));
      window.dispatchEvent(new CustomEvent('gymsync_notifications_read', { detail: { delta: -1 } }));
    } catch (err) {
      console.error('Failed to stop reminders:', err);
    }
  };

  const handleLoadMore = () => {
    const nextPage = page + 1;
    setPage(nextPage);
    const isReadParam = filter === 'unread' ? 'false' : '';
    loadNotifications(nextPage, isReadParam);
  };

  const grouped = groupNotificationsByDate(notifications);

  return (
    <div className="notifications-page-container">
      <div className="notifications-page-header glass-panel">
        <div className="header-title-section">
          <h2>Notifications</h2>
          {unreadCount > 0 && <span className="header-unread-badge">{unreadCount} Unread</span>}
        </div>

        <div className="header-actions-section">
          <div className="filter-tab-group">
            <button
              className={`filter-tab ${filter === 'all' ? 'active' : ''}`}
              onClick={() => setFilter('all')}
            >
              All
            </button>
            <button
              className={`filter-tab ${filter === 'unread' ? 'active' : ''}`}
              onClick={() => setFilter('unread')}
            >
              Unread {unreadCount > 0 && `(${unreadCount})`}
            </button>
          </div>

          {unreadCount > 0 && (
            <button
              className="btn-page-mark-all"
              onClick={handleMarkAllRead}
              title="Mark all notifications as read"
              aria-label="Mark all notifications as read"
            >
              <CheckCheck size={16} /> Mark all as read
            </button>
          )}

          {notifications.length > 0 && (
            <button
              className="btn-page-delete-all"
              onClick={handleDeleteAll}
              title="Delete all notifications"
              aria-label="Delete all notifications"
            >
              <Trash2 size={16} /> Delete all
            </button>
          )}
        </div>
      </div>

      <div className="notifications-page-content">
        {loading && notifications.length === 0 ? (
          <div className="page-loading-state glass-panel">
            <p>Loading your notifications...</p>
          </div>
        ) : notifications.length === 0 ? (
          <div className="page-empty-state glass-panel">
            <Bell size={48} className="empty-state-bell" />
            <h3>No notifications found</h3>
            <p>When you get likes, comments, friend requests or system alerts, they'll show up here.</p>
          </div>
        ) : (
          <div className="notifications-groups-wrapper">
            {grouped.today.length > 0 && (
              <div className="notif-date-group">
                <h4 className="group-heading">Today</h4>
                {grouped.today.map(notif => renderNotifCard(notif, handleNotificationClick, handleDelete, handleSnooze, handleStop))}
              </div>
            )}

            {grouped.yesterday.length > 0 && (
              <div className="notif-date-group">
                <h4 className="group-heading">Yesterday</h4>
                {grouped.yesterday.map(notif => renderNotifCard(notif, handleNotificationClick, handleDelete, handleSnooze, handleStop))}
              </div>
            )}

            {grouped.older.length > 0 && (
              <div className="notif-date-group">
                <h4 className="group-heading">Older</h4>
                {grouped.older.map(notif => renderNotifCard(notif, handleNotificationClick, handleDelete, handleSnooze, handleStop))}
              </div>
            )}

            {hasMore && (
              <div className="load-more-container">
                <button className="btn-load-more" onClick={handleLoadMore} disabled={loading}>
                  {loading ? 'Loading...' : 'Load More Notifications'}
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

const renderNotifCard = (notif, onClick, onDelete, onSnooze, onStop) => (
  <div
    key={notif._id}
    className={`page-notif-card glass-panel ${notif.isRead ? 'read' : 'unread'}`}
    onClick={() => onClick(notif)}
    role="button"
    tabIndex={0}
  >
    <div className="card-left-col">
      {getNotificationIcon(notif.type)}
      {!notif.isRead && <span className="card-unread-dot" title="Unread" />}
    </div>

    <div className="card-middle-col">
      {notif.title && <h4 className="notif-card-title">{notif.title}</h4>}
      <p className="notif-card-message">{notif.message}</p>

      {/* Action buttons for program review reminders */}
      {notif.type === 'program_review' && (
        <div style={{ display: 'flex', gap: '8px', marginTop: '10px', flexWrap: 'wrap' }} onClick={e => e.stopPropagation()}>
          <button
            type="button"
            onClick={() => onClick(notif)}
            style={{
              padding: '6px 12px',
              borderRadius: '6px',
              background: 'linear-gradient(135deg, #ec4899, #8b5cf6)',
              color: '#fff',
              border: 'none',
              fontWeight: 700,
              fontSize: '0.8rem',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '5px'
            }}
          >
            <Award size={13} /> Review Now
          </button>
          {onSnooze && (
            <button
              type="button"
              onClick={(e) => onSnooze(e, notif._id)}
              style={{
                padding: '6px 12px',
                borderRadius: '6px',
                background: 'rgba(255, 255, 255, 0.08)',
                color: '#94a3b8',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                fontWeight: 600,
                fontSize: '0.8rem',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px'
              }}
              title="Snooze reminder for 24 hours"
            >
              <Clock size={13} /> Snooze (24h)
            </button>
          )}
          {onStop && (
            <button
              type="button"
              onClick={(e) => onStop(e, notif._id)}
              style={{
                padding: '6px 12px',
                borderRadius: '6px',
                background: 'rgba(239, 68, 68, 0.12)',
                color: '#f87171',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                fontWeight: 600,
                fontSize: '0.8rem',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px'
              }}
              title="Stop reminding me about this program review"
            >
              <BellOff size={13} /> Stop Reminders
            </button>
          )}
        </div>
      )}

      <span className="notif-card-time" style={{ marginTop: '6px', display: 'inline-block' }}>{formatTimestamp(notif.createdAt)}</span>
    </div>

    <div className="card-right-col">
      {notif.link && <ChevronRight size={18} className="chevron-icon" />}
      <button
        className="card-delete-btn"
        onClick={(e) => onDelete(e, notif._id, notif.isRead)}
        title="Delete notification"
        aria-label="Delete notification"
      >
        <Trash2 size={16} />
      </button>
    </div>
  </div>
);

export default NotificationsPage;
