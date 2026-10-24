import { SupabaseClient } from '@supabase/supabase-js';
import {
  Shop,
  UserProfile,
  Category,
  Supplier,
  Product,
  StockMovement,
  Purchase,
  Invoice,
  Customer,
  ReturnRecord,
  DailyLedgerRow,
} from '@/types';

function newId(prefix: string): string {
  return `${prefix}-${Date.now()}${Math.floor(Math.random() * 10000)}`;
}

function throwIf(error: any, context: string) {
  if (error) throw new Error(`${context}: ${error.message || error}`);
}

// Async, shop-scoped port of dbService backed by Supabase/Postgres.
// Every method is restricted to this instance's shopId.
export class SupabaseDb {
  constructor(private client: SupabaseClient, private shopId: string) {}

  async getShop(): Promise<Shop> {
    const { data, error } = await this.client.from('shops').select('*').eq('id', this.shopId).single();
    throwIf(error, 'getShop');
    return data as Shop;
  }

  async updateShop(updates: Partial<Shop>): Promise<Shop> {
    delete (updates as any).id;
    delete (updates as any).shop_id;
    const { data, error } = await this.client
      .from('shops')
      .update(updates)
      .eq('id', this.shopId)
      .select()
      .single();
    throwIf(error, 'updateShop');
    return data as Shop;
  }

  async getUsers(): Promise<UserProfile[]> {
    const { data, error } = await this.client.from('users').select('*').eq('shop_id', this.shopId);
    throwIf(error, 'getUsers');
    return (data || []) as UserProfile[];
  }

  async getUserByEmail(email: string): Promise<UserProfile | undefined> {
    const { data, error } = await this.client
      .from('users')
      .select('*')
      .eq('shop_id', this.shopId)
      .ilike('email', email)
      .maybeSingle();
    throwIf(error, 'getUserByEmail');
    return (data as UserProfile) || undefined;
  }

  async getUserById(id: string): Promise<UserProfile | undefined> {
    const { data, error } = await this.client
      .from('users')
      .select('*')
      .eq('shop_id', this.shopId)
      .eq('id', id)
      .maybeSingle();
    throwIf(error, 'getUserById');
    return (data as UserProfile) || undefined;
  }

  async updateUserPermissions(userId: string, permissions: Partial<UserProfile>): Promise<UserProfile> {
    delete (permissions as any).id;
    delete (permissions as any).shop_id;
    (permissions as any).updated_at = new Date().toISOString();
    const { data, error } = await this.client
      .from('users')
      .update(permissions)
      .eq('shop_id', this.shopId)
      .eq('id', userId)
      .select()
      .maybeSingle();
    throwIf(error, 'updateUserPermissions');
    if (!data) throw new Error('User not found');
    return data as UserProfile;
  }

  async getCategories(): Promise<Category[]> {
    const { data, error } = await this.client.from('categories').select('*').eq('shop_id', this.shopId);
    throwIf(error, 'getCategories');
    return (data || []) as Category[];
  }

  async addCategory(name: string, description?: string): Promise<Category> {
    const newCat = { id: newId('cat'), shop_id: this.shopId, name, description };
    const { data, error } = await this.client.from('categories').insert(newCat).select().single();
    throwIf(error, 'addCategory');
    return data as Category;
  }

  async getSuppliers(): Promise<Supplier[]> {
    const { data, error } = await this.client.from('suppliers').select('*').eq('shop_id', this.shopId);
    throwIf(error, 'getSuppliers');
    return (data || []) as Supplier[];
  }

  async addSupplier(supplier: Omit<Supplier, 'id' | 'shop_id'>): Promise<Supplier> {
    const newSup = { ...supplier, id: newId('sup'), shop_id: this.shopId };
    const { data, error } = await this.client.from('suppliers').insert(newSup).select().single();
    throwIf(error, 'addSupplier');
    return data as Supplier;
  }

  async getProducts(): Promise<Product[]> {
    const { data, error } = await this.client.from('products').select('*').eq('shop_id', this.shopId);
    throwIf(error, 'getProducts');
    return ((data || []) as Product[]).map((p) => ({ ...p, current_quantity: Number(p.current_quantity), purchase_cost: Number(p.purchase_cost), selling_price: Number(p.selling_price), min_stock_level: Number(p.min_stock_level) }));
  }

  async getProductById(id: string): Promise<Product | undefined> {
    const { data, error } = await this.client
      .from('products')
      .select('*')
      .eq('shop_id', this.shopId)
      .eq('id', id)
      .maybeSingle();
    throwIf(error, 'getProductById');
    return (data as Product) || undefined;
  }

