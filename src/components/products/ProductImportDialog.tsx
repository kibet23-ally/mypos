import { useState, useRef } from 'react';
import * as XLSX from 'xlsx';
import { supabase } from '@/db/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import {
  Upload, Download, FileSpreadsheet, AlertTriangle, CheckCircle2,
  Loader2, ArrowLeft, X,
} from 'lucide-react';

interface ProductImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onComplete: () => void;
}

interface ParsedRow {
  rowNumber: number;
  name: string;
  category: string;
  price: number | null;
  stock: number | null;
  sku: string;
  barcode: string;
  buying_cost: number | null;
  unit: string;
  errors: string[];
  action: 'add' | 'update' | 'skip';
  matchedProductId?: string;
}

type Stage = 'upload' | 'preview' | 'importing' | 'summary';

const REQUIRED_HEADERS = ['Product Name', 'Category', 'Selling Price', 'Stock'];
const BATCH_SIZE = 200; // chunk size for bulk insert/update to stay well under request limits at 5,000+ rows

function normalizeHeader(h: string) {
  return h.toLowerCase().replace(/\*/g, '').trim();
}

function genSku(name: string, index: number) {
  const base = name.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6) || 'PROD';
  return `${base}-${Date.now().toString(36).toUpperCase().slice(-4)}${index}`;
}

