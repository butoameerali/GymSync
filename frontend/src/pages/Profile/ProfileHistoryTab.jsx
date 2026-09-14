import React, { useState, useEffect } from 'react';
import { Calendar, Clock, CheckCircle, Flame, Footprints, Dumbbell, Trash2, FileDown, Database, Activity } from 'lucide-react';
import { toast } from 'react-toastify';
import WorkoutCalendar from '../../components/common/WorkoutCalendar';
import './ProfileHistoryTab.css';

const ProfileHistoryTab = ({ upcoming = [], todayHistory = [], safeHistory = [], aiPlan, workoutProgress }) => {
  const [dbHistory, setDbHistory] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchDbHistory = async () => {
    try {
      const token = localStorage.getItem('gymsync_token') || '';
      const res = await fetch('/api/activity/history', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          setDbHistory(data);
        }
      }
    } catch (err) {
      console.warn('Failed to fetch DB activity history:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDbHistory();
  }, []);

  const handleDeleteRecord = async (id, dateStr) => {
    if (!window.confirm(`Are you sure you want to delete the activity record for ${dateStr} from the database?`)) {
      return;
    }

    try {
      const token = localStorage.getItem('gymsync_token') || '';
      const res = await fetch(`/api/activity/history/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (res.ok) {
        setDbHistory(prev => prev.filter(item => item._id !== id));
        toast.success(`Record for ${dateStr} deleted from database.`);
      } else {
        const err = await res.json();
        toast.error(err.error || 'Failed to delete record.');
      }
    } catch (err) {
      toast.error('Network error deleting record.');
    }
  };

  const handleDownloadPDF = () => {
    if (dbHistory.length === 0) {
      toast.info('No activity records available to download.');
      return;
    }
    // Triggers browser PDF print dialog with print styling
    window.print();
  };

  // Aggregate stats
  const totalSteps = dbHistory.reduce((acc, curr) => acc + (curr.steps || 0), 0);
  const totalWorkoutKcal = dbHistory.reduce((acc, curr) => acc + (curr.workoutCalories || 0), 0);
  const totalBurned = dbHistory.reduce((acc, curr) => acc + (curr.totalCaloriesBurned || 0), 0);
  const totalExercises = dbHistory.reduce((acc, curr) => acc + (curr.exercises?.length || 0), 0);

  return (
    <div className="history-grid">
      {/* ── AUTHORITATIVE DATABASE DAILY ACTIVITY HISTORY ────────────────── */}
      <div className="glass-panel section-panel daily-history-container printable-history-report">
        <div className="history-header-actions no-print">
          <div>
            <h3>
              <Database size={22} color="var(--primary-accent)" /> 
              Database Daily Activity &amp; Workout History
            </h3>
            <p style={{ margin: 0, fontSize: '0.88rem', color: 'var(--text-secondary)' }}>
              Authoritative records of walking, workout exercises, sets, reps, and calories saved in MongoDB.
            </p>
          </div>

          <button
            className="btn btn-primary"
            onClick={handleDownloadPDF}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '10px 18px',
              fontWeight: 700,
              cursor: 'pointer'
            }}
            title="Download complete history as PDF"
          >
            <FileDown size={18} /> Download History as PDF
          </button>
        </div>

        {/* Aggregate Stats Summary */}
        <div className="history-stats-banner">
          <div className="history-stat-card">
            <div className="history-stat-icon" style={{ background: 'rgba(59, 130, 246, 0.15)', color: '#3b82f6' }}>
              <Footprints size={22} />
            </div>
            <div>
              <div className="history-stat-value">{totalSteps.toLocaleString()}</div>
              <div className="history-stat-label">Total Steps Walked</div>
            </div>
          </div>

          <div className="history-stat-card">
            <div className="history-stat-icon" style={{ background: 'rgba(16, 185, 129, 0.15)', color: '#10b981' }}>
              <Dumbbell size={22} />
            </div>
            <div>
              <div className="history-stat-value">{totalExercises}</div>
              <div className="history-stat-label">Exercises Completed</div>
            </div>
          </div>

          <div className="history-stat-card">
            <div className="history-stat-icon" style={{ background: 'rgba(249, 115, 22, 0.15)', color: '#f97316' }}>
              <Flame size={22} />
            </div>
            <div>
              <div className="history-stat-value">{totalBurned.toLocaleString()} kcal</div>
              <div className="history-stat-label">Total Calories Burned</div>
            </div>
          </div>

          <div className="history-stat-card">
            <div className="history-stat-icon" style={{ background: 'rgba(139, 92, 246, 0.15)', color: '#8b5cf6' }}>
              <Activity size={22} />
            </div>
            <div>
              <div className="history-stat-value">{dbHistory.length}</div>
              <div className="history-stat-label">Tracked Days</div>
            </div>
          </div>
        </div>

        {/* Daily Records List */}
        {isLoading ? (
          <div style={{ textAlign: 'center', padding: '30px 0', color: 'var(--text-secondary)' }}>
            Loading daily database history...
          </div>
        ) : dbHistory.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '35px 20px', background: 'rgba(255,255,255,0.02)', borderRadius: '12px' }}>
            <Database size={36} color="var(--text-secondary)" style={{ opacity: 0.5, marginBottom: '10px' }} />
            <p style={{ color: 'var(--text-secondary)', margin: 0 }}>
              No daily activity records logged in the database yet.
            </p>
            <p style={{ fontSize: '0.84rem', color: 'var(--text-muted, #94a3b8)', marginTop: '4px' }}>
              Complete workouts in the Workout Hub or track walking steps to see your database history here!
            </p>
          </div>
        ) : (
          <div className="daily-records-list">
            {dbHistory.map(record => {
              const formattedDate = new Date(record.date + 'T00:00:00').toLocaleDateString(undefined, {
                weekday: 'long',
                year: 'numeric',
                month: 'short',
                day: 'numeric'
              });

              return (
                <div key={record._id} className="daily-record-card">
                  <div className="daily-record-header">
                    <div className="daily-date-badge">
                      <Calendar size={18} color="var(--primary-accent)" />
                      <span>{formattedDate}</span>
                    </div>

                    <div className="daily-burn-total">
                      <Flame size={16} />
                      <span>Total Burned: {record.totalCaloriesBurned || 0} kcal</span>
                    </div>
                  </div>

                  <div className="daily-record-body">
                    {/* Walking Metric */}
                    <div className="daily-metric-box">
                      <div className="metric-box-title">
                        <Footprints size={16} color="#3b82f6" /> Walking Activity
                      </div>
                      <div style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                        {(record.steps || 0).toLocaleString()} steps
                      </div>
                      <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
                        Distance: {(record.distanceKm || 0).toFixed(2)} km • Walking: {record.estimatedWalkingCalories || 0} kcal
                      </div>
                    </div>

                    {/* Workout Metric */}
                    <div className="daily-metric-box">
                      <div className="metric-box-title">
                        <Dumbbell size={16} color="#10b981" /> Workout Sessions
                      </div>
                      <div style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                        {record.workoutCalories || 0} kcal burned
                      </div>
                      <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
                        {record.exercises && record.exercises.length > 0
                          ? `${record.exercises.length} exercise set(s) completed`
                          : 'No exercise sets logged for this day'}
                      </div>
                    </div>
                  </div>

                  {/* Exercises Details Table */}
                  {record.exercises && record.exercises.length > 0 && (
                    <div style={{ marginTop: '12px' }}>
                      <span style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>
                        Exercises Performed:
                      </span>
                      <div className="exercises-mini-table">
                        {record.exercises.map((ex, idx) => (
                          <div key={idx} className="exercise-mini-row">
                            <span className="exercise-mini-name">
                              {ex.name}
                            </span>
                            <span className="exercise-mini-detail">
                              Set {ex.sets} • {ex.reps} reps • ~{ex.caloriesBurned} kcal {ex.mode === 'ai' ? '🤖 AI' : '✍️'}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Record Footer Actions */}
                  <div className="daily-record-footer no-print">
                    <button
                      className="btn btn-sm"
                      style={{
                        background: 'rgba(239, 68, 68, 0.1)',
                        color: '#ef4444',
                        border: '1px solid rgba(239, 68, 68, 0.3)',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        padding: '6px 12px',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        fontSize: '0.82rem'
                      }}
                      onClick={() => handleDeleteRecord(record._id, record.date)}
                      title="Delete this record from database"
                    >
                      <Trash2 size={14} /> Delete Record
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── UPCOMING AI SCHEDULE ─────────────────────────────────────────── */}
      <div className="glass-panel section-panel no-print">
        <h3 className="section-title"><Calendar size={20}/> Upcoming AI Schedule</h3>
        {upcoming.length > 0 ? (
          upcoming.map(up => (
            <div key={up.id} className="history-item upcoming">
              <Clock size={16} color="var(--primary-accent)"/>
              <div style={{flex: 1}}>
                <h4>{up.name}</h4>
                <span className="time">{up.date}</span>
              </div>
            </div>
          ))
        ) : (
          <p className="empty-text">Complete your Bio Data to generate your AI Schedule.</p>
        )}
      </div>

      {/* ── TODAY'S QUICK LOG ─────────────────────────────────────────────── */}
      <div className="glass-panel section-panel no-print">
        <h3 className="section-title"><CheckCircle size={20} color="#10b981"/> Today's Quick Exercises</h3>
        {todayHistory.length > 0 ? (
          todayHistory.map((h, i) => (
            <div key={i} className="history-item completed">
              <div>
                <h4>{h.name}</h4>
                <span className="time">+{h.pointsEarned} Points • {h.trackedViaAI ? 'AI Tracked' : 'Manual'}</span>
              </div>
            </div>
          ))
        ) : (
          <p className="empty-text">No exercises completed today. Head to the Workout Hub!</p>
        )}
      </div>

      {/* ── PAST WORKOUTS CALENDAR ───────────────────────────────────────── */}
      <div className="glass-panel section-panel no-print" style={{gridColumn: '1/-1'}}>
        <h3 className="section-title"><Calendar size={20}/> Past Workouts Calendar</h3>
        <WorkoutCalendar history={safeHistory} aiPlan={aiPlan} workoutProgress={workoutProgress} />
      </div>
    </div>
  );
};

export default ProfileHistoryTab;
