import React, { useState } from 'react';
import { X, ChevronRight, ChevronLeft, Target, Briefcase, Activity, Heart, User, Dumbbell, Clock, CheckCircle, Sliders } from 'lucide-react';
import Body from 'react-muscle-highlighter';
import './OnboardingWizard.css';

const GOALS_DATA = [
  {
    category: "Career & Professional Training",
    icon: <Briefcase size={22} />,
    subs: [
      "Military & Armed Forces Prep",
      "Law Enforcement & Police Academy",
      "Combat Sports Conditioning",
      "Athletic Performance"
    ]
  },
  {
    category: "Body Transformation",
    icon: <Dumbbell size={22} />,
    subs: [
      "Weight Loss & Fat Burn",
      "Muscle Building (Hypertrophy)",
      "Healthy Weight Gain (Bulking)",
      "Lean & Shredded Definition",
      "Body Recomposition"
    ]
  },
  {
    category: "General Fitness & Physical Capability",
    icon: <Activity size={22} />,
    subs: [
      "Stamina & Endurance Boost",
      "Raw Strength & Power",
      "Flexibility & Mobility",
      "Agility & Reflexes",
      "Cardiovascular Health"
    ]
  },
  {
    category: "Lifestyle & Wellness",
    icon: <Heart size={22} />,
    subs: [
      "Sedentary to Active",
      "Stress Relief & Mental Wellness",
      "Daily Energy Enhancement",
      "Posture Correction"
    ]
  },
  {
    category: "Age-Specific Milestones",
    icon: <User size={22} />,
    subs: [
      "Youth & Teenage Growth",
      "Healthy Aging (Seniors)"
    ]
  }
];

const PLAN_DURATIONS = [
  { id: '1 Month', label: '1 Month', sub: '30 Days Quick Start' },
  { id: '3 Months', label: '3 Months', sub: '90 Days (Recommended)', recommended: true },
  { id: '6 Months', label: '6 Months', sub: '180 Days Overload' },
  { id: '1 Year', label: '1 Year', sub: '12 Months Full Transformation' }
];

