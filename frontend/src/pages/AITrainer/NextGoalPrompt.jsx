import React from 'react';
import { Dumbbell, Activity, Scale, Zap, Target } from 'lucide-react';

const NEXT_GOALS = [
  { key: 'MuscleBuilding', icon: <Dumbbell size={28} color="#6366f1" />, label: '💪 Build Muscle', desc: 'Hypertrophy & strength training' },
  { key: 'Endurance', icon: <Activity size={28} color="#22d3ee" />, label: '🏃 Improve Endurance', desc: 'Cardio capacity & stamina' },
  { key: 'WeightLoss', icon: <Scale size={28} color="#10b981" />, label: '🔥 Maintain / Lose Weight', desc: 'Calorie balance & maintenance' },
  { key: 'Strength', icon: <Zap size={28} color="#f59e0b" />, label: '🏋️ Increase Strength', desc: 'Power & compound lifts' },
  { key: 'GeneralFitness', icon: <Target size={28} color="#f472b6" />, label: '🎯 Custom Goal', desc: 'Build a tailored plan with the AI Coach' }
];

/**
 * NextGoalPrompt — Part 20
 * Shown after AchievementCard is dismissed.
 * Selecting a goal pre-fills the Mini-Coach first step.
 */
export const NextGoalPrompt = ({ onSelectGoal, onSkip }) => {
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.92)', zIndex: 1100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
      <div style={{ background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '20px', padding: '32px', maxWidth: '480px', width: '100%' }}>

        <h2 style={{ margin: '0 0 6px 0', textAlign: 'center', fontSize: '1.4rem' }}>What's next?</h2>
        <p style={{ color: 'var(--text-secondary)', textAlign: 'center', margin: '0 0 24px 0', fontSize: '0.9rem' }}>
          Pick your next goal and I'll build a new plan around it.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {NEXT_GOALS.map(goal => (
            <button
              key={goal.key}
              onClick={() => onSelectGoal(goal.key)}
              style={{
                display: 'flex', alignItems: 'center', gap: '14px',
                background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: '14px', padding: '16px 18px', cursor: 'pointer',
                textAlign: 'left', width: '100%', transition: 'background 0.15s'
              }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.08)'}
              onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.04)'}
            >
              {goal.icon}
              <div>
                <div style={{ fontWeight: '600', color: 'var(--text-primary)', marginBottom: '2px' }}>{goal.label}</div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{goal.desc}</div>
              </div>
            </button>
          ))}
        </div>

        <button
          onClick={onSkip}
          style={{ display: 'block', margin: '20px auto 0', background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', fontSize: '0.85rem' }}
        >
          I'll decide later
        </button>
      </div>
    </div>
  );
};
