import React, { useState } from 'react';

// Yahan (onBack, onRegisterTrainee, onRegisterOwner) likhna zaroori hai
const Login = ({ onBack, onRegisterTrainee, onRegisterOwner }) => { 
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleLogin = (e) => {
    e.preventDefault();
    alert(`Logging in with Email: ${email}`);
    // Backend login logic will go here
  };

  // Aapka Update kiya hua function
  const handleCreateAccount = (role) => {
    if (role === 'Trainee') {
      onRegisterTrainee(); 
    } else if (role === 'Gym Owner') {
      onRegisterOwner(); // Ab ye code Gym Owner ka page kholega 
    }
  };

  return (
    <div>
      <h2>Login to GymSync</h2>
      
      <form onSubmit={handleLogin}>
        <div>
          <label>Email: </label>
          <input 
            type="email" 
            placeholder="Enter Email" 
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required 
          />
        </div>
        
        <div>
          <label>Password: </label>
          <input 
            type="password" 
            placeholder="Enter Password" 
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required 
          />
        </div>
        
        <div>
          <button type="button" onClick={() => alert("Forgot Password clicked")}>
            Forgot Password?
          </button>
        </div>

        <br />
        <button type="submit">Login</button>
      </form>

      <hr />

      <div>
        <h3>Create New Account</h3>
        <button onClick={() => handleCreateAccount('Trainee')}>
          Register as Trainee
        </button>
        <button onClick={() => handleCreateAccount('Gym Owner')}>
          Register as Gym Owner
        </button>
      </div>

      <br />
      <button onClick={onBack}>← Back to Home</button>
    </div>
  );
};

export default Login;