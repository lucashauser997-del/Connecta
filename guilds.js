/* =========================================================
   Connecta – Server (wie bei Discord): Kanäle, Rollen, Berechtigungen, Einladungen
   ========================================================= */
const GI = {
  chevron: ic('<path d="M6 9l6 6 6-6"/>'),
  invite: ic('<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M19 8v6M22 11h-6"/>'),
  up: ic('<path d="M18 15l-6-6-6 6"/>'),
  down: ic('<path d="M6 9l6 6 6-6"/>'),
  compass: ic('<circle cx="12" cy="12" r="10"/><path d="M16.2 7.8l-2 6.4-6.4 2 2-6.4z"/>'),
  lock: ic('<rect x="4" y="11" width="16" height="10" rx="3"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/>'),
};
const PERM_INFO = [
  ['ADMIN', 'Administrator', 'Hat alle Berechtigungen und umgeht jede Einschränkung. Nur an Personen vergeben, denen du voll vertraust.'],
  ['MANAGE_SERVER', 'Server verwalten', 'Servername, Serverbild und Einladungen verwalten'],
  ['MANAGE_CHANNELS', 'Kanäle verwalten', 'Kanäle erstellen, bearbeiten, sortieren und löschen'],
  ['MANAGE_ROLES', 'Rollen verwalten', 'Rollen unter der eigenen höchsten Rolle erstellen, bearbeiten und vergeben'],
  ['KICK', 'Mitglieder entfernen', 'Mitglieder mit niedrigeren Rollen vom Server werfen'],
  ['BAN', 'Mitglieder bannen', 'Mitglieder dauerhaft vom Server ausschließen'],
  ['MANAGE_MESSAGES', 'Nachrichten verwalten', 'Nachrichten anderer löschen und Nachrichten anpinnen'],
  ['MENTION_EVERYONE', '@everyone erwähnen', 'Alle Mitglieder auf einmal benachrichtigen'],
  ['SEND', 'Nachrichten senden', 'In Textkanälen schreiben'],
  ['ATTACH', 'Dateien senden', 'Bilder, Videos und Audios hochladen'],
  ['INVITE', 'Einladungen erstellen', 'Andere Leute auf den Server einladen'],
];
const ROLE_COLORS = ['#ff4d7d', '#ff8a00', '#f5b83d', '#3ddc97', '#1abc9c', '#00b4ff', '#5b8cff', '#8b4dff', '#d89cff', '#e91e63', '#95a5a6', '#ffffff'];
$('rbAddGuild').innerHTML = I.plus;

const chKey = (g, c) => `ch:${g.id}:${c.id}`;
function gTopPos(g, u) {
  if (g.owner === u) return -1;
  const m = g.members[u]; if (!m) return Infinity;
  let best = Infinity;
  (m.roles || []).forEach((r) => { const i = g.roles.findIndex((x) => x.id === r); if (i >= 0 && i < best) best = i; });
  return best;
}
const gCanModerate = (g, target) => target !== g.owner && target !== S.me && (g.owner === S.me || gTopPos(g, S.me) < gTopPos(g, target));
const gCanManageRole = (g, roleId) => { const i = g.roles.findIndex((r) => r.id === roleId); return i >= 0 && (g.owner === S.me || gTopPos(g, S.me) < i); };
const anyManage = (g) => ['MANAGE_SERVER', 'MANAGE_ROLES', 'MANAGE_CHANNELS', 'KICK', 'BAN'].some((p) => gHas(g, p));
const roleChip = (r) => `<span class="rchip"><i style="background:${r.color || 'var(--muted)'}"></i>${esc(r.name)}</span>`;

/* ---------- Leiste links ---------- */
function renderRailGuilds() {
  $('railGuilds').innerHTML = S.guilds.map((g) => {
    const unr = g.channels.some((c) => unread[chKey(g, c)]);
    const at = g.channels.reduce((a, c) => a + (unreadAt[chKey(g, c)] || 0), 0);
    return `<button class="rb guild ${view === 'g:' + g.id ? 'on' : ''} ${unr ? 'unr' : ''}" data-gopen="${g.id}" title="${esc(g.name)}">${guildIcon(g)}${at ? `<span class="badge">${at}</span>` : ''}</button>`;
  }).join('');
}
function openGuild(id, keepChat) {
  const g = guild(id); if (!g) return;
  view = 'g:' + id;
  $('statusMenu').classList.add('hidden');
  renderRail(); renderSide();
  if (window.innerWidth > 760 && !keepChat) {
    const want = lastChan[id] && canOpen(lastChan[id]) ? lastChan[id] : g.channels[0] && chKey(g, g.channels[0]);
    if (want) openConv(want);
  } else if (window.innerWidth <= 760) closeChat(true);
}

