/* =========================================================
   Connecta – Emoji- und GIF-Auswahl
   ========================================================= */
const EMOJI = {
  '😀': ['Smileys', '😀 😃 😄 😁 😆 🥹 😅 😂 🤣 🥲 😊 😇 🙂 🙃 😉 😌 😍 🥰 😘 😗 😙 😚 😋 😛 😝 😜 🤪 🤨 🧐 🤓 😎 🥸 🤩 🥳 😏 😒 😞 😔 😟 😕 🙁 😣 😖 😫 😩 🥺 😢 😭 😤 😠 😡 🤬 🤯 😳 🥵 🥶 😱 😨 😰 😥 😓 🤗 🤔 🫣 🤭 🫢 🫡 🤫 🫠 🤥 😶 🫥 😐 😑 😬 🙄 😯 😦 😧 😮 😲 🥱 😴 🤤 😪 😵 🤐 🥴 🤢 🤮 🤧 😷 🤒 🤕 🤑 🤠 😈 👿 👹 👺 🤡 💩 👻 💀 👽 🤖 🎃 😺 😸 😹 😻 😼 😽 🙀 😿 😾'],
  '👋': ['Gesten & Menschen', '👋 🤚 🖐️ ✋ 🖖 👌 🤌 🤏 ✌️ 🤞 🫰 🤟 🤘 🤙 👈 👉 👆 🖕 👇 ☝️ 👍 👎 ✊ 👊 🤛 🤜 👏 🙌 🫶 👐 🤲 🤝 🙏 ✍️ 💅 🤳 💪 🦾 🧠 🫀 👀 👁️ 👅 👄 🫦 👶 🧒 👦 👧 🧑 👱 👨 🧔 👩 🧓 👴 👵 🙍 🙎 🙅 🙆 💁 🙋 🧏 🙇 🤦 🤷 👮 🕵️ 💂 🥷 👷 🤴 👸 🧙 🧚 🧛 🧜 🧝 🦸 🦹 💃 🕺 👯 🧘 🏃 🚶 🧍 🧎'],
  '❤️': ['Herzen & Symbole', '❤️ 🧡 💛 💚 💙 💜 🖤 🤍 🤎 💔 ❤️‍🔥 ❤️‍🩹 ❣️ 💕 💞 💓 💗 💖 💘 💝 💟 ☮️ ✝️ ☯️ 🔯 ♈ ⛎ 🆔 ⚛️ 💯 💢 💥 💫 💦 💨 🕳️ 💬 👁️‍🗨️ 🗨️ 💭 💤 ✅ ☑️ ✔️ ❌ ❎ ➕ ➖ ➗ ✖️ ♾️ ‼️ ⁉️ ❓ ❔ ❕ ❗ 〰️ 💲 ⚠️ 🚸 ⛔ 🚫 🔞 📵 🔅 🔆 🔱 ⚜️ 🔰 ♻️ ✳️ ❇️ 💠 🌀 🎵 🎶 ➡️ ⬅️ ⬆️ ⬇️ 🔄 🔝 🆗 🆕 🆒 🆓 🔥 ✨ ⭐ 🌟 ⚡ 🎉 🎊'],
  '🐶': ['Tiere & Natur', '🐶 🐱 🐭 🐹 🐰 🦊 🐻 🐼 🐻‍❄️ 🐨 🐯 🦁 🐮 🐷 🐸 🐵 🙈 🙉 🙊 🐒 🐔 🐧 🐦 🐤 🦆 🦅 🦉 🦇 🐺 🐗 🐴 🦄 🐝 🪱 🐛 🦋 🐌 🐞 🐜 🪰 🕷️ 🦂 🐢 🐍 🦎 🦖 🦕 🐙 🦑 🦐 🦞 🦀 🐡 🐠 🐟 🐬 🐳 🐋 🦈 🐊 🐅 🐆 🦓 🦍 🦧 🐘 🦛 🦏 🐪 🦒 🦘 🐃 🐄 🐎 🐖 🐏 🐑 🦙 🐐 🦌 🐕 🐩 🦮 🐈 🐈‍⬛ 🪶 🐓 🦃 🦚 🦜 🦢 🦩 🕊️ 🐇 🦝 🦨 🦡 🦫 🦦 🦥 🐁 🐀 🐿️ 🦔 🌵 🎄 🌲 🌳 🌴 🌱 🌿 ☘️ 🍀 🍁 🍂 🍃 🍄 🌾 💐 🌷 🌹 🥀 🌺 🌸 🌼 🌻 🌞 🌝 🌚 🌙 🌎 🪐 ⭐ ☀️ ⛅ ☁️ 🌧️ ⛈️ 🌩️ ❄️ ☃️ ⛄ 🌈 🌊'],
  '🍕': ['Essen & Trinken', '🍏 🍎 🍐 🍊 🍋 🍌 🍉 🍇 🍓 🫐 🍈 🍒 🍑 🥭 🍍 🥥 🥝 🍅 🍆 🥑 🥦 🥬 🥒 🌶️ 🫑 🌽 🥕 🧄 🧅 🥔 🍠 🥐 🥯 🍞 🥖 🥨 🧀 🥚 🍳 🧈 🥞 🧇 🥓 🥩 🍗 🍖 🌭 🍔 🍟 🍕 🫓 🥪 🥙 🧆 🌮 🌯 🫔 🥗 🥘 🫕 🥫 🍝 🍜 🍲 🍛 🍣 🍱 🥟 🦪 🍤 🍙 🍚 🍘 🍥 🥠 🥮 🍢 🍡 🍧 🍨 🍦 🥧 🧁 🍰 🎂 🍮 🍭 🍬 🍫 🍿 🍩 🍪 🌰 🥜 🍯 🥛 🍼 ☕ 🍵 🧃 🥤 🧋 🍶 🍺 🍻 🥂 🍷 🥃 🍸 🍹 🧉 🍾 🧊'],
  '⚽': ['Aktivitäten', '⚽ 🏀 🏈 ⚾ 🥎 🎾 🏐 🏉 🥏 🎱 🪀 🏓 🏸 🏒 🏑 🥍 🏏 🪃 🥅 ⛳ 🪁 🏹 🎣 🤿 🥊 🥋 🎽 🛹 🛼 🛷 ⛸️ 🥌 🎿 ⛷️ 🏂 🪂 🏋️ 🤼 🤸 ⛹️ 🤺 🤾 🏌️ 🏇 🧘 🏄 🏊 🤽 🚣 🧗 🚵 🚴 🏆 🥇 🥈 🥉 🏅 🎖️ 🏵️ 🎗️ 🎫 🎟️ 🎪 🤹 🎭 🩰 🎨 🎬 🎤 🎧 🎼 🎹 🥁 🪘 🎷 🎺 🪗 🎸 🪕 🎻 🎲 ♟️ 🎯 🎳 🎮 🕹️ 🎰 🧩'],
  '🚗': ['Reisen & Orte', '🚗 🚕 🚙 🚌 🚎 🏎️ 🚓 🚑 🚒 🚐 🛻 🚚 🚛 🚜 🛵 🏍️ 🛺 🚲 🛴 🚨 🚔 🚍 🚘 🚖 🚡 🚠 🚟 🚃 🚋 🚞 🚝 🚄 🚅 🚈 🚂 🚆 🚇 🚊 🚉 ✈️ 🛫 🛬 🛩️ 💺 🛰️ 🚀 🛸 🚁 🛶 ⛵ 🚤 🛥️ 🛳️ ⛴️ 🚢 ⚓ 🗿 🗽 🗼 🏰 🏯 🏟️ 🎡 🎢 🎠 ⛲ ⛱️ 🏖️ 🏝️ 🏜️ 🌋 ⛰️ 🏔️ 🗻 🏕️ ⛺ 🏠 🏡 🏘️ 🏚️ 🏗️ 🏭 🏢 🏬 🏣 🏤 🏥 🏦 🏨 🏪 🏫 🏩 💒 🏛️ ⛪ 🕌 🕍 🛕 🕋 ⛩️ 🗾 🎑 🏞️ 🌅 🌄 🌠 🎇 🎆 🌇 🌆 🏙️ 🌃 🌌 🌉 🌁'],
  '💡': ['Objekte', '⌚ 📱 📲 💻 ⌨️ 🖥️ 🖨️ 🖱️ 🕹️ 💽 💾 💿 📀 📼 📷 📸 📹 🎥 📞 ☎️ 📟 📠 📺 📻 🎙️ ⏰ ⏳ 📡 🔋 🔌 💡 🔦 🕯️ 🧯 💸 💵 💶 💰 💳 💎 ⚖️ 🧰 🔧 🔨 ⚒️ 🛠️ ⛏️ 🔩 ⚙️ 🧱 ⛓️ 🧲 🔫 💣 🧨 🪓 🔪 🗡️ ⚔️ 🛡️ 🚬 ⚰️ 🔮 📿 🧿 💈 ⚗️ 🔭 🔬 💊 💉 🩸 🧬 🦠 🧫 🧪 🌡️ 🧹 🧺 🧻 🚽 🛁 🧼 🪥 🧽 🔑 🗝️ 🚪 🛋️ 🛏️ 🧸 🪆 🖼️ 🪞 🛍️ 🛒 🎁 🎈 🎏 🎀 🪄 🪅 🎊 🎉 🎎 🏮 🎐 🧧 ✉️ 📩 📨 📧 💌 📦 🏷️ 📪 📬 📜 📃 📄 📑 🧾 📊 📈 📉 🗒️ 🗓️ 📆 📅 📇 🗃️ 🗳️ 🗄️ 📋 📁 📂 🗂️ 🗞️ 📰 📓 📔 📒 📕 📗 📘 📙 📚 📖 🔖 🧷 🔗 📎 🖇️ 📐 📏 🧮 📌 📍 ✂️ 🖊️ 🖋️ ✒️ 🖌️ 🖍️ 📝 ✏️ 🔍 🔎 🔏 🔐 🔒 🔓'],
  '🏳️': ['Flaggen', '🏳️ 🏴 🏁 🚩 🏳️‍🌈 🏳️‍⚧️ 🏴‍☠️ 🇩🇪 🇦🇹 🇨🇭 🇪🇺 🇬🇧 🇺🇸 🇫🇷 🇪🇸 🇮🇹 🇵🇹 🇳🇱 🇧🇪 🇵🇱 🇨🇿 🇩🇰 🇸🇪 🇳🇴 🇫🇮 🇮🇪 🇬🇷 🇹🇷 🇺🇦 🇷🇺 🇭🇷 🇷🇸 🇧🇦 🇦🇱 🇷🇴 🇧🇬 🇭🇺 🇸🇰 🇸🇮 🇱🇺 🇮🇸 🇨🇦 🇲🇽 🇧🇷 🇦🇷 🇨🇴 🇯🇵 🇰🇷 🇨🇳 🇮🇳 🇹🇭 🇻🇳 🇮🇩 🇵🇭 🇦🇺 🇳🇿 🇿🇦 🇪🇬 🇲🇦 🇳🇬 🇸🇦 🇦🇪 🇮🇱 🇮🇷 🇸🇾 🇮🇶 🇦🇫 🇵🇰'],
};
const EMOJI_KEYS = Object.keys(EMOJI);
$('emojiBtn').innerHTML = I.smile;
let pickMode = null, emoCat = 'recent', gifQ = '', gifT = null;
const recentEmojis = () => { try { return JSON.parse(store.get('recentEmoji') || '[]'); } catch { return []; } };
function closePicker() { pickMode = null; $('pickerBox').classList.add('hidden'); $('emojiBtn').classList.remove('on'); $('gifBtn').classList.remove('on'); }
function openPicker(mode) {
  if (pickMode === mode) return closePicker();
  pickMode = mode;
  closeMention();
  $('emojiBtn').classList.toggle('on', mode === 'emoji');
  $('gifBtn').classList.toggle('on', mode === 'gif');
  $('pickerBox').classList.remove('hidden');
  mode === 'emoji' ? renderEmoji() : renderGif();
}
function renderEmoji() {
  const rec = recentEmojis();
  if (emoCat === 'recent' && !rec.length) emoCat = EMOJI_KEYS[0];
  const list = emoCat === 'recent' ? rec : EMOJI[emoCat][1].split(' ');
  $('pickerBox').innerHTML = `<div class="pk-tabs">${rec.length ? `<button class="${emoCat === 'recent' ? 'on' : ''}" data-emocat="recent" title="Zuletzt verwendet">🕘</button>` : ''}${EMOJI_KEYS.map((k) => `<button class="${emoCat === k ? 'on' : ''}" data-emocat="${k}" title="${EMOJI[k][0]}">${k}</button>`).join('')}</div>
    <div class="pk-title">${emoCat === 'recent' ? 'Zuletzt verwendet' : EMOJI[emoCat][0]}</div>
    <div class="emogrid">${list.map((e) => `<button data-emo="${e}">${e}</button>`).join('')}</div>`;
}
function insertEmoji(e) {
  const t = $('text');
  const s = t.selectionStart ?? t.value.length, en = t.selectionEnd ?? t.value.length;
  t.value = t.value.slice(0, s) + e + t.value.slice(en);
  const pos = s + e.length;
  t.focus(); t.setSelectionRange(pos, pos);
  autoGrow(); updateSendBtn();
  const rec = [e, ...recentEmojis().filter((x) => x !== e)].slice(0, 32);
  store.set('recentEmoji', JSON.stringify(rec));
}
async function renderGif() {
  if (!$('gifSearch')) {
    $('pickerBox').innerHTML = `<div class="searchbox" style="margin:2px 2px 10px">${I.search}<input class="input" id="gifSearch" placeholder="GIFs suchen (z. B. lol, hallo, katze)" autocomplete="off" value="${esc(gifQ)}"></div><div class="gifgrid" id="gifGrid"><div class="emptylist">Lade GIFs…</div></div><div class="gifby">Powered by GIPHY</div>`;
    $('gifSearch').oninput = () => { clearTimeout(gifT); gifT = setTimeout(() => { gifQ = $('gifSearch').value.trim(); loadGifs(); }, 350); };
    setTimeout(() => $('gifSearch') && $('gifSearch').focus(), 30);
  }
  loadGifs();
}
async function loadGifs() {
  const q = gifQ;
  let d;
  try { d = await (await fetch('/api/gifs?q=' + encodeURIComponent(q), { headers: { 'x-token': TOKEN } })).json(); } catch { d = { error: 'GIFs konnten nicht geladen werden.' }; }
  if (pickMode !== 'gif' || q !== gifQ || !$('gifGrid')) return;
  if (d.error === 'nokey') { $('gifGrid').innerHTML = `<div class="emptylist">🎞️<br><b>GIFs sind noch nicht eingerichtet.</b><br>${S.isOwner ? 'Hol dir einen kostenlosen API-Schlüssel auf developers.giphy.com und trag ihn bei Render als <b>GIPHY_API_KEY</b> ein.' : 'Der Betreiber muss GIFs erst aktivieren.'}<br><small>Eigene GIF-Dateien kannst du trotzdem über 📎 senden.</small></div>`; return; }
  if (d.error) { $('gifGrid').innerHTML = `<div class="emptylist">${esc(d.error)}</div>`; return; }
  if (!d.gifs.length) { $('gifGrid').innerHTML = `<div class="emptylist">Keine GIFs gefunden.</div>`; return; }
  window._gifs = d.gifs;
  $('gifGrid').innerHTML = d.gifs.map((g, i) => `<button data-gif="${i}" title="${esc(g.title)}"><img src="${esc(g.preview)}" loading="lazy" alt="${esc(g.title)}"></button>`).join('');
}
function sendGif(g) {
  if (!current || !canSendHere()) return;
  socket.emit('message', { conv: current, text: '', att: [{ kind: 'gif', url: g.url, w: g.w, h: g.h }], reply: replyTo && replyTo.conv === current ? replyTo.id : null }, (r) => r && r.error && toast(r.error));
  setReply(null);
  closePicker();
}
$('emojiBtn').onclick = () => openPicker('emoji');
$('gifBtn').onclick = () => openPicker('gif');
document.addEventListener('click', (e) => {
  const t = e.target.closest('[data-emo],[data-emocat],[data-gif]');
  if (t) {
    if ('emo' in t.dataset) return insertEmoji(t.dataset.emo);
    if ('emocat' in t.dataset) { emoCat = t.dataset.emocat; return renderEmoji(); }
    if ('gif' in t.dataset) return sendGif(window._gifs[+t.dataset.gif]);
  }
});
document.addEventListener('mousedown', (e) => { if (pickMode && !e.target.closest('#pickerBox,#emojiBtn,#gifBtn')) closePicker(); });
document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && pickMode) closePicker(); });
