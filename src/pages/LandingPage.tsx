<<<<<<< HEAD
import { Link } from 'react-router-dom';
import {
  BarChart3, ShieldCheck, Users, Zap, Package, TrendingUp,
  Star, CheckCircle, ArrowRight, Menu, X, ChevronRight,
  Building2, Clock, CreditCard,
} from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

/* ─── colour palette helpers (inline so no CSS token bleed into landing) ─── */
const E = '#10B981'; // emerald accent

/* ─── data ─── */
const FEATURES = [
  {
    icon: Zap,
    title: 'Lightning-Fast POS',
    desc: 'Process transactions in under 3 seconds with our optimised checkout interface — built for high-volume retail.',
  },
  {
    icon: BarChart3,
    title: 'Real-Time Analytics',
    desc: 'Live revenue charts, hourly sales trends, and profit breakdowns updated every second, no refresh required.',
  },
  {
    icon: ShieldCheck,
    title: 'Role-Based Security',
    desc: 'Granular RBAC for SuperAdmin, Owner, and Cashier roles. Every API request is JWT-validated at the server.',
  },
  {
    icon: Package,
    title: 'Smart Inventory',
    desc: 'Automatic low-stock alerts, reorder thresholds, and category-level stock visibility across your entire catalogue.',
  },
  {
    icon: Users,
    title: 'Staff Management',
    desc: 'Track cashier performance, monitor shift durations, and review individual transaction histories effortlessly.',
  },
  {
    icon: TrendingUp,
    title: 'Financial Reports',
    desc: 'Monthly P&L, expense breakdowns, and YTD revenue summaries exported-ready in one premium dashboard.',
  },
=======
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
>>>>>>> b72e8c4 (feat: dynamic multi-currency support, edge function fixes)
];

const STATS = [
  { value: '2,400+', label: 'Businesses Powered' },
<<<<<<< HEAD
  { value: '$180M+', label: 'Transactions Processed' },
=======
  { value: 'KSh 180M+', label: 'Transactions Processed' },
>>>>>>> b72e8c4 (feat: dynamic multi-currency support, edge function fixes)
  { value: '99.9%', label: 'Platform Uptime' },
  { value: '<3s', label: 'Avg Checkout Time' },
];

const REVIEWS = [
<<<<<<< HEAD
  {
    name: 'Marcus T.',
    role: 'Owner, City Bakehouse',
    avatar: 'MT',
    rating: 5,
    text: 'PosifyPro completely transformed how we run our bakery. The real-time analytics alone saved us 4 hours of manual reporting every week. Worth every penny.',
    img: 'https://miaoda-site-img.s3cdn.medo.dev/images/KLing_47da78ec-752f-4500-bf49-026c9f8947d3.jpg',
  },
  {
    name: 'Priya S.',
    role: 'Owner, Spice Garden Restaurant',
    avatar: 'PS',
    rating: 5,
    text: 'The multi-role access is a game-changer. My cashiers see exactly what they need, and I get the full financial picture. The dashboard is genuinely beautiful.',
    img: 'https://miaoda-site-img.s3cdn.medo.dev/images/KLing_12f25b70-5324-4472-8c4e-3d87591c974f.jpg',
  },
  {
    name: 'James O.',
    role: 'Owner, Blue Wave Café',
    avatar: 'JO',
    rating: 5,
    text: 'Switched from our old clunky system in an afternoon. The one-time license means no monthly surprises. The POS is fast, clean, and my staff picked it up instantly.',
    img: 'https://miaoda-site-img.s3cdn.medo.dev/images/KLing_25025eb9-d5da-4f2d-853d-8f8464383dbf.jpg',
  },
  {
    name: 'Amelia K.',
    role: 'Owner, Bloom Boutique',
    avatar: 'AK',
    rating: 5,
    text: "Inventory tracking finally makes sense. I can see stock levels across all categories in one view and the reorder alerts mean I've never run out of a bestseller again.",
    img: 'https://miaoda-site-img.s3cdn.medo.dev/images/KLing_47da78ec-752f-4500-bf49-026c9f8947d3.jpg',
  },
  {
    name: 'David L.',
    role: 'Owner, Fresh Market Co.',
    avatar: 'DL',
    rating: 5,
    text: 'The staff performance module is outstanding. I can see who is processing the most transactions and where bottlenecks occur. Decision-making is now data-driven.',
    img: 'https://miaoda-site-img.s3cdn.medo.dev/images/KLing_12f25b70-5324-4472-8c4e-3d87591c974f.jpg',
  },
  {
    name: 'Sofia R.',
    role: 'Owner, The Corner Deli',
    avatar: 'SR',
    rating: 5,
    text: "I was sceptical about a one-time license model but PosifyPro proved me wrong. Regular updates, premium support, and the product keeps getting better every month.",
    img: 'https://miaoda-site-img.s3cdn.medo.dev/images/KLing_25025eb9-d5da-4f2d-853d-8f8464383dbf.jpg',
  },
];

