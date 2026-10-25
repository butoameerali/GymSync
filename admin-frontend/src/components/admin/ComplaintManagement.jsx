import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { 
  FileText, 
  Eye, 
  Award, 
  CheckCircle, 
  Clock, 
  AlertCircle, 
  RotateCcw, 
  XCircle, 
  Paperclip, 
  X,
  Send,
  MessageSquare
} from 'lucide-react';
import { toast } from 'react-toastify';

const QUICK_RESOLUTIONS = [
  'Issue investigated and resolved. Necessary corrective actions taken.',
  'Payment/billing error verified and credit adjustment processed.',
  'Facility management notified and required maintenance scheduled.',
  'Trainer warned regarding policy violation; coaching adjustments made.',
  'Inquiry reviewed. Provided guidance and closed ticket.'
];

const ComplaintManagement = ({ complaints, userName, userRole, isSeniorAdmin, onRefresh }) => {
  const [statusFilter, setStatusFilter] = useState('All');
  const [resolvingTicket, setResolvingTicket] = useState(null);
  const [newStatus, setNewStatus] = useState('Resolved');
  const [resolutionNotes, setResolutionNotes] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [inspectionTicket, setInspectionTicket] = useState(null);

  const handleResolveSubmit = async (e) => {
    e?.preventDefault();
    if (!resolvingTicket) return;
    if (!resolutionNotes.trim()) {
      toast.error('Please enter resolution notes explaining the decision to the member');
      return;
    }

    setIsProcessing(true);
    try {
      const res = await fetch(`/api/complaints/${resolvingTicket._id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${(localStorage.getItem('gymsync_admin_token') || localStorage.getItem('gymsync_token')) || ''}`
        },
        body: JSON.stringify({ 
          status: newStatus,
          resolutionNotes: resolutionNotes.trim(),
          adminReply: resolutionNotes.trim(),
          moderatorName: userName || 'Moderator'
        })
      });

      if (res.ok) {
        toast.success(`Ticket #${resolvingTicket.complaintId || resolvingTicket._id} marked as ${newStatus}`);
        setResolvingTicket(null);
        setResolutionNotes('');
        if (onRefresh) onRefresh();
      } else {
        const d = await res.json();
        toast.error(d.message || 'Failed to update ticket');
      }
    } catch (err) {
      toast.error('Network error updating ticket');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleQuickStatus = async (ticketId, status) => {
    try {
      const res = await fetch(`/api/complaints/${ticketId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${(localStorage.getItem('gymsync_admin_token') || localStorage.getItem('gymsync_token')) || ''}`
        },
        body: JSON.stringify({ 
          status,
          moderatorName: userName || 'Moderator'
        })
      });
      if (res.ok) {
        toast.success(`Ticket marked as ${status}`);
        if (onRefresh) onRefresh();
      } else {
        const d = await res.json();
        toast.error(d.message || 'Failed to update status');
      }
    } catch (e) {
      toast.error('Failed to update status');
    }
  };

  const handleRequestRefund = async (complaintId) => {
    try {
      const res = await fetch(`/api/admin/complaints/${complaintId}/request-refund`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${(localStorage.getItem('gymsync_admin_token') || localStorage.getItem('gymsync_token')) || ''}`
        },
        body: JSON.stringify({ refundAmount: 29.99 })
      });
      if (res.ok) {
        toast.info('Subscription refund cashback request sent to Higher Admin for approval!');
        if (onRefresh) onRefresh();
      } else {
        const d = await res.json();
        toast.error(d.message || 'Failed to submit refund request');
      }
    } catch (e) {
      toast.error('Failed to submit refund request');
    }
  };

  const filteredComplaints = (complaints || []).filter(c => {
    if (statusFilter === 'All') return true;
    return (c.status || '').toLowerCase() === statusFilter.toLowerCase();
  });

  const getStatusBadge = (status) => {
    const s = (status || 'Pending').toLowerCase();
    if (s === 'resolved') {
      return <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', background: 'rgba(16, 185, 129, 0.15)', color: '#10b981', border: '1px solid rgba(16, 185, 129, 0.3)', padding: '3px 8px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 600 }}><CheckCircle size={12} /> Resolved</span>;
    }
    if (s === 'in progress') {
      return <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', background: 'rgba(59, 130, 246, 0.15)', color: '#60a5fa', border: '1px solid rgba(59, 130, 246, 0.3)', padding: '3px 8px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 600 }}><Clock size={12} /> In Progress</span>;
    }
    if (s === 'reopened') {
      return <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', background: 'rgba(249, 115, 22, 0.15)', color: '#fb923c', border: '1px solid rgba(249, 115, 22, 0.3)', padding: '3px 8px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 600 }}><RotateCcw size={12} /> Reopened</span>;
    }
    if (s === 'closed') {
      return <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', background: 'rgba(148, 163, 184, 0.15)', color: '#94a3b8', border: '1px solid rgba(148, 163, 184, 0.3)', padding: '3px 8px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 600 }}><XCircle size={12} /> Closed</span>;
    }
    return <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', background: 'rgba(234, 179, 8, 0.15)', color: '#facc15', border: '1px solid rgba(234, 179, 8, 0.3)', padding: '3px 8px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 600 }}><Clock size={12} /> Pending</span>;
  };

  return (
    <div className="glass-panel" style={{ padding: '24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '15px' }}>
        <div>
          <h3 style={{ margin: 0, fontSize: '1.25rem', color: 'var(--text-primary)' }}>Complaints & Support Tickets Queue</h3>
          <p style={{ margin: '4px 0 0 0', color: 'var(--text-secondary)', fontSize: '0.88rem' }}>
            Investigate grievances submitted by members, review attachments, write official resolution notes, and resolve cases.
          </p>
        </div>
        <select 
          className="search-input" 
          style={{ width: 'auto', minWidth: '160px', padding: '8px 12px', borderRadius: '8px', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.15)', color: 'var(--text-primary)' }}
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="All">All Statuses</option>
          <option value="Pending">Pending</option>
          <option value="In Progress">In Progress</option>
          <option value="Resolved">Resolved</option>
          <option value="Closed">Closed</option>
          <option value="Reopened">Reopened</option>
        </select>
      </div>

      {filteredComplaints.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '48px 20px', color: 'var(--text-secondary)' }}>
          <FileText size={48} style={{ opacity: 0.3, marginBottom: '12px' }} />
          <p style={{ fontSize: '0.95rem' }}>No complaints or support tickets matching "{statusFilter}".</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(330px, 1fr))', gap: '18px' }}>
          {filteredComplaints.map(c => (
            <div 
              key={c._id} 
              className="glass-panel" 
              style={{ 
                padding: '18px', 
                borderRadius: '14px', 
                border: '1px solid var(--card-border, rgba(255,255,255,0.08))',
                background: 'rgba(255,255,255,0.02)',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between'
              }}
            >
              <div>
                {/* Card Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <span style={{ fontFamily: 'monospace', fontWeight: 700, fontSize: '0.85rem', color: 'var(--text-primary)' }}>
                    #{c.complaintId || c._id?.slice(-8)}
                  </span>
                  {getStatusBadge(c.status)}
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                  <span style={{ fontSize: '0.75rem', background: 'rgba(99, 102, 241, 0.15)', color: 'var(--primary-accent, #a5b4fc)', padding: '2px 8px', borderRadius: '4px', fontWeight: 600 }}>
                    {c.category || c.reportedEntityType || 'General'}
                  </span>
                  <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                    {c.reporterName || 'Trainee'}
                  </span>
                </div>

                <h4 style={{ margin: '4px 0 8px 0', fontSize: '0.95rem', color: 'var(--text-primary)' }}>
                  {c.title || c.reportedEntityTitle || c.reason || 'Support Grievance'}
                </h4>

                <div style={{ background: 'rgba(0,0,0,0.25)', padding: '10px 12px', borderRadius: '8px', margin: '8px 0', fontSize: '0.85rem', lineHeight: 1.4, color: 'var(--text-primary)' }}>
                  {c.description}
                </div>

                {/* Reopen note */}
                {c.reopenReason && (
                  <div style={{ background: 'rgba(249, 115, 22, 0.08)', border: '1px solid rgba(249, 115, 22, 0.2)', padding: '8px 10px', borderRadius: '6px', fontSize: '0.8rem', color: '#fdba74', margin: '6px 0' }}>
                    <strong>Reopen Remarks:</strong> {c.reopenReason}
                  </div>
                )}

                {/* Evidence Attachment */}
                {(c.attachmentUrl || (c.evidenceUrls && c.evidenceUrls.length > 0)) && (
                  <div style={{ margin: '6px 0', fontSize: '0.8rem' }}>
                    <a 
                      href={c.attachmentUrl || c.evidenceUrls[0]} 
                      target="_blank" 
                      rel="noopener noreferrer" 
                      style={{ color: '#38bdf8', display: 'inline-flex', alignItems: 'center', gap: '4px', textDecoration: 'underline' }}
                    >
                      <Paperclip size={13} /> View Attached Proof
                    </a>
                  </div>
                )}

                {/* Existing Resolution Note */}
                {(c.resolutionNotes || c.adminReply) && (
                  <div style={{ background: 'rgba(16, 185, 129, 0.08)', border: '1px solid rgba(16, 185, 129, 0.2)', borderRadius: '6px', padding: '8px 10px', margin: '8px 0', fontSize: '0.82rem', color: '#6ee7b7' }}>
                    <strong>Resolution Note:</strong> {c.resolutionNotes || c.adminReply}
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div style={{ marginTop: '14px', borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '10px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button 
                    className="btn btn-sm btn-primary" 
                    onClick={() => {
                      setResolvingTicket(c);
                      setNewStatus('Resolved');
                      setResolutionNotes(c.resolutionNotes || c.adminReply || '');
                    }} 
                    style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', padding: '8px 12px', fontSize: '0.82rem' }}
                  >
                    <CheckCircle size={14} /> Review & Resolve
                  </button>

                  <button 
                    className="btn btn-sm btn-outline" 
                    onClick={() => handleQuickStatus(c._id, 'In Progress')} 
                    style={{ padding: '8px 12px', fontSize: '0.82rem', color: '#60a5fa', borderColor: 'rgba(59, 130, 246, 0.3)' }}
                    title="Mark as Under Active Investigation"
                  >
                    Investigate
                  </button>
                </div>

                {userRole !== 'ComplaintModerator' && (c.category === 'Billing' || c.reportedEntityType === 'Billing') && (
                  <button 
                    type="button"
                    className="btn btn-outline btn-sm" 
                    style={{ color: '#f59e0b', borderColor: 'rgba(245, 158, 11, 0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', fontSize: '0.8rem', padding: '6px 10px' }}
                    onClick={() => handleRequestRefund(c._id)}
                  >
                    <Award size={14} /> Request Subscription Refund Cashback ($29.99)
                  </button>
                )}

                {isSeniorAdmin && (
                  <button 
                    className="btn btn-outline btn-sm" 
                    onClick={() => setInspectionTicket(c)} 
                    style={{ color: '#8b5cf6', borderColor: 'rgba(139, 92, 246, 0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', fontSize: '0.8rem', padding: '6px 10px' }}
                  >
                    <Eye size={14} /> Senior Audit Inspection
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* REVIEW & RESOLVE MODAL */}
      {resolvingTicket && typeof document !== 'undefined' && createPortal(
        <div 
          className="modal-overlay" 
          style={{ 
            position: 'fixed',
            inset: 0,
            width: '100vw',
            height: '100vh',
            background: 'rgba(0, 0, 0, 0.75)',
            backdropFilter: 'blur(6px)',
            WebkitBackdropFilter: 'blur(6px)',
            zIndex: 10050, 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            padding: '16px',
            boxSizing: 'border-box',
            margin: 0
          }} 
          onClick={() => setResolvingTicket(null)}
        >
          <div 
            className="modal-content glass-panel" 
            style={{ 
              maxWidth: '520px', 
              width: '100%', 
              maxHeight: '90vh',
              overflowY: 'auto',
              borderRadius: '16px', 
              padding: '18px 20px',
              background: 'var(--panel-bg, #0f172a)',
              border: '1px solid var(--card-border, rgba(16, 185, 129, 0.3))',
              boxShadow: '0 25px 50px rgba(0,0,0,0.6)',
              position: 'relative',
              boxSizing: 'border-box'
            }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--card-border, rgba(255,255,255,0.08))', paddingBottom: '12px', marginBottom: '14px' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.15rem', color: 'var(--text-primary)', fontWeight: 800 }}>
                  Resolve Support Ticket #{resolvingTicket.complaintId || resolvingTicket._id}
                </h3>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                  Member: {resolvingTicket.reporterName} • Category: {resolvingTicket.category || resolvingTicket.reportedEntityType}
                </span>
              </div>
              <button 
                onClick={() => setResolvingTicket(null)}
                className="btn btn-icon"
                style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleResolveSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>
                  Target Resolution Status:
                </label>
                <select
                  className="search-input"
                  value={newStatus}
                  onChange={e => setNewStatus(e.target.value)}
                  style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', background: 'var(--input-bg, rgba(0,0,0,0.3))', border: '1px solid var(--input-border, rgba(255,255,255,0.15))', color: 'var(--text-primary, #fff)' }}
                >
                  <option value="Resolved">Resolved (Issue Addressed & Satisfied)</option>
                  <option value="In Progress">In Progress (Under Active Investigation)</option>
                  <option value="Closed">Closed (Completed / Inactive)</option>
                  <option value="Pending">Pending (Needs Additional Trainee Input)</option>
                </select>
              </div>

              {/* Quick Preset Resolutions */}
              <div>
                <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>
                  Quick Resolution Templates:
                </span>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                  {QUICK_RESOLUTIONS.map((res, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setResolutionNotes(res)}
                      style={{
                        background: resolutionNotes === res ? 'rgba(16, 185, 129, 0.25)' : 'var(--card-bg-light, rgba(255,255,255,0.05))',
                        border: '1px solid var(--card-border, rgba(255,255,255,0.1))',
                        color: resolutionNotes === res ? '#10b981' : 'var(--text-secondary)',
                        padding: '4px 8px',
                        borderRadius: '6px',
                        fontSize: '0.74rem',
                        cursor: 'pointer',
                        textAlign: 'left'
                      }}
                    >
                      {res.slice(0, 48)}...
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '6px' }}>
                  Official Resolution Findings & Note to Member *
                </label>
                <textarea
                  rows={3}
                  required
                  value={resolutionNotes}
                  onChange={e => setResolutionNotes(e.target.value)}
                  placeholder="Explain actions taken to resolve this grievance. This explanation is dispatched directly to the member's notifications..."
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: '8px',
                    background: 'var(--input-bg, rgba(0,0,0,0.3))',
                    border: '1px solid var(--input-border, rgba(255,255,255,0.15))',
                    color: 'var(--text-primary, #fff)',
                    fontSize: '0.85rem',
                    resize: 'vertical',
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '6px' }}>
                <button
                  type="button"
                  className="btn btn-outline"
                  onClick={() => setResolvingTicket(null)}
                  disabled={isProcessing}
                  style={{ padding: '8px 14px', fontSize: '0.85rem' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  style={{ background: '#10b981', borderColor: '#10b981', padding: '8px 16px', fontSize: '0.85rem', fontWeight: 700 }}
                  disabled={isProcessing || !resolutionNotes.trim()}
                >
                  {isProcessing ? 'Updating...' : newStatus === 'In Progress' ? 'Set Under Review (In Progress)' : newStatus === 'Resolved' ? 'Resolve Complaint' : `Update Status to ${newStatus}`}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* SENIOR AUDIT INSPECTION MODAL */}
      {inspectionTicket && typeof document !== 'undefined' && createPortal(
        <div 
          className="modal-overlay" 
          style={{ 
            position: 'fixed',
            inset: 0,
            width: '100vw',
            height: '100vh',
            background: 'rgba(0, 0, 0, 0.75)',
            backdropFilter: 'blur(6px)',
            WebkitBackdropFilter: 'blur(6px)',
            zIndex: 10050, 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            padding: '16px',
            boxSizing: 'border-box',
            margin: 0
          }} 
          onClick={() => setInspectionTicket(null)}
        >
          <div 
            className="modal-content glass-panel" 
            style={{ 
              maxWidth: '540px', 
              width: '100%', 
              maxHeight: '90vh',
              overflowY: 'auto',
              borderRadius: '16px', 
              padding: '18px 20px',
              background: 'var(--panel-bg, #0f172a)',
              border: '1px solid var(--card-border, rgba(139, 92, 246, 0.3))',
              boxShadow: '0 25px 50px rgba(0,0,0,0.6)',
              position: 'relative',
              boxSizing: 'border-box'
            }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--card-border, rgba(255,255,255,0.08))', paddingBottom: '12px', marginBottom: '14px' }}>
              <h3 style={{ margin: 0, fontSize: '1.15rem', color: '#c4b5fd', fontWeight: 800 }}>
                Senior Audit Log #{inspectionTicket.complaintId || inspectionTicket._id}
              </h3>
              <button 
                onClick={() => setInspectionTicket(null)}
                className="btn btn-icon"
                style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '0.85rem' }}>
              <div>
                <strong>Reported By:</strong> {inspectionTicket.reporterName} (ID: {inspectionTicket.reporterId || 'N/A'})
              </div>
              <div>
                <strong>Original Grievance:</strong>
                <p style={{ margin: '4px 0 0 0', color: 'var(--text-secondary)', whiteSpace: 'pre-wrap' }}>
                  {inspectionTicket.description}
                </p>
              </div>
              <div>
                <strong>History Audit Trail:</strong>
                <div style={{ maxHeight: '180px', overflowY: 'auto', background: 'var(--card-bg-light, rgba(0,0,0,0.25))', border: '1px solid var(--card-border)', padding: '10px', borderRadius: '8px', marginTop: '6px' }}>
                  {(inspectionTicket.history || []).map((h, idx) => (
                    <div key={idx} style={{ marginBottom: '8px', borderBottom: '1px solid var(--card-border)', paddingBottom: '6px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', color: '#a5b4fc', fontSize: '0.78rem' }}>
                        <span>{h.action} by {h.performedBy}</span>
                        <span>{h.timestamp ? new Date(h.timestamp).toLocaleString() : ''}</span>
                      </div>
                      <div style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', marginTop: '2px' }}>
                        {h.notes}
                      </div>
                    </div>
                  ))}
                  {(!inspectionTicket.history || inspectionTicket.history.length === 0) && (
                    <div style={{ color: 'var(--text-secondary)' }}>No history events logged.</div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

export default ComplaintManagement;
