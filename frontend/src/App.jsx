
import { useState } from 'react';
import GigList from './GigList.jsx';
import './App.css';

function App() {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const [isLogin, setIsLogin] = useState(false);
  
  const [showGigs, setShowGigs] = useState(false);

  const switchForm = () => {
    setIsLogin(!isLogin);
    setMessage('');
    setUsername('');
    setEmail('');
    setPassword('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage('');

    // Validate required fields
    if (!email.trim() || !password || (!isLogin && !username.trim())) {
      setMessage('Please fill in all fields.');
      return;
    }

    // Validate email format
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setMessage('Please enter a valid email address.');
      return;
    }

    // Validate password length for registration
    if (!isLogin && password.length < 8) {
      setMessage('Password must be at least 8 characters.');
      return;
    }

    const endpoint = isLogin ? 'login' : 'register';

    const formData = isLogin
      ? {
          email: email.trim(),
          password
        }
      : {
          username: username.trim(),
          email: email.trim(),
          password
        };

    try {
      const response = await fetch(
        `https://localhost:5000/api/auth/${endpoint}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(formData)
        }
      );

      const data = await response.json();

      if (!response.ok) {
        if (response.status === 401) {
          setMessage('Incorrect email or password.');
        } else if (response.status === 409) {
          setMessage('Username or email is already in use.');
        } else if (response.status === 400) {
          setMessage('Please check your details and try again.');
        } else {
          setMessage('Something went wrong. Please try again.');
        }
        return;
      }

      if (isLogin) {
        const token = data.token ?? data.data?.token;
        const loggedInUser =
          data.user ?? data.data?.user ?? data;

        if (token) {
          sessionStorage.setItem('hustlehub_token', token);
        }

        setMessage(
          `Welcome back, ${loggedInUser.username || 'user'}!`
        );
      } else {
        setMessage('Registration successful! You can now log in.');
      }

      setUsername('');
      setEmail('');
      setPassword('');
    } catch (error) {
      console.error('Authentication request failed:', error);
      setMessage('Cannot connect to the server. Please try again.');
    }
  };

  if (showGigs) {
  return (
    <div>
      <button
        type="button"
        onClick={() => setShowGigs(false)}
        style={{ margin: '15px', padding: '10px 20px' }}
      >
        ← Back to Login / Register
      </button>

      <GigList />
    </div>
  );
}

  return (
    <div className="container">
      <div className="form-card">
        <h1>HustleHub+</h1>
        <p>Find opportunities. Build your hustle.</p>

        <h2>{isLogin ? 'Login' : 'Create Account'}</h2>

        <form onSubmit={handleSubmit}>
          {!isLogin && (
            <>
              <label htmlFor="username">Username</label>
              <input
                id="username"
                type="text"
                placeholder="Enter your username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
              />
            </>
          )}

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
            placeholder={isLogin ? 'Enter your password' : 'Create a password'}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />

          <button type="submit">
            {isLogin ? 'Login' : 'Register'}
          </button>
        </form>

        {message && (
          <p role="status" className="message">
            {message}
          </p>
        )}
          <button
            type="button"
            onClick={() => setShowGigs(true)}
            style={{ marginTop: '15px' }}
          >
            Browse Gigs
          </button>
                  <p className="login-text">
          {isLogin
            ? "Don't have an account?"
            : 'Already have an account?'}{' '}

          <button
            type="button"
            className="switch-button"
            onClick={switchForm}
          >
            {isLogin ? 'Register here' : 'Login here'}
          </button>
        </p>
      </div>
    </div>
  );
}

export default App;
