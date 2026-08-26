import React, { useState } from 'react';
import { Search, X, Camera } from 'lucide-react';
import QrScannerModal from './QrScannerModal';

export default function VinLookupBar({ searchVal, onSearchChange, selectedModel, onModelChange, matchedCount, totalCount, onDirectScanSuccess }) {
  const [isScannerOpen, setIsScannerOpen] = useState(false);

  const models = [
    { id: 'all', name: 'جميع موديلات BYD' },
    { id: 'BYD Seagull', name: 'بي واي دي سيجول (BYD Seagull)' },
    { id: 'BYD Dolphin', name: 'بي واي دي دولفين (BYD Dolphin)' },
    { id: 'BYD Atto 3', name: 'بي واي دي أتو 3 (BYD Atto 3)' },
    { id: 'BYD Tang', name: 'بي واي دي تانج (BYD Tang)' },
    { id: 'BYD Han', name: 'بي واي دي هان (BYD Han)' }
  ];

  const isFiltered = searchVal.trim() !== '' || selectedModel !== 'all';

  const handleReset = () => {
    onSearchChange('');
    onModelChange('all');
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && searchVal.trim()) {
      if (onDirectScanSuccess) {
        onDirectScanSuccess(searchVal.trim());
      }
    }
  };

  return (
    <div style={{ background: '#ffffff', border: '2px solid #d97706', borderRadius: '16px', padding: '0.75rem 0.85rem', boxShadow: '0 4px 16px rgba(217, 119, 6, 0.1)', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
      
      {/* 🔍 SINGLE CLEAN SEARCH INPUT BAR WITH EMBEDDED CAMERA ICON */}
      <div style={{ position: 'relative', display: 'flex', alignItems: 'center', width: '100%' }}>
        <Search size={20} style={{ position: 'absolute', right: '0.85rem', color: '#d97706', pointerEvents: 'none' }} />
        
        <input
          type="text"
          autoFocus
          value={searchVal}
          onChange={(e) => onSearchChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="🔍 ابحث OEM، اسم القطعة (فحمات، صدام)، أو اضغط Enter لمسح السيريال..."
          style={{
            width: '100%',
            height: '46px',
            paddingRight: '2.6rem',
            paddingLeft: '3rem',
            fontSize: '0.92rem',
            fontWeight: '800',
            color: '#0f172a',
            background: '#f8fafc',
            border: '1.5px solid #cbd5e1',
            borderRadius: '12px',
            fontFamily: "'Cairo', sans-serif",
            outline: 'none'
          }}
        />

        {/* Embedded Camera Scanner Launcher */}
        <button
          type="button"
          onClick={() => setIsScannerOpen(true)}
          style={{
            position: 'absolute',
            left: '0.35rem',
            height: '36px',
            padding: '0 0.65rem',
            borderRadius: '8px',
            background: '#fffbeb',
            border: '1px solid #fde68a',
            color: '#b45309',
            fontSize: '0.78rem',
            fontWeight: '800',
            display: 'flex',
            alignItems: 'center',
            gap: '0.3rem',
            cursor: 'pointer'
          }}
          title="افتح الكاميرا لمسح كود القطعة"
        >
          <Camera size={16} /> 📷
        </button>
      </div>

      {isScannerOpen && (
        <QrScannerModal
          onClose={() => setIsScannerOpen(false)}
          onScanSuccess={(code) => {
            onSearchChange(code);
            if (onDirectScanSuccess) {
              onDirectScanSuccess(code);
            }
            setIsScannerOpen(false);
          }}
          title="مسح كود OEM أو باركود القطعة 📷"
        />
      )}

      {/* COMPACT SINGLE ROW FOR MODEL SELECTOR & RESULTS COUNT */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem' }}>
        <select
          value={selectedModel}
          onChange={(e) => onModelChange(e.target.value)}
          style={{ height: '36px', padding: '0 0.6rem', fontWeight: '700', background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '8px', fontFamily: "'Cairo', sans-serif", fontSize: '0.78rem', color: '#0f172a', flex: 1, maxWidth: '220px' }}
        >
          {models.map(m => (
            <option key={m.id} value={m.id}>{m.name}</option>
          ))}
        </select>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          {isFiltered && (
            <button
              onClick={handleReset}
              style={{ height: '36px', padding: '0 0.65rem', background: '#fef2f2', border: '1px solid #fecaca', color: '#b91c1c', borderRadius: '8px', fontSize: '0.75rem', fontWeight: '800', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.2rem' }}
            >
              <X size={14} /> مسح
            </button>
          )}

          <span style={{ fontSize: '0.78rem', color: '#047857', background: '#ecfdf5', border: '1px solid #a7f3d0', padding: '0.3rem 0.6rem', borderRadius: '8px', fontWeight: '800', whiteSpace: 'nowrap' }}>
            {matchedCount} قطعة
          </span>
        </div>
      </div>
    </div>
  );
}
