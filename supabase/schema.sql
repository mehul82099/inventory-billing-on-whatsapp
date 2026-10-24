-- Inventory & Billing (WhatsApp POS) - Supabase/Postgres schema
-- Multi-tenant: every business row carries shop_id. Run in Supabase SQL Editor.

create table if not exists shops (
  id text primary key,
  name text not null,
  tagline text,
  phone text default '',
  email text,
  address text default '',
  city text default '',
  state text default '',
  pincode text,
  gstin text,
  upi_id text,
  currency_symbol text default '₹',
  invoice_prefix text default 'INV-',
  enable_gst boolean default true,
  default_gst_rate numeric default 18,
  allow_negative_stock boolean default false,
  terms_and_conditions text,
  logo_url text,
  created_at timestamptz default now()
);

-- users.id equals the Supabase Auth user id (auth.users.id as text).
-- Passwords/sessions live in Supabase Auth; this table is the app profile.
create table if not exists users (
  id text primary key,
  shop_id text not null references shops(id) on delete cascade,
  email text not null unique,
  full_name text not null,
  role text not null default 'owner' check (role in ('owner','employee')),
  is_active boolean default true,
  can_receive_stock boolean default true,
  can_apply_custom_discount boolean default false,
  can_cancel_bills boolean default false,
  can_view_purchase_cost boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
create index if not exists users_shop_idx on users(shop_id);

create table if not exists categories (
  id text primary key,
  shop_id text not null references shops(id) on delete cascade,
  name text not null,
  description text
);
create index if not exists categories_shop_idx on categories(shop_id);

create table if not exists suppliers (
  id text primary key,
  shop_id text not null references shops(id) on delete cascade,
  name text not null,
  contact_person text,
  phone text,
  email text,
  address text,
  gstin text
);
create index if not exists suppliers_shop_idx on suppliers(shop_id);

create table if not exists products (
  id text primary key,
  shop_id text not null references shops(id) on delete cascade,
  category_id text,
  category_name text,
  supplier_id text,
  supplier_name text,
  name text not null,
  brand text default '',
  compatible_models text,
  sku text,
  barcode text,
  purchase_cost numeric default 0,
  selling_price numeric not null,
  current_quantity integer default 0,
  min_stock_level integer default 0,
  is_active boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
create index if not exists products_shop_idx on products(shop_id);

create table if not exists stock_movements (
  id text primary key,
  shop_id text not null references shops(id) on delete cascade,
  product_id text not null,
  product_name text,
  user_id text,
  user_name text,
  movement_type text not null,
  quantity_change integer not null,
  quantity_before integer,
  quantity_after integer,
  unit_cost numeric,
  reference_id text,
  reason text,
  created_at timestamptz default now()
);
create index if not exists movements_shop_idx on stock_movements(shop_id);
create index if not exists movements_product_idx on stock_movements(product_id);

create table if not exists purchases (
  id text primary key,
  shop_id text not null references shops(id) on delete cascade,
  supplier_id text,
  supplier_name text,
  user_id text,
  user_name text,
  supplier_invoice_number text,
  purchase_date date,
  items jsonb default '[]',
  subtotal_amount numeric default 0,
  shipping_expenses numeric default 0,
  tax_amount numeric default 0,
  total_amount numeric default 0,
  notes text,
  created_at timestamptz default now()
);
create index if not exists purchases_shop_idx on purchases(shop_id);

create table if not exists invoices (
  id text primary key,
  shop_id text not null references shops(id) on delete cascade,
  invoice_number text not null,
  customer_id text,
  customer_name text default 'Walk-in Customer',
  customer_phone text,
  user_id text,
  user_name text,
  items jsonb default '[]',
  subtotal_amount numeric default 0,
  discount_amount numeric default 0,
  tax_amount numeric default 0,
  total_amount numeric default 0,
  paid_amount numeric default 0,
  payment_method text default 'CASH',
  payment_status text default 'PAID',
  status text default 'FINALIZED',
  is_tax_invoice boolean default false,
  notes text,
  cancellation_reason text,
  cancelled_by text,
  cancelled_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique (shop_id, invoice_number)
);
create index if not exists invoices_shop_idx on invoices(shop_id);

create table if not exists customers (
  id text primary key,
  shop_id text not null references shops(id) on delete cascade,
  name text not null,
  phone text not null,
  email text,
  address text,
  gstin text,
  outstanding_balance numeric default 0,
  total_spent numeric default 0,
  visit_count integer default 0,
  last_visit_at timestamptz,
  created_at timestamptz default now(),
  unique (shop_id, phone)
);
create index if not exists customers_shop_idx on customers(shop_id);

create table if not exists customer_returns (
  id text primary key,
  shop_id text not null references shops(id) on delete cascade,
  invoice_id text,
  customer_id text,
  user_id text,
  user_name text,
  product_id text,
  product_name text,
  quantity integer default 0,
  refund_amount numeric default 0,
  condition text default 'SELLABLE',
  reason text,
  created_at timestamptz default now()
);
create index if not exists returns_shop_idx on customer_returns(shop_id);

-- Row Level Security: the server uses the service role key (bypasses RLS) and
-- enforces shop_id scoping in code after verifying the caller's Supabase Auth
-- JWT. Deny direct anon access to all tables.
alter table shops enable row level security;
alter table users enable row level security;
alter table categories enable row level security;
alter table suppliers enable row level security;
alter table products enable row level security;
alter table stock_movements enable row level security;
alter table purchases enable row level security;
alter table invoices enable row level security;
alter table customers enable row level security;
alter table customer_returns enable row level security;

-- Atomic stock adjustment (race-safe). One row-level conditional update.
create or replace function adjust_stock(p_shop_id text, p_product_id text, p_delta integer, p_require_nonnegative boolean default false)
returns table(ok boolean, new_qty integer)
language plpgsql as $$
declare r integer;
begin
  update products
     set current_quantity = current_quantity + p_delta,
         updated_at = now()
   where shop_id = p_shop_id
     and id = p_product_id
     and (not p_require_nonnegative or current_quantity + p_delta >= 0)
  returning current_quantity into r;
  if not found then
    return query select false, (select p.current_quantity from products p where p.shop_id = p_shop_id and p.id = p_product_id);
  else
    return query select true, r;
  end if;
end;
$$;
