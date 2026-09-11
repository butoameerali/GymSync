import React, { useState, useEffect } from 'react';
import { Target, Activity, Flame, Utensils, Footprints } from 'lucide-react';
import { toast } from 'react-toastify';
import SkeletonLoader from '../../components/common/SkeletonLoader';

export default function PlanVsRealityCard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const token = localStorage.getItem('gymsync_token');
      const today = new Date().toISOString().split('T')[0];
      const res = await fetch(`/api/diet/plan-vs-reality?date=${today}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const d = await res.json();
        setData(d);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <SkeletonLoader height="200px" borderRadius="16px" />;
  if (!data) return null;

  return (
    <div className="glass-panel" style={{ padding: '20px', marginBottom: '20px' }}>
      <h4 style={{ margin: '0 0 15px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
        <Target size={20} color="#3b82f6" /> Plan vs. Reality
      </h4>
      
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
        <div style={{ padding: '15px', background: 'rgba(59, 130, 246, 0.05)', borderRadius: '12px' }}>
          <h5 style={{ margin: '0 0 10px 0', color: 'var(--text-secondary)' }}>PLANNED</h5>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
            <Utensils size={16} /> <span style={{ fontWeight: 600 }}>{data.planned.dietKcal}</span> kcal in
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
            <Flame size={16} /> <span style={{ fontWeight: 600 }}>{data.planned.workoutKcal}</span> kcal out
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Footprints size={16} /> <span style={{ fontWeight: 600 }}>{data.planned.steps}</span> steps
          </div>
        </div>

        <div style={{ padding: '15px', background: 'rgba(16, 185, 129, 0.05)', borderRadius: '12px' }}>
          <h5 style={{ margin: '0 0 10px 0', color: 'var(--text-secondary)' }}>ACTUAL</h5>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
            <Utensils size={16} color={data.actual.dietKcal > data.planned.dietKcal ? '#ef4444' : '#10b981'} /> 
            <span style={{ fontWeight: 600 }}>{data.actual.dietKcal}</span> kcal in
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
            <Flame size={16} color={data.actual.workoutKcal < data.planned.workoutKcal ? '#ef4444' : '#10b981'} /> 
            <span style={{ fontWeight: 600 }}>{data.actual.workoutKcal}</span> kcal out
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Footprints size={16} color={data.actual.steps < data.planned.steps ? '#ef4444' : '#10b981'} /> 
            <span style={{ fontWeight: 600 }}>{data.actual.steps}</span> steps
          </div>
        </div>
      </div>

      <div style={{ marginTop: '15px', padding: '12px', background: 'rgba(255, 255, 255, 0.05)', borderRadius: '8px', fontStyle: 'italic', fontSize: '0.9rem', color: 'var(--text-secondary)', borderLeft: '3px solid #3b82f6' }}>
        "{data.insight}"
      </div>
    </div>
  );
}
