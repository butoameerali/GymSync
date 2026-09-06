import React, { useState, useEffect, useCallback } from 'react';
import { Shield } from 'lucide-react';
import DashboardShell from '../../components/layout/DashboardShell';
import SkeletonLoader from '../../components/common/SkeletonLoader';

import AdminOverview from '../../components/admin/AdminOverview';
import UserManagement from '../../components/admin/UserManagement';
import GymManagement from '../../components/admin/GymManagement';
import ModerationManagement from '../../components/admin/ModerationManagement';
import ComplaintManagement from '../../components/admin/ComplaintManagement';
import PaymentManagement from '../../components/admin/PaymentManagement';
import BroadcastManagement from '../../components/admin/BroadcastManagement';
import AuditLogManagement from '../../components/admin/AuditLogManagement';

import './AdminDashboard.css';

const AdminDashboard = () => {
  const [activeTab, setActiveTab] = useState('overview');
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [complaints, setComplaints] = useState([]);
  const [pendingGyms, setPendingGyms] = useState([]);
  const [reportedPosts, setReportedPosts] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  // Admin Role Identity
  const userName = localStorage.getItem('gymsync_user_name') || 'Admin';
  const userRole = localStorage.getItem('gymsync_role') || 'Admin';
  const isModerator = userRole === 'ComplaintModerator';
  const isSeniorAdmin = userRole === 'SuperAdmin' || userName.toLowerCase().includes('senior') || userName.toLowerCase() === 'admin manager';

  // Allowed tabs based on role
  const allowedTabs = isModerator 
    ? ['overview', 'moderation', 'reported_posts', 'complaints', 'complaint_chats']
    : ['overview', 'users', 'users_instructors', 'gyms', 'gym_approvals', 'moderation', 'reported_posts', 'complaints', 'complaint_chats', 'payments', 'cashback', 'broadcast', 'audit', 'audit_logs'];

  const fetchAdminData = useCallback(async () => {
    try {
      setLoading(true);
      const headers = { 'Authorization': `Bearer ${localStorage.getItem('gymsync_token') || ''}` };

      // Base queries permitted for both Admin and ComplaintModerator
      const requests = [
        fetch('/api/admin/stats', { headers }).then(r => r.ok ? r.json() : null).catch(() => null),
        fetch('/api/complaints', { headers }).then(r => r.ok ? r.json() : []).catch(() => []),
        fetch('/api/admin/posts/reported', { headers }).then(r => r.ok ? r.json() : []).catch(() => [])
      ];

      // Sensitive requests only for Admin / SuperAdmin
      if (!isModerator) {
        requests.push(
          fetch('/api/admin/users', { headers }).then(r => r.ok ? r.json() : []).catch(() => []),
          fetch('/api/admin/gyms/pending', { headers }).then(r => r.ok ? r.json() : []).catch(() => [])
        );
        if (isSeniorAdmin) {
          requests.push(
            fetch('/api/admin/audit-logs', { headers }).then(r => r.ok ? r.json() : []).catch(() => [])
          );
        }
      }

      const results = await Promise.all(requests);
      setStats(results[0]);
      setComplaints(Array.isArray(results[1]) ? results[1] : []);
      setReportedPosts(Array.isArray(results[2]) ? results[2] : []);

      if (!isModerator) {
        setUsers(Array.isArray(results[3]) ? results[3] : []);
        setPendingGyms(Array.isArray(results[4]) ? results[4] : []);
        if (isSeniorAdmin && results[5]) {
          setAuditLogs(Array.isArray(results[5]) ? results[5] : []);
        }
      }
    } catch (error) {
      console.error('Failed to load admin data:', error);
    } finally {
      setLoading(false);
    }
  }, [isModerator, isSeniorAdmin]);

  useEffect(() => {
    fetchAdminData();
  }, [fetchAdminData]);

  // Handle Tab Change with role protection
  const handleTabChange = (tabId) => {
    if (isModerator && !['overview', 'moderation', 'complaints'].includes(tabId)) {
      setActiveTab('overview');
      return;
    }
    setActiveTab(tabId);
  };

  // Safe normalized active tab ID
  const effectiveTab = (!allowedTabs.includes(activeTab)) ? 'overview' : activeTab;

  const shellTitle = isModerator 
    ? 'Complaint & Moderation Portal' 
    : isSeniorAdmin 
      ? 'Senior SuperAdmin Control Center' 
      : 'Admin Control Center';

  const shellSubtitle = isModerator
    ? `Authorized Moderation Queue — Logged in as ${userName}`
    : `${isSeniorAdmin ? 'Senior Super Admin (Tier 1)' : 'Junior Admin'} Portal — Logged in as ${userName}`;

  return (
    <DashboardShell
      userRole={userRole}
      userName={userName}
      title={shellTitle}
      subtitle={shellSubtitle}
      activeTab={effectiveTab}
      onTabChange={handleTabChange}
    >
      <div className="admin-dashboard-page">
        {/* Banner Header */}
        <div className="admin-header glass-panel">
          <div className="header-content" style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div className="admin-badge-icon">
              <Shield size={32} color="var(--primary-accent)" />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                <h2 style={{ margin: 0 }}>{shellTitle}</h2>
                <span className={`tier-badge ${isSeniorAdmin ? 'senior' : 'junior'}`}>
                  {userRole}
                </span>
              </div>
              <p style={{ margin: '4px 0 0 0', color: 'var(--text-secondary)' }}>
                Authenticated as: <strong>{userName}</strong>
              </p>
            </div>
          </div>
        </div>

        {loading ? (
          <div style={{ padding: '30px' }}>
            <SkeletonLoader count={4} height="80px" />
          </div>
        ) : (
          <div className="admin-tab-content">
            {/* OVERVIEW / SYSTEM METRICS */}
            {effectiveTab === 'overview' && (
              <AdminOverview 
                stats={stats} 
                isModerator={isModerator}
                onNavigateTab={handleTabChange} 
              />
            )}

            {/* USERS MANAGEMENT (Admin/SuperAdmin only) */}
            {!isModerator && (effectiveTab === 'users' || effectiveTab === 'users_instructors') && (
              <UserManagement 
                users={users} 
                onRefresh={fetchAdminData} 
              />
            )}

            {/* GYM FACILITY APPROVALS (Admin/SuperAdmin only) */}
            {!isModerator && (effectiveTab === 'gyms' || effectiveTab === 'gym_approvals') && (
              <GymManagement 
                pendingGyms={pendingGyms} 
                onRefresh={fetchAdminData} 
              />
            )}

            {/* POST MODERATION QUEUE (Admin, SuperAdmin & ComplaintModerator) */}
            {(effectiveTab === 'moderation' || effectiveTab === 'reported_posts') && (
              <ModerationManagement 
                reportedPosts={reportedPosts} 
                onRefresh={fetchAdminData} 
              />
            )}

            {/* COMPLAINTS QUEUE & CHAT (Admin, SuperAdmin & ComplaintModerator) */}
            {(effectiveTab === 'complaints' || effectiveTab === 'complaint_chats') && (
              <ComplaintManagement 
                complaints={complaints}
                userName={userName}
                userRole={userRole}
                isSeniorAdmin={isSeniorAdmin}
                onRefresh={fetchAdminData}
              />
            )}

            {/* PAYMENT VERIFICATIONS & CONFIGURATION (Admin/SuperAdmin only) */}
            {!isModerator && (effectiveTab === 'payments' || effectiveTab === 'cashback') && (
              <PaymentManagement 
                isSeniorAdmin={isSeniorAdmin}
                onRefresh={fetchAdminData} 
              />
            )}

            {/* SUBSCRIBER BROADCAST (Admin/SuperAdmin only) */}
            {!isModerator && effectiveTab === 'broadcast' && (
              <BroadcastManagement />
            )}

            {/* SENIOR AUDIT LOGS (SuperAdmin only) */}
            {!isModerator && isSeniorAdmin && (effectiveTab === 'audit' || effectiveTab === 'audit_logs') && (
              <AuditLogManagement 
                auditLogs={auditLogs} 
              />
            )}
          </div>
        )}
      </div>
    </DashboardShell>
  );
};

export default AdminDashboard;
