import { useEffect, useMemo, useState, type ReactNode } from 'react';
import './KolDashboard.css';

/* ---------- data: angka yang terlihat di dashboard live ----------
   Ganti dengan data dari Supabase saat menyambungkan ke Dashboard.tsx. */
const DATA = {
  totalKol: 35,
  active: 12,
  prospect: 23,
  totalViews: 45397904,
  followers: [
    ['MOON', 2200000], ['Hendy Dion Utama', 1000000], ['bapak_rizalll', 153000], ['Erik Pratama', 93700],
    ['Parfum | Buaya', 76400], ['Lucky_pride', 13900], ['windye jasmin', 7737], ['Windy jasmin2', 5814],
    ['RYNHA STORE', 2300], ['Rize', 1004],
  ] as [string, number][],
  content: {
    'Hendy Dion Utama': [10, 34267659],
    'Erik Pratama': [10, 10983549],
    'Windy jasmin2': [13, 53114],
    'Parfum | Buaya': [10, 43605],
    'windye jasmin': [10, 21044],
    'Lucky_pride': [20, 14227],
    'xhbao3': [2, 6945],
    'Shen Liu': [1, 4057],
  } as Record<string, [number, number]>,
};

/* ---------- tipe & navigasi ---------- */
type ViewKey =
  | 'ringkasan' | 'kol' | 'konten' | 'sosial'
  | 'kampanye' | 'seeding' | 'produk'
  | 'pembayaran' | 'pipeline' | 'dokumen' | 'chat' | 'sistem';

type Row = {
  name: string;
  followers: number | null;
  konten: number | null;
  views: number | null;
  vpk: number | null;
  vpf: number | null;
  share: number | null;
};

const NAV: { group: string; items: { key: ViewKey; label: string }[] }[] = [
  { group: 'Overview', items: [{ key: 'ringkasan', label: 'Ringkasan' }] },
  { group: 'KOL', items: [
    { key: 'kol', label: 'Daftar KOL' },
    { key: 'konten', label: 'Konten' },
    { key: 'sosial', label: 'Akun sosial' },
  ] },
  { group: 'Kampanye', items: [
    { key: 'kampanye', label: 'Kampanye' },
    { key: 'seeding', label: 'Seeding' },
    { key: 'produk', label: 'Produk' },
  ] },
  { group: 'Keuangan', items: [{ key: 'pembayaran', label: 'Pembayaran' }] },
  { group: 'Operasional', items: [
    { key: 'pipeline', label: 'Pipeline' },
    { key: 'dokumen', label: 'Dokumen' },
    { key: 'chat', label: 'Chat WhatsApp' },
  ] },
  { group: 'Sistem', items: [{ key: 'sistem', label: 'Sistem & target' }] },
];

/* ---------- format ---------- */
const n0 = (v: number | null | undefined) => (v == null ? '—' : Number(v).toLocaleString('id-ID'));
const n1 = (v: number | null | undefined) => (v == null ? '—' : Number(v).toLocaleString('id-ID', { maximumFractionDigits: 1 }));
const pc = (v: number | null | undefined) => (v == null ? '—' : (v * 100).toLocaleString('id-ID', { maximumFractionDigits: 1 }) + '%');
const initials = (s: string) =>
  s.replace(/[^A-Za-z0-9 ]/g, ' ').trim().split(/\s+/).slice(0, 2).map((w) => w[0]).join('').toUpperCase() || '?';

