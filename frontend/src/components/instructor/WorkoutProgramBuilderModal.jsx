import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Dumbbell, Calendar, Info, Clock, CheckCircle, ChevronDown, ChevronRight, Layers } from 'lucide-react';
import Modal from '../common/Modal';

const WorkoutProgramBuilderModal = ({
  isOpen,
  onClose,
  onSave,
  editingProgram = null,
  availableExercises = []
}) => {
  const [activeTab, setActiveTab] = useState('meta'); // 'meta' | 'schedule'
  const [activeWeekIndex, setActiveWeekIndex] = useState(0);

  // Form Metadata
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [goal, setGoal] = useState('Muscle Building');
  const [difficulty, setDifficulty] = useState('Intermediate');
  const [durationWeeks, setDurationWeeks] = useState(4);
  const [daysPerWeek, setDaysPerWeek] = useState(4);
  const [sportTags, setSportTags] = useState('General, Bodybuilding');
  const [equipmentRequired, setEquipmentRequired] = useState('Barbell, Dumbbells');
  const [status, setStatus] = useState('published');

  // Structured Weeks & Days
  const [weeks, setWeeks] = useState([
    {
      weekNumber: 1,
      focus: 'Foundational Phase',
      days: [
        {
          dayNumber: 1,
          title: 'Upper Body Power',
          focus: 'Chest & Back',
          warmup: [{ text: 'Shoulder circles & band pull-aparts', duration: 5 }],
          exercises: [],
          cooldown: [{ text: 'Static chest stretch', duration: 5 }],
          notes: 'Focus on clean eccentric control'
        }
      ]
    }
  ]);

  useEffect(() => {
    if (editingProgram) {
      setTitle(editingProgram.title || '');
      setDescription(editingProgram.description || '');
      setGoal(editingProgram.goal || editingProgram.category || 'Muscle Building');
      setDifficulty(editingProgram.difficulty || 'Intermediate');
      setDurationWeeks(editingProgram.durationWeeks || 4);
      setDaysPerWeek(editingProgram.daysPerWeek || 4);
      setSportTags(Array.isArray(editingProgram.sportTags) ? editingProgram.sportTags.join(', ') : (editingProgram.sportTags || ''));
      setEquipmentRequired(Array.isArray(editingProgram.equipmentRequired) ? editingProgram.equipmentRequired.join(', ') : (editingProgram.equipmentRequired || ''));
      setStatus(editingProgram.status || 'published');

      if (Array.isArray(editingProgram.weeks) && editingProgram.weeks.length > 0) {
        setWeeks(editingProgram.weeks);
      } else {
        setWeeks([
          {
            weekNumber: 1,
            focus: 'Phase 1',
            days: [
              {
                dayNumber: 1,
                title: 'Workout Day 1',
                focus: editingProgram.category || 'General',
                warmup: [{ text: 'General dynamic warm-up', duration: 5 }],
                exercises: [],
                cooldown: [{ text: 'Cooldown stretches', duration: 5 }],
                notes: ''
              }
            ]
          }
        ]);
      }
    } else {
      setTitle('');
      setDescription('');
      setGoal('Muscle Building');
      setDifficulty('Intermediate');
      setDurationWeeks(4);
      setDaysPerWeek(4);
      setSportTags('General, Bodybuilding');
      setEquipmentRequired('Barbell, Dumbbells');
      setStatus('published');
      setWeeks([
        {
          weekNumber: 1,
          focus: 'Base Hypertrophy',
          days: [
            {
              dayNumber: 1,
              title: 'Day 1: Upper Body',
              focus: 'Chest & Upper Back',
              warmup: [{ text: 'Shoulder rotations & push-ups', duration: 5 }],
              exercises: [],
              cooldown: [{ text: 'Chest & shoulder stretch', duration: 5 }],
              notes: 'Keep rest times strict'
            }
          ]
        }
      ]);
    }
    setActiveTab('meta');
    setActiveWeekIndex(0);
  }, [editingProgram, isOpen]);

  // Week Management
  const addWeek = () => {
    const nextNum = weeks.length + 1;
    const newWeek = {
      weekNumber: nextNum,
      focus: `Phase ${nextNum}`,
      days: [
        {
          dayNumber: 1,
          title: `Day 1 - Week ${nextNum}`,
          focus: 'Main Session',
          warmup: [{ text: 'Dynamic warm-up', duration: 5 }],
          exercises: [],
          cooldown: [{ text: 'Static stretches', duration: 5 }],
          notes: ''
        }
      ]
    };
    setWeeks([...weeks, newWeek]);
    setActiveWeekIndex(weeks.length);
  };

  const removeWeek = (indexToRemove) => {
    if (weeks.length <= 1) return;
    const updated = weeks.filter((_, i) => i !== indexToRemove).map((w, i) => ({
      ...w,
      weekNumber: i + 1
    }));
    setWeeks(updated);
    setActiveWeekIndex(Math.max(0, indexToRemove - 1));
  };

  // Day Management
  const addDay = (weekIdx) => {
    const currentDays = weeks[weekIdx].days || [];
    const nextDayNum = currentDays.length + 1;
    const newDay = {
      dayNumber: nextDayNum,
      title: `Day ${nextDayNum}: Session`,
      focus: 'Hypertrophy / Conditioning',
      warmup: [{ text: 'Joint mobility & activation', duration: 5 }],
      exercises: [],
      cooldown: [{ text: 'Foam rolling & stretching', duration: 5 }],
      notes: ''
    };

    const updatedWeeks = [...weeks];
    updatedWeeks[weekIdx].days = [...currentDays, newDay];
    setWeeks(updatedWeeks);
  };

  const removeDay = (weekIdx, dayIdx) => {
    const currentDays = weeks[weekIdx].days || [];
    if (currentDays.length <= 1) return;
    const updatedDays = currentDays.filter((_, i) => i !== dayIdx).map((d, i) => ({
      ...d,
      dayNumber: i + 1
    }));
    const updatedWeeks = [...weeks];
    updatedWeeks[weekIdx].days = updatedDays;
    setWeeks(updatedWeeks);
  };

  // Exercise Management within a Day
  const addExerciseToDay = (weekIdx, dayIdx, exerciseObj) => {
    if (!exerciseObj) return;
    const currentExs = weeks[weekIdx].days[dayIdx].exercises || [];
    const newEx = {
      exerciseId: exerciseObj.exerciseId || exerciseObj.id || exerciseObj._id,
      name: exerciseObj.name,
      order: currentExs.length + 1,
      sets: exerciseObj.defaultSets || 3,
      reps: exerciseObj.defaultReps ? String(exerciseObj.defaultReps) : '10',
      duration: exerciseObj.defaultDuration || 0,
      restSeconds: 60,
      intensity: 'Moderate',
      rpe: 7,
      tempo: '2-0-2',
      notes: ''
    };

    const updatedWeeks = [...weeks];
    updatedWeeks[weekIdx].days[dayIdx].exercises = [...currentExs, newEx];
    setWeeks(updatedWeeks);
  };

  const removeExerciseFromDay = (weekIdx, dayIdx, exIdx) => {
    const currentExs = weeks[weekIdx].days[dayIdx].exercises || [];
    const updatedExs = currentExs.filter((_, i) => i !== exIdx).map((ex, i) => ({
      ...ex,
      order: i + 1
    }));
    const updatedWeeks = [...weeks];
    updatedWeeks[weekIdx].days[dayIdx].exercises = updatedExs;
    setWeeks(updatedWeeks);
  };

  const updateExerciseField = (weekIdx, dayIdx, exIdx, field, value) => {
    const updatedWeeks = [...weeks];
    updatedWeeks[weekIdx].days[dayIdx].exercises[exIdx][field] = value;
    setWeeks(updatedWeeks);
  };

  const updateDayField = (weekIdx, dayIdx, field, value) => {
    const updatedWeeks = [...weeks];
    updatedWeeks[weekIdx].days[dayIdx][field] = value;
    setWeeks(updatedWeeks);
  };

  const updateWeekFocus = (weekIdx, value) => {
    const updatedWeeks = [...weeks];
    updatedWeeks[weekIdx].focus = value;
    setWeeks(updatedWeeks);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!title.trim()) return;

    const payload = {
      title: title.trim(),
      type: 'Workout',
      category: goal,
      goal,
      difficulty,
      durationWeeks: Number(durationWeeks) || weeks.length,
      daysPerWeek: Number(daysPerWeek) || 4,
      sportTags: sportTags.split(',').map(s => s.trim()).filter(Boolean),
      equipmentRequired: equipmentRequired.split(',').map(s => s.trim()).filter(Boolean),
      description: description.trim(),
      status,
      weeks,
      details: {
        days: Number(daysPerWeek) || 4,
        level: difficulty,
        target: goal
      }
    };

    onSave(payload);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={editingProgram ? 'Edit Workout Program Builder' : 'Curate Multi-Week Workout Program'}
      maxWidth="900px"
    >
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {/* Navigation Sub-Tabs */}
        <div style={{ display: 'flex', gap: '8px', borderBottom: '1px solid var(--card-border)', paddingBottom: '10px' }}>
          <button
            type="button"
            className={`btn btn-sm ${activeTab === 'meta' ? 'btn-primary' : 'btn-outline'}`}
            onClick={() => setActiveTab('meta')}
          >
            <Info size={14} /> 1. Program Specifications
          </button>
          <button
            type="button"
            className={`btn btn-sm ${activeTab === 'schedule' ? 'btn-primary' : 'btn-outline'}`}
            onClick={() => setActiveTab('schedule')}
          >
            <Layers size={14} /> 2. Multi-Week Schedule & Exercises ({weeks.length} Weeks)
          </button>
        </div>

        {/* TAB 1: METADATA & SPECS */}
        {activeTab === 'meta' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.82rem', marginBottom: '4px', fontWeight: 600 }}>
                Program Title *
              </label>
              <input
                type="text"
                required
                className="search-input"
                placeholder="e.g. 4-Week Hypertrophy Mass Split"
                value={title}
                onChange={e => setTitle(e.target.value)}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', marginBottom: '4px', fontWeight: 600 }}>
                  Primary Fitness Goal
                </label>
                <select className="search-input" value={goal} onChange={e => setGoal(e.target.value)}>
                  <option value="Muscle Building">Muscle Building / Hypertrophy</option>
                  <option value="Strength & Power">Strength & Power</option>
                  <option value="Fat Loss">Fat Loss & Conditioning</option>
                  <option value="Athletic Performance">Athletic Performance / Sport</option>
                  <option value="Endurance">Endurance & Stamina</option>
                </select>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', marginBottom: '4px', fontWeight: 600 }}>
                  Difficulty Level
                </label>
                <select className="search-input" value={difficulty} onChange={e => setDifficulty(e.target.value)}>
                  <option value="Beginner">Beginner</option>
                  <option value="Intermediate">Intermediate</option>
                  <option value="Advanced">Advanced</option>
                  <option value="All Levels">All Levels</option>
                </select>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', marginBottom: '4px', fontWeight: 600 }}>
                  Lifecycle Status
                </label>
                <select className="search-input" value={status} onChange={e => setStatus(e.target.value)}>
                  <option value="published">Published (Visible to Users & AI)</option>
                  <option value="draft">Draft (Private to Instructor)</option>
                  <option value="archived">Archived</option>
                </select>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', marginBottom: '4px', fontWeight: 600 }}>
                  Duration in Weeks
                </label>
                <input
                  type="number"
                  min="1"
                  max="16"
                  className="search-input"
                  value={durationWeeks}
                  onChange={e => setDurationWeeks(parseInt(e.target.value) || 1)}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', marginBottom: '4px', fontWeight: 600 }}>
                  Days per Week
                </label>
                <input
                  type="number"
                  min="1"
                  max="7"
                  className="search-input"
                  value={daysPerWeek}
                  onChange={e => setDaysPerWeek(parseInt(e.target.value) || 1)}
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', marginBottom: '4px', fontWeight: 600 }}>
                  Sport Relevance Tags (comma separated)
                </label>
                <input
                  type="text"
                  className="search-input"
                  placeholder="Bodybuilding, Cricket, Football, Running, General"
                  value={sportTags}
                  onChange={e => setSportTags(e.target.value)}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', marginBottom: '4px', fontWeight: 600 }}>
                  Equipment Required (comma separated)
                </label>
                <input
                  type="text"
                  className="search-input"
                  placeholder="Barbell, Dumbbells, Pull-up Bar, Bench"
                  value={equipmentRequired}
                  onChange={e => setEquipmentRequired(e.target.value)}
                />
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.82rem', marginBottom: '4px', fontWeight: 600 }}>
                Program Overview & Coaching Guidance
              </label>
              <textarea
                rows="3"
                className="search-input"
                placeholder="Explain the progression scheme, fatigue management, and ideal training frequency..."
                value={description}
                onChange={e => setDescription(e.target.value)}
              />
            </div>
          </div>
        )}

        {/* TAB 2: SCHEDULE & EXERCISES */}
        {activeTab === 'schedule' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {/* Week Selector Bar */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px', flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                {weeks.map((w, idx) => (
                  <button
                    key={idx}
                    type="button"
                    className={`btn btn-sm ${activeWeekIndex === idx ? 'btn-primary' : 'btn-outline'}`}
                    onClick={() => setActiveWeekIndex(idx)}
                  >
                    Week {w.weekNumber}
                  </button>
                ))}
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button type="button" className="btn btn-outline btn-sm" onClick={addWeek}>
                  <Plus size={14} /> Add Week
                </button>
                {weeks.length > 1 && (
                  <button
                    type="button"
                    className="btn btn-outline btn-sm"
                    style={{ color: '#ef4444', borderColor: '#ef4444' }}
                    onClick={() => removeWeek(activeWeekIndex)}
                  >
                    <Trash2 size={14} /> Remove Week {weeks[activeWeekIndex]?.weekNumber}
                  </button>
                )}
              </div>
            </div>

            {/* Current Active Week Focus */}
            {weeks[activeWeekIndex] && (
              <div style={{ background: 'rgba(255,255,255,0.03)', padding: '14px', borderRadius: '12px', border: '1px solid var(--card-border)' }}>
                <div style={{ marginBottom: '12px' }}>
                  <label style={{ display: 'block', fontSize: '0.82rem', marginBottom: '4px', fontWeight: 600 }}>
                    Week {weeks[activeWeekIndex].weekNumber} Focus
                  </label>
                  <input
                    type="text"
                    className="search-input"
                    placeholder="e.g. Accumulation & Volume, Deload, Peak Intensity"
                    value={weeks[activeWeekIndex].focus}
                    onChange={e => updateWeekFocus(activeWeekIndex, e.target.value)}
                  />
                </div>

                {/* Days within this Week */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  {weeks[activeWeekIndex].days.map((day, dayIdx) => (
                    <div
                      key={dayIdx}
                      style={{
                        background: 'rgba(0,0,0,0.25)',
                        border: '1px solid rgba(255,255,255,0.08)',
                        borderRadius: '10px',
                        padding: '14px'
                      }}
                    >
                      {/* Day Header */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px', flexWrap: 'wrap', gap: '10px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <span style={{ fontWeight: 700, fontSize: '0.92rem', color: 'var(--primary-accent)' }}>
                            Day {day.dayNumber}
                          </span>
                          <input
                            type="text"
                            className="search-input"
                            style={{ padding: '4px 8px', fontSize: '0.85rem', width: '200px' }}
                            value={day.title}
                            onChange={e => updateDayField(activeWeekIndex, dayIdx, 'title', e.target.value)}
                            placeholder="Day Title (e.g. Push Heavy)"
                          />
                          <input
                            type="text"
                            className="search-input"
                            style={{ padding: '4px 8px', fontSize: '0.85rem', width: '180px' }}
                            value={day.focus}
                            onChange={e => updateDayField(activeWeekIndex, dayIdx, 'focus', e.target.value)}
                            placeholder="Target Focus"
                          />
                        </div>
                        {weeks[activeWeekIndex].days.length > 1 && (
                          <button
                            type="button"
                            className="btn btn-icon btn-sm"
                            style={{ color: '#ef4444' }}
                            onClick={() => removeDay(activeWeekIndex, dayIdx)}
                            title="Remove Day"
                          >
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>

                      {/* Exercises in this Day */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '12px' }}>
                        {day.exercises.map((ex, exIdx) => (
                          <div
                            key={exIdx}
                            style={{
                              display: 'grid',
                              gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr 1fr auto',
                              gap: '6px',
                              alignItems: 'center',
                              background: 'rgba(255,255,255,0.02)',
                              padding: '8px',
                              borderRadius: '8px',
                              border: '1px solid rgba(255,255,255,0.05)'
                            }}
                          >
                            <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>
                              {exIdx + 1}. {ex.name}
                            </span>
                            <div>
                              <input
                                type="number"
                                min="1"
                                max="10"
                                className="search-input"
                                style={{ padding: '4px 6px', fontSize: '0.78rem' }}
                                value={ex.sets}
                                onChange={e => updateExerciseField(activeWeekIndex, dayIdx, exIdx, 'sets', parseInt(e.target.value) || 1)}
                                title="Sets"
                              />
                            </div>
                            <div>
                              <input
                                type="text"
                                className="search-input"
                                style={{ padding: '4px 6px', fontSize: '0.78rem' }}
                                value={ex.reps}
                                onChange={e => updateExerciseField(activeWeekIndex, dayIdx, exIdx, 'reps', e.target.value)}
                                placeholder="Reps (e.g. 8-10)"
                                title="Reps"
                              />
                            </div>
                            <div>
                              <input
                                type="number"
                                min="0"
                                max="300"
                                className="search-input"
                                style={{ padding: '4px 6px', fontSize: '0.78rem' }}
                                value={ex.restSeconds}
                                onChange={e => updateExerciseField(activeWeekIndex, dayIdx, exIdx, 'restSeconds', parseInt(e.target.value) || 0)}
                                placeholder="Rest(s)"
                                title="Rest Seconds"
                              />
                            </div>
                            <div>
                              <input
                                type="number"
                                min="1"
                                max="10"
                                className="search-input"
                                style={{ padding: '4px 6px', fontSize: '0.78rem' }}
                                value={ex.rpe}
                                onChange={e => updateExerciseField(activeWeekIndex, dayIdx, exIdx, 'rpe', parseInt(e.target.value) || 7)}
                                placeholder="RPE"
                                title="Target RPE"
                              />
                            </div>
                            <div>
                              <input
                                type="text"
                                className="search-input"
                                style={{ padding: '4px 6px', fontSize: '0.78rem' }}
                                value={ex.tempo}
                                onChange={e => updateExerciseField(activeWeekIndex, dayIdx, exIdx, 'tempo', e.target.value)}
                                placeholder="Tempo"
                                title="Tempo (e.g. 2-0-2)"
                              />
                            </div>
                            <button
                              type="button"
                              className="btn btn-icon btn-sm"
                              style={{ color: '#ef4444' }}
                              onClick={() => removeExerciseFromDay(activeWeekIndex, dayIdx, exIdx)}
                              title="Remove exercise"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        ))}
                      </div>

                      {/* Add Exercise from Database Selector */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                        <select
                          className="search-input"
                          style={{ flex: 1, minWidth: '220px', padding: '6px 10px', fontSize: '0.82rem' }}
                          onChange={(e) => {
                            const exId = e.target.value;
                            if (exId) {
                              const found = availableExercises.find(x => (x.exerciseId || x.id || x._id) === exId);
                              if (found) addExerciseToDay(activeWeekIndex, dayIdx, found);
                              e.target.value = '';
                            }
                          }}
                          defaultValue=""
                        >
                          <option value="" disabled>+ Add Exercise from Knowledge Base...</option>
                          {availableExercises.map(ex => (
                            <option key={ex.exerciseId || ex.id || ex._id} value={ex.exerciseId || ex.id || ex._id}>
                              {ex.name} ({ex.category || 'General'})
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  ))}

                  <button
                    type="button"
                    className="btn btn-outline btn-sm"
                    style={{ alignSelf: 'flex-start' }}
                    onClick={() => addDay(activeWeekIndex)}
                  >
                    <Plus size={14} /> Add Day to Week {weeks[activeWeekIndex].weekNumber}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Modal Bottom Actions */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--card-border)', paddingTop: '12px' }}>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
            Status: <strong style={{ color: status === 'published' ? '#10b981' : '#f59e0b' }}>{status.toUpperCase()}</strong>
          </span>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button type="button" className="btn btn-outline" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary">
              {editingProgram ? 'Save Program Changes' : 'Save & Publish Program'}
            </button>
          </div>
        </div>
      </form>
    </Modal>
  );
};

export default WorkoutProgramBuilderModal;
