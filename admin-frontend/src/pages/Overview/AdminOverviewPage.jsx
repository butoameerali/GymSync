import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAdminAuth } from '../../context/AdminAuthContext';
import AdminOverview from '../../components/admin/AdminOverview';
import { toast } from 'react-toastify';

const AdminOverviewPage = () => {
  const { authHeaders, role } = useAdminAuth();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const isModerator = (role || '').toLowerCase().replace(/_/g, '') === 'complaintmoderator';

  const fetchStats = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/admin/stats', { headers: authHeaders() });
      if (res.ok) {
        const data = await res.json();
        setStats(data);
      }
    } catch (e) {
      console.error('fetchStats error:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  const handleNavigateTab = (tab) => {
    const routeMap = {
      users: '/users',
      gyms: '/gym-verifications',
      complaints: '/complaints',
      moderation: '/moderation',
      payments: '/payments',
      store: '/store-oversight',
      broadcast: '/broadcast'
    };
    if (routeMap[tab]) {
      navigate(routeMap[tab]);
    }
  };

  return (
    <div>
      <AdminOverview
        stats={stats}
        isModerator={isModerator}
        onNavigateTab={handleNavigateTab}
      />
    </div>
  );
};

export default AdminOverviewPage;