/* ---------- turunan data ---------- */
function buildRows(): Row[] {
  const fm = Object.fromEntries(DATA.followers);
  const names = [...new Set([...DATA.followers.map((x) => x[0]), ...Object.keys(DATA.content)])];
  return names.map((name) => {
    const followers = fm[name] ?? null;
    const c = DATA.content[name];
    const konten = c ? c[0] : null;
    const views = c ? c[1] : null;
    return {
      name,
      followers,
      konten,
      views,
      vpk: konten && views != null ? views / konten : null,
      vpf: followers && views ? views / followers : null,
      share: views != null ? views / DATA.totalViews : null,
    };
  });
}
const ROWS = buildRows();
const TOP_VIEWS = [...ROWS].filter((r) => r.views != null).sort((a, b) => (b.views ?? 0) - (a.views ?? 0))[0];
const TOP_EFF = [...ROWS].filter((r) => r.vpf != null).sort((a, b) => (b.vpf ?? 0) - (a.vpf ?? 0))[0];

/* ---------- ikon sidebar (relevan per modul) ---------- */
function Icon({ k }: { k: ViewKey }) {
  const common = { viewBox: '0 0 24 24', 'aria-hidden': true as const };
  switch (k) {
    case 'ringkasan': return <svg {...common}><rect x="3" y="3" width="7" height="9" rx="1.5" /><rect x="14" y="3" width="7" height="5" rx="1.5" /><rect x="14" y="12" width="7" height="9" rx="1.5" /><rect x="3" y="16" width="7" height="5" rx="1.5" /></svg>;
    case 'kol': return <svg {...common}><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>;
    case 'konten': return <svg {...common}><rect x="3" y="4" width="18" height="16" rx="2" /><path d="M10 9.5v5l4.5-2.5z" /></svg>;
    case 'sosial': return <svg {...common}><circle cx="12" cy="12" r="4" /><path d="M16 8v5a3 3 0 0 0 6 0v-1a10 10 0 1 0-4 8" /></svg>;
    case 'kampanye': return <svg {...common}><path d="M3 11v2a1 1 0 0 0 1 1h2l5 4V6L6 10H4a1 1 0 0 0-1 1z" /><path d="M15.5 8.5a5 5 0 0 1 0 7" /><path d="M18.5 5.5a9 9 0 0 1 0 13" /></svg>;
    case 'seeding': return <svg {...common}><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" /><path d="M3.3 7 12 12l8.7-5" /><path d="M12 22V12" /></svg>;
    case 'produk': return <svg {...common}><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" /><path d="M3 6h18" /><path d="M16 10a4 4 0 0 1-8 0" /></svg>;
    case 'pembayaran': return <svg {...common}><rect x="2" y="5" width="20" height="14" rx="2" /><path d="M2 10h20" /></svg>;
    case 'pipeline': return <svg {...common}><path d="M3 4h18l-7 9v6l-4 2v-8z" /></svg>;
    case 'dokumen': return <svg {...common}><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><path d="M14 2v6h6" /><path d="M8 13h8M8 17h8" /></svg>;
    case 'chat': return <svg {...common}><path d="M21 11.5a8.4 8.4 0 0 1-9 8.4 8.5 8.5 0 0 1-4-1L3 21l1.2-4.2A8.4 8.4 0 1 1 21 11.5z" /></svg>;
    case 'sistem': return <svg {...common}><circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="5" /><circle cx="12" cy="12" r="1.5" /></svg>;
  }
}

/* ---------- grafik ---------- */
function Donut({ active, total }: { active: number; total: number }) {
  const r = 64;
  const C = 2 * Math.PI * r;
  const frac = active / total;
  return (
    <svg width="208" height="208" viewBox="0 0 208 208" role="img" aria-label={`${active} dari ${total} KOL aktif`}>
      <defs>
        <linearGradient id="donutGrad" x1="0" x2="1" y1="0" y2="1">
          <stop offset="0" stopColor="#9A4A6B" />
          <stop offset="1" stopColor="#7A2E4A" />
        </linearGradient>
      </defs>
      <circle cx="104" cy="104" r={r} fill="none" stroke="#EDEEF2" strokeWidth="20" />
      <circle
        cx="104" cy="104" r={r} fill="none" stroke="url(#donutGrad)" strokeWidth="20" strokeLinecap="round"
        strokeDasharray={`${C * frac} ${C}`} transform="rotate(-90 104 104)"
      />
      <text x="104" y="101" textAnchor="middle" fontSize="32" fontWeight="800" fill="#0E1116">{Math.round(frac * 100)}%</text>
      <text x="104" y="122" textAnchor="middle" fontSize="12" fontWeight="600" fill="#6B7180">KOL aktif</text>
    </svg>
  );
}

