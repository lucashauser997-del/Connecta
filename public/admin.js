/* =========================================================
   Connecta – Developer Dashboard (nur für den Owner)
   ========================================================= */
$('rbAdmin').innerHTML = I.shield;
let adTab = 'overview', adOpenReports = 0, adUsers = [], adReportsFilter = 'open', bcTargets = [], bcImg = null;
const REASON_TXT = { spam: 'Spam / Werbung', harassment: 'Belästigung', inappropriate: 'Unangemessen', scam: 'Betrug / Fake', other: 'Sonstiges' };
const DURATIONS = [['3600000', '1 Stunde'], ['86400000', '24 Stunden'], ['604800000', '7 Tage'], ['2592000000', '30 Tage']];
const emitP = (ev, data) => new Promise((res) => (data === undefined ? socket.emit(ev, res) : socket.emit(ev, data, res)));

function setupAdmin() {
  socket.on('admin:report', (r) => {
    adOpenReports++; adminBadge();
    toast('🛡️ Neue Meldung', `${dn(r.by)} hat ${dn(r.user)} gemeldet (${REASON_TXT[r.reason] || r.reason})`, () => openAdmin('reports'));
  });
  socket.on('state', () => { if (S.isOwner && !setupAdmin.loaded) { setupAdmin.loaded = true; emitP('admin:stats').then((s) => { if (s && !s.error) { adOpenReports = s.reports; adminBadge(); } }); } });
}
function adminBadge() { $('rbAdmin').innerHTML = I.shield + (adOpenReports ? `<span class="badge">${adOpenReports}</span>` : ''); }

async function openAdmin(tab) {
  if (!S.isOwner) return;
  if (tab) adTab = tab;
  const tabs = [['overview', '📊 Übersicht'], ['users', '👥 Nutzer'], ['reports', `🛡️ Meldungen${adOpenReports ? ` (${adOpenReports})` : ''}`], ['broadcast', '📢 Mitteilung senden'], ['config', '⚙️ Einstellungen']];
  const shell = (body) => openModal(`${mHead(`${I.shield} Developer Dashboard`)}<div class="dashwrap"><nav class="dashnav">${tabs.map(([k, t]) => `<button class="${adTab === k ? 'on' : ''}" data-dashtab="${k}">${t}</button>`).join('')}</nav><div class="dashbody" id="dashBody">${body}</div></div>`, 'xwide');
  shell('<div class="emptylist">Lade…</div>');
  if (adTab === 'overview') return renderAdOverview();
  if (adTab === 'users') return renderAdUsers();
  if (adTab === 'reports') return renderAdReports();
  if (adTab === 'broadcast') return renderAdBroadcast();
  if (adTab === 'config') return renderAdConfig();
}
const dashBody = (h) => { if ($('dashBody')) $('dashBody').innerHTML = h; };

async function renderAdOverview() {
  const s = await emitP('admin:stats');
  if (s.error) return dashBody(`<p class="err">${esc(s.error)}</p>`);
  adOpenReports = s.reports; adminBadge();
  const card = (n, t, e, tab) => `<div class="stat" ${tab ? `data-dashtab="${tab}"` : ''}><span>${e}</span><b>${n.toLocaleString('de-DE')}</b><small>${t}</small></div>`;
  dashBody(`<h3 class="dashh">Willkommen zurück, ${esc(dn(S.me))} 👋</h3>
    <div class="stats">
      ${card(s.users, 'Nutzer insgesamt', '👥', 'users')}${card(s.online, 'Gerade online', '🟢', 'users')}${card(s.newToday, 'Neu (24 Std.)', '✨', 'users')}${card(s.activeToday, 'Aktiv (24 Std.)', '⚡')}
      ${card(s.messages, 'Nachrichten', '💬')}${card(s.messagesToday, 'Nachrichten (24 Std.)', '📨')}${card(s.groups, 'Gruppen', '👪')}${card(s.guilds, 'Server', '🏰')}
      ${card(s.stories, 'Aktive Storys', '📸')}${card(s.reports, 'Offene Meldungen', '🛡️', 'reports')}${card(s.banned, 'Gesperrte Konten', '🔨', 'users')}
    </div>
    <div class="dashinfo"><div><b>Speicher:</b> ${esc(s.storage)}</div><div><b>Max. Gruppengröße:</b> ${s.config.maxGroup} Personen</div><div><b>Registrierung:</b> ${s.config.registrationOpen ? '✅ offen' : '⛔ geschlossen'}</div></div>
    <div class="pbtns row2"><button class="btn" data-dashtab="broadcast">📢 Mitteilung an alle senden</button><button class="btn ghost" data-dashtab="reports">🛡️ Meldungen ansehen</button></div>`);
}

