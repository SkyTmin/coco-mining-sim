// Usage: node scripts/make-studio-sync.mjs [only1,only2,...] > build/studio-sync.luau
import { readFileSync, readdirSync } from "node:fs";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const project = JSON.parse(readFileSync(join(root, "default.project.json"), "utf8"));
const only = (process.argv[2] ?? "").split(",").map((name) => name.trim()).filter(Boolean);
const entries = [];

function classFor(file) {
  if (file.endsWith(".server.luau")) return "Script";
  if (file.endsWith(".client.luau")) return "LocalScript";
  if (file.endsWith(".luau") || file.endsWith(".json")) return "ModuleScript";
  return null;
}

function longString(text) {
  let delimiter = "=";
  while (text.includes(`]${delimiter}]`)) delimiter += "=";
  return `[${delimiter}[\n${text}]${delimiter}]`;
}

function walkDirectory(directory, path) {
  const files = readdirSync(directory, { withFileTypes: true });
  const init = files.find((file) => file.isFile() && /^init(?:\.(?:server|client))?\.luau$/.test(file.name));
  const file = init ? join(directory, init.name) : null;
  entries.push({
    path,
    className: init ? classFor(init.name) : "Folder",
    source: file ? readFileSync(file, "utf8") : null,
    file,
  });
  for (const child of files) {
    const name = child.name;
    const childFile = join(directory, name);
    if (child.isDirectory()) {
      walkDirectory(childFile, [...path, name]);
    } else if (child.isFile() && child !== init && !name.endsWith(".spec.luau")) {
      const className = classFor(name);
      if (!className) continue;
      const source = readFileSync(childFile, "utf8");
      entries.push({
        path: [...path, name.replace(/(?:\.(?:server|client))?\.(?:luau|json)$/, "")],
        className,
        source: name.endsWith(".json")
          ? `--!strict\nreturn game:GetService("HttpService"):JSONDecode(${longString(source)})\n`
          : source,
        file: childFile,
      });
    }
  }
}

function walkTree(node, path) {
  if (node.$path) walkDirectory(join(root, node.$path), path);
  for (const [key, child] of Object.entries(node)) {
    if (!key.startsWith("$")) walkTree(child, [...path, key]);
  }
}
walkTree(project.tree, []);

const selected = new Set(entries.filter(({ file }) =>
  only.length === 0 || (file && only.some((name) => relative(root, file).replaceAll("\\", "/").includes(name)))));
if (selected.size === 0) {
  console.error("No project scripts match the filter.");
  process.exit(1);
}
const ancestors = new Set();
for (const { path } of selected) {
  for (let length = 1; length < path.length; length++) {
    ancestors.add(path.slice(0, length).join("/"));
  }
}

const lua = [`--!strict
local n = 0
local function sync(path, className, source, replaceSource)
	local parent = game:GetService(path[1])
	for i = 2, #path - 1 do
		parent = assert(parent:FindFirstChild(path[i]), "Missing parent: " .. path[i])
	end
	local name = path[#path]
	local child = parent:FindFirstChild(name)
	if child and child.ClassName ~= className then
		child:Destroy()
		child = nil
	end
	local created = child == nil
	if not child then
		child = Instance.new(className)
		child.Name = name
	end
	local wrote = source ~= nil and (created or replaceSource)
	if wrote then
		(child :: LuaSourceContainer).Source = source
		n += 1
	end
	child.Parent = parent
	if wrote and n % 20 == 0 then task.wait() end
end`];
for (const entry of entries) {
  const { path, className, source } = entry;
  if (!selected.has(entry) && !ancestors.has(path.join("/"))) continue;
  const luaPath = path.map((name) => JSON.stringify(name)).join(", ");
  lua.push(`sync({ ${luaPath} }, "${className}", ${source === null ? "nil" : longString(source)}, ${selected.has(entry)})`);
}
lua.push('return "synced " .. n .. " scripts"');
process.stdout.write(lua.join("\n") + "\n");
