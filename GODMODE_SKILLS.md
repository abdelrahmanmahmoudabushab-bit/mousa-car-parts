# ⚡ POS Auto-Parts Godmode Skill Guide

This skill defines the elite engineering standards, architecture patterns, POS counter algorithms, mobile UI responsive rules, database resilience, and deployment protocols for the **Mousa Car Parts System** (`pos1`).

---

## 🏛️ 1. Core Engineering Commandments

1. **Zero UI Overflow & Mobile-First Excellence**:
   - Always test and enforce viewport clamping (`100dvh`, `max-width: 100vw`, `overflow-x: hidden`).
   - Every UI component must render flawlessly on both mobile smartphones (`360px` - `450px`) and desktop screens (`1400px+`).
   - Squeezing inputs or wrapping header action buttons into 3+ lines is forbidden. Use mobile hamburger drawers and single-thumb view switchers (`Catalog` vs `Cart`).

2. **Sub-30ms Instant Performance**:
   - Use `React.lazy()` and `<Suspense>` for heavy view tabs (`OrdersLog`, `LightStockManager`, `StockImportPage`, `SettingsPage`).
   - Keep fast cashier POS terminal loaded instantly.
   - Use memoized product filtering (`useMemo`, `useCallback`) for instant search across 7,900+ OEM parts.

3. **Data Integrity & Offline Resilience**:
   - Never allow adding cart items beyond available inventory stock (`quantity <= 0` guard).
   - Maintain a hybrid database layer: primary cloud query against **Supabase PostgreSQL**, with silent fallback to local `pos_database.json` cache during network drops.

4. **Multi-Port Cloud Availability**:
   - Express server MUST listen on `process.env.PORT`, `8080`, `5173`, and `5000` simultaneously to guarantee 100% domain routing uptime on Railway, Render, and Heroku.

---

## 📱 2. Mobile-First UI & Responsive Layout Patterns

```css
/* Global Viewport Guard */
html, body, #root, .app-container {
  min-height: 100dvh;
  max-width: 100vw;
  overflow-x: hidden;
  -webkit-overflow-scrolling: touch;
  touch-action: manipulation;
}

/* Modals Safeguard */
.modal-content {
  width: 95vw !important;
  max-width: 540px;
  max-height: 90dvh !important;
  overflow-y: auto !important;
  -webkit-overflow-scrolling: touch !important;
}

/* Flex Wrap for Inputs & Buttons */
.search-wrapper {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.search-input {
  flex: 1 1 200px;
  min-height: 46px;
}
```

---

## 🔍 3. Auto-Parts Matching & POS Counter Logic

### A. Search Matcher Algorithm (`matchProductSearch`)
* Match against OEM numbers, Arabic names, English names, serial numbers, VIN chassis numbers, and location codes.
* Case-insensitive, whitespace-trimmed, and special character resilient.

### B. Stock Guarding Code Pattern
```js
const addToCart = (product) => {
  const stock = Number(product.quantity || 0);
  if (stock <= 0) return alert('Out of stock!');
  setCart(prev => {
    const existing = prev.find(i => i.id === product.id);
    if (existing && existing.qty >= stock) return prev; // Guard
    return existing 
      ? prev.map(i => i.id === product.id ? { ...i, qty: i.qty + 1 } : i)
      : [...prev, { ...product, qty: 1 }];
  });
};
```

---

## 🌐 4. Translation & Ingestion Pipeline

* **Supplier Invoices**: Parse PDF & Excel files into structured JSON array (`oem`, `costPrice`, `quantity`, `chineseName`).
* **Translation Engine**: Translate Chinese factory part names (*刹车片, 减震器, 前大灯*) into clean Arabic part names using dictionary mapping in [server/translator.js](file:///d:/pos1/server/translator.js).
* **Currency Conversion**: Convert cost prices (`USD`, `CNY`, `SAR`) dynamically using user-selected exchange rates and markup percentages.

---

## ⚡ 5. Cloud Deployment & Git Protocol

After completing any feature or UI improvement:
1. **Verification Build**: Run `npm run build` to verify clean Vite compilation for both `dist` and `dist-customer`.
2. **Git Commit & Push**:
   ```bash
   git add .
   git commit -m "Descriptive commit message"
   git push origin main
   ```
3. **Railway Auto-Trigger**: Railway auto-detects commits on `main` and deploys using `nixpacks.toml` (`npm run build && node server/index.js`).