function Scatter({ onPick }: { onPick: (name: string) => void }) {
  const pts = ROWS.filter((r) => r.followers && r.views);
  const W = 640, H = 320, pl = 64, pr = 24, pt = 18, pb = 44;
  const x0 = 3.5, x1 = 6.3, y0 = 3.5, y1 = 7.8;
  const sx = (f: number) => pl + (Math.log10(f) - x0) / (x1 - x0) * (W - pl - pr);
  const sy = (v: number) => H - pb - (Math.log10(v) - y0) / (y1 - y0) * (H - pb - pt);
  const ticksX = [1e4, 1e5, 1e6];
  const ticksY = [1e4, 1e5, 1e6, 1e7];
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" role="img" aria-label="Diagram sebar followers terhadap views">
      {ticksX.map((t) => (
        <g key={`x${t}`}>
          <line x1={sx(t)} x2={sx(t)} y1={pt} y2={H - pb} stroke="#EDEEF2" strokeDasharray="3 4" />
          <text x={sx(t)} y={H - pb + 20} textAnchor="middle" fontSize="11" fill="#6B7180">{n0(t)}</text>
        </g>
      ))}
      {ticksY.map((t) => (
        <g key={`y${t}`}>
          <line x1={pl} x2={W - pr} y1={sy(t)} y2={sy(t)} stroke="#EDEEF2" strokeDasharray="3 4" />
          <text x={pl - 10} y={sy(t) + 4} textAnchor="end" fontSize="11" fill="#6B7180">{n0(t)}</text>
        </g>
      ))}
      <text x={(pl + W - pr) / 2} y={H - 6} textAnchor="middle" fontSize="12" fontWeight="600" fill="#6B7180">Followers (skala log)</text>
      <text x={16} y={(pt + H - pb) / 2} transform={`rotate(-90 16 ${(pt + H - pb) / 2})`} textAnchor="middle" fontSize="12" fontWeight="600" fill="#6B7180">Views (skala log)</text>
      {pts.map((r) => (
        <g key={r.name} onClick={() => onPick(r.name)} style={{ cursor: 'pointer' }}>
          <circle cx={sx(r.followers!)} cy={sy(r.views!)} r="8" fill="#7A2E4A" fillOpacity=".16" />
          <circle cx={sx(r.followers!)} cy={sy(r.views!)} r="5" fill="#7A2E4A" stroke="#fff" strokeWidth="2" />
          <text x={sx(r.followers!) + 12} y={sy(r.views!) + 4} fontSize="12" fontWeight="600" fill="#2A2E36">{r.name}</text>
          <title>{`${r.name}: ${n0(r.followers)} followers, ${n0(r.views)} views`}</title>
        </g>
      ))}
    </svg>
  );
}

/* ---------- komponen kecil ---------- */
function Kpi({ label, value, sub, tone, pending }: { label: string; value: string; sub?: string; tone?: 'hero' | 'plum' | 'grey'; pending?: boolean }) {
  const cls = ['kpi', tone === 'hero' ? 'hero' : tone === 'plum' ? 'tint p' : tone === 'grey' ? 'tint g' : '', pending ? 'pending' : '']
    .filter(Boolean).join(' ');
  return (
    <div className={cls}>
      <div className="l">{label}</div>
      <div className="v">{value}</div>
      {sub && <div className="s">{sub}</div>}
    </div>
  );
}

