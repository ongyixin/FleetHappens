# Annotated: Secured Image Generation Cloud Function

This is a line-by-line walkthrough of [`examples/server-side/generate-image/index.js`](../../examples/server-side/generate-image/index.js) — a Google Cloud Function that generates images using Gemini, secured so only your Geotab Add-In's authorized users can call it.

For the security concepts behind this code, see [Securing Your Add-In's Backend Endpoints](../SECURE_ADDIN_BACKEND.md).

---

## Configuration

```javascript
const ALLOWED_DATABASES = (process.env.ALLOWED_DATABASES || '')
  .split(',').map(db => db.trim().toLowerCase()).filter(Boolean);
const ALLOWED_USERS = (process.env.ALLOWED_USERS || '')
  .split(',').map(u => u.trim().toLowerCase()).filter(Boolean);
const MAX_REQUESTS_PER_HOUR = parseInt(process.env.MAX_REQUESTS_PER_HOUR, 10) || 20;
const SESSION_CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes
```

**Why environment variables?** You never want to hardcode database names, email addresses, or API keys in source code. Environment variables let you change configuration without redeploying code — and they don't leak into version control.

**Why `.toLowerCase()`?** Geotab database names and emails aren't case-sensitive, so we normalize to lowercase for consistent comparison.

**Why `filter(Boolean)`?** If the environment variable is empty, `.split(',')` gives `['']`. `filter(Boolean)` removes that empty string so we get `[]` instead — which we use later to detect "not configured".

---

## Server Validation (Preventing SSRF)

```javascript
function isValidGeotabServer(server) {
  return server === 'my.geotab.com' || server.endsWith('.geotab.com');
}
```

**Why this matters:** The `geotab_server` parameter comes from the client. Your Cloud Function uses it to make an HTTP request (to verify the session). If an attacker sets `geotab_server` to their own server, they could make your function talk to a server that always says "yes, valid session."

**The wrong way:**
```javascript
// BAD — matches 'geotab.com.evil.com' and 'evil-geotab.com'
server.includes('geotab.com')
```

**The right way:** `.endsWith('.geotab.com')` ensures the domain is actually a subdomain of `geotab.com`. This is a form of **SSRF (Server-Side Request Forgery)** prevention.

---

## Session Verification

```javascript
async function verifyGeotabSession(database, username, sessionId, server) {
  const apiUrl = `https://${server}/apiv1`;

  const response = await fetch(apiUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      method: 'GetSystemTimeUtc',
      params: {
        credentials: {
          database: database,
          userName: username,
          sessionId: sessionId
        }
      }
    })
  });
