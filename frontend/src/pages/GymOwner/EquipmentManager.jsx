import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  Dumbbell, Plus, Minus, Save, Trash2, RefreshCw, 
  Search, CheckCircle2, AlertCircle, XCircle, Zap, 
  Sparkles, Check, ChevronRight
} from 'lucide-react';
import { toast } from 'react-toastify';
import './EquipmentManager.css';

// Pre-defined popular equipment catalog grouped by category
const PRESET_CATEGORIES = [
  {
    id: 'popular',
    label: '🔥 Most Popular',
    items: [
      { name: 'Commercial Treadmill', icon: '🏃', defaultQty: 4 },
      { name: 'Dumbbell Set (2.5kg - 50kg)', icon: '🏋️', defaultQty: 2 },
      { name: 'Olympic Barbells & Plates', icon: '🏋️', defaultQty: 3 },
      { name: 'Power Squat Rack', icon: '🏗️', defaultQty: 2 },
      { name: 'Cable Crossover Machine', icon: '⚙️', defaultQty: 1 },
      { name: 'Adjustable Incline Bench', icon: '📐', defaultQty: 3 },
      { name: 'Stationary Spin Bike', icon: '🚴', defaultQty: 4 },
      { name: '45-Degree Leg Press', icon: '🦵', defaultQty: 1 },
      { name: 'Pull-Up & Dip Station', icon: '🤸', defaultQty: 2 },
      { name: 'High-Density Yoga Mats', icon: '🧘', defaultQty: 10 }
    ]
  },
  {
    id: 'cardio',
    label: '🏃 Cardio',
    items: [
      { name: 'Commercial Treadmill', icon: '🏃', defaultQty: 3 },
      { name: 'Stationary Spin Bike', icon: '🚴', defaultQty: 3 },
      { name: 'Elliptical Cross Trainer', icon: '⛷️', defaultQty: 2 },
      { name: 'Rowing Machine', icon: '🚣', defaultQty: 2 },
      { name: 'StairMaster / Climber', icon: '🪜', defaultQty: 1 },
      { name: 'Air Assault Bike', icon: '💨', defaultQty: 2 }
    ]
  },
  {
    id: 'freeweights',
    label: '🏋️ Free Weights',
    items: [
      { name: 'Dumbbell Set (2.5kg - 50kg)', icon: '🏋️', defaultQty: 2 },
      { name: 'Olympic Barbells & Plates', icon: '🏋️', defaultQty: 3 },
      { name: 'Rubber Bumper Plates Set', icon: '🔘', defaultQty: 4 },
      { name: 'Adjustable Incline Bench', icon: '📐', defaultQty: 3 },
      { name: 'Olympic Flat Bench Press', icon: '🛋️', defaultQty: 2 },
      { name: 'EZ Curl Barbells', icon: '〰️', defaultQty: 2 },
      { name: 'Kettlebells Set (4kg - 32kg)', icon: '🔔', defaultQty: 2 }
    ]
  },
  {
    id: 'machines',
    label: '⚙️ Strength Machines',
    items: [
      { name: 'Cable Crossover Machine', icon: '⚙️', defaultQty: 1 },
      { name: 'Power Squat Rack', icon: '🏗️', defaultQty: 2 },
      { name: 'Smith Machine', icon: '🏛️', defaultQty: 1 },
      { name: '45-Degree Leg Press', icon: '🦵', defaultQty: 1 },
      { name: 'Lat Pulldown & Seated Row', icon: '🧗', defaultQty: 1 },
      { name: 'Pec Fly / Rear Delt Machine', icon: '💺', defaultQty: 1 },
      { name: 'Leg Extension & Curl Machine', icon: '🦿', defaultQty: 1 },
      { name: 'Seated Chest Press', icon: '🪑', defaultQty: 1 },
      { name: 'Preacher Curl Bench', icon: '💪', defaultQty: 1 }
    ]
  },
  {
    id: 'functional',
    label: '🤸 Functional & Boxing',
    items: [
      { name: 'Pull-Up & Dip Station', icon: '🤸', defaultQty: 2 },
      { name: 'Heavy Boxing Bag', icon: '🥊', defaultQty: 2 },
      { name: 'Battle Ropes (50ft)', icon: '➰', defaultQty: 2 },
      { name: 'Plyometric Jump Boxes', icon: '📦', defaultQty: 3 },
      { name: 'High-Density Yoga Mats', icon: '🧘', defaultQty: 10 },
      { name: 'Resistance Bands Set', icon: '🎗️', defaultQty: 5 },
      { name: 'Medicine & Slam Balls', icon: '⚽', defaultQty: 4 }
    ]
  }
];

