/**
 * Sporthink Dashboard - Node.js ETL Wrapper
 * ==========================================
 * Python ETL pipeline'ını Node.js tarafından çağırmak için kullanılır.
 * Express tabanlı bir API sunucusu olarak da çalışabilir.
 *
 * Kullanım:
 *   node etl_runner.js --erp ./ERP_Data.xlsx --master ./Master_Data.xlsx
 *   node etl_runner.js --server  (API modu: POST /api/etl)
 */

const { execFile } = require("child_process");
const path  = require("path");
const fs    = require("fs");

// ──────────────────────────────────────────────────
// 1. TEMEL ÇALIŞTIRICI
// ──────────────────────────────────────────────────

/**
 * Python ETL pipeline'ını çalıştırır.
 *
 * @param {Object} opts
 * @param {string} opts.erpPath    - ERP Excel dosyası tam yolu
 * @param {string} opts.masterPath - Master Data Excel dosyası tam yolu
 * @param {string} [opts.jsonOut]  - JSON çıktı yolu (varsayılan: ./sporthink_dashboard_data.json)
 * @param {string} [opts.excelOut] - Excel çıktı yolu
 * @param {boolean} [opts.summary] - Özet raporu stdout'a bas
 * @returns {Promise<{json: Object, excelPath: string, logs: string}>}
 */
function runETL(opts = {}) {
  return new Promise((resolve, reject) => {
    const {
      erpPath,
      masterPath,
      jsonOut  = path.join(__dirname, "sporthink_dashboard_data.json"),
      excelOut = path.join(__dirname, "sporthink_dashboard_data.xlsx"),
      summary  = false,
    } = opts;

    if (!erpPath || !masterPath) {
      return reject(new Error("erpPath ve masterPath zorunludur."));
    }

    const scriptPath = path.join(__dirname, "etl_pipeline.py");

    const args = [
      scriptPath,
      "--erp",    erpPath,
      "--master", masterPath,
      "--json",   jsonOut,
      "--excel",  excelOut,
    ];
    if (summary) args.push("--summary");

    console.log("[ETL Runner] Python pipeline başlatılıyor…");
    console.log("  ERP    :", erpPath);
    console.log("  Master :", masterPath);

    execFile("python", args, { maxBuffer: 10 * 1024 * 1024 }, (err, stdout, stderr) => {
      if (err) {
        console.error("[ETL Runner] HATA:", stderr || err.message);
        return reject(new Error(stderr || err.message));
      }

      console.log(stdout);

      // JSON çıktısını oku
      try {
        const raw  = fs.readFileSync(jsonOut, "utf-8");
        const data = JSON.parse(raw);
        resolve({ json: data, excelPath: excelOut, logs: stdout });
      } catch (parseErr) {
        reject(new Error("JSON parse hatası: " + parseErr.message));
      }
    });
  });
}

// ──────────────────────────────────────────────────
// 2. METRİK HESAPLAMA (JavaScript – opsiyonel)
//    Python tarafında zaten hesaplanır; bu fonksiyonlar
//    frontend validasyonu veya anlık hesap için kullanılabilir.
// ──────────────────────────────────────────────────

const HAFTA_CARPANI = 19;

