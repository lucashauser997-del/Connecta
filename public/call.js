/* =========================================================
   Connecta – Anrufe (WebRTC, 1:1)
   - Mikrofon wird beim Annehmen sauber an die Verbindung gehängt
   - Mikrofon/Kamera/Lautsprecher wählbar, Pegelanzeige
   - Kamera jederzeit an/aus, Bildschirmübertragung
   - Anruf oben angedockt, der Chat bleibt darunter sichtbar
   ========================================================= */
let call = null;            // aktueller Anruf
let incoming = null;        // eingehender Anruf (noch nicht angenommen)
let pendingIce = [];
const FALLBACK_ICE = [{ urls: ['stun:stun.l.google.com:19302', 'stun:stun1.l.google.com:19302'] }];
let ICE_INFO = { iceServers: FALLBACK_ICE, turn: false };
const inCall = () => !!call;
const canScreen = () => !!(navigator.mediaDevices && navigator.mediaDevices.getDisplayMedia) && !/Android|iPhone|iPad|iPod/i.test(navigator.userAgent);

$('muteBtn').innerHTML = I.mic; $('camBtn').innerHTML = I.video; $('screenBtn').innerHTML = I.screen;
$('sbBtn').innerHTML = I.sound; $('callSettingsBtn').innerHTML = I.gear; $('hangup').innerHTML = I.phone; $('callExpand').innerHTML = I.expand;

async function loadIce() {
  try { const r = await fetch('/api/ice'); ICE_INFO = await r.json(); } catch { ICE_INFO = { iceServers: FALLBACK_ICE, turn: false }; }
  return ICE_INFO.iceServers;
}

/* ---------- Geräte ---------- */
function audioConstraints() {
  return { deviceId: PREFS.micId ? { ideal: PREFS.micId } : undefined, echoCancellation: PREFS.echo !== false, noiseSuppression: PREFS.noise !== false, autoGainControl: PREFS.agc !== false };
}
async function getMic() {
  try { return await navigator.mediaDevices.getUserMedia({ audio: audioConstraints() }); }
  catch (e) {
    if (PREFS.micId) { PREFS.micId = ''; savePrefs(); return navigator.mediaDevices.getUserMedia({ audio: true }); }
    throw e;
  }
}
async function getCam() {
  const v = { width: { ideal: 1280 }, height: { ideal: 720 }, deviceId: PREFS.camId ? { ideal: PREFS.camId } : undefined };
  try { return await navigator.mediaDevices.getUserMedia({ video: v }); }
  catch (e) { if (PREFS.camId) { PREFS.camId = ''; savePrefs(); return navigator.mediaDevices.getUserMedia({ video: true }); } throw e; }
}
function mediaError(e, what) {
  const n = e && e.name;
  if (n === 'NotAllowedError') return toast(`Kein Zugriff auf ${what}`, 'Erlaube den Zugriff in der Adressleiste (Schloss-Symbol) und versuch es nochmal.');
  if (n === 'NotFoundError') return toast(`Kein ${what} gefunden`, 'Schließ eins an oder wähle in den Einstellungen ein anderes Gerät.');
  if (n === 'NotReadableError') return toast(`${what} wird gerade benutzt`, 'Ein anderes Programm blockiert es vielleicht. Schließe es und versuch es nochmal.');
  toast(`${what} konnte nicht gestartet werden`, (e && e.message) || '');
}

/* ---------- Pegel (wer spricht?) ---------- */
let meterCtx = null;
function meter(stream, onLevel) {
  try {
    meterCtx = meterCtx || new (window.AudioContext || window.webkitAudioContext)();
    if (meterCtx.state === 'suspended') meterCtx.resume();
    const src = meterCtx.createMediaStreamSource(stream);
    const an = meterCtx.createAnalyser(); an.fftSize = 512;
    src.connect(an);
    const d = new Uint8Array(an.fftSize);
    const iv = setInterval(() => { an.getByteTimeDomainData(d); let s = 0; for (const v of d) s += ((v - 128) / 128) ** 2; onLevel(Math.min(1, Math.sqrt(s / d.length) * 5)); }, 90);
    return () => { clearInterval(iv); try { src.disconnect(); } catch {} };
  } catch { return () => {}; }
}

