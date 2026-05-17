import React, { useState } from "react";
import { LOGO_BLK, LOGO_DISI, LOGO_SIDEBAR, LOGO_PIN } from "../assets/logos.js";
import { ThemeToggle } from "./ThemeToggle.jsx";

export function LoginPage({ onLogin, authError, authLoading, theme, onThemeToggle }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [touched,  setTouched]  = useState({ username: false, password: false });

  const handleSubmit = (e) => {
    e.preventDefault();
    setTouched({ username: true, password: true });
    if (username.trim() && password) {
      onLogin(username, password);
    }
  };

  const isDark = theme === "dark";

  return (
    <div className="login-root">
      {/* Background geometric accent */}
      <div className="login-bg-accent" aria-hidden="true">
        <div className="login-bg-circle login-bg-circle--1" />
        <div className="login-bg-circle login-bg-circle--2" />
        <div className="login-bg-line login-bg-line--h" />
        <div className="login-bg-line login-bg-line--v" />
        {/* Pin ikonu scatter pattern */}
        {[
          { top: "4%",   left: "3%",   size: 64,  rot: -20 },
          { top: "14%",  right: "5%",  size: 80,  rot:  15 },
          { top: "32%",  left: "1%",   size: 56,  rot: -8  },
          { top: "50%",  right: "3%",  size: 70,  rot:  22 },
          { top: "68%",  left: "5%",   size: 60,  rot: -12 },
          { top: "82%",  right: "7%",  size: 50,  rot:  8  },
          { top: "8%",   left: "42%",  size: 46,  rot: -25 },
          { top: "60%",  left: "48%",  size: 52,  rot:  18 },
          { top: "86%",  left: "28%",  size: 58,  rot: -5  },
          { top: "25%",  left: "18%",  size: 44,  rot:  30 },
          { top: "75%",  left: "38%",  size: 48,  rot: -15 },
          { top: "42%",  left: "55%",  size: 38,  rot:  12 },
          { top: "18%",  left: "72%",  size: 54,  rot: -30 },
          { top: "55%",  left: "15%",  size: 42,  rot:  20 },
          { top: "92%",  left: "60%",  size: 46,  rot: -10 },
        ].map((p, i) => (
          <img
            key={i}
            src={LOGO_PIN}
            alt=""
            style={{
              position: "absolute",
              top: p.top,
              left: p.left,
              right: p.right,
              width: p.size,
              transform: `rotate(${p.rot}deg)`,
              opacity: isDark ? 0.55 : 0.20,
              mixBlendMode: isDark ? "screen" : "normal",
              pointerEvents: "none",
              userSelect: "none",
            }}
          />
        ))}
      </div>

      {/* Theme toggle — top right */}
      <div className="login-topbar">
        <ThemeToggle theme={theme} onToggle={onThemeToggle} />
      </div>

      {/* Card */}
      <main className="login-card" role="main">
        {/* Logo */}
        <div className="login-logo-wrap">
          <img
            src={isDark ? LOGO_DISI : LOGO_BLK}
            alt="Sporthink"
            className="login-logo"
            draggable={false}
          />
        </div>

        {/* Header */}
        <div className="login-header">
          <h1 className="login-title">Hoş Geldiniz</h1>
          <p className="login-subtitle">Dashboard'a erişmek için giriş yapın</p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="login-form" noValidate>
          {/* Error message */}
          {authError && (
            <div className="login-error" role="alert">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
              <span>{authError}</span>
            </div>
          )}

          {/* Username */}
          <div className="login-field">
            <label htmlFor="username" className="login-label">
              Kullanıcı Adı
            </label>
            <div className="login-input-wrap">
              <span className="login-input-icon" aria-hidden="true">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                  <circle cx="12" cy="7" r="4" />
                </svg>
              </span>
              <input
                id="username"
                type="text"
                className={`login-input${touched.username && !username.trim() ? " login-input--error" : ""}`}
                placeholder="kullanici_adi"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                onBlur={() => setTouched((t) => ({ ...t, username: true }))}
                autoComplete="username"
                autoCapitalize="none"
                spellCheck={false}
                disabled={authLoading}
                required
              />
            </div>
            {touched.username && !username.trim() && (
              <span className="login-field-err">Kullanıcı adı zorunludur</span>
            )}
          </div>

          {/* Password */}
          <div className="login-field">
            <label htmlFor="password" className="login-label">
              Şifre
            </label>
            <div className="login-input-wrap">
              <span className="login-input-icon" aria-hidden="true">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                  <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                </svg>
              </span>
              <input
                id="password"
                type={showPass ? "text" : "password"}
                className={`login-input login-input--pass${touched.password && !password ? " login-input--error" : ""}`}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onBlur={() => setTouched((t) => ({ ...t, password: true }))}
                autoComplete="current-password"
                disabled={authLoading}
                required
              />
              <button
                type="button"
                className="login-pass-toggle"
                onClick={() => setShowPass((v) => !v)}
                aria-label={showPass ? "Şifreyi gizle" : "Şifreyi göster"}
                tabIndex={-1}
              >
                {showPass ? (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
                    <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
                    <line x1="1" y1="1" x2="23" y2="23" />
                  </svg>
                ) : (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                )}
              </button>
            </div>
            {touched.password && !password && (
              <span className="login-field-err">Şifre zorunludur</span>
            )}
          </div>

          {/* Submit */}
          <button
            type="submit"
            className="login-submit"
            disabled={authLoading}
          >
            {authLoading ? (
              <span className="login-spinner-wrap">
                <span className="login-spinner" aria-hidden="true" />
                <span>Doğrulanıyor…</span>
              </span>
            ) : (
              <span>Giriş Yap</span>
            )}
          </button>
        </form>

        {/* Footer hint */}
        <p className="login-hint">

        </p>
      </main>

      {/* Brand tagline */}
      <footer className="login-footer">
        <span>Perakende Analitik Platformu</span>
        <span className="login-footer-dot" aria-hidden="true">·</span>
        <span>© 2025 Sporthink</span>
      </footer>
    </div>
  );
}
