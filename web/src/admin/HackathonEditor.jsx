import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api } from '../lib/api.js';
import { ErrorNote, Field, Spinner, Toast, useToast } from '../components/ui.jsx';
import { EVENT_MODES, STATUSES, toDateInput, YEARS } from '../lib/format.js';

const BLANK = {
  name: '',
  description: '',
  organizer: '',
  themes: '',
  eligibility: [],
  teamSizeMin: '',
  teamSizeMax: '',
  prizeAmount: '',
  regDeadline: '',
  round1Date: '',
  round2Date: '',
  eventMode: 'online',
  venue: '',
  status: 'upcoming',
  registrationLink: '',
  tags: '',
};

const EXTRA_ELIGIBILITY = ['StartUp', 'Alumni'];

/** Add & edit hackathons — one form covering every field in the data model. */
export default function HackathonEditor() {
  const { id } = useParams();
  const editing = Boolean(id);
  const navigate = useNavigate();
  const toast = useToast();

  const [form, setForm] = useState(BLANK);
  const [loading, setLoading] = useState(editing);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!editing) return;
    api
      .get(`/hackathons/${id}`)
      .then(({ hackathon: h }) =>
        setForm({
          name: h.name,
          description: h.description,
          organizer: h.organizer,
          themes: h.themes.join(', '),
          eligibility: h.eligibility,
          teamSizeMin: h.teamSizeMin ?? '',
          teamSizeMax: h.teamSizeMax ?? '',
          prizeAmount: h.prizeAmount,
          regDeadline: toDateInput(h.regDeadline),
          round1Date: toDateInput(h.round1Date),
          round2Date: toDateInput(h.round2Date),
          eventMode: h.eventMode,
          venue: h.venue,
          status: h.status,
          registrationLink: h.registrationLink,
          tags: h.tags.join(', '),
        }),
      )
      .catch(setError)
      .finally(() => setLoading(false));
  }, [editing, id]);

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const toggleEligibility = (value) =>
    setForm((f) => ({
      ...f,
      eligibility: f.eligibility.includes(value)
        ? f.eligibility.filter((v) => v !== value)
        : [...f.eligibility, value],
    }));

  const onSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    const payload = {
      ...form,
      themes: form.themes.split(',').map((s) => s.trim()).filter(Boolean),
      tags: form.tags.split(',').map((s) => s.trim()).filter(Boolean),
      teamSizeMin: form.teamSizeMin === '' ? null : Number(form.teamSizeMin),
      teamSizeMax: form.teamSizeMax === '' ? null : Number(form.teamSizeMax),
      regDeadline: form.regDeadline ? new Date(form.regDeadline).toISOString() : null,
      round1Date: form.round1Date ? new Date(form.round1Date).toISOString() : null,
      round2Date: form.round2Date ? new Date(form.round2Date).toISOString() : null,
    };
    try {
      if (editing) {
        await api.patch(`/hackathons/${id}`, payload);
      } else {
        const { notified } = await api.post('/hackathons', payload);
        toast.success(
          notified ? `Published — ${notified} eligible student(s) notified` : 'Published',
        );
      }
      navigate('/admin/hackathons', { replace: true });
    } catch (err) {
      setError(err);
      setSaving(false);
    }
  };

  if (loading) return <Spinner />;

  return (
    <form onSubmit={onSubmit} className="space-y-4 pb-4">
      <Toast toast={toast.toast} onDismiss={toast.dismiss} />
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-slate-900">
          {editing ? 'Edit hackathon' : 'Add hackathon'}
        </h2>
        <button type="button" onClick={() => navigate(-1)} className="text-sm text-slate-500">
          Cancel
        </button>
      </div>

      <ErrorNote error={error} />

      <div className="card space-y-4 p-4">
        <Field label="Name" required>
          <input className="field" value={form.name} onChange={set('name')} required />
        </Field>
        <Field label="Organizer" required>
          <input
            className="field"
            value={form.organizer}
            onChange={set('organizer')}
            placeholder="e.g. MeitY / Digital India Bhashini"
            required
          />
        </Field>
        <Field label="Description">
          <textarea
            className="field min-h-[110px]"
            value={form.description}
            onChange={set('description')}
            placeholder="What the hackathon is about, problem statements, mentoring…"
          />
        </Field>
        <Field label="Registration link" hint="Students tap through to this external page">
          <input
            type="url"
            className="field"
            value={form.registrationLink}
            onChange={set('registrationLink')}
            placeholder="https://…"
          />
        </Field>
      </div>

      <div className="card space-y-4 p-4">
        <h3 className="text-sm font-semibold text-slate-800">Who can enter</h3>
        <Field label="Eligibility" hint="Leave empty to open it to every year">
          <div className="flex flex-wrap gap-2">
            {[...YEARS, ...EXTRA_ELIGIBILITY].map((y) => (
              <button
                key={y}
                type="button"
                onClick={() => toggleEligibility(y)}
                className={`chip border ${
                  form.eligibility.includes(y)
                    ? 'border-brand-600 bg-brand-600 text-white'
                    : 'border-slate-200 bg-white text-slate-600'
                }`}
              >
                {YEARS.includes(y) ? `Year ${y}` : y}
              </button>
            ))}
          </div>
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Min team size">
            <input
              type="number"
              min="1"
              className="field"
              value={form.teamSizeMin}
              onChange={set('teamSizeMin')}
            />
          </Field>
          <Field label="Max team size">
            <input
              type="number"
              min="1"
              className="field"
              value={form.teamSizeMax}
              onChange={set('teamSizeMax')}
            />
          </Field>
        </div>
        <Field label="Prize" hint="Free text — e.g. ₹3,00,000 or ₹5L seed funding">
          <input className="field" value={form.prizeAmount} onChange={set('prizeAmount')} />
        </Field>
      </div>

      <div className="card space-y-4 p-4">
        <h3 className="text-sm font-semibold text-slate-800">Dates & format</h3>
        <Field label="Registration deadline">
          <input
            type="datetime-local"
            className="field"
            value={form.regDeadline}
            onChange={set('regDeadline')}
          />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Round 1 date">
            <input
              type="datetime-local"
              className="field"
              value={form.round1Date}
              onChange={set('round1Date')}
            />
          </Field>
          <Field label="Round 2 date">
            <input
              type="datetime-local"
              className="field"
              value={form.round2Date}
              onChange={set('round2Date')}
            />
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Mode">
            <select className="field capitalize" value={form.eventMode} onChange={set('eventMode')}>
              {EVENT_MODES.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Status">
            <select className="field capitalize" value={form.status} onChange={set('status')}>
              {STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </Field>
        </div>
        <Field label="Venue" hint="Leave blank for fully online events">
          <input className="field" value={form.venue} onChange={set('venue')} />
        </Field>
      </div>

      <div className="card space-y-4 p-4">
        <h3 className="text-sm font-semibold text-slate-800">Discovery</h3>
        <Field label="Themes" hint="Comma separated — shown on the card">
          <input
            className="field"
            value={form.themes}
            onChange={set('themes')}
            placeholder="language model, accessibility"
          />
        </Field>
        <Field label="Tags" hint="Comma separated — powers search and notification matching">
          <input
            className="field"
            value={form.tags}
            onChange={set('tags')}
            placeholder="agentic ai, nlp, fintech"
          />
        </Field>
      </div>

      <button type="submit" className="btn-primary w-full" disabled={saving}>
        {saving ? 'Saving…' : editing ? 'Save changes' : 'Publish hackathon'}
      </button>
      {!editing && (
        <p className="text-center text-xs text-slate-500">
          Publishing sends a push notification to every eligible student.
        </p>
      )}
    </form>
  );
}
