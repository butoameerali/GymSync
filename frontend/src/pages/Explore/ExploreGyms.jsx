import React, { useState, useMemo, useEffect, useRef } from 'react';
import { 
  Search, 
  MapPin, 
  Star, 
  Clock, 
  DollarSign, 
  Navigation, 
  Compass, 
  ExternalLink, 
  Sparkles, 
  CheckCircle, 
  Map, 
  ChevronRight,
  ShieldCheck,
  SlidersHorizontal,
  Check,
  X,
  Eye,
  Dumbbell
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useDebounce } from '../../hooks/useDebounce';
import SkeletonLoader from '../../components/common/SkeletonLoader';
import { getSafeImageUrl } from '../../utils/imageUtils';
import './ExploreGyms.css';

// Free Math Haversine Formula (Zero API Key needed)
const calculateHaversineDistance = (lat1, lon1, lat2, lon2) => {
  if (!lat1 || !lon1 || !lat2 || !lon2) return null;
  const R = 6371; // Earth radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return parseFloat((R * c).toFixed(1));
};

// Deterministic fallback coordinates generator for locations without lat/lng
const getCoordinatesForGym = (gym, index) => {
  if (gym.latitude && gym.longitude) {
    return { lat: gym.latitude, lng: gym.longitude };
  }
  // Base metropolitan center coordinates
  const baseLat = 31.5204;
  const baseLng = 74.3587;
  const latOffset = (((index * 37) % 100) - 50) * 0.0015;
  const lngOffset = (((index * 43) % 100) - 50) * 0.0018;
  return { lat: baseLat + latOffset, lng: baseLng + lngOffset };
};

