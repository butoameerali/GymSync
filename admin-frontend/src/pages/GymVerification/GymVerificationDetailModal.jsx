import React, { useState } from 'react';
import { useAdminAuth } from '../../context/AdminAuthContext';
import {
  X,
  Building,
  User,
  FileText,
  MapPin,
  ExternalLink,
  CheckCircle,
  AlertTriangle,
  XCircle,
  Clock,
  Download,
  Eye,
  RefreshCw,
  ShieldCheck,
  Ban
} from 'lucide-react';
import { toast } from 'react-toastify';

const GymVerificationDetailModal = ({ application, onClose, onRefresh }) => {
  const { token, authHeaders } = useAdminAuth();
  const [actionTab, setActionTab] = useState('APPROVE');
  const [notes, setNotes] = useState('');
  const [missingRequirements, setMissingRequirements] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (!application) return null;

  const branch = application.branch || {};
  const applicant = application.applicantDetails || {};
  const organization = application.organization || {};
  const documents = application.documents || [];
  const history = application.reviewHistory || [];

  const handleActionSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const payload = {
        action: actionTab,
        notes: notes.trim(),
        missingRequirements: missingRequirements
          ? missingRequirements.split(',').map(s => s.trim()).filter(Boolean)
          : [],
        rejectionReason: rejectionReason.trim()
      };

      const res = await fetch(`/api/gym-verification/admin/application/${application._id}/action`, {
        method: 'PUT',
        headers: authHeaders(),
        body: JSON.stringify(payload)
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || 'Action failed');
      }

      toast.success(data.message || `Application marked as ${actionTab}`);
      onRefresh();
      onClose();
    } catch (err) {
      toast.error(err.message || 'Failed to process verification action');
    } finally {
      setSubmitting(false);
    }
  };

  const [previewingDocId, setPreviewingDocId] = useState(null);

  const handleDownloadDoc = async (docId) => {
    if (!docId) return;
    setPreviewingDocId(docId);
    const adminToken = token || localStorage.getItem('gymsync_admin_token') || localStorage.getItem('gymsync_token') || '';

    try {
      const res = await fetch(`/api/gym-verification/document/${docId}?token=${encodeURIComponent(adminToken)}`, {
        headers: adminToken ? { 'Authorization': `Bearer ${adminToken}` } : {}
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.message || 'Failed to retrieve document preview');
      }

      const blob = await res.blob();
      const objectUrl = window.URL.createObjectURL(blob);
      window.open(objectUrl, '_blank');
    } catch (err) {
      console.error('Preview error:', err);
      // Fallback: try opening direct route with token query parameter
      if (adminToken) {
        window.open(`/api/gym-verification/document/${docId}?token=${encodeURIComponent(adminToken)}`, '_blank');
      } else {
        toast.error(err.message || 'Error loading document preview');
      }
    } finally {
      setPreviewingDocId(null);
    }
  };

  return (
    <div className="admin-modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="admin-modal-container">
        {/* Header */}
        <div className="admin-modal-header">
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 700, color: '#fff' }}>
                Branch Verification Review
              </h3>
              <span className="admin-badge">{application.referenceId}</span>
            </div>
            <p style={{ margin: '4px 0 0 0', color: '#9ca3af', fontSize: '0.8rem' }}>
              Submitted: {application.submittedAt ? new Date(application.submittedAt).toLocaleString() : 'Draft'}
            </p>
          </div>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', color: '#9ca3af', cursor: 'pointer' }}
          >
            <X size={22} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="admin-modal-body">
          {/* Organization & Branch Header Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '20px' }}>
            <div className="admin-card" style={{ padding: '16px', margin: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#60a5fa', marginBottom: '8px' }}>
                <Building size={18} />
                <strong style={{ fontSize: '0.9rem' }}>Branch Facility Profile</strong>
              </div>
              <div style={{ fontSize: '0.88rem', color: '#e5e7eb' }}>
                <div><strong>Gym Name:</strong> {branch.name || 'N/A'}</div>
                <div><strong>Branch:</strong> {branch.branchName || branch.name || 'Main Branch'}</div>
                <div><strong>Address:</strong> {branch.address || branch.location || 'N/A'}</div>
                <div><strong>City / Country:</strong> {branch.city || 'N/A'}, {branch.country || 'Pakistan'}</div>
                {branch.coordinates?.lat && branch.coordinates?.lng && (
                  <div style={{ marginTop: '6px' }}>
                    <a
                      href={`https://www.google.com/maps?q=${branch.coordinates.lat},${branch.coordinates.lng}`}
                      target="_blank"
                      rel="noreferrer"
                      style={{ color: '#38bdf8', display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '0.8rem' }}
                    >
                      <MapPin size={14} /> View Verified Location ({branch.coordinates.lat.toFixed(4)}, {branch.coordinates.lng.toFixed(4)})
                      <ExternalLink size={12} />
                    </a>
                  </div>
                )}
              </div>
            </div>

            <div className="admin-card" style={{ padding: '16px', margin: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#34d399', marginBottom: '8px' }}>
                <User size={18} />
                <strong style={{ fontSize: '0.9rem' }}>Applicant & Organization</strong>
              </div>
              <div style={{ fontSize: '0.88rem', color: '#e5e7eb' }}>
                <div><strong>Company:</strong> {organization.name || 'N/A'}</div>
                <div><strong>Applicant:</strong> {applicant.legalName || 'N/A'}</div>
                <div><strong>Role:</strong> {applicant.relationship || 'Owner'}</div>
                <div><strong>Verified Email:</strong> {applicant.email || 'N/A'}</div>
                <div><strong>Phone:</strong> {applicant.phone || 'N/A'}</div>
              </div>
            </div>
          </div>

          {/* Verification Documents Checklist */}
          <div className="admin-card" style={{ padding: '16px', marginBottom: '20px' }}>
            <h4 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#f3f4f6', marginBottom: '12px' }}>
              Submitted Verification Documents
            </h4>
            {documents.length === 0 ? (
              <p style={{ color: '#9ca3af', fontSize: '0.85rem' }}>No verification documents uploaded yet.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {documents.map((item, idx) => {
                  const docRecord = item.document || {};
                  const docId = docRecord._id || item._id;
                  const isPreviewing = previewingDocId === docId;
                  return (
                    <div
                      key={idx}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '10px 14px',
                        background: '#1f2937',
                        borderRadius: '8px',
                        border: '1px solid #374151'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <FileText size={20} color="#60a5fa" />
                        <div>
                          <div style={{ fontSize: '0.88rem', fontWeight: 600, color: '#fff' }}>
                            {item.documentType}
                          </div>
                          <div style={{ fontSize: '0.75rem', color: '#9ca3af' }}>
                            {docRecord.originalFilename || 'document_file'} • {(docRecord.fileSizeBytes / 1024).toFixed(1)} KB
                          </div>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleDownloadDoc(docId)}
                        disabled={isPreviewing}
                        className="btn-admin btn-admin-secondary"
                        style={{ padding: '6px 14px', fontSize: '0.82rem', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                      >
                        {isPreviewing ? <RefreshCw className="animate-spin" size={14} /> : <Eye size={14} />}
                        <span>Preview</span>
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Review Decision Form */}
          <form onSubmit={handleActionSubmit} className="admin-card" style={{ padding: '20px', margin: 0 }}>
            <h4 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#f3f4f6', marginBottom: '14px' }}>
              Official Administrative Determination
            </h4>

            {/* Action Tabs */}
            <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
              <button
                type="button"
                onClick={() => setActionTab('APPROVE')}
                className={`btn-admin ${actionTab === 'APPROVE' ? 'btn-admin-primary' : 'btn-admin-secondary'}`}
              >
                <CheckCircle size={15} /> Approve Facility
              </button>
              <button
                type="button"
                onClick={() => setActionTab('REQUEST_INFO')}
                className={`btn-admin ${actionTab === 'REQUEST_INFO' ? 'btn-admin-primary' : 'btn-admin-secondary'}`}
              >
                <AlertTriangle size={15} /> Request More Information
              </button>
              <button
                type="button"
                onClick={() => setActionTab('REJECT')}
                className={`btn-admin ${actionTab === 'REJECT' ? 'btn-admin-danger' : 'btn-admin-secondary'}`}
              >
                <XCircle size={15} /> Reject
              </button>
              <button
                type="button"
                onClick={() => setActionTab('SUSPEND')}
                className={`btn-admin ${actionTab === 'SUSPEND' ? 'btn-admin-danger' : 'btn-admin-secondary'}`}
              >
                <Ban size={15} /> Suspend
              </button>
            </div>

            {actionTab === 'REQUEST_INFO' && (
              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#d1d5db', marginBottom: '6px' }}>
                  Missing / Incomplete Requirements (Comma-separated)
                </label>
                <input
                  type="text"
                  value={missingRequirements}
                  onChange={(e) => setMissingRequirements(e.target.value)}
                  placeholder="e.g. Clear Signboard Photo, Commercial Tenancy Agreement"
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    background: '#111827',
                    border: '1px solid #374151',
                    borderRadius: '6px',
                    color: '#fff',
                    fontSize: '0.88rem'
                  }}
                />
              </div>
            )}

            {actionTab === 'REJECT' && (
              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#d1d5db', marginBottom: '6px' }}>
                  Rejection Rationale
                </label>
                <input
                  type="text"
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  placeholder="e.g. Unverifiable commercial registration or invalid address"
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    background: '#111827',
                    border: '1px solid #374151',
                    borderRadius: '6px',
                    color: '#fff',
                    fontSize: '0.88rem'
                  }}
                />
              </div>
            )}

            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#d1d5db', marginBottom: '6px' }}>
                Review Notes & Instructions for Applicant
              </label>
              <textarea
                rows={3}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Provide clear notes or instructions regarding this administrative verification decision..."
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  background: '#111827',
                  border: '1px solid #374151',
                  borderRadius: '6px',
                  color: '#fff',
                  fontSize: '0.88rem',
                  resize: 'vertical'
                }}
              />
            </div>

            <button
              type="submit"
              disabled={submitting}
              className={`btn-admin ${['REJECT', 'SUSPEND'].includes(actionTab) ? 'btn-admin-danger' : 'btn-admin-primary'}`}
              style={{ width: '100%', justifyContent: 'center', padding: '10px' }}
            >
              {submitting ? 'Recording Audit Action...' : `Confirm & Record: ${actionTab}`}
            </button>
          </form>

          {/* Audit History */}
          {history.length > 0 && (
            <div style={{ marginTop: '20px' }}>
              <h5 style={{ fontSize: '0.85rem', fontWeight: 600, color: '#9ca3af', marginBottom: '8px' }}>
                Verification Audit History
              </h5>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {history.map((h, i) => (
                  <div key={i} style={{ fontSize: '0.78rem', color: '#9ca3af', background: '#111827', padding: '8px 12px', borderRadius: '6px' }}>
                    <strong style={{ color: '#60a5fa' }}>{h.action}</strong> by <strong>{h.reviewerName || 'System'}</strong> on {new Date(h.timestamp).toLocaleString()}: {h.notes || 'No comments'}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default GymVerificationDetailModal;