  private async updateProductQty(productId: string, qty: number, extra: Record<string, any> = {}) {
    const { error } = await this.client
      .from('products')
      .update({ current_quantity: qty, updated_at: new Date().toISOString(), ...extra })
      .eq('shop_id', this.shopId)
      .eq('id', productId);
    throwIf(error, 'updateProductQty');
  }

  // Atomic stock adjustment via RPC - safe under concurrent invoices.
  private async adjustStock(productId: string, delta: number, requireNonNegative = false): Promise<{ ok: boolean; newQty: number | null }> {
    const { data, error } = await this.client.rpc('adjust_stock', {
      p_shop_id: this.shopId,
      p_product_id: productId,
      p_delta: delta,
      p_require_nonnegative: requireNonNegative,
    });
    throwIf(error, 'adjustStock');
    const row = Array.isArray(data) ? data[0] : data;
    return { ok: Boolean(row?.ok), newQty: row?.new_qty === undefined || row?.new_qty === null ? null : Number(row.new_qty) };
  }

  // Transactional invoice creation: whole bill in one DB transaction with
  // durable idempotency. A retried idempotency key returns the original bill.
  async createInvoiceTx(idempotencyKey: string, input: Record<string, any>): Promise<Invoice> {
    const { data, error } = await this.client.rpc('create_invoice_tx', {
      p_shop_id: this.shopId,
      p_idempotency_key: idempotencyKey,
      p_input: input,
    });
    throwIf(error, 'createInvoiceTx');
    return data as Invoice;
  }

  // Transactional purchase (stock-in) with durable idempotency.
  async createPurchaseTx(idempotencyKey: string, input: Record<string, any>): Promise<any> {
    const { data, error } = await this.client.rpc('create_purchase_tx', {
      p_shop_id: this.shopId,
      p_idempotency_key: idempotencyKey,
      p_input: input,
    });
    throwIf(error, 'createPurchaseTx');
    return data;
  }

  // Transactional physical stock adjustment: absolute set + movement in one tx.
  async adjustStockTx(productId: string, newQuantity: number, reason: string, userId: string, userName: string): Promise<any> {
    const { data, error } = await this.client.rpc('adjust_stock_tx', {
      p_shop_id: this.shopId,
      p_product_id: productId,
      p_new_quantity: newQuantity,
      p_reason: reason,
      p_user_id: userId,
      p_user_name: userName,
    });
    throwIf(error, 'adjustStockTx');
    return data;
  }

  // Transactional cancel: atomic status claim + restock in one DB transaction.
  async cancelInvoiceTx(invoiceId: string, userId: string, userName: string, reason: string): Promise<Invoice> {
    const { data, error } = await this.client.rpc('cancel_invoice_tx', {
      p_shop_id: this.shopId,
      p_invoice_id: invoiceId,
      p_user_id: userId,
      p_user_name: userName,
      p_reason: reason,
    });
    throwIf(error, 'cancelInvoiceTx');
    return data as Invoice;
  }

  // Transactional customer return with durable idempotency.
  async createReturnTx(idempotencyKey: string, input: Record<string, any>): Promise<any> {
    const { data, error } = await this.client.rpc('create_return_tx', {
      p_shop_id: this.shopId,
      p_idempotency_key: idempotencyKey,
      p_input: input,
    });
    throwIf(error, 'createReturnTx');
    return data;
  }

  private async insertMovement(m: Omit<StockMovement, 'id' | 'shop_id'> & { id?: string }) {
    const row = { ...m, id: m.id || newId('mov'), shop_id: this.shopId };
    const { error } = await this.client.from('stock_movements').insert(row);
    throwIf(error, 'insertMovement');
  }

