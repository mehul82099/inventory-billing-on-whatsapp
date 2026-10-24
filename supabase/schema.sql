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

-- Durable idempotency keys: one row per client operation key, response stored on success.
create table if not exists idempotency_keys (
  shop_id text not null,
  key text not null,
  endpoint text not null,
  response jsonb,
  created_at timestamptz default now(),
  primary key (shop_id, key)
);

-- Whole-invoice creation in ONE database transaction: stock deduction,
-- movements, customer upsert, invoice insert, idempotency record. Any failure
-- rolls back everything; a retried key returns the original bill.
create or replace function create_invoice_tx(p_shop_id text, p_idempotency_key text, p_input jsonb)
returns jsonb
language plpgsql as $$
declare
  v_shop shops%rowtype;
  v_prod products%rowtype;
  v_item jsonb;
  v_items jsonb := '[]'::jsonb;
  v_subtotal numeric := 0;
  v_tax numeric := 0;
  v_total numeric;
  v_paid numeric;
  v_payment_status text;
  v_now timestamptz := now();
  v_ms bigint := (extract(epoch from v_now)*1000)::bigint;
  v_invoice_id text := 'inv-' || v_ms::text || floor(random()*10000)::int::text;
  v_invoice_number text;
  v_customer_id text;
  v_clean_phone text;
  v_line_total numeric;
  v_item_disc numeric;
  v_qty_before integer;
  v_qty_after integer;
  v_override boolean := coalesce((p_input->>'allow_negative_override')::boolean, false);
  v_is_tax boolean := coalesce((p_input->>'is_tax_invoice')::boolean, false);
  v_overall_disc numeric := coalesce((p_input->>'discount_amount')::numeric, 0);
  v_stored jsonb;
  v_invoice invoices%rowtype;
