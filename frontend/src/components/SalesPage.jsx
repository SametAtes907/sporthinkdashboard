import React, { useMemo, useState } from "react";

const HAFTA = 19;

// ── Bestseller / Worstseller Etiket Kriterleri ──────────────
const BS_CRITERIA = { minCiro: 43919, minKar: 38.9, minGMROI: 12.1, maxCover: 45.2 };
const WS_CRITERIA = { maxCiro: 7461,  maxKar: 0,    maxGMROI: 5,   minCover: 391.9 };

function getLabel(p) {
  const bs = p.ciro >= BS_CRITERIA.minCiro &&
             p.karMarji >= BS_CRITERIA.minKar &&
             (p.gmroi || 0) >= BS_CRITERIA.minGMROI &&
             (p.cover == null || p.cover <= BS_CRITERIA.maxCover);
  const ws = p.ciro <= WS_CRITERIA.maxCiro ||
             p.karMarji < WS_CRITERIA.maxKar ||
             ((p.gmroi || 0) < WS_CRITERIA.maxGMROI && (p.gmroi || 0) > 0) ||
             (p.cover != null && p.cover > WS_CRITERIA.minCover);
  return bs ? "bestseller" : ws ? "worstseller" : null;
}



const PSF_MU_MAP = {"JN2706":{"psf":549.0,"regulePsf":549.0,"mu":0.5982,"alisFiyat":334.96},"980234-2001":{"psf":299.95,"regulePsf":299.95,"mu":3.123,"alisFiyat":106.934},"100221602":{"psf":1899.99,"regulePsf":2499.99,"mu":1.1583,"alisFiyat":1420.45},"39229001":{"psf":4699.0,"regulePsf":4699.0,"mu":0.9597,"alisFiyat":2720.9033},"ML408WN":{"psf":4599.0,"regulePsf":4599.0,"mu":1.8442,"alisFiyat":2389.0909},"JN2708":{"psf":549.0,"regulePsf":549.0,"mu":0.4944,"alisFiyat":334.96},"ML408WS":{"psf":4599.0,"regulePsf":4599.0,"mu":1.7118,"alisFiyat":2389.0909},"HT3441":{"psf":419.0,"regulePsf":419.0,"mu":1.6398,"alisFiyat":255.64},"JN2709":{"psf":549.0,"regulePsf":549.0,"mu":0.5466,"alisFiyat":334.96},"39232803":{"psf":4399.0,"regulePsf":4399.0,"mu":1.5911,"alisFiyat":2547.1917},"HT3468":{"psf":419.0,"regulePsf":419.0,"mu":1.7629,"alisFiyat":255.64},"ID3714":{"psf":3299.0,"regulePsf":3299.0,"mu":1.5298,"alisFiyat":2012.81},"JN2707":{"psf":549.0,"regulePsf":549.0,"mu":0.4142,"alisFiyat":334.96},"77980901":{"psf":4499.99,"regulePsf":4499.99,"mu":1.7014,"alisFiyat":2605.6688},"JI0046":{"psf":3299.0,"regulePsf":3299.0,"mu":1.6253,"alisFiyat":2012.81},"JI8081":{"psf":1749.0,"regulePsf":1749.0,"mu":1.6376,"alisFiyat":1067.11},"HT3434":{"psf":419.0,"regulePsf":419.0,"mu":1.7287,"alisFiyat":255.64},"IP9774":{"psf":1999.0,"regulePsf":1999.0,"mu":1.6263,"alisFiyat":1219.65},"52811TK-BBK":{"psf":3899.0,"regulePsf":3899.0,"mu":1.8157,"alisFiyat":2085.0267},"M480GR5":{"psf":4599.0,"regulePsf":4599.0,"mu":1.6709,"alisFiyat":2389.0909},"A2082-0147":{"psf":999.9,"regulePsf":999.9,"mu":2.2381,"alisFiyat":395.2174},"39229002":{"psf":4699.0,"regulePsf":4699.0,"mu":1.5954,"alisFiyat":2720.9033},"IE8574":{"psf":2749.0,"regulePsf":2749.0,"mu":1.5791,"alisFiyat":1677.24},"900680-9001":{"psf":2399.95,"regulePsf":2399.95,"mu":2.0015,"alisFiyat":855.5971},"JP5351":{"psf":4199.0,"regulePsf":4199.0,"mu":1.59,"alisFiyat":2561.93},"IC1282":{"psf":419.0,"regulePsf":419.0,"mu":1.6134,"alisFiyat":255.64},"VN000D82BA21":{"psf":2699.0,"regulePsf":2699.0,"mu":1.8461,"alisFiyat":1291.3876},"56605-0076":{"psf":999.9,"regulePsf":999.9,"mu":2.2635,"alisFiyat":395.2174},"232700TK-BBK":{"psf":5499.0,"regulePsf":5499.0,"mu":1.7813,"alisFiyat":2940.6417},"56605-0075":{"psf":999.9,"regulePsf":999.9,"mu":2.2692,"alisFiyat":395.2174},"A4917-0000":{"psf":899.9,"regulePsf":899.9,"mu":2.2987,"alisFiyat":355.6917},"VN0005W6BA21":{"psf":3199.0,"regulePsf":3199.0,"mu":1.7841,"alisFiyat":1530.622},"402182L-BKMT":{"psf":3999.0,"regulePsf":3999.0,"mu":1.8292,"alisFiyat":2138.5027},"405626L-BBK":{"psf":2999.0,"regulePsf":2999.0,"mu":1.8646,"alisFiyat":1603.7433},"38431101":{"psf":3399.0,"regulePsf":3399.0,"mu":1.1336,"alisFiyat":1968.1529},"88888316TK-BKRG":{"psf":3999.0,"regulePsf":3999.0,"mu":1.5856,"alisFiyat":2138.5027},"911865-2001":{"psf":699.95,"regulePsf":699.95,"mu":2.5095,"alisFiyat":249.5365},"JD7999":{"psf":2399.0,"regulePsf":2399.0,"mu":1.6172,"alisFiyat":1463.7},"IP9878":{"psf":2899.0,"regulePsf":2899.0,"mu":1.6302,"alisFiyat":1768.76},"39185-0122":{"psf":899.9,"regulePsf":899.9,"mu":2.4016,"alisFiyat":355.6917},"56605-0109":{"psf":999.9,"regulePsf":999.9,"mu":2.3261,"alisFiyat":395.2174},"JE3224":{"psf":1899.0,"regulePsf":1899.0,"mu":1.6399,"alisFiyat":1158.63},"SOA03-WT":{"psf":629.0,"regulePsf":629.0,"mu":2.0731,"alisFiyat":300.96},"HT3456":{"psf":499.0,"regulePsf":499.0,"mu":1.7024,"alisFiyat":304.45},"931880-2001":{"psf":1299.95,"regulePsf":1299.95,"mu":2.3635,"alisFiyat":463.4403},"JD3092":{"psf":1749.0,"regulePsf":1749.0,"mu":1.6281,"alisFiyat":1067.11},"102024336":{"psf":899.99,"regulePsf":899.99,"mu":1.9082,"alisFiyat":454.54},"931902-2001":{"psf":1699.95,"regulePsf":1699.95,"mu":2.4612,"alisFiyat":606.0428},"77981801":{"psf":3999.99,"regulePsf":3999.99,"mu":1.7171,"alisFiyat":2316.1494},"A2086-0378":{"psf":999.9,"regulePsf":999.9,"mu":2.189,"alisFiyat":395.2174},"102024254":{"psf":2499.99,"regulePsf":2499.99,"mu":1.9038,"alisFiyat":1262.62},"102024326":{"psf":899.99,"regulePsf":899.99,"mu":1.8962,"alisFiyat":454.54},"A3170-0010":{"psf":899.9,"regulePsf":899.9,"mu":2.2911,"alisFiyat":355.6917},"921136-2001":{"psf":1799.95,"regulePsf":1799.95,"mu":2.4553,"alisFiyat":641.6934},"JM1840":{"psf":3199.0,"regulePsf":3199.0,"mu":1.4868,"alisFiyat":1951.8},"932024-2001":{"psf":1599.95,"regulePsf":1599.95,"mu":2.805,"alisFiyat":570.3922}};

