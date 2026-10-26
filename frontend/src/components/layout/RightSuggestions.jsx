import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Building2, ShoppingBag, Star, Sparkles, MapPin, ArrowRight, UserCheck } from 'lucide-react';
import { getSafeImageUrl } from '../../utils/imageUtils';
import './RightSuggestions.css';

const RightSuggestions = () => {
  const userRole = localStorage.getItem('gymsync_role') || '';
  const normalizedRole = userRole.toLowerCase().replace(/[_\s]/g, '');
  const isGymTrainer = normalizedRole === 'gymtrainer';
  const isGymOwner = normalizedRole === 'gymowner' || normalizedRole === 'gym_owner';
  const isStoreManager = normalizedRole === 'storemanager';
  const isFitnessInstructor = normalizedRole === 'fitnessinstructor';
  const isStaff = ['admin', 'superadmin', 'complaintmoderator', 'gymowner', 'gym_owner', 'fitnessinstructor', 'gymtrainer', 'storemanager'].includes(normalizedRole);
  const trainerGymName = localStorage.getItem('gymsync_user_gym') || 'PowerHouse Gym';

  const [gym, setGym] = useState(null);
  const [product, setProduct] = useState(null);
  const [suggestion, setSuggestion] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    setLoading(true);

    const fetchRealData = async () => {
      try {
        // Fetch Real Live Data concurrently from Backend
        const [gymsRes, productsRes, suggestionsRes] = await Promise.all([
          fetch('/api/gyms').catch(() => null),
          fetch('/api/store/products').catch(() => null),
          fetch('/api/suggestions').catch(() => null)
        ]);

        if (!isMounted) return;

        if (gymsRes && gymsRes.ok) {
          const gymsData = await gymsRes.json();
          if (Array.isArray(gymsData) && gymsData.length > 0) {
            // Pick top rated or first gym from DB
            setGym(gymsData[0]);
          }
        }

        if (productsRes && productsRes.ok) {
          const productsData = await productsRes.json();
          const items = Array.isArray(productsData) ? productsData : (productsData?.products || []);
          if (items.length > 0) {
            setProduct(items[0]);
          }
        }

        if (suggestionsRes && suggestionsRes.ok) {
          const suggData = await suggestionsRes.json();
          if (Array.isArray(suggData) && suggData.length > 0) {
            setSuggestion(suggData[0]);
          }
        }
      } catch {
        // Graceful error handling
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchRealData();
    return () => { isMounted = false; };
  }, []);

  return (
    <aside className="right-suggestions-area">
      <div className="suggestions-header">
        <h3 className="suggestions-title">
          <Sparkles size={18} color="var(--primary-accent)" />
          Suggestions & Discover
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
            <div className="suggestion-card" style={{ border: '1px solid rgba(139, 92, 246, 0.35)', background: 'var(--card-bg)' }}>
              <span className="suggestion-card-tag" style={{ background: 'rgba(139, 92, 246, 0.15)', color: '#a78bfa' }}>
                <Building2 size={14} /> Facility Operations
              </span>
              <div className="suggestion-card-body" style={{ padding: '14px 16px' }}>
                <h4 className="suggestion-card-title">Manage Your Gym</h4>
                <span className="suggestion-card-meta">
                  <Building2 size={13} /> Facility Owner Hub
                </span>
                <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', margin: '8px 0 0 0', lineHeight: 1.4 }}>
                  Monitor member check-ins, verify branches, and manage on-duty trainers.
                </p>
              </div>
              <Link 
                to="/gym-owner" 
                className="btn-primary suggestion-card-btn" 
                style={{ margin: '0 16px 14px 16px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', background: 'linear-gradient(135deg, #8b5cf6, #7c3aed)' }}
              >
                Open Gym Panel <ArrowRight size={14} />
              </Link>
            </div>
          )}

          {/* Trainer Workspace Shortcut Card */}
          {isGymTrainer && (
            <div className="suggestion-card" style={{ border: '1px solid rgba(59, 130, 246, 0.35)', background: 'var(--card-bg)' }}>
              <span className="suggestion-card-tag" style={{ background: 'rgba(59, 130, 246, 0.15)', color: '#60a5fa' }}>
                <UserCheck size={14} /> Trainer Workspace
              </span>
              <div className="suggestion-card-body" style={{ padding: '14px 16px' }}>
                <h4 className="suggestion-card-title">{trainerGymName}</h4>
                <span className="suggestion-card-meta">
                  <Building2 size={13} /> Official Certified Staff
                </span>
                <span className="suggestion-card-meta" style={{ color: '#10b981', fontWeight: 600 }}>
                  ● Active On-Duty
                </span>
                <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', margin: '8px 0 0 0', lineHeight: 1.4 }}>
                  Assign workout routines and monitor client training progress.
                </p>
              </div>
              <Link 
                to="/gym-trainer" 
                className="btn-primary suggestion-card-btn" 
                style={{ margin: '0 16px 14px 16px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
              >
                Open Trainer Portal <ArrowRight size={14} />
              </Link>
            </div>
          )}

          {/* Consumer Only: Dynamic Admin Suggestion Banner */}
          {!isStaff && suggestion && (
            <div className="community-pulse-card">
              <span className="suggestion-card-tag">
                <Sparkles size={14} /> Spotlight
              </span>
              <h4 className="community-pulse-title">{suggestion.title}</h4>
              <p className="community-pulse-text">{suggestion.description}</p>
            </div>
          )}

          {/* Consumer Only: Real Suggested Gym from DB */}
          {!isStaff && gym && (
            <div className="suggestion-card">
              <span className="suggestion-card-tag">
                <Building2 size={14} /> Featured Gym
              </span>
              {gym.image || gym.equipmentImages?.[0] ? (
                <img 
                  src={getSafeImageUrl(gym.image || gym.equipmentImages[0])} 
                  alt={gym.name} 
                  className="suggestion-card-image" 
                  onError={(e) => { e.target.style.display = 'none'; }}
                />
              ) : null}
              <div className="suggestion-card-body">
                <h4 className="suggestion-card-title">{gym.name}</h4>
                {gym.location && (
                  <span className="suggestion-card-meta">
                    <MapPin size={13} /> {gym.location}
                  </span>
                )}
                {gym.rating && (
                  <span className="suggestion-card-meta">
                    <Star size={13} fill="#f59e0b" color="#f59e0b" /> {gym.rating} / 5.0 Rating
                  </span>
                )}
                {gym.monthlyFee && (
                  <span className="suggestion-card-price">
                    ${gym.monthlyFee} / month
                  </span>
                )}
              </div>
              <Link to={`/gym/${gym._id || gym.id}`} className="btn-primary suggestion-card-btn">
                View Gym Details <ArrowRight size={14} />
              </Link>
            </div>
          )}

          {/* Real Suggested Product from Store DB (Shown to All Roles) */}
          {product && (
            <div className="suggestion-card">
              <span className="suggestion-card-tag">
                <ShoppingBag size={14} /> Recommended Gear
              </span>
              {product.image ? (
                <img 
                  src={product.image} 
                  alt={product.name} 
                  className="suggestion-card-image" 
                  onError={(e) => { e.target.style.display = 'none'; }}
                />
              ) : null}
              <div className="suggestion-card-body">
                <h4 className="suggestion-card-title">{product.name}</h4>
                {product.category && (
                  <span className="suggestion-card-meta">
                    Category: {product.category}
                  </span>
                )}
                <span className="suggestion-card-price">
                  ${product.price}
                </span>
              </div>
              <Link to="/store" className="btn-outline suggestion-card-btn">
                Shop in Store <ArrowRight size={14} />
              </Link>
            </div>
          )}

          {/* Role-Specific Coaching / Fitness / Management Tip */}
          {isGymOwner ? (
            <div className="community-pulse-card">
              <h4 className="community-pulse-title">
                🏢 Facility Tip
              </h4>
              <p className="community-pulse-text">
                Keep your branch registration documents verified and monitor daily member attendance check-ins.
              </p>
            </div>
          ) : isGymTrainer ? (
            <div className="community-pulse-card">
              <h4 className="community-pulse-title">
                📋 Coaching Protocol
              </h4>
              <p className="community-pulse-text">
                Track progressive overload and volume tolerance for your assigned trainees to prevent training burnout.
              </p>
            </div>
          ) : isStoreManager ? (
            <div className="community-pulse-card">
              <h4 className="community-pulse-title">
                📦 Retail Tip
              </h4>
              <p className="community-pulse-text">
                Maintain adequate inventory of high-demand supplements and sportswear to prevent order stockouts.
              </p>
            </div>
          ) : isFitnessInstructor ? (
            <div className="community-pulse-card">
              <h4 className="community-pulse-title">
                🎯 Curriculum Tip
              </h4>
              <p className="community-pulse-text">
                Publish updated biomechanical cues and rest intervals to assist trainees in the exercise library.
              </p>
            </div>
          ) : (
            <div className="community-pulse-card">
              <h4 className="community-pulse-title">
                💡 Pro Fitness Tip
              </h4>
              <p className="community-pulse-text">
                Consistency beats intensity. Log your daily workout reps and track your form with AI Trainer to prevent injury.
              </p>
            </div>
          )}
        </>
      )}
    </aside>
  );
};

export default RightSuggestions;
