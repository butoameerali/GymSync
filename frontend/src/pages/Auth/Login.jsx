import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import './Auth.css';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    const res = await login(email, password);
    if (res.success) {
      navigate('/dashboard'); // Assuming dashboard is next
    } else {
      setError(res.message);
    }
  };

  return (
    <div className="auth-page">
      <div className="container auth-container">
        <div className="auth-card glass-panel animate-fade-in">
          <h2>Welcome Back</h2>
          <p className="auth-subtitle">Login to your GymSync account</p>
          
          {error && <div className="error-message">{error}</div>}

          <form className="auth-form" onSubmit={handleSubmit}>
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
                placeholder="Enter your password" 
                className="form-control" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            
            <div className="auth-options">
              <label className="remember-me">
                <input type="checkbox" /> Remember me
              </label>
              <Link to="/forgot-password" className="forgot-link">Forgot Password?</Link>
            </div>
            
            <button type="submit" className="btn btn-primary w-100">Login</button>
          </form>
          
          <div className="auth-divider"><span>OR</span></div>
          
          <button type="button" className="btn btn-glass w-100 google-btn">
            <img src="https://www.google.com/favicon.ico" alt="Google" width="18" height="18" />
            Continue with Google
          </button>
          
          <p className="auth-footer">
            Don't have an account? <Link to="/register">Register here</Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