  async saveProduct(productData: Partial<Product> & { name: string; selling_price: number }): Promise<Product> {
    if (productData.id) {
      const existing = await this.getProductById(productData.id);
      if (!existing) throw new Error('Product not found');
      if (true) {
        const updates: any = { ...productData, updated_at: new Date().toISOString() };
        delete updates.id;
        delete updates.shop_id;
        const { data, error } = await this.client
          .from('products')
          .update(updates)
          .eq('shop_id', this.shopId)
          .eq('id', productData.id)
          .select()
          .single();
        throwIf(error, 'saveProduct(update)');
        return data as Product;
      }
    }
    const now = new Date().toISOString();
    const newProd: any = {
      id: newId('prod'),
      shop_id: this.shopId,
      category_id: productData.category_id,
      category_name: productData.category_name,
      supplier_id: productData.supplier_id,
      supplier_name: productData.supplier_name,
      name: productData.name,
      brand: productData.brand || 'Generic',
      compatible_models: productData.compatible_models || '',
      sku: productData.sku || `SKU-${Date.now().toString().slice(-6)}`,
      barcode: productData.barcode || '',
      purchase_cost: Number(productData.purchase_cost) || 0,
      selling_price: Number(productData.selling_price) || 0,
      current_quantity: Number(productData.current_quantity) || 0,
      min_stock_level: Number(productData.min_stock_level) || 5,
      is_active: productData.is_active ?? true,
      created_at: now,
      updated_at: now,
    };
    const { data, error } = await this.client.from('products').insert(newProd).select().single();
    throwIf(error, 'saveProduct(insert)');
    if (newProd.current_quantity > 0) {
      await this.insertMovement({
        product_id: newProd.id,
        product_name: newProd.name,
        user_id: 'system',
        user_name: 'System',
        movement_type: 'OPENING',
        quantity_change: newProd.current_quantity,
        quantity_before: 0,
        quantity_after: newProd.current_quantity,
        unit_cost: newProd.purchase_cost,
        reason: 'New Product Initial Stock',
        created_at: now,
      } as any);
    }
    return data as Product;
  }

  async deleteProduct(productId: string): Promise<boolean> {
    const { data, error } = await this.client
      .from('products')
      .update({ is_active: false })
      .eq('shop_id', this.shopId)
      .eq('id', productId)
      .select('id');
    throwIf(error, 'deleteProduct');
    return (data || []).length > 0;
  }

  async recordPurchase(purchaseData: {
    supplier_id?: string;
    supplier_invoice_number?: string;
    purchase_date: string;
    items: Array<{ product_id: string; quantity_received: number; unit_cost: number }>;
    shipping_expenses?: number;
    tax_amount?: number;
    notes?: string;
    user_id: string;
    user_name: string;
  }): Promise<Purchase> {
    const now = new Date().toISOString();
    let subtotal = 0;
    const purchaseItems: any[] = [];

    for (const item of purchaseData.items) {
      const prod = await this.getProductById(item.product_id);
      if (!prod) continue;
      const lineTotal = item.quantity_received * item.unit_cost;
      subtotal += lineTotal;
      const adj = await this.adjustStock(prod.id, item.quantity_received);
      const qtyAfter = adj.newQty ?? Number(prod.current_quantity) + item.quantity_received;
      const qtyBefore = qtyAfter - item.quantity_received;
      if (item.unit_cost !== undefined) {
        await this.client.from('products').update({ purchase_cost: item.unit_cost, updated_at: new Date().toISOString() }).eq('shop_id', this.shopId).eq('id', prod.id);
      }
      purchaseItems.push({
        id: `${newId('pi')}-${item.product_id}`,
        product_id: item.product_id,
        product_name: prod.name,
        quantity_received: item.quantity_received,
        unit_cost: item.unit_cost,
        line_total: lineTotal,
      });
      await this.insertMovement({
        product_id: prod.id,
        product_name: prod.name,
        user_id: purchaseData.user_id,
        user_name: purchaseData.user_name,
        movement_type: 'PURCHASE',
        quantity_change: item.quantity_received,
        quantity_before: qtyBefore,
        quantity_after: qtyAfter,
        unit_cost: item.unit_cost,
        reason: `Stock In: Inv #${purchaseData.supplier_invoice_number || 'N/A'}`,
        created_at: now,
      } as any);
    }

    let supplierName: string | undefined;
    if (purchaseData.supplier_id) {
      const { data: sup } = await this.client
        .from('suppliers')
        .select('name')
        .eq('shop_id', this.shopId)
        .eq('id', purchaseData.supplier_id)
        .maybeSingle();
      supplierName = sup?.name;
    }
    const shipping = Number(purchaseData.shipping_expenses) || 0;
    const tax = Number(purchaseData.tax_amount) || 0;
    const newPurchase: any = {
      id: newId('pur'),
      shop_id: this.shopId,
      supplier_id: purchaseData.supplier_id,
      supplier_name: supplierName,
      user_id: purchaseData.user_id,
      user_name: purchaseData.user_name,
      supplier_invoice_number: purchaseData.supplier_invoice_number,
      purchase_date: purchaseData.purchase_date || now.split('T')[0],
      items: purchaseItems,
      subtotal_amount: subtotal,
      shipping_expenses: shipping,
      tax_amount: tax,
      total_amount: subtotal + shipping + tax,
      notes: purchaseData.notes,
      created_at: now,
    };
    const { data, error } = await this.client.from('purchases').insert(newPurchase).select().single();
    throwIf(error, 'recordPurchase');
    return data as Purchase;
  }

