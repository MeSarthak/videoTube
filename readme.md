# VideoTube Backend API Documentation

This project is a scalable video streaming platform backend built with Node.js, Express, MongoDB, and Redis. It follows a strict **MVC + Service Layer** architecture.

## 🚀 Getting Started

### Prerequisites

- Node.js (v18+)
- MongoDB (Local or Atlas)
- Redis (Local or Cloud)
- Cloudinary Account (for images)
- Azure Blob Storage Account (for videos)

### Installation

1.  Clone the repository:

    ```bash
    git clone https://github.com/MeSarthak/videotube-backend.git
    cd videotube-backend
    ```

2.  Install dependencies:

    ```bash
    npm install
    ```

3.  Set up environment variables (`.env`):

    ```env
    PORT=8000
    MONGODB_URI=mongodb://localhost:27017/videotube
    # ⚠️ In production, replace '*' with your specific frontend domain(s)
    # ⚠️ SECURITY: Generate strong random secrets for production (use: openssl rand -base64 32)
    ACCESS_TOKEN_SECRET=your_access_token_secret
    ACCESS_TOKEN_EXPIRY=1d
    REFRESH_TOKEN_SECRET=your_refresh_token_secret
    REFRESH_TOKEN_EXPIRY=10d
    # Get these from your Cloudinary dashboard
    CLOUDINARY_CLOUD_NAME=your_cloud_name
    CLOUDINARY_API_KEY=your_api_key
    CLOUDINARY_API_SECRET=your_api_secret
    CLOUDINARY_API_SECRET=your_api_secret
    REDIS_URL=redis://localhost:6379
    ```

4.  Start the development server:
    ```bash
    npm run dev
    ```

---

## 📡 API Endpoints

All API routes are prefixed with `/api/v1`.

**Auth Legend:**

- ✅ Authentication required
- ❌ No authentication required
- ⚠️ Authentication optional (provides additional data/features when authenticated)

#### Authentication

Protected routes (marked with ✅) require an access token. To authenticate:

1. **Obtain tokens:** Login via `POST /api/v1/users/login` with your credentials. The response includes:
   - `accessToken` - Short-lived token for API requests
   - `refreshToken` - Long-lived token to obtain new access tokens

2. **Send access token:** Include the access token in the `Authorization` header for all protected endpoints:

   ```
   Authorization: Bearer <access_token>
   ```

3. **Refresh tokens:** When the access token expires, use `POST /api/v1/users/refresh-token` with your refresh token (sent via cookie or request body) to get a new access token.

**Protected endpoints include:**

- All `/users/*` routes except `/register`, `/login`, and `/refresh-token`
- Video upload and status: `/videos/upload-abr`, `/videos/status/:videoId`
- All `/dashboard/*` routes
- All `/tweets/*`, `/playlists/*`, `/subscriptions/*`, `/likes/*`, and `/comments/*` routes
- `/notifications/*` routes

