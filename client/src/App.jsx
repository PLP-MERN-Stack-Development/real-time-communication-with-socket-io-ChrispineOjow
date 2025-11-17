import { useMemo } from 'react';
import { useSocketContext } from './context/SocketProvider.jsx';
import ChatLayout from './components/ChatLayout.jsx';
import LoginScreen from './components/LoginScreen.jsx';

const App = () => {
  const { profile, user, isConnected } = useSocketContext();

  const showLogin = useMemo(() => !profile || !user, [profile, user]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      {showLogin ? <LoginScreen isConnected={isConnected} /> : <ChatLayout />}
    </div>
  );
};

export default App;


