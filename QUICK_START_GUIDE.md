# SAS Token Quick Start - 5 Minute Setup

## TL;DR - Get Started in 5 Minutes

### Step 1: Copy Token Manager Service (2 min)

```typescript
// src/services/sasTokenManager.ts

const API_BASE = process.env.REACT_APP_API_BASE_URL;

class SASTokenManager {
  private cache = new Map();

  async getToken(
    videoId: string,
    type: "download" | "upload" = "download",
    blobPath?: string
  ) {
    const cacheKey = `${type}-${videoId}`;

    if (this.cache.has(cacheKey)) {
      const cached = this.cache.get(cacheKey);
      if (new Date() < cached.expiresAt) {
        return cached.token.sasUrl;
      }
    }

    const endpoint =
      type === "download"
        ? `/api/v1/sas-tokens/download/${videoId}`
        : `/api/v1/sas-tokens/upload/${videoId}?blobPath=${blobPath}`;

    const response = await fetch(`${API_BASE}${endpoint}`, {
      credentials: "include",
    });

    const { data } = await response.json();
    this.cache.set(cacheKey, {
      token: data,
      expiresAt: new Date(data.expiresAt),
    });

    return data.sasUrl;
  }

  async refreshToken(
    videoId: string,
    type: "download" | "upload" | "hls",
    blobPath?: string
  ) {
    const response = await fetch(`${API_BASE}/api/v1/sas-tokens/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ videoId, type, blobPath }),
    });

    const { data } = await response.json();
    return data.sasUrl;
  }

  clearCache(videoId: string) {
    Array.from(this.cache.keys()).forEach((key) => {
      if (key.includes(videoId)) this.cache.delete(key);
    });
  }
}

export const sasTokenManager = new SASTokenManager();
```

### Step 2: Use in Video Player Component (1 min)

```jsx
// src/components/VideoPlayer.jsx

import { useEffect, useRef } from "react";
import { sasTokenManager } from "../services/sasTokenManager";

export function VideoPlayer({ videoId }) {
  const videoRef = useRef();
  const [error, setError] = useState(null);

  useEffect(() => {
    sasTokenManager
      .getToken(videoId, "download")
      .then((sasUrl) => {
        videoRef.current.src = sasUrl;
        videoRef.current.load();
      })
      .catch((err) => {
        setError(err.message);
      });

    return () => sasTokenManager.clearCache(videoId);
  }, [videoId]);

  if (error) return <div>Error: {error}</div>;

  return <video ref={videoRef} controls style={{ width: "100%" }} />;
}
```

### Step 3: Handle Token Expiry (1 min)

```jsx
// Wrap in retry handler
async function playVideoWithRetry(videoId) {
  let sasUrl = await sasTokenManager.getToken(videoId, "download");
  let response = await fetch(sasUrl);

  // If token expired (403), refresh and retry
  if (response.status === 403) {
    sasUrl = await sasTokenManager.refreshToken(videoId, "download");
    response = await fetch(sasUrl);
  }

  return response;
}
```

### Step 4: Test with cURL (1 min)

```bash
# Get download token
curl http://localhost:5000/api/v1/sas-tokens/download/YOUR_VIDEO_ID

# Response:
# {
#   "data": {
#     "sasUrl": "https://...",
#     "expiresAt": "2024-01-15T10:00:00Z",
#     "expiresIn": 3600
#   }
# }