export default function ProductImportDialog({ open, onOpenChange, onComplete }: ProductImportDialogProps) {
  const { appUser } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [stage, setStage] = useState<Stage>('upload');
  const [fileName, setFileName] = useState('');
  const [rows, setRows] = useState<ParsedRow[]>([]);
  const [parsing, setParsing] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [summary, setSummary] = useState({ added: 0, updated: 0, skipped: 0, failed: 0 });

  const reset = () => {
    setStage('upload');
    setFileName('');
    setRows([]);
    setImportProgress(0);
    setSummary({ added: 0, updated: 0, skipped: 0, failed: 0 });
  };

  const handleClose = (o: boolean) => {
    if (!o) reset();
    onOpenChange(o);
  };

  const downloadTemplate = () => {
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet([
      ['Product Name*', 'Category*', 'Selling Price*', 'Stock*', 'SKU', 'Barcode', 'Cost Price', 'Unit'],
      ['Espresso', 'Beverages', 350, 100, 'ESP-001', '', 120, 'pc'],
      ['Croissant', 'Bakery', 250, 40, '', '5901234123457', 90, 'pc'],
      ['Cooking Oil 1L', 'Groceries', 450, 60, 'OIL-001', '', 320, 'ltr'],
    ]);
    ws['!cols'] = [{ wch: 22 }, { wch: 16 }, { wch: 14 }, { wch: 10 }, { wch: 14 }, { wch: 18 }, { wch: 12 }, { wch: 8 }];
    XLSX.utils.book_append_sheet(wb, ws, 'Products');
    XLSX.writeFile(wb, 'posifypro_product_import_template.xlsx');
  };

  const parseFile = async (file: File) => {
    setParsing(true);
    setFileName(file.name);
    try {
      const buf = await file.arrayBuffer();
      const wb = XLSX.read(buf, { type: 'array' });
      const sheet = wb.Sheets[wb.SheetNames[0]];
      const raw: Record<string, any>[] = XLSX.utils.sheet_to_json(sheet, { defval: '' });

      if (raw.length === 0) {
        toast.error('The file has no data rows');
        setParsing(false);
        return;
      }

      // Map headers flexibly (case/asterisk-insensitive)
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

      // Fetch existing products once, for dedup matching
      const { data: existing } = await supabase
        .from('products')
        .select('id, name, sku, barcode')
        .eq('tenant_id', appUser?.tenant_id);
      const existingProducts = existing ?? [];

      const seenInFile = new Set<string>(); // tracks sku/barcode/name already claimed within this file

      const parsed: ParsedRow[] = raw.map((r, i) => {
        const get = (h: string) => String(r[headerMap[normalizeHeader(h)]] ?? '').trim();
        const name = get('Product Name');
        const category = get('Category');
        const priceRaw = get('Selling Price');
        const stockRaw = get('Stock');
        const sku = get('SKU');
        const barcode = get('Barcode');
        const costRaw = get('Cost Price');
        const unit = get('Unit') || 'pc';

        const price = priceRaw === '' ? null : Number(priceRaw);
        const stock = stockRaw === '' ? null : Number(stockRaw);
        const buying_cost = costRaw === '' ? null : Number(costRaw);

        const errors: string[] = [];
        if (!name) errors.push('Product Name is required');
        if (!category) errors.push('Category is required');
        if (price === null || Number.isNaN(price) || price < 0) errors.push('Selling Price must be a valid number');
        if (stock === null || Number.isNaN(stock) || stock < 0) errors.push('Stock must be a valid whole number');
        if (buying_cost === null || Number.isNaN(buying_cost) || buying_cost <= 0) errors.push('Cost Price is required and must be > 0');

        // Duplicate detection: barcode > sku > exact name, against existing DB rows
        let action: ParsedRow['action'] = 'add';
        let matchedProductId: string | undefined;
        if (barcode && existingProducts.some(p => p.barcode === barcode)) {
          action = 'update';
          matchedProductId = existingProducts.find(p => p.barcode === barcode)?.id;
        } else if (sku && existingProducts.some(p => p.sku === sku)) {
          action = 'update';
          matchedProductId = existingProducts.find(p => p.sku === sku)?.id;
        } else if (name && existingProducts.some(p => p.name.toLowerCase() === name.toLowerCase())) {
          action = 'update';
          matchedProductId = existingProducts.find(p => p.name.toLowerCase() === name.toLowerCase())?.id;
        }

        // Duplicate within the same file (two rows claiming the same SKU/barcode/name) — skip the later one
        const dedupKey = (barcode || sku || name).toLowerCase();
        if (dedupKey && seenInFile.has(dedupKey)) {
          errors.push('Duplicate row within this file');
        } else if (dedupKey) {
          seenInFile.add(dedupKey);
        }

        return {
          rowNumber: i + 2,
          name, category,
          price: price ?? null,
          stock: stock ?? null,
          sku: sku || genSku(name || 'PRODUCT', i),
          barcode, buying_cost, unit,
          errors,
          action: errors.length > 0 ? 'skip' : action,
          matchedProductId,
        };
      });

      setRows(parsed);
      setStage('preview');
    } catch (err) {
      console.error('[ProductImport] Parse error:', err);
      toast.error("Could not read this file — make sure it's a valid .xlsx or .csv");
    } finally {
      setParsing(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) parseFile(file);
  };

  const removeRow = (rowNumber: number) => {
    setRows(prev => prev.filter(r => r.rowNumber !== rowNumber));
  };

  const runImport = async () => {
    if (!appUser?.tenant_id) return;
    setStage('importing');
    setImportProgress(0);

    const validRows = rows.filter(r => r.errors.length === 0);
    const toAdd = validRows.filter(r => r.action === 'add');
    const toUpdate = validRows.filter(r => r.action === 'update');
    const skipped = rows.length - toAdd.length - toUpdate.length;

    let added = 0, updated = 0, failed = 0;

    // Batch inserts in chunks to stay efficient at 5,000+ rows
    for (let i = 0; i < toAdd.length; i += BATCH_SIZE) {
      const chunk = toAdd.slice(i, i + BATCH_SIZE).map(r => ({
        tenant_id: appUser.tenant_id,
        name: r.name,
        sku: r.sku,
        barcode: r.barcode || null,
        category: r.category,
        price: r.price,
        buying_cost: r.buying_cost,
        stock: r.stock,
        unit: r.unit,
      }));
      const { error } = await supabase.from('products').insert(chunk);
      if (error) {
        console.error('[ProductImport] Insert batch failed:', error);
        failed += chunk.length;
      } else {
        added += chunk.length;
      }
      setImportProgress(Math.round(((i + chunk.length) / Math.max(validRows.length, 1)) * 100));
    }

    // Updates run one at a time (each targets a different existing row by id) — still chunked for progress feedback
    for (let i = 0; i < toUpdate.length; i += BATCH_SIZE) {
      const chunk = toUpdate.slice(i, i + BATCH_SIZE);
      const results = await Promise.all(chunk.map(r =>
        supabase.from('products').update({
          name: r.name,
          category: r.category,
          price: r.price,
          buying_cost: r.buying_cost,
          stock: r.stock,
          unit: r.unit,
          ...(r.barcode ? { barcode: r.barcode } : {}),
        }).eq('id', r.matchedProductId)
      ));
      results.forEach(res => { if (res.error) failed++; else updated++; });
      setImportProgress(Math.round(((toAdd.length + i + chunk.length) / Math.max(validRows.length, 1)) * 100));
    }

    setSummary({ added, updated, skipped, failed });
    setStage('summary');
    onComplete();
  };

  const errorCount = rows.filter(r => r.errors.length > 0).length;
  const addCount = rows.filter(r => r.action === 'add' && r.errors.length === 0).length;
  const updateCount = rows.filter(r => r.action === 'update' && r.errors.length === 0).length;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-[calc(100%-1.5rem)] md:max-w-3xl border-slate-200 max-h-[85vh] overflow-y-auto" style={{ background: '#ffffff' }}>
        <DialogHeader>
          <DialogTitle className="text-slate-900 flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5 text-blue-500" />
            Import Products
          </DialogTitle>
        </DialogHeader>

        {/* Stage: Upload */}
        {stage === 'upload' && (
          <div className="space-y-4 mt-2">
            <button
              onClick={downloadTemplate}
              className="w-full flex items-center justify-center gap-2 h-10 rounded-xl border border-slate-200 bg-slate-50 text-sm font-medium text-slate-700 hover:bg-slate-100 transition-colors"
            >
              <Download className="w-4 h-4" /> Download Template (.xlsx)
            </button>

            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-slate-200 rounded-xl p-10 text-center cursor-pointer hover:border-blue-300 hover:bg-blue-50/30 transition-colors"
            >
              {parsing ? (
                <Loader2 className="w-8 h-8 text-blue-500 animate-spin mx-auto mb-3" />
              ) : (
                <Upload className="w-8 h-8 text-slate-400 mx-auto mb-3" />
              )}
              <p className="text-sm font-medium text-slate-700">
                {parsing ? `Reading ${fileName}…` : 'Click to upload .xlsx or .csv'}
              </p>
              <p className="text-xs text-slate-400 mt-1">Up to 5,000 products per file</p>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls,.csv"
              onChange={handleFileSelect}
              className="hidden"
            />

            <div className="rounded-xl bg-slate-50 border border-slate-200 p-4">
              <p className="text-xs font-semibold text-slate-600 mb-2">Required columns</p>
              <div className="flex flex-wrap gap-1.5">
                {REQUIRED_HEADERS.map(h => (
                  <Badge key={h} className="text-xs bg-blue-50 border border-blue-200 text-blue-700">{h}</Badge>
                ))}
              </div>
              <p className="text-xs text-slate-400 mt-2">SKU is auto-generated if left blank. Rows matching an existing Barcode, SKU, or Product Name will update that product instead of duplicating it.</p>
            </div>
          </div>
        )}

        {/* Stage: Preview */}
        {stage === 'preview' && (
          <div className="space-y-4 mt-2">
            <div className="grid grid-cols-3 gap-2">
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-center">
                <p className="text-lg font-bold text-emerald-700">{addCount}</p>
                <p className="text-xs text-emerald-600">New products</p>
              </div>
              <div className="rounded-xl border border-blue-200 bg-blue-50 p-3 text-center">
                <p className="text-lg font-bold text-blue-700">{updateCount}</p>
                <p className="text-xs text-blue-600">Will update</p>
              </div>
              <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-center">
                <p className="text-lg font-bold text-red-700">{errorCount}</p>
                <p className="text-xs text-red-600">Has errors</p>
              </div>
            </div>

            <div className="border border-slate-200 rounded-xl overflow-hidden">
              <div className="max-h-80 overflow-y-auto">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-slate-50">
                    <tr className="border-b border-slate-200">
                      {['Row', 'Name', 'Category', 'Price', 'Stock', 'Status', ''].map(h => (
                        <th key={h} className="px-3 py-2 text-left text-xs font-semibold text-slate-500 whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map(r => (
                      <tr key={r.rowNumber} className={`border-b border-slate-100 ${r.errors.length > 0 ? 'bg-red-50/50' : ''}`}>
                        <td className="px-3 py-2 text-xs text-slate-400">{r.rowNumber}</td>
                        <td className="px-3 py-2 text-slate-900 whitespace-nowrap">{r.name || <span className="text-red-500">—</span>}</td>
                        <td className="px-3 py-2 text-slate-600 whitespace-nowrap">{r.category || <span className="text-red-500">—</span>}</td>
                        <td className="px-3 py-2 text-slate-600 whitespace-nowrap">{r.price ?? <span className="text-red-500">—</span>}</td>
                        <td className="px-3 py-2 text-slate-600 whitespace-nowrap">{r.stock ?? <span className="text-red-500">—</span>}</td>
                        <td className="px-3 py-2 whitespace-nowrap">
                          {r.errors.length > 0 ? (
                            <span className="inline-flex items-center gap-1 text-xs text-red-600" title={r.errors.join('; ')}>
                              <AlertTriangle className="w-3.5 h-3.5" /> {r.errors[0]}
                            </span>
                          ) : r.action === 'update' ? (
                            <span className="inline-flex items-center gap-1 text-xs text-blue-600">
                              <CheckCircle2 className="w-3.5 h-3.5" /> Update existing
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-xs text-emerald-600">
                              <CheckCircle2 className="w-3.5 h-3.5" /> New
                            </span>
                          )}
                        </td>
                        <td className="px-3 py-2">
                          <button onClick={() => removeRow(r.rowNumber)} className="text-slate-400 hover:text-red-500">
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {errorCount > 0 && (
              <p className="text-xs text-slate-500">
                Rows with errors will be skipped automatically — fix them in your spreadsheet and re-upload, or remove them with the X above.
              </p>
            )}

            <div className="flex gap-3">
              <button
                onClick={reset}
                className="h-10 px-4 rounded-xl border border-slate-200 text-sm font-medium text-slate-600 hover:bg-slate-50 flex items-center gap-1.5"
              >
                <ArrowLeft className="w-4 h-4" /> Back
              </button>
              <button
                onClick={runImport}
                disabled={addCount + updateCount === 0}
                className="flex-1 h-10 rounded-xl text-sm font-semibold text-white disabled:opacity-50"
                style={{ background: '#2563EB' }}
              >
                Import {addCount + updateCount} Product{addCount + updateCount === 1 ? '' : 's'}
              </button>
            </div>
          </div>
        )}

        {/* Stage: Importing */}
        {stage === 'importing' && (
          <div className="py-12 flex flex-col items-center gap-4">
            <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
            <p className="text-sm text-slate-600">Importing products… {importProgress}%</p>
            <div className="w-full max-w-xs h-2 rounded-full bg-slate-100 overflow-hidden">
              <div className="h-full bg-blue-500 transition-all duration-300" style={{ width: `${importProgress}%` }} />
            </div>
          </div>
        )}

        {/* Stage: Summary */}
        {stage === 'summary' && (
          <div className="space-y-4 mt-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-center">
                <p className="text-2xl font-bold text-emerald-700">{summary.added}</p>
                <p className="text-xs text-emerald-600">Added</p>
              </div>
              <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 text-center">
                <p className="text-2xl font-bold text-blue-700">{summary.updated}</p>
                <p className="text-xs text-blue-600">Updated</p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-center">
                <p className="text-2xl font-bold text-slate-700">{summary.skipped}</p>
                <p className="text-xs text-slate-500">Skipped</p>
              </div>
              <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-center">
                <p className="text-2xl font-bold text-red-700">{summary.failed}</p>
                <p className="text-xs text-red-600">Failed</p>
              </div>
            </div>
            <button
              onClick={() => handleClose(false)}
              className="w-full h-10 rounded-xl text-sm font-semibold text-white"
              style={{ background: '#2563EB' }}
            >
              Done
            </button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
