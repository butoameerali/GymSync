import React, { useState } from 'react';
import { MessageSquare, Send, Eye, Award, CheckCircle, Clock, AlertCircle } from 'lucide-react';
import { toast } from 'react-toastify';
import Modal from '../common/Modal';

const ComplaintManagement = ({ complaints, userName, userRole, isSeniorAdmin, onRefresh }) => {
  const [selectedComplaint, setSelectedComplaint] = useState(null);
  const [inspectionComplaint, setInspectionComplaint] = useState(null);
  const [chatInput, setChatInput] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [isSendingChat, setIsSendingChat] = useState(false);

  const handleComplaintStatus = async (complaintId, status) => {
    try {
      const res = await fetch(`/api/complaints/${complaintId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('gymsync_token') || ''}`
        },
        body: JSON.stringify({ status })
      });
      if (res.ok) {
        toast.success(`Complaint status marked as ${status}`);
        if (onRefresh) onRefresh();
      } else {
        const d = await res.json();
        toast.error(d.message || 'Failed to update complaint status');
      }
    } catch (err) {
      toast.error('Failed to update complaint status');
    }
  };

  const handleSendChatMessage = async (complaintId) => {
    if (!chatInput.trim()) return;
    setIsSendingChat(true);
    try {
      const res = await fetch(`/api/admin/complaints/${complaintId}/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('gymsync_token') || ''}`
        },
        body: JSON.stringify({ text: chatInput.trim() })
      });
      if (res.ok) {
        const updatedComplaint = await res.json();
        setSelectedComplaint(updatedComplaint);
        setChatInput('');
        toast.success('Reply sent to trainee');
        if (onRefresh) onRefresh();
      } else {
        const d = await res.json();
        toast.error(d.message || 'Failed to send message');
      }
    } catch (err) {
      toast.error('Failed to send message');
    } finally {
      setIsSendingChat(false);
    }
  };

  const handleRequestRefund = async (complaintId) => {
    try {
      const res = await fetch(`/api/admin/complaints/${complaintId}/request-refund`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('gymsync_token') || ''}`
        },
        body: JSON.stringify({ refundAmount: 29.99 })
      });
      if (res.ok) {
        toast.info('Subscription refund cashback request sent to Higher Admin for approval!');
        setSelectedComplaint(null);
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
    return c.status === statusFilter;
  });

  return (
    <div className="glass-panel" style={{ padding: '24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '15px' }}>
        <div>
          <h3 style={{ margin: 0 }}>Complaints & Support Tickets Queue</h3>
          <p style={{ margin: '4px 0 0 0', color: 'var(--text-secondary)' }}>
            Investigate grievances submitted by members, communicate via live ticket chat, and resolve tickets.
          </p>
        </div>
        <select 
          className="search-input" 
          style={{ width: 'auto', minWidth: '160px' }}
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="All">All Statuses</option>
          <option value="Pending">Pending</option>
          <option value="In Progress">In Progress</option>
          <option value="Resolved">Resolved</option>
          <option value="Approved">Approved</option>
          <option value="Rejected">Rejected</option>
        </select>
      </div>

      {filteredComplaints.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary)' }}>
          <MessageSquare size={48} style={{ opacity: 0.3, marginBottom: '12px' }} />
          <p>No complaints matching the selected filter.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px' }}>
          {filteredComplaints.map(c => (
            <div key={c._id} className="glass-panel" style={{ padding: '18px', borderRadius: '14px', border: '1px solid var(--card-border)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                <strong>{c.complaintId || 'TICKET'}</strong>
                <span className={`status-pill ${c.status === 'Resolved' || c.status === 'Approved' ? 'approved' : c.status === 'Rejected' ? 'rejected' : 'pending'}`}>
                  {c.status}
                </span>
              </div>

              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: '0 0 6px 0' }}>
                <strong>Member:</strong> {c.reporterName || 'Trainee'}
                {c.assignedAdminName ? ` | Assigned: ${c.assignedAdminName}` : ''}
              </p>

              <div style={{ background: 'rgba(0,0,0,0.15)', padding: '10px 12px', borderRadius: '8px', margin: '8px 0', fontSize: '0.88rem', minHeight: '45px' }}>
                {c.description}
              </div>

              {c.attachmentUrl && (
                <div style={{ margin: '8px 0', fontSize: '0.8rem' }}>
                  <a href={c.attachmentUrl} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--primary-accent)' }}>
                    📎 View Ticket Attachment
                  </a>
                </div>
              )}

              <button 
                className="btn btn-outline btn-sm" 
                onClick={() => setSelectedComplaint(c)} 
                style={{ marginTop: '8px', width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
              >
                <MessageSquare size={14} /> Open Live Resolution Chat
              </button>

              <div style={{ display: 'flex', gap: '8px', marginTop: '10px' }}>
                <button 
                  className="btn btn-sm btn-outline" 
                  onClick={() => handleComplaintStatus(c._id, 'Pending')} 
                  style={{ flex: 1 }}
                >
                  Pending
                </button>
                <button 
                  className="btn btn-sm btn-primary" 
                  onClick={() => handleComplaintStatus(c._id, 'Resolved')} 
                  style={{ flex: 1, background: '#10b981', borderColor: '#10b981' }}
                >
                  Resolve
                </button>
              </div>

              {isSeniorAdmin && (
                <button 
                  className="btn btn-outline btn-sm" 
                  onClick={() => setInspectionComplaint(c)} 
                  style={{ marginTop: '8px', width: '100%', color: '#8b5cf6', borderColor: '#8b5cf6', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                >
                  <Eye size={14} /> Senior Inspection Log
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Complaint Chat Thread Modal */}
      <Modal isOpen={Boolean(selectedComplaint)} onClose={() => setSelectedComplaint(null)} title={`Complaint Thread #${selectedComplaint?.complaintId || 'TICKET'}`}>
        <div>
          <div style={{ maxHeight: '280px', overflowY: 'auto', background: 'var(--card-bg)', padding: '14px', borderRadius: '10px', marginBottom: '16px' }}>
            {(selectedComplaint?.chatMessages || []).length === 0 ? (
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', textAlign: 'center', margin: '20px 0' }}>
                No messages yet. Send a response to the trainee below.
              </p>
            ) : (
              selectedComplaint?.chatMessages?.map((msg, i) => (
                <div key={i} style={{ marginBottom: '12px', textAlign: msg.senderName === userName ? 'right' : 'left' }}>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{msg.senderName} ({msg.role || 'Member'})</span>
                  <div style={{ 
                    background: msg.senderName === userName ? 'var(--primary-accent)' : 'rgba(255,255,255,0.08)', 
                    color: '#fff',
                    padding: '8px 12px', 
                    borderRadius: '8px', 
                    display: 'inline-block', 
                    marginTop: '2px',
                    maxWidth: '85%',
                    textAlign: 'left'
                  }}>
                    {msg.text}
                  </div>
                </div>
              ))
            )}
          </div>

          <form onSubmit={(e) => { e.preventDefault(); handleSendChatMessage(selectedComplaint?._id); }} style={{ display: 'flex', gap: '8px' }}>
            <input 
              type="text" 
              className="search-input" 
              placeholder="Type message to user..."
              value={chatInput}
              disabled={isSendingChat}
              onChange={e => setChatInput(e.target.value)}
            />
            <button type="submit" className="btn btn-primary" disabled={isSendingChat || !chatInput.trim()}>
              <Send size={16} /> {isSendingChat ? 'Sending...' : 'Send'}
            </button>
          </form>

          {userRole !== 'ComplaintModerator' && (
            <button 
              type="button"
              className="btn btn-outline btn-sm" 
              style={{ marginTop: '14px', width: '100%', color: '#f59e0b', borderColor: '#f59e0b', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
              onClick={() => handleRequestRefund(selectedComplaint._id)}
            >
              <Award size={14} /> Request Subscription Refund Cashback Approval ($29.99)
            </button>
          )}
        </div>
      </Modal>

      {/* Senior Super Admin Inspection Modal */}
      <Modal isOpen={Boolean(inspectionComplaint)} onClose={() => setInspectionComplaint(null)} title={`Senior Admin Audit Inspection #${inspectionComplaint?.complaintId}`}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div>
            <strong>Reported By:</strong> {inspectionComplaint?.reporterName} ({inspectionComplaint?.reporterRole || 'User'})
          </div>
          <div>
            <strong>Description:</strong>
            <p style={{ margin: '4px 0 0 0', color: 'var(--text-secondary)' }}>{inspectionComplaint?.description}</p>
          </div>
          <div>
            <strong>Transcript History ({inspectionComplaint?.chatMessages?.length || 0} messages):</strong>
            <div style={{ maxHeight: '200px', overflowY: 'auto', background: 'rgba(0,0,0,0.2)', padding: '10px', borderRadius: '8px', marginTop: '6px' }}>
              {(inspectionComplaint?.chatMessages || []).map((m, idx) => (
                <div key={idx} style={{ marginBottom: '8px', fontSize: '0.85rem' }}>
                  <strong>{m.senderName}:</strong> {m.text}
                </div>
              ))}
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default ComplaintManagement;