  async createInvoice(invoiceData: {
    customer_name: string;
    customer_phone?: string;
    user_id: string;
    user_name: string;
    items: Array<{ product_id: string; quantity: number; unit_price: number; discount_amount?: number }>;
    discount_amount?: number;
    tax_rate?: number;
    payment_method: any;
    paid_amount?: number;
    is_tax_invoice?: boolean;
    notes?: string;
    allow_negative_override?: boolean;
    override_reason?: string;
  }): Promise<Invoice> {
    const shop = await this.getShop();

    // 1. Resolve products (stock is decremented atomically in step 2)
    const prods: Record<string, Product> = {};
    for (const item of invoiceData.items) {
      const prod = await this.getProductById(item.product_id);
      if (!prod) throw new Error(`Product ID ${item.product_id} not found in catalog.`);
      prods[item.product_id] = prod;
    }

    const now = new Date().toISOString();
    const invoiceNumber = `${shop.invoice_prefix || 'INV-'}${Date.now().toString().slice(-6)}`;
    let subtotal = 0;
    const invoiceItems: any[] = [];

    // 2. Deduct stock + movements
    const decremented: Array<{ product_id: string; quantity: number }> = [];
    try {
    for (const item of invoiceData.items) {
      const prod = prods[item.product_id];
      const itemDisc = Number(item.discount_amount) || 0;
      const lineTotal = item.quantity * item.unit_price - itemDisc;
      subtotal += lineTotal;
      const dec = await this.adjustStock(prod.id, -item.quantity, !shop.allow_negative_stock && !invoiceData.allow_negative_override);
      if (!dec.ok) {
        throw new Error(
          `Insufficient stock for "${prod.name}". Available: ${dec.newQty ?? 0}, Requested: ${item.quantity}. Override requires authorization.`
        );
      }
      decremented.push({ product_id: item.product_id, quantity: item.quantity });
      const qtyAfter = dec.newQty ?? 0;
      const qtyBefore = qtyAfter + item.quantity;
      invoiceItems.push({
        id: `${newId('ii')}-${prod.id}`,
        product_id: prod.id,
        product_name: prod.name,
        brand: prod.brand,
        sku: prod.sku,
        quantity: item.quantity,
        unit_price: item.unit_price,
        discount_amount: itemDisc,
        tax_rate: invoiceData.is_tax_invoice ? shop.default_gst_rate : 0,
        line_total: lineTotal,
        cost_price_at_sale: Number(prod.purchase_cost),
      });
      await this.insertMovement({
        product_id: prod.id,
        product_name: prod.name,
        user_id: invoiceData.user_id,
        user_name: invoiceData.user_name,
        movement_type: 'SALE',
        quantity_change: -item.quantity,
        quantity_before: qtyBefore,
        quantity_after: qtyAfter,
        unit_cost: Number(prod.purchase_cost),
        reason: `Sold on Inv #${invoiceNumber}${invoiceData.override_reason ? ` (Override: ${invoiceData.override_reason})` : ''}`,
        created_at: now,
      } as any);
    }

    // 3. Totals
    const overallDiscount = Number(invoiceData.discount_amount) || 0;
    const taxableSubtotal = Math.max(0, subtotal - overallDiscount);
    let taxAmount = 0;
    if (invoiceData.is_tax_invoice && shop.enable_gst) {
      taxAmount = Number(((taxableSubtotal * (Number(shop.default_gst_rate) || 18)) / 100).toFixed(2));
    }
    const grandTotal = Math.round(taxableSubtotal + taxAmount);
    const paidAmount = invoiceData.paid_amount !== undefined ? Number(invoiceData.paid_amount) : grandTotal;
    const paymentStatus = paidAmount >= grandTotal ? 'PAID' : paidAmount > 0 ? 'PARTIALLY_PAID' : 'PENDING';

    // 4. Customer upsert by phone
    let customerId: string | undefined;
    if (invoiceData.customer_phone) {
      const cleanPhone = invoiceData.customer_phone.replace(/\D/g, '').slice(-10);
      const { data: existing } = await this.client
        .from('customers')
        .select('*')
        .eq('shop_id', this.shopId)
        .eq('phone', cleanPhone)
        .maybeSingle();
      if (existing) {
        customerId = existing.id;
        const upd: any = {
          name: invoiceData.customer_name || existing.name,
          total_spent: Number(existing.total_spent) + paidAmount,
          visit_count: Number(existing.visit_count) + 1,
          last_visit_at: now,
        };
        if (paidAmount < grandTotal) {
          upd.outstanding_balance = Number(existing.outstanding_balance) + (grandTotal - paidAmount);
        }
        await this.client.from('customers').update(upd).eq('shop_id', this.shopId).eq('id', existing.id);
      } else {
        const newCust = {
          id: newId('cust'),
          shop_id: this.shopId,
          name: invoiceData.customer_name || 'Retail Customer',
          phone: cleanPhone,
          outstanding_balance: paidAmount < grandTotal ? grandTotal - paidAmount : 0,
          total_spent: paidAmount,
          visit_count: 1,
          last_visit_at: now,
          created_at: now,
        };
        const { data: inserted, error: custErr } = await this.client
          .from('customers')
          .insert(newCust)
          .select('id')
          .single();
        throwIf(custErr, 'createInvoice(customer)');
        if (!inserted) throw new Error("createInvoice(customer): insert returned no row");
        customerId = inserted.id;
      }
    }

    const newInvoice: any = {
      id: newId('inv'),
      shop_id: this.shopId,
      invoice_number: invoiceNumber,
      customer_id: customerId,
      customer_name: invoiceData.customer_name || 'Walk-in Customer',
      customer_phone: invoiceData.customer_phone,
      user_id: invoiceData.user_id,
      user_name: invoiceData.user_name,
      items: invoiceItems,
      subtotal_amount: subtotal,
      discount_amount: overallDiscount,
      tax_amount: taxAmount,
      total_amount: grandTotal,
      paid_amount: paidAmount,
      payment_method: invoiceData.payment_method || 'CASH',
      payment_status: paymentStatus,
      status: 'FINALIZED',
      is_tax_invoice: Boolean(invoiceData.is_tax_invoice),
      notes: invoiceData.notes,
      created_at: now,
      updated_at: now,
    };
    const { data, error } = await this.client.from('invoices').insert(newInvoice).select().single();
    throwIf(error, 'createInvoice');
    return data as Invoice;
    } catch (err) {
      // Compensate: restore every deducted unit so a failed bill never leaks inventory.
      for (const d of decremented) {
        try { await this.adjustStock(d.product_id, d.quantity); } catch { /* best effort */ }
      }
      throw err;
    }
  }

