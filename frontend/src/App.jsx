import React, { useState, useEffect } from 'react';
import { Routes, Route, useLocation } from 'react-router-dom';
import Navbar from './components/layout/Navbar';
import Footer from './components/layout/Footer';
import AuthPortal from './pages/Auth/AuthPortal';
import AITrainer from './pages/AITrainer/AITrainer';
import RunningTracker from './pages/Running/RunningTracker';
import ExploreGyms from './pages/Explore/ExploreGyms';
import GymDetails from './pages/Explore/GymDetails';
import Home from './pages/Home/Home';
import Profile from './pages/Profile/Profile';
import PublicProfile from './pages/Profile/PublicProfile';
import YourGym from './pages/YourGym/YourGym';
import Store from './pages/Store/Store';
import NotFound from './pages/NotFound/NotFound';
import GlobalChat from './components/chat/GlobalChat';
import OnboardingWizard from './components/onboarding/OnboardingWizard';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import './App.css';

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
        // If they haven't skipped today, show it
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
    <div className="app-container">
      <ToastContainer position="top-right" autoClose={3000} theme="dark" />
      {!isAuthPage && <Navbar />}
      <main className="main-content">
        <Routes>
          <Route path="/" element={<AuthPortal />} />
          <Route path="/ai-trainer" element={<AITrainer />} />
          <Route path="/running" element={<RunningTracker />} />
          <Route path="/explore" element={<ExploreGyms />} />
          <Route path="/gym/:id" element={<GymDetails />} />
          <Route path="/home" element={<Home />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/profile/:userName" element={<PublicProfile />} />
          <Route path="/your-gym" element={<YourGym />} />
          <Route path="/store" element={<Store />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
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
  );
}

export default App;
