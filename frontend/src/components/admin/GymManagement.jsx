import React, { useState } from 'react';
import { CheckCircle, XCircle, Building, MapPin, DollarSign, Mail } from 'lucide-react';
import { toast } from 'react-toastify';
import ConfirmDialog from '../common/ConfirmDialog';

const GymManagement = ({ pendingGyms, onRefresh }) => {
  const [rejectingGym, setRejectingGym] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleGymApproval = async (gymId, status) => {
    setIsProcessing(true);
    try {
      const res = await fetch(`/api/admin/gyms/${gymId}/approval`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('gymsync_token') || ''}`
        },
        body: JSON.stringify({ status })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      toast.success(`Gym registration ${status.toLowerCase()} successfully`);
      setRejectingGym(null);
      if (onRefresh) onRefresh();
    } catch (error) {
      toast.error(error.message || 'Failed to update gym status');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="glass-panel" style={{ padding: '24px' }}>
      <div style={{ marginBottom: '24px' }}>
        <h3 style={{ margin: 0 }}>Pending Gym Owner Applications & Facilities</h3>
        <p style={{ margin: '4px 0 0 0', color: 'var(--text-secondary)' }}>
          Review facility registration applications before approving them to host trainees and manage trainers on GymSync.
        </p>
      </div>

      {(!pendingGyms || pendingGyms.length === 0) ? (
        <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary)' }}>
          <Building size={48} style={{ opacity: 0.3, marginBottom: '12px' }} />
          <p>No pending gym applications at this time.</p>
        </div>
      ) : (
        <div className="table-responsive">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Facility Name</th>
                <th>Location</th>
                <th>Owner Details</th>
                <th>Monthly Rate</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {pendingGyms.map(gym => (
                <tr key={gym._id}>
                  <td><strong>{gym.name}</strong></td>
                  <td>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <MapPin size={14} color="var(--text-secondary)" /> {gym.location}
                    </span>
                  </td>
                  <td>
                    <div><strong>{gym.ownerName}</strong></div>
                    <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>{gym.ownerEmail || 'owner@gymsync.com'}</div>
                  </td>
                  <td>
                    <strong>${gym.monthlyFee}</strong>/mo
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button 
                        className="btn btn-sm btn-primary" 
                        disabled={isProcessing}
                        onClick={() => handleGymApproval(gym._id, 'Approved')}
                      >
                        <CheckCircle size={14} /> Approve
                      </button>
                      <button 
                        className="btn btn-sm btn-outline" 
                        disabled={isProcessing}
                        style={{ borderColor: '#ef4444', color: '#ef4444' }} 
                        onClick={() => setRejectingGym(gym)}
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

      {/* Reject Confirmation Dialog */}
      <ConfirmDialog
        isOpen={Boolean(rejectingGym)}
        onClose={() => setRejectingGym(null)}
        onConfirm={() => handleGymApproval(rejectingGym?._id, 'Rejected')}
        title={`Reject Gym Application: ${rejectingGym?.name}`}
        message={`Are you sure you want to reject the facility application for "${rejectingGym?.name}"?`}
        confirmText="Reject Application"
        isDanger={true}
        loading={isProcessing}
      />
    </div>
  );
};

export default GymManagement;
