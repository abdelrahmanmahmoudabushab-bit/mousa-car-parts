import React, { useState, useEffect } from 'react';
import { Settings, Store, Percent, Users, Database, Download, Languages, Save, CheckCircle, RefreshCw, UserPlus, Trash2, ShieldCheck, FileSpreadsheet, HardDrive, Globe } from 'lucide-react';

export default function SettingsPage({ token, user, lang, setLang, onBackToPortal, onProductsUpdated }) {
  const [activeTab, setActiveTab] = useState('store'); // 'store' | 'tax' | 'users' | 'database' | 'backup'
  const [savedSuccess, setSavedSuccess] = useState('');

  // Store Settings (saved in localStorage for persistence across reloads)
  const [storeInfo, setStoreInfo] = useState(() => {
    try {
      const saved = localStorage.getItem('mousa_store_info');
      return saved ? JSON.parse(saved) : {
        name: 'MOUSA CAR PARTS',
        subName: 'AUTO PARTS & OEM DISTRIBUTOR · موسى لقطع السيارات',
        phone: '(555) 019-8200',
        taxId: '#98-201823',
        address: 'Main Auto Spare Parts District, Industrial Zone 4',
        taxRate: 8.0,
        currency: 'USD',
        currencySymbol: '$'
      };
    } catch {
      return {
        name: 'MOUSA CAR PARTS',
        subName: 'AUTO PARTS & OEM DISTRIBUTOR · موسى لقطع السيارات',
        phone: '(555) 019-8200',
        taxId: '#98-201823',
        address: 'Main Auto Spare Parts District, Industrial Zone 4',
        taxRate: 8.0,
        currency: 'USD',
        currencySymbol: '$'
      };
    }
  });

  // User Accounts State
  const [users, setUsers] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newUsername, setNewUsername] = useState('');
  const [newName, setNewName] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newRole, setNewRole] = useState('Cashier');
  const [userError, setUserError] = useState('');

  // DB Sync State
  const [dbStatus, setDbStatus] = useState(null);
  const [loadingDbStatus, setLoadingDbStatus] = useState(false);

  // Fetch Users & DB status on mount or tab change
  const fetchUsers = async () => {
    try {
      setLoadingUsers(true);
      const res = await fetch('/api/users', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.users) setUsers(data.users);
    } catch (err) {
      console.error('Error fetching users:', err);
    } finally {
      setLoadingUsers(false);
    }
  };

  const fetchDbStatus = async () => {
    try {
      setLoadingDbStatus(true);
      const res = await fetch('/api/bootstrap');
      const data = await res.json();
      setDbStatus({
        productCount: data.products?.length || 0,
        categoryCount: data.categories?.length || 0,
        orderCount: data.orders?.length || 0,
        source: data.dbSource || 'Local JSON'
      });
    } catch (err) {
      console.error('Error fetching DB status:', err);
    } finally {
      setLoadingDbStatus(false);
    }
  };

  useEffect(() => {
    fetchUsers();
    fetchDbStatus();
  }, []);

  const handleSaveStoreInfo = (e) => {
    if (e) e.preventDefault();
    localStorage.setItem('mousa_store_info', JSON.stringify(storeInfo));
    setSavedSuccess(lang === 'ar' ? 'تم حفظ الإعدادات بنجاح! 💾' : 'Settings saved successfully!');
    setTimeout(() => setSavedSuccess(''), 3500);
  };

  const handleCreateUser = async (e) => {
    e.preventDefault();
    if (!newUsername || !newPassword || !newName) {
      setUserError('Please fill in all required user fields.');
      return;
    }

    try {
      setUserError('');
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ username: newUsername, password: newPassword, name: newName, role: newRole })
      });

      const data = await res.json();
      if (res.ok && data.users) {
        setUsers(data.users);
        setShowAddForm(false);
        setNewUsername('');
        setNewName('');
        setNewPassword('');
        setNewRole('Cashier');
        setSavedSuccess(lang === 'ar' ? 'تم إنشاء الحساب بنجاح! 👤' : 'User account created!');
        setTimeout(() => setSavedSuccess(''), 3500);
      } else {
        setUserError(data.error || 'Failed to create user account');
      }
    } catch (err) {
      setUserError('Error creating user: ' + err.message);
    }
  };

  const handleDeleteUser = async (id, uname) => {
    if (!window.confirm(`Are you sure you want to delete user '${uname}'?`)) return;

    try {
      const res = await fetch(`/api/users/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok && data.users) {
        setUsers(data.users);
      } else {
        alert(data.error || 'Failed to delete user');
      }
    } catch (err) {
      alert('Error deleting user: ' + err.message);
    }
  };

  const handleExportFullJsonBackup = async () => {
    try {
      const res = await fetch('/api/bootstrap');
      const data = await res.json();
      const jsonStr = JSON.stringify(data, null, 2);
      const blob = new Blob([jsonStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `Mousa_POS_Backup_${new Date().toISOString().slice(0, 10)}.json`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      alert('Backup export failed: ' + err.message);
    }
  };

  const handleClearAllData = async () => {
    const confirmationPrompt = window.prompt(
      lang === 'ar' 
        ? '⚠️ تحذير شديد: سيتم مسح كافة قطع الغيار وفواتير المبيعات بالكامل!\n\nللتأكيد وإتمام المسح اكتب كلمة: DELETE' 
        : '⚠️ DANGER: This will permanently delete ALL products and sales order history!\n\nType DELETE to confirm wiping all data:'
    );

    if (confirmationPrompt !== 'DELETE') {
      alert(lang === 'ar' ? 'تم إلغاء عملية المسح.' : 'Wipe operation cancelled.');
      return;
    }

    try {
      const res = await fetch('/api/admin/clear-all-data', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok && data.success) {
        if (onProductsUpdated) onProductsUpdated([]);
        alert(lang === 'ar' ? 'تم مسح كافة البيانات بنجاح!' : 'All inventory products and sales order data cleared!');
        fetchDbStatus();
      } else {
        alert(data.error || 'Failed to clear data');
      }
    } catch (err) {
      alert('Error clearing data: ' + err.message);
    }
  };

  return (
    <div style={{ padding: '1.75rem', display: 'flex', flexDirection: 'column', gap: '1.25rem', height: '100%', overflowY: 'auto', background: '#f8fafc', fontFamily: "'Cairo', sans-serif" }}>
      
      {/* Top Header Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '18px', padding: '1.25rem 1.5rem', boxShadow: '0 4px 14px rgba(15, 23, 42, 0.04)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
          <div style={{ width: '46px', height: '46px', borderRadius: '14px', background: '#0f172a', color: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Settings size={24} />
          </div>
          <div>
            <h1 style={{ fontSize: '1.4rem', fontWeight: '800', color: '#0f172a', margin: 0 }}>
              {lang === 'ar' ? 'إعدادات النظام والتحكم ⚙️' : 'System Settings & Controls'}
            </h1>
            <p style={{ fontSize: '0.85rem', color: '#64748b', margin: '0.2rem 0 0 0', fontWeight: '600' }}>
              {lang === 'ar' ? 'تخصيص معلومات المحل، الضريبة، حسابات المستخدمين والقاعدة السحابية' : 'Configure store details, tax rates, user permissions, and database sync.'}
            </p>
          </div>
        </div>

        {savedSuccess && (
          <div style={{ padding: '0.5rem 1rem', background: '#ecfdf5', border: '1px solid #a7f3d0', color: '#047857', borderRadius: '12px', fontSize: '0.88rem', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <CheckCircle size={18} /> {savedSuccess}
          </div>
        )}
      </div>

      {/* Settings Navigation Tabs */}
      <div style={{ display: 'flex', gap: '0.5rem', overflowX: 'auto', background: '#ffffff', padding: '0.5rem', borderRadius: '14px', border: '1px solid #e2e8f0' }}>
        {[
          { id: 'store', labelAr: 'معلومات المحل 🏪', labelEn: 'Store Info', icon: Store },
          { id: 'tax', labelAr: 'الضريبة والأسعار 🏷️', labelEn: 'Tax & Pricing', icon: Percent },
          { id: 'users', labelAr: 'حسابات المستخدمين 👥', labelEn: 'User Accounts', icon: Users },
          { id: 'database', labelAr: 'قاعدة البيانات والمزامنة ⚡', labelEn: 'Database & Sync', icon: Database },
          { id: 'backup', labelAr: 'النسخ الاحتياطي وإعادة الضبط 💾', labelEn: 'Backup & Reset', icon: Download },
        ].map(t => {
          const Icon = t.icon;
          const isActive = activeTab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.45rem',
                padding: '0.65rem 1.1rem',
                borderRadius: '10px',
                background: isActive ? '#0f172a' : 'transparent',
                color: isActive ? '#ffffff' : '#475569',
                border: 'none',
                fontWeight: '800',
                fontSize: '0.88rem',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                transition: 'all 0.15s ease'
              }}
            >
              <Icon size={17} />
              {lang === 'ar' ? t.labelAr : t.labelEn}
            </button>
          );
        })}
      </div>

      {/* TAB 1: STORE INFO */}
      {activeTab === 'store' && (
        <form onSubmit={handleSaveStoreInfo} style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '18px', padding: '1.75rem', display: 'flex', flexDirection: 'column', gap: '1.25rem', boxShadow: '0 4px 14px rgba(15, 23, 42, 0.03)' }}>
          <h2 style={{ fontSize: '1.15rem', fontWeight: '800', color: '#0f172a', margin: 0, borderBottom: '1px solid #f1f5f9', paddingBottom: '0.75rem' }}>
            {lang === 'ar' ? 'بيانات المحل والفاتورة 🏢' : 'Store Identification & Invoice Info'}
          </h2>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.25rem' }}>
            <div>
              <label style={{ fontSize: '0.85rem', fontWeight: '700', color: '#475569', display: 'block', marginBottom: '0.4rem' }}>
                {lang === 'ar' ? 'اسم المحل / المؤسسة الرئيسي *' : 'Main Store Title *'}
              </label>
              <input
                type="text"
                value={storeInfo.name}
                onChange={e => setStoreInfo({ ...storeInfo, name: e.target.value })}
                className="input-field-sm"
                style={{ width: '100%', height: '44px', fontWeight: '700' }}
                required
              />
            </div>

            <div>
              <label style={{ fontSize: '0.85rem', fontWeight: '700', color: '#475569', display: 'block', marginBottom: '0.4rem' }}>
                {lang === 'ar' ? 'العنوان الفرعي في الفاتورة' : 'Invoice Subtitle / Tagline'}
              </label>
              <input
                type="text"
                value={storeInfo.subName}
                onChange={e => setStoreInfo({ ...storeInfo, subName: e.target.value })}
                className="input-field-sm"
                style={{ width: '100%', height: '44px' }}
              />
            </div>

            <div>
              <label style={{ fontSize: '0.85rem', fontWeight: '700', color: '#475569', display: 'block', marginBottom: '0.4rem' }}>
                {lang === 'ar' ? 'رقم الهاتف / التواصل 📞' : 'Phone Number'}
              </label>
              <input
                type="text"
                value={storeInfo.phone}
                onChange={e => setStoreInfo({ ...storeInfo, phone: e.target.value })}
                className="input-field-sm"
                style={{ width: '100%', height: '44px' }}
              />
            </div>

            <div>
              <label style={{ fontSize: '0.85rem', fontWeight: '700', color: '#475569', display: 'block', marginBottom: '0.4rem' }}>
                {lang === 'ar' ? 'الرقم الضريبي (Tax ID) 📑' : 'Tax Registration ID'}
              </label>
              <input
                type="text"
                value={storeInfo.taxId}
                onChange={e => setStoreInfo({ ...storeInfo, taxId: e.target.value })}
                className="input-field-sm"
                style={{ width: '100%', height: '44px', fontFamily: 'var(--font-mono)' }}
              />
            </div>
          </div>

          <div>
            <label style={{ fontSize: '0.85rem', fontWeight: '700', color: '#475569', display: 'block', marginBottom: '0.4rem' }}>
              {lang === 'ar' ? 'عنوان الفرع والمستودع 📍' : 'Warehouse / Store Address'}
            </label>
            <input
              type="text"
              value={storeInfo.address}
              onChange={e => setStoreInfo({ ...storeInfo, address: e.target.value })}
              className="input-field-sm"
              style={{ width: '100%', height: '44px' }}
            />
          </div>

          <button type="submit" className="btn-sand" style={{ alignSelf: 'flex-start', padding: '0.75rem 1.75rem', fontSize: '0.95rem', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Save size={18} /> {lang === 'ar' ? 'حفظ معلومات المحل' : 'Save Store Details'}
          </button>
        </form>
      )}

      {/* TAB 2: TAX & PRICING */}
      {activeTab === 'tax' && (
        <form onSubmit={handleSaveStoreInfo} style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '18px', padding: '1.75rem', display: 'flex', flexDirection: 'column', gap: '1.25rem', boxShadow: '0 4px 14px rgba(15, 23, 42, 0.03)' }}>
          <h2 style={{ fontSize: '1.15rem', fontWeight: '800', color: '#0f172a', margin: 0, borderBottom: '1px solid #f1f5f9', paddingBottom: '0.75rem' }}>
            {lang === 'ar' ? 'إعدادات الضريبة والعملة 💰' : 'Tax Rate & Currency Settings'}
          </h2>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.25rem' }}>
            <div>
              <label style={{ fontSize: '0.85rem', fontWeight: '700', color: '#475569', display: 'block', marginBottom: '0.4rem' }}>
                {lang === 'ar' ? 'نسبة ضريبة المبيعات (%)' : 'Default Tax Rate (%)'}
              </label>
              <input
                type="number"
                step="0.1"
                value={storeInfo.taxRate}
                onChange={e => setStoreInfo({ ...storeInfo, taxRate: parseFloat(e.target.value) || 0 })}
                className="input-field-sm"
                style={{ width: '100%', height: '44px', fontWeight: '800', fontSize: '1.1rem' }}
              />
              <span style={{ fontSize: '0.78rem', color: '#64748b', marginTop: '0.3rem', display: 'block' }}>
                {lang === 'ar' ? 'تطبق تلقائياً على فواتير الكاشير' : 'Automatically applied during cashier checkout'}
              </span>
            </div>

            <div>
              <label style={{ fontSize: '0.85rem', fontWeight: '700', color: '#475569', display: 'block', marginBottom: '0.4rem' }}>
                {lang === 'ar' ? 'رمز العملة الأساسية' : 'Currency Symbol'}
              </label>
              <select
                value={storeInfo.currency}
                onChange={e => {
                  const val = e.target.value;
                  const sym = val === 'SAR' ? 'ر.س' : val === 'CNY' ? '¥' : val === 'EUR' ? '€' : '$';
                  setStoreInfo({ ...storeInfo, currency: val, currencySymbol: sym });
                }}
                className="input-field-sm"
                style={{ width: '100%', height: '44px', fontWeight: '800' }}
              >
                <option value="USD">$ USD (دولار أمريكي)</option>
                <option value="SAR">ر.س SAR (ريال سعودي)</option>
                <option value="CNY">¥ CNY (يوان صيني)</option>
                <option value="EUR">€ EUR (يورو)</option>
              </select>
            </div>
          </div>

          <button type="submit" className="btn-sand" style={{ alignSelf: 'flex-start', padding: '0.75rem 1.75rem', fontSize: '0.95rem', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Save size={18} /> {lang === 'ar' ? 'حفظ إعدادات الضريبة' : 'Save Tax Settings'}
          </button>
        </form>
      )}

      {/* TAB 3: USER ACCOUNTS */}
      {activeTab === 'users' && (
        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '18px', padding: '1.75rem', display: 'flex', flexDirection: 'column', gap: '1.25rem', boxShadow: '0 4px 14px rgba(15, 23, 42, 0.03)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #f1f5f9', paddingBottom: '0.75rem' }}>
            <h2 style={{ fontSize: '1.15rem', fontWeight: '800', color: '#0f172a', margin: 0 }}>
              {lang === 'ar' ? 'إدارة حسابات المستخدمين والصلاحيات 👥' : 'User Accounts & Roles'}
            </h2>
            <button
              onClick={() => setShowAddForm(!showAddForm)}
              className="btn-sand"
              style={{ padding: '0.5rem 1rem', fontSize: '0.85rem', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '0.4rem' }}
            >
              <UserPlus size={16} /> {showAddForm ? (lang === 'ar' ? 'إلغاء' : 'Cancel') : (lang === 'ar' ? 'إضافة مستخدم جديد ➕' : 'Add New User')}
            </button>
          </div>

          {showAddForm && (
            <form onSubmit={handleCreateUser} style={{ background: '#f8fafc', padding: '1.25rem', borderRadius: '14px', border: '1px solid #cbd5e1', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <h3 style={{ fontSize: '0.95rem', fontWeight: '800', color: '#0f172a', margin: 0 }}>
                {lang === 'ar' ? 'إنشاء حساب جديد في النظام' : 'Create New Account'}
              </h3>

              {userError && (
                <div style={{ padding: '0.5rem 0.75rem', background: '#fef2f2', color: '#b91c1c', borderRadius: '8px', fontSize: '0.82rem', fontWeight: '700' }}>
                  {userError}
                </div>
              )}

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.85rem' }}>
                <div>
                  <label style={{ fontSize: '0.78rem', color: '#475569', fontWeight: '700', display: 'block', marginBottom: '0.25rem' }}>الاسم الكامل *</label>
                  <input type="text" value={newName} onChange={e => setNewName(e.target.value)} placeholder="مثال: أحمد علي" className="input-field-sm" style={{ width: '100%' }} />
                </div>
                <div>
                  <label style={{ fontSize: '0.78rem', color: '#475569', fontWeight: '700', display: 'block', marginBottom: '0.25rem' }}>اسم المستخدم (Username) *</label>
                  <input type="text" value={newUsername} onChange={e => setNewUsername(e.target.value)} placeholder="مثال: ahmed" className="input-field-sm" style={{ width: '100%' }} />
                </div>
                <div>
                  <label style={{ fontSize: '0.78rem', color: '#475569', fontWeight: '700', display: 'block', marginBottom: '0.25rem' }}>كلمة المرور *</label>
                  <input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} placeholder="••••••••" className="input-field-sm" style={{ width: '100%' }} />
                </div>
                <div>
                  <label style={{ fontSize: '0.78rem', color: '#475569', fontWeight: '700', display: 'block', marginBottom: '0.25rem' }}>الصلاحية (Role)</label>
                  <select value={newRole} onChange={e => setNewRole(e.target.value)} className="input-field-sm" style={{ width: '100%' }}>
                    <option value="Cashier">كاشير (Cashier - البيع فقط)</option>
                    <option value="Manager">مدير مخزون (Manager - تعديل وإدخال)</option>
                    <option value="Admin">مدير عام (Admin - كافة الصلاحيات)</option>
                  </select>
                </div>
              </div>

              <button type="submit" className="btn-primary" style={{ alignSelf: 'flex-end', padding: '0.5rem 1.25rem', fontSize: '0.85rem' }}>
                {lang === 'ar' ? 'حفظ الحساب' : 'Save Account'}
              </button>
            </form>
          )}

          <div style={{ border: '1px solid #e2e8f0', borderRadius: '12px', overflow: 'hidden' }}>
            {loadingUsers ? (
              <div style={{ padding: '2rem', textAlign: 'center', color: '#64748b' }}>
                <RefreshCw className="spin" size={20} /> جاري تحميل قائمة المستخدمين...
              </div>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.88rem', textAlign: 'left' }}>
                <thead>
                  <tr style={{ background: '#f8fafc', color: '#475569', fontSize: '0.78rem', fontWeight: '800', borderBottom: '1px solid #e2e8f0' }}>
                    <th style={{ padding: '0.75rem 1rem' }}>الاسم</th>
                    <th style={{ padding: '0.75rem 1rem' }}>اسم المستخدم</th>
                    <th style={{ padding: '0.75rem 1rem' }}>الصلاحية</th>
                    <th style={{ padding: '0.75rem 1rem' }}>تاريخ الإنشاء</th>
                    <th style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>إجراء</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map(u => (
                    <tr key={u.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '0.75rem 1rem', fontWeight: '800', color: '#0f172a' }}>{u.name}</td>
                      <td className="mono" style={{ padding: '0.75rem 1rem', color: '#64748b' }}>{u.username}</td>
                      <td style={{ padding: '0.75rem 1rem' }}>
                        <span style={{ padding: '0.2rem 0.6rem', borderRadius: '8px', fontSize: '0.75rem', fontWeight: '800', background: u.role === 'Admin' ? '#f3e8ff' : u.role === 'Manager' ? '#eff6ff' : '#ecfdf5', color: u.role === 'Admin' ? '#7e22ce' : u.role === 'Manager' ? '#1d4ed8' : '#047857' }}>
                          {u.role}
                        </span>
                      </td>
                      <td style={{ padding: '0.75rem 1rem', color: '#64748b', fontSize: '0.8rem' }}>{new Date(u.created_at).toLocaleDateString()}</td>
                      <td style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>
                        <button
                          onClick={() => handleDeleteUser(u.id, u.username)}
                          style={{ padding: '0.35rem 0.65rem', borderRadius: '6px', background: '#fef2f2', border: '1px solid #fecaca', color: '#b91c1c', cursor: 'pointer', fontSize: '0.78rem', fontWeight: '700' }}
                          title="حذف الحساب"
                        >
                          <Trash2 size={14} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* TAB 4: DATABASE & SYNC */}
      {activeTab === 'database' && (
        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '18px', padding: '1.75rem', display: 'flex', flexDirection: 'column', gap: '1.25rem', boxShadow: '0 4px 14px rgba(15, 23, 42, 0.03)' }}>
          <h2 style={{ fontSize: '1.15rem', fontWeight: '800', color: '#0f172a', margin: 0, borderBottom: '1px solid #f1f5f9', paddingBottom: '0.75rem' }}>
            {lang === 'ar' ? 'حالة قاعدة البيانات والمزامنة السحابية ⚡' : 'Database Health & Cloud Sync'}
          </h2>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
            <div style={{ background: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '14px', padding: '1.1rem' }}>
              <div style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: '700' }}>المصدر الحالي</div>
              <div style={{ fontSize: '1.05rem', fontWeight: '800', color: '#0f172a', marginTop: '0.3rem' }}>{dbStatus?.source || 'Supabase PostgreSQL'}</div>
            </div>

            <div style={{ background: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '14px', padding: '1.1rem' }}>
              <div style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: '700' }}>قطع الغيار المسجلة</div>
              <div className="mono" style={{ fontSize: '1.4rem', fontWeight: '900', color: '#d97706', marginTop: '0.2rem' }}>{dbStatus?.productCount?.toLocaleString() || 0}</div>
            </div>

            <div style={{ background: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '14px', padding: '1.1rem' }}>
              <div style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: '700' }}>إجمالي الفواتير</div>
              <div className="mono" style={{ fontSize: '1.4rem', fontWeight: '900', color: '#047857', marginTop: '0.2rem' }}>{dbStatus?.orderCount || 0}</div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem' }}>
            <button onClick={fetchDbStatus} className="btn-sand" style={{ padding: '0.75rem 1.5rem', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <RefreshCw size={18} className={loadingDbStatus ? 'spin' : ''} />
              {lang === 'ar' ? 'مزامنة وإعادة تحميل قاعدة البيانات' : 'Force Refresh & Sync'}
            </button>
          </div>
        </div>
      )}

      {/* TAB 5: BACKUP & RESET */}
      {activeTab === 'backup' && (
        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '18px', padding: '1.75rem', display: 'flex', flexDirection: 'column', gap: '1.5rem', boxShadow: '0 4px 14px rgba(15, 23, 42, 0.03)' }}>
          <div>
            <h2 style={{ fontSize: '1.15rem', fontWeight: '800', color: '#0f172a', margin: 0, borderBottom: '1px solid #f1f5f9', paddingBottom: '0.75rem' }}>
              {lang === 'ar' ? 'النسخ الاحتياطي وتصدير السجلات 💾' : 'Database Backup & Export'}
            </h2>

            <p style={{ color: '#64748b', fontSize: '0.9rem', margin: '0.75rem 0 1rem 0' }}>
              {lang === 'ar' ? 'يمكنك تصدير النسخة الاحتياطية الكاملة لقطع الغيار والفواتير بصيغة JSON أو Excel للحفظ المحلي 🛡️' : 'Download a complete JSON database snapshot or Excel sheet for offline storage.'}
            </p>

            <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
              <button onClick={handleExportFullJsonBackup} className="btn-sand" style={{ padding: '0.85rem 1.5rem', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <HardDrive size={20} />
                {lang === 'ar' ? 'تحميل نسخة احتسابية كاملة (JSON Backup)' : 'Download Full JSON Backup'}
              </button>
            </div>
          </div>

          {/* DANGER ZONE: WIPE / CLEAR ALL DATA */}
          <div style={{ background: '#fef2f2', border: '2px dashed #fecaca', borderRadius: '16px', padding: '1.5rem', marginTop: '0.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', color: '#b91c1c', marginBottom: '0.5rem' }}>
              <Trash2 size={24} />
              <h3 style={{ fontSize: '1.1rem', fontWeight: '900', margin: 0 }}>
                {lang === 'ar' ? 'منطقة الخطر: مسح وإعادة ضبط البيانات بالكامل ⚠️' : 'Danger Zone: Wipe All Data ⚠️'}
              </h3>
            </div>

            <p style={{ fontSize: '0.88rem', color: '#991b1b', margin: '0 0 1.25rem 0', lineHeight: '1.5', fontWeight: '600' }}>
              {lang === 'ar' 
                ? 'سيؤدي النقر على زر المسح أدناه إلى حذف كافة قطع الغيار المخزنة وسجل فواتير المبيعات بالكامل من قاعدة البيانات. يتم إنشاء نسخة احتياطية تلقائياً قبل المسح.' 
                : 'Clicking the wipe button below will permanently delete all inventory products and sales order history from the database. An automated backup is created first.'}
            </p>

            <button
              onClick={handleClearAllData}
              style={{
                background: '#dc2626',
                color: '#ffffff',
                border: '1px solid #b91c1c',
                padding: '0.85rem 1.75rem',
                borderRadius: '12px',
                fontSize: '0.95rem',
                fontWeight: '900',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.6rem',
                boxShadow: '0 4px 14px rgba(220, 38, 38, 0.3)',
                fontFamily: "'Cairo', sans-serif"
              }}
            >
              <Trash2 size={20} />
              {lang === 'ar' ? 'مسح كافة البيانات فوراً 🗑️ (Wipe All Data)' : 'Wipe All Data Permanently 🗑️'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
