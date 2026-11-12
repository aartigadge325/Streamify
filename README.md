# Streamify | Full-Stack Video Streaming Platform

A modular REST API for a video-sharing platform built with Node.js, Express, and MongoDB/Mongoose.

The repository also includes a responsive React client for watching and sharing videos.

## Features

- Versioned REST API under `/api/v1`, request IDs, centralized error responses, and graceful shutdown
- MongoDB connection retry with liveness and readiness endpoints
- Registration/login, bcryptjs password hashing, JWT access tokens, rotating refresh tokens, and role authorization middleware
- Video upload through validated Multer multipart handling and Cloudinary chunked storage
- Public video feed with search, pagination, aggregation, and indexed queries; creator video library; owner-only edits and deletion
- Likes/dislikes; comments with one-level replies; subscriptions; public/private playlists; per-user watch history; public profiles
- Mongoose schemas and indexes for identity, video discovery, comments, reactions, subscriptions, playlists, and history
- Admin-only user listing and role changes; a CLI command promotes the first administrator
- OpenAPI 3.1 specification served at `/api/v1/openapi.json`
- React interface for discovery, playback, authentication, uploads, comments, reactions, subscriptions, playlists, history, and creator profiles

## Requirements and setup

1. Install Node.js 22.12+ and MongoDB Community Server, and make sure the MongoDB Windows service is running.
2. Copy `.env.example` to `.env` if needed. Set different random values of at least 32 characters for `ACCESS_TOKEN_SECRET` and `REFRESH_TOKEN_SECRET`.
3. To upload videos, fill `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, and `CLOUDINARY_API_SECRET` in `.env`. Keep the API secret private. The rest of the API works without Cloudinary.
4. In PowerShell, open this folder and run `npm install`, then `npm run dev`.
5. Register with `POST /api/v1/auth/register`, then log in with `POST /api/v1/auth/login`. Copy the returned access token and send it on protected requests as `Authorization: Bearer YOUR_ACCESS_TOKEN`.

The API can start while MongoDB is offline and retries its connection. Check `http://localhost:5000/api/v1/health/live` for process liveness and `/api/v1/health/ready` for database readiness.

## Run the full stack locally

Open two terminals in VS Code, both in the Streamify project folder. The first terminal runs the backend and MongoDB connection:

```powershell
npm run dev
```

Wait until the terminal says `MongoDB connected` and `Streamify API listening on port 5000`. In the second terminal, start the frontend:

```powershell
cd client
npm install
npm run dev
```

Open `http://localhost:3000` in your browser. The Vite development server forwards `/api` requests to the backend on port 5000. You can register or sign in from the page. Browsing and account features use the local API; video uploads also need the Cloudinary values in the root `.env` file. Press `Ctrl+C` in each terminal to stop its server. Run `npm install` in `client` only the first time or after its dependencies change.

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

## API documentation

The full OpenAPI 3.1 specification is in `docs/openapi.json` and is also served at `http://localhost:5000/api/v1/openapi.json` while the API runs. You can open the JSON file in Swagger Editor or import it into Postman to browse and try the routes. The specification documents the routes, request shapes, JWT bearer authentication, and common responses.

## Admin access

New accounts are regular users. After registering the account that should be the first administrator, run this from the project folder:

```powershell
npm run admin:promote -- your_username
```

Then sign in again to receive a token with the administrator role. Admin routes are `GET /api/v1/admin/users` (supports `page`, `limit`, and `search`) and `PATCH /api/v1/admin/users/:userId/role` with `{ "role": "user" }` or `{ "role": "admin" }`. The API prevents removing the last administrator.

## Automated checks

Install dependencies with `npm install`, make sure MongoDB is running, and run:

```powershell
npm test
```

The integration suite uses a separate database named `streamify_test` by default and clears that test database before and after the run. It does not use the normal `streamify` database. To select another test database, set `STREAMIFY_TEST_MONGODB_URI` to a URI whose database name includes `test`.

## Small local load check

Start the API and MongoDB, then in another terminal run:

```powershell
npm run load:smoke
```

This sends 50 read-only requests to the public video feed with concurrency 5 and reports throughput and latency percentiles. You can adjust `LOAD_TEST_REQUESTS` (maximum 1000), `LOAD_TEST_CONCURRENCY` (maximum 25), `LOAD_TEST_BASE_URL`, and `LOAD_TEST_PATH`. This is a basic local smoke check, not evidence of production capacity.

## Run with Docker

Install Docker Desktop. If `.env` does not exist, copy `.env.example` to `.env`; keep your existing `.env` if you already have one. Fill in the two JWT secrets. Cloudinary credentials are needed only if you plan to upload media. In PowerShell from the project folder:

```powershell
if (-not (Test-Path .env)) { Copy-Item .env.example .env }
# Edit .env and set ACCESS_TOKEN_SECRET and REFRESH_TOKEN_SECRET
docker compose up --build
```

The compose file starts the API and a MongoDB container with a persistent named volume. Open `http://localhost:5000/api/v1/health/ready`; the API is ready when it reports the database as connected. Stop the containers with `Ctrl+C`, or run `docker compose down` in another terminal. The named database volume remains for the next start.

For a hosted deployment, provide the same required environment variables to the hosting service and use a managed MongoDB connection string reachable from that service. Keep `.env` out of GitHub and use the host's secret settings. The included Docker image and compose setup prepare the app to run in a container; they do not create a cloud account or deploy it to a paid hosting provider.

## Current scope

This is a portfolio full-stack project with pagination, MongoDB indexes, aggregation, authorization, media storage, integration coverage, and a small load smoke check. The local smoke check is not a production-scale benchmark. A real launch still needs a hosted API, managed database, production secrets, domain settings, and monitoring.


## Continuous integration

GitHub Actions runs the integration suite on pushes to `main` and pull requests targeting `main`. The workflow starts its own temporary MongoDB service and uses only the isolated `streamify_test` database.
