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
        setCurrentUser(response.data.user);
        navigate('/');
      } else {
        setError(response.data.message || 'Login failed.');
      }
    } catch (err: any) {
      console.error(err);
      setError(err.response?.data?.message || 'Server error.');
    }
  };

  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #f8f9fa, #e9ecef)',
        padding: '20px',
      }}
    >
      <form
        onSubmit={handleSubmit}
        style={{
          background: '#fff',
          padding: '40px 30px',
          borderRadius: '12px',
          width: '100%',
          maxWidth: '400px',
          boxShadow: '0 15px 30px rgba(0,0,0,0.1)',
          transition: 'transform 0.2s',
        }}
      >
        <h2 style={{ textAlign: 'center', marginBottom: '25px', color: '#343a40' }}>Login</h2>
        {error && (
          <div
            style={{
              color: '#e63946',
              background: '#ffe5e5',
              padding: '10px',
              borderRadius: '5px',
              textAlign: 'center',
              marginBottom: '15px',
            }}
          >
            {error}
          </div>
        )}
        <input
          type="text"
          placeholder="Email or Registration No"
          value={identifier}
          onChange={(e) => setIdentifier(e.target.value)}
          required
          style={{
            width: '100%',
            padding: '12px 15px',
            marginBottom: '15px',
            borderRadius: '8px',
            border: '1px solid #ced4da',
            outline: 'none',
            transition: 'border 0.2s',
          }}
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          style={{
            width: '100%',
            padding: '12px 15px',
            marginBottom: '20px',
            borderRadius: '8px',
            border: '1px solid #ced4da',
            outline: 'none',
            transition: 'border 0.2s',
          }}
        />
        <button
          type="submit"
          style={{
            width: '100%',
            padding: '12px',
            background: '#e63946',
            color: '#fff',
            fontWeight: 'bold',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
            transition: 'background 0.2s',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.background = '#d62839')}
          onMouseLeave={(e) => (e.currentTarget.style.background = '#e63946')}
        >
          Login
        </button>
        <p style={{ textAlign: 'center', marginTop: '15px', color: '#495057' }}>
          Don't have an account?{' '}
          <a href="/donor-register" style={{ color: '#e63946', fontWeight: '500' }}>
            Register as Donor
          </a>{' '}
          or{' '}
          <a href="/school-register" style={{ color: '#e63946', fontWeight: '500' }}>
            Register as School
          </a>
        </p>
      </form>
    </div>
  );
};

export default Login;
