import React, { useState } from 'react';
import { apiFetch } from '@/lib/api';
import { Product, UserProfile } from '@/types';
import {
  Scale,
  RotateCcw,
  AlertTriangle,
  CheckCircle,
  HelpCircle,
  ArrowRight,
} from 'lucide-react';

interface ReconciliationViewProps {
  products: Product[];
  user: UserProfile;
  onRefresh: () => void;
}

export const ReconciliationView: React.FC<ReconciliationViewProps> = ({
  products,
  user,
  onRefresh,
}) => {
  const [activeTab, setActiveTab] = useState<'audit' | 'return'>('audit');

  // Physical Audit state
  const [selectedProductId, setSelectedProductId] = useState<string>(products[0]?.id || '');
  const [physicalCount, setPhysicalCount] = useState<number>(products[0]?.current_quantity || 0);
  const [adjustmentReason, setAdjustmentReason] = useState<string>('');

  // Customer Return state
  const [returnProductId, setReturnProductId] = useState<string>(products[0]?.id || '');
  const [returnQty, setReturnQty] = useState<number>(1);
  const [refundAmount, setRefundAmount] = useState<number>(products[0]?.selling_price || 0);
  const [returnCondition, setReturnCondition] = useState<'SELLABLE' | 'DAMAGED'>('SELLABLE');
  const [returnReason, setReturnReason] = useState<string>('');

  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const selectedProd = products.find((p) => p.id === selectedProductId);
  const diff = selectedProd ? physicalCount - selectedProd.current_quantity : 0;

  const handleAuditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProd) return;
    setSubmitting(true);
    setMessage(null);

    try {
      const res = await apiFetch('/api/reconciliation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'adjust',
          product_id: selectedProductId,
          new_quantity: Number(physicalCount),
          reason: adjustmentReason || 'Physical Stock Count Reconciliation',
          user_id: user.id,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Adjustment failed');

      setMessage({ type: 'success', text: `Stock for "${selectedProd.name}" adjusted to ${physicalCount}!` });
      setAdjustmentReason('');
      onRefresh();
    } catch (e: any) {
      setMessage({ type: 'error', text: e.message || 'Error saving adjustment' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleReturnSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const prod = products.find((p) => p.id === returnProductId);
    if (!prod) return;
    setSubmitting(true);
    setMessage(null);

    try {
      const res = await apiFetch('/api/reconciliation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'return',
          product_id: returnProductId,
          quantity: Number(returnQty),
          refund_amount: Number(refundAmount),
          condition: returnCondition,
          reason: returnReason || 'Customer Return',
          user_id: user.id,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Return failed');

      setMessage({
        type: 'success',
        text: `Customer return recorded! ${
          returnCondition === 'SELLABLE'
            ? `Restocked +${returnQty} units to inventory.`
            : `Logged as damaged/scrapped inventory.`
        }`,
      });
      setReturnReason('');
      onRefresh();
    } catch (e: any) {
      setMessage({ type: 'error', text: e.message || 'Error processing return' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="pb-28 max-w-2xl mx-auto px-3 py-3 space-y-4">
      {/* Title */}
      <div>
        <h2 className="text-base font-bold text-white flex items-center gap-1.5">
          <Scale className="w-5 h-5 text-emerald-400" /> Stock Reconciliation & Returns
        </h2>
        <p className="text-xs text-slate-400">
          Physical audit counts, variance adjustments & customer returns
        </p>
      </div>

      {message && (
        <div
          className={`p-3 rounded-2xl border text-xs flex items-center gap-2 ${
            message.type === 'success'
              ? 'bg-emerald-950/40 border-emerald-800 text-emerald-300'
              : 'bg-red-950/40 border-red-800 text-red-300'
          }`}
        >
          {message.type === 'success' ? (
            <CheckCircle className="w-4 h-4 shrink-0 text-emerald-400" />
          ) : (
            <AlertTriangle className="w-4 h-4 shrink-0 text-red-400" />
          )}
          <span>{message.text}</span>
        </div>
      )}

      {/* Mode Tabs */}
      <div className="flex bg-slate-900 border border-slate-800 rounded-2xl p-1 text-xs">
        <button
          onClick={() => {
            setActiveTab('audit');
            setMessage(null);
          }}
          className={`flex-1 py-2 rounded-xl font-bold transition flex items-center justify-center gap-1.5 ${
            activeTab === 'audit'
              ? 'bg-emerald-500 text-slate-950 shadow'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Scale className="w-3.5 h-3.5" /> Physical Count Audit
        </button>
        <button
          onClick={() => {
            setActiveTab('return');
            setMessage(null);
          }}
          className={`flex-1 py-2 rounded-xl font-bold transition flex items-center justify-center gap-1.5 ${
            activeTab === 'return'
              ? 'bg-emerald-500 text-slate-950 shadow'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <RotateCcw className="w-3.5 h-3.5" /> Customer Return
        </button>
      </div>

      {/* Tab 1: Physical Count Audit */}
      {activeTab === 'audit' ? (
        <form onSubmit={handleAuditSubmit} className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-sm space-y-3 text-xs">
          <div>
            <label className="block text-slate-400 mb-1 font-medium">Select Product to Audit</label>
            <select
              value={selectedProductId}
              onChange={(e) => {
                setSelectedProductId(e.target.value);
                const p = products.find((prod) => prod.id === e.target.value);
                if (p) setPhysicalCount(p.current_quantity);
              }}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
            >
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.brand}) [System: {p.current_quantity}]
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3 p-3 rounded-xl bg-slate-800/40 border border-slate-700/60">
            <div>
              <span className="text-slate-400 block text-[11px]">System Quantity:</span>
              <span className="text-base font-bold text-white">{selectedProd?.current_quantity ?? 0}</span>
            </div>
            <div>
              <span className="text-slate-400 block text-[11px]">Variance / Discrepancy:</span>
              <span
                className={`text-base font-black ${
                  diff > 0 ? 'text-emerald-400' : diff < 0 ? 'text-red-400' : 'text-slate-400'
                }`}
              >
                {diff > 0 ? `+${diff}` : diff}
              </span>
            </div>
          </div>

          <div>
            <label className="block text-slate-400 mb-1 font-medium">Actual Physical Count</label>
            <input
              type="number"
              min="0"
              required
              value={physicalCount}
              onChange={(e) => setPhysicalCount(parseInt(e.target.value, 10) || 0)}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-emerald-500 font-bold"
            />
          </div>

          <div>
            <label className="block text-slate-400 mb-1 font-medium">Adjustment Reason (Audit Requirement)</label>
            <input
              type="text"
              required
              placeholder="e.g. Physical inventory count verified on shelf"
              value={adjustmentReason}
              onChange={(e) => setAdjustmentReason(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
            />
          </div>

          <button
            type="submit"
            disabled={submitting || diff === 0}
            className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-400 hover:to-green-500 text-slate-950 font-bold text-xs shadow-md shadow-emerald-500/20 active:scale-95 transition disabled:opacity-50"
          >
            {submitting ? 'Applying Adjustment...' : diff === 0 ? 'Stock Matches (No Change)' : `Apply Adjustment (${diff >= 0 ? `+${diff}` : diff})`}
          </button>
        </form>
      ) : (
        /* Tab 2: Customer Return */
        <form onSubmit={handleReturnSubmit} className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-sm space-y-3 text-xs">
          <div>
            <label className="block text-slate-400 mb-1 font-medium">Select Product Being Returned</label>
            <select
              value={returnProductId}
              onChange={(e) => {
                setReturnProductId(e.target.value);
                const p = products.find((prod) => prod.id === e.target.value);
                if (p) setRefundAmount(p.selling_price);
              }}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
            >
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} (₹{p.selling_price})
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-400 mb-1 font-medium">Return Qty</label>
              <input
                type="number"
                min="1"
                required
                value={returnQty}
                onChange={(e) => setReturnQty(parseInt(e.target.value, 10) || 1)}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
              />
            </div>
            <div>
              <label className="block text-slate-400 mb-1 font-medium">Refund Amount (₹)</label>
              <input
                type="number"
                min="0"
                required
                value={refundAmount}
                onChange={(e) => setRefundAmount(parseFloat(e.target.value) || 0)}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          {/* Condition: Sellable vs Damaged */}
          <div>
            <label className="block text-slate-400 mb-1 font-medium">Product Condition After Inspection</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setReturnCondition('SELLABLE')}
                className={`p-2.5 rounded-xl border text-left transition ${
                  returnCondition === 'SELLABLE'
                    ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400 font-bold'
                    : 'bg-slate-800/80 border-slate-700 text-slate-300'
                }`}
              >
                <div>Sellable (Restock)</div>
                <div className="text-[10px] text-slate-400 font-normal mt-0.5">
                  Adds back to live stock
                </div>
              </button>

              <button
                type="button"
                onClick={() => setReturnCondition('DAMAGED')}
                className={`p-2.5 rounded-xl border text-left transition ${
                  returnCondition === 'DAMAGED'
                    ? 'bg-red-500/20 border-red-500 text-red-400 font-bold'
                    : 'bg-slate-800/80 border-slate-700 text-slate-300'
                }`}
              >
                <div>Damaged / Defective</div>
                <div className="text-[10px] text-slate-400 font-normal mt-0.5">
                  Logged as scrap, not restocked
                </div>
              </button>
            </div>
          </div>

          <div>
            <label className="block text-slate-400 mb-1 font-medium">Customer Return Reason</label>
            <input
              type="text"
              required
              placeholder="e.g. Bought wrong phone model, customer requested swap"
              value={returnReason}
              onChange={(e) => setReturnReason(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
            />
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-400 hover:to-green-500 text-slate-950 font-bold text-xs shadow-md shadow-emerald-500/20 active:scale-95 transition disabled:opacity-50"
          >
            {submitting ? 'Recording Return...' : 'Confirm Return & Refund'}
          </button>
        </form>
      )}
    </div>
  );
};
