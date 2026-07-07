import { supabase } from '../db/supabase';

export interface Tenant {
  tax_rate: number;
  // other fields
}

/**
 * Fetch latest tax rate from tenant settings
 */
export const getTaxRate = async (tenantId?: string): Promise<number> => {
  if (!tenantId) return 16; // safe default, but should never hit

  const { data, error } = await supabase
    .from('tenants')
    .select('tax_rate')
    .eq('id', tenantId)
    .single();

  if (error || !data) {
    console.warn('[Tax] Failed to fetch tax rate, using default', error);
    return 16;
  }

  console.log(`[Tax] Loaded tax rate from DB: ${data.tax_rate}%`);
  return data.tax_rate;
};

/**
 * Calculate tax and total
 */
export const calculateTax = (subtotal: number, taxRate: number) => {
  const taxAmount = subtotal * (taxRate / 100);
  const total = subtotal + taxAmount;
  return { taxAmount, total, taxRate };
};