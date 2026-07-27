import React, { useState, useEffect, lazy, Suspense } from 'react';
import { Routes, Route, useLocation } from 'react-router-dom';
import Navbar from './components/layout/Navbar';
import Footer from './components/layout/Footer';
import GlobalChat from './components/chat/GlobalChat';
import OnboardingWizard from './components/onboarding/OnboardingWizard';
import ErrorBoundary from './components/common/ErrorBoundary';
import ProtectedRoute from './components/common/ProtectedRoute';
import LoadingSpinner from './components/common/LoadingSpinner';
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
const UserDashboard = lazy(() => import('./pages/User/UserDashboard'));
const NotFound = lazy(() => import('./pages/NotFound/NotFound'));

function App() {
  const location = useLocation();
  const isAuthPage = location.pathname === '/';
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
    <ErrorBoundary>
      <div className="app-container">
        <ToastContainer position="top-right" autoClose={3000} theme="dark" />
        {!isAuthPage && <Navbar />}
        <main className="main-content">
          <Suspense fallback={<LoadingSpinner size="large" message="Loading GymSync module..." />}>
            <Routes>
              <Route path="/" element={<AuthPortal />} />
              <Route path="/ai-trainer" element={<AITrainer />} />
              <Route path="/running" element={<RunningTracker />} />
              <Route path="/explore" element={<ExploreGyms />} />
              <Route path="/gym/:id" element={<GymDetails />} />
              
              {/* Protected Routes */}
              <Route path="/home" element={<ProtectedRoute><Home /></ProtectedRoute>} />
              <Route path="/dashboard" element={<ProtectedRoute><UserDashboard /></ProtectedRoute>} />
              <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
              <Route path="/your-gym" element={<ProtectedRoute><YourGym /></ProtectedRoute>} />
              <Route path="/admin" element={<ProtectedRoute><AdminDashboard /></ProtectedRoute>} />
              <Route path="/gym-owner" element={<ProtectedRoute><GymOwnerDashboard /></ProtectedRoute>} />
              
              <Route path="/profile/:userName" element={<PublicProfile />} />
              <Route path="/store" element={<Store />} />
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
