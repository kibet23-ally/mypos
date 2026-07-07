import type { LucideIcon } from 'lucide-react';
import { Construction } from 'lucide-react';

interface ComingSoonPageProps {
  title: string;
  description?: string;
  icon?: LucideIcon;
}

export default function ComingSoonPage({ title, description, icon: Icon = Construction }: ComingSoonPageProps) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
      <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-5 bg-blue-50 border border-blue-100">
        <Icon className="w-8 h-8 text-blue-500" />
      </div>
      <h1 className="text-xl font-bold text-slate-900 mb-2">{title}</h1>
      <p className="text-sm text-slate-500 max-w-sm">
        {description ?? 'This module is coming soon. Check back for updates.'}
      </p>
      <div className="mt-6 inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-semibold text-blue-600 border border-blue-200 bg-blue-50">
        <Construction className="w-3.5 h-3.5" />
        Coming Soon
      </div>
    </div>
  );
}
