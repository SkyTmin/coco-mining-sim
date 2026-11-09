// Balance v1 — single source for docs/design/wiki/18-balans-chisla.md and (later) scripts/design-decisions.json.
// Every number here is [решение] until the stage-3 simulator on real game code confirms it.
// Run: node scripts/balance/model.mjs [hours] [-v]   (coarse pacing model; env G, CUPS, REB, EFF, PASS for what-ifs)
//      node scripts/balance/build-doc.mjs           (writes docs/design/wiki/18-balans-chisla.md)

export const mine = {
	interval: 0.35, // seconds between hits (all pickaxes); hit size 6 = 0.30
	maxHitsPerBlock: 8,
	pierce: [ { ratio: 10, layers: 2 }, { ratio: 100, layers: 3 }, { ratio: 1000, layers: 4 } ],
	widths: [ { w: 5, price: 0 }, { w: 7, price: 5_000, world: 2 }, { w: 9, price: 500_000, world: 4 } ],
	height: 3,
	plateHits: 20, // hits to break the Guard Slab at recommended strength
	ultCharge: 45, // hits to charge the ult
};

export const oreSlots = [
	{ slot: 'rock', share: 0.70, mult: 1, rarity: 'порода' },
	{ slot: 'common', share: 0.20, mult: 3, rarity: 'обычная' },
	{ slot: 'rare', share: 0.08, mult: 10, rarity: 'редкая' },
	{ slot: 'gem', share: 0.018, mult: 50, rarity: 'драгоценная' },
	{ slot: 'treasure', share: 0.002, mult: 500, rarity: 'сокровище' },
];

const E = process.env;
const HARD_GROWTH = Number(E.G ?? 18); // per world
const HARD_INNER = 1.5; // from world start to world end
const VALUE_GROWTH = Number(E.V ?? 2); // per world
const lengths = [500, 1100, 2400, 5300, 11650, 25650, 56450, 124200, 273250, 601150];
const names = [
	['Луговой слой', ['Земля', 'Камень', 'Уголь', 'Медь', 'Светлячковый янтарь']],
	['Медные пещеры', ['Рыжий камень', 'Медь', 'Олово', 'Малахит', 'Бирюза']],
	['Кварцевые жилы', ['Белый камень', 'Кварц', 'Железо', 'Розовый кварц', 'Аметист']],
	['Золотая река', ['Песчаник', 'Серебро', 'Золото', 'Речной жемчуг', 'Самородок-великан']],
	['Ледяные гроты', ['Мёрзлый камень', 'Лёд', 'Иней-камень', 'Сапфир', 'Вечный лёд']],
	['Грибной лес', ['Грибница', 'Спорит', 'Светогриб', 'Топаз', 'Лунный камень']],
	['Кости великанов', ['Известняк', 'Кость-руда', 'Янтарь', 'Оникс', 'Драконий янтарь']],
	['Затерянный город', ['Терракота', 'Бронза', 'Нефрит', 'Лазурит', 'Древнее золото']],
	['Магмовые ключи', ['Базальт', 'Обсидиан', 'Гранат', 'Рубин', 'Огненный рубин']],
	['Ядро', ['Светокамень', 'Кристалл ядра', 'Солнечный камень', 'Звёздная пыль', 'Осколок Ядра']],
];
export const worlds = lengths.map((len, i) => ({
	id: i + 1,
	name: names[i][0],
	length: len,
	start: lengths.slice(0, i).reduce((a, b) => a + b, 0),
	rockValue: VALUE_GROWTH ** i,
	hardStart: (E.HARD ? Number(E.HARD.split(',')[i]) : HARD_GROWTH ** i),
	hardEnd: (E.HARD ? Number(E.HARD.split(',')[i]) : HARD_GROWTH ** i) * HARD_INNER,
	ores: names[i][1],
}));

// «Размер удара» — the former starter line: a shape upgrade for whatever pickaxe is in hand. Burns on rebirth.
export const hitSizes = [
	{ id: 1, shape: '1 блок', blocks: 1, eff: 1, interval: 0.35, price: 0 },
	{ id: 2, shape: '1×2', blocks: 2, eff: 0.94, interval: 0.35, price: 150 },
	{ id: 3, shape: '1×3', blocks: 3, eff: 1, interval: 0.35, price: 1_500 },
	{ id: 4, shape: 'крест (5)', blocks: 5, eff: 0.8, interval: 0.35, price: 12_000 },
	{ id: 5, shape: '3×3', blocks: 9, eff: 0.85, interval: 0.35, price: 90_000 },
	{ id: 6, shape: '3×3 быстрый', blocks: 9, eff: 0.85, interval: 0.30, price: 700_000 },
];

