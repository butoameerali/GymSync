import React from 'react';
import { Link } from 'react-router-dom';
import { AlertCircle } from 'lucide-react';

const NotFound = () => {
  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', background: 'var(--bg-color)', color: 'white' }}>
      <AlertCircle size={64} color="#ef4444" style={{ marginBottom: '20px' }} />
      <h1 style={{ fontSize: '3rem', marginBottom: '10px' }}>404</h1>
      <p style={{ color: 'var(--text-secondary)', marginBottom: '30px', fontSize: '1.2rem' }}>Oops! The page you are looking for doesn't exist.</p>
      <Link to="/" className="btn btn-primary">Go Back Home</Link>
    </div>
  );
};

export default NotFound;
