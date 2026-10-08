
import { useState } from 'react';
import './App.css';

function App() {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');

  
const handleSubmit = async (e) => {
  e.preventDefault();
  setMessage('');

  if (!username.trim() || !email.trim() || !password) {
    setMessage('Please fill in all fields.');
    return;
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    setMessage('Please enter a valid email address.');
    return;
  }

  if (password.length < 8) {
    setMessage('Password must be at least 8 characters.');
    return;
  }

  try {
    const response = await fetch(
      'https://localhost:5000/api/auth/register',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          username: username.trim(),
          email: email.trim(),
          password
        })
      }
    );

    const data = await response.json();

    if (!response.ok) {
      if (response.status === 409) {
        setMessage('Username or email is already in use.');
      } else if (response.status === 400) {
        setMessage('Please check your registration details.');
      } else {
        setMessage('Registration failed. Please try again.');
      }
      return;
    }

    setMessage('Registration successful! You can now log in.');
    setUsername('');
    setEmail('');
    setPassword('');

  } catch (error) {
    console.error('Registration request failed:', error);
    setMessage('Cannot connect to the server. Please try again.');
  }
};


  return (
    <div className="container">
      <div className="form-card">
        <h1>HustleHub+</h1>
        <p>Find opportunities. Build your hustle.</p>

        <h2>Create Account</h2>

        <form onSubmit={handleSubmit}>
          <label htmlFor="username">Username</label>
          <input
            id="username"
            type="text"
            placeholder="Enter your username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
          />

          <label htmlFor="email">Email</label>
          <input
            id="email"
            type="email"
            placeholder="Enter your email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />

          <label htmlFor="password">Password</label>
          <input
            id="password"
            type="password"
            placeholder="Create a password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />

          <button type="submit">Register</button>
        </form>

        {message && <p role="status" className="message">{message}</p>}

        <p className="login-text">
          Already have an account? Login coming soon.
        </p>
      </div>
    </div>
  );
}

export default App;
