import { formatDistanceToNow } from 'date-fns';
import clsx from 'clsx';
import { useSocketContext } from '../../context/SocketProvider.jsx';

const RoomHeader = ({ room }) => {
  const { onlineUsers, searchMessages, activeRoomId, hasMoreMap, loadOlderMessages, loadingHistory } = useSocketContext();

  const participantCount = room?.memberCount || onlineUsers.length;

  return (
    <header className="flex flex-wrap items-center gap-4 border-b border-white/5 bg-slate-900/50 px-6 py-4">
      <div>
        <p className="text-lg font-semibold text-white">{room?.name || 'Conversation'}</p>
        <p className="text-sm text-slate-400">{room?.description || 'Private channel'}</p>
      </div>
      <div className="ml-auto flex flex-wrap items-center gap-3 text-xs text-slate-400">
        <span>{participantCount} online</span>
        <button
          onClick={() => searchMessages(activeRoomId, prompt('Search messages in this room') || '')}
          className="rounded-xl border border-white/10 px-3 py-1 text-xs text-slate-300 hover:text-white"
        >
          Search
        </button>
        {hasMoreMap[activeRoomId] ? (
          <button
            onClick={() => loadOlderMessages(activeRoomId)}
            className={clsx(
              'rounded-xl border border-white/10 px-3 py-1 text-xs text-slate-300 hover:text-white',
              loadingHistory[activeRoomId] && 'opacity-50',
            )}
          >
            {loadingHistory[activeRoomId] ? 'Loading history…' : 'Load older'}
          </button>
        ) : (
          <span className="text-slate-600">History synced</span>
        )}
        {room?.createdAt ? <span>Created {formatDistanceToNow(new Date(room.createdAt), { addSuffix: true })}</span> : null}
      </div>
    </header>
  );
};

export default RoomHeader;


