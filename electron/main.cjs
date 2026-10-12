const { app, BrowserWindow, Menu, protocol, net, session, dialog, powerSaveBlocker } = require('electron');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

const origin = 'autoreel://studio';
const trusted = value => { try { const url = new URL(value); return url.protocol === 'autoreel:' && url.hostname === 'studio'; } catch { return false; } };
protocol.registerSchemesAsPrivileged([{ scheme: 'autoreel', privileges: { standard: true, secure: true, supportFetchAPI: true, stream: true } }]);
app.setName('AutoReel Studio');
app.setPath('userData', process.env.AUTOREEL_TEST_DATA || path.join(app.getPath('appData'), 'AutoReel Studio'));
app.setAppUserModelId('com.infocus.autoreel');
const single = process.env.AUTOREEL_TEST_DATA || app.requestSingleInstanceLock();
let window;
if (!single) app.quit();

function createWindow() {
  window = new BrowserWindow({
    title: 'AutoReel Studio', width: 1600, height: 1000, minWidth: 1000, minHeight: 680,
    show: !process.env.AUTOREEL_TEST_DATA, backgroundColor: '#101010',
    webPreferences: { nodeIntegration: false, contextIsolation: true, sandbox: true, backgroundThrottling: false, spellcheck: false },
  });
  window.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  window.webContents.on('will-navigate', (event, url) => { if (!trusted(url)) event.preventDefault(); });
  window.webContents.on('render-process-gone', (_event, details) => {
    if (details.reason !== 'clean-exit') dialog.showErrorBox('AutoReel Studio', 'La vista previa se cerró inesperadamente. Volvé a abrir la app para recuperar el proyecto guardado.');
  });
  void window.loadURL(origin + '/');
  Menu.setApplicationMenu(Menu.buildFromTemplate([
    { label: 'Archivo', submenu: [{ label: 'Salir', role: 'quit' }] },
    { label: 'Editar', submenu: [{ role: 'undo' }, { role: 'redo' }, { type: 'separator' }, { role: 'cut' }, { role: 'copy' }, { role: 'paste' }, { role: 'selectAll' }] },
    { label: 'Vista', submenu: [{ label: 'Recargar', role: 'reload' }, { label: 'Restablecer zoom', role: 'resetZoom' }, { label: 'Acercar', role: 'zoomIn' }, { label: 'Alejar', role: 'zoomOut' }, { label: 'Pantalla completa', role: 'togglefullscreen' }] },
  ]));
}

if (single) app.whenReady().then(() => {
  const root = path.join(app.getAppPath(), 'dist');
  protocol.handle('autoreel', async request => {
    try {
      const url = new URL(request.url);
      if (!trusted(request.url) || !['GET', 'HEAD'].includes(request.method)) return new Response(null, { status: 403 });
      const target = path.resolve(root, '.' + decodeURIComponent(url.pathname === '/' ? '/index.html' : url.pathname));
      const relative = path.relative(root, target);
      if (!relative || relative.startsWith('..') || path.isAbsolute(relative)) return new Response(null, { status: 403 });
      return await net.fetch(pathToFileURL(target).toString());
    } catch { return new Response(null, { status: 404 }); }
  });
  const allowed = new Set(['fileSystem', 'clipboard-read', 'clipboard-sanitized-write', 'fullscreen']);
  session.defaultSession.setPermissionCheckHandler((contents, permission, requestingOrigin) => !!contents && trusted(contents.getURL()) && trusted(requestingOrigin) && allowed.has(permission));
  session.defaultSession.setPermissionRequestHandler((contents, permission, callback, details) => callback(trusted(contents.getURL()) && trusted(details.requestingUrl) && details.isMainFrame && allowed.has(permission)));
  session.defaultSession.webRequest.onBeforeRequest((details, callback) => {
    // Solo recursos empaquetados y medios locales. El ejecutable no carga la web de Vercel.
    callback({ cancel: !/^(autoreel:|blob:|data:|file:)/.test(details.url) });
  });
  session.defaultSession.on('will-download', (_event, item) => {
    item.setSaveDialogOptions({ title: 'Guardar archivo de AutoReel', defaultPath: path.join(app.getPath('downloads'), item.getFilename()) });
  });
  const blocker = powerSaveBlocker.start('prevent-app-suspension');
  app.once('will-quit', () => { if (powerSaveBlocker.isStarted(blocker)) powerSaveBlocker.stop(blocker); });
  createWindow();
  app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });
}).catch(error => { dialog.showErrorBox('No se pudo abrir AutoReel Studio', error.message); app.quit(); });
app.on('second-instance', () => { if (window) { if (window.isMinimized()) window.restore(); window.show(); window.focus(); } });
app.on('window-all-closed', () => app.quit());
