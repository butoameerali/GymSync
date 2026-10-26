import React, { useState, useEffect, useRef } from 'react';
import { 
  Building, 
  MapPin, 
  UserCheck, 
  CheckCircle, 
  Upload, 
  AlertCircle, 
  Eye, 
  X, 
  ShieldCheck,
  Check,
  ExternalLink, 
  FileText, 
  Trash2, 
  Lock,
  Compass,
  Phone,
  Mail,
  FileCheck
} from 'lucide-react';
import { toast } from 'react-toastify';
import './BranchVerificationModal.css';

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

const PAKISTANI_CITIES = [
  'Karachi',
  'Lahore',
  'Islamabad',
  'Rawalpindi',
  'Faisalabad',
  'Peshawar',
  'Multan',
  'Quetta',
  'Sialkot',
  'Gujranwala',
  'Hyderabad',
  'Abbottabad',
  'Bahawalpur',
  'Sargodha',
  'Sukkur'
];

/**
 * Extract Google Maps URL from pasted text
 */
function extractGoogleMapsUrl(input) {
  if (!input || typeof input !== 'string') return null;
  const match = input.match(/(https?:\/\/[^\s]+)/i);
  if (match) {
    const u = match[1];
    if (u.includes('goo.gl') || u.includes('google.com/maps') || u.includes('maps.app')) {
      return u;
    }
  }
  const bareMatch = input.match(/(maps\.app\.goo\.gl\/[^\s]+|goo\.gl\/maps\/[^\s]+|google\.com\/maps\/[^\s]+)/i);
  if (bareMatch) {
    return 'https://' + bareMatch[1];
  }
  return null;
}

