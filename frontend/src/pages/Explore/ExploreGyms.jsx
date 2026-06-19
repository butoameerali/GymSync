import React, { useState } from 'react';
import { Search, MapPin, Filter, Star, Clock, DollarSign, ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import './ExploreGyms.css';

// Mock Data for FYP display
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
    monthlyFee: 50,
    image: "https://images.unsplash.com/photo-1571902943202-507ec2618e8f?q=80&w=1375&auto=format&fit=crop",
    features: ["Yoga", "Pilates", "Juice Bar"],
    isPremium: false
  }
];

const ExploreGyms = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const navigate = useNavigate();

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
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <button className="btn btn-primary search-btn">Search</button>
          </div>
          
          <div className="filters-row">
            <button className="filter-btn active"><Filter size={16}/> All</button>
            <button className="filter-btn"><Clock size={16}/> 24 Hours</button>
            <button className="filter-btn"><DollarSign size={16}/> Under $40</button>
            <button className="filter-btn"><Star size={16}/> Top Rated</button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container explore-content">
        <div className="map-placeholder glass-panel">
          {/* Map Integration Placeholder for later/future */}
          <div className="map-overlay">
            <MapPin size={48} color="#3b82f6" />
            <h3>Interactive Map View</h3>
            <p>Google Maps integration placeholder</p>
          </div>
        </div>

        <div className="gyms-grid">
          {MOCK_GYMS.map((gym) => (
            <div key={gym.id} className="gym-card glass-panel">
              <div className="gym-image" style={{ backgroundImage: `url(${gym.image})` }}>
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
      </div>
    </div>
  );
};

export default ExploreGyms;
