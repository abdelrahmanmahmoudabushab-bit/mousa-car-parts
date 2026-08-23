import React, { useState, useEffect } from 'react';
import { Package, ShoppingCart, History, Plus, Layers, RefreshCw, Languages, Users, LogOut, ShieldCheck, User, Globe, Store, LayoutDashboard, CheckCircle, UploadCloud } from 'lucide-react';
import POSTerminal from './components/POSTerminal';
import ItemModal from './components/ItemModal';
import PaymentModal from './components/PaymentModal';
import ReceiptModal from './components/ReceiptModal';
import OrdersLog from './components/OrdersLog';
import StockImportModal from './components/StockImportModal';
import LightStockManager from './components/LightStockManager';
import StockImportPage from './components/StockImportPage';
import LoginScreen from './components/LoginScreen';
import UserManagementModal from './components/UserManagementModal';
import CustomerStore from './components/CustomerStore';

export default function App() {
  // Auth State
  const [token, setToken] = useState(() => localStorage.getItem('mousa_pos_token') || '');
  const [user, setUser] = useState(() => {
    try {
      const saved = localStorage.getItem('mousa_pos_user');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const [activeTab, setActiveTab] = useState('portal');
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [bootstrapError, setBootstrapError] = useState('');

  // Language State
  const [lang, setLang] = useState(() => localStorage.getItem('mousa_pos_lang') || 'ar');

  // Modal States
  const [isItemModalOpen, setIsItemModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isUserMgmtOpen, setIsUserMgmtOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [paymentData, setPaymentData] = useState(null);
  const [activeReceipt, setActiveReceipt] = useState(null);

  // Login handler
  const handleLoginSuccess = (newToken, newUser) => {
    setToken(newToken);
    setUser(newUser);
    setActiveTab('portal');
    localStorage.setItem('mousa_pos_token', newToken);
    localStorage.setItem('mousa_pos_user', JSON.stringify(newUser));
  };

  // Logout handler
  const handleLogout = () => {
    setToken('');
    setUser(null);
    localStorage.removeItem('mousa_pos_token');
    localStorage.removeItem('mousa_pos_user');
  };

  // Fetch initial bootstrap data
  const fetchBootstrapData = async () => {
    try {
      setLoading(true);
      setBootstrapError('');
      const res = await fetch('/api/bootstrap');
      if (!res.ok) throw new Error(`Server returned ${res.status}`);
      const data = await res.json();
      setProducts(data.products || []);
      setCategories(data.categories || []);
      setOrders(data.orders || []);
    } catch (err) {
      console.error('Error fetching bootstrap data:', err);
      setBootstrapError('Cannot connect to server. Make sure the backend is running on port 5000.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBootstrapData();
  }, []);

  // Save / Edit Product
  const handleSaveProduct = async (productData) => {
    try {
      const res = await fetch('/api/products/save', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(productData),
      });
      const data = await res.json();
      if (res.ok && data.products) {
        setProducts(data.products);
        setIsItemModalOpen(false);
        setEditingItem(null);
      } else {
        alert(data.error || 'Permission denied or save failed');
      }
    } catch (err) {
      alert('Error saving auto part: ' + err.message);
    }
  };

  // Quick Adjust Stock
  const handleQuickAdjustStock = async (productId, delta) => {
    try {
      const res = await fetch('/api/products/adjust-stock', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ productId, delta }),
      });
      const data = await res.json();
      if (data.products) setProducts(data.products);
    } catch (err) {
      console.error('Error adjusting stock:', err);
    }
  };

  // Delete Product
  const handleDeleteProduct = async (id) => {
    if (!window.confirm('Are you sure you want to delete this OEM auto part?')) return;
    try {
      const res = await fetch(`/api/products/${id}`, { 
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok && data.products) {
        setProducts(data.products);
      } else {
        alert(data.error || 'Permission denied. Only Admins can delete parts.');
      }
    } catch (err) {
      alert('Error deleting auto part: ' + err.message);
    }
  };

  // Complete POS Sale Checkout
  const handleCompleteSale = async (paymentDetails) => {
    if (!paymentData) return;
    try {
      const orderPayload = {
        cashier: user?.name || 'Alex Counter',
        items: paymentData.cart,
        subtotal: paymentData.totals.subtotal,
        tax: paymentData.totals.tax,
        total: paymentData.totals.total,
        paymentMethod: paymentDetails.paymentMethod,
      };

      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(orderPayload),
      });

      const data = await res.json();
      if (data.order) {
        setOrders(prev => [data.order, ...prev]);
        if (data.products) setProducts(data.products);
        setPaymentData(null);
        setActiveReceipt(data.order);
      }
    } catch (err) {
      alert('Error recording checkout sale: ' + err.message);
    }
  };

  // If unauthenticated, show LoginScreen
  if (!token || !user) {
    return <LoginScreen onLoginSuccess={handleLoginSuccess} />;
  }

  const isAdmin = user.role === 'Admin';
  const isManagerOrAdmin = user.role === 'Admin' || user.role === 'Manager';

  const toggleLanguage = () => {
    const nextLang = lang === 'ar' ? 'en' : 'ar';
    setLang(nextLang);
    localStorage.setItem('mousa_pos_lang', nextLang);
  };

  return (
    <div className="app-container" dir={lang === 'ar' ? 'rtl' : 'ltr'} style={{ flexDirection: 'column', height: '100vh', width: '100vw', background: '#f4f6f9' }}>
      {/* Clean Full-Width Top Header Bar */}
      <header className="top-header" style={{
        minHeight: '68px',
        background: '#ffffff',
        borderBottom: '1px solid var(--border-color)',
        padding: '0.5rem 1.5rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '0.75rem',
        boxShadow: '0 2px 10px rgba(15, 23, 42, 0.04)',
        zIndex: 50
      }}>
        {/* Brand & Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <span style={{ fontSize: '1.3rem' }}>🚗</span>
          <span style={{ fontFamily: 'var(--font-heading)', fontWeight: '900', fontSize: '1.2rem', color: '#0f172a', letterSpacing: '-0.02em' }}>
            MOUSA CAR PARTS
          </span>
        </div>

        {/* Top Header Actions & Portal Links */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
          {activeTab !== 'portal' && (
            <button
              onClick={() => setActiveTab('portal')}
              style={{
                padding: '0.45rem 0.85rem',
                borderRadius: '8px',
                background: '#eff6ff',
                border: '1px solid #bfdbfe',
                color: '#2563eb',
                fontWeight: '700',
                fontSize: '0.82rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.35rem'
              }}
            >
              <LayoutDashboard size={15} />
              {lang === 'ar' ? 'الرئيسية' : 'Home Portal'}
            </button>
          )}

          <button
            onClick={() => setActiveTab('orders')}
            style={{
              padding: '0.45rem 0.85rem',
              borderRadius: '8px',
              background: activeTab === 'orders' ? '#0f172a' : '#f8fafc',
              color: activeTab === 'orders' ? '#ffffff' : '#475569',
              border: activeTab === 'orders' ? '1px solid #0f172a' : '1px solid #cbd5e1',
              fontWeight: '700',
              fontSize: '0.82rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.35rem'
            }}
          >
            <History size={15} />
            {lang === 'ar' ? 'سجل المبيعات' : 'Sales Log'}
          </button>

          <button
            onClick={toggleLanguage}
            style={{
              padding: '0.45rem 0.85rem',
              borderRadius: '8px',
              background: '#f8fafc',
              border: '1px solid #cbd5e1',
              color: '#334155',
              fontWeight: '700',
              fontSize: '0.82rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.35rem',
              fontFamily: "'Cairo', sans-serif"
            }}
          >
            <Languages size={15} />
            {lang === 'ar' ? '🇸🇦 العربية' : '🇬🇧 English'}
          </button>

          <div style={{ height: '24px', width: '1px', background: '#cbd5e1', margin: '0 0.25rem' }} />

          {/* User & Logout */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <div style={{ fontSize: '0.82rem', fontWeight: '800', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
              <User size={15} style={{ color: '#2563eb' }} /> {user.name || user.username}
            </div>
            <button
              onClick={handleLogout}
              style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#b91c1c', padding: '0.4rem 0.65rem', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.78rem', fontWeight: '700' }}
              title="Log Out"
            >
              <LogOut size={14} /> {lang === 'ar' ? 'خروج' : 'Logout'}
            </button>
          </div>
        </div>
      </header>

      {/* Main Screen Full Width Container */}
      <div className="main-content" style={{ flex: 1, width: '100%', overflow: 'hidden' }}>

        {/* Tab Views */}
        <div style={{ flex: 1, overflow: 'hidden' }}>
          {loading ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', gap: '0.5rem', color: 'var(--text-muted)' }}>
              <RefreshCw className="spin" size={24} /> Loading Auto Parts Catalog...
            </div>
          ) : bootstrapError ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: '1rem', color: '#b91c1c', padding: '2rem', textAlign: 'center' }}>
              <div style={{ fontSize: '1.2rem', fontWeight: '700' }}>⚠️ Server Connection Error</div>
              <div style={{ fontSize: '0.9rem', color: 'var(--text-muted)', maxWidth: '400px' }}>{bootstrapError}</div>
              <button onClick={fetchBootstrapData} className="btn-primary" style={{ marginTop: '0.5rem' }}>
                <RefreshCw size={16} /> Retry Connection
              </button>
            </div>
          ) : (
            <>
              {activeTab === 'portal' && (
                <div style={{ flex: 1, padding: '3rem 2rem', background: '#f4f6f9', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', overflowY: 'auto' }}>
                  <div style={{ textAlign: 'center', marginBottom: '2.5rem', maxWidth: '600px' }}>
                    <h1 style={{ fontSize: '2.2rem', fontWeight: '800', color: '#0f172a', margin: 0, fontFamily: 'var(--font-heading)', letterSpacing: '-0.02em' }}>
                      {lang === 'ar' ? 'اختر وجهة العمل المطلوبة' : 'Select Work Portal'}
                    </h1>
                    <p style={{ color: '#64748b', fontSize: '0.95rem', margin: '0.5rem 0 0 0' }}>
                      {lang === 'ar' ? 'اختر بين نقطة البيع الكاشير، دليل المخزون العام، أو إدخال وسحب المخزون' : 'Choose between Counter POS, Inventory Directory, or Stock Import.'}
                    </p>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem', width: '100%', maxWidth: '1050px' }}>
                    
                    {/* CHOICE 1: POS COUNTER */}
                    <div
                      onClick={() => setActiveTab('pos')}
                      style={{
                        background: '#ffffff',
                        border: '2px solid #2563eb',
                        borderRadius: '24px',
                        padding: '2rem 1.75rem',
                        boxShadow: '0 10px 30px rgba(37, 99, 235, 0.1)',
                        cursor: 'pointer',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between',
                        transition: 'transform 0.2s ease, box-shadow 0.2s ease'
                      }}
                    >
                      <div>
                        <div style={{ width: '54px', height: '54px', borderRadius: '16px', background: 'linear-gradient(135deg, #2563eb, #1d4ed8)', color: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1.25rem', boxShadow: '0 6px 16px rgba(37, 99, 235, 0.3)' }}>
                          <ShoppingCart size={26} />
                        </div>
                        <h2 style={{ fontSize: '1.35rem', fontWeight: '800', color: '#0f172a', margin: 0, fontFamily: 'var(--font-heading)' }}>
                          {lang === 'ar' ? 'نقطة البيع الكاشير' : 'Counter POS Checkout'}
                        </h2>
                        <p style={{ color: '#64748b', fontSize: '0.85rem', margin: '0.5rem 0 0 0', lineHeight: '1.5' }}>
                          {lang === 'ar' ? 'إجراء عمليات البيع السريعة، الكاشير، طباعة الفواتير وتأكيد الطلبات' : 'Fast counter sales, cart checkout, and receipt printing.'}
                        </p>
                      </div>

                      <button className="btn-primary" style={{ marginTop: '1.75rem', padding: '0.85rem', width: '100%', fontSize: '0.92rem', fontWeight: '800', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                        <ShoppingCart size={18} /> {lang === 'ar' ? 'دخول نقطة البيع' : 'Enter Counter POS'}
                      </button>
                    </div>

                    {/* CHOICE 2: STOCK INVENTORY */}
                    <div
                      onClick={() => setActiveTab('inventory')}
                      style={{
                        background: '#ffffff',
                        border: '2px solid #cbd5e1',
                        borderRadius: '24px',
                        padding: '2rem 1.75rem',
                        boxShadow: '0 10px 30px rgba(15, 23, 42, 0.05)',
                        cursor: 'pointer',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between',
                        transition: 'transform 0.2s ease, box-shadow 0.2s ease'
                      }}
                    >
                      <div>
                        <div style={{ width: '54px', height: '54px', borderRadius: '16px', background: '#0f172a', color: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1.25rem', boxShadow: '0 6px 16px rgba(15, 23, 42, 0.2)' }}>
                          <Package size={26} />
                        </div>
                        <h2 style={{ fontSize: '1.35rem', fontWeight: '800', color: '#0f172a', margin: 0, fontFamily: 'var(--font-heading)' }}>
                          {lang === 'ar' ? 'دليل المخزون' : 'Stock Inventory Directory'}
                        </h2>
                        <p style={{ color: '#64748b', fontSize: '0.85rem', margin: '0.5rem 0 0 0', lineHeight: '1.5' }}>
                          {lang === 'ar' ? 'استعراض 7,942 قطعة غيار BYD الأصلية، التعديل على الأسعار والكميات' : 'Search 7,942 BYD OEM parts, update stock count, prices, and fitment.'}
                        </p>
                      </div>

                      <button className="btn-secondary" style={{ marginTop: '1.75rem', padding: '0.85rem', width: '100%', fontSize: '0.92rem', fontWeight: '800', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', background: '#f8fafc', color: '#0f172a', border: '1px solid #cbd5e1' }}>
                        <Package size={18} /> {lang === 'ar' ? 'دخول دليل المخزون' : 'Open Inventory Directory'}
                      </button>
                    </div>

                    {/* CHOICE 3: STOCK INGESTION & ENTRY (إدخال مخزون) */}
                    <div
                      onClick={() => setActiveTab('import')}
                      style={{
                        background: '#ffffff',
                        border: '2px solid #d97706',
                        borderRadius: '24px',
                        padding: '2rem 1.75rem',
                        boxShadow: '0 10px 30px rgba(217, 119, 6, 0.12)',
                        cursor: 'pointer',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between',
                        transition: 'transform 0.2s ease, box-shadow 0.2s ease'
                      }}
                    >
                      <div>
                        <div style={{ width: '54px', height: '54px', borderRadius: '16px', background: 'linear-gradient(135deg, #d97706, #b45309)', color: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1.25rem', boxShadow: '0 6px 16px rgba(217, 119, 6, 0.3)' }}>
                          <UploadCloud size={26} />
                        </div>
                        <h2 style={{ fontSize: '1.35rem', fontWeight: '800', color: '#0f172a', margin: 0, fontFamily: 'var(--font-heading)' }}>
                          {lang === 'ar' ? 'إدخال مخزون' : 'Stock Import & Entry'}
                        </h2>
                        <p style={{ color: '#64748b', fontSize: '0.85rem', margin: '0.5rem 0 0 0', lineHeight: '1.5' }}>
                          {lang === 'ar' ? 'سحب وتحديث قطع الغيار من ملفات Excel / PDF أو مسح السيريال كود والباركود' : 'Import parts from PDF/Excel or scan QR & serial barcode numbers.'}
                        </p>
                      </div>

                      <button className="btn-sand" style={{ marginTop: '1.75rem', padding: '0.85rem', width: '100%', fontSize: '0.92rem', fontWeight: '800', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                        <UploadCloud size={18} /> {lang === 'ar' ? 'إدخال وسحب مخزون 📥' : 'Import Stock 📥'}
                      </button>
                    </div>

                  </div>
                </div>
              )}

              {activeTab === 'import' && (
                <StockImportPage
                  products={products}
                  categories={categories}
                  token={token}
                  lang={lang}
                  onProductsUpdated={(updated) => setProducts(updated)}
                  onBackToPortal={() => setActiveTab('portal')}
                />
              )}

              {activeTab === 'inventory' && (
                <LightStockManager
                  products={products}
                  categories={categories}
                  token={token}
                  lang={lang}
                  onProductsUpdated={(updated) => setProducts(updated)}
                  onOpenAddItem={() => {
                    setEditingItem(null);
                    setIsItemModalOpen(true);
                  }}
                  onEditItem={(item) => {
                    setEditingItem(item);
                    setIsItemModalOpen(true);
                  }}
                  onDeleteItem={handleDeleteProduct}
                  onQuickAdjustStock={handleQuickAdjustStock}
                />
              )}

              {activeTab === 'pos' && (
                <POSTerminal
                  products={products}
                  categories={categories}
                  lang={lang}
                  onOpenPayment={(data) => setPaymentData(data)}
                />
              )}

              {activeTab === 'orders' && (
                <OrdersLog
                  orders={orders}
                  onReprintReceipt={(order) => setActiveReceipt(order)}
                />
              )}
            </>
          )}
        </div>
      </div>

      {/* Modals */}
      {isItemModalOpen && (
        <ItemModal
          item={editingItem}
          categories={categories}
          onClose={() => {
            setIsItemModalOpen(false);
            setEditingItem(null);
          }}
          onSave={handleSaveProduct}
        />
      )}

      {isImportModalOpen && (
        <StockImportModal
          products={products}
          categories={categories}
          token={token}
          onClose={() => setIsImportModalOpen(false)}
          onImportSuccess={(newProducts) => {
            if (newProducts) setProducts(newProducts);
          }}
        />
      )}

      {isUserMgmtOpen && (
        <UserManagementModal
          token={token}
          onClose={() => setIsUserMgmtOpen(false)}
        />
      )}

      {paymentData && (
        <PaymentModal
          cart={paymentData.cart}
          totals={paymentData.totals}
          onClose={() => setPaymentData(null)}
          onCompleteSale={handleCompleteSale}
        />
      )}

      {activeReceipt && (
        <ReceiptModal
          order={activeReceipt}
          onClose={() => setActiveReceipt(null)}
        />
      )}
    </div>
  );
}
