import express from 'express';
import { db, nowIso } from '../db.js';
import { requireAuth, requireRole } from '../auth.js';
import { FEEDBACK_CATEGORIES, FEEDBACK_STATUSES } from '../models.js';
import { badRequest, forbidden, newId, notFound, toCsv, wrap } from '../util.js';

export const feedbackRouter = express.Router();

const JOINED = `SELECT f.*, u.name AS studentName, u.year AS studentYear, u.department AS studentDepartment,
                       h.name AS relatedHackathonName
                FROM feedback f
                LEFT JOIN users u ON u.id = f.studentId
                LEFT JOIN hackathons h ON h.id = f.relatedHackathonId`;
const getById = db.prepare(`${JOINED} WHERE f.id = ?`);

feedbackRouter.post(
  '/',
  requireAuth,
  wrap((req, res) => {
    if (req.user.role !== 'student') throw forbidden('Only students submit feedback');
    const { category, message, relatedHackathonId } = req.body || {};
    if (!FEEDBACK_CATEGORIES.includes(category)) {
      throw badRequest(`category must be one of ${FEEDBACK_CATEGORIES.join(', ')}`);
    }
    const text = String(message || '').trim();
    if (text.length < 5) throw badRequest('Please write a little more detail');
    if (relatedHackathonId && !db.prepare('SELECT 1 FROM hackathons WHERE id = ?').get(relatedHackathonId)) {
      throw badRequest('That hackathon does not exist');
    }
    const at = nowIso();
    const row = {
      id: newId('fbk'),
      studentId: req.user.id,
      category,
      message: text,
      relatedHackathonId: relatedHackathonId || null,
      status: 'open',
      createdAt: at,
      updatedAt: at,
    };
    db.prepare(
      `INSERT INTO feedback (id, studentId, category, message, relatedHackathonId, status, createdAt, updatedAt)
       VALUES (@id, @studentId, @category, @message, @relatedHackathonId, @status, @createdAt, @updatedAt)`,
    ).run(row);
    res.status(201).json({ feedback: getById.get(row.id) });
  }),
);

/** A student's own submissions, with the status admins have set. */
feedbackRouter.get(
  '/mine',
  requireAuth,
  wrap((req, res) => {
    const rows = db.prepare(`${JOINED} WHERE f.studentId = ? ORDER BY f.createdAt DESC`).all(req.user.id);
    res.json({ feedback: rows });
  }),
);

function queryFeedback({ category, status, hackathonId } = {}) {
  let rows = db.prepare(`${JOINED} ORDER BY f.createdAt DESC`).all();
  if (category) rows = rows.filter((f) => f.category === category);
  if (status) rows = rows.filter((f) => f.status === status);
  if (hackathonId) rows = rows.filter((f) => f.relatedHackathonId === hackathonId);
  return rows;
}

// Admin inbox.
feedbackRouter.get(
  '/',
  requireAuth,
  requireRole('staff'),
  wrap((req, res) => {
    const rows = queryFeedback(req.query);
    const counts = { open: 0, reviewed: 0, resolved: 0 };
    for (const r of db.prepare('SELECT status FROM feedback').all()) counts[r.status] += 1;
    res.json({ feedback: rows, counts });
  }),
);

feedbackRouter.get(
  '/export.csv',
  requireAuth,
  requireRole('staff'),
  wrap((req, res) => {
    const csv = toCsv(queryFeedback(req.query), [
      { key: 'createdAt', label: 'Submitted at' },
      { key: 'studentName', label: 'Student' },
      { key: 'studentYear', label: 'Year' },
      { key: 'studentDepartment', label: 'Department' },
      { key: 'category', label: 'Category' },
      { key: 'message', label: 'Message' },
      { key: 'relatedHackathonName', label: 'Related hackathon' },
      { key: 'status', label: 'Status' },
    ]);
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="feedback.csv"');
    res.send(csv);
  }),
);

feedbackRouter.patch(
  '/:id',
  requireAuth,
  requireRole('staff'),
  wrap((req, res) => {
    const { status } = req.body || {};
    if (!FEEDBACK_STATUSES.includes(status)) {
      throw badRequest(`status must be one of ${FEEDBACK_STATUSES.join(', ')}`);
    }
    const info = db
      .prepare('UPDATE feedback SET status = ?, updatedAt = ? WHERE id = ?')
      .run(status, nowIso(), req.params.id);
    if (info.changes === 0) throw notFound('Feedback not found');
    res.json({ feedback: getById.get(req.params.id) });
  }),
);
