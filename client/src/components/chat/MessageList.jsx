import { useEffect, useRef } from 'react';
import { useSocketContext } from '../../context/SocketProvider.jsx';
import MessageItem from './MessageItem.jsx';
import TypingIndicator from './TypingIndicator.jsx';

const MessageList = ({ roomId, messages }) => {
  const { typingByRoom } = useSocketContext();
  const containerRef = useRef(null);
  const prevLengthRef = useRef(messages.length);

  useEffect(() => {
    const node = containerRef.current;
    if (!node) return;
    const prevLength = prevLengthRef.current;
    prevLengthRef.current = messages.length;
    if (messages.length > prevLength) {
      node.scrollTo({ top: node.scrollHeight, behavior: 'smooth' });
    }
  }, [messages]);

  return (
    <div ref={containerRef} className="scroll-area flex h-full flex-col gap-4 overflow-y-auto bg-slate-950/40 px-6 py-6">
      {messages.map((message) => (
        <MessageItem key={message.id} message={message} roomId={roomId} />
      ))}
      {!messages.length ? <p className="text-center text-sm text-slate-500">No messages yet — start the conversation!</p> : null}
      <TypingIndicator users={typingByRoom[roomId] || []} />
    </div>
  );
};

export default MessageList;


