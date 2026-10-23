import React from 'react';
import { useLocation, Link } from 'react-router-dom';
import { Activity, Sun, Moon, Bell, MessageSquare } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import AppSidebar from './AppSidebar';
import RightSuggestions from './RightSuggestions';
import './AppLayout.css';

const AppLayout = ({ children }) => {
  const location = useLocation();
  const { theme, toggleTheme } = useTheme();
  const { user } = useAuth();
  const token = user?.token || localStorage.getItem('gymsync_token');
  const isLoggedIn = Boolean(token && user?.role !== 'guest');

  // Pages that display the right suggestions column (20% width)
  // On Home, Explore, Store, Social views, the 3-column layout shines!
  const currentPath = (location.pathname || '').toLowerCase();
  const hasRightSidebar = ['/home', '/', '/explore', '/store'].some(p => currentPath === p || currentPath === `${p}/`);
  const isReelsPage = currentPath === '/reels' || currentPath.startsWith('/reels/');
  const isMessagesPage = currentPath === '/messages' || currentPath.startsWith('/messages/') || currentPath === '/chat' || currentPath.startsWith('/chat/');
  const isProfilePage = currentPath === '/profile' || currentPath.startsWith('/profile/');

  return (
    <div className={`app-3col-layout ${isReelsPage ? 'reels-page-active' : ''}`}>
      {/* Mobile Top Header Bar (Only visible on screens < 768px, hide on reels & messages) */}
      {!isReelsPage && !isMessagesPage && (
        <header className="mobile-top-header">
          <Link to="/home" className="mobile-top-logo">
            <Activity size={24} color="var(--primary-accent)" />
            <span>GymSync</span>
          </Link>
          <div className="mobile-top-actions">
            <Link to="/notifications" className="mobile-header-btn" title="Notifications">
              <Bell size={21} />
            </Link>
          </div>
        </header>
      )}

      {/* Left Navigation Column: 20% width */}
      <div className="app-left-column">
        <AppSidebar />
      </div>

      {/* Middle Content Column */}
      <main className={`app-middle-column ${isReelsPage ? 'reels-mode' : isMessagesPage ? 'messages-mode' : isProfilePage ? 'profile-mode' : (!hasRightSidebar ? 'full-width' : '')}`}>
        {children}
      </main>

      {/* Right Suggestions Column: 20% width (or empty placeholder on reels) */}
      {hasRightSidebar ? (
        <div className="app-right-column">
          <RightSuggestions />
        </div>
      ) : isReelsPage ? (
        <div className="app-right-column reels-right-empty" aria-hidden="true" />
      ) : null}
    </div>
  );
};

export default AppLayout;
