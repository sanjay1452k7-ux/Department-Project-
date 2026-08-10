import { Link } from 'react-router-dom';
import { countdown, countdownTone, formatDate, statusTone, teamSize } from '../lib/format.js';

/** The card the student home feed is built from. */
export default function HackathonCard({ hackathon: h }) {
  return (
    <Link to={`/hackathons/${h.id}`} className="card block p-4 transition active:scale-[0.99]">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="font-semibold leading-tight text-slate-900">{h.name}</h3>
          <p className="mt-0.5 truncate text-xs text-slate-500">{h.organizer}</p>
        </div>
        <span className={`chip shrink-0 capitalize ${statusTone(h.status)}`}>{h.status}</span>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <span className={`chip ${countdownTone(h.daysToDeadline)}`}>{countdown(h.daysToDeadline)}</span>
        {h.prizeAmount && <span className="chip bg-amber-50 text-amber-800">🏆 {h.prizeAmount}</span>}
        {h.eligibleForViewer === false && (
          <span className="chip bg-slate-100 text-slate-500">Not your year</span>
        )}
      </div>

      <dl className="mt-3 grid grid-cols-2 gap-y-1 text-xs text-slate-600">
        <div className="col-span-2 flex gap-1">
          <dt className="text-slate-400">Deadline</dt>
          <dd className="font-medium">{formatDate(h.regDeadline)}</dd>
        </div>
        <div className="flex gap-1">
          <dt className="text-slate-400">Team</dt>
          <dd className="font-medium">{teamSize(h.teamSizeMin, h.teamSizeMax)}</dd>
        </div>
        <div className="flex gap-1">
          <dt className="text-slate-400">Years</dt>
          <dd className="font-medium">
            {h.eligibility.length ? h.eligibility.join(', ') : 'All years'}
          </dd>
        </div>
      </dl>

      {h.themes.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {h.themes.slice(0, 3).map((theme) => (
            <span key={theme} className="chip bg-brand-50 text-brand-700">
              {theme}
            </span>
          ))}
          {h.themes.length > 3 && (
            <span className="chip bg-slate-100 text-slate-500">+{h.themes.length - 3}</span>
          )}
        </div>
      )}
    </Link>
  );
}
