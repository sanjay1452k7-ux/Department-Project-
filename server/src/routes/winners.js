import express from 'express';
import { db, nowIso, parseList } from '../db.js';
import { requireAuth, requireRole } from '../auth.js';
import { normaliseWinner, serialiseWinner } from '../models.js';
import { badRequest, newId, notFound, toCsv, wrap } from '../util.js';

export const winnersRouter = express.Router();

const staffOnly = [requireAuth, requireRole('staff')];
const JOINED = `SELECT w.*, h.name AS hackathonName, h.organizer AS hackathonOrganizer, u.name AS postedByName
                FROM winners w
                LEFT JOIN hackathons h ON h.id = w.hackathonId
                LEFT JOIN users u ON u.id = w.postedBy`;
const getById = db.prepare(`${JOINED} WHERE w.id = ?`);

function queryWinners({ hackathonId, q, from, to } = {}) {
  let rows = db.prepare(`${JOINED} ORDER BY w.createdAt DESC`).all();
  if (hackathonId) rows = rows.filter((w) => w.hackathonId === hackathonId);
  if (from) rows = rows.filter((w) => new Date(w.createdAt) >= new Date(from));
  if (to) rows = rows.filter((w) => new Date(w.createdAt) <= new Date(to));
  if (q) {
    const needle = String(q).toLowerCase();
    rows = rows.filter((w) =>
      [w.teamName, w.placement, w.problemStatementChosen, w.hackathonName, w.members]
        .join(' ')
        .toLowerCase()
        .includes(needle),
    );
  }
  return rows;
}

// Public feed — any signed-in user (students included) can read achievements.
winnersRouter.get(
  '/',
  wrap((req, res) => {
    res.json({ winners: queryWinners(req.query).map(serialiseWinner) });
  }),
);

winnersRouter.get(
  '/export.csv',
  ...staffOnly,
  wrap((req, res) => {
    const rows = queryWinners(req.query).map((w) => ({ ...w, members: parseList(w.members) }));
    const csv = toCsv(rows, [
      { key: 'hackathonName', label: 'Hackathon' },
      { key: 'teamName', label: 'Team' },
      { key: 'members', label: 'Members' },
      { key: 'placement', label: 'Placement' },
      { key: 'prizeWon', label: 'Prize won' },
      { key: 'problemStatementChosen', label: 'Problem statement' },
      { key: 'postedByName', label: 'Posted by' },
      { key: 'createdAt', label: 'Posted at' },
    ]);
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="achievements.csv"');
    res.send(csv);
  }),
);

/** A student's own wins, matched on their name or college ID in `members`. */
winnersRouter.get(
  '/mine',
  requireAuth,
  wrap((req, res) => {
    const keys = [req.user.name, req.user.collegeId, req.user.id]
      .filter(Boolean)
      .map((k) => String(k).toLowerCase());
    const rows = db
      .prepare(`${JOINED} ORDER BY w.createdAt DESC`)
      .all()
      .filter((w) =>
        parseList(w.members).some((m) => keys.includes(String(m).toLowerCase().trim())),
      );
    res.json({ winners: rows.map(serialiseWinner) });
  }),
);

winnersRouter.post(
  '/',
  ...staffOnly,
  wrap((req, res) => {
    const data = normaliseWinner(req.body);
    if (!db.prepare('SELECT 1 FROM hackathons WHERE id = ?').get(data.hackathonId)) {
      throw badRequest('That hackathon does not exist');
    }
    const at = nowIso();
    const row = { ...data, id: newId('win'), postedBy: req.user.id, createdAt: at, updatedAt: at };
    db.prepare(
      `INSERT INTO winners (id, hackathonId, teamName, members, placement, prizeWon, problemStatementChosen, postedBy, createdAt, updatedAt)
       VALUES (@id, @hackathonId, @teamName, @members, @placement, @prizeWon, @problemStatementChosen, @postedBy, @createdAt, @updatedAt)`,
    ).run(row);
    res.status(201).json({ winner: serialiseWinner(getById.get(row.id)) });
  }),
);

winnersRouter.patch(
  '/:id',
  ...staffOnly,
  wrap((req, res) => {
    const existing = db.prepare('SELECT * FROM winners WHERE id = ?').get(req.params.id);
    if (!existing) throw notFound('Achievement not found');
    const data = normaliseWinner(req.body, { partial: true });
    const keys = Object.keys(data);
    if (keys.length === 0) throw badRequest('No fields to update');
    if (data.hackathonId && !db.prepare('SELECT 1 FROM hackathons WHERE id = ?').get(data.hackathonId)) {
      throw badRequest('That hackathon does not exist');
    }
    db.prepare(
      `UPDATE winners SET ${keys.map((k) => `${k} = @${k}`).join(', ')}, updatedAt = @updatedAt WHERE id = @id`,
    ).run({ ...data, id: existing.id, updatedAt: nowIso() });
    res.json({ winner: serialiseWinner(getById.get(existing.id)) });
  }),
);

winnersRouter.delete(
  '/:id',
  ...staffOnly,
  wrap((req, res) => {
    const info = db.prepare('DELETE FROM winners WHERE id = ?').run(req.params.id);
    if (info.changes === 0) throw notFound('Achievement not found');
    res.json({ ok: true });
  }),
);
