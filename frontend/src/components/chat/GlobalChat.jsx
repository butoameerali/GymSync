import React, { useState, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { MessageCircle, X, Send, Bot, Building2 } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { toast } from 'react-toastify';
import UserAvatar from '../common/UserAvatar';
import './GlobalChat.css';

const SYSTEM_CONTACTS = [
  { id: 'ai', name: 'AI Trainer', role: 'Personal Coach', avatar: '🤖', isSystem: true, isPremium: true },
  { id: 'gym', name: 'Gym Support', role: 'Platform Support', avatar: '🏢', isSystem: true, isPremium: false }
];

const SYSTEM_IDENTIFIERS = new Set([
  'ai',
  'gym',
  'ai trainer',
  'gym support',
  'iron core support',
  'support team',
  'support'
]);

const isSystemContact = (name) => {
  if (!name) return false;
  return SYSTEM_IDENTIFIERS.has(String(name).toLowerCase().trim());
};

const GlobalChat = () => {
  const location = useLocation();
  const [isOpen, setIsOpen] = useState(false);
  const [activeContact, setActiveContact] = useState(null);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState({});
  const [memberContacts, setMemberContacts] = useState([]);
  const messagesEndRef = useRef(null);

  // Derived values — computed every render, before any early return, no hooks involved
  const userRole = localStorage.getItem('gymsync_role') || 'guest';
  const isGuest = userRole === 'guest';
  const userName = localStorage.getItem('gymsync_user_name') || 'Guest';

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, activeContact]);

  const fetchConversation = async (contactId) => {
    try {
      const token = localStorage.getItem('gymsync_token') || '';
      const res = await fetch(`/api/chat/${encodeURIComponent(userName)}/${encodeURIComponent(contactId)}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) return;
      const data = await res.json();
      if (!Array.isArray(data)) return;

      const formattedMessages = data.map(msg => ({
        id: msg._id,
        text: msg.text,
        sender: msg.sender === userName ? 'user' : 'other',
        timestamp: msg.createdAt
      }));

      setMessages(prev => ({
        ...prev,
        [contactId]: formattedMessages
      }));
    } catch (err) {
      console.error("fetchConversation error:", err);
    }
  };

  const handleContactClick = (contact) => {
    let effectiveContact = contact;
    const lower = (contact.name || contact.id || '').toLowerCase().trim();
    if (lower === 'ai' || lower === 'ai trainer') {
      effectiveContact = SYSTEM_CONTACTS[0];
    } else if (lower === 'gym' || lower === 'gym support' || lower === 'iron core support' || lower === 'support team' || lower === 'support') {
      effectiveContact = SYSTEM_CONTACTS[1];
    }
    setActiveContact(effectiveContact);
    if (!messages[effectiveContact.id]) {
      setMessages(prev => ({ ...prev, [effectiveContact.id]: [] }));
    }
    fetchConversation(effectiveContact.id);
  };

  // Unified contacts loader: deduplicates members, friends, trainers, and conversations
  useEffect(() => {
    if (isGuest || !userName || userName === 'Guest') return;

    let isMounted = true;
    const token = localStorage.getItem('gymsync_token') || '';
    const authHeader = token ? { 'Authorization': `Bearer ${token}` } : {};

    const loadContacts = async () => {
      try {
        const myLower = userName.toLowerCase().trim();

        // 1. Fetch user's profile for friends & subscribedGymName
        const userRes = await fetch(`/api/users/${encodeURIComponent(userName)}`, { headers: authHeader });
        const user = userRes.ok ? await userRes.json() : null;

        // 2. Fetch existing conversations
        const convRes = await fetch(`/api/chat/conversations/${encodeURIComponent(userName)}`, { headers: authHeader });
        const convRaw = convRes.ok ? await convRes.json() : [];
        const convList = Array.isArray(convRaw) ? convRaw : [];

        // 3. Fetch trainers if member is subscribed to a gym
        let trainers = [];
        if (user?.subscribedGymName) {
          try {
            const allUsersRes = await fetch('/api/users', { headers: authHeader });
            const allUsers = allUsersRes.ok ? await allUsersRes.json() : [];
            if (Array.isArray(allUsers)) {
              trainers = allUsers.filter(p => p && p.role === 'GymTrainer' && p.assignedGymName === user.subscribedGymName);
            }
          } catch (e) {
            console.error("Failed to fetch gym trainers", e);
          }
        }

        // Deduplication map: key is normalized lowercase trimmed username
        const contactMap = new Map();

        const isExcluded = (name) => {
          if (!name) return true;
          const l = String(name).toLowerCase().trim();
          return l === myLower || isSystemContact(l);
        };

        // Add trainers first
        for (const t of trainers) {
          if (!t || isExcluded(t.name)) continue;
          const key = t.name.toLowerCase().trim();
          contactMap.set(key, {
            id: t.name,
            name: t.name,
            role: `Gym Trainer · ${user.subscribedGymName}`,
            avatar: t.profilePic || '',
            unreadCount: 0,
            lastMessage: '',
            isTrainer: true
          });
        }

        // Add friends
        const friends = Array.isArray(user?.friends) ? user.friends : [];
        for (const f of friends) {
          if (!f || isExcluded(f)) continue;
          const key = String(f).toLowerCase().trim();
          if (!contactMap.has(key)) {
            contactMap.set(key, {
              id: f,
              name: f,
              role: 'Friend',
              avatar: '',
              unreadCount: 0,
              lastMessage: '',
              isFriend: true
            });
          } else {
            contactMap.get(key).isFriend = true;
          }
        }

        // Add backend conversation history
        for (const c of convList) {
          const contactName = c && typeof c === 'object' ? (c.name || c.id) : c;
          if (!contactName || isExcluded(contactName)) continue;
          const key = String(contactName).toLowerCase().trim();
          const existing = contactMap.get(key);
          if (existing) {
            existing.unreadCount = c.unreadCount || existing.unreadCount || 0;
            existing.lastMessage = c.lastMessage || existing.lastMessage || '';
          } else {
            contactMap.set(key, {
              id: contactName,
              name: contactName,
              role: 'Member',
              avatar: '',
              unreadCount: c.unreadCount || 0,
              lastMessage: c.lastMessage || ''
            });
          }
        }

        // Hydrate avatars for contacts lacking one
        const contactsArray = Array.from(contactMap.values());
        const hydrated = await Promise.all(
          contactsArray.map(async (c) => {
            if (c.avatar) return c;
            try {
              const res = await fetch(`/api/users/${encodeURIComponent(c.name)}`, { headers: authHeader });
              if (res.ok) {
                const uData = await res.json();
                return { ...c, avatar: uData.profilePic || '' };
              }
            } catch (err) {
              // Ignore single profile lookup error
            }
            return c;
          })
        );

        if (isMounted) {
          setMemberContacts(hydrated);
        }
      } catch (err) {
        console.error("GlobalChat loadContacts error:", err);
      }
    };

    loadContacts();

    return () => {
      isMounted = false;
    };
  }, [isGuest, userName]);

  // Listener for open_chat events triggered across the app
  useEffect(() => {
    const handleOpenChat = (e) => {
      setIsOpen(true);
      const targetName = e.detail?.userName;
      if (!targetName) return;

      const lower = targetName.toLowerCase().trim();
      if (lower === 'ai' || lower === 'ai trainer') {
        handleContactClick(SYSTEM_CONTACTS[0]);
        return;
      }
      if (lower === 'gym' || lower === 'gym support' || lower === 'iron core support' || lower === 'support team' || lower === 'support') {
        handleContactClick(SYSTEM_CONTACTS[1]);
        return;
      }

      setMemberContacts(prev => {
        const existing = prev.find(c => c.name.toLowerCase().trim() === lower);
        if (existing) {
          handleContactClick(existing);
          return prev;
        }
        const newContact = {
          id: targetName,
          name: targetName,
          role: 'Member',
          avatar: e.detail?.avatar || '',
          unreadCount: 0,
          lastMessage: ''
        };
        handleContactClick(newContact);
        return [newContact, ...prev];
      });
    };

    window.addEventListener('open_chat', handleOpenChat);
    return () => window.removeEventListener('open_chat', handleOpenChat);
  }, []);

  // FIX: Both route-guard early returns are now AFTER all hooks.
  // This ensures React always calls the same number of hooks on every render.
  if (['/messages', '/chat'].includes(location.pathname)) {
    return null;
  }

  if (isGuest) return null;

  const handleSend = async (e) => {
    e.preventDefault();
    if (!input.trim() || !activeContact) return;

    const messageText = input.trim();
    const newMsg = {
      id: Date.now(),
      text: messageText,
      sender: 'user',
      timestamp: new Date().toISOString()
    };

    setMessages(prev => ({
      ...prev,
      [activeContact.id]: [...(prev[activeContact.id] || []), newMsg]
    }));

    setInput('');

    if (activeContact.id === 'ai') {
      const userContext = {
        primaryGoal: localStorage.getItem('gymsync_onboarding_primaryGoal') || 'General Fitness',
        gender: localStorage.getItem('gymsync_onboarding_gender') || 'Unspecified',
        fitnessLevel: localStorage.getItem('gymsync_onboarding_fitnessLevel') || 'Beginner'
      };

      try {
        const token = localStorage.getItem('gymsync_token') || localStorage.getItem('token') || '';
        // Send via /api/chat so it persists in the database for both /messages and widget!
        const response = await fetch('/api/chat', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { 'Authorization': `Bearer ${token}` } : {})
          },
          body: JSON.stringify({
            sender: userName,
            receiver: 'AI Trainer',
            text: messageText,
            userContext
          })
        });
        const data = await response.json();
        let replyText = data.content || data.aiReply?.text || data.message || "I couldn't process that response. Please try again.";

        if (data.structuredAction?.workout) {
          localStorage.setItem('gymsync_ai_structured_workout', JSON.stringify(data.structuredAction.workout));
          const exNames = (data.structuredAction.workout.exercises || []).map(e => e.name || e);
          if (exNames.length > 0) {
            localStorage.setItem('gymsync_ai_plan', JSON.stringify(exNames));
          }
          toast.success("AI Workout Plan Updated!");
        }

        const planMatch = replyText && typeof replyText === 'string' ? replyText.match(/<PLAN>(.*?)<\/PLAN>/i) : null;
        if (planMatch) {
          const exercisesString = planMatch[1];
          const exercisesArray = exercisesString.split(',').map(e => e.trim());
          localStorage.setItem('gymsync_ai_plan', JSON.stringify(exercisesArray));

          replyText = replyText.replace(planMatch[0], "\n\n🏋️‍♂️ **Workout Plan Generated!**\nYour new plan has been loaded into the AI Trainer. [Click here to open AI Trainer](/ai-trainer)");
          toast.success("New AI Workout Plan Generated!");
        }

        const botMsg = {
          id: data.aiReply?._id || Date.now() + 1,
          text: replyText,
          sender: 'other',
          timestamp: new Date().toISOString()
        };

        setMessages(prev => ({
          ...prev,
          [activeContact.id]: [...(prev[activeContact.id] || []), botMsg]
        }));
      } catch (err) {
        const errReply = {
          id: Date.now() + 1,
          text: "Sorry, I am having trouble connecting to AI services right now. Please try again shortly.",
          sender: 'other',
          timestamp: new Date().toISOString()
        };
        setMessages(prev => ({
          ...prev,
          [activeContact.id]: [...(prev[activeContact.id] || []), errReply]
        }));
      }
    }
    else if (activeContact.id === 'gym') {
      try {
        const token = localStorage.getItem('gymsync_token') || localStorage.getItem('token') || '';
        const response = await fetch('/api/chat', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { 'Authorization': `Bearer ${token}` } : {})
          },
          body: JSON.stringify({
            sender: userName,
            receiver: 'Gym Support',
            text: messageText
          })
        });
        const data = await response.json();
        if (data.supportReply?.text) {
          setMessages(prev => ({
            ...prev,
            [activeContact.id]: [...(prev[activeContact.id] || []), {
              id: data.supportReply._id || Date.now() + 1,
              text: data.supportReply.text,
              sender: 'other',
              timestamp: new Date().toISOString()
            }]
          }));
        }
      } catch (err) { console.error("Support chat error:", err); }
    }
    else {
      // Direct message to member / friend / trainer
      try {
        const token = localStorage.getItem('gymsync_token') || '';
        await fetch('/api/chat', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            sender: userName,
            receiver: activeContact.name || activeContact.id,
            text: messageText
          })
        });
      } catch (err) {
        console.error("Direct chat send error:", err);
      }
    }
  };

  return (
    <div className="global-chat-wrapper">
      <button className={`chat-fab ${isOpen ? 'hidden' : ''}`} onClick={() => setIsOpen(true)}>
        <MessageCircle size={28} />
        <span className="notification-dot"></span>
      </button>

      <div className={`chat-window glass-panel ${isOpen ? 'open' : ''}`}>
        <div className="chat-header">
          {activeContact ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1, minWidth: 0 }}>
              <button 
                className="back-btn" 
                onClick={() => setActiveContact(null)} 
                style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer', padding: '4px', fontSize: '1.2rem', lineHeight: 1 }}
                title="Back to messages"
              >
                ←
              </button>
              {activeContact.isSystem ? (
                <div style={{ width: '32px', height: '32px', minWidth: '32px', borderRadius: '50%', background: 'rgba(59, 130, 246, 0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.1rem' }}>
                  {activeContact.avatar}
                </div>
              ) : (
                <UserAvatar src={activeContact.avatar} name={activeContact.name} size={32} />
              )}
              <div style={{ overflow: 'hidden', minWidth: 0 }}>
                <h3 style={{ margin: 0, fontSize: '0.98rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {activeContact.name}
                </h3>
                <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {activeContact.role}
                </span>
              </div>
            </div>
          ) : (
            <h3 style={{ margin: 0 }}>Messages</h3>
          )}
          <button className="close-btn" onClick={() => { setIsOpen(false); setActiveContact(null); }} title="Close chat">
            <X size={20} />
          </button>
        </div>

        {!activeContact ? (
          <div className="contact-list" style={{ flex: 1, overflowY: 'auto' }}>
            {/* Assistants Section */}
            <div style={{ padding: '10px 16px 6px', fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Assistants
            </div>
            {SYSTEM_CONTACTS.map(contact => (
              <div
                key={contact.id}
                onClick={() => handleContactClick(contact)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '12px 16px',
                  borderBottom: '1px solid rgba(255,255,255,0.05)',
                  cursor: 'pointer',
                  transition: 'background 0.2s'
                }}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.06)'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
              >
                <div style={{ width: '40px', height: '40px', minWidth: '40px', borderRadius: '50%', background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.25rem', boxShadow: '0 2px 8px rgba(59,130,246,0.3)' }}>
                  {contact.avatar}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <h4 style={{ margin: 0, fontSize: '0.92rem', color: 'var(--text-primary)' }}>{contact.name}</h4>
                    {contact.isPremium && (
                      <span style={{ background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)', color: 'white', fontSize: '0.65rem', padding: '1px 6px', borderRadius: '4px', fontWeight: 'bold' }}>
                        AI
                      </span>
                    )}
                  </div>
                  <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', display: 'block' }}>
                    {contact.role}
                  </span>
                </div>
              </div>
            ))}

            {/* Direct Messages Section */}
            <div style={{ padding: '14px 16px 6px', fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>Direct Messages</span>
              <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', fontWeight: 400 }}>{memberContacts.length}</span>
            </div>

            {memberContacts.length === 0 ? (
              <div style={{ padding: '24px 16px', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.82rem' }}>
                No conversations yet. Connect with members or trainers to start chatting!
              </div>
            ) : (
              memberContacts.map(contact => (
                <div
                  key={contact.id}
                  onClick={() => handleContactClick(contact)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    padding: '12px 16px',
                    borderBottom: '1px solid rgba(255,255,255,0.05)',
                    cursor: 'pointer',
                    transition: 'background 0.2s'
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.06)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                >
                  <UserAvatar src={contact.avatar} name={contact.name} size={40} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2px' }}>
                      <h4 style={{ margin: 0, fontSize: '0.92rem', color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {contact.name}
                      </h4>
                      {contact.unreadCount > 0 && (
                        <span style={{ background: '#3b82f6', color: '#fff', fontSize: '0.7rem', padding: '1px 6px', borderRadius: '10px', fontWeight: 'bold' }}>
                          {contact.unreadCount}
                        </span>
                      )}
                    </div>
                    <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {contact.lastMessage || contact.role}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        ) : (
          <>
            <div className="chat-body" style={{ overflowY: 'auto', flex: 1 }}>
              <>
                {(messages[activeContact.id] || []).map((msg, idx) => (
                  <div key={idx} className={`chat-bubble ${msg.sender === 'user' ? 'outgoing' : 'incoming'}`}>
                    {activeContact.id === 'ai' && msg.sender === 'other' ? (
                      <ReactMarkdown>{msg.text}</ReactMarkdown>
                    ) : (
                      msg.text
                    )}
                  </div>
                ))}
                {(!messages[activeContact.id] || messages[activeContact.id].length === 0) && (
                  <p style={{textAlign: 'center', color: 'var(--text-secondary)', marginTop: '20px'}}>Say hi to {activeContact.name}!</p>
                )}
                <div ref={messagesEndRef} />
              </>
            </div>

            <form className="chat-footer" onSubmit={handleSend}>
              <input type="text" placeholder="Type a message..." value={input} onChange={(e) => setInput(e.target.value)} />
              <button type="submit" className="send-btn"><Send size={18} /></button>
            </form>
          </>
        )}
      </div>
    </div>
  );
};

export default GlobalChat;