const Metrics = {
  /**
   * Alış Fiyat = Alış Tutarı / Alış Miktarı
   */
  alisFiyat: (alisTutari, alisMiktari) =>
    alisMiktari !== 0 ? alisTutari / alisMiktari : null,

  /**
   * SMM = Satış Adedi × Alış Fiyat
   */
  smm: (satisAdedi, alisFiyat) => satisAdedi * alisFiyat,

  /**
   * Brüt Kar = Ciro − SMM
   */
  brutKar: (ciro, smm) => ciro - smm,

  /**
   * Kar Marjı % = (Brüt Kar / Ciro) × 100
   */
  karMarji: (brutKar, ciro) =>
    ciro !== 0 ? (brutKar / ciro) * 100 : null,

  /**
   * MU = PSF / Alış Fiyat
   */
  mu: (psf, alisFiyat) =>
    alisFiyat !== 0 ? psf / alisFiyat : null,

  /**
   * GMROI = (Brüt Kar / SMM) × 19
   * ⚠️  19 çarpanı belgedeki sabit → değiştirme
   */
  gmroi: (brutKar, smm) =>
    smm !== 0 ? (brutKar / smm) * HAFTA_CARPANI : null,

  /**
   * Cover = (Ortalama Stok / Satış Adedi) × 19
   * ⚠️  19 çarpanı belgedeki sabit → değiştirme
   */
  cover: (ortalamaStok, satisAdedi) =>
    satisAdedi !== 0 ? (ortalamaStok / satisAdedi) * HAFTA_CARPANI : null,

  /**
   * Sell Through % = Satış Adedi / (DBS + Alış Miktarı) × 100
   */
  sellThrough: (satisAdedi, dbs, alisMiktari) => {
    const toplam = dbs + alisMiktari;
    return toplam !== 0 ? (satisAdedi / toplam) * 100 : null;
  },

  /**
   * Ortalama Stok = (DBS + DSS) / 2
   */
  ortalamaStok: (dbs, dss) => (dbs + dss) / 2,

  /**
   * Tek satır için tüm metrikleri hesaplar.
   * @param {Object} row - Pipeline çıktısındaki bir kayıt
   */
  computeAll(row) {
    const af  = row["Alış Fiyat"] ?? this.alisFiyat(row["Alış Tutarı"], row["Alış Miktarı"]);
    const os  = row["Ortalama Stok"] ?? this.ortalamaStok(row["DBS Miktar"], row["DSS Miktar"]);
    const smm = this.smm(row["Satış Adedi"], af);
    const bk  = this.brutKar(row["Ciro"], smm);

    return {
      ...row,
      "Alış Fiyat":     af,
      "Ortalama Stok":  os,
      "SMM":            smm,
      "Brüt Kar":       bk,
      "Kar Marjı %":    this.karMarji(bk, row["Ciro"]),
      "MU":             this.mu(row["PSF"], af),
      "GMROI":          this.gmroi(bk, smm),
      "Cover":          this.cover(os, row["Satış Adedi"]),
      "Sell Through %": this.sellThrough(row["Satış Adedi"], row["DBS Miktar"], row["Alış Miktarı"]),
    };
  },
};

// ──────────────────────────────────────────────────
// 3. BESTSELLER / WORSTSELLER FİLTRELEME
// ──────────────────────────────────────────────────

/**
 * Dashboard için Bestseller ve Worstseller listelerini üretir.
 *
 * @param {Array}  data  - ETL JSON çıktısındaki "data" dizisi
 * @param {Object} opts
 * @param {string} [opts.sortBy="Ciro"]   - Sıralama metriği
 * @param {number} [opts.topN=20]         - Kaç ürün gösterilsin
 * @param {Object} [opts.filter]          - Ek filtreler { "Marka Açıklama": "adidas", ... }
 * @returns {{ bestsellers: Array, worstsellers: Array, total: number }}
 */
function buildRankings(data, opts = {}) {
  const { sortBy = "Ciro", topN = 20, filter = {} } = opts;

  // Filtre uygula
  let filtered = data.filter((row) => {
    return Object.entries(filter).every(([key, val]) => {
      if (val === null || val === undefined) return true;
      return String(row[key] ?? "").toLowerCase().includes(String(val).toLowerCase());
    });
  });

  // Sıfır ve null satışları hariç tut (Worstseller için anlamlı olmayan sıfırlar)
  const active = filtered.filter((r) => r["Satış Adedi"] > 0 && r["Ciro"] > 0);

  const sorted = [...active].sort((a, b) => (b[sortBy] ?? 0) - (a[sortBy] ?? 0));

  return {
    bestsellers:  sorted.slice(0, topN),
    worstsellers: sorted.slice(-topN).reverse(),
    total:        active.length,
    sortBy,
  };
}

// ──────────────────────────────────────────────────
// 4. EXPRESS API (opsiyonel – --server flag ile)
// ──────────────────────────────────────────────────

