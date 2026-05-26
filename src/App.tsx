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

const getInitialTheme = (): ThemePreference => {
  const stored = window.localStorage.getItem("interview-manager:theme");
  if (stored === "light" || stored === "dark") return stored;
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
};

const prefersRedirectSignIn = () => {
  const userAgent = window.navigator.userAgent;
  const isIOS = /iPad|iPhone|iPod/.test(userAgent);
  const isSafari = /^((?!chrome|android|crios|fxios|edgios).)*safari/i.test(userAgent);
  const navigatorWithStandalone = window.navigator as Navigator & { standalone?: boolean };
  const isStandalone =
    window.matchMedia("(display-mode: standalone)").matches ||
    Boolean(navigatorWithStandalone.standalone);
  return isIOS || isSafari || isStandalone;
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
  const [authLoading, setAuthLoading] = useState(hasFirebaseConfig);
  const [authError, setAuthError] = useState("");
  const [theme, setTheme] = useState<ThemePreference>(getInitialTheme);
  const [view, setView] = useState<AppView>("home");

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    window.localStorage.setItem("interview-manager:theme", theme);
    const themeColor = theme === "dark" ? "#111713" : "#f6f7f2";
    document
      .querySelector('meta[name="theme-color"]:not([media])')
      ?.setAttribute("content", themeColor);
  }, [theme]);

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
      if (currentUser && window.sessionStorage.getItem(redirectIntentKey)) {
        window.sessionStorage.removeItem(redirectIntentKey);
        setView("dashboard");
      }
      setAuthLoading(false);
    });
  }, []);

  useEffect(() => {
    if (!firebaseAuth) return;

    getRedirectResult(firebaseAuth)
      .then((result) => {
        if (result?.user) {
          window.sessionStorage.removeItem(redirectIntentKey);
          setView("dashboard");
        }
      })
      .catch((error) => {
        window.sessionStorage.removeItem(redirectIntentKey);
        setAuthError(error instanceof Error ? error.message : "Unable to finish Google sign-in.");
      })
      .finally(() => setAuthLoading(false));
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

  const authModeLabel = useMemo(() => {
    if (user?.isDemo) return "Local demo mode";
    if (user && hasFirebaseConfig) return "Cloud sync active";
    if (hasFirebaseConfig) return "Sign in for cloud sync";
    return "Local demo mode";
  }, [user]);

  const handleSignIn = async () => {
    setAuthError("");
    if (!firebaseAuth) {
      window.localStorage.setItem("interview-manager:demo-user", "true");
      setUser(demoUser);
      setView("dashboard");
      return;
    }
    const auth = firebaseAuth;

    const redirectSignIn = async () => {
      window.sessionStorage.setItem(redirectIntentKey, "true");
      try {
        await signInWithRedirect(auth, googleProvider);
      } catch (error) {
        window.sessionStorage.removeItem(redirectIntentKey);
        setAuthError(error instanceof Error ? error.message : "Unable to start Google sign-in.");
      }
    };

    try {
      if (prefersRedirectSignIn()) {
        await redirectSignIn();
        return;
      }
      await signInWithPopup(auth, googleProvider);
      setView("dashboard");
    } catch (error) {
      if (shouldFallbackToRedirect(error)) {
        await redirectSignIn();
        return;
      }
      setAuthError(error instanceof Error ? error.message : "Unable to sign in.");
    }
  };

  const handleSignOut = async () => {
    if (firebaseAuth) await signOut(firebaseAuth);
    window.localStorage.removeItem("interview-manager:demo-user");
    setUser(null);
    setView("home");
  };

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
              className="ghost-button"
              onClick={() => setView("dashboard")}
              aria-current={view === "dashboard" ? "page" : undefined}
            >
              <LayoutDashboard size={17} />
              Dashboard
            </button>
          ) : null}
          <button
            className="icon-button"
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
            title={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
          >
            {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
          </button>
          <span className="mode-pill">
            <ShieldCheck size={15} />
            {authModeLabel}
          </span>
          {user ? (
            <>
              <span className="user-chip">
                {user.photoURL ? <img src={user.photoURL} alt="" /> : null}
                {user.displayName}
              </span>
              <button className="ghost-button" onClick={handleSignOut}>
                <LogOut size={17} />
                Sign out
              </button>
            </>
          ) : (
            <button className="primary-button" onClick={handleSignIn} disabled={authLoading}>
              <LogIn size={17} />
              {hasFirebaseConfig ? "Sign in with Google" : "Continue locally"}
            </button>
          )}
        </nav>
      </header>

      {authError ? <p className="app-error">{authError}</p> : null}

      {user && view === "dashboard" ? (
        <Dashboard user={user} hasFirebaseConfig={hasFirebaseConfig} />
      ) : (
        <HomePage
          authLoading={authLoading}
          hasFirebaseConfig={hasFirebaseConfig}
          onPrimaryAction={user ? () => setView("dashboard") : handleSignIn}
          primaryActionLabel={
            user ? "Open dashboard" : hasFirebaseConfig ? "Sign in with Google" : "Open local demo"
          }
          featureIcons={[LayoutDashboard, CalendarClock, FileUp, ShieldCheck, Plus]}
        />
      )}
    </main>
  );
}

export default App;
