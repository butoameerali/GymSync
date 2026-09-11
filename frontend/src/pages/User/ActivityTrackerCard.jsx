import React, { useState, useEffect, useRef } from 'react';
import { Footprints, Play, Square } from 'lucide-react';
import createStepDetector from '../../ai-detectors/steps-v1';
import { toast } from 'react-toastify';

export const ActivityTrackerCard = () => {
  const [isTracking, setIsTracking] = useState(false);
  const [steps, setSteps] = useState(0);
  const detectorRef = useRef(null);
  const syncIntervalRef = useRef(null);
  const lastSyncCountRef = useRef(0);

  const startTracking = async () => {
    try {
      if (!detectorRef.current) {
        detectorRef.current = createStepDetector({
          onStepCount: (count) => setSteps(count)
        });
      }
      await detectorRef.current.start();
      setIsTracking(true);
      
      // Flush every 60s
      syncIntervalRef.current = setInterval(flushSteps, 60000);
      toast.success('Activity tracking started.');
    } catch (err) {
      console.error(err);
      toast.error('Could not start tracking. Please ensure device motion sensors are permitted.');
    }
  };

  const stopTracking = () => {
    if (detectorRef.current) {
      detectorRef.current.stop();
    }
    setIsTracking(false);
    clearInterval(syncIntervalRef.current);
    flushSteps();
  };

  const flushSteps = async () => {
    const currentSteps = detectorRef.current?.getCount() || steps;
    const delta = currentSteps - lastSyncCountRef.current;
    
    if (delta > 0) {
      try {
        const token = localStorage.getItem('gymsync_token');
        if (!token) return;
        
        const todayStr = new Date().toLocaleDateString('en-CA');
        
        // Rough estimate for active minutes and distance
        const activeMins = Math.round(delta / 100); 
        const distKm = (delta * 0.0008).toFixed(3);

        const res = await fetch('/api/activity/sync', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            date: todayStr,
            stepsDelta: delta,
            distanceKmDelta: Number(distKm),
            activeMinutesDelta: activeMins
          })
        });

        if (res.ok) {
          lastSyncCountRef.current = currentSteps;
        }
      } catch (err) {
        console.error('Failed to sync steps', err);
      }
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (isTracking) {
        stopTracking();
      }
    };
  }, [isTracking]);

  // Flush on visibility change (backgrounding)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden && isTracking) {
        flushSteps();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [isTracking, steps]);

  return (
    <div style={{ background: 'var(--panel-bg, #1e293b)', borderRadius: '12px', padding: '20px', border: '1px solid rgba(255,255,255,0.05)', marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
        <div style={{ background: isTracking ? 'rgba(16, 185, 129, 0.2)' : 'rgba(255,255,255,0.05)', padding: '12px', borderRadius: '50%', color: isTracking ? '#10b981' : 'var(--text-secondary)' }}>
          <Footprints size={24} />
        </div>
        <div>
          <h4 style={{ margin: 0, color: 'var(--text-primary)', fontSize: '1.1rem' }}>Foreground Activity Tracking</h4>
          <p style={{ margin: '4px 0 0', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
            {isTracking ? `Tracking active... ${steps} steps detected.` : 'Turn on to count steps while app is open.'}
          </p>
        </div>
      </div>
      
      <button 
        onClick={isTracking ? stopTracking : startTracking}
        style={{
          background: isTracking ? 'rgba(239, 68, 68, 0.1)' : 'rgba(59, 130, 246, 0.1)',
          color: isTracking ? '#ef4444' : '#3b82f6',
          border: `1px solid ${isTracking ? '#ef4444' : '#3b82f6'}`,
          padding: '10px 20px',
          borderRadius: '8px',
          fontWeight: 'bold',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          transition: 'all 0.2s'
        }}
      >
        {isTracking ? <><Square size={16} /> Stop</> : <><Play size={16} /> Start</>}
      </button>
    </div>
  );
};
