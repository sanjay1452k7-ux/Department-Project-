import webpush from 'web-push';
import { config } from '../config.js';
import { db, nowIso, parseList } from '../db.js';
import { isEligible, newId } from '../util.js';

let pushReady = false;
if (config.vapidPublicKey && config.vapidPrivateKey) {
  webpush.setVapidDetails(config.vapidSubject, config.vapidPublicKey, config.vapidPrivateKey);
  pushReady = true;
}

export const pushEnabled = () => pushReady;

const insertNotification = db.prepare(`
  INSERT INTO notifications (id, userId, type, title, body, hackathonId, urgency, createdAt)
  VALUES (@id, @userId, @type, @title, @body, @hackathonId, @urgency, @createdAt)
`);
const subsForUser = db.prepare('SELECT * FROM push_subscriptions WHERE userId = ?');
const deleteSub = db.prepare('DELETE FROM push_subscriptions WHERE id = ?');

async function sendPush(userId, payload) {
  if (!pushReady) return;
  for (const sub of subsForUser.all(userId)) {
    try {
      await webpush.sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
        JSON.stringify(payload),
      );
    } catch (err) {
      // 404/410 mean the browser dropped the subscription — clean it up.
      if (err?.statusCode === 404 || err?.statusCode === 410) deleteSub.run(sub.id);
      else console.warn('[push] delivery failed:', err?.message || err);
    }
  }
}

/**
 * Record an in-app notification for every recipient and fire a web push for
 * each. In-app records are the source of truth: push is best-effort on top.
 */
export async function notifyUsers(users, { type, title, body, hackathonId = null, urgency = 'normal' }) {
  const createdAt = nowIso();
  const rows = users.map((u) => ({
    id: newId('ntf'),
    userId: u.id,
    type,
    title,
    body,
    hackathonId,
    urgency,
    createdAt,
  }));
  const insertMany = db.transaction((items) => items.forEach((i) => insertNotification.run(i)));
  insertMany(rows);

  await Promise.all(
    users.map((u) =>
      sendPush(u.id, { title, body, urgency, hackathonId, url: hackathonId ? `/hackathons/${hackathonId}` : '/notifications' }),
    ),
  );
  return rows.length;
}

/**
 * Students who should hear about this hackathon: role=student, the "new
 * hackathon" (or deadline) toggle on, eligible by year, and — if they narrowed
 * their themes in settings — at least one theme/tag overlap.
 */
export function eligibleAudience(hackathon, { kind = 'new' } = {}) {
  const students = db.prepare("SELECT * FROM users WHERE role = 'student'").all();
  const topics = [...parseList(hackathon.themes), ...parseList(hackathon.tags)].map((t) =>
    String(t).toLowerCase(),
  );
  return students.filter((student) => {
    const toggle = kind === 'new' ? student.notifyNew : student.notifyDeadline;
    if (!toggle) return false;
    if (!isEligible(parseList(hackathon.eligibility), student.year)) return false;
    const chosen = parseList(student.notifyThemes).map((t) => String(t).toLowerCase());
    if (chosen.length === 0) return true;
    return chosen.some((theme) => topics.some((t) => t.includes(theme) || theme.includes(t)));
  });
}

export async function announceNewHackathon(hackathon) {
  const audience = eligibleAudience(hackathon, { kind: 'new' });
  if (audience.length === 0) return 0;
  const deadline = hackathon.regDeadline
    ? ` Register by ${new Date(hackathon.regDeadline).toDateString()}.`
    : '';
  return notifyUsers(audience, {
    type: 'new-hackathon',
    title: `New hackathon: ${hackathon.name}`,
    body: `${hackathon.organizer || 'Your department'} just posted ${hackathon.name}.${deadline}`,
    hackathonId: hackathon.id,
    urgency: 'normal',
  });
}

export function listNotifications(userId, { unreadOnly = false, limit = 50 } = {}) {
  const sql = `SELECT n.*, h.name AS hackathonName FROM notifications n
               LEFT JOIN hackathons h ON h.id = n.hackathonId
               WHERE n.userId = ? ${unreadOnly ? 'AND n.readAt IS NULL' : ''}
               ORDER BY n.createdAt DESC LIMIT ?`;
  return db.prepare(sql).all(userId, limit);
}

export const unreadCount = (userId) =>
  db.prepare('SELECT COUNT(*) AS c FROM notifications WHERE userId = ? AND readAt IS NULL').get(userId).c;

export function markRead(userId, ids) {
  const stmt = db.prepare('UPDATE notifications SET readAt = ? WHERE userId = ? AND id = ?');
  const at = nowIso();
  const run = db.transaction((list) => list.forEach((id) => stmt.run(at, userId, id)));
  run(ids);
}

export function markAllRead(userId) {
  db.prepare('UPDATE notifications SET readAt = ? WHERE userId = ? AND readAt IS NULL').run(
    nowIso(),
    userId,
  );
}
