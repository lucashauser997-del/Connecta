/* =========================================================
   Connecta – App
   ========================================================= */

/* ================= Hilfsfunktionen ================= */
const $ = (id) => document.getElementById(id);
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const store = { get(k) { try { return localStorage.getItem(k); } catch { return null; } }, set(k, v) { try { localStorage.setItem(k, v); } catch {} }, del(k) { try { localStorage.removeItem(k); } catch {} } };
const ic = (p) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${p}</svg>`;
const I = {
  chat: ic('<path d="M21 12a8.5 8.5 0 0 1-12.4 7.6L3 21l1.5-5A8.5 8.5 0 1 1 21 12z"/>'),
  users: ic('<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.9M16 3.1a4 4 0 0 1 0 7.8"/>'),
  plus: ic('<path d="M12 5v14M5 12h14"/>'),
  phone: ic('<path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 1.9.7 2.8a2 2 0 0 1-.5 2.1L8 9.8a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.8.7a2 2 0 0 1 1.7 2z"/>'),
  video: ic('<path d="M23 7l-7 5 7 5V7z"/><rect x="1" y="5" width="15" height="14" rx="3"/>'),
  pin: ic('<path d="M12 17v5M9 10.8V4h6v6.8l3 3.2v2H6v-2z"/>'),
  trash: ic('<path d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14"/>'),
  copy: ic('<rect x="9" y="9" width="13" height="13" rx="3"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>'),
  info: ic('<circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/>'),
  back: ic('<path d="M15 18l-6-6 6-6"/>'),
  send: ic('<path d="M22 2L11 13M22 2l-7 20-4-9-9-4z"/>'),
  x: ic('<path d="M18 6L6 18M6 6l12 12"/>'),
  check: ic('<path d="M20 6L9 17l-5-5"/>'),
  mic: ic('<rect x="9" y="2" width="6" height="12" rx="3"/><path d="M5 10a7 7 0 0 0 14 0M12 19v3"/>'),
  search: ic('<circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/>'),
  userPlus: ic('<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M19 8v6M22 11h-6"/>'),
  logout: ic('<path d="M15 4h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3M10 17l5-5-5-5M15 12H3"/>'),
  edit: ic('<path d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/>'),
  more: ic('<circle cx="12" cy="5" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="12" cy="19" r="1"/>'),
  clip: ic('<path d="M21.4 11.1l-9.2 9.2a6 6 0 0 1-8.5-8.5l9.2-9.2a4 4 0 0 1 5.7 5.7l-9.2 9.2a2 2 0 0 1-2.8-2.8l8.5-8.5"/>'),
  play: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M7 4.5v15a1 1 0 0 0 1.5.9l12-7.5a1 1 0 0 0 0-1.8l-12-7.5A1 1 0 0 0 7 4.5z"/></svg>',
  pause: '<svg viewBox="0 0 24 24" fill="currentColor"><rect x="5" y="4" width="5" height="16" rx="1.5"/><rect x="14" y="4" width="5" height="16" rx="1.5"/></svg>',
  sound: ic('<path d="M11 5L6 9H2v6h4l5 4V5z"/><path d="M15.5 8.5a5 5 0 0 1 0 7M19 5a10 10 0 0 1 0 14"/>'),
  gear: ic('<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>'),
  download: ic('<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"/>'),
  block: ic('<circle cx="12" cy="12" r="10"/><path d="M4.9 4.9l14.2 14.2"/>'),
  shield: ic('<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>'),
  note: ic('<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6M8 13h8M8 17h5"/>'),
};
const TICK1 = '<svg class="tick" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>';
const TICK2 = '<svg class="tick" viewBox="0 0 28 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M2 12.5l4.5 4.5L16 7.5M11 16.5l.5.5L21 7.5"/></svg>';
const bic = (p) => `<svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round">${p}</svg>`;
const BADGES = {
  dev: { name: 'Connecta-Entwickler', bg: 'linear-gradient(135deg,#5b21ff,#d89cff)', svg: bic('<path d="M8 7l-5 5 5 5M16 7l5 5-5 5M14 4l-4 16"/>') },
  mod: { name: 'Moderator', bg: 'linear-gradient(135deg,#0a84ff,#64d2ff)', svg: bic('<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>') },
  supporter: { name: 'Supporter', bg: 'linear-gradient(135deg,#ff3d7f,#ff9ec4)', svg: '<svg viewBox="0 0 24 24" fill="#fff"><path d="M12 21s-7.5-4.6-9.5-9.3C1.1 8.3 3.3 4.5 7 4.5c2 0 3.6 1.1 5 3 1.4-1.9 3-3 5-3 3.7 0 5.9 3.8 4.5 7.2C19.5 16.4 12 21 12 21z"/></svg>' },
  bughunter: { name: 'Bug-Jäger', bg: 'linear-gradient(135deg,#0f9b5f,#a8e063)', svg: bic('<path d="M8 8a4 4 0 0 1 8 0M7 10h10v4a5 5 0 0 1-10 0zM12 10v9M3 12h4M17 12h4M4 7l3 2M20 7l-3 2M4 18l3-2M20 18l-3-2"/>') },
  early: { name: 'Früher Nutzer', bg: 'linear-gradient(135deg,#ff8a00,#ffd36e)', svg: bic('<path d="M12 20v-8M12 12c0-4 3-7 8-7 0 5-3 7-8 7zM12 14c0-3-2-6-7-6 0 4 3 6 7 6z"/>') },
};
const badgeHtml = (u, small) => {
  const b = (P(u).badges || []).filter((k) => BADGES[k]);
  if (!b.length) return '';
  return `<span class="badges ${small ? 'sm' : ''}">${b.map((k) => `<span class="bdg" title="${BADGES[k].name}" data-badgeinfo="${k}" style="background:${BADGES[k].bg}">${BADGES[k].svg}</span>`).join('')}</span>`;
};

// Connecta-Logo direkt eingebaut (braucht keine Datei)
const LOGO = 'data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120"><defs><linearGradient id="g" x1="10" y1="110" x2="110" y2="10" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#c47bff"/><stop offset=".45" stop-color="#6a2cff"/><stop offset="1" stop-color="#e7a6ff"/></linearGradient></defs><path fill="url(#g)" d="M92 30a10 10 0 0 0 1-14A50 50 0 0 0 14 76l-6 26a4 4 0 0 0 6 4l24-12A50 50 0 0 0 93 88a10 10 0 0 0-1-14 10 10 0 0 0-13 0 28 28 0 1 1 0-40 10 10 0 0 0 13-4Z"/><circle cx="44" cy="58" r="6" fill="#8b4dff"/><circle cx="60" cy="58" r="6" fill="#8b4dff"/><circle cx="76" cy="58" r="6" fill="#8b4dff"/></svg>');
document.querySelectorAll('.logo-img').forEach((i) => i.src = LOGO);
document.querySelector('link[rel=icon]').href = LOGO;

function toast(title, text, onclick, avatarHtml, cls = '') {
  const d = document.createElement('div');
  d.className = 'toast ' + cls;
  d.innerHTML = (avatarHtml || '') + `<div><b>${esc(title)}</b>${text ? `<span>${esc(text)}</span>` : ''}</div>`;
  d.onclick = () => { d.remove(); onclick && onclick(); };
  $('toasts').append(d);
  while ($('toasts').children.length > 4) $('toasts').firstChild.remove();
  setTimeout(() => d.remove(), 4500);
}
const fmtTime = (t) => new Date(t).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
const dayKey = (t) => new Date(t).toDateString();
const fmtDur = (s) => { s = Math.max(0, Math.round(s || 0)); return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); };
const fmtSize = (b) => b > 1048576 ? (b / 1048576).toFixed(1).replace('.', ',') + ' MB' : Math.max(1, Math.round(b / 1024)) + ' KB';
function fmtDay(t) {
  const d = new Date(t), now = new Date(), y = new Date(); y.setDate(now.getDate() - 1);
  if (d.toDateString() === now.toDateString()) return 'Heute';
  if (d.toDateString() === y.toDateString()) return 'Gestern';
  return d.toLocaleDateString('de-DE', { weekday: 'long', day: 'numeric', month: 'long', ...(d.getFullYear() !== now.getFullYear() ? { year: 'numeric' } : {}) });
}
function fmtShort(t) {
  const d = fmtDay(t);
  if (d === 'Heute') return fmtTime(t);
  if (d === 'Gestern') return d;
  return new Date(t).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: '2-digit' });
}

/* ================= Hochladen & Bilder ================= */
let TOKEN = store.get('token');
function upload(blob, name, onProgress) {
  return new Promise((resolve, reject) => {
    const x = new XMLHttpRequest();
    x.open('POST', '/api/upload');
    x.setRequestHeader('x-token', TOKEN);
    x.setRequestHeader('Content-Type', blob.type || 'application/octet-stream');
    if (onProgress) x.upload.onprogress = (e) => e.lengthComputable && onProgress(e.loaded / e.total);
    x.onload = () => { let d = {}; try { d = JSON.parse(x.responseText); } catch {} x.status === 200 ? resolve(d) : reject(new Error(d.error || 'Upload fehlgeschlagen')); };
    x.onerror = () => reject(new Error('Upload fehlgeschlagen – keine Verbindung.'));
    x.send(blob);
  });
}
const loadImg = (src) => new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = src; });
const canvasBlob = (c, type, q) => new Promise((res) => c.toBlob(res, type, q));
// Bild auswählen, zuschneiden und verkleinern (für Profilbild, Banner, Gruppenbild)
function pickImage(w, h) {
  return new Promise((resolve) => {
    const inp = document.createElement('input');
    inp.type = 'file'; inp.accept = 'image/*';
    inp.onchange = async () => {
      const f = inp.files[0];
      if (!f) return;
      try {
        const url = URL.createObjectURL(f), img = await loadImg(url);
        const c = document.createElement('canvas'); c.width = w; c.height = h;
        const s = Math.max(w / img.width, h / img.height), dw = img.width * s, dh = img.height * s;
        c.getContext('2d').drawImage(img, (w - dw) / 2, (h - dh) / 2, dw, dh);
        URL.revokeObjectURL(url);
        const blob = await canvasBlob(c, 'image/jpeg', 0.86);
        resolve({ blob, url: URL.createObjectURL(blob) });
      } catch { toast('Das Bild konnte nicht geladen werden.'); }
    };
    inp.click();
  });
}
// Große Fotos vor dem Senden verkleinern
async function prepareImage(file) {
  const url = URL.createObjectURL(file);
  try {
    const img = await loadImg(url);
    let { width: w, height: h } = img;
    const MAX = 2048;
    if (file.type === 'image/gif' || (file.size < 1.5e6 && w <= MAX && h <= MAX)) return { blob: file, w, h };
    const s = Math.min(1, MAX / Math.max(w, h));
    w = Math.round(w * s); h = Math.round(h * s);
    const c = document.createElement('canvas'); c.width = w; c.height = h;
    c.getContext('2d').drawImage(img, 0, 0, w, h);
    const blob = await canvasBlob(c, 'image/jpeg', 0.86);
    return { blob: blob || file, w, h };
  } catch { return { blob: file }; } finally { URL.revokeObjectURL(url); }
}

/* ================= Darstellung (Farbschema, Schrift, Größe) ================= */
const FONTS = {
  nunito: ['Nunito', '400;600;700;800;900', 'Nunito (Standard)'],
  inter: ['Inter', '400;600;700;800;900', 'Inter'],
  poppins: ['Poppins', '400;600;700;800;900', 'Poppins'],
  quicksand: ['Quicksand', '400;600;700', 'Quicksand'],
  lexend: ['Lexend', '400;600;700;800;900', 'Lexend'],
  montserrat: ['Montserrat', '400;600;700;800;900', 'Montserrat'],
  comic: ['Comic Neue', '400;700', 'Comic Neue'],
  mono: ['JetBrains Mono', '400;600;700;800', 'JetBrains Mono'],
  system: [null, '', 'System-Schrift'],
};
const fontCss = (k) => FONTS[k] && FONTS[k][0] ? `'${FONTS[k][0]}', system-ui, sans-serif` : `system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif`;
const fontHref = (k) => `https://fonts.googleapis.com/css2?family=${FONTS[k][0].replace(/ /g, '+')}:wght@${FONTS[k][1]}&display=swap`;
let LOOK = { theme: 'connecta', font: 'nunito', msgSize: 15, custom: { base: 'dark', c1: '#5b21ff', c2: '#d89cff' } };
try { Object.assign(LOOK, JSON.parse(store.get('look') || '{}')); } catch {}
function applyLook(l = {}) {
  Object.assign(LOOK, Object.fromEntries(Object.entries(l).filter(([, v]) => v !== undefined && v !== null)));
  LOOK.custom = { base: 'dark', c1: '#5b21ff', c2: '#d89cff', ...(LOOK.custom || {}) };
  const root = document.documentElement;
  if (LOOK.theme === 'custom') {
    root.dataset.theme = 'custom-' + (LOOK.custom.base === 'light' ? 'light' : 'dark');
    root.style.setProperty('--c1', LOOK.custom.c1);
    root.style.setProperty('--c2', LOOK.custom.c2);
  } else { root.dataset.theme = LOOK.theme; root.style.removeProperty('--c1'); root.style.removeProperty('--c2'); }
  if (!FONTS[LOOK.font]) LOOK.font = 'nunito';
  if (FONTS[LOOK.font][0]) { const href = fontHref(LOOK.font); if ($('fontLink').href !== href) $('fontLink').href = href; }
  document.documentElement.style.setProperty('--font', fontCss(LOOK.font));
  document.documentElement.style.setProperty('--msg-size', (LOOK.msgSize || 15) + 'px');
  document.querySelector('meta[name=theme-color]').content = getComputedStyle(document.documentElement).getPropertyValue('--bg').trim() || '#07060b';
  store.set('look', JSON.stringify(LOOK));
}
applyLook();
let previewFontsLoaded = false;
function loadAllFonts() {
  if (previewFontsLoaded) return;
  previewFontsLoaded = true;
  const fams = Object.keys(FONTS).filter((k) => FONTS[k][0]).map((k) => `family=${FONTS[k][0].replace(/ /g, '+')}:wght@${FONTS[k][1].split(';').includes('800') ? '800' : '700'}`).join('&');
  const l = document.createElement('link'); l.rel = 'stylesheet'; l.href = `https://fonts.googleapis.com/css2?${fams}&display=swap`;
  document.head.append(l);
}

