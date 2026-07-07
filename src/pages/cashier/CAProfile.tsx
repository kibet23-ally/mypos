import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/db/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { User, Eye, EyeOff, Shield } from 'lucide-react';

const CARD_STYLE = { background: '#ffffff', borderColor: '#E2E8F0' };
const inputClass = "h-10 bg-slate-50 border-slate-200 text-slate-900 placeholder:text-slate-400 focus:border-[#2563EB] rounded-xl px-3";

export default function CAProfile() {
  const { appUser } = useAuth();
  const [currentPw, setCurrentPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [saving, setSaving] = useState(false);

  const changePw = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPw || newPw !== confirmPw) { toast.error('Passwords do not match'); return; }
    if (newPw.length < 8) { toast.error('Password must be at least 8 characters'); return; }
    setSaving(true);
    const { error } = await supabase.auth.updateUser({ password: newPw });
    setSaving(false);
    if (error) { toast.error(error.message); } else {
      toast.success('Password updated'); setCurrentPw(''); setNewPw(''); setConfirmPw('');
    }
  };

  const displayName = appUser?.display_name || appUser?.email?.split('@')[0] || 'Cashier';
  const email = appUser?.email || '';
  const phone = appUser?.phone_number || '';
  const joined = '–';

  return (
    <div className="space-y-5 fade-in max-w-2xl">
      <div>
        <h2 className="text-xl font-bold text-slate-900 text-balance">My Profile</h2>
        <p className="text-sm text-slate-500 mt-1">Manage your account settings</p>
      </div>

      <Card className="border" style={CARD_STYLE}>
        <CardContent className="p-6">
          <div className="flex items-center gap-5">
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-2xl font-bold text-slate-900 shrink-0"
              style={{ background: '#2563EB' }}>
              {displayName.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0">
              <h3 className="text-lg font-bold text-slate-900 truncate">{displayName}</h3>
              <p className="text-sm text-slate-500 truncate">{email}</p>
              <div className="flex items-center gap-2 mt-2">
                <Badge className="text-xs border" style={{ background: '#FFFBEB', borderColor: '#FDE68A', color: '#D97706' }}>
                  Cashier
                </Badge>
                <span className="text-xs text-slate-400">Joined {joined}</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border" style={CARD_STYLE}>
        <CardHeader className="pb-2 px-5 pt-5">
          <CardTitle className="text-sm font-semibold text-slate-900 flex items-center gap-2 text-balance">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
              style={{ background: '#EFF6FF', border: '1px solid rgba(37,99,235,0.3)' }}>
              <User className="w-3.5 h-3.5 text-blue-500" />
            </div>
            Account Information
          </CardTitle>
        </CardHeader>
        <CardContent className="px-5 pb-5 space-y-4">
          <div>
            <Label className="text-xs font-medium text-slate-600 mb-1.5 block">Display Name</Label>
            <Input value={displayName} readOnly className={`${inputClass} opacity-60 cursor-not-allowed`} />
          </div>
          <div>
            <Label className="text-xs font-medium text-slate-600 mb-1.5 block">Email</Label>
            <Input value={email} readOnly className={`${inputClass} opacity-60 cursor-not-allowed`} />
          </div>
          <div>
            <Label className="text-xs font-medium text-slate-600 mb-1.5 block">Phone Number</Label>
            <Input value={phone || '—'} readOnly className={`${inputClass} opacity-60 cursor-not-allowed`} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-xs font-medium text-slate-600 mb-1.5 block">Role</Label>
              <Input value="Cashier" readOnly className={`${inputClass} opacity-60 cursor-not-allowed`} />
            </div>
            <div>
              <Label className="text-xs font-medium text-slate-600 mb-1.5 block">Member Since</Label>
              <Input value={joined} readOnly className={`${inputClass} opacity-60 cursor-not-allowed`} />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border" style={CARD_STYLE}>
        <CardHeader className="pb-2 px-5 pt-5">
          <CardTitle className="text-sm font-semibold text-slate-900 flex items-center gap-2 text-balance">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
              style={{ background: '#F0FDF4', border: '1px solid #BBF7D0' }}>
              <Shield className="w-3.5 h-3.5 text-emerald-500" />
            </div>
            Change Password
          </CardTitle>
        </CardHeader>
        <CardContent className="px-5 pb-5">
          <form onSubmit={changePw} className="space-y-4">
            {[
              { label: 'Current Password', val: currentPw, set: setCurrentPw, placeholder: '••••••••' },
              { label: 'New Password', val: newPw, set: setNewPw, placeholder: 'Min 8 characters' },
              { label: 'Confirm New Password', val: confirmPw, set: setConfirmPw, placeholder: 'Repeat new password' },
            ].map((f, i) => (
              <div key={i}>
                <Label className="text-xs font-medium text-slate-600 mb-1.5 block">{f.label}</Label>
                <div className="relative">
                  <Input type={showPw ? 'text' : 'password'} placeholder={f.placeholder} value={f.val}
                    onChange={e => f.set(e.target.value)} className={`${inputClass} pr-10`} />
                  {i === 0 && (
                    <button type="button" onClick={() => setShowPw(!showPw)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-900">
                      {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  )}
                </div>
              </div>
            ))}
            <button type="submit" disabled={saving}
              className="h-10 px-6 rounded-xl text-sm font-semibold text-slate-900 disabled:opacity-60"
              style={{ background: '#2563EB' }}>
              {saving ? 'Updating…' : 'Update Password'}
            </button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