function getPsfMu(sku) { return PSF_MU_MAP[sku] || null; }

const F = {
  satis:    r => r["Satis Adedi"]    ?? r["Sat\u0131\u015f Adedi"]   ?? 0,
  ciro:     r => r["Ciro"]          ?? 0,
  brutKar:  r => r["Brut Kar"]      ?? r["Br\u00fct Kar"]           ?? 0,
  karMarji: r => r["Kar Marji %"]   ?? r["Kar Marj\u0131 %"]       ?? 0,
  gmroi:    r => r["GMROI"]         ?? 0,
  cover:    r => r["Cover"]         ?? 0,
  dss:      r => r["DSS Miktar"]    ?? 0,
  sellThru: r => r["Sell Through %"]?? 0,
  psf:      r => r["PSF"]           ?? null,
  mu:       r => r["MU"]            ?? null,
  marka:    r => r["Marka Aciklama"]?? r["Marka A\u00e7\u0131klama"] ?? "",
  urunAdi:  r => r["Stok Kodu Aciklama"] ?? r["Stok Kodu A\u00e7\u0131klama"] ?? r["Stok Kodu"] ?? "--",
  stokKodu: r => r["Stok Kodu"]     ?? "--",
  cinsiyet: r => {
    const raw = (r["CINSIYET"] ?? r["C\u0130NS\u0130YET"] ?? "").split(" - ")[0].trim();
    return {"EC":"Erkek Cocuk","K\u0131z":"K\u0131z Cocuk"}[raw] || raw || "--";
  },
  altKat:   r => (r["Alt Kategori"] ?? "").split(" - ").slice(1).join(" ").trim() || "--",
  anaGrup:  r => {
    // ETL yeni versiyonda "Ana Grup" alanini normalize edilmis olarak veriyor
    const ag = r["Ana Grup"];
    if (ag && ag !== "null" && ag !== "None") return ag;
    // Fallback: ANAGRUP alanından parse et (eski JSON uyumluluğu)
    const raw = r["ANAGRUP"] || r["Ana Grup"] || "";
    const normalized = raw.replace(/\s+/g, " ").trim();
    const parts = normalized.split(" - ");
    return parts.length > 1 ? parts[1].trim() : (normalized || "--");
  },
  gorsel:   r => r["Gorsel Link"]   ?? r["G\u00f6rsel Link"]        ?? null,
  sezon:    r => (r["Mevcut Sezon Kodu"] || "").split(" - ")[0].trim(),
};

