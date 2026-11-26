import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { supabase } from './lib/supabase';
import './KolDashboard.css';

/* ---------- tipe data ---------- */
type Kol = { id: string; full_name: string; stage_name: string | null; tier: string | null; category: string | null; status: string; domicile: string | null; source: string | null; whatsapp: string | null; email: string | null };
type Content = { kol_id: string; platform: string | null; views: number | null; gmv: number | null; orders: number | null; publish_date: string | null };
type Campaign = { id: string; name: string; product: string | null; status: string; start_date: string | null; end_date: string | null; target_revenue: number | null; target_orders: number | null; budget: number | null; commission_rate: number | null };
type Social = { kol_id: string; platform: string; username: string | null; followers: number | null; engagement_rate: number | null; avg_views: number | null };
type Payment = { kol_id: string; payment_type: string; amount: number | null; paid_at: string | null; status: string; requested_at: string | null };
type Seeding = { kol_id: string; campaign_id: string | null; product_name: string | null; quantity: number | null; total_value: number | null; status: string; content_deadline: string | null; order_ref: string | null; shipping_recipient_name: string | null; shipping_phone: string | null; shipping_address: string | null; shipping_city: string | null; shipping_province: string | null; shipping_postal_code: string | null };
type Product = { id: string; name: string; sku: string | null; category: string | null; normal_value: number | null; promo_value: number | null; stock: number | null; status: string | null };
type StatusEvent = { kol_id: string; from_status: string | null; to_status: string; at: string; pic: string | null };
type Action = { kol_id: string | null; title: string; action: string | null; pic: string | null; deadline: string | null; status: string; resolved_at: string | null };
type Alert = { severity: string | null; alert_status: string | null };
type Doc = { kol_id: string; doc_type: string; title: string | null; platform: string | null; deliverable: string | null; rate_amount: number | null; currency: string | null; expires_at: string | null };
type Chat = { id: string; display_name: string | null; contact_name: string | null; phone_number: string | null; unread_count: number | null; last_message: string | null; last_message_at: string | null };
type Msg = { conversation_id: string; direction: string; body: string | null; media_type: string | null; sent_at: string; delivery_status?: string | null };

type Res<T> = { data: T[]; error: string | null };
type Cnt = { value: number | null; error: string | null };
type Live = {
  kols: Res<Kol>; contents: Res<Content>; campaigns: Res<Campaign>; social: Res<Social>; payments: Res<Payment>;
  seedings: Res<Seeding>; products: Res<Product>; statusEvents: Res<StatusEvent>; actions: Res<Action>;
  alerts: Res<Alert>; docs: Res<Doc>; chats: Res<Chat>; recent: Res<Msg>;
  referralActive: Cnt; attributions: Cnt; targets: Cnt; messages: Cnt;
};

type Row = {
  id: string; name: string; followers: number | null; konten: number | null; views: number | null;
  gmv: number | null; orders: number | null; vpk: number | null; vpf: number | null; share: number | null;
};

