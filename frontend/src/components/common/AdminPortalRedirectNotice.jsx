import React from 'react';
import { ShieldCheck, ExternalLink, ArrowLeft } from 'lucide-react';
import { useNavigate, Navigate } from 'react-router-dom';
import { useAuth, getRoleRedirectPath } from '../../context/AuthContext';

export default function AdminPortalRedirectNotice({ targetRole = 'Operational Staff' }) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const userRole = user?.role || localStorage.getItem('gymsync_role') || '';
  const normalizedRole = userRole.toLowerCase().replace(/[_\s]/g, '');
  const isAdminRole = ['admin', 'superadmin', 'complaintmoderator'].includes(normalizedRole);

  // If a non-admin role accidentally lands here, immediately redirect them to their home portal
  if (!isAdminRole) {
    return <Navigate to={getRoleRedirectPath(userRole)} replace />;
  }

  const adminPortalUrl = 'http://localhost:5174/login';
  const returnPath = getRoleRedirectPath(userRole);

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
        background: 'var(--card-bg, #0f172a)',
        border: '1px solid var(--card-border, rgba(59, 130, 246, 0.3))',
        boxShadow: 'var(--shadow-md, 0 20px 40px rgba(0, 0, 0, 0.5))'
      }}>
        <div style={{
          display: 'inline-flex',
          padding: '16px',
          borderRadius: '50%',
          background: 'rgba(59, 130, 246, 0.15)',
          marginBottom: '20px'
        }}>
          <ShieldCheck size={48} color="var(--primary-accent, #3b82f6)" />
        </div>

        <h2 style={{ color: 'var(--text-primary, #fff)', fontSize: '1.5rem', marginBottom: '10px' }}>
          Restricted Operational Portal
        </h2>

        <p style={{ color: 'var(--text-secondary, #94a3b8)', fontSize: '0.95rem', lineHeight: '1.6', marginBottom: '24px' }}>
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
            onClick={() => navigate(returnPath)}
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
            <ArrowLeft size={16} /> Return to Dashboard
          </button>
        </div>
      </div>
    </div>
  );
}
