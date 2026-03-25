# PRD 03: Local SQLite Database & Sync Engine

**Status:** In Progress
**Depends on:** PRD 02 (API client with error normalization)

## Problem Description

The application needs a local SQLite database that mirrors the user's Trello boards for offline-first operation. A sync engine must keep the local cache consistent with Trello's server state via state reconciliation (Approach B).

## Design Decisions

### Sync Strategy: State Reconciliation (Approach B)
- **No action replay** — we never try to "replay" Trello actions as mutations
- Sync fetches current entity state and upserts into local DB
- Upserts are inherently idempotent — same data written twice is a no-op
- Full resync from genesis uses the same code path as incremental sync

### Version Resolution
- **Cards & Boards** (have `dateLastActivity`): upsert only if incoming `dateLastActivity >= local dateLastActivity`
- **All other entities** (lists, labels, checklists, members): incoming sync is always authoritative. Any stale write gets corrected on the next sync cycle (60s).

### Board Selection
- Automated: sync all non-closed boards the user has access to
- Closed boards are not synced but existing local data is preserved (soft-close)

### Deletion Handling
- Soft-delete: set `deleted_at` timestamp, never hard-delete

### Multi-User Isolation
- Separate SQLite DB file per user (keyed by `idMember`)
- Trusted-host model — no encryption needed

### What's Deferred
- Offline mutation queue (skip for now — all writes go directly to Trello API)
- Webhook-based sync (requires relay server)
- Custom field sync
- Attachment file caching (metadata only)

## Requirements

### Functional
1. **SQLite schema** implementing core entities:
   - boards, lists, cards, members, labels
   - checklists, check_items
   - Join tables: card_members, card_labels, board_members
   - `sync_meta` — per-board sync state (last_synced, last_activity)
2. **Database connection manager:**
   - Per-user DB files at `{dataDir}/{idMember}/trello.db`
   - WAL mode enabled on connection
   - Schema auto-migration on open
3. **Initial sync:**
   - Fetch all non-closed boards for the user
   - For each board: fetch full state using nested resources (1-5 API calls)
   - Upsert all entities into local DB
4. **Incremental sync (polling):**
   - Configurable interval (default 60s)
   - For each synced board: re-fetch current state
   - Upsert with version resolution (dateLastActivity for cards/boards, authoritative for others)
   - Update `sync_meta` after each board sync
5. **Soft-delete support:**
   - All entity tables have `deleted_at` column
   - Entities missing from Trello response are marked as soft-deleted
   - Queries filter on `deleted_at IS NULL` by default

### Non-Functional
1. SQLite in WAL mode for concurrent reads
2. All sync operations wrapped in transactions
3. Initial sync of a 1,000-card board must complete in < 30 seconds

## Impacted Files

| File / Module | Change Type | Notes |
|---|---|---|
| `src/db/schema.ts` | create | Schema definition + migration |
| `src/db/connection.ts` | create | DB connection manager (per-user) |
| `src/db/repository.ts` | create | CRUD operations on local DB |
| `src/sync/engine.ts` | create | Orchestrates initial + incremental sync |
| `src/sync/poller.ts` | create | Periodic sync with configurable interval |
| `tests/unit_tests/db-schema.test.ts` | create | Schema + repository tests |
| `tests/unit_tests/sync-engine.test.ts` | create | Sync logic tests (against live API) |

## Success Criteria

1. Schema creates all tables without errors
2. Initial sync of a real board populates all entity tables correctly
3. Incremental sync upserts are idempotent — running sync twice produces identical DB state
4. Full resync from empty DB produces same state as incremental sync
5. Cards/boards with newer local `dateLastActivity` are not overwritten by stale sync
6. Entities removed from Trello are soft-deleted locally
7. Existing 68 API tests still pass
