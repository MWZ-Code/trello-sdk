# Trello Power-Ups & UI Embedding Research

> Research date: 2026-03-24
> Purpose: Evaluate what can be embedded vs. what must be rebuilt for a standalone Tauri desktop app backed by synced SQLite.

---

## Table of Contents

1. [Power-Up Framework Overview](#1-power-up-framework-overview)
2. [Power-Up API Capabilities](#2-power-up-api-capabilities)
3. [Power-Up vs REST API](#3-power-up-vs-rest-api)
4. [Embedding Trello UI](#4-embedding-trello-ui)
5. [Trello UI Components and Replication](#5-trello-ui-components-and-replication)
6. [Atlassian Design System](#6-atlassian-design-system)
7. [Butler Automation Rules and API Access](#7-butler-automation-rules-and-api-access)
8. [Integration Patterns from Existing Tools](#8-integration-patterns-from-existing-tools)
9. [Recommendations for UI Strategy](#9-recommendations-for-ui-strategy)
10. [Sources](#10-sources)

---

## 1. Power-Up Framework Overview

### What Are Power-Ups?

Trello Power-Ups are web-based extensions that run inside iframes within the Trello web client. They communicate with Trello via a JavaScript client library and a set of declared "capabilities" -- hooks that let the Power-Up inject UI widgets at predefined extension points in the Trello interface.

### Architecture

- Power-Ups are hosted externally (developer's own infrastructure) and loaded into the Trello client via iframe.
- The entry point is a `connectorUrl` JavaScript file that calls `TrelloPowerUp.initialize()`, declaring capability handlers.
- Communication between the iframe and the Trello host page uses `postMessage`-based RPC via the Trello client library.
- Typical stack: TypeScript + React + Webpack; an ngrok tunnel is used during development to provide a public HTTPS URL.

### Key Limitations

| Limitation | Detail |
|---|---|
| **Browser-only** | Power-Ups only run while a user is in the Trello web client. No background execution. |
| **No webhooks** | Power-Ups do not have their own webhook mechanism; they rely on the REST API for that. |
| **Response time** | Trello waits ~1 second for a capability response, hard-stops at ~5 seconds. |
| **Sandboxed iframes** | Power-Up UI runs inside sandboxed iframes with limited access to the parent page. |
| **No offline** | Power-Ups are strictly online; no offline capability. |

### Relevance to This Project

Power-Ups are **not relevant** as a delivery mechanism for our project. We are building a standalone desktop app, not extending the Trello web UI. However, understanding their architecture confirms that Trello's UI extension model is tightly coupled to the Trello web client and cannot be repurposed externally.

---

## 2. Power-Up API Capabilities

The Power-Up framework exposes the following capability hooks:

### UI Extension Points

| Capability | What It Does |
|---|---|
| `board-buttons` | Adds buttons to the board header toolbar |
| `card-buttons` | Adds buttons to individual card views |
| `card-badges` | Displays small badges on card fronts (e.g., icons, counters) |
| `card-detail-badges` | Displays badges in the card detail (back) view |
| `card-back-section` | Injects a custom section into the card back view |
| `list-actions` | Adds menu items to list action menus |
| `list-sorters` | Enables custom sorting options for lists |

### Attachment Capabilities

| Capability | What It Does |
|---|---|
| `attachment-sections` | Groups/displays attachments in custom sections |
| `attachment-thumbnail` | Generates custom thumbnails for attachments |
| `save-attachment` | Handles saving attachments from Power-Up context |
| `card-from-url` | Creates cards from recognized URLs |
| `format-url` | Formats URLs for rich display |

### Settings and Auth

| Capability | What It Does |
|---|---|
| `show-settings` | Displays a settings panel for the Power-Up |
| `authorization-status` | Reports whether the user has authorized the Power-Up |
| `show-authorization` | Triggers the auth flow UI |

### Lifecycle

| Capability | What It Does |
|---|---|
| `on-enable` | Fired when the Power-Up is enabled on a board |
| `on-disable` | Fired when the Power-Up is disabled |
| `remove-data` | Handles cleanup when the Power-Up is removed |

### Data Storage

Power-Ups can store data scoped to board, card, or member via `t.set()` / `t.get()` with visibility `shared` (all users) or `private` (per user). This data store is limited and not suitable for complex schemas.

---

## 3. Power-Up vs REST API

| Aspect | Power-Up API | REST API |
|---|---|---|
| **Execution context** | Inside Trello web client (iframe) | Any HTTP client, any environment |
| **UI integration** | Direct injection into Trello UI via capabilities | No UI integration; data only |
| **Authentication** | OAuth token via Power-Up client library | API key + token as query params |
| **Webhooks** | Not available | Full webhook support for model changes |
| **Custom fields** | Read/write via REST API client within Power-Up | Full CRUD on custom fields |
| **Offline / background** | Not possible | Works independently of Trello UI |
| **Data storage** | Power-Up scoped key-value store | Full access to all Trello data models |
| **Rate limits** | N/A (runs client-side) | Points-based rate limiting (phased enforcement starting March 2026) |
| **Board automation (Butler)** | No access | No documented public endpoints for Butler rules |

### REST API -- Key Resources Available

The REST API provides full CRUD on:

- **Boards** -- settings, members, preferences, labels, lists
- **Lists** -- create, archive, move, reorder
- **Cards** -- all card fields, attachments, comments, checklists, custom field values, members, labels, due dates
- **Custom Fields** -- define fields (up to 50 per board), set values on cards
- **Actions** -- audit log of all changes (70+ action types; see Section 7)
- **Webhooks** -- register callbacks on any model (board, card, list, member, organization)
- **Search** -- query across boards, cards, members, organizations
- **Members / Organizations** -- user and workspace data

**For our project, the REST API is the primary integration surface.** It provides everything needed to sync board data into SQLite. The Power-Up API adds nothing for a standalone app.

---

## 4. Embedding Trello UI

### Official Embedding Support

Trello provides **one official embedding method**: a compact, non-interactive board preview.

```html
<blockquote class="trello-board-compact">
  <a href="https://trello.com/b/{boardId}">Board Name</a>
</blockquote>
<script src="https://p.trellocdn.com/embed.min.js"></script>
```

JavaScript control is available via:
- `window.TrelloBoards.load(document, { allAnchors: false })` -- scans DOM for boards to embed
- `window.TrelloBoards.create(boardId, el)` -- creates an embed from a board ID

### Restrictions

| Restriction | Detail |
|---|---|
| **Public boards only** | Private boards cannot be embedded. Attempting to access a private board URL returns 401. |
| **Non-interactive** | The embed is a read-only compact preview, not a functional board. |
| **No authentication pass-through** | There is no mechanism to authenticate an embedded view for private boards. |
| **`.html` iframe workaround** | Appending `.html` to a public board URL (e.g., `https://trello.com/b/{id}.html`) produces an interactive view, but only for public boards. |

### X-Frame-Options / CSP

Trello sets HTTP headers that prevent framing of the full Trello web application (`trello.com`) in arbitrary iframes. The `.html` suffix endpoint and the embed script are the only sanctioned framing paths, both limited to public boards.

### Technical Feasibility in Tauri Webview

| Approach | Feasibility | Issues |
|---|---|---|
| Embed public board via `.html` iframe | Partially works | Public only; non-interactive compact mode or limited interactive mode; user cannot authenticate |
| Embed full `trello.com` in iframe/webview | **Blocked** | X-Frame-Options / CSP headers prevent framing; Trello login flow will not work inside a nested webview |
| Load Trello in a separate Tauri webview window | Technically possible | Acts as a browser window; not integrated with app UI; user must log in manually; no data exchange with Rust backend |
| Relay architecture (local proxy) | Complex | Would require proxying Trello's entire frontend; likely violates ToS; fragile |

### Terms of Service Implications

The Trello Developer Terms (deprecated, now superseded by Atlassian Developer Terms effective Jan 2026) contain critical restrictions:

> "copy, frame or display any elements of the Trello Service through your Applications or use the APIs with Applications that **substantially replicate any features or functionality** of the Trello Service, except as expressly authorized by Trello in writing"
> -- Trello Developer Terms, Section on Restrictions

The updated Atlassian Developer Terms (Section 6) contain similar language:

> Section 6(f): You may not use the platform "to build a competitive product or offering, or with Marketplace Apps that substantially replicate any features or functionality of Atlassian Apps"

> Section 6(e): You cannot "copy, frame or display any elements of the Atlassian Apps through your Marketplace Apps"

**Key nuance**: These terms apply to "Marketplace Apps" -- applications distributed through the Atlassian Marketplace. A standalone desktop app that syncs via the REST API for personal/team productivity use occupies a gray area. The restriction on "substantially replicating" Trello is the most relevant concern. Building a local Kanban view that syncs with Trello is common practice among many third-party tools (Placker, etc.), but full UI cloning could attract scrutiny.

**Verdict: Embedding Trello's actual UI is not viable.** The combination of technical blocks (CSP, auth) and legal restrictions (ToS) makes embedding a dead end. The path forward is rebuilding the UI locally.

---

## 5. Trello UI Components and Replication

### Are Trello's UI Components Available?

**No.** Trello does not publish its UI components as a standalone library. The Trello frontend is a proprietary React application. There are no public npm packages for Trello-specific components (board view, card view, list view, etc.).

### Open-Source Kanban Libraries for Replication

Several mature React libraries can replicate Trello's core Kanban UI:

| Library | Status | Notes |
|---|---|---|
| **@dnd-kit/core** | Active, maintained | Modern drag-and-drop toolkit; recommended replacement for react-beautiful-dnd. Best choice for custom Kanban boards. |
| **@hello-pangea/dnd** | Active | Maintained fork of react-beautiful-dnd; drop-in replacement. |
| **react-trello** (rcdexta) | Unmaintained | Pluggable Trello-like board component; useful as reference but not production-ready. |
| **@asseinfo/react-kanban** | Deprecated | No longer maintained. |
| **Planka** | Active | Full open-source Kanban app (React); can be studied as architectural reference. |

### Recommended Stack for Tauri + Kanban UI

- **@dnd-kit/core + @dnd-kit/sortable** for drag-and-drop
- **Tailwind CSS + shadcn/ui** for component primitives
- **React** as the UI framework (Tauri supports React in its webview)

A well-documented reference implementation exists at [Georgegriff/react-dnd-kit-tailwind-shadcn-ui](https://github.com/Georgegriff/react-dnd-kit-tailwind-shadcn-ui) -- a drag-and-drop accessible Kanban board using exactly this stack.

---

## 6. Atlassian Design System

### Overview

Atlassian maintains a public design system at [atlassian.design](https://atlassian.design/) with:

- **Design tokens** (CSS custom properties) for colors, spacing, typography
- **Component library** (Atlaskit) published on npm under `@atlaskit/*`
- **Figma component library** (ADS Components) on Figma Community

### Available Components (npm)

Atlaskit packages include 100+ components across categories:
- Forms: Button, Checkbox, Select, Toggle, Text field, Date picker
- Layout: Box, Stack, Inline, Flex, Grid, Bleed
- Navigation: Breadcrumbs, Tabs, Side navigation, Menu
- Feedback: Banner, Flag, Modal dialog, Inline message
- Data: Dynamic table, Tag, Badge, Lozenge
- Drag and drop: **Pragmatic drag and drop** (Atlassian's own DnD library)

### Standalone Usage Feasibility

| Factor | Assessment |
|---|---|
| **Public npm packages** | Most `@atlaskit/*` packages are publicly available on npm |
| **Private dependencies** | Some packages have private `@atlassian/*` dependencies that cause install failures |
| **Theming** | Design tokens are CSS custom properties; usable standalone but designed to mirror Atlassian product themes |
| **Licensing** | Apache 2.0 for most packages, but usage in a "competitive product" could conflict with developer terms |
| **Trello-specific styling** | Atlaskit matches Jira/Confluence styling, not Trello's distinct visual language. Trello has its own color palette and design conventions. |

### Pragmatic Drag and Drop

Atlassian's [Pragmatic drag and drop](https://atlassian.design/components/pragmatic-drag-and-drop) is notable -- it is the DnD library used internally by Atlassian products (including Trello's newer interfaces). It is available as an npm package and could be used for building Kanban board interactions. However, for a Tauri app, `@dnd-kit` has a larger community and more Kanban-specific examples.

### Recommendation

**Do not use Atlaskit for this project.** The dependency issues, Jira-centric styling, and potential ToS conflicts make it a poor fit. Use Tailwind CSS + shadcn/ui + dnd-kit instead, which gives full control over styling and avoids any Atlassian IP concerns.

---

## 7. Butler Automation Rules and API Access

### What Butler Provides

Butler is Trello's built-in no-code automation engine. It supports:

| Automation Type | Description |
|---|---|
| **Rules** | Trigger + action(s); e.g., "when card moves to Done, archive it" |
| **Scheduled commands** | Run on a calendar schedule |
| **Due date commands** | Trigger relative to card due dates |
| **Card buttons** | User-invoked automation on individual cards |
| **Board buttons** | User-invoked automation at the board level |

Each automation can chain up to 20 actions. Triggers include card moves, label changes, checklist completions, member assignments, and more.

### Quotas

Butler quotas vary by Trello plan (Free: 250 command runs/month; Standard/Premium/Enterprise: higher limits).

### API Access to Butler Rules

**There is no documented public REST API endpoint for reading or managing Butler automation rules.** This is a significant gap.

- Butler rules are managed exclusively through the Trello web UI's automation builder.
- The REST API does not expose Butler rule definitions, triggers, or action configurations.
- No undocumented endpoints for Butler rule CRUD were found in community forums or developer discussions.
- The `byo-butler` project on GitHub demonstrates building Butler-equivalent functionality using the REST API + webhooks, confirming that Butler's internal rule engine is not exposed.

### Webhook Action Types Relevant to Automation

The REST API does expose **action types** that correspond to events Butler can trigger on. These are useful for building equivalent automation in our app:

**Included action types** (returned in API responses):
`addAttachmentToCard`, `addChecklistToCard`, `addMemberToBoard`, `addMemberToCard`, `commentCard`, `convertToCardFromCheckItem`, `createCard`, `createList`, `deleteCard`, `moveCardFromBoard`, `moveCardToBoard`, `moveListFromBoard`, `moveListToBoard`, `removeChecklistFromCard`, `removeMemberFromCard`, `updateBoard`, `updateCard`, `updateCheckItemStateOnCard`, `updateChecklist`, `updateList`, and ~30 more.

**Excluded action types** (webhook-only):
`addLabelToCard`, `removeLabelFromCard`, `createCheckItem`, `deleteCheckItem`, `updateCheckItem`, `createLabel`, `deleteLabel`, `updateLabel`, `deleteAttachmentFromCard`, `deleteComment`, `updateComment`, `voteOnCard`, and others.

### Implications for "Board Rules Schema" Phase

Since Butler rules are not API-accessible, the project must:

1. **Define its own rules schema** -- a JSON/SQLite schema for triggers, conditions, and actions that mirrors Butler's capabilities.
2. **Implement rule execution locally** -- using webhook-delivered action events as triggers, executing actions via REST API calls.
3. **Not attempt to import existing Butler rules** -- there is no API path to read them. Users would need to recreate rules in the local app.
4. **Use webhooks as the event source** -- register webhooks on boards/cards to receive real-time action events, then match them against local rule definitions.

---

## 8. Integration Patterns from Existing Tools

### Placker (Projects by Placker)

- **Approach**: Standalone web app + Trello Power-Up for in-Trello visibility.
- **Data flow**: Syncs board/card data via Trello REST API. Provides Gantt charts, portfolio views, and cross-board reporting in its own web UI.
- **Key insight**: All rich functionality (Gantt, timeline, portfolio) lives outside Trello. The Power-Up is just a thin link back to Placker's web app. This confirms the pattern: **use the REST API for data, build your own UI**.
- **Sync model**: Placker also syncs with Microsoft Planner, suggesting a bidirectional REST API sync layer.

### Blue Cat Reports

- **Approach**: Standalone web app that pulls data from multiple Trello boards via REST API.
- **Data flow**: Reads board/card/list data, generates charts and reports.
- **Key insight**: Pure data consumer; no attempt to replicate Trello's Kanban UI. Focuses on analytics that Trello lacks.

### Common Patterns Across Integrators

| Pattern | Examples | Relevance |
|---|---|---|
| **REST API data sync** | Placker, Blue Cat, Screenful, Corrello | Core pattern; all tools sync via REST API |
| **Webhook-driven updates** | Most mature integrations | Essential for real-time sync to local SQLite |
| **Power-Up as entry point** | Placker, Screenful | Not relevant (we are not building a Power-Up) |
| **Own UI for extended views** | Placker (Gantt), Blue Cat (reports) | Confirms that rebuilding UI is the industry norm |
| **Bidirectional sync** | Placker (Trello <-> Planner) | Relevant; our app needs write-back to Trello |
| **Local data store** | n8n, Zapier (for workflow state) | SQLite is our equivalent |

### Desktop App Precedent

No major Trello integration ships as a native desktop app. Most are SaaS web apps. This makes the Tauri approach novel but also means there are no direct architectural precedents to follow. The closest analogy is Notion's desktop app (Electron-based), which renders its own UI and syncs with cloud APIs.

---

## 9. Recommendations for UI Strategy

### Summary: Embed vs. Rebuild

| Component | Embed? | Rebuild? | Rationale |
|---|---|---|---|
| Kanban board view | No | **Yes** | Cannot embed interactive Trello board; CSP blocks it; ToS prohibits framing |
| Card detail view | No | **Yes** | No embeddable card detail component exists |
| List management | No | **Yes** | No standalone list component |
| Custom fields UI | No | **Yes** | Custom field rendering is Trello-internal |
| Butler rules UI | No | **Yes** | Butler has no API; must build own rule editor |
| Labels, badges, due dates | No | **Yes** | Standard UI elements; straightforward to build |
| Board settings | No | **Yes** | Board prefs readable via API; UI must be custom |
| Authentication flow | Partial | Partial | Can open Trello OAuth in system browser; handle callback in Tauri |

### Recommended Tech Stack

```
Tauri 2.x (Rust backend + webview frontend)
  +-- React 18+ (UI framework)
  +-- @dnd-kit/core + @dnd-kit/sortable (drag and drop)
  +-- Tailwind CSS (utility-first styling)
  +-- shadcn/ui (component primitives)
  +-- SQLite via rusqlite or sea-orm (local data store)
  +-- Trello REST API (data sync)
  +-- Trello Webhooks (real-time updates via local HTTP listener)
```

### Architecture Overview

```
[Trello Cloud] <-- REST API + Webhooks --> [Rust Backend]
                                               |
                                          [SQLite DB]
                                               |
                                    [Tauri IPC Bridge]
                                               |
                                     [React Frontend]
                                     (Custom Kanban UI)
```

### Key Design Decisions

1. **Full UI rebuild** -- there is no viable embedding path. All Trello UI elements must be rebuilt using standard web technologies.

2. **Trello-inspired, not Trello-identical** -- avoid "substantially replicating" Trello's UI to stay within ToS boundaries. Use Trello's UX patterns (board/list/card hierarchy, drag-and-drop cards) but apply a distinct visual design.

3. **Local-first with sync** -- SQLite as the source of truth; sync to/from Trello asynchronously. This enables offline use (a feature Trello itself lacks).

4. **Custom rules engine** -- since Butler rules are not API-accessible, build a local automation engine that uses webhooks as event triggers and the REST API for actions. Define rules in a JSON schema stored in SQLite.

5. **OAuth via system browser** -- for Trello authentication, open the OAuth flow in the user's default browser and capture the callback token via a local HTTP server or custom URI scheme. This is the standard Tauri pattern for third-party OAuth.

---

## 10. Sources

### Trello Developer Documentation
- [Power-Ups Reference](https://developer.atlassian.com/cloud/trello/power-ups/)
- [Power-Up Capabilities](https://developer.atlassian.com/cloud/trello/power-ups/capabilities/)
- [REST API Client (Power-Up)](https://developer.atlassian.com/cloud/trello/power-ups/rest-api-client/)
- [Power-Up Topics](https://developer.atlassian.com/cloud/trello/guides/power-ups/topics/)
- [Building a Power-Up: Part One](https://developer.atlassian.com/cloud/trello/guides/power-ups/building-a-power-up-part-one/)
- [API Introduction](https://developer.atlassian.com/cloud/trello/guides/rest-api/api-introduction/)
- [Embedding Boards](https://developer.atlassian.com/cloud/trello/guides/embedding/embedding-boards/)
- [Webhooks Guide](https://developer.atlassian.com/cloud/trello/guides/rest-api/webhooks/)
- [Action Types Reference](https://developer.atlassian.com/cloud/trello/guides/rest-api/action-types/)
- [Getting Started with Custom Fields](https://developer.atlassian.com/cloud/trello/guides/rest-api/getting-started-with-custom-fields/)
- [Webhooks API Reference](https://developer.atlassian.com/cloud/trello/rest/api-group-webhooks/)
- [Boards API Reference](https://developer.atlassian.com/cloud/trello/rest/api-group-boards/)
- [Custom Fields API Reference](https://developer.atlassian.com/cloud/trello/rest/api-group-customfields/)

### Terms of Service
- [Trello Developer Terms (Deprecated)](https://developer.atlassian.com/cloud/trello/developer-terms/)
- [Atlassian Developer Terms (Current)](https://developer.atlassian.com/platform/marketplace/atlassian-developer-terms/)
- [Atlassian Developer Terms: Summary of Changes (Dec 2025)](https://developer.atlassian.com/platform/marketplace/atlassian-developer-terms-changes-dec25/)

### Atlassian Design System
- [Atlassian Design Components Overview](https://atlassian.design/components/)
- [Design Tokens](https://atlassian.design/components/tokens/)
- [Atlaskit npm Packages](https://atlaskit.atlassian.com/packages)
- [Forge UI Kit Components](https://developer.atlassian.com/platform/forge/ui-kit/components/)

### Butler / Automation
- [Automation Overview](https://support.atlassian.com/trello/docs/automation-overview/)
- [Creating and Managing Butler Commands](https://support.atlassian.com/trello/docs/creating-and-managing-butler-commands/)
- [Butler Quotas and Limits](https://support.atlassian.com/trello/docs/butler-quotas-and-limits/)

### Embedding and Integration
- [Community: Can I embed private board?](https://community.atlassian.com/forums/Trello-questions/Can-I-embed-private-board-to-my-site/qaq-p/715012)
- [Community: How to integrate board into iframe?](https://community.atlassian.com/forums/Trello-questions/How-to-integrate-the-entire-trello-board-into-HTML-iFrame/qaq-p/2617047)
- [Iframely: Trello Embedding](https://iframely.com/domains/trello)
- [Placker Sync Help](https://help.placker.com/en/collections/226320-sync-with-trello-planner-and-other-integrations)
- [Blue Cat Reports](https://www.bluecatreports.com/)

### Tauri Security
- [Tauri: iframe security discussion](https://github.com/tauri-apps/tauri/discussions/1145)
- [Tauri v2: Content Security Policy](https://v2.tauri.app/security/csp/)
- [Tauri v2: Capabilities](https://v2.tauri.app/security/capabilities/)
- [Tauri: webview tag feature request](https://github.com/tauri-apps/tauri/issues/13311)

### Kanban UI Libraries
- [dnd-kit Kanban Board Tutorial (LogRocket)](https://blog.logrocket.com/build-kanban-board-dnd-kit-react/)
- [react-dnd-kit-tailwind-shadcn-ui (GitHub)](https://github.com/Georgegriff/react-dnd-kit-tailwind-shadcn-ui)
- [react-trello (GitHub)](https://github.com/rcdexta/react-trello)
- [Planka -- Open Source Kanban](https://madewithreactjs.com/planka)

### Rate Limiting
- [Atlassian: Evolving API Rate Limits](https://www.atlassian.com/blog/platform/evolving-api-rate-limits)
- [Trello API Limits Best Practices](https://stateful.com/blog/trello-api-limits)
