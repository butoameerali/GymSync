import React, { useState, useEffect } from 'react';
import ModerationManagement from '../../components/admin/ModerationManagement';
import { toast } from 'react-toastify';

const ModerationPage = () => {
  const [reportedPosts, setReportedPosts] = useState([]);
  const [loading, setLoading] = useState(true);

  const token = localStorage.getItem('gymsync_admin_token') || localStorage.getItem('gymsync_token') || '';

  const fetchReportedPosts = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/posts/reported', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setReportedPosts(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      console.error('fetchReportedPosts error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReportedPosts();
  }, []);

  return (
    <div>
      <ModerationManagement reportedPosts={reportedPosts} onRefresh={fetchReportedPosts} />
    </div>
  );
};

export default ModerationPage;
