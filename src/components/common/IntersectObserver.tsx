import { useEffect } from 'react';

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
