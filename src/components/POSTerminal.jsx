import React, { useState, useMemo, useCallback } from 'react';
import { Search, ShoppingCart, Trash2, Plus, Minus, MapPin, Car } from 'lucide-react';
import VinLookupBar from './VinLookupBar';
import { matchProductSearch } from '../utils/documentParser';

export default function POSTerminal({ products, categories, onOpenPayment, lang }) {
  const [search, setSearch] = useState('');
  const [selectedCat, setSelectedCat] = useState('all');
  const [selectedModel, setSelectedModel] = useState('all');
  const [selectedYear, setSelectedYear] = useState('all');
  const [cart, setCart] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 40;

  // Reset to page 1 whenever filters change
  const handleFilterChange = (setter, val) => {
    setter(val);
    setCurrentPage(1);
  };

  const filteredProducts = useMemo(() => {
    const q = search.trim();
    const modelQ = selectedModel;
    const yearQ = selectedYear;

    return products.filter(p => {
      const matchesCat = selectedCat === 'all' || p.categoryId === selectedCat;
      if (!matchesCat) return false;

      // Model Filter
      if (modelQ !== 'all') {
        const modelStr = (p.vehicleModel || '').toLowerCase();
        const compArr = (p.compatibleModels || []).map(m => m.toLowerCase());
        const targetM = modelQ.toLowerCase();
        if (!modelStr.includes(targetM) && !compArr.some(m => m.includes(targetM))) {
          return false;
        }
      }

      // Year Filter
      if (yearQ !== 'all') {
        const yearStr = p.yearRange || '2023 - 2026';
        if (!yearStr.includes(yearQ)) return false;
      }

      if (!q) return true;
      return matchProductSearch(p, q);
    });
  }, [products, selectedCat, search, selectedModel, selectedYear]);

  const totalPages = Math.ceil(filteredProducts.length / ITEMS_PER_PAGE) || 1;
  const currentProducts = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredProducts.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredProducts, currentPage]);

  const addToCart = useCallback((product) => {
    if (product.quantity <= 0) {
      alert(`Part ${product.oem} is currently Out of Stock!`);
      return;
    }

    setCart(prev => {
      const existing = prev.find(item => item.id === product.id);
      const currentCartQty = existing ? existing.qty : 0;
      if (currentCartQty >= product.quantity) {
        alert(`Cannot add more — only ${product.quantity} unit(s) of ${product.oem} in stock.`);
        return prev;
      }
      if (existing) {
        return prev.map(item => item.id === product.id ? { ...item, qty: item.qty + 1 } : item);
      } else {
        return [...prev, { ...product, qty: 1 }];
      }
    });
  }, []);

  const updateQty = useCallback((id, delta) => {
    setCart(prev =>
      prev
        .map(item => {
          if (item.id === id) {
            const newQty = item.qty + delta;
            return newQty > 0 ? { ...item, qty: newQty } : null;
          }
          return item;
        })
        .filter(Boolean)
    );
  }, []);

  const removeFromCart = useCallback((id) => {
    setCart(prev => prev.filter(item => item.id !== id));
  }, []);

  const { subtotal, tax, total } = useMemo(() => {
    const sub = cart.reduce((acc, item) => acc + item.unitPrice * item.qty, 0);
    const tx = sub * 0.08;
    return { subtotal: sub, tax: tx, total: sub + tx };
  }, [cart]);

  const handleCheckoutClick = () => {
    if (cart.length === 0) return;
    onOpenPayment({ cart, totals: { subtotal, tax, total } });
  };

  return (
    <div className="pos-grid">
      {/* Left Catalog View */}
      <div className="catalog-section">
        {/* Unified Search & Vehicle Compatibility Bar */}
        <VinLookupBar 
          searchVal={search}
          onSearchChange={(val) => handleFilterChange(setSearch, val)}
          onSearchSubmit={() => setCurrentPage(1)}
          selectedModel={selectedModel}
          onModelChange={(val) => handleFilterChange(setSelectedModel, val)}
          selectedYear={selectedYear}
          onYearChange={(val) => handleFilterChange(setSelectedYear, val)}
          matchedCount={filteredProducts.length}
          totalCount={products.length}
        />

        {/* Categories Bar */}
        <div style={{ display: 'flex', gap: '0.5rem', overflowX: 'auto', paddingBottom: '0.25rem' }}>
          <button
            onClick={() => handleFilterChange(setSelectedCat, 'all')}
            style={{
              padding: '0.55rem 1.1rem',
              borderRadius: '10px',
              background: selectedCat === 'all' ? '#2563eb' : '#ffffff',
              color: selectedCat === 'all' ? '#ffffff' : '#475569',
              border: selectedCat === 'all' ? '1px solid #2563eb' : '1px solid #cbd5e1',
              fontWeight: '800',
              fontSize: '0.85rem',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              fontFamily: "'Cairo', sans-serif",
              boxShadow: selectedCat === 'all' ? '0 4px 12px rgba(37, 99, 235, 0.25)' : 'none'
            }}
          >
            جميع قطع الغيار ({products.length})
          </button>
          {categories.map(cat => (
            <button
              key={cat.id}
              onClick={() => handleFilterChange(setSelectedCat, cat.id)}
              style={{
                padding: '0.55rem 1.1rem',
                borderRadius: '10px',
                background: selectedCat === cat.id ? '#2563eb' : '#ffffff',
                color: selectedCat === cat.id ? '#ffffff' : '#475569',
                border: selectedCat === cat.id ? '1px solid #2563eb' : '1px solid #cbd5e1',
                fontWeight: '800',
                fontSize: '0.85rem',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                fontFamily: "'Cairo', sans-serif",
                boxShadow: selectedCat === cat.id ? '0 4px 12px rgba(37, 99, 235, 0.25)' : 'none'
              }}
            >
              {cat.name}
            </button>
          ))}
        </div>

        {/* Pagination Toolbar */}
        {totalPages > 1 && (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '0.5rem 1rem', boxShadow: '0 2px 6px rgba(15, 23, 42, 0.03)' }}>
            <span style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: '600', fontFamily: "'Cairo', sans-serif" }}>
              عرض <strong style={{ color: '#0f172a' }}>{((currentPage - 1) * ITEMS_PER_PAGE) + 1} - {Math.min(currentPage * ITEMS_PER_PAGE, filteredProducts.length)}</strong> من أصل {filteredProducts.length} قطعة
            </span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <button
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                style={{ padding: '0.35rem 0.85rem', borderRadius: '8px', border: '1px solid #cbd5e1', background: currentPage === 1 ? '#f1f5f9' : '#ffffff', color: currentPage === 1 ? '#94a3b8' : '#0f172a', cursor: currentPage === 1 ? 'default' : 'pointer', fontSize: '0.82rem', fontWeight: '800', fontFamily: "'Cairo', sans-serif" }}
              >
                ◀ السابق
              </button>
              <span style={{ fontSize: '0.85rem', fontWeight: '800', padding: '0 0.4rem', color: '#2563eb', fontFamily: "'Cairo', sans-serif" }}>
                صفحة {currentPage} من {totalPages}
              </span>
              <button
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                style={{ padding: '0.35rem 0.85rem', borderRadius: '8px', border: '1px solid #cbd5e1', background: currentPage === totalPages ? '#f1f5f9' : '#ffffff', color: currentPage === totalPages ? '#94a3b8' : '#0f172a', cursor: currentPage === totalPages ? 'default' : 'pointer', fontSize: '0.82rem', fontWeight: '800', fontFamily: "'Cairo', sans-serif" }}
              >
                التالي ▶
              </button>
            </div>
          </div>
        )}

        {/* Product Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '1rem' }}>
          {currentProducts.map(product => (
            <div
              key={product.id}
              onClick={() => addToCart(product)}
              style={{
                background: '#ffffff',
                border: '1px solid #e2e8f0',
                borderRadius: '16px',
                padding: '1.1rem',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                cursor: 'pointer',
                boxShadow: '0 4px 14px -2px rgba(15, 23, 42, 0.05)',
                transition: 'transform 0.15s ease, border-color 0.15s ease'
              }}
            >
              <div>
                <div style={{ fontSize: '0.78rem', fontFamily: 'var(--font-mono)', fontWeight: '800', color: '#2563eb', marginBottom: '0.35rem' }}>
                  {product.oem}
                </div>
                <div style={{ fontSize: '0.95rem', fontWeight: '800', lineHeight: '1.35', color: '#0f172a', fontFamily: "'Cairo', sans-serif" }}>
                  {product.arName || product.name}
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.75rem', color: '#64748b', marginTop: '0.5rem', fontWeight: '600' }}>
                  <MapPin size={13} style={{ color: '#2563eb' }} />
                  <span>{product.location}</span>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '0.85rem', paddingTop: '0.65rem', borderTop: '1px solid #f1f5f9' }}>
                <div>
                  <div style={{ fontFamily: 'var(--font-heading)', fontSize: '1.2rem', fontWeight: '800', color: '#2563eb' }}>
                    ${(Number(product.unitPrice) || 0).toFixed(2)}
                  </div>
                  <div style={{ fontSize: '0.74rem', color: product.quantity <= product.minLevel ? '#b91c1c' : '#475569', fontWeight: '700', fontFamily: "'Cairo', sans-serif" }}>
                    المتوفر: {product.quantity} قطعة
                  </div>
                </div>
                <button
                  style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '10px',
                    background: '#2563eb',
                    border: 'none',
                    color: 'white',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    boxShadow: '0 4px 10px rgba(37, 99, 235, 0.3)'
                  }}
                >
                  <Plus size={18} />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Right Cart Section */}
      <div className="cart-section" style={{ background: '#ffffff', borderRadius: '16px', border: '1px solid #e2e8f0' }}>
        <div style={{ padding: '1.1rem 1.25rem', borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#f8fafc', borderTopLeftRadius: '16px', borderTopRightRadius: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.55rem' }}>
            <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: '#eff6ff', color: '#2563eb', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <ShoppingCart size={18} />
            </div>
            <h3 style={{ fontSize: '1.05rem', fontWeight: '800', color: '#0f172a', fontFamily: "'Cairo', sans-serif" }}>فاتورة البيع الحالية 🛒</h3>
          </div>
          {cart.length > 0 && (
            <button onClick={() => setCart([])} style={{ background: 'transparent', border: 'none', color: '#b91c1c', fontSize: '0.82rem', fontWeight: '700', cursor: 'pointer', fontFamily: "'Cairo', sans-serif" }}>
              مسح الفاتورة
            </button>
          )}
        </div>

        {/* Cart Items */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {cart.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '4rem 1rem', color: '#94a3b8' }}>
              <ShoppingCart size={48} style={{ opacity: 0.2, marginBottom: '0.85rem' }} />
              <div style={{ fontWeight: '800', color: '#0f172a', fontSize: '1rem', fontFamily: "'Cairo', sans-serif" }}>سلة البيع فارغة</div>
              <div style={{ fontSize: '0.82rem', marginTop: '0.35rem', color: '#64748b', fontFamily: "'Cairo', sans-serif" }}>اضغط على أي قطعة من الكتالوج لإضافتها للفاتورة</div>
            </div>
          ) : (
            cart.map(item => (
              <div key={item.id} style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '0.85rem', display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div style={{ fontWeight: '800', fontSize: '0.9rem', color: '#0f172a', fontFamily: "'Cairo', sans-serif" }}>
                    {item.arName || item.name}
                  </div>
                  <button onClick={() => removeFromCart(item.id)} style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer' }}>
                    <Trash2 size={15} />
                  </button>
                </div>
                <div style={{ fontSize: '0.75rem', color: '#2563eb', fontFamily: 'var(--font-mono)', fontWeight: '700' }}>OEM: {item.oem}</div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.35rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <button onClick={() => updateQty(item.id, -1)} style={{ width: '28px', height: '28px', borderRadius: '6px', background: '#e2e8f0', border: 'none', color: '#0f172a', fontWeight: 'bold', cursor: 'pointer' }}>-</button>
                    <span style={{ fontWeight: '800', fontSize: '0.95rem', width: '24px', textAlign: 'center', color: '#0f172a' }}>{item.qty}</span>
                    <button onClick={() => updateQty(item.id, 1)} style={{ width: '28px', height: '28px', borderRadius: '6px', background: '#e2e8f0', border: 'none', color: '#0f172a', fontWeight: 'bold', cursor: 'pointer' }}>+</button>
                  </div>
                  <div style={{ fontWeight: '800', color: '#2563eb', fontSize: '1.05rem', fontFamily: 'var(--font-mono)' }}>
                    ${(Number(item.unitPrice || item.price || 0) * item.qty).toFixed(2)}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Totals & Pay */}
        <div style={{ padding: '1.25rem', borderTop: '1px solid #e2e8f0', background: '#ffffff', display: 'flex', flexDirection: 'column', gap: '0.65rem', borderBottomLeftRadius: '16px', borderBottomRightRadius: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.88rem', color: '#64748b', fontFamily: "'Cairo', sans-serif", fontWeight: '600' }}>
            <span>المجموع الفرعي:</span>
            <span style={{ color: '#0f172a', fontWeight: '800' }}>${(Number(subtotal) || 0).toFixed(2)}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.88rem', color: '#64748b', fontFamily: "'Cairo', sans-serif", fontWeight: '600' }}>
            <span>الضريبة (8%):</span>
            <span style={{ color: '#0f172a', fontWeight: '800' }}>${(Number(tax) || 0).toFixed(2)}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1.25rem', fontWeight: '800', borderTop: '1px dashed #cbd5e1', paddingTop: '0.65rem', fontFamily: "'Cairo', sans-serif" }}>
            <span style={{ color: '#0f172a' }}>المبلغ الإجمالي النهائي:</span>
            <span style={{ color: '#2563eb' }}>${(Number(total) || 0).toFixed(2)}</span>
          </div>

          <button
            onClick={handleCheckoutClick}
            disabled={cart.length === 0}
            className="btn-primary"
            style={{ width: '100%', padding: '0.9rem', fontSize: '1rem', marginTop: '0.5rem', fontWeight: '800', fontFamily: "'Cairo', sans-serif", opacity: cart.length === 0 ? 0.5 : 1 }}
          >
            إتمام البيع والدفع النقدي (${(Number(total) || 0).toFixed(2)})
          </button>
        </div>
      </div>
    </div>
  );
}
