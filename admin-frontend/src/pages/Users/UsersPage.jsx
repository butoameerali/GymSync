import React, { useState, useEffect } from 'react';
import UserManagement from '../../components/admin/UserManagement';
import { toast } from 'react-toastify';

const UsersPage = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  const token = localStorage.getItem('gymsync_admin_token') || localStorage.getItem('gymsync_token') || '';

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/users', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setUsers(Array.isArray(data) ? data : []);
      } else {
        toast.error('Failed to load user roster');
      }
    } catch (err) {
      toast.error('Network error loading users');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  return (
    <div>
      <UserManagement users={users} onRefresh={fetchUsers} />
    </div>
  );
};

export default UsersPage;
