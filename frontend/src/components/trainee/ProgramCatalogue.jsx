import React, { useState, useEffect } from 'react';
import { Calendar, Search, Dumbbell, Award, ArrowRight, CheckCircle, Info, ChevronDown, ChevronUp } from 'lucide-react';
import { toast } from 'react-toastify';
import Modal from '../common/Modal';

const ProgramCatalogue = ({ onProgramApplied }) => {
  const [programs, setPrograms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [goalFilter, setGoalFilter] = useState('All');
  const [diffFilter, setDiffFilter] = useState('All');

  // Preview Modal
  const [previewProgram, setPreviewProgram] = useState(null);
  const [applyingId, setApplyingId] = useState(null);

  useEffect(() => {
    fetchPrograms();
  }, []);

  const fetchPrograms = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/plans/premade?type=Workout');
      if (res.ok) {
        const data = await res.json();
        setPrograms(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      console.error('Fetch Programs Error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleApply = async (program) => {
    setApplyingId(program._id);
    try {
      const token = localStorage.getItem('gymsync_token');
      if (!token) {
        toast.warn('Please log in to apply this program to your routine.');
        return;
      }

      const res = await fetch(`/api/plans/premade/${program._id}/apply`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to apply program');

      toast.success(data.message || `Applied "${program.title}" to your routine!`);

      // Store in local storage for instant offline / calendar reflection
      const userKey = (localStorage.getItem('gymsync_user_name') || 'Guest User').replace(/\s+/g, '_');
      localStorage.setItem(`gymsync_${userKey}_applied_program`, JSON.stringify(data.userProgram));

      if (setPreviewProgram) setPreviewProgram(null);
      if (onProgramApplied) onProgramApplied(data.userProgram);
    } catch (err) {
      toast.error(err.message || 'Failed to apply program');
    } finally {
      setApplyingId(null);
    }
  };

  const filteredPrograms = programs.filter(p => {
    const matchSearch = (p.title || '').toLowerCase().includes(search.toLowerCase()) ||
                        (p.description || '').toLowerCase().includes(search.toLowerCase()) ||
                        (Array.isArray(p.sportTags) && p.sportTags.some(t => t.toLowerCase().includes(search.toLowerCase())));
    const matchGoal = goalFilter === 'All' || (p.goal || p.category) === goalFilter;
    const matchDiff = diffFilter === 'All' || p.difficulty === diffFilter;
    return matchSearch && matchGoal && matchDiff;
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Search and Filters Bar */}
      <div style={{ display: 'flex', gap: '14px', flexWrap: 'wrap', alignItems: 'center' }}>
        <div className="search-bar" style={{ flex: 1, minWidth: '240px' }}>
          <Search size={18} color="var(--text-secondary)" />
          <input
            type="text"
            placeholder="Search programs by title, sport (e.g. Cricket, Running) or goal..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        <select
          className="search-input"
          style={{ width: 'auto', minWidth: '160px' }}
          value={goalFilter}
          onChange={e => setGoalFilter(e.target.value)}
        >
          <option value="All">All Fitness Goals</option>
          <option value="Muscle Building">Muscle Building</option>
          <option value="Strength & Power">Strength & Power</option>
          <option value="Fat Loss">Fat Loss</option>
          <option value="Athletic Performance">Athletic Performance</option>
        </select>

        <select
          className="search-input"
          style={{ width: 'auto', minWidth: '140px' }}
          value={diffFilter}
          onChange={e => setDiffFilter(e.target.value)}
        >
          <option value="All">All Difficulties</option>
          <option value="Beginner">Beginner</option>
          <option value="Intermediate">Intermediate</option>
          <option value="Advanced">Advanced</option>
        </select>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary)' }}>
          Loading certified instructor workout programs...
        </div>
      ) : filteredPrograms.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary)' }}>
          <Calendar size={48} style={{ opacity: 0.3, marginBottom: '12px' }} />
          <p>No workout programs found matching your filters.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '20px' }}>
          {filteredPrograms.map(prog => {
            const weekCount = prog.weeks?.length || prog.durationWeeks || 4;
            const daysCount = prog.daysPerWeek || prog.details?.days || 4;
            const exerciseCount = (prog.weeks || []).reduce(
              (acc, w) => acc + (w.days || []).reduce((dAcc, d) => dAcc + (d.exercises || []).length, 0),
              0
            );

            return (
              <div
                key={prog._id}
                className="glass-panel"
                style={{
                  padding: '22px',
                  borderRadius: '16px',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  border: '1px solid var(--card-border)',
                  transition: 'transform 0.2s ease, border-color 0.2s ease'
                }}
              >
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                    <span className="category-badge" style={{ background: 'rgba(59,130,246,0.15)', color: '#3b82f6' }}>
                      {prog.goal || prog.category || 'General'}
                    </span>
                    <span className="category-badge" style={{ background: 'rgba(245,158,11,0.15)', color: '#f59e0b' }}>
                      {prog.difficulty || 'Intermediate'}
                    </span>
                  </div>

                  <h3 style={{ margin: '0 0 6px 0', fontSize: '1.2rem', color: 'var(--text-primary)' }}>
                    {prog.title}
                  </h3>

                  <p style={{ fontSize: '0.8rem', color: '#10b981', margin: '0 0 12px 0', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <CheckCircle size={14} /> Certified by {prog.createdBy || 'Fitness Instructor'}
                  </p>

                  <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', lineHeight: 1.5, margin: '0 0 16px 0' }}>
                    {prog.description || 'Structured multi-week progression program.'}
                  </p>

                  {/* Program Metrics Row */}
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(3, 1fr)',
                    gap: '8px',
                    background: 'rgba(255,255,255,0.03)',
                    padding: '10px',
                    borderRadius: '10px',
                    textAlign: 'center',
                    marginBottom: '16px'
                  }}>
                    <div>
                      <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', display: 'block' }}>DURATION</span>
                      <strong style={{ fontSize: '0.92rem' }}>{weekCount} Wks</strong>
                    </div>
                    <div>
                      <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', display: 'block' }}>FREQUENCY</span>
                      <strong style={{ fontSize: '0.92rem' }}>{daysCount} D/Wk</strong>
                    </div>
                    <div>
                      <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', display: 'block' }}>EXERCISES</span>
                      <strong style={{ fontSize: '0.92rem' }}>{exerciseCount || 'Varied'}</strong>
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '10px', marginTop: '12px' }}>
                  <button
                    type="button"
                    className="btn btn-outline btn-sm"
                    style={{ flex: 1 }}
                    onClick={() => setPreviewProgram(prog)}
                  >
                    Preview Routine
                  </button>
                  <button
                    type="button"
                    className="btn btn-primary btn-sm"
                    style={{ flex: 1.2, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                    onClick={() => handleApply(prog)}
                    disabled={applyingId === prog._id}
                  >
                    {applyingId === prog._id ? 'Applying...' : 'Apply to Routine'} <ArrowRight size={14} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Program Preview Modal */}
      {previewProgram && (
        <Modal
          isOpen={Boolean(previewProgram)}
          onClose={() => setPreviewProgram(null)}
          title={previewProgram.title}
          maxWidth="750px"
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <span className="category-badge" style={{ background: 'rgba(16,185,129,0.2)', color: '#10b981', marginRight: '8px' }}>
                Instructor Verified • {previewProgram.createdBy}
              </span>
              <span className="category-badge">
                {previewProgram.goal || previewProgram.category} • {previewProgram.difficulty}
              </span>
            </div>

            <p style={{ color: 'var(--text-secondary)', lineHeight: 1.6, margin: 0 }}>
              {previewProgram.description}
            </p>

            {/* Weeks Accordion */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxHeight: '400px', overflowY: 'auto' }}>
              {(previewProgram.weeks || []).map((w, wIdx) => (
                <div key={wIdx} style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--card-border)', borderRadius: '10px', padding: '14px' }}>
                  <h4 style={{ margin: '0 0 10px 0', color: 'var(--primary-accent)' }}>
                    Week {w.weekNumber}: {w.focus || 'Training Phase'}
                  </h4>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {(w.days || []).map((d, dIdx) => (
                      <div key={dIdx} style={{ background: 'rgba(0,0,0,0.25)', padding: '10px 12px', borderRadius: '8px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                          <strong style={{ fontSize: '0.9rem' }}>Day {d.dayNumber}: {d.title}</strong>
                          <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>{d.focus}</span>
                        </div>

                        <ul style={{ margin: 0, paddingLeft: '20px', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                          {(d.exercises || []).map((ex, exIdx) => (
                            <li key={exIdx}>
                              <strong>{ex.name}</strong> — {ex.sets} sets × {ex.reps} reps {ex.rpe ? `(RPE ${ex.rpe})` : ''} {ex.restSeconds ? `• ${ex.restSeconds}s rest` : ''}
                            </li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', borderTop: '1px solid var(--card-border)', paddingTop: '12px' }}>
              <button type="button" className="btn btn-outline" onClick={() => setPreviewProgram(null)}>
                Close Preview
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => handleApply(previewProgram)}
                disabled={applyingId === previewProgram._id}
              >
                {applyingId === previewProgram._id ? 'Applying...' : 'Apply This Program'}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default ProgramCatalogue;
