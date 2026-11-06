# Streamify | Video Streaming Backend

A modular REST API for a video-sharing platform built with Node.js, Express, and MongoDB/Mongoose.

## Features

- Versioned REST API under `/api/v1`, request IDs, centralized error responses, and graceful shutdown
- MongoDB connection retry with liveness and readiness endpoints
- Registration/login, bcryptjs password hashing, JWT access tokens, rotating refresh tokens, and role authorization middleware
- Video upload through validated Multer multipart handling and Cloudinary chunked storage
- Public video feed with search, pagination, aggregation, and indexed queries; creator video library; owner-only edits and deletion
- Likes/dislikes; comments with one-level replies; subscriptions; public/private playlists; per-user watch history; public profiles
- Mongoose schemas and indexes for identity, video discovery, comments, reactions, subscriptions, playlists, and history

## Requirements and setup

1. Install Node.js 20+ and MongoDB Community Server, and make sure the MongoDB Windows service is running.
2. Copy `.env.example` to `.env` if needed. Set different random values of at least 32 characters for `ACCESS_TOKEN_SECRET` and `REFRESH_TOKEN_SECRET`.
3. To upload videos, fill `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, and `CLOUDINARY_API_SECRET` in `.env`. Keep the API secret private. The rest of the API works without Cloudinary.
4. In PowerShell, open this folder and run `npm install`, then `npm run dev`.
5. Register with `POST /api/v1/auth/register`, then log in with `POST /api/v1/auth/login`. Copy the returned access token and send it on protected requests as `Authorization: Bearer YOUR_ACCESS_TOKEN`.

The API can start while MongoDB is offline and retries its connection. Check `http://localhost:5000/api/v1/health/live` for process liveness and `/api/v1/health/ready` for database readiness.

## Authentication

- `POST /api/v1/auth/register` — JSON: `username`, `email`, `fullName`, `password`
- `POST /api/v1/auth/login` — JSON: `identifier` (username or email), `password`
- `POST /api/v1/auth/refresh` — JSON: `refreshToken`; returns a rotated token pair
- `POST /api/v1/auth/logout` — JSON: `refreshToken`
- `GET /api/v1/auth/me` — requires access token

## Videos and reactions

- `POST /api/v1/videos` — authenticated multipart form: `video` file, `title`, optional `description`, optional `visibility` (`public` or `unlisted`)
- `GET /api/v1/videos?page=1&limit=20&search=term` — paginated public feed
- `GET /api/v1/videos/mine` — authenticated creator library
- `GET /api/v1/videos/:videoId` — video details
- `PATCH /api/v1/videos/:videoId` and `DELETE /api/v1/videos/:videoId` — owner-only management
- `GET /api/v1/videos/:videoId/reactions` — like/dislike totals
- `PUT /api/v1/videos/:videoId/reaction` — authenticated JSON `{ "type": "like" }` or `{ "type": "dislike" }`; repeat to change reaction
- `DELETE /api/v1/videos/:videoId/reaction` — remove your reaction

Uploads are capped at 500 MB and require Cloudinary credentials. Files are staged in the operating system temporary directory, uploaded in chunks, then removed from the local temp directory.

## Comments, subscriptions, playlists, and history

- `GET /api/v1/videos/:videoId/comments?page=1&limit=20` — paginated top-level comments with reply counts
- `POST /api/v1/videos/:videoId/comments` — authenticated JSON `{ "content": "..." }`; for a reply, also send `parentCommentId`
- `GET /api/v1/comments/:commentId/replies`, `PATCH /api/v1/comments/:commentId`, `DELETE /api/v1/comments/:commentId`
- `POST /api/v1/subscriptions/:channelId` and `DELETE /api/v1/subscriptions/:channelId` — subscribe/unsubscribe
- `GET /api/v1/subscriptions/me` — channels you follow; `GET /api/v1/subscriptions/:channelId/subscribers?page=1&limit=20` — channel subscribers
- `POST /api/v1/playlists` — authenticated JSON `{ "name": "Favorites", "visibility": "private" }`
- `GET /api/v1/playlists/mine`, `GET /api/v1/playlists/:playlistId` — private playlists are visible to their owner only
- `PATCH` or `DELETE /api/v1/playlists/:playlistId`; add/remove entries with `POST /api/v1/playlists/:playlistId/videos` JSON `{ "videoId": "..." }` and `DELETE /api/v1/playlists/:playlistId/videos/:videoId`
- `POST /api/v1/history/:videoId` — authenticated JSON `{ "progressSeconds": 42 }`; repeated requests update that video's history entry
- `GET /api/v1/history/me?page=1&limit=20`, `DELETE /api/v1/history/:videoId`, `DELETE /api/v1/history/me`

## Profiles

- `GET /api/v1/users/:username` — public profile, public uploads, and video/subscriber/subscription counts
- `PATCH /api/v1/users/me` — authenticated JSON fields: `fullName`, `bio`, `location`, `avatarUrl`, `coverImageUrl`; image URLs must use HTTPS

## Notes

- Request bodies use JSON unless an endpoint explicitly says multipart form.
- Supply a fresh access token after it expires by using the refresh endpoint.
- Cloudinary is required only for actual media uploads; avatar and cover profile fields currently store HTTPS URLs.
