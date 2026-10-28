/* Connecta – Start (wird als letztes geladen) */
(function () {
  const m = location.pathname.match(/^\/invite\/([\w-]{4,20})/);
  if (m) { store.set('pendingInvite', m[1]); history.replaceState(null, '', '/'); }
  else if (location.pathname !== '/' && location.pathname !== '/index.html') history.replaceState(null, '', '/');
  if (m && !TOKEN) $('authErr').textContent = 'Melde dich an oder registriere dich, um dem Server beizutreten.';
})();
function onFirstState() {
  const code = store.get('pendingInvite');
  if (code) { store.del('pendingInvite'); setTimeout(() => openAddGuild('join', code), 300); }
}
if ('serviceWorker' in navigator) navigator.serviceWorker.getRegistrations().then((r) => r.forEach((x) => x.unregister())).catch(() => {});
if (TOKEN) start(TOKEN);
