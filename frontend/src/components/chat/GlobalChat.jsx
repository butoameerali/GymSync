import React, { useState, useEffect, useRef } from 'react';
import { MessageCircle, X, Send, Lock } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import './GlobalChat.css';

const CONTACTS = [
  { id: 'ai', name: 'AI Trainer', role: 'Personal Coach', avatar: '🤖', isPremium: false },
  { id: 'gym', name: 'Iron Core Support', role: 'Gym Owner', avatar: '🏢', isPremium: false }
];

const GlobalChat = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [activeContact, setActiveContact] = useState(null);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState({});
  const [dynamicFriends, setDynamicFriends] = useState([]);
  const messagesEndRef = useRef(null);

  const userRole = localStorage.getItem('gymsync_role') || 'guest';
  const isGuest = userRole === 'guest';
  const userName = localStorage.getItem('gymsync_user_name') || 'Guest';
  const userKey = userName.replace(/\s+/g, '_');

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, activeContact]);

  // Fetch real friends from MongoDB
  useEffect(() => {
    if (!isGuest) {
      fetch(`/api/users/${userName}`)
        .then(res => res.json())
        .then(async (user) => {
          if (user && user.friends) {
            // Fetch profile pictures for friends
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

  if (isGuest) return null; // Hide completely for guests

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
    // Only fetch for real friends, not AI/Support
    if (contact.role === 'Friend') {
      fetchConversation(contact.id);
    } else {
      // Mock intro for AI/Support
      if(!messages[contact.id] || messages[contact.id].length === 0) {
        setMessages(prev => ({
          ...prev,
          [contact.id]: [{ id: 1, text: `Hello! I'm ${contact.name}. How can I help you today?`, sender: 'other' }]
        }));
      }
    }
  };

  const handleSend = async (e) => {
    e.preventDefault();
    if (!input.trim() || !activeContact) return;

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

    // Send to MongoDB if it's a real friend
    if (activeContact.role === 'Friend') {
      try {
        await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sender: userName, receiver: activeContact.id, text: messageText })
        });
      } catch (err) { console.error(err); }
    } 
    // Send to Ollama Backend if it's the AI Trainer
    else if (activeContact.id === 'ai') {
      const userContext = {
        primaryGoal: localStorage.getItem('gymsync_onboarding_primaryGoal') || 'General Fitness',
        gender: localStorage.getItem('gymsync_onboarding_gender') || 'Unspecified',
        fitnessLevel: localStorage.getItem('gymsync_onboarding_fitnessLevel') || 'Beginner'
      };

      try {
        const response = await fetch('/api/ai/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message: messageText, userContext })
        });
        const data = await response.json();
        
        const reply = {
          id: Date.now() + 1,
          text: data.content,
          sender: 'other',
          timestamp: new Date().toISOString()
        };
        setMessages(prev => ({
          ...prev,
          [activeContact.id]: [...prev[activeContact.id], reply]
        }));
      } catch (err) {
        const errReply = {
          id: Date.now() + 1,
          text: "⚠️ Connection Error: Failed to connect to your local Ollama instance.",
          sender: 'other',
          timestamp: new Date().toISOString()
        };
        setMessages(prev => ({
          ...prev,
          [activeContact.id]: [...prev[activeContact.id], errReply]
        }));
      }
    } 
    // Mock reply for Gym Support
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
          [activeContact.id]: [...prev[activeContact.id], reply]
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
                  <h4 style={{ margin: '0 0 4px 0' }}>{contact.name}</h4>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{contact.role}</span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <>
            <div className="chat-body" style={{ overflowY: 'auto', flex: 1 }}>
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
