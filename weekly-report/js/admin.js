/* Halaman admin: presentasi 3D seluruh laporan + maskot yang bergerak saat slide berganti. */
import * as THREE from '../vendor/three.module.min.js';

const { DIVISIONS, renderReport, esc } = window.WR;
const $ = (s) => document.querySelector(s);
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const TOKEN_KEY = 'wr-admin-token';
const PREF_KEY = 'wr-admin-show-empty';

const session = {
  get token() { try { return sessionStorage.getItem(TOKEN_KEY); } catch { return null; } },
  set token(v) { try { v ? sessionStorage.setItem(TOKEN_KEY, v) : sessionStorage.removeItem(TOKEN_KEY); } catch { /* abaikan */ } },
};
const pref = {
  get showEmpty() { try { return localStorage.getItem(PREF_KEY) === '1'; } catch { return false; } },
  set showEmpty(v) { try { localStorage.setItem(PREF_KEY, v ? '1' : '0'); } catch { /* abaikan */ } },
};

function toast(msg, kind = '') {
  const t = $('#toast');
  t.textContent = msg;
  t.className = `toast show ${kind}`;
  clearTimeout(t._h);
  t._h = setTimeout(() => (t.className = 'toast'), 3000);
}

async function api(path, opts = {}) {
  const res = await fetch(path, {
    ...opts,
    headers: { 'Content-Type': 'application/json', 'X-Admin-Token': session.token || '', ...(opts.headers || {}) },
  });
  const body = await res.json().catch(() => ({ error: `Server tidak membalas JSON (${res.status}) — pastikan PHP aktif` }));
  if (res.status === 401 && !path.includes('a=login')) { session.token = null; showLogin(); }
  if (!res.ok || body?.error) throw new Error(body?.error || `Gagal (${res.status})`);
  return body;
}

/* =====================================================================
 * Scene 3D (three.js): lorong berisi kardus, kristal, cincin portal per slide
 * ===================================================================== */
