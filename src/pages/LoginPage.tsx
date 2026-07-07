import { useState } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import { Eye, EyeOff, Zap, Loader2, TrendingUp, Shield, BarChart3, Users, ArrowRight, Mail, Phone, Building2, Hash, User, AtSign } from 'lucide-react';
import type { UserRole } from '@/types/index';

const FEATURES = [
  { icon: TrendingUp, text: 'Real-time sales analytics' },
  { icon: Shield, text: 'Enterprise-grade security' },
  { icon: BarChart3, text: 'Advanced financial reports' },
  { icon: Users, text: 'Multi-tenant management' },
];

export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { signIn, signUp } = useAuth();
  const defaultTab = location.pathname === '/register' ? 'register' : 'login';

  // ── Login state ────────────────────────────────────────────────────────────
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);
  const [showLoginPw, setShowLoginPw] = useState(false);

  // ── Register state ─────────────────────────────────────────────────────────
  const [regFullName, setRegFullName] = useState('');
  const [regUsername, setRegUsername] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regBusiness, setRegBusiness] = useState('');
  const [regTenantId, setRegTenantId] = useState('');
  const [regRole] = useState<UserRole>('owner'); // public registration = owner only
  const [regLoading, setRegLoading] = useState(false);
  const [showRegPw, setShowRegPw] = useState(false);
  const [agreed, setAgreed] = useState(false);

  // ── Handlers ───────────────────────────────────────────────────────────────
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginEmail.trim() || !loginPassword.trim()) { toast.error('Enter your email and password'); return; }
    const emailRx = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRx.test(loginEmail.trim())) { toast.error('Enter a valid email address'); return; }
    setLoginLoading(true);
    const { error } = await signIn(loginEmail.trim(), loginPassword);
    setLoginLoading(false);
    if (error) { toast.error(error.message || 'Login failed'); }
    else { toast.success('Welcome back!'); navigate('/dashboard'); }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!agreed) { toast.error('Accept the User Agreement to continue'); return; }
    if (!regFullName.trim()) { toast.error('Enter your full name'); return; }
    if (!regUsername.trim()) { toast.error('Choose a username'); return; }
    if (!/^[a-zA-Z0-9_]+$/.test(regUsername.trim())) { toast.error('Username may only contain letters, digits, and underscores'); return; }
    const emailRx = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!regEmail.trim() || !emailRx.test(regEmail.trim())) { toast.error('Enter a valid email address'); return; }
    if (!regPhone.trim()) { toast.error('Phone number is required'); return; }
    if (!regPassword || regPassword.length < 8) { toast.error('Password must be at least 8 characters'); return; }
    if (!regBusiness.trim()) { toast.error('Business name is required'); return; }
    setRegLoading(true);
    const { error } = await signUp({
      full_name: regFullName.trim(),
      username: regUsername.trim(),
      email: regEmail.trim(),
      phone_number: regPhone.trim(),
      password: regPassword,
      role: regRole,
      business_name: regBusiness.trim(),
    });
    setRegLoading(false);
    if (error) { toast.error(error.message || 'Registration failed'); }
    else { toast.success('Account created! Starting your 14-day trial…'); navigate('/dashboard'); }
  };

  const inputClass = "h-11 bg-slate-50 border-slate-200 text-slate-900 placeholder:text-slate-400 focus:border-[#2563EB] focus:ring-1 focus:ring-[#2563EB]/30 rounded-xl px-3";

  return (
    <div className="min-h-screen flex bg-slate-50">
      {/* Left panel */}
      <div className="hidden lg:flex flex-col w-[480px] shrink-0 relative overflow-hidden bg-blue-700">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-80 h-80 rounded-full opacity-15 blur-3xl"
            style={{ background: 'radial-gradient(ellipse,rgba(255,255,255,0.15),transparent)' }} />
        </div>
        <div className="relative flex flex-col h-full px-10 py-12">
          <div className="flex items-center gap-3 mb-12">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center"
              style={{ background: '#2563EB' }}>
              <Zap className="w-4 h-4 text-slate-900" />
            </div>
            <span className="text-lg font-bold text-slate-900">PosifyPro</span>
          </div>

          <div className="flex-1 flex flex-col justify-center">
            <h2 className="text-3xl font-bold text-slate-900 text-balance mb-3">Run your business smarter</h2>
            <p className="text-slate-500 text-base mb-10 text-pretty leading-relaxed">
              The premium POS SaaS platform trusted by 2,400+ businesses worldwide.
            </p>
            <div className="space-y-4 mb-10">
              {FEATURES.map(f => (
                <div key={f.text} className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                    style={{ background: '#EFF6FF', border: '1px solid rgba(37,99,235,0.3)' }}>
                    <f.icon className="w-4 h-4 text-blue-500" />
                  </div>
                  <span className="text-sm text-slate-600">{f.text}</span>
                </div>
              ))}
            </div>
            <div className="grid grid-cols-2 gap-3">
              {[{ v: '99.9%', l: 'Uptime' }, { v: '<3s', l: 'Checkout' }, { v: '2,400+', l: 'Businesses' }, { v: '$180M+', l: 'Processed' }].map(s => (
                <div key={s.l} className="rounded-xl p-3 border text-center"
                  style={{ background: 'rgba(255,255,255,0.15)', borderColor: 'rgba(255,255,255,0.2)' }}>
                  <p className="text-lg font-bold" style={{ background: 'linear-gradient(135deg,#2563EB,#60A5FA)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>{s.v}</p>
                  <p className="text-xs text-slate-400">{s.l}</p>
                </div>
              ))}
            </div>
          </div>
          <p className="text-xs text-blue-200">© 2026 PosifyPro. Enterprise SaaS Platform.</p>
        </div>
      </div>

      {/* Right panel */}
      <div className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-sm">
          {/* Mobile logo */}
          <div className="flex lg:hidden items-center gap-2 justify-center mb-8">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center"
              style={{ background: '#2563EB' }}>
              <Zap className="w-4 h-4 text-slate-900" />
            </div>
            <span className="text-base font-bold text-slate-900">PosifyPro</span>
          </div>

          <Tabs defaultValue={defaultTab}>
            <TabsList className="w-full mb-6 rounded-xl p-1 h-11"
              style={{ background: '#F1F5F9', border: '1px solid #E2E8F0' }}>
              <TabsTrigger value="login"
                className="flex-1 rounded-lg text-sm font-medium text-slate-500 data-[state=active]:text-slate-900 data-[state=active]:shadow-none">
                Sign In
              </TabsTrigger>
              <TabsTrigger value="register"
                className="flex-1 rounded-lg text-sm font-medium text-slate-500 data-[state=active]:text-slate-900 data-[state=active]:shadow-none">
                Register
              </TabsTrigger>
            </TabsList>

            {/* ── Login Tab ─────────────────────────────────────────────────── */}
            <TabsContent value="login">
              <div className="text-center mb-6">
                <h1 className="text-2xl font-bold text-slate-900">Welcome back</h1>
                <p className="text-sm text-slate-500 mt-1">Sign in with your email</p>
              </div>
              <form onSubmit={handleLogin} className="space-y-4">
                <div>
                  <Label className="text-xs font-medium text-slate-600 mb-1.5 block">Email address</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <Input className={`${inputClass} pl-9`} type="email" placeholder="you@example.com"
                      value={loginEmail} onChange={e => setLoginEmail(e.target.value)} autoComplete="email" />
                  </div>
                </div>
                <div>
                  <Label className="text-xs font-medium text-slate-600 mb-1.5 block">Password</Label>
                  <div className="relative">
                    <Input className={`${inputClass} pr-10`} type={showLoginPw ? 'text' : 'password'}
                      placeholder="••••••••" value={loginPassword} onChange={e => setLoginPassword(e.target.value)}
                      autoComplete="current-password" />
                    <button type="button" onClick={() => setShowLoginPw(!showLoginPw)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-900 transition-colors">
                      {showLoginPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
                <button type="submit" disabled={loginLoading}
                  className="w-full h-11 rounded-xl text-sm font-bold text-slate-900 flex items-center justify-center gap-2 transition-opacity disabled:opacity-60"
                  style={{ background: '#2563EB', boxShadow: '0 0 24px rgba(37,99,235,0.3)' }}>
                  {loginLoading ? <><Loader2 className="w-4 h-4 animate-spin" /> Signing in…</> : <>Sign In <ArrowRight className="w-4 h-4" /></>}
                </button>
              </form>

              {/* Demo accounts */}
              <div className="mt-5">
                <div className="relative flex items-center mb-3">
                  <div className="flex-1 border-t border-slate-200" />
                  <span className="px-2 text-xs text-slate-400">Demo accounts</span>
                  <div className="flex-1 border-t border-slate-200" />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { label: 'Owner', email: 'owner_demo@posifypro.miaoda.com', pw: 'Pos@Owner#2026!Xk', color: '#16A34A', sub: 'Full dashboard access' },
                    { label: 'Cashier', email: 'cashier_demo@posifypro.miaoda.com', pw: 'Pos@Cashier#2026!Zr', color: '#D97706', sub: 'POS + sales access' },
                  ].map(d => (
                    <button key={d.label} type="button"
                      onClick={() => { setLoginEmail(d.email); setLoginPassword(d.pw); }}
                      className="flex flex-col items-start gap-0.5 rounded-xl border p-3 text-left hover:border-blue-300 transition-colors"
                      style={{ borderColor: '#E2E8F0', background: '#F8FAFC' }}>
                      <span className="text-xs font-bold" style={{ color: d.color }}>{d.label}</span>
                      <span className="text-[10px] text-slate-500">{d.email}</span>
                      <span className="text-[10px] text-slate-400">{d.sub}</span>
                    </button>
                  ))}
                </div>
                <p className="text-center text-xs text-slate-400 mt-2">Click a card to auto-fill, then press Sign In</p>
              </div>

              <p className="text-center text-xs text-slate-400 mt-4">
                No account?{' '}
                <button type="button" onClick={() => { const t = document.querySelector('[data-value="register"]') as HTMLElement; t?.click(); }}
                  className="text-blue-500 hover:text-slate-900 transition-colors">
                  Create one free
                </button>
              </p>
            </TabsContent>

            {/* ── Register Tab ──────────────────────────────────────────────── */}
            <TabsContent value="register">
              <div className="text-center mb-6">
                <h1 className="text-2xl font-bold text-slate-900">Start free trial</h1>
                <p className="text-sm text-slate-500 mt-1">14 days free — no credit card required</p>
              </div>
              <form onSubmit={handleRegister} className="space-y-4">
                {/* Full name */}
                <div>
                  <Label className="text-xs font-medium text-slate-600 mb-1.5 block">Full name</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <Input className={`${inputClass} pl-9`} type="text" placeholder="Jane Wanjiru"
                      value={regFullName} onChange={e => setRegFullName(e.target.value)} autoComplete="name" />
                  </div>
                </div>

                {/* Username */}
                <div>
                  <Label className="text-xs font-medium text-slate-600 mb-1.5 block">Username</Label>
                  <div className="relative">
                    <AtSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <Input className={`${inputClass} pl-9`} type="text" placeholder="jane_wanjiru"
                      value={regUsername} onChange={e => setRegUsername(e.target.value)} autoComplete="username" />
                  </div>
                </div>

                {/* Email */}
                <div>
                  <Label className="text-xs font-medium text-slate-600 mb-1.5 block">Email address</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <Input className={`${inputClass} pl-9`} type="email" placeholder="you@example.com"
                      value={regEmail} onChange={e => setRegEmail(e.target.value)} autoComplete="email" />
                  </div>
                </div>

                {/* Phone */}
                <div>
                  <Label className="text-xs font-medium text-slate-600 mb-1.5 block">Phone number</Label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <Input className={`${inputClass} pl-9`} type="tel" placeholder="+1 234 567 8900"
                      value={regPhone} onChange={e => setRegPhone(e.target.value)} autoComplete="tel" />
                  </div>
                </div>

                {/* Business name */}
                <div>
                  <Label className="text-xs font-medium text-slate-600 mb-1.5 block">Business name</Label>
                  <div className="relative">
                    <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <Input className={`${inputClass} pl-9`} placeholder="My Business LLC"
                      value={regBusiness} onChange={e => setRegBusiness(e.target.value)} />
                  </div>
                </div>

                {/* Password */}
                <div>
                  <Label className="text-xs font-medium text-slate-600 mb-1.5 block">Password</Label>
                  <div className="relative">
                    <Input className={`${inputClass} pr-10`} type={showRegPw ? 'text' : 'password'}
                      placeholder="Min 8 characters" value={regPassword}
                      onChange={e => setRegPassword(e.target.value)} autoComplete="new-password" />
                    <button type="button" onClick={() => setShowRegPw(!showRegPw)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-900 transition-colors">
                      {showRegPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Terms */}
                <div className="flex items-start gap-2.5 min-h-12">
                  <Checkbox id="terms" checked={agreed} onCheckedChange={c => setAgreed(!!c)}
                    className="mt-0.5 border-slate-300 data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600" />
                  <Label htmlFor="terms" className="text-xs text-slate-400 leading-relaxed">
                    I agree to the{' '}
                    <a href="#" className="text-blue-500 hover:text-slate-900">User Agreement</a> and{' '}
                    <a href="#" className="text-blue-500 hover:text-slate-900">Privacy Policy</a>
                  </Label>
                </div>

                <button type="submit" disabled={regLoading}
                  className="w-full h-11 rounded-xl text-sm font-bold text-slate-900 flex items-center justify-center gap-2 disabled:opacity-60"
                  style={{ background: '#2563EB', boxShadow: '0 0 24px rgba(37,99,235,0.3)' }}>
                  {regLoading
                    ? <><Loader2 className="w-4 h-4 animate-spin" /> Creating account…</>
                    : <>Start Free Trial <ArrowRight className="w-4 h-4" /></>}
                </button>
              </form>

              {/* Cashier join note */}
              <div className="mt-5 p-3 rounded-xl text-xs text-slate-400"
                style={{ background: '#EFF6FF', border: '1px solid #BFDBFE' }}>
                <div className="flex items-center gap-1.5 mb-1">
                  <Hash className="w-3 h-3 text-blue-500 shrink-0" />
                  <span className="text-blue-500 font-medium">Cashier / Staff?</span>
                </div>
                Ask your business owner to add your account from their Staff Management page.
              </div>
            </TabsContent>
          </Tabs>

          <p className="text-center text-xs text-slate-400 mt-6">
            <Link to="/" className="hover:text-blue-500 transition-colors">← Back to home</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
