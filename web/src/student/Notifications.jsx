import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../lib/api.js';
import { EmptyState, ErrorNote, Spinner } from '../components/ui.jsx';
import { formatDate } from '../lib/format.js';

const URGENCY = {
  critical: { icon: '🚨', tone: 'border-l-rose-500' },
  high: { icon: '⏰', tone: 'border-l-orange-500' },
  elevated: { icon: '⏳', tone: 'border-l-amber-500' },
  normal: { icon: '📣', tone: 'border-l-brand-500' },
};

export default function NotificationsPage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  const load = () => {
    setLoading(true);
    api
      .get('/notifications')
      .then((data) => setItems(data.notifications))
      .catch(setError)
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const open = async (n) => {
    if (!n.readAt) await api.post('/notifications/read', { ids: [n.id] }).catch(() => {});
    if (n.hackathonId) navigate(`/hackathons/${n.hackathonId}`);
    else load();
  };

  const markAll = async () => {
    await api.post('/notifications/read', { all: true }).catch(() => {});
    load();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-lg font-bold text-slate-900">Notifications</h2>
        <div className="flex gap-2">
          <button type="button" onClick={markAll} className="text-sm font-medium text-brand-700">
            Mark all read
          </button>
          <Link to="/notifications/settings" className="text-sm font-medium text-slate-500">
            Settings
          </Link>
        </div>
      </div>

      <ErrorNote error={error} onRetry={load} />

      {loading ? (
        <Spinner />
      ) : items.length === 0 ? (
        <EmptyState
          icon="🔔"
          title="No notifications yet"
          hint="You will hear from us when a hackathon you are eligible for is posted, and as its deadline nears."
          action={
            <Link to="/notifications/settings" className="btn-secondary mt-2">
              Notification settings
            </Link>
          }
        />
      ) : (
        <ul className="space-y-2">
          {items.map((n) => {
            const style = URGENCY[n.urgency] || URGENCY.normal;
            return (
              <li key={n.id}>
                <button
                  type="button"
                  onClick={() => open(n)}
                  className={`card w-full border-l-4 p-4 text-left ${style.tone} ${
                    n.readAt ? 'opacity-70' : ''
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <span className="text-lg leading-none">{style.icon}</span>
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-slate-900">{n.title}</p>
                      <p className="mt-0.5 text-sm text-slate-600">{n.body}</p>
                      <p className="mt-1.5 text-[11px] text-slate-400">
                        {formatDate(n.createdAt, { withTime: true })}
                      </p>
                    </div>
                    {!n.readAt && <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-brand-600" />}
                  </div>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
