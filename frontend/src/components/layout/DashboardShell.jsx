import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { getNavigationForRole } from '../../config/navigation';
import * as Icons from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import './DashboardShell.css';

const DashboardShell = ({
  userRole = 'User',
  userName = 'User',
  title = 'Dashboard',
  subtitle = 'Welcome to GymSync Management Portal',
  activeTab,
  onTabChange,
  children
}) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();
  const { logout } = useAuth();
  const navigationItems = getNavigationForRole(userRole);

  const handleLogout = () => {
    if (logout) {
      logout();
    } else {
      localStorage.clear();
    }
    navigate('/login');
  };

  const getIconComponent = (iconName) => {
    const Component = Icons[iconName] || Icons.Activity;
    return <Component size={18} />;
  };

  return (
    <div className="dashboard-shell-container">
      {/* Mobile Top Navigation Toggle Bar */}
      <div className="dashboard-shell-mobile-bar">
        <button className="mobile-toggle-btn" onClick={() => setIsSidebarOpen(!isSidebarOpen)}>
          <Icons.Menu size={20} />
          <span>{title} Navigation</span>
        </button>
        <div className="mobile-bar-actions">
          <button type="button" className="mobile-bar-icon-btn" onClick={toggleTheme} title="Toggle Theme">
            {theme === 'dark' ? <Icons.Sun size={18} color="#f59e0b" /> : <Icons.Moon size={18} color="#3b82f6" />}
          </button>
          <Link to="/home" className="mobile-bar-icon-btn" title="Back to Main App">
            <Icons.Home size={18} />
          </Link>
        </div>
      </div>

      <div className="dashboard-shell-layout">
        {/* Mobile Backdrop when drawer is open */}
        {isSidebarOpen && (
          <div 
            className="dashboard-shell-backdrop" 
            onClick={() => setIsSidebarOpen(false)} 
            aria-hidden="true" 
          />
        )}

        {/* Dedicated Standalone Dashboard Sidebar */}
        <aside className={`dashboard-shell-sidebar ${isSidebarOpen ? 'open' : ''}`}>
          {/* Top Brand & User Information */}
          <div className="sidebar-header">
            <Link to="/home" className="portal-brand-link" title="Return to Main GymSync App">
              <div className="portal-brand-icon">
                <Icons.Activity size={22} color="#ffffff" />
              </div>
              <div className="portal-brand-text">
                <span className="portal-brand-title">GymSync</span>
                <span className="sidebar-role-badge">{userRole} Portal</span>
              </div>
            </Link>

            <div className="sidebar-user-card">
              <div className="sidebar-user-avatar">
                {(userName || 'U').charAt(0).toUpperCase()}
              </div>
              <div className="sidebar-user-details">
                <span className="sidebar-user-name">{userName}</span>
                <span className="sidebar-user-role-label">Active {userRole}</span>
              </div>
            </div>
          </div>

          {/* Role Navigation Items */}
          <nav className="sidebar-nav">
            {navigationItems.map((item) => {
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  className={`sidebar-nav-item ${isActive ? 'active' : ''}`}
                  onClick={() => {
                    if (onTabChange) onTabChange(item.id);
                    setIsSidebarOpen(false);
                  }}
                >
                  <span className="nav-item-icon">{getIconComponent(item.icon)}</span>
                  <span className="nav-item-label">{item.label}</span>
                </button>
              );
            })}
          </nav>

          {/* Bottom Actions: Back to Feed, Theme Toggle, Log Out */}
          <div className="sidebar-footer">
            <Link to="/home" className="sidebar-footer-btn" title="Back to GymSync Social Feed">
              <Icons.ArrowLeft size={16} />
              <span>Back to Feed</span>
            </Link>

            <button type="button" className="sidebar-footer-btn" onClick={toggleTheme} title="Switch Theme">
              {theme === 'dark' ? <Icons.Sun size={16} color="#f59e0b" /> : <Icons.Moon size={16} color="#3b82f6" />}
              <span>{theme === 'dark' ? 'Light Mode' : 'Dark Mode'}</span>
            </button>

            <button type="button" className="sidebar-footer-btn danger" onClick={handleLogout} title="Log Out">
              <Icons.LogOut size={16} color="#ef4444" />
              <span>Log Out</span>
            </button>
          </div>
        </aside>

        {/* Dashboard Main Content Area */}
        <main className="dashboard-shell-content">
          <header className="dashboard-content-header glass-panel">
            <div>
              <h1 className="dashboard-title">{title}</h1>
              <p className="dashboard-subtitle">{subtitle}</p>
            </div>
          </header>

          <div className="dashboard-body">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};

export default DashboardShell;
