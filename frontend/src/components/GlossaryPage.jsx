import React from "react";

const METRICS = [
  {
    name: "Ciro",
    formula: "Satış Adedi × PSF",
    desc: "Ürünün dönem içinde ürettiği toplam satış geliri.",
  },
  {
    name: "Brüt Kar",
    formula: "Ciro − SMM",
    desc: "Satış gelirinden mal maliyeti düşüldükten sonra kalan kar.",
  },
  {
    name: "Kar Marjı %",
    formula: "(Brüt Kar / Ciro) × 100",
    desc: "Her 100 TL cirodaki kar payı. Yükseldikçe ürün daha kârlıdır.",
  },
  {
    name: "SMM",
    formula: "Satış Adedi × Alış Fiyatı",
    desc: "Satılan malların maliyeti. Kar hesabının temelidir.",
  },
  {
    name: "GMROI",
    formula: "(Brüt Kar / SMM) × 19",
    desc: "Stoka yatırılan her birim başına elde edilen brüt kar. 19 haftalık sezon sabitiyle normalize edilir. GMROI > 1 stok karlıdır.",
  },
  {
    name: "Cover",
    formula: "(DSS Miktar / Satış Adedi) × 19",
    desc: "Mevcut stokun kaç hafta daha dayanacağını gösterir. Düşük cover hızlı satış, yüksek cover yavaş satış / ölü stok anlamına gelir.",
  },
  {
    name: "Sell Through %",
    formula: "(Satış Adedi / (Satış Adedi + DSS Miktar)) × 100",
    desc: "Dönem başında var olan stokun yüzde kaçının satıldığını gösterir.",
  },
  {
    name: "DSS Miktar",
    formula: "—",
    desc: "Dönem Sonu Stok. Sezon sonundaki kalan stok miktarıdır.",
  },
  {
    name: "DBS Miktar",
    formula: "—",
    desc: "Dönem Başı Stok. Sezon başındaki toplam stok miktarıdır.",
  },
  {
    name: "PSF",
    formula: "—",
    desc: "Perakende Satış Fiyatı. Ürünün müşteriye satıldığı fiyattır.",
  },
  {
    name: "MU (Markup)",
    formula: "PSF / Alış Fiyatı",
    desc: "Alış fiyatının kaç katına satıldığını gösterir. MU = 2 ise alış fiyatının 2 katına satılmaktadır.",
  },
  {
    name: "Regüle PSF",
    formula: "PSF × (1 − İndirim Oranı)",
    desc: "İndirim uygulandıktan sonraki efektif satış fiyatı.",
  },
];

const BS_CRITERIA = [
  { label: "Ciro",      value: "≥ 43.919 TL",  note: "Medyan üstü ciro" },
  { label: "Kar Marjı", value: "≥ %38.9",       note: "p25 üstü karlılık" },
  { label: "GMROI",     value: "≥ 12.1",         note: "p25 üstü stok verimi" },
  { label: "Cover",     value: "≤ 45.2 hafta",  note: "Medyan altı stok ömrü (hızlı satış)" },
];

const WS_CRITERIA = [
  { label: "Ciro",      value: "≤ 7.461 TL",   note: "p25 altı ciro", op: "VEYA" },
  { label: "Kar Marjı", value: "< %0",          note: "Zarar eden ürün", op: "VEYA" },
  { label: "GMROI",     value: "< 5",           note: "Düşük stok verimi", op: "VEYA" },
  { label: "Cover",     value: "> 391.9 hafta", note: "p75 üstü — ölü stok", op: "VEYA" },
];

