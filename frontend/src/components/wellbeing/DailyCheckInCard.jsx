import React, { useState } from 'react';
import { Target, Activity, AlertCircle } from 'lucide-react';
import { toast } from 'react-toastify';
import { useNavigate } from 'react-router-dom';

export default function DailyCheckInCard({ onDismiss, onIssueReport }) {
  const [step, setStep] = useState(1);
  const [mood, setMood] = useState(null);
  const [energyLevel, setEnergyLevel] = useState(3);
  const [sleepHours, setSleepHours] = useState(7);
  const [lastSessionRPE, setLastSessionRPE] = useState(5);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleMoodSelect = (selectedMood) => {
    setMood(selectedMood);
    if (selectedMood === 'Pain') {
      if (onIssueReport) onIssueReport();
      else navigate('/ai-trainer/report-issue');
      return;
    }
    setStep(2);
  };

  const handleSubmit = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('gymsync_token');
      const res = await fetch('/api/wellbeing/check-in', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ mood, energyLevel, sleepHours, lastSessionRPE })
      });
      if (res.ok) {
        if (onDismiss) onDismiss();
      } else {
        toast.error('Failed to submit daily check-in');
      }
    } catch (e) {
      toast.error('Error submitting check-in');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="glass-panel" style={{ padding: '20px', marginBottom: '20px', background: 'rgba(59, 130, 246, 0.05)', border: '1px solid rgba(59, 130, 246, 0.2)' }}>
      {step === 1 && (
        <div>
          <h4 style={{ margin: '0 0 15px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Activity size={20} color="#3b82f6" /> Daily Check-In
          </h4>
          <p style={{ margin: '0 0 15px 0', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>How are you feeling today?</p>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: '10px' }}>
            <button className="btn btn-outline" style={{ fontSize: '1.5rem', padding: '10px' }} onClick={() => handleMoodSelect('Happy')}>😊</button>
            <button className="btn btn-outline" style={{ fontSize: '1.5rem', padding: '10px' }} onClick={() => handleMoodSelect('Good')}>🙂</button>
            <button className="btn btn-outline" style={{ fontSize: '1.5rem', padding: '10px' }} onClick={() => handleMoodSelect('Neutral')}>😐</button>
            <button className="btn btn-outline" style={{ fontSize: '1.5rem', padding: '10px' }} onClick={() => handleMoodSelect('Tired')}>😓</button>
            <button className="btn btn-outline" style={{ fontSize: '1.5rem', padding: '10px', borderColor: '#ef4444' }} onClick={() => handleMoodSelect('Pain')}>🤕</button>
          </div>
        </div>
      )}

      {step === 2 && (
        <div>
          <h4 style={{ margin: '0 0 15px 0' }}>Quick Recovery Stats</h4>
          <div style={{ marginBottom: '15px' }}>
            <label style={{ display: 'block', fontSize: '0.9rem', marginBottom: '8px' }}>Energy Level: {energyLevel}/5</label>
            <input type="range" min="1" max="5" value={energyLevel} onChange={e => setEnergyLevel(parseInt(e.target.value))} style={{ width: '100%' }} />
          </div>
          <div style={{ marginBottom: '15px' }}>
            <label style={{ display: 'block', fontSize: '0.9rem', marginBottom: '8px' }}>Sleep Last Night: {sleepHours} hrs</label>
            <input type="range" min="3" max="12" step="0.5" value={sleepHours} onChange={e => setSleepHours(parseFloat(e.target.value))} style={{ width: '100%' }} />
          </div>
          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', fontSize: '0.9rem', marginBottom: '8px' }}>Yesterday's Workout Effort (RPE): {lastSessionRPE}/10</label>
            <input type="range" min="1" max="10" value={lastSessionRPE} onChange={e => setLastSessionRPE(parseInt(e.target.value))} style={{ width: '100%' }} />
          </div>
          <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
            {onDismiss && (
              <button className="btn btn-outline btn-sm" onClick={onDismiss} disabled={loading}>
                Skip
              </button>
            )}
            <button className="btn btn-primary btn-sm" onClick={handleSubmit} disabled={loading}>
              Submit
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
