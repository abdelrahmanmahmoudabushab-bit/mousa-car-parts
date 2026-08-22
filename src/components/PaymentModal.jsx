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
      alert('Tendered cash amount is less than the total sale amount!');
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
      <div className="modal-content" style={{ maxWidth: '520px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h2 style={{ fontSize: '1.35rem', fontWeight: '800' }}>Counter Sale Checkout</h2>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{cart.length} Auto Part(s) in Ticket</p>
          </div>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
            <X size={24} />
          </button>
        </div>

        {/* Total Highlight */}
        <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', padding: '1.25rem', borderRadius: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#1e40af', fontWeight: '700' }}>
            Total Sale Amount
          </div>
          <div style={{ fontFamily: 'var(--font-heading)', fontSize: '2rem', fontWeight: '800', color: 'var(--primary)' }}>
            ${totals.total.toFixed(2)}
          </div>
        </div>

        {/* Payment Methods */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
          {[
            { id: 'Cash', label: 'Cash Payment', icon: DollarSign },
            { id: 'Credit Card', label: 'Card Reader', icon: CreditCard },
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
                  padding: '0.85rem',
                  borderRadius: '10px',
                  background: isActive ? 'var(--primary)' : '#f8fafc',
                  border: isActive ? '1px solid var(--primary)' : '1px solid var(--border-color)',
                  color: isActive ? 'white' : 'var(--text-main)',
                  cursor: 'pointer',
                  fontWeight: '700',
                  fontSize: '0.9rem'
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
          <div style={{ background: '#f8fafc', padding: '1rem', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
            <label style={{ fontSize: '0.82rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.4rem', fontWeight: '600' }}>Cash Received ($)</label>
            <input
              type="number"
              value={cashTendered}
              onChange={e => setCashTendered(e.target.value)}
              placeholder={`e.g. ${totals.total.toFixed(0)}`}
              style={{
                width: '100%',
                padding: '0.75rem 1rem',
                background: '#ffffff',
                border: '1px solid var(--border-color)',
                borderRadius: '8px',
                color: 'var(--text-main)',
                fontSize: '1.25rem',
                fontFamily: 'var(--font-mono)',
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
                    padding: '0.4rem',
                    borderRadius: '6px',
                    background: '#e2e8f0',
                    border: 'none',
                    color: '#0f172a',
                    fontFamily: 'var(--font-mono)',
                    fontWeight: '700',
                    cursor: 'pointer'
                  }}
                >
                  ${val}
                </button>
              ))}
            </div>

            <div style={{ marginTop: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '0.75rem', borderTop: '1px dashed var(--border-color)' }}>
              <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>Change to Return:</span>
              <span style={{ fontFamily: 'var(--font-heading)', fontSize: '1.4rem', fontWeight: '800', color: tenderedNum >= totals.total ? '#15803d' : 'var(--text-muted)' }}>
                ${changeDue.toFixed(2)}
              </span>
            </div>
          </div>
        )}

        <button
          onClick={handleProcessPayment}
          disabled={isProcessing}
          className="btn-primary"
          style={{ width: '100%', padding: '0.9rem', fontSize: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
        >
          <CheckCircle size={20} /> Complete Sale (${totals.total.toFixed(2)})
        </button>
      </div>
    </div>
  );
}
