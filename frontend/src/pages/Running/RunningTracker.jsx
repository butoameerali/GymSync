import React, { useState, useEffect, useRef } from 'react';
import { MapPin, Play, Square, Flame, Activity } from 'lucide-react';
import { saveExerciseProgress } from '../../utils/offlineStorage';
import './RunningTracker.css';

const RunningTracker = () => {
  const [isTracking, setIsTracking] = useState(false);
  const [distance, setDistance] = useState(0); // in meters
  const [time, setTime] = useState(0); // in seconds
  const [calories, setCalories] = useState(0);
  const [status, setStatus] = useState('Ready to run');
  
  const watchIdRef = useRef(null);
  const lastPosRef = useRef(null);
  const timerRef = useRef(null);

  // Helper to calculate distance between two lat/lon coordinates in meters (Haversine formula)
  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371e3; // metres
    const φ1 = lat1 * Math.PI/180;
    const φ2 = lat2 * Math.PI/180;
    const Δφ = (lat2-lat1) * Math.PI/180;
    const Δλ = (lon2-lon1) * Math.PI/180;

    const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ/2) * Math.sin(Δλ/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c; 
  };

  const startTracking = () => {
    if (!navigator.geolocation) {
      setStatus('Geolocation is not supported by your browser');
      return;
    }

    setStatus('Locating GPS...');
    
    // Start Time
    timerRef.current = setInterval(() => {
      setTime(prev => prev + 1);
      // Rough calorie calculation: ~10 calories per minute of running
      setCalories(prev => prev + (10 / 60)); 
    }, 1000);

    // Watch Position
    watchIdRef.current = navigator.geolocation.watchPosition(
      (position) => {
        setStatus('Tracking Location (Offline Ready)');
        const currentPos = {
          lat: position.coords.latitude,
          lon: position.coords.longitude
        };

        if (lastPosRef.current) {
          const dist = calculateDistance(
            lastPosRef.current.lat, lastPosRef.current.lon,
            currentPos.lat, currentPos.lon
          );
          // Only add distance if user moved more than 2 meters to avoid GPS noise
          if (dist > 2) {
            setDistance(prev => prev + dist);
          }
        }
        lastPosRef.current = currentPos;
      },
      (error) => {
        setStatus(`GPS Error: ${error.message}`);
      },
      { enableHighAccuracy: true, maximumAge: 10000, timeout: 5000 }
    );

    setIsTracking(true);
  };

  const stopTracking = () => {
    if (watchIdRef.current) {
      navigator.geolocation.clearWatch(watchIdRef.current);
    }
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    
    setStatus('Workout Finished and Saved!');
    setIsTracking(false);
    
    // Save to local storage offline cache
    const distanceKm = (distance / 1000).toFixed(2);
    saveExerciseProgress(`Running (${distanceKm} km)`, Math.floor(time / 60), Math.floor(calories));
  };

  const formatTime = (totalSeconds) => {
    const m = Math.floor(totalSeconds / 60).toString().padStart(2, '0');
    const s = (totalSeconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  return (
    <div className="running-page">
      <div className="container running-container">
        <div className="running-header">
          <h2>Outdoor Run Tracker</h2>
          <p>Track your location, distance, and calories (Works Offline)</p>
        </div>

        <div className="running-card glass-panel">
          <div className="status-indicator">
            <span className={`status-dot ${isTracking ? 'green pulse' : 'red'}`}></span>
            {status}
          </div>

          <div className="metrics-grid">
            <div className="metric">
              <MapPin size={32} color="#3b82f6" />
              <h3>{(distance / 1000).toFixed(2)}</h3>
              <span>Kilometers</span>
            </div>
            
            <div className="metric">
              <Activity size={32} color="#8b5cf6" />
              <h3>{formatTime(time)}</h3>
              <span>Time (MM:SS)</span>
            </div>
            
            <div className="metric">
              <Flame size={32} color="#f59e0b" />
              <h3>{Math.floor(calories)}</h3>
              <span>Calories</span>
            </div>
          </div>

          <div className="controls">
            {!isTracking ? (
              <button className="btn btn-primary btn-lg w-100" onClick={startTracking}>
                <Play size={24} /> Start Run
              </button>
            ) : (
              <button className="btn btn-danger btn-lg w-100" onClick={stopTracking}>
                <Square size={24} /> Stop & Save
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default RunningTracker;
