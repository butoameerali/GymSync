import React from 'react';
import EmptyState from '../common/EmptyState';

const DataTable = ({ columns = [], data = [], keyField = '_id', emptyTitle = 'No Records Found', emptyMessage = 'There are no records matching this criteria.' }) => {
  if (!Array.isArray(data) || data.length === 0) {
    return <EmptyState title={emptyTitle} message={emptyMessage} />;
  }

  return (
    <div style={{ width: '100%', overflowX: 'auto', borderRadius: '8px', border: '1px solid var(--card-border)' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.9rem' }}>
        <thead>
          <tr style={{ background: 'rgba(255, 255, 255, 0.03)', borderBottom: '1px solid var(--card-border)' }}>
            {columns.map((col, idx) => (
              <th key={col.key || idx} style={{ padding: '12px 16px', fontWeight: 600, color: 'var(--text-secondary)' }}>
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row, rIdx) => (
            <tr key={row[keyField] || rIdx} style={{ borderBottom: '1px solid var(--card-border)' }}>
              {columns.map((col, cIdx) => (
                <td key={col.key || cIdx} style={{ padding: '12px 16px', color: 'var(--text-primary)' }}>
                  {col.render ? col.render(row[col.key], row, rIdx) : row[col.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default DataTable;
