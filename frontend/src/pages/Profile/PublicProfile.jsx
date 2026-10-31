import React from 'react';
import Profile from './Profile';

// Re-export modern Profile so any lingering PublicProfile imports seamlessly render the modern UI
const PublicProfile = () => {
  return <Profile />;
};

export default PublicProfile;
