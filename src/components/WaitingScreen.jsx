import React, { useState, useEffect } from 'react';
import { Car, RefreshCw, Sparkles, ShieldCheck, Database, Zap } from 'lucide-react';

export default function WaitingScreen({ lang = 'ar', error = '', onRetry }) {
  const [progress, setProgress] = useState(15);
  const [tipIndex, setTipIndex] = useState(0);

  const tipsAr = [
    '💡 معلومة: يمكنك البحث عن قطع الغيار برقم OEM، الاسم بالعربي، أو الاسم بالصيني.',
    '⚡ معلومة: النظام يعمل أوفلاين وسحابياً ويقوم بمزامنة البيانات تلقائياً كل 30 دقيقة.',
    '🚗 معلومة: يدعم النظام كود VIN وموديلات BYD Seagull, Dolphin, Han, Tang, Song.',
    '📑 معلومة: الفواتير مطابقة لمعايير الهيئة الضريبية ويمكن طباعتها على طابعات Thermal 80mm.'
  ];

  const tipsEn = [
    '💡 Tip: Search parts instantly by OEM code, Arabic, or Chinese character name.',
    '⚡ Tip: Works 100% offline & cloud with automatic 30-minute background database sync.',
    '🚗 Tip: Supports VIN decoding for BYD Seagull, Dolphin, Han, Tang, and Song models.',
    '📑 Tip: Thermal 80mm receipt printing supported for fast counter checkout.'
  ];

  const tips = lang === 'ar' ? tipsAr : tipsEn;

  // Animate Progress Bar
  useEffect(() => {
    const timer = setInterval(() => {
      setProgress(prev => {
        if (prev >= 92) return prev;
        return prev + Math.floor(Math.random() * 15) + 5;
      });
    }, 250);

    return () => clearInterval(timer);
  }, []);

  // Cycle Tips
  useEffect(() => {
    const tipTimer = setInterval(() => {
      setTipIndex(prev => (prev + 1) % tips.length);
    }, 3000);

    return () => clearInterval(tipTimer);
  }, [tips.length]);

  return (
    <div style={{
      minHeight: '100vh',
      width: '100vw',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)',
      fontFamily: "'Cairo', sans-serif",
      padding: '2rem',
      boxSizing: 'border-box'
    }}>
      <div style={{
        width: '100%',
        maxWidth: '480px',
        background: '#ffffff',
        border: '2px solid #e2e8f0',
        borderRadius: '28px',
        padding: '2.5rem 2rem',
        boxShadow: '0 25px 50px -12px rgba(15, 23, 42, 0.1)',
        textAlign: 'center',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center'
      }}>
        {/* Animated Brand Icon */}
        <div style={{
          width: '76px',
          height: '76px',
          borderRadius: '22px',
          background: '#0f172a',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: '1.25rem',
          boxShadow: '0 12px 24px rgba(15, 23, 42, 0.2)',
          position: 'relative'
        }}>
          <Car size={40} style={{ color: '#ffffff', animation: 'bounce 2s infinite' }} />
          <div style={{
            position: 'absolute',
            top: '-6px',
            right: '-6px',
            background: '#d97706',
            borderRadius: '50%',
            padding: '4px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <Zap size={14} style={{ color: '#ffffff' }} />
          </div>
        </div>

        <h1 style={{ fontSize: '1.6rem', fontWeight: '900', color: '#0f172a', margin: '0 0 0.3rem', letterSpacing: '-0.02em' }}>
          MOUSA CAR PARTS
        </h1>
        <p style={{ fontSize: '0.88rem', color: '#64748b', fontWeight: '700', margin: '0 0 1.75rem 0' }}>
          {lang === 'ar' ? 'موسى لقطع السيارات · جاري فتح النظام وسحب قطع الغيار...' : 'Auto Parts Inventory & POS · Preparing system catalog...'}
        </p>

        {/* Progress Bar Container */}
        <div style={{ width: '100%', background: '#f1f5f9', borderRadius: '14px', height: '14px', overflow: 'hidden', border: '1px solid #cbd5e1', marginBottom: '0.75rem', position: 'relative' }}>
          <div style={{
            width: `${progress}%`,
            height: '100%',
            background: 'linear-gradient(90deg, #2563eb, #d97706)',
            borderRadius: '14px',
            transition: 'width 0.3s ease'
          }} />
        </div>

        {/* Status Message */}
        <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', fontSize: '0.82rem', fontWeight: '800', color: '#475569', marginBottom: '1.75rem' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            <RefreshCw size={14} className="spin" style={{ color: '#2563eb' }} />
            {lang === 'ar' ? 'جاري التحميل والسحب...' : 'Loading system data...'}
          </span>
          <span className="mono" style={{ color: '#0f172a' }}>{progress}%</span>
        </div>

        {/* Error State */}
        {error ? (
          <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '14px', padding: '1rem', width: '100%', marginBottom: '1rem' }}>
            <div style={{ fontSize: '0.88rem', fontWeight: '800', color: '#b91c1c', marginBottom: '0.5rem' }}>
              ⚠️ {error}
            </div>
            <button onClick={onRetry} className="btn-primary" style={{ padding: '0.6rem 1.25rem', fontSize: '0.85rem', fontWeight: '800', width: '100%' }}>
              <RefreshCw size={16} /> {lang === 'ar' ? 'إعادة المحاولة الان 🔄' : 'Retry Connection Now'}
            </button>
          </div>
        ) : (
          /* Tips Carousel Box */
          <div style={{
            background: '#f8fafc',
            border: '1px solid #cbd5e1',
            borderRadius: '16px',
            padding: '1rem 1.1rem',
            width: '100%',
            textAlign: 'center',
            fontSize: '0.83rem',
            color: '#334155',
            fontWeight: '700',
            lineHeight: '1.5',
            minHeight: '54px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxSizing: 'border-box'
          }}>
            {tips[tipIndex]}
          </div>
        )}
      </div>
    </div>
  );
}
