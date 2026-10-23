export type UserRole = 'owner' | 'employee';

export interface UserProfile {
  id: string;
  shop_id: string;
  email: string;
  full_name: string;
  role: UserRole;
  is_active: boolean;
  can_receive_stock: boolean;
  can_apply_custom_discount: boolean;
  can_cancel_bills: boolean;
  can_view_purchase_cost: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface Shop {
  id: string;
  name: string;
  tagline?: string;
  phone: string;
  email?: string;
  address: string;
  city: string;
  state: string;
  pincode?: string;
  gstin?: string;
  upi_id?: string;
  currency_symbol: string;
  invoice_prefix: string;
  enable_gst: boolean;
  default_gst_rate: number;
  allow_negative_stock: boolean;
  terms_and_conditions?: string;
  logo_url?: string;
}

export interface Category {
  id: string;
  shop_id: string;
  name: string;
  description?: string;
}

export interface Supplier {
  id: string;
  shop_id: string;
  name: string;
  contact_person?: string;
  phone?: string;
  email?: string;
  address?: string;
  gstin?: string;
}

export interface Product {
  id: string;
  shop_id: string;
  category_id?: string;
  category_name?: string;
  supplier_id?: string;
  supplier_name?: string;
  name: string;
  brand: string;
  compatible_models?: string;
  sku?: string;
  barcode?: string;
  purchase_cost: number;
  selling_price: number;
  current_quantity: number;
  min_stock_level: number;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

export type MovementType =
  | 'OPENING'
  | 'PURCHASE'
  | 'SALE'
  | 'CUSTOMER_RETURN'
  | 'SUPPLIER_RETURN'
  | 'DAMAGE_LOSS'
  | 'ADJUSTMENT';

export interface StockMovement {
  id: string;
  shop_id: string;
  product_id: string;
  product_name: string;
  user_id: string;
  user_name: string;
  movement_type: MovementType;
  quantity_change: number; // positive for in, negative for out
  quantity_before: number;
  quantity_after: number;
  unit_cost?: number;
  reference_id?: string;
  reason?: string;
  created_at: string;
}

export interface PurchaseItem {
  id?: string;
  product_id: string;
  product_name: string;
  quantity_received: number;
  unit_cost: number;
  line_total: number;
}

export interface Purchase {
  id: string;
  shop_id: string;
  supplier_id?: string;
  supplier_name?: string;
  user_id: string;
  user_name: string;
  supplier_invoice_number?: string;
  purchase_date: string;
  items: PurchaseItem[];
  subtotal_amount: number;
  shipping_expenses: number;
  tax_amount: number;
  total_amount: number;
  notes?: string;
  created_at: string;
}

export type PaymentMethod = 'CASH' | 'UPI' | 'CARD' | 'SPLIT' | 'CREDIT';
export type PaymentStatus = 'PAID' | 'PARTIALLY_PAID' | 'PENDING';
export type InvoiceStatus = 'FINALIZED' | 'CANCELLED' | 'REFUNDED';

export interface InvoiceItem {
  id?: string;
  product_id?: string;
  product_name: string;
  brand?: string;
  sku?: string;
  quantity: number;
  unit_price: number;
  discount_amount: number;
  tax_rate: number;
  line_total: number;
  cost_price_at_sale?: number;
}

export interface Invoice {
  id: string;
  shop_id: string;
  invoice_number: string;
  customer_id?: string;
  customer_name: string;
  customer_phone?: string;
  user_id: string;
  user_name: string;
  items: InvoiceItem[];
  subtotal_amount: number;
  discount_amount: number;
  tax_amount: number;
  total_amount: number;
  paid_amount: number;
  payment_method: PaymentMethod;
  payment_status: PaymentStatus;
  status: InvoiceStatus;
  is_tax_invoice: boolean;
  notes?: string;
  cancellation_reason?: string;
  cancelled_by?: string;
  cancelled_at?: string;
  created_at: string;
  updated_at?: string;
}

export interface Customer {
  id: string;
  shop_id: string;
  name: string;
  phone: string;
  email?: string;
  address?: string;
  gstin?: string;
  outstanding_balance: number;
  total_spent: number;
  visit_count: number;
  last_visit_at?: string;
  created_at: string;
}

export interface ReturnRecord {
  id: string;
  shop_id: string;
  invoice_id?: string;
  customer_id?: string;
  user_id: string;
  user_name: string;
  product_id: string;
  product_name: string;
  quantity: number;
  refund_amount: number;
  condition: 'SELLABLE' | 'DAMAGED';
  reason: string;
  created_at: string;
}

export interface DailyLedgerRow {
  product_id: string;
  product_name: string;
  brand: string;
  category: string;
  opening_stock: number;
  received: number;
  sold: number;
  returns: number;
  damaged: number;
  adjustments: number;
  closing_stock: number;
  purchase_cost: number;
  selling_price: number;
  valuation_cost: number;
  valuation_retail: number;
}
