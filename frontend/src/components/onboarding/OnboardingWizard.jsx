import React, { useState, useEffect } from 'react';
import { X, ChevronRight, ChevronLeft, Target, Briefcase, Activity, Heart, User, Dumbbell, Clock, CheckCircle, Sliders, Shield, AlertTriangle } from 'lucide-react';
import { HealthChipSection } from "./OnboardingHelpers";
import Body from 'react-muscle-highlighter';
import './OnboardingWizard.css';

const JOINT_PAIN_OPTIONS = ['Knee', 'Lower Back', 'Shoulder', 'Wrist', 'Ankle', 'Neck', 'Hip', 'None'];
const INJURY_OPTIONS = ['Rotator Cuff', 'Herniated Disc', 'ACL/Meniscus', 'Tennis Elbow', 'Hamstring Tear', 'None'];
const CONDITION_OPTIONS = ['Asthma', 'High Blood Pressure', 'Diabetes', 'Heart Condition', 'Arthritis', 'None'];
const LIMITATION_OPTIONS = ['No Heavy Overhead Press', 'No Deep Squats', 'No High Impact', 'No Spinal Loading', 'None'];
const DIETARY_OPTIONS = ['Halal only', 'Vegetarian', 'Vegan', 'High Protein', 'Lactose Intolerant', 'Gluten Free', 'No Beef', 'No Seafood', 'No Restrictions'];

