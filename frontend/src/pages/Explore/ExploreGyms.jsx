import React, { useState, useMemo, useEffect } from 'react';
import { Search, MapPin, Filter, Star, Clock, DollarSign, ChevronRight, ChevronLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useDebounce } from '../../hooks/useDebounce';
import SkeletonLoader from '../../components/common/SkeletonLoader';
import './ExploreGyms.css';

// Live gyms loaded from backend
const ITEMS_PER_PAGE = 3;

const ExploreGyms = () => {
  const [gyms, setGyms] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeFilter, setActiveFilter] = useState('All');
  const [currentPage, setCurrentPage] = useState(1);
  const [isLoading, setIsLoading] = useState(false);

  const debouncedSearch = useDebounce(searchTerm, 300);
  const navigate = useNavigate();

  useEffect(() => {
    setIsLoading(true);
    fetch('/api/gyms')
      .then(res => res.json())
      .then(data => setGyms(data || []))
      .catch(err => console.error('Error loading gyms', err))
      .finally(() => setIsLoading(false));
  }, []);

  // Filtered Gyms based on debounced search term and selected filter
  const filteredGyms = useMemo(() => {
    return gyms.filter(gym => {
      const name = (gym.name || '').toLowerCase();
      const loc = (gym.location || '').toLowerCase();
      const q = debouncedSearch.toLowerCase();
      const matchesSearch = name.includes(q) || loc.includes(q);

      if (!matchesSearch) return false;
      if (activeFilter === 'Under $40') return (gym.monthlyFee || 0) <= 40;
      return true;
    });
  }, [gyms, debouncedSearch, activeFilter]);

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
      {/* Search Header */}
      <div className="explore-header glass-panel">
        <div className="container">
          <h2>Explore Gyms</h2>
          <p>Find the perfect fitness center near you</p>
          
          <div className="search-bar-container">
            <div className="search-input-wrapper">
              <Search className="search-icon" size={20} />
              <input 
                type="text" 
                placeholder="Search by city, area, or gym name..." 
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
              <Filter size={16}/> All
            </button>
            <button 
              className={`filter-btn ${activeFilter === '24 Hours' ? 'active' : ''}`}
              onClick={() => handleFilterChange('24 Hours')}
            >
              <Clock size={16}/> 24 Hours
            </button>
            <button 
              className={`filter-btn ${activeFilter === 'Under $40' ? 'active' : ''}`}
              onClick={() => handleFilterChange('Under $40')}
            >
              <DollarSign size={16}/> Under $40
            </button>
            <button 
              className={`filter-btn ${activeFilter === 'Top Rated' ? 'active' : ''}`}
              onClick={() => handleFilterChange('Top Rated')}
            >
              <Star size={16}/> Top Rated
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container explore-content">
        <div className="map-placeholder glass-panel">
          <div className="map-overlay">
            <MapPin size={48} color="#3b82f6" />
            <h3>Interactive Map View</h3>
            <p>Showing {filteredGyms.length} gyms nearby</p>
          </div>
        </div>

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
            <h3>No gyms found</h3>
            <p style={{ color: 'var(--text-secondary)' }}>Try adjusting your search query or filters.</p>
          </div>
        ) : (
          <>
            <div className="gyms-grid">
              {currentGyms.map((gym) => (
                <div key={gym.id} className="gym-card glass-panel">
                  <div className="gym-image-container">
                    <img 
                      src={gym.image || 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?q=80&w=1470&auto=format&fit=crop'} 
                      alt={gym.name} 
                      loading="lazy" 
                      className="gym-card-img"
                    />
                    {gym.isPremium && <span className="premium-badge">Premium</span>}
                  </div>
                  
                  <div className="gym-details">
                    <div className="gym-title-row">
                      <h3>{gym.name}</h3>
                    </div>

                    <p className="gym-location"><MapPin size={14} /> {gym.location}</p>

                    {gym.todayTrainingTip && gym.todayTrainingTip.length > 0 && (
                      <div style={{ marginTop: '8px' }} className="training-tip">
                        <strong>Tip:</strong> {gym.todayTrainingTip}
                      </div>
                    )}
                    
                    <div className="gym-card-footer">
                      <div className="gym-price">
                        <span className="amount">${gym.monthlyFee || 'N/A'}</span>
                        <span className="period">/month</span>
                      </div>
                      <button 
                        className="btn btn-primary btn-sm"
                        onClick={() => navigate(`/gym/${gym.id}`)}
                      >
                        View Details <ChevronRight size={16} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
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
                  Page <strong>{currentPage}</strong> of <strong>{totalPages}</strong>
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
