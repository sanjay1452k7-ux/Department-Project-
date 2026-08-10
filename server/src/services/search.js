import { db } from '../db.js';
import { serialiseHackathon, serialiseWinner } from '../models.js';

const STOP_WORDS = new Set([
  'a', 'an', 'the', 'is', 'are', 'was', 'were', 'for', 'of', 'to', 'in', 'on', 'at', 'by',
  'with', 'about', 'any', 'some', 'me', 'my', 'i', 'we', 'show', 'find', 'list', 'give',
  'which', 'what', 'when', 'where', 'who', 'how', 'and', 'or', 'that', 'this', 'there',
  'hackathon', 'hackathons', 'competition', 'competitions', 'event', 'events', 'related',
]);

/**
 * Loose synonym expansion so vague natural-language input still lands. Each key
 * is a token the user might type; the values are extra tokens we also try.
 */
const SYNONYMS = {
  ai: ['artificial', 'intelligence', 'ml', 'machine', 'agentic', 'genai'],
  ml: ['machine', 'learning', 'ai'],
  language: ['nlp', 'llm', 'bhashini', 'translation', 'speech', 'text'],
  llm: ['language', 'model', 'nlp', 'genai'],
  nlp: ['language', 'text', 'speech'],
  fintech: ['finance', 'banking', 'payments'],
  health: ['healthcare', 'medical', 'medtech'],
  cyber: ['security', 'cybersecurity', 'infosec'],
  web: ['frontend', 'fullstack', 'webdev'],
  app: ['mobile', 'android', 'ios'],
  iot: ['embedded', 'hardware', 'sensors'],
  block: ['blockchain', 'web3'],
  robot: ['robotics', 'automation'],
  data: ['analytics', 'datascience', 'visualisation', 'visualization'],
};

export function tokenise(query) {
  return String(query || '')
    .toLowerCase()
    .split(/[^a-z0-9+#]+/)
    .map((t) => t.trim())
    .filter((t) => t.length > 1 && !STOP_WORDS.has(t));
}

function expand(tokens) {
  const out = new Map();
  for (const token of tokens) {
    out.set(token, 1);
    for (const syn of SYNONYMS[token] || []) {
      if (!out.has(syn)) out.set(syn, 0.55);
    }
    // Cheap stemming so "robotics" matches "robot", "payments" matches "payment".
    const stem = token.replace(/(ing|ers|er|ies|s)$/, '');
    if (stem.length > 2 && !out.has(stem)) out.set(stem, 0.8);
  }
  return out;
}

/** Score one token against one field value. Exact word > prefix > substring. */
function scoreField(token, value) {
  if (!value) return 0;
  const haystack = String(value).toLowerCase();
  if (!haystack.includes(token)) return 0;
  const words = haystack.split(/[^a-z0-9+#]+/);
  if (words.includes(token)) return 1;
  if (words.some((w) => w.startsWith(token) || token.startsWith(w))) return 0.75;
  return 0.5;
}

const HACKATHON_FIELDS = [
  ['name', 4],
  ['tags', 3],
  ['themes', 3],
  ['organizer', 2],
  ['description', 1],
  ['venue', 0.5],
  ['eligibility', 0.5],
  ['prizeAmount', 0.5],
];

const WINNER_FIELDS = [
  ['teamName', 4],
  ['members', 3.5],
  ['placement', 1.5],
  ['problemStatementChosen', 1.5],
  ['hackathonName', 2.5],
  ['prizeWon', 0.5],
];

function scoreRow(row, weights, expanded) {
  let total = 0;
  let matchedTokens = 0;
  for (const [token, tokenWeight] of expanded) {
    let best = 0;
    for (const [field, fieldWeight] of weights) {
      best = Math.max(best, scoreField(token, row[field]) * fieldWeight);
    }
    if (best > 0) matchedTokens += 1;
    total += best * tokenWeight;
  }
  // Reward rows that hit several distinct query terms rather than one term hard.
  return matchedTokens === 0 ? 0 : total * (1 + 0.25 * (matchedTokens - 1));
}

/**
 * Search hackathons and achievements with one keyword / natural-language query.
 * Matching is partial and synonym-aware, so "language ai" surfaces a
 * differently-named hackathon tagged "language model".
 */
export function search(query, { limit = 25, includeClosed = true } = {}) {
  const tokens = tokenise(query);
  if (tokens.length === 0) return { query, hackathons: [], achievements: [] };
  const expanded = expand(tokens);

  const hackRows = db.prepare('SELECT * FROM hackathons').all();
  const hackathons = hackRows
    .map((row) => ({
      row,
      score: scoreRow(
        {
          ...row,
          tags: JSON.parse(row.tags || '[]').join(' '),
          themes: JSON.parse(row.themes || '[]').join(' '),
          eligibility: JSON.parse(row.eligibility || '[]').join(' '),
        },
        HACKATHON_FIELDS,
        expanded,
      ),
    }))
    .filter((r) => r.score > 0 && (includeClosed || r.row.status !== 'closed'))
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((r) => serialiseHackathon(r.row, { score: Number(r.score.toFixed(2)) }));

  const winnerRows = db
    .prepare(
      `SELECT w.*, h.name AS hackathonName, h.organizer AS hackathonOrganizer
       FROM winners w LEFT JOIN hackathons h ON h.id = w.hackathonId`,
    )
    .all();
  const achievements = winnerRows
    .map((row) => ({
      row,
      score: scoreRow(
        { ...row, members: JSON.parse(row.members || '[]').join(' ') },
        WINNER_FIELDS,
        expanded,
      ),
    }))
    .filter((r) => r.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((r) => ({ ...serialiseWinner(r.row), score: Number(r.score.toFixed(2)) }));

  return { query, hackathons, achievements };
}
