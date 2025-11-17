import { useCallback, useEffect, useMemo, useState } from 'react';
import clsx from 'clsx';
import { useSocketContext } from '../../context/SocketProvider.jsx';

const buildConversationId = (userId, roomId) => {
  if (!roomId?.startsWith('private:')) return null;
  const parts = roomId.split(':').slice(1);
  return parts.find((id) => id !== userId);
};

const safeId = () => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
  return Math.random().toString(36).slice(2);
};

const readFile = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = reader.result?.toString().split(',')[1];
      resolve({
        id: safeId(),
        name: file.name,
        type: file.type,
        size: file.size,
        data: base64,
      });
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

const MessageComposer = ({ roomId }) => {
  const { user, sendMessage, sendPrivateMessage, setTyping } = useSocketContext();
  const [value, setValue] = useState('');
  const [attachments, setAttachments] = useState([]);
  const [isSending, setIsSending] = useState(false);

  const peerId = useMemo(() => buildConversationId(user?.id, roomId), [roomId, user?.id]);

  useEffect(() => {
    setValue('');
    setAttachments([]);
  }, [roomId]);

  const handleFiles = async (event) => {
    const files = Array.from(event.target.files || []);
    if (!files.length) return;
    const loaded = await Promise.all(files.map(readFile));
    setAttachments((prev) => [...prev, ...loaded]);
    event.target.value = '';
  };

  const handleSend = useCallback(() => {
    if (!value.trim() && !attachments.length) return;
    setIsSending(true);
    const payload = { content: value.trim(), attachments, roomId };
    if (peerId) {
      sendPrivateMessage({ to: peerId, ...payload });
    } else {
      sendMessage(payload);
    }
    setValue('');
    setAttachments([]);
    setIsSending(false);
    setTyping(roomId, false);
  }, [attachments, peerId, roomId, sendMessage, sendPrivateMessage, setTyping, value]);

  useEffect(() => {
    if (!roomId) return;
    if (!value) {
      setTyping(roomId, false);
      return;
    }
    const timeout = setTimeout(() => setTyping(roomId, false), 1200);
    setTyping(roomId, true);
    return () => clearTimeout(timeout);
  }, [roomId, setTyping, value]);

  return (
    <div className="border-t border-white/5 bg-slate-950/50 px-6 py-4">
      {attachments.length ? (
        <div className="mb-3 flex flex-wrap gap-3">
          {attachments.map((file) => (
            <div key={file.id} className="flex items-center gap-2 rounded-2xl border border-white/5 bg-slate-900/50 px-3 py-1.5 text-xs text-slate-200">
              <span>{file.name}</span>
              <button className="text-slate-400 hover:text-rose-400" onClick={() => setAttachments((prev) => prev.filter((item) => item.id !== file.id))}>
                Remove
              </button>
            </div>
          ))}
        </div>
      ) : null}

      <div className="flex items-end gap-3">
        <textarea
          rows={2}
          value={value}
          onChange={(event) => setValue(event.target.value)}
          placeholder="Message"
          className="scroll-area flex-1 rounded-2xl border border-white/10 bg-slate-900/70 px-4 py-3 text-sm text-white placeholder:text-slate-500 focus:border-emerald-400 focus:outline-none"
        />
        <label className="flex h-12 w-12 cursor-pointer items-center justify-center rounded-2xl border border-white/10 text-slate-400 hover:text-white">
          📎
          <input type="file" multiple className="hidden" onChange={handleFiles} />
        </label>
        <button
          onClick={handleSend}
          disabled={isSending || (!value.trim() && !attachments.length)}
          className={clsx(
            'h-12 min-w-[96px] rounded-2xl bg-gradient-to-r from-emerald-500 to-emerald-400 px-4 text-sm font-semibold text-slate-950 transition disabled:cursor-not-allowed disabled:opacity-50',
          )}
        >
          Send
        </button>
      </div>
    </div>
  );
};

export default MessageComposer;


