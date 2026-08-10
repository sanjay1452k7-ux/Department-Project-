import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test, { after, before, describe } from 'node:test';

// Each run gets a throwaway database. Set before any src/ module is imported.
const tmpDb = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'hacktrack-')), 'test.db');
process.env.DB_FILE = tmpDb;
process.env.JWT_SECRET = 'test-secret';
process.env.ANTHROPIC_API_KEY = '';

const { createApp } = await import('../src/app.js');
const { runDeadlineSweep, refreshStatuses } = await import('../src/services/scheduler.js');
const { db } = await import('../src/db.js');

let server;
let base;

before(async () => {
  server = createApp().listen(0);
  await new Promise((resolve) => server.once('listening', resolve));
  base = `http://127.0.0.1:${server.address().port}`;
});

after(() => {
  server?.close();
  db.close();
  fs.rmSync(path.dirname(tmpDb), { recursive: true, force: true });
});

async function call(method, url, { token, body } = {}) {
  const res = await fetch(`${base}${url}`, {
    method,
    headers: {
      'content-type': 'application/json',
      ...(token ? { authorization: `Bearer ${token}` } : {}),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await res.text();
  let json;
  try {
    json = JSON.parse(text);
  } catch {
    json = text;
  }
  return { status: res.status, body: json };
}

const daysFromNow = (n) => {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d.toISOString();
};

const state = {};

describe('auth and roles', () => {
  test('staff and students can register and log in', async () => {
    const staff = await call('POST', '/api/auth/register', {
      body: {
        name: 'Dr. Test Staff',
        email: 'staff@college.edu',
        collegeId: 'STF900',
        password: 'password123',
        role: 'staff',
        department: 'CSE',
      },
    });
    assert.equal(staff.status, 201);
    assert.equal(staff.body.user.role, 'staff');
    assert.ok(!('passwordHash' in staff.body.user), 'password hash must never be returned');
    state.staffToken = staff.body.token;

    const student = await call('POST', '/api/auth/register', {
      body: {
        name: 'Test Student',
        email: 'student@college.edu',
        collegeId: '22CS900',
        password: 'password123',
        role: 'student',
        year: '2nd year',
        department: 'CSE',
      },
    });
    assert.equal(student.status, 201);
    assert.equal(student.body.user.year, 'II', 'year should be normalised to roman numerals');
    state.studentToken = student.body.token;
    state.studentId = student.body.user.id;

    const login = await call('POST', '/api/auth/login', {
      body: { identifier: '22CS900', password: 'password123' },
    });
    assert.equal(login.status, 200, 'login by college ID should work');
  });

  test('duplicate email is rejected', async () => {
    const res = await call('POST', '/api/auth/register', {
      body: { name: 'Copy', email: 'staff@college.edu', password: 'password123', role: 'staff' },
    });
    assert.equal(res.status, 400);
  });

  test('wrong password is rejected', async () => {
    const res = await call('POST', '/api/auth/login', {
      body: { identifier: 'staff@college.edu', password: 'nope' },
    });
    assert.equal(res.status, 400);
  });

  test('students cannot reach staff-only endpoints', async () => {
    const res = await call('POST', '/api/hackathons', {
      token: state.studentToken,
      body: { name: 'Sneaky', organizer: 'Nobody' },
    });
    assert.equal(res.status, 403);

    const anon = await call('POST', '/api/hackathons', { body: { name: 'Sneaky' } });
    assert.equal(anon.status, 401);

    const inbox = await call('GET', '/api/feedback', { token: state.studentToken });
    assert.equal(inbox.status, 403);
  });
});

describe('hackathon CRUD', () => {
  test('staff can create a hackathon with every field', async () => {
    const res = await call('POST', '/api/hackathons', {
      token: state.staffToken,
      body: {
        name: 'Bhasha Setu Challenge',
        description: 'Multilingual translation tooling for Indian languages.',
        organizer: 'Bhashini',
        themes: ['language model', 'speech tech'],
        eligibility: ['II', 'III', 'IV'],
        teamSizeMin: 2,
        teamSizeMax: 4,
        prizeAmount: '₹3,00,000',
        regDeadline: daysFromNow(10),
        round1Date: daysFromNow(20),
        round2Date: daysFromNow(30),
        eventMode: 'hybrid',
        venue: 'Research Park',
        status: 'upcoming',
        registrationLink: 'https://bhashini.gov.in/hackathon',
        tags: ['agentic ai', 'language model', 'nlp'],
      },
    });
    assert.equal(res.status, 201);
    const h = res.body.hackathon;
    state.hackathonId = h.id;
    assert.deepEqual(h.tags, ['agentic ai', 'language model', 'nlp']);
    assert.ok(h.postedBy, 'must be attributed to the posting admin');
    assert.ok(h.createdAt && h.updatedAt, 'must be timestamped');
    assert.equal(typeof h.daysToDeadline, 'number');
    assert.equal(res.body.notified, 1, 'the eligible II-year student should be notified');
  });

  test('invalid payloads are rejected', async () => {
    const noName = await call('POST', '/api/hackathons', {
      token: state.staffToken,
      body: { organizer: 'X' },
    });
    assert.equal(noName.status, 400);

    const badLink = await call('POST', '/api/hackathons', {
      token: state.staffToken,
      body: { name: 'X', organizer: 'Y', registrationLink: 'javascript:alert(1)' },
    });
    assert.equal(badLink.status, 400);

    const badTeam = await call('POST', '/api/hackathons', {
      token: state.staffToken,
      body: { name: 'X', organizer: 'Y', teamSizeMin: 5, teamSizeMax: 2 },
    });
    assert.equal(badTeam.status, 400);

    const badMode = await call('POST', '/api/hackathons', {
      token: state.staffToken,
      body: { name: 'X', organizer: 'Y', eventMode: 'telepathy' },
    });
    assert.equal(badMode.status, 400);
  });

  test('students see the list and detail, with eligibility resolved', async () => {
    const list = await call('GET', '/api/hackathons', { token: state.studentToken });
    assert.equal(list.status, 200);
    assert.equal(list.body.hackathons.length, 1);
    assert.equal(list.body.hackathons[0].eligibleForViewer, true);

    const detail = await call('GET', `/api/hackathons/${state.hackathonId}`, {
      token: state.studentToken,
    });
    assert.equal(detail.status, 200);
    assert.equal(detail.body.hackathon.registrationLink, 'https://bhashini.gov.in/hackathon');
    assert.deepEqual(detail.body.hackathon.winners, []);
  });

  test('edit updates fields and re-attributes the change', async () => {
    const res = await call('PATCH', `/api/hackathons/${state.hackathonId}`, {
      token: state.staffToken,
      body: { status: 'ongoing', prizeAmount: '₹3,50,000' },
    });
    assert.equal(res.status, 200);
    assert.equal(res.body.hackathon.status, 'ongoing');
    assert.equal(res.body.hackathon.prizeAmount, '₹3,50,000');
    assert.ok(res.body.hackathon.updatedBy);
  });

  test('duplicate-as-template copies details but clears dates', async () => {
    const res = await call('POST', `/api/hackathons/${state.hackathonId}/duplicate`, {
      token: state.staffToken,
      body: { name: 'Bhasha Setu Challenge 2027' },
    });
    assert.equal(res.status, 201);
    const copy = res.body.hackathon;
    assert.equal(copy.name, 'Bhasha Setu Challenge 2027');
    assert.equal(copy.regDeadline, null);
    assert.equal(copy.status, 'upcoming');
    assert.deepEqual(copy.themes, ['language model', 'speech tech']);
    state.duplicateId = copy.id;
  });

  test('CSV export is staff-only and includes the data', async () => {
    const denied = await fetch(`${base}/api/hackathons/export.csv`, {
      headers: { authorization: `Bearer ${state.studentToken}` },
    });
    assert.equal(denied.status, 403);

    const res = await fetch(`${base}/api/hackathons/export.csv`, {
      headers: { authorization: `Bearer ${state.staffToken}` },
    });
    assert.equal(res.status, 200);
    const csv = await res.text();
    assert.match(csv, /Name,Organizer,Status/);
    assert.match(csv, /Bhasha Setu Challenge/);
  });

  test('delete removes the duplicate', async () => {
    const res = await call('DELETE', `/api/hackathons/${state.duplicateId}`, {
      token: state.staffToken,
    });
    assert.equal(res.status, 200);
    const gone = await call('GET', `/api/hackathons/${state.duplicateId}`);
    assert.equal(gone.status, 404);
  });
});

describe('eligibility filtering', () => {
  test('a first-year student is excluded from a II-IV hackathon', async () => {
    const fresher = await call('POST', '/api/auth/register', {
      body: {
        name: 'Fresher',
        email: 'fresher@college.edu',
        password: 'password123',
        role: 'student',
        year: 1,
        department: 'CSE',
      },
    });
    state.fresherToken = fresher.body.token;

    const res = await call('GET', '/api/hackathons?eligibleOnly=true', {
      token: state.fresherToken,
    });
    assert.equal(res.body.hackathons.length, 0);

    const all = await call('GET', '/api/hackathons', { token: state.fresherToken });
    assert.equal(all.body.hackathons[0].eligibleForViewer, false);
  });
});

describe('search', () => {
  test('vague partial input finds a differently-named hackathon by tag', async () => {
    const res = await call('GET', '/api/search?q=language%20ai');
    assert.equal(res.status, 200);
    assert.ok(res.body.hackathons.length > 0, 'should surface the tagged hackathon');
    assert.equal(res.body.hackathons[0].name, 'Bhasha Setu Challenge');
  });

  test('unrelated queries return nothing', async () => {
    const res = await call('GET', '/api/search?q=underwater%20basket%20weaving');
    assert.equal(res.body.hackathons.length, 0);
  });
});

describe('achievements', () => {
  test('staff can post an achievement and students can read the feed', async () => {
    const res = await call('POST', '/api/winners', {
      token: state.staffToken,
      body: {
        hackathonId: state.hackathonId,
        teamName: 'Team Vaayu',
        members: ['Test Student', 'Someone Else'],
        placement: 'Winner',
        prizeWon: '₹1,00,000',
        problemStatementChosen: 'Dialect-aware speech to text',
      },
    });
    assert.equal(res.status, 201);
    state.winnerId = res.body.winner.id;
    assert.deepEqual(res.body.winner.members, ['Test Student', 'Someone Else']);

    const feed = await call('GET', '/api/winners', { token: state.studentToken });
    assert.equal(feed.status, 200);
    assert.equal(feed.body.winners[0].hackathonName, 'Bhasha Setu Challenge');

    const denied = await call('POST', '/api/winners', {
      token: state.studentToken,
      body: { hackathonId: state.hackathonId, teamName: 'Fake', placement: 'Winner' },
    });
    assert.equal(denied.status, 403);
  });

  test('a student sees their own achievement history', async () => {
    const res = await call('GET', '/api/winners/mine', { token: state.studentToken });
    assert.equal(res.body.winners.length, 1);
    assert.equal(res.body.winners[0].teamName, 'Team Vaayu');

    const none = await call('GET', '/api/winners/mine', { token: state.fresherToken });
    assert.equal(none.body.winners.length, 0);
  });

  test('searching a team name returns what they won and where', async () => {
    const res = await call('GET', '/api/search?q=Vaayu');
    assert.equal(res.body.achievements.length, 1);
    assert.equal(res.body.achievements[0].placement, 'Winner');
    assert.equal(res.body.achievements[0].hackathonName, 'Bhasha Setu Challenge');
  });

  test('achievements can be edited and deleted', async () => {
    const patched = await call('PATCH', `/api/winners/${state.winnerId}`, {
      token: state.staffToken,
      body: { placement: 'Runner-up' },
    });
    assert.equal(patched.body.winner.placement, 'Runner-up');

    const deleted = await call('DELETE', `/api/winners/${state.winnerId}`, {
      token: state.staffToken,
    });
    assert.equal(deleted.status, 200);
  });
});

describe('feedback', () => {
  test('a student submits feedback and can see it with its status', async () => {
    const res = await call('POST', '/api/feedback', {
      token: state.studentToken,
      body: {
        category: 'hackathon-info',
        message: 'Can a team of two enter the Bhasha Setu challenge?',
        relatedHackathonId: state.hackathonId,
      },
    });
    assert.equal(res.status, 201);
    state.feedbackId = res.body.feedback.id;
    assert.equal(res.body.feedback.status, 'open');

    const mine = await call('GET', '/api/feedback/mine', { token: state.studentToken });
    assert.equal(mine.body.feedback.length, 1);
    assert.equal(mine.body.feedback[0].relatedHackathonName, 'Bhasha Setu Challenge');
  });

  test('bad categories and empty messages are rejected', async () => {
    const badCategory = await call('POST', '/api/feedback', {
      token: state.studentToken,
      body: { category: 'rant', message: 'something long enough' },
    });
    assert.equal(badCategory.status, 400);

    const short = await call('POST', '/api/feedback', {
      token: state.studentToken,
      body: { category: 'bug', message: 'hi' },
    });
    assert.equal(short.status, 400);
  });

  test('admin reads the inbox and marks feedback resolved', async () => {
    const inbox = await call('GET', '/api/feedback', { token: state.staffToken });
    assert.equal(inbox.status, 200);
    assert.equal(inbox.body.feedback.length, 1);
    assert.equal(inbox.body.counts.open, 1);
    assert.equal(inbox.body.feedback[0].studentName, 'Test Student');

    const patched = await call('PATCH', `/api/feedback/${state.feedbackId}`, {
      token: state.staffToken,
      body: { status: 'resolved' },
    });
    assert.equal(patched.body.feedback.status, 'resolved');

    const filtered = await call('GET', '/api/feedback?status=open', { token: state.staffToken });
    assert.equal(filtered.body.feedback.length, 0);
  });

  test('a student cannot read another student feedback inbox', async () => {
    const res = await call('GET', '/api/feedback/mine', { token: state.fresherToken });
    assert.equal(res.body.feedback.length, 0);
  });
});

describe('notifications', () => {
  test('the eligible student received the new-hackathon notification', async () => {
    const res = await call('GET', '/api/notifications', { token: state.studentToken });
    assert.equal(res.status, 200);
    assert.ok(res.body.notifications.some((n) => n.type === 'new-hackathon'));
    assert.ok(res.body.unread >= 1);
  });

  test('an ineligible student did not', async () => {
    const res = await call('GET', '/api/notifications', { token: state.fresherToken });
    assert.equal(res.body.notifications.length, 0);
  });

  test('marking all read clears the unread count', async () => {
    const res = await call('POST', '/api/notifications/read', {
      token: state.studentToken,
      body: { all: true },
    });
    assert.equal(res.body.unread, 0);
  });

  test('deadline sweep fires once per milestone, escalating urgency', async () => {
    const created = await call('POST', '/api/hackathons', {
      token: state.staffToken,
      body: {
        name: 'Closing Soon Sprint',
        organizer: 'Test Org',
        eligibility: [],
        regDeadline: daysFromNow(1),
        registrationLink: 'https://example.org/soon',
      },
    });
    const id = created.body.hackathon.id;

    const first = await runDeadlineSweep();
    assert.ok(first > 0, 'first sweep should notify');
    const second = await runDeadlineSweep();
    assert.equal(second, 0, 'a repeat sweep must not re-notify');

    const res = await call('GET', '/api/notifications', { token: state.studentToken });
    const reminder = res.body.notifications.find(
      (n) => n.type === 'deadline-reminder' && n.hackathonId === id,
    );
    assert.ok(reminder, 'reminder should be stored in-app');
    assert.equal(reminder.urgency, 'high', '1 day out should be high urgency');
    assert.match(reminder.title, /Tomorrow/);
  });

  test('students can mute categories they do not care about', async () => {
    await call('PATCH', '/api/auth/me', {
      token: state.studentToken,
      body: { notifyNew: false },
    });
    const before = (await call('GET', '/api/notifications', { token: state.studentToken })).body
      .notifications.length;

    await call('POST', '/api/hackathons', {
      token: state.staffToken,
      body: { name: 'Muted Event', organizer: 'Test Org', registrationLink: 'https://example.org/m' },
    });

    const after = (await call('GET', '/api/notifications', { token: state.studentToken })).body
      .notifications.length;
    assert.equal(after, before, 'a muted student should not be notified');

    await call('PATCH', '/api/auth/me', { token: state.studentToken, body: { notifyNew: true } });
  });

  test('theme preferences narrow the audience', async () => {
    // This student now only wants robotics; the other student left the filter
    // empty, so they still hear about everything.
    await call('PATCH', '/api/auth/me', {
      token: state.studentToken,
      body: { notifyThemes: ['robotics'] },
    });
    const titlesFor = async (token) =>
      (await call('GET', '/api/notifications', { token })).body.notifications.map((n) => n.title);

    await call('POST', '/api/hackathons', {
      token: state.staffToken,
      body: {
        name: 'Fintech Only',
        organizer: 'Test Org',
        tags: ['fintech'],
        registrationLink: 'https://example.org/f',
      },
    });
    assert.ok(
      !(await titlesFor(state.studentToken)).some((t) => t.includes('Fintech Only')),
      'a robotics-only subscriber should not hear about a fintech event',
    );
    assert.ok(
      (await titlesFor(state.fresherToken)).some((t) => t.includes('Fintech Only')),
      'a student with no theme filter should still hear about it',
    );

    await call('POST', '/api/hackathons', {
      token: state.staffToken,
      body: {
        name: 'Robotics Rally',
        organizer: 'Test Org',
        tags: ['robotics'],
        registrationLink: 'https://example.org/r',
      },
    });
    assert.ok(
      (await titlesFor(state.studentToken)).some((t) => t.includes('Robotics Rally')),
      'a matching theme should reach the subscriber',
    );

    await call('PATCH', '/api/auth/me', { token: state.studentToken, body: { notifyThemes: [] } });
  });
});

describe('status lifecycle', () => {
  test('past deadlines move hackathons on automatically', async () => {
    const created = await call('POST', '/api/hackathons', {
      token: state.staffToken,
      body: {
        name: 'Already Over',
        organizer: 'Test Org',
        regDeadline: daysFromNow(-30),
        round1Date: daysFromNow(-20),
        registrationLink: 'https://example.org/over',
      },
    });
    refreshStatuses();
    const res = await call('GET', `/api/hackathons/${created.body.hackathon.id}`);
    assert.equal(res.body.hackathon.status, 'closed');

    const archive = await call('GET', '/api/hackathons?status=closed');
    assert.ok(archive.body.hackathons.some((h) => h.name === 'Already Over'));
  });
});

describe('AI assistant', () => {
  test('requires authentication', async () => {
    const res = await call('POST', '/api/chat', { body: { question: 'hello' } });
    assert.equal(res.status, 401);
  });

  test('answers eligibility questions from live data', async () => {
    const res = await call('POST', '/api/chat', {
      token: state.studentToken,
      body: { question: 'which hackathons am I eligible for?' },
    });
    assert.equal(res.status, 200);
    assert.equal(res.body.source, 'local', 'no API key configured in tests');
    assert.match(res.body.answer, /Bhasha Setu Challenge/);
  });

  test('answers app-usage questions from the help doc', async () => {
    const res = await call('POST', '/api/chat', {
      token: state.studentToken,
      body: { question: 'how do I turn on notifications?' },
    });
    assert.match(res.body.answer, /Profile → Notifications/);
  });

  test('reports it cannot answer what it does not know', async () => {
    const res = await call('POST', '/api/chat', {
      token: state.studentToken,
      body: { question: 'who won the 1998 chess olympiad' },
    });
    assert.match(res.body.answer, /could not find/i);
  });
});

describe('admin stats', () => {
  test('summarises the dashboard counters', async () => {
    const res = await call('GET', '/api/stats', { token: state.staffToken });
    assert.equal(res.status, 200);
    assert.ok(res.body.hackathons.total > 0);
    assert.equal(res.body.feedback.total, 1);
    assert.ok(res.body.students >= 2);
  });
});
