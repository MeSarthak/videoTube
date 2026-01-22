# VideoTube Backend API Documentation

This project is a scalable video streaming platform backend built with Node.js, Express, MongoDB, and Redis. It follows a strict **MVC + Service Layer** architecture.

## Base URL

`/api/v1`

## Authentication (`/users`)

| Method  | Endpoint                 | Description              | Auth Required |
| :------ | :----------------------- | :----------------------- | :------------ |
| `POST`  | `/users/register`        | Register a new user      | No            |
| `POST`  | `/users/login`           | Login user & get tokens  | No            |
| `POST`  | `/users/logout`          | Logout user              | Yes           |
| `POST`  | `/users/refresh-token`   | Refresh access token     | No            |
| `POST`  | `/users/change-password` | Change current password  | Yes           |
| `GET`   | `/users/current-user`    | Get current user details | Yes           |
| `PATCH` | `/users/update-account`  | Update account details   | Yes           |
| `PATCH` | `/users/avatar`          | Update avatar image      | Yes           |
| `PATCH` | `/users/cover-image`     | Update cover image       | Yes           |
| `GET`   | `/users/c/:username`     | Get channel profile      | Yes           |
| `GET`   | `/users/history`         | Get watch history        | Yes           |

### Sample: Login User

**Request:**

```json
POST /users/login
{
  "email": "user@example.com",
  "password": "password123"
}
```

**Response:**

```json
{
  "statusCode": 200,
  "data": {
    "user": {
      "_id": "65f2...",
      "username": "user123",
      "email": "user@example.com"
    },
    "accessToken": "ey...",
    "refreshToken": "ey..."
  },
  "message": "User logged in successfully",
  "success": true
}
```

## Videos (`/videos`)

| Method  | Endpoint                  | Description                                                                                 | Auth Required |
| :------ | :------------------------ | :------------------------------------------------------------------------------------------ | :------------ |
| `POST`  | `/videos/upload-abr`      | Upload video for HLS processing                                                             | Yes           |
| `GET`   | `/videos/status/:videoId` | Check processing status                                                                     | Yes           |
| `GET`   | `/videos`                 | Search & Home Feed (Query params: `page`, `limit`, `query`, `sortBy`, `sortType`, `userId`) | No            |
| `GET`   | `/videos/:videoId`        | Get video details (Owner, Likes, Sub status)                                                | Optional      |
| `PATCH` | `/videos/:videoId/views`  | Increment video view count                                                                  | No            |

### Sample: Upload Video

**Request:**
`POST /videos/upload-abr`

- **Body (Multipart Form-Data):**
  - `video`: [File]
  - `title`: "My New Video" (**Required**)
  - `description`: "This is a description"

**Response:**

```json
{
  "statusCode": 202,
  "data": {
    "videoId": "65f2a...",
    "status": "pending",
    "message": "Video queued for processing"
  },
  "message": "Video upload accepted and processing started in background",
  "success": true
}
```

### Sample: Search/Feed

**Request:**
`GET /videos?query=javascript&page=1&limit=5`

**Response:**

```json
{
  "statusCode": 200,
  "data": {
    "docs": [
      {
        "_id": "65f2a...",
        "title": "Learn JavaScript in 10 mins",
        "description": "Quick intro...",
        "views": 150,
        "ownerDetails": {
          "username": "coder123",
          "avatar": "http://..."
        }
      }
    ],
    "totalVideos": 50,
    "limit": 5,
    "page": 1,
    "totalPages": 10
  },
  "message": "Videos fetched successfully",
  "success": true
}
```

### Sample: Get Video Details

**Request:**
`GET /videos/65f2a...?Authorization=Bearer <token>`

**Response:**

```json
{
  "statusCode": 200,
  "data": {
    "_id": "65f2a...",
    "title": "Learn JavaScript",
    "views": 151,
    "owner": {
      "username": "coder123"
    },
    "likesCount": 42,
    "isLiked": true,
    "isSubscribed": false
  },
  "message": "Video details fetched successfully",
  "success": true
}
```

