/* Tampilan read-only sebuah laporan divisi (dipakai admin & halaman "Laporan Terkirim"). */
(function () {
  const { fmt, isNumKind, cell, rowHasData, footerValues, sectionHasData, fieldValue, compareValue, growth, sub } = window.WR;

  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const safeImg = (src) => (typeof src === 'string' && /^data:image\/(png|jpe?g|webp|gif);base64,/.test(src) ? src : '');

  function numClass(v, kind, col) {
    if (typeof v !== 'number') return '';
    const signed = col && (col.calc || /selisih|growth|turun|naik|^%/i.test(col.label));
    if (!signed && kind !== 'pct') return v < 0 ? 'neg' : '';
    if (v < 0) return 'neg';
    if (v > 0 && signed) return 'pos';
    return '';
  }

  function fmtDate(v) {
    if (!v) return '';
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(v);
    return m ? `${m[3]}/${m[2]}/${m[1]}` : v;
  }

  function cellHtml(v, col) {
    if (v === null || v === undefined || v === '') return '<td></td>';
    if (isNumKind(col.kind) && typeof v === 'number') {
      return `<td class="num ${numClass(v, col.kind, col)}">${esc(fmt(v, col.kind))}</td>`;
    }
    if (col.kind === 'date') return `<td>${esc(fmtDate(v))}</td>`;
    return `<td>${esc(v)}</td>`;
  }

  function renderTable(section, value) {
    const cols = section.columns;
    const rows = (value.rows || []).filter((r) => rowHasData(r, cols));
    const head = cols.map((c) => `<th>${esc(c.label)}</th>`).join('');
    const body = rows.map((r, i) => `<tr style="--i:${i}">${cols.map((c) => cellHtml(cell(r, c, cols), c)).join('')}</tr>`).join('');
    const foot = (section.footers || []).map((f) => {
      const vals = footerValues(f, value.rows || [], cols);
      let labelDone = false;
      const tds = cols.map((c) => {
        if (c.key in vals) return cellHtml(vals[c.key], c);
        if (!labelDone) { labelDone = true; return `<td class="foot-label">${esc(f.label)}</td>`; }
        return '<td></td>';
      }).join('');
      return `<tr>${tds}</tr>`;
    }).join('');
    return `<div class="r-table-wrap"><table class="r-table tone-${section.tone || 'none'}">
      <thead><tr>${head}</tr></thead><tbody>${body}</tbody>${foot ? `<tfoot>${foot}</tfoot>` : ''}</table></div>`;
  }

  function renderFields(divDef, data, section) {
    const vals = data[section.id] || {};
    const items = section.fields.map((f) => {
      const v = fieldValue(divDef, data, section, f);
      if (v === null || v === undefined || String(v).trim() === '') return '';
      if (f.kind === 'textarea') {
        return `<div class="r-note"><div class="r-note-label">${esc(f.label)}</div><p>${esc(vals[f.key]).replace(/\n/g, '<br>')}</p></div>`;
      }
      const shown = isNumKind(f.kind) && typeof v === 'number' ? fmt(v, f.kind) : f.kind === 'date' ? fmtDate(v) : v;
      return `<div class="r-stat ${f.calc ? 'is-calc' : ''}"><div class="r-stat-label">${esc(f.label)}</div>
        <div class="r-stat-value ${numClass(v, f.kind)}">${esc(shown)}</div></div>`;
    }).join('');
    return `<div class="r-stats">${items}</div>`;
  }

  function renderCompare(section, value) {
    const la = value.labelA || section.labelA;
    const lb = value.labelB || section.labelB;
    const tiles = section.rows.map((r) => {
      const a = compareValue(section, value, r, 'a');
      const b = compareValue(section, value, r, 'b');
      if (a === null && b === null) return '';
      const selisih = sub(b, a);
      const g = r.kind === 'pct' ? null : growth(a, b);
      const dir = selisih === null ? '' : selisih < 0 ? 'down' : selisih > 0 ? 'up' : '';
      return `<div class="r-cmp ${dir}">
        <div class="r-cmp-label">${esc(r.label)}</div>
        <div class="r-cmp-vals">
          <div><span>${esc(la)}</span><b>${esc(fmt(a, r.kind))}</b></div>
          <div><span>${esc(lb)}</span><b>${esc(fmt(b, r.kind))}</b></div>
        </div>
        <div class="r-cmp-delta">
          <span class="arrow">${dir === 'down' ? '▼' : dir === 'up' ? '▲' : '•'}</span>
          <span>${selisih === null ? '-' : esc(fmt(selisih, r.kind === 'pct' ? 'num' : r.kind))}</span>
          ${g === null ? '' : `<span class="pill">${esc(fmt(g, 'pct'))}</span>`}
        </div>
      </div>`;
    }).join('');
    return `<div class="r-cmp-grid">${tiles}</div>`;
  }

  function renderImages(value) {
    const imgs = (value || []).filter((x) => safeImg(x.src));
    return `<div class="r-gallery">${imgs.map((x) => `<figure><img src="${safeImg(x.src)}" alt="${esc(x.caption)}" loading="lazy">${x.caption ? `<figcaption>${esc(x.caption)}</figcaption>` : ''}</figure>`).join('')}</div>`;
  }

  function renderCards(section, value) {
    const cards = (value.cards || []).filter((c) => c.image || section.fields.some((f) => String(c[f.key] ?? '').trim()));
    return `<div class="r-products">${cards.map((c) => {
      const prices = (c.prices || []).filter((r) => rowHasData(r, section.priceColumns));
      return `<article class="r-product">
        <div class="r-product-info">
          <h4>${esc(c.nama)}</h4>
          ${c.plu ? `<div class="r-product-plu">PLU ${esc(c.plu)}</div>` : ''}
          ${c.deskPendek ? `<div class="r-product-desc"><small>Deskripsi pendek</small>${esc(c.deskPendek)}</div>` : ''}
          ${prices.length ? renderTable({ columns: section.priceColumns }, { rows: prices }) : ''}
          ${c.lokasi ? `<div class="r-product-loc"><small>Lokasi di toko</small><b>${esc(c.lokasi)}</b></div>` : ''}
        </div>
        ${safeImg(c.image) ? `<div class="r-product-img"><img src="${safeImg(c.image)}" alt="${esc(c.nama)}"></div>` : ''}
      </article>`;
    }).join('')}</div>`;
  }

  function renderSection(divDef, data, section) {
    const value = data[section.id];
    if (!sectionHasData(section, value)) return '';
    let inner = '';
    if (section.type === 'fields') inner = renderFields(divDef, data, section);
    else if (section.type === 'table') inner = renderTable(section, value);
    else if (section.type === 'compare') inner = renderCompare(section, value);
    else if (section.type === 'images') inner = renderImages(value);
    else if (section.type === 'cards') inner = renderCards(section, value);
    const periode = value && !Array.isArray(value) && value.periode ? `<span class="r-chip">${esc(value.periode)}</span>` : '';
    return `<section class="r-section r-${section.type}"><h3>${esc(section.title)} ${periode}</h3>${inner}</section>`;
  }

  function renderReport(divDef, report) {
    if (!report || !report.data) return '<div class="r-empty">Belum ada laporan.</div>';
    const html = divDef.sections.map((s) => renderSection(divDef, report.data, s)).join('');
    return html || '<div class="r-empty">Laporan terkirim tetapi masih kosong.</div>';
  }

  window.WR.esc = esc;
  window.WR.safeImg = safeImg;
  window.WR.renderReport = renderReport;
})();