async function renderAdUsers(q = (($('dashQ') || {}).value || '')) {
  adUsers = await emitP('admin:users', { q });
  if (adUsers.error) return dashBody(`<p class="err">${esc(adUsers.error)}</p>`);
  const row = (u) => {
    const ban = u.ban ? (u.ban.until ? `⏳ gesperrt bis ${new Date(u.ban.until).toLocaleString('de-DE', { dateStyle: 'short', timeStyle: 'short' })}` : '🔨 gebannt') : '';
    const me = u.username === S.me;
    return `<div class="dashuser ${u.ban ? 'banned' : ''}">
      <div class="dashu-main" data-profile="${esc(u.username)}">${avatar(u.username, 's', true)}<div class="ic"><div class="ir"><b>${esc(u.displayName || u.username)}</b>${badgeHtml(u.username, true)}${u.owner ? '<span class="tag">Owner</span>' : ''}</div><div class="ir"><span class="pv">@${esc(u.username)} · ${u.online ? '🟢 online' : 'zuletzt ' + fmtShort(u.lastSeen)}</span></div></div></div>
      <div class="dashu-meta"><span title="Registriert">📅 ${new Date(u.created).toLocaleDateString('de-DE')}</span><span title="Nachrichten">💬 ${u.messages}</span><span title="Freunde">👥 ${u.friends}</span>${u.reports ? `<span class="warn" title="Meldungen">🛡️ ${u.reports}</span>` : ''}${ban ? `<span class="warn">${ban}</span>` : ''}</div>
      ${me ? '<div class="dashu-acts"><span class="muted" style="font-size:13px">Das bist du</span></div>' : `<div class="dashu-acts">
        <button class="btn small ghost" data-dashact="logout" data-u="${esc(u.username)}" title="Auf allen Geräten abmelden">Ausloggen</button>
        ${u.ban ? `<button class="btn small" data-dashact="unban" data-u="${esc(u.username)}">Entsperren</button>` : `<button class="btn small ghost" data-dashact="suspend" data-u="${esc(u.username)}">Sperren</button><button class="btn small danger" data-dashact="ban" data-u="${esc(u.username)}">Bannen</button>`}
        <button class="btn small ghost" data-dashmsg="${esc(u.username)}" title="Offizielle Nachricht senden">📢</button>
      </div>`}
    </div>`;
  };
  const html = `<div class="dashbar"><div class="searchbox" style="margin:0;flex:1">${I.search}<input class="input" id="dashQ" placeholder="Nutzer suchen…" value="${esc(q)}"></div><span class="muted">${adUsers.length} ${adUsers.length === 1 ? 'Nutzer' : 'Nutzer'}</span></div>
    <div class="dashusers">${adUsers.map(row).join('') || '<div class="emptylist">Keine Nutzer gefunden.</div>'}</div>`;
  dashBody(html);
  adUsers.forEach((u) => { if (!S.people[u.username]) S.people[u.username] = u; });
  const inp = $('dashQ'); let t;
  inp.oninput = () => { clearTimeout(t); t = setTimeout(() => { const pos = inp.selectionStart; renderAdUsers(inp.value).then(() => { const n = $('dashQ'); if (n) { n.focus(); n.setSelectionRange(pos, pos); } }); }, 250); };
}

