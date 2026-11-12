const test = require('node:test');
const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');

process.env.NODE_ENV = 'test';
process.env.MONGODB_URI = process.env.STREAMIFY_TEST_MONGODB_URI || 'mongodb://127.0.0.1:27017/streamify_test';
process.env.ACCESS_TOKEN_SECRET = 'test-access-secret-that-is-at-least-32-characters-long';
process.env.REFRESH_TOKEN_SECRET = 'test-refresh-secret-that-is-also-at-least-32-chars';
process.env.ACCESS_TOKEN_EXPIRY = '15m';
process.env.REFRESH_TOKEN_EXPIRY = '1h';

const mongoose = require('mongoose');
const app = require('../src/app');
const User = require('../src/models/User');
const Video = require('../src/models/Video');
const Comment = require('../src/models/Comment');
const Reaction = require('../src/models/Reaction');
const Subscription = require('../src/models/Subscription');
const Playlist = require('../src/models/Playlist');
const PlaylistItem = require('../src/models/PlaylistItem');
const WatchHistory = require('../src/models/WatchHistory');

let server;
let baseUrl;

function request(path, { method = 'GET', token, body } = {}) {
  return fetch(`${baseUrl}${path}`, {
    method,
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(body === undefined ? {} : { 'Content-Type': 'application/json' })
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) })
  }).then(async (response) => ({
    response,
    data: response.status === 204 ? null : await response.json()
  }));
}

function credentials(label) {
  const suffix = randomUUID().replaceAll('-', '').slice(0, 10);
  return {
    username: `${label}_${suffix}`,
    email: `${label}_${suffix}@example.test`,
    fullName: `${label} test user`,
    password: 'test-password-123'
  };
}