  async cancelInvoice(invoiceId: string, user_id: string, user_name: string, reason: string): Promise<Invoice> {
    const { data: inv, error } = await this.client
      .from('invoices')
      .select('*')
      .eq('shop_id', this.shopId)
      .eq('id', invoiceId)
      .maybeSingle();
    throwIf(error, 'cancelInvoice(load)');
    if (!inv) throw new Error('Invoice not found');
    if (inv.status === 'CANCELLED') throw new Error('Invoice is already cancelled');

    const now = new Date().toISOString();
    // Atomic claim: only one concurrent cancel can flip the status.
    const { data: claimed, error: updErr } = await this.client
      .from('invoices')
      .update({ status: 'CANCELLED', cancellation_reason: reason, cancelled_by: user_id, cancelled_at: now, updated_at: now })
      .eq('shop_id', this.shopId)
      .eq('id', invoiceId)
      .neq('status', 'CANCELLED')
      .select('id');
    throwIf(updErr, 'cancelInvoice(update)');
    if (!claimed || claimed.length === 0) throw new Error('Invoice is already cancelled');

    for (const item of inv.items || []) {
      if (!item.product_id) continue;
      const prod = await this.getProductById(item.product_id);
      if (!prod) continue;
      const adj = await this.adjustStock(prod.id, item.quantity);
      const qtyAfter = adj.newQty ?? Number(prod.current_quantity) + item.quantity;
      const qtyBefore = qtyAfter - item.quantity;
      await this.insertMovement({
        product_id: prod.id,
        product_name: prod.name,
        user_id,
        user_name,
        movement_type: 'CUSTOMER_RETURN',
        quantity_change: item.quantity,
        quantity_before: qtyBefore,
        quantity_after: qtyAfter,
        unit_cost: item.cost_price_at_sale,
        reason: `Restocked from Cancelled Inv #${inv.invoice_number}: ${reason}`,
        created_at: now,
      } as any);
    }

    if (inv.customer_id) {
      const { data: cust } = await this.client
        .from('customers')
        .select('*')
        .eq('shop_id', this.shopId)
        .eq('id', inv.customer_id)
        .maybeSingle();
      if (cust) {
        const unpaid = Number(inv.total_amount) - Number(inv.paid_amount);
        const upd: any = { total_spent: Math.max(0, Number(cust.total_spent) - Number(inv.paid_amount)) };
        if (unpaid > 0) upd.outstanding_balance = Math.max(0, Number(cust.outstanding_balance) - unpaid);
        await this.client.from('customers').update(upd).eq('shop_id', this.shopId).eq('id', cust.id);
      }
    }

    return { ...inv, status: 'CANCELLED', cancellation_reason: reason, cancelled_by: user_id, cancelled_at: now } as Invoice;
  }

