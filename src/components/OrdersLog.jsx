import React, { useState, useMemo } from 'react';
import { ShoppingBag, Printer, Search, Calendar, User, Filter, RotateCcw, CheckCircle, Clock, Truck, MapPin, X, AlertTriangle } from 'lucide-react';

export default function OrdersLog({ orders = [], onReprintReceipt, onReturnOrder, lang = 'ar' }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [displayCount, setDisplayCount] = useState(50);

  // Return Order Modal state
  const [returnOrderModal, setReturnOrderModal] = useState(null);
  const [returnReason, setReturnReason] = useState('Customer Return / إرجاع عميل');
  const [isSubmittingReturn, setIsSubmittingReturn] = useState(false);

  // Memoized search and status filtering for sub-1ms rendering speed
  const filteredOrders = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    
    return orders.filter(order => {
      // Status Filter
      if (statusFilter !== 'ALL') {
        const status = (order.status || '').toLowerCase();
        if (statusFilter === 'COMPLETED' && !status.includes('completed')) return false;
        if (statusFilter === 'RETURNED' && !status.includes('returned')) return false;
      }

      if (!term) return true;

      // Search matching Order ID, Customer Name, Phone, Cashier, or Items OEM
      const idMatch = (order.id || '').toLowerCase().includes(term);
      const customerMatch = (order.customerName || '').toLowerCase().includes(term);
      const phoneMatch = (order.customerPhone || '').toLowerCase().includes(term);
      const cashierMatch = (order.cashier || '').toLowerCase().includes(term);
      const itemMatch = (order.items || []).some(item => 
        (item.oem || '').toLowerCase().includes(term) || 
        (item.name || '').toLowerCase().includes(term) ||
        (item.arName || '').toLowerCase().includes(term)
      );

      return idMatch || customerMatch || phoneMatch || cashierMatch || itemMatch;
    });
  }, [orders, searchTerm, statusFilter]);

  // Paginated slice to avoid heavy DOM node rendering
  const visibleOrders = useMemo(() => {
    return filteredOrders.slice(0, displayCount);
  }, [filteredOrders, displayCount]);

  // Confirm and submit order return
  const handleConfirmReturn = async () => {
    if (!returnOrderModal) return;
    setIsSubmittingReturn(true);

    try {
      const itemsToReturn = returnOrderModal.items.map(item => ({
        id: item.id,
        oem: item.oem,
        name: item.arName || item.name,
        qty: item.qty || 1
      }));

      await onReturnOrder(returnOrderModal.id, itemsToReturn, returnReason);
      setReturnOrderModal(null);
    } catch (err) {
      alert('Return failed: ' + err.message);
    } finally {
      setIsSubmittingReturn(false);
    }
  };

  return (
    <div style={{ padding: '1.75rem', display: 'flex', flexDirection: 'column', gap: '1.25rem', height: '100%', overflow: 'hidden', background: '#f8fafc', fontFamily: "'Cairo', sans-serif" }}>
      
      {/* Header & Stats Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '18px', padding: '1.25rem 1.5rem', boxShadow: '0 4px 14px rgba(15, 23, 42, 0.04)' }}>
        <div>
          <h1 style={{ fontSize: '1.4rem', fontWeight: '800', color: '#0f172a', margin: 0, fontFamily: "'Cairo', sans-serif" }}>
            {lang === 'ar' ? 'سجل فواتير المبيعات وتاريخ العمليات 📋' : 'Sales History & Invoice Log 📋'}
          </h1>
          <p style={{ fontSize: '0.85rem', color: '#64748b', margin: '0.2rem 0 0 0', fontWeight: '600' }}>
            {lang === 'ar' ? 'تتبع مباشر لجميع فواتير البيع وإمكانية إرجاع الفواتير وإعادة القطع للمخزون بنقرة واحدة.' : 'Track completed orders, reprint receipts, or process returns with automatic stock restocking.'}
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: '12px', padding: '0.5rem 1.25rem', textAlign: 'right' }}>
            <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: '700' }}>إجمالي الفواتير</div>
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
            placeholder="ابحث برقم الفاتورة (ORD-...), اسم العميل، رقم الجوال، أو OEM..."
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
          {[
            { id: 'ALL', label: 'الكل' },
            { id: 'COMPLETED', label: 'مكتملة' },
            { id: 'RETURNED', label: 'مرتجعة 🔄' }
          ].map(st => (
            <button
              key={st.id}
              onClick={() => setStatusFilter(st.id)}
              style={{
                padding: '0.5rem 1rem',
                borderRadius: '10px',
                background: statusFilter === st.id ? '#d97706' : '#ffffff',
                color: statusFilter === st.id ? '#ffffff' : '#0f172a',
                border: statusFilter === st.id ? '1px solid #d97706' : '1px solid #cbd5e1',
                fontWeight: '800',
                fontSize: '0.82rem',
                cursor: 'pointer',
                fontFamily: "'Cairo', sans-serif"
              }}
            >
              {st.label}
            </button>
          ))}
        </div>
      </div>

      {/* Orders History Data Table */}
      <div style={{ flex: 1, overflowY: 'auto', background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '18px', boxShadow: '0 4px 14px rgba(15, 23, 42, 0.03)' }}>
        <table className="data-table" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'right' }}>
          <thead>
            <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#64748b', fontSize: '0.82rem', fontWeight: '800' }}>
              <th style={{ padding: '0.85rem 1rem' }}>رقم الفاتورة</th>
              <th style={{ padding: '0.85rem 1rem' }}>التاريخ والوقت</th>
              <th style={{ padding: '0.85rem 1rem' }}>العميل / الكاشير</th>
              <th style={{ padding: '0.85rem 1rem' }}>القطع المباعة</th>
              <th style={{ padding: '0.85rem 1rem' }}>طريقة الاستلام</th>
              <th style={{ padding: '0.85rem 1rem' }}>المبلغ الإجمالي</th>
              <th style={{ padding: '0.85rem 1rem' }}>الحالة</th>
              <th style={{ padding: '0.85rem 1rem', textAlign: 'right' }}>إجراءات الفاتورة</th>
            </tr>
          </thead>
          <tbody>
            {visibleOrders.length === 0 ? (
              <tr>
                <td colSpan="8" style={{ textAlign: 'center', padding: '3.5rem 1rem', color: '#64748b' }}>
                  <ShoppingBag size={48} style={{ opacity: 0.2, marginBottom: '0.5rem' }} />
                  <div style={{ fontWeight: '800', color: '#0f172a', fontSize: '1rem' }}>لا توجد فواتير مبيعات مطابقة للبحث</div>
                </td>
              </tr>
            ) : (
              visibleOrders.map(order => {
                const totalVal = Number(order.totalAmount || order.total || 0);
                const itemsCount = (order.items || []).reduce((acc, item) => acc + (item.qty || 1), 0);
                const isReturned = (order.status || '').toLowerCase().includes('returned');
                const isCompleted = !isReturned;

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
                        background: isReturned ? '#f3e8ff' : '#ecfdf5',
                        color: isReturned ? '#7e22ce' : '#047857',
                        border: isReturned ? '1px solid #d8b4fe' : '1px solid #a7f3d0',
                        fontSize: '0.78rem',
                        fontWeight: '800'
                      }}>
                        {isReturned ? <RotateCcw size={14} /> : <CheckCircle size={14} />}
                        {isReturned ? 'مرتجعة (تم الإرجاع)' : 'مكتملة'}
                      </span>
                    </td>

                    <td style={{ padding: '0.85rem 1rem', textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', gap: '0.4rem', justifyContent: 'flex-end' }}>
                        {onReprintReceipt && (
                          <button
                            onClick={() => onReprintReceipt(order)}
                            style={{
                              padding: '0.4rem 0.75rem',
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
                            <Printer size={15} /> طباعة
                          </button>
                        )}

                        {onReturnOrder && !isReturned && (
                          <button
                            onClick={() => setReturnOrderModal(order)}
                            style={{
                              padding: '0.4rem 0.75rem',
                              borderRadius: '8px',
                              background: '#fef2f2',
                              border: '1px solid #fecaca',
                              color: '#b91c1c',
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.35rem',
                              fontSize: '0.82rem',
                              fontWeight: '800',
                              fontFamily: "'Cairo', sans-serif"
                            }}
                            title="إرجاع الفاتورة وإعادة القطع للمخزون"
                          >
                            <RotateCcw size={15} /> إرجاع
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Return Order Modal */}
      {returnOrderModal && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '540px', background: '#ffffff', borderRadius: '24px', padding: '1.75rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', borderBottom: '1px solid #f1f5f9', paddingBottom: '0.85rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: '#fef2f2', border: '1px solid #fecaca', color: '#b91c1c', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <RotateCcw size={20} />
                </div>
                <div>
                  <h3 style={{ fontSize: '1.15rem', fontWeight: '900', color: '#0f172a', margin: 0 }}>
                    إرجاع الفاتورة {returnOrderModal.id} 📦
                  </h3>
                  <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '0.15rem' }}>
                    سيتم استرداد المبلغ وإعادة إضافة جميع قطع الفاتورة تلقائياً لقاعدة بيانات المخزون.
                  </div>
                </div>
              </div>
              <button onClick={() => setReturnOrderModal(null)} style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer' }}>
                <X size={22} />
              </button>
            </div>

            {/* Items Summary in Modal */}
            <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '14px', padding: '1rem', marginBottom: '1.25rem' }}>
              <div style={{ fontSize: '0.82rem', fontWeight: '800', color: '#475569', marginBottom: '0.5rem' }}>
                القطع التي سيتم إعادة إضافتها للمخزون:
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', maxHeight: '180px', overflowY: 'auto' }}>
                {(returnOrderModal.items || []).map((item, idx) => (
                  <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#ffffff', border: '1px solid #cbd5e1', padding: '0.5rem 0.85rem', borderRadius: '8px', fontSize: '0.85rem' }}>
                    <div style={{ fontWeight: '800', color: '#0f172a' }}>{item.arName || item.name}</div>
                    <div style={{ color: '#047857', fontWeight: '900' }}>+{item.qty || 1} قطعة للمخزون 📦</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Reason Input */}
            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ fontSize: '0.82rem', fontWeight: '800', color: '#475569', marginBottom: '0.4rem', display: 'block' }}>
                سبب الإرجاع:
              </label>
              <input
                type="text"
                value={returnReason}
                onChange={e => setReturnReason(e.target.value)}
                placeholder="مثال: قطة غيار خاطئة من العميل / استبدال"
                style={{ width: '100%', padding: '0.75rem 1rem', borderRadius: '10px', border: '1.5px solid #cbd5e1', fontSize: '0.9rem', outline: 'none', fontWeight: '700', fontFamily: "'Cairo', sans-serif" }}
              />
            </div>

            {/* Buttons */}
            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
              <button onClick={() => setReturnOrderModal(null)} className="btn-sand" style={{ padding: '0.65rem 1.25rem', fontWeight: '800' }}>
                إلغاء
              </button>
              <button
                onClick={handleConfirmReturn}
                disabled={isSubmittingReturn}
                style={{ padding: '0.65rem 1.5rem', background: '#b91c1c', color: '#ffffff', border: 'none', borderRadius: '10px', fontWeight: '800', cursor: 'pointer', fontFamily: "'Cairo', sans-serif", display: 'flex', alignItems: 'center', gap: '0.4rem' }}
              >
                <RotateCcw size={16} />
                {isSubmittingReturn ? 'جاري الإرجاع والتحديث...' : 'تأكيد الإرجاع وإعادة للمخزون 🔄'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
