import React, { useState, useRef, useEffect } from 'react';
import { MessageSquare, X, Send, Sparkles, Dumbbell, ShieldAlert, CheckCircle, ExternalLink, Utensils, HelpCircle, RefreshCw, Flame } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { toast } from 'react-toastify';
import { useNavigate } from 'react-router-dom';
import './AICoachWidget.css';

const QUICK_PROMPTS = [
  '🎖️ Army Training Tomorrow',
  '🏃 5K Race Tomorrow',
  '⚽ Football Practice',
  '🏏 Match Tomorrow',
  '⏱️ 20 Min Session',
  '🏋️ Dumbbells Only',
  '🩺 Knee Pain',
  '🥗 Custom Diet'
];

const getContextSuggestions = (missingContext) => {
  switch (missingContext) {
    case 'training_type':
      return ['Army Training', 'Football Match', 'Cricket Match', '5K Race', 'Gym Session'];
    case 'training_activities':
      return ['Running, push-ups, pull-ups and obstacle course', 'Just running & sprints', 'Calisthenics & marching'];
    case 'race_details':
      return ['5K race tomorrow', '10K this weekend', 'Half marathon next month'];
    case 'goal_priority':
      return ['Losing weight & burning belly fat', 'Building muscle & getting stronger', 'Boosting stamina & endurance', 'Overall health & energy'];
    default:
      return [];
  }
};

