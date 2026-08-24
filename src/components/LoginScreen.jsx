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
      fontFamily: "'Cairo', sans-serif",
      padding: '1.5rem',
      boxSizing: 'border-box'
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

          <h1 style={{ fontSize: '1.6rem', fontWeight: '900', color: '#0f172a', margin: '0 0 0.3rem', letterSpacing: '-0.02em' }}>
            MOUSA CAR PARTS
          </h1>
          <p style={{ fontSize: '0.88rem', color: '#64748b', fontWeight: '700', margin: 0 }}>
            Auto Parts Inventory & POS System · موسى لقطع السيارات
          </p>
        </div>

        {/* Error Alert */}
        {error && (
          <div style={{
            background: '#fef2f2',
            border: '1px solid #fecaca',
            borderRadius: '12px',
            padding: '0.75rem 1rem',
            marginBottom: '1.25rem',
            color: '#b91c1c',
            fontSize: '0.85rem',
            fontWeight: '700',
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
            <label style={{ fontSize: '0.82rem', fontWeight: '800', color: '#475569', marginBottom: '0.4rem', display: 'block' }}>
              Username / اسم المستخدم
            </label>
            <div style={{ position: 'relative' }}>
              <User size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: '#64748b' }} />
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter username (e.g. admin)"
                style={{
                  width: '100%',
                  height: '46px',
                  padding: '0 1rem 0 2.8rem',
                  background: '#f8fafc',
                  border: '1.5px solid #cbd5e1',
                  borderRadius: '12px',
                  color: '#0f172a',
                  fontSize: '0.92rem',
                  fontWeight: '700',
                  outline: 'none',
                  boxSizing: 'border-box'
                }}
              />
            </div>
          </div>

          <div>
            <label style={{ fontSize: '0.82rem', fontWeight: '800', color: '#475569', marginBottom: '0.4rem', display: 'block' }}>
              Password / كلمة المرور
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
                  height: '46px',
                  padding: '0 1rem 0 2.8rem',
                  background: '#f8fafc',
                  border: '1.5px solid #cbd5e1',
                  borderRadius: '12px',
                  color: '#0f172a',
                  fontSize: '0.92rem',
                  fontWeight: '700',
                  outline: 'none',
                  boxSizing: 'border-box'
                }}
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
              marginTop: '0.5rem',
              height: '48px',
              background: '#0f172a',
              color: '#ffffff',
              border: 'none',
              borderRadius: '12px',
              fontSize: '0.95rem',
              fontWeight: '800',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem',
              width: '100%',
              cursor: 'pointer',
              boxShadow: '0 4px 14px rgba(15, 23, 42, 0.2)',
              fontFamily: "'Cairo', sans-serif"
            }}
          >
            <LogIn size={18} />
            {loading ? 'Authenticating...' : 'Sign In to System'}
          </button>
        </form>

        {/* Quick Demo Login Preset Buttons */}
        <div style={{ marginTop: '1.75rem', paddingTop: '1.25rem', borderTop: '1px solid #f1f5f9' }}>
          <div style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: '700', textAlign: 'center', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.3rem' }}>
            <Sparkles size={14} style={{ color: '#d97706' }} /> Quick One-Click Demo Login
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem' }}>
            <button
              onClick={() => handleQuickDemoLogin('admin')}
              style={{
                padding: '0.6rem 0.3rem',
                fontSize: '0.78rem',
                borderRadius: '10px',
                border: '1px solid #ddd6fe',
                background: '#f3e8ff',
                color: '#6b21a8',
                fontWeight: '800',
                cursor: 'pointer',
                fontFamily: "'Cairo', sans-serif"
              }}
            >
              👑 Admin
            </button>

            <button
              onClick={() => handleQuickDemoLogin('manager')}
              style={{
                padding: '0.6rem 0.3rem',
                fontSize: '0.78rem',
                borderRadius: '10px',
                border: '1px solid #bfdbfe',
                background: '#eff6ff',
                color: '#1e40af',
                fontWeight: '800',
                cursor: 'pointer',
                fontFamily: "'Cairo', sans-serif"
              }}
            >
              👔 Manager
            </button>

            <button
              onClick={() => handleQuickDemoLogin('cashier')}
              style={{
                padding: '0.6rem 0.3rem',
                fontSize: '0.78rem',
                borderRadius: '10px',
                border: '1px solid #a7f3d0',
                background: '#ecfdf5',
                color: '#065f46',
                fontWeight: '800',
                cursor: 'pointer',
                fontFamily: "'Cairo', sans-serif"
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
