// Cel pickaxes and chests → compact Luau data for the in-game mesh builder (src/client/Fx/CelMesh.luau).
// Usage: node assets/pickaxes/export-roblox.mjs   (reads picks-cel.json and ../chests/chests.json)
// Polygons are simplified (Douglas–Peucker) and triangulated here (ear clipping); the client extrudes them, adds the
// black inverted-hull outline and builds one EditableMesh per model.
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const TOL = 0.012; // simplification tolerance in model units (a pick is ~4.4 tall)
const r3 = (v) => Math.round(v * 1000) / 1000;

function area(p) {
	let a = 0;
	for (let i = 0; i < p.length; i++) {
		const [x1, y1] = p[i], [x2, y2] = p[(i + 1) % p.length];
		a += x1 * y2 - x2 * y1;
	}
	return a / 2;
}
function segDist(p, a, b) {
	const dx = b[0] - a[0], dy = b[1] - a[1], l = dx * dx + dy * dy;
	let t = l ? ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / l : 0;
	t = Math.max(0, Math.min(1, t));
	return Math.hypot(p[0] - a[0] - t * dx, p[1] - a[1] - t * dy);
}
function dp(pts, tol) {
	if (pts.length < 3) return pts;
	let max = 0, idx = 0;
	for (let i = 1; i < pts.length - 1; i++) {
		const d = segDist(pts[i], pts[0], pts[pts.length - 1]);
		if (d > max) (max = d), (idx = i);
	}
	if (max <= tol) return [pts[0], pts[pts.length - 1]];
	const a = dp(pts.slice(0, idx + 1), tol), b = dp(pts.slice(idx), tol);
	return a.slice(0, -1).concat(b);
}
// closed polygon: split at the two farthest-apart points so both halves simplify independently
function simplifyClosed(pts) {
	if (pts.length <= 8) return pts;
	let far = 0, j = 0;
	for (let i = 1; i < pts.length; i++) {
		const d = Math.hypot(pts[i][0] - pts[0][0], pts[i][1] - pts[0][1]);
		if (d > far) (far = d), (j = i);
	}
	const a = dp(pts.slice(0, j + 1), TOL), b = dp(pts.slice(j).concat([pts[0]]), TOL);
	const out = a.slice(0, -1).concat(b.slice(0, -1));
	return out.length >= 3 && Math.abs(area(out)) > Math.abs(area(pts)) * 0.9 ? out : pts;
}
function inTri(p, a, b, c) {
	const s = (p1, p2, p3) => (p1[0] - p3[0]) * (p2[1] - p3[1]) - (p2[0] - p3[0]) * (p1[1] - p3[1]);
	const d1 = s(p, a, b), d2 = s(p, b, c), d3 = s(p, c, a);
	return !((d1 < 0 || d2 < 0 || d3 < 0) && (d1 > 0 || d2 > 0 || d3 > 0));
}
// ear clipping on a CCW polygon; returns index triples
function triangulate(pts) {
	const idx = pts.map((_, i) => i), tris = [];
	let guard = 0;
	while (idx.length > 3 && guard++ < 10000) {
		let clipped = false;
		for (let k = 0; k < idx.length; k++) {
			const i0 = idx[(k - 1 + idx.length) % idx.length], i1 = idx[k], i2 = idx[(k + 1) % idx.length];
			const a = pts[i0], b = pts[i1], c = pts[i2];
			const cross = (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]);
			if (cross <= 1e-12) continue;
			let inside = false;
			for (const j of idx) {
				if (j === i0 || j === i1 || j === i2) continue;
				if (inTri(pts[j], a, b, c)) { inside = true; break; }
			}
			if (inside) continue;
			tris.push(i0, i1, i2);
			idx.splice(k, 1);
			clipped = true;
			break;
		}
		if (!clipped) {
			// degenerate leftovers: fan the rest so nothing is lost
			for (let k = 1; k < idx.length - 1; k++) tris.push(idx[0], idx[k], idx[k + 1]);
			return tris;
		}
	}
	if (idx.length === 3) tris.push(idx[0], idx[1], idx[2]);
	return tris;
}
const col = (c) => `"${(c || "#000000").replace("#", "").toUpperCase()}"`;
const vec = (v) => v.map(r3).join(", ");

