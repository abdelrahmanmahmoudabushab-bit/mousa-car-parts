import React, { useState } from 'react';
import { FileText, QrCode, UploadCloud, Download, Search, CheckCircle2, RefreshCw, ArrowRight, Barcode, Plus, Trash2, ShieldCheck, MapPin } from 'lucide-react';
import { parseExcelFile, parsePdfFile } from '../utils/documentParser';

export default function StockImportPage({ products = [], categories = [], token, lang = 'ar', onProductsUpdated, onBackToPortal }) {
  const [activeChoice, setActiveChoice] = useState('menu'); // 'menu' | 'pdf' | 'qr'

  // PDF/Excel Import state
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [loadingMsg, setLoadingMsg] = useState('');
  const [extractedItems, setExtractedItems] = useState([]);
  const [importSuccess, setImportSuccess] = useState(false);

  // QR / Barcode Scan state
  const [scannedSerial, setScannedSerial] = useState('');
  const [scanQty, setScanQty] = useState(1);
  const [scannedHistory, setScannedHistory] = useState([]);
  const [foundProduct, setFoundProduct] = useState(null);
  const [scanMessage, setScanMessage] = useState('');

  // Handle PDF/Excel Upload
  const handleFileUpload = async (selectedFile) => {
    if (!selectedFile) return;
    setFile(selectedFile);
    setLoading(true);
    setLoadingMsg(lang === 'ar' ? `جاري قراءة واستخراج قطع الغيار من الملف ${selectedFile.name}...` : `Extracting parts from ${selectedFile.name}...`);

    try {
      const name = selectedFile.name.toLowerCase();
      let rawItems = [];
      if (name.endsWith('.pdf')) {
        rawItems = await parsePdfFile(selectedFile);
      } else {
        rawItems = await parseExcelFile(selectedFile);
      }

      if (rawItems.length === 0) {
        alert(lang === 'ar' ? 'لم يتم العثور على قطع غيار بالملف. تأكد من صيغة الملف.' : 'No parts extracted. Please check file format.');
        setLoading(false);
        return;
      }

      setLoadingMsg(lang === 'ar' ? 'جاري ترجمة أسماء القطع وإقرانها ببيانات المستودع...' : 'Translating auto parts...');

      // Translate via backend API
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

      const processed = itemsWithTranslation.map(item => {
        const itemOem = (item.oem || '').trim().toLowerCase();
        const existing = products.find(p => (p.oem || '').trim().toLowerCase() === itemOem);
        return {
          ...item,
          existingProduct: existing || null,
          isMatch: !!existing,
          costPrice: parseFloat(item.costPrice) || (existing ? existing.costPrice : 15.00),
          unitPrice: parseFloat(item.unitPrice) || (existing ? existing.unitPrice : 25.00),
          quantity: Math.max(1, parseInt(item.quantity || 1, 10)),
          arName: item.arName || item.translatedAr || '',
          selected: true
        };
      });

      setExtractedItems(processed);
    } catch (err) {
      alert('خطأ أثناء قراءة الملف: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  // Confirm PDF/Excel Import
  const handleConfirmImport = async () => {
    const selected = extractedItems.filter(i => i.selected);
    if (selected.length === 0) return;

    setLoading(true);
    setLoadingMsg(lang === 'ar' ? 'جاري حفظ وإدخال قطع الغيار في قاعدة بيانات المستودع...' : 'Saving stock to database...');

    try {
      const res = await fetch('/api/import/confirm-batch', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ items: selected })
      });

      const data = await res.json();
      if (data.success) {
        if (onProductsUpdated) onProductsUpdated(data.products);
        setImportSuccess(true);
      } else {
        alert('فشل الإدخال: ' + (data.error || 'خطأ غير معروف'));
      }
    } catch (err) {
      alert('خطأ في إرسال البيانات: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  // Handle Barcode / QR Serial Scan
  const handleSerialScan = async (e) => {
    e.preventDefault();
    const query = scannedSerial.trim();
    if (!query) return;

    // Look for matching product by OEM, Barcode, SKU, or Serial
    const itemMatch = products.find(p => 
      (p.oem || '').toLowerCase() === query.toLowerCase() ||
      (p.sku || '').toLowerCase() === query.toLowerCase() ||
      (p.id || '').toLowerCase() === query.toLowerCase()
    );

    if (itemMatch) {
      setFoundProduct(itemMatch);
      // Automatically increment stock on server
      try {
        const res = await fetch(`/api/products/${itemMatch.id}/adjust-stock`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ adjustment: scanQty })
        });
        const data = await res.json();
        if (data.success) {
          if (onProductsUpdated) onProductsUpdated(data.products);
          setScanMessage(`✅ تم تحديث كمية القطعة (${itemMatch.arName || itemMatch.oem}) بمقدار +${scanQty}`);
          setScannedHistory(prev => [
            { id: query, oem: itemMatch.oem, name: itemMatch.arName || itemMatch.name, qtyAdded: scanQty, date: new Date().toLocaleTimeString('ar-SA') },
            ...prev
          ]);
        }
      } catch (err) {
        console.error(err);
      }
    } else {
      setScanMessage(`⚠️ لم يتم العثور على قطعة برقم السيريال/OEM: (${query}). يمكن إضافتها يدويًا.`);
    }

    setScannedSerial('');
  };

  return (
    <div style={{ minHeight: '100vh', width: '100%', background: '#ffffff', color: '#0f172a', fontFamily: "'Cairo', sans-serif", padding: '2rem 1.5rem', overflowY: 'auto' }}>
      
      {/* Top Header Controls */}
      <div style={{ maxWidth: '1000px', margin: '0 auto 2rem auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '2px solid #f1f5f9', paddingBottom: '1.25rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
          <div style={{ width: '46px', height: '46px', borderRadius: '12px', background: '#fffbeb', border: '1px solid #fde68a', color: '#d97706', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <UploadCloud size={24} />
          </div>
          <div>
            <h1 style={{ fontSize: '1.6rem', fontWeight: '800', margin: 0, color: '#0f172a' }}>
              إدخال وسحب المخزون (Stock Entry Portal)
            </h1>
            <p style={{ fontSize: '0.88rem', color: '#64748b', margin: '0.15rem 0 0 0', fontWeight: '600' }}>
              اختر طريقة الإدخال المناسبة لقطع الغيار الجديدة
            </p>
          </div>
        </div>

        {onBackToPortal && (
          <button
            onClick={onBackToPortal}
            style={{ padding: '0.55rem 1.15rem', borderRadius: '10px', background: '#f8fafc', border: '1px solid #cbd5e1', color: '#0f172a', fontWeight: '800', cursor: 'pointer', fontSize: '0.88rem', display: 'flex', alignItems: 'center', gap: '0.4rem', fontFamily: "'Cairo', sans-serif" }}
          >
            <ArrowRight size={16} /> العودة للرئيسية
          </button>
        )}
      </div>

      {/* Main Choice Screen */}
      <div style={{ maxWidth: '1000px', margin: '0 auto' }}>

        {/* 2 MAIN CHOICE CARDS */}
        {activeChoice === 'menu' && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '2rem', margin: '2rem 0' }}>
            
            {/* CHOICE 1: PULL FROM PDF / EXCEL */}
            <div
              onClick={() => setActiveChoice('pdf')}
              style={{
                background: '#ffffff',
                border: '2px solid #2563eb',
                borderRadius: '24px',
                padding: '2.5rem 2rem',
                boxShadow: '0 10px 30px rgba(37, 99, 235, 0.08)',
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                transition: 'all 0.2s ease'
              }}
            >
              <div>
                <div style={{ width: '64px', height: '64px', borderRadius: '18px', background: '#eff6ff', border: '1px solid #bfdbfe', color: '#2563eb', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1.5rem' }}>
                  <FileText size={32} />
                </div>
                <h2 style={{ fontSize: '1.5rem', fontWeight: '800', color: '#0f172a', margin: '0 0 0.5rem 0' }}>
                  📄 سحب وتصدير من ملف PDF / Excel
                </h2>
                <p style={{ color: '#64748b', fontSize: '0.92rem', lineHeight: '1.6', margin: 0, fontWeight: '600' }}>
                  ارفع فواتير الشراء وملفات قطع الغيار بضغطة واحدة، وسيقوم النظام بتفعيل واستخراج أرقام OEM والأسعار والترجمة التلقائية إلى اللغة العربية.
                </p>
              </div>

              <button className="btn-primary" style={{ marginTop: '2rem', padding: '0.9rem', fontSize: '1rem', fontWeight: '800', width: '100%', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                <FileText size={20} /> سحب قطع الغيار من ملف 📄
              </button>
            </div>

            {/* CHOICE 2: SCAN QR / BARCODE */}
            <div
              onClick={() => setActiveChoice('qr')}
              style={{
                background: '#ffffff',
                border: '2px solid #d97706',
                borderRadius: '24px',
                padding: '2.5rem 2rem',
                boxShadow: '0 10px 30px rgba(217, 119, 6, 0.08)',
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                transition: 'all 0.2s ease'
              }}
            >
              <div>
                <div style={{ width: '64px', height: '64px', borderRadius: '18px', background: '#fffbeb', border: '1px solid #fde68a', color: '#d97706', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1.5rem' }}>
                  <QrCode size={32} />
                </div>
                <h2 style={{ fontSize: '1.5rem', fontWeight: '800', color: '#0f172a', margin: '0 0 0.5rem 0' }}>
                  📷 مسح البار كود / QR (قراءة الرقم التسلسلي)
                </h2>
                <p style={{ color: '#64748b', fontSize: '0.92rem', lineHeight: '1.6', margin: 0, fontWeight: '600' }}>
                  استخدم قارئ الباركود أو الكاميرا لقراءة الرقم التسلسلي (Serial Number) ورقم الهيكل OEM لزيادة الكميات بالمستودع فورًا وتتبع الشحنات.
                </p>
              </div>

              <button className="btn-sand" style={{ marginTop: '2rem', padding: '0.9rem', fontSize: '1rem', fontWeight: '800', width: '100%', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                <Barcode size={20} /> مسح السيريال كود 📷
              </button>
            </div>

          </div>
        )}

        {/* CHOICE 1 VIEW: PDF / EXCEL FILE PULL */}
        {activeChoice === 'pdf' && (
          <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '20px', padding: '2rem', boxShadow: '0 4px 20px rgba(0,0,0,0.04)' }}>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h2 style={{ fontSize: '1.3rem', fontWeight: '800', color: '#0f172a', margin: 0 }}>
                📄 سحب قطع الغيار من ملف PDF أو Excel
              </h2>
              <button onClick={() => { setActiveChoice('menu'); setExtractedItems([]); setFile(null); setImportSuccess(false); }} style={{ padding: '0.4rem 0.85rem', background: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '8px', cursor: 'pointer', fontWeight: '700', fontSize: '0.82rem' }}>
                ← العودة لخيارات الإدخال
              </button>
            </div>

            {!file && !extractedItems.length && (
              <div 
                onClick={() => {
                  const input = document.createElement('input');
                  input.type = 'file';
                  input.accept = '.pdf, .xlsx, .xls, .csv';
                  input.onchange = (e) => handleFileUpload(e.target.files[0]);
                  input.click();
                }}
                style={{
                  border: '2px dashed #3b82f6',
                  borderRadius: '16px',
                  padding: '3.5rem 2rem',
                  textAlign: 'center',
                  background: '#f8fafc',
                  cursor: 'pointer'
                }}
              >
                <UploadCloud size={48} style={{ color: '#2563eb', marginBottom: '1rem' }} />
                <h3 style={{ fontSize: '1.2rem', fontWeight: '800', margin: '0 0 0.5rem 0' }}>انقر هنا لاختيار ملف فاتورة (PDF / Excel / CSV)</h3>
                <p style={{ color: '#64748b', fontSize: '0.88rem', margin: 0, fontWeight: '600' }}>تدعم النظام سحب الفواتير باللغات العربية، الصينية والإنجلیزية وتعديل الأسعار تلقائيًا</p>
              </div>
            )}

            {loading && (
              <div style={{ textAlign: 'center', padding: '3rem 1rem' }}>
                <RefreshCw className="spin" size={36} style={{ color: '#d97706', marginBottom: '1rem' }} />
                <div style={{ fontSize: '1.1rem', fontWeight: '800', color: '#0f172a' }}>{loadingMsg}</div>
              </div>
            )}

            {extractedItems.length > 0 && !importSuccess && !loading && (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', background: '#fffbeb', border: '1px solid #fde68a', padding: '0.85rem 1.25rem', borderRadius: '12px' }}>
                  <span style={{ fontSize: '0.9rem', fontWeight: '800', color: '#b45309' }}>
                    تم استخراج {extractedItems.length} قطعة غيار جاهزة للإدخال بالمستودع
                  </span>
                  <button onClick={handleConfirmImport} className="btn-sand" style={{ padding: '0.55rem 1.25rem', fontSize: '0.9rem', fontWeight: '800' }}>
                    تأكيد وحفظ القطع بالمستودع 📥
                  </button>
                </div>

                <table className="data-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ background: '#f8fafc', color: '#475569', fontSize: '0.85rem', fontWeight: '800' }}>
                      <th style={{ padding: '0.75rem' }}>OEM Code</th>
                      <th style={{ padding: '0.75rem' }}>الاسم بالعربي</th>
                      <th style={{ padding: '0.75rem' }}>التكلفة ($)</th>
                      <th style={{ padding: '0.75rem' }}>سعر البيع ($)</th>
                      <th style={{ padding: '0.75rem' }}>الكمية</th>
                    </tr>
                  </thead>
                  <tbody>
                    {extractedItems.map((item, idx) => (
                      <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td className="mono" style={{ fontWeight: '800', color: '#d97706' }}>{item.oem}</td>
                        <td style={{ fontWeight: '800', color: '#0f172a' }}>{item.arName || item.name}</td>
                        <td className="mono">${(Number(item.costPrice) || 0).toFixed(2)}</td>
                        <td className="mono" style={{ fontWeight: '800', color: '#0f172a' }}>${(Number(item.unitPrice) || 0).toFixed(2)}</td>
                        <td className="mono" style={{ fontWeight: '800', color: '#047857' }}>+{item.quantity}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {importSuccess && (
              <div style={{ textAlign: 'center', padding: '3rem 1rem' }}>
                <CheckCircle2 size={56} style={{ color: '#047857', marginBottom: '1rem' }} />
                <h2 style={{ fontSize: '1.4rem', fontWeight: '800', color: '#0f172a' }}>تم حفظ وإدخال قطع الغيار بنجاح!</h2>
                <button onClick={() => { setActiveChoice('menu'); setExtractedItems([]); setFile(null); setImportSuccess(false); }} className="btn-sand" style={{ marginTop: '1.5rem', padding: '0.75rem 1.75rem', fontWeight: '800' }}>
                  العودة للخيارات الرئيسية
                </button>
              </div>
            )}
          </div>
        )}

        {/* CHOICE 2 VIEW: QR / BARCODE SCANNER */}
        {activeChoice === 'qr' && (
          <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '20px', padding: '2rem', boxShadow: '0 4px 20px rgba(0,0,0,0.04)' }}>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h2 style={{ fontSize: '1.3rem', fontWeight: '800', color: '#0f172a', margin: 0 }}>
                📷 قراءة الباركود والسيريال كود (Serial & QR Scanner)
              </h2>
              <button onClick={() => setActiveChoice('menu')} style={{ padding: '0.4rem 0.85rem', background: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '8px', cursor: 'pointer', fontWeight: '700', fontSize: '0.82rem' }}>
                ← العودة لخيارات الإدخال
              </button>
            </div>

            {/* SCANNER INPUT FORM */}
            <form onSubmit={handleSerialScan} style={{ background: '#fffbeb', border: '2px solid #fde68a', padding: '1.5rem', borderRadius: '16px', marginBottom: '1.5rem' }}>
              <label style={{ fontSize: '0.95rem', fontWeight: '800', color: '#b45309', display: 'block', marginBottom: '0.6rem' }}>
                امسح بالباركود أو أدخل الرقم التسلسلي (Serial / OEM Code):
              </label>
              
              <div style={{ display: 'flex', gap: '0.75rem' }}>
                <input
                  type="text"
                  autoFocus
                  value={scannedSerial}
                  onChange={e => setScannedSerial(e.target.value)}
                  placeholder="وجه قارئ الباركود هنا أو أدخل كود OEM..."
                  style={{
                    flex: 1,
                    height: '52px',
                    padding: '0 1.25rem',
                    fontSize: '1.1rem',
                    fontWeight: '800',
                    borderRadius: '12px',
                    border: '2px solid #d97706',
                    background: '#ffffff',
                    color: '#0f172a',
                    fontFamily: 'var(--font-mono)'
                  }}
                />
                
                <input
                  type="number"
                  value={scanQty}
                  onChange={e => setScanQty(parseInt(e.target.value, 10) || 1)}
                  style={{ width: '90px', height: '52px', textAlign: 'center', fontSize: '1.1rem', fontWeight: '800', borderRadius: '12px', border: '2px solid #cbd5e1' }}
                  title="الكمية المضافة"
                />

                <button type="submit" className="btn-sand" style={{ height: '52px', padding: '0 1.5rem', fontSize: '1rem', fontWeight: '800', borderRadius: '12px' }}>
                  إضافة للمخزون ➕
                </button>
              </div>
            </form>

            {scanMessage && (
              <div style={{ padding: '0.85rem 1.25rem', borderRadius: '12px', background: scanMessage.includes('✅') ? '#ecfdf5' : '#fef2f2', border: scanMessage.includes('✅') ? '1px solid #a7f3d0' : '1px solid #fca5a5', color: scanMessage.includes('✅') ? '#047857' : '#b91c1c', fontWeight: '800', fontSize: '0.92rem', marginBottom: '1.5rem' }}>
                {scanMessage}
              </div>
            )}

            {/* SCANNED HISTORY LIST */}
            <div>
              <h3 style={{ fontSize: '1.05rem', fontWeight: '800', color: '#0f172a', marginBottom: '0.75rem' }}>
                سجل المسح المباشر للشحنة الحالية 📋 ({scannedHistory.length} قطعة)
              </h3>
              
              {scannedHistory.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '2.5rem 1rem', background: '#f8fafc', borderRadius: '12px', color: '#64748b', fontWeight: '700' }}>
                  لم يتم مسح أي باركود حتى الآن. امسح أول قطعة للبدء.
                </div>
              ) : (
                <table className="data-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ background: '#f8fafc', color: '#475569', fontSize: '0.85rem', fontWeight: '800' }}>
                      <th style={{ padding: '0.75rem' }}>الوقت</th>
                      <th style={{ padding: '0.75rem' }}>رقم OEM / Serial</th>
                      <th style={{ padding: '0.75rem' }}>اسم القطعة</th>
                      <th style={{ padding: '0.75rem' }}>الكمية المضافة</th>
                    </tr>
                  </thead>
                  <tbody>
                    {scannedHistory.map((item, index) => (
                      <tr key={index} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ fontSize: '0.82rem', color: '#64748b' }}>{item.date}</td>
                        <td className="mono" style={{ fontWeight: '800', color: '#d97706' }}>{item.oem}</td>
                        <td style={{ fontWeight: '800', color: '#0f172a' }}>{item.name}</td>
                        <td className="mono" style={{ fontWeight: '800', color: '#047857' }}>+{item.qtyAdded}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

          </div>
        )}

      </div>
    </div>
  );
}
