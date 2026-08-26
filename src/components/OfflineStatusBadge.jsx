import React, { useState, useEffect } from 'react';
import { Wifi, WifiOff, RefreshCw, CheckCircle2 } from 'lucide-react';
import { getPendingOfflineOrdersCount, syncOfflineOrdersQueue } from '../utils/offlineStore';

export default function OfflineStatusBadge({ token }) {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [pendingCount, setPendingCount] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncStatusMsg, setSyncStatusMsg] = useState('');

  const checkPending = async () => {
    const count = await getPendingOfflineOrdersCount();
    setPendingCount(count);
  };

  const handleSync = async () => {
    if (!navigator.onLine || isSyncing) return;
    setIsSyncing(true);
    setSyncStatusMsg('جاري مزامنة فواتير الأوفلاين...');
    try {
      const res = await syncOfflineOrdersQueue(token);
      await checkPending();
      if (res.synced > 0) {
        setSyncStatusMsg(`تمت مزامنة ${res.synced} فاتورة أوفلاين بنجاح! 🎉`);
        setTimeout(() => setSyncStatusMsg(''), 4000);
      }
    } catch (e) {
      console.warn('Sync error:', e);
    } finally {
      setIsSyncing(false);
    }
  };

  useEffect(() => {
    checkPending();

    const handleOnline = () => {
      setIsOnline(true);
      handleSync();
    };
    const handleOffline = () => {
      setIsOnline(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    const interval = setInterval(checkPending, 10000);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearInterval(interval);
    };
  }, [token]);

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontFamily: "'Cairo', sans-serif" }}>
      
      {/* Online / Offline Status Badge */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.4rem',
          padding: '0.3rem 0.75rem',
          borderRadius: '20px',
          fontSize: '0.78rem',
          fontWeight: '800',
          background: isOnline ? '#ecfdf5' : '#fffbeb',
          border: isOnline ? '1px solid #a7f3d0' : '1px solid #fde68a',
          color: isOnline ? '#047857' : '#b45309',
          boxShadow: isOnline ? '0 2px 8px rgba(4, 120, 87, 0.1)' : '0 2px 8px rgba(180, 83, 9, 0.15)'
        }}
        title={isOnline ? 'النظام متصل بالسيرفر والبيانات محدثة' : 'النظام يعمل في وضع الأوفلاين، سيتم المزامنة تلقائياً عند الاتصال'}
      >
        {isOnline ? (
          <>
            <Wifi size={14} style={{ color: '#059669' }} />
            <span>متصل بالسيرفر 🟢</span>
          </>
        ) : (
          <>
            <WifiOff size={14} style={{ color: '#d97706' }} />
            <span>أوفلاين (وضع محلي) 📡</span>
          </>
        )}
      </div>

      {/* Pending Offline Orders Count Badge & Manual Sync Button */}
      {pendingCount > 0 && (
        <button
          type="button"
          onClick={handleSync}
          disabled={!isOnline || isSyncing}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.35rem',
            padding: '0.3rem 0.75rem',
            borderRadius: '20px',
            fontSize: '0.78rem',
            fontWeight: '800',
            background: '#eff6ff',
            border: '1px solid #bfdbfe',
            color: '#1d4ed8',
            cursor: isOnline && !isSyncing ? 'pointer' : 'not-allowed',
            opacity: isOnline ? 1 : 0.7
          }}
        >
          <RefreshCw size={13} className={isSyncing ? 'spin' : ''} />
          <span>{pendingCount} فواتير قيد المزامنة</span>
        </button>
      )}

      {/* Sync Status Floating Message */}
      {syncStatusMsg && (
        <div style={{ fontSize: '0.75rem', fontWeight: '800', color: '#047857', background: '#dcfce7', padding: '0.2rem 0.6rem', borderRadius: '8px' }}>
          {syncStatusMsg}
        </div>
      )}
    </div>
  );
}
