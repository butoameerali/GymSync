import React, { useState, useMemo, useEffect } from 'react';
import { Search, MapPin, Filter, Star, Clock, DollarSign, ChevronRight, ChevronLeft, Grid, Map, Layers, Calendar, ShieldCheck, Navigation } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useDebounce } from '../../hooks/useDebounce';
import SkeletonLoader from '../../components/common/SkeletonLoader';
import './ExploreGyms.css';

const ITEMS_PER_PAGE = 6;

// Deterministic map coordinates generator for realistic radar/city plotting
const getGymCoordinates = (gym, index) => {
  // Pre-fixed base coordinates simulating central metropolitan area
  const seedAngles = [30, 75, 140, 210, 280, 330, 110, 190, 250];
  const seedDistances = [28, 45, 36, 52, 60, 42, 68, 55, 72];
  
  const angle = seedAngles[index % seedAngles.length];
  const dist = seedDistances[index % seedDistances.length];
  
  const rad = (angle * Math.PI) / 180;
  // Center is at 50%, 50%
  const x = 50 + (dist * 0.48) * Math.cos(rad);
  const y = 50 + (dist * 0.42) * Math.sin(rad);

  const kmDistance = (0.6 + (index * 0.45) % 3.8).toFixed(1);

  return { x: Math.min(88, Math.max(12, x)), y: Math.min(84, Math.max(16, y)), kmDistance };
};

