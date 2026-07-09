import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { formatCurrency } from '../lib/currency';

export interface SaleItem {
  name: string;
  quantity: number;
  price: number;
}

export interface ReceiptData {
  id: string;
  items: SaleItem[];
  subtotal: number;
  taxRate: number; // from tenant.tax_rate
  taxAmount: number;
  total: number;
  businessName: string;
  cashierName: string;
  date: string;
}

export const generateReceipt = (data: ReceiptData) => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();

  // Header
  doc.setFontSize(18);
  doc.text(data.businessName || 'PosifyPro', pageWidth / 2, 20, { align: 'center' });

  doc.setFontSize(10);
  doc.text(`Receipt #: ${data.id}`, 20, 35);
  doc.text(`Date: ${data.date}`, 20, 45);
  doc.text(`Cashier: ${data.cashierName}`, 20, 55);

  // Items Table
  autoTable(doc, {
    startY: 65,
    head: [['Item', 'Qty', 'Rate', 'Amount']],
    body: data.items.map(item => [
      item.name,
      item.quantity.toString(),
      formatCurrency(item.price),
      formatCurrency(item.quantity * item.price)
    ]),
    styles: { fontSize: 9 },
    headStyles: { fillColor: [101, 94, 243] }
  });

  const finalY = (doc as any).lastAutoTable.finalY + 10;

  // Calculations using tenant tax_rate
  const subtotal = data.subtotal;
  const taxRate = data.taxRate; // e.g. 16 from DB
  const taxAmount = subtotal * (taxRate / 100);
  const total = subtotal + taxAmount;

  console.log(`[Receipt] Using tax rate from DB: ${taxRate}%`);

  doc.setFontSize(11);
  doc.text(`Subtotal: ${formatCurrency(subtotal)}`, 20, finalY);
  doc.text(`Tax (${taxRate}%): ${formatCurrency(taxAmount)}`, 20, finalY + 10);
  doc.setFont('helvetica', 'bold');
  doc.text(`Total: ${formatCurrency(total)}`, 20, finalY + 20);
  doc.setFont('helvetica', 'normal');

  doc.text('Thank you for your business!', pageWidth / 2, finalY + 40, { align: 'center' });

  // Save PDF
  doc.save(`receipt-${data.id}.pdf`);
};