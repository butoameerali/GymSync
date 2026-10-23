import React, { useState } from 'react';
import { 
  CheckCircle, 
  XCircle, 
  Building, 
  MapPin, 
  DollarSign, 
  Mail, 
  Eye, 
  Phone, 
  Clock, 
  ShieldCheck, 
  X,
  AlertTriangle,
  FileText
} from 'lucide-react';
import { toast } from 'react-toastify';

const QUICK_REJECTION_REASONS = [
  'Incomplete or unclear facility photos',
  'Commercial operating license / permit verification required',
  'Pricing or fee structure requires clarification',
  'Facility address or geographical location could not be verified',
  'Duplicate or unauthorized facility listing'
];

const GymManagement = ({ pendingGyms, onRefresh }) => {
  const [viewingGym, setViewingGym] = useState(null);
  const [rejectingGym, setRejectingGym] = useState(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  const handleGymApproval = async (gymId, status, reason = '') => {
    if (status === 'Rejected' && !reason.trim()) {
      toast.error('Please specify a rejection reason for the gym owner');
      return;
    }

    setIsProcessing(true);
    try {
      const res = await fetch(`/api/admin/gyms/${gymId}/approval`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('gymsync_token') || ''}`
        },
        body: JSON.stringify({ 
          status, 
          rejectionReason: reason.trim() 
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      
      toast.success(`Gym registration ${status.toLowerCase()} successfully!`);
      setRejectingGym(null);
      setViewingGym(null);
      setRejectionReason('');
      if (onRefresh) onRefresh();
    } catch (error) {
      toast.error(error.message || 'Failed to update gym status');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="glass-panel" style={{ padding: '24px' }}>
      <div style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h3 style={{ margin: 0, fontSize: '1.25rem', color: 'var(--text-primary)' }}>Pending Gym Owner Applications & Facilities</h3>
          <p style={{ margin: '4px 0 0 0', color: 'var(--text-secondary)', fontSize: '0.88rem' }}>
            Inspect facility applications, verify pictures, pricing, and owner profiles before approving them to host trainees.
          </p>
        </div>
        <span style={{ background: 'rgba(99, 102, 241, 0.15)', color: 'var(--primary-accent, #818cf8)', padding: '6px 14px', borderRadius: '20px', fontSize: '0.82rem', fontWeight: 600 }}>
          {pendingGyms?.length || 0} Awaiting Review
        </span>
      </div>

      {(!pendingGyms || pendingGyms.length === 0) ? (
        <div style={{ textAlign: 'center', padding: '48px 20px', color: 'var(--text-secondary)' }}>
          <Building size={48} style={{ opacity: 0.3, marginBottom: '12px' }} />
          <p style={{ fontSize: '0.95rem' }}>No pending gym applications at this time. All submissions are up to date.</p>
        </div>
      ) : (
        <div className="table-responsive">
          <table className="admin-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.1)', textAlign: 'left' }}>
                <th style={{ padding: '12px 14px' }}>Facility Name</th>
                <th style={{ padding: '12px 14px' }}>Location</th>
                <th style={{ padding: '12px 14px' }}>Owner Details</th>
                <th style={{ padding: '12px 14px' }}>Monthly Rate</th>
                <th style={{ padding: '12px 14px', textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {pendingGyms.map(gym => (
                <tr key={gym._id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                  <td style={{ padding: '14px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      {gym.images && gym.images[0] ? (
                        <img 
                          src={gym.images[0]} 
                          alt={gym.name} 
                          style={{ width: '40px', height: '40px', borderRadius: '8px', objectFit: 'cover' }}
                        />
                      ) : (
                        <div style={{ width: '40px', height: '40px', borderRadius: '8px', background: 'rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <Building size={20} color="var(--text-secondary)" />
                        </div>
                      )}
                      <div>
                        <strong>{gym.name}</strong>
                        {gym.contactPhone && (
                          <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                            {gym.contactPhone}
                          </div>
                        )}
                      </div>
                    </div>
                  </td>
                  <td style={{ padding: '14px' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.85rem' }}>
                      <MapPin size={14} color="var(--primary-accent, #6366f1)" /> {gym.location || gym.address || 'Address unlisted'}
                    </span>
                  </td>
                  <td style={{ padding: '14px' }}>
                    <div><strong>{gym.ownerName || 'Gym Owner'}</strong></div>
                    <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>{gym.ownerEmail || 'owner@gymsync.com'}</div>
                  </td>
                  <td style={{ padding: '14px' }}>
                    <strong style={{ color: '#10b981' }}>${gym.monthlyFee || gym.price || 0}</strong>
                    <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}> / month</span>
                  </td>
                  <td style={{ padding: '14px', textAlign: 'right' }}>
                    <div style={{ display: 'inline-flex', gap: '8px', alignItems: 'center' }}>
                      <button 
                        className="btn btn-sm"
                        style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '4px', padding: '6px 10px', borderRadius: '6px' }}
                        onClick={() => setViewingGym(gym)}
                        title="View Full Application"
                      >
                        <Eye size={14} /> View Details
                      </button>
                      <button 
                        className="btn btn-sm btn-primary" 
                        disabled={isProcessing}
                        style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '6px 10px', borderRadius: '6px' }}
                        onClick={() => handleGymApproval(gym._id, 'Approved')}
                      >
                        <CheckCircle size={14} /> Approve
                      </button>
                      <button 
                        className="btn btn-sm" 
                        disabled={isProcessing}
                        style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', color: '#ef4444', display: 'flex', alignItems: 'center', gap: '4px', padding: '6px 10px', borderRadius: '6px' }} 
                        onClick={() => {
                          setRejectingGym(gym);
                          setRejectionReason('');
                        }}
                      >
                        <XCircle size={14} /> Reject
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* VIEW APPLICATION MODAL */}
      {viewingGym && (
        <div className="modal-overlay" style={{ zIndex: 1100, display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={() => setViewingGym(null)}>
          <div 
            className="modal-content glass-panel" 
            style={{ 
              maxWidth: '680px', 
              width: '95%', 
              maxHeight: '90vh', 
              overflowY: 'auto', 
              borderRadius: '16px', 
              padding: '24px',
              background: 'var(--card-bg, #111827)',
              border: '1px solid var(--card-border, rgba(255,255,255,0.1))',
              boxShadow: '0 25px 50px rgba(0,0,0,0.6)'
            }}
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '14px', marginBottom: '16px' }}>
              <div>
                <span style={{ fontSize: '0.75rem', background: 'rgba(234, 179, 8, 0.15)', color: '#facc15', border: '1px solid rgba(234, 179, 8, 0.3)', padding: '2px 8px', borderRadius: '12px', fontWeight: 600 }}>
                  Awaiting Approval
                </span>
                <h3 style={{ margin: '6px 0 0 0', fontSize: '1.3rem', color: 'var(--text-primary, #fff)' }}>
                  {viewingGym.name}
                </h3>
              </div>
              <button 
                onClick={() => setViewingGym(null)}
                className="btn btn-icon"
                style={{ background: 'none', border: 'none', color: 'var(--text-secondary, #94a3b8)', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Gym Photos Gallery */}
            {viewingGym.images && viewingGym.images.length > 0 ? (
              <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', marginBottom: '16px', paddingBottom: '6px' }}>
                {viewingGym.images.map((img, idx) => (
                  <img 
                    key={idx} 
                    src={img} 
                    alt={`Gym photo ${idx + 1}`} 
                    style={{ width: '180px', height: '110px', objectFit: 'cover', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.1)', flexShrink: 0 }}
                  />
                ))}
              </div>
            ) : (
              <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px dashed rgba(255,255,255,0.1)', padding: '20px', borderRadius: '10px', textAlign: 'center', marginBottom: '16px', color: 'var(--text-secondary)' }}>
                No facility photos uploaded by applicant.
              </div>
            )}

            {/* Grid Information */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '14px', marginBottom: '16px' }}>
              <div style={{ background: 'rgba(255,255,255,0.03)', padding: '12px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.06)' }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Location & Address</span>
                <p style={{ margin: '4px 0 0 0', fontSize: '0.88rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                  <MapPin size={14} style={{ display: 'inline', marginRight: '4px' }} />
                  {viewingGym.location || viewingGym.address || 'Not specified'}
                </p>
              </div>

              <div style={{ background: 'rgba(255,255,255,0.03)', padding: '12px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.06)' }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Monthly Membership Fee</span>
                <p style={{ margin: '4px 0 0 0', fontSize: '1rem', fontWeight: 700, color: '#10b981' }}>
                  ${viewingGym.monthlyFee || viewingGym.price || 0} / month
                </p>
              </div>

              <div style={{ background: 'rgba(255,255,255,0.03)', padding: '12px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.06)' }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Owner Name & Email</span>
                <p style={{ margin: '4px 0 0 0', fontSize: '0.88rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                  {viewingGym.ownerName || 'Gym Owner'}
                </p>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                  {viewingGym.ownerEmail || 'Email unlisted'}
                </span>
              </div>

              <div style={{ background: 'rgba(255,255,255,0.03)', padding: '12px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.06)' }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Operating Hours / Contact</span>
                <p style={{ margin: '4px 0 0 0', fontSize: '0.88rem', color: 'var(--text-primary)' }}>
                  {viewingGym.openingHours || viewingGym.timings || 'Standard gym hours'}
                </p>
                {viewingGym.contactPhone && (
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                    Phone: {viewingGym.contactPhone}
                  </span>
                )}
              </div>
            </div>

            {/* Amenities */}
            {viewingGym.amenities && viewingGym.amenities.length > 0 && (
              <div style={{ marginBottom: '16px' }}>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Facility Amenities:</span>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '6px' }}>
                  {viewingGym.amenities.map((item, idx) => (
                    <span key={idx} style={{ background: 'rgba(99, 102, 241, 0.12)', color: 'var(--primary-accent, #a5b4fc)', border: '1px solid rgba(99, 102, 241, 0.25)', padding: '3px 10px', borderRadius: '12px', fontSize: '0.78rem' }}>
                      {typeof item === 'string' ? item : item.name}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Description / Bio */}
            <div style={{ marginBottom: '20px' }}>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Facility Overview & Details:</span>
              <p style={{ margin: '6px 0 0 0', fontSize: '0.86rem', lineHeight: 1.5, color: 'var(--text-primary)', whiteSpace: 'pre-wrap', background: 'rgba(255,255,255,0.02)', padding: '12px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.06)' }}>
                {viewingGym.description || viewingGym.bio || 'No detailed facility description provided by applicant.'}
              </p>
            </div>

            {/* Modal Bottom Actions */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '16px' }}>
              <button
                type="button"
                className="btn btn-outline"
                style={{ borderColor: '#ef4444', color: '#ef4444' }}
                onClick={() => {
                  setRejectingGym(viewingGym);
                  setRejectionReason('');
                  setViewingGym(null);
                }}
              >
                <XCircle size={16} /> Reject Application
              </button>
              <button
                type="button"
                className="btn btn-primary"
                disabled={isProcessing}
                onClick={() => handleGymApproval(viewingGym._id, 'Approved')}
              >
                <CheckCircle size={16} /> Approve & Publish Facility
              </button>
            </div>
          </div>
        </div>
      )}

      {/* REJECT MODAL WITH REASON & OWNER NOTIFICATION */}
      {rejectingGym && (
        <div className="modal-overlay" style={{ zIndex: 1150, display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={() => setRejectingGym(null)}>
          <div 
            className="modal-content glass-panel" 
            style={{ 
              maxWidth: '540px', 
              width: '92%', 
              borderRadius: '16px', 
              padding: '24px',
              background: 'var(--card-bg, #111827)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              boxShadow: '0 25px 50px rgba(0,0,0,0.6)'
            }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
              <div style={{ background: 'rgba(239, 68, 68, 0.15)', padding: '8px', borderRadius: '10px', color: '#ef4444' }}>
                <AlertTriangle size={24} />
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.15rem', color: '#f87171' }}>
                  Reject Gym Application: {rejectingGym.name}
                </h3>
                <p style={{ margin: '2px 0 0 0', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                  Provide an explanation. This reason is saved to the gym profile and sent to the owner.
                </p>
              </div>
            </div>

            {/* Quick Reason Chips */}
            <div style={{ marginBottom: '12px' }}>
              <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>
                Quick Reasons:
              </span>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                {QUICK_REJECTION_REASONS.map((chip, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setRejectionReason(chip)}
                    style={{
                      background: rejectionReason === chip ? 'rgba(239, 68, 68, 0.25)' : 'rgba(255,255,255,0.05)',
                      border: '1px solid rgba(255,255,255,0.1)',
                      color: rejectionReason === chip ? '#fca5a5' : 'var(--text-secondary)',
                      padding: '4px 8px',
                      borderRadius: '6px',
                      fontSize: '0.74rem',
                      cursor: 'pointer',
                      textAlign: 'left'
                    }}
                  >
                    {chip}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '6px' }}>
                Detailed Rejection Explanation *
              </label>
              <textarea
                rows={4}
                required
                value={rejectionReason}
                onChange={e => setRejectionReason(e.target.value)}
                placeholder="Explain why the facility application was turned down and what the gym owner can do to rectify..."
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: '8px',
                  background: 'rgba(0,0,0,0.3)',
                  border: '1px solid rgba(255,255,255,0.15)',
                  color: '#fff',
                  fontSize: '0.85rem',
                  resize: 'vertical'
                }}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button
                type="button"
                className="btn btn-outline"
                onClick={() => setRejectingGym(null)}
                disabled={isProcessing}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn"
                style={{ background: '#dc2626', color: '#fff', border: 'none', padding: '8px 16px', borderRadius: '8px', fontWeight: 600 }}
                disabled={isProcessing || !rejectionReason.trim()}
                onClick={() => handleGymApproval(rejectingGym._id, 'Rejected', rejectionReason)}
              >
                {isProcessing ? 'Rejecting...' : 'Confirm Rejection'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default GymManagement;
