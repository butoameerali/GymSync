import React, { useState, useEffect, lazy, Suspense } from 'react';
import { Routes, Route, useLocation, Navigate } from 'react-router-dom';
import AppLayout from './components/layout/AppLayout';
import GlobalChat from './components/chat/GlobalChat';
import OnboardingWizard from './components/onboarding/OnboardingWizard';
import ErrorBoundary from './components/common/ErrorBoundary';
import ProtectedRoute from './components/common/ProtectedRoute';
import LoadingSpinner from './components/common/LoadingSpinner';
import AdminPortalRedirectNotice from './components/common/AdminPortalRedirectNotice';
import MedicalDisclaimerModal from './components/common/MedicalDisclaimerModal';
import { getRoleRedirectPath, useAuth } from './context/AuthContext';
import { useTheme } from './context/ThemeContext';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import './App.css';

// Lazy-loaded pages for optimal performance & code splitting
const AuthPortal = lazy(() => import('./pages/Auth/AuthPortal'));
const AITrainer = lazy(() => import('./pages/AITrainer/AITrainer'));
const RunningTracker = lazy(() => import('./pages/Running/RunningTracker'));
const ExploreGyms = lazy(() => import('./pages/Explore/ExploreGyms'));
const GymDetails = lazy(() => import('./pages/Explore/GymDetails'));
const Home = lazy(() => import('./pages/Home/Home'));
const ReelsPage = lazy(() => import('./pages/Reels/ReelsPage'));
const Profile = lazy(() => import('./pages/Profile/Profile'));
const PublicProfile = lazy(() => import('./pages/Profile/PublicProfile'));
const PostDetailPage = lazy(() => import('./pages/PostDetail/PostDetailPage'));
const SettingsPage = lazy(() => import('./pages/Settings/SettingsPage'));
const YourGym = lazy(() => import('./pages/YourGym/YourGym'));
const Store = lazy(() => import('./pages/Store/Store'));
const AdminDashboard = lazy(() => import('./pages/Admin/AdminDashboard'));
const GymOwnerDashboard = lazy(() => import('./pages/GymOwner/GymOwnerDashboard'));
const FitnessInstructorDashboard = lazy(() => import('./pages/FitnessInstructor/FitnessInstructorDashboard'));
const GymTrainerDashboard = lazy(() => import('./pages/GymTrainer/GymTrainerDashboard'));
const StoreManagerDashboard = lazy(() => import('./pages/StoreManager/StoreManagerDashboard'));
const ComplaintModeratorDashboard = lazy(() => import('./pages/ComplaintModerator/ComplaintModeratorDashboard'));
const UserDashboard = lazy(() => import('./pages/User/UserDashboard'));
const NotificationsPage = lazy(() => import('./pages/Notifications/NotificationsPage'));
const MessagesPage = lazy(() => import('./pages/Messages/MessagesPage'));
const LegalPage = lazy(() => import('./pages/Legal/LegalPage'));
const NotFound = lazy(() => import('./pages/NotFound/NotFound'));
const RootRoute = () => {
  const token = localStorage.getItem('gymsync_token');
  const userRole = localStorage.getItem('gymsync_role');
  if (token && userRole && userRole !== 'guest') {
    return <Navigate to={getRoleRedirectPath(userRole)} replace />;
  }
  return <Navigate to="/login" replace />;
};

const ConsumerRoute = ({ children }) => {
  const userRole = localStorage.getItem('gymsync_role') || '';
  const normalized = userRole.toLowerCase().replace(/[_\s]/g, '');
  const staffRoles = ['fitnessinstructor', 'gymtrainer', 'gymowner', 'storemanager', 'complaintmoderator', 'admin', 'superadmin'];
  if (staffRoles.includes(normalized)) {
    return <Navigate to={getRoleRedirectPath(userRole)} replace />;
  }
  return children;
};

