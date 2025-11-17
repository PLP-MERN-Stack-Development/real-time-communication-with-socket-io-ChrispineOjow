import { useMemo } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { useSocketContext } from '../../context/SocketProvider.jsx';

const NotificationCenter = () => {
  const { notifications, dismissNotification } = useSocketContext();

  const latest = useMemo(() => notifications.slice(0, 4), [notifications]);

  return (
    <div className="glass-panel flex flex-wrap gap-4 rounded-2xl border border-white/5 bg-slate-900/60 p-4">
      <div className="flex w-full items-center justify-between">
        <p className="text-sm font-semibold uppercase tracking-wide text-slate-400">Live notifications</p>
        <span className="text-xs text-slate-500">{notifications.length} total</span>
      </div>
      {latest.length === 0 ? (
        <p className="text-sm text-slate-500">You are all caught up 🎉</p>
      ) : (
        <ul className="flex w-full flex-col gap-3">
          {latest.map((notice) => (
            <li key={notice.id} className="flex items-center gap-3 rounded-2xl border border-white/5 bg-slate-950/40 px-4 py-3">
              <div
                className={clsx(
                  'h-2 w-2 rounded-full',
                  notice.type === 'error' ? 'bg-rose-400' : notice.type === 'room_created' ? 'bg-indigo-400' : 'bg-emerald-400',
                )}
              ></div>
              <div className="flex-1 text-sm text-slate-200">{notice.message}</div>
              <span className="text-xs text-slate-500">{formatDistanceToNow(new Date(notice.timestamp), { addSuffix: true })}</span>
              <button className="text-xs text-slate-500 hover:text-white" onClick={() => dismissNotification(notice.id)}>
                Dismiss
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default NotificationCenter;