begin
  if p_idempotency_key is not null and p_idempotency_key <> '' then
    select response into v_stored from idempotency_keys
     where shop_id = p_shop_id and key = p_idempotency_key and endpoint = 'create_invoice';
    if found and v_stored is not null then
      return v_stored;
    end if;
    insert into idempotency_keys (shop_id, key, endpoint) values (p_shop_id, p_idempotency_key, 'create_invoice');
  end if;

  select * into v_shop from shops where id = p_shop_id;
  if not found then raise exception 'Shop not found'; end if;
  v_invoice_number := coalesce(v_shop.invoice_prefix, 'INV-') || right(v_ms::text, 6);

  for v_item in select * from jsonb_array_elements(p_input->'items') loop
    select * into v_prod from products where shop_id = p_shop_id and id = v_item->>'product_id' for update;
    if not found then raise exception 'Product ID % not found in catalog.', v_item->>'product_id'; end if;
    if not v_shop.allow_negative_stock and not v_override and v_prod.current_quantity < (v_item->>'quantity')::integer then
      raise exception 'Insufficient stock for "%". Available: %, Requested: %. Override requires authorization.',
        v_prod.name, v_prod.current_quantity, (v_item->>'quantity')::integer;
    end if;
    v_qty_before := v_prod.current_quantity;
    v_qty_after := v_qty_before - (v_item->>'quantity')::integer;
    update products set current_quantity = v_qty_after, updated_at = v_now where shop_id = p_shop_id and id = v_prod.id;
    v_item_disc := coalesce((v_item->>'discount_amount')::numeric, 0);
    v_line_total := (v_item->>'quantity')::integer * (v_item->>'unit_price')::numeric - v_item_disc;
    v_subtotal := v_subtotal + v_line_total;
    v_items := v_items || jsonb_build_object(
      'id', 'ii-' || v_ms::text || floor(random()*10000)::int::text || '-' || v_prod.id,
      'product_id', v_prod.id, 'product_name', v_prod.name, 'brand', v_prod.brand, 'sku', v_prod.sku,
      'quantity', (v_item->>'quantity')::integer, 'unit_price', (v_item->>'unit_price')::numeric,
      'discount_amount', v_item_disc,
      'tax_rate', case when v_is_tax then coalesce(v_shop.default_gst_rate, 18) else 0 end,
      'line_total', v_line_total, 'cost_price_at_sale', coalesce(v_prod.purchase_cost, 0));
    insert into stock_movements (id, shop_id, product_id, product_name, user_id, user_name, movement_type, quantity_change, quantity_before, quantity_after, unit_cost, reference_id, reason, created_at)
    values ('mov-' || v_ms::text || floor(random()*10000)::int::text, p_shop_id, v_prod.id, v_prod.name,
            p_input->>'user_id', p_input->>'user_name', 'SALE', -(v_item->>'quantity')::integer, v_qty_before, v_qty_after,
            coalesce(v_prod.purchase_cost, 0), v_invoice_id, 'Sold on Inv #' || v_invoice_number, v_now);
  end loop;

  if v_is_tax and v_shop.enable_gst then
    v_tax := round(greatest(0, v_subtotal - v_overall_disc) * coalesce(v_shop.default_gst_rate, 18) / 100, 2);
  end if;
  v_total := round(greatest(0, v_subtotal - v_overall_disc) + v_tax);
  v_paid := coalesce((p_input->>'paid_amount')::numeric, v_total);
  v_payment_status := case when v_paid >= v_total then 'PAID' when v_paid > 0 then 'PARTIALLY_PAID' else 'PENDING' end;

  if p_input->>'customer_phone' is not null and p_input->>'customer_phone' <> '' then
    v_clean_phone := right(regexp_replace(p_input->>'customer_phone', '\D', '', 'g'), 10);
    select id into v_customer_id from customers where shop_id = p_shop_id and phone = v_clean_phone;
    if found then
      update customers set
        name = coalesce(nullif(p_input->>'customer_name',''), name),
        total_spent = coalesce(total_spent,0) + v_paid,
        visit_count = coalesce(visit_count,0) + 1,
        last_visit_at = v_now,
        outstanding_balance = coalesce(outstanding_balance,0) + case when v_paid < v_total then v_total - v_paid else 0 end
      where shop_id = p_shop_id and id = v_customer_id;
    else
      v_customer_id := 'cust-' || v_ms::text || floor(random()*10000)::int::text;
      insert into customers (id, shop_id, name, phone, outstanding_balance, total_spent, visit_count, last_visit_at, created_at)
      values (v_customer_id, p_shop_id, coalesce(nullif(p_input->>'customer_name',''),'Retail Customer'), v_clean_phone,
              case when v_paid < v_total then v_total - v_paid else 0 end, v_paid, 1, v_now, v_now);
    end if;
  end if;

  insert into invoices (id, shop_id, invoice_number, customer_id, customer_name, customer_phone, user_id, user_name,
                        items, subtotal_amount, discount_amount, tax_amount, total_amount, paid_amount,
                        payment_method, payment_status, status, is_tax_invoice, notes, created_at, updated_at)
  values (v_invoice_id, p_shop_id, v_invoice_number, v_customer_id,
          coalesce(nullif(p_input->>'customer_name',''),'Walk-in Customer'), nullif(p_input->>'customer_phone',''),
          p_input->>'user_id', p_input->>'user_name', v_items, v_subtotal, v_overall_disc, v_tax, v_total, v_paid,
          coalesce(nullif(p_input->>'payment_method',''),'CASH'), v_payment_status, 'FINALIZED', v_is_tax,
          nullif(p_input->>'notes',''), v_now, v_now)
  returning * into v_invoice;

  if p_idempotency_key is not null and p_idempotency_key <> '' then
    update idempotency_keys set response = to_jsonb(v_invoice) where shop_id = p_shop_id and key = p_idempotency_key;
  end if;
  return to_jsonb(v_invoice);
end;
$$;

-- Customer return in ONE transaction: return record, restock (if sellable),
-- movement, idempotency record.
create or replace function create_return_tx(p_shop_id text, p_idempotency_key text, p_input jsonb)
returns jsonb
language plpgsql as $$
declare
  v_prod products%rowtype;
  v_now timestamptz := now();
  v_ms bigint := (extract(epoch from v_now)*1000)::bigint;
  v_ret_id text := 'ret-' || v_ms::text || floor(random()*10000)::int::text;
  v_qty_before integer;
  v_qty_after integer;
  v_stored jsonb;
  v_ret customer_returns%rowtype;
