import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../lib/api.js';
import { ErrorNote, Spinner } from '../components/ui.jsx';
import { countdown, countdownTone, formatDate } from '../lib/format.js';

function Stat({ label, value, tone = 'text-slate-900' }) {
  return (
    <div className="card px-4 py-3">
      <p className="text-xs font-medium text-slate-500">{label}</p>
      <p className={`text-2xl font-bold ${tone}`}>{value}</p>
    </div>
  );
}

export default function AdminHome() {
  const [stats, setStats] = useState(null);
  const [closingSoon, setClosingSoon] = useState([]);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    setError(null);
    Promise.all([api.get('/stats'), api.get('/hackathons?includeClosed=false&sort=deadline')])
      .then(([s, h]) => {
        setStats(s);
        setClosingSoon(
          h.hackathons.filter((x) => x.daysToDeadline !== null && x.daysToDeadline >= 0).slice(0, 4),
        );
      })
      .catch(setError)
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  if (loading) return <Spinner />;

  return (
    <div className="space-y-5">
      <ErrorNote error={error} onRetry={load} />

      <section className="grid grid-cols-2 gap-3">
        <Stat label="Total hackathons" value={stats?.hackathons.total ?? 0} />
        <Stat label="Upcoming" value={stats?.hackathons.upcoming ?? 0} tone="text-brand-700" />
        <Stat label="Ongoing" value={stats?.hackathons.ongoing ?? 0} tone="text-emerald-600" />
        <Stat label="Archived" value={stats?.hackathons.closed ?? 0} tone="text-slate-500" />
        <Stat label="Achievements posted" value={stats?.achievements ?? 0} />
        <Stat
          label="Open feedback"
          value={stats?.feedback.open ?? 0}
          tone={stats?.feedback.open ? 'text-amber-600' : 'text-slate-900'}
        />
      </section>

      <section className="grid grid-cols-2 gap-3">
        <Link to="/admin/hackathons/new" className="btn-primary">
          + Add hackathon
        </Link>
        <Link to="/admin/achievements" className="btn-secondary">
          + Add achievement
        </Link>
      </section>

      <section>
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
            Closing soon
          </h2>
          <Link to="/admin/hackathons" className="text-sm font-semibold text-brand-700">
            Manage all
          </Link>
        </div>
        {closingSoon.length === 0 ? (
          <p className="card px-4 py-6 text-center text-sm text-slate-500">
            No open registrations right now.
          </p>
        ) : (
          <ul className="space-y-2">
            {closingSoon.map((h) => (
              <li key={h.id} className="card flex items-center justify-between gap-3 px-4 py-3">
                <div className="min-w-0">
                  <Link
                    to={`/admin/hackathons/${h.id}/edit`}
                    className="block truncate font-semibold text-slate-900"
                  >
                    {h.name}
                  </Link>
                  <p className="truncate text-xs text-slate-500">
                    {h.organizer} · closes {formatDate(h.regDeadline)}
                  </p>
                </div>
                <span className={`chip shrink-0 ${countdownTone(h.daysToDeadline)}`}>
                  {countdown(h.daysToDeadline)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="card p-4">
        <h2 className="mb-1 text-sm font-semibold text-slate-800">Reporting exports</h2>
        <p className="mb-3 text-xs text-slate-500">
          Download an Excel-friendly CSV of everything currently in HackTrack.
        </p>
        <div className="grid gap-2 sm:grid-cols-3">
          <button
            type="button"
            className="btn-secondary"
            onClick={() => api.download('/hackathons/export.csv', 'hackathons.csv')}
          >
            Hackathons
          </button>
          <button
            type="button"
            className="btn-secondary"
            onClick={() => api.download('/winners/export.csv', 'achievements.csv')}
          >
            Achievements
          </button>
          <button
            type="button"
            className="btn-secondary"
            onClick={() => api.download('/feedback/export.csv', 'feedback.csv')}
          >
            Feedback
          </button>
        </div>
      </section>
    </div>
  );
}
