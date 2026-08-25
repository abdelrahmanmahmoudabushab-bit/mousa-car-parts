import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { Search, ShoppingCart, Trash2, Plus, Minus, MapPin, Car, Camera } from 'lucide-react';
import VinLookupBar from './VinLookupBar';
import QrScannerModal from './QrScannerModal';
import { matchProductSearch, parseSmartSerialNumber, normalizeSearchCode } from '../utils/documentParser';

export default function POSTerminal({ products, categories, onOpenPayment, lang }) {
  const [search, setSearch] = useState('');
  const [selectedCat, setSelectedCat] = useState('all');
  const [selectedModel, setSelectedModel] = useState('all');
  const [selectedYear, setSelectedYear] = useState('all');
  const [cart, setCart] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [mobilePosTab, setMobilePosTab] = useState('catalog');
  const [isPosScannerOpen, setIsPosScannerOpen] = useState(false);
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

    // Fast Cashier POS: Require search query, category filter, or model filter to render items
    if (!q && selectedCat === 'all' && modelQ === 'all' && yearQ === 'all') {
      return [];
    }

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
    const availableStock = Number(product.quantity || 0);
    if (availableStock <= 0) {
      alert(`⚠️ ${lang === 'ar' ? 'عفواً، هذه القطعة غير متوفرة حالياً في المخزون (0 قطعة)!' : `Part ${product.oem} is currently Out of Stock!`}`);
      return;
    }

    setCart(prev => {
      const existing = prev.find(item => item.id === product.id);
      const currentCartQty = existing ? existing.qty : 0;
      if (currentCartQty >= availableStock) {
        alert(`⚠️ ${lang === 'ar' ? `لا يمكن إضافة المزيد — الكمية المتوفرة في المخزون هي ${availableStock} قطعة فقط!` : `Cannot add more — only ${availableStock} unit(s) of ${product.oem} in stock.`}`);
        return prev;
      }
      if (existing) {
        return prev.map(item => item.id === product.id ? { ...item, qty: item.qty + 1 } : item);
      } else {
        return [...prev, { ...product, qty: 1 }];
      }
    });
  }, [lang]);

  const updateQty = useCallback((id, delta) => {
    setCart(prev =>
      prev
        .map(item => {
          if (item.id === id) {
            const availableStock = Number(item.quantity || 0);
            const newQty = item.qty + delta;
            if (delta > 0 && newQty > availableStock) {
              alert(`⚠️ ${lang === 'ar' ? `الحد الأقصى للكمية المتاحة في المخزون لهذه القطعة هو ${availableStock} قطعة فقط!` : `Maximum available stock for this part is ${availableStock} units!`}`);
              return item;
            }
            return newQty > 0 ? { ...item, qty: newQty } : null;
          }
          return item;
        })
        .filter(Boolean)
    );
  }, [lang]);

  const removeFromCart = useCallback((id) => {
    setCart(prev => prev.filter(item => item.id !== id));
  }, []);

  const handleDirectBarcodeScan = useCallback((code) => {
    if (!code) return;
    const cleanSerial = parseSmartSerialNumber(code) || String(code).trim();
    const cleanCode = normalizeSearchCode(cleanSerial);

    // Smart Match: compare normalized serials ignoring hyphens, spaces, and slashes
    const exactMatch = products.find(p => {
      const oemClean = normalizeSearchCode(p.oem);
      const skuClean = normalizeSearchCode(p.sku);
      const idClean = normalizeSearchCode(p.id);

      return (
        (cleanCode && oemClean === cleanCode) ||
        (cleanCode && skuClean === cleanCode) ||
        (cleanCode && idClean === cleanCode) ||
        (cleanCode.length >= 5 && (oemClean.includes(cleanCode) || skuClean.includes(cleanCode)))
      );
    });

    if (exactMatch) {
      addToCart(exactMatch);
      setMobilePosTab('cart');
    } else {
      setSearch(cleanSerial);
    }
  }, [products, addToCart]);


  const { subtotal, tax, total } = useMemo(() => {
    const sub = cart.reduce((acc, item) => acc + item.unitPrice * item.qty, 0);
    const tx = sub * 0.08;
    return { subtotal: sub, tax: tx, total: sub + tx };
  }, [cart]);

  const totalCartItemsCount = useMemo(() => cart.reduce((acc, i) => acc + i.qty, 0), [cart]);

  const handleCheckoutClick = () => {
    if (cart.length === 0) return;
    onOpenPayment({ cart, totals: { subtotal, tax, total } });
  };

  return (
    <div className="pos-grid" style={{ display: 'flex', flexDirection: 'column', width: '100%' }}>
      
      {/* Mobile Tab Switcher Bar (< 900px) */}
      <div className="mobile-only" style={{ padding: '0.5rem 0.75rem', background: '#ffffff', borderBottom: '1px solid #e2e8f0', gap: '0.5rem', width: '100%' }}>
        <button
          onClick={() => setMobilePosTab('catalog')}
          style={{
            flex: 1,
            padding: '0.6rem',
            borderRadius: '10px',
            background: mobilePosTab === 'catalog' ? '#0f172a' : '#f8fafc',
            color: mobilePosTab === 'catalog' ? '#ffffff' : '#475569',
            border: mobilePosTab === 'catalog' ? '1px solid #0f172a' : '1px solid #cbd5e1',
            fontWeight: '800',
            fontSize: '0.85rem',
            fontFamily: "'Cairo', sans-serif",
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.4rem'
          }}
        >
          <Search size={16} />
          {lang === 'ar' ? '🔍 الكتالوج والبحث' : '🔍 Catalog'}
        </button>

        <button
          onClick={() => setMobilePosTab('cart')}
          style={{
            flex: 1,
            padding: '0.6rem',
            borderRadius: '10px',
            background: mobilePosTab === 'cart' ? '#d97706' : '#f8fafc',
            color: mobilePosTab === 'cart' ? '#ffffff' : '#475569',
            border: mobilePosTab === 'cart' ? '1px solid #d97706' : '1px solid #cbd5e1',
            fontWeight: '800',
            fontSize: '0.85rem',
            fontFamily: "'Cairo', sans-serif",
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.4rem',
            position: 'relative'
          }}
        >
          <ShoppingCart size={16} />
          {lang === 'ar' ? `🛒 الفاتورة (${totalCartItemsCount})` : `🛒 Cart (${totalCartItemsCount})`}
        </button>
      </div>

      {/* Main Responsive Container */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 380px', flex: 1, width: '100%', overflow: 'hidden' }} className="pos-layout-responsive">
        
        {/* Left Catalog View */}
        <div className="catalog-section" style={{ display: mobilePosTab === 'catalog' ? 'flex' : undefined }}>

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
              background: selectedCat === 'all' ? '#d97706' : '#ffffff',
              color: selectedCat === 'all' ? '#ffffff' : '#0f172a',
              border: selectedCat === 'all' ? '1px solid #d97706' : '1px solid #cbd5e1',
              fontWeight: '800',
              fontSize: '0.85rem',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              fontFamily: "'Cairo', sans-serif",
              boxShadow: selectedCat === 'all' ? '0 4px 12px rgba(217, 119, 6, 0.25)' : 'none'
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
                background: selectedCat === cat.id ? '#d97706' : '#ffffff',
                color: selectedCat === cat.id ? '#ffffff' : '#0f172a',
                border: selectedCat === cat.id ? '1px solid #d97706' : '1px solid #cbd5e1',
                fontWeight: '800',
                fontSize: '0.85rem',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                fontFamily: "'Cairo', sans-serif",
                boxShadow: selectedCat === cat.id ? '0 4px 12px rgba(217, 119, 6, 0.25)' : 'none'
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
              <span style={{ fontSize: '0.85rem', fontWeight: '800', padding: '0 0.4rem', color: '#d97706', fontFamily: "'Cairo', sans-serif" }}>
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

        {/* Clean Search Prompt Hero or Product Results */}
        {currentProducts.length === 0 ? (
          <div style={{ background: '#ffffff', border: '2px dashed #cbd5e1', borderRadius: '20px', padding: '3rem 2rem', textAlign: 'center', margin: '1rem 0', boxShadow: '0 4px 20px rgba(15, 23, 42, 0.03)' }}>
            <div style={{ width: '70px', height: '70px', borderRadius: '50%', background: '#fef3c7', color: '#d97706', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.25rem auto' }}>
              <Search size={34} />
            </div>

            <h3 style={{ fontSize: '1.35rem', color: '#0f172a', fontWeight: '900', marginBottom: '0.5rem', fontFamily: "'Cairo', sans-serif" }}>
              {!search.trim() ? 'شاشة الكاشير السريعة · ابحث عن قطعة غيار 🔍' : `لا توجد نتائج مطابقة لـ "${search}"`}
            </h3>

            <p style={{ color: '#64748b', fontSize: '0.95rem', maxWidth: '520px', margin: '0 auto', lineHeight: '1.6', fontFamily: "'Cairo', sans-serif" }}>
              {!search.trim() 
                ? 'استخدم شريط البحث الأكبر أعلاه لإدخال اسم القطعة، كود OEM، رقم الشاسي VIN، أو مسح الباركوم بالكاميرا لإظهار القطع وإضافتها للفاتورة مباشرة.' 
                : 'تأكد من كود القطعة OEM أو جرب البحث بكلمات عامة مثل (باب، صدام، شمعة).'}
            </p>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '1rem' }}>
            {currentProducts.map(product => (
              <div
                key={product.id}
                className="glow-card"
                onClick={() => addToCart(product)}
                style={{
                  background: '#ffffff',
                  border: '1px solid #e2e8f0',
                  borderRadius: '12px',
                  padding: '1.1rem',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  cursor: 'pointer'
                }}
              >
                <div>
                  <div style={{ fontSize: '0.78rem', fontFamily: 'var(--font-mono)', fontWeight: '800', color: '#d97706', marginBottom: '0.35rem' }}>
                    {product.oem}
                  </div>
                  <div style={{ fontSize: '0.95rem', fontWeight: '800', lineHeight: '1.35', color: '#0f172a', fontFamily: "'Cairo', sans-serif" }}>
                    {(!product.arName || product.arName.trim() === '()' || product.arName.trim() === 'أصلي ( أصلي )') ? 'قطع غيار أصلي المصنع' : product.arName}
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.75rem', color: '#64748b', marginTop: '0.5rem', fontWeight: '600' }}>
                    <MapPin size={13} style={{ color: '#d97706' }} />
                    <span>{product.location}</span>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '0.85rem', paddingTop: '0.65rem', borderTop: '1px solid #f1f5f9' }}>
                  <div>
                    <div style={{ fontFamily: "'Cairo', sans-serif", fontSize: '1.2rem', fontWeight: '800', color: '#0f172a' }}>
                      ${(Number(product.unitPrice) || 0).toFixed(2)}
                    </div>
                    <div style={{ fontSize: '0.74rem', color: (Number(product.quantity || 0) <= 0 || product.quantity <= product.minLevel) ? '#b91c1c' : '#475569', fontWeight: '800', fontFamily: "'Cairo', sans-serif" }}>
                      {Number(product.quantity || 0) <= 0 ? 'غير متوفر بالمخزون ⚠️ (0 قطعة)' : `المتوفر: ${product.quantity} قطعة`}
                    </div>
                  </div>
                  <button
                    disabled={Number(product.quantity || 0) <= 0}
                    style={{
                      width: '36px',
                      height: '36px',
                      borderRadius: '10px',
                      background: Number(product.quantity || 0) <= 0 ? '#cbd5e1' : '#0f172a',
                      border: 'none',
                      color: Number(product.quantity || 0) <= 0 ? '#94a3b8' : 'white',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: Number(product.quantity || 0) <= 0 ? 'not-allowed' : 'pointer',
                      boxShadow: Number(product.quantity || 0) <= 0 ? 'none' : '0 4px 10px rgba(15, 23, 42, 0.25)'
                    }}
                  >
                    <Plus size={18} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Right Cart Section */}
      <div className="cart-section" style={{ background: '#ffffff', borderRadius: '16px', border: '1px solid #e2e8f0', display: mobilePosTab === 'cart' ? 'flex' : undefined }}>
        <div style={{ padding: '1.1rem 1.25rem', borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#f8fafc', borderTopLeftRadius: '16px', borderTopRightRadius: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.55rem' }}>
            <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: '#fffbeb', color: '#d97706', border: '1px solid #fde68a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <ShoppingCart size={18} />
            </div>
            <h3 style={{ fontSize: '1.05rem', fontWeight: '800', color: '#0f172a', fontFamily: "'Cairo', sans-serif" }}>فاتورة البيع الحالية 🛒</h3>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <button
              onClick={() => setIsPosScannerOpen(true)}
              style={{ background: '#fffbeb', border: '1px solid #fde68a', color: '#b45309', padding: '0.35rem 0.65rem', borderRadius: '8px', cursor: 'pointer', fontSize: '0.78rem', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '0.3rem' }}
              title="Scan part barcode with camera"
            >
              <Camera size={14} /> مسح الكاميرا 📷
            </button>

            {cart.length > 0 && (
              <button onClick={() => setCart([])} style={{ background: 'transparent', border: 'none', color: '#b91c1c', fontSize: '0.82rem', fontWeight: '700', cursor: 'pointer', fontFamily: "'Cairo', sans-serif" }}>
                مسح الفاتورة
              </button>
            )}
          </div>
        </div>

        {isPosScannerOpen && (
          <QrScannerModal
            onClose={() => setIsPosScannerOpen(false)}
            onScanSuccess={handleDirectBarcodeScan}
            title="إضافة قطعة للفاتورة عبر مسح الباركود 📷"
          />
        )}

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
                <div style={{ fontSize: '0.75rem', color: '#d97706', fontFamily: 'var(--font-mono)', fontWeight: '700' }}>OEM: {item.oem}</div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.35rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <button onClick={() => updateQty(item.id, -1)} style={{ width: '28px', height: '28px', borderRadius: '6px', background: '#e2e8f0', border: 'none', color: '#0f172a', fontWeight: 'bold', cursor: 'pointer' }}>-</button>
                    <span style={{ fontWeight: '800', fontSize: '0.95rem', width: '24px', textAlign: 'center', color: '#0f172a' }}>{item.qty}</span>
                    <button onClick={() => updateQty(item.id, 1)} style={{ width: '28px', height: '28px', borderRadius: '6px', background: '#e2e8f0', border: 'none', color: '#0f172a', fontWeight: 'bold', cursor: 'pointer' }}>+</button>
                  </div>
                  <div style={{ fontWeight: '800', color: '#0f172a', fontSize: '1.05rem', fontFamily: 'var(--font-mono)' }}>
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
            <span style={{ color: '#d97706' }}>${(Number(total) || 0).toFixed(2)}</span>
          </div>

          <button
            onClick={handleCheckoutClick}
            disabled={cart.length === 0}
            className="btn-primary"
            style={{ width: '100%', padding: '0.9rem', fontSize: '1rem', marginTop: '0.5rem', fontWeight: '800', fontFamily: "'Cairo', sans-serif", background: '#0f172a', border: '1px solid #0f172a', opacity: cart.length === 0 ? 0.5 : 1 }}
          >
            إتمام البيع والدفع النقدي (${(Number(total) || 0).toFixed(2)})
          </button>
        </div>
      </div>
    </div>
  </div>
);
}