begin
  if p_idempotency_key is not null and p_idempotency_key <> '' then
    select response into v_stored from idempotency_keys
     where shop_id = p_shop_id and key = p_idempotency_key and endpoint = 'create_return';
    if found and v_stored is not null then
      return v_stored;
    end if;
    insert into idempotency_keys (shop_id, key, endpoint) values (p_shop_id, p_idempotency_key, 'create_return');
  end if;

  select * into v_prod from products where shop_id = p_shop_id and id = p_input->>'product_id' for update;
  if not found then raise exception 'Product not found'; end if;

  insert into customer_returns (id, shop_id, invoice_id, customer_id, user_id, user_name, product_id, product_name, quantity, refund_amount, condition, reason, created_at)
  values (v_ret_id, p_shop_id, nullif(p_input->>'invoice_id',''), null, p_input->>'user_id', p_input->>'user_name',
          v_prod.id, v_prod.name, (p_input->>'quantity')::integer, coalesce((p_input->>'refund_amount')::numeric,0),
          coalesce(nullif(p_input->>'condition',''),'SELLABLE'), nullif(p_input->>'reason',''), v_now)
  returning * into v_ret;

  if coalesce(nullif(p_input->>'condition',''),'SELLABLE') = 'SELLABLE' then
    v_qty_before := v_prod.current_quantity;
    v_qty_after := v_qty_before + (p_input->>'quantity')::integer;
    update products set current_quantity = v_qty_after, updated_at = v_now where shop_id = p_shop_id and id = v_prod.id;
    insert into stock_movements (id, shop_id, product_id, product_name, user_id, user_name, movement_type, quantity_change, quantity_before, quantity_after, unit_cost, reason, created_at)
    values ('mov-' || v_ms::text || floor(random()*10000)::int::text, p_shop_id, v_prod.id, v_prod.name,
            p_input->>'user_id', p_input->>'user_name', 'CUSTOMER_RETURN', (p_input->>'quantity')::integer, v_qty_before, v_qty_after,
            coalesce(v_prod.purchase_cost,0), coalesce(nullif(p_input->>'reason',''),'Customer Return'), v_now);
  end if;

  if p_idempotency_key is not null and p_idempotency_key <> '' then
    update idempotency_keys set response = to_jsonb(v_ret) where shop_id = p_shop_id and key = p_idempotency_key;
  end if;
  return to_jsonb(v_ret);
end;
$$;

-- Purchase (stock-in) in ONE transaction: per-item restock + movements +
-- purchase insert + idempotency record. Unknown product aborts everything.
create or replace function create_purchase_tx(p_shop_id text, p_idempotency_key text, p_input jsonb)
returns jsonb
language plpgsql as $$
declare
  v_prod products%rowtype;
  v_item jsonb;
  v_items jsonb := '[]'::jsonb;
  v_subtotal numeric := 0;
  v_now timestamptz := now();
  v_ms bigint := (extract(epoch from v_now)*1000)::bigint;
  v_pur_id text := 'pur-' || v_ms::text || floor(random()*10000)::int::text;
  v_qty_before integer;
  v_qty_after integer;
  v_supplier_name text;
  v_stored jsonb;
  v_pur purchases%rowtype;
