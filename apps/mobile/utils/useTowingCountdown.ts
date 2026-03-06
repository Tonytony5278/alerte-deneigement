import { useState, useEffect } from 'react';

/**
 * Live countdown for imminent towing. Updates every 30 seconds.
 * Returns a string like "1h 42min" or "12 min", or null if not applicable.
 */
export function useTowingCountdown(
  dateDebPlanif: string | null | undefined,
  towingStatus: string | undefined
): string | null {
  const [countdown, setCountdown] = useState<string | null>(null);

  useEffect(() => {
    if (towingStatus !== 'imminent' || !dateDebPlanif) {
      setCountdown(null);
      return;
    }

    function compute() {
      const target = new Date(dateDebPlanif!).getTime();
      const diffMs = target - Date.now();

      if (diffMs <= 0) {
        setCountdown(null);
        return;
      }

      const totalMin = Math.ceil(diffMs / 60_000);
      const hours = Math.floor(totalMin / 60);
      const min = totalMin % 60;

      if (hours > 0) {
        setCountdown(`${hours}h ${min.toString().padStart(2, '0')}min`);
      } else {
        setCountdown(`${min} min`);
      }
    }

    compute();
    const interval = setInterval(compute, 30_000);
    return () => clearInterval(interval);
  }, [dateDebPlanif, towingStatus]);

  return countdown;
}
