# VideoTube API Documentation

## Overview
VideoTube is a video streaming platform backend built with Express.js and MongoDB. It provides comprehensive APIs for user management and video uploading with adaptive bitrate (ABR) streaming support.

---

## Base URL
```
http://localhost:8000/api/v1 not for now
https://backend-project-5bs5.onrender.com/api/v1 currently deployed one
```

---

## Authentication
Most endpoints require JWT authentication via `Authorization` header:
```
Authorization: Bearer {accessToken}
```

Tokens are also set as HTTP-only cookies for secure storage.

---

## User Endpoints

### 1. Register User
**Endpoint:** `POST /users/register`

**Description:** Create a new user account with profile information and optional profile images.

**Authentication:** Not required

**Request Body:**
```json
{
  "username": "string (required, unique)",
  "fullname": "string (required)",
  "email": "string (required, unique)",
  "password": "string (required)",
  "avatar": "file (optional, multipart)",
  "coverImage": "file (optional, multipart)"
}
```

**Response (201):**
```json
{
  "statusCode": 201,
  "data": {
    "_id": "user_id",
    "username": "username",
    "fullname": "Full Name",
    "email": "email@example.com",
    "avatar": "cloudinary_url",
    "coverImage": "cloudinary_url",
    "watchHistory": []
  },
  "message": "User registered successfully"
}
```

**Error Responses:**
- `400`: Missing required fields or user already exists
- `500`: Server error during registration

---

### 2. Login User
**Endpoint:** `POST /users/login`

**Description:** Authenticate user and generate access and refresh tokens.

**Authentication:** Not required

**Request Body:**
```json
{
  "email": "string (required)",
  "password": "string (required)"
}
```

**Response (200):**
```json
{
  "statusCode": 200,
  "data": {
    "user": {
      "_id": "user_id",
      "username": "username",
      "email": "email@example.com"
    },
    "accessToken": "jwt_access_token",
    "refreshToken": "jwt_refresh_token"
  },
  "message": "User logged in successfully"
}
```

**Error Responses:**
- `400`: Invalid email or password
- `401`: User not found

---

### 3. Logout User
**Endpoint:** `POST /users/logout`

**Description:** Logout the authenticated user and invalidate tokens.

**Authentication:** Required (JWT token in Authorization header or cookie)

**Request Body:** Empty

**Response (200):**
```json
{
  "statusCode": 200,
  "data": null,
  "message": "User logged out successfully"
}
```

**Error Responses:**
- `401`: Invalid or missing authentication token

---

### 4. Refresh Access Token
**Endpoint:** `POST /users/refresh-token`

**Description:** Generate a new access token using the refresh token.

**Authentication:** Not required (uses refresh token from request body or cookies)

**Request Body:**
```json
{
  "refreshToken": "string (optional, from cookie if not provided)"
}
```

**Response (200):**
```json
{
  "statusCode": 200,
  "data": {
    "accessToken": "new_jwt_access_token",
    "refreshToken": "new_jwt_refresh_token"
  },
  "message": "Access token refreshed successfully"
}
```

**Error Responses:**
- `401`: Invalid or expired refresh token

---

### 5. Change Password
**Endpoint:** `POST /users/changePassword`

**Description:** Change the password for the authenticated user.

**Authentication:** Required

**Request Body:**
```json
{
  "oldPassword": "string (required)",
  "newPassword": "string (required)"
}
```

**Response (200):**
```json
{
  "statusCode": 200,
  "data": null,
  "message": "Password changed successfully"
}
```

**Error Responses:**
- `400`: Old password is incorrect
- `401`: User not authenticated

---

### 6. Update Account Details
**Endpoint:** `PATCH /users/updateAccountDetails`

**Description:** Update user's fullname and email.

**Authentication:** Required

**Request Body:**
```json
{
  "fullname": "string (required)",
  "email": "string (required)"
}
```

**Response (200):**
```json
{
  "statusCode": 200,
  "data": {
    "_id": "user_id",
    "username": "username",
    "fullname": "Updated Full Name",
    "email": "updated@example.com",
    "avatar": "cloudinary_url",
    "coverImage": "cloudinary_url"
  },
  "message": "Account details updated successfully"
}
```