const AICoachWidget = ({ userContext: propUserContext }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: "Hi there! 👋 I'm your **GymSync AI Lead Coach & Sports Medicine Specialist**.\n\nI analyze your profile, sport, recovery, and medical safety to generate periodized workouts and deterministic macro diets. How can I help you today?"
    }
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef(null);
  const navigate = useNavigate();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [messages, isOpen]);

  const handleSend = async (customText = null) => {
    const textToSend = typeof customText === 'string' ? customText : input;
    if (!textToSend || !textToSend.trim()) return;

    const userMessage = textToSend.trim();
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    if (!customText) setInput('');
    setIsTyping(true);

    try {
      const userKey = (localStorage.getItem('gymsync_user_name') || 'Guest User').replace(/\s+/g, '_');
      const storedBio = JSON.parse(localStorage.getItem(`gymsync_${userKey}_bio_data`) || localStorage.getItem('gymsync_bio_data') || '{}');
      const storedPlan = JSON.parse(localStorage.getItem(`gymsync_${userKey}_ai_plan`) || 'null');
      const storedHistory = JSON.parse(localStorage.getItem(`gymsync_${userKey}_history`) || '[]');
      const storedProgress = JSON.parse(localStorage.getItem(`gymsync_${userKey}_workout_progress`) || '{}');

      const fullContext = {
        ...storedBio,
        ...(propUserContext || {}),
        name: localStorage.getItem('gymsync_user_name') || 'User'
      };

      const token = localStorage.getItem('gymsync_token') || localStorage.getItem('token') || '';

      const response = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          message: userMessage,
          userContext: fullContext,
          history: messages.slice(-8),
          currentPlan: storedPlan,
          recentWorkoutHistory: storedHistory.slice(-5),
          currentProgress: storedProgress
        })
      });

      const data = await response.json();
      
      const assistantMsg = {
        role: 'assistant',
        content: data.content,
        structuredAction: data.structuredAction
      };

      setMessages(prev => [...prev, assistantMsg]);

      // If a structured workout was produced, store active session
      if (data.structuredAction?.workout) {
        localStorage.setItem(`gymsync_${userKey}_active_session`, JSON.stringify(data.structuredAction.workout));
      }
    } catch (error) {
      console.error('AI Coach Widget Error:', error);
      setMessages(prev => [
        ...prev,
        { role: 'assistant', content: "Sorry, I'm having trouble connecting to the coach service right now. Please try again in a moment." }
      ]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleApplyWorkout = (workout) => {
    if (!workout) return;
    const userKey = (localStorage.getItem('gymsync_user_name') || 'Guest User').replace(/\s+/g, '_');
    
    // Save to active plan slot
    const existingPlan = JSON.parse(localStorage.getItem(`gymsync_${userKey}_ai_plan`) || '{}');
    const updatedPlan = {
      ...existingPlan,
      planId: `PLAN_${Date.now()}`,
      planDuration: 'Custom Session',
      interactive_calendar: [
        {
          dayNumber: 1,
          weekNumber: 1,
          phaseName: workout.sessionObjective,
          isWorkoutDay: true,
          focusArea: workout.sessionObjective,
          sessionObjective: workout.sessionObjective,
          warmup: workout.warmup,
          workoutSplit: workout.mainWorkout,
          cooldown: workout.cooldown,
          timeBudget: workout.timeBudget,
          rationale: workout.rationale,
          externalActivity: workout.externalActivity
        }
      ]
    };

    localStorage.setItem(`gymsync_${userKey}_ai_plan`, JSON.stringify(updatedPlan));
    toast.success('Workout applied to AI Trainer!');
    setIsOpen(false);
    navigate('/ai-trainer');
  };

  const handleSaveDiet = (diet) => {
    if (!diet) return;
    const userKey = (localStorage.getItem('gymsync_user_name') || 'Guest User').replace(/\s+/g, '_');
    localStorage.setItem(`gymsync_${userKey}_diet_plan`, JSON.stringify(diet));
    toast.success('Diet target saved to active profile!');
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
        <button className="ai-fab" onClick={() => setIsOpen(true)} title="Chat with AI Lead Coach">
          <Sparkles size={24} />
        </button>
      ) : (
        <div className="ai-chat-window" style={{ width: '380px', height: '540px' }}>
          <div className="ai-chat-header">
            <div className="ai-chat-header-info">
              <div className="ai-avatar">
                <Sparkles size={18} />
              </div>
              <div>
                <h3>GymSync AI Coach</h3>
                <p>Sports Science & Medicine</p>
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
                  <>
                    <ReactMarkdown>{msg.content}</ReactMarkdown>
                    
                    {/* Single-Question Clarification Chips */}
                    {msg.structuredAction?.missingContext && (
                      <div style={{ marginTop: '10px', display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                        {getContextSuggestions(msg.structuredAction.missingContext).map((suggestion, si) => (
                          <button
                            key={si}
                            type="button"
                            onClick={() => handleSend(suggestion)}
                            style={{
                              background: 'rgba(59, 130, 246, 0.15)',
                              border: '1px solid #3b82f6',
                              color: '#93c5fd',
                              borderRadius: '8px',
                              padding: '4px 8px',
                              fontSize: '0.72rem',
                              cursor: 'pointer',
                              fontWeight: 500
                            }}
                          >
                            {suggestion}
                          </button>
                        ))}
                      </div>
                    )}

                    {/* Structured Workout Action Card */}
                    {msg.structuredAction?.workout && (
                      <div className="ai-action-card">
                        <div className="ai-card-header">
                          <div className="ai-card-title">
                            <Dumbbell size={15} color="#3b82f6" />
                            <span>{msg.structuredAction.workout.sessionObjective || 'Target Workout'}</span>
                          </div>
                          <span className="ai-card-badge">
                            {msg.structuredAction.workout.timeBudget || 45}m {msg.structuredAction.workout.estimatedTotalCalories ? `• ~${msg.structuredAction.workout.estimatedTotalCalories} kcal` : ''}
                          </span>
                        </div>

                        {/* Exercises Pill List */}
                        <div className="ai-card-exercises">
                          {(msg.structuredAction.workout.mainWorkout || []).slice(0, 4).map((ex, ei) => (
                            <div key={ei} className="ai-card-exercise-item">
                              <span className="ai-card-exercise-name">{ex.name}</span>
                              <span className="ai-card-exercise-meta">
                                {ex.sets || 3} sets × {ex.reps || 10} {ex.estimatedCalories ? `(${ex.estimatedCalories} kcal)` : ''}
                              </span>
                            </div>
                          ))}
                        </div>

                        {/* Action Buttons */}
                        <div className="ai-action-buttons">
                          <button 
                            type="button" 
                            className="ai-btn-action primary"
                            onClick={() => handleApplyWorkout(msg.structuredAction.workout)}
                          >
                            <Dumbbell size={13} /> Apply Workout
                          </button>
                          <button 
                            type="button" 
                            className="ai-btn-action secondary"
                            onClick={() => handleSend("Why did you prescribe this specific plan for me?")}
                          >
                            <HelpCircle size={13} /> Why this plan?
                          </button>
                          <button 
                            type="button" 
                            className="ai-btn-action secondary"
                            onClick={() => handleSend("Can you adapt or suggest an alternative variation of this workout?")}
                          >
                            <RefreshCw size={13} /> Change Plan
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Structured Diet Action Card */}
                    {msg.structuredAction?.diet && (
                      <div className="ai-action-card diet-card">
                        <div className="ai-card-header">
                          <div className="ai-card-title">
                            <Utensils size={15} color="#10b981" />
                            <span>Prescribed Daily Nutrition</span>
                          </div>
                          <span className="ai-card-badge green">
                            {msg.structuredAction.diet.targetCalories} kcal
                          </span>
                        </div>

                        <div className="ai-card-macros">
                          <div className="ai-macro-pill">
                            <span>Protein</span>
                            <strong>{msg.structuredAction.diet.macronutrients?.proteinGrams || 120}g</strong>
                          </div>
                          <div className="ai-macro-pill">
                            <span>Carbs</span>
                            <strong>{msg.structuredAction.diet.macronutrients?.carbsGrams || 180}g</strong>
                          </div>
                          <div className="ai-macro-pill">
                            <span>Fats</span>
                            <strong>{msg.structuredAction.diet.macronutrients?.fatsGrams || 50}g</strong>
                          </div>
                        </div>

                        <div className="ai-action-buttons">
                          <button 
                            type="button" 
                            className="ai-btn-action primary"
                            onClick={() => handleSaveDiet(msg.structuredAction.diet)}
                          >
                            <Utensils size={13} /> Save Diet Plan
                          </button>
                          <button 
                            type="button" 
                            className="ai-btn-action secondary"
                            onClick={() => handleSend("Can we adjust these calorie and macro targets?")}
                          >
                            <RefreshCw size={13} /> Adjust Targets
                          </button>
                        </div>
                      </div>
                    )}
                  </>
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

          {/* Quick Prompt Pills */}
          <div style={{ display: 'flex', gap: '6px', overflowX: 'auto', padding: '6px 12px', background: 'rgba(0,0,0,0.15)', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
            {QUICK_PROMPTS.map((qp, i) => (
              <button
                key={i}
                type="button"
                onClick={() => handleSend(qp)}
                style={{
                  background: 'rgba(255,255,255,0.06)',
                  border: '1px solid rgba(255,255,255,0.12)',
                  color: 'var(--text-secondary, #cbd5e1)',
                  borderRadius: '12px',
                  padding: '3px 8px',
                  fontSize: '0.72rem',
                  whiteSpace: 'nowrap',
                  cursor: 'pointer'
                }}
              >
                {qp}
              </button>
            ))}
          </div>

          <div className="ai-chat-input-area">
            <input 
              type="text" 
              className="ai-chat-input" 
              placeholder="Ask coach, modify workout, or diet..." 
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyPress}
              disabled={isTyping}
            />
            <button 
              className="ai-send-btn" 
              onClick={() => handleSend()}
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
