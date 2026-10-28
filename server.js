// Connecta – Server (Express + Socket.IO)
const express = require('express');
const http = require('http');
const path = require('path');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const { Server } = require('socket.io');
const createStore = require('./storage');

const PORT = process.env.PORT || 3000;
const LIMITS = { image: 10 * 1024 * 1024, video: 30 * 1024 * 1024, audio: 10 * 1024 * 1024 };
const THEMES = ['connecta', 'dark', 'light'];
const FONTS = ['nunito', 'inter', 'poppins', 'quicksand', 'lexend', 'montserrat', 'comic', 'mono', 'system'];
const STATUSES = ['online', 'idle', 'dnd', 'invisible'];
const OWNER = String(process.env.OWNER || '').trim().toLowerCase();
const GRANTABLE = ['dev', 'mod', 'supporter', 'bughunter', 'early'];
const HEX = /^#[0-9a-f]{6}$/i;
const PERMS = ['ADMIN', 'MANAGE_SERVER', 'MANAGE_CHANNELS', 'MANAGE_ROLES', 'KICK', 'BAN', 'MANAGE_MESSAGES', 'MENTION_EVERYONE', 'SEND', 'ATTACH', 'INVITE'];
const DEFAULT_PERMS = ['SEND', 'ATTACH', 'INVITE'];
const STORY_TTL = 24 * 3600e3;
const GIF_URL = /^https:\/\/media\d*\.giphy\.com\/media\/[^\s"'<>\\]+$/;
const REPORT_REASONS = ['spam', 'harassment', 'inappropriate', 'scam', 'other'];

(async () => {
  const store = await createStore(__dirname);
  const db = store.core;
  for (const [k, v] of Object.entries({ users: {}, tokens: {}, requests: [], groups: {}, reads: {}, guilds: {}, stories: [], reports: [] })) db[k] = db[k] || v;
  db.config = { maxGroup: 10, registrationOpen: true, ...(db.config || {}) };
  const messages = store.messages;
  const save = () => store.saveCore(db);

  const app = express();
  const server = http.createServer(app);
  const io = new Server(server, { maxHttpBufferSize: 1e6 });

  const norm = (u) => String(u || '').trim().toLowerCase();
  const validName = (u) => /^[a-z0-9_.]{3,20}$/.test(u);
  const clip = (s, n) => String(s ?? '').trim().slice(0, n);
  const dmId = (a, b) => 'dm:' + [a, b].sort().join('|');
  const rid = (n = 10) => crypto.randomBytes(n).toString('base64url').slice(0, n);
  const newUser = (hash) => ({ hash, friends: [], pinned: [], created: Date.now(), lastSeen: Date.now(), displayName: '', bio: '', pronouns: '', customStatus: '', status: 'online', avatar: null, banner: null, settings: { theme: 'connecta', font: 'nunito', msgSize: 15, readReceipts: true }, sounds: [], blocked: [], badges: [] });

  // ---------- Sperren ----------
  function banInfo(n) {
    const u = db.users[n];
    if (!u || !u.ban) return null;
    if (u.ban.until && u.ban.until < Date.now()) { delete u.ban; save(); return null; }
    return u.ban;
  }
  const banText = (b) => (b.until ? `Dein Konto ist bis ${new Date(b.until).toLocaleString('de-DE', { timeZone: 'Europe/Berlin' })} gesperrt.` : 'Dein Konto wurde dauerhaft gesperrt.') + (b.reason ? ` Grund: ${b.reason}` : '');

  app.use(express.json());
  app.use(express.static(path.join(__dirname, 'public')));
  app.get('/tos', (req, res) => res.sendFile(path.join(__dirname, 'public', 'tos.html')));

  // ---------- Registrierung & Login ----------
  app.post('/api/register', async (req, res) => {
    const username = norm(req.body.username);
    const { password } = req.body;
    if (!db.config.registrationOpen) return res.status(403).json({ error: 'Registrierungen sind gerade geschlossen.' });
    if (!validName(username)) return res.status(400).json({ error: 'Username: 3–20 Zeichen, nur a–z, 0–9, _ und .' });
    if (['everyone', 'alle', 'connecta', 'admin', 'system'].includes(username)) return res.status(400).json({ error: 'Dieser Username ist reserviert.' });
    if (!password || password.length < 6) return res.status(400).json({ error: 'Passwort braucht mindestens 6 Zeichen.' });
    if (req.body.tos !== true) return res.status(400).json({ error: 'Bitte akzeptiere die Nutzungsbedingungen.' });
    if (db.users[username]) return res.status(409).json({ error: 'Dieser Username ist schon vergeben.' });
    const early = Object.keys(db.users).length < 100;
    db.users[username] = newUser(await bcrypt.hash(password, 10));
    db.users[username].tosAccepted = Date.now();
    if (early) db.users[username].badges.push('early');
    const token = crypto.randomBytes(32).toString('hex');
    db.tokens[token] = username;
    save();
    res.json({ token, username });
  });

  app.post('/api/login', async (req, res) => {
    const username = norm(req.body.username);
    const user = db.users[username];
    if (!user || !(await bcrypt.compare(req.body.password || '', user.hash)))
      return res.status(401).json({ error: 'Username oder Passwort falsch.' });
    const b = banInfo(username);
    if (b) return res.status(403).json({ error: banText(b) });
    const token = crypto.randomBytes(32).toString('hex');
    db.tokens[token] = username;
    save();
    res.json({ token, username });
  });

  const authUser = (req) => { const n = db.tokens[req.get('x-token')]; return n && db.users[n] && !banInfo(n) ? n : null; };

  // ---------- Dateien hochladen & abrufen ----------
  app.post('/api/upload', express.raw({ type: () => true, limit: '31mb' }), async (req, res) => {
    const me = authUser(req);
    if (!me) return res.status(401).json({ error: 'Nicht angemeldet.' });
    const mime = String(req.get('content-type') || '').split(';')[0].toLowerCase();
    const kind = mime.split('/')[0];
    if (!LIMITS[kind]) return res.status(400).json({ error: 'Nur Bilder, Videos und Audios sind erlaubt.' });
    const buf = req.body;
    if (!Buffer.isBuffer(buf) || !buf.length) return res.status(400).json({ error: 'Leere Datei.' });
    if (buf.length > LIMITS[kind]) return res.status(413).json({ error: `Datei zu groß (max. ${LIMITS[kind] / 1024 / 1024} MB).` });
    const id = crypto.randomUUID();
    try { await store.putMedia(id, mime, me, buf); } catch (e) { console.error(e); return res.status(500).json({ error: 'Speichern fehlgeschlagen.' }); }
    res.json({ id, mime, size: buf.length });
  });
  app.use('/api/upload', (err, req, res, next) => res.status(413).json({ error: 'Datei zu groß.' }));

  app.get('/media/:id', async (req, res) => {
    const m = await store.getMedia(req.params.id).catch(() => null);
    if (!m) return res.sendStatus(404);
    const total = m.data.length;
    res.set({ 'Content-Type': m.mime, 'Accept-Ranges': 'bytes', 'Cache-Control': 'public, max-age=31536000, immutable' });
    if (req.query.dl) res.set('Content-Disposition', `attachment; filename="${String(req.query.dl).replace(/[^\w.\- äöüÄÖÜß]/g, '_')}"`);
    const range = /bytes=(\d*)-(\d*)/.exec(req.headers.range || '');
    if (range && (range[1] || range[2])) {
      let start = range[1] ? +range[1] : Math.max(0, total - +range[2]);
      let end = range[1] && range[2] ? Math.min(+range[2], total - 1) : total - 1;
      if (start >= total || start > end) return res.status(416).set('Content-Range', `bytes */${total}`).end();
      res.status(206).set({ 'Content-Range': `bytes ${start}-${end}/${total}`, 'Content-Length': end - start + 1 });
      return res.end(m.data.subarray(start, end + 1));
    }
    res.set('Content-Length', total);
    res.end(m.data);
  });

  // ---------- Anruf-Server (STUN/TURN) ----------
  app.get('/api/ice', (req, res) => {
    const ice = [{ urls: ['stun:stun.l.google.com:19302', 'stun:stun1.l.google.com:19302'] }];
    if (process.env.TURN_URL) ice.push({ urls: process.env.TURN_URL.split(',').map((s) => s.trim()).filter(Boolean), username: process.env.TURN_USER || '', credential: process.env.TURN_PASS || '' });
    res.json({ iceServers: ice, turn: !!process.env.TURN_URL });
  });

  // ---------- GIFs (über GIPHY) ----------
  const gifCache = new Map();
  app.get('/api/gifs', async (req, res) => {
    if (!authUser(req)) return res.status(401).json({ error: 'Nicht angemeldet.' });
    const key = process.env.GIPHY_API_KEY;
    if (!key) return res.json({ error: 'nokey' });
    const q = clip(req.query.q, 60);
    const ck = q || '__trending';
    const hit = gifCache.get(ck);
    if (hit && Date.now() - hit.t < 10 * 60e3) return res.json({ gifs: hit.gifs });
    const url = q
      ? `https://api.giphy.com/v1/gifs/search?api_key=${encodeURIComponent(key)}&q=${encodeURIComponent(q)}&limit=30&rating=pg-13&lang=de`
      : `https://api.giphy.com/v1/gifs/trending?api_key=${encodeURIComponent(key)}&limit=30&rating=pg-13`;
    try {
      const r = await fetch(url);
      if (!r.ok) return res.json({ error: 'GIPHY antwortet nicht (' + r.status + ').' });
      const d = await r.json();
      const gifs = (d.data || []).map((g) => {
        const im = g.images || {};
        const send = im.downsized_medium || im.original || {};
        const prev = im.fixed_width || send;
        return { id: g.id, title: g.title || '', preview: prev.url, url: send.url, w: +send.width || 0, h: +send.height || 0 };
      }).filter((g) => GIF_URL.test(g.url || '') && GIF_URL.test(g.preview || ''));
      gifCache.set(ck, { t: Date.now(), gifs });
      if (gifCache.size > 300) gifCache.delete(gifCache.keys().next().value);
      res.json({ gifs });
    } catch (e) { res.json({ error: 'GIFs konnten nicht geladen werden.' }); }
  });

  // ---------- Hilfsfunktionen ----------
  const online = new Map(); // username -> Set(socketId)
  const emitTo = (name, ev, data) => (online.get(name) || []).forEach((id) => io.to(id).emit(ev, data));
  const areFriends = (a, b) => !!(db.users[a] && db.users[a].friends.includes(b));
  const owned = (id, me, kind) => { const m = id && store.meta(id); return !!(m && m.owner === me && (!kind || m.mime.startsWith(kind + '/'))); };
  const dn = (n) => (db.users[n] && db.users[n].displayName) || n;
  const blocked = (a, b) => !!(db.users[a] && (db.users[a].blocked || []).includes(b));
  const eitherBlocked = (a, b) => blocked(a, b) || blocked(b, a);
  const receipts = (n) => !db.users[n] || !db.users[n].settings || db.users[n].settings.readReceipts !== false;
  const isOwner = (n) => !!OWNER && n === OWNER;
  function badgesOf(n) {
    const u = db.users[n];
    const set = new Set((u && u.badges) || []);
    if (isOwner(n)) set.add('dev');
    return GRANTABLE.filter((b) => set.has(b));
  }
  function presence(n) {
    if (!online.has(n)) return 'offline';
    const s = db.users[n].status || 'online';
    return s === 'invisible' ? 'offline' : s;
  }
  function profile(name) {
    const u = db.users[name];
    if (!u) return { username: name, displayName: 'Gelöschter Nutzer', status: 'offline' };
    return { username: name, displayName: u.displayName || '', bio: u.bio || '', pronouns: u.pronouns || '', customStatus: u.customStatus || '', avatar: u.avatar || null, banner: u.banner || null, status: presence(name), badges: badgesOf(name), owner: isOwner(name), created: u.created };
  }
  function kickUser(n, payload) {
    (online.get(n) || []).forEach((id) => { const s = io.sockets.sockets.get(id); if (s) { s.emit('kicked', payload); setTimeout(() => s.disconnect(true), 300); } });
  }

  // ---------- Server (Gilden), Rollen & Berechtigungen ----------
  const parseCh = (conv) => { const [, gid, cid] = conv.split(':'); const g = db.guilds[gid]; return { g, ch: g && g.channels.find((c) => c.id === cid) }; };
  function gPerms(g, u) {
    if (!g || !g.members[u]) return [];
    if (g.owner === u) return [...PERMS];
    const set = new Set(g.everyone || DEFAULT_PERMS);
    (g.members[u].roles || []).forEach((rid2) => { const r = g.roles.find((x) => x.id === rid2); if (r) r.perms.forEach((p) => set.add(p)); });
    return set.has('ADMIN') ? [...PERMS] : [...set];
  }
  const gHas = (g, u, p) => gPerms(g, u).includes(p);
  function topPos(g, u) {
    if (g.owner === u) return -1;
    const m = g.members[u];
    if (!m) return Infinity;
    let best = Infinity;
    (m.roles || []).forEach((r) => { const i = g.roles.findIndex((x) => x.id === r); if (i >= 0 && i < best) best = i; });
    return best;
  }
  const canModerate = (g, actor, target) => target !== g.owner && actor !== target && (g.owner === actor || topPos(g, actor) < topPos(g, target));
  const canManageRole = (g, actor, roleId) => { const i = g.roles.findIndex((r) => r.id === roleId); return i >= 0 && (g.owner === actor || topPos(g, actor) < i); };
  function canSendIn(me, conv) {
    if (conv === 'news') return false;
    if (!conv.startsWith('ch:')) return true;
    const { g, ch } = parseCh(conv);
    if (!g || !ch || !gHas(g, me, 'SEND')) return false;
    if (!ch.sendRoles || !ch.sendRoles.length || gHas(g, me, 'ADMIN')) return true;
    return (g.members[me].roles || []).some((r) => ch.sendRoles.includes(r));
  }
  function guildView(g, me) {
    const perms = gPerms(g, me);
    return {
      id: g.id, name: g.name, icon: g.icon || null, owner: g.owner, created: g.created,
      roles: g.roles, everyone: g.everyone, channels: g.channels,
      members: Object.fromEntries(Object.entries(g.members).map(([u, m]) => [u, { roles: m.roles || [], joined: m.joined }])),
      myPerms: perms,
      invites: perms.includes('MANAGE_SERVER') || perms.includes('INVITE') ? Object.entries(g.invites || {}).map(([code, i]) => ({ code, by: i.by, at: i.at, uses: i.uses || 0 })) : [],
      bans: perms.includes('BAN') ? Object.entries(g.bans || {}).map(([u, b]) => ({ user: u, reason: b.reason, at: b.at })) : [],
    };
  }
  const guildMembers = (g) => Object.keys(g.members);
  const pushGuild = (g) => guildMembers(g).forEach(pushState);

  // ---------- Unterhaltungen ----------
  function members(conv) {
    if (conv === 'news') return [];
    if (conv.startsWith('note:')) return [conv.slice(5)];
    if (conv.startsWith('dm:')) return conv.slice(3).split('|');
    if (conv.startsWith('ch:')) { const { g } = parseCh(conv); return g ? guildMembers(g) : []; }
    const g = db.groups[conv];
    return g ? g.members : [];
  }
  function canAccess(me, conv) {
    if (typeof conv !== 'string') return false;
    if (conv === 'news') return true;
    if (conv.startsWith('note:')) return conv === 'note:' + me;
    if (conv.startsWith('dm:')) {
      const [a, b] = conv.slice(3).split('|');
      if (a !== me && b !== me) return false;
      return areFriends(me, a === me ? b : a);
    }
    if (conv.startsWith('ch:')) { const { g, ch } = parseCh(conv); return !!(g && ch && g.members[me]); }
    const g = db.groups[conv];
    return !!(g && g.members.includes(me));
  }
  const newsVisible = (m, me) => !m.to || m.to.includes(me);
  function emitConv(conv, ev, data) {
    if (conv === 'news') { if (!data.to) io.emit(ev, data); else data.to.forEach((u) => emitTo(u, ev, data)); return; }
    members(conv).forEach((u) => emitTo(u, ev, data));
  }
  function related(name) {
    const set = new Set([name]);
    const u = db.users[name];
    if (u) u.friends.forEach((f) => set.add(f));
    Object.values(db.groups).forEach((g) => { if (g.members.includes(name)) g.members.forEach((m) => set.add(m)); });
    Object.values(db.guilds).forEach((g) => { if (g.members[name]) guildMembers(g).forEach((m) => set.add(m)); });
    db.requests.forEach((r) => { if (r.from === name) set.add(r.to); if (r.to === name) set.add(r.from); });
    return set;
  }

  // ---------- Storys ----------
  function cleanStories() {
    const now = Date.now();
    const keep = [];
    for (const s of db.stories) { if (now - s.at < STORY_TTL) keep.push(s); else if (s.media) store.deleteMedia(s.media); }
    if (keep.length !== db.stories.length) { db.stories = keep; save(); return true; }
    return false;
  }
  setInterval(() => { if (cleanStories()) [...online.keys()].forEach(pushState); }, 5 * 60e3);
  function storiesFor(me) {
    const u = db.users[me];
    const allowed = new Set([me, ...u.friends.filter((f) => !eitherBlocked(me, f))]);
    const by = {};
    db.stories.forEach((s) => {
      if (!allowed.has(s.user) || Date.now() - s.at >= STORY_TTL) return;
      const item = { id: s.id, kind: s.kind, media: s.media || null, text: s.text || '', bg: s.bg || null, at: s.at, seen: !!(s.views && s.views[me]) };
      if (s.user === me) item.views = Object.entries(s.views || {}).filter(([v]) => v !== me).map(([v, at]) => ({ user: v, at }));
      (by[s.user] = by[s.user] || []).push(item);
    });
    return Object.entries(by).map(([user, items]) => ({ user, items: items.sort((a, b) => a.at - b.at) }));
  }

  // ---------- Zustand für einen Nutzer ----------
  function state(me) {
    const u = db.users[me];
    const groups = Object.values(db.groups).filter((g) => g.members.includes(me));
    const guilds = Object.values(db.guilds).filter((g) => g.members[me]);
    const incoming = db.requests.filter((r) => r.to === me).map((r) => r.from);
    const outgoing = db.requests.filter((r) => r.from === me).map((r) => r.to);
    const people = {};
    [me, ...u.friends, ...incoming, ...outgoing, ...groups.flatMap((g) => g.members), ...guilds.flatMap(guildMembers)].forEach((n) => { if (!people[n]) people[n] = profile(n); });
    const myBlocked = u.blocked || [];
    myBlocked.forEach((n) => { if (db.users[n] && !people[n]) people[n] = profile(n); });
    const convs = [...u.friends.map((f) => dmId(me, f)), ...groups.map((g) => g.id), 'note:' + me, 'news', ...guilds.flatMap((g) => g.channels.map((c) => `ch:${g.id}:${c.id}`))];
    const convSet = new Set(convs);
    const last = {}, unread = {}, mentions = {};
    for (const m of messages) {
      if (!convSet.has(m.conv)) continue;
      if (m.conv === 'news' && !newsVisible(m, me)) continue;
      last[m.conv] = m;
      if (m.system || m.deleted || m.from === me || myBlocked.includes(m.from)) continue;
      if (m.at > ((db.reads[m.conv] || {})[me] || 0)) {
        unread[m.conv] = (unread[m.conv] || 0) + 1;
        if ((m.mentions || []).includes(me)) mentions[m.conv] = (mentions[m.conv] || 0) + 1;
      }
    }
    const reads = {};
    convs.forEach((c) => {
      const r = db.reads[c];
      if (!r || c.startsWith('ch:') || c === 'news') return;
      reads[c] = {};
      for (const [n, t] of Object.entries(r)) if (n === me || (receipts(me) && receipts(n))) reads[c][n] = t;
    });
    return {
      me, myStatus: u.status || 'online', settings: u.settings || {}, sounds: u.sounds || [], people,
      blocked: myBlocked, isOwner: isOwner(me), unread, mentions, reads, pinned: (u.pinned || []).filter((p) => u.friends.includes(p)),
      friends: u.friends, incoming, outgoing,
      groups: groups.map((g) => ({ id: g.id, name: g.name, owner: g.owner, members: g.members, avatar: g.avatar || null, created: g.created })),
      guilds: guilds.map((g) => guildView(g, me)),
      stories: storiesFor(me),
      config: { maxGroup: db.config.maxGroup },
      last,
    };
  }
  const pushState = (name) => { if (db.users[name]) emitTo(name, 'state', state(name)); };

  function addMessage(conv, from, text, extra = {}) {
    const msg = { id: crypto.randomUUID(), conv, from, text, at: Date.now(), pinned: false, deleted: false, system: !from, att: [], mentions: [], ...extra };
    messages.push(msg);
    store.saveMessage(msg);
    emitConv(conv, 'message', msg);
    return msg;
  }
  const sys = (conv, text) => addMessage(conv, null, text);
  function parseMentions(conv, from, text) {
    const mem = members(conv);
    const set = new Set();
    (text.match(/@[a-z0-9_.]{3,20}/gi) || []).forEach((t) => {
      let u = t.slice(1).toLowerCase();
      while (u.endsWith('.') && !mem.includes(u)) u = u.slice(0, -1);
      if (mem.includes(u)) set.add(u);
    });
    let everyone = !conv.startsWith('dm:') && /@(everyone|alle)\b/i.test(text);
    if (everyone && conv.startsWith('ch:')) { const { g } = parseCh(conv); everyone = gHas(g, from, 'MENTION_EVERYONE'); }
    if (everyone) mem.forEach((u) => set.add(u));
    set.delete(from);
    return [...set];
  }
  function removeConvMessages(conv) {
    for (let i = messages.length - 1; i >= 0; i--) if (messages[i].conv === conv) { (messages[i].att || []).forEach((a) => a.id && store.deleteMedia(a.id)); messages.splice(i, 1); }
    store.deleteConv(conv);
    delete db.reads[conv];
  }
  function cleanAtt(att, me) {
    const out = [];
    for (const a of (Array.isArray(att) ? att : []).slice(0, 10)) {
      if (!a) continue;
      if (a.kind === 'gif') {
        if (typeof a.url === 'string' && GIF_URL.test(a.url)) out.push({ kind: 'gif', url: a.url, w: Math.min(2000, +a.w || 0), h: Math.min(2000, +a.h || 0) });
        continue;
      }
      if (!owned(a.id, me)) continue;
      const m = store.meta(a.id);
      const base = m.mime.split('/')[0];
      const o = { id: a.id, mime: m.mime, size: m.size, name: clip(a.name, 80), kind: base === 'audio' && a.kind === 'voice' ? 'voice' : base };
      if (Number.isFinite(+a.dur)) o.dur = Math.min(3600, Math.max(0, +a.dur));
      if (Number.isFinite(+a.w) && Number.isFinite(+a.h)) { o.w = Math.min(10000, Math.round(+a.w)); o.h = Math.min(10000, Math.round(+a.h)); }
      out.push(o);
    }
    return out;
  }

  // ---------- Echtzeit ----------
  io.use((socket, next) => {
    const name = db.tokens[socket.handshake.auth.token];
    if (!name || !db.users[name]) return next(new Error('unauthorized'));
    const b = banInfo(name);
    if (b) { const e = new Error('banned'); e.data = { text: banText(b) }; return next(e); }
    socket.username = name;
    next();
  });

  io.on('connection', (socket) => {
    const me = socket.username;
    const ok = (cb, v) => typeof cb === 'function' && cb(v);
    const wasOnline = online.has(me);
    if (!wasOnline) online.set(me, new Set());
    online.get(me).add(socket.id);
    if (wasOnline) pushState(me); else related(me).forEach(pushState);
    const on = (ev, fn) => socket.on(ev, (...args) => { if (!db.users[me]) return; try { fn(...args); } catch (e) { console.error('Fehler bei', ev, e); const cb = args[args.length - 1]; ok(cb, { error: 'Interner Fehler.' }); } });

    // --- Profil, Status & Einstellungen ---
    on('profile:update', (d = {}, cb) => {
      const u = db.users[me];
      if ('displayName' in d) u.displayName = clip(d.displayName, 32);
      if ('bio' in d) u.bio = clip(d.bio, 190);
      if ('pronouns' in d) u.pronouns = clip(d.pronouns, 30);
      if ('customStatus' in d) u.customStatus = clip(d.customStatus, 60);
      for (const key of ['avatar', 'banner']) {
        if (!(key in d)) continue;
        if (d[key] === null) { store.deleteMedia(u[key]); u[key] = null; }
        else if (owned(d[key], me, 'image') && d[key] !== u[key]) { store.deleteMedia(u[key]); u[key] = d[key]; }
      }
      save();
      related(me).forEach(pushState);
      ok(cb, { ok: true });
    });

    on('status:set', (d = {}, cb) => {
      const u = db.users[me];
      if (STATUSES.includes(d.status)) u.status = d.status;
      if ('customStatus' in d) u.customStatus = clip(d.customStatus, 60);
      save();
      related(me).forEach(pushState);
      ok(cb, { ok: true });
    });

    on('settings:update', (d = {}, cb) => {
      const s = (db.users[me].settings = db.users[me].settings || {});
      if (THEMES.includes(d.theme) || d.theme === 'custom') s.theme = d.theme;
      if (d.custom && typeof d.custom === 'object') {
        const c = s.custom || {};
        if (['dark', 'light'].includes(d.custom.base)) c.base = d.custom.base;
        if (HEX.test(d.custom.c1 || '')) c.c1 = d.custom.c1;
        if (HEX.test(d.custom.c2 || '')) c.c2 = d.custom.c2;
        s.custom = c;
      }
      if (typeof d.readReceipts === 'boolean') { s.readReceipts = d.readReceipts; save(); related(me).forEach(pushState); return ok(cb, { ok: true }); }
      if (FONTS.includes(d.font)) s.font = d.font;
      if (Number.isFinite(+d.msgSize)) s.msgSize = Math.min(20, Math.max(13, Math.round(+d.msgSize)));
      save();
      pushState(me);
      ok(cb, { ok: true });
    });

    // --- Eigene Soundboard-Sounds ---
    on('sound:add', (d = {}, cb) => {
      const u = db.users[me];
      u.sounds = u.sounds || [];
      if (u.sounds.length >= 12) return ok(cb, { error: 'Maximal 12 eigene Sounds.' });
      if (!owned(d.media, me, 'audio')) return ok(cb, { error: 'Ungültige Audiodatei.' });
      const m = store.meta(d.media);
      if (m.size > 1.5 * 1024 * 1024) { store.deleteMedia(d.media); return ok(cb, { error: 'Sound zu groß (max. 1,5 MB).' }); }
      u.sounds.push({ id: crypto.randomUUID(), media: d.media, name: clip(d.name, 20) || 'Sound', emoji: clip(d.emoji, 8) || '🔊' });
      save(); pushState(me);
      ok(cb, { ok: true });
    });
    on('sound:remove', (id, cb) => {
      const u = db.users[me];
      const s = (u.sounds || []).find((x) => x.id === id);
      if (!s) return ok(cb, { error: 'Nicht gefunden.' });
      u.sounds = u.sounds.filter((x) => x.id !== id);
      store.deleteMedia(s.media);
      save(); pushState(me);
      ok(cb, { ok: true });
    });

    // --- Freunde ---
    on('search', (q, cb) => {
      q = norm(q);
      if (!q) return ok(cb, []);
      ok(cb, Object.keys(db.users).filter((n) => n !== me && !blocked(n, me) && (n.includes(q) || norm(db.users[n].displayName).includes(q))).slice(0, 10).map(profile));
    });
    on('profile:get', (u, cb) => { u = norm(u); ok(cb, db.users[u] && !blocked(u, me) ? profile(u) : null); });

    on('friend:request', (to, cb) => {
      to = norm(to);
      if (!db.users[to] || to === me) return ok(cb, { error: 'Nutzer nicht gefunden.' });
      if (areFriends(me, to)) return ok(cb, { error: 'Ihr seid schon befreundet.' });
      if (blocked(me, to)) return ok(cb, { error: 'Du hast diese Person blockiert. Hebe die Blockierung zuerst auf.' });
      if (blocked(to, me)) return ok(cb, { error: 'Anfrage konnte nicht gesendet werden.' });
      if (db.requests.some((r) => r.from === me && r.to === to)) return ok(cb, { error: 'Anfrage schon gesendet.' });
      if (db.requests.some((r) => r.from === to && r.to === me)) return accept(to, cb);
      db.requests.push({ from: me, to, at: Date.now() });
      save(); pushState(me); pushState(to);
      ok(cb, { ok: true });
    });
    function accept(from, cb) {
      const i = db.requests.findIndex((r) => r.from === from && r.to === me);
      if (i < 0) return ok(cb, { error: 'Keine Anfrage.' });
      db.requests.splice(i, 1);
      if (!areFriends(me, from)) { db.users[me].friends.push(from); db.users[from].friends.push(me); }
      save(); pushState(me); pushState(from);
      ok(cb, { ok: true });
    }
    on('friend:accept', (from, cb) => accept(norm(from), cb));
    on('friend:decline', (from) => {
      from = norm(from);
      db.requests = db.requests.filter((r) => !((r.from === from && r.to === me) || (r.from === me && r.to === from)));
      save(); pushState(me); pushState(from);
    });
    on('friend:remove', (who) => {
      who = norm(who);
      if (!db.users[who]) return;
      db.users[me].friends = db.users[me].friends.filter((f) => f !== who);
      db.users[who].friends = db.users[who].friends.filter((f) => f !== me);
      save(); pushState(me); pushState(who);
    });
    on('friend:pin', ({ user, on: pin } = {}, cb) => {
      user = norm(user);
      const u = db.users[me];
      u.pinned = (u.pinned || []).filter((p) => p !== user && u.friends.includes(p));
      if (pin) {
        if (!u.friends.includes(user)) return ok(cb, { error: 'Nur Freunde können angepinnt werden.' });
        if (u.pinned.length >= 10) return ok(cb, { error: 'Maximal 10 angepinnte Freunde.' });
        u.pinned.unshift(user);
      }
      save(); pushState(me);
      ok(cb, { ok: true });
    });

    // --- Nachrichten ---
    on('history', (d, cb) => {
      const { conv, before } = typeof d === 'string' ? { conv: d } : d || {};
      if (!canAccess(me, conv)) return ok(cb, []);
      const list = messages.filter((m) => m.conv === conv && (!before || m.at < before) && (conv !== 'news' || newsVisible(m, me)));
      ok(cb, list.slice(-100));
    });

    on('message', ({ conv, text, att, reply } = {}, cb) => {
      text = clip(text, 4000);
      if (!canAccess(me, conv)) return ok(cb, { error: 'Nicht möglich.' });
      if (!canSendIn(me, conv)) return ok(cb, { error: 'Du darfst hier keine Nachrichten schreiben.' });
      let files = cleanAtt(att, me);
      if (conv.startsWith('ch:') && files.some((f) => f.kind !== 'gif')) { const { g } = parseCh(conv); if (!gHas(g, me, 'ATTACH')) return ok(cb, { error: 'Du darfst hier keine Dateien senden.' }); }
      if (!text && !files.length) return ok(cb, { error: 'Leere Nachricht.' });
      const extra = { att: files, mentions: parseMentions(conv, me, text) };
      if (reply && typeof reply === 'string') { const r = messages.find((m) => m.id === reply && m.conv === conv && !m.deleted); if (r) extra.reply = { id: r.id, from: r.from, text: clip(r.text, 120), kind: (r.att[0] || {}).kind || null }; }
      addMessage(conv, me, text, extra);
      ok(cb, { ok: true });
    });

    on('message:delete', (id, cb) => {
      const m = messages.find((x) => x.id === id);
      if (!m || m.system || m.deleted || !canAccess(me, m.conv) || m.conv === 'news') return ok(cb, { error: 'Nicht möglich.' });
      const g = db.groups[m.conv];
      const chMod = m.conv.startsWith('ch:') && gHas(parseCh(m.conv).g, me, 'MANAGE_MESSAGES');
      if (m.from !== me && !(g && g.owner === me) && !chMod) return ok(cb, { error: 'Du kannst nur deine eigenen Nachrichten löschen.' });
      (m.att || []).forEach((a) => a.id && store.deleteMedia(a.id));
      Object.assign(m, { deleted: true, text: '', pinned: false, att: [], mentions: [] });
      store.saveMessage(m);
      emitConv(m.conv, 'message:update', m);
      ok(cb, { ok: true });
    });

    on('message:pin', (id, cb) => {
      const m = messages.find((x) => x.id === id);
      if (!m || m.system || m.deleted || !canAccess(me, m.conv) || m.conv === 'news') return ok(cb, { error: 'Nicht möglich.' });
      if (m.conv.startsWith('ch:') && !gHas(parseCh(m.conv).g, me, 'MANAGE_MESSAGES')) return ok(cb, { error: 'Dafür brauchst du die Berechtigung „Nachrichten verwalten“.' });
      m.pinned = !m.pinned;
      store.saveMessage(m);
      emitConv(m.conv, 'message:update', m);
      if (m.pinned) sys(m.conv, `${dn(me)} hat eine Nachricht angepinnt.`);
      ok(cb, { ok: true, pinned: m.pinned });
    });

    on('typing', (conv) => {
      if (!canAccess(me, conv) || conv === 'news') return;
      members(conv).forEach((u) => { if (u !== me) emitTo(u, 'typing', { conv, from: me }); });
    });

    on('read', (conv) => {
      if (!canAccess(me, conv)) return;
      const now = Date.now();
      (db.reads[conv] = db.reads[conv] || {})[me] = now;
      save();
      emitTo(me, 'read', { conv, user: me, at: now });
      if (conv.startsWith('ch:') || conv === 'news') return;
      if (receipts(me)) members(conv).forEach((u) => { if (u !== me && receipts(u)) emitTo(u, 'read', { conv, user: me, at: now }); });
    });

    // --- Blockieren & Melden ---
    on('block', (who, cb) => {
      who = norm(who);
      const u = db.users[me];
      if (!db.users[who] || who === me) return ok(cb, { error: 'Nicht möglich.' });
      u.blocked = u.blocked || [];
      if (!u.blocked.includes(who)) u.blocked.push(who);
      u.friends = u.friends.filter((f) => f !== who);
      u.pinned = (u.pinned || []).filter((f) => f !== who);
      db.users[who].friends = db.users[who].friends.filter((f) => f !== me);
      db.requests = db.requests.filter((r) => !((r.from === me && r.to === who) || (r.from === who && r.to === me)));
      save(); pushState(me); pushState(who);
      ok(cb, { ok: true });
    });
    on('unblock', (who, cb) => {
      who = norm(who);
      const u = db.users[me];
      u.blocked = (u.blocked || []).filter((x) => x !== who);
      save(); pushState(me);
      ok(cb, { ok: true });
    });
    on('report', ({ user, msgId, reason, text } = {}, cb) => {
      user = norm(user);
      if (!REPORT_REASONS.includes(reason)) return ok(cb, { error: 'Bitte wähle einen Grund.' });
      let msg = null;
      if (msgId) {
        const m = messages.find((x) => x.id === msgId);
        if (!m || !canAccess(me, m.conv)) return ok(cb, { error: 'Nachricht nicht gefunden.' });
        user = m.from;
        msg = { id: m.id, conv: m.conv, text: m.text, att: (m.att || []).map((a) => ({ kind: a.kind, id: a.id, url: a.url })), at: m.at };
      }
      if (!db.users[user] || user === me) return ok(cb, { error: 'Nicht möglich.' });
      const recent = db.reports.filter((r) => r.by === me && Date.now() - r.at < 3600e3).length;
      if (recent >= 10) return ok(cb, { error: 'Zu viele Meldungen. Versuch es später nochmal.' });
      const rep = { id: rid(12), by: me, user, msg, reason, text: clip(text, 500), at: Date.now(), status: 'open' };
      db.reports.push(rep);
      if (db.reports.length > 2000) db.reports.splice(0, db.reports.length - 2000);
      save();
      if (OWNER) emitTo(OWNER, 'admin:report', rep);
      ok(cb, { ok: true });
    });

    // --- Abzeichen (nur Owner) ---
    on('badge:set', ({ user, badge, on: val } = {}, cb) => {
      user = norm(user);
      if (!isOwner(me)) return ok(cb, { error: 'Nur der Owner kann Abzeichen vergeben.' });
      if (!db.users[user] || !GRANTABLE.includes(badge)) return ok(cb, { error: 'Nicht möglich.' });
      const u = db.users[user];
      u.badges = (u.badges || []).filter((b) => b !== badge);
      if (val) u.badges.push(badge);
      save();
      related(user).forEach(pushState);
      ok(cb, { ok: true });
    });

    // --- Gruppen ---
    on('group:create', ({ name, members: list, avatar } = {}, cb) => {
      name = clip(name, 40);
      if (!name) return ok(cb, { error: 'Gib der Gruppe einen Namen.' });
      const mem = [...new Set((list || []).map(norm))].filter((u) => areFriends(me, u));
      if (!mem.length) return ok(cb, { error: 'Wähle mindestens einen Freund aus.' });
      if (mem.length + 1 > db.config.maxGroup) return ok(cb, { error: `Gruppen dürfen höchstens ${db.config.maxGroup} Personen haben.` });
      const id = 'g_' + crypto.randomUUID();
      db.groups[id] = { id, name, owner: me, members: [me, ...mem], avatar: owned(avatar, me, 'image') ? avatar : null, created: Date.now() };
      save();
      db.groups[id].members.forEach(pushState);
      sys(id, `${dn(me)} hat die Gruppe „${name}“ erstellt.`);
      ok(cb, { ok: true, id });
    });
    on('group:update', ({ id, name, avatar } = {}, cb) => {
      const g = db.groups[id];
      if (!g || !g.members.includes(me)) return ok(cb, { error: 'Nicht möglich.' });
      const n = clip(name, 40);
      if (name !== undefined && n && n !== g.name) { g.name = n; sys(id, `${dn(me)} hat die Gruppe in „${g.name}“ umbenannt.`); }
      if (avatar !== undefined) {
        if (avatar === null) { store.deleteMedia(g.avatar); g.avatar = null; }
        else if (owned(avatar, me, 'image')) { store.deleteMedia(g.avatar); g.avatar = avatar; sys(id, `${dn(me)} hat das Gruppenbild geändert.`); }
      }
      save();
      g.members.forEach(pushState);
      ok(cb, { ok: true });
    });
    on('group:add', ({ id, users } = {}, cb) => {
      const g = db.groups[id];
      if (!g || !g.members.includes(me)) return ok(cb, { error: 'Nicht möglich.' });
      const add = [...new Set((users || []).map(norm))].filter((u) => areFriends(me, u) && !g.members.includes(u));
      if (!add.length) return ok(cb, { error: 'Niemand zum Hinzufügen.' });
      if (g.members.length + add.length > db.config.maxGroup) return ok(cb, { error: `Gruppen dürfen höchstens ${db.config.maxGroup} Personen haben.` });
      g.members.push(...add);
      save();
      g.members.forEach(pushState);
      sys(id, `${dn(me)} hat ${add.map(dn).join(', ')} hinzugefügt.`);
      ok(cb, { ok: true });
    });
    on('group:kick', ({ id, user } = {}, cb) => {
      const g = db.groups[id];
      user = norm(user);
      if (!g || g.owner !== me || user === me || !g.members.includes(user)) return ok(cb, { error: 'Nicht möglich.' });
      sys(id, `${dn(me)} hat ${dn(user)} entfernt.`);
      g.members = g.members.filter((u) => u !== user);
      save();
      [...g.members, user].forEach(pushState);
      ok(cb, { ok: true });
    });
    on('group:leave', (id, cb) => {
      const g = db.groups[id];
      if (!g || !g.members.includes(me)) return ok(cb, { error: 'Nicht möglich.' });
      sys(id, `${dn(me)} hat die Gruppe verlassen.`);
      g.members = g.members.filter((u) => u !== me);
      if (!g.members.length) { store.deleteMedia(g.avatar); delete db.groups[id]; removeConvMessages(id); }
      else if (g.owner === me) g.owner = g.members[0];
      save();
      [...g.members, me].forEach(pushState);
      ok(cb, { ok: true });
    });

    // --- Server (Gilden) ---
    const G = (id, perm, cb) => {
      const g = db.guilds[id];
      if (!g || !g.members[me]) { ok(cb, { error: 'Server nicht gefunden.' }); return null; }
      if (perm && !gHas(g, me, perm)) { ok(cb, { error: 'Dafür fehlt dir die Berechtigung.' }); return null; }
      return g;
    };
    const firstConv = (g) => g.channels[0] ? `ch:${g.id}:${g.channels[0].id}` : null;
    on('guild:create', ({ name, icon } = {}, cb) => {
      name = clip(name, 40);
      if (!name) return ok(cb, { error: 'Gib dem Server einen Namen.' });
      if (Object.values(db.guilds).filter((g) => g.owner === me).length >= 10) return ok(cb, { error: 'Du kannst höchstens 10 Server besitzen.' });
      const id = 's_' + rid(12);
      const ch = { id: rid(8), name: 'allgemein', topic: 'Willkommen! 👋', sendRoles: [] };
      db.guilds[id] = {
        id, name, icon: owned(icon, me, 'image') ? icon : null, owner: me, created: Date.now(),
        everyone: [...DEFAULT_PERMS],
        roles: [{ id: rid(8), name: 'Moderator', color: '#3ddc97', perms: ['KICK', 'MANAGE_MESSAGES', 'MENTION_EVERYONE', 'SEND', 'ATTACH', 'INVITE'], hoist: true }],
        channels: [ch, { id: rid(8), name: 'memes', topic: '', sendRoles: [] }],
        members: { [me]: { roles: [], joined: Date.now() } }, invites: {}, bans: {},
      };
      save(); pushState(me);
      sys(`ch:${id}:${ch.id}`, `${dn(me)} hat den Server „${name}“ erstellt.`);
      ok(cb, { ok: true, id });
    });
    on('guild:update', ({ id, name, icon, everyone } = {}, cb) => {
      const g = G(id, 'MANAGE_SERVER', cb); if (!g) return;
      if (name !== undefined && clip(name, 40)) g.name = clip(name, 40);
      if (icon !== undefined) { if (icon === null) { store.deleteMedia(g.icon); g.icon = null; } else if (owned(icon, me, 'image')) { store.deleteMedia(g.icon); g.icon = icon; } }
      if (Array.isArray(everyone) && gHas(g, me, 'MANAGE_ROLES')) g.everyone = everyone.filter((p) => PERMS.includes(p) && p !== 'ADMIN');
      save(); pushGuild(g);
      ok(cb, { ok: true });
    });
    on('guild:delete', (id, cb) => {
      const g = db.guilds[id];
      if (!g || g.owner !== me) return ok(cb, { error: 'Nur der Besitzer kann den Server löschen.' });
      const mem = guildMembers(g);
      g.channels.forEach((c) => removeConvMessages(`ch:${g.id}:${c.id}`));
      store.deleteMedia(g.icon);
      delete db.guilds[id];
      save(); mem.forEach(pushState);
      ok(cb, { ok: true });
    });
    on('guild:leave', (id, cb) => {
      const g = G(id, null, cb); if (!g) return;
      if (g.owner === me) return ok(cb, { error: 'Als Besitzer kannst du den Server nicht verlassen. Lösche ihn in den Einstellungen.' });
      delete g.members[me];
      save(); pushState(me); pushGuild(g);
      const fc = firstConv(g); if (fc) sys(fc, `${dn(me)} hat den Server verlassen.`);
      ok(cb, { ok: true });
    });
    on('invite:create', (id, cb) => {
      const g = G(id, 'INVITE', cb); if (!g) return;
      g.invites = g.invites || {};
      const mine = Object.entries(g.invites).find(([, i]) => i.by === me);
      if (mine) return ok(cb, { ok: true, code: mine[0] });
      let code; do code = rid(8); while (Object.values(db.guilds).some((x) => x.invites && x.invites[code]));
      g.invites[code] = { by: me, at: Date.now(), uses: 0 };
      save(); pushGuild(g);
      ok(cb, { ok: true, code });
    });
    on('invite:delete', ({ id, code } = {}, cb) => {
      const g = G(id, 'MANAGE_SERVER', cb); if (!g) return;
      delete (g.invites || {})[code];
      save(); pushGuild(g);
      ok(cb, { ok: true });
    });
    const byInvite = (code) => Object.values(db.guilds).find((g) => g.invites && g.invites[String(code || '').trim()]);
    on('invite:info', (code, cb) => {
      code = String(code || '').trim().replace(/^.*\/invite\//, '');
      const g = byInvite(code);
      if (!g) return ok(cb, { error: 'Diese Einladung ist ungültig oder abgelaufen.' });
      const mem = guildMembers(g);
      ok(cb, { ok: true, code, id: g.id, name: g.name, icon: g.icon || null, members: mem.length, online: mem.filter((m) => presence(m) !== 'offline').length, joined: !!g.members[me] });
    });
    on('invite:join', (code, cb) => {
      code = String(code || '').trim().replace(/^.*\/invite\//, '');
      const g = byInvite(code);
      if (!g) return ok(cb, { error: 'Diese Einladung ist ungültig oder abgelaufen.' });
      if (g.members[me]) return ok(cb, { ok: true, id: g.id });
      if ((g.bans || {})[me]) return ok(cb, { error: 'Du wurdest von diesem Server gebannt.' });
      if (guildMembers(g).length >= 500) return ok(cb, { error: 'Dieser Server ist voll.' });
      if (Object.values(db.guilds).filter((x) => x.members[me]).length >= 50) return ok(cb, { error: 'Du bist schon in 50 Servern.' });
      g.members[me] = { roles: [], joined: Date.now() };
      g.invites[code].uses = (g.invites[code].uses || 0) + 1;
      save(); pushGuild(g);
      const fc = firstConv(g); if (fc) sys(fc, `👋 ${dn(me)} ist dem Server beigetreten.`);
      ok(cb, { ok: true, id: g.id });
    });
    on('channel:create', ({ id, name, topic } = {}, cb) => {
      const g = G(id, 'MANAGE_CHANNELS', cb); if (!g) return;
      name = clip(name, 30).toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9äöüß_-]/g, '');
      if (!name) return ok(cb, { error: 'Gib dem Kanal einen Namen.' });
      if (g.channels.length >= 50) return ok(cb, { error: 'Maximal 50 Kanäle.' });
      const ch = { id: rid(8), name, topic: clip(topic, 120), sendRoles: [] };
      g.channels.push(ch);
      save(); pushGuild(g);
      ok(cb, { ok: true, channel: ch.id });
    });
    on('channel:update', ({ id, channel, name, topic, sendRoles, move } = {}, cb) => {
      const g = G(id, 'MANAGE_CHANNELS', cb); if (!g) return;
      const i = g.channels.findIndex((c) => c.id === channel);
      if (i < 0) return ok(cb, { error: 'Kanal nicht gefunden.' });
      const ch = g.channels[i];
      if (name !== undefined) { const n = clip(name, 30).toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9äöüß_-]/g, ''); if (n) ch.name = n; }
      if (topic !== undefined) ch.topic = clip(topic, 120);
      if (Array.isArray(sendRoles)) ch.sendRoles = sendRoles.filter((r) => g.roles.some((x) => x.id === r));
      if (move === 'up' && i > 0) [g.channels[i - 1], g.channels[i]] = [g.channels[i], g.channels[i - 1]];
      if (move === 'down' && i < g.channels.length - 1) [g.channels[i + 1], g.channels[i]] = [g.channels[i], g.channels[i + 1]];
      save(); pushGuild(g);
      ok(cb, { ok: true });
    });
    on('channel:delete', ({ id, channel } = {}, cb) => {
      const g = G(id, 'MANAGE_CHANNELS', cb); if (!g) return;
      if (g.channels.length <= 1) return ok(cb, { error: 'Ein Server braucht mindestens einen Kanal.' });
      if (!g.channels.some((c) => c.id === channel)) return ok(cb, { error: 'Kanal nicht gefunden.' });
      g.channels = g.channels.filter((c) => c.id !== channel);
      removeConvMessages(`ch:${g.id}:${channel}`);
      save(); pushGuild(g);
      ok(cb, { ok: true });
    });
    const cleanRole = (d, r, g) => {
      if (d.name !== undefined && clip(d.name, 30)) r.name = clip(d.name, 30);
      if (d.color !== undefined) r.color = HEX.test(d.color || '') ? d.color : null;
      if (d.hoist !== undefined) r.hoist = !!d.hoist;
      if (Array.isArray(d.perms)) {
        const mine = gPerms(g, me);
        r.perms = d.perms.filter((p) => PERMS.includes(p) && (g.owner === me || mine.includes(p)));
      }
    };
    on('role:create', ({ id, name, color, perms, hoist } = {}, cb) => {
      const g = G(id, 'MANAGE_ROLES', cb); if (!g) return;
      if (g.roles.length >= 30) return ok(cb, { error: 'Maximal 30 Rollen.' });
      const r = { id: rid(8), name: 'Neue Rolle', color: null, perms: [...DEFAULT_PERMS], hoist: false };
      cleanRole({ name, color, perms, hoist }, r, g);
      const top = g.owner === me ? 0 : topPos(g, me) + 1;
      g.roles.splice(Math.min(top, g.roles.length), 0, r);
      save(); pushGuild(g);
      ok(cb, { ok: true, role: r.id });
    });
    on('role:update', ({ id, role, move, ...d } = {}, cb) => {
      const g = G(id, 'MANAGE_ROLES', cb); if (!g) return;
      if (!canManageRole(g, me, role)) return ok(cb, { error: 'Du kannst nur Rollen unter deiner höchsten Rolle bearbeiten.' });
      const i = g.roles.findIndex((r) => r.id === role);
      cleanRole(d, g.roles[i], g);
      if (move === 'up' && i > 0 && canManageRole(g, me, g.roles[i - 1].id)) [g.roles[i - 1], g.roles[i]] = [g.roles[i], g.roles[i - 1]];
      if (move === 'down' && i < g.roles.length - 1) [g.roles[i + 1], g.roles[i]] = [g.roles[i], g.roles[i + 1]];
      save(); pushGuild(g);
      ok(cb, { ok: true });
    });
    on('role:delete', ({ id, role } = {}, cb) => {
      const g = G(id, 'MANAGE_ROLES', cb); if (!g) return;
      if (!canManageRole(g, me, role)) return ok(cb, { error: 'Du kannst nur Rollen unter deiner höchsten Rolle löschen.' });
      g.roles = g.roles.filter((r) => r.id !== role);
      Object.values(g.members).forEach((m) => { m.roles = (m.roles || []).filter((r) => r !== role); });
      g.channels.forEach((c) => { c.sendRoles = (c.sendRoles || []).filter((r) => r !== role); });
      save(); pushGuild(g);
      ok(cb, { ok: true });
    });
    on('member:roles', ({ id, user, roles } = {}, cb) => {
      const g = G(id, 'MANAGE_ROLES', cb); if (!g) return;
      user = norm(user);
      const m = g.members[user];
      if (!m) return ok(cb, { error: 'Mitglied nicht gefunden.' });
      if (user !== me && !canModerate(g, me, user) && g.owner !== me) return ok(cb, { error: 'Diese Person steht über dir.' });
      const want = new Set((roles || []).filter((r) => g.roles.some((x) => x.id === r)));
      const result = new Set(m.roles || []);
      g.roles.forEach((r) => { if (!canManageRole(g, me, r.id)) return; if (want.has(r.id)) result.add(r.id); else result.delete(r.id); });
      m.roles = [...result];
      save(); pushGuild(g);
      ok(cb, { ok: true });
    });
    on('member:kick', ({ id, user } = {}, cb) => {
      const g = G(id, 'KICK', cb); if (!g) return;
      user = norm(user);
      if (!g.members[user] || !canModerate(g, me, user)) return ok(cb, { error: 'Du kannst diese Person nicht entfernen.' });
      delete g.members[user];
      save(); pushGuild(g); pushState(user);
      emitTo(user, 'notice', { text: `Du wurdest vom Server „${g.name}“ entfernt.` });
      const fc = firstConv(g); if (fc) sys(fc, `${dn(user)} wurde von ${dn(me)} entfernt.`);
      ok(cb, { ok: true });
    });
    on('member:ban', ({ id, user, reason } = {}, cb) => {
      const g = G(id, 'BAN', cb); if (!g) return;
      user = norm(user);
      if (!db.users[user] || (g.members[user] && !canModerate(g, me, user)) || user === g.owner) return ok(cb, { error: 'Du kannst diese Person nicht bannen.' });
      const was = !!g.members[user];
      delete g.members[user];
      g.bans = g.bans || {};
      g.bans[user] = { by: me, at: Date.now(), reason: clip(reason, 200) };
      save(); pushGuild(g); pushState(user);
      if (was) { emitTo(user, 'notice', { text: `Du wurdest vom Server „${g.name}“ gebannt.` }); const fc = firstConv(g); if (fc) sys(fc, `🔨 ${dn(user)} wurde gebannt.`); }
      ok(cb, { ok: true });
    });
    on('member:unban', ({ id, user } = {}, cb) => {
      const g = G(id, 'BAN', cb); if (!g) return;
      delete (g.bans || {})[norm(user)];
      save(); pushGuild(g);
      ok(cb, { ok: true });
    });

    // --- Storys ---
    on('story:add', ({ kind, media, text, bg } = {}, cb) => {
      if (db.stories.filter((s) => s.user === me).length >= 30) return ok(cb, { error: 'Maximal 30 Storys gleichzeitig.' });
      const s = { id: rid(12), user: me, kind: 'text', media: null, text: clip(text, 300), bg: HEX.test(bg || '') ? bg : '#8b4dff', at: Date.now(), views: {} };
      if (kind === 'image' || kind === 'video') {
        if (!owned(media, me, kind)) return ok(cb, { error: 'Ungültige Datei.' });
        s.kind = kind; s.media = media;
      } else if (!s.text) return ok(cb, { error: 'Schreib etwas für deine Story.' });
      db.stories.push(s);
      save();
      related(me).forEach(pushState);
      ok(cb, { ok: true });
    });
    on('story:view', (id) => {
      const s = db.stories.find((x) => x.id === id);
      if (!s || s.user === me || (!areFriends(me, s.user))) return;
      s.views = s.views || {};
      if (s.views[me]) return;
      s.views[me] = Date.now();
      save(); pushState(s.user);
    });
    on('story:delete', (id, cb) => {
      const s = db.stories.find((x) => x.id === id);
      if (!s || (s.user !== me && !isOwner(me))) return ok(cb, { error: 'Nicht möglich.' });
      db.stories = db.stories.filter((x) => x.id !== id);
      if (s.media) store.deleteMedia(s.media);
      save(); related(s.user).forEach(pushState);
      ok(cb, { ok: true });
    });
    on('story:reply', ({ id, text } = {}, cb) => {
      const s = db.stories.find((x) => x.id === id);
      text = clip(text, 1000);
      if (!s || !text || !areFriends(me, s.user)) return ok(cb, { error: 'Nicht möglich.' });
      addMessage(dmId(me, s.user), me, text, { story: { user: s.user, kind: s.kind, media: s.media, text: clip(s.text, 80), bg: s.bg } });
      ok(cb, { ok: true });
    });

    // --- Developer Dashboard (nur Owner) ---
    const admin = (cb) => { if (!isOwner(me)) { ok(cb, { error: 'Nur für den Owner.' }); return false; } return true; };
    on('admin:stats', (cb) => {
      if (!admin(cb)) return;
      const day = Date.now() - 864e5;
      ok(cb, {
        users: Object.keys(db.users).length, online: online.size, newToday: Object.values(db.users).filter((u) => u.created > day).length,
        activeToday: Object.values(db.users).filter((u) => (u.lastSeen || 0) > day).length + 0,
        messages: messages.length, messagesToday: messages.filter((m) => m.at > day).length,
        groups: Object.keys(db.groups).length, guilds: Object.keys(db.guilds).length, stories: db.stories.length,
        reports: db.reports.filter((r) => r.status === 'open').length, banned: Object.keys(db.users).filter((n) => banInfo(n)).length,
        config: db.config, storage: store.kind,
      });
    });
    on('admin:users', ({ q } = {}, cb) => {
      if (!admin(cb)) return;
      q = norm(q);
      const list = Object.keys(db.users).filter((n) => !q || n.includes(q) || norm(db.users[n].displayName).includes(q))
        .sort((a, b) => (db.users[b].created || 0) - (db.users[a].created || 0)).slice(0, 200)
        .map((n) => { const u = db.users[n]; return { ...profile(n), lastSeen: online.has(n) ? Date.now() : u.lastSeen || u.created, online: online.has(n), ban: banInfo(n), friends: u.friends.length, reports: db.reports.filter((r) => r.user === n).length, messages: messages.filter((m) => m.from === n).length }; });
      ok(cb, list);
    });
    on('admin:action', ({ user, action, duration, reason } = {}, cb) => {
      if (!admin(cb)) return;
      user = norm(user);
      if (!db.users[user]) return ok(cb, { error: 'Nutzer nicht gefunden.' });
      if (user === me && action !== 'unban') return ok(cb, { error: 'Das kannst du nicht bei dir selbst machen.' });
      const u = db.users[user];
      reason = clip(reason, 200);
      if (action === 'logout') {
        for (const [t, n] of Object.entries(db.tokens)) if (n === user) delete db.tokens[t];
        kickUser(user, { type: 'logout', text: 'Du wurdest von einem Administrator abgemeldet.' + (reason ? ' Grund: ' + reason : '') });
      } else if (action === 'suspend' || action === 'ban') {
        const ms = Math.min(365 * 864e5, Math.max(60e3, +duration || 0));
        u.ban = { until: action === 'ban' ? 0 : Date.now() + ms, reason, by: me, at: Date.now() };
        for (const [t, n] of Object.entries(db.tokens)) if (n === user) delete db.tokens[t];
        kickUser(user, { type: 'ban', text: banText(u.ban) });
      } else if (action === 'unban') {
        delete u.ban;
      } else return ok(cb, { error: 'Unbekannte Aktion.' });
      save();
      ok(cb, { ok: true });
    });
    on('admin:reports', (cb) => {
      if (!admin(cb)) return;
      ok(cb, db.reports.slice().reverse().slice(0, 300).map((r) => ({ ...r, userBanned: !!banInfo(r.user) })));
    });
    on('admin:report', ({ id, status } = {}, cb) => {
      if (!admin(cb)) return;
      const r = db.reports.find((x) => x.id === id);
      if (!r) return ok(cb, { error: 'Nicht gefunden.' });
      r.status = status === 'open' ? 'open' : 'done';
      save();
      ok(cb, { ok: true });
    });
    on('admin:deleteMessage', (id, cb) => {
      if (!admin(cb)) return;
      const m = messages.find((x) => x.id === id);
      if (!m || m.deleted) return ok(cb, { error: 'Nachricht nicht gefunden oder schon gelöscht.' });
      (m.att || []).forEach((a) => a.id && store.deleteMedia(a.id));
      Object.assign(m, { deleted: true, text: '', pinned: false, att: [], mentions: [] });
      store.saveMessage(m);
      emitConv(m.conv, 'message:update', m);
      ok(cb, { ok: true });
    });
    on('admin:config', (d = {}, cb) => {
      if (!admin(cb)) return;
      if (Number.isFinite(+d.maxGroup)) db.config.maxGroup = Math.min(500, Math.max(2, Math.round(+d.maxGroup)));
      if (typeof d.registrationOpen === 'boolean') db.config.registrationOpen = d.registrationOpen;
      save();
      [...online.keys()].forEach(pushState);
      ok(cb, { ok: true, config: db.config });
    });
    on('admin:broadcast', ({ text, to, title, att } = {}, cb) => {
      if (!admin(cb)) return;
      text = clip(text, 4000);
      const files = cleanAtt(att, me).filter((f) => f.kind === 'image' || f.kind === 'video' || f.kind === 'gif');
      if (!text && !files.length) return ok(cb, { error: 'Schreib eine Nachricht.' });
      let targets = null;
      if (Array.isArray(to)) {
        targets = [...new Set(to.map(norm))].filter((n) => db.users[n]);
        if (!targets.length) return ok(cb, { error: 'Keine gültigen Empfänger.' });
      }
      const msg = addMessage('news', 'connecta', text, { system: false, official: true, title: clip(title, 80), to: targets, att: files });
      ok(cb, { ok: true, count: targets ? targets.length : Object.keys(db.users).length, id: msg.id });
    });

    // --- Anrufe (WebRTC-Signaling, 1:1), Soundboard & Medienstatus ---
    ['call:offer', 'call:answer', 'call:ice', 'call:end', 'call:decline', 'call:sound', 'call:media'].forEach((ev) => {
      on(ev, (data) => {
        const to = norm(data && data.to);
        if (!areFriends(me, to) || eitherBlocked(me, to)) return;
        emitTo(to, ev, { ...data, from: me });
      });
    });

    socket.on('disconnect', () => {
      const set = online.get(me);
      if (set) { set.delete(socket.id); if (!set.size) online.delete(me); }
      if (db.users[me]) { db.users[me].lastSeen = Date.now(); save(); }
      if (!online.has(me)) related(me).forEach(pushState);
    });
  });

  // ---------- Alle anderen Adressen → App (verhindert „Not Found“, z. B. bei Einladungslinks) ----------
  app.get(/^\/(?!api\/|media\/|socket\.io\/).*/, (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));

  cleanStories();
  server.listen(PORT, () => console.log(`Connecta läuft auf http://localhost:${PORT} – Speicher: ${store.kind}${OWNER ? ' – Owner: ' + OWNER : ' – kein OWNER gesetzt'}${process.env.TURN_URL ? ' – TURN aktiv' : ''}${process.env.GIPHY_API_KEY ? ' – GIFs aktiv' : ''}`));
})().catch((e) => { console.error('Start fehlgeschlagen:', e); process.exit(1); });
