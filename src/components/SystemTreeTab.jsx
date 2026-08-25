import React, { useState } from 'react';
import { Folder, FolderOpen, FileText, Server, Database, Cloud, ShieldCheck, ChevronRight, ChevronDown, Cpu, Layers, GitBranch, Terminal, Globe, ShoppingCart, Package } from 'lucide-react';

export default function SystemTreeTab({ lang = 'ar' }) {
  const [expandedNodes, setExpandedNodes] = useState({
    frontend: true,
    components: true,
    backend: true,
    cloud: true
  });

  const toggleNode = (key) => {
    setExpandedNodes(prev => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '18px', padding: '1.75rem', display: 'flex', flexDirection: 'column', gap: '1.25rem', boxShadow: '0 4px 14px rgba(15, 23, 42, 0.03)', fontFamily: "'Cairo', sans-serif" }}>
      
      {/* Header */}
      <div style={{ borderBottom: '1px solid #f1f5f9', paddingBottom: '0.85rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ fontSize: '1.2rem', fontWeight: '900', color: '#0f172a', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <GitBranch size={22} style={{ color: '#2563eb' }} />
            {lang === 'ar' ? 'شجرة هيكل النظام والملفات 🌳' : 'System Architecture & File Tree 🌳'}
          </h2>
          <p style={{ fontSize: '0.83rem', color: '#64748b', margin: '0.25rem 0 0 0', fontWeight: '600' }}>
            {lang === 'ar' ? 'تصفح شجرة التكوين البرمجي وملفات التطبيق والربط السحابي المباشر.' : 'Interactive visual tree of all frontend modules, backend services, and cloud nodes.'}
          </p>
        </div>

        <div style={{ padding: '0.35rem 0.85rem', borderRadius: '8px', background: '#ecfdf5', border: '1px solid #a7f3d0', color: '#047857', fontSize: '0.78rem', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          <ShieldCheck size={15} /> GitHub main: Synced 100%
        </div>
      </div>

      {/* Visual Interactive Tree View Box */}
      <div style={{ background: '#0f172a', color: '#f8fafc', borderRadius: '16px', padding: '1.5rem', fontFamily: 'var(--font-mono)', fontSize: '0.88rem', border: '2px solid #1e293b', boxShadow: '0 10px 30px rgba(15, 23, 42, 0.2)', overflowX: 'auto' }}>
        
        {/* ROOT REPO NODE */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#38bdf8', fontWeight: '800', fontSize: '1rem', marginBottom: '0.75rem' }}>
          <FolderOpen size={20} style={{ color: '#38bdf8' }} />
          <span>mousa-car-parts / (GitHub Production Branch: main)</span>
        </div>

        <div style={{ paddingRight: lang === 'ar' ? '1.25rem' : 0, paddingLeft: lang === 'en' ? '1.25rem' : 0, display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
          
          {/* NODE 1: FRONTEND REACT SPA */}
          <div style={{ background: 'rgba(30, 41, 59, 0.6)', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '12px', padding: '0.85rem 1rem' }}>
            <div
              onClick={() => toggleNode('frontend')}
              style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: '#60a5fa', fontWeight: '800' }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                {expandedNodes.frontend ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                <Folder size={18} style={{ color: '#60a5fa' }} />
                <span>src/ (React Frontend SPA Client)</span>
              </div>
              <span style={{ fontSize: '0.72rem', background: 'rgba(96, 165, 250, 0.2)', color: '#93c5fd', padding: '0.15rem 0.5rem', borderRadius: '6px' }}>Vite ES-Build</span>
            </div>

            {expandedNodes.frontend && (
              <div style={{ marginTop: '0.75rem', paddingRight: '1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem', borderRight: '2px solid rgba(96, 165, 250, 0.3)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#e2e8f0' }}>
                  <FileText size={16} style={{ color: '#60a5fa' }} />
                  <span style={{ fontWeight: '700' }}>App.jsx</span>
                  <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>- Main Router, JWT State, Suspense & Portal Views</span>
                </div>

                {/* Subfolder: components */}
                <div style={{ background: 'rgba(15, 23, 42, 0.4)', borderRadius: '8px', padding: '0.65rem 0.85rem', marginTop: '0.3rem' }}>
                  <div onClick={() => toggleNode('components')} style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#fbbf24', fontWeight: '800', marginBottom: '0.5rem' }}>
                    {expandedNodes.components ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                    <Folder size={16} style={{ color: '#fbbf24' }} />
                    <span>components/ (Modular UI Components)</span>
                  </div>

                  {expandedNodes.components && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem', paddingRight: '1rem', borderRight: '1.5px solid rgba(251, 191, 36, 0.3)', fontSize: '0.82rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#f8fafc' }}>
                        <ShoppingCart size={14} style={{ color: '#60a5fa' }} />
                        <span style={{ fontWeight: '700', color: '#93c5fd' }}>POSTerminal.jsx</span>
                        <span style={{ color: '#94a3b8' }}>- Counter POS, Cart & Stock Limits</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#f8fafc' }}>
                        <Package size={14} style={{ color: '#34d399' }} />
                        <span style={{ fontWeight: '700', color: '#a7f3d0' }}>LightStockManager.jsx</span>
                        <span style={{ color: '#94a3b8' }}>- OEM Parts Directory & Excel Export</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#f8fafc' }}>
                        <FileText size={14} style={{ color: '#f59e0b' }} />
                        <span style={{ fontWeight: '700', color: '#fde68a' }}>StockImportPage.jsx</span>
                        <span style={{ color: '#94a3b8' }}>- PDF/Excel Batch Ingestion & Barcode Scanner</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#f8fafc' }}>
                        <Terminal size={14} style={{ color: '#c084fc' }} />
                        <span style={{ fontWeight: '700', color: '#e9d5ff' }}>OrdersLog.jsx</span>
                        <span style={{ color: '#94a3b8' }}>- Sales History, Receipt Reprint & Order Returns</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#f8fafc' }}>
                        <Globe size={14} style={{ color: '#38bdf8' }} />
                        <span style={{ fontWeight: '700', color: '#bae6fd' }}>CustomerStore.jsx</span>
                        <span style={{ color: '#94a3b8' }}>- Public Mobile Customer Storefront</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* NODE 2: BACKEND NODE.JS EXPRESS API */}
          <div style={{ background: 'rgba(30, 41, 59, 0.6)', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '12px', padding: '0.85rem 1rem' }}>
            <div
              onClick={() => toggleNode('backend')}
              style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: '#34d399', fontWeight: '800' }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                {expandedNodes.backend ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                <Server size={18} style={{ color: '#34d399' }} />
                <span>server/ (Node.js Express REST API)</span>
              </div>
              <span style={{ fontSize: '0.72rem', background: 'rgba(52, 211, 153, 0.2)', color: '#a7f3d0', padding: '0.15rem 0.5rem', borderRadius: '6px' }}>Port 5000</span>
            </div>

            {expandedNodes.backend && (
              <div style={{ marginTop: '0.75rem', paddingRight: '1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem', borderRight: '2px solid rgba(52, 211, 153, 0.3)', fontSize: '0.82rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#e2e8f0' }}>
                  <Cpu size={15} style={{ color: '#34d399' }} />
                  <span style={{ fontWeight: '700', color: '#a7f3d0' }}>index.js</span>
                  <span style={{ color: '#94a3b8' }}>- Express Routing, Auth Middleware & 30-min Auto-Sync Worker</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#e2e8f0' }}>
                  <Database size={15} style={{ color: '#f59e0b' }} />
                  <span style={{ fontWeight: '700', color: '#fde68a' }}>db.js & pos_database.json</span>
                  <span style={{ color: '#94a3b8' }}>- Local-First Persistent Database & Stock Engine</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#e2e8f0' }}>
                  <Cloud size={15} style={{ color: '#38bdf8' }} />
                  <span style={{ fontWeight: '700', color: '#bae6fd' }}>supabase.js</span>
                  <span style={{ color: '#94a3b8' }}>- 2-Way PostgreSQL Cloud Sync Engine</span>
                </div>
              </div>
            )}
          </div>

          {/* NODE 3: CLOUD & INFRASTRUCTURE CONFIGS */}
          <div style={{ background: 'rgba(30, 41, 59, 0.6)', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '12px', padding: '0.85rem 1rem' }}>
            <div
              onClick={() => toggleNode('cloud')}
              style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: '#c084fc', fontWeight: '800' }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                {expandedNodes.cloud ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                <Cloud size={18} style={{ color: '#c084fc' }} />
                <span>Cloud Infrastructure & Railway Deployment Configs</span>
              </div>
              <span style={{ fontSize: '0.72rem', background: 'rgba(192, 132, 252, 0.2)', color: '#e9d5ff', padding: '0.15rem 0.5rem', borderRadius: '6px' }}>Railway / Render</span>
            </div>

            {expandedNodes.cloud && (
              <div style={{ marginTop: '0.75rem', paddingRight: '1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem', borderRight: '2px solid rgba(192, 132, 252, 0.3)', fontSize: '0.82rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#e2e8f0' }}>
                  <FileText size={15} style={{ color: '#c084fc' }} />
                  <span style={{ fontWeight: '700', color: '#e9d5ff' }}>railway.json</span>
                  <span style={{ color: '#94a3b8' }}>- Railway Nixpacks 1-Click Automated Build Spec</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#e2e8f0' }}>
                  <FileText size={15} style={{ color: '#c084fc' }} />
                  <span style={{ fontWeight: '700', color: '#e9d5ff' }}>nixpacks.toml</span>
                  <span style={{ color: '#94a3b8' }}>- Build detector and start script</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#e2e8f0' }}>
                  <FileText size={15} style={{ color: '#c084fc' }} />
                  <span style={{ fontWeight: '700', color: '#e9d5ff' }}>Procfile</span>
                  <span style={{ color: '#94a3b8' }}>- Process Manager web: node server/index.js</span>
                </div>
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}
