import React from 'react';
import * as Icons from 'lucide-react';

const StatCard = ({ title, value, subtitle, icon = 'Activity', badge, color = 'var(--primary-accent)' }) => {
  const IconComponent = Icons[icon] || Icons.Activity;

  return (
    <div className="glass-panel" style={{ padding: '20px', borderRadius: '12px', display: 'flex', flexDirection: 'column', gap: '8px', borderLeft: `4px solid ${color}` }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 500 }}>{title}</span>
        <div style={{ color, background: `${color}15`, padding: '8px', borderRadius: '8px', display: 'flex', alignItems: 'center' }}>
          <IconComponent size={20} />
        </div>
      </div>
      <div style={{ fontSize: '1.8rem', fontWeight: 700, color: 'var(--text-primary)' }}>{value}</div>
      {subtitle && <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{subtitle}</div>}
      {badge && (
        <span style={{ display: 'inline-block', fontSize: '0.75rem', padding: '2px 8px', borderRadius: '12px', background: `${color}20`, color, width: 'fit-content', marginTop: '4px' }}>
          {badge}
        </span>
      )}
    </div>
  );
};

export default StatCard;
