import express from 'express';
import { db, nowIso, parseList } from '../db.js';
import { requireAuth, requireRole } from '../auth.js';
import { normaliseHackathon, serialiseHackathon, serialiseWinner, STATUSES } from '../models.js';
import { badRequest, daysUntil, isEligible, newId, notFound, prizeValue, toCsv, wrap } from '../util.js';
import { announceNewHackathon } from '../services/notifications.js';

export const hackathonsRouter = express.Router();

const getById = db.prepare('SELECT * FROM hackathons WHERE id = ?');
const staffOnly = [requireAuth, requireRole('staff')];

const COLUMNS = [
  'name', 'description', 'organizer', 'themes', 'eligibility', 'teamSizeMin', 'teamSizeMax',
  'prizeAmount', 'regDeadline', 'round1Date', 'round2Date', 'eventMode', 'venue', 'status',
  'registrationLink', 'tags',
];

/** Shared list query used by the feed, the archive view and the CSV export. */
function queryHackathons(params = {}, viewer = null) {
  const {
    status,
    q,
    theme,
    tag,
    eligibility,
    mode,
    minPrize,
    eligibleOnly,
    sort = 'deadline',
    includeClosed,
  } = params;

  let rows = db.prepare('SELECT * FROM hackathons').all();

  if (status && STATUSES.includes(status)) rows = rows.filter((h) => h.status === status);
  else if (includeClosed === 'false' || includeClosed === false) rows = rows.filter((h) => h.status !== 'closed');

  if (theme) {
    const needle = String(theme).toLowerCase();
    rows = rows.filter((h) =>
      parseList(h.themes).some((t) => String(t).toLowerCase().includes(needle)),
    );
  }
  if (tag) {
    const needle = String(tag).toLowerCase();
    rows = rows.filter((h) => parseList(h.tags).some((t) => String(t).toLowerCase().includes(needle)));
  }
  if (mode) rows = rows.filter((h) => h.eventMode === String(mode).toLowerCase());
  if (minPrize) rows = rows.filter((h) => prizeValue(h.prizeAmount) >= Number(minPrize));
  if (eligibility) rows = rows.filter((h) => isEligible(parseList(h.eligibility), eligibility));
  if ((eligibleOnly === 'true' || eligibleOnly === true) && viewer?.role === 'student') {
    rows = rows.filter((h) => isEligible(parseList(h.eligibility), viewer.year));
  }
  if (q) {
    const needle = String(q).toLowerCase();
    rows = rows.filter((h) =>
      [h.name, h.organizer, h.description, h.themes, h.tags, h.venue]
        .join(' ')
        .toLowerCase()
        .includes(needle),
    );
  }

  const far = Number.MAX_SAFE_INTEGER;
  const sorters = {
    // Closest live deadline first; hackathons whose deadline has passed or was
    // never set sink to the bottom instead of hijacking the top of the feed.
    deadline: (a, b) => {
      const rank = (h) => {
        const d = daysUntil(h.regDeadline);
        return d === null || d < 0 ? far : d;
      };
      return rank(a) - rank(b) || new Date(b.createdAt) - new Date(a.createdAt);
    },
    newest: (a, b) => new Date(b.createdAt) - new Date(a.createdAt),
    prize: (a, b) => prizeValue(b.prizeAmount) - prizeValue(a.prizeAmount),
    name: (a, b) => a.name.localeCompare(b.name),
  };
  rows.sort(sorters[sort] || sorters.deadline);
  return rows;
}

hackathonsRouter.get(
  '/',
  wrap((req, res) => {
    const rows = queryHackathons(req.query, req.user);
    res.json({
      hackathons: rows.map((row) =>
        serialiseHackathon(row, {
          eligibleForViewer:
            req.user?.role === 'student'
              ? isEligible(parseList(row.eligibility), req.user.year)
              : null,
        }),
      ),
    });
  }),
);

hackathonsRouter.get(
  '/export.csv',
  ...staffOnly,
  wrap((req, res) => {
    const rows = queryHackathons({ ...req.query, sort: req.query.sort || 'newest' }).map((h) => ({
      ...h,
      themes: parseList(h.themes),
      eligibility: parseList(h.eligibility),
      tags: parseList(h.tags),
      postedByName: db.prepare('SELECT name FROM users WHERE id = ?').get(h.postedBy)?.name || '',
    }));
    const csv = toCsv(rows, [
      { key: 'name', label: 'Name' },
      { key: 'organizer', label: 'Organizer' },
      { key: 'status', label: 'Status' },
      { key: 'themes', label: 'Themes' },
      { key: 'tags', label: 'Tags' },
      { key: 'eligibility', label: 'Eligibility' },
      { key: 'teamSizeMin', label: 'Team size min' },
      { key: 'teamSizeMax', label: 'Team size max' },
      { key: 'prizeAmount', label: 'Prize' },
      { key: 'regDeadline', label: 'Registration deadline' },
      { key: 'round1Date', label: 'Round 1' },
      { key: 'round2Date', label: 'Round 2' },
      { key: 'eventMode', label: 'Mode' },
      { key: 'venue', label: 'Venue' },
      { key: 'registrationLink', label: 'Registration link' },
      { key: 'postedByName', label: 'Posted by' },
      { key: 'createdAt', label: 'Created at' },
      { key: 'updatedAt', label: 'Updated at' },
    ]);
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="hackathons.csv"');
    res.send(csv);
  }),
);

