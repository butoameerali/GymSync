import React from 'react';
import { AlertTriangle } from 'lucide-react';
import './MergeOfferCard.css';

export const MergeOfferCard = ({ existingPlanTitle, existingGoal, newGoal, onDecision }) => {
  return (
    <div className="merge-offer-overlay">
      <div className="merge-offer-window">
        <div className="merge-offer-header">
          <AlertTriangle size={18} />
          <span>EXISTING PLAN DETECTED</span>
        </div>
        
        <h3>How would you like to handle your goals?</h3>
        
        <p className="merge-offer-text">
          You already have an active plan for <strong>{existingGoal}</strong>, but you just requested a plan for <strong>{newGoal}</strong>. 
          To prevent overtraining and impossible calorie targets, we can combine these goals into a single balanced weekly schedule.
        </p>

        <div className="merge-offer-goals">
          <p><strong>Current Active Plan:</strong> {existingPlanTitle} ({existingGoal})</p>
          <p><strong>New Request:</strong> {newGoal}</p>
        </div>

        <div className="merge-offer-buttons">
          <button 
            className="merge-offer-btn merge-btn-primary" 
            onClick={() => onDecision('Merge Plans')}
          >
            Merge Plans (Shared Weekly Load)
          </button>
          
          <button 
            className="merge-offer-btn merge-btn-secondary" 
            onClick={() => onDecision('Keep Separate')}
          >
            Keep Separate (Still linked for safety limits)
          </button>
          
          <button 
            className="merge-offer-btn merge-btn-danger" 
            onClick={() => onDecision('Cancel Old Plan')}
          >
            Cancel Old Plan (Focus only on new goal)
          </button>
        </div>
      </div>
    </div>
  );
};