function adAction(action, user) {
  const name = dn(user);
  if (action === 'logout') {
    if (!confirm(`${name} auf allen Geräten abmelden?`)) return;
    return emitP('admin:action', { user, action }).then((r) => { toast(r.error || `${name} wurde abgemeldet`); });
  }
  if (action === 'unban') return emitP('admin:action', { user, action }).then((r) => { toast(r.error || `${name} ist wieder freigeschaltet`); renderAdUsers(); });
  const ban = action === 'ban';
  openModal(`${mHead(ban ? `${esc(name)} bannen` : `${esc(name)} sperren`)}<div class="mbody">
    <p class="muted" style="font-size:14px;margin-bottom:12px">${ban ? 'Das Konto wird <b>dauerhaft</b> gesperrt und sofort abgemeldet. Du kannst den Bann später wieder aufheben.' : 'Das Konto wird für die gewählte Zeit gesperrt und sofort abgemeldet.'}</p>
    ${ban ? '' : `<div class="label" style="margin-bottom:8px">Dauer</div><div class="reasons">${DURATIONS.map(([v, t], i) => `<label class="reason"><input type="radio" name="dur" value="${v}" ${i === 1 ? 'checked' : ''}><span>${t}</span></label>`).join('')}</div>`}
    <div class="field" style="margin-top:12px"><span class="label">Grund (sieht die Person)</span><input class="input" id="dashReason" maxlength="200" placeholder="z. B. Spam, Beleidigungen…"></div>
    <div class="pbtns row2"><button class="btn ghost" id="dashCancel">Abbrechen</button><button class="btn danger" id="dashGo">${ban ? '🔨 Dauerhaft bannen' : '⏳ Sperren'}</button></div>
  </div>`);
  $('dashCancel').onclick = () => openAdmin();
  $('dashGo').onclick = async () => {
    const duration = ban ? 0 : +(document.querySelector('input[name=dur]:checked') || {}).value;
    const r = await emitP('admin:action', { user, action, duration, reason: $('dashReason').value });
    if (r.error) return toast(r.error);
    toast(ban ? `${name} wurde gebannt 🔨` : `${name} wurde gesperrt ⏳`);
    openAdmin();
  };
}

async function renderAdReports() {
  const all = await emitP('admin:reports');
  if (all.error) return dashBody(`<p class="err">${esc(all.error)}</p>`);
  adOpenReports = all.filter((r) => r.status === 'open').length; adminBadge();
  const list = adReportsFilter === 'open' ? all.filter((r) => r.status === 'open') : all;
  const att = (a) => a.kind === 'image' && a.id ? `<img src="${mediaUrl(a.id)}" alt="">` : a.kind === 'gif' && a.url ? `<img src="${esc(a.url)}" alt="">` : `<span class="chip">${esc(a.kind)}</span>`;
  dashBody(`<div class="dashbar"><div class="seg"><button class="${adReportsFilter === 'open' ? 'on' : ''}" data-dashrf="open">Offen (${adOpenReports})</button><button class="${adReportsFilter === 'all' ? 'on' : ''}" data-dashrf="all">Alle (${all.length})</button></div></div>
    ${list.length ? list.map((r) => `<div class="dashrep ${r.status}">
      <div class="dashrep-h"><span class="rtag">${esc(REASON_TXT[r.reason] || r.reason)}</span><span class="muted">${fmtShort(r.at)} ${fmtTime(r.at)}</span>${r.status === 'done' ? '<span class="tag">erledigt</span>' : ''}</div>
      <div class="dashrep-who"><span data-profile="${esc(r.by)}">${avatar(r.by, 's')}<b>${esc(dn(r.by))}</b></span><span class="muted">hat gemeldet</span><span data-profile="${esc(r.user)}">${avatar(r.user, 's')}<b>${esc(dn(r.user))}</b></span>${r.userBanned ? '<span class="warn">gesperrt</span>' : ''}</div>
      ${r.text ? `<p class="dashrep-t">„${esc(r.text)}“</p>` : ''}
      ${r.msg ? `<div class="dashrep-msg"><div class="label">Gemeldete Nachricht</div>${r.msg.text ? `<p>${esc(r.msg.text)}</p>` : ''}${(r.msg.att || []).length ? `<div class="dashrep-att">${r.msg.att.map(att).join('')}</div>` : ''}</div>` : ''}
      <div class="pbtns dashrep-a">
        ${r.status === 'open' ? `<button class="btn small" data-dashrep="${r.id}" data-st="done">✓ Erledigt</button>` : `<button class="btn small ghost" data-dashrep="${r.id}" data-st="open">Wieder öffnen</button>`}
        ${r.msg ? `<button class="btn small ghost" data-dashdelmsg="${esc(r.msg.id)}">🗑️ Nachricht löschen</button>` : ''}
        ${!r.userBanned ? `<button class="btn small ghost" data-dashact="suspend" data-u="${esc(r.user)}">⏳ Sperren</button><button class="btn small danger" data-dashact="ban" data-u="${esc(r.user)}">🔨 Bannen</button>` : `<button class="btn small ghost" data-dashact="unban" data-u="${esc(r.user)}">Entsperren</button>`}
      </div>
    </div>`).join('') : `<div class="emptylist">🎉<br>${adReportsFilter === 'open' ? 'Keine offenen Meldungen.' : 'Noch keine Meldungen.'}</div>`}`);
}

