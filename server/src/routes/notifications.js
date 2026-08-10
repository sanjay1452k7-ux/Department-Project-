import express from 'express';
import { config } from '../config.js';
import { db, nowIso } from '../db.js';
import { requireAuth } from '../auth.js';
import { badRequest, newId, wrap } from '../util.js';
import {
  listNotifications,
  markAllRead,
  markRead,
  pushEnabled,
  unreadCount,
} from '../services/notifications.js';

export const notificationsRouter = express.Router();

notificationsRouter.get('/vapid-public-key', (_req, res) =>
  res.json({ key: config.vapidPublicKey || null, enabled: pushEnabled() }),
);

notificationsRouter.get(
  '/',
  requireAuth,
  wrap((req, res) => {
    res.json({
      notifications: listNotifications(req.user.id, {
        unreadOnly: req.query.unread === 'true',
        limit: Math.min(Number(req.query.limit) || 50, 200),
      }),
      unread: unreadCount(req.user.id),
    });
  }),
);

notificationsRouter.post(
  '/read',
  requireAuth,
  wrap((req, res) => {
    const { ids, all } = req.body || {};
    if (all) markAllRead(req.user.id);
    else if (Array.isArray(ids) && ids.length) markRead(req.user.id, ids);
    else throw badRequest('Pass ids: [...] or all: true');
    res.json({ unread: unreadCount(req.user.id) });
  }),
);

/** Store a browser Push API subscription for this user. */
notificationsRouter.post(
  '/subscribe',
  requireAuth,
  wrap((req, res) => {
    const { endpoint, keys } = req.body || {};
    if (!endpoint || !keys?.p256dh || !keys?.auth) throw badRequest('Invalid push subscription');
    db.prepare(
      `INSERT INTO push_subscriptions (id, userId, endpoint, p256dh, auth, createdAt)
       VALUES (@id, @userId, @endpoint, @p256dh, @auth, @createdAt)
       ON CONFLICT(endpoint) DO UPDATE SET userId = @userId, p256dh = @p256dh, auth = @auth`,
    ).run({
      id: newId('sub'),
      userId: req.user.id,
      endpoint,
      p256dh: keys.p256dh,
      auth: keys.auth,
      createdAt: nowIso(),
    });
    res.status(201).json({ ok: true });
  }),
);

notificationsRouter.post(
  '/unsubscribe',
  requireAuth,
  wrap((req, res) => {
    const { endpoint } = req.body || {};
    if (!endpoint) throw badRequest('endpoint is required');
    db.prepare('DELETE FROM push_subscriptions WHERE userId = ? AND endpoint = ?').run(
      req.user.id,
      endpoint,
    );
    res.json({ ok: true });
  }),
);
