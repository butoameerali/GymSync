import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Send, ArrowLeft, MessageSquare, Search, UserCheck } from 'lucide-react';
import { messageService } from '../../features/messages/services/messageService';
import './MessagesPage.css';

const formatTime = (dateString) => {
  if (!dateString) return '';
  const date = new Date(dateString);
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

const MessagesPage = () => {
  const [searchParams] = useSearchParams();
  const initialContact = searchParams.get('contact') || '';

  const [conversations, setConversations] = useState([]);
  const [activeContact, setActiveContact] = useState(initialContact);
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [loadingConvs, setLoadingConvs] = useState(true);
  const [loadingMsgs, setLoadingMsgs] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const messagesEndRef = useRef(null);
  const currentUserName = localStorage.getItem('gymsync_user_name') || 'User';

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // 1. Fetch conversation list
  const loadConversations = async () => {
    try {
      const data = await messageService.getConversations(currentUserName);
      const convList = Array.isArray(data) ? data : [];
      setConversations(convList);
      setLoadingConvs(false);

      if (!activeContact && convList.length > 0) {
        const firstContact = typeof convList[0] === 'string' ? convList[0] : (convList[0].name || convList[0].id);
        setActiveContact(firstContact);
      }
    } catch (err) {
      console.error('Error fetching conversations:', err);
      setLoadingConvs(false);
    }
  };

  // 2. Fetch messages for active conversation
  const loadMessages = async (contact) => {
    if (!contact) return;
    setLoadingMsgs(true);
    try {
      const data = await messageService.getConversationMessages(currentUserName, contact);
      setMessages(Array.isArray(data) ? data : []);
      setLoadingMsgs(false);
      setTimeout(scrollToBottom, 100);

      // Mark conversation as read
      await messageService.markConversationAsRead(contact);
      setConversations(prev => prev.map(c => {
        const cName = typeof c === 'string' ? c : (c.name || c.id);
        return cName === contact && typeof c === 'object' ? { ...c, unreadCount: 0 } : c;
      }));
    } catch (err) {
      console.error('Error loading messages for contact:', err);
      setLoadingMsgs(false);
    }
  };

  useEffect(() => {
    loadConversations();
  }, [currentUserName]);

  useEffect(() => {
    if (activeContact) {
      loadMessages(activeContact);
    }
  }, [activeContact]);

  // Periodic polling for chat messages & active conversation update
  useEffect(() => {
    const interval = setInterval(() => {
      loadConversations();
      if (activeContact) {
        messageService.getConversationMessages(currentUserName, activeContact)
          .then(data => {
            if (Array.isArray(data)) {
              setMessages(data);
            }
          })
          .catch(() => {});
      }
    }, 4000);

    return () => clearInterval(interval);
  }, [activeContact, currentUserName]);

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!inputText.trim() || !activeContact) return;

    const textToSend = inputText.trim();
    setInputText('');

    try {
      const sent = await messageService.sendMessage(activeContact, textToSend);
      setMessages(prev => [...prev, sent]);
      setTimeout(scrollToBottom, 100);
      loadConversations();
    } catch (err) {
      console.error('Failed to send message:', err);
    }
  };

  const filteredConversations = conversations.filter(c => {
    const name = typeof c === 'string' ? c : (c.name || c.id || '');
    return name.toLowerCase().includes(searchQuery.toLowerCase());
  });

  return (
    <div className="messages-portal-container">
      <div className="messages-portal-card glass-panel">
        {/* LEFT SIDEBAR: Conversation List */}
        <div className={`portal-sidebar ${activeContact ? 'hide-on-mobile' : ''}`}>
          <div className="sidebar-header">
            <h3>Messages</h3>
            <div className="search-bar-wrapper">
              <Search size={16} className="search-icon" />
              <input
                type="text"
                placeholder="Search conversations..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>

          <div className="sidebar-conv-list">
            {loadingConvs ? (
              <div className="conv-loading"><p>Loading chat list...</p></div>
            ) : filteredConversations.length === 0 ? (
              <div className="conv-empty">
                <MessageSquare size={32} />
                <p>No conversations found</p>
              </div>
            ) : (
              filteredConversations.map(conv => {
                const contactName = typeof conv === 'string' ? conv : (conv.name || conv.id);
                const lastMsg = typeof conv === 'object' ? conv.lastMessage : '';
                const unread = typeof conv === 'object' ? (conv.unreadCount || 0) : 0;
                const isActive = contactName === activeContact;

                return (
                  <div
                    key={contactName}
                    className={`sidebar-conv-item ${isActive ? 'active' : ''} ${unread > 0 ? 'has-unread' : ''}`}
                    onClick={() => setActiveContact(contactName)}
                    role="button"
                    tabIndex={0}
                  >
                    <div className="conv-avatar">
                      {contactName.charAt(0).toUpperCase()}
                    </div>
                    <div className="conv-info">
                      <div className="conv-name-row">
                        <span className="conv-name">{contactName}</span>
                      </div>
                      {lastMsg && <p className="conv-last-msg">{lastMsg}</p>}
                    </div>
                    {unread > 0 && <span className="conv-unread-badge">{unread}</span>}
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* RIGHT MAIN PANEL: Chat Conversation Area */}
        <div className={`portal-chat-area ${!activeContact ? 'hide-on-mobile' : ''}`}>
          {activeContact ? (
            <>
              {/* Chat Header */}
              <div className="chat-area-header">
                <button className="mobile-back-btn" onClick={() => setActiveContact('')}>
                  <ArrowLeft size={20} />
                </button>
                <div className="header-contact-avatar">
                  {activeContact.charAt(0).toUpperCase()}
                </div>
                <div className="header-contact-details">
                  <h4>{activeContact}</h4>
                  <span className="contact-status-text">Active Chat</span>
                </div>
              </div>

              {/* Chat History Messages */}
              <div className="chat-messages-container">
                {loadingMsgs && messages.length === 0 ? (
                  <div className="msgs-loading"><p>Loading messages...</p></div>
                ) : messages.length === 0 ? (
                  <div className="msgs-empty">
                    <p>Start a new conversation with {activeContact}!</p>
                  </div>
                ) : (
                  messages.map(msg => {
                    const isMine = msg.sender === currentUserName;
                    return (
                      <div key={msg._id} className={`chat-bubble-wrapper ${isMine ? 'mine' : 'theirs'}`}>
                        <div className={`chat-bubble ${isMine ? 'bubble-mine' : 'bubble-theirs'}`}>
                          <p className="bubble-text">{msg.text}</p>
                          <div className="bubble-meta">
                            <span className="bubble-time">{formatTime(msg.createdAt)}</span>
                            {isMine && msg.isRead && <UserCheck size={14} className="read-receipt-icon" title="Read" />}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Chat Input Form */}
              <form className="chat-input-form" onSubmit={handleSendMessage}>
                <input
                  type="text"
                  placeholder={`Write a message to ${activeContact}...`}
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                />
                <button type="submit" disabled={!inputText.trim()} className="btn-send-msg">
                  <Send size={18} />
                </button>
              </form>
            </>
          ) : (
            <div className="no-chat-selected">
              <MessageSquare size={48} className="no-chat-icon" />
              <h3>Select a conversation</h3>
              <p>Choose a contact from the sidebar to view private messages.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MessagesPage;
