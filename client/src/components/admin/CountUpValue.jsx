import { useEffect, useMemo, useState } from "react";

const formatValue = (value) => {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return String(value ?? 0);

  if (numeric % 1 !== 0) {
    return numeric.toLocaleString(undefined, {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2
    });
  }

  return numeric.toLocaleString();
};

const CountUpValue = ({ value, duration = 900, prefix = "", suffix = "" }) => {
  const target = useMemo(() => Number(value || 0), [value]);
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    let raf = 0;
    const start = performance.now();
    const from = 0;

    const tick = (now) => {
      const progress = Math.min((now - start) / duration, 1);
      const eased = 1 - (1 - progress) ** 3;
      const nextValue = from + (target - from) * eased;
      setDisplay(nextValue);

      if (progress < 1) {
        raf = window.requestAnimationFrame(tick);
      }
    };

    raf = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(raf);
  }, [target, duration]);

  return (
    <span>
      {prefix}
      {formatValue(display)}
      {suffix}
    </span>
  );
};

export default CountUpValue;
