// Run from the salda folder:  node check-supabase.mjs
// Prints which Supabase URL the app is configured with and why a request to it fails (if it does).
import { readFileSync } from "node:fs";

let env = {};
try {
  for (const line of readFileSync(".env.local", "utf8").split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m) env[m[1]] = m[2];
  }
} catch {
  console.log("Could not read .env.local in this folder. Run this from the salda folder.");
  process.exit(1);
}

const url = env.NEXT_PUBLIC_SUPABASE_URL;
const key = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
console.log("Node:", process.version);
console.log("URL in .env.local:", url);
console.log("Key starts with:", key ? key.slice(0, 16) + "..." : "(missing)");

if (!url || url.includes("your-project")) {
  console.log("\nPROBLEM: .env.local still has the placeholder URL. Replace it with the real one.");
  process.exit(1);
}

try {
  const res = await fetch(`${url}/auth/v1/health`, { headers: { apikey: key } });
  console.log("\nReached Supabase. HTTP status:", res.status);
  console.log(await res.text());
} catch (e) {
  console.log("\nFAILED:", e.message);
  console.log("Cause:", e.cause?.code ?? e.cause?.message ?? e.cause);
  console.log(
    "\nENOTFOUND = DNS can't resolve the host (wrong URL, or DNS/VPN blocking).\n" +
      "ETIMEDOUT / ECONNREFUSED = network or firewall blocks it.\n" +
      "Certificate errors = antivirus/company proxy intercepting HTTPS."
  );
}
