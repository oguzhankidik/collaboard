# Real-time Collaborative Whiteboard — Claude Code Guide

## Project Overview
A real-time collaborative whiteboard where multiple users can draw, add shapes, and write text simultaneously. Users can see each other's cursors live, work in separate rooms, and export their boards.

## Tech Stack

### Frontend
- **Framework:** Vue 3 (Composition API, `<script setup>`)
- **Language:** TypeScript (strict mode)
- **State Management:** Pinia
- **Routing:** Vue Router 4
- **Styling:** Tailwind CSS v3
- **Canvas:** Native Canvas API (no canvas libraries)
- **Real-time:** Socket.io client

### Backend
- **Runtime:** Node.js
- **Framework:** Express
- **Real-time:** Socket.io
- **Database:** MongoDB + Mongoose
- **Auth:** Firebase Authentication (token verification on server)

### DevOps
- **Frontend Deploy:** Vercel
- **Backend Deploy:** Railway
- **Package Manager:** pnpm (monorepo)

---

## Monorepo Structure
```
/
├── client/                  # Vue frontend
│   ├── src/
│   │   ├── components/
│   │   │   ├── canvas/
│   │   │   │   ├── WhiteboardCanvas.vue
│   │   │   │   ├── ToolBar.vue
│   │   │   │   └── CursorOverlay.vue
│   │   │   ├── room/
│   │   │   │   ├── RoomList.vue
│   │   │   │   └── CreateRoomModal.vue
│   │   │   └── ui/
│   │   │       ├── AppButton.vue
│   │   │       └── AppModal.vue
│   │   ├── composables/
│   │   │   ├── useCanvas.ts
│   │   │   ├── useSocket.ts
│   │   │   ├── useDrawing.ts
│   │   │   └── useAuth.ts
│   │   ├── stores/
│   │   │   ├── canvasStore.ts
│   │   │   ├── roomStore.ts
│   │   │   └── authStore.ts
│   │   ├── views/
│   │   │   ├── HomeView.vue
│   │   │   ├── BoardView.vue
│   │   │   └── LoginView.vue
│   │   ├── types/
│   │   │   └── index.ts
│   │   ├── lib/
│   │   │   ├── firebase.ts
│   │   │   └── socket.ts
│   │   └── router/
│   │       └── index.ts
│   └── .env
│
├── server/                  # Node.js backend
│   ├── src/
│   │   ├── handlers/
│   │   │   ├── drawingHandler.ts
│   │   │   ├── cursorHandler.ts
│   │   │   └── roomHandler.ts
│   │   ├── models/
│   │   │   ├── Room.ts
│   │   │   └── Board.ts
│   │   ├── middleware/
│   │   │   └── authMiddleware.ts
│   │   ├── lib/
│   │   │   └── firebase-admin.ts
│   │   └── index.ts
│   └── .env
│
└── package.json             # Monorepo root
```

---

## Types (client/src/types/index.ts)
All types are defined here. Never define types inline or in components.
```ts
export type ToolType = 'pen' | 'rect' | 'circle' | 'arrow' | 'text' | 'select'

export interface Point {
  x: number
  y: number
}

export interface DrawElement {
  id: string
  type: ToolType
  points: Point[]
  color: string
  strokeWidth: number
  text?: string
  userId: string
  createdAt: number
}

export interface RemoteCursor {
  userId: string
  userName: string
  color: string
  position: Point
}

export interface Room {
  id: string
  name: string
  ownerId: string
  participants: string[]
  createdAt: string
}

export interface SocketEvents {
  // Client → Server
  'draw:start': (element: DrawElement) => void
  'draw:update': (element: DrawElement) => void
  'draw:end': (element: DrawElement) => void
  'cursor:move': (position: Point) => void
  'room:join': (roomId: string) => void
  'room:leave': (roomId: string) => void

  // Server → Client
  'draw:remote': (element: DrawElement) => void
  'cursor:remote': (cursor: RemoteCursor) => void
  'room:state': (elements: DrawElement[]) => void
  'user:joined': (user: { id: string; name: string }) => void
  'user:left': (userId: string) => void
}
```

---

## Code Standards

### General
- Always use `<script setup lang="ts">`
- `any` type is **forbidden** — use `unknown` for uncertain types
- No magic numbers — define constants in `src/constants/`
- Each component has a single responsibility (SRP)
- All Socket.io event names must come from the `SocketEvents` interface

