// Serve local Luau and JSON files to scripts/studio-loader.luau.
// Usage: node scripts/serve-repo.mjs
import { readFileSync, realpathSync, statSync } from "node:fs";
import { isAbsolute, relative, resolve, sep } from "node:path";
import { createServer } from "node:http";
import { fileURLToPath } from "node:url";

const root = realpathSync(fileURLToPath(new URL("..", import.meta.url)));

createServer((request, response) => {
  try {
    const pathname = decodeURIComponent(new URL(request.url, "http://127.0.0.1").pathname);
    if (!/\.(luau|json)$/.test(pathname)) throw new Error("Unsupported file type");
    const file = realpathSync(resolve(root, "." + pathname));
    const fromRoot = relative(root, file);
    if (isAbsolute(fromRoot) || fromRoot.startsWith(".." + sep) || !statSync(file).isFile()) {
      throw new Error("File is outside the repo or is not a regular file");
    }
    const contents = readFileSync(file);
    response.writeHead(200, { "content-type": "text/plain; charset=utf-8" });
    response.end(contents);
  } catch {
    response.writeHead(404);
    response.end("File not found");
  }
}).listen(8766, "127.0.0.1", () => console.log("repo static on 127.0.0.1:8766"));
