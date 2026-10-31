import React, { useState, useEffect } from 'react';
import { useLocation, Link } from 'react-router-dom';
import {
  Building2,
  ShoppingBag,
  Sparkles,
  MapPin,
  ArrowRight,
  UserCheck,
  Dumbbell,
  ExternalLink,
  Users,
  Trophy,
  Flame
} from 'lucide-react';
import { getSafeImageUrl } from '../../utils/imageUtils';
import {
  trackPageIntent,
  getPersonalizedRecommendationsList,
  getUserInterestProfile
} from '../../features/recommendations/userInterestTracker';
import './RightSuggestions.css';

const RightSuggestions = () => {
  const location = useLocation();
  const userRole = localStorage.getItem('gymsync_role') || '';
  const normalizedRole = userRole.toLowerCase().replace(/[_\s]/g, '');
  const isGymTrainer = normalizedRole === 'gymtrainer';
  const isGymOwner = normalizedRole === 'gymowner' || normalizedRole === 'gym_owner';
  const isStoreManager = normalizedRole === 'storemanager';
  const isFitnessInstructor = normalizedRole === 'fitnessinstructor';
  const isStaffOrOwner = isGymOwner || isGymTrainer || isStoreManager || isFitnessInstructor;
  const trainerGymName = localStorage.getItem('gymsync_user_gym') || 'PowerHouse Gym';

  const [candidates, setCandidates] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [topInterestName, setTopInterestName] = useState('Fitness');

  // Track user page intent whenever route changes
  useEffect(() => {
    trackPageIntent(location.pathname, userRole);
  }, [location.pathname, userRole]);

  // Load and score candidate recommendations from real DB endpoints
  useEffect(() => {
    let isMounted = true;
    setLoading(true);

    const fetchAndRecommend = async () => {
      try {
        const [suggestionsRes, gymsRes, productsRes] = await Promise.all([
          fetch('/api/suggestions').catch(() => null),
          fetch('/api/gyms').catch(() => null),
          fetch('/api/store/products').catch(() => null)
        ]);

        if (!isMounted) return;

        let suggestions = [];
        let fallbackGym = null;
        let fallbackProduct = null;

        if (suggestionsRes && suggestionsRes.ok) {
          const suggData = await suggestionsRes.json();
          if (Array.isArray(suggData)) suggestions = suggData;
        }

        if (gymsRes && gymsRes.ok) {
          const gymsData = await gymsRes.json();
          if (Array.isArray(gymsData) && gymsData.length > 0) fallbackGym = gymsData[0];
        }

        if (productsRes && productsRes.ok) {
          const productsData = await productsRes.json();
          const items = Array.isArray(productsData) ? productsData : (productsData?.products || []);
          if (items.length > 0) fallbackProduct = items[0];
        }

        // Get user interest profile for display
        const profile = getUserInterestProfile();
        const interestLabels = {
          strength: 'Strength & Form',
          nutrition: 'Diet & Nutrition',
          gyms: 'Local Facilities',
          cardio: 'Endurance & Cardio',
          facility_ops: 'Facility Operations'
        };
        setTopInterestName(interestLabels[profile.lastCategory] || 'Your Interests');

        // Get ranked pool of organic recommendations based on user interest
        const list = getPersonalizedRecommendationsList({
          suggestions,
          fallbackGym,
          fallbackProduct,
          userRole
        });

        if (isMounted && list.length > 0) {
          setCandidates(list);

          // Stable recommendation for the session (cooldown of 5 minutes before advancing)
          const sessionKey = 'gymsync_active_suggestion_idx';
          const lastTimeKey = 'gymsync_active_suggestion_time';
          const now = Date.now();
          const lastTime = parseInt(sessionStorage.getItem(lastTimeKey) || '0', 10);
          let idx = parseInt(sessionStorage.getItem(sessionKey) || '0', 10);

          if (now - lastTime > 300000 || isNaN(idx) || idx >= list.length) {
            idx = (isNaN(idx) ? 0 : idx + 1) % list.length;
            sessionStorage.setItem(sessionKey, idx.toString());
            sessionStorage.setItem(lastTimeKey, now.toString());
          }
          setCurrentIndex(idx);
        }
      } catch (err) {
        console.warn('Recommendation engine load error:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchAndRecommend();
    return () => { isMounted = false; };
  }, [userRole, location.pathname]);

  const activeItem = candidates[currentIndex] || candidates[0] || null;

  const renderActionLink = (url, label, className = 'btn-primary suggestion-card-btn', customStyle = {}) => {
    const targetUrl = url || '/explore';
    const isExternal = targetUrl.startsWith('http://') || targetUrl.startsWith('https://');

    if (isExternal) {
      return (
        <a
          href={targetUrl}
          target="_blank"
          rel="noopener noreferrer"
          className={className}
          style={customStyle}
        >
          {label} <ExternalLink size={12} />
        </a>
      );
    }

    return (
      <Link to={targetUrl} className={className} style={customStyle}>
        {label} <ArrowRight size={12} />
      </Link>
    );
  };

  const getTypeIcon = (type) => {
    switch (type) {
      case 'Gym': return <Building2 size={12} />;
      case 'Exercise': return <Dumbbell size={12} />;
      case 'Product': return <ShoppingBag size={12} />;
      case 'User': return <Users size={12} />;
      case 'Leaderboard': return <Trophy size={12} />;
      case 'Program': return <Flame size={12} />;
      default: return <Sparkles size={12} />;
    }
  };

  const getTypeTagClass = (type) => {
    switch (type) {
      case 'Gym': return 'suggestion-card-tag tag-gym';
      case 'Exercise': return 'suggestion-card-tag tag-exercise';
      case 'Product': return 'suggestion-card-tag tag-product';
      case 'User': return 'suggestion-card-tag tag-user';
      case 'Leaderboard': return 'suggestion-card-tag tag-leaderboard';
      case 'Program': return 'suggestion-card-tag tag-program';
      default: return 'suggestion-card-tag';
    }
  };

  return (
    <aside className="right-suggestions-area">
      {/* Clean Header: "Suggested For You" without dots or "For You" chip */}
      <div className="suggestions-header">
        <h3 className="suggestions-title">
          <Sparkles size={16} color="var(--primary-accent)" />
          Suggested For You
        </h3>
      </div>

      {loading ? (
        <>
          <div className="skeleton-card" />
          <div className="skeleton-card" />
        </>
      ) : (
        <>
          {/* Gym Owner Workspace Shortcut Card */}
          {isGymOwner && (
            <div className="suggestion-card" style={{ border: '1px solid rgba(139, 92, 246, 0.35)' }}>
              <span className="suggestion-card-tag" style={{ color: '#a78bfa' }}>
                <Building2 size={12} /> Facility Operations
              </span>
              <div className="suggestion-card-body">
                <h4 className="suggestion-card-title">Manage Your Gym</h4>
                <span className="suggestion-card-meta">
                  <Building2 size={12} /> Facility Owner Hub
                </span>
                <p className="suggestion-card-desc">
                  Monitor member check-ins, verify branches, and manage on-duty trainers.
                </p>
              </div>
              <Link 
                to="/gym-owner" 
                className="btn-primary suggestion-card-btn" 
                style={{ background: 'linear-gradient(135deg, #8b5cf6, #7c3aed)' }}
              >
                Open Gym Panel <ArrowRight size={12} />
              </Link>
            </div>
          )}

          {/* Trainer Workspace Shortcut Card */}
          {isGymTrainer && (
            <div className="suggestion-card" style={{ border: '1px solid rgba(59, 130, 246, 0.35)' }}>
              <span className="suggestion-card-tag" style={{ color: '#60a5fa' }}>
                <UserCheck size={12} /> Trainer Workspace
              </span>
              <div className="suggestion-card-body">
                <h4 className="suggestion-card-title">{trainerGymName}</h4>
                <span className="suggestion-card-meta">
                  <Building2 size={12} /> Official Certified Staff
                </span>
                <p className="suggestion-card-desc">
                  Assign workout routines and monitor client training progress.
                </p>
              </div>
              <Link 
                to="/gym-trainer" 
                className="btn-primary suggestion-card-btn" 
              >
                Open Trainer Portal <ArrowRight size={12} />
              </Link>
            </div>
          )}

          {/* Dynamic Recommendation Card (Stable, Contextual, 100% Real DB) */}
          {activeItem && (
            <div className="suggestion-card">
              <span className={getTypeTagClass(activeItem.type)}>
                {getTypeIcon(activeItem.type)} {activeItem.badge || (
                  activeItem.type === 'Gym' ? 'Recommended Gym' :
                  activeItem.type === 'Exercise' ? 'Form Guide' :
                  activeItem.type === 'User' ? 'Suggested Member' :
                  activeItem.type === 'Leaderboard' ? 'Top Performer' :
                  activeItem.type === 'Program' ? 'Trainer Routine' : 'Gear Pick'
                )}
              </span>

              {/* Special Presentation for Community Member suggestion */}
              {activeItem.type === 'User' ? (
                <div className="suggestion-user-avatar-wrap">
                  {activeItem.imageUrl ? (
                    <img
                      src={getSafeImageUrl(activeItem.imageUrl)}
                      alt={activeItem.title}
                      className="suggestion-user-avatar"
                      onError={(e) => { e.target.style.display = 'none'; }}
                    />
                  ) : (
                    <div className="suggestion-user-initials">
                      {activeItem.title ? activeItem.title.slice(0, 2).toUpperCase() : 'GS'}
                    </div>
                  )}
                  <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                    <h4 className="suggestion-card-title" title={activeItem.title}>
                      {activeItem.title}
                    </h4>
                    <span className="suggestion-card-meta">
                      <Users size={11} /> {activeItem.meta || 'Community Member'}
                    </span>
                  </div>
                </div>
              ) : (
                activeItem.imageUrl && (
                  <img
                    src={getSafeImageUrl(activeItem.imageUrl)}
                    alt={activeItem.title}
                    className="suggestion-card-image"
                    onError={(e) => { e.target.style.display = 'none'; }}
                  />
                )
              )}

              <div className="suggestion-card-body">
                {activeItem.type !== 'User' && (
                  <h4 className="suggestion-card-title" title={activeItem.title}>
                    {activeItem.title}
                  </h4>
                )}

                {activeItem.type !== 'User' && activeItem.meta && (
                  <span className="suggestion-card-meta">
                    {activeItem.type === 'Gym' && <MapPin size={11} />}
                    {activeItem.type === 'Exercise' && <Dumbbell size={11} />}
                    {activeItem.type === 'Leaderboard' && <Trophy size={11} />}
                    {activeItem.type === 'Program' && <Flame size={11} />}
                    {activeItem.meta}
                  </span>
                )}

                {activeItem.description && (
                  <p className="suggestion-card-desc">
                    {activeItem.description}
                  </p>
                )}
              </div>

              {renderActionLink(
                activeItem.linkUrl || (
                  activeItem.type === 'Product' ? '/store' :
                  activeItem.type === 'Exercise' ? '/ai-trainer' :
                  activeItem.type === 'User' ? `/profile/${encodeURIComponent(activeItem.title)}` :
                  activeItem.type === 'Program' ? '/ai-trainer' : '/explore'
                ),
                activeItem.ctaText || (
                  activeItem.type === 'Product' ? 'Shop in Store' :
                  activeItem.type === 'Exercise' ? 'View Technique' :
                  activeItem.type === 'User' ? 'View Profile' :
                  activeItem.type === 'Program' ? 'Explore Program' : 'View Gym Details'
                ),
                activeItem.type === 'Product' ? 'btn-outline suggestion-card-btn' : 'btn-primary suggestion-card-btn',
                activeItem.type === 'Leaderboard' ? { background: 'linear-gradient(135deg, #f59e0b, #d97706)' } :
                activeItem.type === 'Program' ? { background: 'linear-gradient(135deg, #10b981, #059669)' } :
                activeItem.type === 'User' ? { background: 'linear-gradient(135deg, #8b5cf6, #6366f1)' } : {}
              )}
            </div>
          )}

          {/* Regular Users: Compact Motivation / Tip Card (Zero Cropping, exactly 2 cards) */}
          {!isStaffOrOwner && (
            <div className="community-pulse-card">
              <h4 className="community-pulse-title">
                💡 {topInterestName} Tip
              </h4>
              <p className="community-pulse-text">
                Consistency beats intensity. Log your daily workout reps and track your form with AI Coach.
              </p>
            </div>
          )}
        </>
      )}
    </aside>
  );
};

export default RightSuggestions;
