import { useEffect, useMemo, useState } from "react";
import { onAuthStateChanged, signInWithPopup, signOut } from "firebase/auth";
import {
  BriefcaseBusiness,
  CalendarClock,
  FileUp,
  LayoutDashboard,
  LogIn,
  LogOut,
  Plus,
  ShieldCheck
} from "lucide-react";
import { Dashboard } from "./components/Dashboard";
import { HomePage } from "./components/HomePage";
import { hasFirebaseConfig, firebaseAuth, googleProvider } from "./lib/firebase";
import type { AppUser } from "./types/interview";

const demoUser: AppUser = {
  uid: "local-demo-user",
  displayName: "Local Demo",
  email: "demo@interview-manager.local",
  isDemo: true
};

function App() {
  const [user, setUser] = useState<AppUser | null>(() => {
    return window.localStorage.getItem("interview-manager:demo-user") ? demoUser : null;
  });
  const [authLoading, setAuthLoading] = useState(hasFirebaseConfig);
  const [authError, setAuthError] = useState("");

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
      setAuthLoading(false);
    });
  }, []);

  const authModeLabel = useMemo(
    () => (hasFirebaseConfig ? "Google + Firestore" : "Local demo mode"),
    []
  );

  const handleSignIn = async () => {
    setAuthError("");
    if (!firebaseAuth) {
      window.localStorage.setItem("interview-manager:demo-user", "true");
      setUser(demoUser);
      return;
    }

    try {
      await signInWithPopup(firebaseAuth, googleProvider);
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : "Unable to sign in.");
    }
  };

  const handleSignOut = async () => {
    if (firebaseAuth) await signOut(firebaseAuth);
    window.localStorage.removeItem("interview-manager:demo-user");
    setUser(null);
  };

  return (
    <main>
      <header className="topbar">
        <a className="brand" href="/" aria-label="Interview Manager home">
          <span className="brand-mark">
            <BriefcaseBusiness size={22} />
          </span>
          <span>
            <strong>Interview Manager</strong>
            <small>Drexel-ready pipeline tracker</small>
          </span>
        </a>
        <nav className="topbar-actions" aria-label="Primary">
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

      {user ? (
        <Dashboard user={user} />
      ) : (
        <HomePage
          authLoading={authLoading}
          hasFirebaseConfig={hasFirebaseConfig}
          onSignIn={handleSignIn}
          featureIcons={[LayoutDashboard, CalendarClock, FileUp, ShieldCheck, Plus]}
        />
      )}
    </main>
  );
}

export default App;