const ExploreGyms = () => {
  const [gyms, setGyms] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeFilter, setActiveFilter] = useState('All');
  const [viewMode, setViewMode] = useState('grid'); // 'grid', 'split', 'map'
  const [selectedMapGym, setSelectedMapGym] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [isLoading, setIsLoading] = useState(false);

  const debouncedSearch = useDebounce(searchTerm, 300);
  const navigate = useNavigate();

  useEffect(() => {
    setIsLoading(true);
    fetch('/api/gyms')
      .then(res => res.json())
      .then(data => {
        const loaded = Array.isArray(data) ? data : [];
        setGyms(loaded);
        if (loaded.length > 0) {
          setSelectedMapGym(loaded[0]);
        }
      })
      .catch(err => console.error('Error loading gyms', err))
      .finally(() => setIsLoading(false));
  }, []);

  // Filtered Gyms based on debounced search term and selected filter
  const filteredGyms = useMemo(() => {
    return (Array.isArray(gyms) ? gyms : []).filter(gym => {
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

      return true;
    });
  }, [gyms, debouncedSearch, activeFilter]);

  // Keep selected gym aligned with filtered list
  useEffect(() => {
    if (filteredGyms.length > 0 && (!selectedMapGym || !filteredGyms.find(g => (g._id || g.id) === (selectedMapGym._id || selectedMapGym.id)))) {
      setSelectedMapGym(filteredGyms[0]);
    }
  }, [filteredGyms]);

  // Pagination logic
  const totalPages = Math.ceil(filteredGyms.length / ITEMS_PER_PAGE) || 1;
  const currentGyms = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredGyms.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredGyms, currentPage]);

  const handleFilterChange = (filterName) => {
    setActiveFilter(filterName);
    setCurrentPage(1);
  };

  return (
    <div className="explore-page">
      {/* Search & Filter Header */}
      <div className="explore-header glass-panel">
        <div className="container">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px', marginBottom: '20px' }}>
            <div>
              <h2>Explore Partner Gyms</h2>
              <p style={{ margin: 0 }}>Discover certified fitness facilities, compare amenities, schedule tours, and subscribe.</p>
            </div>

            {/* View Mode Switcher */}
            <div className="view-mode-toggle glass-panel" style={{ display: 'flex', padding: '4px', gap: '4px', borderRadius: '12px' }}>
              <button 
                className={`view-toggle-btn ${viewMode === 'grid' ? 'active' : ''}`}
                onClick={() => setViewMode('grid')}
                title="Grid View"
              >
                <Grid size={16} /> Grid
              </button>
              <button 
                className={`view-toggle-btn ${viewMode === 'split' ? 'active' : ''}`}
                onClick={() => setViewMode('split')}
                title="Split Map & List"
              >
                <Layers size={16} /> Split
              </button>
              <button 
                className={`view-toggle-btn ${viewMode === 'map' ? 'active' : ''}`}
                onClick={() => setViewMode('map')}
                title="Interactive Map"
              >
                <Map size={16} /> Radar Map
              </button>
            </div>
          </div>
          
          <div className="search-bar-container">
            <div className="search-input-wrapper">
              <Search className="search-icon" size={20} />
              <input 
                type="text" 
                placeholder="Search by city, neighborhood, or gym name..." 
                className="search-input"
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setCurrentPage(1);
                }}
              />
            </div>
          </div>
          
          <div className="filters-row">
            <button 
              className={`filter-btn ${activeFilter === 'All' ? 'active' : ''}`}
              onClick={() => handleFilterChange('All')}
            >
              <Filter size={16}/> All Gyms ({gyms.length})
            </button>
            <button 
              className={`filter-btn ${activeFilter === '24 Hours' ? 'active' : ''}`}
              onClick={() => handleFilterChange('24 Hours')}
            >
              <Clock size={16}/> 24 Hours Open
            </button>
            <button 
              className={`filter-btn ${activeFilter === 'Under $40' ? 'active' : ''}`}
              onClick={() => handleFilterChange('Under $40')}
            >
              <DollarSign size={16}/> Under $40/mo
            </button>
            <button 
              className={`filter-btn ${activeFilter === 'Top Rated' ? 'active' : ''}`}
              onClick={() => handleFilterChange('Top Rated')}
            >
              <Star size={16}/> Top Rated (4.5★+)
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container explore-content">
        {/* INTERACTIVE RADAR MAP EXPERIENCE */}
        {(viewMode === 'map' || viewMode === 'split' || viewMode === 'grid') && (
          <div className={`interactive-map-container glass-panel ${viewMode === 'map' ? 'full-map-mode' : viewMode === 'split' ? 'split-map-mode' : 'grid-map-mode'}`}>
            <div className="map-radar-canvas">
              {/* Radial rings */}
              <div className="radar-ring ring-1"></div>
              <div className="radar-ring ring-2"></div>
              <div className="radar-ring ring-3"></div>
              
              {/* Grid axes */}
              <div className="radar-axis axis-h"></div>
              <div className="radar-axis axis-v"></div>

              {/* User location pin */}
              <div className="map-user-pin" style={{ left: '50%', top: '50%' }}>
                <div className="user-pin-pulse"></div>
                <div className="user-pin-dot"></div>
                <span className="user-pin-label">Your Location</span>
              </div>

              {/* Plotted Gym Pins */}
              {filteredGyms.map((gymItem, idx) => {
                const coords = getGymCoordinates(gymItem, idx);
                const isSelected = selectedMapGym?._id === gymItem._id;

                return (
                  <div 
                    key={gymItem._id || idx}
                    className={`gym-map-pin ${isSelected ? 'selected' : ''}`}
                    style={{ left: `${coords.x}%`, top: `${coords.y}%` }}
                    onClick={() => setSelectedMapGym(gymItem)}
                  >
                    <div className="pin-pulse"></div>
                    <div className="pin-marker">
                      <MapPin size={16} />
                      <span className="pin-price">${gymItem.monthlyFee || 40}</span>
                    </div>
                    <span className="pin-name-tag">{gymItem.name}</span>
                  </div>
                );
              })}
            </div>

            {/* Map Header Status & Counter */}
            <div className="map-header-bar">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Navigation size={16} color="var(--primary-accent)" />
                <span style={{ fontSize: '0.82rem', fontWeight: 600 }}>Active City Radar View</span>
              </div>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                Showing <strong>{filteredGyms.length}</strong> facilities nearby
              </span>
            </div>

            {/* Floating Active Gym Card On Map */}
            {selectedMapGym && (
              <div className="map-floating-card glass-panel">
                <div style={{ display: 'flex', gap: '14px', alignItems: 'center' }}>
                  <img 
                    src={selectedMapGym.equipmentImages?.[0] || 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?q=80&w=300&auto=format&fit=crop'} 
                    alt={selectedMapGym.name}
                    className="map-card-thumb" 
                  />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <h4 style={{ margin: 0, fontSize: '1rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {selectedMapGym.name}
                      </h4>
                      <span className="badge" style={{ background: 'rgba(245,158,11,0.15)', color: '#f59e0b', fontSize: '0.75rem' }}>
                        ★ 4.8
                      </span>
                    </div>
                    <p style={{ margin: '3px 0 6px 0', fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                      📍 {selectedMapGym.location}
                    </p>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <strong style={{ fontSize: '0.95rem', color: 'var(--primary-accent)' }}>
                        ${selectedMapGym.monthlyFee || 45} <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>/mo</span>
                      </strong>
                      <div style={{ display: 'flex', gap: '6px' }}>
                        <button 
                          className="btn btn-outline btn-sm"
                          style={{ padding: '4px 10px', fontSize: '0.78rem' }}
                          onClick={() => navigate(`/gym/${selectedMapGym._id || selectedMapGym.id}?bookTour=true`)}
                        >
                          <Calendar size={12} /> Book Tour
                        </button>
                        <button 
                          className="btn btn-primary btn-sm"
                          style={{ padding: '4px 10px', fontSize: '0.78rem' }}
                          onClick={() => navigate(`/gym/${selectedMapGym._id || selectedMapGym.id}`)}
                        >
                          Details <ChevronRight size={12} />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* GYMS LIST / GRID */}
        {isLoading ? (
          <div className="gyms-grid">
            {[1, 2, 3].map(n => (
              <div key={n} className="glass-panel" style={{ padding: '20px' }}>
                <SkeletonLoader height="180px" borderRadius="8px" />
                <div style={{ marginTop: '15px' }}>
                  <SkeletonLoader height="20px" width="70%" />
                  <div style={{ marginTop: '10px' }}>
                    <SkeletonLoader height="14px" width="40%" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : filteredGyms.length === 0 ? (
          <div className="glass-panel text-center" style={{ padding: '40px' }}>
            <h3>No partner gyms match your filters</h3>
            <p style={{ color: 'var(--text-secondary)' }}>Try broadening your search term or selecting "All Gyms".</p>
          </div>
        ) : (
          <>
            <div className="gyms-grid">
              {currentGyms.map((gym, idx) => {
                const gymId = gym._id || gym.id;
                return (
                  <div key={gymId || idx} className="gym-card glass-panel">
                    <div className="gym-image-container">
                      <img 
                        src={gym.equipmentImages?.[0] || 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?q=80&w=1470&auto=format&fit=crop'} 
                        alt={gym.name} 
                        className="gym-card-img"
                      />
                      <div className="premium-badge">★ 4.8 Partner</div>
                    </div>
                    
                    <div className="gym-details">
                      <div className="gym-title-row">
                        <h3>{gym.name}</h3>
                        <div className="gym-price">
                          <span className="price-val">${gym.monthlyFee}</span>
                          <span className="price-period">/mo</span>
                        </div>
                      </div>
                      
                      <div className="gym-location">
                        <MapPin size={16} />
                        <span>{gym.location}</span>
                      </div>
                      
                      <p className="gym-desc">
                        {gym.description || 'Modern strength training facility equipped with certified free-weights and machines.'}
                      </p>
                      
                      {gym.facilities && gym.facilities.length > 0 && (
                        <div className="gym-facilities">
                          {gym.facilities.slice(0, 3).map((f, i) => (
                            <span key={i} className="facility-tag">{f}</span>
                          ))}
                          {gym.facilities.length > 3 && (
                            <span className="facility-tag">+{gym.facilities.length - 3} more</span>
                          )}
                        </div>
                      )}
                      
                      <div className="gym-card-actions" style={{ display: 'flex', gap: '8px', marginTop: 'auto', paddingTop: '16px' }}>
                        <button 
                          className="btn btn-outline btn-sm"
                          style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                          onClick={() => navigate(`/gym/${gymId}?bookTour=true`)}
                        >
                          <Calendar size={14} /> Book Tour
                        </button>
                        <button 
                          className="btn btn-primary btn-sm"
                          style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                          onClick={() => navigate(`/gym/${gymId}`)}
                        >
                          Details <ChevronRight size={14} />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="pagination-container glass-panel">
                <button 
                  className="pagination-btn"
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                >
                  <ChevronLeft size={18} /> Previous
                </button>
                <span className="pagination-info">
                  Page <strong>{currentPage}</strong> of <strong>{totalPages}</strong> ({filteredGyms.length} total)
                </span>
                <button 
                  className="pagination-btn"
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                >
                  Next <ChevronRight size={18} />
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default ExploreGyms;
