import React from 'react';
import { Dumbbell, Eye } from 'lucide-react';

/**
 * AITrainerAssignedMode
 *
 * Renders the 'assigned' activeMode section — a grid of trainer-assigned
 * exercises sourced from the dbExercises list (first 24 entries).
 *
 * Props
 * ─────
 * dbExercises   array   Exercises fetched from /api/exercises
 * startExercise fn      Opens the ExerciseDetailView for a given exercise
 */
const AITrainerAssignedMode = ({ dbExercises, startExercise }) => {
  return (
    <div className="assigned-view glass-panel" style={{ padding: '24px' }}>
      <div style={{ marginBottom: '20px' }}>
        <h2
          style={{ display: 'flex', alignItems: 'center', gap: '10px', color: 'var(--text-primary)' }}
        >
          <Dumbbell size={28} color="var(--primary-accent)" /> Trainer Assigned Exercises
        </h2>
        <p style={{ color: 'var(--text-secondary)', margin: '5px 0 0 0' }}>
          Workout routines and exercises assigned by your Gym Owner or Personal Trainer.
        </p>
      </div>

      <div className="exercise-grid">
        {(dbExercises.length > 0 ? dbExercises.slice(0, 24) : []).map((ex) => (
          <div key={ex._id || ex.id} className="exercise-card">
            <div className="ex-card-header">
              <h4>{ex.name}</h4>
              <span
                className="category-badge"
                style={{
                  background: 'rgba(16, 185, 129, 0.2)',
                  color: '#10b981',
                  fontSize: '0.75rem',
                  padding: '2px 8px',
                  borderRadius: '10px',
                }}
              >
                Assigned
              </span>
            </div>
            <span className="ex-category">
              {Array.isArray(ex.targetMuscles)
                ? ex.targetMuscles.join(', ')
                : ex.category || 'General'}
            </span>
            <p className="ex-instructions">
              {(ex.description || ex.instructions || 'Maintain proper form during performance.').substring(
                0,
                65
              )}
              ...
            </p>
            <button
              className="btn btn-primary btn-sm w-100 mt-10"
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
              onClick={() => startExercise(ex)}
            >
              <Eye size={16} /> View Exercise
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default AITrainerAssignedMode;
