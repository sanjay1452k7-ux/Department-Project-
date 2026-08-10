import express from 'express';
import { db } from '../db.js';
import { requireAuth, requireRole } from '../auth.js';
import { search } from '../services/search.js';
import { ask } from '../services/ai.js';
import { config } from '../config.js';
import { wrap } from '../util.js';

export const searchRouter = express.Router();

searchRouter.get(
  '/',
  wrap((req, res) => {
    res.json(
      search(req.query.q, {
        limit: Math.min(Number(req.query.limit) || 25, 100),
        includeClosed: req.query.includeClosed !== 'false',
      }),
    );
  }),
);

export const chatRouter = express.Router();

chatRouter.get('/status', (_req, res) =>
  res.json({ provider: config.anthropicApiKey ? 'anthropic' : 'local', model: config.anthropicModel }),
);

chatRouter.post(
  '/',
  requireAuth,
  wrap(async (req, res) => {
    const { question, message, history } = req.body || {};
    const result = await ask({
      question: question ?? message,
      history: Array.isArray(history) ? history : [],
      user: req.user,
    });
    res.json(result);
  }),
);

export const statsRouter = express.Router();

/** Small dashboard summary for the admin home screen. */
statsRouter.get(
  '/',
  requireAuth,
  requireRole('staff'),
  wrap((_req, res) => {
    const one = (sql, ...args) => db.prepare(sql).get(...args).c;
    res.json({
      hackathons: {
        total: one('SELECT COUNT(*) AS c FROM hackathons'),
        upcoming: one("SELECT COUNT(*) AS c FROM hackathons WHERE status = 'upcoming'"),
        ongoing: one("SELECT COUNT(*) AS c FROM hackathons WHERE status = 'ongoing'"),
        closed: one("SELECT COUNT(*) AS c FROM hackathons WHERE status = 'closed'"),
      },
      achievements: one('SELECT COUNT(*) AS c FROM winners'),
      feedback: {
        open: one("SELECT COUNT(*) AS c FROM feedback WHERE status = 'open'"),
        total: one('SELECT COUNT(*) AS c FROM feedback'),
      },
      students: one("SELECT COUNT(*) AS c FROM users WHERE role = 'student'"),
    });
  }),
);
