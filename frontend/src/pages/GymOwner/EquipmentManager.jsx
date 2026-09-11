import React, { useState, useEffect } from 'react';
import { Dumbbell, Plus, Save, Trash } from 'lucide-react';
import { toast } from 'react-toastify';

export default function EquipmentManager({ gymData }) {
  const [equipmentList, setEquipmentList] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (gymData && gymData.equipmentStatus) {
      setEquipmentList(gymData.equipmentStatus);
    }
  }, [gymData]);

  const handleAdd = () => {
    setEquipmentList([...equipmentList, { name: '', status: 'Available', quantity: 1, notes: '' }]);
  };

  const handleRemove = (index) => {
    const newList = [...equipmentList];
    newList.splice(index, 1);
    setEquipmentList(newList);
  };

  const handleChange = (index, field, value) => {
    const newList = [...equipmentList];
    newList[index][field] = value;
    setEquipmentList(newList);
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('gymsync_token');
      const res = await fetch('/api/gym-owner/equipment', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ equipmentStatus: equipmentList })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      toast.success('Equipment status updated');
    } catch (err) {
      toast.error(err.message || 'Failed to update equipment');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="glass-panel" style={{ padding: '24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h2><Dumbbell size={24} style={{ marginRight: '8px', verticalAlign: 'middle', color: 'var(--primary-accent)' }} /> Equipment Status</h2>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button className="btn btn-outline btn-sm" onClick={handleAdd}>
            <Plus size={16} /> Add Item
          </button>
          <button className="btn btn-primary btn-sm" onClick={handleSave} disabled={loading}>
            <Save size={16} /> Save Changes
          </button>
        </div>
      </div>

      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
              <th style={{ padding: '12px' }}>Equipment Name</th>
              <th style={{ padding: '12px' }}>Status</th>
              <th style={{ padding: '12px' }}>Quantity</th>
              <th style={{ padding: '12px' }}>Notes</th>
              <th style={{ padding: '12px' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {equipmentList.map((eq, idx) => (
              <tr key={idx} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                <td style={{ padding: '12px' }}>
                  <input type="text" className="form-control" value={eq.name} onChange={e => handleChange(idx, 'name', e.target.value)} placeholder="e.g. Treadmill" />
                </td>
                <td style={{ padding: '12px' }}>
                  <select className="form-control" value={eq.status} onChange={e => handleChange(idx, 'status', e.target.value)}>
                    <option value="Available">Available</option>
                    <option value="Maintenance">Maintenance</option>
                    <option value="Unavailable">Unavailable</option>
                  </select>
                </td>
                <td style={{ padding: '12px', width: '100px' }}>
                  <input type="number" className="form-control" value={eq.quantity} onChange={e => handleChange(idx, 'quantity', parseInt(e.target.value))} min="1" />
                </td>
                <td style={{ padding: '12px' }}>
                  <input type="text" className="form-control" value={eq.notes || ''} onChange={e => handleChange(idx, 'notes', e.target.value)} placeholder="e.g. Needs belt replaced" />
                </td>
                <td style={{ padding: '12px' }}>
                  <button className="btn" style={{ color: '#ef4444', padding: '6px' }} onClick={() => handleRemove(idx)}>
                    <Trash size={18} />
                  </button>
                </td>
              </tr>
            ))}
            {equipmentList.length === 0 && (
              <tr>
                <td colSpan="5" style={{ padding: '24px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                  No equipment tracked yet. Click "Add Item" to begin.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
