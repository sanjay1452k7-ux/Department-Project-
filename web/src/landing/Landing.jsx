import { Link } from 'react-router-dom';

// Placeholder — replaced by the full scroll-driven 3D landing page in the next commit.
export default function Landing() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-slate-900 px-5 text-center text-white">
      <h1 className="text-4xl font-black">HackTrack</h1>
      <p className="max-w-sm text-slate-300">Every hackathon your department runs, in one place.</p>
      <div className="flex gap-3">
        <Link to="/login" className="btn-secondary">Sign in</Link>
        <Link to="/register" className="btn-primary">Get started</Link>
      </div>
    </div>
  );
}
