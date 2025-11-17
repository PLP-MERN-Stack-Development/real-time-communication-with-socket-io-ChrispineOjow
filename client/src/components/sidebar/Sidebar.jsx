import { useMemo, useState } from 'react';
import clsx from 'clsx';
import { useSocketContext } from '../../context/SocketProvider.jsx';
import RoomList from './RoomList.jsx';
import UserList from './UserList.jsx';

const Sidebar = ({ onNavigate }) => {
  const { user, isConnected, logout } = useSocketContext();
  const [tab, setTab] = useState('rooms');

  const tabs = useMemo(
    () => [
      { id: 'rooms', label: 'Rooms' },
      { id: 'users', label: 'People' },
    ],
    [],
  );

  return (
    <div className="flex h-full flex-col gap-5">
      <div className="rounded-2xl border border-white/5 bg-slate-900/60 p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl text-xl font-semibold text-white" style={{ backgroundColor: user?.avatarColor }}>
            {user?.username?.slice(0, 1)?.toUpperCase()}
          </div>
          <div>
            <p className="text-base font-semibold text-white">{user?.username}</p>
            <p className="text-xs text-slate-400">{isConnected ? 'Connected' : 'Reconnecting...'}</p>
          </div>
        </div>
        <button
          className="mt-4 w-full rounded-xl border border-white/10 px-3 py-2 text-sm text-slate-300 hover:bg-white/5"
          onClick={logout}
        >
          Sign out
        </button>
      </div>

      <div>
        <div className="flex gap-2 rounded-2xl border border-white/5 bg-slate-900/60 p-1 text-sm">
          {tabs.map((item) => (
            <button
              key={item.id}
              className={clsx(
                'flex-1 rounded-xl px-3 py-2 font-medium transition',
                tab === item.id ? 'bg-white/10 text-white' : 'text-slate-400 hover:text-white',
              )}
              onClick={() => {
                setTab(item.id);
                onNavigate?.();
              }}
            >
              {item.label}
            </button>
          ))}
        </div>
        <div className="mt-4">
          {tab === 'rooms' ? <RoomList onSelect={onNavigate} /> : <UserList onSelect={onNavigate} />}
        </div>
      </div>
    </div>
  );
};

export default Sidebar;


