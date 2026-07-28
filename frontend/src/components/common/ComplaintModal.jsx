import React, { useState } from 'react';
import { AlertTriangle, Send } from 'lucide-react';
import { toast } from 'react-toastify';
import Modal from './Modal';

const ComplaintModal = ({ isOpen, onClose, defaultEntityType = 'User', defaultEntityId = '', defaultEntityTitle = '' }) => {
  const [entityType, setEntityType] = useState(defaultEntityType);
  const [entityId, setEntityId] = useState(defaultEntityId);
  const [entityTitle, setEntityTitle] = useState(defaultEntityTitle);
  const [reason, setReason] = useState('Inappropriate Content');
  const [description, setDescription] = useState('');
  const [attachment, setAttachment] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const reporterName = localStorage.getItem('gymsync_user_name') || 'Guest User';

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!description.trim()) {
      toast.error('Please describe the complaint details');
      return;
    }

    setIsSubmitting(true);
    const formData = new FormData();
    formData.append('reporterName', reporterName);
    formData.append('reportedEntityType', entityType);
    formData.append('reportedEntityId', entityId || 'N/A');
    formData.append('reportedEntityTitle', entityTitle || entityId || 'N/A');
    formData.append('reason', reason);
    formData.append('description', description.trim());
    if (attachment) {
      formData.append('attachment', attachment);
    }

    try {
      const res = await fetch('/api/complaints', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('gymsync_token') || ''}`
        },
        body: formData
      });

      if (res.ok) {
        const data = await res.json();
        toast.success(`Complaint #${data.complaintId} submitted to moderators`);
        setDescription('');
        onClose();
      } else {
        toast.error('Failed to submit complaint');
      }
    } catch (err) {
      toast.error('Error submitting report');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="File a Complaint / Report Issue">
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', background: 'rgba(239, 68, 68, 0.1)', padding: '12px', borderRadius: '8px', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
          <AlertTriangle size={24} color="#ef4444" />
          <p style={{ fontSize: '0.85rem', color: '#fca5a5', margin: 0 }}>
            Reports are reviewed by GymSync Complaint Moderators within 24 hours.
          </p>
        </div>

        <div>
          <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '6px' }}>Reported Target Type</label>
          <select 
            className="search-input" 
            value={entityType}
            onChange={e => setEntityType(e.target.value)}
          >
            <option value="User">User Profile</option>
            <option value="Post">Community Post</option>
            <option value="Comment">Post Comment</option>
            <option value="Gym">Gym Facility</option>
            <option value="Product">Store Product</option>
          </select>
        </div>

        <div>
          <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '6px' }}>Target Name / ID</label>
          <input 
            type="text" 
            required 
            className="search-input"
            placeholder="Name or ID of reported target..."
            value={entityTitle}
            onChange={e => {
              setEntityTitle(e.target.value);
              setEntityId(e.target.value);
            }}
          />
        </div>

        <div>
          <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '6px' }}>Reason</label>
          <select 
            className="search-input"
            value={reason}
            onChange={e => setReason(e.target.value)}
          >
            <option value="Inappropriate Content">Inappropriate Content / Harassment</option>
            <option value="Fake Gym Listing">Fake Gym Listing or Facility Fraud</option>
            <option value="Defective Product">Defective Product or Order Problem</option>
            <option value="Spam">Spam / Unsolicited Promotion</option>
            <option value="Other">Other Policy Violation</option>
          </select>
        </div>

        <div>
          <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '6px' }}>Detailed Explanation</label>
          <textarea 
            rows={4} 
            required 
            className="search-input" 
            style={{ resize: 'vertical' }}
            placeholder="Describe what happened and provide context for moderators..."
            value={description}
            onChange={e => setDescription(e.target.value)}
          />
        </div>

        <div>
          <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '6px' }}>Attachment (Optional)</label>
          <input 
            type="file" 
            className="search-input"
            accept="image/*,video/*"
            onChange={e => setAttachment(e.target.files?.[0] || null)}
          />
        </div>

        <button 
          type="submit" 
          disabled={isSubmitting} 
          className="btn btn-primary"
          style={{ marginTop: '8px' }}
        >
          <Send size={16} /> Submit Complaint to Moderators
        </button>
      </form>
    </Modal>
  );
};

export default ComplaintModal;
