import React, { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { MessageCircle, X, Send, Bot, Building2, Trash2, Sparkles, ExternalLink, Dumbbell, Utensils, TrendingUp, Zap, Target, CheckCircle2, Flame } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { toast } from 'react-toastify';
import UserAvatar from '../common/UserAvatar';
import './GlobalChat.css';

const SYSTEM_CONTACTS = [
  { id: 'ai', name: 'AI Workout Coach', role: 'Personal Coach', avatar: '🏋️', isSystem: true, isPremium: true, persona: 'workout_coach' },
  { id: 'diet_ai', name: 'AI Nutritionist', role: 'Sports Nutritionist', avatar: '🥗', isSystem: true, isPremium: true, persona: 'nutritionist' },
  { id: 'gym', name: 'Gym Support', role: 'Platform Support', avatar: '🏢', isSystem: true, isPremium: false }
];

const SYSTEM_IDENTIFIERS = new Set([
  'ai',
  'diet_ai',
  'gym',
  'ai trainer',
  'ai workout coach',
  'workout coach',
  'ai nutritionist',
  'nutritionist',
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
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [activeContact, setActiveContact] = useState(null);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState({});
  const [memberContacts, setMemberContacts] = useState([]);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

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

  const getWelcomeMessage = (contactId) => {
    if (contactId === 'diet_ai') {
      return {
        id: 'diet-ai-welcome',
        text: `Hi **${userName || 'Athlete'}**! 👋 I'm your **AI Nutritionist**.\n\nI calculate your daily macros, optimize your meal plans, and provide smart food substitutions. What would you like to fuel today?`,
        sender: 'other',
        timestamp: new Date().toISOString(),
        suggestions: ['🥗 Today\'s Meals', '🌅 Tomorrow\'s Meals', '🍎 Swap a Food Item', '🎯 Check Daily Macros'],
        structuredAction: { type: 'GREETING', persona: 'nutritionist' }
      };
    }
    return {
      id: 'ai-welcome',
      text: `Hi **${userName || 'Athlete'}**! 👋 I'm your **AI Workout Coach**.\n\nReady to train? I can build your periodized workout routine, adapt today's exercises, or check your recovery.`,
      sender: 'other',
      timestamp: new Date().toISOString(),
      suggestions: ['🏋️ Build Workout Plan', '⚡ Today\'s Workout', '🥗 Open AI Nutritionist', '📊 View Progress'],
      structuredAction: { type: 'GREETING' }
    };
  };

  const fetchConversation = async (contactId) => {
    try {
      const token = localStorage.getItem('gymsync_token') || '';
      const res = await fetch(`/api/chat/${encodeURIComponent(userName)}/${encodeURIComponent(contactId)}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) {
        if (contactId === 'ai' || contactId === 'diet_ai') {
          setMessages(prev => ({
            ...prev,
            [contactId]: [getWelcomeMessage(contactId)]
          }));
        }
        return;
      }
      const data = await res.json();
      if (!Array.isArray(data)) return;

      const formattedMessages = data.map(msg => ({
        id: msg._id,
        text: msg.text,
        sender: msg.sender === userName ? 'user' : 'other',
        timestamp: msg.createdAt,
        suggestions: msg.suggestions || [],
        structuredAction: msg.structuredAction || null
      }));

      if (formattedMessages.length === 0 && (contactId === 'ai' || contactId === 'diet_ai')) {
        formattedMessages.push(getWelcomeMessage(contactId));
      }

      setMessages(prev => ({
        ...prev,
        [contactId]: formattedMessages
      }));
    } catch (err) {
      console.error("fetchConversation error:", err);
      if (contactId === 'ai' || contactId === 'diet_ai') {
        setMessages(prev => ({
          ...prev,
          [contactId]: [getWelcomeMessage(contactId)]
        }));
      }
    }
  };

  const handleContactClick = (contact) => {
    let effectiveContact = contact;
    const lower = (contact.name || contact.id || '').toLowerCase().trim();
    if (lower === 'ai' || lower === 'ai trainer' || lower === 'ai workout coach' || lower === 'workout coach') {
      effectiveContact = SYSTEM_CONTACTS[0];
    } else if (lower === 'diet_ai' || lower === 'ai nutritionist' || lower === 'nutritionist') {
      effectiveContact = SYSTEM_CONTACTS[1];
    } else if (lower === 'gym' || lower === 'gym support' || lower === 'iron core support' || lower === 'support team' || lower === 'support') {
      effectiveContact = SYSTEM_CONTACTS[2];
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
        if (user && user.subscribedGymName) {
          const tRes = await fetch(`/api/users/trainers?gym=${encodeURIComponent(user.subscribedGymName)}`, { headers: authHeader });
          trainers = tRes.ok ? await tRes.json() : [];
        }

        const isExcluded = (name) => {
          if (!name) return true;
          const lower = String(name).toLowerCase().trim();
          return lower === myLower || isSystemContact(lower);
        };

        const contactMap = new Map();

        // Add trainers first
        for (const t of trainers) {
          if (!t || !t.name || isExcluded(t.name)) continue;
          const key = t.name.toLowerCase().trim();
          contactMap.set(key, {
            id: t._id || t.name,
            name: t.name,
            role: 'Trainer',
            avatar: t.profilePic || '',
            unreadCount: 0,
            lastMessage: '',
            isTrainer: true
          });
        }

        // Add user's friends list
        for (const f of (user?.friends || [])) {
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

  // Listener for open_chat and coach events triggered across the app
  useEffect(() => {
    const handleOpenCoach = (e) => {
      setIsOpen(true);
      handleContactClick(SYSTEM_CONTACTS[0]);
      const initial = e?.detail?.initialMessage || e?.detail?.command;
      if (initial) {
        setInput(initial);
      }
      setTimeout(() => {
        inputRef.current?.focus();
      }, 150);
    };

    const handleOpenChat = (e) => {
      setIsOpen(true);
      const targetName = e.detail?.userName;
      const initial = e?.detail?.initialMessage || e?.detail?.command;
      if (initial) {
        setInput(initial);
      }

      if (!targetName) {
        handleContactClick(SYSTEM_CONTACTS[0]);
        setTimeout(() => {
          inputRef.current?.focus();
        }, 150);
        return;
      }

      const lower = targetName.toLowerCase().trim();
      if (lower === 'ai' || lower === 'ai trainer' || lower === 'ai coach' || lower === 'coach') {
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

    const handleOpenNutritionist = (e) => {
      setIsOpen(true);
      handleContactClick(SYSTEM_CONTACTS[1]);
      const initial = e?.detail?.initialMessage || e?.detail?.command;
      if (initial) {
        setInput(initial);
      }
      setTimeout(() => {
        inputRef.current?.focus();
      }, 150);
    };

    window.addEventListener('open_chat', handleOpenChat);
    window.addEventListener('gymsync_open_coach', handleOpenCoach);
    window.addEventListener('gymsync_open_coach_command', handleOpenCoach);
    window.addEventListener('gymsync_open_nutritionist', handleOpenNutritionist);

    return () => {
      window.removeEventListener('open_chat', handleOpenChat);
      window.removeEventListener('gymsync_open_coach', handleOpenCoach);
      window.removeEventListener('gymsync_open_coach_command', handleOpenCoach);
      window.removeEventListener('gymsync_open_nutritionist', handleOpenNutritionist);
    };
  }, []);

  // FIX: Both route-guard early returns are now AFTER all hooks.
  // This ensures React always calls the same number of hooks on every render.
  if (['/messages', '/chat'].includes(location.pathname)) {
    return null;
  }

  if (isGuest) return null;

  const sendMessageText = async (messageText) => {
    if (!messageText?.trim() || !activeContact) return;

    const trimmed = messageText.trim();
    const newMsg = {
      id: Date.now(),
      text: trimmed,
      sender: 'user',
      timestamp: new Date().toISOString()
    };

    setMessages(prev => ({
      ...prev,
      [activeContact.id]: [...(prev[activeContact.id] || []), newMsg]
    }));

    const isAI = activeContact.id === 'ai' || activeContact.id === 'diet_ai';
    if (isAI) {
      const userContext = {
        primaryGoal: localStorage.getItem('gymsync_onboarding_primaryGoal') || 'General Fitness',
        gender: localStorage.getItem('gymsync_onboarding_gender') || 'Unspecified',
        fitnessLevel: localStorage.getItem('gymsync_onboarding_fitnessLevel') || 'Beginner',
        equipmentAccess: localStorage.getItem('gymsync_onboarding_equipmentAccess') || 'Full Gym'
      };

      try {
        const token = localStorage.getItem('gymsync_token') || localStorage.getItem('token') || '';
        const receiver = activeContact.id === 'diet_ai' ? 'AI Nutritionist' : 'AI Workout Coach';
        const persona = activeContact.persona || (activeContact.id === 'diet_ai' ? 'nutritionist' : 'workout_coach');

        const response = await fetch('/api/chat', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { 'Authorization': `Bearer ${token}` } : {})
          },
          body: JSON.stringify({
            sender: userName,
            receiver,
            text: trimmed,
            assistantPersona: persona,
            userContext
          })
        });
        const data = await response.json();
        let replyText = data.content || data.aiReply?.text || data.message || "I couldn't process that response. Please try again.";

        if (data.structuredAction?.plan) {
          localStorage.setItem('gymsync_ai_workout_plan', JSON.stringify(data.structuredAction.plan));
          localStorage.setItem('gymsync_active_plan', JSON.stringify(data.structuredAction.plan));
          toast.success("AI Workout Plan Generated!");
        } else if (data.structuredAction?.workout) {
          localStorage.setItem('gymsync_ai_structured_workout', JSON.stringify(data.structuredAction.workout));
          const exNames = (data.structuredAction.workout.exercises || data.structuredAction.workout.mainWorkout || []).map(e => e.name || e);
          if (exNames.length > 0) {
            localStorage.setItem('gymsync_ai_plan', JSON.stringify(exNames));
          }
          const actionType = data.structuredAction.type;
          if (actionType === 'RECOVERY_ADAPTED') {
            toast.success("Recovery session adapted based on your state!");
          } else {
            toast.success("AI Workout Updated!");
          }
        }

        // Handle navigation actions
        if (data.structuredAction?.type === 'navigate' && data.structuredAction?.payload?.route) {
          setTimeout(() => {
            setIsOpen(false);
            navigate(data.structuredAction.payload.route);
          }, 1500);
        }

        // Handle START_EXERCISE action — navigate to AI Trainer with exercise context
        if (data.structuredAction?.type === 'START_EXERCISE' || data.structuredAction?.type === 'start_exercise') {
          const ex = data.structuredAction.payload?.exerciseName || data.structuredAction.exerciseName;
          if (ex) {
            localStorage.setItem('gymsync_tracking_exercise', JSON.stringify({
              name: ex,
              sets: data.structuredAction.sets || 3,
              reps: data.structuredAction.reps || '10',
              restSec: data.structuredAction.restSec || 60
            }));
          }
        }

        // Handle plan actions
        if (data.structuredAction?.type === 'PLAN_UPDATED' || data.structuredAction?.type === 'LINK_PLAN') {
          toast.success(data.structuredAction.type === 'PLAN_UPDATED' ? 'Plan updated!' : 'Plan linked!');
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
          timestamp: new Date().toISOString(),
          suggestions: data.suggestions || data.structuredAction?.suggestions || [],
          structuredAction: data.structuredAction || null
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
          timestamp: new Date().toISOString(),
          suggestions: ['🔄 Try Again', '💬 Ask Something Else']
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
            text: trimmed
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
            text: trimmed
          })
        });
      } catch (err) {
        console.error("Direct chat send error:", err);
      }
    }
  };

  const handleSend = async (e) => {
    e.preventDefault();
    if (!input.trim() || !activeContact) return;
    const msg = input.trim();
    setInput('');
    await sendMessageText(msg);
  };

  const handleSuggestionClick = async (sugText) => {
    const lower = (sugText || '').toLowerCase();
    if (lower.includes('switch to ai nutritionist') || lower.includes('open ai nutritionist') || lower.includes('talk to ai nutritionist') || lower.includes('switch to nutritionist')) {
      handleContactClick(SYSTEM_CONTACTS[1]);
      return;
    }
    if (lower.includes('switch to ai workout coach') || lower.includes('open ai workout coach') || lower.includes('talk to ai workout coach') || lower.includes('switch to workout coach')) {
      handleContactClick(SYSTEM_CONTACTS[0]);
      return;
    }
    await sendMessageText(sugText);
  };

  const handleClearChat = async () => {
    if (!activeContact) return;
    const confirmClear = window.confirm(`Clear all chat messages with ${activeContact.name}?`);
    if (!confirmClear) return;

    try {
      const token = localStorage.getItem('gymsync_token') || localStorage.getItem('token') || '';
      const targetName = activeContact.name || activeContact.id;
      const res = await fetch(`/api/chat/conversation/${encodeURIComponent(targetName)}`, {
        method: 'DELETE',
        headers: {
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        }
      });
      if (res.ok) {
        setMessages(prev => ({
          ...prev,
          [activeContact.id]: []
        }));
        toast.success(`Chat history with ${activeContact.name} cleared!`);
      } else {
        toast.error('Failed to clear chat history');
      }
    } catch (err) {
      console.error('Clear chat error:', err);
      toast.error('Error clearing chat history');
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
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            {activeContact && (
              <button
                className="clear-chat-btn"
                onClick={handleClearChat}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--text-secondary)',
                  cursor: 'pointer',
                  padding: '4px',
                  borderRadius: '6px',
                  display: 'flex',
                  alignItems: 'center',
                  transition: 'color 0.2s'
                }}
                title="Clear chat history"
              >
                <Trash2 size={16} />
              </button>
            )}
            <button className="close-btn" onClick={() => { setIsOpen(false); setActiveContact(null); }} title="Close chat">
              <X size={20} />
            </button>
          </div>
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
                  <div key={idx} className={`chat-message-group ${msg.sender === 'user' ? 'outgoing' : 'incoming'}`} style={{ display: 'flex', flexDirection: 'column', alignItems: msg.sender === 'user' ? 'flex-end' : 'flex-start', margin: '4px 0' }}>
                    <div className={`chat-bubble ${msg.sender === 'user' ? 'outgoing' : 'incoming'}`}>
                      {(activeContact.id === 'ai' || activeContact.id === 'diet_ai') && msg.sender === 'other' ? (
                        <ReactMarkdown>{msg.text}</ReactMarkdown>
                      ) : (
                        msg.text
                      )}
                    </div>

                    {/* SWITCH_TO_NUTRITIONIST Action Card */}
                    {msg.structuredAction?.type === 'SWITCH_TO_NUTRITIONIST' && (
                      <div style={{ margin: '8px 0', padding: '10px 14px', borderRadius: '10px', background: 'rgba(16,185,129,0.12)', border: '1px solid rgba(16,185,129,0.3)', maxWidth: '90%', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#34d399' }}>🥗 Sports Nutritionist Available</span>
                        <button type="button" onClick={() => handleContactClick(SYSTEM_CONTACTS[1])} style={{ padding: '7px 14px', borderRadius: '8px', background: 'linear-gradient(135deg, #10b981, #059669)', color: '#fff', fontWeight: 700, fontSize: '0.8rem', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', alignSelf: 'flex-start' }}>
                          🥗 Open AI Nutritionist
                        </button>
                      </div>
                    )}

                    {/* SWITCH_TO_WORKOUT_COACH Action Card */}
                    {msg.structuredAction?.type === 'SWITCH_TO_WORKOUT_COACH' && (
                      <div style={{ margin: '8px 0', padding: '10px 14px', borderRadius: '10px', background: 'rgba(59,130,246,0.12)', border: '1px solid rgba(59,130,246,0.3)', maxWidth: '90%', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#60a5fa' }}>🏋️ Workout Coach Available</span>
                        <button type="button" onClick={() => handleContactClick(SYSTEM_CONTACTS[0])} style={{ padding: '7px 14px', borderRadius: '8px', background: 'linear-gradient(135deg, #3b82f6, #2563eb)', color: '#fff', fontWeight: 700, fontSize: '0.8rem', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', alignSelf: 'flex-start' }}>
                          🏋️ Open AI Workout Coach
                        </button>
                      </div>
                    )}

                    {/* Plan Action Card */}
                    {(activeContact.id === 'ai' || activeContact.id === 'diet_ai') && msg.structuredAction?.plan && (
                      <div
                        className="ai-plan-action-card"
                        style={{
                          margin: '8px 0',
                          padding: '12px 14px',
                          borderRadius: '12px',
                          background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.15) 0%, rgba(139, 92, 246, 0.12) 100%)',
                          border: '1px solid rgba(59, 130, 246, 0.35)',
                          maxWidth: '90%',
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
                          onClick={() => {
                            setIsOpen(false);
                            navigate('/ai-trainer');
                          }}
                        >
                          <ExternalLink size={13} /> Open in AI Trainer / Workout Hub
                        </button>
                      </div>
                    )}

                    {/* START_EXERCISE Action Card */}
                    {activeContact.id === 'ai' && (msg.structuredAction?.type === 'START_EXERCISE' || msg.structuredAction?.type === 'EXERCISE_ALREADY_DONE') && msg.structuredAction?.exerciseName && (
                      <div style={{ margin: '8px 0', padding: '10px 14px', borderRadius: '10px', background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.3)', maxWidth: '90%', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#4ade80' }}>🏋️ {msg.structuredAction.exerciseName}</span>
                        {msg.structuredAction.sets && <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{msg.structuredAction.sets} sets × {msg.structuredAction.reps} reps | Rest: {msg.structuredAction.restSec}s</span>}
                        {msg.structuredAction.type !== 'EXERCISE_ALREADY_DONE' && (
                          <button type="button" style={{ padding: '5px 12px', borderRadius: '8px', background: '#22c55e', border: 'none', color: '#fff', fontSize: '0.78rem', fontWeight: 700, cursor: 'pointer' }}
                            onClick={() => {
                              const exData = {
                                name: msg.structuredAction.exerciseName,
                                sets: msg.structuredAction.sets || 3,
                                reps: msg.structuredAction.reps || '10-12',
                                restSec: msg.structuredAction.restSec || 60
                              };
                              localStorage.setItem('gymsync_active_mission', JSON.stringify(exData));
                              localStorage.setItem('gymsync_tracking_exercise', JSON.stringify(exData));
                              setIsOpen(false);
                              navigate(`/ai-trainer?exercise=${encodeURIComponent(msg.structuredAction.exerciseName)}`, { state: { activeExercise: exData } });
                            }}>
                            ▶️ Start Now
                          </button>
                        )}
                      </div>
                    )}

                    {/* MISSED_WORKOUT_RESOLVE Action Card */}
                    {activeContact.id === 'ai' && msg.structuredAction?.type === 'MISSED_WORKOUT_RESOLVE' && (
                      <div style={{ margin: '8px 0', padding: '10px 14px', borderRadius: '10px', background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.3)', maxWidth: '90%', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#fbbf24' }}>📋 Missed Workout Options</span>
                        <span style={{ fontSize: '0.74rem', color: 'var(--text-secondary)' }}>Choose how to handle your missed session:</span>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '4px' }}>
                          {['Option A: Compress Today', 'Option B: Shift +1 Day', 'Option C: Rest Day'].map((opt, i) => (
                            <button key={i} type="button"
                              style={{ padding: '5px 10px', borderRadius: '16px', background: 'rgba(245,158,11,0.15)', border: '1px solid rgba(245,158,11,0.4)', color: '#fcd34d', fontSize: '0.76rem', fontWeight: 600, cursor: 'pointer' }}
                              onClick={() => handleSuggestionClick(opt)}>
                              {opt}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* FOOD_SUBSTITUTE Action Card */}
                    {activeContact.id === 'ai' && msg.structuredAction?.type === 'FOOD_SUBSTITUTE' && msg.structuredAction?.foodItem && (
                      <div style={{ margin: '8px 0', padding: '10px 14px', borderRadius: '10px', background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.3)', maxWidth: '90%', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#34d399' }}>🥗 Food Substitution — {msg.structuredAction.foodItem}</span>
                        {msg.structuredAction.alternatives && msg.structuredAction.alternatives.length > 0 && (
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '2px' }}>
                            {msg.structuredAction.alternatives.slice(0, 3).map((alt, i) => (
                              <button key={i} type="button"
                                style={{ padding: '4px 10px', borderRadius: '14px', background: 'rgba(16,185,129,0.15)', border: '1px solid rgba(16,185,129,0.4)', color: '#6ee7b7', fontSize: '0.74rem', fontWeight: 600, cursor: 'pointer' }}
                                onClick={() => handleSuggestionClick(`✅ ${alt.name}`)}>
                                ✅ {alt.name.split(' ').slice(0, 3).join(' ')} ({alt.protein}g protein)
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    {/* FOOD_SUBSTITUTE_CONFIRMED Action Card */}
                    {activeContact.id === 'ai' && msg.structuredAction?.type === 'FOOD_SUBSTITUTE_CONFIRMED' && (
                      <div style={{ margin: '8px 0', padding: '10px 14px', borderRadius: '10px', background: 'rgba(16,185,129,0.12)', border: '1px solid rgba(16,185,129,0.4)', maxWidth: '90%', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <span style={{ fontSize: '0.84rem', fontWeight: 700, color: '#34d399', display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <CheckCircle2 size={15} color="#10b981" /> Swapped: {msg.structuredAction.originalFood} → {msg.structuredAction.substituteFood}
                        </span>
                        <span style={{ fontSize: '0.74rem', color: 'var(--text-secondary)' }}>Nutritional totals have been updated in your active plan.</span>
                        <button type="button" style={{ padding: '6px 12px', borderRadius: '8px', background: 'linear-gradient(135deg, #10b981, #059669)', border: 'none', color: '#fff', fontSize: '0.78rem', fontWeight: 700, cursor: 'pointer', alignSelf: 'flex-start' }}
                          onClick={() => { setIsOpen(false); navigate('/ai-trainer?tab=diets'); }}>
                          🥗 View in Nutrition Hub
                        </button>
                      </div>
                    )}

                    {/* RECOVERY_ADAPTED Action Card */}
                    {activeContact.id === 'ai' && msg.structuredAction?.type === 'RECOVERY_ADAPTED' && (
                      <div style={{ margin: '8px 0', padding: '10px 14px', borderRadius: '10px', background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.3)', maxWidth: '90%', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#818cf8' }}>😴 Recovery Session Adapted</span>
                        {msg.structuredAction.explanation && <span style={{ fontSize: '0.74rem', color: 'var(--text-secondary)', fontStyle: 'italic' }}>{msg.structuredAction.explanation}</span>}
                        <button type="button" style={{ padding: '5px 12px', borderRadius: '8px', background: '#6366f1', border: 'none', color: '#fff', fontSize: '0.78rem', fontWeight: 700, cursor: 'pointer', alignSelf: 'flex-start' }}
                          onClick={() => { setIsOpen(false); navigate('/ai-trainer'); }}>
                          🚀 Load Recovery Session
                        </button>
                      </div>
                    )}

                    {/* GOAL_LIFECYCLE Action Card */}
                    {activeContact.id === 'ai' && msg.structuredAction?.type === 'GOAL_LIFECYCLE' && (
                      <div style={{ margin: '8px 0', padding: '10px 14px', borderRadius: '10px', background: 'linear-gradient(135deg, rgba(251,191,36,0.12) 0%, rgba(251,113,36,0.10) 100%)', border: '1px solid rgba(251,191,36,0.35)', maxWidth: '90%', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <span style={{ fontSize: '0.88rem', fontWeight: 700, color: '#fbbf24' }}>🏆 {msg.structuredAction.phase === 'goal_completed' ? 'Goal Complete!' : 'Select Next Goal'}</span>
                        {msg.structuredAction.completedGoal && <span style={{ fontSize: '0.74rem', color: 'var(--text-secondary)' }}>Completed: {msg.structuredAction.completedGoal.title}</span>}
                        <button type="button" style={{ padding: '5px 12px', borderRadius: '8px', background: 'rgba(251,191,36,0.2)', border: '1px solid rgba(251,191,36,0.5)', color: '#fbbf24', fontSize: '0.78rem', fontWeight: 700, cursor: 'pointer', alignSelf: 'flex-start' }}
                          onClick={() => { setIsOpen(false); navigate('/dashboard'); }}>
                          🎯 Set Next Goal
                        </button>
                      </div>
                    )}

                    {/* Navigate Action (auto-navigate) indicator */}
                    {activeContact.id === 'ai' && msg.structuredAction?.type === 'navigate' && msg.structuredAction?.payload?.route && (
                      <div style={{ margin: '4px 0', padding: '6px 12px', borderRadius: '8px', background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.25)', maxWidth: '80%', display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                        <ExternalLink size={12} style={{ color: '#818cf8' }} />
                        <button type="button" style={{ background: 'none', border: 'none', color: '#818cf8', fontSize: '0.76rem', fontWeight: 600, cursor: 'pointer' }}
                          onClick={() => { setIsOpen(false); navigate(msg.structuredAction.payload.route); }}>
                          → Open {msg.structuredAction.payload.route.replace('/', '').replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                        </button>
                      </div>
                    )}

                    {/* GREETING Action Card — Profile Snapshot & 4-Pill Action Row (Issue 10) */}
                    {activeContact.id === 'ai' && (msg.structuredAction?.type === 'GREETING' || (idx === 0 && msg.sender === 'other' && msg.text?.includes('Ready to train today'))) && (
                      <div style={{ margin: '8px 0', padding: '14px 16px', borderRadius: '14px', background: 'linear-gradient(135deg, rgba(30,41,59,0.95) 0%, rgba(15,23,42,0.95) 100%)', border: '1px solid rgba(99,102,241,0.3)', maxWidth: '92%', display: 'flex', flexDirection: 'column', gap: '10px', boxShadow: '0 8px 24px rgba(0,0,0,0.25)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <span style={{ fontSize: '0.86rem', fontWeight: 700, color: '#a5b4fc', display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <Zap size={14} color="#818cf8" /> Athlete Profile Snapshot
                          </span>
                          <span style={{ fontSize: '0.7rem', color: '#10b981', background: 'rgba(16,185,129,0.15)', padding: '2px 8px', borderRadius: '10px', fontWeight: 600 }}>Active</span>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px', background: 'rgba(255,255,255,0.03)', padding: '10px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.06)' }}>
                          <div>
                            <div style={{ fontSize: '0.68rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Primary Goal</div>
                            <div style={{ fontSize: '0.8rem', fontWeight: 600, color: '#f8fafc' }}>{userContext?.primaryGoal || 'General Fitness'}</div>
                          </div>
                          <div>
                            <div style={{ fontSize: '0.68rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Fitness Level</div>
                            <div style={{ fontSize: '0.8rem', fontWeight: 600, color: '#f8fafc' }}>{userContext?.fitnessLevel || 'Beginner'}</div>
                          </div>
                          <div>
                            <div style={{ fontSize: '0.68rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Equipment</div>
                            <div style={{ fontSize: '0.8rem', fontWeight: 600, color: '#f8fafc' }}>{userContext?.equipmentAccess || 'Full Gym'}</div>
                          </div>
                          <div>
                            <div style={{ fontSize: '0.68rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Weight</div>
                            <div style={{ fontSize: '0.8rem', fontWeight: 600, color: '#f8fafc' }}>{userContext?.weight ? `${userContext.weight} kg` : 'Tracked in App'}</div>
                          </div>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px', marginTop: '2px' }}>
                          <button type="button" onClick={() => handleSuggestionClick('🏋️ Generate Workout')}
                            style={{ padding: '8px 10px', borderRadius: '8px', background: 'rgba(59,130,246,0.18)', border: '1px solid rgba(59,130,246,0.4)', color: '#93c5fd', fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', transition: 'all 0.15s' }}>
                            <Dumbbell size={13} /> Generate Workout
                          </button>
                          <button type="button" onClick={() => handleSuggestionClick('🥗 Custom Diet')}
                            style={{ padding: '8px 10px', borderRadius: '8px', background: 'rgba(16,185,129,0.18)', border: '1px solid rgba(16,185,129,0.4)', color: '#6ee7b7', fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', transition: 'all 0.15s' }}>
                            <Utensils size={13} /> Custom Diet
                          </button>
                          <button type="button" onClick={() => handleSuggestionClick('⚡ 20-Min Workout')}
                            style={{ padding: '8px 10px', borderRadius: '8px', background: 'rgba(245,158,11,0.18)', border: '1px solid rgba(245,158,11,0.4)', color: '#fcd34d', fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', transition: 'all 0.15s' }}>
                            <Zap size={13} /> 20-Min Workout
                          </button>
                          <button type="button" onClick={() => handleSuggestionClick('📊 View Progress')}
                            style={{ padding: '8px 10px', borderRadius: '8px', background: 'rgba(168,85,247,0.18)', border: '1px solid rgba(168,85,247,0.4)', color: '#d8b4fe', fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', transition: 'all 0.15s' }}>
                            <TrendingUp size={13} /> View Progress
                          </button>
                        </div>
                      </div>
                    )}

                    {/* MINI-COACH QUESTIONNAIRE INTERVIEW CARD (Issue 2) */}
                    {(activeContact.id === 'ai' || activeContact.id === 'diet_ai') && msg.structuredAction?.type === 'PLAN_QUESTIONNAIRE' && (
                      <div style={{ margin: '8px 0', padding: '14px 16px', borderRadius: '14px', background: 'linear-gradient(135deg, rgba(30,41,59,0.98) 0%, rgba(15,23,42,0.98) 100%)', border: '1px solid rgba(59,130,246,0.35)', maxWidth: '92%', display: 'flex', flexDirection: 'column', gap: '10px' }}>
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
                            <button key={sIdx} type="button" onClick={() => handleSuggestionClick(sug)}
                              style={{ padding: '9px 14px', borderRadius: '10px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: '#f8fafc', fontSize: '0.82rem', fontWeight: 600, cursor: 'pointer', textAlign: 'left', display: 'flex', alignItems: 'center', justifyContent: 'space-between', transition: 'all 0.15s' }}
                              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(59,130,246,0.15)'; e.currentTarget.style.borderColor = 'rgba(59,130,246,0.4)'; }}
                              onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'; }}>
                              <span>{sug}</span>
                              <CheckCircle2 size={13} color="#3b82f6" />
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* MINI-COACH INTERVIEW CARD */}
                    {activeContact.id === 'ai' && msg.structuredAction?.type === 'mini_coach_interview' && msg.structuredAction.steps && (
                      <div style={{ margin: '8px 0', padding: '14px 16px', borderRadius: '14px', background: 'linear-gradient(135deg, rgba(30,41,59,0.98) 0%, rgba(15,23,42,0.98) 100%)', border: '1px solid rgba(59,130,246,0.35)', maxWidth: '92%', display: 'flex', flexDirection: 'column', gap: '10px' }}>
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
                              <button key={oIdx} type="button" onClick={() => handleSuggestionClick(opt)}
                                style={{ padding: '7px 12px', borderRadius: '14px', background: 'rgba(59,130,246,0.15)', border: '1px solid rgba(59,130,246,0.35)', color: '#93c5fd', fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                {opt}
                              </button>
                            ))}
                          </div>
                        ) : (
                          <button type="button" onClick={() => { setIsOpen(false); navigate('/ai-trainer'); }}
                            style={{ padding: '8px 12px', borderRadius: '8px', background: '#3b82f6', border: 'none', color: '#fff', fontSize: '0.8rem', fontWeight: 700, cursor: 'pointer', alignSelf: 'flex-start' }}>
                            Open Questionnaire Wizard
                          </button>
                        )}
                      </div>
                    )}

                    {/* PROGRESS_CARD (Issue 9) */}
                    {activeContact.id === 'ai' && msg.structuredAction?.type === 'PROGRESS_CARD' && msg.structuredAction.stats && (
                      <div style={{ margin: '8px 0', padding: '14px 16px', borderRadius: '14px', background: 'linear-gradient(135deg, rgba(30,41,59,0.95) 0%, rgba(15,23,42,0.95) 100%)', border: '1px solid rgba(168,85,247,0.35)', maxWidth: '92%', display: 'flex', flexDirection: 'column', gap: '10px' }}>
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
                        <button type="button" onClick={() => { setIsOpen(false); navigate('/dashboard'); }}
                          style={{ padding: '8px 12px', borderRadius: '8px', background: 'linear-gradient(135deg, #a855f7, #7c3aed)', border: 'none', color: '#fff', fontSize: '0.8rem', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                          <ExternalLink size={13} /> Open Full Dashboard
                        </button>
                      </div>
                    )}

                    {/* DIET_CARD (Issue 8) */}
                    {activeContact.id === 'ai' && msg.structuredAction?.type === 'DIET_CARD' && (
                      <div style={{ margin: '8px 0', padding: '14px 16px', borderRadius: '14px', background: 'linear-gradient(135deg, rgba(30,41,59,0.95) 0%, rgba(15,23,42,0.95) 100%)', border: '1px solid rgba(16,185,129,0.35)', maxWidth: '92%', display: 'flex', flexDirection: 'column', gap: '10px' }}>
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
                        <button type="button" onClick={() => { setIsOpen(false); navigate('/ai-trainer'); }}
                          style={{ padding: '8px 12px', borderRadius: '8px', background: 'linear-gradient(135deg, #10b981, #059669)', border: 'none', color: '#fff', fontSize: '0.8rem', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                          <ExternalLink size={13} /> Open Nutrition Hub & Food Swapper
                        </button>
                      </div>
                    )}

                    {/* Clickable Suggestion Chips */}
                    {activeContact.id === 'ai' && msg.sender === 'other' && msg.suggestions && msg.suggestions.length > 0 && (
                      <div
                        className="ai-chat-suggestion-row"
                        style={{
                          display: 'flex',
                          flexWrap: 'wrap',
                          gap: '6px',
                          margin: '4px 0 8px 0',
                          maxWidth: '95%'
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
                            onClick={() => handleSuggestionClick(sug)}
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
                ))}
                {(!messages[activeContact.id] || messages[activeContact.id].length === 0) && (
                  <p style={{textAlign: 'center', color: 'var(--text-secondary)', marginTop: '20px'}}>Say hi to {activeContact.name}!</p>
                )}
                <div ref={messagesEndRef} />
              </>
            </div>

            <form className="chat-footer" onSubmit={handleSend}>
              <input ref={inputRef} type="text" placeholder="Type a message..." value={input} onChange={(e) => setInput(e.target.value)} />
              <button type="submit" className="send-btn"><Send size={18} /></button>
            </form>
          </>
        )}
      </div>
    </div>
  );
};

export default GlobalChat;
