import fs from 'fs';
import path from 'path';
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

interface StoreData {
  shop: Shop;
  users: UserProfile[];
  categories: Category[];
  suppliers: Supplier[];
  products: Product[];
  stock_movements: StockMovement[];
  purchases: Purchase[];
  invoices: Invoice[];
  customers: Customer[];
  returns: ReturnRecord[];
}

const DATA_DIR = path.join(process.cwd(), 'data');
const DATA_FILE = path.join(DATA_DIR, 'store.json');

// Initial seed data for Indian mobile accessories retail shop
const DEFAULT_SHOP_ID = 'shop-001';
const OWNER_USER_ID = 'user-owner-001';
const EMPLOYEE_USER_ID = 'user-cashier-002';

const INITIAL_SHOP: Shop = {
  id: DEFAULT_SHOP_ID,
  name: 'Sri Balaji Mobile & Accessories',
  tagline: 'Premium Covers, Tempered Glass & Fast Chargers',
  phone: '9840123456',
  email: 'contact@balajimobiles.in',
  address: 'Shop No. 4, Ground Floor, Anna Nagar Main Road',
  city: 'Chennai',
  state: 'Tamil Nadu',
  pincode: '600040',
  gstin: '33AAAAA0000A1Z5',
  upi_id: 'balajimobiles@okaxis',
  currency_symbol: '₹',
  invoice_prefix: 'SBM-',
  enable_gst: true,
  default_gst_rate: 18,
  allow_negative_stock: false,
  terms_and_conditions: 'Thank you for shopping! 7 days replacement on manufacturing defects with original bill. No cash refund.',
  logo_url: '',
};

const INITIAL_USERS: UserProfile[] = [
  {
    id: OWNER_USER_ID,
    shop_id: DEFAULT_SHOP_ID,
    email: 'owner@shop.com',
    full_name: 'Rajesh Sharma (Owner)',
    role: 'owner',
    is_active: true,
    can_receive_stock: true,
    can_apply_custom_discount: true,
    can_cancel_bills: true,
    can_view_purchase_cost: true,
    created_at: new Date('2026-01-01').toISOString(),
  },
  {
    id: EMPLOYEE_USER_ID,
    shop_id: DEFAULT_SHOP_ID,
    email: 'cashier@shop.com',
    full_name: 'Suresh Kumar (Cashier)',
    role: 'employee',
    is_active: true,
    can_receive_stock: true,
    can_apply_custom_discount: false,
    can_cancel_bills: false,
    can_view_purchase_cost: false,
    created_at: new Date('2026-01-05').toISOString(),
  },
];

const INITIAL_CATEGORIES: Category[] = [
  { id: 'cat-1', shop_id: DEFAULT_SHOP_ID, name: 'Tempered Glass', description: 'Screen protectors, UV glass, matte, privacy' },
  { id: 'cat-2', shop_id: DEFAULT_SHOP_ID, name: 'Mobile Covers', description: 'Silicone, rugged armor, clear case, leather' },
  { id: 'cat-3', shop_id: DEFAULT_SHOP_ID, name: 'Cables & Adapters', description: 'Type-C, Lightning, Micro USB, OTG' },
  { id: 'cat-4', shop_id: DEFAULT_SHOP_ID, name: 'Fast Chargers', description: '20W, 33W, 65W GaN wall adapters & car chargers' },
  { id: 'cat-5', shop_id: DEFAULT_SHOP_ID, name: 'Audio & Earbuds', description: 'TWS earbuds, neckbands, wired earphones' },
  { id: 'cat-6', shop_id: DEFAULT_SHOP_ID, name: 'Accessories & Mounts', description: 'Car mounts, tripods, selfie sticks, ring lights' },
];

const INITIAL_SUPPLIERS: Supplier[] = [
  {
    id: 'sup-1',
    shop_id: DEFAULT_SHOP_ID,
    name: 'Apex Accessories Wholesale Chennai',
    contact_person: 'Venkatesh Rao',
    phone: '9884011223',
    email: 'apexwholesale@gmail.com',
    address: 'Richie Street, Chennai - 600002',
    gstin: '33AABCA1234B1Z2',
  },
  {
    id: 'sup-2',
    shop_id: DEFAULT_SHOP_ID,
    name: 'Star Tech Mobile Distributors',
    contact_person: 'Manoj Jain',
    phone: '9820099887',
    email: 'orders@startechdist.in',
    address: 'SP Road, Bengaluru - 560002',
    gstin: '29AABCS9876C1Z8',
  },
];

