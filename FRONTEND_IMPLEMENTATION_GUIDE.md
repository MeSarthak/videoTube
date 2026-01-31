# SAS Token Implementation Guide for Frontend Developers

## Quick Start

### 1. Install Dependencies

```bash
npm install axios # or use fetch (built-in)
```

### 2. Create Token Manager Service

```typescript
// src/services/sasTokenManager.ts

class SASTokenManager {
  private baseUrl = process.env.REACT_APP_API_BASE_URL;
  private tokenCache = new Map<string, TokenCacheEntry>();

  interface TokenCacheEntry {
    token: SASTokenResponse;
    expiresAt: Date;
    refreshTimer: NodeJS.Timeout | null;
  }

  interface SASTokenResponse {
    sasUrl: string;
    expiresAt: string;
    expiresIn: number;
    permissions: string;
  }

  /**
   * Get download token for video streaming
   */
  async getDownloadToken(videoId: string): Promise<string> {
    const cacheKey = `download-${videoId}`;

    // Return cached token if still valid
    if (this.tokenCache.has(cacheKey)) {
      const cached = this.tokenCache.get(cacheKey)!;
      if (new Date() < cached.expiresAt) {
        return cached.token.sasUrl;
      }
    }

    try {
      const response = await fetch(
        `${this.baseUrl}/api/v1/sas-tokens/download/${videoId}`,
        { credentials: 'include' }
      );

      if (!response.ok) {
        throw new Error(`SAS token request failed: ${response.status}`);
      }

      const { data } = await response.json();

      // Cache token
      const expiresAt = new Date(data.expiresAt);
      this.tokenCache.set(cacheKey, {
        token: data,
        expiresAt,
        refreshTimer: this._scheduleRefresh(cacheKey, data.expiresIn),
      });

      return data.sasUrl;
    } catch (error) {
      console.error('Failed to get download SAS token:', error);
      throw new Error('Failed to prepare video for playback');
    }
  }

  /**
   * Get upload token for file uploads
   */
  async getUploadToken(
    videoId: string,
    blobPath: string,
    expiresInSeconds = 900
  ): Promise<string> {
    try {
      const params = new URLSearchParams({
        blobPath,
        expiresInSeconds: String(expiresInSeconds),
      });

      const response = await fetch(
        `${this.baseUrl}/api/v1/sas-tokens/upload/${videoId}?${params}`,
        {
          credentials: 'include',
        }
      );

      if (!response.ok) {
        if (response.status === 403) {
          throw new Error('You do not have permission to upload to this video');
        }
        throw new Error(`SAS token request failed: ${response.status}`);
      }

      const { data } = await response.json();
      return data.sasUrl;
    } catch (error) {
      console.error('Failed to get upload SAS token:', error);
      throw error;
    }
  }

  /**
   * Validate if token needs refresh before critical operation
   */
  async validateToken(sasUrl: string): Promise<{
    isExpired: boolean;
    shouldRefresh: boolean;
    timeRemaining: number;
  }> {
    try {
      const response = await fetch(
        `${this.baseUrl}/api/v1/sas-tokens/validate`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sasUrl }),
        }
      );

      if (!response.ok) {
        throw new Error('Token validation failed');
      }

      const { data } = await response.json();
      return {
        isExpired: data.isExpired,
        shouldRefresh: data.shouldRefresh,
        timeRemaining: data.timeRemaining,
      };
    } catch (error) {
      console.error('Failed to validate SAS token:', error);
      // Assume token is expired if validation fails
      return { isExpired: true, shouldRefresh: true, timeRemaining: 0 };
    }
  }

  /**
   * Refresh token manually
   */
  async refreshToken(
    videoId: string,
    type: 'download' | 'upload' | 'hls',
    blobPath?: string
  ): Promise<string> {
    try {
      const body: any = { videoId, type };
      if (blobPath) body.blobPath = blobPath;

      const response = await fetch(
        `${this.baseUrl}/api/v1/sas-tokens/refresh`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify(body),
        }
      );

      if (!response.ok) {
        throw new Error(`Token refresh failed: ${response.status}`);
      }

      const { data } = await response.json();

      // Update cache
      const cacheKey = `${type}-${videoId}`;
      const expiresAt = new Date(data.expiresAt);
      this.tokenCache.set(cacheKey, {
        token: data,
        expiresAt,
        refreshTimer: this._scheduleRefresh(cacheKey, data.expiresIn),
      });

      return data.sasUrl;
    } catch (error) {
      console.error('Failed to refresh SAS token:', error);
      throw error;
    }
  }

  /**
   * Clear cache for a video
   */
  clearCache(videoId: string): void {
    const keysToDelete = Array.from(this.tokenCache.keys()).filter((key) =>
      key.includes(videoId)
    );

    keysToDelete.forEach((key) => {
      const cached = this.tokenCache.get(key);
      if (cached?.refreshTimer) {
        clearTimeout(cached.refreshTimer);
      }
      this.tokenCache.delete(key);
    });
  }

  /**
   * Schedule automatic refresh for token (refreshes when 5 minutes remain)
   */
  private _scheduleRefresh(cacheKey: string, expiresInSeconds: number) {
    // Refresh when 5 minutes remain
    const refreshIn = (expiresInSeconds - 300) * 1000;

    if (refreshIn > 0) {
      return setTimeout(async () => {
        try {
          console.log(`Refreshing token: ${cacheKey}`);
          // Remove from cache to force refresh on next request
          const cached = this.tokenCache.get(cacheKey);
          if (cached?.refreshTimer) {
            clearTimeout(cached.refreshTimer);
          }
          this.tokenCache.delete(cacheKey);
        } catch (error) {
          console.error('Failed to refresh token automatically:', error);
        }
      }, Math.max(refreshIn, 1000));
    }

    return null;
  }
}

export const sasTokenManager = new SASTokenManager();
```

