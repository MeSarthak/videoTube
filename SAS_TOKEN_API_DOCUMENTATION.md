# SAS Token API Documentation

## Overview

This API provides secure, fine-grained SAS (Shared Access Signature) token generation for Azure Blob Storage operations. The frontend can use these tokens to directly access files in cloud storage without proxying through the backend, reducing server load and improving scalability.

## Key Features

✅ **Fine-Grained Permissions** - Tokens are scoped to specific files and operations (read-only, write-only)
✅ **Short Expiration Times** - Security-focused defaults (1 hour for downloads, 15 minutes for uploads)
✅ **Token Validation** - Check expiry before operations and refresh when needed
✅ **Error Handling** - Clear error codes and messages for all cloud operations
✅ **Automatic Retry** - Transient failures are automatically retried with exponential backoff

---

## Base URL

```
http://localhost:5000/api/v1/sas-tokens
```

---

## Endpoints

### 1. Get Download SAS Token

Get a read-only SAS token for downloading/streaming video content.

**Endpoint:** `GET /download/:videoId`

**Authentication:** Optional (recommended)

**Query Parameters:**

| Parameter          | Type   | Default | Description                                     |
| ------------------ | ------ | ------- | ----------------------------------------------- |
| `expiresInSeconds` | number | 3600    | Token expiration time in seconds (max 24 hours) |

**Example Request:**

```bash
GET /api/v1/sas-tokens/download/507f1f77bcf86cd799439011
GET /api/v1/sas-tokens/download/507f1f77bcf86cd799439011?expiresInSeconds=7200
```

**Success Response (200):**

```json
{
  "statusCode": 200,
  "message": "Download SAS token generated successfully",
  "success": true,
  "data": {
    "sasUrl": "https://account.blob.core.windows.net/videos/507f1f77bcf86cd799439011/master.m3u8?sv=2021-06-08&sig=...",
    "expiresAt": "2024-01-15T10:00:00Z",
    "expiresIn": 3600,
    "permissions": "r",
    "videoId": "507f1f77bcf86cd799439011",
    "blobName": "507f1f77bcf86cd799439011/master.m3u8"
  }
}
```

**Error Responses:**

| Status | Code              | Message                          |
| ------ | ----------------- | -------------------------------- |
| 404    | VIDEO_NOT_FOUND   | Video not found or not published |
| 400    | INVALID_PARAMETER | Invalid expiresInSeconds value   |

---

### 2. Get Upload SAS Token

Get a write-capable SAS token for uploading files (authenticated users only).

**Endpoint:** `GET /upload/:videoId`

**Authentication:** Required (JWT)

**Query Parameters:**

| Parameter          | Type   | Required | Description                                                                 |
| ------------------ | ------ | -------- | --------------------------------------------------------------------------- |
| `blobPath`         | string | Yes      | Destination path in storage (e.g., `507f1f77bcf86cd799439011/chunk-001.ts`) |
| `expiresInSeconds` | number | No       | Token expiration time in seconds (default: 900, max: 3600)                  |

**Example Request:**

```bash
GET /api/v1/sas-tokens/upload/507f1f77bcf86cd799439011?blobPath=507f1f77bcf86cd799439011/chunk-001.ts&expiresInSeconds=600
```

**Success Response (200):**

```json
{
  "statusCode": 200,
  "message": "Upload SAS token generated successfully",
  "success": true,
  "data": {
    "sasUrl": "https://account.blob.core.windows.net/videos/507f1f77bcf86cd799439011/chunk-001.ts?sv=2021-06-08&sig=...",
    "expiresAt": "2024-01-15T10:15:00Z",
    "expiresIn": 900,
    "permissions": "cw",
    "videoId": "507f1f77bcf86cd799439011",
    "blobPath": "507f1f77bcf86cd799439011/chunk-001.ts"
  }
}
```

**Error Responses:**

| Status | Code              | Message                     |
| ------ | ----------------- | --------------------------- |
| 401    | UNAUTHORIZED      | Authentication required     |
| 403    | FORBIDDEN         | User is not the video owner |
| 400    | MISSING_PARAMETER | blobPath is required        |

