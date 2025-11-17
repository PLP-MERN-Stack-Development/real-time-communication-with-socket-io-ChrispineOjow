# Week 5 · Real-Time Chat with Socket.io

Modern chat experience that showcases bidirectional communication, multi-room collaboration, private conversations, live notifications, and responsive UI polish.

## ✨ Feature Highlights

- Username-based auth with persistent profiles and colorful avatars
- Presence list with online/offline state, typing indicators, and unread badges
- Global channels, custom room creation, and private (DM) threads
- Rich composer supporting file/image attachments, optimistic updates, and delivery acks
- Message reactions, read receipts, pagination, and keyword search
- Reconnection handling, sound + browser notifications, and message delivery notifications

## 🏗️ Project Structure

```
├── client/            # React + Vite + Tailwind UI
│   ├── src/
│   │   ├── components # Chat layout, sidebar, composer, etc.
│   │   ├── context    # Socket provider + global state
│   │   ├── hooks      # Notifications/audio helpers
│   │   └── socket     # Socket.io client bootstrap
├── server/            # Express + Socket.io gateway
│   └── server.js      # All events, rooms, notifications, history API
└── Week5-Assignment.md
```

## 🚀 Getting Started

```bash
# 1. Install dependencies
cd server && npm install
cd ../client && npm install

# 2. Run both dev servers
cd server && npm run dev
cd ../client && npm run dev
```

Environment variables:

```
SERVER:  CLIENT_URL=http://localhost:5173
CLIENT:  VITE_SOCKET_URL=http://localhost:5000
```

## 🧠 Implementation Notes

- Server keeps in-memory maps for users, rooms, typing state, and message history (with pagination + search endpoints).
- Attachments are base64-limited and validated before broadcasting.
- Client context wraps all Socket.io events, offers optimistic updates, read receipts, reactions, search, and notification helpers.
- UI uses a glassmorphic Tailwind design with responsive mobile-friendly layout and accessibility-first controls.

## ✅ Advanced Features Implemented

1. Private messaging with dedicated virtual rooms
2. Multiple room management (create/join/leave)
3. File & image sharing with previews
4. Typing indicators & presence awareness
5. Read receipts + message reactions
6. Browser + sound notifications
7. Message pagination & keyword search

## 🧪 Testing & Verification

- Start server/client locally, open multiple browser tabs, and verify:
  - Joining/leaving announcements, user list syncing, unread counts
  - Sending text/files across rooms and private threads
  - Typing indicator, reactions, read receipts, search overlay
  - Refresh/reconnect flows recover recent history and state

