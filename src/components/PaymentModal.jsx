import React, { useState } from 'react';
import { DollarSign, CreditCard, CheckCircle, X } from 'lucide-react';

export default function PaymentModal({ cart, totals, onClose, onCompleteSale }) {
  const [method, setMethod] = useState('Cash');
  const [cashTendered, setCashTendered] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  const tenderedNum = parseFloat(cashTendered) || 0;
  const changeDue = Math.max(0, tenderedNum - totals.total);
  const quickCashChips = [20, 50, 100, 200];

  const handleProcessPayment = () => {
    if (method === 'Cash' && tenderedNum < totals.total) {
      alert('المبلغ النقدي المستلم أقل من إجمالي الفاتورة!');
      return;
    }

    setIsProcessing(true);
    setTimeout(() => {
      setIsProcessing(false);
      onCompleteSale({
        paymentMethod: method,
        cashTendered: method === 'Cash' ? tenderedNum : totals.total,
        changeDue: method === 'Cash' ? changeDue : 0,
      });
    }, 1000);
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content" style={{ maxWidth: '520px', borderRadius: '20px', fontFamily: "'Cairo', sans-serif" }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h2 style={{ fontSize: '1.35rem', fontWeight: '800', color: '#0f172a' }}>تأكيد دفع الفاتورة 🧾</h2>
            <p style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: '600' }}>عدد القطع في الفاتورة: {cart.length} قطعة</p>
          </div>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: '#64748b', cursor: 'pointer' }}>
            <X size={24} />
          </button>
        </div>

        {/* Total Highlight */}
        <div style={{ background: '#fffbeb', border: '1px solid #fde68a', padding: '1.25rem', borderRadius: '14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontSize: '0.85rem', color: '#b45309', fontWeight: '800' }}>
            المبلغ الإجمالي المطلوب
          </div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: '2rem', fontWeight: '800', color: '#d97706' }}>
            ${totals.total.toFixed(2)}
          </div>
        </div>

        {/* Payment Methods */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
          {[
            { id: 'Cash', label: 'دفع نقدي (كاش) 💵', icon: DollarSign },
            { id: 'Credit Card', label: 'بطاقة مدى / فيزا 💳', icon: CreditCard },
          ].map(m => {
            const Icon = m.icon;
            const isActive = method === m.id;
            return (
              <button
                key={m.id}
                onClick={() => setMethod(m.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.5rem',
                  padding: '0.9rem',
                  borderRadius: '12px',
                  background: isActive ? '#0f172a' : '#ffffff',
                  border: isActive ? '1px solid #0f172a' : '1px solid #cbd5e1',
                  color: isActive ? '#ffffff' : '#0f172a',
                  cursor: 'pointer',
                  fontWeight: '800',
                  fontSize: '0.9rem',
                  fontFamily: "'Cairo', sans-serif"
                }}
              >
                <Icon size={18} />
                {m.label}
              </button>
            );
          })}
        </div>

        {/* Cash Tender */}
        {method === 'Cash' && (
          <div style={{ background: '#f8fafc', padding: '1.1rem', borderRadius: '14px', border: '1px solid #e2e8f0' }}>
            <label style={{ fontSize: '0.85rem', color: '#475569', display: 'block', marginBottom: '0.4rem', fontWeight: '700' }}>المبلغ المستلم من العميل ($)</label>
            <input
              type="number"
              value={cashTendered}
              onChange={e => setCashTendered(e.target.value)}
              placeholder={`مثال: ${totals.total.toFixed(0)}`}
              style={{
                width: '100%',
                padding: '0.75rem 1rem',
                background: '#ffffff',
                border: '1px solid #cbd5e1',
                borderRadius: '10px',
                color: '#0f172a',
                fontSize: '1.25rem',
                fontFamily: 'var(--font-mono)',
                fontWeight: '800',
                outline: 'none'
              }}
            />

            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.75rem' }}>
              {quickCashChips.map(val => (
                <button
                  key={val}
                  onClick={() => setCashTendered(val.toString())}
                  style={{
                    flex: 1,
                    padding: '0.45rem',
                    borderRadius: '8px',
                    background: '#ffffff',
                    border: '1px solid #cbd5e1',
                    color: '#0f172a',
                    fontFamily: 'var(--font-mono)',
                    fontWeight: '800',
                    cursor: 'pointer'
                  }}
                >
                  ${val}
                </button>
              ))}
            </div>

            <div style={{ marginTop: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '0.75rem', borderTop: '1px dashed #cbd5e1' }}>
              <span style={{ fontSize: '0.9rem', color: '#475569', fontWeight: '700' }}>المبلغ المتبقي للعميل (المتبقي):</span>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '1.4rem', fontWeight: '800', color: tenderedNum >= totals.total ? '#047857' : '#64748b' }}>
                ${changeDue.toFixed(2)}
              </span>
            </div>
          </div>
        )}

        <button
          onClick={handleProcessPayment}
          disabled={isProcessing}
          className="btn-sand"
          style={{ width: '100%', padding: '0.9rem', fontSize: '1.05rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', fontWeight: '800', fontFamily: "'Cairo', sans-serif" }}
        >
          <CheckCircle size={20} /> تأكيد الدفع وطباعة الفاتورة (${totals.total.toFixed(2)})
        </button>
      </div>
    </div>
  );
}
