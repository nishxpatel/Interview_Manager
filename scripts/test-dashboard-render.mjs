import assert from "node:assert/strict";
import { log } from "node:console";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { join } from "node:path";
import process from "node:process";
import { build } from "esbuild";

const outdir = await mkdtemp(join(tmpdir(), "dashboard-render-"));
const entry = join(outdir, "entry.tsx");
const outfile = join(outdir, "dashboardRender.cjs");
const cwd = process.cwd();
const require = createRequire(import.meta.url);

try {
  await writeFile(
    entry,
    `
      const React = require("react");
      const { renderToString } = require("react-dom/server");

      globalThis.window = {
        localStorage: {
          getItem: () => null,
          setItem: () => {},
          removeItem: () => {}
        },
        addEventListener: () => {},
        removeEventListener: () => {},
        dispatchEvent: () => {}
      };
      globalThis.CustomEvent = class CustomEvent {
        constructor(type, init) {
          this.type = type;
          this.detail = init?.detail;
        }
      };

      const { Dashboard } = require("${cwd}/src/components/Dashboard.tsx");
      const user = { uid: "test", displayName: "Test User", email: "test@example.com" };
      const html = renderToString(<Dashboard user={user} hasFirebaseConfig={true} />);

      if (!html.includes("Interview pipeline") || !html.includes("Calendar")) {
        throw new Error("Dashboard render missing expected content.");
      }
    `
  );

  await build({
    entryPoints: [entry],
    bundle: true,
    format: "cjs",
    outfile,
    platform: "node",
    jsx: "automatic",
    nodePaths: [join(cwd, "node_modules")],
    define: {
      "import.meta.env.VITE_FIREBASE_API_KEY": "\"\"",
      "import.meta.env.VITE_FIREBASE_AUTH_DOMAIN": "\"\"",
      "import.meta.env.VITE_FIREBASE_PROJECT_ID": "\"\"",
      "import.meta.env.VITE_FIREBASE_STORAGE_BUCKET": "\"\"",
      "import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID": "\"\"",
      "import.meta.env.VITE_FIREBASE_APP_ID": "\"\"",
      "import.meta.env.DEV": "false",
      "import.meta.env.BASE_URL": "\"/\""
    },
    logLevel: "silent"
  });

  require(outfile);
  assert.ok(true);
} finally {
  await rm(outdir, { recursive: true, force: true });
}

log("Dashboard render tests passed.");
