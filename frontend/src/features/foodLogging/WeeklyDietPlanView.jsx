import React, { useState, useEffect, useCallback } from 'react';
import {
  Calendar,
  Clock,
  Plus,
  Trash2,
  CheckCircle2,
  Award,
  ChevronRight,
  ChevronLeft,
  Utensils,
  Coffee,
  Sun,
  Moon,
  Cookie,
  Flame,
  Sparkles,
  Info,
  Search,
  X,
  Layers,
  Edit3
} from 'lucide-react';
import foodLogService from './foodLogService';

const MEAL_SLOTS = [
  { id: 'breakfast', label: 'Subah (Breakfast)', icon: Coffee, color: '#f59e0b', desc: 'Nashta & Subah Ka Khana' },
  { id: 'lunch', label: 'Dopahar (Lunch)', icon: Sun, color: '#10b981', desc: 'Dopahar Ka Salan / Khana' },
  { id: 'snack', label: 'Shaam (Evening Snack / Chai)', icon: Coffee, color: '#8b5cf6', desc: 'Asar / Maghrib Chai & Halka Snack' },
  { id: 'dinner', label: 'Raat (Dinner)', icon: Moon, color: '#3b82f6', desc: 'Raat Ka Khana' },
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

export const WeeklyDietPlanView = ({ activeProgram, onOpenFoodLibrary }) => {
  // Program Details & Duration
  const totalWeeks = activeProgram?.durationWeeks || 4;
  const programTitle = activeProgram?.title || '4-Week Healthy Diet & Nutrition Tracker';
  const isProgramFinished = activeProgram?.status === 'Completed' || (activeProgram?.progress?.completedSessions?.length >= totalWeeks * 4);

  // Selected Week & Day State
  const [selectedWeek, setSelectedWeek] = useState(1);
  const [selectedDayNumber, setSelectedDayNumber] = useState(1); // 1 to 7

  // Calculate target calendar date for selected week & day
  const getCalculatedDate = useCallback((week, day) => {
    // Determine base date: Monday of current week or program startDate
    const now = new Date();
    const currentDayOfWeek = (now.getDay() + 6) % 7; // 0 = Mon, 6 = Sun
    const monday = new Date(now);
    monday.setDate(now.getDate() - currentDayOfWeek);

    // Offset based on selected week and day
    const targetDate = new Date(monday);
    const dayOffset = (week - 1) * 7 + (day - 1);
    targetDate.setDate(monday.getDate() + dayOffset);
    return targetDate.toISOString().split('T')[0];
  }, []);

  const selectedDateStr = getCalculatedDate(selectedWeek, selectedDayNumber);
  const todayStr = new Date().toISOString().split('T')[0];
  const isToday = selectedDateStr === todayStr;
  const isPast = selectedDateStr < todayStr;
  const isFuture = selectedDateStr > todayStr;

  // Food Logs for Selected Date
  const [dailyLogs, setDailyLogs] = useState([]);
  const [dailySummary, setDailySummary] = useState(null);
  const [isLoadingLogs, setIsLoadingLogs] = useState(false);

  // Quick Add Meal Modal State
  const [activeSlotForAdd, setActiveSlotForAdd] = useState(null); // 'breakfast' | 'lunch' | 'snack' | 'dinner' | 'extra'
  const [modalSearchQuery, setModalSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedFoodToLog, setSelectedFoodToLog] = useState(null);
  const [logQuantity, setLogQuantity] = useState(1);
  const [logNotes, setLogNotes] = useState('');
  const [isSubmittingLog, setIsSubmittingLog] = useState(false);
  const [statusNotice, setStatusNotice] = useState(null);

  // Fetch Daily Logs when date changes
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
    fetchLogsForDay(selectedDateStr);
  }, [selectedDateStr, fetchLogsForDay]);

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
        date: selectedDateStr,
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
        fetchLogsForDay(selectedDateStr);
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
      fetchLogsForDay(selectedDateStr);
    } catch (err) {
      console.warn('Failed to delete log entry:', err);
    }
  };

  // Helper: Get logs for specific slot
  const getLogsForSlot = (slotId) => {
    return dailyLogs.filter(log => log.mealSlot === slotId);
  };

  const dayNames = ['Monday (Peer)', 'Tuesday (Mangal)', 'Wednesday (Budh)', 'Thursday (Jumerat)', 'Friday (Jumma)', 'Saturday (Hafta)', 'Sunday (Itwar)'];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      
      {/* ── PROGRAM & PLAN PROGRESS HEADER ── */}
      <div className="glass-panel" style={{
        padding: '20px 24px',
        borderRadius: '16px',
        background: 'var(--card-bg-light)',
        border: '1px solid var(--card-border)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '16px'
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{
              fontSize: '0.72rem',
              fontWeight: 700,
              padding: '3px 8px',
              borderRadius: '6px',
              background: 'rgba(59, 130, 246, 0.15)',
              color: '#60a5fa',
              textTransform: 'uppercase'
            }}>
              Linked Program Diet Plan
            </span>
            {isProgramFinished && (
              <span style={{
                fontSize: '0.72rem',
                fontWeight: 800,
                padding: '3px 8px',
                borderRadius: '6px',
                background: 'rgba(16, 185, 129, 0.2)',
                color: '#10b981',
                display: 'flex',
                alignItems: 'center',
                gap: '4px'
              }}>
                <Award size={12} /> Diet Plan Completed! 🎉
              </span>
            )}
          </div>

          <h2 style={{ margin: '8px 0 4px', fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-primary)' }}>
            {programTitle}
          </h2>
          <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
            Pura weekly index: Subah, Dopahar, Shaam aur Raat ka khana track karein. Aap chat mein AI ko bhi bata sakte hain!
          </p>
        </div>

        {/* Total Calories Summary for Day */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '14px',
          padding: '10px 18px',
          borderRadius: '12px',
          background: 'rgba(0, 0, 0, 0.2)',
          border: '1px solid var(--card-border)'
        }}>
          <div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>Is Din Ki Total Calories</div>
            <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#f59e0b' }}>
              {dailySummary?.totalCaloriesEstimated ? `~${dailySummary.totalCaloriesEstimated} kcal` : '0 kcal'}
            </div>
            {dailySummary?.rangeMin !== undefined && (
              <div style={{ fontSize: '0.68rem', color: 'var(--text-secondary)' }}>
                Range: {dailySummary.rangeMin} - {dailySummary.rangeMax} kcal
              </div>
            )}
          </div>
          <div style={{ borderLeft: '1px solid var(--card-border)', paddingLeft: '14px', fontSize: '0.75rem', lineHeight: 1.4 }}>
            <div style={{ color: '#10b981' }}><strong>P:</strong> {dailySummary?.totalProteinG || 0}g</div>
            <div style={{ color: '#3b82f6' }}><strong>C:</strong> {dailySummary?.totalCarbsG || 0}g</div>
            <div style={{ color: '#eab308' }}><strong>F:</strong> {dailySummary?.totalFatG || 0}g</div>
          </div>
        </div>
      </div>

      {/* Program Completed Notice */}
      {isProgramFinished && (
        <div style={{
          padding: '16px 20px',
          borderRadius: '14px',
          background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.2) 0%, rgba(59, 130, 246, 0.15) 100%)',
          border: '1px solid #10b981',
          display: 'flex',
          alignItems: 'center',
          gap: '14px'
        }}>
          <Award size={32} color="#10b981" />
          <div>
            <h4 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: '#10b981' }}>
              Mubarak Ho! Aap Ka {totalWeeks}-Week Diet Plan Complete Ho Gaya Hai! 🎉
            </h4>
            <p style={{ margin: '4px 0 0', fontSize: '0.85rem', color: '#cbd5e1' }}>
              Aap ne apne tamam hafton ke diet aur workout sessions ko kamyabi se record kiya hai. Naya program shuru karne ke liye Programs tab check karein.
            </p>
          </div>
        </div>
      )}

      {/* ── WEEKS INDEX NAVIGATION (WEEK 1, WEEK 2, WEEK 3, WEEK 4...) ── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>
            Haftay Ka Intikhab (Select Week):
          </span>
          <span style={{ fontSize: '0.8rem', color: '#60a5fa', fontWeight: 600 }}>
            Hafta {selectedWeek} of {totalWeeks}
          </span>
        </div>

        <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '4px' }}>
          {Array.from({ length: totalWeeks }, (_, i) => i + 1).map((weekNum) => {
            const isSelected = selectedWeek === weekNum;
            return (
              <button
                key={weekNum}
                type="button"
                onClick={() => setSelectedWeek(weekNum)}
                style={{
                  padding: '10px 20px',
                  borderRadius: '10px',
                  border: isSelected ? '1px solid #3b82f6' : '1px solid var(--card-border)',
                  background: isSelected ? 'rgba(59, 130, 246, 0.2)' : 'var(--card-bg-light)',
                  color: isSelected ? '#60a5fa' : 'var(--text-primary)',
                  fontWeight: 700,
                  fontSize: '0.88rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  transition: 'all 0.2s',
                  whiteSpace: 'nowrap'
                }}
              >
                <Layers size={14} />
                <span>Hafta {weekNum} (Week {weekNum})</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── 7 DAYS SELECTOR FOR SELECTED WEEK ── */}
      <div className="glass-panel" style={{
        padding: '16px',
        borderRadius: '14px',
        background: 'var(--card-bg-light)',
        border: '1px solid var(--card-border)',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-secondary)' }}>
            Hafta {selectedWeek} Ke Din (Select Day to View/Log Meals):
          </span>
          <span style={{ fontSize: '0.78rem', color: isToday ? '#10b981' : isPast ? '#94a3b8' : '#f59e0b', fontWeight: 700 }}>
            {isToday ? '🟢 Aaj Ka Din (Today)' : isPast ? '⏪ Guzra Hua Din (Past Record)' : '⏩ Aane Wala Din (Future Planning)'}
          </span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '8px' }}>
          {Array.from({ length: 7 }, (_, i) => i + 1).map((dayNum) => {
            const isSelected = selectedDayNumber === dayNum;
            const dateForDay = getCalculatedDate(selectedWeek, dayNum);
            const isDayToday = dateForDay === todayStr;

            return (
              <button
                key={dayNum}
                type="button"
                onClick={() => setSelectedDayNumber(dayNum)}
                style={{
                  padding: '10px 8px',
                  borderRadius: '10px',
                  border: isSelected 
                    ? '2px solid #10b981' 
                    : isDayToday 
                    ? '1px solid rgba(16, 185, 129, 0.4)' 
                    : '1px solid var(--card-border)',
                  background: isSelected 
                    ? 'rgba(16, 185, 129, 0.18)' 
                    : isDayToday 
                    ? 'rgba(16, 185, 129, 0.08)' 
                    : 'var(--bg-input)',
                  color: isSelected ? '#10b981' : 'var(--text-primary)',
                  textAlign: 'center',
                  cursor: 'pointer',
                  transition: 'all 0.15s'
                }}
              >
                <div style={{ fontSize: '0.72rem', color: isSelected ? '#10b981' : 'var(--text-secondary)', fontWeight: 600 }}>
                  Din {dayNum} · {dayNames[dayNum - 1].split('(')[1]?.replace(')', '') || ''}
                </div>
                <div style={{ fontSize: '0.85rem', fontWeight: 800, marginTop: '2px' }}>
                  {dateForDay.slice(5)}
                </div>
                {isDayToday && (
                  <span style={{ fontSize: '0.62rem', fontWeight: 800, color: '#10b981', display: 'block', marginTop: '2px' }}>
                    ● AAJ
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── ACTIVE DAY MEAL SLOTS (SUBAH, DOPAHAR, SHAAM, RAAT, EXTRA) ── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-primary)' }}>
              Aap Nay Kya Khaya: Hafta {selectedWeek}, Din {selectedDayNumber} ({selectedDateStr})
            </h3>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
              Har waqt ke khane ke sath check karein kya khaya ya naya khana shamil karein.
            </span>
          </div>

          <button
            type="button"
            onClick={onOpenFoodLibrary}
            style={{
              padding: '8px 14px',
              borderRadius: '8px',
              border: '1px solid var(--card-border)',
              background: 'var(--card-bg-light)',
              color: '#38bdf8',
              fontSize: '0.8rem',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <Search size={14} /> Pura Recipe Encyclopedia Kholein
          </button>
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

        {/* 5 Distinct Meal Slot Cards */}
        {MEAL_SLOTS.map((slot) => {
          const SlotIcon = slot.icon;
          const slotLogs = getLogsForSlot(slot.id);
          const hasLogs = slotLogs.length > 0;
          const slotCalories = slotLogs.reduce((sum, log) => sum + (log.caloriesEstimated || 0), 0);

          return (
            <div
              key={slot.id}
              className="glass-panel"
              style={{
                padding: '18px 20px',
                borderRadius: '16px',
                background: 'var(--card-bg-light)',
                border: hasLogs ? '1px solid var(--card-border)' : '1px dashed var(--card-border)',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px'
              }}
            >
              {/* Slot Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '10px',
                    background: `${slot.color}20`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: slot.color
                  }}>
                    <SlotIcon size={18} />
                  </div>
                  <div>
                    <h4 style={{ margin: 0, fontSize: '0.98rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                      {slot.label}
                    </h4>
                    <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
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

              {/* Slot Logged Items */}
              {hasLogs ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '4px' }}>
                  {slotLogs.map((log) => (
                    <div
                      key={log._id}
                      style={{
                        padding: '10px 14px',
                        borderRadius: '10px',
                        background: 'rgba(0, 0, 0, 0.2)',
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
                              ({item.quantity} serving · ~{item.caloriesEstimated} kcal)
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
                          padding: '4px',
                          display: 'flex',
                          alignItems: 'center'
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
                  padding: '12px',
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

      {/* ── AI COACH INTEGRATION NOTICE ── */}
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

      {/* ── QUICK ADD MEAL MODAL ── */}
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
            {/* Modal Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <span style={{ fontSize: '0.72rem', color: '#10b981', fontWeight: 700, textTransform: 'uppercase' }}>
                  Khana Input Karein · {MEAL_SLOTS.find(s => s.id === activeSlotForAdd)?.label}
                </span>
                <h3 style={{ margin: '4px 0 0', fontSize: '1.25rem', fontWeight: 800 }}>
                  Dish Ka Intikhab Karein ({selectedDateStr})
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

            {/* Search Input */}
            <div style={{ position: 'relative' }}>
              <input
                type="text"
                placeholder="Ya kisi bhi dish ka naam search karein (e.g. Chicken, Omelette, Fries)..."
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

            {/* Search Results Dropdown */}
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
                      Standard: {selectedFoodToLog.typicalServing?.unit || selectedFoodToLog.unit}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#f59e0b' }}>
                      🔥 ~{Math.round((selectedFoodToLog.calories || 200) * logQuantity)} kcal
                    </div>
                  </div>
                </div>

                {/* Quantity Preset Buttons */}
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

                {/* Optional Note */}
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
};

export default WeeklyDietPlanView;
