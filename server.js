// Connecta – Server (Express + Socket.IO)
const express = require('express');
const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { maxHttpBufferSize: 8e6 });
const PORT = process.env.PORT || 3000;
const DB_FILE = path.join(__dirname, 'data.json');

// ---------- Einfache Datei-Datenbank ----------
let db = { users: {}, tokens: {}, requests: [], messages: [], groups: {} };
if (fs.existsSync(DB_FILE)) {
  try { db = JSON.parse(fs.readFileSync(DB_FILE, 'utf8')); } catch (e) { console.error('data.json defekt, starte leer'); }
}
db.groups = db.groups || {};
const dmId = (a, b) => 'dm:' + [a, b].sort().join('|');
// Alte Nachrichten (Version 1) auf das neue Format umstellen
db.messages.forEach((m) => { if (!m.conv && m.to) { m.conv = dmId(m.from, m.to); delete m.to; } });

let saveTimer = null;
function save() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => fs.writeFile(DB_FILE, JSON.stringify(db), () => {}), 300);
}

const norm = (u) => String(u || '').trim().toLowerCase();
const validName = (u) => /^[a-z0-9_.]{3,20}$/.test(u);
const clip = (s, n) => String(s || '').trim().slice(0, n);
const THEMES = ['connecta', 'dark', 'light'];
const isImage = (s) => typeof s === 'string' && /^data:image\/(png|jpeg|webp|gif);base64,/.test(s) && s.length < 4e6;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// ---------- Registrierung & Login ----------
app.post('/api/register', async (req, res) => {
  const username = norm(req.body.username);
  const { password } = req.body;
  if (!validName(username)) return res.status(400).json({ error: 'Username: 3–20 Zeichen, nur a–z, 0–9, _ und .' });
  if (!password || password.length < 6) return res.status(400).json({ error: 'Passwort braucht mindestens 6 Zeichen.' });
  if (db.users[username]) return res.status(409).json({ error: 'Dieser Username ist schon vergeben.' });
  db.users[username] = { hash: await bcrypt.hash(password, 10), friends: [], created: Date.now(), displayName: '', bio: '', pronouns: '', theme: 'connecta', avatar: null, avatarV: 0, banner: null, bannerV: 0 };
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

// ---------- Bilder (Profilbild, Banner, Gruppenbild) ----------
app.get('/api/img/:kind/:id', (req, res) => {
  const { kind, id } = req.params;
  let data = null;
  if (kind === 'avatar') data = db.users[id] && db.users[id].avatar;
  if (kind === 'banner') data = db.users[id] && db.users[id].banner;
  if (kind === 'group') data = db.groups[id] && db.groups[id].avatar;
  const m = data && data.match(/^data:(image\/[a-z]+);base64,(.+)$/);
  if (!m) return res.sendStatus(404);
  res.set('Cache-Control', 'public, max-age=31536000, immutable');
  res.type(m[1]).send(Buffer.from(m[2], 'base64'));
});

// ---------- Hilfsfunktionen ----------
const online = new Map(); // username -> Set(socketId)
const emitTo = (name, ev, data) => (online.get(name) || []).forEach((id) => io.to(id).emit(ev, data));
const areFriends = (a, b) => !!(db.users[a] && db.users[a].friends.includes(b));

function profile(name) {
  const u = db.users[name];
  if (!u) return { username: name, displayName: 'Gelöschter Nutzer' };
  return { username: name, displayName: u.displayName || '', bio: u.bio || '', pronouns: u.pronouns || '', avatarV: u.avatar ? u.avatarV : 0, bannerV: u.banner ? u.bannerV : 0, online: online.has(name) };
}
function members(conv) {
  if (conv.startsWith('dm:')) return conv.slice(3).split('|');
  const g = db.groups[conv];
  return g ? g.members : [];
}
function canAccess(me, conv) {
  if (typeof conv !== 'string') return false;
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
  for (let i = db.messages.length - 1; i >= 0; i--) if (db.messages[i].conv === conv) return db.messages[i];
  return null;
}
function related(name) {
  const set = new Set([name]);
  const u = db.users[name];
  if (u) u.friends.forEach((f) => set.add(f));
  Object.values(db.groups).forEach((g) => { if (g.members.includes(name)) g.members.forEach((m) => set.add(m)); });
  return set;
}

function state(me) {
  const u = db.users[me];
  const groups = Object.values(db.groups).filter((g) => g.members.includes(me));
  const incoming = db.requests.filter((r) => r.to === me).map((r) => r.from);
  const outgoing = db.requests.filter((r) => r.from === me).map((r) => r.to);
  const people = {};
  [me, ...u.friends, ...incoming, ...outgoing, ...groups.flatMap((g) => g.members)].forEach((n) => { people[n] = profile(n); });
  const last = {};
  u.friends.forEach((f) => { const l = lastOf(dmId(me, f)); if (l) last[dmId(me, f)] = l; });
  groups.forEach((g) => { const l = lastOf(g.id); if (l) last[g.id] = l; });
  return {
    me, theme: u.theme || 'connecta', people,
    friends: u.friends, incoming, outgoing,
    groups: groups.map((g) => ({ id: g.id, name: g.name, owner: g.owner, members: g.members, avatarV: g.avatar ? g.avatarV : 0, created: g.created })),
    last,
  };
}
const pushState = (name) => { if (db.users[name]) emitTo(name, 'state', state(name)); };

function addMessage(conv, from, text, system = false) {
  const msg = { id: crypto.randomUUID(), conv, from, text, at: Date.now(), pinned: false, deleted: false, system };
  db.messages.push(msg);
  save();
  emitConv(conv, 'message', msg);
  return msg;
}
const sys = (conv, text) => addMessage(conv, null, text, true);
const dn = (n) => (db.users[n] && db.users[n].displayName) || n;

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
  if (!online.has(me)) online.set(me, new Set());
  online.get(me).add(socket.id);
  related(me).forEach(pushState);

  // --- Profil & Einstellungen ---
  socket.on('profile:update', (d = {}, cb) => {
    const u = db.users[me];
    if ('displayName' in d) u.displayName = clip(d.displayName, 32);
    if ('bio' in d) u.bio = clip(d.bio, 190);
    if ('pronouns' in d) u.pronouns = clip(d.pronouns, 30);
    if ('theme' in d && THEMES.includes(d.theme)) u.theme = d.theme;
    if ('avatar' in d) { if (d.avatar === null) u.avatar = null; else if (isImage(d.avatar)) { u.avatar = d.avatar; u.avatarV = Date.now(); } }
    if ('banner' in d) { if (d.banner === null) u.banner = null; else if (isImage(d.banner)) { u.banner = d.banner; u.bannerV = Date.now(); } }
    save();
    related(me).forEach(pushState);
    ok(cb, { ok: true });
  });

  // --- Freunde ---
  socket.on('search', (q, cb) => {
    q = norm(q);
    if (!q) return ok(cb, []);
    ok(cb, Object.keys(db.users).filter((n) => n !== me && (n.includes(q) || norm(db.users[n].displayName).includes(q))).slice(0, 10).map(profile));
  });

  socket.on('friend:request', (to, cb) => {
    to = norm(to);
    if (!db.users[to] || to === me) return ok(cb, { error: 'Nutzer nicht gefunden.' });
    if (areFriends(me, to)) return ok(cb, { error: 'Ihr seid schon befreundet.' });
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
  socket.on('history', (conv, cb) => {
    if (!canAccess(me, conv)) return ok(cb, []);
    ok(cb, db.messages.filter((m) => m.conv === conv).slice(-300));
  });

  socket.on('message', ({ conv, text } = {}, cb) => {
    text = clip(text, 4000);
    if (!text || !canAccess(me, conv)) return ok(cb, { error: 'Nicht möglich.' });
    addMessage(conv, me, text);
    ok(cb, { ok: true });
  });

  socket.on('message:delete', (id, cb) => {
    const m = db.messages.find((x) => x.id === id);
    if (!m || m.system || m.deleted || !canAccess(me, m.conv)) return ok(cb, { error: 'Nicht möglich.' });
    const g = db.groups[m.conv];
    if (m.from !== me && !(g && g.owner === me)) return ok(cb, { error: 'Du kannst nur deine eigenen Nachrichten löschen.' });
    m.deleted = true; m.text = ''; m.pinned = false;
    save();
    emitConv(m.conv, 'message:update', m);
    ok(cb, { ok: true });
  });

  socket.on('message:pin', (id, cb) => {
    const m = db.messages.find((x) => x.id === id);
    if (!m || m.system || m.deleted || !canAccess(me, m.conv)) return ok(cb, { error: 'Nicht möglich.' });
    m.pinned = !m.pinned;
    save();
    emitConv(m.conv, 'message:update', m);
    if (m.pinned) sys(m.conv, `${dn(me)} hat eine Nachricht angepinnt.`);
    ok(cb, { ok: true, pinned: m.pinned });
  });

  socket.on('typing', (conv) => {
    if (!canAccess(me, conv)) return;
    members(conv).forEach((u) => { if (u !== me) emitTo(u, 'typing', { conv, from: me }); });
  });

  // --- Gruppen ---
  socket.on('group:create', ({ name, members: list, avatar } = {}, cb) => {
    name = clip(name, 40);
    if (!name) return ok(cb, { error: 'Gib der Gruppe einen Namen.' });
    const mem = [...new Set((list || []).map(norm))].filter((u) => areFriends(me, u));
    if (!mem.length) return ok(cb, { error: 'Wähle mindestens einen Freund aus.' });
    const id = 'g_' + crypto.randomUUID();
    db.groups[id] = { id, name, owner: me, members: [me, ...mem], avatar: isImage(avatar) ? avatar : null, avatarV: Date.now(), created: Date.now() };
    save();
    db.groups[id].members.forEach(pushState);
    sys(id, `${dn(me)} hat die Gruppe „${name}“ erstellt.`);
    ok(cb, { ok: true, id });
  });

  socket.on('group:update', ({ id, name, avatar } = {}, cb) => {
    const g = db.groups[id];
    if (!g || !g.members.includes(me)) return ok(cb, { error: 'Nicht möglich.' });
    if (name !== undefined && clip(name, 40) && clip(name, 40) !== g.name) { g.name = clip(name, 40); sys(id, `${dn(me)} hat die Gruppe in „${g.name}“ umbenannt.`); }
    if (avatar !== undefined) { if (avatar === null) g.avatar = null; else if (isImage(avatar)) { g.avatar = avatar; g.avatarV = Date.now(); sys(id, `${dn(me)} hat das Gruppenbild geändert.`); } }
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
    if (!g.members.length) { delete db.groups[id]; db.messages = db.messages.filter((m) => m.conv !== id); }
    else if (g.owner === me) g.owner = g.members[0];
    save();
    [...g.members, me].forEach(pushState);
    ok(cb, { ok: true });
  });

  // --- WebRTC-Signaling für Anrufe (1:1) ---
  ['call:offer', 'call:answer', 'call:ice', 'call:end', 'call:decline'].forEach((ev) => {
    socket.on(ev, (data) => {
      const to = norm(data && data.to);
      if (!areFriends(me, to)) return;
      emitTo(to, ev, { ...data, from: me });
    });
  });

  socket.on('disconnect', () => {
    const set = online.get(me);
    if (set) { set.delete(socket.id); if (!set.size) online.delete(me); }
    if (!online.has(me)) related(me).forEach(pushState);
  });
});

server.listen(PORT, () => console.log(`Connecta läuft auf http://localhost:${PORT}`));
