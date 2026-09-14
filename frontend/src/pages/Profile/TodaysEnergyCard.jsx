import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Activity, Flame, Utensils, Dumbbell, Footprints, Play, Square, Target, Info } from 'lucide-react';
import { toast } from 'react-toastify';
import { createStepDetector } from '../../ai-detectors/steps-v1';
import './TodaysEnergyCard.css';

/**
 * TodaysEnergyCard (Profile Component)
 *
 * Displays:
 *   • Eaten (tracked / ~0)
 *   • Workout (tracked / ~0)
 *   • Walking (tracked / ~0)
 *   • Balance (calculated: Eaten - Workout - Walking)
 *
 * Features:
 *   • Walking Step Tracker Toggle Button: Turns real-time device step detection ON / OFF.
 *   • Unified Calorie Calculation: Combines walking & workout expenditure into total burned.
 *   • Hidden AI Prediction: Background calculation of deficit & projected weight progression without raw UI clutter.
 */
export const TodaysEnergyCard = ({ bio, currentWeight }) => {
  const [energyData, setEnergyData] = useState({
    eatenKcal: 0,
    workoutKcal: 0,
    walkingKcal: 0,
    balance: 0
  });
  const [goal, setGoal] = useState(null);
  const [isTrackingSteps, setIsTrackingSteps] = useState(() => localStorage.getItem('gymsync_step_tracking_active') === 'true');
  const [liveSteps, setLiveSteps] = useState(0);
  const detectorRef = useRef(null);
  const lastSyncStepsRef = useRef(0);

  const todayStr = useMemo(() => new Date().toLocaleDateString('en-CA'), []);

  // Fetch energy metrics from backend
  const fetchEnergy = async () => {
    try {
      const token = localStorage.getItem('gymsync_token');
      if (!token) return;

      const res = await fetch(`/api/activity/today-energy?date=${todayStr}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (res.ok) {
        const json = await res.json();
        if (json.energy) {
          setEnergyData({
            eatenKcal: json.energy.eatenKcal || 0,
            workoutKcal: json.energy.workoutKcal || 0,
            walkingKcal: json.energy.walkingKcal || 0,
            balance: json.energy.balance || 0
          });
        }
        if (json.goal) {
          setGoal(json.goal);
        }
      }
    } catch (err) {
      console.warn('Could not fetch daily energy data:', err);
    }
  };

  useEffect(() => {
    fetchEnergy();
    const interval = setInterval(fetchEnergy, 60000);
    return () => clearInterval(interval);
  }, [todayStr]);

  // Sync steps to backend periodically
  const syncStepsToBackend = async (delta) => {
    if (delta <= 0) return;
    try {
      const token = localStorage.getItem('gymsync_token');
      if (!token) return;

      await fetch('/api/activity/sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          date: todayStr,
          stepsDelta: delta
        })
      });
      fetchEnergy();
    } catch (err) {
      console.warn('Failed to sync steps delta to server:', err);
    }
  };

  // Step Detector Lifecycle
  useEffect(() => {
    if (isTrackingSteps) {
      try {
        const detector = createStepDetector({
          onStepCount: (count) => {
            setLiveSteps(count);
            const delta = count - lastSyncStepsRef.current;
            // Batch sync every 10 steps
            if (delta >= 10) {
              syncStepsToBackend(delta);
              lastSyncStepsRef.current = count;
            }
          }
        });
        detector.start().catch((err) => {
          console.warn('Step detector permission error:', err);
          toast.info('Step tracker active. For hardware sensors on mobile, ensure motion permissions are granted.');
        });
        detectorRef.current = detector;
      } catch (e) {
        console.warn('Failed to initialize step detector:', e);
      }
    } else {
      if (detectorRef.current) {
        // Sync remaining unsynced steps before stopping
        const currentCount = detectorRef.current.getCount ? detectorRef.current.getCount() : liveSteps;
        const delta = currentCount - lastSyncStepsRef.current;
        if (delta > 0) {
          syncStepsToBackend(delta);
          lastSyncStepsRef.current = currentCount;
        }
        detectorRef.current.stop();
        detectorRef.current = null;
      }
    }

    return () => {
      if (detectorRef.current) {
        detectorRef.current.stop();
        detectorRef.current = null;
      }
    };
  }, [isTrackingSteps]);

  const toggleStepTracker = () => {
    const nextState = !isTrackingSteps;
    setIsTrackingSteps(nextState);
    localStorage.setItem('gymsync_step_tracking_active', String(nextState));
    if (nextState) {
      toast.success('🚶 Walking Step Tracker activated!');
    } else {
      toast.info('Walking Step Tracker paused.');
    }
  };

  // Unified Calorie Calculations
  // Walking calories: backend + any live unsynced steps delta * 0.04
  const liveWalkingCalories = Math.round((liveSteps - lastSyncStepsRef.current) * 0.04);
  const totalWalkingKcal = (energyData.walkingKcal || 0) + Math.max(0, liveWalkingCalories);
  const totalWorkoutKcal = energyData.workoutKcal || 0;
  const totalEatenKcal = energyData.eatenKcal || 0;
  const unifiedBurnedKcal = totalWorkoutKcal + totalWalkingKcal;
  const unifiedBalance = totalEatenKcal - unifiedBurnedKcal;

  // Background AI Weight Loss Prediction (Hidden calculation)
  const hiddenPrediction = useMemo(() => {
    // 7700 kcal deficit ≈ 1 kg fat loss
    const netDailyDeficit = unifiedBurnedKcal - totalEatenKcal;
    const projectedWeeklyChangeKg = (netDailyDeficit * 7) / 7700;
    const userWeight = currentWeight || bio?.weight || 70;
    return {
      netDailyDeficit,
      projectedWeeklyChangeKg: projectedWeeklyChangeKg.toFixed(2),
      userWeight
    };
  }, [unifiedBurnedKcal, totalEatenKcal, currentWeight, bio]);

  const isBalancePositive = unifiedBalance <= 0; // Negative balance means burned > eaten (ideal for fitness/deficit)

  return (
    <div className="profile-energy-wrapper">
      <div className="profile-energy-card">
        <div className="profile-energy-header">
          <div className="profile-energy-title">
            <Activity size={20} color="var(--primary-accent)" />
            <span>Today's Energy Balance</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            {isTrackingSteps && (
              <span className="live-steps-badge">
                <span className="step-tracker-pulse" />
                {liveSteps > 0 ? `${liveSteps} steps live` : 'Sensor Active'}
              </span>
            )}
            <button
              type="button"
              className={`step-tracker-toggle-btn ${isTrackingSteps ? 'active' : ''}`}
              onClick={toggleStepTracker}
              title="Toggle automatic device accelerometer step tracking"
            >
              <Footprints size={15} />
              <span>Step Tracker: {isTrackingSteps ? 'ON' : 'OFF'}</span>
            </button>
          </div>
        </div>

        {/* 4-Metric Energy Grid */}
        <div className="profile-energy-grid">
          <div className="profile-energy-stat">
            <span className="profile-energy-label">
              <Utensils size={13} color="#3b82f6" /> Eaten
            </span>
            <span className="profile-energy-val eaten">
              ~{totalEatenKcal}
            </span>
          </div>

          <div className="profile-energy-stat">
            <span className="profile-energy-label">
              <Dumbbell size={13} color="#f59e0b" /> Workout
            </span>
            <span className="profile-energy-val workout">
              ~{totalWorkoutKcal}
            </span>
          </div>

          <div className="profile-energy-stat">
            <span className="profile-energy-label">
              <Footprints size={13} color="#10b981" /> Walking
            </span>
            <span className="profile-energy-val walking">
              ~{totalWalkingKcal}
            </span>
          </div>

          <div className="profile-energy-stat">
            <span className="profile-energy-label">
              <Flame size={13} color={isBalancePositive ? '#10b981' : '#ef4444'} /> Balance
            </span>
            <span className={`profile-energy-val ${isBalancePositive ? 'balance-pos' : 'balance-neg'}`}>
              {unifiedBalance > 0 ? `+${unifiedBalance}` : unifiedBalance}
            </span>
          </div>
        </div>

        {/* Goal Progress Bar (Clean & Focused, without raw messy calculation formulas) */}
        {goal && (
          <div style={{ background: 'rgba(255,255,255,0.02)', padding: '12px 14px', borderRadius: '10px', border: '1px solid var(--card-border)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', marginBottom: '6px', color: 'var(--text-secondary)' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                <Target size={14} color="#10b981" /> {goal.title || 'Target Progress'}
              </span>
              <span>{goal.currentWeightKg} kg / {goal.targetWeightKg} kg</span>
            </div>
            <div style={{ height: '6px', background: 'rgba(255,255,255,0.08)', borderRadius: '3px', overflow: 'hidden' }}>
              <div
                style={{
                  height: '100%',
                  background: 'linear-gradient(90deg, #3b82f6, #10b981)',
                  width: `${Math.min(100, Math.max(5, (Math.abs(goal.startWeightKg - goal.currentWeightKg) / Math.max(1, Math.abs(goal.startWeightKg - goal.targetWeightKg))) * 100))}%`,
                  transition: 'width 0.4s ease'
                }}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default TodaysEnergyCard;
