import { useCallback, useEffect, useState } from 'react';
import { api, qs } from '../lib/api.js';
import {
  ConfirmButton,
  EmptyState,
  ErrorNote,
  Field,
  Sheet,
  Spinner,
  Toast,
  useToast,
} from '../components/ui.jsx';
import { formatDate, list } from '../lib/format.js';

const BLANK = {
  hackathonId: '',
  teamName: '',
  members: '',
  placement: '',
  prizeWon: '',
  problemStatementChosen: '',
};

const PLACEMENTS = ['Winner', 'Runner-up', '2nd Place', '3rd Place', 'Gold Medal', 'Silver Medal', 'Bronze Medal', 'Finalist', 'Special Mention'];

export default function AdminAchievements() {
  const [winners, setWinners] = useState([]);
  const [hackathons, setHackathons] = useState([]);
  const [filter, setFilter] = useState({ hackathonId: '', from: '', to: '' });
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(BLANK);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [formError, setFormError] = useState(null);
  const toast = useToast();

  const load = useCallback(() => {
    setLoading(true);
    Promise.all([api.get(`/winners${qs(filter)}`), api.get('/hackathons?sort=newest')])
      .then(([w, h]) => {
        setWinners(w.winners);
        setHackathons(h.hackathons);
      })
      .catch(setError)
      .finally(() => setLoading(false));
  }, [filter]);

  useEffect(load, [load]);

  const startAdd = () => {
    setEditingId(null);
    setForm({ ...BLANK, hackathonId: hackathons[0]?.id || '' });
    setFormError(null);
    setOpen(true);
  };

  const startEdit = (w) => {
    setEditingId(w.id);
    setForm({
      hackathonId: w.hackathonId,
      teamName: w.teamName,
      members: w.members.join(', '),
      placement: w.placement,
      prizeWon: w.prizeWon,
      problemStatementChosen: w.problemStatementChosen,
    });
    setFormError(null);
    setOpen(true);
  };

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const save = async (e) => {
    e.preventDefault();
    setSaving(true);
    setFormError(null);
    const payload = {
      ...form,
      members: form.members.split(',').map((s) => s.trim()).filter(Boolean),
    };
    try {
      if (editingId) await api.patch(`/winners/${editingId}`, payload);
      else await api.post('/winners', payload);
      toast.success(editingId ? 'Achievement updated' : 'Achievement posted');
      setOpen(false);
      load();
    } catch (err) {
      setFormError(err);
    } finally {
      setSaving(false);
    }
  };

  const remove = async (w) => {
    try {
      await api.del(`/winners/${w.id}`);
      toast.success('Achievement deleted');
      load();
    } catch (err) {
      toast.error(err.message);
    }
  };

  return (
    <div className="space-y-4">
      <Toast toast={toast.toast} onDismiss={toast.dismiss} />

      <div className="flex items-center justify-between gap-3">
        <h2 className="text-lg font-bold text-slate-900">Achievements</h2>
        <button type="button" className="btn-primary" onClick={startAdd} disabled={hackathons.length === 0}>
          + Add
        </button>
      </div>

      <div className="card space-y-3 p-4">
        <Field label="Filter by hackathon">
          <select
            className="field"
            value={filter.hackathonId}
            onChange={(e) => setFilter((f) => ({ ...f, hackathonId: e.target.value }))}
          >
            <option value="">All hackathons</option>
            {hackathons.map((h) => (
              <option key={h.id} value={h.id}>
                {h.name}
              </option>
            ))}
          </select>
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Posted from">
            <input
              type="date"
              className="field"
              value={filter.from}
              onChange={(e) => setFilter((f) => ({ ...f, from: e.target.value }))}
            />
          </Field>
          <Field label="Posted to">
            <input
              type="date"
              className="field"
              value={filter.to}
              onChange={(e) => setFilter((f) => ({ ...f, to: e.target.value }))}
            />
          </Field>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            className="btn-secondary flex-1"
            onClick={() => setFilter({ hackathonId: '', from: '', to: '' })}
          >
            Clear filters
          </button>
          <button
            type="button"
            className="btn-secondary flex-1"
            onClick={() => api.download(`/winners/export.csv${qs(filter)}`, 'achievements.csv')}
          >
            ⬇ Export CSV
          </button>
        </div>
      </div>

      <ErrorNote error={error} onRetry={load} />

      {loading ? (
        <Spinner />
      ) : winners.length === 0 ? (
        <EmptyState
          icon="🥇"
          title="No achievements posted"
          hint={
            hackathons.length === 0
              ? 'Add a hackathon first, then record who won it.'
              : 'Record a winning team and it appears in the student achievements feed.'
          }
        />
      ) : (
        <ul className="space-y-3">
          {winners.map((w) => (
            <li key={w.id} className="card p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h3 className="truncate font-semibold text-slate-900">{w.teamName}</h3>
                  <p className="truncate text-xs text-slate-500">{w.hackathonName}</p>
                </div>
                <span className="chip shrink-0 bg-amber-100 text-amber-800">{w.placement}</span>
              </div>
              <dl className="mt-2 space-y-1 text-xs text-slate-600">
                <div>
                  <dt className="inline font-medium text-slate-500">Members: </dt>
                  <dd className="inline">{list(w.members)}</dd>
                </div>
                {w.prizeWon && (
                  <div>
                    <dt className="inline font-medium text-slate-500">Prize: </dt>
                    <dd className="inline">{w.prizeWon}</dd>
                  </div>
                )}
                {w.problemStatementChosen && (
                  <div>
                    <dt className="inline font-medium text-slate-500">Problem statement: </dt>
                    <dd className="inline">{w.problemStatementChosen}</dd>
                  </div>
                )}
              </dl>
              <p className="mt-2 text-[11px] text-slate-400">
                Posted by {w.postedByName || 'staff'} on {formatDate(w.createdAt)}
              </p>
              <div className="mt-3 flex gap-2">
                <button
                  type="button"
                  className="btn-secondary px-3 py-1.5 text-xs"
                  onClick={() => startEdit(w)}
                >
                  Edit
                </button>
                <ConfirmButton
                  onConfirm={() => remove(w)}
                  className="btn-danger px-3 py-1.5 text-xs"
                  confirmLabel="Confirm delete"
                />
              </div>
            </li>
          ))}
        </ul>
      )}

      <Sheet
        open={open}
        onClose={() => setOpen(false)}
        title={editingId ? 'Edit achievement' : 'Add achievement'}
      >
        <form onSubmit={save} className="space-y-4" id="achievement-form">
          <ErrorNote error={formError} />
          <Field label="Hackathon" required>
            <select className="field" value={form.hackathonId} onChange={set('hackathonId')} required>
              {hackathons.map((h) => (
                <option key={h.id} value={h.id}>
                  {h.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Team name" required>
            <input className="field" value={form.teamName} onChange={set('teamName')} required />
          </Field>
          <Field label="Members" hint="Comma separated names or college IDs">
            <input
              className="field"
              value={form.members}
              onChange={set('members')}
              placeholder="Sanjay Kumar, Divya Ramesh"
            />
          </Field>
          <Field label="Placement" required hint="Pick a common one or type your own">
            <input
              className="field"
              list="placements"
              value={form.placement}
              onChange={set('placement')}
              required
            />
            <datalist id="placements">
              {PLACEMENTS.map((p) => (
                <option key={p} value={p} />
              ))}
            </datalist>
          </Field>
          <Field label="Prize won">
            <input className="field" value={form.prizeWon} onChange={set('prizeWon')} placeholder="₹1,00,000" />
          </Field>
          <Field label="Problem statement chosen">
            <textarea
              className="field min-h-[80px]"
              value={form.problemStatementChosen}
              onChange={set('problemStatementChosen')}
            />
          </Field>
          <button type="submit" className="btn-primary w-full" disabled={saving}>
            {saving ? 'Saving…' : editingId ? 'Save changes' : 'Post achievement'}
          </button>
        </form>
      </Sheet>
    </div>
  );
}