const PRICING_FEATURES = [
  'Unlimited transactions',
  'Up to 20 cashier accounts',
  'Real-time sales dashboard',
  'Inventory & stock alerts',
  'Staff performance tracking',
  'Financial reports & P&L',
  'Role-based access control',
  'Lifetime license — pay once',
  'Free product updates',
  'Priority email support',
];

const NAV_LINKS = ['Features', 'Pricing', 'Reviews'];

/* ─── sub-components ─── */
function StarRating({ count }: { count: number }) {
  return (
    <div className="flex gap-0.5">
      {Array.from({ length: count }).map((_, i) => (
        <Star key={i} className="w-4 h-4 fill-[#F59E0B] text-[#F59E0B]" />
      ))}
    </div>
  );
}

/* ─── main component ─── */
export default function LandingPage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const scrollTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
    setMobileMenuOpen(false);
  };

  return (
    <div className="min-h-screen bg-white font-inter antialiased overflow-x-hidden">

      {/* ── NAVBAR ── */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-[#0F172A]/95 backdrop-blur-md border-b border-white/5">
        <div className="max-w-7xl mx-auto px-4 md:px-8 h-16 flex items-center justify-between gap-4">
          {/* Logo */}
          <div className="flex items-center gap-2 shrink-0">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: E }}>
              <CreditCard className="w-4 h-4 text-white" />
            </div>
            <span className="text-white font-bold text-xl tracking-tight">posify<span style={{ color: E }}>pro</span></span>
          </div>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-8">
            {NAV_LINKS.map(l => (
              <button key={l} onClick={() => scrollTo(l.toLowerCase())}
                className="text-sm text-slate-300 hover:text-white transition-colors duration-150 font-medium">
                {l}
              </button>
            ))}
          </nav>

          {/* Desktop CTA */}
          <div className="hidden md:flex items-center gap-3 shrink-0">
            <Link to="/login">
              <Button variant="ghost" size="sm" className="h-9 text-slate-300 hover:text-white border border-white/15 hover:bg-white/10 font-medium">
=======
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
>>>>>>> b72e8c4 (feat: dynamic multi-currency support, edge function fixes)
                Sign In
              </Button>
            </Link>
            <Link to="/register">
<<<<<<< HEAD
              <Button size="sm" className="h-9 font-semibold gap-1.5 text-white" style={{ background: E, border: 'none' }}>
                Get Started <ChevronRight className="w-4 h-4" />
=======
              <Button className="h-9 text-sm font-semibold text-slate-900"
                style={{ background: '#2563EB' }}>
                Get Started <ArrowRight className="w-3.5 h-3.5 ml-1" />
>>>>>>> b72e8c4 (feat: dynamic multi-currency support, edge function fixes)
              </Button>
            </Link>
          </div>

<<<<<<< HEAD
          {/* Mobile hamburger */}
          <button className="md:hidden text-white p-1" onClick={() => setMobileMenuOpen(v => !v)}>
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

        {/* Mobile menu */}
        {mobileMenuOpen && (
          <div className="md:hidden bg-[#0F172A] border-t border-white/10 px-4 py-4 space-y-3">
            {NAV_LINKS.map(l => (
              <button key={l} onClick={() => scrollTo(l.toLowerCase())}
                className="block w-full text-left text-slate-300 hover:text-white text-sm font-medium py-2">
                {l}
              </button>
            ))}
            <div className="pt-2 flex flex-col gap-2">
              <Link to="/login" onClick={() => setMobileMenuOpen(false)}>
                <Button variant="outline" className="w-full h-10 border-white/20 text-slate-200 bg-transparent hover:bg-white/10 hover:text-white font-medium">Sign In</Button>
              </Link>
              <Link to="/register" onClick={() => setMobileMenuOpen(false)}>
                <Button className="w-full h-10 font-semibold text-white" style={{ background: E, border: 'none' }}>Get Started</Button>
=======
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
>>>>>>> b72e8c4 (feat: dynamic multi-currency support, edge function fixes)
              </Link>
            </div>
          </div>
        )}
<<<<<<< HEAD
      </header>

      {/* ── HERO ── */}
      <section className="relative pt-16 min-h-[92vh] flex items-center overflow-hidden" style={{ background: 'linear-gradient(135deg, #0F172A 0%, #1E293B 60%, #0F2A1A 100%)' }}>
        {/* subtle grid overlay */}
        <div className="absolute inset-0 opacity-[0.04]"
          style={{ backgroundImage: 'linear-gradient(#10B981 1px, transparent 1px), linear-gradient(90deg, #10B981 1px, transparent 1px)', backgroundSize: '60px 60px' }} />

        {/* emerald glow */}
        <div className="absolute top-1/3 right-1/4 w-96 h-96 rounded-full blur-[120px] opacity-15" style={{ background: E }} />
        <div className="absolute bottom-1/4 left-1/4 w-64 h-64 rounded-full blur-[100px] opacity-10" style={{ background: E }} />

        <div className="relative max-w-7xl mx-auto px-4 md:px-8 py-20 md:py-28 w-full">
          <div className="max-w-3xl">
            <Badge className="mb-6 text-xs font-semibold px-3 py-1 rounded-full border-0 text-white" style={{ background: `${E}22`, color: E }}>
              ✦ The #1 POS System for Growing Businesses
            </Badge>

            <h1 className="text-4xl md:text-6xl font-bold text-white leading-[1.1] mb-6 text-balance">
              Run Your Business<br />
              <span style={{ color: E }}>Smarter, Faster,</span><br />
              With Confidence.
            </h1>

            <p className="text-lg md:text-xl text-slate-300 leading-relaxed mb-10 max-w-xl text-pretty">
              PosifyPro is the all-in-one point-of-sale platform trusted by 2,400+ businesses. One-time payment. Lifetime access. No subscriptions.
            </p>

            <div className="flex flex-col sm:flex-row gap-4">
              <Link to="/register">
                <Button size="lg" className="h-13 px-8 text-base font-bold text-white gap-2 shadow-lg shadow-emerald-900/40 hover:opacity-90 transition-opacity" style={{ background: E, border: 'none' }}>
                  Start Free Trial <ArrowRight className="w-5 h-5" />
                </Button>
              </Link>
              <Link to="/login">
                <Button size="lg" variant="ghost" className="h-13 px-8 text-base font-semibold border border-white/20 text-white hover:bg-white/10 gap-2">
                  Sign In to Dashboard
                </Button>
              </Link>
            </div>

            {/* trust badges */}
            <div className="mt-12 flex flex-wrap items-center gap-6">
              {['No monthly fees', 'One-time license', 'Free updates'].map(t => (
                <div key={t} className="flex items-center gap-1.5 text-sm text-slate-400">
                  <CheckCircle className="w-4 h-4 shrink-0" style={{ color: E }} />
                  <span>{t}</span>
                </div>
              ))}
            </div>
          </div>

          {/* hero image — offset right on large screens */}
          <div className="hidden xl:block absolute right-8 top-1/2 -translate-y-1/2 w-[480px]">
            <div className="relative rounded-2xl overflow-hidden shadow-2xl shadow-black/50 ring-1 ring-white/10">
              <img
                src="https://miaoda-site-img.s3cdn.medo.dev/images/KLing_06975c56-ded8-48ef-af5d-a13bfa6f7f83.jpg"
                alt="PosifyPro analytics dashboard"
                className="w-full h-[340px] object-cover"
              />
              {/* floating card */}
              <div className="absolute bottom-4 left-4 right-4 bg-[#0F172A]/90 backdrop-blur-sm rounded-xl p-4 flex items-center gap-3 border border-white/10">
                <div className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0" style={{ background: `${E}22` }}>
                  <TrendingUp className="w-5 h-5" style={{ color: E }} />
                </div>
                <div>
                  <p className="text-white font-bold text-lg leading-none">+34.2% Profit</p>
                  <p className="text-slate-400 text-xs mt-0.5">vs last month</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── STATS BAR ── */}
      <section className="bg-[#0F172A] border-b border-white/5">
        <div className="max-w-7xl mx-auto px-4 md:px-8 py-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {STATS.map(s => (
              <div key={s.label} className="text-center">
                <p className="text-3xl md:text-4xl font-bold" style={{ color: E }}>{s.value}</p>
                <p className="text-slate-400 text-sm mt-1">{s.label}</p>
