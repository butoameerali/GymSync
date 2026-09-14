import React, { useState, useRef, useEffect } from 'react';
import { MessageSquare, X, Send, Sparkles, Dumbbell, ShieldAlert, CheckCircle, ExternalLink, Utensils, HelpCircle, RefreshCw, Flame } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { toast } from 'react-toastify';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import './AICoachWidget.css';

const QUICK_PROMPTS = [
  '🏋️ Build Workout Plan',
  '🥗 Custom Diet',
  '⏱️ 20 Min Session',
  '🏋️ Dumbbells Only',
  '🩺 Knee Pain',
  '🏏 Match Tomorrow',
  '🏃 5K Race Tomorrow',
  '🎖️ Army Training Tomorrow'
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
  const { user, token: authToken, userName: authUserName } = useAuth();
  const currentUserName = authUserName || user?.name || localStorage.getItem('gymsync_user_name') || 'Guest User';
  const userKey = currentUserName.replace(/\s+/g, '_');

  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: "Hi there! 👋 I'm your **GymSync AI Lead Coach & Sports Medicine Specialist**.\n\nI analyze your profile, sport, recovery, and medical safety to generate periodized workouts and deterministic macro diets. How can I help you today?",
      suggestions: ['🏋️ Build Workout Plan', '🥗 Custom Diet Plan', '⚡ Quick 20-Min Workout', '🩺 Injury / Recovery Help']
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

  useEffect(() => {
    const handleOpenCommand = (e) => {
      setIsOpen(true);
      if (e.detail?.command) {
        setTimeout(() => handleSend(e.detail.command), 100);
      }
    };
    window.addEventListener('gymsync_open_coach_command', handleOpenCommand);
    return () => window.removeEventListener('gymsync_open_coach_command', handleOpenCommand);
  }, []);

  const handleSend = async (customText = null) => {
    const textToSend = typeof customText === 'string' ? customText : input;
    if (!textToSend || !textToSend.trim()) return;

    const userMessage = textToSend.trim();
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    if (!customText) setInput('');
    setIsTyping(true);

    try {
      const storedBio = JSON.parse(localStorage.getItem(`gymsync_${userKey}_bio_data`) || localStorage.getItem('gymsync_bio_data') || '{}');
      const storedPlan = JSON.parse(localStorage.getItem(`gymsync_${userKey}_ai_plan`) || 'null');
      const storedHistory = JSON.parse(localStorage.getItem(`gymsync_${userKey}_history`) || '[]');
      const storedProgress = JSON.parse(localStorage.getItem(`gymsync_${userKey}_workout_progress`) || '{}');

      const fullContext = {
        ...storedBio,
        ...(propUserContext || {}),
        name: currentUserName
      };

      const token = authToken || localStorage.getItem('gymsync_token') || localStorage.getItem('token') || '';

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
        suggestions: data.suggestions || data.structuredAction?.suggestions || [],
        structuredAction: data.structuredAction
      };

      setMessages(prev => [...prev, assistantMsg]);

      if (data.structuredAction?.type === 'navigate') {
        const payload = data.structuredAction.payload;
        setIsOpen(false);
        const tab = payload.query?.tab || payload.params?.tab;
        if (tab) {
          navigate(payload.route + '?tab=' + tab);
        } else {
          navigate(payload.route);
        }
      } else if (data.structuredAction?.type === 'start_exercise') {
        setIsOpen(false);
        navigate('/ai-trainer?exercise=' + encodeURIComponent(data.structuredAction.payload.exerciseName));
      } else if (data.structuredAction?.type === 'PLAN_UPDATED' || data.structuredAction?.type === 'PLAN_GENERATED') {
        const updatedPlan = data.structuredAction.plan;
        if (updatedPlan) {
          const activated = {
            ...(updatedPlan.workout || updatedPlan),
            interactive_calendar: updatedPlan.interactive_calendar || (updatedPlan.calendar && updatedPlan.calendar.length > 0 ? updatedPlan.calendar : (updatedPlan.workout?.interactive_calendar || [])),
            planId: updatedPlan._id || updatedPlan.planId || `PLAN_${Date.now()}`,
            title: updatedPlan.title,
            goal: updatedPlan.goal,
            planDuration: updatedPlan.planDuration,
            trainingDaysPerWeek: updatedPlan.trainingDaysPerWeek,
            equipmentAccess: updatedPlan.equipmentAccess,
            planStartDate: updatedPlan.createdAt || new Date().toISOString()
          };
          localStorage.setItem(`gymsync_${userKey}_ai_plan`, JSON.stringify(activated));
          window.dispatchEvent(new CustomEvent('gymsync_plan_updated', { detail: { plan: activated } }));
          toast.success(`Plan updated: ${updatedPlan.title}`);
        }
      }

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

  const handleApplyPlan = (plan) => {
    if (!plan) return;
    const activated = {
      ...(plan.workout || plan),
      interactive_calendar: plan.interactive_calendar || (plan.calendar && plan.calendar.length > 0 ? plan.calendar : (plan.workout?.interactive_calendar || [])),
      planId: plan._id || plan.planId || `PLAN_${Date.now()}`,
      title: plan.title,
      goal: plan.goal,
      planDuration: plan.planDuration,
      trainingDaysPerWeek: plan.trainingDaysPerWeek,
      equipmentAccess: plan.equipmentAccess,
      planStartDate: plan.createdAt || new Date().toISOString()
    };
    localStorage.setItem(`gymsync_${userKey}_ai_plan`, JSON.stringify(activated));
    window.dispatchEvent(new CustomEvent('gymsync_plan_updated', { detail: { plan: activated } }));
    toast.success(`Active plan loaded: ${plan.title || 'Workout Plan'}`);
    setIsOpen(false);
    navigate('/ai-trainer');
  };

  const handleApplyWorkout = (workout) => {
    if (!workout) return;
    
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
                    
                    {/* Interactive Suggestion Chips */}
                    {((msg.suggestions && msg.suggestions.length > 0) || (msg.structuredAction?.suggestions && msg.structuredAction.suggestions.length > 0) || msg.structuredAction?.missingContext) && (
                      <div className="ai-suggestion-chips-wrap" style={{ marginTop: '10px', display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                        {(
                          msg.suggestions ||
                          msg.structuredAction?.suggestions ||
                          getContextSuggestions(msg.structuredAction?.missingContext)
                        ).map((suggestion, si) => (
                          <button
                            key={si}
                            type="button"
                            onClick={() => handleSend(suggestion)}
                            style={{
                              background: 'rgba(59, 130, 246, 0.16)',
                              border: '1px solid rgba(59, 130, 246, 0.45)',
                              color: '#93c5fd',
                              borderRadius: '20px',
                              padding: '5px 12px',
                              fontSize: '0.76rem',
                              cursor: 'pointer',
                              fontWeight: 500,
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              transition: 'all 0.15s ease'
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.background = 'rgba(59, 130, 246, 0.32)';
                              e.currentTarget.style.borderColor = '#60a5fa';
                              e.currentTarget.style.transform = 'translateY(-1px)';
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.background = 'rgba(59, 130, 246, 0.16)';
                              e.currentTarget.style.borderColor = 'rgba(59, 130, 246, 0.45)';
                              e.currentTarget.style.transform = 'translateY(0)';
                            }}
                          >
                            {suggestion}
                          </button>
                        ))}
                      </div>
                    )}

                    {/* Structured Periodized Plan Action Card */}
                    {msg.structuredAction?.plan && (
                      <div className="ai-action-card plan-action-card" style={{
                        marginTop: '12px',
                        padding: '12px',
                        borderRadius: '12px',
                        background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.14), rgba(168, 85, 247, 0.14))',
                        border: '1px solid rgba(139, 92, 246, 0.4)'
                      }}>
                        <div className="ai-card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                          <div className="ai-card-title" style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#c084fc', fontWeight: 600 }}>
                            <Sparkles size={16} color="#a855f7" />
                            <span>{msg.structuredAction.plan.title || `${msg.structuredAction.plan.planDuration} Plan`}</span>
                          </div>
                          <span className="ai-card-badge" style={{
                            background: 'rgba(168, 85, 247, 0.25)',
                            color: '#e9d5ff',
                            padding: '3px 8px',
                            borderRadius: '12px',
                            fontSize: '0.72rem',
                            fontWeight: 600
                          }}>
                            {msg.structuredAction.plan.planDuration}
                          </span>
                        </div>

                        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', fontSize: '0.74rem', color: '#cbd5e1', marginBottom: '10px' }}>
                          <span style={{ background: 'rgba(255,255,255,0.06)', padding: '2px 8px', borderRadius: '6px' }}>🎯 <strong>Goal:</strong> {msg.structuredAction.plan.goal}</span>
                          <span style={{ background: 'rgba(255,255,255,0.06)', padding: '2px 8px', borderRadius: '6px' }}>📅 <strong>Schedule:</strong> {msg.structuredAction.plan.trainingDaysPerWeek || 3} Days/Wk</span>
                          <span style={{ background: 'rgba(255,255,255,0.06)', padding: '2px 8px', borderRadius: '6px' }}>🏋️ <strong>Equipment:</strong> {msg.structuredAction.plan.equipmentAccess || 'Full Gym'}</span>
                        </div>

                        <div className="ai-action-buttons" style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                          <button
                            type="button"
                            className="ai-btn-action primary"
                            style={{
                              background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                              color: '#fff',
                              border: 'none',
                              borderRadius: '8px',
                              padding: '6px 14px',
                              fontSize: '0.78rem',
                              fontWeight: 600,
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '6px'
                            }}
                            onClick={() => handleApplyPlan(msg.structuredAction.plan)}
                          >
                            <Sparkles size={14} /> Open in AI Trainer
                          </button>
                          {msg.structuredAction.plan.structuredDiet && (
                            <button
                              type="button"
                              className="ai-btn-action secondary"
                              style={{
                                background: 'rgba(255,255,255,0.08)',
                                color: '#e2e8f0',
                                border: '1px solid rgba(255,255,255,0.15)',
                                borderRadius: '8px',
                                padding: '6px 12px',
                                fontSize: '0.78rem',
                                cursor: 'pointer',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px'
                              }}
                              onClick={() => handleSaveDiet(msg.structuredAction.plan.structuredDiet)}
                            >
                              <Utensils size={13} /> Save Diet
                            </button>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Structured Workout Action Card */}
                    {msg.structuredAction?.workout && (
                      <div className="ai-action-card">
                        {msg.structuredAction?.sourceAttribution && (
                          <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            padding: '6px 10px',
                            background: 'rgba(16, 185, 129, 0.12)',
                            border: '1px solid rgba(16, 185, 129, 0.3)',
                            borderRadius: '8px',
                            fontSize: '0.72rem',
                            color: '#34d399',
                            marginBottom: '10px'
                          }}>
                            <CheckCircle size={13} color="#10b981" />
                            <span>
                              Curated from Instructor Program: <strong>{msg.structuredAction.sourceAttribution.sourceTitle || 'Certified Program'}</strong>
                              {msg.structuredAction.sourceAttribution.instructor ? ` by ${msg.structuredAction.sourceAttribution.instructor}` : ''}
                            </span>
                          </div>
                        )}
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
                        {msg.structuredAction?.sourceAttribution && (
                          <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            padding: '6px 10px',
                            background: 'rgba(16, 185, 129, 0.12)',
                            border: '1px solid rgba(16, 185, 129, 0.3)',
                            borderRadius: '8px',
                            fontSize: '0.72rem',
                            color: '#34d399',
                            marginBottom: '10px'
                          }}>
                            <CheckCircle size={13} color="#10b981" />
                            <span>
                              Curated from Instructor Diet: <strong>{msg.structuredAction.sourceAttribution.sourceTitle || 'Certified Nutrition Template'}</strong>
                              {msg.structuredAction.sourceAttribution.instructor ? ` by ${msg.structuredAction.sourceAttribution.instructor}` : ''}
                            </span>
                          </div>
                        )}
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

                    {/* Standalone Source Attribution (e.g. guide or advice cited from instructor) */}
                    {msg.structuredAction?.sourceAttribution && !msg.structuredAction?.workout && !msg.structuredAction?.diet && (
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        padding: '6px 10px',
                        background: 'rgba(16, 185, 129, 0.12)',
                        border: '1px solid rgba(16, 185, 129, 0.3)',
                        borderRadius: '8px',
                        fontSize: '0.72rem',
                        color: '#34d399',
                        marginTop: '8px'
                      }}>
                        <CheckCircle size={13} color="#10b981" />
                        <span>
                          Verified Instructor Guide: <strong>{msg.structuredAction.sourceAttribution.sourceTitle}</strong>
                          {msg.structuredAction.sourceAttribution.instructor ? ` by ${msg.structuredAction.sourceAttribution.instructor}` : ''}
                        </span>
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
