import React, { useState } from 'react';
import { getNavigationForRole } from '../../config/navigation';
import * as Icons from 'lucide-react';
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
  const navigationItems = getNavigationForRole(userRole);

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
      </div>

      <div className="dashboard-shell-layout">
        {/* Responsive Dashboard Sidebar */}
        <aside className={`dashboard-shell-sidebar ${isSidebarOpen ? 'open' : ''}`}>
          <div className="sidebar-header">
            <div className="sidebar-role-badge">{userRole} Portal</div>
            <div className="sidebar-user-info">
              <span className="sidebar-user-name">{userName}</span>
            </div>
          </div>

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
