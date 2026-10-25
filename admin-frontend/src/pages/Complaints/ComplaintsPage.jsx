import React, { useState, useEffect } from 'react';
import { useAdminAuth } from '../../context/AdminAuthContext';
import ComplaintManagement from '../../components/admin/ComplaintManagement';
import { toast } from 'react-toastify';

const ComplaintsPage = () => {
  const { user, role, authHeaders } = useAdminAuth();
  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(true);

  const isSeniorAdmin = (role || '').toLowerCase().includes('super') || (role || '').toLowerCase().includes('senior');

  const fetchComplaints = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/complaints', { headers: authHeaders() });
      if (res.ok) {
        const data = await res.json();
        setComplaints(Array.isArray(data) ? data : []);
      } else {
        toast.error('Failed to load complaints');
      }
    } catch (e) {
      toast.error('Network error loading complaints queue');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchComplaints();
  }, []);

  return (
    <div>
      <ComplaintManagement
        complaints={complaints}
        userName={user?.name || 'Administrator'}
        userRole={role || 'Admin'}
        isSeniorAdmin={isSeniorAdmin}
        onRefresh={fetchComplaints}
      />
    </div>
  );
};

export default ComplaintsPage;