/* ---------- Oberfläche ---------- */
function setStatus(t) { $('callStatus').textContent = t; }
function renderCallUI() {
  if (!call) return;
  const p = call.peer;
  $('callTitle').innerHTML = `${call.video ? I.video : I.phone}<span>${esc(dn(p))}</span>`;
  $('remoteName').textContent = dn(p);
  $('remoteAv').innerHTML = avatar(p, 'xl');
  $('localAv').innerHTML = avatar(S.me, 'xl');
  const r = call.remote || {};
  const showRV = !!(r.cam || r.screen) && call.connected;
  $('tileRemote').classList.toggle('hasvideo', showRV);
  $('tileRemote').classList.toggle('screen', !!r.screen);
  $('remoteIcons').innerHTML = (r.mute ? I.micOff : '') + (r.screen ? I.screen : '');
  const showLV = !!(call.camOn || call.screenOn);
  $('tileLocal').classList.toggle('hasvideo', showLV);
  $('tileLocal').classList.toggle('screen', !!call.screenOn);
  $('localIcons').innerHTML = (call.muted ? I.micOff : '') + (call.screenOn ? I.screen : '');
  $('muteBtn').classList.toggle('off', !!call.muted);
  $('muteBtn').innerHTML = call.muted ? I.micOff : I.mic;
  $('muteBtn').title = call.muted ? 'Stummschaltung aufheben' : 'Stummschalten';
  $('camBtn').classList.toggle('on', !!call.camOn);
  $('camBtn').innerHTML = call.camOn ? I.video : I.camOff;
  $('camBtn').title = call.camOn ? 'Kamera ausschalten' : 'Kamera einschalten';
  $('screenBtn').classList.toggle('hidden', !canScreen());
  $('screenBtn').classList.toggle('on', !!call.screenOn);
  $('screenBtn').title = call.screenOn ? 'Übertragung beenden' : 'Bildschirm übertragen';
  $('callExpand').innerHTML = $('main').classList.contains('callfull') ? I.shrink : I.expand;
  updateCallPill();
}
function showCallDock() {
  $('call').classList.remove('hidden');
  $('main').classList.add('incall');
  $('app').classList.add('hascall');
  renderCallUI();
}
function updateCallPill() {
  const mobileHidden = call && window.innerWidth <= 760 && !$('app').classList.contains('chatting');
  $('callPill').classList.toggle('hidden', !mobileHidden);
  if (mobileHidden) $('callPill').innerHTML = `${I.phone}<span>Anruf mit ${esc(dn(call.peer))} · ${esc($('callStatus').textContent)}</span>`;
}
$('callPill').onclick = () => call && openConv(dmId(S.me, call.peer));
$('callExpand').onclick = () => { $('main').classList.toggle('callfull'); renderCallUI(); };
$('callSettingsBtn').onclick = () => openSettings('voice');
$('audioUnlock').onclick = () => { $('remoteA').play().then(() => $('audioUnlock').classList.add('hidden')).catch(() => {}); };
function openCallChat(peer) {
  view = 'chats'; $('search').value = '';
  if (current !== dmId(S.me, peer)) openConv(dmId(S.me, peer)); else { renderRail(); renderSide(); }
}

