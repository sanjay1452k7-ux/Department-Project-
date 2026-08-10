/**
 * Short static help document handed to the assistant on every request so it can
 * answer "how do I…" questions about the app itself. Keep it terse — it is
 * re-sent with each query.
 */
export const HELP_DOC = `
# HackTrack help

## Roles
- Staff (admin) accounts post and manage hackathons, post achievements, and read student feedback.
- Student accounts browse hackathons, search, get notified, view achievements, send feedback, and use this assistant.
- The two dashboards are separate: a student never sees admin screens and vice versa.

## Student screens
- **Home**: card feed of hackathons. Default order is closest registration deadline first. Use the filter bar to filter by eligibility year, theme/tag, event mode and minimum prize, or to switch sorting between deadline, newest and prize.
- **Hackathon detail**: opens when you tap a card. Shows description, themes, eligibility, team size, prize, all dates, mode/venue and a **Register** button that opens the organiser's official registration page in a new tab. HackTrack does not handle registration itself.
- **Search**: top of the Home screen. Type anything — a name, an organiser, a theme, a team name. Partial and vague queries work ("language ai" finds hackathons tagged with language-model themes). Results are split into Hackathons and Achievements.
- **Achievements**: feed of every winning team across all hackathons. Filter by hackathon or search a student/team name. Your own wins also appear on your Profile.
- **Archive**: the Home screen's "Closed" status filter shows past hackathons; they stay searchable for reporting and resume-building.
- **Feedback**: pick a category (bug, suggestion, hackathon info, other), write a message, optionally link a hackathon, submit. Your past submissions and their status (open / reviewed / resolved) are listed on the same screen.
- **Profile**: your name, role, year, department, interests, and your personal achievement history.
- **Notification settings** (Profile → Notifications): turn on browser push, toggle "new hackathon" and "deadline reminder" alerts separately, and optionally restrict alerts to chosen themes.

## Notifications
- You get a push the moment staff publish a hackathon you are eligible for (matched on your year, and on your chosen themes if you set any).
- Deadline reminders fire automatically 7 days, 3 days, 1 day before, and on the day registration closes. Wording gets more urgent as the deadline nears.
- To enable them: Profile → Notifications → "Enable push notifications", then allow the browser permission prompt. Installing HackTrack to your home screen (PWA) keeps them working on mobile.

## Assistant
- I answer questions about hackathons listed in HackTrack and about how to use the app.
- I am read-only: I cannot add, edit or delete hackathons, achievements or feedback. Ask a staff member for that.
`.trim();
