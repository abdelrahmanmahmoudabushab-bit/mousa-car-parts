import React, { useState, useMemo } from 'react';
import { UploadCloud, Download, CheckCircle2, RefreshCw, Languages, Search, Plus, Trash2, Edit2, Sparkles, MapPin, PackageCheck, AlertTriangle, Car, ShieldCheck } from 'lucide-react';
import { parseExcelFile, parsePdfFile, matchProductSearch } from '../utils/documentParser';
import VinLookupBar from './VinLookupBar';

export default function LightStockManager({ products, categories, token, onProductsUpdated, onOpenAddItem, onEditItem, onDeleteItem, onQuickAdjustStock }) {
  // Directory Search & Filter State
  const [search, setSearch] = useState('');
  const [selectedCat, setSelectedCat] = useState('all');
  const [selectedModel, setSelectedModel] = useState('all');
  const [selectedYear, setSelectedYear] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 50;

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

  // Download Sample CSV
  const handleDownloadDemoCSV = () => {
    const csvContent = `OEM Code,Chinese Spec,Cost Price,Quantity,Category,Vehicle Model\nEQEA-5402841,右前门裙板,42.00,10,Body Panels,Mousa Car Parts OEM\nEQEA-8403019/70,右翼子板总成 M00666,85.00,5,Fenders & Hoods,Mousa Car Parts OEM\nST-6206109,右后门上铰链总成,12.00,20,Hinges,Mousa Car Parts OEM`;
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'sample_auto_parts_stock.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
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
    <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem', height: '100%', overflowY: 'auto' }}>
      
      {/* 🚀 LIGHTWEIGHT PDF & EXCEL STOCK PULLER BAR */}
      <div style={{ background: 'linear-gradient(135deg, #0f172a, #1e293b)', padding: '1.25rem 1.5rem', borderRadius: '16px', border: '1px solid rgba(255, 255, 255, 0.12)', color: 'white' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <div style={{ fontSize: '0.78rem', color: '#60a5fa', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <Languages size={15} /> Instant PDF & Excel Stock Puller
            </div>
            <h2 style={{ fontSize: '1.3rem', fontWeight: '800', margin: '0.2rem 0 0' }}>
              Pull Stock from PDF / Excel & Auto-Translate Chinese → Arabic
            </h2>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <button 
              onClick={handleDownloadDemoCSV}
              className="btn-secondary"
              style={{ fontSize: '0.8rem', padding: '0.5rem 0.85rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}
            >
              <Download size={14} /> Sample CSV
            </button>

            <button
              onClick={() => {
                const input = document.createElement('input');
                input.type = 'file';
                input.accept = '.pdf, .xlsx, .xls, .csv';
                input.onchange = (e) => handleFileDrop(e.target.files[0]);
                input.click();
              }}
              className="btn-primary"
              style={{ padding: '0.6rem 1.25rem', fontSize: '0.88rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
            >
              <UploadCloud size={18} /> Upload PDF / Excel Stock File
            </button>
          </div>
        </div>

        {/* Loading Bar */}
        {fileLoading && (
          <div style={{ marginTop: '1rem', padding: '0.75rem', background: 'rgba(59, 130, 246, 0.15)', borderRadius: '10px', display: 'flex', alignItems: 'center', gap: '0.75rem', color: '#60a5fa', fontSize: '0.88rem' }}>
            <RefreshCw className="spin" size={18} />
            <span>{loadingMsg}</span>
          </div>
        )}
      </div>

      {/* 📋 EXTRACTED REVIEW TABLE (PULLED FROM PDF/EXCEL) */}
      {extractedItems && (
        <div style={{ background: '#0f172a', border: '1px solid #3b82f6', borderRadius: '16px', padding: '1.25rem', color: 'white' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '1rem' }}>
            <div>
              <h3 style={{ fontSize: '1.1rem', fontWeight: '800', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#34d399' }}>
                <Sparkles size={18} /> Extracted Stock List ({extractedItems.length} Items Pulled)
              </h3>
              <div style={{ fontSize: '0.8rem', color: '#94a3b8', marginTop: '0.2rem' }}>
                Chinese auto parts translated to Arabic. Review details and click confirm to update inventory.
              </div>
            </div>

            {/* Currency Converter Control Bar */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', background: 'rgba(255, 255, 255, 0.06)', padding: '0.4rem 0.8rem', borderRadius: '10px', border: '1px solid rgba(255, 255, 255, 0.12)' }}>
              <span style={{ fontSize: '0.78rem', color: '#60a5fa', fontWeight: '700' }}>💵 Invoice Currency:</span>
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
                Confirm & Add Stock to System
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

                    <td style={{ padding: '0.55rem 0.85rem', fontFamily: 'var(--font-mono)', fontWeight: '700', color: 'white' }}>
                      {item.oem}
                    </td>

                    <td style={{ padding: '0.55rem 0.85rem', color: '#cbd5e1' }}>
                      {item.cnName || item.name}
                    </td>

                    <td style={{ padding: '0.55rem 0.85rem' }}>
                      <input
                        type="text"
                        value={item.arName || ''}
                        onChange={(e) => {
                          const val = e.target.value;
                          setExtractedItems(prev =>
                            prev.map((it, i) => i === idx ? { ...it, arName: val } : it)
                          );
                        }}
                        dir="rtl"
                        style={{ padding: '0.25rem 0.5rem', borderRadius: '6px', border: '1px solid rgba(16, 185, 129, 0.3)', background: 'rgba(16, 185, 129, 0.1)', color: '#34d399', width: '200px', fontSize: '0.8rem', fontFamily: "'Cairo', sans-serif", fontWeight: '700' }}
                      />
                    </td>

                    <td style={{ padding: '0.55rem 0.85rem' }}>
                      ${(Number(item.costPrice) || 0).toFixed(2)}
                    </td>

                    <td style={{ padding: '0.55rem 0.85rem', fontWeight: 'bold', color: '#60a5fa' }}>
                      ${(Number(item.unitPrice) || 0).toFixed(2)}
                    </td>

                    <td style={{ padding: '0.55rem 0.85rem', fontWeight: 'bold', color: '#fbbf24' }}>
                      +{item.quantity}
                    </td>
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
        onSearchChange={(val) => handleFilterChange(setSearch, val)}
        onSearchSubmit={() => setCurrentPage(1)}
        selectedModel={selectedModel}
        onModelChange={(val) => handleFilterChange(setSelectedModel, val)}
        selectedYear={selectedYear}
        onYearChange={(val) => handleFilterChange(setSelectedYear, val)}
        matchedCount={filteredProducts.length}
        totalCount={products.length}
      />

      {/* 📦 STOCK DIRECTORY TABLE */}
      <div style={{ background: '#ffffff', border: '1px solid var(--border-color)', borderRadius: '16px', padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1rem', flex: 1, boxShadow: 'var(--shadow-card)' }}>
        
        {/* Category & New Item Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h3 style={{ fontSize: '1.15rem', fontWeight: '800', margin: 0, color: 'var(--text-main)' }}>Current Inventory Directory</h3>
            <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>{filteredProducts.length} of {products.length} OEM Auto Parts Matching Fitment</div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <select
              value={selectedCat}
              onChange={(e) => handleFilterChange(setSelectedCat, e.target.value)}
              style={{ padding: '0.55rem 0.85rem', borderRadius: '8px', border: '1px solid var(--border-color)', background: '#f8fafc', fontSize: '0.85rem', outline: 'none', fontWeight: '600' }}
            >
              <option value="all">All Part Categories</option>
              {categories.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>

            <button onClick={onOpenAddItem} className="btn-primary" style={{ padding: '0.55rem 1rem', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.4rem', background: '#059669' }}>
              <Plus size={16} /> New Part
            </button>
          </div>
        </div>

        {/* Pagination Bar */}
        {totalPages > 1 && (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f8fafc', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '0.4rem 0.75rem' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: '600' }}>
              Showing {((currentPage - 1) * ITEMS_PER_PAGE) + 1} - {Math.min(currentPage * ITEMS_PER_PAGE, filteredProducts.length)} of {filteredProducts.length} items
            </span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <button
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                style={{ padding: '0.25rem 0.65rem', borderRadius: '6px', border: '1px solid var(--border-color)', background: currentPage === 1 ? '#e2e8f0' : '#ffffff', color: currentPage === 1 ? '#94a3b8' : 'var(--text-main)', cursor: currentPage === 1 ? 'default' : 'pointer', fontSize: '0.78rem', fontWeight: '700' }}
              >
                ◀ Prev
              </button>
              <span style={{ fontSize: '0.8rem', fontWeight: '700', padding: '0 0.3rem' }}>
                Page {currentPage} of {totalPages}
              </span>
              <button
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                style={{ padding: '0.25rem 0.65rem', borderRadius: '6px', border: '1px solid var(--border-color)', background: currentPage === totalPages ? '#e2e8f0' : '#ffffff', color: currentPage === totalPages ? '#94a3b8' : 'var(--text-main)', cursor: currentPage === totalPages ? 'default' : 'pointer', fontSize: '0.78rem', fontWeight: '700' }}
              >
                Next ▶
              </button>
            </div>
          </div>
        )}

        {/* Directory Table */}
        <div style={{ overflowY: 'auto', flex: 1, border: '1px solid var(--border-color)', borderRadius: '10px' }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>OEM Code</th>
                <th>Part Title & Arabic Spec</th>
                <th>Vehicle Fitment (Model & Year)</th>
                <th>Bin Location</th>
                <th>Cost</th>
                <th>Retail Price</th>
                <th>Current Stock</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {displayedProducts.map(p => (
                <tr key={p.id}>
                  <td className="mono" style={{ fontWeight: '700', color: 'var(--primary)' }}>{p.oem}</td>
                  <td>
                    <div style={{ fontWeight: '600' }}>{p.name}</div>
                    <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.15rem' }}>
                      {p.arName && (
                        <span style={{ fontSize: '0.75rem', color: '#059669', background: '#ecfdf5', padding: '0.1rem 0.4rem', borderRadius: '4px', border: '1px solid #a7f3d0', fontWeight: '700', fontFamily: "'Cairo', sans-serif" }}>
                          🇸🇦 {p.arName}
                        </span>
                      )}
                      {p.cnName && (
                        <span style={{ fontSize: '0.75rem', color: '#475569', background: '#f8fafc', padding: '0.1rem 0.4rem', borderRadius: '4px', border: '1px solid #e2e8f0' }}>
                          🇨🇳 {p.cnName}
                        </span>
                      )}
                    </div>
                  </td>
                  <td>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.78rem', background: 'rgba(59, 130, 246, 0.1)', color: '#2563eb', padding: '0.2rem 0.5rem', borderRadius: '6px', fontWeight: '600' }}>
                        🚗 {p.vehicleModel || 'BYD Seagull'}
                      </span>
                      <span style={{ fontSize: '0.72rem', color: '#64748b' }}>
                        Years: {p.yearRange || '2023 - 2026'}
                      </span>
                    </div>
                  </td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                      <MapPin size={12} style={{ color: 'var(--primary)' }} />
                      <span>{p.location}</span>
                    </div>
                  </td>
                  <td className="mono">${(Number(p.costPrice) || 0).toFixed(2)}</td>
                  <td className="mono" style={{ fontWeight: '700', color: 'var(--primary)' }}>${(Number(p.unitPrice) || 0).toFixed(2)}</td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                      <button onClick={() => onQuickAdjustStock(p.id, -1)} style={{ width: '22px', height: '22px', borderRadius: '4px', background: '#e2e8f0', border: 'none', cursor: 'pointer', fontWeight: 'bold' }}>-</button>
                      <span className="mono" style={{ fontWeight: '700', minWidth: '24px', textAlign: 'center' }}>{p.quantity}</span>
                      <button onClick={() => onQuickAdjustStock(p.id, 1)} style={{ width: '22px', height: '22px', borderRadius: '4px', background: '#e2e8f0', border: 'none', cursor: 'pointer', fontWeight: 'bold' }}>+</button>
                    </div>
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.3rem' }}>
                      <button onClick={() => onEditItem(p)} style={{ padding: '0.35rem', borderRadius: '6px', background: '#f1f5f9', border: '1px solid var(--border-color)', cursor: 'pointer' }}><Edit2 size={14} /></button>
                      <button onClick={() => onDeleteItem(p.id)} style={{ padding: '0.35rem', borderRadius: '6px', background: '#fee2e2', border: '1px solid #fca5a5', color: '#b91c1c', cursor: 'pointer' }}><Trash2 size={14} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