**Error Responses:**
- `400`: Missing required fields
- `401`: User not authenticated

---

### 7. Update Avatar
**Endpoint:** `PATCH /users/updateAvatar`

**Description:** Update user's profile avatar image.

**Authentication:** Required

**Request Body:** Multipart form data
```
avatar: file (image file, required)
```

**Response (200):**
```json
{
  "statusCode": 200,
  "data": {
    "_id": "user_id",
    "username": "username",
    "avatar": "new_cloudinary_url"
  },
  "message": "Avatar updated successfully"
}
```

**Error Responses:**
- `400`: Avatar image is required
- `500`: Avatar upload to Cloudinary failed
- `401`: User not authenticated

---

### 8. Update Cover Image
**Endpoint:** `PATCH /users/updateCoverImage`

**Description:** Update user's channel cover image.

**Authentication:** Required

**Request Body:** Multipart form data
```
coverImage: file (image file, required)
```

**Response (200):**
```json
{
  "statusCode": 200,
  "data": {
    "_id": "user_id",
    "username": "username",
    "coverImage": "new_cloudinary_url"
  },
  "message": "Cover image updated successfully"
}
```

**Error Responses:**
- `400`: Cover image is required
- `500`: Cover image upload to Cloudinary failed
- `401`: User not authenticated

---

### 9. Get User Channel Profile
**Endpoint:** `GET /users/channel/:username`

**Description:** Get a user's channel profile with subscriber information.

**Authentication:** Optional (used for subscription status)

**URL Parameters:**
```
username: string (required) - The username of the channel to view
```

**Response (200):**
```json
{
  "statusCode": 200,
  "data": {
    "_id": "user_id",
    "username": "channel_username",
    "fullname": "Channel Full Name",
    "email": "channel@example.com",
    "avatar": "cloudinary_url",
    "coverImage": "cloudinary_url",
    "subscribersCount": 150,
    "subscribedToCount": 45,
    "isSubscribed": false
  },
  "message": "Channel profile fetched successfully"
}
```

**Error Responses:**
- `400`: Username is required
- `404`: Channel not found

---

### 10. Get Watch History
**Endpoint:** `GET /users/watch-history`

**Description:** Retrieve the authenticated user's watch history with video and owner details.

**Authentication:** Required

**Request Body:** Empty

**Response (200):**
```json
{
  "statusCode": 200,
  "data": [
    {
      "_id": "video_id",
      "title": "Video Title",
      "description": "Video description",
      "duration": 300,
      "thumbnail": "cloudinary_url",
      "masterPlaylist": "hls_master_url",
      "owner": {
        "_id": "owner_id",
        "username": "channel_username",
        "fullname": "Channel Full Name",
        "avatar": "cloudinary_url"
      },
      "createdAt": "2024-01-17T10:30:00Z"
    }
  ],
  "message": "Watch history fetched successfully"
}
```

**Error Responses:**
- `401`: User not authenticated

---

## Video Endpoints

### 1. Upload Video (HLS/ABR)
**Endpoint:** `POST /videos/upload-abr`

**Description:** Upload a video file for adaptive bitrate streaming. The video is automatically processed into multiple quality variants using HLS (HTTP Live Streaming).

**Authentication:** Required

**Request Body:** Multipart form data
```
video: file (required, video file)
title: string (optional, defaults to "Untitled Video")
description: string (optional, defaults to "No description")
```

**Response (201):**
```json
{
  "statusCode": 201,
  "data": {
    "_id": "video_id",
    "title": "Video Title",
    "description": "Video description",
    "duration": 600,
    "thumbnail": "cloudinary_url",
    "masterPlaylist": "hls_master_playlist_url",
    "variants": [
      {
        "quality": "1080p",
        "bitrate": "5000k",
        "url": "variant_playlist_url"
      },
      {
        "quality": "720p",
        "bitrate": "2500k",
        "url": "variant_playlist_url"
      },
      {
        "quality": "480p",
        "bitrate": "1000k",
        "url": "variant_playlist_url"
      },
      {
        "quality": "360p",
        "bitrate": "500k",
        "url": "variant_playlist_url"
      }
    ],
    "segmentsBasePath": "unique_video_id",
    "owner": {
      "_id": "user_id",
      "username": "username",
      "email": "email@example.com",
      "avatar": "cloudinary_url"
    },
    "createdAt": "2024-01-17T10:30:00Z"
  },
  "message": "Video processed & saved successfully"
}
```

