-- ========================================================
-- MOUSA AUTO PARTS - SUPABASE POSTGRESQL SCHEMA
-- Execute this SQL script in Supabase SQL Editor:
-- https://supabase.com/dashboard/project/_/sql
-- ========================================================

-- 1. Create Categories Table
CREATE TABLE IF NOT EXISTS public.categories (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    ar_name TEXT NOT NULL,
    icon TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Create Products Table (7,942 OEM Parts)
CREATE TABLE IF NOT EXISTS public.products (
    id TEXT PRIMARY KEY,
    sku TEXT UNIQUE NOT NULL,
    oem TEXT NOT NULL,
    name TEXT NOT NULL,
    ar_name TEXT NOT NULL,
    cn_name TEXT,
    unit_price NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    quantity INT NOT NULL DEFAULT 0,
    vehicle_model TEXT NOT NULL DEFAULT 'Universal BYD',
    category_id TEXT REFERENCES public.categories(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Create Orders Table
CREATE TABLE IF NOT EXISTS public.orders (
    id TEXT PRIMARY KEY,
    customer_name TEXT NOT NULL,
    customer_phone TEXT NOT NULL,
    delivery_method TEXT NOT NULL DEFAULT 'pickup',
    delivery_address TEXT,
    source TEXT DEFAULT 'POS Counter',
    items JSONB NOT NULL DEFAULT '[]'::jsonb,
    total_amount NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    status TEXT NOT NULL DEFAULT 'Completed',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Enable Row Level Security (RLS) & Public Read Policies
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

-- Allow public read & insert access
CREATE POLICY "Allow Public Read Categories" ON public.categories FOR SELECT USING (true);
CREATE POLICY "Allow Public Insert Categories" ON public.categories FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow Public Read Products" ON public.products FOR SELECT USING (true);
CREATE POLICY "Allow Public Insert Products" ON public.products FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow Public Insert Orders" ON public.orders FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow Public Read Orders" ON public.orders FOR SELECT USING (true);

-- Create Indexes for Super-Fast OEM Search
CREATE INDEX IF NOT EXISTS idx_products_oem ON public.products(oem);
CREATE INDEX IF NOT EXISTS idx_products_sku ON public.products(sku);
CREATE INDEX IF NOT EXISTS idx_products_ar_name ON public.products(ar_name);
CREATE INDEX IF NOT EXISTS idx_products_model ON public.products(vehicle_model);
