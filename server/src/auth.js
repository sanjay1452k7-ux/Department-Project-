import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { config } from './config.js';
import { db, parseList } from './db.js';
import { forbidden, unauthorized } from './util.js';

export const hashPassword = (plain) => bcrypt.hashSync(plain, 10);
export const verifyPassword = (plain, hash) => bcrypt.compareSync(plain, hash);

export const signToken = (user) =>
  jwt.sign({ sub: user.id, role: user.role }, config.jwtSecret, {
    expiresIn: config.jwtExpiresIn,
  });

/** Strip the password hash and expand JSON columns before sending a user out. */
export function publicUser(row) {
  if (!row) return null;
  const { passwordHash, notifyNew, notifyDeadline, ...rest } = row;
  return {
    ...rest,
    interests: parseList(row.interests),
    notifyThemes: parseList(row.notifyThemes),
    notifyNew: !!notifyNew,
    notifyDeadline: !!notifyDeadline,
  };
}

const findUser = db.prepare('SELECT * FROM users WHERE id = ?');

/** Populates req.user when a valid bearer token is present. Never rejects. */
export function attachUser(req, _res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (token) {
    try {
      const payload = jwt.verify(token, config.jwtSecret);
      req.user = findUser.get(payload.sub) || null;
    } catch {
      req.user = null;
    }
  }
  next();
}

export function requireAuth(req, _res, next) {
  if (!req.user) return next(unauthorized());
  next();
}

export function requireRole(role) {
  return (req, _res, next) => {
    if (!req.user) return next(unauthorized());
    if (req.user.role !== role) {
      return next(forbidden(`This action is restricted to ${role} accounts`));
    }
    next();
  };
}
