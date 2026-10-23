import React from 'react';
import { useLocation, Link } from 'react-router-dom';
import { Activity, Sun, Moon, Bell } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import AppSidebar from './AppSidebar';
import RightSuggestions from './RightSuggestions';
import './AppLayout.css';

const AppLayout = ({ children }) => {
  const location = useLocation();
  const { theme, toggleTheme } = useTheme();

  // Pages that display the right suggestions column (20% width)
  // On Home, Explore, Store, Social views, the 3-column layout shines!
  const hasRightSidebar = ['/home', '/', '/explore', '/store'].includes(location.pathname);

  return (
    <div className="app-3col-layout">
      {/* Mobile Top Header Bar (Only visible on screens < 768px) */}
      <header className="mobile-top-header">
        <Link to="/home" className="mobile-top-logo">
          <Activity size={22} color="var(--primary-accent)" />
          <span>GymSync</span>
        </Link>
        <div className="mobile-top-actions">
          <button 
            type="button" 
            onClick={toggleTheme} 
            className="btn-icon" 
            style={{ padding: '6px', border: 'none', background: 'none' }}
            title="Toggle Theme"
          >
            {theme === 'dark' ? <Sun size={18} color="#f59e0b" /> : <Moon size={18} color="#3b82f6" />}
          </button>
          <Link to="/notifications" className="btn-icon" style={{ padding: '6px', border: 'none', background: 'none', color: 'var(--text-primary)' }}>
            <Bell size={18} />
          </Link>
        </div>
      </header>

      {/* Left Navigation Column: 20% width */}
      <div className="app-left-column">
        <AppSidebar />
      </div>

      {/* Middle Content Column: 60% width (or 80% if right sidebar not needed) */}
      <main className={`app-middle-column ${!hasRightSidebar ? 'full-width' : ''}`}>
        {children}
      </main>

      {/* Right Suggestions Column: 20% width */}
      {hasRightSidebar && (
        <div className="app-right-column">
          <RightSuggestions />
        </div>
      )}
    </div>
  );
};

export default AppLayout;