/* ---------- Verbindung ---------- */
function sendMedia() { if (call && call.pc) socket.emit('call:media', { to: call.peer, mute: !!call.muted, cam: !!call.camOn, screen: !!call.screenOn }); }
function buildPC(iceServers) {
  const pc = new RTCPeerConnection({ iceServers });
  pc.onicecandidate = (e) => { if (e.candidate && call) socket.emit('call:ice', { to: call.peer, candidate: e.candidate }); };
  pc.ontrack = (e) => {
    if (!call) return;
    if (e.track.kind === 'audio') {
      const ms = new MediaStream([e.track]);
      $('remoteA').srcObject = ms;
      if (PREFS.spkId && $('remoteA').setSinkId) $('remoteA').setSinkId(PREFS.spkId).catch(() => {});
      $('remoteA').play().then(() => $('audioUnlock').classList.add('hidden')).catch(() => $('audioUnlock').classList.remove('hidden'));
      if (call.stopRemoteMeter) call.stopRemoteMeter();
      call.stopRemoteMeter = meter(ms, (l) => $('tileRemote').classList.toggle('speaking', l > 0.08 && !(call && call.remote && call.remote.mute)));
    } else {
      $('remoteV').srcObject = new MediaStream([e.track]);
      $('remoteV').play().catch(() => {});
    }
  };
  pc.onconnectionstatechange = () => {
    if (!call || call.pc !== pc) return;
    const st = pc.connectionState;
    if (st === 'connected') {
      clearTimeout(call.dcTimer);
      if (!call.connected) { call.connected = true; call.t0 = Date.now(); startTimer(); sendMedia(); Sounds.ping(false); }
      renderCallUI();
    } else if (st === 'disconnected') {
      setStatus('Verbindung wackelt…');
      clearTimeout(call.dcTimer);
      call.dcTimer = setTimeout(() => { if (call && call.pc === pc && pc.connectionState !== 'connected') endCall(true, 'Verbindung verloren'); }, 8000);
    } else if (st === 'failed') {
      endCall(true, ICE_INFO.turn ? 'Verbindung fehlgeschlagen' : 'Verbindung fehlgeschlagen – zwischen manchen Netzen (z. B. Handy ↔ WLAN) braucht man einen TURN-Server.');
    }
  };
  return pc;
}
let timerIv = null;
function startTimer() {
  clearInterval(timerIv);
  const tick = () => { if (!call) return; const s = Math.floor((Date.now() - call.t0) / 1000); setStatus(String(Math.floor(s / 60)).padStart(2, '0') + ':' + String(s % 60).padStart(2, '0')); updateCallPill(); };
  tick(); timerIv = setInterval(tick, 1000);
}
function flushIce() { if (!call || !call.pc) return; pendingIce.forEach((c) => call.pc.addIceCandidate(c).catch(() => {})); pendingIce = []; }
function attachLocal() {
  if (!call) return;
  const vt = call.screenOn ? call.screen.getVideoTracks()[0] : call.camOn && call.cam ? call.cam.getVideoTracks()[0] : null;
  $('localV').srcObject = vt ? new MediaStream([vt]) : null;
  if (call.stopLocalMeter) call.stopLocalMeter();
  call.stopLocalMeter = meter(call.mic, (l) => {
    const live = !call.muted;
    $('localLvl').style.width = (live ? Math.round(l * 100) : 0) + '%';
    $('tileLocal').classList.toggle('speaking', live && l > 0.08);
  });
}

async function startCall(u, video) {
  if (call || incoming) return toast('Du bist schon in einem Anruf.');
  if (!navigator.mediaDevices || !window.RTCPeerConnection) return toast('Anrufe brauchen HTTPS', 'Öffne die Seite über https:// oder localhost.');
  let mic, cam = null;
  try { mic = await getMic(); } catch (e) { return mediaError(e, 'Mikrofon'); }
  if (video) { try { cam = await getCam(); } catch (e) { mediaError(e, 'Kamera'); video = false; } }
  call = { peer: u, video, caller: true, mic, cam, camOn: !!cam, muted: false, screenOn: false, remote: {}, connected: false };
  openCallChat(u);
  showCallDock();
  setStatus('Klingelt…');
  attachLocal();
  const iceServers = await loadIce();
  if (!call) return;
  const pc = (call.pc = buildPC(iceServers));
  call.aT = pc.addTransceiver(mic.getAudioTracks()[0], { direction: 'sendrecv', streams: [mic] });
  call.vT = pc.addTransceiver(cam ? cam.getVideoTracks()[0] : 'video', { direction: 'sendrecv' });
  const offer = await pc.createOffer();
  await pc.setLocalDescription(offer);
  socket.emit('call:offer', { to: u, sdp: pc.localDescription, video });
  call.ringTimer = setTimeout(() => { if (call && !call.connected && !call.answered) { socket.emit('call:end', { to: u }); endCall(true, `${dn(u)} hat nicht abgenommen`); } }, 45000);
}

