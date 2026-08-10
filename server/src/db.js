import fs from 'node:fs';
import path from 'node:path';
import Database from 'better-sqlite3';
import { config } from './config.js';

fs.mkdirSync(path.dirname(config.dbFile), { recursive: true });

export const db = new Database(config.dbFile);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
CREATE TABLE IF NOT EXISTS users (
  id            TEXT PRIMARY KEY,
  name          TEXT NOT NULL,
  email         TEXT NOT NULL UNIQUE,
  collegeId     TEXT UNIQUE,
  passwordHash  TEXT NOT NULL,
  role          TEXT NOT NULL CHECK (role IN ('staff','student')),
  year          TEXT,
  department    TEXT,
  interests     TEXT NOT NULL DEFAULT '[]',
  fcmToken      TEXT,
  notifyNew     INTEGER NOT NULL DEFAULT 1,
  notifyDeadline INTEGER NOT NULL DEFAULT 1,
  notifyThemes  TEXT NOT NULL DEFAULT '[]',
  createdAt     TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS hackathons (
  id            TEXT PRIMARY KEY,
  name          TEXT NOT NULL,
  description   TEXT NOT NULL DEFAULT '',
  organizer     TEXT NOT NULL DEFAULT '',
  themes        TEXT NOT NULL DEFAULT '[]',
  eligibility   TEXT NOT NULL DEFAULT '[]',
  teamSizeMin   INTEGER,
  teamSizeMax   INTEGER,
  prizeAmount   TEXT NOT NULL DEFAULT '',
  regDeadline   TEXT,
  round1Date    TEXT,
  round2Date    TEXT,
  eventMode     TEXT NOT NULL DEFAULT 'online' CHECK (eventMode IN ('online','offline','hybrid')),
  venue         TEXT NOT NULL DEFAULT '',
  status        TEXT NOT NULL DEFAULT 'upcoming' CHECK (status IN ('upcoming','ongoing','closed')),
  registrationLink TEXT NOT NULL DEFAULT '',
  tags          TEXT NOT NULL DEFAULT '[]',
  postedBy      TEXT REFERENCES users(id) ON DELETE SET NULL,
  updatedBy     TEXT REFERENCES users(id) ON DELETE SET NULL,
  createdAt     TEXT NOT NULL,
  updatedAt     TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_hackathons_deadline ON hackathons(regDeadline);
CREATE INDEX IF NOT EXISTS idx_hackathons_status ON hackathons(status);

CREATE TABLE IF NOT EXISTS winners (
  id            TEXT PRIMARY KEY,
  hackathonId   TEXT NOT NULL REFERENCES hackathons(id) ON DELETE CASCADE,
  teamName      TEXT NOT NULL,
  members       TEXT NOT NULL DEFAULT '[]',
  placement     TEXT NOT NULL DEFAULT '',
  prizeWon      TEXT NOT NULL DEFAULT '',
  problemStatementChosen TEXT NOT NULL DEFAULT '',
  postedBy      TEXT REFERENCES users(id) ON DELETE SET NULL,
  createdAt     TEXT NOT NULL,
  updatedAt     TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_winners_hackathon ON winners(hackathonId);

CREATE TABLE IF NOT EXISTS feedback (
  id            TEXT PRIMARY KEY,
  studentId     TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  category      TEXT NOT NULL CHECK (category IN ('bug','suggestion','hackathon-info','other')),
  message       TEXT NOT NULL,
  relatedHackathonId TEXT REFERENCES hackathons(id) ON DELETE SET NULL,
  status        TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open','reviewed','resolved')),
  createdAt     TEXT NOT NULL,
  updatedAt     TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_feedback_student ON feedback(studentId);

CREATE TABLE IF NOT EXISTS notifications (
  id            TEXT PRIMARY KEY,
  userId        TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type          TEXT NOT NULL,
  title         TEXT NOT NULL,
  body          TEXT NOT NULL DEFAULT '',
  hackathonId   TEXT REFERENCES hackathons(id) ON DELETE CASCADE,
  urgency       TEXT NOT NULL DEFAULT 'normal',
  readAt        TEXT,
  createdAt     TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(userId, createdAt);

CREATE TABLE IF NOT EXISTS push_subscriptions (
  id            TEXT PRIMARY KEY,
  userId        TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  endpoint      TEXT NOT NULL UNIQUE,
  p256dh        TEXT NOT NULL,
  auth          TEXT NOT NULL,
  createdAt     TEXT NOT NULL
);

-- One row per (hackathon, reminder offset) actually dispatched, so a restart or
-- an overlapping sweep never double-notifies students.
CREATE TABLE IF NOT EXISTS reminder_log (
  hackathonId   TEXT NOT NULL REFERENCES hackathons(id) ON DELETE CASCADE,
  offsetDays    INTEGER NOT NULL,
  sentAt        TEXT NOT NULL,
  PRIMARY KEY (hackathonId, offsetDays)
);
`);

/** Parse a JSON array column, tolerating legacy/blank values. */
export function parseList(value) {
  if (Array.isArray(value)) return value;
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return String(value)
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
  }
}

export const nowIso = () => new Date().toISOString();