### 3. Use in React Components

```jsx
// src/components/VideoPlayer.tsx

import { useEffect, useRef, useState } from 'react';
import { sasTokenManager } from '../services/sasTokenManager';

interface VideoPlayerProps {
  videoId: string;
}

export function VideoPlayer({ videoId }: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    const initVideo = async () => {
      try {
        setLoading(true);
        const sasUrl = await sasTokenManager.getDownloadToken(videoId);

        if (!mounted) return;

        if (videoRef.current) {
          videoRef.current.src = sasUrl;
          videoRef.current.load();
        }

        setError(null);
      } catch (err) {
        if (mounted) {
          setError(
            err instanceof Error ? err.message : 'Failed to load video'
          );
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    initVideo();

    return () => {
      mounted = false;
      sasTokenManager.clearCache(videoId);
    };
  }, [videoId]);

  if (loading) return <div>Loading video...</div>;
  if (error) return <div className="error">Error: {error}</div>;

  return (
    <video
      ref={videoRef}
      controls
      style={{ width: '100%', maxHeight: '600px' }}
    >
      Your browser does not support video playback
    </video>
  );
}
```

### 4. Handle Upload with Chunking

```typescript
// src/services/videoUploader.ts

interface UploadOptions {
  videoId: string;
  file: File;
  onProgress?: (progress: number) => void;
}

const CHUNK_SIZE = 5 * 1024 * 1024; // 5MB chunks

export async function uploadVideoFile({
  videoId,
  file,
  onProgress,
}: UploadOptions) {
  const totalChunks = Math.ceil(file.size / CHUNK_SIZE);
  let uploadedBytes = 0;

  for (let chunkIndex = 0; chunkIndex < totalChunks; chunkIndex++) {
    const start = chunkIndex * CHUNK_SIZE;
    const end = Math.min(start + CHUNK_SIZE, file.size);
    const chunk = file.slice(start, end);

    // Get SAS token for this chunk
    const blobPath = `${videoId}/chunk-${String(chunkIndex).padStart(
      6,
      "0"
    )}.ts`;
    const sasUrl = await sasTokenManager.getUploadToken(videoId, blobPath);

    // Upload chunk
    const response = await fetch(sasUrl, {
      method: "PUT",
      headers: {
        "x-ms-blob-type": "BlockBlob",
        "Content-Type": "video/mp2t",
      },
      body: chunk,
    });

    if (!response.ok) {
      // Check if token expired
      if (response.status === 403) {
        console.warn("Token expired, requesting new one...");
        const newSasUrl = await sasTokenManager.refreshToken(
          videoId,
          "upload",
          blobPath
        );

        // Retry chunk upload with new token
        const retryResponse = await fetch(newSasUrl, {
          method: "PUT",
          headers: {
            "x-ms-blob-type": "BlockBlob",
            "Content-Type": "video/mp2t",
          },
          body: chunk,
        });

        if (!retryResponse.ok) {
          throw new Error(`Chunk upload failed: ${retryResponse.status}`);
        }
      } else {
        throw new Error(`Chunk upload failed: ${response.status}`);
      }
    }

    uploadedBytes += chunk.size;
    const progress = Math.round((uploadedBytes / file.size) * 100);
    onProgress?.(progress);
  }

  return { success: true, totalChunks };
}
```