# Use the sasUrl directly in browser or fetch
curl "https://account.blob.core.windows.net/videos/...?sv=..."
```

---

## Endpoints at a Glance

### Download/Stream

```bash
GET /api/v1/sas-tokens/download/:videoId
# Returns: Read-only SAS token for video streaming
# Default expiry: 1 hour
```

### Upload

```bash
GET /api/v1/sas-tokens/upload/:videoId?blobPath=path/to/file
# Returns: Write SAS token for file upload
# Default expiry: 15 minutes
# Requires: Authentication
```

### Validate Token

```bash
POST /api/v1/sas-tokens/validate
Body: { "sasUrl": "https://..." }
# Returns: { isExpired, shouldRefresh, timeRemaining }
```

### Refresh Token

```bash
POST /api/v1/sas-tokens/refresh
Body: { "videoId": "...", "type": "download|upload|hls" }
# Returns: New SAS token
```

---

## Common Patterns

### Pattern 1: Simple Video Playback

```jsx
function VideoPlayer({ videoId }) {
  const [src, setSrc] = useState("");

  useEffect(() => {
    fetch(`/api/v1/sas-tokens/download/${videoId}`)
      .then((r) => r.json())
      .then((res) => setSrc(res.data.sasUrl));
  }, [videoId]);

  return <video controls src={src} />;
}
```

### Pattern 2: Chunked Upload

```javascript
async function uploadFile(videoId, file) {
  const chunkSize = 5 * 1024 * 1024; // 5MB

  for (let i = 0; i < file.size; i += chunkSize) {
    const chunk = file.slice(i, i + chunkSize);
    const blobPath = `${videoId}/chunk-${i}.ts`;

    const sasUrl = await fetch(
      `/api/v1/sas-tokens/upload/${videoId}?blobPath=${blobPath}`
    )
      .then((r) => r.json())
      .then((res) => res.data.sasUrl);

    await fetch(sasUrl, {
      method: "PUT",
      headers: { "x-ms-blob-type": "BlockBlob" },
      body: chunk,
    });
  }
}
```

### Pattern 3: Auto-Refresh on Expiry

```javascript
async function ensureValidToken(sasUrl) {
  const validity = await fetch("/api/v1/sas-tokens/validate", {
    method: "POST",
    body: JSON.stringify({ sasUrl }),
  })
    .then((r) => r.json())
    .then((res) => res.data);

  if (validity.shouldRefresh) {
    return await sasTokenManager.refreshToken(videoId, "download");
  }
  return sasUrl;
}
```

---

## Error Handling

### Handle 403 (Token Expired)

```javascript
try {
  const response = await fetch(sasUrl);
  if (response.status === 403) {
    // Token expired, get new one
    const newUrl = await sasTokenManager.refreshToken(videoId, type);
    // Retry with new token
  }
} catch (error) {
  console.error("Error:", error);
}
```

### Handle 404 (Video Not Found)

```javascript
// Video doesn't exist or not published
// Show error message or fallback UI
```

### Handle 401 (Not Authenticated)

```javascript
// For upload tokens
// Redirect to login or show auth prompt
```

---

## FAQ

**Q: When do I need to refresh tokens?**
A: When `shouldRefresh` is true, or if you get a 403 error

**Q: How long do tokens last?**
A: Download: 1 hour, Upload: 15 min, HLS: 24 hours

**Q: Can I use the same token multiple times?**
A: Yes, until it expires

**Q: What's the difference between /download and /upload?**
A: Download = read-only, Upload = write-only. Use appropriate type.

**Q: Why do I need authentication for /upload?**
A: Only video owner should be able to upload to their video

**Q: Can I get multiple tokens in one request?**
A: Not currently, but you can make parallel requests

---

## Debugging

### Enable Logging

```javascript
class SASTokenManager {
  private debug = true; // Set to true in dev

  log(msg, data) {
    if (this.debug) console.log(`[SAS] ${msg}`, data);
  }
}
```

### Test Token Generation

```javascript
// In browser console
const response = await fetch("/api/v1/sas-tokens/download/YOUR_VIDEO_ID");
const data = await response.json();
console.log(data.data.sasUrl);
```

### Check Token Validity

```javascript
const validity = await fetch("/api/v1/sas-tokens/validate", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ sasUrl: YOUR_SAS_URL }),
}).then((r) => r.json());

console.log("Expires in:", validity.data.timeRemaining, "seconds");
```

---

## Next Steps

1. Copy the `SASTokenManager` service
2. Update your video player to use `getToken()`
3. Test with a real video ID
4. Implement error handling
5. Add token refresh on 403 errors
6. Monitor token generation in network tab

**That's it!** Your frontend is now using SAS tokens for direct cloud access.

---

## Still Have Questions?

- Full docs: `SAS_TOKEN_API_DOCUMENTATION.md`
- Implementation guide: `FRONTEND_IMPLEMENTATION_GUIDE.md`
- Examples: Test suite in `tests/sas-token.service.test.js`
