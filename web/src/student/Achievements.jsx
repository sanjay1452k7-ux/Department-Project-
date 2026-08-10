import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, qs } from '../lib/api.js';
import { EmptyState, ErrorNote, Spinner } from '../components/ui.jsx';
import { formatDate, list } from '../lib/format.js';

export function AchievementCard({ winner: w, showHackathon = true }) {
  return (
    <div className="card p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-semibold text-slate-900">{w.teamName}</p>
          {showHackathon &&
            (w.hackathonId ? (
              <Link to={`/hackathons/${w.hackathonId}`} className="text-xs font-medium text-brand-700">
                {w.hackathonName}
              </Link>
            ) : (
              <p className="text-xs text-slate-500">{w.hackathonName}</p>
            ))}
        </div>
        <span className="chip shrink-0 bg-amber-100 text-amber-800">🏅 {w.placement}</span>
      </div>

      <p className="mt-2 text-xs text-slate-600">
        <span className="text-slate-400">Team: </span>
        {list(w.members)}
      </p>
      {w.prizeWon && (
        <p className="text-xs text-slate-600">
          <span className="text-slate-400">Prize: </span>
          {w.prizeWon}
        </p>
      )}
      {w.problemStatementChosen && (
        <p className="mt-1 text-xs text-slate-500">“{w.problemStatementChosen}”</p>
      )}
      <p className="mt-2 text-[11px] text-slate-400">{formatDate(w.createdAt)}</p>
    </div>
  );
}

export default function AchievementsFeed() {
  const [winners, setWinners] = useState([]);
  const [hackathons, setHackathons] = useState([]);
  const [filter, setFilter] = useState({ q: '', hackathonId: '' });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    api
      .get(`/winners${qs(filter)}`)
      .then((data) => setWinners(data.winners))
      .catch(setError)
      .finally(() => setLoading(false));
  }, [filter]);

  useEffect(() => {
    const t = setTimeout(load, filter.q ? 250 : 0);
    return () => clearTimeout(t);
  }, [load, filter.q]);

  useEffect(() => {
    api
      .get('/hackathons?sort=newest')
      .then((data) => setHackathons(data.hackathons))
      .catch(() => {});
  }, []);

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-bold text-slate-900">Achievements</h2>
        <p className="text-sm text-slate-500">Every winning team across all hackathons.</p>
      </div>

      <input
        className="field"
        placeholder="Search a student, team or hackathon…"
        value={filter.q}
        onChange={(e) => setFilter((f) => ({ ...f, q: e.target.value }))}
      />

      <div className="flex gap-2 overflow-x-auto pb-1">
        <button
          type="button"
          onClick={() => setFilter((f) => ({ ...f, hackathonId: '' }))}
          className={`chip shrink-0 ${
            !filter.hackathonId ? 'bg-brand-600 text-white' : 'border border-slate-200 bg-white text-slate-600'
          }`}
        >
          All
        </button>
        {hackathons.map((h) => (
          <button
            key={h.id}
            type="button"
            onClick={() =>
              setFilter((f) => ({ ...f, hackathonId: f.hackathonId === h.id ? '' : h.id }))
            }
            className={`chip shrink-0 max-w-[180px] truncate ${
              filter.hackathonId === h.id
                ? 'bg-brand-600 text-white'
                : 'border border-slate-200 bg-white text-slate-600'
            }`}
          >
            {h.name}
          </button>
        ))}
      </div>

      <ErrorNote error={error} onRetry={load} />

      {loading ? (
        <Spinner />
      ) : winners.length === 0 ? (
        <EmptyState
          icon="🥇"
          title="No achievements yet"
          hint="Once staff post results, winning teams show up here."
        />
      ) : (
        <ul className="space-y-3">
          {winners.map((w) => (
            <li key={w.id}>
              <AchievementCard winner={w} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
