import React, { useState, useEffect } from 'react';
import {
  TrendingDown,
  Calendar,
  Flame,
  Award,
  PlusCircle,
  AlertTriangle,
  CheckCircle,
  HelpCircle,
  XCircle,
  Clock,
  ShieldCheck,
  Scale,
  Ruler
} from 'lucide-react';
import weightLossService from './weightLossService';
import { WeightLossMedicalWarningCard } from './WeightLossMedicalWarningModal';

export default function WeightLossDashboard({ enrollment: initialEnrollment, onProgramLeft }) {
  const [enrollment, setEnrollment] = useState(initialEnrollment);
  const [program, setProgram] = useState(null);
  const [loading, setLoading] = useState(!initialEnrollment);
  const [showLogModal, setShowLogModal] = useState(false);

  // Check-in input states (Optional: weight, waist, notes)
  const [checkInWeight, setCheckInWeight] = useState('');
  const [checkInWaist, setCheckInWaist] = useState('');
  const [checkInNotes, setCheckInNotes] = useState('');
  const [submittingLog, setSubmittingLog] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  useEffect(() => {
    fetchActiveData();
  }, []);

  const fetchActiveData = async () => {
    try {
      const res = await weightLossService.getActiveEnrollment();
      if (res.active) {
        setEnrollment(res.enrollment);
        setProgram(res.program);
      } else {
        if (onProgramLeft) onProgramLeft();
      }
    } catch (err) {
      console.error('Failed to fetch active weight loss enrollment:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleRecordCheckIn = async (e) => {
    e.preventDefault();
    if (!checkInWeight && !checkInWaist && !checkInNotes) {
      alert('Please enter at least one measurement (weight or waist) or a progress note.');
      return;
    }

    setSubmittingLog(true);
    try {
      const res = await weightLossService.recordWeighIn({
        weightKg: checkInWeight ? Number(checkInWeight) : null,
        waistCm: checkInWaist ? Number(checkInWaist) : null,
        notes: checkInNotes
      });

      setEnrollment(prev => ({
        ...prev,
        weighIns: res.weighIns,
        confidenceLabel: res.confidenceLabel
      }));

      setShowLogModal(false);
      setCheckInWeight('');
      setCheckInWaist('');
      setCheckInNotes('');
    } catch (err) {
      alert(err?.data?.error || err?.message || 'Failed to record check-in.');
    } finally {
      setSubmittingLog(false);
    }
  };

  const handleLeaveProgram = async () => {
    if (!window.confirm('Are you sure you want to end your current weight loss program?')) {
      return;
    }

    setCancelling(true);
    try {
      await weightLossService.cancelEnrollment();
      if (onProgramLeft) {
        onProgramLeft();
      }
    } catch (err) {
      alert(err?.data?.error || err?.message || 'Failed to cancel enrollment.');
    } finally {
      setCancelling(false);
    }
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '60px 20px' }}>
        <p style={{ color: '#6b7280' }}>Loading your active program progress...</p>
      </div>
    );
  }

  if (!enrollment) {
    return null;
  }

  const weighIns = enrollment.weighIns || [];
  const latestWeighIn = weighIns[weighIns.length - 1];
  const startWeight = enrollment.startWeightKg;
  const currentWeight = latestWeighIn?.weightKg || startWeight;
  const targetWeight = enrollment.targetWeightKg;
  const completedSessions = program?.progress?.completedSessions?.length || 0;

  return (
    <div style={{ maxWidth: '900px', margin: '30px auto', padding: '0 20px' }}>
      {/* Header Banner */}
      <div
        style={{
          backgroundColor: '#064e3b',
          borderRadius: '16px',
          padding: '24px 28px',
          color: '#fff',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '16px',
          marginBottom: '24px'
        }}
      >
        <div>
          <span style={{ fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#6ee7b7', fontWeight: 700 }}>
            Active Human-Authored Program
          </span>
          <h1 style={{ fontSize: '1.8rem', fontWeight: 800, margin: '4px 0 6px 0' }}>
            {program?.title || 'Weight Loss Kickstart'}
          </h1>
          <p style={{ margin: 0, fontSize: '0.95rem', color: '#a7f3d0' }}>
            Curated by {program?.instructorName || 'Certified Fitness Instructor'} • {enrollment.targetDurationWeeks} Weeks Target
          </p>
        </div>

        <button
          onClick={handleLeaveProgram}
          disabled={cancelling}
          style={{
            backgroundColor: 'rgba(239, 68, 68, 0.2)',
            border: '1px solid #ef4444',
            color: '#fca5a5',
            padding: '8px 16px',
            borderRadius: '8px',
            fontSize: '0.85rem',
            fontWeight: 600,
            cursor: 'pointer'
          }}
        >
          {cancelling ? 'Leaving...' : 'End Program'}
        </button>
      </div>

      {/* Visibly Pinned Medical Safety Card (Rule R5) */}
      <WeightLossMedicalWarningCard
        acknowledged={true}
        onToggleAcknowledge={null}
        isSenior={Boolean(enrollment.medicalWarning?.seniorAcknowledgedAt)}
        seniorAcknowledged={true}
        onToggleSeniorAcknowledge={null}
        isPinned={true}
      />

      {/* Progress Cards Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '24px' }}>
        <div style={{ backgroundColor: '#fff', borderRadius: '12px', padding: '18px', boxShadow: '0 2px 10px rgba(0,0,0,0.05)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#6b7280', fontSize: '0.85rem', fontWeight: 600 }}>
            <Scale size={16} /> Current vs Target
          </div>
          <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#111827', marginTop: '8px' }}>
            {currentWeight ? `${currentWeight} kg` : 'Unrecorded'}
          </div>
          <div style={{ fontSize: '0.8rem', color: '#059669', fontWeight: 600, marginTop: '4px' }}>
            Target: {targetWeight} kg (Start: {startWeight} kg)
          </div>
        </div>

        <div style={{ backgroundColor: '#fff', borderRadius: '12px', padding: '18px', boxShadow: '0 2px 10px rgba(0,0,0,0.05)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#6b7280', fontSize: '0.85rem', fontWeight: 600 }}>
            <Award size={16} /> Workouts Completed
          </div>
          <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#111827', marginTop: '8px' }}>
            {completedSessions}
          </div>
          <div style={{ fontSize: '0.8rem', color: '#4b5563', marginTop: '4px' }}>
            Consistency drive active
          </div>
        </div>

        <div style={{ backgroundColor: '#fff', borderRadius: '12px', padding: '18px', boxShadow: '0 2px 10px rgba(0,0,0,0.05)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#6b7280', fontSize: '0.85rem', fontWeight: 600 }}>
            <Calendar size={16} /> Target Horizon
          </div>
          <div style={{ fontSize: '1.25rem', fontWeight: 700, color: '#111827', marginTop: '8px' }}>
            {new Date(enrollment.targetDate).toLocaleDateString()}
          </div>
          <div style={{ fontSize: '0.8rem', color: '#6b7280', marginTop: '4px' }}>
            {enrollment.targetDurationWeeks} weeks duration
          </div>
        </div>

        <div style={{ backgroundColor: '#fff', borderRadius: '12px', padding: '18px', boxShadow: '0 2px 10px rgba(0,0,0,0.05)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#6b7280', fontSize: '0.85rem', fontWeight: 600 }}>
            <ShieldCheck size={16} /> Data Confidence
          </div>
          <div style={{ fontSize: '1.6rem', fontWeight: 800, color: enrollment.confidenceLabel === 'High' ? '#059669' : '#d97706', marginTop: '8px' }}>
            {enrollment.confidenceLabel || 'Low'}
          </div>
          <div style={{ fontSize: '0.8rem', color: '#6b7280', marginTop: '4px' }}>
            Based on logged check-ins
          </div>
        </div>
      </div>

      {/* Optional Check-in / Weigh-in Section (Rule 2.5) */}
      <div style={{ backgroundColor: '#fff', borderRadius: '14px', padding: '24px', boxShadow: '0 4px 16px rgba(0,0,0,0.06)', marginBottom: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#111827', margin: 0 }}>
              Bi-Weekly Progress Check-ins (Optional)
            </h2>
            <p style={{ margin: '4px 0 0 0', fontSize: '0.85rem', color: '#6b7280' }}>
              Weigh-ins are completely optional — track progress via waist measurements, workouts completed, and consistency streaks if you don't have a scale.
            </p>
          </div>
          <button
            onClick={() => setShowLogModal(true)}
            style={{
              backgroundColor: '#059669',
              color: '#fff',
              border: 'none',
              padding: '10px 18px',
              borderRadius: '8px',
              fontWeight: 600,
              fontSize: '0.9rem',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              cursor: 'pointer'
            }}
          >
            <PlusCircle size={16} /> Record Check-in
          </button>
        </div>

        {/* Check-in History */}
        {weighIns.length === 0 ? (
          <p style={{ color: '#9ca3af', textAlign: 'center', margin: '20px 0' }}>No check-ins recorded yet.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {weighIns.map((item, idx) => (
              <div
                key={idx}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '12px 16px',
                  backgroundColor: '#f9fafb',
                  borderRadius: '8px',
                  border: '1px solid #e5e7eb'
                }}
              >
                <div>
                  <span style={{ fontWeight: 600, color: '#111827', fontSize: '0.95rem' }}>
                    {item.date}
                  </span>
                  {item.notes && (
                    <span style={{ display: 'block', fontSize: '0.85rem', color: '#6b7280', marginTop: '2px' }}>
                      {item.notes}
                    </span>
                  )}
                </div>

                <div style={{ textAlign: 'right' }}>
                  <div style={{ display: 'flex', gap: '14px', alignItems: 'center' }}>
                    {item.weightKg != null && (
                      <span style={{ fontWeight: 700, color: '#111827' }}>
                        {item.weightKg} kg
                      </span>
                    )}
                    {item.waistCm != null && (
                      <span style={{ fontSize: '0.9rem', color: '#4b5563', backgroundColor: '#e5e7eb', padding: '2px 8px', borderRadius: '4px' }}>
                        Waist: {item.waistCm} cm
                      </span>
                    )}
                    {!item.isVerified && (
                      <span style={{ fontSize: '0.75rem', color: '#9ca3af', border: '1px solid #d1d5db', padding: '2px 6px', borderRadius: '4px' }}>
                        Self-Reported
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Log Check-in Modal */}
      {showLogModal && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '20px'
          }}
        >
          <div
            style={{
              backgroundColor: '#fff',
              borderRadius: '16px',
              padding: '28px',
              maxWidth: '450px',
              width: '100%',
              boxShadow: '0 20px 40px rgba(0,0,0,0.2)'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 700, color: '#111827' }}>
                Log Optional Progress Check-in
              </h3>
              <button
                onClick={() => setShowLogModal(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af' }}
              >
                <XCircle size={22} />
              </button>
            </div>

            <p style={{ fontSize: '0.85rem', color: '#6b7280', marginBottom: '20px' }}>
              Leave weight blank if you do not have a scale. You can log waist circumference or a general fitness note instead.
            </p>

            <form onSubmit={handleRecordCheckIn}>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: 600, color: '#374151', marginBottom: '6px' }}>
                  Weight (kg) — Optional
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={checkInWeight}
                  onChange={(e) => setCheckInWeight(e.target.value)}
                  placeholder="e.g. 74.5"
                  style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #d1d5db' }}
                />
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: 600, color: '#374151', marginBottom: '6px' }}>
                  Waist Circumference (cm) — Optional
                </label>
                <input
                  type="number"
                  step="0.5"
                  value={checkInWaist}
                  onChange={(e) => setCheckInWaist(e.target.value)}
                  placeholder="e.g. 82.0"
                  style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #d1d5db' }}
                />
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: 600, color: '#374151', marginBottom: '6px' }}>
                  Notes (e.g. energy levels, workout consistency)
                </label>
                <textarea
                  rows="2"
                  value={checkInNotes}
                  onChange={(e) => setCheckInNotes(e.target.value)}
                  placeholder="Felt great this week, hit all scheduled walking sessions..."
                  style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #d1d5db' }}
                />
              </div>

              <div style={{ display: 'flex', gap: '12px' }}>
                <button
                  type="button"
                  onClick={() => setShowLogModal(false)}
                  style={{ flex: 1, padding: '10px', backgroundColor: '#f3f4f6', border: '1px solid #d1d5db', borderRadius: '8px', fontWeight: 600, cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingLog}
                  style={{ flex: 1, padding: '10px', backgroundColor: '#059669', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 600, cursor: 'pointer' }}
                >
                  {submittingLog ? 'Saving...' : 'Save Check-in'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