function createScene(canvas) {
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  } catch {
    canvas.style.background = 'radial-gradient(circle at 30% 20%, #1f4fbf, #070d24 70%)';
    return { setSlides() {}, go() {} };
  }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
  const scene = new THREE.Scene();
  const BG = new THREE.Color('#070d24');
  scene.background = BG;
  scene.fog = new THREE.FogExp2(BG, 0.022);

  const camera = new THREE.PerspectiveCamera(55, 1, 0.1, 400);
  camera.position.set(0, 0, 18);

  scene.add(new THREE.HemisphereLight(0x9fbaff, 0x12152c, 1.1));
  const sun = new THREE.DirectionalLight(0xffffff, 1.6);
  sun.position.set(6, 12, 8);
  scene.add(sun);
  const accent = new THREE.PointLight(0xffc20e, 90, 70, 1.6);
  scene.add(accent);

  const SPACING = 16;
  const DEPTH = 26 * SPACING;
  const palette = ['#e31e24', '#1f4fbf', '#ffc20e', '#f4f6fb', '#19a974', '#ff7a00'];
  const geos = [
    new THREE.BoxGeometry(1.4, 1, 1.1),
    new THREE.IcosahedronGeometry(0.75, 0),
    new THREE.TorusGeometry(0.62, 0.22, 14, 36),
    new THREE.OctahedronGeometry(0.8, 0),
    new THREE.CylinderGeometry(0.5, 0.5, 1.3, 20),
  ];
  const floaters = [];
  for (let i = 0; i < 110; i++) {
    const geo = geos[i % geos.length];
    const mat = new THREE.MeshStandardMaterial({
      color: palette[i % palette.length], metalness: 0.25, roughness: 0.35, flatShading: geo.type !== 'TorusGeometry',
    });
    const m = new THREE.Mesh(geo, mat);
    const side = Math.random() < 0.5 ? -1 : 1;
    m.position.set(side * (6 + Math.random() * 16), (Math.random() - 0.5) * 18, 14 - Math.random() * DEPTH);
    const s = 0.6 + Math.random() * 1.3;
    m.scale.setScalar(s);
    m.rotation.set(Math.random() * 6, Math.random() * 6, 0);
    m.userData = { rx: (Math.random() - 0.5) * 0.8, ry: (Math.random() - 0.5) * 0.8, phase: Math.random() * 6.28, baseY: m.position.y };
    scene.add(m);
    floaters.push(m);
  }

  // Bintang / partikel
  const starGeo = new THREE.BufferGeometry();
  const N = 2200;
  const pos = new Float32Array(N * 3);
  for (let i = 0; i < N; i++) {
    pos[i * 3] = (Math.random() - 0.5) * 120;
    pos[i * 3 + 1] = (Math.random() - 0.5) * 70;
    pos[i * 3 + 2] = 30 - Math.random() * (DEPTH + 60);
  }
  starGeo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const stars = new THREE.Points(starGeo, new THREE.PointsMaterial({ color: 0xffffff, size: 0.09, transparent: true, opacity: 0.75 }));
  scene.add(stars);

  // Lantai grid
  const grid = new THREE.GridHelper(DEPTH * 2, 220, 0x2f5bd8, 0x1a2b66);
  grid.position.set(0, -10, -DEPTH / 2);
  grid.material.transparent = true;
  grid.material.opacity = 0.35;
  scene.add(grid);

  // Cincin portal per slide
  let rings = [];
  function setSlides(colors) {
    rings.forEach((r) => { scene.remove(r); r.geometry.dispose(); r.material.dispose(); });
    rings = colors.map((c, i) => {
      const r = new THREE.Mesh(
        new THREE.TorusGeometry(11, 0.09, 8, 120),
        new THREE.MeshBasicMaterial({ color: c, transparent: true, opacity: 0.55 }),
      );
      r.position.set(0, 0, -i * SPACING - 9);
      scene.add(r);
      return r;
    });
  }

  const target = new THREE.Vector3(0, 0, 18);
  const look = new THREE.Vector3(0, 0, 0);
  const lookTarget = new THREE.Vector3(0, 0, 0);
  const accentTarget = new THREE.Color('#ffc20e');
  const mouse = { x: 0, y: 0 };
  window.addEventListener('pointermove', (e) => {
    mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
    mouse.y = (e.clientY / window.innerHeight) * 2 - 1;
  });

  function go(index, color) {
    target.set(Math.sin(index * 1.3) * 2.6, Math.cos(index * 0.9) * 1.2, 18 - index * SPACING);
    lookTarget.set(target.x * 0.2, target.y * 0.2, target.z - 30);
    accentTarget.set(color);
    rings.forEach((r, i) => { r.userData.boost = i === index ? 1 : 0; });
  }

  function resize() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
  window.addEventListener('resize', resize);
  resize();

  const clock = new THREE.Clock();
  function frame() {
    const dt = Math.min(clock.getDelta(), 0.05);
    const t = clock.elapsedTime;
    const k = reduceMotion ? 1 : 1 - Math.exp(-dt * 2.2);
    const px = reduceMotion ? 0 : mouse.x * 1.4;
    const py = reduceMotion ? 0 : -mouse.y * 0.9;
    camera.position.x += (target.x + px - camera.position.x) * k;
    camera.position.y += (target.y + py - camera.position.y) * k;
    camera.position.z += (target.z - camera.position.z) * k;
    look.lerp(lookTarget, k);
    camera.lookAt(look);
    accent.position.set(camera.position.x, camera.position.y + 3, camera.position.z - 10);
    accent.color.lerp(accentTarget, k);

    if (!reduceMotion) {
      floaters.forEach((m) => {
        m.rotation.x += m.userData.rx * dt;
        m.rotation.y += m.userData.ry * dt;
        m.position.y = m.userData.baseY + Math.sin(t * 0.7 + m.userData.phase) * 0.6;
      });
      stars.rotation.z = Math.sin(t * 0.05) * 0.05;
    }
    rings.forEach((r, i) => {
      r.rotation.z = t * 0.15 * (i % 2 ? 1 : -1);
      const want = r.userData.boost ? 0.95 : 0.4;
      r.material.opacity += (want - r.material.opacity) * 0.05;
      const sc = r.userData.boost ? 1 + Math.sin(t * 2) * 0.015 : 1;
      r.scale.setScalar(sc);
    });
    renderer.render(scene, camera);
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
  return { setSlides, go };
}

