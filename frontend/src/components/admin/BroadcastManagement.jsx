import React, { useState, useEffect } from 'react';
import { Send, Megaphone, Users, Bell, Clock, RefreshCw, Radio } from 'lucide-react';
import { toast } from 'react-toastify';

const AUDIENCE_OPTIONS = [
  { value: 'Entire Platform', label: 'Entire Platform (All Registered Members)' },
  { value: 'All Users', label: 'All Users (Trainees & Regular Members)' },
  { value: 'Gym Owners Only', label: 'Gym Owners Only' },
  { value: 'Trainers Only', label: 'Certified Trainers Only' }
];

const CATEGORY_OPTIONS = [
  { value: 'Announcement', label: 'Platform Announcement' },
  { value: 'SystemNotice', label: 'System Notice / Maintenance' },
  { value: 'FeatureUpdate', label: 'New Feature / App Update' },
  { value: 'Promotion', label: 'Promotional Offer / Discount' },
  { value: 'UrgentAlert', label: 'Urgent Security / Safety Alert' }
];

const BroadcastManagement = () => {
  const [broadcastTitle, setBroadcastTitle] = useState('');
  const [broadcastType, setBroadcastType] = useState('Announcement');
  const [targetAudience, setTargetAudience] = useState('Entire Platform');
  const [broadcastMessage, setBroadcastMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  
  // History state
  const [history, setHistory] = useState([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);

  useEffect(() => {
    fetchHistory();
  }, []);

  const fetchHistory = async () => {
    setIsLoadingHistory(true);
    try {
      const res = await fetch('/api/admin/broadcasts', {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('gymsync_token') || ''}` }
      });
      if (res.ok) {
        const data = await res.json();
        setHistory(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      console.error('Failed to fetch broadcasts history:', err);
    } finally {
      setIsLoadingHistory(false);
    }
  };

  const handleSendBroadcast = async (e) => {
    e.preventDefault();
    if (!broadcastTitle.trim() || !broadcastMessage.trim()) {
      toast.warn('Title and message content are required');
      return;
    }

    setIsSending(true);
    try {
      const res = await fetch('/api/admin/broadcast', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('gymsync_token') || ''}`
        },
        body: JSON.stringify({
          title: broadcastTitle.trim(),
          eventType: broadcastType,
          targetAudience,
          message: broadcastMessage.trim()
        })
      });

      const data = await res.json();
      if (res.ok) {
        toast.success(data.message || 'Broadcast notification dispatched successfully!');
        setBroadcastTitle('');
        setBroadcastMessage('');
        fetchHistory();
      } else {
        toast.error(data.message || 'Failed to send broadcast');
      }
    } catch (err) {
      toast.error('Error sending broadcast');
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* 1. Compose & Dispatch Broadcast */}
      <div className="glass-panel" style={{ padding: '24px' }}>
        <div style={{ marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ background: 'rgba(99, 102, 241, 0.15)', padding: '10px', borderRadius: '12px', color: 'var(--primary-accent, #818cf8)' }}>
            <Megaphone size={24} />
          </div>
          <div>
            <h3 style={{ margin: 0, fontSize: '1.25rem', color: 'var(--text-primary)' }}>
              Platform Notification Broadcast Center
            </h3>
            <p style={{ margin: '4px 0 0 0', color: 'var(--text-secondary)', fontSize: '0.88rem' }}>
              Dispatch real-time system alerts, updates, and notices directly to member inboxes and notification bells.
            </p>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '24px' }}>
          {/* Form Column */}
          <form onSubmit={handleSendBroadcast} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>
                Target Audience *
              </label>
              <select 
                className="search-input" 
                value={targetAudience} 
                onChange={e => setTargetAudience(e.target.value)}
                style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.15)', color: '#fff' }}
              >
                {AUDIENCE_OPTIONS.map(opt => (
                  <option key={opt.value} value={opt.value} style={{ background: '#1e293b' }}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>
                Announcement Category *
              </label>
              <select 
                className="search-input" 
                value={broadcastType} 
                onChange={e => setBroadcastType(e.target.value)}
                style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.15)', color: '#fff' }}
              >
                {CATEGORY_OPTIONS.map(cat => (
                  <option key={cat.value} value={cat.value} style={{ background: '#1e293b' }}>
                    {cat.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>
                Broadcast Title / Headline *
              </label>
              <input 
                type="text" 
                required 
                className="search-input" 
                placeholder="e.g. Scheduled Maintenance & New Payment Methods Available"
                value={broadcastTitle}
                onChange={e => setBroadcastTitle(e.target.value)}
                style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.15)', color: '#fff' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>
                Notification Body Message *
              </label>
              <textarea 
                rows={4} 
                required 
                className="search-input" 
                placeholder="Write message details for the selected audience..."
                value={broadcastMessage}
                onChange={e => setBroadcastMessage(e.target.value)}
                style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.15)', color: '#fff', resize: 'vertical' }}
              />
            </div>

            <button 
              type="submit" 
              className="btn btn-primary" 
              disabled={isSending}
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '12px', borderRadius: '10px', fontWeight: 600 }}
            >
              <Radio size={18} /> {isSending ? 'Transmitting Broadcast...' : `Dispatch Broadcast to ${targetAudience}`}
            </button>
          </form>

          {/* Live Preview Column */}
          <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px dashed rgba(255,255,255,0.12)', borderRadius: '12px', padding: '20px', display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '12px' }}>
              Recipient Notification Preview
            </span>

            <div style={{ background: 'rgba(0,0,0,0.4)', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.08)', padding: '14px', flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                <div style={{ background: 'rgba(99, 102, 241, 0.2)', padding: '6px', borderRadius: '8px', color: 'var(--primary-accent, #818cf8)' }}>
                  <Bell size={16} />
                </div>
                <div>
                  <span style={{ fontSize: '0.72rem', color: '#a5b4fc', fontWeight: 600 }}>
                    [{broadcastType}] • Targeting: {targetAudience}
                  </span>
                  <h4 style={{ margin: '2px 0 0 0', fontSize: '0.95rem', color: '#fff' }}>
                    {broadcastTitle || 'Title preview will appear here...'}
                  </h4>
                </div>
              </div>

              <p style={{ margin: '10px 0 0 0', fontSize: '0.85rem', color: '#cbd5e1', lineHeight: 1.4, whiteSpace: 'pre-wrap' }}>
                {broadcastMessage || 'Type your message on the left to preview how platform recipients will view this notification in their feed...'}
              </p>

              <div style={{ marginTop: '14px', fontSize: '0.72rem', color: 'var(--text-secondary)', borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '8px' }}>
                Sender: Administration • Timestamp: Just Now
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Broadcast History Log */}
      <div className="glass-panel" style={{ padding: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '1.15rem' }}>Previous Platform Broadcasts</h3>
            <p style={{ margin: '4px 0 0 0', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
              Record of broadcasts delivered across user segments.
            </p>
          </div>
          <button 
            type="button" 
            className="btn btn-outline btn-sm" 
            onClick={fetchHistory}
            style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <RefreshCw size={14} className={isLoadingHistory ? 'spin' : ''} /> Refresh History
          </button>
        </div>

        {history.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '30px', color: 'var(--text-secondary)' }}>
            <Clock size={36} style={{ opacity: 0.3, marginBottom: '8px' }} />
            <p style={{ fontSize: '0.9rem' }}>No previous broadcasts recorded yet.</p>
          </div>
        ) : (
          <div className="table-responsive">
            <table className="admin-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.1)', textAlign: 'left' }}>
                  <th style={{ padding: '10px 12px' }}>Headline</th>
                  <th style={{ padding: '10px 12px' }}>Category</th>
                  <th style={{ padding: '10px 12px' }}>Target Segment</th>
                  <th style={{ padding: '10px 12px' }}>Recipients</th>
                  <th style={{ padding: '10px 12px' }}>Dispatched By</th>
                  <th style={{ padding: '10px 12px', textAlign: 'right' }}>Date</th>
                </tr>
              </thead>
              <tbody>
                {history.map(b => (
                  <tr key={b._id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                    <td style={{ padding: '12px' }}>
                      <strong>{b.title}</strong>
                      <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', maxWidth: '300px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {b.message}
                      </div>
                    </td>
                    <td style={{ padding: '12px' }}>
                      <span style={{ fontSize: '0.75rem', background: 'rgba(99, 102, 241, 0.15)', color: 'var(--primary-accent, #a5b4fc)', padding: '2px 8px', borderRadius: '4px' }}>
                        {b.eventType || 'Announcement'}
                      </span>
                    </td>
                    <td style={{ padding: '12px', fontSize: '0.85rem' }}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                        <Users size={13} color="var(--text-secondary)" /> {b.targetAudience || 'All Users'}
                      </span>
                    </td>
                    <td style={{ padding: '12px', fontSize: '0.85rem', fontWeight: 600, color: '#38bdf8' }}>
                      {b.recipientCount || 0}
                    </td>
                    <td style={{ padding: '12px', fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                      {b.sentBy || 'Admin'}
                    </td>
                    <td style={{ padding: '12px', fontSize: '0.8rem', color: 'var(--text-secondary)', textAlign: 'right' }}>
                      {b.createdAt ? new Date(b.createdAt).toLocaleDateString() : 'Recent'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default BroadcastManagement;