/* ---------- Kanalliste ---------- */
function renderGuildSide() {
  const g = guild(view.slice(2));
  if (!g) { view = 'chats'; return renderSide(); }
  $('sideTitle').innerHTML = `<button class="gtitle" id="gMenuBtn">${guildIcon(g, 's')}<span>${esc(g.name)}</span>${GI.chevron}</button>`;
  $('sideBtns').innerHTML = gHas(g, 'INVITE') ? `<button class="ibtn" data-ginvite="${g.id}" title="Leute einladen">${GI.invite}</button>` : '';
  const manage = gHas(g, 'MANAGE_CHANNELS');
  const online = Object.keys(g.members).filter(isOn).length;
  $('list').innerHTML = `<div class="ginfo"><span class="sdot s-online"></span>${online} online · ${Object.keys(g.members).length} Mitglieder</div>
    <div class="section label chhead">Textkanäle${manage ? `<button class="ibtn sm" data-chcreate="${g.id}" title="Kanal erstellen">${I.plus}</button>` : ''}</div>`
    + g.channels.map((c) => {
      const k = chKey(g, c), n = unread[k] || 0, at = unreadAt[k] || 0;
      const locked = c.sendRoles && c.sendRoles.length;
      return `<div class="item chan ${k === current ? 'on' : ''} ${n ? 'unread' : ''}" data-conv="${k}"><span class="chhash">${locked ? GI.lock : I.hash}</span><b>${esc(c.name)}</b>${at ? `<span class="badge at">@${at}</span>` : ''}${manage ? `<button class="ibtn sm chedit" data-chedit="${c.id}" title="Kanal bearbeiten">${I.gear}</button>` : ''}</div>`;
    }).join('');
}

/* ---------- Mitgliederliste ---------- */
function guildMembersHtml(g) {
  if (!g) return '';
  const mem = Object.keys(g.members);
  const groups = [];
  const used = new Set();
  g.roles.filter((r) => r.hoist).forEach((r) => {
    const list = mem.filter((u) => !used.has(u) && isOn(u) && (g.members[u].roles || []).includes(r.id));
    list.forEach((u) => used.add(u));
    if (list.length) groups.push([r.name, list, r.color]);
  });
  const onl = mem.filter((u) => !used.has(u) && isOn(u)), off = mem.filter((u) => !isOn(u));
  if (onl.length) groups.push(['Online', onl]);
  if (off.length) groups.push(['Offline', off]);
  const row = (u) => { const c = roleColor(g, u); return `<div class="item mem ${isOn(u) ? '' : 'offl'}" data-profile="${esc(u)}">${avatar(u, '', true)}<div class="ic"><div class="ir"><b${c ? ` style="color:${c}"` : ''}>${esc(dn(u))}</b>${g.owner === u ? `<span class="crown" title="Server-Besitzer">${I.crown}</span>` : ''}${badgeHtml(u, true)}</div>${P(u).customStatus ? `<div class="ir"><span class="pv">${esc(P(u).customStatus)}</span></div>` : ''}</div></div>`; };
  return `<div class="gpanelhead">${guildIcon(g, 'm')}<div><b>${esc(g.name)}</b><div class="pc-user">${mem.length} Mitglieder</div></div></div>`
    + groups.map(([t, list, color]) => `<div class="section label"${color ? ` style="color:${color}"` : ''}>${esc(t)} — ${list.length}</div>` + list.sort((a, b) => dn(a).localeCompare(dn(b))).map(row).join('')).join('');
}

/* ---------- Profil im Server ---------- */
function guildProfileHtml(g, u) {
  if (!g || !g.members[u]) return '';
  const roles = g.roles.filter((r) => (g.members[u].roles || []).includes(r.id));
  const canRoles = gHas(g, 'MANAGE_ROLES') && (u === S.me || gCanModerate(g, u) || g.owner === S.me);
  const kick = gHas(g, 'KICK') && gCanModerate(g, u), ban = gHas(g, 'BAN') && gCanModerate(g, u);
  return `<div class="pc-sec gprof"><div class="label">Rollen auf ${esc(g.name)}</div><div class="rchips">${roles.length ? roles.map(roleChip).join('') : '<span class="muted" style="font-size:14px">Keine Rollen</span>'}${g.owner === u ? `<span class="rchip own">${I.crown} Besitzer</span>` : ''}</div>
    ${canRoles || kick || ban ? `<div class="pbtns ${kick || ban ? 'row2' : ''}">${canRoles ? `<button class="btn small ghost" data-memedit="${esc(u)}" data-g="${g.id}">Rollen bearbeiten</button>` : ''}${kick ? `<button class="btn small danger" data-memkick="${esc(u)}" data-g="${g.id}">Entfernen</button>` : ''}${ban ? `<button class="btn small danger" data-memban="${esc(u)}" data-g="${g.id}">Bannen</button>` : ''}</div>` : ''}</div>`;
}