begin
  if p_idempotency_key is not null and p_idempotency_key <> '' then
    select response into v_stored from idempotency_keys
     where shop_id = p_shop_id and key = p_idempotency_key and endpoint = 'create_purchase';
    if found and v_stored is not null then
      return v_stored;
    end if;
    insert into idempotency_keys (shop_id, key, endpoint) values (p_shop_id, p_idempotency_key, 'create_purchase');
  end if;

  for v_item in select * from jsonb_array_elements(p_input->'items') loop
    select * into v_prod from products where shop_id = p_shop_id and id = v_item->>'product_id' for update;
    if not found then raise exception 'Product ID % not found in catalog.', v_item->>'product_id'; end if;
    v_qty_before := v_prod.current_quantity;
    v_qty_after := v_qty_before + (v_item->>'quantity_received')::integer;
    update products set current_quantity = v_qty_after,
                        purchase_cost = coalesce((v_item->>'unit_cost')::numeric, purchase_cost),
                        updated_at = v_now
     where shop_id = p_shop_id and id = v_prod.id;
    v_subtotal := v_subtotal + (v_item->>'quantity_received')::integer * coalesce((v_item->>'unit_cost')::numeric, 0);
    v_items := v_items || jsonb_build_object(
      'id', 'pi-' || v_ms::text || floor(random()*10000)::int::text || '-' || v_prod.id,
      'product_id', v_prod.id, 'product_name', v_prod.name,
      'quantity_received', (v_item->>'quantity_received')::integer,
      'unit_cost', coalesce((v_item->>'unit_cost')::numeric, 0),
      'line_total', (v_item->>'quantity_received')::integer * coalesce((v_item->>'unit_cost')::numeric, 0));
    insert into stock_movements (id, shop_id, product_id, product_name, user_id, user_name, movement_type, quantity_change, quantity_before, quantity_after, unit_cost, reason, created_at)
    values ('mov-' || v_ms::text || floor(random()*10000)::int::text, p_shop_id, v_prod.id, v_prod.name,
            p_input->>'user_id', p_input->>'user_name', 'PURCHASE', (v_item->>'quantity_received')::integer, v_qty_before, v_qty_after,
            coalesce((v_item->>'unit_cost')::numeric, 0), 'Stock In: Inv #' || coalesce(nullif(p_input->>'supplier_invoice_number',''),'N/A'), v_now);
  end loop;

  if p_input->>'supplier_id' is not null and p_input->>'supplier_id' <> '' then
    select name into v_supplier_name from suppliers where shop_id = p_shop_id and id = p_input->>'supplier_id';
  end if;

  insert into purchases (id, shop_id, supplier_id, supplier_name, user_id, user_name, supplier_invoice_number,
                         purchase_date, items, subtotal_amount, shipping_expenses, tax_amount, total_amount, notes, created_at)
  values (v_pur_id, p_shop_id, nullif(p_input->>'supplier_id',''), v_supplier_name, p_input->>'user_id', p_input->>'user_name',
          nullif(p_input->>'supplier_invoice_number',''),
          coalesce(nullif(p_input->>'purchase_date','')::date, v_now::date), v_items, v_subtotal,
          coalesce((p_input->>'shipping_expenses')::numeric,0), coalesce((p_input->>'tax_amount')::numeric,0),
          v_subtotal + coalesce((p_input->>'shipping_expenses')::numeric,0) + coalesce((p_input->>'tax_amount')::numeric,0),
          nullif(p_input->>'notes',''), v_now)
  returning * into v_pur;

  if p_idempotency_key is not null and p_idempotency_key <> '' then
    update idempotency_keys set response = to_jsonb(v_pur) where shop_id = p_shop_id and key = p_idempotency_key;
  end if;
  return to_jsonb(v_pur);
end;
$$;

-- Invoice cancellation in ONE transaction: atomic status claim, restock,
-- movements. A second cancel (even concurrent) sees the claim and aborts.
create or replace function cancel_invoice_tx(p_shop_id text, p_invoice_id text, p_user_id text, p_user_name text, p_reason text)
returns jsonb
language plpgsql as $$
declare
  v_inv invoices%rowtype;
  v_item jsonb;
  v_now timestamptz := now();
  v_ms bigint := (extract(epoch from v_now)*1000)::bigint;
  v_qty_before integer;
  v_qty_after integer;
  v_prod products%rowtype;
begin
  update invoices set status = 'CANCELLED', cancellation_reason = p_reason, cancelled_by = p_user_id, cancelled_at = v_now, updated_at = v_now
   where shop_id = p_shop_id and id = p_invoice_id and status <> 'CANCELLED'
  returning * into v_inv;
  if not found then
    select * into v_inv from invoices where shop_id = p_shop_id and id = p_invoice_id;
    if not found then raise exception 'Invoice not found'; end if;
    raise exception 'Invoice is already cancelled';
  end if;

  for v_item in select * from jsonb_array_elements(coalesce(v_inv.items, '[]'::jsonb)) loop
    if v_item->>'product_id' is null then continue; end if;
    select * into v_prod from products where shop_id = p_shop_id and id = v_item->>'product_id' for update;
    if not found then continue; end if;
    v_qty_before := v_prod.current_quantity;
    v_qty_after := v_qty_before + (v_item->>'quantity')::integer;
    update products set current_quantity = v_qty_after, updated_at = v_now where shop_id = p_shop_id and id = v_prod.id;
    insert into stock_movements (id, shop_id, product_id, product_name, user_id, user_name, movement_type, quantity_change, quantity_before, quantity_after, unit_cost, reference_id, reason, created_at)
    values ('mov-' || v_ms::text || floor(random()*10000)::int::text, p_shop_id, v_prod.id, v_prod.name,
            p_user_id, p_user_name, 'CUSTOMER_RETURN', (v_item->>'quantity')::integer, v_qty_before, v_qty_after,
            coalesce((v_item->>'cost_price_at_sale')::numeric, 0), v_inv.id, 'Bill cancelled #' || v_inv.invoice_number || ': ' || p_reason, v_now);
  end loop;

  return to_jsonb(v_inv);
