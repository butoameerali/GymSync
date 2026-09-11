import React, { useState, useEffect } from 'react';
import { Search, Dumbbell, Clock, Target, ChevronRight, Check } from 'lucide-react';
import { toast } from 'react-toastify';

const GOALS = ['All', 'Weight Loss', 'Muscle Building', 'Endurance', 'Strength', 'General Fitness'];
const EQUIPMENT = ['All', 'Full Gym', 'Dumbbells', 'Bodyweight only', 'Resistance Bands'];

export const BrowseProgramsTab = ({ onProgramApplied }) => {
  const [query, setQuery] = useState('');
  const [goalFilter, setGoalFilter] = useState('All');
  const [equipFilter, setEquipFilter] = useState('All');
  const [programs, setPrograms] = useState([]);
  const [loading, setLoading] = useState(false);
  const [applying, setApplying] = useState(null);

  const fetchPrograms = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (query.trim()) params.set('query', query.trim());
      if (goalFilter !== 'All') params.set('goal', goalFilter);
      if (equipFilter !== 'All') params.set('equipment', equipFilter);

      const res = await fetch(`/api/plans/programs/search?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setPrograms(data.programs || []);
      }
    } catch (err) {
      console.error('BrowseProgramsTab fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPrograms();
  }, [goalFilter, equipFilter]);

  const handleSearch = (e) => {
    e.preventDefault();
    fetchPrograms();
  };

  const handleApply = async (program) => {
    const token = localStorage.getItem('gymsync_token');
    if (!token) {
      toast.info('Please log in to apply a program.');
      return;
    }
    setApplying(program._id);
    try {
      const res = await fetch(`/api/plans/premade/${program._id}/apply`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ source: 'manual_browse' })
      });
      if (res.ok) {
        const data = await res.json();
        toast.success(`"${program.title}" applied to your training!`);
        if (onProgramApplied) onProgramApplied(data);
      } else {
        const err = await res.json();
        toast.error(err.message || 'Failed to apply program.');
      }
    } catch (err) {
      toast.error('Network error. Please try again.');
    } finally {
      setApplying(null);
    }
  };

  return (
    <div style={{ padding: '20px 0' }}>
      <div style={{ marginBottom: '20px' }}>
        <h2 style={{ margin: '0 0 6px 0', fontSize: '1.3rem' }}>Browse Instructor Programs</h2>
        <p style={{ color: 'var(--text-secondary)', margin: 0, fontSize: '0.9rem' }}>
          Select a verified instructor program to add directly to your training.
        </p>
      </div>

      {/* Search & Filters */}
      <form onSubmit={handleSearch} style={{ display: 'flex', gap: '10px', marginBottom: '16px', flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: '200px', position: 'relative' }}>
          <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#64748b' }} />
          <input
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search programs…"
            style={{ width: '100%', paddingLeft: '36px', padding: '10px 10px 10px 36px', background: 'var(--card-bg)', border: '1px solid var(--card-border)', borderRadius: '10px', color: 'var(--text-primary)', boxSizing: 'border-box' }}
          />
        </div>
        <select value={goalFilter} onChange={e => setGoalFilter(e.target.value)}
          style={{ padding: '10px', background: 'var(--card-bg)', border: '1px solid var(--card-border)', borderRadius: '10px', color: 'var(--text-primary)' }}>
          {GOALS.map(g => <option key={g} value={g}>{g}</option>)}
        </select>
        <select value={equipFilter} onChange={e => setEquipFilter(e.target.value)}
          style={{ padding: '10px', background: 'var(--card-bg)', border: '1px solid var(--card-border)', borderRadius: '10px', color: 'var(--text-primary)' }}>
          {EQUIPMENT.map(e => <option key={e} value={e}>{e}</option>)}
        </select>
        <button type="submit" className="btn btn-primary" style={{ padding: '10px 20px' }}>Search</button>
      </form>

      {/* Program Cards */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary)' }}>Loading programs…</div>
      ) : programs.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary)' }}>
          <Dumbbell size={40} style={{ opacity: 0.3, margin: '0 auto 12px auto' }} />
          <p>No programs found. Try adjusting your filters.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '16px' }}>
          {programs.map(prog => (
            <div key={prog._id} className="glass-panel" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '12px', border: '1px solid var(--card-border)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <span className="badge" style={{ background: 'rgba(99,102,241,0.15)', color: '#818cf8', fontSize: '0.75rem' }}>
                  {prog.difficulty || 'Beginner'}
                </span>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>by {prog.instructor || 'Instructor'}</span>
              </div>

              <h3 style={{ margin: 0, fontSize: '1rem', lineHeight: 1.4 }}>{prog.title || prog.sourceTitle}</h3>
              <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.85rem', lineHeight: 1.5 }}>
                {(prog.description || '').slice(0, 100)}{prog.description?.length > 100 ? '…' : ''}
              </p>

              <div style={{ display: 'flex', gap: '12px', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <Clock size={13} /> {prog.durationWeeks || 4} weeks
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <Target size={13} /> {prog.goal || 'General'}
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <Dumbbell size={13} /> {prog.daysPerWeek || 3}×/wk
                </span>
              </div>

              <button
                onClick={() => handleApply(prog)}
                disabled={applying === prog._id}
                className="btn btn-primary"
                style={{ marginTop: 'auto', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', fontSize: '0.9rem' }}
              >
                {applying === prog._id ? 'Applying…' : (
                  <>Apply Program <ChevronRight size={15} /></>
                )}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