**Optional authentication (⚠️):** Some endpoints like `/videos/:videoId` work without authentication but provide additional data when authenticated (e.g., user's like status, watch history).

### 1. Authentication (`/users`)

| Method  | Endpoint                 | Description              | Auth | Body Params                                                                       |
| :------ | :----------------------- | :----------------------- | :--- | :-------------------------------------------------------------------------------- |
| `POST`  | `/users/register`        | Register a new user      | ❌   | `email`, `username`, `password`, `fullname`, `avatar` (file), `coverImage` (file) |
| `POST`  | `/users/login`           | Login user & get tokens  | ❌   | `email` or `username`, `password`                                                 |
| `POST`  | `/users/logout`          | Logout user              | ✅   | -                                                                                 |
| `POST`  | `/users/refresh-token`   | Refresh access token     | ❌   | `refreshToken` (cookie or body)                                                   |
| `POST`  | `/users/change-password` | Change current password  | ✅   | `oldPassword`, `newPassword`                                                      |
| `GET`   | `/users/current-user`    | Get current user details | ✅   | -                                                                                 |
| `PATCH` | `/users/update-account`  | Update account details   | ✅   | `email`, `fullname`                                                               |
| `PATCH` | `/users/avatar`          | Update avatar image      | ✅   | `avatar` (file)                                                                   |
| `PATCH` | `/users/cover-image`     | Update cover image       | ✅   | `coverImage` (file)                                                               |
| `GET`   | `/users/c/:username`     | Get channel profile      | ✅   | -                                                                                 |
| `GET`   | `/users/history`         | Get watch history        | ✅   | -                                                                                 |

### 2. Videos (`/videos`)

| Method  | Endpoint                   | Description                                        | Auth | Query Params / Body                                                                                    |
| :------ | :------------------------- | :------------------------------------------------- | :--- | :----------------------------------------------------------------------------------------------------- |
| `POST`  | `/videos/upload-abr`       | Upload video (HLS) with auto-subtitles             | ✅   | Body: `video` (file), `title`, `description`, `subtitleLanguage` (optional), `subtitleTask` (optional) |
| `GET`   | `/videos`                  | Search & Home Feed                                 | ❌   | Query: `page`, `limit`, `query`, `sortBy`, `sortType`, `userId`                                        |
| `GET`   | `/videos/:videoId`         | Get video details                                  | ⚠️   | -                                                                                                      |
| `GET`   | `/videos/:videoId/related` | Get related videos (same channel or similar title) | ❌   | Query: `limit` (default 10)                                                                            |
| `PATCH` | `/videos/:videoId/views`   | Increment view count                               | ❌   | -                                                                                                      |
| `GET`   | `/videos/status/:videoId`  | Check processing status                            | ✅   | -                                                                                                      |

**Subtitle Options for Upload:**

- `subtitleLanguage`: Language code for transcription. Use `auto` for auto-detection or specify a language code (e.g., `en`, `es`, `fr`, `hi`). Default: `auto`
- `subtitleTask`: Either `transcribe` (keep original language) or `translate` (translate to English). Default: `transcribe`

### 3. Subtitles (`/subtitles` & `/videos/:videoId/subtitles`)

Automatic subtitle generation powered by OpenAI Whisper. Supports 99+ languages with auto-detection.

| Method | Endpoint                                | Description                       | Auth | Body Params                  |
| :----- | :-------------------------------------- | :-------------------------------- | :--- | :--------------------------- |
| `GET`  | `/subtitles/languages`                  | Get all 99+ supported languages   | ❌   | -                            |
| `GET`  | `/videos/:videoId/subtitles`            | Get subtitle info (status, files) | ❌   | -                            |
| `GET`  | `/videos/:videoId/subtitles/:format`    | Get subtitle file URL             | ❌   | `:format` = srt/vtt/json/txt |
| `POST` | `/videos/:videoId/subtitles/regenerate` | Regenerate subtitles (owner only) | ✅   | `language`, `task`           |

**Supported Formats:**

- **SRT**: SubRip format - widely supported by video players and editors
- **VTT**: WebVTT format - standard for HTML5 video players
- **JSON**: Detailed segment data with timestamps
- **TXT**: Plain text transcript without timestamps (for SEO/accessibility)

**Subtitle Response Schema:**

```json
{
  "subtitles": {
    "status": "completed", // pending, processing, completed, failed
    "language": "auto", // User-requested language
    "detectedLanguage": "en", // Auto-detected language
    "task": "transcribe", // transcribe or translate
    "files": {
      "srt": "https://...",
      "vtt": "https://...",
      "json": "https://...",
      "txt": "https://..."
    },
    "segmentCount": 42,
    "processedAt": "2026-02-14T..."
  }
}
```

### 4. Dashboard (`/dashboard`)

| Method | Endpoint            | Description                        | Auth |
| :----- | :------------------ | :--------------------------------- | :--- |
| `GET`  | `/dashboard/stats`  | Get total views, subs, videos, etc | ✅   |
| `GET`  | `/dashboard/videos` | Get all videos uploaded by user    | ✅   |

### 5. Community / Tweets (`/tweets`)

| Method   | Endpoint               | Description       | Auth | Body Params |
| :------- | :--------------------- | :---------------- | :--- | :---------- |
| `POST`   | `/tweets`              | Create a tweet    | ✅   | `content`   |
| `GET`    | `/tweets/user/:userId` | Get user's tweets | ✅   | -           |
| `PATCH`  | `/tweets/:tweetId`     | Update a tweet    | ✅   | `content`   |
| `DELETE` | `/tweets/:tweetId`     | Delete a tweet    | ✅   | -           |

### 6. Playlists (`/playlists`)

| Method   | Endpoint                                 | Description             | Auth | Body Params           |
| :------- | :--------------------------------------- | :---------------------- | :--- | :-------------------- |
| `POST`   | `/playlists`                             | Create playlist         | ✅   | `name`, `description` |
| `GET`    | `/playlists/:playlistId`                 | Get playlist by ID      | ✅   | -                     |
| `PATCH`  | `/playlists/:playlistId`                 | Update playlist details | ✅   | `name`, `description` |
| `DELETE` | `/playlists/:playlistId`                 | Delete playlist         | ✅   | -                     |
| `PATCH`  | `/playlists/add/:videoId/:playlistId`    | Add video to playlist   | ✅   | -                     |
| `PATCH`  | `/playlists/remove/:videoId/:playlistId` | Remove video from list  | ✅   | -                     |
| `GET`    | `/playlists/user/:userId`                | Get user's playlists    | ✅   | -                     |

### 7. Subscriptions (`/subscriptions`)

| Method | Endpoint                         | Description                  | Auth |
| :----- | :------------------------------- | :--------------------------- | :--- |
| `POST` | `/subscriptions/c/:channelId`    | Toggle Subscribe/Unsubscribe | ✅   |
| `GET`  | `/subscriptions/c/:channelId`    | Get subscribers list         | ✅   |
| `GET`  | `/subscriptions/u/:subscriberId` | Get subscribed channels list | ✅   |

### 8. Likes (`/likes`)

| Method | Endpoint                     | Description            | Auth |
| :----- | :--------------------------- | :--------------------- | :--- |
| `POST` | `/likes/toggle/v/:videoId`   | Toggle like on video   | ✅   |
| `POST` | `/likes/toggle/c/:commentId` | Toggle like on comment | ✅   |
| `POST` | `/likes/toggle/t/:tweetId`   | Toggle like on tweet   | ✅   |
| `GET`  | `/likes/videos`              | Get all liked videos   | ✅   |

### 9. Comments (`/comments`)

| Method   | Endpoint                 | Description            | Auth | Body Params            |
| :------- | :----------------------- | :--------------------- | :--- | :--------------------- |
| `GET`    | `/comments/:videoId`     | Get comments for video | ✅   | Query: `page`, `limit` |
| `POST`   | `/comments/:videoId`     | Add a comment          | ✅   | `content`              |
| `PATCH`  | `/comments/c/:commentId` | Update a comment       | ✅   | `content`              |
| `DELETE` | `/comments/c/:commentId` | Delete a comment       | ✅   | -                      |

### 10. Notifications (`/notifications`)

| Method  | Endpoint                       | Description                       | Auth | Query Params           |
| :------ | :----------------------------- | :-------------------------------- | :--- | :--------------------- |
| `GET`   | `/notifications`               | Get list of notifications         | ✅   | Query: `page`, `limit` |
| `GET`   | `/notifications/unread-count`  | Get count of unread notifications | ✅   | -                      |
| `PATCH` | `/notifications/:id/read`      | Mark a notification as read       | ✅   | -                      |
| `PATCH` | `/notifications/mark-all-read` | Mark all notifications as read    | ✅   | -                      |

### 11. Health Check (`/health-check`)

| Method | Endpoint        | Description         | Auth |
| :----- | :-------------- | :------------------ | :--- |
| `GET`  | `/health-check` | Check system health | ❌   |

## 📦 Data Structures (Responses)

The API uses a standardized response format for all requests:

**Success Response:**

```json
{
  "statusCode": 200, // or 201
  "data": { ... },   // Payload
  "message": "Success message",
  "success": true
}
```

**Error Response:**

```json
{
  "statusCode": 400, // or 401, 404, 500
  "message": "Error description",
  "success": false,
  "errors": [] // Optional detailed errors
}
```

---

## 🛠 Tech Stack

- **Runtime:** Node.js
- **Framework:** Express.js
- **Database:** MongoDB (Mongoose)
- **Caching/Queues:** Redis (BullMQ)
- **Storage:** Cloudinary (Images), Azure Blob Storage (Videos & Subtitles)
- **Video Processing:** FFmpeg (HLS Transcoding)
- **Transcription:** OpenAI Whisper (99+ languages, auto-detection)
- **Testing:** Jest, Supertest

---

## ⚙️ Environment Variables

```env
# Server
PORT=8000
MONGODB_URI=mongodb://localhost:27017/videotube
CORS_ORIGIN=*

# Authentication (Generate strong secrets for production)
ACCESS_TOKEN_SECRET=your_access_token_secret
ACCESS_TOKEN_EXPIRY=1d
REFRESH_TOKEN_SECRET=your_refresh_token_secret
REFRESH_TOKEN_EXPIRY=10d

# Cloudinary (Images)
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret

# Azure Blob Storage (Videos & Subtitles)
STORAGE_ACCOUNT_NAME=your_account_name
CONTAINER_NAME=your_container_name
AZURE_STORAGE_CONNECTION_STRING=your_connection_string
SAS_TOKEN=your_sas_token

# Redis (Queues)
REDIS_URL=redis://localhost:6379

# Whisper Transcription
WHISPER_MODEL=base  # Options: tiny, base, small, medium, large
```

---
