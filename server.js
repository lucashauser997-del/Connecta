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
const io = new Server(server);
const PORT = process.env.PORT || 3000;
const DB_FILE = path.join(__dirname, 'data.json');

// ---------- Einfache Datei-Datenbank ----------
let db = { users: {}, tokens: {}, requests: [], messages: [] };
if (fs.existsSync(DB_FILE)) {
  try { db = JSON.parse(fs.readFileSync(DB_FILE, 'utf8')); } catch (e) { console.error('data.json defekt, starte leer'); }
}
let saveTimer = null;
function save() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => fs.writeFileSync(DB_FILE, JSON.stringify(db)), 200);
}

const norm = (u) => String(u || '').trim().toLowerCase();
const validName = (u) => /^[a-z0-9_.]{3,20}$/.test(u);
const publicUser = (name) => ({ username: name, online: online.has(name) });

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// ---------- Registrierung & Login ----------
app.post('/api/register', async (req, res) => {
  const username = norm(req.body.username);
  const { password } = req.body;
  if (!validName(username)) return res.status(400).json({ error: 'Username: 3–20 Zeichen, nur a–z, 0–9, _ und .' });
  if (!password || password.length < 6) return res.status(400).json({ error: 'Passwort braucht mindestens 6 Zeichen.' });
  if (db.users[username]) return res.status(409).json({ error: 'Dieser Username ist schon vergeben.' });
  db.users[username] = { hash: await bcrypt.hash(password, 10), friends: [], created: Date.now() };
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

// ---------- Echtzeit ----------
const online = new Map(); // username -> Set(socketId)
const emitTo = (name, ev, data) => (online.get(name) || []).forEach((id) => io.to(id).emit(ev, data));
const areFriends = (a, b) => db.users[a] && db.users[a].friends.includes(b);

function state(me) {
  const u = db.users[me];
  return {
    friends: u.friends.map(publicUser),
    incoming: db.requests.filter((r) => r.to === me).map((r) => r.from),
    outgoing: db.requests.filter((r) => r.from === me).map((r) => r.to),
  };
}
const pushState = (name) => emitTo(name, 'state', state(name));

io.use((socket, next) => {
  const name = db.tokens[socket.handshake.auth.token];
  if (!name || !db.users[name]) return next(new Error('unauthorized'));
  socket.username = name;
  next();
});

io.on('connection', (socket) => {
  const me = socket.username;
  if (!online.has(me)) online.set(me, new Set());
  online.get(me).add(socket.id);
  pushState(me);
  db.users[me].friends.forEach(pushState);

  socket.on('search', (q, cb) => {
    q = norm(q);
    if (!q) return cb([]);
    cb(Object.keys(db.users).filter((n) => n.includes(q) && n !== me).slice(0, 10));
  });

  socket.on('friend:request', (to, cb) => {
    to = norm(to);
    if (!db.users[to] || to === me) return cb({ error: 'Nutzer nicht gefunden.' });
    if (areFriends(me, to)) return cb({ error: 'Ihr seid schon befreundet.' });
    if (db.requests.some((r) => r.from === me && r.to === to)) return cb({ error: 'Anfrage schon gesendet.' });
    // Hat der andere mir schon eine Anfrage geschickt? Dann direkt annehmen.
    const back = db.requests.find((r) => r.from === to && r.to === me);
    if (back) return accept(to, cb);
    db.requests.push({ from: me, to, at: Date.now() });
    save(); pushState(me); pushState(to);
    cb({ ok: true });
  });

  function accept(from, cb) {
    const i = db.requests.findIndex((r) => r.from === from && r.to === me);
    if (i < 0) return cb && cb({ error: 'Keine Anfrage.' });
    db.requests.splice(i, 1);
    db.users[me].friends.push(from);
    db.users[from].friends.push(me);
    save(); pushState(me); pushState(from);
    cb && cb({ ok: true });
  }
  socket.on('friend:accept', (from, cb) => accept(norm(from), cb));

  socket.on('friend:decline', (from) => {
    db.requests = db.requests.filter((r) => !(r.from === norm(from) && r.to === me));
    save(); pushState(me); pushState(norm(from));
  });

  socket.on('friend:remove', (who) => {
    who = norm(who);
    if (!db.users[who]) return;
    db.users[me].friends = db.users[me].friends.filter((f) => f !== who);
    db.users[who].friends = db.users[who].friends.filter((f) => f !== me);
    save(); pushState(me); pushState(who);
  });

  socket.on('history', (withUser, cb) => {
    withUser = norm(withUser);
    if (!areFriends(me, withUser)) return cb([]);
    cb(db.messages.filter((m) => (m.from === me && m.to === withUser) || (m.from === withUser && m.to === me)).slice(-200));
  });

  socket.on('message', ({ to, text }, cb) => {
    to = norm(to);
    text = String(text || '').trim().slice(0, 2000);
    if (!text || !areFriends(me, to)) return cb && cb({ error: 'Nicht möglich.' });
    const msg = { id: crypto.randomUUID(), from: me, to, text, at: Date.now() };
    db.messages.push(msg);
    save();
    emitTo(me, 'message', msg);
    emitTo(to, 'message', msg);
    cb && cb({ ok: true });
  });

  socket.on('typing', (to) => { if (areFriends(me, norm(to))) emitTo(norm(to), 'typing', me); });

  // ---------- WebRTC-Signaling für Anrufe ----------
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
    db.users[me].friends.forEach(pushState);
  });
});

server.listen(PORT, () => console.log(`Connecta läuft auf http://localhost:${PORT}`));
