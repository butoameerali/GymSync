import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Building2, ArrowRight, Sparkles } from 'lucide-react';

const GymOwnerProfileRedirect = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [noGymFound, setNoGymFound] = useState(false);
  const ownerName = localStorage.getItem('gymsync_user_name') || 'Gym Owner';
  const token = localStorage.getItem('gymsync_token') || '';

  useEffect(() => {
    let isMounted = true;

    const resolveGym = async () => {
      try {
        const headers = {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        };

        // 1. Try fetching owner branches
        const res = await fetch('/api/gym-verification/branches', { headers });
        if (res.ok) {
          const data = await res.json();
          if (data.success && Array.isArray(data.branches) && data.branches.length > 0) {
            const primary = data.branches[0];
            const targetId = primary._id || primary.id;
            if (targetId && isMounted) {
              navigate(`/gym/${targetId}`, { replace: true });
              return;
            }
          }
        }

        // 2. Fallback to dashboard endpoint
        const dashRes = await fetch(`/api/gym-owner/dashboard/${encodeURIComponent(ownerName)}`, { headers });
        if (dashRes.ok) {
          const dData = await dashRes.json();
          if (dData.gym && dData.gym._id && dData.gym._id !== 'gym_demo_id') {
            if (isMounted) {
              navigate(`/gym/${dData.gym._id}`, { replace: true });
              return;
            }
          }
        }

        if (isMounted) setNoGymFound(true);
      } catch (err) {
        console.warn('Error resolving gym owner facility:', err);
        if (isMounted) setNoGymFound(true);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    resolveGym();
    return () => { isMounted = false; };
  }, [ownerName, token, navigate]);

  if (loading) {
    return (
      <div className="container" style={{ paddingTop: '150px', textAlign: 'center', minHeight: '60vh' }}>
        <div style={{
          display: 'inline-block',
          width: '42px',
          height: '42px',
          border: '3px solid rgba(59, 130, 246, 0.2)',
          borderTopColor: 'var(--primary-accent)',
          borderRadius: '50%',
          animation: 'spin 0.8s linear infinite',
          marginBottom: '16px'
        }} />
        <h3 style={{ margin: '0 0 6px', color: 'var(--text-primary)', fontSize: '1.2rem' }}>
          Loading Your Gym Profile...
        </h3>
        <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
          Connecting you to your live facility page.
        </p>
      </div>
    );
  }

  if (noGymFound) {
    return (
      <div className="container" style={{ paddingTop: '120px', paddingBottom: '60px', maxWidth: '640px', margin: '0 auto', textAlign: 'center' }}>
        <div className="glass-panel" style={{ padding: '40px 28px', borderRadius: '18px', border: '1px solid var(--border-color)', boxShadow: '0 20px 40px rgba(0,0,0,0.3)' }}>
          <div style={{
            width: '64px',
            height: '64px',
            borderRadius: '16px',
            background: 'rgba(59, 130, 246, 0.12)',
            color: 'var(--primary-accent)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 20px'
          }}>
            <Building2 size={32} />
          </div>

          <h2 style={{ margin: '0 0 10px', fontSize: '1.45rem', color: 'var(--text-primary)', fontWeight: 800 }}>
            Welcome, {ownerName}!
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.92rem', lineHeight: 1.6, marginBottom: '24px' }}>
            As a Gym Owner on GymSync, your profile is your official <strong>Gym Facility Page</strong>. You haven't registered or submitted a branch yet. Once registered, your profile will showcase your machines, photos, pricing, and live announcements!
          </p>

          <Link
            to="/gym-owner"
            className="btn btn-primary"
            style={{ padding: '12px 28px', display: 'inline-flex', alignItems: 'center', gap: '8px', fontSize: '0.95rem', fontWeight: 600, borderRadius: '10px' }}
          >
            Register Your Gym Facility <ArrowRight size={16} />
          </Link>
        </div>
      </div>
    );
  }

  return null;
};

export default GymOwnerProfileRedirect;
