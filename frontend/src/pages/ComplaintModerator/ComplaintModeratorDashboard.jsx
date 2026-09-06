import React, { useState, useEffect, useCallback } from 'react';
import { ShieldAlert, MessageSquare, CheckCircle, AlertCircle, RefreshCw, Shield } from 'lucide-react';
import DashboardShell from '../../components/layout/DashboardShell';
import SkeletonLoader from '../../components/common/SkeletonLoader';
import ModerationManagement from '../../components/admin/ModerationManagement';
import ComplaintManagement from '../../components/admin/ComplaintManagement';
import './ComplaintModeratorDashboard.css';

const ComplaintModeratorDashboard = () => {
  const [activeTab, setActiveTab] = useState('overview');
  const [reportedPosts, setReportedPosts] = useState([]);
  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const userName = localStorage.getItem('gymsync_user_name') || 'Moderator';
  const userRole = localStorage.getItem('gymsync_role') || 'ComplaintModerator';

  const fetchModeratorData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const headers = {
        'Authorization': `Bearer ${localStorage.getItem('gymsync_token') || ''}`,
        'Content-Type': 'application/json'
      };

      const [postsRes, complaintsRes] = await Promise.all([
        fetch('/api/admin/reported-posts', { headers }).then(r => r.ok ? r.json() : []).catch(() => []),
        fetch('/api/complaints', { headers }).then(r => r.ok ? r.json() : []).catch(() => [])
      ]);

      setReportedPosts(Array.isArray(postsRes) ? postsRes : []);
      setComplaints(Array.isArray(complaintsRes) ? complaintsRes : []);
    } catch (err) {
      console.error('Failed to fetch moderation queue:', err);
      setError('Failed to connect to moderation services. Please check network connectivity.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchModeratorData();
  }, [fetchModeratorData]);

  const pendingComplaintsCount = complaints.filter(c => c.status === 'Pending' || c.status === 'In Progress').length;
  const resolvedComplaintsCount = complaints.filter(c => c.status === 'Resolved').length;

  return (
    <DashboardShell
      userRole="ComplaintModerator"
      userName={userName}
      title="Moderation & Support Portal"
      subtitle="Review flagged community content, enforce platform safety rules, and resolve member complaints"
      activeTab={activeTab}
      onTabChange={setActiveTab}
    >
      <div className="moderator-dashboard-page">
        {/* Header Banner */}
        <div className="moderator-header glass-panel">
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div className="moderator-badge-icon">
              <Shield size={28} color="var(--primary-accent)" />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                <h2 style={{ margin: 0, color: 'var(--text-primary)' }}>Community Moderation Center</h2>
                <span className="category-badge" style={{ background: 'rgba(99, 102, 241, 0.2)', color: 'var(--primary-accent)' }}>
                  Authorized Content Moderator
                </span>
              </div>
              <p style={{ margin: '4px 0 0 0', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                Authenticated Moderator: <strong>{userName}</strong> • Strict scope: Content Review & Dispute Resolution
              </p>
            </div>
          </div>
        </div>

        {loading ? (
          <div style={{ padding: '30px' }}>
            <SkeletonLoader count={3} height="90px" />
          </div>
        ) : error ? (
          <div className="glass-panel" style={{ padding: '30px', textAlign: 'center', color: '#ef4444' }}>
            <AlertCircle size={40} style={{ marginBottom: '10px' }} />
            <p>{error}</p>
            <button className="btn btn-outline" onClick={fetchModeratorData}>
              <RefreshCw size={14} /> Retry Connection
            </button>
          </div>
        ) : (
          <div>
            {/* TAB 1: OVERVIEW & METRICS */}
            {activeTab === 'overview' && (
              <div>
                <div className="moderator-stats-grid">
                  <div className="moderator-stat-card glass-panel" onClick={() => setActiveTab('moderation')}>
                    <div className="moderator-stat-icon red">
                      <ShieldAlert size={24} />
                    </div>
                    <div>
                      <span className="moderator-stat-label">Reported Posts</span>
                      <h3 className="moderator-stat-value">{reportedPosts.length}</h3>
                    </div>
                  </div>

                  <div className="moderator-stat-card glass-panel" onClick={() => setActiveTab('complaints')}>
                    <div className="moderator-stat-icon amber">
                      <MessageSquare size={24} />
                    </div>
                    <div>
                      <span className="moderator-stat-label">Pending Complaints</span>
                      <h3 className="moderator-stat-value">{pendingComplaintsCount}</h3>
                    </div>
                  </div>

                  <div className="moderator-stat-card glass-panel" onClick={() => setActiveTab('complaints')}>
                    <div className="moderator-stat-icon green">
                      <CheckCircle size={24} />
                    </div>
                    <div>
                      <span className="moderator-stat-label">Resolved Disputes</span>
                      <h3 className="moderator-stat-value">{resolvedComplaintsCount}</h3>
                    </div>
                  </div>
                </div>

                <div className="glass-panel" style={{ padding: '24px', borderRadius: '16px' }}>
                  <h4 style={{ margin: '0 0 10px 0', color: 'var(--text-primary)' }}>Moderator Responsibilities & Boundaries</h4>
                  <ul style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', lineHeight: 1.7, margin: 0, paddingLeft: '20px' }}>
                    <li><strong>Content Moderation:</strong> Review posts flagged by users for spam, harassment, or inappropriate media. Dismiss false flags or remove violating content.</li>
                    <li><strong>Dispute Resolution:</strong> Communicate with reporting users and resolve complaints respectfully.</li>
                    <li><strong>Role Boundaries:</strong> User bans, financial transaction audits, facility approvals, and system changes are strictly reserved for Platform Administrators.</li>
                  </ul>
                </div>
              </div>
            )}

            {/* TAB 2: POST MODERATION QUEUE */}
            {activeTab === 'moderation' && (
              <ModerationManagement 
                reportedPosts={reportedPosts} 
                onRefresh={fetchModeratorData} 
              />
            )}

            {/* TAB 3: COMPLAINTS QUEUE & COMMUNICATION */}
            {activeTab === 'complaints' && (
              <ComplaintManagement 
                complaints={complaints}
                userName={userName}
                userRole={userRole}
                isSeniorAdmin={false}
                onRefresh={fetchModeratorData}
              />
            )}
          </div>
        )}
      </div>
    </DashboardShell>
  );
};

export default ComplaintModeratorDashboard;
