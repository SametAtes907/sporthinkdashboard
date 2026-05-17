/**
 * Sporthink Dashboard -- Express Backend API
 * JWT korumalı, .env tabanlı kimlik dogrulama
 */

require("dotenv").config();

const express    = require("express");
const multer     = require("multer");
const cors       = require("cors");
const helmet     = require("helmet");
const morgan     = require("morgan");
const jwt        = require("jsonwebtoken");
const path       = require("path");
const fs         = require("fs");
const { execFile } = require("child_process");
const crypto     = require("crypto");

const app  = express();
const PORT = process.env.PORT || 3001;

const MASTER_DATA_PATH = process.env.MASTER_DATA_PATH ||
  path.join(__dirname, "..", "data", "Ornek_Duzenli_Data.xlsx");
const ETL_SCRIPT_PATH  = path.join(__dirname, "..", "etl", "etl_pipeline.py");
const UPLOAD_TMP_DIR   = path.join(__dirname, "tmp_uploads");
const OUTPUT_DIR       = path.join(__dirname, "etl_outputs");
const PYTHON_CMD       = process.env.PYTHON_CMD || (
  process.platform === "win32" ? "C:\\Python314\\python.exe" : "python3"
);
const JWT_SECRET     = process.env.JWT_SECRET;
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "8h";

// Kritik degerleri kontrol et
if (!JWT_SECRET || JWT_SECRET.length < 16) {
  console.error("[HATA] JWT_SECRET .env icinde en az 16 karakter olmali!");
  process.exit(1);
}
if (!process.env.ADMIN_USERNAME || !process.env.ADMIN_PASSWORD) {
  console.error("[HATA] ADMIN_USERNAME ve ADMIN_PASSWORD .env icinde tanimli olmali!");
  process.exit(1);
}

const ADMIN_USER = {
  username: process.env.ADMIN_USERNAME,
  password: process.env.ADMIN_PASSWORD,
  name:     process.env.ADMIN_NAME || "Admin",
  role:     "admin",
};

[UPLOAD_TMP_DIR, OUTPUT_DIR].forEach(d => {
  if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true });
});

// ── MIDDLEWARE ───────────────────────────────────────────────
app.use(cors({ origin: process.env.ALLOWED_ORIGIN || "http://localhost:5173" }));
app.use(helmet({ contentSecurityPolicy: false }));
app.use(morgan("dev"));
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true }));

const publicDir = path.join(__dirname, "public");
if (fs.existsSync(publicDir)) app.use(express.static(publicDir));

// ── JWT MIDDLEWARE ───────────────────────────────────────────
function requireAuth(req, res, next) {
  const authHeader = req.headers["authorization"];
  if (!authHeader?.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Yetkisiz erisim. Token gerekli." });
  }
  try {
    req.user = jwt.verify(authHeader.slice(7), JWT_SECRET);
    next();
  } catch (err) {
    const msg = err.name === "TokenExpiredError"
      ? "Oturum suresi doldu. Lutfen tekrar giris yapin."
      : "Gecersiz token.";
    res.status(401).json({ error: msg });
  }
}

// ── MULTER ───────────────────────────────────────────────────
const upload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, UPLOAD_TMP_DIR),
    filename:    (_req, file, cb) => {
      const ext = path.extname(file.originalname).toLowerCase();
      cb(null, `erp_${crypto.randomUUID().replace(/-/g,"").slice(0,12)}${ext}`);
    },
  }),
  fileFilter: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if ([".xlsx",".xls",".csv"].includes(ext)) return cb(null, true);
    cb(new multer.MulterError("LIMIT_UNEXPECTED_FILE", "Desteklenmeyen dosya turu"));
  },
  limits: { fileSize: 50 * 1024 * 1024 },
});

// ── ETL ──────────────────────────────────────────────────────
function runETLPipeline(erpPath, masterPath) {
  return new Promise((resolve, reject) => {
    const uid     = crypto.randomUUID().replace(/-/g,"").slice(0,10);
    const jsonOut = path.join(OUTPUT_DIR, `result_${uid}.json`);
    const excelOut= path.join(OUTPUT_DIR, `result_${uid}.xlsx`);

    execFile(PYTHON_CMD, [ETL_SCRIPT_PATH,"--erp",erpPath,"--master",masterPath,"--json",jsonOut,"--excel",excelOut],
      { timeout: 5*60*1000, maxBuffer: 20*1024*1024 },
      (err, stdout, stderr) => {
        fs.unlink(erpPath, () => {});
        if (err) return reject(new Error(stderr?.slice(0,500) || err.message));
        try { resolve(JSON.parse(fs.readFileSync(jsonOut,"utf-8"))); }
        catch(e) { reject(new Error("ETL JSON parse hatasi: "+e.message)); }
      }
    );
  });
}

