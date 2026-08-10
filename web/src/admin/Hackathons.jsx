import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api, qs } from '../lib/api.js';
import { ConfirmButton, EmptyState, ErrorNote, Spinner, Toast, useToast } from '../components/ui.jsx';
import { countdown, countdownTone, formatDate, statusTone, STATUSES } from '../lib/format.js';

export default function AdminHackathons() {
  const [hackathons, setHackathons] = useState([]);
  const [status, setStatus] = useState('');
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const toast = useToast();
  const navigate = useNavigate();

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    api
      .get(`/hackathons${qs({ status, q: query, sort: 'newest' })}`)
      .then((data) => setHackathons(data.hackathons))
      .catch(setError)
      .finally(() => setLoading(false));
  }, [status, query]);

  useEffect(() => {
    const t = setTimeout(load, query ? 250 : 0);
    return () => clearTimeout(t);
  }, [load, query]);

  const changeStatus = async (h, next) => {
    try {
      await api.patch(`/hackathons/${h.id}`, { status: next });
      toast.success(`"${h.name}" is now ${next}`);
      load();
    } catch (err) {
      toast.error(err.message);
    }
  };

  const duplicate = async (h) => {
    try {
      const data = await api.post(`/hackathons/${h.id}/duplicate`, {});
      toast.success('Template created — set the new dates');
      navigate(`/admin/hackathons/${data.hackathon.id}/edit`);
    } catch (err) {
      toast.error(err.message);
    }
  };

  const remove = async (h) => {
    try {
      await api.del(`/hackathons/${h.id}`);
      toast.success('Hackathon deleted');
      load();
    } catch (err) {
      toast.error(err.message);
    }
  };

  const announce = async (h) => {
    try {
      const { notified } = await api.post(`/hackathons/${h.id}/announce`, {});
      toast.success(notified ? `Notified ${notified} student(s)` : 'No eligible students to notify');
    } catch (err) {
      toast.error(err.message);
    }
  };

  return (
    <div className="space-y-4">
      <Toast toast={toast.toast} onDismiss={toast.dismiss} />

      <div className="flex items-center justify-between gap-3">
        <h2 className="text-lg font-bold text-slate-900">Manage hackathons</h2>
        <Link to="/admin/hackathons/new" className="btn-primary">
          + Add
        </Link>
      </div>

      <input
        className="field"
        placeholder="Search by name, organiser, theme…"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />

      <div className="flex gap-2 overflow-x-auto pb-1">
        {[{ value: '', label: 'All' }, ...STATUSES.map((s) => ({ value: s, label: s }))].map((f) => (
          <button
            key={f.value}
            type="button"
            onClick={() => setStatus(f.value)}
            className={`chip shrink-0 capitalize ${
              status === f.value ? 'bg-brand-600 text-white' : 'bg-white text-slate-600 border border-slate-200'
            }`}
          >
            {f.label}
          </button>
        ))}
        <button
          type="button"
          className="chip shrink-0 border border-slate-200 bg-white text-slate-600"
          onClick={() => api.download(`/hackathons/export.csv${qs({ status })}`, 'hackathons.csv')}
        >
          ⬇ CSV
        </button>
      </div>

      <ErrorNote error={error} onRetry={load} />
      {loading ? (
        <Spinner />
      ) : hackathons.length === 0 ? (
        <EmptyState
          icon="🏁"
          title="No hackathons yet"
          hint="Add the first one — students see it the moment you save."
          action={
            <Link to="/admin/hackathons/new" className="btn-primary mt-2">
              Add hackathon
            </Link>
          }
        />
      ) : (
        <ul className="space-y-3">
          {hackathons.map((h) => (
            <li key={h.id} className="card p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h3 className="truncate font-semibold text-slate-900">{h.name}</h3>
                  <p className="truncate text-xs text-slate-500">{h.organizer}</p>
                </div>
                <span className={`chip shrink-0 capitalize ${statusTone(h.status)}`}>{h.status}</span>
              </div>

              <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-slate-600">
                <span className={`chip ${countdownTone(h.daysToDeadline)}`}>
                  {countdown(h.daysToDeadline)}
                </span>
                <span>Deadline {formatDate(h.regDeadline)}</span>
                {h.prizeAmount && <span>· {h.prizeAmount}</span>}
              </div>

              <p className="mt-2 text-[11px] text-slate-400">
                Posted {formatDate(h.createdAt, { withTime: true })}
                {h.updatedAt !== h.createdAt && ` · edited ${formatDate(h.updatedAt, { withTime: true })}`}
              </p>

              <div className="mt-3 flex flex-wrap gap-2">
                <Link to={`/admin/hackathons/${h.id}/edit`} className="btn-secondary px-3 py-1.5 text-xs">
                  Edit
                </Link>
                <button
                  type="button"
                  className="btn-secondary px-3 py-1.5 text-xs"
                  onClick={() => duplicate(h)}
                >
                  Duplicate
                </button>
                <select
                  className="rounded-xl border border-slate-300 bg-white px-2 py-1.5 text-xs capitalize"
                  value={h.status}
                  onChange={(e) => changeStatus(h, e.target.value)}
                  aria-label={`Status for ${h.name}`}
                >
                  {STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  className="btn-secondary px-3 py-1.5 text-xs"
                  onClick={() => announce(h)}
                >
                  Notify students
                </button>
                <ConfirmButton
                  onConfirm={() => remove(h)}
                  className="btn-danger px-3 py-1.5 text-xs"
                  label="Delete"
                  confirmLabel="Confirm delete"
                />
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