export const rarities = [
	{ id: 'wood', name: 'Деревянная', stars: 0, power: 1, cap: 10, ult: 10, lvlC0: 30, extra: 0 },
	{ id: 'common', name: 'Обычная', stars: 1, power: 2, cap: 10, ult: 25, lvlC0: 120, extra: 1.2, chest: 0.60 },
	{ id: 'rare', name: 'Редкая', stars: 2, power: 3, cap: 20, ult: 80, lvlC0: 3_000, extra: 2.1, chest: 0.30 },
	{ id: 'epic', name: 'Эпическая', stars: 3, power: 4.4, cap: 30, ult: 230, lvlC0: 100_000, extra: 3.6, chest: 0.085 },
	{ id: 'legendary', name: 'Легендарная', stars: 4, power: 6.4, cap: 50, ult: 460, lvlC0: 5_000_000, extra: 6.3, chest: 0.015 },
];
export const pickLevel = { powerPerLevel: 1.03, ultPerLevel: 1.05, costGrowth: 1.2 };
export const gold = { power: 1.5, capBonus: 10, need: 3 };

export const cards = [
	{ id: 'power', name: 'Сила', c0: 100, per: 0.20, mult: true, world: 2, steps: [10, 25, 50] },
	{ id: 'coins', name: 'Монеты', c0: 150, per: 0.20, world: 2, steps: [10, 25, 50] },
	{ id: 'crit', name: 'Крит', c0: 400, per: 0.02, world: 3, cap: 25, steps: [10, 25] },
	{ id: 'bolt', name: 'Молния', c0: 300, per: 0.01, world: 3, cap: 25, steps: [10, 25] },
	{ id: 'keys', name: 'Ключи', c0: 1_000, per: 0.05, world: 4, cap: 20, steps: [10, 20] },
	{ id: 'blast', name: 'Взрыв', c0: 300, per: 0.01, world: 4, cap: 25, steps: [10, 25] },
];
export const cardGrowth = 1.3;


export const rebirth = {
	firstAfterWorld: 3,
	cups: (E.CUPS ? E.CUPS.split(',').map(Number) : [0, 0, 1, 3, 8, 25, 90, 370, 1500, 6000]), // by deepest Slab broken in the circle (index = world − 1)
	ranks: [
		{ cups: 1, name: 'Копатель', gives: 'удар 1×2 с начала круга', size: 2 },
		{ cups: 3, name: 'Проходчик', gives: 'удар 1×3 с начала круга; 2-й слот питомца', size: 3, petSlots: 2 },
		{ cups: 10, name: 'Бурильщик', gives: 'Лифт: круг можно начать с мира 3', lift: 3 },
		{ cups: 30, name: 'Мастер', gives: 'Лифт до мира 4; 3-й слот питомца', lift: 4, petSlots: 3 },
		{ cups: 250, name: 'Гроссмейстер', gives: 'Лифт до мира 6; след ульты', lift: 6 },
		{ cups: 1_000, name: 'Легенда недр', gives: 'Лифт до мира 7; аура', lift: 7 },
		{ cups: 4_000, name: 'Покоритель', gives: 'Лифт до мира 8; золотой ник', lift: 8 },
		{ cups: 16_000, name: 'Сердце Ядра', gives: 'Лифт до мира 9; корона над ником', lift: 9 },
	],
};

export const pets = {
	eggsPerHour: 4,
	rarityBlocks: { common: 1, rare: 2, epic: 4, legendary: 8 }, // blocks per second at egg tier 1
	rarityLuck: { common: 0.02, rare: 0.05, epic: 0.10, legendary: 0.25 },
	odds: { common: 0.70, rare: 0.25, epic: 0.045, legendary: 0.005 },
	eggs: [
		{ id: 'meadow', name: 'Луговое яйцо', worlds: [1, 3], tier: 1, pets: ['Крыса', 'Летучая мышь', 'Мотылёк', 'Сплинтер'] },
		{ id: 'ice', name: 'Ледяное яйцо', worlds: [4, 6], tier: 2, pets: ['Зомби', 'Паук', 'Энт', 'Минотавр'] },
		{ id: 'ancient', name: 'Древнее яйцо', worlds: [7, 10], tier: 4, pets: ['Базальтовый страж', 'Король скелетов', 'Королева пауков', 'Посейдон'] },
	],
};

export const income = { chestBonus: 1.13, tempAvg: 1.3, feverAvg: 1.44 };

// ───────── content tables (not used by the pacing model, rendered into the wiki page) ─────────

