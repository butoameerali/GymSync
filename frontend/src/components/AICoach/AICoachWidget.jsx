import React, { useState, useRef, useEffect } from 'react';
import { MessageSquare, X, Send, Sparkles } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import './AICoachWidget.css';

const AICoachWidget = ({ userContext }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    { role: 'assistant', content: "Hi there! I'm your GymSync AI Coach. I can create custom diet plans, workout schedules, or answer fitness questions based on your profile. What do you need help with?" }
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [messages, isOpen]);

  const handleSend = async () => {
    if (!input.trim()) return;

    const userMessage = input.trim();
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setInput('');
    setIsTyping(true);

    try {
      const response = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          message: userMessage,
          userContext: userContext // Pass the onboarding data
        })
      });

      const data = await response.json();
      
      setMessages(prev => [...prev, { role: 'assistant', content: data.content }]);
    } catch (error) {
      setMessages(prev => [...prev, { role: 'assistant', content: "Sorry, I'm having trouble connecting to the server right now." }]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="ai-coach-widget-container">
      {!isOpen ? (
        <button className="ai-fab" onClick={() => setIsOpen(true)}>
          <Sparkles size={24} />
        </button>
      ) : (
        <div className="ai-chat-window">
          <div className="ai-chat-header">
            <div className="ai-chat-header-info">
              <div className="ai-avatar">
                <Sparkles size={18} />
              </div>
              <div>
                <h3>GymSync AI</h3>
                <p>Personal Coach</p>
              </div>
            </div>
            <button className="ai-close-btn" onClick={() => setIsOpen(false)}>
              <X size={20} />
            </button>
          </div>

          <div className="ai-chat-messages">
            {messages.map((msg, idx) => (
              <div key={idx} className={`ai-message ${msg.role}`}>
                {msg.role === 'assistant' ? (
                  <ReactMarkdown>{msg.content}</ReactMarkdown>
                ) : (
                  <p>{msg.content}</p>
                )}
              </div>
            ))}
            
            {isTyping && (
              <div className="ai-typing-indicator">
                <div className="ai-dot"></div>
                <div className="ai-dot"></div>
                <div className="ai-dot"></div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          <div className="ai-chat-input-area">
            <input 
              type="text" 
              className="ai-chat-input" 
              placeholder="Ask for a diet plan or workout..." 
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyPress}
              disabled={isTyping}
            />
            <button 
              className="ai-send-btn" 
              onClick={handleSend}
              disabled={!input.trim() || isTyping}
            >
              <Send size={18} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default AICoachWidget;
