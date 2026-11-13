import React, { useState, useEffect, useCallback } from 'react';
import {
  BarChart3,
  Flame,
  Activity,
  Calendar,
  ShieldCheck,
  TrendingUp,
  Info,
  Apple
} from 'lucide-react';
import foodLogService from './foodLogService';

export const DietReportView = () => {
  const todayStr = new Date().toISOString().split('T')[0];
  const [reportRange, setReportRange] = useState('week'); // 'day' | 'week'
  const [reportDate, setReportDate] = useState(todayStr);
  const [reportData, setReportData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchReport = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await foodLogService.getDietReport(reportDate, reportRange);
      if (data.success) {
        setReportData(data);
      }
    } catch (err) {
      console.warn('Failed to load diet report:', err);
    } finally {
      setIsLoading(false);
    }
  }, [reportDate, reportRange]);

  useEffect(() => {
    fetchReport();
  }, [fetchReport]);

  return (
    <div className="diet-report-container" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* ── TOP CONTROLS & RANGE SELECTOR ── */}
      <div className="glass-panel" style={{
        padding: '18px 24px',
        borderRadius: '16px',
        background: 'var(--card-bg-light)',
        border: '1px solid var(--card-border)',
        display: 'flex',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: '16px'
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <BarChart3 size={20} color="#10b981" />
            <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 700, color: 'var(--text-primary)' }}>
              Diet & Energy Balance Report
            </h3>
          </div>
          <p style={{ margin: '4px 0 0', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
            Observational analysis of logged nutrition vs estimated physical expenditure.
          </p>
        </div>

        {/* Day / Week Switcher */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            type="button"
            onClick={() => setReportRange('day')}
            style={{
              padding: '6px 14px',
              borderRadius: '20px',
              fontSize: '0.85rem',
              fontWeight: 600,
              cursor: 'pointer',
              border: reportRange === 'day' ? '1px solid #10b981' : '1px solid var(--card-border)',
              background: reportRange === 'day' ? 'rgba(16, 185, 129, 0.15)' : 'transparent',
              color: reportRange === 'day' ? '#10b981' : 'var(--text-secondary)'
            }}
          >
            Daily View
          </button>
          <button
            type="button"
            onClick={() => setReportRange('week')}
            style={{
              padding: '6px 14px',
              borderRadius: '20px',
              fontSize: '0.85rem',
              fontWeight: 600,
              cursor: 'pointer',
              border: reportRange === 'week' ? '1px solid #10b981' : '1px solid var(--card-border)',
              background: reportRange === 'week' ? 'rgba(16, 185, 129, 0.15)' : 'transparent',
              color: reportRange === 'week' ? '#10b981' : 'var(--text-secondary)'
            }}
          >
            Weekly Summary (7 Days)
          </button>

          <input
            type="date"
            value={reportDate}
            max={todayStr}
            onChange={(e) => setReportDate(e.target.value)}
            style={{
              padding: '6px 12px',
              borderRadius: '8px',
              border: '1px solid var(--card-border)',
              background: 'var(--bg-input)',
              color: 'var(--text-primary)',
              fontSize: '0.85rem',
              cursor: 'pointer'
            }}
          />
        </div>
      </div>

      {/* ── NON-PRESCRIPTIVE COMPLIANCE BANNER (Rule R2) ── */}
      <div style={{
        padding: '12px 18px',
        borderRadius: '12px',
        background: 'rgba(59, 130, 246, 0.08)',
        border: '1px solid rgba(59, 130, 246, 0.25)',
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        fontSize: '0.82rem',
        color: 'var(--text-secondary)'
      }}>
        <ShieldCheck size={20} color="#3b82f6" style={{ flexShrink: 0 }} />
        <div>
          <strong style={{ color: 'var(--text-primary)' }}>Track & Report Protocol:</strong> GymSync provides observational analysis of your logged foods and estimated daily energy burn. It does NOT generate, prescribe, or assign diet plans or calorie limits (Rule R2).
        </div>
      </div>

      {isLoading ? (
        <div style={{ textAlign: 'center', padding: '50px', color: 'var(--text-secondary)' }}>
          Computing energy report...
        </div>
      ) : !reportData ? (
        <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary)' }}>
          No data available for this date.
        </div>
      ) : (
        <>
          {/* ── SUMMARY STATS METRICS ── */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: '16px'
          }}>
            {/* Total Intake Metric */}
            <div className="glass-panel" style={{
              padding: '18px 20px',
              borderRadius: '14px',
              background: 'var(--card-bg-light)',
              border: '1px solid var(--card-border)',
              display: 'flex',
              flexDirection: 'column',
              gap: '6px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
                  Estimated Intake
                </span>
                <Apple size={18} color="#10b981" />
              </div>
              <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                {reportData.totals.totalIntakeKcal} <span style={{ fontSize: '0.85rem', fontWeight: 500 }}>kcal</span>
              </div>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                Range: {reportData.totals.intakeRange.min} – {reportData.totals.intakeRange.max} kcal (±15%)
              </span>
            </div>

            {/* Total Expenditure Metric */}
            <div className="glass-panel" style={{
              padding: '18px 20px',
              borderRadius: '14px',
              background: 'var(--card-bg-light)',
              border: '1px solid var(--card-border)',
              display: 'flex',
              flexDirection: 'column',
              gap: '6px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
                  Estimated Burn
                </span>
                <Flame size={18} color="#f97316" />
              </div>
              <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                {reportData.totals.totalExpenditureKcal} <span style={{ fontSize: '0.85rem', fontWeight: 500 }}>kcal</span>
              </div>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                Workouts: {reportData.totals.totalWorkoutBurnKcal} kcal • Steps: {reportData.totals.totalWalkingBurnKcal} kcal
              </span>
            </div>

            {/* Net Energy Balance Metric */}
            <div className="glass-panel" style={{
              padding: '18px 20px',
              borderRadius: '14px',
              background: 'var(--card-bg-light)',
              border: '1px solid var(--card-border)',
              display: 'flex',
              flexDirection: 'column',
              gap: '6px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
                  Observed Balance
                </span>
                <TrendingUp size={18} color={reportData.totals.netBalanceKcal <= 0 ? '#10b981' : '#3b82f6'} />
              </div>
              <div style={{
                fontSize: '1.4rem',
                fontWeight: 800,
                color: reportData.totals.netBalanceKcal <= 0 ? '#10b981' : '#3b82f6'
              }}>
                {reportData.totals.netBalanceKcal > 0 ? `+${reportData.totals.netBalanceKcal}` : reportData.totals.netBalanceKcal} <span style={{ fontSize: '0.85rem', fontWeight: 500 }}>kcal</span>
              </div>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                {reportData.totals.netBalanceKcal <= 0 ? 'Calorie Deficit balance' : 'Calorie Surplus balance'}
              </span>
            </div>

            {/* Macros Metric */}
            <div className="glass-panel" style={{
              padding: '18px 20px',
              borderRadius: '14px',
              background: 'var(--card-bg-light)',
              border: '1px solid var(--card-border)',
              display: 'flex',
              flexDirection: 'column',
              gap: '6px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
                  Total Macros Logged
                </span>
                <Activity size={18} color="#a855f7" />
              </div>
              <div style={{ display: 'flex', gap: '12px', marginTop: '4px' }}>
                <div>
                  <span style={{ fontSize: '0.68rem', color: 'var(--text-secondary)', display: 'block' }}>Protein</span>
                  <strong style={{ fontSize: '0.95rem', color: '#10b981' }}>{reportData.macroBreakdown.proteinG}g</strong>
                </div>
                <div>
                  <span style={{ fontSize: '0.68rem', color: 'var(--text-secondary)', display: 'block' }}>Carbs</span>
                  <strong style={{ fontSize: '0.95rem', color: '#3b82f6' }}>{reportData.macroBreakdown.carbsG}g</strong>
                </div>
                <div>
                  <span style={{ fontSize: '0.68rem', color: 'var(--text-secondary)', display: 'block' }}>Fat</span>
                  <strong style={{ fontSize: '0.95rem', color: '#f59e0b' }}>{reportData.macroBreakdown.fatG}g</strong>
                </div>
              </div>
            </div>
          </div>

          {/* ── DAILY BREAKDOWN TABLE / CARDS ── */}
          <div className="glass-panel" style={{
            padding: '24px',
            borderRadius: '16px',
            background: 'var(--card-bg-light)',
            border: '1px solid var(--card-border)',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px'
          }}>
            <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)' }}>
              Daily Logged Intake vs Expenditure
            </h4>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {reportData.dailyBreakdown.map(day => (
                <div
                  key={day.date}
                  style={{
                    padding: '14px 18px',
                    borderRadius: '12px',
                    background: 'var(--bg-input)',
                    border: '1px solid var(--card-border)',
                    display: 'flex',
                    flexWrap: 'wrap',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    gap: '12px'
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '0.92rem', color: 'var(--text-primary)' }}>
                      {day.date}
                    </div>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                      {day.mealsLoggedCount} meals logged • P: {day.macros?.proteinG}g C: {day.macros?.carbsG}g F: {day.macros?.fatG}g
                    </span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                    <div style={{ textAlign: 'right' }}>
                      <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', display: 'block' }}>Intake</span>
                      <strong style={{ fontSize: '0.9rem', color: '#10b981' }}>
                        {day.estimatedIntakeKcal} kcal
                      </strong>
                    </div>

                    <div style={{ textAlign: 'right' }}>
                      <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', display: 'block' }}>Expenditure</span>
                      <strong style={{ fontSize: '0.9rem', color: '#f97316' }}>
                        {day.totalEstimatedExpenditureKcal} kcal
                      </strong>
                    </div>

                    <div style={{ textAlign: 'right', minWidth: '70px' }}>
                      <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', display: 'block' }}>Net</span>
                      <strong style={{
                        fontSize: '0.9rem',
                        color: day.energyBalanceKcal <= 0 ? '#10b981' : '#3b82f6'
                      }}>
                        {day.energyBalanceKcal > 0 ? `+${day.energyBalanceKcal}` : day.energyBalanceKcal} kcal
                      </strong>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default DietReportView;
