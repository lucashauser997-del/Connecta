// Connecta – Speicher
// Mit DATABASE_URL (z. B. von Neon) wird alles dauerhaft in Postgres gespeichert.
// Ohne DATABASE_URL landet alles lokal in data.json und im Ordner uploads/.
const fs = require('fs');
const path = require('path');

const EMPTY_CORE = () => ({ users: {}, tokens: {}, requests: [], groups: {} });

// ---------- Postgres ----------
async function pgStore(url) {
  const { Pool } = require('pg');
  const u = new URL(url);
  const local = ['localhost', '127.0.0.1'].includes(u.hostname);
  u.searchParams.delete('sslmode');
  u.searchParams.delete('channel_binding');
  const pool = new Pool({ connectionString: u.toString(), ssl: local ? false : { rejectUnauthorized: false }, max: 5 });
  pool.on('error', (e) => console.error('Datenbank-Fehler:', e.message));

  await pool.query(`
    create table if not exists connecta_core (id int primary key, data jsonb not null);
    create table if not exists connecta_messages (id text primary key, conv text not null, at bigint not null, data jsonb not null);
    create index if not exists connecta_messages_conv on connecta_messages (conv, at);
    create table if not exists connecta_media (id text primary key, mime text not null, size int not null, owner text, created bigint, data bytea not null);
  `);

  const coreRow = await pool.query('select data from connecta_core where id = 1');
  const core = coreRow.rows[0] ? coreRow.rows[0].data : EMPTY_CORE();
  const messages = (await pool.query('select data from connecta_messages order by at')).rows.map((r) => r.data);
  const meta = new Map();
  (await pool.query('select id, mime, size, owner from connecta_media')).rows.forEach((r) => meta.set(r.id, { mime: r.mime, size: r.size, owner: r.owner }));

  // Alle Schreibvorgänge nacheinander ausführen, damit nichts durcheinander kommt
  let queue = Promise.resolve();
  const run = (fn) => { queue = queue.then(fn).catch((e) => console.error('Speichern fehlgeschlagen:', e.message)); return queue; };

  let coreTimer = null, coreData = null;
  const cache = new Map(); let cacheSize = 0; const CACHE_MAX = 120 * 1024 * 1024;

  return {
    kind: 'Postgres',
    core, messages,
    meta: (id) => meta.get(id),
    saveCore(c) {
      coreData = c;
      clearTimeout(coreTimer);
      coreTimer = setTimeout(() => {
        const json = JSON.stringify(coreData);
        run(() => pool.query('insert into connecta_core (id, data) values (1, $1) on conflict (id) do update set data = excluded.data', [json]));
      }, 400);
    },
    saveMessage(m) {
      const json = JSON.stringify(m);
      run(() => pool.query('insert into connecta_messages (id, conv, at, data) values ($1, $2, $3, $4) on conflict (id) do update set data = excluded.data', [m.id, m.conv, m.at, json]));
    },
    deleteConv(conv) { run(() => pool.query('delete from connecta_messages where conv = $1', [conv])); },
    async putMedia(id, mime, owner, data) {
      await pool.query('insert into connecta_media (id, mime, size, owner, created, data) values ($1, $2, $3, $4, $5, $6)', [id, mime, data.length, owner, Date.now(), data]);
      meta.set(id, { mime, size: data.length, owner });
    },
    async getMedia(id) {
      const m = meta.get(id);
      if (!m) return null;
      if (cache.has(id)) return { mime: m.mime, data: cache.get(id) };
      const r = await pool.query('select data from connecta_media where id = $1', [id]);
      if (!r.rows[0]) return null;
      const data = r.rows[0].data;
      if (data.length < 30 * 1024 * 1024) {
        cache.set(id, data); cacheSize += data.length;
        for (const [k, v] of cache) { if (cacheSize <= CACHE_MAX) break; cache.delete(k); cacheSize -= v.length; }
      }
      return { mime: m.mime, data };
    },
    deleteMedia(id) {
      if (!id || !meta.has(id)) return;
      meta.delete(id);
      if (cache.has(id)) { cacheSize -= cache.get(id).length; cache.delete(id); }
      run(() => pool.query('delete from connecta_media where id = $1', [id]));
    },
  };
}

// ---------- Lokale Dateien ----------
function fileStore(dir) {
  const DB_FILE = path.join(dir, 'data.json');
  const UP = path.join(dir, 'uploads');
  fs.mkdirSync(UP, { recursive: true });
  let data = { core: EMPTY_CORE(), messages: [], media: {} };
  if (fs.existsSync(DB_FILE)) {
    try {
      const raw = JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
      if (raw.core) data = { media: {}, ...raw };
    } catch (e) { console.error('data.json defekt, starte leer'); }
  }
  let timer = null;
  const flush = () => { clearTimeout(timer); timer = setTimeout(() => fs.writeFile(DB_FILE, JSON.stringify(data), () => {}), 300); };
  return {
    kind: 'lokale Datei (data.json)',
    core: data.core, messages: data.messages,
    meta: (id) => data.media[id],
    saveCore(c) { data.core = c; flush(); },
    saveMessage(m) {
      // Nachrichten-Array wird vom Server direkt verändert – nur speichern
      if (!data.messages.includes(m)) { const i = data.messages.findIndex((x) => x.id === m.id); if (i >= 0) data.messages[i] = m; }
      flush();
    },
    deleteConv() { flush(); },
    async putMedia(id, mime, owner, buf) { await fs.promises.writeFile(path.join(UP, id), buf); data.media[id] = { mime, size: buf.length, owner }; flush(); },
    async getMedia(id) {
      const m = data.media[id];
      if (!m) return null;
      try { return { mime: m.mime, data: await fs.promises.readFile(path.join(UP, id)) }; } catch { return null; }
    },
    deleteMedia(id) { if (!id || !data.media[id]) return; delete data.media[id]; fs.unlink(path.join(UP, id), () => {}); flush(); },
    setMessages(arr) { data.messages = arr; flush(); },
  };
}

module.exports = async function createStore(dir) {
  if (process.env.DATABASE_URL) return pgStore(process.env.DATABASE_URL);
  return fileStore(dir);
};