=======
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
>>>>>>> b72e8c4 (feat: dynamic multi-currency support, edge function fixes)
              </div>
            ))}
          </div>
        </div>
      </section>

<<<<<<< HEAD
      {/* ── FEATURES ── */}
      <section id="features" className="bg-slate-50 py-20 md:py-28">
        <div className="max-w-7xl mx-auto px-4 md:px-8">
          <div className="text-center mb-16">
            <Badge className="mb-4 text-xs font-semibold px-3 py-1 rounded-full border-0" style={{ background: `${E}18`, color: E }}>
              Everything You Need
            </Badge>
            <h2 className="text-3xl md:text-5xl font-bold text-[#0F172A] mb-4 text-balance">
              Built for Real Business Owners
            </h2>
            <p className="text-lg text-slate-500 max-w-xl mx-auto text-pretty">
              Every feature was designed with speed, clarity, and profitability in mind — from the first transaction to your thousandth.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {FEATURES.map((f, i) => (
              <div key={i} className="bg-white rounded-2xl p-8 border border-slate-100 hover:border-emerald-200 hover:shadow-lg hover:shadow-emerald-50 transition-all duration-200 group h-full flex flex-col">
                <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-5 shrink-0 group-hover:scale-110 transition-transform duration-200"
                  style={{ background: `${E}15` }}>
                  <f.icon className="w-6 h-6" style={{ color: E }} />
                </div>
                <h3 className="text-lg font-bold text-[#0F172A] mb-3 text-balance">{f.title}</h3>
                <p className="text-slate-500 text-sm leading-relaxed flex-1 text-pretty">{f.desc}</p>
=======
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
>>>>>>> b72e8c4 (feat: dynamic multi-currency support, edge function fixes)
              </div>
            ))}
          </div>
        </div>
      </section>

