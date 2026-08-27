import React, { useState, useMemo } from 'react';
import { Search, Car, ShoppingBag, CheckCircle, MapPin, Truck, Phone, User, ShieldCheck, ChevronRight, X, Filter, RotateCcw, Layers } from 'lucide-react';

export default function CustomerStore({ products = [], lang = 'en', onPlaceOrder }) {
  const [searchVal, setSearchVal] = useState('');
  const [selectedModel, setSelectedModel] = useState('ALL');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  
  // Shopping Cart & Order Modal state
  const [cart, setCart] = useState([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [deliveryMethod, setDeliveryMethod] = useState('pickup');
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [completedOrder, setCompletedOrder] = useState(null);

  // Vehicle Models Options
  const vehicles = [
    { id: 'ALL', name: 'All Models', arName: 'جميع الموديلات' },
    { id: 'BYD Seagull', name: 'BYD Seagull', arName: 'سيجول' },
    { id: 'BYD Dolphin', name: 'BYD Dolphin', arName: 'دولفين' },
    { id: 'BYD Atto 3', name: 'BYD Atto 3', arName: 'أتو 3' },
    { id: 'BYD Tang', name: 'BYD Tang', arName: 'تانج' },
    { id: 'BYD Han', name: 'BYD Han', arName: 'هان' }
  ];

  // Category Filter Options
  const categories = [
    { id: 'ALL', name: 'All Categories', arName: 'جميع الأقسام' },
    { id: 'cat-body', name: 'Body & Bumper', arName: 'المصدات والأبواب' },
    { id: 'cat-engine', name: 'Motor & Cooling', arName: 'المحرك والفلاتر' },
    { id: 'cat-brakes', name: 'Brakes & Discs', arName: 'الفحمات والهوبات' },
    { id: 'cat-suspension', name: 'Steering & Axles', arName: 'الدركسون والعكوس' }
  ];

  const hasActiveSearch = searchVal.trim().length > 0 || selectedModel !== 'ALL' || selectedCategory !== 'ALL';

  // Filter products ONLY when search term or filters are active
  const filteredProducts = useMemo(() => {
    if (!hasActiveSearch) return [];

    const term = searchVal.trim().toLowerCase();
    return products.filter(p => {
      if (selectedModel !== 'ALL' && p.vehicleModel !== selectedModel) return false;
      if (selectedCategory !== 'ALL' && p.categoryId !== selectedCategory) return false;
      if (!term) return true;
      const oem = (p.oem || p.sku || '').toLowerCase();
      const name = (p.name || '').toLowerCase();
      const arName = (p.arName || '').toLowerCase();
      const cnName = (p.cnName || '').toLowerCase();

      return oem.includes(term) || name.includes(term) || arName.includes(term) || cnName.includes(term);
    });
  }, [products, searchVal, selectedModel, selectedCategory, hasActiveSearch]);

  // Reset filters
  const handleResetFilters = () => {
    setSearchVal('');
    setSelectedModel('ALL');
    setSelectedCategory('ALL');
  };

  // Cart operations
  const addToCart = (product) => {
    const availableStock = Number(product.quantity || 0);
    if (availableStock <= 0) {
      alert(lang === 'ar' ? '⚠️ هذه القطعة غير متوفرة حالياً بالمخزون' : '⚠️ This part is currently Out of Stock.');
      return;
    }

    setCart(prev => {
      const existing = prev.find(item => item.id === product.id);
      const currentQty = existing ? existing.qty : 0;
      if (currentQty >= availableStock) {
        alert(lang === 'ar' ? `⚠️ لا يمكن إضافة المزيد — الكمية المتاحة بالمخزون هي ${availableStock} فقط` : `⚠️ Only ${availableStock} unit(s) available in stock.`);
        return prev;
      }
      if (existing) {
        return prev.map(item => item.id === product.id ? { ...item, qty: item.qty + 1 } : item);
      }
      return [...prev, { ...product, qty: 1 }];
    });
    setIsCartOpen(true);
  };

  const updateCartQty = (id, delta) => {
    setCart(prev => prev.map(item => {
      if (item.id === id) {
        const availableStock = Number(item.quantity || 0);
        const newQty = item.qty + delta;
        if (delta > 0 && newQty > availableStock) {
          alert(lang === 'ar' ? `⚠️ الحد الأقصى للكمية المتاحة بالمخزون هو ${availableStock} قطعة` : `⚠️ Maximum available stock is ${availableStock} units.`);
          return item;
        }
        return newQty > 0 ? { ...item, qty: newQty } : null;
      }
      return item;
    }).filter(Boolean));
  };

  const cartTotal = cart.reduce((sum, item) => sum + (Number(item.unitPrice || 0) * item.qty), 0);

  // Submit Order
  const handleSubmitOrder = async (e) => {
    e.preventDefault();
    if (!customerName || !customerPhone || cart.length === 0) return;

    setIsSubmitting(true);
    try {
      const orderPayload = {
        customerName,
        customerPhone,
        deliveryMethod,
        deliveryAddress: deliveryMethod === 'delivery' ? deliveryAddress : 'In-Store Express Pickup',
        source: 'Online Customer Store',
        items: cart.map(item => ({
          productId: item.id,
          oem: item.oem,
          name: item.arName || item.name,
          unitPrice: Number(item.unitPrice || 0),
          qty: item.qty
        })),
        totalAmount: cartTotal,
        status: 'Pending Pickup / Confirmation'
      };

      if (onPlaceOrder) {
        const res = await onPlaceOrder(orderPayload);
        setCompletedOrder(res || orderPayload);
      } else {
        const response = await fetch('/api/orders', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(orderPayload)
        });
        const data = await response.json();
        setCompletedOrder(data.order || orderPayload);
      }

      setCart([]);
      setCustomerName('');
      setCustomerPhone('');
      setDeliveryAddress('');
    } catch (err) {
      console.error('Failed to submit order:', err);
      alert('Order submission error. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div style={{ flex: 1, padding: '2rem 1.5rem', maxWidth: '1200px', width: '100%', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      
      {/* Top Floating Cart Banner Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#ffffff', border: '1px solid var(--border-color)', borderRadius: '16px', padding: '0.85rem 1.25rem', boxShadow: 'var(--shadow-sm)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', fontSize: '0.88rem', fontWeight: '700', color: '#0f172a' }}>
          <Car size={20} style={{ color: '#2563eb' }} />
          <span>{lang === 'ar' ? 'كتالوج قطع غيار BYD الأصلية المباشر' : 'BYD Genuine OEM Live Catalog'}</span>
          <span style={{ fontSize: '0.75rem', color: '#64748b', background: '#f1f5f9', padding: '0.15rem 0.55rem', borderRadius: '6px' }}>+7,900 Parts</span>
        </div>

        <button
          onClick={() => setIsCartOpen(true)}
          className="btn-primary"
          style={{ display: 'flex', alignItems: 'center', gap: '0.55rem', padding: '0.55rem 1.2rem', borderRadius: '10px', fontSize: '0.88rem', fontWeight: '700' }}
        >
          <ShoppingBag size={18} />
          <span>Cart ({cart.reduce((a, b) => a + b.qty, 0)}) · ${cartTotal.toFixed(2)}</span>
        </button>
      </div>

      {/* DUAL-COLUMN TOP LAYOUT (SIDE-BY-SIDE HERO & FILTERS) */}
      <section style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))',
        gap: '1.5rem',
        alignItems: 'stretch'
      }}>
        {/* LEFT COLUMN: SEARCH ENGINE HERO CARD */}
        <div style={{
          background: '#ffffff',
          borderRadius: '24px',
          padding: '2rem',
          border: '1px solid var(--border-color)',
          boxShadow: '0 10px 30px rgba(15, 23, 42, 0.05)',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          gap: '1.25rem'
        }}>
          <div>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.45rem', background: '#eff6ff', border: '1px solid #bfdbfe', padding: '0.3rem 0.85rem', borderRadius: '999px', color: '#2563eb', fontSize: '0.8rem', fontWeight: '700', marginBottom: '0.85rem' }}>
              <Search size={14} /> Instant OEM Part Search
            </div>

            <h1 style={{ fontSize: '1.8rem', fontWeight: '800', color: '#0f172a', fontFamily: 'var(--font-heading)', margin: 0, letterSpacing: '-0.02em', lineHeight: '1.25' }}>
              {lang === 'ar' ? 'البحث السريع في قطع BYD الأصلية' : 'Search Genuine BYD Auto Parts'}
            </h1>
            <p style={{ color: '#64748b', fontSize: '0.88rem', margin: '0.4rem 0 0 0', lineHeight: '1.45' }}>
              {lang === 'ar'
                ? 'ابحث برقم OEM، الهيكل VIN، أو الاسم العربي (فحمات، هوبات، تنورة الباب)'
                : 'Enter OEM part number, chassis VIN code, or Arabic term.'}
            </p>
          </div>

          {/* Search Input Bar */}
          <div>
            <div style={{ display: 'flex', gap: '0.5rem', background: '#ffffff', border: '2px solid #2563eb', borderRadius: '14px', padding: '0.35rem', boxShadow: '0 6px 20px rgba(37, 99, 235, 0.1)' }}>
              <div style={{ flex: 1, position: 'relative', display: 'flex', alignItems: 'center' }}>
                <Search size={18} style={{ position: 'absolute', [lang === 'ar' ? 'right' : 'left']: '0.85rem', color: '#2563eb' }} />
                <input
                  type="text"
                  value={searchVal}
                  onChange={e => setSearchVal(e.target.value)}
                  placeholder={lang === 'ar' ? 'ابحث برقم OEM، الهيكل VIN، أو اسم القطعة...' : 'Search OEM (EQEA-5402841), VIN...'}
                  style={{
                    width: '100%',
                    background: 'transparent',
                    border: 'none',
                    outline: 'none',
                    color: '#0f172a',
                    padding: lang === 'ar' ? '0.7rem 2.5rem 0.7rem 0.85rem' : '0.7rem 0.85rem 0.7rem 2.5rem',
                    fontSize: '0.95rem',
                    fontWeight: '600',
                    fontFamily: 'var(--font-body)'
                  }}
                />
                {searchVal && (
                  <button onClick={() => setSearchVal('')} style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer', paddingLeft: '0.5rem' }}>
                    <X size={16} />
                  </button>
                )}
              </div>

              <button
                className="btn-primary"
                style={{ padding: '0.7rem 1.4rem', borderRadius: '10px', fontSize: '0.9rem', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '0.45rem' }}
              >
                <Search size={16} /> {lang === 'ar' ? 'بحث' : 'Search'}
              </button>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: FILTERS & CATEGORY NAVIGATION CARD */}
        <div style={{
          background: '#ffffff',
          borderRadius: '24px',
          padding: '2rem',
          border: '1px solid var(--border-color)',
          boxShadow: '0 10px 30px rgba(15, 23, 42, 0.05)',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          gap: '1.25rem'
        }}>
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.85rem' }}>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.45rem', background: '#f8fafc', border: '1px solid #e2e8f0', padding: '0.3rem 0.85rem', borderRadius: '999px', color: '#475569', fontSize: '0.8rem', fontWeight: '700' }}>
                <Filter size={14} /> Catalog Filters
              </div>

              {hasActiveSearch && (
                <button
                  onClick={handleResetFilters}
                  style={{ background: 'transparent', border: 'none', color: '#dc2626', fontSize: '0.78rem', fontWeight: '700', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.25rem' }}
                >
                  <RotateCcw size={13} /> Reset Filters
                </button>
              )}
            </div>

            {/* Vehicle Model Pills */}
            <div style={{ marginBottom: '1rem' }}>
              <div style={{ fontSize: '0.78rem', fontWeight: '700', color: '#64748b', marginBottom: '0.45rem' }}>Vehicle Model:</div>
              <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                {vehicles.map(v => {
                  const isActive = selectedModel === v.id;
                  return (
                    <button
                      key={v.id}
                      onClick={() => setSelectedModel(v.id)}
                      style={{
                        padding: '0.35rem 0.8rem',
                        borderRadius: '8px',
                        background: isActive ? '#2563eb' : '#f8fafc',
                        color: isActive ? '#ffffff' : '#475569',
                        border: isActive ? '1px solid #2563eb' : '1px solid #cbd5e1',
                        fontWeight: '700',
                        fontSize: '0.78rem',
                        cursor: 'pointer'
                      }}
                    >
                      {lang === 'ar' ? v.arName : v.name}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Category Pills */}
            <div>
              <div style={{ fontSize: '0.78rem', fontWeight: '700', color: '#64748b', marginBottom: '0.45rem' }}>Parts Category:</div>
              <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                {categories.map(c => {
                  const isActive = selectedCategory === c.id;
                  return (
                    <button
                      key={c.id}
                      onClick={() => setSelectedCategory(c.id)}
                      style={{
                        padding: '0.35rem 0.8rem',
                        borderRadius: '8px',
                        background: isActive ? '#0f172a' : '#f8fafc',
                        color: isActive ? '#ffffff' : '#475569',
                        border: isActive ? '1px solid #0f172a' : '1px solid #cbd5e1',
                        fontWeight: '700',
                        fontSize: '0.78rem',
                        cursor: 'pointer'
                      }}
                    >
                      🇸🇦 {c.arName}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <div style={{ fontSize: '0.75rem', color: '#94a3b8', background: '#f8fafc', padding: '0.5rem 0.75rem', borderRadius: '8px', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <ShieldCheck size={14} style={{ color: '#047857' }} />
            All parts verified for BYD Middle East & Gulf specifications.
          </div>
        </div>
      </section>

      {/* Live Search Results Grid OR Clean Prompt Box */}
      {!hasActiveSearch ? (
        <section style={{ textAlign: 'center', padding: '4rem 1.5rem', background: '#ffffff', borderRadius: '20px', border: '1px stroke #cbd5e1', boxShadow: '0 4px 16px rgba(15, 23, 42, 0.04)' }}>
          <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: '#eff6ff', color: '#2563eb', border: '1px solid #bfdbfe', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.25rem auto', boxShadow: '0 4px 14px rgba(37, 99, 235, 0.15)' }}>
            <Search size={32} />
          </div>
          <h3 style={{ fontSize: '1.2rem', fontWeight: '800', color: '#0f172a', margin: 0, fontFamily: 'var(--font-heading)' }}>
            {lang === 'ar' ? 'أدخل رقم القطعة أو اختر الفلتر لبدء البحث' : 'Type to Search OEM Catalog'}
          </h3>
          <p style={{ color: '#64748b', fontSize: '0.9rem', maxWidth: '480px', margin: '0.5rem auto 0 auto', lineHeight: '1.5' }}>
            {lang === 'ar'
              ? 'اكتب رقم القطعة OEM (مثل EQEA-5402841) أو اختر الموديل في لوحة التحكم أعلاه لمعاينة الأجزاء المتاحة فوراً'
              : 'Enter an OEM code, VIN number, or select a model filter in the panel above to display available genuine parts.'}
          </p>
        </section>
      ) : (
        <section>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
            <h3 style={{ fontSize: '1.15rem', fontWeight: '800', color: '#0f172a', fontFamily: 'var(--font-heading)', display: 'flex', alignItems: 'center', gap: '0.55rem', margin: 0 }}>
              <CheckCircle size={19} style={{ color: '#047857' }} />
              Matching OEM Parts ({filteredProducts.length})
            </h3>
          </div>

          {filteredProducts.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '4rem 1rem', background: '#ffffff', borderRadius: '20px', border: '1px solid #e2e8f0', color: '#64748b' }}>
              <Search size={44} style={{ opacity: 0.25, marginBottom: '0.75rem' }} />
              <div style={{ fontWeight: '700', color: '#0f172a', fontSize: '1.05rem' }}>No Matching OEM Parts Found</div>
              <div style={{ fontSize: '0.85rem', marginTop: '0.25rem' }}>Try clearing filters or checking the OEM code spelling</div>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(310px, 1fr))', gap: '1.35rem' }}>
              {filteredProducts.slice(0, 36).map(product => (
                <div
                  key={product.id}
                  style={{
                    background: '#ffffff',
                    border: '1px solid var(--border-color)',
                    borderRadius: '18px',
                    padding: '1.35rem',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    gap: '1rem',
                    boxShadow: '0 4px 14px rgba(15, 23, 42, 0.04)',
                    transition: 'transform 0.2s ease, box-shadow 0.2s ease'
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.6rem' }}>
                      <span style={{ fontSize: '0.78rem', fontFamily: 'var(--font-mono)', fontWeight: '700', color: '#2563eb', background: '#eff6ff', padding: '0.2rem 0.65rem', borderRadius: '6px', border: '1px solid #bfdbfe' }}>
                        {product.oem}
                      </span>
                      <span style={{ fontSize: '0.72rem', padding: '0.2rem 0.55rem', borderRadius: '999px', background: '#ecfdf5', color: '#047857', border: '1px solid #a7f3d0', fontWeight: '700' }}>
                        In Stock ({product.quantity})
                      </span>
                    </div>

                    <h4 style={{ fontSize: '1.05rem', fontWeight: '800', color: '#0f172a', lineHeight: '1.35', margin: 0 }}>
                      {product.arName || product.name}
                    </h4>
                    {product.cnName && <div style={{ fontSize: '0.78rem', color: '#64748b', marginTop: '0.25rem' }}>🇨🇳 {product.cnName}</div>}
                    <div style={{ fontSize: '0.76rem', color: '#64748b', marginTop: '0.25rem', fontWeight: '600' }}>Vehicle: {product.vehicleModel || 'Universal BYD'}</div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '0.85rem', borderTop: '1px solid #f1f5f9' }}>
                    <div>
                      <div style={{ fontSize: '0.7rem', color: '#64748b' }}>Unit Price</div>
                      <div style={{ fontFamily: 'var(--font-heading)', fontSize: '1.28rem', fontWeight: '800', color: '#2563eb' }}>
                        ${(Number(product.unitPrice) || 0).toFixed(2)}
                      </div>
                    </div>

                    <button
                      onClick={() => addToCart(product)}
                      className="btn-primary"
                      style={{ padding: '0.65rem 1.15rem', borderRadius: '10px', fontSize: '0.88rem', fontWeight: '700' }}
                    >
                      + Order Part
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {/* Customer Cart Drawer Modal */}
      {isCartOpen && (
        <div className="modal-overlay" onClick={() => setIsCartOpen(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '520px', background: '#ffffff', color: '#0f172a', borderRadius: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <ShoppingBag size={22} style={{ color: '#2563eb' }} />
                <h3 style={{ fontSize: '1.15rem', fontWeight: '800', color: '#0f172a' }}>Customer Order Request</h3>
              </div>
              <button onClick={() => setIsCartOpen(false)} style={{ background: 'transparent', border: 'none', color: '#64748b', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>

            {cart.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '3rem 1rem', color: '#64748b' }}>
                <ShoppingBag size={48} style={{ opacity: 0.25, marginBottom: '0.75rem' }} />
                <div style={{ fontWeight: '700', color: '#0f172a' }}>Your Cart is Empty</div>
                <div style={{ fontSize: '0.85rem', marginTop: '0.25rem' }}>Select OEM auto parts above to request an order quote</div>
              </div>
            ) : (
              <form onSubmit={handleSubmitOrder} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div style={{ maxHeight: '220px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                  {cart.map(item => (
                    <div key={item.id} style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '0.75rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <div style={{ fontWeight: '700', fontSize: '0.88rem', color: '#0f172a' }}>{item.arName || item.name}</div>
                        <div style={{ fontSize: '0.72rem', color: '#2563eb', fontFamily: 'var(--font-mono)' }}>OEM: {item.oem}</div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                          <button type="button" onClick={() => updateCartQty(item.id, -1)} style={{ width: '26px', height: '26px', borderRadius: '6px', background: '#e2e8f0', border: 'none', color: '#0f172a', fontWeight: 'bold', cursor: 'pointer' }}>-</button>
                          <span style={{ fontWeight: '700', fontSize: '0.88rem', width: '20px', textAlign: 'center', color: '#0f172a' }}>{item.qty}</span>
                          <button type="button" onClick={() => updateCartQty(item.id, 1)} style={{ width: '26px', height: '26px', borderRadius: '6px', background: '#e2e8f0', border: 'none', color: '#0f172a', fontWeight: 'bold', cursor: 'pointer' }}>+</button>
                        </div>
                        <div style={{ fontWeight: '800', color: '#2563eb', fontSize: '0.95rem' }}>
                          ${(Number(item.unitPrice || 0) * item.qty).toFixed(2)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.75rem 1rem', background: '#eff6ff', borderRadius: '10px', border: '1px solid #bfdbfe', fontSize: '1.05rem', fontWeight: '800' }}>
                  <span>Total Order Amount</span>
                  <span style={{ color: '#2563eb' }}>${cartTotal.toFixed(2)}</span>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', borderTop: '1px solid var(--border-color)', paddingTop: '0.85rem' }}>
                  <div style={{ fontSize: '0.85rem', fontWeight: '700', color: '#0f172a' }}>Customer Details & Delivery Option:</div>
                  
                  <div style={{ position: 'relative' }}>
                    <User size={16} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: '#64748b' }} />
                    <input
                      type="text"
                      required
                      placeholder="Your Full Name (الاسم الكامل)"
                      value={customerName}
                      onChange={e => setCustomerName(e.target.value)}
                      className="input-field-sm"
                      style={{ width: '100%', paddingLeft: '2.2rem' }}
                    />
                  </div>

                  <div style={{ position: 'relative' }}>
                    <Phone size={16} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: '#64748b' }} />
                    <input
                      type="tel"
                      required
                      placeholder="Phone / WhatsApp (رقم الجوال / الواتساب)"
                      value={customerPhone}
                      onChange={e => setCustomerPhone(e.target.value)}
                      className="input-field-sm"
                      style={{ width: '100%', paddingLeft: '2.2rem' }}
                    />
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                    <button
                      type="button"
                      onClick={() => setDeliveryMethod('pickup')}
                      style={{
                        padding: '0.6rem',
                        borderRadius: '8px',
                        border: deliveryMethod === 'pickup' ? '2px solid #2563eb' : '1px solid #cbd5e1',
                        background: deliveryMethod === 'pickup' ? '#eff6ff' : '#ffffff',
                        color: deliveryMethod === 'pickup' ? '#2563eb' : '#64748b',
                        fontWeight: '700',
                        fontSize: '0.82rem',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '0.35rem'
                      }}
                    >
                      <MapPin size={15} /> In-Store Pickup
                    </button>

                    <button
                      type="button"
                      onClick={() => setDeliveryMethod('delivery')}
                      style={{
                        padding: '0.6rem',
                        borderRadius: '8px',
                        border: deliveryMethod === 'delivery' ? '2px solid #2563eb' : '1px solid #cbd5e1',
                        background: deliveryMethod === 'delivery' ? '#eff6ff' : '#ffffff',
                        color: deliveryMethod === 'delivery' ? '#2563eb' : '#64748b',
                        fontWeight: '700',
                        fontSize: '0.82rem',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '0.35rem'
                      }}
                    >
                      <Truck size={15} /> City Delivery
                    </button>
                  </div>

                  {deliveryMethod === 'delivery' && (
                    <input
                      type="text"
                      required
                      placeholder="Delivery Address / City District (عنوان التوصيل)"
                      value={deliveryAddress}
                      onChange={e => setDeliveryAddress(e.target.value)}
                      className="input-field-sm"
                      style={{ width: '100%' }}
                    />
                  )}
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="btn-primary"
                  style={{ width: '100%', padding: '0.85rem', fontSize: '0.95rem', marginTop: '0.5rem' }}
                >
                  {isSubmitting ? 'Submitting Order...' : 'Submit Order Request (إرسال طلب الحجز)'}
                </button>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Order Success Modal */}
      {completedOrder && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ textAlign: 'center', maxWidth: '420px', padding: '2rem', background: '#ffffff', color: '#0f172a', borderRadius: '20px' }}>
            <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: '#ecfdf5', color: '#047857', border: '1px solid #a7f3d0', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem auto' }}>
              <CheckCircle size={36} />
            </div>

            <h2 style={{ fontSize: '1.3rem', fontWeight: '800', color: '#0f172a' }}>Order Submitted Successfully!</h2>
            <div style={{ color: '#047857', fontWeight: '700', fontSize: '0.95rem', marginTop: '0.3rem', fontFamily: "'Cairo', sans-serif" }}>
              تم استلام طلبك بنجاح وسيتم التواصل معك مباشرة
            </div>

            <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '1rem', margin: '1.25rem 0', textAlign: 'left', fontSize: '0.85rem', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#64748b' }}>Order Ref:</span>
                <span style={{ fontWeight: '700', color: '#2563eb', fontFamily: 'var(--font-mono)' }}>{completedOrder.id || 'ORD-SYNC'}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#64748b' }}>Customer:</span>
                <span style={{ fontWeight: '600', color: '#0f172a' }}>{completedOrder.customerName}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#64748b' }}>Status:</span>
                <span style={{ fontWeight: '700', color: '#047857' }}>🟢 Connected to POS Counter</span>
              </div>
            </div>

            <button
              onClick={() => setCompletedOrder(null)}
              className="btn-primary"
              style={{ width: '100%', padding: '0.75rem' }}
            >
              Continue Browsing Store
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
