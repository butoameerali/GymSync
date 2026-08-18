import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { MessageSquare, ExternalLink } from 'lucide-react';
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
  return `${days}d`;
};

const MessageDropdown = ({ userName, onClose, unreadChatCount, setUnreadChatCount }) => {
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    let isMounted = true;
    const fetchConvs = async () => {
      try {
        const data = await messageService.getConversations(userName);
        if (isMounted) {
          setConversations(Array.isArray(data) ? data.slice(0, 5) : []);
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

  return (
    <div className="message-dropdown glass-panel">
      <div className="msg-dropdown-header">
        <div className="msg-title-group">
          <h3>Messages</h3>
          {unreadChatCount > 0 && <span className="msg-count-badge">{unreadChatCount} unread</span>}
        </div>
      </div>

      <div className="msg-dropdown-list">
        {loading ? (
          <div className="msg-empty-state">
            <p>Loading messages...</p>
          </div>
        ) : conversations.length === 0 ? (
          <div className="msg-empty-state">
            <MessageSquare size={28} className="empty-msg-icon" />
            <p>No recent conversations</p>
          </div>
        ) : (
          conversations.map((conv) => {
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
                  <div className="msg-item-header">
                    <span className="msg-contact-name">{contactName}</span>
                    {timeAgo && <span className="msg-time-stamp">{timeAgo}</span>}
                  </div>
                  {lastMsg && <p className="msg-snippet">{lastMsg}</p>}
                </div>

                {unread > 0 && <span className="unread-msg-badge">{unread}</span>}
              </div>
            );
          })
        )}
      </div>

      <div className="msg-dropdown-footer">
        <Link to="/messages" onClick={onClose} className="view-all-msg-link">
          Click to read all messages <ExternalLink size={14} />
        </Link>
      </div>
    </div>
  );
};

export default MessageDropdown;