async function acceptCall(withVideo) {
  const d = incoming;
  if (!d) return;
  incoming = null; hideRinging(); Sounds.ring(false);
  let mic, cam = null;
  try { mic = await getMic(); } catch (e) { mediaError(e, 'Mikrofon'); socket.emit('call:decline', { to: d.from }); return; }
  if (withVideo) { try { cam = await getCam(); } catch (e) { mediaError(e, 'Kamera'); } }
  call = { peer: d.from, video: !!d.video, caller: false, mic, cam, camOn: !!cam, muted: false, screenOn: false, remote: { cam: !!d.video }, connected: false, answered: true };
  openCallChat(d.from);
  showCallDock();
  setStatus('Verbinde…');
  attachLocal();
  const iceServers = await loadIce();
  if (!call) return;
  const pc = (call.pc = buildPC(iceServers));
  await pc.setRemoteDescription(d.sdp);
  // Wichtig: das Mikrofon an die vom Anrufer angebotene Audio-Spur hängen und auf „senden + empfangen“ stellen
  for (const t of pc.getTransceivers()) {
    const kind = t.receiver.track && t.receiver.track.kind;
    if (kind === 'audio' && !call.aT) { call.aT = t; t.direction = 'sendrecv'; await t.sender.replaceTrack(mic.getAudioTracks()[0]); try { t.sender.setStreams && t.sender.setStreams(mic); } catch {} }
    if (kind === 'video' && !call.vT) { call.vT = t; t.direction = 'sendrecv'; if (cam) await t.sender.replaceTrack(cam.getVideoTracks()[0]); }
  }
  if (!call.aT) call.aT = pc.addTransceiver(mic.getAudioTracks()[0], { direction: 'sendrecv', streams: [mic] });
  flushIce();
  const answer = await pc.createAnswer();
  await pc.setLocalDescription(answer);
  socket.emit('call:answer', { to: call.peer, sdp: pc.localDescription });
}

function declineIncoming() {
  if (!incoming) return;
  socket.emit('call:decline', { to: incoming.from });
  incoming = null; hideRinging(); Sounds.ring(false);
}

function endCall(remote, msg) {
  Sounds.ring(false);
  clearInterval(timerIv);
  if (call) {
    clearTimeout(call.ringTimer); clearTimeout(call.dcTimer);
    if (call.stopLocalMeter) call.stopLocalMeter();
    if (call.stopRemoteMeter) call.stopRemoteMeter();
    try { call.pc && call.pc.close(); } catch {}
    [call.mic, call.cam, call.screen].forEach((s) => s && s.getTracks().forEach((t) => t.stop()));
  }
  call = null; pendingIce = [];
  $('remoteV').srcObject = null; $('localV').srcObject = null; $('remoteA').srcObject = null;
  $('call').classList.add('hidden'); $('main').classList.remove('incall', 'callfull'); $('app').classList.remove('hascall');
  $('soundboard').classList.add('hidden'); $('sbBtn').classList.remove('on'); $('audioUnlock').classList.add('hidden');
  $('tileRemote').className = 'tile'; $('tileLocal').className = 'tile local';
  updateCallPill();
  if (remote && msg) toast(msg);
}
$('hangup').onclick = () => { if (call) socket.emit('call:end', { to: call.peer }); endCall(false); };

