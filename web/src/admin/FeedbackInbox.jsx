import { useCallback, useEffect, useState } from 'react';
import { api, qs } from '../lib/api.js';
import { EmptyState, ErrorNote, Spinner, Toast, useToast } from '../components/ui.jsx';
import { FEEDBACK_CATEGORIES, feedbackTone, formatDate } from '../lib/format.js';

const STATUS_FILTERS = [
  { value: '', label: 'All' },
  { value: 'open', label: 'Open' },
  { value: 'reviewed', label: 'Reviewed' },
  { value: 'resolved', label: 'Resolved' },
];

export default function AdminFeedback() {
  const [items, setItems] = useState([]);
  const [counts, setCounts] = useState({ open: 0, reviewed: 0, resolved: 0 });
  const [status, setStatus] = useState('open');
  const [category, setCategory] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const toast = useToast();

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    api
      .get(`/feedback${qs({ status, category })}`)
      .then((data) => {
        setItems(data.feedback);
        setCounts(data.counts);
      })
      .catch(setError)
      .finally(() => setLoading(false));
  }, [status, category]);

  useEffect(load, [load]);

  const setItemStatus = async (item, next) => {
    try {
      await api.patch(`/feedback/${item.id}`, { status: next });
      toast.success(`Marked ${next}`);
      load();
    } catch (err) {
      toast.error(err.message);
    }
  };

  return (
    <div className="space-y-4">
      <Toast toast={toast.toast} onDismiss={toast.dismiss} />

      <div className="flex items-center justify-between gap-3">
        <h2 className="text-lg font-bold text-slate-900">Student feedback</h2>
        <button
          type="button"
          className="btn-secondary px-3 py-1.5 text-xs"
          onClick={() => api.download(`/feedback/export.csv${qs({ status, category })}`, 'feedback.csv')}
        >
          ⬇ CSV
        </button>
      </div>

      <div className="grid grid-cols-3 gap-2 text-center">
        {[
          ['Open', counts.open, 'text-amber-600'],
          ['Reviewed', counts.reviewed, 'text-brand-700'],
          ['Resolved', counts.resolved, 'text-emerald-600'],
        ].map(([label, value, tone]) => (
          <div key={label} className="card px-2 py-2">
            <p className={`text-xl font-bold ${tone}`}>{value}</p>
            <p className="text-[11px] text-slate-500">{label}</p>
          </div>
        ))}
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1">
        {STATUS_FILTERS.map((f) => (
          <button
            key={f.value}
            type="button"
            onClick={() => setStatus(f.value)}
            className={`chip shrink-0 ${
              status === f.value ? 'bg-brand-600 text-white' : 'border border-slate-200 bg-white text-slate-600'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1">
        {[{ value: '', label: 'All categories' }, ...FEEDBACK_CATEGORIES].map((c) => (
          <button
            key={c.value}
            type="button"
            onClick={() => setCategory(c.value)}
            className={`chip shrink-0 ${
              category === c.value ? 'bg-slate-800 text-white' : 'border border-slate-200 bg-white text-slate-600'
            }`}
          >
            {c.label}
          </button>
        ))}
      </div>

      <ErrorNote error={error} onRetry={load} />

      {loading ? (
        <Spinner />
      ) : items.length === 0 ? (
        <EmptyState icon="📭" title="Nothing here" hint="No feedback matches these filters." />
      ) : (
        <ul className="space-y-3">
          {items.map((f) => (
            <li key={f.id} className="card p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate font-semibold text-slate-900">{f.studentName}</p>
                  <p className="truncate text-xs text-slate-500">
                    {[f.studentYear && `Year ${f.studentYear}`, f.studentDepartment]
                      .filter(Boolean)
                      .join(' · ')}
                  </p>
                </div>
                <span className={`chip shrink-0 capitalize ${feedbackTone(f.status)}`}>{f.status}</span>
              </div>

              <div className="mt-2 flex flex-wrap gap-2">
                <span className="chip bg-slate-100 text-slate-600">
                  {FEEDBACK_CATEGORIES.find((c) => c.value === f.category)?.label || f.category}
                </span>
                {f.relatedHackathonName && (
                  <span className="chip bg-brand-50 text-brand-700">{f.relatedHackathonName}</span>
                )}
              </div>

              <p className="mt-2 whitespace-pre-wrap text-sm text-slate-700">{f.message}</p>
              <p className="mt-2 text-[11px] text-slate-400">
                {formatDate(f.createdAt, { withTime: true })}
              </p>

              <div className="mt-3 flex gap-2">
                {f.status !== 'reviewed' && (
                  <button
                    type="button"
                    className="btn-secondary px-3 py-1.5 text-xs"
                    onClick={() => setItemStatus(f, 'reviewed')}
                  >
                    Mark reviewed
                  </button>
                )}
                {f.status !== 'resolved' && (
                  <button
                    type="button"
                    className="btn-primary px-3 py-1.5 text-xs"
                    onClick={() => setItemStatus(f, 'resolved')}
                  >
                    Mark resolved
                  </button>
                )}
                {f.status !== 'open' && (
                  <button
                    type="button"
                    className="btn-secondary px-3 py-1.5 text-xs"
                    onClick={() => setItemStatus(f, 'open')}
                  >
                    Reopen
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
