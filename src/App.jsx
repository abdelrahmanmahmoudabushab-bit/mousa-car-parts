import React, { useState, useEffect } from 'react';
import { Package, ShoppingCart, History, Plus, Layers, RefreshCw, Languages, Users, LogOut, ShieldCheck, User, Globe, Store } from 'lucide-react';
import POSTerminal from './components/POSTerminal';
import ItemModal from './components/ItemModal';
import PaymentModal from './components/PaymentModal';
import ReceiptModal from './components/ReceiptModal';
import OrdersLog from './components/OrdersLog';
import StockImportModal from './components/StockImportModal';
import LightStockManager from './components/LightStockManager';
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

  const [activeTab, setActiveTab] = useState('inventory');
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
    <div className="app-container" dir={lang === 'ar' ? 'rtl' : 'ltr'}>
      {/* Sidebar Navigation */}
      <div className="sidebar">
        <div className="sidebar-logo">
          <div className="sidebar-logo-icon">🚗</div>
          <div>
            <div style={{ fontFamily: 'var(--font-heading)', fontWeight: '800', fontSize: '1.15rem', color: '#ffffff' }}>
              MOUSA CAR PARTS
            </div>
            <div style={{ fontSize: '0.72rem', color: '#94a3b8' }}>
              {lang === 'ar' ? 'موسى لقطع السيارات والمخزون' : 'Auto Parts & POS System'}
            </div>
          </div>
        </div>

        {/* Language Switcher Button */}
        <div style={{ padding: '0 0.75rem 1rem 0.75rem' }}>
          <button
            onClick={toggleLanguage}
            style={{
              width: '100%',
              padding: '0.55rem 0.75rem',
              borderRadius: '8px',
              background: lang === 'ar' ? '#10b981' : '#3b82f6',
              color: '#ffffff',
              border: 'none',
              fontWeight: '700',
              fontSize: '0.85rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem',
              fontFamily: "'Cairo', sans-serif"
            }}
          >
            <Languages size={16} />
            {lang === 'ar' ? '🇸🇦 العربية (نشط)' : '🇬🇧 English (Active)'}
          </button>
        </div>

        <div className="sidebar-nav">
          <button
            className={`nav-item ${activeTab === 'inventory' ? 'active' : ''}`}
            onClick={() => setActiveTab('inventory')}
          >
            <Package size={18} /> {lang === 'ar' ? 'دليل المخزون' : 'Stock Directory'}
          </button>
          
          {isManagerOrAdmin && (
            <button
              className="nav-item"
              onClick={() => setIsImportModalOpen(true)}
              style={{ color: '#60a5fa' }}
            >
              <Languages size={18} /> {lang === 'ar' ? 'سحب مخزون PDF / Excel' : 'Import Stock (PDF / Excel)'}
            </button>
          )}

          <button
            className={`nav-item ${activeTab === 'pos' ? 'active' : ''}`}
            onClick={() => setActiveTab('pos')}
          >
            <ShoppingCart size={18} /> {lang === 'ar' ? 'نقطة البيع الكاشير' : 'Counter POS Checkout'}
          </button>
          
          <button
            className={`nav-item ${activeTab === 'orders' ? 'active' : ''}`}
            onClick={() => setActiveTab('orders')}
          >
            <History size={18} /> {lang === 'ar' ? 'سجل المبيعات' : 'Sales Orders Log'}
          </button>

          {isAdmin && (
            <button
              className="nav-item"
              onClick={() => setIsUserMgmtOpen(true)}
              style={{ color: '#c084fc' }}
            >
              <Users size={18} /> {lang === 'ar' ? 'إدارة المستخدمين' : 'User Accounts'}
            </button>
          )}
        </div>

        {/* Logged in User Profile Footer */}
        <div style={{ padding: '0.85rem', background: 'rgba(255, 255, 255, 0.05)', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontWeight: '700', fontSize: '0.88rem', color: 'white', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
              <User size={14} style={{ color: '#3b82f6' }} /> {user.name || user.username}
            </div>
            <div style={{ fontSize: '0.72rem', color: user.role === 'Admin' ? '#c084fc' : user.role === 'Manager' ? '#60a5fa' : '#34d399', fontWeight: '600' }}>
              Role: {user.role}
            </div>
          </div>

          <button
            onClick={handleLogout}
            style={{ background: 'rgba(239, 68, 68, 0.15)', border: '1px solid rgba(239, 68, 68, 0.3)', color: '#fca5a5', padding: '0.4rem', borderRadius: '6px', cursor: 'pointer' }}
            title="Log Out"
          >
            <LogOut size={16} />
          </button>
        </div>
      </div>

      {/* Main Screen Container */}
      <div className="main-content">
        {/* Top Header */}
        <div className="top-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
            <div>
              <div style={{ fontSize: '0.72rem', textTransform: 'uppercase', color: 'var(--text-muted)', letterSpacing: '0.06em', fontWeight: '700' }}>
                {lang === 'ar' ? 'مستودع قطع الغيار والسيارات' : 'Auto Parts & Warehouse POS'}
              </div>
              <div style={{ fontWeight: '800', fontSize: '1.15rem', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '0.55rem' }}>
                {lang === 'ar' ? 'موسى لقطع السيارات' : 'Mousa Car Parts Store'}
                <span style={{ fontSize: '0.72rem', padding: '0.15rem 0.6rem', borderRadius: '12px', background: '#ecfdf5', color: '#047857', border: '1px solid #a7f3d0', fontWeight: '700' }}>
                  🟢 Live System ({products.length} Parts)
                </span>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            {isManagerOrAdmin && (
              <button
                onClick={() => setIsImportModalOpen(true)}
                className="btn-secondary"
                style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', background: '#eff6ff', color: '#2563eb', border: '1px solid #bfdbfe' }}
              >
                <Languages size={16} /> Import Stock (PDF/Excel)
              </button>
            )}

            {isManagerOrAdmin && (
              <button
                onClick={() => {
                  setEditingItem(null);
                  setIsItemModalOpen(true);
                }}
                className="btn-primary"
                style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
              >
                <Plus size={16} /> New Auto Part
              </button>
            )}
          </div>
        </div>

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
              {activeTab === 'store' && (
                <CustomerStore
                  products={products}
                  lang={lang}
                  onPlaceOrder={handleCreateOrder}
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
