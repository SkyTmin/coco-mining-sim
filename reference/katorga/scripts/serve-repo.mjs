// Serves the repo's .luau/.json files on http://127.0.0.1:8766 for scripts/studio-loader.luau.
// Usage: node scripts/serve-repo.mjs (keep running while syncing).
import http from "node:http";
import { readFileSync, existsSync } from "node:fs";
import { join, normalize } from "node:path";
import { fileURLToPath } from "node:url";
const root = fileURLToPath(new URL("..", import.meta.url));
http.createServer((req, res) => {
  const rel = normalize(decodeURIComponent(req.url.split("?")[0])).replace(/^([\/])+/, "");
  const f = join(root, rel);
  if (rel.includes("..") || !existsSync(f) || !/\.(luau|json)$/.test(f)) { res.writeHead(404); res.end("no"); return; }
  res.writeHead(200, { "content-type": "text/plain; charset=utf-8" }); res.end(readFileSync(f));
}).listen(8766, "127.0.0.1", () => console.log("repo static on 8766"));
