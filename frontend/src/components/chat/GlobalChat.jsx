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
  const [gymTrainerContacts, setGymTrainerContacts] = useState([]);
  const [spamContacts, setSpamContacts] = useState([]);
  const [showSpam, setShowSpam] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(true);
  const messagesEndRef = useRef(null);

  const userRole = localStorage.getItem('gymsync_role') || 'guest';
  const isGuest = userRole === 'guest';
  const userName = localStorage.getItem('gymsync_user_name') || 'Guest';

  useEffect(() => {
    localStorage.setItem('gymsync_subscribed', 'true');
    setIsSubscribed(true);
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
      const token = localStorage.getItem('gymsync_token') || '';
      const authHeader = token ? { 'Authorization': `Bearer ${token}` } : {};

      fetch(`/api/users/${encodeURIComponent(userName)}`, { headers: authHeader })
        .then(res => res.ok ? res.json() : null)
        .then(async (user) => {
          if (user && user.friends) {
            const friendsWithPics = await Promise.all(user.friends.map(async (friendName) => {
              const friendRes = await fetch(`/api/users/${encodeURIComponent(friendName)}`, { headers: authHeader });
              const friendData = friendRes.ok ? await friendRes.json() : {};
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

            // Trainers of the member's subscribed gym are trusted contacts,
            // not message requests. They are available even before either
            // person has sent the first message.
            let trustedTrainerNames = [];
            if (user.subscribedGymName) {
              const usersRes = await fetch('/api/users', { headers: authHeader });
              const allUsersRaw = usersRes.ok ? await usersRes.json() : [];
              const allUsers = Array.isArray(allUsersRaw) ? allUsersRaw : [];
              const trainers = allUsers
                .filter(person => person && person.role === 'GymTrainer' && person.assignedGymName === user.subscribedGymName)
                .map(person => ({
                  id: person.name,
                  name: person.name,
                  role: `Gym Trainer · ${user.subscribedGymName}`,
                  avatar: person.profilePic || person.name.charAt(0).toUpperCase(),
                  isPremium: false,
                  isImage: Boolean(person.profilePic),
                  isTrainer: true
                }));
              trustedTrainerNames = trainers.map(trainer => trainer.id);
              setGymTrainerContacts(trainers);
            } else {
              setGymTrainerContacts([]);
            }
            
            // Fetch all conversations to determine spam with Bearer token
            const convRes = await fetch(`/api/chat/conversations/${encodeURIComponent(userName)}`, {
              headers: authHeader
            });
            const convRaw = convRes.ok ? await convRes.json() : [];
            const convContacts = Array.isArray(convRaw) ? convRaw : [];
            
            // Filter out friends and AI/Gym support
            const userFriends = Array.isArray(user?.friends) ? user.friends : [];
            const spamNames = convContacts.filter(c => c && !userFriends.includes(c) && !trustedTrainerNames.includes(c) && c !== 'ai' && c !== 'gym' && c !== userName);
            const spamWithPics = await Promise.all(spamNames.map(async (spamName) => {
              const spamRes = await fetch(`/api/users/${encodeURIComponent(spamName)}`, { headers: authHeader });
              const spamData = spamRes.ok ? await spamRes.json() : {};
              return {
                id: spamName,
                name: spamName,
                role: 'Message Request',
                avatar: spamData.profilePic || spamName.charAt(0).toUpperCase(),
                isPremium: false,
                isImage: Boolean(spamData.profilePic),
                isSpam: true
              };
            }));
            setSpamContacts(spamWithPics);
          }
        })
        .catch(err => console.error("GlobalChat fetch error:", err));
    }

    const handleOpenChat = (e) => {
      setIsOpen(true);
      const contactName = e.detail.userName;
      const existingContact = dynamicFriends.find(c => c.id === contactName) || spamContacts.find(c => c.id === contactName) || CONTACTS.find(c => c.id === contactName);
      if (existingContact) {
        handleContactClick(existingContact);
      } else {
        // Create temporary contact for new chats
        const newContact = {
          id: contactName,
          name: contactName,
          role: 'User',
          avatar: contactName.charAt(0).toUpperCase(),
          isPremium: false,
          isImage: false
        };
        handleContactClick(newContact);
      }
    };
    window.addEventListener('open_chat', handleOpenChat);
    return () => window.removeEventListener('open_chat', handleOpenChat);
  }, [isGuest, userName, dynamicFriends, spamContacts]);

  if (isGuest) return null;

  const fetchConversation = async (contactId) => {
    try {
      const token = localStorage.getItem('gymsync_token') || '';
      const res = await fetch(`/api/chat/${userName}/${contactId}`, {
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
    } catch (err) { console.error(err); }
  };

  const handleContactClick = (contact) => {
    setActiveContact(contact);
    if (!messages[contact.id]) {
      setMessages(prev => ({ ...prev, [contact.id]: [] }));
    }
    if (contact.id !== 'ai' && contact.id !== 'gym') {
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

    if (activeContact.role === 'Friend' || activeContact.isTrainer || activeContact.role?.includes('Gym Trainer') || activeContact.role?.includes('Spam')) {
      try {
        const token = localStorage.getItem('gymsync_token') || '';
        await fetch('/api/chat', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
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
            
            {/* SPAM FOLDER (MESSAGE REQUESTS) */}
            {spamContacts.length > 0 && (
              <div style={{ marginBottom: '10px' }}>
                <div 
                  onClick={() => setShowSpam(!showSpam)}
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 15px', background: 'rgba(239, 68, 68, 0.1)', borderBottom: '1px solid rgba(239, 68, 68, 0.2)', cursor: 'pointer', color: '#ef4444', fontWeight: 'bold' }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <MessageCircle size={18} /> Message Requests (Spam)
                  </div>
                  <span>{showSpam ? '▼' : '▶'}</span>
                </div>
                
                {showSpam && spamContacts.map(contact => (
                  <div 
                    key={contact.id} 
                    onClick={() => handleContactClick(contact)}
                    style={{ display: 'flex', alignItems: 'center', gap: '15px', padding: '15px', borderBottom: '1px solid rgba(255,255,255,0.05)', cursor: 'pointer', transition: 'background 0.2s', opacity: 0.8 }}
                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                  >
                    <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: '#ef4444', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem', overflow: 'hidden' }}>
                      {contact.isImage ? <img src={contact.avatar} alt={contact.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : contact.avatar}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <h4 style={{ margin: 0, color: '#ef4444' }}>{contact.name}</h4>
                      </div>
                      <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                        {contact.role}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {[...CONTACTS, ...gymTrainerContacts, ...dynamicFriends].map(contact => (
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
                  </div>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                    {contact.role}
                  </span>
                </div>
              </div>
            ))}
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