function renderAdBroadcast() {
  dashBody(`<h3 class="dashh">📢 Offizielle Mitteilung senden</h3>
    <p class="muted" style="font-size:14px;margin-bottom:14px">Die Nachricht erscheint bei den Empfängern im Chat <b>Connecta ${I.verified}</b> ganz oben – ideal für Update-Logs, neue Funktionen oder wichtige Infos.</p>
    <div class="label" style="margin-bottom:8px">Empfänger</div>
    <div class="seg" style="margin-bottom:10px"><button class="${!bcTargets ? 'on' : ''}" data-bcmode="all">🌍 Alle Nutzer</button><button class="${bcTargets ? 'on' : ''}" data-bcmode="some">👤 Ausgewählte</button></div>
    ${bcTargets ? `<div class="chips bcchips">${bcTargets.map((u) => `<span>@${esc(u)} <button data-bcrm="${esc(u)}">✕</button></span>`).join('')}</div>
      <div class="bcadd"><input class="input" id="bcUser" placeholder="Username eingeben und Enter drücken" autocomplete="off"><div id="bcSug" class="bcsug"></div></div>` : ''}
    <div class="field" style="margin-top:12px"><span class="label">Titel (optional)</span><input class="input" id="bcTitle" maxlength="80" placeholder="z. B. 🚀 Update 5.0 ist da!"></div>
    <div class="field"><span class="label">Nachricht</span><textarea class="input" id="bcText" rows="6" maxlength="4000" placeholder="Was ist neu?&#10;&#10;• Server mit Rollen&#10;• Storys&#10;• …"></textarea></div>
    <div class="field"><span class="label">Bild (optional)</span><div class="imgrow"><button class="btn small ghost" id="bcImgBtn">${bcImg ? '🖼️ Bild ändern' : '🖼️ Bild hinzufügen'}</button>${bcImg ? `<img class="bcimg" src="${bcImg.url}" alt=""><button class="btn small ghost" id="bcImgRm">Entfernen</button>` : ''}</div></div>
    <button class="btn block" id="bcSend">📢 ${bcTargets ? `An ${bcTargets.length} ${bcTargets.length === 1 ? 'Person' : 'Personen'} senden` : 'An alle senden'}</button>`);
  if ($('bcUser')) {
    const inp = $('bcUser'); let t;
    const add = (u) => { u = u.trim().replace(/^@/, '').toLowerCase(); if (u && !bcTargets.includes(u)) bcTargets.push(u); keep(); };
    inp.onkeydown = (e) => { if (e.key === 'Enter') { e.preventDefault(); add(inp.value); } };
    inp.oninput = () => { clearTimeout(t); t = setTimeout(async () => { const q = inp.value.trim(); if (!q) return ($('bcSug').innerHTML = ''); const list = await emitP('admin:users', { q }); if (!$('bcSug')) return; $('bcSug').innerHTML = (list || []).slice(0, 6).map((u) => `<button data-bcadd="${esc(u.username)}">${avatar(u.username, 's')}<b>${esc(u.displayName || u.username)}</b><span>@${esc(u.username)}</span></button>`).join(''); }, 200); };
  }
  $('bcImgBtn').onclick = async () => {
    const inp = document.createElement('input'); inp.type = 'file'; inp.accept = 'image/*';
    inp.onchange = async () => { const f = inp.files[0]; if (!f) return; const { blob } = await prepareImage(f); keep(() => { bcImg = { blob, url: URL.createObjectURL(blob) }; }); };
    inp.click();
  };
  if ($('bcImgRm')) $('bcImgRm').onclick = () => keep(() => { bcImg = null; });
  $('bcSend').onclick = async () => {
    const text = $('bcText').value.trim(), title = $('bcTitle').value.trim();
    if (!text && !bcImg) return toast('Schreib eine Nachricht.');
    if (bcTargets && !bcTargets.length) return toast('Füge mindestens einen Empfänger hinzu.');
    if (!confirm(bcTargets ? `Mitteilung an ${bcTargets.length} Person(en) senden?` : 'Mitteilung an ALLE Nutzer senden?')) return;
    $('bcSend').disabled = true;
    let att = [];
    if (bcImg) { try { att = [{ id: (await upload(bcImg.blob, 'mitteilung')).id }]; } catch (e) { $('bcSend').disabled = false; return toast('Upload fehlgeschlagen', e.message); } }
    const r = await emitP('admin:broadcast', { text, title, to: bcTargets, att });
    if (r.error) { $('bcSend').disabled = false; return toast(r.error); }
    toast(`Mitteilung an ${r.count} ${r.count === 1 ? 'Person' : 'Personen'} gesendet 📢`);
    bcImg = null; bcTargets = null;
    renderAdBroadcast();
  };
  function keep(fn) { const tt = $('bcTitle').value, tx = $('bcText').value; if (fn) fn(); renderAdBroadcast(); $('bcTitle').value = tt; $('bcText').value = tx; if ($('bcUser')) $('bcUser').focus(); }
  renderAdBroadcast.keep = keep;
}
bcTargets = null;

