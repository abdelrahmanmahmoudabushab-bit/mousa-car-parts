import React, { useState } from 'react';
import { Car, Search, XCircle, Camera } from 'lucide-react';
import QrScannerModal from './QrScannerModal';

export default function VinLookupBar({ searchVal, onSearchChange, onSearchSubmit, selectedModel, onModelChange, selectedYear, onYearChange, matchedCount, totalCount }) {
  const [isScannerOpen, setIsScannerOpen] = useState(false);

  const models = [
    { id: 'all', name: 'جميع موديلات BYD' },
    { id: 'BYD Seagull', name: 'بي واي دي سيجول (BYD Seagull)' },
    { id: 'BYD Dolphin', name: 'بي واي دي دولفين (BYD Dolphin)' },
    { id: 'BYD Atto 3', name: 'بي واي دي أتو 3 (BYD Atto 3)' },
    { id: 'BYD Tang', name: 'بي واي دي تانج (BYD Tang)' },
    { id: 'BYD Han', name: 'بي واي دي هان (BYD Han)' }
  ];

  const years = ['all', '2026', '2025', '2024', '2023', '2022'];

  const handleReset = () => {
    onSearchChange('');
    onModelChange('all');
    onYearChange('all');
  };

  const isFiltered = searchVal || selectedModel !== 'all' || selectedYear !== 'all';

  const handleScanSuccess = (scannedCode) => {
    onSearchChange(scannedCode);
    if (onSearchSubmit) {
      onSearchSubmit();
    }
  };

  return (
    <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '16px', padding: '1rem 1.15rem', boxShadow: '0 4px 16px -2px rgba(15, 23, 42, 0.05)', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
      
      {/* 🚀 BIG BOLD SEARCH BAR */}
      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: '1 1 200px' }}>
          <Search size={20} style={{ position: 'absolute', right: '0.9rem', top: '50%', transform: 'translateY(-50%)', color: '#d97706' }} />
          <input
            type="text"
            value={searchVal}
            onChange={(e) => onSearchChange(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && onSearchSubmit) onSearchSubmit(); }}
            placeholder="ابحث OEM، VIN، أو اسم القطعة بالعربي (فحمات، صدام)..."
            style={{
              width: '100%',
              minHeight: '46px',
              paddingRight: '2.75rem',
              paddingLeft: '0.85rem',
              fontSize: '0.92rem',
              fontWeight: '700',
              color: '#0f172a',
              background: '#f8fafc',
              border: '2px solid #e2e8f0',
              borderRadius: '12px',
              fontFamily: "'Cairo', sans-serif",
              outline: 'none',
              transition: 'border-color 0.2s ease'
            }}
          />
        </div>

        <button
          onClick={() => setIsScannerOpen(true)}
          style={{
            minHeight: '46px',
            padding: '0 1rem',
            borderRadius: '12px',
            background: '#fffbeb',
            border: '1px solid #fde68a',
            color: '#b45309',
            fontSize: '0.88rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.4rem',
            whiteSpace: 'nowrap',
            fontWeight: '800',
            cursor: 'pointer',
            flexShrink: 0
          }}
          title="Scan QR / Barcode with Camera"
        >
          <Camera size={18} /> مسح الكاميرا 📷
        </button>

        <button
          onClick={() => { if (onSearchSubmit) onSearchSubmit(); }}
          className="btn-sand"
          style={{ minHeight: '46px', padding: '0 1.25rem', borderRadius: '12px', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '0.4rem', whiteSpace: 'nowrap', fontWeight: '800', flexShrink: 0 }}
        >
          <Search size={18} /> بحث 🔍
        </button>
      </div>

      {isScannerOpen && (
        <QrScannerModal
          onClose={() => setIsScannerOpen(false)}
          onScanSuccess={handleScanSuccess}
          title="مسح كود OEM أو باركود القطعة 📷"
        />
      )}

      {/* FILTER CONTROLS & TOTAL COUNT */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.6rem', paddingTop: '0.1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap', width: '100%', maxWidth: '100%' }}>
          {/* Car Model Selector */}
          <select
            value={selectedModel}
            onChange={(e) => onModelChange(e.target.value)}
            style={{ flex: '1 1 140px', padding: '0.45rem 0.75rem', minHeight: '40px', fontWeight: '700', background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '10px', fontFamily: "'Cairo', sans-serif", fontSize: '0.82rem', color: '#0f172a' }}
          >
            {models.map(m => (
              <option key={m.id} value={m.id}>{m.name}</option>
            ))}
          </select>

          {/* Year Selector */}
          <select
            value={selectedYear}
            onChange={(e) => onYearChange(e.target.value)}
            style={{ flex: '1 1 110px', padding: '0.45rem 0.75rem', minHeight: '40px', fontWeight: '700', background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '10px', fontFamily: "'Cairo', sans-serif", fontSize: '0.82rem', color: '#0f172a' }}
          >
            <option value="all">جميع السنوات</option>
            {years.filter(y => y !== 'all').map(y => (
              <option key={y} value={y}>موديل {y}</option>
            ))}
          </select>
        </div>

        <div style={{ width: '100%', display: 'flex', justifyContent: 'flex-end', marginTop: '0.1rem' }}>
          {isFiltered ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap', width: '100%', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '0.8rem', color: '#047857', background: '#ecfdf5', padding: '0.3rem 0.7rem', borderRadius: '10px', fontWeight: '800', border: '1px solid #a7f3d0' }}>
                إيجاد {matchedCount} قطعة مطابقة
              </span>
              <button onClick={handleReset} style={{ fontSize: '0.78rem', background: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '8px', padding: '0.3rem 0.7rem', color: '#475569', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.3rem', fontWeight: '700' }}>
                <XCircle size={14} /> مسح الفلتر
              </button>
            </div>
          ) : (
            <span style={{ fontSize: '0.82rem', color: '#64748b', fontWeight: '700', fontFamily: "'Cairo', sans-serif" }}>
              إجمالي القطع المتاحة: <strong style={{ color: '#0f172a', fontSize: '0.88rem' }}>{totalCount} قطعة أصلية</strong>
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
