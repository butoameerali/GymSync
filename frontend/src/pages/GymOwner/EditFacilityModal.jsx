import React, { useState, useEffect } from 'react';
import { 
  X, Building2, DollarSign, Clock, Sparkles, Image as ImageIcon, 
  Check, Save, AlertCircle, ShieldAlert 
} from 'lucide-react';
import { toast } from 'react-toastify';
import './EditFacilityModal.css';

const DEFAULT_AMENITIES = [
  'Air Conditioned',
  'Locker Rooms',
  'Showers',
  'Steam / Sauna Bath',
  'Cardio Zone',
  'Free Weights Area',
  'CrossFit Rig',
  'Personal Training',
  'Free Wi-Fi',
  'Parking Facility',
  'Nutrition & Supplements Bar',
  'Ladies Specific Timings',
  'Open 24/7',
  'Water Dispenser / RO Plant'
];

const EditFacilityModal = ({ isOpen, onClose, gym, onSaved, initialSection = 'info' }) => {
  const [activeTab, setActiveTab] = useState(initialSection);
  const [isSaving, setIsSaving] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    location: '',
    contactPhone: '',
    contactEmail: '',
    monthlyFee: 0,
    admissionFee: 0,
    securityDeposit: 0,
    securityDepositRefundable: true,
    offersYearlyPlan: false,
    yearlyDiscountPercent: 0,
    timingsWeekday: '6:00 AM - 10:00 PM',
    timingsWeekend: '8:00 AM - 8:00 PM',
    facilities: [],
    customAmenity: '',
    photoUrl: '',
    todayTrainingTip: ''
  });

  useEffect(() => {
    if (gym) {
      const existingAmenities = Array.isArray(gym.facilities) && gym.facilities.length > 0
        ? gym.facilities
        : (Array.isArray(gym.amenities) ? gym.amenities : []);

      setFormData({
        name: gym.name || gym.branchName || '',
        description: gym.description || '',
        location: gym.address || gym.location || '',
        contactPhone: gym.contactPhone || gym.phone || '',
        contactEmail: gym.contactEmail || gym.email || '',
        monthlyFee: Number(gym.monthlyFee ?? 0),
        admissionFee: Number(gym.admissionFee ?? 0),
        securityDeposit: Number(gym.securityDeposit ?? 0),
        securityDepositRefundable: gym.securityDepositRefundable !== false,
        offersYearlyPlan: Boolean(gym.offersYearlyPlan || (Number(gym.yearlyDiscountPercent) > 0)),
        yearlyDiscountPercent: Number(gym.yearlyDiscountPercent ?? 0),
        timingsWeekday: gym.timings?.weekday || '6:00 AM - 10:00 PM',
        timingsWeekend: gym.timings?.weekend || '8:00 AM - 8:00 PM',
        facilities: existingAmenities,
        customAmenity: '',
        photoUrl: gym.equipmentImages?.[0] || gym.photos?.[0] || '',
        todayTrainingTip: gym.todayTrainingTip?.today || (typeof gym.todayTrainingTip === 'string' ? gym.todayTrainingTip : '')
      });
      if (initialSection) {
        setActiveTab(initialSection);
      }
    }
  }, [gym, isOpen, initialSection]);

  if (!isOpen || !gym) return null;

  const isLockedStatus = ['Approved', 'Pending Review', 'Under Review', 'More Information Required'].includes(gym.approvalStatus);

  const toggleAmenity = (amenity) => {
    setFormData(prev => {
      const exists = prev.facilities.includes(amenity);
      const updated = exists 
        ? prev.facilities.filter(a => a !== amenity)
        : [...prev.facilities, amenity];
      return { ...prev, facilities: updated };
    });
  };

  const handleAddCustomAmenity = (e) => {
    e.preventDefault();
    const trimmed = formData.customAmenity.trim();
    if (!trimmed) return;
    if (!formData.facilities.includes(trimmed)) {
      setFormData(prev => ({
        ...prev,
        facilities: [...prev.facilities, trimmed],
        customAmenity: ''
      }));
    } else {
      setFormData(prev => ({ ...prev, customAmenity: '' }));
    }
  };

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    setIsSaving(true);

    const token = localStorage.getItem('gymsync_token') || '';
    const gymId = gym._id || gym.id;

    try {
      const payload = {
        name: formData.name.trim(),
        description: formData.description.trim(),
        monthlyFee: Number(formData.monthlyFee) || 0,
        admissionFee: Number(formData.admissionFee) || 0,
        securityDeposit: Number(formData.securityDeposit) || 0,
        securityDepositRefundable: Boolean(formData.securityDepositRefundable),
        offersYearlyPlan: Boolean(formData.offersYearlyPlan),
        yearlyDiscountPercent: Number(formData.yearlyDiscountPercent) || 0,
        contactPhone: formData.contactPhone.trim(),
        contactEmail: formData.contactEmail.trim(),
        facilities: formData.facilities,
        timings: {
          weekday: formData.timingsWeekday.trim(),
          weekend: formData.timingsWeekend.trim()
        }
      };

      if (!isLockedStatus && formData.location) {
        payload.location = formData.location.trim();
      }

      if (formData.photoUrl) {
        payload.equipmentImages = [formData.photoUrl.trim()];
        payload.photos = [formData.photoUrl.trim()];
      }

      if (formData.todayTrainingTip) {
        payload.todayTrainingTip = {
          today: formData.todayTrainingTip.trim(),
          tomorrow: ''
        };
      }

      const res = await fetch(`/api/gym-owner/gym/${gymId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Failed to update facility');
      }

      toast.success('Gym facility profile updated successfully!');
      if (onSaved) {
        onSaved(data);
      }
      onClose();
    } catch (err) {
      toast.error(err.message || 'Error saving facility details');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="edit-facility-modal-overlay" onClick={onClose}>
      <div className="edit-facility-modal-card" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="edit-facility-header">
          <div>
            <h2>
              <Building2 size={20} color="var(--primary-accent, #3b82f6)" />
              Edit Facility: {gym.name || 'Gym'}
            </h2>
            <p>Customize how your gym appears to members and the public.</p>
          </div>
          <button className="edit-facility-close-btn" onClick={onClose} aria-label="Close">
            <X size={20} />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="edit-facility-tabs">
          <button 
            type="button"
            className={`edit-facility-tab-btn ${activeTab === 'info' ? 'active' : ''}`}
            onClick={() => setActiveTab('info')}
          >
            <Building2 size={15} /> Overview &amp; Bio
          </button>
          <button 
            type="button"
            className={`edit-facility-tab-btn ${activeTab === 'pricing' ? 'active' : ''}`}
            onClick={() => setActiveTab('pricing')}
          >
            <DollarSign size={15} /> Membership Fees (PKR)
          </button>
          <button 
            type="button"
            className={`edit-facility-tab-btn ${activeTab === 'timings' ? 'active' : ''}`}
            onClick={() => setActiveTab('timings')}
          >
            <Clock size={15} /> Operating Hours
          </button>
          <button 
            type="button"
            className={`edit-facility-tab-btn ${activeTab === 'amenities' ? 'active' : ''}`}
            onClick={() => setActiveTab('amenities')}
          >
            <Sparkles size={15} /> Amenities ({formData.facilities.length})
          </button>
          <button 
            type="button"
            className={`edit-facility-tab-btn ${activeTab === 'photos' ? 'active' : ''}`}
            onClick={() => setActiveTab('photos')}
          >
            <ImageIcon size={15} /> Cover Photo
          </button>
        </div>

        {/* Modal Form Body */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
          <div className="edit-facility-body">

            {/* TAB 1: Overview & Bio */}
            {activeTab === 'info' && (
              <div className="edit-facility-section">
                <div className="edit-form-group">
                  <label>
                    Gym Facility Name
                    {isLockedStatus && (
                      <span className="hint" style={{ color: '#10b981' }}>
                        🔒 Approved / Verified Listing
                      </span>
                    )}
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    disabled={isLockedStatus}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g. Fitit Gym &amp; Fitness Center"
                  />
                </div>

                <div className="edit-form-group">
                  <label>About This Gym (Public Description / Bio)</label>
                  <textarea
                    rows={4}
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Describe your gym's training vibe, target members, equipment variety, hygiene, and coaching standards..."
                  />
                </div>

                <div className="edit-form-row-2">
                  <div className="edit-form-group">
                    <label>Contact Phone</label>
                    <input
                      type="tel"
                      value={formData.contactPhone}
                      onChange={(e) => setFormData({ ...formData, contactPhone: e.target.value })}
                      placeholder="0300-1234567"
                    />
                  </div>
                  <div className="edit-form-group">
                    <label>Official Email</label>
                    <input
                      type="email"
                      value={formData.contactEmail}
                      onChange={(e) => setFormData({ ...formData, contactEmail: e.target.value })}
                      placeholder="contact@gymsync.pk"
                    />
                  </div>
                </div>

                <div className="edit-form-group">
                  <label>
                    Facility Address / Location
                    {isLockedStatus && (
                      <span className="hint" style={{ color: '#10b981' }}>
                        🔒 Location verified on map
                      </span>
                    )}
                  </label>
                  <input
                    type="text"
                    value={formData.location}
                    disabled={isLockedStatus}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                    placeholder="e.g. Block 6, PECHS, Karachi"
                  />
                </div>

                <div className="edit-form-group">
                  <label>Daily Announcement / Today's Training Tip</label>
                  <input
                    type="text"
                    value={formData.todayTrainingTip}
                    onChange={(e) => setFormData({ ...formData, todayTrainingTip: e.target.value })}
                    placeholder="e.g. Leg Day Challenge tonight with Coach Hamza!"
                  />
                </div>
              </div>
            )}

            {/* TAB 2: Pricing (PKR) */}
            {activeTab === 'pricing' && (
              <div className="edit-facility-section">
                <div className="edit-form-row-2">
                  <div className="edit-form-group">
                    <label>Monthly Pass Fee (Rs. PKR)</label>
                    <input
                      type="number"
                      min="0"
                      step="100"
                      value={formData.monthlyFee}
                      onChange={(e) => setFormData({ ...formData, monthlyFee: e.target.value })}
                      placeholder="e.g. 5000"
                    />
                  </div>

                  <div className="edit-form-group">
                    <label>Admission / Registration Fee (Rs. PKR)</label>
                    <input
                      type="number"
                      min="0"
                      step="100"
                      value={formData.admissionFee}
                      onChange={(e) => setFormData({ ...formData, admissionFee: e.target.value })}
                      placeholder="e.g. 1500"
                    />
                  </div>
                </div>

                <div className="edit-form-row-2">
                  <div className="edit-form-group">
                    <label>Security Deposit (Rs. PKR)</label>
                    <input
                      type="number"
                      min="0"
                      step="100"
                      value={formData.securityDeposit}
                      onChange={(e) => setFormData({ ...formData, securityDeposit: e.target.value })}
                      placeholder="0 if none"
                    />
                  </div>

                  <div className="edit-form-group" style={{ justifyContent: 'center' }}>
                    <label style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', marginTop: '16px' }}>
                      <input
                        type="checkbox"
                        checked={formData.securityDepositRefundable}
                        onChange={(e) => setFormData({ ...formData, securityDepositRefundable: e.target.checked })}
                        style={{ width: '18px', height: '18px', accentColor: '#10b981' }}
                      />
                      <span>Security deposit is refundable upon exit</span>
                    </label>
                  </div>
                </div>

                <div style={{ marginTop: '12px', padding: '16px', borderRadius: '12px', background: 'var(--card-bg-light)', border: '1px solid var(--card-border)' }}>
                  <label style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '10px', fontWeight: 600 }}>
                    <input
                      type="checkbox"
                      checked={formData.offersYearlyPlan}
                      onChange={(e) => setFormData({ ...formData, offersYearlyPlan: e.target.checked })}
                      style={{ width: '18px', height: '18px', accentColor: '#3b82f6' }}
                    />
                    <span>Offer Annual (Yearly) Membership with Discount</span>
                  </label>

                  {formData.offersYearlyPlan && (
                    <div className="edit-form-group" style={{ marginTop: '14px' }}>
                      <label>Yearly Plan Discount Percentage (%)</label>
                      <input
                        type="number"
                        min="1"
                        max="50"
                        value={formData.yearlyDiscountPercent}
                        onChange={(e) => setFormData({ ...formData, yearlyDiscountPercent: e.target.value })}
                        placeholder="e.g. 15 for 15% off"
                      />
                      <span className="hint">Members save this percentage when paying for a 12-month pass upfront.</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* TAB 3: Operating Hours */}
            {activeTab === 'timings' && (
              <div className="edit-facility-section">
                <div className="edit-form-group">
                  <label>Weekday Operating Timings (Monday – Friday / Saturday)</label>
                  <input
                    type="text"
                    value={formData.timingsWeekday}
                    onChange={(e) => setFormData({ ...formData, timingsWeekday: e.target.value })}
                    placeholder="e.g. 6:00 AM – 11:00 PM"
                  />
                </div>

                <div className="edit-form-group">
                  <label>Weekend Operating Timings (Sunday / Holidays)</label>
                  <input
                    type="text"
                    value={formData.timingsWeekend}
                    onChange={(e) => setFormData({ ...formData, timingsWeekend: e.target.value })}
                    placeholder="e.g. 8:00 AM – 8:00 PM (or Closed on Sundays)"
                  />
                </div>
              </div>
            )}

            {/* TAB 4: Amenities */}
            {activeTab === 'amenities' && (
              <div className="edit-facility-section">
                <label style={{ fontSize: '0.9rem', fontWeight: 600 }}>Select Included Facility Features &amp; Amenities</label>
                <div className="amenities-chip-grid">
                  {DEFAULT_AMENITIES.map((amenity, idx) => {
                    const isSelected = formData.facilities.includes(amenity);
                    return (
                      <button
                        key={idx}
                        type="button"
                        className={`amenity-toggle-chip ${isSelected ? 'selected' : ''}`}
                        onClick={() => toggleAmenity(amenity)}
                      >
                        {isSelected && <Check size={14} />}
                        {amenity}
                      </button>
                    );
                  })}
                  {formData.facilities
                    .filter(a => !DEFAULT_AMENITIES.includes(a))
                    .map((customA, cIdx) => (
                      <button
                        key={`custom-${cIdx}`}
                        type="button"
                        className="amenity-toggle-chip selected"
                        onClick={() => toggleAmenity(customA)}
                      >
                        <Check size={14} />
                        {customA}
                      </button>
                    ))}
                </div>

                <div className="edit-form-group" style={{ marginTop: '14px' }}>
                  <label>Add Custom Amenity</label>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <input
                      type="text"
                      value={formData.customAmenity}
                      onChange={(e) => setFormData({ ...formData, customAmenity: e.target.value })}
                      placeholder="e.g. Physiotherapy Clinic, Olympic Lifting Platforms"
                    />
                    <button 
                      type="button" 
                      className="btn-glow btn-sm"
                      onClick={handleAddCustomAmenity}
                    >
                      Add
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 5: Cover Photo */}
            {activeTab === 'photos' && (
              <div className="edit-facility-section">
                <div className="edit-form-group">
                  <label>Main Cover Image / Photo URL</label>
                  <input
                    type="url"
                    value={formData.photoUrl}
                    onChange={(e) => setFormData({ ...formData, photoUrl: e.target.value })}
                    placeholder="https://images.unsplash.com/... or uploaded photo link"
                  />
                  <span className="hint">This image appears as the hero banner on your public gym profile.</span>
                </div>

                {formData.photoUrl && (
                  <div style={{ marginTop: '10px', borderRadius: '12px', overflow: 'hidden', height: '200px', border: '1px solid var(--card-border)' }}>
                    <img 
                      src={formData.photoUrl} 
                      alt="Facility Preview" 
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      onError={(e) => { e.target.style.display = 'none'; }}
                    />
                  </div>
                )}
              </div>
            )}

          </div>

          {/* Footer Actions */}
          <div className="edit-facility-footer">
            <button type="button" className="btn-facility-cancel" onClick={onClose} disabled={isSaving}>
              Cancel
            </button>
            <button type="submit" className="btn-facility-save" disabled={isSaving}>
              <Save size={16} />
              {isSaving ? 'Saving Changes...' : 'Save Facility Profile'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditFacilityModal;
