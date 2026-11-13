import React, { useState, useEffect } from 'react';
import { Bell, Moon, Clock, Dumbbell, Utensils, TrendingDown, VolumeX, Volume2, ShieldCheck, Check } from 'lucide-react';
import { notificationService } from '../services/notificationService';
import webPushClient from '../services/webPushClient';

export default function NotificationSettingsCard() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const [prefs, setPrefs] = useState({
    muted: false,
    quietHoursStart: '22:00',
    quietHoursEnd: '07:00',
    workoutReminderTime: '09:00',
    workoutRemindersEnabled: true,
    mealRemindersEnabled: true,
    progressRemindersEnabled: true
  });

  const [pushStatus, setPushStatus] = useState(null);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    setLoading(true);
    try {
      const [prefsRes, pushRes] = await Promise.all([
        notificationService.getPreferences().catch(() => ({ preferences: {} })),
        webPushClient.getSubscriptionStatus().catch(() => ({ supported: false, subscribed: false }))
      ]);

      if (prefsRes?.preferences) {
        setPrefs(prev => ({ ...prev, ...prefsRes.preferences }));
      }
      setPushStatus(pushRes);
    } catch (err) {
      console.warn('Notification settings load notice:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setSaveSuccess(false);
    try {
      await notificationService.updatePreferences(prefs);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      alert(err.message || 'Failed to save notification preferences.');
    } finally {
      setSaving(false);
    }
  };

  const handleTogglePush = async () => {
    if (pushStatus?.subscribed) {
      await webPushClient.unsubscribe();
      setPushStatus(prev => ({ ...prev, subscribed: false }));
    } else {
      const res = await webPushClient.requestPermissionAndSubscribe();
      if (res.success) {
        setPushStatus(prev => ({ ...prev, subscribed: true, permission: 'granted' }));
      } else {
        alert(res.reason || 'Could not enable push notifications.');
      }
    }
  };

  if (loading) {
    return <div style={{ padding: '20px', color: '#6b7280' }}>Loading reminder settings...</div>;
  }

  return (
    <div
      style={{
        backgroundColor: '#fff',
        borderRadius: '14px',
        padding: '24px',
        boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
        color: '#1f2937',
        marginTop: '20px'
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Bell size={22} color="#059669" />
          <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 700, color: '#111827' }}>
            Reminder &amp; Push Notification Settings
          </h3>
        </div>

        {/* Global Mute Toggle */}
        <button
          type="button"
          onClick={() => setPrefs(p => ({ ...p, muted: !p.muted }))}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '6px 12px',
            borderRadius: '20px',
            border: prefs.muted ? '1px solid #ef4444' : '1px solid #d1d5db',
            backgroundColor: prefs.muted ? '#fee2e2' : '#f9fafb',
            color: prefs.muted ? '#dc2626' : '#4b5563',
            fontSize: '0.85rem',
            fontWeight: 600,
            cursor: 'pointer'
          }}
        >
          {prefs.muted ? <VolumeX size={16} /> : <Volume2 size={16} />}
          {prefs.muted ? 'Reminders Muted' : 'Mute All'}
        </button>
      </div>

      <form onSubmit={handleSave}>
        {/* Web Push Card */}
        {pushStatus?.supported && (
          <div
            style={{
              padding: '16px',
              borderRadius: '10px',
              backgroundColor: '#f0fdf4',
              border: '1px solid #bbf7d0',
              marginBottom: '20px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '12px'
            }}
          >
            <div>
              <div style={{ fontWeight: 700, color: '#166534', fontSize: '0.95rem' }}>
                Browser Web Push (Service Worker)
              </div>
              <div style={{ fontSize: '0.82rem', color: '#15803d', marginTop: '2px' }}>
                {pushStatus.subscribed
                  ? 'Active: You will receive workout, meal, and check-in reminders on this device.'
                  : 'Receive timely program check-in notifications even when GymSync is closed.'}
              </div>
            </div>

            <button
              type="button"
              onClick={handleTogglePush}
              style={{
                padding: '8px 16px',
                borderRadius: '8px',
                border: 'none',
                fontWeight: 600,
                fontSize: '0.85rem',
                cursor: 'pointer',
                backgroundColor: pushStatus.subscribed ? '#fee2e2' : '#059669',
                color: pushStatus.subscribed ? '#dc2626' : '#fff'
              }}
            >
              {pushStatus.subscribed ? 'Disable Push' : 'Enable Web Push'}
            </button>
          </div>
        )}

        {/* Quiet Hours */}
        <div style={{ marginBottom: '20px', padding: '16px', borderRadius: '10px', backgroundColor: '#f9fafb', border: '1px solid #e5e7eb' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
            <Moon size={18} color="#4b5563" />
            <span style={{ fontWeight: 700, fontSize: '0.95rem', color: '#111827' }}>
              Quiet Hours
            </span>
          </div>
          <p style={{ margin: '0 0 12px 0', fontSize: '0.82rem', color: '#6b7280' }}>
            No push or sound reminders will be delivered during these hours (notifications are quietly queued).
          </p>

          <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', color: '#4b5563', marginBottom: '4px' }}>
                Start Time
              </label>
              <input
                type="time"
                value={prefs.quietHoursStart}
                onChange={(e) => setPrefs(p => ({ ...p, quietHoursStart: e.target.value }))}
                style={{ padding: '6px 10px', borderRadius: '6px', border: '1px solid #d1d5db' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', color: '#4b5563', marginBottom: '4px' }}>
                End Time
              </label>
              <input
                type="time"
                value={prefs.quietHoursEnd}
                onChange={(e) => setPrefs(p => ({ ...p, quietHoursEnd: e.target.value }))}
                style={{ padding: '6px 10px', borderRadius: '6px', border: '1px solid #d1d5db' }}
              />
            </div>
          </div>
        </div>

        {/* Reminder Category Toggles & Times */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginBottom: '24px' }}>
          {/* Workout Reminder */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Dumbbell size={18} color="#059669" />
              <div>
                <span style={{ fontWeight: 600, fontSize: '0.9rem', color: '#111827' }}>
                  Daily Workout Reminder
                </span>
                <span style={{ display: 'block', fontSize: '0.78rem', color: '#6b7280' }}>
                  Reminds you of today's scheduled training session from your active program.
                </span>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <input
                type="time"
                value={prefs.workoutReminderTime}
                onChange={(e) => setPrefs(p => ({ ...p, workoutReminderTime: e.target.value }))}
                style={{ padding: '4px 8px', borderRadius: '6px', border: '1px solid #d1d5db', fontSize: '0.85rem' }}
              />
              <input
                type="checkbox"
                checked={prefs.workoutRemindersEnabled}
                onChange={(e) => setPrefs(p => ({ ...p, workoutRemindersEnabled: e.target.checked }))}
                style={{ width: '18px', height: '18px', accentColor: '#059669', cursor: 'pointer' }}
              />
            </div>
          </div>

          {/* Meal Reminders */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Utensils size={18} color="#d97706" />
              <div>
                <span style={{ fontWeight: 600, fontSize: '0.9rem', color: '#111827' }}>
                  Meal-Report Reminders (Breakfast, Lunch, Dinner, Snack)
                </span>
                <span style={{ display: 'block', fontSize: '0.78rem', color: '#6b7280' }}>
                  Reminds you to log your meals during regular nutrition reporting windows.
                </span>
              </div>
            </div>
            <input
              type="checkbox"
              checked={prefs.mealRemindersEnabled}
              onChange={(e) => setPrefs(p => ({ ...p, mealRemindersEnabled: e.target.checked }))}
              style={{ width: '18px', height: '18px', accentColor: '#d97706', cursor: 'pointer' }}
            />
          </div>

          {/* Progress Reminders */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <TrendingDown size={18} color="#2563eb" />
              <div>
                <span style={{ fontWeight: 600, fontSize: '0.9rem', color: '#111827' }}>
                  Weekly Progress &amp; Waist Check-in
                </span>
                <span style={{ display: 'block', fontSize: '0.78rem', color: '#6b7280' }}>
                  Prompts a weekly check-in to review streaks or record optional waist measurements.
                </span>
              </div>
            </div>
            <input
              type="checkbox"
              checked={prefs.progressRemindersEnabled}
              onChange={(e) => setPrefs(p => ({ ...p, progressRemindersEnabled: e.target.checked }))}
              style={{ width: '18px', height: '18px', accentColor: '#2563eb', cursor: 'pointer' }}
            />
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button
            type="submit"
            disabled={saving}
            style={{
              padding: '10px 22px',
              backgroundColor: '#059669',
              color: '#fff',
              border: 'none',
              borderRadius: '8px',
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            {saving ? 'Saving...' : 'Save Reminder Preferences'}
          </button>
          {saveSuccess && (
            <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#059669', fontSize: '0.9rem', fontWeight: 600 }}>
              <Check size={16} /> Saved!
            </span>
          )}
        </div>
      </form>
    </div>
  );
}