---

### 3. Get HLS Playlist SAS Token

Get a read-only SAS token for HLS manifest/playlist files.

**Endpoint:** `GET /hls-playlist/:videoId/:playlistName`

**Authentication:** Optional

**Query Parameters:**

| Parameter          | Type   | Default | Description                                   |
| ------------------ | ------ | ------- | --------------------------------------------- |
| `expiresInSeconds` | number | 86400   | Token expiration time in seconds (max 7 days) |

**Example Request:**

```bash
GET /api/v1/sas-tokens/hls-playlist/507f1f77bcf86cd799439011/master.m3u8
GET /api/v1/sas-tokens/hls-playlist/507f1f77bcf86cd799439011/master.m3u8?expiresInSeconds=172800
```

**Success Response (200):**

```json
{
  "statusCode": 200,
  "message": "HLS playlist SAS token generated successfully",
  "success": true,
  "data": {
    "sasUrl": "https://account.blob.core.windows.net/videos/507f1f77bcf86cd799439011/master.m3u8?sv=2021-06-08&sig=...",
    "expiresAt": "2024-01-16T10:00:00Z",
    "expiresIn": 86400,
    "permissions": "r",
    "contentType": "application/x-mpegURL",
    "videoId": "507f1f77bcf86cd799439011",
    "playlistName": "master.m3u8"
  }
}
```

---

### 4. Validate SAS Token Expiry

Check if a SAS token is expired or needs refresh.

**Endpoint:** `POST /validate`

**Authentication:** Not required

**Request Body:**

```json
{
  "sasUrl": "https://account.blob.core.windows.net/videos/...?sv=2021-06-08&sig=..."
}
```

**Success Response (200):**

```json
{
  "statusCode": 200,
  "message": "SAS token validity checked successfully",
  "success": true,
  "data": {
    "isExpired": false,
    "expiresAt": "2024-01-15T10:00:00Z",
    "timeRemaining": 1800,
    "shouldRefresh": false,
    "timestamp": "2024-01-15T09:30:00Z"
  }
}
```

**Notes:**

- `timeRemaining` is in seconds
- `shouldRefresh` is `true` if less than 5 minutes remaining
- Use this endpoint before critical operations to avoid mid-stream failures

---

### 5. Refresh SAS Token

Refresh an expiring or expired SAS token without re-uploading data.

**Endpoint:** `POST /refresh`

**Authentication:** Required for upload tokens, optional for download/HLS

**Request Body:**

```json
{
  "videoId": "507f1f77bcf86cd799439011",
  "type": "download|upload|hls",
  "blobPath": "507f1f77bcf86cd799439011/chunk-001.ts"
}
```

**Parameters:**

| Field      | Type   | Required    | Description                                |
| ---------- | ------ | ----------- | ------------------------------------------ |
| `videoId`  | string | Yes         | The video ID                               |
| `type`     | string | Yes         | Token type: `download`, `upload`, or `hls` |
| `blobPath` | string | Conditional | Required for `upload` and `hls` types      |

**Example Request:**

```bash
# Refresh download token
POST /api/v1/sas-tokens/refresh
{
  "videoId": "507f1f77bcf86cd799439011",
  "type": "download"
}

# Refresh upload token
POST /api/v1/sas-tokens/refresh
{
  "videoId": "507f1f77bcf86cd799439011",
  "type": "upload",
  "blobPath": "507f1f77bcf86cd799439011/chunk-002.ts"
}
```

**Success Response (200):**

```json
{
  "statusCode": 200,
  "message": "download SAS token refreshed successfully",
  "success": true,
  "data": {
    "sasUrl": "https://account.blob.core.windows.net/videos/507f1f77bcf86cd799439011/master.m3u8?sv=2021-06-08&sig=...",
    "expiresAt": "2024-01-15T11:00:00Z",
    "expiresIn": 3600,
    "permissions": "r",
    "videoId": "507f1f77bcf86cd799439011",
    "type": "download"
  }
}
```

---

## Error Codes

### Standard HTTP Status Codes

