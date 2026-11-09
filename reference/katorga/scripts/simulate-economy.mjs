// Economy pace simulation: minutes of continuous digging to reach each level.
// Model: one player, digs in the newest mostly-diggable mine, but goes where the blocks for its main tool's next upgrade
// come fastest while they are missing (--greedy: never; the old model),
// sells instantly, buys/upgrades tools greedily, levels up as soon as blocks and money allow.
// Needs, bosses, combo and key drops are ignored (conservative estimate).
// Usage: node scripts/simulate-economy.mjs [maxLevel=15]
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const cfg = (n) => JSON.parse(readFileSync(join(root, "src", "shared", "Config", n), "utf8"));
const levels = cfg("levels.json");
const { blocks } = cfg("blocks.json");
const { locations } = cfg("locations.json");
const toolsCfg = cfg("tools.json");
const maxLevel = Number(process.argv[2] ?? 15);

const TIER_INDEX = { wood: 0, stone: 1, iron: 2, diamond: 3 };
const TOOL_SPEED = toolsCfg.vanilla.toolSpeed;
const TICK = 0.05;
const OVERHEAD = 0.2; // seconds per block: aim + step, caps digging at ~5 blocks/s

function toolState(id, level) {
	const t = toolsCfg.tools[id];
	const up = t.upgrades.find((u) => u.to === level);
	const material = level === 1 ? "wood" : up.materialAfter;
	const enchant = level === 1 ? 0 : up.enchantAfter;
	return { material, enchant };
}
function breakTime(block, tool) {
	if (block.itemOnly) return null;
	if (block.tool === "any") return Math.max(TICK, (block.hardness * 1.5) / 1);
	if (!tool) return null;
	const { material, enchant } = tool;
	if (TIER_INDEX[material] < block.minTier) return null;
	const mult = TOOL_SPEED[material] + (enchant > 0 ? enchant * enchant + 1 : 0);
	return Math.max(TICK, (block.hardness * 1.5) / mult);
}

const player = {
	level: 1,
	money: 0,
	blocksTotal: 0,
	counters: {}, // upgrade counters: Земля, Камень, Крысы...
	tools: { shovel: 1, pickaxe: 0, axe: 0 },
	seconds: 0,
};
const milestones = [];
const log = [];

