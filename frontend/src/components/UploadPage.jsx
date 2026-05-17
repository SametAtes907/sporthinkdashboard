import React, { useState, useRef, useCallback } from "react";
import { LOGO_BLK, LOGO_DISI } from "../assets/logos.js";
import { ThemeToggle } from "./ThemeToggle.jsx";
import { ExecutiveDashboard } from "./ExecutiveDashboard.jsx";
import { SalesPage } from "./SalesPage.jsx";
import { GlossaryPage } from "./GlossaryPage.jsx";
import "../dashboard.css";

const ACCEPTED_TYPES = [
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", // .xlsx
  "application/vnd.ms-excel",                                           // .xls
  "text/csv",                                                            // .csv
];
const ACCEPTED_EXT = [".xlsx", ".xls", ".csv"];
const MAX_SIZE_MB  = 50;

function formatBytes(bytes) {
  if (bytes < 1024)       return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function FileIcon({ ext }) {
  const color = ext === ".csv" ? "#16a34a" : "#1d4ed8";
  return (
    <svg width="32" height="40" viewBox="0 0 32 40" fill="none" aria-hidden="true">
      <rect width="32" height="40" rx="4" fill={color} fillOpacity="0.12" />
      <path d="M4 0h16l12 12v28a4 4 0 0 1-4 4H4a4 4 0 0 1-4-4V4a4 4 0 0 1 4-4z" fill={color} fillOpacity="0.15" />
      <path d="M20 0v12h12" fill="none" stroke={color} strokeOpacity="0.5" strokeWidth="1.5" />
      <text x="16" y="30" textAnchor="middle" fontSize="9" fontWeight="700" fill={color} fontFamily="system-ui">
        {ext.replace(".", "").toUpperCase()}
      </text>
    </svg>
  );
}

function ProgressBar({ percent }) {
  return (
    <div className="upload-progress-track" role="progressbar" aria-valuenow={percent} aria-valuemin={0} aria-valuemax={100}>
      <div className="upload-progress-fill" style={{ width: `${percent}%` }} />
    </div>
  );
}

export function UploadPage({ user, onLogout, onETLResult, authFetch, theme, onThemeToggle }) {
  const [dragOver,       setDragOver]       = useState(false);
  const [file,           setFile]           = useState(null);
  const [fileError,      setFileError]      = useState("");
  const [status,         setStatus]         = useState("idle"); // idle | uploading | success | error
  const [progress,       setProgress]       = useState(0);
  const [apiError,       setApiError]       = useState("");
  // ── Dashboard state ────────────────────────────────────
  const [dashboardData,  setDashboardData]  = useState(null); // ETL JSON verisi
  const [dashboardMeta,  setDashboardMeta]  = useState(null); // ETL meta bilgisi
  const [view,           setView]           = useState("upload"); // "upload" | "dashboard" | "bestseller" | "worstseller"
  const inputRef = useRef(null);

  const isDark = theme === "dark";

  // ── Validation ────────────────────────────────
  const validateFile = useCallback((f) => {
    const ext = "." + f.name.split(".").pop().toLowerCase();
    if (!ACCEPTED_EXT.includes(ext)) {
      return `Desteklenmeyen dosya türü. Kabul edilen: ${ACCEPTED_EXT.join(", ")}`;
    }
    if (f.size > MAX_SIZE_MB * 1024 * 1024) {
      return `Dosya boyutu ${MAX_SIZE_MB} MB limitini aşıyor (${formatBytes(f.size)})`;
    }
    return null;
  }, []);

  const pickFile = useCallback((f) => {
    const err = validateFile(f);
    if (err) {
      setFileError(err);
      setFile(null);
    } else {
      setFileError("");
      setFile(f);
      setStatus("idle");
      setApiError("");
    }
  }, [validateFile]);

  // ── Drag & Drop handlers ──────────────────────
  const onDragOver  = (e) => { e.preventDefault(); setDragOver(true);  };
  const onDragLeave = (e) => { e.preventDefault(); setDragOver(false); };
  const onDrop      = (e) => {
    e.preventDefault();
    setDragOver(false);
    const dropped = e.dataTransfer.files[0];
    if (dropped) pickFile(dropped);
  };
  const onFileInput = (e) => {
    const selected = e.target.files[0];
    if (selected) pickFile(selected);
    e.target.value = "";
  };

  // ── Upload & ETL ──────────────────────────────
  const handleUpload = async () => {
    if (!file || status === "uploading") return;

    setStatus("uploading");
    setProgress(0);
    setApiError("");

    const formData = new FormData();
    formData.append("erp", file);
    // Master data path is managed server-side; no need to re-upload
    formData.append("masterPath", "default"); // server uses its configured master path

    try {
      // Simulate progress during upload
      const progressInterval = setInterval(() => {
        setProgress((p) => (p < 85 ? p + Math.random() * 12 : p));
      }, 300);

      const fetchFn = authFetch || fetch;
      const res = await fetchFn("/api/etl", {
        method:  "POST",
        headers: { "X-Requested-With": "XMLHttpRequest" },
        body:    formData,
      });

      clearInterval(progressInterval);
      setProgress(100);

      if (!res.ok) {
        const body = await res.json().catch(() => ({ error: "Sunucu hatası" }));
        throw new Error(body.error || `HTTP ${res.status}`);
      }

      const result = await res.json();
      setStatus("success");

      // Bubble result up to parent (App)
      if (onETLResult) onETLResult(result);

      // ── Dashboard'a geç ─────────────────────────────────
      if (result?.data?.length) {
        setDashboardData(result.data);
        setDashboardMeta(result.meta ?? null);
        // Kısa bir gecikme ile dashboard'a geç (success animasyonunun görünmesi için)
        setTimeout(() => setView("dashboard"), 900);
      }

    } catch (err) {
      setStatus("error");
      setApiError(err.message || "Bilinmeyen bir hata oluştu.");
    }
  };

  const reset = () => {
    setFile(null);
    setFileError("");
    setStatus("idle");
    setProgress(0);
    setApiError("");
    setDashboardData(null);
    setDashboardMeta(null);
    setView("upload");
  };

  const fileExt = file ? "." + file.name.split(".").pop().toLowerCase() : null;

  // ── Bestseller / Worstseller görünümü ─────────────────────
  if (((view === "bestseller" || view === "worstseller" || view === "all" || view === "glossary") && dashboardData) || view === "glossary") {
    const salesType = view;
    return (
      <div className="upload-root">
        <aside className="upload-sidebar">
          <div className="upload-sidebar-logo">
            <div className="upload-logo-wrap"><img src={LOGO_BLK} alt="Sporthink" className="upload-logo" style={{ height: "32px" }} draggable={false} /></div>
          </div>
          <nav className="upload-nav" aria-label="Ana menü">
            <div className="upload-nav-item" onClick={() => setView("upload")} style={{ cursor: "pointer" }}>
              <NavSvg d="M16 16 12 12 8 16M12 12v9M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3" />
              <span>Veri Yükle</span>
            </div>
            <div className="upload-nav-item" onClick={() => setView("dashboard")} style={{ cursor: "pointer" }}>
              <NavSvg d="M18 20V10M12 20V4M6 20v-6" />
              <span>Dashboard</span>
            </div>
            <div className={`upload-nav-item${view === "bestseller" ? " upload-nav-item--active" : ""}`} onClick={() => setView("bestseller")} style={{ cursor: "pointer" }}>
              <NavSvg d="M23 6 13.5 15.5 8.5 10.5 1 18M17 6h6v6" />
              <span>Bestseller</span>
            </div>
            <div className={`upload-nav-item${view === "worstseller" ? " upload-nav-item--active" : ""}`} onClick={() => setView("worstseller")} style={{ cursor: "pointer" }}>
              <NavSvg d="M23 18 13.5 8.5 8.5 13.5 1 6M17 18h6v-6" />
              <span>Worstseller</span>
            </div>
            <div className={`upload-nav-item${view === "all" ? " upload-nav-item--active" : ""}`} onClick={() => setView("all")} style={{ cursor: "pointer" }}>
              <NavSvg d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              <span>Tum Urunler</span>
            </div>
          </nav>
            <div className={`upload-nav-item${view === "glossary" ? " upload-nav-item--active" : ""}`} onClick={() => setView("glossary")} style={{ cursor: "pointer", margin: "auto 0 0" }}>
              <NavSvg d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              <span>Kavramlar</span>
            </div>
          <div className="upload-sidebar-footer">
            <div className="upload-user-badge">
              <div className="upload-user-avatar">{user?.name?.charAt(0).toUpperCase() ?? "U"}</div>
              <div className="upload-user-info">
                <span className="upload-user-name">{user?.name ?? "Kullanici"}</span>
                <span className="upload-user-role">{user?.role ?? "--"}</span>
              </div>
            </div>
            <button onClick={onLogout} className="upload-logout-btn" title="Cikis Yap"><LogoutIcon /></button>
          </div>
        </aside>
        <div className="upload-main">
          <header className="upload-topbar" style={{ paddingBottom: "0.5rem" }}>
            <div />
            <div className="upload-topbar-actions">
              <ThemeToggle theme={theme} onToggle={onThemeToggle} />
            </div>
          </header>
{view === "glossary" ? <GlossaryPage /> : <SalesPage etlData={dashboardData} type={salesType} />}
        </div>
      </div>
    );
  }

  // ── Dashboard görünümü ──────────────────────────────────
  if (view === "dashboard" && dashboardData) {
    return (
      <div className="upload-root">
        <aside className="upload-sidebar">
          <div className="upload-sidebar-logo">
            <div className="upload-logo-wrap"><img src={LOGO_BLK} alt="Sporthink" className="upload-logo" style={{ height: "32px" }} draggable={false} /></div>
          </div>
          <nav className="upload-nav" aria-label="Ana menü">
            <div className="upload-nav-item" onClick={() => setView("upload")} style={{ cursor: "pointer" }}>
              <NavSvg d="M16 16 12 12 8 16M12 12v9M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3" />
              <span>Veri Yükle</span>
            </div>
            <div className={`upload-nav-item${view === "dashboard" ? " upload-nav-item--active" : ""}`}>
              <NavSvg d="M18 20V10M12 20V4M6 20v-6" />
              <span>Dashboard</span>
            </div>
            <div className={`upload-nav-item${view === "bestseller" ? " upload-nav-item--active" : ""}`} onClick={() => setView("bestseller")} style={{ cursor: "pointer" }}>
              <NavSvg d="M23 6 13.5 15.5 8.5 10.5 1 18M17 6h6v6" />
              <span>Bestseller</span>
            </div>
            <div className={`upload-nav-item${view === "worstseller" ? " upload-nav-item--active" : ""}`} onClick={() => setView("worstseller")} style={{ cursor: "pointer" }}>
              <NavSvg d="M23 18 13.5 8.5 8.5 13.5 1 6M17 18h6v-6" />
              <span>Worstseller</span>
            </div>
            <div className={`upload-nav-item${view === "all" ? " upload-nav-item--active" : ""}`} onClick={() => setView("all")} style={{ cursor: "pointer" }}>
              <NavSvg d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              <span>Tum Urunler</span>
            </div>
          </nav>
          <div className={`upload-nav-item${view === "glossary" ? " upload-nav-item--active" : ""}`} onClick={() => setView("glossary")} style={{ cursor: "pointer", margin: "auto 0 0" }}>
            <NavSvg d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            <span>Kavramlar</span>
          </div>
          <div className="upload-sidebar-footer">
            <div className="upload-user-badge">
              <div className="upload-user-avatar">{user?.name?.charAt(0).toUpperCase() ?? "U"}</div>
              <div className="upload-user-info">
                <span className="upload-user-name">{user?.name ?? "Kullanıcı"}</span>
                <span className="upload-user-role">{user?.role ?? "—"}</span>
              </div>
            </div>
            <button onClick={onLogout} className="upload-logout-btn" title="Çıkış Yap"><LogoutIcon /></button>
          </div>
        </aside>
        <div className="upload-main">
          <header className="upload-topbar" style={{ paddingBottom: "0.5rem" }}>
            <div />
            <div className="upload-topbar-actions">
              <ThemeToggle theme={theme} onToggle={onThemeToggle} />
            </div>
          </header>
          {view === "glossary" ? <GlossaryPage /> : (
            <ExecutiveDashboard
              etlData={dashboardData}
              meta={dashboardMeta}
              theme={theme}
              onNewUpload={reset}
            />
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="upload-root">
      {/* Sidebar */}
      <aside className="upload-sidebar">
        <div className="upload-sidebar-logo">
          <div className="upload-logo-wrap"><img
            src={LOGO_BLK}
            alt="Sporthink"
            className="upload-logo" style={{ height: "32px" }}
            draggable={false}
          /></div>
        </div>

        <nav className="upload-nav" aria-label="Ana menü">
          <NavItem icon="upload-cloud" label="Veri Yükle" active />
          <NavItem icon="bar-chart-2" label="Dashboard"  />
          <NavItem icon="trending-up" label="Bestseller" />
          <NavItem icon="trending-down" label="Worstseller" />
          <NavItem icon="book-open"   label="Kavramlar"  />
        </nav>

        <div className="upload-sidebar-footer">
          <div className="upload-user-badge">
            <div className="upload-user-avatar">
              {user?.name?.charAt(0).toUpperCase() ?? "U"}
            </div>
            <div className="upload-user-info">
              <span className="upload-user-name">{user?.name ?? "Kullanıcı"}</span>
              <span className="upload-user-role">{user?.role ?? "—"}</span>
            </div>
          </div>
          <button onClick={onLogout} className="upload-logout-btn" title="Çıkış Yap">
            <LogoutIcon />
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div className="upload-main">
        {/* Topbar */}
        <header className="upload-topbar">
          <div className="upload-topbar-left">
            <h2 className="upload-page-title">ERP Verisi Yükle</h2>
            <p className="upload-page-sub">
              Haftalık ERP raporunuzu yükleyerek analizi başlatın
            </p>
          </div>
          <div className="upload-topbar-actions">
            <ThemeToggle theme={theme} onToggle={onThemeToggle} />
          </div>
        </header>

        {/* Content */}
        <div className="upload-content">

          {/* Info cards */}
          <div className="upload-info-cards">
            <InfoCard icon="file-text"   title="Excel / CSV"     desc="xlsx, xls, csv formatları desteklenir" />
            <InfoCard icon="shield"      title="Güvenli Transfer" desc="Veriler şifreli iletilir" />
            <InfoCard icon="zap"         title="Anlık Analiz"    desc="Yükleme sonrası otomatik ETL" />
            <InfoCard icon="bar-chart-2" title="Hazır Rapor"     desc="Dashboard anında güncellenir" />
          </div>

          {/* Dropzone */}
          <div
            className={`upload-dropzone${dragOver ? " upload-dropzone--active" : ""}${fileError ? " upload-dropzone--err" : ""}${file ? " upload-dropzone--has-file" : ""}`}
            onDragOver={onDragOver}
            onDragLeave={onDragLeave}
            onDrop={onDrop}
            onClick={() => !file && inputRef.current?.click()}
            role="button"
            tabIndex={0}
            aria-label="Dosya yüklemek için tıklayın veya sürükleyip bırakın"
            onKeyDown={(e) => e.key === "Enter" && !file && inputRef.current?.click()}
          >
            <input
              ref={inputRef}
              type="file"
              accept={ACCEPTED_EXT.join(",")}
              onChange={onFileInput}
              className="upload-input-hidden"
              aria-hidden="true"
              tabIndex={-1}
            />

            {!file ? (
              <div className="upload-dropzone-empty">
                <div className={`upload-dropzone-icon${dragOver ? " upload-dropzone-icon--active" : ""}`}>
                  <UploadCloudIcon />
                </div>
                <p className="upload-dropzone-main">
                  {dragOver ? "Dosyayı bırakın" : "Dosyayı sürükleyip bırakın"}
                </p>
                <p className="upload-dropzone-hint">
                  veya <span className="upload-dropzone-link">dosya seçin</span>
                </p>
                <p className="upload-dropzone-types">
                  {ACCEPTED_EXT.join("  ·  ")} &nbsp;·&nbsp; Maks. {MAX_SIZE_MB} MB
                </p>
              </div>
            ) : (
              <div className="upload-file-preview" onClick={(e) => e.stopPropagation()}>
                <FileIcon ext={fileExt} />
                <div className="upload-file-info">
                  <p className="upload-file-name">{file.name}</p>
                  <p className="upload-file-size">{formatBytes(file.size)}</p>
                  {status === "uploading" && (
                    <ProgressBar percent={Math.round(progress)} />
                  )}
                  {status === "success" && (
                    <p className="upload-file-success">
                      <CheckIcon /> ETL başarıyla tamamlandı
                    </p>
                  )}
                  {status === "error" && (
                    <p className="upload-file-err-msg">{apiError}</p>
                  )}
                </div>
                <button
                  className="upload-file-remove"
                  onClick={reset}
                  aria-label="Dosyayı kaldır"
                  title="Kaldır"
                >
                  <XIcon />
                </button>
              </div>
            )}
          </div>

          {fileError && (
            <p className="upload-file-error" role="alert">{fileError}</p>
          )}

          {/* Action row */}
          <div className="upload-actions">
            <button
              className="upload-btn-secondary"
              onClick={reset}
              disabled={!file || status === "uploading"}
            >
              Temizle
            </button>
            <button
              className="upload-btn-primary"
              onClick={handleUpload}
              disabled={!file || status === "uploading" || status === "success"}
            >
              {status === "uploading" ? (
                <span className="upload-btn-loading">
                  <LoadingSpinner />
                  İşleniyor…
                </span>
              ) : status === "success" ? (
                <span><CheckIcon /> Tamamlandı</span>
              ) : (
                "ETL Analizini Başlat →"
              )}
            </button>
          </div>

          {/* Last upload info */}
          <div className="upload-last-info">
            <span className="upload-last-dot" />
            Sistem hazır — son yükleme: henüz yok
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Small sub-components ──────────────────────────────────────────────────────

function NavItem({ icon, label, active }) {
  return (
    <div className={`upload-nav-item${active ? " upload-nav-item--active" : ""}`}>
      <NavIcon name={icon} />
      <span>{label}</span>
    </div>
  );
}

function InfoCard({ icon, title, desc }) {
  return (
    <div className="upload-info-card">
      <div className="upload-info-card-icon">
        <NavIcon name={icon} />
      </div>
      <p className="upload-info-card-title">{title}</p>
      <p className="upload-info-card-desc">{desc}</p>
    </div>
  );
}

// ── Inline SVG icons ──────────────────────────────────────────────────────────

function NavIcon({ name }) {
  const icons = {
    "upload-cloud": (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="16 16 12 12 8 16" /><line x1="12" y1="12" x2="12" y2="21" />
        <path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3" />
      </svg>
    ),
    "bar-chart-2": (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="18" y1="20" x2="18" y2="10" /><line x1="12" y1="20" x2="12" y2="4" />
        <line x1="6" y1="20" x2="6" y2="14" />
      </svg>
    ),
    "trending-up": (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" /><polyline points="17 6 23 6 23 12" />
      </svg>
    ),
    "trending-down": (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="23 18 13.5 8.5 8.5 13.5 1 6" /><polyline points="17 18 23 18 23 12" />
      </svg>
    ),
    "book-open": (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" /><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
      </svg>
    ),
    "settings": (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="3" />
        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
      </svg>
    ),
    "file-text": (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" />
        <line x1="16" y1="17" x2="8" y2="17" /><polyline points="10 9 9 9 8 9" />
      </svg>
    ),
    "shield": (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      </svg>
    ),
    "zap": (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
      </svg>
    ),
  };
  return icons[name] ?? null;
}

function UploadCloudIcon() {
  return (
    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="16 16 12 12 8 16" /><line x1="12" y1="12" x2="12" y2="21" />
      <path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ display: "inline", verticalAlign: "-2px", marginRight: "4px" }}>
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

function XIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}

function NavSvg({ d }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      {d.split("M").filter(Boolean).map((seg, i) => (
        <path key={i} d={"M" + seg} />
      ))}
    </svg>
  );
}

function LogoutIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" />
    </svg>
  );
}

function LoadingSpinner() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" className="upload-spin" style={{ marginRight: "8px" }}>
      <line x1="12" y1="2" x2="12" y2="6" />
      <line x1="12" y1="18" x2="12" y2="22" />
      <line x1="4.93" y1="4.93" x2="7.76" y2="7.76" />
      <line x1="16.24" y1="16.24" x2="19.07" y2="19.07" />
      <line x1="2" y1="12" x2="6" y2="12" />
      <line x1="18" y1="12" x2="22" y2="12" />
      <line x1="4.93" y1="19.07" x2="7.76" y2="16.24" />
      <line x1="16.24" y1="7.76" x2="19.07" y2="4.93" />
    </svg>
  );
}
