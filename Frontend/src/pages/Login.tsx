// Login.tsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import '../css/App.css';

interface LoginResponse {
  success: boolean;
  user?: {
    userType: 'donor' | 'school';
    donorName?: string;
    schoolName?: string;
    email?: string;
    phone?: string;
    address?: string;
    logoUrl?: string;
  };
  message?: string;
}

const Login: React.FC<{ setCurrentUser: (user: any) => void }> = ({ setCurrentUser }) => {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    try {
      const response = await axios.post<LoginResponse>('http://127.0.0.1:8000/api/login', { identifier, password });
      if (response.data.success && response.data.user) {
        setCurrentUser(response.data.user); // update user in Layout or context
        navigate('/'); // redirect to home
      } else {
        setError(response.data.message || 'Login failed.');
      }
    } catch (err: any) {
      console.error(err);
      setError(err.response?.data?.message || 'Server error.');
    }
  };

  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: '#f9f9f9' }}>
      <form
        onSubmit={handleSubmit}
        style={{
          background: '#fff',
          padding: '30px',
          borderRadius: '10px',
          width: '350px',
          boxShadow: '0 0 10px rgba(0,0,0,0.1)',
        }}
      >
        <h2 style={{ textAlign: 'center' }}>Login</h2>
        {error && <div style={{ color: 'red', textAlign: 'center', marginBottom: '10px' }}>{error}</div>}
        <input
          type="text"
          placeholder="Email or Registration No"
          value={identifier}
          onChange={(e) => setIdentifier(e.target.value)}
          required
          style={{ width: '100%', padding: '10px', margin: '10px 0', borderRadius: '5px', border: '1px solid #ccc' }}
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          style={{ width: '100%', padding: '10px', margin: '10px 0', borderRadius: '5px', border: '1px solid #ccc' }}
        />
        <button
          type="submit"
          style={{ width: '100%', padding: '10px', background: '#e63946', color: '#fff', border: 'none', borderRadius: '5px', cursor: 'pointer' }}
        >
          Login
        </button>
        <p style={{ textAlign: 'center', marginTop: '10px' }}>
          Don't have an account?{' '}
          <a href="/donor-register" style={{ color: '#e63946' }}>
            Register as Donor
          </a>{' '}
          or{' '}
          <a href="/school-register" style={{ color: '#e63946' }}>
            Register as School
          </a>
        </p>
      </form>
    </div>
  );
};

export default Login;
