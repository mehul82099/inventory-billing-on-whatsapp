import { Invoice, Shop } from '@/types';

export function formatWhatsAppInvoiceMessage(invoice: Invoice, shop: Shop): string {
  const lineItemsText = invoice.items
    .map(
      (item, idx) =>
        `${idx + 1}. *${item.product_name}*\n   Qty: ${item.quantity} × ₹${item.unit_price} = *₹${item.line_total}*`
    )
    .join('\n');

  const gstBreakdown =
    invoice.is_tax_invoice && invoice.tax_amount > 0
      ? `\n📊 *GST (${shop.default_gst_rate}%):* ₹${invoice.tax_amount.toFixed(2)}`
      : '';

  const discountText =
    invoice.discount_amount > 0 ? `\n🏷️ *Discount:* -₹${invoice.discount_amount.toFixed(2)}` : '';

  const paymentStatusEmoji = invoice.payment_status === 'PAID' ? '✅' : '⏳';

  const upiInfo =
    shop.upi_id && invoice.payment_status !== 'PAID'
      ? `\n💳 *Pay via UPI:* ${shop.upi_id}\n(Google Pay / PhonePe / Paytm)`
      : '';

  const message = `🧾 *INVOICE FROM ${shop.name.toUpperCase()}*
----------------------------------------
📍 ${shop.address}, ${shop.city}
📞 Ph: ${shop.phone}${shop.gstin ? ` | GSTIN: ${shop.gstin}` : ''}
----------------------------------------
🆔 *Invoice No:* ${invoice.invoice_number}
📅 *Date:* ${new Date(invoice.created_at).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })}
👤 *Customer:* ${invoice.customer_name}${invoice.customer_phone ? ` (${invoice.customer_phone})` : ''}
👨‍💼 *Billed By:* ${invoice.user_name}
----------------------------------------
📦 *ITEMS PURCHASED:*
${lineItemsText}
----------------------------------------
💰 *Subtotal:* ₹${invoice.subtotal_amount.toFixed(2)}${discountText}${gstBreakdown}
*GRAND TOTAL:* *₹${invoice.total_amount.toFixed(2)}*
${paymentStatusEmoji} *Payment:* ${invoice.payment_method} (${invoice.payment_status})
${upiInfo}
----------------------------------------
🙏 *${shop.terms_and_conditions || 'Thank you for shopping with us!'}*`;

  return message;
}

export function openWhatsAppChat(phone: string, text: string): void {
  // Clean phone number (add 91 country code for Indian 10-digit mobile)
  let cleanPhone = phone.replace(/\D/g, '');
  if (cleanPhone.length === 10) {
    cleanPhone = '91' + cleanPhone;
  }
  const encodedText = encodeURIComponent(text);
  const url = cleanPhone ? `https://wa.me/${cleanPhone}?text=${encodedText}` : `https://wa.me/?text=${encodedText}`;
  window.open(url, '_blank');
}

export async function shareFileNative(file: File, title: string, text: string): Promise<boolean> {
  if (typeof navigator !== 'undefined' && navigator.canShare && navigator.canShare({ files: [file] })) {
    try {
      await navigator.share({
        files: [file],
        title,
        text,
      });
      return true;
    } catch (e) {
      if ((e as Error).name !== 'AbortError') {
        console.warn('Native share failed:', e);
      }
      return false;
    }
  }
  return false;
}
