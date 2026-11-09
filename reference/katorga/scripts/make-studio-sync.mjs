// Generates a Luau snippet that pushes src/ into an open Studio place via Studio MCP execute_luau,
// without the Rojo plugin: for every script in default.project.json's tree it sets .Source (creating
// instances by path); JSON configs become ModuleScripts that JSONDecode their content.
// Usage: node scripts/make-studio-sync.mjs [only1,only2,...] > <out.luau>   (the agent then runs it in Studio)
// The optional comma list limits the output to scripts whose file path contains one of the items.
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, dirname, basename, relative } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const project = JSON.parse(readFileSync(join(root, "default.project.json"), "utf8"));

const only = (process.argv[2] || "").split(",").filter(Boolean);
const entries = []; // { path: ["ReplicatedStorage","Shared",...], className, source, file }

function classFor(file) {
	if (file.endsWith(".server.luau")) return ["Script", file.replace(/\.server\.luau$/, "")];
	if (file.endsWith(".client.luau")) return ["LocalScript", file.replace(/\.client\.luau$/, "")];
	if (file.endsWith(".luau")) return ["ModuleScript", file.replace(/\.luau$/, "")];
	if (file.endsWith(".json")) return ["ModuleScript", file.replace(/\.json$/, "")];
	return null;
}

function walkDir(dir, pathParts) {
	const files = readdirSync(dir);
	const init = files.find((f) => /^init\.(server|client)?\.?luau$/.test(f));
	let containerClass = "Folder";
	let containerSource = null;
	if (init) {
		[containerClass] = classFor(init);
		containerSource = readFileSync(join(dir, init), "utf8");
	}
	entries.push({ path: pathParts, className: containerClass, source: containerSource, file: init ? join(dir, init) : "" });
	for (const f of files) {
		if (f === init) continue;
		const full = join(dir, f);
		if (statSync(full).isDirectory()) {
			walkDir(full, [...pathParts, f]);
			continue;
		}
		const c = classFor(f);
		if (!c) continue;
		let source = readFileSync(full, "utf8");
		if (f.endsWith(".json")) {
			source = `return game:GetService("HttpService"):JSONDecode([==[${source}]==])`;
		}
		entries.push({ path: [...pathParts, c[1]], className: c[0], source, file: full });
	}
}

function walkTree(node, pathParts) {
	for (const [key, value] of Object.entries(node)) {
		if (key.startsWith("$")) continue;
		if (value.$path) {
			if (value.$path.endsWith(".project.json")) continue; // nested project (MaterialService): edit-time only
			walkDir(join(root, value.$path), [...pathParts, key]);
		} else if (typeof value === "object") {
			walkTree(value, [...pathParts, key]);
		}
	}
}
walkTree(project.tree, []);
const selected = only.length
	? entries.filter((e) => e.source == null || only.some((o) => e.file.split("\\").join("/").includes(o)))
	: entries;

const lua = [];
lua.push(`local function at(path, className)
	local inst = game:GetService(path[1])
	for i = 2, #path do
		local child = inst:FindFirstChild(path[i])
		if child and i == #path and child.ClassName ~= className then child:Destroy() child = nil end
		if not child then
			child = Instance.new(if i == #path then className else "Folder")
			child.Name = path[i]
			child.Parent = inst
		end
		inst = child
	end
	return inst
end
local n = 0`);
for (const e of selected) {
	const path = JSON.stringify(e.path).replace(/\[/g, "{").replace(/\]/g, "}");
	if (e.source == null) {
		lua.push(`at(${path}, "${e.className}")`);
	} else {
		const src = e.source.replace(/\]==\]/g, "]==]..']==]'..[==[");
		lua.push(`do local s = at(${path}, "${e.className}"); s.Source = [==[${src}]==]; n += 1; if n % 20 == 0 then task.wait() end end`);
	}
}
lua.push(`return "synced " .. n .. " scripts"`);
process.stdout.write(lua.join("\n"));
