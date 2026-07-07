import { useEffect, type ReactNode } from 'react';

interface PageMetaProps {
  title?: string;
  description?: string;
}

/** Sets document <title> and meta description for a page */
export default function PageMeta({ title, description }: PageMetaProps) {
  useEffect(() => {
    if (title) {
      document.title = `${title} — MyPOS`;
    }
    if (description) {
      let meta = document.querySelector('meta[name="description"]') as HTMLMetaElement | null;
      if (!meta) {
        meta = document.createElement('meta');
        meta.name = 'description';
        document.head.appendChild(meta);
      }
      meta.content = description;
    }
  }, [title, description]);

  return null;
}

/** Root wrapper used in main.tsx — no-op passthrough */
export function AppWrapper({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