function startServer(port = 3001) {
  let express;
  let multer;
  try {
    express = require("express");
    multer  = require("multer");
  } catch {
    console.error(
      "Express veya Multer bulunamadı.\n" +
      "Lütfen çalıştırın: npm install express multer"
    );
    process.exit(1);
  }

  const app     = express();
  const upload  = multer({ dest: "/tmp/sporthink_uploads/" });

  app.use(express.json());

  /**
   * POST /api/etl
   * Form-data: erp (file), master (file)
   * Query: sortBy, topN, summary
   */
  app.post(
    "/api/etl",
    upload.fields([
      { name: "erp",    maxCount: 1 },
      { name: "master", maxCount: 1 },
    ]),
    async (req, res) => {
      try {
        const erpFile    = req.files?.["erp"]?.[0];
        const masterFile = req.files?.["master"]?.[0];

        if (!erpFile || !masterFile) {
          return res.status(400).json({ error: "erp ve master dosyaları zorunludur." });
        }

        const jsonOut  = `/tmp/sporthink_${Date.now()}.json`;
        const excelOut = `/tmp/sporthink_${Date.now()}.xlsx`;

        const result = await runETL({
          erpPath:    erpFile.path,
          masterPath: masterFile.path,
          jsonOut,
          excelOut,
          summary: req.query.summary === "true",
        });

        // Sıralama oluştur
        const sortBy = req.query.sortBy || "Ciro";
        const topN   = parseInt(req.query.topN || "20", 10);
        const rankings = buildRankings(result.json.data, { sortBy, topN });

        res.json({
          meta:         result.json.meta,
          rankings,
          data:         result.json.data,   // tüm veri
        });

      } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
      }
    }
  );

  /**
   * GET /api/health
   */
  app.get("/api/health", (_req, res) =>
    res.json({ status: "ok", version: "1.0.0" })
  );

  app.listen(port, () => {
    console.log(`\n[API] Sporthink ETL Server → http://localhost:${port}`);
    console.log(`  POST /api/etl     (form-data: erp, master)`);
    console.log(`  GET  /api/health\n`);
  });
}

// ──────────────────────────────────────────────────
// 5. CLI ENTRY POINT
// ──────────────────────────────────────────────────

if (require.main === module) {
  const args = process.argv.slice(2);

  if (args.includes("--server")) {
    const portIdx = args.indexOf("--port");
    const port    = portIdx !== -1 ? parseInt(args[portIdx + 1], 10) : 3001;
    startServer(port);

  } else {
    // Doğrudan CLI kullanımı
    const get = (flag) => {
      const i = args.indexOf(flag);
      return i !== -1 ? args[i + 1] : null;
    };

    const erpPath    = get("--erp");
    const masterPath = get("--master");
    const jsonOut    = get("--json");
    const excelOut   = get("--excel");
    const summary    = args.includes("--summary");

    if (!erpPath || !masterPath) {
      console.error("Kullanım: node etl_runner.js --erp <dosya> --master <dosya> [--summary]");
      process.exit(1);
    }

    runETL({ erpPath, masterPath, jsonOut, excelOut, summary })
      .then(({ json }) => {
        const { bestsellers, worstsellers } = buildRankings(json.data);
        console.log(`\nTop 5 Bestseller (Ciro):`);
        bestsellers.slice(0, 5).forEach((r, i) =>
          console.log(`  ${i+1}. ${r["Stok Kodu"]}  ${r["Stok Kodu Açıklama"]}  →  Ciro: ${r["Ciro"]?.toLocaleString("tr-TR")} TL`)
        );
        console.log(`\nTop 5 Worstseller (Ciro):`);
        worstsellers.slice(0, 5).forEach((r, i) =>
          console.log(`  ${i+1}. ${r["Stok Kodu"]}  ${r["Stok Kodu Açıklama"]}  →  Ciro: ${r["Ciro"]?.toLocaleString("tr-TR")} TL`)
        );
      })
      .catch((err) => {
        console.error("HATA:", err.message);
        process.exit(1);
      });
  }
}

module.exports = { runETL, buildRankings, Metrics };
