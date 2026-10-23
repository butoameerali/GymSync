import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Building2, ShoppingBag, Star, Sparkles, MapPin, ArrowRight } from 'lucide-react';
import './RightSuggestions.css';

const RightSuggestions = () => {
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
      } catch (err) {
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
          {/* Dynamic Admin Suggestion Banner if exists */}
          {suggestion && (
            <div className="community-pulse-card">
              <span className="suggestion-card-tag">
                <Sparkles size={14} /> Spotlight
              </span>
              <h4 className="community-pulse-title">{suggestion.title}</h4>
              <p className="community-pulse-text">{suggestion.description}</p>
            </div>
          )}

          {/* Real Suggested Gym from DB */}
          {gym && (
            <div className="suggestion-card">
              <span className="suggestion-card-tag">
                <Building2 size={14} /> Featured Gym
              </span>
              {gym.image || gym.equipmentImages?.[0] ? (
                <img 
                  src={gym.image || gym.equipmentImages[0]} 
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

          {/* Real Suggested Product from Store DB */}
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

          {/* Fitness Community Tip */}
          <div className="community-pulse-card">
            <h4 className="community-pulse-title">
              💡 Pro Fitness Tip
            </h4>
            <p className="community-pulse-text">
              Consistency beats intensity. Log your daily workout reps and track your form with AI Trainer to prevent injury.
            </p>
          </div>
        </>
      )}
    </aside>
  );
};

export default RightSuggestions;
