import React from 'react';
import { Link } from 'react-router-dom';

const content = {
  privacy: {
    title: 'Privacy Policy',
    intro: 'This page explains how GymSync uses the information needed to provide your account, fitness tools, gym membership, and community features.',
    sections: [
      ['Information we use', 'GymSync stores account details, profile preferences, workout activity, membership status, and content you choose to share in the community.'],
      ['How we use it', 'We use this information to operate the service, personalize fitness features, process memberships and purchases, and keep the community safe.'],
      ['Your choices', 'You can update your profile, manage your content, download your available account data, or request account deletion from Profile settings.']
    ]
  },
  terms: {
    title: 'Terms of Service',
    intro: 'By using GymSync, you agree to use the platform responsibly and provide accurate account and payment information.',
    sections: [
      ['Community conduct', 'Do not post abusive, misleading, illegal, or infringing content. Report material that violates the community rules.'],
      ['Fitness guidance', 'Workout suggestions are informational and are not a substitute for advice from a qualified health professional.'],
      ['Memberships and purchases', 'Gym memberships and store orders are subject to the selected provider’s availability, pricing, and approval process.']
    ]
  },
  regulations: {
    title: 'Government Regulations',
    intro: 'GymSync is designed to support applicable privacy, consumer-protection, and e-commerce requirements in the areas where it operates.',
    sections: [
      ['Payments', 'Payment records are handled through the selected payment method and are subject to its verification and approval procedures.'],
      ['Data requests', 'Use the Profile page to access available account controls, including data export and account deletion.'],
      ['Questions or complaints', 'Contact the relevant gym or use GymSync’s complaint workflow when you need help resolving a service issue.']
    ]
  }
};

const LegalPage = ({ type }) => {
  const page = content[type] || content.privacy;

  return (
    <div className="container" style={{ minHeight: '70vh', paddingTop: '120px', paddingBottom: '60px', maxWidth: '850px' }}>
      <article className="glass-panel" style={{ padding: 'clamp(24px, 5vw, 48px)' }}>
        <h1>{page.title}</h1>
        <p style={{ color: 'var(--text-secondary)', lineHeight: 1.7 }}>{page.intro}</p>
        {page.sections.map(([heading, body]) => (
          <section key={heading} style={{ marginTop: '28px' }}>
            <h2 style={{ fontSize: '1.2rem' }}>{heading}</h2>
            <p style={{ color: 'var(--text-secondary)', lineHeight: 1.7 }}>{body}</p>
          </section>
        ))}
        <Link to="/home" className="btn btn-primary" style={{ marginTop: '30px' }}>Return to GymSync</Link>
      </article>
    </div>
  );
};

export default LegalPage;
