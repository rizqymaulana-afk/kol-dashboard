import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { supabase } from './lib/supabase';

/* ---------- tipe data ---------- */
type Kol = { id: string; full_name: string; stage_name: string | null; tier: string | null; category: string | null; status: string; domicile: string | null; source: string | null; whatsapp: string | null; email: string | null };
type Content = { kol_id: string; platform: string | null; views: number | null; gmv: number | null; orders: number | null; status: string | null };
type Campaign = { id: string; name: string; product: string | null; status: string; start_date: string | null; end_date: string | null; target_revenue: number | null; target_orders: number | null; budget: number | null; commission_rate: number | null };
type Social = { kol_id: string; platform: string; username: string | null; followers: number | null; engagement_rate: number | null; avg_views: number | null };
type Payment = { kol_id: string; payment_type: string; amount: number | null; paid_at: string | null; status: string; requested_at: string | null };
type Seeding = { kol_id: string; campaign_id: string | null; product_name: string | null; quantity: number | null; total_value: number | null; status: string; content_deadline: string | null; order_ref: string | null; shipping_recipient_name: string | null; shipping_phone: string | null; shipping_address: string | null; shipping_city: string | null; shipping_province: string | null; shipping_postal_code: string | null };
type Product = { id: string; name: string; sku: string | null; category: string | null; normal_value: number | null; promo_value: number | null; stock: number | null; status: string | null };
type StatusEvent = { kol_id: string; from_status: string | null; to_status: string; at: string; pic: string | null; transition_type: string | null };
type Action = { kol_id: string | null; title: string; action: string | null; pic: string | null; deadline: string | null; status: string; resolved_at: string | null };
type Alert = { severity: string | null; alert_status: string | null };
type Doc = { kol_id: string; doc_type: string; title: string | null; platform: string | null; deliverable: string | null; rate_amount: number | null; currency: string | null; expires_at: string | null };
type Chat = { id: string; display_name: string | null; contact_name: string | null; phone_number: string | null; unread_count: number | null; last_message: string | null; last_message_at: string | null };
type Msg = { conversation_id: string; direction: string; body: string | null; media_type: string | null; sent_at: string; delivery_status?: string | null };

type Res<T> = { data: T[]; error: string | null };
type Cnt = { value: number | null; error: string | null };