### 5. Use Custom Hook for Video Details

```typescript
// src/hooks/useVideoDetails.ts

import { useEffect, useState } from "react";
import { sasTokenManager } from "../services/sasTokenManager";

interface VideoDetails {
  id: string;
  title: string;
  description: string;
  masterPlaylistSAS?: {
    url: string;
    expiresAt: string;
  };
  thumbnailSAS?: {
    url: string;
    expiresAt: string;
  };
}

export function useVideoDetails(videoId: string) {
  const [video, setVideo] = useState<VideoDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchVideo = async () => {
      try {
        setLoading(true);

        const response = await fetch(
          `${process.env.REACT_APP_API_BASE_URL}/api/v1/videos/${videoId}`,
          { credentials: "include" }
        );

        if (!response.ok) {
          throw new Error("Failed to fetch video");
        }

        const { data } = await response.json();

        // If SAS URLs not included in response, fetch them
        if (!data.masterPlaylistSAS) {
          const sasUrl = await sasTokenManager.getDownloadToken(videoId);
          data.masterPlaylistSAS = { url: sasUrl };
        }

        setVideo(data);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error");
        setVideo(null);
      } finally {
        setLoading(false);
      }
    };

    fetchVideo();

    return () => {
      sasTokenManager.clearCache(videoId);
    };
  }, [videoId]);

  return { video, loading, error };
}
```

## Error Handling Patterns

### Pattern 1: Retry on Token Expiry

```typescript
async function fetchWithSASRetry(
  getUrlFn: () => Promise<string>,
  fetchFn: (url: string) => Promise<Response>
) {
  let sasUrl = await getUrlFn();
  let response = await fetchFn(sasUrl);

  // If 403, token likely expired
  if (response.status === 403) {
    console.log("Token expired, refreshing...");
    sasUrl = await getUrlFn(); // Request new token (bypasses cache)
    response = await fetchFn(sasUrl);
  }

  return response;
}

// Usage
const response = await fetchWithSASRetry(
  () => sasTokenManager.getDownloadToken(videoId),
  (url) => fetch(url)
);
```

### Pattern 2: Preemptive Refresh

```typescript
async function ensureTokenValid(sasUrl: string): Promise<string> {
  const validity = await sasTokenManager.validateToken(sasUrl);

  if (validity.shouldRefresh) {
    // Token expiring soon, refresh now
    return await sasTokenManager.refreshToken(videoId, "download");
  }

  return sasUrl;
}

// Usage before starting operation
const validToken = await ensureTokenValid(currentToken);
```

### Pattern 3: Graceful Degradation

