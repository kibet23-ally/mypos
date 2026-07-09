import { createContext, useContext } from 'react';

interface DashboardNavContextValue {
  /** Switch the active sidebar section by nav key (e.g. 'ow-pos', 'ow-customers') */
  navigate: (key: string) => void;
}

export const DashboardNavContext = createContext<DashboardNavContextValue>({
  navigate: () => {
    console.warn('[DashboardNavContext] navigate() called outside DashboardPage provider');
  },
});

/** Lets any page rendered inside DashboardPage switch sidebar sections
 *  programmatically — e.g. a "Quick Actions" button jumping to POS. */
export function useDashboardNav() {
  return useContext(DashboardNavContext);
}
