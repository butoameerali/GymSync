import React, { useState, useEffect } from 'react';
import { 
  Building, 
  MapPin, 
  UserCheck, 
  FileText, 
  CheckCircle, 
  Upload, 
  Lock, 
  AlertCircle, 
  Eye, 
  ArrowRight, 
  ArrowLeft, 
  X, 
  Phone, 
  Mail, 
  Clock, 
  Sparkles,
  ShieldCheck,
  Check
} from 'lucide-react';
import { toast } from 'react-toastify';

const REQUIRED_DOC_TYPES = [
  { key: 'BUSINESS_REGISTRATION', label: 'Business Registration / Commercial License / NTN', desc: 'Official company registration certificate or NTN tax document' },
  { key: 'OWNER_CNIC_FRONT', label: 'Owner CNIC / National ID / Passport (Front & Back)', desc: 'Valid government-issued photo identification' },
  { key: 'SIGNBOARD_PHOTO', label: 'Gym Signboard Photo (with Branch Name)', desc: 'Clear exterior photo showing physical signage and branch branding' },
  { key: 'PREMISES_EVIDENCE', label: 'Utility Bill or Commercial Rent Agreement', desc: 'Proof of premises address matching branch location' },
  { key: 'FACILITY_PHOTOS', label: 'Interior / Equipment Photos', desc: 'Wide-angle photos showing active workout floor & equipment' }
];

const GYM_TYPES = [
  'Unisex Fitness Center',
  'Men-Only Gym',
  'Women-Only Gym',
  '24/7 Access Club',
  'CrossFit Box & Functional Fitness',
  'Powerlifting & Heavy Strength Club',
  'Mixed Martial Arts & Combat Center',
  'Boutique Yoga & Pilates Studio'
];

const AVAILABLE_FACILITIES = [
  'Cardio Zone',
  'Free Weights Area',
  'CrossFit Rig',
  'Sauna & Steam Bath',
  'Showers & Changing Rooms',
  'Lockers',
  'Personal Training',
  'Nutritional Cafe / Smoothie Bar',
  'Car Parking',
  'Wi-Fi'
];

