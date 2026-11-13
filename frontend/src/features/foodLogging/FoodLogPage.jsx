import React, { useState, useEffect, useMemo } from 'react';
import { Calendar, BookOpen, BarChart3, Utensils, Layers, CheckCircle, Play, Sparkles } from 'lucide-react';
import DietProgramIndexView from './DietProgramIndexView';
import FoodLibraryView from './FoodLibraryView';
import DietReportView from './DietReportView';
import MedicalDisclaimer from '../../components/common/MedicalDisclaimer';

export const FoodLogPage = ({ activeProgram }) => {
  // Navigation Tabs: 'program' (Your Diet Plans) | 'library' (Food Recipes & Info) | 'report' (Diet Report)
  const [activeTab, setActiveTab] = useState('program');

  // Currently opened plan in DietProgramIndexView (null = show plans card grid)
  const [selectedDietPlanForView, setSelectedDietPlanForView] = useState(null);

  // Persistent Diet Plans History in LocalStorage
  const [dietPlansHistory, setDietPlansHistory] = useState(() => {
    try {
      const saved = localStorage.getItem('gymsync_diet_plans_history');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Build the current active diet plan from activeProgram
  const currentActivePlan = useMemo(() => {
    if (!activeProgram) return null;
    const raw = activeProgram.rawProgram || activeProgram;
    const totalWorkoutDays = (raw.weeks || []).reduce(
      (acc, w) => acc + (w.days || []).filter(d => !d.isRestDay).length, 0
    );
    const completedSessionsCount = (raw.progress?.completedSessions || []).length;
    const isWorkoutDone = Boolean(raw.isCompleted || (totalWorkoutDays > 0 && completedSessionsCount >= totalWorkoutDays));
    const totalWeeks = Number(raw.durationWeeks) || 4;
    const isDietSessionsDone = localStorage.getItem(`gymsync_diet_completed_${raw._id || 'default'}_${totalWeeks}w_all_done`) === 'true';
    const isCompleted = isWorkoutDone || isDietSessionsDone;

    return {
      _id: raw._id || 'default_diet_plan',
      title: raw.title || `${totalWeeks}-Week Pakistani Diet & Nutrition Program`,
      goal: raw.goal || 'Strength & Conditioning',
      fitnessLevel: raw.difficulty || raw.fitnessLevel || 'Intermediate',
      instructorName: raw.instructorName || 'Elite Coach',
      durationWeeks: totalWeeks,
      daysPerWeek: 7,
      isCompleted: isCompleted,
      programVersion: raw.programVersion || 1,
      currentWeek: raw.progress?.currentWeek || 1,
      currentDay: raw.progress?.currentDay || 1,
      completedSessionsCount: completedSessionsCount,
      rawProgram: raw
    };
  }, [activeProgram]);

  // Sync currentActivePlan into dietPlansHistory
  useEffect(() => {
    if (!currentActivePlan) return;
    setDietPlansHistory(prev => {
      const existingIdx = prev.findIndex(p => p._id === currentActivePlan._id || p.title === currentActivePlan.title);
      let updated;
      if (existingIdx >= 0) {
        updated = [...prev];
        updated[existingIdx] = { ...updated[existingIdx], ...currentActivePlan };
      } else {
        updated = [currentActivePlan, ...prev];
      }
      try {
        localStorage.setItem('gymsync_diet_plans_history', JSON.stringify(updated));
      } catch (_) {}
      return updated;
    });
  }, [currentActivePlan]);

  // All Diet Plans (History + Active)
  const allDietPlans = useMemo(() => {
    if (dietPlansHistory.length > 0) return dietPlansHistory;
    if (currentActivePlan) return [currentActivePlan];
    return [{
      _id: 'default_diet_plan',
      title: '4-Week Pakistani Diet & Nutrition Program',
      goal: 'Fat Loss & Healthy Living',
      fitnessLevel: 'All Levels',
      instructorName: 'GymSync Certified Dietitian',
      durationWeeks: 4,
      daysPerWeek: 7,
      isCompleted: false,
      programVersion: 1,
      currentWeek: 1,
      currentDay: 1,
      rawProgram: null
    }];
  }, [dietPlansHistory, currentActivePlan]);

  return (
    <div className="food-log-page" style={{
      width: '100%',
      maxWidth: '1240px',
      margin: '0 auto',
      padding: '24px 16px',
      display: 'flex',
      flexDirection: 'column',
      gap: '20px'
    }}>
      {/* Medical Disclaimer Banner */}
      <MedicalDisclaimer variant="banner" style={{ margin: 0 }} />

      {/* ── HEADER & CLEAN TAB BUTTONS (NO CLUTTER) ── */}
      <div style={{
        display: 'flex',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: '16px',
        borderBottom: '1px solid var(--card-border)',
        paddingBottom: '16px'
      }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '1.65rem', fontWeight: 800, color: 'var(--text-primary)' }}>
            My Diet Plan
          </h1>
        </div>

        {/* Tab Buttons */}
        <div style={{
          display: 'flex',
          gap: '6px',
          background: 'var(--card-bg-light)',
          padding: '4px',
          borderRadius: '12px',
          border: '1px solid var(--card-border)',
          flexWrap: 'wrap'
        }}>
          {/* Button 1: Your Diet Plans */}
          <button
            type="button"
            onClick={() => {
              setActiveTab('program');
              setSelectedDietPlanForView(null);
            }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '9px 16px',
              borderRadius: '8px',
              fontSize: '0.85rem',
              fontWeight: 700,
              cursor: 'pointer',
              border: 'none',
              background: activeTab === 'program' ? '#10b981' : 'transparent',
              color: activeTab === 'program' ? '#fff' : 'var(--text-secondary)',
              transition: 'all 0.2s'
            }}
          >
            <Layers size={16} />
            Your Diet Plans
          </button>

          {/* Button 2: Food Library & Recipes */}
          <button
            type="button"
            onClick={() => setActiveTab('library')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '9px 16px',
              borderRadius: '8px',
              fontSize: '0.85rem',
              fontWeight: 700,
              cursor: 'pointer',
              border: 'none',
              background: activeTab === 'library' ? '#10b981' : 'transparent',
              color: activeTab === 'library' ? '#fff' : 'var(--text-secondary)',
              transition: 'all 0.2s'
            }}
          >
            <BookOpen size={16} />
            Food Library &amp; Recipes
          </button>

          {/* Button 3: Diet Report */}
          <button
            type="button"
            onClick={() => setActiveTab('report')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '9px 16px',
              borderRadius: '8px',
              fontSize: '0.85rem',
              fontWeight: 700,
              cursor: 'pointer',
              border: 'none',
              background: activeTab === 'report' ? '#10b981' : 'transparent',
              color: activeTab === 'report' ? '#fff' : 'var(--text-secondary)',
              transition: 'all 0.2s'
            }}
          >
            <BarChart3 size={16} />
            Diet Report
          </button>
        </div>
      </div>

      {/* ── TAB 1: YOUR DIET PLANS (BOXES MATCHING WORKOUT PLANS) ── */}
      {activeTab === 'program' && (
        selectedDietPlanForView ? (
          <DietProgramIndexView
            program={selectedDietPlanForView}
            onBack={() => setSelectedDietPlanForView(null)}
            onOpenFoodLibrary={() => setActiveTab('library')}
          />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
              <h3 style={{ margin: 0, fontSize: '1.25rem', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Utensils size={20} color="#10b981" /> Your Diet Plans ({allDietPlans.length})
              </h3>
            </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
                gap: '18px'
              }}
            >
              {allDietPlans.map((plan) => {
                const isFullyCompleted = Boolean(plan.isCompleted);

                return (
                  <div
                    key={plan._id}
                    style={{
                      background: isFullyCompleted
                        ? 'linear-gradient(135deg, rgba(16, 185, 129, 0.08) 0%, rgba(30, 41, 59, 0.6) 100%)'
                        : 'linear-gradient(135deg, rgba(59, 130, 246, 0.08) 0%, rgba(30, 41, 59, 0.6) 100%)',
                      border: isFullyCompleted
                        ? '1px solid rgba(16, 185, 129, 0.35)'
                        : '1px solid rgba(59, 130, 246, 0.3)',
                      borderRadius: '16px',
                      padding: '22px',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      gap: '16px',
                      boxShadow: '0 4px 20px rgba(0, 0, 0, 0.25)',
                      transition: 'transform 0.2s ease, border-color 0.2s ease'
                    }}
                  >
                    <div>
                      {/* Top Badge & Duration */}
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                        {isFullyCompleted ? (
                          <span
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '6px',
                              background: 'rgba(16, 185, 129, 0.2)',
                              color: '#34d399',
                              padding: '4px 12px',
                              borderRadius: '20px',
                              fontSize: '0.8rem',
                              fontWeight: 700
                            }}
                          >
                            <CheckCircle size={14} /> Completed Program (v{plan.programVersion || 1})
                          </span>
                        ) : (
                          <span
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '6px',
                              background: 'rgba(59, 130, 246, 0.18)',
                              color: '#60a5fa',
                              padding: '4px 12px',
                              borderRadius: '20px',
                              fontSize: '0.8rem',
                              fontWeight: 700
                            }}
                          >
                            🥗 Active Diet Program (v{plan.programVersion || 1})
                          </span>
                        )}
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                          {plan.durationWeeks} Weeks • {plan.daysPerWeek || 7} Days/Wk
                        </span>
                      </div>

                      {/* Title */}
                      <h4 style={{ margin: '0 0 8px 0', fontSize: '1.25rem', color: 'var(--text-primary)', fontWeight: 700 }}>
                        {plan.title}
                      </h4>

                      {/* Details */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '0.84rem', color: 'var(--text-secondary)' }}>
                        <div><strong>Goal:</strong> {plan.goal}</div>
                        <div><strong>Level:</strong> {plan.fitnessLevel || 'Intermediate'}</div>
                        <div><strong>Instructor:</strong> {plan.instructorName || 'Elite Coach'}</div>
                        {isFullyCompleted ? (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '4px' }}>
                            <div style={{ color: '#34d399', fontWeight: 700, fontSize: '0.84rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <CheckCircle size={15} /> All {plan.durationWeeks} Weeks Finished (Diet Program Completed)
                            </div>
                          </div>
                        ) : (
                          <div style={{ color: '#60a5fa', fontWeight: 600, fontSize: '0.82rem', marginTop: '4px' }}>
                            Schedule: Week {plan.currentWeek || 1} • Day {plan.currentDay || 1}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      {isFullyCompleted ? (
                        <button
                          type="button"
                          className="btn btn-outline"
                          style={{
                            width: '100%',
                            padding: '11px 16px',
                            borderRadius: '10px',
                            fontSize: '0.88rem',
                            fontWeight: 700,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '8px',
                            color: '#34d399',
                            borderColor: 'rgba(52, 211, 153, 0.4)',
                            background: 'rgba(52, 211, 153, 0.08)',
                            cursor: 'pointer'
                          }}
                          onClick={() => setSelectedDietPlanForView(plan)}
                        >
                          <BookOpen size={16} /> View Completed Syllabus
                        </button>
                      ) : (
                        <button
                          type="button"
                          className="btn btn-primary"
                          style={{
                            width: '100%',
                            padding: '12px 18px',
                            borderRadius: '12px',
                            fontWeight: 700,
                            fontSize: '0.95rem',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '8px',
                            background: 'linear-gradient(135deg, #10b981, #059669)',
                            boxShadow: '0 4px 14px rgba(16, 185, 129, 0.3)',
                            border: 'none',
                            color: '#ffffff',
                            cursor: 'pointer'
                          }}
                          onClick={() => setSelectedDietPlanForView(plan)}
                        >
                          <Play size={16} /> Open &amp; Track Diet Routine
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )
      )}

      {/* ── TAB 2: FOOD LIBRARY & RECIPES ── */}
      {activeTab === 'library' && (
        <FoodLibraryView
          onLogFoodDirectly={() => {
            setActiveTab('program');
          }}
        />
      )}

      {/* ── TAB 3: DIET REPORT ── */}
      {activeTab === 'report' && (
        <DietReportView />
      )}
    </div>
  );
};

export default FoodLogPage;
