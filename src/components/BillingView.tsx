import React, { useState, useMemo, useRef } from 'react';
import { apiFetch } from '@/lib/api';
import { Product, Customer, UserProfile, Shop, Invoice } from '@/types';
import {
  Search,
  ShoppingCart,
  Plus,
  Minus,
  Trash2,
  Check,
  User,
  Phone,
  Tag,
  CreditCard,
  Banknote,
  QrCode,
  AlertCircle,
  Sparkles,
  ChevronUp,
  ChevronDown,
  X,
} from 'lucide-react';

interface CartItem {
  product: Product;
  quantity: number;
  unit_price: number;
  discount_amount: number;
}

interface BillingViewProps {
  products: Product[];
  customers: Customer[];
  user: UserProfile;
  shop: Shop;
  onInvoiceCreated: (invoice: Invoice) => void;
  onOpenAiBilling: () => void;
}

export const BillingView: React.FC<BillingViewProps> = ({
  products,
  customers,
  user,
  shop,
  onInvoiceCreated,
  onOpenAiBilling,
}) => {
  // Search & Filter
  const billKeyRef = useRef<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  // Customer state
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);

  // Cart state
  const [cart, setCart] = useState<CartItem[]>([]);
  const [cartOpen, setCartOpen] = useState(false);
  const [overallDiscount, setOverallDiscount] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState<'CASH' | 'UPI' | 'CARD' | 'CREDIT'>('CASH');
  const [isTaxInvoice, setIsTaxInvoice] = useState<boolean>(shop.enable_gst);

  // Override Modal state for out-of-stock items
  const [overrideModalOpen, setOverrideModalOpen] = useState(false);
  const [overrideReason, setOverrideReason] = useState('');
  const [pendingSubmission, setPendingSubmission] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Extract categories
  const categories = useMemo(() => {
    const set = new Set<string>();
    products.forEach((p) => {
      if (p.category_name) set.add(p.category_name);
    });
    return Array.from(set);
  }, [products]);

  // Filtered products
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      if (!p.is_active) return false;
      const matchesCategory =
        selectedCategory === 'all' || p.category_name === selectedCategory;
      const q = searchQuery.toLowerCase();
      const matchesSearch =
        !q ||
        p.name.toLowerCase().includes(q) ||
        p.brand.toLowerCase().includes(q) ||
        (p.compatible_models && p.compatible_models.toLowerCase().includes(q)) ||
        (p.barcode && p.barcode.includes(q)) ||
        (p.sku && p.sku.toLowerCase().includes(q));
      return matchesCategory && matchesSearch;
    });
  }, [products, selectedCategory, searchQuery]);

  // Filtered customer suggestions
  const customerSuggestions = useMemo(() => {
    if (!customerPhone && !customerName) return [];
    const q = (customerPhone || customerName).toLowerCase();
    return customers.filter(
      (c) => c.phone.includes(q) || c.name.toLowerCase().includes(q)
    ).slice(0, 4);
  }, [customers, customerPhone, customerName]);

  // Cart Operations
  const addToCart = (product: Product) => {
    setCart((prev) => {
      const existing = prev.find((item) => item.product.id === product.id);
      if (existing) {
        return prev.map((item) =>
          item.product.id === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }
      return [
        ...prev,
        {
          product,
          quantity: 1,
          unit_price: product.selling_price,
          discount_amount: 0,
        },
      ];
    });
  };

  const updateQuantity = (productId: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((item) => {
          if (item.product.id === productId) {
            const newQty = item.quantity + delta;
            return newQty > 0 ? { ...item, quantity: newQty } : null;
          }
          return item;
        })
        .filter(Boolean) as CartItem[]
    );
  };

  const updatePrice = (productId: string, newPrice: number) => {
    setCart((prev) =>
      prev.map((item) =>
        item.product.id === productId
          ? { ...item, unit_price: Math.max(0, newPrice) }
          : item
      )
    );
  };

  const removeFromCart = (productId: string) => {
    setCart((prev) => prev.filter((item) => item.product.id !== productId));
  };

  const clearCart = () => {
    setCart([]);
    setOverallDiscount(0);
    setErrorMsg(null);
  };

  // Calculations
  const cartSubtotal = useMemo(() => {
    return cart.reduce(
      (sum, item) => sum + item.quantity * item.unit_price - item.discount_amount,
      0
    );
  }, [cart]);

  const totalDiscount = overallDiscount;
  const taxableSubtotal = Math.max(0, cartSubtotal - totalDiscount);
  const taxAmount = isTaxInvoice && shop.enable_gst
    ? Math.round((taxableSubtotal * (shop.default_gst_rate || 18)) / 100)
    : 0;
  const grandTotal = Math.round(taxableSubtotal + taxAmount);
  const totalItemsCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  // Check out-of-stock
  const checkStockExceeded = () => {
    return cart.find((item) => item.quantity > item.product.current_quantity);
  };

  // Finalize Submission
  const handleFinalize = async (overrideConfirmed = false) => {
    if (cart.length === 0) return;

    // Verify stock
    const exceeded = checkStockExceeded();
    if (exceeded && !overrideConfirmed) {
      if (user.role === 'owner' || shop.allow_negative_stock) {
        setOverrideModalOpen(true);
        return;
      } else {
        setErrorMsg(
          `Cannot sell "${exceeded.product.name}": Available stock is ${exceeded.product.current_quantity}, requested ${exceeded.quantity}. Owner authorization required.`
        );
        return;
      }
    }

    setSubmitting(true);
    setErrorMsg(null);

    try {
      const payload = {
        customer_name: customerName.trim() || 'Walk-in Customer',
        customer_phone: customerPhone.trim() || undefined,
        user_id: user.id,
        user_name: user.full_name,
        items: cart.map((i) => ({
          product_id: i.product.id,
          quantity: i.quantity,
          unit_price: i.unit_price,
          discount_amount: i.discount_amount,
        })),
        discount_amount: overallDiscount,
        payment_method: paymentMethod,
        is_tax_invoice: isTaxInvoice,
        allow_negative_override: overrideConfirmed,
        override_reason: overrideConfirmed ? overrideReason : undefined,
      } as any;

      if (!billKeyRef.current) billKeyRef.current = crypto.randomUUID();
      payload.idempotency_key = billKeyRef.current;

      const res = await apiFetch('/api/invoices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create invoice');

      // New bill next time: mint a fresh idempotency key.
      billKeyRef.current = null;

      // Clear cart
      clearCart();
      setCustomerName('');
      setCustomerPhone('');
      setCartOpen(false);
      setOverrideModalOpen(false);

      // Trigger callback with created invoice
      onInvoiceCreated(data.invoice);
    } catch (err: any) {
      if (/already used with a different bill/i.test(err?.message || '')) billKeyRef.current = null;
      setErrorMsg(err.message || 'Error completing sale');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="pb-28 max-w-7xl mx-auto px-3 py-3">
      {/* Top Customer & AI Bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3 shadow-md mb-3 space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
            <User className="w-3.5 h-3.5 text-emerald-400" /> Customer Details
          </span>
          <button
            onClick={onOpenAiBilling}
            className="flex items-center gap-1 text-[11px] font-semibold text-violet-400 hover:text-violet-300 transition"
          >
            <Sparkles className="w-3 h-3 text-amber-400" />
            <span>AI Fast Voice Bill</span>
          </button>
        </div>

        <div className="grid grid-cols-2 gap-2 relative">
          <div className="relative">
            <input
              type="tel"
              placeholder="Phone (10 digits)"
              value={customerPhone}
              onChange={(e) => {
                setCustomerPhone(e.target.value);
                setShowCustomerDropdown(true);
              }}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div className="relative">
            <input
              type="text"
              placeholder="Customer Name"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
            />
          </div>

          {/* Customer Autocomplete Dropdown */}
          {showCustomerDropdown && customerSuggestions.length > 0 && (
            <div className="absolute top-full left-0 right-0 z-30 mt-1 bg-slate-800 border border-slate-700 rounded-xl shadow-xl overflow-hidden divide-y divide-slate-700/60">
              {customerSuggestions.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => {
                    setCustomerName(c.name);
                    setCustomerPhone(c.phone);
                    setShowCustomerDropdown(false);
                  }}
                  className="w-full text-left px-3 py-2 text-xs text-slate-200 hover:bg-slate-700 flex justify-between items-center"
                >
                  <span className="font-medium">{c.name}</span>
                  <span className="text-[11px] text-slate-400">+91 {c.phone}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Product Search & Category Filters */}
      <div className="space-y-2 mb-3">
        {/* Search Bar */}
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
          <input
            type="text"
            placeholder="Search accessory, brand, model, barcode..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-900 border border-slate-800 rounded-2xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 shadow-sm"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-2.5 text-slate-400 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Category Chips (Horizontal Scrollable) */}
        <div className="flex gap-1.5 overflow-x-auto no-scrollbar py-1">
          <button
            onClick={() => setSelectedCategory('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap transition shrink-0 ${
              selectedCategory === 'all'
                ? 'bg-emerald-500 text-slate-950 font-bold shadow-md shadow-emerald-500/20'
                : 'bg-slate-800/80 text-slate-300 hover:bg-slate-800 border border-slate-700/60'
            }`}
          >
            All Items
          </button>
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap transition shrink-0 ${
                selectedCategory === cat
                  ? 'bg-emerald-500 text-slate-950 font-bold shadow-md shadow-emerald-500/20'
                  : 'bg-slate-800/80 text-slate-300 hover:bg-slate-800 border border-slate-700/60'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Product Catalog Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2.5">
        {filteredProducts.map((prod) => {
          const inCart = cart.find((i) => i.product.id === prod.id);
          const isOutOfStock = prod.current_quantity <= 0;
          const isLowStock = prod.current_quantity > 0 && prod.current_quantity <= prod.min_stock_level;

          return (
            <div
              key={prod.id}
              onClick={() => addToCart(prod)}
              className={`relative bg-slate-900 border rounded-2xl p-3 flex flex-col justify-between transition cursor-pointer active:scale-95 select-none ${
                inCart
                  ? 'border-emerald-500 shadow-md shadow-emerald-500/10 bg-emerald-950/10'
                  : 'border-slate-800 hover:border-slate-700'
              }`}
            >
              {/* Top Meta */}
              <div>
                <div className="flex items-center justify-between gap-1 mb-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider truncate">
                    {prod.brand}
                  </span>
                  {/* Stock Indicator */}
                  <span
                    className={`text-[10px] px-1.5 py-0.2 rounded font-bold ${
                      isOutOfStock
                        ? 'bg-red-950 text-red-400 border border-red-800'
                        : isLowStock
                        ? 'bg-amber-950 text-amber-300 border border-amber-800'
                        : 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                    }`}
                  >
                    {prod.current_quantity} in stock
                  </span>
                </div>

                <h3 className="text-xs font-semibold text-slate-100 line-clamp-2 leading-tight">
                  {prod.name}
                </h3>

                {prod.compatible_models && (
                  <p className="text-[10px] text-slate-400 mt-1 truncate">
                    📱 {prod.compatible_models}
                  </p>
                )}
              </div>

              {/* Bottom Price & Add Action */}
              <div className="mt-3 pt-2 border-t border-slate-800/80 flex items-center justify-between">
                <span className="text-sm font-black text-emerald-400">
                  ₹{prod.selling_price}
                </span>

                {inCart ? (
                  <span className="w-6 h-6 rounded-full bg-emerald-500 text-slate-950 flex items-center justify-center text-xs font-extrabold shadow">
                    {inCart.quantity}
                  </span>
                ) : (
                  <span className="w-6 h-6 rounded-full bg-slate-800 text-slate-300 flex items-center justify-center hover:bg-emerald-500 hover:text-slate-950 transition">
                    <Plus className="w-3.5 h-3.5" />
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {filteredProducts.length === 0 && (
        <div className="text-center py-12 text-slate-400">
          <p className="text-sm">No products found matching "{searchQuery}"</p>
          <button
            onClick={() => {
              setSearchQuery('');
              setSelectedCategory('all');
            }}
            className="mt-2 text-xs text-emerald-400 underline"
          >
            Clear search filters
          </button>
        </div>
      )}

      {/* Floating Sticky Bottom Cart Preview Bar */}
      {cart.length > 0 && (
        <div className="fixed bottom-14 left-0 right-0 z-40 px-3">
          <div className="max-w-md mx-auto bg-slate-900/95 border border-emerald-500/50 rounded-2xl shadow-2xl p-2.5 backdrop-blur flex items-center justify-between">
            <button
              onClick={() => setCartOpen(true)}
              className="flex items-center gap-2.5 text-left"
            >
              <div className="relative w-10 h-10 rounded-xl bg-emerald-500 text-slate-950 flex items-center justify-center font-bold">
                <ShoppingCart className="w-5 h-5" />
                <span className="absolute -top-1.5 -right-1.5 bg-red-500 text-paper text-[10px] w-5 h-5 rounded-full flex items-center justify-center font-black">
                  {totalItemsCount}
                </span>
              </div>
              <div>
                <div className="text-xs font-bold text-white">
                  ₹{grandTotal} <span className="text-[11px] font-normal text-slate-400">({totalItemsCount} items)</span>
                </div>
                <div className="text-[10px] text-emerald-400 flex items-center gap-1 font-medium">
                  Tap to view bill <ChevronUp className="w-3 h-3" />
                </div>
              </div>
            </button>

            <button
              onClick={() => handleFinalize()}
              disabled={submitting}
              className="py-2.5 px-4 rounded-xl bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-400 hover:to-green-500 text-slate-950 font-bold text-xs shadow-md shadow-emerald-500/25 active:scale-95 transition disabled:opacity-50"
            >
              {submitting ? 'Billing...' : 'Finalize & Bill'}
            </button>
          </div>
        </div>
      )}

      {/* Full Cart Drawer / Modal */}
      {cartOpen && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end bg-black/75 backdrop-blur-sm">
          <div className="fixed inset-0" onClick={() => setCartOpen(false)} />
          <div className="relative z-10 w-full bg-slate-900 border-t border-slate-800 rounded-t-3xl max-h-[85vh] flex flex-col max-w-lg mx-auto shadow-2xl overflow-hidden">
            {/* Header */}
            <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
              <div className="flex items-center gap-2">
                <ShoppingCart className="w-5 h-5 text-emerald-400" />
                <h2 className="text-sm font-bold text-white">
                  Current Bill ({totalItemsCount} items)
                </h2>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={clearCart}
                  className="text-xs text-red-400 hover:underline px-2 py-1"
                >
                  Clear All
                </button>
                <button
                  onClick={() => setCartOpen(false)}
                  className="p-1 rounded-full text-slate-400 hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Cart Items List */}
            <div className="p-4 overflow-y-auto divide-y divide-slate-800 flex-1 space-y-3">
              {cart.map((item) => (
                <div key={item.product.id} className="pt-3 first:pt-0">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="text-xs font-semibold text-slate-100 truncate">
                        {item.product.name}
                      </div>
                      <div className="text-[10px] text-slate-400">
                        {item.product.brand} • In stock: {item.product.current_quantity}
                      </div>
                    </div>
                    <button
                      onClick={() => removeFromCart(item.product.id)}
                      className="text-slate-500 hover:text-red-400 p-1"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="mt-2 flex items-center justify-between">
                    {/* Quantity Stepper */}
                    <div className="flex items-center gap-2 bg-slate-800 border border-slate-700 rounded-xl px-2 py-1">
                      <button
                        onClick={() => updateQuantity(item.product.id, -1)}
                        className="p-1 text-slate-300 hover:text-white active:scale-90"
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <span className="text-xs font-bold text-white px-2">
                        {item.quantity}
                      </span>
                      <button
                        onClick={() => updateQuantity(item.product.id, 1)}
                        className="p-1 text-slate-300 hover:text-white active:scale-90"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>

                    {/* Price and Line Total */}
                    <div className="text-right">
                      <span className="text-[11px] text-slate-400">
                        @ ₹{item.unit_price}
                      </span>
                      <div className="text-xs font-bold text-emerald-400">
                        ₹{item.quantity * item.unit_price}
                      </div>
                    </div>
                  </div>
                </div>
              ))}

              {/* Bill Discounts & Settings */}
              <div className="pt-4 space-y-2.5">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs text-slate-300 flex items-center gap-1">
                    <Tag className="w-3.5 h-3.5 text-amber-400" /> Bill Discount (₹):
                  </span>
                  <input
                    type="number"
                    min="0"
                    placeholder="0"
                    value={overallDiscount || ''}
                    onChange={(e) => setOverallDiscount(Number(e.target.value))}
                    className="w-24 bg-slate-800 border border-slate-700 rounded-xl px-2.5 py-1 text-xs text-right text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>

                {shop.enable_gst && (
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs text-slate-300">GST Invoice ({shop.default_gst_rate}%):</span>
                    <input
                      type="checkbox"
                      checked={isTaxInvoice}
                      onChange={(e) => setIsTaxInvoice(e.target.checked)}
                      className="w-4 h-4 accent-emerald-500 rounded"
                    />
                  </div>
                )}

                {/* Payment Method Selector */}
                <div className="pt-2">
                  <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1.5">
                    Payment Mode
                  </span>
                  <div className="grid grid-cols-4 gap-1.5">
                    {[
                      { id: 'CASH', label: 'Cash', icon: Banknote },
                      { id: 'UPI', label: 'UPI', icon: QrCode },
                      { id: 'CARD', label: 'Card', icon: CreditCard },
                      { id: 'CREDIT', label: 'Credit', icon: Tag },
                    ].map((mode) => {
                      const Icon = mode.icon;
                      const active = paymentMethod === mode.id;
                      return (
                        <button
                          key={mode.id}
                          type="button"
                          onClick={() => setPaymentMethod(mode.id as any)}
                          className={`flex flex-col items-center py-2 px-1 rounded-xl border text-[11px] font-semibold transition ${
                            active
                              ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400'
                              : 'bg-slate-800/80 border-slate-700 text-slate-300 hover:bg-slate-800'
                          }`}
                        >
                          <Icon className="w-4 h-4 mb-0.5" />
                          <span>{mode.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>

            {/* Error Message */}
            {errorMsg && (
              <div className="px-4 py-2 bg-red-950/60 border-t border-red-800 text-xs text-red-300 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Footer Summary & Checkout Button */}
            <div className="p-4 bg-slate-950 border-t border-slate-800 space-y-3">
              <div className="space-y-1 text-xs">
                <div className="flex justify-between text-slate-400">
                  <span>Subtotal:</span>
                  <span>₹{cartSubtotal.toFixed(2)}</span>
                </div>
                {overallDiscount > 0 && (
                  <div className="flex justify-between text-red-400">
                    <span>Discount:</span>
                    <span>- ₹{overallDiscount.toFixed(2)}</span>
                  </div>
                )}
                {isTaxInvoice && taxAmount > 0 && (
                  <div className="flex justify-between text-slate-400">
                    <span>GST ({shop.default_gst_rate}%):</span>
                    <span>₹{taxAmount.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between text-base font-extrabold text-white pt-1 border-t border-slate-800">
                  <span>Grand Total:</span>
                  <span className="text-emerald-400">₹{grandTotal}</span>
                </div>
              </div>

              <button
                onClick={() => handleFinalize()}
                disabled={submitting || cart.length === 0}
                className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-400 hover:to-green-500 text-slate-950 font-bold text-sm shadow-lg shadow-emerald-500/25 active:scale-95 transition disabled:opacity-50"
              >
                {submitting ? 'Finalizing & Printing...' : `Finalize & Bill ₹${grandTotal}`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Stock Override Modal (Owner Authorization) */}
      {overrideModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="w-full max-w-sm bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-2xl space-y-4">
            <div className="flex items-center gap-2 text-amber-400">
              <AlertCircle className="w-6 h-6 shrink-0" />
              <h3 className="text-sm font-bold text-white">Out of Stock Warning</h3>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              One or more items in the bill exceed current recorded inventory. As shop owner, you can override and record this sale, but please state the reason for inventory audit.
            </p>
            <input
              type="text"
              placeholder="e.g. Physical stock arrived today before purchase entry"
              value={overrideReason}
              onChange={(e) => setOverrideReason(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-400"
            />
            <div className="flex gap-2">
              <button
                onClick={() => setOverrideModalOpen(false)}
                className="flex-1 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold hover:bg-slate-700"
              >
                Cancel
              </button>
              <button
                onClick={() => handleFinalize(true)}
                disabled={!overrideReason.trim()}
                className="flex-1 py-2 rounded-xl bg-amber-500 text-slate-950 text-xs font-bold hover:bg-amber-400 disabled:opacity-50"
              >
                Authorize Sale
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