/* ---------- helper ---------- */
const fmt = (n: number | null | undefined) => (n == null ? '—' : Number(n).toLocaleString('id-ID'));
const fmtRp = (n: number | null | undefined) => (n == null ? '—' : 'Rp ' + Number(n).toLocaleString('id-ID'));
const fmtDate = (s: string | null | undefined) => (s ? new Date(s).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }) : '—');
const fmtDateTime = (s: string | null | undefined) => (s ? new Date(s).toLocaleString('id-ID', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—');
const fmtPct = (n: number | null | undefined) => (n == null ? '—' : `${Number(n).toFixed(2)}%`);

async function list<T>(p: PromiseLike<{ data: unknown[] | null; error: { message: string } | null }>): Promise<Res<T>> {
  const r = await p;
  return { data: (r.data ?? []) as T[], error: r.error ? r.error.message : null };
}
async function count(p: PromiseLike<{ count: number | null; error: { message: string } | null }>): Promise<Cnt> {
  const r = await p;
  return { value: r.count ?? null, error: r.error ? r.error.message : null };
}

type All = {
  kols: Res<Kol>; contents: Res<Content>; campaigns: Res<Campaign>; social: Res<Social>; payments: Res<Payment>;
  seedings: Res<Seeding>; products: Res<Product>; statusEvents: Res<StatusEvent>; actions: Res<Action>;
  alerts: Res<Alert>; docs: Res<Doc>; chats: Res<Chat>; recent: Res<Msg>;
  referralActive: Cnt; attributions: Cnt; targets: Cnt; messages: Cnt;
};

/* ---------- navigasi ---------- */
type ModuleKey = 'ringkasan' | 'kol' | 'konten' | 'sosial' | 'kampanye' | 'seeding' | 'produk' | 'pembayaran' | 'pipeline' | 'dokumen' | 'chat' | 'sistem';
type NavItem = { key: ModuleKey; label: string; code: string; title: string; sub: string };

const NAV: { group: string; items: NavItem[] }[] = [
  { group: 'Overview', items: [{ key: 'ringkasan', label: 'Ringkasan', code: 'RK', title: 'Ringkasan', sub: 'Gambaran umum KOL dan affiliate' }] },
  { group: 'KOL', items: [
    { key: 'kol', label: 'Daftar KOL', code: 'KL', title: 'Daftar KOL', sub: 'Semua KOL aktif beserta statusnya' },
    { key: 'konten', label: 'Konten', code: 'KT', title: 'Performa konten', sub: 'Views, GMV, dan orders per KOL' },
    { key: 'sosial', label: 'Akun sosial', code: 'SO', title: 'Akun sosial', sub: 'Followers dan engagement per akun' },
  ] },
  { group: 'Kampanye', items: [
    { key: 'kampanye', label: 'Kampanye', code: 'KP', title: 'Kampanye', sub: 'Target, budget, dan periode kampanye' },
    { key: 'seeding', label: 'Seeding', code: 'SD', title: 'Seeding produk', sub: 'Produk yang dikirim ke KOL' },
    { key: 'produk', label: 'Produk', code: 'PR', title: 'Produk', sub: 'Katalog produk dan harga' },
  ] },
  { group: 'Keuangan', items: [{ key: 'pembayaran', label: 'Pembayaran', code: 'PB', title: 'Pembayaran ke KOL', sub: 'Pembayaran dan statusnya' }] },
  { group: 'Operasional', items: [
    { key: 'pipeline', label: 'Pipeline', code: 'PL', title: 'Pipeline KOL', sub: 'Status, aksi aktif, dan riwayat' },
    { key: 'dokumen', label: 'Dokumen', code: 'DK', title: 'Dokumen & kesepakatan', sub: 'Kontrak dan tarif KOL' },
    { key: 'chat', label: 'Chat WhatsApp', code: 'WA', title: 'Chat WhatsApp', sub: '200 pesan terbaru' },
  ] },
  { group: 'Sistem', items: [{ key: 'sistem', label: 'Sistem & target', code: 'SY', title: 'Sistem & target', sub: 'Target dan alert operasional' }] },
];

/* ---------- komponen utama ---------- */
export default function Dashboard({ email }: { email: string }) {
  const [all, setAll] = useState<All | null>(null);
  const [active, setActive] = useState<ModuleKey>('ringkasan');
  const [showPersonal, setShowPersonal] = useState(true);

  useEffect(() => {
    (async () => {
      const [kols, contents, campaigns, social, payments, seedings, products, statusEvents, actions, alerts, docs, chats, referralActive, attributions, targets, messages, recent] = await Promise.all([
        list<Kol>(supabase.from('kols').select('id,full_name,stage_name,tier,category,status,domicile,source,whatsapp,email').is('archived_at', null).order('created_at', { ascending: false })),
        list<Content>(supabase.from('kol_contents').select('kol_id,platform,views,gmv,orders,status')),
        list<Campaign>(supabase.from('kol_campaigns').select('id,name,product,status,start_date,end_date,target_revenue,target_orders,budget,commission_rate').order('start_date', { ascending: true })),
        list<Social>(supabase.from('kol_social_accounts').select('kol_id,platform,username,followers,engagement_rate,avg_views')),
        list<Payment>(supabase.from('kol_payments').select('kol_id,payment_type,amount,paid_at,status,requested_at').order('created_at', { ascending: false })),
        list<Seeding>(supabase.from('kol_seedings').select('kol_id,campaign_id,product_name,quantity,total_value,status,content_deadline,order_ref,shipping_recipient_name,shipping_phone,shipping_address,shipping_city,shipping_province,shipping_postal_code').order('created_at', { ascending: false })),
        list<Product>(supabase.from('kol_products').select('id,name,sku,category,normal_value,promo_value,stock,status').order('name', { ascending: true })),
        list<StatusEvent>(supabase.from('kol_status_history').select('kol_id,from_status,to_status,at,pic,transition_type').order('at', { ascending: false }).limit(30)),
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
      setAll({ kols, contents, campaigns, social, payments, seedings, products, statusEvents, actions, alerts, docs, chats, referralActive, attributions, targets, messages, recent });
    })();
  }, []);

  const model = useMemo(() => {
    if (!all) return null;
    const names = new Map(all.kols.data.map((k) => [k.id, k.stage_name || k.full_name]));
    const nameOf = (id: string | null | undefined) => (id ? names.get(id) ?? '—' : '—');

    const perKol = new Map<string, { name: string; contents: number; views: number; gmv: number; orders: number }>();
    for (const c of all.contents.data) {
      const name = names.get(c.kol_id);
      if (!name) continue;
      const a = perKol.get(c.kol_id) ?? { name, contents: 0, views: 0, gmv: 0, orders: 0 };
      a.contents += 1; a.views += Number(c.views ?? 0); a.gmv += Number(c.gmv ?? 0); a.orders += Number(c.orders ?? 0);
      perKol.set(c.kol_id, a);
    }
    const perKolRows = [...perKol.values()].sort((a, b) => b.views - a.views);
    const views = perKolRows.reduce((a, r) => a + r.views, 0);
    const gmv = perKolRows.reduce((a, r) => a + r.gmv, 0);
    const orders = perKolRows.reduce((a, r) => a + r.orders, 0);

    const payTotals = new Map<string, number>();
    for (const p of all.payments.data) payTotals.set(p.status, (payTotals.get(p.status) ?? 0) + Number(p.amount ?? 0));

    const followersPerKol = new Map<string, { name: string; followers: number }>();
    for (const s of all.social.data) {
      const name = names.get(s.kol_id);
      if (!name) continue;
      const a = followersPerKol.get(s.kol_id) ?? { name, followers: 0 };
      a.followers += Number(s.followers ?? 0);
      followersPerKol.set(s.kol_id, a);
    }
    const followerRows = [...followersPerKol.values()].sort((a, b) => b.followers - a.followers).slice(0, 10);
    const maxFollowers = Math.max(1, ...followerRows.map((r) => r.followers));

    const statusCount = new Map<string, number>();
    for (const k of all.kols.data) statusCount.set(k.status, (statusCount.get(k.status) ?? 0) + 1);

    const alertCount = new Map<string, number>();
    for (const a of all.alerts.data) {
      const key = `${a.severity ?? '-'} · ${a.alert_status ?? '-'}`;
      alertCount.set(key, (alertCount.get(key) ?? 0) + 1);
    }

    const unread = all.chats.data.reduce((a, c) => a + Number(c.unread_count ?? 0), 0);
    const lastChat = all.chats.data.map((c) => c.last_message_at).filter(Boolean).sort().pop() ?? null;

    return { names, nameOf, perKolRows, views, gmv, orders, payTotals, followerRows, maxFollowers, statusCount, alertCount, unread, lastChat };
  }, [all]);

  if (!all || !model) return <div className="loading">Memuat data…</div>;

  const pii = (v: string | null | undefined) => (showPersonal ? (v || '—') : (v ? '••••' : '—'));
  const noSales = model.gmv === 0 && model.orders === 0;
  const kpiActive = all.kols.data.filter((k) => k.status === 'active').length;
  const kpiProspect = all.kols.data.filter((k) => k.status === 'prospect').length;
  const current = NAV.flatMap((g) => g.items).find((i) => i.key === active)!;

  return (
    <div className="sh-root">
      <aside className="sh-side">
        <div className="sh-brand">
          <span className="sh-logo">SP</span>
          <div>
            <p className="sh-brand-title">ScentPlus</p>
            <p className="sh-brand-sub">KOL &amp; Affiliate Live</p>
          </div>
        </div>
        {NAV.map((g) => (
          <div key={g.group} className="sh-group">
            <div className="sh-nav-label">{g.group}</div>
            <nav className="sh-nav">
              {g.items.map((it) => (
                <button
                  key={it.key}
                  className="sh-nav-btn"
                  title={it.sub}
                  aria-current={active === it.key ? 'page' : undefined}
                  onClick={() => setActive(it.key)}
                >
                  <span className="sh-nav-ico">{it.code}</span>
                  <span className="sh-nav-text">
                    <span className="sh-nav-title">{it.label}</span>
                  </span>
                </button>
              ))}
            </nav>
          </div>
        ))}
        <div className="sh-side-foot">
          <div className="sh-email">{email}</div>
          <button className="sh-logout" onClick={() => supabase.auth.signOut()}>Keluar</button>
        </div>
      </aside>

      <div className="sh-main">
        <header className="sh-header">
          <div className="sh-header-left">
            <div>
              <p className="sh-header-title">{current.title}</p>
              <p className="sh-header-sub">{current.sub}</p>
            </div>
          </div>
          <div className="sh-header-right">
            <button className="sh-btn sh-btn-outline" onClick={() => setShowPersonal(!showPersonal)}>
              {showPersonal ? 'Sembunyikan data pribadi' : 'Tampilkan data pribadi'}
            </button>
          </div>
        </header>

        <div className="sh-content">
          {active === 'ringkasan' && (
            <>
              {noSales && (
                <div className="note">
                  Data penjualan affiliate belum terhubung, sehingga GMV dan orders belum bisa dihitung.
                </div>
              )}
              <div className="dl-grid dl-g4">
                <Kpi label="Total KOL" value={fmt(all.kols.data.length)} />
                <Kpi label="KOL aktif" value={fmt(kpiActive)} />
                <Kpi label="KOL prospect" value={fmt(kpiProspect)} />
                <Kpi label="Referral aktif" value={fmt(all.referralActive.value)} hint={all.referralActive.error ? 'Data belum tersedia' : undefined} />
                <Kpi label="Attribution order" value={fmt(all.attributions.value)} hint={all.attributions.error ? 'Data belum tersedia' : undefined} />
                <Kpi label="Total views" value={fmt(model.views)} />
                <Kpi label="GMV tercatat" value={noSales ? '—' : fmtRp(model.gmv)} hint={noSales ? 'Belum terhubung' : undefined} />
                <Kpi label="Orders tercatat" value={noSales ? '—' : fmt(model.orders)} hint={noSales ? 'Belum terhubung' : undefined} />
              </div>
              <div className="dl-grid dl-g2">
                <Panel title="Followers per KOL" sub="10 teratas">
                  <Bars rows={model.followerRows} max={model.maxFollowers} empty="Belum ada data sosial." />
                </Panel>
                <Panel title="Konten teratas" sub="berdasarkan views" error={all.contents.error}>
                  <DataTable pageSize={8} rows={model.perKolRows.slice(0, 50)} empty="Belum ada konten." cols={[
                    ['KOL', (r) => r.name],
                    ['Konten', (r) => fmt(r.contents), true],
                    ['Views', (r) => fmt(r.views), true],
                    ['Orders', (r) => fmt(r.orders), true],
                  ]} />
                </Panel>
              </div>
            </>
          )}

          {active === 'kol' && (
            <Panel title="Daftar KOL" sub={`${all.kols.data.length} KOL`} error={all.kols.error}>
              <DataTable rows={all.kols.data} empty="Belum ada KOL." cols={[
                ['Nama', (k: Kol) => k.full_name],
                ['Nama panggung', (k: Kol) => k.stage_name ?? '—'],
                ['Tier', (k: Kol) => k.tier ?? '—'],
                ['Kategori', (k: Kol) => k.category ?? '—'],
                ['Status', (k: Kol) => <Badge value={k.status} />],
                ['Domisili', (k: Kol) => k.domicile ?? '—'],
                ['WhatsApp', (k: Kol) => pii(k.whatsapp)],
                ['Email', (k: Kol) => pii(k.email)],
                ['Sumber', (k: Kol) => k.source ?? '—'],
              ]} />
            </Panel>
          )}

          {active === 'konten' && (
            <Panel title="Performa konten per KOL" sub={`${model.perKolRows.length} KOL dengan konten`} error={all.contents.error}>
              <DataTable rows={model.perKolRows} empty="Belum ada konten." cols={[
                ['KOL', (r) => r.name],
                ['Konten', (r) => fmt(r.contents), true],
                ['Views', (r) => fmt(r.views), true],
                ['GMV', (r) => fmtRp(r.gmv), true],
                ['Orders', (r) => fmt(r.orders), true],
              ]} />
            </Panel>
          )}

          {active === 'sosial' && (
            <>
              <Panel title="Followers per KOL" sub="10 teratas" error={all.social.error}>
                <Bars rows={model.followerRows} max={model.maxFollowers} empty="Belum ada data sosial." />
              </Panel>
              <Panel title="Akun sosial" sub={`${all.social.data.length} akun`}>
                <DataTable rows={all.social.data} empty="Belum ada akun sosial." cols={[
                  ['KOL', (s: Social) => model.nameOf(s.kol_id)],
                  ['Platform', (s: Social) => <Platform value={s.platform} />],
                  ['Username', (s: Social) => s.username ?? '—'],
                  ['Followers', (s: Social) => fmt(s.followers), true],
                  ['Engagement', (s: Social) => fmtPct(s.engagement_rate), true],
                  ['Rata-rata views', (s: Social) => fmt(s.avg_views), true],
                ]} />
              </Panel>
            </>
          )}

          {active === 'kampanye' && (
            <Panel title="Kampanye" sub={`${all.campaigns.data.length} kampanye`} error={all.campaigns.error}>
              <DataTable rows={all.campaigns.data} empty="Belum ada kampanye." cols={[
                ['Kampanye', (c: Campaign) => c.name],
                ['Produk', (c: Campaign) => c.product ?? '—'],
                ['Status', (c: Campaign) => <Badge value={c.status} />],
                ['Mulai', (c: Campaign) => fmtDate(c.start_date)],
                ['Selesai', (c: Campaign) => fmtDate(c.end_date)],
                ['Target omzet', (c: Campaign) => fmtRp(c.target_revenue), true],
                ['Target orders', (c: Campaign) => fmt(c.target_orders), true],
                ['Budget', (c: Campaign) => fmtRp(c.budget), true],
                ['Komisi', (c: Campaign) => (c.commission_rate == null ? '—' : `${c.commission_rate}%`), true],
              ]} />
            </Panel>
          )}

          {active === 'seeding' && (
            <Panel title="Seeding produk" sub={`${all.seedings.data.length} pengiriman`} error={all.seedings.error}>
              <DataTable rows={all.seedings.data} empty="Belum ada seeding." cols={[
                ['KOL', (s: Seeding) => model.nameOf(s.kol_id)],
                ['Produk', (s: Seeding) => s.product_name ?? '—'],
                ['Qty', (s: Seeding) => fmt(s.quantity), true],
                ['Nilai', (s: Seeding) => fmtRp(s.total_value), true],
                ['Status', (s: Seeding) => <Badge value={s.status} />],
                ['Deadline konten', (s: Seeding) => fmtDate(s.content_deadline)],
                ['Order ref', (s: Seeding) => s.order_ref ?? '—'],
                ['Penerima', (s: Seeding) => pii(s.shipping_recipient_name)],
                ['Telepon', (s: Seeding) => pii(s.shipping_phone)],
                ['Alamat', (s: Seeding) => pii([s.shipping_address, s.shipping_city, s.shipping_province, s.shipping_postal_code].filter(Boolean).join(', ') || null)],
              ]} />
            </Panel>
          )}

          {active === 'produk' && (
            <Panel title="Produk" sub={`${all.products.data.length} produk`} error={all.products.error}>
              <DataTable rows={all.products.data} empty="Belum ada produk." cols={[
                ['Nama', (p: Product) => p.name],
                ['SKU', (p: Product) => p.sku ?? '—'],
                ['Kategori', (p: Product) => p.category ?? '—'],
                ['Harga normal', (p: Product) => fmtRp(p.normal_value), true],
                ['Harga promo', (p: Product) => fmtRp(p.promo_value), true],
                ['Stok', (p: Product) => fmt(p.stock), true],
                ['Status', (p: Product) => p.status ?? '—'],
              ]} />
            </Panel>
          )}

          {active === 'pembayaran' && (
            <>
              <div className="dl-grid dl-g4">
                {[...model.payTotals.entries()].map(([status, total]) => (
                  <Kpi key={status} label={`Total ${status}`} value={fmtRp(total)} />
                ))}
                {model.payTotals.size === 0 && <Kpi label="Total pembayaran" value="Rp 0" />}
              </div>
              <Panel title="Daftar pembayaran" sub={`${all.payments.data.length} transaksi`} error={all.payments.error}>
                <DataTable rows={all.payments.data} empty="Belum ada pembayaran." cols={[
                  ['KOL', (p: Payment) => model.nameOf(p.kol_id)],
                  ['Jenis', (p: Payment) => p.payment_type],
                  ['Nominal', (p: Payment) => fmtRp(p.amount), true],
                  ['Status', (p: Payment) => <Badge value={p.status} />],
                  ['Tanggal bayar', (p: Payment) => fmtDate(p.paid_at)],
                  ['Diajukan', (p: Payment) => fmtDate(p.requested_at)],
                ]} />
              </Panel>
            </>
          )}

          {active === 'pipeline' && (
            <>
              <div className="dl-grid dl-g4">
                {[...model.statusCount.entries()].map(([status, n]) => (
                  <Kpi key={status} label={`KOL ${status}`} value={fmt(n)} />
                ))}
              </div>
              <Panel title="Aksi yang masih berjalan" sub={`${all.actions.data.filter((a) => !a.resolved_at).length} aksi`} error={all.actions.error}>
                <DataTable rows={all.actions.data.filter((a) => !a.resolved_at)} empty="Tidak ada aksi aktif." cols={[
                  ['KOL', (a: Action) => model.nameOf(a.kol_id)],
                  ['Judul', (a: Action) => a.title],
                  ['Aksi', (a: Action) => a.action ?? '—'],
                  ['PIC', (a: Action) => a.pic ?? '—'],
                  ['Deadline', (a: Action) => fmtDate(a.deadline)],
                  ['Status', (a: Action) => <Badge value={a.status} />],
                ]} />
              </Panel>
              <Panel title="Riwayat perubahan status" sub="30 terakhir" error={all.statusEvents.error}>
                <DataTable rows={all.statusEvents.data} empty="Belum ada riwayat." cols={[
                  ['KOL', (e: StatusEvent) => model.nameOf(e.kol_id)],
                  ['Dari', (e: StatusEvent) => e.from_status ?? '—'],
                  ['Ke', (e: StatusEvent) => <Badge value={e.to_status} />],
                  ['Waktu', (e: StatusEvent) => fmtDateTime(e.at)],
                  ['PIC', (e: StatusEvent) => e.pic ?? '—'],
                ]} />
              </Panel>
            </>
          )}

          {active === 'dokumen' && (
            <Panel title="Dokumen & kesepakatan" sub={`${all.docs.data.length} dokumen`} error={all.docs.error}>
              <DataTable rows={all.docs.data} empty="Belum ada dokumen." cols={[
                ['KOL', (d: Doc) => model.nameOf(d.kol_id)],
                ['Jenis', (d: Doc) => d.doc_type],
                ['Judul', (d: Doc) => d.title ?? '—'],
                ['Platform', (d: Doc) => d.platform ?? '—'],
                ['Deliverable', (d: Doc) => d.deliverable ?? '—'],
                ['Tarif', (d: Doc) => (d.rate_amount == null ? '—' : `${d.currency ?? ''} ${fmt(d.rate_amount)}`), true],
                ['Berlaku s/d', (d: Doc) => fmtDate(d.expires_at)],
              ]} />
            </Panel>
          )}

          {active === 'chat' && (
            <>
              <div className="dl-grid dl-g4">
                <Kpi label="Percakapan" value={fmt(all.chats.data.length)} />
                <Kpi label="Pesan total" value={fmt(all.messages.value)} hint={all.messages.error ? 'Data belum tersedia' : undefined} />
                <Kpi label="Belum dibaca" value={fmt(model.unread)} />
                <Kpi label="Aktivitas terakhir" value={fmtDateTime(model.lastChat)} />
              </div>
              <ChatView convs={all.chats.data} showPersonal={showPersonal} pii={pii} />
              {all.chats.error && <div className="err">Gagal memuat percakapan: {all.chats.error}</div>}
            </>
          )}

          {active === 'sistem' && (
            <div className="dl-grid dl-g4">
              <Kpi label="Target terdaftar" value={fmt(all.targets.value)} hint={all.targets.error ? 'Data belum tersedia' : undefined} />
              {[...model.alertCount.entries()].map(([k, n]) => (
                <Kpi key={k} label={`Alert ${k}`} value={fmt(n)} />
              ))}
              {model.alertCount.size === 0 && <Kpi label="Alert operasional" value="0" />}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ---------- chat WhatsApp ---------- */
function ChatView({ convs, showPersonal, pii }: { convs: Chat[]; showPersonal: boolean; pii: (v: string | null | undefined) => string }) {
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

  return (
    <div className="chat">
      <section className="dl-card light chat-list">
        <div className="dl-head">
          <div>
            <h2 className="dl-h">Percakapan</h2>
            <p className="dl-sub">{fmt(convs.length)} percakapan</p>
          </div>
        </div>
        <div className="table-tools">
          <input className="dl-field" placeholder="Cari kontak…" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <div className="conv-scroll">
          {list.map((c) => (
            <button key={c.id} className={`conv ${c.id === selected ? 'active' : ''}`} onClick={() => setSel(c.id)}>
              <div className="conv-top">
                <span className="conv-name">{pii(label(c))}</span>
                {(c.unread_count ?? 0) > 0 && <span className="unread">{c.unread_count}</span>}
              </div>
              <div className="conv-last">{showPersonal ? (c.last_message ?? '—') : '••••'}</div>
              <div className="conv-time">{fmtDateTime(c.last_message_at)}</div>
            </button>
          ))}
          {list.length === 0 && <div className="msg">Tidak ada percakapan.</div>}
        </div>
      </section>

      <section className="dl-card light chat-thread">
        <div className="dl-head">
          <div>
            <h2 className="dl-h">{current ? pii(label(current)) : 'Pilih percakapan'}</h2>
            {current && <p className="dl-sub">{pii(current.phone_number)}</p>}
          </div>
        </div>
        <div className="thread-body">
          {err && <div className="err">Gagal memuat pesan: {err}</div>}
          {loading && <div className="msg">Memuat pesan…</div>}
          {!loading && !err && thread.length === 0 && <div className="msg">Belum ada pesan.</div>}
          {!loading && thread.map((m, i) => (
            <div key={i} className={`bubble-row ${m.direction === 'out' ? 'out' : 'in'}`}>
              <div className="bubble">
                <div className="bubble-text">
                  {showPersonal ? (m.body ?? (m.media_type && m.media_type !== 'text' ? `[${m.media_type}]` : '—')) : '••••'}
                </div>
                <div className="bubble-meta">
                  {fmtDateTime(m.sent_at)}{m.direction === 'out' && m.delivery_status ? ` · ${m.delivery_status}` : ''}
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

/* ---------- komponen kecil ---------- */
function Kpi({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="dl-card">
      <div className="dl-body">
        <div className="dl-lbl">{label}</div>
        <div className="dl-num dl-num-sm">{value}</div>
        {hint && <div className="dl-muted kpi-hint">{hint}</div>}
      </div>
    </div>
  );
}

function Panel({ title, sub, error, children }: { title: string; sub?: string; error?: string | null; children: ReactNode }) {
  return (
    <section className="dl-card light panel">
      <div className="dl-head">
        <div>
          <h2 className="dl-h">{title}</h2>
          {sub && <p className="dl-sub">{sub}</p>}
        </div>
      </div>
      {error && <div className="err">Gagal memuat: {error}</div>}
      {children}
    </section>
  );
}

const BADGE_TONE: Record<string, string> = {
  active: 'good', ongoing: 'good', completed: 'good', published: 'good', paid: 'good', approved: 'good',
  prospect: 'neutral', planning: 'neutral', draft: 'neutral',
  pending: 'warn', requested: 'warn',
  cancelled: 'bad', rejected: 'bad', failed: 'bad', void: 'bad',
};
function Badge({ value }: { value: string }) {
  return <span className={`dl-pill tone-${BADGE_TONE[value] ?? 'neutral'}`}>{value}</span>;
}

function Platform({ value }: { value: string }) {
  const v = value.toLowerCase();
  const cls = v.includes('tiktok') ? 'tt' : v.includes('shopee') ? 'sp' : 'count';
  return <span className={`dl-pill ${cls}`}>{value}</span>;
}

function Bars({ rows, max, empty }: { rows: { name: string; followers: number }[]; max: number; empty: string }) {
  if (rows.length === 0) return <div className="msg">{empty}</div>;
  return (
    <div className="bars">
      {rows.map((r) => (
        <div className="bar-row" key={r.name}>
          <span className="bar-label" title={r.name}>{r.name}</span>
          <div className="dl-bar"><i style={{ width: `${(r.followers / max) * 100}%`, background: '#111' }} /></div>
          <span className="bar-value">{fmt(r.followers)}</span>
        </div>
      ))}
    </div>
  );
}

type Col<T> = [string, (row: T) => ReactNode] | [string, (row: T) => ReactNode, boolean];

function DataTable<T extends object>({ rows, cols, empty, pageSize = 15 }: { rows: T[]; cols: Col<T>[]; empty: string; pageSize?: number }) {
  const [q, setQ] = useState('');
  const [expanded, setExpanded] = useState(false);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return rows;
    return rows.filter((r) => Object.values(r).some((v) => String(v ?? '').toLowerCase().includes(s)));
  }, [rows, q]);

  const shown = expanded ? filtered : filtered.slice(0, pageSize);

  return (
    <div className="table-block">
      <div className="table-tools">
        <input className="dl-field" placeholder="Cari…" value={q} onChange={(e) => { setQ(e.target.value); setExpanded(false); }} />
        <span className="dl-muted">{fmt(filtered.length)} baris</span>
      </div>
      {filtered.length === 0 ? (
        <div className="msg">{rows.length === 0 ? empty : 'Tidak ada hasil untuk pencarian ini.'}</div>
      ) : (
        <div className="dl-table-wrap tablewrap">
          <table className="dl-table">
            <thead>
              <tr>{cols.map(([label, , num]) => <th key={label} className={num ? 'r' : ''}>{label}</th>)}</tr>
            </thead>
            <tbody>
              {shown.map((row, i) => (
                <tr key={i}>
                  {cols.map(([label, render, num]) => (
                    <td key={label} className={num ? 'r' : ''}>{render(row)}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {filtered.length > pageSize && (
        <div className="table-foot">
          <button className="dl-btn" onClick={() => setExpanded(!expanded)}>
            {expanded ? `Tampilkan ${pageSize} saja` : `Tampilkan semua (${fmt(filtered.length)})`}
          </button>
        </div>
      )}
    </div>
  );
}
