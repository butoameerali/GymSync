import React, { useState, useEffect } from 'react';
import weightLossService from './weightLossService';
import WeightLossEnrollmentPage from './WeightLossEnrollmentPage';
import WeightLossDashboard from './WeightLossDashboard';

export default function WeightLossPage() {
  const [loading, setLoading] = useState(true);
  const [activeEnrollment, setActiveEnrollment] = useState(null);

  useEffect(() => {
    checkActiveEnrollment();
  }, []);

  const checkActiveEnrollment = async () => {
    setLoading(true);
    try {
      const res = await weightLossService.getActiveEnrollment();
      if (res.active && res.enrollment) {
        setActiveEnrollment(res.enrollment);
      } else {
        setActiveEnrollment(null);
      }
    } catch (err) {
      console.warn('Could not fetch active weight loss enrollment:', err);
      setActiveEnrollment(null);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '60px 20px' }}>
        <p style={{ color: '#6b7280' }}>Loading Weight Loss program status...</p>
      </div>
    );
  }

  if (activeEnrollment) {
    return (
      <WeightLossDashboard
        enrollment={activeEnrollment}
        onProgramLeft={() => setActiveEnrollment(null)}
      />
    );
  }

  return (
    <WeightLossEnrollmentPage
      onEnrollmentComplete={(newEnrollment) => setActiveEnrollment(newEnrollment)}
    />
  );
}