export default function BranchVerificationModal({ branch, onClose, onBranchUpdated }) {
  const [step, setStep] = useState(1);
  const [branchId, setBranchId] = useState(branch?._id || null);
  const [savingDraft, setSavingDraft] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [uploadingDoc, setUploadingDoc] = useState(false);
  const [selectedDocType, setSelectedDocType] = useState(REQUIRED_DOC_TYPES[0].key);
  const [docNumber, setDocNumber] = useState('');
  const [docFile, setDocFile] = useState(null);
  const [documents, setDocuments] = useState([]);
  const [appData, setAppData] = useState(null);

  // Step 1: Gym / Branch Profile
  const [profile, setProfile] = useState({
    branchName: branch?.branchName || branch?.name || '',
    gymType: branch?.gymType || 'Unisex Fitness Center',
    address: branch?.address || branch?.location || '',
    city: branch?.city || '',
    country: branch?.country || 'Pakistan',
    lat: branch?.coordinates?.lat || 24.8607,
    lng: branch?.coordinates?.lng || 67.0011,
    googleMapsUrl: branch?.googleMapsUrl || '',
    contactPhone: branch?.contactPhone || branch?.phone || '',
    contactEmail: branch?.contactEmail || '',
    weekdayTimings: branch?.timings?.weekday || '06:00 AM - 10:00 PM',
    weekendTimings: branch?.timings?.weekend || '08:00 AM - 08:00 PM',
    facilities: Array.isArray(branch?.facilities) ? branch.facilities : ['Cardio Zone', 'Free Weights Area', 'Showers & Changing Rooms']
  });

  // Step 2: Applicant Details
  const [applicant, setApplicant] = useState({
    legalOwnerName: '',
    cnicOrPassport: '',
    applicantRole: 'Owner',
    phone: '',
    email: ''
  });

  // Step 4: Consent Declarations
  const [consentCheck, setConsentCheck] = useState(false);
  const [truthDeclaration, setTruthDeclaration] = useState(false);

  const token = localStorage.getItem('gymsync_token') || '';

  // Load existing application if branch has one
  useEffect(() => {
    if (branch?.verificationApplication) {
      if (typeof branch.verificationApplication === 'object') {
        const va = branch.verificationApplication;
        setAppData(va);
        if (va.applicant) {
          setApplicant(prev => ({
            ...prev,
            legalOwnerName: va.applicant.legalOwnerName || '',
            cnicOrPassport: va.applicant.cnicOrPassport || '',
            applicantRole: va.applicant.applicantRole || 'Owner',
            phone: va.applicant.phone || '',
            email: va.applicant.email || ''
          }));
        }
        if (Array.isArray(va.documents)) {
          setDocuments(va.documents);
        }
      }
    }
  }, [branch]);

  const toggleFacility = (facility) => {
    setProfile(prev => ({
      ...prev,
      facilities: prev.facilities.includes(facility)
        ? prev.facilities.filter(f => f !== facility)
        : [...prev.facilities, facility]
    }));
  };

  const saveDraft = async (advancingToStep = null) => {
    setSavingDraft(true);
    try {
      const payload = {
        branchId: branchId || undefined,
        branchName: profile.branchName,
        gymType: profile.gymType,
        address: profile.address,
        city: profile.city,
        country: profile.country,
        coordinates: { lat: parseFloat(profile.lat) || 0, lng: parseFloat(profile.lng) || 0 },
        googleMapsUrl: profile.googleMapsUrl,
        contactPhone: profile.contactPhone,
        contactEmail: profile.contactEmail,
        timings: {
          weekday: profile.weekdayTimings,
          weekend: profile.weekendTimings
        },
        facilities: profile.facilities,
        applicant
      };

      const res = await fetch('/api/gym-verification/branch/draft', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to save draft');

      if (data.branch?._id) {
        setBranchId(data.branch._id);
      }
      if (data.application) {
        setAppData(data.application);
      }
      toast.success('Branch details saved as draft.');
      if (advancingToStep) {
        setStep(advancingToStep);
      }
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSavingDraft(false);
    }
  };

  const handleUploadDocument = async (e) => {
    e.preventDefault();
    if (!branchId) {
      toast.warning('Please complete and save Step 1 profile first.');
      return;
    }
    if (!docFile) {
      toast.error('Please select a file to upload.');
      return;
    }

    setUploadingDoc(true);
    try {
      const formData = new FormData();
      formData.append('documentType', selectedDocType);
      const label = REQUIRED_DOC_TYPES.find(d => d.key === selectedDocType)?.label || selectedDocType;
      formData.append('documentLabel', label);
      formData.append('documentNumber', docNumber);
      formData.append('file', docFile);

      const res = await fetch(`/api/gym-verification/branch/${branchId}/upload`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to upload document');

      toast.success('Document encrypted (AES-256-GCM) and securely attached!');
      if (data.application && Array.isArray(data.application.documents)) {
        setDocuments(data.application.documents);
        setAppData(data.application);
      }
      setDocFile(null);
      setDocNumber('');
    } catch (err) {
      toast.error(err.message);
    } finally {
      setUploadingDoc(false);
    }
  };

  const handleSubmitApplication = async () => {
    if (!consentCheck || !truthDeclaration) {
      toast.error('Please accept all verification acknowledgments and legal declarations.');
      return;
    }
    if (!branchId) {
      toast.error('Branch identifier missing.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch(`/api/gym-verification/branch/${branchId}/submit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Submission failed');

      toast.success(data.message || 'Branch submitted for verification!');
      if (onBranchUpdated) onBranchUpdated();
      onClose();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handlePreviewDoc = async (docId) => {
    try {
      const res = await fetch(`/api/gym-verification/document/${docId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Failed to retrieve decrypted document');
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      window.open(url, '_blank');
    } catch (err) {
      toast.error(err.message);
    }
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(0, 0, 0, 0.85)',
      backdropFilter: 'blur(6px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 10000,
      padding: '20px'
    }}>
      <div className="glass-panel" style={{
        maxWidth: '850px',
        width: '100%',
        maxHeight: '90vh',
        overflowY: 'auto',
        borderRadius: '20px',
        background: '#0f172a',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.75)',
        display: 'flex',
        flexDirection: 'column'
      }}>
        {/* Modal Header */}
        <div style={{
          padding: '24px 30px',
          borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{ padding: '8px', background: 'rgba(59, 130, 246, 0.15)', borderRadius: '10px' }}>
                <Building size={22} color="#3b82f6" />
              </div>
              <h2 style={{ margin: 0, fontSize: '1.35rem', color: '#fff', fontWeight: 700 }}>
                {branchId ? `Branch Verification: ${profile.branchName || 'Gym Branch'}` : 'New Branch Verification Application'}
              </h2>
            </div>
            <p style={{ margin: '4px 0 0 0', fontSize: '0.85rem', color: '#94a3b8' }}>
              4-Step Official Onboarding with AES-256-GCM Encrypted Evidence Storage
            </p>
          </div>
          <button 
            type="button" 
            onClick={onClose}
            style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: '6px' }}
          >
            <X size={22} />
          </button>
        </div>

        {/* Step Progress Stepper */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          background: 'rgba(255, 255, 255, 0.02)',
          borderBottom: '1px solid rgba(255, 255, 255, 0.08)'
        }}>
          {[
            { num: 1, label: 'Gym Profile', icon: Building },
            { num: 2, label: 'Owner Details', icon: UserCheck },
            { num: 3, label: 'Encrypted Docs', icon: Lock },
            { num: 4, label: 'Review & Submit', icon: CheckCircle }
          ].map(s => {
            const Icon = s.icon;
            const isActive = step === s.num;
            const isCompleted = step > s.num;
            return (
              <button
                key={s.num}
                type="button"
                onClick={() => {
                  if (branchId || s.num === 1) setStep(s.num);
                }}
                disabled={!branchId && s.num > 1}
                style={{
                  padding: '16px 12px',
                  background: 'none',
                  border: 'none',
                  borderBottom: isActive ? '3px solid #3b82f6' : '3px solid transparent',
                  color: isActive ? '#fff' : isCompleted ? '#10b981' : '#64748b',
                  cursor: (branchId || s.num === 1) ? 'pointer' : 'not-allowed',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  fontSize: '0.85rem',
                  fontWeight: isActive ? 600 : 500,
                  transition: 'all 0.2s'
                }}
              >
                <div style={{
                  width: '24px',
                  height: '24px',
                  borderRadius: '50%',
                  background: isCompleted ? '#10b981' : isActive ? '#3b82f6' : 'rgba(255, 255, 255, 0.1)',
                  color: '#fff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '0.75rem',
                  fontWeight: 'bold'
                }}>
                  {isCompleted ? <Check size={14} /> : s.num}
                </div>
                <span>{s.label}</span>
              </button>
            );
          })}
        </div>

        {/* Modal Body */}
        <div style={{ padding: '30px', flex: 1 }}>
          {/* STEP 1: GYM PROFILE */}
          {step === 1 && (
            <div>
              <h3 style={{ fontSize: '1.1rem', color: '#fff', marginBottom: '6px' }}>Step 1: Gym &amp; Branch Information</h3>
              <p style={{ color: '#94a3b8', fontSize: '0.85rem', marginBottom: '20px' }}>
                Specify physical premises address, GPS coordinates, facilities, and branch contact channels.
              </p>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', color: '#94a3b8', marginBottom: '6px' }}>Branch / Gym Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Power Fitness DHA Phase 5"
                    value={profile.branchName}
                    onChange={e => setProfile({ ...profile, branchName: e.target.value })}
                    className="input-field"
                    style={{ width: '100%' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', color: '#94a3b8', marginBottom: '6px' }}>Gym Classification *</label>
                  <select
                    value={profile.gymType}
                    onChange={e => setProfile({ ...profile, gymType: e.target.value })}
                    className="input-field"
                    style={{ width: '100%', background: '#1e293b', color: '#fff' }}
                  >
                    {GYM_TYPES.map(gt => <option key={gt} value={gt}>{gt}</option>)}
                  </select>
                </div>
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', color: '#94a3b8', marginBottom: '6px' }}>Physical Street Address *</label>
                <input
                  type="text"
                  required
                  placeholder="Plot #, Street / Block, Commercial Area"
                  value={profile.address}
                  onChange={e => setProfile({ ...profile, address: e.target.value })}
                  className="input-field"
                  style={{ width: '100%' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', color: '#94a3b8', marginBottom: '6px' }}>City *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Karachi, Lahore, Islamabad"
                    value={profile.city}
                    onChange={e => setProfile({ ...profile, city: e.target.value })}
                    className="input-field"
                    style={{ width: '100%' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', color: '#94a3b8', marginBottom: '6px' }}>Country *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Pakistan"
                    value={profile.country}
                    onChange={e => setProfile({ ...profile, country: e.target.value })}
                    className="input-field"
                    style={{ width: '100%' }}
                  />
                </div>
              </div>

              {/* Coordinates & Google Maps Pin */}
              <div style={{
                background: 'rgba(255, 255, 255, 0.03)',
                padding: '16px',
                borderRadius: '12px',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                marginBottom: '16px'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
                  <MapPin size={18} color="#3b82f6" />
                  <span style={{ fontSize: '0.9rem', color: '#fff', fontWeight: 600 }}>Google Maps Pin &amp; Coordinates</span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 2fr', gap: '12px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.78rem', color: '#94a3b8', marginBottom: '4px' }}>Latitude</label>
                    <input
                      type="number"
                      step="any"
                      placeholder="24.8607"
                      value={profile.lat}
                      onChange={e => setProfile({ ...profile, lat: e.target.value })}
                      className="input-field"
                      style={{ width: '100%' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.78rem', color: '#94a3b8', marginBottom: '4px' }}>Longitude</label>
                    <input
                      type="number"
                      step="any"
                      placeholder="67.0011"
                      value={profile.lng}
                      onChange={e => setProfile({ ...profile, lng: e.target.value })}
                      className="input-field"
                      style={{ width: '100%' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.78rem', color: '#94a3b8', marginBottom: '4px' }}>Google Maps Location URL</label>
                    <input
                      type="url"
                      placeholder="https://maps.google.com/?q=..."
                      value={profile.googleMapsUrl}
                      onChange={e => setProfile({ ...profile, googleMapsUrl: e.target.value })}
                      className="input-field"
                      style={{ width: '100%' }}
                    />
                  </div>
                </div>
              </div>

              {/* Contact Channels */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', color: '#94a3b8', marginBottom: '6px' }}>Branch Contact Phone</label>
                  <input
                    type="tel"
                    placeholder="+92 300 1234567"
                    value={profile.contactPhone}
                    onChange={e => setProfile({ ...profile, contactPhone: e.target.value })}
                    className="input-field"
                    style={{ width: '100%' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', color: '#94a3b8', marginBottom: '6px' }}>Branch Public Email</label>
                  <input
                    type="email"
                    placeholder="branch@powerfitness.com"
                    value={profile.contactEmail}
                    onChange={e => setProfile({ ...profile, contactEmail: e.target.value })}
                    className="input-field"
                    style={{ width: '100%' }}
                  />
                </div>
              </div>

              {/* Operating Hours */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', color: '#94a3b8', marginBottom: '6px' }}>Weekday Timings</label>
                  <input
                    type="text"
                    placeholder="06:00 AM - 10:00 PM"
                    value={profile.weekdayTimings}
                    onChange={e => setProfile({ ...profile, weekdayTimings: e.target.value })}
                    className="input-field"
                    style={{ width: '100%' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', color: '#94a3b8', marginBottom: '6px' }}>Weekend Timings</label>
                  <input
                    type="text"
                    placeholder="08:00 AM - 08:00 PM"
                    value={profile.weekendTimings}
                    onChange={e => setProfile({ ...profile, weekendTimings: e.target.value })}
                    className="input-field"
                    style={{ width: '100%' }}
                  />
                </div>
              </div>

              {/* Facilities Checklist */}
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', color: '#94a3b8', marginBottom: '10px' }}>Key Facilities &amp; Amenities</label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '10px' }}>
                  {AVAILABLE_FACILITIES.map(fac => {
                    const checked = profile.facilities.includes(fac);
                    return (
                      <label 
                        key={fac}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          padding: '10px 14px',
                          borderRadius: '8px',
                          background: checked ? 'rgba(59, 130, 246, 0.15)' : 'rgba(255, 255, 255, 0.03)',
                          border: checked ? '1px solid #3b82f6' : '1px solid rgba(255, 255, 255, 0.08)',
                          cursor: 'pointer',
                          fontSize: '0.85rem',
                          color: checked ? '#fff' : '#94a3b8'
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleFacility(fac)}
                          style={{ cursor: 'pointer' }}
                        />
                        {fac}
                      </label>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: APPLICANT DETAILS */}
          {step === 2 && (
            <div>
              <h3 style={{ fontSize: '1.1rem', color: '#fff', marginBottom: '6px' }}>Step 2: Authorized Applicant &amp; Owner Profile</h3>
              <p style={{ color: '#94a3b8', fontSize: '0.85rem', marginBottom: '20px' }}>
                Capture authoritative legal representative details for compliance and audit trail records.
              </p>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', color: '#94a3b8', marginBottom: '6px' }}>Legal Owner / Representative Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="Full Legal Name"
                    value={applicant.legalOwnerName}
                    onChange={e => setApplicant({ ...applicant, legalOwnerName: e.target.value })}
                    className="input-field"
                    style={{ width: '100%' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', color: '#94a3b8', marginBottom: '6px' }}>CNIC / Passport Number *</label>
                  <input
                    type="text"
                    required
                    placeholder="42101-1234567-1 or Passport No."
                    value={applicant.cnicOrPassport}
                    onChange={e => setApplicant({ ...applicant, cnicOrPassport: e.target.value })}
                    className="input-field"
                    style={{ width: '100%' }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px', marginBottom: '20px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', color: '#94a3b8', marginBottom: '6px' }}>Authorized Role *</label>
                  <select
                    value={applicant.applicantRole}
                    onChange={e => setApplicant({ ...applicant, applicantRole: e.target.value })}
                    className="input-field"
                    style={{ width: '100%', background: '#1e293b', color: '#fff' }}
                  >
                    <option value="Owner">Primary Owner</option>
                    <option value="Managing Partner">Managing Partner</option>
                    <option value="Authorized Director">Authorized Director</option>
                    <option value="General Manager">General Manager</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', color: '#94a3b8', marginBottom: '6px' }}>Direct Phone *</label>
                  <input
                    type="tel"
                    required
                    placeholder="+92 300 0000000"
                    value={applicant.phone}
                    onChange={e => setApplicant({ ...applicant, phone: e.target.value })}
                    className="input-field"
                    style={{ width: '100%' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', color: '#94a3b8', marginBottom: '6px' }}>Official Email *</label>
                  <input
                    type="email"
                    required
                    placeholder="owner@domain.com"
                    value={applicant.email}
                    onChange={e => setApplicant({ ...applicant, email: e.target.value })}
                    className="input-field"
                    style={{ width: '100%' }}
                  />
                </div>
              </div>

              <div style={{
                background: 'rgba(59, 130, 246, 0.08)',
                border: '1px solid rgba(59, 130, 246, 0.25)',
                borderRadius: '12px',
                padding: '16px',
                display: 'flex',
                alignItems: 'center',
                gap: '12px'
              }}>
                <ShieldCheck size={28} color="#3b82f6" style={{ flexShrink: 0 }} />
                <div style={{ fontSize: '0.85rem', color: '#cbd5e1' }}>
                  <strong>Privileged Multi-Branch Verification:</strong> Once your organization and primary applicant credentials are verified, subsequent branches will benefit from streamlined owner validation.
                </div>
              </div>
            </div>
          )}

          {/* STEP 3: ENCRYPTED DOCUMENTS UPLOAD */}
          {step === 3 && (
            <div>
              <h3 style={{ fontSize: '1.1rem', color: '#fff', marginBottom: '6px' }}>Step 3: Verification Evidence &amp; Encrypted Uploads</h3>
              <p style={{ color: '#94a3b8', fontSize: '0.85rem', marginBottom: '16px' }}>
                All uploaded documents are authenticated and encrypted at rest with <strong>AES-256-GCM</strong>. Only authorized verification officers and yourself may decrypt them.
              </p>

              {/* Upload Form */}
              <form onSubmit={handleUploadDocument} style={{
                background: 'rgba(255, 255, 255, 0.03)',
                border: '1px dashed rgba(59, 130, 246, 0.4)',
                borderRadius: '14px',
                padding: '20px',
                marginBottom: '24px'
              }}>
                <h4 style={{ margin: '0 0 14px 0', fontSize: '0.95rem', color: '#3b82f6', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Upload size={18} /> Attach Verification Document
                </h4>

                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '14px', marginBottom: '14px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', color: '#94a3b8', marginBottom: '4px' }}>Document Category *</label>
                    <select
                      value={selectedDocType}
                      onChange={e => setSelectedDocType(e.target.value)}
                      className="input-field"
                      style={{ width: '100%', background: '#1e293b', color: '#fff' }}
                    >
                      {REQUIRED_DOC_TYPES.map(rd => (
                        <option key={rd.key} value={rd.key}>{rd.label}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', color: '#94a3b8', marginBottom: '4px' }}>Document / Ref Number</label>
                    <input
                      type="text"
                      placeholder="e.g. NTN-982181 / CNIC #"
                      value={docNumber}
                      onChange={e => setDocNumber(e.target.value)}
                      className="input-field"
                      style={{ width: '100%' }}
                    />
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap' }}>
                  <input
                    type="file"
                    required
                    accept=".pdf,.png,.jpg,.jpeg"
                    onChange={e => setDocFile(e.target.files[0] || null)}
                    style={{ flex: 1, color: '#94a3b8', fontSize: '0.85rem' }}
                  />
                  <button
                    type="submit"
                    disabled={uploadingDoc || !docFile}
                    className="btn btn-primary"
                    style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                  >
                    <Lock size={14} /> {uploadingDoc ? 'Encrypting & Uploading...' : 'Encrypt & Upload (AES-256)'}
                  </button>
                </div>
              </form>

              {/* Uploaded Documents Checklist */}
              <div>
                <h4 style={{ fontSize: '0.95rem', color: '#fff', marginBottom: '12px' }}>Uploaded Verification Records ({documents.length})</h4>
                {documents.length === 0 ? (
                  <div style={{ padding: '24px', textAlign: 'center', background: 'rgba(255, 255, 255, 0.02)', borderRadius: '10px' }}>
                    <p style={{ color: '#64748b', margin: 0, fontSize: '0.85rem' }}>No documents uploaded yet. Please upload the required documents above.</p>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {documents.map((d, idx) => (
                      <div
                        key={d._id || idx}
                        style={{
                          padding: '12px 16px',
                          background: 'rgba(255, 255, 255, 0.03)',
                          borderRadius: '10px',
                          border: '1px solid rgba(255, 255, 255, 0.06)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          flexWrap: 'wrap',
                          gap: '10px'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <CheckCircle size={18} color="#10b981" />
                          <div>
                            <div style={{ fontSize: '0.9rem', color: '#fff', fontWeight: 600 }}>{d.documentLabel || d.documentType}</div>
                            <div style={{ fontSize: '0.78rem', color: '#94a3b8' }}>
                              Original: {d.originalFileName || 'file'} • {d.documentNumber ? `Ref: ${d.documentNumber}` : 'Secured with AES-256-GCM'}
                            </div>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => handlePreviewDoc(d._id)}
                          className="btn btn-outline btn-sm"
                          style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '0.78rem' }}
                        >
                          <Eye size={14} /> Decrypted Preview
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* STEP 4: REVIEW & SUBMIT */}
          {step === 4 && (
            <div>
              <h3 style={{ fontSize: '1.1rem', color: '#fff', marginBottom: '6px' }}>Step 4: Final Inspection &amp; Legal Consent</h3>
              <p style={{ color: '#94a3b8', fontSize: '0.85rem', marginBottom: '20px' }}>
                Review application details, verify required document attachments, and submit for verification review.
              </p>

              {/* Summary Cards */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '20px' }}>
                <div style={{ background: 'rgba(255, 255, 255, 0.03)', padding: '16px', borderRadius: '12px', border: '1px solid rgba(255, 255, 255, 0.06)' }}>
                  <h4 style={{ margin: '0 0 10px 0', fontSize: '0.9rem', color: '#3b82f6' }}>Gym Profile Summary</h4>
                  <div style={{ fontSize: '0.85rem', color: '#cbd5e1', lineHeight: '1.8' }}>
                    <div><strong>Branch:</strong> {profile.branchName || '-'}</div>
                    <div><strong>Type:</strong> {profile.gymType}</div>
                    <div><strong>Address:</strong> {profile.address}, {profile.city}, {profile.country}</div>
                    <div><strong>Coordinates:</strong> {profile.lat}, {profile.lng}</div>
                    <div><strong>Phone:</strong> {profile.contactPhone || '-'}</div>
                  </div>
                </div>

                <div style={{ background: 'rgba(255, 255, 255, 0.03)', padding: '16px', borderRadius: '12px', border: '1px solid rgba(255, 255, 255, 0.06)' }}>
                  <h4 style={{ margin: '0 0 10px 0', fontSize: '0.9rem', color: '#3b82f6' }}>Applicant &amp; Document Summary</h4>
                  <div style={{ fontSize: '0.85rem', color: '#cbd5e1', lineHeight: '1.8' }}>
                    <div><strong>Representative:</strong> {applicant.legalOwnerName || '-'}</div>
                    <div><strong>CNIC / Passport:</strong> {applicant.cnicOrPassport || '-'}</div>
                    <div><strong>Role:</strong> {applicant.applicantRole}</div>
                    <div><strong>Direct Phone:</strong> {applicant.phone || '-'}</div>
                    <div><strong>Attached Encrypted Files:</strong> {documents.length} record(s)</div>
                  </div>
                </div>
              </div>

              {/* Mandatory Checklist Inspection */}
              <div style={{
                background: documents.length >= 3 ? 'rgba(16, 185, 129, 0.08)' : 'rgba(239, 68, 68, 0.08)',
                border: documents.length >= 3 ? '1px solid rgba(16, 185, 129, 0.3)' : '1px solid rgba(239, 68, 68, 0.3)',
                padding: '16px',
                borderRadius: '12px',
                marginBottom: '20px'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                  {documents.length >= 3 ? <CheckCircle size={18} color="#10b981" /> : <AlertCircle size={18} color="#ef4444" />}
                  <span style={{ fontSize: '0.9rem', fontWeight: 600, color: documents.length >= 3 ? '#10b981' : '#ef4444' }}>
                    Document Requirement Check: {documents.length} / 5 Uploaded
                  </span>
                </div>
                <p style={{ margin: 0, fontSize: '0.82rem', color: '#cbd5e1' }}>
                  {documents.length >= 3 
                    ? 'Mandatory documents are attached. You can now execute the submission.'
                    : 'At least 3 core documents (Commercial License, CNIC, and Signboard Photo) are required to initiate official review.'}
                </p>
              </div>

              {/* Declarations & Consent */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '24px' }}>
                <label style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', cursor: 'pointer', fontSize: '0.85rem', color: '#cbd5e1' }}>
                  <input
                    type="checkbox"
                    checked={truthDeclaration}
                    onChange={e => setTruthDeclaration(e.target.checked)}
                    style={{ marginTop: '3px' }}
                  />
                  <span>I declare under penalty of perjury that all submitted physical address data, coordinates, and ownership records are accurate, truthful, and representative of active gym operations.</span>
                </label>

                <label style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', cursor: 'pointer', fontSize: '0.85rem', color: '#cbd5e1' }}>
                  <input
                    type="checkbox"
                    checked={consentCheck}
                    onChange={e => setConsentCheck(e.target.checked)}
                    style={{ marginTop: '3px' }}
                  />
                  <span>I authorize GymSync verification officers to inspect attached encrypted documentation and perform operational audits before publishing this branch publicly.</span>
                </label>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div style={{
          padding: '20px 30px',
          borderTop: '1px solid rgba(255, 255, 255, 0.1)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          background: 'rgba(255, 255, 255, 0.02)'
        }}>
          <div>
            {step > 1 && (
              <button
                type="button"
                onClick={() => setStep(step - 1)}
                className="btn btn-outline"
                style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
              >
                <ArrowLeft size={16} /> Previous Step
              </button>
            )}
          </div>

          <div style={{ display: 'flex', gap: '12px' }}>
            <button
              type="button"
              onClick={() => saveDraft()}
              disabled={savingDraft || !profile.branchName}
              className="btn btn-outline"
            >
              {savingDraft ? 'Saving Draft...' : 'Save Draft'}
            </button>

            {step < 4 ? (
              <button
                type="button"
                onClick={() => {
                  if (step === 1) {
                    saveDraft(2);
                  } else if (step === 2) {
                    saveDraft(3);
                  } else {
                    setStep(4);
                  }
                }}
                disabled={savingDraft || (step === 1 && !profile.branchName)}
                className="btn btn-primary"
                style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
              >
                Next Step <ArrowRight size={16} />
              </button>
            ) : (
              <button
                type="button"
                onClick={handleSubmitApplication}
                disabled={submitting || !consentCheck || !truthDeclaration}
                className="btn btn-primary"
                style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: '#10b981', borderColor: '#10b981' }}
              >
                <CheckCircle size={16} /> {submitting ? 'Submitting Application...' : 'Submit Branch for Review'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
