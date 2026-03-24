# Trello REST API Endpoints Research

> **Base URL:** `https://api.trello.com/1`
> **Authentication:** All requests require `key` (API key) and `token` (user token) as query parameters or in the Authorization header.
> **Research Date:** 2026-03-24

---

## Table of Contents

1. [Boards](#1-boards)
2. [Lists](#2-lists)
3. [Cards](#3-cards)
4. [Members](#4-members)
5. [Labels](#5-labels)
6. [Checklists](#6-checklists)
7. [Custom Fields](#7-custom-fields)
8. [Batch Operations](#8-batch-operations)
9. [Search](#9-search)
10. [Nested Resources](#10-nested-resources)
11. [Pagination](#11-pagination)
12. [Response Formats & Field Selection](#12-response-formats--field-selection)
13. [Webhooks](#13-webhooks)
14. [Rate Limits](#14-rate-limits)
15. [Sync Strategy Recommendations](#15-sync-strategy-recommendations)

---

## 1. Boards

### Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/boards/` | Create a new board |
| `GET` | `/boards/{id}` | Get a board by ID |
| `PUT` | `/boards/{id}` | Update a board |
| `DELETE` | `/boards/{id}` | Delete a board |
| `GET` | `/members/{id}/boards` | List all boards for a member |
| `GET` | `/organizations/{id}/boards` | List all boards in an organization |
| `GET` | `/boards/{id}/members` | List members of a board |
| `GET` | `/boards/{id}/memberships` | Get membership details (includes permission level) |
| `PUT` | `/boards/{id}/members/{idMember}` | Add/update a member on a board |
| `DELETE` | `/boards/{id}/members/{idMember}` | Remove a member from a board |
| `GET` | `/boards/{id}/lists` | Get all lists on a board |
| `GET` | `/boards/{id}/cards` | Get all cards on a board |
| `GET` | `/boards/{id}/labels` | Get all labels on a board |
| `GET` | `/boards/{id}/checklists` | Get all checklists on a board |
| `GET` | `/boards/{id}/customFields` | Get all custom field definitions on a board |
| `GET` | `/boards/{id}/actions` | Get actions/activity on a board |

### Board Fields

Available fields for the `fields` query parameter:
`id`, `name`, `desc`, `descData`, `closed`, `idMemberCreator`, `idOrganization`, `pinned`, `url`, `shortUrl`, `prefs`, `labelNames`, `starred`, `limits`, `memberships`, `enterpriseOwned`

### Example: Create a Board

```http
POST /1/boards/?name=My+Board&defaultLists=false&key={key}&token={token}
```

### Example: Get a Board with Nested Resources

```http
GET /1/boards/{id}?lists=open&cards=all&card_fields=id,name,idList,pos&key={key}&token={token}
```

---

## 2. Lists

### Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/lists` | Create a new list on a board |
| `GET` | `/lists/{id}` | Get a list by ID |
| `PUT` | `/lists/{id}` | Update a list (name, position, etc.) |
| `PUT` | `/lists/{id}/closed` | Archive or unarchive a list |
| `PUT` | `/lists/{id}/idBoard` | Move a list to a different board |
| `PUT` | `/lists/{id}/pos` | Update a list's position |
| `GET` | `/lists/{id}/cards` | Get all cards in a list |
| `GET` | `/lists/{id}/actions` | Get actions on a list |
| `POST` | `/lists/{id}/archiveAllCards` | Archive all cards in a list |
| `POST` | `/lists/{id}/moveAllCards` | Move all cards to another list |

### Key Parameters for `POST /lists`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `name` | string | Yes | Name of the list |
| `idBoard` | string | Yes | ID of the board to add the list to |
| `pos` | string/number | No | Position: `top`, `bottom`, or a positive number |
| `idListSource` | string | No | ID of a list to copy |

### Example: Create a List

```http
POST /1/lists?name=To+Do&idBoard={boardId}&pos=top&key={key}&token={token}
```

> **Note:** Lists cannot be deleted via the API -- they can only be archived (`PUT /lists/{id}/closed` with `value=true`).

---

## 3. Cards

### Core CRUD Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/cards` | Create a new card |
| `GET` | `/cards/{id}` | Get a card by ID |
| `PUT` | `/cards/{id}` | Update a card |
| `DELETE` | `/cards/{id}` | Permanently delete a card |
| `PUT` | `/cards/{id}/closed` | Archive or unarchive a card |
| `PUT` | `/cards/{id}/idList` | Move a card to a different list |
| `PUT` | `/cards/{id}/idBoard` | Move a card to a different board |
| `PUT` | `/cards/{id}/pos` | Update card position |

### Attachment Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/cards/{id}/attachments` | List all attachments on a card |
| `GET` | `/cards/{id}/attachments/{idAttachment}` | Get a specific attachment |
| `POST` | `/cards/{id}/attachments` | Add an attachment (URL or file upload) |
| `DELETE` | `/cards/{id}/attachments/{idAttachment}` | Remove an attachment |

### Comment Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/cards/{id}/actions/comments` | Add a comment to a card |
| `PUT` | `/cards/{id}/actions/{idAction}/comments` | Update a comment |
| `DELETE` | `/cards/{id}/actions/{idAction}/comments` | Delete a comment |

### Member Endpoints on Cards

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/cards/{id}/members` | List members assigned to a card |
| `POST` | `/cards/{id}/idMembers` | Add a member to a card |
| `DELETE` | `/cards/{id}/idMembers/{idMember}` | Remove a member from a card |

### Label Endpoints on Cards

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/cards/{id}/labels` | List labels on a card |
| `POST` | `/cards/{id}/idLabels` | Add a label to a card |
| `DELETE` | `/cards/{id}/idLabels/{idLabel}` | Remove a label from a card |

### Checklist Endpoints on Cards

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/cards/{id}/checklists` | List checklists on a card |
| `POST` | `/cards/{id}/checklists` | Create a checklist on a card |
| `DELETE` | `/cards/{id}/checklists/{idChecklist}` | Remove a checklist from a card |

### Custom Field Endpoints on Cards

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/cards/{id}/customFieldItems` | Get custom field values for a card |
| `PUT` | `/cards/{id}/customField/{idCustomField}/item` | Set/update a custom field value |

### Key Parameters for `POST /cards`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `name` | string | No | Card name |
| `desc` | string | No | Card description |
| `idList` | string | Yes | ID of the list to add the card to |
| `pos` | string/number | No | `top`, `bottom`, or positive number |
| `due` | date | No | Due date |
| `dueComplete` | boolean | No | Whether the due date is complete |
| `idMembers` | string (CSV) | No | Comma-separated member IDs |
| `idLabels` | string (CSV) | No | Comma-separated label IDs |
| `idCardSource` | string | No | ID of a card to copy |

### Example: Create a Card

```http
POST /1/cards?idList={listId}&name=My+Card&desc=Description+here&pos=bottom&key={key}&token={token}
```

### Example: Move a Card to Another List

```http
PUT /1/cards/{cardId}?idList={newListId}&pos=top&key={key}&token={token}
```

> **Important:** When querying cards, the API limits results to at most **1,000 cards**. Use `before` and `since` parameters (which operate on card creation date) to paginate through larger sets.

---

## 4. Members

### Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/members/{id}` | Get a member by ID (use `me` for authenticated user) |
| `PUT` | `/members/{id}` | Update member profile |
| `GET` | `/members/{id}/boards` | List a member's boards |
| `GET` | `/members/{id}/cards` | List cards assigned to a member |
| `GET` | `/members/{id}/organizations` | List organizations a member belongs to |
| `GET` | `/members/{id}/actions` | Get a member's actions |
| `GET` | `/members/{id}/notifications` | Get a member's notifications |

### Board Membership Types

When fetching board members, the `memberType` field indicates permission level:
- `admin` -- Full board management
- `normal` -- Standard member
- `observer` -- Read-only access

> **Rate limit warning:** The `/1/members/` endpoint has a stricter rate limit of **100 requests per 900 seconds** (15 minutes).

---

## 5. Labels

### Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/labels` | Create a new label |
| `GET` | `/labels/{id}` | Get a label by ID |
| `PUT` | `/labels/{id}` | Update a label (name, color) |
| `DELETE` | `/labels/{id}` | Delete a label |
| `GET` | `/boards/{id}/labels` | Get all labels on a board |

### Available Colors

`yellow`, `purple`, `blue`, `red`, `green`, `orange`, `black`, `sky`, `pink`, `lime`

### Limits

- Maximum **950 labels per board** (warning at 900).

---

## 6. Checklists

### Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/checklists` | Create a new checklist |
| `GET` | `/checklists/{id}` | Get a checklist by ID |
| `PUT` | `/checklists/{id}` | Update a checklist |
| `DELETE` | `/checklists/{id}` | Delete a checklist |
| `GET` | `/checklists/{id}/checkItems` | Get all items in a checklist |
| `POST` | `/checklists/{id}/checkItems` | Create a check item |
| `GET` | `/checklists/{id}/checkItems/{idCheckItem}` | Get a specific check item |
| `PUT` | `/cards/{id}/checkItem/{idCheckItem}` | Update a check item (state, name, pos) |
| `DELETE` | `/checklists/{id}/checkItems/{idCheckItem}` | Delete a check item |

### CheckItem Properties

- `id` -- Unique identifier
- `name` -- Item text
- `state` -- `complete` or `incomplete`
- `pos` -- Position within the checklist
- `idChecklist` -- Parent checklist ID

### Limits

- Maximum **15,200 checklists per board** (warning at 14,400).
- Maximum **475 checklists per card** (warning at 450).

---

## 7. Custom Fields

### Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/customFields` | Create a custom field definition on a board |
| `GET` | `/customFields/{id}` | Get a custom field definition |
| `PUT` | `/customFields/{id}` | Update a custom field definition |
| `DELETE` | `/customFields/{id}` | Delete a custom field definition |
| `GET` | `/customFields/{id}/options` | Get options for a list-type custom field |
| `POST` | `/customFields/{id}/options` | Add an option to a list-type custom field |
| `DELETE` | `/customFields/{id}/options/{idOption}` | Delete a custom field option |
| `GET` | `/boards/{id}/customFields` | Get all custom field definitions on a board |
| `GET` | `/cards/{id}/customFieldItems` | Get custom field values for a card |
| `PUT` | `/cards/{id}/customField/{idField}/item` | Set a custom field value on a card |

### Supported Field Types

| Type | Value Format | Example |
|------|-------------|---------|
| `text` | `{"value": {"text": "hello"}}` | Free text |
| `number` | `{"value": {"number": "42"}}` | Numeric (as string) |
| `date` | `{"value": {"date": "2026-03-24T12:00:00.000Z"}}` | ISO datetime |
| `checkbox` | `{"value": {"checked": "true"}}` | Boolean (as string) |
| `list` | `{"idValue": "optionId123"}` | Dropdown selection |

> **Note:** All custom field values are strings, even numbers and booleans. A board can have up to **50 custom field definitions**. The Custom Fields Power-Up must be enabled on the board or the API will return 403.

### Example: Create a Custom Field

```http
POST /1/customFields
Content-Type: application/json

{
  "idModel": "{boardId}",
  "modelType": "board",
  "name": "Priority",
  "type": "list",
  "options": [
    {"value": {"text": "High"}, "color": "red", "pos": 1024},
    {"value": {"text": "Medium"}, "color": "yellow", "pos": 2048},
    {"value": {"text": "Low"}, "color": "green", "pos": 3072}
  ],
  "pos": "bottom",
  "display_cardFront": true
}
```

---

## 8. Batch Operations

### Endpoint

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/batch` | Execute multiple GET requests in one call |

### Constraints

- **GET requests only** -- no POST, PUT, or DELETE
- **Maximum 10 URLs** per batch request
- URLs are passed as a comma-separated list in the `urls` query parameter
- Each URL is a relative path (e.g., `/boards/{id}`)
- **Not available** to Forge or OAuth2 apps -- only API key + token auth

### Example

```http
GET /1/batch?urls=/boards/abc123,/boards/def456/lists,/cards/ghi789&key={key}&token={token}
```

### Response Format

Returns an array of response objects, one per URL in the same order:

```json
[
  {"200": { "id": "abc123", "name": "Board 1", ... }},
  {"200": [{ "id": "list1", ... }, { "id": "list2", ... }]},
  {"200": { "id": "ghi789", "name": "Card 1", ... }}
]
```

> **Limitation for sync:** Since batch only supports GET, all write operations (create, update, delete) must be individual API calls. This means bulk sync writes are constrained by rate limits.

---

## 9. Search

### Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/search` | Search across boards, cards, members, organizations |
| `GET` | `/search/members` | Search specifically for members |

### Key Parameters for `/search`

| Parameter | Type | Description |
|-----------|------|-------------|
| `query` | string | Search query (required) -- supports operators |
| `modelTypes` | string | Comma-separated: `actions`, `boards`, `cards`, `members`, `organizations` |
| `idBoards` | string | Comma-separated board IDs to search within, or `mine` |
| `idOrganizations` | string | Comma-separated org IDs to scope search |
| `idCards` | string | Comma-separated card IDs to scope search |
| `board_fields` | string | Fields to return for boards |
| `card_fields` | string | Fields to return for cards |
| `boards_limit` | number | Max boards to return (default 10) |
| `cards_limit` | number | Max cards to return (default 10) |
| `cards_page` | number | Page of card results (0-indexed) |
| `partial` | boolean | Allow partial word matching |

### Search Query Operators

| Operator | Example | Description |
|----------|---------|-------------|
| `@member` | `@me` | Cards assigned to a member |
| `board:` | `board:MyBoard` | Cards on a specific board |
| `list:` | `list:Done` | Cards in a specific list |
| `label:` | `label:red` | Cards with a label (color or name) |
| `has:` | `has:attachments` | Cards with attachments, description, cover, members, stickers |
| `due:` | `due:week` | Cards due within: `day`, `week`, `month`, `overdue` |
| `created:` | `created:14` | Cards created in last N days |
| `edited:` | `edited:day` | Cards edited within: `day`, `week`, `month` |
| `is:` | `is:open` | Cards that are `open`, `archived`, `starred` |
| `-operator` | `-has:members` | Negate any operator |

### Example: Search Cards on a Board

```http
GET /1/search?query=bug+label:red&modelTypes=cards&idBoards={boardId}&cards_limit=50&key={key}&token={token}
```

> **Note:** The search API does not support searching by custom field values. This is a known limitation.

---

## 10. Nested Resources

Trello's API supports fetching related data in a single request using two approaches.

### Approach 1: Sub-Resource URL

```http
GET /1/boards/{id}/cards
GET /1/boards/{id}/lists
GET /1/boards/{id}/members
GET /1/lists/{id}/cards
```

### Approach 2: Query Parameter Nesting

```http
GET /1/boards/{id}?lists=open&cards=all&members=all
```

### Supported Nested Resources

| Parent | Nestable Resources | Query Parameter |
|--------|-------------------|-----------------|
| Board | lists, cards, members, labels, checklists, actions, customFields, memberships | `lists=open`, `cards=all`, `members=all`, etc. |
| List | cards, actions | `cards=all` |
| Card | members, labels, attachments, checklists, actions, customFieldItems, stickers | `members=true`, `attachments=true`, etc. |
| Organization | boards, members | `boards=open`, `members=all` |
| Member | boards, cards, organizations | `boards=open`, `cards=all` |

### Field Filtering for Nested Resources

```http
GET /1/boards/{id}?cards=all&card_fields=id,name,idList,pos,due,closed
GET /1/boards/{id}?lists=open&list_fields=id,name,pos,closed
GET /1/boards/{id}?members=all&member_fields=id,fullName,username
```

### Nesting Depth

Nesting goes **one level deep** from the parent resource. You cannot nest cards within lists within a board in a single call. However, fetching a board with `cards=all` returns all cards with their `idList` field, allowing client-side grouping.

### Practical Example: Full Board Sync in One Call

```http
GET /1/boards/{id}?
  lists=open&list_fields=id,name,pos,closed&
  cards=all&card_fields=id,name,desc,idList,pos,due,dueComplete,closed,idMembers,idLabels,dateLastActivity&
  card_members=true&member_fields=id,fullName,username&
  card_attachments=true&
  labels=all&label_fields=id,name,color&
  customFields=true&
  card_customFieldItems=true&
  key={key}&token={token}
```

This single request returns the board plus all lists, cards, members, labels, attachments, custom fields, and custom field values.

### Limits on Nested Data

- **Actions:** Max 300 items when nested
- **Cards:** Max 1,000 items (use `before`/`since` for pagination)
- **Default limit:** Most nested resources return 50 items by default -- use `limit` to request more

---

## 11. Pagination

### Pagination Mechanisms

Trello uses **different pagination strategies** depending on the endpoint:

#### Cursor-Based (Cards, Actions)

| Parameter | Type | Description |
|-----------|------|-------------|
| `before` | string | Return items created before this date (ISO 8601) or Mongo ObjectID |
| `since` | string | Return items created after this date (ISO 8601) or Mongo ObjectID |
| `limit` | number | Number of items to return (max typically 1000) |

#### Page-Based (Search)

| Parameter | Type | Description |
|-----------|------|-------------|
| `cards_page` | number | Page number (0-indexed) |
| `cards_limit` | number | Items per page |

#### Filter-Based (Lists, Boards)

| Parameter | Values | Description |
|-----------|--------|-------------|
| `filter` | `open`, `closed`, `all` | Filter by archive status |

### Practical Pagination for Large Boards

To fetch all cards on a board with more than 1,000 cards:

```
1. GET /1/boards/{id}/cards?limit=1000
2. Take the `id` of the last card returned
3. GET /1/boards/{id}/cards?limit=1000&before={lastCardId}
4. Repeat until fewer than 1000 cards returned
```

---

## 12. Response Formats & Field Selection

### Default vs Explicit Fields

By default, Trello returns a **subset of fields** for most resources. Use the `fields` parameter to control what's returned.

| Value | Behavior |
|-------|----------|
| (omitted) | Returns default fields |
| `fields=all` | Returns all available fields |
| `fields=id,name,desc` | Returns only specified fields |

### Default Fields by Resource

**Board defaults:** `id`, `name`, `desc`, `closed`, `idOrganization`, `url`, `shortUrl`, `prefs`, `labelNames`

**Card defaults:** `id`, `name`, `desc`, `closed`, `idList`, `idBoard`, `pos`, `due`, `dueComplete`, `idMembers`, `idLabels`, `url`, `shortUrl`, `badges`

**List defaults:** `id`, `name`, `closed`, `idBoard`, `pos`

### Minimizing Response Size

For sync operations, request only the fields you need:

```http
GET /1/boards/{id}/cards?fields=id,name,idList,pos,closed,dateLastActivity
```

The `dateLastActivity` field on cards is particularly useful for incremental sync -- it tells you when a card was last modified without needing to fetch actions.

---

## 13. Webhooks

### Webhook CRUD Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/webhooks/` | Create a webhook |
| `GET` | `/webhooks/{id}` | Get a webhook by ID |
| `PUT` | `/webhooks/{id}` | Update a webhook |
| `DELETE` | `/webhooks/{id}` | Delete a webhook |
| `GET` | `/tokens/{token}/webhooks` | List all webhooks for a token |

### Creating a Webhook

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `callbackURL` | string | Yes | HTTPS URL to receive events |
| `idModel` | string | Yes | ID of model to watch (board, list, card, member) |
| `description` | string | No | Human-readable description |
| `active` | boolean | No | Whether webhook is active (default true) |

**On creation**, Trello sends an HTTP HEAD request to validate the callbackURL. The endpoint must return 200.

### Example: Create a Board Webhook

```http
POST /1/webhooks/?callbackURL=https://myapp.com/trello/webhook&idModel={boardId}&description=Board+sync&key={key}&token={token}
```

### Callback Payload Format

When a change occurs, Trello sends a POST request to the callbackURL:

```json
{
  "action": {
    "id": "action123",
    "idMemberCreator": "member123",
    "type": "updateCard",
    "date": "2026-03-24T10:30:00.000Z",
    "data": {
      "card": { "id": "card123", "name": "Updated Card", "idList": "list456" },
      "old": { "name": "Old Card Name" },
      "board": { "id": "board789", "name": "My Board" },
      "list": { "id": "list456", "name": "In Progress" }
    }
  },
  "model": {
    "id": "board789",
    "name": "My Board",
    "desc": "",
    "closed": false
    // ... full board object
  },
  "webhook": {
    "id": "webhook123",
    "description": "Board sync",
    "idModel": "board789",
    "callbackURL": "https://myapp.com/trello/webhook",
    "active": true
  }
}
```

### Relevant Action Types for Board/Card/List Sync

| Action Type | Trigger |
|-------------|---------|
| `createCard` | New card created |
| `updateCard` | Card updated (name, desc, position, list change, archive) |
| `deleteCard` | Card permanently deleted |
| `addMemberToCard` | Member assigned to card |
| `removeMemberFromCard` | Member removed from card |
| `addLabelToCard` | Label added to card |
| `removeLabelFromCard` | Label removed from card |
| `addAttachmentToCard` | Attachment added |
| `deleteAttachmentFromCard` | Attachment removed |
| `commentCard` | Comment added |
| `updateComment` | Comment edited |
| `deleteComment` | Comment deleted |
| `addChecklistToCard` | Checklist added |
| `removeChecklistFromCard` | Checklist removed |
| `updateCheckItemStateOnCard` | Check item toggled |
| `createList` | New list created |
| `updateList` | List updated (name, position, archive) |
| `moveListFromBoard` | List moved away |
| `moveListToBoard` | List moved to this board |
| `updateBoard` | Board settings changed |
| `addMemberToBoard` | Member added to board |
| `removeMemberFromBoard` | Member removed from board |
| `createLabel` | Label created |
| `updateLabel` | Label updated |
| `deleteLabel` | Label deleted |
| `createCheckItem` | Check item created |
| `updateCheckItem` | Check item updated |
| `deleteCheckItem` | Check item deleted |

> **Note:** Some action types (e.g., `addLabelToCard`, `createCheckItem`) are **only delivered via webhooks** and do not appear in nested action queries. This is an important distinction for sync implementations.

### Signature Verification

Trello signs every webhook request with the `X-Trello-Webhook` header containing a base64 HMAC-SHA1 digest. To verify:

```
HMAC-SHA1(
  key: your_api_secret,
  data: request_body + callbackURL
)
```

The `callbackURL` must match exactly as provided during webhook creation.

### Retry Behavior

| Attempt | Delay |
|---------|-------|
| 1st retry | 30 seconds |
| 2nd retry | 60 seconds |
| 3rd retry | 120 seconds |

After 3 failures, the webhook stops retrying for that event. Webhooks are **automatically disabled** after consecutive failures for 30 days AND more than 1,000 failures. A single successful delivery resets all failure counts.

### Auto-Deletion

- Callback returns HTTP **410 Gone** -> webhook is immediately deleted
- Associated token is revoked -> webhook is deleted
- Token loses access to the monitored model -> webhook is disabled

---

## 14. Rate Limits

### Rate Limit Tiers

| Scope | Limit | Window |
|-------|-------|--------|
| Per API Key | 300 requests | 10 seconds |
| Per Token | 100 requests | 10 seconds |
| `/members/` endpoint | 100 requests | 900 seconds (15 min) |

### Effective Throughput

- **Per token:** 10 req/sec sustained
- **Per API key:** 30 req/sec sustained (across all users of your app)
- **Bursting:** You can burst up to the limit within any 10-second window, but sustained traffic should stay well below

### Rate Limit Response Headers

Every response includes:

```
x-rate-limit-api-token-interval-ms: 10000
x-rate-limit-api-token-max: 100
x-rate-limit-api-token-remaining: 97
x-rate-limit-api-key-interval-ms: 10000
x-rate-limit-api-key-max: 300
x-rate-limit-api-key-remaining: 295
```

### 429 Error Handling

When limits are exceeded, the API returns HTTP 429 with an error code:
- `API_TOKEN_LIMIT_EXCEEDED` -- Token limit hit
- `API_KEY_LIMIT_EXCEEDED` -- API key limit hit
- `API_TOKEN_DB_LIMIT_EXCEEDED` -- Database time limit for token exceeded (heavy queries)

**Critical:** If a single API key generates **>200 rate limit errors in a 10-second window**, all subsequent requests from that key are rejected for the remainder of that window.

### Recommended Backoff Strategy

```
1. Monitor x-rate-limit-*-remaining headers
2. When remaining < 10, slow down requests
3. On 429: wait for the full interval (10 seconds) before retrying
4. Implement exponential backoff: 10s, 20s, 40s
5. Never retry aggressively -- hitting 200 errors/10s triggers a block
```

### Database Time Limits

Trello also enforces per-token database query time limits. Heavy queries (e.g., fetching large boards with many nested resources and `fields=all`) consume more database time. The error `API_TOKEN_DB_LIMIT_EXCEEDED` indicates you need to:
- Reduce the scope of your queries
- Request fewer fields
- Use smaller page sizes

---

## 15. Sync Strategy Recommendations

### For a Tauri Desktop App with Local SQLite

#### Initial Sync

For the first-time full sync of a board:

1. **Single nested request** to get all board data:
   ```
   GET /1/boards/{id}?lists=all&cards=all&card_fields=id,name,desc,idList,pos,due,dueComplete,closed,idMembers,idLabels,dateLastActivity&labels=all&members=all&customFields=true&card_customFieldItems=true
   ```
   This returns everything in one API call for boards with < 1,000 cards.

2. **For boards with >1,000 cards:** Fetch board metadata first, then paginate cards:
   ```
   GET /1/boards/{id}?lists=all&labels=all&members=all&customFields=true
   GET /1/boards/{id}/cards?limit=1000&fields=id,name,desc,idList,...
   GET /1/boards/{id}/cards?limit=1000&before={lastId}&fields=...
   ```

3. **Estimated API calls:** 1-5 calls for most boards (well within rate limits).

#### Incremental Sync: Webhook-Based (Recommended)

**Strategy:** Register a webhook on each synced board. Process incoming events to update SQLite.

| Pros | Cons |
|------|------|
| Real-time updates | Requires a publicly accessible HTTPS endpoint |
| Zero API calls for monitoring | Desktop app needs a tunnel or relay server |
| No risk of hitting rate limits for reads | Webhook delivery is not guaranteed (3 retries only) |
| Fine-grained: only changed data arrives | Must handle out-of-order events |

**Challenge for a desktop app:** Webhooks require a public URL. Options:
- Run a small relay server (e.g., Cloudflare Worker) that receives webhooks and queues them for the desktop app to poll
- Use a WebSocket relay: webhook -> relay server -> WebSocket push to desktop app
- Use ngrok/Cloudflare Tunnel during development

#### Incremental Sync: Poll-Based (Simpler Alternative)

**Strategy:** Periodically fetch changes using `actions` with `since` parameter.

```http
GET /1/boards/{id}/actions?since={lastSyncTimestamp}&limit=300&filter=all
```

Then fetch updated resources as needed based on action types.

| Pros | Cons |
|------|------|
| No public URL needed | Polling interval = sync latency |
| Simpler implementation | Consumes API calls (1+ per poll per board) |
| Works offline then catches up | 300 action limit per request may miss changes on very active boards |
| Desktop-app friendly | Must be careful not to exceed rate limits with many boards |

**Polling budget at 100 req/10s per token:**
- Polling 10 boards every 30 seconds = ~20 req/min (very safe)
- Polling 10 boards every 5 seconds = ~120 req/min (still safe, ~20% of capacity)
- Reserve remaining capacity for user-initiated CRUD operations

#### Hybrid Strategy (Recommended for Production)

1. **Primary:** Use webhooks via a lightweight relay server for real-time updates
2. **Fallback:** Poll every 60 seconds as a safety net to catch missed webhook events
3. **Reconciliation:** Periodically (every 5-10 minutes) do a full comparison using `dateLastActivity` on cards to detect any drift
4. **Writes:** Perform individual API calls for user-initiated CRUD (no batch write support)

#### Write Operation Budget

Since there is no batch write API, each create/update/delete is one request:

| Operation | Calls Required |
|-----------|---------------|
| Create a card | 1 |
| Update a card | 1 |
| Move a card | 1 |
| Add a label to a card | 1 |
| Create a card with checklist + labels | 3-4 |
| Bulk create 50 cards | 50 |

At 10 req/sec per token, bulk-creating 50 cards takes ~5 seconds minimum. For heavy write operations, implement a queue with rate-limit-aware throttling.

---

## Data Limits Reference

| Resource | Per Board Limit |
|----------|----------------|
| Open cards | 5,000 |
| Total cards | 2,000,000 |
| Open lists | 475 |
| Total lists | 2,850 |
| Labels | 950 |
| Members | 1,520 |
| Checklists | 15,200 |
| Custom field definitions | 50 |
| Attachments per card | 950 |
| Checklists per card | 475 |

---

## Sources

- [Trello REST API Reference](https://developer.atlassian.com/cloud/trello/rest/)
- [API Introduction](https://developer.atlassian.com/cloud/trello/guides/rest-api/api-introduction/)
- [Boards API](https://developer.atlassian.com/cloud/trello/rest/api-group-boards/)
- [Cards API](https://developer.atlassian.com/cloud/trello/rest/api-group-cards/)
- [Lists API](https://developer.atlassian.com/cloud/trello/rest/api-group-lists/)
- [Members API](https://developer.atlassian.com/cloud/trello/rest/api-group-members/)
- [Labels API](https://developer.atlassian.com/cloud/trello/rest/api-group-labels/)
- [Checklists API](https://developer.atlassian.com/cloud/trello/rest/api-group-checklists/)
- [Custom Fields API](https://developer.atlassian.com/cloud/trello/rest/api-group-customfields/)
- [Custom Fields Guide](https://developer.atlassian.com/cloud/trello/guides/rest-api/getting-started-with-custom-fields/)
- [Search API](https://developer.atlassian.com/cloud/trello/rest/api-group-search/)
- [Batch API](https://developer.atlassian.com/cloud/trello/rest/api-group-batch/)
- [Webhooks API](https://developer.atlassian.com/cloud/trello/rest/api-group-webhooks/)
- [Webhooks Guide](https://developer.atlassian.com/cloud/trello/guides/rest-api/webhooks/)
- [Nested Resources Guide](https://developer.atlassian.com/cloud/trello/guides/rest-api/nested-resources/)
- [Rate Limits](https://developer.atlassian.com/cloud/trello/guides/rest-api/rate-limits/)
- [Data Limits](https://developer.atlassian.com/cloud/trello/guides/rest-api/limits/)
- [Action Types](https://developer.atlassian.com/cloud/trello/guides/rest-api/action-types/)
- [Authorization Guide](https://developer.atlassian.com/cloud/trello/guides/rest-api/authorization/)
- [Search Operators (Atlassian Support)](https://support.atlassian.com/trello/docs/searching-for-cards-all-boards/)
