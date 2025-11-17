import clsx from 'clsx';
import { format } from 'date-fns';
import { useSocketContext } from '../../context/SocketProvider.jsx';

const EMOJI_SET = ['👍', '🎉', '❤️', '🔥', '😂'];

const MessageItem = ({ message, roomId }) => {
  const { user, setReaction } = useSocketContext();
  const isOwn = message.senderId === user?.id;
  const readBy = message.readBy || [];
  const reactions = message.reactions || {};

  const handleReaction = (reaction) => {
    setReaction(roomId, message.id, reaction);
  };

  return (
    <div className={clsx('flex flex-col gap-2', isOwn ? 'items-end' : 'items-start')}>
      <div className="flex items-center gap-2 text-xs text-slate-500">
        <span className="font-semibold text-slate-300">{message.senderName}</span>
        <span>{format(new Date(message.createdAt), 'HH:mm')}</span>
        {message.temp ? <span className="text-amber-300">Sending…</span> : null}
      </div>

      <div className={clsx('max-w-xl rounded-3xl border border-white/5 px-4 py-3 text-sm leading-relaxed shadow-lg', isOwn ? 'rounded-tr-none bg-emerald-500/20 text-emerald-50' : 'rounded-tl-none bg-slate-800/60 text-slate-100')}>
        {message.content ? <p className="whitespace-pre-line">{message.content}</p> : null}

        {message.attachments?.length ? (
          <div className="mt-3 space-y-3">
            {message.attachments.map((file) => (
              <AttachmentPreview key={file.id} file={file} />
            ))}
          </div>
        ) : null}
      </div>

      <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
        {readBy.length > 1 && isOwn ? <span>{readBy.length - 1} read</span> : null}
        <div className="flex gap-1">
          {EMOJI_SET.map((emoji) => {
            const list = reactions[emoji] || [];
            const hasReacted = list.includes(user?.id);
            return (
              <button
                key={emoji}
                className={clsx(
                  'rounded-full border border-white/10 px-2 py-0.5 text-xs',
                  hasReacted ? 'bg-emerald-500/30 text-emerald-100' : 'text-slate-400 hover:text-white',
                )}
                onClick={() => handleReaction(emoji)}
              >
                {emoji} {list.length ? list.length : ''}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};

const AttachmentPreview = ({ file }) => {
  const isImage = file.type?.startsWith('image/');
  const blobUrl = file.data ? `data:${file.type};base64,${file.data}` : null;

  if (isImage && blobUrl) {
    return (
      <div className="overflow-hidden rounded-2xl border border-white/5">
        <img src={blobUrl} alt={file.name} className="max-h-64 w-full object-cover" />
      </div>
    );
  }

  return (
    <a
      href={blobUrl || '#'}
      download={file.name}
      className="flex items-center gap-3 rounded-2xl border border-white/10 bg-slate-900/40 px-3 py-2 text-xs text-slate-200"
    >
      <span className="font-semibold">{file.name}</span>
      <span className="text-slate-500">{Math.round((file.size || 0) / 1024)} KB</span>
    </a>
  );
};

export default MessageItem;


