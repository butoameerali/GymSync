import React, { useState, useEffect } from 'react';
import { 
  AlertCircle, 
  LifeBuoy, 
  PlusCircle, 
  Clock, 
  CheckCircle, 
  XCircle, 
  RotateCcw, 
  Paperclip, 
  Send, 
  RefreshCw,
  FileText,
  Copy,
  ChevronDown,
  ChevronUp,
  X
} from 'lucide-react';
import { toast } from 'react-toastify';
import './Modal.css';

const CATEGORIES = [
  { value: 'General', label: 'General Inquiry & Feedback' },
  { value: 'Billing', label: 'Billing & Payment Concerns' },
  { value: 'GymFacility', label: 'Gym Facility & Equipment Issue' },
  { value: 'Trainer', label: 'Trainer Conduct & Training Grievance' },
  { value: 'TechnicalBug', label: 'Technical Bug & App Performance' }
];

const ComplaintHubModal = ({ isOpen, onClose, initialTab = 'file' }) => {
  const userRole = (localStorage.getItem('gymsync_role') || '').toLowerCase().replace(/[_\s]/g, '');
  const isAdmin = userRole === 'admin' || userRole === 'superadmin' || userRole === 'complaintmoderator';
  const effectiveInitialTab = isAdmin ? 'my_tickets' : initialTab;
  const [activeTab, setActiveTab] = useState(effectiveInitialTab); // 'file' | 'my_tickets'
  
  // File Complaint state
  const [category, setCategory] = useState('General');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [attachment, setAttachment] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [lastCreatedId, setLastCreatedId] = useState(null);

  // My Tickets state
  const [tickets, setTickets] = useState([]);
  const [statusFilter, setStatusFilter] = useState('All');
  const [isLoadingTickets, setIsLoadingTickets] = useState(false);
  const [expandedTicketId, setExpandedTicketId] = useState(null);
  
  // Reopen ticket state
  const [reopenTargetId, setReopenTargetId] = useState(null);
  const [reopenReason, setReopenReason] = useState('');
  const [isReopening, setIsReopening] = useState(false);

  const token = localStorage.getItem('gymsync_token') || '';

  useEffect(() => {
    if (isOpen) {
      setActiveTab(isAdmin ? 'my_tickets' : initialTab);
      fetchMyTickets();
    }
  }, [isOpen, initialTab, isAdmin]);

  useEffect(() => {
    if (isOpen && activeTab === 'my_tickets') {
      fetchMyTickets();
    }
  }, [activeTab]);

  const fetchMyTickets = async () => {
    if (!token) return;
    setIsLoadingTickets(true);
    try {
      const res = await fetch('/api/complaints', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setTickets(Array.isArray(data) ? data : []);
      } else {
        toast.error('Could not fetch your support tickets');
      }
    } catch (err) {
      console.error('Failed to fetch tickets:', err);
      toast.error('Network error fetching support tickets');
    } finally {
      setIsLoadingTickets(false);
    }
  };

  const handleFileSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim()) {
      toast.error('Please enter a complaint subject or title');
      return;
    }
    if (!description.trim()) {
      toast.error('Please describe your grievance in detail');
      return;
    }

    setIsSubmitting(true);
    try {
      let attachmentUrl = '';
      if (attachment) {
        // Read as base64 data url for reliability
        attachmentUrl = await new Promise((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result);
          reader.readAsDataURL(attachment);
        });
      }

      const payload = {
        title: title.trim(),
        category,
        reportedEntityType: category,
        description: description.trim(),
        attachmentUrl
      };

      const res = await fetch('/api/complaints', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        const data = await res.json();
        const cid = data.complaintId || `CMP-${Date.now()}`;
        setLastCreatedId(cid);
        toast.success(`Support Ticket #${cid} logged successfully!`);
        setTitle('');
        setDescription('');
        setAttachment(null);
        setActiveTab('my_tickets');
        fetchMyTickets();
      } else {
        const errData = await res.json();
        toast.error(errData.message || 'Failed to submit grievance');
      }
    } catch (err) {
      console.error(err);
      toast.error('Error submitting grievance ticket');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReopenTicket = async (ticketId) => {
    if (!reopenReason.trim()) {
      toast.error('Please state why you are reopening this ticket');
      return;
    }

    setIsReopening(true);
    try {
      const res = await fetch(`/api/complaints/${ticketId}/reopen`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ remarks: reopenReason.trim() })
      });

      if (res.ok) {
        toast.success('Ticket reopened! Our moderation team will re-investigate.');
        setReopenTargetId(null);
        setReopenReason('');
        fetchMyTickets();
      } else {
        const err = await res.json();
        toast.error(err.message || 'Failed to reopen ticket');
      }
    } catch (err) {
      toast.error('Error reopening ticket');
    } finally {
      setIsReopening(false);
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    toast.info('Ticket ID copied to clipboard');
  };

  const filteredTickets = tickets.filter(t => {
    if (statusFilter === 'All') return true;
    return (t.status || '').toLowerCase() === statusFilter.toLowerCase();
  });

  const getStatusBadge = (status) => {
    const s = (status || 'Pending').toLowerCase();
    if (s === 'resolved') {
      return <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', background: 'rgba(16, 185, 129, 0.15)', color: '#10b981', border: '1px solid rgba(16, 185, 129, 0.3)', padding: '2px 8px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 600 }}><CheckCircle size={12} /> Resolved</span>;
    }
    if (s === 'in progress') {
      return <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', background: 'rgba(59, 130, 246, 0.15)', color: '#60a5fa', border: '1px solid rgba(59, 130, 246, 0.3)', padding: '2px 8px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 600 }}><Clock size={12} /> In Progress</span>;
    }
    if (s === 'reopened') {
      return <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', background: 'rgba(249, 115, 22, 0.15)', color: '#fb923c', border: '1px solid rgba(249, 115, 22, 0.3)', padding: '2px 8px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 600 }}><RotateCcw size={12} /> Reopened</span>;
    }
    if (s === 'closed') {
      return <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', background: 'rgba(148, 163, 184, 0.15)', color: '#94a3b8', border: '1px solid rgba(148, 163, 184, 0.3)', padding: '2px 8px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 600 }}><XCircle size={12} /> Closed</span>;
    }
    return <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', background: 'rgba(234, 179, 8, 0.15)', color: '#facc15', border: '1px solid rgba(234, 179, 8, 0.3)', padding: '2px 8px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 600 }}><Clock size={12} /> Pending</span>;
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" style={{ zIndex: 1100, display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={onClose}>
      <div 
        className="modal-content glass-panel" 
        style={{ 
          maxWidth: '680px', 
          width: '95%', 
          maxHeight: '88vh', 
          overflowY: 'auto', 
          borderRadius: '16px', 
          padding: '24px',
          background: 'var(--card-bg, #111827)',
          border: '1px solid var(--card-border, rgba(255,255,255,0.1))',
          boxShadow: '0 20px 50px rgba(0,0,0,0.5)'
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ background: 'rgba(239, 68, 68, 0.15)', padding: '8px', borderRadius: '10px', color: '#ef4444' }}>
              <LifeBuoy size={24} />
            </div>
            <div>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0, color: 'var(--text-primary, #fff)' }}>
                Help & Grievance Support Hub
              </h2>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary, #94a3b8)', margin: 0 }}>
                Formal ticket redressal & administrative dispute resolution
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="btn btn-icon"
            style={{ background: 'none', border: 'none', color: 'var(--text-secondary, #94a3b8)', cursor: 'pointer', padding: '6px' }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Admin Overview Notice */}
        {isAdmin && (
          <div style={{ background: 'rgba(99, 102, 241, 0.1)', border: '1px solid rgba(99, 102, 241, 0.25)', padding: '10px 14px', borderRadius: '10px', marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
            <div>
              <span style={{ fontSize: '0.82rem', color: '#c7d2fe', fontWeight: 600 }}>Administrator View: </span>
              <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>Review, investigate and resolve member tickets in the Moderation Center.</span>
            </div>
            <a 
              href="/admin?tab=complaints" 
              onClick={onClose} 
              style={{ fontSize: '0.8rem', color: '#fff', background: 'var(--primary-accent, #6366f1)', padding: '6px 12px', borderRadius: '6px', textDecoration: 'none', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '4px' }}
            >
              Open Admin Complaint Desk &rarr;
            </a>
          </div>
        )}

        {/* Navigation Tabs */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', background: 'rgba(255,255,255,0.04)', padding: '4px', borderRadius: '10px' }}>
          {!isAdmin && (
            <button
              type="button"
              onClick={() => setActiveTab('file')}
              style={{
                flex: 1,
                padding: '10px 14px',
                borderRadius: '8px',
                border: 'none',
                cursor: 'pointer',
                fontWeight: 600,
                fontSize: '0.88rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                background: activeTab === 'file' ? 'var(--primary-accent, #6366f1)' : 'transparent',
                color: activeTab === 'file' ? '#fff' : 'var(--text-secondary, #94a3b8)',
                transition: 'all 0.2s ease'
              }}
            >
              <PlusCircle size={16} /> File New Grievance
            </button>
          )}
          <button
            type="button"
            onClick={() => setActiveTab('my_tickets')}
            style={{
              flex: 1,
              padding: '10px 14px',
              borderRadius: '8px',
              border: 'none',
              cursor: 'pointer',
              fontWeight: 600,
              fontSize: '0.88rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              background: activeTab === 'my_tickets' ? 'var(--primary-accent, #6366f1)' : 'transparent',
              color: activeTab === 'my_tickets' ? '#fff' : 'var(--text-secondary, #94a3b8)',
              transition: 'all 0.2s ease'
            }}
          >
            <FileText size={16} /> {isAdmin ? 'Platform Support Tickets' : 'My Tickets'} ({tickets.length})
          </button>
        </div>

        {/* Tab 1: File New Grievance (Users & Trainees only) */}
        {!isAdmin && activeTab === 'file' && (
          <form onSubmit={handleFileSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ background: 'rgba(59, 130, 246, 0.08)', border: '1px solid rgba(59, 130, 246, 0.2)', padding: '12px 14px', borderRadius: '10px', display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
              <AlertCircle size={20} color="#60a5fa" style={{ flexShrink: 0, marginTop: '2px' }} />
              <div style={{ fontSize: '0.82rem', color: '#bfdbfe', lineHeight: 1.4 }}>
                <strong>Official Dispute Tracking:</strong> Every grievance receives a formal tracking code. Platform administration and moderators inspect and respond within 24 to 48 hours.
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary, #94a3b8)', marginBottom: '6px' }}>
                Grievance Category *
              </label>
              <select
                className="search-input"
                value={category}
                onChange={e => setCategory(e.target.value)}
                style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.15)', color: 'var(--text-primary, #fff)' }}
              >
                {CATEGORIES.map(cat => (
                  <option key={cat.value} value={cat.value} style={{ background: '#1e293b', color: '#fff' }}>
                    {cat.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary, #94a3b8)', marginBottom: '6px' }}>
                Subject / Issue Summary *
              </label>
              <input
                type="text"
                required
                placeholder="E.g., Double billed for monthly membership / Trainer missed scheduled session"
                value={title}
                onChange={e => setTitle(e.target.value)}
                className="search-input"
                style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.15)', color: 'var(--text-primary, #fff)' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary, #94a3b8)', marginBottom: '6px' }}>
                Comprehensive Description *
              </label>
              <textarea
                rows={4}
                required
                placeholder="Provide complete facts, dates, transaction details, or what resolution you expect..."
                value={description}
                onChange={e => setDescription(e.target.value)}
                className="search-input"
                style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.15)', color: 'var(--text-primary, #fff)', resize: 'vertical' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary, #94a3b8)', marginBottom: '6px' }}>
                Supporting Evidence / Screenshot (Optional)
              </label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <input
                  type="file"
                  id="complaint-attachment"
                  accept="image/*,.pdf"
                  onChange={e => setAttachment(e.target.files?.[0] || null)}
                  style={{ display: 'none' }}
                />
                <label
                  htmlFor="complaint-attachment"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '8px 14px',
                    background: 'rgba(255,255,255,0.08)',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    fontSize: '0.84rem',
                    color: 'var(--text-primary, #fff)',
                    border: '1px solid rgba(255,255,255,0.12)'
                  }}
                >
                  <Paperclip size={16} /> {attachment ? attachment.name : 'Attach File or Screenshot'}
                </label>
                {attachment && (
                  <button
                    type="button"
                    onClick={() => setAttachment(null)}
                    style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '0.8rem' }}
                  >
                    Remove
                  </button>
                )}
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="btn btn-primary"
              style={{
                marginTop: '10px',
                padding: '12px',
                borderRadius: '10px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                fontWeight: 600,
                fontSize: '0.95rem'
              }}
            >
              {isSubmitting ? (
                <>Logging Ticket...</>
              ) : (
                <><Send size={18} /> Submit Grievance Ticket</>
              )}
            </button>
          </form>
        )}

        {/* Tab 2: My Tickets */}
        {activeTab === 'my_tickets' && (
          <div>
            {/* Filter Pills & Refresh */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap', gap: '8px' }}>
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                {['All', 'Pending', 'In Progress', 'Resolved', 'Closed'].map(filter => (
                  <button
                    key={filter}
                    type="button"
                    onClick={() => setStatusFilter(filter)}
                    style={{
                      padding: '4px 10px',
                      borderRadius: '20px',
                      fontSize: '0.78rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                      border: '1px solid rgba(255,255,255,0.1)',
                      background: statusFilter === filter ? 'rgba(99, 102, 241, 0.3)' : 'transparent',
                      color: statusFilter === filter ? '#fff' : 'var(--text-secondary, #94a3b8)'
                    }}
                  >
                    {filter}
                  </button>
                ))}
              </div>
              <button
                type="button"
                onClick={fetchMyTickets}
                className="btn btn-icon"
                title="Refresh Tickets"
                style={{ background: 'rgba(255,255,255,0.06)', border: 'none', color: 'var(--text-secondary, #94a3b8)', padding: '6px', borderRadius: '6px', cursor: 'pointer' }}
              >
                <RefreshCw size={16} className={isLoadingTickets ? 'spin' : ''} />
              </button>
            </div>

            {isLoadingTickets ? (
              <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-secondary, #94a3b8)' }}>
                Loading your grievance tickets...
              </div>
            ) : filteredTickets.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px 20px', background: 'rgba(255,255,255,0.02)', borderRadius: '12px', border: '1px dashed rgba(255,255,255,0.1)' }}>
                <LifeBuoy size={36} color="var(--text-secondary, #94a3b8)" style={{ opacity: 0.5, marginBottom: '10px' }} />
                <h4 style={{ color: 'var(--text-primary, #fff)', margin: '0 0 6px 0' }}>No support tickets found</h4>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary, #94a3b8)', margin: '0 0 16px 0' }}>
                  {statusFilter === 'All' ? 'You have not submitted any grievance tickets yet.' : `No tickets with status "${statusFilter}".`}
                </p>
                {isAdmin ? (
                  <a
                    href="/admin?tab=complaints"
                    onClick={onClose}
                    className="btn btn-primary"
                    style={{ padding: '8px 16px', fontSize: '0.85rem', display: 'inline-flex', alignItems: 'center', gap: '6px', textDecoration: 'none' }}
                  >
                    Open Moderation Desk &rarr;
                  </a>
                ) : (
                  <button
                    type="button"
                    onClick={() => setActiveTab('file')}
                    className="btn btn-primary"
                    style={{ padding: '8px 16px', fontSize: '0.85rem' }}
                  >
                    File a Grievance Ticket
                  </button>
                )}
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {filteredTickets.map(ticket => {
                  const isExpanded = expandedTicketId === ticket._id;
                  const isClosedOrResolved = ['resolved', 'closed'].includes((ticket.status || '').toLowerCase());
                  const isReopeningThis = reopenTargetId === ticket._id;

                  return (
                    <div 
                      key={ticket._id}
                      style={{
                        background: 'rgba(255,255,255,0.03)',
                        borderRadius: '12px',
                        border: '1px solid rgba(255,255,255,0.08)',
                        padding: '14px',
                        transition: 'all 0.2s ease'
                      }}
                    >
                      {/* Ticket Card Header */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '10px' }}>
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px', flexWrap: 'wrap' }}>
                            <span 
                              onClick={() => copyToClipboard(ticket.complaintId || ticket._id)}
                              style={{ 
                                cursor: 'pointer', 
                                fontFamily: 'monospace', 
                                fontSize: '0.8rem', 
                                background: 'rgba(255,255,255,0.08)', 
                                padding: '2px 6px', 
                                borderRadius: '4px', 
                                color: 'var(--text-primary, #fff)',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px'
                              }}
                              title="Click to copy Ticket ID"
                            >
                              #{ticket.complaintId || ticket._id?.slice(-8)} <Copy size={11} />
                            </span>
                            {getStatusBadge(ticket.status)}
                            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary, #94a3b8)', background: 'rgba(255,255,255,0.05)', padding: '2px 6px', borderRadius: '4px' }}>
                              {ticket.category || ticket.reportedEntityType || 'General'}
                            </span>
                          </div>
                          <h4 style={{ margin: '4px 0', fontSize: '0.95rem', color: 'var(--text-primary, #fff)' }}>
                            {ticket.title || ticket.reportedEntityTitle || ticket.reason || 'Support Inquiry'}
                          </h4>
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary, #94a3b8)' }}>
                            Filed on {new Date(ticket.createdAt).toLocaleDateString()} at {new Date(ticket.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>

                        <button
                          type="button"
                          onClick={() => setExpandedTicketId(isExpanded ? null : ticket._id)}
                          className="btn btn-icon"
                          style={{ background: 'none', border: 'none', color: 'var(--text-secondary, #94a3b8)', cursor: 'pointer', padding: '4px' }}
                        >
                          {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                        </button>
                      </div>

                      {/* Ticket Description & Expanded Details */}
                      {isExpanded && (
                        <div style={{ marginTop: '12px', borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '10px' }}>
                          <p style={{ fontSize: '0.85rem', color: 'var(--text-primary, #e2e8f0)', whiteSpace: 'pre-wrap', lineHeight: 1.5, margin: '0 0 10px 0' }}>
                            {ticket.description}
                          </p>

                          {ticket.evidenceUrls && ticket.evidenceUrls.length > 0 && (
                            <div style={{ marginBottom: '10px' }}>
                              <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary, #94a3b8)' }}>Attachment:</span>
                              <div style={{ marginTop: '4px' }}>
                                <a 
                                  href={ticket.evidenceUrls[0]} 
                                  target="_blank" 
                                  rel="noopener noreferrer" 
                                  style={{ fontSize: '0.8rem', color: '#38bdf8', textDecoration: 'underline' }}
                                >
                                  View Attached Proof
                                </a>
                              </div>
                            </div>
                          )}

                          {/* Admin Resolution / Notes Box */}
                          {(ticket.resolutionNotes || ticket.adminReply) && (
                            <div style={{ background: 'rgba(16, 185, 129, 0.08)', border: '1px solid rgba(16, 185, 129, 0.25)', borderRadius: '8px', padding: '10px 12px', margin: '10px 0' }}>
                              <div style={{ fontSize: '0.78rem', fontWeight: 600, color: '#10b981', marginBottom: '4px' }}>
                                Official Moderator Resolution:
                              </div>
                              <div style={{ fontSize: '0.84rem', color: '#e2e8f0', lineHeight: 1.4 }}>
                                {ticket.resolutionNotes || ticket.adminReply}
                              </div>
                            </div>
                          )}

                          {/* Reopen Button & Form */}
                          {isClosedOrResolved && !isReopeningThis && (
                            <div style={{ marginTop: '12px', textAlign: 'right' }}>
                              <button
                                type="button"
                                onClick={() => {
                                  setReopenTargetId(ticket._id);
                                  setReopenReason('');
                                }}
                                style={{
                                  background: 'rgba(249, 115, 22, 0.12)',
                                  border: '1px solid rgba(249, 115, 22, 0.3)',
                                  color: '#fb923c',
                                  padding: '6px 12px',
                                  borderRadius: '6px',
                                  cursor: 'pointer',
                                  fontSize: '0.8rem',
                                  fontWeight: 600,
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '6px'
                                }}
                              >
                                <RotateCcw size={14} /> Reopen Ticket (Unresolved)
                              </button>
                            </div>
                          )}

                          {isReopeningThis && (
                            <div style={{ marginTop: '12px', background: 'rgba(249, 115, 22, 0.08)', border: '1px solid rgba(249, 115, 22, 0.2)', borderRadius: '8px', padding: '12px' }}>
                              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#fdba74', marginBottom: '6px' }}>
                                Reason for Reopening:
                              </label>
                              <textarea
                                rows={2}
                                value={reopenReason}
                                onChange={e => setReopenReason(e.target.value)}
                                placeholder="Explain why the resolution was insufficient or what issue remains..."
                                style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.15)', color: '#fff', fontSize: '0.82rem', marginBottom: '8px' }}
                              />
                              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                                <button
                                  type="button"
                                  onClick={() => setReopenTargetId(null)}
                                  style={{ padding: '6px 10px', borderRadius: '6px', background: 'transparent', border: '1px solid rgba(255,255,255,0.2)', color: 'var(--text-secondary, #94a3b8)', cursor: 'pointer', fontSize: '0.8rem' }}
                                >
                                  Cancel
                                </button>
                                <button
                                  type="button"
                                  disabled={isReopening}
                                  onClick={() => handleReopenTicket(ticket._id)}
                                  style={{ padding: '6px 12px', borderRadius: '6px', background: '#ea580c', border: 'none', color: '#fff', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600 }}
                                >
                                  {isReopening ? 'Submitting...' : 'Confirm Reopen'}
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default ComplaintHubModal;
