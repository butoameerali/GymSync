/**
 * ProgramOutcomeReviewModal.jsx
 *
 * Interactive AI Program Outcome & Performance Evaluation Modal.
 * Prompts the trainee upon program completion with debrief questions:
 *   - Did you achieve your goal? (Zabardast kaam hua / Theek tha aas paas tha / etc.)
 *   - What results were felt/measured?
 *   - Difficulty perception & movement feedback
 *
 * Calls local Ollama (with deterministic fallback) to generate a detailed report:
 *   - Success Score %
 *   - Outcome Category
 *   - Strengths & Key Wins
 *   - Gaps & Areas for Improvement
 *   - Instructor Feedback Notes
 *   - Next Phase Recommendations
 */

import React, { useState } from 'react';
import {
  X,
  Award,
  Sparkles,
  CheckCircle,
  AlertCircle,
  HelpCircle,
  TrendingUp,
  Dumbbell,
  Clock,
  Flame,
  ArrowRight,
  RefreshCw,
  Sliders,
  Check,
  Star
} from 'lucide-react';
import { toast } from 'react-toastify';

const GOAL_OPTIONS = [
  {
    id: 'fully_achieved',
    title: 'Goal Fully Achieved (Zabardast Kaam Hua!)',
    desc: 'Hit target lifts/measurements, felt strong progress throughout the 4 weeks.',
    color: '#10b981',
    bgColor: 'rgba(16, 185, 129, 0.1)',
    borderColor: 'rgba(16, 185, 129, 0.35)',
    icon: '🏆'
  },
  {
    id: 'near_target',
    title: 'Near Target (Theek tha, aas paas tha)',
    desc: 'Solid improvements, very close to goal with minor recovery/schedule gaps.',
    color: '#3b82f6',
    bgColor: 'rgba(59, 130, 246, 0.1)',
    borderColor: 'rgba(59, 130, 246, 0.35)',
    icon: '🎯'
  },
  {
    id: 'needs_refinement',
    title: 'Needs Refinement (Aas paas tha lekin theek nahi)',
    desc: 'Partial results; struggled with some movements, fatigue or volume mismatch.',
    color: '#f59e0b',
    bgColor: 'rgba(245, 158, 11, 0.1)',
    borderColor: 'rgba(245, 158, 11, 0.35)',
    icon: '⚠️'
  },
  {
    id: 'low_impact',
    title: 'Incomplete Impact (Kaam pura nahi hua)',
    desc: 'Did not achieve the primary objective; routine was too tough or missed targets.',
    color: '#ef4444',
    bgColor: 'rgba(239, 68, 68, 0.1)',
    borderColor: 'rgba(239, 68, 68, 0.35)',
    icon: '❌'
  }
];

