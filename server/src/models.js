import { parseList } from './db.js';
import { badRequest, daysUntil } from './util.js';

export const EVENT_MODES = ['online', 'offline', 'hybrid'];
export const STATUSES = ['upcoming', 'ongoing', 'closed'];
export const FEEDBACK_CATEGORIES = ['bug', 'suggestion', 'hackathon-info', 'other'];
export const FEEDBACK_STATUSES = ['open', 'reviewed', 'resolved'];

const asList = (value) => {
  if (value === undefined || value === null) return undefined;
  if (Array.isArray(value)) return value.map((v) => String(v).trim()).filter(Boolean);
  return String(value)
    .split(',')
    .map((v) => v.trim())
    .filter(Boolean);
};

const asDate = (value, field) => {
  if (value === undefined || value === null || value === '') return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) throw badRequest(`${field} is not a valid date`);
  return d.toISOString();
};

const asInt = (value, field) => {
  if (value === undefined || value === null || value === '') return null;
  const n = Number(value);
  if (!Number.isInteger(n) || n < 0) throw badRequest(`${field} must be a positive whole number`);
  return n;
};

const asUrl = (value, field) => {
  const s = String(value ?? '').trim();
  if (!s) return '';
  if (!/^https?:\/\//i.test(s)) throw badRequest(`${field} must start with http:// or https://`);
  return s;
};

/**
 * Validate and normalise a hackathon payload. `partial` skips required-field
 * checks so the same code serves both create and edit.
 */
export function normaliseHackathon(input = {}, { partial = false } = {}) {
  const out = {};
  const has = (k) => Object.prototype.hasOwnProperty.call(input, k);

  if (!partial || has('name')) {
    const name = String(input.name ?? '').trim();
    if (!name) throw badRequest('Hackathon name is required');
    out.name = name;
  }
  if (!partial || has('organizer')) {
    const organizer = String(input.organizer ?? '').trim();
    if (!partial && !organizer) throw badRequest('Organizer is required');
    out.organizer = organizer;
  }
  if (!partial || has('description')) out.description = String(input.description ?? '').trim();
  if (!partial || has('venue')) out.venue = String(input.venue ?? '').trim();
  if (!partial || has('prizeAmount')) out.prizeAmount = String(input.prizeAmount ?? '').trim();

  for (const key of ['themes', 'eligibility', 'tags']) {
    if (!partial || has(key)) out[key] = JSON.stringify(asList(input[key]) ?? []);
  }
  for (const key of ['regDeadline', 'round1Date', 'round2Date']) {
    if (!partial || has(key)) out[key] = asDate(input[key], key);
  }
  for (const key of ['teamSizeMin', 'teamSizeMax']) {
    if (!partial || has(key)) out[key] = asInt(input[key], key);
  }
  if (out.teamSizeMin != null && out.teamSizeMax != null && out.teamSizeMin > out.teamSizeMax) {
    throw badRequest('teamSizeMin cannot be greater than teamSizeMax');
  }
  if (!partial || has('eventMode')) {
    const mode = String(input.eventMode ?? 'online').trim().toLowerCase();
    if (!EVENT_MODES.includes(mode)) {
      throw badRequest(`eventMode must be one of ${EVENT_MODES.join(', ')}`);
    }
    out.eventMode = mode;
  }
  if (!partial || has('status')) {
    const status = String(input.status ?? 'upcoming').trim().toLowerCase();
    if (!STATUSES.includes(status)) {
      throw badRequest(`status must be one of ${STATUSES.join(', ')}`);
    }
    out.status = status;
  }
  if (!partial || has('registrationLink')) {
    out.registrationLink = asUrl(input.registrationLink, 'registrationLink');
  }
  return out;
}

/** DB row -> API shape (JSON columns expanded, derived fields added). */
export function serialiseHackathon(row, extra = {}) {
  if (!row) return null;
  const days = daysUntil(row.regDeadline);
  return {
    ...row,
    themes: parseList(row.themes),
    eligibility: parseList(row.eligibility),
    tags: parseList(row.tags),
    daysToDeadline: days,
    deadlinePassed: days !== null && days < 0,
    ...extra,
  };
}

export function serialiseWinner(row) {
  if (!row) return null;
  return { ...row, members: parseList(row.members) };
}

export function normaliseWinner(input = {}, { partial = false } = {}) {
  const out = {};
  const has = (k) => Object.prototype.hasOwnProperty.call(input, k);

  if (!partial || has('hackathonId')) {
    const id = String(input.hackathonId ?? '').trim();
    if (!id) throw badRequest('hackathonId is required');
    out.hackathonId = id;
  }
  if (!partial || has('teamName')) {
    const teamName = String(input.teamName ?? '').trim();
    if (!teamName) throw badRequest('teamName is required');
    out.teamName = teamName;
  }
  if (!partial || has('members')) out.members = JSON.stringify(asList(input.members) ?? []);
  if (!partial || has('placement')) {
    const placement = String(input.placement ?? '').trim();
    if (!partial && !placement) throw badRequest('placement is required');
    out.placement = placement;
  }
  if (!partial || has('prizeWon')) out.prizeWon = String(input.prizeWon ?? '').trim();
  if (!partial || has('problemStatementChosen')) {
    out.problemStatementChosen = String(input.problemStatementChosen ?? '').trim();
  }
  return out;
}