export const families = [
	{ id: 'storm', name: 'Гроза', icon: '⚡', world: 2, price: 3_000, note: 'первая — бесплатно из сундука в стене (~3:45)',
		feature: ['30 % удара — цепь на 4 блока', '35 % — ветвление на 6 блоков', '40 % — разряд с потолка, 9 блоков', '45 % — шаровая молния, 14 блоков (часть уходит во 2-й слой)'],
		ult: 'Шторм', ultBonus: '5 с после ульты молния срабатывает на каждом ударе' },
	{ id: 'dynamite', name: 'Динамит', icon: '💣', world: 3, price: 40_000,
		feature: ['15 % — заряд, взрыв 3×3 (8 блоков)', '15 % — взрыв 3×3 на 2 слоя (14)', '18 % — двойной взрыв (20)', '21 % — взрыв 5×3 на 2 слоя (30)'],
		ult: 'Ковровая подрывка', ultBonus: 'блоки ульты дают ×1,5 монет' },
	{ id: 'rift', name: 'Разлом', icon: '🟧', world: 4, price: 5_000_000,
		feature: ['20 % — трещина вглубь на 6 слоёв', '21 % — на 10 слоёв', '24 % — на 15 слоёв', '25 % — трещина во всю высоту на 8 слоёв (24 блока)'],
		ult: 'Великий разлом', ultBonus: 'глубина ульты +25 %' },
	{ id: 'frost', name: 'Мороз', icon: '❄', world: 5, price: 100_000_000,
		feature: ['каждый 8-й удар раскалывает до 10 замёрзших блоков', 'каждый 7-й — до 15', 'каждый 6-й — до 22', 'каждый 5-й — до 32 (весь слой и часть следующего)'],
		ult: 'Ледниковый период', ultBonus: 'ульта в Плиту бьёт ×6 вместо ×3' },
];

export const cardSteps = {
	power: { base: '+20 % Силы за уровень (умножается)', 10: '«Тяжёлый удар»: каждый 10-й удар ×5 Силы', 25: '«Трещины»: лишний урон переходит на соседний блок', 50: '«Сквозняк»: сквозной удар +1 слой' },
	coins: { base: '+20 % монет за уровень (складывается)', 10: '«Монетный дождь»: 2 % ударов дают ×10 монет', 25: '«Жадные сундуки»: сундуки в стене ×2', 50: '«Золотая пыль»: Золотой блок вдвое чаще' },
	crit: { base: '+2 % шанса крита; крит = ×3 урона и монет удара', 10: '«Мегакрит»: каждый 10-й крит ×10', 25: '«Крит-волна»: крит пробивает +1 слой' },
	bolt: { base: '+1 % шанса молнии на любой кирке, цепь 3 блока; с Грозой в руке шанс ×2', 10: 'цепь 5 блоков', 25: 'молния ветвится, 8 блоков' },
	keys: { base: '+5 % к скорости ключей', 10: 'каждый 20-й сундук в стене — гарантированный ключ', 20: '10 % ключей — двойные' },
	blast: { base: '+1 % шанса взрыва 3×3 на любой кирке; с Динамитом в руке шанс ×2', 10: 'взрыв на 2 слоя (18 блоков)', 25: 'взрыв на 3 слоя (27 блоков)' },
};

export const keysAndChests = {
	keyPerHits: 8000,
	firstKey: 'Первый ключ — постановочный, из сундука в стене на ~15-й минуте; первый Сундук кирок гарантированно даёт Редкую',
	pickaxeChest: { odds: { common: 0.60, rare: 0.30, epic: 0.085, legendary: 0.015 }, family: 'семья — поровну из 4', pityEpic: 10, pityLegendary: 60, priceR: [79, 219, 699], dailyLimit: 30 },
	wallChests: { perLayers: 40, hits: 3, tiers: [
		{ name: 'Деревянный', share: 0.80, blocks: 50, key: 0.005 },
		{ name: 'Серебряный', share: 0.15, blocks: 200, key: 0.02 },
		{ name: 'Золотой', share: 0.045, blocks: 1_000, key: 0.08 },
		{ name: 'Кристальный', share: 0.005, blocks: 5_000, key: 0.40 },
	] },
	freeChoices: ['ранг «Мастер» (30 🏆) — эпическая кирка на выбор', 'Плита мира 8 — легендарная кирка на выбор', 'день 7 календаря — эпическая на выбор', 'день 28 календаря — легендарная на выбор'],
};

export const variants = [
	{ name: 'Золотой', oneIn: 250, blocks: 50, announce: 'нет' },
	{ name: 'Радужный', oneIn: 10_000, blocks: 2_000, announce: 'на сервер' },
	{ name: 'Космический', oneIn: 500_000, blocks: 100_000, announce: 'на все серверы' },
];
export const luck = { cap: 8, sources: ['питомцы: сумма их Удачи', 'пасс «Удача ×2»', 'Золотой час ×2', 'бустер «Удача ×2» на 15 мин'] };
export const finds = { perWorld: 6, kinds: [
	{ name: 'обычная', oneIn: 400, dupBlocks: 100, count: 4 },
	{ name: 'редкая', oneIn: 4_000, dupBlocks: 1_000, count: 1 },
	{ name: 'легендарная', oneIn: 30_000, dupBlocks: 10_000, count: 1 },
] };

