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

(async () => {
  const store = await createStore(__dirname);
  const db = store.core;
  db.users = db.users || {}; db.tokens = db.tokens || {}; db.requests = db.requests || []; db.groups = db.groups || {}; db.reads = db.reads || {};
  const messages = store.messages;
  const save = () => store.saveCore(db);

  const app = express();
  const server = http.createServer(app);
  const io = new Server(server, { maxHttpBufferSize: 1e6 });

  const norm = (u) => String(u || '').trim().toLowerCase();
  const validName = (u) => /^[a-z0-9_.]{3,20}$/.test(u);
  const clip = (s, n) => String(s ?? '').trim().slice(0, n);
  const dmId = (a, b) => 'dm:' + [a, b].sort().join('|');
  const newUser = (hash) => ({ hash, friends: [], created: Date.now(), displayName: '', bio: '', pronouns: '', customStatus: '', status: 'online', avatar: null, banner: null, settings: { theme: 'connecta', font: 'nunito', msgSize: 15, readReceipts: true }, sounds: [], blocked: [], badges: [] });

  app.use(express.json());
  app.use(express.static(path.join(__dirname, 'public')));

  // ---------- Registrierung & Login ----------
  app.post('/api/register', async (req, res) => {
    const username = norm(req.body.username);
    const { password } = req.body;
    if (!validName(username)) return res.status(400).json({ error: 'Username: 3–20 Zeichen, nur a–z, 0–9, _ und .' });
    if (['everyone', 'alle'].includes(username)) return res.status(400).json({ error: 'Dieser Username ist reserviert.' });
    if (!password || password.length < 6) return res.status(400).json({ error: 'Passwort braucht mindestens 6 Zeichen.' });
    if (db.users[username]) return res.status(409).json({ error: 'Dieser Username ist schon vergeben.' });
    const early = Object.keys(db.users).length < 100;
    db.users[username] = newUser(await bcrypt.hash(password, 10));
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
    const token = crypto.randomBytes(32).toString('hex');
    db.tokens[token] = username;
    save();
    res.json({ token, username });
  });

  // ---------- Dateien hochladen & abrufen ----------
  app.post('/api/upload', express.raw({ type: () => true, limit: '31mb' }), async (req, res) => {
    const me = db.tokens[req.get('x-token')];
    if (!me || !db.users[me]) return res.status(401).json({ error: 'Nicht angemeldet.' });
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

  // ---------- Hilfsfunktionen ----------
  const online = new Map(); // username -> Set(socketId)
  const emitTo = (name, ev, data) => (online.get(name) || []).forEach((id) => io.to(id).emit(ev, data));
  const areFriends = (a, b) => !!(db.users[a] && db.users[a].friends.includes(b));
  const owned = (id, me, kind) => { const m = id && store.meta(id); return !!(m && m.owner === me && (!kind || m.mime.startsWith(kind + '/'))); };
  const dn = (n) => (db.users[n] && db.users[n].displayName) || n;
  const blocked = (a, b) => !!(db.users[a] && (db.users[a].blocked || []).includes(b));
  const eitherBlocked = (a, b) => blocked(a, b) || blocked(b, a);
  const receipts = (n) => !db.users[n] || !db.users[n].settings || db.users[n].settings.readReceipts !== false;
  function badgesOf(n) {
    const u = db.users[n];
    const set = new Set((u && u.badges) || []);
    if (n === OWNER) set.add('dev');
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
    return { username: name, displayName: u.displayName || '', bio: u.bio || '', pronouns: u.pronouns || '', customStatus: u.customStatus || '', avatar: u.avatar || null, banner: u.banner || null, status: presence(name), badges: badgesOf(name), owner: name === OWNER };
  }
  function members(conv) {
    if (conv.startsWith('note:')) return [conv.slice(5)];
    if (conv.startsWith('dm:')) return conv.slice(3).split('|');
    const g = db.groups[conv];
    return g ? g.members : [];
  }
  function canAccess(me, conv) {
    if (typeof conv !== 'string') return false;
    if (conv.startsWith('note:')) return conv === 'note:' + me;
    if (conv.startsWith('dm:')) {
      const [a, b] = conv.slice(3).split('|');
      if (a !== me && b !== me) return false;
      return areFriends(me, a === me ? b : a);
    }
    const g = db.groups[conv];
    return !!(g && g.members.includes(me));
  }
  const emitConv = (conv, ev, data) => members(conv).forEach((u) => emitTo(u, ev, data));
  function lastOf(conv) {
    for (let i = messages.length - 1; i >= 0; i--) if (messages[i].conv === conv) return messages[i];
    return null;
  }
  function related(name) {
    const set = new Set([name]);
    const u = db.users[name];
    if (u) u.friends.forEach((f) => set.add(f));
    Object.values(db.groups).forEach((g) => { if (g.members.includes(name)) g.members.forEach((m) => set.add(m)); });
    db.requests.forEach((r) => { if (r.from === name) set.add(r.to); if (r.to === name) set.add(r.from); });
    return set;
  }

  function state(me) {
    const u = db.users[me];
    const groups = Object.values(db.groups).filter((g) => g.members.includes(me));
    const incoming = db.requests.filter((r) => r.to === me).map((r) => r.from);
    const outgoing = db.requests.filter((r) => r.from === me).map((r) => r.to);
    const people = {};
    [me, ...u.friends, ...incoming, ...outgoing, ...groups.flatMap((g) => g.members)].forEach((n) => { people[n] = profile(n); });
    const myBlocked = u.blocked || [];
    myBlocked.forEach((n) => { if (db.users[n]) people[n] = profile(n); });
    const convs = [...u.friends.map((f) => dmId(me, f)), ...groups.map((g) => g.id), 'note:' + me];
    const convSet = new Set(convs);
    const last = {}, unread = {}, mentions = {};
    for (const m of messages) {
      if (!convSet.has(m.conv)) continue;
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
      if (!r) return;
      reads[c] = {};
      for (const [n, t] of Object.entries(r)) if (n === me || (receipts(me) && receipts(n))) reads[c][n] = t;
    });
    return {
      me, myStatus: u.status || 'online', settings: u.settings || {}, sounds: u.sounds || [], people,
      blocked: myBlocked, isOwner: me === OWNER, unread, mentions, reads,
      friends: u.friends, incoming, outgoing,
      groups: groups.map((g) => ({ id: g.id, name: g.name, owner: g.owner, members: g.members, avatar: g.avatar || null, created: g.created })),
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
    if (!conv.startsWith('dm:') && /@(everyone|alle)\b/i.test(text)) mem.forEach((u) => set.add(u));
    set.delete(from);
    return [...set];
  }
  function removeConvMessages(conv) {
    for (let i = messages.length - 1; i >= 0; i--) if (messages[i].conv === conv) { (messages[i].att || []).forEach((a) => store.deleteMedia(a.id)); messages.splice(i, 1); }
    store.deleteConv(conv);
  }

  // ---------- Echtzeit ----------
  io.use((socket, next) => {
    const name = db.tokens[socket.handshake.auth.token];
    if (!name || !db.users[name]) return next(new Error('unauthorized'));
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

    // --- Profil, Status & Einstellungen ---
    socket.on('profile:update', (d = {}, cb) => {
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

    socket.on('status:set', (d = {}, cb) => {
      const u = db.users[me];
      if (STATUSES.includes(d.status)) u.status = d.status;
      if ('customStatus' in d) u.customStatus = clip(d.customStatus, 60);
      save();
      related(me).forEach(pushState);
      ok(cb, { ok: true });
    });

    socket.on('settings:update', (d = {}, cb) => {
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
    socket.on('sound:add', (d = {}, cb) => {
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
    socket.on('sound:remove', (id, cb) => {
      const u = db.users[me];
      const s = (u.sounds || []).find((x) => x.id === id);
      if (!s) return ok(cb, { error: 'Nicht gefunden.' });
      u.sounds = u.sounds.filter((x) => x.id !== id);
      store.deleteMedia(s.media);
      save(); pushState(me);
      ok(cb, { ok: true });
    });

    // --- Freunde ---
    socket.on('search', (q, cb) => {
      q = norm(q);
      if (!q) return ok(cb, []);
      ok(cb, Object.keys(db.users).filter((n) => n !== me && !blocked(n, me) && (n.includes(q) || norm(db.users[n].displayName).includes(q))).slice(0, 10).map(profile));
    });

    socket.on('friend:request', (to, cb) => {
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
    socket.on('friend:accept', (from, cb) => accept(norm(from), cb));
    socket.on('friend:decline', (from) => {
      from = norm(from);
      db.requests = db.requests.filter((r) => !((r.from === from && r.to === me) || (r.from === me && r.to === from)));
      save(); pushState(me); pushState(from);
    });
    socket.on('friend:remove', (who) => {
      who = norm(who);
      if (!db.users[who]) return;
      db.users[me].friends = db.users[me].friends.filter((f) => f !== who);
      db.users[who].friends = db.users[who].friends.filter((f) => f !== me);
      save(); pushState(me); pushState(who);
    });

    // --- Nachrichten ---
    socket.on('history', (d, cb) => {
      const { conv, before } = typeof d === 'string' ? { conv: d } : d || {};
      if (!canAccess(me, conv)) return ok(cb, []);
      const list = messages.filter((m) => m.conv === conv && (!before || m.at < before));
      ok(cb, list.slice(-100));
    });

    socket.on('message', ({ conv, text, att } = {}, cb) => {
      text = clip(text, 4000);
      if (!canAccess(me, conv)) return ok(cb, { error: 'Nicht möglich.' });
      const files = (Array.isArray(att) ? att : []).slice(0, 10).filter((a) => a && owned(a.id, me)).map((a) => {
        const m = store.meta(a.id);
        const base = m.mime.split('/')[0];
        const o = { id: a.id, mime: m.mime, size: m.size, name: clip(a.name, 80), kind: base === 'audio' && a.kind === 'voice' ? 'voice' : base };
        if (Number.isFinite(+a.dur)) o.dur = Math.min(3600, Math.max(0, +a.dur));
        if (Number.isFinite(+a.w) && Number.isFinite(+a.h)) { o.w = Math.min(10000, Math.round(+a.w)); o.h = Math.min(10000, Math.round(+a.h)); }
        return o;
      });
      if (!text && !files.length) return ok(cb, { error: 'Leere Nachricht.' });
      addMessage(conv, me, text, { att: files, mentions: parseMentions(conv, me, text) });
      ok(cb, { ok: true });
    });

    socket.on('message:delete', (id, cb) => {
      const m = messages.find((x) => x.id === id);
      if (!m || m.system || m.deleted || !canAccess(me, m.conv)) return ok(cb, { error: 'Nicht möglich.' });
      const g = db.groups[m.conv];
      if (m.from !== me && !(g && g.owner === me)) return ok(cb, { error: 'Du kannst nur deine eigenen Nachrichten löschen.' });
      (m.att || []).forEach((a) => store.deleteMedia(a.id));
      Object.assign(m, { deleted: true, text: '', pinned: false, att: [], mentions: [] });
      store.saveMessage(m);
      emitConv(m.conv, 'message:update', m);
      ok(cb, { ok: true });
    });

    socket.on('message:pin', (id, cb) => {
      const m = messages.find((x) => x.id === id);
      if (!m || m.system || m.deleted || !canAccess(me, m.conv)) return ok(cb, { error: 'Nicht möglich.' });
      m.pinned = !m.pinned;
      store.saveMessage(m);
      emitConv(m.conv, 'message:update', m);
      if (m.pinned) sys(m.conv, `${dn(me)} hat eine Nachricht angepinnt.`);
      ok(cb, { ok: true, pinned: m.pinned });
    });

    socket.on('typing', (conv) => {
      if (!canAccess(me, conv)) return;
      members(conv).forEach((u) => { if (u !== me) emitTo(u, 'typing', { conv, from: me }); });
    });

    // --- Gelesen ---
    socket.on('read', (conv) => {
      if (!canAccess(me, conv)) return;
      const now = Date.now();
      (db.reads[conv] = db.reads[conv] || {})[me] = now;
      save();
      emitTo(me, 'read', { conv, user: me, at: now });
      if (receipts(me)) members(conv).forEach((u) => { if (u !== me && receipts(u)) emitTo(u, 'read', { conv, user: me, at: now }); });
    });

    // --- Blockieren ---
    socket.on('block', (who, cb) => {
      who = norm(who);
      const u = db.users[me];
      if (!db.users[who] || who === me) return ok(cb, { error: 'Nicht möglich.' });
      u.blocked = u.blocked || [];
      if (!u.blocked.includes(who)) u.blocked.push(who);
      u.friends = u.friends.filter((f) => f !== who);
      db.users[who].friends = db.users[who].friends.filter((f) => f !== me);
      db.requests = db.requests.filter((r) => !((r.from === me && r.to === who) || (r.from === who && r.to === me)));
      save(); pushState(me); pushState(who);
      ok(cb, { ok: true });
    });
    socket.on('unblock', (who, cb) => {
      who = norm(who);
      const u = db.users[me];
      u.blocked = (u.blocked || []).filter((x) => x !== who);
      save(); pushState(me);
      ok(cb, { ok: true });
    });

    // --- Abzeichen (nur Owner) ---
    socket.on('badge:set', ({ user, badge, on } = {}, cb) => {
      user = norm(user);
      if (!OWNER || me !== OWNER) return ok(cb, { error: 'Nur der Owner kann Abzeichen vergeben.' });
      if (!db.users[user] || !GRANTABLE.includes(badge)) return ok(cb, { error: 'Nicht möglich.' });
      const u = db.users[user];
      u.badges = (u.badges || []).filter((b) => b !== badge);
      if (on) u.badges.push(badge);
      save();
      related(user).forEach(pushState);
      ok(cb, { ok: true });
    });

    // --- Gruppen ---
    socket.on('group:create', ({ name, members: list, avatar } = {}, cb) => {
      name = clip(name, 40);
      if (!name) return ok(cb, { error: 'Gib der Gruppe einen Namen.' });
      const mem = [...new Set((list || []).map(norm))].filter((u) => areFriends(me, u));
      if (!mem.length) return ok(cb, { error: 'Wähle mindestens einen Freund aus.' });
      const id = 'g_' + crypto.randomUUID();
      db.groups[id] = { id, name, owner: me, members: [me, ...mem], avatar: owned(avatar, me, 'image') ? avatar : null, created: Date.now() };
      save();
      db.groups[id].members.forEach(pushState);
      sys(id, `${dn(me)} hat die Gruppe „${name}“ erstellt.`);
      ok(cb, { ok: true, id });
    });

    socket.on('group:update', ({ id, name, avatar } = {}, cb) => {
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

    socket.on('group:add', ({ id, users } = {}, cb) => {
      const g = db.groups[id];
      if (!g || !g.members.includes(me)) return ok(cb, { error: 'Nicht möglich.' });
      const add = [...new Set((users || []).map(norm))].filter((u) => areFriends(me, u) && !g.members.includes(u));
      if (!add.length) return ok(cb, { error: 'Niemand zum Hinzufügen.' });
      g.members.push(...add);
      save();
      g.members.forEach(pushState);
      sys(id, `${dn(me)} hat ${add.map(dn).join(', ')} hinzugefügt.`);
      ok(cb, { ok: true });
    });

    socket.on('group:kick', ({ id, user } = {}, cb) => {
      const g = db.groups[id];
      user = norm(user);
      if (!g || g.owner !== me || user === me || !g.members.includes(user)) return ok(cb, { error: 'Nicht möglich.' });
      sys(id, `${dn(me)} hat ${dn(user)} entfernt.`);
      g.members = g.members.filter((u) => u !== user);
      save();
      [...g.members, user].forEach(pushState);
      ok(cb, { ok: true });
    });

    socket.on('group:leave', (id, cb) => {
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

    // --- Anrufe (WebRTC-Signaling, 1:1) & Soundboard ---
    ['call:offer', 'call:answer', 'call:ice', 'call:end', 'call:decline', 'call:sound'].forEach((ev) => {
      socket.on(ev, (data) => {
        const to = norm(data && data.to);
        if (!areFriends(me, to) || eitherBlocked(me, to)) return;
        emitTo(to, ev, { ...data, from: me });
      });
    });

    socket.on('disconnect', () => {
      const set = online.get(me);
      if (set) { set.delete(socket.id); if (!set.size) online.delete(me); }
      if (!online.has(me)) related(me).forEach(pushState);
    });
  });

  server.listen(PORT, () => console.log(`Connecta läuft auf http://localhost:${PORT} – Speicher: ${store.kind}${OWNER ? ' – Owner: ' + OWNER : ' – kein OWNER gesetzt'}`));
})().catch((e) => { console.error('Start fehlgeschlagen:', e); process.exit(1); });
