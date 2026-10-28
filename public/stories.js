/* =========================================================
   Connecta – Storys (24 Stunden sichtbar, nur für Freunde)
   ========================================================= */
const STORY_BGS = ['#8b4dff', '#5b21ff', '#ff4d7d', '#ff8a00', '#f5b83d', '#0f9b5f', '#00b4ff', '#0066ff', '#e91e63', '#111116'];
const STORY_MS = 5500;
const ago = (t) => { const m = Math.floor((Date.now() - t) / 60000); if (m < 1) return 'gerade eben'; if (m < 60) return `vor ${m} Min.`; return `vor ${Math.floor(m / 60)} Std.`; };
const storyOf = (u) => S.stories.find((s) => s.user === u);
const allSeen = (s) => s.items.every((i) => i.seen || s.user === S.me);

function storyOrder() {
  const others = S.stories.filter((s) => s.user !== S.me).sort((a, b) => allSeen(a) - allSeen(b) || b.items[b.items.length - 1].at - a.items[a.items.length - 1].at);
  const mine = storyOf(S.me);
  return [...(mine ? [mine] : []), ...others];
}
function storyStripHtml() {
  const mine = storyOf(S.me);
  const others = storyOrder().filter((s) => s.user !== S.me);
  return `<div class="stories">
    <div class="story ${mine ? 'has' : ''}" ${mine ? `data-storyopen="${esc(S.me)}"` : 'data-storyadd'}><div class="sring ${mine ? 'mine' : 'none'}">${avatar(S.me)}</div>${mine ? '' : '<span class="splus">+</span>'}<span class="sname">Deine Story</span>${mine ? `<button class="splus" data-storyadd title="Story hinzufügen">+</button>` : ''}</div>
    ${others.map((s) => `<div class="story" data-storyopen="${esc(s.user)}"><div class="sring ${allSeen(s) ? 'seen' : ''}">${avatar(s.user)}</div><span class="sname">${esc(dn(s.user))}</span></div>`).join('')}
  </div>`;
}

/* ---------- Story erstellen ---------- */
let sDraft = null;
function openStoryAdd(tab = 'media') {
  sDraft = sDraft || { bg: STORY_BGS[0], text: '', file: null, url: null, kind: null };
  const prev = sDraft.kind === 'image' ? `<img src="${sDraft.url}" alt="">` : sDraft.kind === 'video' ? `<video src="${sDraft.url}" autoplay muted loop playsinline></video>` : '';
  openModal(`${mHead('Neue Story')}<div class="mbody">
    <div class="tabs gtabs"><button class="${tab === 'media' ? 'on' : ''}" data-stab2="media">📷 Foto / Video</button><button class="${tab === 'text' ? 'on' : ''}" data-stab2="text">✏️ Text</button></div>
    ${tab === 'media' ? `<div class="sprev media" id="sPick">${prev || `<div class="spick">📷<b>Foto oder Video auswählen</b><small>Bis 30 MB · Videos am besten unter 30 Sekunden</small></div>`}${sDraft.kind && sDraft.text ? `<div class="scap">${esc(sDraft.text)}</div>` : ''}</div>
      <div class="field"><span class="label">Bildunterschrift (optional)</span><input class="input" id="sCap" maxlength="300" placeholder="Schreib etwas dazu…" value="${esc(sDraft.kind ? sDraft.text : '')}"></div>`
    : `<div class="sprev text" style="background:${sDraft.bg}"><div class="stxt">${esc(sDraft.text || 'Dein Text erscheint hier')}</div></div>
      <div class="field"><textarea class="input" id="sTxt" rows="3" maxlength="300" placeholder="Was gibt's Neues?">${esc(sDraft.kind ? '' : sDraft.text)}</textarea></div>
      <div class="colors">${STORY_BGS.map((c) => `<button class="cdot ${sDraft.bg === c ? 'on' : ''}" style="background:${c}" data-sbg="${c}"></button>`).join('')}</div>`}
    <p class="muted" style="font-size:13px;margin:12px 0">Deine Story ist 24 Stunden lang für deine Freunde sichtbar.</p>
    <button class="btn block" id="sPost">Story teilen</button>
  </div>`);
  if (tab === 'media') {
    $('sPick').onclick = () => {
      const inp = document.createElement('input'); inp.type = 'file'; inp.accept = 'image/*,video/*';
      inp.onchange = () => {
        const f = inp.files[0]; if (!f) return;
        const kind = f.type.split('/')[0];
        if (!['image', 'video'].includes(kind)) return toast('Nur Fotos und Videos.');
        if (kind === 'video' && f.size > 30 * 1048576) return toast('Video zu groß', 'Maximal 30 MB.');
        if (sDraft.url) URL.revokeObjectURL(sDraft.url);
        Object.assign(sDraft, { file: f, kind, url: URL.createObjectURL(f), text: $('sCap').value });
        openStoryAdd('media');
      };
      inp.click();
    };
    $('sCap').oninput = () => { sDraft.text = $('sCap').value; };
  } else {
    $('sTxt').oninput = () => { sDraft.text = $('sTxt').value; sDraft.kind = null; document.querySelector('.sprev.text .stxt').textContent = sDraft.text || 'Dein Text erscheint hier'; };
    document.querySelectorAll('[data-sbg]').forEach((b) => b.onclick = () => { sDraft.bg = b.dataset.sbg; sDraft.text = $('sTxt').value; sDraft.kind = null; openStoryAdd('text'); });
  }
  $('sPost').onclick = async () => {
    const btn = $('sPost');
    if (tab === 'media') {
      if (!sDraft.file) return toast('Wähle zuerst ein Foto oder Video aus.');
      btn.disabled = true; btn.textContent = 'Lade hoch…';
      try {
        let blob = sDraft.file;
        if (sDraft.kind === 'image') blob = (await prepareImage(sDraft.file)).blob;
        const up = await upload(blob, sDraft.file.name, (r) => { btn.textContent = `Lade hoch… ${Math.round(r * 100)}%`; });
        socket.emit('story:add', { kind: sDraft.kind, media: up.id, text: $('sCap').value }, done);
      } catch (e) { btn.disabled = false; btn.textContent = 'Story teilen'; toast('Upload fehlgeschlagen', e.message); }
    } else {
      const text = $('sTxt').value.trim();
      if (!text) return toast('Schreib etwas für deine Story.');
      btn.disabled = true;
      socket.emit('story:add', { kind: 'text', text, bg: sDraft.bg }, done);
    }
    function done(r) { if (r.error) { btn.disabled = false; btn.textContent = 'Story teilen'; return toast(r.error); } if (sDraft.url) URL.revokeObjectURL(sDraft.url); sDraft = null; closeModal(); toast('Deine Story ist online ✨'); }
  };
}