/* =====================================================================
 * Maskot: lompat melengkung ke sisi lain layar setiap slide berganti
 * ===================================================================== */
function createMascot() {
  const node = $('#mascot');
  const bubble = $('#bubble');
  let pos = null;
  let bubbleTimer = null;
  let anim = null;

  const size = () => node.getBoundingClientRect();
  function spot(side) {
    const r = size();
    const W = window.innerWidth;
    const H = window.innerHeight;
    const margin = W < 760 ? 6 : 18;
    return { x: side === 'left' ? margin : W - r.width - margin, y: H - r.height - (W < 760 ? 70 : 64) };
  }
  const place = (p) => { node.style.transform = `translate3d(${p.x}px, ${p.y}px, 0)`; };

  function say(text) {
    bubble.textContent = text;
    bubble.classList.add('show');
    clearTimeout(bubbleTimer);
    bubbleTimer = setTimeout(() => bubble.classList.remove('show'), 3800);
  }

  function moveTo(side, text) {
    const to = spot(side);
    node.classList.toggle('side-right', side === 'right');
    if (!pos || reduceMotion) {
      pos = to;
      place(to);
      say(text);
      return;
    }
    const from = pos;
    pos = to;
    node.classList.toggle('face-left', to.x < from.x);
    node.classList.add('jumping');
    bubble.classList.remove('show');
    const peakY = Math.min(from.y, to.y) - window.innerHeight * 0.38;
    const mid = (from.x + to.x) / 2;
    const spin = to.x < from.x ? -360 : 360;
    anim?.cancel();
    anim = node.animate([
      { transform: `translate3d(${from.x}px, ${from.y}px, 0) scale(1, 1)` },
      { transform: `translate3d(${from.x}px, ${from.y + 14}px, 0) scale(1.18, .78)`, offset: 0.12 },
      { transform: `translate3d(${(from.x + mid) / 2}px, ${peakY + 60}px, 0) rotate(${spin * 0.35}deg) scale(.92, 1.1)`, offset: 0.35 },
      { transform: `translate3d(${mid}px, ${peakY}px, 0) rotate(${spin * 0.6}deg) scale(1, 1)`, offset: 0.55 },
      { transform: `translate3d(${(mid + to.x) / 2}px, ${peakY + 90}px, 0) rotate(${spin * 0.9}deg) scale(.95, 1.08)`, offset: 0.78 },
      { transform: `translate3d(${to.x}px, ${to.y + 16}px, 0) rotate(${spin}deg) scale(1.22, .76)`, offset: 0.9 },
      { transform: `translate3d(${to.x}px, ${to.y}px, 0) rotate(${spin}deg) scale(1, 1)` },
    ], { duration: 1200, easing: 'cubic-bezier(.45,.05,.55,.95)' });
    anim.onfinish = () => {
      place(to);
      anim = null;
      node.classList.remove('jumping');
      say(text);
    };
  }

  window.addEventListener('resize', () => {
    if (!pos) return;
    const side = pos.x < window.innerWidth / 2 ? 'left' : 'right';
    pos = spot(side);
    place(pos);
  });
  return { moveTo, say };
}

/* =====================================================================
 * Slides
 * ===================================================================== */
let store = { settings: { tanggal: '' }, reports: {} };
let slides = [];
let index = 0;
let scene3d = null;
let mascot = null;
let playTimer = null;

const deck = $('#deck');

