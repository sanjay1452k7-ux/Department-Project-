import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { api } from '../lib/api.js';
import { EmptyState, ErrorNote, Spinner } from '../components/ui.jsx';
import { list } from '../lib/format.js';
import HackathonCard from './HackathonCard.jsx';

const SUGGESTIONS = ['language ai', 'fintech', 'iot', 'agentic ai', 'cybersecurity'];

export default function SearchPage() {
  const [params, setParams] = useSearchParams();
  const q = params.get('q') || '';
  const [input, setInput] = useState(q);
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => setInput(q), [q]);

  useEffect(() => {
    if (!q.trim()) {
      setResults(null);
      return undefined;
    }
    setLoading(true);
    setError(null);
    let cancelled = false;
    api
      .get(`/search?q=${encodeURIComponent(q)}`)
      .then((data) => !cancelled && setResults(data))
      .catch((err) => !cancelled && setError(err))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [q]);

  const submit = (e) => {
    e.preventDefault();
    setParams(input.trim() ? { q: input.trim() } : {});
  };

  const total = (results?.hackathons.length || 0) + (results?.achievements.length || 0);

  return (
    <div className="space-y-4">
      <form onSubmit={submit}>
        <div className="relative">
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
            🔍
          </span>
          <input
            className="field pl-9"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Try “language ai”, an organiser, or a team name"
            autoFocus
            enterKeyHint="search"
          />
        </div>
      </form>

      {!q && (
        <div className="space-y-3">
          <p className="text-sm text-slate-500">
            Search across hackathon names, organisers, themes, tags and descriptions — plus every
            achievement posted. Partial or vague wording works.
          </p>
          <div className="flex flex-wrap gap-2">
            {SUGGESTIONS.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setParams({ q: s })}
                className="chip border border-slate-200 bg-white text-slate-600"
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      )}

      <ErrorNote error={error} />
      {loading && <Spinner label="Searching…" />}

      {!loading && results && total === 0 && (
        <EmptyState
          icon="🤔"
          title={`Nothing found for “${q}”`}
          hint="Try a broader word — a theme like “ai” or “fintech”, or an organiser name."
        />
      )}

      {!loading && results?.hackathons.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
            Hackathons ({results.hackathons.length})
          </h2>
          <ul className="space-y-3">
            {results.hackathons.map((h) => (
              <li key={h.id}>
                <HackathonCard hackathon={h} />
              </li>
            ))}
          </ul>
        </section>
      )}

      {!loading && results?.achievements.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
            Achievements ({results.achievements.length})
          </h2>
          <ul className="space-y-2">
            {results.achievements.map((w) => (
              <li key={w.id} className="card p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-semibold text-slate-900">{w.teamName}</p>
                    {w.hackathonId ? (
                      <Link
                        to={`/hackathons/${w.hackathonId}`}
                        className="text-xs font-medium text-brand-700"
                      >
                        {w.hackathonName}
                      </Link>
                    ) : (
                      <p className="text-xs text-slate-500">{w.hackathonName}</p>
                    )}
                  </div>
                  <span className="chip shrink-0 bg-amber-100 text-amber-800">{w.placement}</span>
                </div>
                <p className="mt-1.5 text-xs text-slate-600">{list(w.members)}</p>
                {w.prizeWon && <p className="mt-1 text-xs text-slate-500">Won {w.prizeWon}</p>}
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