const INITIAL_PRODUCTS: Product[] = [
  {
    id: 'prod-01',
    shop_id: DEFAULT_SHOP_ID,
    category_id: 'cat-1',
    category_name: 'Tempered Glass',
    supplier_id: 'sup-1',
    supplier_name: 'Apex Accessories Wholesale Chennai',
    name: '11D Super D Tempered Glass (iPhone 15 / 15 Pro)',
    brand: 'Gorilla Shield',
    compatible_models: 'iPhone 15, iPhone 15 Pro',
    sku: 'TG-IP15-11D',
    barcode: '8901001',
    purchase_cost: 35,
    selling_price: 199,
    current_quantity: 45,
    min_stock_level: 10,
    is_active: true,
  },
  {
    id: 'prod-02',
    shop_id: DEFAULT_SHOP_ID,
    category_id: 'cat-1',
    category_name: 'Tempered Glass',
    supplier_id: 'sup-1',
    supplier_name: 'Apex Accessories Wholesale Chennai',
    name: 'Privacy Anti-Spy Tempered Glass (iPhone 14 / 13)',
    brand: 'Gorilla Shield',
    compatible_models: 'iPhone 14, iPhone 13',
    sku: 'TG-IP14-PRIV',
    barcode: '8901002',
    purchase_cost: 65,
    selling_price: 299,
    current_quantity: 28,
    min_stock_level: 8,
    is_active: true,
  },
  {
    id: 'prod-03',
    shop_id: DEFAULT_SHOP_ID,
    category_id: 'cat-1',
    category_name: 'Tempered Glass',
    supplier_id: 'sup-1',
    supplier_name: 'Apex Accessories Wholesale Chennai',
    name: 'Matte Gaming Screen Guard (Redmi Note 13 / Pro)',
    brand: 'K-Matte',
    compatible_models: 'Redmi Note 13, Note 13 Pro',
    sku: 'TG-RN13-MAT',
    barcode: '8901003',
    purchase_cost: 30,
    selling_price: 149,
    current_quantity: 35,
    min_stock_level: 10,
    is_active: true,
  },
  {
    id: 'prod-04',
    shop_id: DEFAULT_SHOP_ID,
    category_id: 'cat-2',
    category_name: 'Mobile Covers',
    supplier_id: 'sup-1',
    supplier_name: 'Apex Accessories Wholesale Chennai',
    name: 'MagSafe Matte Frosted Hybrid Case (iPhone 15)',
    brand: 'ArmorShield',
    compatible_models: 'iPhone 15',
    sku: 'COV-IP15-MAG',
    barcode: '8902001',
    purchase_cost: 110,
    selling_price: 399,
    current_quantity: 18,
    min_stock_level: 5,
    is_active: true,
  },
  {
    id: 'prod-05',
    shop_id: DEFAULT_SHOP_ID,
    category_id: 'cat-2',
    category_name: 'Mobile Covers',
    supplier_id: 'sup-1',
    supplier_name: 'Apex Accessories Wholesale Chennai',
    name: 'Liquid Silicone Soft Velvet Touch Case (Samsung S24)',
    brand: 'SlimFit',
    compatible_models: 'Samsung Galaxy S24',
    sku: 'COV-S24-SIL',
    barcode: '8902002',
    purchase_cost: 80,
    selling_price: 299,
    current_quantity: 12,
    min_stock_level: 5,
    is_active: true,
  },
  {
    id: 'prod-06',
    shop_id: DEFAULT_SHOP_ID,
    category_id: 'cat-2',
    category_name: 'Mobile Covers',
    supplier_id: 'sup-1',
    supplier_name: 'Apex Accessories Wholesale Chennai',
    name: 'Shockproof Clear Case with Air Cushions (OnePlus 12R)',
    brand: 'AeroClear',
    compatible_models: 'OnePlus 12R, OnePlus 12',
    sku: 'COV-OP12R-CLR',
    barcode: '8902003',
    purchase_cost: 50,
    selling_price: 199,
    current_quantity: 4, // low stock trigger
    min_stock_level: 8,
    is_active: true,
  },
  {
    id: 'prod-07',
    shop_id: DEFAULT_SHOP_ID,
    category_id: 'cat-3',
    category_name: 'Cables & Adapters',
    supplier_id: 'sup-2',
    supplier_name: 'Star Tech Mobile Distributors',
    name: '65W Fast Charging Braided Type-C to Type-C Cable (1.2m)',
    brand: 'boAt',
    compatible_models: 'Universal Type-C Devices',
    sku: 'CAB-CC-65W',
    barcode: '8903001',
    purchase_cost: 85,
    selling_price: 249,
    current_quantity: 50,
    min_stock_level: 15,
    is_active: true,
  },
  {
    id: 'prod-08',
    shop_id: DEFAULT_SHOP_ID,
    category_id: 'cat-3',
    category_name: 'Cables & Adapters',
    supplier_id: 'sup-2',
    supplier_name: 'Star Tech Mobile Distributors',
    name: '20W PD Type-C to Lightning Cable for iPhone',
    brand: 'Portronics',
    compatible_models: 'iPhone 14 / 13 / 12 / 11',
    sku: 'CAB-CL-20W',
    barcode: '8903002',
    purchase_cost: 95,
    selling_price: 299,
    current_quantity: 32,
    min_stock_level: 10,
    is_active: true,
  },
  {
    id: 'prod-09',
    shop_id: DEFAULT_SHOP_ID,
    category_id: 'cat-3',
    category_name: 'Cables & Adapters',
    supplier_id: 'sup-2',
    supplier_name: 'Star Tech Mobile Distributors',
    name: 'Heavy Duty Metal USB to Type-C Fast Cable',
    brand: 'Ambrane',
    compatible_models: 'Android Type-C Phones',
    sku: 'CAB-AC-MET',
    barcode: '8903003',
    purchase_cost: 45,
    selling_price: 149,
    current_quantity: 60,
    min_stock_level: 12,
    is_active: true,
  },
  {
    id: 'prod-10',
    shop_id: DEFAULT_SHOP_ID,
    category_id: 'cat-4',
    category_name: 'Fast Chargers',
    supplier_id: 'sup-2',
    supplier_name: 'Star Tech Mobile Distributors',
    name: '25W Super Fast Type-C PD Adapter',
    brand: 'Samsung OEM',
    compatible_models: 'Samsung Galaxy Series, Google Pixel',
    sku: 'CHG-SAM-25W',
    barcode: '8904001',
    purchase_cost: 290,
    selling_price: 699,
    current_quantity: 14,
    min_stock_level: 6,
    is_active: true,
  },
  {
    id: 'prod-11',
    shop_id: DEFAULT_SHOP_ID,
    category_id: 'cat-4',
    category_name: 'Fast Chargers',
    supplier_id: 'sup-2',
    supplier_name: 'Star Tech Mobile Distributors',
    name: '33W SuperVOOC Dart Flash Charger Adapter',
    brand: 'Realme OEM',
    compatible_models: 'Realme, OnePlus, Oppo',
    sku: 'CHG-VOOC-33W',
    barcode: '8904002',
    purchase_cost: 220,
    selling_price: 549,
    current_quantity: 10,
    min_stock_level: 5,
    is_active: true,
  },
  {
    id: 'prod-12',
    shop_id: DEFAULT_SHOP_ID,
    category_id: 'cat-5',
    category_name: 'Audio & Earbuds',
    supplier_id: 'sup-2',
    supplier_name: 'Star Tech Mobile Distributors',
    name: 'Airdopes 141 True Wireless Earbuds with 42H Playback',
    brand: 'boAt',
    compatible_models: 'Bluetooth 5.3 Universal',
    sku: 'AUD-BT-AIR141',
    barcode: '8905001',
    purchase_cost: 650,
    selling_price: 1199,
    current_quantity: 8,
    min_stock_level: 4,
    is_active: true,
  },
  {
    id: 'prod-13',
    shop_id: DEFAULT_SHOP_ID,
    category_id: 'cat-5',
    category_name: 'Audio & Earbuds',
    supplier_id: 'sup-2',
    supplier_name: 'Star Tech Mobile Distributors',
    name: 'Bullets Wireless Z2 ANC Bluetooth Neckband',
    brand: 'OnePlus',
    compatible_models: 'Universal Bluetooth',
    sku: 'AUD-OP-Z2ANC',
    barcode: '8905002',
    purchase_cost: 1150,
    selling_price: 1899,
    current_quantity: 6,
    min_stock_level: 3,
    is_active: true,
  },
  {
    id: 'prod-14',
    shop_id: DEFAULT_SHOP_ID,
    category_id: 'cat-6',
    category_name: 'Accessories & Mounts',
    supplier_id: 'sup-1',
    supplier_name: 'Apex Accessories Wholesale Chennai',
    name: '360° Magnetic Dashboard Car Mobile Holder',
    brand: 'Spigen Look',
    compatible_models: 'All Smartphones',
    sku: 'ACC-CAR-MAG',
    barcode: '8906001',
    purchase_cost: 90,
    selling_price: 299,
    current_quantity: 2, // low stock trigger
    min_stock_level: 5,
    is_active: true,
  },
  {
    id: 'prod-15',
    shop_id: DEFAULT_SHOP_ID,
    category_id: 'cat-3',
    category_name: 'Cables & Adapters',
    supplier_id: 'sup-1',
    supplier_name: 'Apex Accessories Wholesale Chennai',
    name: 'Type-C to 3.5mm DAC Headphone Jack Audio Adapter',
    brand: 'Portronics',
    compatible_models: 'OnePlus, Samsung, iPhone 15',
    sku: 'CAB-DAC-35',
    barcode: '8903004',
    purchase_cost: 70,
    selling_price: 249,
    current_quantity: 22,
    min_stock_level: 6,
    is_active: true,
  },
];