export const ProgramOutcomeReviewModal = ({
  program,
  onClose,
  onReviewSaved
}) => {
  const prog = program?.rawProgram || program;
  const existingReport = prog?.outcomeReport;

  // State: 'report' if already reviewed and not re-evaluating, else 'questionnaire'
  const [viewMode, setViewMode] = useState(existingReport?.successScore ? 'report' : 'questionnaire');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Questionnaire form states
  const [goalSatisfaction, setGoalSatisfaction] = useState(
    existingReport?.userFeedback?.goalSatisfaction || 'near_target'
  );
  const [metricOutcome, setMetricOutcome] = useState(
    existingReport?.userFeedback?.metricOutcome || ''
  );
  const [difficultyRating, setDifficultyRating] = useState(
    existingReport?.userFeedback?.difficultyRating || 7
  );
  const [feltResults, setFeltResults] = useState(
    existingReport?.userFeedback?.feltResults || ''
  );
  const [favoriteMovements, setFavoriteMovements] = useState(
    (existingReport?.userFeedback?.favoriteMovements || []).join(', ')
  );
  const [struggledMovements, setStruggledMovements] = useState(
    (existingReport?.userFeedback?.struggledMovements || []).join(', ')
  );
  const [notes, setNotes] = useState(
    existingReport?.userFeedback?.notes || ''
  );

  const [activeReport, setActiveReport] = useState(existingReport || null);

  const handleSubmitEvaluation = async (e) => {
    if (e) e.preventDefault();
    setIsSubmitting(true);

    try {
      const token = localStorage.getItem('gymsync_token');
      if (!token) {
        toast.error('Please log in');
        setIsSubmitting(false);
        return;
      }

      const res = await fetch(`/api/plans/user-programs/${prog._id}/review`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          goalSatisfaction,
          metricOutcome,
          difficultyRating: Number(difficultyRating),
          feltResults,
          favoriteMovements: favoriteMovements.split(',').map(s => s.trim()).filter(Boolean),
          struggledMovements: struggledMovements.split(',').map(s => s.trim()).filter(Boolean),
          notes
        })
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Failed to generate review');
      }

      const data = await res.json();
      setActiveReport(data.outcomeReport);
      setViewMode('report');
      toast.success('Program Outcome Report generated & saved!');
      if (onReviewSaved) onReviewSaved(data.userProgram || data);
    } catch (err) {
      console.error('Review submission error:', err);
      toast.error(err.message || 'Error generating review');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getScoreColor = (score) => {
    if (score >= 85) return '#10b981';
    if (score >= 70) return '#3b82f6';
    if (score >= 50) return '#f59e0b';
    return '#ef4444';
  };

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        background: 'rgba(15, 23, 42, 0.85)',
        backdropFilter: 'blur(8px)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px'
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        style={{
          background: 'var(--card-bg, #0f172a)',
          border: '1px solid rgba(255, 255, 255, 0.12)',
          borderRadius: '20px',
          width: '100%',
          maxWidth: '780px',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          boxShadow: '0 20px 50px rgba(0, 0, 0, 0.6)'
        }}
      >
        {/* ── MODAL HEADER ────────────────────────────────────────── */}
        <div
          style={{
            padding: '20px 24px',
            borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'rgba(255, 255, 255, 0.02)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                width: '42px',
                height: '42px',
                borderRadius: '10px',
                background: 'rgba(59, 130, 246, 0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#60a5fa'
              }}
            >
              <Award size={22} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                {viewMode === 'report' ? 'Program Outcome & Performance Report' : 'AI Program Review & Debrief'}
              </h3>
              <p style={{ margin: '2px 0 0 0', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                {prog.title} &bull; {prog.instructorName || 'Fitness Instructor'} &bull; {prog.durationWeeks || 4} Weeks
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '8px',
              color: 'var(--text-secondary)',
              width: '32px',
              height: '32px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer'
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* ── MODAL BODY (SCROLLABLE) ─────────────────────────────── */}
        <div style={{ padding: '24px', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '22px' }}>

          {/* ══════════════════════════════════════════════════════════
              VIEW 1: QUESTIONNAIRE (DEBRIEF INTERVIEW)
             ══════════════════════════════════════════════════════════ */}
          {viewMode === 'questionnaire' ? (
            <form onSubmit={handleSubmitEvaluation} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div style={{
                background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.08) 0%, rgba(30, 41, 59, 0.5) 100%)',
                border: '1px solid rgba(59, 130, 246, 0.25)',
                borderRadius: '12px',
                padding: '14px 18px',
                fontSize: '0.86rem',
                color: 'var(--text-secondary)'
              }}>
                <strong style={{ color: '#60a5fa' }}>💡 Local AI Assessment:</strong> Answer these brief questions about your 4-week experience. Your local AI coach will evaluate your goal success rate, calculate your outcome percentage, and generate constructive feedback.
              </div>

              {/* Question 1: Goal Achievement */}
              <div>
                <label style={{ display: 'block', fontSize: '0.92rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '8px' }}>
                  1. Did you achieve your intended goal? (Maqsad pura hua?)
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '10px' }}>
                  {GOAL_OPTIONS.map(opt => {
                    const isSelected = goalSatisfaction === opt.id || goalSatisfaction.toLowerCase().includes(opt.id);
                    return (
                      <div
                        key={opt.id}
                        onClick={() => setGoalSatisfaction(opt.id)}
                        style={{
                          background: isSelected ? opt.bgColor : 'rgba(255, 255, 255, 0.02)',
                          border: isSelected ? `2px solid ${opt.color}` : '1px solid rgba(255, 255, 255, 0.07)',
                          borderRadius: '12px',
                          padding: '12px 14px',
                          cursor: 'pointer',
                          transition: 'all 0.15s ease'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                          <span style={{ fontSize: '0.9rem', fontWeight: 700, color: isSelected ? opt.color : 'var(--text-primary)' }}>
                            {opt.icon} {opt.title}
                          </span>
                          {isSelected && <Check size={16} color={opt.color} />}
                        </div>
                        <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                          {opt.desc}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Question 2: Measurable Metric / Results */}
              <div>
                <label style={{ display: 'block', fontSize: '0.92rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '6px' }}>
                  2. What measurable results did you experience? (e.g. Weight change, PR lifts, stamina)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Added 5kg to Bench Press, improved pull-up reps, felt more energetic"
                  value={metricOutcome}
                  onChange={(e) => setMetricOutcome(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: '10px',
                    background: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid rgba(255, 255, 255, 0.12)',
                    color: 'var(--text-primary)',
                    fontSize: '0.88rem'
                  }}
                />
              </div>

              {/* Question 3: Difficulty Perception Slider */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <label style={{ fontSize: '0.92rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                    3. How challenging was this program? (Difficulty: {difficultyRating}/10)
                  </label>
                  <span style={{ fontSize: '0.78rem', color: '#60a5fa', fontWeight: 600 }}>
                    {difficultyRating <= 4 ? 'Too Light / Easy' : difficultyRating <= 8 ? 'Challenging & Effective' : 'Very Tough / High Fatigue'}
                  </span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="10"
                  value={difficultyRating}
                  onChange={(e) => setDifficultyRating(e.target.value)}
                  style={{ width: '100%', accentColor: '#3b82f6', cursor: 'pointer' }}
                />
              </div>

              {/* Question 4: Movements Feedback */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.86rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '6px' }}>
                    👍 Favorite / Best Movements:
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Incline Press, Deadlift"
                    value={favoriteMovements}
                    onChange={(e) => setFavoriteMovements(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      borderRadius: '10px',
                      background: 'rgba(255, 255, 255, 0.05)',
                      border: '1px solid rgba(255, 255, 255, 0.12)',
                      color: 'var(--text-primary)',
                      fontSize: '0.85rem'
                    }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.86rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '6px' }}>
                    👎 Hard / Uncomfortable Movements:
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Overhead Press, Barbell Rows"
                    value={struggledMovements}
                    onChange={(e) => setStruggledMovements(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      borderRadius: '10px',
                      background: 'rgba(255, 255, 255, 0.05)',
                      border: '1px solid rgba(255, 255, 255, 0.12)',
                      color: 'var(--text-primary)',
                      fontSize: '0.85rem'
                    }}
                  />
                </div>
              </div>

              {/* Question 5: Additional Thoughts */}
              <div>
                <label style={{ display: 'block', fontSize: '0.88rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '6px' }}>
                  5. Additional Comments on Recovery, Schedule or Diet:
                </label>
                <textarea
                  rows="2"
                  placeholder="How did your recovery feel? Any suggestions to make this routine better?"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: '10px',
                    background: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid rgba(255, 255, 255, 0.12)',
                    color: 'var(--text-primary)',
                    fontSize: '0.85rem',
                    resize: 'none'
                  }}
                />
              </div>

              {/* Submit CTA */}
              <button
                type="submit"
                disabled={isSubmitting}
                style={{
                  width: '100%',
                  padding: '14px',
                  borderRadius: '12px',
                  border: 'none',
                  background: 'linear-gradient(135deg, #3b82f6, #2563eb)',
                  color: '#fff',
                  fontWeight: 700,
                  fontSize: '0.98rem',
                  cursor: isSubmitting ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  boxShadow: '0 4px 16px rgba(59, 130, 246, 0.35)',
                  marginTop: '6px'
                }}
              >
                {isSubmitting ? (
                  <>
                    <RefreshCw size={18} className="spin-animation" /> Evaluating Results with Local AI...
                  </>
                ) : (
                  <>
                    <Sparkles size={18} /> Generate AI Outcome Report &amp; Score
                  </>
                )}
              </button>
            </form>
          ) : (

            /* ══════════════════════════════════════════════════════════
                VIEW 2: COMPREHENSIVE OUTCOME REPORT
               ══════════════════════════════════════════════════════════ */
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

              {/* Success Score Hero Banner */}
              <div
                style={{
                  background: 'linear-gradient(135deg, rgba(30, 41, 59, 0.8) 0%, rgba(15, 23, 42, 0.9) 100%)',
                  border: `1px solid ${getScoreColor(activeReport?.successScore || 80)}44`,
                  borderRadius: '16px',
                  padding: '24px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: '18px'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                  {/* Score Dial */}
                  <div
                    style={{
                      width: '84px',
                      height: '84px',
                      borderRadius: '50%',
                      background: `conic-gradient(${getScoreColor(activeReport?.successScore || 80)} ${(activeReport?.successScore || 80) * 3.6}deg, rgba(255, 255, 255, 0.08) 0deg)`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0
                    }}
                  >
                    <div
                      style={{
                        width: '68px',
                        height: '68px',
                        borderRadius: '50%',
                        background: '#0f172a',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}
                    >
                      <span style={{ fontSize: '1.45rem', fontWeight: 900, color: getScoreColor(activeReport?.successScore || 80), lineHeight: 1 }}>
                        {activeReport?.successScore || 80}%
                      </span>
                      <span style={{ fontSize: '0.62rem', color: 'var(--text-secondary)', textTransform: 'uppercase', marginTop: '2px' }}>
                        Success
                      </span>
                    </div>
                  </div>

                  <div>
                    <span
                      style={{
                        display: 'inline-block',
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        padding: '3px 10px',
                        borderRadius: '20px',
                        background: `${getScoreColor(activeReport?.successScore || 80)}20`,
                        color: getScoreColor(activeReport?.successScore || 80),
                        marginBottom: '6px'
                      }}
                    >
                      {activeReport?.outcomeCategoryLabel || 'Near Target'}
                    </span>
                    <h4 style={{ margin: '0 0 4px 0', fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                      Program Outcome Evaluation
                    </h4>
                    <p style={{ margin: 0, fontSize: '0.84rem', color: 'var(--text-secondary)' }}>
                      Goal: <strong style={{ color: 'var(--text-primary)' }}>{prog.goal}</strong> &bull; Completed: <strong style={{ color: '#34d399' }}>{prog.progress?.completedSessions?.length || 0} Sessions</strong>
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setViewMode('questionnaire')}
                  style={{
                    padding: '8px 14px',
                    borderRadius: '8px',
                    border: '1px solid rgba(255, 255, 255, 0.15)',
                    background: 'rgba(255, 255, 255, 0.05)',
                    color: 'var(--text-secondary)',
                    fontSize: '0.82rem',
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                >
                  <RefreshCw size={13} /> Update Feedback
                </button>
              </div>

              {/* AI Summary */}
              {activeReport?.aiAnalysis?.summary && (
                <div style={{
                  background: 'rgba(59, 130, 246, 0.06)',
                  border: '1px solid rgba(59, 130, 246, 0.2)',
                  borderRadius: '12px',
                  padding: '16px',
                  fontSize: '0.88rem',
                  lineHeight: '1.5',
                  color: 'var(--text-primary)'
                }}>
                  <strong style={{ color: '#60a5fa' }}>🧠 AI Performance Verdict: </strong>
                  {activeReport.aiAnalysis.summary}
                </div>
              )}

              {/* Strengths & Improvements Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '14px' }}>
                {/* Key Wins */}
                <div style={{
                  background: 'rgba(16, 185, 129, 0.04)',
                  border: '1px solid rgba(16, 185, 129, 0.2)',
                  borderRadius: '14px',
                  padding: '16px'
                }}>
                  <h5 style={{ margin: '0 0 10px 0', fontSize: '0.9rem', color: '#34d399', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <CheckCircle size={16} /> Key Wins &amp; Strengths
                  </h5>
                  <ul style={{ margin: 0, paddingLeft: '18px', fontSize: '0.82rem', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {(activeReport?.aiAnalysis?.keyWins || []).map((win, idx) => (
                      <li key={idx} style={{ color: 'var(--text-primary)' }}>{win}</li>
                    ))}
                  </ul>
                </div>

                {/* Areas for Improvement */}
                <div style={{
                  background: 'rgba(245, 158, 11, 0.04)',
                  border: '1px solid rgba(245, 158, 11, 0.2)',
                  borderRadius: '14px',
                  padding: '16px'
                }}>
                  <h5 style={{ margin: '0 0 10px 0', fontSize: '0.9rem', color: '#fbbf24', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <TrendingUp size={16} /> Areas for Next-Cycle Improvement
                  </h5>
                  <ul style={{ margin: 0, paddingLeft: '18px', fontSize: '0.82rem', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {(activeReport?.aiAnalysis?.areasForImprovement || []).map((gap, idx) => (
                      <li key={idx} style={{ color: 'var(--text-primary)' }}>{gap}</li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Trainer Feedback Note */}
              {activeReport?.aiAnalysis?.trainerFeedbackNotes && (
                <div style={{
                  background: 'rgba(255, 255, 255, 0.03)',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  borderRadius: '12px',
                  padding: '16px'
                }}>
                  <h5 style={{ margin: '0 0 6px 0', fontSize: '0.86rem', color: '#a78bfa', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    📋 Feedback for Program Optimization:
                  </h5>
                  <p style={{ margin: 0, fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                    {activeReport.aiAnalysis.trainerFeedbackNotes}
                  </p>
                </div>
              )}

              {/* Next Phase Recommendations */}
              {(activeReport?.aiAnalysis?.nextPhaseRecommendations || []).length > 0 && (
                <div style={{
                  background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.08) 0%, rgba(30, 41, 59, 0.5) 100%)',
                  border: '1px solid rgba(59, 130, 246, 0.25)',
                  borderRadius: '14px',
                  padding: '16px'
                }}>
                  <h5 style={{ margin: '0 0 10px 0', fontSize: '0.9rem', color: '#60a5fa', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    🚀 Actionable Next Steps:
                  </h5>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {activeReport.aiAnalysis.nextPhaseRecommendations.map((rec, idx) => (
                      <div key={idx} style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', fontSize: '0.84rem', color: 'var(--text-primary)' }}>
                        <ArrowRight size={14} color="#60a5fa" style={{ flexShrink: 0, marginTop: '3px' }} />
                        <span>{rec}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Close Action */}
              <button
                type="button"
                onClick={onClose}
                style={{
                  width: '100%',
                  padding: '12px',
                  borderRadius: '10px',
                  border: 'none',
                  background: 'linear-gradient(135deg, #10b981, #059669)',
                  color: '#fff',
                  fontWeight: 700,
                  fontSize: '0.92rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px'
                }}
              >
                <Check size={16} /> Keep Report &amp; Close
              </button>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};

export default ProgramOutcomeReviewModal;
