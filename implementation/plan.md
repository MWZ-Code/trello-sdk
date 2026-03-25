# Trello API — Implementation Plan

## Overview

This is the top-level implementation plan for the Trello API desktop application. The project follows a phased roadmap, each phase building on validated work from the previous one.

## Status

| Phase | Description | Status | PRD |
|-------|-------------|--------|-----|
| 1A | Trello API Research | **Complete** | — |
| 1B | API Endpoint Validation (Test Suite) | **Complete** | [prds/01-api-test-suite.md](prds/01-api-test-suite.md) |
| 2 | Trello REST API Client | **Complete** | [prds/02-api-client.md](prds/02-api-client.md) |
| 3 | Local SQLite Database & Sync Engine | **Complete** | [prds/03-sqlite-sync-engine.md](prds/03-sqlite-sync-engine.md) |
| 4 | Board Rule Schema & Enforcement | Planned | [prds/04-board-rule-schema.md](prds/04-board-rule-schema.md) |
| 5 | Role-Based Access Control | Planned | [prds/05-rbac.md](prds/05-rbac.md) |
| 6 | Work Documentation & Evidence Linking | Planned | [prds/06-work-documentation.md](prds/06-work-documentation.md) |
| 7 | Tauri Desktop Application Shell | Planned | [prds/07-tauri-app-shell.md](prds/07-tauri-app-shell.md) |
| 8 | Agentic UX | Planned | [prds/08-agentic-ux.md](prds/08-agentic-ux.md) |

## Architecture

```
┌─────────────────────────────────────────┐
│            Tauri Desktop App            │
│  ┌─────────────┐  ┌──────────────────┐  │
│  │  React UI   │  │  Agent Interface │  │
│  │  (webview)  │  │  (Phase 8)       │  │
│  └──────┬──────┘  └────────┬─────────┘  │
│         │                  │            │
│  ┌──────┴──────────────────┴─────────┐  │
│  │     TypeScript API Layer          │  │
│  │  trello.js client + sync engine   │  │
│  └──────┬────────────────────────────┘  │
│         │                               │
│  ┌──────┴──────────────────────────┐    │
│  │   Rust Backend (Tauri)          │    │
│  │  SQLite DB │ Keyring │ RBAC     │    │
│  │  Board Rules │ Evidence Links   │    │
│  └─────────────────────────────────┘    │
└─────────────────────────────────────────┘
          │
          ▼
   Trello REST API
```

## Key Decisions

- **API Client:** `trello.js` (TypeScript, ~100% API coverage, actively maintained)
- **Desktop Engine:** Tauri (Rust backend + web frontend)
- **Local Database:** SQLite (WAL mode, per-user isolation)
- **Auth:** OAuth 1.0a now, OAuth 2.0 w/ PKCE when available
- **Token Storage:** `tauri-plugin-keyring` (OS-level secure storage)
- **Sync Strategy:** Hybrid — webhook relay for real-time + polling fallback
- **UI:** Custom-built (React + Tailwind), not embedded Trello UI (blocked by CSP/ToS)
- **Board Rules:** Local engine (Butler has no API access)

## Research Artifacts

All research documents are in `/research/`:
- `authentication.md` — Auth methods, SSO, token lifecycle, secure storage
- `rest-api-endpoints.md` — 80+ endpoints, rate limits, webhook vs polling analysis
- `data-models.md` — 13 entities, proposed SQLite schema, sync strategy
- `sdks-and-libraries.md` — Library comparison, recommendation for trello.js
- `powerups-and-embedding.md` — Embedding not viable, UI must be rebuilt
