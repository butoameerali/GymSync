import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAdminAuth } from '../../context/AdminAuthContext';
import {
  Dumbbell, Utensils, Activity, CheckSquare, ShieldCheck, ShieldAlert,
  Plus, ArrowRight, Clock, AlertTriangle, CheckCircle2, RefreshCw, Eye
} from 'lucide-react';

const FitnessTrainerOverview = () => {
  const { user, authHeaders } = useAdminAuth();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);
  const [programs, setPrograms] = useState([]);
  const [exercisesCount, setExercisesCount] = useState(0);
  const [dietsCount, setDietsCount] = useState(0);
  const [pendingTasksCount, setPendingTasksCount] = useState(0);

  const fetchOverviewData = async () => {
    try {
      setLoading(true);
      const [userRes, progRes, exRes, dietRes, taskRes] = await Promise.all([
        fetch('/api/auth/me', { headers: authHeaders() }).catch(() => null),
        fetch('/api/plans/premade?type=Workout&status=all&limit=50', { headers: authHeaders() }).catch(() => null),
        fetch('/api/exercises?limit=1', { headers: authHeaders() }).catch(() => null),
        fetch('/api/plans/premade?type=Diet&status=all&limit=1', { headers: authHeaders() }).catch(() => null),
        fetch('/api/instructor-requests', { headers: authHeaders() }).catch(() => null)
      ]);

      if (userRes && userRes.ok) {
        const u = await userRes.json();
        setTwoFactorEnabled(Boolean(u.twoFactorEnabled));
      }

      if (progRes && progRes.ok) {
        const p = await progRes.json();
        const list = p.items || (Array.isArray(p) ? p : []);
        setPrograms(list);
      }

      if (exRes && exRes.ok) {
        const ex = await exRes.json();
        setExercisesCount(ex.total || (Array.isArray(ex) ? ex.length : 0));
      }

      if (dietRes && dietRes.ok) {
        const d = await dietRes.json();
        setDietsCount(d.total || (Array.isArray(d) ? d.length : 0));
      }

      if (taskRes && taskRes.ok) {
        const tasks = await taskRes.json();
        if (Array.isArray(tasks)) {
          const pending = tasks.filter(t => t.status !== 'Completed');
          setPendingTasksCount(pending.length);
        }
      }
    } catch (e) {
      console.warn('Overview fetch error:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOverviewData();
  }, []);

  const pendingReviewCount = programs.filter(p => p.status === 'pending_review').length;
  const publishedCount = programs.filter(p => p.status === 'published').length;

  return (
    <div style={{ padding: '24px', maxWidth: '1400px', margin: '0 auto' }}>
      {/* Welcome Banner */}
      <div style={{
        background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
        border: '1px solid #334155',
        borderRadius: '16px',
        padding: '24px 28px',
        marginBottom: '24px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '16px'
      }}>
        <div>
          <span style={{
            fontSize: '0.78rem',
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '1px',
            color: '#60a5fa',
            background: 'rgba(59, 130, 246, 0.15)',
            padding: '4px 10px',
            borderRadius: '6px',
            display: 'inline-block',
            marginBottom: '8px'
          }}>
            Fitness Operations Command Center
          </span>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#f8fafc', margin: 0 }}>
            Welcome back, {user?.name || 'Coach Farhan'}!
          </h1>
          <p style={{ color: '#94a3b8', fontSize: '0.9rem', marginTop: '6px' }}>
            Design progressive multi-week training programs, build exercise movements, and manage nutrition templates.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            onClick={() => navigate('/programs')}
            style={{
              background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
              color: '#fff',
              border: 'none',
              padding: '10px 20px',
              borderRadius: '8px',
              fontWeight: 700,
              fontSize: '0.9rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              boxShadow: '0 4px 14px rgba(59, 130, 246, 0.4)'
            }}
          >
            <Plus size={18} /> New Program
          </button>
        </div>
      </div>

      {/* 2-Step Verification Security Alert Card */}
      <div style={{
        background: twoFactorEnabled ? 'rgba(16, 185, 129, 0.08)' : 'rgba(245, 158, 11, 0.1)',
        border: `1px solid ${twoFactorEnabled ? 'rgba(16, 185, 129, 0.3)' : 'rgba(245, 158, 11, 0.35)'}`,
        borderRadius: '12px',
        padding: '16px 20px',
        marginBottom: '24px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '12px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{
            width: '40px',
            height: '40px',
            borderRadius: '10px',
            background: twoFactorEnabled ? 'rgba(16, 185, 129, 0.2)' : 'rgba(245, 158, 11, 0.2)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: twoFactorEnabled ? '#10b981' : '#f59e0b'
          }}>
            {twoFactorEnabled ? <ShieldCheck size={22} /> : <ShieldAlert size={22} />}
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <strong style={{ fontSize: '0.98rem', color: '#f3f4f6' }}>
                Account Security: 2-Step Verification {twoFactorEnabled ? 'Active' : 'Disabled'}
              </strong>
              <span style={{
                fontSize: '0.72rem',
                fontWeight: 700,
                padding: '2px 8px',
                borderRadius: '9999px',
                background: twoFactorEnabled ? '#10b981' : '#f59e0b',
                color: '#000'
              }}>
                {twoFactorEnabled ? 'PROTECTED' : 'ACTION RECOMMENDED'}
              </span>
            </div>
            <p style={{ margin: 0, fontSize: '0.84rem', color: '#9ca3af', marginTop: '2px' }}>
              {twoFactorEnabled
                ? 'Your trainer login requires an email OTP code on each sign-in.'
                : 'Turn ON 2-Step Verification to prevent unauthorized access to your instructor account.'}
            </p>
          </div>
        </div>

        <button
          onClick={() => navigate('/security')}
          style={{
            background: twoFactorEnabled ? '#1f2937' : '#f59e0b',
            color: twoFactorEnabled ? '#93c5fd' : '#000',
            border: twoFactorEnabled ? '1px solid #374151' : 'none',
            padding: '8px 16px',
            borderRadius: '6px',
            fontWeight: 700,
            fontSize: '0.84rem',
            cursor: 'pointer'
          }}
        >
          {twoFactorEnabled ? 'Manage Security' : 'Turn ON 2-Step Now'}
        </button>
      </div>

      {/* 4 Metric Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '18px', marginBottom: '24px' }}>
        {/* Workout Programs */}
        <div
          onClick={() => navigate('/programs')}
          style={{
            background: '#111827',
            border: '1px solid #1f2937',
            borderRadius: '14px',
            padding: '20px',
            cursor: 'pointer',
            transition: 'transform 0.15s, border-color 0.15s',
            boxShadow: '0 4px 12px rgba(0,0,0,0.2)'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#9ca3af' }}>Workout Programs</span>
            <div style={{ width: '38px', height: '38px', borderRadius: '8px', background: 'rgba(59, 130, 246, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#60a5fa' }}>
              <Dumbbell size={20} />
            </div>
          </div>
          <div style={{ fontSize: '2rem', fontWeight: 800, color: '#f9fafb', marginBottom: '6px' }}>
            {programs.length}
          </div>
          <div style={{ fontSize: '0.8rem', color: '#34d399', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <CheckCircle2 size={13} /> {publishedCount} Live for Trainees
          </div>
        </div>

        {/* Pending Approvals */}
        <div
          onClick={() => navigate('/programs')}
          style={{
            background: '#111827',
            border: pendingReviewCount > 0 ? '1px solid rgba(245, 158, 11, 0.4)' : '1px solid #1f2937',
            borderRadius: '14px',
            padding: '20px',
            cursor: 'pointer',
            boxShadow: '0 4px 12px rgba(0,0,0,0.2)'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#9ca3af' }}>Pending Admin Review</span>
            <div style={{ width: '38px', height: '38px', borderRadius: '8px', background: 'rgba(245, 158, 11, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#f59e0b' }}>
              <Clock size={20} />
            </div>
          </div>
          <div style={{ fontSize: '2rem', fontWeight: 800, color: pendingReviewCount > 0 ? '#fbbf24' : '#f9fafb', marginBottom: '6px' }}>
            {pendingReviewCount}
          </div>
          <div style={{ fontSize: '0.8rem', color: pendingReviewCount > 0 ? '#fbbf24' : '#9ca3af' }}>
            {pendingReviewCount > 0 ? '⏳ Waiting for Senior Admin authorization' : 'All submitted programs reviewed'}
          </div>
        </div>

        {/* Exercises in Library */}
        <div
          onClick={() => navigate('/exercise-library')}
          style={{
            background: '#111827',
            border: '1px solid #1f2937',
            borderRadius: '14px',
            padding: '20px',
            cursor: 'pointer',
            boxShadow: '0 4px 12px rgba(0,0,0,0.2)'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#9ca3af' }}>Exercise Library</span>
            <div style={{ width: '38px', height: '38px', borderRadius: '8px', background: 'rgba(99, 102, 241, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#818cf8' }}>
              <Activity size={20} />
            </div>
          </div>
          <div style={{ fontSize: '2rem', fontWeight: 800, color: '#f9fafb', marginBottom: '6px' }}>
            {exercisesCount || 'Library'}
          </div>
          <div style={{ fontSize: '0.8rem', color: '#9ca3af' }}>
            Target muscles, cues &amp; equipment templates
          </div>
        </div>

        {/* Diet Templates */}
        <div
          onClick={() => navigate('/diet-library')}
          style={{
            background: '#111827',
            border: '1px solid #1f2937',
            borderRadius: '14px',
            padding: '20px',
            cursor: 'pointer',
            boxShadow: '0 4px 12px rgba(0,0,0,0.2)'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#9ca3af' }}>Diet &amp; Meal Plans</span>
            <div style={{ width: '38px', height: '38px', borderRadius: '8px', background: 'rgba(16, 185, 129, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#34d399' }}>
              <Utensils size={20} />
            </div>
          </div>
          <div style={{ fontSize: '2rem', fontWeight: 800, color: '#f9fafb', marginBottom: '6px' }}>
            {dietsCount || 'Templates'}
          </div>
          <div style={{ fontSize: '0.8rem', color: '#9ca3af' }}>
            Calorie targets &amp; macro food slots
          </div>
        </div>
      </div>

      {/* Quick Launch Action Tiles */}
      <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#f3f4f6', marginBottom: '14px' }}>
        Instructor Core Workspaces
      </h3>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px', marginBottom: '32px' }}>
        <div
          onClick={() => navigate('/programs')}
          style={{
            background: '#111827',
            border: '1px solid #1f2937',
            borderRadius: '12px',
            padding: '18px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ width: '40px', height: '40px', borderRadius: '8px', background: 'rgba(59, 130, 246, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#60a5fa' }}>
              <Dumbbell size={22} />
            </div>
            <div>
              <strong style={{ fontSize: '0.95rem', color: '#fff', display: 'block' }}>Program Overload Builder</strong>
              <span style={{ fontSize: '0.78rem', color: '#9ca3af' }}>Multi-week day-by-day progression</span>
            </div>
          </div>
          <ArrowRight size={18} color="#60a5fa" />
        </div>

        <div
          onClick={() => navigate('/exercise-library')}
          style={{
            background: '#111827',
            border: '1px solid #1f2937',
            borderRadius: '12px',
            padding: '18px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ width: '40px', height: '40px', borderRadius: '8px', background: 'rgba(99, 102, 241, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#818cf8' }}>
              <Activity size={22} />
            </div>
            <div>
              <strong style={{ fontSize: '0.95rem', color: '#fff', display: 'block' }}>Exercise Library</strong>
              <span style={{ fontSize: '0.78rem', color: '#9ca3af' }}>Add, update &amp; configure exercises</span>
            </div>
          </div>
          <ArrowRight size={18} color="#818cf8" />
        </div>

        <div
          onClick={() => navigate('/diet-library')}
          style={{
            background: '#111827',
            border: '1px solid #1f2937',
            borderRadius: '12px',
            padding: '18px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ width: '40px', height: '40px', borderRadius: '8px', background: 'rgba(16, 185, 129, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#34d399' }}>
              <Utensils size={22} />
            </div>
            <div>
              <strong style={{ fontSize: '0.95rem', color: '#fff', display: 'block' }}>Diet &amp; Nutrition Library</strong>
              <span style={{ fontSize: '0.78rem', color: '#9ca3af' }}>Create meal plans &amp; recipe macros</span>
            </div>
          </div>
          <ArrowRight size={18} color="#34d399" />
        </div>

        <div
          onClick={() => navigate('/security')}
          style={{
            background: '#111827',
            border: '1px solid #1f2937',
            borderRadius: '12px',
            padding: '18px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ width: '40px', height: '40px', borderRadius: '8px', background: 'rgba(234, 179, 8, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#eab308' }}>
              <ShieldCheck size={22} />
            </div>
            <div>
              <strong style={{ fontSize: '0.95rem', color: '#fff', display: 'block' }}>Security &amp; 2-Step (2FA)</strong>
              <span style={{ fontSize: '0.78rem', color: '#9ca3af' }}>Manage OTP &amp; staff credentials</span>
            </div>
          </div>
          <ArrowRight size={18} color="#eab308" />
        </div>
      </div>

      {/* Recent Programs Section */}
      <div style={{
        background: '#111827',
        border: '1px solid #1f2937',
        borderRadius: '14px',
        padding: '22px'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#f3f4f6', margin: 0 }}>
            Recent Training Programs in Database
          </h3>
          <button
            onClick={() => navigate('/programs')}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#60a5fa',
              fontSize: '0.85rem',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '4px'
            }}
          >
            View All ({programs.length}) <ArrowRight size={14} />
          </button>
        </div>

        {programs.length === 0 ? (
          <p style={{ color: '#9ca3af', fontSize: '0.85rem', textAlign: 'center', padding: '30px 0' }}>
            No workout programs created yet. Click "New Program" to build your first routine!
          </p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {programs.slice(0, 5).map(prog => (
              <div
                key={prog._id}
                style={{
                  background: '#1f2937',
                  borderRadius: '8px',
                  padding: '12px 16px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: '10px'
                }}
              >
                <div>
                  <strong style={{ fontSize: '0.95rem', color: '#fff', display: 'block' }}>{prog.title}</strong>
                  <span style={{ fontSize: '0.78rem', color: '#9ca3af' }}>
                    {prog.goal} • {prog.durationWeeks || 4} Weeks • {prog.daysPerWeek || 4} Days/Wk • By {prog.createdBy || 'Instructor'}
                  </span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{
                    fontSize: '0.74rem',
                    fontWeight: 700,
                    padding: '3px 8px',
                    borderRadius: '4px',
                    background: prog.status === 'published' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(245, 158, 11, 0.2)',
                    color: prog.status === 'published' ? '#34d399' : '#fbbf24'
                  }}>
                    {prog.status === 'published' ? 'Live (Approved)' : 'Pending Review'}
                  </span>

                  <button
                    onClick={() => navigate('/programs')}
                    style={{
                      background: '#374151',
                      color: '#fff',
                      border: 'none',
                      padding: '5px 10px',
                      borderRadius: '6px',
                      fontSize: '0.78rem',
                      cursor: 'pointer'
                    }}
                  >
                    Open
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default FitnessTrainerOverview;
