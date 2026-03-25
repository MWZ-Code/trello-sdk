# PRD 05: Role-Based Access Control

**Status:** Planned
**Depends on:** PRD 03 (multi-user database isolation), PRD 04 (board rules)

## Problem Description

The application may support multiple users on the same machine via SSO-based auth. Different users need different levels of access to features and boards within the desktop application. This goes beyond Trello's own permission model — it adds application-level access control.

## Current State

- Trello board membership types: admin, normal, observer
- Auth research confirms each token is bound to a single `idMember`
- Database isolation uses separate SQLite files per user
- No application-level RBAC exists

## Requirements

### Functional
1. **Role definitions:**
   - `admin` — Full access: all boards, rule management, user management
   - `editor` — Read/write access to assigned boards, cannot manage rules or users
   - `viewer` — Read-only access to assigned boards
   - Custom roles with granular permissions (extensible)
2. **Permission model:**
   - Board-level: which boards a user can access
   - Feature-level: which features a user can use (sync, edit, rules, evidence linking)
   - Operation-level: CRUD granularity (can read but not write)
3. **Permission enforcement:**
   - Check permissions before every API call and local DB mutation
   - Return clear "access denied" errors with the required permission
4. **User management:**
   - Admins can assign roles and board access to other users
   - Role assignments are stored locally (not pushed to Trello)
5. **Trello permission mapping:**
   - Import Trello board membership types as a baseline
   - Application roles can be more restrictive than Trello roles (never more permissive)

### Non-Functional
1. Permission checks must be < 1ms (cached in memory)
2. Role changes take effect immediately without app restart
3. Failed permission checks must be logged for audit

## Impacted Files

| File / Module | Change Type | Notes |
|---|---|---|
| `src/auth/rbac.ts` | create | Role definitions and permission checks |
| `src/auth/permissions.ts` | create | Permission constants and types |
| `src/auth/session.ts` | create | User session management |
| `src/db/schema.sql` | modify | Add `roles`, `user_roles`, `board_permissions` tables |
| `src/api/client.ts` | modify | Add permission check middleware |
| `tests/unit_tests/rbac.test.ts` | create | Permission evaluation tests |

## Constraints

- Application cannot grant more access than the user has on Trello
- Role data is local-only — not synced to Trello
- Must work even when Trello is unreachable (cached permissions)
- Do not implement authentication in this PRD — only authorization

## Success Criteria

1. Admin can assign roles and board access to users
2. Editor can read/write assigned boards but cannot manage rules
3. Viewer can only read assigned boards
4. Unauthorized operations are blocked with clear error messages
5. Trello membership types are correctly imported as baseline permissions
6. Permission checks add negligible latency (< 1ms benchmark)

## Out of Scope

- Authentication/login flow (depends on Tauri app shell)
- SSO integration (separate PRD when Tauri app exists)
- Permission UI (depends on Tauri app shell)
