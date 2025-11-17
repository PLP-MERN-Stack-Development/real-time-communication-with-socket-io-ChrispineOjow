// server.js - Main server file for Socket.io chat application

const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');
const { v4: uuid } = require('uuid');
const dayjs = require('dayjs');

dotenv.config();

const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:5173';
const PORT = Number(process.env.PORT || 5000);
const MAX_ROOM_MESSAGES = Number(process.env.MAX_ROOM_MESSAGES || 500);
const MAX_ATTACHMENT_SIZE = Number(process.env.MAX_ATTACHMENT_SIZE || 2 * 1024 * 1024);
const DEFAULT_ROOMS = [
  {
    id: 'general',
    name: 'General',
    description: 'Open discussion for everyone',
    isPrivate: false,
    createdAt: new Date().toISOString(),
    createdBy: 'system',
  },
  {
    id: 'help-desk',
    name: 'Help Desk',
    description: 'Ask questions and get help',
    isPrivate: false,
    createdAt: new Date().toISOString(),
    createdBy: 'system',
  },
];

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: CLIENT_URL,
    methods: ['GET', 'POST'],
    credentials: true,
  },
  connectionStateRecovery: {
    maxDisconnectionDuration: 2 * 60 * 1000,
  },
});

app.use(cors({ origin: CLIENT_URL, credentials: true }));
app.use(express.json({ limit: '5mb' }));
app.use(express.static(path.join(__dirname, 'public')));

const users = new Map(); // socketId -> user metadata
const rooms = new Map(); // roomId -> room metadata
const roomMessages = new Map(); // roomId -> messages[]
const roomTyping = new Map(); // roomId -> Map<userId, username>

const initRooms = () => {
  DEFAULT_ROOMS.forEach((room) => {
    rooms.set(room.id, { ...room, members: new Set() });
    roomMessages.set(room.id, []);
    roomTyping.set(room.id, new Map());
  });
};

initRooms();

const serializeUser = (user) => ({
  id: user.id,
  username: user.username,
  avatarColor: user.avatarColor,
  status: user.status,
  lastSeen: user.lastSeen,
  rooms: Array.from(user.rooms || []),
});

const serializeRoom = (room) => ({
  id: room.id,
  name: room.name,
  description: room.description,
  isPrivate: room.isPrivate,
  createdBy: room.createdBy,
  createdAt: room.createdAt,
  memberCount: room.members.size,
});

const serializeMessage = (message) => ({
  ...message,
  readBy: Array.from(message.readBy || []),
});

const getOnlineUsers = () => Array.from(users.values()).map(serializeUser);
const getMemberUser = (memberId) => {
  const member = [...users.values()].find((u) => u.id === memberId);
  if (member) return member;
  return {
    id: memberId,
    username: 'Unknown',
    avatarColor: '#6b7280',
    status: 'offline',
    lastSeen: null,
    rooms: new Set(),
  };
};

const randomColor = () => {
  const colors = ['#f97316', '#16a34a', '#2563eb', '#9333ea', '#f43f5e'];
  return colors[Math.floor(Math.random() * colors.length)];
};

const ensureRoom = (roomId) => {
  if (!rooms.has(roomId)) {
    const newRoom = {
      id: roomId,
      name: roomId,
      description: 'Private room',
      isPrivate: true,
      createdAt: new Date().toISOString(),
      createdBy: 'system',
      members: new Set(),
    };
    rooms.set(roomId, newRoom);
    roomMessages.set(roomId, []);
    roomTyping.set(roomId, new Map());
  }
  return rooms.get(roomId);
};

const conversationId = (userA, userB) => {
  return ['private', ...[userA, userB].sort()].join(':');
};

const addUserToRoom = (socket, roomId) => {
  const user = users.get(socket.id);
  if (!user) return;
  const room = ensureRoom(roomId);
  room.members.add(user.id);
  user.rooms.add(roomId);
  socket.join(roomId);
  io.to(roomId).emit('room_users', {
    roomId,
    users: Array.from(room.members)
      .map((memberId) => serializeUser(getMemberUser(memberId)))
      .filter(Boolean),
  });
  socket.emit('room_joined', { room: serializeRoom(room), roomId });
  sendLatestMessages(socket, roomId);
};

