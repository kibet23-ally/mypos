import jsPDF from 'jspdf';
import QRCode from 'qrcode';
import type { Invoice } from '@/types/invoice';
import { fmt, STATUS_LABELS, PAYMENT_METHOD_LABELS } from '@/types/invoice';
import { format } from 'date-fns';

interface PDFOptions {
  businessName: string;
  businessEmail?: string;
  businessPhone?: string;
  businessAddress?: string;
}

export async function generateInvoicePDF(invoice: Invoice, opts: PDFOptions): Promise<void> {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const pageW = 210;
  const pageH = 297;
  const ml = 15; // margin left
  const mr = pageW - 15; // margin right
  let y = 15;

  const primary = [37, 99, 235] as [number, number, number];   // blue-600
  const dark    = [15, 23, 42] as [number, number, number];    // slate-900
  const mid     = [71, 85, 105] as [number, number, number];   // slate-600
  const light   = [226, 232, 240] as [number, number, number]; // slate-200
  const green   = [22, 163, 74] as [number, number, number];   // green-600
  const red     = [220, 38, 38] as [number, number, number];   // red-600

  // ── HEADER BAND ──────────────────────────────────────────────
  doc.setFillColor(...primary);
  doc.rect(0, 0, pageW, 36, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(20);
  doc.setTextColor(255, 255, 255);
  doc.text('INVOICE', ml, 20);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text(invoice.invoice_number, ml, 28);

  // Status badge
  const statusLabel = STATUS_LABELS[invoice.status];
  doc.setFillColor(255, 255, 255);
  doc.roundedRect(mr - 40, 13, 36, 9, 2, 2, 'F');
  doc.setFontSize(8);
  doc.setTextColor(...primary);
  doc.setFont('helvetica', 'bold');
  doc.text(statusLabel.toUpperCase(), mr - 22, 19.5, { align: 'center' });

  y = 44;

  // ── BUSINESS & CUSTOMER COLUMNS ───────────────────────────────
  const col2 = 115;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(...dark);
  doc.text(opts.businessName, ml, y);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(...mid);
  doc.text('BILL TO', col2, y);

  y += 5;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(...mid);
  const bizLines = [
    opts.businessAddress, opts.businessEmail, opts.businessPhone
  ].filter(Boolean) as string[];
  bizLines.forEach(line => { doc.text(line, ml, y); y += 4.5; });

  let yBill = 49;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(...dark);
  doc.text(invoice.customer?.name ?? '—', col2, yBill);
  yBill += 5;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(...mid);
  [invoice.customer?.email, invoice.customer?.phone, invoice.customer?.address]
    .filter(Boolean)
    .forEach(line => { doc.text(line as string, col2, yBill); yBill += 4.5; });

  y = Math.max(y, yBill) + 6;

  // ── DATE ROW ─────────────────────────────────────────────────
  doc.setFillColor(248, 250, 252);
  doc.rect(ml, y, mr - ml, 12, 'F');
  doc.setDrawColor(...light);
  doc.rect(ml, y, mr - ml, 12);

  const dateFields = [
    { label: 'Issue Date', value: invoice.issued_at ? format(new Date(invoice.issued_at), 'dd MMM yyyy') : '—' },
    { label: 'Due Date', value: invoice.due_date ? format(new Date(invoice.due_date), 'dd MMM yyyy') : '—' },
    { label: 'Payment Terms', value: invoice.payment_terms ?? '—' },
  ];
  const colW = (mr - ml) / 3;
  dateFields.forEach((f, i) => {
    const cx = ml + i * colW + 4;
    doc.setFont('helvetica', 'bold'); doc.setFontSize(7); doc.setTextColor(...mid);
    doc.text(f.label.toUpperCase(), cx, y + 4.5);
    doc.setFont('helvetica', 'normal'); doc.setFontSize(8.5); doc.setTextColor(...dark);
    doc.text(f.value, cx, y + 9.5);
  });
  y += 18;

  // ── ITEMS TABLE ───────────────────────────────────────────────
  const colsW = { desc: 75, qty: 20, price: 30, disc: 20, total: 30 };
  const startX = ml;
  const headers = ['Description', 'Qty', 'Unit Price', 'Disc %', 'Total'];
  const colX = [startX, startX + colsW.desc, startX + colsW.desc + colsW.qty,
    startX + colsW.desc + colsW.qty + colsW.price,
    startX + colsW.desc + colsW.qty + colsW.price + colsW.disc];

  // header row
  doc.setFillColor(...primary);
  doc.rect(ml, y, mr - ml, 8, 'F');
  doc.setFont('helvetica', 'bold'); doc.setFontSize(8); doc.setTextColor(255, 255, 255);
  headers.forEach((h, i) => doc.text(h, colX[i] + 2, y + 5.5));
  y += 8;

  // item rows
  const items = invoice.items ?? [];
  items.forEach((item, idx) => {
    const rowH = 8;
    if (idx % 2 === 0) { doc.setFillColor(250, 251, 252); doc.rect(ml, y, mr - ml, rowH, 'F'); }
    doc.setFont('helvetica', 'normal'); doc.setFontSize(8); doc.setTextColor(...dark);
    const name = doc.splitTextToSize(item.name + (item.sku ? ` (${item.sku})` : ''), colsW.desc - 4);
    doc.text(name[0], colX[0] + 2, y + 5.5);
    doc.text(String(item.quantity), colX[1] + 2, y + 5.5);
    doc.text(fmt(item.unit_price), colX[2] + 2, y + 5.5);
    doc.text(`${item.discount_pct}%`, colX[3] + 2, y + 5.5);
    doc.setFont('helvetica', 'bold');
    doc.text(fmt(item.line_total), colX[4] + 2, y + 5.5);
    doc.setDrawColor(...light);
    doc.line(ml, y + rowH, mr, y + rowH);
    y += rowH;
    // page overflow guard
    if (y > pageH - 60) {
      doc.addPage();
      y = 20;
    }
  });

  y += 4;

  // ── TOTALS BLOCK ──────────────────────────────────────────────
  const tCol1 = mr - 80;
  const tCol2 = mr - 4;
  const row = (label: string, value: string, bold = false) => {
    doc.setFont('helvetica', bold ? 'bold' : 'normal');
    doc.setFontSize(9);
    doc.setTextColor(...(bold ? dark : mid));
    doc.text(label, tCol1, y, { align: 'left' });
    doc.text(value, tCol2, y, { align: 'right' });
    y += 6;
  };

  row('Subtotal', fmt(invoice.subtotal));
  if (invoice.discount_amount > 0) row('Discount', `- ${fmt(invoice.discount_amount)}`);
  row(`Tax (${(invoice.tax_rate * 100).toFixed(0)}%)`, fmt(invoice.tax_amount));

  doc.setDrawColor(...light);
  doc.line(tCol1, y, mr, y);
  y += 3;
  row('TOTAL', fmt(invoice.total), true);

  if (invoice.paid_amount > 0) {
    doc.setTextColor(...green);
    doc.setFont('helvetica', 'normal'); doc.setFontSize(9);
    doc.text('Amount Paid', tCol1, y);
    doc.text(`- ${fmt(invoice.paid_amount)}`, tCol2, y, { align: 'right' });
    y += 6;
  }

  if (invoice.balance_due > 0) {
    doc.setFillColor(254, 242, 242);
    doc.rect(tCol1 - 2, y - 4, mr - tCol1 + 6, 9, 'F');
    doc.setFont('helvetica', 'bold'); doc.setFontSize(10);
    doc.setTextColor(...red);
    doc.text('Balance Due', tCol1, y + 2);
    doc.text(fmt(invoice.balance_due), tCol2, y + 2, { align: 'right' });
    y += 12;
  }

  // ── PAYMENT HISTORY ───────────────────────────────────────────
  const payments = invoice.payments ?? [];
  if (payments.length > 0) {
    y += 4;
    doc.setFont('helvetica', 'bold'); doc.setFontSize(9); doc.setTextColor(...dark);
    doc.text('Payment History', ml, y); y += 5;
    payments.forEach(p => {
      doc.setFont('helvetica', 'normal'); doc.setFontSize(8); doc.setTextColor(...mid);
      const dt = format(new Date(p.paid_at), 'dd MMM yyyy');
      const meth = PAYMENT_METHOD_LABELS[p.method];
      doc.text(`${dt} — ${meth}${p.reference ? ` (${p.reference})` : ''}`, ml, y);
      doc.setFont('helvetica', 'bold'); doc.setTextColor(...green);
      doc.text(fmt(p.amount), mr, y, { align: 'right' });
      y += 5;
    });
  }

  // ── NOTES & TERMS ────────────────────────────────────────────
  y += 4;
  if (invoice.notes) {
    doc.setFont('helvetica', 'bold'); doc.setFontSize(8.5); doc.setTextColor(...dark);
    doc.text('Notes', ml, y); y += 5;
    doc.setFont('helvetica', 'normal'); doc.setFontSize(8); doc.setTextColor(...mid);
    const noteLines = doc.splitTextToSize(invoice.notes, mr - ml - 10);
    doc.text(noteLines, ml, y);
    y += noteLines.length * 4.5 + 4;
  }
  if (invoice.payment_terms) {
    doc.setFont('helvetica', 'bold'); doc.setFontSize(8.5); doc.setTextColor(...dark);
    doc.text('Terms & Conditions', ml, y); y += 5;
    doc.setFont('helvetica', 'normal'); doc.setFontSize(8); doc.setTextColor(...mid);
    const termLines = doc.splitTextToSize(invoice.payment_terms, mr - ml - 10);
    doc.text(termLines, ml, y);
    y += termLines.length * 4.5 + 4;
  }

  // ── QR CODE ───────────────────────────────────────────────────
  try {
    const qrData = JSON.stringify({
      inv: invoice.invoice_number,
      customer: invoice.customer?.name,
      total: invoice.total,
      balance: invoice.balance_due,
    });
    const qrDataUrl = await QRCode.toDataURL(qrData, { width: 80, margin: 1 });
    const qrY = pageH - 38;
    doc.addImage(qrDataUrl, 'PNG', mr - 24, qrY, 20, 20);
  } catch { /* QR optional */ }

  // ── FOOTER ────────────────────────────────────────────────────
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFillColor(248, 250, 252);
    doc.rect(0, pageH - 14, pageW, 14, 'F');
    doc.setFont('helvetica', 'normal'); doc.setFontSize(7.5); doc.setTextColor(...mid);
    doc.text(`${opts.businessName} — Generated by PosifyPro`, ml, pageH - 6);
    doc.text(`Page ${i} of ${totalPages}`, mr, pageH - 6, { align: 'right' });
  }

  doc.save(`${invoice.invoice_number}.pdf`);
}
