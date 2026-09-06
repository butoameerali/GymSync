import React, { useState } from 'react';
import { Eye, Trash2, CheckCircle, ShieldAlert, AlertTriangle } from 'lucide-react';
import { toast } from 'react-toastify';
import Modal from '../common/Modal';
import ConfirmDialog from '../common/ConfirmDialog';

const ModerationManagement = ({ reportedPosts, onRefresh }) => {
  const [selectedPost, setSelectedPost] = useState(null);
  const [deletingPost, setDeletingPost] = useState(null);
  const [removalReason, setRemovalReason] = useState('Inappropriate Content');
  const [isProcessing, setIsProcessing] = useState(false);

  const handleModeratePost = async (postId, action, reason = '') => {
    setIsProcessing(true);
    try {
      const res = await fetch(`/api/admin/posts/${postId}/moderate`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('gymsync_token') || ''}`
        },
        body: JSON.stringify({ action, reason })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      toast.success(action === 'delete' ? 'Post removed by moderator' : 'Report dismissed');
      setDeletingPost(null);
      setSelectedPost(null);
      if (onRefresh) onRefresh();
    } catch (error) {
      toast.error(error.message || 'Failed to moderate post');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="glass-panel" style={{ padding: '24px' }}>
      <div style={{ marginBottom: '24px' }}>
        <h3 style={{ margin: 0 }}>Community Post Moderation Queue</h3>
        <p style={{ margin: '4px 0 0 0', color: 'var(--text-secondary)' }}>
          Review content reported by community members for violation of safety, harassment, or advertising rules.
        </p>
      </div>

      {(!reportedPosts || reportedPosts.length === 0) ? (
        <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary)' }}>
          <ShieldAlert size={48} style={{ opacity: 0.3, marginBottom: '12px' }} />
          <p>No reported posts pending review.</p>
        </div>
      ) : (
        <div className="table-responsive">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Author</th>
                <th>Content Snippet</th>
                <th>Report Count</th>
                <th>Report Details</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {reportedPosts.map(post => (
                <tr key={post._id}>
                  <td><strong>{post.authorName}</strong></td>
                  <td style={{ maxWidth: '280px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {post.content}
                  </td>
                  <td>
                    <span className="status-pill pending">
                      {post.reportCount || 1} Report{(post.reportCount || 1) === 1 ? '' : 's'}
                    </span>
                  </td>
                  <td>
                    {(post.reportedBy || []).slice(0, 2).map((r, idx) => (
                      <div key={idx} style={{ marginBottom: '4px', fontSize: '0.82rem' }}>
                        <strong>{r.userName || 'Member'}:</strong> {r.reason ? `${r.reason} - ${r.explanation}` : 'Reported'}
                      </div>
                    ))}
                    {(!post.reportedBy || post.reportedBy.length === 0) && (
                      <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>Community Flag</span>
                    )}
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                      <button 
                        className="btn btn-sm btn-outline" 
                        onClick={() => setSelectedPost(post)}
                      >
                        <Eye size={14} /> View
                      </button>
                      <button 
                        className="btn btn-sm btn-outline"
                        onClick={() => handleModeratePost(post._id, 'dismiss')}
                        disabled={isProcessing}
                      >
                        Dismiss
                      </button>
                      <button 
                        className="btn btn-sm" 
                        style={{ background: '#ef4444', color: '#fff' }} 
                        onClick={() => setDeletingPost(post)}
                        disabled={isProcessing}
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
      )}

      {/* View Post Modal */}
      {selectedPost && (
        <Modal isOpen={Boolean(selectedPost)} onClose={() => setSelectedPost(null)} title="Inspect Reported Post">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Author:</span>
              <h4 style={{ margin: '4px 0 0 0' }}>{selectedPost.authorName}</h4>
            </div>

            <div style={{ background: 'rgba(0,0,0,0.2)', padding: '14px', borderRadius: '10px' }}>
              <p style={{ margin: 0, whiteSpace: 'pre-wrap', lineHeight: 1.5 }}>
                {selectedPost.content}
              </p>
            </div>

            {selectedPost.mediaUrl && (
              <div style={{ maxHeight: '300px', overflow: 'hidden', borderRadius: '8px' }}>
                <img 
                  src={selectedPost.mediaUrl} 
                  alt="Post Attachment" 
                  style={{ width: '100%', height: 'auto', objectFit: 'contain' }} 
                />
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
              <button className="btn btn-outline" onClick={() => setSelectedPost(null)}>
                Close
              </button>
              <button 
                className="btn btn-primary" 
                style={{ background: '#ef4444', borderColor: '#ef4444' }}
                onClick={() => {
                  setDeletingPost(selectedPost);
                }}
              >
                Remove Post
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={Boolean(deletingPost)}
        onClose={() => setDeletingPost(null)}
        onConfirm={() => handleModeratePost(deletingPost?._id, 'delete', removalReason)}
        title={`Remove Post by ${deletingPost?.authorName}`}
        message={`Are you sure you want to remove this post? It will be deleted from the community timeline and a moderation strike will be noted.`}
        confirmText="Remove Post"
        isDanger={true}
        loading={isProcessing}
      />
    </div>
  );
};

export default ModerationManagement;