const removeUserFromRoom = (socketId, roomId) => {
  const user = users.get(socketId);
  const room = rooms.get(roomId);
  if (!user || !room) return;
  room.members.delete(user.id);
  user.rooms.delete(roomId);
  const typingMap = roomTyping.get(roomId);
  typingMap?.delete(user.id);
  io.to(roomId).emit('typing_users', { roomId, users: Array.from(typingMap?.values() || []) });
  io.to(roomId).emit('room_users', {
    roomId,
    users: Array.from(room.members)
      .map((memberId) => serializeUser(getMemberUser(memberId)))
      .filter(Boolean),
  });
};

const sendLatestMessages = (socket, roomId) => {
  const msgs = roomMessages.get(roomId) || [];
  const latest = msgs.slice(-25).map(serializeMessage);
  socket.emit('messages_history', { roomId, messages: latest, nextCursor: latest[0]?.createdAt || null });
};

const paginateMessages = (roomId, cursor, limit = 25) => {
  const msgs = roomMessages.get(roomId) || [];
  if (!cursor) {
    const chunk = msgs.slice(-limit);
    const nextCursor = chunk.length ? chunk[0].createdAt : null;
    return { messages: chunk.map(serializeMessage), nextCursor, hasMore: msgs.length > chunk.length };
  }
  const cursorIndex = msgs.findIndex((m) => m.createdAt === cursor);
  const sliceEnd = cursorIndex === -1 ? msgs.length : cursorIndex;
  const sliceStart = Math.max(0, sliceEnd - limit);
  const chunk = msgs.slice(sliceStart, sliceEnd);
  const nextCursor = chunk.length ? chunk[0].createdAt : null;
  return { messages: chunk.map(serializeMessage), nextCursor, hasMore: sliceStart > 0 };
};

const storeMessage = (roomId, message) => {
  const msgs = roomMessages.get(roomId) || [];
  msgs.push(message);
  if (msgs.length > MAX_ROOM_MESSAGES) {
    msgs.shift();
  }
  roomMessages.set(roomId, msgs);
  return message;
};

const validateAttachments = (attachments = []) => {
  return attachments
    .filter(Boolean)
    .map((file) => ({
      id: file.id || uuid(),
      name: file.name?.slice(0, 120) || 'file',
      type: file.type || 'application/octet-stream',
      size: Math.min(Number(file.size) || 0, MAX_ATTACHMENT_SIZE),
      data: file.data?.length > MAX_ATTACHMENT_SIZE * 1.5 ? null : file.data, // basic guard
    }))
    .filter((file) => file.data);
};

const buildMessage = (payload, user, roomId, overrides = {}) => {
  const timestamp = new Date().toISOString();
  return {
    id: uuid(),
    clientTempId: payload.clientTempId || null,
    roomId,
    senderId: user.id,
    senderName: user.username,
    avatarColor: user.avatarColor,
    content: payload.message?.trim() || '',
    attachments: validateAttachments(payload.attachments),
    createdAt: timestamp,
    deliveredAt: timestamp,
    isPrivate: overrides.isPrivate || false,
    readBy: new Set([user.id]),
    reactions: new Map(),
    metadata: {
      acked: false,
      delivery: 'delivered',
    },
  };
};

const messageToClient = (message) => {
  const reactions = {};
  if (message.reactions instanceof Map) {
    message.reactions.forEach((value, key) => {
      reactions[key] = Array.from(value);
    });
  } else if (typeof message.reactions === 'object') {
    Object.entries(message.reactions).forEach(([key, value]) => {
      reactions[key] = Array.isArray(value) ? value : [];
    });
  }
  return {
    ...serializeMessage(message),
    reactions,
  };
};

const broadcastNotification = (payload) => {
  io.emit('notification', {
    id: uuid(),
    timestamp: new Date().toISOString(),
    ...payload,
  });
};

