import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { 
  MapPin, Star, ArrowLeft, CheckCircle, Calendar, Clock, Phone, 
  FileText, Dumbbell, ShieldCheck, Eye, Copy, Check, Users, UserCheck, 
  Sparkles, Activity, Navigation, Tag, Search, Wrench, AlertCircle, Info, Zap,
  CreditCard, Banknote
} from 'lucide-react';
import Modal from '../../components/common/Modal';
import { toast } from 'react-toastify';
import { getSafeImageUrl } from '../../utils/imageUtils';
import './GymDetails.css';

const formatRs = (n) => {
  const val = Number(n);
  if (!Number.isFinite(val)) return 'Rs. 0';
  return `Rs. ${Math.round(val).toLocaleString('en-US')}`;
};

const GymDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [gym, setGym] = useState(null);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState('');
  const [currentUser, setCurrentUser] = useState(null);

  // New Profile States
  const [machineSearch, setMachineSearch] = useState('');
  const [selectedPlan, setSelectedPlan] = useState('Monthly');
  const [copiedCoupon, setCopiedCoupon] = useState('');

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

  // Membership Join & Pass Booking States
  const [isJoinModalOpen, setIsJoinModalOpen] = useState(false);
  const [joinStartDateOption, setJoinStartDateOption] = useState('today'); // 'today' | 'custom'
  const [customJoinDate, setCustomJoinDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [joinPaymentMethod, setJoinPaymentMethod] = useState('Card'); // 'Card' | 'Online' | 'Cash'
  const [onlineTid, setOnlineTid] = useState('');
  const [joinPhone, setJoinPhone] = useState('');
  const [joinCouponCode, setJoinCouponCode] = useState('');
  const [appliedDiscount, setAppliedDiscount] = useState(0);
  const [appliedCouponInfo, setAppliedCouponInfo] = useState(null);
  const [isSubmittingJoin, setIsSubmittingJoin] = useState(false);
  const [joinSuccessData, setJoinSuccessData] = useState(null);

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

    if (searchParams.get('bookTour') === 'true' || searchParams.get('tour') === 'true' || searchParams.get('subscribe') === 'true') {
      setIsTourModalOpen(true);
    }
  }, [id, isGuest, userName, searchParams]);

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

  const bannerImage = getSafeImageUrl(gym?.equipmentImages?.[0], 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?q=80&w=1470&auto=format&fit=crop');
  const membershipAmount = Number(gym?.monthlyFee || 0);

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

  const actualPhotos = [
    ...(Array.isArray(gym.equipmentImages) ? gym.equipmentImages : []),
    ...(Array.isArray(gym.photos) ? gym.photos : [])
  ].filter(Boolean);

  // Fee and Pricing Calculations (Guaranteed safe defaults)
  const admissionFee = Number(gym.admissionFee || 0);
  const monthlyFee = Number(gym.monthlyFee || 0);
  const securityDeposit = Number(gym.securityDeposit || 0);
  const isRefundable = gym.securityDepositRefundable !== false;
  const offersYearlyPlan = Boolean(gym.offersYearlyPlan || (Number(gym.yearlyDiscountPercent) > 0));
  const yearlyDiscountPercent = offersYearlyPlan ? Math.min(50, Math.max(0, Number(gym.yearlyDiscountPercent || 0))) : 0;
  const baseYearly = monthlyFee * 12;
  const yearlyPrice = Math.round(baseYearly * (1 - yearlyDiscountPercent / 100));

  const trainerPolicy = gym.trainerPolicy || {};
  const guidanceTrainerAvailable = Boolean(trainerPolicy.guidanceTrainer ?? gym.trainerIncluded);
  const personalTrainerAvailable = Boolean(trainerPolicy.personalTrainer);
  const personalTrainerFee = Number(trainerPolicy.personalTrainerMonthlyFee || 0);

  const activePlan = offersYearlyPlan ? selectedPlan : 'Monthly';
  const firstTimeMonthlyEstimate = admissionFee + securityDeposit + monthlyFee;
  const firstTimeYearlyEstimate = admissionFee + securityDeposit + yearlyPrice;

  // Effective Join Calculations
  const effectiveStartDate = useMemo(() => {
    if (joinStartDateOption === 'custom' && customJoinDate) {
      return new Date(customJoinDate);
    }
    return new Date();
  }, [joinStartDateOption, customJoinDate]);

  const effectiveExpiryDate = useMemo(() => {
    const exp = new Date(effectiveStartDate);
    exp.setMonth(exp.getMonth() + (activePlan === 'Yearly' ? 12 : 1));
    return exp;
  }, [effectiveStartDate, activePlan]);

  const effectivePlanPrice = activePlan === 'Yearly' ? yearlyPrice : monthlyFee;
  const rawFirstTimeTotal = admissionFee + securityDeposit + effectivePlanPrice;
  const netPayableTotal = Math.max(0, rawFirstTimeTotal - appliedDiscount);

  const handleApplyCoupon = () => {
    const cleanCode = joinCouponCode.trim();
    if (!cleanCode) return;
    const matchingOffer = Array.isArray(gym?.activeOffers) 
      ? gym.activeOffers.find(o => o.code && o.code.toUpperCase() === cleanCode.toUpperCase())
      : null;

    if (!matchingOffer) {
      toast.error('Invalid coupon code for this gym');
      return;
    }

    let discount = 0;
    const discountVal = Number(matchingOffer.discount || matchingOffer.discountValue || 0);
    const isPercent = String(matchingOffer.discountType).toLowerCase() === 'percentage';
    if (isPercent) {
      discount = Math.round((effectivePlanPrice * Math.min(100, discountVal)) / 100);
    } else {
      discount = Math.min(effectivePlanPrice, discountVal);
    }

    setAppliedDiscount(discount);
    setAppliedCouponInfo(matchingOffer);
    toast.success(`Coupon "${matchingOffer.code}" applied! You save Rs. ${discount.toLocaleString('en-US')}`);
  };

  const handleSubmitJoin = async (e) => {
    e.preventDefault();
    if (isGuest) {
      toast.info('Please log in or register an account to join a gym facility.');
      navigate('/login');
      return;
    }

    if (joinPaymentMethod === 'Online' && !onlineTid.trim()) {
      toast.warn('Please enter the Transaction ID (TID) from your mobile payment receipt.');
      return;
    }

    setIsSubmittingJoin(true);
    try {
      const token = localStorage.getItem('gymsync_token') || '';
      const payload = {
        paymentId: `PAY-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`,
        gymId: gym._id,
        gymName: gym.name,
        paymentType: 'GymMembership',
        paymentMethod: joinPaymentMethod === 'Online' ? 'Easypaisa' : joinPaymentMethod,
        amount: netPayableTotal,
        transactionRef: joinPaymentMethod === 'Online' ? onlineTid.trim() : undefined,
        membershipType: selectedPlan,
        joiningDate: effectiveStartDate.toISOString(),
        customerPhone: joinPhone || currentUser?.phone || '',
        couponCode: appliedCouponInfo?.code || undefined,
        methodDetails: `Membership Plan: ${selectedPlan} | Start: ${effectiveStartDate.toLocaleDateString()}`
      };

      const res = await fetch('/api/payments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Payment submission failed');
      }

      setJoinSuccessData({
        passCode: data.trackingCode || data.paymentId,
        paymentMethod: joinPaymentMethod,
        amount: netPayableTotal,
        plan: selectedPlan,
        startDate: effectiveStartDate,
        expiryDate: effectiveExpiryDate,
        status: joinPaymentMethod === 'Card' ? 'Active' : joinPaymentMethod === 'Cash' ? 'PendingCash' : 'PendingApproval'
      });

      if (joinPaymentMethod === 'Card') {
        toast.success(`🎉 Membership activated! Welcome to ${gym.name}.`);
      } else if (joinPaymentMethod === 'Cash') {
        toast.success('🎟️ Cash Pass reserved! Bring your pass code to gym reception to pay.');
      } else {
        toast.info('✅ TID submitted! Gym management has been notified to verify.');
      }
    } catch (err) {
      toast.error(err.message || 'Error processing gym membership pass');
    } finally {
      setIsSubmittingJoin(false);
    }
  };

  // Equipment calculation & grouping
  const rawEquipment = useMemo(() => {
    if (Array.isArray(gym.equipmentStatus) && gym.equipmentStatus.length > 0) {
      return gym.equipmentStatus.map((item, idx) => ({
        id: item._id || idx,
        name: item.name || 'Unnamed Machine',
        category: item.category || 'Other',
        status: item.status || 'Available',
        quantity: Math.max(1, Number(item.quantity) || 1),
        notes: item.notes || ''
      }));
    }
    if (Array.isArray(gym.equipmentList) && gym.equipmentList.length > 0) {
      return gym.equipmentList.map((item, idx) => ({
        id: idx,
        name: typeof item === 'string' ? item : (item.name || 'Equipment'),
        category: 'Other',
        status: 'Available',
        quantity: 1,
        notes: ''
      }));
    }
    return [];
  }, [gym]);

  const totalEquipmentPieces = useMemo(() => {
    return rawEquipment.reduce((acc, eq) => acc + (eq.quantity || 1), 0);
  }, [rawEquipment]);

  const maintenanceCount = useMemo(() => {
    return rawEquipment.filter(eq => eq.status === 'Maintenance' || eq.status === 'Under Maintenance').length;
  }, [rawEquipment]);

  const filteredEquipment = useMemo(() => {
    const q = machineSearch.trim().toLowerCase();
    if (!q) return rawEquipment;
    return rawEquipment.filter(eq => 
      eq.name.toLowerCase().includes(q) || 
      (eq.notes && eq.notes.toLowerCase().includes(q)) ||
      (eq.category && eq.category.toLowerCase().includes(q))
    );
  }, [rawEquipment, machineSearch]);

  const groupedEquipment = useMemo(() => {
    const categoriesOrder = ['Cardio', 'Strength Machine', 'Free Weights', 'Functional', 'Other'];
    const groups = {};
    for (const cat of categoriesOrder) {
      groups[cat] = [];
    }
    filteredEquipment.forEach(eq => {
      const cat = categoriesOrder.includes(eq.category) ? eq.category : 'Other';
      groups[cat].push(eq);
    });
    return groups;
  }, [filteredEquipment]);

  const handleCopyCoupon = (code) => {
    if (!code) return;
    navigator.clipboard.writeText(code);
    setCopiedCoupon(code);
    toast.success(`Coupon code ${code} copied to clipboard!`);
    setTimeout(() => setCopiedCoupon(''), 3000);
  };

  return (
    <div className="gym-details-page">
      <div className="gym-hero" style={{ backgroundImage: `url(${bannerImage})` }}>
        <div className="hero-overlay">
          <div className="container">
            <button className="back-btn" onClick={() => navigate(-1)}>
              <ArrowLeft size={20} /> Back to Explore
            </button>
            <div style={{ display: 'inline-block', marginBottom: '8px' }}>
              <span style={{
                background: 'rgba(59, 130, 246, 0.2)',
                color: '#60a5fa',
                border: '1px solid rgba(59, 130, 246, 0.4)',
                padding: '4px 12px',
                borderRadius: '20px',
                fontSize: '0.8rem',
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.04em'
              }}>
                Gym Facility Profile
              </span>
            </div>
            <h1>{gym.name}</h1>
            <div className="gym-meta">
              <span><MapPin size={18} /> {gym.address || gym.location}{gym.city ? `, ${gym.city}` : ''}</span>
              {gym.ownerName && (
                <span><UserCheck size={18} color="var(--primary-accent)" /> Managed by {gym.ownerName}</span>
              )}
              <span style={{ color: '#10b981', display: 'inline-flex', alignItems: 'center', gap: '5px', fontWeight: 600 }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10b981', display: 'inline-block' }}></span>
                Active Facility
              </span>
              {gym.activeMembersCount ? (
                <span><Users size={18} /> {gym.activeMembersCount} Enrolled Members</span>
              ) : null}
              {Array.isArray(gym.reviews) && gym.reviews.length > 0 ? (
                <span>
                  <Star size={18} fill="#f59e0b" color="#f59e0b" />
                  {(gym.reviews.reduce((acc, r) => acc + (Number(r.rating) || 5), 0) / gym.reviews.length).toFixed(1)} Rating ({gym.reviews.length} {gym.reviews.length === 1 ? 'Review' : 'Reviews'})
                </span>
              ) : (
                <span style={{ color: 'var(--text-secondary)' }}>
                  <Star size={18} color="var(--text-secondary)" /> No ratings yet
                </span>
              )}
              {gym.approvalStatus === 'Approved' ? (
                <span><ShieldCheck size={18} color="#10b981" /> Verified GymSync Partner</span>
              ) : (
                <span style={{ color: '#f59e0b', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                  <Clock size={16} /> Verification Pending
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="container content-grid">
        <div className="main-info glass-panel">
          <h3>About This Gym</h3>
          <p>{gym.description || 'No detailed description provided by gym management.'}</p>

          {/* Daily Training Tip / Management Announcement */}
          {Boolean(gym.todayTrainingTip && typeof gym.todayTrainingTip === 'string' && gym.todayTrainingTip.trim().length > 0) && (
            <div style={{
              marginTop: '20px',
              padding: '16px 20px',
              borderRadius: '14px',
              background: 'rgba(59, 130, 246, 0.08)',
              border: '1px solid rgba(59, 130, 246, 0.25)',
              display: 'flex',
              gap: '14px',
              alignItems: 'flex-start'
            }}>
              <Sparkles size={22} color="var(--primary-accent)" style={{ flexShrink: 0, marginTop: '2px' }} />
              <div>
                <strong style={{ display: 'block', fontSize: '0.92rem', color: 'var(--text-primary)', marginBottom: '4px' }}>
                  Daily Training Tip & Announcement from Management
                </strong>
                <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                  "{gym.todayTrainingTip}"
                </p>
              </div>
            </div>
          )}

          {/* Fees & Charges Card */}
          <div style={{ marginTop: '28px' }}>
            <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: '0 0 16px' }}>
              <Tag size={20} color="var(--primary-accent)" /> Fees & Membership Pricing
            </h3>
            
            {gym.timings?.weekday && (
              <div style={{
                marginBottom: '16px',
                padding: '10px 14px',
                background: 'var(--card-bg, rgba(255,255,255,0.02))',
                border: '1px solid var(--border-color)',
                borderRadius: '10px',
                fontSize: '0.86rem',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                <Clock size={16} color="var(--primary-accent)" />
                <span>
                  <strong>Facility Hours:</strong> {gym.timings.weekday}{gym.timings.weekend ? ` (Weekend: ${gym.timings.weekend})` : ''}
                </span>
              </div>
            )}

            <div className="fees-grid">
              {/* Admission Fee */}
              <div className="fee-card-item">
                <span className="fee-label">Admission / Registration</span>
                <span className="fee-value">
                  {admissionFee > 0 ? formatRs(admissionFee) : 'Free'}
                </span>
                <span className="fee-subtext">
                  {admissionFee > 0 ? 'One-time registration fee' : 'Zero admission fee required'}
                </span>
              </div>

              {/* Monthly Rate */}
              <div className="fee-card-item">
                <span className="fee-label">Monthly Membership</span>
                <span className="fee-value">{formatRs(monthlyFee)}</span>
                <span className="fee-subtext">Standard recurring monthly rate</span>
              </div>

              {/* Security Deposit */}
              <div className="fee-card-item">
                <span className="fee-label">Security Deposit</span>
                <span className="fee-value">
                  {securityDeposit > 0 ? formatRs(securityDeposit) : 'No deposit'}
                </span>
                <span className="fee-subtext">
                  {securityDeposit > 0 
                    ? (isRefundable ? 'Refundable on cancellation' : 'Non-refundable deposit')
                    : 'No deposit required'}
                </span>
              </div>

              {/* Yearly Plan (Only if offered) */}
              {offersYearlyPlan && (
                <div className="fee-card-item">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span className="fee-label">Yearly Membership</span>
                    {yearlyDiscountPercent > 0 && (
                      <span style={{
                        fontSize: '0.72rem',
                        fontWeight: 700,
                        padding: '2px 6px',
                        borderRadius: '6px',
                        background: 'rgba(16, 185, 129, 0.15)',
                        color: '#10b981'
                      }}>
                        Save {yearlyDiscountPercent}%
                      </span>
                    )}
                  </div>
                  <span className="fee-value">{formatRs(yearlyPrice)}</span>
                  <span className="fee-subtext">
                    {yearlyDiscountPercent > 0 
                      ? `Save ${yearlyDiscountPercent}% vs monthly (${formatRs(baseYearly)})`
                      : '12-month advance package'}
                  </span>
                </div>
              )}

              {/* Personal Trainer Fee */}
              <div className="fee-card-item">
                <span className="fee-label">Personal Trainer Fee</span>
                <span className="fee-value">
                  {personalTrainerAvailable 
                    ? (personalTrainerFee > 0 ? `${formatRs(personalTrainerFee)} / mo` : 'Available')
                    : 'Not offered'}
                </span>
                <span className="fee-subtext">
                  {personalTrainerAvailable 
                    ? (personalTrainerFee > 0 ? 'Dedicated 1-on-1 coaching' : 'Fee on consultation')
                    : 'Personal trainer service unavailable'}
                </span>
              </div>
            </div>

            {/* Total First-Time Payment Line */}
            <div className="first-time-estimate-box">
              <div>
                <strong style={{ display: 'block', fontSize: '1rem', color: 'var(--text-primary)', marginBottom: '3px' }}>
                  Estimated First-Time Joining Total
                </strong>
                <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                  Includes: Admission ({admissionFee > 0 ? formatRs(admissionFee) : 'Free'}) + Security Deposit ({securityDeposit > 0 ? formatRs(securityDeposit) : 'Rs. 0'}) + 1st Month ({formatRs(monthlyFee)})
                </span>
              </div>
              <div style={{ textAlign: 'right' }}>
                <span style={{ display: 'block', fontSize: '1.45rem', fontWeight: 800, color: '#10b981' }}>
                  {formatRs(firstTimeMonthlyEstimate)}
                </span>
                <span style={{ fontSize: '0.74rem', color: 'var(--text-secondary)' }}>
                  *Estimated starting payment
                </span>
              </div>
            </div>
          </div>

          {/* Active Offers Section */}
          {Array.isArray(gym.activeOffers) && gym.activeOffers.length > 0 && (
            <div className="offers-section">
              <h3 style={{ margin: '0 0 4px', display: 'flex', alignItems: 'center', gap: '8px', color: '#f59e0b' }}>
                <Zap size={20} /> Active Special Offers & Discounts ({gym.activeOffers.length})
              </h3>
              <p style={{ margin: '0 0 14px', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                Present these promotional coupon codes at the front desk when joining to claim your discount.
              </p>
              <div className="offers-grid">
                {gym.activeOffers.map((offer, idx) => (
                  <div key={offer._id || idx} className="offer-card">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <strong style={{ fontSize: '1rem', color: 'var(--text-primary)' }}>
                        {offer.title || 'Gym Discount Offer'}
                      </strong>
                      <span style={{
                        padding: '3px 8px',
                        borderRadius: '6px',
                        background: 'rgba(245, 158, 11, 0.2)',
                        color: '#f59e0b',
                        fontWeight: 700,
                        fontSize: '0.82rem'
                      }}>
                        {String(offer.discountType || '').toLowerCase() === 'percentage' 
                          ? `${offer.discountValue}% OFF` 
                          : `${formatRs(offer.discountValue)} OFF`}
                      </span>
                    </div>

                    {offer.description && (
                      <p style={{ margin: '4px 0', fontSize: '0.84rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                        {offer.description}
                      </p>
                    )}

                    <div style={{ marginTop: 'auto', paddingTop: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <button
                        type="button"
                        className="coupon-copy-badge"
                        onClick={() => handleCopyCoupon(offer.code)}
                        title="Click to copy coupon code"
                      >
                        {copiedCoupon === offer.code ? (
                          <>
                            <Check size={14} /> Copied!
                          </>
                        ) : (
                          <>
                            <Copy size={14} /> {offer.code}
                          </>
                        )}
                      </button>

                      {offer.validUntil && (
                        <span style={{ fontSize: '0.74rem', color: 'var(--text-secondary)' }}>
                          Valid till {new Date(offer.validUntil).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Trainers & Guidance Section */}
          <div style={{ marginTop: '36px' }}>
            <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: '0 0 6px' }}>
              <Users size={20} color="var(--primary-accent)" /> Trainers & Coaching Guidance
            </h3>
            <p style={{ margin: '0 0 14px', fontSize: '0.86rem', color: 'var(--text-secondary)' }}>
              Coaching policies and available trainers at this facility.
            </p>

            <div className="trainer-policy-cards">
              {/* Guidance Trainer Badge */}
              <div className="trainer-policy-badge">
                <span style={{ fontSize: '0.78rem', textTransform: 'uppercase', color: 'var(--text-secondary)', fontWeight: 600 }}>
                  General Floor Guidance
                </span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', margin: '4px 0' }}>
                  {guidanceTrainerAvailable ? (
                    <CheckCircle size={18} color="#10b981" />
                  ) : (
                    <AlertCircle size={18} color="var(--text-secondary)" />
                  )}
                  <strong style={{ fontSize: '1.05rem', color: guidanceTrainerAvailable ? '#10b981' : 'var(--text-secondary)' }}>
                    {guidanceTrainerAvailable ? 'Guide Trainer: Included Free' : 'Guide Trainer: Not Available'}
                  </strong>
                </div>
                <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                  {guidanceTrainerAvailable 
                    ? 'General guide trainer present on floor to assist with equipment and basic posture.'
                    : 'No free floor guidance trainer provided; self-guided training.'}
                </span>
              </div>

              {/* Personal Trainer Badge */}
              <div className="trainer-policy-badge">
                <span style={{ fontSize: '0.78rem', textTransform: 'uppercase', color: 'var(--text-secondary)', fontWeight: 600 }}>
                  Personal 1-on-1 Trainer
                </span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', margin: '4px 0' }}>
                  {personalTrainerAvailable ? (
                    <CheckCircle size={18} color="var(--primary-accent)" />
                  ) : (
                    <AlertCircle size={18} color="var(--text-secondary)" />
                  )}
                  <strong style={{ fontSize: '1.05rem', color: personalTrainerAvailable ? 'var(--primary-accent)' : 'var(--text-secondary)' }}>
                    {personalTrainerAvailable 
                      ? (personalTrainerFee > 0 ? `Personal Trainer: ${formatRs(personalTrainerFee)} / month` : 'Personal Trainer: Available')
                      : 'Personal Trainer: Not Available'}
                  </strong>
                </div>
                <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                  {personalTrainerAvailable 
                    ? 'Dedicated one-on-one personal training programs available.'
                    : 'Personal training services are not offered at this gym.'}
                </span>
              </div>
            </div>

            {/* Trainer Notes */}
            {Boolean(trainerPolicy.notes && trainerPolicy.notes.trim()) && (
              <div style={{
                marginTop: '12px',
                padding: '12px 16px',
                borderRadius: '10px',
                background: 'rgba(59, 130, 246, 0.05)',
                border: '1px solid rgba(59, 130, 246, 0.2)',
                display: 'flex',
                gap: '10px',
                alignItems: 'flex-start'
              }}>
                <Info size={18} color="var(--primary-accent)" style={{ flexShrink: 0, marginTop: '2px' }} />
                <div>
                  <strong style={{ fontSize: '0.84rem', color: 'var(--text-primary)', display: 'block', marginBottom: '2px' }}>
                    Trainer Guidelines & Notes
                  </strong>
                  <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                    {trainerPolicy.notes}
                  </span>
                </div>
              </div>
            )}

            {/* Trainer Cards */}
            {Array.isArray(gym.trainers) && gym.trainers.length > 0 && (
              <div style={{ marginTop: '20px' }}>
                <h4 style={{ fontSize: '0.95rem', margin: '0 0 12px', color: 'var(--text-secondary)' }}>
                  Certified On-Site Coaches ({gym.trainers.length})
                </h4>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '12px' }}>
                  {gym.trainers.map((tr, idx) => (
                    <div key={idx} style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      padding: '12px 14px',
                      borderRadius: '12px',
                      background: 'var(--card-bg-light, rgba(255,255,255,0.03))',
                      border: '1px solid var(--card-border, rgba(255,255,255,0.08))'
                    }}>
                      <div style={{
                        width: '44px',
                        height: '44px',
                        borderRadius: '50%',
                        background: 'rgba(59, 130, 246, 0.15)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'var(--primary-accent)',
                        fontWeight: 700,
                        fontSize: '1.05rem',
                        overflow: 'hidden',
                        flexShrink: 0
                      }}>
                        {tr.profilePic ? (
                          <img src={getSafeImageUrl(tr.profilePic)} alt={tr.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        ) : (
                          (tr.name || 'T')[0].toUpperCase()
                        )}
                      </div>
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <strong style={{ fontSize: '0.92rem', color: 'var(--text-primary)', display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {tr.name}
                        </strong>
                        <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', display: 'block' }}>
                          {tr.specialization || tr.fitnessLevel || 'Gym Coach'}
                        </span>
                        {tr.bio && (
                          <p style={{ margin: '4px 0 0', fontSize: '0.74rem', color: 'var(--text-secondary)', lineHeight: 1.3, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                            {tr.bio}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Photo Gallery */}
          <h3 style={{ marginTop: '36px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Eye size={20} color="var(--primary-accent)" /> Facility Photo Gallery
          </h3>
          {actualPhotos.length > 0 ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '14px', marginTop: '14px' }}>
              {actualPhotos.map((imgUrl, i) => (
                <div 
                  key={i} 
                  onClick={() => setPreviewPhoto(getSafeImageUrl(imgUrl))}
                  style={{ height: '140px', borderRadius: '12px', overflow: 'hidden', cursor: 'pointer', border: '1px solid var(--border-color)', position: 'relative' }}
                >
                  <img src={getSafeImageUrl(imgUrl)} alt="Facility preview" style={{ width: '100%', height: '100%', objectFit: 'cover', transition: 'transform 0.3s' }} />
                </div>
              ))}
            </div>
          ) : (
            <div style={{ padding: '24px', background: 'var(--card-bg, rgba(255,255,255,0.02))', borderRadius: '12px', border: '1px solid var(--border-color)', marginTop: '14px', textAlign: 'center', color: 'var(--text-secondary)' }}>
              <p style={{ margin: 0, fontSize: '0.9rem' }}>No facility photos uploaded by gym owner yet.</p>
            </div>
          )}

          {/* Facilities */}
          {Array.isArray(gym.facilities) && gym.facilities.length > 0 && (
            <>
              <h3 style={{ marginTop: '36px' }}>Amenities & Facilities</h3>
              <div className="facilities-grid">
                {gym.facilities.map((fac, idx) => (
                  <div key={idx} className="facility-item">
                    <CheckCircle size={16} color="#10b981" /> {fac}
                  </div>
                ))}
              </div>
            </>
          )}

          {/* Detailed Equipment Breakdown */}
          <div style={{ marginTop: '36px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px', marginBottom: '14px' }}>
              <div>
                <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Dumbbell size={20} color="var(--primary-accent)" /> 
                  Available Equipment & Machines
                </h3>
                <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginTop: '2px', display: 'block' }}>
                  {totalEquipmentPieces} total pieces across {rawEquipment.length} machines
                </span>
              </div>

              {maintenanceCount > 0 && (
                <span style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  background: 'rgba(245, 158, 11, 0.15)',
                  color: '#f59e0b',
                  border: '1px solid rgba(245, 158, 11, 0.3)',
                  padding: '4px 10px',
                  borderRadius: '12px',
                  fontSize: '0.8rem',
                  fontWeight: 600
                }}>
                  <Wrench size={14} /> {maintenanceCount} Under Maintenance
                </span>
              )}
            </div>

            {/* Equipment Search Filter */}
            {rawEquipment.length > 0 && (
              <div style={{ position: 'relative', marginBottom: '18px' }}>
                <Search size={18} color="var(--text-secondary)" style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)' }} />
                <input 
                  type="text"
                  className="search-input"
                  placeholder="Search machines (e.g. leg press, treadmill, cable crossover, squat rack)..."
                  value={machineSearch}
                  onChange={e => setMachineSearch(e.target.value)}
                  style={{ paddingLeft: '40px', width: '100%', boxSizing: 'border-box' }}
                />
              </div>
            )}

            {filteredEquipment.length > 0 ? (
              <div>
                {['Cardio', 'Strength Machine', 'Free Weights', 'Functional', 'Other'].map(category => {
                  const items = groupedEquipment[category] || [];
                  if (items.length === 0) return null;

                  return (
                    <div key={category} className="equipment-category-block">
                      <div className="equipment-category-title">
                        <span>{category}</span>
                        <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', fontWeight: 500 }}>
                          ({items.length} {items.length === 1 ? 'type' : 'types'})
                        </span>
                      </div>

                      <div className="equipment-grid">
                        {items.map((eq) => {
                          const isMaint = eq.status === 'Maintenance' || eq.status === 'Under Maintenance';
                          const isUnavail = eq.status === 'Broken' || eq.status === 'Out of Order';

                          return (
                            <div 
                              key={eq.id} 
                              className={`equipment-card-item ${isMaint ? 'is-maintenance' : ''} ${isUnavail ? 'is-unavailable' : ''}`}
                            >
                              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
                                <div style={{
                                  width: '34px',
                                  height: '34px',
                                  borderRadius: '8px',
                                  background: isMaint ? 'rgba(245, 158, 11, 0.15)' : isUnavail ? 'rgba(239, 68, 68, 0.15)' : 'rgba(59, 130, 246, 0.12)',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  flexShrink: 0
                                }}>
                                  {isMaint ? (
                                    <Wrench size={16} color="#f59e0b" />
                                  ) : isUnavail ? (
                                    <AlertCircle size={16} color="#ef4444" />
                                  ) : (
                                    <Dumbbell size={16} color="var(--primary-accent)" />
                                  )}
                                </div>
                                <div style={{ minWidth: 0 }}>
                                  <strong style={{ fontSize: '0.9rem', color: 'var(--text-primary)', display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                    {eq.name}
                                  </strong>
                                  {eq.notes && (
                                    <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                      {eq.notes}
                                    </span>
                                  )}
                                </div>
                              </div>

                              <span style={{
                                fontSize: '0.75rem',
                                fontWeight: 700,
                                padding: '4px 8px',
                                borderRadius: '8px',
                                flexShrink: 0,
                                marginLeft: '8px',
                                background: isMaint 
                                  ? 'rgba(245, 158, 11, 0.15)' 
                                  : isUnavail 
                                  ? 'rgba(239, 68, 68, 0.15)' 
                                  : 'rgba(16, 185, 129, 0.15)',
                                color: isMaint 
                                  ? '#f59e0b' 
                                  : isUnavail 
                                  ? '#ef4444' 
                                  : '#10b981'
                              }}>
                                {eq.quantity > 1 ? `×${eq.quantity} ` : ''}{isMaint ? 'Under Maintenance' : isUnavail ? 'Broken' : (eq.status || 'Available')}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : rawEquipment.length > 0 ? (
              <div style={{ padding: '24px', textAlign: 'center', background: 'var(--card-bg, rgba(255,255,255,0.02))', borderRadius: '12px', border: '1px solid var(--border-color)', color: 'var(--text-secondary)' }}>
                <p style={{ margin: 0, fontSize: '0.9rem' }}>
                  No machines found matching "{machineSearch}". Try searching for another name or keyword.
                </p>
              </div>
            ) : (
              <div style={{ padding: '24px', textAlign: 'center', background: 'var(--card-bg, rgba(255,255,255,0.02))', borderRadius: '12px', border: '1px solid var(--border-color)', color: 'var(--text-secondary)' }}>
                <p style={{ margin: 0, fontSize: '0.9rem' }}>
                  No equipment details listed by gym management yet.
                </p>
              </div>
            )}
          </div>

          {/* Member Reviews */}
          <h3 style={{ marginTop: '36px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Star size={20} fill="#f59e0b" color="#f59e0b" /> Member Reviews
          </h3>
          {Array.isArray(gym.reviews) && gym.reviews.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginTop: '16px' }}>
              {gym.reviews.map((rev, rIdx) => (
                <div key={rev._id || rIdx} style={{ background: 'var(--card-bg, rgba(255,255,255,0.02))', padding: '16px', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <strong>{rev.user?.name || rev.userName || 'Member'}</strong>
                      <div style={{ display: 'flex', gap: '2px' }}>
                        {[...Array(Number(rev.rating) || 5)].map((_, starIdx) => (
                          <Star key={starIdx} size={14} fill="#f59e0b" color="#f59e0b" />
                        ))}
                      </div>
                    </div>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{rev.createdAt ? new Date(rev.createdAt).toLocaleDateString() : ''}</span>
                  </div>
                  <p style={{ margin: 0, color: 'var(--text-primary)', fontSize: '0.9rem', lineHeight: '1.5' }}>
                    "{rev.comment || rev.text || ''}"
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ padding: '24px', background: 'var(--card-bg, rgba(255,255,255,0.02))', borderRadius: '12px', border: '1px solid var(--border-color)', marginTop: '14px', textAlign: 'center', color: 'var(--text-secondary)' }}>
              <p style={{ margin: 0, fontSize: '0.9rem' }}>No member reviews submitted yet.</p>
            </div>
          )}
        </div>

        {/* Membership Rate & Tour Booking Sidebar */}
        <div className="booking-card glass-panel">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
            <h3 style={{ margin: 0 }}>Membership Rate</h3>
            <span style={{ fontSize: '0.75rem', padding: '3px 8px', borderRadius: '12px', background: 'rgba(16, 185, 129, 0.15)', color: '#10b981', fontWeight: 600 }}>
              On-Site Registration
            </span>
          </div>

          {/* Plan Selector (Dropdown only when Yearly is offered) */}
          {offersYearlyPlan ? (
            <div style={{ marginTop: '12px', marginBottom: '14px' }}>
              <label style={{ display: 'block', fontSize: '0.82rem', color: 'var(--text-secondary)', marginBottom: '6px' }}>
                Select Membership Plan
              </label>
              <select
                className="search-input"
                value={selectedPlan}
                onChange={(e) => setSelectedPlan(e.target.value)}
                style={{ width: '100%', cursor: 'pointer', padding: '8px 12px' }}
              >
                <option value="Monthly">Monthly Pass</option>
                <option value="Yearly">
                  {yearlyDiscountPercent > 0 ? `Yearly Pass (Save ${yearlyDiscountPercent}%)` : 'Yearly Pass'}
                </option>
              </select>
            </div>
          ) : (
            <div style={{ marginTop: '12px', marginBottom: '8px' }}>
              <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Monthly Membership Plan
              </span>
            </div>
          )}

          <div className="price-tag">
            <span className="currency">Rs.</span>
            <span className="amount">
              {activePlan === 'Yearly' 
                ? Math.round(yearlyPrice).toLocaleString('en-US') 
                : Math.round(monthlyFee).toLocaleString('en-US')}
            </span>
            <span className="period">{activePlan === 'Yearly' ? '/year' : '/month'}</span>
          </div>

          {activePlan === 'Yearly' && yearlyDiscountPercent > 0 && (
            <p style={{ fontSize: '0.8rem', color: '#10b981', margin: '4px 0 10px', fontWeight: 600 }}>
              Save {yearlyDiscountPercent}% (Regular {formatRs(baseYearly)})
            </p>
          )}

          {/* Fee Breakdown List */}
          <div style={{ margin: '14px 0', borderTop: '1px solid var(--border-color)', borderBottom: '1px solid var(--border-color)', padding: '10px 0', display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.84rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-secondary)' }}>One-time Admission Fee:</span>
              <strong style={{ color: 'var(--text-primary)' }}>
                {admissionFee > 0 ? formatRs(admissionFee) : 'Free'}
              </strong>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-secondary)' }}>Security Deposit:</span>
              <strong style={{ color: 'var(--text-primary)' }}>
                {securityDeposit > 0 ? `${formatRs(securityDeposit)} (${isRefundable ? 'Refundable' : 'Non-refundable'})` : 'No deposit'}
              </strong>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: '6px', borderTop: '1px dashed var(--border-color)' }}>
              <span style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>Estimated First Payment:</span>
              <strong style={{ color: '#10b981', fontSize: '0.95rem' }}>
                {selectedPlan === 'Yearly' ? formatRs(firstTimeYearlyEstimate) : formatRs(firstTimeMonthlyEstimate)}
              </strong>
            </div>
          </div>

          <div style={{ background: 'rgba(59, 130, 246, 0.08)', border: '1px solid rgba(59, 130, 246, 0.2)', padding: '12px', borderRadius: '8px', marginTop: '12px', fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
            <span style={{ color: 'var(--primary-accent)', fontWeight: 600, display: 'block', marginBottom: '2px' }}>
              ⚡ 3 Flexible Payment Options
            </span>
            Pay via Card, Online Mobile Transfer (TID), or reserve a Cash Pass to pay at the gym reception desk!
          </div>

          <button 
            type="button"
            className="btn btn-primary w-100 mt-20" 
            onClick={() => {
              setJoinSuccessData(null);
              setIsJoinModalOpen(true);
            }}
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '14px', fontSize: '1rem', fontWeight: 700 }}
          >
            <CreditCard size={18} /> Join Gym & Get Pass
          </button>

          <button 
            type="button"
            className="btn btn-outline w-100 mt-10" 
            onClick={handleOpenTourModal}
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '10px' }}
          >
            <Calendar size={16} /> Book Free In-Person Tour
          </button>

          <button
            type="button"
            className="btn btn-outline w-100 mt-10"
            onClick={() => {
              if (gym.googleMapsUrl) {
                window.open(gym.googleMapsUrl, '_blank', 'noopener,noreferrer');
              } else {
                const query = encodeURIComponent(`${gym.name} ${gym.address || gym.location || ''}`);
                window.open(`https://www.google.com/maps/search/?api=1&query=${query}`, '_blank', 'noopener,noreferrer');
              }
            }}
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
          >
            <Navigation size={16} /> Get Directions in Maps
          </button>

          <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', textAlign: 'center', marginTop: '14px' }}>
            Walkthrough the facility, test the equipment, and meet on-site coaches before signing up!
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

      {/* Join Gym & Pass Booking Modal */}
      <Modal
        isOpen={isJoinModalOpen}
        onClose={() => setIsJoinModalOpen(false)}
        title={joinSuccessData ? 'Digital Gym Membership Pass' : `Join ${gym.name}`}
      >
        {joinSuccessData ? (
          <div style={{ textAlign: 'center', padding: '10px 0' }}>
            <div style={{
              background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.15) 0%, rgba(16, 185, 129, 0.15) 100%)',
              border: '2px dashed var(--primary-accent)',
              borderRadius: '16px',
              padding: '24px 20px',
              marginBottom: '20px',
              textAlign: 'center'
            }}>
              <span style={{
                background: joinSuccessData.status === 'Active' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(245, 158, 11, 0.2)',
                color: joinSuccessData.status === 'Active' ? '#10b981' : '#f59e0b',
                padding: '4px 12px',
                borderRadius: '20px',
                fontSize: '0.8rem',
                fontWeight: 700,
                textTransform: 'uppercase',
                display: 'inline-block',
                marginBottom: '10px'
              }}>
                {joinSuccessData.status === 'Active' 
                  ? 'Membership Active 🟢' 
                  : joinSuccessData.paymentMethod === 'Cash' 
                  ? 'Cash Pass Reserved 🎟️' 
                  : 'Pending TID Verification ⏳'}
              </span>

              <h3 style={{ margin: '0 0 4px', fontSize: '1.25rem', color: 'var(--text-primary)' }}>{gym.name}</h3>
              <p style={{ margin: '0 0 16px', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                {gym.address || gym.location}{gym.city ? `, ${gym.city}` : ''}
              </p>

              <div style={{ background: 'var(--card-bg, rgba(0,0,0,0.3))', padding: '12px', borderRadius: '10px', marginBottom: '14px' }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block', textTransform: 'uppercase' }}>
                  Pass Reference Code
                </span>
                <strong style={{ fontSize: '1.45rem', fontFamily: 'monospace', color: 'var(--primary-accent)', letterSpacing: '1px' }}>
                  {joinSuccessData.passCode}
                </strong>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px', textAlign: 'left', fontSize: '0.85rem' }}>
                <div>
                  <span style={{ color: 'var(--text-secondary)', display: 'block', fontSize: '0.75rem' }}>Plan</span>
                  <strong style={{ color: 'var(--text-primary)' }}>{joinSuccessData.plan} Pass</strong>
                </div>
                <div>
                  <span style={{ color: 'var(--text-secondary)', display: 'block', fontSize: '0.75rem' }}>Total Fee</span>
                  <strong style={{ color: '#10b981' }}>Rs. {Number(joinSuccessData.amount).toLocaleString('en-US')}</strong>
                </div>
                <div>
                  <span style={{ color: 'var(--text-secondary)', display: 'block', fontSize: '0.75rem' }}>Start Date</span>
                  <strong style={{ color: 'var(--text-primary)' }}>{new Date(joinSuccessData.startDate).toLocaleDateString()}</strong>
                </div>
                <div>
                  <span style={{ color: 'var(--text-secondary)', display: 'block', fontSize: '0.75rem' }}>Valid Until</span>
                  <strong style={{ color: 'var(--text-primary)' }}>{new Date(joinSuccessData.expiryDate).toLocaleDateString()}</strong>
                </div>
              </div>
            </div>

            {joinSuccessData.paymentMethod === 'Cash' ? (
              <div style={{ background: 'rgba(16, 185, 129, 0.08)', padding: '12px 14px', borderRadius: '10px', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '18px', textAlign: 'left', lineHeight: 1.5 }}>
                <strong style={{ color: '#10b981', display: 'block', marginBottom: '2px' }}>
                  📍 Cash Payment at Reception
                </strong>
                Please bring this pass reference code (<strong>{joinSuccessData.passCode}</strong>) to the gym front desk on or before <strong>{new Date(joinSuccessData.startDate).toLocaleDateString()}</strong>. Pay Rs. {Number(joinSuccessData.amount).toLocaleString('en-US')} in cash at the counter, and your workouts will be active immediately.
              </div>
            ) : joinSuccessData.paymentMethod === 'Online' ? (
              <div style={{ background: 'rgba(59, 130, 246, 0.08)', padding: '12px 14px', borderRadius: '10px', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '18px', textAlign: 'left', lineHeight: 1.5 }}>
                <strong style={{ color: 'var(--primary-accent)', display: 'block', marginBottom: '2px' }}>
                  ⏳ Verification in Progress
                </strong>
                Your Transaction ID (TID) has been sent to {gym.name}'s manager. As soon as management verifies your payment reference with their bank/wallet, your membership will be marked active.
              </div>
            ) : null}

            <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
              <button
                type="button"
                className="btn btn-outline"
                onClick={() => setIsJoinModalOpen(false)}
              >
                Close
              </button>
              {joinSuccessData.status === 'Active' && (
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => {
                    setIsJoinModalOpen(false);
                    navigate('/your-gym');
                  }}
                >
                  Go to Your Gym Page
                </button>
              )}
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmitJoin} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
            {/* Step 1: Select Plan & Pricing Summary */}
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '8px' }}>
                1. Select Membership Duration
              </label>
              {offersYearlyPlan ? (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px' }}>
                  <div 
                    onClick={() => setSelectedPlan('Monthly')}
                    style={{
                      border: selectedPlan === 'Monthly' ? '2px solid var(--primary-accent)' : '1px solid var(--border-color)',
                      background: selectedPlan === 'Monthly' ? 'rgba(59, 130, 246, 0.1)' : 'var(--card-bg, rgba(255,255,255,0.02))',
                      borderRadius: '12px',
                      padding: '12px 14px',
                      cursor: 'pointer',
                      transition: 'all 0.2s'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                      <strong style={{ fontSize: '0.95rem', color: 'var(--text-primary)' }}>Monthly Pass</strong>
                      {selectedPlan === 'Monthly' && <CheckCircle size={16} color="var(--primary-accent)" />}
                    </div>
                    <div style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                      {formatRs(monthlyFee)} <span style={{ fontSize: '0.75rem', fontWeight: 400, color: 'var(--text-secondary)' }}>/ month</span>
                    </div>
                  </div>

                  <div 
                    onClick={() => setSelectedPlan('Yearly')}
                    style={{
                      border: selectedPlan === 'Yearly' ? '2px solid var(--primary-accent)' : '1px solid var(--border-color)',
                      background: selectedPlan === 'Yearly' ? 'rgba(59, 130, 246, 0.1)' : 'var(--card-bg, rgba(255,255,255,0.02))',
                      borderRadius: '12px',
                      padding: '12px 14px',
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                      position: 'relative'
                    }}
                  >
                    {yearlyDiscountPercent > 0 && (
                      <span style={{
                        position: 'absolute',
                        top: '-8px',
                        right: '10px',
                        background: '#10b981',
                        color: '#fff',
                        fontSize: '0.68rem',
                        fontWeight: 700,
                        padding: '1px 6px',
                        borderRadius: '8px'
                      }}>
                        Save {yearlyDiscountPercent}%
                      </span>
                    )}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                      <strong style={{ fontSize: '0.95rem', color: 'var(--text-primary)' }}>Yearly Pass</strong>
                      {selectedPlan === 'Yearly' && <CheckCircle size={16} color="var(--primary-accent)" />}
                    </div>
                    <div style={{ fontSize: '1.15rem', fontWeight: 800, color: '#10b981' }}>
                      {formatRs(yearlyPrice)} <span style={{ fontSize: '0.75rem', fontWeight: 400, color: 'var(--text-secondary)' }}>/ year</span>
                    </div>
                  </div>
                </div>
              ) : (
                <div 
                  style={{
                    border: '2px solid var(--primary-accent)',
                    background: 'rgba(59, 130, 246, 0.08)',
                    borderRadius: '12px',
                    padding: '14px 16px'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                    <strong style={{ fontSize: '0.95rem', color: 'var(--text-primary)' }}>Monthly Membership Pass</strong>
                    <CheckCircle size={16} color="var(--primary-accent)" />
                  </div>
                  <div style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                    {formatRs(monthlyFee)} <span style={{ fontSize: '0.8rem', fontWeight: 400, color: 'var(--text-secondary)' }}>/ month</span>
                  </div>
                </div>
              )}
            </div>

            {/* Fee Breakdown Card */}
            <div style={{
              background: 'var(--card-bg-light, rgba(255,255,255,0.03))',
              border: '1px solid var(--card-border, rgba(255,255,255,0.08))',
              borderRadius: '12px',
              padding: '14px 16px',
              fontSize: '0.85rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '6px'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-secondary)' }}>{selectedPlan} Fee:</span>
                <strong style={{ color: 'var(--text-primary)' }}>{formatRs(effectivePlanPrice)}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-secondary)' }}>One-time Admission Fee:</span>
                <strong style={{ color: 'var(--text-primary)' }}>{admissionFee > 0 ? formatRs(admissionFee) : 'Free'}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Security Deposit:</span>
                <strong style={{ color: 'var(--text-primary)' }}>
                  {securityDeposit > 0 ? `${formatRs(securityDeposit)} (${isRefundable ? 'Refundable' : 'Non-refundable'})` : 'No deposit'}
                </strong>
              </div>

              {appliedDiscount > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#10b981' }}>
                  <span>Coupon Discount ({appliedCouponInfo?.code}):</span>
                  <strong>- {formatRs(appliedDiscount)}</strong>
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px dashed var(--border-color)', paddingTop: '8px', marginTop: '4px' }}>
                <strong style={{ color: 'var(--text-primary)', fontSize: '0.95rem' }}>Total First-Time Payable:</strong>
                <strong style={{ color: '#10b981', fontSize: '1.15rem' }}>{formatRs(netPayableTotal)}</strong>
              </div>
            </div>

            {/* Coupon Code Input */}
            <div style={{ display: 'flex', gap: '8px' }}>
              <input
                type="text"
                className="search-input"
                placeholder="Have a coupon / offer code?"
                value={joinCouponCode}
                onChange={e => setJoinCouponCode(e.target.value.toUpperCase())}
                style={{ flex: 1, textTransform: 'uppercase' }}
              />
              <button
                type="button"
                className="btn btn-outline"
                onClick={handleApplyCoupon}
                style={{ padding: '8px 16px' }}
              >
                Apply
              </button>
            </div>

            {/* Step 2: Choose Start Date */}
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '8px' }}>
                2. When Do You Want to Start?
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px', marginBottom: '8px' }}>
                <label style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '10px 12px',
                  borderRadius: '10px',
                  border: joinStartDateOption === 'today' ? '2px solid var(--primary-accent)' : '1px solid var(--border-color)',
                  background: joinStartDateOption === 'today' ? 'rgba(59, 130, 246, 0.1)' : 'transparent',
                  cursor: 'pointer',
                  fontSize: '0.84rem'
                }}>
                  <input
                    type="radio"
                    name="startDateOpt"
                    checked={joinStartDateOption === 'today'}
                    onChange={() => setJoinStartDateOption('today')}
                  />
                  <span>Start Today ({new Date().toLocaleDateString()})</span>
                </label>

                <label style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '10px 12px',
                  borderRadius: '10px',
                  border: joinStartDateOption === 'custom' ? '2px solid var(--primary-accent)' : '1px solid var(--border-color)',
                  background: joinStartDateOption === 'custom' ? 'rgba(59, 130, 246, 0.1)' : 'transparent',
                  cursor: 'pointer',
                  fontSize: '0.84rem'
                }}>
                  <input
                    type="radio"
                    name="startDateOpt"
                    checked={joinStartDateOption === 'custom'}
                    onChange={() => setJoinStartDateOption('custom')}
                  />
                  <span>Choose Later Date</span>
                </label>
              </div>

              {joinStartDateOption === 'custom' && (
                <div style={{ marginTop: '8px' }}>
                  <input
                    type="date"
                    className="search-input"
                    min={new Date().toISOString().slice(0, 10)}
                    value={customJoinDate}
                    onChange={e => setCustomJoinDate(e.target.value)}
                    style={{ width: '100%' }}
                    required
                  />
                </div>
              )}

              <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
                📅 Validity: <strong>{effectiveStartDate.toLocaleDateString()}</strong> till <strong>{effectiveExpiryDate.toLocaleDateString()}</strong> ({selectedPlan === 'Yearly' ? '1 Year' : '1 Month'})
              </div>
            </div>

            {/* Step 3: Choose Payment Method (Direct 3 Methods) */}
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '8px' }}>
                3. Choose Payment Method
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
                {[
                  { id: 'Card', label: 'Card (Instant)', icon: '💳' },
                  { id: 'Online', label: 'Online (TID)', icon: '📱' },
                  { id: 'Cash', label: 'Cash at Gym', icon: '💵' }
                ].map(m => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setJoinPaymentMethod(m.id)}
                    style={{
                      padding: '12px 10px',
                      borderRadius: '10px',
                      border: joinPaymentMethod === m.id ? '2px solid var(--primary-accent)' : '1px solid var(--border-color)',
                      background: joinPaymentMethod === m.id ? 'rgba(59, 130, 246, 0.12)' : 'var(--card-bg, rgba(255,255,255,0.02))',
                      color: 'var(--text-primary)',
                      cursor: 'pointer',
                      textAlign: 'center',
                      fontWeight: joinPaymentMethod === m.id ? 700 : 500,
                      fontSize: '0.82rem',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: '4px'
                    }}
                  >
                    <span style={{ fontSize: '1.25rem' }}>{m.icon}</span>
                    <span>{m.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Payment Method Specific Inputs */}
            {joinPaymentMethod === 'Card' && (
              <div style={{
                background: 'rgba(59, 130, 246, 0.06)',
                border: '1px solid rgba(59, 130, 246, 0.2)',
                borderRadius: '10px',
                padding: '12px 14px',
                fontSize: '0.82rem',
                color: 'var(--text-secondary)'
              }}>
                <strong style={{ color: 'var(--primary-accent)', display: 'block', marginBottom: '2px' }}>
                  💳 Instant Direct Card Processing
                </strong>
                Your membership pass is generated and activated immediately upon confirmation.
              </div>
            )}

            {joinPaymentMethod === 'Online' && (
              <div style={{
                background: 'rgba(59, 130, 246, 0.06)',
                border: '1px solid rgba(59, 130, 246, 0.2)',
                borderRadius: '10px',
                padding: '14px',
                display: 'flex',
                flexDirection: 'column',
                gap: '10px'
              }}>
                <div>
                  <strong style={{ fontSize: '0.86rem', color: 'var(--text-primary)', display: 'block', marginBottom: '4px' }}>
                    Transfer to {gym.name} Official Account:
                  </strong>
                  <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                    <div><strong>Bank / Wallet:</strong> JazzCash / Easypaisa / Meezan Bank</div>
                    <div><strong>Account Number:</strong> <code>0300-1234567</code> / <code>0102938475619</code></div>
                    <div><strong>Account Title:</strong> {gym.name} / GymSync Billing</div>
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, marginBottom: '6px' }}>
                    Enter Transaction ID (TID) from receipt *
                  </label>
                  <input
                    type="text"
                    required
                    className="search-input"
                    placeholder="e.g. TID-98234812 / Ref ID"
                    value={onlineTid}
                    onChange={e => setOnlineTid(e.target.value)}
                    style={{ width: '100%' }}
                  />
                  <span style={{ fontSize: '0.74rem', color: 'var(--text-secondary)', marginTop: '3px', display: 'block' }}>
                    The gym owner will cross-check this TID with their bank statement and activate your membership.
                  </span>
                </div>
              </div>
            )}

            {joinPaymentMethod === 'Cash' && (
              <div style={{
                background: 'rgba(16, 185, 129, 0.08)',
                border: '1px solid rgba(16, 185, 129, 0.25)',
                borderRadius: '10px',
                padding: '14px',
                fontSize: '0.84rem',
                color: 'var(--text-secondary)',
                lineHeight: 1.5
              }}>
                <strong style={{ color: '#10b981', display: 'block', marginBottom: '4px' }}>
                  💵 Pay at Reception Counter
                </strong>
                A digital pass code will be issued. Visit {gym.name} on or before <strong>{effectiveStartDate.toLocaleDateString()}</strong> to pay <strong>{formatRs(netPayableTotal)}</strong> in cash at the counter to activate your workout pass!
              </div>
            )}

            <div>
              <label style={{ display: 'block', fontSize: '0.82rem', marginBottom: '6px' }}>Contact Phone / WhatsApp Number</label>
              <input
                type="tel"
                className="search-input"
                placeholder="+92 300 1234567"
                value={joinPhone}
                onChange={e => setJoinPhone(e.target.value)}
                style={{ width: '100%' }}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
              <button
                type="button"
                className="btn btn-outline"
                onClick={() => setIsJoinModalOpen(false)}
                disabled={isSubmittingJoin}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={isSubmittingJoin}
                style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '10px 20px' }}
              >
                {isSubmittingJoin ? (
                  'Processing...'
                ) : joinPaymentMethod === 'Card' ? (
                  <>
                    <CreditCard size={16} /> Pay {formatRs(netPayableTotal)} & Activate Now
                  </>
                ) : joinPaymentMethod === 'Online' ? (
                  <>
                    <CheckCircle size={16} /> Submit TID ({formatRs(netPayableTotal)})
                  </>
                ) : (
                  <>
                    <Banknote size={16} /> Reserve Cash Pass ({formatRs(netPayableTotal)})
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </Modal>




    </div>
  );
};

export default GymDetails;