<<<<<<< HEAD
      {/* ── SCREENSHOT / CTA SPLIT ── */}
      <section className="bg-white py-20 md:py-28 overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 md:px-8">
          <div className="flex flex-col xl:flex-row items-center gap-12 xl:gap-16">
            {/* image */}
            <div className="w-full xl:w-1/2 shrink-0">
              <div className="relative rounded-2xl overflow-hidden shadow-2xl shadow-slate-200 ring-1 ring-slate-100">
                <img
                  src="https://miaoda-site-img.s3cdn.medo.dev/images/KLing_4e521e1f-978e-4f45-9dcf-dadfa6b3ffa2.jpg"
                  alt="Modern POS terminal in use"
                  className="w-full h-[360px] md:h-[420px] object-cover"
                />
              </div>
            </div>
            {/* copy */}
            <div className="w-full xl:w-1/2">
              <Badge className="mb-5 text-xs font-semibold px-3 py-1 rounded-full border-0" style={{ background: `${E}15`, color: E }}>
                Designed for Speed
              </Badge>
              <h2 className="text-3xl md:text-4xl font-bold text-[#0F172A] mb-5 text-balance">
                A POS Interface Your Team Will Actually Love
              </h2>
              <p className="text-slate-500 text-base leading-relaxed mb-8 text-pretty">
                Our cashier interface strips away the clutter. Product grid on the left, live cart on the right — checkout in under 3 taps. Onboarding takes minutes, not days.
              </p>
              <ul className="space-y-3 mb-10">
                {['Product search & category filters', 'Cash, card & mobile payment support', 'Instant receipt generation', 'Per-cashier performance tracking'].map(item => (
                  <li key={item} className="flex items-center gap-3 text-sm text-slate-600">
                    <CheckCircle className="w-5 h-5 shrink-0" style={{ color: E }} />
                    {item}
                  </li>
                ))}
              </ul>
              <Link to="/register">
                <Button size="lg" className="h-12 px-8 font-bold text-white gap-2" style={{ background: E, border: 'none' }}>
                  Try It Free <ArrowRight className="w-4 h-4" />
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── REVIEWS ── */}
      <section id="reviews" className="bg-slate-50 py-20 md:py-28">
        <div className="max-w-7xl mx-auto px-4 md:px-8">
          <div className="text-center mb-16">
            <Badge className="mb-4 text-xs font-semibold px-3 py-1 rounded-full border-0" style={{ background: `${E}18`, color: E }}>
              Customer Reviews
            </Badge>
            <h2 className="text-3xl md:text-5xl font-bold text-[#0F172A] mb-4 text-balance">
              Trusted by Business Owners Everywhere
            </h2>
            <p className="text-lg text-slate-500 max-w-xl mx-auto text-pretty">
              Don't just take our word for it — here's what our customers say.
            </p>
            {/* aggregate rating */}
            <div className="flex items-center justify-center gap-3 mt-6">
              <StarRating count={5} />
              <span className="text-[#0F172A] font-bold text-lg">4.9</span>
              <span className="text-slate-400 text-sm">from 840+ reviews</span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {REVIEWS.map((r, i) => (
              <div key={i} className="bg-white rounded-2xl p-8 border border-slate-100 hover:shadow-lg transition-shadow duration-200 flex flex-col h-full">
                <StarRating count={r.rating} />
                <p className="text-slate-600 text-sm leading-relaxed mt-4 flex-1 text-pretty">"{r.text}"</p>
                <div className="flex items-center gap-3 mt-6 pt-5 border-t border-slate-100">
                  <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0 font-bold text-sm text-white"
                    style={{ background: '#0F172A' }}>
                    {r.avatar}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-[#0F172A]">{r.name}</p>
=======
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
>>>>>>> b72e8c4 (feat: dynamic multi-currency support, edge function fixes)
                    <p className="text-xs text-slate-400">{r.role}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

<<<<<<< HEAD
      {/* ── PRICING ── */}
      <section id="pricing" className="bg-white py-20 md:py-28">
        <div className="max-w-7xl mx-auto px-4 md:px-8">
          <div className="text-center mb-16">
            <Badge className="mb-4 text-xs font-semibold px-3 py-1 rounded-full border-0" style={{ background: `${E}15`, color: E }}>
              Simple Pricing
            </Badge>
            <h2 className="text-3xl md:text-5xl font-bold text-[#0F172A] mb-4 text-balance">
              One Price. Everything Included.
            </h2>
            <p className="text-lg text-slate-500 max-w-xl mx-auto text-pretty">
              No monthly fees. No per-transaction cuts. No hidden charges. Pay once and own your POS system for life.
            </p>
          </div>

          <div className="max-w-4xl mx-auto">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Free / Starter */}
              <div className="rounded-2xl border border-slate-200 p-8 bg-slate-50 flex flex-col">
                <div className="mb-6">
                  <p className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-2">Starter Trial</p>
                  <p className="text-5xl font-bold text-[#0F172A]">Free<span className="text-lg font-normal text-slate-400"> / 14 days</span></p>
                  <p className="text-slate-500 text-sm mt-2">No credit card required</p>
                </div>
                <ul className="space-y-3 flex-1 mb-8">
                  {['Up to 3 cashier accounts', '500 transactions/month', 'Basic dashboard', 'Email support'].map(f => (
                    <li key={f} className="flex items-center gap-2.5 text-sm text-slate-600">
                      <CheckCircle className="w-4 h-4 shrink-0 text-slate-400" />
=======
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
>>>>>>> b72e8c4 (feat: dynamic multi-currency support, edge function fixes)
                      {f}
                    </li>
                  ))}
                </ul>
                <Link to="/register">
<<<<<<< HEAD
                  <Button variant="outline" size="lg" className="w-full h-12 font-semibold border-slate-300 text-[#0F172A] hover:bg-slate-100">
                    Start Free Trial
                  </Button>
                </Link>
              </div>

              {/* Pro / Lifetime */}
              <div className="rounded-2xl p-8 flex flex-col relative overflow-hidden shadow-xl shadow-emerald-100"
                style={{ background: 'linear-gradient(135deg, #0F172A 0%, #1E293B 100%)' }}>
                {/* glow */}
                <div className="absolute top-0 right-0 w-48 h-48 rounded-full blur-[80px] opacity-20" style={{ background: E }} />

                <div className="relative mb-6">
                  <div className="flex items-center gap-2 mb-2">
                    <p className="text-sm font-semibold uppercase tracking-wider" style={{ color: E }}>Lifetime License</p>
                    <span className="text-xs font-bold px-2 py-0.5 rounded-full text-white" style={{ background: E }}>BEST VALUE</span>
                  </div>
                  <p className="text-5xl font-bold text-white">$299<span className="text-lg font-normal text-slate-400"> one-time</span></p>
                  <p className="text-slate-400 text-sm mt-2">Pay once, use forever</p>
                </div>

                <ul className="space-y-3 flex-1 mb-8 relative">
                  {PRICING_FEATURES.map(f => (
                    <li key={f} className="flex items-center gap-2.5 text-sm text-slate-200">
                      <CheckCircle className="w-4 h-4 shrink-0" style={{ color: E }} />
                      {f}
                    </li>
                  ))}
                </ul>

                <Link to="/register" className="relative">
                  <Button size="lg" className="w-full h-12 font-bold text-white gap-2 hover:opacity-90 transition-opacity" style={{ background: E, border: 'none' }}>
                    Get Lifetime Access <ArrowRight className="w-4 h-4" />
                  </Button>
                </Link>
              </div>
            </div>

            {/* money-back */}
            <div className="flex items-center justify-center gap-3 mt-8 text-slate-500 text-sm">
              <ShieldCheck className="w-5 h-5 shrink-0" style={{ color: E }} />
              <span>30-day money-back guarantee — no questions asked</span>
=======
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
>>>>>>> b72e8c4 (feat: dynamic multi-currency support, edge function fixes)
            </div>
          </div>
        </div>
      </section>

<<<<<<< HEAD
      {/* ── BOTTOM CTA BAND ── */}
      <section className="py-20" style={{ background: 'linear-gradient(135deg, #0F172A 0%, #0F2A1A 100%)' }}>
        <div className="max-w-3xl mx-auto px-4 text-center">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-6" style={{ background: `${E}20` }}>
            <Building2 className="w-8 h-8" style={{ color: E }} />
          </div>
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4 text-balance">
            Ready to Transform Your Business?
          </h2>
          <p className="text-lg text-slate-300 mb-8 text-pretty">
            Join 2,400+ businesses already running on PosifyPro. Set up your store in under 10 minutes.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/register">
              <Button size="lg" className="h-13 px-10 font-bold text-white gap-2 shadow-lg hover:opacity-90 transition-opacity" style={{ background: E, border: 'none' }}>
                Get Started Today <ArrowRight className="w-5 h-5" />
              </Button>
            </Link>
            <Link to="/login">
              <Button size="lg" variant="ghost" className="h-13 px-10 font-semibold border border-white/20 text-white hover:bg-white/10">
                Sign In
              </Button>
            </Link>
          </div>
          <div className="mt-6 flex items-center justify-center gap-2 text-slate-400 text-sm">
            <Clock className="w-4 h-4 shrink-0" />
            <span>Setup takes under 10 minutes — no technical knowledge required</span>
          </div>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="bg-[#0F172A] border-t border-white/5 py-12">
        <div className="max-w-7xl mx-auto px-4 md:px-8">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-8">
            {/* brand */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: E }}>
                  <CreditCard className="w-4 h-4 text-white" />
                </div>
                <span className="text-white font-bold text-xl tracking-tight">posify<span style={{ color: E }}>pro</span></span>
              </div>
              <p className="text-slate-500 text-sm max-w-xs text-pretty">
                The professional point-of-sale platform for modern retail and hospitality businesses.
              </p>
            </div>

            {/* links */}
            <div className="flex flex-wrap gap-x-8 gap-y-3">
              {[
                { label: 'Features', action: () => scrollTo('features') },
                { label: 'Pricing', action: () => scrollTo('pricing') },
                { label: 'Reviews', action: () => scrollTo('reviews') },
              ].map(l => (
                <button key={l.label} onClick={l.action}
                  className="text-slate-400 hover:text-white text-sm transition-colors duration-150">
                  {l.label}
                </button>
              ))}
              <Link to="/login" className="text-slate-400 hover:text-white text-sm transition-colors duration-150">Sign In</Link>
              <Link to="/register" className="text-sm font-semibold transition-colors duration-150" style={{ color: E }}>Get Started</Link>
            </div>
          </div>

          <div className="mt-10 pt-8 border-t border-white/5 flex flex-col md:flex-row items-center justify-between gap-3 text-slate-500 text-xs">
            <p>© 2026 PosifyPro. All rights reserved.</p>
            <div className="flex gap-6">
              <span className="hover:text-slate-300 cursor-pointer transition-colors">Privacy Policy</span>
              <span className="hover:text-slate-300 cursor-pointer transition-colors">Terms of Service</span>
              <span className="hover:text-slate-300 cursor-pointer transition-colors">Support</span>
=======
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
>>>>>>> b72e8c4 (feat: dynamic multi-currency support, edge function fixes)
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
<<<<<<< HEAD
}
=======
}
>>>>>>> b72e8c4 (feat: dynamic multi-currency support, edge function fixes)
