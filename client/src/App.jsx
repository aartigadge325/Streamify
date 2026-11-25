import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { api, clearSession, restoreSession, saveTokens } from './api.js';

const paths = {
  home: 'M3 10.5 12 3l9 7.5M5.5 9v11h13V9M9 20v-6h6v6',
  play: 'm8 5 11 7-11 7V5Z',
  history: 'M3 12a9 9 0 1 0 2.6-6.4L3 8m0-5v5h5m4-1v5l4 2',
  playlist: 'M4 6h16M4 12h11M4 18h9m5-3 4 3-4 3v-6Z',
  upload: 'M12 16V4m0 0L7 9m5-5 5 5M4 16v4h16v-4',
  user: 'M20 21a8 8 0 0 0-16 0m8-10a5 5 0 1 0 0-10 5 5 0 0 0 0 10Z',
  search: 'm20 20-4.5-4.5M18 10.5a7.5 7.5 0 1 1-15 0 7.5 7.5 0 0 1 15 0Z',
  heart: 'M20.8 8.8c0 5.4-8.8 10.2-8.8 10.2S3.2 14.2 3.2 8.8A4.7 4.7 0 0 1 12 6.3a4.7 4.7 0 0 1 8.8 2.5Z',
  comment: 'M21 11.5a8.4 8.4 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.4 8.4 0 0 1-3.8-.9L3 21l1.9-5.7a8.4 8.4 0 0 1-.9-3.8A8.5 8.5 0 0 1 8.7 3.9a8.4 8.4 0 0 1 3.8-.9h.5a8.5 8.5 0 0 1 8 8v.5Z',
  plus: 'M12 5v14m-7-7h14',
  close: 'M18 6 6 18M6 6l12 12',
  chevron: 'm9 18 6-6-6-6',
  arrow: 'M7 17 17 7M7 7h10v10',
  logout: 'M10 17l5-5-5-5m5 5H3m9-9h6a3 3 0 0 1 3 3v12a3 3 0 0 1-3 3h-6',
  like: 'M7 10v11m0-11 4-7a2 2 0 0 1 2 2v4h6a2 2 0 0 1 2 2l-2 8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h2Z',
  dislike: 'M7 14V3m0 11-4 7a2 2 0 0 0 2 2h6v-4h6a2 2 0 0 0 2-2l-2-8a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2h2Z',
  bell: 'M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9m-8 13a2 2 0 0 0 4 0',
  camera: 'M14 4h-4L8 7H4a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-4l-2-3Zm-2 13a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z',
  send: 'm22 2-7 20-4-9-9-4 20-7ZM22 2 11 13',
  trash: 'M3 6h18m-2 0-.9 14H5L4 6m5 0V4h6v2m-5 4v6m4-6v6',
  check: 'm5 12 4 4L19 6',
  globe: 'M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20Zm0-20c2.5 2.7 3.8 6 3.8 10S14.5 19.3 12 22C9.5 19.3 8.2 16 8.2 12S9.5 4.7 12 2Zm-9 10h18',
  circle: 'M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0ZM10 8l6 4-6 4V8Z',
  menu: 'M4 6h16M4 12h16M4 18h16'
};

