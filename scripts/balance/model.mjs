// Coarse pacing model (expected values, 1 s step). NOT the real simulator: that one runs the game code at stage 3.
import * as D from './data.mjs';

const HOURS = Number(process.argv[2] ?? 40);
export { clock, fmt };
const REB = Number(process.env.REB ?? 0.1);
const STAGED_RARE = Number(process.env.STAGED ?? 900); // first Pickaxe Chest is staged: guaranteed Rare at ~15:00
let EFF = Number(process.env.EFF ?? 1); // share of time the player actually hits
let PASS = Number(process.env.PASS ?? 1); // ×2 Coins game pass
let FAM = process.env.FAM ?? 'smart'; // storm | dynamite | rift | frost | rotate | smart | none
const FAMS = ['storm', 'dynamite', 'rift', 'frost'];
const VERBOSE = process.argv.includes('-v');
const fmt = (n) => { const u = ['', 'K', 'M', 'B', 'T', 'Qa', 'Qi', 'Sx']; let i = 0; while (n >= 1000 && i < u.length - 1) { n /= 1000; i++; } return (n >= 100 ? n.toFixed(0) : n >= 10 ? n.toFixed(1) : n.toFixed(2)) + u[i]; };
const clock = (s) => { const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), x = Math.floor(s % 60); return (h ? h + ':' + String(m).padStart(2, '0') : m) + ':' + String(x).padStart(2, '0'); };

