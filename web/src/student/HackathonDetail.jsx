import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api } from '../lib/api.js';
import { ErrorNote, Spinner } from '../components/ui.jsx';
import {
  countdown,
  countdownTone,
  formatDate,
  list,
  statusTone,
  teamSize,
} from '../lib/format.js';

function Row({ label, children }) {
  return (
    <div className="flex justify-between gap-4 border-b border-slate-100 py-2.5 last:border-0">
      <dt className="shrink-0 text-sm text-slate-500">{label}</dt>
      <dd className="text-right text-sm font-medium text-slate-800">{children}</dd>
    </div>
  );
}

export default function HackathonDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [hackathon, setHackathon] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    setLoading(true);
    api
      .get(`/hackathons/${id}`)
      .then((data) => setHackathon(data.hackathon))
      .catch(setError)
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <Spinner />;
  if (error) return <ErrorNote error={error} />;
  if (!hackathon) return null;

  const h = hackathon;
  const canRegister = Boolean(h.registrationLink) && !h.deadlinePassed && h.status !== 'closed';

  return (
    <div className="space-y-4 pb-20">
      <button type="button" onClick={() => navigate(-1)} className="text-sm font-medium text-brand-700">
        ← Back
      </button>

      <div className="card p-5">
        <div className="flex items-start justify-between gap-3">
          <h1 className="text-xl font-bold leading-tight text-slate-900">{h.name}</h1>
          <span className={`chip shrink-0 capitalize ${statusTone(h.status)}`}>{h.status}</span>
        </div>
        <p className="mt-1 text-sm text-slate-500">{h.organizer}</p>

        <div className="mt-3 flex flex-wrap gap-2">
          <span className={`chip ${countdownTone(h.daysToDeadline)}`}>{countdown(h.daysToDeadline)}</span>
          {h.prizeAmount && <span className="chip bg-amber-50 text-amber-800">🏆 {h.prizeAmount}</span>}
          <span className="chip bg-slate-100 capitalize text-slate-600">{h.eventMode}</span>
        </div>

        {h.eligibleForViewer === false && (
          <p className="mt-3 rounded-xl bg-amber-50 px-3 py-2 text-xs text-amber-800">
            This one is open to years {list(h.eligibility)} — your year is not listed. Check with the
            organisers before registering.
          </p>
        )}
      </div>

      {h.description && (
        <section className="card p-5">
          <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-500">About</h2>
          <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-700">{h.description}</p>
        </section>
      )}

      <section className="card px-5 py-2">
        <dl>
          <Row label="Registration deadline">{formatDate(h.regDeadline, { withTime: true })}</Row>
          <Row label="Round 1">{formatDate(h.round1Date, { withTime: true })}</Row>
          <Row label="Round 2">{formatDate(h.round2Date, { withTime: true })}</Row>
          <Row label="Team size">{teamSize(h.teamSizeMin, h.teamSizeMax)}</Row>
          <Row label="Eligibility">{h.eligibility.length ? list(h.eligibility) : 'All years'}</Row>
          <Row label="Mode">
            <span className="capitalize">{h.eventMode}</span>
          </Row>
          {h.venue && <Row label="Venue">{h.venue}</Row>}
          <Row label="Prize">{h.prizeAmount || '—'}</Row>
        </dl>
      </section>

      {(h.themes.length > 0 || h.tags.length > 0) && (
        <section className="card p-5">
          <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-500">
            Themes & tags
          </h2>
          <div className="flex flex-wrap gap-1.5">
            {h.themes.map((t) => (
              <span key={`theme-${t}`} className="chip bg-brand-50 text-brand-700">
                {t}
              </span>
            ))}
            {h.tags.map((t) => (
              <span key={`tag-${t}`} className="chip bg-slate-100 text-slate-600">
                #{t}
              </span>
            ))}
          </div>
        </section>
      )}

      {h.winners?.length > 0 && (
        <section className="card p-5">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">
            Winners
          </h2>
          <ul className="space-y-3">
            {h.winners.map((w) => (
              <li key={w.id} className="rounded-xl bg-slate-50 p-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="font-semibold text-slate-900">{w.teamName}</p>
                  <span className="chip bg-amber-100 text-amber-800">{w.placement}</span>
                </div>
                <p className="mt-1 text-xs text-slate-600">{list(w.members)}</p>
                {w.problemStatementChosen && (
                  <p className="mt-1 text-xs text-slate-500">{w.problemStatementChosen}</p>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}

      <p className="text-center text-xs text-slate-400">
        Posted by {h.postedByName || 'staff'} · {formatDate(h.createdAt, { withTime: true })}
      </p>

      <div className="fixed inset-x-0 bottom-16 z-20 border-t border-slate-200 bg-white/95 px-4 py-3 backdrop-blur">
        <div className="mx-auto flex max-w-2xl gap-2">
          <Link to="/feedback" state={{ hackathonId: h.id }} className="btn-secondary shrink-0">
            Ask
          </Link>
          {canRegister ? (
            <a
              href={h.registrationLink}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-primary flex-1"
            >
              Register ↗
            </a>
          ) : (
            <button type="button" className="btn-primary flex-1" disabled>
              {h.registrationLink ? 'Registration closed' : 'No link posted yet'}
            </button>
          )}
        </div>
        {canRegister && (
          <p className="mt-1 text-center text-[11px] text-slate-400">
            Opens the organiser's official registration page
          </p>
        )}
      </div>
    </div>
  );
}