**Processing Details:**
- Video is processed into multiple quality variants (1080p, 720p, 480p, 360p)
- HLS master playlist is generated for adaptive streaming
- Thumbnail is automatically extracted from the video
- Video duration is calculated
- All segments are stored with a unique base path

**Error Responses:**
- `400`: Video file is required
- `500`: Video processing pipeline failed or upload failed
- `401`: User not authenticated

---

## Error Handling

All endpoints follow a consistent error response format:

```json
{
  "statusCode": "error_code",
  "data": null,
  "message": "Error description"
}
```

### Common Status Codes:
- `200`: Success
- `201`: Created successfully
- `400`: Bad Request (validation error)
- `401`: Unauthorized (authentication required or failed)
- `404`: Not Found
- `500`: Internal Server Error

---

## Authentication Flow

### User Registration & Login
1. User registers with username, email, password, and optional images
2. User logs in with email and password
3. Server generates access token (short-lived) and refresh token (long-lived)
4. Both tokens are set as HTTP-only cookies and returned in response

### Token Refresh
1. When access token expires, client uses refresh token to get a new access token
2. New tokens are issued and old refresh token is invalidated

### Logout
1. User sends logout request with valid access token
2. Refresh token is cleared from the database
3. User is logged out

---

## File Upload Details

### Avatar/Cover Image Upload
- Uploaded to Cloudinary
- Stored URLs are permanent CDN links
- Old images are automatically replaced when updated

### Video Upload
- Videos are uploaded in memory as multipart form data
- Processed into HLS format with multiple quality variants
- Segments stored locally with unique paths
- Master playlist and variant playlists generated

---

## Data Models Used

### User Model
- `username`: Unique user identifier
- `fullname`: User's full name
- `email`: Unique email address
- `password`: Hashed password
- `avatar`: Profile picture URL
- `coverImage`: Channel cover image URL
- `watchHistory`: Array of video IDs watched
- `refreshToken`: For token refresh mechanism
- `createdAt`, `updatedAt`: Timestamps

### Video Model
- `title`: Video title
- `description`: Video description
- `masterPlaylist`: HLS master playlist URL
- `variants`: Array of quality variants with URLs and bitrates
- `thumbnail`: Thumbnail image URL
- `duration`: Video length in seconds
- `segmentsBasePath`: Base path for video segments
- `owner`: Reference to User who uploaded
- `createdAt`, `updatedAt`: Timestamps

### Subscription Model
- `subscriber`: Reference to User (subscriber)
- `channel`: Reference to User (channel owner)

### Watch History
- Stored in User model as array of video references
- Populated with full video and owner details on retrieval

---

## Middleware

### JWT Authentication (verifyJWT)
- Validates JWT tokens from Authorization header or cookies
- Attaches authenticated user to request object
- Returns 401 if token is invalid or expired

### File Upload
- **Disk Storage**: Used for avatar and cover image uploads
- **Memory Storage**: Used for video uploads before processing
- Validates file types and sizes

---

## Status Codes Summary

| Code | Meaning | Common Scenario |
|------|---------|-----------------|
| 200 | OK | Successful GET/PATCH request |
| 201 | Created | Successful POST request (registration, upload) |
| 400 | Bad Request | Missing/invalid request body |
| 401 | Unauthorized | Missing or invalid authentication |
| 404 | Not Found | Resource doesn't exist |
| 500 | Server Error | Internal server error |

---

## Rate Limiting & Best Practices

- Use refresh tokens to maintain sessions without frequent re-login
- Always include proper error handling for network failures
- Store tokens securely in HTTP-only cookies
- Validate file sizes before uploading
- Handle video processing asynchronously in production

---

**Last Updated:** January 2026  
**Version:** 1.0.0
