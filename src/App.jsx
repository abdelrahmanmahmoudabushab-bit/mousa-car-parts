import React, { useState, useEffect, Component, lazy, Suspense } from 'react';
import { Package, ShoppingCart, History, Plus, Layers, RefreshCw, Languages, Users, LogOut, ShieldCheck, User, Globe, Store, LayoutDashboard, CheckCircle, UploadCloud, Settings, Menu, X, BarChart3 } from 'lucide-react';
import POSTerminal from './components/POSTerminal';
import ItemModal from './components/ItemModal';
import PaymentModal from './components/PaymentModal';
import ReceiptModal from './components/ReceiptModal';
import LoginScreen from './components/LoginScreen';
import WaitingScreen from './components/WaitingScreen';
import OfflineStatusBadge from './components/OfflineStatusBadge';
import { cacheProductsLocally, getLocalProductsCache, queueOfflineOrder } from './utils/offlineStore';

// Lazy-loaded heavy components for instant sub-30ms initial page load speed
const OrdersLog = lazy(() => import('./components/OrdersLog'));
const LightStockManager = lazy(() => import('./components/LightStockManager'));
const StockImportPage = lazy(() => import('./components/StockImportPage'));
const SettingsPage = lazy(() => import('./components/SettingsPage'));
const UserManagementModal = lazy(() => import('./components/UserManagementModal'));
const CustomerStore = lazy(() => import('./components/CustomerStore'));
const DataAnalyticsDashboard = lazy(() => import('./components/DataAnalyticsDashboard'));

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  componentDidCatch(error, errorInfo) {
    console.error('App Uncaught UI Error:', error, errorInfo);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#f8fafc', color: '#0f172a', fontFamily: "'Cairo', sans-serif", padding: '2rem', textAlign: 'center' }}>
          <div style={{ background: '#ffffff', border: '2px solid #e2e8f0', padding: '2.5rem', borderRadius: '24px', maxWidth: '520px', boxShadow: '0 20px 40px rgba(15, 23, 42, 0.08)' }}>
            <h2 style={{ fontSize: '1.4rem', fontWeight: '900', color: '#d97706', marginBottom: '1rem' }}>⚠️ جاري إعادة تحميل الصفحة تلقائياً...</h2>
            <p style={{ color: '#64748b', fontSize: '0.92rem', marginBottom: '1.5rem', fontWeight: '600' }}>حدث تحديث مؤقت في النظام. انقر أدناه لمتابعة العمل.</p>
            <button onClick={() => window.location.reload()} className="btn-sand" style={{ padding: '0.85rem 2rem', fontSize: '1rem', fontWeight: '800' }}>
              إعادة التحميل الآن 🔄
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

function App() {
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
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

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

  // Fetch initial bootstrap data with offline cache fallback
  const fetchBootstrapData = async () => {
    try {
      setLoading(true);
      setBootstrapError('');
      const res = await fetch('/api/bootstrap');
      if (!res.ok) throw new Error(`Server returned ${res.status}`);
      const data = await res.json();
      const prods = data.products || [];
      setProducts(prods);
      setCategories(data.categories || []);
      setOrders(data.orders || []);
      cacheProductsLocally(prods);
    } catch (err) {
      console.warn('Network offline or bootstrap error, loading local cache:', err);
      const cachedProds = await getLocalProductsCache();
      if (cachedProds && cachedProds.length > 0) {
        setProducts(cachedProds);
      } else {
        setBootstrapError('تعذر الاتصال بالسيرفر ولا يوجد محتوى محلي مؤقت. يرجى التأكد من اتصال الشيكة.');
      }
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
        cacheProductsLocally(data.products);
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
      if (data.products) {
        setProducts(data.products);
        cacheProductsLocally(data.products);
      }
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
        cacheProductsLocally(data.products);
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
    const orderPayload = {
      cashier: user?.name || 'Alex Counter',
      customerName: 'Walk-in POS Customer',
      customerPhone: 'N/A',
      deliveryMethod: 'pickup',
      items: paymentData.cart,
      subtotal: paymentData.totals.subtotal,
      tax: paymentData.totals.tax,
      total: paymentData.totals.total,
      totalAmount: paymentData.totals.total,
      paymentMethod: paymentDetails.paymentMethod,
      source: 'POS Counter'
    };

    try {
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(orderPayload),
      });

      const data = await res.json();
      if (res.ok && data.order) {
        setOrders(prev => [data.order, ...prev]);
        if (data.products) {
          setProducts(data.products);
          cacheProductsLocally(data.products);
        }
        setPaymentData(null);
        setActiveReceipt(data.order);
      } else {
        alert(data.error || 'Error recording checkout sale');
      }
    } catch (err) {
      // OFFLINE RESILIENCE FALLBACK!
      console.warn('Network offline, queueing sale locally:', err);
      const offlineOrder = await queueOfflineOrder(orderPayload);
      
      // Update local product inventory stock
      setProducts(prev => {
        const updated = prev.map(p => {
          const cartItem = paymentData.cart.find(c => c.id === p.id);
          if (cartItem) {
            return { ...p, quantity: Math.max(0, (p.quantity || 0) - cartItem.qty) };
          }
          return p;
        });
        cacheProductsLocally(updated);
        return updated;
      });

      setOrders(prev => [offlineOrder, ...prev]);
      setPaymentData(null);
      setActiveReceipt(offlineOrder);
      alert('📡 تم تسجيل الفاتورة بنجاح في وضع الأوفلاين (تم الحفظ محلياً وسوف تتزامن تلقائياً فور إعادة الاتصال)!');
    }
  };

  // Return Order & Restock Inventory
  const handleReturnOrder = async (orderId, returnedItems, reason) => {
    try {
      const res = await fetch('/api/orders/return', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ orderId, returnedItems, reason }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        if (data.products) setProducts(data.products);
        if (data.orders) setOrders(data.orders);
        alert(`📦 ${lang === 'ar' ? `تم إرجاع الفاتورة ${orderId} وإعادة القطع للمخزون بنجاح!` : `Order ${orderId} returned and restocked to inventory!`}`);
      } else {
        alert(data.error || 'Failed to process return.');
      }
    } catch (err) {
      alert('Error returning order: ' + err.message);
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
    <div className="app-container" dir={lang === 'ar' ? 'rtl' : 'ltr'} style={{ flexDirection: 'column', minHeight: '100dvh', width: '100%', background: '#f4f6f9', display: 'flex' }}>
      {/* Clean Responsive Top Header Bar */}
      <header className="top-header" style={{
        minHeight: '56px',
        background: '#ffffff',
        borderBottom: '1px solid var(--border-color)',
        padding: '0.4rem 1rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        boxShadow: '0 2px 10px rgba(15, 23, 42, 0.04)',
        zIndex: 50,
        position: 'relative'
      }}>
        {/* Brand & Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }} onClick={() => { setActiveTab('portal'); setMobileMenuOpen(false); }}>
          <span style={{ fontSize: '1.2rem' }}>🚗</span>
          <span style={{ fontFamily: 'var(--font-heading)', fontWeight: '900', fontSize: '1.05rem', color: '#0f172a', letterSpacing: '-0.02em' }}>
            MOUSA CAR PARTS
          </span>
        </div>

        {/* Mobile Hamburger Toggle Button (< 768px) */}
        <button
          className="mobile-only"
          onClick={() => setMobileMenuOpen(prev => !prev)}
          style={{
            background: '#f8fafc',
            border: '1px solid #cbd5e1',
            borderRadius: '8px',
            padding: '0.4rem 0.6rem',
            color: '#0f172a',
            cursor: 'pointer',
            alignItems: 'center',
            justifyContent: 'center'
          }}
          aria-label="Toggle Menu"
        >
          {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
        </button>

        {/* Desktop Top Header Actions & Links */}
        <div className="top-header-actions desktop-only" style={{ alignItems: 'center', gap: '0.5rem' }}>
          <OfflineStatusBadge token={token} />

          {activeTab !== 'portal' && (
            <button
              onClick={() => setActiveTab('portal')}
              style={{
                padding: '0.4rem 0.75rem',
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
            onClick={() => setActiveTab('analytics')}
            style={{
              padding: '0.4rem 0.75rem',
              borderRadius: '8px',
              background: activeTab === 'analytics' ? '#7c3aed' : '#f8fafc',
              color: activeTab === 'analytics' ? '#ffffff' : '#475569',
              border: activeTab === 'analytics' ? '1px solid #7c3aed' : '1px solid #cbd5e1',
              fontWeight: '700',
              fontSize: '0.82rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.35rem'
            }}
          >
            <BarChart3 size={15} />
            {lang === 'ar' ? 'التحليلات والذكاء' : 'Analytics'}
          </button>

          <button
            onClick={() => setActiveTab('orders')}
            style={{
              padding: '0.4rem 0.75rem',
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
            onClick={() => setActiveTab('settings')}
            style={{
              padding: '0.4rem 0.75rem',
              borderRadius: '8px',
              background: activeTab === 'settings' ? '#0f172a' : '#f8fafc',
              color: activeTab === 'settings' ? '#ffffff' : '#475569',
              border: activeTab === 'settings' ? '1px solid #0f172a' : '1px solid #cbd5e1',
              fontWeight: '700',
              fontSize: '0.82rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.35rem'
            }}
          >
            <Settings size={15} />
            {lang === 'ar' ? 'الإعدادات ⚙️' : 'Settings ⚙️'}
          </button>

          <button
            onClick={toggleLanguage}
            style={{
              padding: '0.4rem 0.75rem',
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

          <div style={{ height: '20px', width: '1px', background: '#cbd5e1', margin: '0 0.2rem' }} />

          {/* User & Logout */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <div style={{ fontSize: '0.8rem', fontWeight: '800', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
              <User size={14} style={{ color: '#2563eb' }} /> {user.name || user.username}
            </div>
            <button
              onClick={handleLogout}
              style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#b91c1c', padding: '0.35rem 0.6rem', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.78rem', fontWeight: '700' }}
              title="Log Out"
            >
              <LogOut size={14} /> {lang === 'ar' ? 'خروج' : 'Logout'}
            </button>
          </div>
        </div>
      </header>

      {/* Collapsible Mobile Navigation Drawer */}
      {mobileMenuOpen && (
        <div style={{ background: '#ffffff', borderBottom: '2px solid #2563eb', padding: '0.85rem 1rem', display: 'flex', flexDirection: 'column', gap: '0.6rem', boxShadow: '0 8px 20px rgba(0,0,0,0.1)', zIndex: 40, animation: 'fadeIn 0.15s ease' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: '0.4rem', borderBottom: '1px solid #f1f5f9' }}>
            <div style={{ fontSize: '0.85rem', fontWeight: '800', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <User size={15} style={{ color: '#2563eb' }} /> {user.name || user.username} ({user.role})
            </div>
            <button
              onClick={toggleLanguage}
              style={{ padding: '0.3rem 0.6rem', borderRadius: '6px', background: '#f8fafc', border: '1px solid #cbd5e1', fontSize: '0.78rem', fontWeight: '700' }}
            >
              {lang === 'ar' ? '🇸🇦 العربية' : '🇬🇧 English'}
            </button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
            <button
              onClick={() => { setActiveTab('portal'); setMobileMenuOpen(false); }}
              style={{ padding: '0.6rem', borderRadius: '8px', background: activeTab === 'portal' ? '#2563eb' : '#f8fafc', color: activeTab === 'portal' ? '#ffffff' : '#0f172a', border: '1px solid #cbd5e1', fontWeight: '800', fontSize: '0.82rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem' }}
            >
              <LayoutDashboard size={16} /> {lang === 'ar' ? 'الرئيسية' : 'Home'}
            </button>

            <button
              onClick={() => { setActiveTab('pos'); setMobileMenuOpen(false); }}
              style={{ padding: '0.6rem', borderRadius: '8px', background: activeTab === 'pos' ? '#2563eb' : '#f8fafc', color: activeTab === 'pos' ? '#ffffff' : '#0f172a', border: '1px solid #cbd5e1', fontWeight: '800', fontSize: '0.82rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem' }}
            >
              <ShoppingCart size={16} /> {lang === 'ar' ? 'نقطة البيع' : 'POS'}
            </button>

            <button
              onClick={() => { setActiveTab('inventory'); setMobileMenuOpen(false); }}
              style={{ padding: '0.6rem', borderRadius: '8px', background: activeTab === 'inventory' ? '#059669' : '#f8fafc', color: activeTab === 'inventory' ? '#ffffff' : '#0f172a', border: '1px solid #cbd5e1', fontWeight: '800', fontSize: '0.82rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem' }}
            >
              <Package size={16} /> {lang === 'ar' ? 'المخزون' : 'Inventory'}
            </button>

            <button
              onClick={() => { setActiveTab('import'); setMobileMenuOpen(false); }}
              style={{ padding: '0.6rem', borderRadius: '8px', background: activeTab === 'import' ? '#d97706' : '#f8fafc', color: activeTab === 'import' ? '#ffffff' : '#0f172a', border: '1px solid #cbd5e1', fontWeight: '800', fontSize: '0.82rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem' }}
            >
              <UploadCloud size={16} /> {lang === 'ar' ? 'إدخال مخزون' : 'Import'}
            </button>

            <button
              onClick={() => { setActiveTab('orders'); setMobileMenuOpen(false); }}
              style={{ padding: '0.6rem', borderRadius: '8px', background: activeTab === 'orders' ? '#0f172a' : '#f8fafc', color: activeTab === 'orders' ? '#ffffff' : '#0f172a', border: '1px solid #cbd5e1', fontWeight: '800', fontSize: '0.82rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem' }}
            >
              <History size={16} /> {lang === 'ar' ? 'المبيعات' : 'Sales Log'}
            </button>

            <button
              onClick={() => { setActiveTab('settings'); setMobileMenuOpen(false); }}
              style={{ padding: '0.6rem', borderRadius: '8px', background: activeTab === 'settings' ? '#0f172a' : '#f8fafc', color: activeTab === 'settings' ? '#ffffff' : '#0f172a', border: '1px solid #cbd5e1', fontWeight: '800', fontSize: '0.82rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem' }}
            >
              <Settings size={16} /> {lang === 'ar' ? 'الإعدادات' : 'Settings'}
            </button>
          </div>

          <button
            onClick={handleLogout}
            style={{ width: '100%', marginTop: '0.2rem', padding: '0.55rem', borderRadius: '8px', background: '#fef2f2', border: '1px solid #fecaca', color: '#b91c1c', fontWeight: '800', fontSize: '0.85rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem' }}
          >
            <LogOut size={16} /> {lang === 'ar' ? 'تسجيل الخروج' : 'Logout'}
          </button>
        </div>
      )}

      {/* Main Screen Full Width Container */}
      <div className="main-content" style={{ flex: 1, width: '100%', display: 'flex', flexDirection: 'column', minHeight: 0 }}>

        {/* Tab Views */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, overflowY: 'auto' }}>
          {loading || bootstrapError ? (
            <WaitingScreen
              lang={lang}
              error={bootstrapError}
              onRetry={fetchBootstrapData}
            />
          ) : (
            <>
              {activeTab === 'portal' && (
                <div style={{ flex: 1, padding: '2rem 1rem', background: '#f4f6f9', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-start', minHeight: '100%', overflowY: 'auto' }}>
                  <div style={{ textAlign: 'center', marginBottom: '2rem', maxWidth: '600px', width: '100%' }}>
                    <h1 style={{ fontSize: '1.8rem', fontWeight: '800', color: '#0f172a', margin: 0, fontFamily: 'var(--font-heading)', letterSpacing: '-0.02em' }}>
                      {lang === 'ar' ? 'اختر وجهة العمل المطلوبة' : 'Select Work Portal'}
                    </h1>
                    <p style={{ color: '#64748b', fontSize: '0.9rem', margin: '0.4rem 0 0 0' }}>
                      {lang === 'ar' ? 'اختر بين نقطة البيع الكاشير، دليل المخزون العام، أو إدخال وسحب المخزون' : 'Choose between Counter POS, Inventory Directory, or Stock Import.'}
                    </p>
                  </div>

                  <div className="portal-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.25rem', width: '100%', maxWidth: '1400px' }}>
                    
                    {/* CHOICE 1: POS COUNTER (ROYAL BLUE) */}
                    <div
                      className="glow-card-blue"
                      onClick={() => setActiveTab('pos')}
                      style={{
                        background: '#ffffff',
                        border: '2px solid #2563eb',
                        borderRadius: '12px',
                        padding: '2rem 1.75rem',
                        boxShadow: '0 10px 30px rgba(37, 99, 235, 0.08)',
                        cursor: 'pointer',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between'
                      }}
                    >
                      <div>
                        <div style={{ width: '54px', height: '54px', borderRadius: '10px', background: 'linear-gradient(135deg, #2563eb, #1d4ed8)', color: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1.25rem', boxShadow: '0 6px 16px rgba(37, 99, 235, 0.25)' }}>
                          <ShoppingCart size={26} />
                        </div>
                        <h2 style={{ fontSize: '1.35rem', fontWeight: '800', color: '#0f172a', margin: 0, fontFamily: 'var(--font-heading)' }}>
                          {lang === 'ar' ? 'نقطة البيع الكاشير' : 'Counter POS Checkout'}
                        </h2>
                        <p style={{ color: '#64748b', fontSize: '0.85rem', margin: '0.5rem 0 0 0', lineHeight: '1.5' }}>
                          {lang === 'ar' ? 'إجراء عمليات البيع السريعة، الكاشير، طباعة الفواتير وتأكيد الطلبات' : 'Fast counter sales, cart checkout, and receipt printing.'}
                        </p>
                      </div>

                      <button className="btn-primary" style={{ marginTop: '1.75rem', padding: '0.85rem', width: '100%', fontSize: '0.92rem', fontWeight: '800', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', background: '#2563eb', borderColor: '#2563eb' }}>
                        <ShoppingCart size={18} /> {lang === 'ar' ? 'دخول نقطة البيع' : 'Enter Counter POS'}
                      </button>
                    </div>

                    {/* CHOICE 2: STOCK INVENTORY (EMERALD GREEN) */}
                    <div
                      className="glow-card-emerald"
                      onClick={() => setActiveTab('inventory')}
                      style={{
                        background: '#ffffff',
                        border: '2px solid #059669',
                        borderRadius: '12px',
                        padding: '2rem 1.75rem',
                        boxShadow: '0 10px 30px rgba(5, 150, 105, 0.08)',
                        cursor: 'pointer',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between'
                      }}
                    >
                      <div>
                        <div style={{ width: '54px', height: '54px', borderRadius: '10px', background: 'linear-gradient(135deg, #059669, #047857)', color: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1.25rem', boxShadow: '0 6px 16px rgba(5, 150, 105, 0.25)' }}>
                          <Package size={26} />
                        </div>
                        <h2 style={{ fontSize: '1.35rem', fontWeight: '800', color: '#0f172a', margin: 0, fontFamily: 'var(--font-heading)' }}>
                          {lang === 'ar' ? 'دليل المخزون' : 'Stock Inventory Directory'}
                        </h2>
                        <p style={{ color: '#64748b', fontSize: '0.85rem', margin: '0.5rem 0 0 0', lineHeight: '1.5' }}>
                          {lang === 'ar' ? 'استعراض 7,942 قطعة غيار BYD الأصلية، التعديل على الأسعار والكميات' : 'Search 7,942 BYD OEM parts, update stock count, prices, and fitment.'}
                        </p>
                      </div>

                      <button className="btn-secondary" style={{ marginTop: '1.75rem', padding: '0.85rem', width: '100%', fontSize: '0.92rem', fontWeight: '800', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', background: '#ecfdf5', color: '#047857', border: '1px solid #a7f3d0' }}>
                        <Package size={18} /> {lang === 'ar' ? 'دخول دليل المخزون' : 'Open Inventory Directory'}
                      </button>
                    </div>

                    {/* CHOICE 3: STOCK INGESTION & ENTRY (WARM AMBER GOLD) */}
                    <div
                      className="glow-card-amber"
                      onClick={() => setActiveTab('import')}
                      style={{
                        background: '#ffffff',
                        border: '2px solid #d97706',
                        borderRadius: '12px',
                        padding: '2rem 1.75rem',
                        boxShadow: '0 10px 30px rgba(217, 119, 6, 0.08)',
                        cursor: 'pointer',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between'
                      }}
                    >
                      <div>
                        <div style={{ width: '54px', height: '54px', borderRadius: '10px', background: 'linear-gradient(135deg, #d97706, #b45309)', color: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1.25rem', boxShadow: '0 6px 16px rgba(217, 119, 6, 0.25)' }}>
                          <UploadCloud size={26} />
                        </div>
                        <h2 style={{ fontSize: '1.35rem', fontWeight: '800', color: '#0f172a', margin: 0, fontFamily: 'var(--font-heading)' }}>
                          {lang === 'ar' ? 'إدخال مخزون' : 'Stock Import & Entry'}
                        </h2>
                        <p style={{ color: '#64748b', fontSize: '0.85rem', margin: '0.5rem 0 0 0', lineHeight: '1.5' }}>
                          {lang === 'ar' ? 'سحب وتحديث قطع الغيار من ملفات Excel / PDF أو مسح السيريال كود والباركود' : 'Import parts from PDF/Excel or scan QR & serial barcode numbers.'}
                        </p>
                      </div>

                      <button className="btn-sand" style={{ marginTop: '1.75rem', padding: '0.85rem', width: '100%', fontSize: '0.92rem', fontWeight: '800', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                        <UploadCloud size={18} /> {lang === 'ar' ? 'إدخال وسحب مخزون 📥' : 'Import Stock 📥'}
                      </button>
                    </div>

                    {/* CHOICE 4: DATA ANALYTICS & AI INTELLIGENCE (DEEP PURPLE / INDIGO) */}
                    <div
                      className="glow-card-purple"
                      onClick={() => setActiveTab('analytics')}
                      style={{
                        background: '#ffffff',
                        border: '2px solid #7c3aed',
                        borderRadius: '12px',
                        padding: '2rem 1.75rem',
                        boxShadow: '0 10px 30px rgba(124, 58, 237, 0.08)',
                        cursor: 'pointer',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between'
                      }}
                    >
                      <div>
                        <div style={{ width: '54px', height: '54px', borderRadius: '10px', background: 'linear-gradient(135deg, #7c3aed, #6d28d9)', color: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1.25rem', boxShadow: '0 6px 16px rgba(124, 58, 237, 0.25)' }}>
                          <BarChart3 size={26} />
                        </div>
                        <h2 style={{ fontSize: '1.35rem', fontWeight: '800', color: '#0f172a', margin: 0, fontFamily: 'var(--font-heading)' }}>
                          {lang === 'ar' ? 'تحليلات البيانات والذكاء التجاري' : 'Data Analytics & AI Intelligence'}
                        </h2>
                        <p style={{ color: '#64748b', fontSize: '0.85rem', margin: '0.5rem 0 0 0', lineHeight: '1.5' }}>
                          {lang === 'ar' ? 'لوحة تحليلات ذكية للمبيعات، استخراج القطع الأكثر طلباً، وتوليد أوامر شراء النواقص تلقائياً' : 'Sales performance, top selling OEM parts, and auto purchase reorder reports.'}
                        </p>
                      </div>

                      <button style={{ marginTop: '1.75rem', padding: '0.85rem', width: '100%', fontSize: '0.92rem', fontWeight: '800', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', background: '#f3e8ff', color: '#7c3aed', border: '1px solid #d8b4fe', cursor: 'pointer' }}>
                        <BarChart3 size={18} /> {lang === 'ar' ? 'فتح لوحة التحليلات 📊🤖' : 'Open Analytics 📊🤖'}
                      </button>
                    </div>

                  </div>
                </div>
              )}

              <Suspense fallback={
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', gap: '0.5rem', color: 'var(--text-muted)', fontFamily: "'Cairo', sans-serif" }}>
                  <RefreshCw className="spin" size={24} /> Loading...
                </div>
              }>
                {activeTab === 'analytics' && (
                  <DataAnalyticsDashboard
                    products={products}
                    orders={orders}
                    categories={categories}
                    lang={lang}
                  />
                )}

                {activeTab === 'import' && (
                  <StockImportPage
                    products={products}
                    categories={categories}
                    token={token}
                    lang={lang}
                    onProductsUpdated={(updated) => setProducts(updated)}
                    onSaveProduct={handleSaveProduct}
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
                    onSaveProduct={handleSaveProduct}
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
                    lang={lang}
                    onReprintReceipt={(order) => setActiveReceipt(order)}
                    onReturnOrder={handleReturnOrder}
                  />
                )}

                {activeTab === 'settings' && (
                  <SettingsPage
                    token={token}
                    user={user}
                    lang={lang}
                    setLang={setLang}
                    onBackToPortal={() => setActiveTab('portal')}
                    onProductsUpdated={(updated) => setProducts(updated)}
                  />
                )}
              </Suspense>
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

export default function RootApp() {
  return (
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  );
}
