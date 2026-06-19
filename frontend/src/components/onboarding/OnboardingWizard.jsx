import React, { useState } from 'react';
import { X, ChevronRight, ChevronLeft, Target, Briefcase, Activity, Heart, User, Dumbbell, MapPin, Search } from 'lucide-react';
import Body from 'react-muscle-highlighter';
import './OnboardingWizard.css';

const GOALS_DATA = [
  {
    category: "Career & Professional Training",
    icon: <Briefcase size={24} />,
    subs: [
      "Military & Armed Forces Prep",
      "Law Enforcement & Police Academy",
      "Combat Sports Conditioning",
      "Athletic Performance"
    ]
  },
  {
    category: "Body Transformation",
    icon: <Dumbbell size={24} />,
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
    icon: <Activity size={24} />,
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
    icon: <Heart size={24} />,
    subs: [
      "Sedentary to Active",
      "Stress Relief & Mental Wellness",
      "Daily Energy Enhancement",
      "Posture Correction"
    ]
  },
  {
    category: "Medical, Rehab & Special Conditions",
    icon: <Target size={24} />,
    subs: [
      "Post-Injury Rehabilitation",
      "Chronic Pain Management",
      "Diabetes & Blood Sugar Control",
      "Hypertension & Heart Care",
      "Pre & Post-Natal Fitness"
    ]
  },
  {
    category: "Age-Specific Milestones",
    icon: <User size={24} />,
    subs: [
      "Youth & Teenage Growth",
      "Healthy Aging (Seniors)"
    ]
  }
];

const SHAPES_MEN = [
  { id: 'm1', name: 'Ectomorph', desc: 'Skinny, narrow shoulders, fast metabolism' },
  { id: 'm2', name: 'Mesomorph', desc: 'Athletic, naturally lean, broader shoulders' },
  { id: 'm3', name: 'Endomorph', desc: 'Stocky, carries more body fat, wider waist' },
  { id: 'm4', name: 'Skinny Fat', desc: 'Thin limbs but carries weight in the belly' }
];

const SHAPES_WOMEN = [
  { id: 'w1', name: 'Hourglass', desc: 'Balanced top and bottom, defined waist' },
  { id: 'w2', name: 'Pear Shape', desc: 'Narrow shoulders, wider hips and thighs' },
  { id: 'w3', name: 'Apple Shape', desc: 'Weight around midsection and chest, thinner legs' },
  { id: 'w4', name: 'Rectangle', desc: 'Straight silhouette, shoulders/hips same width' }
];

const CONDITIONS = [
  "Asthma / Respiratory issues",
  "High Blood Pressure (Hypertension)",
  "Heart Condition / Cardiovascular issues",
  "Type 1 / Type 2 Diabetes",
  "Vertigo / Frequent Dizziness",
  "None of the above"
];

const JOINTS = ["Neck", "Shoulders", "Lower Back", "Knees", "Ankles"];

