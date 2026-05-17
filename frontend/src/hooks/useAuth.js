import { useState, useCallback } from "react";

const TOKEN_KEY = "sporthink_token";
const USER_KEY  = "sporthink_user";

// Token'ı sessionStorage'dan oku (sayfa kapatılınca silinir)
function getStoredToken() {
  try { return sessionStorage.getItem(TOKEN_KEY); }
  catch { return null; }
}
function getStoredUser() {
  try {
    const s = sessionStorage.getItem(USER_KEY);
    return s ? JSON.parse(s) : null;
  } catch { return null; }
}

export function useAuth() {
  const [user,    setUser]    = useState(getStoredUser);
  const [token,   setToken]   = useState(getStoredToken);
  const [error,   setError]   = useState("");
  const [loading, setLoading] = useState(false);

  const login = useCallback(async (username, password) => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/auth/login", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ username, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Giris basarisiz.");
        setLoading(false);
        return false;
      }
      sessionStorage.setItem(TOKEN_KEY, data.token);
      sessionStorage.setItem(USER_KEY,  JSON.stringify(data.user));
      setToken(data.token);
      setUser(data.user);
      setLoading(false);
      return true;
    } catch (err) {
      setError("Sunucuya ulasilamadi. Lutfen tekrar deneyin.");
      setLoading(false);
      return false;
    }
  }, []);

  const logout = useCallback(() => {
    sessionStorage.removeItem(TOKEN_KEY);
    sessionStorage.removeItem(USER_KEY);
    setToken(null);
    setUser(null);
  }, []);

  // Token'lı fetch yardımcısı — tüm API çağrılarında kullan
  const authFetch = useCallback((url, options = {}) => {
    const t = getStoredToken();
    return fetch(url, {
      ...options,
      headers: {
        ...options.headers,
        ...(t ? { Authorization: `Bearer ${t}` } : {}),
      },
    });
  }, []);

  return { user, token, login, logout, authFetch, error, loading, isAuthenticated: !!user && !!token };
}
