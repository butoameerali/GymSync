import React from 'react';
import { Link } from 'react-router-dom';
import { Building, MapPin } from 'lucide-react';
import { getSafeImageUrl } from '../../utils/imageUtils';

const ProfileGigTab = ({ myGymGig }) => {
  return (
    <div className="glass-panel section-panel">
      <h3 className="section-title"><Building size={20}/> Your Gym Gig</h3>
      {myGymGig ? (
        <div className="gym-gig-display" style={{ marginTop: '20px' }}>
          {myGymGig.equipmentImages?.[0] && (
            <div style={{ width: '100%', height: '200px', borderRadius: '12px', overflow: 'hidden', marginBottom: '20px' }}>
              <img src={getSafeImageUrl(myGymGig.equipmentImages[0])} alt="Gym Cover" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            </div>
          )}
          <h2 style={{ marginBottom: '10px' }}>{myGymGig.name}</h2>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '15px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <MapPin size={16} color="var(--primary-accent)" /> {myGymGig.address || myGymGig.location}{myGymGig.city ? `, ${myGymGig.city}` : ''}
          </p>
          <div style={{ display: 'flex', gap: '20px', marginBottom: '20px' }}>
            <div><strong>Monthly Fee:</strong> ${myGymGig.monthlyFee}</div>
            <div><strong>Admission Fee:</strong> ${myGymGig.admissionFee || 0}</div>
          </div>
          {myGymGig.description && (
            <div style={{ background: 'var(--card-bg)', padding: '15px', borderRadius: '12px', marginBottom: '20px' }}>
              <h4 style={{ marginBottom: '10px', color: 'var(--primary-accent)' }}>Gym Description (Post Info)</h4>
              <p style={{ whiteSpace: 'pre-wrap', margin: 0, lineHeight: '1.6' }}>{myGymGig.description}</p>
            </div>
          )}
          <div style={{ marginTop: '20px', paddingTop: '20px', borderTop: '1px solid var(--card-border)' }}>
            <Link to="/gym-owner" className="btn btn-outline" style={{ display: 'inline-block' }}>
              Manage in Gym Panel
            </Link>
          </div>
        </div>
      ) : (
        <div style={{ textAlign: 'center', padding: '30px 0' }}>
          <p className="empty-text">You haven't set up your Gym Gig yet.</p>
          <Link to="/gym-owner" className="btn btn-primary" style={{ display: 'inline-block', marginTop: '15px' }}>
            Set Up Facility
          </Link>
        </div>
      )}
    </div>
  );
};

export default ProfileGigTab;