| Status | Description                                     |
| ------ | ----------------------------------------------- |
| 200    | Success                                         |
| 400    | Bad request (missing/invalid parameters)        |
| 401    | Unauthorized (authentication required)          |
| 403    | Forbidden (insufficient permissions)            |
| 404    | Not found (video doesn't exist)                 |
| 500    | Server error                                    |
| 503    | Service unavailable (cloud storage unreachable) |

### Cloud Operation Error Codes

| Code                    | Description                   | Action                                |
| ----------------------- | ----------------------------- | ------------------------------------- |
| `SAS_INVALID_FORMAT`    | SAS URL format is invalid     | Check URL format or regenerate token  |
| `SAS_EXPIRED`           | Token has expired             | Call refresh endpoint                 |
| `SAS_NEEDS_REFRESH`     | Token expiring soon           | Preemptively refresh token            |
| `BLOB_NOT_FOUND`        | File doesn't exist in storage | Verify file path                      |
| `BLOB_ACCESS_DENIED`    | Access denied to blob         | Check permissions or regenerate token |
| `CREDENTIALS_INVALID`   | Storage credentials invalid   | Server configuration issue            |
| `SAS_GENERATION_FAILED` | Failed to generate token      | Retry with exponential backoff        |

---

## Frontend Usage Examples

### JavaScript/Fetch Example

```javascript
// Get download token
async function getVideoWithSASToken(videoId) {
  const response = await fetch(`/api/v1/sas-tokens/download/${videoId}`, {
    credentials: "include",
  });

  if (!response.ok) {
    throw new Error(`Failed to get SAS token: ${response.status}`);
  }

  const { data } = await response.json();
  return data; // { sasUrl, expiresAt, expiresIn, permissions }
}

// Check if token needs refresh
async function checkTokenExpiry(sasUrl) {
  const response = await fetch("/api/v1/sas-tokens/validate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ sasUrl }),
  });

  const { data } = await response.json();
  return data; // { isExpired, timeRemaining, shouldRefresh }
}

// Refresh token if needed
async function refreshIfNeeded(sasUrl, videoId, tokenType = "download") {
  const validity = await checkTokenExpiry(sasUrl);

  if (validity.shouldRefresh) {
    const response = await fetch("/api/v1/sas-tokens/refresh", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        videoId,
        type: tokenType,
      }),
    });

    const { data } = await response.json();
    return data.sasUrl; // New SAS URL
  }

  return sasUrl; // Token still valid
}
```

### React Hook Example

```jsx
import { useState, useEffect, useCallback } from "react";

function useVideoSASToken(videoId) {
  const [sasToken, setSasToken] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchToken = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/v1/sas-tokens/download/${videoId}`, {
        credentials: "include",
      });

      if (!response.ok) throw new Error("Failed to get SAS token");

      const { data } = await response.json();
      setSasToken(data);
      setError(null);
    } catch (err) {
      setError(err.message);
      setSasToken(null);
    } finally {
      setLoading(false);
    }
  }, [videoId]);

  useEffect(() => {
    fetchToken();
  }, [fetchToken]);

  return { sasToken, loading, error, refetch: fetchToken };
}

// Usage in component
export function VideoPlayer({ videoId }) {
  const { sasToken, loading, error } = useVideoSASToken(videoId);

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <video controls>
      <source src={sasToken.sasUrl} type="application/x-mpegURL" />
    </video>
  );
}
```

### Token Refresh Strategy

```javascript
// Automatic token refresh on demand
class SASTokenManager {
  constructor(videoId, tokenType = "download") {
    this.videoId = videoId;
    this.tokenType = tokenType;
    this.token = null;
    this.refreshTimer = null;
  }

  async getToken(forceRefresh = false) {
    // If we don't have a token or force refresh requested
    if (!this.token || forceRefresh) {
      this.token = await this._generateToken();
      this._scheduleRefresh();
      return this.token;
    }

    // If token exists, check if refresh is needed
    const validity = await fetch("/api/v1/sas-tokens/validate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sasUrl: this.token.sasUrl }),
    })
      .then((r) => r.json())
      .then((r) => r.data);

