import React, { useState, useEffect } from 'react';
import { X, RefreshCw, AlertTriangle } from 'lucide-react';

export const SwapMealItemModal = ({ isOpen, onClose, itemName, mealId, planId, onSwapComplete }) => {
  const [alternatives, setAlternatives] = useState([]);
  const [loading, setLoading] = useState(false);
  const [swappingItem, setSwappingItem] = useState(null);

  useEffect(() => {
    if (isOpen && itemName) {
      fetchAlternatives();
    }
  }, [isOpen, itemName]);

  const fetchAlternatives = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('gymsync_token');
      const res = await fetch(`/api/diet/substitute-options?itemName=${encodeURIComponent(itemName)}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const json = await res.json();
        setAlternatives(json.alternatives || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSwap = async (altName) => {
    setSwappingItem(altName);
    try {
      const token = localStorage.getItem('gymsync_token');
      const res = await fetch(`/api/diet/plans/${planId}/meals/${mealId}/substitute`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          fromFoodItemName: itemName,
          toFoodItemName: altName
        })
      });

      if (res.ok) {
        const json = await res.json();
        onSwapComplete(json.plan, json.message);
        onClose();
      } else {
        alert('Failed to swap');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSwappingItem(null);
    }
  };

  if (!isOpen) return null;

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(15,23,42,0.85)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
      <div style={{ background: 'var(--panel-bg, #1e293b)', borderRadius: '16px', padding: '24px', width: '100%', maxWidth: '400px', border: '1px solid rgba(255,255,255,0.1)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}><RefreshCw size={18} color="#3b82f6"/> Swap {itemName}</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}><X size={20}/></button>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '20px' }}>Loading options...</div>
        ) : alternatives.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '20px', color: '#94a3b8' }}>
            <AlertTriangle size={32} style={{ margin: '0 auto 10px auto', opacity: 0.5 }} />
            <p>No direct alternatives found for this item.</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <p style={{ margin: '0 0 10px 0', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Select a macro-equivalent alternative:</p>
            {alternatives.map((alt, idx) => (
              <div 
                key={idx}
                style={{ background: 'rgba(255,255,255,0.05)', borderRadius: '10px', padding: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
              >
                <div>
                  <div style={{ fontWeight: 'bold' }}>{alt.name}</div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted, #64748b)' }}>
                    ~{alt.calories} kcal • {alt.protein}g protein
                  </div>
                </div>
                <button 
                  onClick={() => handleSwap(alt.name)}
                  disabled={swappingItem === alt.name}
                  style={{ background: '#3b82f6', border: 'none', color: 'white', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', fontSize: '0.85rem' }}
                >
                  {swappingItem === alt.name ? 'Swapping...' : 'Swap'}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
