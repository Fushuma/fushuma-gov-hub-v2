'use client';

import { useEffect, useState } from 'react';

/**
 * Returns the current timestamp (ms), captured after mount.
 * Returns null during SSR and the initial client render so that
 * time-dependent UI never causes a hydration mismatch.
 */
export function useNow(): number | null {
  const [now, setNow] = useState<number | null>(null);

  useEffect(() => {
    setNow(Date.now());
  }, []);

  return now;
}