const OnboardingWizard = ({ onComplete, onSkip }) => {
  const [step, setStep] = useState(1);
  const totalSteps = 6;

  // Form Data State
  const [data, setData] = useState({
    mainGoalArea: '',
    goals: [],
    planDuration: '1 Month',
    trainingDaysPerWeek: 3,
    equipmentAccess: 'Full Gym',
    pushupBaseline: 10,
    gender: '',
    dob: '',
    units: 'metric',
    height: 170,
    weight: 70,
    targetMuscles: []
  });

  const [expandedCategory, setExpandedCategory] = useState(0);

  const updateData = (key, val) => setData(prev => ({ ...prev, [key]: val }));

  const nextStep = () => { if (step < totalSteps) setStep(step + 1); };
  const prevStep = () => { if (step > 1) setStep(step - 1); };

  const handleGoalToggle = (goal, categoryName) => {
    if (data.mainGoalArea !== categoryName) {
      updateData('mainGoalArea', categoryName);
      updateData('goals', [goal]);
    } else {
      updateData('goals', data.goals.includes(goal) 
        ? data.goals.filter(g => g !== goal) 
        : [...data.goals, goal]);
    }
  };

  const handleMuscleToggle = (muscle) => {
    updateData('targetMuscles', data.targetMuscles.includes(muscle)
      ? data.targetMuscles.filter(m => m !== muscle)
      : [...data.targetMuscles, muscle]);
  };

  const submitOnboarding = () => {
    // Save to localStorage
    const userKey = (localStorage.getItem('gymsync_user_name') || 'Guest User').replace(/\s+/g, '_');
    localStorage.setItem(`gymsync_${userKey}_bio_data`, JSON.stringify(data));
    localStorage.setItem(`gymsync_${userKey}_bio`, JSON.stringify(data));
    localStorage.setItem('gymsync_onboarding_completed', 'true');
    localStorage.setItem(`gymsync_${userKey}_bio_filled`, 'true');
    localStorage.setItem('gymsync_bio_filled', 'true');

    // Dispatch global event so open pages (Profile, AITrainer, etc.) update dynamically
    window.dispatchEvent(new Event('gymsync_bio_updated'));

    onComplete();
  };

  const userMuscles = [
    'Head', 'Neck', 'Shoulders', 'Chest', 'Arms', 'Forearms', 'Hands', 
    'Abs', 'Hips', 'Thighs', 'Knees', 'Calves', 'Feet', 
    'Back', 'Lower Back', 'Glutes'
  ];

  const muscleMapping = {
    'Head': ['head'], 'Neck': ['neck'], 'Shoulders': ['deltoids'],
    'Chest': ['chest'], 'Arms': ['biceps', 'triceps'], 'Forearms': ['forearm'], 'Hands': ['hands'],
    'Abs': ['abs', 'obliques'], 'Hips': ['adductors'], 'Thighs': ['quadriceps', 'hamstring'],
    'Knees': ['knees'], 'Calves': ['calves', 'tibialis'], 'Feet': ['feet'],
    'Back': ['upper-back', 'trapezius'], 'Lower Back': ['lower-back'], 'Glutes': ['gluteal']
  };

  const activeHighlighterMuscles = [];
  data.targetMuscles.forEach(m => {
    if (muscleMapping[m]) {
       activeHighlighterMuscles.push(...muscleMapping[m]);
    }
  });

  const bodyData = activeHighlighterMuscles.map(slug => ({
    slug: slug,
    color: '#10b981'
  }));

  const isFullBody = data.targetMuscles.length === userMuscles.length;
  const toggleFullBody = () => updateData('targetMuscles', isFullBody ? [] : [...userMuscles]);

  const handleModelClick = (part) => {
    let foundUserMuscle = null;
    Object.entries(muscleMapping).forEach(([key, values]) => {
       if (values.includes(part.slug)) foundUserMuscle = key;
    });
    if (foundUserMuscle) handleMuscleToggle(foundUserMuscle);
  };

  const renderStepContent = () => {
    switch (step) {
      case 1:
        return (
          <div className="wiz-step">
            <h2>Primary Fitness Path</h2>
            <p className="wiz-subtitle">Select ONE primary training path and your specific goals.</p>
            
            {data.mainGoalArea && (
              <div className="goal-summary-banner" style={{ marginBottom: '15px' }}>
                <Target size={16} color="var(--primary-accent)" />
                <span><strong>Selected Path:</strong> {data.mainGoalArea} ({data.goals.length} goals selected)</span>
              </div>
            )}

            <div className="goals-container">
              {GOALS_DATA.map((cat, idx) => (
                <div key={idx} className={`goal-category ${data.mainGoalArea === cat.category ? 'active-area' : ''} ${expandedCategory === idx ? 'expanded' : ''}`}>
                  <div className="goal-cat-header" onClick={() => setExpandedCategory(expandedCategory === idx ? null : idx)}>
                    <div className="cat-title">
                      <div className="cat-icon">{cat.icon}</div>
                      <span>{cat.category}</span>
                    </div>
                    <ChevronRight className="expand-icon" />
                  </div>
                  {expandedCategory === idx && (
                    <div className="goal-subs">
                      {cat.subs.map(sub => (
                        <div key={sub} className={`sub-pill ${data.goals.includes(sub) ? 'selected' : ''}`} onClick={() => handleGoalToggle(sub, cat.category)}>
                          {sub}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        );

      case 2:
        return (
          <div className="wiz-step">
            <h2>Exercise Plan Duration</h2>
            <p className="wiz-subtitle">How long of a customized workout plan do you require?</p>

            <div className="duration-grid" style={{ marginTop: '20px' }}>
              {PLAN_DURATIONS.map(dur => (
                <div 
                  key={dur.id} 
                  className={`duration-card ${data.planDuration === dur.id ? 'selected' : ''}`}
                  onClick={() => updateData('planDuration', dur.id)}
                  style={{ padding: '24px 16px' }}
                >
                  <Clock size={28} color={data.planDuration === dur.id ? 'var(--primary-accent)' : 'var(--text-secondary)'} style={{ marginBottom: '8px' }} />
                  <span style={{ fontWeight: 'bold', fontSize: '1.1rem' }}>{dur.label}</span>
                  <span style={{ fontSize: '0.8rem', opacity: 0.85, marginTop: '4px' }}>{dur.sub}</span>
                  {dur.recommended && (
                    <span className="category-badge" style={{ background: 'rgba(16, 185, 129, 0.2)', color: '#10b981', fontSize: '0.75rem', marginTop: '8px', padding: '3px 10px', borderRadius: '12px' }}>
                      ⭐ Best Value
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        );

      case 3:
        return (
          <div className="wiz-step">
            <h2>Smart Intake & Stamina Calibration</h2>
            <p className="wiz-subtitle">Calibrate your weekly frequency, equipment, and stamina baseline for AI exercise generation.</p>
            
            <div className="wiz-section" style={{ background: 'var(--card-bg)', marginTop: '20px' }}>
              <label className="wiz-label">Weekly Training Frequency</label>
              <select 
                className="wiz-select" 
                value={data.trainingDaysPerWeek} 
                onChange={e => updateData('trainingDaysPerWeek', parseInt(e.target.value))}
                style={{ marginBottom: '20px' }}
              >
                <option value={2}>2 Days / Week</option>
                <option value={3}>3 Days / Week (Recommended)</option>
                <option value={4}>4 Days / Week</option>
                <option value={5}>5 Days / Week</option>
                <option value={6}>6 Days / Week</option>
              </select>

              <label className="wiz-label">Available Equipment</label>
              <select 
                className="wiz-select" 
                value={data.equipmentAccess} 
                onChange={e => updateData('equipmentAccess', e.target.value)}
                style={{ marginBottom: '20px' }}
              >
                <option value="Full Gym">Full Gym Setup</option>
                <option value="Dumbbells">Dumbbells & Bench</option>
                <option value="Resistance Bands">Resistance Bands</option>
                <option value="Bodyweight only">Bodyweight only (No Equipment)</option>
              </select>

              <label className="wiz-label">Anchor Push-up Baseline ({data.pushupBaseline} Reps)</label>
              <div className="slider-container">
                <input 
                  type="range" 
                  min="3" 
                  max="30" 
                  value={data.pushupBaseline} 
                  onChange={e => updateData('pushupBaseline', parseInt(e.target.value))} 
                />
                <span className="slider-val highlight">{data.pushupBaseline} Reps</span>
              </div>
            </div>
          </div>
        );

      case 4:
        return (
          <div className="wiz-step">
            <h2>Biological Profile</h2>
            <p className="wiz-subtitle">Help us tailor your physiological baseline.</p>
            
            <label className="wiz-label">Gender</label>
            <div className="gender-cards" style={{ marginBottom: '30px' }}>
              {['Male', 'Female', 'Prefer not to say'].map(g => (
                <div key={g} className={`gender-card ${data.gender === g ? 'selected' : ''}`} onClick={() => updateData('gender', g)}>
                  {g}
                </div>
              ))}
            </div>

            <label className="wiz-label">Date of Birth</label>
            <div className="wiz-input-wrapper">
              <input type="date" className="wiz-input" value={data.dob} onChange={(e) => updateData('dob', e.target.value)} />
              <p style={{fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '8px'}}>Select your year and month from the calendar picker.</p>
            </div>
          </div>
        );

      case 5:
        return (
          <div className="wiz-step">
            <h2>Physical Metrics</h2>
            <p className="wiz-subtitle">Enter your height and current body weight.</p>

            <div className="unit-switcher" style={{ marginBottom: '24px' }}>
              <button className={data.units === 'metric' ? 'active' : ''} onClick={() => updateData('units', 'metric')}>Metric (kg/cm)</button>
              <button className={data.units === 'imperial' ? 'active' : ''} onClick={() => updateData('units', 'imperial')}>Imperial (lbs/in)</button>
            </div>
            
            <div className="metrics-grid">
              <div className="metric-box">
                <label>Current Height ({data.units === 'metric' ? 'cm' : 'in'})</label>
                <div className="slider-container">
                  <input type="range" min={data.units==='metric'?100:40} max={data.units==='metric'?220:86} value={data.height} onChange={(e) => updateData('height', parseInt(e.target.value))} />
                  <span className="slider-val">{data.height}</span>
                </div>
              </div>

              <div className="metric-box">
                <label>Current Weight ({data.units === 'metric' ? 'kg' : 'lbs'})</label>
                <div className="slider-container">
                  <input type="range" min={data.units==='metric'?30:60} max={data.units==='metric'?150:330} value={data.weight} onChange={(e) => updateData('weight', parseInt(e.target.value))} />
                  <span className="slider-val">{data.weight}</span>
                </div>
              </div>
            </div>
          </div>
        );

      case 6:
        return (
          <div className="wiz-step">
            <h2>Target Muscle Focus</h2>
            <p className="wiz-subtitle">Tap any muscle group on the model or use the quick buttons below.</p>

            <div className="muscle-focus-container" style={{ display: 'flex', flexDirection: 'column', gap: '15px', padding: '10px 0', background: 'transparent', border: 'none' }}>
              <div style={{ width: '100%', display: 'flex', justifyContent: 'center', gap: '20px', height: '320px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '1px' }}>Front View</span>
                  <Body
                    data={bodyData}
                    side="front"
                    gender={data.gender === 'Female' ? 'female' : 'male'}
                    scale={1.1}
                    defaultFill="rgba(255,255,255,0.05)"
                    border="rgba(255,255,255,0.2)"
                    onBodyPartPress={handleModelClick}
                  />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '1px' }}>Back View</span>
                  <Body
                    data={bodyData}
                    side="back"
                    gender={data.gender === 'Female' ? 'female' : 'male'}
                    scale={1.1}
                    defaultFill="rgba(255,255,255,0.05)"
                    border="rgba(255,255,255,0.2)"
                    onBodyPartPress={handleModelClick}
                  />
                </div>
              </div>

              <div style={{display: 'flex', justifyContent: 'center', marginTop: '10px'}}>
                <button className={`btn btn-sm ${isFullBody ? 'btn-primary' : 'btn-outline'}`} onClick={toggleFullBody} style={{borderRadius: '20px'}}>
                  {isFullBody ? 'Deselect All' : 'Select Full Body Focus'}
                </button>
              </div>

              <div className="muscle-btn-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(90px, 1fr))', gap: '8px', width: '100%', marginTop: '10px' }}>
                {userMuscles.map(m => (
                  <button
                    key={m}
                    onClick={() => handleMuscleToggle(m)}
                    className={`btn btn-sm ${data.targetMuscles.includes(m) ? 'btn-primary' : 'btn-outline'}`}
                    style={{ padding: '6px 2px', fontSize: '0.75rem', borderRadius: '8px' }}
                  >
                    {m}
                  </button>
                ))}
              </div>
            </div>
          </div>
        );

      default: return null;
    }
  };

  return (
    <div className="onboarding-overlay">
      <div className="onboarding-modal" style={{ maxWidth: '640px' }}>
        <button className="skip-btn" onClick={onSkip}>Skip for now <X size={16} /></button>
        
        <div className="progress-bar-container">
          <div className="progress-bar" style={{ width: `${(step / totalSteps) * 100}%` }}></div>
        </div>
        <div className="step-indicator">Step {step} of {totalSteps} • Health & Fitness Bio</div>

        <div className="onboarding-content">
          {renderStepContent()}
        </div>

        <div className="onboarding-footer">
          {step > 1 ? (
            <button className="btn btn-outline" onClick={prevStep}><ChevronLeft size={20} /> Back</button>
          ) : <div></div>}
          
          {step < totalSteps ? (
            <button className="btn btn-primary" onClick={nextStep}>Next <ChevronRight size={20} /></button>
          ) : (
            <button className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '6px' }} onClick={submitOnboarding}>
              <CheckCircle size={18} /> Save & Complete Bio
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default OnboardingWizard;