  async recordAdjustment(adjustmentData: {
    product_id: string;
    new_quantity: number;
    reason: string;
    user_id: string;
    user_name: string;
  }): Promise<StockMovement> {
    const prod = await this.getProductById(adjustmentData.product_id);
    if (!prod) throw new Error('Product not found');
    const now = new Date().toISOString();
    const qtyBefore = Number(prod.current_quantity);
    const qtyAfter = adjustmentData.new_quantity;
    const diff = qtyAfter - qtyBefore;
    await this.updateProductQty(prod.id, qtyAfter);
    const movement: any = {
      id: newId('mov'),
      shop_id: this.shopId,
      product_id: prod.id,
      product_name: prod.name,
      user_id: adjustmentData.user_id,
      user_name: adjustmentData.user_name,
      movement_type: 'ADJUSTMENT',
      quantity_change: diff,
      quantity_before: qtyBefore,
      quantity_after: qtyAfter,
      unit_cost: Number(prod.purchase_cost),
      reason: adjustmentData.reason || 'Physical Stock Count Reconciliation',
      created_at: now,
    };
    const { error } = await this.client.from('stock_movements').insert(movement);
    throwIf(error, 'recordAdjustment');
    return movement as StockMovement;
  }

  async recordCustomerReturn(returnData: {
    invoice_id?: string;
    product_id: string;
    quantity: number;
    refund_amount: number;
    condition: 'SELLABLE' | 'DAMAGED';
    reason: string;
    user_id: string;
    user_name: string;
  }): Promise<ReturnRecord> {
    const prod = await this.getProductById(returnData.product_id);
    if (!prod) throw new Error('Product not found');
    const now = new Date().toISOString();
    const record: any = {
      id: newId('ret'),
      shop_id: this.shopId,
      invoice_id: returnData.invoice_id,
      user_id: returnData.user_id,
      user_name: returnData.user_name,
      product_id: prod.id,
      product_name: prod.name,
      quantity: returnData.quantity,
      refund_amount: Number(returnData.refund_amount) || 0,
      condition: returnData.condition,
      reason: returnData.reason,
      created_at: now,
    };
    const { error } = await this.client.from('customer_returns').insert(record);
    throwIf(error, 'recordCustomerReturn');

    let qty = Number(prod.current_quantity);
    if (returnData.condition === 'SELLABLE') {
      const adj = await this.adjustStock(prod.id, returnData.quantity);
      qty = (adj.newQty ?? qty + returnData.quantity) - returnData.quantity;
      await this.insertMovement({
        product_id: prod.id,
        product_name: prod.name,
        user_id: returnData.user_id,
        user_name: returnData.user_name,
        movement_type: 'CUSTOMER_RETURN',
        quantity_change: returnData.quantity,
        quantity_before: qty,
        quantity_after: qty + returnData.quantity,
        unit_cost: Number(prod.purchase_cost),
        reason: `Customer Return (Sellable): ${returnData.reason}`,
        created_at: now,
      } as any);
    } else {
      await this.insertMovement({
        product_id: prod.id,
        product_name: prod.name,
        user_id: returnData.user_id,
        user_name: returnData.user_name,
        movement_type: 'DAMAGE_LOSS',
        quantity_change: 0,
        quantity_before: qty,
        quantity_after: qty,
        unit_cost: Number(prod.purchase_cost),
        reason: `Customer Return (Damaged - Scrapped): ${returnData.reason}`,
        created_at: now,
      } as any);
    }
    return record as ReturnRecord;
  }

  async getInvoices(filters?: { limit?: number; user_id?: string; search?: string }): Promise<Invoice[]> {
    let query = this.client
      .from('invoices')
      .select('*')
      .eq('shop_id', this.shopId)
      .order('created_at', { ascending: false });
    if (filters?.user_id) query = query.eq('user_id', filters.user_id);
    if (filters?.limit) query = query.limit(filters.limit);
    const { data, error } = await query;
    throwIf(error, 'getInvoices');
    let list = (data || []) as Invoice[];
    if (filters?.search) {
      const q = filters.search.toLowerCase();
      list = list.filter(
        (i) =>
          i.invoice_number.toLowerCase().includes(q) ||
          (i.customer_name || '').toLowerCase().includes(q) ||
          (i.customer_phone && i.customer_phone.includes(q))
      );
    }
    return list;
  }

  async getInvoiceById(id: string): Promise<Invoice | undefined> {
    const { data, error } = await this.client
      .from('invoices')
      .select('*')
      .eq('shop_id', this.shopId)
      .or(`id.eq.${id},invoice_number.eq.${id}`)
      .maybeSingle();
    throwIf(error, 'getInvoiceById');
    return (data as Invoice) || undefined;
  }