export const petRules = { eggPerHits: 3000, firstEgg: 'Первое яйцо — постановочное на ~6-й минуте, в нём Крыса', merge: '3 одинаковых → Золотой (Удар и Удача ×2)', rainbowOneIn: 500, rainbowMult: 4 };

export const lavka = { everyMin: 10, slots: 4, items: [
	{ name: 'Ключ', chance: 0.30, minutes: 3 },
	{ name: 'Яйцо текущего мира', chance: 0.25, minutes: 4 },
	{ name: 'Бустер «×2 монет» 15 мин', chance: 0.20, minutes: 3 },
	{ name: 'Бустер «Удача ×2» 15 мин', chance: 0.12, minutes: 3 },
	{ name: 'Находка, которой у тебя нет', chance: 0.08, minutes: 6 },
	{ name: 'Редкая кирка (случайная семья)', chance: 0.03, minutes: 10 },
	{ name: 'Эпическая кирка', chance: 0.012, minutes: 20 },
	{ name: 'Золотое яйцо (редкий питомец или лучше)', chance: 0.006, minutes: 15 },
	{ name: 'Легендарная кирка', chance: 0.0015, minutes: 30 },
	{ name: 'Радужный питомец', chance: 0.0005, minutes: 30 },
] };

export const events = [
	{ name: 'Разгон', when: 'копаешь без пауз', gives: '4 ступени: ×1,25 / ×1,5 / ×2 / ×3 монет' },
	{ name: 'Золотая жила → Лихорадка', when: 'раз в 3–6 мин, успеть за 10 с', gives: '×5 монет на 30 с (сверх общего потолка)' },
	{ name: 'Бомба-таймер', when: 'с мира 3, раз в 2–3 мин, 5 с', gives: 'взрыв 3×3×3 и ×2 монет за него; не успел — 2 слоя пустого Завала' },
	{ name: 'Золотой час', when: 'первые 5 минут каждого часа, на всех серверах', gives: '×2 монет и ×2 Удача' },
	{ name: 'Выходные', when: 'суббота и воскресенье', gives: '×2 ключей' },
	{ name: 'Друзья на сервере', when: 'пока друг на том же сервере', gives: '+10 % монет за друга, до +50 %' },
];
export const tempCap = 10;

export const calendar = [
	'бустер «×2 монет»', 'ключ', 'яйцо', 'бустер «Удача ×2»', '2 ключа', 'яйцо', '★ эпическая кирка на выбор',
	'бустер «×2 монет»', 'ключ', 'яйцо', '2 бустера', '2 ключа', 'яйцо', '★ Золотое яйцо + скин кирки «Календарный»',
	'бустер «×2 монет»', '2 ключа', 'яйцо', '2 бустера', '3 ключа', 'яйцо', '★ 5 ключей + золотой питомец «Мотылёк»',
	'2 бустера', '3 ключа', 'Золотое яйцо', '3 бустера', '3 ключа', 'Золотое яйцо', '★ легендарная кирка на выбор',
];
export const daily = { quests: 3, rewardMinutes: 2, allThree: 'ключ' };
export const social = {
	codes: [ ['RELEASE', '2 ключа + бустер «×2 монет»'], ['CORE', 'яйцо'], ['1KLIKES', 'бустер «Удача ×2»'], ['5KLIKES', '2 ключа'], ['10KLIKES', 'Золотое яйцо'] ],
	group: 'вступил в группу → раз в день «Сундук группы»: 1 ключ',
	duel: '60 секунд, кто проехал больше слоёв; победителю монеты за 5 минут и 10 % шанс ключа, проигравшему — за 1 минуту; награда не чаще 10 дуэлей в день',
	guest: 'гость бьёт стену хозяина своей киркой; монеты получают оба, глубина растёт у хозяина',
};

export const donate = [
	['×2 Монеты', 199, 'навсегда'],
	['Автокопание', 149, 'навсегда; медленнее пальца, без Разгона'],
	['Удача ×2', 249, 'навсегда'],
	['+1 слот питомца', 199, 'навсегда'],
	['VIP', 299, '+20 % монет, 5-й слот в Лавке, значок и цвет ника'],
	['Набор новичка', 99, 'один раз: 3 ключа, яйцо, 2 бустера, скин кирки'],
	['Сундук кирок ×1 / ×3 / ×10', '79 / 219 / 699', 'шансы видны до покупки; не больше 30 в сутки'],
	['Бустер ×2 монет: личный 15 мин / серверный 30 мин / на все серверы 60 мин', '39 / 99 / 249', 'складываются в общее «×N»'],
	['Вид молнии, след ульты', '149–399', 'только красота'],
];