io.on('connection', (socket) => {
  console.log(`User connected: ${socket.id}`);

  socket.on('user_join', (payload, callback) => {
    const username = payload?.username?.trim();
    if (!username) {
      callback?.({ ok: false, error: 'Username is required' });
      return;
    }

    const avatarColor = payload?.avatarColor || randomColor();
    const user = {
      id: socket.id,
      username,
      avatarColor,
      status: 'online',
      joinedAt: new Date().toISOString(),
      lastSeen: null,
      rooms: new Set(),
    };

    users.set(socket.id, user);
    socket.data.userId = user.id;

    DEFAULT_ROOMS.forEach((room) => addUserToRoom(socket, room.id));

    socket.emit('init_state', {
      user: serializeUser(user),
      rooms: Array.from(rooms.values()).map(serializeRoom),
      onlineUsers: getOnlineUsers(),
    });

    io.emit('user_list', getOnlineUsers());
    broadcastNotification({
      type: 'user_joined',
      message: `${user.username} joined the chat`,
    });

    callback?.({ ok: true, user: serializeUser(user) });
  });

  socket.on('join_room', ({ roomId }) => {
    if (!roomId) return;
    addUserToRoom(socket, roomId);
  });

  socket.on('leave_room', ({ roomId }) => {
    if (!roomId) return;
    removeUserFromRoom(socket.id, roomId);
    socket.leave(roomId);
  });

  socket.on('create_room', ({ name, description, isPrivate }) => {
    const user = users.get(socket.id);
    if (!user) return;
    const trimmed = name?.trim();
    if (!trimmed) {
      socket.emit('room_error', { error: 'Room name is required' });
      return;
    }
    const id = trimmed.toLowerCase().replace(/\s+/g, '-');
    if (rooms.has(id)) {
      socket.emit('room_error', { error: 'Room already exists' });
      return;
    }
    const room = {
      id,
      name: trimmed,
      description: description?.trim() || 'Custom room',
      isPrivate: Boolean(isPrivate),
      createdBy: user.username,
      createdAt: new Date().toISOString(),
      members: new Set(),
    };
    rooms.set(id, room);
    roomMessages.set(id, []);
    roomTyping.set(id, new Map());
    addUserToRoom(socket, id);
    io.emit('room_list', Array.from(rooms.values()).map(serializeRoom));
    broadcastNotification({
      type: 'room_created',
      message: `${user.username} created #${room.name}`,
      roomId: id,
    });
  });

  socket.on('send_message', (payload = {}, callback) => {
    const user = users.get(socket.id);
    if (!user) return;
    const roomId = payload.roomId || 'general';
    addUserToRoom(socket, roomId);
    const message = buildMessage(payload, user, roomId);
    storeMessage(roomId, message);
    const dto = messageToClient(message);

    if (typeof callback === 'function') {
      callback({ ok: true, message: dto });
    }
    socket.emit('message_ack', dto);
    io.to(roomId).emit('receive_message', dto);

    broadcastNotification({
      type: 'message',
      roomId,
      message: `${user.username}: ${dto.content || 'sent an attachment'}`,
    });
  });

  socket.on('private_message', ({ to, message, attachments, clientTempId }, callback) => {
    const sender = users.get(socket.id);
    const target = [...users.values()].find((u) => u.id === to);
    if (!sender || !target) {
      callback?.({ ok: false, error: 'User offline' });
      return;
    }
    const roomId = conversationId(sender.id, target.id);
    const room = ensureRoom(roomId);
    room.isPrivate = true;
    room.name = `${sender.username} & ${target.username}`;
    room.members.add(sender.id);
    room.members.add(target.id);

    addUserToRoom(socket, roomId);
    const targetSocket = [...users.entries()].find(([, user]) => user.id === target.id)?.[0];
    if (targetSocket) {
      const socketInstance = io.sockets.sockets.get(targetSocket);
      socketInstance?.join(roomId);
    }

    const msgPayload = {
      roomId,
      message,
      attachments,
      clientTempId,
    };
    const built = buildMessage(msgPayload, sender, roomId, { isPrivate: true });
    storeMessage(roomId, built);
    const dto = messageToClient(built);

    callback?.({ ok: true, message: dto, roomId });
    io.to(roomId).emit('private_message', dto);
  });

  socket.on('typing', ({ roomId, isTyping }) => {
    if (!roomId) return;
    const user = users.get(socket.id);
    if (!user) return;
    const typingMap = roomTyping.get(roomId) || new Map();
    if (isTyping) {
      typingMap.set(user.id, user.username);
    } else {
      typingMap.delete(user.id);
    }
    roomTyping.set(roomId, typingMap);
    io.to(roomId).emit('typing_users', {
      roomId,
      users: Array.from(typingMap.values()),
    });
  });

  socket.on('load_messages', ({ roomId, cursor, limit }) => {
    if (!roomId) return;
    const page = paginateMessages(roomId, cursor, limit || 25);
    socket.emit('messages_history', { roomId, ...page });
  });

  socket.on('message_read', ({ roomId, messageId, readerId }) => {
    const user = users.get(socket.id);
    if (!user) return;
    const msgs = roomMessages.get(roomId) || [];
    const message = msgs.find((m) => m.id === messageId);
    if (!message) return;
    message.readBy = message.readBy || new Set();
    message.readBy.add(readerId || user.id);
    io.to(roomId).emit('message_read', {
      roomId,
      messageId,
      readBy: Array.from(message.readBy),
    });
  });

  socket.on('message_reaction', ({ roomId, messageId, reaction }) => {
    const user = users.get(socket.id);
    if (!user || !roomId || !messageId || !reaction) return;
    const msgs = roomMessages.get(roomId) || [];
    const message = msgs.find((m) => m.id === messageId);
    if (!message) return;
    if (!message.reactions || !(message.reactions instanceof Map)) {
      message.reactions = new Map();
    }
    const existing = message.reactions.get(reaction) || new Set();
    if (existing.has(user.id)) {
      existing.delete(user.id);
    } else {
      existing.add(user.id);
    }
    message.reactions.set(reaction, existing);
    io.to(roomId).emit('message_reaction', {
      roomId,
      messageId,
      reactions: messageToClient(message).reactions,
    });
  });

  socket.on('search_messages', ({ roomId, query }) => {
    if (!roomId || !query) return;
    const msgs = roomMessages.get(roomId) || [];
    const lower = query.toLowerCase();
    const results = msgs
      .filter((msg) => msg.content?.toLowerCase().includes(lower))
      .slice(-20)
      .map(messageToClient);
    socket.emit('search_results', { roomId, query, results });
  });

  socket.on('disconnect', () => {
    const user = users.get(socket.id);
    if (!user) return;
    user.status = 'offline';
    user.lastSeen = dayjs().toISOString();
    user.rooms.forEach((roomId) => removeUserFromRoom(socket.id, roomId));
    users.delete(socket.id);
    io.emit('user_list', getOnlineUsers());
    broadcastNotification({
      type: 'user_left',
      message: `${user.username} left the chat`,
    });
  });
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: Date.now() });
});

