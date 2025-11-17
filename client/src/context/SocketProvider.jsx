import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { socket } from '../socket/socket.js';
import { useNotifications } from '../hooks/useNotifications.js';

const SocketContext = createContext(null);
const LOCAL_STORAGE_KEY = 'week5-chat-profile';

const safeId = () => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return Math.random().toString(36).slice(2);
};

const conversationId = (a, b) => {
  if (!a || !b) return 'private';
  return ['private', ...[a, b].sort()].join(':');
};

const sortRooms = (roomList) =>
  [...roomList].sort((a, b) => {
    if (a.id === 'general') return -1;
    if (b.id === 'general') return 1;
    return a.name.localeCompare(b.name);
  });

const toRecord = (items = []) =>
  items.reduce((acc, item) => {
    acc[item.id] = item;
    return acc;
  }, {});

export const SocketProvider = ({ children }) => {
  const storedProfile = useMemo(() => {
    try {
      const data = localStorage.getItem(LOCAL_STORAGE_KEY);
      return data ? JSON.parse(data) : null;
    } catch {
      return null;
    }
  }, []);

  const [profile, setProfile] = useState(storedProfile);
  const [user, setUser] = useState(null);
  const [isConnected, setIsConnected] = useState(socket.connected);
  const [rooms, setRooms] = useState({});
  const [activeRoomId, setActiveRoomId] = useState('general');
  const [messagesByRoom, setMessagesByRoom] = useState({});
  const [typingByRoom, setTypingByRoom] = useState({});
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [unreadMap, setUnreadMap] = useState({});
  const [searchResults, setSearchResults] = useState({ roomId: null, query: '', results: [] });
  const [hasMoreMap, setHasMoreMap] = useState({});
  const [loadingHistory, setLoadingHistory] = useState({});

  const { playSound, triggerBrowserNotification } = useNotifications();
  const profileRef = useRef(profile);
  const userRef = useRef(user);

  useEffect(() => {
    profileRef.current = profile;
    if (profile) {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(profile));
    } else {
      localStorage.removeItem(LOCAL_STORAGE_KEY);
    }
  }, [profile]);

  useEffect(() => {
    userRef.current = user;
  }, [user]);

  const resetState = useCallback(() => {
    setRooms({});
    setMessagesByRoom({});
    setTypingByRoom({});
    setOnlineUsers([]);
    setNotifications([]);
    setUnreadMap({});
    setSearchResults({ roomId: null, query: '', results: [] });
    setHasMoreMap({});
    setLoadingHistory({});
    setActiveRoomId('general');
  }, []);

  const attachMessage = useCallback((roomId, message) => {
    setMessagesByRoom((prev) => {
      const current = prev[roomId] || [];
      const exists = current.find((msg) => msg.id === message.id);
      const next = exists
        ? current.map((msg) => (msg.id === message.id ? { ...msg, ...message } : msg))
        : [...current, message];
      next.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
      return { ...prev, [roomId]: next };
    });
  }, []);

  useEffect(() => {
    const handleConnect = () => setIsConnected(true);
    const handleDisconnect = () => setIsConnected(false);

    const handleInitState = (payload) => {
      if (payload?.user) {
        setUser(payload.user);
        setRooms(toRecord(payload.rooms || []));
        setOnlineUsers(payload.onlineUsers || []);
      }
    };

    const handleRoomList = (roomList) => {
      setRooms(toRecord(roomList));
    };

    const handleRoomJoined = ({ room }) => {
      if (room) {
        setRooms((prev) => ({ ...prev, [room.id]: room }));
      }
    };

    const handleMessagesHistory = ({ roomId, messages = [], nextCursor, hasMore }) => {
      setMessagesByRoom((prev) => {
        const existing = prev[roomId] || [];
        const combined = [...messages, ...existing].reduce((acc, msg) => {
          acc[msg.id] = { ...(acc[msg.id] || {}), ...msg };
          return acc;
        }, {});
      const ordered = Object.values(combined).sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
        return { ...prev, [roomId]: ordered };
      });
      setHasMoreMap((prev) => ({ ...prev, [roomId]: Boolean(hasMore || nextCursor) }));
      setLoadingHistory((prev) => ({ ...prev, [roomId]: false }));
    };

    const handleReceiveMessage = (message) => {
      if (!message?.roomId) return;
      attachMessage(message.roomId, message);
      if (message.senderId !== userRef.current?.id && message.roomId !== activeRoomId) {
        setUnreadMap((prev) => ({
          ...prev,
          [message.roomId]: (prev[message.roomId] || 0) + 1,
        }));
      }
      if (message.senderId !== userRef.current?.id) {
        playSound();
        if (typeof document !== 'undefined' && document.visibilityState === 'hidden') {
          triggerBrowserNotification('New message', {
            body: `${message.senderName}: ${message.content || 'sent an attachment'}`,
          });
        }
      }
    };

    const handleTypingUsers = ({ roomId, users: list }) => {
      setTypingByRoom((prev) => ({ ...prev, [roomId]: list || [] }));
    };

    const handleUserList = (list) => setOnlineUsers(list || []);

    const handleNotification = (notice) => {
      setNotifications((prev) => [{ ...notice }, ...prev].slice(0, 25));
    };

    const handleMessageReaction = ({ roomId, messageId, reactions }) => {
      setMessagesByRoom((prev) => {
        const roomMessages = prev[roomId] || [];
        const next = roomMessages.map((msg) =>
          msg.id === messageId ? { ...msg, reactions } : msg,
        );
        return { ...prev, [roomId]: next };
      });
    };

    const handleMessageRead = ({ roomId, messageId, readBy }) => {
      setMessagesByRoom((prev) => {
        const roomMessages = prev[roomId] || [];
        const next = roomMessages.map((msg) =>
          msg.id === messageId ? { ...msg, readBy } : msg,
        );
        return { ...prev, [roomId]: next };
      });
    };

    const handleSearchResults = (payload) => {
      setSearchResults(payload);
    };

    const handleMessageAck = (message) => {
      setMessagesByRoom((prev) => {
        const roomMessages = prev[message.roomId] || [];
        const next = roomMessages.map((msg) => {
          if (msg.id === message.clientTempId || msg.clientTempId === message.clientTempId) {
            return { ...message, temp: false };
          }
          if (msg.id === message.id) {
            return { ...message, temp: false };
          }
          return msg;
        });
        const exists = next.find((msg) => msg.id === message.id);
        return {
          ...prev,
          [message.roomId]: exists ? next : [...next, message],
        };
      });
    };

    socket.on('connect', handleConnect);
    socket.on('disconnect', handleDisconnect);
    socket.on('init_state', handleInitState);
    socket.on('room_list', handleRoomList);
    socket.on('room_joined', handleRoomJoined);
    socket.on('messages_history', handleMessagesHistory);
    socket.on('receive_message', handleReceiveMessage);
    socket.on('private_message', handleReceiveMessage);
    socket.on('typing_users', handleTypingUsers);
    socket.on('user_list', handleUserList);
    socket.on('notification', handleNotification);
    socket.on('message_reaction', handleMessageReaction);
    socket.on('message_read', handleMessageRead);
    socket.on('search_results', handleSearchResults);
    socket.on('message_ack', handleMessageAck);

    return () => {
      socket.off('connect', handleConnect);
      socket.off('disconnect', handleDisconnect);
      socket.off('init_state', handleInitState);
      socket.off('room_list', handleRoomList);
      socket.off('room_joined', handleRoomJoined);
      socket.off('messages_history', handleMessagesHistory);
      socket.off('receive_message', handleReceiveMessage);
      socket.off('private_message', handleReceiveMessage);
      socket.off('typing_users', handleTypingUsers);
      socket.off('user_list', handleUserList);
      socket.off('notification', handleNotification);
      socket.off('message_reaction', handleMessageReaction);
      socket.off('message_read', handleMessageRead);
      socket.off('search_results', handleSearchResults);
      socket.off('message_ack', handleMessageAck);
    };
  }, [activeRoomId, attachMessage, playSound, triggerBrowserNotification]);

  useEffect(() => {
    if (!profile) {
      socket.disconnect();
      setUser(null);
      resetState();
      return;
    }
    if (!socket.connected) {
      socket.connect();
    }
    socket.emit('user_join', profile, (response) => {
      if (!response?.ok) {
        setProfile(null);
        return;
      }
      setUser(response.user);
    });
  }, [profile, resetState]);

  const login = useCallback((payload) => {
    setProfile(payload);
  }, []);

  const logout = useCallback(() => {
    socket.disconnect();
    setProfile(null);
    setUser(null);
    resetState();
  }, [resetState]);

  const setTyping = useCallback((roomId, isTyping) => {
    if (!roomId) return;
    socket.emit('typing', { roomId, isTyping });
  }, []);

  const markRoomRead = useCallback(
    (roomId) => {
      if (!roomId || !userRef.current) return;
      const messages = messagesByRoom[roomId] || [];
      messages.forEach((message) => {
        if (!message.readBy?.includes(userRef.current.id)) {
          socket.emit('message_read', {
            roomId,
            messageId: message.id,
            readerId: userRef.current.id,
          });
        }
      });
      setUnreadMap((prev) => ({ ...prev, [roomId]: 0 }));
    },
    [messagesByRoom],
  );

  const setActiveRoom = useCallback(
    (roomId) => {
      if (!roomId) return;
      setActiveRoomId(roomId);
      socket.emit('join_room', { roomId });
      markRoomRead(roomId);
    },
    [markRoomRead],
  );

  const createOptimisticMessage = useCallback(
    (roomId, content, attachments) => {
      const tempId = safeId();
      const now = new Date().toISOString();
      const optimisticMessage = {
        id: tempId,
        clientTempId: tempId,
        roomId,
        senderId: userRef.current?.id,
        senderName: userRef.current?.username,
        avatarColor: userRef.current?.avatarColor,
        content,
        attachments,
        createdAt: now,
        readBy: userRef.current ? [userRef.current.id] : [],
        reactions: {},
        temp: true,
      };
      attachMessage(roomId, optimisticMessage);
      return tempId;
    },
    [attachMessage],
  );

  const sendMessage = useCallback(
    async ({ roomId, content, attachments }) => {
      if (!roomId || !content?.trim()?.length && !attachments?.length) return;
      const preparedAttachments = attachments?.map((file) => ({
        id: file.id || safeId(),
        name: file.name,
        type: file.type,
        size: file.size,
        data: file.data,
      }));
      const tempId = createOptimisticMessage(roomId, content, preparedAttachments);
      socket.emit(
        'send_message',
        {
          roomId,
          message: content,
          attachments: preparedAttachments,
          clientTempId: tempId,
        },
        (response) => {
          if (!response?.ok) {
            setNotifications((prev) => {
              const next = [
                {
                  id: safeId(),
                  type: 'error',
                  message: response?.error || 'Failed to send message',
                  timestamp: new Date().toISOString(),
                },
                ...prev,
              ];
              return next.slice(0, 20);
            });
          }
        },
      );
    },
    [createOptimisticMessage],
  );

  const sendPrivateMessage = useCallback(
    ({ to, content, attachments }) => {
      if (!to || (!content?.trim() && !attachments?.length)) return;
      const prepared = attachments?.map((file) => ({
        id: file.id || safeId(),
        name: file.name,
        type: file.type,
        size: file.size,
        data: file.data,
      }));
      const tempId = createOptimisticMessage(conversationId(userRef.current?.id, to), content, prepared);
      socket.emit(
        'private_message',
        {
          to,
          message: content,
          attachments: prepared,
          clientTempId: tempId,
        },
        (response) => {
          if (!response?.ok && response?.error) {
            setNotifications((prev) => {
              const next = [
                {
                  id: safeId(),
                  type: 'error',
                  message: response.error,
                  timestamp: new Date().toISOString(),
                },
                ...prev,
              ];
              return next.slice(0, 20);
            });
          }
        },
      );
    },
    [createOptimisticMessage],
  );

  const loadOlderMessages = useCallback(
    (roomId) => {
      if (!roomId || loadingHistory[roomId]) return;
      const messages = messagesByRoom[roomId] || [];
      if (!hasMoreMap[roomId] && messages.length > 0) return;
      setLoadingHistory((prev) => ({ ...prev, [roomId]: true }));
      const oldest = messages[0];
      socket.emit('load_messages', {
        roomId,
        cursor: oldest?.createdAt || null,
        limit: 25,
      });
    },
    [hasMoreMap, loadingHistory, messagesByRoom],
  );

  const searchMessages = useCallback((roomId, query) => {
    if (!roomId || !query?.trim()) {
      setSearchResults({ roomId: null, query: '', results: [] });
      return;
    }
    socket.emit('search_messages', { roomId, query });
  }, []);

  const clearSearchResults = useCallback(() => {
    setSearchResults({ roomId: null, query: '', results: [] });
  }, []);

  const setReaction = useCallback((roomId, messageId, reaction) => {
    socket.emit('message_reaction', { roomId, messageId, reaction });
  }, []);

  const dismissNotification = useCallback((id) => {
    setNotifications((prev) => prev.filter((notice) => notice.id !== id));
  }, []);

  const createRoom = useCallback((roomData) => {
    socket.emit('create_room', roomData);
  }, []);

  const value = useMemo(
    () => ({
      profile,
      user,
      isConnected,
      rooms: sortRooms(Object.values(rooms)),
      roomsById: rooms,
      activeRoomId,
      messagesByRoom,
      onlineUsers,
      typingByRoom,
      notifications,
      unreadMap,
      searchResults,
      hasMoreMap,
      loadingHistory,
      login,
      logout,
      sendMessage,
      sendPrivateMessage,
      setTyping,
      setActiveRoom,
      markRoomRead,
      loadOlderMessages,
      searchMessages,
      setReaction,
      dismissNotification,
      createRoom,
      clearSearchResults,
    }),
    [
      profile,
      user,
      isConnected,
      rooms,
      activeRoomId,
      messagesByRoom,
      onlineUsers,
      typingByRoom,
      notifications,
      unreadMap,
      searchResults,
      hasMoreMap,
      loadingHistory,
      login,
      logout,
      sendMessage,
      sendPrivateMessage,
      setTyping,
      setActiveRoom,
      markRoomRead,
      loadOlderMessages,
      searchMessages,
      setReaction,
      dismissNotification,
      createRoom,
      clearSearchResults,
    ],
  );

  return <SocketContext.Provider value={value}>{children}</SocketContext.Provider>;
};

export const useSocketContext = () => {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error('useSocketContext must be used inside SocketProvider');
  }
  return context;
};

