import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Send, ArrowLeft, MessageSquare, Search, UserCheck, Trash2, Sparkles, ExternalLink, Dumbbell, Utensils, TrendingUp, Zap, Target, CheckCircle2, Flame } from 'lucide-react';
import { toast } from 'react-toastify';
import { useAuth } from '../../context/AuthContext';
import { messageService } from '../../features/messages/services/messageService';
import './MessagesPage.css';

const formatTime = (dateString) => {
  if (!dateString) return '';
  const date = new Date(dateString);
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

const MessagesPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
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
  const currentUserName = user?.name || localStorage.getItem('gymsync_user_name') || 'User';

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
      const resData = await messageService.getConversationMessages(currentUserName, contact);
      const data = Array.isArray(resData) ? resData : (resData?.messages || []);
      setMessages(data);
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
      if (activeContact && currentUserName) {
        messageService.getConversationMessages(currentUserName, activeContact)
          .then(resData => {
            const data = Array.isArray(resData) ? resData : (resData?.messages || []);
            if (data.length > 0) {
              setMessages(prev => {
                const pendingOptimistic = prev.filter(m => String(m._id || '').startsWith('temp-'));
                const filteredPending = pendingOptimistic.filter(
                  p => !data.some(d => d.text === p.text && d.sender === p.sender)
                );
                return [...data, ...filteredPending];
              });
            }
          })
          .catch(() => {});
      }
    }, 4000);

    return () => clearInterval(interval);
  }, [activeContact, currentUserName]);

  const handleSendMessage = async (e, textOverride = null) => {
    if (e) e.preventDefault();
    const textToSend = (textOverride !== null ? textOverride : inputText).trim();
    if (!textToSend || !activeContact) return;

    if (textOverride === null) {
      setInputText('');
    }

    const optimisticId = `temp-${Date.now()}`;
    const optimisticMsg = {
      _id: optimisticId,
      sender: currentUserName,
      receiver: activeContact,
      text: textToSend,
      createdAt: new Date().toISOString(),
      isRead: true
    };

    setMessages(prev => [...prev, optimisticMsg]);
    setTimeout(scrollToBottom, 50);

    try {
      const sent = await messageService.sendMessage(activeContact, textToSend);
      const incoming = [];
      const userMsg = {
        _id: sent._id || optimisticId,
        sender: sent.sender || currentUserName,
        receiver: sent.receiver || activeContact,
        text: sent.text || textToSend,
        createdAt: sent.createdAt || new Date().toISOString(),
        isRead: sent.isRead ?? true
      };
      incoming.push(userMsg);

      if (sent.aiReply) {
        incoming.push({
          ...sent.aiReply,
          suggestions: sent.suggestions || sent.aiReply.suggestions || [],
          structuredAction: sent.structuredAction || sent.aiReply.structuredAction || null
        });
      } else if (sent.supportReply) {
        incoming.push(sent.supportReply);
      }

      setMessages(prev => {
        const withoutOptimistic = prev.filter(m => m._id !== optimisticId);
        const existingIds = new Set(withoutOptimistic.map(m => String(m._id)));
        const toAdd = incoming.filter(m => !existingIds.has(String(m._id)));
        return [...withoutOptimistic, ...toAdd];
      });

      setTimeout(scrollToBottom, 50);
      loadConversations();
    } catch (err) {
      console.error('Failed to send message:', err);
      setMessages(prev => prev.filter(m => m._id !== optimisticId));
    }
  };

  const handleSendSuggested = (sugText) => {
    const lower = (sugText || '').toLowerCase();
    if (lower.includes('switch to ai nutritionist') || lower.includes('open ai nutritionist') || lower.includes('talk to ai nutritionist') || lower.includes('switch to nutritionist')) {
      setActiveContact('AI Nutritionist');
      return;
    }
    if (lower.includes('switch to ai workout coach') || lower.includes('open ai workout coach') || lower.includes('talk to ai workout coach') || lower.includes('switch to workout coach')) {
      setActiveContact('AI Workout Coach');
      return;
    }
    handleSendMessage(null, sugText);
  };

  const handleClearChat = async () => {
    if (!activeContact) return;
    const confirmClear = window.confirm(`Clear all chat history with ${activeContact}?`);
    if (!confirmClear) return;

    try {
      await messageService.clearConversation(activeContact);
      setMessages([]);
      toast.success(`Chat history with ${activeContact} cleared!`);
      loadConversations();
    } catch (err) {
      console.error('Clear chat error:', err);
      toast.error('Failed to clear chat history');
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
                      {String(contactName).toLowerCase().includes('nutrition') ? '🥗' : String(contactName).toLowerCase().includes('workout') || String(contactName).toLowerCase() === 'ai' || String(contactName).toLowerCase().includes('trainer') ? '🏋️' : String(contactName).toLowerCase().includes('support') || String(contactName).toLowerCase().includes('gym') ? '🏢' : contactName.charAt(0).toUpperCase()}
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
              <div className="chat-area-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <button className="mobile-back-btn" onClick={() => setActiveContact('')}>
                    <ArrowLeft size={20} />
                  </button>
                  <div className="header-contact-avatar">
                    {String(activeContact).toLowerCase().includes('nutrition') ? '🥗' : String(activeContact).toLowerCase().includes('workout') || String(activeContact).toLowerCase() === 'ai' || String(activeContact).toLowerCase().includes('trainer') ? '🏋️' : String(activeContact).toLowerCase().includes('support') || String(activeContact).toLowerCase().includes('gym') ? '🏢' : activeContact.charAt(0).toUpperCase()}
                  </div>
                  <div className="header-contact-details">
                    <h4>{activeContact}</h4>
                    <span className="contact-status-text">Active Chat</span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleClearChat}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--text-secondary)',
                    cursor: 'pointer',
                    padding: '8px',
                    borderRadius: '8px',
                    display: 'flex',
                    alignItems: 'center',
                    transition: 'color 0.2s'
                  }}
                  title="Clear chat history"
                  onMouseEnter={e => { e.currentTarget.style.color = '#ef4444'; e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)'; }}
                  onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-secondary)'; e.currentTarget.style.background = 'transparent'; }}
                >
                  <Trash2 size={18} />
                </button>
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

                        {/* SWITCH_TO_NUTRITIONIST Action Card */}
                        {!isMine && msg.structuredAction?.type === 'SWITCH_TO_NUTRITIONIST' && (
                          <div style={{ margin: '8px 0', padding: '10px 14px', borderRadius: '10px', background: 'rgba(16,185,129,0.12)', border: '1px solid rgba(16,185,129,0.3)', maxWidth: '85%', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                            <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#34d399' }}>🥗 Sports Nutritionist Available</span>
                            <button type="button" onClick={() => setActiveContact('AI Nutritionist')} style={{ padding: '7px 14px', borderRadius: '8px', background: 'linear-gradient(135deg, #10b981, #059669)', color: '#fff', fontWeight: 700, fontSize: '0.8rem', border: 'none', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '6px', alignSelf: 'flex-start' }}>
                              🥗 Open AI Nutritionist
                            </button>
                          </div>
                        )}

                        {/* SWITCH_TO_WORKOUT_COACH Action Card */}
                        {!isMine && msg.structuredAction?.type === 'SWITCH_TO_WORKOUT_COACH' && (
                          <div style={{ margin: '8px 0', padding: '10px 14px', borderRadius: '10px', background: 'rgba(59,130,246,0.12)', border: '1px solid rgba(59,130,246,0.3)', maxWidth: '85%', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                            <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#60a5fa' }}>🏋️ Workout Coach Available</span>
                            <button type="button" onClick={() => setActiveContact('AI Workout Coach')} style={{ padding: '7px 14px', borderRadius: '8px', background: 'linear-gradient(135deg, #3b82f6, #2563eb)', color: '#fff', fontWeight: 700, fontSize: '0.8rem', border: 'none', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '6px', alignSelf: 'flex-start' }}>
                              🏋️ Open AI Workout Coach
                            </button>
                          </div>
                        )}

                        {/* Plan Action Card if generated */}
                        {msg.structuredAction?.plan && (
                          <div
                            className="portal-plan-action-card"
                            style={{
                              margin: '8px 0',
                              padding: '12px 14px',
                              borderRadius: '12px',
                              background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.15) 0%, rgba(139, 92, 246, 0.12) 100%)',
                              border: '1px solid rgba(59, 130, 246, 0.35)',
                              maxWidth: '85%',
                              display: 'flex',
                              flexDirection: 'column',
                              gap: '6px'
                            }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                              <span style={{ fontSize: '0.88rem', fontWeight: 700, color: '#60a5fa', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <Sparkles size={14} /> {msg.structuredAction.plan.title || 'AI Workout Plan'}
                              </span>
                              <span style={{ fontSize: '0.72rem', color: '#94a3b8', background: 'rgba(255,255,255,0.06)', padding: '2px 8px', borderRadius: '10px' }}>
                                {msg.structuredAction.plan.planDuration || 'Active'}
                              </span>
                            </div>
                            <p style={{ margin: 0, fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                              {msg.structuredAction.plan.goal || 'Fitness'} · {msg.structuredAction.plan.trainingDaysPerWeek || 4} Days/Week · {msg.structuredAction.plan.equipmentAccess || 'Full Gym'}
                            </p>
                            <button
                              type="button"
                              className="btn btn-primary"
                              style={{
                                marginTop: '4px',
                                padding: '6px 12px',
                                fontSize: '0.8rem',
                                fontWeight: 700,
                                borderRadius: '8px',
                                display: 'inline-flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '6px',
                                background: 'linear-gradient(135deg, #3b82f6, #2563eb)',
                                border: 'none',
                                color: '#fff',
                                cursor: 'pointer'
                              }}
                              onClick={() => navigate('/ai-trainer')}
                            >
                              <ExternalLink size={13} /> Open in AI Trainer / Workout Hub
                            </button>
                          </div>
                        )}

                        {/* START_EXERCISE Action Card */}
                        {!isMine && (msg.structuredAction?.type === 'START_EXERCISE' || msg.structuredAction?.type === 'EXERCISE_ALREADY_DONE') && msg.structuredAction?.exerciseName && (
                          <div style={{ margin: '8px 0', padding: '10px 14px', borderRadius: '10px', background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.3)', maxWidth: '85%', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                            <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#4ade80' }}>🏋️ {msg.structuredAction.exerciseName}</span>
                            {msg.structuredAction.sets && <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{msg.structuredAction.sets} sets × {msg.structuredAction.reps} reps | Rest: {msg.structuredAction.restSec}s</span>}
                            {msg.structuredAction.type !== 'EXERCISE_ALREADY_DONE' && (
                              <button type="button" style={{ padding: '5px 12px', borderRadius: '8px', background: '#22c55e', border: 'none', color: '#fff', fontSize: '0.78rem', fontWeight: 700, cursor: 'pointer', alignSelf: 'flex-start' }}
                                onClick={() => {
                                  const exData = {
                                    name: msg.structuredAction.exerciseName,
                                    sets: msg.structuredAction.sets || 3,
                                    reps: msg.structuredAction.reps || '10-12',
                                    restSec: msg.structuredAction.restSec || 60
                                  };
                                  localStorage.setItem('gymsync_active_mission', JSON.stringify(exData));
                                  localStorage.setItem('gymsync_tracking_exercise', JSON.stringify(exData));
                                  navigate(`/ai-trainer?exercise=${encodeURIComponent(msg.structuredAction.exerciseName)}`, { state: { activeExercise: exData } });
                                }}>
                                ▶️ Start Now
                              </button>
                            )}
                          </div>
                        )}

                        {/* MISSED_WORKOUT_RESOLVE Action Card */}
                        {!isMine && msg.structuredAction?.type === 'MISSED_WORKOUT_RESOLVE' && (
                          <div style={{ margin: '8px 0', padding: '10px 14px', borderRadius: '10px', background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.3)', maxWidth: '85%', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                            <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#fbbf24' }}>📋 Missed Workout</span>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '4px' }}>
                              {['Option A: Compress Today', 'Option B: Shift +1 Day', 'Option C: Rest Day'].map((opt, i) => (
                                <button key={i} type="button"
                                  style={{ padding: '5px 10px', borderRadius: '16px', background: 'rgba(245,158,11,0.15)', border: '1px solid rgba(245,158,11,0.4)', color: '#fcd34d', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer' }}
                                  onClick={() => { setInputText(opt); }}>
                                  {opt}
                                </button>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* FOOD_SUBSTITUTE Action Card */}
                        {!isMine && msg.structuredAction?.type === 'FOOD_SUBSTITUTE' && msg.structuredAction?.foodItem && (
                          <div style={{ margin: '8px 0', padding: '10px 14px', borderRadius: '10px', background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.3)', maxWidth: '85%', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                            <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#34d399' }}>🥗 Substitute: {msg.structuredAction.foodItem}</span>
                            {msg.structuredAction.alternatives?.slice(0, 3).map((alt, i) => (
                              <button key={i} type="button"
                                style={{ padding: '4px 10px', borderRadius: '14px', background: 'rgba(16,185,129,0.15)', border: '1px solid rgba(16,185,129,0.4)', color: '#6ee7b7', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer', alignSelf: 'flex-start' }}
                                onClick={() => handleSendSuggested(`✅ ${alt.name}`)}>
                                ✅ {alt.name.split(' ').slice(0, 3).join(' ')} ({alt.protein}g protein)
                              </button>
                            ))}
                          </div>
                        )}

                        {/* FOOD_SUBSTITUTE_CONFIRMED Action Card */}
                        {!isMine && msg.structuredAction?.type === 'FOOD_SUBSTITUTE_CONFIRMED' && (
                          <div style={{ margin: '8px 0', padding: '10px 14px', borderRadius: '10px', background: 'rgba(16,185,129,0.12)', border: '1px solid rgba(16,185,129,0.4)', maxWidth: '85%', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                            <span style={{ fontSize: '0.84rem', fontWeight: 700, color: '#34d399', display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <CheckCircle2 size={15} color="#10b981" /> Swapped: {msg.structuredAction.originalFood} → {msg.structuredAction.substituteFood}
                            </span>
                            <span style={{ fontSize: '0.74rem', color: 'var(--text-secondary)' }}>Nutritional totals have been updated in your active plan.</span>
                            <button type="button" style={{ padding: '6px 12px', borderRadius: '8px', background: 'linear-gradient(135deg, #10b981, #059669)', border: 'none', color: '#fff', fontSize: '0.78rem', fontWeight: 700, cursor: 'pointer', alignSelf: 'flex-start' }}
                              onClick={() => navigate('/ai-trainer?tab=diets')}>
                              🥗 View in Nutrition Hub
                            </button>
                          </div>
                        )}

                        {/* RECOVERY_ADAPTED Card */}
                        {!isMine && msg.structuredAction?.type === 'RECOVERY_ADAPTED' && (
                          <div style={{ margin: '8px 0', padding: '10px 14px', borderRadius: '10px', background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.3)', maxWidth: '85%', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                            <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#818cf8' }}>😴 Recovery Session Adapted</span>
                            {msg.structuredAction.explanation && <span style={{ fontSize: '0.73rem', color: 'var(--text-secondary)', fontStyle: 'italic' }}>{msg.structuredAction.explanation}</span>}
                            <button type="button" style={{ padding: '5px 12px', borderRadius: '8px', background: '#6366f1', border: 'none', color: '#fff', fontSize: '0.78rem', fontWeight: 700, cursor: 'pointer', alignSelf: 'flex-start' }}
                              onClick={() => navigate('/ai-trainer')}>
                              🚀 Load Recovery Session
                            </button>
                          </div>
                        )}

                        {/* GOAL_LIFECYCLE Card */}
                        {!isMine && msg.structuredAction?.type === 'GOAL_LIFECYCLE' && (
                          <div style={{ margin: '8px 0', padding: '10px 14px', borderRadius: '10px', background: 'linear-gradient(135deg, rgba(251,191,36,0.12), rgba(251,113,36,0.10))', border: '1px solid rgba(251,191,36,0.35)', maxWidth: '85%', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                            <span style={{ fontSize: '0.88rem', fontWeight: 700, color: '#fbbf24' }}>🏆 {msg.structuredAction.phase === 'goal_completed' ? 'Goal Complete!' : 'Select Next Goal'}</span>
                            <button type="button" style={{ padding: '5px 12px', borderRadius: '8px', background: 'rgba(251,191,36,0.2)', border: '1px solid rgba(251,191,36,0.5)', color: '#fbbf24', fontSize: '0.78rem', fontWeight: 700, cursor: 'pointer', alignSelf: 'flex-start' }}
                              onClick={() => navigate('/dashboard')}>
                              🎯 Set Next Goal
                            </button>
                          </div>
                        )}

                        {/* Navigate Action Indicator */}
                        {!isMine && msg.structuredAction?.type === 'navigate' && msg.structuredAction?.payload?.route && (
                          <button type="button"
                            style={{ margin: '4px 0', padding: '6px 12px', borderRadius: '8px', background: 'rgba(99,102,241,0.12)', border: '1px solid rgba(99,102,241,0.3)', color: '#818cf8', fontSize: '0.76rem', fontWeight: 600, cursor: 'pointer', alignSelf: 'flex-start', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                            onClick={() => navigate(msg.structuredAction.payload.route)}>
                            <ExternalLink size={12} /> Open {msg.structuredAction.payload.route.replace(/\//g, '').replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                          </button>
                        )}

                        {/* GREETING Action Card — Profile Snapshot & 4-Pill Action Row (Issue 10) */}
                        {!isMine && (msg.structuredAction?.type === 'GREETING' || (idx === 0 && msg.text?.includes('Ready to train today'))) && (
                          <div style={{ margin: '8px 0', padding: '14px 16px', borderRadius: '14px', background: 'linear-gradient(135deg, rgba(30,41,59,0.95) 0%, rgba(15,23,42,0.95) 100%)', border: '1px solid rgba(99,102,241,0.3)', maxWidth: '90%', display: 'flex', flexDirection: 'column', gap: '10px', boxShadow: '0 8px 24px rgba(0,0,0,0.25)' }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                              <span style={{ fontSize: '0.86rem', fontWeight: 700, color: '#a5b4fc', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <Zap size={14} color="#818cf8" /> Athlete Profile Snapshot
                              </span>
                              <span style={{ fontSize: '0.7rem', color: '#10b981', background: 'rgba(16,185,129,0.15)', padding: '2px 8px', borderRadius: '10px', fontWeight: 600 }}>Active</span>
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px', background: 'rgba(255,255,255,0.03)', padding: '10px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.06)' }}>
                              <div>
                                <div style={{ fontSize: '0.68rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Primary Goal</div>
                                <div style={{ fontSize: '0.8rem', fontWeight: 600, color: '#f8fafc' }}>{user?.bioData?.mainGoalArea || user?.bioData?.goals?.[0] || 'General Fitness'}</div>
                              </div>
                              <div>
                                <div style={{ fontSize: '0.68rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Fitness Level</div>
                                <div style={{ fontSize: '0.8rem', fontWeight: 600, color: '#f8fafc' }}>{user?.bioData?.fitnessLevel || 'Beginner'}</div>
                              </div>
                              <div>
                                <div style={{ fontSize: '0.68rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Equipment</div>
                                <div style={{ fontSize: '0.8rem', fontWeight: 600, color: '#f8fafc' }}>{user?.bioData?.equipmentAccess || 'Full Gym'}</div>
                              </div>
                              <div>
                                <div style={{ fontSize: '0.68rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Weight</div>
                                <div style={{ fontSize: '0.8rem', fontWeight: 600, color: '#f8fafc' }}>{user?.bioData?.weight ? `${user.bioData.weight} kg` : 'Tracked in App'}</div>
                              </div>
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px', marginTop: '2px' }}>
                              <button type="button" onClick={() => handleSendSuggested('🏋️ Generate Workout')}
                                style={{ padding: '8px 10px', borderRadius: '8px', background: 'rgba(59,130,246,0.18)', border: '1px solid rgba(59,130,246,0.4)', color: '#93c5fd', fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', transition: 'all 0.15s' }}>
                                <Dumbbell size={13} /> Generate Workout
                              </button>
                              <button type="button" onClick={() => handleSendSuggested('🥗 Custom Diet')}
                                style={{ padding: '8px 10px', borderRadius: '8px', background: 'rgba(16,185,129,0.18)', border: '1px solid rgba(16,185,129,0.4)', color: '#6ee7b7', fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', transition: 'all 0.15s' }}>
                                <Utensils size={13} /> Custom Diet
                              </button>
                              <button type="button" onClick={() => handleSendSuggested('⚡ 20-Min Workout')}
                                style={{ padding: '8px 10px', borderRadius: '8px', background: 'rgba(245,158,11,0.18)', border: '1px solid rgba(245,158,11,0.4)', color: '#fcd34d', fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', transition: 'all 0.15s' }}>
                                <Zap size={13} /> 20-Min Workout
                              </button>
                              <button type="button" onClick={() => handleSendSuggested('📊 View Progress')}
                                style={{ padding: '8px 10px', borderRadius: '8px', background: 'rgba(168,85,247,0.18)', border: '1px solid rgba(168,85,247,0.4)', color: '#d8b4fe', fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', transition: 'all 0.15s' }}>
                                <TrendingUp size={13} /> View Progress
                              </button>
                            </div>
                          </div>
                        )}

                        {/* MINI-COACH QUESTIONNAIRE INTERVIEW CARD (Issue 2) */}
                        {!isMine && msg.structuredAction?.type === 'PLAN_QUESTIONNAIRE' && (
                          <div style={{ margin: '8px 0', padding: '14px 16px', borderRadius: '14px', background: 'linear-gradient(135deg, rgba(30,41,59,0.98) 0%, rgba(15,23,42,0.98) 100%)', border: '1px solid rgba(59,130,246,0.35)', maxWidth: '90%', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                              <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#60a5fa', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <Target size={15} color="#3b82f6" />
                                {msg.structuredAction.step === 'goal' ? 'Mini-Coach • Step 1: Target Goal' : msg.structuredAction.step === 'schedule' ? 'Mini-Coach • Step 3: Start Schedule' : 'Mini-Coach • Step 2: Duration'}
                              </span>
                              <span style={{ fontSize: '0.72rem', color: '#94a3b8', background: 'rgba(255,255,255,0.06)', padding: '2px 8px', borderRadius: '10px' }}>
                                {msg.structuredAction.step === 'goal' ? '1 of 3' : msg.structuredAction.step === 'duration' ? '2 of 3' : '3 of 3'}
                              </span>
                            </div>
                            <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                              {msg.structuredAction.step === 'goal'
                                ? 'Select your primary objective to calibrate sets, reps, and energy burn:'
                                : msg.structuredAction.step === 'schedule'
                                ? 'When would you like to start your training program?'
                                : 'Select how many weeks or months your periodized cycle should run:'}
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                              {(msg.suggestions || []).map((sug, sIdx) => (
                                <button key={sIdx} type="button" onClick={() => handleSendSuggested(sug)}
                                  style={{ padding: '9px 14px', borderRadius: '10px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: '#f8fafc', fontSize: '0.82rem', fontWeight: 600, cursor: 'pointer', textAlign: 'left', display: 'flex', alignItems: 'center', justifyContent: 'space-between', transition: 'all 0.15s' }}>
                                  <span>{sug}</span>
                                  <CheckCircle2 size={13} color="#3b82f6" />
                                </button>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* MINI-COACH INTERVIEW CARD */}
                        {!isMine && msg.structuredAction?.type === 'mini_coach_interview' && msg.structuredAction.steps && (
                          <div style={{ margin: '8px 0', padding: '14px 16px', borderRadius: '14px', background: 'linear-gradient(135deg, rgba(30,41,59,0.98) 0%, rgba(15,23,42,0.98) 100%)', border: '1px solid rgba(59,130,246,0.35)', maxWidth: '90%', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                              <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#60a5fa', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <Target size={15} color="#3b82f6" />
                                Mini-Coach Profile Calibration
                              </span>
                              <span style={{ fontSize: '0.72rem', color: '#94a3b8', background: 'rgba(255,255,255,0.06)', padding: '2px 8px', borderRadius: '10px' }}>
                                {msg.structuredAction.steps.length} questions
                              </span>
                            </div>
                            <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                              {msg.structuredAction.steps[0]?.label || 'Please provide the missing details to personalize your plan:'}
                            </div>
                            {msg.structuredAction.steps[0]?.options ? (
                              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                                {msg.structuredAction.steps[0].options.map((opt, oIdx) => (
                                  <button key={oIdx} type="button" onClick={() => handleSendSuggested(opt)}
                                    style={{ padding: '7px 12px', borderRadius: '14px', background: 'rgba(59,130,246,0.15)', border: '1px solid rgba(59,130,246,0.35)', color: '#93c5fd', fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                    {opt}
                                  </button>
                                ))}
                              </div>
                            ) : (
                              <button type="button" onClick={() => navigate('/ai-trainer')}
                                style={{ padding: '8px 12px', borderRadius: '8px', background: '#3b82f6', border: 'none', color: '#fff', fontSize: '0.8rem', fontWeight: 700, cursor: 'pointer', alignSelf: 'flex-start' }}>
                                Open Questionnaire Wizard
                              </button>
                            )}
                          </div>
                        )}

                        {/* PROGRESS_CARD (Issue 9) */}
                        {!isMine && msg.structuredAction?.type === 'PROGRESS_CARD' && msg.structuredAction.stats && (
                          <div style={{ margin: '8px 0', padding: '14px 16px', borderRadius: '14px', background: 'linear-gradient(135deg, rgba(30,41,59,0.95) 0%, rgba(15,23,42,0.95) 100%)', border: '1px solid rgba(168,85,247,0.35)', maxWidth: '90%', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                              <span style={{ fontSize: '0.86rem', fontWeight: 700, color: '#c084fc', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <TrendingUp size={15} color="#a855f7" /> Plan vs Reality Progress
                              </span>
                              <span style={{ fontSize: '0.72rem', color: '#f59e0b', background: 'rgba(245,158,11,0.12)', padding: '2px 8px', borderRadius: '10px', display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 600 }}>
                                <Flame size={12} color="#f59e0b" /> {msg.structuredAction.stats.streak || 0} Day Streak
                              </span>
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px', background: 'rgba(255,255,255,0.03)', padding: '10px', borderRadius: '10px' }}>
                              <div>
                                <div style={{ fontSize: '0.68rem', color: '#94a3b8' }}>WORKOUTS COMPLETED</div>
                                <div style={{ fontSize: '0.88rem', fontWeight: 700, color: '#f8fafc' }}>
                                  {msg.structuredAction.stats.completedSessions} / {msg.structuredAction.stats.totalSessions} ({msg.structuredAction.stats.progressPercent}%)
                                </div>
                              </div>
                              <div>
                                <div style={{ fontSize: '0.68rem', color: '#94a3b8' }}>STEPS LOGGED TODAY</div>
                                <div style={{ fontSize: '0.88rem', fontWeight: 700, color: '#f8fafc' }}>
                                  {(msg.structuredAction.stats.stepsToday || 0).toLocaleString()} steps
                                </div>
                              </div>
                              <div>
                                <div style={{ fontSize: '0.68rem', color: '#94a3b8' }}>DAILY CALORIE BURN</div>
                                <div style={{ fontSize: '0.88rem', fontWeight: 700, color: '#f8fafc' }}>
                                  ~{msg.structuredAction.stats.caloriesBurnedToday || 0} kcal
                                </div>
                              </div>
                              <div>
                                <div style={{ fontSize: '0.68rem', color: '#94a3b8' }}>ACTIVE GOAL</div>
                                <div style={{ fontSize: '0.88rem', fontWeight: 700, color: '#60a5fa' }}>
                                  {msg.structuredAction.stats.goalTitle || 'Fitness'}
                                </div>
                              </div>
                            </div>
                            <button type="button" onClick={() => navigate('/dashboard')}
                              style={{ padding: '8px 12px', borderRadius: '8px', background: 'linear-gradient(135deg, #a855f7, #7c3aed)', border: 'none', color: '#fff', fontSize: '0.8rem', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                              <ExternalLink size={13} /> Open Full Dashboard
                            </button>
                          </div>
                        )}

                        {/* DIET_CARD (Issue 8) */}
                        {!isMine && msg.structuredAction?.type === 'DIET_CARD' && (
                          <div style={{ margin: '8px 0', padding: '14px 16px', borderRadius: '14px', background: 'linear-gradient(135deg, rgba(30,41,59,0.95) 0%, rgba(15,23,42,0.95) 100%)', border: '1px solid rgba(16,185,129,0.35)', maxWidth: '90%', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                              <span style={{ fontSize: '0.86rem', fontWeight: 700, color: '#34d399', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <Utensils size={15} color="#10b981" /> Today's Meal Plan & Macros
                              </span>
                              <span style={{ fontSize: '0.72rem', color: '#6ee7b7', background: 'rgba(16,185,129,0.12)', padding: '2px 8px', borderRadius: '10px', fontWeight: 600 }}>
                                {msg.structuredAction.targetCalories || 2100} kcal
                              </span>
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '6px', background: 'rgba(255,255,255,0.03)', padding: '8px', borderRadius: '8px', textAlign: 'center' }}>
                              <div>
                                <div style={{ fontSize: '0.66rem', color: '#94a3b8' }}>PROTEIN</div>
                                <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#38bdf8' }}>{msg.structuredAction.targetProtein || 140}g</div>
                              </div>
                              <div>
                                <div style={{ fontSize: '0.66rem', color: '#94a3b8' }}>CARBS</div>
                                <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#facc15' }}>{msg.structuredAction.targetCarbs || 230}g</div>
                              </div>
                              <div>
                                <div style={{ fontSize: '0.66rem', color: '#94a3b8' }}>FAT</div>
                                <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#f87171' }}>{msg.structuredAction.targetFat || 65}g</div>
                              </div>
                            </div>
                            <button type="button" onClick={() => navigate('/ai-trainer')}
                              style={{ padding: '8px 12px', borderRadius: '8px', background: 'linear-gradient(135deg, #10b981, #059669)', border: 'none', color: '#fff', fontSize: '0.8rem', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                              <ExternalLink size={13} /> Open Nutrition Hub & Food Swapper
                            </button>
                          </div>
                        )}

                        {/* Suggestion Chips */}
                        {!isMine && msg.suggestions && msg.suggestions.length > 0 && (
                          <div
                            className="portal-suggestion-chips"
                            style={{
                              display: 'flex',
                              flexWrap: 'wrap',
                              gap: '6px',
                              marginTop: '6px',
                              marginBottom: '8px',
                              maxWidth: '90%'
                            }}
                          >
                            {msg.suggestions.map((sug, sIdx) => (
                              <button
                                key={sIdx}
                                type="button"
                                className="suggestion-chip-btn"
                                style={{
                                  background: 'rgba(59, 130, 246, 0.14)',
                                  border: '1px solid rgba(59, 130, 246, 0.4)',
                                  color: '#93c5fd',
                                  padding: '5px 12px',
                                  borderRadius: '20px',
                                  fontSize: '0.78rem',
                                  fontWeight: 600,
                                  cursor: 'pointer',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '4px',
                                  transition: 'all 0.15s ease'
                                }}
                                onClick={() => handleSendMessage(null, sug)}
                                onMouseEnter={e => {
                                  e.currentTarget.style.background = 'rgba(59, 130, 246, 0.28)';
                                  e.currentTarget.style.borderColor = '#60a5fa';
                                  e.currentTarget.style.transform = 'translateY(-1px)';
                                }}
                                onMouseLeave={e => {
                                  e.currentTarget.style.background = 'rgba(59, 130, 246, 0.14)';
                                  e.currentTarget.style.borderColor = 'rgba(59, 130, 246, 0.4)';
                                  e.currentTarget.style.transform = 'none';
                                }}
                              >
                                {sug}
                              </button>
                            ))}
                          </div>
                        )}
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