function parseLocationInput(input) {
  if (!input || typeof input !== 'string') return null;
  const str = input.trim();

  // Pattern 1: Raw numbers with decimals "24.8607, 67.0011"
  const rawDecimalMatch = str.match(/(-?\d{1,2}\.\d+)[,\s]+(-?\d{1,3}\.\d+)/);
  if (rawDecimalMatch) {
    const lat = parseFloat(rawDecimalMatch[1]);
    const lng = parseFloat(rawDecimalMatch[2]);
    if (lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
      return { lat, lng };
    }
  }

  // Pattern 2: Google Maps /@lat,lng
  const atMatch = str.match(/@(-?\d{1,2}\.\d+),(-?\d{1,3}\.\d+)/);
  if (atMatch) {
    const lat = parseFloat(atMatch[1]);
    const lng = parseFloat(atMatch[2]);
    if (lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
      return { lat, lng };
    }
  }

  // Pattern 3: Google Maps ?q=lat,lng or query=lat,lng
  const queryMatch = str.match(/[?&](?:q|query|ll)=(-?\d{1,2}\.\d+)[,%20]+(-?\d{1,3}\.\d+)/i);
  if (queryMatch) {
    const lat = parseFloat(queryMatch[1]);
    const lng = parseFloat(queryMatch[2]);
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
  const [branchId, setBranchId] = useState(branch?._id || null);
  const [savingDraft, setSavingDraft] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Document Upload States
  const [uploadingSlot, setUploadingSlot] = useState(null); // 'BUSINESS_REGISTRATION' | 'OWNER_CNIC_FRONT' | null
  const [busRegRef, setBusRegRef] = useState('');
  const [busRegFile, setBusRegFile] = useState(null);
  const [cnicRef, setCnicRef] = useState('');
  const [cnicFile, setCnicFile] = useState(null);
  const busRegInputRef = useRef(null);
  const cnicInputRef = useRef(null);
  const [documents, setDocuments] = useState([]);
  const [deletingDocId, setDeletingDocId] = useState(null);

  // Location helpers
  const [detectingLocation, setDetectingLocation] = useState(false);
  const [resolvingLocation, setResolvingLocation] = useState(false);
  const [mapsInputText, setMapsInputText] = useState('');

  // Section 1: Facility Identity & Physical Location
  const [profile, setProfile] = useState({
    branchName: branch?.branchName || branch?.name || '',
    gymType: branch?.gymType || 'Unisex Fitness Center',
    address: branch?.address || branch?.location || '',
    city: branch?.city || 'Karachi',
    country: branch?.country || 'Pakistan',
    lat: branch?.coordinates?.lat || '',
    lng: branch?.coordinates?.lng || '',
    googleMapsUrl: branch?.googleMapsUrl || '',
    contactPhone: branch?.contactPhone || branch?.phone || '',
    contactEmail: branch?.contactEmail || ''
  });

  // Section 2: Authorized Applicant & Legal Owner Details
  const [applicant, setApplicant] = useState({
    legalOwnerName: '',
    cnicOrPassport: '',
    applicantRole: 'Owner',
    phone: '',
    email: ''
  });

  // Section 3: Statement of Purpose
  const [statementOfPurpose, setStatementOfPurpose] = useState('');

  // Legal Declarations
  const [truthDeclaration, setTruthDeclaration] = useState(false);
  const [consentCheck, setConsentCheck] = useState(false);

  const token = localStorage.getItem('gymsync_token') || '';

  // Load existing application if branch has one
  useEffect(() => {
    if (branch?.verificationApplication && typeof branch.verificationApplication === 'object') {
      const va = branch.verificationApplication;
      if (va.applicantDetails) {
        setApplicant({
          legalOwnerName: va.applicantDetails.legalName || branch.ownerName || '',
          cnicOrPassport: va.applicantDetails.cnicOrPassport || '',
          applicantRole: va.applicantDetails.relationship || 'Owner',
          phone: va.applicantDetails.phone || branch.contactPhone || '',
          email: va.applicantDetails.email || branch.contactEmail || ''
        });
      }
      if (va.statementOfPurpose) {
        setStatementOfPurpose(va.statementOfPurpose);
      }
      if (Array.isArray(va.documents)) {
        setDocuments(va.documents);
      }
    } else {
      const savedName = localStorage.getItem('gymsync_user_name') || '';
      const savedEmail = localStorage.getItem('gymsync_user_email') || '';
      setApplicant(prev => ({
        ...prev,
        legalOwnerName: prev.legalOwnerName || branch?.ownerName || savedName,
        email: prev.email || branch?.contactEmail || savedEmail
      }));
    }
  }, [branch]);

  // Document requirement inspection: 2 core docs required
  const businessRegDoc = documents.find(d => 
    d.documentType === 'BusinessRegistration' || 
    d.documentType === 'BUSINESS_REGISTRATION' ||
    (d.documentLabel && d.documentLabel.toLowerCase().includes('business'))
  );
  const cnicDoc = documents.find(d => 
    d.documentType === 'CNIC' || 
    d.documentType === 'OWNER_CNIC_FRONT' ||
    (d.documentLabel && (d.documentLabel.toLowerCase().includes('cnic') || d.documentLabel.toLowerCase().includes('owner')))
  );
  const hasBusinessReg = Boolean(businessRegDoc);
  const hasCnic = Boolean(cnicDoc);
  const isRequirementsMet = hasBusinessReg && hasCnic;

  // Detect GPS
  const handleDetectCurrentLocation = () => {
    if (!navigator.geolocation) {
      toast.error('Geolocation is not supported by your browser.');
      return;
    }
    setDetectingLocation(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = parseFloat(pos.coords.latitude.toFixed(6));
        const lng = parseFloat(pos.coords.longitude.toFixed(6));
        
        let detectedAddress = '';
        let detectedCity = '';
        try {
          const revRes = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`, {
            headers: { 'User-Agent': 'GymSync-Application' }
          });
          const revData = await revRes.json();
          if (revData && revData.address) {
            detectedCity = revData.address.city || revData.address.town || revData.address.county || '';
            const road = revData.address.road || revData.address.suburb || '';
            detectedAddress = road ? `${road}, ${detectedCity || 'Pakistan'}` : revData.display_name?.split(',').slice(0, 3).join(', ');
          }
        } catch (e) {
          console.warn('Reverse geocode failed:', e);
        }

        setProfile(prev => ({
          ...prev,
          lat,
          lng,
          address: prev.address || detectedAddress || `GPS (${lat}, ${lng})`,
          city: prev.city || detectedCity || 'Karachi',
          googleMapsUrl: `https://www.google.com/maps?q=${lat},${lng}`
        }));
        setMapsInputText(`https://www.google.com/maps?q=${lat},${lng}`);
        setDetectingLocation(false);
        toast.success(`📍 GPS Location fixed: ${lat}, ${lng}`);
      },
      (err) => {
        setDetectingLocation(false);
        if (err.code === 1) {
          toast.warning('Location permission was denied. Please paste your Google Maps link.');
        } else {
          toast.error('Unable to fetch device GPS. Please paste your Google Maps link.');
        }
      },
      { enableHighAccuracy: true, timeout: 9000, maximumAge: 0 }
    );
  };

  // Resolve pasted Google Maps URL or coordinates
  const handleFixMapsInput = async () => {
    const raw = (mapsInputText || profile.googleMapsUrl || '').trim();
    if (!raw) {
      toast.warning('Please paste a Google Maps link or coordinates (lat, lng) first.');
      return;
    }

    // Try client-side parsing first
    const parsed = parseLocationInput(raw);
    if (parsed) {
      setProfile(prev => ({
        ...prev,
        lat: parsed.lat,
        lng: parsed.lng,
        googleMapsUrl: raw.startsWith('http') ? raw : `https://www.google.com/maps?q=${parsed.lat},${parsed.lng}`
      }));
      toast.success(`📍 Location coordinates fixed: ${parsed.lat}, ${parsed.lng}`);
      return;
    }

    // Server-side resolver for shortened links (maps.app.goo.gl)
    setResolvingLocation(true);
    try {
      const res = await fetch('/api/gym-verification/resolve-location', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ url: raw })
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.message || 'Could not resolve Google Maps URL');

      setProfile(prev => ({
        ...prev,
        googleMapsUrl: data.googleMapsUrl || raw,
        lat: data.lat,
        lng: data.lng,
        address: prev.address || (data.resolvedAddress ? data.resolvedAddress.split(',').slice(0, 3).join(', ') : ''),
        city: prev.city || data.city || ''
      }));
      toast.success(`📍 Location resolved from Google Maps link: ${data.lat}, ${data.lng}`);
    } catch (err) {
      toast.error(err.message || 'Failed to resolve link. You can enter lat, lng directly.');
    } finally {
      setResolvingLocation(false);
    }
  };

  // Save Draft Handler
  const handleSaveDraft = async (silent = false) => {
    if (!profile.branchName.trim()) {
      if (!silent) toast.error('Please enter a Brand / Branch Name before saving draft.');
      return null;
    }

    setSavingDraft(true);
    try {
      const payload = {
        branchId,
        branchName: profile.branchName.trim(),
        gymType: profile.gymType,
        address: profile.address.trim(),
        city: profile.city.trim(),
        country: profile.country,
        coordinates: profile.lat && profile.lng ? { lat: Number(profile.lat), lng: Number(profile.lng) } : undefined,
        googleMapsUrl: profile.googleMapsUrl,
        contactPhone: profile.contactPhone,
        contactEmail: profile.contactEmail,
        statementOfPurpose: statementOfPurpose.trim(),
        applicantDetails: {
          legalName: applicant.legalOwnerName.trim() || undefined,
          cnicOrPassport: applicant.cnicOrPassport.trim() || undefined,
          relationship: applicant.applicantRole || 'Owner',
          phone: applicant.phone.trim() || undefined,
          email: applicant.email.trim() || undefined
        }
      };

      const res = await fetch('/api/gym-verification/draft', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to save draft');

      const savedBranchId = data.branch?._id || data.branch?.id;
      if (savedBranchId && !branchId) {
        setBranchId(savedBranchId);
      }
      if (!silent) toast.success('Application draft saved successfully!');
      if (onBranchUpdated) onBranchUpdated();
      return savedBranchId || branchId;
    } catch (err) {
      if (!silent) toast.error(err.message || 'Error saving draft');
      return null;
    } finally {
      setSavingDraft(false);
    }
  };

  // Direct Document Uploader
  const handleUploadDocumentSlot = async (docType, file, referenceNumber) => {
    if (!file) {
      toast.error('Please select a document file first.');
      return;
    }

    // Auto-save draft first to ensure branchId exists
    let targetBranchId = branchId;
    if (!targetBranchId) {
      if (!profile.branchName.trim()) {
        toast.error('Please enter Brand / Branch Name before uploading documents.');
        return;
      }
      targetBranchId = await handleSaveDraft(true);
      if (!targetBranchId) {
        toast.error('Could not initialize application draft for upload.');
        return;
      }
    }

    setUploadingSlot(docType);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('branchId', targetBranchId);
      formData.append('documentType', docType === 'BUSINESS_REGISTRATION' ? 'BusinessRegistration' : 'CNIC');
      formData.append('documentLabel', docType === 'BUSINESS_REGISTRATION' ? 'Business Registration / Commercial License / NTN' : 'Owner CNIC / National ID / Passport');
      if (referenceNumber) {
        formData.append('referenceNumber', referenceNumber.trim());
      }

      const res = await fetch('/api/gym-verification/upload-document', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`
        },
        body: formData
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Document upload failed');

      toast.success(docType === 'BUSINESS_REGISTRATION' ? 'Business Registration document uploaded & encrypted!' : 'Owner CNIC uploaded & encrypted!');
      if (data.application && Array.isArray(data.application.documents)) {
        setDocuments(data.application.documents);
      }
      if (docType === 'BUSINESS_REGISTRATION') {
        setBusRegFile(null);
        if (busRegInputRef.current) busRegInputRef.current.value = '';
      } else {
        setCnicFile(null);
        if (cnicInputRef.current) cnicInputRef.current.value = '';
      }
    } catch (err) {
      toast.error(err.message || 'Upload failed');
    } finally {
      setUploadingSlot(null);
    }
  };

  // Delete Document
  const handleDeleteDoc = async (docId) => {
    if (!window.confirm('Are you sure you want to remove this verification document?')) return;
    setDeletingDocId(docId);
    try {
      const res = await fetch(`/api/gym-verification/branch/${branchId}/document/${docId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to remove document');

      toast.success('Document removed successfully');
      if (data.application && Array.isArray(data.application.documents)) {
        setDocuments(data.application.documents);
      } else {
        setDocuments(prev => prev.filter(d => String(d._id) !== String(docId) && String(d.document?._id || d.document) !== String(docId)));
      }
    } catch (err) {
      toast.error(err.message);
    } finally {
      setDeletingDocId(null);
    }
  };

  // Preview Encrypted Document
  const handlePreviewDoc = async (docId) => {
    if (!docId) return;
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

  // Submit Final Application
  const handleSubmitApplication = async () => {
    if (!profile.branchName.trim()) {
      toast.error('Please enter Brand / Branch Name.');
      return;
    }
    if (!profile.address.trim()) {
      toast.error('Please enter Physical Street Address.');
      return;
    }
    if (!profile.city.trim()) {
      toast.error('Please select or enter City.');
      return;
    }
    if (!applicant.legalOwnerName.trim()) {
      toast.error('Please enter Legal Owner / Applicant Name.');
      return;
    }
    if (!applicant.cnicOrPassport.trim()) {
      toast.error('Please enter CNIC or Passport Number.');
      return;
    }
    if (!statementOfPurpose.trim() || statementOfPurpose.trim().length < 15) {
      toast.error('Please provide a brief Statement of Purpose / Reason for Opening (minimum 15 characters).');
      return;
    }
    if (!hasBusinessReg) {
      toast.error('Please upload Business Registration / NTN / Commercial License document.');
      return;
    }
    if (!hasCnic) {
      toast.error('Please upload Owner CNIC / Passport document.');
      return;
    }
    if (!truthDeclaration || !consentCheck) {
      toast.error('Please accept all verification acknowledgments and legal declarations.');
      return;
    }

    // Auto-save any pending draft edits first
    const savedBranchId = await handleSaveDraft(true);
    const activeBranchId = savedBranchId || branchId;
    if (!activeBranchId) {
      toast.error('Branch identifier missing. Please save draft first.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch(`/api/gym-verification/branch/${activeBranchId}/submit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        }
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || (data.missingRequirements ? data.missingRequirements.join(', ') : 'Submission failed'));
      }

      toast.success(data.message || 'Branch verification application submitted successfully! Status: Under Review.');
      if (onBranchUpdated) onBranchUpdated();
      onClose();
    } catch (err) {
      toast.error(err.message || 'Failed to submit application');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="branch-modal-overlay">
      <div className="branch-modal-container" style={{ maxHeight: '92vh', height: '90vh' }}>
        {/* Header */}
        <div className="branch-modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div className="branch-header-icon-box">
              <ShieldCheck size={22} color="#3b82f6" />
            </div>
            <div>
              <h2 className="branch-modal-title">Gym Verification &amp; Branch Registration</h2>
              <p className="branch-modal-subtitle">
                Official application form to verify your facility authenticity and ownership credentials.
              </p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="branch-modal-close-btn" title="Close">
            <X size={20} />
          </button>
        </div>

        {/* Unified Scrollable Form Body */}
        <div className="branch-modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '26px' }}>

          {/* SECTION 1: Facility Identity & Physical Location */}
          <div style={{
            background: 'var(--card-bg-light, rgba(255, 255, 255, 0.02))',
            borderRadius: '14px',
            border: '1px solid var(--card-border, rgba(255, 255, 255, 0.08))',
            padding: '20px 22px'
          }}>
            <h3 className="branch-step-heading" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Building size={20} color="#3b82f6" />
              1. Facility Identity &amp; Physical Location
            </h3>
            <p className="branch-step-desc">
              Enter official gym brand name, location address, and contact details.
            </p>

            <div className="branch-grid-2col">
              <div className="branch-form-group">
                <label className="branch-form-label">Brand / Branch Name *</label>
                <input
                  type="text"
                  className="branch-input"
                  placeholder="e.g. Iron Gym Gulberg Branch"
                  value={profile.branchName}
                  onChange={e => setProfile({ ...profile, branchName: e.target.value })}
                  required
                />
              </div>

              <div className="branch-form-group">
                <label className="branch-form-label">Gym Facility Type *</label>
                <select
                  className="branch-select"
                  value={profile.gymType}
                  onChange={e => setProfile({ ...profile, gymType: e.target.value })}
                >
                  {GYM_TYPES.map(gt => (
                    <option key={gt} value={gt}>{gt}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="branch-grid-2col">
              <div className="branch-form-group">
                <label className="branch-form-label">Physical Street Address *</label>
                <input
                  type="text"
                  className="branch-input"
                  placeholder="e.g. Plot 45-C, Main Boulevard, Gulberg III"
                  value={profile.address}
                  onChange={e => setProfile({ ...profile, address: e.target.value })}
                  required
                />
              </div>

              <div className="branch-form-group">
                <label className="branch-form-label">City (Pakistan) *</label>
                <select
                  className="branch-select"
                  value={profile.city}
                  onChange={e => setProfile({ ...profile, city: e.target.value })}
                >
                  {PAKISTANI_CITIES.map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Smart Location & Google Maps Resolver Box */}
            <div className="location-smart-box">
              <div className="location-box-header">
                <div className="location-title">
                  <MapPin size={17} color="#10b981" />
                  <span>Google Maps Pin &amp; Coordinates</span>
                </div>
                <button
                  type="button"
                  onClick={handleDetectCurrentLocation}
                  disabled={detectingLocation}
                  className="location-detect-btn"
                  title="Detect GPS from current device"
                >
                  <Compass size={14} />
                  {detectingLocation ? 'Detecting GPS...' : '📍 Detect Current GPS'}
                </button>
              </div>

              <p style={{ margin: '0 0 10px 0', fontSize: '0.82rem', color: 'var(--text-secondary, #94a3b8)' }}>
                Paste your Google Maps link or coordinates (lat, lng) to fix your gym pin on member search:
              </p>

              <div style={{ display: 'flex', gap: '8px' }}>
                <input
                  type="text"
                  className="branch-input"
                  style={{ flex: 1, fontSize: '0.85rem' }}
                  placeholder="Paste Google Maps URL (maps.app.goo.gl/...) or lat, lng (31.5204, 74.3587)"
                  value={mapsInputText || profile.googleMapsUrl}
                  onChange={e => {
                    setMapsInputText(e.target.value);
                    const parsed = parseLocationInput(e.target.value);
                    if (parsed) {
                      setProfile(p => ({ ...p, lat: parsed.lat, lng: parsed.lng, googleMapsUrl: e.target.value }));
                    }
                  }}
                />
                <button
                  type="button"
                  onClick={handleFixMapsInput}
                  disabled={resolvingLocation}
                  className="btn btn-primary"
                  style={{ fontSize: '0.82rem', whiteSpace: 'nowrap', padding: '0 16px' }}
                >
                  {resolvingLocation ? 'Resolving...' : 'Fix Location'}
                </button>
              </div>

              {profile.lat && profile.lng && (
                <div style={{ marginTop: '10px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.82rem', color: '#10b981' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <CheckCircle size={14} /> Location Fixed: <strong>{profile.lat}, {profile.lng}</strong>
                  </span>
                  {profile.googleMapsUrl && (
                    <a
                      href={profile.googleMapsUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ color: '#3b82f6', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                    >
                      <ExternalLink size={12} /> Test Google Maps Link
                    </a>
                  )}
                </div>
              )}
            </div>

            <div className="branch-grid-2col">
              <div className="branch-form-group">
                <label className="branch-form-label">Official Contact Phone</label>
                <div style={{ position: 'relative' }}>
                  <input
                    type="text"
                    className="branch-input"
                    placeholder="e.g. 0300-1234567"
                    value={profile.contactPhone}
                    onChange={e => setProfile({ ...profile, contactPhone: e.target.value })}
                  />
                  <Phone size={15} style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', opacity: 0.4 }} />
                </div>
              </div>

              <div className="branch-form-group">
                <label className="branch-form-label">Official Contact Email</label>
                <div style={{ position: 'relative' }}>
                  <input
                    type="email"
                    className="branch-input"
                    placeholder="e.g. info@irongym.pk"
                    value={profile.contactEmail}
                    onChange={e => setProfile({ ...profile, contactEmail: e.target.value })}
                  />
                  <Mail size={15} style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', opacity: 0.4 }} />
                </div>
              </div>
            </div>
          </div>

          {/* SECTION 2: Authorized Applicant & Legal Owner Details */}
          <div style={{
            background: 'var(--card-bg-light, rgba(255, 255, 255, 0.02))',
            borderRadius: '14px',
            border: '1px solid var(--card-border, rgba(255, 255, 255, 0.08))',
            padding: '20px 22px'
          }}>
            <h3 className="branch-step-heading" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <UserCheck size={20} color="#3b82f6" />
              2. Authorized Applicant &amp; Legal Owner Profile
            </h3>
            <p className="branch-step-desc">
              Legal credentials of the gym owner or authorized representative applying for verification.
            </p>

            <div className="branch-grid-2col">
              <div className="branch-form-group">
                <label className="branch-form-label">Legal Owner / Applicant Name *</label>
                <input
                  type="text"
                  className="branch-input"
                  placeholder="e.g. Muhammad Ali Khan"
                  value={applicant.legalOwnerName}
                  onChange={e => setApplicant({ ...applicant, legalOwnerName: e.target.value })}
                  required
                />
              </div>

              <div className="branch-form-group">
                <label className="branch-form-label">CNIC or Passport Number *</label>
                <input
                  type="text"
                  className="branch-input"
                  placeholder="e.g. 35201-1234567-1"
                  value={applicant.cnicOrPassport}
                  onChange={e => setApplicant({ ...applicant, cnicOrPassport: e.target.value })}
                  required
                />
              </div>
            </div>

            <div className="branch-grid-2col">
              <div className="branch-form-group">
                <label className="branch-form-label">Designation / Role *</label>
                <select
                  className="branch-select"
                  value={applicant.applicantRole}
                  onChange={e => setApplicant({ ...applicant, applicantRole: e.target.value })}
                >
                  <option value="Owner">Owner / Sole Proprietor</option>
                  <option value="Co-owner">Co-owner / Managing Partner</option>
                  <option value="AuthorizedManager">Authorized Managing Director</option>
                </select>
              </div>

              <div className="branch-form-group">
                <label className="branch-form-label">Direct Mobile Number</label>
                <input
                  type="text"
                  className="branch-input"
                  placeholder="e.g. 0321-9876543"
                  value={applicant.phone}
                  onChange={e => setApplicant({ ...applicant, phone: e.target.value })}
                />
              </div>
            </div>
          </div>

          {/* SECTION 3: Statement of Purpose / Reason for Opening */}
          <div style={{
            background: 'var(--card-bg-light, rgba(255, 255, 255, 0.02))',
            borderRadius: '14px',
            border: '1px solid var(--card-border, rgba(255, 255, 255, 0.08))',
            padding: '20px 22px'
          }}>
            <h3 className="branch-step-heading" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <FileText size={20} color="#3b82f6" />
              3. Statement of Purpose &amp; Reason for Opening *
            </h3>
            <p className="branch-step-desc">
              Explain why you are opening/registering this gym facility (e.g. community health club, commercial expansion, dedicated female fitness section, etc.).
            </p>

            <div className="branch-form-group" style={{ marginBottom: 0 }}>
              <textarea
                className="branch-input"
                rows={3}
                style={{ resize: 'vertical', lineHeight: '1.5', fontSize: '0.88rem' }}
                placeholder="Write your application statement here: e.g. We are opening this commercial fitness center in Gulberg to provide neighborhood residents with state-of-the-art strength training, certified guidance, and modern wellness facilities..."
                value={statementOfPurpose}
                onChange={e => setStatementOfPurpose(e.target.value)}
                maxLength={600}
                required
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '6px', fontSize: '0.78rem', color: 'var(--text-secondary, #94a3b8)' }}>
                <span>Minimum 15 characters required for administrative review.</span>
                <span>{statementOfPurpose.length} / 600 characters</span>
              </div>
            </div>
          </div>

          {/* SECTION 4: Required Verification Documents (2 Dedicated Slots) */}
          <div style={{
            background: 'var(--card-bg-light, rgba(255, 255, 255, 0.02))',
            borderRadius: '14px',
            border: '1px solid var(--card-border, rgba(255, 255, 255, 0.08))',
            padding: '20px 22px'
          }}>
            <h3 className="branch-step-heading" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <FileCheck size={20} color="#3b82f6" />
              4. Required Verification Documents (2 Document Slots)
            </h3>
            <p className="branch-step-desc">
              All documents are encrypted with AES-256 before storage and only accessible to authorized compliance reviewers.
            </p>

            <div className="doc-slots-container">
              {/* SLOT 1: Business Registration / NTN */}
              <div className={`doc-slot-card ${hasBusinessReg ? 'uploaded' : 'pending'}`}>
                <div className="doc-slot-header">
                  <div className="doc-slot-title-area">
                    <div className={`doc-slot-icon-badge ${hasBusinessReg ? 'success' : 'primary'}`}>
                      {hasBusinessReg ? <CheckCircle size={22} /> : <Building size={20} />}
                    </div>
                    <div>
                      <h4 className="doc-slot-title">Slot 1: Business Registration / NTN / Commercial License *</h4>
                      <p className="doc-slot-subtitle">Official company registration certificate, FBR NTN document, or commercial lease agreement.</p>
                    </div>
                  </div>
                  <span className={`doc-badge ${hasBusinessReg ? 'doc-badge-success' : 'doc-badge-required'}`}>
                    {hasBusinessReg ? 'Uploaded & Encrypted' : 'Required'}
                  </span>
                </div>

                {hasBusinessReg ? (
                  <div className="doc-attached-box">
                    <div className="doc-file-info-box">
                      <FileText size={20} color="#10b981" />
                      <div>
                        <div className="doc-file-name">
                          {businessRegDoc?.document?.originalFilename || businessRegDoc?.originalFilename || 'Business_Registration_Document.pdf'}
                        </div>
                        <div className="doc-file-subtext">Status: Verified &amp; Encrypted in Secure Storage</div>
                      </div>
                    </div>
                    <div className="doc-action-buttons">
                      <button
                        type="button"
                        onClick={() => handlePreviewDoc(businessRegDoc?.document?._id || businessRegDoc?.document || businessRegDoc?._id)}
                        className="btn btn-outline btn-sm"
                        style={{ fontSize: '0.8rem', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                      >
                        <Eye size={13} /> View File
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteDoc(businessRegDoc?._id || businessRegDoc?.document?._id)}
                        disabled={deletingDocId === (businessRegDoc?._id || businessRegDoc?.document?._id)}
                        className="btn-doc-remove"
                        title="Delete and replace file"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                      <input
                        type="text"
                        className="branch-input"
                        placeholder="Registration or NTN Certificate Number (Optional)"
                        value={busRegRef}
                        onChange={e => setBusRegRef(e.target.value)}
                        style={{ flex: 1, minWidth: '220px', fontSize: '0.85rem' }}
                      />
                      <input
                        type="file"
                        ref={busRegInputRef}
                        accept=".pdf,.jpg,.jpeg,.png"
                        onChange={e => setBusRegFile(e.target.files[0] || null)}
                        style={{ display: 'none' }}
                        id="bus-reg-input"
                      />
                      <label
                        htmlFor="bus-reg-input"
                        className="btn btn-outline"
                        style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', cursor: 'pointer' }}
                      >
                        <Upload size={14} /> {busRegFile ? busRegFile.name.slice(0, 18) + '...' : 'Choose File'}
                      </label>
                      <button
                        type="button"
                        onClick={() => handleUploadDocumentSlot('BUSINESS_REGISTRATION', busRegFile, busRegRef)}
                        disabled={!busRegFile || uploadingSlot === 'BUSINESS_REGISTRATION'}
                        className="btn btn-primary"
                        style={{ fontSize: '0.85rem' }}
                      >
                        {uploadingSlot === 'BUSINESS_REGISTRATION' ? 'Encrypting & Uploading...' : 'Upload Slot 1'}
                      </button>
                    </div>
                    {busRegFile && (
                      <span style={{ fontSize: '0.78rem', color: '#10b981' }}>Selected: {busRegFile.name} ({(busRegFile.size / 1024).toFixed(0)} KB)</span>
                    )}
                  </div>
                )}
              </div>

              {/* SLOT 2: Owner CNIC / Passport */}
              <div className={`doc-slot-card ${hasCnic ? 'uploaded' : 'pending'}`}>
                <div className="doc-slot-header">
                  <div className="doc-slot-title-area">
                    <div className={`doc-slot-icon-badge ${hasCnic ? 'success' : 'primary'}`}>
                      {hasCnic ? <CheckCircle size={22} /> : <UserCheck size={20} />}
                    </div>
                    <div>
                      <h4 className="doc-slot-title">Slot 2: Owner CNIC / Passport / National ID *</h4>
                      <p className="doc-slot-subtitle">Valid government photo identification of the authorized owner.</p>
                    </div>
                  </div>
                  <span className={`doc-badge ${hasCnic ? 'doc-badge-success' : 'doc-badge-required'}`}>
                    {hasCnic ? 'Uploaded & Encrypted' : 'Required'}
                  </span>
                </div>

                {hasCnic ? (
                  <div className="doc-attached-box">
                    <div className="doc-file-info-box">
                      <FileText size={20} color="#10b981" />
                      <div>
                        <div className="doc-file-name">
                          {cnicDoc?.document?.originalFilename || cnicDoc?.originalFilename || 'Owner_CNIC_Identification.jpg'}
                        </div>
                        <div className="doc-file-subtext">Status: Verified &amp; Encrypted in Secure Storage</div>
                      </div>
                    </div>
                    <div className="doc-action-buttons">
                      <button
                        type="button"
                        onClick={() => handlePreviewDoc(cnicDoc?.document?._id || cnicDoc?.document || cnicDoc?._id)}
                        className="btn btn-outline btn-sm"
                        style={{ fontSize: '0.8rem', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                      >
                        <Eye size={13} /> View File
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteDoc(cnicDoc?._id || cnicDoc?.document?._id)}
                        disabled={deletingDocId === (cnicDoc?._id || cnicDoc?.document?._id)}
                        className="btn-doc-remove"
                        title="Delete and replace file"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                      <input
                        type="text"
                        className="branch-input"
                        placeholder="Owner CNIC Number (e.g. 35201-1234567-1)"
                        value={cnicRef}
                        onChange={e => setCnicRef(e.target.value)}
                        style={{ flex: 1, minWidth: '220px', fontSize: '0.85rem' }}
                      />
                      <input
                        type="file"
                        ref={cnicInputRef}
                        accept=".pdf,.jpg,.jpeg,.png"
                        onChange={e => setCnicFile(e.target.files[0] || null)}
                        style={{ display: 'none' }}
                        id="cnic-input"
                      />
                      <label
                        htmlFor="cnic-input"
                        className="btn btn-outline"
                        style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', cursor: 'pointer' }}
                      >
                        <Upload size={14} /> {cnicFile ? cnicFile.name.slice(0, 18) + '...' : 'Choose File'}
                      </label>
                      <button
                        type="button"
                        onClick={() => handleUploadDocumentSlot('OWNER_CNIC_FRONT', cnicFile, cnicRef)}
                        disabled={!cnicFile || uploadingSlot === 'OWNER_CNIC_FRONT'}
                        className="btn btn-primary"
                        style={{ fontSize: '0.85rem' }}
                      >
                        {uploadingSlot === 'OWNER_CNIC_FRONT' ? 'Encrypting & Uploading...' : 'Upload Slot 2'}
                      </button>
                    </div>
                    {cnicFile && (
                      <span style={{ fontSize: '0.78rem', color: '#10b981' }}>Selected: {cnicFile.name} ({(cnicFile.size / 1024).toFixed(0)} KB)</span>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* SECTION 5: Legal Consent Declarations */}
          <div style={{
            background: 'var(--card-bg-light, rgba(255, 255, 255, 0.02))',
            borderRadius: '14px',
            border: '1px solid var(--card-border, rgba(255, 255, 255, 0.08))',
            padding: '18px 22px',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px'
          }}>
            <label style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', cursor: 'pointer', fontSize: '0.85rem', color: 'var(--text-primary, #cbd5e1)' }}>
              <input
                type="checkbox"
                checked={truthDeclaration}
                onChange={e => setTruthDeclaration(e.target.checked)}
                style={{ marginTop: '3px' }}
              />
              <span>I hereby declare that all submitted physical address data, location coordinates, ownership profile, and documents are genuine and accurate representations of active gym operations.</span>
            </label>

            <label style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', cursor: 'pointer', fontSize: '0.85rem', color: 'var(--text-primary, #cbd5e1)' }}>
              <input
                type="checkbox"
                checked={consentCheck}
                onChange={e => setConsentCheck(e.target.checked)}
                style={{ marginTop: '3px' }}
              />
              <span>I authorize GymSync compliance officers to inspect attached encrypted documentation and verify operational readiness before activating this facility on GymSync discovery.</span>
            </label>
          </div>

        </div>

        {/* Modal Sticky Footer */}
        <div style={{
          padding: '16px 28px',
          borderTop: '1px solid var(--card-border, rgba(255, 255, 255, 0.08))',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          background: 'var(--panel-bg, #0f172a)',
          flexShrink: 0
        }}>
          <div>
            <span style={{ fontSize: '0.8rem', color: isRequirementsMet ? '#10b981' : '#f59e0b', fontWeight: 600 }}>
              {isRequirementsMet ? '✓ Mandatory Documents Uploaded' : '⚠️ Both Document Slots Required for Submission'}
            </span>
          </div>

          <div style={{ display: 'flex', gap: '12px' }}>
            <button
              type="button"
              onClick={() => handleSaveDraft(false)}
              disabled={savingDraft || !profile.branchName}
              className="btn btn-outline"
              style={{ fontSize: '0.85rem' }}
            >
              {savingDraft ? 'Saving Draft...' : 'Save Draft'}
            </button>

            <button
              type="button"
              onClick={handleSubmitApplication}
              disabled={submitting || !isRequirementsMet || !truthDeclaration || !consentCheck || !profile.branchName}
              className="btn btn-primary"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                fontSize: '0.85rem',
                background: isRequirementsMet && truthDeclaration && consentCheck ? '#10b981' : undefined,
                borderColor: isRequirementsMet && truthDeclaration && consentCheck ? '#10b981' : undefined
              }}
            >
              <CheckCircle size={16} />
              {submitting ? 'Submitting Application...' : 'Submit Application for Verification'}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
