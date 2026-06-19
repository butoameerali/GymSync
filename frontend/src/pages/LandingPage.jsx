import React from 'react';
import { Link } from 'react-router-dom';
import { Play, MapPin, Activity, Shield, Users, ShoppingBag } from 'lucide-react';
import './LandingPage.css';

const LandingPage = () => {
  return (
    <div className="landing-page">
      {/* Hero Section */}
      <section className="hero-section">
        <div className="hero-bg-glow"></div>
        <div className="container hero-container">
          <div className="hero-content animate-fade-in">
            <div className="badge glass-panel">
              <span className="pulse-dot"></span>
              The Ultimate Fitness Ecosystem
            </div>
            
            <h1 className="hero-title">
              Train Anywhere. <br />
              Connect With Gyms. <br />
              <span className="text-gradient">Powered By AI.</span>
            </h1>
            
            <p className="hero-subtitle">
              GymSync connects you with nearby gyms, personal trainers, AI coaching, and a thriving fitness community—all in one powerful app.
            </p>
            
            <div className="hero-actions">
              <Link to="/register" className="btn btn-primary btn-lg">Join Free</Link>
              <Link to="/explore" className="btn btn-glass btn-lg">
                <MapPin size={20} />
                Find Gyms
              </Link>
            </div>
          </div>
          
          <div className="hero-visual animate-fade-in" style={{animationDelay: '0.2s'}}>
            {/* We will replace this with a generated image or 3D asset later */}
            <div className="hero-mockup glass-panel">
              <div className="mockup-header">
                <div className="mockup-dot red"></div>
                <div className="mockup-dot yellow"></div>
                <div className="mockup-dot green"></div>
              </div>
              <div className="mockup-content">
                <Activity size={64} className="mockup-icon" />
                <h3>AI Form Analysis</h3>
                <div className="mockup-stats">
                  <div className="stat-bar" style={{width: '85%'}}></div>
                  <div className="stat-bar" style={{width: '60%'}}></div>
                  <div className="stat-bar" style={{width: '92%'}}></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Why GymSync Section */}
      <section className="features-section section">
        <div className="container">
          <div className="section-header">
            <h2 className="section-title">Why <span className="text-gradient">GymSync?</span></h2>
            <p className="section-subtitle">Everything you need to reach your fitness goals, packed into a single platform.</p>
          </div>
          
          <div className="features-grid">
            <div className="feature-card glass-panel">
              <div className="feature-icon-wrapper blue">
                <MapPin size={28} />
              </div>
              <h3>Find Nearby Gyms</h3>
              <p>Discover, compare, and subscribe to local gyms. View 3D tours, equipment lists, and member reviews.</p>
            </div>

            <div className="feature-card glass-panel">
              <div className="feature-icon-wrapper purple">
                <Activity size={28} />
              </div>
              <h3>AI Fitness Coach</h3>
              <p>Real-time form correction using your device camera. Tracks up to 100 exercises offline with perfect accuracy.</p>
            </div>

            <div className="feature-card glass-panel">
              <div className="feature-icon-wrapper green">
                <Shield size={28} />
              </div>
              <h3>Train Offline</h3>
              <p>No internet? No problem. Access your saved workouts, progress, and AI tracking anywhere, anytime.</p>
            </div>

            <div className="feature-card glass-panel">
              <div className="feature-icon-wrapper orange">
                <Users size={28} />
              </div>
              <h3>Social Community</h3>
              <p>Connect with friends, share your transformations, and motivate each other on our dedicated fitness feed.</p>
            </div>

            <div className="feature-card glass-panel">
              <div className="feature-icon-wrapper pink">
                <ShoppingBag size={28} />
              </div>
              <h3>Store & Supplements</h3>
              <p>Buy premium gym wear, proteins, and accessories directly from the app with exclusive discounts.</p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="cta-section section">
        <div className="container">
          <div className="cta-box glass-panel">
            <h2>Ready to transform your life?</h2>
            <p>Join thousands of users achieving their dream physique with GymSync.</p>
            <Link to="/register" className="btn btn-primary btn-lg">Start Your Journey</Link>
          </div>
        </div>
      </section>
    </div>
  );
};

export default LandingPage;
