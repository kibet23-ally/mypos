<<<<<<< HEAD
import { HelmetProvider, Helmet } from "react-helmet-async";
import { TooltipProvider } from "@/components/ui/tooltip";

const PageMeta = ({
  title,
  description,
}: {
  title: string;
  description: string;
}) => (
  <Helmet>
    <title>{title}</title>
    <meta name="description" content={description} />
  </Helmet>
);

export const AppWrapper = ({ children }: { children: React.ReactNode }) => (
  <HelmetProvider>
    <TooltipProvider>
      {children}
    </TooltipProvider>
  </HelmetProvider>
);

export default PageMeta;
=======
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
>>>>>>> b72e8c4 (feat: dynamic multi-currency support, edge function fixes)