function buildSlides() {
  const list = [{ type: 'cover', color: '#ffc20e', label: 'Cover' }];
  DIVISIONS.forEach((d) => {
    const report = store.reports[d.id];
    if (report || pref.showEmpty) list.push({ type: 'division', def: d, report, color: d.color, label: d.name });
  });
  list.push({ type: 'closing', color: '#e31e24', label: 'Salam Cinta' });
  slides = list;

  deck.replaceChildren(...slides.map((s, i) => {
    const el = document.createElement('article');
    el.className = `slide ${s.type}`;
    el.style.setProperty('--c', s.color);
    el.innerHTML = `<div class="slide-inner">${slideHtml(s, i)}</div>`;
    return el;
  }));

  deck.querySelectorAll('[data-jump]').forEach((b) => b.addEventListener('click', () => {
    const i = slides.findIndex((s) => s.def && s.def.id === b.dataset.jump);
    if (i >= 0) go(i);
    else toast('Divisi ini belum mengisi laporan');
  }));

  $('#dots').replaceChildren(...slides.map((s, i) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = `dot${s.type === 'division' && !s.report ? ' empty' : ''}`;
    b.style.setProperty('--c', s.color);
    b.title = s.label;
    b.textContent = s.type === 'cover' ? '★' : s.type === 'closing' ? '♥' : s.def.icon;
    b.addEventListener('click', () => go(i));
    return b;
  }));

  scene3d.setSlides(slides.map((s) => s.color));
  index = Math.min(index, slides.length - 1);
  go(index, true);
}

function slideHtml(s, i) {
  const tanggal = esc(store.settings.tanggal || 'Tanggal belum diisi');
  if (s.type === 'cover') {
    const tiles = DIVISIONS.map((d, k) => {
      const r = store.reports[d.id];
      return `<button class="cover-tile ${r ? 'done' : ''}" data-jump="${d.id}" style="--c:${d.color};--i:${k}">
        <span class="div-icon">${d.icon}</span><span>${esc(d.name)}</span><span class="st">${r ? '✓' : 'belum'}</span></button>`;
    }).join('');
    const filled = DIVISIONS.filter((d) => store.reports[d.id]).length;
    return `<div class="cover-body">
      <div class="cover-kicker">INDOGROSIR BATAM</div>
      <h1 class="cover-title">WEEKLY<br>REPORT</h1>
      <div class="cover-date">${tanggal}</div>
      <div class="muted" style="color:rgba(255,255,255,.75)">${filled} dari ${DIVISIONS.length} divisi sudah mengirim laporan · tekan → untuk mulai</div>
      <div class="cover-status">${tiles}</div>
    </div>`;
  }
  if (s.type === 'closing') {
    return `<div class="closing-card"><div class="c1">SALAM</div><div class="c2">CINTA</div></div>`;
  }
  const r = s.report;
  const meta = r
    ? `${esc(r.periode || tanggal)} · ${esc(r.pengisi || 'tanpa nama')} · dikirim ${new Date(r.updatedAt).toLocaleString('id-ID')}`
    : 'Belum mengirim laporan';
  return `<header class="slide-head">
      <span class="div-icon">${s.def.icon}</span>
      <div><h2>${esc(s.def.title)}</h2><div class="meta">${meta}</div></div>
      <span class="slide-no">${i} / ${slides.length - 2}</span>
    </header>
    <div class="slide-body">${r ? renderReport(s.def, r) : `<div class="slide-empty"><div><b>${esc(s.def.name)}</b><br>belum mengisi laporan minggu ini.</div></div>`}</div>`;
}

function bubbleText(s) {
  if (s.type === 'cover') return 'Halo! Yuk mulai 👋';
  if (s.type === 'closing') return 'Salam Cinta! ❤️';
  return s.report ? `${s.def.icon} ${s.def.name}!` : `${s.def.name} belum isi 😅`;
}

