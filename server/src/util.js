import crypto from 'node:crypto';

export const newId = (prefix = '') =>
  `${prefix}${prefix ? '_' : ''}${crypto.randomUUID().replace(/-/g, '').slice(0, 20)}`;

export class HttpError extends Error {
  constructor(status, message, details) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

export const badRequest = (msg, details) => new HttpError(400, msg, details);
export const unauthorized = (msg = 'Not authenticated') => new HttpError(401, msg);
export const forbidden = (msg = 'Not allowed') => new HttpError(403, msg);
export const notFound = (msg = 'Not found') => new HttpError(404, msg);

/** Wrap an async route handler so rejections reach the error middleware. */
export const wrap = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

const YEAR_WORDS = {
  1: 'I', 2: 'II', 3: 'III', 4: 'IV', 5: 'V',
  i: 'I', ii: 'II', iii: 'III', iv: 'IV', v: 'V',
  '1st': 'I', '2nd': 'II', '3rd': 'III', '4th': 'IV', '5th': 'V',
  first: 'I', second: 'II', third: 'III', fourth: 'IV', fifth: 'V',
};

/**
 * Normalise the many ways a year gets written ("2", "2nd year", "II", "second")
 * to the roman-numeral form used in `hackathons.eligibility`. Non-year values
 * such as "StartUp" or "Alumni" are passed through upper-cased so they can
 * still be matched exactly.
 */
export function normaliseYear(value) {
  if (value === null || value === undefined || value === '') return '';
  const raw = String(value).trim().toLowerCase();
  const compact = raw.replace(/\s*(year|yr)\s*$/, '').trim();
  return YEAR_WORDS[compact] || YEAR_WORDS[Number(compact)] || compact.toUpperCase();
}

/**
 * Is a student eligible for a hackathon? An empty eligibility list means "open
 * to everyone"; otherwise the student's year must appear in the list. Entries
 * that aren't years (e.g. "StartUp") never exclude anyone on their own, but a
 * list made up entirely of them is treated as open.
 */
export function isEligible(eligibility, year) {
  const list = (eligibility || []).map((e) => normaliseYear(e)).filter(Boolean);
  if (list.length === 0) return true;
  const years = list.filter((e) => /^(I{1,3}|IV|V)$/.test(e));
  if (years.length === 0) return true;
  return years.includes(normaliseYear(year));
}

/** Whole days from now until `iso` (negative once it is in the past). */
export function daysUntil(iso, from = new Date()) {
  if (!iso) return null;
  const target = new Date(iso);
  if (Number.isNaN(target.getTime())) return null;
  const startOf = (d) => Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
  return Math.round((startOf(target) - startOf(from)) / 86400000);
}

/** Best-effort numeric value of a free-text prize ("₹1,50,000" -> 150000). */
export function prizeValue(prize) {
  if (!prize) return 0;
  const digits = String(prize).replace(/[^\d.]/g, '');
  const n = Number.parseFloat(digits);
  if (!Number.isFinite(n)) return 0;
  if (/lakh|lac/i.test(prize)) return n * 100000;
  if (/crore/i.test(prize)) return n * 10000000;
  if (/\bk\b/i.test(prize)) return n * 1000;
  return n;
}

export function toCsv(rows, columns) {
  const esc = (v) => {
    const s = v === null || v === undefined ? '' : Array.isArray(v) ? v.join('; ') : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const header = columns.map((c) => esc(c.label ?? c.key)).join(',');
  const body = rows.map((row) => columns.map((c) => esc(row[c.key])).join(',')).join('\n');
  return `${header}\n${body}\n`;
}