// Lokale Einstellungen (nur dieses Gerät)
let PREFS = { sound: true, desktop: false, sbVol: 0.7 };
try { Object.assign(PREFS, JSON.parse(store.get('prefs') || '{}')); } catch {}
const savePrefs = () => store.set('prefs', JSON.stringify(PREFS));

/* ================= Zustand ================= */
let socket;
let S = { me: null, myStatus: 'online', settings: {}, sounds: [], people: {}, friends: [], incoming: [], outgoing: [], groups: [], last: {}, blocked: [], reads: {}, isOwner: false };
let view = 'chats', current = null, msgs = [], unread = {}, unreadAt = {}, panelMode = null, typingMap = {}, hasMore = {}, loadingOlder = false;
const STATUS = {
  online: ['Online', 'Du bist für alle sichtbar.'],
  idle: ['Abwesend', 'Zeigt an, dass du gerade nicht da bist.'],
  dnd: ['Bitte nicht stören', 'Keine Töne und Benachrichtigungen.'],
  invisible: ['Unsichtbar', 'Du wirst als offline angezeigt, kannst aber alles nutzen.'],
  offline: ['Offline', ''],
};
const P = (u) => S.people[u] || { username: u, displayName: '', status: 'offline' };
const dn = (u) => (u && (P(u).displayName || u)) || '';
const stOf = (u) => u === S.me ? (S.myStatus === 'invisible' ? 'offline' : S.myStatus) : (P(u).status || 'offline');
const isOn = (u) => stOf(u) !== 'offline';
const dmId = (a, b) => 'dm:' + [a, b].sort().join('|');
const isDM = (c) => c.startsWith('dm:');
const isNote = (c) => c.startsWith('note:');
const isGroup = (c) => c.startsWith('g_');
const noteId = () => 'note:' + S.me;
const isBlocked = (u) => S.blocked.includes(u);
const other = (c) => c.slice(3).split('|').find((x) => x !== S.me) || S.me;
const grp = (id) => S.groups.find((g) => g.id === id);
const membersOf = (c) => isNote(c) ? [S.me] : isDM(c) ? c.slice(3).split('|') : (grp(c) || { members: [] }).members;
const mediaUrl = (id) => '/media/' + encodeURIComponent(id);
function avatar(u, cls = '', dot = false) {
  const p = P(u);
  const inner = p.avatar ? `<img src="${mediaUrl(p.avatar)}" alt="">` : esc((dn(u)[0] || '?').toUpperCase());
  return `<div class="av ${cls}">${inner}${dot ? `<span class="dot s-${stOf(u)}"></span>` : ''}</div>`;
}
function gAvatar(g, cls = '', src) {
  const inner = src ? `<img src="${src}" alt="">` : g.avatar ? `<img src="${mediaUrl(g.avatar)}" alt="">` : esc(((g.name || '#')[0] || '#').toUpperCase());
  return `<div class="av grp ${cls}">${inner}</div>`;
}
const convAvatar = (c, cls = '', dot = false) => isNote(c) ? `<div class="av grp note ${cls}">${I.note}</div>` : isDM(c) ? avatar(other(c), cls, dot) : grp(c) ? gAvatar(grp(c), cls) : '';
const convTitle = (c) => isNote(c) ? 'Notizen' : isDM(c) ? dn(other(c)) : (grp(c) || {}).name || 'Gruppe';
const canOpen = (c) => isNote(c) ? c === noteId() : isDM(c) ? S.friends.includes(other(c)) : !!grp(c);

// Text formatieren: Links und @-Erwähnungen
function fmtText(t) {
  let h = esc(t).replace(/(https?:\/\/[^\s<]+)/g, '<a href="$1" target="_blank" rel="noopener noreferrer">$1</a>');
  h = h.replace(/(^|[\s(>])@([a-z0-9_.]{3,20}|everyone|alle)/gi, (all, pre, raw) => {
    let u = raw.toLowerCase(), rest = '';
    if (u === 'everyone' || u === 'alle') return `${pre}<span class="mention">@${esc(raw)}</span>`;
    while (u.endsWith('.') && !S.people[u]) { u = u.slice(0, -1); rest += '.'; }
    if (!S.people[u]) return all;
    return `${pre}<span class="mention ${u === S.me ? 'me' : ''}" data-profile="${esc(u)}">@${esc(dn(u))}</span>${rest}`;
  });
  return h;
}
function msgLabel(m) {
  if (m.deleted) return '🚫 Nachricht gelöscht';
  if (m.text) return m.text.split('\n')[0];
  const a = (m.att || [])[0];
  if (!a) return '';
  const n = m.att.length > 1 ? ` (${m.att.length})` : '';
  return { image: '📷 Foto', video: '🎥 Video', voice: '🎤 Sprachnachricht', audio: '🎵 Audio' }[a.kind] + n;
}

/* ================= Login ================= */
let mode = 'login';
document.querySelectorAll('.tabs button').forEach((b) => b.onclick = () => {
  mode = b.dataset.mode;
  document.querySelectorAll('.tabs button').forEach((x) => x.classList.toggle('on', x === b));
  $('authBtn').textContent = mode === 'login' ? 'Anmelden' : 'Konto erstellen';
  $('authErr').textContent = '';
});
$('authForm').onsubmit = async (e) => {
  e.preventDefault();
  try {
    const r = await fetch('/api/' + mode, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username: $('u').value, password: $('p').value }) });
    const d = await r.json();
    if (!r.ok) return $('authErr').textContent = d.error;
    store.set('token', d.token);
    TOKEN = d.token;
    start(d.token);
  } catch { $('authErr').textContent = 'Server nicht erreichbar.'; }
};
function logout() { store.del('token'); location.reload(); }

/* ================= Start & Echtzeit ================= */
function start(token) {
  socket = io({ auth: { token } });
  socket.on('connect_error', (err) => { if (err.message === 'unauthorized') logout(); });
  socket.on('state', (s) => {
    const first = !S.me;
    Object.assign(S, s);
    applyLook(s.settings || {});
    unread = { ...(s.unread || {}) }; unreadAt = { ...(s.mentions || {}) };
    if (current && unread[current]) { unread[current] = 0; unreadAt[current] = 0; markRead(true); }
    bumpTitle();
    if (first) { $('auth').classList.add('hidden'); $('app').classList.remove('hidden'); }
    if (current && !canOpen(current)) closeChat();
    renderAll();
    if (!$('statusMenu').classList.contains('hidden')) renderStatusMenu();
    if (inCall()) renderSoundboard();
  });
  socket.on('connect', () => { if (current) reloadHistory(); });
  socket.on('message', onMessage);
  socket.on('message:update', (m) => {
    if (S.last[m.conv] && S.last[m.conv].id === m.id) S.last[m.conv] = m;
    if (m.conv === current) {
      const i = msgs.findIndex((x) => x.id === m.id);
      if (i >= 0) msgs[i] = m;
      renderMsgs(); renderPinBar(); renderHead();
      if (panelMode) renderPanel();
    }
    if (view === 'chats') renderSide();
  });
  socket.on('read', ({ conv, user, at }) => {
    (S.reads[conv] = S.reads[conv] || {})[user] = at;
    if (user === S.me && conv !== current) { unread[conv] = 0; unreadAt[conv] = 0; bumpTitle(); renderRail(); if (view === 'chats') renderChats(); }
    if (conv === current && user !== S.me) renderMsgs();
  });
  socket.on('typing', ({ conv, from }) => {
    (typingMap[conv] = typingMap[conv] || {})[from] = Date.now();
    renderTyping(); setTimeout(renderTyping, 2700);
  });
  setupCalls();
}
if (TOKEN) start(TOKEN);

function onMessage(m) {
  S.last[m.conv] = m;
  const mine = m.from === S.me;
  const mentioned = (m.mentions || []).includes(S.me);
  const here = m.conv === current;
  if (!mine && isBlocked(m.from)) { if (here) { msgs.push(m); renderMsgs(); } return; }
  if (here) {
    msgs.push(m);
    if (!mine) markRead();
    if (typingMap[m.conv]) delete typingMap[m.conv][m.from];
    renderMsgs(mine); renderTyping();
    if (panelMode === 'info') renderPanel();
  } else if (!m.system && !mine) {
    unread[m.conv] = (unread[m.conv] || 0) + 1;
    if (mentioned) unreadAt[m.conv] = (unreadAt[m.conv] || 0) + 1;
  }
  if (!m.system && !mine && (!here || document.hidden)) notify(m, mentioned, here);
  bumpTitle();
  renderSide(); renderRail();
}

function notify(m, mentioned, here) {
  if (S.myStatus === 'dnd') return;
  const dm = isDM(m.conv);
  if (isNote(m.conv)) return;
  const important = dm || mentioned;
  const title = mentioned && !dm ? `${dn(m.from)} hat dich erwähnt` : convTitle(m.conv);
  const body = (dm ? '' : (mentioned ? convTitle(m.conv) + ' · ' : dn(m.from) + ': ')) + msgLabel(m);
  if (!here) toast(title, body, () => openConv(m.conv), convAvatar(m.conv, 's'), mentioned ? 'mention' : '');
  if (PREFS.sound && (important || !here)) Sounds.ping(mentioned);
  if (document.hidden && important && PREFS.desktop && 'Notification' in window && Notification.permission === 'granted') {
    try {
      const p = P(m.from);
      const n = new Notification(title, { body, tag: m.conv, icon: p.avatar ? location.origin + mediaUrl(p.avatar) : undefined });
      n.onclick = () => { window.focus(); openConv(m.conv); n.close(); };
    } catch {}
  }
}

// Gelesen-Status an den Server melden (nur wenn der Chat wirklich sichtbar ist)
let readT = 0, readTimer = null;
function markRead(force) {
  if (!current || !socket || document.hidden) return;
  clearTimeout(readTimer);
  const go = () => { readT = Date.now(); socket.emit('read', current); };
  if (force || Date.now() - readT > 1500) go(); else readTimer = setTimeout(go, 1500);
}
document.addEventListener('visibilitychange', () => { if (!document.hidden && current) { unread[current] = 0; markRead(true); bumpTitle(); renderRail(); } });
window.addEventListener('focus', () => current && markRead());

function bumpTitle() {
  const n = Object.values(unread).reduce((a, b) => a + b, 0);
  document.title = n ? `(${n}) Connecta` : 'Connecta';
}

/* ================= Rendern ================= */
function renderAll() { renderRail(); renderSide(); if (current) { renderHead(); renderMsgs(); renderPinBar(); } if (panelMode) renderPanel(); }

function renderRail() {
  const totalUnread = Object.values(unread).reduce((a, b) => a + b, 0);
  $('rbChats').innerHTML = I.chat + (totalUnread ? `<span class="badge">${totalUnread > 99 ? '99+' : totalUnread}</span>` : '');
  $('rbFriends').innerHTML = I.users + (S.incoming.length ? `<span class="badge">${S.incoming.length}</span>` : '');
  $('rbGroup').innerHTML = I.plus;
  $('rbMe').innerHTML = S.me ? avatar(S.me, '', true) : '';
  document.querySelectorAll('.rail [data-view]').forEach((b) => b.classList.toggle('on', b.dataset.view === view));
}

function renderSide() {
  $('sideTitle').textContent = view === 'chats' ? 'Chats' : 'Freunde';
  $('sideBtns').innerHTML = view === 'chats' ? `<button class="ibtn" id="sideGroup" title="Gruppe erstellen">${I.edit}</button>` : '';
  $('search').placeholder = view === 'chats' ? 'Chats durchsuchen' : 'Username suchen & adden';
  if (view === 'chats') renderChats(); else renderFriends();
}

function preview(c) {
  const l = S.last[c];
  if (!l) return isNote(c) ? 'Nur für dich – schreib dir selbst' : 'Gruppe erstellt';
  if (isNote(c)) return msgLabel(l);
  if (l.system) return l.text;
  const pre = l.from === S.me ? 'Du: ' : !isDM(c) ? dn(l.from) + ': ' : '';
  return pre + msgLabel(l);
}

