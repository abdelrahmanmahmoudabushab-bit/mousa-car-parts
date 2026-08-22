import React, { useState } from 'react';
import { Car, Search, Filter, RefreshCw, XCircle } from 'lucide-react';

export default function VinLookupBar({ searchVal, onSearchChange, onSearchSubmit, selectedModel, onModelChange, selectedYear, onYearChange, matchedCount, totalCount }) {
  const models = [
    { id: 'all', name: 'All Vehicle Models (جميع الموديلات)' },
    { id: 'BYD Seagull', name: 'BYD Seagull (海鸥)' },
    { id: 'BYD Dolphin', name: 'BYD Dolphin (海豚)' },
    { id: 'BYD Atto 3', name: 'BYD Atto 3 (元PLUS)' },
    { id: 'BYD Tang', name: 'BYD Tang (唐)' },
    { id: 'BYD Han', name: 'BYD Han (汉)' }
  ];

  const years = ['all', '2026', '2025', '2024', '2023', '2022'];

  const handleReset = () => {
    onSearchChange('');
    onModelChange('all');
    onYearChange('all');
  };

  const isFiltered = searchVal || selectedModel !== 'all' || selectedYear !== 'all';

  return (
    <div style={{ background: '#ffffff', border: '1px solid var(--border-color)', borderRadius: '14px', padding: '1rem 1.25rem', boxShadow: 'var(--shadow-card)', display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <div style={{ padding: '0.4rem 0.6rem', borderRadius: '10px', background: '#eff6ff', color: '#2563eb', border: '1px solid #bfdbfe' }}>
            <Car size={18} />
          </div>
          <span style={{ fontSize: '0.95rem', fontWeight: '800', color: '#0f172a', fontFamily: 'var(--font-heading)' }}>
            OEM & VIN Search Engine (مباشر قطع السيارات)
          </span>
        </div>

        {isFiltered ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <span style={{ fontSize: '0.78rem', color: '#047857', background: '#ecfdf5', padding: '0.25rem 0.65rem', borderRadius: '12px', fontWeight: '700', border: '1px solid #a7f3d0' }}>
              ✅ {matchedCount} Parts Matching
            </span>
            <button onClick={handleReset} style={{ fontSize: '0.78rem', background: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: '6px', padding: '0.25rem 0.65rem', color: '#475569', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.25rem', fontWeight: '600' }}>
              <XCircle size={14} /> Clear Search
            </button>
          </div>
        ) : (
          <span style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: '600' }}>
            Catalog Directory: <strong style={{ color: '#0f172a' }}>{totalCount} OEM Auto Parts</strong>
          </span>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '3fr 1.5fr 1fr', gap: '0.75rem' }}>
        {/* Unified Search Input + Search Button */}
        <div style={{ display: 'flex', gap: '0.4rem' }}>
          <div style={{ position: 'relative', flex: 1 }}>
            <Search size={16} style={{ position: 'absolute', left: '0.8rem', top: '50%', transform: 'translateY(-50%)', color: '#64748b' }} />
            <input
              type="text"
              value={searchVal}
              onChange={(e) => onSearchChange(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && onSearchSubmit) onSearchSubmit(); }}
              placeholder="Search OEM Code (EQEA-5402841), VIN, Arabic Title (حافة الباب), or Chinese (裙板)..."
              className="input-field-sm"
              style={{
                width: '100%',
                paddingLeft: '2.4rem',
                fontSize: '0.88rem',
                background: '#f8fafc'
              }}
            />
          </div>
          <button
            onClick={() => { if (onSearchSubmit) onSearchSubmit(); }}
            className="btn-primary"
            style={{ padding: '0.6rem 1.1rem', borderRadius: '8px', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.4rem', whiteSpace: 'nowrap', fontWeight: '700' }}
          >
            <Search size={16} /> Search / بحث
          </button>
        </div>

        {/* Car Model Selector */}
        <select
          value={selectedModel}
          onChange={(e) => onModelChange(e.target.value)}
          className="input-field-sm"
          style={{ fontWeight: '600', background: '#f8fafc' }}
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
          style={{ fontWeight: '600', background: '#f8fafc' }}
        >
          <option value="all">All Years</option>
          {years.filter(y => y !== 'all').map(y => (
            <option key={y} value={y}>Year {y}</option>
          ))}
        </select>
      </div>
    </div>
  );
}
