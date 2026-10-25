import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import './MiniCoachModal.css';

const MissingBioMiniForm = ({ fields, formData, onChange }) => {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      {fields.includes('height') && (
        <div>
          <label className="wiz-label">Height (cm)</label>
          <input type="number" className="wiz-input" value={formData.height || ''} onChange={e => onChange('height', Number(e.target.value))} />
        </div>
      )}
      {fields.includes('weight') && (
        <div>
          <label className="wiz-label">Weight (kg)</label>
          <input type="number" className="wiz-input" value={formData.weight || ''} onChange={e => onChange('weight', Number(e.target.value))} />
        </div>
      )}
      {fields.includes('gender') && (
        <div>
          <label className="wiz-label">Gender</label>
          <select className="wiz-input" value={formData.gender || ''} onChange={e => onChange('gender', e.target.value)}>
            <option value="">Select...</option>
            <option value="Male">Male</option>
            <option value="Female">Female</option>
            <option value="Other">Other</option>
          </select>
        </div>
      )}
      {fields.includes('foodPreferences') && (
        <div>
          <label className="wiz-label">Food Preferences / Restrictions</label>
          <input type="text" className="wiz-input" placeholder="e.g. Halal, Vegan, No chicken" value={formData.foodPreferences || ''} onChange={e => onChange('foodPreferences', e.target.value)} />
        </div>
      )}
    </div>
  );
};

export const MiniCoachModal = ({ steps, onClose, onSubmitAll }) => {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [answers, setAnswers] = useState({});

  useEffect(() => {
    const draft = localStorage.getItem('gymsync_minicoach_draft');
    if (draft) {
      try {
        setAnswers(JSON.parse(draft));
      } catch(e) {}
    }
  }, []);

  const saveDraft = (newAnswers) => {
    setAnswers(newAnswers);
    localStorage.setItem('gymsync_minicoach_draft', JSON.stringify(newAnswers));
  };

  if (!steps || steps.length === 0) return null;

  const step = steps[currentStepIndex];
  const isLast = currentStepIndex === steps.length - 1;

  const handleStepAnswer = (key, val) => {
    const updated = { ...answers, [key]: val };
    saveDraft(updated);
  };

  const handleNext = () => {
    if (isLast) {
      localStorage.removeItem('gymsync_minicoach_draft');
      onSubmitAll(answers);
    } else {
      setCurrentStepIndex(currentStepIndex + 1);
    }
  };

  const handleBack = () => {
    if (currentStepIndex > 0) {
      setCurrentStepIndex(currentStepIndex - 1);
    }
  };

  return (
    <div className="mini-coach-overlay">
      <div className="mini-coach-window">
        <div className="mini-coach-header">
          <span>BUILD YOUR WORKOUT</span>
          <button onClick={onClose}><X size={18} /></button>
        </div>
        <div className="mini-coach-progress">STEP {currentStepIndex + 1} / {steps.length}</div>
        <h3>{step.label}</h3>
        
        {step.kind === 'single_select' && (
          <div className="mini-coach-options">
            {step.options.map(opt => {
              const isSelected = answers[step.key] === opt || (answers[step.key] === undefined && step.isPrefilled && step.prefillValue === opt);
              return (
                <button
                  key={opt}
                  className={`mini-coach-pill ${isSelected ? 'selected' : ''}`}
                  onClick={() => handleStepAnswer(step.key, opt)}
                >
                  {opt}{step.isPrefilled && step.prefillValue === opt ? ' ✅' : ''}
                </button>
              );
            })}
          </div>
        )}
        
        {step.kind === 'form' && (
          <MissingBioMiniForm 
            fields={step.fields} 
            formData={answers} 
            onChange={(k, v) => handleStepAnswer(k, v)} 
          />
        )}
        
        <div className="mini-coach-nav">
          {currentStepIndex > 0 ? (
            <button onClick={handleBack}>Back</button>
          ) : <div></div>}
          <button className="btn-primary" onClick={handleNext}>
            {isLast ? 'Generate Plan' : 'Next'}
          </button>
        </div>
      </div>
    </div>
  );
};
