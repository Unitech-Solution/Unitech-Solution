// Local server for testing the site:  node serve.js [--open]
// ("Rodar site.bat" runs it with --open: double-click and the site opens in the browser.)
//
// - Serves this folder on http://localhost:5500 — or the next free port, if another program
//   already holds 5500. If this site is already running there, it just opens the browser again.
// - Sends every file with "no-store", so a normal refresh (F5) always shows the latest edits.
// - Also reachable from a phone on the same Wi-Fi (the address is printed at start-up).
const http = require('http');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { exec } = require('child_process');

const FIRST_PORT = Number(process.env.PORT) || 5500;
const LAST_PORT = FIRST_PORT + 10;
const ROOT = __dirname;
const OPEN = process.argv.includes('--open');
const SIGNATURE = 'unitech-local';          // response header that tells "this site" apart from other servers
const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json',
  '.webmanifest': 'application/manifest+json',
  '.txt': 'text/plain; charset=utf-8',
  '.xml': 'application/xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
  '.woff2': 'font/woff2',
  '.woff': 'font/woff',
  '.ttf': 'font/ttf',
};

function openBrowser(url) {
  const cmd = process.platform === 'win32' ? `start "" "${url}"`
    : process.platform === 'darwin' ? `open "${url}"` : `xdg-open "${url}"`;
  exec(cmd);
}

// the address a phone on the same network can use — the Wi-Fi / Ethernet one, not a VPN or virtual adapter
function lanAddress() {
  const found = [];
  for (const [name, list] of Object.entries(os.networkInterfaces())) {
    if (/vethernet|virtualbox|vmware|wsl|hyper-v|bluetooth|loopback|tailscale|zerotier/i.test(name)) continue;
    for (const a of list || []) {
      if (a.family === 'IPv4' && !a.internal) found.push({ address: a.address, real: /wi-?fi|wireless|wlan|ethernet/i.test(name) });
    }
  }
  found.sort((x, y) => y.real - x.real);
  return found.length ? found[0].address : null;
}

const server = http.createServer((req, res) => {
  let urlPath;
  try { urlPath = decodeURIComponent(req.url.split('?')[0]); } catch (e) { res.writeHead(400); return res.end(); }
  if (urlPath.endsWith('/')) urlPath += 'index.html';
  const filePath = path.join(ROOT, urlPath);
  // stay inside this folder, and keep hidden folders (.git, .firebase, …) private
  if (!filePath.startsWith(ROOT + path.sep) || /[\\/]\./.test(filePath.slice(ROOT.length))) {
    res.writeHead(403);
    return res.end('Acesso negado');
  }
  fs.readFile(filePath, (err, data) => {
    if (err) {
      if (!urlPath.endsWith('favicon.ico')) console.log(`  404  ${urlPath}`);
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8', 'X-Served-By': SIGNATURE });
      return res.end('Ficheiro nao encontrado: ' + urlPath);
    }
    res.writeHead(200, {
      'Content-Type': MIME[path.extname(filePath).toLowerCase()] || 'application/octet-stream',
      'Cache-Control': 'no-store',
      'X-Served-By': SIGNATURE,
    });
    res.end(data);
  });
});

// is it this site that is already answering on that port?
function isThisSite(port) {
  return new Promise((resolve) => {
    const req = http.get({ host: '127.0.0.1', port, path: '/index.html', timeout: 1500 }, (res) => {
      let body = '';
      res.setEncoding('utf8');
      res.on('data', (c) => { if (body.length < 4000) body += c; });
      res.on('end', () => resolve(res.headers['x-served-by'] === SIGNATURE || /Unitech Solution/i.test(body)));
    });
    req.on('timeout', () => { req.destroy(); resolve(false); });
    req.on('error', () => resolve(false));
  });
}

// one 'listening' handler for whichever port finally worked (a callback per attempt would
// fire for the failed ports too, and open the browser on a port held by another program)
server.on('listening', () => {
  server.removeAllListeners('error');
  server.on('error', (err) => console.error(err));
  const port = server.address().port;
  const url = `http://localhost:${port}/`;
  const lan = lanAddress();
  console.log('');
  console.log('  Unitech Solution — site local');
  console.log('  -----------------------------');
  console.log(`  Neste computador:  ${url}`);
  if (lan) console.log(`  No telemóvel:      http://${lan}:${port}/   (ligado à mesma rede Wi-Fi)`);
  console.log('');
  console.log('  As alterações aparecem ao actualizar a página (F5).');
  console.log('  Para parar o site, feche esta janela.');
  console.log('');
  if (OPEN) openBrowser(url);
});

function listen(port) {
  server.once('error', async (err) => {
    if (err.code !== 'EADDRINUSE') { console.error(err); process.exit(1); }
    if (await isThisSite(port)) {
      const url = `http://localhost:${port}/`;
      console.log(`\n  O site já está a correr noutra janela: ${url}`);
      if (OPEN) { console.log('  Abri-o no browser.'); openBrowser(url); }
      process.exit(2);                          // "Rodar site.bat" closes its window on this code
    }
    if (port >= LAST_PORT) {
      console.error(`\n  As portas ${FIRST_PORT}–${LAST_PORT} estão todas ocupadas por outros programas.`);
      process.exit(1);
    }
    listen(port + 1);                           // another program holds this port: try the next one
  });
  server.listen(port);
}

listen(FIRST_PORT);