// ── ROUTES ───────────────────────────────────────────────────

// Health (public)
app.get("/api/health", (_req, res) => {
  res.json({ status:"ok", timestamp: new Date().toISOString(),
    masterDataExists: fs.existsSync(MASTER_DATA_PATH) });
});

// Login (public)
app.post("/api/auth/login", (req, res) => {
  const { username, password } = req.body;
  if (!username || !password)
    return res.status(400).json({ error: "Kullanici adi ve sifre zorunludur." });

  // timingSafeEqual - sabit zamanda karsilastir
  let uMatch = false, pMatch = false;
  try {
    uMatch = crypto.timingSafeEqual(
      Buffer.from(username.trim().padEnd(64)),
      Buffer.from(ADMIN_USER.username.padEnd(64))
    );
    pMatch = crypto.timingSafeEqual(
      Buffer.from(password.padEnd(64)),
      Buffer.from(ADMIN_USER.password.padEnd(64))
    );
  } catch { /* boyut farki - eslesme yok */ }

  if (!uMatch || !pMatch)
    return res.status(401).json({ error: "Kullanici adi veya sifre hatali." });

  const payload = { username: ADMIN_USER.username, name: ADMIN_USER.name, role: ADMIN_USER.role };
  const token   = jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
  res.json({ user: payload, token, expiresIn: JWT_EXPIRES_IN });
});

// ETL (JWT gerekli)
app.post("/api/etl", requireAuth, upload.single("erp"), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: "ERP dosyasi zorunludur." });
  if (!fs.existsSync(MASTER_DATA_PATH)) {
    fs.unlink(req.file.path, () => {});
    return res.status(503).json({ error: `Master Data bulunamadi: ${MASTER_DATA_PATH}` });
  }
  try {
    console.log(`[ETL] ${req.file.originalname} - Kullanici: ${req.user.username}`);
    const result = await runETLPipeline(req.file.path, MASTER_DATA_PATH);
    res.json({ meta: result.meta, data: result.data });
  } catch (err) {
    if (req.file?.path) fs.unlink(req.file.path, () => {});
    res.status(500).json({ error: "ETL basarisiz: " + err.message });
  }
});

// Gorsel proxy (JWT gerekli)
app.get("/api/image", requireAuth, async (req, res) => {
  const { url } = req.query;
  if (!url) return res.status(400).json({ error: "url zorunludur" });

  let hostname;
  try { hostname = new URL(url).hostname; }
  catch { return res.status(400).json({ error: "Gecersiz URL" }); }

  const allowed = ["sporthink.mncdn.com","sporthink.com.tr","sporthink.sm.mncdn.com"];
  if (!allowed.some(d => hostname.endsWith(d)))
    return res.status(403).json({ error: "Bu CDN'ye erisim izni yok" });

  try {
    const client = url.startsWith("https") ? require("https") : require("http");
    const proxyReq = client.get(url, {
      headers: { "User-Agent":"Mozilla/5.0","Referer":"https://www.sporthink.com.tr/","Accept":"image/*" },
      timeout: 8000,
    }, proxyRes => {
      const ct = proxyRes.headers["content-type"] || "image/jpeg";
      if (!ct.startsWith("image/")) return res.status(400).json({ error: "Gorsel degil" });
      res.setHeader("Content-Type", ct);
      res.setHeader("Cache-Control", "public, max-age=86400");
      proxyRes.pipe(res);
    });
    proxyReq.on("error", e => res.status(502).json({ error: e.message }));
    proxyReq.on("timeout", () => { proxyReq.destroy(); res.status(504).json({ error: "Zaman asimi" }); });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── HATA YONETIMI ────────────────────────────────────────────
app.use((err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    return res.status(err.code==="LIMIT_FILE_SIZE" ? 413 : 400).json({ error: err.message });
  }
  next(err);
});
app.use((err, req, res, _next) => {
  console.error("[Server Error]", err);
  res.status(500).json({ error: "Sunucu hatasi: " + err.message });
});
if (fs.existsSync(publicDir)) {
  app.get("*", (_req, res) => res.sendFile(path.join(publicDir,"index.html")));
}

// ── BASLAT ───────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`\n${"=".repeat(50)}`);
  console.log(` Sporthink API  |  Port: ${PORT}`);
  console.log(` Admin: ${ADMIN_USER.username}  |  Token: ${JWT_EXPIRES_IN}`);
  console.log(` Korumalı: /api/etl  /api/image`);
  console.log(`${"=".repeat(50)}\n`);
});

module.exports = app;