const OnboardingWizard = ({ onComplete, onSkip }) => {
  const [step, setStep] = useState(1);
  const totalSteps = 7;

  // Data State
  const [data, setData] = useState({
    mainGoalArea: '',
    goals: [],
    gender: '',
    dob: '',
    units: 'metric',
    height: 170,
    weight: 70,
    targetWeight: 65,
    bodyFatVolume: 30, // 0 to 100 volume slider
    targetMuscles: [],
    injuries: [],
    medicalConditions: [],
    otherConditionText: '',
    activityLevel: '',
    experience: '',
    location: ''
  });

  const [expandedCategory, setExpandedCategory] = useState(null);

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

  const handleConditionToggle = (cond) => {
    if (cond === "None of the above") {
      updateData('medicalConditions', ["None of the above"]);
      updateData('otherConditionText', '');
      return;
    }
    const newConds = data.medicalConditions.filter(c => c !== "None of the above");
    updateData('medicalConditions', newConds.includes(cond) 
      ? newConds.filter(c => c !== cond) 
      : [...newConds, cond]);
  };

  const handleInjuryToggle = (joint) => {
    updateData('injuries', data.injuries.includes(joint)
      ? data.injuries.filter(j => j !== joint)
      : [...data.injuries, joint]);
  };

  const submitOnboarding = () => {
    // Save to localStorage
    const userKey = (localStorage.getItem('gymsync_user_name') || 'Guest User').replace(/\s+/g, '_');
    localStorage.setItem(`gymsync_${userKey}_bio_data`, JSON.stringify(data));
    localStorage.setItem('gymsync_onboarding_completed', 'true');
    localStorage.setItem(`gymsync_${userKey}_bio_filled`, 'true'); // For Profile.jsx compat
    onComplete();
  };

  const renderStepContent = () => {
    switch (step) {
      case 1:
        return (
          <div className="wiz-step">
            <h2>What is your primary fitness path?</h2>
            <p className="wiz-subtitle">Select ONE main area, and choose your specific goals.</p>
            
            {data.mainGoalArea && (
              <div className="goal-summary-banner">
                <Target size={16} color="var(--primary-accent)" />
                <span><strong>Path:</strong> {data.mainGoalArea} ({data.goals.length} goals selected)</span>
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
            <h2>Biological Profile</h2>
            <p className="wiz-subtitle">Help us tailor your physiological baseline.</p>
            
            <label className="wiz-label">Gender</label>
            <div className="gender-cards">
              {['Male', 'Female', 'Prefer not to say'].map(g => (
                <div key={g} className={`gender-card ${data.gender === g ? 'selected' : ''}`} onClick={() => updateData('gender', g)}>
                  {g}
                </div>
              ))}
            </div>

            <label className="wiz-label" style={{ marginTop: '30px' }}>Date of Birth</label>
            <div className="wiz-input-wrapper">
              <input type="date" className="wiz-input" value={data.dob} onChange={(e) => updateData('dob', e.target.value)} />
              <p style={{fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '8px'}}>Tap the calendar icon to easily select your year and month.</p>
            </div>
          </div>
        );

      case 3:
        const wDiff = (data.targetWeight - data.weight).toFixed(1);
        const wUnit = data.units === 'metric' ? 'kg' : 'lbs';
        const dynamicGoalText = wDiff > 0 ? `Gain ${Math.abs(wDiff)} ${wUnit}` : wDiff < 0 ? `Lose ${Math.abs(wDiff)} ${wUnit}` : 'Maintain Weight';

        return (
          <div className="wiz-step">
            <h2>Physical Metrics</h2>
            <div className="unit-switcher">
              <button className={data.units === 'metric' ? 'active' : ''} onClick={() => updateData('units', 'metric')}>Metric (kg/cm)</button>
              <button className={data.units === 'imperial' ? 'active' : ''} onClick={() => updateData('units', 'imperial')}>Imperial (lbs/in)</button>
            </div>
            
            <div className="metrics-grid">
              <div className="metric-box">
                <label>Current Height ({data.units === 'metric' ? 'cm' : 'in'})</label>
                <div className="slider-container">
                  <input type="range" min={data.units==='metric'?100:40} max={data.units==='metric'?220:86} value={data.height} onChange={(e) => updateData('height', e.target.value)} />
                  <span className="slider-val">{data.height}</span>
                </div>
              </div>
              <div className="metric-box">
                <label>Current Weight ({wUnit})</label>
                <div className="slider-container">
                  <input type="range" min={data.units==='metric'?30:60} max={data.units==='metric'?150:330} value={data.weight} onChange={(e) => updateData('weight', e.target.value)} />
                  <span className="slider-val">{data.weight}</span>
                </div>
              </div>
              <div className="metric-box full">
                <label>Target Goal Weight ({wUnit})</label>
                <div className="slider-container">
                  <input type="range" min={data.units==='metric'?30:60} max={data.units==='metric'?150:330} value={data.targetWeight} onChange={(e) => updateData('targetWeight', e.target.value)} />
                  <span className="slider-val highlight">{data.targetWeight}</span>
                </div>
                <div className="dynamic-goal-badge">
                   <Target size={16} /> Strategy: <strong>{dynamicGoalText}</strong>
                </div>
              </div>
            </div>
          </div>
        );

      case 4:
        return (
          <div className="wiz-step">
            <h2>Visual Body Configuration</h2>
            <p className="wiz-subtitle">Use the volume slider to match your current body composition.</p>
            
            <div className="dynamic-body-container">
              <svg viewBox="0 0 100 200" className="body-svg">
                {/* Minimalist Dynamic Silhouette */}
                <circle cx="50" cy="20" r="12" fill="var(--primary-accent)" />
                {/* Shoulders & Chest */}
                <ellipse cx="50" cy="50" rx={18 + (data.bodyFatVolume/20)} ry="10" fill="var(--primary-accent)" />
                {/* Torso & Belly (Widens dynamically with slider) */}
                <path d={`M ${32 - (data.bodyFatVolume/20)} 50 Q ${25 - (data.bodyFatVolume/4)} 100 ${35 - (data.bodyFatVolume/12)} 130 L ${65 + (data.bodyFatVolume/12)} 130 Q ${75 + (data.bodyFatVolume/4)} 100 ${68 + (data.bodyFatVolume/20)} 50 Z`} fill="var(--primary-accent)" />
                {/* Legs */}
                <path d={`M ${35 - (data.bodyFatVolume/12)} 130 L 42 190 L 50 140 L 58 190 L ${65 + (data.bodyFatVolume/12)} 130 Z`} fill="var(--primary-accent)" />
              </svg>
            </div>
            
            <div className="metric-box full" style={{marginTop: '20px'}}>
              <label style={{textAlign: 'center', display: 'block', marginBottom: '15px'}}>Adjust Body Volume</label>
              <div className="slider-container">
                <span style={{fontSize:'0.8rem', color:'var(--text-secondary)'}}>Slim</span>
                <input type="range" min="0" max="100" value={data.bodyFatVolume} onChange={(e) => updateData('bodyFatVolume', parseInt(e.target.value))} />
                <span style={{fontSize:'0.8rem', color:'var(--text-secondary)'}}>Heavy</span>
              </div>
            </div>
          </div>
        );

      case 5:
        const userMuscles = [
          'Head', 'Neck', 'Shoulders', 'Chest', 'Arms', 'Forearms', 'Hands', 
          'Abs', 'Hips', 'Thighs', 'Knees', 'Calves', 'Feet', 
          'Back', 'Lower Back', 'Glutes'
        ];

        // Mapping to react-muscle-highlighter Slugs
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

        // Format data for the Body component
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

        return (
          <div className="wiz-step">
            <h2>Interactive Full Body</h2>
            <p className="wiz-subtitle">Tap any muscle or joint (including hands, knees, and feet) to target it.</p>
            
            <div className="muscle-focus-container" style={{ display: 'flex', flexDirection: 'column', gap: '20px', padding: '20px 0', background: 'transparent', border: 'none' }}>
              
              {/* Full Body Side-by-Side View using react-muscle-highlighter */}
              <div style={{ width: '100%', display: 'flex', justifyContent: 'center', gap: '30px', height: '350px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '5px', textTransform: 'uppercase', letterSpacing: '1px' }}>Front View</span>
                  <Body
                    data={bodyData}
                    side="front"
                    gender={data.gender === 'female' ? 'female' : 'male'}
                    scale={1.2}
                    defaultFill="rgba(255,255,255,0.05)"
                    border="rgba(255,255,255,0.2)"
                    onBodyPartPress={handleModelClick}
                  />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '5px', textTransform: 'uppercase', letterSpacing: '1px' }}>Back View</span>
                  <Body
                    data={bodyData}
                    side="back"
                    gender={data.gender === 'female' ? 'female' : 'male'}
                    scale={1.2}
                    defaultFill="rgba(255,255,255,0.05)"
                    border="rgba(255,255,255,0.2)"
                    onBodyPartPress={handleModelClick}
                  />
                </div>
              </div>

              <div style={{display: 'flex', justifyContent: 'center', marginTop: '15px'}}>
                <button className={`btn btn-sm ${isFullBody ? 'btn-primary' : 'btn-outline'}`} onClick={toggleFullBody} style={{borderRadius: '20px'}}>
                  {isFullBody ? 'Deselect All' : 'Select Full Body'}
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

      case 6:
        return (
          <div className="wiz-step">
            <h2>Medical & Safety Check</h2>
            <p className="wiz-subtitle">Critical for AI Coaching safety algorithms.</p>
            
            <label className="wiz-label">Joint & Muscle Pain</label>
            <div className="joints-grid">
              {JOINTS.map(j => (
                <button key={j} className={`joint-btn ${data.injuries.includes(j) ? 'pain' : ''}`} onClick={() => handleInjuryToggle(j)}>
                  {j}
                </button>
              ))}
            </div>

            <label className="wiz-label" style={{ marginTop: '20px' }}>Medical Conditions</label>
            <div className="conditions-list">
              {CONDITIONS.map(c => (
                <div key={c} className={`condition-item ${data.medicalConditions.includes(c) ? 'selected' : ''}`} onClick={() => handleConditionToggle(c)}>
                  {c}
                </div>
              ))}
              <div className={`condition-item ${data.medicalConditions.includes('Other') ? 'selected' : ''}`} onClick={() => handleConditionToggle('Other')}>
                Other (Please specify)
              </div>
              {data.medicalConditions.includes('Other') && (
                <input 
                  type="text" 
                  className="wiz-input" 
                  placeholder="Type condition here..." 
                  value={data.otherConditionText} 
                  onChange={e => updateData('otherConditionText', e.target.value)} 
                  style={{marginTop: '10px'}}
                />
              )}
            </div>
          </div>
        );

      case 7:
        return (
          <div className="wiz-step">
            <h2>Lifestyle & Discovery</h2>
            
            <label className="wiz-label">Daily Activity Level</label>
            <select className="wiz-select" value={data.activityLevel} onChange={e => updateData('activityLevel', e.target.value)}>
              <option value="" style={{color: 'black'}}>Select Level...</option>
              <option value="sedentary" style={{color: 'black'}}>Sedentary (Desk job, under 4000 steps)</option>
              <option value="light" style={{color: 'black'}}>Lightly Active (Teacher, walking during day)</option>
              <option value="moderate" style={{color: 'black'}}>Moderately Active (Constantly on feet)</option>
              <option value="active" style={{color: 'black'}}>Very Active (Heavy labor, training 2x/day)</option>
            </select>

            <label className="wiz-label" style={{ marginTop: '20px' }}>Fitness Experience</label>
            <select className="wiz-select" value={data.experience} onChange={e => updateData('experience', e.target.value)}>
              <option value="" style={{color: 'black'}}>Select Experience...</option>
              <option value="beginner" style={{color: 'black'}}>Beginner (Never trained consistently)</option>
              <option value="intermediate" style={{color: 'black'}}>Intermediate (Know basics, trained months/years)</option>
              <option value="advanced" style={{color: 'black'}}>Advanced (Train regularly, heavy weights, perfect form)</option>
            </select>

            <label className="wiz-label" style={{ marginTop: '20px' }}>Your Location</label>
            <div className="wiz-input-wrapper">
              <MapPin className="input-icon" size={20} />
              <input type="text" className="wiz-input with-icon" placeholder="e.g. New York, USA" value={data.location} onChange={e => updateData('location', e.target.value)} />
            </div>
          </div>
        );
      
      default: return null;
    }
  };

  return (
    <div className="onboarding-overlay">
      <div className="onboarding-modal">
        <button className="skip-btn" onClick={onSkip}>Skip for now <X size={16} /></button>
        
        <div className="progress-bar-container">
          <div className="progress-bar" style={{ width: `${(step / totalSteps) * 100}%` }}></div>
        </div>
        <div className="step-indicator">Step {step} of {totalSteps}</div>

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
            <button className="btn btn-primary" onClick={submitOnboarding}>Complete Setup</button>
          )}
        </div>
      </div>
    </div>
  );
};

export default OnboardingWizard;
