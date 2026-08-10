import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../lib/api.js';
import { useAuth } from '../lib/auth.jsx';
import { ErrorNote, Field, Toast, useToast } from '../components/ui.jsx';
import { disablePush, enablePush, getSubscription, pushSupported } from '../lib/push.js';

function Toggle({ label, hint, checked, onChange }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className="flex w-full items-center justify-between gap-4 py-3 text-left"
    >
      <span className="min-w-0">
        <span className="block text-sm font-medium text-slate-800">{label}</span>
        {hint && <span className="block text-xs text-slate-500">{hint}</span>}
      </span>
      <span
        className={`relative h-6 w-11 shrink-0 rounded-full transition ${
          checked ? 'bg-brand-600' : 'bg-slate-300'
        }`}
      >
        <span
          className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${
            checked ? 'left-[22px]' : 'left-0.5'
          }`}
        />
      </span>
    </button>
  );
}

export default function NotificationSettings() {
  const { user, updateProfile } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  const [themes, setThemes] = useState((user?.notifyThemes || []).join(', '));
  const [available, setAvailable] = useState([]);
  const [subscribed, setSubscribed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    getSubscription()
      .then((sub) => setSubscribed(Boolean(sub)))
      .catch(() => {});
    api
      .get('/hackathons')
      .then((data) => {
        const set = new Set();
        data.hackathons.forEach((h) => {
          h.themes.forEach((t) => set.add(t));
          h.tags.forEach((t) => set.add(t));
        });
        setAvailable([...set].sort());
      })
      .catch(() => {});
  }, []);

  const save = async (patch) => {
    setError(null);
    try {
      await updateProfile(patch);
      toast.success('Saved');
    } catch (err) {
      setError(err);
    }
  };

  const togglePush = async (next) => {
    setBusy(true);
    setError(null);
    try {
      if (next) {
        await enablePush();
        setSubscribed(true);
        toast.success('Push notifications are on');
      } else {
        await disablePush();
        setSubscribed(false);
        toast.info('Push notifications are off');
      }
    } catch (err) {
      setError(err);
    } finally {
      setBusy(false);
    }
  };

  const saveThemes = async () => {
    const listed = themes
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    await save({ notifyThemes: listed });
  };

  const toggleTheme = (theme) => {
    const current = themes
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    const next = current.includes(theme)
      ? current.filter((t) => t !== theme)
      : [...current, theme];
    setThemes(next.join(', '));
    save({ notifyThemes: next });
  };

  const selected = themes
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

  return (
    <div className="space-y-4">
      <Toast toast={toast.toast} onDismiss={toast.dismiss} />
      <button type="button" onClick={() => navigate(-1)} className="text-sm font-medium text-brand-700">
        ← Back
      </button>

      <h2 className="text-lg font-bold text-slate-900">Notification settings</h2>
      <ErrorNote error={error} />

      <section className="card divide-y divide-slate-100 px-4">
        <Toggle
          label="Browser push notifications"
          hint={
            pushSupported()
              ? 'Get alerts even when HackTrack is closed. Add it to your home screen for the best results.'
              : 'Not supported in this browser'
          }
          checked={subscribed}
          onChange={(next) => !busy && pushSupported() && togglePush(next)}
        />
        <Toggle
          label="New hackathon posted"
          hint="The moment staff publish something you are eligible for"
          checked={Boolean(user?.notifyNew)}
          onChange={(next) => save({ notifyNew: next })}
        />
        <Toggle
          label="Deadline reminders"
          hint="7 days, 3 days, 1 day before and on the closing day"
          checked={Boolean(user?.notifyDeadline)}
          onChange={(next) => save({ notifyDeadline: next })}
        />
      </section>

      <section className="card space-y-3 p-4">
        <div>
          <h3 className="text-sm font-semibold text-slate-800">Themes you care about</h3>
          <p className="text-xs text-slate-500">
            Leave empty to hear about everything. Pick some and we only alert you when a hackathon
            matches.
          </p>
        </div>

        {available.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {available.map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => toggleTheme(t)}
                className={`chip ${
                  selected.includes(t)
                    ? 'bg-brand-600 text-white'
                    : 'border border-slate-200 bg-white text-slate-600'
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        )}

        <Field label="Or type your own" hint="Comma separated">
          <input
            className="field"
            value={themes}
            onChange={(e) => setThemes(e.target.value)}
            onBlur={saveThemes}
            placeholder="agentic ai, fintech"
          />
        </Field>
      </section>
    </div>
  );
}