export default function EquipmentManager({ gymData, onEquipmentUpdated }) {
  const [equipmentList, setEquipmentList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isDirty, setIsDirty] = useState(false);

  // Quick-Add section state
  const [activeCategory, setActiveCategory] = useState('popular');
  const [customName, setCustomName] = useState('');
  const [customQty, setCustomQty] = useState(1);

  // Search & Filter state
  const [searchFilter, setSearchFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  const customInputRef = useRef(null);

  // Sync state when gymData changes, but preserve uncommitted edits
  useEffect(() => {
    if (gymData && Array.isArray(gymData.equipmentStatus)) {
      if (!isDirty) {
        setEquipmentList(gymData.equipmentStatus);
      }
    }
  }, [gymData]);

  // Total summary statistics
  const stats = useMemo(() => {
    let totalPieces = 0;
    let availableCount = 0;
    let maintenanceCount = 0;
    let unavailableCount = 0;

    equipmentList.forEach(item => {
      const qty = parseInt(item.quantity, 10) || 1;
      totalPieces += qty;
      if (item.status === 'Available') availableCount += qty;
      else if (item.status === 'Maintenance') maintenanceCount += qty;
      else if (item.status === 'Unavailable') unavailableCount += qty;
    });

    return {
      typesCount: equipmentList.length,
      totalPieces,
      availableCount,
      maintenanceCount,
      unavailableCount
    };
  }, [equipmentList]);

  // Check if item exists in current inventory
  const getExistingItem = (name) => {
    return equipmentList.find(e => e.name && e.name.trim().toLowerCase() === name.trim().toLowerCase());
  };

  // 1-Click Quick Add Chip
  const handleQuickAdd = (preset) => {
    const existing = getExistingItem(preset.name);
    if (existing) {
      // Increment quantity
      setEquipmentList(prev => prev.map(item => {
        if (item.name.trim().toLowerCase() === preset.name.trim().toLowerCase()) {
          const newQty = (parseInt(item.quantity, 10) || 1) + 1;
          return { ...item, quantity: newQty };
        }
        return item;
      }));
      setIsDirty(true);
      toast.info(`Increased ${preset.name} count (+1)`);
    } else {
      // Add new item to front of list
      const newItem = {
        name: preset.name,
        status: 'Available',
        quantity: preset.defaultQty || 1,
        notes: ''
      };
      setEquipmentList(prev => [newItem, ...prev]);
      setIsDirty(true);
      toast.success(`Added ${preset.name} to equipment list`);
    }
  };

  // Add custom equipment from input
  const handleAddCustom = (e) => {
    if (e) e.preventDefault();
    const trimmed = customName.trim();
    if (!trimmed) {
      toast.warn('Please enter an equipment name');
      return;
    }

    const existing = getExistingItem(trimmed);
    if (existing) {
      setEquipmentList(prev => prev.map(item => {
        if (item.name.trim().toLowerCase() === trimmed.toLowerCase()) {
          const newQty = (parseInt(item.quantity, 10) || 1) + (parseInt(customQty, 10) || 1);
          return { ...item, quantity: newQty };
        }
        return item;
      }));
      toast.info(`Updated quantity for "${trimmed}"`);
    } else {
      const newItem = {
        name: trimmed,
        status: 'Available',
        quantity: Math.max(1, parseInt(customQty, 10) || 1),
        notes: ''
      };
      setEquipmentList(prev => [newItem, ...prev]);
      toast.success(`Added "${trimmed}" to equipment list`);
    }

    setCustomName('');
    setCustomQty(1);
    setIsDirty(true);
    if (customInputRef.current) {
      customInputRef.current.focus();
    }
  };

  // Quantity stepper handler
  const handleStepQty = (index, delta) => {
    setEquipmentList(prev => {
      const next = [...prev];
      const cur = parseInt(next[index].quantity, 10) || 1;
      const updated = Math.max(1, cur + delta);
      next[index] = { ...next[index], quantity: updated };
      return next;
    });
    setIsDirty(true);
  };

  // Change single field in equipment item
  const handleChange = (index, field, value) => {
    setEquipmentList(prev => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
    setIsDirty(true);
  };

  // Remove single equipment item
  const handleRemove = (index) => {
    const itemToRemove = equipmentList[index];
    setEquipmentList(prev => prev.filter((_, i) => i !== index));
    setIsDirty(true);
    toast.info(`Removed ${itemToRemove?.name || 'item'}`);
  };

  // Clear all equipment
  const handleClearAll = () => {
    if (equipmentList.length === 0) return;
    if (window.confirm('Are you sure you want to remove all equipment from this list? (You must click Save Changes to apply)')) {
      setEquipmentList([]);
      setIsDirty(true);
      toast.warn('Equipment list cleared. Click "Save Changes" to publish.');
    }
  };

  // Reload / Discard unsaved changes from server
  const handleReload = () => {
    if (gymData && Array.isArray(gymData.equipmentStatus)) {
      setEquipmentList(gymData.equipmentStatus);
      setIsDirty(false);
      toast.info('Reloaded equipment data from database');
    }
    if (typeof onEquipmentUpdated === 'function') {
      onEquipmentUpdated();
    }
  };

  // Save changes to database and publish to public gym page
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
        body: JSON.stringify({
          gymId: gymData?._id,
          equipmentStatus: equipmentList
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to save equipment');

      // Update state with cleaned server response
      if (Array.isArray(data.equipmentStatus)) {
        setEquipmentList(data.equipmentStatus);
      }
      setIsDirty(false);

      // Trigger parent reload so tabs, explore, and state stay completely synced
      if (typeof onEquipmentUpdated === 'function') {
        await onEquipmentUpdated();
      }

      toast.success('Equipment inventory saved and published successfully!');
    } catch (err) {
      console.error('handleSave error:', err);
      toast.error(err.message || 'Failed to update equipment');
    } finally {
      setLoading(false);
    }
  };

  // Filtered list based on search and status
  const filteredList = useMemo(() => {
    return equipmentList.filter(item => {
      const matchesSearch = !searchFilter.trim() || 
        (item.name && item.name.toLowerCase().includes(searchFilter.toLowerCase())) ||
        (item.notes && item.notes.toLowerCase().includes(searchFilter.toLowerCase()));
      
      const matchesStatus = statusFilter === 'ALL' || item.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [equipmentList, searchFilter, statusFilter]);

  const activeCategoryData = PRESET_CATEGORIES.find(c => c.id === activeCategory) || PRESET_CATEGORIES[0];

  return (
    <div className="equipment-manager-root">
      {/* Top Header Panel */}
      <div className="equipment-header-panel">
        <div className="equipment-top-bar">
          <div className="equipment-title-area">
            <h2>
              <Dumbbell size={26} color="var(--primary-accent)" /> 
              Equipment & Machine Inventory
            </h2>
            <p>
              Manage machine availability and condition. Available equipment automatically syncs with your public gym page.
            </p>
          </div>

          <div className="equipment-actions-group">
            {isDirty && (
              <span className="dirty-indicator-badge">
                <AlertCircle size={14} /> Unsaved Changes
              </span>
            )}

            <button 
              className="btn btn-outline btn-sm" 
              onClick={handleReload}
              title="Reload saved equipment from database"
            >
              <RefreshCw size={14} /> Reload
            </button>

            {equipmentList.length > 0 && (
              <button 
                className="btn btn-outline btn-sm" 
                style={{ borderColor: 'rgba(239, 68, 68, 0.4)', color: '#ef4444' }}
                onClick={handleClearAll}
                title="Clear all equipment items"
              >
                <Trash2 size={14} /> Clear All
              </button>
            )}

            <button 
              className="btn btn-primary btn-sm" 
              onClick={handleSave} 
              disabled={loading}
              style={{ minWidth: '140px' }}
            >
              {loading ? (
                <>
                  <RefreshCw size={14} className="spin-animation" style={{ marginRight: '6px' }} /> Saving...
                </>
              ) : (
                <>
                  <Save size={15} style={{ marginRight: '6px' }} /> Save Changes
                </>
              )}
            </button>
          </div>
        </div>

        {/* Stats Row */}
        <div className="equipment-stats-row">
          <div className="equipment-stat-card">
            <span className="equipment-stat-label">Equipment Types</span>
            <span className="equipment-stat-value">{stats.typesCount}</span>
          </div>
          <div className="equipment-stat-card">
            <span className="equipment-stat-label">Total Pieces</span>
            <span className="equipment-stat-value" style={{ color: 'var(--primary-accent)' }}>{stats.totalPieces}</span>
          </div>
          <div className="equipment-stat-card">
            <span className="equipment-stat-label">🟢 Available</span>
            <span className="equipment-stat-value" style={{ color: '#10b981' }}>{stats.availableCount}</span>
          </div>
          <div className="equipment-stat-card">
            <span className="equipment-stat-label">🟡 Maintenance</span>
            <span className="equipment-stat-value" style={{ color: '#f59e0b' }}>{stats.maintenanceCount}</span>
          </div>
          <div className="equipment-stat-card">
            <span className="equipment-stat-label">🔴 Unavailable</span>
            <span className="equipment-stat-value" style={{ color: '#ef4444' }}>{stats.unavailableCount}</span>
          </div>
        </div>

        {/* 1-Click Quick Add Section */}
        <div className="quick-add-section">
          <div className="quick-add-header">
            <div>
              <div className="quick-add-title">
                <Zap size={18} color="#f59e0b" /> 
                1-Click Quick Add (Popular Equipment)
              </div>
              <div className="quick-add-subtitle">
                Click any equipment chip below to instantly add it to your gym or increment its quantity (+1).
              </div>
            </div>

            {/* Category tabs */}
            <div className="quick-cat-tabs">
              {PRESET_CATEGORIES.map(cat => (
                <button
                  key={cat.id}
                  className={`quick-cat-btn ${activeCategory === cat.id ? 'active' : ''}`}
                  onClick={() => setActiveCategory(cat.id)}
                >
                  {cat.label}
                </button>
              ))}
            </div>
          </div>

          {/* Quick Add Chips */}
          <div className="quick-chips-grid">
            {activeCategoryData.items.map((preset, pIdx) => {
              const existing = getExistingItem(preset.name);
              return (
                <button
                  key={pIdx}
                  type="button"
                  className={`quick-chip-btn ${existing ? 'in-list' : ''}`}
                  onClick={() => handleQuickAdd(preset)}
                  title={existing ? `Already added (${existing.quantity}). Click to add +1.` : `Click to add ${preset.name}`}
                >
                  <span style={{ fontSize: '1.1rem' }}>{preset.icon}</span>
                  <span>{preset.name}</span>
                  {existing ? (
                    <span className="chip-qty-tag">×{existing.quantity}</span>
                  ) : (
                    <span className="chip-plus-icon">+</span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Fast Custom Add Bar */}
          <form className="fast-add-container" onSubmit={handleAddCustom}>
            <div className="fast-add-input-wrapper">
              <Search size={16} color="var(--text-secondary)" />
              <input
                ref={customInputRef}
                type="text"
                className="fast-add-input"
                placeholder="Or type custom equipment name (e.g. Hack Squat, Sauna, Incline Bench) and press Enter..."
                value={customName}
                onChange={e => setCustomName(e.target.value)}
              />
            </div>

            <div className="fast-add-qty-wrapper">
              <span>Qty:</span>
              <input
                type="number"
                min="1"
                className="fast-add-qty-input"
                value={customQty}
                onChange={e => setCustomQty(Math.max(1, parseInt(e.target.value, 10) || 1))}
              />
            </div>

            <button type="submit" className="btn btn-primary btn-sm" style={{ whiteSpace: 'nowrap' }}>
              <Plus size={15} /> Add Custom Item
            </button>
          </form>
        </div>
      </div>

      {/* Main Inventory Table Section */}
      <div className="inventory-section">
        <div className="inventory-toolbar">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <h3 style={{ fontSize: '1.15rem', color: 'var(--text-primary)', margin: 0, fontWeight: 700 }}>
              Current Equipment Roster ({equipmentList.length})
            </h3>
          </div>

          <div className="inventory-filters">
            <input
              type="text"
              className="search-filter-input"
              placeholder="Search equipment or notes..."
              value={searchFilter}
              onChange={e => setSearchFilter(e.target.value)}
            />

            <div style={{ display: 'flex', gap: '4px' }}>
              {['ALL', 'Available', 'Maintenance', 'Unavailable'].map(st => (
                <button
                  key={st}
                  type="button"
                  className={`status-filter-btn ${statusFilter === st ? 'active' : ''}`}
                  onClick={() => setStatusFilter(st)}
                >
                  {st === 'ALL' ? 'All' : st}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Inventory Table */}
        {filteredList.length > 0 ? (
          <div className="equipment-table-wrap">
            <table className="equipment-modern-table">
              <thead>
                <tr>
                  <th style={{ width: '30%' }}>Equipment Name</th>
                  <th style={{ width: '18%' }}>Quantity</th>
                  <th style={{ width: '18%' }}>Condition / Status</th>
                  <th style={{ width: '26%' }}>Notes / Maintenance Info</th>
                  <th style={{ width: '8%', textAlign: 'center' }}>Remove</th>
                </tr>
              </thead>
              <tbody>
                {filteredList.map((eq, displayIdx) => {
                  // Find real index in equipmentList
                  const realIndex = equipmentList.indexOf(eq);
                  return (
                    <tr key={displayIdx}>
                      <td>
                        <input
                          type="text"
                          className="form-control"
                          value={eq.name}
                          onChange={e => handleChange(realIndex, 'name', e.target.value)}
                          placeholder="e.g. Commercial Treadmill"
                          style={{ fontWeight: 600, color: 'var(--text-primary)' }}
                        />
                      </td>

                      <td>
                        <div className="stepper-control">
                          <button
                            type="button"
                            className="stepper-btn"
                            onClick={() => handleStepQty(realIndex, -1)}
                            disabled={eq.quantity <= 1}
                            title="Decrease quantity"
                          >
                            <Minus size={14} />
                          </button>
                          <span className="stepper-val">{eq.quantity || 1}</span>
                          <button
                            type="button"
                            className="stepper-btn"
                            onClick={() => handleStepQty(realIndex, 1)}
                            title="Increase quantity"
                          >
                            <Plus size={14} />
                          </button>
                        </div>
                      </td>

                      <td>
                        <select
                          className={`form-control status-select-btn status-${eq.status || 'Available'}`}
                          value={eq.status || 'Available'}
                          onChange={e => handleChange(realIndex, 'status', e.target.value)}
                          style={{
                            fontWeight: 600,
                            padding: '6px 12px',
                            borderRadius: '12px'
                          }}
                        >
                          <option value="Available">🟢 Available</option>
                          <option value="Maintenance">🟡 Under Maintenance</option>
                          <option value="Unavailable">🔴 Out of Order</option>
                        </select>
                      </td>

                      <td>
                        <input
                          type="text"
                          className="form-control"
                          value={eq.notes || ''}
                          onChange={e => handleChange(realIndex, 'notes', e.target.value)}
                          placeholder="e.g. LifeFitness Brand, next belt check 15th"
                          style={{ fontSize: '0.88rem' }}
                        />
                      </td>

                      <td style={{ textAlign: 'center' }}>
                        <button
                          type="button"
                          className="row-delete-btn"
                          onClick={() => handleRemove(realIndex)}
                          title={`Remove ${eq.name || 'item'}`}
                        >
                          <Trash2 size={16} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="equipment-empty-state">
            <Dumbbell size={42} className="empty-icon" />
            <h3>No equipment items match</h3>
            <p>
              {equipmentList.length === 0
                ? 'Your gym equipment list is empty. Click any 1-Click Quick Add chip above or type a custom item to begin.'
                : 'No equipment matches your current search or status filter. Try clearing filters.'}
            </p>
            {equipmentList.length === 0 && (
              <button
                type="button"
                className="btn btn-primary btn-sm"
                onClick={() => handleQuickAdd(PRESET_CATEGORIES[0].items[0])}
              >
                <Plus size={15} /> Add Sample Treadmill
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
