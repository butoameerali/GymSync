/**
 * DietProgramIndexView.jsx
 *
 * Coursera / ProgramIndexView style Syllabus & Day Navigation View for DIET & NUTRITION.
 * Modeled exactly after ProgramIndexView.jsx (clean dark surfaces, blue/emerald accents,
 * subtle borders, progress bar, weeks index, day rows, dedicated day meal timeline).
 *
 * Views:
 *   1. 'index' (default): Full syllabus table-of-contents with all weeks listed.
 *      Clicking any day row navigates to that day's dedicated meal view.
 *   2. 'day': Dedicated full-page view for the selected day with breadcrumb back,
 *      schedule & 5 meal slots (Subah, Dopahar, Shaam, Raat, Extra),
 *      what was eaten history, manual & AI coach data input, and Mark Complete action.
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  CheckCircle,
  Play,
  Calendar,
  Clock,
  Flame,
  Coffee,
  Sun,
  Moon,
  Cookie,
  Utensils,
  Zap,
  ArrowRight,
  Info,
  Award,
  X,
  Layers,
  BookOpen,
  Plus,
  Trash2,
  Sparkles,
  Search
} from 'lucide-react';
import foodLogService from './foodLogService';

const MEAL_SLOTS = [
  { id: 'breakfast', label: 'Subah (Breakfast / Nashta)', icon: Coffee, color: '#f59e0b', desc: 'Complex carbs + high protein' },
  { id: 'lunch', label: 'Dopahar (Lunch)', icon: Sun, color: '#10b981', desc: 'Main balanced meal (Chicken/Daal + Roti/Rice + Salad)' },
  { id: 'snack', label: 'Shaam (Evening Snack / Chai)', icon: Zap, color: '#8b5cf6', desc: 'Asar / Maghrib Chai & Halka Snack' },
  { id: 'dinner', label: 'Raat (Dinner)', icon: Moon, color: '#3b82f6', desc: 'Light protein + vegetables & moderate hydration' },
  { id: 'extra', label: 'Extra (Beech Mein Jo Khaya)', icon: Cookie, color: '#ec4899', desc: 'Meetha, Fruits ya Beech Ke Snacks' }
];

const POPULAR_HOME_FOODS = [
  { foodId: 'pk_home_chicken', name: 'Chicken', calories: 260, minCalories: 220, maxCalories: 300, unit: '1 Plate (250g)', protein: 28, carbs: 6, fat: 13 },
  { foodId: 'pk_home_egg', name: 'Egg', calories: 140, minCalories: 120, maxCalories: 160, unit: '2 Eggs (~100g)', protein: 12.6, carbs: 1.1, fat: 9.8 },
  { foodId: 'pk_home_omelette', name: 'Omelette', calories: 180, minCalories: 155, maxCalories: 210, unit: '1 Omelette (~130g)', protein: 13, carbs: 3.5, fat: 12.5 },
  { foodId: 'pk_home_fries', name: 'Fries', calories: 290, minCalories: 250, maxCalories: 340, unit: '1 Plate (~150g)', protein: 3.5, carbs: 41, fat: 13 },
  { foodId: 'pk_home_oats', name: 'Oats', calories: 210, minCalories: 180, maxCalories: 240, unit: '1 Bowl (~220g)', protein: 8.5, carbs: 34, fat: 4.2 },
  { foodId: 'pk_home_roti', name: 'Roti', calories: 120, minCalories: 105, maxCalories: 135, unit: '1 Roti (~60g)', protein: 3.8, carbs: 24.5, fat: 0.8 },
  { foodId: 'pk_home_rice', name: 'Rice', calories: 210, minCalories: 185, maxCalories: 235, unit: '1 Plate (~180g)', protein: 4.2, carbs: 45, fat: 0.5 },
  { foodId: 'pk_home_daal', name: 'Daal', calories: 190, minCalories: 165, maxCalories: 220, unit: '1 Bowl (~200g)', protein: 11.5, carbs: 28, fat: 4 },
  { foodId: 'pk_home_paratha', name: 'Paratha', calories: 260, minCalories: 230, maxCalories: 300, unit: '1 Paratha (~80g)', protein: 4.8, carbs: 32, fat: 12 },
  { foodId: 'pk_home_mix_sabzi', name: 'Mix Sabzi', calories: 160, minCalories: 135, maxCalories: 185, unit: '1 Plate (~220g)', protein: 4.5, carbs: 23, fat: 5.5 },
  { foodId: 'pk_home_chai', name: 'Chai', calories: 95, minCalories: 80, maxCalories: 115, unit: '1 Cup (~150ml)', protein: 3, carbs: 9.5, fat: 4.5 },
  { foodId: 'pk_home_salad', name: 'Salad', calories: 45, minCalories: 35, maxCalories: 55, unit: '1 Plate (~150g)', protein: 1.8, carbs: 8.5, fat: 0.3 }
];

export const DietProgramIndexView = ({
  program,
  onOpenFoodLibrary,
  onBack
}) => {
  // Determine Program Structure
  const prog = program?.rawProgram || program;
  const initialDuration = Number(prog?.durationWeeks) || 4;
  const [durationWeeks, setDurationWeeks] = useState(() => {
    try {
      const saved = localStorage.getItem(`gymsync_diet_duration_${prog?._id || 'default'}`);
      return saved ? Number(saved) : initialDuration;
    } catch {
      return initialDuration;
    }
  });

  const totalWeeks = durationWeeks;
  const programTitle = prog?.title || `${totalWeeks}-Week Pakistani Diet & Nutrition Program`;
  const goal = prog?.goal || 'Fat Loss & Healthy Living';
  const instructorName = prog?.instructorName || 'GymSync Certified Dietitian';

  // Build the 7 Days per Week Template
  const generateDietWeeks = (weeksCount) => {
    const weekFocuses = [
      'Week 1: Metabolism Reset & Baseline Nutrition',
      'Week 2: High-Protein Intake & Sustained Satiety',
      'Week 3: Caloric Deficit & Clean Home Cooking',
      'Week 4: Peak Energy & Sustainable Healthy Habits',
      'Week 5: Glycogen Replenishment & Muscle Recovery',
      'Week 6: Micronutrient Density & Digestion Optimization',
      'Week 7: Advanced Portion Control & Electrolyte Balance',
      'Week 8: Long-Term Lifestyle Mastery & Goal Achievement'
    ];

    const dayFocuses = [
      'Day 1: High Protein Kickstart',
      'Day 2: Fiber & Gut Health Balance',
      'Day 3: Clean Energy & Moderate Carbs',
      'Day 4: Lean Poultry & Light Salan',
      'Day 5: Low-Fat Hydrating Meals',
      'Day 6: Nutrient Dense Plant Power',
      'Day 7: Mindful Satiety & Weekly Review'
    ];

    const dayNames = ['Mon (Peer)', 'Tue (Mangal)', 'Wed (Budh)', 'Thu (Jumerat)', 'Fri (Jumma)', 'Sat (Hafta)', 'Sun (Itwar)'];

    return Array.from({ length: weeksCount }, (_, wIdx) => {
      const wNum = wIdx + 1;
      return {
        weekNumber: wNum,
        focus: weekFocuses[wIdx] || `Week ${wNum}: Progressive Nutrition Mastery`,
        days: Array.from({ length: 7 }, (_, dIdx) => {
          const dNum = dIdx + 1;
          return {
            dayNumber: dNum,
            dayName: dayNames[dIdx],
            title: dayFocuses[dIdx],
            estimatedCalories: 1850,
            targetProtein: '90-110g',
            targetCarbs: '180-210g',
            targetFat: '45-55g'
          };
        })
      };
    });
  };

  const dietWeeks = React.useMemo(() => generateDietWeeks(totalWeeks), [totalWeeks]);

  // View state: 'index' (Syllabus) | 'day' (Dedicated Day Meal View)
  const [viewState, setViewState] = useState('index');
  const [activeDayInfo, setActiveDayInfo] = useState(null); // { weekNum, dayObj }

  // Accordion state: only clicked weeks show their days to prevent long scrolling
  const [expandedWeeks, setExpandedWeeks] = useState(() => ({ 1: true }));

  const toggleWeek = (wNum) => {
    setExpandedWeeks(prev => ({
      ...prev,
      [wNum]: !prev[wNum]
    }));
  };

  const allWeeksExpanded = dietWeeks.length > 0 && dietWeeks.every(w => expandedWeeks[w.weekNumber]);
  const toggleAllWeeks = () => {
    if (allWeeksExpanded) {
      setExpandedWeeks({});
    } else {
      const all = {};
      dietWeeks.forEach(w => { all[w.weekNumber] = true; });
      setExpandedWeeks(all);
    }
  };

  // Completed Days Tracking (Stored in LocalStorage to persist progress)
  const storageKey = `gymsync_diet_completed_${prog?._id || 'default'}_${totalWeeks}w`;
  const [completedSessions, setCompletedSessions] = useState(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      setCompletedSessions(saved ? JSON.parse(saved) : []);
    } catch {
      setCompletedSessions([]);
    }
  }, [storageKey]);

  const markDayCompleted = (wNum, dNum) => {
    const key = `W${wNum}_D${dNum}`;
    let updated;
    if (completedSessions.includes(key)) {
      updated = completedSessions.filter(k => k !== key);
    } else {
      updated = [...completedSessions, key];
    }
    setCompletedSessions(updated);
    try {
      localStorage.setItem(storageKey, JSON.stringify(updated));
    } catch (e) {
      console.warn('Storage save error:', e);
    }
  };

  const isDayCompleted = (wNum, dNum) => {
    return completedSessions.includes(`W${wNum}_D${dNum}`);
  };

  const totalDays = totalWeeks * 7;
  const completedCount = completedSessions.length;
  const progressPct = totalDays > 0 ? Math.round((completedCount / totalDays) * 100) : 0;
  const isAllProgramCompleted = completedCount >= totalDays;

  // Calculate target calendar date for selected week & day
  const getCalculatedDate = useCallback((wNum, dNum) => {
    const now = new Date();
    const currentDayOfWeek = (now.getDay() + 6) % 7; // 0 = Mon, 6 = Sun
    const monday = new Date(now);
    monday.setDate(now.getDate() - currentDayOfWeek);

    const targetDate = new Date(monday);
    const dayOffset = (wNum - 1) * 7 + (dNum - 1);
    targetDate.setDate(monday.getDate() + dayOffset);
    return targetDate.toISOString().split('T')[0];
  }, []);

  // Day View State & Logs
  const activeWeekNum = activeDayInfo?.weekNum || 1;
  const activeDayObj = activeDayInfo?.dayObj || dietWeeks[0]?.days[0];
  const activeDateStr = getCalculatedDate(activeWeekNum, activeDayObj?.dayNumber || 1);
  const todayStr = new Date().toISOString().split('T')[0];
  const isToday = activeDateStr === todayStr;

  const [dailyLogs, setDailyLogs] = useState([]);
  const [dailySummary, setDailySummary] = useState(null);
  const [isLoadingLogs, setIsLoadingLogs] = useState(false);

  // Quick Add Meal Modal State
  const [activeSlotForAdd, setActiveSlotForAdd] = useState(null);
  const [modalSearchQuery, setModalSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedFoodToLog, setSelectedFoodToLog] = useState(null);
  const [logQuantity, setLogQuantity] = useState(1);
  const [logNotes, setLogNotes] = useState('');
  const [isSubmittingLog, setIsSubmittingLog] = useState(false);
  const [statusNotice, setStatusNotice] = useState(null);

  // Fetch Daily Logs when day view is active
  const fetchLogsForDay = useCallback(async (date) => {
    setIsLoadingLogs(true);
    try {
      const data = await foodLogService.getFoodLogs(date);
      if (data.success) {
        setDailyLogs(data.logs || []);
        setDailySummary(data.summary || null);
      }
    } catch (err) {
      console.warn('Failed to load food logs for day:', err);
    } finally {
      setIsLoadingLogs(false);
    }
  }, []);

  useEffect(() => {
    if (viewState === 'day') {
      fetchLogsForDay(activeDateStr);
    }
  }, [viewState, activeDateStr, fetchLogsForDay]);

  // Handle Search in Add Food Modal
  useEffect(() => {
    if (!activeSlotForAdd) return;
    if (!modalSearchQuery.trim()) {
      setSearchResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const res = await foodLogService.searchFoods(modalSearchQuery.trim(), 'all', 20);
        if (res.success) {
          setSearchResults(res.foods || []);
        }
      } catch (err) {
        console.warn('Search failed:', err);
      } finally {
        setIsSearching(false);
      }
    }, 200);

    return () => clearTimeout(timer);
  }, [modalSearchQuery, activeSlotForAdd]);

  // Submit Food Log to Meal Slot
  const handleSaveMealLog = async () => {
    if (!selectedFoodToLog || !activeSlotForAdd) return;

    setIsSubmittingLog(true);
    try {
      const payload = {
        date: activeDateStr,
        mealSlot: activeSlotForAdd,
        items: [{
          foodId: selectedFoodToLog.foodId,
          quantity: logQuantity
        }],
        notes: logNotes
      };

      const res = await foodLogService.logMeal(payload);
      if (res.success) {
        setStatusNotice({
          type: 'success',
          text: `✅ ${selectedFoodToLog.name} successfully logged in ${activeSlotForAdd.toUpperCase()}!`
        });
        setActiveSlotForAdd(null);
        setSelectedFoodToLog(null);
        setModalSearchQuery('');
        setLogQuantity(1);
        setLogNotes('');
        fetchLogsForDay(activeDateStr);
      }
    } catch (err) {
      setStatusNotice({ type: 'error', text: err.message || 'Failed to log food.' });
    } finally {
      setIsSubmittingLog(false);
    }
  };

  // Delete Log Entry
  const handleDeleteLog = async (logId) => {
    if (!window.confirm('Kya aap waqai is khane ki entry ko delete karna chahte hain?')) return;
    try {
      await foodLogService.deleteFoodLog(logId);
      fetchLogsForDay(activeDateStr);
    } catch (err) {
      console.warn('Failed to delete log entry:', err);
    }
  };

  const handleOpenDay = (weekNum, dayObj) => {
    setExpandedWeeks(prev => ({ ...prev, [weekNum]: true }));
    setActiveDayInfo({ weekNum, dayObj });
    setViewState('day');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Find next incomplete day for Continue CTA
  const nextIncomplete = (() => {
    for (const wk of dietWeeks) {
      for (const d of wk.days) {
        if (!isDayCompleted(wk.weekNumber, d.dayNumber)) {
          return { weekNum: wk.weekNumber, dayObj: d };
        }
      }
    }
    return null;
  })();

  // ══════════════════════════════════════════════════════════════════════════
  // VIEW 1: DEDICATED DAY VIEW (MEAL TIMELINE: SUBAH, DOPAHAR, SHAAM, RAAT)
  // ══════════════════════════════════════════════════════════════════════════
  if (viewState === 'day') {
    const isDone = isDayCompleted(activeWeekNum, activeDayObj.dayNumber);

    // Prev / Next day pointers
    const allDaysLinear = [];
    dietWeeks.forEach(w => {
      w.days.forEach(d => allDaysLinear.push({ weekNum: w.weekNumber, dayObj: d }));
    });
    const currentIndex = allDaysLinear.findIndex(
      item => item.weekNum === activeWeekNum && item.dayObj.dayNumber === activeDayObj.dayNumber
    );
    const prevDayItem = currentIndex > 0 ? allDaysLinear[currentIndex - 1] : null;
    const nextDayItem = currentIndex < allDaysLinear.length - 1 ? allDaysLinear[currentIndex + 1] : null;

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', maxWidth: '1000px', margin: '0 auto', width: '100%' }}>
        
        {/* Breadcrumb Back Button */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <button
            type="button"
            onClick={() => setViewState('index')}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--text-secondary)',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '0.88rem',
              fontWeight: 600,
              padding: '4px 0'
            }}
          >
            <ChevronLeft size={16} /> Wapas Diet Program Index Mein Jayein
          </button>

          <button
            type="button"
            onClick={onOpenFoodLibrary}
            style={{
              padding: '6px 12px',
              borderRadius: '8px',
              border: '1px solid var(--card-border)',
              background: 'var(--card-bg-light)',
              color: '#38bdf8',
              fontSize: '0.78rem',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <Search size={14} /> Food Library Kholein
          </button>
        </div>

        {/* Day Hero Header (Coursera/ProgramIndex Style) */}
        <div style={{
          background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.12) 0%, rgba(30, 41, 59, 0.7) 100%)',
          border: '1px solid rgba(59, 130, 246, 0.25)',
          borderRadius: '16px',
          padding: '24px 28px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '16px'
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', flexWrap: 'wrap' }}>
              <span style={{
                fontSize: '0.75rem',
                fontWeight: 700,
                padding: '3px 10px',
                borderRadius: '6px',
                background: 'rgba(59, 130, 246, 0.2)',
                color: '#60a5fa',
                textTransform: 'uppercase',
                letterSpacing: '0.5px'
              }}>
                Hafta {activeWeekNum} &bull; Din {activeDayObj.dayNumber} ({activeDayObj.dayName})
              </span>

              {isDone ? (
                <span style={{
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  padding: '3px 10px',
                  borderRadius: '6px',
                  background: 'rgba(16, 185, 129, 0.15)',
                  color: '#34d399'
                }}>
                  &check; Diet Log Completed
                </span>
              ) : isToday ? (
                <span style={{
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  padding: '3px 10px',
                  borderRadius: '6px',
                  background: 'rgba(16, 185, 129, 0.15)',
                  color: '#10b981'
                }}>
                  &bull; Aaj Ka Din
                </span>
              ) : (
                <span style={{
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  padding: '3px 10px',
                  borderRadius: '6px',
                  background: 'rgba(255, 255, 255, 0.08)',
                  color: 'var(--text-secondary)'
                }}>
                  Scheduled Diet Day
                </span>
              )}
            </div>

            <h2 style={{ margin: '0 0 6px 0', fontSize: '1.6rem', fontWeight: 800, color: 'var(--text-primary)' }}>
              {activeDayObj.title}
            </h2>
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px', fontSize: '0.84rem', color: 'var(--text-secondary)' }}>
              <span><Calendar size={14} style={{ verticalAlign: 'middle', marginRight: '4px' }} />Tarikh: {activeDateStr}</span>
              <span><Flame size={14} color="#f59e0b" style={{ verticalAlign: 'middle', marginRight: '4px' }} />Target Calories: ~{activeDayObj.estimatedCalories} kcal</span>
            </div>
          </div>

          {/* Action buttons in Hero Header */}
          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              type="button"
              onClick={() => markDayCompleted(activeWeekNum, activeDayObj.dayNumber)}
              style={{
                padding: '12px 18px',
                borderRadius: '10px',
                border: isDone ? '1px solid #10b981' : '1px solid rgba(255, 255, 255, 0.15)',
                background: isDone ? 'rgba(16, 185, 129, 0.2)' : 'rgba(255, 255, 255, 0.05)',
                color: isDone ? '#34d399' : 'var(--text-primary)',
                fontWeight: 700,
                fontSize: '0.88rem',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              <CheckCircle size={16} color={isDone ? '#34d399' : 'var(--text-secondary)'} />
              {isDone ? 'Day Completed ✓' : 'Mark Day Completed'}
            </button>
          </div>
        </div>

        {/* Nutritional Summary Banner */}
        <div style={{
          padding: '14px 20px',
          borderRadius: '12px',
          background: 'var(--card-bg, #0f172a)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '12px'
        }}>
          <div>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Is Din Ka Recorded Khana</span>
            <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#f59e0b' }}>
              {dailySummary?.totalCaloriesEstimated ? `🔥 ~${dailySummary.totalCaloriesEstimated} kcal` : 'Abhi koi khana record nahi hua'}
            </div>
          </div>
          <div style={{ display: 'flex', gap: '16px', fontSize: '0.8rem' }}>
            <span style={{ color: '#10b981' }}><strong>Protein:</strong> {dailySummary?.totalProteinG || 0}g</span>
            <span style={{ color: '#3b82f6' }}><strong>Carbs:</strong> {dailySummary?.totalCarbsG || 0}g</span>
            <span style={{ color: '#eab308' }}><strong>Fat:</strong> {dailySummary?.totalFatG || 0}g</span>
          </div>
        </div>

        {/* Status Notice if any */}
        {statusNotice && (
          <div style={{
            padding: '10px 14px',
            borderRadius: '8px',
            background: statusNotice.type === 'success' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
            border: statusNotice.type === 'success' ? '1px solid #10b981' : '1px solid #ef4444',
            color: statusNotice.type === 'success' ? '#34d399' : '#f87171',
            fontSize: '0.82rem',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <span>{statusNotice.text}</span>
            <X size={14} style={{ cursor: 'pointer' }} onClick={() => setStatusNotice(null)} />
          </div>
        )}

        {/* 5 Structured Meal Slots (Subah, Dopahar, Shaam, Raat, Extra) */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-primary)' }}>
            Schedule &amp; Meal Timings (Aap Nay Kya Khaya)
          </h3>

          {MEAL_SLOTS.map((slot) => {
            const SlotIcon = slot.icon;
            const slotLogs = dailyLogs.filter(log => log.mealSlot === slot.id);
            const hasLogs = slotLogs.length > 0;
            const slotCalories = slotLogs.reduce((sum, log) => sum + (log.caloriesEstimated || 0), 0);

            return (
              <div
                key={slot.id}
                style={{
                  background: 'var(--card-bg, #0f172a)',
                  border: hasLogs ? '1px solid rgba(255, 255, 255, 0.08)' : '1px dashed rgba(255, 255, 255, 0.08)',
                  borderRadius: '14px',
                  padding: '18px 20px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px'
                }}
              >
                {/* Slot Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{
                      width: '38px',
                      height: '38px',
                      borderRadius: '10px',
                      background: `${slot.color}20`,
                      color: slot.color,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}>
                      <SlotIcon size={18} />
                    </div>
                    <div>
                      <h4 style={{ margin: 0, fontSize: '0.98rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                        {slot.label}
                      </h4>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                        {slot.desc}
                      </span>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    {hasLogs && (
                      <span style={{
                        padding: '3px 8px',
                        borderRadius: '6px',
                        background: 'rgba(245, 158, 11, 0.15)',
                        color: '#f59e0b',
                        fontSize: '0.8rem',
                        fontWeight: 800
                      }}>
                        🔥 ~{slotCalories} kcal
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={() => {
                        setActiveSlotForAdd(slot.id);
                        setSelectedFoodToLog(null);
                        setModalSearchQuery('');
                        setLogQuantity(1);
                      }}
                      style={{
                        padding: '6px 12px',
                        borderRadius: '8px',
                        border: '1px solid rgba(16, 185, 129, 0.4)',
                        background: 'rgba(16, 185, 129, 0.12)',
                        color: '#34d399',
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px'
                      }}
                    >
                      <Plus size={14} /> Khana Input Karein
                    </button>
                  </div>
                </div>

                {/* Logged Food Items */}
                {hasLogs ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {slotLogs.map((log) => (
                      <div
                        key={log._id}
                        style={{
                          padding: '10px 14px',
                          borderRadius: '10px',
                          background: 'rgba(255, 255, 255, 0.02)',
                          border: '1px solid rgba(255, 255, 255, 0.05)',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          gap: '12px'
                        }}
                      >
                        <div>
                          {log.items?.map((item, idx) => (
                            <div key={idx} style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
                              <strong style={{ fontSize: '0.9rem', color: 'var(--text-primary)' }}>
                                {item.name}
                              </strong>
                              <span style={{ fontSize: '0.75rem', color: '#60a5fa' }}>
                                ({item.quantity} serving &bull; ~{item.caloriesEstimated} kcal)
                              </span>
                            </div>
                          ))}
                          {log.notes && (
                            <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                              Note: "{log.notes}"
                            </div>
                          )}
                        </div>

                        <button
                          type="button"
                          onClick={() => handleDeleteLog(log._id)}
                          style={{
                            background: 'none',
                            border: 'none',
                            color: '#ef4444',
                            cursor: 'pointer',
                            padding: '4px'
                          }}
                          title="Delete entry"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div style={{
                    padding: '10px 14px',
                    borderRadius: '8px',
                    background: 'rgba(255, 255, 255, 0.02)',
                    fontSize: '0.78rem',
                    color: 'var(--text-secondary)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}>
                    <span>Is waqt ka khana abhi record nahi hua.</span>
                    <span style={{ color: '#10b981', cursor: 'pointer', fontWeight: 600 }} onClick={() => setActiveSlotForAdd(slot.id)}>
                      + Add Karein
                    </span>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* AI Coach Hint Box */}
        <div style={{
          padding: '14px 18px',
          borderRadius: '12px',
          background: 'rgba(59, 130, 246, 0.08)',
          border: '1px solid rgba(59, 130, 246, 0.25)',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          fontSize: '0.82rem',
          color: '#93c5fd'
        }}>
          <Sparkles size={20} color="#3b82f6" style={{ flexShrink: 0 }} />
          <div>
            <strong>AI Coach Chat Se Direct Data Fill:</strong>
            <div style={{ marginTop: '2px', color: '#cbd5e1' }}>
              Aap AI Coach ko chat mein seedha Roman Urdu mein bata sakte hain (maslan <em>"Maine subah 2 anday aur 1 roti khayi"</em>). AI Coach automatically aap ke is day aur meal slot mein data fill kar dega!
            </div>
          </div>
        </div>

        {/* Bottom Pagination: Prev Day / Next Day */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '12px',
          padding: '16px 0',
          borderTop: '1px solid rgba(255, 255, 255, 0.08)'
        }}>
          <div>
            {prevDayItem && (
              <button
                type="button"
                onClick={() => handleOpenDay(prevDayItem.weekNum, prevDayItem.dayObj)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--text-secondary)',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  fontSize: '0.86rem',
                  fontWeight: 600
                }}
              >
                <ChevronLeft size={16} /> Hafta {prevDayItem.weekNum} &bull; Din {prevDayItem.dayObj.dayNumber}: {prevDayItem.dayObj.dayName}
              </button>
            )}
          </div>

          <div>
            {nextDayItem && (
              <button
                type="button"
                onClick={() => handleOpenDay(nextDayItem.weekNum, nextDayItem.dayObj)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--text-secondary)',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  fontSize: '0.86rem',
                  fontWeight: 600
                }}
              >
                Hafta {nextDayItem.weekNum} &bull; Din {nextDayItem.dayObj.dayNumber}: {nextDayItem.dayObj.dayName} <ChevronRight size={16} />
              </button>
            )}
          </div>
        </div>

        {/* Quick Add Meal Modal */}
        {activeSlotForAdd && (
          <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.8)',
            backdropFilter: 'blur(6px)',
            zIndex: 99999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px'
          }}>
            <div style={{
              background: 'var(--card-bg, #1e293b)',
              border: '1px solid var(--card-border, #334155)',
              borderRadius: '20px',
              width: '100%',
              maxWidth: '560px',
              maxHeight: '90vh',
              overflowY: 'auto',
              padding: '24px',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px',
              color: '#f8fafc'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <span style={{ fontSize: '0.72rem', color: '#10b981', fontWeight: 700, textTransform: 'uppercase' }}>
                    Khana Input Karein &bull; {MEAL_SLOTS.find(s => s.id === activeSlotForAdd)?.label}
                  </span>
                  <h3 style={{ margin: '4px 0 0', fontSize: '1.25rem', fontWeight: 800 }}>
                    Dish Ka Intikhab Karein ({activeDateStr})
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setActiveSlotForAdd(null);
                    setSelectedFoodToLog(null);
                  }}
                  style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: '4px' }}
                >
                  <X size={20} />
                </button>
              </div>

              {/* Quick Home Food Pills */}
              <div>
                <span style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: 600, display: 'block', marginBottom: '8px' }}>
                  Ghar Ke Popular Khane (Direct Tap):
                </span>
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                  {POPULAR_HOME_FOODS.map((food) => {
                    const isSelected = selectedFoodToLog?.foodId === food.foodId;
                    return (
                      <button
                        key={food.foodId}
                        type="button"
                        onClick={() => setSelectedFoodToLog(food)}
                        style={{
                          padding: '6px 12px',
                          borderRadius: '8px',
                          border: isSelected ? '1px solid #10b981' : '1px solid rgba(255, 255, 255, 0.1)',
                          background: isSelected ? 'rgba(16, 185, 129, 0.25)' : 'rgba(255, 255, 255, 0.05)',
                          color: isSelected ? '#10b981' : '#e2e8f0',
                          fontSize: '0.78rem',
                          fontWeight: 700,
                          cursor: 'pointer'
                        }}
                      >
                        {food.name}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Search Bar */}
              <div style={{ position: 'relative' }}>
                <input
                  type="text"
                  placeholder="Ya kisi bhi Pakistani dish ka naam search karein..."
                  value={modalSearchQuery}
                  onChange={(e) => setModalSearchQuery(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 14px 10px 36px',
                    borderRadius: '10px',
                    border: '1px solid var(--card-border, #334155)',
                    background: 'rgba(0,0,0,0.25)',
                    color: '#fff',
                    fontSize: '0.85rem'
                  }}
                />
                <Search size={16} color="#94a3b8" style={{ position: 'absolute', left: '12px', top: '12px' }} />
              </div>

              {/* Search Results */}
              {isSearching ? (
                <div style={{ fontSize: '0.8rem', color: '#94a3b8', textAlign: 'center', padding: '10px' }}>
                  Dishes dhoondh rahe hain...
                </div>
              ) : searchResults.length > 0 ? (
                <div style={{ maxHeight: '160px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {searchResults.map((f) => (
                    <div
                      key={f.foodId}
                      onClick={() => setSelectedFoodToLog(f)}
                      style={{
                        padding: '8px 12px',
                        borderRadius: '8px',
                        background: selectedFoodToLog?.foodId === f.foodId ? 'rgba(16, 185, 129, 0.2)' : 'rgba(255, 255, 255, 0.04)',
                        border: selectedFoodToLog?.foodId === f.foodId ? '1px solid #10b981' : '1px solid transparent',
                        cursor: 'pointer',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center'
                      }}
                    >
                      <div>
                        <div style={{ fontSize: '0.85rem', fontWeight: 700 }}>{f.simpleName || f.name}</div>
                        <div style={{ fontSize: '0.72rem', color: '#94a3b8' }}>{f.typicalServing?.unit}</div>
                      </div>
                      <span style={{ fontSize: '0.8rem', fontWeight: 800, color: '#f59e0b' }}>
                        ~{f.calories} kcal
                      </span>
                    </div>
                  ))}
                </div>
              ) : null}

              {/* Selected Dish & Portion Controller */}
              {selectedFoodToLog && (
                <div style={{
                  padding: '14px',
                  borderRadius: '12px',
                  background: 'rgba(16, 185, 129, 0.08)',
                  border: '1px solid rgba(16, 185, 129, 0.3)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '10px'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <strong style={{ fontSize: '0.95rem', color: '#34d399' }}>
                        {selectedFoodToLog.simpleName || selectedFoodToLog.name}
                      </strong>
                      <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                        Serving: {selectedFoodToLog.typicalServing?.unit || selectedFoodToLog.unit}
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#f59e0b' }}>
                        🔥 ~{Math.round((selectedFoodToLog.calories || 200) * logQuantity)} kcal
                      </div>
                    </div>
                  </div>

                  <div>
                    <span style={{ fontSize: '0.72rem', color: '#94a3b8', display: 'block', marginBottom: '6px' }}>
                      Miqdaar (Portions):
                    </span>
                    <div style={{ display: 'flex', gap: '6px' }}>
                      {[0.5, 1, 1.5, 2, 2.5, 3].map((qty) => (
                        <button
                          key={qty}
                          type="button"
                          onClick={() => setLogQuantity(qty)}
                          style={{
                            flex: 1,
                            padding: '6px',
                            borderRadius: '6px',
                            border: logQuantity === qty ? '1px solid #10b981' : '1px solid rgba(255, 255, 255, 0.1)',
                            background: logQuantity === qty ? '#10b981' : 'rgba(255, 255, 255, 0.05)',
                            color: logQuantity === qty ? '#fff' : '#cbd5e1',
                            fontWeight: 700,
                            fontSize: '0.75rem',
                            cursor: 'pointer'
                          }}
                        >
                          {qty}x
                        </button>
                      ))}
                    </div>
                  </div>

                  <input
                    type="text"
                    placeholder="Koi khas baat / note? (Optional)"
                    value={logNotes}
                    onChange={(e) => setLogNotes(e.target.value)}
                    style={{
                      padding: '8px 12px',
                      borderRadius: '8px',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      background: 'rgba(0,0,0,0.2)',
                      color: '#fff',
                      fontSize: '0.8rem'
                    }}
                  />
                </div>
              )}

              {/* Modal Actions */}
              <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
                <button
                  type="button"
                  onClick={() => {
                    setActiveSlotForAdd(null);
                    setSelectedFoodToLog(null);
                  }}
                  style={{
                    flex: 1,
                    padding: '10px',
                    borderRadius: '10px',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    background: 'transparent',
                    color: '#94a3b8',
                    fontWeight: 600,
                    fontSize: '0.85rem',
                    cursor: 'pointer'
                  }}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={!selectedFoodToLog || isSubmittingLog}
                  onClick={handleSaveMealLog}
                  style={{
                    flex: 2,
                    padding: '10px',
                    borderRadius: '10px',
                    border: 'none',
                    background: selectedFoodToLog ? '#10b981' : 'rgba(255, 255, 255, 0.1)',
                    color: selectedFoodToLog ? '#fff' : 'rgba(255, 255, 255, 0.4)',
                    fontWeight: 800,
                    fontSize: '0.88rem',
                    cursor: selectedFoodToLog ? 'pointer' : 'not-allowed'
                  }}
                >
                  {isSubmittingLog ? 'Record Ho Raha Hai...' : 'Khana Record Karein'}
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    );
  }

  // ══════════════════════════════════════════════════════════════════════════
  // VIEW 2: PROGRAM INDEX / SYLLABUS TABLE OF CONTENTS (EXACT COURSERA STYLE)
  // ══════════════════════════════════════════════════════════════════════════
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', maxWidth: '1000px', margin: '0 auto', width: '100%' }}>

      {/* Breadcrumb Back to Plans List */}
      {onBack && (
        <button
          type="button"
          onClick={onBack}
          style={{
            background: 'none',
            border: 'none',
            color: 'var(--text-secondary)',
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            fontSize: '0.88rem',
            fontWeight: 600,
            padding: '4px 0',
            width: 'fit-content'
          }}
        >
          <ChevronLeft size={16} /> Wapas Your Diet Plans Mein Jayein
        </button>
      )}

      {/* ── PROGRAM HERO HEADER (Exact ProgramIndexView Style) ── */}
      <div style={{
        background: 'var(--card-bg, #0f172a)',
        border: '1px solid rgba(255, 255, 255, 0.08)',
        borderRadius: '18px',
        padding: '26px 28px',
        position: 'relative'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flex: 1, minWidth: 0 }}>
            {/* Diet Program Icon */}
            <div style={{
              width: '56px',
              height: '56px',
              borderRadius: '14px',
              background: 'rgba(16, 185, 129, 0.12)',
              border: '1px solid rgba(16, 185, 129, 0.25)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
              color: '#34d399'
            }}>
              <Utensils size={28} />
            </div>

            <div style={{ minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: '6px' }}>
                <span style={{
                  fontSize: '0.72rem',
                  fontWeight: 700,
                  padding: '3px 8px',
                  borderRadius: '6px',
                  background: 'rgba(16, 185, 129, 0.15)',
                  color: '#34d399',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px'
                }}>
                  Diet Program ({totalWeeks} Weeks)
                </span>
                <span style={{
                  fontSize: '0.72rem',
                  padding: '3px 8px',
                  borderRadius: '6px',
                  background: 'rgba(255, 255, 255, 0.06)',
                  color: 'var(--text-secondary)',
                  fontWeight: 600
                }}>
                  Track &amp; Record Mode
                </span>
              </div>

              <h2 style={{ margin: '0 0 6px 0', fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1.2 }}>
                {programTitle}
              </h2>

              <p style={{ margin: 0, fontSize: '0.88rem', color: 'var(--text-secondary)' }}>
                Guided by <strong style={{ color: 'var(--text-primary)' }}>{instructorName}</strong>
                {' '}&bull;{' '}Goal: <strong style={{ color: '#60a5fa' }}>{goal}</strong>
                {' '}&bull;{' '}{totalWeeks} Weeks ({totalDays} Days)
              </p>
            </div>
          </div>

          {/* Progress stats */}
          <div style={{ textAlign: 'right', flexShrink: 0 }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '3px' }}>Your Diet Progress</div>
            <div style={{ fontSize: '1.6rem', fontWeight: 900, color: progressPct === 100 ? '#34d399' : '#60a5fa', lineHeight: 1 }}>
              {progressPct}%
            </div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
              {completedCount} of {totalDays} days recorded
            </div>
          </div>
        </div>

        {/* Progress bar */}
        <div style={{ marginTop: '18px' }}>
          <div style={{
            height: '5px',
            borderRadius: '99px',
            background: 'rgba(255, 255, 255, 0.08)',
            overflow: 'hidden'
          }}>
            <div style={{
              height: '100%',
              width: `${progressPct}%`,
              borderRadius: '99px',
              background: progressPct === 100
                ? '#10b981'
                : 'linear-gradient(90deg, #10b981, #3b82f6)',
              transition: 'width 0.4s ease'
            }} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '6px', fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
            <span>Week {Math.min(totalWeeks, Math.floor(completedCount / 7) + 1)} in progress</span>
            <span>{Math.max(0, totalDays - completedCount)} days remaining</span>
          </div>
        </div>

        {/* CTA Buttons */}
        <div style={{ display: 'flex', gap: '10px', marginTop: '18px', flexWrap: 'wrap' }}>
          {nextIncomplete ? (
            <button
              type="button"
              onClick={() => handleOpenDay(nextIncomplete.weekNum, nextIncomplete.dayObj)}
              style={{
                padding: '11px 22px',
                borderRadius: '10px',
                border: 'none',
                background: 'linear-gradient(135deg, #10b981, #059669)',
                color: '#fff',
                fontWeight: 700,
                fontSize: '0.9rem',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                boxShadow: '0 4px 14px rgba(16, 185, 129, 0.35)'
              }}
            >
              {completedCount === 0 ? (
                <><Play size={16} /> Start Diet Program (Week 1 &bull; Day 1)</>
              ) : (
                <><ArrowRight size={16} /> Continue — Week {nextIncomplete.weekNum}, Day {nextIncomplete.dayObj.dayNumber}</>
              )}
            </button>
          ) : isAllProgramCompleted ? (
            <div style={{
              padding: '10px 18px',
              borderRadius: '10px',
              background: 'rgba(16, 185, 129, 0.1)',
              border: '1px solid rgba(16, 185, 129, 0.25)',
              color: '#34d399',
              fontWeight: 700,
              fontSize: '0.88rem',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}>
              <Award size={16} /> All {totalWeeks} Weeks Completed! Diet Plan Completed! 🎉
            </div>
          ) : null}

          <button
            type="button"
            onClick={onOpenFoodLibrary}
            style={{
              padding: '11px 18px',
              borderRadius: '10px',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              background: 'rgba(255, 255, 255, 0.05)',
              color: 'var(--text-primary)',
              fontWeight: 600,
              fontSize: '0.88rem',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <BookOpen size={15} color="#38bdf8" /> Food Library &amp; Recipes
          </button>
        </div>
      </div>

      {/* Program Completion Celebration Banner */}
      {isAllProgramCompleted && (
        <div style={{
          background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.18) 0%, rgba(16, 185, 129, 0.05) 100%)',
          border: '1px solid rgba(16, 185, 129, 0.4)',
          borderRadius: '16px',
          padding: '22px 26px',
          display: 'flex',
          alignItems: 'center',
          gap: '18px',
          boxShadow: '0 8px 24px rgba(16, 185, 129, 0.15)'
        }}>
          <div style={{
            width: '50px',
            height: '50px',
            borderRadius: '14px',
            background: 'rgba(16, 185, 129, 0.25)',
            color: '#34d399',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0
          }}>
            <Award size={28} />
          </div>
          <div>
            <h3 style={{ margin: '0 0 4px', fontSize: '1.25rem', fontWeight: 800, color: '#34d399' }}>
              Diet Plan Completed! 🎉 Program Completed
            </h3>
            <p style={{ margin: 0, fontSize: '0.88rem', color: '#cbd5e1', lineHeight: 1.4 }}>
              Mubarak ho! Aap ka <strong>{totalWeeks} Weeks ({totalDays} Days)</strong> ka Diet Program mukammal ho gaya hai! Tamam dino ka diet record save hai.
            </p>
          </div>
        </div>
      )}

      {/* ── SYLLABUS TABLE OF CONTENTS / INDEX PAGE (EXACT COURSERA CARDS) ── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2px', flexWrap: 'wrap', gap: '8px' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <BookOpen size={18} color="#10b981" />
              Diet Program Index &amp; Syllabus — {totalWeeks} Weeks
            </h3>
            <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
              Week par click karein uskay days dekhnay kay liye
            </span>
          </div>

          <button
            type="button"
            onClick={toggleAllWeeks}
            style={{
              padding: '6px 12px',
              borderRadius: '8px',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              background: 'rgba(255, 255, 255, 0.04)',
              color: 'var(--text-secondary)',
              fontSize: '0.75rem',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              transition: 'all 0.15s'
            }}
          >
            {allWeeksExpanded ? 'Collapse All Weeks' : 'Expand All Weeks'}
          </button>
        </div>

        {dietWeeks.map((wk, wkIdx) => {
          const wNum = wk.weekNumber;
          const wkDays = wk.days;
          const wkCompletedCount = wkDays.filter(d => isDayCompleted(wNum, d.dayNumber)).length;
          const isAllDone = wkCompletedCount === 7;
          const isExpanded = Boolean(expandedWeeks[wNum]);

          return (
            <div
              key={wNum}
              style={{
                background: 'var(--card-bg, #0f172a)',
                border: isAllDone
                  ? '1px solid rgba(16, 185, 129, 0.35)'
                  : isExpanded
                  ? '1px solid rgba(59, 130, 246, 0.35)'
                  : '1px solid rgba(255, 255, 255, 0.07)',
                borderRadius: '14px',
                overflow: 'hidden',
                transition: 'border-color 0.2s'
              }}
            >
              {/* Week Header (Clickable Accordion) */}
              <div
                onClick={() => toggleWeek(wNum)}
                style={{
                  padding: '16px 20px',
                  background: isExpanded ? 'rgba(255, 255, 255, 0.04)' : 'rgba(255, 255, 255, 0.02)',
                  borderBottom: isExpanded ? '1px solid rgba(255, 255, 255, 0.06)' : 'none',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: '10px',
                  cursor: 'pointer',
                  userSelect: 'none',
                  transition: 'background 0.15s'
                }}
                onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255, 255, 255, 0.06)'; }}
                onMouseLeave={e => { e.currentTarget.style.background = isExpanded ? 'rgba(255, 255, 255, 0.04)' : 'rgba(255, 255, 255, 0.02)'; }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '8px',
                    background: isAllDone ? 'rgba(16, 185, 129, 0.15)' : 'rgba(59, 130, 246, 0.12)',
                    color: isAllDone ? '#34d399' : '#60a5fa',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 800,
                    fontSize: '0.82rem'
                  }}>
                    {isAllDone ? <CheckCircle size={16} /> : `W${wNum}`}
                  </span>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontSize: '0.98rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                        Week {wNum} (Hafta {wNum})
                      </span>
                      {isAllDone && (
                        <span style={{ fontSize: '0.68rem', padding: '1px 6px', borderRadius: '4px', background: 'rgba(16, 185, 129, 0.12)', color: '#34d399', fontWeight: 600 }}>
                          &check; Completed
                        </span>
                      )}
                    </div>
                    {wk.focus && (
                      <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                        {wk.focus}
                      </div>
                    )}
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                    {wkCompletedCount} of 7 days recorded
                  </span>
                  <div style={{
                    width: '26px',
                    height: '26px',
                    borderRadius: '6px',
                    background: 'rgba(255, 255, 255, 0.06)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'var(--text-secondary)'
                  }}>
                    {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                  </div>
                </div>
              </div>

              {/* Day Index Links (Clicking opens dedicated day meal view) - ONLY when week is clicked/expanded */}
              {isExpanded && (
                <div style={{ padding: '10px 14px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {wkDays.map((day) => {
                    const isDone = isDayCompleted(wNum, day.dayNumber);
                    const dayDate = getCalculatedDate(wNum, day.dayNumber);
                    const isDayToday = dayDate === todayStr;

                    return (
                      <button
                        key={day.dayNumber}
                        type="button"
                        onClick={() => handleOpenDay(wNum, day)}
                        style={{
                          width: '100%',
                          padding: '12px 14px',
                          borderRadius: '8px',
                          background: 'rgba(255, 255, 255, 0.02)',
                          border: isDayToday
                            ? '1px solid rgba(16, 185, 129, 0.4)'
                            : '1px solid rgba(255, 255, 255, 0.04)',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: '12px',
                          textAlign: 'left',
                          transition: 'background 0.15s, border-color 0.15s'
                        }}
                        onMouseEnter={e => {
                          e.currentTarget.style.background = 'rgba(16, 185, 129, 0.06)';
                          e.currentTarget.style.borderColor = 'rgba(16, 185, 129, 0.2)';
                        }}
                        onMouseLeave={e => {
                          e.currentTarget.style.background = 'rgba(255, 255, 255, 0.02)';
                          e.currentTarget.style.borderColor = isDayToday ? 'rgba(16, 185, 129, 0.4)' : 'rgba(255, 255, 255, 0.04)';
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0 }}>
                          {/* Day indicator */}
                          <div style={{
                            width: '28px',
                            height: '28px',
                            borderRadius: '6px',
                            background: isDone
                              ? 'rgba(16, 185, 129, 0.15)'
                              : isDayToday
                              ? 'rgba(16, 185, 129, 0.25)'
                              : 'rgba(59, 130, 246, 0.1)',
                            color: isDone
                              ? '#34d399'
                              : isDayToday
                              ? '#10b981'
                              : '#60a5fa',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0,
                            fontSize: '0.75rem',
                            fontWeight: 800
                          }}>
                            {isDone ? <CheckCircle size={14} /> : `D${day.dayNumber}`}
                          </div>

                          {/* Title and metadata */}
                          <div style={{ minWidth: 0 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                              <span style={{ fontSize: '0.88rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                                Day {day.dayNumber}: {day.dayName} &bull; {day.title}
                              </span>
                              {isDayToday && (
                                <span style={{
                                  fontSize: '0.65rem',
                                  padding: '1px 6px',
                                  borderRadius: '4px',
                                  background: 'rgba(16, 185, 129, 0.2)',
                                  color: '#10b981',
                                  fontWeight: 800
                                }}>
                                  &bull; AAJ
                                </span>
                              )}
                            </div>
                            <div style={{ display: 'flex', gap: '12px', marginTop: '2px', fontSize: '0.74rem', color: 'var(--text-secondary)' }}>
                              <span>5 Meal Timings (Subah, Dopahar, Shaam, Raat, Extra)</span>
                              <span>Target: ~{day.estimatedCalories} kcal</span>
                            </div>
                          </div>
                        </div>

                        {/* Right action indicator */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                          {isDone ? (
                            <span style={{ fontSize: '0.75rem', color: '#34d399', fontWeight: 600 }}>
                              &check; Done
                            </span>
                          ) : (
                            <span style={{ fontSize: '0.75rem', color: '#60a5fa', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '2px' }}>
                              View Day &rarr;
                            </span>
                          )}
                          <ChevronRight size={16} color="var(--text-secondary)" />
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

    </div>
  );
};

export default DietProgramIndexView;
