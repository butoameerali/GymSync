import React, { useState, useEffect } from 'react';
import { useAdminAuth } from '../../context/AdminAuthContext';
import PaymentManagement from '../../components/admin/PaymentManagement';

const PaymentsPage = () => {
  const { role } = useAdminAuth();
  const isSeniorAdmin = (role || '').toLowerCase().includes('super') || (role || '').toLowerCase().includes('senior');
  const [, setTick] = useState(0);

  const handleRefresh = () => {
    setTick(t => t + 1);
  };

  return (
    <div>
      <PaymentManagement isSeniorAdmin={isSeniorAdmin} onRefresh={handleRefresh} />
    </div>
  );
};

export default PaymentsPage;
