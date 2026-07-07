import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/db/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Zap, Loader2, Key } from 'lucide-react';

const inputClass = "h-11 bg-slate-50 border-slate-200 text-slate-900 placeholder:text-slate-400 focus:border-[#2563EB] focus:ring-1 focus:ring-[#2563EB]/30 rounded-xl px-3";

export default function ActivatePage() {
  const navigate = useNavigate();
  const { appUser } = useAuth();
  const [licenseKey, setLicenseKey] = useState('');
  const [loading, setLoading] = useState(false);

  const handleActivate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!licenseKey.trim()) { toast.error('Enter your license key'); return; }
    setLoading(true);
    const { data: tenant, error } = await supabase.from('tenants').select('*').eq('license_key', licenseKey.trim()).single();
    if (error || !tenant) { toast.error('Invalid license key'); setLoading(false); return; }
    const { error: upErr } = await supabase.from('tenants').update({ is_activated: true }).eq('id', tenant.id);
    if (upErr) { toast.error(upErr.message); setLoading(false); return; }
    if (appUser?.id) { await supabase.from('profiles').update({ tenant_id: tenant.id }).eq('id', appUser.id); }
    toast.success('License activated! Redirecting…');
    setTimeout(() => navigate('/dashboard'), 1200);
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4 dark">
      <div className="w-full max-w-sm">
        <div className="flex items-center justify-center gap-3 mb-8">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{ background: '#2563EB' }}>
            <Zap className="w-5 h-5 text-slate-900" />
          </div>
          <span className="text-lg font-bold text-slate-900">PosifyPro</span>
        </div>
        <div className="rounded-2xl border p-8"
          style={{ background: '#ffffff', borderColor: '#E2E8F0' }}>
          <div className="flex justify-center mb-4">
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center"
              style={{ background: '#EFF6FF', border: '1px solid rgba(37,99,235,0.3)' }}>
              <Key className="w-6 h-6 text-blue-500" />
            </div>
          </div>
          <h1 className="text-xl font-bold text-slate-900 text-center text-balance mb-1">Activate Your License</h1>
          <p className="text-sm text-slate-500 text-center mb-6">Enter the license key provided by your super admin</p>
          <form onSubmit={handleActivate} className="space-y-4">
            <div>
              <Label className="text-xs font-medium text-slate-600 mb-1.5 block">License Key</Label>
              <Input className={inputClass} placeholder="XXXX-XXXX-XXXX-XXXX" value={licenseKey} onChange={e => setLicenseKey(e.target.value)} />
            </div>
            <button type="submit" disabled={loading}
              className="w-full h-11 rounded-xl text-sm font-bold text-slate-900 flex items-center justify-center gap-2 disabled:opacity-60"
              style={{ background: '#2563EB' }}>
              {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Activating…</> : 'Activate License'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
