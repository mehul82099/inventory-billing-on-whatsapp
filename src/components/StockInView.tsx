import React, { useState, useRef } from 'react';
import { apiFetch } from '@/lib/api';
import { Product, Supplier, UserProfile } from '@/types';
import {
  ArrowDownToLine,
  Plus,
  Trash2,
  CheckCircle,
  Truck,
  FileText,
  AlertCircle,
  Calendar,
  Building,
} from 'lucide-react';

interface StockInViewProps {
  products: Product[];
  suppliers: Supplier[];
  user: UserProfile;
  onStockReceived: () => void;
}

interface StockInItem {
  product_id: string;
  quantity_received: number;
  unit_cost: number;
}

export const StockInView: React.FC<StockInViewProps> = ({
  products,
  suppliers,
  user,
  onStockReceived,
}) => {
  const purchaseKeyRef = useRef<string | null>(null);
  const [supplierId, setSupplierId] = useState(suppliers[0]?.id || '');
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [purchaseDate, setPurchaseDate] = useState(new Date().toISOString().split('T')[0]);
  const [shippingExpenses, setShippingExpenses] = useState(0);
  const [notes, setNotes] = useState('');

  const [items, setItems] = useState<StockInItem[]>([
    {
      product_id: products[0]?.id || '',
      quantity_received: 10,
      unit_cost: products[0]?.purchase_cost || 0,
    },
  ]);

  const [submitting, setSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const addItemRow = () => {
    setItems((prev) => [
      ...prev,
      {
        product_id: products[0]?.id || '',
        quantity_received: 10,
        unit_cost: products[0]?.purchase_cost || 0,
      },
    ]);
  };

  const removeItemRow = (index: number) => {
    setItems((prev) => prev.filter((_, idx) => idx !== index));
  };

  const updateItem = (index: number, field: keyof StockInItem, value: any) => {
    setItems((prev) =>
      prev.map((item, idx) => {
        if (idx !== index) return item;
        const updated = { ...item, [field]: value };
        if (field === 'product_id') {
          const prod = products.find((p) => p.id === value);
          if (prod) {
            updated.unit_cost = prod.purchase_cost;
          }
        }
        return updated;
      })
    );
  };

  const subtotal = items.reduce(
    (sum, item) => sum + (item.quantity_received || 0) * (item.unit_cost || 0),
    0
  );
  const grandTotal = subtotal + Number(shippingExpenses || 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (items.length === 0) {
      setErrorMsg('Please add at least one item');
      return;
    }

    setSubmitting(true);
    setErrorMsg(null);
    setSuccessMessage(null);

    try {
      const payload = {
        supplier_id: supplierId || undefined,
        supplier_invoice_number: invoiceNumber || undefined,
        purchase_date: purchaseDate,
        shipping_expenses: Number(shippingExpenses) || 0,
        notes,
        user_id: user.id,
        items: items.map((i) => ({
          product_id: i.product_id,
          quantity_received: Number(i.quantity_received),
          unit_cost: Number(i.unit_cost),
        })),
      };

      if (!purchaseKeyRef.current) purchaseKeyRef.current = crypto.randomUUID();
      (payload as any).idempotency_key = purchaseKeyRef.current;

      const res = await apiFetch('/api/purchases', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to record purchase');

      purchaseKeyRef.current = null;
      setSuccessMessage('Stock successfully received and inventory updated!');
      setItems([
        {
          product_id: products[0]?.id || '',
          quantity_received: 10,
          unit_cost: products[0]?.purchase_cost || 0,
        },
      ]);
      setInvoiceNumber('');
      setNotes('');
      onStockReceived();
    } catch (err: any) {
      if (/already used with a different purchase/i.test(err?.message || '')) purchaseKeyRef.current = null;
      setErrorMsg(err.message || 'Error processing purchase');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="pb-28 max-w-4xl mx-auto px-3 py-3 space-y-4">
      {/* Title */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-bold text-white flex items-center gap-1.5">
            <ArrowDownToLine className="w-5 h-5 text-emerald-400" /> Stock In / Purchase Entry
          </h2>
          <p className="text-xs text-slate-400">Receive supplier goods & restock inventory</p>
        </div>
      </div>

      {successMessage && (
        <div className="p-3 rounded-2xl bg-emerald-950/40 border border-emerald-800 text-xs text-emerald-300 flex items-center gap-2">
          <CheckCircle className="w-4 h-4 shrink-0 text-emerald-400" />
          <span>{successMessage}</span>
        </div>
      )}

      {errorMsg && (
        <div className="p-3 rounded-2xl bg-red-950/40 border border-red-800 text-xs text-red-300 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
          <span>{errorMsg}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-3">
        {/* Supplier & Invoice Header Card */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-sm space-y-3 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-slate-400 mb-1 font-medium flex items-center gap-1">
                <Building className="w-3.5 h-3.5 text-emerald-400" /> Wholesaler / Supplier
              </label>
              <select
                value={supplierId}
                onChange={(e) => setSupplierId(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
              >
                {suppliers.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-slate-400 mb-1 font-medium flex items-center gap-1">
                <FileText className="w-3.5 h-3.5 text-blue-400" /> Supplier Invoice #
              </label>
              <input
                type="text"
                placeholder="e.g. APEX-9821"
                value={invoiceNumber}
                onChange={(e) => setInvoiceNumber(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block text-slate-400 mb-1 font-medium flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-purple-400" /> Purchase Date
              </label>
              <input
                type="date"
                value={purchaseDate}
                onChange={(e) => setPurchaseDate(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>
        </div>

        {/* Multi-Item Receiving Card */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Items Received ({items.length})
            </h3>
            <button
              type="button"
              onClick={addItemRow}
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-emerald-400 text-xs font-bold transition"
            >
              <Plus className="w-3.5 h-3.5" /> + Add Another Item
            </button>
          </div>

          <div className="space-y-3">
            {items.map((item, index) => {
              const selectedProd = products.find((p) => p.id === item.product_id);
              const lineTotal = (item.quantity_received || 0) * (item.unit_cost || 0);

              return (
                <div
                  key={index}
                  className="p-3 rounded-2xl bg-slate-800/50 border border-slate-700/60 space-y-2.5 text-xs"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex-1">
                      <label className="block text-slate-400 mb-1">Select Product</label>
                      <select
                        value={item.product_id}
                        onChange={(e) => updateItem(index, 'product_id', e.target.value)}
                        className="w-full bg-slate-800 border border-slate-700 rounded-xl px-2.5 py-1.5 text-white focus:outline-none focus:border-emerald-500 truncate"
                      >
                        {products.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.name} ({p.brand}) [Current: {p.current_quantity}]
                          </option>
                        ))}
                      </select>
                    </div>

                    {items.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeItemRow(index)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-red-400 hover:bg-slate-800 mt-4 transition"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="block text-slate-400 mb-1">Qty Received</label>
                      <input
                        type="number"
                        min="1"
                        required
                        value={item.quantity_received || ''}
                        onChange={(e) =>
                          updateItem(index, 'quantity_received', parseInt(e.target.value, 10))
                        }
                        className="w-full bg-slate-800 border border-slate-700 rounded-xl px-2.5 py-1.5 text-white focus:outline-none focus:border-emerald-500"
                      />
                    </div>

                    <div>
                      <label className="block text-slate-400 mb-1">Unit Cost (₹)</label>
                      <input
                        type="number"
                        min="0"
                        required
                        value={item.unit_cost || ''}
                        onChange={(e) =>
                          updateItem(index, 'unit_cost', parseFloat(e.target.value))
                        }
                        className="w-full bg-slate-800 border border-slate-700 rounded-xl px-2.5 py-1.5 text-white focus:outline-none focus:border-emerald-500"
                      />
                    </div>

                    <div className="text-right">
                      <span className="block text-slate-400 mb-1">Line Total</span>
                      <div className="py-1.5 font-bold text-emerald-400 text-sm">
                        ₹{lineTotal.toFixed(2)}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Expenses & Notes Card */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-sm space-y-3 text-xs">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-400 mb-1 flex items-center gap-1">
                <Truck className="w-3.5 h-3.5 text-blue-400" /> Courier / Shipping Expense (₹)
              </label>
              <input
                type="number"
                min="0"
                placeholder="0"
                value={shippingExpenses || ''}
                onChange={(e) => setShippingExpenses(parseFloat(e.target.value) || 0)}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
              />
            </div>
            <div>
              <label className="block text-slate-400 mb-1">Notes / Remarks</label>
              <input
                type="text"
                placeholder="e.g. Received via Richie St courier"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          <div className="pt-2 border-t border-slate-800 flex justify-between items-center text-sm">
            <span className="text-slate-400 font-medium">Total Purchase Amount:</span>
            <span className="text-lg font-black text-emerald-400">₹{grandTotal.toFixed(2)}</span>
          </div>
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={submitting || items.length === 0}
          className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-400 hover:to-green-500 text-slate-950 font-bold text-sm shadow-lg shadow-emerald-500/25 active:scale-95 transition disabled:opacity-50"
        >
          {submitting ? 'Updating Inventory & Saving...' : 'Confirm Stock Receipt & Update Inventory'}
        </button>
      </form>
    </div>
  );
};