test('Streamify API integration: auth, RBAC, videos, social features, playlists, and history', async (t) => {
  const databaseName = new URL(process.env.MONGODB_URI).pathname.replace(/^\//, '');
  assert.match(databaseName, /test/i, 'tests must use a database whose name includes "test"');

  await mongoose.connect(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 5000 });
  await mongoose.connection.dropDatabase();
  await Promise.all([
    User, Video, Comment, Reaction, Subscription, Playlist, PlaylistItem, WatchHistory
  ].map((model) => model.init()));

  server = await new Promise((resolve) => {
    const listeningServer = app.listen(0, '127.0.0.1', () => resolve(listeningServer));
  });
  baseUrl = `http://127.0.0.1:${server.address().port}/api/v1`;

  t.after(async () => {
    if (server) await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
    if (mongoose.connection.readyState === 1) {
      await mongoose.connection.dropDatabase();
      await mongoose.disconnect();
    }
  });

  const spec = await request('/openapi.json');
  assert.equal(spec.response.status, 200);
  assert.equal(spec.data.openapi, '3.1.0');
  assert.ok(spec.data.paths['/admin/users']);

  const live = await request('/health/live');
  assert.equal(live.response.status, 200);
  assert.equal(live.data.status, 'ok');

  const ownerCredentials = credentials('owner');
  const viewerCredentials = credentials('viewer');
  const ownerRegistration = await request('/auth/register', { method: 'POST', body: ownerCredentials });
  const viewerRegistration = await request('/auth/register', { method: 'POST', body: viewerCredentials });
  assert.equal(ownerRegistration.response.status, 201);
  assert.equal(viewerRegistration.response.status, 201);
  assert.equal('password' in ownerRegistration.data.data.user, false);
  assert.ok(ownerRegistration.data.data.accessToken);

  let ownerToken = ownerRegistration.data.data.accessToken;
  let viewerToken = viewerRegistration.data.data.accessToken;
  const ownerId = ownerRegistration.data.data.user._id;
  const viewerId = viewerRegistration.data.data.user._id;
  const me = await request('/auth/me', { token: ownerToken });
  assert.equal(me.response.status, 200);
  assert.equal(me.data.data.user.username, ownerCredentials.username);

  const video = await Video.create({
    owner: ownerId,
    title: 'Integration test video',
    description: 'A test-only video record',
    videoUrl: 'https://example.test/video.mp4',
    thumbnailUrl: 'https://example.test/thumbnail.jpg',
    cloudinaryPublicId: `test/${randomUUID()}`,
    duration: 12,
    fileSize: 1024,
    visibility: 'public'
  });
  const feed = await request('/videos?page=1&limit=10');
  assert.equal(feed.response.status, 200);
  assert.equal(feed.data.data.total, 1);
  assert.equal(feed.data.data.videos[0].title, 'Integration test video');

  const deniedAdmin = await request('/admin/users', { token: viewerToken });
  assert.equal(deniedAdmin.response.status, 403);
  const ownerCannotEditViewerVideo = await request(`/videos/${video.id}`, {
    method: 'PATCH', token: viewerToken, body: { title: 'Not allowed' }
  });
  assert.equal(ownerCannotEditViewerVideo.response.status, 403);

  const like = await request(`/videos/${video.id}/reaction`, { method: 'PUT', token: viewerToken, body: { type: 'like' } });
  assert.equal(like.response.status, 200);
  const changedReaction = await request(`/videos/${video.id}/reaction`, { method: 'PUT', token: viewerToken, body: { type: 'dislike' } });
  assert.equal(changedReaction.response.status, 200);
  const reactionSummary = await request(`/videos/${video.id}/reactions`);
  assert.deepEqual(reactionSummary.data.data, { likes: 0, dislikes: 1 });

  const topComment = await request(`/videos/${video.id}/comments`, {
    method: 'POST', token: ownerToken, body: { content: 'Top-level test comment' }
  });
  assert.equal(topComment.response.status, 201);
  const reply = await request(`/videos/${video.id}/comments`, {
    method: 'POST', token: viewerToken,
    body: { content: 'A test reply', parentCommentId: topComment.data.data._id }
  });
  assert.equal(reply.response.status, 201);
  const replies = await request(`/comments/${topComment.data.data._id}/replies`);
  assert.equal(replies.data.data.length, 1);

  const subscribed = await request(`/subscriptions/${ownerId}`, { method: 'POST', token: viewerToken });
  assert.equal(subscribed.response.status, 201);
  const subscriptions = await request('/subscriptions/me', { token: viewerToken });
  assert.equal(subscriptions.data.data.length, 1);
  const profile = await request(`/users/${ownerCredentials.username}`);
  assert.equal(profile.data.data.stats.subscriberCount, 1);

  const createdPlaylist = await request('/playlists', {
    method: 'POST', token: ownerToken, body: { name: 'Integration playlist', visibility: 'private' }
  });
  assert.equal(createdPlaylist.response.status, 201);
  const playlistId = createdPlaylist.data.data._id;
  const privatePlaylistDenied = await request(`/playlists/${playlistId}`, { token: viewerToken });
  assert.equal(privatePlaylistDenied.response.status, 404);
  const addedVideo = await request(`/playlists/${playlistId}/videos`, {
    method: 'POST', token: ownerToken, body: { videoId: video.id }
  });
  assert.equal(addedVideo.response.status, 201);
  const duplicateVideo = await request(`/playlists/${playlistId}/videos`, {
    method: 'POST', token: ownerToken, body: { videoId: video.id }
  });
  assert.equal(duplicateVideo.response.status, 409);
  const playlist = await request(`/playlists/${playlistId}`, { token: ownerToken });
  assert.equal(playlist.data.data.items.length, 1);

  const recordedHistory = await request(`/history/${video.id}`, {
    method: 'POST', token: viewerToken, body: { progressSeconds: 4 }
  });
  assert.equal(recordedHistory.response.status, 200);
  const history = await request('/history/me', { token: viewerToken });
  assert.equal(history.data.data.length, 1);
  assert.equal(history.data.data[0].video.title, 'Integration test video');

  const updatedProfile = await request('/users/me', {
    method: 'PATCH', token: ownerToken, body: { bio: 'Updated in integration test' }
  });
  assert.equal(updatedProfile.response.status, 200);
  assert.equal(updatedProfile.data.data.bio, 'Updated in integration test');

  const owner = await User.findById(ownerId);
  owner.role = 'admin';
  await owner.save();
  const ownerLogin = await request('/auth/login', {
    method: 'POST', body: { identifier: ownerCredentials.username, password: ownerCredentials.password }
  });
  ownerToken = ownerLogin.data.data.accessToken;
  const lastAdminDemotion = await request(`/admin/users/${ownerId}/role`, {
    method: 'PATCH', token: ownerToken, body: { role: 'user' }
  });
  assert.equal(lastAdminDemotion.response.status, 409);
  const adminList = await request('/admin/users?page=1&limit=10', { token: ownerToken });
  assert.equal(adminList.response.status, 200);
  assert.equal(adminList.data.data.some((user) => user.username === viewerCredentials.username), true);
  const promoteViewer = await request(`/admin/users/${viewerId}/role`, {
    method: 'PATCH', token: ownerToken, body: { role: 'admin' }
  });
  assert.equal(promoteViewer.response.status, 200);

  const refreshed = await request('/auth/refresh', {
    method: 'POST', body: { refreshToken: ownerLogin.data.data.refreshToken }
  });
  assert.equal(refreshed.response.status, 200);
  const replayedRefresh = await request('/auth/refresh', {
    method: 'POST', body: { refreshToken: ownerLogin.data.data.refreshToken }
  });
  assert.equal(replayedRefresh.response.status, 401);

  for (let attempt = 1; attempt <= 3; attempt += 1) {
    const registration = await request('/auth/register', {
      method: 'POST', body: credentials(`rate_limit_${attempt}`)
    });
    assert.equal(registration.response.status, 201);
  }
  const limitedRegistration = await request('/auth/register', {
    method: 'POST', body: credentials('rate_limit_blocked')
  });
  assert.equal(limitedRegistration.response.status, 429);
  assert.match(limitedRegistration.data.message, /Too many registration attempts/);

  for (let attempt = 1; attempt <= 29; attempt += 1) {
    const failedRefresh = await request('/auth/refresh', {
      method: 'POST', body: { refreshToken: `invalid-refresh-${attempt}` }
    });
    assert.equal(failedRefresh.response.status, 401, `failed refresh attempt ${attempt} should be allowed`);
  }
  const limitedRefresh = await request('/auth/refresh', {
    method: 'POST', body: { refreshToken: 'another-invalid-refresh' }
  });
  assert.equal(limitedRefresh.response.status, 429);
  assert.match(limitedRefresh.data.message, /Too many token refresh attempts/);

  for (let attempt = 1; attempt <= 10; attempt += 1) {
    const failedLogin = await request('/auth/login', {
      method: 'POST',
      body: { identifier: `missing-user-${attempt}-${randomUUID()}`, password: 'wrong-password' }
    });
    assert.equal(failedLogin.response.status, 401, `failed login attempt ${attempt} should be allowed`);
  }
  const limitedLogin = await request('/auth/login', {
    method: 'POST',
    body: { identifier: `missing-user-${randomUUID()}`, password: 'wrong-password' }
  });
  assert.equal(limitedLogin.response.status, 429);
  assert.match(limitedLogin.data.message, /Too many unsuccessful sign-in attempts/);

  await t.diagnostic('The test used only the isolated streamify_test database; it drops that database during cleanup.');
});
