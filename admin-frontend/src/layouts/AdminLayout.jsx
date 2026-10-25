import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAdminAuth } from '../context/AdminAuthContext';
import {
  Shield,
  BarChart2,
  Building,
  Users,
  ShoppingBag,
  ShieldAlert,
  MessageSquare,
  CreditCard,
  Megaphone,
  CheckSquare,
  FileText,
  LogOut
} from 'lucide-react';

const AdminLayout = ({ children }) => {
  const { user, role, logout } = useAdminAuth();
  const navigate = useNavigate();

  const roleNormalized = (role || '').toLowerCase().replace(/_/g, '');
  const isSuperAdmin = roleNormalized === 'superadmin';
  const isAdmin = roleNormalized === 'admin' || isSuperAdmin;
  const isModerator = roleNormalized === 'complaintmoderator';
  const isInstructor = roleNormalized === 'fitnessinstructor';

  const handleSignOut = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="admin-layout-container">
      {/* Isolated Admin Sidebar */}
      <aside className="admin-sidebar">
        <div className="admin-sidebar-header">
          <div className="admin-brand-logo">
            <Shield size={24} color="#3b82f6" />
            <span>GymSync Ops</span>
          </div>
          <span className="admin-badge">{role || 'Staff'}</span>
        </div>

        <div className="admin-user-badge-container">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '36px',
              height: '36px',
              borderRadius: '8px',
              background: '#374151',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 700,
              color: '#60a5fa'
            }}>
              {(user?.name || 'A').charAt(0).toUpperCase()}
            </div>
            <div style={{ overflow: 'hidden' }}>
              <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#f3f4f6', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>
                {user?.name || 'Administrator'}
              </div>
              <div style={{ fontSize: '0.72rem', color: '#9ca3af' }}>
                {user?.email || ''}
              </div>
            </div>
          </div>
        </div>

        <nav className="admin-nav">
          <NavLink
            to="/"
            end
            className={({ isActive }) => `admin-nav-item ${isActive ? 'active' : ''}`}
          >
            <BarChart2 size={18} />
            <span>Operational Metrics</span>
          </NavLink>

          {/* Privileged Gym Verification & Multi-Branch Review */}
          {isAdmin && (
            <NavLink
              to="/gym-verifications"
              className={({ isActive }) => `admin-nav-item ${isActive ? 'active' : ''}`}
            >
              <Building size={18} />
              <span>Gym Verifications</span>
            </NavLink>
          )}

          {isAdmin && (
            <NavLink
              to="/users"
              className={({ isActive }) => `admin-nav-item ${isActive ? 'active' : ''}`}
            >
              <Users size={18} />
              <span>User & Role Governance</span>
            </NavLink>
          )}

          {isAdmin && (
            <NavLink
              to="/store-oversight"
              className={({ isActive }) => `admin-nav-item ${isActive ? 'active' : ''}`}
            >
              <ShoppingBag size={18} />
              <span>Store & Managers</span>
            </NavLink>
          )}

          {(isAdmin || isModerator) && (
            <NavLink
              to="/moderation"
              className={({ isActive }) => `admin-nav-item ${isActive ? 'active' : ''}`}
            >
              <ShieldAlert size={18} />
              <span>Content Moderation</span>
            </NavLink>
          )}

          {(isAdmin || isModerator) && (
            <NavLink
              to="/complaints"
              className={({ isActive }) => `admin-nav-item ${isActive ? 'active' : ''}`}
            >
              <MessageSquare size={18} />
              <span>Complaints Queue</span>
            </NavLink>
          )}

          {isAdmin && (
            <NavLink
              to="/payments"
              className={({ isActive }) => `admin-nav-item ${isActive ? 'active' : ''}`}
            >
              <CreditCard size={18} />
              <span>Payment Verifications</span>
            </NavLink>
          )}

          {isAdmin && (
            <NavLink
              to="/broadcast"
              className={({ isActive }) => `admin-nav-item ${isActive ? 'active' : ''}`}
            >
              <Megaphone size={18} />
              <span>Subscriber Broadcast</span>
            </NavLink>
          )}

          {(isAdmin || isInstructor) && (
            <NavLink
              to="/instructor-tasks"
              className={({ isActive }) => `admin-nav-item ${isActive ? 'active' : ''}`}
            >
              <CheckSquare size={18} />
              <span>Instructor Tasks</span>
            </NavLink>
          )}

          {isSuperAdmin && (
            <NavLink
              to="/audit-logs"
              className={({ isActive }) => `admin-nav-item ${isActive ? 'active' : ''}`}
            >
              <FileText size={18} />
              <span>Senior Audit Trail</span>
            </NavLink>
          )}
        </nav>
      </aside>

      {/* Main Administrative Viewport */}
      <div className="admin-main-viewport">
        <header className="admin-topbar">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '0.95rem', fontWeight: 700, color: '#f3f4f6' }}>
              GymSync Operations Control
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <span style={{
              fontSize: '0.78rem',
              fontWeight: 600,
              padding: '4px 10px',
              borderRadius: '6px',
              background: '#1f2937',
              color: '#93c5fd',
              border: '1px solid #374151'
            }}>
              {user?.name} ({role})
            </span>
            <button
              onClick={handleSignOut}
              className="btn-admin btn-admin-secondary"
              title="End session and log out"
              style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              <LogOut size={15} />
              <span>Logout</span>
            </button>
          </div>
        </header>

        <main className="admin-content-area">
          {children}
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;
