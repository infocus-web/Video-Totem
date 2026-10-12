const allowed = new Set(['fileSystem', 'clipboard-read', 'clipboard-sanitized-write', 'fullscreen']);
const trusted = value => {
  try { const url = new URL(value); return url.protocol === 'autoreel:' && url.hostname === 'studio'; }
  catch { return false; }
};
function canCheck(contents, permission, requestingOrigin) {
  return !!contents && !contents.isDestroyed() && trusted(contents.getURL()) && trusted(requestingOrigin) && allowed.has(permission);
}
function canRequest(contents, permission, details) {
  // Chromium reports isMainFrame=false for fileSystem, including top-level requests.
  return canCheck(contents, permission, details.requestingUrl) && (permission === 'fileSystem' || details.isMainFrame === true);
}
module.exports = { trusted, canCheck, canRequest };
