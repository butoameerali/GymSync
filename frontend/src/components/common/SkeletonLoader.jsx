import React from 'react';

const SkeletonLoader = ({ height = '150px', width = '100%', borderRadius = '12px' }) => {
  return (
    <div style={{
      height,
      width,
      borderRadius,
      background: 'linear-gradient(90deg, rgba(255,255,255,0.03) 25%, rgba(255,255,255,0.08) 50%, rgba(255,255,255,0.03) 75%)',
      backgroundSize: '200% 100%',
      animation: 'skeletonShimmer 1.5s infinite'
    }}>
      <style>{`
        @keyframes skeletonShimmer {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
      `}</style>
    </div>
  );
};

export default SkeletonLoader;
