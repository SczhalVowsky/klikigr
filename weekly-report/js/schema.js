/* Format laporan per divisi (mengikuti Weekly Report.docx) + helper angka.
 * Dipakai bersama oleh halaman pengisian (form.js) dan halaman admin (admin.js).
 *
 * Tipe section:
 *   fields  : kumpulan input tunggal            -> data[id] = { key: value }
 *   table   : tabel baris dinamis               -> data[id] = { periode, rows: [{...}] }
 *   compare : bulan lalu vs bulan ini (+growth) -> data[id] = { labelA, labelB, values: { key: {a, b} } }
 *   images  : foto + keterangan                 -> data[id] = [{ src, caption }]
 *   cards   : kartu produk (field + foto + tabel harga) -> data[id] = { periode, cards: [...] }
 * Kolom/field dengan `calc` dihitung otomatis dan tidak perlu diisi.
 */
(function () {
  // ---------- angka ----------
  function parseNum(v) {
    if (v === null || v === undefined) return null;
    if (typeof v === 'number') return isFinite(v) ? v : null;
    let s = String(v).trim();
    if (!s) return null;
    let neg = false;
    if (/^\(.*\)$/.test(s)) { neg = true; s = s.slice(1, -1); }
    s = s.replace(/rp\.?/i, '').replace(/[%\s]/g, '');
    if (s.startsWith('-')) { neg = !neg; s = s.slice(1); }
    if (!/^[\d.,]+$/.test(s)) return null;
    const dots = (s.match(/\./g) || []).length;
    const commas = (s.match(/,/g) || []).length;
    if (dots && commas) {
      // pemisah desimal = yang muncul paling akhir
      if (s.lastIndexOf(',') > s.lastIndexOf('.')) s = s.replace(/\./g, '').replace(',', '.');
      else s = s.replace(/,/g, '');
    } else if (dots + commas > 0) {
      const sep = dots ? '.' : ',';
      const count = dots || commas;
      const after = s.split(sep).pop();
      if (count > 1 || after.length === 3) s = s.split(sep).join(''); // ribuan
      else s = s.replace(sep, '.'); // desimal
    }
    const n = parseFloat(s);
    if (!isFinite(n)) return null;
    return neg ? -n : n;
  }

  const nf0 = new Intl.NumberFormat('id-ID', { maximumFractionDigits: 0 });
  const nf2 = new Intl.NumberFormat('id-ID', { maximumFractionDigits: 2 });

  function fmt(v, kind) {
    const n = typeof v === 'number' ? v : parseNum(v);
    if (n === null) return v === null || v === undefined ? '' : String(v);
    if (kind === 'pct') return nf2.format(Math.round(n * 100) / 100) + '%';
    if (kind === 'money') return nf0.format(Math.round(n));
    return Number.isInteger(n) ? nf0.format(n) : nf2.format(n);
  }

  const isNumKind = (k) => k === 'money' || k === 'num' || k === 'pct';
  const div = (a, b) => (a === null || b === null || b === 0 ? null : a / b);
  const pct = (a, b) => { const r = div(a, b); return r === null ? null : r * 100; };
  const sub = (a, b) => (a === null || b === null ? null : a - b);
  const mul = (a, b) => (a === null || b === null ? null : a * b);
  const growth = (a, b) => (a === null || b === null || a === 0 ? null : ((b - a) / Math.abs(a)) * 100);

  // Ambil nilai numerik kolom dari baris (memakai calc kalau kolom terhitung).
  function cell(row, col, cols) {
    if (col.calc) {
      const get = (k) => {
        const c = cols.find((x) => x.key === k);
        return c ? cell(row, c, cols) : parseNum(row[k]);
      };
      return col.calc(get);
    }
    return isNumKind(col.kind) ? parseNum(row[col.key]) : row[col.key];
  }

  function rowHasData(row, cols) {
    return cols.some((c) => !c.calc && !c.fixed && row && String(row[c.key] ?? '').trim() !== '');
  }

  // Footer: agg per kolom ('sum' | 'avg' | fn(getTotal)) dan label.
  function footerValues(footer, rows, cols) {
    const filled = rows.filter((r) => rowHasData(r, cols));
    const sums = {};
    const counts = {};
    cols.forEach((c) => {
      let s = 0, n = 0;
      filled.forEach((r) => {
        const v = cell(r, c, cols);
        if (typeof v === 'number' && v !== null) { s += v; n++; }
      });
      sums[c.key] = n ? s : null;
      counts[c.key] = n;
    });
    const out = {};
    cols.forEach((c) => {
      const a = footer.agg[c.key];
      if (!a) return;
      if (a === 'sum') out[c.key] = sums[c.key];
      else if (a === 'avg') out[c.key] = counts[c.key] ? sums[c.key] / counts[c.key] : null;
      else if (typeof a === 'function') out[c.key] = a((k) => sums[k] ?? null, (k) => (counts[k] ? sums[k] / counts[k] : null));
    });
    return out;
  }

  // ---------- definisi kolom yang sering dipakai ----------
  const C = {
    plu: { key: 'plu', label: 'PLU', kind: 'text', w: 90 },
    desk: { key: 'desk', label: 'Deskripsi Barang', kind: 'text', w: 280 },
    supplier: { key: 'supplier', label: 'Supplier', kind: 'text', w: 200 },
  };
  const DIVISI_OPT = ['FOOD', 'NON FOOD', 'GMS', 'PERISHABLE'];

  const PSS = {
    type: 'fields', id: 'pss', title: 'Problems, Suggestions, Solutions',
    fields: [
      { key: 'problem', label: 'Problem', kind: 'textarea' },
      { key: 'saran', label: 'Suggestion / Saran', kind: 'textarea' },
      { key: 'solusi', label: 'Solution / Solusi', kind: 'textarea' },
    ],
  };
  const PSS_FOTO = { type: 'images', id: 'pssFoto', title: 'Foto Pendukung Problem' };

  const slTable = (id, title) => ({
    type: 'table', id, title, periode: true, rows: 7,
    columns: [
      { key: 'tgl', label: 'Tanggal', kind: 'date', w: 130 },
      { key: 'jmlPb', label: 'Jumlah PB', kind: 'num' },
      { key: 'rpPb', label: 'Rupiah PB', kind: 'money' },
      { key: 'rpReal', label: 'Rupiah Real', kind: 'money' },
      { key: 'slItem', label: 'SL Item', kind: 'pct' },
      { key: 'slQty', label: 'SL Qty', kind: 'pct' },
      { key: 'slRp', label: 'SL RP', kind: 'pct', calc: (g) => pct(g('rpReal'), g('rpPb')) },
    ],
    footers: [
      { label: 'TOTAL', agg: { jmlPb: 'sum', rpPb: 'sum', rpReal: 'sum', slItem: 'avg', slQty: 'avg', slRp: (s) => pct(s('rpReal'), s('rpPb')) } },
      { label: 'RATA-RATA', agg: { jmlPb: 'avg', rpPb: 'avg', rpReal: 'avg', slItem: 'avg', slQty: 'avg', slRp: (s) => pct(s('rpReal'), s('rpPb')) } },
    ],
  });

  const slFields = (id, title, pbLabel) => ({
    type: 'fields', id, title,
    fields: [
      { key: 'pb', label: pbLabel, kind: 'money' },
      { key: 'tolakan', label: 'Tolakan', kind: 'money' },
      { key: 'upload', label: 'Upload PB', kind: 'money' },
      { key: 'realisasi', label: 'Realisasi', kind: 'money' },
      { key: 'slDspb', label: 'SL DSPB', kind: 'pct', calc: (f) => pct(f('realisasi'), f('pb')) },
      { key: 'slPicking', label: 'SL Picking', kind: 'pct', calc: (f) => pct(f('realisasi'), f('upload')) },
    ],
  });

  const tolakanTable = (id, title) => ({
    type: 'table', id, title, rows: 5,
    columns: [
      { key: 'item', label: 'Nama Item', kind: 'text', w: 360 },
      { key: 'ket', label: 'Keterangan', kind: 'text', w: 260, placeholder: 'mis. Stock ekonomis tidak mencukupi' },
    ],
  });

  const itemSalesTable = (id, title, arah) => ({
    type: 'table', id, title, rows: 5, tone: arah === 'turun' ? 'down' : 'up',
    columns: [
      C.plu, { ...C.desk, label: 'Desk' },
      { key: 'qtyA', label: 'Qty (Lalu)', kind: 'num' },
      { key: 'salesA', label: 'Sales (Lalu)', kind: 'money' },
      { key: 'qtyB', label: 'Qty (Ini)', kind: 'num' },
      { key: 'salesB', label: 'Sales (Ini)', kind: 'money' },
      { key: 'selQty', label: 'Selisih Qty', kind: 'num', calc: (g) => sub(g('qtyB'), g('qtyA')) },
      { key: 'selRp', label: arah === 'turun' ? '↓ Turun' : '↑ Naik', kind: 'money', calc: (g) => sub(g('salesB'), g('salesA')) },
      { key: 'pct', label: '%', kind: 'pct', calc: (g) => growth(g('salesA'), g('salesB')) },
      { key: 'ket', label: 'Ket', kind: 'text', w: 220 },
    ],
  });

  // ---------- 12 divisi ----------
  const DIVISIONS = [
    {
      id: 'logistik1', name: 'Logistik 1', title: 'Logistic 1', icon: '📦', color: '#1f4fbf',
      sections: [
        {
          type: 'fields', id: 'stok', title: 'Laporan Logistik 1 — Stok',
          fields: [
            { key: 'lpp01', label: 'LPP 01 / Stok IGR', kind: 'money' },
            { key: 'lpp02', label: 'LPP 02 / Stok Retur', kind: 'money' },
            { key: 'returCcdi', label: 'Retur CCDI', kind: 'money' },
            { key: 'itemRokok', label: 'Item Rokok', kind: 'money' },
          ],
        },
        { type: 'table', id: 'rincianCcdi', title: 'Rincian Retur CCDI', rows: 2, columns: [C.plu, C.desk, { key: 'rupiah', label: 'Rupiah', kind: 'money' }, C.supplier] },
        { type: 'table', id: 'rincianRokok', title: 'Rincian Item Rokok', rows: 2, columns: [C.plu, C.desk, { key: 'rupiah', label: 'Rupiah', kind: 'money' }, C.supplier] },
        {
          type: 'table', id: 'returTerbesar', title: 'Total Item Retur Terbesar', rows: 4,
          columns: [
            C.supplier,
            { key: 'divisi', label: 'Divisi', kind: 'select', options: DIVISI_OPT },
            C.plu, C.desk,
            { key: 'rupiah', label: 'Total Rupiah', kind: 'money' },
            { key: 'tag', label: 'Tag', kind: 'text', w: 140 },
            { key: 'totalDivisi', label: 'Total Retur per Divisi', kind: 'money' },
          ],
          footers: [{ label: 'TOTAL', agg: { rupiah: 'sum' } }],
        },
        {
          type: 'fields', id: 'musnah', title: 'Barang Musnah',
          fields: [
            { key: 'total', label: 'Total Barang Musnah Bulan Ini', kind: 'money' },
            { key: 'periode', label: 'Periode', kind: 'text', placeholder: '01 OKT - 14 OKT 2026' },
          ],
        },
        {
          type: 'table', id: 'musnahDivisi', title: 'Rincian Musnah per Divisi & Supplier', rows: 2,
          columns: [
            { key: 'divisi', label: 'Divisi', kind: 'select', options: DIVISI_OPT },
            { key: 'totalDivisi', label: 'Total Rupiah Musnah', kind: 'money' },
            C.supplier,
            { key: 'rupiah', label: 'Total Rupiah', kind: 'money' },
          ],
        },
        {
          type: 'fields', id: 'so', title: 'MPP / NBH / SO IC',
          fields: [
            { key: 'periode', label: 'Periode', kind: 'text', placeholder: '01 OKT - 13 OKT 2026' },
            { key: 'mpp', label: 'Total MPP', kind: 'money' },
            { key: 'nbh', label: 'Total NBH', kind: 'money' },
            { key: 'soIc', label: 'Total SO IC', kind: 'money' },
          ],
        },
        ...['Plus', 'Minus'].map((t) => ({
          type: 'table', id: 'selisih' + t, title: `Selisih ${t} Terbesar SO IC`, rows: 2, periode: true, tone: t === 'Plus' ? 'up' : 'down',
          columns: [
            C.plu, { ...C.desk, label: 'Nama Barang' },
            { key: 'qty', label: 'Qty SO', kind: 'num' },
            { key: 'acost', label: 'Acost SO', kind: 'money' },
            { key: 'rupiah', label: 'Rupiah', kind: 'money', calc: (g) => mul(g('qty'), g('acost')) },
          ],
          footers: [{ label: 'TOTAL', agg: { rupiah: 'sum' } }],
        })),
        {
          type: 'table', id: 'itemMusnah', title: 'Item Musnah Terbesar', rows: 2, periode: true,
          columns: [
            { key: 'divisi', label: 'Divisi', kind: 'select', options: DIVISI_OPT },
            C.plu, C.desk, { key: 'total', label: 'Total', kind: 'money' }, C.supplier,
          ],
        },
        {
          type: 'table', id: 'sparepart', title: 'Pending Sparepart Forklift & PHP', rows: 3, periode: true, periodeLabel: 'Update Tanggal',
          columns: [
            { key: 'unit', label: 'Unit', kind: 'text', w: 130 },
            { key: 'item', label: 'Item', kind: 'text', w: 180 },
            { key: 'ba', label: 'BA', kind: 'select', options: ['SUDAH', 'BELUM'] },
            { key: 'ket', label: 'Keterangan', kind: 'text', w: 200 },
            { key: 'status', label: 'Status', kind: 'select', options: ['AKTIF', 'BREAKDOWN', 'PROSES'] },
          ],
        },
        PSS, PSS_FOTO,
      ],
    },
    {
      id: 'klik', name: 'Klik Indogrosir Batam', title: 'Klik Indogrosir', icon: '🛒', color: '#e31e24',
      sections: [
        slTable('slKlik', 'SL KLIK'),
        slTable('slInstan', 'SL KLIK PB INSTANT'),
        slTable('slSpi', 'SL SPI'),
        PSS, PSS_FOTO,
      ],
    },
    {
      id: 'logistik2', name: 'Logistik 2', title: 'Logistic 2', icon: '🚚', color: '#0f7a5c',
      sections: [
        slFields('slIdm', 'Laporan SL IDM IGR BTM', 'PB IDM'),
        tolakanTable('tolakanIdm', '5 Tolakan Item — IDM'),
        slFields('slOmi', 'Laporan SL PB OMI BTM', 'PB OMI'),
        tolakanTable('tolakanOmi', '5 Tolakan Item — OMI'),
        PSS, PSS_FOTO,
      ],
    },
    {
      id: 'ga', name: 'GA', title: 'General Affair', icon: '🏢', color: '#6b4fd8',
      sections: [
        {
          type: 'fields', id: 'header', title: 'Laporan Penjualan Supplier berdasarkan Barang Jual',
          fields: [
            { key: 'cabang', label: 'Cabang', kind: 'text', placeholder: 'mis. INDOGROSIR BATAM' },
            { key: 'periode', label: 'Periode', kind: 'text', placeholder: '01-10-2026 s/d 31-10-2026' },
            { key: 'kategori', label: 'Kategori Barang', kind: 'text', placeholder: 'mis. K1003-01 - KARDUS BEKAS' },
          ],
        },
        {
          type: 'table', id: 'penjualan', title: 'SJ - Penjualan Barang Bekas', rows: 4,
          columns: [
            { key: 'noTrans', label: 'Nomor Transaksi', kind: 'text', w: 190 },
            { key: 'tgl', label: 'Tanggal', kind: 'date', w: 130 },
            { key: 'barang', label: 'Nama Barang Jual', kind: 'text', w: 170 },
            { key: 'supplier', label: 'Nama Supplier', kind: 'text', w: 130 },
            { key: 'tglTransfer', label: 'Tanggal Transfer', kind: 'date', w: 130 },
            { key: 'tglUpload', label: 'Tgl Upload Bukti TF', kind: 'date', w: 130 },
            { key: 'tglApproved', label: 'Tgl Approved GAM', kind: 'date', w: 130 },
            { key: 'tglNotif', label: 'Tgl Kirim Notif Finance', kind: 'date', w: 130 },
            { key: 'hargaSatuan', label: 'Harga Satuan', kind: 'money' },
            { key: 'hargaBorongan', label: 'Harga Borongan', kind: 'money' },
            { key: 'satuan', label: 'Satuan', kind: 'text', w: 70, placeholder: 'KG' },
            { key: 'qty', label: 'Qty', kind: 'num' },
            { key: 'qtyKonv', label: 'Qty Konversi', kind: 'num' },
            { key: 'jumlah', label: 'Jumlah', kind: 'money', calc: (g) => mul(g('qty'), g('hargaSatuan')) },
            { key: 'noSbt', label: 'Nomor SBT', kind: 'text', w: 190 },
            { key: 'namaCabang', label: 'Nama Cabang', kind: 'text', w: 150 },
            { key: 'ket', label: 'Keterangan', kind: 'text', w: 200 },
          ],
          footers: [{ label: 'TOTAL', agg: { qty: 'sum', jumlah: 'sum' } }],
        },
        { type: 'images', id: 'lampiran', title: 'Lampiran / Scan Laporan' },
        PSS, PSS_FOTO,
      ],
    },
    {
      id: 'member-relation', name: 'Member Relation', title: 'Member Relation', icon: '🤝', color: '#d81b60',
      sections: ['Member Merah', 'Member Merah KLIK', 'Member Merah HOREKA'].map((t, i) => ({
        type: 'compare', id: ['merah', 'merahKlik', 'merahHoreka'][i], title: t,
        labelA: '13-Sep', labelB: '13-Oct',
        rows: [
          { key: 'kunjungan', label: 'Kunjungan per Hari', kind: 'num' },
          { key: 'sales', label: 'Sales per Hari', kind: 'money' },
          { key: 'margin', label: 'Margin per Hari', kind: 'money' },
          { key: 'marginPct', label: 'Margin in % / Hari', kind: 'pct', calc: (g) => pct(g('margin'), g('sales')) },
        ],
      })).concat([PSS, PSS_FOTO]),
    },
    {
      id: 'member-service', name: 'Member Service', title: 'Member Service', icon: '💁', color: '#0097a7',
      sections: [
        {
          type: 'table', id: 'kesalahan', title: 'Kesalahan Kasir', periode: true, fixedRows: ['FISIK LEBIH DARI STRUK', 'FISIK KURANG DARI STRUK', 'FISIK DILUAR STRUK'],
          columns: [
            { key: 'jenis', label: 'Jenis Kesalahan', kind: 'text', fixed: true, w: 230 },
            { key: 'transaksi', label: 'Transaksi', kind: 'num' },
            { key: 'rupiah', label: 'Rupiah', kind: 'money' },
          ],
          footers: [{ label: 'TOTAL KESALAHAN', agg: { transaksi: 'sum' } }],
        },
        {
          type: 'table', id: 'kasir', title: 'Nama Kasir yang Paling Banyak Melakukan Kesalahan', rows: 5,
          columns: [
            { key: 'id', label: 'ID Kasir', kind: 'text', w: 100 },
            { key: 'nama', label: 'Nama', kind: 'text', w: 240 },
            { key: 'kesalahan', label: 'Kesalahan', kind: 'num' },
          ],
        },
        {
          type: 'table', id: 'itemLolos', title: 'Item yang Lolos dengan Rupiah Terbesar di Kasir', rows: 6,
          columns: [
            { key: 'desk', label: 'Deskripsi', kind: 'text', w: 320 },
            { key: 'totalRp', label: 'Total Rp', kind: 'money' },
            { key: 'ket', label: 'Keterangan', kind: 'select', options: ['FISIK LEBIH DARI STRUK', 'FISIK KURANG DARI STRUK', 'FISIK DI LUAR STRUK'] },
          ],
        },
        {
          type: 'fields', id: 'program', title: 'Program / Hadiah Member',
          fields: [{ key: 'deskripsi', label: 'Keterangan Program', kind: 'textarea', placeholder: 'Hadiah khusus member merah baru periode ...' }],
        },
        { type: 'images', id: 'poster', title: 'Poster Promo Member' },
        PSS, PSS_FOTO,
      ],
    },
    {
      id: 'omi', name: 'OMI Operational', title: 'OMI Operational', icon: '🏪', color: '#ef6c00',
      sections: [
        {
          type: 'compare', id: 'perbandingan', title: 'Lap Perbandingan Sales OMI (CAB BTM)', labelA: 'Sept', labelB: 'Okt',
          rows: [
            { key: 'spd', label: 'SPD', kind: 'money' },
            { key: 'omiCust', label: 'OMI to Cust', kind: 'money' },
            { key: 'igrOmi', label: 'IGR to OMI', kind: 'money' },
          ],
        },
        {
          type: 'fields', id: 'info', title: 'Periode & Intransit',
          fields: [
            { key: 'periode', label: 'Periode', kind: 'text', placeholder: '13 Sept s.d 13 Okt 2026' },
            { key: 'intransit', label: 'Intransit', kind: 'money' },
          ],
        },
        {
          type: 'table', id: 'omiToCust', title: 'OMI to Cust — SPD per Toko', rows: 6, periode: true,
          columns: [
            { key: 'toko', label: 'Toko / Kode Toko', kind: 'text', w: 220 },
            { key: 'spdA', label: 'SPD Periode A (Bulan Lalu)', kind: 'money' },
            { key: 'spdB', label: 'SPD Periode B (Bulan Ini)', kind: 'money' },
            { key: 'growth', label: 'Growth %', kind: 'pct', calc: (g) => growth(g('spdA'), g('spdB')) },
          ],
          footers: [{ label: 'TOTAL', agg: { spdA: 'sum', spdB: 'sum', growth: (s) => growth(s('spdA'), s('spdB')) } }],
        },
        { type: 'images', id: 'newStore', title: 'OMI Location & Franchise — Progres New Store' },
        {
          type: 'table', id: 'usulan', title: 'Usulan Lokasi', rows: 3,
          columns: [
            { key: 'nama', label: 'Nama', kind: 'text', w: 220 },
            { key: 'domain', label: 'Domain', kind: 'text', w: 140 },
            { key: 'alamat', label: 'Alamat', kind: 'text', w: 320 },
          ],
        },
        PSS, PSS_FOTO,
      ],
    },
    {
      id: 'food', name: 'Food', title: 'Food', icon: '🍜', color: '#c62828',
      sections: [
        {
          type: 'compare', id: 'sales', title: 'Laporan Sales', labelA: '1 - 13 Sept', labelB: '1 - 13 Okt',
          rows: [
            { key: 'sales', label: 'Sales', kind: 'money' },
            { key: 'avgSales', label: 'Avg Sales / Day', kind: 'money' },
            { key: 'margin', label: 'Margin', kind: 'money' },
            { key: 'avgMargin', label: 'Avg Margin / Day', kind: 'money' },
          ],
        },
        itemSalesTable('itemTurun', 'Item Turun Sales Terbesar', 'turun'),
        itemSalesTable('itemNaik', 'Item Naik Sales Terbesar', 'naik'),
        PSS, PSS_FOTO,
      ],
    },
    {
      id: 'nonfood', name: 'Non Food', title: 'Non Food', icon: '🧴', color: '#2e7d32',
      sections: [
        {
          type: 'table', id: 'salesDept', title: 'Sales per Departemen — IGR Only', periode: true, periodeLabel: 'Judul / Periode (mis. Sales OKT 2025 vs 2026)',
          prefill: [
            ['14', 'ROKOK'], ['13', 'COSMETIC'], ['15', 'MEDICINE & FOOD SUPPLEMENT'], ['16', 'HAIR CARE'], ['17', 'ORAL CARE'],
            ['18', 'SKINCARE'], ['19', 'BODY CARE'], ['20', 'PAPER PRODUCT'], ['21', 'DETERGENT & CLEANER'], ['22', 'DESINFECTANT & FRESHENER'],
            ['24', 'HOUSE HOLD NON ELECTRIC&HOBBY'], ['25', 'BABY KIDS CARE'], ['26', 'CLOTHING APPAREL & FOOT WEAR'],
            ['27', 'MECHANICAL TOOL ELECTRICAL&GAS'], ['28', 'DIAPERS'], ['29', 'STATIONARY & SPECIAL ITEM'],
            ['30', 'TOYS & ENTERTAINMENT'], ['42', 'VIRTUAL PRODUCT MOBILE PH&ACC'],
          ].map(([dp, dept]) => ({ dp, dept })),
          columns: [
            { key: 'dp', label: 'DP', kind: 'text', w: 50 },
            { key: 'dept', label: 'Nama Dept', kind: 'text', w: 240 },
            { key: 'nettoA', label: 'Netto (Thn Lalu)', kind: 'money' },
            { key: 'mrgA', label: 'MRG (Thn Lalu)', kind: 'money' },
            { key: 'pctA', label: '%', kind: 'pct', calc: (g) => pct(g('mrgA'), g('nettoA')) },
            { key: 'nettoB', label: 'Netto (Thn Ini)', kind: 'money' },
            { key: 'mrgB', label: 'MRG (Thn Ini)', kind: 'money' },
            { key: 'pctB', label: '%', kind: 'pct', calc: (g) => pct(g('mrgB'), g('nettoB')) },
            { key: 'gNetto', label: 'Growth Netto', kind: 'money', calc: (g) => sub(g('nettoB'), g('nettoA')) },
            { key: 'gNettoPct', label: '%', kind: 'pct', calc: (g) => growth(g('nettoA'), g('nettoB')) },
            { key: 'gMrg', label: 'Growth MRG', kind: 'money', calc: (g) => sub(g('mrgB'), g('mrgA')) },
            { key: 'gMrgPct', label: '%', kind: 'pct', calc: (g) => growth(g('mrgA'), g('mrgB')) },
          ],
          footers: [{
            label: 'ALL',
            agg: {
              nettoA: 'sum', mrgA: 'sum', nettoB: 'sum', mrgB: 'sum', gNetto: 'sum', gMrg: 'sum',
              pctA: (s) => pct(s('mrgA'), s('nettoA')), pctB: (s) => pct(s('mrgB'), s('nettoB')),
              gNettoPct: (s) => growth(s('nettoA'), s('nettoB')), gMrgPct: (s) => growth(s('mrgA'), s('mrgB')),
            },
          }],
        },
        {
          type: 'table', id: 'perDiv', title: 'Laporan Perbandingan Bulan per DIV', periode: true,
          prefill: [{ div: 'TOBACO' }, { div: 'NFOOD' }, { div: 'GMS' }],
          columns: [
            { key: 'div', label: 'DIV', kind: 'text', w: 100 },
            { key: 'salesA', label: 'Sales (Bulan Lalu)', kind: 'money' },
            { key: 'salesB', label: 'Sales (Bulan Ini)', kind: 'money' },
            { key: 'gSales', label: 'Growth Rupiah', kind: 'money', calc: (g) => sub(g('salesB'), g('salesA')) },
            { key: 'gSalesPct', label: '%', kind: 'pct', calc: (g) => growth(g('salesA'), g('salesB')) },
            { key: 'mrgA', label: 'Margin (Bulan Lalu)', kind: 'money' },
            { key: 'mrgB', label: 'Margin (Bulan Ini)', kind: 'money' },
            { key: 'gMrg', label: 'Growth Rupiah', kind: 'money', calc: (g) => sub(g('mrgB'), g('mrgA')) },
            { key: 'gMrgPct', label: '%', kind: 'pct', calc: (g) => growth(g('mrgA'), g('mrgB')) },
          ],
          footers: [{
            label: 'TOTAL',
            agg: {
              salesA: 'sum', salesB: 'sum', gSales: 'sum', mrgA: 'sum', mrgB: 'sum', gMrg: 'sum',
              gSalesPct: (s) => growth(s('salesA'), s('salesB')), gMrgPct: (s) => growth(s('mrgA'), s('mrgB')),
            },
          }],
        },
        {
          type: 'table', id: 'itemNaik', title: 'Item Naik Terbesar', rows: 3, periode: true, tone: 'up',
          columns: [
            C.plu, { ...C.desk, label: 'Desk' },
            { key: 'qtyA', label: 'Qty (Lalu)', kind: 'num' },
            { key: 'salesA', label: 'Sales (Lalu)', kind: 'money' },
            { key: 'mrgA', label: 'Margin (Lalu)', kind: 'money' },
            { key: 'pctA', label: '%', kind: 'pct', calc: (g) => pct(g('mrgA'), g('salesA')) },
            { key: 'qtyB', label: 'Qty (Ini)', kind: 'num' },
            { key: 'salesB', label: 'Sales (Ini)', kind: 'money' },
            { key: 'mrgB', label: 'Margin (Ini)', kind: 'money' },
            { key: 'pctB', label: '%', kind: 'pct', calc: (g) => pct(g('mrgB'), g('salesB')) },
            { key: 'selQty', label: 'Selisih Qty', kind: 'num', calc: (g) => sub(g('qtyB'), g('qtyA')) },
            { key: 'selSales', label: 'Selisih Sales', kind: 'money', calc: (g) => sub(g('salesB'), g('salesA')) },
            { key: 'selMrg', label: 'Selisih Margin', kind: 'money', calc: (g) => sub(g('mrgB'), g('mrgA')) },
            { key: 'selPct', label: 'Selisih %', kind: 'pct', calc: (g) => sub(g('pctB'), g('pctA')) },
          ],
        },
        PSS, PSS_FOTO,
      ],
    },
    {
      id: 'perishable', name: 'Perishable', title: 'Perishable', icon: '🥩', color: '#ad1457',
      sections: [
        {
          type: 'compare', id: 'berjalan', title: 'Sales Berjalan', labelA: '1 - 13 September', labelB: '1 - 13 Oktober',
          rows: [
            { key: 'sales', label: 'Sales', kind: 'money' },
            { key: 'margin', label: 'Margin', kind: 'money' },
            { key: 'mrgPct', label: 'MRG %', kind: 'pct', calc: (g) => pct(g('margin'), g('sales')) },
            { key: 'avgSales', label: 'Avg per Hari — Sales', kind: 'money' },
            { key: 'avgMargin', label: 'Avg per Hari — Margin', kind: 'money' },
          ],
        },
        {
          type: 'table', id: 'harian', title: 'Sales Harian', rows: 7, periode: true, periodeLabel: 'Bulan',
          columns: [
            { key: 'tgl', label: 'Tgl', kind: 'text', w: 50 },
            { key: 'day', label: 'Day', kind: 'text', w: 60 },
            { key: 'sales', label: 'Sales Rph', kind: 'money' },
            { key: 'margin', label: 'Margin', kind: 'money' },
            { key: 'persen', label: 'Persen', kind: 'pct', calc: (g) => pct(g('margin'), g('sales')) },
            { key: 'musnah', label: 'Pemusnahan', kind: 'money' },
            { key: 'pctMusnah', label: '% Musnah', kind: 'pct', calc: (g) => pct(g('musnah'), g('sales')) },
          ],
          footers: [
            { label: 'TOTAL', agg: { sales: 'sum', margin: 'sum', musnah: 'sum', persen: (s) => pct(s('margin'), s('sales')), pctMusnah: (s) => pct(s('musnah'), s('sales')) } },
            { label: 'AVG DAY', agg: { sales: 'avg', margin: 'avg', musnah: 'avg', persen: (s) => pct(s('margin'), s('sales')), pctMusnah: (s) => pct(s('musnah'), s('sales')) } },
          ],
        },
        {
          type: 'fields', id: 'budget', title: 'Budget & Achievement',
          fields: [
            { key: 'budgetSales', label: 'Budget Sales', kind: 'money' },
            { key: 'budgetMargin', label: 'Budget Margin', kind: 'money' },
            { key: 'hari', label: 'Jumlah Hari dalam Bulan', kind: 'num', placeholder: '30' },
            { key: 'budgetDaySales', label: 'Budget/Day — Sales', kind: 'money', calc: (f) => div(f('budgetSales'), f('hari')) },
            { key: 'budgetDayMargin', label: 'Budget/Day — Margin', kind: 'money', calc: (f) => div(f('budgetMargin'), f('hari')) },
            { key: 'achSales', label: 'Achievement Sales', kind: 'pct', calc: (f, t) => pct(t('harian', 'sales'), f('budgetSales')) },
            { key: 'achMargin', label: 'Achievement Margin', kind: 'pct', calc: (f, t) => pct(t('harian', 'margin'), f('budgetMargin')) },
            { key: 'netMargin', label: 'Total Net Margin', kind: 'money' },
            { key: 'netPct', label: 'Persen Net Margin', kind: 'pct', calc: (f, t) => pct(f('netMargin'), t('harian', 'sales')) },
          ],
        },
        PSS, PSS_FOTO,
      ],
    },
    {
      id: 'cashier', name: 'Cashier', title: 'Cashier', icon: '🧾', color: '#5d4037',
      sections: [
        {
          type: 'table', id: 'timeFactor', title: 'Time Factor', rows: 5, periode: true,
          columns: [
            C.plu, { ...C.desk, label: 'Desc' },
            { key: 'frac', label: 'Frac (ctn)', kind: 'num' },
            { key: 'program', label: 'Program', kind: 'text', w: 280 },
            { key: 'tMm', label: 'Target MM', kind: 'num' },
            { key: 'tQty', label: 'Target Qty (pcs)', kind: 'num' },
            { key: 'pMm', label: 'Pencapaian MM', kind: 'num' },
            { key: 'pMmPct', label: '% MM', kind: 'pct', calc: (g) => pct(g('pMm'), g('tMm')) },
            { key: 'pQty', label: 'Pencapaian Qty', kind: 'num' },
            { key: 'pQtyPct', label: '% Qty', kind: 'pct', calc: (g) => pct(g('pQty'), g('tQty')) },
            { key: 'stokCtn', label: 'Stok CTN', kind: 'num' },
            { key: 'stokPcs', label: 'Stok PCS', kind: 'num' },
          ],
        },
        PSS, PSS_FOTO,
      ],
    },
    {
      id: 'support', name: 'Support', title: 'Support', icon: '🛠️', color: '#00838f',
      sections: [
        {
          type: 'cards', id: 'produkBaru', title: 'Produk Baru', periodeLabel: 'Periode (mis. 08–14 Oktober 2026)',
          fields: [
            { key: 'nama', label: 'Nama Produk', kind: 'text', placeholder: 'mis. NABATI WAFER 5 g' },
            { key: 'plu', label: 'PLU', kind: 'text' },
            { key: 'deskPendek', label: 'Deskripsi Pendek', kind: 'text' },
            { key: 'lokasi', label: 'Lokasi di Toko', kind: 'text', placeholder: 'mis. R11A.03.B.01.4' },
          ],
          priceColumns: [
            { key: 'plu', label: 'PLU', kind: 'text', w: 100 },
            { key: 'beli', label: 'Beli', kind: 'num', w: 60 },
            { key: 'unit', label: 'Unit', kind: 'text', w: 100, placeholder: 'mis. PCS(1)' },
            { key: 'normal', label: 'Harga Normal (Rp)', kind: 'money' },
          ],
        },
        PSS, PSS_FOTO,
      ],
    },
  ];

  // ---------- helper data ----------
  function sectionHasData(section, value) {
    if (!value) return false;
    switch (section.type) {
      case 'fields':
        return section.fields.some((f) => !f.calc && String(value[f.key] ?? '').trim() !== '');
      case 'table':
        return (value.rows || []).some((r) => rowHasData(r, section.columns));
      case 'compare':
        return Object.values(value.values || {}).some((v) => String(v.a ?? '').trim() !== '' || String(v.b ?? '').trim() !== '');
      case 'images':
        return Array.isArray(value) && value.some((x) => x && x.src);
      case 'cards':
        return (value.cards || []).some((c) => c.image || section.fields.some((f) => String(c[f.key] ?? '').trim() !== ''));
      default:
        return false;
    }
  }

  // Total kolom tabel lain di divisi yang sama (dipakai calc field).
  function tableSum(divDef, data, tableId, colKey) {
    const sec = divDef.sections.find((s) => s.id === tableId);
    const val = data[tableId];
    if (!sec || !val) return null;
    const col = sec.columns.find((c) => c.key === colKey);
    let s = 0, n = 0;
    (val.rows || []).forEach((r) => {
      if (!rowHasData(r, sec.columns)) return;
      const v = cell(r, col, sec.columns);
      if (typeof v === 'number') { s += v; n++; }
    });
    return n ? s : null;
  }

  function fieldValue(divDef, data, section, field) {
    const vals = data[section.id] || {};
    if (!field.calc) return isNumKind(field.kind) ? parseNum(vals[field.key]) : vals[field.key];
    const f = (k) => {
      const other = section.fields.find((x) => x.key === k);
      return other ? fieldValue(divDef, data, section, other) : null;
    };
    return field.calc(f, (t, c) => tableSum(divDef, data, t, c));
  }

  function compareValue(section, value, row, side) {
    if (!row.calc) return parseNum(value?.values?.[row.key]?.[side]);
    const g = (k) => {
      const r = section.rows.find((x) => x.key === k);
      return r ? compareValue(section, value, r, side) : null;
    };
    return row.calc(g);
  }

  window.WR = {
    DIVISIONS,
    byId: (id) => DIVISIONS.find((d) => d.id === id),
    parseNum, fmt, isNumKind, growth, sub, pct,
    cell, rowHasData, footerValues, sectionHasData, fieldValue, compareValue,
  };
})();
