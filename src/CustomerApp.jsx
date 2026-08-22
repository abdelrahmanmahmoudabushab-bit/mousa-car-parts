import React, { useState, useEffect } from 'react';
import { RefreshCw, Languages, ShoppingBag, PhoneCall, ShieldCheck, Car } from 'lucide-react';
import CustomerStore from './components/CustomerStore';

export default function CustomerApp() {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [lang, setLang] = useState('ar');

  const fetchBootstrapData = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await fetch('/api/bootstrap');
      if (!response.ok) throw new Error('Failed to connect to Mousa POS Backend API');
      const data = await response.json();
      setProducts(data.products || []);
      setCategories(data.categories || []);
    } catch (err) {
      console.error('Customer Store API Error:', err);
      setError('Unable to load catalog from server. Make sure POS backend is running on http://localhost:5000');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchBootstrapData();
  }, []);

  const handlePlaceOrder = async (orderPayload) => {
    const response = await fetch('/api/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(orderPayload)
    });
    if (!response.ok) throw new Error('Failed to submit customer order');
    const data = await response.json();
    return data.order;
  };

  const toggleLanguage = () => {
    setLang(prev => prev === 'ar' ? 'en' : 'ar');
  };

  return (
    <div dir={lang === 'ar' ? 'rtl' : 'ltr'} style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--bg-main)' }}>
      {/* Unified Single Top Customer Header Bar */}
      <header style={{
        background: '#ffffff',
        borderBottom: '1px solid var(--border-color)',
        padding: '0.85rem 2rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        position: 'sticky',
        top: 0,
        zIndex: 100,
        boxShadow: '0 2px 10px rgba(15, 23, 42, 0.04)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
          <div style={{
            width: '40px',
            height: '40px',
            borderRadius: '10px',
            background: 'linear-gradient(135deg, #2563eb, #1d4ed8)',
            color: 'white',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 4px 12px rgba(37, 99, 235, 0.3)'
          }}>
            <Car size={22} />
          </div>
          <div>
            <div style={{ fontFamily: 'var(--font-heading)', fontWeight: '800', fontSize: '1.15rem', color: '#0f172a' }}>
              MOUSA AUTO PARTS · STORE
            </div>
            <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: '600' }}>
              {lang === 'ar' ? 'مستودع موسى لقطع غيار السيارات الكهرومائية' : 'Official Online OEM Parts Store'}
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.78rem', color: '#047857', background: '#ecfdf5', padding: '0.35rem 0.75rem', borderRadius: '999px', border: '1px solid #a7f3d0', fontWeight: '700' }}>
            <ShieldCheck size={15} /> {lang === 'ar' ? 'قطع أصلية 100%' : '100% Genuine OEM Direct Import'}
          </div>

          <button
            onClick={toggleLanguage}
            style={{
              padding: '0.45rem 0.85rem',
              borderRadius: '8px',
              background: '#eff6ff',
              border: '1px solid #bfdbfe',
              color: '#2563eb',
              fontWeight: '700',
              fontSize: '0.82rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              fontFamily: "'Cairo', sans-serif"
            }}
          >
            <Languages size={15} />
            {lang === 'ar' ? '🇸🇦 العربية' : '🇬🇧 English'}
          </button>

          <a
            href="/pos"
            style={{
              padding: '0.45rem 0.85rem',
              borderRadius: '8px',
              background: '#f8fafc',
              border: '1px solid #cbd5e1',
              color: '#475569',
              fontWeight: '700',
              fontSize: '0.8rem',
              textDecoration: 'none',
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem'
            }}
          >
            🛒 {lang === 'ar' ? 'دخول الكاشير' : 'Cashier POS'}
          </a>
        </div>
      </header>

      {/* Body View */}
      {loading ? (
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.6rem', color: '#64748b', minHeight: '400px' }}>
          <RefreshCw className="spin" size={24} style={{ color: '#2563eb' }} />
          <span>Connecting to Mousa Parts Database...</span>
        </div>
      ) : error ? (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '2rem', textAlign: 'center', minHeight: '400px' }}>
          <div style={{ fontSize: '1.2rem', fontWeight: '800', color: '#b91c1c' }}>⚠️ Server Connection Issue</div>
          <p style={{ color: '#64748b', fontSize: '0.9rem', margin: '0.5rem 0 1rem 0' }}>{error}</p>
          <button onClick={fetchBootstrapData} className="btn-primary">
            <RefreshCw size={16} /> Retry Connecting
          </button>
        </div>
      ) : (
        <CustomerStore
          products={products}
          lang={lang}
          onPlaceOrder={handlePlaceOrder}
        />
      )}

      {/* Store Footer */}
      <footer style={{ background: '#0f172a', color: '#94a3b8', padding: '1.5rem 2rem', textAlign: 'center', fontSize: '0.82rem', borderTop: '1px solid var(--border-color)', marginTop: 'auto' }}>
        <div>© 2026 Mousa Auto Parts Store · All Genuine OEM Parts Direct Import</div>
        <div style={{ marginTop: '0.3rem', color: '#64748b' }}>Connected Live to POS System Server (`http://localhost:5000`)</div>
      </footer>
    </div>
  );
}
