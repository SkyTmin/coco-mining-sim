#!/usr/bin/env node
// Agent-side client for the Studio Relay (cloud agent -> Worker -> "Studio Relay" plugin in Studio).
// Copy of coco-prison-roblox tools/studio-relay/agent.mjs for agents working in this repo (Codex: RELAY_TOKEN = its own key).
// Auth: the Authorization header is injected by the session's network proxy (a saved credential for
// the relay host); without it set RELAY_TOKEN. Relay URL: RELAY_URL or tools/relay/relay.json.
//
// Usage:
//   node tools/relay/agent.mjs status
//   node tools/relay/agent.mjs pair 123456
//   node tools/relay/agent.mjs run <edit|server|client> <file.luau | -e "code"> [--timeout 60]
//   node tools/relay/agent.mjs shot <edit|client> <out.png> [--max 1024]
//   node tools/relay/agent.mjs render <edit|client|server> <out.png> [--max 640] [--noaa] [--nogui]
//        [--cam x,y,z,lookX,lookY,lookZ] [--fov 70] [--size 1280x720]   (render from any point)
//        [--k sun=1,amb=1,env=0.25,fog=0.0035,exposure=1,sat=1,skyHaze=0.35]   (calibration overrides)
//   node tools/relay/agent.mjs logs [target] [--since N] [--tail 50]
//   node tools/relay/agent.mjs play | runmode | stop
//   node tools/relay/agent.mjs sync [only1,only2,...]   (scripts/make-studio-sync.mjs -> edit)
//   node tools/relay/agent.mjs revoke
//   node tools/relay/agent.mjs publish-plugin   (bump BUILD first; owner applies via «Обновить»)
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";
import { deflateSync } from "node:zlib";

// Node's built-in fetch ignores HTTPS_PROXY unless NODE_USE_ENV_PROXY=1 (Node >= 22.21): re-exec once.
if ((process.env.HTTPS_PROXY || process.env.https_proxy) && process.env.NODE_USE_ENV_PROXY !== "1") {
	const { spawnSync } = await import("node:child_process");
	const r = spawnSync(process.execPath, process.argv.slice(1), {
		stdio: "inherit",
		env: { ...process.env, NODE_USE_ENV_PROXY: "1", NODE_NO_WARNINGS: "1" },
	});
	process.exit(r.status ?? 1);
}

const here = dirname(fileURLToPath(import.meta.url));
const repo = join(here, "..", "..");

function relayUrl() {
	if (process.env.RELAY_URL) return process.env.RELAY_URL.replace(/\/$/, "");
	const f = join(here, "relay.json");
	if (existsSync(f)) return JSON.parse(readFileSync(f, "utf8")).url.replace(/\/$/, "");
	throw new Error("relay url unknown: set RELAY_URL or write tools/studio-relay/relay.json {\"url\": ...}");
}

async function call(path, { method = "GET", body } = {}) {
	const headers = { authorization: "Bearer " + (process.env.RELAY_TOKEN || "proxy-injected") };
	const res = await fetch(relayUrl() + path, { method, body, headers });
	return res;
}

async function jsonCall(path, opts) {
	const res = await call(path, opts);
	const text = await res.text();
	let data;
	try {
		data = JSON.parse(text);
	} catch {
		data = { raw: text };
	}
	if (!res.ok) throw new Error(`${res.status} ${text.slice(0, 500)}`);
	return data;
}

function arg(name, def) {
	const i = process.argv.indexOf(name);
	return i >= 0 ? process.argv[i + 1] : def;
}

async function send(target, kind, payload = "", timeout = 60) {
	const q = new URLSearchParams({ target, kind, timeout: String(timeout) });
	const { id } = await jsonCall("/agent/cmd?" + q, { method: "POST", body: payload });
	const deadline = Date.now() + (timeout + 60) * 1000;
	let lastState = "";
	while (Date.now() < deadline) {
		const res = await call(`/agent/result?id=${encodeURIComponent(id)}&wait=20`);
		if (res.status === 200) {
			return { ok: res.headers.get("x-ok") === "1", body: await res.text(), id };
		}
		const info = await res.json().catch(() => ({}));
		if (info.state === "unknown") throw new Error("command lost (relay restarted?) id=" + id);
		if (info.state !== lastState) {
			process.stderr.write(`[relay] ${id}: ${info.state}\n`);
			lastState = info.state;
		}
	}
	await call(`/agent/cancel?id=${encodeURIComponent(id)}`, { method: "POST" }).catch(() => {});
	throw new Error(`no result in time (id ${id}); is the plugin connected? try: status`);
}

function printRun(r) {
	let data;
	try {
		data = JSON.parse(r.body);
	} catch {
		console.log(r.body);
		process.exitCode = r.ok ? 0 : 1;
		return;
	}
	if (data.output && data.output.length) console.log(data.output.join("\n"));
	if (data.error) console.log("ERROR: " + data.error);
	if (data.value !== undefined && data.value !== null && data.value !== "") console.log("=> " + data.value);
	if (data.timedOut) console.log("(still running in Studio after timeout)");
	process.exitCode = r.ok ? 0 : 1;
}