/* ---------- Steuerung im Anruf ---------- */
$('muteBtn').onclick = () => {
  if (!call) return;
  call.muted = !call.muted;
  call.mic.getAudioTracks().forEach((t) => { t.enabled = !call.muted; });
  sendMedia(); renderCallUI();
};
$('camBtn').onclick = async () => {
  if (!call || !call.vT) return;
  if (call.camOn) {
    call.camOn = false;
    if (call.cam) { call.cam.getTracks().forEach((t) => t.stop()); call.cam = null; }
    if (!call.screenOn) await call.vT.sender.replaceTrack(null);
  } else {
    try { call.cam = await getCam(); } catch (e) { return mediaError(e, 'Kamera'); }
    call.camOn = true;
    if (!call.screenOn) await call.vT.sender.replaceTrack(call.cam.getVideoTracks()[0]);
  }
  if (call.vT.direction !== 'sendrecv') call.vT.direction = 'sendrecv';
  attachLocal(); sendMedia(); renderCallUI();
};
$('screenBtn').onclick = async () => {
  if (!call || !call.vT) return;
  if (call.screenOn) return stopScreen();
  try { call.screen = await navigator.mediaDevices.getDisplayMedia({ video: { frameRate: { ideal: 30 }, width: { ideal: 1920 }, height: { ideal: 1080 } }, audio: false }); }
  catch (e) { if (e && e.name !== 'NotAllowedError') toast('Bildschirmübertragung nicht möglich', e.message || ''); return; }
  const tr = call.screen.getVideoTracks()[0];
  try { tr.contentHint = 'detail'; } catch {}
  tr.onended = () => stopScreen();
  await call.vT.sender.replaceTrack(tr);
  call.screenOn = true;
  attachLocal(); sendMedia(); renderCallUI();
  toast('Du überträgst jetzt deinen Bildschirm 🖥️');
};
async function stopScreen() {
  if (!call || !call.screenOn) return;
  call.screenOn = false;
  if (call.screen) { call.screen.getTracks().forEach((t) => t.stop()); call.screen = null; }
  await call.vT.sender.replaceTrack(call.camOn && call.cam ? call.cam.getVideoTracks()[0] : null);
  attachLocal(); sendMedia(); renderCallUI();
}

/* ---------- Eingehender Anruf ---------- */
function showRinging(d) {
  $('ringing').innerHTML = `<div class="ring-card"><div class="ring-av pulse">${avatar(d.from, 'xl')}</div><b>${esc(dn(d.from))}</b><span>${d.video ? '🎥 Eingehender Videoanruf' : '📞 Eingehender Anruf'}</span>
    <div class="ring-btns"><button class="ibtn red" id="ringDecline" title="Ablehnen">${I.x}</button>${d.video ? `<button class="ibtn green" id="ringAcceptV" title="Mit Video annehmen">${I.video}</button>` : ''}<button class="ibtn green" id="ringAccept" title="Annehmen">${I.phone}</button></div></div>`;
  $('ringing').classList.remove('hidden');
  $('ringDecline').onclick = declineIncoming;
  $('ringAccept').onclick = () => acceptCall(false);
  if ($('ringAcceptV')) $('ringAcceptV').onclick = () => acceptCall(true);
}
function hideRinging() { $('ringing').classList.add('hidden'); $('ringing').innerHTML = ''; }

