import React, { useState, useEffect } from 'react';
import { Search, Dumbbell, Clock, Target, ChevronRight, Check, ShieldAlert, TrendingDown, X, Info, Eye, Flame, Footprints, Calendar, Layers, Award, AlertCircle, CheckCircle2 } from 'lucide-react';
import { toast } from 'react-toastify';
import weightLossService from '../../features/weightLoss/weightLossService';
import { WeightLossMedicalWarningCard, MEDICAL_WARNING_VERSION } from '../../features/weightLoss/WeightLossMedicalWarningModal';

const GOALS = ['All', 'Weight Loss', 'Muscle Building', 'Endurance', 'Strength', 'General Fitness'];
const EQUIPMENT = ['All', 'Full Gym', 'Dumbbells', 'Bodyweight only', 'Resistance Bands'];

export const BrowseProgramsTab = ({ onProgramApplied, activeUserProgram }) => {
  const [query, setQuery] = useState('');
  const [goalFilter, setGoalFilter] = useState('All');
  const [equipFilter, setEquipFilter] = useState('All');
  const [programs, setPrograms] = useState([]);
  const [loading, setLoading] = useState(false);
  const [applying, setApplying] = useState(null);

  // Active program gate restriction
  const hasActiveProgram = Boolean(
    activeUserProgram &&
    activeUserProgram.isActive &&
    !activeUserProgram.isCompleted
  );

  // Program Details Modal State
  const [detailProgram, setDetailProgram] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailActiveTab, setDetailActiveTab] = useState('schedule'); // 'schedule' | 'cardio_recovery' | 'eligibility'
  const [detailSelectedWeek, setDetailSelectedWeek] = useState(1);

  // Weight Loss Modal State
  const [selectedWlProgram, setSelectedWlProgram] = useState(null);
  const [targetWeightKg, setTargetWeightKg] = useState('');
  const [targetDurationWeeks, setTargetDurationWeeks] = useState(12);
  const [medAck, setMedAck] = useState(false);
  const [seniorAck, setSeniorAck] = useState(false);
  const [projections, setProjections] = useState(null);
  const [calculatingProjections, setCalculatingProjections] = useState(false);
  const [enrollingWl, setEnrollingWl] = useState(false);
  const [eligibilityData, setEligibilityData] = useState(null);

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

  const cleanProgramTitle = (title) => {
    if (!title) return 'Workout Program';
    return title
      .replace(/^[HG][123]:\s*/i, '')
      .replace(/\s*-\s*4-Week Weight Loss/i, '')
      .replace(/\s*-\s*4\s*Weeks/i, '');
  };

  const cleanAuthorName = (author) => {
    if (!author) return 'Certified Trainer';
    const firstPart = author.split('(')[0].replace(/Head Coach\s*/i, 'Coach ').trim();
    return firstPart || 'GymSync Coach';
  };

  const handleSearch = (e) => {
    e.preventDefault();
    fetchPrograms();
  };

  const expandProgramWeeksClient = (weeks = [], targetDuration = 4) => {
    if (!Array.isArray(weeks) || weeks.length === 0) return [];
    if (weeks.length >= targetDuration) return weeks;

    const baseWeek = weeks[0];
    const weeklyThemes = [
      { num: 1, suffix: 'Foundation & Baseline Form', rpeAdd: 0, setAdd: 0 },
      { num: 2, suffix: 'Volume & Core Stability', rpeAdd: 0.5, setAdd: 0 },
      { num: 3, suffix: 'Peak Intensity & Muscular Endurance', rpeAdd: 1.0, setAdd: 1 },
      { num: 4, suffix: 'Consolidation & Peak Shred', rpeAdd: 1.0, setAdd: 1 }
    ];

    const fullWeeks = [];
    for (let w = 1; w <= targetDuration; w++) {
      const existing = weeks.find(x => x.weekNumber === w);
      if (existing) {
        fullWeeks.push(existing);
        continue;
      }

      const theme = weeklyThemes[w - 1] || {
        num: w,
        suffix: `Phase ${w} Progression`,
        rpeAdd: Math.min(1.5, (w - 1) * 0.5),
        setAdd: w > 2 ? 1 : 0
      };

      const newDays = (baseWeek.days || []).map(day => ({
        ...day,
        exercises: (day.exercises || []).map(ex => {
          if (ex.isWarmup || ex.isCooldown) return { ...ex };
          let sets = ex.sets;
          if (typeof sets === 'number' && theme.setAdd > 0 && sets < 4) sets += theme.setAdd;
          let rpe = ex.rpe;
          if (typeof rpe === 'number') rpe = Math.min(9, Math.round((rpe + theme.rpeAdd) * 10) / 10);
          return {
            ...ex,
            sets,
            rpe,
            notes: ex.notes ? `${ex.notes} (Week ${w} progressive target)` : `Week ${w} progressive target`
          };
        })
      }));

      fullWeeks.push({
        weekNumber: w,
        focus: `Week ${w}: ${theme.suffix} - Progressive overload & stamina adaptation`,
        days: newDays
      });
    }

    return fullWeeks;
  };

  const handleViewProgramDetails = async (program) => {
    setDetailLoading(true);
    setDetailActiveTab('schedule');
    setDetailSelectedWeek(1);

    const dur = program.durationWeeks || 4;
    const initialExpanded = expandProgramWeeksClient(program.weeks || [], dur);
    setDetailProgram({
      ...program,
      weeks: initialExpanded
    });

    try {
      const progId = program._id || program.id || program.sourceId;
      if (progId) {
        const res = await fetch(`/api/plans/premade/${progId}`);
        if (res.ok) {
          const full = await res.json();
          const fullExpanded = expandProgramWeeksClient(full.weeks || [], full.durationWeeks || dur);
          setDetailProgram({
            ...full,
            weeks: fullExpanded
          });
        }
      }
    } catch (e) {
      console.warn('Failed to fetch full program details:', e);
    } finally {
      setDetailLoading(false);
    }
  };


  const handleProgramClick = (program) => {
    if (hasActiveProgram) {
      const isThisActive =
        String(activeUserProgram._id) === String(program._id) ||
        String(activeUserProgram.sourceProgramId) === String(program._id) ||
        (activeUserProgram.title && activeUserProgram.title.trim().toLowerCase() === (program.title || '').trim().toLowerCase());

      if (isThisActive) {
        toast.info(`You are currently enrolled in "${activeUserProgram.title}". Check "My Plan" to view your workout schedule!`);
        return;
      }

      toast.warning(
        `You already have an active program ("${activeUserProgram.title}"). You cannot enroll in another program until it is finished or removed.`
      );
      return;
    }

    const isWeightLoss = (program.goal || program.category || '').toLowerCase().includes('weight loss') ||
      (program.title || '').toLowerCase().includes('weight loss');

    if (isWeightLoss) {
      setSelectedWlProgram(program);
      setMedAck(false);
      setSeniorAck(false);
      setProjections(null);

      // Verify eligibility in background
      weightLossService.checkEligibility()
        .then(res => setEligibilityData(res))
        .catch(err => {
          console.warn('Weight loss eligibility check notice:', err);
          setEligibilityData({ eligible: false, message: err?.message || 'Incomplete profile' });
        });
    } else {
      handleApplyStandard(program);
    }
  };

  const handleApplyStandard = async (program) => {
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
      const data = await res.json();
      if (res.ok) {
        if (data.alreadyEnrolled) {
          toast.info(`You are already enrolled in "${cleanProgramTitle(program.title)}".`);
        } else {
          toast.success(`"${cleanProgramTitle(program.title)}" applied to your training!`);
          if (onProgramApplied) onProgramApplied(data);
        }
      } else {
        toast.error(data.message || data.error || 'Failed to apply program.');
      }
    } catch (err) {
      toast.error('Network error. Please try again.');
    } finally {
      setApplying(null);
    }
  };

  // Recalculate projections when target weight changes in Weight Loss modal
  useEffect(() => {
    if (!selectedWlProgram || !targetWeightKg || Number(targetWeightKg) <= 0) {
      setProjections(null);
      return;
    }

    const timer = setTimeout(async () => {
      setCalculatingProjections(true);
      try {
        const res = await weightLossService.calculateProjections({
          targetWeightKg: Number(targetWeightKg),
          targetDurationWeeks: Number(targetDurationWeeks) || 12
        });
        setProjections(res);
      } catch (err) {
        console.warn('Projection calculation error:', err);
      } finally {
        setCalculatingProjections(false);
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [selectedWlProgram, targetWeightKg, targetDurationWeeks]);

  // Submit Weight Loss Enrollment
  const handleEnrollWeightLoss = async (e) => {
    e.preventDefault();
    if (!medAck) {
      toast.warn('Please review and acknowledge the medical safety disclaimer.');
      return;
    }

    if (hasActiveProgram) {
      toast.warning(`You already have an active program ("${activeUserProgram.title}"). You cannot enroll in another program until it is finished or removed.`);
      return;
    }

    setEnrollingWl(true);
    try {
      const payload = {
        targetDurationWeeks: Number(selectedWlProgram.durationWeeks) || 4,
        targetWeightKg: targetWeightKg ? Number(targetWeightKg) : undefined,
        medicalWarningAcknowledged: true,
        medicalWarningVersion: MEDICAL_WARNING_VERSION,
        seniorAcknowledged: seniorAck,
        selectedProgramId: selectedWlProgram._id || selectedWlProgram.id
      };

      const result = await weightLossService.enroll(payload);
      toast.success(`"${selectedWlProgram.title}" successfully applied to your training!`);
      setSelectedWlProgram(null);
      if (onProgramApplied) onProgramApplied(result);
    } catch (err) {
      toast.error(err?.data?.message || err?.message || 'Failed to apply weight loss program.');
    } finally {
      setEnrollingWl(false);
    }
  };

  return (
    <div style={{ padding: '20px 0' }}>
      <div style={{ marginBottom: '20px' }}>
        <h2 style={{ margin: '0 0 6px 0', fontSize: '1.3rem' }}>Browse Workout Programs</h2>
        <p style={{ color: 'var(--text-secondary)', margin: 0, fontSize: '0.9rem' }}>
          Explore programs authored by certified Fitness Instructors and Trainers. Instructors can customize and adapt these templates to your progress.
        </p>
      </div>

      {/* Active Program In Progress Notice */}
      {hasActiveProgram && (
        <div style={{
          background: 'rgba(239, 68, 68, 0.08)',
          border: '1px solid rgba(239, 68, 68, 0.3)',
          borderRadius: '12px',
          padding: '14px 18px',
          marginBottom: '20px',
          display: 'flex',
          alignItems: 'center',
          gap: '12px'
        }}>
          <AlertCircle color="#ef4444" size={24} style={{ flexShrink: 0 }} />
          <div>
            <div style={{ fontWeight: 700, color: '#f87171', fontSize: '0.95rem' }}>
              Active Program in Progress: "{cleanProgramTitle(activeUserProgram.title)}"
            </div>
            <div style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginTop: '2px' }}>
              GymSync restricts training to 1 active program at a time. To start a different program, please finish all workout sessions or un-enroll from your current program in <strong>My Plan</strong>.
            </div>
          </div>
        </div>
      )}

      {/* Goal Filter Pills */}
      <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', marginBottom: '16px', paddingBottom: '4px' }}>
        {GOALS.map(g => (
          <button
            key={g}
            type="button"
            onClick={() => setGoalFilter(g)}
            style={{
              padding: '6px 14px',
              borderRadius: '20px',
              fontSize: '0.85rem',
              fontWeight: 600,
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              border: goalFilter === g ? '1px solid #10b981' : '1px solid var(--card-border)',
              background: goalFilter === g ? 'rgba(16, 185, 129, 0.15)' : 'transparent',
              color: goalFilter === g ? '#10b981' : 'var(--text-secondary)'
            }}
          >
            {g === 'Weight Loss' ? '📉 Weight Loss Protocols' : g}
          </button>
        ))}
      </div>

      {/* Search & Filters */}
      <form onSubmit={handleSearch} style={{ display: 'flex', gap: '10px', marginBottom: '20px', flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: '200px', position: 'relative' }}>
          <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#64748b' }} />
          <input
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search programs by name, focus or exercises…"
            style={{ width: '100%', paddingLeft: '36px', padding: '10px 10px 10px 36px', background: 'var(--card-bg)', border: '1px solid var(--card-border)', borderRadius: '10px', color: 'var(--text-primary)', boxSizing: 'border-box' }}
          />
        </div>
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
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '18px' }}>
          {programs.map(prog => {
            const isWl = (prog.goal || prog.category || '').toLowerCase().includes('weight loss') ||
              (prog.title || '').toLowerCase().includes('weight loss');
            const isCurrentActive = hasActiveProgram && (
              String(activeUserProgram._id) === String(prog._id) ||
              String(activeUserProgram.sourceProgramId) === String(prog._id) ||
              (activeUserProgram.title && activeUserProgram.title.trim().toLowerCase() === (prog.title || '').trim().toLowerCase())
            );

            return (
              <div
                key={prog._id}
                className="glass-panel"
                style={{
                  padding: '22px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px',
                  border: isWl ? '1px solid rgba(16, 185, 129, 0.4)' : '1px solid var(--card-border)',
                  background: isWl ? 'rgba(16, 185, 129, 0.03)' : 'var(--card-bg-light)',
                  borderRadius: '16px'
                }}
              >
                {/* Clean Card Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' }}>
                  <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                    <span style={{
                      fontSize: '0.72rem',
                      fontWeight: 700,
                      padding: '3px 8px',
                      borderRadius: '6px',
                      background: isWl ? 'rgba(16, 185, 129, 0.15)' : 'rgba(99, 102, 241, 0.15)',
                      color: isWl ? '#10b981' : '#818cf8',
                      textTransform: 'uppercase',
                      letterSpacing: '0.4px'
                    }}>
                      {prog.equipmentTrack || (isWl ? 'Weight Loss' : 'Fitness')}
                    </span>
                    {prog.isExtremeProgram && (
                      <span style={{
                        fontSize: '0.72rem',
                        fontWeight: 700,
                        padding: '3px 8px',
                        borderRadius: '6px',
                        background: 'rgba(239, 68, 68, 0.15)',
                        color: '#ef4444'
                      }}>
                        🔥 Extreme
                      </span>
                    )}
                  </div>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                    by {cleanAuthorName(prog.createdBy || prog.instructor)}
                  </span>
                </div>

                {/* Clean Program Title */}
                <h3 style={{ margin: '2px 0 0', fontSize: '1.05rem', lineHeight: 1.35, color: 'var(--text-primary)', fontWeight: 700 }}>
                  {cleanProgramTitle(prog.title || prog.sourceTitle)}
                </h3>

                {/* Short Concise Description */}
                <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.84rem', lineHeight: 1.45, minHeight: '36px' }}>
                  {(prog.description || '').slice(0, 110)}{prog.description?.length > 110 ? '…' : ''}
                </p>

                {/* Essential Clean Metrics Row */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  background: 'rgba(255, 255, 255, 0.03)',
                  border: '1px solid var(--card-border)',
                  borderRadius: '10px',
                  padding: '9px 12px',
                  fontSize: '0.78rem',
                  color: 'var(--text-secondary)',
                  marginTop: 'auto'
                }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Clock size={13} color="var(--primary-accent)" /> {prog.durationWeeks || 4} Weeks
                  </span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Target size={13} color="#10b981" /> {prog.daysPerWeek || 4} Days/Wk
                  </span>
                  {prog.expectedLossMonth1 ? (
                    <span style={{ fontWeight: 700, color: '#10b981' }}>
                      🎯 {prog.expectedLossMonth1.minKg}–{prog.expectedLossMonth1.maxKg} kg
                    </span>
                  ) : (
                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Dumbbell size={13} /> {prog.difficulty || 'All Levels'}
                    </span>
                  )}
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginTop: 'auto', paddingTop: '10px' }}>
                  <button
                    type="button"
                    onClick={() => handleViewProgramDetails(prog)}
                    className="btn btn-outline"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px',
                      fontSize: '0.85rem',
                      padding: '9px 12px',
                      borderColor: 'rgba(255, 255, 255, 0.2)',
                      borderRadius: '8px',
                      background: 'rgba(255, 255, 255, 0.05)',
                      color: 'var(--text-primary)'
                    }}
                  >
                    <Eye size={15} /> View Program
                  </button>

                  {isCurrentActive ? (
                    <button
                      type="button"
                      disabled
                      className="btn"
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px',
                        fontSize: '0.85rem',
                        padding: '9px 12px',
                        borderRadius: '8px',
                        background: 'rgba(16, 185, 129, 0.2)',
                        color: '#10b981',
                        border: '1px solid rgba(16, 185, 129, 0.4)',
                        fontWeight: 600,
                        cursor: 'default'
                      }}
                    >
                      <Check size={15} /> Currently Active
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleProgramClick(prog)}
                      disabled={applying === prog._id}
                      className="btn btn-primary"
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px',
                        fontSize: '0.85rem',
                        padding: '9px 12px',
                        borderRadius: '8px',
                        background: hasActiveProgram ? 'rgba(255, 255, 255, 0.08)' : (isWl ? '#10b981' : undefined),
                        color: hasActiveProgram ? 'var(--text-secondary)' : undefined,
                        border: hasActiveProgram ? '1px dashed var(--card-border)' : undefined
                      }}
                      title={hasActiveProgram ? `Finish or un-enroll from "${cleanProgramTitle(activeUserProgram.title)}" first` : 'Start this program'}
                    >
                      {applying === prog._id ? 'Starting…' : (
                        <>
                          Start Program <ChevronRight size={15} />
                        </>
                      )}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── PROGRAM DETAILS MODAL (Full Syllabus, Warm-up, Alternatives, Cardio, Rules) ── */}
      {detailProgram && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.8)',
          backdropFilter: 'blur(6px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          padding: '20px'
        }}>
          <div style={{
            background: 'var(--card-bg)',
            border: '1px solid var(--card-border)',
            borderRadius: '20px',
            width: '100%',
            maxWidth: '850px',
            maxHeight: '90vh',
            overflowY: 'auto',
            padding: '24px',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
            boxShadow: '0 20px 40px rgba(0,0,0,0.5)'
          }}>
            {/* Modal Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '14px' }}>
              <div>
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '6px' }}>
                  <span className="badge" style={{ background: 'rgba(16, 185, 129, 0.15)', color: '#10b981', fontSize: '0.75rem', fontWeight: 700 }}>
                    {detailProgram.goal || detailProgram.category || 'Workout Program'}
                  </span>
                  {detailProgram.equipmentTrack && (
                    <span className="badge" style={{
                      background: detailProgram.equipmentTrack.includes('Gym') ? 'rgba(59,130,246,0.15)' : 'rgba(16,185,129,0.12)',
                      color: detailProgram.equipmentTrack.includes('Gym') ? '#3b82f6' : '#10b981',
                      fontSize: '0.72rem',
                      fontWeight: 600
                    }}>
                      {detailProgram.equipmentTrack}
                    </span>
                  )}
                  {detailProgram.programLevel && (
                    <span className="badge" style={{ background: 'rgba(255,255,255,0.08)', color: 'var(--text-primary)', fontSize: '0.72rem', fontWeight: 600 }}>
                      Level: {detailProgram.programLevel}
                    </span>
                  )}
                  {detailProgram.isExtremeProgram && (
                    <span className="badge" style={{ background: 'rgba(239,68,68,0.15)', color: '#ef4444', fontSize: '0.72rem', fontWeight: 700 }}>
                      🔥 Extreme Heavy Fat Loss
                    </span>
                  )}
                </div>

                <h2 style={{ margin: 0, fontSize: '1.3rem', fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1.3 }}>
                  {detailProgram.title || detailProgram.sourceTitle}
                </h2>
                <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                  Curated by <strong>{detailProgram.createdBy || detailProgram.instructor || 'Certified Fitness Trainer'}</strong> • Version {detailProgram.version || 1}
                </span>
              </div>

              <button
                type="button"
                onClick={() => setDetailProgram(null)}
                style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', padding: '4px' }}
                title="Close Details"
              >
                <X size={22} />
              </button>
            </div>

            {/* Extreme Warning Banner if Applicable */}
            {detailProgram.isExtremeProgram && (
              <div style={{
                background: 'rgba(239, 68, 68, 0.1)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                borderRadius: '10px',
                padding: '12px 14px',
                color: '#ef4444',
                fontSize: '0.84rem',
                display: 'flex',
                alignItems: 'center',
                gap: '10px'
              }}>
                <Flame size={20} style={{ flexShrink: 0 }} />
                <div>
                  <strong>Heavy Extreme Fat Loss Program:</strong> Designed for conditioned lifters wanting high metabolic caloric burn and lean mass retention. Requires established workout foundation.
                </div>
              </div>
            )}

            {/* Overview Quick Bar */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
              gap: '10px',
              background: 'rgba(255,255,255,0.03)',
              border: '1px solid var(--card-border)',
              borderRadius: '12px',
              padding: '12px 16px'
            }}>
              <div>
                <span style={{ display: 'block', fontSize: '0.72rem', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 600 }}>
                  Duration & Frequency
                </span>
                <span style={{ fontSize: '0.92rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                  {detailProgram.durationWeeks || 4} Weeks • {detailProgram.daysPerWeek || 4} Days/Wk
                </span>
              </div>
              <div>
                <span style={{ display: 'block', fontSize: '0.72rem', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 600 }}>
                  Equipment Required
                </span>
                <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                  {Array.isArray(detailProgram.equipmentRequired) && detailProgram.equipmentRequired.length > 0
                    ? detailProgram.equipmentRequired.join(', ')
                    : 'No Equipment (Bodyweight)'}
                </span>
              </div>
              {detailProgram.expectedLossMonth1 && (
                <div>
                  <span style={{ display: 'block', fontSize: '0.72rem', color: '#10b981', textTransform: 'uppercase', fontWeight: 600 }}>
                    Month 1 Safe Estimate
                  </span>
                  <span style={{ fontSize: '0.92rem', fontWeight: 700, color: '#10b981' }}>
                    {detailProgram.expectedLossMonth1.minKg} – {detailProgram.expectedLossMonth1.maxKg} kg
                  </span>
                </div>
              )}
            </div>

            {/* Modal Internal Sub-Tabs */}
            <div style={{ display: 'flex', gap: '8px', borderBottom: '1px solid var(--card-border)', paddingBottom: '8px', flexWrap: 'wrap' }}>
              <button
                type="button"
                className={`btn btn-sm ${detailActiveTab === 'schedule' ? 'btn-primary' : 'btn-outline'}`}
                onClick={() => setDetailActiveTab('schedule')}
              >
                <Calendar size={14} /> 1. Weekly Workout Schedule ({detailProgram.weeks?.length || 4} Wks)
              </button>
              <button
                type="button"
                className={`btn btn-sm ${detailActiveTab === 'cardio_recovery' ? 'btn-primary' : 'btn-outline'}`}
                onClick={() => setDetailActiveTab('cardio_recovery')}
              >
                <Footprints size={14} /> 2. Cardio & Missed Day Recovery Rules
              </button>
              <button
                type="button"
                className={`btn btn-sm ${detailActiveTab === 'eligibility' ? 'btn-primary' : 'btn-outline'}`}
                onClick={() => setDetailActiveTab('eligibility')}
              >
                <ShieldAlert size={14} /> 3. Eligibility, Age & Health Rules
              </button>
            </div>

            {/* TAB 1: WEEKLY WORKOUT SCHEDULE */}
            {detailActiveTab === 'schedule' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                {/* Week Selector Pills */}
                {detailProgram.weeks && detailProgram.weeks.length > 0 && (
                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                    {detailProgram.weeks.map(wk => (
                      <button
                        key={wk.weekNumber}
                        type="button"
                        onClick={() => setDetailSelectedWeek(wk.weekNumber)}
                        className={`btn btn-sm ${detailSelectedWeek === wk.weekNumber ? 'btn-primary' : 'btn-outline'}`}
                        style={{ fontSize: '0.8rem', padding: '4px 10px' }}
                      >
                        Week {wk.weekNumber}
                      </button>
                    ))}
                  </div>
                )}

                {/* Selected Week Days */}
                {(() => {
                  const currentWkObj = (detailProgram.weeks || []).find(w => w.weekNumber === detailSelectedWeek) || detailProgram.weeks?.[0];
                  if (!currentWkObj) {
                    return <div style={{ color: 'var(--text-secondary)', padding: '16px' }}>Detailed schedule loading…</div>;
                  }

                  return (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      {currentWkObj.focus && (
                        <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontStyle: 'italic', padding: '4px 0' }}>
                          🎯 <strong>Week Focus:</strong> {currentWkObj.focus}
                        </div>
                      )}

                      {(currentWkObj.days || []).map((day, dIdx) => (
                        <div
                          key={dIdx}
                          style={{
                            background: day.isRestDay ? 'rgba(255,255,255,0.015)' : 'rgba(0,0,0,0.25)',
                            border: '1px solid var(--card-border)',
                            borderRadius: '12px',
                            padding: '14px'
                          }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', flexWrap: 'wrap', gap: '6px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <span style={{ fontWeight: 800, color: 'var(--primary-accent)', fontSize: '0.95rem' }}>
                                Day {day.dayNumber}: {day.title || 'Session'}
                              </span>
                              {day.isRestDay && (
                                <span style={{ fontSize: '0.72rem', padding: '2px 6px', borderRadius: '4px', background: 'rgba(255,255,255,0.1)', color: 'var(--text-secondary)' }}>
                                  Rest & Recovery
                                </span>
                              )}
                            </div>
                            {day.focus && (
                              <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                                Focus: {day.focus}
                              </span>
                            )}
                          </div>

                          {/* Exercises List for Day */}
                          {day.exercises && day.exercises.length > 0 ? (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                              {day.exercises.map((ex, exIdx) => (
                                <div
                                  key={exIdx}
                                  style={{
                                    background: ex.isWarmup
                                      ? 'rgba(245,158,11,0.08)'
                                      : ex.isCardio
                                      ? 'rgba(59,130,246,0.08)'
                                      : ex.isCooldown
                                      ? 'rgba(139,92,246,0.08)'
                                      : 'rgba(255,255,255,0.02)',
                                    border: ex.isWarmup
                                      ? '1px solid rgba(245,158,11,0.25)'
                                      : ex.isCardio
                                      ? '1px solid rgba(59,130,246,0.25)'
                                      : ex.isCooldown
                                      ? '1px solid rgba(139,92,246,0.25)'
                                      : '1px solid rgba(255,255,255,0.04)',
                                    borderRadius: '8px',
                                    padding: '10px'
                                  }}
                                >
                                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '6px' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                      <span style={{ fontWeight: 700, fontSize: '0.88rem', color: 'var(--text-primary)' }}>
                                        {exIdx + 1}. {ex.name}
                                      </span>
                                      {ex.isWarmup && (
                                        <span style={{ fontSize: '0.68rem', padding: '1px 5px', borderRadius: '4px', background: '#f59e0b', color: '#000', fontWeight: 800 }}>
                                          WARM-UP (EX #1)
                                        </span>
                                      )}
                                      {ex.isCardio && (
                                        <span style={{ fontSize: '0.68rem', padding: '1px 5px', borderRadius: '4px', background: '#3b82f6', color: '#fff', fontWeight: 700 }}>
                                          CARDIO
                                        </span>
                                      )}
                                      {ex.isCooldown && (
                                        <span style={{ fontSize: '0.68rem', padding: '1px 5px', borderRadius: '4px', background: '#8b5cf6', color: '#fff', fontWeight: 700 }}>
                                          COOL-DOWN
                                        </span>
                                      )}
                                    </div>

                                    <div style={{ display: 'flex', gap: '8px', fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                                      <span><strong>{ex.sets || 2}</strong> sets × <strong>{ex.reps || '10'}</strong></span>
                                      {ex.restSeconds ? <span>• Rest: {ex.restSeconds}s</span> : null}
                                      {ex.rpe ? <span>• RPE {ex.rpe}</span> : null}
                                    </div>
                                  </div>

                                  {/* Notes & Form Cue */}
                                  {(ex.notes || ex.keyCue) && (
                                    <div style={{ fontSize: '0.8rem', color: '#fbbf24', marginTop: '4px' }}>
                                      💡 <strong>Form Cue / Notes:</strong> {ex.keyCue || ex.notes}
                                    </div>
                                  )}

                                  {/* Easier & Harder Alternatives */}
                                  {(ex.easierOption || ex.harderOption) && (
                                    <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', fontSize: '0.76rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
                                      {ex.easierOption && (
                                        <div>
                                          <span style={{ color: '#10b981', fontWeight: 700 }}>Easier Alternative:</span> {ex.easierOption}
                                        </div>
                                      )}
                                      {ex.harderOption && (
                                        <div>
                                          <span style={{ color: '#f59e0b', fontWeight: 700 }}>Harder Progression:</span> {ex.harderOption}
                                        </div>
                                      )}
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', fontStyle: 'italic' }}>
                              {day.isRestDay ? 'Scheduled full rest day for tissue repair and nervous system recovery.' : 'Rest and gentle walking day.'}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  );
                })()}
              </div>
            )}

            {/* TAB 2: CARDIO & MISSED DAY RECOVERY */}
            {detailActiveTab === 'cardio_recovery' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                {/* Cardio Prescription Card */}
                <div style={{
                  background: 'rgba(59, 130, 246, 0.06)',
                  border: '1px solid rgba(59, 130, 246, 0.25)',
                  borderRadius: '12px',
                  padding: '16px'
                }}>
                  <h3 style={{ margin: '0 0 10px 0', fontSize: '1rem', color: '#3b82f6', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Footprints size={18} /> Walking & Running Cardio Prescription
                  </h3>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '10px', marginBottom: '12px' }}>
                    <div style={{ background: 'var(--card-bg)', padding: '10px', borderRadius: '8px', border: '1px solid var(--card-border)' }}>
                      <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', display: 'block' }}>Daily Walk</span>
                      <strong style={{ fontSize: '1rem', color: 'var(--text-primary)' }}>{detailProgram.cardioPrescription?.dailyMinutes || 20} mins</strong>
                    </div>
                    <div style={{ background: 'var(--card-bg)', padding: '10px', borderRadius: '8px', border: '1px solid var(--card-border)' }}>
                      <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', display: 'block' }}>Saturday Long Walk</span>
                      <strong style={{ fontSize: '1rem', color: 'var(--text-primary)' }}>{detailProgram.cardioPrescription?.saturdayMinutes || 35} mins</strong>
                    </div>
                    <div style={{ background: 'var(--card-bg)', padding: '10px', borderRadius: '8px', border: '1px solid var(--card-border)' }}>
                      <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', display: 'block' }}>Interval Rounds</span>
                      <strong style={{ fontSize: '1rem', color: 'var(--text-primary)' }}>{detailProgram.cardioPrescription?.intervalRounds || 0} rounds</strong>
                    </div>
                    <div style={{ background: 'var(--card-bg)', padding: '10px', borderRadius: '8px', border: '1px solid var(--card-border)' }}>
                      <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', display: 'block' }}>Target Effort</span>
                      <strong style={{ fontSize: '1rem', color: 'var(--text-primary)' }}>{detailProgram.cardioPrescription?.effortRPE || 'RPE 5-6'}</strong>
                    </div>
                  </div>
                  <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                    {detailProgram.cardioPrescription?.description || 'Daily structured walking habit to stimulate base fat oxidation while avoiding central nervous system exhaustion.'}
                  </p>
                </div>

                {/* Missed Day Recovery Card */}
                <div style={{
                  background: 'rgba(245, 158, 11, 0.06)',
                  border: '1px solid rgba(245, 158, 11, 0.25)',
                  borderRadius: '12px',
                  padding: '16px'
                }}>
                  <h3 style={{ margin: '0 0 10px 0', fontSize: '1rem', color: '#f59e0b', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Clock size={18} /> Missed Day Recovery Rules ("Ager user miss kerday toh kya kerna parega")
                  </h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.85rem' }}>
                    <div style={{ background: 'var(--card-bg)', padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--card-border)' }}>
                      <strong style={{ color: '#10b981' }}>Missed 1 to 3 Days:</strong> {detailProgram.missedDayPolicy?.rule1To3Days || 'Never double up. Carry on with the scheduled routine.'}
                    </div>
                    <div style={{ background: 'var(--card-bg)', padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--card-border)' }}>
                      <strong style={{ color: '#f59e0b' }}>Missed 4 to 7 Days:</strong> {detailProgram.missedDayPolicy?.rule4To7Days || 'Repeat the current week before advancing.'}
                    </div>
                    <div style={{ background: 'var(--card-bg)', padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--card-border)' }}>
                      <strong style={{ color: '#ef4444' }}>Missed More Than 7 Days:</strong> {detailProgram.missedDayPolicy?.ruleMoreThan7Days || 'Restart Week 1 to safely re-adapt connective tissues.'}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 3: ELIGIBILITY, AGE & HEALTH RULES */}
            {detailActiveTab === 'eligibility' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div style={{
                  background: 'rgba(255,255,255,0.03)',
                  border: '1px solid var(--card-border)',
                  borderRadius: '12px',
                  padding: '16px'
                }}>
                  <h3 style={{ margin: '0 0 12px 0', fontSize: '1rem', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <ShieldAlert size={18} color="#3b82f6" /> Eligibility Boundaries & Health Gating (Section 2)
                  </h3>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '10px', marginBottom: '14px' }}>
                    <div style={{ background: 'rgba(0,0,0,0.2)', padding: '10px', borderRadius: '8px', border: '1px solid var(--card-border)' }}>
                      <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>Age Eligibility</span>
                      <strong style={{ fontSize: '0.92rem', color: 'var(--text-primary)', display: 'block' }}>
                        {detailProgram.minAge || 18} to {detailProgram.maxAge || 65} Years
                      </strong>
                      <span style={{ fontSize: '0.68rem', color: '#ef4444' }}>Strictly 18+ (No under 18)</span>
                    </div>

                    <div style={{ background: 'rgba(0,0,0,0.2)', padding: '10px', borderRadius: '8px', border: '1px solid var(--card-border)' }}>
                      <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>BMI Eligibility</span>
                      <strong style={{ fontSize: '0.92rem', color: 'var(--text-primary)', display: 'block' }}>
                        BMI {detailProgram.minBMI || 23} to {detailProgram.maxBMI || 50}
                      </strong>
                      <span style={{ fontSize: '0.68rem', color: 'var(--text-secondary)' }}>South Asian cutoff: 23+</span>
                    </div>

                    <div style={{ background: 'rgba(0,0,0,0.2)', padding: '10px', borderRadius: '8px', border: '1px solid var(--card-border)' }}>
                      <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>Starting Weight</span>
                      <strong style={{ fontSize: '0.92rem', color: 'var(--text-primary)', display: 'block' }}>
                        {detailProgram.minWeightKg || 50} kg to {detailProgram.maxWeightKg || 180} kg
                      </strong>
                      <span style={{ fontSize: '0.68rem', color: 'var(--text-secondary)' }}>120kg+: low-impact starter</span>
                    </div>
                  </div>

                  {/* Who Can Do & Who Should Not Do */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '14px' }}>
                    <div style={{ background: 'rgba(16,185,129,0.05)', border: '1px solid rgba(16,185,129,0.2)', borderRadius: '10px', padding: '12px' }}>
                      <strong style={{ color: '#10b981', fontSize: '0.85rem', display: 'block', marginBottom: '6px' }}>
                        ✓ Who Can Do This Program:
                      </strong>
                      <ul style={{ margin: 0, paddingLeft: '18px', fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                        {Array.isArray(detailProgram.whoCanDo) && detailProgram.whoCanDo.length > 0 ? (
                          detailProgram.whoCanDo.map((item, idx) => <li key={idx}>{item}</li>)
                        ) : (
                          <>
                            <li>Adults (18+) with BMI 23+ seeking structured fat loss</li>
                            <li>Individuals clearing the baseline health acknowledgment</li>
                          </>
                        )}
                      </ul>
                    </div>

                    <div style={{ background: 'rgba(239,68,68,0.05)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: '10px', padding: '12px' }}>
                      <strong style={{ color: '#ef4444', fontSize: '0.85rem', display: 'block', marginBottom: '6px' }}>
                        ✕ Who Should NOT Do This Program:
                      </strong>
                      <ul style={{ margin: 0, paddingLeft: '18px', fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                        {Array.isArray(detailProgram.whoShouldNotDo) && detailProgram.whoShouldNotDo.length > 0 ? (
                          detailProgram.whoShouldNotDo.map((item, idx) => <li key={idx}>{item}</li>)
                        ) : (
                          <>
                            <li>Individuals under 18 years of age</li>
                            <li>BMI under 18.5 (underweight)</li>
                            <li>Pregnancy, breastfeeding, or unmanaged cardiac/joint conditions</li>
                          </>
                        )}
                      </ul>
                    </div>
                  </div>

                  {/* Medical Warning Box */}
                  <div style={{
                    background: 'rgba(239,68,68,0.08)',
                    border: '1px solid rgba(239,68,68,0.3)',
                    borderRadius: '10px',
                    padding: '12px 14px',
                    color: '#ef4444',
                    fontSize: '0.8rem',
                    lineHeight: 1.45
                  }}>
                    <strong>⚠️ Mandatory Medical Notice:</strong> {detailProgram.medicalWarningText || 'Do NOT start without doctor approval if you have heart disease, high/low BP, diabetes, asthma, joint or back injury, or take regular medication. Stop at once if you feel chest pain, dizziness, or shortness of breath.'}
                  </div>
                </div>
              </div>
            )}

            {/* Modal Bottom Actions */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--card-border)', paddingTop: '14px', marginTop: '6px', flexWrap: 'wrap', gap: '10px' }}>
              <button
                type="button"
                className="btn btn-outline"
                onClick={() => setDetailProgram(null)}
              >
                Close Details
              </button>

              {(() => {
                const isDetailActive = hasActiveProgram && detailProgram && (
                  String(activeUserProgram._id) === String(detailProgram._id) ||
                  String(activeUserProgram.sourceProgramId) === String(detailProgram._id) ||
                  (activeUserProgram.title && activeUserProgram.title.trim().toLowerCase() === (detailProgram.title || '').trim().toLowerCase())
                );

                if (isDetailActive) {
                  return (
                    <button
                      type="button"
                      disabled
                      className="btn"
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        background: 'rgba(16, 185, 129, 0.2)',
                        color: '#10b981',
                        border: '1px solid rgba(16, 185, 129, 0.4)',
                        fontWeight: 600,
                        cursor: 'default'
                      }}
                    >
                      <Check size={16} /> Currently Active Program
                    </button>
                  );
                }

                return (
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={() => {
                      const p = detailProgram;
                      setDetailProgram(null);
                      handleProgramClick(p);
                    }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      background: hasActiveProgram ? 'rgba(255, 255, 255, 0.08)' : ((detailProgram.goal || detailProgram.category || '').toLowerCase().includes('weight loss') ? '#10b981' : undefined),
                      color: hasActiveProgram ? 'var(--text-secondary)' : undefined,
                      border: hasActiveProgram ? '1px dashed var(--card-border)' : undefined
                    }}
                  >
                    Start This Program <ChevronRight size={16} />
                  </button>
                );
              })()}
            </div>

          </div>
        </div>
      )}

      {/* ── WEIGHT LOSS ENROLLMENT & MEDICAL SAFETY MODAL ── */}
      {selectedWlProgram && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.75)',
          backdropFilter: 'blur(5px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          padding: '20px'
        }}>
          <div style={{
            background: 'var(--card-bg)',
            border: '1px solid var(--card-border)',
            borderRadius: '20px',
            width: '100%',
            maxWidth: '650px',
            maxHeight: '90vh',
            overflowY: 'auto',
            padding: '24px',
            display: 'flex',
            flexDirection: 'column',
            gap: '18px'
          }}>
            {/* Modal Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#10b981', textTransform: 'uppercase' }}>
                  Instructor Workout Program
                </span>
                <h3 style={{ margin: '4px 0 0', fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                  {selectedWlProgram.title}
                </h3>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                  Authored by {selectedWlProgram.createdBy || 'Certified Fitness Trainer'}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setSelectedWlProgram(null)}
                style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Eligibility Warnings */}
            {eligibilityData?.code === 'INCOMPLETE_BIO' && (
              <div style={{
                padding: '12px 16px',
                borderRadius: '10px',
                background: 'rgba(239, 68, 68, 0.1)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                color: '#ef4444',
                fontSize: '0.85rem'
              }}>
                <strong>Profile Incomplete (Rule R4):</strong> Please complete your profile with height, weight, age, equipment, and training days first.
              </div>
            )}

            {eligibilityData?.code === 'UNDERAGE' && (
              <div style={{
                padding: '12px 16px',
                borderRadius: '10px',
                background: 'rgba(239, 68, 68, 0.1)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                color: '#ef4444',
                fontSize: '0.85rem'
              }}>
                <strong>Age Restriction:</strong> Weight-loss programs are restricted to adults aged 18 and older.
              </div>
            )}

            {(hasActiveProgram || eligibilityData?.code === 'ACTIVE_PROGRAM_EXISTS') && (
              <div style={{
                padding: '12px 16px',
                borderRadius: '10px',
                background: 'rgba(239, 68, 68, 0.1)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                color: '#ef4444',
                fontSize: '0.85rem'
              }}>
                <strong>Active Program in Progress:</strong> You already have an active program ('{activeUserProgram?.title || eligibilityData?.activeProgram?.title || 'Current Program'}'). You cannot enroll in a new program until your current program is finished or removed.
              </div>
            )}


            {/* Medical Warning Card */}
            <WeightLossMedicalWarningCard
              acknowledged={medAck}
              onToggleAcknowledge={setMedAck}
              isSenior={eligibilityData?.isSenior}
              seniorAcknowledged={seniorAck}
              onToggleSeniorAcknowledge={setSeniorAck}
            />

            {/* Trainer Program Specifications & Expected Weight Loss Card */}
            <div style={{
              background: 'rgba(16, 185, 129, 0.08)',
              border: '1px solid rgba(16, 185, 129, 0.3)',
              borderRadius: '12px',
              padding: '14px 16px',
              display: 'flex',
              flexDirection: 'column',
              gap: '10px'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Calendar size={18} color="#10b981" />
                  <div>
                    <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 600, display: 'block' }}>
                      Program Duration & Frequency
                    </span>
                    <strong style={{ fontSize: '0.95rem', color: 'var(--text-primary)' }}>
                      {selectedWlProgram.durationWeeks || 4} Weeks (1 Month) • {selectedWlProgram.daysPerWeek || 4} Days / Week
                    </strong>
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <span style={{ fontSize: '0.72rem', color: '#10b981', textTransform: 'uppercase', fontWeight: 600, display: 'block' }}>
                    Trainer Safe Expected Loss
                  </span>
                  <strong style={{ fontSize: '1rem', color: '#10b981' }}>
                    {selectedWlProgram.expectedLossMonth1 ? (
                      `${selectedWlProgram.expectedLossMonth1.minKg} – ${selectedWlProgram.expectedLossMonth1.maxKg} kg`
                    ) : (
                      '1.0 – 3.0 kg / Month'
                    )}
                  </strong>
                </div>
              </div>
              {selectedWlProgram.expectedLossMonth1?.note && (
                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', borderTop: '1px solid rgba(16, 185, 129, 0.15)', paddingTop: '6px' }}>
                  💡 {selectedWlProgram.expectedLossMonth1.note}
                </div>
              )}
            </div>


            {/* Action Buttons */}
            {(() => {
              const isBlockedByBio = eligibilityData?.code === 'INCOMPLETE_BIO';
              const isBlockedByAge = eligibilityData?.code === 'UNDERAGE';
              const isBlockedByActiveProg = Boolean(hasActiveProgram || eligibilityData?.code === 'ACTIVE_PROGRAM_EXISTS');
              const isSeniorNeedsAck = eligibilityData?.isSenior && !seniorAck;
              const isDisabled = !medAck || enrollingWl || isBlockedByBio || isBlockedByAge || isBlockedByActiveProg || isSeniorNeedsAck;

              return (
                <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '6px' }}>
                  <button
                    type="button"
                    onClick={() => setSelectedWlProgram(null)}
                    style={{
                      padding: '10px 18px',
                      borderRadius: '10px',
                      border: '1px solid var(--card-border)',
                      background: 'transparent',
                      color: 'var(--text-secondary)',
                      cursor: 'pointer',
                      fontWeight: 600
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleEnrollWeightLoss}
                    disabled={isDisabled}
                    style={{
                      padding: '10px 22px',
                      borderRadius: '10px',
                      border: 'none',
                      background: isDisabled ? '#9ca3af' : '#10b981',
                      color: '#fff',
                      cursor: isDisabled ? 'not-allowed' : 'pointer',
                      fontWeight: 700,
                      opacity: isDisabled ? 0.65 : 1,
                      transition: 'all 0.2s'
                    }}
                  >
                    {enrollingWl ? 'Starting Program…' : 'Confirm & Start Program'}
                  </button>
                </div>
              );
            })()}

          </div>
        </div>
      )}
    </div>
  );
};

export default BrowseProgramsTab;