function App() {
  const location = useLocation();
  const isAuthPage = ['/login', '/register', '/forgot-password'].includes(location.pathname);
  const [showOnboarding, setShowOnboarding] = useState(false);

  useEffect(() => {
    // Check onboarding status - only auto-prompt once for consumer trainees if never dismissed or completed
    const userName = localStorage.getItem('gymsync_user_name');
    const role = (localStorage.getItem('gymsync_role') || '').toLowerCase().replace(/[\s_]/g, '');
    const isConsumer = role === 'user' || role === 'member';
    if (!isAuthPage && userName && userName !== 'Guest User' && isConsumer) {
      const isCompleted = localStorage.getItem('gymsync_onboarding_completed') === 'true';
      const isDismissed = localStorage.getItem('gymsync_onboarding_dismissed') === 'true';
      if (!isCompleted && !isDismissed) {
        setShowOnboarding(true);
      }
    }

    const handleOpenWizard = () => setShowOnboarding(true);
    window.addEventListener('open-onboarding', handleOpenWizard);
    return () => window.removeEventListener('open-onboarding', handleOpenWizard);
  }, [isAuthPage]);

  const handleSkipOnboarding = () => {
    localStorage.setItem('gymsync_onboarding_dismissed', 'true');
    localStorage.setItem('gymsync_onboarding_completed', 'true');
    setShowOnboarding(false);
  };

  const handleCompleteOnboarding = () => {
    localStorage.setItem('gymsync_onboarding_completed', 'true');
    localStorage.setItem('gymsync_onboarding_dismissed', 'true');
    setShowOnboarding(false);
  };

  const { theme } = useTheme();

  const appRoutes = (
    <Suspense fallback={<LoadingSpinner size="large" message="Loading GymSync module..." />}>
      <Routes>
        <Route path="/" element={<RootRoute />} />
        <Route path="/login" element={<AuthPortal />} />
        <Route path="/register" element={<AuthPortal />} />
        <Route path="/forgot-password" element={<AuthPortal />} />
        
        {/* Trainee Workout Routes strictly guarded to Trainees only */}
        <Route path="/ai-trainer" element={<ProtectedRoute allowedRoles={['User']}><AITrainer /></ProtectedRoute>} />
        <Route path="/running" element={<ProtectedRoute allowedRoles={['User']}><RunningTracker /></ProtectedRoute>} />
        
        {/* Public Gym Discovery & Store: accessible to all users and owners for public profile inspection */}
        <Route path="/explore" element={<ExploreGyms />} />
        <Route path="/gym/:id" element={<GymDetails />} />
        <Route path="/store" element={<Store />} />
        
        {/* Public Standalone Post Details View (Accessible without login; actions require login) */}
        <Route path="/post/:id" element={<PostDetailPage />} />

        {/* Trainee Hub & Dashboard: strictly guarded to trainee users only */}
        <Route path="/dashboard" element={<ProtectedRoute allowedRoles={['User']}><UserDashboard /></ProtectedRoute>} />
        <Route path="/your-gym" element={<ProtectedRoute allowedRoles={['User']}><YourGym /></ProtectedRoute>} />
        
        {/* Protected Universal Community Routes (All authenticated roles participate in social feed, profile & chat) */}
        <Route path="/home" element={<ProtectedRoute><Home /></ProtectedRoute>} />
        <Route path="/reels" element={<ProtectedRoute><ReelsPage /></ProtectedRoute>} />
        <Route path="/notifications" element={<ProtectedRoute><NotificationsPage /></ProtectedRoute>} />
        <Route path="/messages" element={<ProtectedRoute><MessagesPage /></ProtectedRoute>} />
        <Route path="/chat" element={<ProtectedRoute><MessagesPage /></ProtectedRoute>} />
        <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
        
        {/* Settings & Privacy Deep Links */}
        <Route path="/settings" element={<ProtectedRoute><SettingsPage /></ProtectedRoute>} />
        <Route path="/settings/:section" element={<ProtectedRoute><SettingsPage /></ProtectedRoute>} />
        
        {/* Privileged Operational Management Redirects (Hosted on isolated Admin Portal port 5174; strictly protected to admin roles) */}
        <Route path="/admin" element={<ProtectedRoute allowedRoles={['Admin', 'SuperAdmin']}><AdminPortalRedirectNotice targetRole="Administrators" /></ProtectedRoute>} />
        <Route path="/moderator" element={<ProtectedRoute allowedRoles={['ComplaintModerator', 'SuperAdmin', 'Admin']}><AdminPortalRedirectNotice targetRole="Complaint Moderators" /></ProtectedRoute>} />

        {/* Public Website Role-Specific Management Panels */}
        <Route path="/fitness-instructor" element={<ProtectedRoute allowedRoles={['FitnessInstructor']}><FitnessInstructorDashboard /></ProtectedRoute>} />
        <Route path="/gym-owner" element={<ProtectedRoute allowedRoles={['GymOwner', 'gym_owner']}><GymOwnerDashboard /></ProtectedRoute>} />
        <Route path="/gym-trainer" element={<ProtectedRoute allowedRoles={['GymTrainer', 'GymOwner', 'gym_owner']}><GymTrainerDashboard /></ProtectedRoute>} />
        <Route path="/store-manager" element={<ProtectedRoute allowedRoles={['StoreManager']}><StoreManagerDashboard /></ProtectedRoute>} />
        <Route path="/privacy" element={<LegalPage type="privacy" />} />
        <Route path="/terms" element={<LegalPage type="terms" />} />
        <Route path="/regulations" element={<LegalPage type="regulations" />} />
        <Route path="/disclaimer" element={<LegalPage type="disclaimer" />} />
        <Route path="/medical-disclaimer" element={<LegalPage type="disclaimer" />} />
        <Route path="/legal" element={<LegalPage type="terms" />} />
        
        <Route path="/profile/:userName" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Suspense>
  );

  const { user, isAuthenticated, acceptDisclaimer } = useAuth();
  const normalizedUserRole = String(user?.role || '').toLowerCase().replace(/[\s_]/g, '');
  const isConsumerRole = normalizedUserRole === 'user' || normalizedUserRole === 'member';
  const needsDisclaimer = Boolean(
    isAuthenticated &&
    user &&
    isConsumerRole &&
    !user.disclaimerAcceptedAt &&
    !isAuthPage &&
    user.role !== 'guest'
  );

  return (
    <ErrorBoundary key={location.key}>
      <div className="app-container">
        <ToastContainer position="top-right" autoClose={3000} theme={theme === 'dark' ? 'dark' : 'light'} />
        {isAuthPage ? (
          <main className="main-content-auth" style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {appRoutes}
          </main>
        ) : (
          <AppLayout>
            {appRoutes}
          </AppLayout>
        )}
        <GlobalChat />
        {needsDisclaimer && (
          <MedicalDisclaimerModal onAccept={acceptDisclaimer} />
        )}
        {showOnboarding && !needsDisclaimer && (
          <OnboardingWizard 
            onComplete={handleCompleteOnboarding} 
            onSkip={handleSkipOnboarding} 
          />
        )}
      </div>
    </ErrorBoundary>
  );
}

export default App;
