import React, { useState } from 'react';

export const HealthChipSection = ({ label, options, selected = [], onToggle, onAddCustom, customPlaceholder }) => {
  const [customText, setCustomText] = useState('');

  const handleAdd = (e) => {
    if (e) e.preventDefault();
    if (!customText.trim()) return;
    onAddCustom(customText.trim());
    setCustomText('');
  };

  const customItems = selected.filter(s => !options.includes(s) && s !== 'None' && s !== 'No Restrictions');

  return (
    <div style={{ marginBottom: '18px' }}>
      <label className="wiz-label" style={{ display: 'block', marginBottom: '8px' }}>
        {label}
      </label>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '8px' }}>
        {options.map(opt => (
          <button
            type="button"
            key={opt}
            className={`sub-pill ${selected.includes(opt) ? 'selected' : ''}`}
            onClick={() => onToggle(opt)}
          >
            {opt}
          </button>
        ))}
        {customItems.map(item => (
          <button
            type="button"
            key={item}
            className="sub-pill selected"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
            onClick={() => onToggle(item)}
            title="Click to remove"
          >
            <span>{item}</span>
            <span style={{ fontSize: '0.75rem', opacity: 0.8 }}>✕</span>
          </button>
        ))}
      </div>
      <div style={{ display: 'flex', gap: '8px' }}>
        <input
          type="text"
          value={customText}
          onChange={e => setCustomText(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter') {
              e.preventDefault();
              handleAdd();
            }
          }}
          placeholder={customPlaceholder || "+ Add custom tag..."}
          className="wiz-input"
          style={{ marginBottom: 0, flex: 1, padding: '8px 12px', fontSize: '0.85rem' }}
        />
        <button
          type="button"
          onClick={handleAdd}
          className="btn-primary"
          style={{ padding: '0 16px', borderRadius: '8px', fontSize: '0.9rem' }}
        >
          Add
        </button>
      </div>
    </div>
  );
};