function Panel({ title, sub, children, className }: { title: string; sub?: string; children: ReactNode; className?: string }) {
  return (
    <section className={`panel ${className ?? ''}`}>
      <div className="ph">
        <div>
          <h2>{title}</h2>
          {sub && <p>{sub}</p>}
        </div>
      </div>
      {children}
    </section>
  );
}

function BarRow({ name, value, max, onClick }: { name: string; value: number; max: number; onClick?: () => void }) {
  return (
    <button className="bar-btn" onClick={onClick} aria-label={`Buka detail ${name}`}>
      <span className="trunc">{name}</span>
      <span className="t"><i style={{ width: `${((value / max) * 100).toFixed(2)}%` }} /></span>
      <span className="n">{n0(value)}</span>
    </button>
  );
}

function Placeholder({ title, sub, metrics }: { title: string; sub: string; metrics: string[] }) {
  return (
    <>
      <div className="top">
        <div>
          <div className="kicker">Menunggu data</div>
          <h1>{title}</h1>
          <p className="sub">{sub}</p>
        </div>
      </div>
      <div className="kpis">
        {metrics.map((m) => <Kpi key={m} label={m} value="—" sub="Belum tersambung" pending />)}
      </div>
      <section className="panel">
        <div className="empty">
          Panel ini akan terisi saat sumber data {title.toLowerCase()} tersambung.<br />
          Tidak ada angka yang ditampilkan agar tidak keliru dibaca sebagai nol.
        </div>
      </section>
    </>
  );
}

