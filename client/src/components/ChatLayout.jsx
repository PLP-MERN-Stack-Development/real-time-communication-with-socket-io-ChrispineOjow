import { useMemo, useState } from 'react';
import Sidebar from './sidebar/Sidebar.jsx';
import ChatWindow from './chat/ChatWindow.jsx';
import NotificationCenter from './sidebar/NotificationCenter.jsx';
import { useSocketContext } from '../context/SocketProvider.jsx';

const ChatLayout = () => {
  const { activeRoomId } = useSocketContext();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const mobileHeader = useMemo(
    () => (
      <header className="flex items-center justify-between border-b border-white/5 bg-slate-900/80 px-4 py-3 text-sm text-slate-300 lg:hidden">
        <button
          className="rounded-xl border border-white/10 px-3 py-2 font-medium text-white"
          onClick={() => setIsSidebarOpen((prev) => !prev)}
        >
          {isSidebarOpen ? 'Close menu' : 'Open menu'}
        </button>
        <span className="truncate">Room: {activeRoomId || 'general'}</span>
      </header>
    ),
    [activeRoomId, isSidebarOpen],
  );

  return (
    <div className="flex min-h-screen flex-col lg:flex-row">
      {mobileHeader}
      <div className="flex flex-1 flex-col gap-4 p-4 lg:p-6">
        <div className="flex flex-1 flex-col gap-4 lg:flex-row">
          <aside
            className={`glass-panel scroll-area h-[calc(100vh-8rem)] w-full max-w-full flex-none overflow-y-auto p-4 transition-all lg:h-[calc(100vh-4rem)] lg:w-80 lg:translate-x-0 ${
              isSidebarOpen ? 'translate-x-0' : 'hidden lg:block'
            }`}
          >
            <Sidebar onNavigate={() => setIsSidebarOpen(false)} />
          </aside>

          <section className="glass-panel flex-1 overflow-hidden">
            <ChatWindow />
          </section>
        </div>
        <NotificationCenter />
      </div>
    </div>
  );
};

export default ChatLayout;


