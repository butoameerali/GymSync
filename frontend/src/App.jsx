import React, { useState, useEffect, lazy, Suspense } from 'react';
import { Routes, Route, useLocation, Navigate } from 'react-router-dom';
import Navbar from './components/layout/Navbar';
import Footer from './components/layout/Footer';
import GlobalChat from './components/chat/GlobalChat';
import OnboardingWizard from './components/onboarding/OnboardingWizard';
import ErrorBoundary from './components/common/ErrorBoundary';
import ProtectedRoute from './components/common/ProtectedRoute';
import LoadingSpinner from './components/common/LoadingSpinner';
import { getRoleRedirectPath } from './context/AuthContext';
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
const Profile = lazy(() => import('./pages/Profile/Profile'));
const PublicProfile = lazy(() => import('./pages/Profile/PublicProfile'));
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
const LandingPage = lazy(() => import('./pages/LandingPage'));

const RootRoute = () => {
  const token = localStorage.getItem('gymsync_token');
  const userRole = localStorage.getItem('gymsync_role');
  if (token && userRole && userRole !== 'guest') {
    return <Navigate to={getRoleRedirectPath(userRole)} replace />;
  }
  return <LandingPage />;
};

const ConsumerRoute = ({ children }) => {
  const userRole = localStorage.getItem('gymsync_role') || '';
  const normalized = userRole.toLowerCase().replace(/[_\s]/g, '');
  const staffRoles = ['fitnessinstructor', 'gymtrainer', 'gymowner', 'storemanager', 'complaintmoderator'];
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
    // Check onboarding status
    const userName = localStorage.getItem('gymsync_user_name');
    if (!isAuthPage && userName && userName !== 'Guest User') {
      const isCompleted = localStorage.getItem('gymsync_onboarding_completed') === 'true';
      if (!isCompleted) {
        const skipDate = localStorage.getItem('gymsync_onboarding_skip_date');
        const today = new Date().toDateString();
        if (skipDate !== today) {
          setShowOnboarding(true);
        }
      }
    }

    const handleOpenWizard = () => setShowOnboarding(true);
    window.addEventListener('open-onboarding', handleOpenWizard);
    return () => window.removeEventListener('open-onboarding', handleOpenWizard);
  }, [location.pathname, isAuthPage]);

  const handleSkipOnboarding = () => {
    localStorage.setItem('gymsync_onboarding_skip_date', new Date().toDateString());
    setShowOnboarding(false);
  };

  const handleCompleteOnboarding = () => {
    setShowOnboarding(false);
  };

  return (
    <ErrorBoundary key={location.key}>
      <div className="app-container">
        <ToastContainer position="top-right" autoClose={3000} theme="dark" />
        {!isAuthPage && <Navbar />}
        <main className="main-content">
          <Suspense fallback={<LoadingSpinner size="large" message="Loading GymSync module..." />}>
            <Routes>
              <Route path="/" element={<RootRoute />} />
              <Route path="/login" element={<AuthPortal />} />
              <Route path="/register" element={<AuthPortal />} />
              <Route path="/forgot-password" element={<AuthPortal />} />
              
              {/* Trainee Workout Routes guarded from Guest and Staff access */}
              <Route path="/ai-trainer" element={<ProtectedRoute allowedRoles={['User', 'Admin', 'SuperAdmin']}><AITrainer /></ProtectedRoute>} />
              <Route path="/running" element={<ProtectedRoute allowedRoles={['User', 'Admin', 'SuperAdmin']}><RunningTracker /></ProtectedRoute>} />
              
              {/* Public Consumer Gym Discovery & Store: accessible to guests & users, redirected for staff */}
              <Route path="/explore" element={<ConsumerRoute><ExploreGyms /></ConsumerRoute>} />
              <Route path="/gym/:id" element={<ConsumerRoute><GymDetails /></ConsumerRoute>} />
              <Route path="/store" element={<ConsumerRoute><Store /></ConsumerRoute>} />
              
              {/* Trainee Hub & Dashboard: guarded to trainee users and admins */}
              <Route path="/dashboard" element={<ProtectedRoute allowedRoles={['User', 'Admin', 'SuperAdmin']}><UserDashboard /></ProtectedRoute>} />
              <Route path="/your-gym" element={<ProtectedRoute allowedRoles={['User', 'Admin', 'SuperAdmin']}><YourGym /></ProtectedRoute>} />
              
              {/* Protected Universal Community Routes (All authenticated roles participate in social feed, profile & chat) */}
              <Route path="/home" element={<ProtectedRoute><Home /></ProtectedRoute>} />
              <Route path="/notifications" element={<ProtectedRoute><NotificationsPage /></ProtectedRoute>} />
              <Route path="/messages" element={<ProtectedRoute><MessagesPage /></ProtectedRoute>} />
              <Route path="/chat" element={<ProtectedRoute><MessagesPage /></ProtectedRoute>} />
              <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
              
              {/* Role-Specific Management Panels */}
              <Route path="/admin" element={<ProtectedRoute allowedRoles={['Admin', 'SuperAdmin']}><AdminDashboard /></ProtectedRoute>} />
              <Route path="/moderator" element={<ProtectedRoute allowedRoles={['ComplaintModerator', 'Admin', 'SuperAdmin']}><ComplaintModeratorDashboard /></ProtectedRoute>} />
              <Route path="/gym-owner" element={<ProtectedRoute allowedRoles={['GymOwner', 'gym_owner']}><GymOwnerDashboard /></ProtectedRoute>} />
              <Route path="/fitness-instructor" element={<ProtectedRoute allowedRoles={['FitnessInstructor', 'Admin', 'SuperAdmin']}><FitnessInstructorDashboard /></ProtectedRoute>} />
              <Route path="/gym-trainer" element={<ProtectedRoute allowedRoles={['GymTrainer', 'GymOwner', 'gym_owner']}><GymTrainerDashboard /></ProtectedRoute>} />
              <Route path="/store-manager" element={<ProtectedRoute allowedRoles={['StoreManager', 'Admin', 'SuperAdmin']}><StoreManagerDashboard /></ProtectedRoute>} />
              <Route path="/privacy" element={<LegalPage type="privacy" />} />
              <Route path="/terms" element={<LegalPage type="terms" />} />
              <Route path="/regulations" element={<LegalPage type="regulations" />} />
              
              <Route path="/profile/:userName" element={<PublicProfile />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
        </main>
        <GlobalChat />
        {!isAuthPage && <Footer />}
        
        {showOnboarding && (
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