function Icon({ name, size = 20, className = '' }) {
  return <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={paths[name] || paths.play} /></svg>;
}
function initials(name) { return String(name || 'S').trim().split(/\s+/).slice(0, 2).map(part => part[0]).join('').toUpperCase() || 'S'; }
function Avatar({ name, image, size = 'md' }) {
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [image]);
  return <span className={'avatar avatar-' + size}>{image && !failed ? <img src={image} alt="" onError={() => setFailed(true)} /> : initials(name)}</span>;
}
function count(value = 0) { return Intl.NumberFormat('en', { notation: value >= 1000 ? 'compact' : 'standard', maximumFractionDigits: 1 }).format(value || 0); }
function ago(date) {
  if (!date) return 'Just now';
  const seconds = Math.max(0, Math.floor((Date.now() - new Date(date).getTime()) / 1000));
  if (seconds < 60) return 'Just now';
  if (seconds < 3600) return Math.floor(seconds / 60) + 'm ago';
  if (seconds < 86400) return Math.floor(seconds / 3600) + 'h ago';
  if (seconds < 2592000) return Math.floor(seconds / 86400) + 'd ago';
  return new Date(date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}
function duration(seconds = 0) {
  const value = Math.max(0, Math.floor(Number(seconds) || 0));
  return Math.floor(value / 60) + ':' + String(value % 60).padStart(2, '0');
}
function PageIntro({ eyebrow, title, subtitle, action }) {
  return <div className="page-intro"><div><span className="eyebrow">{eyebrow}</span><h1>{title}</h1>{subtitle && <p>{subtitle}</p>}</div>{action}</div>;
}
function Empty({ icon = 'circle', title, text, action }) {
  return <div className="empty-state"><span className="empty-icon"><Icon name={icon} size={28} /></span><h3>{title}</h3><p>{text}</p>{action}</div>;
}
function VideoCard({ video, onOpen, onAuthor }) {
  const [failed, setFailed] = useState(false);
  return <article className="video-card">
    <button className="video-thumb" onClick={onOpen} aria-label={'Watch ' + video.title}>
      {video.thumbnailUrl && !failed ? <img src={video.thumbnailUrl} alt="" loading="lazy" onError={() => setFailed(true)} /> : <span className="thumb-fallback"><Icon name="circle" size={42} /></span>}
      <span className="duration-pill">{duration(video.duration)}</span><span className="thumb-play"><Icon name="play" size={19} /></span>
    </button>
    <div className="video-card-info"><button className="avatar-button" onClick={() => onAuthor && onAuthor(video.owner && video.owner.username)} aria-label="Open creator channel"><Avatar name={(video.owner && (video.owner.fullName || video.owner.username)) || 'Creator'} image={video.owner && video.owner.avatarUrl} /></button>
      <div className="video-card-copy"><button className="video-card-title" onClick={onOpen}>{video.title}</button><button className="video-card-author" onClick={() => onAuthor && onAuthor(video.owner && video.owner.username)}>{(video.owner && (video.owner.fullName || video.owner.username)) || 'Streamify creator'}</button><p>{count(video.views)} views <span>·</span> {ago(video.createdAt)}</p></div>
    </div>
  </article>;
}
function VideoGrid({ videos = [], navigate }) {
  if (!videos.length) return <Empty icon="circle" title="No videos here yet" text="When creators share videos, they’ll show up here." />;
  return <div className="video-grid">{videos.map(video => <VideoCard key={video._id} video={video} onOpen={() => navigate('/watch/' + video._id)} onAuthor={name => name && navigate('/channel/' + name)} />)}</div>;
}
function Notice({ notice, close }) {
  if (!notice) return null;
  return <div className={'toast ' + (notice.type === 'error' ? 'toast-error' : '')} role="status"><span className="toast-dot" />{notice.message}<button className="icon-button toast-close" onClick={close} aria-label="Dismiss"><Icon name="close" size={16} /></button></div>;
}
function AuthDialog({ close, success }) {
  const [mode, setMode] = useState('login');
  const [form, setForm] = useState({ identifier: '', username: '', email: '', fullName: '', password: '' });
  const [avatarFile, setAvatarFile] = useState(null); const [coverFile, setCoverFile] = useState(null);
  const [busy, setBusy] = useState(false); const [error, setError] = useState('');
  function update(event) { setForm(current => ({ ...current, [event.target.name]: event.target.value })); }
  async function submit(event) {
    event.preventDefault(); setBusy(true); setError('');
    try {
      let body = mode === 'login'
        ? { identifier: form.identifier, password: form.password }
        : { username: form.username, email: form.email, fullName: form.fullName, password: form.password };
      if (mode === 'register' && (avatarFile || coverFile)) {
        body = new FormData();
        for (const [key, value] of Object.entries({ username: form.username, email: form.email, fullName: form.fullName, password: form.password })) body.append(key, value);
        if (avatarFile) body.append('avatar', avatarFile);
        if (coverFile) body.append('coverImage', coverFile);
      }
      const result = await api(mode === 'login' ? '/auth/login' : '/auth/register', { method: 'POST', auth: false, body });
      saveTokens(result); success(result.user);
    } catch (failure) { setError(failure.message); } finally { setBusy(false); }
  }
  return <div className="modal-scrim" role="presentation" onMouseDown={event => event.target === event.currentTarget && close()}><section className="auth-modal" role="dialog" aria-modal="true" aria-labelledby="auth-title">
    <button className="icon-button modal-close" onClick={close} aria-label="Close"><Icon name="close" /></button><div className="auth-brand"><span className="brand-symbol"><Icon name="play" size={18} /></span><span>Streamify</span></div><span className="eyebrow">YOUR NEXT FAVORITE VIDEO</span><h2 id="auth-title">{mode === 'login' ? 'Welcome back' : 'Join the community'}</h2><p className="auth-subtitle">{mode === 'login' ? 'Sign in to pick up where you left off.' : 'Create an account to share and save videos.'}</p>
    <form className="stack-form" onSubmit={submit}>{mode === 'register' ? <><label>Full name<input name="fullName" value={form.fullName} onChange={update} required maxLength="80" autoComplete="name" /></label><label>Username<input name="username" value={form.username} onChange={update} required minLength="3" maxLength="30" pattern="[A-Za-z0-9_]+" autoComplete="username" /></label><label>Email<input name="email" type="email" value={form.email} onChange={update} required maxLength="254" autoComplete="email" /></label><label>Avatar image (optional)<input type="file" accept="image/jpeg,image/png,image/webp,image/gif" onChange={event => setAvatarFile(event.target.files?.[0] || null)} /></label><label>Cover image (optional)<input type="file" accept="image/jpeg,image/png,image/webp,image/gif" onChange={event => setCoverFile(event.target.files?.[0] || null)} /></label></> : <label>Username or email<input name="identifier" value={form.identifier} onChange={update} required autoComplete="username" /></label>}
      <label>Password<input name="password" type="password" value={form.password} onChange={update} required minLength="8" maxLength="128" autoComplete={mode === 'login' ? 'current-password' : 'new-password'} /></label>{error && <p className="form-error" role="alert">{error}</p>}<button className="primary-button full-button" disabled={busy}>{busy ? 'Please wait…' : mode === 'login' ? 'Sign in' : 'Create account'}</button>
    </form><p className="auth-switch">{mode === 'login' ? 'New to Streamify?' : 'Already have an account?'} <button onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setError(''); }}>{mode === 'login' ? 'Create an account' : 'Sign in'}</button></p>
  </section></div>;
}
function Header({ user, openAuth, navigate, signOut, search, setSearch, onSearch }) {
  return <header className="topbar"><button className="mobile-brand" onClick={() => navigate('/')}><span className="brand-symbol"><Icon name="play" size={17} /></span><span>Streamify</span></button>
    <form className="search-box" onSubmit={event => { event.preventDefault(); onSearch(search); }}><Icon name="search" size={19} /><input placeholder="Search videos, creators…" value={search} onChange={event => setSearch(event.target.value)} aria-label="Search videos" />{search && <button type="button" className="search-clear" onClick={() => { setSearch(''); onSearch(''); }} aria-label="Clear search"><Icon name="close" size={16} /></button>}<button className="search-submit" aria-label="Search"><Icon name="search" size={18} /></button></form>
    <div className="topbar-actions">{user ? <><button className="top-upload-button" onClick={() => navigate('/upload')}><Icon name="plus" size={18} /><span>Create</span></button><button className="profile-chip" onClick={() => navigate('/channel/' + user.username)}><Avatar name={user.fullName || user.username} image={user.avatarUrl} size="sm" /><span>{user.username}</span></button><button className="icon-button signout-button" onClick={signOut} title="Sign out" aria-label="Sign out"><Icon name="logout" /></button></> : <button className="primary-button signin-button" onClick={openAuth}>Sign in</button>}</div>
  </header>;
}
function Sidebar({ route, user, navigate, openAuth, compact, toggle }) {
  const items = [{ label: 'Discover', path: '/', icon: 'home', group: 'EXPLORE' }, { label: 'Subscriptions', path: '/subscriptions', icon: 'bell' }, { label: 'Watch history', path: '/history', icon: 'history', group: 'YOUR LIBRARY' }, { label: 'Playlists', path: '/playlists', icon: 'playlist' }, { label: 'Your channel', path: user ? '/channel/' + user.username : '/channel/me', icon: 'user' }];
  return <aside className={'sidebar ' + (compact ? 'sidebar-compact' : '')}><button className="sidebar-toggle icon-button" onClick={toggle} aria-label="Toggle sidebar"><Icon name="menu" /></button><nav aria-label="Main navigation">
    {items.map((item, index) => <div key={item.path}>{item.group && <p className="nav-group-label">{item.group}</p>}<button className={'nav-item ' + ((route === item.path || (item.path.startsWith('/channel') && route.startsWith('/channel'))) ? 'nav-item-active' : '')} onClick={() => user || item.path === '/' ? navigate(item.path) : openAuth()} title={compact ? item.label : undefined}><Icon name={item.icon} /><span>{item.label}</span></button>{(index === 1 || index === 4) && <div className="nav-divider" />}</div>)}
  </nav><div className="sidebar-upload-wrap"><button className="sidebar-upload" onClick={() => user ? navigate('/upload') : openAuth()}><Icon name="upload" /><span>Upload a video</span><Icon className="upload-chevron" name="chevron" size={16} /></button></div><div className="sidebar-footer"><span className="status-orb" />Made for your next watch</div></aside>;
}
function HomePage({ query, navigate }) {
  const [videos, setVideos] = useState([]); const [loading, setLoading] = useState(true); const [error, setError] = useState(''); const [page, setPage] = useState(1); const [pages, setPages] = useState(1); const [reload, setReload] = useState(0);
  useEffect(() => { setPage(1); }, [query]);
  useEffect(() => { let canceled = false; const timer = setTimeout(async () => {
    setLoading(true); setError('');
    try { const params = new URLSearchParams({ page: String(page), limit: '12' }); if (query.trim()) params.set('search', query.trim()); const result = await api('/videos?' + params.toString(), { auth: false }); if (!canceled) { setVideos(result.videos || []); setPages(result.pages || 1); } }
    catch (failure) { if (!canceled) setError(failure.message); } finally { if (!canceled) setLoading(false); }
  }, 160); return () => { canceled = true; clearTimeout(timer); }; }, [query, page, reload]);
  const feature = videos[0];
  return <div className="home-page"><section className="hero-banner" style={feature && feature.thumbnailUrl ? { '--hero-image': 'url("' + feature.thumbnailUrl + '")' } : undefined}>
    <div className="hero-copy"><div className="hero-kicker"><span className="live-dot" /> A space for stories</div><h1>Find your next<br /><em>favorite thing.</em></h1><p>Fresh perspectives, creative ideas, and moments worth sharing—made by people like you.</p><div className="hero-actions"><button className="hero-primary" onClick={() => feature ? navigate('/watch/' + feature._id) : document.querySelector('.feed-section')?.scrollIntoView({ behavior: 'smooth' })}><Icon name="play" size={17} />{feature ? 'Play featured video' : 'Explore the feed'}</button><span className="hero-note"><Icon name="globe" size={15} /> Built around creators</span></div></div>
    <div className="hero-art" aria-hidden="true"><span className="hero-ring ring-one" /><span className="hero-ring ring-two" /><span className="hero-tile tile-one"><Icon name="play" size={28} /></span><span className="hero-tile tile-two"><Icon name="heart" size={23} /></span><span className="hero-tile tile-three"><Icon name="comment" size={22} /></span></div><div className="hero-index"><span>01</span><span className="hero-index-line" /><span>THE STREAMIFY FEED</span></div>
  </section><section className="feed-section"><div className="feed-heading"><div><span className="eyebrow">{query ? 'SEARCH RESULTS' : 'CURATED FOR YOU'}</span><h2>{query ? 'Results for “' + query + '”' : 'The latest stream'}</h2></div><span className="feed-count"><span className="live-dot" />{videos.length ? count(videos.length) + ' in this view' : 'New videos daily'}</span></div>
    {loading ? <div className="loading-state"><span className="spinner" /><p>Finding something good…</p></div> : error ? <div className="error-state"><h3>Couldn’t load videos</h3><p>{error}. Check that the API and MongoDB are running.</p><button className="secondary-button" onClick={() => setReload(value => value + 1)}>Try again</button></div> : <VideoGrid videos={videos} navigate={navigate} />}
    {!loading && !error && pages > 1 && <div className="pagination"><button className="secondary-button" disabled={page <= 1} onClick={() => setPage(value => Math.max(1, value - 1))}>Previous</button><span>Page {page} of {pages}</span><button className="secondary-button" disabled={page >= pages} onClick={() => setPage(value => Math.min(pages, value + 1))}>Next</button></div>}
    {!loading && !error && !videos.length && !query && <div className="creator-cta"><span className="creator-cta-icon"><Icon name="camera" size={23} /></span><div><strong>Your first upload could be here.</strong><p>Sign in, then choose Upload a video to share it.</p></div></div>}
  </section></div>;
}
function AuthOnly({ open, title, text }) {
  return <div className="content-page"><div className="auth-prompt"><span className="auth-prompt-icon"><Icon name="user" size={25} /></span><h2>{title}</h2><p>{text}</p><button className="primary-button" onClick={open}>Sign in or create an account</button></div></div>;
}
function UploadPage({ navigate, notify }) {
  const [file, setFile] = useState(null); const [title, setTitle] = useState(''); const [description, setDescription] = useState(''); const [visibility, setVisibility] = useState('public'); const [busy, setBusy] = useState(false); const [error, setError] = useState('');
  async function submit(event) {
    event.preventDefault(); setError('');
    if (!file) { setError('Choose a video file first.'); return; }
    if (!file.type.startsWith('video/')) { setError('Choose a video file, such as an MP4.'); return; }
    if (file.size > 500 * 1024 * 1024) { setError('This file is larger than the 500 MB upload limit.'); return; }
    const body = new FormData(); body.append('video', file); body.append('title', title); body.append('description', description); body.append('visibility', visibility); setBusy(true);
    try { const result = await api('/videos', { method: 'POST', body }); notify('Your video is live on Streamify.'); navigate('/watch/' + result.video._id); }
    catch (failure) { setError(failure.message); } finally { setBusy(false); }
  }
  return <div className="content-page upload-page"><PageIntro eyebrow="CREATE SOMETHING" title="Share a video" subtitle="Give your story a place to live." /><form className="upload-form" onSubmit={submit}>
    <label className={'dropzone ' + (file ? 'dropzone-filled' : '')}><input type="file" accept="video/*" onChange={event => setFile(event.target.files?.[0] || null)} /><span className="dropzone-icon"><Icon name={file ? 'check' : 'upload'} size={27} /></span><strong>{file ? file.name : 'Choose a video to upload'}</strong><span>{file ? (file.size / (1024 * 1024)).toFixed(1) + ' MB · ' + (file.type || 'Video file') : 'MP4 and other video formats · up to 500 MB'}</span><span className="dropzone-browse">Browse files</span></label>
    <div className="upload-fields"><label>Video title<input value={title} onChange={event => setTitle(event.target.value)} required maxLength="120" placeholder="Give your video a title" /></label><label>Description<textarea value={description} onChange={event => setDescription(event.target.value)} maxLength="5000" rows="5" placeholder="What should viewers know?" /></label><label>Who can watch?<select value={visibility} onChange={event => setVisibility(event.target.value)}><option value="public">Public — anyone can find it</option><option value="unlisted">Unlisted — people with the link</option></select></label><div className="upload-notice"><Icon name="globe" size={18} /><p>Videos are stored securely in Cloudinary. You can edit details or remove your upload later.</p></div>{error && <p className="form-error" role="alert">{error}</p>}<button className="primary-button upload-submit" disabled={busy}>{busy ? <><span className="button-spinner" /> Uploading video…</> : <><Icon name="upload" size={18} /> Publish video</>}</button></div>
  </form></div>;
}
function WatchPage({ id, user, navigate, notify, openAuth }) {
  const [video, setVideo] = useState(null); const [reactions, setReactions] = useState({ likes: 0, dislikes: 0 }); const [comments, setComments] = useState([]); const [playlists, setPlaylists] = useState([]); const [subscriptions, setSubscriptions] = useState([]); const [myReaction, setMyReaction] = useState(''); const [commentText, setCommentText] = useState(''); const [replyTarget, setReplyTarget] = useState(''); const [replyText, setReplyText] = useState(''); const [replies, setReplies] = useState({}); const [openReplies, setOpenReplies] = useState({}); const [playlistId, setPlaylistId] = useState(''); const [loading, setLoading] = useState(true); const [error, setError] = useState(''); const lastProgress = useRef(0);
  const reloadComments = useCallback(async () => { setComments(await api('/videos/' + id + '/comments?page=1&limit=30', { auth: false }) || []); }, [id]);
  useEffect(() => {
    let canceled = false; setLoading(true); setError(''); setVideo(null); setComments([]); setMyReaction('');
    Promise.all([api('/videos/' + id, { auth: false }), api('/videos/' + id + '/reactions', { auth: false }), api('/videos/' + id + '/comments?page=1&limit=30', { auth: false })])
      .then(async ([videoData, reactionData, commentData]) => {
        if (!canceled) { setVideo(videoData.video); setReactions(reactionData); setComments(commentData || []); }
        if (user) { const results = await Promise.all([api('/playlists/mine').catch(() => []), api('/subscriptions/me').catch(() => [])]); if (!canceled) { setPlaylists(results[0] || []); setSubscriptions(results[1] || []); } }
      }).catch(failure => { if (!canceled) setError(failure.message); }).finally(() => { if (!canceled) setLoading(false); });
    return () => { canceled = true; };
  }, [id, user]);
  useEffect(() => { if (video && user) api('/history/' + id, { method: 'POST', body: { progressSeconds: 0 } }).catch(() => {}); }, [video && video._id, user, id]);
  async function react(type) { if (!user) { openAuth(); return; } try { await api('/videos/' + id + '/reaction', { method: 'PUT', body: { type } }); setMyReaction(type); setReactions(await api('/videos/' + id + '/reactions', { auth: false })); } catch (failure) { notify(failure.message, 'error'); } }
  async function postComment(event) { event.preventDefault(); if (!commentText.trim()) return; if (!user) { openAuth(); return; } try { await api('/videos/' + id + '/comments', { method: 'POST', body: { content: commentText.trim() } }); setCommentText(''); await reloadComments(); notify('Comment added.'); } catch (failure) { notify(failure.message, 'error'); } }
  async function postReply(event, parentId) { event.preventDefault(); if (!replyText.trim()) return; try { await api('/videos/' + id + '/comments', { method: 'POST', body: { content: replyText.trim(), parentCommentId: parentId } }); setReplyText(''); setReplyTarget(''); await getReplies(parentId, true); notify('Reply added.'); } catch (failure) { notify(failure.message, 'error'); } }
  async function getReplies(commentId, forceOpen = false) {
    if (openReplies[commentId] && !forceOpen) { setOpenReplies(current => ({ ...current, [commentId]: false })); return; }
    try { const result = await api('/comments/' + commentId + '/replies', { auth: false }); setReplies(current => ({ ...current, [commentId]: result || [] })); setOpenReplies(current => ({ ...current, [commentId]: true })); } catch (failure) { notify(failure.message, 'error'); }
  }
  async function toggleSubscribe() {
    if (!user) { openAuth(); return; }
    try { const subscribed = subscriptions.some(item => String((item.channel && item.channel._id) || item.channel) === String(video.owner._id));
      if (subscribed) { await api('/subscriptions/' + video.owner._id, { method: 'DELETE' }); setSubscriptions(current => current.filter(item => String((item.channel && item.channel._id) || item.channel) !== String(video.owner._id))); notify('Subscription removed.'); }
      else { await api('/subscriptions/' + video.owner._id, { method: 'POST' }); setSubscriptions(current => current.concat([{ channel: video.owner }])); notify('You’re subscribed to this channel.'); }
    } catch (failure) { notify(failure.message, 'error'); }
  }
  async function saveToPlaylist() { if (!playlistId) { notify('Choose a playlist first.', 'error'); return; } try { await api('/playlists/' + playlistId + '/videos', { method: 'POST', body: { videoId: id } }); notify('Added to your playlist.'); } catch (failure) { notify(failure.message, 'error'); } }
  function recordProgress(event) { const seconds = Math.floor(event.currentTarget.currentTime || 0); if (user && seconds > 0 && seconds - lastProgress.current >= 15) { lastProgress.current = seconds; api('/history/' + id, { method: 'POST', body: { progressSeconds: seconds } }).catch(() => {}); } }
  if (loading) return <div className="content-page"><div className="loading-state"><span className="spinner" /><p>Opening video…</p></div></div>;
  if (error || !video) return <div className="content-page"><div className="error-state"><h2>Video unavailable</h2><p>{error || 'We couldn’t find this video.'}</p><button className="secondary-button" onClick={() => navigate('/')}>Back to discover</button></div></div>;
  const isSubscribed = subscriptions.some(item => String((item.channel && item.channel._id) || item.channel) === String(video.owner && video.owner._id));
  const isOwner = user && String(user._id) === String(video.owner && video.owner._id);
  return <div className="watch-page"><div className="watch-main-column"><div className="player-frame"><video key={video._id} src={video.videoUrl} poster={video.thumbnailUrl} controls playsInline onTimeUpdate={recordProgress} /></div>
    <div className="watch-title-row"><div><span className="eyebrow">NOW PLAYING</span><h1>{video.title}</h1></div><span className="watch-visibility"><span className="live-dot" />{video.visibility}</span></div>
    <div className="watch-meta-bar"><button className="creator-line" onClick={() => video.owner && video.owner.username && navigate('/channel/' + video.owner.username)}><Avatar name={(video.owner && (video.owner.fullName || video.owner.username)) || 'Creator'} image={video.owner && video.owner.avatarUrl} /><span><strong>{(video.owner && (video.owner.fullName || video.owner.username)) || 'Streamify creator'}</strong><small>Creator channel</small></span></button>
      {!isOwner && video.owner && video.owner._id && <button className={'subscribe-button ' + (isSubscribed ? 'subscribed' : '')} onClick={toggleSubscribe}>{isSubscribed ? 'Subscribed' : 'Subscribe'} <Icon name={isSubscribed ? 'check' : 'plus'} size={16} /></button>}
      <div className="reaction-group"><button className={myReaction === 'like' ? 'reaction-active' : ''} onClick={() => react('like')} aria-label="Like"><Icon name="like" size={18} /><span>{count(reactions.likes)}</span></button><span className="reaction-divider" /><button className={myReaction === 'dislike' ? 'reaction-active' : ''} onClick={() => react('dislike')} aria-label="Dislike"><Icon name="dislike" size={18} /><span>{count(reactions.dislikes)}</span></button></div>
      {user && playlists.length > 0 && <div className="save-to-playlist"><select aria-label="Choose playlist" value={playlistId} onChange={event => setPlaylistId(event.target.value)}><option value="">Save to…</option>{playlists.map(item => <option key={item._id} value={item._id}>{item.name}</option>)}</select><button className="icon-button" onClick={saveToPlaylist} title="Save to playlist"><Icon name="playlist" /></button></div>}
    </div><div className="video-description"><div className="description-stats"><span>{count(video.views)} views</span><span>·</span><span>{ago(video.createdAt)}</span></div><p>{video.description || 'No description added yet.'}</p></div>
    <section className="comments-section"><div className="comments-heading"><h2>Conversation <span>{comments.length}</span></h2><span className="comments-caption">Keep it kind and thoughtful</span></div>
      <form className="comment-composer" onSubmit={postComment}><Avatar name={(user && (user.fullName || user.username)) || 'Guest'} image={user && user.avatarUrl} /><div className="composer-field"><input value={commentText} onChange={event => setCommentText(event.target.value)} placeholder={user ? 'Add a comment…' : 'Sign in to join the conversation'} onFocus={() => !user && openAuth()} maxLength="2000" /><button className="send-comment" type="submit" disabled={!commentText.trim()} aria-label="Post comment"><Icon name="send" size={17} /></button></div></form>
      {comments.length ? <div className="comment-list">{comments.map(comment => <article className="comment-item" key={comment._id}><Avatar name={(comment.owner && (comment.owner.fullName || comment.owner.username)) || 'Member'} image={comment.owner && comment.owner.avatarUrl} size="sm" /><div className="comment-body"><div className="comment-author-row"><strong>{(comment.owner && (comment.owner.fullName || comment.owner.username)) || 'Streamify member'}</strong><span>{ago(comment.createdAt)}</span></div><p>{comment.content}</p><div className="comment-actions"><button onClick={() => getReplies(comment._id)}>{openReplies[comment._id] ? 'Hide replies' : 'Replies' + (comment.replyCount ? ' · ' + comment.replyCount : '')}</button><button onClick={() => user ? setReplyTarget(replyTarget === comment._id ? '' : comment._id) : openAuth()}>Reply</button></div>
        {replyTarget === comment._id && <form className="reply-composer" onSubmit={event => postReply(event, comment._id)}><input autoFocus value={replyText} onChange={event => setReplyText(event.target.value)} placeholder={'Reply to ' + ((comment.owner && comment.owner.username) || 'comment') + '…'} maxLength="2000" /><button className="send-comment" disabled={!replyText.trim()} aria-label="Send reply"><Icon name="send" size={16} /></button></form>}
        {openReplies[comment._id] && <div className="reply-list">{(replies[comment._id] || []).map(reply => <div className="reply-item" key={reply._id}><Avatar name={(reply.owner && (reply.owner.fullName || reply.owner.username)) || 'Member'} image={reply.owner && reply.owner.avatarUrl} size="xs" /><div><div className="comment-author-row"><strong>{(reply.owner && (reply.owner.fullName || reply.owner.username)) || 'Streamify member'}</strong><span>{ago(reply.createdAt)}</span></div><p>{reply.content}</p></div></div>)}</div>}</div></article>)}</div> : <div className="comments-empty"><Icon name="comment" size={22} /><p>Be the first to start the conversation.</p></div>}
    </section></div><aside className="watch-side-column"><div className="side-card side-card-promo"><span className="side-card-icon"><Icon name="circle" size={22} /></span><span className="eyebrow">A NOTE FROM STREAMIFY</span><h3>Good stories travel.</h3><p>Follow creators you enjoy and keep the videos that matter close.</p></div><button className="back-to-feed" onClick={() => navigate('/')}><Icon name="chevron" className="chevron-back" size={17} /> Back to the latest videos</button></aside></div>;
}
function HistoryPage({ user, openAuth, navigate }) {
  const [items, setItems] = useState([]); const [loading, setLoading] = useState(false); const [error, setError] = useState('');
  const load = useCallback(async () => { setLoading(true); setError(''); try { setItems(await api('/history/me?page=1&limit=30') || []); } catch (failure) { setError(failure.message); } finally { setLoading(false); } }, []);
  useEffect(() => { if (user) load(); }, [user, load]);
  if (!user) return <AuthOnly open={openAuth} title="Your watch history is waiting" text="Sign in to keep track of the videos you’ve watched." />;
  return <div className="content-page"><PageIntro eyebrow="YOUR LIBRARY" title="Watch history" subtitle="Pick up where you left off." action={items.length > 0 && <button className="secondary-button" onClick={async () => { try { await api('/history/me', { method: 'DELETE' }); setItems([]); } catch (failure) { setError(failure.message); } }}><Icon name="trash" size={16} /> Clear history</button>} />
    {loading ? <div className="loading-state"><span className="spinner" /><p>Loading your history…</p></div> : error ? <div className="error-state"><h3>Couldn’t load history</h3><p>{error}</p><button className="secondary-button" onClick={load}>Try again</button></div> : items.length ? <div className="history-list">{items.map(item => item.video && <div className="history-row" key={item._id}><VideoCard video={item.video} onOpen={() => navigate('/watch/' + item.video._id)} onAuthor={name => name && navigate('/channel/' + name)} /><div className="history-progress"><span>Last watched {ago(item.lastWatchedAt)}</span><div className="progress-track"><span style={{ width: (item.video.duration ? Math.min(100, Math.round((item.progressSeconds / item.video.duration) * 100)) : 0) + '%' }} /></div><small>{duration(item.progressSeconds)} watched</small></div></div>)}</div> : <Empty icon="history" title="No watch history yet" text="Watch a video and it’ll be saved here for you." />}
  </div>;
}
function SubscriptionsPage({ user, openAuth, navigate }) {
  const [channels, setChannels] = useState([]); const [loading, setLoading] = useState(false); const [error, setError] = useState('');
  const load = useCallback(async () => { setLoading(true); setError(''); try { setChannels(await api('/subscriptions/me') || []); } catch (failure) { setError(failure.message); } finally { setLoading(false); } }, []);
  useEffect(() => { if (user) load(); }, [user, load]);
  if (!user) return <AuthOnly open={openAuth} title="Follow your favorite creators" text="Sign in to see the channels you follow." />;
  return <div className="content-page"><PageIntro eyebrow="YOUR COMMUNITY" title="Subscriptions" subtitle="Creators you’ve chosen to keep up with." />{loading ? <div className="loading-state"><span className="spinner" /><p>Finding your channels…</p></div> : error ? <div className="error-state"><h3>Couldn’t load subscriptions</h3><p>{error}</p><button className="secondary-button" onClick={load}>Try again</button></div> : channels.length ? <div className="channel-grid">{channels.map(entry => entry.channel && <button className="channel-card" key={entry._id} onClick={() => navigate('/channel/' + entry.channel.username)}><Avatar name={entry.channel.fullName || entry.channel.username} image={entry.channel.avatarUrl} size="lg" /><strong>{entry.channel.fullName || entry.channel.username}</strong><span>@{entry.channel.username}</span><span className="channel-open">Visit channel <Icon name="arrow" size={14} /></span></button>)}</div> : <Empty icon="bell" title="No subscriptions yet" text="Open a video and subscribe to its creator." action={<button className="secondary-button" onClick={() => navigate('/')}>Explore videos</button>} />}</div>;
}
function PlaylistsPage({ user, openAuth, navigate, notify }) {
  const [items, setItems] = useState([]); const [loading, setLoading] = useState(false); const [error, setError] = useState(''); const [creating, setCreating] = useState(false); const [name, setName] = useState(''); const [visibility, setVisibility] = useState('private');
  const load = useCallback(async () => { setLoading(true); setError(''); try { setItems(await api('/playlists/mine') || []); } catch (failure) { setError(failure.message); } finally { setLoading(false); } }, []);
  useEffect(() => { if (user) load(); }, [user, load]);
  async function create(event) { event.preventDefault(); try { const item = await api('/playlists', { method: 'POST', body: { name, visibility } }); setName(''); setCreating(false); setItems(current => [item, ...current]); notify('Playlist created.'); } catch (failure) { setError(failure.message); } }
  if (!user) return <AuthOnly open={openAuth} title="Keep your videos together" text="Sign in to create playlists and save videos for later." />;
  return <div className="content-page"><PageIntro eyebrow="YOUR LIBRARY" title="Playlists" subtitle="Collections for whatever you’re into." action={<button className="primary-button" onClick={() => setCreating(value => !value)}><Icon name="plus" size={17} /> New playlist</button>} />
    {creating && <form className="create-playlist-form" onSubmit={create}><label>Playlist name<input autoFocus value={name} onChange={event => setName(event.target.value)} maxLength="100" required placeholder="e.g. Weekend inspiration" /></label><label>Visibility<select value={visibility} onChange={event => setVisibility(event.target.value)}><option value="private">Private</option><option value="public">Public</option></select></label><button className="primary-button">Create playlist</button><button type="button" className="text-button" onClick={() => setCreating(false)}>Cancel</button></form>}
    {loading ? <div className="loading-state"><span className="spinner" /><p>Loading playlists…</p></div> : error ? <div className="error-state"><h3>Couldn’t load playlists</h3><p>{error}</p><button className="secondary-button" onClick={load}>Try again</button></div> : items.length ? <div className="playlist-grid">{items.map((item, index) => <button className={'playlist-card playlist-card-' + (index % 3)} key={item._id} onClick={() => navigate('/playlist/' + item._id)}><span className="playlist-art"><Icon name="playlist" size={32} /><span>{item.visibility}</span></span><span className="playlist-card-copy"><strong>{item.name}</strong><small>{item.description || 'Your collection'} <Icon name="chevron" size={15} /></small></span></button>)}</div> : !creating && <Empty icon="playlist" title="Your first playlist starts here" text="Save videos to a collection and come back any time." action={<button className="secondary-button" onClick={() => setCreating(true)}>Create a playlist</button>} />}
  </div>;
}
function PlaylistPage({ id, user, navigate, notify }) {
  const [playlist, setPlaylist] = useState(null); const [loading, setLoading] = useState(true); const [error, setError] = useState('');
  const load = useCallback(async () => { setLoading(true); setError(''); try { setPlaylist(await api('/playlists/' + id)); } catch (failure) { setError(failure.message); } finally { setLoading(false); } }, [id]);
  useEffect(() => { load(); }, [load]);
  async function remove(videoId) { try { await api('/playlists/' + id + '/videos/' + videoId, { method: 'DELETE' }); setPlaylist(current => ({ ...current, items: current.items.filter(item => item.video && item.video._id !== videoId) })); notify('Video removed from playlist.'); } catch (failure) { notify(failure.message, 'error'); } }
  if (loading) return <div className="content-page"><div className="loading-state"><span className="spinner" /><p>Opening playlist…</p></div></div>;
  if (error || !playlist) return <div className="content-page"><div className="error-state"><h2>Playlist unavailable</h2><p>{error}</p><button className="secondary-button" onClick={() => navigate('/playlists')}>Back to playlists</button></div></div>;
  const owned = String((playlist.owner && playlist.owner._id) || playlist.owner) === String(user && user._id);
  return <div className="content-page"><button className="text-button back-link" onClick={() => navigate('/playlists')}>‹ Your playlists</button><PageIntro eyebrow={String(playlist.visibility).toUpperCase() + ' PLAYLIST'} title={playlist.name} subtitle={playlist.description || (playlist.items.length + ' videos in this collection.')} />
    {playlist.items.length ? <div className="playlist-video-list">{playlist.items.map((entry, index) => entry.video && <div className="playlist-video-row" key={entry._id}><span className="playlist-position">{String(index + 1).padStart(2, '0')}</span><VideoCard video={entry.video} onOpen={() => navigate('/watch/' + entry.video._id)} onAuthor={name => name && navigate('/channel/' + name)} />{owned && <button className="icon-button remove-item" title="Remove from playlist" onClick={() => remove(entry.video._id)}><Icon name="trash" size={17} /></button>}</div>)}</div> : <Empty icon="playlist" title="This playlist is empty" text="Open a video and use “Save to” to add it here." action={<button className="secondary-button" onClick={() => navigate('/')}>Find a video</button>} />}
  </div>;
}
function ProfilePage({ username, user, openAuth, navigate, notify, onUserUpdate }) {
  const [profile, setProfile] = useState(null); const [loading, setLoading] = useState(true); const [error, setError] = useState(''); const [editing, setEditing] = useState(false);
  const [fullName, setFullName] = useState(''); const [email, setEmail] = useState(''); const [bio, setBio] = useState(''); const [location, setLocation] = useState('');
  const [avatarFile, setAvatarFile] = useState(null); const [coverFile, setCoverFile] = useState(null); const [emailPassword, setEmailPassword] = useState('');
  const [currentPassword, setCurrentPassword] = useState(''); const [newPassword, setNewPassword] = useState('');
  const [saving, setSaving] = useState(false); const [changingPassword, setChangingPassword] = useState(false);
  const target = username === 'me' ? user && user.username : username; const own = !!user && user.username === target;
  const load = useCallback(async () => {
    if (!target) { setLoading(false); return; }
    setLoading(true); setError('');
    try {
      const data = await api('/users/' + encodeURIComponent(target), { auth: Boolean(user) });
      setProfile(data); setFullName(data.user.fullName || ''); setEmail(data.user.email || ''); setBio(data.user.bio || ''); setLocation(data.user.location || '');
    } catch (failure) { setError(failure.message); }
    finally { setLoading(false); }
  }, [target, user]);
  useEffect(() => { load(); }, [load]);

  async function save(event) {
    event.preventDefault(); setSaving(true);
    try {
      const emailChanged = email.trim().toLowerCase() !== String(profile.user.email || '').toLowerCase();
      const values = { fullName, bio, location };
      if (emailChanged) { values.email = email; values.currentPassword = emailPassword; }
      const hasImage = Boolean(avatarFile || coverFile);
      let body = values;
      if (hasImage) {
        body = new FormData();
        for (const [key, value] of Object.entries(values)) body.append(key, value);
        if (avatarFile) body.append('avatar', avatarFile);
        if (coverFile) body.append('coverImage', coverFile);
      }
      const updated = await api('/users/me', { method: 'PATCH', body });
      if (onUserUpdate) onUserUpdate(updated);
      setEditing(false); setAvatarFile(null); setCoverFile(null); setEmailPassword('');
      await load(); notify('Profile updated.');
    } catch (failure) { notify(failure.message, 'error'); }
    finally { setSaving(false); }
  }

  async function changePassword(event) {
    event.preventDefault(); setChangingPassword(true);
    try {
      await api('/auth/change-password', { method: 'POST', body: { currentPassword, newPassword } });
      clearSession(); if (onUserUpdate) onUserUpdate(null); setCurrentPassword(''); setNewPassword('');
      setEditing(false); navigate('/'); notify('Password changed. Sign in again to continue.');
    } catch (failure) { notify(failure.message, 'error'); }
    finally { setChangingPassword(false); }
  }

  async function toggleSubscription() {
    if (!user) { openAuth(); return; }
    const nextSubscribed = !profile.stats.isSubscribed;
    try {
      await api('/subscriptions/' + profile.user._id, { method: nextSubscribed ? 'POST' : 'DELETE' });
      setProfile(current => ({ ...current, stats: { ...current.stats, isSubscribed: nextSubscribed, subscriberCount: Math.max(0, current.stats.subscriberCount + (nextSubscribed ? 1 : -1)) } }));
      notify(nextSubscribed ? 'You are subscribed to this channel.' : 'Subscription removed.');
    } catch (failure) { notify(failure.message, 'error'); }
  }

  function closeProfileEditor() {
    setEditing(false); setAvatarFile(null); setCoverFile(null); setEmailPassword(''); setCurrentPassword(''); setNewPassword('');
  }

  if (username === 'me' && !user) return <AuthOnly open={openAuth} title="Your channel starts with you" text="Sign in to view and edit your Streamify profile." />;
  if (loading) return <div className="content-page"><div className="loading-state"><span className="spinner" /><p>Opening channel…</p></div></div>;
  if (error || !profile) return <div className="content-page"><div className="error-state"><h2>Channel not found</h2><p>{error}</p><button className="secondary-button" onClick={() => navigate('/')}>Back to discover</button></div></div>;
  return <div className="content-page profile-page">
    <div className="profile-cover" style={profile.user.coverImageUrl ? { backgroundImage: 'linear-gradient(90deg, rgba(20,18,28,.5), rgba(20,18,28,.05)), url("' + profile.user.coverImageUrl + '")' } : undefined}><div className="cover-orbit orbit-a" /><div className="cover-orbit orbit-b" /><span className="cover-word">STREAMIFY</span></div>
    <div className="profile-heading"><Avatar name={profile.user.fullName || profile.user.username} image={profile.user.avatarUrl} size="xl" /><div className="profile-heading-copy"><span className="eyebrow">CREATOR CHANNEL</span><h1>{profile.user.fullName || profile.user.username}</h1><p>@{profile.user.username}{profile.user.location ? ' · ' + profile.user.location : ''}</p></div>{own ? <button className="secondary-button profile-edit" onClick={() => editing ? closeProfileEditor() : setEditing(true)}>Edit profile</button> : <button className="secondary-button profile-edit" onClick={toggleSubscription}>{profile.stats.isSubscribed ? 'Subscribed' : 'Subscribe'}</button>}</div>
    {editing && <div className="profile-edit-form">
      <form onSubmit={save}>
        <label>Full name<input value={fullName} maxLength="80" onChange={event => setFullName(event.target.value)} required /></label>
        <label>Email<input type="email" value={email} maxLength="254" onChange={event => setEmail(event.target.value)} required /></label>
        {email.trim().toLowerCase() !== String(profile.user.email || '').toLowerCase() && <label>Current password to confirm email change<input type="password" value={emailPassword} onChange={event => setEmailPassword(event.target.value)} autoComplete="current-password" required /></label>}
        <label>Bio<textarea rows="3" maxLength="500" value={bio} onChange={event => setBio(event.target.value)} placeholder="A little about you" /></label>
        <label>Location<input value={location} maxLength="100" onChange={event => setLocation(event.target.value)} placeholder="Your city or region" /></label>
        <label>Avatar image (JPEG, PNG, WebP, or GIF; up to 5 MB)<input type="file" accept="image/jpeg,image/png,image/webp,image/gif" onChange={event => setAvatarFile(event.target.files?.[0] || null)} /></label>
        <label>Cover image (JPEG, PNG, WebP, or GIF; up to 5 MB)<input type="file" accept="image/jpeg,image/png,image/webp,image/gif" onChange={event => setCoverFile(event.target.files?.[0] || null)} /></label>
        <div><button className="primary-button" disabled={saving}>{saving ? 'Saving…' : 'Save profile'}</button><button type="button" className="text-button" onClick={closeProfileEditor}>Cancel</button></div>
      </form>
      <form className="profile-password-form" onSubmit={changePassword}>
        <span className="eyebrow">ACCOUNT SECURITY</span><h3>Change password</h3>
        <label>Current password<input type="password" value={currentPassword} onChange={event => setCurrentPassword(event.target.value)} autoComplete="current-password" required /></label>
        <label>New password<input type="password" value={newPassword} onChange={event => setNewPassword(event.target.value)} minLength="8" maxLength="128" autoComplete="new-password" required /></label>
        <p>Changing your password signs you out so you can start a fresh session.</p>
        <button className="secondary-button" disabled={changingPassword}>{changingPassword ? 'Changing…' : 'Change password'}</button>
      </form>
    </div>}
    <p className="profile-bio">{profile.user.bio || (own ? 'Add a short bio so people know what you love to share.' : 'This creator has not added a bio yet.')}</p>
    <div className="profile-stats"><div><strong>{count(profile.stats.videoCount)}</strong><span>videos</span></div><div><strong>{count(profile.stats.subscriberCount)}</strong><span>subscribers</span></div><div><strong>{count(profile.stats.subscriptionsCount)}</strong><span>following</span></div></div>
    <div className="section-divider" /><div className="feed-heading profile-feed-heading"><div><span className="eyebrow">FROM THIS CREATOR</span><h2>Videos</h2></div></div><VideoGrid videos={profile.videos || []} navigate={navigate} />
  </div>;
}
function App() {
  const [route, setRoute] = useState(() => window.location.hash.slice(1) || '/'); const [user, setUser] = useState(null); const [authOpen, setAuthOpen] = useState(false); const [search, setSearch] = useState(''); const [compact, setCompact] = useState(false); const [notice, setNotice] = useState(null); const [redirect, setRedirect] = useState('');
  useEffect(() => { const change = () => setRoute(window.location.hash.slice(1) || '/'); window.addEventListener('hashchange', change); return () => window.removeEventListener('hashchange', change); }, []);
  useEffect(() => { const index = route.indexOf('?'); setSearch(new URLSearchParams(index < 0 ? '' : route.slice(index + 1)).get('q') || ''); }, [route]);
  useEffect(() => {
    let active = true;
    restoreSession().then(currentUser => {
      if (active && currentUser) setUser(currentUser);
    });
    return () => { active = false; };
  }, []);
  useEffect(() => { const expired = () => setUser(null); window.addEventListener('streamify:session-expired', expired); return () => window.removeEventListener('streamify:session-expired', expired); }, []);
  useEffect(() => { if (!notice) return; const timer = setTimeout(() => setNotice(null), 3600); return () => clearTimeout(timer); }, [notice]);
  const notify = useCallback((message, type = 'success') => setNotice({ message, type }), []);
  const navigate = useCallback(path => { const next = path.startsWith('/') ? path : '/' + path; if (window.location.hash === '#' + next) setRoute(next); else window.location.hash = next; }, []);
  const openAuth = useCallback((destination = '') => { setRedirect(destination); setAuthOpen(true); }, []);
  const searchFor = useCallback(value => navigate(value.trim() ? '/?q=' + encodeURIComponent(value.trim()) : '/'), [navigate]);
  async function signOut() { try { await api('/auth/logout', { method: 'POST', auth: false }); } catch { /* Clear local session if API is unavailable. */ } clearSession(); setUser(null); navigate('/'); notify('You’re signed out.'); }
  const info = useMemo(() => { const q = route.indexOf('?'); const pathname = q < 0 ? route : route.slice(0, q); return { pathname: pathname || '/', parts: pathname.split('/').filter(Boolean), params: new URLSearchParams(q < 0 ? '' : route.slice(q + 1)) }; }, [route]);
  const first = info.parts[0]; const second = info.parts[1]; let page;
  if (first === 'watch' && second) page = <WatchPage key={second} id={second} user={user} navigate={navigate} notify={notify} openAuth={() => openAuth(route)} />;
  else if (first === 'upload') page = user ? <UploadPage navigate={navigate} notify={notify} /> : <AuthOnly open={() => openAuth('/upload')} title="Share your story" text="Sign in to upload a video to Streamify." />;
  else if (first === 'history') page = <HistoryPage user={user} openAuth={() => openAuth('/history')} navigate={navigate} />;
  else if (first === 'subscriptions') page = <SubscriptionsPage user={user} openAuth={() => openAuth('/subscriptions')} navigate={navigate} />;
  else if (first === 'playlists' && !second) page = <PlaylistsPage user={user} openAuth={() => openAuth('/playlists')} navigate={navigate} notify={notify} />;
  else if (first === 'playlist' && second) page = <PlaylistPage key={second} id={second} user={user} navigate={navigate} notify={notify} />;
  else if (first === 'channel') page = <ProfilePage key={second || 'me'} username={second || 'me'} user={user} openAuth={() => openAuth(route)} navigate={navigate} notify={notify} onUserUpdate={setUser} />;
  else page = <HomePage query={info.params.get('q') || ''} navigate={navigate} />;
  return <div className="app-shell"><Sidebar route={info.pathname} user={user} navigate={navigate} openAuth={() => openAuth()} compact={compact} toggle={() => setCompact(value => !value)} /><div className="app-main">
    <Header user={user} openAuth={() => openAuth()} navigate={navigate} signOut={signOut} search={search} setSearch={setSearch} onSearch={searchFor} /><main className="main-content">{page}</main><footer className="app-footer"><span>Streamify</span><span>Stories worth pressing play on.</span><a href="/api/v1/openapi.json" target="_blank" rel="noreferrer">API docs <Icon name="arrow" size={13} /></a></footer>
  </div>{notice && <Notice notice={notice} close={() => setNotice(null)} />}{authOpen && <AuthDialog close={() => setAuthOpen(false)} success={signedIn => { setUser(signedIn); setAuthOpen(false); notify('Welcome, ' + (signedIn.fullName || signedIn.username) + '.'); if (redirect) navigate(redirect); setRedirect(''); }} />}</div>;
}
export default App;