/* ---------- Server-Menü ---------- */
function toggleGuildMenu() {
  const m = $('guildMenu');
  if (!m.classList.contains('hidden')) return m.classList.add('hidden');
  const g = guild(view.slice(2)); if (!g) return;
  const r = $('gMenuBtn').getBoundingClientRect();
  m.style.left = r.left + 'px'; m.style.top = r.bottom + 6 + 'px'; m.style.width = Math.max(240, r.width) + 'px';
  m.innerHTML = `<div class="opts">
    ${gHas(g, 'INVITE') ? `<button class="opt accent" data-ginvite="${g.id}">${GI.invite}<div><b>Leute einladen</b></div></button>` : ''}
    ${anyManage(g) ? `<button class="opt" data-gsettings="${g.id}">${I.gear}<div><b>Servereinstellungen</b></div></button>` : ''}
    ${gHas(g, 'MANAGE_CHANNELS') ? `<button class="opt" data-chcreate="${g.id}">${I.plus}<div><b>Kanal erstellen</b></div></button>` : ''}
    <button class="opt" data-gmembers>${I.users}<div><b>Mitglieder anzeigen</b></div></button>
    ${g.owner !== S.me ? `<button class="opt danger" data-gleaveguild="${g.id}">${I.logout}<div><b>Server verlassen</b></div></button>` : ''}
  </div>`;
  m.classList.remove('hidden');
}
document.addEventListener('mousedown', (e) => { if (!$('guildMenu').classList.contains('hidden') && !e.target.closest('#guildMenu') && !e.target.closest('#gMenuBtn')) $('guildMenu').classList.add('hidden'); });

/* ---------- Erstellen / Beitreten ---------- */
let gNewIcon = null;
function openAddGuild(tab = 'create', code = '') {
  openModal(`${mHead('Server')}<div class="mbody">
    <div class="tabs gtabs"><button class="${tab === 'create' ? 'on' : ''}" data-gaddtab="create">Erstellen</button><button class="${tab === 'join' ? 'on' : ''}" data-gaddtab="join">Beitreten</button></div>
    ${tab === 'create' ? `<p class="muted" style="font-size:14px;margin-bottom:14px">Dein Server ist der Ort, an dem du mit deinen Freunden oder deiner Community abhängst – mit Kanälen, Rollen und Berechtigungen.</p>
      <div class="gimg"><span data-gnewicon title="Serverbild wählen" class="editicon"><div class="av grp gicon l">${gNewIcon ? `<img src="${gNewIcon.url}" alt="">` : '📷'}</div></span><div style="flex:1"><div class="field" style="margin:0"><span class="label">Servername</span><input class="input" id="gNewName" maxlength="40" placeholder="z. B. ${esc(dn(S.me))}s Server"></div></div></div>
      <button class="btn block" id="gCreateBtn">Server erstellen</button>`
    : `<p class="muted" style="font-size:14px;margin-bottom:14px">Gib einen Einladungslink oder Code ein, den du bekommen hast.</p>
      <div class="field"><span class="label">Einladungslink oder Code</span><input class="input" id="gJoinCode" placeholder="${location.origin}/invite/AbC123xy" value="${esc(code)}"></div>
      <div id="gJoinPrev"></div>
      <button class="btn block" id="gJoinBtn">Server beitreten</button>`}
  </div>`);
  if (tab === 'create') {
    $('gCreateBtn').onclick = async () => {
      const name = $('gNewName').value.trim();
      if (!name) { $('gNewName').focus(); return toast('Gib dem Server einen Namen.'); }
      $('gCreateBtn').disabled = true;
      let icon = null;
      if (gNewIcon) { try { icon = (await upload(gNewIcon.blob, 'server')).id; } catch {} }
      socket.emit('guild:create', { name, icon }, (r) => {
        if (r.error) { $('gCreateBtn').disabled = false; return toast(r.error); }
        gNewIcon = null; closeModal(); toast(`Server „${name}“ erstellt 🎉`);
        setTimeout(() => openGuild(r.id), 200);
      });
    };
  } else {
    const prev = () => { const c = $('gJoinCode').value.trim(); if (!c) return ($('gJoinPrev').innerHTML = ''); socket.emit('invite:info', c, (r) => { if (!$('gJoinPrev')) return; $('gJoinPrev').innerHTML = r.error ? `<p class="err">${esc(r.error)}</p>` : `<div class="invprev">${guildIcon(r, 'm')}<div><b>${esc(r.name)}</b><div class="pc-user"><span class="sdot s-online"></span>${r.online} online · ${r.members} Mitglieder</div></div></div>`; }); };
    let t; $('gJoinCode').oninput = () => { clearTimeout(t); t = setTimeout(prev, 300); };
    if (code) prev();
    $('gJoinBtn').onclick = () => socket.emit('invite:join', $('gJoinCode').value, (r) => { if (r.error) return toast(r.error); closeModal(); toast('Willkommen auf dem Server! 👋'); setTimeout(() => openGuild(r.id), 250); });
  }
}
function openInvite(gid) {
  socket.emit('invite:create', gid, (r) => {
    if (r.error) return toast(r.error);
    const link = `${location.origin}/invite/${r.code}`;
    const g = guild(gid);
    openModal(`${mHead('Leute einladen')}<div class="mbody">
      <p class="muted" style="font-size:14px;margin-bottom:12px">Schick diesen Link an deine Freunde, damit sie <b>${esc(g.name)}</b> beitreten können.</p>
      <div class="copyrow"><input class="input" readonly value="${esc(link)}" id="invLink"><button class="btn" id="invCopy">Kopieren</button></div>
      <p class="muted" style="font-size:13px;margin-top:10px">Code: <b>${esc(r.code)}</b> – kann auch unter „Server beitreten“ eingegeben werden.</p>
      ${S.friends.length ? `<div class="label" style="margin:16px 0 8px">Direkt an Freunde schicken</div><div class="picklist" style="margin-top:0">${S.friends.filter((f) => !g.members[f]).map((f) => `<div class="pick"><span>${avatar(f, 's', true)}</span><b>${esc(dn(f))}</b><button class="btn small" data-invsend="${esc(f)}" data-link="${esc(link)}">Senden</button></div>`).join('') || '<p class="muted" style="font-size:14px;padding:0 10px">Alle deine Freunde sind schon auf dem Server.</p>'}</div>` : ''}
    </div>`);
    $('invCopy').onclick = async () => { try { await navigator.clipboard.writeText(link); toast('Link kopiert 🔗'); } catch { $('invLink').select(); toast('Markiert – jetzt mit Strg + C kopieren'); } };
  });
}

