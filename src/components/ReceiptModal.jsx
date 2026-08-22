import React from 'react';
import { Printer, X, CheckCircle } from 'lucide-react';

export default function ReceiptModal({ order, onClose }) {
  const handlePrint = () => {
    window.print();
  };

  if (!order) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-content" style={{ maxWidth: '420px', alignItems: 'center' }}>
        <div style={{ display: 'flex', width: '100%', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#15803d', fontWeight: '700', fontSize: '0.95rem' }}>
            <CheckCircle size={20} /> Transaction Complete
          </div>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
            <X size={24} />
          </button>
        </div>

        {/* Receipt Paper */}
        <div className="receipt-paper">
          <div style={{ textAlign: 'center', marginBottom: '0.75rem' }}>
            <div style={{ fontSize: '1.1rem', fontWeight: '800', textTransform: 'uppercase' }}>MOUSA CAR PARTS</div>
            <div style={{ fontSize: '0.72rem' }}>AUTO PARTS & OEM DISTRIBUTOR · موسى لقطع السيارات</div>
            <div style={{ fontSize: '0.72rem' }}>TEL: (555) 019-8200 · TAX ID: #98-201823</div>
          </div>

          <div className="receipt-divider"></div>

          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span>RECEIPT #: {order.id}</span>
            <span>{new Date(order.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
          </div>
          <div>DATE: {new Date(order.date).toLocaleDateString()}</div>
          <div>CASHIER: {order.cashier || 'Alex Counter'}</div>

          <div className="receipt-divider"></div>

          {/* Items */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
            {order.items.map((item, idx) => (
              <div key={idx} style={{ display: 'flex', flexDirection: 'column' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: '600' }}>
                  <span>{item.qty}x {item.name}</span>
                  <span>${(Number(item.price || item.unitPrice || 0) * item.qty).toFixed(2)}</span>
                </div>
                <div style={{ fontSize: '0.7rem', color: '#475569' }}>OEM: {item.oem}</div>
              </div>
            ))}
          </div>

          <div className="receipt-divider"></div>

          {/* Totals */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>SUBTOTAL:</span>
              <span>${(Number(order.subtotal) || 0).toFixed(2)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>TAX (8%):</span>
              <span>${(Number(order.tax) || 0).toFixed(2)}</span>
            </div>
            <div className="receipt-divider"></div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1rem', fontWeight: '800' }}>
              <span>TOTAL ({order.paymentMethod}):</span>
              <span>${(Number(order.total) || 0).toFixed(2)}</span>
            </div>
          </div>

          <div className="receipt-divider"></div>

          <div style={{ fontSize: '0.68rem', textAlign: 'center', marginTop: '0.5rem', color: '#475569' }}>
            <div>Mousa Car Parts · Genuine Auto Parts Guarantee</div>
            <div style={{ marginTop: '0.3rem', letterSpacing: '0.1em', fontWeight: '800' }}>||| || |||||| | |||||||| |||| ||</div>
            <div>THANK YOU FOR YOUR BUSINESS!</div>
          </div>
        </div>

        {/* Buttons */}
        <div style={{ display: 'flex', gap: '0.75rem', width: '100%' }}>
          <button
            onClick={handlePrint}
            className="btn-primary"
            style={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem'
            }}
          >
            <Printer size={18} /> Print Invoice Receipt
          </button>
          <button
            onClick={onClose}
            style={{
              padding: '0.75rem 1.25rem',
              borderRadius: '8px',
              background: '#f1f5f9',
              border: '1px solid var(--border-color)',
              color: 'var(--text-main)',
              fontWeight: '600',
              cursor: 'pointer'
            }}
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