app.get('/api/rooms', (req, res) => {
  res.json({
    rooms: Array.from(rooms.values()).map(serializeRoom),
  });
});

app.get('/api/rooms/:roomId/messages', (req, res) => {
  const { roomId } = req.params;
  const { cursor, limit = 25 } = req.query;
  if (!rooms.has(roomId)) {
    return res.status(404).json({ error: 'Room not found' });
  }
  const page = paginateMessages(roomId, cursor, Number(limit));
  return res.json({ roomId, ...page });
});

app.get('/api/users/online', (req, res) => {
  res.json({ users: getOnlineUsers() });
});

app.get('/api/search', (req, res) => {
  const { roomId, query } = req.query;
  if (!roomId || !query) {
    return res.status(400).json({ error: 'roomId and query are required' });
  }
  const msgs = roomMessages.get(roomId) || [];
  const lower = query.toLowerCase();
  const results = msgs.filter((msg) => msg.content?.toLowerCase().includes(lower)).map(messageToClient);
  res.json({ roomId, total: results.length, results });
});

app.get('/', (req, res) => {
  res.send('Socket.io Chat Server is running');
});

const startServer = (() => {
  let currentPort = Number(PORT);
  let isListening = false;

  const attemptListen = () => {
    if (isListening) return;
    server.listen(currentPort, () => {
      isListening = true;
      console.log(`Server running on port ${currentPort}`);
    });
  };

  server.on('error', (error) => {
    if (error.code === 'EADDRINUSE') {
      console.warn(`Port ${currentPort} is in use, retrying on ${currentPort + 1}...`);
      currentPort += 1;
      setTimeout(attemptListen, 250);
      return;
    }
    console.error('Server failed to start:', error);
    process.exitCode = 1;
  });

  return attemptListen;
})();

startServer();

module.exports = { app, server, io };
