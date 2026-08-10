import { useEffect, useRef, useState } from 'react';

/** Fades and lifts a block into place the first time it enters the viewport. */
export function Reveal({ children, delay = 0, className = '', as: Tag = 'div' }) {
  const ref = useRef(null);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setShown(true);
      return undefined;
    }
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setShown(true);
          observer.disconnect();
        }
      },
      { threshold: 0.18, rootMargin: '0px 0px -8% 0px' },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <Tag
      ref={ref}
      style={{ transitionDelay: `${delay}ms` }}
      className={`transition-all duration-700 ease-out ${
        shown ? 'translate-y-0 opacity-100 blur-0' : 'translate-y-8 opacity-0 blur-[2px]'
      } ${className}`}
    >
      {children}
    </Tag>
  );
}

/** Counts up to `value` once scrolled into view. */
export function Counter({ value, suffix = '', prefix = '', duration = 1400 }) {
  const ref = useRef(null);
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setDisplay(value);
      return undefined;
    }
    let raf = 0;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        observer.disconnect();
        const start = performance.now();
        const tick = (now) => {
          const t = Math.min(1, (now - start) / duration);
          // easeOutExpo — fast start, gentle landing.
          const eased = t === 1 ? 1 : 1 - 2 ** (-10 * t);
          setDisplay(Math.round(value * eased));
          if (t < 1) raf = requestAnimationFrame(tick);
        };
        raf = requestAnimationFrame(tick);
      },
      { threshold: 0.5 },
    );
    observer.observe(el);
    return () => {
      observer.disconnect();
      cancelAnimationFrame(raf);
    };
  }, [value, duration]);

  return (
    <span ref={ref}>
      {prefix}
      {display.toLocaleString()}
      {suffix}
    </span>
  );
}

/** Endless horizontal ticker of hackathon themes. */
export function Marquee({ items, speed = 32 }) {
  return (
    <div className="relative overflow-hidden py-3 [mask-image:linear-gradient(90deg,transparent,#000_12%,#000_88%,transparent)]">
      <div className="flex w-max animate-marquee gap-3" style={{ animationDuration: `${speed}s` }}>
        {[...items, ...items].map((item, i) => (
          <span
            key={`${item}-${i}`}
            className="whitespace-nowrap rounded-full border border-white/15 bg-white/5 px-4 py-1.5 text-sm text-slate-200 backdrop-blur"
          >
            {item}
          </span>
        ))}
      </div>
    </div>
  );
}

/** Types out a set of lines like a terminal once it scrolls into view. */
export function Terminal({ lines }) {
  const ref = useRef(null);
  const [typed, setTyped] = useState('');
  const full = lines.join('\n');

  useEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setTyped(full);
      return undefined;
    }
    let timer = 0;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        observer.disconnect();
        let i = 0;
        const step = () => {
          i += 1;
          setTyped(full.slice(0, i));
          if (i < full.length) timer = setTimeout(step, full[i] === '\n' ? 220 : 18);
        };
        step();
      },
      { threshold: 0.4 },
    );
    observer.observe(el);
    return () => {
      observer.disconnect();
      clearTimeout(timer);
    };
  }, [full]);

  return (
    <div
      ref={ref}
      className="overflow-hidden rounded-2xl border border-white/10 bg-slate-950/70 shadow-2xl backdrop-blur"
    >
      <div className="flex items-center gap-1.5 border-b border-white/10 px-4 py-2.5">
        <span className="h-2.5 w-2.5 rounded-full bg-rose-500/80" />
        <span className="h-2.5 w-2.5 rounded-full bg-amber-400/80" />
        <span className="h-2.5 w-2.5 rounded-full bg-emerald-400/80" />
        <span className="ml-2 text-[11px] font-medium text-slate-500">hacktrack — assistant</span>
      </div>
      <pre className="min-h-[168px] whitespace-pre-wrap px-4 py-4 font-mono text-[13px] leading-relaxed text-emerald-300">
        {typed}
        <span className="ml-0.5 inline-block h-4 w-2 animate-pulse bg-emerald-300 align-middle" />
      </pre>
    </div>
  );
}
