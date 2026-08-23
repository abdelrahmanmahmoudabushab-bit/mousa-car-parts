import React, { useState, useMemo } from 'react';
import { UploadCloud, Download, CheckCircle2, RefreshCw, Languages, Search, Plus, Trash2, Edit2, Sparkles, MapPin, PackageCheck, AlertTriangle, Car, ShieldCheck } from 'lucide-react';
import { parseExcelFile, parsePdfFile, matchProductSearch } from '../utils/documentParser';
import VinLookupBar from './VinLookupBar';

export default function LightStockManager({ products, categories, token, onProductsUpdated, onOpenAddItem, onEditItem, onDeleteItem, onQuickAdjustStock }) {
  // View Mode State ('grid' | 'table')
  const [viewMode, setViewMode] = useState('grid');

  // Directory Search & Filter State
  const [search, setSearch] = useState('');
  const [selectedCat, setSelectedCat] = useState('all');
  const [selectedModel, setSelectedModel] = useState('all');
  const [selectedYear, setSelectedYear] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 40;

  // Inventory Metrics
  const totalStockCount = useMemo(() => products.reduce((acc, p) => acc + (p.quantity || 0), 0), [products]);
  const totalStockValuation = useMemo(() => products.reduce((acc, p) => acc + ((p.quantity || 0) * (p.costPrice || 0)), 0), [products]);
  const lowStockCount = useMemo(() => products.filter(p => (p.quantity || 0) <= 3).length, [products]);

  // Reset page when filters change
  const handleFilterChange = (setter, val) => {
    setter(val);
    setCurrentPage(1);
  };

  // File Import & Pricing State
  const [fileLoading, setFileLoading] = useState(false);
  const [loadingMsg, setLoadingMsg] = useState('');
  const [extractedItems, setExtractedItems] = useState(null);
  const [commitLoading, setCommitLoading] = useState(false);
  const [invoiceCurrency, setInvoiceCurrency] = useState('USD'); // 'USD' | 'CNY' | 'SAR'
  const [exchangeRate, setExchangeRate] = useState(3.75); // Default USD to local currency conversion rate
  const [markupPercent, setMarkupPercent] = useState(40);

  // Recalculate prices when currency or exchange rate changes
  const handleCurrencyChange = (newCurrency, newRate) => {
    setInvoiceCurrency(newCurrency);
    const rate = parseFloat(newRate) || 1;
    setExchangeRate(rate);
    const currentMarkup = markupPercent; // capture current value

    if (extractedItems) {
      setExtractedItems(prev => prev.map(item => {
        const rawCost = item.originalCost || item.costPrice;
        const convertedCost = Math.round(rawCost * rate * 100) / 100;
        const convertedRetail = Math.round(convertedCost * (1 + currentMarkup / 100) * 100) / 100;
        return {
          ...item,
          originalCost: rawCost,
          costPrice: convertedCost,
          unitPrice: convertedRetail
        };
      }));
    }
  };

  // Handle Drag & Drop or Select Stock File (PDF / Excel / CSV)
  const handleFileDrop = async (file) => {
    if (!file) return;
    setFileLoading(true);
    setLoadingMsg(`Parsing ${file.name}...`);
    try {
      let rawItems = [];
      const ext = file.name.split('.').pop().toLowerCase();
      if (ext === 'pdf') {
        rawItems = await parsePdfFile(file);
      } else {
        rawItems = await parseExcelFile(file);
      }

      setLoadingMsg('Translating Chinese parts specifications to Arabic...');
      const res = await fetch('/api/import/translate-batch', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ items: rawItems })
      });
      const data = await res.json();
      if (data.items) {
        setExtractedItems(data.items.map(item => {
          const isMatch = products.some(p => 
            (p.oem && item.oem && p.oem.toLowerCase() === item.oem.toLowerCase()) ||
            (p.sku && item.oem && p.sku.toLowerCase() === item.oem.toLowerCase())
          );
          return { ...item, isMatch, originalCost: item.costPrice };
        }));
      } else {
        alert('File parsed, but translation API returned no items.');
      }
    } catch (err) {
      alert('Error parsing stock file: ' + err.message);
    } finally {
      setFileLoading(false);
      setLoadingMsg('');
    }
  };

  // Commit Stock Import to Server Database
  const handleCommitStock = async () => {
    if (!extractedItems || extractedItems.length === 0) return;
    setCommitLoading(true);
    try {
      const res = await fetch('/api/import/confirm-batch', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ items: extractedItems })
      });
      const data = await res.json();
      if (res.ok && data.products) {
        onProductsUpdated(data.products);
        setExtractedItems(null);
        alert(`Successfully imported ${data.summary?.totalProcessed || extractedItems.length} parts to Mousa Car Parts inventory!`);
      } else {
        alert(data.error || 'Failed to import stock batch.');
      }
    } catch (err) {
      alert('Error committing stock batch: ' + err.message);
    } finally {
      setCommitLoading(false);
    }
  };

  // Filter existing directory products
  const filteredProducts = useMemo(() => {
    const q = (search || '').trim();
    const modelQ = selectedModel;
    const yearQ = selectedYear;

    return products.filter(p => {
      // Category Filter
      const matchesCat = selectedCat === 'all' || p.categoryId === selectedCat;
      if (!matchesCat) return false;

      // Model Filter
      if (modelQ !== 'all') {
        const modelStr = (p.vehicleModel || '').toLowerCase();
        const compArr = (p.compatibleModels || []).map(m => m.toLowerCase());
        const targetM = modelQ.toLowerCase();
        if (!modelStr.includes(targetM) && !compArr.some(m => m.includes(targetM))) {
          return false;
        }
      }

      // Year Filter
      if (yearQ !== 'all') {
        const yearStr = p.yearRange || '2023 - 2026';
        if (!yearStr.includes(yearQ)) return false;
      }

      // High Accuracy Matcher
      if (!q) return true;
      return matchProductSearch(p, q);
    });
  }, [products, selectedCat, search, selectedModel, selectedYear]);

  const totalPages = Math.ceil(filteredProducts.length / ITEMS_PER_PAGE) || 1;
  const displayedProducts = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredProducts.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredProducts, currentPage]);

  return (
    <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem', height: '100%', overflowY: 'auto', background: '#f8fafc', fontFamily: "'Cairo', sans-serif" }}>
      
      {/* File Loading Toast Notice */}
      {fileLoading && (
        <div style={{ padding: '0.85rem 1.25rem', background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '0.75rem', color: '#2563eb', fontSize: '0.88rem', fontWeight: '700' }}>
          <RefreshCw className="spin" size={18} />
          <span>{loadingMsg}</span>
        </div>
      )}

      {/* 🚀 TOP METRICS & INVENTORY DASHBOARD SUMMARY BANNER */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
        
        {/* Metric 1: Total Unique OEM Parts */}
        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '16px', padding: '1.15rem 1.25rem', boxShadow: '0 4px 14px rgba(15, 23, 42, 0.04)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: '700' }}>إجمالي الأصناف بالمستودع</div>
            <div style={{ fontSize: '1.6rem', fontWeight: '900', color: '#0f172a', margin: '0.2rem 0 0 0', fontFamily: 'var(--font-mono)' }}>
              {products.length.toLocaleString()} <span style={{ fontSize: '0.85rem', fontWeight: '700', color: '#64748b' }}>صنف OEM</span>
            </div>
          </div>
          <div style={{ width: '46px', height: '46px', borderRadius: '12px', background: '#f1f5f9', color: '#0f172a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <PackageCheck size={24} />
          </div>
        </div>

        {/* Metric 2: Total Units Available */}
        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '16px', padding: '1.15rem 1.25rem', boxShadow: '0 4px 14px rgba(15, 23, 42, 0.04)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: '700' }}>إجمالي الكمية المتوفرة</div>
            <div style={{ fontSize: '1.6rem', fontWeight: '900', color: '#047857', margin: '0.2rem 0 0 0', fontFamily: 'var(--font-mono)' }}>
              +{totalStockCount.toLocaleString()} <span style={{ fontSize: '0.85rem', fontWeight: '700', color: '#047857' }}>قطعة</span>
            </div>
          </div>
          <div style={{ width: '46px', height: '46px', borderRadius: '12px', background: '#ecfdf5', color: '#047857', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid #a7f3d0' }}>
            <ShieldCheck size={24} />
          </div>
        </div>

        {/* Metric 3: Low Stock Warnings */}
        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '16px', padding: '1.15rem 1.25rem', boxShadow: '0 4px 14px rgba(15, 23, 42, 0.04)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: '700' }}>تنبيهات نواقص المخزون</div>
            <div style={{ fontSize: '1.6rem', fontWeight: '900', color: lowStockCount > 0 ? '#b45309' : '#047857', margin: '0.2rem 0 0 0', fontFamily: 'var(--font-mono)' }}>
              {lowStockCount} <span style={{ fontSize: '0.85rem', fontWeight: '700', color: '#64748b' }}>أصناف قليلة</span>
            </div>
          </div>
          <div style={{ width: '46px', height: '46px', borderRadius: '12px', background: '#fffbeb', color: '#d97706', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid #fde68a' }}>
            <AlertTriangle size={24} />
          </div>
        </div>

        {/* Metric 4: Total Inventory Valuation */}
        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '16px', padding: '1.15rem 1.25rem', boxShadow: '0 4px 14px rgba(15, 23, 42, 0.04)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: '700' }}>إجمالي تقييم المستودع</div>
            <div style={{ fontSize: '1.6rem', fontWeight: '900', color: '#d97706', margin: '0.2rem 0 0 0', fontFamily: 'var(--font-mono)' }}>
              ${totalStockValuation.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
          </div>
          <div style={{ width: '46px', height: '46px', borderRadius: '12px', background: '#fffbeb', color: '#d97706', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid #fde68a' }}>
            <Sparkles size={24} />
          </div>
        </div>

      </div>

      {/* 📋 EXTRACTED REVIEW TABLE (PULLED FROM PDF/EXCEL) */}
      {extractedItems && (
        <div style={{ background: '#0f172a', border: '1px solid #3b82f6', borderRadius: '16px', padding: '1.25rem', color: 'white' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '1rem' }}>
            <div>
              <h3 style={{ fontSize: '1.1rem', fontWeight: '800', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#34d399' }}>
                <Sparkles size={18} /> Extracted Stock List ({extractedItems.length} Items Pulled)
              </h3>
            </div>

            {/* Currency Converter Control Bar */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', background: 'rgba(255, 255, 255, 0.06)', padding: '0.4rem 0.8rem', borderRadius: '10px', border: '1px solid rgba(255, 255, 255, 0.12)' }}>
              <span style={{ fontSize: '0.78rem', color: '#60a5fa', fontWeight: '700' }}>💵 Currency:</span>
              <select
                value={invoiceCurrency}
                onChange={(e) => {
                  const curr = e.target.value;
                  const defaultRate = curr === 'CNY' ? 0.52 : curr === 'USD' ? 3.75 : 1;
                  handleCurrencyChange(curr, defaultRate);
                }}
                style={{ padding: '0.3rem 0.6rem', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.2)', background: '#1e293b', color: 'white', fontSize: '0.82rem', fontWeight: '700', outline: 'none' }}
              >
                <option value="USD">USD ($)</option>
                <option value="CNY">RMB / CNY (¥)</option>
                <option value="SAR">SAR (ر.س)</option>
                <option value="AED">AED (د.إ)</option>
                <option value="EGP">EGP (ج.م)</option>
              </select>

              <span style={{ fontSize: '0.78rem', color: '#94a3b8' }}>Rate:</span>
              <input
                type="number"
                step="0.01"
                value={exchangeRate}
                onChange={(e) => handleCurrencyChange(invoiceCurrency, e.target.value)}
                style={{ width: '70px', padding: '0.3rem 0.5rem', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.2)', background: '#1e293b', color: '#34d399', fontSize: '0.82rem', fontWeight: '700', outline: 'none' }}
              />
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <button className="btn-secondary" onClick={() => setExtractedItems(null)} style={{ fontSize: '0.8rem' }}>
                Cancel
              </button>

              <button 
                className="btn-primary" 
                onClick={handleCommitStock} 
                disabled={commitLoading}
                style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', background: '#10b981', padding: '0.6rem 1.25rem' }}
              >
                {commitLoading ? <RefreshCw className="spin" size={16} /> : <CheckCircle2 size={16} />}
                Confirm Import
              </button>
            </div>
          </div>

          <div style={{ overflowX: 'auto', maxHeight: '350px', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '10px' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem', textAlign: 'left' }}>
              <thead>
                <tr style={{ background: 'rgba(15, 23, 42, 0.9)', color: '#94a3b8', fontSize: '0.75rem', textTransform: 'uppercase' }}>
                  <th style={{ padding: '0.65rem 0.85rem' }}>Status</th>
                  <th style={{ padding: '0.65rem 0.85rem' }}>OEM Part No</th>
                  <th style={{ padding: '0.65rem 0.85rem' }}>Chinese Spec</th>
                  <th style={{ padding: '0.65rem 0.85rem', color: '#34d399' }}>Arabic Translation</th>
                  <th style={{ padding: '0.65rem 0.85rem', width: '90px' }}>Cost ($)</th>
                  <th style={{ padding: '0.65rem 0.85rem', width: '90px' }}>Retail ($)</th>
                  <th style={{ padding: '0.65rem 0.85rem', width: '70px' }}>+Qty</th>
                </tr>
              </thead>
              <tbody>
                {extractedItems.map((item, idx) => (
                  <tr key={idx} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.05)' }}>
                    <td style={{ padding: '0.55rem 0.85rem' }}>
                      {item.isMatch ? (
                        <span style={{ padding: '0.15rem 0.45rem', borderRadius: '12px', background: 'rgba(16, 185, 129, 0.2)', color: '#34d399', fontSize: '0.7rem', fontWeight: '700' }}>
                          +Stock ({item.quantity})
                        </span>
                      ) : (
                        <span style={{ padding: '0.15rem 0.45rem', borderRadius: '12px', background: 'rgba(59, 130, 246, 0.2)', color: '#60a5fa', fontSize: '0.7rem', fontWeight: '700' }}>
                          New Part
                        </span>
                      )}
                    </td>
                    <td style={{ padding: '0.55rem 0.85rem', fontFamily: 'var(--font-mono)', fontWeight: '700', color: 'white' }}>{item.oem}</td>
                    <td style={{ padding: '0.55rem 0.85rem', color: '#cbd5e1' }}>{item.cnName || item.name}</td>
                    <td style={{ padding: '0.55rem 0.85rem' }}>
                      <input
                        type="text"
                        value={item.arName || ''}
                        onChange={(e) => {
                          const val = e.target.value;
                          setExtractedItems(prev => prev.map((it, i) => i === idx ? { ...it, arName: val } : it));
                        }}
                        dir="rtl"
                        style={{ padding: '0.25rem 0.5rem', borderRadius: '6px', border: '1px solid rgba(16, 185, 129, 0.3)', background: 'rgba(16, 185, 129, 0.1)', color: '#34d399', width: '200px', fontSize: '0.8rem', fontFamily: "'Cairo', sans-serif", fontWeight: '700' }}
                      />
                    </td>
                    <td style={{ padding: '0.55rem 0.85rem' }}>${(Number(item.costPrice) || 0).toFixed(2)}</td>
                    <td style={{ padding: '0.55rem 0.85rem', fontWeight: 'bold', color: '#60a5fa' }}>${(Number(item.unitPrice) || 0).toFixed(2)}</td>
                    <td style={{ padding: '0.55rem 0.85rem', fontWeight: 'bold', color: '#fbbf24' }}>+{item.quantity}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 🚘 UNIFIED SEARCH & VEHICLE FITMENT TOOLBAR */}
      <VinLookupBar 
        searchVal={search}
        onSearchChange={(val) => { setSearch(val); setCurrentPage(1); }}
        onSearchSubmit={() => setCurrentPage(1)}
        selectedModel={selectedModel}
        onModelChange={(val) => { setSelectedModel(val); setCurrentPage(1); }}
        selectedYear={selectedYear}
        onYearChange={(val) => { setSelectedYear(val); setCurrentPage(1); }}
        matchedCount={filteredProducts.length}
        totalCount={products.length}
      />

      {/* 📦 CATEGORY FILTER PILLS & VIEW MODE SWITCHER */}
      <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '18px', padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1.25rem', boxShadow: '0 4px 16px -2px rgba(15, 23, 42, 0.05)' }}>
        
        {/* Controls Bar */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          
          {/* CATEGORY FILTER PILLS */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', overflowX: 'auto', paddingBottom: '0.2rem', flex: 1 }}>
            <button
              onClick={() => { setSelectedCat('all'); setCurrentPage(1); }}
              style={{
                padding: '0.5rem 1.1rem',
                borderRadius: '12px',
                background: selectedCat === 'all' ? '#d97706' : '#f8fafc',
                color: selectedCat === 'all' ? '#ffffff' : '#0f172a',
                border: selectedCat === 'all' ? '1px solid #d97706' : '1px solid #cbd5e1',
                fontWeight: '800',
                fontSize: '0.88rem',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                fontFamily: "'Cairo', sans-serif"
              }}
            >
              جميع الأقسام ({products.length})
            </button>

            {categories.map(c => (
              <button
                key={c.id}
                onClick={() => { setSelectedCat(c.id); setCurrentPage(1); }}
                style={{
                  padding: '0.5rem 1.1rem',
                  borderRadius: '12px',
                  background: selectedCat === c.id ? '#d97706' : '#ffffff',
                  color: selectedCat === c.id ? '#ffffff' : '#0f172a',
                  border: selectedCat === c.id ? '1px solid #d97706' : '1px solid #cbd5e1',
                  fontWeight: '800',
                  fontSize: '0.88rem',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  fontFamily: "'Cairo', sans-serif"
                }}
              >
                {c.name}
              </button>
            ))}
          </div>

          {/* VIEW MODE TOGGLE & ADD ITEM */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{ display: 'flex', background: '#f1f5f9', padding: '0.25rem', borderRadius: '10px', border: '1px solid #cbd5e1' }}>
              <button
                onClick={() => setViewMode('grid')}
                style={{
                  padding: '0.35rem 0.85rem',
                  borderRadius: '8px',
                  background: viewMode === 'grid' ? '#0f172a' : 'transparent',
                  color: viewMode === 'grid' ? '#ffffff' : '#475569',
                  border: 'none',
                  fontWeight: '800',
                  fontSize: '0.82rem',
                  cursor: 'pointer',
                  fontFamily: "'Cairo', sans-serif"
                }}
              >
                🎴 عرض كروت
              </button>
              <button
                onClick={() => setViewMode('table')}
                style={{
                  padding: '0.35rem 0.85rem',
                  borderRadius: '8px',
                  background: viewMode === 'table' ? '#0f172a' : 'transparent',
                  color: viewMode === 'table' ? '#ffffff' : '#475569',
                  border: 'none',
                  fontWeight: '800',
                  fontSize: '0.82rem',
                  cursor: 'pointer',
                  fontFamily: "'Cairo', sans-serif"
                }}
              >
                📊 عرض جدول
              </button>
            </div>

            <button onClick={onOpenAddItem} className="btn-sand" style={{ padding: '0.6rem 1.25rem', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: '800' }}>
              <Plus size={18} /> إضافة قطعة جديدة ➕
            </button>
          </div>

        </div>

        {/* Pagination Controls */}
        {totalPages > 1 && (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '0.6rem 1.15rem' }}>
            <span style={{ fontSize: '0.88rem', color: '#64748b', fontWeight: '700', fontFamily: "'Cairo', sans-serif" }}>
              عرض <strong style={{ color: '#0f172a' }}>{((currentPage - 1) * ITEMS_PER_PAGE) + 1} - {Math.min(currentPage * ITEMS_PER_PAGE, filteredProducts.length)}</strong> من أصل {filteredProducts.length} قطعة
            </span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <button
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                style={{ padding: '0.35rem 0.95rem', borderRadius: '8px', border: '1px solid #cbd5e1', background: currentPage === 1 ? '#f1f5f9' : '#ffffff', color: currentPage === 1 ? '#94a3b8' : '#0f172a', cursor: currentPage === 1 ? 'default' : 'pointer', fontSize: '0.85rem', fontWeight: '800', fontFamily: "'Cairo', sans-serif" }}
              >
                ◀ السابق
              </button>
              <span style={{ fontSize: '0.88rem', fontWeight: '800', padding: '0 0.5rem', color: '#d97706', fontFamily: "'Cairo', sans-serif" }}>
                صفحة {currentPage} من {totalPages}
              </span>
              <button
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                style={{ padding: '0.35rem 0.95rem', borderRadius: '8px', border: '1px solid #cbd5e1', background: currentPage === totalPages ? '#f1f5f9' : '#ffffff', color: currentPage === totalPages ? '#94a3b8' : '#0f172a', cursor: currentPage === totalPages ? 'default' : 'pointer', fontSize: '0.85rem', fontWeight: '800', fontFamily: "'Cairo', sans-serif" }}
              >
                التالي ▶
              </button>
            </div>
          </div>
        )}

        {/* 🎴 VIEW MODE 1: MODERN GRID CARDS VIEW */}
        {viewMode === 'grid' && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1.25rem' }}>
            {displayedProducts.map(p => (
              <div
                key={p.id}
                style={{
                  background: '#ffffff',
                  border: '1px solid #e2e8f0',
                  borderRadius: '16px',
                  padding: '1.25rem',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  gap: '1rem',
                  boxShadow: '0 2px 8px rgba(15, 23, 42, 0.04)',
                  transition: 'transform 0.2s ease, box-shadow 0.2s ease'
                }}
              >
                <div>
                  {/* Top Badge OEM & Location */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.65rem' }}>
                    <span className="mono" style={{ fontSize: '0.85rem', fontWeight: '800', color: '#d97706', background: '#fffbeb', border: '1px solid #fde68a', padding: '0.2rem 0.6rem', borderRadius: '8px' }}>
                      {p.oem}
                    </span>
                    <span style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                      <MapPin size={13} style={{ color: '#d97706' }} /> {p.location || 'Shelf-A1'}
                    </span>
                  </div>

                  {/* Title & Specs */}
                  <h4 style={{ fontSize: '1.05rem', fontWeight: '800', color: '#0f172a', margin: '0 0 0.4rem 0', fontFamily: "'Cairo', sans-serif", lineHeight: '1.4' }}>
                    {p.arName || p.name}
                  </h4>

                  {/* Model Tag */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', marginTop: '0.4rem' }}>
                    <span style={{ fontSize: '0.78rem', background: '#f8fafc', border: '1px solid #e2e8f0', color: '#475569', padding: '0.15rem 0.55rem', borderRadius: '6px', fontWeight: '700' }}>
                      🚗 {p.vehicleModel || 'BYD Seagull'} ({p.yearRange || '2023 - 2026'})
                    </span>
                  </div>
                </div>

                {/* Bottom Stock Adjuster & Price Action */}
                <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '0.85rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: '700' }}>سعر البيع</div>
                    <div className="mono" style={{ fontSize: '1.25rem', fontWeight: '900', color: '#0f172a' }}>
                      ${(Number(p.unitPrice) || 0).toFixed(2)}
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    {/* Stock Counter Controls */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', background: '#f8fafc', border: '1px solid #cbd5e1', padding: '0.2rem 0.4rem', borderRadius: '8px' }}>
                      <button onClick={() => onQuickAdjustStock(p.id, -1)} style={{ width: '26px', height: '26px', borderRadius: '6px', background: '#ffffff', border: '1px solid #cbd5e1', cursor: 'pointer', fontWeight: 'bold', color: '#0f172a' }}>-</button>
                      <span className="mono" style={{ fontWeight: '800', minWidth: '28px', textAlign: 'center', fontSize: '0.95rem', color: (p.quantity || 0) <= 3 ? '#b45309' : '#047857' }}>
                        {p.quantity}
                      </span>
                      <button onClick={() => onQuickAdjustStock(p.id, 1)} style={{ width: '26px', height: '26px', borderRadius: '6px', background: '#ffffff', border: '1px solid #cbd5e1', cursor: 'pointer', fontWeight: 'bold', color: '#0f172a' }}>+</button>
                    </div>

                    <button onClick={() => onEditItem(p)} style={{ padding: '0.45rem', borderRadius: '8px', background: '#f1f5f9', border: '1px solid #cbd5e1', cursor: 'pointer', color: '#0f172a' }} title="تعديل القطعة"><Edit2 size={15} /></button>
                    <button onClick={() => onDeleteItem(p.id)} style={{ padding: '0.45rem', borderRadius: '8px', background: '#fef2f2', border: '1px solid #fca5a5', color: '#b91c1c', cursor: 'pointer' }} title="حذف"><Trash2 size={15} /></button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* 📊 VIEW MODE 2: CLEAN DATA TABLE VIEW */}
        {viewMode === 'table' && (
          <div style={{ overflowY: 'auto', flex: 1, border: '1px solid #e2e8f0', borderRadius: '14px' }}>
            <table className="data-table" style={{ width: '100%', borderCollapse: 'collapse', fontFamily: "'Cairo', sans-serif" }}>
              <thead>
                <tr style={{ background: '#f8fafc', color: '#475569', fontSize: '0.85rem', fontWeight: '800' }}>
                  <th style={{ padding: '0.85rem 1rem' }}>رقم OEM</th>
                  <th style={{ padding: '0.85rem 1rem' }}>اسم القطعة والمواصفات</th>
                  <th style={{ padding: '0.85rem 1rem' }}>الموديل والسنوات</th>
                  <th style={{ padding: '0.85rem 1rem' }}>الرف / المستودع</th>
                  <th style={{ padding: '0.85rem 1rem' }}>التكلفة ($)</th>
                  <th style={{ padding: '0.85rem 1rem' }}>سعر البيع ($)</th>
                  <th style={{ padding: '0.85rem 1rem' }}>الكمية المتوفرة</th>
                  <th style={{ padding: '0.85rem 1rem', textAlign: 'right' }}>الإجراءات</th>
                </tr>
              </thead>
              <tbody>
                {displayedProducts.map(p => (
                  <tr key={p.id}>
                    <td className="mono" style={{ fontWeight: '800', color: '#d97706', fontSize: '0.9rem' }}>{p.oem}</td>
                    <td>
                      <div style={{ fontWeight: '800', color: '#0f172a', fontSize: '0.95rem' }}>{p.arName || p.name}</div>
                    </td>
                    <td>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.8rem', background: '#fffbeb', color: '#d97706', padding: '0.2rem 0.6rem', borderRadius: '6px', fontWeight: '700', border: '1px solid #fde68a' }}>
                          🚗 {p.vehicleModel || 'BYD Seagull'}
                        </span>
                        <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: '600' }}>
                          السنوات: {p.yearRange || '2023 - 2026'}
                        </span>
                      </div>
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.82rem', color: '#475569', fontWeight: '600' }}>
                        <MapPin size={14} style={{ color: '#d97706' }} />
                        <span>{p.location || 'Shelf-A1'}</span>
                      </div>
                    </td>
                    <td className="mono" style={{ fontWeight: '700', color: '#475569' }}>${(Number(p.costPrice) || 0).toFixed(2)}</td>
                    <td className="mono" style={{ fontWeight: '800', color: '#0f172a', fontSize: '1rem' }}>${(Number(p.unitPrice) || 0).toFixed(2)}</td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        <button onClick={() => onQuickAdjustStock(p.id, -1)} style={{ width: '26px', height: '26px', borderRadius: '6px', background: '#e2e8f0', border: 'none', cursor: 'pointer', fontWeight: 'bold', color: '#0f172a' }}>-</button>
                        <span className="mono" style={{ fontWeight: '800', minWidth: '28px', textAlign: 'center', fontSize: '0.95rem', color: '#0f172a' }}>{p.quantity}</span>
                        <button onClick={() => onQuickAdjustStock(p.id, 1)} style={{ width: '26px', height: '26px', borderRadius: '6px', background: '#e2e8f0', border: 'none', cursor: 'pointer', fontWeight: 'bold', color: '#0f172a' }}>+</button>
                      </div>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.4rem' }}>
                        <button onClick={() => onEditItem(p)} style={{ padding: '0.4rem', borderRadius: '8px', background: '#f1f5f9', border: '1px solid #cbd5e1', cursor: 'pointer', color: '#0f172a' }}><Edit2 size={15} /></button>
                        <button onClick={() => onDeleteItem(p.id)} style={{ padding: '0.4rem', borderRadius: '8px', background: '#fef2f2', border: '1px solid #fca5a5', color: '#b91c1c', cursor: 'pointer' }}><Trash2 size={15} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

      </div>
    </div>
  );
}
