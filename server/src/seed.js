/**
 * Loads a realistic demo dataset: two staff accounts, five students, eight
 * hackathons spanning upcoming/ongoing/closed, achievements and feedback.
 * Safe to re-run — it clears the tables it owns first.
 *
 *   npm run seed --workspace server
 */
import { db, nowIso } from './db.js';
import { hashPassword } from './auth.js';
import { newId } from './util.js';

const daysFromNow = (n) => {
  const d = new Date();
  d.setDate(d.getDate() + n);
  d.setHours(23, 59, 0, 0);
  return d.toISOString();
};

const PASSWORD = 'hacktrack123';

const staff = [
  { name: 'Dr. Meera Krishnan', email: 'meera.k@college.edu', collegeId: 'STF001', department: 'CSE' },
  { name: 'Prof. Arun Raghavan', email: 'arun.r@college.edu', collegeId: 'STF002', department: 'IT' },
];

const students = [
  { name: 'Sanjay Kumar', email: 'sanjay.k@college.edu', collegeId: '22CS041', year: 'III', department: 'CSE', interests: ['agentic ai', 'language model'] },
  { name: 'Divya Ramesh', email: 'divya.r@college.edu', collegeId: '23IT018', year: 'II', department: 'IT', interests: ['fintech', 'web'] },
  { name: 'Karthik Selvam', email: 'karthik.s@college.edu', collegeId: '21EC007', year: 'IV', department: 'ECE', interests: ['iot', 'robotics'] },
  { name: 'Priya Nandhini', email: 'priya.n@college.edu', collegeId: '24CS102', year: 'I', department: 'CSE', interests: ['web', 'design'] },
  { name: 'Rahul Menon', email: 'rahul.m@college.edu', collegeId: '22IT055', year: 'III', department: 'IT', interests: ['cybersecurity'] },
];

