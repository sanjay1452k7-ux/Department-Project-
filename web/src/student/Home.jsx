import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, qs } from '../lib/api.js';
import { useAuth } from '../lib/auth.jsx';
import { EmptyState, ErrorNote, Spinner } from '../components/ui.jsx';
import { EVENT_MODES, STATUSES, YEARS } from '../lib/format.js';
import HackathonCard from './HackathonCard.jsx';

const SORTS = [
  { value: 'deadline', label: 'Closing soon' },
  { value: 'newest', label: 'Newest' },
  { value: 'prize', label: 'Biggest prize' },
  { value: 'name', label: 'A–Z' },
];

const PRIZE_STEPS = [
  { value: '', label: 'Any prize' },
  { value: '50000', label: '₹50k+' },
  { value: '100000', label: '₹1L+' },
  { value: '300000', label: '₹3L+' },
];

const DEFAULT_FILTERS = {
  status: '',
  sort: 'deadline',
  eligibility: '',
  theme: '',
  mode: '',
  minPrize: '',
  eligibleOnly: false,
};

export default function StudentHome() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [hackathons, setHackathons] = useState([]);
  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const [showFilters, setShowFilters] = useState(false);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    api
      .get(`/hackathons${qs(filters)}`)
      .then((data) => setHackathons(data.hackathons))
      .catch(setError)
      .finally(() => setLoading(false));
  }, [filters]);

  useEffect(load, [load]);

  // Every theme actually in use, so the chip row never offers a dead filter.
  const themes = useMemo(() => {
    const set = new Set();
    hackathons.forEach((h) => h.themes.forEach((t) => set.add(t)));
    return [...set].sort();
  }, [hackathons]);

  const activeCount = Object.entries(filters).filter(
    ([key, value]) => value && value !== DEFAULT_FILTERS[key],
  ).length;

  const set = (key, value) => setFilters((f) => ({ ...f, [key]: value }));

  return (
    <div className="space-y-4">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (query.trim()) navigate(`/search?q=${encodeURIComponent(query.trim())}`);
        }}
      >
        <div className="relative">
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
            🔍
          </span>
          <input
            className="field pl-9"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search hackathons, themes, teams…"
            enterKeyHint="search"
          />
        </div>
      </form>

      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        <button
          type="button"
          onClick={() => setShowFilters((v) => !v)}
          className={`chip shrink-0 ${
            activeCount ? 'bg-brand-600 text-white' : 'border border-slate-200 bg-white text-slate-600'
          }`}
        >
          ⚙︎ Filters{activeCount ? ` (${activeCount})` : ''}
        </button>
        {SORTS.map((s) => (
          <button
            key={s.value}
            type="button"
            onClick={() => set('sort', s.value)}
            className={`chip shrink-0 ${
              filters.sort === s.value
                ? 'bg-slate-800 text-white'
                : 'border border-slate-200 bg-white text-slate-600'
            }`}
          >
            {s.label}
          </button>
        ))}
      </div>

      {showFilters && (
        <div className="card space-y-3 p-4">
          <div>
            <p className="label">Status</p>
            <div className="flex flex-wrap gap-2">
              {[{ value: '', label: 'All' }, ...STATUSES.map((s) => ({ value: s, label: s }))].map(
                (s) => (
                  <button
                    key={s.value}
                    type="button"
                    onClick={() => set('status', s.value)}
                    className={`chip capitalize ${
                      filters.status === s.value
                        ? 'bg-brand-600 text-white'
                        : 'border border-slate-200 bg-white text-slate-600'
                    }`}
                  >
                    {s.label === 'closed' ? 'Archive' : s.label}
                  </button>
                ),
              )}
            </div>
          </div>

          <div>
            <p className="label">Eligibility year</p>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setFilters((f) => ({ ...f, eligibility: '', eligibleOnly: false }))}
                className={`chip ${
                  !filters.eligibility && !filters.eligibleOnly
                    ? 'bg-brand-600 text-white'
                    : 'border border-slate-200 bg-white text-slate-600'
                }`}
              >
                Any
              </button>
              <button
                type="button"
                onClick={() =>
                  setFilters((f) => ({ ...f, eligibleOnly: !f.eligibleOnly, eligibility: '' }))
                }
                className={`chip ${
                  filters.eligibleOnly
                    ? 'bg-brand-600 text-white'
                    : 'border border-slate-200 bg-white text-slate-600'
                }`}
              >
                Only mine (Year {user?.year || '—'})
              </button>
              {YEARS.map((y) => (
                <button
                  key={y}
                  type="button"
                  onClick={() =>
                    setFilters((f) => ({
                      ...f,
                      eligibility: f.eligibility === y ? '' : y,
                      eligibleOnly: false,
                    }))
                  }
                  className={`chip ${
                    filters.eligibility === y
                      ? 'bg-brand-600 text-white'
                      : 'border border-slate-200 bg-white text-slate-600'
                  }`}
                >
                  Year {y}
                </button>
              ))}
            </div>
          </div>

          {themes.length > 0 && (
            <div>
              <p className="label">Theme</p>
              <div className="flex flex-wrap gap-2">
                {themes.map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => set('theme', filters.theme === t ? '' : t)}
                    className={`chip ${
                      filters.theme === t
                        ? 'bg-brand-600 text-white'
                        : 'border border-slate-200 bg-white text-slate-600'
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="label">Mode</span>
              <select
                className="field capitalize"
                value={filters.mode}
                onChange={(e) => set('mode', e.target.value)}
              >
                <option value="">Any mode</option>
                {EVENT_MODES.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="label">Minimum prize</span>
              <select
                className="field"
                value={filters.minPrize}
                onChange={(e) => set('minPrize', e.target.value)}
              >
                {PRIZE_STEPS.map((p) => (
                  <option key={p.value} value={p.value}>
                    {p.label}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <button
            type="button"
            className="btn-secondary w-full"
            onClick={() => setFilters(DEFAULT_FILTERS)}
          >
            Reset filters
          </button>
        </div>
      )}

      <ErrorNote error={error} onRetry={load} />

      {loading ? (
        <Spinner label="Loading hackathons…" />
      ) : hackathons.length === 0 ? (
        <EmptyState
          icon="🔍"
          title="Nothing matches"
          hint="Try clearing a filter, or check the archive for past events."
        />
      ) : (
        <>
          <p className="text-xs text-slate-500">
            {hackathons.length} hackathon{hackathons.length === 1 ? '' : 's'}
          </p>
          <ul className="space-y-3">
            {hackathons.map((h) => (
              <li key={h.id}>
                <HackathonCard hackathon={h} />
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