hackathonsRouter.get(
  '/:id',
  wrap((req, res) => {
    const row = getById.get(req.params.id);
    if (!row) throw notFound('Hackathon not found');
    const winners = db
      .prepare('SELECT * FROM winners WHERE hackathonId = ? ORDER BY createdAt DESC')
      .all(row.id)
      .map(serialiseWinner);
    const postedByName = db.prepare('SELECT name FROM users WHERE id = ?').get(row.postedBy)?.name || null;
    res.json({
      hackathon: serialiseHackathon(row, {
        winners,
        postedByName,
        eligibleForViewer:
          req.user?.role === 'student' ? isEligible(parseList(row.eligibility), req.user.year) : null,
      }),
    });
  }),
);

hackathonsRouter.post(
  '/',
  ...staffOnly,
  wrap(async (req, res) => {
    const data = normaliseHackathon(req.body);
    const at = nowIso();
    const row = { ...data, id: newId('hck'), postedBy: req.user.id, updatedBy: req.user.id, createdAt: at, updatedAt: at };
    db.prepare(
      `INSERT INTO hackathons (${['id', ...COLUMNS, 'postedBy', 'updatedBy', 'createdAt', 'updatedAt'].join(', ')})
       VALUES (${['id', ...COLUMNS, 'postedBy', 'updatedBy', 'createdAt', 'updatedAt'].map((c) => `@${c}`).join(', ')})`,
    ).run(row);

    const saved = getById.get(row.id);
    // Publishing is what triggers the fan-out; failures here must not fail the
    // write, so they are logged and swallowed.
    let notified = 0;
    try {
      notified = await announceNewHackathon(saved);
    } catch (err) {
      console.error('[hackathons] announce failed:', err);
    }
    res.status(201).json({ hackathon: serialiseHackathon(saved), notified });
  }),
);

hackathonsRouter.patch(
  '/:id',
  ...staffOnly,
  wrap((req, res) => {
    const existing = getById.get(req.params.id);
    if (!existing) throw notFound('Hackathon not found');
    const data = normaliseHackathon(req.body, { partial: true });
    const keys = Object.keys(data);
    if (keys.length === 0) throw badRequest('No fields to update');
    db.prepare(
      `UPDATE hackathons SET ${keys.map((k) => `${k} = @${k}`).join(', ')}, updatedBy = @updatedBy, updatedAt = @updatedAt WHERE id = @id`,
    ).run({ ...data, id: existing.id, updatedBy: req.user.id, updatedAt: nowIso() });
    res.json({ hackathon: serialiseHackathon(getById.get(existing.id)) });
  }),
);

hackathonsRouter.post(
  '/:id/duplicate',
  ...staffOnly,
  wrap((req, res) => {
    const source = getById.get(req.params.id);
    if (!source) throw notFound('Hackathon not found');
    const at = nowIso();
    const copy = { ...source };
    for (const key of ['regDeadline', 'round1Date', 'round2Date']) copy[key] = null;
    Object.assign(copy, {
      id: newId('hck'),
      name: String(req.body?.name || `${source.name} (copy)`).trim(),
      status: 'upcoming',
      postedBy: req.user.id,
      updatedBy: req.user.id,
      createdAt: at,
      updatedAt: at,
    });
    db.prepare(
      `INSERT INTO hackathons (${['id', ...COLUMNS, 'postedBy', 'updatedBy', 'createdAt', 'updatedAt'].join(', ')})
       VALUES (${['id', ...COLUMNS, 'postedBy', 'updatedBy', 'createdAt', 'updatedAt'].map((c) => `@${c}`).join(', ')})`,
    ).run(copy);
    // Dates are deliberately cleared: a template is not yet publishable, so no
    // notification goes out until staff fill in the new dates and save.
    res.status(201).json({ hackathon: serialiseHackathon(getById.get(copy.id)) });
  }),
);

hackathonsRouter.post(
  '/:id/announce',
  ...staffOnly,
  wrap(async (req, res) => {
    const row = getById.get(req.params.id);
    if (!row) throw notFound('Hackathon not found');
    const notified = await announceNewHackathon(row);
    res.json({ notified });
  }),
);

hackathonsRouter.delete(
  '/:id',
  ...staffOnly,
  wrap((req, res) => {
    const info = db.prepare('DELETE FROM hackathons WHERE id = ?').run(req.params.id);
    if (info.changes === 0) throw notFound('Hackathon not found');
    res.json({ ok: true });
  }),
);