/* ---------- ekspor CSV ---------- */
function exportCsv(rows: Row[]) {
  const head = ['Nama', 'Followers', 'Konten', 'Views', 'Views per konten', 'Views per follower', 'Porsi views'];
  const lines = rows.map((r) => [
    r.name,
    r.followers ?? '',
    r.konten ?? '',
    r.views ?? '',
    r.vpk == null ? '' : Math.round(r.vpk),
    r.vpf == null ? '' : r.vpf.toFixed(2),
    r.share == null ? '' : (r.share * 100).toFixed(2) + '%',
  ]);
  const csv = [head, ...lines].map((l) => l.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
  const url = URL.createObjectURL(new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = 'performa-kol.csv';
  a.click();
  URL.revokeObjectURL(url);
}

/* ---------- tampilan ---------- */
function RingkasanView({ onPick }: { onPick: (name: string) => void }) {
  const maxF = Math.max(...DATA.followers.map((x) => x[1]));
  return (
    <>
      <div className="top">
        <div>
          <div className="kicker">Executive summary</div>
          <h1>Ringkasan</h1>
          <p className="sub">
            {DATA.totalKol} KOL terdaftar, {DATA.active} aktif. Views sudah tercatat, tetapi penjualan affiliate belum terhubung,
            sehingga GMV dan orders belum bisa diukur.
          </p>
        </div>
      </div>

      <div className="insights">
        <div className="insight">
          <div className="big">{pc(TOP_VIEWS.share)}</div>
          <div className="txt"><b>{TOP_VIEWS.name}</b> menyumbang porsi views terbesar dari total {n0(DATA.totalViews)}.</div>
        </div>
        <div className="insight">
          <div className="big">{Math.round((DATA.prospect / DATA.totalKol) * 100)}%</div>
          <div className="txt">{DATA.prospect} dari {DATA.totalKol} KOL masih berstatus prospect. Ini peluang untuk aktivasi.</div>
        </div>
        <div className="insight">
          <div className="big">{n1(TOP_EFF.vpf)}×</div>
          <div className="txt"><b>{TOP_EFF.name}</b> mencatat views per follower tertinggi di antara akun yang datanya lengkap.</div>
        </div>
        <div className="insight warnbox">
          <div className="big">Belum ada</div>
          <div className="txt">Data GMV dan orders. Angka penjualan akan muncul setelah atribusi tersambung.</div>
        </div>
      </div>

      <div className="kpis">
        <Kpi tone="plum" label="Total KOL" value={n0(DATA.totalKol)} sub={`${DATA.active} aktif · ${DATA.prospect} prospect`} />
        <Kpi tone="hero" label="Total views" value={n0(DATA.totalViews)} sub={`dari ${ROWS.filter((r) => r.views).length} KOL dengan konten`} />
        <Kpi tone="grey" label="KOL aktif" value={n0(DATA.active)} sub={`${Math.round((DATA.active / DATA.totalKol) * 100)}% dari seluruh KOL`} />
        <Kpi label="GMV tercatat" value="—" sub="Menunggu data penjualan" pending />
      </div>

      <div className="grid">
        <Panel title="Followers per KOL" sub="10 teratas · klik untuk detail">
          {DATA.followers.map(([name, f]) => (
            <BarRow key={name} name={name} value={f} max={maxF} onClick={() => onPick(name)} />
          ))}
        </Panel>
        <Panel title="Status KOL" sub="Aktif dibanding prospect">
          <div className="donut-wrap">
            <Donut active={DATA.active} total={DATA.totalKol} />
            <div className="legend">
              <span><i className="dot" style={{ background: '#7A2E4A' }} />Aktif {DATA.active}</span>
              <span><i className="dot" style={{ background: '#C9CDD8' }} />Prospect {DATA.prospect}</span>
            </div>
          </div>
        </Panel>
      </div>

      <div className="grid eq">
        <Panel title="Followers vs views" sub="Klik titik untuk detail KOL · skala log">
          <Scatter onPick={onPick} />
        </Panel>
        <Panel title="Catatan data" sub="Hal yang perlu dilengkapi">
          <div className="note-list">
            <div>Angka GMV dan orders belum tersedia, sehingga tidak ditampilkan.</div>
            <div>Tren harian belum tersedia. Grafik tren akan muncul setelah data harian tersambung.</div>
            <div>Satu KOL dengan konten belum terlihat di tangkapan awal. Angka total tetap dari dashboard.</div>
          </div>
        </Panel>
      </div>
    </>
  );
}

function KolListView() {
  return (
    <>
      <div className="top">
        <div>
          <div className="kicker">KOL</div>
          <h1>Daftar KOL</h1>
          <p className="sub">Semua KOL aktif beserta statusnya.</p>
        </div>
      </div>
      <div className="kpis">
        <Kpi label="Total KOL" value={String(DATA.totalKol)} />
        <Kpi label="KOL aktif" value={String(DATA.active)} />
        <Kpi label="KOL prospect" value={String(DATA.prospect)} />
        <Kpi label="Detail per KOL" value="—" sub="Menunggu data daftar" pending />
      </div>
      <section className="panel">
        <div className="empty">Daftar lengkap KOL (nama panggung, tier, kategori, domisili, status) akan tampil di sini.</div>
      </section>
    </>
  );
}

function KontenView({ onPick }: { onPick: (name: string) => void }) {
  const [sort, setSort] = useState<{ k: keyof Row; d: 1 | -1 }>({ k: 'views', d: -1 });
  const [q, setQ] = useState('');

  const rows = useMemo(() => {
    const s = q.trim().toLowerCase();
    return ROWS.filter((r) => r.name.toLowerCase().includes(s)).sort((a, b) => {
      const x = a[sort.k];
      const y = b[sort.k];
      if (sort.k === 'name') return a.name.localeCompare(b.name) * sort.d;
      if (x == null && y == null) return 0;
      if (x == null) return 1;
      if (y == null) return -1;
      return ((x as number) - (y as number)) * sort.d;
    });
  }, [q, sort]);

  const cols: [keyof Row, string][] = [
    ['name', 'Nama'], ['followers', 'Followers'], ['konten', 'Konten'], ['views', 'Views'],
    ['vpk', 'Views per konten'], ['vpf', 'Views per follower'], ['share', 'Porsi views'],
  ];

  const toggleSort = (k: keyof Row) =>
    setSort((s) => (s.k === k ? { k, d: (s.d * -1) as 1 | -1 } : { k, d: k === 'name' ? 1 : -1 }));

  const dash = <span className="muted">—</span>;

  return (
    <>
      <div className="top">
        <div>
          <div className="kicker">KOL</div>
          <h1>Konten</h1>
          <p className="sub">Urutkan kolom, cari nama, atau klik nama untuk melihat detail.</p>
        </div>
      </div>
      <section className="panel">
        <div className="toolbar">
          <input
            className="field"
            type="search"
            placeholder="Cari nama KOL…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            aria-label="Cari KOL"
          />
          <span className="count">{rows.length} KOL</span>
          <button className="btn" onClick={() => exportCsv(rows)}>Ekspor CSV</button>
        </div>
        <table>
          <thead>
            <tr>
              {cols.map(([k, label]) => {
                const on = sort.k === k;
                const arrow = on ? (sort.d > 0 ? ' ↑' : ' ↓') : '';
                return (
                  <th key={k} className={k === 'name' ? '' : 'r'}>
                    <button onClick={() => toggleSort(k)} aria-label={`Urutkan ${label}`}>{label}{arrow}</button>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr><td colSpan={7} className="muted">Tidak ada hasil.</td></tr>
            )}
            {rows.map((r) => (
              <tr key={r.name}>
                <td><button className="name-btn" onClick={() => onPick(r.name)}>{r.name}</button></td>
                <td className="r">{r.followers == null ? dash : n0(r.followers)}</td>
                <td className="r">{r.konten == null ? dash : n0(r.konten)}</td>
                <td className="r">{r.views == null ? dash : n0(r.views)}</td>
                <td className="r">{r.vpk == null ? dash : n0(Math.round(r.vpk))}</td>
                <td className="r">{r.vpf == null ? dash : `${n1(r.vpf)}×`}</td>
                <td className="r">{r.share == null ? dash : pc(r.share)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="foot">Views per follower = total views dibagi followers. Angka kosong (—) berarti data belum tersedia.</p>
      </section>
    </>
  );
}

function SosialView({ onPick }: { onPick: (name: string) => void }) {
  const maxF = Math.max(...DATA.followers.map((x) => x[1]));
  return (
    <>
      <div className="top">
        <div>
          <div className="kicker">KOL</div>
          <h1>Akun sosial</h1>
          <p className="sub">Followers per akun. Klik nama untuk detail.</p>
        </div>
      </div>
      <Panel title="Followers per KOL" sub="10 teratas">
        {DATA.followers.map(([name, f]) => (
          <BarRow key={name} name={name} value={f} max={maxF} onClick={() => onPick(name)} />
        ))}
      </Panel>
    </>
  );
}

/* ---------- drawer detail ---------- */
function Drawer({ row, onClose }: { row: Row | null; onClose: () => void }) {
  return (
    <aside className={`drawer ${row ? 'open' : ''}`} aria-label="Detail KOL" aria-hidden={!row}>
      <button className="close" onClick={onClose}>Tutup</button>
      {row && (
        <div>
          <div className="avatar">{initials(row.name)}</div>
          <div className="kicker">Detail KOL</div>
          <h3>{row.name}</h3>
          <p className="sub">{row.konten == null ? 'Belum ada konten tercatat.' : 'Performa konten dan akun sosial.'}</p>
          <div className="metric"><span>Followers</span><b>{n0(row.followers)}</b></div>
          <div className="metric"><span>Konten</span><b>{n0(row.konten)}</b></div>
          <div className="metric"><span>Views</span><b>{n0(row.views)}</b></div>
          <div className="metric"><span>Views per konten</span><b>{row.vpk == null ? '—' : n0(Math.round(row.vpk))}</b></div>
          <div className="metric"><span>Views per follower</span><b>{row.vpf == null ? '—' : `${n1(row.vpf)}×`}</b></div>
          <div className="metric"><span>Porsi views</span><b>{pc(row.share)}</b></div>
          <div className="metric" style={{ border: 0 }}><span>GMV &amp; orders</span><b className="muted">Belum tersedia</b></div>
        </div>
      )}
    </aside>
  );
}

/* ---------- komponen utama ---------- */
export default function KolDashboard() {
  const [view, setView] = useState<ViewKey>('ringkasan');
  const [picked, setPicked] = useState<string | null>(null);
  const pickedRow = picked ? ROWS.find((r) => r.name === picked) ?? null : null;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setPicked(null); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  useEffect(() => { window.scrollTo({ top: 0 }); }, [view]);

  const onPick = (name: string) => setPicked(name);

  let content: ReactNode;
  switch (view) {
    case 'ringkasan': content = <RingkasanView onPick={onPick} />; break;
    case 'kol': content = <KolListView />; break;
    case 'konten': content = <KontenView onPick={onPick} />; break;
    case 'sosial': content = <SosialView onPick={onPick} />; break;
    case 'kampanye': content = <Placeholder title="Kampanye" sub="Target omzet, budget, dan periode kampanye" metrics={['Target omzet', 'Budget', 'Realisasi', 'Komisi']} />; break;
    case 'seeding': content = <Placeholder title="Seeding produk" sub="Produk yang dikirim ke KOL" metrics={['Pengiriman', 'Nilai seeding', 'Menunggu konten', 'Konten selesai']} />; break;
    case 'produk': content = <Placeholder title="Produk" sub="Katalog produk dan harga" metrics={['Jumlah produk', 'Produk promo', 'Stok rendah', 'Nilai rata-rata']} />; break;
    case 'pembayaran': content = <Placeholder title="Pembayaran" sub="Pembayaran ke KOL dan statusnya" metrics={['Total dibayar', 'Menunggu bayar', 'Diajukan', 'Ditolak']} />; break;
    case 'pipeline': content = <Placeholder title="Pipeline" sub="Status KOL, aksi aktif, dan riwayat perubahan" metrics={['KOL prospect', 'KOL aktif', 'Aksi berjalan', 'Terlambat']} />; break;
    case 'dokumen': content = <Placeholder title="Dokumen & kesepakatan" sub="Kontrak dan tarif KOL" metrics={['Dokumen', 'Kontrak aktif', 'Akan kedaluwarsa', 'Tarif rata-rata']} />; break;
    case 'chat': content = <Placeholder title="Chat WhatsApp" sub="200 pesan terbaru" metrics={['Percakapan', 'Belum dibaca', 'Pesan total', 'Aktivitas terakhir']} />; break;
    case 'sistem': content = <Placeholder title="Sistem & target" sub="Target dan alert operasional" metrics={['Target terdaftar', 'Alert aktif', 'Alert selesai', 'Alert kritis']} />; break;
  }

  return (
    <div className="app">
      <main>
        <div id="view">{content}</div>
      </main>

      <aside className="side">
        <div className="brand">
          <span className="logo">SP</span>
          <div>
            <b>ScentPlus</b>
            <span>KOL &amp; Affiliate Live</span>
          </div>
        </div>

        {NAV.map((g) => (
          <div key={g.group}>
            <div className="nav-label">{g.group}</div>
            <nav className="nav">
              {g.items.map((it) => (
                <button
                  key={it.key}
                  aria-current={view === it.key ? 'page' : undefined}
                  onClick={() => setView(it.key)}
                >
                  <span className="ico"><Icon k={it.key} /></span>
                  {it.label}
                </button>
              ))}
            </nav>
          </div>
        ))}

        <div className="side-foot">Mode review · data dari dashboard live</div>
      </aside>

      <Drawer row={pickedRow} onClose={() => setPicked(null)} />
    </div>
  );
}
