import React, { useState, useEffect } from 'react';
import { UserProfile, Shop, Invoice, Product } from '@/types';
import {
  TrendingUp,
  Receipt,
  Package,
  AlertTriangle,
  QrCode,
  Banknote,
  Users,
  Share2,
  Calendar,
  DollarSign,
  Layers,
  ArrowRight,
  PlusCircle,
  Clock,
  Sparkles,
} from 'lucide-react';
import { formatWhatsAppInvoiceMessage, openWhatsAppChat } from '@/lib/whatsapp';

interface DashboardViewProps {
  user: UserProfile;
  shop: Shop;
  onNavigateToBilling: () => void;
  onNavigateToStockIn: () => void;
  onNavigateToInventory: () => void;
  onOpenInvoice: (invoice: Invoice) => void;
  onOpenAiBilling: () => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  user,
  shop,
  onNavigateToBilling,
  onNavigateToStockIn,
  onNavigateToInventory,
  onOpenInvoice,
  onOpenAiBilling,
}) => {
  const [metrics, setMetrics] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [selectedDateFilter, setSelectedDateFilter] = useState<'today' | 'yesterday'>('today');

  const fetchMetrics = async () => {
    try {
      setLoading(true);
      const targetDate =
        selectedDateFilter === 'yesterday'
          ? new Date(Date.now() - 86400000).toISOString()
          : new Date().toISOString();

      const res = await fetch(`/api/dashboard?date=${targetDate}`);
      const data = await res.json();
      if (res.ok) {
        setMetrics(data.metrics);
      }
    } catch (err) {
      console.error('Error fetching dashboard metrics:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMetrics();
  }, [selectedDateFilter]);

  if (loading && !metrics) {
    return (
      <div className="flex items-center justify-center min-h-[50vh] text-slate-400">
        <div className="text-center space-y-2">
          <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs">Loading shop performance...</p>
        </div>
      </div>
    );
  }

  const m = metrics || {
    salesToday: 0,
    billsCount: 0,
    cashCollected: 0,
    upiCollected: 0,
    cardCollected: 0,
    totalDiscount: 0,
    totalUnitsSold: 0,
    totalGrossProfit: 0,
    stockReceivedToday: 0,
    lowStockCount: 0,
    outOfStockCount: 0,
    inventoryCostValuation: 0,
    inventoryRetailValuation: 0,
    outstandingBalances: 0,
    lowStockProducts: [],
    employeeSales: [],
    recentInvoices: [],
  };

  return (
    <div className="pb-28 max-w-7xl mx-auto px-3 py-3 space-y-4">
      {/* Date Filter & Quick Actions */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex bg-slate-900 border border-slate-800 rounded-xl p-1 text-xs">
          <button
            onClick={() => setSelectedDateFilter('today')}
            className={`px-3 py-1.5 rounded-lg font-semibold transition ${
              selectedDateFilter === 'today'
                ? 'bg-emerald-500 text-slate-950 shadow'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Today
          </button>
          <button
            onClick={() => setSelectedDateFilter('yesterday')}
            className={`px-3 py-1.5 rounded-lg font-semibold transition ${
              selectedDateFilter === 'yesterday'
                ? 'bg-emerald-500 text-slate-950 shadow'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Yesterday
          </button>
        </div>

        <button
          onClick={onOpenAiBilling}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-violet-600/30 hover:bg-violet-600/40 text-violet-300 border border-violet-500/40 text-xs font-semibold shadow-sm transition active:scale-95"
        >
          <Sparkles className="w-3.5 h-3.5 text-amber-300" />
          <span>AI Bill Generator</span>
        </button>
      </div>

      {/* Main KPI Cards Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5">
        {/* Sales Revenue */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3.5 shadow-sm space-y-1">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>Sales Revenue</span>
            <TrendingUp className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-xl font-black text-white">
            ₹{m.salesToday.toLocaleString('en-IN')}
          </div>
          <div className="text-[11px] text-emerald-400 font-medium">
            {m.billsCount} bills generated
          </div>
        </div>

        {/* Units Sold */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3.5 shadow-sm space-y-1">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>Units Sold</span>
            <Package className="w-4 h-4 text-blue-400" />
          </div>
          <div className="text-xl font-black text-white">{m.totalUnitsSold}</div>
          <div className="text-[11px] text-slate-400">Accessories & parts</div>
        </div>

        {/* Gross Profit (Owner Only) */}
        {user.role === 'owner' ? (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3.5 shadow-sm space-y-1">
            <div className="flex items-center justify-between text-slate-400 text-xs">
              <span>Gross Profit</span>
              <DollarSign className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="text-xl font-black text-emerald-400">
              ₹{m.totalGrossProfit.toLocaleString('en-IN')}
            </div>
            <div className="text-[11px] text-slate-400">Based on purchase costs</div>
          </div>
        ) : (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3.5 shadow-sm space-y-1">
            <div className="flex items-center justify-between text-slate-400 text-xs">
              <span>Stock Received</span>
              <Package className="w-4 h-4 text-purple-400" />
            </div>
            <div className="text-xl font-black text-white">{m.stockReceivedToday}</div>
            <div className="text-[11px] text-slate-400">Items received today</div>
          </div>
        )}

        {/* Low Stock Alerts */}
        <div
          onClick={onNavigateToInventory}
          className="bg-slate-900 border border-slate-800 rounded-2xl p-3.5 shadow-sm space-y-1 cursor-pointer hover:border-amber-500/50 transition"
        >
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>Stock Alerts</span>
            <AlertTriangle className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-xl font-black text-amber-400">
            {m.lowStockCount + m.outOfStockCount}
          </div>
          <div className="text-[11px] text-slate-400">
            {m.outOfStockCount > 0 ? `${m.outOfStockCount} out of stock` : 'Tap to review'}
          </div>
        </div>
      </div>

      {/* Payment Collections Breakdown */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-sm space-y-3">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
          Payment Breakdown
        </h3>
        <div className="grid grid-cols-3 gap-2">
          <div className="p-2.5 rounded-xl bg-slate-800/60 border border-slate-700/60">
            <div className="flex items-center gap-1.5 text-xs text-slate-400 mb-1">
              <QrCode className="w-3.5 h-3.5 text-blue-400" /> UPI / QR
            </div>
            <div className="text-base font-bold text-white">
              ₹{m.upiCollected.toLocaleString('en-IN')}
            </div>
          </div>

          <div className="p-2.5 rounded-xl bg-slate-800/60 border border-slate-700/60">
            <div className="flex items-center gap-1.5 text-xs text-slate-400 mb-1">
              <Banknote className="w-3.5 h-3.5 text-emerald-400" /> Cash
            </div>
            <div className="text-base font-bold text-white">
              ₹{m.cashCollected.toLocaleString('en-IN')}
            </div>
          </div>

          <div className="p-2.5 rounded-xl bg-slate-800/60 border border-slate-700/60">
            <div className="flex items-center gap-1.5 text-xs text-slate-400 mb-1">
              <Users className="w-3.5 h-3.5 text-amber-400" /> Credit Dues
            </div>
            <div className="text-base font-bold text-amber-300">
              ₹{m.outstandingBalances.toLocaleString('en-IN')}
            </div>
          </div>
        </div>
      </div>

      {/* Owner-Only: Inventory Valuation Card */}
      {user.role === 'owner' && (
        <div className="bg-gradient-to-r from-slate-900 to-slate-950 border border-slate-800 rounded-2xl p-4 shadow-sm space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <Layers className="w-4 h-4 text-emerald-400" /> Total Shop Inventory Valuation
            </h3>
            <span className="text-[10px] text-slate-500">Live Cost vs Retail</span>
          </div>

          <div className="grid grid-cols-2 gap-3 pt-1">
            <div className="p-3 rounded-xl bg-slate-800/40 border border-slate-700/40">
              <span className="text-[11px] text-slate-400 block">Inventory at Cost Value</span>
              <span className="text-lg font-black text-white">
                ₹{m.inventoryCostValuation.toLocaleString('en-IN')}
              </span>
            </div>
            <div className="p-3 rounded-xl bg-slate-800/40 border border-slate-700/40">
              <span className="text-[11px] text-slate-400 block">Potential Retail Value</span>
              <span className="text-lg font-black text-emerald-400">
                ₹{m.inventoryRetailValuation.toLocaleString('en-IN')}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Low Stock Urgent Items Banner */}
      {m.lowStockProducts.length > 0 && (
        <div className="bg-amber-950/30 border border-amber-800/60 rounded-2xl p-3.5 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
              <AlertTriangle className="w-4 h-4" /> Low Stock Warning ({m.lowStockProducts.length} items)
            </span>
            <button
              onClick={onNavigateToStockIn}
              className="text-xs font-semibold text-amber-400 hover:underline flex items-center gap-0.5"
            >
              Order / Restock <ArrowRight className="w-3 h-3" />
            </button>
          </div>
          <div className="grid grid-cols-2 gap-2 pt-1">
            {m.lowStockProducts.map((p: Product) => (
              <div
                key={p.id}
                className="p-2 rounded-xl bg-slate-900/80 border border-amber-900/40 text-xs flex justify-between items-center"
              >
                <span className="truncate pr-1 text-slate-200">{p.name}</span>
                <span className="font-bold text-amber-400 shrink-0">
                  {p.current_quantity} left
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Employee-wise Sales Table (Owner View) */}
      {user.role === 'owner' && m.employeeSales.length > 0 && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-sm space-y-2.5">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
            <Users className="w-4 h-4 text-blue-400" /> Employee Sales Performance
          </h3>
          <div className="divide-y divide-slate-800">
            {m.employeeSales.map((emp: any, idx: number) => (
              <div key={idx} className="py-2 flex items-center justify-between text-xs">
                <div>
                  <div className="font-semibold text-slate-200">{emp.name}</div>
                  <div className="text-[10px] text-slate-400">{emp.billsCount} bills today</div>
                </div>
                <div className="font-bold text-emerald-400">
                  ₹{emp.revenue.toLocaleString('en-IN')}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent Invoices Feed */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
            <Receipt className="w-4 h-4 text-emerald-400" /> Recent Sales
          </h3>
          <button
            onClick={onNavigateToBilling}
            className="text-xs font-bold text-emerald-400 hover:underline flex items-center gap-1"
          >
            <PlusCircle className="w-3.5 h-3.5" /> + New Bill
          </button>
        </div>

        <div className="divide-y divide-slate-800/80">
          {m.recentInvoices.map((inv: Invoice) => (
            <div
              key={inv.id}
              className="py-2.5 flex items-center justify-between gap-2 hover:bg-slate-800/40 rounded-xl px-1 transition"
            >
              <div
                onClick={() => onOpenInvoice(inv)}
                className="min-w-0 cursor-pointer flex-1"
              >
                <div className="flex items-center gap-2">
                  <span className="font-bold text-xs text-white">#{inv.invoice_number}</span>
                  <span
                    className={`text-[10px] px-1.5 py-0.2 rounded font-bold ${
                      inv.status === 'CANCELLED'
                        ? 'bg-red-950 text-red-400 border border-red-800'
                        : 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                    }`}
                  >
                    {inv.payment_method}
                  </span>
                </div>
                <div className="text-[11px] text-slate-400 truncate">
                  {inv.customer_name} • {inv.items.length} items • {inv.user_name.split(' ')[0]}
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <span className="font-black text-sm text-emerald-400">
                  ₹{inv.total_amount}
                </span>
                <button
                  onClick={() => {
                    const message = formatWhatsAppInvoiceMessage(inv, shop);
                    openWhatsAppChat(inv.customer_phone || '', message);
                  }}
                  className="p-1.5 rounded-lg bg-emerald-600/20 text-emerald-400 hover:bg-emerald-500 hover:text-slate-950 transition active:scale-95"
                  title="Share on WhatsApp"
                >
                  <Share2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}

          {m.recentInvoices.length === 0 && (
            <div className="py-6 text-center text-xs text-slate-400">
              No bills recorded today yet.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
