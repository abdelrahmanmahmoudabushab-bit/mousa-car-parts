import React, { useState, useMemo } from 'react';
import { TrendingUp, Package, AlertTriangle, ShoppingCart, DollarSign, Award, Car, BarChart3, Download, Sparkles, PieChart, Layers, ArrowUpRight, ArrowDownRight, RefreshCw } from 'lucide-react';

export default function DataAnalyticsDashboard({ products = [], orders = [], categories = [], lang = 'ar' }) {
  const [timeRange, setTimeRange] = useState('all'); // 'all', 'month', 'week'
  const [activeDsTab, setActiveDsTab] = useState('overview'); // 'overview', 'forecast', 'pareto', 'affinity'

  // Safe Array Wrappers
  const safeOrders = useMemo(() => Array.isArray(orders) ? orders : [], [orders]);
  const safeProducts = useMemo(() => Array.isArray(products) ? products : [], [products]);
  const safeCategories = useMemo(() => Array.isArray(categories) ? categories : [], [categories]);

  // Filter orders by time range
  const filteredOrders = useMemo(() => {
    if (timeRange === 'all') return safeOrders;
    const now = new Date();
    const cutoff = new Date();
    if (timeRange === 'month') cutoff.setDate(now.getDate() - 30);
    if (timeRange === 'week') cutoff.setDate(now.getDate() - 7);
    return safeOrders.filter(o => {
      if (!o) return false;
      const d = new Date(o.createdAt || o.date || 0);
      return !isNaN(d.getTime()) && d >= cutoff;
    });
  }, [safeOrders, timeRange]);

  // Total Sales Revenue
  const totalRevenue = useMemo(() => {
    return filteredOrders.reduce((sum, o) => sum + (parseFloat(o?.total || o?.totalAmount || 0)), 0);
  }, [filteredOrders]);

  // Average Order Value
  const aov = useMemo(() => {
    return filteredOrders.length > 0 ? (totalRevenue / filteredOrders.length) : 0;
  }, [totalRevenue, filteredOrders]);

  // Total Physical Stock Pieces & Unique SKUs
  const totalSkuCount = safeProducts.length;
  const totalStockPieces = useMemo(() => {
    return safeProducts.reduce((sum, p) => sum + (Number(p?.quantity || 0)), 0);
  }, [safeProducts]);

  // Low Stock & Out of Stock Items
  const lowStockItems = useMemo(() => {
    return safeProducts.filter(p => Number(p?.quantity || 0) <= Number(p?.minLevel || 5));
  }, [safeProducts]);

  const outOfStockItems = useMemo(() => {
    return safeProducts.filter(p => Number(p?.quantity || 0) <= 0);
  }, [safeProducts]);

  // Top Sold OEM Parts Analysis
  const topSellingParts = useMemo(() => {
    const map = {};
    filteredOrders.forEach(o => {
      if (Array.isArray(o.items)) {
        o.items.forEach(item => {
          const key = item.oem || item.name || 'Unknown';
          if (!map[key]) {
            map[key] = { oem: key, name: item.arName || item.name, qty: 0, revenue: 0 };
          }
          map[key].qty += Number(item.qty || 1);
          map[key].revenue += Number(item.qty || 1) * Number(item.unitPrice || 0);
        });
      }
    });
    return Object.values(map).sort((a, b) => b.qty - a.qty).slice(0, 5);
  }, [filteredOrders]);

  // Sales by Car Model Analysis
  const salesByModel = useMemo(() => {
    const map = {};
    filteredOrders.forEach(o => {
      if (Array.isArray(o.items)) {
        o.items.forEach(item => {
          const model = item.vehicleModel || 'BYD Seagull';
          map[model] = (map[model] || 0) + (Number(item.qty || 1) * Number(item.unitPrice || 0));
        });
      }
    });
    return Object.entries(map).map(([model, revenue]) => ({ model, revenue })).sort((a, b) => b.revenue - a.revenue);
  }, [filteredOrders]);

  // Sales by Category Analysis
  const salesByCategory = useMemo(() => {
    const map = {};
    filteredOrders.forEach(o => {
      if (Array.isArray(o.items)) {
        o.items.forEach(item => {
          const catId = item.categoryId || 'cat-brakes';
          const catObj = categories.find(c => c.id === catId);
          const catName = catObj ? catObj.name : 'قطع عامة';
          map[catName] = (map[catName] || 0) + (Number(item.qty || 1) * Number(item.unitPrice || 0));
        });
      }
    });
    return Object.entries(map).map(([category, revenue]) => ({ category, revenue })).sort((a, b) => b.revenue - a.revenue);
  }, [filteredOrders, safeCategories]);

  // 1. DATA SCIENCE MODEL: ML 30-Day Demand Forecasting & Days-of-Stock Remaining (DSR)
  const mlDemandForecast = useMemo(() => {
    const daysPeriod = timeRange === 'week' ? 7 : (timeRange === 'month' ? 30 : 60);
    const map = {};

    filteredOrders.forEach(o => {
      if (Array.isArray(o.items)) {
        o.items.forEach(item => {
          const key = item.oem || item.name || 'Unknown';
          if (!map[key]) {
            map[key] = {
              id: item.id,
              oem: key,
              name: item.arName || item.name,
              vehicleModel: item.vehicleModel || 'BYD Seagull',
              currentStock: Number(item.quantity || 0),
              unitPrice: Number(item.unitPrice || 0),
              soldQty: 0
            };
          }
          map[key].soldQty += Number(item.qty || 1);
        });
      }
    });

    // Also include products that haven't sold yet
    safeProducts.forEach(p => {
      if (!p) return;
      const key = p.oem || p.name;
      if (!key) return;
      if (!map[key]) {
        map[key] = {
          id: p.id,
          oem: key,
          name: p.arName || p.name,
          vehicleModel: p.vehicleModel || 'BYD Seagull',
          currentStock: Number(p.quantity || 0),
          unitPrice: Number(p.unitPrice || 0),
          soldQty: 0
        };
      } else {
        map[key].currentStock = Number(p.quantity || 0);
      }
    });

    return Object.values(map).map(item => {
      const dailyVelocity = item.soldQty / daysPeriod;
      const forecastedDemand30 = Math.ceil(dailyVelocity * 30);
      const dsr = dailyVelocity > 0 ? Math.round(item.currentStock / dailyVelocity) : 999;
      const isUrgentStockout = dsr <= 7 && item.currentStock > 0;
      const isOut = item.currentStock <= 0;

      return {
        ...item,
        dailyVelocity: dailyVelocity.toFixed(2),
        forecastedDemand30,
        dsr: dsr === 999 ? '∞' : dsr,
        isUrgentStockout,
        isOut
      };
    }).sort((a, b) => b.forecastedDemand30 - a.forecastedDemand30);
  }, [filteredOrders, safeProducts, timeRange]);

  // 2. DATA SCIENCE MODEL: Pareto ABC Inventory 80/20 Classification
  const abcParetoAnalysis = useMemo(() => {
    const totalRev = totalRevenue || 1;
    const sorted = [...topSellingParts].sort((a, b) => b.revenue - a.revenue);
    
    let accum = 0;
    return sorted.map(item => {
      accum += item.revenue;
      const accumPercent = (accum / totalRev) * 100;
      let categoryClass = 'C';
      if (accumPercent <= 80) categoryClass = 'A';
      else if (accumPercent <= 95) categoryClass = 'B';

      return {
        ...item,
        revenueShare: ((item.revenue / totalRev) * 100).toFixed(1),
        accumPercent: accumPercent.toFixed(1),
        categoryClass
      };
    });
  }, [topSellingParts, totalRevenue]);

  // 3. DATA SCIENCE MODEL: Market Basket Cross-Sell Affinity (Frequently Bought Together)
  const basketAffinityPairs = useMemo(() => {
    const pairCounts = {};
    let totalCarts = 0;

    filteredOrders.forEach(o => {
      if (Array.isArray(o.items) && o.items.length >= 2) {
        totalCarts++;
        const oems = Array.from(new Set(o.items.map(i => i.oem || i.name).filter(Boolean)));
        for (let i = 0; i < oems.length; i++) {
          for (let j = i + 1; j < oems.length; j++) {
            const pairKey = [oems[i], oems[j]].sort().join(' + ');
            pairCounts[pairKey] = (pairCounts[pairKey] || 0) + 1;
          }
        }
      }
    });

    return Object.entries(pairCounts)
      .map(([pair, count]) => {
        const confidence = totalCarts > 0 ? Math.round((count / totalCarts) * 100) : 0;
        const [oemA, oemB] = pair.split(' + ');
        return { pair, oemA, oemB, count, confidence };
      })
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
  }, [filteredOrders]);

  // Export Low Stock Purchase Order CSV for Suppliers
  const exportLowStockCSV = () => {
    if (lowStockItems.length === 0) {
      alert('لا توجد قطع منخفضة المخزون حالياً! جميع القطع متوفرة بكميات جيدة 👍');
      return;
    }

    let csvContent = "\uFEFF"; // UTF-8 BOM for Arabic Excel
    csvContent += "OEM Code,Part Name (Arabic),Vehicle Model,Current Stock,Min Level,Suggested Order Qty,Unit Cost ($)\n";

    lowStockItems.forEach(item => {
      const suggestedQty = Math.max(10, (Number(item.minLevel || 5) * 2) - Number(item.quantity || 0));
      const row = [
        `"${item.oem || ''}"`,
        `"${item.arName || item.name || ''}"`,
        `"${item.vehicleModel || ''}"`,
        item.quantity || 0,
        item.minLevel || 5,
        suggestedQty,
        item.costPrice || 0
      ].join(",");
      csvContent += row + "\n";
    });

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `mousa_low_stock_reorder_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div style={{ flex: 1, padding: '1.5rem', background: '#f4f6f9', fontFamily: "'Cairo', sans-serif", overflowY: 'auto' }}>
      
      {/* Header & Control Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.65rem', fontWeight: '900', color: '#0f172a', margin: 0, display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <BarChart3 size={28} style={{ color: '#7c3aed' }} /> لوحة تحليلات البيانات والذكاء التجاري 📊🤖
          </h1>
          <p style={{ color: '#64748b', fontSize: '0.88rem', margin: '0.3rem 0 0 0', fontWeight: '600' }}>
            تحليل ذكي لجميع المبيعات والمخزون، تقارير الأرباح، وتوصيات المشتريات التلقائية لقطع غيار BYD
          </p>
        </div>

        {/* Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          
          {/* Time Filter Pill */}
          <div style={{ background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '12px', padding: '0.25rem', display: 'flex', gap: '0.25rem' }}>
            <button
              onClick={() => setTimeRange('all')}
              style={{ padding: '0.35rem 0.85rem', borderRadius: '8px', border: 'none', background: timeRange === 'all' ? '#7c3aed' : 'transparent', color: timeRange === 'all' ? '#ffffff' : '#64748b', fontWeight: '800', fontSize: '0.8rem', cursor: 'pointer' }}
            >
              الكل
            </button>
            <button
              onClick={() => setTimeRange('month')}
              style={{ padding: '0.35rem 0.85rem', borderRadius: '8px', border: 'none', background: timeRange === 'month' ? '#7c3aed' : 'transparent', color: timeRange === 'month' ? '#ffffff' : '#64748b', fontWeight: '800', fontSize: '0.8rem', cursor: 'pointer' }}
            >
              آخر 30 يوم
            </button>
            <button
              onClick={() => setTimeRange('week')}
              style={{ padding: '0.35rem 0.85rem', borderRadius: '8px', border: 'none', background: timeRange === 'week' ? '#7c3aed' : 'transparent', color: timeRange === 'week' ? '#ffffff' : '#64748b', fontWeight: '800', fontSize: '0.8rem', cursor: 'pointer' }}
            >
              آخر 7 أيام
            </button>
          </div>

          {/* Export Reorder CSV Button */}
          <button
            onClick={exportLowStockCSV}
            className="btn-sand"
            style={{ padding: '0.65rem 1.1rem', borderRadius: '12px', fontSize: '0.85rem', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '0.4rem', boxShadow: '0 4px 12px rgba(217, 119, 6, 0.2)' }}
          >
            <Download size={16} /> تصدير تقرير المشتريات والنواقص 📥
          </button>
        </div>
      </div>

      {/* 🔬 DATA SCIENCE MODEL SUB-TABS */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.25rem', overflowX: 'auto', paddingBottom: '0.25rem' }}>
        <button
          onClick={() => setActiveDsTab('overview')}
          style={{
            padding: '0.5rem 1.1rem',
            borderRadius: '12px',
            border: activeDsTab === 'overview' ? '2px solid #7c3aed' : '1px solid #cbd5e1',
            background: activeDsTab === 'overview' ? '#7c3aed' : '#ffffff',
            color: activeDsTab === 'overview' ? '#ffffff' : '#475569',
            fontWeight: '800',
            fontSize: '0.85rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.4rem'
          }}
        >
          <BarChart3 size={16} /> 📊 المؤشرات العامة (KPIs)
        </button>

        <button
          onClick={() => setActiveDsTab('forecast')}
          style={{
            padding: '0.5rem 1.1rem',
            borderRadius: '12px',
            border: activeDsTab === 'forecast' ? '2px solid #7c3aed' : '1px solid #cbd5e1',
            background: activeDsTab === 'forecast' ? '#7c3aed' : '#ffffff',
            color: activeDsTab === 'forecast' ? '#ffffff' : '#475569',
            fontWeight: '800',
            fontSize: '0.85rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.4rem'
          }}
        >
          <Sparkles size={16} /> 🔮 التنبؤ بالطلب المستقبلي (30-Day ML Forecast)
        </button>

        <button
          onClick={() => setActiveDsTab('pareto')}
          style={{
            padding: '0.5rem 1.1rem',
            borderRadius: '12px',
            border: activeDsTab === 'pareto' ? '2px solid #7c3aed' : '1px solid #cbd5e1',
            background: activeDsTab === 'pareto' ? '#7c3aed' : '#ffffff',
            color: activeDsTab === 'pareto' ? '#ffffff' : '#475569',
            fontWeight: '800',
            fontSize: '0.85rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.4rem'
          }}
        >
          <PieChart size={16} /> 📈 تصنيف باريتو ABC (80/20 Rule)
        </button>

        <button
          onClick={() => setActiveDsTab('affinity')}
          style={{
            padding: '0.5rem 1.1rem',
            borderRadius: '12px',
            border: activeDsTab === 'affinity' ? '2px solid #7c3aed' : '1px solid #cbd5e1',
            background: activeDsTab === 'affinity' ? '#7c3aed' : '#ffffff',
            color: activeDsTab === 'affinity' ? '#ffffff' : '#475569',
            fontWeight: '800',
            fontSize: '0.85rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.4rem'
          }}
        >
          <Layers size={16} /> 🔗 ارتباط سلة الشراء (Cross-Sell)
        </button>
      </div>

      {/* 📊 SUB-TAB 1: OVERVIEW & KPIS */}
      {activeDsTab === 'overview' && (
        <>
          {/* 📊 TOP KPI SUMMARY CARDS */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.25rem', marginBottom: '1.5rem' }}>
            
            {/* KPI 1: REVENUE */}
            <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '18px', padding: '1.25rem', boxShadow: '0 4px 16px rgba(0,0,0,0.03)', display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <div style={{ width: '52px', height: '52px', borderRadius: '14px', background: '#f3e8ff', color: '#7c3aed', border: '1px solid #d8b4fe', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <DollarSign size={26} />
              </div>
              <div>
                <div style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: '700' }}>إجمالي الإيرادات</div>
                <div className="mono" style={{ fontSize: '1.4rem', fontWeight: '900', color: '#7c3aed' }}>
                  ${totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
                <div style={{ fontSize: '0.72rem', color: '#059669', fontWeight: '700', marginTop: '0.15rem' }}>
                  <ArrowUpRight size={12} inline /> {filteredOrders.length} فاتورة مباعة
                </div>
              </div>
            </div>

            {/* KPI 2: AVERAGE ORDER VALUE (AOV) */}
            <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '18px', padding: '1.25rem', boxShadow: '0 4px 16px rgba(0,0,0,0.03)', display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <div style={{ width: '52px', height: '52px', borderRadius: '14px', background: '#eff6ff', color: '#2563eb', border: '1px solid #bfdbfe', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <ShoppingCart size={26} />
              </div>
              <div>
                <div style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: '700' }}>متوسط قيمة الفاتورة</div>
                <div className="mono" style={{ fontSize: '1.4rem', fontWeight: '900', color: '#2563eb' }}>
                  ${aov.toFixed(2)}
                </div>
                <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: '700', marginTop: '0.15rem' }}>
                  معدل قيمة الشراء للعميل
                </div>
              </div>
            </div>

            {/* KPI 3: TOTAL INVENTORY SKUS & PIECES */}
            <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '18px', padding: '1.25rem', boxShadow: '0 4px 16px rgba(0,0,0,0.03)', display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <div style={{ width: '52px', height: '52px', borderRadius: '14px', background: '#ecfdf5', color: '#047857', border: '1px solid #a7f3d0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Package size={26} />
              </div>
              <div>
                <div style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: '700' }}>المخزون المتوفر</div>
                <div className="mono" style={{ fontSize: '1.4rem', fontWeight: '900', color: '#047857' }}>
                  {totalStockPieces.toLocaleString()} <span style={{ fontSize: '0.85rem' }}>قطعة</span>
                </div>
                <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: '700', marginTop: '0.15rem' }}>
                  من إجمالي {totalSkuCount} صنف مسجل
                </div>
              </div>
            </div>

            {/* KPI 4: LOW & OUT OF STOCK ALERTS */}
            <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '18px', padding: '1.25rem', boxShadow: '0 4px 16px rgba(0,0,0,0.03)', display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <div style={{ width: '52px', height: '52px', borderRadius: '14px', background: '#fffbeb', color: '#d97706', border: '1px solid #fde68a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <AlertTriangle size={26} />
              </div>
              <div>
                <div style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: '700' }}>نواقص المخزون ⚠️</div>
                <div className="mono" style={{ fontSize: '1.4rem', fontWeight: '900', color: '#dc2626' }}>
                  {lowStockItems.length} <span style={{ fontSize: '0.85rem' }}>أصناف حرجة</span>
                </div>
                <div style={{ fontSize: '0.72rem', color: '#dc2626', fontWeight: '800', marginTop: '0.15rem' }}>
                  منها {outOfStockItems.length} قطع نافدة تماماً
                </div>
              </div>
            </div>
          </div>

          {/* 🤖 AI EXECUTIVE BUSINESS INSIGHTS BOX */}
          <div style={{ background: 'linear-gradient(135deg, #0f172a, #1e1b4b)', borderRadius: '20px', padding: '1.5rem', color: '#ffffff', marginBottom: '1.5rem', boxShadow: '0 10px 25px rgba(15, 23, 42, 0.25)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '1rem' }}>
              <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'rgba(124, 58, 237, 0.3)', border: '1px solid #7c3aed', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#c084fc' }}>
                <Sparkles size={20} />
              </div>
              <h2 style={{ fontSize: '1.2rem', fontWeight: '900', margin: 0 }}>
                توصيات وتحليلات الذكاء التجاري المباشرة
              </h2>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem' }}>
              
              {/* Insight 1: Top Sold Part */}
              <div style={{ background: 'rgba(255, 255, 255, 0.06)', border: '1px solid rgba(255, 255, 255, 0.12)', borderRadius: '14px', padding: '1rem' }}>
                <div style={{ fontSize: '0.78rem', color: '#a7f3d0', fontWeight: '800', marginBottom: '0.4rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                  <Award size={14} /> القطعة الأكثر طلباً ومبيعاً 🔥
                </div>
                {topSellingParts[0] ? (
                  <div>
                    <div className="mono" style={{ fontSize: '1.1rem', fontWeight: '900', color: '#fbbf24' }}>
                      {topSellingParts[0].oem}
                    </div>
                    <div style={{ fontSize: '0.85rem', color: '#e2e8f0', marginTop: '0.2rem', fontWeight: '700' }}>
                      {topSellingParts[0].name}
                    </div>
                    <div style={{ fontSize: '0.78rem', color: '#94a3b8', marginTop: '0.3rem' }}>
                      تم بيع <strong>{topSellingParts[0].qty} قطعة</strong> بقيمة إجمالية ${topSellingParts[0].revenue.toFixed(2)}
                    </div>
                  </div>
                ) : (
                  <div style={{ fontSize: '0.82rem', color: '#94a3b8' }}>لا توجد عمليات بيع مسجلة في هذه الفتره.</div>
                )}
              </div>

              {/* Insight 2: Top Vehicle Model */}
              <div style={{ background: 'rgba(255, 255, 255, 0.06)', border: '1px solid rgba(255, 255, 255, 0.12)', borderRadius: '14px', padding: '1rem' }}>
                <div style={{ fontSize: '0.78rem', color: '#bfdbfe', fontWeight: '800', marginBottom: '0.4rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                  <Car size={14} /> الموديل الأكثر تحقيقاً للأرباح 🚗
                </div>
                {salesByModel[0] ? (
                  <div>
                    <div style={{ fontSize: '1.1rem', fontWeight: '900', color: '#60a5fa' }}>
                      {salesByModel[0].model}
                    </div>
                    <div style={{ fontSize: '0.78rem', color: '#94a3b8', marginTop: '0.4rem' }}>
                      حقق إجمالي مبيعات قدرها <strong>${salesByModel[0].revenue.toFixed(2)}</strong>
                    </div>
                  </div>
                ) : (
                  <div style={{ fontSize: '0.82rem', color: '#94a3b8' }}>BYD Seagull هي الأكثر طلباً في السوق.</div>
                )}
              </div>

              {/* Insight 3: Critical Action Notice */}
              <div style={{ background: 'rgba(239, 68, 68, 0.12)', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: '14px', padding: '1rem' }}>
                <div style={{ fontSize: '0.78rem', color: '#fca5a5', fontWeight: '800', marginBottom: '0.4rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                  <AlertTriangle size={14} /> التوصية الفورية للمشتريات
                </div>
                <div style={{ fontSize: '0.85rem', color: '#ffffff', fontWeight: '700', lineHeight: '1.4' }}>
                  يوجد <strong>{lowStockItems.length} قطعة</strong> وصل مخزونها للحد الأدنى. ينصح بتنزيل امر المشتريات وإعادة الطلب قبل نفادها بالكامل.
                </div>
              </div>
            </div>
          </div>

          {/* 📊 GRID: TOP SELLING OEM PARTS & CAR MODEL BREAKDOWN */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '1.25rem', marginBottom: '1.5rem' }}>
            
            {/* PANEL A: TOP 5 SELLING OEM PARTS */}
            <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '18px', padding: '1.25rem', boxShadow: '0 4px 16px rgba(0,0,0,0.03)' }}>
              <h3 style={{ fontSize: '1.05rem', fontWeight: '900', color: '#0f172a', margin: '0 0 1rem 0', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Award size={18} style={{ color: '#d97706' }} /> أكثر 5 قطع مبيعاً وسحباً من المخزون
              </h3>

              {topSellingParts.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '2rem', color: '#94a3b8', fontSize: '0.85rem' }}>لا توجد بيانات مبيعات كافية في هذه الفترة</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {topSellingParts.map((item, idx) => (
                    <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.65rem 0.85rem', background: '#f8fafc', borderRadius: '12px', border: '1px solid #f1f5f9' }}>
                      <div>
                        <div className="mono" style={{ fontSize: '0.92rem', fontWeight: '900', color: '#d97706' }}>{item.oem}</div>
                        <div style={{ fontSize: '0.8rem', color: '#475569', fontWeight: '700' }}>{item.name}</div>
                      </div>
                      <div style={{ textAlign: 'left' }}>
                        <div className="mono" style={{ fontSize: '0.95rem', fontWeight: '900', color: '#047857' }}>{item.qty} قطعة</div>
                        <div style={{ fontSize: '0.75rem', color: '#64748b' }}>${item.revenue.toFixed(2)}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* PANEL B: REVENUE BY CAR MODEL */}
            <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '18px', padding: '1.25rem', boxShadow: '0 4px 16px rgba(0,0,0,0.03)' }}>
              <h3 style={{ fontSize: '1.05rem', fontWeight: '900', color: '#0f172a', margin: '0 0 1rem 0', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Car size={18} style={{ color: '#2563eb' }} /> توزيع المبيعات حسب موديلات السيارات (BYD)
              </h3>

              {salesByModel.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '2rem', color: '#94a3b8', fontSize: '0.85rem' }}>لا توجد مبيعات حسب الموديل بعد</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                  {salesByModel.map((item, idx) => {
                    const percent = totalRevenue > 0 ? (item.revenue / totalRevenue * 100) : 0;
                    return (
                      <div key={idx} style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', fontWeight: '800', color: '#0f172a' }}>
                          <span>{item.model}</span>
                          <span className="mono" style={{ color: '#2563eb' }}>${item.revenue.toFixed(2)} ({percent.toFixed(1)}%)</span>
                        </div>
                        {/* Visual Progress Bar */}
                        <div style={{ width: '100%', height: '8px', background: '#f1f5f9', borderRadius: '4px', overflow: 'hidden' }}>
                          <div style={{ width: `${Math.min(100, Math.max(5, percent))}%`, height: '100%', background: 'linear-gradient(90deg, #2563eb, #3b82f6)', borderRadius: '4px' }}></div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {/* 🔮 SUB-TAB 2: ML DEMAND FORECASTING TABLE */}
      {activeDsTab === 'forecast' && (
        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '18px', padding: '1.25rem', boxShadow: '0 4px 16px rgba(0,0,0,0.03)' }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: '900', color: '#7c3aed', margin: '0 0 1rem 0', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Sparkles size={20} /> نموذج التنبؤ بالطلب المستقبلي ومعدل الأيام المتبقية (30-Day ML Forecast & DSR)
          </h3>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0', textAlign: 'right', color: '#475569' }}>
                  <th style={{ padding: '0.75rem 0.5rem' }}>كود OEM</th>
                  <th style={{ padding: '0.75rem 0.5rem' }}>اسم القطعة</th>
                  <th style={{ padding: '0.75rem 0.5rem' }}>الموديل</th>
                  <th style={{ padding: '0.75rem 0.5rem' }}>المخزون الحالي</th>
                  <th style={{ padding: '0.75rem 0.5rem' }}>معدل السحب اليومي</th>
                  <th style={{ padding: '0.75rem 0.5rem' }}>الطلب المتوقع (30 يوم)</th>
                  <th style={{ padding: '0.75rem 0.5rem' }}>أيام المخزون المتبقية (DSR)</th>
                  <th style={{ padding: '0.75rem 0.5rem' }}>حالة التنبؤ</th>
                </tr>
              </thead>
              <tbody>
                {mlDemandForecast.slice(0, 15).map((item, idx) => (
                  <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td className="mono" style={{ padding: '0.75rem 0.5rem', fontWeight: '900', color: '#d97706' }}>{item.oem}</td>
                    <td style={{ padding: '0.75rem 0.5rem', fontWeight: '700', color: '#0f172a' }}>{item.name}</td>
                    <td style={{ padding: '0.75rem 0.5rem', color: '#64748b' }}>{item.vehicleModel}</td>
                    <td className="mono" style={{ padding: '0.75rem 0.5rem', fontWeight: '900', color: item.isOut ? '#dc2626' : '#047857' }}>
                      {item.currentStock} قطعة
                    </td>
                    <td className="mono" style={{ padding: '0.75rem 0.5rem', color: '#2563eb', fontWeight: '800' }}>
                      {item.dailyVelocity} قطعة/يوم
                    </td>
                    <td className="mono" style={{ padding: '0.75rem 0.5rem', fontWeight: '900', color: '#7c3aed' }}>
                      +{item.forecastedDemand30} قطعة
                    </td>
                    <td className="mono" style={{ padding: '0.75rem 0.5rem', fontWeight: '900', color: item.isUrgentStockout ? '#dc2626' : '#475569' }}>
                      {item.dsr} يوم
                    </td>
                    <td style={{ padding: '0.75rem 0.5rem' }}>
                      {item.isUrgentStockout && (
                        <span style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626', padding: '0.2rem 0.6rem', borderRadius: '8px', fontSize: '0.75rem', fontWeight: '800' }}>
                          🚨 ينفد خلال أقل من 7 أيام!
                        </span>
                      )}
                      {item.isOut && (
                        <span style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#b91c1c', padding: '0.2rem 0.6rem', borderRadius: '8px', fontSize: '0.75rem', fontWeight: '800' }}>
                          ❌ نافد بالكامل
                        </span>
                      )}
                      {!item.isUrgentStockout && !item.isOut && (
                        <span style={{ background: '#ecfdf5', border: '1px solid #a7f3d0', color: '#047857', padding: '0.2rem 0.6rem', borderRadius: '8px', fontSize: '0.75rem', fontWeight: '800' }}>
                          🟢 مخزون مستقر
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 📈 SUB-TAB 3: PARETO ABC INVENTORY CLASSIFICATION */}
      {activeDsTab === 'pareto' && (
        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '18px', padding: '1.25rem', boxShadow: '0 4px 16px rgba(0,0,0,0.03)' }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: '900', color: '#2563eb', margin: '0 0 1rem 0', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <PieChart size={20} /> تحليل باريتو الإحصائي (80/20 ABC Pareto Classification)
          </h3>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', marginBottom: '1.25rem' }}>
            <div style={{ background: '#f3e8ff', border: '1px solid #d8b4fe', borderRadius: '12px', padding: '0.85rem' }}>
              <div style={{ fontSize: '0.8rem', fontWeight: '800', color: '#7c3aed' }}>الفئة A (80% الإيرادات) 💎</div>
              <div style={{ fontSize: '0.78rem', color: '#475569', marginTop: '0.25rem' }}>القطع الذهبية الأكثر أهمية، تتطلب مراقبة مخزون يومية عدم النفاد.</div>
            </div>
            <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '12px', padding: '0.85rem' }}>
              <div style={{ fontSize: '0.8rem', fontWeight: '800', color: '#2563eb' }}>الفئة B (15% الإيرادات) 🔹</div>
              <div style={{ fontSize: '0.78rem', color: '#475569', marginTop: '0.25rem' }}>قطع الغيار ذات الإقبال المتوسط، تتطلب مراجعة أسبوعية.</div>
            </div>
            <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '0.85rem' }}>
              <div style={{ fontSize: '0.8rem', fontWeight: '800', color: '#64748b' }}>الفئة C (5% الإيرادات) ⚪</div>
              <div style={{ fontSize: '0.78rem', color: '#475569', marginTop: '0.25rem' }}>قطع النادرة ذات الحركة البطيئة، عدم الاحتفاظ برصيد ضخم منها.</div>
            </div>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0', textAlign: 'right', color: '#475569' }}>
                  <th style={{ padding: '0.75rem 0.5rem' }}>تصنيف ABC</th>
                  <th style={{ padding: '0.75rem 0.5rem' }}>كود OEM</th>
                  <th style={{ padding: '0.75rem 0.5rem' }}>اسم القطعة</th>
                  <th style={{ padding: '0.75rem 0.5rem' }}>الكمية المباعة</th>
                  <th style={{ padding: '0.75rem 0.5rem' }}>إجمالي الإيرادات</th>
                  <th style={{ padding: '0.75rem 0.5rem' }}>حصة الإيرادات %</th>
                  <th style={{ padding: '0.75rem 0.5rem' }}>التراكمي %</th>
                </tr>
              </thead>
              <tbody>
                {abcParetoAnalysis.map((item, idx) => (
                  <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '0.75rem 0.5rem' }}>
                      <span style={{
                        padding: '0.25rem 0.6rem',
                        borderRadius: '8px',
                        fontWeight: '900',
                        fontSize: '0.8rem',
                        background: item.categoryClass === 'A' ? '#f3e8ff' : (item.categoryClass === 'B' ? '#eff6ff' : '#f1f5f9'),
                        color: item.categoryClass === 'A' ? '#7c3aed' : (item.categoryClass === 'B' ? '#2563eb' : '#64748b'),
                        border: item.categoryClass === 'A' ? '1px solid #d8b4fe' : (item.categoryClass === 'B' ? '1px solid #bfdbfe' : '1px solid #cbd5e1')
                      }}>
                        Class {item.categoryClass}
                      </span>
                    </td>
                    <td className="mono" style={{ padding: '0.75rem 0.5rem', fontWeight: '900', color: '#d97706' }}>{item.oem}</td>
                    <td style={{ padding: '0.75rem 0.5rem', fontWeight: '700', color: '#0f172a' }}>{item.name}</td>
                    <td className="mono" style={{ padding: '0.75rem 0.5rem', fontWeight: '800' }}>{item.qty} قطعة</td>
                    <td className="mono" style={{ padding: '0.75rem 0.5rem', fontWeight: '900', color: '#047857' }}>${item.revenue.toFixed(2)}</td>
                    <td className="mono" style={{ padding: '0.75rem 0.5rem', fontWeight: '800', color: '#2563eb' }}>{item.revenueShare}%</td>
                    <td className="mono" style={{ padding: '0.75rem 0.5rem', color: '#64748b' }}>{item.accumPercent}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 🔗 SUB-TAB 4: MARKET BASKET CROSS-SELL AFFINITY */}
      {activeDsTab === 'affinity' && (
        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '18px', padding: '1.25rem', boxShadow: '0 4px 16px rgba(0,0,0,0.03)' }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: '900', color: '#047857', margin: '0 0 1rem 0', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Layers size={20} /> تحليل سلة الشراء والارتباط (Frequently Bought Together)
          </h3>

          <p style={{ color: '#64748b', fontSize: '0.85rem', marginBottom: '1.25rem', fontWeight: '600' }}>
            يكتشف هذا النموذج الإحصائي أزواج قطع الغيار التي يتم شراؤها معاً في نفس الفاتورة لمساعدة الكاشير في البيع المتقاطع (Cross-Selling).
          </p>

          {basketAffinityPairs.length === 0 ? (
            <div style={{ padding: '2rem', textAlign: 'center', color: '#64748b', background: '#f8fafc', borderRadius: '12px' }}>
              لا تتوفر عينات كافية من الفواتير متعددة الأصناف لاكتشاف أزواج الارتباط بعد.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              {basketAffinityPairs.map((item, idx) => (
                <div key={idx} style={{ padding: '1rem', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: '#ecfdf5', color: '#047857', border: '1px solid #a7f3d0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '900' }}>
                      #{idx + 1}
                    </div>
                    <div>
                      <div className="mono" style={{ fontSize: '1rem', fontWeight: '900', color: '#0f172a' }}>
                        <span style={{ color: '#d97706' }}>{item.oemA}</span> + <span style={{ color: '#2563eb' }}>{item.oemB}</span>
                      </div>
                      <div style={{ fontSize: '0.78rem', color: '#64748b', marginTop: '0.2rem', fontWeight: '700' }}>
                        تم شراؤها معاً في {item.count} فواتير مختلفة
                      </div>
                    </div>
                  </div>

                  <div style={{ background: '#ffffff', padding: '0.4rem 0.85rem', borderRadius: '10px', border: '1px solid #cbd5e1', textAlign: 'center' }}>
                    <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: '700' }}>نسبة الارتباط (Confidence)</div>
                    <div className="mono" style={{ fontSize: '1.05rem', fontWeight: '900', color: '#047857' }}>{item.confidence}%</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