const INITIAL_CUSTOMERS: Customer[] = [
  {
    id: 'cust-01',
    shop_id: DEFAULT_SHOP_ID,
    name: 'Karthik Subramanian',
    phone: '9841029384',
    email: 'karthik.s@gmail.com',
    outstanding_balance: 0,
    total_spent: 1247,
    visit_count: 3,
    last_visit_at: new Date(Date.now() - 86400000 * 2).toISOString(),
    created_at: new Date('2026-02-10').toISOString(),
  },
  {
    id: 'cust-02',
    shop_id: DEFAULT_SHOP_ID,
    name: 'Ananya Ramesh',
    phone: '9962018273',
    email: 'ananya.r@yahoo.com',
    outstanding_balance: 0,
    total_spent: 848,
    visit_count: 2,
    last_visit_at: new Date(Date.now() - 86400000 * 5).toISOString(),
    created_at: new Date('2026-02-15').toISOString(),
  },
  {
    id: 'cust-03',
    shop_id: DEFAULT_SHOP_ID,
    name: 'Mohammed Rizwan',
    phone: '9790827364',
    email: 'rizwan.m@outlook.com',
    outstanding_balance: 200, // outstanding credit demo
    total_spent: 2398,
    visit_count: 4,
    last_visit_at: new Date(Date.now() - 86400000 * 1).toISOString(),
    created_at: new Date('2026-01-20').toISOString(),
  },
];

