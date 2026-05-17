import React, { useMemo, useState } from "react";
import "../dashboard.css";
import {
  PieChart, Pie, Cell, Tooltip as RTooltip, ResponsiveContainer, Legend,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as BTooltip,
} from "recharts";

// ─────────────────────────────────────────────────────────────────────────────
// RENK PALETİ -- Sporthink marka renklerine dayalı, 8 kategoriye kadar
// ─────────────────────────────────────────────────────────────────────────────
const PALETTE = [
  "#E8221E", // brand red
  "#2563EB", // blue
  "#059669", // emerald
  "#D97706", // amber
  "#7C3AED", // violet
  "#DB2777", // pink
  "#0891B2", // cyan
  "#65A30D", // lime
  "#9333EA", // purple
  "#EA580C", // orange
];

// ─────────────────────────────────────────────────────────────────────────────
// YARDIMCI FORMATLAYICILAR
// ─────────────────────────────────────────────────────────────────────────────
const fmt = {
  tl:   (v) => v == null ? "--" : new Intl.NumberFormat("tr-TR", { style: "currency", currency: "TRY", maximumFractionDigits: 0 }).format(v),
  num:  (v) => v == null ? "--" : new Intl.NumberFormat("tr-TR").format(Math.round(v)),
  pct:  (v) => v == null ? "--" : `%${Number(v).toFixed(1)}`,
  dec2: (v) => v == null ? "--" : Number(v).toFixed(2),
  short:(v) => {                               // 1.2M / 850K gibi
    if (v == null) return "--";
    if (Math.abs(v) >= 1_000_000) return (v / 1_000_000).toFixed(1) + "M ₺";
    if (Math.abs(v) >= 1_000)     return (v / 1_000).toFixed(0)     + "K ₺";
    return v.toFixed(0) + " ₺";
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// VERİ HAZIRLIK -- JSON'dan hesaplanan agregasyonlar
// ─────────────────────────────────────────────────────────────────────────────
function useAggregations(data) {
  return useMemo(() => {
    if (!data?.length) return null;

    const aktif = data.filter((r) => (r["Ciro"] ?? 0) > 0);

    // ── KPI'lar ──────────────────────────────────────────────
    const toplamCiro      = data.reduce((s, r) => s + (r["Ciro"] ?? 0), 0);
    const toplamSatisSayi = data.reduce((s, r) => s + ((r["Satis Adedi"] ?? r["Satış Adedi"]) ?? 0), 0);
    const toplamBrutKar   = data.reduce((s, r) => s + ((r["Brut Kar"] ?? r["Brüt Kar"]) ?? 0), 0);
    const toplamStok      = data.reduce((s, r) => s + (r["DSS Miktar"] ?? 0), 0);
    const ortKarMarji     = aktif.length
      ? aktif.reduce((s, r) => s + ((r["Kar Marji %"] ?? r["Kar Marjı %"]) ?? 0), 0) / aktif.length
      : 0;
    const ortGMROI        = aktif.length
      ? aktif.reduce((s, r) => s + (r["GMROI"] ?? 0), 0) / aktif.length
      : 0;
    const ortSellThrough  = aktif.length
      ? aktif.reduce((s, r) => s + (r["Sell Through %"] ?? 0), 0) / aktif.length
      : 0;

    // ── Alt Kategori → Pie Chart ──────────────────────────────
    const katMap = {};
    for (const r of data) {
      const raw = r["Alt Kategori"] ?? "";
      // "75 - Sneaker"  →  "Sneaker"
      const label = raw.includes(" - ") ? raw.split(" - ").slice(1).join(" - ").trim() : raw || "Diğer";
      katMap[label] = (katMap[label] ?? 0) + (r["Ciro"] ?? 0);
    }
    const kategoriPie = Object.entries(katMap)
      .map(([name, value]) => ({ name, value: Math.round(value) }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 8); // Pie'da 8'den fazla olmasın

    // ── Cinsiyet → Bar Chart ──────────────────────────────────
    const cinMap = {};
    for (const r of data) {
      const raw   = r["CİNSİYET"] ?? "Bilinmiyor";
      // "Erkek - Erkek" → "Erkek"
      const label = raw.split(" - ")[0].trim() || "Bilinmiyor";
      if (!cinMap[label]) cinMap[label] = { satisSayi: 0, ciro: 0, brutKar: 0 };
      cinMap[label].satisSayi += ((r["Satis Adedi"] ?? r["Satış Adedi"]) ?? 0);
      cinMap[label].ciro      += (r["Ciro"]        ?? 0);
      cinMap[label].brutKar   += ((r["Brut Kar"] ?? r["Brüt Kar"])    ?? 0);
    }
    const cinsiyetBar = Object.entries(cinMap)
      .map(([cinsiyet, v]) => ({ cinsiyet, ...v, satisSayi: Math.round(v.satisSayi) }))
      .sort((a, b) => b.ciro - a.ciro);

    // ── Marka → Bar Chart (top 10) ────────────────────────────
    const markaMap = {};
    for (const r of data) {
      const k = r["Marka Açıklama"] ?? "Diğer";
      if (!markaMap[k]) markaMap[k] = { ciro: 0, brutKar: 0, satisSayi: 0 };
      markaMap[k].ciro      += (r["Ciro"]        ?? 0);
      markaMap[k].brutKar   += ((r["Brut Kar"] ?? r["Brüt Kar"])    ?? 0);
      markaMap[k].satisSayi += ((r["Satis Adedi"] ?? r["Satış Adedi"]) ?? 0);
    }
    const markaBar = Object.entries(markaMap)
      .map(([marka, v]) => ({ marka, ...v }))
      .sort((a, b) => b.ciro - a.ciro)
      .slice(0, 10);

    // ── Sezon karşılaştırması ─────────────────────────────────
    const sezonMap = {};
    for (const r of data) {
      const s = (r["Mevcut Sezon Kodu"] ?? "--").split(" - ")[0].trim();
      if (!sezonMap[s]) sezonMap[s] = { ciro: 0, brutKar: 0, satisSayi: 0 };
      sezonMap[s].ciro      += (r["Ciro"]        ?? 0);
      sezonMap[s].brutKar   += ((r["Brut Kar"] ?? r["Brüt Kar"])    ?? 0);
      sezonMap[s].satisSayi += ((r["Satis Adedi"] ?? r["Satış Adedi"]) ?? 0);
    }
    const sezonBar = Object.entries(sezonMap)
      .map(([sezon, v]) => ({ sezon, ...v }))
      .sort((a, b) => b.ciro - a.ciro);

    // ── Top 5 Bestseller & Worstseller ───────────────────────
    const bestseller  = [...aktif].sort((a, b) => (b["Ciro"] ?? 0) - (a["Ciro"] ?? 0)).slice(0, 5);
    const worstseller = [...aktif].sort((a, b) => (a["Ciro"] ?? 0) - (b["Ciro"] ?? 0)).slice(0, 5);

    // ── Ana Grup × Sezon grouped bar ─────────────────────────
    const agSezonMap = {};
    for (const r of data) {
      const ag = r["Ana Grup"] || "Diger";
      const s  = (r["Mevcut Sezon Kodu"] || "").split(" - ")[0].trim() || "?";
      if (!agSezonMap[ag]) agSezonMap[ag] = {};
      agSezonMap[ag][s] = (agSezonMap[ag][s] || 0) + (r["Ciro"] || 0);
    }
    const anaGrupSezon = Object.entries(agSezonMap)
      .map(([ag, seasons]) => ({ ag, ...seasons }))
      .sort((a, b) => ((b["25F"] || 0) + (b["25S"] || 0)) - ((a["25F"] || 0) + (a["25S"] || 0)));

    // ── Cover dağılımı (stok sağlığı) ───────────────────────
    const coverDist = [
      { label: "Hizli (0-8h)",  count: 0, color: "#059669" },
      { label: "Normal (8-12h)", count: 0, color: "#D97706" },
      { label: "Yavas (12-19h)", count: 0, color: "#EA580C" },
      { label: "Olu (19h+)",    count: 0, color: "#dc2626" },
    ];
    for (const r of aktif) {
      const c = r["Cover"] || 0;
      if (c <= 0) continue;
      if (c <= 8)  coverDist[0].count++;
      else if (c <= 12) coverDist[1].count++;
      else if (c <= 19) coverDist[2].count++;
      else coverDist[3].count++;
    }

    // ── Sell Through dağılımı ────────────────────────────────
    const stDist = [
      { label: ">%80",    count: 0, color: "#059669" },
      { label: "%50-80",  count: 0, color: "#2563EB" },
      { label: "%20-50",  count: 0, color: "#D97706" },
      { label: "<%20",    count: 0, color: "#dc2626" },
    ];
    for (const r of aktif) {
      const s = r["Sell Through %"] || 0;
      if (s > 80) stDist[0].count++;
      else if (s >= 50) stDist[1].count++;
      else if (s >= 20) stDist[2].count++;
      else stDist[3].count++;
    }

    // ── Kar Marjı dağılımı ───────────────────────────────────
    const karDist = [
      { label: "Zarar (<0%)",  count: 0, color: "#dc2626" },
      { label: "Dusuk (0-30%)",  count: 0, color: "#EA580C" },
      { label: "Orta (30-45%)", count: 0, color: "#D97706" },
      { label: "Yuksek (45%+)", count: 0, color: "#059669" },
    ];
    for (const r of aktif) {
      const k = r["Kar Marji %"] || 0;
      if (k < 0) karDist[0].count++;
      else if (k < 30) karDist[1].count++;
      else if (k < 45) karDist[2].count++;
      else karDist[3].count++;
    }

    return {
      kpi: { toplamCiro, toplamSatisSayi, toplamBrutKar, toplamStok, ortKarMarji, ortGMROI, ortSellThrough },
      kategoriPie,
      cinsiyetBar,
      markaBar,
      sezonBar,
      anaGrupSezon,
      coverDist,
      stDist,
      karDist,
      gmroiOrta: (() => {
        const vals = data.filter(r => (r["GMROI"]??0) > 0).map(r => r["GMROI"]??0);
        return vals.length ? vals.reduce((s,v)=>s+v,0)/vals.length : 0;
      })(),
      coverOrta: (() => {
        const vals = data.filter(r => (r["Cover"]??0) > 0).map(r => r["Cover"]??0).sort((a,b)=>a-b);
        if (!vals.length) return 0;
        const mid = Math.floor(vals.length / 2);
        return vals.length % 2 ? vals[mid] : (vals[mid-1]+vals[mid])/2;
      })(), // Medyan kullanılıyor (ortalama aşırı yüksek cover değerlerinden bozuluyor)
      sellThruOrta: (() => {
        const vals = data.filter(r => (r["Sell Through %"]??0) > 0).map(r => r["Sell Through %"]??0);
        return vals.length ? vals.reduce((s,v)=>s+v,0)/vals.length : 0;
      })(),
      toplamUrun: data.length,
      aktifUrun:  aktif.length,
    };
  }, [data]);
}

// ─────────────────────────────────────────────────────────────────────────────
// ÖZEL TOOLTIP BİLEŞENLERİ
// ─────────────────────────────────────────────────────────────────────────────
function PieTooltipContent({ active, payload }) {
  if (!active || !payload?.length) return null;
  const { name, value, percent } = payload[0];
  return (
    <div className="chart-tooltip">
      <p className="chart-tooltip-title">{name}</p>
      <p className="chart-tooltip-val">{fmt.tl(value)}</p>
      <p className="chart-tooltip-sub">%{(percent * 100).toFixed(1)} pay</p>
    </div>
  );
}

function BarTooltipContent({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="chart-tooltip">
      <p className="chart-tooltip-title">{label}</p>
      {payload.map((p) => (
        <p key={p.dataKey} className="chart-tooltip-row" style={{ color: p.color }}>
          <span>{p.name}:</span>
          <span>{typeof p.value === "number" && p.value > 10000 ? fmt.tl(p.value) : fmt.num(p.value)}</span>
        </p>
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// KPI KARTI
// ─────────────────────────────────────────────────────────────────────────────
function KpiCard({ label, value, sub, accent, icon, animDelay = 0 }) {
  return (
    <div className="kpi-card" style={{ animationDelay: `${animDelay}ms` }}>
      <div className="kpi-card-top">
        <span className="kpi-label">{label}</span>
        <span className="kpi-icon" style={{ background: `${accent}18`, color: accent }}>
          {icon}
        </span>
      </div>
      <p className="kpi-value" style={{ "--kpi-accent": accent }}>{value}</p>
      {sub && <p className="kpi-sub">{sub}</p>}
      <div className="kpi-bar" style={{ background: `${accent}22` }}>
        <div className="kpi-bar-fill" style={{ background: accent }} />
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// CHART KART WRAPPER
// ─────────────────────────────────────────────────────────────────────────────
function ChartCard({ title, subtitle, children, className = "" }) {
  return (
    <div className={`chart-card ${className}`}>
      <div className="chart-card-header">
        <div>
          <h3 className="chart-card-title">{title}</h3>
          {subtitle && <p className="chart-card-sub">{subtitle}</p>}
        </div>
      </div>
      <div className="chart-card-body">{children}</div>
    </div>
  );
}


// ─────────────────────────────────────────────────────────────────────────────
// ANA COMPONENT
// ─────────────────────────────────────────────────────────────────────────────
export function ExecutiveDashboard({ etlData, meta, theme, onNewUpload }) {
  const [markaMetric, setMarkaMetric]  = useState("ciro"); // "ciro" | "brutKar" | "satisSayi"
  const [sezonFilter, setSezonFilter]  = useState("Tumu"); // "Tumu" | "25F" | "25S"

  // Sezon filtrelemesi
  const filteredData = React.useMemo(() => {
    if (!etlData || sezonFilter === "Tumu") return etlData;
    return etlData.filter(r => {
      const s = (r["Mevcut Sezon Kodu"] || "").split(" - ")[0].trim();
      return s === sezonFilter;
    });
  }, [etlData, sezonFilter]);
  const agg = useAggregations(filteredData);
  const isDark = theme === "dark";

  if (!agg) {
    return (
      <div className="dash-empty">
        <p>Veri yükleniyor...</p>
      </div>
    );
  }

  const { kpi, kategoriPie, cinsiyetBar, markaBar, sezonBar,
          anaGrupSezon, coverDist, stDist, karDist } = agg;
  const markaMetricLabel = { ciro: "Ciro (₺)", brutKar: "Brüt Kar (₺)", satisSayi: "Satış Adedi" };

  // Ortak stil yardımcıları
  const cardBase = {
    background: "var(--bg-surface)", border: "1px solid var(--border-subtle)",
    borderRadius: 14, padding: "1.25rem 1.5rem", overflow: "hidden",
  };
  const sectionGap = { display: "flex", flexDirection: "column", gap: "1.25rem",
    padding: "0 2.5rem 3rem" };

  return (
    <div className="dash-root">

      {/* ── Başlık ──────────────────────────────────────────── */}
      <div className="dash-header">
        <div>
          <h2 className="dash-title">Yönetici Özeti</h2>
          <p className="dash-subtitle">
            {agg.toplamUrun.toLocaleString("tr-TR")} ürün ·{" "}
            {agg.aktifUrun.toLocaleString("tr-TR")} aktif ·{" "}
            {meta?.generated_at ? new Date(meta.generated_at).toLocaleString("tr-TR") : "--"}
          </p>
        </div>
        <div style={{display:"flex",gap:10,alignItems:"center"}}>
          <div style={{display:"flex",gap:4,background:"var(--bg-surface-2)",
            padding:"3px",borderRadius:8,border:"1px solid var(--border-subtle)"}}>
            {["Tumu","25F","25S"].map(s => (
              <button key={s} onClick={() => setSezonFilter(s)} style={{
                padding:"5px 12px",borderRadius:6,border:"none",
                fontFamily:"inherit",fontWeight:600,fontSize:"0.8rem",
                cursor:"pointer",transition:"all 0.15s",
                background: sezonFilter===s ? "var(--red)" : "transparent",
                color: sezonFilter===s ? "#fff" : "var(--text-muted)",
              }}>{s === "Tumu" ? "Tümü" : s}</button>
            ))}
          </div>
          <button className="dash-new-upload-btn" onClick={onNewUpload}>
            <UploadIcon />Yeni Yükleme
          </button>
        </div>
      </div>

      {/* ── KPI Kartları ────────────────────────────────────── */}
      <div className="kpi-grid">
        <KpiCard label="Toplam Ciro" value={fmt.tl(kpi.toplamCiro)}
          sub={`Brüt Kar: ${fmt.tl(kpi.toplamBrutKar)}`} accent="#E8221E" animDelay={0} icon={<CiroIcon />} />
        <KpiCard label="Toplam Satış Adedi" value={fmt.num(kpi.toplamSatisSayi)}
          sub={`${agg.aktifUrun} aktif SKU`} accent="#2563EB" animDelay={80} icon={<SatisIcon />} />
        <KpiCard label="Ort. Kar Marjı" value={fmt.pct(kpi.ortKarMarji)}
          sub={`GMROI: ${fmt.dec2(kpi.ortGMROI)}`} accent="#059669" animDelay={160} icon={<KarIcon />} />
        <KpiCard label="Kalan Stok" value={fmt.num(kpi.toplamStok)}
          sub={`Sell Through: ${fmt.pct(kpi.ortSellThrough)}`} accent="#D97706" animDelay={240} icon={<StokIcon />} />
      </div>

      <div style={sectionGap}>

        {/* ── Satır 1: Kategori Donut + Ana Grup × Sezon ─── */}
        <div style={{display:"grid",gridTemplateColumns:"1fr 1.6fr",gap:"1.25rem"}}>

          {/* Kategori Donut */}
          <div style={cardBase}>
            <p style={titleStyle}>Kategori Dağılımı</p>
            <p style={subStyle}>Alt kategoriye göre ciro payı</p>
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie data={kategoriPie} dataKey="value" nameKey="name"
                  cx="50%" cy="48%" innerRadius="52%" outerRadius="78%"
                  paddingAngle={2} strokeWidth={0}>
                  {kategoriPie.map((_, i) => <Cell key={i} fill={PALETTE[i % PALETTE.length]} />)}
                </Pie>
                <RTooltip content={<PieTooltipContent />} />
                <Legend iconType="circle" iconSize={8}
                  wrapperStyle={{fontSize:"0.72rem",paddingTop:8}}
                  formatter={(v) => <span style={{color:"var(--text-secondary)"}}>{v}</span>} />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Ana Grup × Sezon Grouped Bar */}
          <div style={cardBase}>
            <p style={titleStyle}>Ana Grup Bazında Sezon Karşılaştırması</p>
            <p style={subStyle}>Ayakkabı · Giyim · Aksesuar — ciro (₺)</p>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={anaGrupSezon} margin={{top:8,right:16,left:0,bottom:4}} barCategoryGap="30%">
                <CartesianGrid strokeDasharray="3 3" vertical={false}
                  stroke={isDark?"rgba(255,255,255,0.06)":"rgba(0,0,0,0.06)"} />
                <XAxis dataKey="ag" tick={{fontSize:12,fill:isDark?"#8c8b87":"#6b6b68"}}
                  axisLine={false} tickLine={false} />
                <YAxis tick={{fontSize:11,fill:isDark?"#8c8b87":"#6b6b68"}}
                  axisLine={false} tickLine={false} tickFormatter={fmt.short} width={64} />
                <BTooltip content={<BarTooltipContent />}
                  cursor={{fill:isDark?"rgba(255,255,255,0.04)":"rgba(0,0,0,0.04)"}} />
                <Bar dataKey="25F" name="25F Ciro" fill="#E8221E" radius={[4,4,0,0]} />
                <Bar dataKey="25S" name="25S Ciro" fill="#2563EB" radius={[4,4,0,0]} />
                <Legend iconType="circle" iconSize={8}
                  wrapperStyle={{fontSize:"0.72rem"}}
                  formatter={(v) => <span style={{color:"var(--text-secondary)"}}>{v}</span>} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* ── Satır 2: Marka Performansı ───────────────────── */}
        <div style={cardBase}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:12}}>
            <div>
              <p style={titleStyle}>Marka Performansı</p>
              <p style={subStyle}>Top 10 marka karşılaştırması</p>
            </div>
            <div style={{display:"flex",gap:4}}>
              {Object.entries(markaMetricLabel).map(([key, label]) => (
                <button key={key} onClick={() => setMarkaMetric(key)} style={{
                  padding:"4px 10px", borderRadius:6, border:"1px solid var(--border-subtle)",
                  fontFamily:"inherit", fontWeight:600, fontSize:"0.72rem", cursor:"pointer",
                  background: markaMetric===key ? "var(--red)" : "var(--bg-surface-2)",
                  color: markaMetric===key ? "#fff" : "var(--text-muted)", transition:"all 0.15s",
                }}>{label}</button>
              ))}
            </div>
          </div>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={markaBar} layout="vertical"
              margin={{top:4,right:24,left:8,bottom:4}} barCategoryGap="30%">
              <CartesianGrid strokeDasharray="3 3" horizontal={false}
                stroke={isDark?"rgba(255,255,255,0.06)":"rgba(0,0,0,0.06)"} />
              <XAxis type="number" tick={{fontSize:11,fill:isDark?"#8c8b87":"#6b6b68"}}
                axisLine={false} tickLine={false}
                tickFormatter={(v) => markaMetric==="satisSayi" ? fmt.num(v) : fmt.short(v)} />
              <YAxis type="category" dataKey="marka" width={88}
                tick={{fontSize:12,fill:isDark?"#c4c4c0":"#333330"}} axisLine={false} tickLine={false} />
              <BTooltip content={<BarTooltipContent />}
                cursor={{fill:isDark?"rgba(255,255,255,0.04)":"rgba(0,0,0,0.04)"}} />
              <Bar dataKey={markaMetric} name={markaMetricLabel[markaMetric]} radius={[0,4,4,0]}>
                {markaBar.map((_, i) => (
                  <Cell key={i} fill={i===0 ? "#E8221E" : isDark ? "#3b82f6" : "#2563EB"}
                    fillOpacity={1 - i * 0.07} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* ── Satır 3: Stok Sağlığı — 3 dağılım ──────────── */}
        <div>
          <p style={{...titleStyle, marginBottom:4}}>Stok Sağlığı Analizi</p>
          <p style={{...subStyle, marginBottom:12}}>Cover · Sell Through · Kar Marjı dağılımları</p>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:"1.25rem"}}>
            {[
              {title:"Cover Dağılımı", sub:"Satış hızı segmentleri", data:coverDist},
              {title:"Sell Through Dağılımı", sub:"Stok eritme oranı", data:stDist},
              {title:"Kar Marjı Dağılımı", sub:"Kârlılık segmentleri", data:karDist},
            ].map(({title, sub, data}) => (
              <div key={title} style={cardBase}>
                <p style={{...titleStyle, fontSize:"0.875rem"}}>{title}</p>
                <p style={{...subStyle, marginBottom:12}}>{sub}</p>
                <div style={{display:"flex",flexDirection:"column",gap:8}}>
                  {data.map(({label, count, color}) => {
                    const total = data.reduce((s,d)=>s+d.count,0);
                    const pct = total ? Math.round(count/total*100) : 0;
                    return (
                      <div key={label}>
                        <div style={{display:"flex",justifyContent:"space-between",
                          fontSize:"0.75rem",marginBottom:4}}>
                          <span style={{color:"var(--text-secondary)",fontWeight:500}}>{label}</span>
                          <span style={{color,fontWeight:700}}>{count} ürün · %{pct}</span>
                        </div>
                        <div style={{height:6,background:"var(--bg-surface-2)",borderRadius:3,overflow:"hidden"}}>
                          <div style={{height:"100%",width:`${pct}%`,background:color,
                            borderRadius:3,transition:"width 0.8s ease"}} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── Satır 4: Cinsiyet + Sezon Karşılaştırması ─── */}
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"1.25rem"}}>

          {/* Cinsiyet Bar */}
          <div style={cardBase}>
            <p style={titleStyle}>Cinsiyet Performansı</p>
            <p style={{...subStyle, marginBottom:8}}>Cinsiyet bazında ciro ve karlılık</p>
            <div style={{display:"flex",flexDirection:"column",gap:8}}>
              {cinsiyetBar.filter(d=>d.ciro>0).map((d,i) => {
                const km = d.ciro > 0 ? (d.brutKar / d.ciro * 100) : 0;
                const maxCiro = cinsiyetBar[0]?.ciro || 1;
                const barW = Math.min((d.ciro / maxCiro) * 100, 100);
                return (
                  <div key={d.cinsiyet}>
                    <div style={{display:"flex",justifyContent:"space-between",
                      fontSize:"0.75rem",marginBottom:3}}>
                      <span style={{color:"var(--text-secondary)",fontWeight:600,width:70}}>{d.cinsiyet}</span>
                      <span style={{color:"var(--text-primary)",fontWeight:700}}>{fmt.short(d.ciro)}</span>
                      <span style={{
                        fontWeight:700, minWidth:44, textAlign:"right",
                        color: km>=45?"#059669":km>=30?"#D97706":"#dc2626"
                      }}>%{km.toFixed(0)}</span>
                    </div>
                    <div style={{height:5,background:"var(--bg-surface-2)",borderRadius:3,overflow:"hidden"}}>
                      <div style={{height:"100%",width:`${barW}%`,
                        background:PALETTE[i%PALETTE.length],borderRadius:3,
                        transition:"width 0.6s ease"}} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Sezon Karşılaştırması */}
          <div style={cardBase}>
            <p style={titleStyle}>Sezon Karşılaştırması</p>
            <p style={{...subStyle, marginBottom:4}}>Dönem bazında ciro ve brüt kar</p>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={sezonBar} margin={{top:8,right:16,left:0,bottom:4}} barCategoryGap="40%">
                <CartesianGrid strokeDasharray="3 3" vertical={false}
                  stroke={isDark?"rgba(255,255,255,0.06)":"rgba(0,0,0,0.06)"} />
                <XAxis dataKey="sezon" tick={{fontSize:13,fill:isDark?"#c4c4c0":"#333330"}}
                  axisLine={false} tickLine={false} />
                <YAxis tick={{fontSize:11,fill:isDark?"#8c8b87":"#6b6b68"}}
                  axisLine={false} tickLine={false} tickFormatter={fmt.short} width={60} />
                <BTooltip content={<BarTooltipContent />}
                  cursor={{fill:isDark?"rgba(255,255,255,0.04)":"rgba(0,0,0,0.04)"}} />
                <Bar dataKey="ciro"    name="Ciro (₺)"     fill="#E8221E" radius={[4,4,0,0]} />
                <Bar dataKey="brutKar" name="Brüt Kar (₺)" fill="#2563EB" radius={[4,4,0,0]} />
                <Legend iconType="circle" iconSize={8}
                  wrapperStyle={{fontSize:"0.72rem"}}
                  formatter={(v) => <span style={{color:"var(--text-secondary)"}}>{v}</span>} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* ── Satır 5: Sezon Özeti metrikleri ─────────────── */}
        <SezonOzeti agg={agg} isDark={isDark} />

      </div>
    </div>
  );
}

// Stil sabitleri (render bölümünde kullanılıyor)
const titleStyle = {
  fontFamily:"'Plus Jakarta Sans',sans-serif", fontWeight:700,
  fontSize:"0.9375rem", color:"var(--text-primary)", margin:0,
};
const subStyle = {
  fontSize:"0.75rem", color:"var(--text-muted)", margin:"3px 0 0",
};

function SezonOzeti({ agg, isDark }) {
  if (!agg) return null;
  const { gmroiOrta, coverOrta, sellThruOrta, cinsiyetBar, markaBar } = agg;
  const fmtTL  = v => v == null ? "--" : new Intl.NumberFormat("tr-TR",{style:"currency",currency:"TRY",maximumFractionDigits:0}).format(v);
  const fmtPct = v => v == null ? "--" : "%"+Number(v).toFixed(1);
  const fmtDec = v => v == null ? "--" : Number(v).toFixed(2);
  const gmroiColor = gmroiOrta>=20?"#16a34a":gmroiOrta>=10?"#2563eb":"#ca8a04";
  const coverColor = coverOrta<=8?"#16a34a":coverOrta<=12?"#ca8a04":"#dc2626";
  const stColor    = sellThruOrta>=50?"#16a34a":sellThruOrta>=30?"#ca8a04":"#dc2626";
  const cardS = {background:"var(--bg-surface)",border:"1px solid var(--border-subtle)",borderRadius:12,padding:"1.25rem 1.5rem"};
  const lbl = {fontSize:"0.7rem",textTransform:"uppercase",letterSpacing:"0.07em",color:"var(--text-muted)",fontWeight:600,margin:0};
  const val = {fontFamily:"'Plus Jakarta Sans',sans-serif",fontWeight:800,color:"var(--text-primary)",margin:"6px 0 0",letterSpacing:"-0.02em"};

  return (
    <div style={{ padding: "2rem 2.5rem 3rem" }}>
      {/* Başlık */}
      <div style={{ marginBottom: "1.25rem" }}>
        <h3 style={{ fontFamily:"'Plus Jakarta Sans',sans-serif", fontSize:"1.1rem",
          fontWeight:700, color:"var(--text-primary)", margin:0, letterSpacing:"-0.02em" }}>
          Sezon Performans Özeti
        </h3>
        <p style={{ fontSize:"0.8125rem", color:"var(--text-muted)", marginTop:4 }}>
          Stok verimliliği ve satış etkinliği metrikleri
        </p>
      </div>

      {/* 3'lü metrik satırı */}
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:12, marginBottom:12 }}>

        {/* GMROI */}
        <div style={{...cardS, borderTop:`3px solid ${gmroiColor}`}}>
          <p style={lbl}>Ort. GMROI</p>
          <p style={{...val, fontSize:"2rem", color: gmroiColor}}>{fmtDec(gmroiOrta)}</p>
          <p style={{fontSize:"0.75rem", color:"var(--text-muted)", marginTop:4}}>
            Stok başına getiri · 19 hafta
          </p>
          <div style={{marginTop:10, display:"flex", gap:8}}>
            {[{label:"≥20 Yüksek",c:"#16a34a"},{label:"≥10 İyi",c:"#2563eb"},{label:"<10 Düşük",c:"#ca8a04"}]
              .map(({label,c}) => (
              <span key={label} style={{fontSize:"0.65rem",fontWeight:600,
                color:c,background:isDark?`${c}22`:`${c}18`,
                padding:"2px 6px",borderRadius:4}}>{label}</span>
            ))}
          </div>
        </div>

        {/* Cover */}
        <div style={{...cardS, borderTop:`3px solid ${coverColor}`}}>
          <p style={lbl}>Ort. Cover</p>
          <p style={{...val, fontSize:"2rem", color: coverColor}}>
            {fmtDec(coverOrta)} <span style={{fontSize:"1rem",fontWeight:500}}>hafta</span>
          </p>
          <p style={{fontSize:"0.75rem", color:"var(--text-muted)", marginTop:4}}>
            Kalan stok ömrü · 19 haftalık sezon
          </p>
          <div style={{marginTop:10, display:"flex", gap:8}}>
            {[{label:"≤8 Hızlı",c:"#16a34a"},{label:"8-12 Normal",c:"#ca8a04"},{label:">12 Yavaş",c:"#dc2626"}]
              .map(({label,c}) => (
              <span key={label} style={{fontSize:"0.65rem",fontWeight:600,
                color:c,background:isDark?`${c}22`:`${c}18`,
                padding:"2px 6px",borderRadius:4}}>{label}</span>
            ))}
          </div>
        </div>

        {/* Sell Through */}
        <div style={{...cardS, borderTop:`3px solid ${stColor}`}}>
          <p style={lbl}>Ort. Sell Through</p>
          <p style={{...val, fontSize:"2rem", color: stColor}}>{fmtPct(sellThruOrta)}</p>
          <p style={{fontSize:"0.75rem", color:"var(--text-muted)", marginTop:4}}>
            Dönem satış oranı
          </p>
          {/* Mini progress bar */}
          <div style={{marginTop:10,height:6,borderRadius:3,
            background:"var(--bg-surface-2)",overflow:"hidden"}}>
            <div style={{height:"100%",width:`${Math.min(sellThruOrta,100)}%`,
              borderRadius:3,background:stColor,transition:"width 0.8s ease"}}/>
          </div>
        </div>
      </div>

      {/* 2'li alt satır: Cinsiyet + Marka özeti */}
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>

        {/* Cinsiyet karlılık tablosu */}
        <div style={cardS}>
          <p style={{...lbl, marginBottom:12}}>Cinsiyet Bazlı Karlılık</p>
          <div style={{display:"flex",flexDirection:"column",gap:6}}>
            {(cinsiyetBar || [])
              .filter(d => d.ciro > 0)
              .sort((a,b) => b.ciro - a.ciro)
              .slice(0,6)
              .map(d => {
                const km = d.ciro > 0 ? (d.brutKar / d.ciro * 100) : 0;
                const barW = Math.min((d.ciro / (cinsiyetBar[0]?.ciro||1)) * 100, 100);
                return (
                  <div key={d.cinsiyet} style={{display:"flex",alignItems:"center",gap:8}}>
                    <span style={{fontSize:"0.75rem",fontWeight:600,
                      color:"var(--text-secondary)",width:72,flexShrink:0}}>
                      {d.cinsiyet}
                    </span>
                    <div style={{flex:1,height:6,borderRadius:3,
                      background:"var(--bg-surface-2)",overflow:"hidden"}}>
                      <div style={{height:"100%",width:`${barW}%`,borderRadius:3,
                        background:"var(--red)",opacity:0.7}}/>
                    </div>
                    <span style={{fontSize:"0.75rem",fontWeight:700,
                      color:"var(--text-primary)",width:70,textAlign:"right",flexShrink:0}}>
                      {fmtTL(d.ciro)}
                    </span>
                    <span style={{fontSize:"0.7rem",fontWeight:600,
                      color:km>=40?"#16a34a":km>=30?"#ca8a04":"#dc2626",
                      width:42,textAlign:"right",flexShrink:0}}>
                      %{km.toFixed(0)}
                    </span>
                  </div>
                );
              })}
          </div>
        </div>

        {/* Top marka karlılık tablosu */}
        <div style={cardS}>
          <p style={{...lbl, marginBottom:12}}>Top 6 Marka Karlılığı</p>
          <div style={{display:"flex",flexDirection:"column",gap:6}}>
            {(markaBar || [])
              .filter(d => d.ciro > 0)
              .sort((a,b) => b.ciro - a.ciro)
              .slice(0,6)
              .map(d => {
                const km = d.ciro > 0 ? (d.brutKar / d.ciro * 100) : 0;
                const barW = Math.min((d.ciro / (markaBar[0]?.ciro||1)) * 100, 100);
                return (
                  <div key={d.marka} style={{display:"flex",alignItems:"center",gap:8}}>
                    <span style={{fontSize:"0.75rem",fontWeight:600,
                      color:"var(--text-secondary)",width:90,flexShrink:0,
                      whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>
                      {d.marka}
                    </span>
                    <div style={{flex:1,height:6,borderRadius:3,
                      background:"var(--bg-surface-2)",overflow:"hidden"}}>
                      <div style={{height:"100%",width:`${barW}%`,borderRadius:3,
                        background:"#2563eb",opacity:0.7}}/>
                    </div>
                    <span style={{fontSize:"0.75rem",fontWeight:700,
                      color:"var(--text-primary)",width:70,textAlign:"right",flexShrink:0}}>
                      {fmtTL(d.ciro)}
                    </span>
                    <span style={{fontSize:"0.7rem",fontWeight:600,
                      color:km>=40?"#16a34a":km>=30?"#ca8a04":"#dc2626",
                      width:42,textAlign:"right",flexShrink:0}}>
                      %{km.toFixed(0)}
                    </span>
                  </div>
                );
              })}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// KÜÇÜK SVG İKONLAR
// ─────────────────────────────────────────────────────────────────────────────
function CiroIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
    </svg>
  );
}
function SatisIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/>
    </svg>
  );
}
function KarIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/>
    </svg>
  );
}
function StokIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/>
    </svg>
  );
}
function UploadIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: 6 }}>
      <polyline points="16 16 12 12 8 16"/><line x1="12" y1="12" x2="12" y2="21"/><path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3"/>
    </svg>
  );
}

// ─────────────────────────────────────────────────────────────────
// SABİTLER
// ─────────────────────────────────────────────────────────────────