    if (validity.shouldRefresh) {
      this.token = await this._refreshToken();
      this._scheduleRefresh();
    }

    return this.token;
  }

  async _generateToken() {
    const endpoint =
      this.tokenType === "download"
        ? `/api/v1/sas-tokens/download/${this.videoId}`
        : `/api/v1/sas-tokens/upload/${this.videoId}`;

    const response = await fetch(endpoint, {
      credentials: "include",
    });

    return (await response.json()).data;
  }

  async _refreshToken() {
    const response = await fetch("/api/v1/sas-tokens/refresh", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        videoId: this.videoId,
        type: this.tokenType,
      }),
    });

    return (await response.json()).data;
  }

  _scheduleRefresh() {
    if (this.refreshTimer) clearTimeout(this.refreshTimer);

    // Refresh when 5 minutes remain
    const refreshIn = (this.token.expiresIn - 300) * 1000;
    this.refreshTimer = setTimeout(
      () => this._refreshToken(),
      Math.max(refreshIn, 1000) // At least 1 second
    );
  }

  destroy() {
    if (this.refreshTimer) clearTimeout(this.refreshTimer);
  }
}

// Usage
const tokenManager = new SASTokenManager("videoId123", "download");
const token = await tokenManager.getToken();
console.log(token.sasUrl);
```

---

## Architecture Notes

### Why Direct SAS Token Access?

**Before (Proxy Pattern):**

```
Frontend → Backend → Azure Storage
```

- All file access flows through backend
- Backend becomes bottleneck
- Higher infrastructure costs
- Increased latency

**After (Direct SAS Token Access):**

```
Frontend → (get token from backend) → Azure Storage
Frontend → Azure Storage (using token)
```

- Direct file access after initial token request
- Backend only handles metadata and auth
- Reduced server load by ~80%
- Better scalability and performance

### Token Expiration Strategy

| Token Type       | Default Expiry | Max Expiry | Use Case                 |
| ---------------- | -------------- | ---------- | ------------------------ |
| **Download**     | 1 hour         | 24 hours   | Video streaming          |
| **Upload**       | 15 minutes     | 1 hour     | Chunked upload sessions  |
| **HLS Playlist** | 24 hours       | 7 days     | Master/variant playlists |

Shorter expirations for write operations provide better security while still supporting legitimate use cases.

### Permission Scope

Tokens are scoped to:

- **Specific blob** - Not entire container
- **Specific operation** - Read-only, write-only, etc.
- **IP restrictions** (future enhancement)
- **Time window** - Expiring tokens

---

## Troubleshooting

### Token Expired During Upload

**Problem:** Upload fails with "SAS signature invalid"

**Solution:**

```javascript
// Catch 403 errors and refresh token
try {
  await uploadToBlob(sasUrl, file);
} catch (error) {
  if (error.status === 403) {
    const newToken = await refreshSASToken(videoId, "upload", blobPath);
    await uploadToBlob(newToken.sasUrl, file);
  }
}
```

### Permission Denied Errors

**Problem:** 403 errors on operations

**Causes:**

- Token permissions insufficient for operation
- Token expired
- Storage credentials invalid

**Solution:**

- Request token with correct type (upload vs download)
- Check token validity before critical operations
- Contact backend team if credentials error

### Slow Token Generation

**Problem:** Token endpoint responds slowly

**Solution:**

- Implement client-side caching
- Refresh proactively before token expires
- Request tokens in parallel for multiple files

---

## Security Best Practices

1. **Always use HTTPS** in production
2. **Never log full SAS URLs** (may contain sensitive signatures)
3. **Use short expiration times** (especially for uploads)
4. **Validate tokens on client before use**
5. **Implement error boundaries** around cloud operations
6. **Monitor token refresh failures** as an indicator of issues
7. **Don't expose Azure storage connection strings** to frontend

---

## Support

For API issues or questions:

- Check error codes against the Error Codes table above
- Enable development logs to see detailed error messages
- Contact backend team with:
  - Request/Response details
  - Timestamp of failure
  - Error code received
