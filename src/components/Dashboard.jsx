import React from 'react';
import { Package, AlertTriangle, XCircle, DollarSign, TrendingUp, Cpu, Layers } from 'lucide-react';

export default function Dashboard({ stats, categories, items, onNavigateToInventory }) {
  const lowStockItems = items.filter(i => i.quantity > 0 && i.quantity <= i.minLevel);
  const outOfStockItems = items.filter(i => i.quantity === 0);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', padding: '1.75rem', overflowY: 'auto' }}>
      {/* Page Title */}
      <div>
        <h1 style={{ fontSize: '1.6rem', fontWeight: '800' }}>Inventory Dashboard</h1>
        <p style={{ fontSize: '0.88rem', color: 'var(--text-muted)' }}>Real-time stock monitoring, asset valuation, and stock alerts.</p>
      </div>

      {/* KPI Cards Row */}
      <div className="metrics-grid">
        <div className="metric-card">
          <div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Total SKU Items</div>
            <div style={{ fontSize: '1.8rem', fontWeight: '800', fontFamily: 'var(--font-heading)', marginTop: '0.2rem' }}>{stats.totalItems}</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>{stats.totalQuantity} Units in Stock</div>
          </div>
          <div className="metric-icon" style={{ background: 'rgba(59, 130, 246, 0.15)', color: '#60a5fa' }}>
            <Package size={24} />
          </div>
        </div>

        <div className="metric-card">
          <div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Total Asset Value</div>
            <div style={{ fontSize: '1.8rem', fontWeight: '800', fontFamily: 'var(--font-heading)', color: '#34d399', marginTop: '0.2rem' }}>
              ${stats.totalValue.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>Cost: ${stats.totalCostValue.toLocaleString('en-US', { minimumFractionDigits: 2 })}</div>
          </div>
          <div className="metric-icon" style={{ background: 'rgba(16, 185, 129, 0.15)', color: '#34d399' }}>
            <DollarSign size={24} />
          </div>
        </div>

        <div className="metric-card" style={{ cursor: 'pointer' }} onClick={onNavigateToInventory}>
          <div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Low Stock Warnings</div>
            <div style={{ fontSize: '1.8rem', fontWeight: '800', fontFamily: 'var(--font-heading)', color: '#fbbf24', marginTop: '0.2rem' }}>
              {stats.lowStockCount}
            </div>
            <div style={{ fontSize: '0.75rem', color: '#fbbf24', marginTop: '0.2rem' }}>Needs Reorder Attention</div>
          </div>
          <div className="metric-icon" style={{ background: 'rgba(245, 158, 11, 0.15)', color: '#fbbf24' }}>
            <AlertTriangle size={24} />
          </div>
        </div>

        <div className="metric-card" style={{ cursor: 'pointer' }} onClick={onNavigateToInventory}>
          <div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Out of Stock</div>
            <div style={{ fontSize: '1.8rem', fontWeight: '800', fontFamily: 'var(--font-heading)', color: '#f87171', marginTop: '0.2rem' }}>
              {stats.outOfStockCount}
            </div>
            <div style={{ fontSize: '0.75rem', color: '#f87171', marginTop: '0.2rem' }}>Zero Inventory Remaining</div>
          </div>
          <div className="metric-icon" style={{ background: 'rgba(239, 68, 68, 0.15)', color: '#f87171' }}>
            <XCircle size={24} />
          </div>
        </div>
      </div>

      {/* Middle Section: Category Breakdown & Low Stock Alert List */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1.5rem' }}>
        {/* Categories Distribution */}
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '16px', padding: '1.5rem', backdropFilter: 'blur(16px)' }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: '700', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Layers size={18} style={{ color: 'var(--primary)' }} /> Inventory Value by Category
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {categories.map(cat => {
              const catItems = items.filter(i => i.categoryId === cat.id);
              const catVal = catItems.reduce((acc, i) => acc + i.quantity * i.unitPrice, 0);
              const pct = stats.totalValue > 0 ? (catVal / stats.totalValue) * 100 : 0;

              return (
                <div key={cat.id} style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.88rem' }}>
                    <span style={{ fontWeight: '600', color: 'var(--text-main)' }}>{cat.name} ({catItems.length} items)</span>
                    <span style={{ fontFamily: 'var(--font-mono)', fontWeight: '600' }}>${catVal.toLocaleString('en-US', { minimumFractionDigits: 2 })} ({pct.toFixed(1)}%)</span>
                  </div>
                  <div style={{ width: '100%', height: '8px', background: 'rgba(255, 255, 255, 0.08)', borderRadius: '999px', overflow: 'hidden' }}>
                    <div style={{ width: `${pct}%`, height: '100%', background: cat.color, borderRadius: '999px' }}></div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Low Stock Alerts */}
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '16px', padding: '1.5rem', backdropFilter: 'blur(16px)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            <h3 style={{ fontSize: '1.1rem', fontWeight: '700', marginBottom: '1rem', color: '#fbbf24', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <AlertTriangle size={18} /> Reorder Attention
            </h3>

            {lowStockItems.length === 0 && outOfStockItems.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                🎉 All stock levels are healthy!
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {[...outOfStockItems, ...lowStockItems].slice(0, 5).map(item => (
                  <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.65rem', background: 'rgba(15, 23, 42, 0.6)', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                    <div>
                      <div style={{ fontWeight: '600', fontSize: '0.85rem' }}>{item.name}</div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>SKU: {item.sku}</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <span className={`badge-status ${item.quantity === 0 ? 'badge-out-stock' : 'badge-low-stock'}`}>
                        {item.quantity} Left
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <button
            onClick={onNavigateToInventory}
            style={{
              width: '100%',
              padding: '0.75rem',
              borderRadius: '8px',
              background: 'rgba(255, 255, 255, 0.08)',
              border: '1px solid var(--border-color)',
              color: 'white',
              fontWeight: '600',
              cursor: 'pointer',
              marginTop: '1rem'
            }}
          >
            Manage Inventory List
          </button>
        </div>
      </div>
    </div>
  );
}
