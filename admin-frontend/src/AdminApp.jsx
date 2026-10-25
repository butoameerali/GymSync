import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAdminAuth } from './context/AdminAuthContext';
import AdminLayout from './layouts/AdminLayout';
import AdminLogin from './pages/AdminAuth/AdminLogin';
import AdminOverviewPage from './pages/Overview/AdminOverviewPage';
import GymVerificationQueue from './pages/GymVerification/GymVerificationQueue';
import UsersPage from './pages/Users/UsersPage';
import StoreOversightPage from './pages/StoreOversight/StoreOversightPage';
import ModerationPage from './pages/Moderation/ModerationPage';
import ComplaintsPage from './pages/Complaints/ComplaintsPage';
import PaymentsPage from './pages/Payments/PaymentsPage';
import BroadcastPage from './pages/Broadcast/BroadcastPage';
import InstructorTasksPage from './pages/InstructorTasks/InstructorTasksPage';
import AuditLogsPage from './pages/Audit/AuditLogsPage';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import './styles/admin.css';

const ProtectedAdminRoute = ({ children, allowedRoles }) => {
  const { isLoggedIn, role, loading } = useAdminAuth();

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0b0f19', color: '#9ca3af' }}>
        Verifying Operational Clearance...
      </div>
    );
  }

  if (!isLoggedIn) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles) {
    const roleNormalized = (role || '').toLowerCase().replace(/_/g, '');
    const allowed = allowedRoles.map(r => r.toLowerCase().replace(/_/g, ''));
    if (!allowed.includes(roleNormalized)) {
      return <Navigate to="/" replace />;
    }
  }

  return children;
};

const AdminApp = () => {
  const { isLoggedIn } = useAdminAuth();

  return (
    <>
      <ToastContainer position="top-right" autoClose={3000} theme="dark" />
      <Routes>
        <Route
          path="/login"
          element={isLoggedIn ? <Navigate to="/" replace /> : <AdminLogin />}
        />
        <Route
          path="/"
          element={
            <ProtectedAdminRoute>
              <AdminLayout>
                <AdminOverviewPage />
              </AdminLayout>
            </ProtectedAdminRoute>
          }
        />
        <Route
          path="/gym-verifications"
          element={
            <ProtectedAdminRoute allowedRoles={['SuperAdmin', 'Admin']}>
              <AdminLayout>
                <GymVerificationQueue />
              </AdminLayout>
            </ProtectedAdminRoute>
          }
        />
        <Route
          path="/users"
          element={
            <ProtectedAdminRoute allowedRoles={['SuperAdmin', 'Admin']}>
              <AdminLayout>
                <UsersPage />
              </AdminLayout>
            </ProtectedAdminRoute>
          }
        />
        <Route
          path="/store-oversight"
          element={
            <ProtectedAdminRoute allowedRoles={['SuperAdmin', 'Admin']}>
              <AdminLayout>
                <StoreOversightPage />
              </AdminLayout>
            </ProtectedAdminRoute>
          }
        />
        <Route
          path="/moderation"
          element={
            <ProtectedAdminRoute allowedRoles={['SuperAdmin', 'Admin', 'ComplaintModerator']}>
              <AdminLayout>
                <ModerationPage />
              </AdminLayout>
            </ProtectedAdminRoute>
          }
        />
        <Route
          path="/complaints"
          element={
            <ProtectedAdminRoute allowedRoles={['SuperAdmin', 'Admin', 'ComplaintModerator']}>
              <AdminLayout>
                <ComplaintsPage />
              </AdminLayout>
            </ProtectedAdminRoute>
          }
        />
        <Route
          path="/payments"
          element={
            <ProtectedAdminRoute allowedRoles={['SuperAdmin', 'Admin']}>
              <AdminLayout>
                <PaymentsPage />
              </AdminLayout>
            </ProtectedAdminRoute>
          }
        />
        <Route
          path="/broadcast"
          element={
            <ProtectedAdminRoute allowedRoles={['SuperAdmin', 'Admin']}>
              <AdminLayout>
                <BroadcastPage />
              </AdminLayout>
            </ProtectedAdminRoute>
          }
        />
        <Route
          path="/instructor-tasks"
          element={
            <ProtectedAdminRoute allowedRoles={['SuperAdmin', 'Admin', 'FitnessInstructor']}>
              <AdminLayout>
                <InstructorTasksPage />
              </AdminLayout>
            </ProtectedAdminRoute>
          }
        />
        <Route
          path="/audit-logs"
          element={
            <ProtectedAdminRoute allowedRoles={['SuperAdmin']}>
              <AdminLayout>
                <AuditLogsPage />
              </AdminLayout>
            </ProtectedAdminRoute>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
};

export default AdminApp;
