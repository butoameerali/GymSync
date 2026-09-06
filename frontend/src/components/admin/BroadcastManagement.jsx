import React, { useState } from 'react';
import { Send, Megaphone } from 'lucide-react';
import { toast } from 'react-toastify';

const BroadcastManagement = () => {
  const [broadcastTitle, setBroadcastTitle] = useState('');
  const [broadcastType, setBroadcastType] = useState('ExclusiveEvent');
  const [broadcastMessage, setBroadcastMessage] = useState('');
  const [isSending, setIsSending] = useState(false);

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
          type: broadcastType,
          message: broadcastMessage.trim()
        })
      });

      const data = await res.json();
      if (res.ok) {
        toast.success('Broadcast notification delivered to all subscribers!');
        setBroadcastTitle('');
        setBroadcastMessage('');
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
    <div className="glass-panel" style={{ padding: '24px' }}>
      <div style={{ marginBottom: '20px' }}>
        <h3 style={{ margin: 0 }}>Subscriber Event Broadcast System</h3>
        <p style={{ margin: '4px 0 0 0', color: 'var(--text-secondary)' }}>
          Send immediate announcements to all active subscribers regarding exclusive events, perks, or platform notices.
        </p>
      </div>

      <form onSubmit={handleSendBroadcast} style={{ display: 'flex', flexDirection: 'column', gap: '16px', maxWidth: '650px' }}>
        <div>
          <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '6px' }}>
            Broadcast Event Title
          </label>
          <input 
            type="text" 
            required 
            className="search-input" 
            placeholder="e.g. VIP Subscriber Meetup & Free Protein Shaker Giveaway!"
            value={broadcastTitle}
            onChange={e => setBroadcastTitle(e.target.value)}
          />
        </div>

        <div>
          <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '6px' }}>
            Announcement Category
          </label>
          <select className="search-input" value={broadcastType} onChange={e => setBroadcastType(e.target.value)}>
            <option value="ExclusiveEvent">Exclusive Subscriber Event</option>
            <option value="FreeGift">Free Gift Opportunity</option>
            <option value="SubscriberSpecial">Subscriber Special Announcement</option>
            <option value="SystemNotice">System Maintenance Notice</option>
          </select>
        </div>

        <div>
          <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '6px' }}>
            Message Content
          </label>
          <textarea 
            rows={4} 
            required 
            className="search-input" 
            placeholder="Enter event description, dates, and instructions for subscribers..."
            value={broadcastMessage}
            onChange={e => setBroadcastMessage(e.target.value)}
          />
        </div>

        <div>
          <button 
            type="submit" 
            className="btn btn-primary" 
            disabled={isSending}
            style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
          >
            <Send size={16} /> {isSending ? 'Transmitting Broadcast...' : 'Transmit Broadcast to All Subscribers'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default BroadcastManagement;
