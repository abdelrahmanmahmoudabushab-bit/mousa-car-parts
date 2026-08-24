import React, { useState } from 'react';
import { Lock, User, KeyRound, LogIn, ShieldAlert, Sparkles, Car } from 'lucide-react';

export default function LoginScreen({ onLoginSuccess }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (e) => {
    if (e) e.preventDefault();
    if (!username || !password) {
      setError('Please enter username and password.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });

      const data = await res.json();
      if (res.ok && data.token) {
        onLoginSuccess(data.token, data.user);
      } else {
        setError(data.error || 'Invalid username or password');
      }
    } catch (err) {
      setError('Server connection error. Make sure backend API is running.');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickDemoLogin = (userType) => {
    if (userType === 'admin') {
      setUsername('admin');
      setPassword('admin123');
    } else if (userType === 'manager') {
      setUsername('manager');
      setPassword('manager123');
    } else if (userType === 'cashier') {
      setUsername('cashier');
      setPassword('cashier123');
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      width: '100vw',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)',
      fontFamily: 'var(--font-body)',
      padding: '1.5rem'
    }}>
      <div style={{
        width: '100%',
        maxWidth: '440px',
        background: '#ffffff',
        border: '1px solid #cbd5e1',
        borderRadius: '24px',
        padding: '2.5rem 2rem',
        boxShadow: '0 20px 40px rgba(15, 23, 42, 0.08)',
        color: '#0f172a'
      }}>
        {/* Header Branding */}
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{
            width: '64px',
            height: '64px',
            borderRadius: '18px',
            background: '#0f172a',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 1rem',
            boxShadow: '0 8px 20px rgba(15, 23, 42, 0.2)'
          }}>
            <Car size={34} style={{ color: 'white' }} />
          </div>

          <h1 style={{ fontSize: '1.6rem', fontWeight: '900', fontFamily: 'var(--font-heading)', color: '#0f172a', margin: '0 0 0.3rem' }}>
            MOUSA CAR PARTS
          </h1>
          <p style={{ fontSize: '0.88rem', color: '#64748b', fontWeight: '600', margin: 0 }}>
            Auto Parts Inventory & POS System · موسى لقطع السيارات
          </p>
        </div>

        {/* Error Alert */}
        {error && (
          <div style={{
            background: 'rgba(239, 68, 68, 0.15)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            borderRadius: '10px',
            padding: '0.75rem 1rem',
            marginBottom: '1.25rem',
            color: '#fca5a5',
            fontSize: '0.85rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.6rem'
          }}>
            <ShieldAlert size={18} />
            <span>{error}</span>
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '1.1rem' }}>
          <div>
            <label style={{ fontSize: '0.8rem', fontWeight: '600', color: '#cbd5e1', marginBottom: '0.4rem', display: 'block' }}>
              Username
            </label>
            <div style={{ position: 'relative' }}>
              <User size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: '#64748b' }} />
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter username"
                style={{
                  width: '100%',
                  padding: '0.75rem 1rem 0.75rem 2.8rem',
                  background: 'rgba(15, 23, 42, 0.6)',
                  border: '1px solid rgba(255, 255, 255, 0.15)',
                  borderRadius: '10px',
                  color: 'white',
                  fontSize: '0.9rem',
                  outline: 'none'
                }}
              />
            </div>
          </div>

          <div>
            <label style={{ fontSize: '0.8rem', fontWeight: '600', color: '#cbd5e1', marginBottom: '0.4rem', display: 'block' }}>
              Password
            </label>
            <div style={{ position: 'relative' }}>
              <KeyRound size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: '#64748b' }} />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password"
                style={{
                  width: '100%',
                  padding: '0.75rem 1rem 0.75rem 2.8rem',
                  background: 'rgba(15, 23, 42, 0.6)',
                  border: '1px solid rgba(255, 255, 255, 0.15)',
                  borderRadius: '10px',
                  color: 'white',
                  fontSize: '0.9rem',
                  outline: 'none'
                }}
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn-primary"
            style={{
              marginTop: '0.5rem',
              padding: '0.8rem',
              fontSize: '0.95rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem',
              width: '100%'
            }}
          >
            <LogIn size={18} />
            {loading ? 'Authenticating...' : 'Sign In to System'}
          </button>
        </form>

        {/* Quick Demo Login Preset Buttons */}
        <div style={{ marginTop: '2rem', paddingTop: '1.25rem', borderTop: '1px solid rgba(255, 255, 255, 0.1)' }}>
          <div style={{ fontSize: '0.78rem', color: '#94a3b8', textAlign: 'center', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.3rem' }}>
            <Sparkles size={14} style={{ color: '#fbbf24' }} /> Quick One-Click Demo Login
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem' }}>
            <button
              onClick={() => handleQuickDemoLogin('admin')}
              style={{
                padding: '0.5rem 0.3rem',
                fontSize: '0.75rem',
                borderRadius: '8px',
                border: '1px solid rgba(168, 85, 247, 0.4)',
                background: 'rgba(168, 85, 247, 0.15)',
                color: '#c084fc',
                fontWeight: '600',
                cursor: 'pointer'
              }}
            >
              👑 Admin
            </button>

            <button
              onClick={() => handleQuickDemoLogin('manager')}
              style={{
                padding: '0.5rem 0.3rem',
                fontSize: '0.75rem',
                borderRadius: '8px',
                border: '1px solid rgba(59, 130, 246, 0.4)',
                background: 'rgba(59, 130, 246, 0.15)',
                color: '#60a5fa',
                fontWeight: '600',
                cursor: 'pointer'
              }}
            >
              👔 Manager
            </button>

            <button
              onClick={() => handleQuickDemoLogin('cashier')}
              style={{
                padding: '0.5rem 0.3rem',
                fontSize: '0.75rem',
                borderRadius: '8px',
                border: '1px solid rgba(16, 185, 129, 0.4)',
                background: 'rgba(16, 185, 129, 0.15)',
                color: '#34d399',
                fontWeight: '600',
                cursor: 'pointer'
              }}
            >
              🛒 Cashier
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