```

**Why `GetSystemTimeUtc`?** It's the lightest Geotab API call — returns just a timestamp, no sensitive data, minimal processing. We don't care about the result; we only care whether Geotab accepts the credentials. If the `sessionId` is invalid or expired, Geotab returns an error.

**Why not just trust the credentials from the client?** Because the client is JavaScript running in a browser. Anyone can inspect your Add-In's source, see the request format, and send their own request with made-up credentials. Only Geotab's server can confirm a session is real.

---

## Session Caching

```javascript
async function isSessionValid(database, username, sessionId, server) {
  const cacheKey = getCacheKey(database, username, sessionId);
  const cached = sessionCache.get(cacheKey);

  if (cached && (Date.now() - cached.verifiedAt) < SESSION_CACHE_TTL_MS) {
    return true;
  }

  const isValid = await verifyGeotabSession(database, username, sessionId, server);

  if (isValid) {
    sessionCache.set(cacheKey, { verifiedAt: Date.now() });
    if (sessionCache.size > 100) {
      cleanupCache(sessionCache, SESSION_CACHE_TTL_MS);
    }
  }

  return isValid;
}
```

**Why cache?** Each verification is an HTTP round-trip to Geotab's API (~100-300ms). If a user clicks "generate" several times, you don't want to verify the same session every time.

**Why only 5 minutes?** Sessions can be revoked (user logs out, admin disables account). A short TTL ensures you re-check periodically. Geotab sessions themselves last 14 days, so 5 minutes is a good balance between security and performance.

**Why the cleanup at 100 entries?** Cloud Functions share memory across requests but get recycled periodically. Without cleanup, the Map could grow unbounded. The threshold of 100 is arbitrary but reasonable — it triggers a sweep that removes expired entries.

---

## Rate Limiting

```javascript
function checkRateLimit(database, username) {
  const key = getRateLimitKey(database, username);
  const now = Date.now();
  const oneHourAgo = now - (60 * 60 * 1000);

  let record = rateLimitCache.get(key);
  if (!record) {
    record = { requests: [] };
    rateLimitCache.set(key, record);
  }

  // Filter out requests older than 1 hour
  record.requests = record.requests.filter(timestamp => timestamp > oneHourAgo);

  if (record.requests.length >= MAX_REQUESTS_PER_HOUR) {
    return {
      allowed: false,
      remaining: 0,
      resetIn: Math.ceil((record.requests[0] + 60 * 60 * 1000 - now) / 1000 / 60)
    };
  }

  record.requests.push(now);
  return {
    allowed: true,
    remaining: MAX_REQUESTS_PER_HOUR - record.requests.length
  };
}
```

**Why rate limit?** Image generation APIs cost money. Even authorized users shouldn't be able to run up your bill by calling the endpoint in a loop.

**Sliding window approach:** Instead of a fixed "20 per hour starting at :00", this tracks each request timestamp and counts how many fall within the last 60 minutes. This is fairer — a user who made 19 requests at 2:55 PM isn't locked out until 3:55 PM.

**Caveat:** This is in-memory, so rate limits reset when the Cloud Function instance is recycled. For strict enforcement across multiple instances, you'd need Redis or a database. For most Add-In backends, in-memory is fine.

---

## Main Handler: Authentication Flow

```javascript
functions.http('generateImage', async (req, res) => {
  // CORS headers
  res.set('Access-Control-Allow-Origin', '*');
```

**Why CORS `*`?** Your Add-In runs inside a MyGeotab iframe. The browser enforces CORS, so your Cloud Function must allow cross-origin requests. `*` is permissive but acceptable here because **CORS is not your security boundary** — session verification is. See [Common Mistakes](../SECURE_ADDIN_BACKEND.md#common-mistakes) in the security guide.

```javascript
  // Fail closed: if ALLOWED_DATABASES is not configured, reject all requests.
  if (ALLOWED_DATABASES.length === 0) {
    console.error('ALLOWED_DATABASES not configured — rejecting request');
    return res.status(500).json({ ... });
  }
```

**Fail closed, not open.** If you forget to set the `ALLOWED_DATABASES` environment variable, the function rejects everything rather than allowing everything. This is a deliberate security choice — a misconfiguration should deny access, not grant it.

```javascript
  // Check database allowlist
  const normalizedDatabase = geotab_database.toLowerCase();
  if (!ALLOWED_DATABASES.includes(normalizedDatabase)) { ... }

  // Validate server before making any requests to it
  if (!isValidGeotabServer(server)) { ... }

  // Verify session with Geotab API
  const sessionValid = await isSessionValid(...);

  // Check user allowlist (username is verified by Geotab — can't be spoofed)
  if (ALLOWED_USERS.length > 0 && !ALLOWED_USERS.includes(geotab_username.toLowerCase())) { ... }

  // Check rate limit
  const rateCheck = checkRateLimit(geotab_database, geotab_username);
```

**The order matters:**
1. **Database allowlist** — cheapest check, no network call
2. **Server validation** — prevent SSRF before making any outbound request
3. **Session verification** — network call to Geotab (cached)
4. **User allowlist** — checked after session verification so we know the username is real
5. **Rate limiting** — only count requests that pass all auth checks

Each step is a gate. Most unauthorized requests are rejected at step 1 (fast, free). Only legitimate-looking requests reach step 3 (slower, network call).

---

## Image Generation

```javascript
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp-image-generation:generateContent?key=${GEMINI_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { responseModalities: ['IMAGE', 'TEXT'] }
      })
    }
  );
```

**Why is the Gemini API key safe here?** Because this runs on your server, not in the browser. The key is in an environment variable and never sent to the client. This is exactly the pattern described in [Securing Your Add-In's Backend Endpoints](../SECURE_ADDIN_BACKEND.md) — your Add-In calls your backend, your backend calls the paid API.

---

## Security Summary

| Layer | What it stops | Cost |
|-------|--------------|------|
| Database allowlist | Users from other Geotab databases | Free (string comparison) |
| Server validation | SSRF attacks via fake Geotab servers | Free (string comparison) |
| Session verification | Forged/expired credentials, bots, random internet callers | ~100-300ms (cached for 5 min) |
| User allowlist | Other developers in the same database | Free (string comparison) |
| Rate limiting | Authorized users abusing the endpoint | Free (in-memory counter) |
