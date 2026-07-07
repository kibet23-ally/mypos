import { useState } from 'react';
<<<<<<< HEAD
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import { Eye, EyeOff, ShoppingCart, Loader2 } from 'lucide-react';
import type { UserRole } from '@/types/index';

export default function LoginPage() {
  const navigate = useNavigate();
  const { signIn, signUp } = useAuth();

  // Login state
  const [loginUsername, setLoginUsername] = useState('');
=======
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
>>>>>>> b72e8c4 (feat: dynamic multi-currency support, edge function fixes)
  const [loginPassword, setLoginPassword] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);
  const [showLoginPw, setShowLoginPw] = useState(false);

<<<<<<< HEAD
  // Register state
  const [regUsername, setRegUsername] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regRole, setRegRole] = useState<UserRole>('cashier');
  const [regBusiness, setRegBusiness] = useState('');
  const [regTenantId, setRegTenantId] = useState('');
=======
  // ── Register state ─────────────────────────────────────────────────────────
  const [regFullName, setRegFullName] = useState('');
  const [regUsername, setRegUsername] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regBusiness, setRegBusiness] = useState('');
  const [regTenantId, setRegTenantId] = useState('');
  const [regRole] = useState<UserRole>('owner'); // public registration = owner only
>>>>>>> b72e8c4 (feat: dynamic multi-currency support, edge function fixes)
  const [regLoading, setRegLoading] = useState(false);
  const [showRegPw, setShowRegPw] = useState(false);
  const [agreed, setAgreed] = useState(false);

<<<<<<< HEAD
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginUsername.trim() || !loginPassword.trim()) {
      toast.error('Please enter username and password');
      return;
    }
    setLoginLoading(true);
    const { error } = await signIn(loginUsername.trim(), loginPassword);
    setLoginLoading(false);
    if (error) {
      toast.error(error.message || 'Login failed. Please check your credentials.');
    } else {
      toast.success('Welcome back!');
      navigate('/dashboard');
    }