function setupCalls() {
  socket.on('call:offer', (d) => {
    if (call || incoming) return socket.emit('call:decline', { to: d.from, busy: true });
    incoming = d; pendingIce = [];
    showRinging(d);
    if (S.myStatus !== 'dnd') Sounds.ring(true);
    if (document.hidden && PREFS.desktop && 'Notification' in window && Notification.permission === 'granted') {
      try { const n = new Notification(`${dn(d.from)} ruft an`, { body: d.video ? 'Videoanruf' : 'Anruf', tag: 'call' }); n.onclick = () => { window.focus(); n.close(); }; } catch {}
    }
    incoming.timer = setTimeout(() => { if (incoming && incoming.from === d.from) { incoming = null; hideRinging(); Sounds.ring(false); toast(`Verpasster Anruf von ${dn(d.from)}`); } }, 45000);
  });
  socket.on('call:answer', async (d) => {
    if (!call || d.from !== call.peer || !call.pc) return;
    call.answered = true; clearTimeout(call.ringTimer);
    await call.pc.setRemoteDescription(d.sdp);
    flushIce();
    setStatus('Verbinde…');
  });
  socket.on('call:ice', (d) => {
    const peer = call ? call.peer : incoming ? incoming.from : null;
    if (d.from !== peer) return;
    if (call && call.pc && call.pc.remoteDescription) call.pc.addIceCandidate(d.candidate).catch(() => {});
    else pendingIce.push(d.candidate);
  });
  socket.on('call:end', (d) => {
    if (incoming && incoming.from === d.from) { clearTimeout(incoming.timer); incoming = null; hideRinging(); Sounds.ring(false); return toast(`Verpasster Anruf von ${dn(d.from)}`); }
    if (call && d.from === call.peer) endCall(true, 'Anruf beendet');
  });
  socket.on('call:decline', (d) => { if (call && d.from === call.peer) endCall(true, d.busy ? `${dn(d.from)} ist gerade in einem anderen Anruf` : 'Anruf abgelehnt'); });
  socket.on('call:media', (d) => { if (!call || d.from !== call.peer) return; call.remote = { mute: !!d.mute, cam: !!d.cam, screen: !!d.screen }; renderCallUI(); });
  socket.on('call:sound', (d) => {
    if (!call || d.from !== call.peer || !d.sound) return;
    const s = d.sound.media ? { media: String(d.sound.media) } : Sounds.SOUNDS.find((x) => x.key === d.sound.key);
    if (!s) return;
    Sounds.playSound(s, PREFS.sbVol);
    sbNote(`🔊 ${dn(d.from)}: ${d.sound.media ? (d.sound.emoji || '🔊') + ' ' + (d.sound.name || 'Sound') : s.emoji + ' ' + s.name}`);
  });
}
window.addEventListener('resize', updateCallPill);

/* ---------- Soundboard im Anruf ---------- */
let sbCool = 0, sbNoteT;
function renderSoundboard() {
  if (!call) return;
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
  if (call && call.pc) socket.emit('call:sound', { to: call.peer, sound: payload });
  sbNote(`🔊 Du: ${s.emoji} ${s.name}`);
}
function sbNote(t) {
  $('sbToast').textContent = t;
  $('sbToast').classList.remove('hidden');
  clearTimeout(sbNoteT);
  sbNoteT = setTimeout(() => $('sbToast').classList.add('hidden'), 2500);
}