/* ---------- helper ---------- */
const n0 = (v: number | null | undefined) => (v == null ? '—' : Number(v).toLocaleString('id-ID'));
const n1 = (v: number | null | undefined) => (v == null ? '—' : Number(v).toLocaleString('id-ID', { maximumFractionDigits: 1 }));
const pc = (v: number | null | undefined) => (v == null ? '—' : (v * 100).toLocaleString('id-ID', { maximumFractionDigits: 1 }) + '%');
const fmtRp = (v: number | null | undefined) => (v == null ? '—' : 'Rp ' + Number(v).toLocaleString('id-ID'));
const fmtDate = (s: string | null | undefined) => (s ? new Date(s).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }) : '—');
const fmtDateTime = (s: string | null | undefined) => (s ? new Date(s).toLocaleString('id-ID', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—');
const initials = (s: string) =>
  s.replace(/[^A-Za-z0-9 ]/g, ' ').trim().split(/\s+/).slice(0, 2).map((w) => w[0]).join('').toUpperCase() || '?';

const TONE: Record<string, string> = {
  active: 'good', ongoing: 'good', completed: 'good', published: 'good', paid: 'good', approved: 'good',
  prospect: 'neutral', planning: 'neutral', draft: 'neutral',
  pending: 'warn', requested: 'warn',
  cancelled: 'bad', rejected: 'bad', failed: 'bad', void: 'bad',
};

/* ---------- konteks privasi ---------- */
const PiiCtx = createContext<(v: string | null | undefined) => string>((v) => v || '—');

/* ---------- pengambilan data ---------- */
const friendly = (m: string) =>
  /permission denied/i.test(m) ? 'Akun ini belum punya akses ke sumber data ini.' : m;

async function list<T>(p: PromiseLike<{ data: unknown[] | null; error: { message: string } | null }>): Promise<Res<T>> {
  const r = await p;
  return { data: (r.data ?? []) as T[], error: r.error ? friendly(r.error.message) : null };
}
async function count(p: PromiseLike<{ count: number | null; error: { message: string } | null }>): Promise<Cnt> {
  const r = await p;
  return { value: r.count ?? null, error: r.error ? friendly(r.error.message) : null };
}

async function loadLive(): Promise<Live> {
  const [kols, contents, campaigns, social, payments, seedings, products, statusEvents, actions, alerts, docs, chats, referralActive, attributions, targets, messages, recent] = await Promise.all([
    list<Kol>(supabase.from('kols').select('id,full_name,stage_name,tier,category,status,domicile,source,whatsapp,email').is('archived_at', null).order('created_at', { ascending: false })),
    list<Content>(supabase.from('kol_contents').select('kol_id,platform,views,gmv,orders,publish_date')),
    list<Campaign>(supabase.from('kol_campaigns').select('id,name,product,status,start_date,end_date,target_revenue,target_orders,budget,commission_rate').order('start_date', { ascending: true })),
    list<Social>(supabase.from('kol_social_accounts').select('kol_id,platform,username,followers,engagement_rate,avg_views')),
    list<Payment>(supabase.from('kol_payments').select('kol_id,payment_type,amount,paid_at,status,requested_at').order('created_at', { ascending: false })),
    list<Seeding>(supabase.from('kol_seedings').select('kol_id,campaign_id,product_name,quantity,total_value,status,content_deadline,order_ref,shipping_recipient_name,shipping_phone,shipping_address,shipping_city,shipping_province,shipping_postal_code').order('created_at', { ascending: false })),
    list<Product>(supabase.from('kol_products').select('id,name,sku,category,normal_value,promo_value,stock,status').order('name', { ascending: true })),
    list<StatusEvent>(supabase.from('kol_status_history').select('kol_id,from_status,to_status,at,pic').order('at', { ascending: false }).limit(30)),
    list<Action>(supabase.from('kol_actions').select('kol_id,title,action,pic,deadline,status,resolved_at').eq('is_current', true).order('deadline', { ascending: true })),
    list<Alert>(supabase.from('kol_operational_alerts').select('severity,alert_status')),
    list<Doc>(supabase.from('kol_documents').select('kol_id,doc_type,title,platform,deliverable,rate_amount,currency,expires_at').order('created_at', { ascending: false })),
    list<Chat>(supabase.from('wa_conversations').select('id,display_name,contact_name,phone_number,unread_count,last_message,last_message_at').order('last_message_at', { ascending: false, nullsFirst: false })),
    count(supabase.from('kol_referral_rules').select('id', { count: 'exact', head: true }).eq('desired_active', true)),
    count(supabase.from('kol_order_attributions').select('id', { count: 'exact', head: true })),
    count(supabase.from('kol_targets').select('id', { count: 'exact', head: true })),
    count(supabase.from('wa_messages').select('id', { count: 'exact', head: true })),
    list<Msg>(supabase.from('wa_messages').select('conversation_id,direction,body,media_type,sent_at').order('sent_at', { ascending: false }).limit(200)),
  ]);
  return { kols, contents, campaigns, social, payments, seedings, products, statusEvents, actions, alerts, docs, chats, recent, referralActive, attributions, targets, messages };
}

/* ---------- turunan data ---------- */
function derive(l: Live) {
  const names = new Map(l.kols.data.map((k) => [k.id, k.stage_name || k.full_name]));
  const nameOf = (id: string | null | undefined) => (id ? names.get(id) ?? '—' : '—');

  const fol = new Map<string, number>();
  for (const s of l.social.data) if (names.has(s.kol_id)) fol.set(s.kol_id, (fol.get(s.kol_id) ?? 0) + Number(s.followers ?? 0));

  const con = new Map<string, { n: number; views: number; gmv: number; orders: number }>();
  for (const c of l.contents.data) {
    if (!names.has(c.kol_id)) continue;
    const a = con.get(c.kol_id) ?? { n: 0, views: 0, gmv: 0, orders: 0 };
    a.n += 1; a.views += Number(c.views ?? 0); a.gmv += Number(c.gmv ?? 0); a.orders += Number(c.orders ?? 0);
    con.set(c.kol_id, a);
  }

  const totalViews = [...con.values()].reduce((s, a) => s + a.views, 0);
  const gmv = [...con.values()].reduce((s, a) => s + a.gmv, 0);
  const orders = [...con.values()].reduce((s, a) => s + a.orders, 0);

  const rows: Row[] = [...new Set([...fol.keys(), ...con.keys()])].map((id) => {
    const followers = fol.get(id) ?? null;
    const c = con.get(id);
    const views = c ? c.views : null;
    const konten = c ? c.n : null;
    return {
      id,
      name: names.get(id) ?? '—',
      followers,
      konten,
      views,
      gmv: c ? c.gmv : null,
      orders: c ? c.orders : null,
      vpk: konten && views != null ? views / konten : null,
      vpf: followers && views ? views / followers : null,
      share: views != null && totalViews ? views / totalViews : null,
    };
  }).sort((a, b) => (b.views ?? -1) - (a.views ?? -1));

  const followersTop = rows.filter((r) => r.followers).sort((a, b) => (b.followers ?? 0) - (a.followers ?? 0)).slice(0, 10);
  const top = rows.find((r) => r.views != null) ?? null;
  const topEff = [...rows].filter((r) => r.vpf != null).sort((a, b) => (b.vpf ?? 0) - (a.vpf ?? 0))[0] ?? null;
  const statusCount = new Map<string, number>();
  for (const k of l.kols.data) statusCount.set(k.status, (statusCount.get(k.status) ?? 0) + 1);

  const byMonth = new Map<string, { views: number; posts: number }>();
  for (const c of l.contents.data) {
    if (!c.publish_date) continue;
    const key = c.publish_date.slice(0, 7);
    const a = byMonth.get(key) ?? { views: 0, posts: 0 };
    a.views += Number(c.views ?? 0);
    a.posts += 1;
    byMonth.set(key, a);
  }
  const monthly = [...byMonth.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, v]) => ({ key, ...v }));

  return { names, nameOf, rows, totalViews, gmv, orders, followersTop, top, topEff, statusCount, monthly };
}
type Model = ReturnType<typeof derive>;

/* ---------- navigasi ---------- */
type ViewKey =
  | 'ringkasan' | 'kol' | 'konten' | 'sosial'
  | 'kampanye' | 'seeding' | 'produk'
  | 'pembayaran' | 'pipeline' | 'dokumen' | 'chat' | 'sistem';

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

/* ---------- ikon sidebar ---------- */
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
  const frac = total ? active / total : 0;
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

const short = (v: number) => {
  if (v >= 1e9) return `${v / 1e9} M`;
  if (v >= 1e6) return `${v / 1e6} jt`;
  if (v >= 1e3) return `${v / 1e3} rb`;
  return String(v);
};

