import React, { useState } from 'react';
import { FileText, Search, ShieldCheck } from 'lucide-react';

const AuditLogManagement = ({ auditLogs }) => {
  const [search, setSearch] = useState('');

  const filteredLogs = (auditLogs || []).filter(log => {
    const q = search.toLowerCase();
    return (log.user || '').toLowerCase().includes(q) ||
           (log.action || '').toLowerCase().includes(q) ||
           (log.targetEntity || '').toLowerCase().includes(q) ||
           (log.details || '').toLowerCase().includes(q);
  });

  return (
    <div className="glass-panel" style={{ padding: '24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '15px' }}>
        <div>
          <h3 style={{ margin: 0 }}>Senior SuperAdmin Security Audit Trail</h3>
          <p style={{ margin: '4px 0 0 0', color: 'var(--text-secondary)' }}>
            Immutable log of administrative, financial, and security events performed across GymSync.
          </p>
        </div>
        <div className="search-bar" style={{ minWidth: '240px' }}>
          <Search size={16} color="var(--text-secondary)" />
          <input 
            type="text" 
            placeholder="Search audit trail..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
      </div>

      {filteredLogs.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary)' }}>
          <ShieldCheck size={48} style={{ opacity: 0.3, marginBottom: '12px' }} />
          <p>No audit trail records found.</p>
        </div>
      ) : (
        <div className="table-responsive">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Timestamp</th>
                <th>Actor & Role</th>
                <th>Action</th>
                <th>Target Entity</th>
                <th>Audit Details</th>
              </tr>
            </thead>
            <tbody>
              {filteredLogs.map(log => (
                <tr key={log._id}>
                  <td style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>
                    {new Date(log.timestamp).toLocaleString()}
                  </td>
                  <td>
                    <strong>{log.user}</strong>
                    <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', display: 'block' }}>
                      {log.role}
                    </span>
                  </td>
                  <td>
                    <span className="category-badge" style={{ background: 'rgba(59,130,246,0.15)', color: '#3b82f6' }}>
                      {log.action}
                    </span>
                  </td>
                  <td><strong>{log.targetEntity}</strong></td>
                  <td style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', maxWidth: '300px' }}>
                    {log.details}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default AuditLogManagement;
