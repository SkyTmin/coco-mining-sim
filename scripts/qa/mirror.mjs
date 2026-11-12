// QA mirror: a real-looking screenshot of what the Play client sees.
// Roblox refuses pixel readback of CaptureService shots in Play ("cannot create editable image from temporary
// texture id", checked 12.11), and Edit shots only render while Play is stopped. So:
//   1. mirror-dump.luau on the Play client → JSON (camera, parts in view, cel models with their part frames)
//   2. stop Play
//   3. mirror-show.luau in Edit rebuilds it in Workspace.PlayMirror, camera at the Play camera
//   4. `shot edit` → the PNG
// Usage: node scripts/qa/mirror.mjs <out.png> [--keep-play] [--keep-mirror] [--dump file.json] [--from file.json]
//        --keep-mirror leaves Workspace.PlayMirror for close-ups: run --clear before the next Play!
//        node scripts/qa/mirror.mjs --clear          (remove Workspace.PlayMirror, give the Edit camera back)
// Always check `agent.mjs status` placeId first (87020443315503 for this game).
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const AGENT = process.env.RELAY_AGENT || "/home/user/coco-prison-roblox/tools/studio-relay/agent.mjs";
const args = process.argv.slice(2);
const flag = (name) => {
	const i = args.indexOf(name);
	return i >= 0 ? args[i + 1] : undefined;
};
const tmp = mkdtempSync(join(tmpdir(), "mirror-"));

function agent(...a) {
	return execFileSync("node", [AGENT, ...a], { encoding: "utf8", maxBuffer: 256 * 1024 * 1024 });
}
function show(json) {
	const src = readFileSync(join(here, "mirror-show.luau"), "utf8").replace("__DUMP__", () => json);
	const file = join(tmp, "show.luau");
	writeFileSync(file, src);
	return agent("run", "edit", file, "--timeout", "180");
}

if (args.includes("--clear")) {
	process.stdout.write(show("clear"));
	process.exit(0);
}
const out = args.find((a) => a.endsWith(".png"));
if (!out) {
	console.error("usage: node scripts/qa/mirror.mjs <out.png> [--keep-play] [--dump file.json] [--from file.json]");
	process.exit(2);
}

let json;
if (flag("--from")) {
	json = readFileSync(flag("--from"), "utf8");
} else {
	const res = agent("run", "client", join(here, "mirror-dump.luau"), "--timeout", "60");
	const line = res.split("\n").find((l) => l.startsWith("=> {"));
	if (!line) {
		console.error("dump failed:\n" + res);
		process.exit(1);
	}
	json = line.slice(3);
	if (flag("--dump")) writeFileSync(flag("--dump"), json);
	const d = JSON.parse(json);
	console.log(`dump: ${d.parts.length} parts, ${d.cels.length} cel models, ${(json.length / 1024).toFixed(0)} KB`);
	if (!args.includes("--keep-play")) {
		agent("stop");
		const ping = join(tmp, "ping.luau");
		writeFileSync(ping, 'return if game:GetService("RunService"):IsRunning() then "running" else "edit-ready"');
		// wait until the edit DataModel answers again
		for (let i = 0; i < 20; i++) {
			try {
				const s = agent("run", "edit", ping, "--timeout", "10");
				if (s.includes("=> edit-ready")) break;
			} catch {}
		}
	}
}
if (args.includes("--keep-play") && !flag("--from")) process.exit(0); // dump only: Edit cannot shoot while Play runs
process.stdout.write(show(json));
// the first Edit frame after Play can come out blank white: nudge the camera, wait, shoot
const nudge = join(tmp, "nudge.luau");
writeFileSync(nudge, "local c = workspace.CurrentCamera\nc.CFrame = c.CFrame * CFrame.new(0, 0, 0.001)\ntask.wait(1)\nc.CFrame = c.CFrame * CFrame.new(0, 0, -0.001)\ntask.wait(0.5)\nreturn 'ok'");
agent("run", "edit", nudge, "--timeout", "30");
try {
	process.stdout.write(agent("shot", "edit", out));
} finally {
	// never leave the mirror in Edit: the next Play would copy it into the game (a frozen second character)
	if (!args.includes("--keep-mirror")) show("clear");
}