end;
$$;

-- Idempotency conflict detection: a key reused with a different payload is a 409.
alter table idempotency_keys add column if not exists request_hash text;

create or replace function create_invoice_tx(p_shop_id text, p_idempotency_key text, p_input jsonb)
returns jsonb
language plpgsql as $$
declare
  v_shop shops%rowtype;
  v_prod products%rowtype;
  v_item jsonb;
  v_items jsonb := '[]'::jsonb;
  v_subtotal numeric := 0;
  v_tax numeric := 0;
  v_total numeric;
  v_paid numeric;
  v_payment_status text;
  v_now timestamptz := now();
  v_ms bigint := (extract(epoch from v_now)*1000)::bigint;
  v_invoice_id text := 'inv-' || v_ms::text || floor(random()*10000)::int::text;
  v_invoice_number text;
  v_customer_id text;
  v_clean_phone text;
  v_line_total numeric;
  v_item_disc numeric;
  v_qty_before integer;
  v_qty_after integer;
  v_override boolean := coalesce((p_input->>'allow_negative_override')::boolean, false);
  v_is_tax boolean := coalesce((p_input->>'is_tax_invoice')::boolean, false);
  v_overall_disc numeric := coalesce((p_input->>'discount_amount')::numeric, 0);
  v_stored jsonb;
  v_hash text := md5(p_input::text);
  v_existing_hash text;
  v_invoice invoices%rowtype;
