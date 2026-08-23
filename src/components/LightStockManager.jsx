import React, { useState, useMemo } from 'react';
import { UploadCloud, Download, CheckCircle2, RefreshCw, Languages, Search, Plus, Trash2, Edit2, Sparkles, MapPin, PackageCheck, AlertTriangle, Car, ShieldCheck, FileSpreadsheet } from 'lucide-react';
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

  // Export Current Filtered Directory to Excel CSV
  const handleExportCurrentToExcel = () => {
    const headers = ['Row', 'OEM Code', 'Arabic Name', 'Category', 'Vehicle Model', 'Location', 'Cost Price ($)', 'Unit Price ($)', 'Profit Margin (%)', 'Quantity', 'Total Valuation ($)'];
    const rows = filteredProducts.map((p, i) => {
      const margin = p.costPrice > 0 ? (((p.unitPrice - p.costPrice) / p.costPrice) * 100).toFixed(1) : '0.0';
      const lineTotal = (p.costPrice * p.quantity).toFixed(2);
      return [
        i + 1,
        `"${p.oem || ''}"`,
        `"${p.arName || p.name || ''}"`,
        `"${categories.find(c => c.id === p.categoryId)?.name || 'General'}"`,
        `"${p.vehicleModel || 'BYD Seagull'}"`,
        `"${p.location || 'Shelf-A1'}"`,
        (p.costPrice || 0).toFixed(2),
        (p.unitPrice || 0).toFixed(2),
        `${margin}%`,
        p.quantity || 0,
        lineTotal
      ].join(',');
    });

    const csvContent = '\uFEFF' + [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Mousa_Car_Parts_Inventory_${new Date().toISOString().slice(0,10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

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

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <button
              onClick={handleExportCurrentToExcel}
              style={{ padding: '0.45rem 0.95rem', borderRadius: '10px', background: '#ecfdf5', border: '1px solid #a7f3d0', color: '#047857', fontWeight: '800', fontSize: '0.85rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.4rem', fontFamily: "'Cairo', sans-serif" }}
            >
              <Download size={16} /> تصدير ملف Excel 📊
            </button>

            <div style={{ fontSize: '0.88rem', fontWeight: '800', color: '#047857', background: '#ecfdf5', border: '1px solid #a7f3d0', padding: '0.35rem 0.85rem', borderRadius: '10px' }}>
              نتائج البحث: {filteredProducts.length} قطعة
            </div>
          </div>
        </div>
      </div>

      {/* 📊 AUTHENTIC MICROSOFT EXCEL SPREADSHEET CONTAINER */}
      <div style={{ background: '#ffffff', border: '2px solid #107c41', borderRadius: '14px', boxShadow: '0 8px 30px rgba(16, 124, 65, 0.12)', display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
        
        {/* Excel Green Header Bar */}
        <div style={{ background: '#107c41', color: '#ffffff', padding: '0.65rem 1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontWeight: '800', fontSize: '0.92rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <FileSpreadsheet size={22} style={{ color: '#ffffff' }} />
            <span>Microsoft Excel · Mousa_Car_Parts_Inventory_2026.xlsx</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <span style={{ fontSize: '0.82rem', background: '#0b5c30', padding: '0.25rem 0.75rem', borderRadius: '6px', border: '1px solid #159a53' }}>
              إجمالي السجلات: {filteredProducts.length} صف
            </span>

            {totalPages > 1 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <button
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  style={{ padding: '0.25rem 0.65rem', borderRadius: '6px', border: 'none', background: currentPage === 1 ? '#0b5c30' : '#ffffff', color: currentPage === 1 ? '#94a3b8' : '#107c41', cursor: currentPage === 1 ? 'default' : 'pointer', fontSize: '0.78rem', fontWeight: '800' }}
                >
                  ◀
                </button>
                <span style={{ fontSize: '0.8rem', color: '#ffffff', padding: '0 0.2rem' }}>
                  {currentPage} / {totalPages}
                </span>
                <button
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  style={{ padding: '0.25rem 0.65rem', borderRadius: '6px', border: 'none', background: currentPage === totalPages ? '#0b5c30' : '#ffffff', color: currentPage === totalPages ? '#94a3b8' : '#107c41', cursor: currentPage === totalPages ? 'default' : 'pointer', fontSize: '0.78rem', fontWeight: '800' }}
                >
                  ▶
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Excel Formula Bar (fx) */}
        <div style={{ background: '#f3f4f6', borderBottom: '1px solid #d1d5db', padding: '0.4rem 1rem', display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '0.88rem' }}>
          <span style={{ fontWeight: '900', color: '#107c41', fontStyle: 'italic', fontFamily: 'serif', fontSize: '1.05rem', minWidth: '24px' }}>fx</span>
          <div style={{ width: '1px', height: '18px', background: '#9ca3af' }}></div>
          <div className="mono" style={{ background: '#ffffff', border: '1px solid #d1d5db', borderRadius: '4px', padding: '0.2rem 0.75rem', flex: 1, color: '#1f2937', fontWeight: '700', fontSize: '0.85rem' }}>
            =SUM(E2:E{filteredProducts.length + 1}) ➔ إجمالي المخزون الحالي: ${filteredProducts.reduce((acc, p) => acc + (p.unitPrice * p.quantity), 0).toLocaleString()} | +{filteredProducts.reduce((acc, p) => acc + p.quantity, 0).toLocaleString()} قطعة
          </div>
        </div>

        {/* EXCEL SHEET DATA GRID WITH EXCEL COLUMN HEADERS (A, B, C, D...) */}
        <div style={{ overflowX: 'auto', overflowY: 'auto', flex: 1, background: '#ffffff' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem', textWrap: 'nowrap' }}>
            <thead>
              {/* Excel Column Letters Sub-Header (A, B, C, D...) */}
              <tr style={{ background: '#e5e7eb', color: '#4b5563', fontSize: '0.78rem', fontWeight: '800', borderBottom: '1px solid #cbd5e1', textAlign: 'center' }}>
                <th style={{ padding: '0.35rem', width: '45px', borderRight: '1px solid #d1d5db' }}></th>
                <th style={{ padding: '0.35rem', borderRight: '1px solid #d1d5db' }}>A</th>
                <th style={{ padding: '0.35rem', borderRight: '1px solid #d1d5db' }}>B</th>
                <th style={{ padding: '0.35rem', borderRight: '1px solid #d1d5db' }}>C</th>
                <th style={{ padding: '0.35rem', borderRight: '1px solid #d1d5db' }}>D</th>
                <th style={{ padding: '0.35rem', borderRight: '1px solid #d1d5db' }}>E</th>
                <th style={{ padding: '0.35rem', borderRight: '1px solid #d1d5db' }}>F</th>
                <th style={{ padding: '0.35rem' }}>G</th>
              </tr>

              {/* Excel Main Headers */}
              <tr style={{ background: '#107c41', color: '#ffffff', fontSize: '0.88rem', fontWeight: '800', borderBottom: '2px solid #0b5c30' }}>
                <th style={{ padding: '0.75rem', textAlign: 'center', borderRight: '1px solid #159a53' }}>#</th>
                <th style={{ padding: '0.75rem 1.1rem', borderRight: '1px solid #159a53' }}>كود OEM / السيريال</th>
                <th style={{ padding: '0.75rem 1.1rem', borderRight: '1px solid #159a53' }}>اسم القطعة بالعربي</th>
                <th style={{ padding: '0.75rem 1.1rem', borderRight: '1px solid #159a53' }}>الموديل المتوافق</th>
                <th style={{ padding: '0.75rem 1.1rem', borderRight: '1px solid #159a53' }}>موقع الرف</th>
                <th style={{ padding: '0.75rem 1.1rem', borderRight: '1px solid #159a53' }}>سعر البيع ($)</th>
                <th style={{ padding: '0.75rem 1.1rem', borderRight: '1px solid #159a53', textAlign: 'center' }}>الكمية بالمخزون</th>
                <th style={{ padding: '0.75rem 1.1rem', textAlign: 'center' }}>الإجراءات</th>
              </tr>
            </thead>
            <tbody>
              {displayedProducts.map((p, index) => {
                const globalRowIndex = ((currentPage - 1) * ITEMS_PER_PAGE) + index + 1;
                const isEven = index % 2 === 0;
                const retail = Number(p.unitPrice) || 0;
                const qty = p.quantity || 0;

                return (
                  <tr 
                    key={p.id} 
                    style={{ 
                      background: isEven ? '#ffffff' : '#f9fafb', 
                      borderBottom: '1px solid #e5e7eb',
                      transition: 'background 0.15s ease'
                    }}
                  >
                    <td style={{ padding: '0.65rem 0.75rem', textAlign: 'center', fontWeight: '800', color: '#6b7280', background: '#f3f4f6', borderRight: '1px solid #d1d5db', fontSize: '0.82rem' }}>
                      {globalRowIndex}
                    </td>

                    <td className="mono" style={{ padding: '0.65rem 1.1rem', fontWeight: '900', color: '#d97706', borderRight: '1px solid #e5e7eb', fontSize: '0.95rem' }}>
                      {p.oem}
                    </td>

                    <td style={{ padding: '0.65rem 1.1rem', fontWeight: '900', color: '#111827', borderRight: '1px solid #e5e7eb', fontSize: '0.95rem' }}>
                      {p.arName || p.name}
                    </td>

                    <td style={{ padding: '0.65rem 1.1rem', borderRight: '1px solid #e5e7eb' }}>
                      <span style={{ fontSize: '0.78rem', background: '#e0f2fe', border: '1px solid #bae6fd', color: '#0369a1', padding: '0.2rem 0.55rem', borderRadius: '6px', fontWeight: '800' }}>
                        🚗 {p.vehicleModel || 'BYD Seagull'}
                      </span>
                    </td>

                    <td style={{ padding: '0.65rem 1.1rem', borderRight: '1px solid #e5e7eb', color: '#4b5563', fontWeight: '800' }}>
                      📌 {p.location || 'Shelf-A1'}
                    </td>

                    <td className="mono" style={{ padding: '0.65rem 1.1rem', borderRight: '1px solid #e5e7eb', fontWeight: '900', color: '#107c41', fontSize: '1.05rem' }}>
                      ${retail.toFixed(2)}
                    </td>

                    <td style={{ padding: '0.65rem 1.1rem', borderRight: '1px solid #e5e7eb', textAlign: 'center' }}>
                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', background: '#f3f4f6', padding: '0.15rem 0.45rem', borderRadius: '6px', border: '1px solid #d1d5db' }}>
                        <button onClick={() => onQuickAdjustStock(p.id, -1)} style={{ width: '26px', height: '26px', borderRadius: '4px', background: '#ffffff', border: '1px solid #d1d5db', cursor: 'pointer', fontWeight: 'bold', color: '#111827', fontSize: '1rem' }}>-</button>
                        <span className="mono" style={{ fontWeight: '900', minWidth: '28px', textAlign: 'center', fontSize: '1rem', color: qty <= 3 ? '#b45309' : '#107c41' }}>
                          {qty}
                        </span>
                        <button onClick={() => onQuickAdjustStock(p.id, 1)} style={{ width: '26px', height: '26px', borderRadius: '4px', background: '#ffffff', border: '1px solid #d1d5db', cursor: 'pointer', fontWeight: 'bold', color: '#111827', fontSize: '1rem' }}>+</button>
                      </div>
                    </td>

                    <td style={{ padding: '0.65rem 1.1rem', textAlign: 'center' }}>
                      <div style={{ display: 'flex', justifyContent: 'center', gap: '0.4rem' }}>
                        <button onClick={() => onEditItem(p)} style={{ padding: '0.35rem 0.75rem', borderRadius: '6px', background: '#f3f4f6', border: '1px solid #d1d5db', cursor: 'pointer', color: '#111827', fontWeight: '800', fontSize: '0.78rem' }}>تعديل ✏️</button>
                        <button onClick={() => onDeleteItem(p.id)} style={{ padding: '0.35rem 0.75rem', borderRadius: '6px', background: '#fef2f2', border: '1px solid #fca5a5', color: '#b91c1c', cursor: 'pointer', fontWeight: '800', fontSize: '0.78rem' }}>حذف 🗑️</button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>

            {/* EXCEL SUMMARY FOOTER ROW */}
            <tfoot>
              <tr style={{ background: '#e5e7eb', borderTop: '2px solid #107c41', fontWeight: '900', color: '#111827', fontSize: '0.9rem' }}>
                <td colSpan={5} style={{ padding: '0.75rem 1.1rem', borderRight: '1px solid #d1d5db' }}>
                  إجمالي ملخص الجدول (Excel Summary Totals) 📊
                </td>
                <td className="mono" style={{ padding: '0.75rem 1.1rem', borderRight: '1px solid #d1d5db', color: '#107c41', fontSize: '1.1rem' }}>
                  ${filteredProducts.reduce((acc, p) => acc + (p.unitPrice * p.quantity), 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </td>
                <td className="mono" style={{ padding: '0.75rem 1.1rem', borderRight: '1px solid #d1d5db', color: '#111827', textAlign: 'center', fontSize: '1.1rem' }}>
                  +{filteredProducts.reduce((acc, p) => acc + p.quantity, 0).toLocaleString()} قطعة
                </td>
                <td style={{ textAlign: 'center' }}>-</td>
              </tr>
            </tfoot>
          </table>
        </div>

      </div>
    </div>
  );
}