const fmtTL  = v => v == null ? "--" : new Intl.NumberFormat("tr-TR",{style:"currency",currency:"TRY",maximumFractionDigits:0}).format(v);
const fmtNum = v => v == null ? "--" : new Intl.NumberFormat("tr-TR").format(Math.round(v));
const fmtPct = v => v == null ? "--" : "%"+Number(v).toFixed(1);
const fmtDec = v => v == null ? "--" : Number(v).toFixed(2);

function coverBadge(c) {
  if (c == null) return null;
  if (c <= 8)  return {label:"H\u0131zl\u0131", bg:"rgba(22,163,74,0.12)",  color:"#16a34a"};
  if (c <= 12) return {label:"Normal",           bg:"rgba(202,138,4,0.12)",  color:"#ca8a04"};
  return              {label:"Yava\u015f",       bg:"rgba(220,38,38,0.12)",  color:"#dc2626"};
}
function gmroiBadge(g) {
  if (g == null) return null;
  if (g >= 20) return {label:"Y\u00fcksek",color:"#16a34a"};
  if (g >= 10) return {label:"\u0130yi",   color:"#2563eb"};
  if (g >= 0)  return {label:"D\u00fc\u015f\u00fck",color:"#ca8a04"};
  return              {label:"Zarar",      color:"#dc2626"};
}

