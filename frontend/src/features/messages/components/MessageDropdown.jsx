import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { MessageSquare, Search } from 'lucide-react';
import { messageService } from '../services/messageService';
import './MessageDropdown.css';

const formatTimeAgo = (dateString) => {
  if (!dateString) return '';
  const seconds = Math.floor((new Date() - new Date(dateString)) / 1000);
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d`;
  const weeks = Math.floor(days / 7);
  return `${weeks}w`;
};

const MessageDropdown = ({ userName, onClose, unreadChatCount, setUnreadChatCount }) => {
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState('all'); // 'all' or 'unread'
  const navigate = useNavigate();

  useEffect(() => {
    let isMounted = true;
    const fetchConvs = async () => {
      try {
        const data = await messageService.getConversations(userName);
        if (isMounted) {
          setConversations(Array.isArray(data) ? data : []);
          setLoading(false);
        }
      } catch (err) {
        console.error('Error loading conversations for dropdown:', err);
        if (isMounted) setLoading(false);
      }
    };
    fetchConvs();
    return () => { isMounted = false; };
  }, [userName]);

  const handleConversationClick = async (contactName) => {
    try {
      await messageService.markConversationAsRead(contactName);
      if (setUnreadChatCount) {
        const countData = await messageService.getUnreadCount();
        setUnreadChatCount(countData?.unreadCount || 0);
      }
    } catch (err) {
      console.error('Error marking conversation read:', err);
    }
    if (onClose) onClose();
    navigate(`/messages?contact=${encodeURIComponent(contactName)}`);
  };

  const filteredConversations = conversations.filter(conv => {
    const contactName = typeof conv === 'string' ? conv : (conv.name || conv.id || '');
    const unread = typeof conv === 'object' ? (conv.unreadCount || 0) : 0;
    const matchesSearch = contactName.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter = filter === 'unread' ? unread > 0 : true;
    return matchesSearch && matchesFilter;
  });

  return (
    <div className="message-dropdown glass-panel">
      <div className="msg-dropdown-header">
        <div className="msg-title-group">
          <h3>Chats</h3>
          {unreadChatCount > 0 && <span className="msg-count-badge">{unreadChatCount}</span>}
        </div>

        <div className="msg-search-box">
          <Search size={14} className="msg-search-icon" />
          <input
            type="text"
            placeholder="Search Messenger"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div className="msg-filter-pills">
          <button
            className={`msg-pill ${filter === 'all' ? 'active' : ''}`}
            onClick={() => setFilter('all')}
          >
            All
          </button>
          <button
            className={`msg-pill ${filter === 'unread' ? 'active' : ''}`}
            onClick={() => setFilter('unread')}
          >
            Unread
          </button>
        </div>
      </div>

      <div className="msg-dropdown-list">
        {loading ? (
          <div className="msg-empty-state">
            <p>Loading messages...</p>
          </div>
        ) : filteredConversations.length === 0 ? (
          <div className="msg-empty-state">
            <MessageSquare size={28} className="empty-msg-icon" />
            <p>No messages found</p>
          </div>
        ) : (
          filteredConversations.slice(0, 6).map((conv) => {
            const contactName = typeof conv === 'string' ? conv : (conv.name || conv.id);
            const lastMsg = typeof conv === 'object' ? conv.lastMessage : '';
            const timeAgo = typeof conv === 'object' ? formatTimeAgo(conv.lastMessageTime) : '';
            const unread = typeof conv === 'object' ? (conv.unreadCount || 0) : 0;

            return (
              <div
                key={contactName}
                className={`msg-dropdown-item ${unread > 0 ? 'unread' : ''}`}
                onClick={() => handleConversationClick(contactName)}
                role="button"
                tabIndex={0}
              >
                <div className="msg-item-avatar">
                  {contactName.charAt(0).toUpperCase()}
                </div>

                <div className="msg-item-body">
                  <div className="msg-contact-name">{contactName}</div>
                  <div className="msg-snippet-row">
                    <span className="msg-snippet-text">{lastMsg || 'No messages yet'}</span>
                    {timeAgo && <span className="msg-dot-time"> · {timeAgo}</span>}
                  </div>
                </div>

                {unread > 0 && <span className="unread-dot-badge" title="Unread message" />}
              </div>
            );
          })
        )}
      </div>

      <div className="msg-dropdown-footer">
        <Link to="/messages" onClick={onClose} className="see-all-messenger-btn">
          See all in Messenger
        </Link>
      </div>
    </div>
  );
};

export default MessageDropdown;
