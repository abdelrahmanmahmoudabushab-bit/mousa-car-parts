import React from 'react';
import { Car, Search, XCircle } from 'lucide-react';

export default function VinLookupBar({ searchVal, onSearchChange, onSearchSubmit, selectedModel, onModelChange, selectedYear, onYearChange, matchedCount, totalCount }) {
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

  return (
    <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '18px', padding: '1.25rem 1.5rem', boxShadow: '0 4px 16px -2px rgba(15, 23, 42, 0.05)', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      
      {/* 🚀 BIG BOLD SEARCH BAR */}
      <div style={{ display: 'flex', gap: '0.6rem' }}>
        <div style={{ position: 'relative', flex: 1 }}>
          <Search size={22} style={{ position: 'absolute', right: '1.1rem', top: '50%', transform: 'translateY(-50%)', color: '#d97706' }} />
          <input
            type="text"
            value={searchVal}
            onChange={(e) => onSearchChange(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && onSearchSubmit) onSearchSubmit(); }}
            placeholder="ابحث برقم OEM، رقم الهيكل VIN، أو اسم القطعة بالعربي (فحمات، صدام، هوبات)..."
            style={{
              width: '100%',
              height: '52px',
              paddingRight: '3.2rem',
              paddingLeft: '1rem',
              fontSize: '1rem',
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
          onClick={() => { if (onSearchSubmit) onSearchSubmit(); }}
          className="btn-sand"
          style={{ height: '52px', padding: '0 1.75rem', borderRadius: '12px', fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', whiteSpace: 'nowrap', fontWeight: '800' }}
        >
          <Search size={20} /> بحث 🔍
        </button>
      </div>

      {/* FILTER CONTROLS & TOTAL COUNT */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem', paddingTop: '0.25rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flex: 1 }}>
          {/* Car Model Selector */}
          <select
            value={selectedModel}
            onChange={(e) => onModelChange(e.target.value)}
            style={{ padding: '0.55rem 1rem', height: '42px', fontWeight: '700', background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '10px', fontFamily: "'Cairo', sans-serif", fontSize: '0.88rem', color: '#0f172a' }}
          >
            {models.map(m => (
              <option key={m.id} value={m.id}>{m.name}</option>
            ))}
          </select>

          {/* Year Selector */}
          <select
            value={selectedYear}
            onChange={(e) => onYearChange(e.target.value)}
            style={{ padding: '0.55rem 1rem', height: '42px', fontWeight: '700', background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '10px', fontFamily: "'Cairo', sans-serif", fontSize: '0.88rem', color: '#0f172a' }}
          >
            <option value="all">جميع السنوات</option>
            {years.filter(y => y !== 'all').map(y => (
              <option key={y} value={y}>موديل {y}</option>
            ))}
          </select>
        </div>

        <div>
          {isFiltered ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <span style={{ fontSize: '0.85rem', color: '#047857', background: '#ecfdf5', padding: '0.35rem 0.85rem', borderRadius: '12px', fontWeight: '800', border: '1px solid #a7f3d0' }}>
                إيجاد {matchedCount} قطعة مطابقة
              </span>
              <button onClick={handleReset} style={{ fontSize: '0.82rem', background: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '8px', padding: '0.35rem 0.85rem', color: '#475569', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.3rem', fontWeight: '700' }}>
                <XCircle size={15} /> مسح الفلتر
              </button>
            </div>
          ) : (
            <span style={{ fontSize: '0.88rem', color: '#64748b', fontWeight: '700', fontFamily: "'Cairo', sans-serif" }}>
              إجمالي القطع المتاحة: <strong style={{ color: '#0f172a', fontSize: '0.95rem' }}>{totalCount} قطعة أصلية</strong>
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
