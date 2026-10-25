import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
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

  return typeof document !== 'undefined' ? createPortal(
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(5px)', zIndex: 10050, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }} onClick={onClose}>
      <div style={{ background: 'var(--panel-bg, #1e293b)', borderRadius: '16px', padding: '20px', width: '100%', maxWidth: '420px', border: '1px solid var(--card-border, rgba(255,255,255,0.1))', boxShadow: '0 20px 48px rgba(0,0,0,0.5)' }} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
          <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}><RefreshCw size={18} color="#3b82f6"/> Swap {itemName}</h3>
          <button onClick={onClose} style={{ background: 'var(--card-bg-light)', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', borderRadius: '6px', width: '28px', height: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><X size={16}/></button>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '20px', color: 'var(--text-secondary)' }}>Loading options...</div>
        ) : alternatives.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '20px', color: 'var(--text-secondary)' }}>
            <AlertTriangle size={32} style={{ margin: '0 auto 10px auto', opacity: 0.5 }} />
            <p>No direct alternatives found for this item.</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <p style={{ margin: '0 0 6px 0', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Select a macro-equivalent alternative:</p>
            {alternatives.map((alt, idx) => (
              <div 
                key={idx}
                style={{ background: 'var(--card-bg-light)', border: '1px solid var(--card-border)', borderRadius: '10px', padding: '10px 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
              >
                <div>
                  <div style={{ fontWeight: 'bold', fontSize: '0.9rem', color: 'var(--text-primary)' }}>{alt.name}</div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                    ~{alt.calories} kcal • {alt.protein}g protein
                  </div>
                </div>
                <button 
                  onClick={() => handleSwap(alt.name)}
                  disabled={swappingItem === alt.name}
                  style={{ background: '#3b82f6', border: 'none', color: '#ffffff', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', fontSize: '0.82rem', fontWeight: 700 }}
                >
                  {swappingItem === alt.name ? 'Swapping...' : 'Swap'}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>,
    document.body
  ) : null;
};