/* ---------- Story ansehen ---------- */
let sv = null;
function openStory(user) {
  const order = storyOrder();
  const ui = order.findIndex((s) => s.user === user);
  if (ui < 0) return;
  const s = order[ui];
  const first = s.user === S.me ? 0 : Math.max(0, s.items.findIndex((i) => !i.seen));
  sv = { order: order.map((x) => x.user), ui, ii: first === -1 ? 0 : first, paused: false };
  $('storyViewer').classList.remove('hidden');
  showStory();
}
function closeStory() {
  if (!sv) return;
  clearTimeout(sv.timer); cancelAnimationFrame(sv.raf);
  sv = null;
  $('storyViewer').classList.add('hidden'); $('storyViewer').innerHTML = '';
  if (view === 'chats') renderChats();
}
function showStory() {
  if (!sv) return;
  clearTimeout(sv.timer); cancelAnimationFrame(sv.raf);
  const s = storyOf(sv.order[sv.ui]);
  if (!s || !s.items.length) return nextUser(1);
  if (sv.ii >= s.items.length) sv.ii = s.items.length - 1;
  const it = s.items[sv.ii];
  const own = s.user === S.me;
  if (!own && !it.seen) { it.seen = true; socket.emit('story:view', it.id); }
  const media = it.kind === 'image' ? `<img src="${mediaUrl(it.media)}" alt="">` : it.kind === 'video' ? `<video id="svVid" src="${mediaUrl(it.media)}" autoplay playsinline></video>` : `<div class="sv-text" style="background:${esc(it.bg || '#8b4dff')}"><div>${esc(it.text)}</div></div>`;
  $('storyViewer').innerHTML = `<div class="sv-box">
    <div class="sv-bars">${s.items.map((x, i) => `<div class="sv-bar"><i style="width:${i < sv.ii ? 100 : 0}%" ${i === sv.ii ? 'id="svProg"' : ''}></i></div>`).join('')}</div>
    <div class="sv-head">${avatar(s.user, 's')}<b>${own ? 'Deine Story' : esc(dn(s.user))}</b><span>${ago(it.at)}</span><button class="ibtn" id="svPause" title="Pause">${I.pause}</button><button class="ibtn" id="svClose" title="Schließen">${I.x}</button></div>
    <div class="sv-media">${media}${it.kind !== 'text' && it.text ? `<div class="sv-cap">${esc(it.text)}</div>` : ''}</div>
    <div class="sv-tap left" id="svPrev"></div><div class="sv-tap right" id="svNext"></div>
    <div class="sv-foot">${own
      ? `<button class="btn small ghost" id="svViews">👁 ${it.views ? it.views.length : 0} ${it.views && it.views.length === 1 ? 'Aufruf' : 'Aufrufe'}</button><button class="btn small danger" id="svDel">${I.trash} Löschen</button><button class="btn small" id="svAdd">${I.plus} Neue Story</button>`
      : `<form id="svReply" class="sv-reply"><input class="input" id="svReplyText" maxlength="1000" placeholder="Antworten an ${esc(dn(s.user))}…" autocomplete="off"><button class="send" title="Senden">${I.send}</button></form>`}</div>
  </div>`;
  const dur = it.kind === 'video' ? null : STORY_MS;
  const start = performance.now();
  let elapsed = 0, last = start;
  const step = (now) => {
    if (!sv) return;
    if (!sv.paused) elapsed += now - last;
    last = now;
    const vid = $('svVid');
    const ratio = vid ? (vid.duration ? vid.currentTime / vid.duration : 0) : elapsed / dur;
    const p = $('svProg'); if (p) p.style.width = Math.min(100, ratio * 100) + '%';
    if (!vid && ratio >= 1) return next();
    sv.raf = requestAnimationFrame(step);
  };
  sv.raf = requestAnimationFrame(step);
  const vid = $('svVid');
  if (vid) { vid.onended = () => next(); vid.onerror = () => next(); vid.play().catch(() => { vid.muted = true; vid.play().catch(() => {}); }); }
  $('svClose').onclick = closeStory;
  $('svPrev').onclick = prev; $('svNext').onclick = next;
  $('svPause').onclick = () => setPause(!sv.paused);
  if (own) {
    $('svViews').onclick = () => {
      setPause(true);
      const v = (it.views || []).slice().sort((a, b) => b.at - a.at);
      openModal(`${mHead('Aufrufe')}<div class="mbody">${v.length ? v.map((x) => `<div class="item" style="cursor:default">${avatar(x.user, 's')}<div class="ic"><div class="ir"><b>${esc(dn(x.user))}</b></div><div class="ir"><span class="pv">${ago(x.at)}</span></div></div></div>`).join('') : '<div class="emptylist">👀<br>Noch niemand hat diese Story gesehen.</div>'}</div>`);
    };
    $('svDel').onclick = () => { if (!confirm('Diese Story löschen?')) return; socket.emit('story:delete', it.id, (r) => { if (r.error) return toast(r.error); s.items.splice(sv.ii, 1); toast('Story gelöscht'); if (!s.items.length) closeStory(); else showStory(); }); };
    $('svAdd').onclick = () => { closeStory(); openStoryAdd(); };
  } else {
    const inp = $('svReplyText');
    inp.onfocus = () => setPause(true);
    inp.onblur = () => setPause(false);
    $('svReply').onsubmit = (e) => { e.preventDefault(); const text = inp.value.trim(); if (!text) return; socket.emit('story:reply', { id: it.id, text }, (r) => { if (r.error) return toast(r.error); inp.value = ''; inp.blur(); toast(`Antwort an ${dn(s.user)} gesendet 💬`); }); };
  }
  // gedrückt halten = pausieren
  const media2 = document.querySelector('.sv-box');
  let holdT;
  media2.onpointerdown = (e) => { if (e.target.closest('.sv-foot,.sv-head')) return; holdT = setTimeout(() => setPause(true, true), 220); };
  media2.onpointerup = media2.onpointerleave = () => { clearTimeout(holdT); if (sv && sv.hold) setPause(false); };
}
function setPause(p, hold) {
  if (!sv) return;
  sv.paused = p; sv.hold = !!hold && p;
  const v = $('svVid'); if (v) p ? v.pause() : v.play().catch(() => {});
  if ($('svPause')) $('svPause').innerHTML = p ? I.play : I.pause;
}
function next() { if (!sv) return; if (sv.hold) return; const s = storyOf(sv.order[sv.ui]); if (s && sv.ii < s.items.length - 1) { sv.ii++; showStory(); } else nextUser(1); }
function prev() { if (!sv) return; if (sv.ii > 0) { sv.ii--; showStory(); } else if (sv.ui > 0) { sv.ui--; const s = storyOf(sv.order[sv.ui]); sv.ii = s ? s.items.length - 1 : 0; showStory(); } else showStory(); }
function nextUser(dir) {
  if (!sv) return;
  sv.ui += dir; sv.ii = 0;
  if (sv.ui < 0 || sv.ui >= sv.order.length) return closeStory();
  const s = storyOf(sv.order[sv.ui]);
  if (s && s.user !== S.me) { const f = s.items.findIndex((i) => !i.seen); sv.ii = f < 0 ? 0 : f; }
  showStory();
}
document.addEventListener('keydown', (e) => {
  if (!sv || e.target.tagName === 'INPUT') return;
  if (e.key === 'Escape') closeStory();
  if (e.key === 'ArrowRight') next();
  if (e.key === 'ArrowLeft') prev();
  if (e.key === ' ') { e.preventDefault(); setPause(!sv.paused); }
});
document.addEventListener('click', (e) => {
  const t = e.target.closest('[data-storyopen],[data-storyadd],[data-stab2]');
  if (!t) return;
  e.stopPropagation();
  if ('storyadd' in t.dataset) return openStoryAdd();
  if ('stab2' in t.dataset) { if (t.dataset.stab2 === 'text' && sDraft) sDraft.kind = null; return openStoryAdd(t.dataset.stab2); }
  openStory(t.dataset.storyopen);
}, true);
