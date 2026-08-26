import React, { useState } from 'react';
import { Package, ShoppingCart, CheckCircle, AlertTriangle, Plus, Minus, X, DollarSign, Layers, Tag } from 'lucide-react';

export default function ScannedPartModal({ product, scannedCode, onClose, onAddToCart, onQuickRestock, onRegisterNewPart, lang = 'ar' }) {
  const isFound = Boolean(product);
  const stockQty = isFound ? Number(product.quantity || 0) : 0;
  const isOutOfStock = isFound && stockQty <= 0;

  const [addQty, setAddQty] = useState(1);
  const [customPrice, setCustomPrice] = useState(isFound ? String(product.unitPrice || '') : '');

  const handleConfirmAddToCart = () => {
    if (!product) return;
    if (stockQty <= 0) {
      alert(lang === 'ar' ? '⚠️ هذه القطعة غير متوفرة بالمخزون حالياً!' : '⚠️ Part is out of stock!');
      return;
    }
    const finalQty = Math.min(stockQty, Math.max(1, parseInt(addQty, 10) || 1));
    const finalPrice = parseFloat(customPrice) > 0 ? parseFloat(customPrice) : product.unitPrice;

    onAddToCart({
      ...product,
      unitPrice: finalPrice
    }, finalQty);

    onClose();
  };

  return (
    <div className="modal-overlay" style={{ background: 'rgba(15, 23, 42, 0.85)', zIndex: 220 }}>
      <div className="modal-content" style={{ maxWidth: '520px', borderRadius: '24px', padding: '1.5rem', fontFamily: "'Cairo', sans-serif" }}>
        
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', borderBottom: '1px solid #f1f5f9', paddingBottom: '0.75rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <div style={{ width: '42px', height: '42px', borderRadius: '12px', background: isFound ? '#d97706' : '#ef4444', color: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 14px rgba(0,0,0,0.15)' }}>
              <Package size={22} />
            </div>
            <div>
              <h2 style={{ fontSize: '1.15rem', fontWeight: '900', color: '#0f172a', margin: 0 }}>
                {isFound ? 'نتيجة مسح القطعة 📦' : 'قطع غير مسجلة ⚠️'}
              </h2>
              <span style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: '700' }}>
                الكود الممسوح: <strong className="mono" style={{ color: '#d97706' }}>{scannedCode}</strong>
              </span>
            </div>
          </div>

          <button onClick={onClose} style={{ background: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: '10px', padding: '0.4rem', color: '#475569', cursor: 'pointer' }}>
            <X size={20} />
          </button>
        </div>

        {/* CASE 1: PART FOUND IN INVENTORY */}
        {isFound ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            
            {/* Part Main Card */}
            <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '18px', padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: '700' }}>رقم القطعة OEM</div>
                  <div className="mono" style={{ fontSize: '1.25rem', fontWeight: '900', color: '#d97706' }}>{product.oem}</div>
                </div>
                <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', color: '#1d4ed8', padding: '0.3rem 0.75rem', borderRadius: '10px', fontSize: '0.8rem', fontWeight: '800' }}>
                  {product.vehicleModel || 'BYD Seagull'}
                </div>
              </div>

              <div>
                <h3 style={{ fontSize: '1.1rem', fontWeight: '900', color: '#0f172a', margin: '0 0 0.2rem 0' }}>
                  {product.arName || product.name}
                </h3>
                {product.cnName && (
                  <div style={{ fontSize: '0.82rem', color: '#64748b', fontWeight: '600' }}>
                    الاسم بالصيني: {product.cnName}
                  </div>
                )}
              </div>

              {/* Stats Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.65rem', marginTop: '0.2rem' }}>
                
                {/* Stock Level */}
                <div style={{ background: '#ffffff', padding: '0.65rem', borderRadius: '12px', border: '1px solid #e2e8f0', textAlign: 'center' }}>
                  <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: '700' }}>المخزون المتوفر</div>
                  <div className="mono" style={{ fontSize: '1.15rem', fontWeight: '900', color: isOutOfStock ? '#dc2626' : '#047857' }}>
                    {product.quantity} قطعة
                  </div>
                </div>

                {/* Selling Price */}
                <div style={{ background: '#ffffff', padding: '0.65rem', borderRadius: '12px', border: '1px solid #e2e8f0', textAlign: 'center' }}>
                  <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: '700' }}>سعر البيع</div>
                  <div className="mono" style={{ fontSize: '1.15rem', fontWeight: '900', color: '#2563eb' }}>
                    ${product.unitPrice}
                  </div>
                </div>

                {/* Cost Price */}
                <div style={{ background: '#ffffff', padding: '0.65rem', borderRadius: '12px', border: '1px solid #e2e8f0', textAlign: 'center' }}>
                  <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: '700' }}>التكلفة للمحل</div>
                  <div className="mono" style={{ fontSize: '1.15rem', fontWeight: '800', color: '#475569' }}>
                    ${product.costPrice || '0.00'}
                  </div>
                </div>
              </div>
            </div>

            {/* Quantity Selector & Price Modifier */}
            <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: '16px', padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <div style={{ fontWeight: '800', fontSize: '0.88rem', color: '#b45309', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <ShoppingCart size={18} /> حدد الكمية وسعر الإضافة للفاتورة:
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.85rem', alignItems: 'center' }}>
                
                {/* Qty Controls */}
                <div>
                  <label style={{ fontSize: '0.78rem', fontWeight: '700', color: '#64748b', display: 'block', marginBottom: '0.3rem' }}>
                    الكمية المطلوبة:
                  </label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                    <button
                      type="button"
                      onClick={() => setAddQty(prev => Math.max(1, prev - 1))}
                      style={{ width: '38px', height: '38px', borderRadius: '10px', border: '1px solid #cbd5e1', background: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
                    >
                      <Minus size={16} />
                    </button>
                    <input
                      type="number"
                      min="1"
                      max={stockQty}
                      value={addQty}
                      onChange={(e) => setAddQty(Math.max(1, parseInt(e.target.value, 10) || 1))}
                      style={{ width: '60px', height: '38px', textAlign: 'center', fontWeight: '900', fontSize: '1.1rem', borderRadius: '10px', border: '1.5px solid #d97706', outline: 'none', background: '#ffffff' }}
                    />
                    <button
                      type="button"
                      onClick={() => setAddQty(prev => Math.min(stockQty, prev + 1))}
                      style={{ width: '38px', height: '38px', borderRadius: '10px', border: '1px solid #cbd5e1', background: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
                    >
                      <Plus size={16} />
                    </button>
                  </div>
                </div>

                {/* Custom Selling Price */}
                <div>
                  <label style={{ fontSize: '0.78rem', fontWeight: '700', color: '#64748b', display: 'block', marginBottom: '0.3rem' }}>
                    تعديل السعر المطبق ($):
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={customPrice}
                    onChange={(e) => setCustomPrice(e.target.value)}
                    style={{ width: '100%', height: '38px', padding: '0 0.65rem', fontWeight: '900', fontSize: '1rem', borderRadius: '10px', border: '1px solid #cbd5e1', outline: 'none', background: '#ffffff', color: '#2563eb' }}
                  />
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.25rem' }}>
              <button
                type="button"
                onClick={handleConfirmAddToCart}
                disabled={isOutOfStock}
                className="btn-sand"
                style={{
                  flex: 1,
                  height: '46px',
                  borderRadius: '12px',
                  fontSize: '0.95rem',
                  fontWeight: '900',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.5rem',
                  opacity: isOutOfStock ? 0.5 : 1,
                  cursor: isOutOfStock ? 'not-allowed' : 'pointer'
                }}
              >
                <ShoppingCart size={18} /> إضافة ({addQty}) للفاتورة 🛒
              </button>

              {onQuickRestock && (
                <button
                  type="button"
                  onClick={() => { onClose(); onQuickRestock(product); }}
                  style={{ padding: '0 1rem', height: '46px', borderRadius: '12px', background: '#ecfdf5', border: '1px solid #a7f3d0', color: '#047857', fontSize: '0.85rem', fontWeight: '800', cursor: 'pointer' }}
                >
                  تحديث المخزون 📦
                </button>
              )}
            </div>
          </div>
        ) : (
          /* CASE 2: PART NOT FOUND IN INVENTORY */
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', textAlign: 'center', padding: '1rem 0' }}>
            <div style={{ width: '64px', height: '64px', borderRadius: '20px', background: '#fef2f2', color: '#ef4444', border: '1px solid #fecaca', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto' }}>
              <AlertTriangle size={32} />
            </div>

            <div>
              <h3 style={{ fontSize: '1.15rem', fontWeight: '900', color: '#0f172a', margin: 0 }}>
                هذه القطعة غير مسجلة بالسيستم!
              </h3>
              <p style={{ fontSize: '0.88rem', color: '#64748b', margin: '0.4rem 0 0 0', fontWeight: '600' }}>
                الكود الممسوح <strong className="mono" style={{ color: '#ef4444' }}>{scannedCode}</strong> لم يتم العثور عليه في قاعدة البيانات. هل ترغب في تسجيل القطعة وتأمين مخزونها الآن؟
              </p>
            </div>

            <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
              <button
                type="button"
                onClick={onClose}
                style={{ flex: 1, height: '44px', borderRadius: '12px', background: '#f1f5f9', border: '1px solid #cbd5e1', color: '#475569', fontWeight: '800', fontSize: '0.88rem', cursor: 'pointer' }}
              >
                إلغاء ✖️
              </button>

              <button
                type="button"
                onClick={() => { onClose(); if (onRegisterNewPart) onRegisterNewPart(scannedCode); }}
                className="btn-primary"
                style={{ flex: 1.5, height: '44px', borderRadius: '12px', fontSize: '0.88rem', fontWeight: '900' }}
              >
                تسجيل قطعة جديدة الآن 🆕✨
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
