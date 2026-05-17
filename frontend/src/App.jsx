import React from "react";
import { LoginPage }  from "./components/LoginPage.jsx";
import { UploadPage } from "./components/UploadPage.jsx";
import { useAuth }    from "./hooks/useAuth.js";
import { useTheme }   from "./hooks/useTheme.js";

export default function App() {
  const { user, login, logout, authFetch, error, loading, isAuthenticated } = useAuth();
  const { theme, toggle, isDark } = useTheme();

  const handleETLResult = (result) => {
    // TODO: Navigate to dashboard with result data
    console.log("ETL Result received:", result?.json?.meta);
  };

  if (!isAuthenticated) {
    return (
      <LoginPage
        onLogin={login}
        authError={error}
        authLoading={loading}
        theme={theme}
        onThemeToggle={toggle}
      />
    );
  }

  return (
    <UploadPage
      user={user}
      onLogout={logout}
      authFetch={authFetch}
      onETLResult={handleETLResult}
      theme={theme}
      onThemeToggle={toggle}
    />
  );
}
