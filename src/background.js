// Service worker : relecture des fichiers locaux pour l'actualisation automatique.
const MD_FILE = /^file:\/\/\/[^?#]*\.(md|markdown|mdown|mkd)(\?.*)?$/i;

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (!msg || msg.type !== 'read-file') return;
  // L'URL vient du navigateur (sender.url), jamais du message : seul le document affiché est relu.
  const url = String(sender.url || '').split('#')[0];
  if (sender.id !== chrome.runtime.id || !sender.tab || sender.frameId !== 0 || !MD_FILE.test(url)) {
    sendResponse({ ok: false, error: 'lecture non autorisée' });
    return;
  }
  fetch(url, { cache: 'no-store' }).then((r) => r.text()).then(
    (text) => sendResponse({ ok: true, text }),
    (e) => sendResponse({ ok: false, error: e.message })
  );
  return true;   // réponse asynchrone
});
