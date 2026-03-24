# Trello API SDKs & Client Libraries Research

> **Date:** 2026-03-24
> **Context:** Evaluating options for a Tauri desktop app (Rust backend + TypeScript/JS frontend)

---

## Table of Contents

1. [Official Trello Client Libraries](#1-official-trello-client-libraries)
2. [JavaScript/TypeScript Libraries](#2-javascripttypescript-libraries)
3. [Rust Libraries](#3-rust-libraries)
4. [Python Libraries](#4-python-libraries)
5. [Atlassian Platform SDKs](#5-atlassian-platform-sdks-forge--connect)
6. [client.js (Trello Browser SDK)](#6-clientjs-trello-browser-sdk)
7. [Code Generation from OpenAPI](#7-code-generation-from-openapi)
8. [Recommendation](#8-recommendation)
9. [Sources](#9-sources)

---

## 1. Official Trello Client Libraries

**Trello/Atlassian does not publish official SDK client libraries for any language.** The official developer resources are:

- **REST API documentation** at [developer.atlassian.com/cloud/trello/rest](https://developer.atlassian.com/cloud/trello/rest/)
- **client.js** -- a lightweight browser-only JavaScript wrapper (see Section 6)
- **Power-Up REST API client** -- a thin helper for Power-Up iframe contexts only
- **OpenAPI 3.0 spec** at `https://developer.atlassian.com/cloud/trello/swagger.v3.json`
- **Postman collection** at `/cloud/trello/trello.postman.json`

All community libraries are third-party and unofficial.

---

## 2. JavaScript/TypeScript Libraries

### Comparison Table

| Package | Version | Weekly Downloads | Last Published | TypeScript | Auth Handling | API Coverage | Maintenance |
|---------|---------|-----------------|----------------|------------|---------------|-------------|-------------|
| **[trello.js](https://www.npmjs.com/package/trello.js)** | 1.2.8 | ~4,778 | Apr 2025 | Native (written in TS) | API key + token | ~100% (18 resource groups) | Active |
| **[trello](https://www.npmjs.com/package/trello)** | 0.11.0 | ~1,353 | Nov 2021 | None (no @types) | API key + token | Partial (common endpoints) | Inactive |
| **[node-trello](https://www.npmjs.com/package/node-trello)** | 1.3.0 | ~953 | Aug 2017 | None | API key + token via OAuth lib | Thin wrapper (any endpoint) | Abandoned |
| **[trello-node-api](https://www.npmjs.com/package/trello-node-api)** | 0.0.9 | ~527 | Feb 2020 | None | API key + token | Partial | Inactive |

*Download data as of week ending 2026-03-22 from npm registry API.*

### Detailed Assessment

#### trello.js (Recommended)

- **Repository:** [github.com/MrRefactoring/trello.js](https://github.com/MrRefactoring/trello.js) (21 stars, 8 forks)
- **Language:** 100% TypeScript with full type definitions included
- **Dependencies:** axios, form-data, tslib (modern, minimal)
- **API coverage:** All 18 resource groups: actions, applications, batch, boards, cards, checklists, customFields, emoji, enterprises, labels, lists, members, notifications, organizations, plugins, search, tokens, webhooks
- **Architecture:** Client-based pattern -- `client.boards.getBoard({id})` with camelCase methods
- **Tree-shakeable:** Supports selective imports to reduce bundle size
- **Auth:** Constructor accepts `{ key, token }` configuration
- **Browser + Node:** Works in both environments

**Pros:**
- Actively maintained (last release Apr 2025)
- Full TypeScript types out of the box
- Near-complete API coverage with structured method grouping
- Modern dependency chain (axios-based)

**Cons:**
- Relatively small community (21 GitHub stars)
- 6 open issues on GitHub
- Single maintainer (bus factor = 1)

#### trello (norberteder)

- **Repository:** [github.com/norberteder/trello](https://github.com/norberteder/trello) (~317 stars, 252 forks)
- **No TypeScript types** -- open issue since 2018, never resolved
- **Dependencies:** es6-promise, restler, object-assign (outdated deps; `restler` is unmaintained)
- **Coverage:** Common operations on boards, cards, lists; not comprehensive
- **Auth:** Constructor takes `(appKey, userToken)`

**Pros:**
- Largest community among Trello npm packages
- Simple, easy-to-understand API

**Cons:**
- Last published Nov 2021 -- effectively unmaintained
- Uses deprecated `restler` HTTP library
- No TypeScript support
- Partial API coverage

#### node-trello

- **Repository:** [github.com/adunkman/node-trello](https://github.com/adunkman/node-trello)
- **Last published 2017** -- abandoned
- **Dependencies:** oauth, request (both deprecated)
- **Design:** Thin wrapper -- `trello.get("/1/boards/...", callback)` -- you construct paths manually

**Verdict:** Not viable for new projects. Deprecated dependencies and no maintenance.

#### trello-node-api

- **Last published 2020** -- inactive
- **Dependencies:** bluebird, lodash (heavy for a REST wrapper)
- **No TypeScript support**

**Verdict:** Not recommended.

---

## 3. Rust Libraries

### Comparison Table

| Crate | Version | Total Downloads | Last Published | License | Status |
|-------|---------|----------------|----------------|---------|--------|
| **[trello-rs](https://crates.io/crates/trello-rs)** | 1.23.0 | 37,147 | May 2020 | GPL-3.0 | Inactive (CLI tool) |
| **[trello](https://crates.io/crates/trello)** | 0.1.7 | 8,956 | Feb 2016 | MIT | Abandoned |

### Assessment

#### trello-rs

- **Repository:** [github.com/MichaelAquilina/trello-rs](https://github.com/MichaelAquilina/trello-rs)
- **Purpose:** CLI tool first, library second. The binary is called `tro`.
- **Size:** 1,390 lines of Rust across 15 files
- **License concern:** GPL-3.0 -- this is a copyleft license which may impose restrictions on proprietary applications
- **Last updated:** May 2020 -- 6 years without updates
- **API coverage:** Limited to what the CLI needs (boards, lists, cards)

**Verdict:** Not suitable as an SDK dependency. GPL license is restrictive, it's designed as a CLI not a library, and it's unmaintained.

#### trello (lipanski)

- **Self-described as "work in progress"** since 2016
- **223 lines of Rust** -- barely a skeleton
- **Last updated:** February 2016 -- a decade old

**Verdict:** Not viable.

### What a Custom Rust Client Would Need

If building a Rust Trello API client for the Tauri backend:

1. **HTTP client:** `reqwest` (async, well-maintained, Tauri already depends on it)
2. **Serialization:** `serde` + `serde_json` for request/response types
3. **Auth:** Append `key` and `token` query parameters to every request
4. **Rate limiting:** Trello enforces rate limits (exact numbers unpublished, but reported as ~100 requests per 10s per token)
5. **Error handling:** Map HTTP status codes to typed errors
6. **Type definitions:** Structs for Board, Card, List, Member, Label, Checklist, etc.
7. **Endpoint coverage:** At minimum: boards (CRUD), lists (CRUD), cards (CRUD + move/archive), labels, members, checklists, search

Estimated effort: 2-4 days for a typed client covering core endpoints, potentially accelerated by generating structs from the OpenAPI spec.

---

## 4. Python Libraries

### Comparison Table

| Package | Version | Last Published | Stars | Status |
|---------|---------|----------------|-------|--------|
| **[py-trello](https://pypi.org/project/py-trello/)** | 0.20.1 | Jun 2024 | ~956 | Inactive |
| **[trello](https://pypi.org/project/trello/)** | (latest) | -- | -- | Minimal wrapper |
| **[trello-sdk](https://pypi.org/project/trello-sdk/)** | 1.0.0 | Aug 2025 | -- | New; covers all endpoints |

### Key Notes

- **py-trello** has the largest community (956 GitHub stars) but is marked as inactive by package health analyzers. It provides ORM-style Python objects for Trello entities (Board, Card, List, etc.) using `requests` + OAuth.
- **trello-sdk** is newer (Aug 2025) and claims coverage of all REST endpoints. Worth evaluating if Python scripting is needed for tooling.
- Python libraries are not directly relevant to the Tauri app but may be useful for migration scripts, data import/export tools, or CI/CD automation.

---

## 5. Atlassian Platform SDKs (Forge & Connect)

### Atlassian Forge

- **Purpose:** Building cloud apps that run on Atlassian's infrastructure for Jira and Confluence
- **Runtime:** Serverless JavaScript functions hosted by Atlassian
- **Trello support:** Forge does not support Trello -- it targets Jira and Confluence only
- **Verdict:** **Not relevant** for a Trello desktop app

### Atlassian Connect

- **Purpose:** Building add-ons/integrations that extend Atlassian cloud products
- **Architecture:** Web apps that run on your own infrastructure and integrate via iframes/webhooks
- **Trello support:** Trello Power-Ups are a variant of Connect, but the Connect framework is designed for web-hosted extensions, not desktop apps
- **Verdict:** **Not relevant** for a Tauri desktop app consuming the REST API

### Summary

Neither Forge nor Connect is appropriate for a standalone desktop application. They are designed for building extensions that run within Atlassian products, not standalone API consumers. The correct approach is to use the Trello REST API directly with API key + token authentication.

---

## 6. client.js (Trello Browser SDK)

### Overview

`client.js` is Trello's first-party browser JavaScript library, loaded via:

```html
<script src="https://api.trello.com/1/client.js?key={APIKey}"></script>
```

**Requires jQuery** as a dependency (loaded before client.js).

### API Surface

| Category | Methods |
|----------|---------|
| **Auth** | `Trello.authorize(opts)` -- popup or redirect OAuth flow |
| **REST** | `Trello.rest(method, path, params, success, error)` |
| **HTTP shortcuts** | `Trello.get()`, `Trello.post()`, `Trello.put()`, `Trello.delete()` |
| **Resource shortcuts** | `Trello.boards.get()`, `Trello.cards.get()`, `Trello.lists.get()`, `Trello.members.get()`, `Trello.organizations.get()`, `Trello.actions.get()`, `Trello.checklists.get()` |
| **UI** | `Trello.addCard(options)` -- opens card creation popup |

### authorize() Options

| Parameter | Default | Description |
|-----------|---------|-------------|
| `type` | -- | `"popup"` or `"redirect"` |
| `name` | -- | App name shown during consent |
| `persist` | `true` | Save token to localStorage |
| `scope` | `{read:true, write:false, account:false}` | Permission scope |
| `expiration` | `"30days"` | `"1hour"`, `"1day"`, `"30days"`, `"never"` |
| `success` | -- | Callback on success |
| `error` | -- | Callback on failure |

### Viability in Tauri Webview

**Partially usable but not recommended:**

- **Auth flow works** -- `Trello.authorize({type: 'popup'})` opens a browser popup which works in Tauri's webview context
- **jQuery dependency** is a significant drawback for a modern TypeScript frontend
- **Callback-based API** -- no Promises, no async/await
- **No TypeScript types**
- **No tree-shaking** -- monolithic script loaded from CDN
- **Token storage** -- uses localStorage, which is fine in Tauri
- **CORS** -- Trello's API supports CORS, so direct browser requests work

**Better alternative:** Use `trello.js` or a custom fetch-based client in the frontend, which provides TypeScript types, Promise-based API, and no jQuery dependency.

---

## 7. Code Generation from OpenAPI

### Available Spec

Atlassian publishes an official OpenAPI 3.0 spec:

```
https://developer.atlassian.com/cloud/trello/swagger.v3.json
```

### Spec Quality Assessment

| Aspect | Status |
|--------|--------|
| OpenAPI version | 3.0.0 |
| Endpoint count | ~80+ paths |
| Response schemas | **Incomplete** -- many return "Success" without body schemas |
| Parameter types | Some use `oneOf` with mixed types (string/number) |
| Deprecated endpoints | Marked but without migration guidance |
| Validation | Known issues with duplicate `operationId` values |
| Completeness | Appears truncated; may not cover all endpoints |

### Code Generation Tools

| Tool | TypeScript Output | Rust Output | Quality |
|------|-------------------|-------------|---------|
| **[openapi-generator](https://github.com/OpenAPITools/openapi-generator)** | typescript-axios, typescript-fetch | rust (reqwest) | Mature; handles spec issues tolerably |
| **[swagger-typescript-api](https://github.com/acacode/swagger-typescript-api)** | fetch or axios client | N/A | Good TS output, single-file client |
| **[openapi-typescript](https://github.com/drwpow/openapi-typescript)** | Types only (no runtime) | N/A | Best for types-only approach |

### Feasibility Assessment

**TypeScript generation: Feasible with caveats.**
- The spec's missing response schemas mean generated types will be incomplete (`any` or `unknown` for many responses)
- Duplicate `operationId` values require pre-processing or manual fixes
- Best used as a starting point, then manually refined

**Rust generation: Possible but low-quality output.**
- `openapi-generator` has a Rust generator but the output often needs significant manual cleanup
- Missing response schemas make the generated Rust structs incomplete
- Better to generate types from the spec and hand-write the client logic

**Hybrid approach (recommended):**
1. Use `openapi-typescript` to generate TypeScript types from the spec
2. Manually supplement with types from `trello.js` source (which is 100% TypeScript)
3. Hand-write the actual HTTP client layer

---

## 8. Recommendation

### Architecture Decision

For a Tauri app (Rust backend + TypeScript frontend), the API client should live in the **TypeScript frontend layer** for the following reasons:

1. **Trello's auth flow** requires browser interaction (popup/redirect) which is naturally handled in the webview
2. **No viable Rust crate exists** -- building a Rust client from scratch is effort that doesn't add value since the frontend can make HTTP calls directly
3. **Token management** via localStorage in the webview is the standard Trello pattern
4. **UI responsiveness** -- the frontend can make API calls and update UI without IPC round-trips to Rust

The Rust backend should handle: local database, caching, offline support, and any compute-heavy operations.

### Recommended Approach: Use trello.js with a thin wrapper

**Primary choice: [trello.js](https://www.npmjs.com/package/trello.js)**

| Criterion | Assessment |
|-----------|------------|
| TypeScript support | Native -- written in TypeScript |
| API coverage | ~100% of Trello REST API |
| Maintenance | Active (last release Apr 2025) |
| Bundle size | Tree-shakeable |
| Dependencies | Modern (axios, minimal) |
| Weekly downloads | ~4,800 (largest in category) |
| Auth | Simple key+token config |

**Implementation plan:**

```typescript
import { TrelloClient } from 'trello.js';

const client = new TrelloClient({
  key: TRELLO_API_KEY,
  token: userToken, // obtained via OAuth flow
});

// Fully typed API calls
const board = await client.boards.getBoard({ id: boardId });
const cards = await client.cards.getCardsOnBoard({ id: boardId });
```

**For auth flow:** Implement a custom OAuth popup in the Tauri webview (not using client.js, which requires jQuery). Trello's `/1/authorize` endpoint can be opened in a popup window with:

```
https://trello.com/1/authorize?key={key}&name={appName}&scope=read,write&expiration=never&response_type=token
```

### Fallback: Hand-rolled thin client

If `trello.js` becomes unmaintained (single maintainer risk), a hand-rolled client is straightforward:

```typescript
class TrelloAPI {
  constructor(private key: string, private token: string) {}

  private async request<T>(method: string, path: string, params?: Record<string, string>): Promise<T> {
    const url = new URL(`https://api.trello.com/1${path}`);
    url.searchParams.set('key', this.key);
    url.searchParams.set('token', this.token);
    // ... fetch with params
  }

  boards = {
    get: (id: string) => this.request<Board>('GET', `/boards/${id}`),
    // ...
  };
}
```

Type definitions can be sourced from `trello.js` source code or generated from the OpenAPI spec.

### What NOT to use

| Option | Reason to avoid |
|--------|----------------|
| client.js | jQuery dependency, callback-based, no TypeScript |
| `trello` (npm) | Unmaintained since 2021, uses deprecated `restler` |
| `node-trello` | Abandoned since 2017, deprecated dependencies |
| Rust crates | All abandoned, GPL license issues, incomplete |
| Forge/Connect SDKs | Not designed for standalone desktop apps |
| Pure code generation | Spec quality too low for reliable output |

---

## 9. Sources

### Official Documentation
- [Trello REST API Reference](https://developer.atlassian.com/cloud/trello/rest/)
- [Trello API Introduction](https://developer.atlassian.com/cloud/trello/guides/rest-api/api-introduction/)
- [Authorizing With Trello's REST API](https://developer.atlassian.com/cloud/trello/guides/rest-api/authorization/)
- [Getting Started with client.js](https://developer.atlassian.com/cloud/trello/guides/client-js/getting-started-with-client-js/)
- [client.js Reference](https://developer.atlassian.com/cloud/trello/guides/client-js/client-js-reference/)
- [Power-Up REST API Client](https://developer.atlassian.com/cloud/trello/power-ups/rest-api-client/)
- [Trello OpenAPI 3.0 Spec](https://developer.atlassian.com/cloud/trello/swagger.v3.json)

### npm Packages
- [trello.js on npm](https://www.npmjs.com/package/trello.js) -- 4,778 weekly downloads
- [trello on npm](https://www.npmjs.com/package/trello) -- 1,353 weekly downloads
- [node-trello on npm](https://www.npmjs.com/package/node-trello) -- 953 weekly downloads
- [trello-node-api on npm](https://www.npmjs.com/package/trello-node-api) -- 527 weekly downloads

### GitHub Repositories
- [MrRefactoring/trello.js](https://github.com/MrRefactoring/trello.js) -- TypeScript Trello client (21 stars)
- [norberteder/trello](https://github.com/norberteder/trello) -- Node.js Trello wrapper (~317 stars)
- [adunkman/node-trello](https://github.com/adunkman/node-trello) -- Node wrapper for Trello HTTP API
- [LxyFlorian/trello-api-client](https://github.com/LxyFlorian/trello-api-client) -- OpenAPI-generated client

### Rust Crates
- [trello-rs on crates.io](https://crates.io/crates/trello-rs) -- CLI tool (37K total downloads, last updated May 2020)
- [trello on crates.io](https://crates.io/crates/trello) -- WIP client (9K total downloads, last updated Feb 2016)

### Python Packages
- [py-trello on PyPI](https://pypi.org/project/py-trello/) -- Most popular Python wrapper (~956 GitHub stars)
- [trello-sdk on PyPI](https://pypi.org/project/trello-sdk/) -- Newer SDK (Aug 2025)

### Code Generation
- [APIs-guru unofficial OpenAPI specs](https://github.com/APIs-guru/unofficial_openapi_specs/blob/master/trello.com/1.0/swagger.yaml)
- [OpenAPI Generator](https://github.com/OpenAPITools/openapi-generator)
- [swagger-typescript-api](https://github.com/acacode/swagger-typescript-api)
- [Trello OpenAPI spec issues discussion](https://community.developer.atlassian.com/t/openapi-json-has-errors/71927)

### Atlassian Platform
- [Getting Started with Forge](https://developer.atlassian.com/platform/forge/getting-started/)
- [Trello TypeScript types on DefinitelyTyped](https://community.developer.atlassian.com/t/typescript-types-available/93087) (@types/trellopowerup)