const hackathons = [
  {
    name: 'Bhashini Bhasha Setu Challenge',
    description:
      'Build multilingual translation and speech tools for Indian languages on top of the Bhashini stack. Teams pick one of four problem statements covering speech-to-text, translation quality, dialect handling and accessibility.',
    organizer: 'MeitY / Digital India Bhashini',
    themes: ['language model', 'speech tech', 'accessibility'],
    eligibility: ['II', 'III', 'IV'],
    teamSizeMin: 2,
    teamSizeMax: 4,
    prizeAmount: '₹3,00,000',
    regDeadline: daysFromNow(6),
    round1Date: daysFromNow(14),
    round2Date: daysFromNow(28),
    eventMode: 'hybrid',
    venue: 'IIT Madras Research Park',
    status: 'upcoming',
    registrationLink: 'https://bhashini.gov.in/hackathon',
    tags: ['agentic ai', 'language model', 'nlp', 'translation'],
  },
  {
    name: 'FinShield Fintech Sprint',
    description:
      'A 36-hour sprint on fraud detection, credit scoring for thin-file customers, and UPI-scale payment reliability. Mentors from three partner banks.',
    organizer: 'NPCI x College Innovation Cell',
    themes: ['fintech', 'security'],
    eligibility: ['III', 'IV'],
    teamSizeMin: 3,
    teamSizeMax: 5,
    prizeAmount: '₹1,50,000',
    regDeadline: daysFromNow(2),
    round1Date: daysFromNow(9),
    round2Date: null,
    eventMode: 'offline',
    venue: 'Main Auditorium, Block C',
    status: 'upcoming',
    registrationLink: 'https://example.org/finshield/register',
    tags: ['fintech', 'fraud detection', 'payments'],
  },
  {
    name: 'AgentCraft: Autonomous Agents Hackathon',
    description:
      'Design multi-step AI agents that plan, call tools and recover from failure. Bring your own problem or pick from the shortlist.',
    organizer: 'Google Developer Groups',
    themes: ['agentic ai', 'developer tools'],
    eligibility: ['I', 'II', 'III', 'IV'],
    teamSizeMin: 1,
    teamSizeMax: 4,
    prizeAmount: '₹2,00,000',
    regDeadline: daysFromNow(20),
    round1Date: daysFromNow(30),
    round2Date: daysFromNow(45),
    eventMode: 'online',
    venue: '',
    status: 'upcoming',
    registrationLink: 'https://gdg.community.dev/agentcraft',
    tags: ['agentic ai', 'language model', 'automation'],
  },
  {
    name: 'Smart Campus IoT Build-off',
    description:
      'Sensor-driven solutions for energy use, water leakage and classroom occupancy across the campus. Hardware kits provided.',
    organizer: 'Department of ECE',
    themes: ['iot', 'sustainability'],
    eligibility: ['II', 'III', 'IV'],
    teamSizeMin: 2,
    teamSizeMax: 4,
    prizeAmount: '₹75,000',
    regDeadline: daysFromNow(11),
    round1Date: daysFromNow(18),
    round2Date: null,
    eventMode: 'offline',
    venue: 'ECE Innovation Lab',
    status: 'upcoming',
    registrationLink: 'https://example.edu/iot-buildoff',
    tags: ['iot', 'embedded', 'sensors', 'sustainability'],
  },
  {
    name: 'CyberDefend CTF',
    description: 'Jeopardy-style capture the flag: web exploitation, reversing, forensics and crypto.',
    organizer: 'CyberSec Club',
    themes: ['cybersecurity'],
    eligibility: ['I', 'II', 'III', 'IV'],
    teamSizeMin: 1,
    teamSizeMax: 3,
    prizeAmount: '₹50,000',
    regDeadline: daysFromNow(-1),
    round1Date: daysFromNow(3),
    round2Date: null,
    eventMode: 'online',
    venue: '',
    status: 'ongoing',
    registrationLink: 'https://ctf.example.org/register',
    tags: ['cybersecurity', 'ctf', 'forensics'],
  },
  {
    name: 'StartUp Pitch Arena',
    description: 'Pitch a working prototype and a business model to a panel of investors and alumni founders.',
    organizer: 'Entrepreneurship Development Cell',
    themes: ['entrepreneurship'],
    eligibility: ['StartUp'],
    teamSizeMin: 2,
    teamSizeMax: 5,
    prizeAmount: '₹5,00,000 seed funding',
    regDeadline: daysFromNow(35),
    round1Date: daysFromNow(50),
    round2Date: daysFromNow(60),
    eventMode: 'offline',
    venue: 'Incubation Centre',
    status: 'upcoming',
    registrationLink: 'https://example.edu/pitch-arena',
    tags: ['startup', 'business', 'pitch'],
  },
  {
    name: 'Smart India Hackathon 2025 — Internal Round',
    description: 'Internal selection round deciding which teams represent the college at the national SIH finals.',
    organizer: 'Ministry of Education, Innovation Cell',
    themes: ['open innovation', 'govtech'],
    eligibility: ['II', 'III', 'IV'],
    teamSizeMin: 6,
    teamSizeMax: 6,
    prizeAmount: '₹1,00,000',
    regDeadline: daysFromNow(-45),
    round1Date: daysFromNow(-30),
    round2Date: daysFromNow(-20),
    eventMode: 'offline',
    venue: 'Seminar Hall 2',
    status: 'closed',
    registrationLink: 'https://sih.gov.in',
    tags: ['govtech', 'open innovation', 'sih'],
  },
  {
    name: 'DataViz Datathon',
    description: 'Turn three open municipal datasets into a decision-support dashboard in 24 hours.',
    organizer: 'Analytics Club',
    themes: ['data science', 'visualisation'],
    eligibility: ['I', 'II', 'III', 'IV'],
    teamSizeMin: 1,
    teamSizeMax: 3,
    prizeAmount: '₹40,000',
    regDeadline: daysFromNow(-70),
    round1Date: daysFromNow(-60),
    round2Date: null,
    eventMode: 'online',
    venue: '',
    status: 'closed',
    registrationLink: 'https://example.edu/datathon',
    tags: ['data', 'analytics', 'dashboards'],
  },
];

