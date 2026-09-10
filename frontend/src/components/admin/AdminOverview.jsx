import React from 'react';
import { DollarSign, Users, Building, AlertTriangle, ShieldCheck, FileText, CheckCircle, BarChart2 } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';

const AdminOverview = ({ stats, isModerator = false, onNavigateTab }) => {
  if (isModerator) {
    return (
      <div className="admin-overview-section">
        <div className="stats-grid">
          <div className="stat-card glass-panel" style={{ cursor: 'pointer' }} onClick={() => onNavigateTab && onNavigateTab('complaints')}>
            <div className="stat-icon amber"><AlertTriangle size={24} /></div>
            <div>
              <span className="stat-label">Pending Complaints</span>
              <h3 className="stat-value">{stats?.pendingComplaints || 0}</h3>
            </div>
          </div>
          <div className="stat-card glass-panel" style={{ cursor: 'pointer' }} onClick={() => onNavigateTab && onNavigateTab('complaints')}>
            <div className="stat-icon green"><CheckCircle size={24} /></div>
            <div>
              <span className="stat-label">Resolved Complaints</span>
              <h3 className="stat-value">{stats?.resolvedComplaints || 0}</h3>
            </div>
          </div>
          <div className="stat-card glass-panel" style={{ cursor: 'pointer' }} onClick={() => onNavigateTab && onNavigateTab('moderation')}>
            <div className="stat-icon blue"><ShieldCheck size={24} /></div>
            <div>
              <span className="stat-label">Reported Posts</span>
              <h3 className="stat-value">{stats?.reportedPosts || 0}</h3>
            </div>
          </div>
          <div className="stat-card glass-panel">
            <div className="stat-icon purple"><FileText size={24} /></div>
            <div>
              <span className="stat-label">Total Community Posts</span>
              <h3 className="stat-value">{stats?.totalPosts || 0}</h3>
            </div>
          </div>
        </div>

        {/* Moderation Workflow Notice */}
        <div className="glass-panel" style={{ padding: '24px', marginTop: '24px', borderRadius: '16px' }}>
          <h3 style={{ margin: '0 0 8px 0', color: 'var(--text-primary)' }}>Complaint Moderator Center</h3>
          <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: 1.6 }}>
            As an authorized Complaint Moderator, you are responsible for maintaining a safe, respectful community on GymSync.
            Use the <strong>Complaints Queue</strong> to review member grievances, converse with trainees in the live ticket chat, and resolve issues.
            Use <strong>Post Moderation</strong> to review flagged posts and remove content that violates community guidelines.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-overview-section">
      {/* Top Metric Cards */}
      <div className="stats-grid">
        <div className="stat-card glass-panel" style={{ cursor: 'pointer' }} onClick={() => onNavigateTab && onNavigateTab('payments')}>
          <div className="stat-icon green"><DollarSign size={24} /></div>
          <div>
            <span className="stat-label">Total Platform Revenue</span>
            <h3 className="stat-value">${(stats?.totalRevenue || 0).toLocaleString()}</h3>
          </div>
        </div>

        <div className="stat-card glass-panel" style={{ cursor: 'pointer' }} onClick={() => onNavigateTab && onNavigateTab('users')}>
          <div className="stat-icon blue"><Users size={24} /></div>
          <div>
            <span className="stat-label">Registered Members</span>
            <h3 className="stat-value">{stats?.totalUsers || 0}</h3>
          </div>
        </div>

        <div className="stat-card glass-panel" style={{ cursor: 'pointer' }} onClick={() => onNavigateTab && onNavigateTab('gyms')}>
          <div className="stat-icon purple"><Building size={24} /></div>
          <div>
            <span className="stat-label">Active Gym Facilities</span>
            <h3 className="stat-value">{stats?.totalGyms || 0}</h3>
          </div>
        </div>

        <div className="stat-card glass-panel" style={{ cursor: 'pointer' }} onClick={() => onNavigateTab && onNavigateTab('complaints')}>
          <div className="stat-icon amber"><AlertTriangle size={24} /></div>
          <div>
            <span className="stat-label">Pending Complaints</span>
            <h3 className="stat-value">{stats?.pendingComplaints || 0}</h3>
          </div>
        </div>
      </div>

      {/* Secondary Metrics & Activity Summary */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px', marginTop: '24px' }}>
        <div className="glass-panel" style={{ padding: '24px', borderRadius: '16px' }}>
          <h4 style={{ margin: '0 0 16px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Building size={18} color="var(--primary-accent)" /> Facility & Growth Status
          </h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '8px', borderBottom: '1px solid var(--card-border)' }}>
              <span style={{ color: 'var(--text-secondary)' }}>Gym Owners Registered</span>
              <strong style={{ color: 'var(--text-primary)' }}>{stats?.totalGymOwners || 0}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '8px', borderBottom: '1px solid var(--card-border)' }}>
              <span style={{ color: 'var(--text-secondary)' }}>Pending Gym Approvals</span>
              <strong style={{ color: (stats?.pendingGymApprovals || 0) > 0 ? '#f59e0b' : '#10b981' }}>
                {stats?.pendingGymApprovals || 0} Action{(stats?.pendingGymApprovals || 0) === 1 ? '' : 's'}
              </strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '8px', borderBottom: '1px solid var(--card-border)' }}>
              <span style={{ color: 'var(--text-secondary)' }}>Flagged Community Posts</span>
              <strong style={{ color: (stats?.reportedPosts || 0) > 0 ? '#ef4444' : '#10b981' }}>
                {stats?.reportedPosts || 0} Pending
              </strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-secondary)' }}>Suspended / Banned Accounts</span>
              <strong style={{ color: (stats?.bannedUsers || 0) > 0 ? '#ef4444' : 'var(--text-secondary)' }}>
                {stats?.bannedUsers || 0}
              </strong>
            </div>
          </div>
        </div>

        <div className="glass-panel" style={{ padding: '24px', borderRadius: '16px' }}>
          <h4 style={{ margin: '0 0 16px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <ShieldCheck size={18} color="#10b981" /> System Health & Audits
          </h4>
          <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', lineHeight: 1.6, margin: '0 0 16px 0' }}>
            All operations are logged to the MongoDB security audit trail. Sensitive financial and configuration changes require Senior SuperAdmin authorization.
          </p>
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            <button className="btn btn-outline btn-sm" onClick={() => onNavigateTab && onNavigateTab('users')}>
              Manage Users
            </button>
            <button className="btn btn-outline btn-sm" onClick={() => onNavigateTab && onNavigateTab('gyms')}>
              Verify Gyms
            </button>
            <button className="btn btn-outline btn-sm" onClick={() => onNavigateTab && onNavigateTab('payments')}>
              Payment Queue
            </button>
          </div>
        </div>
      </div>

      {/* Platform Metrics Chart */}
      {stats && (
        <div className="glass-panel" style={{ padding: '24px', borderRadius: '16px', marginTop: '24px' }}>
          <h4 style={{ margin: '0 0 20px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <BarChart2 size={18} color="var(--primary-accent)" /> Platform Metrics Overview
          </h4>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart
              data={[
                { name: 'Users', value: stats.totalUsers || 0, color: '#3b82f6' },
                { name: 'Gyms', value: stats.totalGyms || 0, color: '#8b5cf6' },
                { name: 'Pending\nComplaints', value: stats.pendingComplaints || 0, color: '#f59e0b' },
                { name: 'Resolved', value: stats.resolvedComplaints || 0, color: '#10b981' },
                { name: 'Reported\nPosts', value: stats.reportedPosts || 0, color: '#ef4444' },
                { name: 'Revenue ($)', value: Math.round((stats.totalRevenue || 0) / 100), color: '#06b6d4' },
              ]}
              margin={{ top: 4, right: 16, left: 0, bottom: 4 }}
            >
              <XAxis
                dataKey="name"
                tick={{ fill: 'var(--text-secondary)', fontSize: 11 }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fill: 'var(--text-secondary)', fontSize: 11 }}
                axisLine={false}
                tickLine={false}
                width={36}
              />
              <Tooltip
                contentStyle={{
                  background: 'var(--panel-bg)',
                  border: '1px solid var(--card-border)',
                  borderRadius: '10px',
                  color: 'var(--text-primary)',
                  fontSize: '0.85rem'
                }}
                cursor={{ fill: 'rgba(255,255,255,0.04)' }}
              />
              <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                {[
                  { color: '#3b82f6' },
                  { color: '#8b5cf6' },
                  { color: '#f59e0b' },
                  { color: '#10b981' },
                  { color: '#ef4444' },
                  { color: '#06b6d4' },
                ].map((entry, i) => (
                  <Cell key={i} fill={entry.color} fillOpacity={0.85} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          <p style={{ margin: '10px 0 0 0', fontSize: '0.78rem', color: 'var(--text-secondary)', textAlign: 'center' }}>
            Revenue shown in \$100 units for scale. Click stat cards above to navigate to each section.
          </p>
        </div>
      )}
    </div>
  );
};

export default AdminOverview;
