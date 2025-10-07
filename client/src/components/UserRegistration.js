import React, { useState } from 'react';

const UserRegistration = ({ onRegister }) => {
  const [username, setUsername] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    
    // Validate username
    if (!username.trim()) {
      setError('Username is required');
      return;
    }
    
    if (username.length > 15) {
      setError('Username must be 15 characters or less');
      return;
    }
    
    // Call parent handler
    onRegister(username);
  };

  return (
    <div className="form-container">
      <h2>Enter Your Username</h2>
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="username">Username</label>
          <input
            type="text"
            id="username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="Enter your username"
            maxLength="15"
            autoFocus
          />
          {error && <p className="error-message">{error}</p>}
        </div>
        <div className="form-actions">
          <button type="submit" className="btn btn-primary">
            Continue
          </button>
        </div>
      </form>
    </div>
  );
};

export default UserRegistration;