begin
  if p_idempotency_key is not null and p_idempotency_key <> '' then
    select response, request_hash into v_stored, v_existing_hash from idempotency_keys
     where shop_id = p_shop_id and key = p_idempotency_key and endpoint = 'create_invoice';
    if found then
      if v_existing_hash is not null and v_existing_hash <> v_hash then
        raise exception 'IDEMPOTENCY_CONFLICT: this key was already used with a different bill';
      end if;
      if v_stored is not null then
        return v_stored;
      end if;
    end if;
    insert into idempotency_keys (shop_id, key, endpoint, request_hash) values (p_shop_id, p_idempotency_key, 'create_invoice', v_hash)
    on conflict (shop_id, key) do nothing;
  end if;

  select * into v_shop from shops where id = p_shop_id;
  if not found then raise exception 'Shop not found'; end if;
  v_invoice_number := coalesce(v_shop.invoice_prefix, 'INV-') || right(v_ms::text, 6);

  for v_item in select * from jsonb_array_elements(p_input->'items') loop
    select * into v_prod from products where shop_id = p_shop_id and id = v_item->>'product_id' for update;
    if not found then raise exception 'Product ID % not found in catalog.', v_item->>'product_id'; end if;
    if not v_shop.allow_negative_stock and not v_override and v_prod.current_quantity < (v_item->>'quantity')::integer then
      raise exception 'Insufficient stock for "%". Available: %, Requested: %. Override requires authorization.',
        v_prod.name, v_prod.current_quantity, (v_item->>'quantity')::integer;
    end if;
    v_qty_before := v_prod.current_quantity;
    v_qty_after := v_qty_before - (v_item->>'quantity')::integer;
    update products set current_quantity = v_qty_after, updated_at = v_now where shop_id = p_shop_id and id = v_prod.id;
    v_item_disc := coalesce((v_item->>'discount_amount')::numeric, 0);
    v_line_total := (v_item->>'quantity')::integer * (v_item->>'unit_price')::numeric - v_item_disc;
    v_subtotal := v_subtotal + v_line_total;
    v_items := v_items || jsonb_build_object(
      'id', 'ii-' || v_ms::text || floor(random()*10000)::int::text || '-' || v_prod.id,
      'product_id', v_prod.id, 'product_name', v_prod.name, 'brand', v_prod.brand, 'sku', v_prod.sku,
      'quantity', (v_item->>'quantity')::integer, 'unit_price', (v_item->>'unit_price')::numeric,
      'discount_amount', v_item_disc,
      'tax_rate', case when v_is_tax then coalesce(v_shop.default_gst_rate, 18) else 0 end,
      'line_total', v_line_total, 'cost_price_at_sale', coalesce(v_prod.purchase_cost, 0));
    insert into stock_movements (id, shop_id, product_id, product_name, user_id, user_name, movement_type, quantity_change, quantity_before, quantity_after, unit_cost, reference_id, reason, created_at)
    values ('mov-' || v_ms::text || floor(random()*10000)::int::text, p_shop_id, v_prod.id, v_prod.name,
            p_input->>'user_id', p_input->>'user_name', 'SALE', -(v_item->>'quantity')::integer, v_qty_before, v_qty_after,
            coalesce(v_prod.purchase_cost, 0), v_invoice_id, 'Sold on Inv #' || v_invoice_number, v_now);
  end loop;

  if v_is_tax and v_shop.enable_gst then
    v_tax := round(greatest(0, v_subtotal - v_overall_disc) * coalesce(v_shop.default_gst_rate, 18) / 100, 2);
  end if;
  v_total := round(greatest(0, v_subtotal - v_overall_disc) + v_tax);
  v_paid := coalesce((p_input->>'paid_amount')::numeric, v_total);
  v_payment_status := case when v_paid >= v_total then 'PAID' when v_paid > 0 then 'PARTIALLY_PAID' else 'PENDING' end;

  if p_input->>'customer_phone' is not null and p_input->>'customer_phone' <> '' then
    v_clean_phone := right(regexp_replace(p_input->>'customer_phone', '\D', '', 'g'), 10);
    select id into v_customer_id from customers where shop_id = p_shop_id and phone = v_clean_phone;
    if found then
      update customers set
        name = coalesce(nullif(p_input->>'customer_name',''), name),
        total_spent = coalesce(total_spent,0) + v_paid,
        visit_count = coalesce(visit_count,0) + 1,
        last_visit_at = v_now,
        outstanding_balance = coalesce(outstanding_balance,0) + case when v_paid < v_total then v_total - v_paid else 0 end
      where shop_id = p_shop_id and id = v_customer_id;
    else
      v_customer_id := 'cust-' || v_ms::text || floor(random()*10000)::int::text;
      insert into customers (id, shop_id, name, phone, outstanding_balance, total_spent, visit_count, last_visit_at, created_at)
      values (v_customer_id, p_shop_id, coalesce(nullif(p_input->>'customer_name',''),'Retail Customer'), v_clean_phone,
              case when v_paid < v_total then v_total - v_paid else 0 end, v_paid, 1, v_now, v_now);
    end if;
  end if;

  insert into invoices (id, shop_id, invoice_number, customer_id, customer_name, customer_phone, user_id, user_name,
                        items, subtotal_amount, discount_amount, tax_amount, total_amount, paid_amount,
                        payment_method, payment_status, status, is_tax_invoice, notes, created_at, updated_at)
  values (v_invoice_id, p_shop_id, v_invoice_number, v_customer_id,
          coalesce(nullif(p_input->>'customer_name',''),'Walk-in Customer'), nullif(p_input->>'customer_phone',''),
          p_input->>'user_id', p_input->>'user_name', v_items, v_subtotal, v_overall_disc, v_tax, v_total, v_paid,
          coalesce(nullif(p_input->>'payment_method',''),'CASH'), v_payment_status, 'FINALIZED', v_is_tax,
          nullif(p_input->>'notes',''), v_now, v_now)
  returning * into v_invoice;

  if p_idempotency_key is not null and p_idempotency_key <> '' then
    update idempotency_keys set response = to_jsonb(v_invoice), request_hash = v_hash where shop_id = p_shop_id and key = p_idempotency_key;
  end if;
  return to_jsonb(v_invoice);
end;
$$;

create or replace function create_return_tx(p_shop_id text, p_idempotency_key text, p_input jsonb)
returns jsonb
language plpgsql as $$
declare
  v_prod products%rowtype;
  v_now timestamptz := now();
  v_ms bigint := (extract(epoch from v_now)*1000)::bigint;
  v_ret_id text := 'ret-' || v_ms::text || floor(random()*10000)::int::text;
  v_qty_before integer;
  v_qty_after integer;
  v_stored jsonb;
  v_hash text := md5(p_input::text);
  v_existing_hash text;
  v_ret customer_returns%rowtype;
