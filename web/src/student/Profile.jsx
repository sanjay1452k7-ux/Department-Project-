import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../lib/api.js';
import { useAuth } from '../lib/auth.jsx';
import { EmptyState, ErrorNote, Field, Spinner, Toast, useToast } from '../components/ui.jsx';
import { YEARS } from '../lib/format.js';
import { AchievementCard } from './Achievements.jsx';

const DEPARTMENTS = ['CSE', 'IT', 'ECE', 'EEE', 'MECH', 'CIVIL', 'AIDS', 'MBA', 'Other'];

export default function ProfilePage() {
  const { user, updateProfile, logout } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  const [form, setForm] = useState({
    name: user?.name || '',
    year: user?.year || 'I',
    department: user?.department || 'CSE',
    interests: (user?.interests || []).join(', '),
  });
  const [wins, setWins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    api
      .get('/winners/mine')
      .then((data) => setWins(data.winners))
      .catch(setError)
      .finally(() => setLoading(false));
  }, []);

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const save = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await updateProfile({
        ...form,
        interests: form.interests.split(',').map((s) => s.trim()).filter(Boolean),
      });
      toast.success('Profile updated');
    } catch (err) {
      setError(err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-5">
      <Toast toast={toast.toast} onDismiss={toast.dismiss} />

      <div className="card flex items-center gap-4 p-5">
        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-brand-600 text-xl font-bold text-white">
          {(user?.name || '?').charAt(0).toUpperCase()}
        </div>
        <div className="min-w-0">
          <h2 className="truncate text-lg font-bold text-slate-900">{user?.name}</h2>
          <p className="truncate text-sm text-slate-500">{user?.email}</p>
          <p className="text-xs text-slate-400">
            {[user?.collegeId, user?.year && `Year ${user.year}`, user?.department]
              .filter(Boolean)
              .join(' · ')}
          </p>
        </div>
      </div>

      <Link to="/notifications/settings" className="card flex items-center justify-between p-4">
        <span className="text-sm font-medium text-slate-800">🔔 Notification settings</span>
        <span className="text-slate-400">›</span>
      </Link>

      <section>
        <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-500">
          My achievements
        </h3>
        {loading ? (
          <Spinner />
        ) : wins.length === 0 ? (
          <EmptyState
            icon="🎯"
            title="No wins recorded yet"
            hint="When staff post results with your name on the team, they appear here."
          />
        ) : (
          <ul className="space-y-3">
            {wins.map((w) => (
              <li key={w.id}>
                <AchievementCard winner={w} />
              </li>
            ))}
          </ul>
        )}
      </section>

      <form onSubmit={save} className="card space-y-4 p-4">
        <h3 className="text-sm font-semibold text-slate-800">Edit details</h3>
        <ErrorNote error={error} />
        <Field label="Name">
          <input className="field" value={form.name} onChange={set('name')} />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Year">
            <select className="field" value={form.year} onChange={set('year')}>
              {YEARS.map((y) => (
                <option key={y} value={y}>
                  Year {y}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Department">
            <select className="field" value={form.department} onChange={set('department')}>
              {DEPARTMENTS.map((d) => (
                <option key={d}>{d}</option>
              ))}
            </select>
          </Field>
        </div>
        <Field label="Interests" hint="Comma separated">
          <input className="field" value={form.interests} onChange={set('interests')} />
        </Field>
        <button type="submit" className="btn-primary w-full" disabled={saving}>
          {saving ? 'Saving…' : 'Save changes'}
        </button>
      </form>

      <button
        type="button"
        className="btn-secondary w-full"
        onClick={() => {
          logout();
          navigate('/login', { replace: true });
        }}
      >
        Sign out
      </button>
    </div>
  );
}
