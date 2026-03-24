# Trello API Authentication Research

> **Last updated:** 2026-03-24
> **Purpose:** Inform authentication design for a Tauri desktop app syncing local SQLite with Trello boards, with multi-user / SSO considerations.

---

## Table of Contents

1. [Authentication Mechanisms](#1-authentication-mechanisms)
2. [SSO / Enterprise Auth](#2-sso--enterprise-auth)
3. [Token Lifecycle](#3-token-lifecycle)
4. [Multi-User Implications](#4-multi-user-implications)
5. [Secure Token Storage](#5-secure-token-storage)
6. [Atlassian Connect / Forge](#6-atlassian-connect--forge)
7. [Recommendations for Tauri Desktop App](#7-recommendations-for-tauri-desktop-app)

---

## 1. Authentication Mechanisms

Trello currently supports two authentication flows, with a third (OAuth 2.0) announced but not yet enforced.

### 1.1 API Key + Token (Redirect-Based)

This is the simplest method. The app directs the user to a Trello authorization URL, and the user grants access. A token is returned.

**Step 1 -- Obtain an API key:**

API keys are tied to a Power-Up and generated at <https://trello.com/power-ups/admin> under the **API Key** tab. The API key is considered public -- it does not grant access to user data on its own.

**Step 2 -- Request user authorization:**

Redirect the user to:

```
https://trello.com/1/authorize?expiration=30days&scope=read,write&response_type=token&key={YourAPIKey}&callback_method=fragment&return_url={YourCallbackURL}
```

| Parameter         | Values                                          | Notes                                                        |
| ----------------- | ----------------------------------------------- | ------------------------------------------------------------ |
| `response_type`   | `token`                                         | Returns the token directly                                   |
| `key`             | Your API key                                    | Required                                                     |
| `scope`           | `read`, `write`, `account` (comma-separated)    | See [Section 3.2](#32-scopes) for details                    |
| `expiration`      | `1hour`, `1day`, `30days`, `never`              | Controls token lifetime                                      |
| `callback_method` | `postMessage` or `fragment`                     | How the token is delivered back to the app                   |
| `return_url`      | Valid URL                                       | Required when `callback_method` is set                       |
| `name`            | Application name string                         | Displayed to the user on the consent screen                  |

**Step 3 -- Use the token:**

Pass authentication via query parameters or an Authorization header:

```bash
# Query parameters
curl "https://api.trello.com/1/members/me?key={apiKey}&token={apiToken}"

# Authorization header
curl -H 'Authorization: OAuth oauth_consumer_key="{apiKey}", oauth_token="{apiToken}"' \
  "https://api.trello.com/1/members/me"

# Request body (PUT/POST only)
curl -X PUT "https://api.trello.com/1/cards/{cardId}/name" \
  -H "Content-Type: application/json" \
  -d '{"key": "{apiKey}", "token": "{apiToken}", "value": "Updated Name"}'
```

**For a desktop app**, the recommended approach is to open a local HTTP server, use `fragment` callback to a `http://localhost:{port}/callback` URL, and extract the token from the URL fragment.

> **Source:** [Authorizing With Trello's REST API](https://developer.atlassian.com/cloud/trello/guides/rest-api/authorization/)

### 1.2 OAuth 1.0a

Trello supports a standard OAuth 1.0 three-legged flow using these endpoints:

| Endpoint                                      | Purpose                    |
| --------------------------------------------- | -------------------------- |
| `https://trello.com/1/OAuthGetRequestToken`   | Obtain a request token     |
| `https://trello.com/1/OAuthAuthorizeToken`    | User authorizes the token  |
| `https://trello.com/1/OAuthGetAccessToken`    | Exchange for access token  |

The flow requires:
1. Your API key (consumer key)
2. Your application secret (consumer secret), found in the API Key tab at <https://trello.com/power-ups/admin>
3. Standard OAuth 1.0a signature generation (HMAC-SHA1)

**Example (Node.js with `oauth` library):**

```javascript
const OAuth = require('oauth').OAuth;

const requestURL = 'https://trello.com/1/OAuthGetRequestToken';
const accessURL  = 'https://trello.com/1/OAuthGetAccessToken';
const authorizeURL = 'https://trello.com/1/OAuthAuthorizeToken';

const oauth = new OAuth(
  requestURL, accessURL,
  apiKey, apiSecret,
  '1.0A', 'http://localhost:3000/callback', 'HMAC-SHA1'
);

// Step 1: Get request token
oauth.getOAuthRequestToken((err, token, tokenSecret) => {
  // Step 2: Redirect user to:
  // https://trello.com/1/OAuthAuthorizeToken?oauth_token={token}&scope=read,write&expiration=30days

  // Step 3: After user authorizes, exchange for access token
  oauth.getOAuthAccessToken(token, tokenSecret, verifier,
    (err, accessToken, accessTokenSecret) => {
      // accessToken is the user's token for API calls
    }
  );
});
```

OAuth 1.0a is more complex but avoids exposing tokens in URL fragments, making it somewhat more suitable for automated/server scenarios.

> **Source:** [Authorizing With Trello's REST API](https://developer.atlassian.com/cloud/trello/guides/rest-api/authorization/)

### 1.3 OAuth 2.0 (3LO) -- Upcoming

Per [RFC-89](https://community.developer.atlassian.com/t/rfc-89-introducing-oauth2-to-trello/90359) and the [Trello Developer Changelog (CHANGE-2492)](https://developer.atlassian.com/cloud/trello/changelog/), Trello is migrating to OAuth 2.0 (Authorization Code Grant with PKCE).

**Key details:**

| Aspect               | Detail                                                                 |
| --------------------- | ---------------------------------------------------------------------- |
| Flow                  | Authorization Code Grant with PKCE (required)                          |
| Access token expiry   | 1 hour                                                                 |
| Refresh token expiry  | 90 days                                                                |
| Refresh token rotation| Yes -- new refresh token issued with each access token request         |
| New scopes            | `read:board:trello`, `write:board:trello`, `read:organization:trello`, `write:organization:trello`, `read:enterprise:trello`, `write:enterprise:trello`, `read:member:trello`, `write:member:trello` |
| Resource restrictions | Power-Ups installed on a workspace get tokens restricted to that workspace |

**Timeline:**
- Published: March 14, 2025
- Discussion closed: April 11, 2025
- Resolution target: September 30, 2025
- Deprecation of legacy auth: At least 6 months notice will be given via the Trello changelog
- OAuth 1.0 deprecation: To be announced separately

**Impact on desktop apps:** PKCE is ideal for native/desktop applications because it eliminates the need for a client secret. This is the recommended long-term approach.

> **Sources:**
> - [RFC-89: Introducing OAuth2 to Trello](https://community.developer.atlassian.com/t/rfc-89-introducing-oauth2-to-trello/90359)
> - [Trello Developer Changelog](https://developer.atlassian.com/cloud/trello/changelog/)

---

## 2. SSO / Enterprise Auth

### 2.1 How Trello SSO Works

Trello SSO is configured through **Atlassian Guard Standard** (formerly Atlassian Access) at the Atlassian Organization level. It is not a Trello-specific SSO but an organization-wide SAML SSO that covers all Atlassian products.

**Setup flow:**
1. Create an Atlassian Organization at `admin.atlassian.com`
2. Verify your email domain via DNS TXT or HTML file
3. All Atlassian accounts using that domain are "claimed" by the organization
4. Configure a SAML identity provider (e.g., Okta, Azure AD) using the **Atlassian Cloud App** -- not legacy Trello SSO apps
5. Enforce SSO via authentication policies

**Key point:** The legacy Trello-specific SSO apps do **not** work with Atlassian Guard. Only the Atlassian Cloud App is used for SAML SSO.

> **Source:** [Configure SSO for Trello with Atlassian Access](https://support.atlassian.com/trello/docs/configuring-sso-for-your-enterprise/)

### 2.2 SSO and API Authentication

**SSO does not directly affect Trello API token generation or usage.** SSO governs how users authenticate to the Trello web interface. Once a user is authenticated (whether via SSO or standard login), they can still:

- Generate API keys through the Power-Ups admin page
- Authorize tokens via the `/1/authorize` flow
- Use tokens for API access regardless of how they originally logged in

There is no mechanism to issue Trello API tokens directly from a SAML assertion or SSO session. The API token flow is separate from the SSO session flow.

### 2.3 Atlassian Account Implications

As of February 2022, **all Trello accounts are Atlassian accounts**. This means:

- Users authenticate to Trello via `id.atlassian.com`
- SSO policies at the Atlassian Organization level affect Trello login
- User provisioning can happen via SCIM API to the Atlassian Organization, then the user is invited to Trello workspaces
- The Trello API itself still uses its own key+token auth, independent of the Atlassian identity layer

> **Source:** [Trello Enterprise and Atlassian Accounts](https://support.atlassian.com/trello/docs/trello-enterprise-and-atlassian-accounts/)

### 2.4 Implications for Desktop App

A desktop app **cannot** authenticate to the Trello API via SSO/SAML directly. The practical flow for enterprise users is:

1. User opens the desktop app
2. App opens a browser window to the Trello `/1/authorize` URL
3. User logs in via their SSO provider (redirected automatically by Atlassian)
4. User grants the app permission
5. Token is returned to the app via callback
6. App uses the token for API calls

SSO is transparent to the app -- it only affects what the user sees during the browser-based authorization step.

---

## 3. Token Lifecycle

### 3.1 Token Expiration

**Current (API Key + Token and OAuth 1.0):**

| Expiration Option | Duration        |
| ----------------- | --------------- |
| `1hour`           | 1 hour          |
| `1day`            | 24 hours        |
| `30days`          | 30 days         |
| `never`           | No expiration   |

Expiration is set at token creation time and cannot be changed afterward.

**Upcoming (OAuth 2.0):**

| Token Type     | Expiry   | Notes                                           |
| -------------- | -------- | ----------------------------------------------- |
| Access token   | 1 hour   | Must be refreshed frequently                    |
| Refresh token  | 90 days  | Rotates on each use; inactive tokens expire     |

### 3.2 Scopes

**Current scopes:**

| Scope     | Description                                                              |
| --------- | ------------------------------------------------------------------------ |
| `read`    | Read boards, organizations, etc. on behalf of the user                   |
| `write`   | Write boards, organizations, etc. on behalf of the user                  |
| `account` | Read member email, write member info, mark notifications as read         |

Note: `write` does not imply `read`. To read and write, request `scope=read,write`.

**Upcoming OAuth 2.0 scopes** (per RFC-89):

Eight granular scopes: `read:board:trello`, `write:board:trello`, `read:organization:trello`, `write:organization:trello`, `read:enterprise:trello`, `write:enterprise:trello`, `read:member:trello`, `write:member:trello`.

### 3.3 Token Permissions Structure

When you retrieve a token via `GET /1/tokens/{token}`, the response includes a `permissions` array with per-model granularity:

```json
{
  "id": "5dced8665015383ed5ca248c",
  "idMember": "5bc79d4206526d2279c1e6ea",
  "identifier": "my-app",
  "permissions": [
    {
      "idModel": "5abbe4b7ddc1b351ef961414",
      "modelType": "board",
      "read": true,
      "write": true
    }
  ],
  "createdAt": "2019-11-15T16:55:02.000Z",
  "expires": null
}
```

When using the `/1/authorize` redirect flow with `scope=read,write`, the token typically receives a wildcard `idModel` of `"*"` granting access to all resources the user can access. Per-board scoping is possible through Power-Up context but not through the standard redirect-based authorization flow.

### 3.4 Token Revocation

**User-initiated:** Users can revoke tokens at `https://trello.com/{username}/account` under the "Applications" section.

**Programmatic revocation:**

```bash
curl -X DELETE "https://api.trello.com/1/tokens/{token}?key={apiKey}&token={apiToken}"
```

After revocation, the API returns `401` with `"invalid token"`. Applications should detect this and trigger re-authorization.

### 3.5 Token Introspection

Retrieve token metadata to check validity and permissions:

```bash
curl "https://api.trello.com/1/tokens/{token}?key={apiKey}&token={apiToken}"
```

This returns `idMember`, `dateCreated`, `dateExpires`, and the `permissions` array. Use this to verify token validity before sync operations.

> **Source:** [Trello REST API - Tokens](https://developer.atlassian.com/cloud/trello/rest/api-group-tokens/)

### 3.6 Rate Limiting

Rate limits are enforced **per API key** across all tokens issued under it. When exceeded, the API returns `429`. Webhooks are not subject to rate limits and should be used for real-time sync instead of polling.

> **Source:** [API Introduction](https://developer.atlassian.com/cloud/trello/guides/rest-api/api-introduction/)

---

## 4. Multi-User Implications

### 4.1 Token Structure Per User

Each Trello token is bound to a single user (`idMember`). If multiple users authenticate on the same machine:

- Each user goes through the authorization flow independently
- Each receives a unique token tied to their `idMember`
- Tokens are completely independent; revoking one does not affect others
- The same API key is used for all users (it belongs to the app, not the user)

### 4.2 Data Partitioning Strategy

For a multi-user Tauri app with SQLite sync:

```
~/.config/trello-app/
  users/
    {idMember_1}/
      sync.db          # SQLite database for user 1
      token.enc        # Encrypted token for user 1
    {idMember_2}/
      sync.db          # SQLite database for user 2
      token.enc        # Encrypted token for user 2
  app.db              # Shared app config (no user data)
```

**Key principles:**
- Use `idMember` (from `GET /1/tokens/{token}/member`) as the partition key
- Never store multiple users' data in the same SQLite database
- Store tokens in OS-level secure storage keyed by `idMember` (see Section 5)
- On app launch, enumerate stored credentials and present user-switching UI

### 4.3 Token Collision Prevention

Since the API key is shared across all users:
- Tokens must be stored and retrieved per-user
- HTTP clients must be instantiated or configured per-user session
- Background sync tasks must use the correct token for each user's data

---

## 5. Secure Token Storage

### 5.1 OS-Level Secure Storage (Recommended)

For a Tauri desktop app, leverage OS-native credential storage:

| Platform | Storage Backend          | Tauri Integration                                                    |
| -------- | ------------------------ | -------------------------------------------------------------------- |
| macOS    | Keychain Services        | `tauri-plugin-keyring` or `tauri-plugin-keychain`                    |
| Windows  | Windows Credential Manager | `tauri-plugin-keyring` (wraps `keyring` Rust crate)                |
| Linux    | Secret Service (GNOME Keyring / KWallet) | `tauri-plugin-keyring`                                |

**Example using `tauri-plugin-keyring`:**

```rust
// Rust side (Tauri backend)
use keyring::Entry;

fn store_token(user_id: &str, token: &str) -> Result<(), keyring::Error> {
    let entry = Entry::new("com.myapp.trello", user_id)?;
    entry.set_password(token)?;
    Ok(())
}

fn get_token(user_id: &str) -> Result<String, keyring::Error> {
    let entry = Entry::new("com.myapp.trello", user_id)?;
    entry.get_password()
}

fn delete_token(user_id: &str) -> Result<(), keyring::Error> {
    let entry = Entry::new("com.myapp.trello", user_id)?;
    entry.delete_credential()?;
    Ok(())
}
```

> **Sources:**
> - [tauri-plugin-keyring](https://github.com/HuakunShen/tauri-plugin-keyring)
> - [tauri-plugin-keychain](https://docs.rs/crate/tauri-plugin-keychain/latest)

### 5.2 Tauri Stronghold (Alternative)

Tauri's built-in Stronghold plugin provides an encrypted vault:

```javascript
import { Client, Stronghold } from '@tauri-apps/plugin-stronghold';
import { appDataDir } from '@tauri-apps/api/path';

const vaultPath = `${await appDataDir()}/vault.hold`;
const stronghold = await Stronghold.load(vaultPath, password);
const client = await stronghold.loadClient('trello-auth');
const store = client.getStore();

// Store token
await store.insert(
  `token:${userId}`,
  Array.from(new TextEncoder().encode(token))
);

// Retrieve token
const data = await store.get(`token:${userId}`);
const token = new TextDecoder().decode(new Uint8Array(data));
```

**Caveat:** As of early 2025, there were community reports that Stronghold may be deprecated in Tauri v3. Monitor the Tauri roadmap for updates.

> **Source:** [Stronghold | Tauri](https://v2.tauri.app/plugin/stronghold/)

### 5.3 What NOT To Do

- **Never** store tokens in plaintext config files, environment variables baked into the app, or localStorage/sessionStorage
- **Never** embed the API secret in client-side JavaScript or ship it in the app binary
- **Never** log tokens to console or crash reports
- **Never** commit tokens or API keys to version control

### 5.4 API Key Storage

The API key is considered public and can be embedded in the app. However, the **application secret** (used for OAuth 1.0 signing) must be treated as confidential. For OAuth 1.0, consider a backend proxy that holds the secret, or migrate to OAuth 2.0 with PKCE (which does not require a client secret).

---

## 6. Atlassian Connect / Forge

### 6.1 Atlassian Connect

Connect apps are web-based add-ons that run on your server and integrate with Atlassian products via iframes and webhooks. Authentication is handled via JWT (JSON Web Tokens) signed with a shared secret.

**Relevance to desktop apps:** Low. Connect is designed for server-hosted web apps, not desktop applications. It requires a publicly accessible URL for installation and callback.

### 6.2 Atlassian Forge

Forge is Atlassian's serverless app platform. Forge apps run on Atlassian's infrastructure and have built-in authentication -- no manual token management needed.

**Relevance to desktop apps:** Low. Forge apps execute on Atlassian's cloud, not on the user's machine. They cannot directly integrate with a local SQLite database or Tauri runtime.

### 6.3 Atlassian OAuth 2.0 (3LO) for Jira/Confluence

Atlassian's existing OAuth 2.0 (3LO) implementation for Jira and Confluence uses:

| Component     | Value                                          |
| ------------- | ---------------------------------------------- |
| Authorize URL | `https://auth.atlassian.com/authorize`         |
| Token URL     | `https://auth.atlassian.com/oauth/token`       |
| Audience      | `api.atlassian.com`                            |
| Grant type    | Authorization Code                             |

This flow currently does **not** cover Trello APIs. Trello's OAuth 2.0 migration (RFC-89) will introduce a Trello-specific 3LO flow. It is not yet clear whether Trello will use the same `auth.atlassian.com` endpoints or maintain separate endpoints.

> **Sources:**
> - [OAuth 2.0 (3LO) apps - Jira](https://developer.atlassian.com/cloud/jira/platform/oauth-2-3lo-apps/)
> - [Forge External Authentication](https://developer.atlassian.com/platform/forge/runtime-reference/external-fetch-api/)

### 6.4 Atlassian API Tokens (Potential Future Option)

Per RFC-89 discussion, Atlassian is exploring **Atlassian API tokens** as a replacement for Trello's current AppKey/Token system. These would be:
- Time-limited (configurable up to 1 year)
- Scoped with granular permissions
- Managed through the Atlassian account settings

This could eventually provide a simpler authentication path for desktop apps, but no concrete timeline or API surface has been published.

---

## 7. Recommendations for Tauri Desktop App

### 7.1 Short-Term (Ship Now)

1. **Use the `/1/authorize` redirect flow** with `callback_method=fragment`:
   - Spawn a local HTTP server on a random port
   - Open the user's default browser to the authorization URL with `return_url=http://localhost:{port}/callback`
   - Capture the token from the URL fragment
   - Request `scope=read,write` and `expiration=30days` (or `never` with periodic re-auth prompts)

2. **Store tokens via `tauri-plugin-keyring`** using the Rust `keyring` crate, keyed by `idMember`

3. **Partition SQLite databases per user** using `idMember` as the directory name

4. **Validate tokens on launch** via `GET /1/tokens/{token}` -- check `dateExpires` and handle `401` gracefully

5. **Implement token revocation** on user logout via `DELETE /1/tokens/{token}`

### 7.2 Medium-Term (Prepare for OAuth 2.0)

1. **Abstract the auth layer** behind an interface so you can swap the `/1/authorize` flow for OAuth 2.0 + PKCE without app-wide changes

2. **Monitor the Trello Developer Changelog** at <https://developer.atlassian.com/cloud/trello/changelog/> for the deprecation announcement (expect at least 6 months notice)

3. **Design token storage to handle refresh tokens** -- OAuth 2.0 will require storing both access and refresh tokens, with the access token rotating every hour

### 7.3 For Multi-User / SSO Scenarios

1. **SSO is transparent to the app** -- enterprise users will authenticate via their IdP during the browser-based authorization step; no special handling needed in the app

2. **Support multiple accounts** by storing multiple `(idMember, token)` pairs in the keyring and allowing the user to switch between them

3. **Enforce strict data isolation** -- never allow cross-user data access even if both users are on the same machine

### 7.4 Architecture Sketch

```
+------------------+     +-------------------+     +------------------+
|  Tauri Frontend  |     |   Tauri Backend    |     |   Trello API     |
|  (WebView/JS)    |     |   (Rust)           |     |                  |
+--------+---------+     +--------+----------+     +--------+---------+
         |                        |                          |
         | 1. User clicks login   |                          |
         +----------------------->|                          |
         |                        | 2. Start local HTTP srv  |
         |                        | 3. Open browser to       |
         |                        |    /1/authorize           |
         |                        |          +--------------->|
         |                        |          | 4. User logs   |
         |                        |          |    in (SSO if  |
         |                        |          |    enterprise) |
         |                        |          |<-- 5. Token    |
         |                        |<---------+    via fragment|
         |                        | 6. Store token in keyring |
         |                        | 7. Fetch idMember         |
         |                        +-------------------------->|
         |                        |<--------------------------+
         |                        | 8. Init user's SQLite DB  |
         |<-----------------------+                          |
         | 9. Show synced data    |                          |
         +                        +                          +
```

---

## Sources

- [Authorizing With Trello's REST API](https://developer.atlassian.com/cloud/trello/guides/rest-api/authorization/)
- [API Introduction](https://developer.atlassian.com/cloud/trello/guides/rest-api/api-introduction/)
- [Trello REST API - Tokens](https://developer.atlassian.com/cloud/trello/rest/api-group-tokens/)
- [Trello Developer Changelog](https://developer.atlassian.com/cloud/trello/changelog/)
- [RFC-89: Introducing OAuth2 to Trello](https://community.developer.atlassian.com/t/rfc-89-introducing-oauth2-to-trello/90359)
- [Configure SSO for Trello with Atlassian Access](https://support.atlassian.com/trello/docs/configuring-sso-for-your-enterprise/)
- [Trello Enterprise and Atlassian Accounts](https://support.atlassian.com/trello/docs/trello-enterprise-and-atlassian-accounts/)
- [OAuth 2.0 (3LO) apps - Jira](https://developer.atlassian.com/cloud/jira/platform/oauth-2-3lo-apps/)
- [Stronghold | Tauri](https://v2.tauri.app/plugin/stronghold/)
- [tauri-plugin-keyring](https://github.com/HuakunShen/tauri-plugin-keyring)
- [tauri-plugin-keychain](https://docs.rs/crate/tauri-plugin-keychain/latest)
- [GitGuardian - Remediating Trello Key Leaks](https://www.gitguardian.com/remediation/trello-key)
