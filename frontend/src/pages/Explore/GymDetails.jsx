import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { MapPin, Star, ArrowLeft, CheckCircle } from 'lucide-react';
import PaymentModal from '../../components/common/PaymentModal';
import './GymDetails.css';

const GymDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [gym, setGym] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [startNextMonth, setStartNextMonth] = useState(false);
  const [membershipType, setMembershipType] = useState('Monthly');
  const [joiningDate, setJoiningDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [fetchError, setFetchError] = useState('');
  const [currentUser, setCurrentUser] = useState(null);

  const userRole = localStorage.getItem('gymsync_role') || 'guest';
  const isGuest = userRole === 'guest';
  const userName = localStorage.getItem('gymsync_user_name');

  useEffect(() => {
    const loadGym = async () => {
      setLoading(true);
      setFetchError('');
      try {
        const res = await fetch(`/api/gyms/${id}`);
        if (!res.ok) {
          throw new Error('Gym not found');
        }
        const data = await res.json();
        setGym(data);
      } catch (err) {
        setFetchError(err.message || 'Unable to load gym details');
      } finally {
        setLoading(false);
      }
    };
    
    const loadUser = async () => {
      if (!isGuest && userName) {
        try {
          const res = await fetch(`/api/users/${userName}`);
          if (res.ok) {
            const data = await res.json();
            setCurrentUser(data);
          }
        } catch (e) {
          console.error("Failed to load user profile", e);
        }
      }
    };

    loadGym();
    loadUser();
  }, [id, isGuest, userName]);

  const handleJoinClick = () => {
    if (isGuest) {
      alert('Please log in or create an account to join this gym.');
      navigate('/');
      return;
    }
    if (currentUser?.subscribedGymName && currentUser.subscribedGymName !== gym.name) {
      const startNext = window.confirm(
        `You are already registered in ${currentUser.subscribedGymName}. Do you want to subscribe to ${gym.name} from next month when your current month completes?\n\nClick OK to schedule for next month, or Cancel to subscribe immediately (overriding current gym).`
      );
      setStartNextMonth(startNext);
    } else {
      setStartNextMonth(false);
    }
    setIsPaymentModalOpen(true);
  };

  const bannerImage = gym?.equipmentImages?.[0] || 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?q=80&w=1470&auto=format&fit=crop';
  const membershipAmount = Number(gym?.monthlyFee || 0) * (membershipType === 'Yearly' ? 12 : 1);

  if (loading) {
    return (
      <div className="container" style={{ paddingTop: '150px', textAlign: 'center' }}>
        <h2>Loading gym details...</h2>
      </div>
    );
  }

  if (fetchError || !gym) {
    return (
      <div className="container" style={{ paddingTop: '150px', textAlign: 'center' }}>
        <h2>Unable to load gym details</h2>
        <p style={{ color: 'var(--text-secondary)' }}>{fetchError || 'Please try again later.'}</p>
      </div>
    );
  }

  return (
    <div className="gym-details-page">
      <div className="gym-hero" style={{ backgroundImage: `url(${bannerImage})` }}>
        <div className="hero-overlay">
          <div className="container">
            <button className="back-btn" onClick={() => navigate(-1)}>
              <ArrowLeft size={20} /> Back to Explore
            </button>
            <h1>{gym.name}</h1>
            <div className="gym-meta">
              <span><MapPin size={18} /> {gym.location}</span>
              <span><Star size={18} fill="#f59e0b" color="#f59e0b" /> {gym.ownerName || 'GymSync Partner'}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="container content-grid">
        <div className="main-info glass-panel">
          <h3>About This Gym</h3>
          <p>{gym.description || 'A well-equipped facility built for athletes and everyday fitness seekers.'}</p>

          <div className="gym-highlights" style={{ marginTop: '24px' }}>
            <div style={{ display: 'grid', gap: '12px' }}>
              <strong>Admission Fee:</strong>
              <span>${gym.admissionFee ?? 0}</span>
            </div>
            <div style={{ display: 'grid', gap: '12px' }}>
              <strong>Monthly Fee:</strong>
              <span>${gym.monthlyFee ?? 0} / month</span>
            </div>
            {gym.bankDetails && (
              <div style={{ display: 'grid', gap: '12px' }}>
                <strong>Bank / Payment Details:</strong>
                <span>{gym.bankDetails}</span>
              </div>
            )}
          </div>

          {gym.facilities?.length > 0 && (
            <>
              <h3 style={{ marginTop: '30px' }}>Facilities</h3>
              <div className="facilities-grid">
                {gym.facilities.map((fac, idx) => (
                  <div key={idx} className="facility-item">
                    <CheckCircle size={16} color="#10b981" /> {fac}
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        <div className="booking-card glass-panel">
          <h3>Membership</h3>
          <div className="price-tag">
            <span className="currency">$</span>
            <span className="amount">{membershipAmount}</span>
            <span className="period">/{membershipType === 'Yearly' ? 'year' : 'month'}</span>
          </div>

          {!isGuest && <div style={{ display: 'grid', gap: '10px', marginTop: '16px', textAlign: 'left' }}>
            <label style={{ fontSize: '.85rem' }}>Membership plan
              <select className="search-input" value={membershipType} onChange={event => setMembershipType(event.target.value)}>
                <option value="Monthly">Monthly</option>
                <option value="Yearly">Yearly</option>
              </select>
            </label>
            <label style={{ fontSize: '.85rem' }}>Joining date
              <input className="search-input" type="date" min={new Date().toISOString().slice(0, 10)} value={joiningDate} onChange={event => setJoiningDate(event.target.value)} />
            </label>
          </div>}

          <button
            className="btn btn-primary w-100 mt-20"
            onClick={handleJoinClick}
          >
            {isGuest ? 'Log In to Join' : 'Join Now & Pay'}
          </button>
          <button className="btn btn-outline w-100 mt-10" onClick={() => alert('Contact the gym directly to book a tour.')}>Book a Tour</button>
        </div>
      </div>

      <PaymentModal
        isOpen={isPaymentModalOpen}
        onClose={() => setIsPaymentModalOpen(false)}
        amount={membershipAmount}
        gymName={gym.name}
        paymentType="GymMembership"
        startNextMonth={startNextMonth}
        membershipType={membershipType}
        joiningDate={joiningDate}
        title={`Join ${gym.name}`}
        onPaymentSuccess={() => {
          localStorage.setItem('gymsync_user_gym', gym.name);
          window.location.href = '/your-gym';
        }}
      />
    </div>
  );
};

export default GymDetails;
