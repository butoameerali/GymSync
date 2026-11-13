import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  TrendingDown,
  Calendar,
  Clock,
  Dumbbell,
  AlertCircle,
  CheckCircle2,
  HelpCircle,
  ArrowRight,
  ShieldAlert,
  Info
} from 'lucide-react';
import weightLossService from './weightLossService';
import { WeightLossMedicalWarningCard, MEDICAL_WARNING_VERSION } from './WeightLossMedicalWarningModal';

export default function WeightLossEnrollmentPage({ onEnrollmentComplete }) {
  const navigate = useNavigate();

  // Eligibility state
  const [loading, setLoading] = useState(true);
  const [eligibility, setEligibility] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');

  // Form Inputs
  const [targetWeightKg, setTargetWeightKg] = useState('');
  const [targetDurationWeeks, setTargetDurationWeeks] = useState(4);
  const [medicalWarningAcknowledged, setMedicalWarningAcknowledged] = useState(false);
  const [seniorAcknowledged, setSeniorAcknowledged] = useState(false);
  const [availablePlans, setAvailablePlans] = useState([]);
  const [selectedProgramId, setSelectedProgramId] = useState('');
  const [trackFilter, setTrackFilter] = useState('All');

  // Projections & Realism Check
  const [calculating, setCalculating] = useState(false);
  const [projectionsData, setProjectionsData] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  // Initial eligibility verification and programs fetch
  useEffect(() => {
    fetchEligibility();
    fetchPlans();
  }, []);

  const fetchPlans = async () => {
    try {
      const res = await fetch('/api/plans/premade?goal=Weight Loss&limit=30');
      if (res.ok) {
        const data = await res.json();
        const items = data.items || (Array.isArray(data) ? data : []);
        setAvailablePlans(items);
        if (items.length > 0 && !selectedProgramId) {
          setSelectedProgramId(items[0]._id);
        }
      }
    } catch (e) {
      console.warn('Failed to fetch weight loss plans:', e);
    }
  };

  const fetchEligibility = async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      const res = await weightLossService.checkEligibility();
      setEligibility(res);
    } catch (err) {
      console.error('Eligibility fetch error:', err);
      const errMsg = err?.data?.error || err?.message || 'Unable to verify eligibility at this time.';
      setErrorMsg(errMsg);
    } finally {
      setLoading(false);
    }
  };

  // Recalculate projections when target weight or duration change
  useEffect(() => {
    if (!targetWeightKg || Number(targetWeightKg) <= 0 || !targetDurationWeeks) {
      setProjectionsData(null);
      return;
    }

    const timer = setTimeout(async () => {
      setCalculating(true);
      try {
        const res = await weightLossService.calculateProjections({
          targetWeightKg: Number(targetWeightKg),
          targetDurationWeeks: Number(targetDurationWeeks)
        });
        setProjectionsData(res);
      } catch (err) {
        console.warn('Calculation warning:', err);
      } finally {
        setCalculating(false);
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [targetWeightKg, targetDurationWeeks]);

  const handleEnroll = async (e) => {
    e.preventDefault();
    if (!medicalWarningAcknowledged) {
      alert('You must review and acknowledge the medical safety advisory before enrolling.');
      return;
    }

    if (eligibility?.isSenior && !seniorAcknowledged) {
      alert('Physician clearance acknowledgment is required for participants aged 65 and older.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await weightLossService.enroll({
        targetWeightKg: Number(targetWeightKg),
        targetDurationWeeks: Number(targetDurationWeeks),
        medicalWarningAcknowledged: true,
        seniorAcknowledged: Boolean(seniorAcknowledged),
        selectedProgramId: selectedProgramId || undefined,
        programId: selectedProgramId || undefined
      });

      if (onEnrollmentComplete) {
        onEnrollmentComplete(res.enrollment);
      } else {
        navigate('/weight-loss');
      }
    } catch (err) {
      const msg = err?.data?.error || err?.message || 'Enrollment failed. Please verify your entries.';
      alert(msg);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '60px 20px' }}>
        <div className="spinner" style={{ margin: '0 auto 16px' }} />
        <p style={{ color: '#6b7280' }}>Verifying baseline eligibility and safety parameters...</p>
      </div>
    );
  }

  // Gate Check 1: Incomplete Profile (Rule R4)
  if (eligibility?.code === 'INCOMPLETE_BIO') {
    return (
      <div style={{ maxWidth: '600px', margin: '40px auto', padding: '32px', backgroundColor: '#fff', borderRadius: '16px', boxShadow: '0 4px 20px rgba(0,0,0,0.08)', textAlign: 'center' }}>
        <div style={{ width: '64px', height: '64px', borderRadius: '50%', backgroundColor: '#fef3c7', color: '#d97706', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
          <AlertCircle size={32} />
        </div>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '12px', color: '#111827' }}>
          Complete Your Profile to Start
        </h2>
        <p style={{ color: '#4b5563', lineHeight: '1.6', marginBottom: '24px' }}>
          Weight loss programs require an authoritative baseline (height, weight, age, equipment, and training frequency) to ensure clinical safety and metabolic accuracy.
        </p>
        <button
          onClick={() => navigate('/profile')}
          style={{
            backgroundColor: '#059669',
            color: '#fff',
            border: 'none',
            padding: '12px 28px',
            borderRadius: '8px',
            fontWeight: 600,
            fontSize: '1rem',
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          Go to Profile <ArrowRight size={18} />
        </button>
      </div>
    );
  }

  // Gate Check 2: Underage (< 18)
  if (eligibility?.code === 'UNDERAGE') {
    return (
      <div style={{ maxWidth: '600px', margin: '40px auto', padding: '32px', backgroundColor: '#fff', borderRadius: '16px', boxShadow: '0 4px 20px rgba(0,0,0,0.08)', textAlign: 'center' }}>
        <div style={{ width: '64px', height: '64px', borderRadius: '50%', backgroundColor: '#fee2e2', color: '#dc2626', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
          <ShieldAlert size={32} />
        </div>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '12px', color: '#111827' }}>
          Age Restriction Advisory
        </h2>
        <p style={{ color: '#4b5563', lineHeight: '1.6', marginBottom: '24px' }}>
          GymSync weight-loss programs are restricted to adults aged 18 and older to safeguard adolescent musculoskeletal and hormonal development.
        </p>
        <button
          onClick={() => navigate('/home')}
          style={{
            backgroundColor: '#4b5563',
            color: '#fff',
            border: 'none',
            padding: '12px 28px',
            borderRadius: '8px',
            fontWeight: 600,
            cursor: 'pointer'
          }}
        >
          Return to Home
        </button>
      </div>
    );
  }

  // Gate Check 3: Active Program Exists (Rule R3)
  if (eligibility?.code === 'ACTIVE_PROGRAM_EXISTS') {
    return (
      <div style={{ maxWidth: '600px', margin: '40px auto', padding: '32px', backgroundColor: '#fff', borderRadius: '16px', boxShadow: '0 4px 20px rgba(0,0,0,0.08)', textAlign: 'center' }}>
        <div style={{ width: '64px', height: '64px', borderRadius: '50%', backgroundColor: '#e0e7ff', color: '#4338ca', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
          <Dumbbell size={32} />
        </div>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '12px', color: '#111827' }}>
          Finish or Leave Your Current Program First
        </h2>
        <p style={{ color: '#4b5563', lineHeight: '1.6', marginBottom: '24px' }}>
          {eligibility.message || 'You already have an active workout program. GymSync policy allows exactly one active program at a time to prevent overtraining.'}
        </p>
        <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
          <button
            onClick={() => navigate('/ai-trainer')}
            style={{
              backgroundColor: '#4f46e5',
              color: '#fff',
              border: 'none',
              padding: '12px 24px',
              borderRadius: '8px',
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            View Active Program
          </button>
          <button
            onClick={() => navigate('/dashboard')}
            style={{
              backgroundColor: '#f3f4f6',
              color: '#374151',
              border: '1px solid #d1d5db',
              padding: '12px 24px',
              borderRadius: '8px',
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            Dashboard
          </button>
        </div>
      </div>
    );
  }

  // Gate Check 4: Underweight BMI (< 18.5)
  if (eligibility?.code === 'UNDERWEIGHT') {
    return (
      <div style={{ maxWidth: '600px', margin: '40px auto', padding: '32px', backgroundColor: '#fff', borderRadius: '16px', boxShadow: '0 4px 20px rgba(0,0,0,0.08)', textAlign: 'center' }}>
        <div style={{ width: '64px', height: '64px', borderRadius: '50%', backgroundColor: '#fee2e2', color: '#dc2626', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
          <AlertCircle size={32} />
        </div>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '12px', color: '#111827' }}>
          Safety Boundary Notice
        </h2>
        <p style={{ color: '#4b5563', lineHeight: '1.6', marginBottom: '24px' }}>
          {eligibility.message}
        </p>
        <button
          onClick={() => navigate('/home')}
          style={{
            backgroundColor: '#4b5563',
            color: '#fff',
            border: 'none',
            padding: '12px 24px',
            borderRadius: '8px',
            fontWeight: 600,
            cursor: 'pointer'
          }}
        >
          Return to Home
        </button>
      </div>
    );
  }

  const evalPlan = projectionsData?.planEvaluation;
  const projRanges = projectionsData?.projections?.ranges;
  const confidence = projectionsData?.projections?.confidence || 'Low';

  return (
    <div style={{ maxWidth: '850px', margin: '30px auto', padding: '0 20px' }}>
      {/* Header */}
      <div style={{ marginBottom: '28px', textAlign: 'center' }}>
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            padding: '6px 16px',
            borderRadius: '20px',
            backgroundColor: '#ecfdf5',
            color: '#059669',
            fontSize: '0.85rem',
            fontWeight: 700,
            marginBottom: '12px'
          }}
        >
          <TrendingDown size={16} /> Certified Human-Authored Program
        </div>
        <h1 style={{ fontSize: '2.2rem', fontWeight: 800, color: '#111827', margin: 0 }}>
          Weight Loss & Metabolic Conditioning
        </h1>
        <p style={{ color: '#6b7280', fontSize: '1.05rem', marginTop: '8px' }}>
          Physiologically calibrated, joint-friendly programs authored by certified instructors.
        </p>
      </div>

      {/* Mandatory Medical Safety Card (Pinned at top, Rule R5) */}
      <WeightLossMedicalWarningCard
        acknowledged={medicalWarningAcknowledged}
        onToggleAcknowledge={setMedicalWarningAcknowledged}
        isSenior={eligibility?.isSenior}
        seniorAcknowledged={seniorAcknowledged}
        onToggleSeniorAcknowledge={setSeniorAcknowledged}
        isPinned={true}
      />

      <form onSubmit={handleEnroll}>
        {/* Choose Certified Weight Loss Program */}
        <div
          style={{
            backgroundColor: '#fff',
            borderRadius: '14px',
            padding: '24px',
            boxShadow: '0 4px 16px rgba(0,0,0,0.06)',
            marginBottom: '24px'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
            <div>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#111827', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Dumbbell size={20} color="#059669" /> Select Certified Program Track
              </h2>
              <p style={{ margin: '4px 0 0', fontSize: '0.85rem', color: '#6b7280' }}>
                Choose between Home (No Equipment) and Gym (Equipment Track) with Starter, Steady or Driven levels.
              </p>
            </div>
            {/* Filter buttons */}
            <div style={{ display: 'flex', gap: '6px' }}>
              {['All', 'Home (No Equipment)', 'Gym (Equipment Required)'].map(track => (
                <button
                  key={track}
                  type="button"
                  onClick={() => setTrackFilter(track)}
                  style={{
                    padding: '6px 12px',
                    borderRadius: '8px',
                    border: '1px solid #d1d5db',
                    background: trackFilter === track ? '#059669' : '#f9fafb',
                    color: trackFilter === track ? '#fff' : '#374151',
                    fontSize: '0.8rem',
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  {track === 'All' ? 'All Tracks' : track.includes('Home') ? 'Home Only' : 'Gym Only'}
                </button>
              ))}
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '14px' }}>
            {availablePlans
              .filter(p => trackFilter === 'All' || (p.equipmentTrack || '').includes(trackFilter.includes('Home') ? 'Home' : 'Gym'))
              .map(plan => {
                const isSelected = selectedProgramId === plan._id;
                return (
                  <div
                    key={plan._id}
                    onClick={() => {
                      setSelectedProgramId(plan._id);
                      if (plan.durationWeeks) setTargetDurationWeeks(plan.durationWeeks);
                    }}
                    style={{
                      border: isSelected ? '2px solid #059669' : '1px solid #e5e7eb',
                      background: isSelected ? '#f0fdf4' : '#fafafa',
                      borderRadius: '12px',
                      padding: '16px',
                      cursor: 'pointer',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '8px',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                        <span style={{ fontSize: '0.7rem', padding: '2px 6px', borderRadius: '4px', background: plan.equipmentTrack?.includes('Gym') ? '#dbeafe' : '#d1fae5', color: plan.equipmentTrack?.includes('Gym') ? '#1e40af' : '#065f46', fontWeight: 700 }}>
                          {plan.equipmentTrack || 'Home Track'}
                        </span>
                        <span style={{ fontSize: '0.7rem', padding: '2px 6px', borderRadius: '4px', background: '#f3f4f6', color: '#374151', fontWeight: 600 }}>
                          {plan.programLevel || plan.difficulty || 'Starter'}
                        </span>
                        {plan.isExtremeProgram && (
                          <span style={{ fontSize: '0.7rem', padding: '2px 6px', borderRadius: '4px', background: '#fee2e2', color: '#991b1b', fontWeight: 700 }}>
                            🔥 Extreme
                          </span>
                        )}
                      </div>
                      <span style={{ fontSize: '0.8rem', color: isSelected ? '#059669' : '#9ca3af', fontWeight: 700 }}>
                        {isSelected ? '✓ Selected' : 'Select'}
                      </span>
                    </div>

                    <h4 style={{ margin: 0, fontSize: '0.98rem', fontWeight: 700, color: '#111827' }}>
                      {plan.title}
                    </h4>

                    <p style={{ margin: 0, fontSize: '0.8rem', color: '#4b5563', lineHeight: 1.4 }}>
                      {(plan.description || '').slice(0, 100)}{plan.description?.length > 100 ? '…' : ''}
                    </p>

                    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', fontSize: '0.72rem', marginTop: 'auto' }}>
                      <span style={{ background: '#fef3c7', color: '#92400e', padding: '2px 6px', borderRadius: '4px', fontWeight: 600 }}>
                        🔥 5-Min Warm-up (#1)
                      </span>
                      {plan.cardioPrescription?.hasWalking && (
                        <span style={{ background: '#e0e7ff', color: '#3730a3', padding: '2px 6px', borderRadius: '4px', fontWeight: 600 }}>
                          🚶 Daily & Sat Walk
                        </span>
                      )}
                      {plan.expectedLossMonth1?.maxKg && (
                        <span style={{ background: '#ecfdf5', color: '#065f46', padding: '2px 6px', borderRadius: '4px', fontWeight: 600 }}>
                          🎯 Mo 1: {plan.expectedLossMonth1.minKg} - {plan.expectedLossMonth1.maxKg} kg
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
          </div>
        </div>

        {/* Goal Inputs Card */}
        <div
          style={{
            backgroundColor: '#fff',
            borderRadius: '14px',
            padding: '24px',
            boxShadow: '0 4px 16px rgba(0,0,0,0.06)',
            marginBottom: '24px'
          }}
        >
          <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#111827', marginBottom: '18px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Calendar size={20} color="#059669" /> Program Parameters
          </h2>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '20px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: 600, color: '#374151', marginBottom: '6px' }}>
                Target Weight (kg)
              </label>
              <input
                type="number"
                step="0.1"
                min="30"
                max="250"
                required
                value={targetWeightKg}
                onChange={(e) => setTargetWeightKg(e.target.value)}
                placeholder="e.g. 75.0"
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  borderRadius: '8px',
                  border: '1px solid #d1d5db',
                  fontSize: '1rem'
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: 600, color: '#374151', marginBottom: '6px' }}>
                Target Duration (Weeks)
              </label>
              <input
                type="number"
                min="2"
                max="52"
                required
                value={targetDurationWeeks}
                onChange={(e) => setTargetDurationWeeks(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  borderRadius: '8px',
                  border: '1px solid #d1d5db',
                  fontSize: '1rem'
                }}
              />
            </div>
          </div>

          {/* Realism & Velocity Feedback (When timeline is faster than safe ceiling) */}
          {evalPlan && !evalPlan.isTimelineRealistic && (
            <div
              style={{
                marginTop: '20px',
                padding: '16px',
                borderRadius: '8px',
                backgroundColor: '#fffbeb',
                border: '1px solid #fef3c7',
                borderLeft: '4px solid #d97706'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                <AlertCircle size={20} color="#d97706" style={{ marginTop: '2px', flexShrink: 0 }} />
                <div>
                  <h4 style={{ margin: 0, color: '#92400e', fontWeight: 700, fontSize: '0.95rem' }}>
                    Timeline Faster than Recommended Safe Cap
                  </h4>
                  <p style={{ margin: '4px 0 12px 0', fontSize: '0.9rem', color: '#78350f', lineHeight: '1.5' }}>
                    Losing {evalPlan.totalDeltaKg} kg in {evalPlan.requestedWeeks} weeks requires ~{evalPlan.requestedRateKgPerWeek} kg/week, which exceeds the clinical safe ceiling of 1% bodyweight/week (~{evalPlan.recommendedPlanningBand?.hardCapWeeklyKg} kg/wk).
                  </p>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                    <button
                      type="button"
                      onClick={() => setTargetDurationWeeks(evalPlan.realisticWeeks)}
                      style={{
                        padding: '8px 14px',
                        backgroundColor: '#d97706',
                        color: '#fff',
                        border: 'none',
                        borderRadius: '6px',
                        fontWeight: 600,
                        fontSize: '0.85rem',
                        cursor: 'pointer'
                      }}
                    >
                      Use Realistic Timeline ({evalPlan.realisticWeeks} weeks by {evalPlan.realisticDate})
                    </button>
                    <button
                      type="button"
                      onClick={() => setTargetWeightKg((Number(evalPlan.currentWeightKg) - Number(evalPlan.maxSafeLossForRequestedTimeframeKg)).toFixed(1))}
                      style={{
                        padding: '8px 14px',
                        backgroundColor: '#fef3c7',
                        color: '#92400e',
                        border: '1px solid #f59e0b',
                        borderRadius: '6px',
                        fontWeight: 600,
                        fontSize: '0.85rem',
                        cursor: 'pointer'
                      }}
                    >
                      Cap Target Loss to {evalPlan.maxSafeLossForRequestedTimeframeKg} kg in {evalPlan.requestedWeeks} wks
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Expected Projection Ranges Card */}
        {projRanges && (
          <div
            style={{
              backgroundColor: '#fff',
              borderRadius: '14px',
              padding: '24px',
              boxShadow: '0 4px 16px rgba(0,0,0,0.06)',
              marginBottom: '24px'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#111827', margin: 0 }}>
                Metabolic Expected Ranges
              </h2>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '4px 10px',
                  borderRadius: '12px',
                  backgroundColor: confidence === 'High' ? '#ecfdf5' : confidence === 'Medium' ? '#fef3c7' : '#f3f4f6',
                  color: confidence === 'High' ? '#065f46' : confidence === 'Medium' ? '#92400e' : '#4b5563',
                  fontSize: '0.85rem',
                  fontWeight: 600
                }}
              >
                Data Confidence: {confidence}
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '16px' }}>
              <div style={{ backgroundColor: '#f9fafb', padding: '16px', borderRadius: '10px', textAlign: 'center' }}>
                <span style={{ fontSize: '0.85rem', color: '#6b7280', fontWeight: 600, display: 'block', marginBottom: '4px' }}>
                  Weekly Expected Range
                </span>
                <span style={{ fontSize: '1.35rem', fontWeight: 800, color: '#111827' }}>
                  {projRanges.weekly.minKg} – {projRanges.weekly.maxKg} kg
                </span>
              </div>

              <div style={{ backgroundColor: '#f9fafb', padding: '16px', borderRadius: '10px', textAlign: 'center' }}>
                <span style={{ fontSize: '0.85rem', color: '#6b7280', fontWeight: 600, display: 'block', marginBottom: '4px' }}>
                  Monthly Expected Range
                </span>
                <span style={{ fontSize: '1.35rem', fontWeight: 800, color: '#111827' }}>
                  {projRanges.monthly.minKg} – {projRanges.monthly.maxKg} kg
                </span>
              </div>

              <div style={{ backgroundColor: '#f9fafb', padding: '16px', borderRadius: '10px', textAlign: 'center' }}>
                <span style={{ fontSize: '0.85rem', color: '#6b7280', fontWeight: 600, display: 'block', marginBottom: '4px' }}>
                  Yearly Expected Range
                </span>
                <span style={{ fontSize: '1.35rem', fontWeight: 800, color: '#111827' }}>
                  {projRanges.yearly.minKg} – {projRanges.yearly.maxKg} kg
                </span>
                <span style={{ fontSize: '0.75rem', color: '#9ca3af', display: 'block', marginTop: '2px' }}>
                  (models metabolic adaptation slowdown)
                </span>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#6b7280', fontSize: '0.85rem' }}>
              <Info size={16} />
              <span>Estimates only, not guarantees. Results depend on consistency, sleep, nutrition and health.</span>
            </div>
          </div>
        )}

        {/* Human-Authored Program Guarantee Banner (Rule R1) */}
        <div
          style={{
            backgroundColor: '#eff6ff',
            borderRadius: '12px',
            padding: '16px',
            border: '1px solid #bfdbfe',
            marginBottom: '28px',
            display: 'flex',
            alignItems: 'center',
            gap: '12px'
          }}
        >
          <CheckCircle2 size={24} color="#2563eb" style={{ flexShrink: 0 }} />
          <div>
            <div style={{ fontWeight: 700, color: '#1e40af', fontSize: '0.95rem' }}>
              Human-Authored Program Architecture
            </div>
            <div style={{ color: '#1e3a8a', fontSize: '0.85rem', marginTop: '2px' }}>
              All exercises and workout plans are curated by certified instructors (Walking + Bodyweight Strength, 3-5 days/week with scheduled rest days). The system selects the best template matching your available equipment.
            </div>
          </div>
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={submitting || !targetWeightKg || !medicalWarningAcknowledged}
          style={{
            width: '100%',
            padding: '16px',
            backgroundColor: !medicalWarningAcknowledged ? '#9ca3af' : '#059669',
            color: '#fff',
            border: 'none',
            borderRadius: '10px',
            fontWeight: 700,
            fontSize: '1.1rem',
            cursor: !medicalWarningAcknowledged ? 'not-allowed' : 'pointer',
            boxShadow: '0 4px 12px rgba(5, 150, 105, 0.25)',
            transition: 'background-color 0.2s ease'
          }}
        >
          {submitting ? 'Enrolling...' : 'Enroll in Weight Loss Program'}
        </button>
      </form>
    </div>
  );
}