  async getPurchases(): Promise<Purchase[]> {
    const { data, error } = await this.client
      .from('purchases')
      .select('*')
      .eq('shop_id', this.shopId)
      .order('created_at', { ascending: false });
    throwIf(error, 'getPurchases');
    return (data || []) as Purchase[];
  }

  async getCustomers(): Promise<Customer[]> {
    const { data, error } = await this.client.from('customers').select('*').eq('shop_id', this.shopId);
    throwIf(error, 'getCustomers');
    return (data || []) as Customer[];
  }

  async getStockMovements(filters?: { product_id?: string; startDate?: string; endDate?: string }): Promise<StockMovement[]> {
    let query = this.client
      .from('stock_movements')
      .select('id,shop_id,product_id,product_name,user_id,user_name,movement_type,quantity_change,quantity_before,quantity_after,unit_cost,reference_id,reason,created_at')
      .eq('shop_id', this.shopId)
      .order('created_at', { ascending: false });
    if (filters?.product_id) query = query.eq('product_id', filters.product_id);
    if (filters?.startDate) query = query.gte('created_at', filters.startDate);
    if (filters?.endDate) query = query.lte('created_at', filters.endDate);
    const { data, error } = await query;
    throwIf(error, 'getStockMovements');
    return (data || []) as StockMovement[];
  }

