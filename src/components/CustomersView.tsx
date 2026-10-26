import React, { useState, useEffect, useMemo } from 'react';
import { apiFetch } from '@/lib/api';
import { Customer, Invoice, UserProfile, Shop } from '@/types';
import {
  Users,
  Search,
  Receipt,
  Phone,
  Clock,
  Share2,
  Download,
  AlertTriangle,
  X,
  CreditCard,
  Ban,
} from 'lucide-react';
import { formatWhatsAppInvoiceMessage, openWhatsAppChat } from '@/lib/whatsapp';
import { downloadInvoicePdf } from '@/lib/pdf';

interface CustomersViewProps {
  user: UserProfile;
  shop: Shop;
  onOpenInvoice: (invoice: Invoice) => void;
}

export const CustomersView: React.FC<CustomersViewProps> = ({
  user,
  shop,
  onOpenInvoice,
}) => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);

  // Cancellation Modal
  const [cancelModalInvoice, setCancelModalInvoice] = useState<Invoice | null>(null);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelling, setCancelling] = useState(false);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [custRes, invRes] = await Promise.all([
        apiFetch('/api/customers'),
        apiFetch('/api/invoices'),
      ]);
      const custData = await custRes.json();
      const invData = await invRes.json();
      if (custRes.ok) setCustomers(custData.customers || []);
      if (invRes.ok) setInvoices(invData.invoices || []);
    } catch (e) {
      console.error('Error fetching customers/invoices:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Filtered customers
  const filteredCustomers = useMemo(() => {
    const q = searchQuery.toLowerCase();
    return customers.filter(
      (c) => c.name.toLowerCase().includes(q) || c.phone.includes(q)
    );
  }, [customers, searchQuery]);

  // Selected customer invoices
  const customerInvoices = useMemo(() => {
    if (!selectedCustomer) return [];
    return invoices.filter(
      (inv) =>
        inv.customer_id === selectedCustomer.id ||
        (inv.customer_phone && inv.customer_phone.includes(selectedCustomer.phone))
    );
  }, [invoices, selectedCustomer]);

  // Handle Invoice Cancellation (Restocks items atomically)
  const handleCancelInvoice = async () => {
    if (!cancelModalInvoice) return;
    setCancelling(true);

    try {
      const res = await apiFetch(`/api/invoices/${cancelModalInvoice.id}/cancel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: user.id,
          reason: cancelReason || 'Customer requested bill cancellation',
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to cancel invoice');

      setCancelModalInvoice(null);
      setCancelReason('');
      fetchData();
    } catch (e: any) {
      alert(e.message || 'Error cancelling invoice');
    } finally {
      setCancelling(false);
    }
  };

  return (
    <div className="pb-28 max-w-7xl mx-auto px-3 py-3 space-y-3">
      {/* Title */}
      <div>
        <h2 className="text-base font-bold text-white flex items-center gap-1.5">
          <Users className="w-5 h-5 text-emerald-400" /> Customer Directory & History
        </h2>
        <p className="text-xs text-slate-400">Search customer profiles & purchase records</p>
      </div>

      {/* Search Input */}
      <div className="relative">
        <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
        <input
          type="text"
          placeholder="Search customer by name or 10-digit phone number..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full bg-slate-900 border border-slate-800 rounded-2xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 shadow-sm"
        />
      </div>

      {/* Customers List */}
      <div className="space-y-2">
        {filteredCustomers.map((cust) => (
          <div
            key={cust.id}
            onClick={() => setSelectedCustomer(cust)}
            className="bg-slate-900 border border-slate-800 rounded-2xl p-3.5 flex items-center justify-between gap-3 shadow-sm hover:border-slate-700 transition cursor-pointer"
          >
            <div className="min-w-0">
              <h3 className="text-xs font-bold text-white truncate">{cust.name}</h3>
              <div className="flex items-center gap-2 text-slate-400 text-[11px] mt-0.5">
                <span className="flex items-center gap-1">
                  <Phone className="w-3 h-3 text-emerald-400" /> +91 {cust.phone}
                </span>
                <span>• {cust.visit_count} visits</span>
              </div>
            </div>

            <div className="text-right shrink-0">
              <div className="text-xs font-extrabold text-white">
                ₹{cust.total_spent.toLocaleString('en-IN')}
              </div>
              {cust.outstanding_balance > 0 ? (
                <span className="text-[10px] font-bold text-amber-400">
                  Due: ₹{cust.outstanding_balance}
                </span>
              ) : (
                <span className="text-[10px] text-emerald-400">No dues</span>
              )}
            </div>
          </div>
        ))}

        {filteredCustomers.length === 0 && (
          <div className="text-center py-12 text-slate-400 text-xs">
            No customer records found.
          </div>
        )}
      </div>

      {/* Customer Purchase History Modal */}
      {selectedCustomer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/80 backdrop-blur-sm overflow-y-auto">
          <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-2xl my-auto space-y-4 max-h-[85vh] flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div>
                <h3 className="text-sm font-bold text-white">{selectedCustomer.name}</h3>
                <p className="text-xs text-slate-400">+91 {selectedCustomer.phone}</p>
              </div>
              <button
                onClick={() => setSelectedCustomer(null)}
                className="p-1 rounded-full text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Metrics */}
            <div className="grid grid-cols-3 gap-2 text-center text-xs">
              <div className="p-2 rounded-xl bg-slate-800">
                <span className="text-slate-400 block text-[10px]">Total Spent</span>
                <span className="font-bold text-white">₹{selectedCustomer.total_spent}</span>
              </div>
              <div className="p-2 rounded-xl bg-slate-800">
                <span className="text-slate-400 block text-[10px]">Visits</span>
                <span className="font-bold text-emerald-400">{selectedCustomer.visit_count}</span>
              </div>
              <div className="p-2 rounded-xl bg-slate-800">
                <span className="text-slate-400 block text-[10px]">Pending Due</span>
                <span className="font-bold text-amber-400">
                  ₹{selectedCustomer.outstanding_balance}
                </span>
              </div>
            </div>

            {/* Invoices List */}
            <div className="flex-1 overflow-y-auto space-y-2">
              <span className="text-xs font-semibold text-slate-300 block">
                Purchase Invoices ({customerInvoices.length})
              </span>

              {customerInvoices.map((inv) => (
                <div
                  key={inv.id}
                  className="p-3 rounded-2xl bg-slate-800/60 border border-slate-700/60 text-xs space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold text-white">#{inv.invoice_number}</span>
                      <span
                        className={`text-[10px] px-1.5 py-0.2 rounded font-bold ${
                          inv.status === 'CANCELLED'
                            ? 'bg-red-950 text-red-400 border border-red-800'
                            : 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                        }`}
                      >
                        {inv.status}
                      </span>
                    </div>
                    <span className="text-[10px] text-slate-400">
                      {new Date(inv.created_at).toLocaleDateString('en-IN')}
                    </span>
                  </div>

                  {/* Items summary */}
                  <div className="text-[11px] text-slate-300">
                    {inv.items.map((it) => `${it.quantity}x ${it.product_name}`).join(', ')}
                  </div>

                  <div className="flex items-center justify-between pt-1 border-t border-slate-700/60">
                    <span className="font-black text-sm text-emerald-400">
                      ₹{inv.total_amount} ({inv.payment_method})
                    </span>

                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => {
                          const message = formatWhatsAppInvoiceMessage(inv, shop);
                          openWhatsAppChat(selectedCustomer.phone, message);
                        }}
                        className="p-1.5 rounded-lg bg-emerald-600/20 text-emerald-400 hover:bg-emerald-500 hover:text-slate-950 transition"
                        title="Re-share on WhatsApp"
                      >
                        <Share2 className="w-3.5 h-3.5" />
                      </button>

                      <button
                        onClick={() => downloadInvoicePdf(inv, shop)}
                        className="p-1.5 rounded-lg bg-slate-700 text-slate-200 hover:text-white transition"
                        title="Download PDF"
                      >
                        <Download className="w-3.5 h-3.5" />
                      </button>

                      {/* Cancel Bill Button (Owner or authorized) */}
                      {inv.status !== 'CANCELLED' && (user.role === 'owner' || user.can_cancel_bills) && (
                        <button
                          onClick={() => setCancelModalInvoice(inv)}
                          className="p-1.5 rounded-lg bg-red-950 text-red-400 hover:bg-red-900 transition"
                          title="Cancel & Restock Bill"
                        >
                          <Ban className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}

              {customerInvoices.length === 0 && (
                <p className="text-center py-6 text-slate-400 text-xs">
                  No invoices recorded for this customer.
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Bill Cancellation Confirmation Modal */}
      {cancelModalInvoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="w-full max-w-sm bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-2xl space-y-4">
            <div className="flex items-center gap-2 text-red-400">
              <AlertTriangle className="w-6 h-6 shrink-0" />
              <h3 className="text-sm font-bold text-white">
                Cancel Invoice #{cancelModalInvoice.invoice_number}
              </h3>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              Cancelling will atomically restock all items back to current inventory and reverse the financial total. This action is permanently logged in the audit trail.
            </p>
            <input
              type="text"
              placeholder="Reason for cancellation (required)"
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-red-400"
            />
            <div className="flex gap-2">
              <button
                onClick={() => setCancelModalInvoice(null)}
                className="flex-1 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold hover:bg-slate-700"
              >
                Keep Bill
              </button>
              <button
                onClick={handleCancelInvoice}
                disabled={cancelling || !cancelReason.trim()}
                className="flex-1 py-2 rounded-xl bg-red-600 text-paper text-xs font-bold hover:bg-red-500 disabled:opacity-50"
              >
                {cancelling ? 'Restocking...' : 'Confirm Cancel'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