export function GlossaryPage() {
  return (
    <div style={{ padding: "2rem 2.5rem", maxWidth: 860 }}>
      <h2 style={{
        fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 800,
        fontSize: "1.375rem", letterSpacing: "-0.025em",
        color: "var(--text-primary)", margin: "0 0 0.25rem",
      }}>
        Kavramlar ve Formülasyonlar
      </h2>
      <p style={{ fontSize: "0.8125rem", color: "var(--text-muted)", marginBottom: "2rem" }}>
        Dashboard'da kullanılan metrikler, formüller ve etiket kriterleri
      </p>

      {/* Metrikler */}
      <h3 style={sectionTitle}>Metrikler</h3>
      <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: "2.5rem" }}>
        {METRICS.map(m => (
          <div key={m.name} style={card}>
            <div style={{ display: "flex", alignItems: "baseline", gap: 12, flexWrap: "wrap", marginBottom: 4 }}>
              <span style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 700,
                fontSize: "0.9375rem", color: "var(--text-primary)" }}>{m.name}</span>
              {m.formula !== "—" && (
                <code style={{ fontSize: "0.8rem", color: "var(--red)",
                  background: "rgba(232,34,30,0.08)", padding: "2px 8px", borderRadius: 4,
                  fontFamily: "monospace" }}>{m.formula}</code>
              )}
            </div>
            <p style={{ fontSize: "0.8125rem", color: "var(--text-secondary)", margin: 0, lineHeight: 1.55 }}>
              {m.desc}
            </p>
          </div>
        ))}
      </div>

      {/* Etiket Kriterleri */}
      <h3 style={sectionTitle}>Bestseller / Worstseller Kriterleri</h3>
      <p style={{ fontSize: "0.8125rem", color: "var(--text-muted)", marginBottom: "1rem" }}>
        Kriterler 504 satışlı ürün üzerinden hesaplanan istatistiksel eşiklere dayanmaktadır.
      </p>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        {/* Bestseller */}
        <div style={{ ...card, borderTop: "3px solid #16a34a" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
            <span style={{ background: "#16a34a", color: "#fff", fontWeight: 800,
              fontSize: "0.75rem", padding: "2px 8px", borderRadius: 4 }}>BS</span>
            <span style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 700,
              fontSize: "0.9375rem", color: "var(--text-primary)" }}>Bestseller</span>
          </div>
          <p style={{ fontSize: "0.75rem", color: "var(--text-muted)", margin: "0 0 10px" }}>
            Tüm kriterler aynı anda sağlanmalıdır.
          </p>
          {BS_CRITERIA.map((c, i) => (
            <div key={c.label} style={{ display: "flex", alignItems: "center",
              gap: 8, padding: "6px 0",
              borderTop: i > 0 ? "1px solid var(--border-subtle)" : "none" }}>
              {i > 0 && <span style={{ fontSize: "0.65rem", fontWeight: 700,
                color: "#16a34a", width: 30, flexShrink: 0 }}>VE</span>}
              {i === 0 && <span style={{ width: 30, flexShrink: 0 }} />}
              <span style={{ fontSize: "0.8rem", color: "var(--text-secondary)",
                flex: 1 }}>{c.label}</span>
              <code style={{ fontSize: "0.8rem", fontWeight: 700, color: "#16a34a",
                fontFamily: "monospace" }}>{c.value}</code>
            </div>
          ))}
        </div>

        {/* Worstseller */}
        <div style={{ ...card, borderTop: "3px solid #dc2626" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
            <span style={{ background: "#dc2626", color: "#fff", fontWeight: 800,
              fontSize: "0.75rem", padding: "2px 8px", borderRadius: 4 }}>WS</span>
            <span style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 700,
              fontSize: "0.9375rem", color: "var(--text-primary)" }}>Worstseller</span>
          </div>
          <p style={{ fontSize: "0.75rem", color: "var(--text-muted)", margin: "0 0 10px" }}>
            Herhangi bir kriter sağlandığında etiket verilir.
          </p>
          {WS_CRITERIA.map((c, i) => (
            <div key={c.label} style={{ display: "flex", alignItems: "center",
              gap: 8, padding: "6px 0",
              borderTop: i > 0 ? "1px solid var(--border-subtle)" : "none" }}>
              {i > 0 && <span style={{ fontSize: "0.65rem", fontWeight: 700,
                color: "#dc2626", width: 30, flexShrink: 0 }}>VEYA</span>}
              {i === 0 && <span style={{ width: 30, flexShrink: 0 }} />}
              <span style={{ fontSize: "0.8rem", color: "var(--text-secondary)",
                flex: 1 }}>{c.label}</span>
              <code style={{ fontSize: "0.8rem", fontWeight: 700, color: "#dc2626",
                fontFamily: "monospace" }}>{c.value}</code>
            </div>
          ))}
        </div>
      </div>

      <p style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "1.5rem",
        padding: "10px 14px", background: "var(--bg-surface-2)",
        borderRadius: 8, lineHeight: 1.6 }}>
        <strong>Not:</strong> Eşik değerleri yüklenen veri setinin istatistiksel dağılımına (p25/p50/p75) göre otomatik hesaplanmıştır. Yeni veri setleriyle güncellenebilir.
      </p>
    </div>
  );
}

const sectionTitle = {
  fontFamily: "'Plus Jakarta Sans', sans-serif",
  fontWeight: 700, fontSize: "1rem",
  color: "var(--text-primary)",
  margin: "0 0 0.75rem",
  paddingBottom: "0.5rem",
  borderBottom: "2px solid var(--red)",
  display: "inline-block",
};

const card = {
  background: "var(--bg-surface)",
  border: "1px solid var(--border-subtle)",
  borderRadius: 10,
  padding: "12px 16px",
};
