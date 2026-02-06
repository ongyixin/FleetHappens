# Securing Your Add-In's Backend Endpoints

**Your Add-In calls a Cloud Function. How do you stop everyone else from calling it too?**

This guide solves a specific problem: you built a Geotab Add-In that calls your own backend (a Cloud Function, AWS Lambda, or any API), and you need to ensure only your Add-In's authorized users can use it.

---

## The Problem

Add-Ins run as JavaScript inside MyGeotab. That means:

- Your code is **visible** to anyone who inspects the page source
- Any API keys you embed in JavaScript can be **copied**
- Other Add-Ins on the same MyGeotab server share the same browser context
- Public endpoints can be called by **anyone** on the internet

You cannot solve this on the client side alone. You need server-side verification.

---

## The Solution: Verify Geotab Sessions Server-Side

Every user logged into MyGeotab has an active session with a `sessionId`. Your Add-In can access this via `api.getSession()`. The key insight: **your backend can verify that session directly with Geotab's API** before doing any work.

### How It Works

```
User logged into MyGeotab
        │
        ▼
┌─────────────────┐     POST {database, userName,     ┌──────────────────┐
│  Your Add-In    │────  sessionId, server, prompt} ──▶│  Your Cloud      │
│  (JavaScript)   │                                    │  Function         │
└─────────────────┘                                    └────────┬─────────┘
                                                                │
                                                    1. Check database allowlist
                                                    2. Verify session with Geotab ──▶ Geotab API
                                                    3. If valid → generate image
                                                    4. If invalid → return 401
```

### Step 1: Add-In — Send Session Credentials with Requests

```javascript
// In your Add-In's JavaScript
function generateImage(promptText) {
    api.getSession(function(session) {
        fetch("https://your-cloud-function.run.app/generate", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                // Your actual parameters
                prompt: promptText,
                // Geotab session for verification
                geotab_database: session.database,
                geotab_username: session.userName,
                geotab_session_id: session.sessionId,
                geotab_server: window.location.hostname || "my.geotab.com"
            })
        })
        .then(response => response.json())
        .then(data => {
            // Use the generated image
            document.getElementById("result").src = data.image_url;
        })
        .catch(err => console.error("Request failed:", err));
    });
}
```

> **Note on `geotab_server`:** The session must be verified against the **same server** where the user authenticated. The MyGeotab hostname (e.g., `my.geotab.com`, `my123.geotab.com`) tells you which server to call. You can get this from `window.location.hostname` since your Add-In runs inside MyGeotab's iframe.

### Step 2: Cloud Function — Verify the Session

Before doing any work, your backend verifies the session by making a lightweight Geotab API call using the provided credentials. `GetSystemTimeUtc` is the recommended call for this — it's fast, cheap, and doesn't return sensitive data.

```python
import requests
from flask import Flask, request, jsonify

app = Flask(__name__)

# Databases that are allowed to use your endpoint
ALLOWED_DATABASES = {"your_company_db", "your_demo_db"}

def verify_geotab_session(database, username, session_id, server):
    """Verify that the Geotab session is real and active."""
    url = f"https://{server}/apiv1"
    try:
        response = requests.post(url, json={
            "method": "GetSystemTimeUtc",
            "params": {
                "credentials": {
                    "database": database,
                    "userName": username,
                    "sessionId": session_id
                }
            }
        }, timeout=10)
        result = response.json()
        return "result" in result and "error" not in result
    except Exception:
        return False

@app.route("/generate", methods=["POST"])
def generate():
    data = request.json or {}

    database = data.get("geotab_database", "")
    username = data.get("geotab_username", "")
    session_id = data.get("geotab_session_id", "")
    server = data.get("geotab_server", "my.geotab.com")

    # 1. Check database allowlist
    if database not in ALLOWED_DATABASES:
        return jsonify({"error": "Unauthorized"}), 403

    # 2. Verify session with Geotab
    if not verify_geotab_session(database, username, session_id, server):
        return jsonify({"error": "Invalid session"}), 401

    # 3. Session is valid — do the actual work
    prompt = data.get("prompt", "")
    image_url = do_image_generation(prompt)  # Your actual logic
    return jsonify({"image_url": image_url})
```

### Step 3 (Optional): Cache Verified Sessions

Calling Geotab's API on every request adds latency. You can cache verified sessions briefly:

```python
import time

# Simple in-memory cache: {cache_key: expiry_timestamp}
session_cache = {}
CACHE_TTL = 300  # 5 minutes

def is_session_verified(database, username, session_id, server):
    """Check cache first, then verify with Geotab if needed."""
    cache_key = f"{database}:{username}:{session_id}"

    # Check cache
    if cache_key in session_cache and session_cache[cache_key] > time.time():
        return True

    # Verify with Geotab
    if verify_geotab_session(database, username, session_id, server):
        session_cache[cache_key] = time.time() + CACHE_TTL
        return True

    return False
```

---

## What This Protects Against