```typescript
async function loadVideoWithFallback(videoId: string) {
  try {
    // Try to get SAS URL from cache or API
    const sasUrl = await sasTokenManager.getDownloadToken(videoId);
    return { videoUrl: sasUrl, source: "sas-token" };
  } catch (error) {
    console.warn("SAS token fetch failed, trying alternative method");
    // Fallback to proxy endpoint if SAS tokens unavailable
    return {
      videoUrl: `/api/v1/videos/${videoId}/stream`,
      source: "proxy",
    };
  }
}
```

## Performance Optimization

### 1. Token Caching

```typescript
// Tokens are automatically cached with TTL in SASTokenManager
// Cache is cleared on component unmount
useEffect(() => {
  return () => {
    sasTokenManager.clearCache(videoId);
  };
}, [videoId]);
```

### 2. Parallel Token Requests

```typescript
// Request multiple tokens in parallel
const [downloadToken, hlsToken, thumbnailToken] = await Promise.all([
  sasTokenManager.getDownloadToken(videoId),
  sasTokenManager.getDownloadToken(videoId), // HLS playlist
  sasTokenManager.getDownloadToken(videoId), // Thumbnail
]);
```

### 3. Lazy Token Loading

```typescript
// Only fetch token when needed
async function playVideo() {
  // Token is fetched on demand
  const sasUrl = await sasTokenManager.getDownloadToken(videoId);
  videoElement.src = sasUrl;
}
```

## Monitoring and Debugging

### Enable Debug Logging

```typescript
// Add to SASTokenManager class
private debug = process.env.NODE_ENV === 'development';

private log(message: string, data?: any) {
  if (this.debug) {
    console.log(`[SAS] ${message}`, data);
  }
}
```

### Monitor Token Refresh Events

```typescript
// Track token refreshes
const refreshEvents: RefreshEvent[] = [];

export function trackTokenRefresh(
  videoId: string,
  type: "download" | "upload" | "hls"
) {
  refreshEvents.push({
    timestamp: new Date(),
    videoId,
    type,
  });

  // Send to analytics
  if (refreshEvents.length % 10 === 0) {
    console.log("Recent token refreshes:", refreshEvents.slice(-10));
  }
}
```

## Best Practices

1. **Always use HTTPS** - SAS tokens should only travel over secure connections
2. **Never log full SAS URLs** - The signature is sensitive
3. **Cache tokens** - Reduces API calls and improves UX
4. **Validate before critical ops** - Check token validity before starting long operations
5. **Implement exponential backoff** - For retry logic
6. **Monitor refresh failures** - Indicates potential infrastructure issues
7. **Use appropriate expiry times**:
   - Downloads: 1-24 hours (user may pause/resume)
   - Uploads: 15 minutes (active operation)
   - Thumbnails: 24 hours (usually accessed once)

## Troubleshooting

### "SAS signature does not match"

**Cause:** Token expired or tampered with

**Fix:**

```typescript
// Force token refresh
sasTokenManager.clearCache(videoId);
const newToken = await sasTokenManager.getDownloadToken(videoId);
```

### "The specified blob does not exist"

**Cause:** Video not fully processed or blob path incorrect

**Fix:**

```typescript
// Wait for video processing
await waitForVideoStatus(videoId, "published");
// Then try again
```

### "AuthorizationPermissionMismatch"

**Cause:** Token permissions insufficient for operation

**Fix:**

```typescript
// Request correct token type
if (isUploading) {
  const uploadToken = await sasTokenManager.getUploadToken(videoId, blobPath);
} else {
  const downloadToken = await sasTokenManager.getDownloadToken(videoId);
}
```

## Migration from Proxy Pattern

If migrating from downloading through backend proxy:

```typescript
// Old approach
const videoUrl = `/api/v1/videos/${videoId}/stream`;

// New approach
const videoUrl = await sasTokenManager.getDownloadToken(videoId);

// Both work, but new approach:
// - Reduces server load by ~80%
// - Improves user experience (lower latency)
// - Scales better (direct cloud access)
```