/* ---------- Kanal erstellen / bearbeiten ---------- */
function openChannelModal(gid, cid) {
  const g = guild(gid); if (!g) return;
  const c = cid ? g.channels.find((x) => x.id === cid) : null;
  const sr = new Set((c && c.sendRoles) || []);
  openModal(`${mHead(c ? 'Kanal bearbeiten' : 'Kanal erstellen')}<div class="mbody">
    <div class="field"><span class="label">Kanalname</span><div class="hashin">${I.hash}<input class="input" id="chName" maxlength="30" placeholder="neuer-kanal" value="${esc(c ? c.name : '')}"></div></div>
    <div class="field"><span class="label">Thema (optional)</span><input class="input" id="chTopic" maxlength="120" placeholder="Worum geht es in diesem Kanal?" value="${esc(c ? c.topic || '' : '')}"></div>
    ${c ? `<div class="label" style="margin:6px 0 8px">Wer darf hier schreiben?</div>
      <label class="reason"><input type="radio" name="chw" value="all" ${!sr.size ? 'checked' : ''}><span>Alle mit der Berechtigung „Nachrichten senden“</span></label>
      <label class="reason"><input type="radio" name="chw" value="roles" ${sr.size ? 'checked' : ''}><span>Nur bestimmte Rollen (z. B. für Ankündigungen)</span></label>
      <div class="rolepick ${sr.size ? '' : 'hidden'}" id="chRoles">${g.roles.length ? g.roles.map((r) => `<label class="pick ${sr.has(r.id) ? 'on' : ''}"><input type="checkbox" value="${r.id}" ${sr.has(r.id) ? 'checked' : ''} hidden>${roleChip(r)}<span class="check">${I.check}</span></label>`).join('') : '<p class="muted" style="font-size:14px">Erstelle zuerst Rollen in den Servereinstellungen.</p>'}</div>
      <div class="pbtns row2"><button class="btn ghost" data-chmove="up">${GI.up} Nach oben</button><button class="btn ghost" data-chmove="down">${GI.down} Nach unten</button></div>` : ''}
    <div class="pbtns"><button class="btn" id="chSave">${c ? 'Speichern' : 'Kanal erstellen'}</button></div>
    ${c ? `<div class="pbtns"><button class="btn danger" id="chDel">${I.trash} Kanal löschen</button></div>` : ''}
  </div>`);
  if (c) {
    document.querySelectorAll('input[name=chw]').forEach((r) => r.onchange = () => $('chRoles').classList.toggle('hidden', document.querySelector('input[name=chw]:checked').value !== 'roles'));
    document.querySelectorAll('#chRoles .pick').forEach((l) => l.onclick = (e) => { e.preventDefault(); const cb = l.querySelector('input'); cb.checked = !cb.checked; l.classList.toggle('on', cb.checked); });
    document.querySelectorAll('[data-chmove]').forEach((b) => b.onclick = () => socket.emit('channel:update', { id: gid, channel: cid, move: b.dataset.chmove }, (r) => r.error && toast(r.error)));
    $('chDel').onclick = () => { if (confirm(`#${c.name} wirklich löschen? Alle Nachrichten darin gehen verloren.`)) socket.emit('channel:delete', { id: gid, channel: cid }, (r) => { if (r.error) return toast(r.error); closeModal(); toast('Kanal gelöscht'); }); };
  }
  $('chSave').onclick = () => {
    const name = $('chName').value, topic = $('chTopic').value;
    if (!c) return socket.emit('channel:create', { id: gid, name, topic }, (r) => { if (r.error) return toast(r.error); closeModal(); setTimeout(() => openConv(`ch:${gid}:${r.channel}`), 200); });
    const roles = document.querySelector('input[name=chw]:checked').value === 'roles' ? [...document.querySelectorAll('#chRoles input:checked')].map((x) => x.value) : [];
    socket.emit('channel:update', { id: gid, channel: cid, name, topic, sendRoles: roles }, (r) => { if (r.error) return toast(r.error); closeModal(); toast('Kanal gespeichert'); });
  };
}