const OnboardingWizard = ({ onComplete, onSkip }) => {
  const [step, setStep] = useState(1);
  const totalSteps = 5;

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
    targetMuscles: [],
    jointPain: [],
    injuries: [],
    medicalConditions: [],
    limitations: [],
    foodPreferences: ''
  });

  useEffect(() => {
    const userKey = (localStorage.getItem('gymsync_user_name') || 'Guest User').replace(/\s+/g, '_');
    const localBioStr = localStorage.getItem(`gymsync_${userKey}_bio_data`) || localStorage.getItem(`gymsync_${userKey}_bio`);
    if (localBioStr) {
      try {
        const parsed = JSON.parse(localBioStr);
        if (parsed && typeof parsed === 'object') {
          setData(prev => ({
            ...prev,
            ...parsed,
            jointPain: Array.isArray(parsed.jointPain) ? parsed.jointPain : (prev.jointPain || []),
            injuries: Array.isArray(parsed.injuries) ? parsed.injuries : (prev.injuries || []),
            medicalConditions: Array.isArray(parsed.medicalConditions) ? parsed.medicalConditions : (prev.medicalConditions || []),
            limitations: Array.isArray(parsed.limitations) ? parsed.limitations : (prev.limitations || []),
            foodPreferences: typeof parsed.foodPreferences === 'string' ? parsed.foodPreferences : (Array.isArray(parsed.foodPreferences) ? parsed.foodPreferences.join(', ') : '')
          }));
        }
      } catch (e) {
        console.warn('Failed parsing local bio:', e);
      }
    }
  }, []);

  const updateData = (key, val) => setData(prev => ({ ...prev, [key]: val }));

  const nextStep = () => { if (step < totalSteps) setStep(step + 1); };
  const prevStep = () => { if (step > 1) setStep(step - 1); };

  const toggleArrayItem = (field, item) => {
    setData(prev => {
      const current = Array.isArray(prev[field]) ? prev[field] : [];
      if (item === 'None') {
        return { ...prev, [field]: current.includes('None') ? [] : ['None'] };
      }
      const filtered = current.filter(x => x !== 'None');
      const updated = filtered.includes(item)
        ? filtered.filter(x => x !== item)
        : [...filtered, item];
      return { ...prev, [field]: updated };
    });
  };

  const toggleFoodPreference = (pref) => {
    setData(prev => {
      const current = (prev.foodPreferences || '').split(',').map(s => s.trim()).filter(Boolean);
      if (pref === 'No Restrictions') {
        return { ...prev, foodPreferences: current.includes('No Restrictions') ? '' : 'No Restrictions' };
      }
      const filtered = current.filter(x => x !== 'No Restrictions');
      const updated = filtered.includes(pref)
        ? filtered.filter(x => x !== pref)
        : [...filtered, pref];
      return { ...prev, foodPreferences: updated.join(', ') };
    });
  };

  const addCustomItem = (field, item) => {
    const val = item.trim();
    if (!val) return;
    setData(prev => {
      const current = Array.isArray(prev[field]) ? prev[field] : [];
      const filtered = current.filter(x => x !== 'None');
      if (filtered.some(x => x.toLowerCase() === val.toLowerCase())) return prev;
      return { ...prev, [field]: [...filtered, val] };
    });
  };

  const addCustomFoodPreference = (pref) => {
    const val = pref.trim();
    if (!val) return;
    setData(prev => {
      const current = (prev.foodPreferences || '').split(',').map(s => s.trim()).filter(Boolean);
      const filtered = current.filter(x => x !== 'No Restrictions');
      if (filtered.some(x => x.toLowerCase() === val.toLowerCase())) return prev;
      return { ...prev, foodPreferences: [...filtered, val].join(', ') };
    });
  };

  const handleMuscleToggle = (muscle) => {
    updateData('targetMuscles', data.targetMuscles.includes(muscle)
      ? data.targetMuscles.filter(m => m !== muscle)
      : [...data.targetMuscles, muscle]);
  };

  const submitOnboarding = async () => {
    // Save to localStorage
    const userKey = (localStorage.getItem('gymsync_user_name') || 'Guest User').replace(/\s+/g, '_');
    localStorage.setItem(`gymsync_${userKey}_bio_data`, JSON.stringify(data));
    localStorage.setItem(`gymsync_${userKey}_bio`, JSON.stringify(data));
    localStorage.setItem('gymsync_onboarding_completed', 'true');
    localStorage.setItem(`gymsync_${userKey}_bio_filled`, 'true');
    localStorage.setItem('gymsync_bio_filled', 'true');

    // Server-side multi-device persistence
    const token = localStorage.getItem('gymsync_token');
    if (token) {
      try {
        await fetch('/api/users/bio', {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify(data)
        });
      } catch (err) {
        console.warn('Could not sync bio to server:', err);
      }
    }

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
  (data.targetMuscles || []).forEach(m => {
    if (muscleMapping[m]) {
       activeHighlighterMuscles.push(...muscleMapping[m]);
    }
  });

  const bodyData = activeHighlighterMuscles.map(slug => ({
    slug: slug,
    color: '#10b981'
  }));

  const isFullBody = (data.targetMuscles || []).length === userMuscles.length;
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

      case 2:
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

      case 3:
        return (
          <div className="wiz-step">
            <h2>Physical Metrics</h2>
            <p className="wiz-subtitle">Enter your height and current body weight.</p>

            <div className="unit-switcher" style={{ marginBottom: '24px' }}>
              <button 
                type="button"
                className={data.units === 'metric' ? 'active' : ''} 
                onClick={() => {
                  if (data.units === 'imperial') {
                    const newH = Math.min(220, Math.max(100, Math.round(data.height * 2.54)));
                    const newW = Math.min(150, Math.max(30, Math.round(data.weight / 2.20462)));
                    setData(prev => ({ ...prev, units: 'metric', height: newH, weight: newW }));
                  }
                }}
              >
                Metric (kg/cm)
              </button>
              <button 
                type="button"
                className={data.units === 'imperial' ? 'active' : ''} 
                onClick={() => {
                  if (data.units === 'metric') {
                    const newH = Math.min(86, Math.max(40, Math.round(data.height / 2.54)));
                    const newW = Math.min(330, Math.max(60, Math.round(data.weight * 2.20462)));
                    setData(prev => ({ ...prev, units: 'imperial', height: newH, weight: newW }));
                  }
                }}
              >
                Imperial (lbs/in)
              </button>
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

      case 4: {
        const currentDietList = (data.foodPreferences || '').split(',').map(s => s.trim()).filter(Boolean);
        return (
          <div className="wiz-step">
            <h2>Health, Medical & Dietary Bio</h2>
            <p className="wiz-subtitle">This helps ensure your AI exercises and nutritional guidance remain medically safe.</p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <HealthChipSection
                label="Joint Pain or Discomfort Areas"
                options={JOINT_PAIN_OPTIONS}
                selected={data.jointPain || []}
                onToggle={area => toggleArrayItem('jointPain', area)}
                onAddCustom={custom => addCustomItem('jointPain', custom)}
                customPlaceholder="+ Add custom joint area (e.g. Elbow, Hip flexor)"
              />

              <HealthChipSection
                label="Past Injuries"
                options={INJURY_OPTIONS}
                selected={data.injuries || []}
                onToggle={inj => toggleArrayItem('injuries', inj)}
                onAddCustom={custom => addCustomItem('injuries', custom)}
                customPlaceholder="+ Add custom past injury (e.g. Meniscus repair)"
              />

              <HealthChipSection
                label="Medical Conditions"
                options={CONDITION_OPTIONS}
                selected={data.medicalConditions || []}
                onToggle={cond => toggleArrayItem('medicalConditions', cond)}
                onAddCustom={custom => addCustomItem('medicalConditions', custom)}
                customPlaceholder="+ Add custom medical condition (e.g. Mild scoliosis)"
              />

              <HealthChipSection
                label="Physical Limitations"
                options={LIMITATION_OPTIONS}
                selected={data.limitations || []}
                onToggle={lim => toggleArrayItem('limitations', lim)}
                onAddCustom={custom => addCustomItem('limitations', custom)}
                customPlaceholder="+ Add custom limitation (e.g. No jumping, No heavy deadlifts)"
              />

              <HealthChipSection
                label="Dietary Preferences & Restrictions"
                options={DIETARY_OPTIONS}
                selected={currentDietList}
                onToggle={diet => toggleFoodPreference(diet)}
                onAddCustom={custom => addCustomFoodPreference(custom)}
                customPlaceholder="+ Add custom dietary preference or allergy (e.g. Nut allergy)"
              />
            </div>
          </div>
        );
      }

      case 5:
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
                <button type="button" className={`btn btn-sm ${isFullBody ? 'btn-primary' : 'btn-outline'}`} onClick={toggleFullBody} style={{borderRadius: '20px'}}>
                  {isFullBody ? 'Deselect All' : 'Select Full Body Focus'}
                </button>
              </div>

              <div className="muscle-btn-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(90px, 1fr))', gap: '8px', width: '100%', marginTop: '10px' }}>
                {userMuscles.map(m => (
                  <button
                    type="button"
                    key={m}
                    onClick={() => handleMuscleToggle(m)}
                    className={`btn btn-sm ${(data.targetMuscles || []).includes(m) ? 'btn-primary' : 'btn-outline'}`}
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
        <button type="button" className="skip-btn" onClick={onSkip}>Skip for now <X size={16} /></button>
        
        <div className="progress-bar-container">
          <div className="progress-bar" style={{ width: `${(step / totalSteps) * 100}%` }}></div>
        </div>
        <div className="step-indicator">Step {step} of {totalSteps} • Health & Fitness Bio</div>

        <div className="onboarding-content">
          {renderStepContent()}
        </div>

        <div className="onboarding-footer">
          {step > 1 ? (
            <button type="button" className="btn btn-outline" onClick={prevStep}><ChevronLeft size={20} /> Back</button>
          ) : <div></div>}
          
          {step < totalSteps ? (
            <button type="button" className="btn btn-primary" onClick={nextStep}>Next <ChevronRight size={20} /></button>
          ) : (
            <button type="button" className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '6px' }} onClick={submitOnboarding}>
              <CheckCircle size={18} /> Save & Complete Bio
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default OnboardingWizard;
