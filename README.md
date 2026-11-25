# Streamify

**Streamify** is a full-stack video-sharing application. It combines a React web client with a versioned REST API built using Node.js, Express, MongoDB, and Mongoose. Cloudinary stores video and profile media; MongoDB stores accounts, video metadata, reactions, comments, subscriptions, playlists, and viewing history.

This is a portfolio project with a broad feature set, tests, CI, API documentation, and an optional Docker setup. “Scalable” describes the architecture foundations and data-access choices; this repository does not claim a measured production capacity or a public deployment.

## Contents

- [What it does](#what-it-does)
- [Architecture](#architecture)
- [Technology](#technology)
- [Run it locally](#run-it-locally)
- [Environment settings](#environment-settings)
- [API overview](#api-overview)
- [Data model and performance](#data-model-and-performance)
- [Security](#security)
- [Development commands](#development-commands)
- [Optional Docker setup](#optional-docker-setup)
- [Project layout](#project-layout)
- [Known scope and next steps](#known-scope-and-next-steps)

## What it does

### Viewer and creator features

- Register and sign in with a username or email.
- Browse, search, and paginate public videos.
- Watch public or unlisted videos.
- Upload videos to Cloudinary and manage your own video metadata.
- Like or dislike a video.
- Add comments and one-level replies.
- Subscribe to creators and browse subscriptions.
- Create public or private playlists and organize their videos.
- Save watch progress and view watch history.
- View a creator profile, public uploads, and channel counts.
- Edit profile details and optionally upload an avatar or cover image.

### Account and administration features

- Bcryptjs password hashing.
- Short-lived access tokens and rotating refresh tokens.
- HttpOnly refresh cookie, logout, and password-change flow.
- Login, registration, and refresh rate limits.
- User/admin roles, admin user listing, and role management.
- Request IDs, centralized API errors, health checks, and graceful shutdown.

## Architecture

~~~mermaid
flowchart LR
    Browser[React and Vite client] -->|JSON or multipart /api/v1| API[Express REST API]
    API --> Middleware[Request ID, CORS, auth, limits, upload validation]
    Middleware --> Controllers[Routes and controllers]
    Controllers --> Mongo[(MongoDB with Mongoose)]
    Controllers --> Cloudinary[Cloudinary media storage]
    API --> OpenAPI[OpenAPI 3.1 specification]
    Browser -->|Video and image URLs| Cloudinary
~~~

The API stores media metadata and relationships in MongoDB; Cloudinary stores and delivers the large video and image files. The browser development server forwards requests under <code>/api</code> to the API on port 5000.

## Technology

| Area | Technology |
|---|---|
| API | Node.js, Express |
| Database | MongoDB, Mongoose |
| Web client | React, Vite |
| Authentication | JSON Web Tokens, bcryptjs, HttpOnly cookies |
| Media | Multer, Cloudinary |
| API documentation | OpenAPI 3.1 JSON |
| Checks and automation | Node test runner, GitHub Actions |
| Optional containers | Docker, Docker Compose |

## Run it locally

These steps use Windows PowerShell. You can run them in VS Code’s integrated terminal or in regular PowerShell.

### 1. Install the prerequisites

- **Node.js 22.12 or newer.** Check with <code>node --version</code>. The frontend’s current Vite version requires a recent Node release.
- **MongoDB Community Server** running locally, or a MongoDB Atlas connection string.
- **Cloudinary account** only if you want to upload videos or profile images.
- **Git** if you are cloning from GitHub.

MongoDB Compass is a database viewer. It does not replace the MongoDB server process.

### 2. Get the project

~~~powershell
git clone https://github.com/aartigadge325/Streamify.git
cd Streamify
~~~

If you already have the project folder, open that folder in VS Code and open a terminal there.

### 3. Start MongoDB

For a local MongoDB installation, make sure the **MongoDB Server** service is running. On Windows you can open **Services** from the Start menu, locate the MongoDB Server service, and start it. The service label can differ between installations.

The default connection string is:

~~~text
mongodb://127.0.0.1:27017/streamify
~~~

If you use MongoDB Atlas, replace <code>MONGODB_URI</code> in the project’s root <code>.env</code> file with your Atlas connection string.

### 4. Create the environment file

In the project root, copy the example file once:

~~~powershell
Copy-Item .env.example .env
~~~

Open <code>.env</code>. Replace both placeholder token secrets with separate random values. To generate each value, run this command twice and paste each result into its matching setting:

~~~powershell
node -e "console.log(require('node:crypto').randomBytes(48).toString('hex'))"
~~~

Use one result for <code>ACCESS_TOKEN_SECRET</code> and the other for <code>REFRESH_TOKEN_SECRET</code>. The application requires each secret to contain at least 32 characters, and they must be different.

For media uploads, fill in <code>CLOUDINARY_CLOUD_NAME</code>, <code>CLOUDINARY_API_KEY</code>, and <code>CLOUDINARY_API_SECRET</code>. The API and web client can be explored without Cloudinary, but media upload requests need these credentials. Keep <code>.env</code> private; it is excluded from Git.

### 5. Install the API dependencies and start the API

In terminal 1, from the project root:

~~~powershell
npm install
npm run dev
~~~

The API listens on <code>http://localhost:5000</code>. It starts listening while it connects to MongoDB and retries the database connection if MongoDB is unavailable.

Check readiness in a second terminal:

~~~powershell
Invoke-RestMethod http://localhost:5000/api/v1/health/ready
~~~

Wait for a response with <code>status: ready</code> and <code>database: connected</code> before using database-backed features.

### 6. Start the web client

In terminal 2, from the project root:

~~~powershell
cd client
npm install
npm run dev
~~~

Open **http://localhost:3000** in your browser. Register from the page, sign in, and explore the app. The client calls the local API through Vite’s proxy. Keep both terminals open while using the project.

Use <code>Ctrl+C</code> in each terminal to stop its process. Frontend dependencies only need to be installed once, unless <code>client/package.json</code> changes.

### 7. Upload media (optional)

Video uploads and profile-image file uploads use Cloudinary. Configure the three Cloudinary values in the root <code>.env</code> file, then restart the API. Videos are limited to 500 MB; profile images are limited to 5 MB each. Profile images can also be supplied as HTTPS URLs.

## Environment settings

| Variable | Required | Purpose |
|---|---:|---|
| <code>PORT</code> | No | API port; defaults to 5000 |
| <code>NODE_ENV</code> | No | Runtime mode; defaults to development |
| <code>MONGODB_URI</code> | Yes | Local MongoDB or Atlas connection string |
| <code>CORS_ORIGIN</code> | No | Allowed browser origin(s); defaults to <code>http://localhost:3000</code>. Multiple origins may be comma-separated. |
| <code>ACCESS_TOKEN_SECRET</code> | Yes | Secret used to sign access JWTs; 32+ characters |
| <code>ACCESS_TOKEN_EXPIRY</code> | No | Access-token lifetime; defaults to 15 minutes |
| <code>REFRESH_TOKEN_SECRET</code> | Yes | Different secret used to sign refresh JWTs; 32+ characters |
| <code>REFRESH_TOKEN_EXPIRY</code> | No | Refresh-token lifetime; defaults to 7 days |
| <code>CLOUDINARY_CLOUD_NAME</code> | For uploads | Cloudinary cloud name |
| <code>CLOUDINARY_API_KEY</code> | For uploads | Cloudinary API key |
| <code>CLOUDINARY_API_SECRET</code> | For uploads | Cloudinary API secret; do not publish it |

## API overview

All API routes are under <code>/api/v1</code>. The complete OpenAPI specification is available in <code>docs/openapi.json</code> and at <code>http://localhost:5000/api/v1/openapi.json</code> when the API is running.

| Resource | Main routes |
|---|---|
| Health | <code>GET /health/live</code>, <code>GET /health/ready</code> |
| Authentication | <code>POST /auth/register</code>, <code>POST /auth/login</code>, <code>POST /auth/refresh</code>, <code>POST /auth/logout</code>, <code>GET /auth/me</code>, <code>POST /auth/change-password</code> |
| Videos | <code>GET /videos</code>, <code>GET /videos/mine</code>, <code>POST /videos</code>, <code>GET /videos/:videoId</code>, <code>PATCH /videos/:videoId</code>, <code>DELETE /videos/:videoId</code> |
| Reactions | <code>GET /videos/:videoId/reactions</code>, <code>PUT /videos/:videoId/reaction</code>, <code>DELETE /videos/:videoId/reaction</code> |
| Comments | <code>GET/POST /videos/:videoId/comments</code>, <code>GET /comments/:commentId/replies</code>, <code>PATCH/DELETE /comments/:commentId</code> |
| Subscriptions | <code>POST/DELETE /subscriptions/:channelId</code>, <code>GET /subscriptions/me</code>, <code>GET /subscriptions/:channelId/subscribers</code> |
| Playlists | <code>POST /playlists</code>, <code>GET /playlists/mine</code>, <code>GET/PATCH/DELETE /playlists/:playlistId</code>, playlist video add/remove routes |
| Watch history | <code>POST /history/:videoId</code>, <code>GET /history/me</code>, <code>DELETE /history/:videoId</code>, <code>DELETE /history/me</code> |
| Profiles | <code>GET /users/:username</code>, <code>PATCH /users/me</code> |
| Administration | <code>GET /admin/users</code>, <code>PATCH /admin/users/:userId/role</code> |

Protected endpoints use an access token in the header:

~~~text
Authorization: Bearer YOUR_ACCESS_TOKEN
~~~

Registration and login return a short-lived access token and set the refresh token in an HttpOnly cookie. The browser client keeps the access token in memory and uses the cookie to restore a session. The refresh token is not returned in JSON.

## Data model and performance

Mongoose models represent users, videos, reactions, comments, subscriptions, playlists, playlist items, and watch history. References connect related records rather than embedding unbounded lists into one document.

The project uses unique indexes to enforce rules such as one reaction per user/video, one subscription per subscriber/channel, one playlist entry per video, and one watch-history row per user/video. Other indexes support video discovery, creator libraries, comment lists, subscriptions, playlist ordering, and recent history. MongoDB aggregation pipelines build the public feed and channel profile summaries.

Feed and list endpoints paginate results. Most list limits are capped at 50 records per request; admin user pages are capped at 100.

## Security

- Passwords are hashed with bcryptjs; plain-text passwords are not stored.
- Access and refresh tokens use different secrets and token types.
- Refresh tokens are stored as SHA-256 hashes in MongoDB and rotated on refresh.
- Refresh tokens are delivered through an HttpOnly, SameSite=Strict cookie. The Secure cookie flag is enabled in production.
- Protected mutations derive the user identity from the access token and enforce role or resource ownership checks.
- Login, registration, and token refresh have rate limits.
- Upload sizes and accepted image/video MIME types are restricted.
- Errors receive a request ID; production responses hide internal stack details.

## Development commands

Run from the project root unless noted:

| Command | Purpose |
|---|---|
| <code>npm run dev</code> | Start the API with Node watch mode |
| <code>npm start</code> | Start the API without watch mode |
| <code>npm test</code> | Run the Node integration test suite using a separate test database |
| <code>npm run admin:promote -- username</code> | Promote an existing account to admin |
| <code>npm run load:smoke</code> | Run a small, read-only local feed load check |

In <code>client</code>:

| Command | Purpose |
|---|---|
| <code>npm run dev</code> | Start the Vite development server on port 3000 |
| <code>npm run build</code> | Build production frontend assets |
| <code>npm run preview</code> | Preview a production client build |

### Running the integration tests

Start MongoDB first, then run <code>npm test</code>. The test suite verifies that its database name includes <code>test</code> and uses <code>streamify_test</code> by default. It drops that test database before and after the suite, so never point <code>STREAMIFY_TEST_MONGODB_URI</code> at your normal development database.

### Load smoke check

Start the API and MongoDB, then run <code>npm run load:smoke</code> from another terminal. By default it sends 50 read-only public-feed requests with concurrency 5 and reports latency percentiles and throughput. This is a local smoke check, not a production capacity benchmark. Limits can be adjusted with <code>LOAD_TEST_REQUESTS</code>, <code>LOAD_TEST_CONCURRENCY</code>, <code>LOAD_TEST_BASE_URL</code>, and <code>LOAD_TEST_PATH</code>.

## Optional Docker setup

Docker is not required for the regular local setup above. If Docker Desktop is installed and running, Docker Compose can start both the API and a MongoDB container.

Create <code>.env</code> and set the two different JWT secrets as described earlier. From the project root:

~~~powershell
docker compose up --build
~~~

Open <code>http://localhost:5000/api/v1/health/ready</code>. Stop the stack with <code>Ctrl+C</code> or <code>docker compose down</code>. The named MongoDB volume keeps data between starts. Docker Desktop on Windows may require its WSL 2 backend to be installed and enabled.

## Project layout

~~~text
Streamify/
├── client/                  # React and Vite web application
├── docs/
│   └── openapi.json         # OpenAPI 3.1 contract
├── scripts/                 # Admin promotion and load smoke check
├── src/
│   ├── config/               # Environment, MongoDB, Cloudinary
│   ├── controllers/          # Auth, videos, profiles, and social features
│   ├── middleware/           # Auth, roles, rate limits, upload parsing
│   ├── models/               # Mongoose schemas and indexes
│   ├── routes/               # Versioned API route modules
│   ├── services/             # Token and profile-media services
│   └── utils/                # API errors and async handler
├── test/api.test.js          # API integration coverage
├── .github/workflows/ci.yml # Frontend build and API integration workflow
├── compose.yaml              # Optional API + MongoDB containers
├── Dockerfile
├── package.json
└── README.md
~~~

## Known scope and next steps

This repository demonstrates a substantial portfolio implementation, but it is not a deployed production service. Important current limits:

- The load smoke check is not a benchmark and does not establish a maximum user count.
- Each video detail request increments the view count; views are not deduplicated by viewer or session.
- Comment replies are one level deep, and the replies list is not paginated.
- Rate limits use the default in-process store. Multiple API instances need a shared rate-limit store.
- Password reset, email verification, multi-factor authentication, automated video transcoding, malware scanning, and public deployment are not implemented.
- Changing a password clears the refresh session. An already-issued access token can remain valid until its short expiry.
- Changing an email requires the current password, but email ownership is not verified through a confirmation link.
- Video uploads pass through the API server before Cloudinary; large-scale deployments may prefer signed direct uploads and background media processing.

These are useful interview discussion points and realistic future improvements.