| Threat | How it's blocked |
|--------|-----------------|
| Random internet user finds your endpoint | No valid Geotab session = 401 |
| Developer in a different Geotab database | Database allowlist = 403 |
| Expired or forged session tokens | Geotab API rejects them = 401 |
| API keys stolen from your JavaScript | There are no API keys to steal |
| Bot scraping your endpoint | Can't fabricate Geotab sessions |

## What This Does NOT Protect Against

| Scenario | Why | Mitigation |
|----------|-----|-----------|
| Authorized user in your own database abusing the endpoint | They have a valid session | Add rate limiting per user |
| Another Add-In in the same database extracting session tokens | Shared browser context | This is low risk — they'd need to actively target your Add-In's network requests |

---

## Common Mistakes

### Mistake 1: Embedding API keys in JavaScript

```javascript
// BAD — anyone can see this in the page source
fetch("https://your-api.com/generate", {
    headers: { "Authorization": "Bearer sk-12345-my-secret-key" }
});
```

This is never secure for Add-Ins. Your JavaScript is public.

### Mistake 2: Relying on CORS

CORS is a browser-enforced policy. It prevents another *website* from calling your API from a browser, but:
- Another server-side script ignores CORS entirely
- It doesn't distinguish between Add-Ins on the same MyGeotab page
- It's a privacy/convenience feature, not a security boundary

### Mistake 3: Checking Origin/Referer headers

```python
# BAD — these headers are trivially spoofable from server-side code
if request.headers.get("Origin") != "https://my.geotab.com":
    return "Forbidden", 403
```

### Mistake 4: Not including the server in verification

```python
# BAD — session must be verified against the correct Geotab server
response = requests.post("https://my.geotab.com/apiv1", ...)  # Hardcoded!
```

Geotab has multiple servers (`my.geotab.com`, `my123.geotab.com`, etc.). The session is only valid on the server where it was created. Always pass the server from the client and use it in your verification call.

---

## Cloud Function Example (Google Cloud Run)

Here's a complete example for a Google Cloud Run function:

```python
"""Cloud Function that generates images, secured with Geotab session verification."""
import os
import time
import requests as http_requests
from flask import Flask, request, jsonify

app = Flask(__name__)

ALLOWED_DATABASES = set(os.environ.get("ALLOWED_DATABASES", "").split(","))

session_cache = {}
CACHE_TTL = 300

def verify_geotab_session(database, username, session_id, server):
    cache_key = f"{database}:{username}:{session_id}"
    if cache_key in session_cache and session_cache[cache_key] > time.time():
        return True

    url = f"https://{server}/apiv1"
    try:
        resp = http_requests.post(url, json={
            "method": "GetSystemTimeUtc",
            "params": {
                "credentials": {
                    "database": database,
                    "userName": username,
                    "sessionId": session_id
                }
            }
        }, timeout=10)
        result = resp.json()
        if "result" in result and "error" not in result:
            session_cache[cache_key] = time.time() + CACHE_TTL
            return True
    except Exception:
        pass
    return False

@app.route("/generate", methods=["POST"])
def generate():
    data = request.json or {}

    database = data.get("geotab_database", "")
    username = data.get("geotab_username", "")
    session_id = data.get("geotab_session_id", "")
    server = data.get("geotab_server", "my.geotab.com")

    if database not in ALLOWED_DATABASES:
        return jsonify({"error": "Unauthorized database"}), 403

    if not verify_geotab_session(database, username, session_id, server):
        return jsonify({"error": "Invalid or expired session"}), 401

    # --- Your image generation logic here ---
    prompt = data.get("prompt", "")
    # image_url = generate_image(prompt)
    # return jsonify({"image_url": image_url})
    return jsonify({"status": "ok"})

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=int(os.environ.get("PORT", 8080)))
```

Set the environment variable when deploying:

```bash
gcloud run deploy generate-image \
    --set-env-vars="ALLOWED_DATABASES=your_company_db,your_demo_db"
```

---

## Vibe Prompt

Copy-paste this to your AI assistant to add session verification to an existing Cloud Function:

```
I have a Geotab Add-In that calls my Cloud Function at [YOUR_URL].

Add Geotab session verification:
1. In the Add-In JavaScript, use api.getSession() to get the session credentials
   and send them (database, userName, sessionId, server) with every request.
2. In the Cloud Function, before doing any work, verify the session by calling
   Geotab's GetSystemTimeUtc API with the provided credentials.
3. Add a database allowlist so only my database "[YOUR_DATABASE]" can use it.
4. Cache verified sessions for 5 minutes to reduce latency.
5. Return 401 for invalid sessions, 403 for unauthorized databases.

Reference: guides/SECURE_ADDIN_BACKEND.md
```

---

## Further Reading

- [Using Add-Ins Session Id to Authenticate with API](https://helpdesk.geotab.com/hc/en-us/community/posts/214460043-Using-Add-Ins-Session-Id-to-Authenticate-with-API)
- [Better practices for the MyGeotab API](https://www.geotab.com/blog/better-practices-mygeotab-api/)
- [Geotab API Reference](https://geotab.github.io/sdk/software/api/reference/)
- [Geotab Add-In Developer Guide](https://developers.geotab.com/myGeotab/addIns/developingAddIns/)