function renderChats() {
  const q = $('search').value.trim().toLowerCase();
  const convs = [...S.friends.map((f) => dmId(S.me, f)).filter((c) => S.last[c]), ...S.groups.map((g) => g.id)]
    .filter((c) => !q || convTitle(c).toLowerCase().includes(q))
    .sort((a, b) => ((S.last[b] || {}).at || (grp(b) || {}).created || 0) - ((S.last[a] || {}).at || (grp(a) || {}).created || 0));
  if (!q || 'notizen'.includes(q)) convs.unshift(noteId());
  if (!convs.length) {
    $('list').innerHTML = `<div class="emptylist">${q ? 'Nichts gefunden.' : 'Noch keine Chats.<br>Schreib einem Freund oder erstelle eine Gruppe.'}${q ? '' : `<button class="btn small" data-view="friends">Freunde ansehen</button>`}</div>`;
    return;
  }
  $('list').innerHTML = convs.map((c) => {
    const l = S.last[c], n = unread[c] || 0, at = unreadAt[c] || 0;
    return `<div class="item ${c === current ? 'on' : ''} ${n ? 'unread' : ''}" data-conv="${esc(c)}">${convAvatar(c, '', isDM(c))}<div class="ic"><div class="ir"><b>${esc(convTitle(c))}</b><span class="tm">${l ? fmtShort(l.at) : ''}</span></div><div class="ir"><span class="pv">${esc(preview(c))}</span>${at ? `<span class="badge at">@</span>` : ''}${n ? `<span class="badge">${n}</span>` : ''}</div></div></div>`;
  }).join('');
}

let searchResults = [], sTimer;
function renderFriends() {
  const q = $('search').value.trim();
  let h = '';
  if (q) {
    h += `<div class="section label">Suchergebnisse</div>`;
    h += searchResults.length ? searchResults.map((p) => {
      if (!S.people[p.username]) S.people[p.username] = p;
      if (isBlocked(p.username)) return `<div class="item" data-profile="${esc(p.username)}">${avatar(p.username)}<div class="ic"><div class="ir"><b>${esc(dn(p.username))}</b></div><div class="ir"><span class="pv">Blockiert</span></div></div><button class="btn small ghost" data-unblock="${esc(p.username)}">Aufheben</button></div>`;
      const u = p.username;
      const action = S.friends.includes(u) ? `<button class="btn small ghost" data-chat="${esc(u)}">Chat</button>`
        : S.outgoing.includes(u) ? `<span class="tm label">gesendet</span>`
        : S.incoming.includes(u) ? `<button class="btn small" data-acc="${esc(u)}">Annehmen</button>`
        : `<button class="btn small" data-add="${esc(u)}">${I.userPlus} Adden</button>`;
      return `<div class="item" data-profile="${esc(u)}">${avatar(u)}<div class="ic"><div class="ir"><b>${esc(dn(u))}</b></div><div class="ir"><span class="pv">@${esc(u)}</span></div></div>${action}</div>`;
    }).join('') : `<div class="emptylist">Kein Nutzer gefunden.</div>`;
  }
  if (S.incoming.length) {
    h += `<div class="section label">Anfragen — ${S.incoming.length}</div>` + S.incoming.map((u) => `<div class="item" data-profile="${esc(u)}">${avatar(u)}<div class="ic"><div class="ir"><b>${esc(dn(u))}</b></div><div class="ir"><span class="pv">möchte mit dir befreundet sein</span></div></div><div class="acts2"><button class="ibtn" data-acc="${esc(u)}" title="Annehmen">${I.check}</button><button class="ibtn" data-dec="${esc(u)}" title="Ablehnen">${I.x}</button></div></div>`).join('');
  }
  if (S.outgoing.length) {
    h += `<div class="section label">Gesendet — ${S.outgoing.length}</div>` + S.outgoing.map((u) => `<div class="item" data-profile="${esc(u)}">${avatar(u)}<div class="ic"><div class="ir"><b>${esc(dn(u))}</b></div><div class="ir"><span class="pv">wartet auf Antwort</span></div></div><div class="acts2"><button class="ibtn" data-dec="${esc(u)}" title="Zurückziehen">${I.x}</button></div></div>`).join('');
  }
  const on = S.friends.filter(isOn), off = S.friends.filter((f) => !isOn(f));
  const fItem = (u) => {
    const p = P(u), st = stOf(u);
    const sub = p.customStatus ? esc(p.customStatus) : STATUS[st][0] + (p.pronouns ? ' · ' + esc(p.pronouns) : '');
    return `<div class="item" data-chat="${esc(u)}">${avatar(u, '', true)}<div class="ic"><div class="ir"><b>${esc(dn(u))}</b></div><div class="ir"><span class="pv">${sub}</span></div></div><div class="acts2"><button class="ibtn" data-chat="${esc(u)}" title="Nachricht">${I.chat}</button><button class="ibtn" data-profile="${esc(u)}" title="Profil">${I.more}</button></div></div>`;
  };
  if (on.length) h += `<div class="section label">Online — ${on.length}</div>` + on.map(fItem).join('');
  if (off.length) h += `<div class="section label">Offline — ${off.length}</div>` + off.map(fItem).join('');
  if (!S.friends.length && !q && !S.incoming.length && !S.outgoing.length) h += `<div class="emptylist">Noch keine Freunde.<br>Gib oben einen Username ein, um jemanden zu adden.</div>`;
  $('list').innerHTML = h;
}
$('search').oninput = () => {
  if (view === 'chats') return renderChats();
  clearTimeout(sTimer);
  const q = $('search').value.trim();
  if (!q) { searchResults = []; return renderFriends(); }
  sTimer = setTimeout(() => socket.emit('search', q, (list) => { searchResults = list; renderFriends(); }), 220);
};
$('searchIcon').innerHTML = I.search;

function setView(v) {
  view = v; $('search').value = ''; searchResults = [];
  if (window.innerWidth <= 760) closeChat(true);
  renderRail(); renderSide();
}

/* ================= Chat ================= */
function openConv(c) {
  if (!canOpen(c)) return;
  if (current !== c) { msgs = []; $('text').value = ''; clearTray(); closeMention(); if (rec) stopRec(false); $('msgs').innerHTML = ''; }
  current = c; unread[c] = 0; unreadAt[c] = 0; bumpTitle(); markRead(true);
  if (view !== 'chats' && window.innerWidth > 760) { view = 'chats'; $('search').value = ''; }
  if (window.innerWidth <= 760 || panelMode === 'pins') panelMode = null;
  $('welcome').classList.add('hidden'); $('chat').classList.remove('hidden'); $('app').classList.add('chatting');
  renderHead(); renderMsgs(true); renderPinBar(); renderTyping(); renderRail(); renderSide(); updateSendBtn();
  if (panelMode) renderPanel(); else $('panel').classList.add('hidden');
  reloadHistory();
  autoGrow();
  if (window.innerWidth > 760) $('text').focus();
}
function reloadHistory() {
  const c = current;
  socket.emit('history', { conv: c }, (list) => {
    if (current !== c) return;
    msgs = list; hasMore[c] = list.length >= 100;
    renderMsgs(true); renderPinBar(); renderHead(); if (panelMode) renderPanel();
  });
}
function loadOlder() {
  if (!current || loadingOlder || !hasMore[current] || !msgs.length) return;
  loadingOlder = true;
  const c = current, box = $('msgs');
  socket.emit('history', { conv: c, before: msgs[0].at }, (list) => {
    loadingOlder = false;
    if (current !== c) return;
    hasMore[c] = list.length >= 100;
    const oldH = box.scrollHeight, oldTop = box.scrollTop;
    msgs = [...list, ...msgs];
    renderMsgs();
    box.scrollTop = oldTop + (box.scrollHeight - oldH);
  });
}
$('msgs').addEventListener('scroll', () => { if ($('msgs').scrollTop < 80) loadOlder(); });

function closeChat(keepView) {
  current = null; panelMode = null;
  if (rec) stopRec(false);
  $('chat').classList.add('hidden'); $('welcome').classList.remove('hidden'); $('app').classList.remove('chatting'); $('panel').classList.add('hidden');
  if (!keepView) renderSide();
}

function renderHead() {
  if (!current) return;
  const dm = isDM(current), g = grp(current), u = dm ? other(current) : null;
  const pins = msgs.filter((m) => m.pinned && !m.deleted).length;
  let st = '';
  if (isNote(current)) st = 'Nur für dich sichtbar';
  else if (dm) { const s = stOf(u); st = `<span class="sdot s-${s}"></span>${esc(P(u).customStatus || STATUS[s][0])}`; }
  else if (g) { const on = g.members.filter((m) => m !== S.me && isOn(m)).length; st = esc(`${g.members.length} Mitglieder${on ? ` · ${on} online` : ''}`); }
  $('chatHead').innerHTML = `
    <button class="ibtn back" data-back>${I.back}</button>
    <div class="who-box" data-info>${convAvatar(current, '', dm)}<div style="min-width:0"><div class="t">${esc(convTitle(current))}${dm ? badgeHtml(u, true) : ''}</div><div class="st">${st}</div></div></div>
    ${dm ? `<button class="ibtn" data-callaudio title="Anrufen">${I.phone}</button><button class="ibtn" data-callvideo title="Videoanruf">${I.video}</button>` : ''}
    <button class="ibtn ${panelMode === 'pins' ? 'on' : ''}" data-pins title="Angepinnte Nachrichten">${I.pin}${pins ? `<span class="badge">${pins}</span>` : ''}</button>
    <button class="ibtn ${panelMode === 'info' ? 'on' : ''}" data-info title="${dm ? 'Profil' : isNote(current) ? 'Info' : 'Gruppeninfo'}">${I.info}</button>`;
  $('text').placeholder = isNote(current) ? 'Notiz schreiben…' : 'Nachricht schreiben…';
}

function renderPinBar() {
  const pins = msgs.filter((m) => m.pinned && !m.deleted);
  if (!current || !pins.length) return $('pinBar').classList.add('hidden');
  const l = pins[pins.length - 1];
  $('pinBar').classList.remove('hidden');
  $('pinBar').innerHTML = `${I.pin}<div class="pt"><b>Angepinnt${pins.length > 1 ? ` (${pins.length})` : ''}</b> · ${esc(dn(l.from))}: ${esc(msgLabel(l))}</div>`;
  $('pinBar').onclick = () => jumpTo(l.id);
}

// Wellenform für Audios (aus der ID berechnet, damit sie immer gleich aussieht)
function waveBars(id, n) {
  let h = 0; for (const ch of id) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  const out = [];
  for (let i = 0; i < n; i++) { h = (h * 1103515245 + 12345) >>> 0; out.push(25 + (h % 75)); }
  return out;
}
const WAVE_N = 30;
const revealed = new Set();
function aplayerHtml(a) {
  const bars = waveBars(a.id, WAVE_N).map((h) => `<i style="height:${h}%"></i>`).join('');
  return `<div class="aplayer" data-aid="${a.id}"><button type="button" class="ap-btn" data-play="${a.id}" data-dur="${a.dur || ''}">${I.play}</button><div class="ap-mid">${a.kind === 'voice' ? '' : `<div class="ap-name">🎵 ${esc(a.name || 'Audio')}</div>`}<div class="ap-bar" data-seek="${a.id}">${bars}</div></div><span class="ap-time">${a.dur ? fmtDur(a.dur) : '0:00'}</span></div>`;
}
function attHtml(m) {
  const atts = m.att || [];
  if (!atts.length) return '';
  const imgs = atts.filter((a) => a.kind === 'image');
  let h = '';
  if (imgs.length) {
    h += `<div class="atts ${imgs.length > 1 ? 'grid' : ''}">` + imgs.map((a) => {
      const style = imgs.length === 1 && a.w && a.h ? ` style="aspect-ratio:${a.w}/${a.h};width:${Math.min(340, a.w)}px"` : '';
      return `<img class="att-img" data-lb="${a.id}" src="${mediaUrl(a.id)}" loading="lazy" alt=""${style}>`;
    }).join('') + `</div>`;
  }
  atts.filter((a) => a.kind === 'video').forEach((a) => { h += `<div class="atts"><video class="att-vid" src="${mediaUrl(a.id)}#t=0.1" controls preload="metadata" playsinline></video></div>`; });
  atts.filter((a) => a.kind === 'audio' || a.kind === 'voice').forEach((a) => { h += aplayerHtml(a); });
  return h;
}

