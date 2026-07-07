import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  BarChart3, ShieldCheck, Users, Zap, Package, TrendingUp,
  Star, CheckCircle, ArrowRight, Menu, X, ChevronDown,
  Building2, Clock, CreditCard, Layers, Globe, Lock,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

const FEATURES = [
  { icon: Zap, title: 'Lightning-Fast POS', desc: 'Process transactions in under 3 seconds with our optimised checkout built for high-volume retail.', gradient: 'from-[#2563EB] to-[#7C3AED]' },
  { icon: BarChart3, title: 'Real-Time Analytics', desc: 'Live revenue charts, hourly sales trends, and profit breakdowns updated every second.', gradient: 'from-[#7C3AED] to-[#60A5FA]' },
  { icon: ShieldCheck, title: 'Enterprise Security', desc: 'Granular RBAC for SuperAdmin, Owner, and Cashier roles. Every request is JWT-validated.', gradient: 'from-[#2563EB] to-[#22C55E]' },
  { icon: Package, title: 'Smart Inventory', desc: 'Automatic low-stock alerts, reorder thresholds, and category-level stock visibility.', gradient: 'from-[#22C55E] to-[#2563EB]' },
  { icon: Users, title: 'Staff Management', desc: 'Track cashier performance, monitor shift durations, and review transaction histories.', gradient: 'from-[#F59E0B] to-[#2563EB]' },
  { icon: TrendingUp, title: 'Financial Reports', desc: 'Monthly P&L, expense breakdowns, and YTD revenue summaries export-ready in one dashboard.', gradient: 'from-[#2563EB] to-[#F59E0B]' },
];

const STATS = [
  { value: '2,400+', label: 'Businesses Powered' },
  { value: 'KSh 180M+', label: 'Transactions Processed' },
  { value: '99.9%', label: 'Platform Uptime' },
  { value: '<3s', label: 'Avg Checkout Time' },
];

const REVIEWS = [
  { name: 'Wanjiru K.', role: 'Owner, Mama Njeri Eatery, Nairobi', avatar: 'WK', rating: 5, text: 'PosifyPro transformed our entire operations. Real-time dashboards and the multi-tenant setup is flawless.' },
  { name: 'Aisha M.', role: 'Finance Manager, Coastline Supermarkets, Mombasa', avatar: 'AM', rating: 5, text: 'The financial reporting is enterprise-grade. We cut our end-of-month close from 3 days to 4 hours.' },
  { name: 'Otieno B.', role: 'Operations Director, Kisumu Hardware Ltd', avatar: 'OB', rating: 5, text: 'Staff management features are brilliant. Real-time cashier tracking is exactly what we needed.' },
];

const PLANS = [
  { name: 'Starter', price: 'KSh 4,900', period: '/month', desc: 'Perfect for small businesses', features: ['1 Location', '3 Cashier Accounts', 'Basic Analytics', 'Email Support'], cta: 'Get Started', featured: false },
  { name: 'Professional', price: 'KSh 9,900', period: '/month', desc: 'For growing businesses', features: ['5 Locations', 'Unlimited Cashiers', 'Advanced Analytics', 'Inventory Management', 'Priority Support', 'Custom Reports'], cta: 'Start Free Trial', featured: true },
  { name: 'Enterprise', price: 'KSh 24,900', period: '/month', desc: 'For large operations', features: ['Unlimited Locations', 'Unlimited Users', 'Custom Analytics', 'API Access', 'Dedicated Support', 'SLA Guarantee'], cta: 'Contact Sales', featured: false },
];

const FAQS = [
  { q: 'How does the multi-tenant architecture work?', a: 'Each business gets its own isolated environment. Super admins manage all tenants while owners and cashiers only access their assigned business data.' },
  { q: 'Is there a free trial?', a: 'Yes! The Professional plan includes a 14-day free trial with no credit card required. You can explore all features risk-free.' },
  { q: 'Can I migrate data from my existing POS?', a: 'Absolutely. Our onboarding team helps you import products, inventory, and historical sales data from most major POS systems.' },
  { q: 'What payment methods are supported?', a: 'PosifyPro supports cash, card (Stripe), and mobile payments out of the box. Additional gateways can be added via our API.' },
  { q: 'How secure is my data?', a: 'We use bank-grade encryption at rest and in transit, role-based access control, and regular security audits to keep your data safe.' },
];

