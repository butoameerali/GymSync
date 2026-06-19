import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { MapPin, Star, ArrowLeft, CheckCircle } from 'lucide-react';
import './GymDetails.css';

const GymDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const userRole = localStorage.getItem('gymsync_role') || 'guest';
  const isGuest = userRole === 'guest';

  // In a real app, you would fetch this by ID from the backend.
  // Using generic mock data for FYP demonstration.
  const gym = {
    name: "Iron Core Fitness",
    location: "Downtown, Metro City",
    rating: 4.8,
    reviews: 124,
    monthlyFee: 45,
    image: "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?q=80&w=1470&auto=format&fit=crop",
    about: "The premier fitness destination in Metro City. Equipped with state-of-the-art machines, free weights, and a massive functional training area.",
    facilities: ["24/7 Access", "Personal Training", "Sauna", "Swimming Pool", "Locker Rooms", "Free Wi-Fi"]
  };

  return (
    <div className="gym-details-page">
      <div className="gym-hero" style={{ backgroundImage: `url(${gym.image})` }}>
        <div className="hero-overlay">
          <div className="container">
            <button className="back-btn" onClick={() => navigate(-1)}>
              <ArrowLeft size={20} /> Back to Explore
            </button>
            <h1>{gym.name}</h1>
            <div className="gym-meta">
              <span><MapPin size={18} /> {gym.location}</span>
              <span><Star size={18} fill="#f59e0b" color="#f59e0b" /> {gym.rating} ({gym.reviews} Reviews)</span>
            </div>
          </div>
        </div>
      </div>

      <div className="container content-grid">
        <div className="main-info glass-panel">
          <h3>About This Gym</h3>
          <p>{gym.about}</p>

          <h3 style={{ marginTop: '30px' }}>Facilities</h3>
          <div className="facilities-grid">
            {gym.facilities.map((fac, idx) => (
              <div key={idx} className="facility-item">
                <CheckCircle size={16} color="#10b981" /> {fac}
              </div>
            ))}
          </div>
        </div>

        <div className="booking-card glass-panel">
          <h3>Membership</h3>
          <div className="price-tag">
            <span className="currency">$</span>
            <span className="amount">{gym.monthlyFee}</span>
            <span className="period">/month</span>
          </div>
          <button 
            className="btn btn-primary w-100 mt-20"
            onClick={() => {
              if (isGuest) {
                alert("Please log in or create an account to join this gym.");
                navigate('/');
              } else {
                alert("Membership Request Sent!");
              }
            }}
          >
            {isGuest ? 'Log In to Join' : 'Join Now'}
          </button>
          <button className="btn btn-outline w-100 mt-10">Book a Tour</button>
        </div>
      </div>
    </div>
  );
};

export default GymDetails;
