import React, { useState, useEffect, useRef } from 'react';
import { FileText, QrCode, UploadCloud, Download, Search, CheckCircle2, RefreshCw, ArrowRight, Barcode, Plus, Trash2, ShieldCheck, MapPin, Camera, CameraOff, Volume2 } from 'lucide-react';
import { parseExcelFile, parsePdfFile } from '../utils/documentParser';
import SmartStockIngestionModal from './SmartStockIngestionModal';

export default function StockImportPage({ products = [], categories = [], token, lang = 'ar', onProductsUpdated, onBackToPortal, onSaveProduct }) {
  const [activeChoice, setActiveChoice] = useState('menu'); // 'menu' | 'pdf' | 'qr'
  const [isSmartIngestionOpen, setIsSmartIngestionOpen] = useState(false);

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
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState('');
  const html5QrcodeRef = useRef(null);

  // Instant Audio Beep on Successful Mobile Barcode Scan
  const playSuccessBeep = () => {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, ctx.currentTime); // High clear A5 confirmation note
      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.12);
    } catch (e) {
      console.log('Audio playback prevented or unsupported:', e);
    }
  };

  // Start Mobile Camera Scanner
  const startCameraScanner = () => {
    setCameraError('');
    setIsCameraActive(true);
  };

  // Stop Mobile Camera Scanner
  const stopCameraScanner = () => {
    if (html5QrcodeRef.current) {
      try {
        html5QrcodeRef.current.stop().then(() => {
          html5QrcodeRef.current.clear();
        }).catch(err => console.error(err));
      } catch (e) {
        console.error(e);
      }
    }
    setIsCameraActive(false);
  };

  // Load html5-qrcode script & start scanner on mobile
  useEffect(() => {
    if (activeChoice === 'qr' && isCameraActive) {
      let isMounted = true;

      const initScanner = () => {
        if (!window.Html5Qrcode || !isMounted) return;

        try {
          const scanner = new window.Html5Qrcode("interactive-camera-reader");
          html5QrcodeRef.current = scanner;

          const config = {
            fps: 15,
            qrbox: { width: 280, height: 180 },
            aspectRatio: 1.333334
          };

          scanner.start(
            { facingMode: "environment" }, // Rear phone camera
            config,
            (decodedText) => {
              playSuccessBeep();
              processScannedCode(decodedText);
            },
            () => {}
          ).catch(err => {
            console.warn("Camera fallback to default camera:", err);
            // Fallback to any available camera if facingMode environment fails
            scanner.start(
              { facingMode: "user" },
              config,
              (decodedText) => {
                playSuccessBeep();
                processScannedCode(decodedText);
              },
              () => {}
            ).catch(e => {
              setCameraError(lang === 'ar' ? 'تعذر فتح كاميرا الهاتف. يرجي السماح بالصلاحيات.' : 'Could not access phone camera. Please grant camera permission.');
              setIsCameraActive(false);
            });
          });
        } catch (e) {
          console.error(e);
        }
      };

      if (!window.Html5Qrcode) {
        const script = document.createElement('script');
        script.src = 'https://unpkg.com/html5-qrcode@2.3.8/html5-qrcode.min.js';
        script.async = true;
        script.onload = () => {
          if (isMounted) initScanner();
        };
        document.body.appendChild(script);
      } else {
        initScanner();
      }

      return () => {
        isMounted = false;
        if (html5QrcodeRef.current) {
          try {
            html5QrcodeRef.current.stop().then(() => html5QrcodeRef.current?.clear()).catch(() => {});
          } catch (e) {}
        }
      };
    }
  }, [activeChoice, isCameraActive]);

  // Single Part Creation State for new un-matched serial codes
  const [showNewSinglePartForm, setShowNewSinglePartForm] = useState(false);
  const [newSinglePart, setNewSinglePart] = useState({
    oem: '',
    arName: '',
    unitPrice: 20.00,
    costPrice: 12.00,
    quantity: 1,
    location: 'Shelf-A1',
    vehicleModel: 'BYD Seagull',
    yearRange: '2023 - 2026'
  });

  // Process Scanned Serial / OEM Code for Single Part
  const processScannedCode = async (queryText) => {
    const query = (queryText || '').trim();
    if (!query) return;

    // Look for matching product by OEM, Barcode, SKU, or Serial
    const itemMatch = products.find(p => 
      (p.oem || '').toLowerCase() === query.toLowerCase() ||
      (p.sku || '').toLowerCase() === query.toLowerCase() ||
      (p.id || '').toLowerCase() === query.toLowerCase()
    );

    if (itemMatch) {
      setFoundProduct(itemMatch);
      setShowNewSinglePartForm(false);
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
          setScanMessage(`✅ تم العثور على القطعة (${itemMatch.arName || itemMatch.oem}) وتحديث الكمية بمقدار +${scanQty}`);
          setScannedHistory(prev => [
            { id: query, oem: itemMatch.oem, name: itemMatch.arName || itemMatch.name, qtyAdded: scanQty, date: new Date().toLocaleTimeString('ar-SA') },
            ...prev
          ]);
        }
      } catch (err) {
        console.error(err);
      }
    } else {
      // Single Part Code is NEW -> open single part instant registration form pre-filled with query code!
      setFoundProduct(null);
      setNewSinglePart(prev => ({ ...prev, oem: query, arName: '', quantity: scanQty }));
      setShowNewSinglePartForm(true);
      setScanMessage(`ℹ️ كود السيريال/OEM جديد: (${query}). أدخل بيانات القطعة الفردية أدناه للحفظ السريع.`);
    }
  };

  // Submit New Single Part Registration
  const handleSaveNewSinglePart = async (e) => {
    e.preventDefault();
    if (!newSinglePart.oem || !newSinglePart.arName) {
      alert('يرجى أدخال كود القطعة واسم القطعة بالعربي!');
      return;
    }

    try {
      const res = await fetch('/api/products', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          oem: newSinglePart.oem,
          name: newSinglePart.arName,
          arName: newSinglePart.arName,
          unitPrice: parseFloat(newSinglePart.unitPrice) || 20.00,
          costPrice: parseFloat(newSinglePart.costPrice) || 12.00,
          quantity: parseInt(newSinglePart.quantity, 10) || 1,
          location: newSinglePart.location || 'Shelf-A1',
          vehicleModel: newSinglePart.vehicleModel || 'BYD Seagull',
          yearRange: newSinglePart.yearRange || '2023 - 2026',
          categoryId: categories[0]?.id || 'cat-body'
        })
      });

      const data = await res.json();
      if (data.success) {
        if (onProductsUpdated) onProductsUpdated(data.products);
        playSuccessBeep();
        setScanMessage(`✅ تم تسجيل وإضافة القطعة الفردية الجديدة (${newSinglePart.arName}) بنجاح!`);
        setScannedHistory(prev => [
          { id: newSinglePart.oem, oem: newSinglePart.oem, name: newSinglePart.arName, qtyAdded: newSinglePart.quantity, date: new Date().toLocaleTimeString('ar-SA') },
          ...prev
        ]);
        setShowNewSinglePartForm(false);
      } else {
        alert('فشل إضافة القطعة: ' + (data.error || 'خطأ غير معروف'));
      }
    } catch (err) {
      alert('خطأ في إضافة القطعة: ' + err.message);
    }
  };

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

  // Manual Input Submit
  const handleSerialScan = (e) => {
    e.preventDefault();
    if (scannedSerial) {
      processScannedCode(scannedSerial);
      setScannedSerial('');
    }
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

        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button
            onClick={() => setIsSmartIngestionOpen(true)}
            className="btn-sand"
            style={{ padding: '0.55rem 1.15rem', borderRadius: '10px', fontWeight: '800', cursor: 'pointer', fontSize: '0.88rem', display: 'flex', alignItems: 'center', gap: '0.4rem', fontFamily: "'Cairo', sans-serif" }}
          >
            <Camera size={16} /> تشغيل الماسح الذكي 📦📷
          </button>

          {onBackToPortal && (
            <button
              onClick={() => { stopCameraScanner(); onBackToPortal(); }}
              style={{ padding: '0.55rem 1.15rem', borderRadius: '10px', background: '#f8fafc', border: '1px solid #cbd5e1', color: '#0f172a', fontWeight: '800', cursor: 'pointer', fontSize: '0.88rem', display: 'flex', alignItems: 'center', gap: '0.4rem', fontFamily: "'Cairo', sans-serif" }}
            >
              <ArrowRight size={16} /> العودة للرئيسية
            </button>
          )}
        </div>
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
              onClick={() => setIsSmartIngestionOpen(true)}
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
                  📷 مسح البار كود / QR (كاميرا الهاتف & السيريال)
                </h2>
                <p style={{ color: '#64748b', fontSize: '0.92rem', lineHeight: '1.6', margin: 0, fontWeight: '600' }}>
                  افتح كاميرا الهاتف المحمول لقراءة الباركود والسيريال كود سريعًا في التو واللحظة لتحديث كميات المستودع وتأكيد الشحنات الواردة.
                </p>
              </div>

              <button className="btn-sand" style={{ marginTop: '2rem', padding: '0.9rem', fontSize: '1rem', fontWeight: '800', width: '100%', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                <Camera size={20} /> مسح بواسطة كاميرا الهاتف 📷
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
                <p style={{ color: '#64748b', fontSize: '0.88rem', margin: 0, fontWeight: '600' }}>يدعم النظام سحب الفواتير باللغات العربية، الصينية والإنجلیزية وتعديل الأسعار تلقائيًا</p>
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

        {/* CHOICE 2 VIEW: MOBILE CAMERA & SERIAL BARCODE SCANNER */}
        {activeChoice === 'qr' && (
          <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '20px', padding: '2rem', boxShadow: '0 4px 20px rgba(0,0,0,0.04)' }}>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h2 style={{ fontSize: '1.3rem', fontWeight: '800', color: '#0f172a', margin: 0 }}>
                📷 قارئ باركود وكاميرا الهاتف المباشر (Fast Mobile Scanner)
              </h2>
              <button onClick={() => { stopCameraScanner(); setActiveChoice('menu'); }} style={{ padding: '0.4rem 0.85rem', background: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '8px', cursor: 'pointer', fontWeight: '700', fontSize: '0.82rem' }}>
                ← العودة لخيارات الإدخال
              </button>
            </div>

            {/* LIVE CAMERA TOGGLE ACTION */}
            <div style={{ background: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '16px', padding: '1.25rem', marginBottom: '1.5rem', textAlign: 'center' }}>
              {!isCameraActive ? (
                <button
                  onClick={startCameraScanner}
                  className="btn-sand"
                  style={{ padding: '0.85rem 2rem', fontSize: '1.05rem', fontWeight: '800', borderRadius: '12px', display: 'inline-flex', alignItems: 'center', gap: '0.6rem' }}
                >
                  <Camera size={22} /> تشغيل كاميرا الهاتف للمسح السريع 📷
                </button>
              ) : (
                <button
                  onClick={stopCameraScanner}
                  style={{ padding: '0.85rem 2rem', fontSize: '1.05rem', fontWeight: '800', borderRadius: '12px', background: '#fef2f2', border: '1px solid #fca5a5', color: '#b91c1c', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '0.6rem' }}
                >
                  <CameraOff size={22} /> إيقاف الكاميرا
                </button>
              )}

              {cameraError && (
                <div style={{ marginTop: '0.85rem', color: '#dc2626', fontWeight: '700', fontSize: '0.9rem' }}>
                  ⚠️ {cameraError}
                </div>
              )}
            </div>

            {/* LIVE CAMERA STREAM SCANNER DISPLAY */}
            {isCameraActive && (
              <div style={{ marginBottom: '1.5rem', textAlign: 'center' }}>
                <div 
                  id="interactive-camera-reader" 
                  style={{ 
                    width: '100%', 
                    maxWidth: '480px', 
                    margin: '0 auto', 
                    borderRadius: '16px', 
                    overflow: 'hidden', 
                    border: '3px solid #d97706',
                    boxShadow: '0 8px 24px rgba(217, 119, 6, 0.2)',
                    background: '#000000'
                  }} 
                />
                <div style={{ fontSize: '0.85rem', color: '#047857', fontWeight: '800', marginTop: '0.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem' }}>
                  <Volume2 size={16} /> وجه كاميرا الهاتف نحو باركود القطعة للمسح وقراءة السيريال فورًا
                </div>
              </div>
            )}

            {/* MANUAL / HARDWARE SCANNER INPUT FORM */}
            <form onSubmit={handleSerialScan} style={{ background: '#fffbeb', border: '2px solid #fde68a', padding: '1.5rem', borderRadius: '16px', marginBottom: '1.5rem' }}>
              <label style={{ fontSize: '0.95rem', fontWeight: '800', color: '#b45309', display: 'block', marginBottom: '0.6rem' }}>
                أو أدخل كود OEM / السيريال بواسطة القارئ اليدوي:
              </label>
              
              <div style={{ display: 'flex', gap: '0.75rem' }}>
                <input
                  type="text"
                  autoFocus
                  value={scannedSerial}
                  onChange={e => setScannedSerial(e.target.value)}
                  placeholder="وجه قارئ الباركود أو اكتب السيريال..."
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
              <div style={{ padding: '0.85rem 1.25rem', borderRadius: '12px', background: scanMessage.includes('✅') ? '#ecfdf5' : '#fffbeb', border: scanMessage.includes('✅') ? '1px solid #a7f3d0' : '1px solid #fde68a', color: scanMessage.includes('✅') ? '#047857' : '#b45309', fontWeight: '800', fontSize: '0.92rem', marginBottom: '1.5rem' }}>
                {scanMessage}
              </div>
            )}

            {/* INSTANT SINGLE PART REGISTRATION FORM (When scanning a new OEM/Serial Code) */}
            {showNewSinglePartForm && (
              <form onSubmit={handleSaveNewSinglePart} style={{ background: '#f8fafc', border: '2px solid #2563eb', padding: '1.5rem', borderRadius: '16px', marginBottom: '1.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.75rem' }}>
                  <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: '800', color: '#0f172a' }}>
                    🏎️ تسجيل وإضافة قطعة فردية جديدة بالمستودع
                  </h3>
                  <button type="button" onClick={() => setShowNewSinglePartForm(false)} style={{ background: 'transparent', border: 'none', color: '#64748b', cursor: 'pointer', fontWeight: '700' }}>
                    إلغاء ×
                  </button>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1.25rem' }}>
                  <div>
                    <label style={{ fontSize: '0.82rem', fontWeight: '700', color: '#475569', display: 'block', marginBottom: '0.3rem' }}>كود OEM / السيريال</label>
                    <input
                      type="text"
                      required
                      value={newSinglePart.oem}
                      onChange={e => setNewSinglePart(prev => ({ ...prev, oem: e.target.value }))}
                      style={{ width: '100%', padding: '0.6rem 0.85rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontWeight: '800', fontFamily: 'var(--font-mono)' }}
                    />
                  </div>

                  <div>
                    <label style={{ fontSize: '0.82rem', fontWeight: '700', color: '#475569', display: 'block', marginBottom: '0.3rem' }}>اسم القطعة بالعربي</label>
                    <input
                      type="text"
                      required
                      placeholder="مثال: فحمات فرامل أمامي"
                      value={newSinglePart.arName}
                      onChange={e => setNewSinglePart(prev => ({ ...prev, arName: e.target.value }))}
                      style={{ width: '100%', padding: '0.6rem 0.85rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontWeight: '800', fontFamily: "'Cairo', sans-serif" }}
                    />
                  </div>

                  <div>
                    <label style={{ fontSize: '0.82rem', fontWeight: '700', color: '#475569', display: 'block', marginBottom: '0.3rem' }}>سعر البيع ($)</label>
                    <input
                      type="number"
                      step="0.01"
                      required
                      value={newSinglePart.unitPrice}
                      onChange={e => setNewSinglePart(prev => ({ ...prev, unitPrice: e.target.value }))}
                      style={{ width: '100%', padding: '0.6rem 0.85rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontWeight: '800' }}
                    />
                  </div>

                  <div>
                    <label style={{ fontSize: '0.82rem', fontWeight: '700', color: '#475569', display: 'block', marginBottom: '0.3rem' }}>سعر التكلفة ($)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={newSinglePart.costPrice}
                      onChange={e => setNewSinglePart(prev => ({ ...prev, costPrice: e.target.value }))}
                      style={{ width: '100%', padding: '0.6rem 0.85rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontWeight: '800' }}
                    />
                  </div>

                  <div>
                    <label style={{ fontSize: '0.82rem', fontWeight: '700', color: '#475569', display: 'block', marginBottom: '0.3rem' }}>الموديل المناسب</label>
                    <select
                      value={newSinglePart.vehicleModel}
                      onChange={e => setNewSinglePart(prev => ({ ...prev, vehicleModel: e.target.value }))}
                      style={{ width: '100%', padding: '0.6rem 0.85rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontWeight: '700', fontFamily: "'Cairo', sans-serif" }}
                    >
                      <option value="BYD Seagull">بي واي دي سيجول (BYD Seagull)</option>
                      <option value="BYD Dolphin">بي واي دي دولفين (BYD Dolphin)</option>
                      <option value="BYD Atto 3">بي واي دي أتو 3 (BYD Atto 3)</option>
                      <option value="BYD Tang">بي واي دي تانج (BYD Tang)</option>
                      <option value="BYD Han">بي واي دي هان (BYD Han)</option>
                    </select>
                  </div>

                  <div>
                    <label style={{ fontSize: '0.82rem', fontWeight: '700', color: '#475569', display: 'block', marginBottom: '0.3rem' }}>رقم الرف / المستودع</label>
                    <input
                      type="text"
                      value={newSinglePart.location}
                      onChange={e => setNewSinglePart(prev => ({ ...prev, location: e.target.value }))}
                      style={{ width: '100%', padding: '0.6rem 0.85rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontWeight: '700' }}
                    />
                  </div>
                </div>

                <button type="submit" className="btn-sand" style={{ padding: '0.75rem 1.75rem', fontSize: '0.95rem', fontWeight: '800', width: '100%', borderRadius: '10px' }}>
                  تأكيد وإضافة القطعة الفردية الجديدة للمخزون ➕
                </button>
              </form>
            )}

            {/* SCANNED HISTORY LIST */}
            <div>
              <h3 style={{ fontSize: '1.05rem', fontWeight: '800', color: '#0f172a', marginBottom: '0.75rem' }}>
                سجل المسح المباشر للشحنة الحالية 📋 ({scannedHistory.length} قطعة)
              </h3>
              
              {scannedHistory.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '2.5rem 1rem', background: '#f8fafc', borderRadius: '12px', color: '#64748b', fontWeight: '700' }}>
                  لم يتم مسح أي باركود حتى الآن. اشغل الكاميرا أو استخدم القارئ لمسح أول قطعة.
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

      {isSmartIngestionOpen && (
        <SmartStockIngestionModal
          products={products}
          categories={categories}
          token={token}
          onClose={() => setIsSmartIngestionOpen(false)}
          onSaveProduct={onSaveProduct}
        />
      )}
    </div>
  );
}
