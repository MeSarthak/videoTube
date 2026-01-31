# VideoTube Backend Documentation

**For Frontend Engineers** - Complete API Reference & Architecture Guide

---

## Table of Contents

1. [Backend Overview](#backend-overview)
2. [Architecture & Design](#architecture--design)
3. [Authentication & Authorization](#authentication--authorization)
4. [API Endpoints Reference](#api-endpoints-reference)
5. [Data Models](#data-models)
6. [Error Handling](#error-handling)
7. [File Upload System](#file-upload-system)
8. [SAS Token System](#sas-token-system)
9. [Best Practices](#best-practices)
10. [Common Workflows](#common-workflows)

---

## Backend Overview

### What is VideoTube?

VideoTube is a YouTube-like video streaming platform built with:

- **Backend:** Node.js + Express.js
- **Database:** MongoDB
- **Cloud Storage:** Azure Blob Storage
- **Video Processing:** HLS (HTTP Live Streaming) format

### Key Features

✅ **User Authentication** - Registration, login, JWT tokens
✅ **Video Management** - Upload, process, stream videos
✅ **Social Features** - Likes, comments, subscriptions, playlists, tweets
✅ **Dashboard Analytics** - View counts, subscriber stats
✅ **Notifications** - User engagement alerts
✅ **Cloud Storage** - Direct SAS token-based access

### Base URL

```
http://localhost:5000/api/v1
```

---

## Architecture & Design

### MVC Architecture

The backend follows **Model-View-Controller** pattern:

```
Request → Middleware → Controller → Service → Model → Database
                                   ↓
                                  Response
```

### Directory Structure

```
src/
├── models/              # Database schemas (MongoDB)
│   ├── user.model.js
│   ├── video.model.js
│   ├── comment.model.js
│   ├── like.model.js
│   ├── subscription.model.js
│   ├── playlist.model.js
│   ├── tweet.model.js
│   └── notification.model.js
│
├── controllers/         # Request handlers
│   ├── user.controller.js
│   ├── video.controller.js
│   ├── comment.controller.js
│   └── ...
│
├── services/           # Business logic
│   ├── user.service.js
│   ├── video.service.js
│   ├── sas-token.service.js
│   └── ...
│
├── routes/            # API endpoints
│   ├── user.routes.js
│   ├── video.routes.js
│   ├── sas-token.routes.js
│   └── ...
│
├── middlewares/       # Request interceptors
│   ├── auth.middleware.js
│   └── diskStorageMulter.middleware.js
│
├── utils/            # Helper functions
│   ├── asyncHandler.js
│   ├── ApiError.js
│   ├── ApiResponse.js
│   ├── cloudErrorHandler.js
│   └── ...
│
├── queues/          # Background jobs
│   └── video.queue.js
│
└── workers/         # Job processors
    └── video.worker.js
```

### Request-Response Flow

```
1. Frontend sends HTTP request
2. Express receives & logs request
3. CORS middleware validates origin
4. Authentication middleware checks JWT (if required)
5. Route matches to controller
6. Controller calls service layer
7. Service executes business logic
8. Database queries executed
9. Response formatted & sent back
10. Middleware finalizes response
```

---

## Authentication & Authorization

### JWT (JSON Web Tokens)

The backend uses **JWT** for stateless authentication.

#### How JWT Works

```
1. User registers/logs in
2. Backend creates JWT token
3. Token sent to frontend
4. Frontend stores in cookies or localStorage
5. Frontend sends token with each request
6. Backend verifies token signature
7. If valid, allow request; if invalid, reject
```

#### Token Structure

```
Header.Payload.Signature

Example:
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.
eyJfaWQiOiI2NTBhZjM4YzQyZjRmZmFiYzExZjAyMzQiLCJ1c2VybmFtZSI6ImpvaG4ifQ.
sjLCvdz0H3qXQeFxKZ_XoF8L1U8ZqjZqZzZjZZ8jQ
```

### Token Types

#### 1. Access Token

- **Purpose:** Authenticate API requests
- **Expiry:** 1 day (from `.env`)
- **Storage:** Cookie or Authorization header
- **Format:** `Bearer <access_token>`

#### 2. Refresh Token

- **Purpose:** Generate new access token when expired
- **Expiry:** 10 days (from `.env`)
- **Storage:** HTTP-only cookie
- **Security:** Never exposed to JavaScript

### Using Tokens

#### Send with Request

**Option 1: Cookie (Automatic)**

```javascript
// Cookie is sent automatically by browser
fetch("http://localhost:5000/api/v1/users/logout", {
  method: "POST",
  credentials: "include", // Important: include cookies
});
```

**Option 2: Authorization Header**

```javascript
fetch("http://localhost:5000/api/v1/users/logout", {
  method: "POST",
  headers: {
    Authorization: `Bearer ${accessToken}`,
  },
});
```

### Authentication Middleware

#### verifyJWT - Required Authentication

```javascript
// Applies to protected routes
router.post("/logout", verifyJWT, logoutUser);
```

**What happens:**

1. Extracts token from cookies or Authorization header
2. Verifies token signature
3. Decodes token to get user ID
4. Fetches user from database
5. Attaches user object to `req.user`
6. Calls next handler

**If token invalid:**

```json
{
  "statusCode": 401,
  "message": "Invalid or expired access token",
  "success": false
}
```

#### optionalVerifyJWT - Optional Authentication

```javascript
// Applies to public routes that can show additional info if authenticated
router.get("/:videoId", optionalVerifyJWT, getVideoById);
```

**What happens:**

1. Attempts to verify token
2. If valid, attaches user to `req.user`
3. If invalid, sets `req.user = null`
4. Either way, continues to handler

**Use Case:** Show "like" status only for authenticated users, but video is visible to all.

---

## API Endpoints Reference

### User Management (`/api/v1/users`)

#### 1. Register User

```
POST /register
Content-Type: multipart/form-data

Body:
{
  "username": "johndoe",
  "fullname": "John Doe",
  "email": "john@example.com",
  "password": "securePassword123",
  "avatar": <File>,           // Required
  "coverImage": <File>        // Optional
}

Response (201):
{
  "statusCode": 201,
  "data": {
    "_id": "...",
    "username": "johndoe",
    "email": "john@example.com",
    "fullname": "John Doe",
    "avatar": "cloudinary_url",
    "coverImage": "cloudinary_url"
  },
  "message": "User registered successfully",
  "success": true
}
```

**Validation Rules:**

- Username: unique, lowercase, trimmed
- Email: unique, valid format
- Password: required, hashed with bcrypt
- Avatar: required file upload
- CoverImage: optional file upload

#### 2. Login User

```
POST /login

Body:
{
  "email": "john@example.com",
  "password": "securePassword123"
}

Response (200):
{
  "statusCode": 200,
  "data": {
    "user": {
      "_id": "...",
      "username": "johndoe",
      "email": "john@example.com"
    },
    "accessToken": "eyJhbGc...",
    "refreshToken": "eyJhbGc..."
  },
  "message": "User logged in successfully",
  "success": true
}
```

**Behind the scenes:**

1. Find user by email
2. Verify password with bcrypt
3. Generate new access & refresh tokens
4. Save refresh token to database
5. Send tokens in response & cookies

#### 3. Logout User

```
POST /logout
Authorization: Bearer <accessToken>

Response (200):
{
  "statusCode": 200,
  "data": {},
  "message": "User logged out successfully",
  "success": true
}
```

**What happens:**

- Clears refresh token from database
- Cookie expires automatically

#### 4. Refresh Access Token

```
POST /refresh-token

Body:
{
  "refreshToken": "eyJhbGc..."
}

Response (200):
{
  "statusCode": 200,
  "data": {
    "accessToken": "new_eyJhbGc...",
    "refreshToken": "new_eyJhbGc..."
  },
  "success": true
}
```

#### 5. Change Password

```
POST /changePassword
Authorization: Bearer <accessToken>

Body:
{
  "oldPassword": "oldPass123",
  "newPassword": "newPass456"
}

Response (200):
{
  "statusCode": 200,
  "message": "Password changed successfully",
  "success": true
}
```

#### 6. Update Account Details

```
PATCH /updateAccountDetails
Authorization: Bearer <accessToken>

Body:
{
  "fullname": "John Updated",
  "email": "newemail@example.com"
}

Response (200):
{
  "statusCode": 200,
  "data": {
    "username": "johndoe",
    "fullname": "John Updated",
    "email": "newemail@example.com"
  },
  "message": "Account details updated",
  "success": true
}
```

#### 7. Update Avatar

```
PATCH /updateAvatar
Authorization: Bearer <accessToken>
Content-Type: multipart/form-data

Body:
{
  "avatar": <File>
}

Response (200):
{
  "statusCode": 200,
  "data": { "avatar": "new_cloudinary_url" },
  "message": "Avatar updated successfully",
  "success": true
}
```

#### 8. Update Cover Image

```
PATCH /updateCoverImage
Authorization: Bearer <accessToken>
Content-Type: multipart/form-data

Body:
{
  "coverImage": <File>
}

Response (200):
{
  "statusCode": 200,
  "data": { "coverImage": "new_cloudinary_url" },
  "message": "Cover image updated",
  "success": true
}
```

#### 9. Get User Channel Profile

```
GET /channel/:username

Response (200):
{
  "statusCode": 200,
  "data": {
    "_id": "...",
    "username": "johndoe",
    "fullname": "John Doe",
    "avatar": "url",
    "coverImage": "url",
    "subscribersCount": 150,
    "channelsSubscribedToCount": 45,
    "isSubscribed": false  // Only if authenticated
  },
  "success": true
}
```

#### 10. Get Watch History

```
GET /watch-history
Authorization: Bearer <accessToken>

Response (200):
{
  "statusCode": 200,
  "data": [
    {
      "_id": "video1",
      "title": "Video Title",
      "owner": "...",
      "views": 1000
    }
  ],
  "message": "Watch history fetched",
  "success": true
}
```

---

### Video Management (`/api/v1/videos`)

#### 1. Upload Video (HLS Format)

```
POST /upload-abr
Authorization: Bearer <accessToken>
Content-Type: multipart/form-data

Body:
{
  "title": "My Video Title",
  "description": "Video description",
  "video": <File>,          // Required, .mp4, .mkv, etc
  "thumbnail": <File>       // Optional
}

Response (202):
{
  "statusCode": 202,
  "data": {
    "videoId": "507f1f77bcf86cd799439011",
    "status": "pending",
    "message": "Video queued for processing"
  },
  "message": "Video upload accepted and processing started",
  "success": true
}
```

**Behind the scenes:**

1. Receive file upload
2. Store temporarily on disk
3. Create video document with "pending" status
4. Queue job for video processing
5. Return immediately (async processing)

**Status Progression:**

- pending → processing → published (success)
- pending → processing → failed (on error)

#### 2. Get Video Processing Status

```
GET /status/:videoId
Authorization: Bearer <accessToken>

Response (200):
{
  "statusCode": 200,
  "data": {
    "_id": "507f1f77bcf86cd799439011",
    "status": "processing",           // Current status
    "uploadStatus": "processing",
    "masterPlaylist": null,           // HLS playlist URL (when ready)
    "thumbnail": "azure_url"
  },
  "message": "Video status fetched",
  "success": true
}
```

**Status Values:**

- `pending` - Waiting to be processed
- `processing` - Currently being converted
- `published` - Ready to stream
- `failed` - Processing error (check errorMessage)

#### 3. Get All Videos (Paginated)

```
GET /?page=1&limit=10&query=react&sortBy=createdAt&sortType=desc
   &userId=uid&tags=react,node&uploadDate=week
   &durationMin=60&durationMax=600

Query Parameters:
- page (default: 1)
- limit (default: 10)
- query: search in title/description
- sortBy: createdAt, views, duration, mostLiked, mostViewed
- sortType: asc, desc
- userId: filter by uploader
- tags: comma-separated tags
- uploadDate: today, week, month, year
- durationMin: minimum video duration (seconds)
- durationMax: maximum video duration (seconds)

Response (200):
{
  "statusCode": 200,
  "data": {
    "videos": [
      {
        "_id": "...",
        "title": "Video Title",
        "description": "...",
        "thumbnail": "url",
        "owner": { "username": "...", "avatar": "url" },
        "views": 1500,
        "likesCount": 45,
        "isLiked": false,
        "isSubscribed": false
      }
    ],
    "totalVideos": 245,
    "totalPages": 25,
    "currentPage": 1
  },
  "success": true
}
```

#### 4. Get Video Details

```
GET /:videoId

Response (200):
{
  "statusCode": 200,
  "data": {
    "_id": "507f1f77bcf86cd799439011",
    "title": "Video Title",
    "description": "Full description",
    "duration": 300,                    // seconds
    "views": 1500,
    "likesCount": 45,
    "masterPlaylist": "azure_url",      // HLS streaming URL
    "masterPlaylistSAS": {              // SAS token for direct access
      "url": "https://...?sv=2021&sig=...",
      "expiresAt": "2024-01-15T10:00:00Z",
      "permissions": "r"
    },
    "thumbnail": "url",
    "thumbnailSAS": {                   // SAS token for thumbnail
      "url": "https://...?sv=2021&sig=...",
      "expiresAt": "2024-01-15T10:00:00Z"
    },
    "isPublished": true,
    "owner": {
      "_id": "...",
      "username": "johndoe",
      "avatar": "url"
    },
    "isLiked": false,                   // Only if authenticated
    "isSubscribed": false               // Only if authenticated
  },
  "success": true
}
```

#### 5. Increment View Count

```
PATCH /:videoId/views

Body: {} (empty)

Response (200):
{
  "statusCode": 200,
  "data": {},
  "message": "View count incremented",
  "success": true
}
```

**Note:** Call this when user starts watching video or after 30 seconds of watch time.

#### 6. Get Related Videos

```
GET /:videoId/related?limit=10

Response (200):
{
  "statusCode": 200,
  "data": [
    {
      "_id": "...",
      "title": "Related Video",
      "thumbnail": "url",
      "owner": { "username": "..." },
      "views": 800
    }
  ],
  "success": true
}
```

**How it works:**

1. Gets current video's tags/keywords
2. Searches for videos with similar tags
3. Prioritizes videos from same channel
4. Returns limited results

#### 7. Get SAS Token for Download

```
GET /api/v1/sas-tokens/download/:videoId?expiresInSeconds=3600

Response (200):
{
  "statusCode": 200,
  "data": {
    "sasUrl": "https://account.blob.core.windows.net/videos/...?sv=2021&sig=...",
    "expiresAt": "2024-01-15T10:00:00Z",
    "expiresIn": 3600,
    "permissions": "r",
    "videoId": "507f1f77bcf86cd799439011"
  },
  "message": "Download SAS token generated successfully",
  "success": true
}
```

**Use case:** Frontend gets this token and plays video directly from Azure.

---

### Comments (`/api/v1/comments`)

#### 1. Get Video Comments

```
GET /:videoId

Response (200):
{
  "statusCode": 200,
  "data": [
    {
      "_id": "comment_id",
      "content": "Great video!",
      "owner": {
        "_id": "user_id",
        "username": "johndoe",
        "avatar": "url"
      },
      "likes": 12,
      "createdAt": "2024-01-10T10:00:00Z"
    }
  ],
  "success": true
}
```

#### 2. Add Comment

```
POST /:videoId

Body:
{
  "content": "Great video, loved it!"
}

Response (201):
{
  "statusCode": 201,
  "data": {
    "_id": "comment_id",
    "content": "Great video, loved it!",
    "video": "507f1f77bcf86cd799439011",
    "owner": { "username": "current_user" }
  },
  "message": "Comment added successfully",
  "success": true
}
```

#### 3. Update Comment

```
PATCH /c/:commentId

Body:
{
  "content": "Updated comment text"
}

Response (200):
{
  "statusCode": 200,
  "data": { "content": "Updated comment text" },
  "message": "Comment updated",
  "success": true
}
```

#### 4. Delete Comment

```
DELETE /c/:commentId

Response (200):
{
  "statusCode": 200,
  "data": {},
  "message": "Comment deleted successfully",
  "success": true
}
```

---

### Likes (`/api/v1/likes`)

#### 1. Toggle Video Like

```
POST /toggle/v/:videoId

Response (200):
{
  "statusCode": 200,
  "data": {
    "isLiked": true  // true if just liked, false if just unliked
  },
  "message": "Video like toggled",
  "success": true
}
```

#### 2. Toggle Comment Like

```
POST /toggle/c/:commentId

Response (200):
{
  "statusCode": 200,
  "data": { "isLiked": true },
  "success": true
}
```

#### 3. Get User's Liked Videos

```
GET /videos

Response (200):
{
  "statusCode": 200,
  "data": [
    {
      "_id": "video_id",
      "title": "Liked Video",
      "thumbnail": "url",
      "views": 1500
    }
  ],
  "success": true
}
```

---

### Subscriptions (`/api/v1/subscriptions`)

#### 1. Toggle Subscription

```
POST /c/:channelId

Response (200):
{
  "statusCode": 200,
  "data": {
    "isSubscribed": true  // true if just subscribed, false if unsubscribed
  },
  "message": "Subscription toggled",
  "success": true
}
```

#### 2. Get Channel Subscribers

```
GET /c/:channelId

Response (200):
{
  "statusCode": 200,
  "data": [
    {
      "_id": "subscriber_id",
      "username": "subscriber1",
      "avatar": "url",
      "subscribedAt": "2024-01-10T10:00:00Z"
    }
  ],
  "success": true
}
```

#### 3. Get Subscribed Channels

```
GET /u/:userId

Response (200):
{
  "statusCode": 200,
  "data": [
    {
      "_id": "channel_id",
      "username": "channel_name",
      "avatar": "url"
    }
  ],
  "success": true
}
```

---

### Playlists (`/api/v1/playlists`)

#### 1. Create Playlist

```
POST /

Body:
{
  "name": "My Favorites",
  "description": "Collection of my favorite videos"
}

Response (201):
{
  "statusCode": 201,
  "data": {
    "_id": "playlist_id",
    "name": "My Favorites",
    "owner": "user_id",
    "videos": []
  },
  "success": true
}
```

#### 2. Get User Playlists

```
GET /user/:userId

Response (200):
{
  "statusCode": 200,
  "data": [
    {
      "_id": "playlist_id",
      "name": "My Favorites",
      "videosCount": 15,
      "thumbnail": "first_video_thumbnail"
    }
  ],
  "success": true
}
```

#### 3. Get Playlist Details

```
GET /:playlistId

Response (200):
{
  "statusCode": 200,
  "data": {
    "_id": "playlist_id",
    "name": "My Favorites",
    "description": "...",
    "owner": { "username": "..." },
    "videos": [
      {
        "_id": "video_id",
        "title": "...",
        "thumbnail": "...",
        "duration": 300
      }
    ]
  },
  "success": true
}
```

#### 4. Add Video to Playlist

```
PATCH /add/:videoId/:playlistId

Response (200):
{
  "statusCode": 200,
  "data": { "videosCount": 16 },
  "message": "Video added to playlist",
  "success": true
}
```

#### 5. Remove Video from Playlist

```
PATCH /remove/:videoId/:playlistId

Response (200):
{
  "statusCode": 200,
  "message": "Video removed from playlist",
  "success": true
}
```

#### 6. Update Playlist

```
PATCH /:playlistId

Body:
{
  "name": "Updated Name",
  "description": "Updated description"
}

Response (200):
{
  "statusCode": 200,
  "data": { "name": "Updated Name" },
  "success": true
}
```

#### 7. Delete Playlist

```
DELETE /:playlistId

Response (200):
{
  "statusCode": 200,
  "message": "Playlist deleted successfully",
  "success": true
}
```

---

### Tweets (`/api/v1/tweets`)

#### 1. Create Tweet

```
POST /

Body:
{
  "content": "Loving this new video platform!"
}

Response (201):
{
  "statusCode": 201,
  "data": {
    "_id": "tweet_id",
    "content": "...",
    "owner": "user_id",
    "createdAt": "2024-01-10T10:00:00Z"
  },
  "success": true
}
```

#### 2. Get User Tweets

```
GET /user/:userId

Response (200):
{
  "statusCode": 200,
  "data": [ ... ],
  "success": true
}
```

#### 3. Update Tweet

```
PATCH /:tweetId

Body:
{
  "content": "Updated tweet"
}

Response (200):
{
  "statusCode": 200,
  "data": { "content": "Updated tweet" },
  "success": true
}
```

#### 4. Delete Tweet

```
DELETE /:tweetId

Response (200):
{
  "statusCode": 200,
  "message": "Tweet deleted successfully",
  "success": true
}
```

---

### Dashboard (`/api/v1/dashboard`)

#### 1. Get Channel Statistics

```
GET /stats

Response (200):
{
  "statusCode": 200,
  "data": {
    "totalViews": 15000,
    "totalSubscribers": 500,
    "totalVideos": 45,
    "totalLikes": 3200
  },
  "success": true
}
```

#### 2. Get Channel Videos (For Dashboard)

```
GET /videos

Response (200):
{
  "statusCode": 200,
  "data": [
    {
      "_id": "video_id",
      "title": "Video Title",
      "views": 1500,
      "likes": 120,
      "thumbnail": "url"
    }
  ],
  "success": true
}
```

---

### Notifications (`/api/v1/notifications`)

#### 1. Get User Notifications

```
GET /

Response (200):
{
  "statusCode": 200,
  "data": [
    {
      "_id": "notif_id",
      "type": "like",  // like, comment, subscribe, upload_complete
      "message": "John liked your video",
      "relatedUser": { "username": "john" },
      "isRead": false,
      "createdAt": "2024-01-10T10:00:00Z"
    }
  ],
  "success": true
}
```

#### 2. Get Unread Count

```
GET /unread-count

Response (200):
{
  "statusCode": 200,
  "data": { "unreadCount": 5 },
  "success": true
}
```

#### 3. Mark Notification as Read

```
PATCH /:notificationId/read

Response (200):
{
  "statusCode": 200,
  "message": "Marked as read",
  "success": true
}
```

#### 4. Mark All as Read

```
PATCH /mark-all-read

Response (200):
{
  "statusCode": 200,
  "message": "All marked as read",
  "success": true
}
```

---

### SAS Tokens (`/api/v1/sas-tokens`)

#### 1. Get Download SAS Token

```
GET /download/:videoId?expiresInSeconds=3600

Response (200):
{
  "statusCode": 200,
  "data": {
    "sasUrl": "https://account.blob.core.windows.net/videos/...?sv=2021&sig=...",
    "expiresAt": "2024-01-15T10:00:00Z",
    "expiresIn": 3600,
    "permissions": "r"
  },
  "success": true
}
```

#### 2. Get Upload SAS Token

```
GET /upload/:videoId?blobPath=videoId/chunk-001.ts
Authorization: Bearer <accessToken>

Response (200):
{
  "statusCode": 200,
  "data": {
    "sasUrl": "https://...",
    "expiresAt": "2024-01-15T10:15:00Z",
    "expiresIn": 900,
    "permissions": "cw"
  },
  "success": true
}
```

#### 3. Validate SAS Token

```
POST /validate

Body:
{
  "sasUrl": "https://..."
}

Response (200):
{
  "statusCode": 200,
  "data": {
    "isExpired": false,
    "shouldRefresh": false,
    "timeRemaining": 1800
  },
  "success": true
}
```

#### 4. Refresh SAS Token

```
POST /refresh

Body:
{
  "videoId": "...",
  "type": "download|upload|hls"
}

Response (200):
{
  "statusCode": 200,
  "data": {
    "sasUrl": "https://...",
    "expiresAt": "2024-01-15T11:00:00Z",
    "expiresIn": 3600
  },
  "success": true
}
```

---

## Data Models

### User Model

```javascript
{
  _id: ObjectId,
  username: String (unique, lowercase),
  fullname: String,
  email: String (unique),
  password: String (hashed with bcrypt),
  avatar: String (Cloudinary URL),
  coverImage: String (Cloudinary URL),
  watchHistory: [ObjectId],  // References to Video
  refreshToken: String,
  createdAt: Date,
  updatedAt: Date
}
```

**Methods:**

- `isPasswordCorrect(password)` - Verify password
- `generateAccessToken()` - Create JWT access token
- `generateRefreshToken()` - Create JWT refresh token

### Video Model

```javascript
{
  _id: ObjectId,
  title: String,
  description: String,
  tags: [String],
  duration: Number (seconds),
  segmentsBasePath: String,
  masterPlaylist: String (HLS playlist URL),
  variants: [String],
  thumbnail: String,
  views: Number (default: 0),
  isPublished: Boolean (default: true),
  status: String (enum: pending, processing, published, failed),
  uploadStatus: String (enum: pending, processing, completed, failed),
  errorMessage: String,
  owner: ObjectId (ref: User),
  createdAt: Date,
  updatedAt: Date
}
```

### Comment Model

```javascript
{
  _id: ObjectId,
  content: String,
  video: ObjectId (ref: Video),
  owner: ObjectId (ref: User),
  createdAt: Date,
  updatedAt: Date
}
```

### Like Model

```javascript
{
  _id: ObjectId,
  likedBy: ObjectId (ref: User),
  video: ObjectId (ref: Video) - optional,
  comment: ObjectId (ref: Comment) - optional,
  createdAt: Date
}
```

### Subscription Model

```javascript
{
  _id: ObjectId,
  subscriber: ObjectId (ref: User),
  channel: ObjectId (ref: User),  // Creator being subscribed to
  createdAt: Date
}
```

### Playlist Model

```javascript
{
  _id: ObjectId,
  name: String,
  description: String,
  owner: ObjectId (ref: User),
  videos: [ObjectId],  // References to Videos
  createdAt: Date,
  updatedAt: Date
}
```

### Tweet Model

```javascript
{
  _id: ObjectId,
  content: String,
  owner: ObjectId (ref: User),
  createdAt: Date,
  updatedAt: Date
}
```

### Notification Model

```javascript
{
  _id: ObjectId,
  recipient: ObjectId (ref: User),
  type: String (enum: like, comment, subscribe, upload_complete),
  message: String,
  relatedUser: ObjectId (ref: User),
  relatedVideo: ObjectId (ref: Video),
  isRead: Boolean (default: false),
  createdAt: Date
}
```

---

## Error Handling

### Error Response Format

```json
{
  "statusCode": 400,
  "message": "Descriptive error message",
  "success": false,
  "errorCode": "ERROR_CODE"
}
```

### Common HTTP Status Codes

| Code | Meaning             | When Used                          |
| ---- | ------------------- | ---------------------------------- |
| 200  | OK                  | Successful GET/PATCH/PUT           |
| 201  | Created             | Successful POST (resource created) |
| 202  | Accepted            | Async operation started            |
| 400  | Bad Request         | Invalid input, validation error    |
| 401  | Unauthorized        | Missing/invalid token              |
| 403  | Forbidden           | User not authorized for action     |
| 404  | Not Found           | Resource doesn't exist             |
| 409  | Conflict            | Duplicate username/email           |
| 500  | Server Error        | Unexpected backend error           |
| 503  | Service Unavailable | Cloud service down                 |

### Common Error Codes

| Code                  | Message                         | Solution                    |
| --------------------- | ------------------------------- | --------------------------- |
| INVALID_TOKEN         | Invalid or expired access token | Login again                 |
| MISSING_TOKEN         | Access token is missing         | Send Authorization header   |
| USER_NOT_FOUND        | User not found                  | User may have been deleted  |
| VIDEO_NOT_FOUND       | Video not found                 | Video ID may be incorrect   |
| UNAUTHORIZED          | Not authorized for this action  | Check ownership/permissions |
| DUPLICATE_EMAIL       | Email already exists            | Use different email         |
| INVALID_PASSWORD      | Password is incorrect           | Check password              |
| VALIDATION_ERROR      | Field validation failed         | Check request body          |
| BLOB_NOT_FOUND        | File not found in storage       | File may have been deleted  |
| SAS_GENERATION_FAILED | Failed to generate SAS token    | Retry or contact support    |

### Error Handling Best Practices

```javascript
// ✅ Good: Handle errors appropriately
try {
  const video = await getVideo(videoId);
  if (!video) {
    return showError("Video not found");
  }
  playVideo(video.masterPlaylistSAS.url);
} catch (error) {
  if (error.status === 401) {
    redirectToLogin();
  } else if (error.status === 404) {
    showError("Video not found");
  } else {
    showError("Something went wrong");
  }
}

// ❌ Bad: Generic error handling
try {
  const video = await getVideo(videoId);
  playVideo(video.masterPlaylist);
} catch (error) {
  console.log(error);
}
```

---

## File Upload System

### How File Uploads Work

#### Step 1: Frontend Selects File

```javascript
<input type="file" id="videoFile" accept="video/*" />
```

#### Step 2: Frontend Sends to Backend

```javascript
const formData = new FormData();
formData.append("video", videoFile);
formData.append("thumbnail", thumbnailFile);
formData.append("title", "My Video");
formData.append("description", "Video description");

const response = await fetch("http://localhost:5000/api/v1/videos/upload-abr", {
  method: "POST",
  headers: {
    Authorization: `Bearer ${token}`,
  },
  body: formData,
  credentials: "include",
});
```

#### Step 3: Backend Receives Upload

```
POST /upload-abr
├─ diskStorageMulter.middleware stores file temporarily
├─ Create Video document with "pending" status
├─ Queue video processing job
└─ Return videoId to frontend
```

#### Step 4: Background Processing

```
Video Processing Queue
├─ Receive uploaded file
├─ Convert to HLS format (multiple bitrates)
├─ Generate thumbnail
├─ Calculate duration
├─ Upload to Azure Blob Storage
├─ Update Video document
└─ Mark as "published"
```

#### Step 5: Frontend Polls for Status

```javascript
async function waitForVideoReady(videoId) {
  let status = "pending";

  while (status === "pending" || status === "processing") {
    const response = await fetch(`/api/v1/videos/status/${videoId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const { data } = await response.json();
    status = data.status;

    if (status === "published") {
      return data.masterPlaylist;
    } else if (status === "failed") {
      throw new Error(data.errorMessage);
    }

    await new Promise((r) => setTimeout(r, 2000)); // Wait 2 seconds
  }
}
```

### Disk Storage Configuration

**Location:** `/public/temp`

Files are stored temporarily during processing:

```
public/
├─ temp/
│  ├─ videoId1/
│  │  ├─ input.mp4
│  │  ├─ output.m3u8
│  │  └─ segments/
│  └─ videoId2/
└─ uploads/
```

**Cleanup:** Temporary files deleted after upload to Azure

---

## SAS Token System

### What Are SAS Tokens?

**Shared Access Signature (SAS) tokens** allow secure, time-limited access to Azure Blob Storage without exposing storage credentials.

### Token Flow

```
1. Frontend requests SAS token
   GET /api/v1/sas-tokens/download/:videoId

2. Backend validates request
   ├─ Check if user authenticated (for upload tokens)
   └─ Check if video exists & is published

3. Backend generates token
   ├─ Create token with specific permissions
   ├─ Set expiration time
   └─ Sign with storage key

4. Backend returns SAS URL
   https://account.blob.core.windows.net/videos/...?sv=2021&sig=...

5. Frontend uses SAS URL
   ├─ Download: Direct fetch from blob
   ├─ Stream: Pass to video player
   └─ Upload: PUT request to URL

6. Token expires
   └─ Frontend requests new token & retries
```

### Token Types

#### Download Token

- **Permissions:** Read-only (r)
- **Default Expiry:** 1 hour
- **Use Case:** Video streaming
- **Security:** Can only read, not modify

#### Upload Token

- **Permissions:** Create + Write (cw)
- **Default Expiry:** 15 minutes
- **Use Case:** File uploads
- **Security:** Cannot delete, short expiration

#### HLS Playlist Token

- **Permissions:** Read-only (r)
- **Default Expiry:** 24 hours
- **Use Case:** Streaming playlists
- **Security:** Read-only, longer duration (read-only is safe)

### Using SAS Tokens

#### Download/Stream Video

```javascript
// 1. Get SAS token
const tokenResponse = await fetch(`/api/v1/sas-tokens/download/${videoId}`);
const { data } = await tokenResponse.json();

// 2. Use token in video player
document.querySelector("video").src = data.sasUrl;

// 3. Player streams directly from Azure
// No data flows through backend!
```

#### Upload File with Token

```javascript
// 1. Get SAS token
const tokenResponse = await fetch(
  `/api/v1/sas-tokens/upload/${videoId}?blobPath=videoId/chunk.ts`,
  { headers: { Authorization: `Bearer ${token}` } }
);
const { data } = await tokenResponse.json();

// 2. Upload directly to Azure using token
const uploadResponse = await fetch(data.sasUrl, {
  method: "PUT",
  headers: { "x-ms-blob-type": "BlockBlob" },
  body: fileChunk,
});

// 3. Upload complete, no data through backend!
```

#### Handle Token Expiry

```javascript
// 1. Check token validity before operation
const validityResponse = await fetch("/api/v1/sas-tokens/validate", {
  method: "POST",
  body: JSON.stringify({ sasUrl: currentToken }),
});
const { data } = await validityResponse.json();

if (data.shouldRefresh) {
  // 2. Get new token if expiring soon
  const newTokenResponse = await fetch("/api/v1/sas-tokens/refresh", {
    method: "POST",
    body: JSON.stringify({
      videoId,
      type: "download",
    }),
  });
  currentToken = (await newTokenResponse.json()).data.sasUrl;
}
```

---

## Best Practices

### Authentication

✅ **Do:**

```javascript
// Store token securely
fetch(url, {
  credentials: "include", // Sends cookie automatically
});

// Or with header
fetch(url, {
  headers: {
    Authorization: `Bearer ${token}`,
  },
});
```

❌ **Don't:**

```javascript
// Don't store sensitive tokens in localStorage
localStorage.setItem("token", accessToken);

// Don't send token in URL
fetch(`/api?token=${token}`);
```

### Error Handling

✅ **Do:**

```javascript
try {
  const response = await fetch(url);
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message);
  }
  return await response.json();
} catch (error) {
  if (error.message.includes("401")) {
    redirectToLogin();
  } else if (error.message.includes("404")) {
    showNotFound();
  }
}
```

❌ **Don't:**

```javascript
fetch(url)
  .then((r) => r.json())
  .then((d) => useData(d));
// No error handling at all!
```

### Video Streaming

✅ **Do:**

```javascript
// Get fresh SAS token for each playback
const token = await getSASToken(videoId);
player.src = token.sasUrl;

// Poll for video processing status
while (videoStatus !== "published") {
  await sleep(2000);
  videoStatus = await getVideoStatus(videoId);
}
```

❌ **Don't:**

```javascript
// Try to play immediately after upload
uploadVideo().then(() => playVideo());
// Video might not be processed yet!
```

### Pagination

✅ **Do:**

```javascript
// Implement infinite scroll or pagination
const response = await fetch("/api/v1/videos?page=1&limit=20");
const { data } = await response.json();
loadMoreOnScroll(() => {
  page++;
  fetch(`/api/v1/videos?page=${page}&limit=20`);
});
```

❌ **Don't:**

```javascript
// Load all videos at once
const allVideos = await fetch("/api/v1/videos");
// Can crash browser with 10k+ videos!
```

### SAS Token Management

✅ **Do:**

```javascript
// Cache tokens and check expiry
const cachedToken = getFromCache(videoId);
const validity = await validateToken(cachedToken);

if (validity.shouldRefresh) {
  const newToken = await refreshToken(videoId);
  useToken(newToken);
} else {
  useToken(cachedToken);
}
```

❌ **Don't:**

```javascript
// Request new token for every operation
for (let i = 0; i < 100; i++) {
  const token = await getSASToken(videoId);
  download(files[i], token);
}
// Wastes backend resources!
```

---

## Common Workflows

### Workflow 1: User Registration & Login

```javascript
// 1. Register
const registerResponse = await fetch("/api/v1/users/register", {
  method: "POST",
  body: new FormData({
    username: "newuser",
    email: "user@example.com",
    password: "securePass123",
    fullname: "New User",
    avatar: avatarFile,
  }),
});

// 2. Response contains user data
const { data: userData } = await registerResponse.json();

// 3. User logs in
const loginResponse = await fetch("/api/v1/users/login", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    email: "user@example.com",
    password: "securePass123",
  }),
});

// 4. Backend returns tokens
const { data: tokenData } = await loginResponse.json();
const { accessToken, refreshToken } = tokenData;

// 5. Store tokens (cookies are automatic)
// Use accessToken for all future requests

// 6. If accessToken expires, use refreshToken
const newTokenResponse = await fetch("/api/v1/users/refresh-token", {
  method: "POST",
  body: JSON.stringify({ refreshToken }),
});
const { data: newTokens } = await newTokenResponse.json();
// Continue with new accessToken
```

### Workflow 2: Upload & Stream Video

```javascript
// 1. User selects video file
const videoFile = document.querySelector('input[type="file"]').files[0];

// 2. Upload video
const uploadResponse = await fetch("/api/v1/videos/upload-abr", {
  method: "POST",
  headers: { Authorization: `Bearer ${accessToken}` },
  body: new FormData({
    video: videoFile,
    title: "My Video",
    description: "Video description",
  }),
});

const { data: uploadData } = await uploadResponse.json();
const { videoId, status } = uploadData;
// status = "pending"

// 3. Poll for processing
while (true) {
  const statusResponse = await fetch(`/api/v1/videos/status/${videoId}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const { data: statusData } = await statusResponse.json();

  if (statusData.status === "published") {
    // 4. Get SAS token for streaming
    const tokenResponse = await fetch(`/api/v1/sas-tokens/download/${videoId}`);
    const { data: tokenData } = await tokenResponse.json();

    // 5. Stream video
    document.querySelector("video").src = tokenData.sasUrl;
    break;
  } else if (statusData.status === "failed") {
    alert("Processing failed: " + statusData.errorMessage);
    break;
  }

  await new Promise((r) => setTimeout(r, 2000));
}
```

### Workflow 3: View Video with Engagement

```javascript
// 1. Load video details
const videoResponse = await fetch(`/api/v1/videos/${videoId}`, {
  headers: { Authorization: `Bearer ${accessToken}` },
});
const { data: video } = await videoResponse.json();

// 2. Display video (SAS URL already in response)
const player = document.querySelector("video");
player.src = video.masterPlaylistSAS.url;

// 3. Increment view count after 30 seconds
setTimeout(() => {
  fetch(`/api/v1/videos/${videoId}/views`, {
    method: "PATCH",
  });
}, 30000);

// 4. User likes video
document.querySelector(".like-btn").addEventListener("click", () => {
  fetch(`/api/v1/likes/toggle/v/${videoId}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  video.isLiked = !video.isLiked;
});

// 5. User comments
document.querySelector(".comment-form").addEventListener("submit", (e) => {
  const content = e.target.comment.value;
  fetch(`/api/v1/comments/${videoId}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({ content }),
  });
});

// 6. User subscribes
document.querySelector(".subscribe-btn").addEventListener("click", () => {
  fetch(`/api/v1/subscriptions/c/${video.owner._id}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}` },
  });
});
```

### Workflow 4: Create & Manage Playlist

```javascript
// 1. Create playlist
const playlistResponse = await fetch("/api/v1/playlists", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    Authorization: `Bearer ${accessToken}`,
  },
  body: JSON.stringify({
    name: "Favorites",
    description: "My favorite videos",
  }),
});
const { data: playlist } = await playlistResponse.json();
const playlistId = playlist._id;

// 2. Add videos to playlist
const videoIds = ["vid1", "vid2", "vid3"];
for (const videoId of videoIds) {
  await fetch(`/api/v1/playlists/add/${videoId}/${playlistId}`, {
    method: "PATCH",
    headers: { Authorization: `Bearer ${accessToken}` },
  });
}

// 3. Get playlist
const getResponse = await fetch(`/api/v1/playlists/${playlistId}`);
const { data: playlistData } = await getResponse.json();
// playlistData.videos = [list of videos in playlist]

// 4. Remove video from playlist
await fetch(`/api/v1/playlists/remove/${videoIds[0]}/${playlistId}`, {
  method: "PATCH",
  headers: { Authorization: `Bearer ${accessToken}` },
});

// 5. Delete playlist
await fetch(`/api/v1/playlists/${playlistId}`, {
  method: "DELETE",
  headers: { Authorization: `Bearer ${accessToken}` },
});
```

---

## Environment Variables

The backend requires these `.env` variables:

```env
# Server
PORT=5000
NODE_ENV=development

# Database
MONGODB_URI=mongodb://localhost:27017/videotube
DB_NAME=videotube

# JWT Tokens
ACCESS_TOKEN_SECRET=your_secret_key_here
ACCESS_TOKEN_EXPIRY=1d
REFRESH_TOKEN_SECRET=your_refresh_secret
REFRESH_TOKEN_EXPIRY=10d

# File Uploads
CLOUDINARY_NAME=your_cloudinary_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret

# Azure Blob Storage
AZURE_STORAGE_CONNECTION_STRING=DefaultEndpointsProtocol=https;...
CONTAINER_NAME=videos

# CORS
CORS_ORIGIN=http://localhost:3000
```

---

## Performance Tips

### Reduce API Calls

```javascript
// ❌ Multiple requests
const user = await getUser();
const videos = await getVideos();
const stats = await getStats();

// ✅ Batch requests (if backend supports)
const data = await Promise.all([getUser(), getVideos(), getStats()]);
```

### Cache Responses

```javascript
// Cache video list for 5 minutes
const videoCache = {};

async function getVideos() {
  const cacheKey = "videos_list";

  if (videoCache[cacheKey]?.expiry > Date.now()) {
    return videoCache[cacheKey].data;
  }

  const data = await fetch("/api/v1/videos").then((r) => r.json());
  videoCache[cacheKey] = {
    data: data.data,
    expiry: Date.now() + 5 * 60 * 1000,
  };

  return data.data;
}
```

### Optimize Pagination

```javascript
// Load videos as user scrolls
const observer = new IntersectionObserver((entries) => {
  if (entries[0].isIntersecting) {
    loadMoreVideos();
  }
});

observer.observe(document.querySelector(".load-more-trigger"));
```

---

## Troubleshooting

### "401: Invalid Token"

**Problem:** Token expired or invalid
**Solution:** Call `/refresh-token` endpoint to get new token, or login again

### "404: Video Not Found"

**Problem:** Video ID doesn't exist
**Solution:** Check video ID, video may have been deleted

### "Video Still Processing"

**Problem:** Video status is "processing", can't stream
**Solution:** Wait a few more seconds, poll `/status/:videoId` endpoint again

### "403: Not Authorized"

**Problem:** User trying to perform action they're not allowed to
**Solution:** Verify user owns the resource or has proper permissions

### "503: Cloud Service Unavailable"

**Problem:** Azure storage temporarily down
**Solution:** Retry in a few moments, backend has automatic retry logic

---

## Support & Resources

- **API Base URL:** http://localhost:5000/api/v1
- **Backend Health Check:** http://localhost:5000/health-check
- **Git Repository:** [Backend repo link]
- **Documentation:** See SAS_TOKEN_API_DOCUMENTATION.md for details
- **Issues:** Check common error codes in Error Handling section
