import React, { useState, useEffect, useCallback } from 'react';
import { Camera, X, CheckCircle, PackagePlus, RefreshCw, Layers, MapPin, DollarSign, ArrowRight, AlertCircle, Sparkles } from 'lucide-react';
import QrScannerModal from './QrScannerModal';
import { parseSmartSerialNumber, normalizeSearchCode } from '../utils/documentParser';

export default function SmartStockIngestionModal({ products, categories, token, onClose, onSaveProduct }) {
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [step, setStep] = useState('scan'); // 'scan' | 'existing' | 'new'
  const [scannedSerial, setScannedSerial] = useState('');
  
  // Existing Part Restock State
  const [existingPart, setExistingPart] = useState(null);
  const [restockQty, setRestockQty] = useState('10');
  const [updatedCostPrice, setUpdatedCostPrice] = useState('');
  const [updatedUnitPrice, setUpdatedUnitPrice] = useState('');

  // New Part Entry State
  const [newPart, setNewPart] = useState({
    oem: '',
    sku: '',
    name: '',
    cnName: '',
    arName: '',
    vehicleModel: 'BYD Seagull (海鸥)',
    categoryId: categories[0] ? categories[0].id : 'cat-body',
    costPrice: '30',
    unitPrice: '55',
    quantity: '10',
    minLevel: '5',
    location: 'Aisle 1 · Shelf Import',
    supplier: 'China OEM Supply'
  });
  const [isTranslating, setIsTranslating] = useState(false);

  // Handle Barcode Search / Lookup
  const handleProcessBarcode = useCallback((rawCode) => {
    if (!rawCode || !rawCode.trim()) return;
    const cleanSerial = parseSmartSerialNumber(rawCode) || rawCode.trim().toUpperCase();
    const normalized = normalizeSearchCode(cleanSerial);

    setScannedSerial(cleanSerial);

    // Search for existing part in inventory matching OEM, SKU, or ID
    const match = products.find(p => {
      const oemNorm = normalizeSearchCode(p.oem);
      const skuNorm = normalizeSearchCode(p.sku);
      const idNorm = normalizeSearchCode(p.id);

      return (
        (normalized && oemNorm === normalized) ||
        (normalized && skuNorm === normalized) ||
        (normalized && idNorm === normalized) ||
        (normalized.length >= 5 && (oemNorm.includes(normalized) || skuNorm.includes(normalized)))
      );
    });

    if (match) {
      // CASE A: PART EXISTS IN SYSTEM
      setExistingPart(match);
      setRestockQty('10');
      setUpdatedCostPrice(match.costPrice || '');
      setUpdatedUnitPrice(match.unitPrice || '');
      setStep('existing');
    } else {
      // CASE B: NEW PART NOT IN SYSTEM
      setExistingPart(null);
      setNewPart(prev => ({
        ...prev,
        oem: cleanSerial,
        sku: cleanSerial,
        name: `BYD OEM Part (${cleanSerial})`,
        cnName: '',
        arName: 'قطعة غيار OEM جديدة',
        categoryId: categories[0] ? categories[0].id : 'cat-body'
      }));
      setStep('new');
    }
  }, [products, categories]);

  // Global Keydown Listener for Handheld Barcode Guns
  useEffect(() => {
    let buffer = '';
    let lastKeyTime = Date.now();

    const handleGlobalKeyDown = (e) => {
      const target = e.target;
      const isInputField = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT';

      // Barcode scanners type characters extremely rapidly (keystrokes typically < 40ms apart).
      const currentTime = Date.now();
      const isFastTime = (currentTime - lastKeyTime) < 50;
      lastKeyTime = currentTime;

      // If user is intentionally typing in an input field slowly, let normal typing proceed.
      if (isInputField && !isFastTime && e.key !== 'Enter') {
        return;
      }

      if (e.key === 'Enter') {
        if (buffer.trim().length > 2) {
          e.preventDefault();
          handleProcessBarcode(buffer.trim());
          buffer = '';
        }
      } else if (e.key.length === 1) {
        if (isFastTime) {
          buffer += e.key;
        } else {
          // Accumulate slow typing if NOT in an input field (focused outside form)
          if (!isInputField) {
            buffer = e.key;
          } else {
            buffer = '';
          }
        }
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [step, handleProcessBarcode]);

  // Handle Restocking Existing Part
  const handleConfirmRestock = (e) => {
    e.preventDefault();
    if (!existingPart) return;

    const addedQty = Math.max(1, parseInt(restockQty, 10) || 1);
    const newTotalQty = Number(existingPart.quantity || 0) + addedQty;

    const updatedProduct = {
      ...existingPart,
      quantity: newTotalQty,
      costPrice: updatedCostPrice ? parseFloat(updatedCostPrice) : existingPart.costPrice,
      unitPrice: updatedUnitPrice ? parseFloat(updatedUnitPrice) : existingPart.unitPrice,
      lastUpdated: new Date().toISOString()
    };

    onSaveProduct(updatedProduct);
    onClose();
  };

  // Handle Creating New Part with Chinese -> Arabic Auto Translation
  const handleTranslateChineseName = async (cnText) => {
    if (!cnText || !cnText.trim()) return;
    try {
      setIsTranslating(true);
      const res = await fetch('/api/import/translate-batch', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ items: [{ cnName: cnText }] })
      });
      const data = await res.json();
      if (data.items && data.items[0] && data.items[0].translatedAr) {
        setNewPart(prev => ({
          ...prev,
          arName: data.items[0].translatedAr,
          name: `${data.items[0].translatedAr} (${cnText})`
        }));
      }
    } catch (err) {
      console.error('Translation error:', err);
    } finally {
      setIsTranslating(false);
    }
  };

  // Handle Saving New Part
  const handleConfirmNewPart = (e) => {
    e.preventDefault();
    if (!newPart.oem || !newPart.unitPrice) {
      alert('يرجى كتابة رقم القطعة OEM وسعر البيع!');
      return;
    }

    onSaveProduct({
      ...newPart,
      costPrice: Math.max(0, parseFloat(newPart.costPrice) || 0),
      unitPrice: Math.max(0, parseFloat(newPart.unitPrice) || 0),
      quantity: Math.max(1, parseInt(newPart.quantity, 10) || 1),
      minLevel: Math.max(0, parseInt(newPart.minLevel, 10) || 5),
    });
    onClose();
  };

  return (
    <div className="modal-overlay" style={{ background: 'rgba(15, 23, 42, 0.82)', zIndex: 180 }}>
      <div className="modal-content" style={{ maxWidth: '620px', borderRadius: '24px', padding: '1.5rem', fontFamily: "'Cairo', sans-serif" }}>

        {/* Modal Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', borderBottom: '1px solid #f1f5f9', paddingBottom: '0.85rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{ width: '44px', height: '44px', borderRadius: '14px', background: '#0f172a', color: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 14px rgba(15, 23, 42, 0.25)' }}>
              <PackagePlus size={24} />
            </div>
            <div>
              <h2 style={{ fontSize: '1.25rem', fontWeight: '900', color: '#0f172a', margin: 0 }}>
                إدخال وإضافة مخزون بالباركود 📦📷
              </h2>
              <span style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: '700' }}>
                امسح باركود OEM للبحث التلقائي والإدخال السريع لشحنات قطع الغيار
              </span>
            </div>
          </div>

          <button onClick={onClose} style={{ background: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: '10px', padding: '0.45rem', color: '#475569', cursor: 'pointer' }}>
            <X size={20} />
          </button>
        </div>

        {/* STEP 1: SCAN / ENTER SERIAL NUMBER */}
        {step === 'scan' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div style={{ background: '#f8fafc', border: '2px dashed #cbd5e1', borderRadius: '18px', padding: '2rem 1.5rem', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
              
              <div style={{ width: '64px', height: '64px', borderRadius: '20px', background: '#fffbeb', color: '#d97706', border: '1px solid #fde68a', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 14px rgba(217, 119, 6, 0.2)' }}>
                <Camera size={32} />
              </div>

              <div>
                <h3 style={{ fontSize: '1.1rem', fontWeight: '900', color: '#0f172a', margin: 0 }}>
                  افتح كاميرا الهاتف لمسح باركود الشحنة
                </h3>
                <p style={{ fontSize: '0.85rem', color: '#64748b', margin: '0.3rem 0 0 0', fontWeight: '600' }}>
                  يتعرف النظام تلقائياً على السيريال والرمز وإذا كانت القطعة مسجلة مسبقاً يعرض تفاصيلها لإضافة الكمية فوراً!
                </p>
              </div>

              <button
                onClick={() => setIsCameraOpen(true)}
                className="btn-sand"
                style={{ padding: '0.85rem 2rem', borderRadius: '14px', fontSize: '1rem', fontWeight: '900', display: 'flex', alignItems: 'center', gap: '0.6rem', boxShadow: '0 4px 14px rgba(217, 119, 6, 0.3)' }}
              >
                <Camera size={22} /> فتح كاميرا الماسح الضوئي 📷
              </button>
            </div>

            {/* Manual Serial Search */}
            <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '1rem' }}>
              <label style={{ fontSize: '0.85rem', color: '#475569', fontWeight: '800', display: 'block', marginBottom: '0.4rem' }}>
                أو أدخل رقم السيريال / OEM يدوياً:
              </label>
              <form onSubmit={(e) => { e.preventDefault(); handleProcessBarcode(scannedSerial); }} style={{ display: 'flex', gap: '0.5rem' }}>
                <input
                  type="text"
                  value={scannedSerial}
                  onChange={(e) => setScannedSerial(e.target.value)}
                  placeholder="مثال: EQEA-5402841"
                  style={{ flex: 1, height: '46px', padding: '0 0.85rem', fontSize: '0.95rem', fontWeight: '800', borderRadius: '12px', border: '1px solid #cbd5e1', outline: 'none', fontFamily: 'var(--font-mono)' }}
                />
                <button type="submit" className="btn-primary" style={{ padding: '0 1.25rem', height: '46px', fontSize: '0.9rem' }}>
                  فحص الرقم 🔍
                </button>
              </form>
            </div>
          </div>
        )}

        {/* STEP 2: CASE A - EXISTING PART FOUND (QUICK RESTOCK) */}
        {step === 'existing' && existingPart && (
          <form onSubmit={handleConfirmRestock} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div style={{ padding: '0.75rem 1rem', background: '#ecfdf5', border: '1px solid #a7f3d0', color: '#047857', borderRadius: '12px', fontSize: '0.88rem', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <CheckCircle size={20} /> القطعة مسجلة بالفعل في النظام! يمكنك إضافة كمية الشحنة الجديدة مباشرة 📦
            </div>

            {/* Existing Part Details Card */}
            <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '18px', padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <div style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: '700' }}>رقم القطعة OEM</div>
                  <div className="mono" style={{ fontSize: '1.2rem', fontWeight: '900', color: '#d97706' }}>{existingPart.oem}</div>
                </div>
                <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', color: '#1d4ed8', padding: '0.3rem 0.75rem', borderRadius: '10px', fontSize: '0.8rem', fontWeight: '800' }}>
                  {existingPart.vehicleModel || 'BYD Seagull'}
                </div>
              </div>

              <div style={{ fontSize: '1.05rem', fontWeight: '900', color: '#0f172a' }}>
                {existingPart.arName || existingPart.name}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem', marginTop: '0.3rem' }}>
                <div style={{ background: '#ffffff', padding: '0.65rem', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                  <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: '700' }}>المخزون الحالي</div>
                  <div className="mono" style={{ fontSize: '1.15rem', fontWeight: '900', color: '#047857' }}>{existingPart.quantity} قطعة</div>
                </div>

                <div style={{ background: '#ffffff', padding: '0.65rem', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                  <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: '700' }}>سعر التكلفة</div>
                  <div className="mono" style={{ fontSize: '1.1rem', fontWeight: '800', color: '#475569' }}>${existingPart.costPrice}</div>
                </div>

                <div style={{ background: '#ffffff', padding: '0.65rem', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                  <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: '700' }}>سعر البيع</div>
                  <div className="mono" style={{ fontSize: '1.1rem', fontWeight: '900', color: '#2563eb' }}>${existingPart.unitPrice}</div>
                </div>
              </div>
            </div>

            {/* Restock Inputs */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.85rem' }}>
              <div>
                <label style={{ fontSize: '0.82rem', fontWeight: '800', color: '#0f172a', display: 'block', marginBottom: '0.3rem' }}>
                  الكمية المضافة (+N) *
                </label>
                <input
                  type="number"
                  min="1"
                  value={restockQty}
                  onChange={(e) => setRestockQty(e.target.value)}
                  style={{ width: '100%', height: '46px', fontSize: '1.1rem', fontWeight: '900', padding: '0 0.75rem', borderRadius: '10px', border: '2px solid #047857', outline: 'none', color: '#047857' }}
                  required
                />
              </div>

              <div>
                <label style={{ fontSize: '0.82rem', fontWeight: '700', color: '#475569', display: 'block', marginBottom: '0.3rem' }}>
                  تحديث سعر التكلفة ($)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={updatedCostPrice}
                  onChange={(e) => setUpdatedCostPrice(e.target.value)}
                  style={{ width: '100%', height: '46px', fontSize: '0.95rem', fontWeight: '700', padding: '0 0.75rem', borderRadius: '10px', border: '1px solid #cbd5e1' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '0.82rem', fontWeight: '700', color: '#475569', display: 'block', marginBottom: '0.3rem' }}>
                  تحديث سعر البيع ($)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={updatedUnitPrice}
                  onChange={(e) => setUpdatedUnitPrice(e.target.value)}
                  style={{ width: '100%', height: '46px', fontSize: '0.95rem', fontWeight: '700', padding: '0 0.75rem', borderRadius: '10px', border: '1px solid #cbd5e1' }}
                />
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.5rem' }}>
              <button type="button" onClick={() => setStep('scan')} style={{ padding: '0.65rem 1.1rem', background: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: '10px', fontSize: '0.85rem', fontWeight: '700', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <ArrowRight size={16} /> مسح قطعة أخرى
              </button>

              <button type="submit" className="btn-primary" style={{ padding: '0.75rem 1.75rem', fontSize: '0.95rem', fontWeight: '900' }}>
                تأكيد إضافة الشحنة والمخزون 📦
              </button>
            </div>
          </form>
        )}

        {/* STEP 2: CASE B - NEW PART CREATION FORM */}
        {step === 'new' && (
          <form onSubmit={handleConfirmNewPart} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ padding: '0.75rem 1rem', background: '#fffbeb', border: '1px solid #fde68a', color: '#b45309', borderRadius: '12px', fontSize: '0.85rem', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <AlertCircle size={20} /> هذه القطعة غير مسجلة مسبقاً! يرجى إكمال تفاصيل القطعة الجديدة لإضافتها إلى المخزون 🆕
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.85rem' }}>
              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: '700', color: '#475569', display: 'block', marginBottom: '0.25rem' }}>رقم القطعة OEM *</label>
                <input type="text" value={newPart.oem} onChange={e => setNewPart({ ...newPart, oem: e.target.value, sku: e.target.value })} className="mono" style={{ width: '100%', height: '42px', padding: '0 0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontWeight: '800' }} required />
              </div>

              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: '700', color: '#475569', display: 'block', marginBottom: '0.25rem' }}>الموديل المتوافق</label>
                <select value={newPart.vehicleModel} onChange={e => setNewPart({ ...newPart, vehicleModel: e.target.value })} style={{ width: '100%', height: '42px', padding: '0 0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontWeight: '700', fontFamily: "'Cairo', sans-serif" }}>
                  <option value="BYD Seagull (海鸥)">بي واي دي سيجول (BYD Seagull)</option>
                  <option value="BYD Dolphin (海豚)">بي واي دي دولفين (BYD Dolphin)</option>
                  <option value="BYD Atto 3 (元PLUS)">بي واي دي أتو 3 (BYD Atto 3)</option>
                  <option value="BYD Tang (唐)">بي واي دي تانج (BYD Tang)</option>
                  <option value="BYD Han (汉)">بي واي دي هان (BYD Han)</option>
                </select>
              </div>

              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: '700', color: '#475569', display: 'block', marginBottom: '0.25rem' }}>القسم / الفئة *</label>
                <select
                  value={newPart.categoryId}
                  onChange={e => setNewPart({ ...newPart, categoryId: e.target.value })}
                  style={{ width: '100%', height: '42px', padding: '0 0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontWeight: '700', fontFamily: "'Cairo', sans-serif" }}
                  required
                >
                  {categories.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Chinese Name & Auto Translation */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.25rem' }}>
                <label style={{ fontSize: '0.8rem', fontWeight: '700', color: '#475569' }}>اسم القطعة الصيني (Supplier Label)</label>
                <button
                  type="button"
                  onClick={() => handleTranslateChineseName(newPart.cnName)}
                  style={{ background: 'none', border: 'none', color: '#047857', fontSize: '0.75rem', fontWeight: '800', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.3rem' }}
                >
                  <Sparkles size={14} className={isTranslating ? 'spin' : ''} /> ترجمة آلياً للعربي ✨
                </button>
              </div>
              <input
                type="text"
                value={newPart.cnName}
                onChange={e => setNewPart({ ...newPart, cnName: e.target.value })}
                onBlur={() => handleTranslateChineseName(newPart.cnName)}
                placeholder="مثال: 刹车片 / 减震器"
                style={{ width: '100%', height: '42px', padding: '0 0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1' }}
              />
            </div>

            <div>
              <label style={{ fontSize: '0.8rem', fontWeight: '800', color: '#047857', display: 'block', marginBottom: '0.25rem' }}>اسم القطعة بالعربي *</label>
              <input
                type="text"
                value={newPart.arName}
                onChange={e => setNewPart({ ...newPart, arName: e.target.value, name: `${e.target.value} (${newPart.cnName || newPart.oem})` })}
                placeholder="مثال: فحمات فرامل أمامية"
                style={{ width: '100%', height: '42px', padding: '0 0.75rem', borderRadius: '8px', border: '1.5px solid #a7f3d0', background: '#ecfdf5', fontWeight: '800', color: '#047857' }}
                required
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.85rem' }}>
              <div>
                <label style={{ fontSize: '0.78rem', fontWeight: '700', color: '#475569', display: 'block', marginBottom: '0.25rem' }}>الكمية الابتدائية *</label>
                <input type="number" min="1" value={newPart.quantity} onChange={e => setNewPart({ ...newPart, quantity: e.target.value })} style={{ width: '100%', height: '42px', padding: '0 0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontWeight: '800' }} required />
              </div>

              <div>
                <label style={{ fontSize: '0.78rem', fontWeight: '700', color: '#475569', display: 'block', marginBottom: '0.25rem' }}>سعر التكلفة ($)</label>
                <input type="number" step="0.01" value={newPart.costPrice} onChange={e => setNewPart({ ...newPart, costPrice: e.target.value })} style={{ width: '100%', height: '42px', padding: '0 0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontWeight: '700' }} />
              </div>

              <div>
                <label style={{ fontSize: '0.78rem', fontWeight: '700', color: '#475569', display: 'block', marginBottom: '0.25rem' }}>سعر البيع ($) *</label>
                <input type="number" step="0.01" value={newPart.unitPrice} onChange={e => setNewPart({ ...newPart, unitPrice: e.target.value })} style={{ width: '100%', height: '42px', padding: '0 0.75rem', borderRadius: '8px', border: '1.5px solid #2563eb', fontWeight: '800', color: '#2563eb' }} required />
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.5rem' }}>
              <button type="button" onClick={() => setStep('scan')} style={{ padding: '0.65rem 1.1rem', background: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: '10px', fontSize: '0.85rem', fontWeight: '700', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <ArrowRight size={16} /> مسح قطعة أخرى
              </button>

              <button type="submit" className="btn-primary" style={{ padding: '0.75rem 1.75rem', fontSize: '0.95rem', fontWeight: '900' }}>
                حفظ وتسجيل القطعة الجديدة 💾
              </button>
            </div>
          </form>
        )}

        {/* Camera Modal Popup */}
        {isCameraOpen && (
          <QrScannerModal
            onClose={() => setIsCameraOpen(false)}
            onScanSuccess={(scannedCode) => {
              setIsCameraOpen(false);
              handleProcessBarcode(scannedCode);
            }}
            title="مسح باركود الشحنة لإدخال المخزون 📦📷"
          />
        )}
      </div>
    </div>
  );
}