/* ---------- Servereinstellungen ---------- */
let gsTab = 'overview', gsRole = null, gsMember = null, gsIcon;
function openGuildSettings(gid, tab) {
  const g = guild(gid); if (!g) return;
  const tabs = [['overview', 'Übersicht', 'MANAGE_SERVER'], ['roles', 'Rollen', 'MANAGE_ROLES'], ['members', 'Mitglieder', null], ['invites', 'Einladungen', 'MANAGE_SERVER'], ['bans', 'Banns', 'BAN']].filter((t) => !t[2] || gHas(g, t[2]));
  if (tab) gsTab = tab;
  if (!tabs.some((t) => t[0] === gsTab)) gsTab = tabs[0][0];
  let body = '';
  if (gsTab === 'overview') {
    body = `<div class="gimg"><span data-gseticon="${g.id}" title="Serverbild ändern" class="editicon">${guildIcon(g, 'l')}</span><div style="flex:1"><div class="field" style="margin:0"><span class="label">Servername</span><div style="display:flex;gap:8px"><input class="input" id="gsName" maxlength="40" value="${esc(g.name)}"><button class="btn small" id="gsNameSave">Speichern</button></div></div></div></div>
      ${g.icon ? `<div class="pbtns"><button class="btn small ghost" id="gsIconRm">Serverbild entfernen</button></div>` : ''}
      <div class="pc-sec"><div class="label">Info</div><p class="muted" style="font-size:14px">Erstellt am ${new Date(g.created).toLocaleDateString('de-DE')} · ${Object.keys(g.members).length} Mitglieder · ${g.channels.length} Kanäle · ${g.roles.length} Rollen</p></div>
      ${g.owner === S.me ? `<div class="pc-sec"><div class="label" style="color:var(--red)">Gefahrenzone</div><div class="pbtns"><button class="btn danger" id="gsDelete">${I.trash} Server löschen</button></div></div>` : ''}`;
  } else if (gsTab === 'roles') {
    const sel = gsRole === 'everyone' ? null : g.roles.find((r) => r.id === gsRole);
    if (gsRole !== 'everyone' && !sel) gsRole = g.roles[0] ? g.roles[0].id : 'everyone';
    const r = gsRole === 'everyone' ? null : g.roles.find((x) => x.id === gsRole);
    const editable = gsRole === 'everyone' ? gHas(g, 'MANAGE_ROLES') : gCanManageRole(g, gsRole);
    const perms = gsRole === 'everyone' ? (g.everyone || []) : r.perms;
    const mine = g.myPerms || [];
    body = `<div class="rolesgrid"><div class="rolelist">
      <button class="btn small block" id="roleNew">${I.plus} Neue Rolle</button>
      ${g.roles.map((x) => `<button class="roleitem ${gsRole === x.id ? 'on' : ''}" data-gsrole="${x.id}"><i style="background:${x.color || 'var(--muted)'}"></i><span>${esc(x.name)}</span><small>${Object.values(g.members).filter((m) => (m.roles || []).includes(x.id)).length}</small></button>`).join('')}
      <button class="roleitem ${gsRole === 'everyone' ? 'on' : ''}" data-gsrole="everyone"><i style="background:var(--muted)"></i><span>@everyone</span></button>
      <p class="muted" style="font-size:12px;margin-top:8px">Rollen weiter oben stehen über den Rollen darunter.</p>
    </div><div class="roleedit">
      ${r ? `<div class="field"><span class="label">Rollenname</span><input class="input" id="roleName" maxlength="30" value="${esc(r.name)}" ${editable ? '' : 'disabled'}></div>
        <div class="field"><span class="label">Farbe</span><div class="colors">${ROLE_COLORS.map((c) => `<button class="cdot ${r.color === c ? 'on' : ''}" style="background:${c}" data-rolecolor="${c}" ${editable ? '' : 'disabled'}></button>`).join('')}<label class="cdot custom" title="Eigene Farbe"><input type="color" id="roleColorCustom" value="${r.color || '#8b4dff'}" ${editable ? '' : 'disabled'}>🎨</label><button class="cdot none ${!r.color ? 'on' : ''}" data-rolecolor="" title="Keine Farbe" ${editable ? '' : 'disabled'}>✕</button></div></div>
        <div class="toggle ${r.hoist ? 'on' : ''}" data-rolehoist><div><b>Mitglieder separat anzeigen</b><small>In der Mitgliederliste eine eigene Gruppe für diese Rolle anzeigen</small></div><span class="sw"></span></div>
        ${editable ? `<div class="pbtns row2"><button class="btn small ghost" data-rolemove="up">${GI.up} Höher</button><button class="btn small ghost" data-rolemove="down">${GI.down} Tiefer</button></div>` : ''}`
      : `<p class="muted" style="font-size:14px;margin-bottom:12px"><b>@everyone</b> sind die Standard-Berechtigungen für alle Mitglieder des Servers.</p>`}
      <div class="label" style="margin:16px 0 8px">Berechtigungen</div>
      ${PERM_INFO.filter(([k]) => !(gsRole === 'everyone' && k === 'ADMIN')).map(([k, t, d]) => { const lockd = !editable || (g.owner !== S.me && !mine.includes(k)); return `<div class="toggle perm ${perms.includes(k) ? 'on' : ''} ${lockd ? 'locked' : ''}" data-perm="${k}"><div><b>${t}</b><small>${d}</small></div><span class="sw"></span></div>`; }).join('')}
      ${r && editable ? `<div class="pbtns"><button class="btn danger" id="roleDel">${I.trash} Rolle löschen</button></div>` : ''}
      ${!editable ? `<p class="muted" style="font-size:13px;margin-top:10px">🔒 Diese Rolle steht über oder auf gleicher Höhe wie deine höchste Rolle.</p>` : ''}
    </div></div>`;
  } else if (gsTab === 'members') {
    const q = (($('gsMemQ') || {}).value || '').toLowerCase();
    const mem = Object.keys(g.members).filter((u) => !q || (u + dn(u)).toLowerCase().includes(q)).sort((a, b) => (b === g.owner) - (a === g.owner) || gTopPos(g, a) - gTopPos(g, b) || dn(a).localeCompare(dn(b)));
    body = `<div class="searchbox" style="margin:0 0 10px">${I.search}<input class="input" id="gsMemQ" placeholder="Mitglieder suchen" value="${esc(q)}"></div>
      ${mem.map((u) => { const roles = g.roles.filter((r) => (g.members[u].roles || []).includes(r.id)); const can = gHas(g, 'MANAGE_ROLES') && (g.owner === S.me || gCanModerate(g, u) || u === S.me); return `<div class="memrow">${avatar(u, 's', true)}<div class="ic"><div class="ir"><b style="${roleColor(g, u) ? 'color:' + roleColor(g, u) : ''}">${esc(dn(u))}</b>${g.owner === u ? `<span class="crown">${I.crown}</span>` : ''}</div><div class="rchips">${roles.map(roleChip).join('')}</div></div>
        <div class="acts2">${can ? `<button class="ibtn" data-memedit="${esc(u)}" data-g="${g.id}" title="Rollen">${I.edit}</button>` : ''}${gHas(g, 'KICK') && gCanModerate(g, u) ? `<button class="ibtn" data-memkick="${esc(u)}" data-g="${g.id}" title="Entfernen">${I.logout}</button>` : ''}${gHas(g, 'BAN') && gCanModerate(g, u) ? `<button class="ibtn danger" data-memban="${esc(u)}" data-g="${g.id}" title="Bannen">${I.block}</button>` : ''}</div></div>`; }).join('')}`;
  } else if (gsTab === 'invites') {
    body = g.invites.length ? g.invites.map((i) => `<div class="memrow">${avatar(i.by, 's')}<div class="ic"><div class="ir"><b>${esc(i.code)}</b></div><div class="ir"><span class="pv">von ${esc(dn(i.by))} · ${i.uses}× benutzt · ${fmtShort(i.at)}</span></div></div><button class="ibtn" data-invdel="${esc(i.code)}" data-g="${g.id}" title="Löschen">${I.trash}</button></div>`).join('') : `<div class="emptylist">Noch keine Einladungen.<br><button class="btn small" data-ginvite="${g.id}">Einladung erstellen</button></div>`;
  } else if (gsTab === 'bans') {
    body = g.bans.length ? g.bans.map((b) => `<div class="memrow">${avatar(b.user, 's')}<div class="ic"><div class="ir"><b>${esc(dn(b.user))}</b></div><div class="ir"><span class="pv">${esc(b.reason || 'Kein Grund angegeben')} · ${fmtShort(b.at)}</span></div></div><button class="btn small ghost" data-unbanmem="${esc(b.user)}" data-g="${g.id}">Ban aufheben</button></div>`).join('') : `<div class="emptylist">🔨<br>Niemand ist gebannt.</div>`;
  }
  openModal(`${mHead(esc(g.name) + ' · Einstellungen')}<div class="stabs">${tabs.map(([k, t]) => `<button class="${gsTab === k ? 'on' : ''}" data-gstab="${k}" data-g="${g.id}">${t}</button>`).join('')}</div><div class="mbody">${body}</div>`, true);
  // Ereignisse
  if (gsTab === 'overview') {
    if ($('gsNameSave')) $('gsNameSave').onclick = () => socket.emit('guild:update', { id: g.id, name: $('gsName').value }, (r) => toast(r.error || 'Gespeichert'));
    if ($('gsIconRm')) $('gsIconRm').onclick = () => socket.emit('guild:update', { id: g.id, icon: null }, (r) => { toast(r.error || 'Serverbild entfernt'); setTimeout(() => openGuildSettings(g.id), 200); });
    if ($('gsDelete')) $('gsDelete').onclick = () => {
      const n = prompt(`Zum Löschen den Servernamen eingeben: ${g.name}`);
      if (n === null) return;
      if (n.trim() !== g.name) return toast('Der Name stimmt nicht überein.');
      socket.emit('guild:delete', g.id, (r) => { if (r.error) return toast(r.error); closeModal(); view = 'chats'; closeChat(); renderRail(); toast('Server gelöscht'); });
    };
  }
  if (gsTab === 'roles') {
    $('roleNew').onclick = () => socket.emit('role:create', { id: g.id, name: 'Neue Rolle' }, (r) => { if (r.error) return toast(r.error); gsRole = r.role; setTimeout(() => openGuildSettings(g.id), 150); });
    const upd = (d) => socket.emit(gsRole === 'everyone' ? 'guild:update' : 'role:update', gsRole === 'everyone' ? { id: g.id, ...d } : { id: g.id, role: gsRole, ...d }, (r) => { if (r.error) toast(r.error); setTimeout(() => !$('modal').classList.contains('hidden') && openGuildSettings(g.id), 150); });
    if ($('roleName')) { $('roleName').onchange = () => upd({ name: $('roleName').value }); $('roleName').onkeydown = (e) => e.key === 'Enter' && $('roleName').blur(); }
    if ($('roleColorCustom')) $('roleColorCustom').onchange = () => upd({ color: $('roleColorCustom').value });
    document.querySelectorAll('[data-rolecolor]').forEach((b) => b.onclick = () => upd({ color: b.dataset.rolecolor || null }));
    const hz = document.querySelector('[data-rolehoist]'); if (hz) hz.onclick = () => upd({ hoist: !hz.classList.contains('on') });
    document.querySelectorAll('[data-rolemove]').forEach((b) => b.onclick = () => upd({ move: b.dataset.rolemove }));
    document.querySelectorAll('[data-perm]').forEach((el) => el.onclick = () => {
      if (el.classList.contains('locked')) return toast('Diese Berechtigung kannst du nicht ändern.');
      const k = el.dataset.perm;
      const cur = gsRole === 'everyone' ? [...(g.everyone || [])] : [...g.roles.find((x) => x.id === gsRole).perms];
      const next = cur.includes(k) ? cur.filter((p) => p !== k) : [...cur, k];
      if (k === 'ADMIN' && !cur.includes(k) && !confirm('Administrator gibt ALLE Rechte. Wirklich aktivieren?')) return;
      upd(gsRole === 'everyone' ? { everyone: next } : { perms: next });
    });
    if ($('roleDel')) $('roleDel').onclick = () => { if (confirm('Rolle wirklich löschen?')) socket.emit('role:delete', { id: g.id, role: gsRole }, (r) => { if (r.error) return toast(r.error); gsRole = null; setTimeout(() => openGuildSettings(g.id), 150); }); };
  }
  if (gsTab === 'members') { const s = $('gsMemQ'); s.oninput = () => { const pos = s.selectionStart; openGuildSettings(g.id); const n = $('gsMemQ'); n.focus(); n.setSelectionRange(pos, pos); }; }
}
function openMemberRoles(gid, u) {
  const g = guild(gid); if (!g) return;
  const has = new Set(g.members[u].roles || []);
  openModal(`${mHead('Rollen von ' + esc(dn(u)))}<div class="mbody">
    <div class="rolepick">${g.roles.length ? g.roles.map((r) => { const can = gCanManageRole(g, r.id); return `<label class="pick ${has.has(r.id) ? 'on' : ''} ${can ? '' : 'locked'}"><input type="checkbox" value="${r.id}" ${has.has(r.id) ? 'checked' : ''} ${can ? '' : 'disabled'} hidden>${roleChip(r)}<span class="check">${I.check}</span></label>`; }).join('') : '<p class="muted">Dieser Server hat noch keine Rollen.</p>'}</div>
    <div class="pbtns"><button class="btn" id="mrSave">Speichern</button></div></div>`);
  document.querySelectorAll('.rolepick .pick').forEach((l) => l.onclick = (e) => { e.preventDefault(); const cb = l.querySelector('input'); if (cb.disabled) return toast('Diese Rolle steht über deiner höchsten Rolle.'); cb.checked = !cb.checked; l.classList.toggle('on', cb.checked); });
  $('mrSave').onclick = () => socket.emit('member:roles', { id: gid, user: u, roles: [...document.querySelectorAll('.rolepick input:checked')].map((x) => x.value) }, (r) => { if (r.error) return toast(r.error); closeModal(); toast('Rollen gespeichert'); });
}

