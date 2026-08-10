import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { useAuth } from './lib/auth.jsx';
import { Spinner } from './components/ui.jsx';

import Landing from './landing/Landing.jsx';
import LoginPage from './pages/Login.jsx';
import RegisterPage from './pages/Register.jsx';

import StudentShell from './student/StudentShell.jsx';
import StudentHome from './student/Home.jsx';
import HackathonDetail from './student/HackathonDetail.jsx';
import SearchPage from './student/Search.jsx';
import AchievementsFeed from './student/Achievements.jsx';
import FeedbackPage from './student/Feedback.jsx';
import ProfilePage from './student/Profile.jsx';
import NotificationsPage from './student/Notifications.jsx';
import NotificationSettings from './student/NotificationSettings.jsx';

import AdminShell from './admin/AdminShell.jsx';
import AdminHome from './admin/Dashboard.jsx';
import AdminHackathons from './admin/Hackathons.jsx';
import HackathonEditor from './admin/HackathonEditor.jsx';
import AdminAchievements from './admin/Achievements.jsx';
import AdminFeedback from './admin/FeedbackInbox.jsx';

/**
 * Roles get entirely separate route trees — a student never renders an admin
 * screen and vice versa, rather than one screen with permission toggles.
 */
function RequireRole({ role, children }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) return <Spinner label="Signing you in…" />;
  if (!user) return <Navigate to="/login" state={{ from: location }} replace />;
  if (user.role !== role) return <Navigate to={user.role === 'staff' ? '/admin' : '/'} replace />;
  return children;
}

/**
 * "/" is the front door for two different audiences. A visitor who is not
 * signed in gets the 3D landing page; a signed-in student gets their feed
 * (rendered through StudentShell's outlet); staff are sent to their own
 * dashboard. Deeper student URLs never show the landing page — they bounce to
 * login and come back after signing in.
 */
function StudentRoot() {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) return <Spinner label="Signing you in…" />;
  if (!user) {
    return location.pathname === '/' ? (
      <Landing />
    ) : (
      <Navigate to="/login" state={{ from: location }} replace />
    );
  }
  if (user.role !== 'student') return <Navigate to="/admin" replace />;
  return <StudentShell />;
}

function RootRedirect() {
  const { user, loading } = useAuth();
  if (loading) return <Spinner />;
  if (!user) return <Navigate to="/" replace />;
  return user.role === 'staff' ? <Navigate to="/admin" replace /> : <Navigate to="/" replace />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      {/* The landing page stays reachable once signed in, too. */}
      <Route path="/welcome" element={<Landing />} />

      {/* Student dashboard — "/" falls back to the landing page when signed out */}
      <Route path="/" element={<StudentRoot />}>
        <Route index element={<StudentHome />} />
        <Route path="hackathons/:id" element={<HackathonDetail />} />
        <Route path="search" element={<SearchPage />} />
        <Route path="achievements" element={<AchievementsFeed />} />
        <Route path="feedback" element={<FeedbackPage />} />
        <Route path="profile" element={<ProfilePage />} />
        <Route path="notifications" element={<NotificationsPage />} />
        <Route path="notifications/settings" element={<NotificationSettings />} />
      </Route>

      {/* Admin dashboard */}
      <Route
        path="/admin"
        element={
          <RequireRole role="staff">
            <AdminShell />
          </RequireRole>
        }
      >
        <Route index element={<AdminHome />} />
        <Route path="hackathons" element={<AdminHackathons />} />
        <Route path="hackathons/new" element={<HackathonEditor />} />
        <Route path="hackathons/:id/edit" element={<HackathonEditor />} />
        <Route path="achievements" element={<AdminAchievements />} />
        <Route path="feedback" element={<AdminFeedback />} />
      </Route>

      <Route path="*" element={<RootRedirect />} />
    </Routes>
  );
}
