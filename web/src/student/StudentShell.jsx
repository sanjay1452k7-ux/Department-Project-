import { useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import { api } from '../lib/api.js';
import { useAuth } from '../lib/auth.jsx';
import ChatAssistant from './ChatAssistant.jsx';

const TABS = [
  { to: '/', end: true, label: 'Home', icon: '🏠' },
  { to: '/achievements', label: 'Achievements', icon: '🥇' },
  { to: '/feedback', label: 'Feedback', icon: '💬' },
  { to: '/profile', label: 'Profile', icon: '👤' },
];

export default function StudentShell() {
  const { user } = useAuth();
  const location = useLocation();
  const [unread, setUnread] = useState(0);

  // Refresh the badge on navigation and on a slow poll, so a push that arrives
  // while the app is open still updates the header.
  useEffect(() => {
    let cancelled = false;
    const refresh = () =>
      api
        .get('/notifications?limit=1')
        .then((data) => !cancelled && setUnread(data.unread))
        .catch(() => {});
    refresh();
    const timer = setInterval(refresh, 60_000);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [location.pathname]);

  return (
    <div className="min-h-screen bg-slate-100 pb-24">
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-2xl items-center justify-between px-4 py-3">
          <div className="min-w-0">
            <p className="text-xs text-slate-500">Hi {user?.name?.split(' ')[0]} 👋</p>
            <h1 className="truncate text-lg font-bold text-slate-900">HackTrack</h1>
          </div>
          <Link
            to="/notifications"
            aria-label={`Notifications${unread ? `, ${unread} unread` : ''}`}
            className="relative rounded-full p-2 text-xl hover:bg-slate-100"
          >
            🔔
            {unread > 0 && (
              <span className="absolute -right-0.5 -top-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-rose-600 px-1 text-[10px] font-bold text-white">
                {unread > 9 ? '9+' : unread}
              </span>
            )}
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-4 py-4">
        <Outlet />
      </main>

      <ChatAssistant />

      <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-slate-200 bg-white pb-[env(safe-area-inset-bottom)]">
        <div className="mx-auto flex max-w-2xl">
          {TABS.map((tab) => (
            <NavLink
              key={tab.to}
              to={tab.to}
              end={tab.end}
              className={({ isActive }) =>
                `flex flex-1 flex-col items-center gap-0.5 py-2.5 text-[11px] font-medium transition ${
                  isActive ? 'text-brand-700' : 'text-slate-400'
                }`
              }
            >
              <span className="text-lg leading-none">{tab.icon}</span>
              {tab.label}
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  );
}
