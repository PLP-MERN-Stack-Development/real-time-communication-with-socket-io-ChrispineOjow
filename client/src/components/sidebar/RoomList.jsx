import { useMemo, useState } from 'react';
import clsx from 'clsx';
import { useSocketContext } from '../../context/SocketProvider.jsx';

const RoomList = ({ onSelect }) => {
  const { rooms, roomsById, activeRoomId, setActiveRoom, unreadMap, createRoom } = useSocketContext();
  const [isCreating, setIsCreating] = useState(false);
  const [form, setForm] = useState({ name: '', description: '' });

  const enrichedRooms = useMemo(() => {
    const knownIds = new Set(rooms.map((room) => room.id));
    if (activeRoomId && !knownIds.has(activeRoomId) && roomsById[activeRoomId]) {
      return [roomsById[activeRoomId], ...rooms];
    }
    return rooms;
  }, [activeRoomId, rooms, roomsById]);

  const handleCreateRoom = (event) => {
    event.preventDefault();
    if (!form.name.trim()) return;
    createRoom({
      name: form.name.trim(),
      description: form.description.trim(),
      isPrivate: false,
    });
    setForm({ name: '', description: '' });
    setIsCreating(false);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-slate-400 uppercase tracking-wide">Chat rooms</p>
        <button className="text-sm text-emerald-300 hover:text-emerald-200" onClick={() => setIsCreating((prev) => !prev)}>
          {isCreating ? 'Cancel' : 'New'}
        </button>
      </div>

      {isCreating ? (
        <form onSubmit={handleCreateRoom} className="space-y-3 rounded-2xl border border-white/5 bg-slate-900/60 p-4">
          <input
            value={form.name}
            onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
            placeholder="Room name"
            className="w-full rounded-xl border border-white/10 bg-slate-800/80 px-3 py-2 text-sm text-white placeholder:text-slate-500"
          />
          <textarea
            value={form.description}
            onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))}
            placeholder="Description"
            rows={2}
            className="w-full rounded-xl border border-white/10 bg-slate-800/80 px-3 py-2 text-sm text-white placeholder:text-slate-500"
          />
          <button
            type="submit"
            className="w-full rounded-xl bg-emerald-500/90 px-3 py-2 text-sm font-semibold text-slate-950 hover:bg-emerald-400"
          >
            Create room
          </button>
        </form>
      ) : null}

      <div className="scroll-area space-y-2 overflow-auto pr-1">
        {enrichedRooms.map((room) => (
          <button
            key={room.id}
            onClick={() => {
              setActiveRoom(room.id);
              onSelect?.();
            }}
            className={clsx(
              'w-full rounded-2xl border border-transparent px-3 py-3 text-left transition',
              activeRoomId === room.id ? 'border-emerald-400/40 bg-white/5 text-white' : 'bg-slate-900/40 text-slate-300 hover:bg-slate-900/70',
            )}
          >
            <p className="text-sm font-semibold text-white">{room.name}</p>
            <p className="text-xs text-slate-400">{room.description}</p>
            {unreadMap[room.id] ? (
              <span className="mt-2 inline-flex items-center rounded-full bg-emerald-500/20 px-2 py-0.5 text-xs font-semibold text-emerald-300">
                {unreadMap[room.id]} unread
              </span>
            ) : null}
          </button>
        ))}

        {!enrichedRooms.length ? <p className="text-sm text-slate-500">No rooms yet</p> : null}
      </div>
    </div>
  );
};

export default RoomList;


