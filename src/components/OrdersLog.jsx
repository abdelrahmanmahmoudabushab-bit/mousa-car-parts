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
    <div style={{ padding: '1.75rem', display: 'flex', flexDirection: 'column', gap: '1.25rem', height: '100%', overflow: 'hidden', background: '#f8fafc', fontFamily: "'Cairo', sans-serif" }}>
      
      {/* Header & Stats Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '18px', padding: '1.25rem 1.5rem', boxShadow: '0 4px 14px rgba(15, 23, 42, 0.04)' }}>
        <div>
          <h1 style={{ fontSize: '1.4rem', fontWeight: '800', color: '#0f172a', margin: 0, fontFamily: "'Cairo', sans-serif" }}>
            سجل فواتير المبيعات وتاريخ العمليات 📋
          </h1>
          <p style={{ fontSize: '0.85rem', color: '#64748b', margin: '0.2rem 0 0 0', fontWeight: '600' }}>
            تتبع مباشر لجميع عمليات البيع الصادرة من الكاشير وتفاصيل الفواتير.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: '12px', padding: '0.5rem 1.25rem', textAlign: 'right' }}>
            <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: '700' }}>إجمالي الفواتير المسجلة</div>
            <div style={{ fontSize: '1.3rem', fontWeight: '800', color: '#d97706', fontFamily: 'var(--font-mono)' }}>{orders.length}</div>
          </div>
        </div>
      </div>

      {/* Filter & Instant Search Toolbar */}
      <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap', background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '16px', padding: '0.85rem 1.25rem', boxShadow: '0 4px 14px rgba(15, 23, 42, 0.03)' }}>
        <div style={{ flex: 1, minWidth: '260px', position: 'relative', display: 'flex', alignItems: 'center' }}>
          <Search size={18} style={{ position: 'absolute', right: '0.85rem', color: '#d97706' }} />
          <input
            type="text"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            placeholder="ابحث برقم الفاتورة (ORD-...), اسم العميل، رقم الجوال..."
            style={{
              width: '100%',
              background: '#f8fafc',
              border: '1px solid #cbd5e1',
              borderRadius: '10px',
              padding: '0.6rem 2.5rem 0.6rem 0.85rem',
              fontSize: '0.88rem',
              fontWeight: '700',
              color: '#0f172a',
              outline: 'none',
              fontFamily: "'Cairo', sans-serif"
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
                padding: '0.5rem 1rem',
                borderRadius: '10px',
                background: statusFilter === st ? '#d97706' : '#ffffff',
                color: statusFilter === st ? '#ffffff' : '#0f172a',
                border: statusFilter === st ? '1px solid #d97706' : '1px solid #cbd5e1',
                fontWeight: '800',
                fontSize: '0.82rem',
                cursor: 'pointer',
                fontFamily: "'Cairo', sans-serif"
              }}
            >
              {st === 'ALL' ? 'جميع الفواتير' : st === 'COMPLETED' ? 'مكتملة' : 'قيد الانتظار'}
            </button>
          ))}
        </div>

        {searchTerm && (
          <button
            onClick={() => setSearchTerm('')}
            style={{ background: 'transparent', border: 'none', color: '#dc2626', fontSize: '0.82rem', fontWeight: '700', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.25rem', fontFamily: "'Cairo', sans-serif" }}
          >
            <RotateCcw size={14} /> مسح
          </button>
        )}
      </div>

      {/* Orders Data Table */}
      <div className="table-container" style={{ flex: 1, overflowY: 'auto', background: '#ffffff', borderRadius: '18px', border: '1px solid #e2e8f0', boxShadow: '0 4px 14px rgba(15, 23, 42, 0.04)' }}>
        <table className="data-table" style={{ width: '100%', borderCollapse: 'collapse', fontFamily: "'Cairo', sans-serif" }}>
          <thead>
            <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569', fontSize: '0.85rem', fontWeight: '800' }}>
              <th style={{ padding: '0.85rem 1rem' }}>رقم الفاتورة</th>
              <th style={{ padding: '0.85rem 1rem' }}>التاريخ والوقت</th>
              <th style={{ padding: '0.85rem 1rem' }}>العميل / الكاشير</th>
              <th style={{ padding: '0.85rem 1rem' }}>ملخص القطع</th>
              <th style={{ padding: '0.85rem 1rem' }}>نوع الاستلام</th>
              <th style={{ padding: '0.85rem 1rem' }}>المبلغ الإجمالي</th>
              <th style={{ padding: '0.85rem 1rem' }}>الحالة</th>
              <th style={{ padding: '0.85rem 1rem', textAlign: 'right' }}>الإجراءات</th>
            </tr>
          </thead>
          <tbody>
            {visibleOrders.length === 0 ? (
              <tr>
                <td colSpan={8} style={{ textAlign: 'center', padding: '4rem 1rem', color: '#64748b' }}>
                  <ShoppingBag size={48} style={{ opacity: 0.2, marginBottom: '0.5rem' }} />
                  <div style={{ fontWeight: '800', color: '#0f172a', fontSize: '1rem' }}>لا توجد فواتير مبيعات مطابقة للبحث</div>
                </td>
              </tr>
            ) : (
              visibleOrders.map(order => {
                const totalVal = Number(order.totalAmount || order.total || 0);
                const itemsCount = (order.items || []).reduce((acc, item) => acc + (item.qty || 1), 0);
                const isCompleted = (order.status || '').toLowerCase().includes('completed');

                return (
                  <tr key={order.id || Math.random()} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td className="mono" style={{ padding: '0.85rem 1rem', fontWeight: '800', color: '#d97706', fontSize: '0.88rem' }}>
                      {order.id || 'ORD-GEN'}
                    </td>

                    <td style={{ padding: '0.85rem 1rem', fontSize: '0.82rem', color: '#475569', fontWeight: '600' }}>
                      {order.date ? new Date(order.date).toLocaleString() : new Date().toLocaleString()}
                    </td>

                    <td style={{ padding: '0.85rem 1rem' }}>
                      <div style={{ fontWeight: '800', fontSize: '0.9rem', color: '#0f172a' }}>
                        {order.customerName || order.cashier || 'كاشير المحل'}
                      </div>
                      {order.customerPhone && (
                        <div style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: '600' }}>📞 {order.customerPhone}</div>
                      )}
                    </td>

                    <td style={{ padding: '0.85rem 1rem' }}>
                      <div style={{ fontWeight: '800', fontSize: '0.88rem', color: '#0f172a' }}>{itemsCount} قطعة</div>
                      <div style={{ fontSize: '0.78rem', color: '#64748b', maxWidth: '220px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: '600' }}>
                        {(order.items || []).map(i => `${i.qty || 1}x ${i.arName || i.name}`).join(', ')}
                      </div>
                    </td>

                    <td style={{ padding: '0.85rem 1rem' }}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', padding: '0.25rem 0.6rem', borderRadius: '8px', background: '#f8fafc', border: '1px solid #cbd5e1', fontSize: '0.78rem', fontWeight: '700', color: '#0f172a' }}>
                        {order.deliveryMethod === 'delivery' ? <Truck size={14} /> : <MapPin size={14} />}
                        {order.deliveryMethod === 'delivery' ? 'توصيل' : 'استلام من المحل'}
                      </span>
                    </td>

                    <td className="mono" style={{ padding: '0.85rem 1rem', fontWeight: '800', fontSize: '1rem', color: '#0f172a' }}>
                      ${totalVal.toFixed(2)}
                    </td>

                    <td style={{ padding: '0.85rem 1rem' }}>
                      <span style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.3rem',
                        padding: '0.25rem 0.75rem',
                        borderRadius: '999px',
                        background: isCompleted ? '#ecfdf5' : '#fffbeb',
                        color: isCompleted ? '#047857' : '#b45309',
                        border: isCompleted ? '1px solid #a7f3d0' : '1px solid #fde68a',
                        fontSize: '0.78rem',
                        fontWeight: '800'
                      }}>
                        {isCompleted ? <CheckCircle size={14} /> : <Clock size={14} />}
                        {isCompleted ? 'مكتملة' : 'قيد الانتظار'}
                      </span>
                    </td>

                    <td style={{ padding: '0.85rem 1rem', textAlign: 'right' }}>
                      {onReprintReceipt && (
                        <button
                          onClick={() => onReprintReceipt(order)}
                          style={{
                            padding: '0.4rem 0.85rem',
                            borderRadius: '8px',
                            background: '#f8fafc',
                            border: '1px solid #cbd5e1',
                            color: '#0f172a',
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.35rem',
                            fontSize: '0.82rem',
                            fontWeight: '800',
                            fontFamily: "'Cairo', sans-serif"
                          }}
                        >
                          <Printer size={15} /> طباعة الفاتورة
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
              className="btn-sand"
              style={{ padding: '0.65rem 1.75rem', borderRadius: '10px', fontSize: '0.88rem', fontWeight: '800' }}
            >
              عرض المزيد من الفواتير ({filteredOrders.length - displayCount} متبقية)
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
