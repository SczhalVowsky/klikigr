// Weekly Report server — tanpa dependency, cukup `node server.js`.
// Data disimpan di data/reports.json. Hapus file itu (atau pakai tombol
// "Hapus Semua Data" di halaman admin) untuk mengosongkan laporan harian.

const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const PORT = Number(process.env.PORT) || 3000;
const ADMIN_PIN = process.env.ADMIN_PIN || 'admin123';
const DATA_DIR = path.join(__dirname, 'data');
const DATA_FILE = path.join(DATA_DIR, 'reports.json');
const PUBLIC_DIR = path.join(__dirname, 'public');
const MAX_BODY = 40 * 1024 * 1024; // foto disimpan base64 di JSON

const DIVISIONS = [
  'logistik1', 'klik', 'logistik2', 'ga', 'member-relation', 'member-service',
  'omi', 'food', 'nonfood', 'perishable', 'cashier', 'support',
];

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.json': 'application/json; charset=utf-8',
  '.ico': 'image/x-icon',
};

const adminTokens = new Set();
const loginFails = new Map(); // ip -> { count, until }

function emptyStore() {
  return { settings: { tanggal: '' }, reports: {} };
}

function readStore() {
  try {
    const store = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
    return { ...emptyStore(), ...store, settings: { ...emptyStore().settings, ...store.settings } };
  } catch {
    return emptyStore();
  }
}

function writeStore(store) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  const tmp = DATA_FILE + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(store, null, 1));
  fs.renameSync(tmp, DATA_FILE);
}

function send(res, status, body) {
  res.writeHead(status, { 'Content-Type': MIME['.json'], 'Cache-Control': 'no-store' });
  res.end(JSON.stringify(body));
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    req.on('data', (c) => {
      size += c.length;
      if (size > MAX_BODY) {
        reject(Object.assign(new Error('Data terlalu besar (maks 40MB)'), { status: 413 }));
        req.destroy();
        return;
      }
      chunks.push(c);
    });
    req.on('end', () => {
      try {
        resolve(chunks.length ? JSON.parse(Buffer.concat(chunks).toString('utf8')) : {});
      } catch {
        reject(Object.assign(new Error('JSON tidak valid'), { status: 400 }));
      }
    });
    req.on('error', reject);
  });
}

function isAdmin(req) {
  const token = req.headers['x-admin-token'];
  return typeof token === 'string' && adminTokens.has(token);
}

async function handleApi(req, res, url) {
  const parts = url.pathname.split('/').filter(Boolean); // ['api', ...]
  const method = req.method;

  // Pengaturan publik (judul tanggal) — dibaca semua, diubah admin saja.
  if (parts[1] === 'settings') {
    if (method === 'GET') return send(res, 200, readStore().settings);
    if (method === 'PUT') {
      if (!isAdmin(req)) return send(res, 401, { error: 'Khusus admin' });
      const body = await readBody(req);
      const store = readStore();
      store.settings.tanggal = String(body.tanggal || '').slice(0, 120);
      writeStore(store);
      return send(res, 200, store.settings);
    }
  }

  if (parts[1] === 'admin' && parts[2] === 'login' && method === 'POST') {
    const ip = req.socket.remoteAddress || '';
    const fail = loginFails.get(ip);
    if (fail && fail.until > Date.now()) return send(res, 429, { error: 'Terlalu banyak percobaan, coba lagi 1 menit lagi' });
    const body = await readBody(req);
    if (String(body.pin || '') !== ADMIN_PIN) {
      const count = (fail && fail.until > 0 && fail.until <= Date.now() ? 0 : fail?.count || 0) + 1;
      loginFails.set(ip, { count, until: count >= 5 ? Date.now() + 60_000 : 0 });
      return send(res, 401, { error: 'PIN salah' });
    }
    loginFails.delete(ip);
    const token = crypto.randomBytes(24).toString('hex');
    adminTokens.add(token);
    return send(res, 200, { token });
  }

  if (parts[1] === 'admin' && parts[2] === 'check') {
    return send(res, isAdmin(req) ? 200 : 401, { ok: isAdmin(req) });
  }

  // Semua laporan — khusus admin.
  if (parts[1] === 'reports' && parts.length === 2) {
    if (!isAdmin(req)) return send(res, 401, { error: 'Khusus admin' });
    if (method === 'GET') return send(res, 200, readStore());
    if (method === 'DELETE') {
      const store = readStore();
      store.reports = {};
      writeStore(store);
      return send(res, 200, { ok: true });
    }
  }

  // Laporan satu divisi — divisi hanya melihat datanya sendiri.
  if (parts[1] === 'reports' && parts.length === 3) {
    const div = parts[2];
    if (!DIVISIONS.includes(div)) return send(res, 404, { error: 'Divisi tidak dikenal' });
    const store = readStore();
    if (method === 'GET') return send(res, 200, store.reports[div] || null);
    if (method === 'PUT') {
      const body = await readBody(req);
      if (!body || typeof body.data !== 'object') return send(res, 400, { error: 'Format salah' });
      store.reports[div] = {
        division: div,
        pengisi: String(body.pengisi || '').slice(0, 80),
        periode: String(body.periode || '').slice(0, 120),
        data: body.data,
        updatedAt: new Date().toISOString(),
      };
      writeStore(store);
      return send(res, 200, store.reports[div]);
    }
    if (method === 'DELETE') {
      if (!isAdmin(req)) return send(res, 401, { error: 'Khusus admin' });
      delete store.reports[div];
      writeStore(store);
      return send(res, 200, { ok: true });
    }
  }

  return send(res, 404, { error: 'Tidak ditemukan' });
}

function serveStatic(req, res, url) {
  let rel = decodeURIComponent(url.pathname);
  if (rel === '/') rel = '/index.html';
  if (rel === '/admin') rel = '/admin.html';
  const file = path.normalize(path.join(PUBLIC_DIR, rel));
  if (!file.startsWith(PUBLIC_DIR + path.sep)) {
    res.writeHead(403);
    return res.end('Forbidden');
  }
  fs.readFile(file, (err, buf) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      return res.end('Halaman tidak ditemukan');
    }
    res.writeHead(200, { 'Content-Type': MIME[path.extname(file)] || 'application/octet-stream' });
    res.end(buf);
  });
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://localhost');
  try {
    if (url.pathname.startsWith('/api/')) return await handleApi(req, res, url);
    if (req.method !== 'GET') return send(res, 405, { error: 'Method tidak didukung' });
    serveStatic(req, res, url);
  } catch (err) {
    send(res, err.status || 500, { error: err.message || 'Server error' });
  }
});

server.listen(PORT, () => {
  console.log(`Weekly Report berjalan di http://localhost:${PORT}`);
  console.log(`Halaman admin: http://localhost:${PORT}/admin  (PIN: ${ADMIN_PIN === 'admin123' ? 'admin123 — ganti via ADMIN_PIN' : 'dari ADMIN_PIN'})`);
});
