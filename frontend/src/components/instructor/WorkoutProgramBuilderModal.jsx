import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Dumbbell, Calendar, Info, Clock, CheckCircle, ChevronDown, ChevronRight, Layers, Flame, Activity, ShieldAlert, Heart, Footprints } from 'lucide-react';
import Modal from '../common/Modal';

const WorkoutProgramBuilderModal = ({
  isOpen,
  onClose,
  onSave,
  editingProgram = null,
  availableExercises = []
}) => {
  const [activeTab, setActiveTab] = useState('meta'); // 'meta' | 'eligibility' | 'cardio_policy' | 'schedule'
  const [activeWeekIndex, setActiveWeekIndex] = useState(0);

  // Form Metadata
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [goal, setGoal] = useState('Weight Loss');
  const [difficulty, setDifficulty] = useState('Beginner');
  const [durationWeeks, setDurationWeeks] = useState(4);
  const [daysPerWeek, setDaysPerWeek] = useState(4);
  const [sportTags, setSportTags] = useState('Weight Loss, General Fitness');
  const [equipmentRequired, setEquipmentRequired] = useState('Bodyweight, Sturdy Chair');
  const [status, setStatus] = useState('published');
  const [connectedDietPlanId, setConnectedDietPlanId] = useState('');
  const [connectedDietPlanTitle, setConnectedDietPlanTitle] = useState('');
  const [availableDiets, setAvailableDiets] = useState([]);

  // Weight Loss & Track Specifications
  const [equipmentTrack, setEquipmentTrack] = useState('Home (No Equipment)');
  const [programLevel, setProgramLevel] = useState('Starter');
  const [isExtremeProgram, setIsExtremeProgram] = useState(false);

  // Eligibility & Safety Limits
  const [minAge, setMinAge] = useState(18);
  const [maxAge, setMaxAge] = useState(65);
  const [minBMI, setMinBMI] = useState(23);
  const [maxBMI, setMaxBMI] = useState(50);
  const [minWeightKg, setMinWeightKg] = useState(50);
  const [maxWeightKg, setMaxWeightKg] = useState(180);
  const [whoCanDo, setWhoCanDo] = useState('Adults (18+) with BMI 23+ looking to start weight loss safely');
  const [whoShouldNotDo, setWhoShouldNotDo] = useState('Under 18, BMI under 18.5, pregnancy, or anyone without doctor clearance');
  const [medicalWarningRequired, setMedicalWarningRequired] = useState(true);
  const [medicalWarningText, setMedicalWarningText] = useState(
    'Do NOT start without doctor approval if you have heart disease, BP issues, diabetes, asthma, joint/back injury, or take regular medication.'
  );

  // Missed Day Policy
  const [rule1To3Days, setRule1To3Days] = useState('Never double up. Missed 1 to 3 days, carry on.');
  const [rule4To7Days, setRule4To7Days] = useState('Missed 4 to 7 days, repeat the week.');
  const [ruleMoreThan7Days, setRuleMoreThan7Days] = useState('Missed more than 7 days, restart week 1.');

  // Cardio & Walking / Running Prescription
  const [hasWalking, setHasWalking] = useState(true);
  const [hasRunning, setHasRunning] = useState(false);
  const [cardioDesc, setCardioDesc] = useState('Daily Walk (15-25 min) + Saturday Long Walk (25-35 min)');
  const [dailyMinutes, setDailyMinutes] = useState(20);
  const [saturdayMinutes, setSaturdayMinutes] = useState(30);
  const [intervalRounds, setIntervalRounds] = useState(0);
  const [effortRPE, setEffortRPE] = useState('RPE 5 (Conversational pace)');

  // Expected Loss in Month 1
  const [lossMinKg, setLossMinKg] = useState(1.0);
  const [lossMaxKg, setLossMaxKg] = useState(3.5);
  const [lossNote, setLossNote] = useState('Planning band: 0.25% to 0.75% body weight/week, hard cap 1%/week. Depends on food, sleep, consistency and health.');

  // Fetch available certified diet templates for linking
  useEffect(() => {
    if (isOpen) {
      fetch('/api/plans/premade?type=Diet&limit=50')
        .then(res => res.json())
        .then(data => {
          const diets = data.items || (Array.isArray(data) ? data : []);
          setAvailableDiets(diets);
        })
        .catch(err => console.warn('Failed to fetch diets for program linking:', err));
    }
  }, [isOpen]);

  // Structured Weeks & Days
  const [weeks, setWeeks] = useState([
    {
      weekNumber: 1,
      focus: 'Foundational Movement & Base Conditioning',
      days: [
        {
          dayNumber: 1,
          title: 'Full Body Activation & Walking',
          focus: 'Whole Body',
          warmup: [{ text: '5-min dynamic joint mobilization', duration: 5 }],
          exercises: [],
          cooldown: [{ text: '5-min static stretching & slow breathing', duration: 5 }],
          notes: 'Never skip warm-up before lifting.'
        }
      ]
    }
  ]);

  useEffect(() => {
    if (editingProgram) {
      setTitle(editingProgram.title || '');
      setDescription(editingProgram.description || '');
      setGoal(editingProgram.goal || editingProgram.category || 'Weight Loss');
      setDifficulty(editingProgram.difficulty || 'Beginner');
      setDurationWeeks(editingProgram.durationWeeks || 4);
      setDaysPerWeek(editingProgram.daysPerWeek || 4);
      setSportTags(Array.isArray(editingProgram.sportTags) ? editingProgram.sportTags.join(', ') : (editingProgram.sportTags || ''));
      setEquipmentRequired(Array.isArray(editingProgram.equipmentRequired) ? editingProgram.equipmentRequired.join(', ') : (editingProgram.equipmentRequired || ''));
      setStatus(editingProgram.status || 'published');
      setConnectedDietPlanId(editingProgram.connectedDietPlanId || '');
      setConnectedDietPlanTitle(editingProgram.connectedDietPlanTitle || '');

      setEquipmentTrack(editingProgram.equipmentTrack || 'Home (No Equipment)');
      setProgramLevel(editingProgram.programLevel || 'Starter');
      setIsExtremeProgram(Boolean(editingProgram.isExtremeProgram));

      setMinAge(editingProgram.minAge !== undefined ? editingProgram.minAge : 18);
      setMaxAge(editingProgram.maxAge !== undefined ? editingProgram.maxAge : 65);
      setMinBMI(editingProgram.minBMI !== undefined ? editingProgram.minBMI : 23);
      setMaxBMI(editingProgram.maxBMI !== undefined ? editingProgram.maxBMI : 50);
      setMinWeightKg(editingProgram.minWeightKg !== undefined ? editingProgram.minWeightKg : 50);
      setMaxWeightKg(editingProgram.maxWeightKg !== undefined ? editingProgram.maxWeightKg : 180);
      setWhoCanDo(Array.isArray(editingProgram.whoCanDo) ? editingProgram.whoCanDo.join('\n') : (editingProgram.whoCanDo || ''));
      setWhoShouldNotDo(Array.isArray(editingProgram.whoShouldNotDo) ? editingProgram.whoShouldNotDo.join('\n') : (editingProgram.whoShouldNotDo || ''));
      setMedicalWarningRequired(editingProgram.medicalWarningRequired !== undefined ? Boolean(editingProgram.medicalWarningRequired) : true);
      setMedicalWarningText(editingProgram.medicalWarningText || 'Do NOT start without doctor approval if you have heart disease, BP issues, diabetes, asthma, joint/back injury, or take regular medication.');

      if (editingProgram.missedDayPolicy) {
        setRule1To3Days(editingProgram.missedDayPolicy.rule1To3Days || 'Never double up. Missed 1 to 3 days, carry on.');
        setRule4To7Days(editingProgram.missedDayPolicy.rule4To7Days || 'Missed 4 to 7 days, repeat the week.');
        setRuleMoreThan7Days(editingProgram.missedDayPolicy.ruleMoreThan7Days || 'Missed more than 7 days, restart week 1.');
      }

      if (editingProgram.cardioPrescription) {
        setHasWalking(editingProgram.cardioPrescription.hasWalking !== false);
        setHasRunning(Boolean(editingProgram.cardioPrescription.hasRunning));
        setCardioDesc(editingProgram.cardioPrescription.description || '');
        setDailyMinutes(editingProgram.cardioPrescription.dailyMinutes || 20);
        setSaturdayMinutes(editingProgram.cardioPrescription.saturdayMinutes || 30);
        setIntervalRounds(editingProgram.cardioPrescription.intervalRounds || 0);
        setEffortRPE(editingProgram.cardioPrescription.effortRPE || 'RPE 5');
      }

      if (editingProgram.expectedLossMonth1) {
        setLossMinKg(editingProgram.expectedLossMonth1.minKg || 1.0);
        setLossMaxKg(editingProgram.expectedLossMonth1.maxKg || 3.5);
        setLossNote(editingProgram.expectedLossMonth1.note || '');
      }

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
      setGoal('Weight Loss');
      setDifficulty('Beginner');
      setDurationWeeks(4);
      setDaysPerWeek(4);
      setSportTags('Weight Loss, General Fitness');
      setEquipmentRequired('Bodyweight, Sturdy Chair');
      setStatus('published');
      setConnectedDietPlanId('');
      setConnectedDietPlanTitle('');
      setEquipmentTrack('Home (No Equipment)');
      setProgramLevel('Starter');
      setIsExtremeProgram(false);
      setMinAge(18);
      setMaxAge(65);
      setMinBMI(23);
      setMaxBMI(50);
      setMinWeightKg(50);
      setMaxWeightKg(180);
      setWhoCanDo('Adults (18+) with BMI 23+ looking to start weight loss safely');
      setWhoShouldNotDo('Under 18, BMI under 18.5, pregnancy, or anyone without doctor clearance');
      setMedicalWarningRequired(true);
      setMedicalWarningText('Do NOT start without doctor approval if you have heart disease, BP issues, diabetes, asthma, joint/back injury, or take regular medication.');
      setRule1To3Days('Never double up. Missed 1 to 3 days, carry on.');
      setRule4To7Days('Missed 4 to 7 days, repeat the week.');
      setRuleMoreThan7Days('Missed more than 7 days, restart week 1.');
      setHasWalking(true);
      setHasRunning(false);
      setCardioDesc('Daily Walk (15-25 min) + Saturday Long Walk (25-35 min)');
      setDailyMinutes(20);
      setSaturdayMinutes(30);
      setIntervalRounds(0);
      setEffortRPE('RPE 5 (Conversational pace)');
      setLossMinKg(1.0);
      setLossMaxKg(3.5);
      setLossNote('Planning band: 0.25% to 0.75% body weight/week, hard cap 1%/week. Depends on food, sleep, consistency and health.');
      setWeeks([
        {
          weekNumber: 1,
          focus: 'Base Conditioning & Walking Habit',
          days: [
            {
              dayNumber: 1,
              title: 'Day 1: Full Body & Walking',
              focus: 'Mobility & Compound Strength',
              warmup: [{ text: '5-min full body joint mobilization', duration: 5 }],
              exercises: [],
              cooldown: [{ text: '5-min slow walk and stretches', duration: 5 }],
              notes: 'Follow warm-up before any lifting.'
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
      focus: 'Conditioning / Strength',
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

  // Quick Helper 1: Add 5-Min Warm-up as Exercise #1
  const addWarmupExercise = (weekIdx, dayIdx) => {
    const currentExs = weeks[weekIdx].days[dayIdx].exercises || [];
    const warmupEx = {
      exerciseId: 'warmup-5min',
      name: '5-Minute Warm-Up Routine',
      order: 1,
      sets: 1,
      reps: '5 mins',
      duration: 300,
      restSeconds: 0,
      intensity: 'Low',
      rpe: 4,
      tempo: 'Controlled',
      notes: 'March in place 1m, arm circles 30s each way, shoulder rolls 30s, hip circles 30s, 8 shallow squats.',
      isWarmup: true,
      isCooldown: false,
      isCardio: false,
      targetMuscle: 'Full Body Mobilization',
      keyCue: 'Gradually raise heart rate and lubricate joints. Never skip warm-up before lifting.',
      easierOption: 'Seated marching and gentle shoulder rolls',
      harderOption: 'Brisk high knees and dynamic reaches'
    };

    // Prepend as first exercise
    const reordered = [warmupEx, ...currentExs].map((ex, i) => ({ ...ex, order: i + 1 }));
    const updatedWeeks = [...weeks];
    updatedWeeks[weekIdx].days[dayIdx].exercises = reordered;
    setWeeks(updatedWeeks);
  };

  // Quick Helper 2: Add Walking / Cardio Session
  const addCardioExercise = (weekIdx, dayIdx) => {
    const currentExs = weeks[weekIdx].days[dayIdx].exercises || [];
    const cardioEx = {
      exerciseId: `cardio-${Date.now()}`,
      name: 'Brisk Walk / Cardio Session',
      order: currentExs.length + 1,
      sets: 1,
      reps: `${dailyMinutes || 20} mins`,
      duration: (dailyMinutes || 20) * 60,
      restSeconds: 0,
      intensity: 'Moderate',
      rpe: 5,
      tempo: 'Steady',
      notes: 'Continuous walking or cardio at conversational pace.',
      isWarmup: false,
      isCooldown: false,
      isCardio: true,
      targetMuscle: 'Cardiovascular System',
      keyCue: 'Walk tall, arms swinging naturally, maintain conversational pace.',
      easierOption: 'Break into two 10-minute sessions',
      harderOption: 'Increase pace or add 1-2% incline'
    };

    const updatedWeeks = [...weeks];
    updatedWeeks[weekIdx].days[dayIdx].exercises = [...currentExs, cardioEx];
    setWeeks(updatedWeeks);
  };

  // Quick Helper 3: Add 5-Min Cool-down
  const addCooldownExercise = (weekIdx, dayIdx) => {
    const currentExs = weeks[weekIdx].days[dayIdx].exercises || [];
    const cooldownEx = {
      exerciseId: 'cooldown-5min',
      name: '5-Minute Cool-Down & Stretch',
      order: currentExs.length + 1,
      sets: 1,
      reps: '5 mins',
      duration: 300,
      restSeconds: 0,
      intensity: 'Very Low',
      rpe: 2,
      tempo: 'Slow',
      notes: 'Slow walk 2m, then 30s each: calf stretch, quad stretch, hamstring stretch, chest stretch, 1m slow breathing.',
      isWarmup: false,
      isCooldown: true,
      isCardio: false,
      targetMuscle: 'Full Body Flexibility & Recovery',
      keyCue: 'Deep diaphragmatic breathing to return nervous system to resting state.',
      easierOption: 'Seated stretches with deep belly breathing',
      harderOption: 'Extend static stretch holds to 45s each'
    };

    const updatedWeeks = [...weeks];
    updatedWeeks[weekIdx].days[dayIdx].exercises = [...currentExs, cooldownEx];
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
      notes: '',
      isWarmup: false,
      isCooldown: false,
      isCardio: false,
      keyCue: exerciseObj.keyCue || '',
      easierOption: exerciseObj.easierOption || '',
      harderOption: exerciseObj.harderOption || '',
      targetMuscle: exerciseObj.targetMuscle || exerciseObj.category || ''
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
      equipmentTrack,
      programLevel,
      isExtremeProgram: Boolean(isExtremeProgram),
      minAge: Number(minAge) || 18,
      maxAge: Number(maxAge) || 65,
      minBMI: Number(minBMI) || 23,
      maxBMI: Number(maxBMI) || 50,
      minWeightKg: Number(minWeightKg) || 50,
      maxWeightKg: Number(maxWeightKg) || 180,
      whoCanDo: whoCanDo.split('\n').map(s => s.trim()).filter(Boolean),
      whoShouldNotDo: whoShouldNotDo.split('\n').map(s => s.trim()).filter(Boolean),
      medicalWarningRequired: Boolean(medicalWarningRequired),
      medicalWarningText: medicalWarningText.trim(),
      missedDayPolicy: {
        rule1To3Days: rule1To3Days.trim(),
        rule4To7Days: rule4To7Days.trim(),
        ruleMoreThan7Days: ruleMoreThan7Days.trim()
      },
      cardioPrescription: {
        hasWalking: Boolean(hasWalking),
        hasRunning: Boolean(hasRunning),
        description: cardioDesc.trim(),
        dailyMinutes: Number(dailyMinutes) || 20,
        saturdayMinutes: Number(saturdayMinutes) || 30,
        intervalRounds: Number(intervalRounds) || 0,
        effortRPE: effortRPE.trim()
      },
      expectedLossMonth1: {
        minKg: Number(lossMinKg) || 1.0,
        maxKg: Number(lossMaxKg) || 3.5,
        note: lossNote.trim()
      },
      sportTags: sportTags.split(',').map(s => s.trim()).filter(Boolean),
      equipmentRequired: equipmentRequired.split(',').map(s => s.trim()).filter(Boolean),
      description: description.trim(),
      status,
      weeks,
      connectedDietPlanId: connectedDietPlanId || null,
      connectedDietPlanTitle: connectedDietPlanTitle || '',
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
      maxWidth="950px"
    >
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {/* Navigation Sub-Tabs */}
        <div style={{ display: 'flex', gap: '8px', borderBottom: '1px solid var(--card-border)', paddingBottom: '10px', flexWrap: 'wrap' }}>
          <button
            type="button"
            className={`btn btn-sm ${activeTab === 'meta' ? 'btn-primary' : 'btn-outline'}`}
            onClick={() => setActiveTab('meta')}
          >
            <Info size={14} /> 1. Overview & Equipment Track
          </button>
          <button
            type="button"
            className={`btn btn-sm ${activeTab === 'eligibility' ? 'btn-primary' : 'btn-outline'}`}
            onClick={() => setActiveTab('eligibility')}
          >
            <ShieldAlert size={14} /> 2. Eligibility, Age & Health Rules
          </button>
          <button
            type="button"
            className={`btn btn-sm ${activeTab === 'cardio_policy' ? 'btn-primary' : 'btn-outline'}`}
            onClick={() => setActiveTab('cardio_policy')}
          >
            <Footprints size={14} /> 3. Cardio & Missed Day Policy
          </button>
          <button
            type="button"
            className={`btn btn-sm ${activeTab === 'schedule' ? 'btn-primary' : 'btn-outline'}`}
            onClick={() => setActiveTab('schedule')}
          >
            <Layers size={14} /> 4. Multi-Week Schedule & Exercises ({weeks.length} Weeks)
          </button>
        </div>

        {/* TAB 1: OVERVIEW & EQUIPMENT TRACK */}
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
                placeholder="e.g. H1: Home Starter (No Equipment) - 4-Week Weight Loss"
                value={title}
                onChange={e => setTitle(e.target.value)}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', marginBottom: '4px', fontWeight: 600 }}>
                  Equipment Track *
                </label>
                <select className="search-input" value={equipmentTrack} onChange={e => setEquipmentTrack(e.target.value)}>
                  <option value="Home (No Equipment)">Home (No Equipment Track)</option>
                  <option value="Gym (Equipment Required)">Gym (Equipment Track)</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', marginBottom: '4px', fontWeight: 600 }}>
                  Program Placement Level *
                </label>
                <select className="search-input" value={programLevel} onChange={e => setProgramLevel(e.target.value)}>
                  <option value="Starter">Starter (Walks &lt;20m / New to training)</option>
                  <option value="Steady">Steady (Walks 20-30m / Exercises 2-3 days)</option>
                  <option value="Driven">Driven (Trained 3+ days for 2+ months)</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', marginBottom: '4px', fontWeight: 600 }}>
                  Difficulty Setting
                </label>
                <select className="search-input" value={difficulty} onChange={e => setDifficulty(e.target.value)}>
                  <option value="Beginner">Beginner</option>
                  <option value="Intermediate">Intermediate</option>
                  <option value="Advanced">Advanced</option>
                  <option value="All Levels">All Levels</option>
                </select>
              </div>
            </div>

            {/* Extreme Program Toggle */}
            <div style={{ background: isExtremeProgram ? 'rgba(239,68,68,0.1)' : 'rgba(255,255,255,0.03)', border: isExtremeProgram ? '1px solid rgba(239,68,68,0.3)' : '1px solid var(--card-border)', borderRadius: '10px', padding: '12px 14px' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontWeight: 600, color: isExtremeProgram ? '#ef4444' : 'var(--text-primary)' }}>
                <input
                  type="checkbox"
                  checked={isExtremeProgram}
                  onChange={e => setIsExtremeProgram(e.target.checked)}
                />
                <Flame size={16} /> Mark as Heavy Extreme Program (Aggressive Fat Loss / Driven Level)
              </label>
              <p style={{ margin: '4px 0 0 24px', fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                For overweight athletes wanting high metabolic challenge with fast, safe caloric burn. Requires prior training history (3+ days/week for 2+ months).
              </p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', marginBottom: '4px', fontWeight: 600 }}>
                  Primary Goal
                </label>
                <select className="search-input" value={goal} onChange={e => setGoal(e.target.value)}>
                  <option value="Weight Loss">Weight Loss & Fat Burn</option>
                  <option value="Muscle Building">Muscle Building / Hypertrophy</option>
                  <option value="Strength & Power">Strength & Power</option>
                  <option value="General Fitness">General Fitness</option>
                  <option value="Endurance">Endurance & Stamina</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', marginBottom: '4px', fontWeight: 600 }}>
                  Duration (Weeks)
                </label>
                <input
                  type="number"
                  min="1"
                  max="52"
                  className="search-input"
                  value={durationWeeks}
                  onChange={e => setDurationWeeks(Math.max(1, parseInt(e.target.value) || 4))}
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
                  onChange={e => setDaysPerWeek(Math.max(1, Math.min(7, parseInt(e.target.value) || 4)))}
                />
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.82rem', marginBottom: '4px', fontWeight: 600 }}>
                Equipment Required (comma separated)
              </label>
              <input
                type="text"
                className="search-input"
                placeholder="e.g. Bodyweight, Sturdy Chair, Wall OR Leg Press, Cables, Dumbbells"
                value={equipmentRequired}
                onChange={e => setEquipmentRequired(e.target.value)}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.82rem', marginBottom: '4px', fontWeight: 600 }}>
                Program Coaching Guidance & Overview
              </label>
              <textarea
                rows="3"
                className="search-input"
                placeholder="Explain the progression scheme, fatigue management, and expected adherence..."
                value={description}
                onChange={e => setDescription(e.target.value)}
              />
            </div>
          </div>
        )}

        {/* TAB 2: ELIGIBILITY, AGE & HEALTH RULES */}
        {activeTab === 'eligibility' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div style={{ background: 'rgba(59,130,246,0.06)', border: '1px solid rgba(59,130,246,0.25)', borderRadius: '10px', padding: '12px 14px' }}>
              <h4 style={{ margin: '0 0 6px 0', fontSize: '0.86rem', color: '#3b82f6', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <ShieldAlert size={16} /> Trainer Gating Rules (Section 2 Compliance)
              </h4>
              <p style={{ margin: 0, fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                Set strict age, weight, and BMI boundaries so the AI and user intake system will never prescribe this program to ineligible trainees.
              </p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', marginBottom: '4px', fontWeight: 600 }}>
                  Min Age (Years)
                </label>
                <input
                  type="number"
                  min="18"
                  max="100"
                  className="search-input"
                  value={minAge}
                  onChange={e => setMinAge(parseInt(e.target.value) || 18)}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', marginBottom: '4px', fontWeight: 600 }}>
                  Max Age (Years)
                </label>
                <input
                  type="number"
                  min="18"
                  max="100"
                  className="search-input"
                  value={maxAge}
                  onChange={e => setMaxAge(parseInt(e.target.value) || 65)}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', marginBottom: '4px', fontWeight: 600 }}>
                  Min BMI
                </label>
                <input
                  type="number"
                  step="0.5"
                  className="search-input"
                  value={minBMI}
                  onChange={e => setMinBMI(parseFloat(e.target.value) || 23)}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', marginBottom: '4px', fontWeight: 600 }}>
                  Max BMI
                </label>
                <input
                  type="number"
                  step="0.5"
                  className="search-input"
                  value={maxBMI}
                  onChange={e => setMaxBMI(parseFloat(e.target.value) || 50)}
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', marginBottom: '4px', fontWeight: 600 }}>
                  Who CAN do this program? (1 item per line)
                </label>
                <textarea
                  rows="3"
                  className="search-input"
                  placeholder="e.g. Adults (18+) with BMI 23+&#10;Users walking less than 20 min/day"
                  value={whoCanDo}
                  onChange={e => setWhoCanDo(e.target.value)}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', marginBottom: '4px', fontWeight: 600 }}>
                  Who SHOULD NOT do this program? (1 item per line)
                </label>
                <textarea
                  rows="3"
                  className="search-input"
                  placeholder="e.g. Under 18&#10;BMI under 18.5&#10;Pregnancy or unmanaged heart/joint issues"
                  value={whoShouldNotDo}
                  onChange={e => setWhoShouldNotDo(e.target.value)}
                />
              </div>
            </div>

            {/* Medical Warning Text */}
            <div style={{ background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: '10px', padding: '12px 14px' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 600, color: '#ef4444', marginBottom: '6px' }}>
                <input
                  type="checkbox"
                  checked={medicalWarningRequired}
                  onChange={e => setMedicalWarningRequired(e.target.checked)}
                />
                Mandatory Medical Warning Notice Before Enrolment
              </label>
              <textarea
                rows="2"
                className="search-input"
                style={{ width: '100%', fontSize: '0.8rem' }}
                value={medicalWarningText}
                onChange={e => setMedicalWarningText(e.target.value)}
              />
            </div>
          </div>
        )}

        {/* TAB 3: CARDIO & MISSED DAY POLICY */}
        {activeTab === 'cardio_policy' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {/* Missed Day Policy */}
            <div style={{ background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.25)', borderRadius: '10px', padding: '12px 14px' }}>
              <h4 style={{ margin: '0 0 8px 0', fontSize: '0.86rem', color: '#f59e0b', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Clock size={16} /> Missed Day Recovery Rules ("Ager user miss kerday toh kya kerna parega")
              </h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', color: 'var(--text-secondary)', marginBottom: '2px' }}>
                    Rule for Missed 1 to 3 Days:
                  </label>
                  <input
                    type="text"
                    className="search-input"
                    value={rule1To3Days}
                    onChange={e => setRule1To3Days(e.target.value)}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', color: 'var(--text-secondary)', marginBottom: '2px' }}>
                    Rule for Missed 4 to 7 Days:
                  </label>
                  <input
                    type="text"
                    className="search-input"
                    value={rule4To7Days}
                    onChange={e => setRule4To7Days(e.target.value)}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', color: 'var(--text-secondary)', marginBottom: '2px' }}>
                    Rule for Missed More Than 7 Days:
                  </label>
                  <input
                    type="text"
                    className="search-input"
                    value={ruleMoreThan7Days}
                    onChange={e => setRuleMoreThan7Days(e.target.value)}
                  />
                </div>
              </div>
            </div>

            {/* Cardio & Walking / Running Prescription */}
            <div style={{ background: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.25)', borderRadius: '10px', padding: '12px 14px' }}>
              <h4 style={{ margin: '0 0 8px 0', fontSize: '0.86rem', color: '#10b981', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Footprints size={16} /> Walking & Running Cardio Prescription
              </h4>
              <div style={{ display: 'flex', gap: '16px', marginBottom: '10px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.82rem', fontWeight: 600 }}>
                  <input
                    type="checkbox"
                    checked={hasWalking}
                    onChange={e => setHasWalking(e.target.checked)}
                  />
                  Includes Walking
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.82rem', fontWeight: 600 }}>
                  <input
                    type="checkbox"
                    checked={hasRunning}
                    onChange={e => setHasRunning(e.target.checked)}
                  />
                  Includes Running / Fast Intervals
                </label>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginBottom: '10px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', marginBottom: '4px' }}>Daily Walk (Minutes)</label>
                  <input
                    type="number"
                    className="search-input"
                    value={dailyMinutes}
                    onChange={e => setDailyMinutes(parseInt(e.target.value) || 20)}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', marginBottom: '4px' }}>Saturday Long Walk (Minutes)</label>
                  <input
                    type="number"
                    className="search-input"
                    value={saturdayMinutes}
                    onChange={e => setSaturdayMinutes(parseInt(e.target.value) || 30)}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', marginBottom: '4px' }}>Interval Rounds (0 if none)</label>
                  <input
                    type="number"
                    className="search-input"
                    value={intervalRounds}
                    onChange={e => setIntervalRounds(parseInt(e.target.value) || 0)}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', marginBottom: '4px' }}>Cardio Prescription Description</label>
                <input
                  type="text"
                  className="search-input"
                  value={cardioDesc}
                  onChange={e => setCardioDesc(e.target.value)}
                />
              </div>
            </div>

            {/* Expected Loss in Month 1 */}
            <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--card-border)', borderRadius: '10px', padding: '12px 14px' }}>
              <h4 style={{ margin: '0 0 8px 0', fontSize: '0.86rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Activity size={16} /> Month 1 Safe Expected Loss Range (Estimate)
              </h4>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '8px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', marginBottom: '4px' }}>Min Month 1 Loss (kg)</label>
                  <input
                    type="number"
                    step="0.1"
                    className="search-input"
                    value={lossMinKg}
                    onChange={e => setLossMinKg(parseFloat(e.target.value) || 1.0)}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', marginBottom: '4px' }}>Max Month 1 Loss (kg)</label>
                  <input
                    type="number"
                    step="0.1"
                    className="search-input"
                    value={lossMaxKg}
                    onChange={e => setLossMaxKg(parseFloat(e.target.value) || 3.5)}
                  />
                </div>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', marginBottom: '4px' }}>Disclaimer / Planning Band Note</label>
                <input
                  type="text"
                  className="search-input"
                  value={lossNote}
                  onChange={e => setLossNote(e.target.value)}
                />
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: SCHEDULE & EXERCISES */}
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
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                          <span style={{ fontWeight: 700, fontSize: '0.92rem', color: 'var(--primary-accent)' }}>
                            Day {day.dayNumber}
                          </span>
                          <input
                            type="text"
                            className="search-input"
                            style={{ padding: '4px 8px', fontSize: '0.85rem', width: '220px' }}
                            value={day.title}
                            onChange={e => updateDayField(activeWeekIndex, dayIdx, 'title', e.target.value)}
                            placeholder="Day Title (e.g. Strength A + Walk)"
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

                        {/* Quick 1-Click Action Helpers */}
                        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                          <button
                            type="button"
                            className="btn btn-outline btn-sm"
                            style={{ fontSize: '0.75rem', padding: '3px 8px', color: '#10b981', borderColor: 'rgba(16,185,129,0.4)' }}
                            onClick={() => addWarmupExercise(activeWeekIndex, dayIdx)}
                            title="Adds 5-Min Warm-up as Exercise #1"
                          >
                            + 5-Min Warm-Up (#1)
                          </button>
                          <button
                            type="button"
                            className="btn btn-outline btn-sm"
                            style={{ fontSize: '0.75rem', padding: '3px 8px', color: '#3b82f6', borderColor: 'rgba(59,130,246,0.4)' }}
                            onClick={() => addCardioExercise(activeWeekIndex, dayIdx)}
                            title="Adds Walking / Cardio Exercise"
                          >
                            + Walking/Cardio
                          </button>
                          <button
                            type="button"
                            className="btn btn-outline btn-sm"
                            style={{ fontSize: '0.75rem', padding: '3px 8px', color: '#8b5cf6', borderColor: 'rgba(139,92,246,0.4)' }}
                            onClick={() => addCooldownExercise(activeWeekIndex, dayIdx)}
                            title="Adds 5-Min Cool-Down & Stretch"
                          >
                            + 5-Min Cool-Down
                          </button>
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
                      </div>

                      {/* Exercises in this Day */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '12px' }}>
                        {day.exercises.map((ex, exIdx) => (
                          <div
                            key={exIdx}
                            style={{
                              display: 'flex',
                              flexDirection: 'column',
                              gap: '6px',
                              background: ex.isWarmup
                                ? 'rgba(16,185,129,0.06)'
                                : ex.isCooldown
                                ? 'rgba(139,92,246,0.06)'
                                : ex.isCardio
                                ? 'rgba(59,130,246,0.06)'
                                : 'rgba(255,255,255,0.02)',
                              padding: '10px',
                              borderRadius: '8px',
                              border: ex.isWarmup
                                ? '1px solid rgba(16,185,129,0.3)'
                                : ex.isCooldown
                                ? '1px solid rgba(139,92,246,0.3)'
                                : ex.isCardio
                                ? '1px solid rgba(59,130,246,0.3)'
                                : '1px solid rgba(255,255,255,0.05)'
                            }}
                          >
                            {/* Main Row */}
                            <div
                              style={{
                                display: 'grid',
                                gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr 1fr auto',
                                gap: '6px',
                                alignItems: 'center'
                              }}
                            >
                              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                                <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>
                                  {exIdx + 1}. {ex.name}
                                </span>
                                {ex.isWarmup && (
                                  <span style={{ fontSize: '0.68rem', padding: '1px 5px', borderRadius: '4px', background: '#10b981', color: '#fff', fontWeight: 700 }}>
                                    WARM-UP (#1)
                                  </span>
                                )}
                                {ex.isCooldown && (
                                  <span style={{ fontSize: '0.68rem', padding: '1px 5px', borderRadius: '4px', background: '#8b5cf6', color: '#fff', fontWeight: 700 }}>
                                    COOL-DOWN
                                  </span>
                                )}
                                {ex.isCardio && (
                                  <span style={{ fontSize: '0.68rem', padding: '1px 5px', borderRadius: '4px', background: '#3b82f6', color: '#fff', fontWeight: 700 }}>
                                    CARDIO
                                  </span>
                                )}
                              </div>
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
                                  placeholder="Reps"
                                  title="Reps (e.g. 8-10 or 20 mins)"
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
                                  title="Tempo"
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

                            {/* Alternatives & Coaching Cues Row */}
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px', paddingTop: '4px', borderTop: '1px dashed rgba(255,255,255,0.06)' }}>
                              <div>
                                <input
                                  type="text"
                                  className="search-input"
                                  style={{ padding: '3px 6px', fontSize: '0.74rem' }}
                                  placeholder="Easier Alternative Option"
                                  value={ex.easierOption || ''}
                                  onChange={e => updateExerciseField(activeWeekIndex, dayIdx, exIdx, 'easierOption', e.target.value)}
                                />
                              </div>
                              <div>
                                <input
                                  type="text"
                                  className="search-input"
                                  style={{ padding: '3px 6px', fontSize: '0.74rem' }}
                                  placeholder="Harder Progression Option"
                                  value={ex.harderOption || ''}
                                  onChange={e => updateExerciseField(activeWeekIndex, dayIdx, exIdx, 'harderOption', e.target.value)}
                                />
                              </div>
                              <div>
                                <input
                                  type="text"
                                  className="search-input"
                                  style={{ padding: '3px 6px', fontSize: '0.74rem' }}
                                  placeholder="Key Form Cue (e.g. Chest up, heels flat)"
                                  value={ex.keyCue || ''}
                                  onChange={e => updateExerciseField(activeWeekIndex, dayIdx, exIdx, 'keyCue', e.target.value)}
                                />
                              </div>
                            </div>
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

                      {/* Day Notes */}
                      <div style={{ marginTop: '10px' }}>
                        <input
                          type="text"
                          className="search-input"
                          style={{ width: '100%', padding: '6px 10px', fontSize: '0.8rem' }}
                          value={day.notes || ''}
                          onChange={e => updateDayField(activeWeekIndex, dayIdx, 'notes', e.target.value)}
                          placeholder="Day coaching notes, meal timing or hydration reminders (optional)..."
                        />
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
            Track: <strong style={{ color: equipmentTrack.includes('Gym') ? '#3b82f6' : '#10b981' }}>{equipmentTrack}</strong> • Level: <strong>{programLevel}</strong>
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