## Playlists (`/playlists`)

| Method   | Endpoint                                 | Description                | Auth Required |
| :------- | :--------------------------------------- | :------------------------- | :------------ |
| `POST`   | `/playlists`                             | Create a new playlist      | Yes           |
| `GET`    | `/playlists/:playlistId`                 | Get playlist by ID         | Yes           |
| `PATCH`  | `/playlists/:playlistId`                 | Update playlist details    | Yes           |
| `DELETE` | `/playlists/:playlistId`                 | Delete a playlist          | Yes           |
| `PATCH`  | `/playlists/add/:videoId/:playlistId`    | Add video to playlist      | Yes           |
| `PATCH`  | `/playlists/remove/:videoId/:playlistId` | Remove video from playlist | Yes           |
| `GET`    | `/playlists/user/:userId`                | Get user's playlists       | Yes           |

### Sample: Create Playlist

**Request:**

```json
POST /playlists
{
  "name": "My Favorites",
  "description": "Best videos ever"
}
```

**Response:**

```json
{
  "statusCode": 201,
  "data": {
    "_id": "65f4...",
    "name": "My Favorites",
    "owner": "65f2...",
    "videos": []
  },
  "message": "Playlist created successfully",
  "success": true
}
```

## Subscriptions (`/subscriptions`)

| Method | Endpoint                         | Description                         | Auth Required |
| :----- | :------------------------------- | :---------------------------------- | :------------ |
| `POST` | `/subscriptions/c/:channelId`    | Toggle Subscribe/Unsubscribe        | Yes           |
| `GET`  | `/subscriptions/c/:channelId`    | Get subscriber list of a channel    | Yes           |
| `GET`  | `/subscriptions/u/:subscriberId` | Get channel list subscribed by user | Yes           |

### Sample: Toggle Subscription

**Request:**
`POST /subscriptions/c/65f2b...`

**Response:**

```json
{
  "statusCode": 200,
  "data": {
    "subscribed": true
    // or false if unsubscribed
  },
  "message": "Subscribed successfully", // or Unsubscribed successfully
  "success": true
}
```

## Likes (`/likes`)

| Method | Endpoint                     | Description            | Auth Required |
| :----- | :--------------------------- | :--------------------- | :------------ |
| `POST` | `/likes/toggle/v/:videoId`   | Toggle like on video   | Yes           |
| `POST` | `/likes/toggle/c/:commentId` | Toggle like on comment | Yes           |
| `POST` | `/likes/toggle/t/:tweetId`   | Toggle like on tweet   | Yes           |
| `GET`  | `/likes/videos`              | Get all liked videos   | Yes           |

### Sample: Toggle Like

**Request:**
`POST /likes/toggle/v/65f2a...`

**Response:**

```json
{
  "statusCode": 200,
  "data": {
    "isLiked": true
  },
  "message": "Like toggled successfully",
  "success": true
}
```

## Comments (`/comments`)

| Method   | Endpoint                 | Description                  | Auth Required |
| :------- | :----------------------- | :--------------------------- | :------------ |
| `GET`    | `/comments/:videoId`     | Get all comments for a video | Yes           |
| `POST`   | `/comments/:videoId`     | Add a new comment            | Yes           |
| `PATCH`  | `/comments/c/:commentId` | Update a comment             | Yes           |
| `DELETE` | `/comments/c/:commentId` | Delete a comment             | Yes           |

### Sample: Add Comment

**Request:**

```json
POST /comments/65f2a...
{
  "content": "Great video!"
}
```

**Response:**

```json
{
  "statusCode": 201,
  "data": {
    "_id": "65f3...",
    "content": "Great video!",
    "video": "65f2a...",
    "owner": "65f2..."
  },
  "message": "Comment added successfully",
  "success": true
}
```

## Health Check (`/health`)

| Method | Endpoint        | Description      | Auth Required |
| :----- | :-------------- | :--------------- | :------------ |
| `GET`  | `/health-check` | Check API health | No            |