function go(i, silent = false) {
  if (!slides.length) return;
  const prev = index;
  index = Math.max(0, Math.min(slides.length - 1, i));
  [...deck.children].forEach((el, k) => {
    const d = k - index;
    el.className = el.className.replace(/\bis-[\w-]+/g, '').trim();
    el.classList.add(d === 0 ? 'is-active' : d === -1 ? 'is-prev' : d === 1 ? 'is-next' : d < 0 ? 'is-far-prev' : 'is-far-next');
    el.setAttribute('aria-hidden', d === 0 ? 'false' : 'true');
    el.inert = d !== 0;
  });
  [...$('#dots').children].forEach((b, k) => b.classList.toggle('active', k === index));
  $('#counter').textContent = `${index + 1} / ${slides.length}`;
  $('#progressBar').style.width = `${((index + 1) / slides.length) * 100}%`;
  const s = slides[index];
  scene3d.go(index, s.color);
  if (!silent || prev !== index || !mascot._placed) {
    mascot.moveTo(index % 2 === 0 ? 'left' : 'right', bubbleText(s));
    mascot._placed = true;
  }
}

const next = () => go(index + 1);
const prev = () => go(index - 1);

function togglePlay(force) {
  const on = force ?? !playTimer;
  clearInterval(playTimer);
  playTimer = null;
  if (on) playTimer = setInterval(() => (index >= slides.length - 1 ? go(0) : next()), 9000);
  $('#playBtn').classList.toggle('on', on);
  $('#playBtn').textContent = on ? '❚❚' : '▶';
}

/* tilt 3D halus mengikuti kursor */
deck.addEventListener('pointermove', (e) => {
  if (reduceMotion || e.pointerType !== 'mouse') return;
  const inner = deck.querySelector('.slide.is-active .slide-inner');
  if (!inner) return;
  const r = inner.getBoundingClientRect();
  const x = (e.clientX - r.left) / r.width - 0.5;
  const y = (e.clientY - r.top) / r.height - 0.5;
  inner.style.setProperty('--ry', `${x * 4}deg`);
  inner.style.setProperty('--rx', `${-y * 3}deg`);
});
deck.addEventListener('pointerleave', () => {
  deck.querySelectorAll('.slide-inner').forEach((n) => { n.style.removeProperty('--rx'); n.style.removeProperty('--ry'); });
});

/* swipe */
let touchX = null;
deck.addEventListener('touchstart', (e) => { touchX = e.touches[0].clientX; }, { passive: true });
deck.addEventListener('touchend', (e) => {
  if (touchX === null) return;
  const dx = e.changedTouches[0].clientX - touchX;
  touchX = null;
  if (Math.abs(dx) > 60) (dx < 0 ? next : prev)();
});

document.addEventListener('keydown', (e) => {
  if ($('#app').hidden || e.target.closest('input, textarea, select') || !$('#drawer').hidden) return;
  if (e.key === 'ArrowRight' || e.key === 'PageDown') { e.preventDefault(); next(); }
  else if (e.key === 'ArrowLeft' || e.key === 'PageUp') { e.preventDefault(); prev(); }
  else if (e.key === 'Home') go(0);
  else if (e.key === 'End') go(slides.length - 1);
  else if (e.key.toLowerCase() === 'f') toggleFullscreen();
  else if (e.key.toLowerCase() === 'p') togglePlay();
  else if (e.key.toLowerCase() === 'r') loadData();
});

function toggleFullscreen() {
  if (document.fullscreenElement) document.exitFullscreen();
  else document.documentElement.requestFullscreen?.().catch(() => {});
}

/* =====================================================================
 * Data & panel kelola
 * ===================================================================== */
async function loadData() {
  try {
    store = await api('api.php?a=all');
    $('#tanggalBtn').textContent = store.settings.tanggal || 'Isi tanggal…';
    $('#tanggalInput').value = store.settings.tanggal || '';
    buildSlides();
    renderStatus();
  } catch (e) {
    toast(e.message, 'error');
  }
}