begin
  if p_idempotency_key is not null and p_idempotency_key <> '' then
    select response, request_hash into v_stored, v_existing_hash from idempotency_keys
     where shop_id = p_shop_id and key = p_idempotency_key and endpoint = 'create_return';
    if found then
      if v_existing_hash is not null and v_existing_hash <> v_hash then
        raise exception 'IDEMPOTENCY_CONFLICT: this key was already used with a different return';
      end if;
      if v_stored is not null then
        return v_stored;
      end if;
    end if;
    insert into idempotency_keys (shop_id, key, endpoint, request_hash) values (p_shop_id, p_idempotency_key, 'create_return', v_hash)
    on conflict (shop_id, key) do nothing;
  end if;

  select * into v_prod from products where shop_id = p_shop_id and id = p_input->>'product_id' for update;
  if not found then raise exception 'Product not found'; end if;

  insert into customer_returns (id, shop_id, invoice_id, customer_id, user_id, user_name, product_id, product_name, quantity, refund_amount, condition, reason, created_at)
  values (v_ret_id, p_shop_id, nullif(p_input->>'invoice_id',''), null, p_input->>'user_id', p_input->>'user_name',
          v_prod.id, v_prod.name, (p_input->>'quantity')::integer, coalesce((p_input->>'refund_amount')::numeric,0),
          coalesce(nullif(p_input->>'condition',''),'SELLABLE'), nullif(p_input->>'reason',''), v_now)
  returning * into v_ret;

  if coalesce(nullif(p_input->>'condition',''),'SELLABLE') = 'SELLABLE' then
    v_qty_before := v_prod.current_quantity;
    v_qty_after := v_qty_before + (p_input->>'quantity')::integer;
    update products set current_quantity = v_qty_after, updated_at = v_now where shop_id = p_shop_id and id = v_prod.id;
    insert into stock_movements (id, shop_id, product_id, product_name, user_id, user_name, movement_type, quantity_change, quantity_before, quantity_after, unit_cost, reason, created_at)
    values ('mov-' || v_ms::text || floor(random()*10000)::int::text, p_shop_id, v_prod.id, v_prod.name,
            p_input->>'user_id', p_input->>'user_name', 'CUSTOMER_RETURN', (p_input->>'quantity')::integer, v_qty_before, v_qty_after,
            coalesce(v_prod.purchase_cost,0), coalesce(nullif(p_input->>'reason',''),'Customer Return'), v_now);
  end if;

  if p_idempotency_key is not null and p_idempotency_key <> '' then
    update idempotency_keys set response = to_jsonb(v_ret), request_hash = v_hash where shop_id = p_shop_id and key = p_idempotency_key;
  end if;
  return to_jsonb(v_ret);
end;
$$;

create or replace function create_purchase_tx(p_shop_id text, p_idempotency_key text, p_input jsonb)
returns jsonb
language plpgsql as $$
declare
  v_prod products%rowtype;
  v_item jsonb;
  v_items jsonb := '[]'::jsonb;
  v_subtotal numeric := 0;
  v_now timestamptz := now();
  v_ms bigint := (extract(epoch from v_now)*1000)::bigint;
  v_pur_id text := 'pur-' || v_ms::text || floor(random()*10000)::int::text;
  v_qty_before integer;
  v_qty_after integer;
  v_supplier_name text;
  v_stored jsonb;
  v_hash text := md5(p_input::text);
  v_existing_hash text;
  v_pur purchases%rowtype;
