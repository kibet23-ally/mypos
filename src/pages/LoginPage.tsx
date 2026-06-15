import { useState } from 'react';
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
  const [loginPassword, setLoginPassword] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);
  const [showLoginPw, setShowLoginPw] = useState(false);

  // Register state
  const [regUsername, setRegUsername] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regRole, setRegRole] = useState<UserRole>('cashier');
  const [regBusiness, setRegBusiness] = useState('');
  const [regTenantId, setRegTenantId] = useState('');
  const [regLoading, setRegLoading] = useState(false);
  const [showRegPw, setShowRegPw] = useState(false);
  const [agreed, setAgreed] = useState(false);

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
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
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
        </div>
      </div>
    </div>
  );
}