function ProductImage({ stokKodu, gorselUrl, urunAdi, size=80 }) {
  const [status, setStatus] = useState("idle");
  const [src, setSrc] = useState(null);
  React.useEffect(() => {
    const local = `/images/${stokKodu}.jpg`;
    const img = new Image();
    img.onload = () => { setSrc(local); setStatus("ok"); };
    img.onerror = () => {
      if (gorselUrl) {
        const sm = gorselUrl.replace("sporthink.mncdn.com","sporthink.sm.mncdn.com").replace("/mnresize/150/","/mnresize/400/");
        const img2 = new Image();
        img2.onload = () => { setSrc(sm); setStatus("ok"); };
        img2.onerror = () => setStatus("error");
        img2.src = sm;
      } else setStatus("error");
    };
    img.src = local; setStatus("loading");
  }, [stokKodu, gorselUrl]);

  return (
    <div style={{width:size,height:size,borderRadius:8,overflow:"hidden",background:"#f8f8f6",
      flexShrink:0,display:"flex",alignItems:"center",justifyContent:"center",
      border:"1px solid var(--border-subtle)"}}>
      {status==="ok"&&src&&<img src={src} alt={urunAdi} style={{width:"100%",height:"100%",
        objectFit:"contain",padding:4,mixBlendMode:"multiply",filter:"contrast(1.1) brightness(1.05)"}}/>}
      {status==="loading"&&<div style={{width:16,height:16,border:"2px solid var(--border-medium)",
        borderTopColor:"var(--red)",borderRadius:"50%",animation:"spin 0.8s linear infinite"}}/>}
      {(status==="error"||status==="idle")&&<svg width={size*0.4} height={size*0.4} viewBox="0 0 24 24"
        fill="none" stroke="currentColor" strokeWidth="1.5" style={{opacity:0.2}}>
        <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/>
        <line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 01-8 0"/></svg>}
    </div>
  );
}


function ProductRow({ rank, product, type, showImages }) {
  const cb = coverBadge(product.cover);
  const gb = gmroiBadge(product.gmroi);
  const isBest = type==="bestseller"; // all için sort yonu Ciro desc

  // Satır metrikleri — her zaman göster, yoksa soluk "—"
  const rowMetrics = [
    { label:"Ciro",    val:fmtTL(product.ciro),          color:null,       has:true },
    { label:"Kar",     val:fmtPct(product.karMarji),      color:gb?.color ?? null, has:true },
    { label:"GMROI",   val:fmtDec(product.gmroi),         color:gb?.color ?? null, has:true },
    { label:"Cover",   val:product.cover ? product.cover+"h" : "—",
      color:cb?.color ?? null, badge:cb?.label, has:true },
    { label:"S.Thru",  val:fmtPct(product.sellThru),      color:null,       has:true },
    { label:"PSF",     val:product.psf ? fmtTL(product.psf) : null, color:null, has:!!product.psf },
    { label:"MU",      val:product.mu  ? fmtDec(product.mu)  : null, color:null, has:!!product.mu  },
  ];

  return (
    <div style={{display:"flex",alignItems:"center",gap:12,padding:"10px 16px",
      borderBottom:"1px solid var(--border-subtle)",transition:"background 0.15s"}}
      onMouseEnter={e=>e.currentTarget.style.background="var(--bg-surface-2)"}
      onMouseLeave={e=>e.currentTarget.style.background="transparent"}>

      {/* Sıra */}
      <div style={{width:28,height:28,borderRadius:"50%",flexShrink:0,display:"flex",
        alignItems:"center",justifyContent:"center",fontSize:"0.6875rem",fontWeight:700,
        background:isBest?"rgba(22,163,74,0.1)":"rgba(220,38,38,0.1)",
        color:isBest?"#16a34a":"#dc2626"}}>{rank}</div>

      {/* Görsel */}
      {showImages&&<ProductImage stokKodu={product.stokKodu} gorselUrl={product.gorsel}
        urunAdi={product.urunAdi} size={52}/>}

      {/* Ürün adı */}
      <div style={{flex:1,minWidth:0}}>
        <p style={{fontSize:"0.875rem",fontWeight:600,color:"var(--text-primary)",
          whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis",margin:0}}>
          {product.urunAdi}</p>
        <p style={{fontSize:"0.75rem",color:"var(--text-muted)",margin:"2px 0 0",display:"flex",alignItems:"center",gap:6}}>
          {product.marka} · {product.cinsiyet} · {product.altKat}
          {product.label==="bestseller"&&<span style={{fontSize:"0.7rem",fontWeight:800,color:"#fff",background:"#16a34a",padding:"2px 7px",borderRadius:4}}>BS</span>}
          {product.label==="worstseller"&&<span style={{fontSize:"0.7rem",fontWeight:800,color:"#fff",background:"#dc2626",padding:"2px 7px",borderRadius:4}}>WS</span>}
        </p>
      </div>

      {/* Metrikler — hepsi sabit sırada */}
      <div style={{display:"flex",gap:6,alignItems:"center",flexShrink:0}}>
        {rowMetrics.map(({label,val,color,badge,has})=>(
          <div key={label} style={{
            background:"var(--bg-surface-2)",borderRadius:6,
            padding:"5px 10px",display:"flex",flexDirection:"column",
            alignItems:"center",gap:1,minWidth:60,
            opacity: has ? 1 : 0.4,
          }}>
            <span style={{fontSize:"0.6rem",textTransform:"uppercase",letterSpacing:"0.06em",
              color:"var(--text-muted)",fontWeight:500}}>{label}</span>
            <span style={{fontSize:"0.8125rem",fontWeight:600,
              color:color??"var(--text-primary)",fontFamily:"'Plus Jakarta Sans',sans-serif"}}>
              {val ?? "—"}
            </span>
            {badge&&<span style={{fontSize:"0.6rem",fontWeight:700,color:color}}>{badge}</span>}
          </div>
        ))}
      </div>
    </div>
  );
}

function ReportCard({ product, rank, type }) {
  const isBest = type==="bestseller"; // all için sort yonu Ciro desc

  // Her kart için SABİT 7 metrik — değer yoksa "—" göster, hiç atlanmaz
  const metrics = [
    { label:"PSF",       val: product.psf       ? fmtTL(product.psf)       : null },
    { label:"MU",        val: product.mu        ? fmtDec(product.mu)       : null },
    { label:"Alis Fiyat",val: product.alisFiyat ? fmtTL(product.alisFiyat) : null },
    { label:"Ciro",      val: fmtTL(product.ciro),  color: null },
    { label:"Kar %",     val: fmtPct(product.karMarji),
      color: product.karMarji>40?"#16a34a":product.karMarji>30?"#ca8a04":"#dc2626" },
    { label:"GMROI",     val: fmtDec(product.gmroi),
      color: (product.gmroi||0)>=20?"#16a34a":(product.gmroi||0)>=10?"#2563eb":"#ca8a04" },
    { label:"Cover",     val: product.cover ? product.cover+"h" : "—",
      color: (product.cover||999)<=8?"#16a34a":(product.cover||999)<=12?"#ca8a04":"#dc2626" },
  ];

  return (
    <div style={{
      background:"var(--bg-surface)", border:"1px solid var(--border-subtle)",
      borderRadius:10, overflow:"hidden", display:"flex", flexDirection:"column",
      breakInside:"avoid", pageBreakInside:"avoid",
    }}>
      {/* Sira + marka + cinsiyet */}
      <div style={{
        background:isBest?"rgba(22,163,74,0.08)":"rgba(220,38,38,0.08)",
        padding:"5px 10px", display:"flex", alignItems:"center", gap:6,
        borderBottom:"1px solid var(--border-subtle)",
      }}>
        <span style={{fontFamily:"'Plus Jakarta Sans',sans-serif",fontWeight:800,
          fontSize:"0.8rem",color:isBest?"#16a34a":"#dc2626",flexShrink:0}}>#{rank}</span>
        <span style={{fontSize:"0.65rem",color:"var(--text-muted)",flex:1,
          whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis",fontWeight:600}}>
          {product.marka}
        </span>
        <span style={{fontSize:"0.58rem",color:"var(--text-muted)",
          background:"var(--bg-surface-2)",padding:"1px 5px",borderRadius:3,flexShrink:0}}>
          {product.cinsiyet}
        </span>
      </div>

      {/* Gorsel — sabit yukseklik */}
      <div style={{height:120,background:"#f8f8f6",display:"flex",alignItems:"center",
        justifyContent:"center",overflow:"hidden",flexShrink:0}}>
        <img src={"/images/"+product.stokKodu+".jpg"} alt={product.urunAdi}
          style={{width:"100%",height:"100%",objectFit:"contain",padding:8,
            mixBlendMode:"multiply",filter:"contrast(1.1) brightness(1.05)"}}
          onError={e=>{
            if(!e.target.dataset.tried){
              e.target.dataset.tried="1";
              if(product.gorsel){
                e.target.src=product.gorsel
                  .replace("sporthink.mncdn.com","sporthink.sm.mncdn.com")
                  .replace("/mnresize/150/","/mnresize/400/");
                return;
              }
            }
            e.target.style.display="none";
          }}/>
      </div>

      {/* Urun adi + kod — her zaman 2 satir yuksekliginde */}
      <div style={{padding:"6px 8px",borderBottom:"1px solid var(--border-subtle)",height:40,overflow:"hidden"}}>
        <p style={{fontFamily:"'Plus Jakarta Sans',sans-serif",fontWeight:700,
          fontSize:"0.65rem",color:"var(--text-primary)",margin:0,lineHeight:1.3,
          display:"-webkit-box",WebkitLineClamp:2,WebkitBoxOrient:"vertical",overflow:"hidden"}}>
          {product.urunAdi}
        </p>
        <p style={{fontSize:"0.55rem",color:"var(--text-muted)",margin:"2px 0 0",fontFamily:"monospace"}}>
          {product.stokKodu}
        </p>
      </div>

      {/* 7 metrik — 3 sütun × 3 satır (son hücre boş), hepsi daima gösterilir */}
      <div style={{
        padding:"5px 6px",
        display:"grid", gridTemplateColumns:"1fr 1fr 1fr",
        gridTemplateRows:"auto auto auto", gap:3,
      }}>
        {metrics.map(({label, val, color})=>{
          const isEmpty = val===null || val==="—" || val==="--";
          return (
            <div key={label} style={{
              background:"var(--bg-surface-2)",
              borderRadius:4, padding:"3px 5px",
              opacity: isEmpty ? 0.45 : 1,
            }}>
              <p style={{fontSize:"0.5rem",textTransform:"uppercase",letterSpacing:"0.04em",
                color:"var(--text-muted)",margin:0,fontWeight:600,lineHeight:1.2}}>
                {label}
              </p>
              <p style={{
                fontFamily:"'Plus Jakarta Sans',sans-serif",fontWeight:700,fontSize:"0.65rem",
                color: isEmpty ? "var(--text-muted)" : (color??"var(--text-primary)"),
                margin:"1px 0 0",lineHeight:1.2,
              }}>
                {isEmpty ? "—" : val}
              </p>
            </div>
          );
        })}
        {/* 8. hucre bos — grid 3x3 = 9, 7 metrik + 1 bos + 1 bos */}
        <div/>
      </div>
    </div>
  );
}

function ReportView({ products, type, filters, onClose }) {
  const title = type==="bestseller"?"Bestseller":"Worstseller";
  const subtitle = [
    filters.cinsiyet!=="Tumu"?filters.cinsiyet:null,
    filters.anaGrup !=="Tumu"?filters.anaGrup :null,
    filters.altKat  !=="Tumu"?filters.altKat  :null,
  ].filter(Boolean).join(" - ")||"Tum Kategoriler";
  const now = new Date().toLocaleDateString("tr-TR",{day:"2-digit",month:"long",year:"numeric"});
  return (
    <div style={{position:"fixed",inset:0,zIndex:1000,background:"var(--bg-page)",
      overflowY:"auto",padding:"2rem"}}>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",
        marginBottom:"1.5rem",paddingBottom:"1rem",borderBottom:"2px solid var(--red)"}}>
        <div>
          <h2 style={{fontFamily:"'Plus Jakarta Sans',sans-serif",fontWeight:800,
            fontSize:"1.25rem",color:"var(--text-primary)",margin:0}}>
            {title} Raporu - Ilk 10</h2>
          <p style={{fontSize:"0.8125rem",color:"var(--text-muted)",margin:"4px 0 0"}}>
            {subtitle} - {now}</p>
        </div>
        <div style={{display:"flex",gap:10}}>
          <button onClick={()=>window.print()} style={{background:"var(--red)",color:"#fff",
            border:"none",borderRadius:8,padding:"8px 18px",fontFamily:"inherit",
            fontWeight:600,fontSize:"0.875rem",cursor:"pointer"}}>
            Yazdir / PDF</button>
          <button onClick={onClose} style={{background:"var(--bg-surface)",
            color:"var(--text-primary)",border:"1px solid var(--border-subtle)",borderRadius:8,
            padding:"8px 18px",fontFamily:"inherit",fontWeight:600,
            fontSize:"0.875rem",cursor:"pointer"}}>Kapat</button>
        </div>
      </div>
      <div style={{display:"flex",flexDirection:"column",gap:14}}>
        {/* Ilk 5 kart — 1. sayfa */}
        <div style={{display:"grid",gridTemplateColumns:"repeat(5,1fr)",gap:12,
          pageBreakAfter:"always",breakAfter:"page"}}>
          {products.slice(0,5).map((p,i)=>(
            <ReportCard key={p.stokKodu+i} product={p} rank={i+1} type={type}/>
          ))}
        </div>
        {/* Son 5 kart — 2. sayfa */}
        <div style={{display:"grid",gridTemplateColumns:"repeat(5,1fr)",gap:12,
          pageBreakBefore:"always",breakBefore:"page"}}>
          {products.slice(5,10).map((p,i)=>(
            <ReportCard key={p.stokKodu+(i+5)} product={p} rank={i+6} type={type}/>
          ))}
        </div>
      </div>
      <style>{`
        @media print {
          button { display: none !important; }
          @page { size: A4 landscape; margin: 0.7cm; }
          body { background: white !important; }
          [data-theme="dark"] {
            --bg-page:#fff; --bg-surface:#fff; --bg-surface-2:#f5f5f5;
            --text-primary:#111; --text-secondary:#444; --text-muted:#888;
            --border-subtle:#e5e5e5;
          }
        }
      `}</style>
    </div>
  );
}

function FilterBar({ filters, setFilters, uniqueValues, type }) {
  return (
    <div style={{display:"flex",gap:10,flexWrap:"wrap",alignItems:"center",
      padding:"12px 16px",background:"var(--bg-surface)",
      borderBottom:"1px solid var(--border-subtle)"}}>
      {[
        {label:"Sezon",val:filters.sezon,opts:["Tumu","25F","25S"],
          onChange:v=>setFilters(f=>({...f,sezon:v,cinsiyet:"Tumu",anaGrup:"Tumu",altKat:"Tumu"}))},
        {label:"Cinsiyet",val:filters.cinsiyet,opts:["Tumu",...uniqueValues.cinsiyetler],
          onChange:v=>setFilters(f=>({...f,cinsiyet:v,anaGrup:"Tumu",altKat:"Tumu"}))},
        {label:"Ana Grup",val:filters.anaGrup,opts:["Tumu",...uniqueValues.anaGruplar],
          onChange:v=>setFilters(f=>({...f,anaGrup:v,altKat:"Tumu"}))},
        {label:"Kategori",val:filters.altKat,opts:["Tumu",...uniqueValues.altKatlar],
          onChange:v=>setFilters(f=>({...f,altKat:v}))},
        {label:"Sirala",val:filters.sortBy,opts:["Ciro","GMROI","Kar Marji","Cover","Sell Through"],
          onChange:v=>setFilters(f=>({...f,sortBy:v}))},
        {label:"Yon",val:filters.sortDir,opts:["Azalan","Artan"],
          onChange:v=>setFilters(f=>({...f,sortDir:v}))},

      ].map(({label,val,opts,onChange})=>(
        <div key={label} style={{display:"flex",alignItems:"center",gap:6}}>
          <span style={{fontSize:"0.75rem",color:"var(--text-muted)"}}>{label}:</span>
          <select value={val} onChange={e=>onChange(e.target.value)} style={{
            background:"var(--bg-surface-2)",border:"1px solid var(--border-subtle)",
            borderRadius:6,padding:"4px 8px",fontSize:"0.8125rem",
            color:"var(--text-primary)",cursor:"pointer",outline:"none",fontFamily:"inherit"}}>
            {opts.map(o=><option key={o} value={o}>{o}</option>)}
          </select>
        </div>
      ))}
      <label style={{display:"flex",alignItems:"center",gap:6,
        fontSize:"0.8125rem",color:"var(--text-secondary)",cursor:"pointer"}}>
        <input type="checkbox" checked={filters.showImages}
          onChange={e=>setFilters(f=>({...f,showImages:e.target.checked}))}
          style={{accentColor:"var(--red)"}}/> Gorsel Goster
      </label>
    </div>
  );
}

export function SalesPage({ etlData, type }) {
  const isBest = type==="bestseller"; // all için sort yonu Ciro desc
  const [filters, setFilters] = useState({
    sezon:"Tumu",cinsiyet:"Tumu",anaGrup:"Tumu",altKat:"Tumu",
    sortBy:"Ciro",sortDir:"Azalan",topN:10,showImages:true,
  });
  const [showReport, setShowReport] = useState(false);

  const uniqueValues = useMemo(()=>{
    if(!etlData?.length) return {cinsiyetler:[],anaGruplar:[],altKatlar:[]};
    const cinsiyetler=[...new Set(etlData.map(r=>F.cinsiyet(r)).filter(Boolean))].sort();
    const cinRows=filters.cinsiyet==="Tumu"?etlData:etlData.filter(r=>F.cinsiyet(r)===filters.cinsiyet);
    const anaGruplar=[...new Set(cinRows.map(r=>F.anaGrup(r)).filter(v=>v&&v!=="--"))].sort();
    const agRows=filters.anaGrup==="Tumu"?cinRows:cinRows.filter(r=>F.anaGrup(r)===filters.anaGrup);
    const altKatlar=[...new Set(agRows.map(r=>F.altKat(r)).filter(v=>v&&v!=="--"))].sort();
    return {cinsiyetler,anaGruplar,altKatlar};
  },[etlData,filters.sezon,filters.cinsiyet,filters.anaGrup]);

  const productsResult = useMemo(()=>{
    if(!etlData?.length) return [];
    let rows=etlData
      .filter(r=>F.satis(r)>0&&F.ciro(r)>0)
      .filter(r=>filters.sezon==="Tumu"||F.sezon(r)===filters.sezon)
      .map(r=>{
      const satis=F.satis(r);
      const etlCover=F.cover(r);
      const cover=etlCover>0?Math.round(etlCover*10)/10
        :satis>0?Math.round((F.dss(r)/(satis/HAFTA))*10)/10:null;
      const psfMu=getPsfMu(F.stokKodu(r));
      const p0 = {
        stokKodu:F.stokKodu(r),urunAdi:F.urunAdi(r),marka:F.marka(r),
        cinsiyet:F.cinsiyet(r),altKat:F.altKat(r),anaGrup:F.anaGrup(r),gorsel:F.gorsel(r),
        psf:psfMu?.psf??F.psf(r),regulePsf:psfMu?.regulePsf??null,
        mu:psfMu?.mu??F.mu(r),alisFiyat:psfMu?.alisFiyat??null,
        satis,ciro:F.ciro(r),brutKar:F.brutKar(r),karMarji:F.karMarji(r),
        sellThru:F.sellThru(r),cover,gmroi:F.gmroi(r)||null,
      };
      return {...p0, label:getLabel(p0)};

    });
    // Bestseller/Worstseller sekmelerinde sadece etiketli ürünler
    if(type==="bestseller") rows=rows.filter(r=>r.label==="bestseller");
    if(type==="worstseller") rows=rows.filter(r=>r.label==="worstseller");
    if(filters.cinsiyet!=="Tumu") rows=rows.filter(r=>r.cinsiyet===filters.cinsiyet);
    if(filters.anaGrup !=="Tumu") rows=rows.filter(r=>r.anaGrup ===filters.anaGrup);
    if(filters.altKat  !=="Tumu") rows=rows.filter(r=>r.altKat  ===filters.altKat);
    const sk={
      "Ciro":r=>r.ciro,"GMROI":r=>r.gmroi??-Infinity,
      "Kar Marji":r=>r.karMarji,"Cover":r=>r.cover??Infinity,"Sell Through":r=>r.sellThru??-Infinity,
    }[filters.sortBy]??(r=>r.ciro);
    // bestseller: daima büyükten küçüğe (Cover hariç küçükten büyüğe)
    const asc = filters.sortDir === "Artan";
    rows.sort((a,b)=>{ const diff=sk(a)-sk(b); return asc?diff:-diff; });
    const allFiltered = rows;
    return { allFiltered, paged: type==="all" ? rows : rows.slice(0,filters.topN) };
  },[etlData,filters,isBest,type]);

  const products    = productsResult?.paged       ?? [];
  const allFiltered = productsResult?.allFiltered ?? [];

  const summary = useMemo(()=>{
    if(!allFiltered.length) return null;
    return {
      toplamCiro: allFiltered.reduce((s,r)=>s+r.ciro,0),
      toplamSatis:allFiltered.reduce((s,r)=>s+r.satis,0),
      ortKar:     allFiltered.reduce((s,r)=>s+r.karMarji,0)/allFiltered.length,
      ortGMROI:   allFiltered.filter(r=>r.gmroi!=null).reduce((s,r)=>s+(r.gmroi||0),0)/
                  (allFiltered.filter(r=>r.gmroi!=null).length||1),
    };
  },[products]);

  if(showReport) return <ReportView products={products} type={type}
    filters={filters} onClose={()=>setShowReport(false)}/>;

  if(!etlData?.length) return (
    <div style={{display:"flex",alignItems:"center",justifyContent:"center",
      minHeight:300,color:"var(--text-muted)",fontSize:"0.9rem"}}>
      Veri bulunamadi. Once ERP dosyasi yukleyin.</div>
  );

  return (
    <div style={{display:"flex",flexDirection:"column",flex:1}}>
      <div style={{padding:"1.75rem 2rem 0",display:"flex",
        justifyContent:"space-between",alignItems:"flex-start"}}>
        <div>
          <h2 style={{fontFamily:"'Plus Jakarta Sans',sans-serif",fontSize:"1.375rem",
            fontWeight:700,letterSpacing:"-0.025em",color:"var(--text-primary)",margin:0}}>
            {type==="all"?"Tum Urunler":isBest?"Bestseller":"Worstseller"} Analizi</h2>
          <p style={{fontSize:"0.8125rem",color:"var(--text-muted)",marginTop:4}}>
            {type==="all"?"Tum filtrelenebilir urun listesi":isBest?"En yuksek":"En dusuk"} performansli urunler - {HAFTA} haftalik sezon</p>
        </div>
        <button onClick={()=>setShowReport(true)} style={{display:type==="all"?"none":"flex",
          background:"var(--red)",color:"#fff",border:"none",borderRadius:8,
          padding:"8px 16px",marginTop:"1.75rem",fontFamily:"inherit",
          fontWeight:600,fontSize:"0.8125rem",cursor:"pointer"}}>
          Ilk 10 Raporu
        </button>
      </div>

      {summary&&(
        <div style={{display:"flex",gap:12,padding:"1rem 2rem 0",flexWrap:"wrap"}}>
          {[
            {label:"Toplam Ciro",  value:fmtTL(summary.toplamCiro)},
            {label:"Toplam Satis", value:fmtNum(summary.toplamSatis)},
            {label:"Ort.Kar Marji",value:fmtPct(summary.ortKar)},
            {label:"Ort.GMROI",    value:fmtDec(summary.ortGMROI)},
            {label:"Urun Sayisi",  value:fmtNum(allFiltered.length)},
          ].map(k=>(
            <div key={k.label} style={{background:"var(--bg-surface)",
              border:"1px solid var(--border-subtle)",borderRadius:10,
              padding:"10px 16px",minWidth:120}}>
              <p style={{fontSize:"0.7rem",textTransform:"uppercase",letterSpacing:"0.06em",
                color:"var(--text-muted)",margin:0,fontWeight:500}}>{k.label}</p>
              <p style={{fontFamily:"'Plus Jakarta Sans',sans-serif",fontSize:"1.1rem",
                fontWeight:700,color:"var(--text-primary)",margin:"3px 0 0"}}>{k.value}</p>
            </div>
          ))}
        </div>
      )}

      <div style={{margin:"1rem 2rem 0"}}>
        <FilterBar filters={filters} setFilters={setFilters} uniqueValues={uniqueValues} type={type}/>
      </div>

      <div style={{margin:"0 2rem 2rem",background:"var(--bg-surface)",
        border:"1px solid var(--border-subtle)",borderRadius:12,overflow:"hidden"}}>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",
          padding:"12px 16px",borderBottom:"1px solid var(--border-subtle)",
          background:"var(--bg-surface-2)"}}>
          <span style={{fontSize:"0.8125rem",fontWeight:600,color:"var(--text-primary)"}}>
            {products.length} urun
            {filters.cinsiyet!=="Tumu"?` - ${filters.cinsiyet}`:""}
            {filters.anaGrup !=="Tumu"?` - ${filters.anaGrup}` :""}
          </span>
          <span style={{fontSize:"0.75rem",color:"var(--text-muted)"}}>
            {filters.sortBy} bazli sirali</span>
        </div>
        {products.length===0
          ?<div style={{textAlign:"center",padding:"2rem",color:"var(--text-muted)",
              fontSize:"0.875rem"}}>Bu filtre kombinasyonu icin urun bulunamadi</div>
          :products.map((p,i)=>(
            <ProductRow key={p.stokKodu+i} rank={i+1} product={p}
              type={type} showImages={filters.showImages}/>
          ))}
      </div>
      <style>{`@keyframes spin{to{transform:rotate(360deg);}}`}</style>
    </div>
  );
}