function msgItems() {
  const items = [];
  const group = isGroup(current), g = grp(current), note = isNote(current);
  const reads = S.reads[current] || {};
  const others = membersOf(current).filter((u) => u !== S.me);
  if (hasMore[current]) items.push(['lm', `<div class="loadmore">Ältere Nachrichten werden geladen…</div>`]);
  if (!msgs.length) items.push(['first', `<div class="first">${convAvatar(current, 'l')}<b style="font-size:20px;color:var(--text)">${esc(convTitle(current))}</b>Das ist der Anfang eures Chats. Sag Hallo 👋</div>`]);
  let prev = null, lastDay = '';
  for (const m of msgs) {
    const day = dayKey(m.at);
    if (day !== lastDay) { items.push(['d' + day, `<div class="day">${fmtDay(m.at)}</div>`]); lastDay = day; prev = null; }
    if (m.system) { items.push(['s' + m.id, `<div class="sys">${esc(m.text)}</div>`]); prev = null; continue; }
    const mine = m.from === S.me;
    if (!mine && isBlocked(m.from) && !revealed.has(m.id)) { items.push(['b' + m.id, `<div class="sys blockedmsg" data-reveal="${m.id}">🚫 Nachricht von einer blockierten Person – <u>anzeigen</u></div>`]); prev = null; continue; }
    const cont = prev && prev.from === m.from && m.at - prev.at < 5 * 60e3;
    const canDel = mine || (g && g.owner === S.me);
    const mentioned = !mine && (m.mentions || []).includes(S.me);
    const media = !m.deleted && (m.att || []).length;
    let tick = '';
    if (mine && !note && !m.deleted && others.length) {
      const readBy = others.filter((u) => (reads[u] || 0) >= m.at).length;
      tick = readBy && readBy === others.length ? `<span class="ticks read" title="Gelesen">${TICK2}</span>` : readBy ? `<span class="ticks" title="Von ${readBy} gelesen">${TICK2}</span>` : `<span class="ticks" title="Gesendet">${TICK1}</span>`;
    }
    const meta = `<span class="meta">${m.pinned ? '📌 ' : ''}${fmtTime(m.at)}${tick}</span>`;
    const who = group && !mine && !cont ? `<div class="who" data-profile="${esc(m.from)}">${esc(dn(m.from))}</div>` : '';
    let body;
    if (m.deleted) body = `🚫 ${mine ? 'Du hast diese Nachricht gelöscht' : 'Diese Nachricht wurde gelöscht'}${meta}`;
    else if (media) body = (who ? `<div class="txt">${who}</div>` : '') + attHtml(m) + `<div class="txt">${m.text ? fmtText(m.text) : ''}${meta}</div>`;
    else body = who + fmtText(m.text) + meta;
    const html = `<div class="row ${mine ? 'out' : 'in'} ${cont ? 'cont' : ''} ${m.pinned ? 'pinned' : ''} ${mentioned ? 'mentioned' : ''}" data-id="${m.id}">`
      + (group && !mine ? `<div class="mav">${cont ? '' : `<span data-profile="${esc(m.from)}">${avatar(m.from, 's')}</span>`}</div>` : '')
      + `<div class="bubble ${m.deleted ? 'del' : ''} ${media ? 'media' : ''}">${body}</div>`
      + (m.deleted ? '' : `<div class="acts"><button data-pin="${m.id}" title="${m.pinned ? 'Loslösen' : 'Anpinnen'}">${I.pin}</button>${m.text ? `<button data-copy="${m.id}" title="Kopieren">${I.copy}</button>` : ''}${!mine ? `<button data-reply-mention="${esc(m.from)}" title="Erwähnen">@</button>` : ''}${canDel ? `<button class="d" data-del="${m.id}" title="Löschen">${I.trash}</button>` : ''}</div>`)
      + `</div>`;
    items.push(['m' + m.id, html]);
    prev = m;
  }
  // „Gesehen“ unter der letzten Nachricht
  const lastM = [...msgs].reverse().find((m) => !m.system);
  if (lastM && !note) {
    const seen = others.filter((u) => u !== lastM.from && (reads[u] || 0) >= lastM.at && !isBlocked(u));
    if (seen.length) {
      const html = isDM(current)
        ? (lastM.from === S.me ? `<div class="seen out">Gesehen ${fmtDay(reads[seen[0]]) === 'Heute' ? 'um ' + fmtTime(reads[seen[0]]) : fmtShort(reads[seen[0]])}</div>` : '')
        : `<div class="seen ${lastM.from === S.me ? 'out' : ''}" title="Gesehen von ${esc(seen.map(dn).join(', '))}">${seen.slice(0, 6).map((u) => avatar(u, 'xs')).join('')}${seen.length > 6 ? `<span>+${seen.length - 6}</span>` : ''}</div>`;
      if (html) items.push(['seen', html]);
    }
  }
  return items;
}

// Nur geänderte Nachrichten neu zeichnen (laufende Videos/Audios werden nicht unterbrochen)
function renderMsgs(toBottom) {
  if (!current) return;
  const box = $('msgs');
  const near = box.scrollHeight - box.scrollTop - box.clientHeight < 160;
  const items = msgItems();
  const existing = new Map([...box.children].map((n) => [n.dataset.k, n]));
  items.forEach(([key, html], i) => {
    let n = existing.get(key);
    if (!n || n._h !== html) {
      const t = document.createElement('template');
      t.innerHTML = html.trim();
      const nn = t.content.firstElementChild;
      nn.dataset.k = key; nn._h = html;
      if (n) n.replaceWith(nn);
      n = nn;
    }
    existing.delete(key);
    if (box.children[i] !== n) box.insertBefore(n, box.children[i] || null);
  });
  existing.forEach((n) => n.remove());
  updatePlayers();
  if (toBottom || near) {
    box.scrollTop = box.scrollHeight;
    box.querySelectorAll('img.att-img:not([data-l])').forEach((img) => { img.dataset.l = 1; if (!img.complete) img.addEventListener('load', () => { if (box.scrollHeight - box.scrollTop - box.clientHeight < 500) box.scrollTop = box.scrollHeight; }, { once: true }); });
  }
}

function renderTyping() {
  const t = current && typingMap[current];
  const names = t ? Object.keys(t).filter((u) => Date.now() - t[u] < 2600 && u !== S.me) : [];
  $('typing').innerHTML = names.length ? `<i></i><i></i><i></i> ${esc(names.map(dn).join(', '))} ${names.length > 1 ? 'schreiben' : 'schreibt'} …` : '';
}

function jumpTo(id) {
  const el = document.querySelector(`.row[data-id="${id}"] .bubble`);
  if (!el) return toast('Nachricht ist nicht geladen', 'Scrolle weiter nach oben, um ältere Nachrichten zu laden.');
  el.scrollIntoView({ behavior: 'smooth', block: 'center' });
  el.classList.remove('flash'); void el.offsetWidth; el.classList.add('flash');
  if (window.innerWidth <= 760 && panelMode) { panelMode = null; $('panel').classList.add('hidden'); renderHead(); }
}

/* ================= Audio-Player ================= */
const AP = new Audio();
let apId = null;
AP.preload = 'metadata';
function updatePlayers() {
  document.querySelectorAll('.aplayer').forEach((el) => {
    const id = el.dataset.aid, active = id === apId;
    const btn = el.querySelector('.ap-btn');
    const dur = active && isFinite(AP.duration) ? AP.duration : +btn.dataset.dur || 0;
    const ratio = active && dur ? AP.currentTime / dur : 0;
    btn.innerHTML = active && !AP.paused ? I.pause : I.play;
    el.querySelectorAll('.ap-bar i').forEach((b, i) => b.classList.toggle('on', active && i / WAVE_N < ratio));
    el.querySelector('.ap-time').textContent = active && (AP.currentTime > 0 || !AP.paused) ? fmtDur(AP.currentTime) : (dur ? fmtDur(dur) : '0:00');
  });
}
['timeupdate', 'play', 'pause', 'loadedmetadata'].forEach((ev) => AP.addEventListener(ev, updatePlayers));
AP.addEventListener('ended', () => { apId = null; updatePlayers(); });
function playAudio(id, seekRatio) {
  if (apId !== id) { apId = id; AP.src = mediaUrl(id); }
  const go = () => { if (seekRatio !== undefined && isFinite(AP.duration)) AP.currentTime = seekRatio * AP.duration; AP.play().catch(() => {}); };
  if (seekRatio !== undefined && !isFinite(AP.duration)) AP.addEventListener('loadedmetadata', go, { once: true }); else go();
  AP.play().catch(() => {});
}

/* ================= Nachrichten schreiben ================= */
function autoGrow() {
  const t = $('text');
  if (!t.offsetParent) return;
  t.style.height = 'auto';
  const h = Math.min(t.scrollHeight + 3, 150);
  t.style.height = h + 'px';
  t.style.overflowY = t.scrollHeight > 150 ? 'auto' : 'hidden';
}
function updateSendBtn() {
  const empty = !$('text').value.trim() && !pending.length;
  $('sendBtn').innerHTML = empty ? I.mic : I.send;
  $('sendBtn').title = empty ? 'Sprachnachricht aufnehmen' : 'Senden';
  $('sendBtn').type = empty ? 'button' : 'submit';
}
$('attachBtn').innerHTML = I.clip;

// --- Anhänge ---
let pending = [], sending = false;
function addFiles(files) {
  for (const f of files) {
    const kind = (f.type || '').split('/')[0];
    if (!['image', 'video', 'audio'].includes(kind)) { toast('Dateityp nicht unterstützt', f.name); continue; }
    if (pending.length >= 10) { toast('Maximal 10 Dateien pro Nachricht'); break; }
    const max = { image: 10, video: 30, audio: 10 }[kind];
    if (kind !== 'image' && f.size > max * 1048576) { toast(`${f.name} ist zu groß`, `Maximal ${max} MB.`); continue; }
    pending.push({ file: f, kind, url: URL.createObjectURL(f), prog: 0 });
  }
  renderTray(); updateSendBtn();
  $('text').focus();
}
function clearTray() { pending.forEach((p) => URL.revokeObjectURL(p.url)); pending = []; renderTray(); }
function renderTray() {
  $('tray').classList.toggle('hidden', !pending.length);
  $('tray').innerHTML = pending.map((p, i) => `<div class="tfile">${p.kind === 'image' ? `<img src="${p.url}" alt="">` : p.kind === 'video' ? `<video src="${p.url}#t=0.1" muted></video>` : `<span class="nm"><span class="big">🎵</span>${esc(p.file.name)}</span>`}${sending ? '' : `<button type="button" class="rm" data-rmfile="${i}">${I.x}</button>`}${sending ? `<div class="prog" style="width:${Math.round(p.prog * 100)}%"></div>` : ''}</div>`).join('');
}
$('attachBtn').onclick = () => {
  const inp = document.createElement('input');
  inp.type = 'file'; inp.multiple = true; inp.accept = 'image/*,video/*,audio/*';
  inp.onchange = () => addFiles([...inp.files]);
  inp.click();
};
$('text').addEventListener('paste', (e) => {
  const files = [...(e.clipboardData || {}).files || []];
  if (files.length) { e.preventDefault(); addFiles(files); }
});
let dragDepth = 0;
$('chat').addEventListener('dragenter', (e) => { if ([...e.dataTransfer.types].includes('Files')) { dragDepth++; $('dropzone').classList.remove('hidden'); } });
$('chat').addEventListener('dragleave', () => { if (--dragDepth <= 0) { dragDepth = 0; $('dropzone').classList.add('hidden'); } });
$('chat').addEventListener('dragover', (e) => e.preventDefault());
$('chat').addEventListener('drop', (e) => { e.preventDefault(); dragDepth = 0; $('dropzone').classList.add('hidden'); addFiles([...e.dataTransfer.files]); });

async function sendMessage() {
  const text = $('text').value.trim();
  if ((!text && !pending.length) || !current || sending) return;
  const conv = current;
  let att = [];
  if (pending.length) {
    sending = true; renderTray(); $('sendBtn').disabled = true;
    try {
      for (const p of pending) {
        let blob = p.file, w, h;
        if (p.kind === 'image') ({ blob, w, h } = await prepareImage(p.file));
        const up = await upload(blob, p.file.name, (r) => { p.prog = r; renderTray(); });
        att.push({ id: up.id, name: p.file.name, w, h });
      }
    } catch (e) { toast('Senden fehlgeschlagen', e.message); sending = false; $('sendBtn').disabled = false; renderTray(); return; }
    sending = false; $('sendBtn').disabled = false; clearTray();
  }
  socket.emit('message', { conv, text, att }, (r) => r && r.error && toast(r.error));
  if (conv === current) { $('text').value = ''; autoGrow(); updateSendBtn(); closeMention(); $('text').focus(); }
}
$('composer').onsubmit = (e) => { e.preventDefault(); sendMessage(); };
$('sendBtn').addEventListener('click', (e) => { if ($('sendBtn').type === 'button') { e.preventDefault(); startRec(); } });
let lastTyping = 0;
$('text').addEventListener('input', () => {
  autoGrow(); updateSendBtn(); updateMention();
  if (current && $('text').value && Date.now() - lastTyping > 1500) { socket.emit('typing', current); lastTyping = Date.now(); }
});
$('text').addEventListener('keydown', (e) => {
  if (mentionOpen()) {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); mSel = (mSel + (e.key === 'ArrowDown' ? 1 : -1) + mList.length) % mList.length; renderMention(); return; }
    if (e.key === 'Enter' || e.key === 'Tab') { e.preventDefault(); pickMention(mList[mSel]); return; }
    if (e.key === 'Escape') { e.preventDefault(); closeMention(); return; }
  }
  if (e.key === 'Enter' && !e.shiftKey && window.innerWidth > 760) { e.preventDefault(); sendMessage(); }
});
$('text').addEventListener('click', updateMention);

// --- @-Erwähnungen ---
let mList = [], mSel = 0, mStart = 0;
const mentionOpen = () => !$('mentionBox').classList.contains('hidden') && mList.length;
function updateMention() {
  const t = $('text');
  const before = t.value.slice(0, t.selectionStart);
  const m = before.match(/(^|\s)@([a-z0-9_.]*)$/i);
  if (!m || !current) return closeMention();
  const q = m[2].toLowerCase();
  mStart = before.length - m[2].length - 1;
  const cands = membersOf(current).filter((u) => u !== S.me);
  mList = cands.filter((u) => u.includes(q) || dn(u).toLowerCase().includes(q)).slice(0, 8);
  if (isGroup(current) && 'everyone'.startsWith(q)) mList.push('everyone');
  if (!mList.length) return closeMention();
  mSel = Math.min(mSel, mList.length - 1);
  renderMention();
}
function renderMention() {
  $('mentionBox').classList.remove('hidden');
  $('mentionBox').innerHTML = `<div class="label" style="padding:6px 10px">Mitglieder</div>` + mList.map((u, i) => u === 'everyone'
    ? `<div class="mi ${i === mSel ? 'on' : ''}" data-mention="everyone"><div class="av s grp">@</div><b>@everyone</b><span>alle in der Gruppe</span></div>`
    : `<div class="mi ${i === mSel ? 'on' : ''}" data-mention="${esc(u)}">${avatar(u, 's', true)}<b>${esc(dn(u))}</b><span>@${esc(u)}</span></div>`).join('');
}
function pickMention(u) {
  const t = $('text'), end = t.selectionStart;
  t.value = t.value.slice(0, mStart) + '@' + u + ' ' + t.value.slice(end);
  const pos = mStart + u.length + 2;
  t.focus(); t.setSelectionRange(pos, pos);
  closeMention(); autoGrow(); updateSendBtn();
}
function closeMention() { $('mentionBox').classList.add('hidden'); mList = []; mSel = 0; }

