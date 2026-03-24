# Trello API — Project Scope

## Vision

A lightweight Tauri-based desktop application that maintains a local SQLite database synced with the user's Trello boards. Part of a broader agentic tooling ecosystem for time/resource management, task cost estimation accuracy, and work documentation.

## Architecture Decisions

- **Desktop engine:** Tauri (Rust backend + web frontend)
- **Local database:** SQLite (revisable based on auth/data model research)
- **Sync target:** Any board the authenticated user has access to, including organization/workspace boards

## Multi-User Considerations

- Application may support multiple users on the same machine via SSO-based auth
- If multi-user: strict data partitioning in the local DB so users cannot see each other's cached information
- Database access must be guarded per-user session

## Phased Roadmap

### Phase 1 — Trello API Integration
Develop and validate Trello REST API client for full CRUD operations on boards, lists, cards, and related entities. Evaluate webhook vs poll-based sync strategies with rate limit constraints in mind.

### Phase 2 — Board Rule Schema
Define a schema for board-specific rules that the tool enforces when committing changes. The tool must conform to each board's unique rulesets (e.g., required fields, allowed transitions, label constraints).

### Phase 3 — Role-Based Access Control
Implement RBAC so different users have privileged access to different features/boards within the desktop application.

### Phase 4 — Work Documentation & Evidence Linking
Tag completed tasks with evidence of work (GitHub commit links, PR references, time logs). Provide visibility into where time and resources are actually spent vs estimated.

### Phase 5 — Agentic UX
Develop an agent-driven interface for updating and populating boards — natural language commands, smart suggestions, automated workflows.

## Integration Scope

- **REST API:** Primary integration path for CRUD and sync
- **Power-Ups:** Research for potential UI embedding, not for building a Trello plugin
- **Webhooks:** Evaluate for real-time sync (subject to rate limit feasibility)
- **UI Embedding:** Goal is to embed/replicate Trello's UI patterns locally, configured within the desktop app but respecting Trello's data model

## Key Constraints

- Rate limits must be respected — sync strategy must be practical under Trello's throttling
- Local-first: the app should work offline with cached data and sync when connected
- Security: API tokens/keys must be stored securely per-user
