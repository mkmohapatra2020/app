import { useEffect, useState } from 'react';

/** Seconds elapsed while `running` is true (resets each time it starts). */
export default function useElapsed(running) {
  const [elapsed, setElapsed] = useState(0);
  useEffect(() => {
    if (!running) return undefined;
    setElapsed(0);
    const t = setInterval(() => setElapsed((n) => n + 1), 1000);
    return () => clearInterval(t);
  }, [running]);
  return elapsed;
}