// --- Sprachnachrichten ---
let rec = null;
async function startRec() {
  if (!current || rec) return;
  if (!navigator.mediaDevices || !window.MediaRecorder) return toast('Aufnehmen wird nicht unterstützt', 'Die Seite braucht HTTPS und einen aktuellen Browser.');
  let stream;
  try { stream = await navigator.mediaDevices.getUserMedia({ audio: true }); } catch { return toast('Kein Zugriff aufs Mikrofon', 'Erlaube den Mikrofonzugriff im Browser.'); }
  const mime = ['audio/webm;codecs=opus', 'audio/mp4', 'audio/webm', 'audio/ogg;codecs=opus'].find((m) => MediaRecorder.isTypeSupported(m)) || '';
  const mr = new MediaRecorder(stream, mime ? { mimeType: mime } : {});
  const chunks = [];
  mr.ondataavailable = (e) => e.data.size && chunks.push(e.data);
  mr.start(200);
  let analyser = null, actx = null;
  try { actx = new AudioContext(); analyser = actx.createAnalyser(); analyser.fftSize = 512; actx.createMediaStreamSource(stream).connect(analyser); } catch {}
  rec = { mr, stream, chunks, t0: Date.now(), conv: current, analyser, actx, levels: [] };
  rec.timer = setInterval(updRec, 100);
  $('composer').classList.add('hidden'); $('tray').classList.add('hidden');
  $('recBar').classList.remove('hidden');
  $('recBar').innerHTML = `<button type="button" class="cbtn" data-reccancel title="Verwerfen">${I.trash}</button><div class="rec"><i></i><span id="recTime">0:00</span><div class="wave" id="recWave"></div></div><button type="button" class="send" data-recsend title="Senden">${I.send}</button>`;
}
function updRec() {
  if (!rec) return;
  $('recTime').textContent = fmtDur((Date.now() - rec.t0) / 1000);
  let lvl = 0.15;
  if (rec.analyser) { const d = new Uint8Array(rec.analyser.fftSize); rec.analyser.getByteTimeDomainData(d); let s = 0; for (const v of d) s += ((v - 128) / 128) ** 2; lvl = Math.min(1, Math.sqrt(s / d.length) * 4 + 0.08); }
  rec.levels.push(lvl); if (rec.levels.length > 80) rec.levels.shift();
  $('recWave').innerHTML = rec.levels.map((l) => `<b style="height:${Math.round(l * 100)}%"></b>`).join('');
  if (Date.now() - rec.t0 > 5 * 60e3) stopRec(true);
}
function stopRec(send) {
  if (!rec) return;
  const r = rec; rec = null;
  clearInterval(r.timer);
  $('recBar').classList.add('hidden'); $('composer').classList.remove('hidden'); renderTray();
  r.mr.onstop = async () => {
    r.stream.getTracks().forEach((t) => t.stop());
    try { r.actx && r.actx.close(); } catch {}
    if (!send) return;
    const dur = (Date.now() - r.t0) / 1000;
    if (dur < 0.7) return toast('Sprachnachricht zu kurz');
    const blob = new Blob(r.chunks, { type: (r.mr.mimeType || 'audio/webm').split(';')[0] });
    try {
      const up = await upload(blob, 'Sprachnachricht');
      socket.emit('message', { conv: r.conv, text: '', att: [{ id: up.id, kind: 'voice', dur }] }, (x) => x && x.error && toast(x.error));
    } catch (e) { toast('Senden fehlgeschlagen', e.message); }
  };
  try { r.mr.stop(); } catch { r.stream.getTracks().forEach((t) => t.stop()); }
  autoGrow();
}

/* ================= Seitenpanel ================= */
function togglePanel(m) {
  panelMode = panelMode === m ? null : m;
  if (panelMode) renderPanel(); else $('panel').classList.add('hidden');
  renderHead();
}
function profileCard(u, src = {}) {
  const p = { ...P(u), ...src };
  const bannerUrl = src.bannerUrl !== undefined ? src.bannerUrl : p.banner ? mediaUrl(p.banner) : null;
  let av = avatar(u, 'xl', !src.preview);
  if (src.avatarUrl !== undefined) av = `<div class="av xl">${src.avatarUrl ? `<img src="${src.avatarUrl}" alt="">` : esc(((p.displayName || u)[0] || '?').toUpperCase())}</div>`;
  const st = stOf(u);
  return `<div class="pcard"><div class="banner" style="${bannerUrl ? `background-image:url('${bannerUrl}')` : ''}"></div><div class="pc">${av}
    <div class="pc-top"><div class="pc-name">${esc(p.displayName || u)}</div>${badgeHtml(u)}</div>
    <div class="pc-user">@${esc(u)}${p.owner ? ' · <span class="tag">Owner</span>' : ''}</div>
    ${p.customStatus ? `<div class="pc-cs">💬 ${esc(p.customStatus)}</div>` : ''}
    ${p.pronouns ? `<span class="chip">${esc(p.pronouns)}</span>` : ''}
    ${p.bio ? `<div class="pc-sec"><div class="label">Über mich</div><p>${fmtText(p.bio)}</p></div>` : ''}
    ${!src.preview ? `<div class="pc-sec"><div class="label">Status</div><p><span class="sdot s-${st}"></span>${STATUS[st][0]}</p></div>` : ''}
  </div></div>`;
}
function mediaSection() {
  const list = msgs.filter((m) => !m.deleted).flatMap((m) => (m.att || []).filter((a) => a.kind === 'image' || a.kind === 'video')).reverse().slice(0, 30);
  if (!list.length) return '';
  return `<div class="section label" style="padding-left:2px">Medien — ${list.length}</div><div class="mediagrid">${list.map((a) => a.kind === 'image' ? `<img src="${mediaUrl(a.id)}" data-lb="${a.id}" loading="lazy" alt="">` : `<video src="${mediaUrl(a.id)}#t=0.1" preload="metadata" muted data-openvid="${a.id}"></video>`).join('')}</div>`;
}
function renderPanel() {
  if (!current || !panelMode) return $('panel').classList.add('hidden');
  const dm = isDM(current), g = grp(current);
  let title = '', body = '';
  if (panelMode === 'pins') {
    title = 'Angepinnt';
    const pins = msgs.filter((m) => m.pinned && !m.deleted).reverse();
    body = pins.length ? pins.map((m) => `<div class="pinitem"><div class="ph">${avatar(m.from, 's')}<b>${esc(dn(m.from))}</b><span>${fmtShort(m.at)}</span></div><p>${m.text ? fmtText(m.text) : esc(msgLabel(m))}</p><div class="pa"><button class="btn small ghost" data-jump="${m.id}">Zur Nachricht</button><button class="btn small ghost" data-pin="${m.id}">Loslösen</button></div></div>`).join('')
      : `<div class="emptylist">📌<br>Noch keine angepinnten Nachrichten.<br>Fahre über eine Nachricht und klicke auf die Pinnnadel.</div>`;
  } else if (isNote(current)) {
    title = 'Notizen';
    body = `<div class="ghead">${convAvatar(current, 'xl')}<div class="gn">Notizen</div><div class="pc-user">Dein privater Chat mit dir selbst</div></div><p class="muted" style="font-size:14px;margin-bottom:10px">Speichere hier Ideen, Links, Bilder oder Sprachnotizen. Niemand außer dir kann diesen Chat sehen. Mit 📌 kannst du Wichtiges anpinnen.</p>` + mediaSection();
  } else if (dm) {
    const u = other(current);
    title = 'Profil';
    body = profileCard(u) + `<div class="pbtns row2"><button class="btn ghost" data-callaudio>${I.phone} Anrufen</button><button class="btn ghost" data-callvideo>${I.video} Video</button></div>` + mediaSection() + `<div class="pbtns row2"><button class="btn danger" data-unfriend="${esc(u)}">Entfernen</button><button class="btn danger" data-block="${esc(u)}">${I.block} Blockieren</button></div>`;
  } else if (g) {
    title = 'Gruppeninfo';
    const owner = g.owner === S.me;
    const mem = [...g.members].sort((a, b) => (b === g.owner) - (a === g.owner) || isOn(b) - isOn(a) || dn(a).localeCompare(dn(b)));
    body = `<div class="ghead"><span data-gimg>${gAvatar(g, 'xl')}</span><div class="gn">${esc(g.name)}</div><div class="pc-user">Gruppe · ${g.members.length} Mitglieder</div></div>
      <div class="field"><span class="label">Gruppenname</span><div style="display:flex;gap:8px"><input class="input" id="gName" value="${esc(g.name)}" maxlength="40"><button class="btn small" data-grename>Speichern</button></div></div>
      <div class="pbtns"><button class="btn ghost" data-gadd>${I.userPlus} Mitglieder hinzufügen</button></div>
      <div class="section label" style="padding-left:2px">Mitglieder — ${g.members.length}</div>
      ${mem.map((u) => `<div class="item" data-profile="${esc(u)}">${avatar(u, '', true)}<div class="ic"><div class="ir"><b>${esc(dn(u))}${u === S.me ? ' (Du)' : ''}</b>${badgeHtml(u, true)}${u === g.owner ? '<span class="tag">Admin</span>' : ''}</div><div class="ir"><span class="pv">${esc(P(u).customStatus || '@' + u)}</span></div></div>${owner && u !== S.me ? `<button class="ibtn" data-kick="${esc(u)}" title="Entfernen">${I.x}</button>` : ''}</div>`).join('')}
      ${mediaSection()}
      <div class="pbtns"><button class="btn danger" data-gleave>${I.logout} Gruppe verlassen</button></div>`;
  }
  $('panel').innerHTML = `<div class="panel-head"><h3>${title}</h3><button class="ibtn" data-closepanel>${I.x}</button></div><div class="panel-body">${body}</div>`;
  $('panel').classList.remove('hidden');
}

/* ================= Status-Menü ================= */
function renderStatusMenu() {
  const p = P(S.me);
  $('statusMenu').innerHTML = `<div class="pbanner" style="${p.banner ? `background-image:url('${mediaUrl(p.banner)}')` : ''}"></div>
    <div class="phead">${avatar(S.me, 'm', true)}<div class="pname">${esc(dn(S.me))} ${badgeHtml(S.me, true)}</div><div class="pc-user">@${esc(S.me)}</div></div>
    <div class="cs"><input class="input" id="csInput" maxlength="60" placeholder="💬 Status-Text festlegen…" value="${esc(p.customStatus || '')}"></div>
    <div class="opts">${['online', 'idle', 'dnd', 'invisible'].map((k) => `<button class="opt ${S.myStatus === k ? 'on' : ''}" data-setstatus="${k}"><span class="sdot s-${k === 'invisible' ? 'offline' : k}"></span><div><b>${STATUS[k][0]}</b><small>${STATUS[k][1]}</small></div></button>`).join('')}</div>
    <div class="opts"><button class="opt" data-opensettings="profile">${I.edit}<div><b>Profil bearbeiten</b></div></button><button class="opt" data-opensettings="look">${I.gear}<div><b>Einstellungen</b></div></button></div>`;
  const cs = $('csInput');
  cs.onkeydown = (e) => { if (e.key === 'Enter') { socket.emit('status:set', { customStatus: cs.value }); toast('Status-Text gespeichert'); cs.blur(); } };
  cs.onblur = () => { if (cs.value !== (P(S.me).customStatus || '')) socket.emit('status:set', { customStatus: cs.value }); };
}
function toggleStatusMenu() {
  const m = $('statusMenu');
  if (!m.classList.contains('hidden')) return m.classList.add('hidden');
  renderStatusMenu();
  m.classList.remove('hidden');
}
document.addEventListener('mousedown', (e) => {
  if (!$('statusMenu').classList.contains('hidden') && !e.target.closest('#statusMenu') && !e.target.closest('#rbMe')) $('statusMenu').classList.add('hidden');
  if (!$('soundboard').classList.contains('hidden') && !e.target.closest('#soundboard') && !e.target.closest('#sbBtn')) { $('soundboard').classList.add('hidden'); $('sbBtn').classList.remove('on'); }
});

/* ================= Modale ================= */
function openModal(html, wide) {
  $('modal').innerHTML = `<div class="mbox ${wide ? 'wide' : ''}">${html}</div>`;
  $('modal').classList.remove('hidden');
}
function closeModal() { $('modal').classList.add('hidden'); $('modal').innerHTML = ''; }
$('modal').addEventListener('mousedown', (e) => { if (e.target === $('modal')) closeModal(); });
document.addEventListener('keydown', (e) => {
  if (e.key !== 'Escape') return;
  if (!$('lightbox').classList.contains('hidden')) return closeLightbox();
  if (!$('modal').classList.contains('hidden')) return closeModal();
  if (!$('statusMenu').classList.contains('hidden')) return $('statusMenu').classList.add('hidden');
  if (rec) return stopRec(false);
  if (panelMode) togglePanel(panelMode);
});
const mHead = (t) => `<div class="mhead"><h3>${t}</h3><button class="ibtn" data-closemodal>${I.x}</button></div>`;

