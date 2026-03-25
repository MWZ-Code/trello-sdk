# PRD 07: Tauri Desktop Application Shell

**Status:** Planned
**Depends on:** PRD 02 (API client), PRD 03 (SQLite database)

## Problem Description

All previous PRDs produce TypeScript/Node.js modules. This PRD wraps them in a Tauri desktop application with a React frontend, providing the actual user interface and desktop-native capabilities (secure storage, system tray, offline detection).

## Current State

- No Tauri app exists
- All logic is in TypeScript modules tested via Vitest
- Research confirms: React + Tailwind CSS + shadcn/ui + @dnd-kit for the UI
- Embedding Trello UI is not viable (CSP/ToS) — must build custom
- `tauri-plugin-keyring` identified for secure token storage

## Requirements

### Functional
1. **Tauri project scaffolding:**
   - Rust backend with Tauri commands for DB access and secure storage
   - React + TypeScript + Tailwind CSS frontend
   - IPC bridge between frontend and Rust backend
2. **Authentication flow:**
   - OAuth popup via Tauri webview → capture token
   - Store token securely via `tauri-plugin-keyring`
   - Support multiple user sessions (switch accounts)
3. **Board view:**
   - Kanban-style board with draggable cards (@dnd-kit)
   - List columns with card previews (name, labels, due date, members)
   - Card detail modal with full fields, comments, attachments, evidence
4. **Sync status UI:**
   - Visual indicator: synced / syncing / offline / error
   - Last sync timestamp
   - Pending changes count
5. **Offline mode:**
   - Detect network status
   - Queue mutations when offline
   - Show offline indicator in UI
   - Auto-sync on reconnect
6. **System tray:**
   - Minimize to tray
   - Notification badges for sync events

### Non-Functional
1. App startup to usable UI in < 3 seconds
2. Board render with 500 cards in < 1 second
3. Drag-and-drop must feel instant (< 100ms visual feedback)
4. App bundle size < 50MB

## Impacted Files

| File / Module | Change Type | Notes |
|---|---|---|
| `src-tauri/` | create | Rust backend (Tauri) |
| `src-tauri/src/main.rs` | create | Tauri entry point + commands |
| `src-tauri/src/db.rs` | create | SQLite access from Rust |
| `src-tauri/src/keyring.rs` | create | Secure token storage |
| `src/` | restructure | Move existing modules under src/ |
| `src/ui/` | create | React components |
| `src/ui/App.tsx` | create | Root component |
| `src/ui/components/Board.tsx` | create | Kanban board view |
| `src/ui/components/Card.tsx` | create | Card component |
| `src/ui/components/CardDetail.tsx` | create | Card detail modal |

## Constraints

- Must not break existing test suite
- Rust backend handles all sensitive operations (DB, keyring) — frontend never touches tokens directly
- UI must be distinct from Trello's visual design (ToS consideration)
- Support macOS, Windows, Linux

## Success Criteria

1. `npm run tauri dev` launches the app successfully
2. OAuth flow completes and token is stored securely
3. Board loads with cards displayed in correct lists
4. Cards can be dragged between lists with optimistic UI update
5. Offline mode queues changes and syncs on reconnect
6. App works on macOS (primary), with Windows/Linux as stretch goals

## Out of Scope

- Mobile support
- Auto-update mechanism
- Plugin/extension system
- Themes beyond light/dark mode
