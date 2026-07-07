import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/db/supabase';
import { toast } from 'sonner';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  ShoppingCart, Loader2, CheckCircle2, ChevronRight,
  ShoppingBasket, UtensilsCrossed, Shirt, Pill,
  Cpu, Scissors, Store,
} from 'lucide-react';
import type { BusinessTemplate, BusinessType } from '@/types/index';

// ─── Icon map (matches template.icon strings) ─────────────────────────────────
const ICON_MAP: Record<string, React.ElementType> = {
  ShoppingBasket, UtensilsCrossed, Shirt, Pill, Cpu, Scissors, Store,
};

type Step = 'choose' | 'loading' | 'done';

export default function OnboardingPage() {
  const { appUser, refreshUser } = useAuth();
  const navigate = useNavigate();

  const [step, setStep]               = useState<Step>('choose');
  const [templates, setTemplates]     = useState<BusinessTemplate[]>([]);
  const [loadingTmpl, setLoadingTmpl] = useState(true);
  const [selected, setSelected]       = useState<BusinessType | null>(null);
  const [applying, setApplying]       = useState(false);
  const [progress, setProgress]       = useState(0);

  // ── Load templates once ───────────────────────────────────────────────────
  useEffect(() => {
    supabase
      .from('business_templates')
      .select('id, business_type, display_name, icon, description, default_categories, default_products, created_at')
      .order('business_type')
      .then(({ data, error }) => {
        if (error) toast.error('Failed to load templates');
        setTemplates((data ?? []) as BusinessTemplate[]);
        setLoadingTmpl(false);
      });
  }, []);

  // ── Guard: already onboarded ──────────────────────────────────────────────
  useEffect(() => {
    if (appUser?.tenant?.onboarding_completed) {
      navigate('/dashboard', { replace: true });
    }
  }, [appUser, navigate]);

  // ── Animated progress bar during seeding ─────────────────────────────────
  const runProgressBar = useCallback(() => {
    setProgress(0);
    const steps = [
      { target: 20, delay: 300 },
      { target: 45, delay: 700 },
      { target: 70, delay: 1200 },
      { target: 90, delay: 1800 },
    ];
    steps.forEach(s => {
      setTimeout(() => setProgress(s.target), s.delay);
    });
  }, []);

  // ── Apply template ────────────────────────────────────────────────────────
  const handleApply = async () => {
    if (!selected || !appUser?.tenant_id) return;
    setApplying(true);
    setStep('loading');
    runProgressBar();

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      if (!token) throw new Error('No session token');

      const { data, error } = await supabase.functions.invoke(
        'register-user?action=apply-template',
        {
          method: 'POST',
          body: { tenant_id: appUser.tenant_id, business_type: selected },
        }
      );

      if (error) {
        const msg = await error?.context?.text?.();
        throw new Error(msg || error.message);
      }
      if (data?.error) throw new Error(data.error);

      // Finish progress bar
      setProgress(100);
      await new Promise(r => setTimeout(r, 600));
      setStep('done');
      await refreshUser();
    } catch (err) {
      toast.error((err as Error).message ?? 'Template setup failed');
      setStep('choose');
      setApplying(false);
    }
  };

  const handleContinue = () => navigate('/dashboard', { replace: true });

  const selectedTemplate = templates.find(t => t.business_type === selected);

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-background flex">
      {/* Left brand panel */}
      <div className="hidden lg:flex lg:w-[420px] bg-sidebar flex-col justify-between p-10 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded bg-sidebar-primary flex items-center justify-center shrink-0">
            <ShoppingCart className="w-5 h-5 text-sidebar-primary-foreground" />
          </div>
          <span className="text-xl font-bold text-sidebar-accent-foreground tracking-tight">PosifyPro</span>
        </div>

        <div className="space-y-6">
          <div>
            <h1 className="text-3xl font-bold text-sidebar-accent-foreground leading-tight text-balance">
              Set up your store in seconds
            </h1>
            <p className="mt-3 text-sidebar-foreground text-sm leading-relaxed text-pretty">
              Pick your business type and we'll auto-populate categories and products tailored for your industry.
            </p>
          </div>
          <div className="space-y-3">
            {[
              'Industry-specific product templates',
              'Pre-built categories ready to use',
              'Scalable — add more any time',
              'Safe to re-run — no duplicates',
            ].map(f => (
              <div key={f} className="flex items-center gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-sidebar-primary shrink-0" />
                <span className="text-sm text-sidebar-foreground">{f}</span>
              </div>
            ))}
          </div>
        </div>

        <p className="text-xs text-sidebar-foreground/60">© {new Date().getFullYear()} PosifyPro</p>
      </div>

      {/* Right panel */}
      <div className="flex-1 min-w-0 flex flex-col items-center justify-center p-6">
        {/* Mobile logo */}
        <div className="flex items-center gap-3 mb-8 lg:hidden">
          <div className="w-9 h-9 rounded bg-primary flex items-center justify-center shrink-0">
            <ShoppingCart className="w-5 h-5 text-primary-foreground" />
          </div>
          <span className="text-xl font-bold text-foreground tracking-tight">PosifyPro</span>
        </div>

        <div className="w-full max-w-2xl">

          {/* ── STEP: CHOOSE ─────────────────────────────────────────── */}
          {step === 'choose' && (
            <div className="space-y-6">
              {/* Header */}
              <div className="text-center">
                <Badge variant="secondary" className="mb-3 text-xs">Business Setup</Badge>
                <h2 className="text-2xl font-bold text-foreground text-balance">
                  What kind of business do you run?
                </h2>
                <p className="text-sm text-muted-foreground mt-2 text-pretty">
                  We'll set up your store with the right products and categories automatically.
                </p>
              </div>

              {/* Template grid */}
              {loadingTmpl ? (
                <div className="flex items-center justify-center py-16 gap-2 text-muted-foreground">
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span className="text-sm">Loading options…</span>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {templates.map(t => {
                    const Icon = ICON_MAP[t.icon] ?? Store;
                    const isActive = selected === t.business_type;
                    return (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => setSelected(t.business_type)}
                        className={[
                          'group relative flex items-start gap-4 p-5 rounded-lg border text-left transition-all h-full',
                          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                          isActive
                            ? 'border-primary bg-primary/5 ring-1 ring-primary'
                            : 'border-border bg-card hover:border-primary/40 hover:bg-muted/50',
                        ].join(' ')}
                      >
                        <div className={[
                          'w-11 h-11 rounded-lg flex items-center justify-center shrink-0 transition-colors',
                          isActive ? 'bg-primary' : 'bg-secondary group-hover:bg-primary/10',
                        ].join(' ')}>
                          <Icon className={['w-5 h-5', isActive ? 'text-primary-foreground' : 'text-foreground'].join(' ')} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-2">
                            <p className="text-sm font-semibold text-foreground">{t.display_name}</p>
                            {isActive && <CheckCircle2 className="w-4 h-4 text-primary shrink-0" />}
                          </div>
                          <p className="text-xs text-muted-foreground mt-1 text-pretty line-clamp-2">{t.description}</p>
                          <div className="flex items-center gap-3 mt-2">
                            <span className="text-xs text-muted-foreground">
                              {t.default_categories.length} categories
                            </span>
                            <span className="text-muted-foreground text-xs">·</span>
                            <span className="text-xs text-muted-foreground">
                              {t.default_products.length} products
                            </span>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Preview */}
              {selectedTemplate && (
                <Card className="border border-border bg-muted/40">
                  <CardContent className="p-4">
                    <p className="text-xs font-semibold text-foreground mb-2">
                      Preview — {selectedTemplate.display_name}
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {selectedTemplate.default_categories.map(c => (
                        <Badge key={c.name} variant="secondary" className="text-xs">{c.name}</Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* CTA */}
              <Button
                className="w-full h-11 font-semibold gap-2"
                disabled={!selected || applying}
                onClick={handleApply}
              >
                {applying
                  ? <Loader2 className="w-4 h-4 animate-spin" />
                  : <>Set Up My Store <ChevronRight className="w-4 h-4" /></>}
              </Button>
              <p className="text-center text-xs text-muted-foreground">
                You can edit, add, or remove categories and products anytime.
              </p>
            </div>
          )}

          {/* ── STEP: LOADING ─────────────────────────────────────────── */}
          {step === 'loading' && (
            <div className="flex flex-col items-center justify-center py-16 space-y-8 text-center max-w-sm mx-auto">
              <div className="relative">
                <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center">
                  <ShoppingCart className="w-9 h-9 text-primary animate-pulse" />
                </div>
                <div className="absolute inset-0 rounded-full border-2 border-primary/30 animate-ping" />
              </div>
              <div className="space-y-2">
                <h2 className="text-xl font-bold text-foreground text-balance">
                  Setting up your store…
                </h2>
                <p className="text-sm text-muted-foreground text-pretty">
                  Creating your categories and products. This takes just a moment.
                </p>
              </div>
              {/* Progress bar */}
              <div className="w-full space-y-2">
                <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary rounded-full transition-all duration-700 ease-out"
                    style={{ width: `${progress}%` }}
                  />
                </div>
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>
                    {progress < 30 ? 'Fetching template…'
                      : progress < 60 ? 'Creating categories…'
                      : progress < 90 ? 'Adding products…'
                      : 'Finalising…'}
                  </span>
                  <span>{progress}%</span>
                </div>
              </div>
              {/* Steps */}
              <div className="w-full space-y-2">
                {[
                  { label: 'Template selected',   done: progress >= 20 },
                  { label: 'Categories created',  done: progress >= 50 },
                  { label: 'Products added',       done: progress >= 80 },
                  { label: 'Store ready',          done: progress >= 100 },
                ].map(s => (
                  <div key={s.label} className="flex items-center gap-2.5 text-sm">
                    {s.done
                      ? <CheckCircle2 className="w-4 h-4 text-primary shrink-0" />
                      : <div className="w-4 h-4 rounded-full border-2 border-border shrink-0" />}
                    <span className={s.done ? 'text-foreground font-medium' : 'text-muted-foreground'}>
                      {s.label}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── STEP: DONE ────────────────────────────────────────────── */}
          {step === 'done' && (
            <div className="flex flex-col items-center justify-center py-12 space-y-6 text-center max-w-sm mx-auto">
              <div className="w-20 h-20 rounded-full bg-[hsl(152_76%_94%)] flex items-center justify-center">
                <CheckCircle2 className="w-10 h-10 text-[hsl(152_76%_35%)]" />
              </div>
              <div className="space-y-2">
                <h2 className="text-2xl font-bold text-foreground text-balance">Your store is ready!</h2>
                <p className="text-sm text-muted-foreground text-pretty">
                  {selectedTemplate?.display_name} template applied —{' '}
                  <strong className="text-foreground">{selectedTemplate?.default_categories.length} categories</strong> and{' '}
                  <strong className="text-foreground">{selectedTemplate?.default_products.length} products</strong> are waiting for you.
                </p>
              </div>
              {/* Summary badges */}
              {selectedTemplate && (
                <div className="flex flex-wrap gap-1.5 justify-center">
                  {selectedTemplate.default_categories.map(c => (
                    <Badge key={c.name} variant="secondary" className="text-xs">{c.name}</Badge>
                  ))}
                </div>
              )}
              <Button className="w-full h-11 font-semibold gap-2" onClick={handleContinue}>
                Go to Dashboard <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
