/**
 * /debug — Environment & Supabase connectivity diagnostic page.
 * Remove or restrict to superadmin once the production issue is resolved.
 */
import { useEffect, useState } from 'react';
import { supabase } from '@/db/supabase';

interface Check {
  label: string;
  status: 'ok' | 'fail' | 'warn' | 'loading';
  detail: string;
}

export default function DebugPage() {
  const [checks, setChecks] = useState<Check[]>([
    { label: 'VITE_SUPABASE_URL', status: 'loading', detail: '' },
    { label: 'VITE_SUPABASE_ANON_KEY', status: 'loading', detail: '' },
    { label: 'Supabase reachable', status: 'loading', detail: '' },
    { label: 'auth.users accessible', status: 'loading', detail: '' },
    { label: 'Demo: owner_demo exists', status: 'loading', detail: '' },
    { label: 'Demo: cashier_demo exists', status: 'loading', detail: '' },
  ]);

  const update = (index: number, patch: Partial<Check>) =>
    setChecks(prev => prev.map((c, i) => (i === index ? { ...c, ...patch } : c)));

  useEffect(() => {
    const run = async () => {
      const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
      const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

      // 1. URL check
      if (url && url !== 'undefined' && url.startsWith('https://')) {
        update(0, { status: 'ok', detail: url });
      } else {
        update(0, { status: 'fail', detail: url ? `Bad value: "${url}"` : 'Missing — not set in Vercel dashboard' });
      }

      // 2. Anon key check (only show prefix)
      if (key && key !== 'undefined' && key.startsWith('eyJ')) {
        update(1, { status: 'ok', detail: `${key.slice(0, 20)}… (valid JWT format)` });
      } else {
        update(1, { status: 'fail', detail: key ? `Bad value — does not look like a JWT` : 'Missing — not set in Vercel dashboard' });
      }

      // 3. Supabase health check
      try {
        const res = await fetch(`${url}/rest/v1/`, {
          headers: { apikey: key ?? '', Authorization: `Bearer ${key ?? ''}` },
        });
        update(2, {
          status: res.ok ? 'ok' : 'fail',
          detail: `HTTP ${res.status} from ${url}/rest/v1/`,
        });
      } catch (e) {
        update(2, { status: 'fail', detail: `Network error: ${(e as Error).message}` });
      }

      // 4. Profiles table accessible
      try {
        const { error } = await supabase.from('profiles').select('id').limit(1);
        update(3, {
          status: error ? 'warn' : 'ok',
          detail: error ? `${error.code}: ${error.message}` : 'profiles table reachable',
        });
      } catch (e) {
        update(3, { status: 'fail', detail: (e as Error).message });
      }

      // 5 & 6. Demo account sign-in test
      for (const [idx, { user, pw }] of [
        [4, { user: 'owner_demo', pw: 'Pos@Owner#2026!Xk' }],
        [5, { user: 'cashier_demo', pw: 'Pos@Cashier#2026!Zr' }],
      ] as [number, { user: string; pw: string }][]) {
        try {
          const email = `${user}@posifypro.miaoda.com`;
          const { data, error } = await supabase.auth.signInWithPassword({ email, password: pw });
          if (error) {
            update(idx, { status: 'fail', detail: `${error.status ?? ''} ${error.message}` });
          } else {
            update(idx, { status: 'ok', detail: `Signed in as ${data.user?.email} ✓` });
            await supabase.auth.signOut();
          }
        } catch (e) {
          update(idx, { status: 'fail', detail: (e as Error).message });
        }
      }
    };

    run();
  }, []);

  const badge = (s: Check['status']) => {
    const map: Record<Check['status'], string> = {
      ok: 'bg-green-100 text-green-800',
      fail: 'bg-red-100 text-red-800',
      warn: 'bg-yellow-100 text-yellow-800',
      loading: 'bg-gray-100 text-gray-500',
    };
    return map[s];
  };

  const allDone = checks.every(c => c.status !== 'loading');
  const allOk = checks.every(c => c.status === 'ok');

  return (
    <div className="min-h-screen p-8" style={{ background: 'hsl(var(--background))' }}>
      <div className="max-w-2xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold" style={{ color: 'hsl(var(--background))' }}>PosifyPro — Auth Diagnostics</h1>
          <p className="text-sm mt-1" style={{ color: 'hsl(var(--muted-foreground))' }}>
            Verifying Supabase connection and demo account availability.
          </p>
        </div>

        {allDone && (
          <div
            className="rounded-xl p-4 mb-6 text-sm font-semibold"
            style={{
              background: allOk ? '#F0FDF4' : '#FEF2F2',
              border: `1px solid ${allOk ? '#BBF7D0' : '#FECACA'}`,
              color: allOk ? '#166534' : '#991B1B',
            }}
          >
            {allOk
              ? '✅ All checks passed — authentication should work correctly.'
              : '❌ One or more checks failed — see details below and follow the fix instructions.'}
          </div>
        )}

        <div className="space-y-3">
          {checks.map(c => (
            <div
              key={c.label}
              className="rounded-xl p-4 flex items-start gap-4"
              style={{ background: 'hsl(var(--card))', border: '1px solid #E2E8F0' }}
            >
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold shrink-0 ${badge(c.status)}`}>
                {c.status === 'loading' ? '…' : c.status.toUpperCase()}
              </span>
              <div className="min-w-0">
                <p className="text-sm font-semibold" style={{ color: 'hsl(var(--background))' }}>{c.label}</p>
                {c.detail && (
                  <p className="text-xs mt-0.5 break-all" style={{ color: 'hsl(var(--muted-foreground))' }}>{c.detail}</p>
                )}
              </div>
            </div>
          ))}
        </div>

        <div
          className="mt-8 rounded-xl p-5"
          style={{ background: 'hsl(var(--card))', border: '1px solid #E2E8F0' }}
        >
          <h2 className="text-sm font-bold mb-3" style={{ color: 'hsl(var(--background))' }}>
            Fix Checklist for Vercel Production
          </h2>
          <ol className="space-y-2 text-xs" style={{ color: 'hsl(var(--muted-foreground))' }}>
            <li>1. Go to <strong>vercel.com</strong> → your project → <strong>Settings → Environment Variables</strong></li>
            <li>2. Add <code className="bg-gray-100 px-1 rounded">VITE_SUPABASE_URL</code> = <code className="bg-gray-100 px-1 rounded">https://jnhdbpruasufwbchoyge.supabase.co</code> for <strong>Production</strong> scope</li>
            <li>3. Add <code className="bg-gray-100 px-1 rounded">VITE_SUPABASE_ANON_KEY</code> = your anon key for <strong>Production</strong> scope</li>
            <li>4. Click <strong>Save</strong> then go to <strong>Deployments → ⋯ → Redeploy</strong></li>
            <li>5. After redeployment, revisit <code className="bg-gray-100 px-1 rounded">/debug</code> — all checks should turn green</li>
          </ol>
        </div>
      </div>
    </div>
  );
}
