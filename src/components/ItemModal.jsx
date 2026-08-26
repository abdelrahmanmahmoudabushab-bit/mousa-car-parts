import React, { useState, useEffect } from 'react';
import { X, Save, Camera } from 'lucide-react';
import QrScannerModal from './QrScannerModal';
import { parseSmartSerialNumber } from '../utils/documentParser';

export default function ItemModal({ item, categories, onClose, onSave }) {
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [formData, setFormData] = useState({
    oem: '',
    sku: '',
    name: '',
    cnName: '',
    arName: '',
    vehicleModel: 'BYD Seagull',
    categoryId: categories[0] ? categories[0].id : '',
    costPrice: '',
    unitPrice: '',
    quantity: '',
    minLevel: '5',
    location: 'Aisle 1 · Bin 01',
    supplier: 'BYD Auto Supply'
  });

  useEffect(() => {
    if (item) {
      setFormData({
        id: item.id,
        oem: item.oem || '',
        sku: item.sku || item.oem || '',
        name: item.name || '',
        cnName: item.cnName || '',
        arName: item.arName || '',
        vehicleModel: item.vehicleModel || 'BYD Seagull',
        categoryId: item.categoryId || (categories[0] ? categories[0].id : ''),
        costPrice: item.costPrice || '',
        unitPrice: item.unitPrice || '',
        quantity: item.quantity !== undefined ? item.quantity : '',
        minLevel: item.minLevel || '5',
        location: item.location || 'Aisle 1 · Bin 01',
        supplier: item.supplier || 'BYD Auto Supply'
      });
    }
  }, [item, categories]);

  // Global keydown listener for physical barcode scanners inside ItemModal
  useEffect(() => {
    let buffer = '';
    let lastKeyTime = Date.now();
    let firstKeyChar = '';

    const handleGlobalKeyDown = (e) => {
      const currentTime = Date.now();
      const isFast = (currentTime - lastKeyTime) < 50;
      lastKeyTime = currentTime;

      if (e.key === 'Enter') {
        if (buffer.trim().length > 2) {
          e.preventDefault();
          const parsed = parseSmartSerialNumber(buffer.trim()) || buffer.trim();
          setFormData(prev => ({ ...prev, oem: parsed, sku: parsed }));
          buffer = '';
          firstKeyChar = '';
        }
      } else if (e.key.length === 1) {
        if (isFast) {
          if (buffer.length > 0) {
            buffer += e.key;
          } else if (firstKeyChar) {
            buffer = firstKeyChar + e.key;
            firstKeyChar = '';
          }
        } else {
          firstKeyChar = e.key;
          buffer = '';
        }
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, []);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.oem || !formData.name || !formData.unitPrice) {
      alert('Please fill out OEM code, part name, and retail price.');
      return;
    }

    onSave({
      ...formData,
      costPrice: Math.max(0, parseFloat(formData.costPrice) || 0),
      unitPrice: Math.max(0, parseFloat(formData.unitPrice) || 0),
      quantity: Math.max(0, parseInt(formData.quantity, 10) || 0),
      minLevel: Math.max(0, parseInt(formData.minLevel, 10) || 5),
    });
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content" style={{ maxWidth: '580px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: '800' }}>{item ? 'تعديل قطعة غيار OEM' : 'إضافة قطعة غيار OEM جديدة'}</h2>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
            <X size={22} />
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.85rem' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <label style={{ fontSize: '0.8rem', color: '#94a3b8', fontWeight: '600' }}>رقم القطعة (OEM Code) *</label>
                <button
                  type="button"
                  onClick={() => setIsScannerOpen(true)}
                  style={{ background: 'none', border: 'none', color: '#d97706', cursor: 'pointer', fontSize: '0.75rem', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '0.25rem' }}
                >
                  <Camera size={14} /> مسح 📷
                </button>
              </div>
              <input
                type="text"
                placeholder="مثال: EQEA-5402841"
                value={formData.oem}
                onChange={e => setFormData({ ...formData, oem: e.target.value, sku: e.target.value })}
                className="input-field-sm"
                style={{ fontFamily: 'var(--font-mono)' }}
                required
              />
            </div>

            {isScannerOpen && (
              <QrScannerModal
                onClose={() => setIsScannerOpen(false)}
                onScanSuccess={(code) => setFormData(prev => ({ ...prev, oem: code, sku: code }))}
                title="مسح OEM باركود القطعة 📷"
              />
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
              <label style={{ fontSize: '0.8rem', color: '#94a3b8', fontWeight: '600' }}>الموديل المتوافق</label>
              <select
                value={formData.vehicleModel}
                onChange={e => setFormData({ ...formData, vehicleModel: e.target.value })}
                className="input-field-sm"
              >
                <option value="BYD Seagull">بي واي دي سيجول (BYD Seagull)</option>
                <option value="BYD Dolphin">بي واي دي دولفين (BYD Dolphin)</option>
                <option value="BYD Atto 3">بي واي دي أتو 3 (BYD Atto 3)</option>
                <option value="BYD Tang">بي واي دي تانج (BYD Tang)</option>
                <option value="BYD Han">بي واي دي هان (BYD Han)</option>
              </select>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.85rem' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
              <label style={{ fontSize: '0.8rem', color: '#94a3b8', fontWeight: '600' }}>سنوات الصنع</label>
              <input
                type="text"
                placeholder="مثال: 2023 - 2026"
                value={formData.yearRange || '2023 - 2026'}
                onChange={e => setFormData({ ...formData, yearRange: e.target.value })}
                className="input-field-sm"
              />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
              <label style={{ fontSize: '0.8rem', color: '#94a3b8', fontWeight: '600' }}>رقم الهيكل VIN</label>
              <input
                type="text"
                placeholder="مثال: EQEA / LC0"
                value={formData.vinPattern || ''}
                onChange={e => setFormData({ ...formData, vinPattern: e.target.value })}
                className="input-field-sm"
                style={{ fontFamily: 'var(--font-mono)' }}
              />
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
            <label style={{ fontSize: '0.8rem', color: '#94a3b8', fontWeight: '600' }}>اسم القطعة بالإنجليزية *</label>
            <input
              type="text"
              placeholder="e.g. Right Front Door Skirt Panel"
              value={formData.name}
              onChange={e => setFormData({ ...formData, name: e.target.value })}
              className="input-field-sm"
              required
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.85rem' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
              <label style={{ fontSize: '0.8rem', color: '#34d399', fontWeight: '600' }}>اسم القطعة بالعربي</label>
              <input
                type="text"
                placeholder="مثال: تنورة الباب الأمامي الأيمن"
                value={formData.arName || ''}
                onChange={e => setFormData({ ...formData, arName: e.target.value })}
                dir="rtl"
                className="input-field-sm"
                style={{ border: '1px solid rgba(16, 185, 129, 0.4)', background: 'rgba(16, 185, 129, 0.1)', fontFamily: "'Cairo', sans-serif", fontWeight: '700', color: '#34d399' }}
              />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
              <label style={{ fontSize: '0.8rem', color: '#94a3b8', fontWeight: '600' }}>مواصفات القطعة الإضافية</label>
              <input
                type="text"
                placeholder="مثال: تنورة الباب الأمامي الأيمن"
                value={formData.cnName}
                onChange={e => setFormData({ ...formData, cnName: e.target.value })}
                className="input-field-sm"
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.85rem' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
              <label style={{ fontSize: '0.8rem', color: '#94a3b8', fontWeight: '600' }}>Category</label>
              <select
                value={formData.categoryId}
                onChange={e => setFormData({ ...formData, categoryId: e.target.value })}
                className="input-field-sm"
              >
                {categories.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
              <label style={{ fontSize: '0.8rem', color: '#94a3b8', fontWeight: '600' }}>Bin Location</label>
              <input
                type="text"
                placeholder="e.g. Aisle 1 · Shelf A · Bin 01"
                value={formData.location}
                onChange={e => setFormData({ ...formData, location: e.target.value })}
                className="input-field-sm"
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '0.65rem' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
              <label style={{ fontSize: '0.78rem', color: '#94a3b8', fontWeight: '600' }}>Cost ($)</label>
              <input
                type="number"
                step="0.01"
                value={formData.costPrice}
                onChange={e => setFormData({ ...formData, costPrice: e.target.value })}
                className="input-field-sm"
              />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
              <label style={{ fontSize: '0.78rem', color: '#94a3b8', fontWeight: '600' }}>Retail ($) *</label>
              <input
                type="number"
                step="0.01"
                value={formData.unitPrice}
                onChange={e => setFormData({ ...formData, unitPrice: e.target.value })}
                className="input-field-sm"
                required
              />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
              <label style={{ fontSize: '0.78rem', color: '#94a3b8', fontWeight: '600' }}>Stock Qty</label>
              <input
                type="number"
                value={formData.quantity}
                onChange={e => setFormData({ ...formData, quantity: e.target.value })}
                className="input-field-sm"
              />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
              <label style={{ fontSize: '0.78rem', color: '#94a3b8', fontWeight: '600' }}>Min Level</label>
              <input
                type="number"
                value={formData.minLevel}
                onChange={e => setFormData({ ...formData, minLevel: e.target.value })}
                className="input-field-sm"
              />
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
            <button type="button" onClick={onClose} style={{ padding: '0.65rem 1.25rem', borderRadius: '6px', background: '#f1f5f9', border: '1px solid var(--border-color)', cursor: 'pointer' }}>
              Cancel
            </button>
            <button type="submit" className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <Save size={18} /> Save Part
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