export default function LandingPage() {
  const [navOpen, setNavOpen] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  return (
    <div className="min-h-screen bg-white text-slate-900">
      {/* Nav */}
      <nav className="fixed top-0 inset-x-0 z-50 border-b border-slate-100 bg-white">
        <div className="max-w-7xl mx-auto px-4 md:px-6 flex items-center h-16 gap-4">
          <div className="flex items-center gap-2.5 shrink-0">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center"
              style={{ background: '#2563EB' }}>
              <Zap className="w-4 h-4 text-slate-900" />
            </div>
            <span className="text-base font-bold text-slate-900 tracking-tight">PosifyPro</span>
          </div>

          <div className="hidden md:flex items-center gap-6 flex-1 justify-center">
            {['Features', 'Pricing', 'FAQ'].map(item => (
              <a key={item} href={`#${item.toLowerCase()}`}
                className="text-sm text-slate-600 hover:text-slate-900 transition-colors">{item}</a>
            ))}
          </div>

          <div className="hidden md:flex items-center gap-3 ml-auto shrink-0">
            <Link to="/login">
              <Button variant="ghost" className="text-slate-600 hover:text-slate-900 border border-slate-200 hover:bg-slate-50 h-9 text-sm">
                Sign In
              </Button>
            </Link>
            <Link to="/register">
              <Button className="h-9 text-sm font-semibold text-slate-900"
                style={{ background: '#2563EB' }}>
                Get Started <ArrowRight className="w-3.5 h-3.5 ml-1" />
              </Button>
            </Link>
          </div>

          <button className="md:hidden ml-auto text-slate-600" onClick={() => setNavOpen(!navOpen)}>
            {navOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
        {navOpen && (
          <div className="md:hidden border-t border-slate-100 px-4 py-4 space-y-3"
            style={{ background: '#ffffff' }}>
            {['Features', 'Pricing', 'FAQ'].map(item => (
              <a key={item} href={`#${item.toLowerCase()}`}
                className="block text-sm text-slate-600 hover:text-slate-900 py-1"
                onClick={() => setNavOpen(false)}>{item}</a>
            ))}
            <div className="flex flex-col gap-2 pt-2">
              <Link to="/login" onClick={() => setNavOpen(false)}>
                <Button variant="ghost" className="w-full h-9 border border-slate-200 text-slate-700 hover:bg-slate-50">Sign In</Button>
              </Link>
              <Link to="/register" onClick={() => setNavOpen(false)}>
                <Button className="w-full h-9 font-semibold text-slate-900"
                  style={{ background: '#2563EB' }}>Get Started</Button>
              </Link>
            </div>
          </div>
        )}
      </nav>

      {/* Hero */}
      <section className="relative pt-28 pb-20 md:pt-36 md:pb-28 overflow-hidden">
        {/* Background glow */}
        <div className="absolute inset-0 pointer-events-none z-0">
          <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[400px] rounded-full opacity-20 blur-3xl"
            style={{ background: 'radial-gradient(ellipse,#BFDBFE,transparent)' }} />
          <div className="absolute top-1/3 right-1/4 w-64 h-64 rounded-full opacity-10 blur-3xl"
            style={{ background: '#E0E7FF' }} />
        </div>

        <div className="relative z-10 max-w-5xl mx-auto px-4 md:px-6 text-center">
          <Badge className="mb-6 text-xs font-semibold px-3 py-1 border"
            style={{ background: '#EFF6FF', borderColor: '#BFDBFE', color: '#2563EB' }}>
            ✦ The Future of Retail Management
          </Badge>
          <h1 className="text-4xl md:text-6xl font-bold tracking-tight text-balance mb-6 text-slate-900 leading-tight">
            The POS Platform Built for{' '}
            <span className="gradient-text">Modern Business</span>
          </h1>
          <p className="text-lg md:text-xl text-slate-600 max-w-2xl mx-auto mb-10 text-pretty">
            Manage sales, inventory, staff, and analytics across every location —
            all in one beautifully designed multi-tenant SaaS platform.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16">
            <Link to="/register">
              <Button className="h-12 px-8 text-sm font-bold text-white rounded-xl"
                style={{ background: '#2563EB' }}>
                Start Free Trial <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </Link>
            <Link to="/login">
              <Button variant="ghost" className="h-12 px-8 text-sm font-medium border border-slate-200 text-slate-700 hover:bg-slate-50 rounded-xl">
                View Demo
              </Button>
            </Link>
          </div>

          {/* KPI Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {STATS.map(s => (
              <div key={s.label} className="rounded-2xl p-4 border text-center hover-lift"
                style={{ background: '#F8FAFC', borderColor: '#E2E8F0' }}>
                <p className="text-2xl md:text-3xl font-bold gradient-text">{s.value}</p>
                <p className="text-xs text-slate-400 mt-1">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-20 md:py-28">
        <div className="max-w-6xl mx-auto px-4 md:px-6">
          <div className="text-center mb-14">
            <Badge className="mb-4 text-xs border" style={{ background: '#EFF6FF', borderColor: '#BFDBFE', color: '#2563EB' }}>
              Features
            </Badge>
            <h2 className="text-3xl md:text-4xl font-bold text-slate-900 text-balance">Everything you need to run your business</h2>
            <p className="text-slate-600 mt-3 text-base text-pretty max-w-xl mx-auto">
              From the POS terminal to the executive dashboard, PosifyPro covers it all.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
            {FEATURES.map(f => (
              <div key={f.title} className="rounded-2xl p-6 border hover-lift group"
                style={{ background: '#ffffff', borderColor: '#E2E8F0' }}>
                <div className={`w-11 h-11 rounded-xl flex items-center justify-center mb-5 bg-gradient-to-br ${f.gradient}`}>
                  <f.icon className="w-5 h-5 text-white" />
                </div>
                <h3 className="text-base font-semibold text-slate-900 mb-2">{f.title}</h3>
                <p className="text-sm text-slate-500 text-pretty leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-20 md:py-24 border-y border-slate-100 bg-slate-50">
        <div className="max-w-6xl mx-auto px-4 md:px-6">
          <div className="text-center mb-14">
            <Badge className="mb-4 text-xs border" style={{ background: '#F0FDF4', borderColor: '#BBF7D0', color: '#16A34A' }}>
              Testimonials
            </Badge>
            <h2 className="text-3xl md:text-4xl font-bold text-slate-900 text-balance">Trusted by thousands of businesses</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {REVIEWS.map(r => (
              <div key={r.name} className="rounded-2xl p-6 border hover-lift"
                style={{ background: '#ffffff', borderColor: 'rgba(255,255,255,0.07)' }}>
                <div className="flex mb-4">
                  {Array.from({ length: r.rating }).map((_, i) => (
                    <Star key={i} className="w-4 h-4 fill-[#F59E0B] text-amber-600" />
                  ))}
                </div>
                <p className="text-sm text-slate-600 leading-relaxed mb-5 text-pretty">"{r.text}"</p>
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold text-slate-900 shrink-0"
                    style={{ background: '#2563EB' }}>
                    {r.avatar}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-900">{r.name}</p>
                    <p className="text-xs text-slate-400">{r.role}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="py-20 md:py-28">
        <div className="max-w-5xl mx-auto px-4 md:px-6">
          <div className="text-center mb-14">
            <Badge className="mb-4 text-xs border" style={{ background: '#EFF6FF', borderColor: '#BFDBFE', color: '#2563EB' }}>
              Pricing
            </Badge>
            <h2 className="text-3xl md:text-4xl font-bold text-slate-900 text-balance">Simple, transparent pricing</h2>
            <p className="text-slate-600 mt-3 text-pretty">No hidden fees. Cancel anytime.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {PLANS.map(plan => (
              <div key={plan.name} className={`relative rounded-2xl p-6 border flex flex-col h-full ${plan.featured ? '' : 'hover-lift'}`}
                style={plan.featured
                  ? { background: 'linear-gradient(135deg,rgba(37,99,235,0.15),rgba(124,58,237,0.08))', borderColor: 'rgba(37,99,235,0.4)', boxShadow: '0 0 40px rgba(37,99,235,0.15)' }
                  : { background: '#ffffff', borderColor: 'rgba(255,255,255,0.07)' }}>
                {plan.featured && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <Badge className="text-xs font-bold px-3 text-slate-900" style={{ background: '#2563EB' }}>
                      Most Popular
                    </Badge>
                  </div>
                )}
                <div className="mb-5">
                  <p className="text-base font-bold text-slate-900">{plan.name}</p>
                  <p className="text-xs text-slate-400 mt-1">{plan.desc}</p>
                  <div className="flex items-baseline gap-1 mt-4">
                    <span className="text-3xl font-bold text-slate-900">{plan.price}</span>
                    <span className="text-sm text-slate-500">{plan.period}</span>
                  </div>
                </div>
                <ul className="space-y-2.5 flex-1 mb-6">
                  {plan.features.map(f => (
                    <li key={f} className="flex items-center gap-2.5 text-sm text-slate-600">
                      <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                      {f}
                    </li>
                  ))}
                </ul>
                <Link to="/register">
                  <Button className={`w-full h-10 font-semibold text-sm mt-auto ${plan.featured ? 'text-white' : 'border border-slate-200 bg-white hover:bg-slate-50 text-slate-700'}`}
                    style={plan.featured ? { background: '#2563EB' } : undefined}>
                    {plan.cta}
                  </Button>
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="py-20 md:py-24 border-t border-slate-100">
        <div className="max-w-3xl mx-auto px-4 md:px-6">
          <div className="text-center mb-14">
            <Badge className="mb-4 text-xs border" style={{ background: '#FFFBEB', borderColor: '#FDE68A', color: '#D97706' }}>
              FAQ
            </Badge>
            <h2 className="text-3xl md:text-4xl font-bold text-slate-900 text-balance">Frequently asked questions</h2>
          </div>
          <div className="space-y-3">
            {FAQS.map((faq, i) => (
              <div key={i} className="rounded-xl border overflow-hidden"
                style={{ background: '#ffffff', borderColor: 'rgba(255,255,255,0.07)' }}>
                <button
                  type="button"
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  className="w-full flex items-center justify-between px-5 py-4 text-sm font-semibold text-slate-900 text-left"
                >
                  <span>{faq.q}</span>
                  <ChevronDown className={`w-4 h-4 text-slate-500 shrink-0 transition-transform ${openFaq === i ? 'rotate-180' : ''}`} />
                </button>
                {openFaq === i && (
                  <div className="px-5 pb-4">
                    <p className="text-sm text-slate-500 text-pretty leading-relaxed">{faq.a}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 md:py-24">
        <div className="max-w-3xl mx-auto px-4 md:px-6 text-center">
          <div className="rounded-2xl p-10 md:p-14 border relative overflow-hidden"
            style={{ background: 'linear-gradient(135deg,rgba(37,99,235,0.12),rgba(124,58,237,0.06))', borderColor: 'rgba(37,99,235,0.25)' }}>
            <div className="absolute inset-0 pointer-events-none">
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-32 rounded-full opacity-20 blur-3xl"
                style={{ background: '#2563EB' }} />
            </div>
            <h2 className="relative text-3xl md:text-4xl font-bold text-slate-900 text-balance mb-4">
              Ready to transform your business?
            </h2>
            <p className="relative text-slate-600 mb-8 text-pretty">
              Join 2,400+ businesses already using PosifyPro. Start your free 14-day trial today.
            </p>
            <div className="relative flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link to="/register">
                <Button className="h-12 px-8 text-sm font-bold text-white rounded-xl"
                  style={{ background: '#2563EB', boxShadow: '0 0 30px rgba(37,99,235,0.35)' }}>
                  Start Free Trial <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </Link>
              <Link to="/login">
                <Button variant="ghost" className="h-12 px-8 text-sm border border-slate-200 text-slate-700 hover:bg-slate-50 rounded-xl">
                  Sign In
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-100 py-10">
        <div className="max-w-6xl mx-auto px-4 md:px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-8">
            <div className="col-span-2 md:col-span-1">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-7 h-7 rounded-lg flex items-center justify-center"
                  style={{ background: '#2563EB' }}>
                  <Zap className="w-3.5 h-3.5 text-slate-900" />
                </div>
                <span className="text-sm font-bold text-slate-900">PosifyPro</span>
              </div>
              <p className="text-xs text-slate-400 text-pretty leading-relaxed">
                The modern POS SaaS platform for businesses of all sizes.
              </p>
            </div>
            {[
              { title: 'Product', links: ['Features', 'Pricing', 'Changelog', 'Roadmap'] },
              { title: 'Company', links: ['About', 'Blog', 'Careers', 'Press'] },
              { title: 'Legal', links: ['Privacy', 'Terms', 'Security', 'Cookies'] },
            ].map(col => (
              <div key={col.title}>
                <p className="text-sm font-semibold text-slate-900 mb-3">{col.title}</p>
                <ul className="space-y-2">
                  {col.links.map(l => (
                    <li key={l}><a href="#" className="text-xs text-slate-400 hover:text-slate-600 transition-colors">{l}</a></li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <div className="pt-6 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3">
            <p className="text-xs text-slate-400">© 2026 PosifyPro. All rights reserved.</p>
            <div className="flex items-center gap-4 text-xs text-slate-400">
              <Globe className="w-3.5 h-3.5" />
              <span>Made for businesses everywhere</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}