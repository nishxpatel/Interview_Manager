import { useEffect, useMemo, useState } from "react";
import {
  getRedirectResult,
  onAuthStateChanged,
  signInWithPopup,
  signInWithRedirect,
  signOut
} from "firebase/auth";
import {
  BriefcaseBusiness,
  CalendarClock,
  FileUp,
  LayoutDashboard,
  LogIn,
  LogOut,
  Menu,
  Moon,
  Plus,
  ShieldCheck,
  Sun
} from "lucide-react";
import { Dashboard } from "./components/Dashboard";
import { HomePage } from "./components/HomePage";
import {
  firebaseProjectId,
  hasFirebaseConfig,
  missingFirebaseConfigKeys,
  firebaseAuth,
  googleProvider
} from "./lib/firebase";
import { LOCAL_DEMO_UID } from "./lib/interviewStore";
import type { AppUser } from "./types/interview";

const demoUser: AppUser = {
  uid: LOCAL_DEMO_UID,
  displayName: "Local Demo",
  email: "demo@interview-manager.local",
  isDemo: true
};

const redirectIntentKey = "interview-manager:auth-redirect";

type ThemePreference = "light" | "dark";
type AppView = "home" | "dashboard";
type AuthPhase = "idle" | "popup" | "redirect";

const getInitialTheme = (): ThemePreference => {
  const stored = window.localStorage.getItem("interview-manager:theme");
  if (stored === "light" || stored === "dark") return stored;
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
};

const hasRedirectIntent = () => {
  try {
    return window.sessionStorage.getItem(redirectIntentKey) === "true";
  } catch {
    return false;
  }
};

const setRedirectIntent = () => {
  try {
    window.sessionStorage.setItem(redirectIntentKey, "true");
  } catch {
    // Redirect sign-in can still proceed; this flag only improves return-state messaging.
  }
};

const clearRedirectIntent = () => {
  try {
    window.sessionStorage.removeItem(redirectIntentKey);
  } catch {
    // Ignore unavailable session storage.
  }
};

const getAuthEnvironment = () => {
  const userAgent = window.navigator.userAgent;
  const isIOS = /iPad|iPhone|iPod/.test(userAgent);
  const isSafari = /^((?!chrome|android|crios|fxios|edgios).)*safari/i.test(userAgent);
  const navigatorWithStandalone = window.navigator as Navigator & { standalone?: boolean };
  const isStandalone =
    window.matchMedia("(display-mode: standalone)").matches ||
    Boolean(navigatorWithStandalone.standalone);
  return { isIOS, isSafari, isStandalone };
};

const prefersRedirectSignIn = () => {
  const { isIOS, isSafari, isStandalone } = getAuthEnvironment();
  return (isIOS || isSafari) && !isStandalone;
};

const shouldFallbackToRedirect = (error: unknown) => {
  const code = typeof error === "object" && error && "code" in error ? String(error.code) : "";
  return [
    "auth/cancelled-popup-request",
    "auth/operation-not-supported-in-this-environment",
    "auth/popup-blocked"
  ].includes(code);
};

