import { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/auth.jsx';
import { ErrorNote, Field, Spinner } from '../components/ui.jsx';
import { YEARS } from '../lib/format.js';

const DEPARTMENTS = ['CSE', 'IT', 'ECE', 'EEE', 'MECH', 'CIVIL', 'AIDS', 'MBA', 'Other'];

export default function RegisterPage() {
  const { user, loading, register } = useAuth();
  const navigate = useNavigate();
  const [role, setRole] = useState('student');
  const [form, setForm] = useState({
    name: '',
    email: '',
    collegeId: '',
    password: '',
    year: 'I',
    department: 'CSE',
    interests: '',
  });
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  if (loading) return <Spinner />;
  if (user) return <Navigate to={user.role === 'staff' ? '/admin' : '/'} replace />;

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const onSubmit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const created = await register({
        ...form,
        role,
        year: role === 'student' ? form.year : undefined,
        interests: form.interests
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean),
      });
      navigate(created.role === 'staff' ? '/admin' : '/', { replace: true });
    } catch (err) {
      setError(err);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-brand-600 to-brand-800 px-5 py-10">
      <div className="mx-auto w-full max-w-sm">
        <h1 className="mb-6 text-center text-2xl font-bold text-white">Create your account</h1>

        <form onSubmit={onSubmit} className="card space-y-4 p-5">
          <ErrorNote error={error} />

          <div className="grid grid-cols-2 gap-2 rounded-xl bg-slate-100 p-1">
            {['student', 'staff'].map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => setRole(value)}
                className={`rounded-lg py-2 text-sm font-semibold capitalize transition ${
                  role === value ? 'bg-white text-brand-700 shadow-sm' : 'text-slate-500'
                }`}
              >
                {value === 'staff' ? 'Staff / Admin' : 'Student'}
              </button>
            ))}
          </div>

          <Field label="Full name" required>
            <input className="field" value={form.name} onChange={set('name')} required />
          </Field>
          <Field label="College email" required>
            <input
              type="email"
              className="field"
              value={form.email}
              onChange={set('email')}
              autoComplete="email"
              required
            />
          </Field>
          <Field label="College ID" hint="Used as an alternative login">
            <input
              className="field"
              value={form.collegeId}
              onChange={set('collegeId')}
              placeholder={role === 'staff' ? 'STF001' : '22CS041'}
            />
          </Field>

          {role === 'student' && (
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
          )}
          {role === 'staff' && (
            <Field label="Department">
              <select className="field" value={form.department} onChange={set('department')}>
                {DEPARTMENTS.map((d) => (
                  <option key={d}>{d}</option>
                ))}
              </select>
            </Field>
          )}

          {role === 'student' && (
            <Field label="Interests" hint="Comma separated — used to tune your notifications">
              <input
                className="field"
                value={form.interests}
                onChange={set('interests')}
                placeholder="agentic ai, fintech, robotics"
              />
            </Field>
          )}

          <Field label="Password" required hint="At least 8 characters">
            <input
              type="password"
              className="field"
              value={form.password}
              onChange={set('password')}
              minLength={8}
              autoComplete="new-password"
              required
            />
          </Field>

          <button type="submit" className="btn-primary w-full" disabled={busy}>
            {busy ? 'Creating…' : 'Create account'}
          </button>
          <p className="text-center text-sm text-slate-500">
            Already registered?{' '}
            <Link to="/login" className="font-semibold text-brand-700">
              Sign in
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}