// Helper to initialize opening stock ledger movements
const INITIAL_MOVEMENTS: StockMovement[] = INITIAL_PRODUCTS.map((prod, idx) => ({
  id: `mov-init-${idx + 1}`,
  shop_id: DEFAULT_SHOP_ID,
  product_id: prod.id,
  product_name: prod.name,
  user_id: OWNER_USER_ID,
  user_name: 'Rajesh Sharma (Owner)',
  movement_type: 'OPENING',
  quantity_change: prod.current_quantity,
  quantity_before: 0,
  quantity_after: prod.current_quantity,
  unit_cost: prod.purchase_cost,
  reason: 'Initial Opening Stock Entry',
  created_at: new Date('2026-10-01T09:00:00Z').toISOString(),
}));

function getInitialStore(): StoreData {
  return {
    shop: INITIAL_SHOP,
    users: INITIAL_USERS,
    categories: INITIAL_CATEGORIES,
    suppliers: INITIAL_SUPPLIERS,
    products: INITIAL_PRODUCTS,
    stock_movements: INITIAL_MOVEMENTS,
    purchases: [],
    invoices: [],
    customers: INITIAL_CUSTOMERS,
    returns: [],
  };
}

// In-memory cache + file sync
let cachedStore: StoreData | null = null;

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

export function loadStore(): StoreData {
  if (cachedStore) {
    return cachedStore;
  }
  ensureDataDir();
  if (fs.existsSync(DATA_FILE)) {
    try {
      const content = fs.readFileSync(DATA_FILE, 'utf-8');
      cachedStore = JSON.parse(content);
      return cachedStore!;
    } catch (e) {
      console.error('Error reading store file, falling back to seed:', e);
    }
  }
  // Initialize with seed
  cachedStore = getInitialStore();
  saveStore(cachedStore);
  return cachedStore;
}

export function saveStore(data: StoreData): void {
  cachedStore = data;
  try {
    ensureDataDir();
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf-8');
  } catch (e) {
    // Read-only deployments (e.g. Vercel): serve the demo from memory.
  }
}

// ==========================================
// CENTRALIZED SERVICE METHODS
// ==========================================