begin
  if p_idempotency_key is not null and p_idempotency_key <> '' then
    select response, request_hash into v_stored, v_existing_hash from idempotency_keys
     where shop_id = p_shop_id and key = p_idempotency_key and endpoint = 'create_purchase';
    if found then
      if v_existing_hash is not null and v_existing_hash <> v_hash then
        raise exception 'IDEMPOTENCY_CONFLICT: this key was already used with a different purchase';
      end if;
      if v_stored is not null then
        return v_stored;
      end if;
    end if;
    insert into idempotency_keys (shop_id, key, endpoint, request_hash) values (p_shop_id, p_idempotency_key, 'create_purchase', v_hash)
    on conflict (shop_id, key) do nothing;
  end if;

  for v_item in select * from jsonb_array_elements(p_input->'items') loop
    select * into v_prod from products where shop_id = p_shop_id and id = v_item->>'product_id' for update;
    if not found then raise exception 'Product ID % not found in catalog.', v_item->>'product_id'; end if;
    v_qty_before := v_prod.current_quantity;
    v_qty_after := v_qty_before + (v_item->>'quantity_received')::integer;
    update products set current_quantity = v_qty_after,
                        purchase_cost = coalesce((v_item->>'unit_cost')::numeric, purchase_cost),
                        updated_at = v_now
     where shop_id = p_shop_id and id = v_prod.id;
    v_subtotal := v_subtotal + (v_item->>'quantity_received')::integer * coalesce((v_item->>'unit_cost')::numeric, 0);
    v_items := v_items || jsonb_build_object(
      'id', 'pi-' || v_ms::text || floor(random()*10000)::int::text || '-' || v_prod.id,
      'product_id', v_prod.id, 'product_name', v_prod.name,
      'quantity_received', (v_item->>'quantity_received')::integer,
      'unit_cost', coalesce((v_item->>'unit_cost')::numeric, 0),
      'line_total', (v_item->>'quantity_received')::integer * coalesce((v_item->>'unit_cost')::numeric, 0));
    insert into stock_movements (id, shop_id, product_id, product_name, user_id, user_name, movement_type, quantity_change, quantity_before, quantity_after, unit_cost, reason, created_at)
    values ('mov-' || v_ms::text || floor(random()*10000)::int::text, p_shop_id, v_prod.id, v_prod.name,
            p_input->>'user_id', p_input->>'user_name', 'PURCHASE', (v_item->>'quantity_received')::integer, v_qty_before, v_qty_after,
            coalesce((v_item->>'unit_cost')::numeric, 0), 'Stock In: Inv #' || coalesce(nullif(p_input->>'supplier_invoice_number',''),'N/A'), v_now);
  end loop;

  if p_input->>'supplier_id' is not null and p_input->>'supplier_id' <> '' then
    select name into v_supplier_name from suppliers where shop_id = p_shop_id and id = p_input->>'supplier_id';
  end if;

  insert into purchases (id, shop_id, supplier_id, supplier_name, user_id, user_name, supplier_invoice_number,
                         purchase_date, items, subtotal_amount, shipping_expenses, tax_amount, total_amount, notes, created_at)
  values (v_pur_id, p_shop_id, nullif(p_input->>'supplier_id',''), v_supplier_name, p_input->>'user_id', p_input->>'user_name',
          nullif(p_input->>'supplier_invoice_number',''),
          coalesce(nullif(p_input->>'purchase_date','')::date, v_now::date), v_items, v_subtotal,
          coalesce((p_input->>'shipping_expenses')::numeric,0), coalesce((p_input->>'tax_amount')::numeric,0),
          v_subtotal + coalesce((p_input->>'shipping_expenses')::numeric,0) + coalesce((p_input->>'tax_amount')::numeric,0),
          nullif(p_input->>'notes',''), v_now)
  returning * into v_pur;

  if p_idempotency_key is not null and p_idempotency_key <> '' then
    update idempotency_keys set response = to_jsonb(v_pur), request_hash = v_hash where shop_id = p_shop_id and key = p_idempotency_key;
  end if;
  return to_jsonb(v_pur);
end;
$$;

-- Physical stock adjustment in ONE transaction: absolute set + movement record.
create or replace function adjust_stock_tx(p_shop_id text, p_product_id text, p_new_quantity integer, p_reason text, p_user_id text, p_user_name text)
returns jsonb
language plpgsql as $$
declare
  v_prod products%rowtype;
  v_now timestamptz := now();
  v_ms bigint := (extract(epoch from v_now)*1000)::bigint;
  v_mov stock_movements%rowtype;
begin
  select * into v_prod from products where shop_id = p_shop_id and id = p_product_id for update;
  if not found then raise exception 'Product not found'; end if;
  update products set current_quantity = p_new_quantity, updated_at = v_now where shop_id = p_shop_id and id = v_prod.id;
  insert into stock_movements (id, shop_id, product_id, product_name, user_id, user_name, movement_type, quantity_change, quantity_before, quantity_after, unit_cost, reason, created_at)
  values ('mov-' || v_ms::text || floor(random()*10000)::int::text, p_shop_id, v_prod.id, v_prod.name,
          p_user_id, p_user_name, 'ADJUSTMENT', p_new_quantity - v_prod.current_quantity, v_prod.current_quantity, p_new_quantity,
          coalesce(v_prod.purchase_cost,0), coalesce(nullif(p_reason,''),'Physical Stock Count Reconciliation'), v_now)
  returning * into v_mov;
  return to_jsonb(v_mov);
end;
$$;
