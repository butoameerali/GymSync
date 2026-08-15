import React from 'react';
import { Link } from 'react-router-dom';

const Footer = () => {
  return (
    <footer style={{
      background: 'var(--panel-bg)',
      padding: '20px',
      textAlign: 'center',
      borderTop: '1px solid var(--card-border)',
      marginTop: 'auto',
      fontSize: '0.8rem',
      color: 'var(--text-secondary)'
    }}>
      <div style={{ marginBottom: '10px' }}>
        <Link to="/privacy" style={{ color: 'var(--primary-accent)', marginRight: '15px', textDecoration: 'none' }}>Privacy Policy</Link>
        <Link to="/terms" style={{ color: 'var(--primary-accent)', marginRight: '15px', textDecoration: 'none' }}>Terms of Service</Link>
        <Link to="/regulations" style={{ color: 'var(--primary-accent)', textDecoration: 'none' }}>Government Regulations</Link>
      </div>
      <p>© {new Date().getFullYear()} GymSync. All rights reserved.</p>
      <p style={{ fontSize: '0.7rem', marginTop: '5px' }}>
        GymSync complies with all local data privacy and e-commerce regulations. Health and fitness data is encrypted and securely stored. Subscriptions and purchases are strictly non-refundable except for legally mandated security deposits.
      </p>
    </footer>
  );
};

export default Footer;