// Profil eines Nutzers
function openProfile(u) {
  if (u === S.me) return openSettings('profile');
  const isF = S.friends.includes(u), inc = S.incoming.includes(u), out = S.outgoing.includes(u);
  let btn;
  if (isF) btn = `<div class="pbtns row2"><button class="btn" data-chat="${esc(u)}">${I.chat} Nachricht</button><button class="btn ghost" data-callto="${esc(u)}">${I.phone} Anrufen</button></div>`;
  else if (inc) btn = `<div class="pbtns"><button class="btn" data-acc="${esc(u)}">Anfrage annehmen</button></div>`;
  else if (out) btn = `<div class="pbtns"><button class="btn ghost" disabled>Anfrage gesendet</button></div>`;
  else btn = `<div class="pbtns"><button class="btn" data-add="${esc(u)}">${I.userPlus} Freund hinzufügen</button></div>`;
  if (isBlocked(u)) btn = `<div class="pbtns"><button class="btn ghost" data-unblock="${esc(u)}">Blockierung aufheben</button></div>`;
  else btn += `<div class="pbtns"><button class="btn danger" data-block="${esc(u)}">${I.block} Blockieren</button></div>`;
  let own = '';
  if (S.isOwner) {
    const has = P(u).badges || [];
    own = `<div class="pc-sec"><div class="label" style="margin-bottom:8px">Abzeichen vergeben (nur Owner)</div><div class="bgrant">${Object.entries(BADGES).map(([k, b]) => `<button class="bgr ${has.includes(k) ? 'on' : ''}" data-grant="${k}" data-grantuser="${esc(u)}"><span class="bdg" style="background:${b.bg}">${b.svg}</span>${b.name}</button>`).join('')}</div></div>`;
  }
  openModal(`${mHead('Profil')}<div class="mbody">${profileCard(u)}${btn}${own}</div>`);
}

// Lightbox für Bilder
function openLightbox(id) {
  $('lightbox').innerHTML = `<div class="lbbar"><b>Bild</b><a class="ibtn" href="${mediaUrl(id)}?dl=connecta-bild.jpg" title="Herunterladen">${I.download}</a><button class="ibtn" data-closelb title="Schließen">${I.x}</button></div><div class="lbimg" data-closelb><img src="${mediaUrl(id)}" alt=""></div>`;
  $('lightbox').classList.remove('hidden');
}
function closeLightbox() { $('lightbox').classList.add('hidden'); $('lightbox').innerHTML = ''; }

