import React, { useState } from 'react';
import { Invoice, Shop } from '@/types';
import {
  X,
  Share2,
  Download,
  Printer,
  CheckCircle2,
  Copy,
  ExternalLink,
} from 'lucide-react';
import { formatWhatsAppInvoiceMessage, openWhatsAppChat, shareFileNative } from '@/lib/whatsapp';
import { downloadInvoicePdf, getInvoicePdfBlob } from '@/lib/pdf';

interface InvoiceModalProps {
  invoice: Invoice;
  shop: Shop;
  onClose: () => void;
}

export const InvoiceModal: React.FC<InvoiceModalProps> = ({
  invoice,
  shop,
  onClose,
}) => {
  const [copied, setCopied] = useState(false);
  const [sharing, setSharing] = useState(false);

  const handleWhatsAppShare = async () => {
    setSharing(true);
    const message = formatWhatsAppInvoiceMessage(invoice, shop);

    // Try Web Share API with PDF first (if Android Chrome supports it)
    try {
      const pdfBlob = getInvoicePdfBlob(invoice, shop);
      const pdfFile = new File([pdfBlob], `${invoice.invoice_number}.pdf`, {
        type: 'application/pdf',
      });
      const shared = await shareFileNative(pdfFile, `Invoice ${invoice.invoice_number}`, message);
      if (shared) {
        setSharing(false);
        return;
      }
    } catch (e) {
      // Fallback to direct WhatsApp chat URL
    }

    // Direct WhatsApp web deep link
    openWhatsAppChat(invoice.customer_phone || '', message);
    setSharing(false);
  };

  const handleCopyText = () => {
    const message = formatWhatsAppInvoiceMessage(invoice, shop);
    navigator.clipboard.writeText(message);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadPdf = () => {
    downloadInvoicePdf(invoice, shop);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/75 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden my-auto">
        {/* Header Bar */}
        <div className="flex items-center justify-between p-4 border-b border-slate-800 bg-slate-950/40">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-400" />
            <h2 className="text-base font-bold text-white">Invoice #{invoice.invoice_number}</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Printable & Visible Receipt Card */}
        <div id="printable-receipt" className="p-5 text-slate-900 bg-white max-h-[60vh] overflow-y-auto">
          {/* Shop Header */}
          <div className="text-center pb-3 border-b border-dashed border-slate-300">
            <h3 className="text-lg font-black tracking-tight uppercase text-slate-900">{shop.name}</h3>
            {shop.tagline && <p className="text-xs text-slate-500">{shop.tagline}</p>}
            <p className="text-xs text-slate-600 mt-1">{shop.address}, {shop.city}</p>
            <p className="text-xs font-semibold text-slate-700">Ph: +91 {shop.phone} {shop.gstin ? `| GSTIN: ${shop.gstin}` : ''}</p>
          </div>

          {/* Bill Meta */}
          <div className="py-2.5 border-b border-dashed border-slate-300 text-xs text-slate-700 flex justify-between items-start">
            <div>
              <p><span className="font-semibold">Bill No:</span> {invoice.invoice_number}</p>
              <p><span className="font-semibold">Customer:</span> {invoice.customer_name}</p>
              {invoice.customer_phone && <p><span className="font-semibold">Phone:</span> +91 {invoice.customer_phone}</p>}
            </div>
            <div className="text-right">
              <p>{new Date(invoice.created_at).toLocaleDateString('en-IN')}</p>
              <p className="text-slate-500">{new Date(invoice.created_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</p>
              <p className="text-[11px] text-slate-500">Billed by: {invoice.user_name}</p>
            </div>
          </div>

          {/* Line Items Table */}
          <div className="py-3 border-b border-dashed border-slate-300">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-slate-600">
                  <th className="text-left pb-1 font-semibold">Item</th>
                  <th className="text-center pb-1 font-semibold">Qty</th>
                  <th className="text-right pb-1 font-semibold">Rate</th>
                  <th className="text-right pb-1 font-semibold">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {invoice.items.map((item, i) => (
                  <tr key={i} className="py-1">
                    <td className="py-1.5 pr-2 font-medium text-slate-800">
                      {item.product_name}
                      {item.brand && <span className="block text-[10px] text-slate-400">{item.brand}</span>}
                    </td>
                    <td className="py-1.5 text-center text-slate-700">{item.quantity}</td>
                    <td className="py-1.5 text-right text-slate-700">₹{item.unit_price}</td>
                    <td className="py-1.5 text-right font-semibold text-slate-900">₹{item.line_total}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Totals Summary */}
          <div className="py-2.5 text-xs text-slate-700 space-y-1">
            <div className="flex justify-between">
              <span>Subtotal:</span>
              <span className="font-medium">₹{invoice.subtotal_amount.toFixed(2)}</span>
            </div>
            {invoice.discount_amount > 0 && (
              <div className="flex justify-between text-red-600">
                <span>Discount:</span>
                <span>- ₹{invoice.discount_amount.toFixed(2)}</span>
              </div>
            )}
            {invoice.is_tax_invoice && invoice.tax_amount > 0 && (
              <div className="flex justify-between text-slate-500 text-[11px]">
                <span>GST ({shop.default_gst_rate}%):</span>
                <span>₹{invoice.tax_amount.toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between text-base font-extrabold text-slate-950 pt-1 border-t border-slate-200">
              <span>GRAND TOTAL:</span>
              <span className="text-emerald-700">₹{invoice.total_amount.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-[11px] text-slate-500 pt-1">
              <span>Payment Mode:</span>
              <span className="font-bold text-slate-800">{invoice.payment_method} ({invoice.payment_status})</span>
            </div>
          </div>

          {/* Footer Note */}
          <div className="text-center pt-3 border-t border-dashed border-slate-300 text-[11px] text-slate-500">
            <p>{shop.terms_and_conditions || 'Thank you for shopping with us!'}</p>
            {shop.upi_id && (
              <p className="mt-1 font-semibold text-emerald-800">Pay via UPI: {shop.upi_id}</p>
            )}
          </div>
        </div>

        {/* Action Buttons Bar */}
        <div className="p-4 bg-slate-950 border-t border-slate-800 flex flex-col gap-2.5 no-print">
          {/* Primary Action: WhatsApp Share */}
          <button
            onClick={handleWhatsAppShare}
            disabled={sharing}
            className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-400 hover:to-green-500 text-slate-950 font-bold text-sm shadow-lg shadow-emerald-500/25 transition active:scale-95"
          >
            <Share2 className="w-4 h-4" />
            <span>Share Invoice on WhatsApp</span>
          </button>

          {/* Secondary Actions Row */}
          <div className="grid grid-cols-3 gap-2">
            <button
              onClick={handleDownloadPdf}
              className="flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition active:scale-95"
            >
              <Download className="w-3.5 h-3.5 text-blue-400" />
              <span>PDF</span>
            </button>

            <button
              onClick={handlePrint}
              className="flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition active:scale-95"
            >
              <Printer className="w-3.5 h-3.5 text-purple-400" />
              <span>Print</span>
            </button>

            <button
              onClick={handleCopyText}
              className="flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition active:scale-95"
            >
              <Copy className="w-3.5 h-3.5 text-amber-400" />
              <span>{copied ? 'Copied!' : 'Copy'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
