import jsPDF from 'jspdf';

export interface ReceiptItem {
  name: string;
  qty: number;
  price: number;
}

export interface ReceiptData {
  transactionId: string;
  businessName: string;
  cashierName: string;
  items: ReceiptItem[];
  subtotal: number;
  tax: number;
  total: number;
  paymentMethod: string;
  timestamp: Date;
  /** Optional discount applied to the sale */
  discount?: number;
  /** Cash handed over by the customer */
  cashTendered?: number;
  /** Change returned to the customer */
  changeDue?: number;
}

function fmt(n: number) {
  return n.toFixed(2);
}

const CURRENCY = 'KSh';
const TAX_RATE_LABEL = '16% VAT'; // Kenya standard VAT

export function generateReceiptPDF(data: ReceiptData): jsPDF {
  const doc = new jsPDF({ unit: 'mm', format: [80, 200], orientation: 'portrait' });
  const W = 80;
  let y = 8;

  const center = (text: string, size = 9) => {
    doc.setFontSize(size);
    const w = (doc.getStringUnitWidth(text) * size) / doc.internal.scaleFactor;
    doc.text(text, (W - w) / 2, y);
  };

  const line = () => {
    y += 2;
    doc.setDrawColor(180, 180, 180);
    doc.line(4, y, W - 4, y);
    y += 3;
  };

  // Header
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  center(data.businessName || 'PosifyPro', 13);
  y += 6;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  center('OFFICIAL RECEIPT', 8);
  y += 5;

  line();

  // Meta
  doc.setFontSize(8);
  doc.setTextColor(71, 85, 105);
  const dateStr = data.timestamp.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  const timeStr = data.timestamp.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  doc.text(`Date: ${dateStr}  ${timeStr}`, 5, y);
  y += 4;
  doc.text(`Transaction: ${data.transactionId}`, 5, y);
  y += 4;
  doc.text(`Cashier: ${data.cashierName || 'Staff'}`, 5, y);
  y += 4;
  doc.text(`Payment: ${data.paymentMethod.toUpperCase()}`, 5, y);
  y += 2;

  line();

  // Items header
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(15, 23, 42);
  doc.text('Item', 5, y);
  doc.text('Qty', 44, y, { align: 'center' });
  doc.text('Price', W - 5, y, { align: 'right' });
  y += 2;

  line();

  // Items
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(51, 65, 85);
  for (const item of data.items) {
    const itemTotal = item.qty * item.price;
    // Truncate long names
    const name = item.name.length > 22 ? item.name.slice(0, 21) + '…' : item.name;
    doc.text(name, 5, y);
    doc.text(String(item.qty), 44, y, { align: 'center' });
    doc.text(`KSh ${fmt(itemTotal)}`, W - 5, y, { align: 'right' });
    y += 5;
  }

  line();

  // Totals
  doc.setFontSize(8);
  doc.setTextColor(71, 85, 105);
  doc.text('Subtotal', 5, y);
  doc.text(`KSh ${fmt(data.subtotal)}`, W - 5, y, { align: 'right' });
  y += 5;
  doc.text('Tax (16% VAT)', 5, y);
  doc.text(`KSh ${fmt(data.tax)}`, W - 5, y, { align: 'right' });
  y += 3;

  line();

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(15, 23, 42);
  doc.text('TOTAL', 5, y);
  doc.text(`KSh ${fmt(data.total)}`, W - 5, y, { align: 'right' });
  y += 8;

  // Footer
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(148, 163, 184);
  center('Thank you for your purchase!', 7.5);
  y += 4;
  center('Powered by PosifyPro', 7);

  // Trim to content
  doc.internal.pageSize.height = y + 6;

  return doc;
}

export function downloadReceipt(data: ReceiptData) {
  const doc = generateReceiptPDF(data);
  doc.save(`receipt-${data.transactionId}.pdf`);
}

export function printReceipt(data: ReceiptData) {
  const doc = generateReceiptPDF(data);
  const blob = doc.output('blob');
  const url = URL.createObjectURL(blob);
  const win = window.open(url, '_blank');
  if (win) {
    win.addEventListener('load', () => {
      win.print();
    });
  }
}