function priceMultiplier() {
	return 1; // upgrade multiplier is earned via profession points; ignored in the conservative model
}
function evaluate(loc) {
		let dollarsPerSec = 0;
		let total = 0;
		let detail = [];
		for (const [bid, share] of Object.entries(loc.mine.shares)) {
			if (bid === "air") { total += share; continue; } // empty cells: nothing to dig, nothing to earn
			const b = blocks[bid];
			const toolLevel = player.tools[b.tool];
			const tool = toolLevel > 0 ? toolState(b.tool, toolLevel) : null;
			const t = breakTime(b, tool);
			if (t === null) continue; // can't harvest this block type yet
			const sellId = b.dropsAs ?? bid;
			const price = blocks[sellId].basePrice * priceMultiplier();
			dollarsPerSec += (share * price) / (t + OVERHEAD); // +0.1 s to move to the next block
			total += share;
			detail.push({ bid, t, price });
		}
		if (total === 0) return null;
		const blocksPerSec = detail.reduce((s, d) => s + (loc.mine.shares[d.bid] / total) / (d.t + OVERHEAD), 0);
		return { loc, dollarsPerSec: dollarsPerSec / total, blocksPerSec, detail, total };
}
function unlockedMines() {
	return locations.filter((loc) => loc.unlockLevel <= player.level && !loc.requiresPass && loc.kind === "mine");
}
// [08.11] like a real player following the upgrade tracker: when the main tool of the chosen mine cannot be upgraded
// for lack of some block counters, dig where those blocks come fastest (still only mines the player can dig)
function seekUpgrade(best) {
	if (!best || !SEEK) return best;
	const toolShare = {};
	for (const d of best.detail) {
		const t = blocks[d.bid].tool;
		toolShare[t] = (toolShare[t] ?? 0) + best.loc.mine.shares[d.bid];
	}
	const main = Object.entries(toolShare).sort((a, b) => b[1] - a[1])[0]?.[0];
	if (!main || !player.tools[main]) return best;
	const up = toolsCfg.tools[main].upgrades.find((u) => u.from === player.tools[main]);
	if (!up) return best;
	const missing = new Set(Object.entries(up.requirements).filter(([k, v]) => v != null && (player.counters[k] ?? 0) < v).map(([k]) => k));
	if (missing.size === 0) return best;
	let seek = null, seekRate = 0;
	for (const loc of unlockedMines()) {
		const cand = evaluate(loc);
		if (!cand) continue;
		let rate = 0;
		for (const d of cand.detail) {
			if (missing.has(blocks[d.bid].upgradeCounter)) rate += (loc.mine.shares[d.bid] / cand.total) / (d.t + OVERHEAD);
		}
		if (rate > seekRate) { seek = cand; seekRate = rate; }
	}
	return seek ?? best;
}
const SEEK = !process.argv.includes("--greedy");
function bestMine() {
	let best = null;
	for (const loc of unlockedMines()) {
		const cand = evaluate(loc);
		if (!cand) continue;
		const total = cand.total;
		// Real players move to the newest mine as soon as most of it is diggable (prices grow ~x4 per tier).
		if (!best || (total >= 0.5 && loc.unlockLevel >= best.loc.unlockLevel) || (best.total < 0.5 && cand.dollarsPerSec > best.dollarsPerSec)) best = cand;
	}
	return seekUpgrade(best);
}
function tryUpgrades() {
	for (const toolId of ["shovel", "pickaxe", "axe"]) {
		const t = toolsCfg.tools[toolId];
		if (player.tools[toolId] === 0) {
			// buy when the first mine that needs it is unlocked
			const needed = locations.some((l) => l.kind === "mine" && l.unlockLevel <= player.level && !l.requiresPass && Object.keys(l.mine.shares).some((b) => blocks[b] && blocks[b].tool === toolId));
			if (needed && player.money >= t.buyPrice) {
				player.money -= t.buyPrice;
				player.tools[toolId] = 1;
				log.push(`${fmt(player.seconds)} buy ${toolId}`);
			}
			continue;
		}
		const up = t.upgrades.find((u) => u.from === player.tools[toolId]);
		if (!up) continue;
		const ok = Object.entries(up.requirements).every(([k, v]) => v == null || (player.counters[k] ?? 0) >= v);
		if (ok && player.money >= up.cost) {
			player.money -= up.cost;
			player.tools[toolId] = up.to;
			log.push(`${fmt(player.seconds)} ${toolId} -> ${up.to} (${up.cost}$)`);
		}
	}
}
function tryLevelUp() {
	const next = levels.levels.find((l) => l.level === player.level + 1);
	if (!next) return false;
	if (player.blocksTotal >= next.blocks && player.money >= next.money) {
		player.money -= next.money;
		player.level = next.level;
		const bound = blocksReadyAt === null ? "blocks" : moneyReadyAt === null ? "money" : blocksReadyAt > moneyReadyAt ? "blocks" : "money";
		blocksReadyAt = null; moneyReadyAt = null;
		milestones.push({ level: player.level, minutes: player.seconds / 60, money: player.money, tools: { ...player.tools }, bound, mine: lastMine });
		return true;
	}
	return false;
}
const fmt = (s) => `${Math.floor(s / 60)}m${String(Math.floor(s % 60)).padStart(2, "0")}s`;

let blocksReadyAt = null, moneyReadyAt = null, lastMine = null;
while (player.level < maxLevel && player.seconds < 3600 * 200) {
	tryUpgrades();
	if (tryLevelUp()) continue;
	const mine = bestMine(); lastMine = mine.loc.id;
	if (!mine) throw new Error("nothing diggable");
	// dig 10 blocks worth of time
	for (let i = 0; i < 10; i++) {
		let r = Math.random() * mine.total;
		let chosen = mine.detail[mine.detail.length - 1];
		for (const d of mine.detail) {
			r -= mine.loc.mine.shares[d.bid];
			if (r <= 0) { chosen = d; break; }
		}
		player.seconds += chosen.t + OVERHEAD;
		player.blocksTotal += 1;
		player.money += chosen.price;
		const b = blocks[chosen.bid];
		if (b.upgradeCounter) player.counters[b.upgradeCounter] = (player.counters[b.upgradeCounter] ?? 0) + 1;
	}
	const next = levels.levels.find((l) => l.level === player.level + 1);
	if (blocksReadyAt === null && player.blocksTotal >= next.blocks) blocksReadyAt = player.seconds;
	if (moneyReadyAt === null && player.money >= next.money) moneyReadyAt = player.seconds;
}

console.log("Темп (чистое копание, без нужд/боссов/комбо):");
console.log("уровень | минут | накоплено $ | лопата | кирка | шахта | что держало этот уровень");
for (const m of milestones) {
	console.log(`${String(m.level).padStart(7)} | ${m.minutes.toFixed(1).padStart(5)} | ${m.money.toFixed(2).padStart(11)} | ${String(m.tools.shovel).padStart(6)} | ${String(m.tools.pickaxe).padStart(5)} | ${String(m.mine).padStart(13)} | ${m.bound}`);
}
console.log("\nПокупки и улучшения:");
for (const l of log) console.log("  " + l);
