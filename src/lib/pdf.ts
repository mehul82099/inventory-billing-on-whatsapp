import jsPDF from 'jspdf';
import { Invoice, Shop } from '@/types';

export function generateInvoicePdf(invoice: Invoice, shop: Shop): jsPDF {
  // A4 dimensions: 210 x 297 mm
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = 210;
  const margin = 15;
  const contentWidth = pageWidth - margin * 2;

  // Header Background Accent
  doc.setFillColor(16, 185, 129); // Emerald 500
  doc.rect(0, 0, pageWidth, 8, 'F');

  // Shop Header
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(20);
  doc.setTextColor(15, 23, 42); // Slate 900
  doc.text(shop.name.toUpperCase(), margin, 22);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(100, 116, 139); // Slate 500
  if (shop.tagline) {
    doc.text(shop.tagline, margin, 27);
  }
  doc.text(`${shop.address}, ${shop.city}, ${shop.state} - ${shop.pincode || ''}`, margin, 32);
  doc.text(`Phone: +91 ${shop.phone}  |  Email: ${shop.email || 'N/A'}`, margin, 36);
  if (shop.gstin) {
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(15, 23, 42);
    doc.text(`GSTIN: ${shop.gstin}`, margin, 40);
  }

  // Invoice Meta Box (Right Side)
  const metaX = 135;
  doc.setFillColor(248, 250, 252); // Slate 50
  doc.setDrawColor(226, 232, 240); // Slate 200
  doc.roundedRect(metaX, 15, 60, 28, 2, 2, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(16, 185, 129);
  doc.text(invoice.is_tax_invoice ? 'TAX INVOICE' : 'RETAIL RECEIPT', metaX + 5, 21);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(71, 85, 105);
  doc.text(`Invoice No: ${invoice.invoice_number}`, metaX + 5, 27);
  doc.text(`Date: ${new Date(invoice.created_at).toLocaleDateString('en-IN')}`, metaX + 5, 32);
  doc.text(`Cashier: ${invoice.user_name}`, metaX + 5, 37);

  // Divider
  doc.setDrawColor(203, 213, 225);
  doc.setLineWidth(0.4);
  doc.line(margin, 46, pageWidth - margin, 46);

  // Billed To Section
  let y = 52;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(100, 116, 139);
  doc.text('BILLED TO:', margin, y);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(15, 23, 42);
  doc.text(invoice.customer_name || 'Walk-in Customer', margin, y + 5);

  if (invoice.customer_phone) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(71, 85, 105);
    doc.text(`Phone: +91 ${invoice.customer_phone}`, margin, y + 10);
  }

  // Payment Status Badge
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  if (invoice.payment_status === 'PAID') {
    doc.setTextColor(16, 185, 129);
    doc.text(`Payment: ${invoice.payment_method} [PAID]`, metaX, y + 5);
  } else {
    doc.setTextColor(239, 68, 68);
    doc.text(`Payment: ${invoice.payment_method} [${invoice.payment_status}]`, metaX, y + 5);
  }

  // Items Table Header
  y = 70;
  doc.setFillColor(241, 245, 249);
  doc.rect(margin, y, contentWidth, 8, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(51, 65, 85);
  doc.text('#', margin + 3, y + 5.5);
  doc.text('ITEM DESCRIPTION', margin + 12, y + 5.5);
  doc.text('BRAND', margin + 95, y + 5.5);
  doc.text('QTY', margin + 125, y + 5.5);
  doc.text('RATE (₹)', margin + 145, y + 5.5);
  doc.text('TOTAL (₹)', margin + 165, y + 5.5);

  // Items Table Rows
  y += 8;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(30, 41, 59);

  invoice.items.forEach((item, index) => {
    // Alternating background
    if (index % 2 === 1) {
      doc.setFillColor(248, 250, 252);
      doc.rect(margin, y, contentWidth, 7, 'F');
    }

    doc.text(`${index + 1}`, margin + 3, y + 5);
    doc.text(item.product_name.slice(0, 42), margin + 12, y + 5);
    doc.text((item.brand || '-').slice(0, 15), margin + 95, y + 5);
    doc.text(`${item.quantity}`, margin + 127, y + 5);
    doc.text(`${item.unit_price.toFixed(2)}`, margin + 145, y + 5);
    doc.text(`${item.line_total.toFixed(2)}`, margin + 165, y + 5);

    y += 7;
  });

  // Table bottom border
  doc.setDrawColor(226, 232, 240);
  doc.line(margin, y + 1, pageWidth - margin, y + 1);

  // Totals Section (Right side)
  y += 6;
  const totX = 130;
  doc.setFontSize(8.5);
  doc.setTextColor(71, 85, 105);

  doc.text('Subtotal:', totX, y);
  doc.text(`₹ ${invoice.subtotal_amount.toFixed(2)}`, 180, y, { align: 'right' });

  if (invoice.discount_amount > 0) {
    y += 5;
    doc.setTextColor(220, 38, 38);
    doc.text('Discount:', totX, y);
    doc.text(`- ₹ ${invoice.discount_amount.toFixed(2)}`, 180, y, { align: 'right' });
  }

  if (invoice.is_tax_invoice && invoice.tax_amount > 0) {
    const halfTax = (invoice.tax_amount / 2).toFixed(2);
    y += 5;
    doc.setTextColor(71, 85, 105);
    doc.text(`CGST (${((shop.default_gst_rate || 18) / 2).toFixed(1)}%):`, totX, y);
    doc.text(`₹ ${halfTax}`, 180, y, { align: 'right' });

    y += 5;
    doc.text(`SGST (${((shop.default_gst_rate || 18) / 2).toFixed(1)}%):`, totX, y);
    doc.text(`₹ ${halfTax}`, 180, y, { align: 'right' });
  }

  // Grand Total Box
  y += 7;
  doc.setFillColor(236, 253, 245);
  doc.setDrawColor(16, 185, 129);
  doc.roundedRect(totX - 5, y - 4, 60, 10, 1.5, 1.5, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.setTextColor(6, 78, 59);
  doc.text('GRAND TOTAL:', totX, y + 2.5);
  doc.text(`₹ ${invoice.total_amount.toFixed(2)}`, 180, y + 2.5, { align: 'right' });

  // UPI QR / Payment instructions on left
  const qrY = y - 10;
  if (shop.upi_id) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(30, 41, 59);
    doc.text('PAYMENT DETAILS:', margin, qrY);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(71, 85, 105);
    doc.text(`UPI ID: ${shop.upi_id}`, margin, qrY + 5);
    doc.text('Scan & pay using GPay, PhonePe or Paytm', margin, qrY + 9);
  }

  // Terms and Footer
  const footerY = 270;
  doc.setDrawColor(226, 232, 240);
  doc.line(margin, footerY, pageWidth - margin, footerY);

  doc.setFont('helvetica', 'italic');
  doc.setFontSize(7.5);
  doc.setTextColor(148, 163, 184);
  doc.text(shop.terms_and_conditions || 'Goods once sold cannot be returned.', margin, footerY + 5);
  doc.text('This is a computer generated invoice and requires no physical signature.', margin, footerY + 9);

  return doc;
}

export function downloadInvoicePdf(invoice: Invoice, shop: Shop): void {
  const doc = generateInvoicePdf(invoice, shop);
  doc.save(`${invoice.invoice_number}.pdf`);
}

export function getInvoicePdfBlob(invoice: Invoice, shop: Shop): Blob {
  const doc = generateInvoicePdf(invoice, shop);
  return doc.output('blob');
}
