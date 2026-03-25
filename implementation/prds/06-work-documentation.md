# PRD 06: Work Documentation & Evidence Linking

**Status:** Planned
**Depends on:** PRD 03 (synced database), PRD 04 (board rules for validation)

## Problem Description

Completed tasks need to be tagged with evidence of work done — GitHub commit links, PR references, time logs, and other artifacts. This provides visibility into where time and resources are actually spent versus estimated, and creates an auditable record of task completion.

## Current State

- Cards can have attachments (URLs) and comments via the Trello API
- No structured evidence linking exists
- No time tracking integration
- Custom fields can store metadata but are limited to 50 per board

## Requirements

### Functional
1. **Evidence types:**
   - GitHub commit links (parsed to extract repo, SHA, message)
   - GitHub PR references (parsed to extract repo, PR number, status)
   - Time log entries (start time, end time, duration, description)
   - Arbitrary URL references with metadata
   - Free-text notes
2. **Evidence storage:**
   - Stored locally in SQLite with references to card IDs
   - Optionally pushed to Trello as card comments or attachments (user-configurable)
3. **Evidence capture:**
   - Manual entry via API/UI
   - Auto-capture from Git hooks (commit message references card ID)
   - Auto-capture from GitHub webhook (PR references card ID)
4. **Cost estimation tracking:**
   - Associate estimated effort (points, hours) with a card
   - Track actual effort via time logs
   - Calculate estimation accuracy: actual/estimated ratio
   - Aggregate accuracy metrics per board, per member, per time period
5. **Reporting:**
   - Per-card: all evidence + time spent vs estimated
   - Per-board: completion rate, estimation accuracy, effort distribution
   - Per-member: tasks completed, time logged, estimation accuracy

### Non-Functional
1. Evidence linking must not slow down card sync
2. GitHub integration must handle rate limits gracefully
3. Time log precision: 1-minute granularity
4. All evidence data must be exportable as CSV/JSON

## Impacted Files

| File / Module | Change Type | Notes |
|---|---|---|
| `src/evidence/types.ts` | create | Evidence type definitions |
| `src/evidence/store.ts` | create | Evidence CRUD in SQLite |
| `src/evidence/github.ts` | create | GitHub commit/PR parsing and validation |
| `src/evidence/timelog.ts` | create | Time logging logic |
| `src/evidence/metrics.ts` | create | Estimation accuracy calculations |
| `src/evidence/export.ts` | create | CSV/JSON export |
| `src/db/schema.sql` | modify | Add `evidence`, `time_logs`, `estimates` tables |
| `tests/unit_tests/evidence.test.ts` | create | Evidence CRUD + metrics tests |

## Constraints

- Evidence data is local-first — Trello sync is optional and one-way (push only)
- Do not require GitHub authentication for basic commit link parsing
- Time logs are manual — no automatic time tracking (too invasive)
- Estimation fields use the same units across a board (hours or points, not mixed)

## Success Criteria

1. Evidence can be linked to any card with type-specific metadata
2. GitHub commit/PR links are parsed and validated correctly
3. Time logs record accurate durations
4. Estimation accuracy metrics are calculated correctly (within 1% tolerance)
5. Reports aggregate data correctly per card, board, and member
6. CSV/JSON export includes all evidence and metrics

## Out of Scope

- Automatic time tracking (e.g., tracking active window)
- GitHub OAuth integration (use public API for commit/PR validation)
- Jira/other tool integration
- Invoicing or billing features
