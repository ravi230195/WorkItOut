import { useEffect, useRef } from 'react';

export function useScrollToTop() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Scroll to top when component mounts
    if (containerRef.current) {
      // Add a small delay to ensure proper rendering
      setTimeout(() => {
        if (containerRef.current) {
          containerRef.current.scrollTop = 0;
        }
      }, 100);
    }
  }, []);

  return containerRef;
}
