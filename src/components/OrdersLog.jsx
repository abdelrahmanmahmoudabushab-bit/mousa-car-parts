import React, { useState, useMemo } from 'react';
import { ShoppingBag, Printer, Search, Calendar, User, Filter, RotateCcw, CheckCircle, Clock, Truck, MapPin } from 'lucide-react';

export default function OrdersLog({ orders = [], onReprintReceipt }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [displayCount, setDisplayCount] = useState(50);

  // Memoized search and status filtering for sub-1ms rendering speed
  const filteredOrders = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    
    return orders.filter(order => {
      // Status Filter
      if (statusFilter !== 'ALL') {
        const status = (order.status || '').toLowerCase();
        if (statusFilter === 'COMPLETED' && !status.includes('completed')) return false;
        if (statusFilter === 'PENDING' && status.includes('completed')) return false;
      }

      if (!term) return true;

      // Search matching Order ID, Customer Name, Phone, Cashier, or Items OEM
      const idMatch = (order.id || '').toLowerCase().includes(term);
      const customerMatch = (order.customerName || '').toLowerCase().includes(term);
      const phoneMatch = (order.customerPhone || '').toLowerCase().includes(term);
      const cashierMatch = (order.cashier || '').toLowerCase().includes(term);
      const itemMatch = (order.items || []).some(item => 
        (item.oem || '').toLowerCase().includes(term) || 
        (item.name || '').toLowerCase().includes(term)
      );

      return idMatch || customerMatch || phoneMatch || cashierMatch || itemMatch;
    });
  }, [orders, searchTerm, statusFilter]);

  // Paginated slice to avoid heavy DOM node rendering
  const visibleOrders = useMemo(() => {
    return filteredOrders.slice(0, displayCount);
  }, [filteredOrders, displayCount]);

  return (
    <div style={{ padding: '1.75rem', display: 'flex', flexDirection: 'column', gap: '1.25rem', height: '100%', overflow: 'hidden', background: '#f4f6f9' }}>
      
      {/* Header & Stats Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#ffffff', border: '1px solid var(--border-color)', borderRadius: '16px', padding: '1.25rem 1.5rem', boxShadow: '0 4px 14px rgba(15, 23, 42, 0.04)' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: '800', color: '#0f172a', margin: 0, fontFamily: 'var(--font-heading)' }}>
            Sales & Order History Log
          </h1>
          <p style={{ fontSize: '0.85rem', color: '#64748b', margin: '0.2rem 0 0 0' }}>
            Live audit trail of completed counter checkouts and customer store orders.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '12px', padding: '0.5rem 1rem', textAlign: 'right' }}>
            <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: '700' }}>Total Orders Recorded</div>
            <div style={{ fontSize: '1.2rem', fontWeight: '800', color: '#2563eb', fontFamily: 'var(--font-mono)' }}>{orders.length}</div>
          </div>
        </div>
      </div>

      {/* Filter & Instant Search Toolbar */}
      <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap', background: '#ffffff', border: '1px solid var(--border-color)', borderRadius: '14px', padding: '0.85rem 1.25rem' }}>
        <div style={{ flex: 1, minWidth: '260px', position: 'relative', display: 'flex', alignItems: 'center' }}>
          <Search size={17} style={{ position: 'absolute', left: '0.85rem', color: '#2563eb' }} />
          <input
            type="text"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            placeholder="Search Order ID (ORD-xxxx), Customer Name, Phone, OEM..."
            style={{
              width: '100%',
              background: '#f8fafc',
              border: '1px solid #cbd5e1',
              borderRadius: '10px',
              padding: '0.55rem 0.85rem 0.55rem 2.4rem',
              fontSize: '0.88rem',
              fontWeight: '600',
              color: '#0f172a',
              outline: 'none'
            }}
          />
        </div>

        {/* Status Filter Pills */}
        <div style={{ display: 'flex', gap: '0.4rem' }}>
          {['ALL', 'COMPLETED', 'PENDING'].map(st => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              style={{
                padding: '0.45rem 0.85rem',
                borderRadius: '8px',
                background: statusFilter === st ? '#0f172a' : '#f8fafc',
                color: statusFilter === st ? '#ffffff' : '#475569',
                border: statusFilter === st ? '1px solid #0f172a' : '1px solid #cbd5e1',
                fontWeight: '700',
                fontSize: '0.78rem',
                cursor: 'pointer'
              }}
            >
              {st === 'ALL' ? 'All Orders' : st === 'COMPLETED' ? 'Completed' : 'Pending'}
            </button>
          ))}
        </div>

        {searchTerm && (
          <button
            onClick={() => setSearchTerm('')}
            style={{ background: 'transparent', border: 'none', color: '#dc2626', fontSize: '0.8rem', fontWeight: '700', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.25rem' }}
          >
            <RotateCcw size={13} /> Clear
          </button>
        )}
      </div>

      {/* Orders Data Table */}
      <div className="table-container" style={{ flex: 1, overflowY: 'auto', background: '#ffffff', borderRadius: '16px', border: '1px solid var(--border-color)', boxShadow: '0 4px 14px rgba(15, 23, 42, 0.04)' }}>
        <table className="data-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569', fontSize: '0.8rem', textAlign: 'left' }}>
              <th style={{ padding: '0.85rem 1rem' }}>Order Ref</th>
              <th style={{ padding: '0.85rem 1rem' }}>Date & Time</th>
              <th style={{ padding: '0.85rem 1rem' }}>Customer / Cashier</th>
              <th style={{ padding: '0.85rem 1rem' }}>Items Summary</th>
              <th style={{ padding: '0.85rem 1rem' }}>Fulfillment</th>
              <th style={{ padding: '0.85rem 1rem' }}>Total Amount</th>
              <th style={{ padding: '0.85rem 1rem' }}>Status</th>
              <th style={{ padding: '0.85rem 1rem', textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {visibleOrders.length === 0 ? (
              <tr>
                <td colSpan={8} style={{ textAlign: 'center', padding: '4rem 1rem', color: '#64748b' }}>
                  <ShoppingBag size={40} style={{ opacity: 0.25, marginBottom: '0.5rem' }} />
                  <div style={{ fontWeight: '700', color: '#0f172a' }}>No matching sales records found</div>
                  <div style={{ fontSize: '0.82rem', marginTop: '0.25rem' }}>Try broadening your search term or status filter</div>
                </td>
              </tr>
            ) : (
              visibleOrders.map(order => {
                const totalVal = Number(order.totalAmount || order.total || 0);
                const itemsCount = (order.items || []).reduce((acc, item) => acc + (item.qty || 1), 0);
                const isCompleted = (order.status || '').toLowerCase().includes('completed');

                return (
                  <tr key={order.id || Math.random()} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td className="mono" style={{ padding: '0.85rem 1rem', fontWeight: '700', color: '#2563eb', fontSize: '0.85rem' }}>
                      {order.id || 'ORD-GEN'}
                    </td>

                    <td style={{ padding: '0.85rem 1rem', fontSize: '0.82rem', color: '#475569' }}>
                      {order.date ? new Date(order.date).toLocaleString() : new Date().toLocaleString()}
                    </td>

                    <td style={{ padding: '0.85rem 1rem' }}>
                      <div style={{ fontWeight: '700', fontSize: '0.88rem', color: '#0f172a' }}>
                        {order.customerName || order.cashier || 'Cashier Counter'}
                      </div>
                      {order.customerPhone && (
                        <div style={{ fontSize: '0.75rem', color: '#64748b' }}>📞 {order.customerPhone}</div>
                      )}
                    </td>

                    <td style={{ padding: '0.85rem 1rem' }}>
                      <div style={{ fontWeight: '700', fontSize: '0.85rem', color: '#0f172a' }}>{itemsCount} Part(s)</div>
                      <div style={{ fontSize: '0.74rem', color: '#64748b', maxWidth: '220px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {(order.items || []).map(i => `${i.qty || 1}x ${i.oem || i.name}`).join(', ')}
                      </div>
                    </td>

                    <td style={{ padding: '0.85rem 1rem' }}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', padding: '0.2rem 0.55rem', borderRadius: '6px', background: '#f1f5f9', border: '1px solid #cbd5e1', fontSize: '0.76rem', fontWeight: '600', color: '#334155' }}>
                        {order.deliveryMethod === 'delivery' ? <Truck size={13} /> : <MapPin size={13} />}
                        {order.deliveryMethod === 'delivery' ? 'City Delivery' : 'In-Store Pickup'}
                      </span>
                    </td>

                    <td className="mono" style={{ padding: '0.85rem 1rem', fontWeight: '800', fontSize: '0.95rem', color: '#0f172a' }}>
                      ${totalVal.toFixed(2)}
                    </td>

                    <td style={{ padding: '0.85rem 1rem' }}>
                      <span style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.3rem',
                        padding: '0.25rem 0.65rem',
                        borderRadius: '999px',
                        background: isCompleted ? '#ecfdf5' : '#fffbebe6',
                        color: isCompleted ? '#047857' : '#b45309',
                        border: isCompleted ? '1px solid #a7f3d0' : '1px solid #fde68a',
                        fontSize: '0.76rem',
                        fontWeight: '700'
                      }}>
                        {isCompleted ? <CheckCircle size={13} /> : <Clock size={13} />}
                        {order.status || 'Completed'}
                      </span>
                    </td>

                    <td style={{ padding: '0.85rem 1rem', textAlign: 'right' }}>
                      {onReprintReceipt && (
                        <button
                          onClick={() => onReprintReceipt(order)}
                          style={{
                            padding: '0.35rem 0.75rem',
                            borderRadius: '8px',
                            background: '#eff6ff',
                            border: '1px solid #bfdbfe',
                            color: '#2563eb',
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.35rem',
                            fontSize: '0.78rem',
                            fontWeight: '700'
                          }}
                        >
                          <Printer size={14} /> Receipt
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>

        {/* Load More Pagination Button */}
        {filteredOrders.length > displayCount && (
          <div style={{ textAlign: 'center', padding: '1.25rem', borderTop: '1px solid #f1f5f9', background: '#f8fafc' }}>
            <button
              onClick={() => setDisplayCount(prev => prev + 50)}
              className="btn-primary"
              style={{ padding: '0.55rem 1.5rem', borderRadius: '10px', fontSize: '0.85rem', fontWeight: '700' }}
            >
              Load More Sales Records ({filteredOrders.length - displayCount} remaining)
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
