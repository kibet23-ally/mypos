import { useState, useRef } from 'react';
import * as XLSX from 'xlsx';
import { supabase } from '@/db/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';
import {
  Upload, Download, FileSpreadsheet, AlertTriangle, CheckCircle2,
  Loader2, ArrowLeft, X,
} from 'lucide-react';

interface InventoryImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onComplete: () => void;
}

interface ParsedRow {
  rowNumber: number;
  identifier: string; // SKU or barcode as typed
  newQuantity: number | null;
  reason: string;
  notes: string;
  errors: string[];
  matchedInventoryId?: string;
  matchedProductName?: string;
  currentQuantity?: number;
}

type Stage = 'upload' | 'preview' | 'importing' | 'summary';

const REQUIRED_HEADERS = ['SKU or Barcode', 'New Quantity'];

function normalizeHeader(h: string) {
  return h.toLowerCase().replace(/\*/g, '').trim();
}

export default function InventoryImportDialog({ open, onOpenChange, onComplete }: InventoryImportDialogProps) {
  const { appUser } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [stage, setStage] = useState<Stage>('upload');
  const [fileName, setFileName] = useState('');
  const [rows, setRows] = useState<ParsedRow[]>([]);
  const [parsing, setParsing] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [summary, setSummary] = useState({ updated: 0, skipped: 0, failed: 0 });

  const reset = () => {
    setStage('upload'); setFileName(''); setRows([]);
    setImportProgress(0); setSummary({ updated: 0, skipped: 0, failed: 0 });
  };

  const handleClose = (o: boolean) => { if (!o) reset(); onOpenChange(o); };

  const downloadTemplate = () => {
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet([
      ['SKU or Barcode*', 'New Quantity*', 'Reason', 'Notes'],
      ['ESP-001', 85, 'stocktake', 'Monthly count — July'],
      ['5901234123457', 32, 'stocktake', ''],
    ]);
    ws['!cols'] = [{ wch: 18 }, { wch: 14 }, { wch: 14 }, { wch: 28 }];
    XLSX.utils.book_append_sheet(wb, ws, 'Stock Count');
    XLSX.writeFile(wb, 'posifypro_inventory_import_template.xlsx');
  };

  const parseFile = async (file: File) => {
    setParsing(true);
    setFileName(file.name);
    try {
      const buf = await file.arrayBuffer();
      const wb = XLSX.read(buf, { type: 'array' });
      const sheet = wb.Sheets[wb.SheetNames[0]];
      const raw: Record<string, any>[] = XLSX.utils.sheet_to_json(sheet, { defval: '' });

      if (raw.length === 0) { toast.error('The file has no data rows'); setParsing(false); return; }

      const firstRowKeys = Object.keys(raw[0]);
      const headerMap: Record<string, string> = {};
      firstRowKeys.forEach(k => { headerMap[normalizeHeader(k)] = k; });

      const missing = REQUIRED_HEADERS.filter(h => !(normalizeHeader(h) in headerMap));
      if (missing.length > 0) {
        toast.error(`Missing required column${missing.length > 1 ? 's' : ''}: ${missing.join(', ')}`);
        setParsing(false);
        return;
      }

      if (raw.length > 5000) {
        toast.error(`File has ${raw.length.toLocaleString()} rows — please split into batches of 5,000 or fewer`);
        setParsing(false);
        return;
      }

      // Pull current inventory rows joined to products, so we can match by SKU/barcode
      const { data: invRows } = await supabase
        .from('inventory')
        .select('id, quantity_on_hand, products(name, sku, barcode)')
        .eq('tenant_id', appUser?.tenant_id);

      const matchable = (invRows ?? []) as unknown as Array<{
        id: string; quantity_on_hand: number;
        products?: { name?: string; sku?: string | null; barcode?: string | null };
      }>;

      const parsed: ParsedRow[] = raw.map((r, i) => {
        const get = (h: string) => String(r[headerMap[normalizeHeader(h)]] ?? '').trim();
        const identifier = get('SKU or Barcode');
        const qtyRaw = get('New Quantity');
        const reason = get('Reason') || 'stocktake';
        const notes = get('Notes');

        const newQuantity = qtyRaw === '' ? null : Number(qtyRaw);

        const errors: string[] = [];
        if (!identifier) errors.push('SKU or Barcode is required');
        if (newQuantity === null || Number.isNaN(newQuantity) || newQuantity < 0) {
          errors.push('New Quantity must be a valid non-negative number');
        }

        const match = matchable.find(m =>
          m.products?.sku === identifier || m.products?.barcode === identifier
        );
        if (!match) errors.push('No product found with this SKU/Barcode');

        return {
          rowNumber: i + 2,
          identifier, newQuantity, reason, notes,
          errors,
          matchedInventoryId: match?.id,
          matchedProductName: match?.products?.name,
          currentQuantity: match?.quantity_on_hand,
        };
      });

      setRows(parsed);
      setStage('preview');
    } catch (err) {
      console.error('[InventoryImport] Parse error:', err);
      toast.error("Could not read this file — make sure it's a valid .xlsx or .csv");
    } finally {
      setParsing(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) parseFile(file);
  };

  const removeRow = (rowNumber: number) => setRows(prev => prev.filter(r => r.rowNumber !== rowNumber));

  const runImport = async () => {
    if (!appUser?.tenant_id) return;
    setStage('importing');
    setImportProgress(0);

    const validRows = rows.filter(r => r.errors.length === 0);
    let updated = 0, failed = 0;
    const skipped = rows.length - validRows.length;

    for (let i = 0; i < validRows.length; i++) {
      const r = validRows[i];
      const changeQty = (r.newQuantity ?? 0) - (r.currentQuantity ?? 0);
      try {
        const { error: invErr } = await supabase
          .from('inventory')
          .update({ quantity_on_hand: r.newQuantity, updated_at: new Date().toISOString() })
          .eq('id', r.matchedInventoryId);
        if (invErr) throw invErr;

        await supabase.from('stock_movements').insert({
          tenant_id: appUser.tenant_id,
          change_qty: changeQty,
          reason: r.reason,
          notes: r.notes || `Bulk import — row ${r.rowNumber} (${r.matchedProductName ?? r.identifier})`,
          created_at: new Date().toISOString(),
        });
        updated++;
      } catch (err) {
        console.error('[InventoryImport] Row failed:', err);
        failed++;
      }
      setImportProgress(Math.round(((i + 1) / Math.max(validRows.length, 1)) * 100));
    }

    setSummary({ updated, skipped, failed });
    setStage('summary');
    onComplete();
  };

  const errorCount = rows.filter(r => r.errors.length > 0).length;
  const validCount = rows.filter(r => r.errors.length === 0).length;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-[calc(100%-1.5rem)] md:max-w-2xl border-border max-h-[85vh] overflow-y-auto" style={{ background: 'hsl(var(--card))' }}>
        <DialogHeader>
          <DialogTitle className="text-foreground flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5 text-primary" />
            Import Stock Count
          </DialogTitle>
        </DialogHeader>

        {stage === 'upload' && (
          <div className="space-y-4 mt-2">
            <button
              onClick={downloadTemplate}
              className="w-full flex items-center justify-center gap-2 h-10 rounded-xl border border-border bg-card text-sm font-medium text-foreground hover:bg-secondary transition-colors"
            >
              <Download className="w-4 h-4" /> Download Template (.xlsx)
            </button>

            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-border rounded-xl p-10 text-center cursor-pointer hover:border-primary hover:bg-accent/30 transition-colors"
            >
              {parsing ? (
                <Loader2 className="w-8 h-8 text-primary animate-spin mx-auto mb-3" />
              ) : (
                <Upload className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
              )}
              <p className="text-sm font-medium text-foreground">
                {parsing ? `Reading ${fileName}…` : 'Click to upload .xlsx or .csv'}
              </p>
              <p className="text-xs text-muted-foreground mt-1">Matches products by SKU or Barcode</p>
            </div>
            <input ref={fileInputRef} type="file" accept=".xlsx,.xls,.csv" onChange={handleFileSelect} className="hidden" />

            <div className="rounded-xl bg-card border border-border p-4">
              <p className="text-xs text-muted-foreground">
                Sets each matched product's stock to the <span className="font-semibold text-foreground">exact quantity</span> in your file (not an add/subtract) — same as a manual stocktake. A Stock Movement is logged for every change so it stays auditable.
              </p>
            </div>
          </div>
        )}

        {stage === 'preview' && (
          <div className="space-y-4 mt-2">
            <div className="grid grid-cols-2 gap-2">
              <div className="rounded-xl border border-primary bg-accent p-3 text-center">
                <p className="text-lg font-bold text-primary">{validCount}</p>
                <p className="text-xs text-primary">Will update</p>
              </div>
              <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-center">
                <p className="text-lg font-bold text-red-700">{errorCount}</p>
                <p className="text-xs text-red-600">Has errors</p>
              </div>
            </div>

            <div className="border border-border rounded-xl overflow-hidden">
              <div className="max-h-72 overflow-y-auto">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-card">
                    <tr className="border-b border-border">
                      {['Row', 'Product', 'Current', 'New Qty', 'Status', ''].map(h => (
                        <th key={h} className="px-3 py-2 text-left text-xs font-semibold text-muted-foreground whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map(r => (
                      <tr key={r.rowNumber} className={`border-b border-border ${r.errors.length > 0 ? 'bg-red-50/50' : ''}`}>
                        <td className="px-3 py-2 text-xs text-muted-foreground">{r.rowNumber}</td>
                        <td className="px-3 py-2 text-foreground whitespace-nowrap">{r.matchedProductName || <span className="text-red-500">{r.identifier || '—'}</span>}</td>
                        <td className="px-3 py-2 text-muted-foreground whitespace-nowrap">{r.currentQuantity ?? '—'}</td>
                        <td className="px-3 py-2 text-muted-foreground whitespace-nowrap">{r.newQuantity ?? <span className="text-red-500">—</span>}</td>
                        <td className="px-3 py-2 whitespace-nowrap">
                          {r.errors.length > 0 ? (
                            <span className="inline-flex items-center gap-1 text-xs text-red-600" title={r.errors.join('; ')}>
                              <AlertTriangle className="w-3.5 h-3.5" /> {r.errors[0]}
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-xs text-primary">
                              <CheckCircle2 className="w-3.5 h-3.5" /> Ready
                            </span>
                          )}
                        </td>
                        <td className="px-3 py-2">
                          <button onClick={() => removeRow(r.rowNumber)} className="text-muted-foreground hover:text-red-500">
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="flex gap-3">
              <button onClick={reset} className="h-10 px-4 rounded-xl border border-border text-sm font-medium text-muted-foreground hover:bg-card flex items-center gap-1.5">
                <ArrowLeft className="w-4 h-4" /> Back
              </button>
              <button
                onClick={runImport}
                disabled={validCount === 0}
                className="flex-1 h-10 rounded-xl text-sm font-semibold text-white disabled:opacity-50"
                style={{ background: 'hsl(var(--primary))' }}
              >
                Apply {validCount} Update{validCount === 1 ? '' : 's'}
              </button>
            </div>
          </div>
        )}

        {stage === 'importing' && (
          <div className="py-12 flex flex-col items-center gap-4">
            <Loader2 className="w-8 h-8 text-primary animate-spin" />
            <p className="text-sm text-muted-foreground">Updating inventory… {importProgress}%</p>
            <div className="w-full max-w-xs h-2 rounded-full bg-secondary overflow-hidden">
              <div className="h-full bg-primary transition-all duration-300" style={{ width: `${importProgress}%` }} />
            </div>
          </div>
        )}

        {stage === 'summary' && (
          <div className="space-y-4 mt-2">
            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-xl border border-primary bg-accent p-4 text-center">
                <p className="text-2xl font-bold text-primary">{summary.updated}</p>
                <p className="text-xs text-primary">Updated</p>
              </div>
              <div className="rounded-xl border border-border bg-card p-4 text-center">
                <p className="text-2xl font-bold text-foreground">{summary.skipped}</p>
                <p className="text-xs text-muted-foreground">Skipped</p>
              </div>
              <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-center">
                <p className="text-2xl font-bold text-red-700">{summary.failed}</p>
                <p className="text-xs text-red-600">Failed</p>
              </div>
            </div>
            <button onClick={() => handleClose(false)} className="w-full h-10 rounded-xl text-sm font-semibold text-white" style={{ background: 'hsl(var(--primary))' }}>
              Done
            </button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
