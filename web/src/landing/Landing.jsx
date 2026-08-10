import { Suspense, lazy, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../lib/auth.jsx';
import { Counter, Marquee, Reveal, Terminal } from './bits.jsx';

// three.js is ~a third of the bundle, and only this page needs it — loading it
// lazily keeps the dashboards' first paint fast.
const Scene3D = lazy(() => import('./Scene3D.jsx'));

const THEMES = [
  'agentic ai', 'language model', 'fintech', 'iot', 'cybersecurity', 'robotics',
  'healthtech', 'open innovation', 'blockchain', 'data science', 'accessibility', 'govtech',
];

const SECTIONS = [
  {
    kicker: '01 — Discover',
    title: 'Every hackathon, one feed',
    body: 'Staff post listings straight into HackTrack. Students open one screen and see everything — sorted by whichever deadline is closest, filtered by their year, theme, mode or prize.',
    points: ['Closest deadline first, always', 'Filter by year, theme, mode, prize', 'Tap through to the official registration page'],
    accent: 'from-cyan-400 to-blue-500',
  },
  {
    kicker: '02 — Never miss it',
    title: 'The deadline finds you',
    body: 'The moment staff publish something you are eligible for, your phone buzzes. Then reminders at 7 days, 3 days, 1 day and on the closing morning — each one more urgent than the last.',
    points: ['Push the second a listing goes live', 'Matched to your year and chosen themes', 'Escalating reminders, never duplicated'],
    accent: 'from-violet-400 to-fuchsia-500',
  },
  {
    kicker: '03 — Get the credit',
    title: 'Wins that stay on the record',
    body: 'Placements, prize money, team members and the problem statement chosen — all captured per hackathon. Searchable years later for reports, resumes and bragging rights.',
    points: ['Public feed of every winning team', 'Your own history on your profile', 'CSV export for department reporting'],
    accent: 'from-amber-300 to-orange-500',
  },
];

const STATS = [
  { value: 8, label: 'hackathons seeded', suffix: '' },
  { value: 4, label: 'deadline reminders each', suffix: '' },
  { value: 34, label: 'API tests passing', suffix: '' },
  { value: 100, label: 'of it in one app', suffix: '%' },
];

export default function Landing() {
  const { user } = useAuth();
  const progressRef = useRef(0);
  const scrollerRef = useRef(null);
  const [progress, setProgress] = useState(0);

  // One scroll listener feeds both the WebGL scene (via a ref, so it never
  // re-renders React) and the progress bar (via state).
  useEffect(() => {
    let raf = 0;
    const update = () => {
      raf = 0;
      const el = scrollerRef.current;
      if (!el) return;
      const total = el.scrollHeight - window.innerHeight;
      const value = total > 0 ? Math.min(1, Math.max(0, window.scrollY / total)) : 0;
      progressRef.current = value;
      setProgress(value);
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };
    update();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
    };
  }, []);

  const dashboardHref = user?.role === 'staff' ? '/admin' : '/';
  const primary = user
    ? { to: dashboardHref, label: 'Open your dashboard →' }
    : { to: '/register', label: 'Create your account →' };

  return (
    <div ref={scrollerRef} className="relative min-h-screen bg-[#05071a] text-white">
      {/* fixed 3D backdrop */}
      <div className="pointer-events-none fixed inset-0 z-0">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_-10%,#1e3a8a_0%,#0b1030_45%,#05071a_100%)]" />
        <Suspense fallback={null}>
          <Scene3D progressRef={progressRef} />
        </Suspense>
        {/* Vignette: keeps the scene from washing out the copy in front of it. */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(5,7,26,0.35)_0%,rgba(5,7,26,0.6)_70%,rgba(5,7,26,0.85)_100%)]" />
      </div>

      {/* scroll progress */}
      <div className="fixed inset-x-0 top-0 z-50 h-0.5 bg-white/10">
        <div
          className="h-full bg-gradient-to-r from-brand-400 via-cyan-300 to-emerald-300 transition-[width] duration-150"
          style={{ width: `${progress * 100}%` }}
        />
      </div>

      {/* nav */}
      <header className="fixed inset-x-0 top-0 z-40 backdrop-blur-sm">
        <nav className="mx-auto flex max-w-5xl items-center justify-between px-5 py-4">
          <span className="flex items-center gap-2 font-bold tracking-tight">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-600 text-sm">H</span>
            HackTrack
          </span>
          <div className="flex items-center gap-2">
            <Link
              to={user ? dashboardHref : '/login'}
              className="rounded-full px-4 py-2 text-sm font-semibold text-slate-200 hover:text-white"
            >
              {user ? 'Dashboard' : 'Sign in'}
            </Link>
            <Link
              to={user ? dashboardHref : '/register'}
              className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-slate-900 transition hover:bg-slate-200"
            >
              {user ? 'Open' : 'Get started'}
            </Link>
          </div>
        </nav>
      </header>

      <main className="relative z-10">
        {/* ---------- hero ---------- */}
        <section className="relative flex min-h-screen flex-col items-center justify-center px-5 text-center">
          {/* Soft halo so the headline reads cleanly over the wireframe core. */}
          <div className="pointer-events-none absolute left-1/2 top-1/2 h-[460px] w-[min(92vw,820px)] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#05071a]/60 blur-3xl" />
          <Reveal>
            <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-4 py-1.5 text-xs font-medium text-cyan-200 backdrop-blur">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-cyan-300" />
              Built for the department. No more Excel sheets.
            </span>
          </Reveal>

          <Reveal delay={120}>
            <h1 className="mt-6 text-5xl font-black leading-[1.05] tracking-tight sm:text-7xl">
              Every hackathon.
              <br />
              <span className="bg-gradient-to-r from-brand-300 via-cyan-300 to-emerald-300 bg-clip-text text-transparent">
                One place.
              </span>
            </h1>
          </Reveal>

          <Reveal delay={240}>
            <p className="mx-auto mt-6 max-w-xl text-base leading-relaxed text-slate-300 sm:text-lg">
              Scattered across email, WhatsApp and a spreadsheet nobody updates — until now.
              Staff post it once. Students find it, get reminded, register, and get the credit.
            </p>
          </Reveal>

          <Reveal delay={360}>
            <div className="mt-9 flex flex-col items-center gap-3 sm:flex-row">
              <Link
                to={primary.to}
                className="rounded-full bg-gradient-to-r from-brand-500 to-cyan-400 px-7 py-3.5 text-sm font-bold text-slate-950 shadow-lg shadow-brand-500/25 transition hover:scale-[1.03] active:scale-95"
              >
                {primary.label}
              </Link>
              {!user && (
                <Link
                  to="/login"
                  className="rounded-full border border-white/20 px-7 py-3.5 text-sm font-semibold text-white transition hover:bg-white/10"
                >
                  I already have an account
                </Link>
              )}
            </div>
          </Reveal>

          <Reveal delay={520} className="mt-14 w-full max-w-3xl">
            <Marquee items={THEMES} />
          </Reveal>

          <div className="absolute bottom-8 flex flex-col items-center gap-2 text-slate-400">
            <span className="text-[11px] uppercase tracking-[0.2em]">Scroll</span>
            <span className="flex h-9 w-5 items-start justify-center rounded-full border border-white/25 p-1">
              <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-white/70" />
            </span>
          </div>
        </section>

        {/* ---------- feature sections ---------- */}
        {SECTIONS.map((section, i) => (
          <section
            key={section.kicker}
            className="flex min-h-screen items-center px-5 py-24"
          >
            <div
              className={`mx-auto grid w-full max-w-5xl items-center gap-10 md:grid-cols-2 ${
                i % 2 === 1 ? 'md:[direction:rtl]' : ''
              }`}
            >
              <div className="rounded-3xl border border-white/10 bg-slate-950/40 p-6 backdrop-blur-sm sm:p-8 md:[direction:ltr]">
                <Reveal>
                  <p
                    className={`bg-gradient-to-r ${section.accent} bg-clip-text text-xs font-bold uppercase tracking-[0.2em] text-transparent`}
                  >
                    {section.kicker}
                  </p>
                </Reveal>
                <Reveal delay={100}>
                  <h2 className="mt-3 text-3xl font-black leading-tight tracking-tight sm:text-5xl">
                    {section.title}
                  </h2>
                </Reveal>
                <Reveal delay={200}>
                  <p className="mt-5 text-base leading-relaxed text-slate-300">{section.body}</p>
                </Reveal>
                <ul className="mt-7 space-y-3">
                  {section.points.map((point, j) => (
                    <Reveal key={point} delay={300 + j * 90} as="li">
                      <span className="flex items-start gap-3 text-sm text-slate-200">
                        <span
                          className={`mt-1 h-2 w-2 shrink-0 rounded-full bg-gradient-to-r ${section.accent}`}
                        />
                        {point}
                      </span>
                    </Reveal>
                  ))}
                </ul>
              </div>

              <Reveal delay={220} className="md:[direction:ltr]">
                <PhoneMock index={i} accent={section.accent} />
              </Reveal>
            </div>
          </section>
        ))}

        {/* ---------- assistant ---------- */}
        <section className="flex min-h-screen items-center px-5 py-24">
          <div className="mx-auto grid w-full max-w-5xl items-center gap-10 md:grid-cols-2">
            <div className="rounded-3xl border border-white/10 bg-slate-950/40 p-6 backdrop-blur-sm sm:p-8">
              <Reveal>
                <p className="bg-gradient-to-r from-emerald-300 to-teal-400 bg-clip-text text-xs font-bold uppercase tracking-[0.2em] text-transparent">
                  04 — Just ask
                </p>
              </Reveal>
              <Reveal delay={100}>
                <h2 className="mt-3 text-3xl font-black leading-tight tracking-tight sm:text-5xl">
                  An assistant that has read everything
                </h2>
              </Reveal>
              <Reveal delay={200}>
                <p className="mt-5 text-base leading-relaxed text-slate-300">
                  It knows every listing in the app and how the app itself works. Ask what you are
                  eligible for, when something closes, or where your achievements live. It answers
                  from live data — and it can only read, never change anything.
                </p>
              </Reveal>
            </div>
            <Reveal delay={200}>
              <Terminal
                lines={[
                  '> which hackathons am I eligible for?',
                  'You are year III. These open hackathons list you as eligible:',
                  '• Bhashini Bhasha Setu Challenge — closes in 6 days',
                  '• Smart Campus IoT Build-off — closes in 11 days',
                  '> how do I turn on notifications?',
                  'Profile → Notifications → Enable push notifications.',
                ]}
              />
            </Reveal>
          </div>
        </section>

        {/* ---------- stats ---------- */}
        <section className="px-5 py-24">
          <div className="mx-auto grid max-w-4xl grid-cols-2 gap-4 md:grid-cols-4">
            {STATS.map((stat, i) => (
              <Reveal key={stat.label} delay={i * 110}>
                <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-6 text-center backdrop-blur">
                  <p className="bg-gradient-to-r from-brand-300 to-cyan-300 bg-clip-text text-3xl font-black text-transparent">
                    <Counter value={stat.value} suffix={stat.suffix} />
                  </p>
                  <p className="mt-1.5 text-xs leading-snug text-slate-400">{stat.label}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </section>

        {/* ---------- final CTA ---------- */}
        <section className="relative flex min-h-[80vh] flex-col items-center justify-center px-5 text-center">
          <div className="pointer-events-none absolute left-1/2 top-1/2 h-[380px] w-[min(92vw,720px)] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#05071a]/60 blur-3xl" />
          <Reveal>
            <h2 className="text-4xl font-black leading-tight tracking-tight sm:text-6xl">
              Ready when you are.
            </h2>
          </Reveal>
          <Reveal delay={140}>
            <p className="mx-auto mt-5 max-w-md text-slate-300">
              Two dashboards, one source of truth. Staff manage, students discover.
            </p>
          </Reveal>
          <Reveal delay={280}>
            <div className="mt-9 flex flex-col items-center gap-3 sm:flex-row">
              <Link
                to={primary.to}
                className="rounded-full bg-white px-8 py-3.5 text-sm font-bold text-slate-950 transition hover:scale-[1.03] active:scale-95"
              >
                {primary.label}
              </Link>
              {!user && (
                <Link
                  to="/login"
                  className="rounded-full border border-white/20 px-8 py-3.5 text-sm font-semibold transition hover:bg-white/10"
                >
                  Sign in
                </Link>
              )}
            </div>
          </Reveal>

          <footer className="mt-24 text-xs text-slate-500">
            HackTrack — department hackathon tracker.
          </footer>
        </section>
      </main>
    </div>
  );
}

/** Small in-page phone mock so each section shows the thing it describes. */
function PhoneMock({ index, accent }) {
  const screens = [
    {
      title: 'Home feed',
      rows: [
        ['FinShield Fintech Sprint', '2 days left', 'bg-rose-500/20 text-rose-200'],
        ['Bhashini Bhasha Setu', '6 days left', 'bg-amber-500/20 text-amber-200'],
        ['Smart Campus IoT', '11 days left', 'bg-emerald-500/20 text-emerald-200'],
      ],
    },
    {
      title: 'Notifications',
      rows: [
        ['New hackathon: AgentCraft', 'just now', 'bg-brand-500/20 text-brand-200'],
        ['3 days left: Bhashini', 'today', 'bg-amber-500/20 text-amber-200'],
        ['Closes today: FinShield', 'urgent', 'bg-rose-500/20 text-rose-200'],
      ],
    },
    {
      title: 'Achievements',
      rows: [
        ['Team Vaayu', 'Winner', 'bg-amber-500/20 text-amber-200'],
        ['Byte Brigade', 'Runner-up', 'bg-slate-500/20 text-slate-200'],
        ['Plot Twist', 'Silver Medal', 'bg-cyan-500/20 text-cyan-200'],
      ],
    },
  ];
  const screen = screens[index % screens.length];

  return (
    <div className="mx-auto w-full max-w-[280px]">
      <div className="rounded-[2rem] border border-white/15 bg-slate-950/60 p-3 shadow-2xl backdrop-blur">
        <div className="rounded-[1.6rem] border border-white/10 bg-gradient-to-b from-slate-900 to-slate-950 p-4">
          <div className="mb-4 flex items-center justify-between">
            <span className="text-sm font-bold text-white">{screen.title}</span>
            <span className={`h-6 w-6 rounded-full bg-gradient-to-r ${accent}`} />
          </div>
          <ul className="space-y-2.5">
            {screen.rows.map(([label, badge, tone]) => (
              <li
                key={label}
                className="flex items-center justify-between gap-2 rounded-xl border border-white/5 bg-white/5 px-3 py-2.5"
              >
                <span className="truncate text-xs font-medium text-slate-200">{label}</span>
                <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ${tone}`}>
                  {badge}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
