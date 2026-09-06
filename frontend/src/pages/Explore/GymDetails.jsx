import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { MapPin, Star, ArrowLeft, CheckCircle, Calendar, Clock, Phone, FileText, Dumbbell, ShieldCheck, Eye } from 'lucide-react';
import PaymentModal from '../../components/common/PaymentModal';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import Modal from '../../components/common/Modal';
import { toast } from 'react-toastify';
import './GymDetails.css';

const DEFAULT_REVIEWS = [
  { id: 1, user: 'Hamza Malik', rating: 5, date: '2 weeks ago', comment: 'Super clean facility with top-notch Olympic barbells, great lighting, and helpful trainers. 10/10 recommend.' },
  { id: 2, user: 'Sarah Ahmed', rating: 5, date: '1 month ago', comment: 'The 24/7 access is a game changer for my work schedule. Great community atmosphere and never overcrowded.' },
  { id: 3, user: 'Bilal Khan', rating: 4, date: '1 month ago', comment: 'Solid equipment selection. Dumbbells go up to 50kg. Air conditioning works well even during peak hours.' }
];

const DEFAULT_EQUIPMENT = [
  { category: 'Free Weights', items: ['Olympic Barbells & Bumper Plates', 'Dumbbells (2kg - 50kg)', 'Adjustable Incline Benches', 'Power Squat Racks'] },
  { category: 'Resistance & Cables', items: ['Dual Adjustable Pulley', 'Cable Crossover Station', 'Seated Row & Lat Pulldown', 'Leg Press & Hack Squat'] },
  { category: 'Cardio Zone', items: ['Commercial Treadmills', 'Concept2 Rowing Machines', 'Stairmasters', 'Assault Bikes'] },
  { category: 'Functional & Recovery', items: ['Kettlebells & Plyo Boxes', 'Turf Sprint Lane', 'Foam Rollers & Bands', 'Dedicated Stretching Zone'] }
];

const GymDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [gym, setGym] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [startNextMonth, setStartNextMonth] = useState(false);
  const [membershipType, setMembershipType] = useState('Monthly');
  const [joiningDate, setJoiningDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [fetchError, setFetchError] = useState('');
  const [currentUser, setCurrentUser] = useState(null);

  // Tour Booking State
  const [isTourModalOpen, setIsTourModalOpen] = useState(false);
  const [tourDate, setTourDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toISOString().slice(0, 10);
  });
  const [tourTimeSlot, setTourTimeSlot] = useState('Morning (09:00 AM - 11:00 AM)');
  const [tourPhone, setTourPhone] = useState('');
  const [tourNotes, setTourNotes] = useState('');
  const [isSubmittingTour, setIsSubmittingTour] = useState(false);
  const [tourBooked, setTourBooked] = useState(false);

  // Photo enlargement
  const [previewPhoto, setPreviewPhoto] = useState(null);

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

    if (searchParams.get('bookTour') === 'true') {
      setIsTourModalOpen(true);
    }
  }, [id, isGuest, userName, searchParams]);

  const [showSwitchConfirm, setShowSwitchConfirm] = useState(false);

  const handleJoinClick = () => {
    if (isGuest) {
      toast.info('Please log in or create an account to subscribe to this facility.');
      navigate('/login');
      return;
    }
    if (currentUser?.subscribedGymName && currentUser.subscribedGymName !== gym.name) {
      setShowSwitchConfirm(true);
      return;
    }
    setStartNextMonth(false);
    setIsPaymentModalOpen(true);
  };

  const handleOpenTourModal = () => {
    if (isGuest) {
      toast.info('Please log in or sign up to schedule an in-person facility tour.');
      navigate('/login');
      return;
    }
    setIsTourModalOpen(true);
  };

  const handleSubmitTour = async (e) => {
    e.preventDefault();
    if (!tourDate || !tourTimeSlot) {
      toast.error('Please select both a date and time slot for your tour.');
      return;
    }

    setIsSubmittingTour(true);
    const token = localStorage.getItem('gymsync_token') || '';

    try {
      const res = await fetch(`/api/gyms/${id}/tour-request`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          tourDate,
          timeSlot: tourTimeSlot,
          userPhone: tourPhone,
          notes: tourNotes
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to submit tour request');
      }

      setTourBooked(true);
      toast.success('Tour request confirmed! The gym management has been notified.');
      setTimeout(() => {
        setIsTourModalOpen(false);
        setTourBooked(false);
      }, 2000);
    } catch (err) {
      toast.error(err.message || 'Error scheduling tour');
    } finally {
      setIsSubmittingTour(false);
    }
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

  const galleryImages = [
    bannerImage,
    ...(gym.equipmentImages && gym.equipmentImages.length > 1 ? gym.equipmentImages.slice(1) : [
      'https://images.unsplash.com/photo-1540497077202-7c8a3999166f?q=80&w=800&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1517838277536-f5f99be501cd?q=80&w=800&auto=format&fit=crop'
    ])
  ];

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
              <span><Star size={18} fill="#f59e0b" color="#f59e0b" /> 4.8 Rating (32 Reviews)</span>
              <span><ShieldCheck size={18} color="#10b981" /> Verified GymSync Partner</span>
            </div>
          </div>
        </div>
      </div>

      <div className="container content-grid">
        <div className="main-info glass-panel">
          <h3>About This Gym</h3>
          <p>{gym.description || 'A state-of-the-art facility engineered for strength athletes, bodybuilders, and everyday fitness enthusiasts.'}</p>

          <div className="gym-highlights" style={{ marginTop: '24px' }}>
            <div style={{ display: 'grid', gap: '6px' }}>
              <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Admission / Registration:</span>
              <strong style={{ fontSize: '1.1rem' }}>${gym.admissionFee ?? 0}</strong>
            </div>
            <div style={{ display: 'grid', gap: '6px' }}>
              <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Monthly Rate:</span>
              <strong style={{ fontSize: '1.1rem' }}>${gym.monthlyFee ?? 0} / month</strong>
            </div>
            <div style={{ display: 'grid', gap: '6px' }}>
              <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Facility Timings:</span>
              <strong>{gym.timings?.weekday || '6:00 AM - 10:00 PM (24/7 Keycard)'}</strong>
            </div>
          </div>

          {/* Photo Gallery */}
          <h3 style={{ marginTop: '32px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Eye size={20} color="var(--primary-accent)" /> Facility Photo Gallery
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '14px', marginTop: '14px' }}>
            {galleryImages.map((imgUrl, i) => (
              <div 
                key={i} 
                onClick={() => setPreviewPhoto(imgUrl)}
                style={{ height: '120px', borderRadius: '12px', overflow: 'hidden', cursor: 'pointer', border: '1px solid var(--border-color)', position: 'relative' }}
              >
                <img src={imgUrl} alt="Facility preview" style={{ width: '100%', height: '100%', objectFit: 'cover', transition: 'transform 0.3s' }} />
              </div>
            ))}
          </div>

          {/* Facilities */}
          {gym.facilities?.length > 0 && (
            <>
              <h3 style={{ marginTop: '32px' }}>Amenities & Facilities</h3>
              <div className="facilities-grid">
                {gym.facilities.map((fac, idx) => (
                  <div key={idx} className="facility-item">
                    <CheckCircle size={16} color="#10b981" /> {fac}
                  </div>
                ))}
              </div>
            </>
          )}

          {/* Comprehensive Equipment Breakdown */}
          <h3 style={{ marginTop: '36px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Dumbbell size={20} color="var(--primary-accent)" /> Equipment & Training Zones
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px', marginTop: '16px' }}>
            {DEFAULT_EQUIPMENT.map((grp, idx) => (
              <div key={idx} style={{ background: 'rgba(255,255,255,0.02)', padding: '16px', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
                <h4 style={{ margin: '0 0 10px 0', color: 'var(--primary-accent)', fontSize: '0.95rem' }}>{grp.category}</h4>
                <ul style={{ margin: 0, paddingLeft: '18px', color: 'var(--text-secondary)', fontSize: '0.85rem', lineHeight: '1.6' }}>
                  {grp.items.map((item, itemIdx) => (
                    <li key={itemIdx}>{item}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          {/* Verified Member Reviews */}
          <h3 style={{ marginTop: '36px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Star size={20} fill="#f59e0b" color="#f59e0b" /> Verified Member Reviews (4.8 / 5.0)
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginTop: '16px' }}>
            {DEFAULT_REVIEWS.map(rev => (
              <div key={rev.id} style={{ background: 'rgba(255,255,255,0.02)', padding: '16px', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <strong>{rev.user}</strong>
                    <div style={{ display: 'flex', gap: '2px' }}>
                      {[...Array(rev.rating)].map((_, rIdx) => (
                        <Star key={rIdx} size={14} fill="#f59e0b" color="#f59e0b" />
                      ))}
                    </div>
                  </div>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{rev.date}</span>
                </div>
                <p style={{ margin: 0, color: 'var(--text-primary)', fontSize: '0.9rem', lineHeight: '1.5' }}>
                  "{rev.comment}"
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Membership & Action Sidebar */}
        <div className="booking-card glass-panel">
          <h3>Membership & Access</h3>
          <div className="price-tag">
            <span className="currency">$</span>
            <span className="amount">{membershipAmount}</span>
            <span className="period">/{membershipType === 'Yearly' ? 'year' : 'month'}</span>
          </div>

          {!isGuest && (
            <div style={{ display: 'grid', gap: '10px', marginTop: '16px', textAlign: 'left' }}>
              <label style={{ fontSize: '.85rem' }}>Membership Plan
                <select className="search-input" value={membershipType} onChange={event => setMembershipType(event.target.value)}>
                  <option value="Monthly">Monthly Pass</option>
                  <option value="Yearly">Yearly Pass (Save 15%)</option>
                </select>
              </label>
              <label style={{ fontSize: '.85rem' }}>Activation Date
                <input className="search-input" type="date" min={new Date().toISOString().slice(0, 10)} value={joiningDate} onChange={event => setJoiningDate(event.target.value)} />
              </label>
            </div>
          )}

          <button
            className="btn btn-primary w-100 mt-20"
            onClick={handleJoinClick}
          >
            {isGuest ? 'Log In to Join' : 'Join Now & Pay'}
          </button>

          <button 
            className="btn btn-outline w-100 mt-10" 
            onClick={handleOpenTourModal}
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
          >
            <Calendar size={16} /> Book an In-Person Tour
          </button>
          <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', textAlign: 'center', marginTop: '12px' }}>
            Walkthrough the facility, test the equipment, and meet on-site certified trainers with zero obligation.
          </p>
        </div>
      </div>

      {/* Book Tour Modal */}
      <Modal
        isOpen={isTourModalOpen}
        onClose={() => setIsTourModalOpen(false)}
        title={`Schedule a Tour: ${gym.name}`}
      >
        {tourBooked ? (
          <div style={{ textAlign: 'center', padding: '30px 10px' }}>
            <CheckCircle size={56} color="#10b981" style={{ margin: '0 auto 16px' }} />
            <h3>Tour Scheduled!</h3>
            <p style={{ color: 'var(--text-secondary)' }}>
              Your walkthrough request for <strong>{tourDate}</strong> ({tourTimeSlot}) has been sent directly to {gym.name}'s manager.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmitTour} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <p style={{ color: 'var(--text-secondary)', margin: 0, fontSize: '0.9rem' }}>
              Select a convenient date and time to visit {gym.name}. A gym staff member will guide you through the facilities.
            </p>

            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '6px' }}>Preferred Tour Date</label>
              <div style={{ position: 'relative' }}>
                <input 
                  type="date" 
                  className="search-input"
                  min={new Date().toISOString().slice(0, 10)}
                  value={tourDate}
                  onChange={e => setTourDate(e.target.value)}
                  required
                />
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '6px' }}>Preferred Time Slot</label>
              <select 
                className="search-input"
                value={tourTimeSlot}
                onChange={e => setTourTimeSlot(e.target.value)}
              >
                <option value="Morning (09:00 AM - 11:00 AM)">Morning (09:00 AM - 11:00 AM)</option>
                <option value="Afternoon (02:00 PM - 04:00 PM)">Afternoon (02:00 PM - 04:00 PM)</option>
                <option value="Evening (06:00 PM - 08:00 PM)">Evening (06:00 PM - 08:00 PM)</option>
                <option value="Late Evening (08:00 PM - 10:00 PM)">Late Evening (08:00 PM - 10:00 PM)</option>
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '6px' }}>Phone / WhatsApp Number (For confirmation)</label>
              <input 
                type="tel"
                className="search-input"
                placeholder="+92 300 1234567"
                value={tourPhone}
                onChange={e => setTourPhone(e.target.value)}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '6px' }}>Special Inquiries / Questions (Optional)</label>
              <textarea 
                className="search-input"
                rows={3}
                placeholder="e.g. Interested in Olympic weightlifting platforms or trainer availability..."
                value={tourNotes}
                onChange={e => setTourNotes(e.target.value)}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
              <button type="button" className="btn btn-outline" onClick={() => setIsTourModalOpen(false)}>
                Cancel
              </button>
              <button type="submit" className="btn btn-primary" disabled={isSubmittingTour}>
                {isSubmittingTour ? 'Submitting...' : 'Confirm Tour Request'}
              </button>
            </div>
          </form>
        )}
      </Modal>

      {/* Facility Photo Zoom Modal */}
      {previewPhoto && (
        <Modal
          isOpen={Boolean(previewPhoto)}
          onClose={() => setPreviewPhoto(null)}
          title="Facility Photo"
        >
          <div style={{ textAlign: 'center' }}>
            <img src={previewPhoto} alt="Facility zoom" style={{ maxWidth: '100%', maxHeight: '70vh', borderRadius: '12px' }} />
          </div>
        </Modal>
      )}

      {/* Facility Switch Confirmation */}
      <ConfirmDialog
        isOpen={showSwitchConfirm}
        onClose={() => setShowSwitchConfirm(false)}
        onConfirm={() => {
          setStartNextMonth(true);
          setShowSwitchConfirm(false);
          setIsPaymentModalOpen(true);
        }}
        title="Schedule Facility Transfer"
        message={`You are currently subscribed to ${currentUser?.subscribedGymName}. Would you like to schedule your membership to ${gym.name} to activate next month after your current cycle finishes?`}
        confirmText="Schedule Next Month"
        cancelText="Cancel"
      />

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
