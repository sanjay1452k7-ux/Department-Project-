export const YEARS = ['I', 'II', 'III', 'IV'];

export const EVENT_MODES = ['online', 'offline', 'hybrid'];
export const STATUSES = ['upcoming', 'ongoing', 'closed'];
export const FEEDBACK_CATEGORIES = [
  { value: 'bug', label: 'Bug' },
  { value: 'suggestion', label: 'Suggestion' },
  { value: 'hackathon-info', label: 'Hackathon info' },
  { value: 'other', label: 'Other' },
];

export function formatDate(iso, { withTime = false } = {}) {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    ...(withTime ? { hour: '2-digit', minute: '2-digit' } : {}),
  });
}

/** Value for a datetime-local input, in the browser's own timezone. */
export function toDateInput(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function countdown(days) {
  if (days === null || days === undefined) return 'No deadline set';
  if (days < 0) return 'Registration closed';
  if (days === 0) return 'Closes today';
  if (days === 1) return '1 day left';
  return `${days} days left`;
}

/** Tailwind classes for the deadline pill — urgency you can read at a glance. */
export function countdownTone(days) {
  if (days === null || days === undefined) return 'bg-slate-100 text-slate-600';
  if (days < 0) return 'bg-slate-100 text-slate-500';
  if (days <= 1) return 'bg-rose-100 text-rose-700';
  if (days <= 3) return 'bg-orange-100 text-orange-700';
  if (days <= 7) return 'bg-amber-100 text-amber-800';
  return 'bg-emerald-100 text-emerald-700';
}

export const statusTone = (status) =>
  ({
    upcoming: 'bg-brand-100 text-brand-700',
    ongoing: 'bg-emerald-100 text-emerald-700',
    closed: 'bg-slate-200 text-slate-600',
  })[status] || 'bg-slate-100 text-slate-600';

export const feedbackTone = (status) =>
  ({
    open: 'bg-amber-100 text-amber-800',
    reviewed: 'bg-brand-100 text-brand-700',
    resolved: 'bg-emerald-100 text-emerald-700',
  })[status] || 'bg-slate-100 text-slate-600';

export const teamSize = (min, max) => {
  if (!min && !max) return 'Any team size';
  if (min && max) return min === max ? `${min} members` : `${min}–${max} members`;
  return min ? `${min}+ members` : `Up to ${max} members`;
};

export const list = (arr) => (arr && arr.length ? arr.join(', ') : '—');