### Vue Component Order
```vue
<script setup lang="ts">
// 1. Imports
// 2. Props & Emits
// 3. Store & Composable connections
// 4. Reactive state (ref, computed)
// 5. Functions
// 6. Lifecycle hooks
</script>
```

### Composable Rules
- Always prefix with `use`
- Socket.io calls go inside composables, never directly in components
- Canvas drawing logic lives in `useDrawing.ts` and `useCanvas.ts`
- Each composable manages its own loading/error state:
```ts
const loading = ref(false)
const error = ref<string | null>(null)
```

### Pinia Store Rules
- Use setup store syntax (not options API)
- Stores hold state only — Socket.io and API calls belong in composables

### Canvas Rules
- All drawing operations go through `useCanvas.ts`
- Never access `canvas.getContext()` outside of `useCanvas.ts`
- Remote events and local events use the same draw functions — no duplication
- Always use `requestAnimationFrame` for render loops

---

## Socket.io Architecture

### Event Flow — Drawing
```
User draws on canvas
  → useDrawing emits draw:start / draw:update / draw:end
    → Server broadcasts to room participants
      → Other clients receive draw:remote
        → useCanvas renders the element
```

### Event Flow — Cursors
```
User moves mouse
  → useSocket emits cursor:move (throttled to 30ms)
    → Server broadcasts to room participants
      → Other clients receive cursor:remote
        → CursorOverlay renders remote cursors
```

### Throttling
- `cursor:move` events must be throttled — **max once every 30ms**
- `draw:update` events must be throttled — **max once every 16ms** (60fps)

---

## Room System
- Each room has a unique ID (nanoid)
- On `room:join`, server sends full current board state (`room:state`)
- Board state is persisted in MongoDB after each `draw:end`
- Max 20 participants per room

---

## Auth Flow
1. User signs in via Firebase (Google)
2. Client gets Firebase ID token
3. Token sent in Socket.io handshake auth: `{ token }`
4. Server verifies token with Firebase Admin SDK on every connection
5. Unauthenticated connections are rejected immediately

---

## Export Feature
- Export is handled entirely on the frontend
- Use `canvas.toDataURL('image/png')` for PNG export
- Use `canvg` or manual SVG serialization for SVG export
- Export button lives in `ToolBar.vue`

---

## Environment Variables

### client/.env
```
VITE_SOCKET_URL=
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_APP_ID=
```

### server/.env
```
PORT=
MONGODB_URI=
FIREBASE_PROJECT_ID=
FIREBASE_CLIENT_EMAIL=
FIREBASE_PRIVATE_KEY=
CLIENT_URL=
```

---

## Features & Priorities

### P0 — Must Have
- [ ] Google sign-in / sign-out
- [ ] Create and join rooms
- [ ] Free drawing (pen tool)
- [ ] Shapes: rectangle, circle, arrow
- [ ] Text tool
- [ ] Live cursor positions of other users
- [ ] Board state synced on room join

### P1 — Important
- [ ] Undo / redo (local)
- [ ] Color picker & stroke width selector
- [ ] Room participant list
- [ ] Export as PNG

### P2 — Bonus
- [ ] Export as SVG
- [ ] Select & move elements
- [ ] Zoom & pan
- [ ] Room sharing via link

---

## What NOT To Do
- Do not use Options API — always use Composition API
- Do not use `any` type
- Do not write Socket.io logic directly inside components
- Do not access Canvas context outside of `useCanvas.ts`
- Do not emit cursor events without throttling
- Do not hardcode environment variables
- Do not persist every `draw:update` to MongoDB — only persist on `draw:end`

---

## Development Order
1. Monorepo setup (pnpm workspaces)
2. `server/src/index.ts` — Express + Socket.io bootstrap
3. `server/models/` — MongoDB schemas
4. `lib/firebase.ts` + `lib/firebase-admin.ts` — Auth setup
5. `authStore` + `useAuth` — Client auth flow
6. `LoginView` — Google login page
7. `lib/socket.ts` — Socket.io client singleton
8. `useSocket.ts` — Socket connection composable
9. `roomStore` + Room views — Create/join room
10. `useCanvas.ts` — Canvas setup and render loop
11. `useDrawing.ts` — Drawing tools logic
12. `WhiteboardCanvas.vue` — Main canvas component
13. `ToolBar.vue` — Tool selection UI
14. `CursorOverlay.vue` — Remote cursors
15. Socket handlers on server (drawing, cursor, room)
16. Export feature
17. Polish: loading states, error handling, responsive