const run = db.transaction(() => {
  db.exec(`
    DELETE FROM reminder_log;
    DELETE FROM notifications;
    DELETE FROM push_subscriptions;
    DELETE FROM feedback;
    DELETE FROM winners;
    DELETE FROM hackathons;
    DELETE FROM users;
  `);

  const insertUser = db.prepare(
    `INSERT INTO users (id, name, email, collegeId, passwordHash, role, year, department, interests, createdAt)
     VALUES (@id, @name, @email, @collegeId, @passwordHash, @role, @year, @department, @interests, @createdAt)`,
  );
  const at = nowIso();
  const passwordHash = hashPassword(PASSWORD);

  const staffIds = staff.map((s) => {
    const id = newId('usr');
    insertUser.run({ ...s, id, passwordHash, role: 'staff', year: null, interests: '[]', createdAt: at });
    return id;
  });
  const studentIds = students.map((s) => {
    const id = newId('usr');
    insertUser.run({
      ...s,
      id,
      passwordHash,
      role: 'student',
      interests: JSON.stringify(s.interests),
      createdAt: at,
    });
    return id;
  });

  const insertHack = db.prepare(
    `INSERT INTO hackathons (id, name, description, organizer, themes, eligibility, teamSizeMin, teamSizeMax,
      prizeAmount, regDeadline, round1Date, round2Date, eventMode, venue, status, registrationLink, tags,
      postedBy, updatedBy, createdAt, updatedAt)
     VALUES (@id, @name, @description, @organizer, @themes, @eligibility, @teamSizeMin, @teamSizeMax,
      @prizeAmount, @regDeadline, @round1Date, @round2Date, @eventMode, @venue, @status, @registrationLink, @tags,
      @postedBy, @updatedBy, @createdAt, @updatedAt)`,
  );
  const hackIds = hackathons.map((h, i) => {
    const id = newId('hck');
    const postedBy = staffIds[i % staffIds.length];
    insertHack.run({
      ...h,
      id,
      themes: JSON.stringify(h.themes),
      eligibility: JSON.stringify(h.eligibility),
      tags: JSON.stringify(h.tags),
      postedBy,
      updatedBy: postedBy,
      createdAt: new Date(Date.now() - (hackathons.length - i) * 3600_000).toISOString(),
      updatedAt: at,
    });
    return id;
  });

  const insertWinner = db.prepare(
    `INSERT INTO winners (id, hackathonId, teamName, members, placement, prizeWon, problemStatementChosen, postedBy, createdAt, updatedAt)
     VALUES (@id, @hackathonId, @teamName, @members, @placement, @prizeWon, @problemStatementChosen, @postedBy, @createdAt, @updatedAt)`,
  );
  const winners = [
    {
      hackathonId: hackIds[6],
      teamName: 'Team Vaayu',
      members: ['Sanjay Kumar', 'Rahul Menon', 'Karthik Selvam'],
      placement: 'Winner',
      prizeWon: '₹1,00,000',
      problemStatementChosen: 'SIH1462 — Air quality forecasting for tier-2 cities',
    },
    {
      hackathonId: hackIds[6],
      teamName: 'Byte Brigade',
      members: ['Divya Ramesh', 'Priya Nandhini'],
      placement: 'Runner-up',
      prizeWon: '₹50,000',
      problemStatementChosen: 'SIH1109 — Digital attendance for rural schools',
    },
    {
      hackathonId: hackIds[7],
      teamName: 'Plot Twist',
      members: ['Divya Ramesh', 'Rahul Menon'],
      placement: 'Silver Medal',
      prizeWon: '₹15,000',
      problemStatementChosen: 'Municipal water usage dashboard',
    },
  ];
  winners.forEach((w, i) =>
    insertWinner.run({
      ...w,
      id: newId('win'),
      members: JSON.stringify(w.members),
      placement: w.placement,
      postedBy: staffIds[i % staffIds.length],
      createdAt: new Date(Date.now() - (i + 1) * 86400_000).toISOString(),
      updatedAt: at,
    }),
  );

  const insertFeedback = db.prepare(
    `INSERT INTO feedback (id, studentId, category, message, relatedHackathonId, status, createdAt, updatedAt)
     VALUES (@id, @studentId, @category, @message, @relatedHackathonId, @status, @createdAt, @updatedAt)`,
  );
  const feedback = [
    {
      studentId: studentIds[0],
      category: 'hackathon-info',
      message: 'Is the Bhashini challenge open to a team of two, or do we need at least three members?',
      relatedHackathonId: hackIds[0],
      status: 'open',
    },
    {
      studentId: studentIds[1],
      category: 'suggestion',
      message: 'It would help to see which hackathons my department has previously won, sorted by year.',
      relatedHackathonId: null,
      status: 'reviewed',
    },
    {
      studentId: studentIds[3],
      category: 'bug',
      message: 'The deadline countdown on the FinShield card showed a negative number for a moment this morning.',
      relatedHackathonId: hackIds[1],
      status: 'resolved',
    },
  ];
  feedback.forEach((f, i) =>
    insertFeedback.run({
      ...f,
      id: newId('fbk'),
      createdAt: new Date(Date.now() - (i + 1) * 43200_000).toISOString(),
      updatedAt: at,
    }),
  );
});

run();

console.log('Seeded HackTrack demo data.');
console.log(`  staff   : ${staff.map((s) => s.email).join(', ')}`);
console.log(`  students: ${students.map((s) => s.email).join(', ')}`);
console.log(`  password: ${PASSWORD} (for every demo account)`);