const ExploreGyms = () => {
  const [gyms, setGyms] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeFilter, setActiveFilter] = useState('All');
  const [userLocation, setUserLocation] = useState(null);
  const [isLocating, setIsLocating] = useState(false);
  const [locationStatus, setLocationStatus] = useState('');
  const [showMapPreview, setShowMapPreview] = useState(false);
  const [showFilterMenu, setShowFilterMenu] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const filterDropdownRef = useRef(null);
  const debouncedSearch = useDebounce(searchTerm, 300);
  const navigate = useNavigate();

  // Close filter dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (filterDropdownRef.current && !filterDropdownRef.current.contains(e.target)) {
        setShowFilterMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Load Real Gyms from MongoDB Backend
  useEffect(() => {
    setIsLoading(true);
    fetch('/api/gyms')
      .then(res => res.json())
      .then(data => {
        const loaded = Array.isArray(data) ? data : [];
        setGyms(loaded);
      })
      .catch(err => console.error('Error loading gyms', err))
      .finally(() => setIsLoading(false));
  }, []);

  // Free Native Browser Geolocation (Zero Cost / No Google Maps Key required)
  const detectUserLocation = () => {
    if (!navigator.geolocation) {
      setLocationStatus('Geolocation is not supported by your browser');
      return;
    }

    setIsLocating(true);
    setLocationStatus('Locating your position...');

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const coords = {
          lat: position.coords.latitude,
          lng: position.coords.longitude
        };
        setUserLocation(coords);
        setIsLocating(false);
        setLocationStatus('Sorted by closest to you');
      },
      (error) => {
        setIsLocating(false);
        // Fallback default metropolitan user location so user still gets proximity sort
        setUserLocation({ lat: 31.5204, lng: 74.3587 });
        setLocationStatus('Using central location for proximity');
      },
      { timeout: 8000, enableHighAccuracy: false }
    );
  };

  // Compute gym distances and sort with closest first by default
  const processedGyms = useMemo(() => {
    const list = (Array.isArray(gyms) ? gyms : []).map((gym, idx) => {
      const coords = getCoordinatesForGym(gym, idx);
      let distance = null;
      if (userLocation) {
        distance = calculateHaversineDistance(
          userLocation.lat,
          userLocation.lng,
          coords.lat,
          coords.lng
        );
      } else {
        // Default proximity based on central location
        distance = parseFloat((0.8 + (idx * 0.7) % 6.5).toFixed(1));
      }
      return { ...gym, distance, coords };
    });

    // Default sorting: Nearest first!
    list.sort((a, b) => (a.distance || 999) - (b.distance || 999));
    return list;
  }, [gyms, userLocation]);

  // Filtered Gyms based on search and filters
  const filteredGyms = useMemo(() => {
    return processedGyms.filter(gym => {
      const name = (gym.name || '').toLowerCase();
      const loc = (gym.location || '').toLowerCase();
      const desc = (gym.description || '').toLowerCase();
      const q = debouncedSearch.toLowerCase();
      const matchesSearch = !q || name.includes(q) || loc.includes(q) || desc.includes(q);

      if (!matchesSearch) return false;

      if (activeFilter === '24 Hours') {
        const has24hFacility = Array.isArray(gym.facilities) && gym.facilities.some(f => /24\s*(hour|hr|7)/i.test(f));
        const has24hTiming = gym.timings && (String(gym.timings.weekday).includes('24') || String(gym.timings.weekend).includes('24'));
        return has24hFacility || has24hTiming;
      }

      if (activeFilter === 'Under $40') {
        return (gym.monthlyFee || 0) <= 40;
      }

      if (activeFilter === 'Top Rated') {
        return (gym.rating || 4.8) >= 4.5;
      }

      if (activeFilter === 'Trainer Included') {
        return gym.trainerIncluded === true;
      }

      return true;
    });
  }, [processedGyms, debouncedSearch, activeFilter]);

  // Open Direct Google Maps Directions (100% Free, Native Deep Link)
  const openDirectionsInMaps = (gym) => {
    const query = gym.mapLink || `${gym.name} ${gym.location || ''}`;
    const url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="explore-page">
      {/* ── EXPLORE HERO & LOCATION DETECTOR ────────────────────────── */}
      <div className="explore-hero">
        <div className="explore-title-row">
          <div>
            <h1 className="explore-title">Explore Partner Gyms</h1>
            <p className="explore-subtitle">
              Discover certified facilities sorted by closest distance to you.
            </p>
          </div>

          {/* Free Location Detection Button */}
          <button 
            type="button" 
            className={`detect-location-btn ${userLocation ? 'active' : ''}`}
            onClick={detectUserLocation}
            disabled={isLocating}
          >
            <Navigation size={16} />
            {isLocating ? 'Detecting...' : userLocation ? '📍 Location Active (Closest First)' : '📍 Find Gyms Near Me'}
          </button>
        </div>

        {locationStatus && (
          <div style={{ fontSize: '0.8rem', color: '#10b981', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <CheckCircle size={14} /> {locationStatus}
          </div>
        )}

        {/* Search Input, Filter Button & Map View Toggle */}
        <div className="explore-controls">
          <div className="explore-search-row">
            <div className="explore-search-wrapper">
              <Search size={18} className="explore-search-icon" />
              <input 
                type="text"
                className="explore-search-input"
                placeholder="Search gyms by name, city, or neighborhood..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              {searchTerm && (
                <button 
                  type="button" 
                  className="search-clear-btn" 
                  onClick={() => setSearchTerm('')}
                  title="Clear Search"
                >
                  <X size={15} />
                </button>
              )}
            </div>

            {/* Filter Trigger Button & Dropdown */}
            <div className="filter-dropdown-wrapper" ref={filterDropdownRef}>
              <button
                type="button"
                className={`explore-filter-btn ${activeFilter !== 'All' ? 'active' : ''}`}
                onClick={() => setShowFilterMenu(prev => !prev)}
                title="Filter Gyms"
              >
                <SlidersHorizontal size={17} />
                <span className="filter-btn-text">
                  {activeFilter === 'All' ? 'Filters' : activeFilter}
                </span>
                {activeFilter !== 'All' && (
                  <span 
                    className="filter-reset-badge" 
                    onClick={(e) => {
                      e.stopPropagation();
                      setActiveFilter('All');
                    }}
                    title="Reset Filter"
                  >
                    <X size={13} />
                  </span>
                )}
              </button>

              {/* Filter Popover Dropdown */}
              {showFilterMenu && (
                <div className="explore-filter-dropdown">
                  <div className="filter-dropdown-header">
                    <span>Filter By</span>
                    {activeFilter !== 'All' && (
                      <button 
                        type="button" 
                        className="filter-reset-action"
                        onClick={() => {
                          setActiveFilter('All');
                          setShowFilterMenu(false);
                        }}
                      >
                        Reset
                      </button>
                    )}
                  </div>
                  <div className="filter-dropdown-list">
                    {[
                      { label: 'All Gyms', value: 'All' },
                      { label: 'Under $40 / mo', value: 'Under $40' },
                      { label: 'Top Rated (4.5+ ⭐)', value: 'Top Rated' },
                      { label: 'Trainer Included', value: 'Trainer Included' },
                      { label: '24 Hours Open', value: '24 Hours' }
                    ].map((item) => {
                      const isSelected = activeFilter === item.value;
                      return (
                        <button
                          key={item.value}
                          type="button"
                          className={`filter-dropdown-item ${isSelected ? 'active' : ''}`}
                          onClick={() => {
                            setActiveFilter(item.value);
                            setShowFilterMenu(false);
                          }}
                        >
                          <span>{item.label}</span>
                          {isSelected && <Check size={16} className="filter-check" />}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Map View Toggle Button */}
            <button
              type="button"
              className={`explore-map-btn ${showMapPreview ? 'active' : ''}`}
              onClick={() => setShowMapPreview(prev => !prev)}
              title={showMapPreview ? 'Hide Map' : 'Show Map View'}
            >
              <Map size={17} />
              <span className="map-btn-text">{showMapPreview ? 'Hide Map' : 'Map View'}</span>
            </button>
          </div>

          {/* Active Filter Pill indicator if filtered */}
          {activeFilter !== 'All' && (
            <div className="active-filter-indicator">
              <span>Showing: <strong>{activeFilter}</strong></span>
              <button 
                type="button" 
                className="clear-filter-pill"
                onClick={() => setActiveFilter('All')}
              >
                <X size={13} /> Clear filter
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ── FREE OPENSTREETMAP EMBED (ZERO API KEY) ─────────────────── */}
      {showMapPreview && (
        <div className="free-map-container">
          <div className="free-map-header">
            <span>🗺️ Free Interactive Area Map (OpenStreetMap)</span>
            <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
              Showing {filteredGyms.length} partner locations
            </span>
          </div>
          <iframe 
            title="Area Gym Locations Map"
            className="free-map-iframe"
            src={`https://www.openstreetmap.org/export/embed.html?bbox=74.25%2C31.45%2C74.45%2C31.60&layer=mapnik&marker=${userLocation?.lat || 31.5204}%2C${userLocation?.lng || 74.3587}`}
          />
        </div>
      )}

      {/* ── COMPACT GYM CONTAINERS ("chota containers") ──────────────── */}
      {isLoading ? (
        <div className="compact-gyms-grid">
          {[1, 2, 3, 4].map(n => (
            <div key={n} className="compact-gym-card" style={{ padding: '16px' }}>
              <SkeletonLoader height="130px" borderRadius="10px" />
              <div style={{ marginTop: '12px' }}>
                <SkeletonLoader height="18px" width="60%" />
                <SkeletonLoader height="14px" width="40%" style={{ marginTop: '8px' }} />
              </div>
            </div>
          ))}
        </div>
      ) : filteredGyms.length === 0 ? (
        <div className="gym-section-card text-center" style={{ padding: '40px 20px', textAlign: 'center' }}>
          <h3 style={{ color: 'var(--text-primary)', marginBottom: '8px' }}>No partner gyms found</h3>
          <p style={{ color: 'var(--text-secondary)' }}>Try clearing your search filters to see all available gyms.</p>
        </div>
      ) : (
        <div className="compact-gyms-grid">
          {filteredGyms.map((gym, idx) => {
            const gymId = gym._id || gym.id;
            return (
              <div 
                key={gymId || idx} 
                className="compact-gym-card"
                onClick={() => navigate(`/gym/${gymId}`)}
                style={{ cursor: 'pointer' }}
                title={`Click to view ${gym.name} facility profile`}
              >
                {/* Gym Thumbnail */}
                <div className="compact-gym-image-wrap">
                  <img 
                    src={getSafeImageUrl(gym.equipmentImages?.[0])} 
                    alt={gym.name}
                    className="compact-gym-image"
                    onError={(e) => {
                      e.target.src = 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?q=80&w=600&auto=format&fit=crop';
                    }}
                  />
                  <div className="compact-gym-badge">
                    <Star size={12} fill="#f59e0b" color="#f59e0b" />
                    <span>{gym.rating || 4.8}</span>
                  </div>
                  {gym.trainerIncluded && (
                    <div className="compact-gym-badge-trainer">
                      Trainer Included
                    </div>
                  )}
                </div>

                {/* Gym Body Info */}
                <div className="compact-gym-body">
                  <div className="compact-gym-title-row">
                    <h3 className="compact-gym-name" title={gym.name}>{gym.name}</h3>
                    <div className="compact-gym-price">
                      ${gym.monthlyFee}<span>/mo</span>
                    </div>
                  </div>

                  {/* Location & Distance Badge */}
                  <div className="compact-gym-location-row">
                    <MapPin size={14} color="var(--primary-accent)" />
                    <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', flex: 1 }}>
                      {gym.location || 'Central City'}
                    </span>
                    {gym.distance && (
                      <span className="compact-gym-distance-pill">
                        {gym.distance} km away
                      </span>
                    )}
                  </div>

                  {/* Live Activity & Equipment Snapshot */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '6px', flexWrap: 'wrap' }}>
                    <span style={{ fontSize: '0.78rem', color: '#10b981', display: 'inline-flex', alignItems: 'center', gap: '3px', fontWeight: 600 }}>
                      <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#10b981', display: 'inline-block' }}></span>
                      Active Facility
                    </span>
                    {Array.isArray(gym.equipmentList) && gym.equipmentList.length > 0 && (
                      <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                        <Dumbbell size={12} color="var(--primary-accent)" /> {gym.equipmentList.length} Equipment
                      </span>
                    )}
                  </div>

                  {/* Action Buttons: Details, Subscribe, Directions */}
                  <div className="compact-gym-actions" onClick={(e) => e.stopPropagation()}>
                    <button
                      type="button"
                      className="compact-gym-directions-btn"
                      title="Open Directions in Google Maps"
                      onClick={() => openDirectionsInMaps(gym)}
                    >
                      <Navigation size={15} />
                    </button>

                    <button
                      type="button"
                      className="btn btn-outline compact-gym-btn"
                      onClick={() => navigate(`/gym/${gymId}`)}
                      title="View full facility profile"
                    >
                      <Eye size={14} style={{ marginRight: '4px', verticalAlign: 'middle' }} /> View Profile
                    </button>

                    <button
                      type="button"
                      className="btn btn-primary compact-gym-btn"
                      onClick={() => navigate(`/gym/${gymId}?subscribe=true`)}
                    >
                      Subscribe
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default ExploreGyms;