/* ---------- Einstellungen: Sprache & Video ---------- */
let micTest = null;
function stopMicTest() { if (micTest) { micTest.stop(); micTest.stream.getTracks().forEach((t) => t.stop()); micTest = null; } }
function voiceSettingsHtml() {
  return `<div class="vgrid">
    <div class="field"><span class="label">🎤 Mikrofon</span><select class="input" id="selMic"><option value="">Standard</option></select></div>
    <div class="field"><span class="label">🔈 Lautsprecher</span><select class="input" id="selSpk"><option value="">Standard</option></select></div>
    <div class="field"><span class="label">🎥 Kamera</span><select class="input" id="selCam"><option value="">Standard</option></select></div>
  </div>
  <div class="mictest"><div class="label" style="margin-bottom:8px">Mikrofon testen</div>
    <div class="mt-row"><button class="btn small" id="micTestBtn">Test starten</button><div class="mt-bar"><i id="micTestLvl"></i></div></div>
    <p class="muted" id="micTestHint" style="font-size:13px;margin-top:8px">Sprich etwas – der Balken sollte sich bewegen. Wenn nicht, wähle oben ein anderes Mikrofon.</p>
  </div>
  <div class="toggle ${PREFS.echo !== false ? 'on' : ''}" data-vpref="echo"><div><b>Echo-Unterdrückung</b><small>Verhindert, dass dein Gegenüber sich selbst hört</small></div><span class="sw"></span></div>
  <div class="toggle ${PREFS.noise !== false ? 'on' : ''}" data-vpref="noise"><div><b>Rauschunterdrückung</b><small>Filtert Hintergrundgeräusche</small></div><span class="sw"></span></div>
  <div class="toggle ${PREFS.agc !== false ? 'on' : ''}" data-vpref="agc"><div><b>Automatische Lautstärke</b><small>Passt deine Mikrofonlautstärke automatisch an</small></div><span class="sw"></span></div>
  <p class="muted" style="font-size:13px;margin-top:8px">Tipp: Wenn dich andere im Anruf nicht hören, ist oft das falsche Mikrofon ausgewählt (z. B. eine Webcam oder ein virtuelles Gerät). Teste es hier und wähle das richtige aus. Änderungen gelten ab dem nächsten Anruf.</p>`;
}
async function fillDevices() {
  if (!navigator.mediaDevices || !navigator.mediaDevices.enumerateDevices) return;
  const devs = await navigator.mediaDevices.enumerateDevices();
  const fill = (id, kind, pref) => {
    const el = $(id); if (!el) return;
    const list = devs.filter((d) => d.kind === kind && d.deviceId && d.deviceId !== 'default' && d.deviceId !== 'communications');
    el.innerHTML = `<option value="">Standard</option>` + list.map((d, i) => `<option value="${esc(d.deviceId)}" ${PREFS[pref] === d.deviceId ? 'selected' : ''}>${esc(d.label || `${kind === 'audioinput' ? 'Mikrofon' : kind === 'videoinput' ? 'Kamera' : 'Lautsprecher'} ${i + 1}`)}</option>`).join('');
  };
  fill('selMic', 'audioinput', 'micId'); fill('selCam', 'videoinput', 'camId'); fill('selSpk', 'audiooutput', 'spkId');
  if (!('setSinkId' in HTMLMediaElement.prototype) && $('selSpk')) { $('selSpk').disabled = true; $('selSpk').innerHTML = '<option>Wird von diesem Browser nicht unterstützt</option>'; }
}
function voiceSettingsMount() {
  fillDevices();
  $('selMic').onchange = () => { PREFS.micId = $('selMic').value; savePrefs(); if (micTest) { stopMicTest(); $('micTestBtn').click(); } };
  $('selCam').onchange = () => { PREFS.camId = $('selCam').value; savePrefs(); };
  $('selSpk').onchange = () => { PREFS.spkId = $('selSpk').value; savePrefs(); if (PREFS.spkId && $('remoteA').setSinkId) $('remoteA').setSinkId(PREFS.spkId).catch(() => {}); };
  $('micTestBtn').onclick = async () => {
    if (micTest) { stopMicTest(); $('micTestBtn').textContent = 'Test starten'; $('micTestLvl').style.width = '0'; return; }
    let stream;
    try { stream = await getMic(); } catch (e) { return mediaError(e, 'Mikrofon'); }
    let peak = 0;
    const stop = meter(stream, (l) => { const el = $('micTestLvl'); if (el) el.style.width = Math.round(l * 100) + '%'; peak = Math.max(peak, l); });
    micTest = { stream, stop };
    $('micTestBtn').textContent = 'Test beenden';
    const label = stream.getAudioTracks()[0].label;
    $('micTestHint').textContent = `Aktives Mikrofon: ${label || 'Standard'}. Sprich etwas – der Balken sollte sich bewegen.`;
    fillDevices();
    setTimeout(() => { if (micTest && micTest.stream === stream && peak < 0.03 && $('micTestHint')) $('micTestHint').textContent = `⚠️ Von „${label || 'diesem Mikrofon'}“ kommt kaum etwas an. Wähle oben ein anderes Mikrofon oder prüfe, ob es stummgeschaltet ist.`; }, 4000);
  };
  document.querySelectorAll('[data-vpref]').forEach((el) => el.onclick = () => { const k = el.dataset.vpref; PREFS[k] = PREFS[k] === false; savePrefs(); el.classList.toggle('on', PREFS[k] !== false); });
}
