import { config } from '../config.js';
import { db, nowIso } from '../db.js';
import { daysUntil } from '../util.js';
import { eligibleAudience, notifyUsers } from './notifications.js';

const alreadySent = db.prepare(
  'SELECT 1 FROM reminder_log WHERE hackathonId = ? AND offsetDays = ?',
);
const logSent = db.prepare(
  'INSERT OR IGNORE INTO reminder_log (hackathonId, offsetDays, sentAt) VALUES (?, ?, ?)',
);

const urgencyFor = (days) => (days <= 0 ? 'critical' : days <= 1 ? 'high' : days <= 3 ? 'elevated' : 'normal');

function reminderCopy(hackathon, days) {
  if (days <= 0) {
    return {
      title: `Last chance: ${hackathon.name} closes today`,
      body: `Registration for ${hackathon.name} closes today. Tap to register now.`,
    };
  }
  if (days === 1) {
    return {
      title: `Tomorrow: ${hackathon.name} registration closes`,
      body: `Only 1 day left to register for ${hackathon.name}.`,
    };
  }
  return {
    title: `${days} days left: ${hackathon.name}`,
    body: `Registration for ${hackathon.name} closes in ${days} days. ${
      hackathon.prizeAmount ? `Prize pool: ${hackathon.prizeAmount}.` : ''
    }`.trim(),
  };
}

/**
 * One sweep of deadline reminders. For each open hackathon we find the largest
 * configured offset that has been reached but not yet sent, so a server that
 * was asleep across the 3-day mark still fires it once (and only once).
 */
export async function runDeadlineSweep({ now = new Date() } = {}) {
  const hackathons = db
    .prepare("SELECT * FROM hackathons WHERE regDeadline IS NOT NULL AND status != 'closed'")
    .all();

  let sent = 0;
  for (const hackathon of hackathons) {
    const days = daysUntil(hackathon.regDeadline, now);
    if (days === null || days < 0) continue;

    const due = config.reminderOffsets
      .filter((offset) => days <= offset)
      .filter((offset) => !alreadySent.get(hackathon.id, offset));
    if (due.length === 0) continue;

    // Only the nearest milestone is worth a notification; mark the rest as
    // handled so a hackathon posted 2 days before its deadline does not blast
    // the 7-day and 3-day reminders at the same time.
    const offset = Math.min(...due);
    const copy = reminderCopy(hackathon, days);
    const audience = eligibleAudience(hackathon, { kind: 'deadline' });
    if (audience.length > 0) {
      await notifyUsers(audience, {
        type: 'deadline-reminder',
        hackathonId: hackathon.id,
        urgency: urgencyFor(days),
        ...copy,
      });
      sent += audience.length;
    }
    const at = nowIso();
    for (const o of due) logSent.run(hackathon.id, o, at);
  }
  return sent;
}

/** Move hackathons through upcoming -> ongoing -> closed as dates pass. */
export function refreshStatuses({ now = new Date() } = {}) {
  const rows = db.prepare("SELECT * FROM hackathons WHERE status != 'closed'").all();
  const update = db.prepare('UPDATE hackathons SET status = ?, updatedAt = ? WHERE id = ?');
  let changed = 0;
  for (const h of rows) {
    const lastDate = h.round2Date || h.round1Date || h.regDeadline;
    let next = h.status;
    if (lastDate && new Date(lastDate) < now) next = 'closed';
    else if (h.regDeadline && new Date(h.regDeadline) < now) next = 'ongoing';
    if (next !== h.status) {
      update.run(next, nowIso(), h.id);
      changed += 1;
    }
  }
  return changed;
}

let timer = null;

export function startScheduler() {
  const tick = async () => {
    try {
      refreshStatuses();
      const sent = await runDeadlineSweep();
      if (sent > 0) console.log(`[scheduler] sent ${sent} deadline reminder(s)`);
    } catch (err) {
      console.error('[scheduler] sweep failed:', err);
    }
  };
  tick();
  timer = setInterval(tick, config.reminderIntervalMs);
  timer.unref?.();
  return () => clearInterval(timer);
}

export const stopScheduler = () => timer && clearInterval(timer);
