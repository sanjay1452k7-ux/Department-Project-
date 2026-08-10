import express from 'express';
import { config } from '../config.js';
import { db, nowIso, parseList } from '../db.js';
import { hashPassword, publicUser, requireAuth, signToken, verifyPassword } from '../auth.js';
import { badRequest, forbidden, newId, normaliseYear, wrap } from '../util.js';

export const authRouter = express.Router();

const byEmail = db.prepare('SELECT * FROM users WHERE lower(email) = lower(?)');
const byCollegeId = db.prepare('SELECT * FROM users WHERE lower(collegeId) = lower(?)');

/** Accept either a college ID or an email address in the login identifier. */
const lookup = (identifier) => {
  const id = String(identifier || '').trim();
  if (!id) return null;
  return byEmail.get(id) || byCollegeId.get(id) || null;
};

authRouter.post(
  '/register',
  wrap((req, res) => {
    const { name, email, collegeId, password, role = 'student', year, department, interests } = req.body || {};

    if (!String(name || '').trim()) throw badRequest('Name is required');
    if (!/^\S+@\S+\.\S+$/.test(String(email || ''))) throw badRequest('A valid email is required');
    if (String(password || '').length < 8) throw badRequest('Password must be at least 8 characters');
    if (!['staff', 'student'].includes(role)) throw badRequest('role must be "staff" or "student"');

    if (role === 'staff' && config.staffEmailDomains.length > 0) {
      const domain = String(email).split('@')[1]?.toLowerCase();
      if (!config.staffEmailDomains.includes(domain)) {
        throw forbidden('Staff accounts are restricted to approved college email domains');
      }
    }
    if (byEmail.get(email)) throw badRequest('An account already exists for that email');
    if (collegeId && byCollegeId.get(collegeId)) throw badRequest('That college ID is already registered');

    const user = {
      id: newId('usr'),
      name: String(name).trim(),
      email: String(email).trim(),
      collegeId: String(collegeId || '').trim() || null,
      passwordHash: hashPassword(password),
      role,
      year: role === 'student' ? normaliseYear(year) : null,
      department: String(department || '').trim() || null,
      interests: JSON.stringify(
        Array.isArray(interests)
          ? interests
          : String(interests || '')
              .split(',')
              .map((s) => s.trim())
              .filter(Boolean),
      ),
      createdAt: nowIso(),
    };
    db.prepare(
      `INSERT INTO users (id, name, email, collegeId, passwordHash, role, year, department, interests, createdAt)
       VALUES (@id, @name, @email, @collegeId, @passwordHash, @role, @year, @department, @interests, @createdAt)`,
    ).run(user);

    res.status(201).json({ token: signToken(user), user: publicUser(db.prepare('SELECT * FROM users WHERE id = ?').get(user.id)) });
  }),
);

authRouter.post(
  '/login',
  wrap((req, res) => {
    const { identifier, email, password } = req.body || {};
    const user = lookup(identifier || email);
    if (!user || !verifyPassword(String(password || ''), user.passwordHash)) {
      throw badRequest('Incorrect email/college ID or password');
    }
    res.json({ token: signToken(user), user: publicUser(user) });
  }),
);

authRouter.get('/me', requireAuth, (req, res) => res.json({ user: publicUser(req.user) }));

authRouter.patch(
  '/me',
  requireAuth,
  wrap((req, res) => {
    const { name, year, department, interests, notifyNew, notifyDeadline, notifyThemes, fcmToken } =
      req.body || {};
    const current = req.user;
    const next = {
      name: name === undefined ? current.name : String(name).trim() || current.name,
      year: year === undefined ? current.year : normaliseYear(year),
      department: department === undefined ? current.department : String(department).trim(),
      interests:
        interests === undefined
          ? current.interests
          : JSON.stringify(Array.isArray(interests) ? interests : parseList(interests)),
      notifyNew: notifyNew === undefined ? current.notifyNew : notifyNew ? 1 : 0,
      notifyDeadline: notifyDeadline === undefined ? current.notifyDeadline : notifyDeadline ? 1 : 0,
      notifyThemes:
        notifyThemes === undefined
          ? current.notifyThemes
          : JSON.stringify(Array.isArray(notifyThemes) ? notifyThemes : parseList(notifyThemes)),
      fcmToken: fcmToken === undefined ? current.fcmToken : String(fcmToken || '') || null,
      id: current.id,
    };
    db.prepare(
      `UPDATE users SET name=@name, year=@year, department=@department, interests=@interests,
       notifyNew=@notifyNew, notifyDeadline=@notifyDeadline, notifyThemes=@notifyThemes, fcmToken=@fcmToken
       WHERE id=@id`,
    ).run(next);
    res.json({ user: publicUser(db.prepare('SELECT * FROM users WHERE id = ?').get(current.id)) });
  }),
);

authRouter.post(
  '/change-password',
  requireAuth,
  wrap((req, res) => {
    const { currentPassword, newPassword } = req.body || {};
    if (!verifyPassword(String(currentPassword || ''), req.user.passwordHash)) {
      throw badRequest('Current password is incorrect');
    }
    if (String(newPassword || '').length < 8) throw badRequest('New password must be at least 8 characters');
    db.prepare('UPDATE users SET passwordHash = ? WHERE id = ?').run(hashPassword(newPassword), req.user.id);
    res.json({ ok: true });
  }),
);