async function renderAdConfig() {
  const s = await emitP('admin:stats');
  if (s.error) return dashBody(`<p class="err">${esc(s.error)}</p>`);
  dashBody(`<h3 class="dashh">⚙️ App-Einstellungen</h3>
    <div class="field"><span class="label">Maximale Gruppengröße</span><div style="display:flex;gap:8px;align-items:center"><input class="input" type="number" id="cfgMax" min="2" max="500" value="${s.config.maxGroup}" style="max-width:140px"><span class="muted">Personen pro Gruppe (inklusive Ersteller)</span></div></div>
    <div class="toggle ${s.config.registrationOpen ? 'on' : ''}" id="cfgReg"><div><b>Registrierung offen</b><small>Wenn aus, können sich keine neuen Nutzer registrieren</small></div><span class="sw"></span></div>
    <button class="btn" id="cfgSave">Speichern</button>
    <div class="pc-sec"><div class="label">Hinweise</div><p class="muted" style="font-size:14px">Abzeichen vergibst du im Profil eines Nutzers. Owner ist, wer bei Render in der Variable <b>OWNER</b> steht.</p></div>`);
  $('cfgReg').onclick = () => $('cfgReg').classList.toggle('on');
  $('cfgSave').onclick = async () => {
    const r = await emitP('admin:config', { maxGroup: +$('cfgMax').value, registrationOpen: $('cfgReg').classList.contains('on') });
    toast(r.error || `Gespeichert – Gruppen jetzt bis ${r.config.maxGroup} Personen`);
  };
}

document.addEventListener('click', (e) => {
  const t = e.target.closest('#rbAdmin,[data-dashtab],[data-dashact],[data-dashrep],[data-dashdelmsg],[data-dashrf],[data-dashmsg],[data-bcmode],[data-bcrm],[data-bcadd]');
  if (!t) return;
  const d = t.dataset;
  if (t.id === 'rbAdmin') return openAdmin();
  if ('dashtab' in d) return openAdmin(d.dashtab);
  if ('dashact' in d) return adAction(d.dashact, d.u);
  if ('dashrep' in d) return emitP('admin:report', { id: d.dashrep, status: d.st }).then((r) => { if (r.error) toast(r.error); renderAdReports(); });
  if ('dashdelmsg' in d) { if (confirm('Diese Nachricht für alle löschen?')) emitP('admin:deleteMessage', d.dashdelmsg).then((r) => toast(r.error || 'Nachricht gelöscht')); return; }
  if ('dashrf' in d) { adReportsFilter = d.dashrf; return renderAdReports(); }
  if ('dashmsg' in d) { bcTargets = [d.dashmsg]; adTab = 'broadcast'; return openAdmin(); }
  if ('bcmode' in d) { const keep = renderAdBroadcast.keep; return keep(() => { bcTargets = d.bcmode === 'all' ? null : bcTargets || []; }); }
  if ('bcrm' in d) return renderAdBroadcast.keep(() => { bcTargets = bcTargets.filter((u) => u !== d.bcrm); });
  if ('bcadd' in d) return renderAdBroadcast.keep(() => { if (!bcTargets.includes(d.bcadd)) bcTargets.push(d.bcadd); });
});
