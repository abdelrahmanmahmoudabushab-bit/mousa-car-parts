import React from 'react';
import { Car, Search, XCircle } from 'lucide-react';

export default function VinLookupBar({ searchVal, onSearchChange, onSearchSubmit, selectedModel, onModelChange, selectedYear, onYearChange, matchedCount, totalCount }) {
  const models = [
    { id: 'all', name: 'جميع موديلات BYD' },
    { id: 'BYD Seagull', name: 'بي واي دي سيجول (Seagull - 海鸥)' },
    { id: 'BYD Dolphin', name: 'بي واي دي دولفين (Dolphin - 海豚)' },
    { id: 'BYD Atto 3', name: 'بي واي دي أتو 3 (Atto 3 - 元PLUS)' },
    { id: 'BYD Tang', name: 'بي واي دي تانج (Tang - 唐)' },
    { id: 'BYD Han', name: 'بي واي دي هان (Han - 汉)' }
  ];

  const years = ['all', '2026', '2025', '2024', '2023', '2022'];

  const handleReset = () => {
    onSearchChange('');
    onModelChange('all');
    onYearChange('all');
  };

  const isFiltered = searchVal || selectedModel !== 'all' || selectedYear !== 'all';

  return (
    <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '16px', padding: '1rem 1.25rem', boxShadow: '0 4px 16px -2px rgba(15, 23, 42, 0.05)', display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: '#eff6ff', color: '#2563eb', border: '1px solid #bfdbfe', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Car size={20} />
          </div>
          <span style={{ fontSize: '1rem', fontWeight: '800', color: '#0f172a', fontFamily: "'Cairo', sans-serif" }}>
            محرك البحث الذكي ورقم الهيكل (VIN & OEM)
          </span>
        </div>

        {isFiltered ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <span style={{ fontSize: '0.8rem', color: '#047857', background: '#ecfdf5', padding: '0.3rem 0.75rem', borderRadius: '12px', fontWeight: '700', border: '1px solid #a7f3d0' }}>
              إيجاد {matchedCount} قطعة مطابقة
            </span>
            <button onClick={handleReset} style={{ fontSize: '0.8rem', background: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '8px', padding: '0.3rem 0.75rem', color: '#475569', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.3rem', fontWeight: '700' }}>
              <XCircle size={14} /> مسح الفلتر
            </button>
          </div>
        ) : (
          <span style={{ fontSize: '0.82rem', color: '#64748b', fontWeight: '600' }}>
            إجمالي قطع الغيار بالمستودع: <strong style={{ color: '#0f172a' }}>{totalCount} قطعة أصلية</strong>
          </span>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '3fr 1.5fr 1fr', gap: '0.75rem' }}>
        {/* Unified Search Input + Search Button */}
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <div style={{ position: 'relative', flex: 1 }}>
            <Search size={18} style={{ position: 'absolute', right: '0.85rem', top: '50%', transform: 'translateY(-50%)', color: '#64748b' }} />
            <input
              type="text"
              value={searchVal}
              onChange={(e) => onSearchChange(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && onSearchSubmit) onSearchSubmit(); }}
              placeholder="ابحث برقم OEM، رقم الهيكل VIN، اسم القطعة بالعربي أو الصيني (فحمات، صدام، هوبات)..."
              className="input-field-sm"
              style={{
                width: '100%',
                paddingRight: '2.5rem',
                fontSize: '0.88rem',
                background: '#f8fafc',
                border: '1px solid #cbd5e1',
                borderRadius: '10px',
                fontFamily: "'Cairo', sans-serif"
              }}
            />
          </div>
          <button
            onClick={() => { if (onSearchSubmit) onSearchSubmit(); }}
            className="btn-primary"
            style={{ padding: '0.6rem 1.25rem', borderRadius: '10px', fontSize: '0.88rem', display: 'flex', alignItems: 'center', gap: '0.4rem', whiteSpace: 'nowrap', fontWeight: '800' }}
          >
            <Search size={16} /> بحث
          </button>
        </div>

        {/* Car Model Selector */}
        <select
          value={selectedModel}
          onChange={(e) => onModelChange(e.target.value)}
          className="input-field-sm"
          style={{ fontWeight: '700', background: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '10px', fontFamily: "'Cairo', sans-serif" }}
        >
          {models.map(m => (
            <option key={m.id} value={m.id}>{m.name}</option>
          ))}
        </select>

        {/* Year Selector */}
        <select
          value={selectedYear}
          onChange={(e) => onYearChange(e.target.value)}
          className="input-field-sm"
          style={{ fontWeight: '700', background: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '10px', fontFamily: "'Cairo', sans-serif" }}
        >
          <option value="all">جميع السنوات</option>
          {years.filter(y => y !== 'all').map(y => (
            <option key={y} value={y}>موديل {y}</option>
          ))}
        </select>
      </div>
    </div>
  );
}
