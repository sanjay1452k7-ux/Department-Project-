import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { api } from '../lib/api.js';
import { EmptyState, ErrorNote, Field, Spinner, Toast, useToast } from '../components/ui.jsx';
import { FEEDBACK_CATEGORIES, feedbackTone, formatDate } from '../lib/format.js';

export default function FeedbackPage() {
  const location = useLocation();
  const [category, setCategory] = useState('suggestion');
  const [message, setMessage] = useState('');
  const [relatedHackathonId, setRelatedHackathonId] = useState(
    location.state?.hackathonId || '',
  );
  const [hackathons, setHackathons] = useState([]);
  const [mine, setMine] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const toast = useToast();

  const loadMine = () =>
    api
      .get('/feedback/mine')
      .then((data) => setMine(data.feedback))
      .catch(setError)
      .finally(() => setLoading(false));

  useEffect(() => {
    loadMine();
    api
      .get('/hackathons?sort=newest')
      .then((data) => setHackathons(data.hackathons))
      .catch(() => {});
  }, []);

  // Arriving from a hackathon's "Ask" button pre-selects that hackathon.
  useEffect(() => {
    if (location.state?.hackathonId) {
      setRelatedHackathonId(location.state.hackathonId);
      setCategory('hackathon-info');
    }
  }, [location.state]);

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await api.post('/feedback', { category, message, relatedHackathonId: relatedHackathonId || null });
      toast.success('Thanks — your feedback reached the staff inbox');
      setMessage('');
      setRelatedHackathonId('');
      loadMine();
    } catch (err) {
      setError(err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-5">
      <Toast toast={toast.toast} onDismiss={toast.dismiss} />

      <div>
        <h2 className="text-lg font-bold text-slate-900">Feedback</h2>
        <p className="text-sm text-slate-500">
          Report a bug, suggest an improvement, or ask about a hackathon.
        </p>
      </div>

      <form onSubmit={submit} className="card space-y-4 p-4">
        <ErrorNote error={error} />

        <div>
          <p className="label">Category</p>
          <div className="grid grid-cols-2 gap-2">
            {FEEDBACK_CATEGORIES.map((c) => (
              <button
                key={c.value}
                type="button"
                onClick={() => setCategory(c.value)}
                className={`rounded-xl border px-3 py-2 text-sm font-medium transition ${
                  category === c.value
                    ? 'border-brand-600 bg-brand-50 text-brand-700'
                    : 'border-slate-200 bg-white text-slate-600'
                }`}
              >
                {c.label}
              </button>
            ))}
          </div>
        </div>

        <Field label="Message" required>
          <textarea
            className="field min-h-[120px]"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="What happened, or what would you like to see?"
            required
            minLength={5}
          />
        </Field>

        <Field label="Related hackathon" hint="Optional">
          <select
            className="field"
            value={relatedHackathonId}
            onChange={(e) => setRelatedHackathonId(e.target.value)}
          >
            <option value="">Not about a specific hackathon</option>
            {hackathons.map((h) => (
              <option key={h.id} value={h.id}>
                {h.name}
              </option>
            ))}
          </select>
        </Field>

        <button type="submit" className="btn-primary w-full" disabled={saving}>
          {saving ? 'Sending…' : 'Submit feedback'}
        </button>
      </form>

      <section className="space-y-3">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
          Your submissions
        </h3>
        {loading ? (
          <Spinner />
        ) : mine.length === 0 ? (
          <EmptyState icon="✉️" title="Nothing submitted yet" hint="Your past feedback shows up here with its status." />
        ) : (
          <ul className="space-y-3">
            {mine.map((f) => (
              <li key={f.id} className="card p-4">
                <div className="flex items-center justify-between gap-3">
                  <span className="chip bg-slate-100 text-slate-600">
                    {FEEDBACK_CATEGORIES.find((c) => c.value === f.category)?.label || f.category}
                  </span>
                  <span className={`chip capitalize ${feedbackTone(f.status)}`}>{f.status}</span>
                </div>
                <p className="mt-2 whitespace-pre-wrap text-sm text-slate-700">{f.message}</p>
                {f.relatedHackathonName && (
                  <p className="mt-1 text-xs text-brand-700">Re: {f.relatedHackathonName}</p>
                )}
                <p className="mt-2 text-[11px] text-slate-400">
                  {formatDate(f.createdAt, { withTime: true })}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
