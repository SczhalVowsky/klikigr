/* Halaman pengisian laporan per divisi. */
(function () {
  const { DIVISIONS, byId, fmt, parseNum, isNumKind, cell, footerValues, fieldValue, compareValue, sub, growth, esc, safeImg } = window.WR;

  const $ = (sel) => document.querySelector(sel);
  const el = (tag, attrs = {}, ...children) => {
    const node = document.createElement(tag);
    Object.entries(attrs).forEach(([k, v]) => {
      if (k === 'class') node.className = v;
      else if (k === 'text') node.textContent = v;
      else if (k.startsWith('on')) node.addEventListener(k.slice(2), v);
      else if (v !== undefined && v !== null && v !== false) node.setAttribute(k, v);
    });
    children.flat().forEach((c) => c != null && node.append(c));
    return node;
  };

  let current = null; // definisi divisi aktif
  let state = null; // { pengisi, periode, data }
  let refreshers = [];
  let draftTimer = null;

  const draftKey = (id) => `wr-draft-${id}`;
  const store = {
    get(k) { try { return JSON.parse(localStorage.getItem(k)); } catch { return null; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch { return false; } },
    del(k) { try { localStorage.removeItem(k); } catch { /* abaikan */ } },
  };

  function toast(msg, kind = '') {
    const t = $('#toast');
    t.textContent = msg;
    t.className = `toast show ${kind}`;
    clearTimeout(t._h);
    t._h = setTimeout(() => (t.className = 'toast'), 3200);
  }

  function changed() {
    refreshers.forEach((fn) => fn());
    clearTimeout(draftTimer);
    draftTimer = setTimeout(() => {
      const ok = store.set(draftKey(current.id), { ...state, savedAt: Date.now() });
      $('#draftStatus').textContent = ok ? 'Draft tersimpan otomatis di perangkat ini' : 'Draft terlalu besar untuk disimpan lokal — segera kirim laporan';
    }, 500);
  }

  // ---------- input helpers ----------
  function inputFor(def, obj, key) {
    const kind = def.kind;
    if (kind === 'select') {
      const sel = el('select', { onchange: (e) => { obj[key] = e.target.value; changed(); } },
        el('option', { value: '', text: '— pilih —' }),
        def.options.map((o) => el('option', { value: o, text: o })));
      sel.value = obj[key] || '';
      return sel;
    }
    if (kind === 'textarea') {
      const ta = el('textarea', { rows: 3, placeholder: def.placeholder || '' });
      ta.value = obj[key] || '';
      ta.addEventListener('input', () => { obj[key] = ta.value; changed(); });
      return ta;
    }
    const inp = el('input', {
      type: kind === 'date' ? 'date' : 'text',
      inputmode: isNumKind(kind) ? 'decimal' : undefined,
      class: isNumKind(kind) ? 'num' : '',
      placeholder: def.placeholder || (kind === 'pct' ? '0,00' : isNumKind(kind) ? '0' : ''),
    });
    inp.value = obj[key] || '';
    inp.addEventListener('input', () => { obj[key] = inp.value; changed(); });
    if (isNumKind(kind)) {
      inp.addEventListener('blur', () => {
        const n = parseNum(inp.value);
        inp.classList.toggle('invalid', inp.value.trim() !== '' && n === null);
        if (n !== null) { inp.value = fmt(n, 'num'); obj[key] = inp.value; changed(); }
      });
    }
    return inp;
  }

  const calcOut = () => el('output', { class: 'calc' });
  function setCalc(out, v, kind) {
    out.textContent = v === null || v === undefined ? '—' : fmt(v, kind);
    out.classList.toggle('neg', typeof v === 'number' && v < 0);
  }

  function compressImage(file, max = 1400) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = reject;
      reader.onload = () => {
        const img = new Image();
        img.onerror = () => reject(new Error('Gambar tidak bisa dibaca'));
        img.onload = () => {
          const scale = Math.min(1, max / Math.max(img.width, img.height));
          const c = document.createElement('canvas');
          c.width = Math.round(img.width * scale);
          c.height = Math.round(img.height * scale);
          const ctx = c.getContext('2d');
          ctx.fillStyle = '#fff';
          ctx.fillRect(0, 0, c.width, c.height);
          ctx.drawImage(img, 0, 0, c.width, c.height);
          resolve(c.toDataURL('image/jpeg', 0.82));
        };
        img.src = reader.result;
      };
      reader.readAsDataURL(file);
    });
  }

  // ---------- section renderers ----------
  function renderFields(section) {
    const vals = (state.data[section.id] ||= {});
    const grid = el('div', { class: 'field-grid' });
    section.fields.forEach((f) => {
      if (f.calc) {
        const out = calcOut();
        refreshers.push(() => setCalc(out, fieldValue(current, state.data, section, f), f.kind));
        grid.append(el('label', { class: 'is-calc' }, el('span', {}, f.label, el('em', { text: 'otomatis' })), out));
      } else {
        grid.append(el('label', { class: f.kind === 'textarea' ? 'wide' : '' }, el('span', { text: f.label }), inputFor(f, vals, f.key)));
      }
    });
    return grid;
  }

  function initialRows(section) {
    if (section.fixedRows) return section.fixedRows.map((label) => ({ [section.columns[0].key]: label }));
    if (section.prefill) return section.prefill.map((r) => ({ ...r }));
    return Array.from({ length: section.rows || 3 }, () => ({}));
  }

  function renderTable(section) {
    const val = (state.data[section.id] ||= { rows: initialRows(section) });
    if (!Array.isArray(val.rows) || !val.rows.length) val.rows = initialRows(section);
    const cols = section.columns;
    const wrap = el('div');

    if (section.periode) {
      wrap.append(el('label', { class: 'periode' }, el('span', { text: section.periodeLabel || 'Periode' }), inputFor({ kind: 'text', placeholder: '01 Okt - 13 Okt 2026' }, val, 'periode')));
    }

    const table = el('table', { class: 'edit-table' });
    table.append(el('thead', {}, el('tr', {},
      el('th', { text: '#' }),
      cols.map((c) => el('th', { style: c.w ? `min-width:${c.w}px` : '' }, c.label, c.calc ? el('em', { text: 'auto' }) : null)),
      section.fixedRows ? null : el('th'))));

    const tbody = el('tbody');
    val.rows.forEach((row, i) => {
      const tr = el('tr', {}, el('td', { class: 'rownum', text: String(i + 1) }));
      cols.forEach((c) => {
        if (c.fixed) tr.append(el('td', { class: 'fixed', text: row[c.key] || '' }));
        else if (c.calc) {
          const out = calcOut();
          refreshers.push(() => setCalc(out, cell(row, c, cols), c.kind));
          tr.append(el('td', {}, out));
        } else tr.append(el('td', {}, inputFor(c, row, c.key)));
      });
      if (!section.fixedRows) {
        tr.append(el('td', {}, el('button', {
          class: 'icon-btn', type: 'button', title: 'Hapus baris', text: '✕',
          onclick: () => { val.rows.splice(i, 1); if (!val.rows.length) val.rows.push({}); rerender(); changed(); },
        })));
      }
      tbody.append(tr);
    });
    table.append(tbody);

    if (section.footers) {
      const tfoot = el('tfoot');
      section.footers.forEach((f) => {
        const tr = el('tr', {}, el('td', { class: 'foot-label', text: f.label }));
        cols.forEach((c) => {
          if (!(c.key in f.agg)) return tr.append(el('td'));
          const out = calcOut();
          refreshers.push(() => setCalc(out, footerValues(f, val.rows, cols)[c.key], c.kind));
          tr.append(el('td', {}, out));
        });
        if (!section.fixedRows) tr.append(el('td'));
        tfoot.append(tr);
      });
      table.append(tfoot);
    }

    wrap.append(el('div', { class: 'table-scroll' }, table));
    if (!section.fixedRows) {
      wrap.append(el('button', { class: 'btn small', type: 'button', text: '+ Tambah baris', onclick: () => { val.rows.push({}); rerender(); changed(); } }));
    }

    function rerender() {
      refreshers = [];
      renderAllSections();
    }
    return wrap;
  }

  function renderCompare(section) {
    const val = (state.data[section.id] ||= { labelA: section.labelA, labelB: section.labelB, values: {} });
    val.values ||= {};
    const table = el('table', { class: 'edit-table compare-table' });
    table.append(el('thead', {}, el('tr', {},
      el('th', { text: '' }),
      el('th', {}, el('span', { class: 'th-hint', text: 'Bulan / periode lalu' }), inputFor({ kind: 'text' }, val, 'labelA')),
      el('th', {}, el('span', { class: 'th-hint', text: 'Bulan / periode ini' }), inputFor({ kind: 'text' }, val, 'labelB')),
      el('th', {}, 'Selisih', el('em', { text: 'auto' })),
      el('th', {}, 'Growth', el('em', { text: 'auto' })))));
    const tbody = el('tbody');
    section.rows.forEach((r) => {
      const v = (val.values[r.key] ||= {});
      const tr = el('tr', {}, el('td', { class: 'fixed', text: r.label }));
      ['a', 'b'].forEach((side) => {
        if (r.calc) {
          const out = calcOut();
          refreshers.push(() => setCalc(out, compareValue(section, val, r, side), r.kind));
          tr.append(el('td', {}, out));
        } else tr.append(el('td', {}, inputFor(r, v, side)));
      });
      const outS = calcOut();
      const outG = calcOut();
      refreshers.push(() => {
        const a = compareValue(section, val, r, 'a');
        const b = compareValue(section, val, r, 'b');
        setCalc(outS, sub(b, a), r.kind === 'pct' ? 'num' : r.kind);
        setCalc(outG, r.kind === 'pct' ? null : growth(a, b), 'pct');
      });
      tr.append(el('td', {}, outS), el('td', {}, outG));
      tbody.append(tr);
    });
    table.append(tbody);
    return el('div', { class: 'table-scroll' }, table);
  }

  function imagePicker(onFiles, multiple = true) {
    const input = el('input', { type: 'file', accept: 'image/*', multiple: multiple || undefined, hidden: true });
    input.addEventListener('change', async () => {
      const files = [...input.files];
      input.value = '';
      try {
        const srcs = await Promise.all(files.map((f) => compressImage(f)));
        onFiles(srcs);
      } catch (e) {
        toast(e.message || 'Gagal membaca gambar', 'error');
      }
    });
    const btn = el('button', { class: 'btn small', type: 'button', text: multiple ? '+ Upload foto' : 'Pilih foto', onclick: () => input.click() });
    return el('span', {}, btn, input);
  }

  function renderImages(section) {
    const list = Array.isArray(state.data[section.id]) ? state.data[section.id] : (state.data[section.id] = []);
    const wrap = el('div');
    const grid = el('div', { class: 'thumb-grid' });
    const draw = () => {
      grid.replaceChildren(...list.map((img, i) => {
        const cap = el('input', { type: 'text', placeholder: 'Keterangan foto' });
        cap.value = img.caption || '';
        cap.addEventListener('input', () => { img.caption = cap.value; changed(); });
        return el('figure', { class: 'thumb' },
          el('img', { src: safeImg(img.src), alt: '' }),
          cap,
          el('button', { class: 'icon-btn', type: 'button', title: 'Hapus foto', text: '✕', onclick: () => { list.splice(i, 1); draw(); changed(); } }));
      }));
    };
    draw();
    wrap.append(grid, imagePicker((srcs) => { srcs.forEach((src) => list.push({ src, caption: '' })); draw(); changed(); }));
    return wrap;
  }

  function renderCards(section) {
    const val = (state.data[section.id] ||= { cards: [{ prices: [{}, {}, {}] }] });
    val.cards ||= [];
    const wrap = el('div');
    wrap.append(el('label', { class: 'periode' }, el('span', { text: section.periodeLabel || 'Periode' }), inputFor({ kind: 'text' }, val, 'periode')));
    const list = el('div', { class: 'card-list' });
    const draw = () => {
      list.replaceChildren(...val.cards.map((card, ci) => {
        card.prices ||= [{}];
        const imgBox = el('div', { class: 'product-img' });
        const drawImg = () => imgBox.replaceChildren(...[
          card.image ? el('img', { src: safeImg(card.image), alt: '' }) : el('div', { class: 'placeholder', text: 'Foto produk' }),
          imagePicker(([src]) => { card.image = src; drawImg(); changed(); }, false),
          card.image ? el('button', { class: 'btn small ghost', type: 'button', text: 'Hapus foto', onclick: () => { delete card.image; drawImg(); changed(); } }) : null,
        ].filter(Boolean));
        drawImg();

        const prices = el('tbody');
        card.prices.forEach((row, ri) => prices.append(el('tr', {},
          section.priceColumns.map((c) => el('td', {}, inputFor(c, row, c.key))),
          el('td', {}, el('button', { class: 'icon-btn', type: 'button', text: '✕', title: 'Hapus baris', onclick: () => { card.prices.splice(ri, 1); draw(); changed(); } })))));

        return el('div', { class: 'product-card' },
          el('div', { class: 'product-card-head' },
            el('b', { text: `Produk ${ci + 1}` }),
            el('button', { class: 'btn small ghost', type: 'button', text: 'Hapus produk', onclick: () => { val.cards.splice(ci, 1); draw(); changed(); } })),
          el('div', { class: 'product-body' },
            el('div', { class: 'field-grid' }, section.fields.map((f) => el('label', {}, el('span', { text: f.label }), inputFor(f, card, f.key)))),
            imgBox),
          el('div', { class: 'table-scroll' }, el('table', { class: 'edit-table' },
            el('thead', {}, el('tr', {}, section.priceColumns.map((c) => el('th', { text: c.label })), el('th'))), prices)),
          el('button', { class: 'btn small', type: 'button', text: '+ Baris harga', onclick: () => { card.prices.push({}); draw(); changed(); } }));
      }));
    };
    draw();
    wrap.append(list, el('button', { class: 'btn', type: 'button', text: '+ Tambah produk', onclick: () => { val.cards.push({ prices: [{}, {}, {}] }); draw(); changed(); } }));
    return wrap;
  }

  // ---------- page ----------
  function renderAllSections() {
    refreshers = [];
    const host = $('#sections');
    const scrollY = window.scrollY;
    host.replaceChildren(...current.sections.map((s) => {
      let body;
      if (s.type === 'fields') body = renderFields(s);
      else if (s.type === 'table') body = renderTable(s);
      else if (s.type === 'compare') body = renderCompare(s);
      else if (s.type === 'images') body = renderImages(s);
      else if (s.type === 'cards') body = renderCards(s);
      return el('section', { class: `card form-section type-${s.type}` }, el('h2', { text: s.title }), body);
    }));
    refreshers.forEach((fn) => fn());
    window.scrollTo(0, scrollY);
  }

  async function api(path, opts = {}) {
    const res = await fetch(path, { ...opts, headers: { 'Content-Type': 'application/json', ...(opts.headers || {}) } });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(body.error || `Gagal (${res.status})`);
    return body;
  }

  function showPicker() {
    current = null;
    $('#picker').hidden = false;
    $('#formView').hidden = true;
    document.title = 'Weekly Report';
  }

  async function openDivision(id) {
    const def = byId(id);
    if (!def) return showPicker();
    current = def;
    $('#picker').hidden = true;
    $('#formView').hidden = false;
    $('#divName').textContent = def.name;
    $('#divIcon').textContent = def.icon;
    $('#divIcon').style.background = def.color;
    document.documentElement.style.setProperty('--accent', def.color);
    document.title = `${def.name} — Weekly Report`;
    switchTab('isi');
    $('#sections').innerHTML = '<div class="card muted">Memuat…</div>';

    let server = null;
    try { server = await api(`/api/reports/${id}`); } catch (e) { toast(e.message, 'error'); }
    if (current !== def) return;
    const draft = store.get(draftKey(id));
    const serverTime = server ? Date.parse(server.updatedAt) : 0;
    if (draft && draft.savedAt > serverTime) {
      state = { pengisi: draft.pengisi || '', periode: draft.periode || '', data: draft.data || {} };
      $('#draftStatus').textContent = 'Draft lokal dipulihkan (belum dikirim)';
    } else {
      state = server ? { pengisi: server.pengisi, periode: server.periode, data: server.data || {} } : { pengisi: '', periode: '', data: {} };
      $('#draftStatus').textContent = '';
    }
    setLastSaved(server);
    $('#metaPengisi').value = state.pengisi;
    $('#metaPeriode').value = state.periode;
    renderAllSections();
  }

  function setLastSaved(report) {
    $('#lastSaved').textContent = report
      ? `Terakhir dikirim ${new Date(report.updatedAt).toLocaleString('id-ID')}${report.pengisi ? ' oleh ' + report.pengisi : ''}`
      : 'Belum ada laporan terkirim';
  }

  function switchTab(tab) {
    document.querySelectorAll('.tab').forEach((t) => t.classList.toggle('active', t.dataset.tab === tab));
    $('#tabIsi').hidden = tab !== 'isi';
    $('#tabLihat').hidden = tab !== 'lihat';
    if (tab === 'lihat') loadView();
  }

  async function loadView() {
    const view = $('#reportView');
    view.innerHTML = '<div class="muted">Memuat…</div>';
    try {
      const report = await api(`/api/reports/${current.id}`);
      view.innerHTML = report
        ? `<div class="report-meta">${[report.periode && `<b>${esc(report.periode)}</b>`, report.pengisi && esc(report.pengisi), new Date(report.updatedAt).toLocaleString('id-ID')].filter(Boolean).join(' · ')}</div>${window.WR.renderReport(current, report)}`
        : '<div class="r-empty">Divisi ini belum mengirim laporan.</div>';
    } catch (e) {
      view.innerHTML = `<div class="r-empty">${esc(e.message)}</div>`;
    }
  }

  async function submit() {
    const btn = $('#submitBtn');
    btn.disabled = true;
    btn.textContent = 'Mengirim…';
    try {
      const saved = await api(`/api/reports/${current.id}`, { method: 'PUT', body: JSON.stringify(state) });
      store.del(draftKey(current.id));
      $('#draftStatus').textContent = '';
      setLastSaved(saved);
      toast('Laporan terkirim ✔', 'ok');
      switchTab('lihat');
    } catch (e) {
      toast(e.message, 'error');
    } finally {
      btn.disabled = false;
      btn.textContent = 'Kirim Laporan';
    }
  }

  // ---------- init ----------
  $('#divGrid').append(...DIVISIONS.map((d, i) => el('a', { class: 'div-card', href: `#${d.id}`, style: `--c:${d.color};--i:${i}` },
    el('span', { class: 'div-icon', text: d.icon }),
    el('span', { class: 'div-name', text: d.name }))));

  $('#backBtn').addEventListener('click', () => { location.hash = ''; });
  document.querySelectorAll('.tab').forEach((t) => t.addEventListener('click', () => switchTab(t.dataset.tab)));
  $('#submitBtn').addEventListener('click', submit);
  $('#metaPengisi').addEventListener('input', (e) => { state.pengisi = e.target.value; changed(); });
  $('#metaPeriode').addEventListener('input', (e) => { state.periode = e.target.value; changed(); });

  const route = () => {
    const id = location.hash.slice(1);
    if (id) openDivision(id); else showPicker();
  };
  window.addEventListener('hashchange', route);
  route();

  fetch('/api/settings').then((r) => r.json()).then((s) => {
    $('#tanggal').textContent = s.tanggal || '';
  }).catch(() => {});
})();
