import React from 'react';
import { ShieldCheck, ExternalLink, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function AdminPortalRedirectNotice({ targetRole = 'Operational Staff' }) {
  const navigate = useNavigate();
  const adminPortalUrl = 'http://localhost:5174/login';

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '70vh',
      padding: '24px'
    }}>
      <div className="glass-panel" style={{
        maxWidth: '520px',
        width: '100%',
        padding: '36px',
        borderRadius: '16px',
        textAlign: 'center',
        background: 'rgba(15, 23, 42, 0.9)',
        border: '1px solid rgba(59, 130, 246, 0.3)',
        boxShadow: '0 20px 40px rgba(0, 0, 0, 0.5)'
      }}>
        <div style={{
          display: 'inline-flex',
          padding: '16px',
          borderRadius: '50%',
          background: 'rgba(59, 130, 246, 0.15)',
          marginBottom: '20px'
        }}>
          <ShieldCheck size={48} color="#3b82f6" />
        </div>

        <h2 style={{ color: '#fff', fontSize: '1.5rem', marginBottom: '10px' }}>
          Restricted Operational Portal
        </h2>

        <p style={{ color: '#94a3b8', fontSize: '0.95rem', lineHeight: '1.6', marginBottom: '24px' }}>
          Administrative functions for <strong>{targetRole}</strong> are hosted on the dedicated, isolated GymSync Admin Portal.
          Privileged operational tools cannot be accessed from the public member web client.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <a
            href={adminPortalUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-primary"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              padding: '12px 24px',
              fontWeight: 600,
              fontSize: '1rem',
              textDecoration: 'none'
            }}
          >
            Launch GymSync Admin Portal (Port 5174) <ExternalLink size={18} />
          </a>

          <button
            type="button"
            onClick={() => navigate('/home')}
            className="btn btn-outline"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              padding: '10px 20px',
              fontSize: '0.9rem'
            }}
          >
            <ArrowLeft size={16} /> Return to Member Hub
          </button>
        </div>
      </div>
    </div>
  );
}