function emitModel(prims) {
	const out = [];
	let points = 0;
	for (const p of prims) {
		if (p.t === "poly") {
			let pts = p.pts.map(([x, y]) => [x, y]);
			if (area(pts) < 0) pts.reverse();
			pts = simplifyClosed(pts);
			const tris = triangulate(pts);
			points += pts.length;
			out.push(
				`{ "${p.fx ? "q" : "p"}", ${r3(p.z)}, ${r3(p.d)}, ${col(p.c)}, ${col(p.side || p.c)}, ${r3(p.ol || 0)}, { ${pts
					.map(([x, y]) => `${r3(x)}, ${r3(y)}`)
					.join(", ")} }, { ${tris.map((i) => i + 1).join(", ")} }${p.bevel ? ", 1" : ""} }`,
			);
		} else if (p.t === "cyl") {
			out.push(`{ "c", ${vec(p.a)}, ${vec(p.b)}, ${r3(p.r)}, ${col(p.c)}, ${r3(p.ol || 0)} }`);
		} else if (p.t === "ball") {
			out.push(`{ "b", ${vec(p.at)}, ${r3(p.r)}, ${col(p.c)}, ${r3(p.ol || 0)} }`);
		} else if (p.t === "glow") {
			out.push(`{ "g", ${vec(p.at)}, ${r3(p.r)}, ${col(p.c)} }`);
		} else if (p.t === "box") {
			out.push(
				`{ "x", ${vec(p.at)}, ${vec(p.s)}, ${r3(p.ry || 0)}, ${r3(p.rz || 0)}, ${col(p.c)}, ${col(p.top || p.c)}, ${col(p.side || p.c)}, ${r3(p.ol || 0)} }`,
			);
		} else if (p.t === "hcyl") {
			out.push(`{ "h", ${vec(p.at)}, ${r3(p.r)}, ${r3(p.len)}, ${col(p.c)}, ${r3(p.ol || 0)} }`);
		}
	}
	return { text: `{\n\t\t${out.join(",\n\t\t")},\n\t}`, points };
}

function moduleText(items, header) {
	const lines = [];
	let total = 0;
	for (const [id, prims] of Object.entries(items)) {
		const m = emitModel(prims);
		total += m.points;
		lines.push(`\t${id} = ${m.text},`);
	}
	const text = `--!strict\n-- GENERATED by assets/pickaxes/export-roblox.mjs from ${header}. Do not edit by hand.\n-- p = extruded polygon {z, depth, face, side, outline, points, triangles}; c = cylinder; b = ball; g = glow;\n-- x = box; h = half cylinder (chest lid).\nreturn {\n${lines.join("\n")}\n} :: { [string]: { { any } } }\n`;
	return { text, total };
}
function write(file, items, header) {
	const { text, total } = moduleText(items, header);
	writeFileSync(file, text);
	console.log(`${file}: ${Object.keys(items).length} models, ${total} polygon points, ${text.length} chars`);
}

// one module per family: a Roblox ModuleScript holds at most 200 000 characters
// [владелец 12.11: «кирки плоские»] thicker metal: solid slabs ×THICK, the thin front decals ride on the new front face
// of the slab they sat on, and the decals are mirrored onto the back so the pickaxe reads from both sides
const THICK = 2.4; // [владелец 12.11 ×2: «плоские»] with the client taper (CelPicks) towards the tips
function thicken(prims) {
	const solid = prims.filter((p) => p.t === "poly" && !p.fx && p.d >= 0.15);
	const fronts = [...new Set(solid.map((p) => +(p.z + p.d / 2).toFixed(3)))].sort((a, b) => a - b);
	const out = [];
	for (const p of prims) {
		if (p.t !== "poly" || p.fx) {
			out.push(p);
		} else if (p.d >= 0.15) {
			out.push({ ...p, z: p.z * THICK, d: p.d * THICK, bevel: 1 });
		} else {
			// the slab front this decal sits on: the largest original front not above it
			const z = p.z;
			const front = fronts.filter((f) => f <= Math.abs(z) + 0.02).pop() ?? 0;
			const solidAt = solid.find((q) => +(q.z + q.d / 2).toFixed(3) === front);
			const newFront = solidAt ? solidAt.z * THICK + (solidAt.d * THICK) / 2 : front;
			const shifted = Math.sign(z) * (Math.abs(z) + newFront - front);
			out.push({ ...p, z: shifted });
			if (z > 0) out.push({ ...p, z: -shifted });
		}
	}
	return out;
}
const picks = Object.fromEntries(
	Object.entries(JSON.parse(readFileSync(join(here, "picks-cel.json"), "utf8")).picks).map(([id, prims]) => [id, thicken(prims)]),
);
const dir = join(here, "../../src/client/Fx/CelPickData");
mkdirSync(dir, { recursive: true });
const families = [...new Set(Object.keys(picks).map((id) => id.split("_")[0]))];
for (const family of families) {
	const items = Object.fromEntries(Object.entries(picks).filter(([id]) => id.startsWith(family + "_")));
	write(join(dir, `${family}.luau`), items, "assets/pickaxes/picks-cel.json");
}
writeFileSync(
	join(dir, "init.luau"),
	`--!strict\n-- GENERATED by assets/pickaxes/export-roblox.mjs: all cel pickaxes, merged from the per-family modules.\nlocal all: { [string]: { { any } } } = {}\nfor _, name in { ${families
		.map((f) => JSON.stringify(f))
		.join(", ")} } do\n\tfor id, prims in require(script:FindFirstChild(name) :: ModuleScript) :: { [string]: { { any } } } do\n\t\tall[id] = prims\n\tend\nend\nreturn all\n`,
);
const chests = JSON.parse(readFileSync(join(here, "../chests/chests.json"), "utf8")).chests;
write(join(here, "../../src/client/Fx/CelChestData.luau"), chests, "assets/chests/chests.json");
