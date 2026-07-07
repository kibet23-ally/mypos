<<<<<<< HEAD

            import { createClient } from "@supabase/supabase-js";

            const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
            const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

            export const supabase = createClient(supabaseUrl, supabaseAnonKey);
            
=======
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

// ── Environment variable guard ────────────────────────────────────────────
// If either variable is missing the app cannot function. Throwing here gives
// a clear error in the ErrorBoundary instead of a silent blank page.
if (!supabaseUrl || supabaseUrl.trim() === '') {
  throw new Error(
    '[PosifyPro] Missing VITE_SUPABASE_URL environment variable. ' +
    'Add it in your Vercel project settings under Settings → Environment Variables.'
  );
}
if (!supabaseAnonKey || supabaseAnonKey.trim() === '') {
  throw new Error(
    '[PosifyPro] Missing VITE_SUPABASE_ANON_KEY environment variable. ' +
    'Add it in your Vercel project settings under Settings → Environment Variables.'
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
console.log('[PosifyPro] Supabase initialized →', supabaseUrl.replace(/https?:\/\//, '').split('.')[0] + '.supabase.co');
>>>>>>> b72e8c4 (feat: dynamic multi-currency support, edge function fixes)
