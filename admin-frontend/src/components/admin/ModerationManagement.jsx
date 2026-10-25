import React, { useState, useEffect } from 'react';
import { 
  Eye, 
  Trash2, 
  CheckCircle, 
  ShieldAlert, 
  AlertTriangle, 
  X, 
  Send,
  Flag,
  UserCheck,
  MessageSquare,
  Clock,
  RotateCcw,
  AlertCircle,
  FileText
} from 'lucide-react';
import { toast } from 'react-toastify';

const VIOLATION_PRESETS = [
  'Harassment, bullying, or hate speech',
  'Explicit, adult, or inappropriate media',
  'Commercial spam, scam, or unauthorized promotion',
  'Misinformation, impersonation, or deceptive conduct',
  'Safety violation or prohibited substance promotion'
];

const ModerationManagement = ({ reportedPosts, onRefresh }) => {
  const [activeModerationTab, setActiveModerationTab] = useState('reports'); // 'reports' | 'appeals'
  const [selectedPost, setSelectedPost] = useState(null);
  
  // Action modals for reports
  const [actionModal, setActionModal] = useState(null); // { type: 'delete' | 'warn' | 'dismiss' | 'purge', post: obj }
  const [moderationReason, setModerationReason] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  // Appeals State
  const [appeals, setAppeals] = useState([]);
  const [loadingAppeals, setLoadingAppeals] = useState(false);
  const [appealModal, setAppealModal] = useState(null); // { action: 'reinstate' | 'reject' | 'purge', post: obj }
  const [appealReplyReason, setAppealReplyReason] = useState('');
  const [isProcessingAppeal, setIsProcessingAppeal] = useState(false);

  const fetchAppeals = async () => {
    setLoadingAppeals(true);
    try {
      const res = await fetch('/api/admin/posts/moderation-appeals', {
        headers: {
          'Authorization': `Bearer ${(localStorage.getItem('gymsync_admin_token') || localStorage.getItem('gymsync_token')) || ''}`
        }
      });
      if (res.ok) {
        const data = await res.json();
        setAppeals(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      console.error('Failed to fetch moderation appeals:', err);
    } finally {
      setLoadingAppeals(false);
    }
  };

  useEffect(() => {
    fetchAppeals();
  }, []);

  const handleModerate = async () => {
    if (!actionModal?.post) return;
    const { type, post } = actionModal;

    if ((type === 'delete' || type === 'warn') && !moderationReason.trim()) {
      toast.error('Please specify a reason or guideline note');
      return;
    }

    setIsProcessing(true);
    try {
      const res = await fetch(`/api/admin/posts/${post._id}/moderate`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${(localStorage.getItem('gymsync_admin_token') || localStorage.getItem('gymsync_token')) || ''}`
        },
        body: JSON.stringify({ 
          action: type, 
          reason: moderationReason.trim() 
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);

      if (type === 'delete') {
        toast.success('Post removed to 15-day hold & 2-way notifications sent!');
      } else if (type === 'warn') {
        toast.success('Warning sent to post author & report addressed');
      } else {
        toast.success('Reports dismissed & reporters notified of outcome');
      }

      setActionModal(null);
      setSelectedPost(null);
      setModerationReason('');
      if (onRefresh) onRefresh();
      fetchAppeals();
    } catch (error) {
      toast.error(error.message || 'Failed to moderate post');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleResolveAppeal = async () => {
    if (!appealModal?.post) return;
    const { action, post } = appealModal;

    setIsProcessingAppeal(true);
    try {
      const res = await fetch(`/api/admin/posts/${post._id}/resolve-appeal`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${(localStorage.getItem('gymsync_admin_token') || localStorage.getItem('gymsync_token')) || ''}`
        },
        body: JSON.stringify({
          decision: action,
          replyReason: appealReplyReason.trim()
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);

      if (action === 'reinstate') {
        toast.success(`Post reinstated to community feed! Author notified.`);
      } else if (action === 'reject') {
        toast.warning(`Appeal rejected. 3-day countdown initiated.`);
      } else {
        toast.info(`Post permanently purged from database.`);
      }

      setAppealModal(null);
      setAppealReplyReason('');
      fetchAppeals();
      if (onRefresh) onRefresh();
    } catch (error) {
      toast.error(error.message || 'Failed to resolve appeal');
    } finally {
      setIsProcessingAppeal(false);
    }
  };

  const openAction = (type, post) => {
    setActionModal({ type, post });
    if (type === 'dismiss') {
      setModerationReason('Content complies with community standards.');
    } else {
      setModerationReason('');
    }
  };

  return (
    <div className="glass-panel" style={{ padding: '24px' }}>
      <div style={{ marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h3 style={{ margin: 0, fontSize: '1.25rem', color: 'var(--text-primary)' }}>Community Post Moderation &amp; Appeals Hub</h3>
          <p style={{ margin: '4px 0 0 0', color: 'var(--text-secondary)', fontSize: '0.88rem' }}>
            Review flagged community posts, manage 15-day hold periods, inspect author appeals, and enforce guidelines with 2-way feedback.
          </p>
        </div>

        {/* Tab Buttons */}
        <div style={{ display: 'flex', gap: '8px', background: 'rgba(0,0,0,0.2)', padding: '4px', borderRadius: '10px' }}>
          <button
            type="button"
            className={`btn btn-sm ${activeModerationTab === 'reports' ? 'btn-primary' : 'btn-outline'}`}
            onClick={() => setActiveModerationTab('reports')}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
          >
            <Flag size={14} /> Flagged Queue ({reportedPosts?.length || 0})
          </button>
          <button
            type="button"
            className={`btn btn-sm ${activeModerationTab === 'appeals' ? 'btn-primary' : 'btn-outline'}`}
            onClick={() => { setActiveModerationTab('appeals'); fetchAppeals(); }}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
          >
            <Clock size={14} /> Appeals &amp; Held Posts ({appeals?.length || 0})
          </button>
        </div>
      </div>

      {activeModerationTab === 'reports' ? (
        (!reportedPosts || reportedPosts.length === 0) ? (
          <div style={{ textAlign: 'center', padding: '48px 20px', color: 'var(--text-secondary)' }}>
            <ShieldAlert size={48} style={{ opacity: 0.3, marginBottom: '12px' }} />
            <p style={{ fontSize: '0.95rem' }}>No reported posts pending review. Community timeline is clean!</p>
          </div>
        ) : (
          <div className="table-responsive">
            <table className="admin-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.1)', textAlign: 'left' }}>
                  <th style={{ padding: '12px 14px' }}>Author</th>
                  <th style={{ padding: '12px 14px' }}>Content Snippet</th>
                  <th style={{ padding: '12px 14px' }}>Reports</th>
                  <th style={{ padding: '12px 14px' }}>Report Details</th>
                  <th style={{ padding: '12px 14px', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {reportedPosts.map(post => (
                  <tr key={post._id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                    <td style={{ padding: '14px' }}>
                      <strong>{post.authorName || 'Community Member'}</strong>
                      {post.createdAt && (
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                          {new Date(post.createdAt).toLocaleDateString()}
                        </div>
                      )}
                    </td>
                    <td style={{ padding: '14px', maxWidth: '280px' }}>
                      <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: '0.88rem' }}>
                        {post.content || 'Media post'}
                      </div>
                      {post.mediaUrl && (
                        <span style={{ fontSize: '0.75rem', color: '#38bdf8' }}>[Contains Media]</span>
                      )}
                    </td>
                    <td style={{ padding: '14px' }}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', background: 'rgba(239, 68, 68, 0.15)', color: '#f87171', border: '1px solid rgba(239, 68, 68, 0.3)', padding: '2px 8px', borderRadius: '12px', fontSize: '0.78rem', fontWeight: 600 }}>
                        <Flag size={12} /> {post.reportCount || (post.reportedBy?.length) || 1} Flag{(post.reportCount || 1) === 1 ? '' : 's'}
                      </span>
                    </td>
                    <td style={{ padding: '14px', fontSize: '0.82rem' }}>
                      {post.reportedBy && post.reportedBy.length > 0 ? (
                        <div>
                          <span style={{ color: '#fca5a5', fontWeight: 600 }}>{post.reportedBy[post.reportedBy.length - 1]?.reason || 'Flagged'}</span>
                          {post.reportedBy[post.reportedBy.length - 1]?.explanation && (
                            <span style={{ color: 'var(--text-secondary)', marginLeft: '4px' }}>
                              - {post.reportedBy[post.reportedBy.length - 1]?.explanation}
                            </span>
                          )}
                        </div>
                      ) : (
                        <span style={{ color: 'var(--text-secondary)' }}>Standard community flag</span>
                      )}
                    </td>
                    <td style={{ padding: '14px', textAlign: 'right' }}>
                      <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
                        <button
                          className="btn btn-outline btn-sm"
                          onClick={() => setSelectedPost(post)}
                          title="View Full Post &amp; Reports"
                        >
                          <Eye size={14} /> View
                        </button>
                        <button
                          className="btn btn-sm"
                          style={{ background: 'rgba(16, 185, 129, 0.2)', color: '#10b981', border: '1px solid rgba(16, 185, 129, 0.4)' }}
                          onClick={() => openAction('dismiss', post)}
                          title="Dismiss Reports"
                        >
                          <CheckCircle size={14} /> Dismiss
                        </button>
                        <button
                          className="btn btn-sm"
                          style={{ background: 'rgba(245, 158, 11, 0.2)', color: '#f59e0b', border: '1px solid rgba(245, 158, 11, 0.4)' }}
                          onClick={() => openAction('warn', post)}
                          title="Warn Post Author"
                        >
                          <AlertTriangle size={14} /> Warn
                        </button>
                        <button
                          className="btn btn-sm"
                          style={{ background: 'rgba(239, 68, 68, 0.2)', color: '#ef4444', border: '1px solid rgba(239, 68, 68, 0.4)' }}
                          onClick={() => openAction('delete', post)}
                          title="Soft-Remove (15-Day Hold)"
                        >
                          <Trash2 size={14} /> Remove
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      ) : (
        /* Appeals & Held Posts Tab */
        (!appeals || appeals.length === 0) ? (
          <div style={{ textAlign: 'center', padding: '48px 20px', color: 'var(--text-secondary)' }}>
            <Clock size={48} style={{ opacity: 0.3, marginBottom: '12px' }} />
            <p style={{ fontSize: '0.95rem' }}>No posts currently on moderation hold or pending appeals.</p>
          </div>
        ) : (
          <div className="table-responsive">
            <table className="admin-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.1)', textAlign: 'left' }}>
                  <th style={{ padding: '12px 14px' }}>Author</th>
                  <th style={{ padding: '12px 14px' }}>Content</th>
                  <th style={{ padding: '12px 14px' }}>Moderation Reason</th>
                  <th style={{ padding: '12px 14px' }}>Status &amp; Timeline</th>
                  <th style={{ padding: '12px 14px' }}>Author Appeal</th>
                  <th style={{ padding: '12px 14px', textAlign: 'right' }}>Appeal Decision</th>
                </tr>
              </thead>
              <tbody>
                {appeals.map(post => {
                  const daysLeft = post.appealDeadline ? Math.max(0, Math.ceil((new Date(post.appealDeadline) - new Date()) / (1000 * 60 * 60 * 24))) : 0;
                  const purgeDaysLeft = post.finalPurgeDeadline ? Math.max(0, Math.ceil((new Date(post.finalPurgeDeadline) - new Date()) / (1000 * 60 * 60 * 24))) : 0;

                  return (
                    <tr key={post._id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                      <td style={{ padding: '14px' }}>
                        <strong>{post.authorName || 'Member'}</strong>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                          {post.moderatedAt ? new Date(post.moderatedAt).toLocaleDateString() : 'Moderated'}
                        </div>
                      </td>
                      <td style={{ padding: '14px', maxWidth: '240px' }}>
                        <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: '0.88rem' }}>
                          {post.content || 'Media post'}
                        </div>
                        {post.mediaUrl && (
                          <span style={{ fontSize: '0.75rem', color: '#38bdf8' }}>[Contains Media]</span>
                        )}
                      </td>
                      <td style={{ padding: '14px', fontSize: '0.85rem', color: '#fca5a5' }}>
                        {post.moderationReason || 'Community Guidelines'}
                      </td>
                      <td style={{ padding: '14px' }}>
                        {post.moderationStatus === 'UnderReview' ? (
                          <span style={{ background: 'rgba(59, 130, 246, 0.15)', color: '#60a5fa', border: '1px solid rgba(59, 130, 246, 0.3)', padding: '3px 8px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                            <FileText size={12} /> Appeal Under Review
                          </span>
                        ) : post.moderationStatus === 'AppealRejected' ? (
                          <span style={{ background: 'rgba(239, 68, 68, 0.15)', color: '#ef4444', border: '1px solid rgba(239, 68, 68, 0.3)', padding: '3px 8px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                            <AlertCircle size={12} /> Rejected ({purgeDaysLeft}d to Purge)
                          </span>
                        ) : (
                          <span style={{ background: 'rgba(245, 158, 11, 0.15)', color: '#f59e0b', border: '1px solid rgba(245, 158, 11, 0.3)', padding: '3px 8px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                            <Clock size={12} /> Hold ({daysLeft}d left)
                          </span>
                        )}
                      </td>
                      <td style={{ padding: '14px', maxWidth: '240px', fontSize: '0.82rem' }}>
                        {post.isAppealSubmitted ? (
                          <div style={{ background: 'rgba(255,255,255,0.04)', padding: '6px 8px', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.08)' }}>
                            <div style={{ color: '#60a5fa', fontWeight: 600, marginBottom: '2px' }}>Author Statement:</div>
                            <div style={{ color: 'var(--text-primary)', fontStyle: 'italic', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              "{post.appealReason}"
                            </div>
                          </div>
                        ) : (
                          <span style={{ color: 'var(--text-secondary)', fontStyle: 'italic' }}>No appeal submitted yet</span>
                        )}
                      </td>
                      <td style={{ padding: '14px', textAlign: 'right' }}>
                        <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
                          <button
                            type="button"
                            className="btn btn-sm"
                            style={{ background: 'rgba(16, 185, 129, 0.2)', color: '#10b981', border: '1px solid rgba(16, 185, 129, 0.4)' }}
                            onClick={() => {
                              setAppealModal({ action: 'reinstate', post });
                              setAppealReplyReason('Content complies with community standards upon re-review.');
                            }}
                            title="Reinstate Post"
                          >
                            <RotateCcw size={14} /> Reinstate
                          </button>
                          {post.moderationStatus !== 'AppealRejected' && (
                            <button
                              type="button"
                              className="btn btn-sm"
                              style={{ background: 'rgba(245, 158, 11, 0.2)', color: '#f59e0b', border: '1px solid rgba(245, 158, 11, 0.4)' }}
                              onClick={() => {
                                setAppealModal({ action: 'reject', post });
                                setAppealReplyReason('Appeal rejected following administrative review. Content violates guidelines.');
                              }}
                              title="Reject Appeal (3-Day Final Notice)"
                            >
                              Reject
                            </button>
                          )}
                          <button
                            type="button"
                            className="btn btn-sm"
                            style={{ background: 'rgba(239, 68, 68, 0.2)', color: '#ef4444', border: '1px solid rgba(239, 68, 68, 0.4)' }}
                            onClick={() => {
                              setAppealModal({ action: 'purge', post });
                              setAppealReplyReason('Permanently purged from platform.');
                            }}
                            title="Purge Now"
                          >
                            <Trash2 size={14} /> Purge
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )
      )}

      {/* VIEW POST DETAILS MODAL */}
      {selectedPost && (
        <div className="modal-overlay" style={{ zIndex: 1100, display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={() => setSelectedPost(null)}>
          <div 
            className="modal-content glass-panel" 
            style={{ 
              maxWidth: '600px', 
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
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '12px', marginBottom: '16px' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.2rem', color: 'var(--text-primary, #fff)' }}>
                  Reported Post by {selectedPost.authorName}
                </h3>
                <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                  Post ID: {selectedPost._id}
                </span>
              </div>
              <button 
                onClick={() => setSelectedPost(null)}
                className="btn btn-icon"
                style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Post Content Box */}
            <div style={{ background: 'rgba(255,255,255,0.03)', padding: '14px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.06)', marginBottom: '16px' }}>
              <p style={{ margin: 0, fontSize: '0.92rem', whiteSpace: 'pre-wrap', lineHeight: 1.5, color: 'var(--text-primary)' }}>
                {selectedPost.content}
              </p>
            </div>

            {/* Media Attachment */}
            {selectedPost.mediaUrl && (
              <div style={{ marginBottom: '16px', maxHeight: '280px', overflow: 'hidden', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.1)' }}>
                <img 
                  src={selectedPost.mediaUrl} 
                  alt="Reported Post Media" 
                  style={{ width: '100%', height: 'auto', maxHeight: '280px', objectFit: 'contain' }} 
                />
              </div>
            )}

            {/* Reporter Logs */}
            <div style={{ marginBottom: '20px' }}>
              <h4 style={{ margin: '0 0 8px 0', fontSize: '0.85rem', color: '#f87171' }}>
                Report Log Entries ({selectedPost.reportedBy?.length || 0}):
              </h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {(selectedPost.reportedBy || []).map((rep, idx) => (
                  <div key={idx} style={{ background: 'rgba(239, 68, 68, 0.06)', border: '1px solid rgba(239, 68, 68, 0.15)', padding: '8px 10px', borderRadius: '6px', fontSize: '0.8rem' }}>
                    <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{rep.userName || 'Member'}:</span> {rep.reason || 'Flagged'}
                    {rep.explanation && <span style={{ color: 'var(--text-secondary)', marginLeft: '6px' }}>({rep.explanation})</span>}
                  </div>
                ))}
              </div>
            </div>

            {/* Quick Actions from View */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '16px' }}>
              <button 
                className="btn btn-outline btn-sm"
                onClick={() => {
                  const p = selectedPost;
                  setSelectedPost(null);
                  openAction('dismiss', p);
                }}
              >
                Dismiss Reports
              </button>
              <button 
                className="btn btn-sm"
                style={{ background: '#d97706', color: '#fff', border: 'none' }}
                onClick={() => {
                  const p = selectedPost;
                  setSelectedPost(null);
                  openAction('warn', p);
                }}
              >
                Warn Author
              </button>
              <button 
                className="btn btn-sm"
                style={{ background: '#dc2626', color: '#fff', border: 'none' }}
                onClick={() => {
                  const p = selectedPost;
                  setSelectedPost(null);
                  openAction('delete', p);
                }}
              >
                Remove Post
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ACTION MODAL (REMOVE / WARN / DISMISS) WITH REASON AND NOTIFICATIONS */}
      {actionModal && (
        <div className="modal-overlay" style={{ zIndex: 1150, display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={() => setActionModal(null)}>
          <div 
            className="modal-content glass-panel" 
            style={{ 
              maxWidth: '520px', 
              width: '92%', 
              borderRadius: '16px', 
              padding: '24px',
              background: 'var(--card-bg, #111827)',
              border: `1px solid ${actionModal.type === 'delete' ? 'rgba(239, 68, 68, 0.4)' : actionModal.type === 'warn' ? 'rgba(245, 158, 11, 0.4)' : 'rgba(16, 185, 129, 0.4)'}`,
              boxShadow: '0 25px 50px rgba(0,0,0,0.6)'
            }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
              <div style={{ 
                background: actionModal.type === 'delete' ? 'rgba(239, 68, 68, 0.15)' : actionModal.type === 'warn' ? 'rgba(245, 158, 11, 0.15)' : 'rgba(16, 185, 129, 0.15)', 
                padding: '8px', 
                borderRadius: '10px', 
                color: actionModal.type === 'delete' ? '#ef4444' : actionModal.type === 'warn' ? '#f59e0b' : '#10b981' 
              }}>
                {actionModal.type === 'delete' ? <Trash2 size={24} /> : actionModal.type === 'warn' ? <AlertTriangle size={24} /> : <CheckCircle size={24} />}
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.15rem', color: 'var(--text-primary)' }}>
                  {actionModal.type === 'delete' && 'Remove Community Post'}
                  {actionModal.type === 'warn' && 'Issue Official Warning to Author'}
                  {actionModal.type === 'dismiss' && 'Dismiss Report Flags'}
                </h3>
                <p style={{ margin: '2px 0 0 0', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                  Author: {actionModal.post.authorName} • Post #{actionModal.post._id.slice(-6)}
                </p>
              </div>
            </div>

            {/* Presets for delete / warn */}
            {actionModal.type !== 'dismiss' && (
              <div style={{ marginBottom: '12px' }}>
                <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>
                  Select Guideline Violation Preset:
                </span>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                  {VIOLATION_PRESETS.map((preset, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setModerationReason(preset)}
                      style={{
                        background: moderationReason === preset ? 'rgba(239, 68, 68, 0.25)' : 'rgba(255,255,255,0.05)',
                        border: '1px solid rgba(255,255,255,0.1)',
                        color: moderationReason === preset ? '#fca5a5' : 'var(--text-secondary)',
                        padding: '4px 8px',
                        borderRadius: '6px',
                        fontSize: '0.74rem',
                        cursor: 'pointer',
                        textAlign: 'left'
                      }}
                    >
                      {preset}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '6px' }}>
                {actionModal.type === 'delete' ? 'Removal Reason (Sent to Author & Reporters) *' : actionModal.type === 'warn' ? 'Warning Note to Author *' : 'Dismissal Resolution Note'}
              </label>
              <textarea
                rows={3}
                required={actionModal.type !== 'dismiss'}
                value={moderationReason}
                onChange={e => setModerationReason(e.target.value)}
                placeholder={actionModal.type === 'delete' ? 'State the policy violation and why this post was removed...' : actionModal.type === 'warn' ? 'Advise author on maintaining community standards...' : 'Optional explanation for reporters...'}
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
                onClick={() => setActionModal(null)}
                disabled={isProcessing}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn"
                style={{ 
                  background: actionModal.type === 'delete' ? '#dc2626' : actionModal.type === 'warn' ? '#d97706' : '#059669', 
                  color: '#fff', 
                  border: 'none', 
                  padding: '8px 16px', 
                  borderRadius: '8px', 
                  fontWeight: 600 
                }}
                disabled={isProcessing || (actionModal.type !== 'dismiss' && !moderationReason.trim())}
                onClick={handleModerate}
              >
                {isProcessing ? 'Processing...' : (
                  actionModal.type === 'delete' ? 'Confirm Removal' :
                  actionModal.type === 'warn' ? 'Send Warning' : 'Confirm Dismissal'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* APPEAL RESOLUTION MODAL (REINSTATE / REJECT / PURGE) */}
      {appealModal && (
        <div className="modal-overlay" style={{ zIndex: 1150, display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={() => setAppealModal(null)}>
          <div 
            className="modal-content glass-panel" 
            style={{ 
              maxWidth: '520px', 
              width: '92%', 
              borderRadius: '16px', 
              padding: '24px',
              background: 'var(--card-bg, #111827)',
              border: `1px solid ${appealModal.action === 'reinstate' ? 'rgba(16, 185, 129, 0.4)' : appealModal.action === 'reject' ? 'rgba(245, 158, 11, 0.4)' : 'rgba(239, 68, 68, 0.4)'}`,
              boxShadow: '0 25px 50px rgba(0,0,0,0.6)'
            }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
              <div style={{ 
                background: appealModal.action === 'reinstate' ? 'rgba(16, 185, 129, 0.15)' : appealModal.action === 'reject' ? 'rgba(245, 158, 11, 0.15)' : 'rgba(239, 68, 68, 0.15)', 
                padding: '8px', 
                borderRadius: '10px', 
                color: appealModal.action === 'reinstate' ? '#10b981' : appealModal.action === 'reject' ? '#f59e0b' : '#ef4444' 
              }}>
                {appealModal.action === 'reinstate' ? <RotateCcw size={24} /> : appealModal.action === 'reject' ? <AlertCircle size={24} /> : <Trash2 size={24} />}
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.15rem', color: 'var(--text-primary)' }}>
                  {appealModal.action === 'reinstate' && 'Reinstate Moderated Post'}
                  {appealModal.action === 'reject' && 'Reject Appeal (3-Day Final Notice)'}
                  {appealModal.action === 'purge' && 'Permanently Purge Post'}
                </h3>
                <p style={{ margin: '2px 0 0 0', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                  Author: {appealModal.post.authorName} • Post #{appealModal.post._id.slice(-6)}
                </p>
              </div>
            </div>

            {appealModal.post.appealReason && (
              <div style={{ background: 'rgba(59, 130, 246, 0.08)', border: '1px solid rgba(59, 130, 246, 0.25)', padding: '10px 12px', borderRadius: '8px', marginBottom: '14px' }}>
                <div style={{ fontSize: '0.78rem', color: '#60a5fa', fontWeight: 600 }}>Author's Submitted Appeal Statement:</div>
                <div style={{ fontSize: '0.86rem', color: '#fff', marginTop: '4px', fontStyle: 'italic' }}>
                  "{appealModal.post.appealReason}"
                </div>
              </div>
            )}

            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '6px' }}>
                {appealModal.action === 'reinstate' ? 'Reinstatement Memo / Feedback to Author' : appealModal.action === 'reject' ? 'Rejection Reason (Sent to Author with 3-Day Notice) *' : 'Purge Confirmation Note'}
              </label>
              <textarea
                rows={3}
                required={appealModal.action === 'reject'}
                value={appealReplyReason}
                onChange={e => setAppealReplyReason(e.target.value)}
                placeholder={appealModal.action === 'reinstate' ? 'Message confirming reinstatement to author...' : appealModal.action === 'reject' ? 'State why the appeal is denied...' : 'Optional admin audit log note...'}
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
                onClick={() => setAppealModal(null)}
                disabled={isProcessingAppeal}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn"
                style={{ 
                  background: appealModal.action === 'reinstate' ? '#059669' : appealModal.action === 'reject' ? '#d97706' : '#dc2626', 
                  color: '#fff', 
                  border: 'none', 
                  padding: '8px 16px', 
                  borderRadius: '8px', 
                  fontWeight: 600 
                }}
                disabled={isProcessingAppeal || (appealModal.action === 'reject' && !appealReplyReason.trim())}
                onClick={handleResolveAppeal}
              >
                {isProcessingAppeal ? 'Processing...' : (
                  appealModal.action === 'reinstate' ? 'Confirm Reinstate' :
                  appealModal.action === 'reject' ? 'Issue 3-Day Final Notice' : 'Confirm Purge'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ModerationManagement;
