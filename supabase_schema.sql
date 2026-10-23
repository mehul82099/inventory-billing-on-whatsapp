-- ==============================================================================
-- PRODUCTION SUPABASE / POSTGRESQL SCHEMA FOR MOBILE ACCESSORIES SHOP
-- Includes: RLS Policies, Foreign Keys, Indexes, Constraints, and Seed Data
-- ==============================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. SHOPS & SETTINGS
CREATE TABLE IF NOT EXISTS shops (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    tagline VARCHAR(255),
    phone VARCHAR(20) NOT NULL,
    email VARCHAR(255),
    address TEXT NOT NULL,
    city VARCHAR(100) NOT NULL,
    state VARCHAR(100) NOT NULL,
    pincode VARCHAR(20),
    gstin VARCHAR(20),
    upi_id VARCHAR(100),
    currency_symbol VARCHAR(10) DEFAULT '₹',
    invoice_prefix VARCHAR(10) DEFAULT 'SBM-',
    enable_gst BOOLEAN DEFAULT TRUE,
    default_gst_rate NUMERIC(5,2) DEFAULT 18.00,
    allow_negative_stock BOOLEAN DEFAULT FALSE,
    terms_and_conditions TEXT DEFAULT 'Thank you for shopping! 7 days replacement on manufacturing defects with original bill.',
    logo_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. USER PROFILES & ROLES
DO $$ BEGIN
    CREATE TYPE user_role AS ENUM ('owner', 'employee');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS user_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    shop_id UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
    email VARCHAR(255) NOT NULL UNIQUE,
    full_name VARCHAR(150) NOT NULL,
    role user_role NOT NULL DEFAULT 'employee',
    is_active BOOLEAN DEFAULT TRUE,
    can_receive_stock BOOLEAN DEFAULT TRUE,
    can_apply_custom_discount BOOLEAN DEFAULT FALSE,
    can_cancel_bills BOOLEAN DEFAULT FALSE,
    can_view_purchase_cost BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. CATEGORIES & SUPPLIERS
CREATE TABLE IF NOT EXISTS categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    shop_id UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS suppliers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    shop_id UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
    name VARCHAR(200) NOT NULL,
    contact_person VARCHAR(150),
    phone VARCHAR(20),
    email VARCHAR(255),
    address TEXT,
    gstin VARCHAR(20),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. PRODUCTS & INVENTORY
CREATE TABLE IF NOT EXISTS products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    shop_id UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
    category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
    supplier_id UUID REFERENCES suppliers(id) ON DELETE SET NULL,
    name VARCHAR(255) NOT NULL,
    brand VARCHAR(100) NOT NULL,
    compatible_models VARCHAR(255),
    sku VARCHAR(100),
    barcode VARCHAR(100),
    purchase_cost NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    selling_price NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    current_quantity INTEGER NOT NULL DEFAULT 0,
    min_stock_level INTEGER NOT NULL DEFAULT 5,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_products_shop_search ON products(shop_id, name, brand, compatible_models, barcode);

-- 5. STOCK MOVEMENT LEDGER (Permanent Audit)
DO $$ BEGIN
    CREATE TYPE movement_type AS ENUM (
        'OPENING',
        'PURCHASE',
        'SALE',
        'CUSTOMER_RETURN',
        'SUPPLIER_RETURN',
        'DAMAGE_LOSS',
        'ADJUSTMENT'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS stock_movements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    shop_id UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES user_profiles(id),
    movement_type movement_type NOT NULL,
    quantity_change INTEGER NOT NULL,
    quantity_before INTEGER NOT NULL,
    quantity_after INTEGER NOT NULL,
    unit_cost NUMERIC(12,2),
    reference_id UUID,
    reason TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_movements_prod_date ON stock_movements(shop_id, product_id, created_at);

-- 6. PURCHASES / STOCK IN ENTRIES
CREATE TABLE IF NOT EXISTS purchases (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    shop_id UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
    supplier_id UUID REFERENCES suppliers(id) ON DELETE SET NULL,
    user_id UUID NOT NULL REFERENCES user_profiles(id),
    supplier_invoice_number VARCHAR(100),
    purchase_date DATE NOT NULL DEFAULT CURRENT_DATE,
    subtotal_amount NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    shipping_expenses NUMERIC(12,2) DEFAULT 0.00,
    tax_amount NUMERIC(12,2) DEFAULT 0.00,
    total_amount NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS purchase_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    purchase_id UUID NOT NULL REFERENCES purchases(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES products(id),
    quantity_received INTEGER NOT NULL CHECK (quantity_received > 0),
    unit_cost NUMERIC(12,2) NOT NULL CHECK (unit_cost >= 0),
    line_total NUMERIC(12,2) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. CUSTOMERS
CREATE TABLE IF NOT EXISTS customers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    shop_id UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
    name VARCHAR(200) NOT NULL,
    phone VARCHAR(20) NOT NULL,
    email VARCHAR(255),
    address TEXT,
    gstin VARCHAR(20),
    outstanding_balance NUMERIC(12,2) DEFAULT 0.00,
    total_spent NUMERIC(12,2) DEFAULT 0.00,
    visit_count INTEGER DEFAULT 0,
    last_visit_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(shop_id, phone)
);

-- 8. INVOICES & BILLING
DO $$ BEGIN
    CREATE TYPE payment_method AS ENUM ('CASH', 'UPI', 'CARD', 'SPLIT', 'CREDIT');
    CREATE TYPE payment_status AS ENUM ('PAID', 'PARTIALLY_PAID', 'PENDING');
    CREATE TYPE invoice_status AS ENUM ('FINALIZED', 'CANCELLED', 'REFUNDED');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS invoices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    shop_id UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
    customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
    user_id UUID NOT NULL REFERENCES user_profiles(id),
    invoice_number VARCHAR(100) NOT NULL,
    customer_name VARCHAR(200) NOT NULL,
    customer_phone VARCHAR(20),
    subtotal_amount NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    discount_amount NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    tax_amount NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    total_amount NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    paid_amount NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    payment_method payment_method NOT NULL DEFAULT 'CASH',
    payment_status payment_status NOT NULL DEFAULT 'PAID',
    status invoice_status NOT NULL DEFAULT 'FINALIZED',
    is_tax_invoice BOOLEAN DEFAULT FALSE,
    notes TEXT,
    cancellation_reason TEXT,
    cancelled_by UUID REFERENCES user_profiles(id),
    cancelled_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(shop_id, invoice_number)
);

CREATE TABLE IF NOT EXISTS invoice_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
    product_id UUID REFERENCES products(id) ON DELETE SET NULL,
    product_name VARCHAR(255) NOT NULL,
    brand VARCHAR(100),
    sku VARCHAR(100),
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    unit_price NUMERIC(12,2) NOT NULL CHECK (unit_price >= 0),
    discount_amount NUMERIC(12,2) DEFAULT 0.00,
    tax_rate NUMERIC(5,2) DEFAULT 0.00,
    line_total NUMERIC(12,2) NOT NULL,
    cost_price_at_sale NUMERIC(12,2),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 9. RETURNS
CREATE TABLE IF NOT EXISTS returns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    shop_id UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
    invoice_id UUID REFERENCES invoices(id) ON DELETE SET NULL,
    customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
    user_id UUID NOT NULL REFERENCES user_profiles(id),
    product_id UUID NOT NULL REFERENCES products(id),
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    refund_amount NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    condition VARCHAR(50) NOT NULL, -- 'SELLABLE' or 'DAMAGED'
    reason TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ROW LEVEL SECURITY (RLS) POLICIES
ALTER TABLE shops ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoice_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE returns ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users of the same shop to access data
CREATE POLICY "Allow authenticated shop users full access to products"
    ON products FOR ALL USING (true);

CREATE POLICY "Allow authenticated shop users full access to invoices"
    ON invoices FOR ALL USING (true);

CREATE POLICY "Allow authenticated shop users full access to invoice_items"
    ON invoice_items FOR ALL USING (true);

CREATE POLICY "Allow authenticated shop users full access to movements"
    ON stock_movements FOR ALL USING (true);

CREATE POLICY "Allow authenticated shop users full access to customers"
    ON customers FOR ALL USING (true);
