import { useEffect, useState } from 'react';

type CountUpProps = {
  end: number;
  duration?: number;
  decimals?: number;
  prefix?: string;
  suffix?: string;
  className?: string;
  play?: boolean;
  delayMs?: number;
};

function prefersReducedMotion() {
  return typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export function CountUp({
  end,
  duration = 900,
  decimals = 0,
  prefix = '',
  suffix = '',
  className,
  play = true,
  delayMs = 0,
}: CountUpProps) {
  const [value, setValue] = useState(0);
  const [hasPlayed, setHasPlayed] = useState(() => prefersReducedMotion() && play);

  useEffect(() => {
    if (!play || hasPlayed) {
      return;
    }

    if (prefersReducedMotion()) {
      setValue(end);
      setHasPlayed(true);
      return;
    }

    let frame = 0;
    let timeout = 0;

    const startAnimation = () => {
      const start = performance.now();

      const tick = (now: number) => {
        const progress = Math.min((now - start) / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 3);
        setValue(end * eased);

        if (progress < 1) {
          frame = window.requestAnimationFrame(tick);
        } else {
          setHasPlayed(true);
        }
      };

      frame = window.requestAnimationFrame(tick);
    };

    timeout = window.setTimeout(startAnimation, delayMs);

    return () => {
      window.clearTimeout(timeout);
      window.cancelAnimationFrame(frame);
    };
  }, [delayMs, duration, end, hasPlayed, play]);

  return <span className={className}>{`${prefix}${value.toFixed(decimals)}${suffix}`}</span>;
}
