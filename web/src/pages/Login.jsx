import { useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/auth.jsx';
import { ErrorNote, Field, Spinner } from '../components/ui.jsx';

export default function LoginPage() {
  const { user, loading, login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  if (loading) return <Spinner />;
  if (user) return <Navigate to={user.role === 'staff' ? '/admin' : '/'} replace />;

  const onSubmit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const signedIn = await login(identifier.trim(), password);
      const target = location.state?.from?.pathname;
      navigate(signedIn.role === 'staff' ? '/admin' : target || '/', { replace: true });
    } catch (err) {
      setError(err);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col justify-center bg-gradient-to-b from-brand-600 to-brand-800 px-5 py-10">
      <div className="mx-auto w-full max-w-sm">
        <div className="mb-8 text-center text-white">
          <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-2xl bg-white/15 text-3xl font-black">
            H
          </div>
          <h1 className="text-2xl font-bold">HackTrack</h1>
          <p className="mt-1 text-sm text-brand-100">
            Every hackathon your department runs, in one place.
          </p>
        </div>

        <form onSubmit={onSubmit} className="card space-y-4 p-5">
          <h2 className="text-lg font-semibold text-slate-900">Sign in</h2>
          <ErrorNote error={error} />
          <Field label="College ID or email" required>
            <input
              className="field"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              autoComplete="username"
              placeholder="22CS041 or you@college.edu"
              required
            />
          </Field>
          <Field label="Password" required>
            <input
              type="password"
              className="field"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              required
            />
          </Field>
          <button type="submit" className="btn-primary w-full" disabled={busy}>
            {busy ? 'Signing in…' : 'Sign in'}
          </button>
          <p className="text-center text-sm text-slate-500">
            New here?{' '}
            <Link to="/register" className="font-semibold text-brand-700">
              Create an account
            </Link>
          </p>
        </form>

        <p className="mt-6 text-center text-xs text-brand-100">
          Demo accounts (after <code>npm run seed</code>): sanjay.k@college.edu (student) ·
          meera.k@college.edu (staff) — password <code>hacktrack123</code>
        </p>
      </div>
    </div>
  );
}
