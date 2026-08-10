import 'dotenv/config';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const serverRoot = path.resolve(here, '..');

export const config = {
  port: Number(process.env.PORT || 4000),
  nodeEnv: process.env.NODE_ENV || 'development',

  // Auth
  jwtSecret: process.env.JWT_SECRET || 'hacktrack-dev-secret-change-me',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '30d',

  // Only these email domains may self-register as staff. Empty = any email may
  // register as staff (fine for local dev, tighten in production).
  staffEmailDomains: (process.env.STAFF_EMAIL_DOMAINS || '')
    .split(',')
    .map((d) => d.trim().toLowerCase())
    .filter(Boolean),

  // Database
  dbFile: process.env.DB_FILE || path.join(serverRoot, 'data', 'hacktrack.db'),

  // Static hosting of the built PWA (web/dist) when present
  webDist: process.env.WEB_DIST || path.resolve(serverRoot, '..', 'web', 'dist'),

  // Anthropic API (AI assistant). Without a key the assistant falls back to a
  // local rule-based answerer so the feature still works in demos/offline.
  anthropicApiKey: process.env.ANTHROPIC_API_KEY || '',
  anthropicModel: process.env.ANTHROPIC_MODEL || 'claude-sonnet-5',
  anthropicBaseUrl: process.env.ANTHROPIC_BASE_URL || 'https://api.anthropic.com',

  // Web Push (PWA push notifications). Generate with:
  //   npx web-push generate-vapid-keys
  vapidPublicKey: process.env.VAPID_PUBLIC_KEY || '',
  vapidPrivateKey: process.env.VAPID_PRIVATE_KEY || '',
  vapidSubject: process.env.VAPID_SUBJECT || 'mailto:hacktrack@example.edu',

  // How often the deadline-reminder sweep runs (ms). Default 15 minutes.
  reminderIntervalMs: Number(process.env.REMINDER_INTERVAL_MS || 15 * 60 * 1000),
  // Days before regDeadline at which reminders fire.
  reminderOffsets: (process.env.REMINDER_OFFSETS || '7,3,1,0')
    .split(',')
    .map((n) => Number(n.trim()))
    .filter((n) => Number.isFinite(n))
    .sort((a, b) => b - a),
};