/* ---------- Klicks ---------- */
document.addEventListener('click', async (e) => {
  const t = e.target.closest('[data-gopen],#gMenuBtn,[data-ginvite],[data-gsettings],[data-chcreate],[data-chedit],[data-gmembers],[data-gleaveguild],[data-gaddtab],[data-gnewicon],[data-gstab],[data-gsrole],[data-memedit],[data-memkick],[data-memban],[data-unbanmem],[data-invdel],[data-invsend],[data-gseticon],#rbAddGuild');
  if (!t) return;
  const d = t.dataset;
  if (t.id === 'rbAddGuild') return openAddGuild('create');
  if (t.id === 'gMenuBtn') return toggleGuildMenu();
  $('guildMenu').classList.add('hidden');
  if ('gopen' in d) return openGuild(d.gopen);
  if ('ginvite' in d) return openInvite(d.ginvite);
  if ('gsettings' in d) { gsTab = 'overview'; return openGuildSettings(d.gsettings); }
  if ('chcreate' in d) { e.stopPropagation(); return openChannelModal(d.chcreate); }
  if ('chedit' in d) { e.stopPropagation(); return openChannelModal(view.slice(2), d.chedit); }
  if ('gmembers' in d) { const g = guild(view.slice(2)); if (g && !isChan(current)) openConv(chKey(g, g.channels[0])); setTimeout(() => { if (panelMode !== 'info') togglePanel('info'); }, 50); return; }
  if ('gleaveguild' in d) { const g = guild(d.gleaveguild); if (confirm(`„${g.name}“ wirklich verlassen?`)) socket.emit('guild:leave', d.gleaveguild, (r) => { if (r.error) return toast(r.error); view = 'chats'; closeChat(); renderRail(); toast('Server verlassen'); }); return; }
  if ('gaddtab' in d) return openAddGuild(d.gaddtab);
  if ('gnewicon' in d) { const name = ($('gNewName') || {}).value || ''; gNewIcon = await pickImage(256, 256); openAddGuild('create'); $('gNewName').value = name; return; }
  if ('gseticon' in d) { const img = await pickImage(256, 256); try { const up = await upload(img.blob, 'server'); socket.emit('guild:update', { id: d.gseticon, icon: up.id }, (r) => { toast(r.error || 'Serverbild geändert'); setTimeout(() => openGuildSettings(d.gseticon), 200); }); } catch (er) { toast('Upload fehlgeschlagen', er.message); } return; }
  if ('gstab' in d) { gsTab = d.gstab; return openGuildSettings(d.g); }
  if ('gsrole' in d) { gsRole = d.gsrole; return openGuildSettings(view.slice(2)); }
  if ('memedit' in d) { e.stopPropagation(); return openMemberRoles(d.g, d.memedit); }
  if ('memkick' in d) { e.stopPropagation(); if (confirm(`${dn(d.memkick)} vom Server entfernen?`)) socket.emit('member:kick', { id: d.g, user: d.memkick }, (r) => { toast(r.error || `${dn(d.memkick)} wurde entfernt`); if (!r.error) closeModal(); }); return; }
  if ('memban' in d) { e.stopPropagation(); const reason = prompt(`${dn(d.memban)} bannen? Grund (optional):`); if (reason === null) return; socket.emit('member:ban', { id: d.g, user: d.memban, reason }, (r) => { toast(r.error || `${dn(d.memban)} wurde gebannt 🔨`); if (!r.error) closeModal(); }); return; }
  if ('unbanmem' in d) return socket.emit('member:unban', { id: d.g, user: d.unbanmem }, (r) => { toast(r.error || 'Ban aufgehoben'); setTimeout(() => openGuildSettings(d.g), 150); });
  if ('invdel' in d) return socket.emit('invite:delete', { id: d.g, code: d.invdel }, (r) => { toast(r.error || 'Einladung gelöscht'); setTimeout(() => openGuildSettings(d.g), 150); });
  if ('invsend' in d) { socket.emit('message', { conv: dmId(S.me, d.invsend), text: `Komm auf meinen Server! 👉 ${d.link}` }, (r) => { if (r && r.error) return toast(r.error); t.disabled = true; t.textContent = 'Gesendet ✓'; }); return; }
});

// Einladungslinks in Nachrichten direkt öffnen
document.addEventListener('click', (e) => {
  const a = e.target.closest('a[href*="/invite/"]');
  if (!a) return;
  try { const u = new URL(a.href); if (u.origin !== location.origin) return; } catch { return; }
  e.preventDefault();
  openAddGuild('join', a.href);
});
