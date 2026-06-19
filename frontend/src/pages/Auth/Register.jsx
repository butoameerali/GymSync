import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import './Auth.css';

const Register = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('User');
  const [error, setError] = useState('');
  
  const { register } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    const res = await register(name, email, password, role);
    if (res.success) {
      navigate('/dashboard');
    } else {
      setError(res.message);
    }
  };

  return (
    <div className="auth-page">
      <div className="container auth-container">
        <div className="auth-card glass-panel animate-fade-in">
          <h2>Create Account</h2>
          <p className="auth-subtitle">Join the ultimate fitness ecosystem</p>
          
          {error && <div className="error-message">{error}</div>}

          <div className="role-selector">
            <button 
              className={`role-btn ${role === 'User' ? 'active' : ''}`}
              onClick={() => setRole('User')}
            >User</button>
            <button 
              className={`role-btn ${role === 'Trainer' ? 'active' : ''}`}
              onClick={() => setRole('Trainer')}
            >Trainer</button>
            <button 
              className={`role-btn ${role === 'GymOwner' ? 'active' : ''}`}
              onClick={() => setRole('GymOwner')}
            >Gym Owner</button>
          </div>
          
          <form className="auth-form" onSubmit={handleSubmit}>
            <div className="form-group">
              <label>Full Name</label>
              <input 
                type="text" 
                placeholder="Enter your full name" 
                className="form-control" 
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label>Email</label>
              <input 
                type="email" 
                placeholder="Enter your email" 
                className="form-control" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            
            <div className="form-group">
              <label>Password</label>
              <input 
                type="password" 
                placeholder="Create a password" 
                className="form-control" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            
            <button type="submit" className="btn btn-primary w-100">Create Account</button>
          </form>
          
          <div className="auth-divider"><span>OR</span></div>
          
          <button type="button" className="btn btn-glass w-100 google-btn">
            <img src="https://www.google.com/favicon.ico" alt="Google" width="18" height="18" />
            Sign up with Google
          </button>
          
          <p className="auth-footer">
            Already have an account? <Link to="/login">Login here</Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Register;
