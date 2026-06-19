import React from 'react';

const Footer = () => {
  return (
    <footer style={{
      background: 'rgba(0,0,0,0.8)',
      padding: '20px',
      textAlign: 'center',
      borderTop: '1px solid rgba(255,255,255,0.1)',
      marginTop: 'auto',
      fontSize: '0.8rem',
      color: 'var(--text-secondary)'
    }}>
      <div style={{ marginBottom: '10px' }}>
        <a href="#" style={{ color: 'var(--primary-accent)', marginRight: '15px', textDecoration: 'none' }}>Privacy Policy</a>
        <a href="#" style={{ color: 'var(--primary-accent)', marginRight: '15px', textDecoration: 'none' }}>Terms of Service</a>
        <a href="#" style={{ color: 'var(--primary-accent)', textDecoration: 'none' }}>Government Regulations</a>
      </div>
      <p>© {new Date().getFullYear()} GymSync. All rights reserved.</p>
      <p style={{ fontSize: '0.7rem', marginTop: '5px' }}>
        GymSync complies with all local data privacy and e-commerce regulations. Health and fitness data is encrypted and securely stored. Subscriptions and purchases are strictly non-refundable except for legally mandated security deposits.
      </p>
    </footer>
  );
};

export default Footer;
