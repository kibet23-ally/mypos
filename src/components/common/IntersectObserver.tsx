import { useEffect } from 'react';
<<<<<<< HEAD
import { useLocation } from 'react-router-dom';
import { Observer } from 'tailwindcss-intersect';

const IntersectObserver = () => {
  const location = useLocation();

  useEffect(() => {
    // When the location changes, we need to restart the observer
    // to pick up new elements on the page.
    // We use a small timeout to ensure the DOM has updated.
    const timer = setTimeout(() => {
        Observer.restart();
    }, 100);

    return () => clearTimeout(timer);
  }, [location]);

  return null;
};

export default IntersectObserver;
=======

/**
 * Sets up IntersectionObserver to add `intersect` class to elements
 * that have the `intersect-once` or `intersect` data attributes.
 * Used for scroll-based entrance animations via tailwindcss-intersect.
 */
export default function IntersectObserver() {
  useEffect(() => {
    if (typeof window === 'undefined' || !('IntersectionObserver' in window)) return;

    const observer = new window.IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('intersected');
          }
        });
      },
      { threshold: 0.1 }
    );

    const targets = document.querySelectorAll('[data-intersect], .intersect-once, .intersect');
    targets.forEach((el) => observer.observe(el));

    return () => observer.disconnect();
  }, []);

  return null;
}
>>>>>>> b72e8c4 (feat: dynamic multi-currency support, edge function fixes)