function App() {
  const [user, setUser] = useState<AppUser | null>(() => {
    return !hasFirebaseConfig && window.localStorage.getItem("interview-manager:demo-user")
      ? demoUser
      : null;
  });
  const [authPhase, setAuthPhase] = useState<AuthPhase>("idle");
  const [authMessage, setAuthMessage] = useState(
    hasFirebaseConfig && hasRedirectIntent()
      ? "Finishing Google sign-in..."
      : ""
  );
  const [authError, setAuthError] = useState("");
  const [theme, setTheme] = useState<ThemePreference>(getInitialTheme);
  const [view, setView] = useState<AppView>("home");
  const [isAccountMenuOpen, setIsAccountMenuOpen] = useState(false);
  const openInSafariUrl = `${window.location.origin}${import.meta.env.BASE_URL}`;
  const authLoading = authPhase !== "idle";

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    window.localStorage.setItem("interview-manager:theme", theme);
    const themeColor = theme === "dark" ? "#111713" : "#f6f7f2";
    document
      .querySelector('meta[name="theme-color"]:not([media])')
      ?.setAttribute("content", themeColor);
  }, [theme]);

  useEffect(() => {
    if (!isAccountMenuOpen) return;
    const closeMenu = () => setIsAccountMenuOpen(false);
    window.addEventListener("resize", closeMenu);
    window.addEventListener("orientationchange", closeMenu);
    return () => {
      window.removeEventListener("resize", closeMenu);
      window.removeEventListener("orientationchange", closeMenu);
    };
  }, [isAccountMenuOpen]);

  useEffect(() => {
    if (!firebaseAuth) return;
    return onAuthStateChanged(firebaseAuth, (currentUser) => {
      setUser(
        currentUser
          ? {
              uid: currentUser.uid,
              displayName: currentUser.displayName ?? "Interview Manager User",
              email: currentUser.email ?? "",
              photoURL: currentUser.photoURL ?? undefined
            }
          : null
      );
      if (currentUser && hasRedirectIntent()) {
        clearRedirectIntent();
        setAuthMessage("");
        setView("dashboard");
      }
      setAuthPhase((current) => (current === "redirect" && !currentUser ? current : "idle"));
    });
  }, []);

  useEffect(() => {
    if (!firebaseAuth) return;

    getRedirectResult(firebaseAuth)
      .then((result) => {
        if (result?.user) {
          clearRedirectIntent();
          setAuthMessage("");
          setView("dashboard");
        } else if (hasRedirectIntent()) {
          clearRedirectIntent();
          setAuthMessage("");
        }
      })
      .catch((error) => {
        clearRedirectIntent();
        setAuthPhase("idle");
        setAuthError(error instanceof Error ? error.message : "Unable to finish Google sign-in.");
      })
      .finally(() => setAuthPhase((current) => (current === "redirect" ? current : "idle")));
  }, []);

  useEffect(() => {
    if (!import.meta.env.DEV) return;
    const mode = hasFirebaseConfig ? "Firebase mode" : "Local demo mode";
    console.info(`[Interview Manager] ${mode}`);
    if (hasFirebaseConfig) console.info(`[Interview Manager] Firebase project: ${firebaseProjectId}`);
    if (!hasFirebaseConfig) {
      console.info(
        `[Interview Manager] Missing Firebase config keys: ${missingFirebaseConfigKeys.join(", ")}`
      );
    }
  }, []);

  useEffect(() => {
    if (import.meta.env.DEV && user) {
      console.info(`[Interview Manager] Current user UID: ${user.uid}`);
    }
  }, [user]);

  useEffect(() => {
    if (!import.meta.env.DEV) return;
    const { isIOS, isSafari, isStandalone } = getAuthEnvironment();
    console.info(
      `[Interview Manager] Auth environment: iOS=${isIOS}, Safari=${isSafari}, standalone=${isStandalone}`
    );
  }, []);

  const authModeLabel = useMemo(() => {
    if (user?.isDemo) return "Local demo mode";
    if (user && hasFirebaseConfig) return "Cloud sync active";
    if (hasFirebaseConfig) return "Sign in for cloud sync";
    return "Local demo mode";
  }, [user]);

  const showStandaloneSafariFallback = () => {
    clearRedirectIntent();
    setAuthPhase("idle");
    setAuthMessage(
      "Home-screen sign-in could not complete in iOS standalone mode. Open Interview Manager in Safari and continue there."
    );
  };

  const handleSignIn = async () => {
    setAuthError("");
    setAuthMessage("");
    if (import.meta.env.DEV) console.info("[Interview Manager] Sign-in button clicked.");
    if (!firebaseAuth) {
      window.localStorage.setItem("interview-manager:demo-user", "true");
      setUser(demoUser);
      setView("dashboard");
      return;
    }
    const auth = firebaseAuth;

    const popupSignIn = async (fallbackToRedirect: boolean) => {
      setAuthPhase("popup");
      setAuthMessage("Opening Google sign-in...");
      try {
        await signInWithPopup(auth, googleProvider);
        setAuthMessage("");
        setAuthPhase("idle");
        setView("dashboard");
      } catch (error) {
        const { isStandalone } = getAuthEnvironment();
        if (isStandalone) {
          showStandaloneSafariFallback();
          return;
        }
        if (fallbackToRedirect && shouldFallbackToRedirect(error)) {
          redirectSignIn();
          return;
        }
        setAuthPhase("idle");
        setAuthMessage("");
        setAuthError(error instanceof Error ? error.message : "Unable to sign in.");
      }
    };

    const redirectSignIn = () => {
      const { isStandalone } = getAuthEnvironment();
      if (isStandalone) {
        void popupSignIn(false);
        return;
      }

      setRedirectIntent();
      setAuthPhase("redirect");
      setAuthMessage("Redirecting to Google sign-in...");

      const fallbackTimer = window.setTimeout(() => {
        setAuthPhase("idle");
        setAuthMessage(
          isStandalone
            ? "Google sign-in did not open from the home-screen app. Open Interview Manager in Safari to sign in, then return to the home-screen app."
            : "Google sign-in did not open. Try again, or open Interview Manager directly in Safari."
        );
      }, 4000);

      void signInWithRedirect(auth, googleProvider).catch((error) => {
        window.clearTimeout(fallbackTimer);
        clearRedirectIntent();
        setAuthPhase("idle");
        setAuthMessage("");
        setAuthError(error instanceof Error ? error.message : "Unable to start Google sign-in.");
      });
    };

    const { isStandalone } = getAuthEnvironment();
    if (isStandalone) {
      await popupSignIn(false);
      return;
    }

    if (prefersRedirectSignIn()) {
      redirectSignIn();
      return;
    }

    await popupSignIn(true);
  };

  const handleSignOut = async () => {
    if (firebaseAuth) await signOut(firebaseAuth);
    window.localStorage.removeItem("interview-manager:demo-user");
    setIsAccountMenuOpen(false);
    setUser(null);
    setView("home");
  };

  const toggleTheme = () => setTheme(theme === "dark" ? "light" : "dark");

  return (
    <main>
      <header className="topbar">
        <button
          className="brand brand-button"
          onClick={() => setView("home")}
          aria-label="Interview Manager home"
        >
          <span className="brand-mark">
            <BriefcaseBusiness size={22} />
          </span>
          <span>
            <strong>Interview Manager</strong>
            <small>Drexel-ready pipeline tracker</small>
          </span>
        </button>
        <nav className="topbar-actions" aria-label="Primary">
          {user ? (
            <button
              className="ghost-button desktop-nav-control"
              onClick={() => {
                setView("dashboard");
                setIsAccountMenuOpen(false);
              }}
              aria-current={view === "dashboard" ? "page" : undefined}
            >
              <LayoutDashboard size={17} />
              Dashboard
            </button>
          ) : null}
          <button
            className="icon-button desktop-nav-control"
            onClick={toggleTheme}
            aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
            title={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
          >
            {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
          </button>
          <span className="mode-pill desktop-nav-control">
            <ShieldCheck size={15} />
            {authModeLabel}
          </span>
          {user ? (
            <>
              <span className="user-chip desktop-nav-control">
                {user.photoURL ? <img src={user.photoURL} alt="" /> : null}
                {user.displayName}
              </span>
              <button className="ghost-button desktop-nav-control" onClick={handleSignOut}>
                <LogOut size={17} />
                Sign out
              </button>
              <div className="mobile-account-menu">
                <button
                  className="icon-button"
                  onClick={() => setIsAccountMenuOpen((current) => !current)}
                  aria-expanded={isAccountMenuOpen}
                  aria-label="Open account menu"
                >
                  <Menu size={19} />
                </button>
                {isAccountMenuOpen ? (
                  <div className="account-menu-panel">
                    <button
                      className="ghost-button"
                      onClick={() => {
                        setView("dashboard");
                        setIsAccountMenuOpen(false);
                      }}
                      aria-current={view === "dashboard" ? "page" : undefined}
                    >
                      <LayoutDashboard size={17} />
                      Dashboard
                    </button>
                    <button className="ghost-button" onClick={toggleTheme}>
                      {theme === "dark" ? <Sun size={17} /> : <Moon size={17} />}
                      {theme === "dark" ? "Light mode" : "Dark mode"}
                    </button>
                    <span className="user-chip menu-user-chip">
                      {user.photoURL ? <img src={user.photoURL} alt="" /> : null}
                      {user.displayName}
                    </span>
                    <button className="ghost-button" onClick={handleSignOut}>
                      <LogOut size={17} />
                      Sign out
                    </button>
                  </div>
                ) : null}
              </div>
            </>
          ) : (
            <button className="primary-button" onClick={handleSignIn} disabled={authLoading}>
              <LogIn size={17} />
              {authPhase === "redirect"
                ? "Redirecting..."
                : authPhase === "popup"
                  ? "Signing in..."
                  : hasFirebaseConfig
                    ? "Sign in with Google"
                    : "Continue locally"}
            </button>
          )}
        </nav>
      </header>

      {authError ? <p className="app-error">{authError}</p> : null}
      {authMessage ? (
        <p className="sync-notice auth-status">
          {authMessage}
          {authMessage.includes("Open Interview Manager in Safari") ? (
            <a href={openInSafariUrl} target="_blank" rel="noreferrer">
              Open in Safari
            </a>
          ) : null}
        </p>
      ) : null}

      {user && view === "dashboard" ? (
        <Dashboard user={user} hasFirebaseConfig={hasFirebaseConfig} />
      ) : (
        <HomePage
          authLoading={authLoading}
          hasFirebaseConfig={hasFirebaseConfig}
          onPrimaryAction={user ? () => setView("dashboard") : handleSignIn}
          primaryActionLabel={
            user
              ? "Open dashboard"
              : authPhase === "redirect"
                ? "Redirecting..."
                : authPhase === "popup"
                  ? "Signing in..."
                  : hasFirebaseConfig
                    ? "Sign in with Google"
                    : "Open local demo"
          }
          featureIcons={[LayoutDashboard, CalendarClock, FileUp, ShieldCheck, Plus]}
        />
      )}
    </main>
  );
}

export default App;
