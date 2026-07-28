import React, { useState, useEffect, useRef } from 'react';
import { MessageCircle, X, Send, Lock, Award } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { toast } from 'react-toastify';
import PaymentModal from '../common/PaymentModal';
import './GlobalChat.css';

const CONTACTS = [
  { id: 'ai', name: 'AI Trainer', role: 'Personal Coach', avatar: '🤖', isPremium: true },
  { id: 'gym', name: 'Iron Core Support', role: 'Gym Owner', avatar: '🏢', isPremium: false }
];

const GlobalChat = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [activeContact, setActiveContact] = useState(null);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState({});
  const [dynamicFriends, setDynamicFriends] = useState([]);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const messagesEndRef = useRef(null);

  const userRole = localStorage.getItem('gymsync_role') || 'guest';
  const isGuest = userRole === 'guest';
  const userName = localStorage.getItem('gymsync_user_name') || 'Guest';

  useEffect(() => {
    const startingSubscribed = localStorage.getItem('gymsync_subscribed') === 'true' || userRole === 'Admin' || userRole === 'SuperAdmin' || userRole === 'GymOwner' || userRole === 'StoreManager';
    setIsSubscribed(startingSubscribed);
  }, [userRole]);
  const proPrice = localStorage.getItem('gymsync_pro_plan_price') || '9.99';

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, activeContact]);

  useEffect(() => {
    if (!isGuest) {
      fetch(`/api/users/${userName}`)
        .then(res => res.json())
        .then(async (user) => {
          if (user && user.friends) {
            const friendsWithPics = await Promise.all(user.friends.map(async (friendName) => {
              const friendRes = await fetch(`/api/users/${friendName}`);
              const friendData = await friendRes.json();
              return {
                id: friendName,
                name: friendName,
                role: 'Friend',
                avatar: friendData.profilePic || friendName.charAt(0).toUpperCase(),
                isPremium: false,
                isImage: !!friendData.profilePic
              };
            }));
            setDynamicFriends(friendsWithPics);
          }
        })
        .catch(err => console.error(err));
    }
  }, [isOpen, isGuest, userName]);

  if (isGuest) return null;

  const fetchConversation = async (contactId) => {
    try {
      const res = await fetch(`/api/chat/${userName}/${contactId}`);
      const data = await res.json();
      
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
    } catch (err) { console.error(err); }
  };

  const handleContactClick = (contact) => {
    setActiveContact(contact);
    if (!messages[contact.id]) {
      setMessages(prev => ({ ...prev, [contact.id]: [] }));
    }
    if (contact.role === 'Friend') {
      fetchConversation(contact.id);
    } else if (contact.id === 'ai' && isSubscribed) {
      if(!messages[contact.id] || messages[contact.id].length === 0) {
        setMessages(prev => ({
          ...prev,
          [contact.id]: [{ id: 1, text: `Hello! I'm your AI Fitness Coach. How can I help you today?`, sender: 'other' }]
        }));
      }
    }
  };

  const handleSend = async (e) => {
    e.preventDefault();
    if (!input.trim() || !activeContact) return;

    if (activeContact.id === 'ai' && !isSubscribed) {
      toast.warn(`AI Chat is locked. Please subscribe to Pro Plan ($${proPrice}/mo) to access AI Fitness Coach.`);
      return;
    }

    const messageText = input;
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

    if (activeContact.role === 'Friend') {
      try {
        await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sender: userName, receiver: activeContact.id, text: messageText })
        });
      } catch (err) { console.error(err); }
    } 
    else if (activeContact.id === 'ai') {
      const userContext = {
        primaryGoal: localStorage.getItem('gymsync_onboarding_primaryGoal') || 'General Fitness',
        gender: localStorage.getItem('gymsync_onboarding_gender') || 'Unspecified',
        fitnessLevel: localStorage.getItem('gymsync_onboarding_fitnessLevel') || 'Beginner'
      };

      try {
        const currentHistory = messages[activeContact.id] || [];
        const historyToSend = currentHistory.slice(-8);

        const response = await fetch('/api/ai/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message: messageText, userContext, history: historyToSend })
        });
        const data = await response.json();
        let replyText = data.content;
        
        const planMatch = replyText.match(/<PLAN>(.*?)<\/PLAN>/i);
        if (planMatch) {
          const exercisesString = planMatch[1];
          const exercisesArray = exercisesString.split(',').map(e => e.trim());
          localStorage.setItem('gymsync_ai_plan', JSON.stringify(exercisesArray));
          
          replyText = replyText.replace(planMatch[0], "\n\n🏋️‍♂️ **Workout Plan Generated!**\nYour new plan has been loaded into the AI Trainer. [Click here to open AI Trainer](/ai-trainer)");
          toast.success("New AI Workout Plan Generated!");
        }

        const botMsg = {
          id: Date.now() + 1,
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
    else {
      setTimeout(() => {
        const reply = {
          id: Date.now() + 1,
          text: `Automated reply from ${activeContact.name}`,
          sender: 'other',
          timestamp: new Date().toISOString()
        };
        setMessages(prev => ({
          ...prev,
          [activeContact.id]: [...(prev[activeContact.id] || []), reply]
        }));
      }, 1000);
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
            <>
              <button className="back-btn" onClick={() => setActiveContact(null)} style={{background:'none', border:'none', color:'white', cursor:'pointer'}}>←</button>
              <h3 style={{margin: '0 10px'}}>{activeContact.name}</h3>
            </>
          ) : (
            <h3>Messages</h3>
          )}
          <button className="close-btn" onClick={() => { setIsOpen(false); setActiveContact(null); }}><X size={20} /></button>
        </div>

        {!activeContact ? (
          <div className="contact-list" style={{flex: 1, overflowY: 'auto'}}>
            {[...CONTACTS, ...dynamicFriends].map(contact => (
              <div 
                key={contact.id} 
                onClick={() => handleContactClick(contact)}
                style={{ display: 'flex', alignItems: 'center', gap: '15px', padding: '15px', borderBottom: '1px solid rgba(255,255,255,0.05)', cursor: 'pointer', transition: 'background 0.2s' }}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
              >
                <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'var(--primary-accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem', overflow: 'hidden' }}>
                  {contact.isImage ? <img src={contact.avatar} alt={contact.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : contact.avatar}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <h4 style={{ margin: 0 }}>{contact.name}</h4>
                    {contact.id === 'ai' && !isSubscribed && <Lock size={14} color="#ef4444" />}
                  </div>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                    {contact.id === 'ai' && !isSubscribed ? 'Locked (Pro Plan)' : contact.role}
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <>
            <div className="chat-body" style={{ overflowY: 'auto', flex: 1 }}>
              {activeContact.id === 'ai' && !isSubscribed ? (
                <div style={{ padding: '24px 16px', textAlign: 'center' }}>
                  <div style={{ width: '60px', height: '60px', borderRadius: '50%', background: 'rgba(239, 68, 68, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px auto' }}>
                    <Lock size={30} color="#ef4444" />
                  </div>
                  <h4 style={{ margin: '0 0 8px 0', fontSize: '1.1rem', color: '#fff' }}>AI Trainer Locked</h4>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', lineHeight: 1.5, marginBottom: '20px' }}>
                    AI Fitness Coaching and instant rep counting are exclusively available for <strong>GymSync Pro Subscribers</strong>.
                  </p>
                  <button 
                    className="btn btn-primary w-100"
                    style={{ background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', border: 'none', padding: '12px', borderRadius: '10px', fontWeight: 'bold' }}
                    onClick={() => setIsPaymentModalOpen(true)}
                  >
                    Subscribe to Pro Plan (${proPrice}/mo)
                  </button>
                </div>
              ) : (
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
              )}
            </div>

            {!(activeContact.id === 'ai' && !isSubscribed) && (
              <form className="chat-footer" onSubmit={handleSend}>
                <input type="text" placeholder="Type a message..." value={input} onChange={(e) => setInput(e.target.value)} />
                <button type="submit" className="send-btn"><Send size={18} /></button>
              </form>
            )}
      <PaymentModal
        isOpen={isPaymentModalOpen}
        onClose={() => setIsPaymentModalOpen(false)}
        amount={proPrice}
        title="Subscribe to GymSync Pro"
        paymentType="PlatformSubscription"
        onPaymentSuccess={() => {
          localStorage.setItem('gymsync_subscribed', 'true');
          toast.success(`Subscription activated for Pro Plan ($${proPrice}/mo)! AI Chat is now unlocked.`);
          window.location.reload();
        }}
      />
          </>
        )}
      </div>
    </div>
  );
};

export default GlobalChat;
