import React from 'react';
import { AlertCircle, ShieldAlert, Info } from 'lucide-react';

/**
 * Reusable Medical & Dietary Disclaimer Component
 * Variants:
 *  - "footer": Full sitewide disclaimer card/footer
 *  - "banner": Small non-dismissable banner under page/session titles
 *  - "chat": Compact non-dismissable disclaimer below AI coach / chat windows
 */
export const MANDATORY_DISCLAIMER_TEXT =
  'GymSync is a fitness tracking and gym management platform, not a medical or healthcare provider. Content, workouts, and tools provided are for educational and informational purposes only and do not constitute medical, diagnostic, or dietary prescription advice. Always consult a qualified physician before beginning any new exercise or nutrition program.';

export const MANDATORY_BANNER_TEXT =
  'General fitness information — not medical advice. Consult your physician if you have a health condition.';

const MedicalDisclaimer = ({ variant = 'footer', className = '', style = {}, force = false }) => {
  // Disclaimers are accepted once upon login via MedicalDisclaimerModal.
  // Suppress recurring inline disclaimer banners/footers on regular pages so they do not clutter feeds.
  const isLegalPage = typeof window !== 'undefined' && (
    window.location.pathname.startsWith('/disclaimer') || 
    window.location.pathname.startsWith('/legal') ||
    window.location.pathname.startsWith('/medical-disclaimer')
  );

  if (!force && !isLegalPage) {
    return null;
  }

  if (variant === 'banner') {
    return (
      <div
        className={`gymsync-medical-banner ${className}`}
        role="note"
        aria-label="Medical Disclaimer Banner"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          padding: '8px 14px',
          borderRadius: '8px',
          background: 'rgba(245, 158, 11, 0.08)',
          border: '1px solid rgba(245, 158, 11, 0.25)',
          color: 'var(--text-secondary)',
          fontSize: '0.82rem',
          lineHeight: '1.4',
          margin: '8px 0 16px 0',
          ...style
        }}
      >
        <AlertCircle size={15} style={{ color: '#f59e0b', flexShrink: 0 }} />
        <span>{MANDATORY_BANNER_TEXT}</span>
      </div>
    );
  }

  if (variant === 'chat') {
    return (
      <div
        className={`gymsync-chat-disclaimer ${className}`}
        role="note"
        aria-label="AI Chat Medical Disclaimer"
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          gap: '8px',
          padding: '8px 12px',
          background: 'rgba(0, 0, 0, 0.03)',
          borderTop: '1px solid var(--card-border, rgba(255, 255, 255, 0.08))',
          color: 'var(--text-secondary, #94a3b8)',
          fontSize: '0.74rem',
          lineHeight: '1.35',
          userSelect: 'none',
          ...style
        }}
      >
        <Info size={13} style={{ color: '#f59e0b', flexShrink: 0, marginTop: '2px' }} />
        <span>
          <strong>Notice:</strong> {MANDATORY_DISCLAIMER_TEXT}
        </span>
      </div>
    );
  }

  // Default: variant === 'footer' or 'full'
  return (
    <aside
      className={`gymsync-medical-disclaimer-footer ${className}`}
      role="complementary"
      aria-label="Medical and Dietary Disclaimer"
      style={{
        width: '100%',
        padding: '16px 20px',
        margin: '24px 0 12px 0',
        borderRadius: '12px',
        background: 'rgba(15, 23, 42, 0.04)',
        border: '1px solid var(--card-border, rgba(255, 255, 255, 0.08))',
        display: 'flex',
        alignItems: 'flex-start',
        gap: '12px',
        fontSize: '0.8rem',
        lineHeight: '1.5',
        color: 'var(--text-secondary, #94a3b8)',
        ...style
      }}
    >
      <ShieldAlert size={18} style={{ color: '#f59e0b', flexShrink: 0, marginTop: '2px' }} />
      <div>
        <strong style={{ color: 'var(--text-primary)', display: 'block', marginBottom: '2px' }}>
          Medical & Dietary Disclaimer
        </strong>
        <span>{MANDATORY_DISCLAIMER_TEXT}</span>
      </div>
    </aside>
  );
};

export default MedicalDisclaimer;