=======
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
>>>>>>> b72e8c4 (feat: dynamic multi-currency support, edge function fixes)
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
<<<<<<< HEAD
    if (!agreed) {
      toast.error('Please accept the User Agreement and Privacy Policy');
      return;
    }
    if (!regUsername.trim() || !regPassword.trim()) {
      toast.error('Please fill in all required fields');
      return;
    }
    if (!/^[a-zA-Z0-9_]+$/.test(regUsername)) {
      toast.error('Username may only contain letters, digits, and underscores');
      return;
    }
    if (regRole === 'owner' && !regBusiness.trim()) {
      toast.error('Business name is required for Owner accounts');
      return;
    }
    if (regRole === 'cashier' && !regTenantId.trim()) {
      toast.error('Tenant ID is required for Cashier accounts');
      return;
    }
    if (regPassword.length < 8) {
      toast.error('Password must be at least 8 characters');
      return;
    }
    setRegLoading(true);
    const { error } = await signUp({
      username: regUsername.trim(),
      password: regPassword,
      role: regRole,
      business_name: regRole === 'owner' ? regBusiness.trim() : undefined,
      tenant_id: regRole === 'cashier' ? regTenantId.trim() : undefined,
    });
    setRegLoading(false);
    if (error) {
      toast.error(error.message || 'Registration failed');
    } else {
      toast.success('Account created successfully!');
      // Owners go to activation → onboarding; cashiers go straight to dashboard
      navigate(regRole === 'owner' ? '/activate' : '/dashboard');
    }
  };

  return (
    <div className="min-h-screen bg-background flex">
      {/* Left brand panel */}
      <div className="hidden lg:flex lg:w-[480px] xl:w-[560px] bg-sidebar flex-col justify-between p-10 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded bg-sidebar-primary flex items-center justify-center shrink-0">
            <ShoppingCart className="w-5 h-5 text-sidebar-primary-foreground" />
          </div>
          <span className="text-xl font-bold text-sidebar-accent-foreground tracking-tight">PosifyPro</span>
        </div>

        <div className="space-y-6">
          <div>
            <h1 className="text-3xl xl:text-4xl font-bold text-sidebar-accent-foreground leading-tight text-balance">
              The modern POS system for growing businesses
            </h1>
            <p className="mt-4 text-sidebar-foreground text-base leading-relaxed text-pretty">
              Manage sales, inventory, and your team from one powerful dashboard. Built for owners who mean business.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {[
              { label: 'Tenants', value: '2,400+' },
              { label: 'Transactions/day', value: '18M+' },
              { label: 'Uptime', value: '99.9%' },
              { label: 'Support', value: '24/7' },
            ].map(s => (
              <div key={s.label} className="bg-sidebar-accent rounded p-4 border border-sidebar-border">
                <div className="text-xl font-bold text-sidebar-primary">{s.value}</div>
                <div className="text-xs text-sidebar-foreground mt-1">{s.label}</div>
              </div>
            ))}
          </div>
        </div>

        <p className="text-xs text-sidebar-foreground/60">
          © {new Date().getFullYear()} PosifyPro. All rights reserved.
        </p>
      </div>

      {/* Right auth panel */}
      <div className="flex-1 min-w-0 flex items-center justify-center p-6">
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="flex items-center gap-3 mb-8 lg:hidden">
            <div className="w-9 h-9 rounded bg-primary flex items-center justify-center shrink-0">
              <ShoppingCart className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="text-xl font-bold text-foreground tracking-tight">PosifyPro</span>
          </div>

          <Tabs defaultValue="login" className="w-full">
            <TabsList className="w-full mb-6 h-10">
              <TabsTrigger value="login" className="flex-1 text-sm font-medium">Sign In</TabsTrigger>
              <TabsTrigger value="register" className="flex-1 text-sm font-medium">Create Account</TabsTrigger>
            </TabsList>

            {/* LOGIN */}
            <TabsContent value="login">
              <Card className="border border-border shadow-card">
                <CardContent className="p-6">
                  <div className="mb-6">
                    <h2 className="text-xl font-bold text-foreground text-balance">Welcome back</h2>
                    <p className="text-sm text-muted-foreground mt-1">Sign in to your PosifyPro account</p>
                  </div>

                  <form onSubmit={handleLogin} className="space-y-4">
                    <div className="space-y-1.5">
                      <Label htmlFor="login-username" className="text-sm font-normal">Username or Email</Label>
                      <Input
                        id="login-username"
                        type="text"
                        placeholder="username or email@example.com"
                        value={loginUsername}
                        onChange={e => setLoginUsername(e.target.value)}
                        autoComplete="username"
                        className="px-3"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="login-password" className="text-sm font-normal">Password</Label>
                      <div className="relative">
                        <Input
                          id="login-password"
                          type={showLoginPw ? 'text' : 'password'}
                          placeholder="••••••••"
                          value={loginPassword}
                          onChange={e => setLoginPassword(e.target.value)}
                          autoComplete="current-password"
                          className="px-3 pr-10"
                        />
                        <button
                          type="button"
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                          onClick={() => setShowLoginPw(v => !v)}
                          tabIndex={-1}
                        >
                          {showLoginPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>

                    <Button type="submit" className="w-full font-semibold h-10" disabled={loginLoading}>
                      {loginLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                      Sign In
                    </Button>
                  </form>

                  <div className="mt-5 p-3 bg-muted rounded border border-border">
                    <p className="text-xs font-semibold text-foreground mb-2">Demo Accounts</p>
                    {[
                      { label: 'Owner', user: 'owner_demo', pw: 'Pos@Owner#2026!Xk' },
                      { label: 'Cashier', user: 'cashier_demo', pw: 'Pos@Cashier#2026!Zr' },
                    ].map(d => (
                      <button
                        key={d.label}
                        type="button"
                        className="w-full text-left text-xs text-muted-foreground hover:text-foreground py-1 transition-colors"
                        onClick={() => { setLoginUsername(d.user); setLoginPassword(d.pw); }}
                      >
                        <span className="font-medium text-foreground">{d.label}:</span> {d.user}
                      </button>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* REGISTER */}
            <TabsContent value="register">
              <Card className="border border-border shadow-card">
                <CardContent className="p-6">
                  <div className="mb-6">
                    <h2 className="text-xl font-bold text-foreground text-balance">Create account</h2>
                    <p className="text-sm text-muted-foreground mt-1">Join PosifyPro — one-time payment, lifetime access</p>
                  </div>

                  <form onSubmit={handleRegister} className="space-y-4">
                    <div className="space-y-1.5">
                      <Label htmlFor="reg-username" className="text-sm font-normal">Username</Label>
                      <Input
                        id="reg-username"
                        type="text"
                        placeholder="letters, digits and _ only"
                        value={regUsername}
                        onChange={e => setRegUsername(e.target.value)}
                        autoComplete="username"
                        className="px-3"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="reg-password" className="text-sm font-normal">Password</Label>
                      <div className="relative">
                        <Input
                          id="reg-password"
                          type={showRegPw ? 'text' : 'password'}
                          placeholder="Min. 8 characters"
                          value={regPassword}
                          onChange={e => setRegPassword(e.target.value)}
                          autoComplete="new-password"
                          className="px-3 pr-10"
                        />
                        <button
                          type="button"
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                          onClick={() => setShowRegPw(v => !v)}
                          tabIndex={-1}
                        >
                          {showRegPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-sm font-normal">Account Role</Label>
                      <Select value={regRole} onValueChange={v => setRegRole(v as UserRole)}>
                        <SelectTrigger className="px-3">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="owner">Owner — Business manager</SelectItem>
                          <SelectItem value="cashier">Cashier — Sales staff</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {regRole === 'owner' && (
                      <div className="space-y-1.5">
                        <Label htmlFor="reg-business" className="text-sm font-normal">Business Name</Label>
                        <Input
                          id="reg-business"
                          type="text"
                          placeholder="Your business name"
                          value={regBusiness}
                          onChange={e => setRegBusiness(e.target.value)}
                          className="px-3"
                        />
                      </div>
                    )}

                    {regRole === 'cashier' && (
                      <div className="space-y-1.5">
                        <Label htmlFor="reg-tenant" className="text-sm font-normal">Tenant ID</Label>
                        <Input
                          id="reg-tenant"
                          type="text"
                          placeholder="Get this from your Owner"
                          value={regTenantId}
                          onChange={e => setRegTenantId(e.target.value)}
                          className="px-3"
                        />
                      </div>
                    )}

                    <div className="flex items-start gap-2.5 min-h-12">
                      <Checkbox
                        id="agree"
                        checked={agreed}
                        onCheckedChange={v => setAgreed(!!v)}
                        className="mt-0.5 shrink-0"
                      />
                      <label htmlFor="agree" className="text-xs text-muted-foreground leading-relaxed cursor-pointer">
                        I agree to the{' '}
                        <span className="text-foreground underline underline-offset-2">User Agreement</span>
                        {' '}and{' '}
                        <span className="text-foreground underline underline-offset-2">Privacy Policy</span>
                      </label>
                    </div>

                    <Button type="submit" className="w-full font-semibold h-10" disabled={regLoading || !agreed}>
                      {regLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                      Create Account
                    </Button>
                  </form>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
=======
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
>>>>>>> b72e8c4 (feat: dynamic multi-currency support, edge function fixes)
        </div>
      </div>
    </div>
  );
}
