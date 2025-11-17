import { useMemo } from 'react';
import clsx from 'clsx';
import { useSocketContext } from '../../context/SocketProvider.jsx';

const buildConversationId = (userId, peerId) => {
  if (!userId || !peerId) return null;
  return ['private', ...[userId, peerId].sort()].join(':');
};

const UserList = ({ onSelect }) => {
  const { user, onlineUsers, activeRoomId, setActiveRoom, roomsById } = useSocketContext();

  const peers = useMemo(() => onlineUsers.filter((item) => item.id !== user?.id), [onlineUsers, user?.id]);

  return (
    <div className="space-y-4">
      <p className="text-sm font-semibold uppercase tracking-wide text-slate-400">Online users</p>
      <div className="scroll-area space-y-3 overflow-auto pr-1">
        {peers.map((peer) => {
          const directRoomId = buildConversationId(user?.id, peer.id);
          const isActive = activeRoomId === directRoomId;
          const room = roomsById[directRoomId];
          return (
            <button
              key={peer.id}
              className={clsx(
                'flex w-full items-center gap-3 rounded-2xl border border-transparent px-3 py-2 text-left transition',
                isActive ? 'border-emerald-400/40 bg-white/5' : 'bg-slate-900/40 hover:bg-slate-900/70',
              )}
              onClick={() => {
                setActiveRoom(directRoomId);
                onSelect?.();
              }}
            >
              <div className="h-10 w-10 flex-none rounded-2xl" style={{ backgroundColor: peer.avatarColor }}>
                &nbsp;
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold text-white">{peer.username}</p>
                <p className="text-xs text-slate-400">{room?.name || 'Direct message'}</p>
              </div>
              <span className="text-xs text-emerald-300">DM</span>
            </button>
          );
        })}

        {!peers.length ? <p className="text-sm text-slate-500">No one else is online</p> : null}
      </div>
    </div>
  );
};

export default UserList;


