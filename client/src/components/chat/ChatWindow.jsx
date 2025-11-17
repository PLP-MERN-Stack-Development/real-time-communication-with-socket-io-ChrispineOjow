import { useMemo } from 'react';
import { useSocketContext } from '../../context/SocketProvider.jsx';
import RoomHeader from './RoomHeader.jsx';
import MessageList from './MessageList.jsx';
import MessageComposer from './MessageComposer.jsx';
import SearchPanel from './SearchPanel.jsx';

const ChatWindow = () => {
  const { activeRoomId, roomsById, messagesByRoom, searchResults } = useSocketContext();

  const currentRoom = useMemo(() => roomsById[activeRoomId] || { id: activeRoomId, name: activeRoomId, description: 'Private conversation' }, [activeRoomId, roomsById]);
  const messages = messagesByRoom[activeRoomId] || [];

  if (!activeRoomId) {
    return (
      <div className="flex h-full flex-col justify-center gap-4 p-10 text-center text-slate-400">
        <p className="text-lg font-semibold text-white">Select or create a room</p>
        <p className="text-sm">Pick a channel from the left or start a direct conversation.</p>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      <RoomHeader room={currentRoom} />
      <div className="relative flex-1 overflow-hidden">
        <MessageList roomId={activeRoomId} messages={messages} />
        {searchResults.roomId === activeRoomId && searchResults.results.length ? <SearchPanel /> : null}
      </div>
      <MessageComposer roomId={activeRoomId} />
    </div>
  );
};

export default ChatWindow;


