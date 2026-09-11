import React, { useState } from 'react';
import { Trophy, TrendingDown, TrendingUp, Dumbbell, Footprints, Star, Share2, X } from 'lucide-react';
import { toast } from 'react-toastify';

/**
 * AchievementCard — Part 19
 * Shows completion summary + optional social share flow.
 * Never auto-publishes — user must explicitly click "Publish".
 */
export const AchievementCard = ({ goalGroup, onDismiss }) => {
  const [showShareFlow, setShowShareFlow] = useState(false);
  const [draftCaption, setDraftCaption] = useState('');
  const [publishing, setPublishing] = useState(false);

  if (!goalGroup || !goalGroup.completionSummary) return null;

  const {
    startWeightKg,
    endWeightKg,
    totalWorkouts,
    totalSteps,
    consistencyPercent
  } = goalGroup.completionSummary;

  const weightDelta = startWeightKg && endWeightKg ? (endWeightKg - startWeightKg).toFixed(1) : null;
  const weightLost = weightDelta && parseFloat(weightDelta) < 0;
  const weightGained = weightDelta && parseFloat(weightDelta) > 0;

  const handleOpenShare = () => {
    const auto = `🏆 I just completed my "${goalGroup.title}" fitness goal on GymSync!\n\n` +
      (weightDelta ? `⚖️ Weight change: ${weightDelta > 0 ? '+' : ''}${weightDelta} kg\n` : '') +
      (totalWorkouts ? `💪 Workouts completed: ${totalWorkouts}\n` : '') +
      (totalSteps ? `👟 Total steps logged: ${totalSteps.toLocaleString()}\n` : '') +
      (consistencyPercent != null ? `📊 Consistency: ${consistencyPercent}%\n` : '') +
      `\n#GymSync #FitnessGoal #Achieved`;
    setDraftCaption(auto);
    setShowShareFlow(true);
  };

  const handlePublish = async () => {
    if (!draftCaption.trim()) return;
    setPublishing(true);
    try {
      const token = localStorage.getItem('gymsync_token') || '';
      const res = await fetch('/api/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ content: draftCaption, postType: 'achievement' })
      });
      if (res.ok) {
        toast.success('Achievement shared to your feed! 🎉');
        setShowShareFlow(false);
      } else {
        toast.error('Failed to share post. Please try again.');
      }
    } catch {
      toast.error('Network error. Please try again.');
    } finally {
      setPublishing(false);
    }
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.9)', zIndex: 1100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
      <div style={{ background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)', border: '1px solid rgba(245,158,11,0.4)', borderRadius: '20px', padding: '32px', maxWidth: '460px', width: '100%', textAlign: 'center' }}>

        {/* Header */}
        <Trophy size={56} color="#f59e0b" style={{ margin: '0 auto 16px auto' }} />
        <h2 style={{ margin: '0 0 4px 0', fontSize: '1.6rem', color: '#fbbf24' }}>Goal Complete!</h2>
        <p style={{ color: 'var(--text-secondary)', margin: '0 0 24px 0' }}>{goalGroup.title}</p>

        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '24px' }}>
          {weightDelta !== null && (
            <div style={{ background: 'rgba(255,255,255,0.05)', borderRadius: '12px', padding: '14px' }}>
              {weightLost ? <TrendingDown size={20} color="#10b981" /> : <TrendingUp size={20} color="#f59e0b" />}
              <div style={{ fontSize: '1.5rem', fontWeight: 'bold', marginTop: '4px' }}>
                {weightDelta > 0 ? '+' : ''}{weightDelta} kg
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Weight Change</div>
            </div>
          )}
          {totalWorkouts != null && (
            <div style={{ background: 'rgba(255,255,255,0.05)', borderRadius: '12px', padding: '14px' }}>
              <Dumbbell size={20} color="#6366f1" />
              <div style={{ fontSize: '1.5rem', fontWeight: 'bold', marginTop: '4px' }}>{totalWorkouts}</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Workouts Done</div>
            </div>
          )}
          {totalSteps != null && (
            <div style={{ background: 'rgba(255,255,255,0.05)', borderRadius: '12px', padding: '14px' }}>
              <Footprints size={20} color="#22d3ee" />
              <div style={{ fontSize: '1.5rem', fontWeight: 'bold', marginTop: '4px' }}>{(totalSteps || 0).toLocaleString()}</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Total Steps</div>
            </div>
          )}
          {consistencyPercent != null && (
            <div style={{ background: 'rgba(255,255,255,0.05)', borderRadius: '12px', padding: '14px' }}>
              <Star size={20} color="#f59e0b" />
              <div style={{ fontSize: '1.5rem', fontWeight: 'bold', marginTop: '4px' }}>{consistencyPercent}%</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Consistency</div>
            </div>
          )}
        </div>

        {/* Share flow */}
        {showShareFlow ? (
          <div style={{ textAlign: 'left', marginBottom: '16px' }}>
            <p style={{ color: '#94a3b8', fontSize: '0.85rem', marginBottom: '8px' }}>Edit your post before sharing:</p>
            <textarea
              value={draftCaption}
              onChange={e => setDraftCaption(e.target.value)}
              rows={6}
              style={{ width: '100%', background: 'rgba(15,23,42,0.8)', color: 'white', border: '1px solid #334155', borderRadius: '10px', padding: '12px', fontSize: '0.85rem', resize: 'vertical', boxSizing: 'border-box' }}
            />
            <div style={{ display: 'flex', gap: '8px', marginTop: '10px' }}>
              <button onClick={handlePublish} disabled={publishing} className="btn btn-primary" style={{ flex: 1 }}>
                {publishing ? 'Publishing…' : '📤 Publish Post'}
              </button>
              <button onClick={() => setShowShareFlow(false)} style={{ flex: 1, background: 'transparent', border: '1px solid #334155', color: '#94a3b8', borderRadius: '8px', padding: '10px', cursor: 'pointer' }}>
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', gap: '10px', marginBottom: '16px' }}>
            <button onClick={handleOpenShare} className="btn btn-outline" style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
              <Share2 size={16} /> Share Achievement
            </button>
          </div>
        )}

        {/* Dismiss */}
        <button
          onClick={onDismiss}
          style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '4px', margin: '0 auto' }}
        >
          <X size={14} /> Dismiss &amp; continue
        </button>
      </div>
    </div>
  );
};
