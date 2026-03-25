# PRD 03: Local SQLite Database & Sync Engine

**Status:** Planned
**Depends on:** PRD 02 (API client with rate limiting)

## Problem Description

The application needs a local SQLite database that mirrors the user's Trello boards for offline-first operation. A sync engine must keep the local cache consistent with Trello's server state, handling conflicts and network interruptions gracefully.

## Current State

- Research doc `research/data-models.md` proposes a 20-table SQLite schema with sync metadata
- 13 Trello entities are fully documented with field inventories
- Rate limits are understood: 100 req/10s per token, no batch writes
- Webhook-only action types identified (22+ types not available via polling)

## Requirements

### Functional
1. **SQLite schema** implementing all core entities:
   - boards, lists, cards, members, organizations, labels
   - checklists, check_items, attachments, custom_fields, custom_field_items
   - actions (activity log)
   - Join tables: card_members, card_labels, board_members, org_members
2. **Sync metadata tables:**
   - `sync_meta` — per-board sync state (last_synced, sync_status, last_action_id)
   - `pending_changes` — offline mutation queue (operation, entity, payload, status)
3. **Initial sync:** Full board fetch in 1-5 API calls using nested resources
4. **Incremental sync (polling):**
   - Poll `GET /boards/{id}/actions?since={lastActionId}` periodically
   - Apply action deltas to local DB
   - Configurable poll interval (default 60s)
5. **Offline mutation queue:**
   - Queue write operations when offline
   - Replay queue on reconnect with conflict detection
   - Conflict resolution: last-write-wins with user notification on conflicts
6. **Multi-user data isolation:**
   - Separate SQLite database file per authenticated user (keyed by `idMember`)
   - Database path: `{app_data_dir}/{idMember}/trello.db`

### Non-Functional
1. SQLite in WAL mode for concurrent reads
2. All DB operations must be transactional
3. Sync must not block UI thread
4. Initial sync of a 1,000-card board must complete in < 30 seconds

## Impacted Files

| File / Module | Change Type | Notes |
|---|---|---|
| `src/db/schema.sql` | create | SQLite CREATE TABLE statements |
| `src/db/migrations/` | create | Versioned migration files |
| `src/db/connection.ts` | create | DB connection manager (per-user) |
| `src/sync/engine.ts` | create | Orchestrates initial + incremental sync |
| `src/sync/poller.ts` | create | Periodic action polling |
| `src/sync/queue.ts` | create | Offline mutation queue |
| `src/sync/conflict.ts` | create | Conflict detection and resolution |
| `tests/unit_tests/sync-engine.test.ts` | create | Sync logic tests |
| `tests/unit_tests/db-schema.test.ts` | create | Schema validation tests |

## Constraints

- Must work with `better-sqlite3` (Node.js) and Tauri's SQLite plugin (production)
- Schema must match Trello's data model closely but allow local-only metadata columns
- Polling must respect rate limits — budget ~20% of capacity for sync, reserve 80% for user operations
- Do not attempt to sync board preferences/settings that the user cannot modify

## Success Criteria

1. Schema creates all tables without errors
2. Initial sync of a test board populates all entity tables correctly
3. Incremental sync detects and applies new actions
4. Offline mutations queue correctly and replay on reconnect
5. Two different user databases are fully isolated (no data leakage)
6. Existing 46 API tests still pass

## Out of Scope

- Webhook-based sync (future enhancement — requires relay server)
- Custom field sync (deferred until custom fields are needed)
- Attachment file caching (store metadata only, not files)