  async getDailyLedger(dateString?: string): Promise<DailyLedgerRow[]> {
    const targetDate = dateString ? new Date(dateString) : new Date();
    const startOfDay = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate(), 0, 0, 0);
    const endOfDay = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate(), 23, 59, 59);

    const products = await this.getProducts();
    const movements = await this.getStockMovements();
    const rows: DailyLedgerRow[] = [];

    for (const prod of products) {
      const prodMovements = movements.filter((m) => m.product_id === prod.id);
      const prior = prodMovements.filter((m) => new Date(m.created_at).getTime() < startOfDay.getTime());
      const openingStock = prior.reduce((acc, m) => acc + m.quantity_change, 0);
      const today = prodMovements.filter((m) => {
        const t = new Date(m.created_at).getTime();
        return t >= startOfDay.getTime() && t <= endOfDay.getTime();
      });
      let received = 0, sold = 0, returns = 0, damaged = 0, adjustments = 0;
      for (const m of today) {
        if (m.movement_type === 'PURCHASE') received += m.quantity_change;
        else if (m.movement_type === 'SALE') sold += Math.abs(m.quantity_change);
        else if (m.movement_type === 'CUSTOMER_RETURN') returns += m.quantity_change;
        else if (m.movement_type === 'DAMAGE_LOSS') damaged += Math.abs(m.quantity_change);
        else if (m.movement_type === 'ADJUSTMENT') adjustments += m.quantity_change;
      }
      const closingStock = openingStock + received + returns - sold - damaged + adjustments;
      rows.push({
        product_id: prod.id,
        product_name: prod.name,
        brand: prod.brand,
        category: prod.category_name || 'Accessories',
        opening_stock: Math.max(0, openingStock),
        received,
        sold,
        returns,
        damaged,
        adjustments,
        closing_stock: Math.max(0, closingStock > 0 ? closingStock : Number(prod.current_quantity)),
        purchase_cost: Number(prod.purchase_cost),
        selling_price: Number(prod.selling_price),
        valuation_cost: (closingStock > 0 ? closingStock : Number(prod.current_quantity)) * Number(prod.purchase_cost),
        valuation_retail: (closingStock > 0 ? closingStock : Number(prod.current_quantity)) * Number(prod.selling_price),
      });
    }
    return rows;
  }

  async getDashboardMetrics(dateString?: string) {
    const targetDate = dateString ? new Date(dateString) : new Date();
    const startOfDay = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate(), 0, 0, 0);
    const endOfDay = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate(), 23, 59, 59);

    const [invoices, movements, products, customers] = await Promise.all([
      this.getInvoices(),
      this.getStockMovements(),
      this.getProducts(),
      this.getCustomers(),
    ]);

    const todayInvoices = invoices.filter((i) => {
      const t = new Date(i.created_at).getTime();
      return i.status === 'FINALIZED' && t >= startOfDay.getTime() && t <= endOfDay.getTime();
    });

    let salesToday = 0, cashCollected = 0, upiCollected = 0, cardCollected = 0;
    let totalDiscount = 0, totalUnitsSold = 0, totalGrossProfit = 0;

    for (const inv of todayInvoices) {
      salesToday += Number(inv.total_amount);
      totalDiscount += Number(inv.discount_amount);
      if (inv.payment_method === 'CASH') cashCollected += Number(inv.paid_amount);
      else if (inv.payment_method === 'UPI') upiCollected += Number(inv.paid_amount);
      else if (inv.payment_method === 'CARD') cardCollected += Number(inv.paid_amount);
      for (const item of inv.items || []) {
        totalUnitsSold += item.quantity;
        const cost = (item.cost_price_at_sale || 0) * item.quantity;
        totalGrossProfit += item.line_total - cost;
      }
    }

    const stockReceivedToday = movements
      .filter((m) => {
        const t = new Date(m.created_at).getTime();
        return m.movement_type === 'PURCHASE' && t >= startOfDay.getTime() && t <= endOfDay.getTime();
      })
      .reduce((acc, m) => acc + m.quantity_change, 0);

    const lowStockProducts = products.filter(
      (p) => p.is_active && Number(p.current_quantity) > 0 && Number(p.current_quantity) <= Number(p.min_stock_level)
    );
    const outOfStockProducts = products.filter((p) => p.is_active && Number(p.current_quantity) <= 0);

    let inventoryCostValuation = 0, inventoryRetailValuation = 0;
    for (const p of products) {
      if (p.is_active && Number(p.current_quantity) > 0) {
        inventoryCostValuation += Number(p.current_quantity) * Number(p.purchase_cost);
        inventoryRetailValuation += Number(p.current_quantity) * Number(p.selling_price);
      }
    }

    const outstandingBalances = customers.reduce((acc, c) => acc + (Number(c.outstanding_balance) || 0), 0);

    const employeeSales: Record<string, { name: string; billsCount: number; revenue: number }> = {};
    for (const inv of todayInvoices) {
      if (!employeeSales[inv.user_id]) {
        employeeSales[inv.user_id] = { name: inv.user_name, billsCount: 0, revenue: 0 };
      }
      employeeSales[inv.user_id].billsCount += 1;
      employeeSales[inv.user_id].revenue += Number(inv.total_amount);
    }

    return {
      salesToday,
      billsCount: todayInvoices.length,
      cashCollected,
      upiCollected,
      cardCollected,
      totalDiscount,
      totalUnitsSold,
      stockReceivedToday,
      totalGrossProfit,
      lowStockCount: lowStockProducts.length,
      outOfStockCount: outOfStockProducts.length,
      inventoryCostValuation,
      inventoryRetailValuation,
      outstandingBalances,
      lowStockProducts: lowStockProducts.slice(0, 8),
      employeeSales: Object.values(employeeSales),
      recentInvoices: invoices.slice(0, 10),
    };
  }

  async exportBackup(): Promise<any> {
    const [shop, users, categories, suppliers, products, stock_movements, purchases, invoices, customers, returns] =
      await Promise.all([
        this.getShop(),
        this.getUsers(),
        this.getCategories(),
        this.getSuppliers(),
        this.getProducts(),
        this.getStockMovements(),
        this.getPurchases(),
        this.getInvoices(),
        this.getCustomers(),
        this.client.from('customer_returns').select('*').eq('shop_id', this.shopId).then((r) => r.data || []),
      ]);
    return { shop, users, categories, suppliers, products, stock_movements, purchases, invoices, customers, returns };
  }

  async restoreBackup(backupData: any): Promise<boolean> {
    if (!backupData.shop || !backupData.products || !backupData.users) {
      throw new Error('Invalid backup data format');
    }
    // Upsert each collection, forcing rows into this shop.
    const stamp = (rows: any[]) => (rows || []).map((r) => ({ ...r, shop_id: this.shopId }));
    if (backupData.shop) {
      const shopRow = { ...backupData.shop, id: this.shopId };
      throwIf(await this.client.from('shops').upsert(shopRow).then((r) => r.error), 'restoreBackup(shops)');
    }
    const tables: Array<[string, any[]]> = [
      ['users', stamp(backupData.users)],
      ['categories', stamp(backupData.categories)],
      ['suppliers', stamp(backupData.suppliers)],
      ['products', stamp(backupData.products)],
      ['stock_movements', stamp(backupData.stock_movements)],
      ['purchases', stamp(backupData.purchases)],
      ['invoices', stamp(backupData.invoices)],
      ['customers', stamp(backupData.customers)],
      ['customer_returns', stamp(backupData.returns)],
    ];
    for (const [table, rows] of tables) {
      if (rows.length) {
        throwIf(await this.client.from(table).upsert(rows).then((r) => r.error), `restoreBackup(${table})`);
      }
    }
    return true;
  }
}
