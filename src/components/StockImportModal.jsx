import React, { useState, useEffect } from 'react';
import { UploadCloud, FileSpreadsheet, FileText, CheckCircle2, AlertCircle, RefreshCw, Languages, ArrowRight, Download, Sparkles, Plus, Layers, DollarSign } from 'lucide-react';
import { parseExcelFile, parsePdfFile } from '../utils/documentParser';

export default function StockImportModal({ products, categories, token, onClose, onImportSuccess }) {
  const [step, setStep] = useState('upload'); // 'upload' | 'review' | 'success'
  const [file, setFile] = useState(null);
  const [fileType, setFileType] = useState(''); // 'excel' | 'pdf'
  const [loading, setLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('');
  const [extractedItems, setExtractedItems] = useState([]);
  const [markupPercent, setMarkupPercent] = useState(50); // Default 50% markup for unit price
  const [defaultCategory, setDefaultCategory] = useState(categories[0]?.id || 'cat-body');
  const [importSummary, setImportSummary] = useState(null);

  // Demo file generator for instant user testing
  const handleDownloadDemoFile = () => {
    const csvContent = `OEM Part No,Arabic Name (اسم القطعة بالعربي),Cost Price (USD),Quantity incoming,Vehicle Model
EQEA-5402841,تنورة الباب الأمامي الأيمن,42.00,15,BYD Seagull
EQEA-8403019/70,تجميعة الرفرف الأيمن,85.00,10,BYD Seagull
ST-6206109,تجميعة المفصلة العلوية للباب الخلفي الأيمن,12.00,25,BYD Seagull
EQEA-2803411,حامل المصد الأمامي الأيمن,9.00,30,BYD Seagull
EQEA-5302430,تجميعة شريط تزيين حافة العجلة الخلفية اليسرى,22.00,12,BYD Seagull
EQEA-7701100,تجميعة الكشاف الأمامي (جديد),120.00,8,BYD Seagull
EQEA-6101200,تجميعة المرآة الجانبية الخارجية (كهربائي),65.00,14,BYD Seagull
EQEA-3501100,فحمات الفرامل الأمامية,28.00,40,BYD Seagull`;

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', 'mousa_carparts_stock_import_sample.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Handle File Selection
  const handleFileSelect = async (selectedFile) => {
    if (!selectedFile) return;

    setFile(selectedFile);
    const name = selectedFile.name.toLowerCase();
    let type = 'excel';
    if (name.endsWith('.pdf')) {
      type = 'pdf';
    }
    setFileType(type);

    setLoading(true);
    setLoadingMessage(`Extracting inventory data from ${selectedFile.name}...`);

    try {
      let rawItems = [];
      if (type === 'excel') {
        rawItems = await parseExcelFile(selectedFile);
      } else {
        rawItems = await parsePdfFile(selectedFile);
      }

      if (rawItems.length === 0) {
        alert('No product records could be extracted from this file. Please check the file format or try downloading the demo CSV.');
        setLoading(false);
        return;
      }

      setLoadingMessage(`Translating Chinese auto part names to Arabic...`);

      // Send to server translation API
      const res = await fetch('/api/import/translate-batch', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ items: rawItems })
      });

      const data = await res.json();
      const itemsWithTranslation = data.items || rawItems;

      // Enhance items with stock matching status & prices
      const processedItems = itemsWithTranslation.map(item => {
        const itemOem = (item.oem || '').trim().toLowerCase();
        const existing = products.find(p => 
          (p.oem || '').trim().toLowerCase() === itemOem || 
          (p.sku || '').trim().toLowerCase() === itemOem
        );

        const cost = parseFloat(item.costPrice) || (existing ? existing.costPrice : 20.00);
        const unit = item.unitPrice > 0 ? parseFloat(item.unitPrice) : Math.round(cost * (1 + markupPercent / 100));

        return {
          ...item,
          existingProduct: existing || null,
          isMatch: !!existing,
          costPrice: cost,
          unitPrice: unit,
          quantity: Math.max(1, parseInt(item.quantity || 1, 10)),
          arName: item.arName || item.translatedAr || '',
          categoryId: existing ? existing.categoryId : defaultCategory,
          selected: true
        };
      });

      setExtractedItems(processedItems);
      setStep('review');
    } catch (err) {
      console.error('Error parsing document:', err);
      alert('Failed to parse file: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  // Recalculate selling price when markup percentage changes
  const handleApplyMarkup = (newMarkup) => {
    setMarkupPercent(newMarkup);
    setExtractedItems(prev => prev.map(item => ({
      ...item,
      unitPrice: Math.round(item.costPrice * (1 + newMarkup / 100))
    })));
  };

  // Update item field in review table
  const handleItemChange = (index, field, value) => {
    setExtractedItems(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  // Confirm Batch Import
  const handleConfirmImport = async () => {
    const selectedItems = extractedItems.filter(item => item.selected);
    if (selectedItems.length === 0) {
      alert('Please select at least one item to import.');
      return;
    }

    setLoading(true);
    setLoadingMessage('Adding stock and updating inventory database...');

    try {
      const res = await fetch('/api/import/confirm-batch', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ items: selectedItems })
      });

      const data = await res.json();
      if (data.success) {
        setImportSummary(data.summary);
        if (onImportSuccess) onImportSuccess(data.products);
        setStep('success');
      } else {
        alert('Import failed: ' + (data.error || 'Unknown error'));
      }
    } catch (err) {
      alert('Error committing batch import: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const matchedCount = extractedItems.filter(i => i.isMatch && i.selected).length;
  const newCount = extractedItems.filter(i => !i.isMatch && i.selected).length;
  const totalQty = extractedItems.filter(i => i.selected).reduce((acc, i) => acc + (parseInt(i.quantity) || 0), 0);

  return (
    <div className="modal-overlay">
      <div className="modal-content" style={{ width: '1000px', maxWidth: '95vw', maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}>
        {/* Modal Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1.25rem 1.5rem', borderBottom: '1px solid rgba(255, 255, 255, 0.1)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{ padding: '0.5rem', borderRadius: '10px', background: 'linear-gradient(135deg, #2563eb, #7c3aed)', color: 'white' }}>
              <Languages size={24} />
            </div>
            <div>
              <h2 style={{ margin: 0, fontSize: '1.2rem', fontFamily: 'var(--font-heading)' }}>
                PDF & Excel Stock Importer
              </h2>
              <div style={{ fontSize: '0.8rem', color: '#94a3b8' }}>
                Extract stock list, auto-translate Chinese terms to Arabic, & update inventory
              </div>
            </div>
          </div>

          <button 
            onClick={onClose} 
            style={{ background: 'transparent', border: 'none', color: '#94a3b8', fontSize: '1.5rem', cursor: 'pointer', lineHeight: 1 }}
          >
            ×
          </button>
        </div>

        {/* Content Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '1.5rem' }}>
          {/* STEP 1: UPLOAD FILE */}
          {step === 'upload' && (
            <div style={{ textAlign: 'center', padding: '2rem 1rem' }}>
              {loading ? (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem', padding: '3rem 0' }}>
                  <RefreshCw className="spin" size={40} style={{ color: '#3b82f6' }} />
                  <div style={{ fontSize: '1.1rem', fontWeight: '600' }}>{loadingMessage}</div>
                  <div style={{ fontSize: '0.85rem', color: '#94a3b8' }}>Parsing lines and translating Chinese auto parts...</div>
                </div>
              ) : (
                <>
                  <div 
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => {
                      e.preventDefault();
                      if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                        handleFileSelect(e.dataTransfer.files[0]);
                      }
                    }}
                    style={{
                      border: '2px dashed rgba(59, 130, 246, 0.4)',
                      borderRadius: '16px',
                      padding: '3rem 2rem',
                      background: 'rgba(30, 41, 59, 0.4)',
                      backdropFilter: 'blur(8px)',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                    }}
                    onClick={() => {
                      const input = document.createElement('input');
                      input.type = 'file';
                      input.accept = '.xlsx, .xls, .csv, .pdf';
                      input.onchange = (e) => handleFileSelect(e.target.files[0]);
                      input.click();
                    }}
                  >
                    <div style={{ width: '64px', height: '64px', margin: '0 auto 1rem', borderRadius: '50%', background: 'rgba(59, 130, 246, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#3b82f6' }}>
                      <UploadCloud size={32} />
                    </div>

                    <h3 style={{ fontSize: '1.15rem', marginBottom: '0.5rem', fontWeight: '700' }}>
                      Drag and drop your Stock File (PDF or Excel)
                    </h3>
                    <p style={{ color: '#94a3b8', fontSize: '0.88rem', maxWidth: '480px', margin: '0 auto 1.5rem' }}>
                      Supports <strong>.xlsx, .xls, .csv</strong> spreadsheets and <strong>.pdf</strong> invoice / packing lists containing Chinese or English product names, OEM numbers, quantities & prices.
                    </p>

                    <button className="btn-primary" style={{ padding: '0.65rem 1.5rem', fontSize: '0.9rem' }}>
                      Browse File on Computer
                    </button>
                  </div>

                  <div style={{ marginTop: '2rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '1rem' }}>
                    <span style={{ fontSize: '0.85rem', color: '#94a3b8' }}>Don't have a file ready?</span>
                    <button 
                      onClick={handleDownloadDemoFile}
                      className="btn-secondary"
                      style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.82rem', padding: '0.4rem 0.8rem' }}
                    >
                      <Download size={14} /> Download Sample Chinese Stock CSV
                    </button>
                  </div>
                </>
              )}
            </div>
          )}

          {/* STEP 2: REVIEW & TRANSLATION TABLE */}
          {step === 'review' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              {/* Summary Stats Banner */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem' }}>
                <div className="stat-card">
                  <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Total Extracted</div>
                  <div style={{ fontSize: '1.4rem', fontWeight: '800', color: 'white' }}>{extractedItems.length} items</div>
                </div>

                <div className="stat-card" style={{ borderColor: 'rgba(16, 185, 129, 0.3)' }}>
                  <div style={{ fontSize: '0.75rem', color: '#34d399' }}>Stock Increment (+Qty)</div>
                  <div style={{ fontSize: '1.4rem', fontWeight: '800', color: '#34d399' }}>{matchedCount} matched</div>
                </div>

                <div className="stat-card" style={{ borderColor: 'rgba(59, 130, 246, 0.3)' }}>
                  <div style={{ fontSize: '0.75rem', color: '#60a5fa' }}>New Products</div>
                  <div style={{ fontSize: '1.4rem', fontWeight: '800', color: '#60a5fa' }}>{newCount} new</div>
                </div>

                <div className="stat-card" style={{ borderColor: 'rgba(245, 158, 11, 0.3)' }}>
                  <div style={{ fontSize: '0.75rem', color: '#fbbf24' }}>Total Incoming Stock</div>
                  <div style={{ fontSize: '1.4rem', fontWeight: '800', color: '#fbbf24' }}>+{totalQty} units</div>
                </div>
              </div>

              {/* Markup & Quick Tool Options */}
              <div style={{ background: 'rgba(30, 41, 59, 0.5)', padding: '0.85rem 1.25rem', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <span style={{ fontSize: '0.85rem', fontWeight: '600', color: '#e2e8f0', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <DollarSign size={16} style={{ color: '#34d399' }} /> Auto Selling Markup:
                  </span>
                  {[30, 40, 50, 60, 75].map(pct => (
                    <button
                      key={pct}
                      onClick={() => handleApplyMarkup(pct)}
                      style={{
                        padding: '0.25rem 0.6rem',
                        fontSize: '0.78rem',
                        borderRadius: '6px',
                        border: markupPercent === pct ? '1px solid #3b82f6' : '1px solid rgba(255, 255, 255, 0.1)',
                        background: markupPercent === pct ? 'rgba(59, 130, 246, 0.2)' : 'transparent',
                        color: markupPercent === pct ? '#60a5fa' : '#94a3b8',
                        cursor: 'pointer'
                      }}
                    >
                      +{pct}%
                    </button>
                  ))}
                </div>

                <div style={{ fontSize: '0.8rem', color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <Sparkles size={15} style={{ color: '#fbbf24' }} /> Chinese terms translated to Arabic (editable below)
                </div>
              </div>

              {/* Review Table */}
              <div style={{ border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '12px', overflow: 'hidden' }}>
                <div style={{ overflowX: 'auto', maxHeight: '420px' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem', textAlign: 'left' }}>
                    <thead>
                      <tr style={{ background: 'rgba(15, 23, 42, 0.8)', borderBottom: '1px solid rgba(255, 255, 255, 0.1)', color: '#94a3b8', fontSize: '0.78rem', textTransform: 'uppercase' }}>
                        <th style={{ padding: '0.75rem 1rem', width: '40px' }}>Import</th>
                        <th style={{ padding: '0.75rem 1rem' }}>Status</th>
                        <th style={{ padding: '0.75rem 1rem' }}>OEM / Part No</th>
                        <th style={{ padding: '0.75rem 1rem' }}>اسم الفاتورة الأصلية</th>
                        <th style={{ padding: '0.75rem 1rem', color: '#34d399' }}>Arabic Translation (الاسم بالعربي)</th>
                        <th style={{ padding: '0.75rem 1rem', width: '90px' }}>Cost ($)</th>
                        <th style={{ padding: '0.75rem 1rem', width: '90px' }}>Price ($)</th>
                        <th style={{ padding: '0.75rem 1rem', width: '80px' }}>+Qty</th>
                      </tr>
                    </thead>
                    <tbody>
                      {extractedItems.map((item, idx) => (
                        <tr 
                          key={idx} 
                          style={{ 
                            borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
                            background: item.selected ? 'transparent' : 'rgba(0, 0, 0, 0.2)',
                            opacity: item.selected ? 1 : 0.5
                          }}
                        >
                          <td style={{ padding: '0.65rem 1rem' }}>
                            <input 
                              type="checkbox" 
                              checked={item.selected} 
                              onChange={(e) => handleItemChange(idx, 'selected', e.target.checked)}
                              style={{ accentColor: '#3b82f6', width: '16px', height: '16px', cursor: 'pointer' }}
                            />
                          </td>

                          <td style={{ padding: '0.65rem 1rem' }}>
                            {item.isMatch ? (
                              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', padding: '0.2rem 0.55rem', borderRadius: '20px', background: 'rgba(16, 185, 129, 0.15)', color: '#34d399', fontSize: '0.72rem', fontWeight: '600', border: '1px solid rgba(16, 185, 129, 0.3)' }}>
                                <CheckCircle2 size={12} /> Stock +{item.quantity}
                              </span>
                            ) : (
                              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', padding: '0.2rem 0.55rem', borderRadius: '20px', background: 'rgba(59, 130, 246, 0.15)', color: '#60a5fa', fontSize: '0.72rem', fontWeight: '600', border: '1px solid rgba(59, 130, 246, 0.3)' }}>
                                <Plus size={12} /> New Product
                              </span>
                            )}
                          </td>

                          <td style={{ padding: '0.65rem 1rem', fontFamily: 'var(--font-mono)', fontWeight: '600', color: 'white' }}>
                            <input 
                              type="text" 
                              value={item.oem} 
                              onChange={(e) => handleItemChange(idx, 'oem', e.target.value)}
                              className="input-field-sm"
                              style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem', width: '130px' }}
                            />
                          </td>

                          <td style={{ padding: '0.65rem 1rem', color: '#cbd5e1', fontSize: '0.82rem' }}>
                            {item.cnName || item.name}
                          </td>

                          <td style={{ padding: '0.65rem 1rem' }}>
                            <input 
                              type="text" 
                              value={item.arName} 
                              onChange={(e) => handleItemChange(idx, 'arName', e.target.value)}
                              placeholder="أدخل الاسم بالعربي"
                              className="input-field-sm"
                              dir="rtl"
                              style={{ 
                                fontFamily: "'Cairo', 'Inter', sans-serif",
                                fontWeight: '600',
                                color: '#34d399',
                                width: '220px',
                                background: 'rgba(16, 185, 129, 0.08)',
                                borderColor: 'rgba(16, 185, 129, 0.3)'
                              }}
                            />
                          </td>

                          <td style={{ padding: '0.65rem 1rem' }}>
                            <input 
                              type="number" 
                              value={item.costPrice} 
                              onChange={(e) => handleItemChange(idx, 'costPrice', parseFloat(e.target.value) || 0)}
                              className="input-field-sm"
                              style={{ width: '70px', textAlign: 'right' }}
                            />
                          </td>

                          <td style={{ padding: '0.65rem 1rem' }}>
                            <input 
                              type="number" 
                              value={item.unitPrice} 
                              onChange={(e) => handleItemChange(idx, 'unitPrice', parseFloat(e.target.value) || 0)}
                              className="input-field-sm"
                              style={{ width: '70px', textAlign: 'right', fontWeight: 'bold', color: '#60a5fa' }}
                            />
                          </td>

                          <td style={{ padding: '0.65rem 1rem' }}>
                            <input 
                              type="number" 
                              value={item.quantity} 
                              onChange={(e) => handleItemChange(idx, 'quantity', parseInt(e.target.value, 10) || 1)}
                              className="input-field-sm"
                              style={{ width: '60px', textAlign: 'center', fontWeight: 'bold', color: '#fbbf24' }}
                            />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* STEP 3: SUCCESS CONFIRMATION */}
          {step === 'success' && importSummary && (
            <div style={{ textAlign: 'center', padding: '2.5rem 1rem' }}>
              <div style={{ width: '72px', height: '72px', borderRadius: '50%', background: 'rgba(16, 185, 129, 0.15)', color: '#34d399', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem', border: '1px solid rgba(16, 185, 129, 0.3)' }}>
                <CheckCircle2 size={44} />
              </div>

              <h2 style={{ fontSize: '1.4rem', fontWeight: '800', color: 'white', marginBottom: '0.5rem' }}>
                Stock Import Completed Successfully!
              </h2>

              <p style={{ color: '#94a3b8', fontSize: '0.9rem', maxWidth: '500px', margin: '0 auto 2rem' }}>
                The inventory database has been updated. Stock quantities have been incremented and new products have been registered with Arabic translations.
              </p>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', maxWidth: '600px', margin: '0 auto 2rem' }}>
                <div style={{ background: 'rgba(30, 41, 59, 0.6)', padding: '1rem', borderRadius: '12px', border: '1px solid rgba(255, 255, 255, 0.1)' }}>
                  <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Existing Items Updated</div>
                  <div style={{ fontSize: '1.6rem', fontWeight: '800', color: '#34d399' }}>{importSummary.updatedCount}</div>
                </div>

                <div style={{ background: 'rgba(30, 41, 59, 0.6)', padding: '1rem', borderRadius: '12px', border: '1px solid rgba(255, 255, 255, 0.1)' }}>
                  <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>New Catalog Products</div>
                  <div style={{ fontSize: '1.6rem', fontWeight: '800', color: '#60a5fa' }}>{importSummary.createdCount}</div>
                </div>

                <div style={{ background: 'rgba(30, 41, 59, 0.6)', padding: '1rem', borderRadius: '12px', border: '1px solid rgba(255, 255, 255, 0.1)' }}>
                  <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Total Quantity Added</div>
                  <div style={{ fontSize: '1.6rem', fontWeight: '800', color: '#fbbf24' }}>+{importSummary.totalQuantityAdded}</div>
                </div>
              </div>

              <button className="btn-primary" onClick={onClose} style={{ padding: '0.75rem 2rem', fontSize: '0.95rem' }}>
                Back to Stock Directory
              </button>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        {step === 'review' && (
          <div style={{ padding: '1rem 1.5rem', borderTop: '1px solid rgba(255, 255, 255, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(15, 23, 42, 0.6)' }}>
            <button className="btn-secondary" onClick={() => setStep('upload')}>
              ← Upload Another File
            </button>

            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <span style={{ fontSize: '0.85rem', color: '#94a3b8' }}>
                Importing <strong>{extractedItems.filter(i => i.selected).length}</strong> items (+{totalQty} qty)
              </span>

              <button 
                className="btn-primary" 
                onClick={handleConfirmImport} 
                disabled={loading}
                style={{ padding: '0.65rem 1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
              >
                {loading ? <RefreshCw className="spin" size={16} /> : <CheckCircle2 size={16} />} 
                Confirm & Add Stock to System
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