function renderStatus() {
  $('#statusList').innerHTML = DIVISIONS.map((d) => {
    const r = store.reports[d.id];
    return `<div class="status-item ${r ? '' : 'empty'}">
      <span class="div-icon" style="background:${d.color}">${d.icon}</span>
      <div class="info"><b>${esc(d.name)}</b><span>${r ? `${esc(r.pengisi || 'tanpa nama')} · ${new Date(r.updatedAt).toLocaleString('id-ID')}` : 'Belum mengisi'}</span></div>
      ${r ? `<button class="btn small danger" data-del="${d.id}" type="button">Hapus</button>` : ''}
    </div>`;
  }).join('');
  $('#statusList').querySelectorAll('[data-del]').forEach((b) => b.addEventListener('click', async () => {
    const d = DIVISIONS.find((x) => x.id === b.dataset.del);
    if (!confirm(`Hapus laporan ${d.name}? Tindakan ini tidak bisa dibatalkan.`)) return;
    try {
      await api(`api.php?a=delete&div=${d.id}`, { method: 'POST' });
      toast(`Laporan ${d.name} dihapus`, 'ok');
      loadData();
    } catch (e) { toast(e.message, 'error'); }
  }));
}

function openDrawer(focusDate = false) {
  $('#drawer').hidden = false;
  togglePlay(false);
  if (focusDate) setTimeout(() => $('#tanggalInput').focus(), 50);
}

$('#manageBtn').addEventListener('click', () => openDrawer());
$('#tanggalBtn').addEventListener('click', () => openDrawer(true));
$('#closeDrawer').addEventListener('click', () => { $('#drawer').hidden = true; });
$('#saveTanggal').addEventListener('click', async () => {
  try {
    store.settings = await api('api.php?a=settings', { method: 'POST', body: JSON.stringify({ tanggal: $('#tanggalInput').value }) });
    $('#tanggalBtn').textContent = store.settings.tanggal || 'Isi tanggal…';
    buildSlides();
    toast('Tanggal disimpan', 'ok');
  } catch (e) { toast(e.message, 'error'); }
});
$('#showEmpty').checked = pref.showEmpty;
$('#showEmpty').addEventListener('change', (e) => { pref.showEmpty = e.target.checked; buildSlides(); });
$('#backupBtn').addEventListener('click', () => {
  const blob = new Blob([JSON.stringify(store, null, 1)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `weekly-report-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
});
$('#clearBtn').addEventListener('click', async () => {
  if (!confirm('Hapus SEMUA laporan dari semua divisi? Download backup dulu bila perlu.')) return;
  try {
    await api('api.php?a=clear', { method: 'POST' });
    toast('Semua laporan dihapus', 'ok');
    index = 0;
    loadData();
  } catch (e) { toast(e.message, 'error'); }
});
$('#logoutBtn').addEventListener('click', async () => {
  session.token = null;
  await fetch('api.php?a=logout', { method: 'POST' }).catch(() => {});
  location.reload();
});

$('#prevBtn').addEventListener('click', prev);
$('#nextBtn').addEventListener('click', next);
$('#playBtn').addEventListener('click', () => togglePlay());
$('#fsBtn').addEventListener('click', toggleFullscreen);
$('#reloadBtn').addEventListener('click', () => { loadData(); toast('Data dimuat ulang'); });

/* =====================================================================
 * Login
 * ===================================================================== */
function showLogin() {
  $('#login').hidden = false;
  $('#app').hidden = true;
  $('#drawer').hidden = true;
  setTimeout(() => $('#pin').focus(), 100);
}

async function enterApp() {
  $('#login').hidden = true;
  $('#app').hidden = false;
  mascot ||= createMascot();
  await loadData();
}

$('#loginForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  $('#loginErr').textContent = '';
  try {
    const { token } = await api('api.php?a=login', { method: 'POST', body: JSON.stringify({ pin: $('#pin').value }) });
    session.token = token;
    $('#pin').value = '';
    enterApp();
  } catch (err) {
    $('#loginErr').textContent = err.message;
  }
});

scene3d = createScene($('#bg3d'));
scene3d.go(0, '#ffc20e');

(async () => {
  if (!session.token) return showLogin();
  try {
    await api('api.php?a=check');
    enterApp();
  } catch {
    showLogin();
  }
})();
