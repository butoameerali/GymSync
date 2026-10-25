import React, { useState, useEffect } from 'react';
import { useAdminAuth } from '../../context/AdminAuthContext';
import { FileText, RefreshCw, Shield } from 'lucide-react';

const AuditLogsPage = () => {
  const { authHeaders } = useAdminAuth();
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/audit-logs', { headers: authHeaders() });
      if (res.ok) {
        const data = await res.json();
        setLogs(data || []);
      }
    } catch (e) {
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#fff', margin: '0 0 6px 0' }}>
            Senior Administrative Audit Trail
          </h1>
          <p style={{ color: '#9ca3af', fontSize: '0.88rem', margin: 0 }}>
            Immutable administrative action logging and verification audit records.
          </p>
        </div>
        <button onClick={fetchLogs} className="btn-admin btn-admin-secondary">
          <RefreshCw size={15} /> Refresh
        </button>
      </div>

      <div className="admin-table-container">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Timestamp</th>
              <th>Actor</th>
              <th>Role</th>
              <th>Action</th>
              <th>Target Entity</th>
              <th>Details</th>
              <th>IP Address</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={7} style={{ textAlign: 'center', padding: '30px', color: '#9ca3af' }}>Loading audit logs...</td>
              </tr>
            ) : logs.length === 0 ? (
              <tr>
                <td colSpan={7} style={{ textAlign: 'center', padding: '30px', color: '#9ca3af' }}>No audit logs recorded.</td>
              </tr>
            ) : logs.map(l => (
              <tr key={l._id}>
                <td style={{ fontSize: '0.78rem', color: '#9ca3af', whiteSpace: 'nowrap' }}>
                  {new Date(l.timestamp || l.createdAt).toLocaleString()}
                </td>
                <td style={{ fontWeight: 600, color: '#fff' }}>{l.user}</td>
                <td>
                  <span className="admin-badge">{l.role}</span>
                </td>
                <td style={{ color: '#60a5fa', fontWeight: 600 }}>{l.action}</td>
                <td style={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>{l.targetEntity || 'N/A'}</td>
                <td style={{ maxWidth: '300px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {l.details || ''}
                </td>
                <td style={{ fontFamily: 'monospace', fontSize: '0.78rem', color: '#9ca3af' }}>{l.ipAddress}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default AuditLogsPage;
