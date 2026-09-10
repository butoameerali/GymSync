import React from 'react';
import { Camera, CheckCircle, FileText, Video } from 'lucide-react';
import AIDetectorContainer from '../../ai-detectors/AIDetectorContainer';

/**
 * ExerciseDetailView
 *
 * Renders the full exercise detail overlay. Covers three internal views:
 *   1. Choice view  — DO WITH AI vs DO WITHOUT AI (assigned + AI-trackable only)
 *   2. AI tracking  — live camera / AIDetectorContainer with progressive set pills
 *   3. Manual view  — media player, instructions, quick specs, set logging, footer
 *
 * Props
 * ─────
 * currentExercise   object   The exercise being shown
 * aiModeChoice      string|null  null | 'with_ai' | 'without_ai'
 * setAiModeChoice   fn
 * setCurrentExercise fn
 * reps              number
 * setReps           fn
 * currentSet        number
 * setLogs           array
 * handleLogSet      fn({ completedReps, mode, aiResult? })
 */
const ExerciseDetailView = ({
  currentExercise,
  aiModeChoice,
  setAiModeChoice,
  setCurrentExercise,
  reps,
  setReps,
  currentSet,
  setLogs,
  handleLogSet,
}) => {
  if (!currentExercise) return null;

  const isAiEnabled = Boolean(
    currentExercise.aiDetection?.enabled || currentExercise.isAiTrackable
  );
  const isAssigned = currentExercise.aiWorkoutIndex !== undefined;
  const totalSets = currentExercise.sets || currentExercise.defaultSets || 3;
  const targetReps = currentExercise.reps || currentExercise.defaultReps || 10;

  // ── 1. CHOICE VIEW ────────────────────────────────────────────────────────
  if (isAssigned && isAiEnabled && aiModeChoice === null) {
    return (
      <div
        className="active-exercise-view glass-panel"
        style={{ border: '1px solid #3b82f6', boxShadow: '0 8px 30px rgba(59,130,246,0.2)' }}
      >
        <div
          className="view-header"
          style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}
        >
          <div>
            <h2 style={{ fontSize: '1.6rem', color: 'var(--text-primary)', margin: 0 }}>
              {currentExercise.name}
            </h2>
            <p style={{ color: 'var(--text-secondary)', margin: '4px 0 0 0' }}>
              Target: <strong>{totalSets} Sets × {targetReps} Reps</strong>
            </p>
          </div>
          <button className="btn btn-outline btn-sm" onClick={() => setCurrentExercise(null)}>
            ✕ Close
          </button>
        </div>

        <div
          style={{
            background: 'rgba(255,255,255,0.03)',
            padding: '32px 24px',
            borderRadius: '16px',
            border: '1px solid var(--card-border)',
            textAlign: 'center',
          }}
        >
          <h3 style={{ margin: '0 0 8px 0', color: 'var(--text-primary)' }}>
            Choose Exercise Execution Mode
          </h3>
          <p
            style={{
              margin: '0 auto 26px auto',
              color: 'var(--text-secondary)',
              fontSize: '0.92rem',
              maxWidth: '520px',
            }}
          >
            This exercise has certified computer vision AI pose detection available. Choose how you
            would like to complete today's workout:
          </p>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
              gap: '20px',
              maxWidth: '640px',
              margin: '0 auto',
            }}
          >
            <button
              className="btn btn-primary"
              style={{
                padding: '24px 18px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '12px',
                borderRadius: '14px',
                textAlign: 'center',
              }}
              onClick={() => setAiModeChoice('with_ai')}
            >
              <div
                style={{
                  width: '52px',
                  height: '52px',
                  borderRadius: '50%',
                  background: 'rgba(255,255,255,0.2)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Camera size={28} />
              </div>
              <strong style={{ fontSize: '1.2rem' }}>DO WITH AI</strong>
              <span style={{ fontSize: '0.82rem', opacity: 0.9, lineHeight: 1.4 }}>
                Live camera pose tracking, automatic landmark checking &amp; rep counting
              </span>
            </button>

            <button
              className="btn btn-outline"
              style={{
                padding: '24px 18px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '12px',
                borderRadius: '14px',
                textAlign: 'center',
              }}
              onClick={() => setAiModeChoice('without_ai')}
            >
              <div
                style={{
                  width: '52px',
                  height: '52px',
                  borderRadius: '50%',
                  background: 'rgba(255,255,255,0.08)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <FileText size={28} />
              </div>
              <strong style={{ fontSize: '1.2rem' }}>DO WITHOUT AI</strong>
              <span style={{ fontSize: '0.82rem', opacity: 0.85, lineHeight: 1.4 }}>
                Self-paced sets, manual set tracking per set, and direct logging
              </span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── 2. AI TRACKING VIEW ───────────────────────────────────────────────────
  if (isAiEnabled && aiModeChoice === 'with_ai') {
    return (
      <div
        className="active-exercise-view glass-panel"
        style={{ border: '1px solid #3b82f6', boxShadow: '0 8px 30px rgba(59,130,246,0.2)' }}
      >
        <div
          className="view-header"
          style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}
        >
          <div>
            <h2 style={{ margin: 0 }}>{currentExercise.name} (AI Tracking Mode)</h2>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '6px' }}>
              <span
                className="category-badge"
                style={{ background: 'rgba(16, 185, 129, 0.2)', color: '#10b981', fontWeight: 600 }}
              >
                Set {currentSet} of {totalSets}
              </span>
              <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                Target: {targetReps} reps per set
              </span>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button className="btn btn-outline btn-sm" onClick={() => setAiModeChoice('without_ai')}>
              Switch to Manual Mode
            </button>
            <button className="btn btn-outline btn-sm" onClick={() => setCurrentExercise(null)}>
              ✕ Close
            </button>
          </div>
        </div>

        {/* Progressive Set Indicator Pills */}
        <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', marginBottom: '16px' }}>
          {Array.from({ length: totalSets }).map((_, idx) => {
            const sNum = idx + 1;
            const isDone = sNum < currentSet;
            const isCurrent = sNum === currentSet;
            return (
              <div
                key={sNum}
                style={{
                  padding: '6px 14px',
                  borderRadius: '20px',
                  fontSize: '0.82rem',
                  fontWeight: 600,
                  background: isDone
                    ? 'rgba(16, 185, 129, 0.2)'
                    : isCurrent
                    ? 'rgba(59, 130, 246, 0.25)'
                    : 'rgba(255,255,255,0.05)',
                  color: isDone ? '#10b981' : isCurrent ? '#60a5fa' : 'var(--text-secondary)',
                  border: isCurrent ? '1px solid #3b82f6' : '1px solid transparent',
                }}
              >
                {isDone ? '✓ ' : ''}Set {sNum} of {totalSets}
              </div>
            );
          })}
        </div>

        <AIDetectorContainer
          detectorId={currentExercise.aiDetection?.detectorId || 'pushup_v1'}
          exerciseName={currentExercise.name}
          onCompleteSession={(result) => {
            const detectedReps =
              typeof result?.reps === 'number'
                ? result.reps
                : typeof result?.repCount === 'number'
                ? result.repCount
                : typeof result?.count === 'number'
                ? result.count
                : 0;
            handleLogSet({ mode: 'ai', completedReps: detectedReps, aiResult: result });
          }}
          onFallbackToManual={() => setAiModeChoice('without_ai')}
        />
      </div>
    );
  }

  // ── 3. MANUAL / LIBRARY DETAIL VIEW ──────────────────────────────────────
  const rawMedia =
    currentExercise.mediaUrl ||
    currentExercise.gifUrl ||
    currentExercise.videoUrl ||
    (currentExercise.video !== 'none' ? currentExercise.video : null);
  const hasMedia = rawMedia && rawMedia !== 'none';
  const isVideoMedia =
    hasMedia &&
    (rawMedia.endsWith('.mp4') ||
      rawMedia.endsWith('.webm') ||
      rawMedia.endsWith('.ogg') ||
      rawMedia.includes('youtube.com') ||
      rawMedia.includes('youtu.be'));

  return (
    <div
      className="active-exercise-view glass-panel"
      style={{ border: '1px solid #3b82f6', boxShadow: '0 8px 30px rgba(59,130,246,0.2)' }}
    >
      <div
        className="view-header"
        style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
      >
        <div>
          <h2 style={{ fontSize: '1.6rem', color: 'var(--text-primary)', margin: 0 }}>
            {currentExercise.name}
          </h2>
          <div style={{ display: 'flex', gap: '10px', marginTop: '8px', flexWrap: 'wrap' }}>
            <span
              className="category-badge"
              style={{ background: 'rgba(59, 130, 246, 0.2)', color: '#60a5fa' }}
            >
              Target:{' '}
              {Array.isArray(currentExercise.targetMuscles)
                ? currentExercise.targetMuscles.join(', ')
                : currentExercise.category || 'General'}
            </span>
            <span
              className="category-badge"
              style={{ background: 'rgba(245, 158, 11, 0.2)', color: '#f59e0b' }}
            >
              Equipment:{' '}
              {currentExercise.equipmentRequired || currentExercise.equipment || 'Bodyweight'}
            </span>
            {currentExercise.difficulty && (
              <span
                className="category-badge"
                style={{ background: 'rgba(168, 85, 247, 0.2)', color: '#c084fc' }}
              >
                {currentExercise.difficulty}
              </span>
            )}
            {isAiEnabled && isAssigned && (
              <span
                className="category-badge"
                style={{ background: 'rgba(16, 185, 129, 0.2)', color: '#34d399' }}
              >
                ⚡ AI Pose Detection Available
              </span>
            )}
            {!isAssigned && (
              <span
                className="category-badge"
                style={{ background: 'rgba(59, 130, 246, 0.2)', color: '#93c5fd' }}
              >
                📖 Library Guide
              </span>
            )}
          </div>
        </div>
        <button
          className="btn btn-outline btn-sm"
          style={{ padding: '8px 16px' }}
          onClick={() => setCurrentExercise(null)}
        >
          ✕ Close
        </button>
      </div>

      {/* VISUAL DEMONSTRATION MEDIA PLAYER (GIF / VIDEO / PLACEHOLDER) */}
      <div
        style={{
          marginTop: '20px',
          background: 'rgba(0,0,0,0.6)',
          borderRadius: '16px',
          overflow: 'hidden',
          border: '1px solid var(--card-border)',
          textAlign: 'center',
        }}
      >
        {hasMedia ? (
          isVideoMedia ? (
            rawMedia.includes('youtube.com') || rawMedia.includes('youtu.be') ? (
              <iframe
                src={rawMedia.replace('watch?v=', 'embed/')}
                title={currentExercise.name}
                style={{ width: '100%', height: '360px', border: 'none' }}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            ) : (
              <video
                src={rawMedia}
                controls
                autoPlay
                loop
                muted
                style={{ width: '100%', maxHeight: '360px', objectFit: 'contain' }}
              />
            )
          ) : (
            <img
              src={rawMedia}
              alt={currentExercise.name}
              style={{ width: '100%', maxHeight: '360px', objectFit: 'contain' }}
            />
          )
        ) : (
          <div
            style={{
              padding: '40px 20px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '14px',
            }}
          >
            <div
              style={{
                width: '72px',
                height: '72px',
                borderRadius: '50%',
                background: 'rgba(59, 130, 246, 0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#3b82f6',
              }}
            >
              <Video size={36} />
            </div>
            <div>
              <h4 style={{ color: 'var(--text-primary)', marginBottom: '5px', fontSize: '1.1rem' }}>
                No Exercise Video or GIF Uploaded
              </h4>
              <p
                style={{
                  color: 'var(--text-secondary)',
                  fontSize: '0.9rem',
                  maxWidth: '440px',
                  margin: '0 auto',
                }}
              >
                No media file has been attached for this exercise yet. Follow the step-by-step
                description below to perform the exercise with perfect form.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* HOW TO DO EXERCISE DESCRIPTION & INSTRUCTIONS */}
      <div
        className="manual-viewport"
        style={{
          padding: '24px',
          background: 'var(--card-bg)',
          borderRadius: '12px',
          marginTop: '20px',
          border: '1px solid var(--card-border)',
        }}
      >
        <h4
          style={{
            color: 'var(--primary-accent)',
            marginBottom: '12px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontSize: '1.1rem',
          }}
        >
          <FileText size={20} /> How To Do This Exercise
        </h4>
        <p
          style={{
            fontSize: '1rem',
            lineHeight: 1.6,
            color: 'var(--text-primary)',
            background: 'rgba(255, 255, 255, 0.03)',
            padding: '16px',
            borderRadius: '10px',
            border: '1px solid var(--card-border)',
            margin: 0,
          }}
        >
          {currentExercise.description ||
            currentExercise.instructions ||
            'Maintain proper posture, engage your core, breathe smoothly throughout the motion, and complete each rep with controlled tempo.'}
        </p>

        {/* QUICK SPECS ROW */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
            gap: '12px',
            marginTop: '20px',
          }}
        >
          <div
            style={{
              background: 'rgba(0,0,0,0.3)',
              padding: '12px',
              borderRadius: '8px',
              border: '1px solid var(--card-border)',
            }}
          >
            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block' }}>
              Target Area
            </span>
            <strong style={{ fontSize: '0.9rem', color: 'var(--text-primary)' }}>
              {Array.isArray(currentExercise.targetMuscles)
                ? currentExercise.targetMuscles.join(', ')
                : currentExercise.category || 'General'}
            </strong>
          </div>
          <div
            style={{
              background: 'rgba(0,0,0,0.3)',
              padding: '12px',
              borderRadius: '8px',
              border: '1px solid var(--card-border)',
            }}
          >
            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block' }}>
              Equipment
            </span>
            <strong style={{ fontSize: '0.9rem', color: '#f59e0b' }}>
              {currentExercise.equipmentRequired || currentExercise.equipment || 'Bodyweight'}
            </strong>
          </div>
          <div
            style={{
              background: 'rgba(0,0,0,0.3)',
              padding: '12px',
              borderRadius: '8px',
              border: '1px solid var(--card-border)',
            }}
          >
            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block' }}>
              {isAssigned ? 'Target Split' : 'Mode'}
            </span>
            <strong
              style={{ fontSize: '0.9rem', color: isAssigned ? '#10b981' : '#60a5fa' }}
            >
              {isAssigned ? `${totalSets} Sets × ${targetReps} Reps` : 'Educational Guide'}
            </strong>
          </div>
        </div>

        {/* PROGRESSIVE SETS LOGGING SECTION */}
        {isAssigned && (
          <div
            style={{
              marginTop: '24px',
              background: 'rgba(0,0,0,0.25)',
              padding: '20px',
              borderRadius: '12px',
              border: '1px solid var(--card-border)',
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '14px',
                flexWrap: 'wrap',
                gap: '10px',
              }}
            >
              <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                Progressive Sets ({currentSet} of {totalSets})
              </span>
              {setLogs.length > 0 && (
                <span style={{ fontSize: '0.8rem', color: '#10b981' }}>
                  ✓ {setLogs.length} set(s) completed
                </span>
              )}
            </div>

            {/* Set Progress Badges */}
            <div style={{ display: 'flex', gap: '8px', marginBottom: '18px', flexWrap: 'wrap' }}>
              {Array.from({ length: totalSets }).map((_, idx) => {
                const sNum = idx + 1;
                const isDone = sNum < currentSet;
                const isCurrent = sNum === currentSet;
                const log = setLogs.find((l) => l.setNumber === sNum);
                return (
                  <div
                    key={sNum}
                    style={{
                      padding: '8px 14px',
                      borderRadius: '8px',
                      fontSize: '0.85rem',
                      fontWeight: 600,
                      background: isDone
                        ? 'rgba(16, 185, 129, 0.2)'
                        : isCurrent
                        ? 'rgba(59, 130, 246, 0.2)'
                        : 'rgba(255,255,255,0.03)',
                      color: isDone ? '#10b981' : isCurrent ? '#60a5fa' : 'var(--text-secondary)',
                      border: isCurrent
                        ? '1px solid #3b82f6'
                        : '1px solid var(--card-border)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                    }}
                  >
                    {isDone ? <CheckCircle size={14} /> : null} Set {sNum}{' '}
                    {log ? `(${log.repsCompleted}r)` : `(${targetReps}r)`}
                  </div>
                );
              })}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '15px', flexWrap: 'wrap' }}>
              <div>
                <label
                  style={{
                    display: 'block',
                    fontSize: '0.82rem',
                    color: 'var(--text-secondary)',
                    marginBottom: '4px',
                  }}
                >
                  Reps for Set {currentSet}
                </label>
                <input
                  type="number"
                  min="1"
                  value={reps}
                  onChange={(e) => setReps(parseInt(e.target.value) || 0)}
                  style={{
                    fontSize: '1.4rem',
                    fontWeight: 'bold',
                    width: '100px',
                    textAlign: 'center',
                    background: 'rgba(0,0,0,0.4)',
                    color: '#10b981',
                    border: '2px solid #10b981',
                    padding: '6px',
                    borderRadius: '10px',
                  }}
                />
              </div>

              <button
                className="btn btn-primary"
                style={{ flex: 1, minWidth: '220px', height: '48px', marginTop: '20px' }}
                onClick={() => handleLogSet({ completedReps: reps, mode: 'manual' })}
              >
                <CheckCircle size={18} />{' '}
                {currentSet === totalSets
                  ? `Log Final Set & Finish Exercise`
                  : `Log Set ${currentSet} of ${totalSets}`}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ACTION FOOTER */}
      <div
        className="exercise-footer"
        style={{
          marginTop: '20px',
          display: 'flex',
          gap: '15px',
          flexWrap: 'wrap',
          justifyContent: !isAssigned ? 'flex-end' : 'flex-start',
        }}
      >
        {!isAssigned ? (
          <button
            className="btn btn-primary"
            style={{ minWidth: '150px' }}
            onClick={() => setCurrentExercise(null)}
          >
            Close Guide
          </button>
        ) : (
          <>
            {isAiEnabled && (
              <button
                className="btn btn-outline"
                style={{ flex: 1, minWidth: '180px' }}
                onClick={() => setAiModeChoice('with_ai')}
              >
                <Camera size={18} /> Switch to AI Camera
              </button>
            )}
            <button
              className="btn btn-outline"
              style={{ minWidth: '100px' }}
              onClick={() => setCurrentExercise(null)}
            >
              Close
            </button>
          </>
        )}
      </div>
    </div>
  );
};

export default ExerciseDetailView;
