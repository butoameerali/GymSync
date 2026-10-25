import React, { useState, useEffect, useCallback } from 'react';
import { useAdminAuth } from '../../context/AdminAuthContext';
import {
  Building,
  Search,
  Filter,
  CheckCircle,
  AlertTriangle,
  XCircle,
  Clock,
  Eye,
  RefreshCw,
  Ban,
  FileCheck,
  List
} from 'lucide-react';
import GymVerificationDetailModal from './GymVerificationDetailModal';
import GymManagement from '../../components/admin/GymManagement';
import { toast } from 'react-toastify';

const GymVerificationQueue = () => {
  const { authHeaders } = useAdminAuth();
  const [activeTab, setActiveTab] = useState('applications'); // 'applications' | 'legacy'
  const [applications, setApplications] = useState([]);
  const [pendingGyms, setPendingGyms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('All');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedApp, setSelectedApp] = useState(null);

  const fetchQueue = useCallback(async () => {
    setLoading(true);
    try {
      const url = `/api/gym-verification/admin/queue${statusFilter !== 'All' ? `?status=${encodeURIComponent(statusFilter)}` : ''}`;
      const res = await fetch(url, { headers: authHeaders() });
      if (!res.ok) throw new Error('Failed to fetch verification queue');
      const data = await res.json();
      setApplications(data || []);
    } catch (err) {
      toast.error(err.message || 'Error loading verification queue');
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  const fetchPendingGyms = async () => {
    try {
      const res = await fetch('/api/admin/gyms/pending', { headers: authHeaders() });
      if (res.ok) {
        const data = await res.json();
        setPendingGyms(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      console.error('Failed to fetch pending gyms:', err);
    }
  };

  useEffect(() => {
    fetchQueue();
    fetchPendingGyms();
  }, [fetchQueue]);

  const handleOpenDetail = async (appId) => {
    try {
      const res = await fetch(`/api/gym-verification/admin/application/${appId}`, {
        headers: authHeaders()
      });
      if (!res.ok) throw new Error('Failed to load application details');
      const data = await res.json();
      setSelectedApp(data);
    } catch (err) {
      toast.error(err.message || 'Error loading application detail');
    }
  };

  const filtered = applications.filter(app => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      app.referenceId?.toLowerCase().includes(term) ||
      app.branch?.name?.toLowerCase().includes(term) ||
      app.branch?.city?.toLowerCase().includes(term) ||
      app.organizationName?.toLowerCase().includes(term) ||
      app.applicant?.name?.toLowerCase().includes(term)
    );
  });

  const getStatusBadge = (status) => {
    switch (status) {
      case 'Approved':
        return <span className="status-badge approved"><CheckCircle size={12} /> Approved</span>;
      case 'Pending Review':
      case 'Pending':
        return <span className="status-badge pending"><Clock size={12} /> Pending Review</span>;
      case 'More Information Required':
        return <span className="status-badge info-required"><AlertTriangle size={12} /> More Info Needed</span>;
      case 'Rejected':
        return <span className="status-badge rejected"><XCircle size={12} /> Rejected</span>;
      case 'Suspended':
        return <span className="status-badge rejected"><Ban size={12} /> Suspended</span>;
      default:
        return <span className="status-badge" style={{ background: '#374151', color: '#9ca3af' }}>{status}</span>;
    }
  };

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#fff', margin: '0 0 6px 0' }}>
            Gym & Multi-Branch Verification Center
          </h1>
          <p style={{ color: '#9ca3af', fontSize: '0.88rem', margin: 0 }}>
            Review premise evidence, inspect encrypted legal documents, and approve gym listings across the platform.
          </p>
        </div>
        <button
          onClick={() => { fetchQueue(); fetchPendingGyms(); }}
          className="btn-admin btn-admin-secondary"
          title="Refresh queue"
        >
          <RefreshCw size={15} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Subtab Switcher */}
      <div style={{ display: 'flex', gap: '10px', marginBottom: '24px', borderBottom: '1px solid #374151', paddingBottom: '12px' }}>
        <button
          onClick={() => setActiveTab('applications')}
          style={{
            padding: '8px 18px',
            borderRadius: '8px',
            border: 'none',
            fontWeight: 700,
            fontSize: '0.9rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            background: activeTab === 'applications' ? '#3b82f6' : '#1f2937',
            color: activeTab === 'applications' ? '#fff' : '#9ca3af',
            transition: 'all 0.2s ease'
          }}
        >
          <FileCheck size={17} />
          <span>Multi-Branch Verification Applications ({applications.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('legacy')}
          style={{
            padding: '8px 18px',
            borderRadius: '8px',
            border: 'none',
            fontWeight: 700,
            fontSize: '0.9rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            background: activeTab === 'legacy' ? '#3b82f6' : '#1f2937',
            color: activeTab === 'legacy' ? '#fff' : '#9ca3af',
            transition: 'all 0.2s ease'
          }}
        >
          <List size={17} />
          <span>Pending Facility Approvals ({pendingGyms.length})</span>
        </button>
      </div>

      {/* TAB 1: MULTI-BRANCH VERIFICATION QUEUE */}
      {activeTab === 'applications' && (
        <div>
          {/* Stats row */}
          <div className="admin-stat-grid" style={{ marginBottom: '24px' }}>
            <div className="admin-stat-card">
              <div className="stat-icon-wrapper" style={{ background: 'rgba(245, 158, 11, 0.15)', color: '#fbbf24' }}>
                <Clock size={24} />
              </div>
              <div>
                <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#fbbf24' }}>
                  {applications.filter(a => a.status === 'Pending Review' || a.status === 'Under Review').length}
                </div>
                <div style={{ fontSize: '0.8rem', color: '#9ca3af' }}>Pending Review</div>
              </div>
            </div>

            <div className="admin-stat-card">
              <div className="stat-icon-wrapper" style={{ background: 'rgba(16, 185, 129, 0.15)', color: '#34d399' }}>
                <CheckCircle size={24} />
              </div>
              <div>
                <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#34d399' }}>
                  {applications.filter(a => a.status === 'Approved').length}
                </div>
                <div style={{ fontSize: '0.8rem', color: '#9ca3af' }}>Approved Branches</div>
              </div>
            </div>

            <div className="admin-stat-card">
              <div className="stat-icon-wrapper" style={{ background: 'rgba(239, 68, 68, 0.15)', color: '#f87171' }}>
                <AlertTriangle size={24} />
              </div>
              <div>
                <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#f87171' }}>
                  {applications.filter(a => a.status === 'More Information Required' || a.status === 'Rejected').length}
                </div>
                <div style={{ fontSize: '0.8rem', color: '#9ca3af' }}>Action Needed / Rejected</div>
              </div>
            </div>
          </div>

          {/* Filters & Search */}
          <div className="admin-card" style={{ padding: '16px', marginBottom: '20px' }}>
            <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', alignItems: 'center' }}>
              <div style={{ flex: '1', minWidth: '240px', position: 'relative' }}>
                <Search size={18} style={{ position: 'absolute', left: '12px', top: '10px', color: '#6b7280' }} />
                <input
                  type="text"
                  placeholder="Search by Reference ID, Gym Name, City, or Applicant..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 12px 8px 38px',
                    background: '#1f2937',
                    border: '1px solid #374151',
                    borderRadius: '8px',
                    color: '#fff',
                    fontSize: '0.88rem'
                  }}
                />
              </div>

              <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '0.85rem', color: '#9ca3af' }}>Status:</span>
                {['All', 'Pending Review', 'Under Review', 'More Information Required', 'Approved', 'Rejected'].map(s => (
                  <button
                    key={s}
                    onClick={() => setStatusFilter(s)}
                    style={{
                      padding: '4px 12px',
                      borderRadius: '6px',
                      fontSize: '0.8rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                      border: 'none',
                      background: statusFilter === s ? '#3b82f6' : '#1f2937',
                      color: statusFilter === s ? '#fff' : '#9ca3af',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Table */}
          <div className="admin-table-container">
            {loading ? (
              <div style={{ padding: '40px', textAlign: 'center', color: '#9ca3af' }}>
                Loading verification queue...
              </div>
            ) : filtered.length === 0 ? (
              <div style={{ padding: '40px', textAlign: 'center', color: '#9ca3af' }}>
                No verification applications found matching your criteria.
              </div>
            ) : (
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Ref ID</th>
                    <th>Branch / Gym</th>
                    <th>Location</th>
                    <th>Applicant</th>
                    <th>Organization</th>
                    <th>Evidence Docs</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(app => (
                    <tr key={app._id}>
                      <td style={{ fontFamily: 'monospace', fontWeight: 700, color: '#60a5fa' }}>
                        {app.referenceId}
                      </td>
                      <td>
                        <div style={{ fontWeight: 600, color: '#fff' }}>{app.branch?.name}</div>
                        <div style={{ fontSize: '0.75rem', color: '#9ca3af' }}>{app.branch?.gymType}</div>
                      </td>
                      <td>
                        <div>{app.branch?.city || 'N/A'}</div>
                        <div style={{ fontSize: '0.75rem', color: '#9ca3af' }}>{app.branch?.address || ''}</div>
                      </td>
                      <td>
                        <div>{app.applicant?.name || 'N/A'}</div>
                        <div style={{ fontSize: '0.75rem', color: '#9ca3af' }}>{app.applicant?.relationship || 'Owner'}</div>
                      </td>
                      <td>{app.organizationName}</td>
                      <td>
                        <span style={{
                          padding: '2px 8px',
                          borderRadius: '6px',
                          background: '#1f2937',
                          fontSize: '0.8rem',
                          fontWeight: 600
                        }}>
                          {app.documentsCount} files
                        </span>
                      </td>
                      <td>{getStatusBadge(app.status)}</td>
                      <td>
                        <button
                          onClick={() => handleOpenDetail(app._id)}
                          className="btn-admin btn-admin-primary"
                          style={{ padding: '6px 12px', fontSize: '0.78rem' }}
                        >
                          <Eye size={14} /> Review
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: GENERAL FACILITY APPROVALS */}
      {activeTab === 'legacy' && (
        <div>
          <GymManagement pendingGyms={pendingGyms} onRefresh={fetchPendingGyms} />
        </div>
      )}

      {/* Review Modal */}
      {selectedApp && (
        <GymVerificationDetailModal
          application={selectedApp}
          onClose={() => setSelectedApp(null)}
          onRefresh={fetchQueue}
        />
      )}
    </div>
  );
};

export default GymVerificationQueue;