export function simulate(hours = HOURS, o = {}) {
	if (o.eff) EFF = o.eff;
	if (o.pass) PASS = o.pass;
	if (o.fam) FAM = o.fam;
	const perm = { cups: 0, width: 0, rar: 0, goldTier: -1, keys: 0, opens: 0, hits: 0, eggs: 0, record: 1, rebirths: 0, t: 0, maxCoins: 0, fam: { storm: [0, 0, 0, 0], dynamite: [0, 0, 0, 0], rift: [0, 0, 0, 0], frost: [0, 0, 0, 0] }, lastK: 1, famRuns: {} };
	let c; // circle state
	const log = []; const firsts = []; const circles = [];
	const ev = (s) => log.push(`${clock(perm.t).padStart(8)}  ${s}`);

	function rank() { let r = {}; for (const k of D.rebirth.ranks) if (perm.cups >= k.cups) r = { ...r, ...k }; return r; }
	function newCircle() {
		const r = rank();
		const lift = Math.min(r.lift ?? 1, Math.max(1, perm.record - 1));
		c = { t0: perm.t, depth: D.worlds[lift - 1].start, coins: 0, size: (r.size ?? 1) - 1, lvl: 1, cards: {}, deepest: 0, plateLeft: 0, lastPlate: perm.t, startWorld: lift };
		for (const k of D.cards) c.cards[k.id] = 0;
		c.family = FAM === 'none' ? null : FAM === 'rotate' ? FAMS[perm.rebirths % 4] : FAM === 'smart' ? (perm.rebirths === 0 ? 'storm' : perm.lastK >= 2 ? 'frost' : perm.rebirths % 3 === 0 ? 'storm' : 'rift') : FAM;
		if (c.family) perm.famRuns[c.family] = (perm.famRuns[c.family] ?? 0) + 1;
	}
	const F = D.familySkill;
	const sk = (f, i) => (c.family === f && perm.rar >= 1 ? perm.fam[f][i] : 0);
	const famLevels = () => FAMS.reduce((a, f) => a + perm.fam[f].reduce((x, y) => x + y, 0), 0);
	function worldAt(depth) { for (const w of D.worlds) if (depth < w.start + w.length) return w; return null; }
	function rarOwned() {
		// deterministic free-player chest timeline: rare on open 2, epic on open 10 (pity) or 5th rebirth, legendary on open 60 or Slab 8
		let r = perm.t >= 225 ? 1 : 0;
		if (perm.t >= STAGED_RARE || perm.opens >= 3) r = 2;
		if (perm.opens >= 10 || perm.cups >= 30) r = 3;
		if (perm.opens >= 60 || perm.record > 8) r = 4;
		return r;
	}
	function stats() {
		const w = worldAt(c.depth);
		const f = (c.depth - w.start) / w.length;
		const H = w.hardStart + (w.hardEnd - w.hardStart) * f;
		const R = D.rarities[perm.rar];
		const isGold = perm.goldTier >= perm.rar;
		const cap = R.cap + (isGold ? D.gold.capBonus : 0);
		const power = R.power * (isGold ? D.gold.power : 1) * D.pickLevel.powerPerLevel ** (c.lvl - 1) * (1 + D.cards[0].per) ** c.cards.power * (1 + F.frostPower * sk('frost', 1));
		const k = Math.min(D.mine.maxHitsPerBlock, Math.max(1, Math.ceil(H / power)));
		let pierce = 1; for (const p of D.mine.pierce) if (power >= p.ratio * H) pierce = p.layers;
		const S = D.hitSizes[c.size];
		const hps = EFF / S.interval;
		const feat = c.family && perm.rar >= 1 ? R.extra * (1 + F.feature * perm.fam[c.family][0]) : 0;
		const brittle = F.frostBrittle * sk('frost', 3);
		const perHit = (S.blocks * S.eff * pierce * (1 + F.riftPierce * sk('rift', 3)) + feat) * (brittle + (1 - brittle) / k);
		const slots = rank().petSlots ?? 1;
		const eggTier = perm.record >= 7 ? 4 : perm.record >= 4 ? 2 : 1;
		const petRar = perm.eggs >= 40 ? 4 : perm.eggs >= 10 ? 2 : 1;
		const petBlocks = perm.eggs > 0 ? Math.min(slots, perm.eggs) * petRar * eggTier / k : 0;
		const bpl = D.mine.widths[perm.width].w * D.mine.height;
		const ult = R.ult * D.pickLevel.ultPerLevel ** (c.lvl - 1) * (1 + F.riftUlt * sk('rift', 1)) * (1 + F.riftEcho * sk('rift', 2)) / k;
		const ultPeriod = D.mine.ultCharge / hps + 1.5;
		const tapLayers = (perHit * hps + petBlocks) / bpl;
		const layers = tapLayers + (c.depth > 20 || perm.rebirths ? ult / ultPeriod : 0);
		const dc = sk('dynamite', 2);
		const value = 2.95 * w.rockValue * (1 + (D.income.chestBonus - 1) * (1 + F.dynChestCoins * dc) * (1 + F.dynChestMore * dc));
		const mult = (1 + perm.cups) * (1 + 0.2 * c.cards.coins) * D.income.tempAvg * D.income.feverAvg * PASS * (1 + F.stormCoins * sk('storm', 1)) * (1 + F.accountCoinsPerLevel * famLevels());
		return { w, H, power, k, pierce, layers, tapLayers, ult, ultPeriod, coins: layers * bpl * value * mult, cap, hps, R };
	}
	function shop() {
		// "kid AI": buy the cheapest thing that is affordable, repeat
		for (let guard = 0; guard < 200; guard++) {
			const s = stats();
			const opts = [];
			if (c.size < D.hitSizes.length - 1) opts.push({ cost: D.hitSizes[c.size + 1].price, do: () => { c.size++; if (!perm.rebirths) ev(`удар ${D.hitSizes[c.size].shape}`); } });
			if (perm.width < D.mine.widths.length - 1 && perm.record >= D.mine.widths[perm.width + 1].world) opts.push({ cost: D.mine.widths[perm.width + 1].price, do: () => { perm.width++; ev(`ширина ${D.mine.widths[perm.width].w}`); } });
			if (c.lvl < s.cap) opts.push({ cost: s.R.lvlC0 * D.pickLevel.costGrowth ** (c.lvl - 1), do: () => c.lvl++ });
			for (const k of D.cards) if (perm.record >= k.world && c.cards[k.id] < (k.cap ?? 1e9)) opts.push({ cost: k.c0 * D.cardGrowth ** c.cards[k.id], do: () => { c.cards[k.id]++; if (!perm.rebirths && (c.cards[k.id] === 1 || (k.steps ?? []).includes(c.cards[k.id]))) ev(`карточка ${k.name} ур. ${c.cards[k.id]}`); } });
			if (c.family && perm.rar >= 1) { const lv = perm.fam[c.family]; const tot = lv.reduce((x, y) => x + y, 0); for (let i = 0; i < 4; i++) if (tot >= F.unlockAt[i] && lv[i] < F.levels) opts.push({ cost: F.firstCost * F.costGrowth ** lv[i], do: () => lv[i]++ }); }
			opts.sort((a, b) => a.cost - b.cost);
			if (!opts.length || opts[0].cost > c.coins) return;
			c.coins -= opts[0].cost; opts[0].do();
		}
	}
	function doRebirth(reason) {
		const gain = D.rebirth.cups[c.deepest - 1] ?? 0;
		perm.cups += gain; perm.rebirths++; circles.push(perm.t - c.t0); perm.lastK = stats().k;
		ev(`ПЕРЕРОЖДЕНИЕ №${perm.rebirths} (${reason}): круг ${clock(perm.t - c.t0)}, дошёл до мира ${c.deepest + 1}, +${gain} 🏆 → ×${1 + perm.cups}; кирка ${D.rarities[perm.rar].name} ур. ${c.lvl}; Сила-карта ${c.cards.power}`);
		newCircle();
	}

	newCircle();
	let done = false;
	for (; perm.t < hours * 3600 && !done; perm.t++) {
		// permanent drips
		const sNow = stats();
		perm.hits += sNow.hps;
		const keyRate = (1 / 8000) * (1 + 0.05 * Math.min(20, c.cards.keys)) * 1.3 * (1 + F.dynKeys * sk('dynamite', 1)); // accumulator + wall chests
		perm.keys += sNow.hps * keyRate + F.dynUltChest * sk('dynamite', 3) * 0.0126 / sNow.ultPeriod;
		while (perm.keys >= 1) { perm.keys--; perm.opens++; if ([2, 10, 60].includes(perm.opens)) ev(`сундук кирок №${perm.opens}`); }
		if (perm.t === 360) perm.eggs = 1;
		if (perm.t > 360) perm.eggs += D.pets.eggsPerHour / 3600;
		if (perm.opens >= 30 && perm.goldTier < 2) perm.goldTier = 2;
		if (perm.opens >= 120 && perm.goldTier < 3) perm.goldTier = 3;
		const r = rarOwned();
		if (r !== perm.rar) { perm.rar = r; c.lvl = 1; ev(`кирка: ${D.rarities[r].name}`); }

		shop();
		const s = stats();
		if (c.plateLeft > 0) {
			c.plateLeft--; c.coins += 0;
			if (c.plateLeft <= 0) {
				c.deepest = s.w.id; c.depth = s.w.start + s.w.length; c.lastPlate = perm.t;
				const first = s.w.id >= perm.record; if (first) firsts.push({ w: s.w.id, t: perm.t, unit: s.coins * 60 / (1 + perm.cups) / PASS, s: `м${s.w.id} ${clock(perm.t)} (×${1 + perm.cups}, №${perm.rebirths}, k=${s.k})` });
				if (first) perm.record = s.w.id + 1;
				if (first || VERBOSE) ev(`Плита мира ${s.w.id} пробита${first ? ' (впервые)' : ''}: круг ${clock(perm.t - c.t0)}, Сила ${fmt(s.power)} / нужно ${fmt(s.w.hardEnd)}, ульта ${fmt(s.ult)} сл., монеты ${fmt(c.coins)}, доход ${fmt(s.coins)}/с`);
				if (s.w.id === 10) { ev('ЯДРО ПРОЙДЕНО'); done = true; }
			}
			continue;
		}
		c.coins += s.coins; perm.maxCoins = Math.max(perm.maxCoins, c.coins);
		c.depth += s.layers;
		const end = s.w.start + s.w.length;
		if (c.depth >= end - 1) {
			c.depth = end - 1;
			c.plateLeft = Math.ceil(D.mine.plateHits * Math.min(8, Math.max(1, s.w.hardEnd / s.power)) / s.hps / (1 + F.frostSlab * sk('frost', 2)));
			continue;
		}
		// rebirth decision
		if (c.deepest >= D.rebirth.firstAfterWorld) {
			const eta = (end - c.depth) / s.layers;
			const circle = perm.t - c.t0;
			const gain = D.rebirth.cups[c.deepest - 1];
			if (gain >= REB * (1 + perm.cups) && circle > 5 * 60 && s.k >= 2 && eta > 15 * 60) doRebirth('выгодно');
		}
	}
	return { log, firsts, circles, perm };
}

if (import.meta.url === `file://${process.argv[1]}`) {
	const { log, firsts, circles, perm } = simulate();
	if (!process.env.Q) console.log(log.join('\n'));
	console.log('первые Плиты: ' + firsts.map((f) => f.s).join(' | '));
	circles.sort((a, b) => a - b); if (circles.length) console.log(`круги: медиана ${clock(circles[circles.length >> 1])}, макс ${clock(circles[circles.length - 1])}`);
	console.log('семьи: ' + FAMS.map((f) => `${f} ${perm.fam[f].join('/')} (${perm.famRuns[f] ?? 0} кр.)`).join(' | '));
	console.log(`\nИтог за ${clock(perm.t)}: перерождений ${perm.rebirths}, Кубков ${perm.cups}, рекорд — мир ${perm.record}, ключей открыто ${perm.opens}, яиц ${Math.floor(perm.eggs)}, макс. монет ${fmt(perm.maxCoins)}`);
}
