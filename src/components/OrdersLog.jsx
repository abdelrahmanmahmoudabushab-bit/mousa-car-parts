import React from 'react';
import { ShoppingBag, Printer } from 'lucide-react';

export default function OrdersLog({ orders, onReprintReceipt }) {
  return (
    <div style={{ padding: '1.75rem', display: 'flex', flexDirection: 'column', gap: '1.25rem', height: '100%', overflow: 'hidden' }}>
      <div>
        <h1 style={{ fontSize: '1.6rem', fontWeight: '800' }}>Counter Sales History</h1>
        <p style={{ fontSize: '0.88rem', color: 'var(--text-muted)' }}>Audit trail of completed counter sale transactions & receipts.</p>
      </div>

      <div className="table-container" style={{ flex: 1, overflowY: 'auto' }}>
        <table className="data-table">
          <thead>
            <tr>
              <th>Order ID</th>
              <th>Date & Time</th>
              <th>Cashier</th>
              <th>Items Sold</th>
              <th>Payment Method</th>
              <th>Total Amount</th>
              <th>Status</th>
              <th style={{ textAlign: 'right' }}>Receipt</th>
            </tr>
          </thead>
          <tbody>
            {orders.length === 0 ? (
              <tr>
                <td colSpan={8} style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                  No orders recorded yet.
                </td>
              </tr>
            ) : (
              orders.map(order => (
                <tr key={order.id}>
                  <td className="mono" style={{ fontWeight: '700', color: 'var(--primary)' }}>{order.id}</td>
                  <td>{new Date(order.date).toLocaleString()}</td>
                  <td>{order.cashier || 'Alex Counter'}</td>
                  <td>
                    <div style={{ fontWeight: '600' }}>{order.items.length} Part(s)</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      {order.items.map(i => `${i.qty}x ${i.oem}`).join(', ')}
                    </div>
                  </td>
                  <td>
                    <span style={{ padding: '0.2rem 0.5rem', background: '#f1f5f9', borderRadius: '6px', fontSize: '0.78rem', fontWeight: '600' }}>
                      {order.paymentMethod}
                    </span>
                  </td>
                  <td className="mono" style={{ fontWeight: '700', fontSize: '0.95rem' }}>${order.total.toFixed(2)}</td>
                  <td>
                    <span className="badge-status badge-in-stock">Completed</span>
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <button
                      onClick={() => onReprintReceipt(order)}
                      style={{ padding: '0.4rem 0.75rem', borderRadius: '6px', background: '#f1f5f9', border: '1px solid var(--border-color)', color: 'var(--text-main)', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.8rem', fontWeight: '600' }}
                    >
                      <Printer size={14} /> Receipt
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
