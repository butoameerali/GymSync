import React, { useState, useEffect } from 'react';
import { useAdminAuth } from '../../context/AdminAuthContext';
import {
  Dumbbell, Plus, Search, Edit2, Trash2, CheckCircle2, AlertTriangle,
  Clock, Calendar, Flame, Layers, ArrowRight, ArrowLeft, Copy, Check,
  ChevronRight, ChevronDown, Activity, Info, ShieldCheck, Eye, Sparkles,
  BedDouble, MoveUp, MoveDown
} from 'lucide-react';
import Modal from '../../components/common/Modal';
import { toast } from 'react-toastify';

const GOALS = ['Muscle Building', 'Weight Loss', 'Hypertrophy', 'Strength', 'General Fitness', 'Fat Loss', 'Endurance'];
const DIFFICULTIES = ['Beginner', 'Intermediate', 'Advanced'];
const EQUIPMENT_OPTIONS = ['Gym (Equipment Required)', 'Home (No Equipment)', 'Dumbbells Only'];

const WorkoutProgramsPage = () => {
  const { authHeaders, user, role } = useAdminAuth();
  const isAdmin = ['Admin', 'SuperAdmin'].includes(role);

  const [programs, setPrograms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all'); // 'all' | 'pending_review' | 'published' | 'draft'
  const [selectedGoal, setSelectedGoal] = useState('All');

  // Exercise Library
  const [exerciseList, setExerciseList] = useState([]);

  // Modal & Builder State
  const [showBuilderModal, setShowBuilderModal] = useState(false);
  const [editingProgram, setEditingProgram] = useState(null);
  const [builderStep, setBuilderStep] = useState(1); // 1: Meta | 2: Syllabus & Day Editor
  const [selectedWeekNum, setSelectedWeekNum] = useState(1);
  const [selectedDayNum, setSelectedDayNum] = useState(1);
  const [submitting, setSubmitting] = useState(false);

  // Search inside day editor for adding exercises
  const [exSearchQuery, setExSearchQuery] = useState('');
  const [libraryFilterCategory, setLibraryFilterCategory] = useState('All');
  const [previewExercise, setPreviewExercise] = useState(null);

  // Clean, focused Step 1 Form (Title, Difficulty, Weeks, Days/Wk, Equipment)
  const initialForm = {
    title: '',
    goal: 'Muscle Building',
    difficulty: 'Beginner',
    durationWeeks: 4,
    daysPerWeek: 4,
    equipmentTrack: 'Gym (Equipment Required)',
    weeks: []
  };

  const [formData, setFormData] = useState(initialForm);

  // Fetch programs from backend
  const fetchPrograms = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/plans/premade?type=Workout&status=all&limit=100', {
        headers: authHeaders()
      });
      if (res.ok) {
        const data = await res.json();
        const list = data.items || (Array.isArray(data) ? data : []);
        setPrograms(list);
      }
    } catch (err) {
      console.error('Fetch programs error:', err);
      toast.error('Failed to load workout programs');
    } finally {
      setLoading(false);
    }
  };

  // Fetch Exercise Library
  const fetchExerciseLibrary = async () => {
    try {
      const res = await fetch('/api/exercises?limit=300', { headers: authHeaders() });
      if (res.ok) {
        const data = await res.json();
        setExerciseList(data.items || (Array.isArray(data) ? data : []));
      }
    } catch (err) {
      console.warn('Could not load exercise library:', err);
    }
  };

  useEffect(() => {
    fetchPrograms();
    fetchExerciseLibrary();
  }, []);

  // Helper to build default weeks and days structure from durationWeeks & daysPerWeek
  const generateBlankSyllabus = (numWeeks, daysPerWk) => {
    const weeks = [];
    for (let w = 1; w <= numWeeks; w++) {
      const days = [];
      for (let d = 1; d <= daysPerWk; d++) {
        days.push({
          dayNumber: d,
          title: `Day ${d} Routine`,
          dayType: 'workout', // 'workout' | 'rest'
          focus: '',
          exercises: []
        });
      }
      weeks.push({
        weekNumber: w,
        focus: `Week ${w} Foundation`,
        days
      });
    }
    return weeks;
  };

  // Open builder for creating a new program
  const handleOpenNewBuilder = () => {
    setEditingProgram(null);
    setFormData(initialForm);
    setBuilderStep(1);
    setSelectedWeekNum(1);
    setSelectedDayNum(1);
    setExSearchQuery('');
    setShowBuilderModal(true);
  };

  // Open builder for editing an existing program
  const handleOpenEditBuilder = async (prog) => {
    try {
      const res = await fetch(`/api/plans/premade/${prog._id}`, { headers: authHeaders() });
      const fullProg = res.ok ? await res.json() : prog;

      setEditingProgram(fullProg);
      const numWeeks = fullProg.durationWeeks || (fullProg.weeks ? fullProg.weeks.length : 4);
      const numDays = fullProg.daysPerWeek || 4;

      let weeks = fullProg.weeks || [];
      if (!weeks.length) {
        weeks = generateBlankSyllabus(numWeeks, numDays);
      }

      setFormData({
        title: fullProg.title || '',
        goal: fullProg.goal || 'Muscle Building',
        difficulty: fullProg.difficulty || 'Beginner',
        durationWeeks: numWeeks,
        daysPerWeek: numDays,
        equipmentTrack: fullProg.equipmentTrack || 'Gym (Equipment Required)',
        weeks: weeks.map((w, wIdx) => ({
          weekNumber: w.weekNumber || wIdx + 1,
          focus: w.focus || `Week ${wIdx + 1}`,
          days: (w.days || []).map((d, dIdx) => ({
            dayNumber: d.dayNumber || dIdx + 1,
            title: d.title || `Day ${dIdx + 1}`,
            dayType: d.isRestDay || d.dayType === 'rest' ? 'rest' : 'workout',
            focus: d.focus || '',
            exercises: (d.exercises || []).map(ex => ({
              exerciseId: ex.exerciseId || `EX-${Math.random().toString(36).substr(2, 5)}`,
              name: ex.name,
              targetMuscle: ex.targetMuscle || '',
              sets: Number(ex.sets) || 3,
              reps: String(ex.reps || '10'),
              targetWeight: ex.intensity || (ex.notes?.includes('Weight:') ? ex.notes.split('Weight:')[1] : '') || '',
              restSeconds: Number(ex.restSeconds) || 60,
              notes: ex.notes || '',
              gifUrl: ex.gifUrl || ''
            }))
          }))
        }))
      });

      setBuilderStep(2);
      setSelectedWeekNum(1);
      setSelectedDayNum(1);
      setShowBuilderModal(true);
    } catch (e) {
      toast.error('Failed to load program details');
    }
  };

  // Step 1 -> Step 2 Transition
  const handleProceedToSyllabus = (e) => {
    e.preventDefault();
    if (!formData.title.trim()) {
      return toast.warning('Please enter a program title.');
    }

    const targetWeeks = Math.max(1, Number(formData.durationWeeks) || 4);
    const targetDays = Math.max(1, Number(formData.daysPerWeek) || 4);

    // If weeks not initialized or length mismatch, generate cleanly
    if (!formData.weeks.length || formData.weeks.length !== targetWeeks) {
      const newWeeks = generateBlankSyllabus(targetWeeks, targetDays);
      setFormData(prev => ({
        ...prev,
        durationWeeks: targetWeeks,
        daysPerWeek: targetDays,
        weeks: newWeeks
      }));
    }

    setSelectedWeekNum(1);
    setSelectedDayNum(1);
    setBuilderStep(2);
  };

  // Current active day reference
  const currentWeek = formData.weeks.find(w => w.weekNumber === selectedWeekNum) || formData.weeks[0];
  const currentDay = currentWeek?.days.find(d => d.dayNumber === selectedDayNum) || currentWeek?.days[0];

  // Update current day field
  const updateCurrentDayField = (field, value) => {
    setFormData(prev => {
      const nextWeeks = prev.weeks.map(w => {
        if (w.weekNumber !== selectedWeekNum) return w;
        return {
          ...w,
          days: w.days.map(d => {
            if (d.dayNumber !== selectedDayNum) return d;
            return { ...d, [field]: value };
          })
        };
      });
      return { ...prev, weeks: nextWeeks };
    });
  };

  // Add exercise to current day from library
  const handleAddExerciseToCurrentDay = (ex) => {
    const newEx = {
      exerciseId: ex.exerciseId || ex._id || `EX-${Math.random().toString(36).substr(2, 6)}`,
      name: ex.name,
      targetMuscle: Array.isArray(ex.targetMuscles) ? ex.targetMuscles.join(', ') : (ex.category || ''),
      sets: ex.defaultSets || 3,
      reps: String(ex.defaultReps || '10'),
      targetWeight: 'Progressive Weight',
      restSeconds: 60,
      notes: ex.instructions || '',
      gifUrl: ex.gifUrl || ex.mediaUrl || ''
    };

    setFormData(prev => {
      const nextWeeks = prev.weeks.map(w => {
        if (w.weekNumber !== selectedWeekNum) return w;
        return {
          ...w,
          days: w.days.map(d => {
            if (d.dayNumber !== selectedDayNum) return d;
            return { ...d, exercises: [...(d.exercises || []), newEx] };
          })
        };
      });
      return { ...prev, weeks: nextWeeks };
    });

    toast.success(`Added "${ex.name}" to Week ${selectedWeekNum} • Day ${selectedDayNum}`);
  };

  // Add a blank custom exercise row
  const handleAddCustomExercise = () => {
    const customEx = {
      exerciseId: `EX-${Math.random().toString(36).substr(2, 6).toUpperCase()}`,
      name: 'New Exercise',
      targetMuscle: 'Target Muscle',
      sets: 3,
      reps: '10',
      targetWeight: '',
      restSeconds: 60,
      notes: '',
      gifUrl: ''
    };

    setFormData(prev => {
      const nextWeeks = prev.weeks.map(w => {
        if (w.weekNumber !== selectedWeekNum) return w;
        return {
          ...w,
          days: w.days.map(d => {
            if (d.dayNumber !== selectedDayNum) return d;
            return { ...d, exercises: [...(d.exercises || []), customEx] };
          })
        };
      });
      return { ...prev, weeks: nextWeeks };
    });
  };

  // Update exercise inside current day
  const handleUpdateExercise = (exIndex, field, value) => {
    setFormData(prev => {
      const nextWeeks = prev.weeks.map(w => {
        if (w.weekNumber !== selectedWeekNum) return w;
        return {
          ...w,
          days: w.days.map(d => {
            if (d.dayNumber !== selectedDayNum) return d;
            const updatedExercises = [...(d.exercises || [])];
            updatedExercises[exIndex] = { ...updatedExercises[exIndex], [field]: value };
            return { ...d, exercises: updatedExercises };
          })
        };
      });
      return { ...prev, weeks: nextWeeks };
    });
  };

  // Remove exercise from current day
  const handleRemoveExercise = (exIndex) => {
    setFormData(prev => {
      const nextWeeks = prev.weeks.map(w => {
        if (w.weekNumber !== selectedWeekNum) return w;
        return {
          ...w,
          days: w.days.map(d => {
            if (d.dayNumber !== selectedDayNum) return d;
            return {
              ...d,
              exercises: (d.exercises || []).filter((_, i) => i !== exIndex)
            };
          })
        };
      });
      return { ...prev, weeks: nextWeeks };
    });
  };

  // Move exercise Up / Down
  const handleMoveExercise = (exIndex, direction) => {
    setFormData(prev => {
      const nextWeeks = prev.weeks.map(w => {
        if (w.weekNumber !== selectedWeekNum) return w;
        return {
          ...w,
          days: w.days.map(d => {
            if (d.dayNumber !== selectedDayNum) return d;
            const exList = [...(d.exercises || [])];
            const targetIdx = direction === 'up' ? exIndex - 1 : exIndex + 1;
            if (targetIdx < 0 || targetIdx >= exList.length) return d;
            const temp = exList[exIndex];
            exList[exIndex] = exList[targetIdx];
            exList[targetIdx] = temp;
            return { ...d, exercises: exList };
          })
        };
      });
      return { ...prev, weeks: nextWeeks };
    });
  };

  // Clone current day exercises to another day
  const handleCopyDayToNext = () => {
    const nextDayNum = selectedDayNum < (currentWeek?.days.length || 4) ? selectedDayNum + 1 : 1;
    const nextWeekNum = selectedDayNum < (currentWeek?.days.length || 4) ? selectedWeekNum : (selectedWeekNum < formData.weeks.length ? selectedWeekNum + 1 : 1);

    if (nextDayNum === selectedDayNum && nextWeekNum === selectedWeekNum) {
      return toast.info('No next day available to copy to.');
    }

    const currentExList = currentDay?.exercises || [];
    if (!currentExList.length) {
      return toast.warning('Current day has no exercises to copy.');
    }

    const clonedExercises = currentExList.map(e => ({ ...e }));

    setFormData(prev => {
      const nextWeeks = prev.weeks.map(w => {
        if (w.weekNumber !== nextWeekNum) return w;
        return {
          ...w,
          days: w.days.map(d => {
            if (d.dayNumber !== nextDayNum) return d;
            return {
              ...d,
              exercises: [...d.exercises, ...clonedExercises],
              dayType: 'workout'
            };
          })
        };
      });
      return { ...prev, weeks: nextWeeks };
    });

    toast.success(`Copied ${clonedExercises.length} exercises to Week ${nextWeekNum} • Day ${nextDayNum}!`);
    setSelectedWeekNum(nextWeekNum);
    setSelectedDayNum(nextDayNum);
  };

  // Save / Submit Program
  const handleSaveProgram = async (submitStatus) => {
    if (!formData.title.trim()) {
      return toast.warning('Program title is required');
    }

    try {
      setSubmitting(true);

      const structuredWeeks = formData.weeks.map(w => ({
        weekNumber: w.weekNumber,
        focus: w.focus || `Week ${w.weekNumber}`,
        days: (w.days || []).map(d => ({
          dayNumber: d.dayNumber,
          title: d.title || `Day ${d.dayNumber}`,
          dayType: d.dayType || 'workout',
          isRestDay: d.dayType === 'rest',
          focus: d.focus || '',
          warmup: [{ text: '5-min warm-up', duration: 5 }],
          cooldown: [{ text: '5-min cool-down', duration: 5 }],
          exercises: (d.exercises || []).map((ex, oIdx) => ({
            exerciseId: ex.exerciseId || `EX-${oIdx + 1}`,
            name: ex.name,
            targetMuscle: ex.targetMuscle || '',
            order: oIdx + 1,
            sets: Number(ex.sets) || 3,
            reps: String(ex.reps || '10'),
            restSeconds: Number(ex.restSeconds) || 60,
            intensity: ex.targetWeight || 'Moderate',
            notes: ex.targetWeight ? `Target Weight / Progression: ${ex.targetWeight}` : (ex.notes || ''),
            gifUrl: ex.gifUrl || ''
          }))
        }))
      }));

      const payload = {
        title: formData.title.trim(),
        type: 'Workout',
        goal: formData.goal,
        category: formData.goal,
        difficulty: formData.difficulty,
        durationWeeks: Number(formData.durationWeeks) || structuredWeeks.length,
        daysPerWeek: Number(formData.daysPerWeek) || 4,
        equipmentTrack: formData.equipmentTrack,
        description: `${formData.title} - ${formData.goal} program (${formData.durationWeeks} weeks, ${formData.daysPerWeek} days/week)`,
        weeks: structuredWeeks,
        status: submitStatus || (isAdmin ? 'published' : 'pending_review')
      };

      const url = editingProgram ? `/api/plans/premade/${editingProgram._id}` : '/api/plans/premade';
      const method = editingProgram ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          ...authHeaders()
        },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        if (payload.status === 'pending_review') {
          toast.success('🎉 Program submitted for Admin Approval! It will be verified and published for trainees.');
        } else if (payload.status === 'published') {
          toast.success('✅ Program saved and PUBLISHED live for all trainees!');
        } else {
          toast.info('Draft program saved successfully.');
        }
        setShowBuilderModal(false);
        fetchPrograms();
      } else {
        const errData = await res.json().catch(() => ({}));
        toast.error(errData.message || errData.error || 'Failed to save workout program');
      }
    } catch (err) {
      toast.error('Network error saving program');
    } finally {
      setSubmitting(false);
    }
  };

  // Admin 1-Click Approve & Publish
  const handleAdminApprove = async (progId, title) => {
    try {
      const res = await fetch(`/api/plans/premade/${progId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...authHeaders()
        },
        body: JSON.stringify({ status: 'published' })
      });

      if (res.ok) {
        toast.success(`✅ Program "${title}" APPROVED & published live to users!`);
        fetchPrograms();
      } else {
        toast.error('Approval failed');
      }
    } catch (e) {
      toast.error('Network error approving program');
    }
  };

  // Delete program
  const handleDeleteProgram = async (progId, title) => {
    if (!window.confirm(`Delete workout program "${title}"?`)) return;

    try {
      const res = await fetch(`/api/plans/premade/${progId}`, {
        method: 'DELETE',
        headers: authHeaders()
      });

      if (res.ok) {
        toast.success('Program removed from database');
        setPrograms(prev => prev.filter(p => p._id !== progId));
      } else {
        toast.error('Failed to delete program');
      }
    } catch (err) {
      toast.error('Network error deleting program');
    }
  };

  // Smart Multi-field, Synonym & Intent Search for Exercises
  const filteredLibraryExercises = (() => {
    const q = exSearchQuery.trim().toLowerCase();
    const activeCat = libraryFilterCategory;

    // Check if query or category is active
    if (!q && activeCat === 'All') {
      return exerciseList.slice(0, 30);
    }

    const tokens = q ? q.split(/\s+/).filter(Boolean) : [];

    // Synonyms and related movement expansions
    const synonyms = [];
    if (q.includes('stretch') || q.includes('warmup') || q.includes('warm up') || q.includes('mobility')) {
      synonyms.push('stretch', 'warmup', 'warm up', 'mobility', 'flexibility', 'foam', 'extending', 'reach', 'twist', 'bend');
    }
    if (q.includes('arm') || q.includes('bicep') || q.includes('tricep')) {
      synonyms.push('arm', 'bicep', 'tricep', 'curl', 'extension', 'forearm');
    }
    if (q.includes('leg') || q.includes('quad') || q.includes('hamstring') || q.includes('calf') || q.includes('glute')) {
      synonyms.push('leg', 'quad', 'squat', 'hamstring', 'calf', 'calves', 'lunge', 'glute');
    }
    if (q.includes('chest') || q.includes('pec')) {
      synonyms.push('chest', 'bench', 'press', 'pushup', 'push-up', 'pectoral');
    }
    if (q.includes('back') || q.includes('lat')) {
      synonyms.push('back', 'lat', 'row', 'pullup', 'pulldown', 'deadlift', 'rhomboid');
    }
    if (q.includes('core') || q.includes('ab')) {
      synonyms.push('core', 'abs', 'plank', 'crunch', 'oblique', 'hollow');
    }

    const scored = exerciseList.map(ex => {
      const nameText = (ex.name || '').toLowerCase();
      const catText = (ex.category || '').toLowerCase();
      const musclesText = Array.isArray(ex.targetMuscles) ? ex.targetMuscles.join(' ').toLowerCase() : '';
      const equipText = (ex.equipmentRequired || '').toLowerCase();
      const instrText = (ex.instructions || ex.description || '').toLowerCase();
      const tagsText = Array.isArray(ex.tags) ? ex.tags.join(' ').toLowerCase() : '';
      const fullText = `${nameText} ${catText} ${musclesText} ${equipText} ${instrText} ${tagsText}`;

      // Category filter match check
      if (activeCat !== 'All') {
        if (activeCat === 'Warm-up & Stretch') {
          const isStretchOrWarmup = fullText.includes('stretch') || fullText.includes('warmup') || fullText.includes('mobility') || catText === 'cardio' || fullText.includes('flexibility');
          if (!isStretchOrWarmup) return null;
        } else if (catText !== activeCat.toLowerCase()) {
          return null;
        }
      }

      if (!q) {
        return { ex, score: 1 };
      }

      let score = 0;

      // Exact phrase match
      if (nameText.includes(q)) score += 60;
      else if (musclesText.includes(q)) score += 35;
      else if (fullText.includes(q)) score += 20;

      // Individual token matches
      tokens.forEach(tok => {
        if (nameText.includes(tok)) score += 20;
        else if (musclesText.includes(tok)) score += 15;
        else if (catText.includes(tok)) score += 10;
        else if (instrText.includes(tok)) score += 8;
        else if (fullText.includes(tok)) score += 5;
      });

      // Synonym expansion matches
      synonyms.forEach(syn => {
        if (nameText.includes(syn)) score += 15;
        else if (fullText.includes(syn)) score += 8;
      });

      return score > 0 ? { ex, score } : null;
    }).filter(Boolean);

    // Sort by highest relevance score
    scored.sort((a, b) => b.score - a.score);
    return scored.map(item => item.ex);
  })();

  // Filter programs for index cards
  const filteredPrograms = programs.filter(p => {
    if (statusFilter !== 'all' && (p.status || '').toLowerCase() !== statusFilter.toLowerCase()) {
      return false;
    }
    if (selectedGoal !== 'All' && (p.goal || '').toLowerCase() !== selectedGoal.toLowerCase()) {
      return false;
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      const title = (p.title || '').toLowerCase();
      if (!title.includes(q)) return false;
    }
    return true;
  });

  const pendingCount = programs.filter(p => p.status === 'pending_review').length;

  return (
    <div style={{ padding: '24px', maxWidth: '1400px', margin: '0 auto' }}>
      {/* Top Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '1.65rem', fontWeight: 800, color: '#f3f4f6', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Dumbbell size={28} color="#3b82f6" />
            Workout Programs
          </h1>
          <p style={{ color: '#9ca3af', fontSize: '0.88rem', marginTop: '4px' }}>
            Create multi-week progressive training routines. Admin approval ensures verified content for trainees.
          </p>
        </div>

        <button
          onClick={handleOpenNewBuilder}
          style={{
            background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
            color: '#fff',
            border: 'none',
            padding: '10px 22px',
            borderRadius: '8px',
            fontWeight: 700,
            fontSize: '0.92rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            boxShadow: '0 4px 14px rgba(59, 130, 246, 0.4)'
          }}
        >
          <Plus size={18} />
          Create Workout Program
        </button>
      </div>

      {/* Admin Approval Notice Banner */}
      {isAdmin && pendingCount > 0 && (
        <div style={{
          background: 'rgba(245, 158, 11, 0.1)',
          border: '1px solid rgba(245, 158, 11, 0.3)',
          borderRadius: '12px',
          padding: '16px 20px',
          marginBottom: '20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '12px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <AlertTriangle size={22} color="#f59e0b" />
            <div>
              <strong style={{ color: '#fbbf24', fontSize: '0.95rem' }}>
                {pendingCount} Program{pendingCount > 1 ? 's' : ''} Pending Senior Admin Review
              </strong>
              <p style={{ margin: 0, fontSize: '0.82rem', color: '#d1d5db' }}>
                Verify exercises and click "Approve &amp; Publish" to grant permission for user access.
              </p>
            </div>
          </div>

          <button
            onClick={() => setStatusFilter('pending_review')}
            style={{
              background: '#f59e0b',
              color: '#000',
              fontWeight: 700,
              border: 'none',
              padding: '6px 14px',
              borderRadius: '6px',
              fontSize: '0.82rem',
              cursor: 'pointer'
            }}
          >
            Filter Pending Queue ({pendingCount})
          </button>
        </div>
      )}

      {/* Filter Tabs & Search */}
      <div style={{
        background: '#111827',
        border: '1px solid #1f2937',
        borderRadius: '12px',
        padding: '16px',
        marginBottom: '24px',
        display: 'flex',
        flexDirection: 'column',
        gap: '14px'
      }}>
        {/* Status Tabs */}
        <div style={{ display: 'flex', gap: '8px', borderBottom: '1px solid #1f2937', paddingBottom: '12px', overflowX: 'auto' }}>
          {[
            { id: 'all', label: 'All Programs', count: programs.length },
            { id: 'pending_review', label: 'Pending Review', count: pendingCount, highlight: pendingCount > 0 },
            { id: 'published', label: 'Live for Users', count: programs.filter(p => p.status === 'published').length },
            { id: 'draft', label: 'Drafts', count: programs.filter(p => p.status === 'draft').length }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setStatusFilter(tab.id)}
              style={{
                padding: '8px 16px',
                borderRadius: '8px',
                fontSize: '0.85rem',
                fontWeight: 600,
                border: 'none',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                background: statusFilter === tab.id ? '#3b82f6' : '#1f2937',
                color: statusFilter === tab.id ? '#fff' : '#9ca3af'
              }}
            >
              <span>{tab.label}</span>
              <span style={{
                background: statusFilter === tab.id ? 'rgba(255,255,255,0.25)' : '#374151',
                color: statusFilter === tab.id ? '#fff' : (tab.highlight ? '#f59e0b' : '#9ca3af'),
                padding: '2px 8px',
                borderRadius: '9999px',
                fontSize: '0.72rem',
                fontWeight: 700
              }}>
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        {/* Search */}
        <div style={{ position: 'relative' }}>
          <Search size={16} color="#9ca3af" style={{ position: 'absolute', left: '12px', top: '12px' }} />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search programs by title..."
            style={{
              width: '100%',
              padding: '9px 12px 9px 36px',
              borderRadius: '8px',
              background: '#1f2937',
              border: '1px solid #374151',
              color: '#fff',
              fontSize: '0.88rem'
            }}
          />
        </div>
      </div>

      {/* Program Cards Grid */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px 0', color: '#9ca3af' }}>
          <Clock size={24} className="spin" style={{ marginBottom: '10px' }} />
          <p>Loading programs from database...</p>
        </div>
      ) : filteredPrograms.length === 0 ? (
        <div style={{
          textAlign: 'center',
          padding: '60px 20px',
          background: '#111827',
          borderRadius: '12px',
          border: '1px dashed #374151'
        }}>
          <Dumbbell size={40} color="#4b5563" style={{ marginBottom: '12px' }} />
          <h3 style={{ fontSize: '1.1rem', color: '#e5e7eb', marginBottom: '6px' }}>No programs found</h3>
          <p style={{ color: '#9ca3af', fontSize: '0.85rem', marginBottom: '16px' }}>
            Build your first progressive routine with clean day-by-day syllabus.
          </p>
          <button
            onClick={handleOpenNewBuilder}
            className="btn-admin btn-admin-primary"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
          >
            <Plus size={16} /> Create Workout Program
          </button>
        </div>
      ) : (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))',
          gap: '20px'
        }}>
          {filteredPrograms.map(prog => (
            <div
              key={prog._id}
              style={{
                background: '#111827',
                border: prog.status === 'pending_review' ? '1px solid rgba(245, 158, 11, 0.4)' : '1px solid #1f2937',
                borderRadius: '14px',
                padding: '20px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                boxShadow: '0 4px 14px rgba(0,0,0,0.25)'
              }}
            >
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '10px', marginBottom: '10px' }}>
                  <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#f9fafb', margin: 0 }}>
                    {prog.title}
                  </h3>

                  <span style={{
                    fontSize: '0.72rem',
                    fontWeight: 700,
                    padding: '3px 8px',
                    borderRadius: '6px',
                    whiteSpace: 'nowrap',
                    background: prog.status === 'published' ? 'rgba(16, 185, 129, 0.15)' : (prog.status === 'pending_review' ? 'rgba(245, 158, 11, 0.15)' : 'rgba(156, 163, 175, 0.15)'),
                    color: prog.status === 'published' ? '#34d399' : (prog.status === 'pending_review' ? '#fbbf24' : '#9ca3af'),
                    border: `1px solid ${prog.status === 'published' ? 'rgba(16, 185, 129, 0.3)' : (prog.status === 'pending_review' ? 'rgba(245, 158, 11, 0.3)' : 'rgba(156, 163, 175, 0.3)')}`
                  }}>
                    {prog.status === 'published' ? '✅ Live (Approved)' : (prog.status === 'pending_review' ? '⏳ Pending Approval' : 'Draft')}
                  </span>
                </div>

                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '12px' }}>
                  <span style={{ fontSize: '0.75rem', background: '#1f2937', color: '#60a5fa', padding: '3px 8px', borderRadius: '4px', fontWeight: 600 }}>
                    {prog.goal || 'General Fitness'}
                  </span>
                  <span style={{ fontSize: '0.75rem', background: '#1f2937', color: '#d1d5db', padding: '3px 8px', borderRadius: '4px' }}>
                    {prog.durationWeeks || 4} Weeks ({Math.max(1, Math.round((prog.durationWeeks || 4) / 4))} Month{Math.round((prog.durationWeeks || 4) / 4) > 1 ? 's' : ''})
                  </span>
                  <span style={{ fontSize: '0.75rem', background: '#1f2937', color: '#d1d5db', padding: '3px 8px', borderRadius: '4px' }}>
                    {prog.daysPerWeek || 4} Days / Wk
                  </span>
                  <span style={{ fontSize: '0.75rem', background: '#1f2937', color: '#9ca3af', padding: '3px 8px', borderRadius: '4px' }}>
                    {prog.difficulty || 'Beginner'}
                  </span>
                </div>

                <div style={{ fontSize: '0.76rem', color: '#6b7280', marginBottom: '14px' }}>
                  Author: <strong>{prog.createdBy || 'Fitness Instructor'}</strong>
                </div>
              </div>

              {/* Action Buttons */}
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                paddingTop: '12px',
                borderTop: '1px solid #1f2937',
                flexWrap: 'wrap',
                gap: '8px'
              }}>
                {isAdmin && prog.status === 'pending_review' ? (
                  <button
                    onClick={() => handleAdminApprove(prog._id, prog.title)}
                    style={{
                      background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                      color: '#fff',
                      border: 'none',
                      padding: '6px 12px',
                      borderRadius: '6px',
                      fontSize: '0.78rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}
                  >
                    <CheckCircle2 size={14} /> Approve &amp; Publish
                  </button>
                ) : <div />}

                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    onClick={() => handleOpenEditBuilder(prog)}
                    style={{
                      background: '#1f2937',
                      color: '#93c5fd',
                      border: '1px solid #374151',
                      padding: '6px 12px',
                      borderRadius: '6px',
                      fontSize: '0.78rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}
                  >
                    <Edit2 size={13} /> Edit Program
                  </button>
                  <button
                    onClick={() => handleDeleteProgram(prog._id, prog.title)}
                    style={{
                      background: 'rgba(239, 68, 68, 0.1)',
                      color: '#f87171',
                      border: '1px solid rgba(239, 68, 68, 0.25)',
                      padding: '6px 10px',
                      borderRadius: '6px',
                      fontSize: '0.78rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}
                  >
                    <Trash2 size={13} /> Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* CLEAN, INTUITIVE MULTI-WEEK PROGRAM BUILDER MODAL */}
      <Modal
        isOpen={showBuilderModal}
        onClose={() => setShowBuilderModal(false)}
        title={editingProgram ? `Edit Program: ${formData.title}` : 'Workout Program Builder'}
        maxWidth="1200px"
      >
        <div>
          {/* STEP 1: ULTRA-CLEAN PROGRAM SETUP (ONLY EXACT REQUIRED FIELDS) */}
          {builderStep === 1 && (
            <form onSubmit={handleProceedToSyllabus} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div style={{
                background: '#111827',
                border: '1px solid #1f2937',
                borderRadius: '12px',
                padding: '24px',
                display: 'flex',
                flexDirection: 'column',
                gap: '18px'
              }}>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#f3f4f6', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Dumbbell size={20} color="#3b82f6" />
                  Step 1: Program Fundamentals
                </h3>

                {/* 1. Title */}
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#d1d5db', marginBottom: '8px' }}>
                    Program Title *
                  </label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="e.g. 4-Week Progressive Overload Hypertrophy"
                    required
                    style={{
                      width: '100%',
                      padding: '12px 14px',
                      borderRadius: '8px',
                      background: '#1f2937',
                      border: '1px solid #374151',
                      color: '#fff',
                      fontSize: '0.95rem'
                    }}
                  />
                </div>

                {/* 2. Goal & Difficulty */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#d1d5db', marginBottom: '8px' }}>
                      Primary Goal
                    </label>
                    <select
                      value={formData.goal}
                      onChange={(e) => setFormData({ ...formData, goal: e.target.value })}
                      style={{
                        width: '100%',
                        padding: '11px 14px',
                        borderRadius: '8px',
                        background: '#1f2937',
                        border: '1px solid #374151',
                        color: '#fff',
                        fontSize: '0.9rem'
                      }}
                    >
                      {GOALS.map(g => (
                        <option key={g} value={g}>{g}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#d1d5db', marginBottom: '8px' }}>
                      Difficulty Level
                    </label>
                    <select
                      value={formData.difficulty}
                      onChange={(e) => setFormData({ ...formData, difficulty: e.target.value })}
                      style={{
                        width: '100%',
                        padding: '11px 14px',
                        borderRadius: '8px',
                        background: '#1f2937',
                        border: '1px solid #374151',
                        color: '#fff',
                        fontSize: '0.9rem'
                      }}
                    >
                      {DIFFICULTIES.map(d => (
                        <option key={d} value={d}>{d}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* 3. Duration & Days per Week & Equipment */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#d1d5db', marginBottom: '8px' }}>
                      Duration in Weeks (e.g. 4 Weeks = 1 Month)
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="52"
                      value={formData.durationWeeks}
                      onChange={(e) => setFormData({ ...formData, durationWeeks: Number(e.target.value) })}
                      style={{
                        width: '100%',
                        padding: '11px 14px',
                        borderRadius: '8px',
                        background: '#1f2937',
                        border: '1px solid #374151',
                        color: '#fff',
                        fontSize: '0.9rem'
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#d1d5db', marginBottom: '8px' }}>
                      Training Days per Week
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="7"
                      value={formData.daysPerWeek}
                      onChange={(e) => setFormData({ ...formData, daysPerWeek: Number(e.target.value) })}
                      style={{
                        width: '100%',
                        padding: '11px 14px',
                        borderRadius: '8px',
                        background: '#1f2937',
                        border: '1px solid #374151',
                        color: '#fff',
                        fontSize: '0.9rem'
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#d1d5db', marginBottom: '8px' }}>
                      Equipment Access
                    </label>
                    <select
                      value={formData.equipmentTrack}
                      onChange={(e) => setFormData({ ...formData, equipmentTrack: e.target.value })}
                      style={{
                        width: '100%',
                        padding: '11px 14px',
                        borderRadius: '8px',
                        background: '#1f2937',
                        border: '1px solid #374151',
                        color: '#fff',
                        fontSize: '0.9rem'
                      }}
                    >
                      {EQUIPMENT_OPTIONS.map(opt => (
                        <option key={opt} value={opt}>{opt}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Action */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => setShowBuilderModal(false)}
                  className="btn-admin btn-admin-secondary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{
                    background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                    color: '#fff',
                    border: 'none',
                    padding: '11px 24px',
                    borderRadius: '8px',
                    fontWeight: 700,
                    fontSize: '0.95rem',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}
                >
                  Proceed to Day-by-Day Syllabus Index <ArrowRight size={16} />
                </button>
              </div>
            </form>
          )}

          {/* STEP 2: USER-INDEX / SYLLABUS STYLE DAY-BY-DAY OVERLOAD WORKSPACE */}
          {builderStep === 2 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* Top Navigation Bar: Back to Meta & Summary */}
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '12px 16px',
                background: '#111827',
                borderRadius: '10px',
                border: '1px solid #1f2937',
                flexWrap: 'wrap',
                gap: '10px'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <button
                    type="button"
                    onClick={() => setBuilderStep(1)}
                    style={{
                      background: '#1f2937',
                      color: '#9ca3af',
                      border: '1px solid #374151',
                      padding: '6px 12px',
                      borderRadius: '6px',
                      fontSize: '0.82rem',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}
                  >
                    <ArrowLeft size={14} /> Back to Step 1
                  </button>

                  <div>
                    <strong style={{ fontSize: '1rem', color: '#f3f4f6' }}>{formData.title}</strong>
                    <span style={{ fontSize: '0.78rem', color: '#60a5fa', marginLeft: '8px' }}>
                      ({formData.weeks.length} Weeks • {formData.daysPerWeek} Days/Wk)
                    </span>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    type="button"
                    onClick={handleCopyDayToNext}
                    style={{
                      background: '#1f2937',
                      color: '#34d399',
                      border: '1px solid #374151',
                      padding: '6px 14px',
                      borderRadius: '6px',
                      fontSize: '0.8rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px'
                    }}
                    title="Copy current day's exercises to next day"
                  >
                    <Copy size={13} /> Copy Day to Next
                  </button>
                </div>
              </div>

              {/* 2-COLUMN MAIN WORKSPACE */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: '290px 1fr',
                gap: '18px',
                minHeight: '550px'
              }}>
                {/* LEFT COLUMN: PROGRAM SYLLABUS INDEX (COURSERA-STYLE CLEAN LIST) */}
                <div style={{
                  background: '#111827',
                  border: '1px solid #1f2937',
                  borderRadius: '12px',
                  padding: '16px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px',
                  maxHeight: '620px',
                  overflowY: 'auto'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.85rem', fontWeight: 800, color: '#f3f4f6', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                      Program Index
                    </span>
                    <span style={{ fontSize: '0.75rem', color: '#9ca3af' }}>
                      {formData.weeks.length} Weeks
                    </span>
                  </div>

                  {formData.weeks.map(week => (
                    <div key={week.weekNumber} style={{ borderBottom: '1px solid #1f2937', paddingBottom: '10px' }}>
                      <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#93c5fd', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Calendar size={13} /> Week {week.weekNumber}
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        {week.days.map(day => {
                          const isSelected = (week.weekNumber === selectedWeekNum && day.dayNumber === selectedDayNum);
                          const exCount = (day.exercises || []).length;
                          const isRest = day.dayType === 'rest';

                          return (
                            <button
                              key={day.dayNumber}
                              type="button"
                              onClick={() => {
                                setSelectedWeekNum(week.weekNumber);
                                setSelectedDayNum(day.dayNumber);
                              }}
                              style={{
                                width: '100%',
                                textAlign: 'left',
                                padding: '8px 10px',
                                borderRadius: '6px',
                                border: isSelected ? '1px solid #3b82f6' : '1px solid transparent',
                                background: isSelected ? 'rgba(59, 130, 246, 0.2)' : 'transparent',
                                color: isSelected ? '#fff' : '#d1d5db',
                                cursor: 'pointer',
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                transition: 'all 0.15s'
                              }}
                            >
                              <div style={{ overflow: 'hidden' }}>
                                <div style={{ fontSize: '0.82rem', fontWeight: 600, whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>
                                  Day {day.dayNumber}: {isRest ? 'Rest Day' : (day.title || `Day ${day.dayNumber}`)}
                                </div>
                              </div>

                              <span style={{
                                fontSize: '0.7rem',
                                fontWeight: 700,
                                padding: '2px 6px',
                                borderRadius: '4px',
                                background: isRest ? '#374151' : (exCount > 0 ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.15)'),
                                color: isRest ? '#9ca3af' : (exCount > 0 ? '#34d399' : '#f87171')
                              }}>
                                {isRest ? 'Rest' : `${exCount} Ex`}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>

                {/* RIGHT COLUMN: ACTIVE DAY WORKSPACE */}
                {currentDay && (
                  <div style={{
                    background: '#111827',
                    border: '1px solid #1f2937',
                    borderRadius: '12px',
                    padding: '20px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '16px',
                    maxHeight: '620px',
                    overflowY: 'auto'
                  }}>
                    {/* Day Banner & Mode Toggle */}
                    <div style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      borderBottom: '1px solid #1f2937',
                      paddingBottom: '14px',
                      flexWrap: 'wrap',
                      gap: '12px'
                    }}>
                      <div>
                        <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#60a5fa', textTransform: 'uppercase' }}>
                          Week {selectedWeekNum} Syllabus
                        </span>
                        <h2 style={{ fontSize: '1.35rem', fontWeight: 800, color: '#f3f4f6', margin: '2px 0 0 0' }}>
                          Week {selectedWeekNum} • Day {selectedDayNum}
                        </h2>
                      </div>

                      {/* Day Type Toggle */}
                      <div style={{ display: 'flex', background: '#1f2937', padding: '3px', borderRadius: '8px' }}>
                        <button
                          type="button"
                          onClick={() => updateCurrentDayField('dayType', 'workout')}
                          style={{
                            padding: '6px 14px',
                            borderRadius: '6px',
                            fontSize: '0.82rem',
                            fontWeight: 700,
                            border: 'none',
                            cursor: 'pointer',
                            background: currentDay.dayType !== 'rest' ? '#3b82f6' : 'transparent',
                            color: currentDay.dayType !== 'rest' ? '#fff' : '#9ca3af'
                          }}
                        >
                          💪 Workout Day
                        </button>
                        <button
                          type="button"
                          onClick={() => updateCurrentDayField('dayType', 'rest')}
                          style={{
                            padding: '6px 14px',
                            borderRadius: '6px',
                            fontSize: '0.82rem',
                            fontWeight: 700,
                            border: 'none',
                            cursor: 'pointer',
                            background: currentDay.dayType === 'rest' ? '#4b5563' : 'transparent',
                            color: currentDay.dayType === 'rest' ? '#fff' : '#9ca3af'
                          }}
                        >
                          🛌 Rest Day
                        </button>
                      </div>
                    </div>

                    {/* Day Title Input */}
                    <div>
                      <label style={{ display: 'block', fontSize: '0.8rem', color: '#9ca3af', marginBottom: '6px' }}>
                        Day Focus / Title
                      </label>
                      <input
                        type="text"
                        value={currentDay.title || ''}
                        onChange={(e) => updateCurrentDayField('title', e.target.value)}
                        placeholder="e.g. Chest & Triceps (Volume Overload)"
                        style={{
                          width: '100%',
                          padding: '9px 12px',
                          borderRadius: '8px',
                          background: '#1f2937',
                          border: '1px solid #374151',
                          color: '#fff',
                          fontSize: '0.9rem'
                        }}
                      />
                    </div>

                    {/* If Rest Day */}
                    {currentDay.dayType === 'rest' ? (
                      <div style={{
                        textAlign: 'center',
                        padding: '40px 20px',
                        background: '#1f2937',
                        borderRadius: '10px',
                        border: '1px dashed #374151'
                      }}>
                        <BedDouble size={36} color="#9ca3af" style={{ marginBottom: '10px' }} />
                        <h4 style={{ color: '#f3f4f6', margin: '0 0 6px 0' }}>Rest &amp; Muscle Recovery Day</h4>
                        <p style={{ color: '#9ca3af', fontSize: '0.85rem', margin: 0 }}>
                          No exercises scheduled for this day. Muscles recover and synthesize protein.
                        </p>
                      </div>
                    ) : (
                      <>
                        {/* SEARCH & ADD EXERCISE BAR */}
                        <div style={{
                          background: '#1f2937',
                          border: '1px solid #374151',
                          borderRadius: '10px',
                          padding: '14px'
                        }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                            <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#f3f4f6', display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <Search size={15} color="#3b82f6" /> Find &amp; Add Exercise from Library
                            </span>
                            <button
                              type="button"
                              onClick={handleAddCustomExercise}
                              style={{
                                background: '#374151',
                                color: '#93c5fd',
                                border: 'none',
                                padding: '4px 10px',
                                borderRadius: '4px',
                                fontSize: '0.78rem',
                                fontWeight: 600,
                                cursor: 'pointer'
                              }}
                            >
                              + Custom Exercise Row
                            </button>
                          </div>

                          {/* Quick Category & Intent Pills */}
                          <div style={{ display: 'flex', gap: '6px', overflowX: 'auto', marginBottom: '10px', paddingBottom: '2px' }}>
                            {['All', 'Warm-up & Stretch', 'Chest', 'Back', 'Legs', 'Shoulders', 'Arms', 'Core', 'Cardio'].map(cat => (
                              <button
                                key={cat}
                                type="button"
                                onClick={() => setLibraryFilterCategory(cat)}
                                style={{
                                  padding: '4px 10px',
                                  borderRadius: '6px',
                                  fontSize: '0.75rem',
                                  fontWeight: 600,
                                  border: libraryFilterCategory === cat ? '1px solid #3b82f6' : '1px solid #374151',
                                  background: libraryFilterCategory === cat ? 'rgba(59, 130, 246, 0.25)' : '#111827',
                                  color: libraryFilterCategory === cat ? '#60a5fa' : '#9ca3af',
                                  cursor: 'pointer',
                                  whiteSpace: 'nowrap'
                                }}
                              >
                                {cat}
                              </button>
                            ))}
                          </div>

                          {/* Smart Search Input */}
                          <div style={{ position: 'relative', marginBottom: '10px' }}>
                            <Search size={14} color="#9ca3af" style={{ position: 'absolute', left: '10px', top: '10px' }} />
                            <input
                              type="text"
                              value={exSearchQuery}
                              onChange={(e) => setExSearchQuery(e.target.value)}
                              placeholder="Search by name, intent, or keyword (e.g. warmup, body stretch, wall, dumbbells)..."
                              style={{
                                width: '100%',
                                padding: '8px 10px 8px 32px',
                                borderRadius: '6px',
                                background: '#111827',
                                border: '1px solid #4b5563',
                                color: '#fff',
                                fontSize: '0.85rem'
                              }}
                            />
                          </div>

                          {/* Matching Exercise Results List (Clean Rows with View & Add) */}
                          <div style={{
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '6px',
                            maxHeight: '190px',
                            overflowY: 'auto',
                            background: '#111827',
                            borderRadius: '8px',
                            padding: '8px',
                            border: '1px solid #1f2937'
                          }}>
                            {filteredLibraryExercises.length === 0 ? (
                              <div style={{ fontSize: '0.8rem', color: '#9ca3af', padding: '12px', textAlign: 'center' }}>
                                No exercises found matching "{exSearchQuery}". Try broader words like "stretch", "chest", or "squat".
                              </div>
                            ) : (
                              filteredLibraryExercises.slice(0, 20).map(ex => (
                                <div
                                  key={ex._id || ex.exerciseId}
                                  style={{
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    padding: '7px 10px',
                                    borderRadius: '6px',
                                    background: '#182030',
                                    border: '1px solid #232d42'
                                  }}
                                >
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', overflow: 'hidden' }}>
                                    <span style={{ fontSize: '0.84rem', fontWeight: 700, color: '#f3f4f6', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                      {ex.name}
                                    </span>
                                    <span style={{ fontSize: '0.7rem', padding: '2px 6px', borderRadius: '4px', background: 'rgba(59, 130, 246, 0.15)', color: '#60a5fa', whiteSpace: 'nowrap' }}>
                                      {ex.category || 'General'}
                                    </span>
                                    {Array.isArray(ex.targetMuscles) && ex.targetMuscles[0] && (
                                      <span style={{ fontSize: '0.7rem', color: '#9ca3af', whiteSpace: 'nowrap' }}>
                                        • {ex.targetMuscles.slice(0, 2).join(', ')}
                                      </span>
                                    )}
                                  </div>

                                  <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
                                    {/* 👁️ VIEW PREVIEW BUTTON */}
                                    <button
                                      type="button"
                                      onClick={() => setPreviewExercise(ex)}
                                      style={{
                                        background: '#1f2937',
                                        color: '#93c5fd',
                                        border: '1px solid #374151',
                                        padding: '4px 8px',
                                        borderRadius: '4px',
                                        fontSize: '0.74rem',
                                        fontWeight: 600,
                                        cursor: 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '3px'
                                      }}
                                      title="Preview exercise technique & GIF"
                                    >
                                      <Eye size={12} /> View
                                    </button>

                                    {/* + ADD TO DAY BUTTON */}
                                    <button
                                      type="button"
                                      onClick={() => handleAddExerciseToCurrentDay(ex)}
                                      style={{
                                        background: '#3b82f6',
                                        color: '#fff',
                                        border: 'none',
                                        padding: '4px 10px',
                                        borderRadius: '4px',
                                        fontSize: '0.74rem',
                                        fontWeight: 700,
                                        cursor: 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '3px'
                                      }}
                                    >
                                      <Plus size={12} /> Add
                                    </button>
                                  </div>
                                </div>
                              ))
                            )}
                          </div>
                        </div>

                        {/* EXERCISE LIST FOR ACTIVE DAY */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontSize: '0.85rem', fontWeight: 800, color: '#f3f4f6' }}>
                              Session Exercises ({(currentDay.exercises || []).length})
                            </span>
                            <span style={{ fontSize: '0.75rem', color: '#9ca3af' }}>
                              Trainer can add as many exercises as needed
                            </span>
                          </div>

                          {(!currentDay.exercises || currentDay.exercises.length === 0) ? (
                            <div style={{
                              textAlign: 'center',
                              padding: '24px',
                              background: '#1f2937',
                              borderRadius: '8px',
                              border: '1px dashed #374151',
                              color: '#9ca3af',
                              fontSize: '0.85rem'
                            }}>
                              No exercises added yet for Week {selectedWeekNum} • Day {selectedDayNum}.
                              <br />
                              Click any exercise from the library above to add it.
                            </div>
                          ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                              {currentDay.exercises.map((ex, exIdx) => (
                                <div
                                  key={exIdx}
                                  style={{
                                    background: '#1f2937',
                                    border: '1px solid #374151',
                                    borderRadius: '10px',
                                    padding: '14px',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: '10px'
                                  }}
                                >
                                  {/* Row Header */}
                                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                      <span style={{
                                        background: '#3b82f6',
                                        color: '#fff',
                                        fontSize: '0.75rem',
                                        fontWeight: 800,
                                        width: '24px',
                                        height: '24px',
                                        borderRadius: '50%',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center'
                                      }}>
                                        {exIdx + 1}
                                      </span>

                                      <input
                                        type="text"
                                        value={ex.name}
                                        onChange={(e) => handleUpdateExercise(exIdx, 'name', e.target.value)}
                                        placeholder="Exercise Name"
                                        style={{
                                          padding: '4px 8px',
                                          borderRadius: '6px',
                                          background: '#111827',
                                          border: '1px solid #4b5563',
                                          color: '#fff',
                                          fontSize: '0.9rem',
                                          fontWeight: 700,
                                          minWidth: '220px'
                                        }}
                                      />

                                      <input
                                        type="text"
                                        value={ex.targetMuscle || ''}
                                        onChange={(e) => handleUpdateExercise(exIdx, 'targetMuscle', e.target.value)}
                                        placeholder="Muscle (e.g. Chest)"
                                        style={{
                                          padding: '4px 8px',
                                          borderRadius: '6px',
                                          background: '#111827',
                                          border: '1px solid #4b5563',
                                          color: '#60a5fa',
                                          fontSize: '0.8rem'
                                        }}
                                      />
                                    </div>

                                    {/* Move & Delete */}
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                      <button
                                        type="button"
                                        disabled={exIdx === 0}
                                        onClick={() => handleMoveExercise(exIdx, 'up')}
                                        style={{ background: 'transparent', border: 'none', color: exIdx === 0 ? '#4b5563' : '#9ca3af', cursor: exIdx === 0 ? 'default' : 'pointer', padding: '2px' }}
                                        title="Move Up"
                                      >
                                        <MoveUp size={16} />
                                      </button>
                                      <button
                                        type="button"
                                        disabled={exIdx === currentDay.exercises.length - 1}
                                        onClick={() => handleMoveExercise(exIdx, 'down')}
                                        style={{ background: 'transparent', border: 'none', color: exIdx === currentDay.exercises.length - 1 ? '#4b5563' : '#9ca3af', cursor: exIdx === currentDay.exercises.length - 1 ? 'default' : 'pointer', padding: '2px' }}
                                        title="Move Down"
                                      >
                                        <MoveDown size={16} />
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => handleRemoveExercise(exIdx)}
                                        style={{ background: 'transparent', border: 'none', color: '#f87171', cursor: 'pointer', padding: '2px', marginLeft: '6px' }}
                                        title="Remove Exercise"
                                      >
                                        <Trash2 size={16} />
                                      </button>
                                    </div>
                                  </div>

                                  {/* Inputs Grid (Sets, Reps, Weight/Overload, Rest) */}
                                  <div style={{ display: 'grid', gridTemplateColumns: '80px 100px 1fr 90px', gap: '10px' }}>
                                    <div>
                                      <label style={{ display: 'block', fontSize: '0.72rem', color: '#9ca3af', marginBottom: '4px' }}>
                                        Sets
                                      </label>
                                      <input
                                        type="number"
                                        min="1"
                                        max="20"
                                        value={ex.sets}
                                        onChange={(e) => handleUpdateExercise(exIdx, 'sets', Number(e.target.value))}
                                        style={{ width: '100%', padding: '6px 8px', borderRadius: '6px', background: '#111827', border: '1px solid #4b5563', color: '#60a5fa', fontSize: '0.85rem', fontWeight: 700 }}
                                      />
                                    </div>

                                    <div>
                                      <label style={{ display: 'block', fontSize: '0.72rem', color: '#9ca3af', marginBottom: '4px' }}>
                                        Reps
                                      </label>
                                      <input
                                        type="text"
                                        value={ex.reps}
                                        onChange={(e) => handleUpdateExercise(exIdx, 'reps', e.target.value)}
                                        placeholder="10-12"
                                        style={{ width: '100%', padding: '6px 8px', borderRadius: '6px', background: '#111827', border: '1px solid #4b5563', color: '#34d399', fontSize: '0.85rem', fontWeight: 700 }}
                                      />
                                    </div>

                                    <div>
                                      <label style={{ display: 'block', fontSize: '0.72rem', color: '#f59e0b', marginBottom: '4px' }}>
                                        Target Weight / Progressive Overload Cue
                                      </label>
                                      <input
                                        type="text"
                                        value={ex.targetWeight || ''}
                                        onChange={(e) => handleUpdateExercise(exIdx, 'targetWeight', e.target.value)}
                                        placeholder="e.g. 60kg (+2.5kg each set) or Moderate"
                                        style={{ width: '100%', padding: '6px 8px', borderRadius: '6px', background: '#111827', border: '1px solid #4b5563', color: '#f59e0b', fontSize: '0.85rem' }}
                                      />
                                    </div>

                                    <div>
                                      <label style={{ display: 'block', fontSize: '0.72rem', color: '#9ca3af', marginBottom: '4px' }}>
                                        Rest (sec)
                                      </label>
                                      <input
                                        type="number"
                                        value={ex.restSeconds || 60}
                                        onChange={(e) => handleUpdateExercise(exIdx, 'restSeconds', Number(e.target.value))}
                                        style={{ width: '100%', padding: '6px 8px', borderRadius: '6px', background: '#111827', border: '1px solid #4b5563', color: '#d1d5db', fontSize: '0.85rem' }}
                                      />
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>

              {/* Step 2 Bottom Action Bar */}
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                paddingTop: '16px',
                borderTop: '1px solid #374151',
                flexWrap: 'wrap',
                gap: '12px'
              }}>
                <button
                  type="button"
                  onClick={() => setShowBuilderModal(false)}
                  className="btn-admin btn-admin-secondary"
                >
                  Cancel
                </button>

                <div style={{ display: 'flex', gap: '10px' }}>
                  <button
                    type="button"
                    disabled={submitting}
                    onClick={() => handleSaveProgram('draft')}
                    style={{
                      background: '#374151',
                      color: '#d1d5db',
                      border: 'none',
                      padding: '10px 18px',
                      borderRadius: '8px',
                      fontWeight: 600,
                      fontSize: '0.88rem',
                      cursor: 'pointer'
                    }}
                  >
                    Save Draft
                  </button>

                  {isAdmin ? (
                    <button
                      type="button"
                      disabled={submitting}
                      onClick={() => handleSaveProgram('published')}
                      style={{
                        background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                        color: '#fff',
                        border: 'none',
                        padding: '10px 22px',
                        borderRadius: '8px',
                        fontWeight: 700,
                        fontSize: '0.88rem',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px'
                      }}
                    >
                      <CheckCircle2 size={16} /> Publish Directly to Users
                    </button>
                  ) : (
                    <button
                      type="button"
                      disabled={submitting}
                      onClick={() => handleSaveProgram('pending_review')}
                      style={{
                        background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                        color: '#fff',
                        border: 'none',
                        padding: '10px 22px',
                        borderRadius: '8px',
                        fontWeight: 700,
                        fontSize: '0.88rem',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px'
                      }}
                    >
                      <CheckCircle2 size={16} /> Submit for Admin Approval
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </Modal>

      {/* Exercise Instant Preview Modal (GIF + Instructions) */}
      {previewExercise && (
        <Modal
          isOpen={Boolean(previewExercise)}
          onClose={() => setPreviewExercise(null)}
          title={`Exercise Preview: ${previewExercise.name}`}
          maxWidth="620px"
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {/* GIF / Video Demonstration */}
            {(previewExercise.gifUrl || previewExercise.mediaUrl || previewExercise.videoUrl) ? (
              <div style={{ textAlign: 'center', background: '#0b0f19', borderRadius: '8px', padding: '12px', border: '1px solid #1f2937' }}>
                <img
                  src={previewExercise.gifUrl || previewExercise.mediaUrl || previewExercise.videoUrl}
                  alt={previewExercise.name}
                  style={{ maxHeight: '250px', maxWidth: '100%', objectFit: 'contain', borderRadius: '6px' }}
                />
              </div>
            ) : (
              <div style={{ padding: '30px', textAlign: 'center', background: '#1f2937', borderRadius: '8px', color: '#9ca3af', fontSize: '0.85rem' }}>
                No animation preview uploaded for this exercise.
              </div>
            )}

            {/* Muscle & Equipment Badges */}
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '0.78rem', background: '#1f2937', color: '#60a5fa', padding: '4px 10px', borderRadius: '6px', fontWeight: 600 }}>
                Category: {previewExercise.category || 'General'}
              </span>
              <span style={{ fontSize: '0.78rem', background: '#1f2937', color: '#34d399', padding: '4px 10px', borderRadius: '6px', fontWeight: 600 }}>
                Target: {Array.isArray(previewExercise.targetMuscles) ? previewExercise.targetMuscles.join(', ') : (previewExercise.targetMuscles || 'Full Body')}
              </span>
              <span style={{ fontSize: '0.78rem', background: '#1f2937', color: '#d1d5db', padding: '4px 10px', borderRadius: '6px' }}>
                Equipment: {previewExercise.equipmentRequired || 'Bodyweight'}
              </span>
              <span style={{ fontSize: '0.78rem', background: '#1f2937', color: '#f59e0b', padding: '4px 10px', borderRadius: '6px' }}>
                Level: {previewExercise.difficulty || 'Beginner'}
              </span>
            </div>

            {/* Instructions & Coaching Cues */}
            <div>
              <label style={{ fontSize: '0.8rem', fontWeight: 700, color: '#9ca3af', display: 'block', marginBottom: '6px' }}>
                Step-by-Step Execution Guide:
              </label>
              <div style={{
                fontSize: '0.85rem',
                color: '#d1d5db',
                lineHeight: 1.55,
                background: '#1f2937',
                padding: '12px 14px',
                borderRadius: '8px',
                border: '1px solid #374151',
                maxHeight: '140px',
                overflowY: 'auto'
              }}>
                {previewExercise.instructions || previewExercise.description || 'Perform movement with slow eccentric control, full range of motion, and steady breathing.'}
              </div>
            </div>

            {/* Modal Actions */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '6px' }}>
              <button
                type="button"
                onClick={() => setPreviewExercise(null)}
                className="btn-admin btn-admin-secondary"
              >
                Close Preview
              </button>
              <button
                type="button"
                onClick={() => {
                  handleAddExerciseToCurrentDay(previewExercise);
                  setPreviewExercise(null);
                }}
                className="btn-admin btn-admin-primary"
                style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                <Plus size={16} /> Add This Exercise to Day
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default WorkoutProgramsPage;
