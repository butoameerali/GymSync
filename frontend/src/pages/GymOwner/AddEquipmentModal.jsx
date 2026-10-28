import React, { useState } from 'react';
import { X, Dumbbell, Plus, AlertCircle } from 'lucide-react';
import { toast } from 'react-toastify';

const CATEGORIES = ['Cardio', 'Strength Machine', 'Free Weights', 'Functional', 'Other'];

const AddEquipmentModal = ({ isOpen, onClose, gymId, existingEquipment = [], onEquipmentUpdated }) => {
  const [name, setName] = useState('');
  const [category, setCategory] = useState('Strength Machine');
  const [quantity, setQuantity] = useState(1);
  const [status, setStatus] = useState('Available');
  const [notes, setNotes] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  if (!isOpen) return null;

  const token = localStorage.getItem('gymsync_token') || '';

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error('Please enter the machine or equipment name');
      return;
    }

    setIsSaving(true);
    try {
      const newEquipmentItem = {
        name: name.trim(),
        category,
        quantity: Math.max(1, parseInt(quantity, 10) || 1),
        status,
        notes: notes.trim()
      };

      const updatedList = [
        ...existingEquipment.map(eq => ({
          name: eq.name,
          category: eq.category,
          quantity: eq.quantity,
          status: eq.status,
          notes: eq.notes || ''
        })),
        newEquipmentItem
      ];

      const res = await fetch('/api/gym-owner/equipment', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          gymId,
          equipmentStatus: updatedList
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to add machine/equipment');

      toast.success(`🏋️ ${name.trim()} added to your gym equipment!`);
      if (onEquipmentUpdated) {
        onEquipmentUpdated(data.equipmentStatus || updatedList);
      }
      setName('');
      setNotes('');
      setQuantity(1);
      onClose();
    } catch (err) {
      toast.error(err.message || 'Error saving equipment');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose} style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.75)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 9999,
      padding: '20px'
    }}>
      <div 
        className="glass-panel" 
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%',
          maxWidth: '480px',
          background: 'var(--bg-secondary, #151821)',
          border: '1px solid var(--border-color)',
          borderRadius: '16px',
          padding: '24px',
          boxShadow: '0 20px 40px rgba(0,0,0,0.5)',
          color: 'var(--text-primary)'
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '40px',
              height: '40px',
              borderRadius: '10px',
              background: 'rgba(59, 130, 246, 0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--primary-accent)'
            }}>
              <Dumbbell size={22} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 700 }}>Add Gym Machine / Equipment</h3>
              <p style={{ margin: 0, fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                Display available training gear to your prospective members
              </p>
            </div>
          </div>
          <button 
            type="button" 
            onClick={onClose}
            style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.82rem', color: 'var(--text-secondary)', marginBottom: '4px', fontWeight: 600 }}>
                Machine / Equipment Name *
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Olympic Incline Bench, Treadmill Pro, Cable Crossover"
                required
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: '8px',
                  background: 'var(--card-bg, rgba(255,255,255,0.05))',
                  border: '1px solid var(--border-color)',
                  color: 'var(--text-primary)',
                  boxSizing: 'border-box'
                }}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', color: 'var(--text-secondary)', marginBottom: '4px', fontWeight: 600 }}>
                  Category
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: '8px',
                    background: 'var(--card-bg, rgba(255,255,255,0.05))',
                    border: '1px solid var(--border-color)',
                    color: 'var(--text-primary)',
                    boxSizing: 'border-box'
                  }}
                >
                  {CATEGORIES.map(cat => (
                    <option key={cat} value={cat} style={{ background: '#151821', color: '#fff' }}>{cat}</option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', color: 'var(--text-secondary)', marginBottom: '4px', fontWeight: 600 }}>
                  Quantity
                </label>
                <input
                  type="number"
                  min="1"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: '8px',
                    background: 'var(--card-bg, rgba(255,255,255,0.05))',
                    border: '1px solid var(--border-color)',
                    color: 'var(--text-primary)',
                    boxSizing: 'border-box'
                  }}
                />
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.82rem', color: 'var(--text-secondary)', marginBottom: '4px', fontWeight: 600 }}>
                Status
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: '8px',
                  background: 'var(--card-bg, rgba(255,255,255,0.05))',
                  border: '1px solid var(--border-color)',
                  color: 'var(--text-primary)',
                  boxSizing: 'border-box'
                }}
              >
                <option value="Available" style={{ background: '#151821', color: '#fff' }}>✅ Available &amp; Operational</option>
                <option value="Maintenance" style={{ background: '#151821', color: '#fff' }}>⚠️ Under Maintenance</option>
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.82rem', color: 'var(--text-secondary)', marginBottom: '4px', fontWeight: 600 }}>
                Notes / Specs (Optional)
              </label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="e.g. LifeFitness, rubber-coated, includes safety pins"
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: '8px',
                  background: 'var(--card-bg, rgba(255,255,255,0.05))',
                  border: '1px solid var(--border-color)',
                  color: 'var(--text-primary)',
                  boxSizing: 'border-box'
                }}
              />
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px' }}>
            <button
              type="button"
              onClick={onClose}
              className="btn btn-outline btn-sm"
              style={{ padding: '8px 16px' }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="btn btn-primary btn-sm"
              style={{ padding: '8px 18px', display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              <Plus size={15} />
              {isSaving ? 'Adding...' : 'Add Equipment'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddEquipmentModal;