// --- PNG writer (RGB, 8 bit) ---
const crcTable = (() => {
	const t = new Uint32Array(256);
	for (let n = 0; n < 256; n++) {
		let c = n;
		for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
		t[n] = c >>> 0;
	}
	return t;
})();
function crc32(buf) {
	let c = 0xffffffff;
	for (const b of buf) c = crcTable[(c ^ b) & 0xff] ^ (c >>> 8);
	return (c ^ 0xffffffff) >>> 0;
}
function chunk(type, data) {
	const len = Buffer.alloc(4);
	len.writeUInt32BE(data.length);
	const td = Buffer.concat([Buffer.from(type, "ascii"), data]);
	const crc = Buffer.alloc(4);
	crc.writeUInt32BE(crc32(td));
	return Buffer.concat([len, td, crc]);
}
function writePng(file, w, h, rgb) {
	const raw = Buffer.alloc((w * 3 + 1) * h);
	for (let y = 0; y < h; y++) {
		raw[y * (w * 3 + 1)] = 0;
		rgb.copy(raw, y * (w * 3 + 1) + 1, y * w * 3, (y + 1) * w * 3);
	}
	const ihdr = Buffer.alloc(13);
	ihdr.writeUInt32BE(w, 0);
	ihdr.writeUInt32BE(h, 4);
	ihdr[8] = 8;
	ihdr[9] = 2;
	const png = Buffer.concat([
		Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
		chunk("IHDR", ihdr),
		chunk("IDAT", deflateSync(raw)),
		chunk("IEND", Buffer.alloc(0)),
	]);
	writeFileSync(file, png);
}

async function main() {
	const [cmd, a1, a2] = process.argv.slice(2);
	switch (cmd) {
		case "status": {
			console.log(JSON.stringify(await jsonCall("/agent/status"), null, 2));
			break;
		}
		case "pair": {
			console.log(JSON.stringify(await jsonCall("/agent/pair?code=" + encodeURIComponent(a1 || ""), { method: "POST" })));
			break;
		}
		case "publish-plugin": {
			// offers a new plugin build; the owner applies it with the «Обновить» button in the widget
			execFileSync("node", [join(here, "build-plugin.mjs")], { stdio: "inherit" });
			const src = readFileSync(join(here, "plugin", ".build.luau"), "utf8");
			const build = Number((src.match(/local BUILD = (\d+)/) || [])[1]);
			const font = readFileSync(join(here, "plugin", "Font.luau"), "utf8");
			console.log(JSON.stringify(await jsonCall("/agent/asset?name=font", { method: "POST", body: font })));
			console.log(JSON.stringify(await jsonCall("/agent/code?build=" + build, { method: "POST", body: src })));
			break;
		}
		case "revoke": {
			console.log(JSON.stringify(await jsonCall("/agent/revoke", { method: "POST" })));
			break;
		}
		case "run": {
			const target = a1 || "edit";
			const code = a2 === "-e" ? process.argv[process.argv.indexOf("-e") + 1] : readFileSync(a2, "utf8");
			printRun(await send(target, "run", code, Number(arg("--timeout", 60))));
			break;
		}
		case "sync": {
			const args = [join(repo, "scripts", "make-studio-sync.mjs")];
			if (a1) args.push(a1);
			const code = execFileSync("node", args, { maxBuffer: 256 * 1024 * 1024, encoding: "utf8" });
			process.stderr.write(`[relay] sync payload ${(code.length / 1024).toFixed(0)} KB\n`);
			printRun(await send("edit", "run", code, Number(arg("--timeout", 180))));
			break;
		}
		case "shot":
		case "render": {
			const target = a1 || "edit";
			const out = a2 || cmd + ".png";
			const opts = { max: Number(arg("--max", cmd === "render" ? 640 : 1024)) };
			if (process.argv.includes("--noaa")) opts.aa = false;
			if (process.argv.includes("--nogui")) opts.gui = false;
			if (arg("--cam")) opts.cam = arg("--cam").split(",").map(Number);
			if (arg("--fov")) opts.fov = Number(arg("--fov"));
			if (arg("--size")) [opts.vw, opts.vh] = arg("--size").split("x").map(Number);
			if (arg("--k")) opts.k = Object.fromEntries(arg("--k").split(",").map((kv) => kv.split("=")).map(([k, v]) => [k, Number(v)]));
			const r = await send(target, cmd === "render" ? "render" : "screenshot", JSON.stringify(opts), Number(arg("--timeout", 120)));
			const data = JSON.parse(r.body);
			if (!r.ok) {
				console.log("ERROR: " + data.error);
				process.exitCode = 1;
				break;
			}
			writePng(out, data.w, data.h, Buffer.from(data.b64, "base64"));
			const extra = data.rays ? ` rays ${data.rays}, gui ${data.guiObjects}, ${data.seconds}s (world ${data.worldSeconds}s)${data.minimized ? ", MINIMIZED" : ""}` : "";
			console.log(`saved ${out} ${data.w}x${data.h} (source ${data.srcW}x${data.srcH})${extra}`);
			if (data.images) console.log(`images: ${data.images.ok} ok, ${data.images.fail} failed: ${data.images.failed.join(" | ")}`);
			break;
		}
		case "logs": {
			const q = new URLSearchParams({ target: a1 && !a1.startsWith("--") ? a1 : "", since: arg("--since", "0") });
			const data = await jsonCall("/agent/logs?" + q);
			const tail = Number(arg("--tail", 80));
			for (const l of data.logs.slice(-tail)) console.log(`${l.seq} [${l.target}] ${l.type}: ${l.msg}`);
			console.log(`(seq ${data.seq})`);
			break;
		}
		case "play":
		case "runmode":
		case "stop": {
			const target = cmd === "stop" ? "server" : "edit";
			if (cmd === "stop") {
				const st = await jsonCall("/agent/status");
				const srv = st.datamodels && st.datamodels.server;
				if (!srv || srv.agoSec > 30) {
					console.log("=> not running");
					break;
				}
			}
			printRun(await send(target, cmd, "", 30));
			break;
		}
		default:
			console.log(readFileSync(fileURLToPath(import.meta.url), "utf8").split("\n").slice(1, 15).join("\n"));
	}
}

main().catch((e) => {
	console.error("ERROR: " + (e && e.message ? e.message : e));
	process.exit(1);
});