/* ---------- grafik garis ---------- */
function LineMulti({ labels, series, log }: { labels: string[]; series: { name: string; color: string; values: number[] }[]; log?: boolean }) {
  if (labels.length < 2) return <div className="empty">Belum cukup data untuk grafik garis.</div>;
  const W = 640, H = 340, pl = 84, pr = 20, pt = 14, pb = 84;
  const all = series.flatMap((s) => s.values).filter((v) => v > 0);
  const tf = (v: number) => (log ? Math.log10(Math.max(v, 1)) : v);
  const ymin = log ? Math.floor(Math.log10(Math.max(1, Math.min(...all)))) : 0;
  const ymax = log
    ? Math.max(ymin + 1, Math.ceil(Math.log10(Math.max(...all))))
    : (Math.max(...all) || 1) * 1.1;
  const sy = (v: number) => H - pb - ((tf(v) - ymin) / (ymax - ymin)) * (H - pb - pt);
  const sx = (i: number) => pl + (i * (W - pl - pr)) / (labels.length - 1);
  const ticks = log
    ? Array.from({ length: ymax - ymin + 1 }, (_, i) => 10 ** (ymin + i))
    : [0, 0.25, 0.5, 0.75, 1].map((f) => f * ymax);
  return (
    <div>
      <div className="legend" style={{ justifyContent: 'flex-start', marginBottom: 8 }}>
        {series.map((s) => (
          <span key={s.name}><i className="dot" style={{ background: s.color }} />{s.name}</span>
        ))}
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" role="img" aria-label="Grafik garis followers dan views per KOL">
        {ticks.map((t) => (
          <g key={t}>
            <line x1={pl} x2={W - pr} y1={sy(t)} y2={sy(t)} stroke="#EDEEF2" strokeDasharray="3 4" />
            <text x={pl - 10} y={sy(t) + 4} textAnchor="end" fontSize="11" fill="#6B7180">{short(t)}</text>
          </g>
        ))}
        {labels.map((l, i) => (
          <text key={`${l}${i}`} x={sx(i)} y={H - pb + 16} textAnchor="end" fontSize="11" fill="#6B7180"
            transform={`rotate(-35 ${sx(i)} ${H - pb + 16})`}>{l}</text>
        ))}
        {series.map((s) => (
          <g key={s.name}>
            <path
              d={s.values.map((v, i) => `${i ? 'L' : 'M'}${sx(i).toFixed(1)},${sy(v).toFixed(1)}`).join(' ')}
              fill="none" stroke={s.color} strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round"
            />
            {s.values.map((v, i) => (
              <circle key={i} cx={sx(i)} cy={sy(v)} r="4.5" fill="#fff" stroke={s.color} strokeWidth="2.5">
                <title>{`${labels[i]} · ${s.name}: ${n0(v)}`}</title>
              </circle>
            ))}
          </g>
        ))}
      </svg>
    </div>
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

function Badge({ value }: { value: string }) {
  return <span className={`pill tone-${TONE[value] ?? 'neutral'}`}>{value}</span>;
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

type Col<T> = { label: string; render: (r: T) => ReactNode; num?: boolean };

function DataTable<T extends object>({ rows, cols, empty, pageSize = 15, searchable = true }: { rows: T[]; cols: Col<T>[]; empty: string; pageSize?: number; searchable?: boolean }) {
  const [q, setQ] = useState('');
  const [expanded, setExpanded] = useState(false);
  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return rows;
    return rows.filter((r) => Object.values(r).some((v) => String(v ?? '').toLowerCase().includes(s)));
  }, [rows, q]);
  const shown = expanded ? filtered : filtered.slice(0, pageSize);
  return (
    <div>
      <div className="toolbar">
        {searchable && (
          <input className="field" type="search" placeholder="Cari…" value={q} aria-label="Cari"
            onChange={(e) => { setQ(e.target.value); setExpanded(false); }} />
        )}
        <span className="count">{n0(filtered.length)} baris</span>
      </div>
      {rows.length === 0 ? (
        <div className="empty">{empty}</div>
      ) : filtered.length === 0 ? (
        <div className="empty">Tidak ada hasil untuk pencarian ini.</div>
      ) : (
        <div className="table-scroll">
          <table>
            <thead>
              <tr>{cols.map((c) => <th key={c.label} className={c.num ? 'r' : ''}>{c.label}</th>)}</tr>
            </thead>
            <tbody>
              {shown.map((row, i) => (
                <tr key={i}>
                  {cols.map((c) => <td key={c.label} className={c.num ? 'r' : ''}>{c.render(row)}</td>)}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {filtered.length > pageSize && (
        <div className="table-foot">
          <button className="btn" onClick={() => setExpanded(!expanded)}>
            {expanded ? `Tampilkan ${pageSize} saja` : `Tampilkan semua (${n0(filtered.length)})`}
          </button>
        </div>
      )}
    </div>
  );
}

/* ---------- ekspor CSV ---------- */
function exportCsv(rows: Row[]) {
  const head = ['Nama', 'Followers', 'Konten', 'Views', 'GMV', 'Orders', 'Views per konten', 'Views per follower', 'Porsi views'];
  const lines = rows.map((r) => [
    r.name, r.followers ?? '', r.konten ?? '', r.views ?? '', r.gmv ?? '', r.orders ?? '',
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

/* ---------- halaman ---------- */
function Head({ kicker, title, sub }: { kicker: string; title: string; sub: string }) {
  return (
    <div className="top">
      <div>
        <div className="kicker">{kicker}</div>
        <h1>{title}</h1>
        <p className="sub">{sub}</p>
      </div>
    </div>
  );
}

function RingkasanView({ live, m, onPick }: { live: Live; m: Model; onPick: (id: string) => void }) {
  const total = live.kols.data.length;
  const active = live.kols.data.filter((k) => k.status === 'active').length;
  const prospect = live.kols.data.filter((k) => k.status === 'prospect').length;
  const noSales = m.gmv === 0 && m.orders === 0;
  const maxF = m.followersTop[0]?.followers ?? 1;
  const fv = m.rows
    .filter((r) => r.followers != null && r.views != null)
    .sort((a, b) => (a.followers ?? 0) - (b.followers ?? 0));

  return (
    <>
      <Head kicker="Executive summary" title="Ringkasan" sub={`${n0(total)} KOL terdaftar, ${n0(active)} aktif. Data langsung dari Supabase wacommerce-kol.`} />

      <div className="insights">
        <div className="insight">
          <div className="big">{pc(m.top?.share)}</div>
          <div className="txt">{m.top ? <><b>{m.top.name}</b> menyumbang porsi views terbesar dari total {n0(m.totalViews)}.</> : 'Belum ada data views.'}</div>
        </div>
        <div className="insight">
          <div className="big">{total ? Math.round((prospect / total) * 100) : 0}%</div>
          <div className="txt">{n0(prospect)} dari {n0(total)} KOL masih berstatus prospect. Ini peluang untuk aktivasi.</div>
        </div>
        <div className="insight">
          <div className="big">{m.topEff ? `${n1(m.topEff.vpf)}×` : '—'}</div>
          <div className="txt">{m.topEff ? <><b>{m.topEff.name}</b> mencatat views per follower tertinggi di antara akun yang datanya lengkap.</> : 'Belum ada data views per follower.'}</div>
        </div>
        <div className={`insight ${noSales ? 'warnbox' : ''}`}>
          <div className="big">{noSales ? 'Belum ada' : fmtRp(m.gmv)}</div>
          <div className="txt">{noSales ? 'Data GMV dan orders. Angka penjualan akan muncul setelah atribusi tersambung.' : `GMV tercatat dari ${n0(m.rows.filter((r) => r.gmv != null).length)} KOL.`}</div>
        </div>
      </div>

      <div className="kpis">
        <Kpi tone="plum" label="Total KOL" value={n0(total)} sub={`${n0(active)} aktif · ${n0(prospect)} prospect`} />
        <Kpi tone="hero" label="Total views" value={n0(m.totalViews)} sub={`dari ${n0(m.rows.filter((r) => r.views != null).length)} KOL dengan konten`} />
        <Kpi tone="grey" label="KOL aktif" value={n0(active)} sub={total ? `${Math.round((active / total) * 100)}% dari seluruh KOL` : '—'} />
        {noSales
          ? <Kpi label="GMV tercatat" value="—" sub="Menunggu data penjualan" pending />
          : <Kpi label="GMV tercatat" value={fmtRp(m.gmv)} sub={`${n0(m.orders)} orders`} />}
      </div>

      <div className="grid">
        <Panel title="Followers per KOL" sub="10 teratas · klik untuk detail">
          {m.followersTop.length === 0
            ? <div className="empty">Belum ada data followers.</div>
            : m.followersTop.map((r) => (
              <BarRow key={r.id} name={r.name} value={r.followers ?? 0} max={maxF} onClick={() => onPick(r.id)} />
            ))}
        </Panel>
        <Panel title="Status KOL" sub="Aktif dibanding prospect">
          <div className="donut-wrap">
            <Donut active={active} total={total} />
            <div className="legend">
              <span><i className="dot" style={{ background: '#7A2E4A' }} />Aktif {n0(active)}</span>
              <span><i className="dot" style={{ background: '#C9CDD8' }} />Prospect {n0(prospect)}</span>
            </div>
          </div>
        </Panel>
      </div>

      <div className="grid eq">
        <Panel title="Followers vs views" sub="Per KOL, diurutkan dari followers terkecil · skala log">
          <LineMulti
            labels={fv.map((r) => (r.name.length > 14 ? `${r.name.slice(0, 13)}…` : r.name))}
            series={[
              { name: 'Followers', color: '#7A2E4A', values: fv.map((r) => r.followers as number) },
              { name: 'Views', color: '#C9953B', values: fv.map((r) => r.views as number) },
            ]}
            log
          />
        </Panel>
        <Panel title="Catatan data" sub="Hal yang perlu dilengkapi">
          <div className="note-list">
            {noSales && <div>Angka GMV dan orders belum tersedia, sehingga ditandai sebagai belum tersambung.</div>}
            <div>Referral affiliate aktif: {live.referralActive.error ? 'belum tersedia' : n0(live.referralActive.value)}.</div>
            <div>Attribution order: {live.attributions.error ? 'belum tersedia' : n0(live.attributions.value)}.</div>
            <div>Tren harian belum tersedia. Grafik tren akan muncul setelah data harian tersambung.</div>
          </div>
        </Panel>
      </div>
    </>
  );
}

function KolListView({ live }: { live: Live }) {
  const pii = useContext(PiiCtx);
  const total = live.kols.data.length;
  const active = live.kols.data.filter((k) => k.status === 'active').length;
  const prospect = live.kols.data.filter((k) => k.status === 'prospect').length;
  return (
    <>
      <Head kicker="KOL" title="Daftar KOL" sub="Semua KOL aktif beserta statusnya." />
      <div className="kpis">
        <Kpi label="Total KOL" value={n0(total)} />
        <Kpi label="KOL aktif" value={n0(active)} />
        <Kpi label="KOL prospect" value={n0(prospect)} />
        <Kpi label="Sumber" value={n0(new Set(live.kols.data.map((k) => k.source)).size)} sub="jumlah sumber berbeda" />
      </div>
      <Panel title="Daftar KOL" sub={`${n0(total)} KOL`}>
        <DataTable<Kol>
          rows={live.kols.data}
          empty={live.kols.error ?? 'Belum ada KOL.'}
          cols={[
            { label: 'Nama', render: (k) => k.full_name },
            { label: 'Nama panggung', render: (k) => k.stage_name ?? '—' },
            { label: 'Tier', render: (k) => k.tier ?? '—' },
            { label: 'Kategori', render: (k) => k.category ?? '—' },
            { label: 'Status', render: (k) => <Badge value={k.status} /> },
            { label: 'Domisili', render: (k) => k.domicile ?? '—' },
            { label: 'WhatsApp', render: (k) => pii(k.whatsapp) },
            { label: 'Email', render: (k) => pii(k.email) },
            { label: 'Sumber', render: (k) => k.source ?? '—' },
          ]}
        />
      </Panel>
    </>
  );
}

function KontenView({ m, onPick }: { m: Model; onPick: (id: string) => void }) {
  const [sort, setSort] = useState<{ k: keyof Row; d: 1 | -1 }>({ k: 'views', d: -1 });
  const [q, setQ] = useState('');

  const rows = useMemo(() => {
    const s = q.trim().toLowerCase();
    return m.rows.filter((r) => r.name.toLowerCase().includes(s)).sort((a, b) => {
      if (sort.k === 'name') return a.name.localeCompare(b.name) * sort.d;
      const x = a[sort.k];
      const y = b[sort.k];
      if (x == null && y == null) return 0;
      if (x == null) return 1;
      if (y == null) return -1;
      return ((x as number) - (y as number)) * sort.d;
    });
  }, [m.rows, q, sort]);

  const cols: [keyof Row, string][] = [
    ['name', 'Nama'], ['followers', 'Followers'], ['konten', 'Konten'], ['views', 'Views'],
    ['gmv', 'GMV'], ['orders', 'Orders'], ['vpk', 'Views per konten'], ['vpf', 'Views per follower'], ['share', 'Porsi views'],
  ];
  const toggleSort = (k: keyof Row) =>
    setSort((s) => (s.k === k ? { k, d: (s.d * -1) as 1 | -1 } : { k, d: k === 'name' ? 1 : -1 }));
  const dash = <span className="muted">—</span>;

  return (
    <>
      <Head kicker="KOL" title="Konten" sub="Urutkan kolom, cari nama, atau klik nama untuk melihat detail." />
      <Panel title="Performa konten per KOL" sub={`${n0(m.rows.length)} KOL`}>
        <div className="toolbar">
          <input className="field" type="search" placeholder="Cari nama KOL…" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Cari KOL" />
          <span className="count">{n0(rows.length)} KOL</span>
          <button className="btn" onClick={() => exportCsv(rows)}>Ekspor CSV</button>
        </div>
        <div className="table-scroll">
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
              {rows.length === 0 && <tr><td colSpan={9} className="muted">Tidak ada hasil.</td></tr>}
              {rows.map((r) => (
                <tr key={r.id}>
                  <td><button className="name-btn" onClick={() => onPick(r.id)}>{r.name}</button></td>
                  <td className="r">{r.followers == null ? dash : n0(r.followers)}</td>
                  <td className="r">{r.konten == null ? dash : n0(r.konten)}</td>
                  <td className="r">{r.views == null ? dash : n0(r.views)}</td>
                  <td className="r">{r.gmv == null ? dash : fmtRp(r.gmv)}</td>
                  <td className="r">{r.orders == null ? dash : n0(r.orders)}</td>
                  <td className="r">{r.vpk == null ? dash : n0(Math.round(r.vpk))}</td>
                  <td className="r">{r.vpf == null ? dash : `${n1(r.vpf)}×`}</td>
                  <td className="r">{r.share == null ? dash : pc(r.share)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="foot">Views per follower = total views dibagi followers. Angka kosong (—) berarti data belum tersedia.</p>
      </Panel>
    </>
  );
}

function SosialView({ live, m, onPick }: { live: Live; m: Model; onPick: (id: string) => void }) {
  const maxF = m.followersTop[0]?.followers ?? 1;
  return (
    <>
      <Head kicker="KOL" title="Akun sosial" sub="Followers dan engagement per akun. Klik nama untuk detail." />
      <Panel title="Followers per KOL" sub="10 teratas">
        {m.followersTop.length === 0
          ? <div className="empty">Belum ada data followers.</div>
          : m.followersTop.map((r) => (
            <BarRow key={r.id} name={r.name} value={r.followers ?? 0} max={maxF} onClick={() => onPick(r.id)} />
          ))}
      </Panel>
      <div style={{ height: 20 }} />
      <Panel title="Akun sosial" sub={`${n0(live.social.data.length)} akun`}>
        <DataTable<Social>
          rows={live.social.data}
          empty={live.social.error ?? 'Belum ada akun sosial.'}
          cols={[
            { label: 'KOL', render: (s) => m.nameOf(s.kol_id) },
            { label: 'Platform', render: (s) => <span className={`pill ${s.platform.toLowerCase().includes('shopee') ? 'tone-warn' : 'tone-plum'}`}>{s.platform}</span> },
            { label: 'Username', render: (s) => s.username ?? '—' },
            { label: 'Followers', render: (s) => n0(s.followers), num: true },
            { label: 'Engagement', render: (s) => (s.engagement_rate == null ? '—' : `${Number(s.engagement_rate).toFixed(2)}%`), num: true },
            { label: 'Rata-rata views', render: (s) => n0(s.avg_views), num: true },
          ]}
        />
      </Panel>
    </>
  );
}

function CampaignView({ live }: { live: Live }) {
  const rows = live.campaigns.data;
  const budget = rows.reduce((s, c) => s + Number(c.budget ?? 0), 0);
  const target = rows.reduce((s, c) => s + Number(c.target_revenue ?? 0), 0);
  return (
    <>
      <Head kicker="Kampanye" title="Kampanye" sub="Target, budget, dan periode kampanye." />
      <div className="kpis">
        <Kpi label="Kampanye" value={n0(rows.length)} sub={`${n0(rows.filter((c) => c.status === 'ongoing').length)} berjalan`} />
        <Kpi label="Total budget" value={fmtRp(budget)} />
        <Kpi label="Total target omzet" value={fmtRp(target)} />
        <Kpi label="Realisasi" value="—" sub="Menunggu data penjualan" pending />
      </div>
      <Panel title="Daftar kampanye" sub={`${n0(rows.length)} kampanye`}>
        <DataTable<Campaign>
          rows={rows}
          empty={live.campaigns.error ?? 'Belum ada kampanye.'}
          cols={[
            { label: 'Kampanye', render: (c) => c.name },
            { label: 'Produk', render: (c) => c.product ?? '—' },
            { label: 'Status', render: (c) => <Badge value={c.status} /> },
            { label: 'Mulai', render: (c) => fmtDate(c.start_date) },
            { label: 'Selesai', render: (c) => fmtDate(c.end_date) },
            { label: 'Target omzet', render: (c) => fmtRp(c.target_revenue), num: true },
            { label: 'Target orders', render: (c) => n0(c.target_orders), num: true },
            { label: 'Budget', render: (c) => fmtRp(c.budget), num: true },
            { label: 'Komisi', render: (c) => (c.commission_rate == null ? '—' : `${c.commission_rate}%`), num: true },
          ]}
        />
      </Panel>
    </>
  );
}

function SeedingView({ live, m }: { live: Live; m: Model }) {
  const pii = useContext(PiiCtx);
  return (
    <>
      <Head kicker="Kampanye" title="Seeding produk" sub="Produk yang dikirim ke KOL, termasuk data penerima." />
      <div className="kpis">
        <Kpi label="Pengiriman" value={n0(live.seedings.data.length)} />
        <Kpi label="Nilai seeding" value={fmtRp(live.seedings.data.reduce((s, x) => s + Number(x.total_value ?? 0), 0))} />
        <Kpi label="Menunggu konten" value={n0(live.seedings.data.filter((x) => x.status !== 'completed').length)} />
        <Kpi label="Konten selesai" value={n0(live.seedings.data.filter((x) => x.status === 'completed').length)} />
      </div>
      <Panel title="Daftar seeding" sub={`${n0(live.seedings.data.length)} pengiriman`}>
        <DataTable<Seeding>
          rows={live.seedings.data}
          empty={live.seedings.error ?? 'Belum ada seeding.'}
          cols={[
            { label: 'KOL', render: (s) => m.nameOf(s.kol_id) },
            { label: 'Produk', render: (s) => s.product_name ?? '—' },
            { label: 'Qty', render: (s) => n0(s.quantity), num: true },
            { label: 'Nilai', render: (s) => fmtRp(s.total_value), num: true },
            { label: 'Status', render: (s) => <Badge value={s.status} /> },
            { label: 'Deadline konten', render: (s) => fmtDate(s.content_deadline) },
            { label: 'Order ref', render: (s) => s.order_ref ?? '—' },
            { label: 'Penerima', render: (s) => pii(s.shipping_recipient_name) },
            { label: 'Telepon', render: (s) => pii(s.shipping_phone) },
            { label: 'Alamat', render: (s) => pii([s.shipping_address, s.shipping_city, s.shipping_province, s.shipping_postal_code].filter(Boolean).join(', ') || null) },
          ]}
        />
      </Panel>
    </>
  );
}

function ProductView({ live }: { live: Live }) {
  const rows = live.products.data;
  const lowStock = rows.filter((p) => (p.stock ?? 0) > 0 && (p.stock ?? 0) < 10).length;
  return (
    <>
      <Head kicker="Kampanye" title="Produk" sub="Katalog produk, harga, dan stok." />
      <div className="kpis">
        <Kpi label="Jumlah produk" value={n0(rows.length)} />
        <Kpi label="Produk promo" value={n0(rows.filter((p) => p.promo_value != null && p.promo_value < (p.normal_value ?? Infinity)).length)} />
        <Kpi label="Stok rendah" value={n0(lowStock)} sub="kurang dari 10 unit" />
        <Kpi label="Total stok" value={n0(rows.reduce((s, p) => s + Number(p.stock ?? 0), 0))} />
      </div>
      <Panel title="Daftar produk" sub={`${n0(rows.length)} produk`}>
        <DataTable<Product>
          rows={rows}
          empty={live.products.error ?? 'Belum ada produk.'}
          cols={[
            { label: 'Nama', render: (p) => p.name },
            { label: 'SKU', render: (p) => p.sku ?? '—' },
            { label: 'Kategori', render: (p) => p.category ?? '—' },
            { label: 'Harga normal', render: (p) => fmtRp(p.normal_value), num: true },
            { label: 'Harga promo', render: (p) => fmtRp(p.promo_value), num: true },
            { label: 'Stok', render: (p) => n0(p.stock), num: true },
            { label: 'Status', render: (p) => p.status ?? '—' },
          ]}
        />
      </Panel>
    </>
  );
}

function PaymentView({ live, m }: { live: Live; m: Model }) {
  const totals = [...live.payments.data.reduce((acc, p) => acc.set(p.status, (acc.get(p.status) ?? 0) + Number(p.amount ?? 0)), new Map<string, number>())];
  return (
    <>
      <Head kicker="Keuangan" title="Pembayaran ke KOL" sub="Pembayaran dan statusnya." />
      <div className="kpis">
        {totals.length === 0
          ? <Kpi label="Total pembayaran" value="Rp 0" />
          : totals.map(([status, total]) => <Kpi key={status} tone="plum" label={`Total ${status}`} value={fmtRp(total)} />)}
        <Kpi label="Transaksi" value={n0(live.payments.data.length)} />
      </div>
      <Panel title="Daftar pembayaran" sub={`${n0(live.payments.data.length)} transaksi`}>
        <DataTable<Payment>
          rows={live.payments.data}
          empty={live.payments.error ?? 'Belum ada pembayaran.'}
          cols={[
            { label: 'KOL', render: (p) => m.nameOf(p.kol_id) },
            { label: 'Jenis', render: (p) => p.payment_type },
            { label: 'Nominal', render: (p) => fmtRp(p.amount), num: true },
            { label: 'Status', render: (p) => <Badge value={p.status} /> },
            { label: 'Tanggal bayar', render: (p) => fmtDate(p.paid_at) },
            { label: 'Diajukan', render: (p) => fmtDate(p.requested_at) },
          ]}
        />
      </Panel>
    </>
  );
}

function PipelineView({ live, m }: { live: Live; m: Model }) {
  const open = live.actions.data.filter((a) => !a.resolved_at);
  return (
    <>
      <Head kicker="Operasional" title="Pipeline KOL" sub="Status KOL, aksi yang masih berjalan, dan riwayat perubahan." />
      <div className="kpis">
        {[...m.statusCount.entries()].map(([status, n]) => <Kpi key={status} label={`KOL ${status}`} value={n0(n)} />)}
        <Kpi tone="plum" label="Aksi berjalan" value={n0(open.length)} />
      </div>
      <Panel title="Aksi yang masih berjalan" sub={`${n0(open.length)} aksi`}>
        <DataTable<Action>
          rows={open}
          empty={live.actions.error ?? 'Tidak ada aksi aktif.'}
          cols={[
            { label: 'KOL', render: (a) => m.nameOf(a.kol_id) },
            { label: 'Judul', render: (a) => a.title },
            { label: 'Aksi', render: (a) => a.action ?? '—' },
            { label: 'PIC', render: (a) => a.pic ?? '—' },
            { label: 'Deadline', render: (a) => fmtDate(a.deadline) },
            { label: 'Status', render: (a) => <Badge value={a.status} /> },
          ]}
        />
      </Panel>
      <div style={{ height: 20 }} />
      <Panel title="Riwayat perubahan status" sub="30 terakhir">
        <DataTable<StatusEvent>
          rows={live.statusEvents.data}
          empty={live.statusEvents.error ?? 'Belum ada riwayat.'}
          cols={[
            { label: 'KOL', render: (e) => m.nameOf(e.kol_id) },
            { label: 'Dari', render: (e) => e.from_status ?? '—' },
            { label: 'Ke', render: (e) => <Badge value={e.to_status} /> },
            { label: 'Waktu', render: (e) => fmtDateTime(e.at) },
            { label: 'PIC', render: (e) => e.pic ?? '—' },
          ]}
        />
      </Panel>
    </>
  );
}

function DocsView({ live, m }: { live: Live; m: Model }) {
  return (
    <>
      <Head kicker="Operasional" title="Dokumen & kesepakatan" sub="Kontrak dan tarif KOL. Path file tidak ditampilkan." />
      <div className="kpis">
        <Kpi label="Dokumen" value={n0(live.docs.data.length)} />
        <Kpi label="Berlaku s/d 30 hari" value={n0(live.docs.data.filter((d) => d.expires_at && new Date(d.expires_at).getTime() - Date.now() < 30 * 864e5 && new Date(d.expires_at).getTime() > Date.now()).length)} />
        <Kpi label="Sudah kedaluwarsa" value={n0(live.docs.data.filter((d) => d.expires_at && new Date(d.expires_at).getTime() < Date.now()).length)} />
        <Kpi label="KOL dengan dokumen" value={n0(new Set(live.docs.data.map((d) => d.kol_id)).size)} />
      </div>
      <Panel title="Daftar dokumen" sub={`${n0(live.docs.data.length)} dokumen`}>
        <DataTable<Doc>
          rows={live.docs.data}
          empty={live.docs.error ?? 'Belum ada dokumen.'}
          cols={[
            { label: 'KOL', render: (d) => m.nameOf(d.kol_id) },
            { label: 'Jenis', render: (d) => d.doc_type },
            { label: 'Judul', render: (d) => d.title ?? '—' },
            { label: 'Platform', render: (d) => d.platform ?? '—' },
            { label: 'Deliverable', render: (d) => d.deliverable ?? '—' },
            { label: 'Tarif', render: (d) => (d.rate_amount == null ? '—' : `${d.currency ?? ''} ${n0(d.rate_amount)}`), num: true },
            { label: 'Berlaku s/d', render: (d) => fmtDate(d.expires_at) },
          ]}
        />
      </Panel>
    </>
  );
}

function ChatView({ live }: { live: Live }) {
  const pii = useContext(PiiCtx);
  const convs = live.chats.data;
  const [q, setQ] = useState('');
  const [sel, setSel] = useState<string | null>(null);
  const [thread, setThread] = useState<Msg[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const label = (c: Chat) => c.contact_name || c.display_name || c.phone_number || '—';
  const list = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return convs;
    return convs.filter((c) => label(c).toLowerCase().includes(s) || (c.last_message ?? '').toLowerCase().includes(s));
  }, [convs, q]);

  const selected = sel ?? list[0]?.id ?? null;
  const current = convs.find((c) => c.id === selected) ?? null;

  useEffect(() => {
    if (!selected) return;
    let alive = true;
    setLoading(true);
    setErr(null);
    supabase
      .from('wa_messages')
      .select('conversation_id,direction,body,media_type,sent_at,delivery_status')
      .eq('conversation_id', selected)
      .order('sent_at', { ascending: false })
      .limit(100)
      .then(({ data, error }) => {
        if (!alive) return;
        if (error) setErr(error.message);
        setThread(((data ?? []) as Msg[]).slice().reverse());
        setLoading(false);
      });
    return () => { alive = false; };
  }, [selected]);

  const unread = convs.reduce((s, c) => s + Number(c.unread_count ?? 0), 0);
  const last = convs.map((c) => c.last_message_at).filter(Boolean).sort().pop() ?? null;

  return (
    <>
      <Head kicker="Operasional" title="Chat WhatsApp" sub="Percakapan dengan KOL. Hanya membaca, belum bisa membalas dari dashboard." />
      <div className="kpis">
        <Kpi label="Percakapan" value={n0(convs.length)} />
        <Kpi label="Pesan total" value={n0(live.messages.value)} sub={live.messages.error ? 'Data belum tersedia' : undefined} />
        <Kpi label="Belum dibaca" value={n0(unread)} />
        <Kpi label="Aktivitas terakhir" value={fmtDateTime(last)} />
      </div>
      {live.chats.error && <div className="err">Gagal memuat percakapan: {live.chats.error}</div>}
      <div className="chat">
        <section className="panel">
          <div className="ph"><div><h2>Percakapan</h2><p>{n0(convs.length)} percakapan</p></div></div>
          <input className="field" type="search" placeholder="Cari kontak…" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Cari kontak" style={{ minWidth: 0, width: '100%', marginBottom: 10 }} />
          <div className="conv-list">
            {list.map((c) => (
              <button key={c.id} className="conv" aria-current={c.id === selected ? 'true' : undefined} onClick={() => setSel(c.id)}>
                <div className="conv-top">
                  <span className="conv-name">{pii(label(c))}</span>
                  {(c.unread_count ?? 0) > 0 && <span className="unread">{c.unread_count}</span>}
                </div>
                <div className="conv-last">{pii(c.last_message)}</div>
                <div className="conv-time">{fmtDateTime(c.last_message_at)}</div>
              </button>
            ))}
            {list.length === 0 && <div className="empty">Tidak ada percakapan.</div>}
          </div>
        </section>

        <section className="panel">
          <div className="ph"><div><h2>{current ? pii(label(current)) : 'Pilih percakapan'}</h2>{current && <p>{pii(current.phone_number)}</p>}</div></div>
          <div className="thread">
            {err && <div className="err">Gagal memuat pesan: {err}</div>}
            {loading && <div className="muted">Memuat pesan…</div>}
            {!loading && !err && thread.length === 0 && <div className="empty">Belum ada pesan.</div>}
            {!loading && thread.map((m, i) => (
              <div key={i} className={`bub-row ${m.direction === 'out' ? 'out' : ''}`}>
                <div className="bub">
                  {pii(m.body ?? (m.media_type && m.media_type !== 'text' ? `[${m.media_type}]` : '—'))}
                  <small>{fmtDateTime(m.sent_at)}{m.direction === 'out' && m.delivery_status ? ` · ${m.delivery_status}` : ''}</small>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </>
  );
}

function SystemView({ live, m }: { live: Live; m: Model }) {
  return (
    <>
      <Head kicker="Sistem" title="Sistem & target" sub="Target yang sudah diatur dan alert operasional." />
      <div className="kpis">
        <Kpi label="Target terdaftar" value={n0(live.targets.value)} sub={live.targets.error ? 'Data belum tersedia' : undefined} />
        <Kpi label="Alert" value={live.alerts.error ? '—' : n0(live.alerts.data.length)} sub={live.alerts.error ? 'Tidak ada akses' : undefined} />
        <Kpi label="Alert belum selesai" value={live.alerts.error ? '—' : n0(live.alerts.data.filter((a) => a.alert_status !== 'resolved').length)} />
        <Kpi label="Alert kritis" value={live.alerts.error ? '—' : n0(live.alerts.data.filter((a) => a.severity === 'critical' || a.severity === 'high').length)} />
      </div>
      <Panel title="Ringkasan alert" sub="Dikelompokkan per tingkat dan status">
        <DataTable<[string, number]>
          rows={[...new Map(live.alerts.data.map((a) => [`${a.severity ?? '-'} · ${a.alert_status ?? '-'}`, 0] as [string, number])).keys()].map((k) => [k, live.alerts.data.filter((a) => `${a.severity ?? '-'} · ${a.alert_status ?? '-'}` === k).length] as [string, number])}
          empty={live.alerts.error ?? 'Tidak ada alert.'}
          searchable={false}
          cols={[
            { label: 'Tingkat · status', render: (r) => r[0] },
            { label: 'Jumlah', render: (r) => n0(r[1]), num: true },
          ]}
        />
      </Panel>
      <div style={{ height: 20 }} />
      <Panel title="Ringkasan KOL" sub={`${n0(m.rows.length)} KOL dengan data`}>
        <div className="note-list">
          <div>Target terdaftar: {live.targets.error ? 'belum tersedia' : n0(live.targets.value)}.</div>
          <div>Referral affiliate aktif: {live.referralActive.error ? 'belum tersedia' : n0(live.referralActive.value)}.</div>
        </div>
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
          <div className="metric" style={{ border: 0 }}><span>GMV &amp; orders</span><b>{row.gmv == null ? <span className="muted">Belum tersedia</span> : `${fmtRp(row.gmv)} · ${n0(row.orders)}`}</b></div>
        </div>
      )}
    </aside>
  );
}

/* ---------- komponen utama ---------- */
export default function KolDashboard({ email }: { email: string }) {
  const [live, setLive] = useState<Live | null>(null);
  const [loadErr, setLoadErr] = useState<string | null>(null);
  const [view, setView] = useState<ViewKey>('ringkasan');
  const [picked, setPicked] = useState<string | null>(null);
  const [showPersonal, setShowPersonal] = useState(true);

  useEffect(() => {
    loadLive().then(setLive).catch((e: unknown) => setLoadErr(e instanceof Error ? e.message : 'Gagal memuat data'));
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setPicked(null); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  useEffect(() => { window.scrollTo({ top: 0 }); }, [view]);

  const model = useMemo(() => (live ? derive(live) : null), [live]);
  const pii = useMemo(() => (v: string | null | undefined) => (showPersonal ? (v || '—') : (v ? '••••' : '—')), [showPersonal]);
  const pickedRow = picked && model ? model.rows.find((r) => r.id === picked) ?? null : null;

  let content: ReactNode;
  if (loadErr) content = <div className="err">Gagal memuat data: {loadErr}</div>;
  else if (!live || !model) content = <div className="loading">Memuat data…</div>;
  else {
    const onPick = (id: string) => setPicked(id);
    switch (view) {
      case 'ringkasan': content = <RingkasanView live={live} m={model} onPick={onPick} />; break;
      case 'kol': content = <KolListView live={live} />; break;
      case 'konten': content = <KontenView m={model} onPick={onPick} />; break;
      case 'sosial': content = <SosialView live={live} m={model} onPick={onPick} />; break;
      case 'kampanye': content = <CampaignView live={live} />; break;
      case 'seeding': content = <SeedingView live={live} m={model} />; break;
      case 'produk': content = <ProductView live={live} />; break;
      case 'pembayaran': content = <PaymentView live={live} m={model} />; break;
      case 'pipeline': content = <PipelineView live={live} m={model} />; break;
      case 'dokumen': content = <DocsView live={live} m={model} />; break;
      case 'chat': content = <ChatView live={live} />; break;
      case 'sistem': content = <SystemView live={live} m={model} />; break;
    }
  }

  return (
    <PiiCtx.Provider value={pii}>
      <div className="app">
        <main>
          <div id="view">{content}</div>
        </main>

        <aside className="side">
          <div className="brand">
            <img className="logo" src="/logo-scentplus.png" alt="Scentplus" />
            <div>
              <b>Scentplus</b>
              <span>KOL &amp; Affiliate Live</span>
            </div>
          </div>

          {NAV.map((g) => (
            <div key={g.group}>
              <div className="nav-label">{g.group}</div>
              <nav className="nav">
                {g.items.map((it) => (
                  <button key={it.key} aria-current={view === it.key ? 'page' : undefined} onClick={() => setView(it.key)}>
                    <span className="ico"><Icon k={it.key} /></span>
                    {it.label}
                  </button>
                ))}
              </nav>
            </div>
          ))}

          <div className="side-foot">
            <div className="side-email">{email}</div>
            <button className="side-btn" onClick={() => setShowPersonal(!showPersonal)}>
              {showPersonal ? 'Sembunyikan data pribadi' : 'Tampilkan data pribadi'}
            </button>
            <button className="side-btn" onClick={() => supabase.auth.signOut()}>Keluar</button>
          </div>
        </aside>

        <Drawer row={pickedRow} onClose={() => setPicked(null)} />
      </div>
    </PiiCtx.Provider>
  );
}
