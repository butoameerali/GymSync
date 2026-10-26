import React from 'react';
import { 
  Building, 
  MapPin, 
  UserCheck, 
  ShieldCheck, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  ExternalLink, 
  Eye, 
  X, 
  FileText,
  Phone,
  Mail,
  FileCheck
} from 'lucide-react';
import { toast } from 'react-toastify';

export default function BranchApplicationViewModal({ branch, onClose, onManageBranch }) {
  const token = localStorage.getItem('gymsync_token') || '';
  const va = branch?.verificationApplication || {};
  const applicant = va.applicantDetails || {};
  const documents = Array.isArray(va.documents) ? va.documents : [];
  const status = branch?.approvalStatus || va.status || 'Under Review';

  const handlePreviewDoc = async (docId) => {
    if (!docId) return;
    try {
      const res = await fetch(`/api/gym-verification/document/${docId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Failed to retrieve encrypted document');
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      window.open(url, '_blank');
    } catch (err) {
      toast.error(err.message || 'Error opening document preview');
    }
  };

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

  const getStatusBadge = () => {
    switch (status) {
      case 'Approved':
        return (
          <span style={{ 
            background: 'rgba(16, 185, 129, 0.15)', 
            color: '#10b981', 
            padding: '6px 14px', 
            borderRadius: '999px', 
            fontWeight: 600, 
            fontSize: '0.85rem', 
            display: 'inline-flex', 
            alignItems: 'center', 
            gap: '6px',
            border: '1px solid rgba(16, 185, 129, 0.3)'
          }}>
            <CheckCircle2 size={15} /> Verified &amp; Approved
          </span>
        );
      case 'Pending Review':
      case 'Under Review':
        return (
          <span style={{ 
            background: 'rgba(59, 130, 246, 0.15)', 
            color: '#3b82f6', 
            padding: '6px 14px', 
            borderRadius: '999px', 
            fontWeight: 600, 
            fontSize: '0.85rem', 
            display: 'inline-flex', 
            alignItems: 'center', 
            gap: '6px',
            border: '1px solid rgba(59, 130, 246, 0.3)'
          }}>
            <Clock size={15} /> Under Compliance Review
          </span>
        );
      case 'More Information Required':
        return (
          <span style={{ 
            background: 'rgba(245, 158, 11, 0.15)', 
            color: '#f59e0b', 
            padding: '6px 14px', 
            borderRadius: '999px', 
            fontWeight: 600, 
            fontSize: '0.85rem', 
            display: 'inline-flex', 
            alignItems: 'center', 
            gap: '6px',
            border: '1px solid rgba(245, 158, 11, 0.3)'
          }}>
            <AlertCircle size={15} /> Additional Info Required
          </span>
        );
      default:
        return (
          <span style={{ 
            background: 'rgba(148, 163, 184, 0.15)', 
            color: '#94a3b8', 
            padding: '6px 14px', 
            borderRadius: '999px', 
            fontWeight: 600, 
            fontSize: '0.85rem', 
            display: 'inline-flex', 
            alignItems: 'center', 
            gap: '6px',
            border: '1px solid rgba(148, 163, 184, 0.3)'
          }}>
            {status}
          </span>
        );
    }
  };

  return (
    <div className="bvm-overlay" style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(0, 0, 0, 0.75)',
      backdropFilter: 'blur(6px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 9999,
      padding: '20px'
    }}>
      <div style={{
        background: 'var(--card-bg, #11141e)',
        border: '1px solid var(--border-color, rgba(255, 255, 255, 0.12))',
        borderRadius: '16px',
        width: '100%',
        maxWidth: '780px',
        maxHeight: '90vh',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '0 25px 60px rgba(0, 0, 0, 0.5)',
        overflow: 'hidden'
      }}>
        {/* Header */}
        <div style={{
          padding: '22px 28px',
          borderBottom: '1px solid var(--border-color, rgba(255, 255, 255, 0.08))',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          background: 'var(--header-bg, rgba(255, 255, 255, 0.02))'
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
              <ShieldCheck size={22} color="#10b981" />
              <h3 style={{ margin: 0, fontSize: '1.25rem', color: 'var(--text-primary, #fff)', fontWeight: 700 }}>
                Verification Application Record
              </h3>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '0.82rem', color: 'var(--text-secondary, #94a3b8)' }}>
              <span>Reference: <strong style={{ color: 'var(--text-primary, #fff)' }}>{va.referenceId || `GS-APP-${branch?._id?.slice(-8).toUpperCase()}`}</strong></span>
              <span>•</span>
              <span>Branch: <strong style={{ color: 'var(--text-primary, #fff)' }}>{branch?.branchName || branch?.name}</strong></span>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            {getStatusBadge()}
            <button
              onClick={onClose}
              style={{
                background: 'rgba(255, 255, 255, 0.06)',
                border: 'none',
                borderRadius: '8px',
                color: 'var(--text-secondary, #94a3b8)',
                cursor: 'pointer',
                padding: '6px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
              title="Close modal"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Scrollable Body */}
        <div style={{
          padding: '26px 28px',
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
          gap: '22px'
        }}>
          {/* Status Alert Banner */}
          {status === 'Approved' ? (
            <div style={{
              background: 'rgba(16, 185, 129, 0.08)',
              border: '1px solid rgba(16, 185, 129, 0.3)',
              borderRadius: '12px',
              padding: '14px 18px',
              display: 'flex',
              alignItems: 'center',
              gap: '12px'
            }}>
              <CheckCircle2 size={24} color="#10b981" style={{ flexShrink: 0 }} />
              <div>
                <h4 style={{ margin: '0 0 2px 0', fontSize: '0.95rem', color: '#10b981', fontWeight: 600 }}>
                  Facility Officially Verified &amp; Authorized
                </h4>
                <p style={{ margin: 0, fontSize: '0.84rem', color: 'var(--text-secondary, #94a3b8)' }}>
                  This gym facility and its ownership records have been verified by GymSync Compliance. Operational pricing and member amenities can be managed under Facility Management.
                </p>
              </div>
            </div>
          ) : (
            <div style={{
              background: 'rgba(59, 130, 246, 0.08)',
              border: '1px solid rgba(59, 130, 246, 0.3)',
              borderRadius: '12px',
              padding: '14px 18px',
              display: 'flex',
              alignItems: 'center',
              gap: '12px'
            }}>
              <Clock size={24} color="#3b82f6" style={{ flexShrink: 0 }} />
              <div>
                <h4 style={{ margin: '0 0 2px 0', fontSize: '0.95rem', color: '#3b82f6', fontWeight: 600 }}>
                  Application Under Compliance Review
                </h4>
                <p style={{ margin: 0, fontSize: '0.84rem', color: 'var(--text-secondary, #94a3b8)' }}>
                  Your application and encrypted verification documents are currently under review by our administrative compliance team.
                </p>
              </div>
            </div>
          )}

          {/* Section 1: Facility Identity & Location */}
          <div style={{
            background: 'var(--card-bg-light, rgba(255, 255, 255, 0.03))',
            borderRadius: '12px',
            border: '1px solid var(--border-color, rgba(255, 255, 255, 0.08))',
            padding: '18px 20px'
          }}>
            <h4 style={{ margin: '0 0 14px 0', fontSize: '0.95rem', color: 'var(--text-primary, #fff)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Building size={17} color="#3b82f6" />
              1. Facility Identity &amp; Physical Location
            </h4>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px', fontSize: '0.86rem' }}>
              <div>
                <span style={{ color: 'var(--text-secondary, #94a3b8)', display: 'block', marginBottom: '2px', fontSize: '0.78rem' }}>Brand / Branch Name</span>
                <strong style={{ color: 'var(--text-primary, #fff)' }}>{branch?.branchName || branch?.name || '-'}</strong>
              </div>
              <div>
                <span style={{ color: 'var(--text-secondary, #94a3b8)', display: 'block', marginBottom: '2px', fontSize: '0.78rem' }}>Gym Facility Type</span>
                <strong style={{ color: 'var(--text-primary, #fff)' }}>{branch?.gymType || 'Commercial Gym'}</strong>
              </div>
              <div>
                <span style={{ color: 'var(--text-secondary, #94a3b8)', display: 'block', marginBottom: '2px', fontSize: '0.78rem' }}>Physical Address</span>
                <strong style={{ color: 'var(--text-primary, #fff)' }}>{branch?.address || branch?.location || '-'}</strong>
              </div>
              <div>
                <span style={{ color: 'var(--text-secondary, #94a3b8)', display: 'block', marginBottom: '2px', fontSize: '0.78rem' }}>City &amp; Country</span>
                <strong style={{ color: 'var(--text-primary, #fff)' }}>{branch?.city || 'Karachi'}, {branch?.country || 'Pakistan'}</strong>
              </div>
              <div>
                <span style={{ color: 'var(--text-secondary, #94a3b8)', display: 'block', marginBottom: '2px', fontSize: '0.78rem' }}>Contact Phone</span>
                <span style={{ color: 'var(--text-primary, #fff)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Phone size={13} color="#94a3b8" />
                  {branch?.contactPhone || branch?.phone || 'Not provided'}
                </span>
              </div>
              <div>
                <span style={{ color: 'var(--text-secondary, #94a3b8)', display: 'block', marginBottom: '2px', fontSize: '0.78rem' }}>Official Email</span>
                <span style={{ color: 'var(--text-primary, #fff)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Mail size={13} color="#94a3b8" />
                  {branch?.contactEmail || 'Not provided'}
                </span>
              </div>
            </div>

            {/* Coordinates / Map Pin */}
            {(branch?.coordinates?.lat || branch?.googleMapsUrl) && (
              <div style={{ marginTop: '14px', paddingTop: '12px', borderTop: '1px solid var(--border-color, rgba(255, 255, 255, 0.06))', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.82rem', color: 'var(--text-secondary, #94a3b8)' }}>
                  <MapPin size={15} color="#10b981" />
                  <span>Fixed Coordinates: <strong style={{ color: 'var(--text-primary, #fff)' }}>{branch?.coordinates?.lat}, {branch?.coordinates?.lng}</strong></span>
                </div>
                {branch?.googleMapsUrl && (
                  <a
                    href={branch.googleMapsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      color: '#3b82f6',
                      fontSize: '0.82rem',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      textDecoration: 'none'
                    }}
                  >
                    <ExternalLink size={13} /> View on Google Maps
                  </a>
                )}
              </div>
            )}
          </div>

          {/* Section 2: Authorized Applicant & Legal Profile */}
          <div style={{
            background: 'var(--card-bg-light, rgba(255, 255, 255, 0.03))',
            borderRadius: '12px',
            border: '1px solid var(--border-color, rgba(255, 255, 255, 0.08))',
            padding: '18px 20px'
          }}>
            <h4 style={{ margin: '0 0 14px 0', fontSize: '0.95rem', color: 'var(--text-primary, #fff)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <UserCheck size={17} color="#3b82f6" />
              2. Authorized Applicant &amp; Owner Profile
            </h4>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px', fontSize: '0.86rem' }}>
              <div>
                <span style={{ color: 'var(--text-secondary, #94a3b8)', display: 'block', marginBottom: '2px', fontSize: '0.78rem' }}>Legal Owner / Applicant Name</span>
                <strong style={{ color: 'var(--text-primary, #fff)' }}>{applicant.legalName || branch?.ownerName || '-'}</strong>
              </div>
              <div>
                <span style={{ color: 'var(--text-secondary, #94a3b8)', display: 'block', marginBottom: '2px', fontSize: '0.78rem' }}>CNIC / Passport Number</span>
                <strong style={{ color: 'var(--text-primary, #fff)' }}>{applicant.cnicOrPassport || 'Verified on file'}</strong>
              </div>
              <div>
                <span style={{ color: 'var(--text-secondary, #94a3b8)', display: 'block', marginBottom: '2px', fontSize: '0.78rem' }}>Applicant Role / Designation</span>
                <strong style={{ color: 'var(--text-primary, #fff)' }}>{applicant.relationship || 'Owner'}</strong>
              </div>
              <div>
                <span style={{ color: 'var(--text-secondary, #94a3b8)', display: 'block', marginBottom: '2px', fontSize: '0.78rem' }}>Direct Contact</span>
                <strong style={{ color: 'var(--text-primary, #fff)' }}>{applicant.phone || branch?.phone || applicant.email || '-'}</strong>
              </div>
            </div>
          </div>

          {/* Section 3: Statement of Purpose / Reason for Application */}
          <div style={{
            background: 'var(--card-bg-light, rgba(255, 255, 255, 0.03))',
            borderRadius: '12px',
            border: '1px solid var(--border-color, rgba(255, 255, 255, 0.08))',
            padding: '18px 20px'
          }}>
            <h4 style={{ margin: '0 0 10px 0', fontSize: '0.95rem', color: 'var(--text-primary, #fff)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <FileText size={17} color="#3b82f6" />
              3. Statement of Purpose / Reason for Opening
            </h4>
            <div style={{
              background: 'var(--input-bg, rgba(0, 0, 0, 0.25))',
              border: '1px solid var(--border-color, rgba(255, 255, 255, 0.06))',
              borderRadius: '8px',
              padding: '14px 16px',
              fontSize: '0.88rem',
              color: 'var(--text-primary, #e2e8f0)',
              lineHeight: 1.6,
              fontStyle: va.statementOfPurpose ? 'normal' : 'italic'
            }}>
              {va.statementOfPurpose || branch?.description || 'Commercial fitness facility opened to provide high-quality gym training and wellness facilities to the community.'}
            </div>
          </div>

          {/* Section 4: Attached Verification Documents */}
          <div style={{
            background: 'var(--card-bg-light, rgba(255, 255, 255, 0.03))',
            borderRadius: '12px',
            border: '1px solid var(--border-color, rgba(255, 255, 255, 0.08))',
            padding: '18px 20px'
          }}>
            <h4 style={{ margin: '0 0 14px 0', fontSize: '0.95rem', color: 'var(--text-primary, #fff)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <FileCheck size={17} color="#3b82f6" />
              4. Attached Verification Documents (AES-256 Encrypted)
            </h4>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '14px' }}>
              {/* Slot 1: Business Registration */}
              <div style={{
                background: 'var(--input-bg, rgba(0, 0, 0, 0.2))',
                borderRadius: '10px',
                border: '1px solid var(--border-color, rgba(255, 255, 255, 0.08))',
                padding: '14px 16px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                gap: '10px'
              }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                    <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary, #94a3b8)' }}>Slot 1: Business Registration / NTN</span>
                    <span style={{ background: 'rgba(16, 185, 129, 0.15)', color: '#10b981', fontSize: '0.72rem', padding: '2px 8px', borderRadius: '4px', fontWeight: 600 }}>Attached</span>
                  </div>
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-primary, #fff)', fontWeight: 500, wordBreak: 'break-all' }}>
                    {businessRegDoc?.document?.originalFilename || businessRegDoc?.originalFilename || 'Business_Registration_Document.pdf'}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => handlePreviewDoc(businessRegDoc?.document?._id || businessRegDoc?.document || businessRegDoc?._id)}
                  className="btn btn-outline btn-sm"
                  style={{ fontSize: '0.8rem', width: '100%', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                >
                  <Eye size={13} /> View Encrypted Document
                </button>
              </div>

              {/* Slot 2: Owner CNIC */}
              <div style={{
                background: 'var(--input-bg, rgba(0, 0, 0, 0.2))',
                borderRadius: '10px',
                border: '1px solid var(--border-color, rgba(255, 255, 255, 0.08))',
                padding: '14px 16px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                gap: '10px'
              }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                    <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary, #94a3b8)' }}>Slot 2: Owner CNIC / Passport</span>
                    <span style={{ background: 'rgba(16, 185, 129, 0.15)', color: '#10b981', fontSize: '0.72rem', padding: '2px 8px', borderRadius: '4px', fontWeight: 600 }}>Attached</span>
                  </div>
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-primary, #fff)', fontWeight: 500, wordBreak: 'break-all' }}>
                    {cnicDoc?.document?.originalFilename || cnicDoc?.originalFilename || 'Owner_CNIC_Identification.jpg'}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => handlePreviewDoc(cnicDoc?.document?._id || cnicDoc?.document || cnicDoc?._id)}
                  className="btn btn-outline btn-sm"
                  style={{ fontSize: '0.8rem', width: '100%', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                >
                  <Eye size={13} /> View Encrypted Document
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div style={{
          padding: '16px 28px',
          borderTop: '1px solid var(--border-color, rgba(255, 255, 255, 0.08))',
          display: 'flex',
          justifyContent: 'flex-end',
          alignItems: 'center',
          gap: '12px',
          background: 'var(--header-bg, rgba(255, 255, 255, 0.02))'
        }}>
          {status === 'Approved' && onManageBranch && (
            <button
              type="button"
              onClick={() => {
                onClose();
                onManageBranch(branch);
              }}
              className="btn btn-primary"
              style={{ fontSize: '0.85rem' }}
            >
              Manage Facility &amp; Pricing
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            className="btn btn-outline"
            style={{ fontSize: '0.85rem' }}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
