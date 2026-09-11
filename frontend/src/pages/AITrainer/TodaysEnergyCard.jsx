import React, { useState, useEffect } from 'react';
import { Activity, Flame, Utensils, Target, Footprints, Dumbbell } from 'lucide-react';
import './TodaysEnergyCard.css';

export const TodaysEnergyCard = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchEnergyData();
    // Refresh periodically if active
    const interval = setInterval(fetchEnergyData, 60000);
    return () => clearInterval(interval);
  }, []);

  const fetchEnergyData = async () => {
    try {
      const token = localStorage.getItem('gymsync_token');
      if (!token) return;
      
      const todayStr = new Date().toLocaleDateString('en-CA');
      const res = await fetch(`/api/activity/today-energy?date=${todayStr}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch (err) {
      console.error('Failed to fetch energy data', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return null; // Or a skeleton
  if (!data || !data.energy) return null;

  const { energy, goal } = data;
  
  // Safe color logic for balance: Green if deficit aligns with weight loss, amber otherwise
  const isWeightLoss = goal && goal.startWeightKg > goal.targetWeightKg;
  const isBalanceGreen = isWeightLoss ? energy.balance <= 0 : energy.balance >= 0;

  // Calculate goal progress percentage
  let progressPct = 0;
  if (goal && goal.startWeightKg !== goal.targetWeightKg) {
    const totalDiff = Math.abs(goal.startWeightKg - goal.targetWeightKg);
    const currentDiff = Math.abs(goal.startWeightKg - goal.currentWeightKg);
    progressPct = Math.min(100, Math.max(0, (currentDiff / totalDiff) * 100));
  }

  return (
    <div className="todays-energy-card">
      <div className="energy-header">
        <h3 className="energy-title">
          <Activity size={18} /> Today's Energy
        </h3>
        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted, #64748b)' }}>
          Estimates
        </span>
      </div>

      <div className="energy-grid">
        <div className="energy-stat">
          <span className="energy-label"><Utensils size={14} style={{marginBottom: 2}}/> Eaten</span>
          <span className="energy-val eaten">~{energy.eatenKcal}</span>
        </div>
        <div className="energy-stat">
          <span className="energy-label"><Dumbbell size={14} style={{marginBottom: 2}}/> Workout</span>
          <span className="energy-val burned">~{energy.workoutKcal}</span>
        </div>
        <div className="energy-stat">
          <span className="energy-label"><Footprints size={14} style={{marginBottom: 2}}/> Walking</span>
          <span className="energy-val burned">~{energy.walkingKcal}</span>
        </div>
        <div className={`energy-stat ${isBalanceGreen ? 'balance-positive' : 'balance-amber'}`}>
          <span className="energy-label"><Flame size={14} style={{marginBottom: 2}}/> Balance</span>
          <span className={`energy-val ${isBalanceGreen ? 'balance-green' : 'balance-amber'}`}>
            {energy.balance > 0 ? '+' : ''}{energy.balance}
          </span>
        </div>
      </div>

      {goal && (
        <div className="goal-progress-section">
          <div className="goal-progress-header">
            <span><Target size={14} style={{marginRight: 4}}/> {goal.title}</span>
            <span>{goal.currentWeightKg} kg / {goal.targetWeightKg} kg</span>
          </div>
          <div className="goal-progress-bar-container">
            <div className="goal-progress-fill" style={{ width: `${progressPct}%` }}></div>
          </div>
        </div>
      )}
    </div>
  );
};