// --- Einstellungen ---
let sTab = 'profile', draft = {};
function openSettings(tab = 'profile') {
  $('statusMenu').classList.add('hidden');
  sTab = tab;
  const p = P(S.me);
  draft = { displayName: p.displayName || '', pronouns: p.pronouns || '', bio: p.bio || '', customStatus: p.customStatus || '' };
  renderSettings();
}
function renderSettings() {
  const T = [['profile', 'Mein Profil'], ['look', 'Darstellung'], ['sounds', 'Soundboard'], ['notify', 'Benachrichtigungen'], ['privacy', 'Privatsphäre'], ['account', 'Konto']];
  const tabs = `<div class="stabs">${T.map(([k, t]) => `<button class="${sTab === k ? 'on' : ''}" data-stab="${k}">${t}</button>`).join('')}</div>`;
  let body = '';
  const p = P(S.me);
  if (sTab === 'profile') {
    const hasAv = draft.avatar !== undefined ? !!draft.avatar : !!p.avatar;
    const hasBn = draft.banner !== undefined ? !!draft.banner : !!p.banner;
    body = `<div class="sgrid"><div>
      <div class="field"><span class="label">Anzeigename</span><input class="input" id="fName" maxlength="32" placeholder="${esc(S.me)}" value="${esc(draft.displayName)}"></div>
      <div class="field"><span class="label">Pronomen</span><input class="input" id="fPron" maxlength="30" placeholder="z. B. er/ihm, sie/ihr, they/them" value="${esc(draft.pronouns)}"></div>
      <div class="field"><span class="label">Status-Text</span><input class="input" id="fCs" maxlength="60" placeholder="z. B. 🎮 Am Zocken" value="${esc(draft.customStatus)}"></div>
      <div class="field"><span class="label">Über mich</span><textarea class="input" id="fBio" rows="4" maxlength="190" placeholder="Erzähl etwas über dich…">${esc(draft.bio)}</textarea><span class="cnt" id="bioCnt">${draft.bio.length}/190</span></div>
      <div class="field"><span class="label">Profilbild</span><div class="imgrow"><button class="btn small" data-pickav>Bild hochladen</button>${hasAv ? `<button class="btn small ghost" data-rmav>Entfernen</button>` : ''}</div></div>
      <div class="field"><span class="label">Profilbanner</span><div class="imgrow"><button class="btn small" data-pickbn>Banner hochladen</button>${hasBn ? `<button class="btn small ghost" data-rmbn>Entfernen</button>` : ''}</div></div>
      <button class="btn block" data-saveprofile>Änderungen speichern</button>
    </div><div><div class="label" style="margin-bottom:8px">Vorschau</div><div id="pPrev">${previewCard()}</div></div></div>`;
  } else if (sTab === 'look') {
    loadAllFonts();
    const th = [['connecta', 'Connecta', '#07060b', '#1f1830', 'radial-gradient(circle at 80% 0%,#5b21ff66,transparent 70%)'], ['dark', 'Dunkel', '#18191c', '#2b2d31', 'none'], ['light', 'Hell', '#f6f3fc', '#ffffff', 'none']];
    const cu = LOOK.custom;
    const PRESETS = [['#5b21ff', '#d89cff', 'Lila'], ['#0066ff', '#00d4ff', 'Ozean'], ['#ff3d7f', '#ffb347', 'Sonnenuntergang'], ['#0f9b5f', '#a8e063', 'Wald'], ['#ff4e00', '#ec9f05', 'Feuer'], ['#ff00a8', '#ffa6e1', 'Pink'], ['#00b09b', '#96c93d', 'Minze'], ['#e52d27', '#b31217', 'Rot'], ['#4b4b5a', '#a3a3b5', 'Grau'], ['#7f00ff', '#e100ff', 'Neon']];
    body = `<div class="label" style="margin-bottom:10px">Farbschema</div><div class="themes four">${th.map(([k, t, bg, inb, img]) => `<div class="tcard ${LOOK.theme === k ? 'on' : ''}" data-theme-pick="${k}"><div class="tprev" style="background:${bg};background-image:${img};border:1px solid #8882"><i style="background:${inb}"></i><i style="background:linear-gradient(135deg,#5b21ff,#d89cff)"></i></div>${t}</div>`).join('')}<div class="tcard ${LOOK.theme === 'custom' ? 'on' : ''}" data-theme-pick="custom"><div class="tprev" style="background:${cu.base === 'light' ? '#f6f6f9' : '#111116'};background-image:radial-gradient(circle at 80% 0%,${cu.c1}55,transparent 70%);border:1px solid #8882"><i style="background:${cu.base === 'light' ? '#fff' : '#22222a'}"></i><i style="background:linear-gradient(135deg,${cu.c1},${cu.c2})"></i></div>🎨 Eigenes</div></div>
      ${LOOK.theme === 'custom' ? `<div class="custombox">
        <div class="cb-row"><span class="label">Basis</span><div class="seg"><button class="${cu.base !== 'light' ? 'on' : ''}" data-cbase="dark">🌙 Dunkel</button><button class="${cu.base === 'light' ? 'on' : ''}" data-cbase="light">☀️ Hell</button></div></div>
        <div class="cb-row"><span class="label">Verlauf</span><div class="cpick"><label><input type="color" id="c1" value="${cu.c1}"><span>Farbe 1</span></label><div class="gradprev" style="background:linear-gradient(135deg,${cu.c1},${cu.c2})"></div><label><input type="color" id="c2" value="${cu.c2}"><span>Farbe 2</span></label></div></div>
        <div class="label" style="margin:14px 0 8px">Vorlagen</div>
        <div class="presets">${PRESETS.map(([a, b, n]) => `<button class="preset" title="${n}" data-preset="${a},${b}" style="background:linear-gradient(135deg,${a},${b})"></button>`).join('')}</div>
      </div>` : ''}
      <div class="label" style="margin:22px 0 10px">Schriftart</div>
      <div class="fonts">${Object.entries(FONTS).map(([k, f]) => `<div class="fcard ${LOOK.font === k ? 'on' : ''}" data-font-pick="${k}" style="font-family:${fontCss(k).replace(/"/g, "'")}"><div class="fa">Aa Bb</div><div class="fn">${f[2]}</div></div>`).join('')}</div>
      <div class="label" style="margin:22px 0 10px">Nachrichtengröße — <span id="msgSizeV">${LOOK.msgSize}px</span></div>
      <input type="range" class="range" id="msgSize" min="13" max="20" step="1" value="${LOOK.msgSize}">
      <div class="sizeprev"><div class="bubble">Hey! Wie findest du die neue Schrift? 👀</div><div class="bubble b2">Sieht richtig gut aus 💜</div></div>
      <p class="muted" style="margin-top:14px;font-size:14px">Farbschema, Schrift und Größe werden mit deinem Konto gespeichert und gelten auf allen Geräten.</p>`;
  } else if (sTab === 'sounds') {
    body = `<p class="muted" style="font-size:14px;margin-bottom:14px">Das Soundboard findest du während eines Anrufs unten beim 🔊-Knopf. Beide hören den Sound. Klicke hier auf einen Sound, um ihn anzuhören.</p>
      <div class="label" style="margin-bottom:8px">Standard-Sounds</div>
      <div class="sblist">${Sounds.SOUNDS.map((s) => `<div class="sbt" data-sbpreview="${s.key}"><span class="e">${s.emoji}</span><span class="n">${esc(s.name)}</span></div>`).join('')}</div>
      <div class="label" style="margin:20px 0 8px">Deine Sounds — ${S.sounds.length}/12</div>
      ${S.sounds.length ? `<div class="sblist">${S.sounds.map((s) => `<div class="sbt" data-sbpreviewmedia="${esc(s.media)}"><button class="x" data-sbremove="${esc(s.id)}" title="Löschen">${I.x}</button><span class="e">${esc(s.emoji)}</span><span class="n">${esc(s.name)}</span></div>`).join('')}</div>` : `<p class="muted" style="font-size:14px">Noch keine eigenen Sounds.</p>`}
      ${S.sounds.length < 12 ? `<div class="addsound"><input class="input" id="sbEmoji" maxlength="4" value="🔊" style="text-align:center;font-size:20px;padding:10px"><input class="input" id="sbName" maxlength="20" placeholder="Name des Sounds"></div>
      <div class="pbtns"><button class="btn" data-sbadd>${I.plus} Audiodatei auswählen (max. 8 Sek.)</button></div>` : ''}`;
  } else if (sTab === 'notify') {
    const perm = 'Notification' in window ? Notification.permission : 'unsupported';
    body = `<div class="toggle ${PREFS.sound ? 'on' : ''}" data-pref="sound"><div><b>Töne</b><small>Kurzer Ton bei neuen Nachrichten und Erwähnungen</small></div><span class="sw"></span></div>
      <div class="toggle ${PREFS.desktop && perm === 'granted' ? 'on' : ''}" data-pref="desktop"><div><b>Desktop-Benachrichtigungen</b><small>${perm === 'denied' ? 'Im Browser blockiert – erlaube Benachrichtigungen in den Seiteneinstellungen.' : perm === 'unsupported' ? 'Wird von diesem Browser nicht unterstützt.' : 'Für Direktnachrichten und Erwähnungen, wenn Connecta im Hintergrund ist'}</small></div><span class="sw"></span></div>
      <p class="muted" style="font-size:14px;margin-top:6px">Tipp: Mit dem Status „Bitte nicht stören“ bekommst du gar keine Töne und Benachrichtigungen. Erwähne jemanden mit <b>@username</b>, damit er benachrichtigt wird.</p>`;
  } else if (sTab === 'privacy') {
    const rr = (S.settings || {}).readReceipts !== false;
    body = `<div class="toggle ${rr ? 'on' : ''}" data-readreceipts><div><b>Lesebestätigungen</b><small>Andere sehen, wann du ihre Nachrichten gelesen hast. Wenn du das ausschaltest, siehst du auch bei anderen nicht, ob sie gelesen haben.</small></div><span class="sw"></span></div>
      <div class="label" style="margin:20px 0 8px">Blockierte Nutzer — ${S.blocked.length}</div>
      ${S.blocked.length ? S.blocked.map((u) => `<div class="item" style="cursor:default">${avatar(u)}<div class="ic"><div class="ir"><b>${esc(dn(u))}</b></div><div class="ir"><span class="pv">@${esc(u)}</span></div></div><button class="btn small ghost" data-unblock="${esc(u)}">Aufheben</button></div>`).join('') : `<p class="muted" style="font-size:14px">Du hast niemanden blockiert.</p>`}
      <p class="muted" style="font-size:14px;margin-top:14px">Blockierte Personen können dir keine Anfragen schicken, dich nicht anrufen und ihre Nachrichten in Gruppen werden ausgeblendet.</p>`;
  } else {
    body = `<div class="item" style="cursor:default">${avatar(S.me, 'm', true)}<div class="ic"><div class="ir"><b>${esc(dn(S.me))}</b></div><div class="ir"><span class="pv">@${esc(S.me)}</span></div></div></div>
      <p class="muted" style="margin:12px 0 18px;font-size:14px">Dein Username kann nicht geändert werden. Deinen Anzeigenamen kannst du unter „Mein Profil“ anpassen.</p>
      <button class="btn danger block" data-logout>${I.logout} Abmelden</button>`;
  }
  openModal(`${mHead('Einstellungen')}${tabs}<div class="mbody">${body}</div>`, sTab === 'profile' || sTab === 'look' || sTab === 'sounds');
  if (sTab === 'profile') {
    const upd = () => { draft.displayName = $('fName').value; draft.pronouns = $('fPron').value; draft.bio = $('fBio').value; draft.customStatus = $('fCs').value; $('bioCnt').textContent = draft.bio.length + '/190'; $('pPrev').innerHTML = previewCard(); };
    ['fName', 'fPron', 'fBio', 'fCs'].forEach((id) => $(id).addEventListener('input', upd));
  }
  if (sTab === 'look' && $('c1')) {
    let ct;
    const upd = () => { applyLook({ custom: { ...LOOK.custom, c1: $('c1').value, c2: $('c2').value } }); document.querySelector('.gradprev').style.background = `linear-gradient(135deg,${$('c1').value},${$('c2').value})`; clearTimeout(ct); ct = setTimeout(() => socket.emit('settings:update', { custom: LOOK.custom }), 400); };
    $('c1').oninput = upd; $('c2').oninput = upd;
    $('c1').onchange = () => renderSettings(); $('c2').onchange = () => renderSettings();
  }
  if (sTab === 'look') {
    $('msgSize').oninput = () => { $('msgSizeV').textContent = $('msgSize').value + 'px'; applyLook({ msgSize: +$('msgSize').value }); };
    $('msgSize').onchange = () => socket.emit('settings:update', { msgSize: +$('msgSize').value });
  }
}
function previewCard() {
  const src = { preview: true, displayName: draft.displayName, pronouns: draft.pronouns, bio: draft.bio, customStatus: draft.customStatus };
  if (draft.avatar !== undefined) src.avatarUrl = draft.avatar ? draft.avatar.url : null;
  if (draft.banner !== undefined) src.bannerUrl = draft.banner ? draft.banner.url : null;
  return profileCard(S.me, src);
}
async function saveProfile(btn) {
  btn.disabled = true; btn.textContent = 'Speichere…';
  const d = { displayName: draft.displayName, pronouns: draft.pronouns, bio: draft.bio, customStatus: draft.customStatus };
  try {
    for (const k of ['avatar', 'banner']) {
      if (draft[k] === null) d[k] = null;
      else if (draft[k]) d[k] = (await upload(draft[k].blob, k)).id;
    }
  } catch (e) { btn.disabled = false; btn.textContent = 'Änderungen speichern'; return toast('Upload fehlgeschlagen', e.message); }
  socket.emit('profile:update', d, (r) => { toast(r.error || 'Profil gespeichert ✨'); closeModal(); });
}
function addCustomSound() {
  const inp = document.createElement('input');
  inp.type = 'file'; inp.accept = 'audio/*';
  inp.onchange = async () => {
    const f = inp.files[0];
    if (!f) return;
    if (f.size > 1.5 * 1048576) return toast('Datei zu groß', 'Maximal 1,5 MB.');
    const url = URL.createObjectURL(f);
    const dur = await new Promise((res) => { const a = new Audio(); a.onloadedmetadata = () => res(a.duration); a.onerror = () => res(NaN); a.src = url; });
    URL.revokeObjectURL(url);
    if (!isFinite(dur)) return toast('Diese Audiodatei kann nicht abgespielt werden.');
    if (dur > 8.5) return toast('Sound zu lang', 'Maximal 8 Sekunden.');
    const name = ($('sbName') || {}).value || f.name.replace(/\.[^.]+$/, '').slice(0, 20);
    const emoji = ($('sbEmoji') || {}).value || '🔊';
    try {
      const up = await upload(f, f.name);
      socket.emit('sound:add', { media: up.id, name, emoji }, (r) => { toast(r.error || 'Sound hinzugefügt 🔊'); setTimeout(() => sTab === 'sounds' && !$('modal').classList.contains('hidden') && renderSettings(), 150); });
    } catch (e) { toast('Upload fehlgeschlagen', e.message); }
  };
  inp.click();
}

// --- Gruppe erstellen / Mitglieder hinzufügen ---
let gSel = new Set(), gImg = null, gMode = 'create';
function openGroupModal(mode = 'create') {
  gMode = mode; gSel = new Set(); gImg = null;
  if (!S.friends.length) return toast('Du brauchst zuerst Freunde', 'Füge Freunde hinzu, um eine Gruppe zu erstellen.');
  renderGroupModal();
}
function renderGroupModal(keepName) {
  const g = gMode === 'add' ? grp(current) : null;
  const cands = S.friends.filter((f) => !g || !g.members.includes(f));
  const name = keepName !== undefined ? keepName : '';
  const q = ($('gSearch') || {}).value || '';
  const list = cands.filter((f) => !q || (dn(f) + f).toLowerCase().includes(q.toLowerCase()));
  openModal(`${mHead(gMode === 'add' ? 'Mitglieder hinzufügen' : 'Neue Gruppe')}<div class="mbody">
    ${gMode === 'create' ? `<div class="gimg"><span data-gpick title="Gruppenbild wählen">${gAvatar({ name: name || '📷' }, 'l', gImg && gImg.url)}</span><div style="flex:1"><div class="field" style="margin:0"><span class="label">Gruppenname</span><input class="input" id="gNew" maxlength="40" placeholder="z. B. Die Crew 💜" value="${esc(name)}"></div></div></div>` : ''}
    <span class="label">Freunde auswählen${gSel.size ? ` — ${gSel.size} ausgewählt` : ''}</span>
    ${gSel.size ? `<div class="chips" style="margin-top:8px">${[...gSel].map((u) => `<span>${esc(dn(u))}</span>`).join('')}</div>` : ''}
    <div class="searchbox" style="margin:10px 0 0">${I.search}<input class="input" id="gSearch" placeholder="Freunde suchen" value="${esc(q)}"></div>
    <div class="picklist">${list.length ? list.map((u) => `<div class="pick ${gSel.has(u) ? 'on' : ''}" data-gtoggle="${esc(u)}">${avatar(u, 's', true)}<b>${esc(dn(u))}</b><span class="check">${I.check}</span></div>`).join('') : `<div class="emptylist">${cands.length ? 'Niemand gefunden.' : 'Alle deine Freunde sind schon in der Gruppe.'}</div>`}</div>
    <button class="btn block" data-gsubmit ${gSel.size ? '' : 'disabled'}>${gMode === 'add' ? 'Hinzufügen' : 'Gruppe erstellen'}</button>
  </div>`);
  const s = $('gSearch');
  s.oninput = () => { const pos = s.selectionStart; renderGroupModal(($('gNew') || {}).value); const n = $('gSearch'); n.focus(); n.setSelectionRange(pos, pos); };
}

/* ================= Klicks ================= */
const ACTIONS = '[data-view],[data-conv],[data-chat],[data-profile],[data-add],[data-acc],[data-dec],[data-pin],[data-del],[data-copy],[data-jump],[data-back],[data-info],[data-pins],[data-closepanel],[data-callaudio],[data-callvideo],[data-callto],[data-unfriend],[data-grename],[data-gadd],[data-gleave],[data-kick],[data-gimg],[data-closemodal],[data-stab],[data-theme-pick],[data-font-pick],[data-pickav],[data-pickbn],[data-rmav],[data-rmbn],[data-saveprofile],[data-logout],[data-gtoggle],[data-gpick],[data-gsubmit],[data-lb],[data-closelb],[data-play],[data-seek],[data-rmfile],[data-mention],[data-reply-mention],[data-setstatus],[data-opensettings],[data-pref],[data-sbpreview],[data-sbpreviewmedia],[data-sbremove],[data-sbadd],[data-sbplay],[data-sbmanage],[data-reccancel],[data-recsend],[data-openvid],[data-block],[data-unblock],[data-reveal],[data-grant],[data-badgeinfo],[data-cbase],[data-preset],[data-readreceipts]';
document.addEventListener('click', async (e) => {
  Sounds.unlock && (() => { try { Sounds.unlock(); } catch {} })();
  const t = e.target.closest(ACTIONS);
  const row = e.target.closest('.row');
  document.querySelectorAll('.row.sel').forEach((r) => r !== row && r.classList.remove('sel'));
  if (!t) { if (row && e.target.closest('.bubble') && !e.target.closest('a,video')) row.classList.toggle('sel'); return; }
  const d = t.dataset;
  if ('badgeinfo' in d) { e.stopPropagation(); return toast(BADGES[d.badgeinfo].name); }
  if ('block' in d) {
    if (!confirm(`${dn(d.block)} blockieren? Ihr seid dann keine Freunde mehr und ${dn(d.block)} kann dir keine Anfragen schicken oder dich anrufen.`)) return;
    return socket.emit('block', d.block, (r) => { toast(r.error || `${dn(d.block)} wurde blockiert`); closeModal(); });
  }
  if ('unblock' in d) return socket.emit('unblock', d.unblock, (r) => { toast(r.error || 'Blockierung aufgehoben'); if (sTab === 'privacy' && !$('modal').classList.contains('hidden')) setTimeout(renderSettings, 150); else closeModal(); });
  if ('reveal' in d) { revealed.add(d.reveal); return renderMsgs(); }
  if ('grant' in d) { const on = !t.classList.contains('on'); return socket.emit('badge:set', { user: d.grantuser, badge: d.grant, on }, (r) => { if (r.error) return toast(r.error); t.classList.toggle('on', on); setTimeout(() => openProfile(d.grantuser), 200); }); }
  if ('cbase' in d) { applyLook({ custom: { ...LOOK.custom, base: d.cbase } }); socket.emit('settings:update', { custom: LOOK.custom }); return renderSettings(); }
  if ('preset' in d) { const [c1, c2] = d.preset.split(','); applyLook({ custom: { ...LOOK.custom, c1, c2 } }); socket.emit('settings:update', { custom: LOOK.custom }); return renderSettings(); }
  if ('readreceipts' in d) { const v = (S.settings || {}).readReceipts === false; S.settings = { ...S.settings, readReceipts: v }; socket.emit('settings:update', { readReceipts: v }); return renderSettings(); }
  if ('sbremove' in d) { e.stopPropagation(); return socket.emit('sound:remove', d.sbremove, (r) => { if (r.error) toast(r.error); setTimeout(renderSettings, 150); }); }
  if ('view' in d) { closeModal(); return setView(d.view); }
  if ('conv' in d) return openConv(d.conv);
  if ('chat' in d) { closeModal(); view = 'chats'; $('search').value = ''; renderRail(); renderSide(); return openConv(dmId(S.me, d.chat)); }
  if ('mention' in d) return pickMention(d.mention);
  if ('replyMention' in d) { const tx = $('text'); tx.value = (tx.value && !tx.value.endsWith(' ') ? tx.value + ' ' : tx.value) + '@' + d.replyMention + ' '; tx.focus(); autoGrow(); updateSendBtn(); return; }
  if ('profile' in d) return openProfile(d.profile);
  if ('add' in d) return socket.emit('friend:request', d.add, (r) => { toast(r.error || 'Freundschaftsanfrage gesendet 💜'); if (!r.error) closeModal(); });
  if ('acc' in d) return socket.emit('friend:accept', d.acc, (r) => { toast(r.error || `Du und ${dn(d.acc)} seid jetzt Freunde 💜`); closeModal(); });
  if ('dec' in d) return socket.emit('friend:decline', d.dec);
  if ('pin' in d) return socket.emit('message:pin', d.pin, (r) => r.error ? toast(r.error) : toast(r.pinned ? 'Nachricht angepinnt 📌' : 'Nachricht losgelöst'));
  if ('del' in d) { if (confirm('Diese Nachricht für alle löschen?')) socket.emit('message:delete', d.del, (r) => r.error && toast(r.error)); return; }
  if ('copy' in d) { const m = msgs.find((x) => x.id === d.copy); if (m) { try { await navigator.clipboard.writeText(m.text); toast('Kopiert'); } catch { toast('Kopieren nicht möglich'); } } return; }
  if ('jump' in d) return jumpTo(d.jump);
  if ('back' in d) return closeChat();
  if ('info' in d) return togglePanel('info');
  if ('pins' in d) return togglePanel('pins');
  if ('closepanel' in d) return togglePanel(panelMode);
  if ('callaudio' in d) return startCall(other(current), false);
  if ('callvideo' in d) return startCall(other(current), true);
  if ('callto' in d) { closeModal(); return startCall(d.callto, false); }
  if ('unfriend' in d) { if (confirm(`${dn(d.unfriend)} wirklich als Freund entfernen?`)) socket.emit('friend:remove', d.unfriend); return; }
  if ('grename' in d) return socket.emit('group:update', { id: current, name: $('gName').value }, (r) => toast(r.error || 'Gespeichert'));
  if ('gadd' in d) return openGroupModal('add');
  if ('gleave' in d) { if (confirm('Möchtest du die Gruppe wirklich verlassen?')) socket.emit('group:leave', current, (r) => r.error && toast(r.error)); return; }
  if ('kick' in d) { e.stopPropagation(); if (confirm(`${dn(d.kick)} aus der Gruppe entfernen?`)) socket.emit('group:kick', { id: current, user: d.kick }, (r) => r.error && toast(r.error)); return; }
  if ('gimg' in d) {
    const conv = current, img = await pickImage(256, 256);
    try { const up = await upload(img.blob, 'gruppe'); socket.emit('group:update', { id: conv, avatar: up.id }, (r) => toast(r.error || 'Gruppenbild geändert')); } catch (er) { toast('Upload fehlgeschlagen', er.message); }
    return;
  }
  if ('closemodal' in d) return closeModal();
  if ('stab' in d) { sTab = d.stab; return renderSettings(); }
  if ('themePick' in d) { applyLook({ theme: d.themePick }); socket.emit('settings:update', { theme: d.themePick, ...(d.themePick === 'custom' ? { custom: LOOK.custom } : {}) }); return renderSettings(); }
  if ('fontPick' in d) { applyLook({ font: d.fontPick }); socket.emit('settings:update', { font: d.fontPick }); return renderSettings(); }
  if ('pickav' in d) { draft.avatar = await pickImage(256, 256); return renderSettings(); }
  if ('pickbn' in d) { draft.banner = await pickImage(960, 320); return renderSettings(); }
  if ('rmav' in d) { draft.avatar = null; return renderSettings(); }
  if ('rmbn' in d) { draft.banner = null; return renderSettings(); }
  if ('saveprofile' in d) return saveProfile(t);
  if ('logout' in d) return logout();
  if ('gtoggle' in d) { gSel.has(d.gtoggle) ? gSel.delete(d.gtoggle) : gSel.add(d.gtoggle); return renderGroupModal(($('gNew') || {}).value); }
  if ('gpick' in d) { const name = $('gNew').value; gImg = await pickImage(256, 256); return renderGroupModal(name); }
  if ('gsubmit' in d) {
    if (gMode === 'add') return socket.emit('group:add', { id: current, users: [...gSel] }, (r) => { toast(r.error || 'Mitglieder hinzugefügt'); if (!r.error) closeModal(); });
    const name = $('gNew').value.trim();
    if (!name) { $('gNew').focus(); return toast('Gib der Gruppe einen Namen.'); }
    t.disabled = true;
    let avatarId = null;
    if (gImg) { try { avatarId = (await upload(gImg.blob, 'gruppe')).id; } catch {} }
    return socket.emit('group:create', { name, members: [...gSel], avatar: avatarId }, (r) => {
      if (r.error) { t.disabled = false; return toast(r.error); }
      closeModal(); view = 'chats'; $('search').value = '';
      setTimeout(() => openConv(r.id), 150);
    });
  }
  if ('lb' in d) return openLightbox(d.lb);
  if ('openvid' in d) { const v = document.querySelector(`.att-vid[src^="${mediaUrl(d.openvid)}"]`); if (v) { v.scrollIntoView({ behavior: 'smooth', block: 'center' }); if (window.innerWidth <= 760) togglePanel(panelMode); } return; }
  if ('closelb' in d) { if (e.target.tagName !== 'IMG') closeLightbox(); return; }
  if ('play' in d) { if (apId === d.play && !AP.paused) AP.pause(); else playAudio(d.play); return; }
  if ('seek' in d) { const r = t.getBoundingClientRect(); return playAudio(d.seek, Math.min(1, Math.max(0, (e.clientX - r.left) / r.width))); }
  if ('rmfile' in d) { const p = pending.splice(+d.rmfile, 1)[0]; if (p) URL.revokeObjectURL(p.url); renderTray(); updateSendBtn(); return; }
  if ('setstatus' in d) { S.myStatus = d.setstatus; socket.emit('status:set', { status: d.setstatus }); renderRail(); renderStatusMenu(); return; }
  if ('opensettings' in d) return openSettings(d.opensettings);
  if ('pref' in d) {
    if (d.pref === 'desktop' && !PREFS.desktop) {
      if (!('Notification' in window)) return;
      const perm = await Notification.requestPermission();
      PREFS.desktop = perm === 'granted';
      if (!PREFS.desktop) toast('Benachrichtigungen wurden nicht erlaubt');
    } else PREFS[d.pref] = !PREFS[d.pref];
    savePrefs(); return renderSettings();
  }
  if ('sbpreview' in d) { Sounds.playSound({ key: d.sbpreview }, PREFS.sbVol); flashTile(t); return; }
  if ('sbpreviewmedia' in d) { Sounds.playSound({ media: d.sbpreviewmedia }, PREFS.sbVol); flashTile(t); return; }
  if ('sbadd' in d) return addCustomSound();
  if ('sbplay' in d) return playBoard(d.sbplay, t);
  if ('sbmanage' in d) return openSettings('sounds');
  if ('reccancel' in d) return stopRec(false);
  if ('recsend' in d) return stopRec(true);
});
$('rbGroup').onclick = () => openGroupModal('create');
$('welcomeGroup').onclick = () => openGroupModal('create');
$('rbMe').onclick = toggleStatusMenu;
document.addEventListener('click', (e) => { if (e.target.closest('#sideGroup')) openGroupModal('create'); });
function flashTile(t) { t.classList.remove('play'); void t.offsetWidth; t.classList.add('play'); }

/* ================= Anrufe (WebRTC, 1:1) ================= */
const ICE = { iceServers: [{ urls: 'stun:stun.l.google.com:19302' }, { urls: 'stun:stun1.l.google.com:19302' }] };
let pc = null, localStream = null, peer = null, pendingOffer = null, pendingIce = [], timer, callVideo = false;
const inCall = () => !$('call').classList.contains('hidden');
$('acceptCall').innerHTML = I.phone; $('muteBtn').innerHTML = I.mic; $('camBtn').innerHTML = I.video; $('hangup').innerHTML = I.x; $('sbBtn').innerHTML = I.sound;

function showCall(name, status, video) {
  peer = name; callVideo = video;
  $('call').classList.remove('hidden');
  $('callAv').innerHTML = avatar(name, 'xl');
  $('callName').textContent = dn(name);
  $('callStatus').textContent = status;
  $('videos').classList.toggle('hidden', !video);
  $('callAv').classList.toggle('hidden', video);
  $('camBtn').classList.toggle('hidden', !video);
}
async function getMedia(video) {
  localStream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true }, video });
  $('localV').srcObject = localStream;
}
function makePC() {
  pc = new RTCPeerConnection(ICE);
  localStream.getTracks().forEach((t) => pc.addTrack(t, localStream));
  pc.onicecandidate = (e) => e.candidate && socket.emit('call:ice', { to: peer, candidate: e.candidate });
  pc.ontrack = (e) => { if (callVideo) $('remoteV').srcObject = e.streams[0]; else $('remoteA').srcObject = e.streams[0]; };
  pc.onconnectionstatechange = () => {
    if (!pc) return;
    if (pc.connectionState === 'connected') { $('callAv').classList.remove('pulse'); startTimer(); }
    if (['failed', 'disconnected'].includes(pc.connectionState)) endCall(true, 'Verbindung verloren');
  };
}
function startTimer() { const t0 = Date.now(); clearInterval(timer); timer = setInterval(() => { const s = Math.floor((Date.now() - t0) / 1000); $('callStatus').textContent = String(Math.floor(s / 60)).padStart(2, '0') + ':' + String(s % 60).padStart(2, '0'); }, 1000); }

async function startCall(u, video) {
  if (pc || pendingOffer) return;
  if (!navigator.mediaDevices) return toast('Anrufe brauchen HTTPS', 'Öffne die Seite über https:// oder localhost.');
  try { await getMedia(video); } catch { return toast('Kein Zugriff auf Mikrofon/Kamera.'); }
  showCall(u, 'Klingelt…', video);
  $('callAv').classList.add('pulse');
  $('acceptCall').classList.add('hidden');
  makePC();
  const offer = await pc.createOffer();
  await pc.setLocalDescription(offer);
  socket.emit('call:offer', { to: peer, sdp: offer, video });
}

function setupCalls() {
  socket.on('call:offer', (d) => {
    if (pc || pendingOffer) return socket.emit('call:decline', { to: d.from, busy: true });
    pendingOffer = d;
    showCall(d.from, d.video ? 'Eingehender Videoanruf…' : 'Eingehender Anruf…', false);
    $('acceptCall').classList.remove('hidden');
    $('callAv').classList.add('pulse');
    if (S.myStatus !== 'dnd') Sounds.ring(true);
  });
  socket.on('call:answer', async (d) => { if (pc && d.from === peer) { await pc.setRemoteDescription(d.sdp); flushIce(); $('callStatus').textContent = 'Verbinde…'; } });
  socket.on('call:ice', (d) => { if (d.from !== peer) return; if (pc && pc.remoteDescription) pc.addIceCandidate(d.candidate).catch(() => {}); else pendingIce.push(d.candidate); });
  socket.on('call:end', (d) => { if (d.from === peer) endCall(true, 'Anruf beendet'); });
  socket.on('call:decline', (d) => { if (d.from === peer) endCall(true, d.busy ? 'Besetzt' : 'Anruf abgelehnt'); });
  socket.on('call:sound', (d) => {
    if (d.from !== peer || !pc || !d.sound) return;
    const s = d.sound.media ? { media: String(d.sound.media) } : Sounds.SOUNDS.find((x) => x.key === d.sound.key);
    if (!s) return;
    Sounds.playSound(s, PREFS.sbVol);
    sbNote(`🔊 ${dn(d.from)}: ${d.sound.media ? (d.sound.emoji || '🔊') + ' ' + (d.sound.name || 'Sound') : s.emoji + ' ' + s.name}`);
  });
}
function flushIce() { if (!pc) return; pendingIce.forEach((c) => pc.addIceCandidate(c).catch(() => {})); pendingIce = []; }

$('acceptCall').onclick = async () => {
  const d = pendingOffer; pendingOffer = null; Sounds.ring(false);
  callVideo = d.video;
  try { await getMedia(d.video); } catch { toast('Kein Zugriff auf Mikrofon/Kamera.'); socket.emit('call:decline', { to: d.from }); return endCall(false); }
  showCall(d.from, 'Verbinde…', d.video);
  $('acceptCall').classList.add('hidden');
  makePC();
  await pc.setRemoteDescription(d.sdp);
  flushIce();
  const answer = await pc.createAnswer();
  await pc.setLocalDescription(answer);
  socket.emit('call:answer', { to: peer, sdp: answer });
};
$('hangup').onclick = () => {
  if (pendingOffer) { socket.emit('call:decline', { to: pendingOffer.from }); pendingOffer = null; }
  else if (peer) socket.emit('call:end', { to: peer });
  endCall(false);
};
function endCall(remote, msg) {
  Sounds.ring(false); clearInterval(timer);
  if (pc) { pc.close(); pc = null; }
  if (localStream) { localStream.getTracks().forEach((t) => t.stop()); localStream = null; }
  $('remoteV').srcObject = null; $('localV').srcObject = null; $('remoteA').srcObject = null;
  pendingOffer = null; pendingIce = []; peer = null;
  $('call').classList.add('hidden');
  $('soundboard').classList.add('hidden'); $('sbBtn').classList.remove('on');
  $('muteBtn').classList.remove('off'); $('camBtn').classList.remove('off');
  if (remote && msg) toast(msg);
}
$('muteBtn').onclick = () => { if (!localStream) return; const t = localStream.getAudioTracks()[0]; t.enabled = !t.enabled; $('muteBtn').classList.toggle('off', !t.enabled); };
$('camBtn').onclick = () => { if (!localStream) return; const t = localStream.getVideoTracks()[0]; if (!t) return; t.enabled = !t.enabled; $('camBtn').classList.toggle('off', !t.enabled); };

// --- Soundboard im Anruf ---
let sbCool = 0, sbNoteT;
function renderSoundboard() {
  $('soundboard').innerHTML = `<div class="sbh"><b>🔊 Soundboard</b><span class="muted" style="font-size:13px">Lautstärke</span><input type="range" class="range" id="sbVol" min="0" max="1" step="0.05" value="${PREFS.sbVol}"></div>
    <div class="sblist">${Sounds.SOUNDS.map((s) => `<div class="sbt" data-sbplay="k:${s.key}"><span class="e">${s.emoji}</span><span class="n">${esc(s.name)}</span></div>`).join('')}</div>
    <div class="label">Deine Sounds</div>
    <div class="sblist">${S.sounds.map((s) => `<div class="sbt" data-sbplay="m:${esc(s.id)}"><span class="e">${esc(s.emoji)}</span><span class="n">${esc(s.name)}</span></div>`).join('')}<div class="sbt" data-sbmanage><span class="e">➕</span><span class="n">${S.sounds.length ? 'Verwalten' : 'Hinzufügen'}</span></div></div>`;
  $('sbVol').oninput = () => { PREFS.sbVol = +$('sbVol').value; savePrefs(); };
}
$('sbBtn').onclick = () => {
  const open = $('soundboard').classList.toggle('hidden');
  $('sbBtn').classList.toggle('on', !open);
  if (!open) renderSoundboard();
};
function playBoard(v, tile) {
  if (Date.now() - sbCool < 700) return;
  sbCool = Date.now();
  let s, payload;
  if (v.startsWith('k:')) { s = Sounds.SOUNDS.find((x) => x.key === v.slice(2)); if (!s) return; payload = { key: s.key }; }
  else { const c = S.sounds.find((x) => x.id === v.slice(2)); if (!c) return; s = { media: c.media, emoji: c.emoji, name: c.name }; payload = { media: c.media, emoji: c.emoji, name: c.name }; }
  Sounds.playSound(s, PREFS.sbVol);
  flashTile(tile);
  if (peer && pc) socket.emit('call:sound', { to: peer, sound: payload });
  sbNote(`🔊 Du: ${s.emoji} ${s.name}`);
}
function sbNote(t) {
  $('sbToast').textContent = t;
  $('sbToast').classList.remove('hidden');
  clearTimeout(sbNoteT);
  sbNoteT = setTimeout(() => $('sbToast').classList.add('hidden'), 2500);
}
