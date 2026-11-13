import React from 'react';
import { AlertTriangle, ShieldCheck, HeartPulse } from 'lucide-react';

export const MEDICAL_WARNING_TEXT =
  "Do NOT start this program without your doctor's approval if you have: heart disease, high/low blood pressure, diabetes, asthma or breathing problems, joint/back/knee injury or recent surgery, pregnancy or breastfeeding, an eating disorder history, or you take regular medication. Stop immediately and seek medical care if you feel chest pain, dizziness, fainting or unusual breathlessness.";

export const MEDICAL_WARNING_VERSION = 'v1.0';

/**
 * Medical Safety Warning Card & Modal
 * Enforces Rule R5: Shows clear medical safety advisories and records explicit acknowledgment
 * without ever collecting, asking for, or storing private medical history.
 */
export function WeightLossMedicalWarningCard({
  acknowledged,
  onToggleAcknowledge,
  isSenior = false,
  seniorAcknowledged = false,
  onToggleSeniorAcknowledge,
  isPinned = false
}) {
  return (
    <div
      style={{
        border: '2px solid #ef4444',
        backgroundColor: 'rgba(239, 68, 68, 0.08)',
        borderRadius: '12px',
        padding: '20px',
        marginBottom: '24px',
        boxShadow: '0 4px 16px rgba(239, 68, 68, 0.12)'
      }}
      className="weight-loss-medical-warning-card"
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '14px' }}>
        <div
          style={{
            backgroundColor: '#ef4444',
            color: '#fff',
            borderRadius: '50%',
            width: '36px',
            height: '36px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0
          }}
        >
          <AlertTriangle size={20} />
        </div>
        <div>
          <h3 style={{ margin: 0, color: '#dc2626', fontSize: '1.15rem', fontWeight: 700 }}>
            {isPinned ? '📌 Medical Safety Warning (Pinned)' : 'Mandatory Medical Safety Advisory'}
          </h3>
          <p style={{ margin: '2px 0 0 0', fontSize: '0.85rem', color: '#6b7280' }}>
            Version {MEDICAL_WARNING_VERSION} • Certified Health & Exercise Physiology Standard
          </p>
        </div>
      </div>

      <div
        style={{
          backgroundColor: 'rgba(255, 255, 255, 0.85)',
          borderRadius: '8px',
          padding: '16px',
          fontSize: '0.95rem',
          lineHeight: '1.6',
          color: '#1f2937',
          borderLeft: '4px solid #ef4444',
          marginBottom: '16px'
        }}
      >
        <p style={{ margin: 0, fontWeight: 500 }}>
          {MEDICAL_WARNING_TEXT}
        </p>
      </div>

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          padding: '12px',
          backgroundColor: '#fff',
          borderRadius: '8px',
          border: '1px solid #e5e7eb',
          marginBottom: isSenior ? '12px' : '0'
        }}
      >
        <input
          type="checkbox"
          id="med-warning-ack"
          checked={acknowledged}
          onChange={(e) => onToggleAcknowledge && onToggleAcknowledge(e.target.checked)}
          style={{ width: '18px', height: '18px', accentColor: '#10b981', cursor: 'pointer' }}
          disabled={!onToggleAcknowledge}
        />
        <label
          htmlFor="med-warning-ack"
          style={{
            cursor: onToggleAcknowledge ? 'pointer' : 'default',
            fontWeight: 600,
            fontSize: '0.95rem',
            color: acknowledged ? '#065f46' : '#1f2937'
          }}
        >
          I have read this and I am medically fit, or my doctor has approved.
        </label>
      </div>

      {isSenior && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            padding: '12px',
            backgroundColor: '#fef3c7',
            borderRadius: '8px',
            border: '1px solid #f59e0b'
          }}
        >
          <input
            type="checkbox"
            id="senior-warning-ack"
            checked={seniorAcknowledged}
            onChange={(e) => onToggleSeniorAcknowledge && onToggleSeniorAcknowledge(e.target.checked)}
            style={{ width: '18px', height: '18px', accentColor: '#d97706', cursor: 'pointer' }}
            disabled={!onToggleSeniorAcknowledge}
          />
          <label
            htmlFor="senior-warning-ack"
            style={{
              cursor: onToggleSeniorAcknowledge ? 'pointer' : 'default',
              fontWeight: 600,
              fontSize: '0.95rem',
              color: '#92400e'
            }}
          >
            Senior Safety Acknowledgment (Age 65+): I have consulted with my physician specifically for exercise clearance.
          </label>
        </div>
      )}
    </div>
  );
}

export default WeightLossMedicalWarningCard;
