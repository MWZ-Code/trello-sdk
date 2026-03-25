# PRD 04: Board Rule Schema & Enforcement

**Status:** Planned
**Depends on:** PRD 03 (SQLite database with synced board data)

## Problem Description

Different Trello boards have different workflows, required fields, and constraints. The tool must conform to each board's unique rulesets when committing changes — e.g., a board might require all cards to have a due date, restrict which lists a card can move to, or enforce label conventions.

Since Butler automation rules have no API access (confirmed in research), the application must define and enforce its own rule schema locally.

## Current State

- Butler rules cannot be read or managed via the Trello API
- Board preferences (permissionLevel, voting, comments, cardAging) are readable via API
- No rule schema or enforcement engine exists
- Boards may have implicit conventions that are not machine-readable

## Requirements

### Functional
1. **Rule schema** supporting these rule types:
   - **Required fields:** Card must have name, description, due date, labels, assigned members, etc.
   - **Allowed transitions:** Card can only move from list A → list B (e.g., "To Do" → "In Progress" → "Done")
   - **Label constraints:** Cards in certain lists must have specific labels
   - **Member constraints:** Cards must be assigned to at least N members
   - **Naming conventions:** Card/list names must match a regex pattern
   - **Custom field requirements:** Specific custom fields must be populated
2. **Rule storage:** JSON-based rules stored per-board in SQLite
3. **Rule editor:** API/interface to create, update, and delete rules for a board
4. **Enforcement engine:**
   - Validate any pending mutation against the board's rules before committing to Trello
   - Return clear validation errors with the specific rule that was violated
   - Support "warn" vs "block" severity — warnings allow the mutation with a flag, blocks prevent it
5. **Rule templates:** Pre-built rule sets for common workflows (Kanban, Scrum, etc.)

### Non-Functional
1. Rule evaluation must be < 10ms per mutation (no network calls)
2. Rules are local-only — they do not modify the Trello board itself
3. Rules must be exportable/importable as JSON for sharing between users

## Impacted Files

| File / Module | Change Type | Notes |
|---|---|---|
| `src/rules/schema.ts` | create | Rule type definitions and JSON schema |
| `src/rules/engine.ts` | create | Rule evaluation engine |
| `src/rules/validator.ts` | create | Per-rule-type validation functions |
| `src/rules/templates.ts` | create | Pre-built rule templates |
| `src/db/schema.sql` | modify | Add `board_rules` table |
| `tests/unit_tests/rules-engine.test.ts` | create | Rule evaluation tests |

## Constraints

- Rules must not require network access to evaluate
- Rule schema must be extensible for future rule types without migrations
- Rules are per-board, not global — different boards can have different rules
- The engine validates mutations, it does not auto-fix them

## Success Criteria

1. Rule schema supports all 6 rule types listed above
2. Engine correctly blocks invalid mutations and passes valid ones
3. Validation errors clearly identify which rule was violated and why
4. Rule templates can be applied to a board in one operation
5. Rules are persisted in SQLite and survive app restart
6. Evaluation performance: < 10ms per mutation (benchmark test)

## Out of Scope

- Butler rule synchronization (no API access)
- Auto-fixing invalid mutations (user must fix manually)
- Rule enforcement on incoming sync data (rules apply to outgoing mutations only)
