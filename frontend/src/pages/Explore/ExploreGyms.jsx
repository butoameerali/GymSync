import React, { useState, useMemo } from 'react';
import { Search, MapPin, Filter, Star, Clock, DollarSign, ChevronRight, ChevronLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useDebounce } from '../../hooks/useDebounce';
import SkeletonLoader from '../../components/common/SkeletonLoader';
import './ExploreGyms.css';

// Mock Data for Gyms
const MOCK_GYMS = [
  {
    id: 1,
    name: "Iron Core Fitness",
    location: "Downtown, Metro City",
    distance: "1.2 km",
    rating: 4.8,
    reviews: 124,
    monthlyFee: 45,
    image: "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?q=80&w=1470&auto=format&fit=crop",
    features: ["24 Hours", "Trainers", "Pool"],
    isPremium: true
  },
  {
    id: 2,
    name: "Velocity Gym & Spa",
    location: "Westside Hub",
    distance: "3.5 km",
    rating: 4.5,
    reviews: 89,
    monthlyFee: 30,
    image: "https://images.unsplash.com/photo-1540497077202-7c8a3999166f?q=80&w=1470&auto=format&fit=crop",
    features: ["Cardio Zone", "Sauna"],
    isPremium: false
  },
  {
    id: 3,
    name: "Titan Powerhouse",
    location: "Industrial District",
    distance: "5.0 km",
    rating: 4.9,
    reviews: 312,
    monthlyFee: 60,
    image: "https://images.unsplash.com/photo-1581009146145-b5ef050c2e1e?q=80&w=1470&auto=format&fit=crop",
    features: ["Crossfit", "Powerlifting", "24 Hours"],
    isPremium: true
  },
  {
    id: 4,
    name: "Zenith Wellness",
    location: "Uptown",
    distance: "2.1 km",
    rating: 4.6,
    reviews: 156,
    monthlyFee: 38,
    image: "https://images.unsplash.com/photo-1571902943202-507ec2618e8f?q=80&w=1375&auto=format&fit=crop",
    features: ["Yoga", "Pilates", "Juice Bar"],
    isPremium: false
  },
  {
    id: 5,
    name: "Pulse Performance Club",
    location: "Northside Square",
    distance: "4.2 km",
    rating: 4.7,
    reviews: 201,
    monthlyFee: 35,
    image: "https://images.unsplash.com/photo-1517838277536-f5f99be501cd?q=80&w=1470&auto=format&fit=crop",
    features: ["24 Hours", "Boxing Ring", "Cardio Zone"],
    isPremium: false
  },
  {
    id: 6,
    name: "Apex Elite Athletic Center",
    location: "South Bay Boulevard",
    distance: "6.1 km",
    rating: 4.9,
    reviews: 410,
    monthlyFee: 75,
    image: "https://images.unsplash.com/photo-1593079831268-3381b0db4a77?q=80&w=1470&auto=format&fit=crop",
    features: ["Pool", "Sauna", "Spa", "24 Hours"],
    isPremium: true
  }
];

const ITEMS_PER_PAGE = 3;

const ExploreGyms = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [activeFilter, setActiveFilter] = useState('All');
  const [currentPage, setCurrentPage] = useState(1);
  const [isLoading, setIsLoading] = useState(false);

  const debouncedSearch = useDebounce(searchTerm, 300);
  const navigate = useNavigate();

  // Filtered Gyms based on debounced search term and selected filter
  const filteredGyms = useMemo(() => {
    return MOCK_GYMS.filter(gym => {
      const matchesSearch = gym.name.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
                            gym.location.toLowerCase().includes(debouncedSearch.toLowerCase());
      
      if (!matchesSearch) return false;

      if (activeFilter === '24 Hours') return gym.features.includes('24 Hours');
      if (activeFilter === 'Under $40') return gym.monthlyFee <= 40;
      if (activeFilter === 'Top Rated') return gym.rating >= 4.7;

      return true;
    });
  }, [debouncedSearch, activeFilter]);

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
                      src={gym.image} 
                      alt={gym.name} 
                      loading="lazy" 
                      className="gym-card-img"
                    />
                    {gym.isPremium && <span className="premium-badge">Premium</span>}
                  </div>
                  
                  <div className="gym-details">
                    <div className="gym-title-row">
                      <h3>{gym.name}</h3>
                      <div className="gym-rating">
                        <Star size={16} fill="#f59e0b" color="#f59e0b" />
                        <span>{gym.rating} ({gym.reviews})</span>
                      </div>
                    </div>
                    
                    <p className="gym-location"><MapPin size={14} /> {gym.location} • {gym.distance}</p>
                    
                    <div className="gym-features">
                      {gym.features.map((feature, idx) => (
                        <span key={idx} className="feature-tag">{feature}</span>
                      ))}
                    </div>
                    
                    <div className="gym-card-footer">
                      <div className="gym-price">
                        <span className="amount">${gym.monthlyFee}</span>
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
