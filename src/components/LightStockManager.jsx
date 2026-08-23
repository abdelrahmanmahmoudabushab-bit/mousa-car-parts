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

      {/* 🔍 GIANT PROMINENT SEARCH BAR AT THE VERY TOP */}
      <div style={{ background: '#ffffff', border: '2px solid #d97706', borderRadius: '20px', padding: '1.25rem', boxShadow: '0 8px 30px rgba(217, 119, 6, 0.08)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ flex: 1, position: 'relative' }}>
            <Search size={28} style={{ position: 'absolute', right: '1.25rem', top: '50%', transform: 'translateY(-50%)', color: '#d97706' }} />
            <input
              type="text"
              autoFocus
              value={search}
              onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }}
              placeholder="🔍 ابحث برقم OEM، اسم القطعة بالعربي، أو كود السيريال (مثل: EQEA-5402841 أو فحمات)..."
              style={{
                width: '100%',
                height: '64px',
                padding: '0 3.8rem 0 1.5rem',
                fontSize: '1.25rem',
                fontWeight: '800',
                borderRadius: '14px',
                border: '2px solid #e2e8f0',
                background: '#ffffff',
                color: '#0f172a',
                outline: 'none',
                fontFamily: "'Cairo', sans-serif",
                boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.02)'
              }}
            />
          </div>

          <button onClick={onOpenAddItem} className="btn-sand" style={{ height: '64px', padding: '0 1.75rem', fontSize: '1.05rem', fontWeight: '800', borderRadius: '14px', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Plus size={22} /> إضافة قطعة ➕
          </button>
        </div>

        {/* Toolbar Sub-Filters Bar */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1rem', flexWrap: 'wrap', gap: '0.75rem', borderTop: '1px solid #f1f5f9', paddingTop: '0.85rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <span style={{ fontSize: '0.88rem', fontWeight: '800', color: '#64748b' }}>قسم القطع:</span>
            <select
              value={selectedCat}
              onChange={(e) => { setSelectedCat(e.target.value); setCurrentPage(1); }}
              style={{ padding: '0.45rem 0.9rem', borderRadius: '10px', border: '1px solid #cbd5e1', background: '#ffffff', fontSize: '0.85rem', fontWeight: '700', color: '#0f172a', fontFamily: "'Cairo', sans-serif" }}
            >
              <option value="all">جميع الأقسام ({products.length})</option>
              {categories.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>

            <span style={{ fontSize: '0.88rem', fontWeight: '800', color: '#64748b', marginRight: '0.75rem' }}>الموديل:</span>
            <select
              value={selectedModel}
              onChange={(e) => { setSelectedModel(e.target.value); setCurrentPage(1); }}
              style={{ padding: '0.45rem 0.9rem', borderRadius: '10px', border: '1px solid #cbd5e1', background: '#ffffff', fontSize: '0.85rem', fontWeight: '700', color: '#0f172a', fontFamily: "'Cairo', sans-serif" }}
            >
              <option value="all">جميع موديلات BYD</option>
              <option value="BYD Seagull">بي واي دي سيجول (BYD Seagull)</option>
              <option value="BYD Dolphin">بي واي دي دولفين (BYD Dolphin)</option>
              <option value="BYD Atto 3">بي واي دي أتو 3 (BYD Atto 3)</option>
              <option value="BYD Tang">بي واي دي تانج (BYD Tang)</option>
              <option value="BYD Han">بي واي دي هان (BYD Han)</option>
            </select>
          </div>

          <div style={{ fontSize: '0.9rem', fontWeight: '800', color: '#047857', background: '#ecfdf5', border: '1px solid #a7f3d0', padding: '0.35rem 0.85rem', borderRadius: '10px' }}>
            نتائج البحث: {filteredProducts.length} قطعة متطابقة من أصل {products.length}
          </div>
        </div>
      </div>

      {/* 📊 EXCEL SPREADSHEET TABLE VIEW */}
      <div style={{ background: '#ffffff', border: '2px solid #cbd5e1', borderRadius: '16px', padding: '1rem', boxShadow: '0 4px 20px rgba(0,0,0,0.04)', display: 'flex', flexDirection: 'column', flex: 1 }}>
        
        {/* Pagination Bar Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.85rem', paddingBottom: '0.65rem', borderBottom: '1px solid #e2e8f0' }}>
          <span style={{ fontSize: '0.9rem', color: '#0f172a', fontWeight: '800' }}>
            جدول بيانات المستودع (Excel Inventory Sheet)
          </span>

          {totalPages > 1 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <button
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                style={{ padding: '0.35rem 0.85rem', borderRadius: '8px', border: '1px solid #cbd5e1', background: currentPage === 1 ? '#f1f5f9' : '#ffffff', color: currentPage === 1 ? '#94a3b8' : '#0f172a', cursor: currentPage === 1 ? 'default' : 'pointer', fontSize: '0.82rem', fontWeight: '800' }}
              >
                ◀ السابق
              </button>
              <span style={{ fontSize: '0.85rem', fontWeight: '800', padding: '0 0.4rem', color: '#d97706' }}>
                صفحة {currentPage} من {totalPages}
              </span>
              <button
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                style={{ padding: '0.35rem 0.85rem', borderRadius: '8px', border: '1px solid #cbd5e1', background: currentPage === totalPages ? '#f1f5f9' : '#ffffff', color: currentPage === totalPages ? '#94a3b8' : '#0f172a', cursor: currentPage === totalPages ? 'default' : 'pointer', fontSize: '0.82rem', fontWeight: '800' }}
              >
                التالي ▶
              </button>
            </div>
          )}
        </div>

        {/* EXCEL SHEET DATA GRID */}
        <div style={{ overflowX: 'auto', overflowY: 'auto', flex: 1, border: '1px solid #cbd5e1', borderRadius: '10px' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.88rem', textWrap: 'nowrap' }}>
            <thead>
              <tr style={{ background: '#0f172a', color: '#ffffff', fontSize: '0.85rem', fontWeight: '800', borderBottom: '2px solid #0f172a' }}>
                <th style={{ padding: '0.75rem', width: '50px', textAlign: 'center', borderRight: '1px solid #334155' }}>#</th>
                <th style={{ padding: '0.75rem 1rem', borderRight: '1px solid #334155' }}>كود OEM / السيريال</th>
                <th style={{ padding: '0.75rem 1rem', borderRight: '1px solid #334155' }}>اسم القطعة بالعربي</th>
                <th style={{ padding: '0.75rem 1rem', borderRight: '1px solid #334155' }}>الموديل والسنوات</th>
                <th style={{ padding: '0.75rem 1rem', borderRight: '1px solid #334155' }}>رقم الرف</th>
                <th style={{ padding: '0.75rem 1rem', borderRight: '1px solid #334155' }}>سعر التكلفة ($)</th>
                <th style={{ padding: '0.75rem 1rem', borderRight: '1px solid #334155' }}>سعر البيع ($)</th>
                <th style={{ padding: '0.75rem 1rem', borderRight: '1px solid #334155' }}>الكمية</th>
                <th style={{ padding: '0.75rem 1rem', textAlign: 'center' }}>الإجراءات</th>
              </tr>
            </thead>
            <tbody>
              {displayedProducts.map((p, index) => {
                const globalRowIndex = ((currentPage - 1) * ITEMS_PER_PAGE) + index + 1;
                const isEven = index % 2 === 0;
                return (
                  <tr key={p.id} style={{ background: isEven ? '#ffffff' : '#f8fafc', borderBottom: '1px solid #cbd5e1' }}>
                    <td style={{ padding: '0.65rem 0.75rem', textAlign: 'center', fontWeight: '700', color: '#64748b', borderRight: '1px solid #e2e8f0' }}>
                      {globalRowIndex}
                    </td>

                    <td className="mono" style={{ padding: '0.65rem 1rem', fontWeight: '800', color: '#d97706', borderRight: '1px solid #e2e8f0', fontSize: '0.92rem' }}>
                      {p.oem}
                    </td>

                    <td style={{ padding: '0.65rem 1rem', fontWeight: '800', color: '#0f172a', borderRight: '1px solid #e2e8f0' }}>
                      {p.arName || p.name}
                    </td>

                    <td style={{ padding: '0.65rem 1rem', borderRight: '1px solid #e2e8f0' }}>
                      <span style={{ fontSize: '0.78rem', background: '#fffbeb', border: '1px solid #fde68a', color: '#b45309', padding: '0.15rem 0.5rem', borderRadius: '6px', fontWeight: '700' }}>
                        🚗 {p.vehicleModel || 'BYD Seagull'}
                      </span>
                    </td>

                    <td style={{ padding: '0.65rem 1rem', borderRight: '1px solid #e2e8f0', color: '#475569', fontWeight: '700' }}>
                      📌 {p.location || 'Shelf-A1'}
                    </td>

                    <td className="mono" style={{ padding: '0.65rem 1rem', borderRight: '1px solid #e2e8f0', fontWeight: '700', color: '#475569' }}>
                      ${(Number(p.costPrice) || 0).toFixed(2)}
                    </td>

                    <td className="mono" style={{ padding: '0.65rem 1rem', borderRight: '1px solid #e2e8f0', fontWeight: '900', color: '#0f172a', fontSize: '1rem' }}>
                      ${(Number(p.unitPrice) || 0).toFixed(2)}
                    </td>

                    <td style={{ padding: '0.65rem 1rem', textAlign: 'center' }}>
                      <div style={{ display: 'flex', justifyContent: 'center', gap: '0.4rem' }}>
                        <button onClick={() => onEditItem(p)} style={{ padding: '0.35rem 0.65rem', borderRadius: '6px', background: '#f1f5f9', border: '1px solid #cbd5e1', cursor: 'pointer', color: '#0f172a', fontWeight: '700', fontSize: '0.78rem' }}>تعديل ✏️</button>
                        <button onClick={() => onDeleteItem(p.id)} style={{ padding: '0.35rem 0.65rem', borderRadius: '6px', background: '#fef2f2', border: '1px solid #fca5a5', color: '#b91c1c', cursor: 'pointer', fontWeight: '700', fontSize: '0.78rem' }}>حذف 🗑️</button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

      </div>
    </div>
  );
}
