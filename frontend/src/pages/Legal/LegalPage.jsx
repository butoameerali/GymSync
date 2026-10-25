import React from 'react';
import { Link } from 'react-router-dom';
import MedicalDisclaimer from '../../components/common/MedicalDisclaimer';

const content = {
  privacy: {
    title: 'Privacy Policy',
    intro: 'This page explains how GymSync uses the information needed to provide your account, fitness tools, gym membership, and community features.',
    sections: [
      ['Information we use', 'GymSync stores account details, profile preferences, workout activity, membership status, and content you choose to share in the community.'],
      ['How we use it', 'We use this information to operate the service, personalize fitness features, process memberships and purchases, and keep the community safe.'],
      ['Your choices', 'You can update your profile, manage your content, download your available account data, or request account deletion from Profile settings.'],
      ['Medical Disclaimer', 'GymSync provides general fitness information and a way to follow plans made by trainers; it is not a medical service; it does not diagnose, treat, or prescribe; anyone with a health condition or injury must consult their own physician before starting any exercise or diet; users are responsible for their own health decisions.']
    ]
  },
  terms: {
    title: 'Terms of Service',
    intro: 'By using GymSync, you agree to use the platform responsibly and provide accurate account and payment information.',
    sections: [
      ['Community conduct', 'Do not post abusive, misleading, illegal, or infringing content. Report material that violates the community rules.'],
      ['Fitness guidance', 'Workout suggestions are informational and are not a substitute for advice from a qualified health professional.'],
      ['Medical Disclaimer', 'GymSync provides general fitness information and a way to follow plans made by trainers; it is not a medical service; it does not diagnose, treat, or prescribe; anyone with a health condition or injury must consult their own physician before starting any exercise or diet; users are responsible for their own health decisions.'],
      ['Memberships and purchases', 'Gym memberships and store orders are subject to the selected provider’s availability, pricing, and approval process.']
    ]
  },
  regulations: {
    title: 'Government Regulations',
    intro: 'GymSync is designed to support applicable privacy, consumer-protection, and e-commerce requirements in the areas where it operates.',
    sections: [
      ['Payments', 'Payment records are handled through the selected payment method and are subject to its verification and approval procedures.'],
      ['Data requests', 'Use the Profile page to access available account controls, including data export and account deletion.'],
      ['Questions or complaints', 'Contact the relevant gym or use GymSync’s complaint workflow when you need help resolving a service issue.'],
      ['Medical Disclaimer', 'GymSync provides general fitness information and a way to follow plans made by trainers; it is not a medical service; it does not diagnose, treat, or prescribe; anyone with a health condition or injury must consult their own physician before starting any exercise or diet; users are responsible for their own health decisions.']
    ]
  },
  disclaimer: {
    title: 'Medical & Dietary Disclaimer',
    intro: 'Please review this mandatory safety notice carefully before using GymSync workouts, tracking, or nutritional protocols.',
    sections: [
      ['Medical Disclaimer', 'GymSync provides general fitness information and a way to follow plans made by trainers; it is not a medical service; it does not diagnose, treat, or prescribe; anyone with a health condition or injury must consult their own physician before starting any exercise or diet; users are responsible for their own health decisions.'],
      ['Not a Healthcare Provider', 'Content, workouts, and tools provided are for educational and informational purposes only and do not constitute medical, diagnostic, or dietary prescription advice. Always consult a qualified physician before beginning any new exercise or nutrition program.'],
      ['User Responsibility', 'Users are solely responsible for listening to their own bodies, respecting personal physical limits, and ensuring proper technique and form. Stop exercising immediately if you feel pain, dizziness, or shortness of breath.']
    ]
  }
};

const LegalPage = ({ type = 'privacy' }) => {
  const page = content[type] || content.privacy;

  return (
    <div className="container" style={{ minHeight: '70vh', paddingTop: '0', paddingBottom: '60px', maxWidth: '850px' }}>
      <article className="glass-panel" style={{ padding: 'clamp(24px, 5vw, 48px)' }}>
        <h1>{page.title}</h1>
        <p style={{ color: 'var(--text-secondary)', lineHeight: 1.7 }}>{page.intro}</p>
        {page.sections.map(([heading, body]) => (
          <section key={heading} style={{ marginTop: '28px' }}>
            <h2 style={{ fontSize: '1.2rem', color: heading === 'Medical Disclaimer' ? '#f59e0b' : 'inherit' }}>{heading}</h2>
            <p style={{ color: 'var(--text-secondary)', lineHeight: 1.7 }}>{body}</p>
          </section>
        ))}
        
        <MedicalDisclaimer variant="footer" style={{ marginTop: '32px' }} />

        <Link to="/home" className="btn btn-primary" style={{ marginTop: '24px' }}>Return to GymSync</Link>
      </article>
    </div>
  );
};

export default LegalPage;