export const dbService = {
  getShop(): Shop {
    const store = loadStore();
    return store.shop;
  },

  updateShop(updates: Partial<Shop>): Shop {
    const store = loadStore();
    store.shop = { ...store.shop, ...updates };
    saveStore(store);
    return store.shop;
  },

  getUsers(): UserProfile[] {
    const store = loadStore();
    return store.users;
  },

  getUserByEmail(email: string): UserProfile | undefined {
    const store = loadStore();
    return store.users.find((u) => u.email.toLowerCase() === email.toLowerCase());
  },

  getUserById(id: string): UserProfile | undefined {
    const store = loadStore();
    return store.users.find((u) => u.id === id);
  },

  updateUserPermissions(userId: string, permissions: Partial<UserProfile>): UserProfile {
    const store = loadStore();
    const userIndex = store.users.findIndex((u) => u.id === userId);
    if (userIndex === -1) throw new Error('User not found');
    store.users[userIndex] = { ...store.users[userIndex], ...permissions, updated_at: new Date().toISOString() };
    saveStore(store);
    return store.users[userIndex];
  },

  getCategories(): Category[] {
    const store = loadStore();
    return store.categories;
  },

  addCategory(name: string, description?: string): Category {
    const store = loadStore();
    const newCat: Category = {
      id: `cat-${Date.now()}`,
      shop_id: store.shop.id,
      name,
      description,
    };
    store.categories.push(newCat);
    saveStore(store);
    return newCat;
  },

  getSuppliers(): Supplier[] {
    const store = loadStore();
    return store.suppliers;
  },

  addSupplier(supplier: Omit<Supplier, 'id' | 'shop_id'>): Supplier {
    const store = loadStore();
    const newSup: Supplier = {
      ...supplier,
      id: `sup-${Date.now()}`,
      shop_id: store.shop.id,
    };
    store.suppliers.push(newSup);
    saveStore(store);
    return newSup;
  },

  getProducts(): Product[] {
    const store = loadStore();
    return store.products;
  },

  getProductById(id: string): Product | undefined {
    const store = loadStore();
    return store.products.find((p) => p.id === id);
  },

  saveProduct(productData: Partial<Product> & { name: string; selling_price: number }): Product {
    const store = loadStore();
    if (productData.id) {
      const idx = store.products.findIndex((p) => p.id === productData.id);
      if (idx !== -1) {
        store.products[idx] = {
          ...store.products[idx],
          ...productData,
          updated_at: new Date().toISOString(),
        };
        saveStore(store);
        return store.products[idx];
      }
    }
    const newProd: Product = {
      id: `prod-${Date.now()}`,
      shop_id: store.shop.id,
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
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    store.products.push(newProd);

    // If initial stock > 0, record OPENING stock movement
    if (newProd.current_quantity > 0) {
      store.stock_movements.push({
        id: `mov-${Date.now()}`,
        shop_id: store.shop.id,
        product_id: newProd.id,
        product_name: newProd.name,
        user_id: OWNER_USER_ID,
        user_name: 'System',
        movement_type: 'OPENING',
        quantity_change: newProd.current_quantity,
        quantity_before: 0,
        quantity_after: newProd.current_quantity,
        unit_cost: newProd.purchase_cost,
        reason: 'New Product Initial Stock',
        created_at: new Date().toISOString(),
      });
    }

    saveStore(store);
    return newProd;
  },

  deleteProduct(productId: string): boolean {
    const store = loadStore();
    const idx = store.products.findIndex((p) => p.id === productId);
    if (idx !== -1) {
      // Soft-delete or mark inactive
      store.products[idx].is_active = false;
      saveStore(store);
      return true;
    }
    return false;
  },

  // Stock In / Purchase Entry
  recordPurchase(purchaseData: {
    supplier_id?: string;
    supplier_invoice_number?: string;
    purchase_date: string;
    items: Array<{ product_id: string; quantity_received: number; unit_cost: number }>;
    shipping_expenses?: number;
    tax_amount?: number;
    notes?: string;
    user_id: string;
    user_name: string;
  }): Purchase {
    const store = loadStore();
    let subtotal = 0;
    const purchaseItems: any[] = [];

    const now = new Date().toISOString();

    for (const item of purchaseData.items) {
      const lineTotal = item.quantity_received * item.unit_cost;
      subtotal += lineTotal;

      const prod = store.products.find((p) => p.id === item.product_id);
      if (!prod) continue;

      const qtyBefore = prod.current_quantity;
      const qtyAfter = qtyBefore + item.quantity_received;

      // Update product current quantity and latest purchase cost
      prod.current_quantity = qtyAfter;
      prod.purchase_cost = item.unit_cost;
      prod.updated_at = now;

      purchaseItems.push({
        id: `pi-${Date.now()}-${item.product_id}`,
        product_id: item.product_id,
        product_name: prod.name,
        quantity_received: item.quantity_received,
        unit_cost: item.unit_cost,
        line_total: lineTotal,
      });

      // Write permanent stock movement
      store.stock_movements.push({
        id: `mov-${Date.now()}-${item.product_id}`,
        shop_id: store.shop.id,
        product_id: item.product_id,
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
      });
    }

    const supplier = store.suppliers.find((s) => s.id === purchaseData.supplier_id);
    const shipping = Number(purchaseData.shipping_expenses) || 0;
    const tax = Number(purchaseData.tax_amount) || 0;
    const total = subtotal + shipping + tax;

    const newPurchase: Purchase = {
      id: `pur-${Date.now()}`,
      shop_id: store.shop.id,
      supplier_id: purchaseData.supplier_id,
      supplier_name: supplier?.name,
      user_id: purchaseData.user_id,
      user_name: purchaseData.user_name,
      supplier_invoice_number: purchaseData.supplier_invoice_number,
      purchase_date: purchaseData.purchase_date || now.split('T')[0],
      items: purchaseItems,
      subtotal_amount: subtotal,
      shipping_expenses: shipping,
      tax_amount: tax,
      total_amount: total,
      notes: purchaseData.notes,
      created_at: now,
    };

    store.purchases.unshift(newPurchase);
    saveStore(store);
    return newPurchase;
  },

  // Atomic Sale & Stock Deduction
  createInvoice(invoiceData: {
    customer_name: string;
    customer_phone?: string;
    user_id: string;
    user_name: string;
    items: Array<{
      product_id: string;
      quantity: number;
      unit_price: number;
      discount_amount?: number;
    }>;
    discount_amount?: number;
    tax_rate?: number;
    payment_method: any;
    paid_amount?: number;
    is_tax_invoice?: boolean;
    notes?: string;
    allow_negative_override?: boolean;
    override_reason?: string;
  }): Invoice {
    const store = loadStore();
    const shop = store.shop;

    // 1. Validate Stock Availability
    for (const item of invoiceData.items) {
      const prod = store.products.find((p) => p.id === item.product_id);
      if (!prod) {
        throw new Error(`Product ID ${item.product_id} not found in catalog.`);
      }
      if (!shop.allow_negative_stock && !invoiceData.allow_negative_override) {
        if (prod.current_quantity < item.quantity) {
          throw new Error(
            `Insufficient stock for "${prod.name}". Available: ${prod.current_quantity}, Requested: ${item.quantity}. Override requires authorization.`
          );
        }
      }
    }

    const now = new Date().toISOString();
    const invoiceNumber = `${shop.invoice_prefix}${Date.now().toString().slice(-6)}`;

    let subtotal = 0;
    const invoiceItems: any[] = [];

    // 2. Process Line Items and deduct stock atomically
    for (const item of invoiceData.items) {
      const prod = store.products.find((p) => p.id === item.product_id)!;
      const itemDisc = Number(item.discount_amount) || 0;
      const lineTotal = item.quantity * item.unit_price - itemDisc;
      subtotal += lineTotal;

      const qtyBefore = prod.current_quantity;
      const qtyAfter = qtyBefore - item.quantity;
      prod.current_quantity = qtyAfter;
      prod.updated_at = now;

      invoiceItems.push({
        id: `ii-${Date.now()}-${prod.id}`,
        product_id: prod.id,
        product_name: prod.name,
        brand: prod.brand,
        sku: prod.sku,
        quantity: item.quantity,
        unit_price: item.unit_price,
        discount_amount: itemDisc,
        tax_rate: invoiceData.is_tax_invoice ? shop.default_gst_rate : 0,
        line_total: lineTotal,
        cost_price_at_sale: prod.purchase_cost,
      });

      // Write permanent stock movement
      store.stock_movements.push({
        id: `mov-${Date.now()}-${prod.id}`,
        shop_id: store.shop.id,
        product_id: prod.id,
        product_name: prod.name,
        user_id: invoiceData.user_id,
        user_name: invoiceData.user_name,
        movement_type: 'SALE',
        quantity_change: -item.quantity,
        quantity_before: qtyBefore,
        quantity_after: qtyAfter,
        unit_cost: prod.purchase_cost,
        reason: `Sold on Inv #${invoiceNumber}${invoiceData.override_reason ? ` (Override: ${invoiceData.override_reason})` : ''}`,
        created_at: now,
      });
    }

    // 3. Totals and Tax calculation
    const overallDiscount = Number(invoiceData.discount_amount) || 0;
    const taxableSubtotal = Math.max(0, subtotal - overallDiscount);
    let taxAmount = 0;
    if (invoiceData.is_tax_invoice && shop.enable_gst) {
      taxAmount = Number(((taxableSubtotal * (shop.default_gst_rate || 18)) / 100).toFixed(2));
    }
    const grandTotal = Math.round(taxableSubtotal + taxAmount);
    const paidAmount = invoiceData.paid_amount !== undefined ? Number(invoiceData.paid_amount) : grandTotal;
    const paymentStatus = paidAmount >= grandTotal ? 'PAID' : paidAmount > 0 ? 'PARTIALLY_PAID' : 'PENDING';

    // 4. Update or Create Customer
    let customerId: string | undefined;
    if (invoiceData.customer_phone) {
      const cleanPhone = invoiceData.customer_phone.replace(/\D/g, '').slice(-10);
      let customer = store.customers.find((c) => c.phone.replace(/\D/g, '').slice(-10) === cleanPhone);
      if (customer) {
        customer.name = invoiceData.customer_name || customer.name;
        customer.total_spent += paidAmount;
        customer.visit_count += 1;
        customer.last_visit_at = now;
        if (paidAmount < grandTotal) {
          customer.outstanding_balance += grandTotal - paidAmount;
        }
        customerId = customer.id;
      } else {
        const newCust: Customer = {
          id: `cust-${Date.now()}`,
          shop_id: store.shop.id,
          name: invoiceData.customer_name || 'Retail Customer',
          phone: cleanPhone,
          outstanding_balance: paidAmount < grandTotal ? grandTotal - paidAmount : 0,
          total_spent: paidAmount,
          visit_count: 1,
          last_visit_at: now,
          created_at: now,
        };
        store.customers.push(newCust);
        customerId = newCust.id;
      }
    }

    const newInvoice: Invoice = {
      id: `inv-${Date.now()}`,
      shop_id: store.shop.id,
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

    store.invoices.unshift(newInvoice);
    saveStore(store);
    return newInvoice;
  },

  // Cancel Invoice & Restock
  cancelInvoice(invoiceId: string, user_id: string, user_name: string, reason: string): Invoice {
    const store = loadStore();
    const inv = store.invoices.find((i) => i.id === invoiceId);
    if (!inv) throw new Error('Invoice not found');
    if (inv.status === 'CANCELLED') throw new Error('Invoice is already cancelled');

    const now = new Date().toISOString();
    inv.status = 'CANCELLED';
    inv.cancellation_reason = reason;
    inv.cancelled_by = user_id;
    inv.cancelled_at = now;
    inv.updated_at = now;

    // Restock all items and record stock movement
    for (const item of inv.items) {
      if (item.product_id) {
        const prod = store.products.find((p) => p.id === item.product_id);
        if (prod) {
          const qtyBefore = prod.current_quantity;
          const qtyAfter = qtyBefore + item.quantity;
          prod.current_quantity = qtyAfter;
          prod.updated_at = now;

          store.stock_movements.push({
            id: `mov-${Date.now()}-${prod.id}`,
            shop_id: store.shop.id,
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
          });
        }
      }
    }

    // Adjust customer spent / balance if linked
    if (inv.customer_id) {
      const cust = store.customers.find((c) => c.id === inv.customer_id);
      if (cust) {
        cust.total_spent = Math.max(0, cust.total_spent - inv.paid_amount);
        const unpaid = inv.total_amount - inv.paid_amount;
        if (unpaid > 0) {
          cust.outstanding_balance = Math.max(0, cust.outstanding_balance - unpaid);
        }
      }
    }

    saveStore(store);
    return inv;
  },

  // Stock Reconciliation & Physical Counts
  recordAdjustment(adjustmentData: {
    product_id: string;
    new_quantity: number;
    reason: string;
    user_id: string;
    user_name: string;
  }): StockMovement {
    const store = loadStore();
    const prod = store.products.find((p) => p.id === adjustmentData.product_id);
    if (!prod) throw new Error('Product not found');

    const now = new Date().toISOString();
    const qtyBefore = prod.current_quantity;
    const qtyAfter = adjustmentData.new_quantity;
    const diff = qtyAfter - qtyBefore;

    prod.current_quantity = qtyAfter;
    prod.updated_at = now;

    const movement: StockMovement = {
      id: `mov-${Date.now()}-${prod.id}`,
      shop_id: store.shop.id,
      product_id: prod.id,
      product_name: prod.name,
      user_id: adjustmentData.user_id,
      user_name: adjustmentData.user_name,
      movement_type: 'ADJUSTMENT',
      quantity_change: diff,
      quantity_before: qtyBefore,
      quantity_after: qtyAfter,
      unit_cost: prod.purchase_cost,
      reason: adjustmentData.reason || 'Physical Stock Count Reconciliation',
      created_at: now,
    };

    store.stock_movements.push(movement);
    saveStore(store);
    return movement;
  },

  // Customer Return (Sellable vs Damaged)
  recordCustomerReturn(returnData: {
    invoice_id?: string;
    product_id: string;
    quantity: number;
    refund_amount: number;
    condition: 'SELLABLE' | 'DAMAGED';
    reason: string;
    user_id: string;
    user_name: string;
  }): ReturnRecord {
    const store = loadStore();
    const prod = store.products.find((p) => p.id === returnData.product_id);
    if (!prod) throw new Error('Product not found');

    const now = new Date().toISOString();
    const record: ReturnRecord = {
      id: `ret-${Date.now()}`,
      shop_id: store.shop.id,
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

    // If sellable, increase current quantity
    if (returnData.condition === 'SELLABLE') {
      const qtyBefore = prod.current_quantity;
      const qtyAfter = qtyBefore + returnData.quantity;
      prod.current_quantity = qtyAfter;
      prod.updated_at = now;

      store.stock_movements.push({
        id: `mov-${Date.now()}-${prod.id}`,
        shop_id: store.shop.id,
        product_id: prod.id,
        product_name: prod.name,
        user_id: returnData.user_id,
        user_name: returnData.user_name,
        movement_type: 'CUSTOMER_RETURN',
        quantity_change: returnData.quantity,
        quantity_before: qtyBefore,
        quantity_after: qtyAfter,
        unit_cost: prod.purchase_cost,
        reason: `Customer Return (Sellable): ${returnData.reason}`,
        created_at: now,
      });
    } else {
      // Marked damaged/loss
      store.stock_movements.push({
        id: `mov-${Date.now()}-${prod.id}`,
        shop_id: store.shop.id,
        product_id: prod.id,
        product_name: prod.name,
        user_id: returnData.user_id,
        user_name: returnData.user_name,
        movement_type: 'DAMAGE_LOSS',
        quantity_change: 0, // already sold previously, not added back
        quantity_before: prod.current_quantity,
        quantity_after: prod.current_quantity,
        unit_cost: prod.purchase_cost,
        reason: `Customer Return (Damaged - Scrapped): ${returnData.reason}`,
        created_at: now,
      });
    }

    store.returns.unshift(record);
    saveStore(store);
    return record;
  },

  getInvoices(filters?: { limit?: number; user_id?: string; search?: string }): Invoice[] {
    const store = loadStore();
    let list = [...store.invoices];
    if (filters?.user_id) {
      list = list.filter((i) => i.user_id === filters.user_id);
    }
    if (filters?.search) {
      const q = filters.search.toLowerCase();
      list = list.filter(
        (i) =>
          i.invoice_number.toLowerCase().includes(q) ||
          i.customer_name.toLowerCase().includes(q) ||
          (i.customer_phone && i.customer_phone.includes(q))
      );
    }
    if (filters?.limit) {
      list = list.slice(0, filters.limit);
    }
    return list;
  },

  getInvoiceById(id: string): Invoice | undefined {
    const store = loadStore();
    return store.invoices.find((i) => i.id === id || i.invoice_number === id);
  },

  getPurchases(): Purchase[] {
    const store = loadStore();
    return store.purchases;
  },

  getCustomers(): Customer[] {
    const store = loadStore();
    return store.customers;
  },

  getStockMovements(filters?: { product_id?: string; startDate?: string; endDate?: string }): StockMovement[] {
    const store = loadStore();
    let list = [...store.stock_movements];
    if (filters?.product_id) {
      list = list.filter((m) => m.product_id === filters.product_id);
    }
    if (filters?.startDate) {
      const start = new Date(filters.startDate).getTime();
      list = list.filter((m) => new Date(m.created_at).getTime() >= start);
    }
    if (filters?.endDate) {
      const end = new Date(filters.endDate).getTime();
      list = list.filter((m) => new Date(m.created_at).getTime() <= end);
    }
    return list.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  },

  // Daily Stock Ledger Calculation:
  // Closing Stock = Opening Stock + Stock Received + Sellable Returns - Sold - Supplier Returns - Damaged ± Adjustments
  getDailyLedger(dateString?: string): DailyLedgerRow[] {
    const store = loadStore();
    const targetDate = dateString ? new Date(dateString) : new Date();
    const startOfDay = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate(), 0, 0, 0);
    const endOfDay = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate(), 23, 59, 59);

    const rows: DailyLedgerRow[] = [];

    for (const prod of store.products) {
      const prodMovements = store.stock_movements.filter((m) => m.product_id === prod.id);

      // Movements before target date determine Opening Stock
      const priorMovements = prodMovements.filter((m) => new Date(m.created_at).getTime() < startOfDay.getTime());
      const openingStock = priorMovements.reduce((acc, m) => acc + m.quantity_change, 0);

      // Movements within target date
      const todayMovements = prodMovements.filter(
        (m) =>
          new Date(m.created_at).getTime() >= startOfDay.getTime() &&
          new Date(m.created_at).getTime() <= endOfDay.getTime()
      );

      let received = 0;
      let sold = 0;
      let returns = 0;
      let damaged = 0;
      let adjustments = 0;

      for (const m of todayMovements) {
        if (m.movement_type === 'PURCHASE') {
          received += m.quantity_change;
        } else if (m.movement_type === 'SALE') {
          sold += Math.abs(m.quantity_change);
        } else if (m.movement_type === 'CUSTOMER_RETURN') {
          returns += m.quantity_change;
        } else if (m.movement_type === 'DAMAGE_LOSS') {
          damaged += Math.abs(m.quantity_change);
        } else if (m.movement_type === 'ADJUSTMENT') {
          adjustments += m.quantity_change;
        }
      }

      // If no prior movements existed, opening is product's opening or 0
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
        closing_stock: Math.max(0, closingStock > 0 ? closingStock : prod.current_quantity),
        purchase_cost: prod.purchase_cost,
        selling_price: prod.selling_price,
        valuation_cost: (closingStock > 0 ? closingStock : prod.current_quantity) * prod.purchase_cost,
        valuation_retail: (closingStock > 0 ? closingStock : prod.current_quantity) * prod.selling_price,
      });
    }

    return rows;
  },

  // Financial & Dashboard Metrics
  getDashboardMetrics(dateString?: string) {
    const store = loadStore();
    const targetDate = dateString ? new Date(dateString) : new Date();
    const startOfDay = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate(), 0, 0, 0);
    const endOfDay = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate(), 23, 59, 59);

    const todayInvoices = store.invoices.filter(
      (i) =>
        i.status === 'FINALIZED' &&
        new Date(i.created_at).getTime() >= startOfDay.getTime() &&
        new Date(i.created_at).getTime() <= endOfDay.getTime()
    );

    let salesToday = 0;
    let cashCollected = 0;
    let upiCollected = 0;
    let cardCollected = 0;
    let totalDiscount = 0;
    let totalUnitsSold = 0;
    let totalGrossProfit = 0;

    for (const inv of todayInvoices) {
      salesToday += inv.total_amount;
      totalDiscount += inv.discount_amount;

      if (inv.payment_method === 'CASH') cashCollected += inv.paid_amount;
      else if (inv.payment_method === 'UPI') upiCollected += inv.paid_amount;
      else if (inv.payment_method === 'CARD') cardCollected += inv.paid_amount;

      for (const item of inv.items) {
        totalUnitsSold += item.quantity;
        const cost = (item.cost_price_at_sale || 0) * item.quantity;
        totalGrossProfit += item.line_total - cost;
      }
    }

    // Today's stock received
    const todayMovements = store.stock_movements.filter(
      (m) =>
        m.movement_type === 'PURCHASE' &&
        new Date(m.created_at).getTime() >= startOfDay.getTime() &&
        new Date(m.created_at).getTime() <= endOfDay.getTime()
    );
    const stockReceivedToday = todayMovements.reduce((acc, m) => acc + m.quantity_change, 0);

    // Stock alerts
    const lowStockProducts = store.products.filter(
      (p) => p.is_active && p.current_quantity > 0 && p.current_quantity <= p.min_stock_level
    );
    const outOfStockProducts = store.products.filter((p) => p.is_active && p.current_quantity <= 0);

    // Current Inventory Valuations
    let inventoryCostValuation = 0;
    let inventoryRetailValuation = 0;
    for (const p of store.products) {
      if (p.is_active && p.current_quantity > 0) {
        inventoryCostValuation += p.current_quantity * p.purchase_cost;
        inventoryRetailValuation += p.current_quantity * p.selling_price;
      }
    }

    // Outstanding customer balances
    const outstandingBalances = store.customers.reduce((acc, c) => acc + (c.outstanding_balance || 0), 0);

    // Employee-wise sales summary
    const employeeSales: Record<string, { name: string; billsCount: number; revenue: number }> = {};
    for (const inv of todayInvoices) {
      if (!employeeSales[inv.user_id]) {
        employeeSales[inv.user_id] = { name: inv.user_name, billsCount: 0, revenue: 0 };
      }
      employeeSales[inv.user_id].billsCount += 1;
      employeeSales[inv.user_id].revenue += inv.total_amount;
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
      recentInvoices: store.invoices.slice(0, 10),
    };
  },

  // Export full JSON backup
  exportBackup(): StoreData {
    return loadStore();
  },

  // Restore JSON backup
  restoreBackup(backupData: StoreData): boolean {
    if (!backupData.shop || !backupData.products || !backupData.users) {
      throw new Error('Invalid backup data format');
    }
    saveStore(backupData);
    return true;
  },
};
