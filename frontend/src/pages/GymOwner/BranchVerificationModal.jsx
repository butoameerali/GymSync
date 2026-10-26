import React, { useState, useEffect, useRef } from 'react';
import { 
  Building, 
  MapPin, 
  UserCheck, 
  CheckCircle, 
  Upload, 
  AlertCircle, 
  Eye, 
  ArrowRight, 
  ArrowLeft, 
  X, 
  ShieldCheck,
  Check,
  Compass,
  ExternalLink,
  Plus,
  Search,
  Navigation,
  FileText,
  Trash2,
  Lock
} from 'lucide-react';
import { toast } from 'react-toastify';
import './BranchVerificationModal.css';

const REQUIRED_DOC_TYPES = [
  { key: 'BUSINESS_REGISTRATION', label: '1. Business Registration / Commercial License / NTN * (Required)', desc: 'Official company registration certificate or NTN tax document' },
  { key: 'OWNER_CNIC_FRONT', label: '2. Owner CNIC / National ID / Passport * (Required)', desc: 'Valid government-issued photo identification' }
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

const POPULAR_FACILITY_SUGGESTIONS = [
  'Cardio Zone',
  'Free Weights Area',
  'CrossFit Rig',
  'Sauna & Steam Bath',
  'Showers & Lockers',
  'Personal Training',
  'Air Conditioning',
  'Female Section / Ladies Hours',
  'Car Parking',
  'Juice & Protein Bar',
  'Wi-Fi',
  '24/7 Access',
  'Olympic Lifting Platform',
  'Boxing / Combat Ring',
  'Yoga & Aerobics Studio'
];

/**
 * Parses user input to extract latitude and longitude.
 * Supports:
 * - Direct coordinates ("24.8607, 67.0011")
 * - Google Maps URL with /@lat,lng
 * - Google Maps URL with ?q=lat,lng or ?ll=lat,lng or query=lat,lng
 * - Google Maps embed with !3dlat!4dlng
 */
function parseLocationInput(input) {
  if (!input || typeof input !== 'string') return null;
  const str = input.trim();

  // Pattern 1: Raw numbers "24.8607, 67.0011" or "24.8607 67.0011"
  const rawMatch = str.match(/^(-?\d{1,2}(?:\.\d+)?)[,\s]+(-?\d{1,3}(?:\.\d+)?)$/);
  if (rawMatch) {
    const lat = parseFloat(rawMatch[1]);
    const lng = parseFloat(rawMatch[2]);
    if (lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
      return { lat, lng };
    }
  }

  // Pattern 2: Standard Google Maps /place/@lat,lng
  const atMatch = str.match(/@(-?\d{1,2}\.\d+),(-?\d{1,3}\.\d+)/);
  if (atMatch) {
    const lat = parseFloat(atMatch[1]);
    const lng = parseFloat(atMatch[2]);
    if (lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
      return { lat, lng };
    }
  }

  // Pattern 3: URL params ?q=lat,lng or ?ll=lat,lng or ?query=lat,lng or destination=lat,lng
  const paramMatch = str.match(/[?&](?:q|ll|query|destination)=(-?\d{1,2}\.\d+),(-?\d{1,3}\.\d+)/);
  if (paramMatch) {
    const lat = parseFloat(paramMatch[1]);
    const lng = parseFloat(paramMatch[2]);
    if (lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
      return { lat, lng };
    }
  }

  // Pattern 4: Google Maps embed !3dlat!4dlng
  const embedMatch = str.match(/!3d(-?\d{1,2}\.\d+)!4d(-?\d{1,3}\.\d+)/);
  if (embedMatch) {
    const lat = parseFloat(embedMatch[1]);
    const lng = parseFloat(embedMatch[2]);
    if (lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
      return { lat, lng };
    }
  }

  return null;
}

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
  const [_appData, setAppData] = useState(null);
  const fileInputRef = useRef(null);
  const [deletingDocId, setDeletingDocId] = useState(null);

  // Dynamic facilities input
  const [customFacility, setCustomFacility] = useState('');

  // Location helpers
  const [detectingLocation, setDetectingLocation] = useState(false);
  const [resolvingLocation, setResolvingLocation] = useState(false);
  const [locationSearchQuery, setLocationSearchQuery] = useState('');
  const [showManualCoords, setShowManualCoords] = useState(false);

  // Step 1: Gym / Branch Profile
  const [profile, setProfile] = useState({
    branchName: branch?.branchName || branch?.name || '',
    gymType: branch?.gymType || 'Unisex Fitness Center',
    address: branch?.address || branch?.location || '',
    city: branch?.city || '',
    country: branch?.country || 'Pakistan',
    lat: branch?.coordinates?.lat || '',
    lng: branch?.coordinates?.lng || '',
    googleMapsUrl: branch?.googleMapsUrl || '',
    contactPhone: branch?.contactPhone || branch?.phone || '',
    contactEmail: branch?.contactEmail || '',
    weekdayTimings: branch?.timings?.weekday || '06:00 AM - 10:00 PM',
    weekendTimings: branch?.timings?.weekend || '08:00 AM - 08:00 PM',
    facilities: Array.isArray(branch?.facilities) ? branch.facilities : []
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

  // Document requirement inspection: only 2 core docs required (BusinessRegistration and CNIC)
  const hasBusinessReg = documents.some(d => 
    d.documentType === 'BusinessRegistration' || 
    d.documentType === 'BUSINESS_REGISTRATION' ||
    (d.documentLabel && d.documentLabel.toLowerCase().includes('business'))
  );
  const hasCnic = documents.some(d => 
    d.documentType === 'CNIC' || 
    d.documentType === 'OWNER_CNIC_FRONT' ||
    (d.documentLabel && (d.documentLabel.toLowerCase().includes('cnic') || d.documentLabel.toLowerCase().includes('owner')))
  );
  const requiredCount = (hasBusinessReg ? 1 : 0) + (hasCnic ? 1 : 0);
  const isRequirementsMet = hasBusinessReg && hasCnic;
  const isLocked = ['Approved', 'Pending Review', 'Under Review', 'More Information Required'].includes(branch?.approvalStatus);

  // Geolocation detection handler
  const handleDetectCurrentLocation = () => {
    if (!navigator.geolocation) {
      toast.error('Geolocation is not supported by your browser.');
      return;
    }
    setDetectingLocation(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setDetectingLocation(false);
        const lat = parseFloat(pos.coords.latitude.toFixed(6));
        const lng = parseFloat(pos.coords.longitude.toFixed(6));
        setProfile(prev => ({
          ...prev,
          lat,
          lng,
          googleMapsUrl: prev.googleMapsUrl || `https://www.google.com/maps?q=${lat},${lng}`
        }));
        toast.success(`GPS detected: ${lat}, ${lng}`);
      },
      (err) => {
        setDetectingLocation(false);
        console.warn('Geolocation error:', err);
        if (err.code === 1) {
          toast.warning('Location permission was denied. Try "Locate from Address" or paste your Google Maps link.');
        } else {
          toast.error('Unable to fetch device GPS. Please use "Locate from Address" or paste Google Maps link.');
        }
      },
      { enableHighAccuracy: true, timeout: 9000, maximumAge: 0 }
    );
  };

  // Find Pin automatically from Street Address + City
  const handleLocateFromAddress = async () => {
    if (!profile.address && !profile.city) {
      toast.warning('Please enter Street Address and City first.');
      return;
    }
    setResolvingLocation(true);
    try {
      const res = await fetch('/api/gym-verification/resolve-location', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          address: profile.address,
          city: profile.city,
          country: profile.country
        })
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || 'Could not find coordinates for this address.');
      }
      setProfile(prev => ({
        ...prev,
        lat: data.lat,
        lng: data.lng,
        googleMapsUrl: prev.googleMapsUrl || data.googleMapsUrl
      }));
      toast.success(`Address pinned on map: ${data.lat}, ${data.lng}`);
    } catch (err) {
      toast.error(err.message || 'Could not locate address. Try searching your neighborhood or pasting Google Maps link.');
    } finally {
      setResolvingLocation(false);
    }
  };

  // Resolve Google Maps URL (follows shortened links like maps.app.goo.gl)
  const handleResolveUrl = async (urlToResolve) => {
    const inputUrl = (urlToResolve || profile.googleMapsUrl || '').trim();
    if (!inputUrl) {
      toast.warning('Please enter or paste a Google Maps link first.');
      return;
    }

    // Try client-side regex first
    const parsed = parseLocationInput(inputUrl);
    if (parsed) {
      setProfile(prev => ({
        ...prev,
        googleMapsUrl: inputUrl,
        lat: parsed.lat,
        lng: parsed.lng
      }));
      toast.success(`Coordinates found: ${parsed.lat}, ${parsed.lng}`);
      return;
    }

    // Follow redirect via backend
    setResolvingLocation(true);
    try {
      const res = await fetch('/api/gym-verification/resolve-location', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ url: inputUrl })
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.message || 'Could not resolve Google Maps URL');
      setProfile(prev => ({
        ...prev,
        googleMapsUrl: data.googleMapsUrl || inputUrl,
        lat: data.lat,
        lng: data.lng
      }));
      toast.success(`Pin resolved from Maps link: ${data.lat}, ${data.lng}`);
    } catch (err) {
      toast.error(err.message || 'Failed to resolve location link');
    } finally {
      setResolvingLocation(false);
    }
  };

  // Search landmark / neighborhood
  const handleSearchLocation = async () => {
    if (!locationSearchQuery.trim()) return;
    setResolvingLocation(true);
    try {
      const res = await fetch('/api/gym-verification/resolve-location', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          query: locationSearchQuery.trim(),
          city: profile.city,
          country: profile.country
        })
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.message || 'Area not found.');
      setProfile(prev => ({
        ...prev,
        lat: data.lat,
        lng: data.lng,
        googleMapsUrl: data.googleMapsUrl
      }));
      toast.success(`Found area: ${data.lat}, ${data.lng}`);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setResolvingLocation(false);
    }
  };

  // Unified Gym Location input change
  const handleLocationInputChange = (value) => {
    const parsed = parseLocationInput(value);
    if (parsed) {
      setProfile(prev => ({
        ...prev,
        address: prev.address && !prev.address.startsWith('http') ? prev.address : value,
        googleMapsUrl: value,
        lat: parsed.lat,
        lng: parsed.lng
      }));
      toast.success(`Coordinates found: ${parsed.lat}, ${parsed.lng}`);
    } else {
      setProfile(prev => ({
        ...prev,
        address: value
      }));
    }
  };

  // Dynamic Facilities Handlers
  const handleAddFacility = (itemToAdd) => {
    const name = (itemToAdd || customFacility).trim();
    if (!name) return;
    if (profile.facilities.some(f => f.toLowerCase() === name.toLowerCase())) {
      toast.info(`"${name}" is already in your amenities list.`);
      setCustomFacility('');
      return;
    }
    setProfile(prev => ({
      ...prev,
      facilities: [...prev.facilities, name]
    }));
    setCustomFacility('');
  };

  const handleRemoveFacility = (nameToRemove) => {
    setProfile(prev => ({
      ...prev,
      facilities: prev.facilities.filter(f => f !== nameToRemove)
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
      toast.success('Branch details saved.');
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

      toast.success('Document uploaded successfully!');
      if (data.application && Array.isArray(data.application.documents)) {
        setDocuments(data.application.documents);
        setAppData(data.application);
      }
      setDocFile(null);
      setDocNumber('');
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (err) {
      toast.error(err.message);
    } finally {
      setUploadingDoc(false);
    }
  };

  const handleDeleteDoc = async (docId) => {
    if (!window.confirm('Are you sure you want to remove this verification document?')) {
      return;
    }
    setDeletingDocId(docId);
    try {
      const res = await fetch(`/api/gym-verification/branch/${branchId}/document/${docId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to remove document');

      toast.success('Document removed successfully');
      if (data.application && Array.isArray(data.application.documents)) {
        setDocuments(data.application.documents);
        setAppData(data.application);
      } else {
        setDocuments(prev => prev.filter(d => String(d._id) !== String(docId) && String(d.document?._id || d.document) !== String(docId)));
      }
    } catch (err) {
      toast.error(err.message);
    } finally {
      setDeletingDocId(null);
    }
  };

  const handleSubmitApplication = async () => {
    if (!consentCheck || !truthDeclaration) {
      toast.error('Please accept all verification acknowledgments and declarations.');
      return;
    }
    if (!branchId) {
      toast.error('Branch identifier missing. Please save draft first.');
      return;
    }
    if (!isRequirementsMet) {
      toast.error('Please upload both Business Registration and Owner CNIC before submitting.');
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
      if (!res.ok) {
        throw new Error(data.message || (data.missingRequirements ? data.missingRequirements.join(', ') : 'Submission failed'));
      }

      toast.success(data.message || 'Branch submitted for review successfully!');
      if (onBranchUpdated) onBranchUpdated();
      onClose();
    } catch (err) {
      toast.error(err.message || 'Failed to submit application');
    } finally {
      setSubmitting(false);
    }
  };

  const handlePreviewDoc = async (docId) => {
    try {
      const res = await fetch(`/api/gym-verification/document/${docId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Failed to retrieve document');
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      window.open(url, '_blank');
    } catch (err) {
      toast.error(err.message);
    }
  };

  const handleDeleteThisBranch = async () => {
    if (!branchId) return;
    if (!window.confirm(`Are you sure you want to permanently delete this branch "${profile.branchName || 'Gym Branch'}" and all attached verification records?`)) {
      return;
    }
    try {
      const res = await fetch(`/api/gym-verification/branch/${branchId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to delete branch');
      toast.success('Branch deleted successfully');
      if (onBranchUpdated) onBranchUpdated();
      onClose();
    } catch (err) {
      toast.error(err.message || 'Failed to delete branch');
    }
  };

  return (
    <div className="branch-modal-overlay">
      <div className="branch-modal-container">
        {/* Modal Header */}
        <div className="branch-modal-header">
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{ padding: '8px', background: 'rgba(59, 130, 246, 0.15)', borderRadius: '10px' }}>
                <Building size={22} color="var(--primary-accent, #3b82f6)" />
              </div>
              <h2 className="branch-modal-title">
                {branchId ? `Branch Verification: ${profile.branchName || 'Gym Branch'}` : 'New Branch Verification Application'}
              </h2>
            </div>
            <p className="branch-modal-subtitle">
              Official Gym Branch Verification Application
            </p>
          </div>
          <button 
            type="button" 
            onClick={onClose}
            className="branch-modal-close-btn"
            title="Close modal"
          >
            <X size={22} />
          </button>
        </div>

        {/* Step Progress Stepper */}
        <div className="branch-modal-stepper">
          {[
            { num: 1, label: 'Gym Profile', icon: Building },
            { num: 2, label: 'Owner Details', icon: UserCheck },
            { num: 3, label: 'Documents', icon: FileText },
            { num: 4, label: 'Review & Submit', icon: CheckCircle }
          ].map(s => {
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
                className={`stepper-btn ${isActive ? 'active' : ''} ${isCompleted ? 'completed' : ''}`}
                style={{ cursor: (branchId || s.num === 1) ? 'pointer' : 'not-allowed' }}
              >
                <div className="stepper-badge">
                  {isCompleted ? <Check size={14} /> : s.num}
                </div>
                <span>{s.label}</span>
              </button>
            );
          })}
        </div>

        {/* Modal Body */}
        <div className="branch-modal-body">
          {/* STEP 1: GYM PROFILE */}
          {step === 1 && (
            <div>
              <h3 className="branch-step-heading">Step 1: Gym &amp; Branch Information</h3>
              <p className="branch-step-desc">
                Specify physical premises address, pin location via Google Maps, amenities, and branch contact channels.
              </p>

              {isLocked && (
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '14px 16px',
                  background: 'rgba(59, 130, 246, 0.08)',
                  border: '1px solid rgba(59, 130, 246, 0.25)',
                  borderRadius: '10px',
                  marginBottom: '20px'
                }}>
                  <Lock size={20} color="#3b82f6" style={{ flexShrink: 0 }} />
                  <div>
                    <div style={{ fontWeight: '600', color: 'var(--text-primary)', fontSize: '0.9rem' }}>
                      Branch Identity &amp; Location Locked ({branch.approvalStatus})
                    </div>
                    <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                      Gym Name and Location coordinates are verified/under review and cannot be altered to prevent fraudulent changes.
                    </div>
                  </div>
                </div>
              )}

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div className="branch-form-group">
                  <label className="branch-form-label">Branch / Gym Name *</label>
                  <input
                    type="text"
                    required
                    disabled={isLocked}
                    placeholder="e.g. Power Fitness DHA Phase 5"
                    value={profile.branchName}
                    onChange={e => setProfile({ ...profile, branchName: e.target.value })}
                    className="branch-input"
                    style={isLocked ? { opacity: 0.7, cursor: 'not-allowed', background: 'rgba(255,255,255,0.02)' } : {}}
                    title={isLocked ? 'Locked under verification' : ''}
                  />
                </div>
                <div className="branch-form-group">
                  <label className="branch-form-label">Gym Classification *</label>
                  <select
                    value={profile.gymType}
                    disabled={isLocked}
                    onChange={e => setProfile({ ...profile, gymType: e.target.value })}
                    className="branch-select"
                    style={isLocked ? { opacity: 0.7, cursor: 'not-allowed', background: 'rgba(255,255,255,0.02)' } : {}}
                  >
                    {GYM_TYPES.map(gt => <option key={gt} value={gt}>{gt}</option>)}
                  </select>
                </div>
              </div>

              {/* Unified Gym Location */}
              <div className="location-smart-box">
                <div className="location-box-header">
                  <div className="location-title">
                    <MapPin size={18} color="var(--primary-accent, #3b82f6)" />
                    <span>Gym Location &amp; Address *</span>
                  </div>
                  {!isLocked && (
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                      <button
                        type="button"
                        onClick={handleDetectCurrentLocation}
                        disabled={detectingLocation}
                        className="location-detect-btn"
                        title="Detect device GPS coordinates"
                      >
                        <Compass size={15} className={detectingLocation ? 'animate-spin' : ''} />
                        {detectingLocation ? 'Detecting GPS...' : '📍 Device GPS'}
                      </button>
                      <button
                        type="button"
                        onClick={handleLocateFromAddress}
                        disabled={resolvingLocation || !profile.address}
                        className="location-detect-btn"
                        title="Pin this address on the map"
                      >
                        <Navigation size={15} className={resolvingLocation ? 'animate-spin' : ''} />
                        {resolvingLocation ? 'Pinning...' : '📍 Pin on Map'}
                      </button>
                    </div>
                  )}
                </div>

                <div className="branch-form-group" style={{ marginBottom: '12px' }}>
                  <input
                    type="text"
                    required
                    disabled={isLocked}
                    placeholder="Enter street address, area (e.g. Block H4 Fowler Lines, Lucky Star) or paste Google Maps URL"
                    value={profile.address}
                    onChange={e => handleLocationInputChange(e.target.value)}
                    className="branch-input"
                    style={isLocked ? { opacity: 0.7, cursor: 'not-allowed', background: 'rgba(255,255,255,0.02)' } : {}}
                  />
                  <p style={{ margin: '4px 0 0', fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                    Provide your gym's official address or Google Maps link. This single location will be used across your facility profile, explore page, and member gigs.
                  </p>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '12px' }}>
                  <div className="branch-form-group">
                    <label className="branch-form-label">City *</label>
                    <input
                      type="text"
                      required
                      disabled={isLocked}
                      placeholder="e.g. Karachi, Lahore, Islamabad"
                      value={profile.city}
                      onChange={e => setProfile({ ...profile, city: e.target.value })}
                      className="branch-input"
                      style={isLocked ? { opacity: 0.7, cursor: 'not-allowed', background: 'rgba(255,255,255,0.02)' } : {}}
                    />
                  </div>
                  <div className="branch-form-group">
                    <label className="branch-form-label">Country *</label>
                    <input
                      type="text"
                      required
                      disabled={isLocked}
                      placeholder="e.g. Pakistan"
                      value={profile.country}
                      onChange={e => setProfile({ ...profile, country: e.target.value })}
                      className="branch-input"
                      style={isLocked ? { opacity: 0.7, cursor: 'not-allowed', background: 'rgba(255,255,255,0.02)' } : {}}
                    />
                  </div>
                </div>

                {/* Live Interactive Map Pin Preview */}
                {profile.lat && profile.lng && (
                  <div style={{ borderRadius: '12px', overflow: 'hidden', border: '1px solid var(--card-border)', marginTop: '8px' }}>
                    <iframe
                      title="Gym Location Preview Map"
                      width="100%"
                      height="200"
                      style={{ border: 0, width: '100%', display: 'block' }}
                      scrolling="no"
                      src={`https://www.openstreetmap.org/export/embed.html?bbox=${Number(profile.lng)-0.007}%2C${Number(profile.lat)-0.005}%2C${Number(profile.lng)+0.007}%2C${Number(profile.lat)+0.005}&layer=mapnik&marker=${profile.lat}%2C${profile.lng}`}
                    />
                    <div style={{
                      padding: '10px 14px',
                      background: 'var(--card-bg-light)',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      flexWrap: 'wrap',
                      gap: '8px',
                      fontSize: '0.82rem'
                    }}>
                      <span style={{ color: 'var(--text-secondary)' }}>
                        📍 Verified Pin: <strong style={{ color: 'var(--text-primary)' }}>{profile.lat}, {profile.lng}</strong>
                      </span>
                      <a
                        href={profile.googleMapsUrl || `https://www.google.com/maps?q=${profile.lat},${profile.lng}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ color: 'var(--primary-accent)', display: 'inline-flex', alignItems: 'center', gap: '4px', textDecoration: 'underline', fontWeight: 600 }}
                      >
                        Open in Google Maps <ExternalLink size={13} />
                      </a>
                    </div>
                  </div>
                )}
              </div>

              {/* Contact Channels */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div className="branch-form-group">
                  <label className="branch-form-label">Branch Contact Phone</label>
                  <input
                    type="tel"
                    placeholder="+92 300 1234567"
                    value={profile.contactPhone}
                    onChange={e => setProfile({ ...profile, contactPhone: e.target.value })}
                    className="branch-input"
                  />
                </div>
                <div className="branch-form-group">
                  <label className="branch-form-label">Branch Public Email</label>
                  <input
                    type="email"
                    placeholder="branch@powerfitness.com"
                    value={profile.contactEmail}
                    onChange={e => setProfile({ ...profile, contactEmail: e.target.value })}
                    className="branch-input"
                  />
                </div>
              </div>

              {/* Operating Hours */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div className="branch-form-group">
                  <label className="branch-form-label">Weekday Timings</label>
                  <input
                    type="text"
                    placeholder="06:00 AM - 10:00 PM"
                    value={profile.weekdayTimings}
                    onChange={e => setProfile({ ...profile, weekdayTimings: e.target.value })}
                    className="branch-input"
                  />
                </div>
                <div className="branch-form-group">
                  <label className="branch-form-label">Weekend Timings</label>
                  <input
                    type="text"
                    placeholder="08:00 AM - 08:00 PM"
                    value={profile.weekendTimings}
                    onChange={e => setProfile({ ...profile, weekendTimings: e.target.value })}
                    className="branch-input"
                  />
                </div>
              </div>

              {/* Facilities & Amenities: Dynamic User Input */}
              <div className="facilities-container">
                <label className="branch-form-label">
                  Key Facilities &amp; Amenities (Add your gym's custom amenities)
                </label>
                <div className="facilities-input-row">
                  <input
                    type="text"
                    placeholder="Type custom amenity (e.g. Steam Room, Olympic Lifting, Ladies Section)..."
                    value={customFacility}
                    onChange={e => setCustomFacility(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddFacility();
                      }
                    }}
                    className="branch-input"
                    style={{ flex: 1 }}
                  />
                  <button
                    type="button"
                    onClick={() => handleAddFacility()}
                    className="facilities-add-btn"
                  >
                    <Plus size={16} /> Add Amenity
                  </button>
                </div>

                {/* Active / Added Facilities List */}
                <div className="facilities-tags-list">
                  {profile.facilities.length === 0 ? (
                    <span className="facility-empty-hint">
                      No amenities added yet. Enter custom facilities above or choose from popular suggestions below.
                    </span>
                  ) : (
                    profile.facilities.map(fac => (
                      <span key={fac} className="facility-chip">
                        {fac}
                        <button
                          type="button"
                          onClick={() => handleRemoveFacility(fac)}
                          className="facility-chip-remove"
                          title="Remove facility"
                        >
                          <X size={14} />
                        </button>
                      </span>
                    ))
                  )}
                </div>

                {/* Quick Suggestion Pills */}
                <div>
                  <div className="facility-suggestions-title">Quick-Add Suggestions (Click to add):</div>
                  <div className="facility-suggestions-grid">
                    {POPULAR_FACILITY_SUGGESTIONS.map(sug => {
                      const alreadyAdded = profile.facilities.some(f => f.toLowerCase() === sug.toLowerCase());
                      return (
                        <button
                          key={sug}
                          type="button"
                          onClick={() => !alreadyAdded && handleAddFacility(sug)}
                          className={`suggestion-pill ${alreadyAdded ? 'added' : ''}`}
                          disabled={alreadyAdded}
                        >
                          {alreadyAdded ? <Check size={12} /> : <Plus size={12} />}
                          {sug}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: APPLICANT DETAILS */}
          {step === 2 && (
            <div>
              <h3 className="branch-step-heading">Step 2: Authorized Applicant &amp; Owner Profile</h3>
              <p className="branch-step-desc">
                Capture authoritative legal representative details for compliance and audit trail records.
              </p>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div className="branch-form-group">
                  <label className="branch-form-label">Legal Owner / Representative Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="Full Legal Name"
                    value={applicant.legalOwnerName}
                    onChange={e => setApplicant({ ...applicant, legalOwnerName: e.target.value })}
                    className="branch-input"
                  />
                </div>
                <div className="branch-form-group">
                  <label className="branch-form-label">CNIC / Passport Number *</label>
                  <input
                    type="text"
                    required
                    placeholder="42101-1234567-1 or Passport No."
                    value={applicant.cnicOrPassport}
                    onChange={e => setApplicant({ ...applicant, cnicOrPassport: e.target.value })}
                    className="branch-input"
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px', marginBottom: '20px' }}>
                <div className="branch-form-group">
                  <label className="branch-form-label">Authorized Role *</label>
                  <select
                    value={applicant.applicantRole}
                    onChange={e => setApplicant({ ...applicant, applicantRole: e.target.value })}
                    className="branch-select"
                  >
                    <option value="Owner">Primary Owner</option>
                    <option value="Managing Partner">Managing Partner</option>
                    <option value="Authorized Director">Authorized Director</option>
                    <option value="General Manager">General Manager</option>
                  </select>
                </div>
                <div className="branch-form-group">
                  <label className="branch-form-label">Direct Phone *</label>
                  <input
                    type="tel"
                    required
                    placeholder="+92 300 0000000"
                    value={applicant.phone}
                    onChange={e => setApplicant({ ...applicant, phone: e.target.value })}
                    className="branch-input"
                  />
                </div>
                <div className="branch-form-group">
                  <label className="branch-form-label">Official Email *</label>
                  <input
                    type="email"
                    required
                    placeholder="owner@domain.com"
                    value={applicant.email}
                    onChange={e => setApplicant({ ...applicant, email: e.target.value })}
                    className="branch-input"
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
                <ShieldCheck size={28} color="var(--primary-accent, #3b82f6)" style={{ flexShrink: 0 }} />
                <div style={{ fontSize: '0.85rem', color: 'var(--text-primary)' }}>
                  <strong>Privileged Multi-Branch Verification:</strong> Once your organization and primary applicant credentials are verified, subsequent branches will benefit from streamlined owner validation.
                </div>
              </div>
            </div>
          )}

          {/* STEP 3: DOCUMENTS UPLOAD */}
          {step === 3 && (
            <div>
              <h3 className="branch-step-heading">Step 3: Upload Documents</h3>
              <p className="branch-step-desc">
                Upload your business registration document and owner identification to verify this branch. Only 2 documents are required.
              </p>

              {/* 2 Core Documents Status Cards */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '14px', marginBottom: '20px' }}>
                {/* 1. Business Registration */}
                <div style={{
                  padding: '14px 16px',
                  borderRadius: '12px',
                  border: hasBusinessReg ? '1px solid rgba(16, 185, 129, 0.4)' : '1px solid rgba(239, 68, 68, 0.35)',
                  background: hasBusinessReg ? 'rgba(16, 185, 129, 0.06)' : 'rgba(239, 68, 68, 0.05)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '12px'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    {hasBusinessReg ? <CheckCircle size={22} color="#10b981" /> : <AlertCircle size={22} color="#ef4444" />}
                    <div>
                      <div style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                        1. Business Registration / NTN
                      </div>
                      <div style={{ fontSize: '0.78rem', color: hasBusinessReg ? '#10b981' : '#ef4444' }}>
                        {hasBusinessReg ? 'Attached & Ready' : 'Required — Please upload below'}
                      </div>
                    </div>
                  </div>
                  {!hasBusinessReg ? (
                    <button
                      type="button"
                      onClick={() => setSelectedDocType('BUSINESS_REGISTRATION')}
                      className="btn btn-outline btn-sm"
                      style={{ fontSize: '0.75rem', padding: '5px 10px' }}
                    >
                      Select Category
                    </button>
                  ) : (
                    <span style={{ fontSize: '0.75rem', color: '#10b981', fontWeight: 600 }}>Ready ✓</span>
                  )}
                </div>

                {/* 2. Owner CNIC / Passport */}
                <div style={{
                  padding: '14px 16px',
                  borderRadius: '12px',
                  border: hasCnic ? '1px solid rgba(16, 185, 129, 0.4)' : '1px solid rgba(239, 68, 68, 0.35)',
                  background: hasCnic ? 'rgba(16, 185, 129, 0.06)' : 'rgba(239, 68, 68, 0.05)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '12px'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    {hasCnic ? <CheckCircle size={22} color="#10b981" /> : <AlertCircle size={22} color="#ef4444" />}
                    <div>
                      <div style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                        2. Owner CNIC / Passport
                      </div>
                      <div style={{ fontSize: '0.78rem', color: hasCnic ? '#10b981' : '#ef4444' }}>
                        {hasCnic ? 'Attached & Ready' : 'Required — Please upload below'}
                      </div>
                    </div>
                  </div>
                  {!hasCnic ? (
                    <button
                      type="button"
                      onClick={() => setSelectedDocType('OWNER_CNIC_FRONT')}
                      className="btn btn-outline btn-sm"
                      style={{ fontSize: '0.75rem', padding: '5px 10px' }}
                    >
                      Select Category
                    </button>
                  ) : (
                    <span style={{ fontSize: '0.75rem', color: '#10b981', fontWeight: 600 }}>Ready ✓</span>
                  )}
                </div>
              </div>

              {/* Upload Form */}
              <form onSubmit={handleUploadDocument} className="upload-form-box">
                <h4 style={{ margin: '0 0 14px 0', fontSize: '0.95rem', color: 'var(--primary-accent, #3b82f6)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Upload size={18} /> Upload Verification Document
                </h4>

                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '14px', marginBottom: '14px' }}>
                  <div className="branch-form-group" style={{ margin: 0 }}>
                    <label className="branch-form-label">Document Category *</label>
                    <select
                      value={selectedDocType}
                      onChange={e => setSelectedDocType(e.target.value)}
                      className="branch-select"
                    >
                      {REQUIRED_DOC_TYPES.map(rd => (
                        <option key={rd.key} value={rd.key}>{rd.label}</option>
                      ))}
                    </select>
                  </div>
                  <div className="branch-form-group" style={{ margin: 0 }}>
                    <label className="branch-form-label">Document / Ref Number</label>
                    <input
                      type="text"
                      placeholder="e.g. NTN-982181 / CNIC #"
                      value={docNumber}
                      onChange={e => setDocNumber(e.target.value)}
                      className="branch-input"
                    />
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap' }}>
                  <input
                    ref={fileInputRef}
                    type="file"
                    required
                    accept=".pdf,.png,.jpg,.jpeg"
                    onChange={e => setDocFile(e.target.files[0] || null)}
                    style={{ flex: 1, color: 'var(--text-secondary)', fontSize: '0.85rem' }}
                  />
                  <button
                    type="submit"
                    disabled={uploadingDoc || !docFile}
                    className="btn btn-primary"
                    style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                  >
                    <Upload size={15} /> {uploadingDoc ? 'Uploading...' : 'Upload Document'}
                  </button>
                </div>
              </form>

              {/* Uploaded Documents List */}
              <div>
                <h4 style={{ fontSize: '0.95rem', color: 'var(--text-primary)', marginBottom: '12px' }}>
                  Uploaded Documents ({documents.length})
                </h4>
                {documents.length === 0 ? (
                  <div style={{ padding: '24px', textAlign: 'center', background: 'var(--card-bg-light)', borderRadius: '10px' }}>
                    <p style={{ color: 'var(--text-secondary)', margin: 0, fontSize: '0.85rem' }}>
                      No documents uploaded yet. Please upload Business Registration and Owner CNIC above.
                    </p>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {documents.map((d, idx) => {
                      const docId = d.document?._id || d._id || d.document;
                      const fileName = d.document?.originalFilename || d.originalFilename || d.originalFileName || 'Uploaded File';
                      const label = d.documentLabel || (d.documentType === 'BusinessRegistration' ? '1. Business Registration / NTN' : d.documentType === 'CNIC' ? '2. Owner CNIC / Passport' : d.documentType);
                      const isDeleting = deletingDocId === docId || deletingDocId === d._id;

                      return (
                        <div key={d._id || idx} className="uploaded-doc-row">
                          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <CheckCircle size={18} color="#10b981" />
                            <div>
                              <div style={{ fontSize: '0.9rem', color: 'var(--text-primary)', fontWeight: 600 }}>
                                {label}
                              </div>
                              <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                                File: {fileName}{d.documentNumber ? ` • Ref: ${d.documentNumber}` : ''}
                              </div>
                            </div>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <button
                              type="button"
                              onClick={() => handlePreviewDoc(docId)}
                              className="btn btn-outline btn-sm"
                              style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '0.78rem' }}
                            >
                              <Eye size={14} /> View Document
                            </button>
                            <button
                              type="button"
                              disabled={isDeleting}
                              onClick={() => handleDeleteDoc(docId)}
                              className="btn btn-outline btn-sm"
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '6px',
                                fontSize: '0.78rem',
                                color: '#ef4444',
                                borderColor: 'rgba(239, 68, 68, 0.35)',
                                background: 'rgba(239, 68, 68, 0.06)'
                              }}
                              title="Delete this uploaded document"
                            >
                              <Trash2 size={14} /> {isDeleting ? 'Removing...' : 'Remove'}
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* STEP 4: REVIEW & SUBMIT */}
          {step === 4 && (
            <div>
              <h3 className="branch-step-heading">Step 4: Final Review &amp; Submit</h3>
              <p className="branch-step-desc">
                Review application details, verify required document attachments, and submit for verification review.
              </p>

              {/* Summary Cards */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '20px' }}>
                <div className="review-summary-card">
                  <h4>Gym Profile Summary</h4>
                  <div className="review-card-content">
                    <div><strong>Branch:</strong> {profile.branchName || '-'}</div>
                    <div><strong>Type:</strong> {profile.gymType}</div>
                    <div><strong>Address:</strong> {profile.address}, {profile.city}, {profile.country}</div>
                    <div><strong>Coordinates:</strong> {profile.lat && profile.lng ? `${profile.lat}, ${profile.lng}` : 'Pending pin'}</div>
                    <div><strong>Phone:</strong> {profile.contactPhone || '-'}</div>
                    <div><strong>Amenities ({profile.facilities.length}):</strong> {profile.facilities.join(', ') || 'None specified'}</div>
                  </div>
                </div>

                <div className="review-summary-card">
                  <h4>Applicant &amp; Document Summary</h4>
                  <div className="review-card-content">
                    <div><strong>Representative:</strong> {applicant.legalOwnerName || '-'}</div>
                    <div><strong>CNIC / Passport:</strong> {applicant.cnicOrPassport || '-'}</div>
                    <div><strong>Role:</strong> {applicant.applicantRole}</div>
                    <div><strong>Direct Phone:</strong> {applicant.phone || '-'}</div>
                    <div><strong>Attached Documents:</strong> {documents.length} file(s)</div>
                  </div>
                </div>
              </div>

              {/* Mandatory Checklist Inspection: 2 Core Documents */}
              <div style={{
                background: isRequirementsMet ? 'rgba(16, 185, 129, 0.08)' : 'rgba(239, 68, 68, 0.08)',
                border: isRequirementsMet ? '1px solid rgba(16, 185, 129, 0.3)' : '1px solid rgba(239, 68, 68, 0.3)',
                padding: '16px',
                borderRadius: '12px',
                marginBottom: '20px'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                  {isRequirementsMet ? <CheckCircle size={18} color="#10b981" /> : <AlertCircle size={18} color="#ef4444" />}
                  <span style={{ fontSize: '0.9rem', fontWeight: 600, color: isRequirementsMet ? '#10b981' : '#ef4444' }}>
                    Document Requirement Check: {requiredCount} / 2 Required Uploaded
                  </span>
                </div>
                <p style={{ margin: 0, fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                  {isRequirementsMet 
                    ? 'Both mandatory documents (Business Registration and Owner CNIC) are attached. You can now submit your branch for review.'
                    : `Missing: ${[!hasBusinessReg && 'Business Registration', !hasCnic && 'Owner CNIC'].filter(Boolean).join(' and ')}. Please upload in Step 3.`}
                </p>
              </div>

              {/* Declarations & Consent */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '24px' }}>
                <label style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', cursor: 'pointer', fontSize: '0.85rem', color: 'var(--text-primary)' }}>
                  <input
                    type="checkbox"
                    checked={truthDeclaration}
                    onChange={e => setTruthDeclaration(e.target.checked)}
                    style={{ marginTop: '3px' }}
                  />
                  <span>I declare under penalty of perjury that all submitted physical address data, coordinates, and ownership records are accurate, truthful, and representative of active gym operations.</span>
                </label>

                <label style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', cursor: 'pointer', fontSize: '0.85rem', color: 'var(--text-primary)' }}>
                  <input
                    type="checkbox"
                    checked={consentCheck}
                    onChange={e => setConsentCheck(e.target.checked)}
                    style={{ marginTop: '3px' }}
                  />
                  <span>I authorize GymSync verification officers to inspect attached documentation and verify this branch before publishing publicly.</span>
                </label>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="branch-modal-footer">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
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
            {branchId && (
              <button
                type="button"
                onClick={handleDeleteThisBranch}
                className="btn btn-outline"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  color: '#ef4444',
                  borderColor: 'rgba(239, 68, 68, 0.35)',
                  background: 'rgba(239, 68, 68, 0.05)'
                }}
                title="Delete this gym branch"
              >
                <Trash2 size={16} /> Delete Branch
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
                disabled={submitting || !consentCheck || !truthDeclaration || !isRequirementsMet}
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
