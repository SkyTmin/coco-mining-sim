--!strict
-- Profile schema v3 (docs/GAME-DESIGN.md, docs/PLAN.md stage 1).

-- [владелец 27.10: «в меню настройки общие … скрыть уведомления … бар бустеров … языки … уменьшить звук, выключить»]
export type Settings = {
	mouseSensitivity: number?, -- 0.2..3, default 1
	touchSensitivity: number?, -- separate touch camera multiplier
	brightness: number?, -- 0.5..1.5, default 1
	volume: number?, -- 0..1, default 1
	muted: boolean?,
	hideToasts: boolean?,
	hideBoosters: boolean?,
	hideRequirements: boolean?,
	trackedUpgrade: string?, -- "level" or equipment id:minimum tier; empty = tutorial only
	autosellOff: boolean?, -- the bought auto-sell switched off [владелец 28.10]
	autosellTextOff: boolean?, -- no «+0,057 $» at the crosshair
	-- the chat (этап 3): «[Совет]» lines off [клиент settings.elements.advice_toggle], /pay and /gift refused to
	-- this player [клиент pay.*, gift.*], the other players hidden (/hide, local only)
	tipsOff: boolean?,
	payOff: boolean?,
	giftOff: boolean?,
	hidePlayers: boolean?,
	-- PRIS+ (этап 8, the /pp menu) [клиент prison_plus.*]: the auto-dig, the night on this screen, the AppleSkin line
	-- (on by default); the enchant particles of PRIS+ players hidden on this screen [сеть TG/40]
	autoDig: boolean?,
	night: boolean?,
	appleSkinOff: boolean?,
	enchantFxOff: boolean?,
	-- the chat (Roblox's chat window, ChatWindow): window size 1–3 (Маленький / Средний / Большой, default 2), the
	-- background 1–3 (Тёмный / Обычный / Без фона, default 2), no bubbles over heads, the whole chat off
	chatSize: number?,
	chatBack: number?,
	bubblesOff: boolean?,
	chatOff: boolean?,
	auctionAdsOff: boolean?, -- other players' paid auction announcements hidden (banner + chat line)
}

export type ItemStack = {
	id: string, -- item id: block id ("dirt"), tool id ("pickaxe"), consumable ("apple"), key ("ordinary_key")
	count: number,
	level: number?, -- for tools/weapons/armor
	books: { { id: string, level: number } }?, -- ancient enchantments on the item
	rarity: string?, -- rolled ancient book rarity
	applyChance: number?, -- ancient book application percentage
	coins: number?, -- unclaimed case money bag, in 1/moneyScale
	-- a brewed potion (Shared/Potions): effects with their seconds, «Улучшить», the brewer's name
	potion: { effects: { { id: string, seconds: number } }, upgraded: boolean?, by: string? }?,
}

export type ArtifactTier = {
	fragments: { [number]: number },
	duplicates: number,
	completed: number,
}

export type Needs = { hygiene: number, sleep: number, toilet: number }

export type Professions = {
	xp: { [string]: number }, -- mason / surveyor / blademaster
	level: { [string]: number },
	points: number, -- unspent upgrade points
	upgrades: { blocks: number, money: number, mobs: number },
}

export type Profile = {
	schemaVersion: number,
	locale: string?, -- explicit manual choice; nil uses the session/account language, never persisted automatically
	level: number,
	coins: number, -- integer, in 1/moneyScale
	blocksTotal: number, -- cumulative blocks with multipliers (never spent)
	counters: { [string]: number }, -- upgrade counters by display name ("Земля", "Крысы", …)
	inventory: { [number]: ItemStack }, -- slots 1..36 (1..9 = hotbar)
	caseContents: { [string]: { [number]: ItemStack } }, -- per case kind, sparse slots 1..27; schema stays v3
	-- personal sparse slots: the Хранилище (ender chest) has up to 3 sections of 27 [сеть S6], section s = slots
	-- (s − 1)·27 + 1 … s·27; schema stays v3
	enderChest: { [number]: ItemStack },
	vaultSections: number?, -- unlocked Хранилище sections 1..3 (CaseService VaultUnlock); nil = 1
	artifacts: { [string]: ArtifactTier }, -- common / rare / epic; schema stays v3
	armor: { [string]: ItemStack }, -- helmet / chestplate / leggings / boots
	selectedSlot: number,
	professions: Professions,
	keys: { [string]: number },
	passes: { [string]: boolean }, -- basement = true
	needs: Needs,
	needsFree: boolean?,
	autosell: boolean?, -- the auto-sell was bought (used): dug blocks are sold at once [владелец 28.10] -- the injection «Без нужд» was used: needs never drain [владелец 28.10]
	hunger: number, -- 0..20
	saturation: number?, -- 0..hunger, spent before hunger [ваниль]; nil = 0; schema stays v3
	crystals: number?, -- donate currency (DonateService, bought for Robux); nil = 0; schema stays v3
	receipts: { string }?, -- the last Robux purchase ids already granted (ProcessReceipt is retried)
	auctionSlots: number?, -- extra auction slots bought in the donate shop
	-- PRIS+ (Shared/PrisPlus, этап 8): os.time() it ends; the «Удаление комиссии на Аукционе» purchase (for good);
	-- rubies [вики DONATE-SHOP-BOOSTERS] — whole, never negative
	prisPlusUntil: number?,
	noAuctionFee: boolean?,
	-- paid auction announcements (AuctionService): credits bought and not used yet; the one waiting in the shared queue
	announceCredits: number?,
	announcePending: { lot: string, at: number }?,
	rubies: number?,
	stash: { { id: string, count: number } }?, -- bought items that did not fit the inventory, claimed from storage [B]
	achievements: { [string]: number }, -- «Копатель» card id (counter name or block id) = claimed tier
	dug: { [string]: number }?, -- blocks without an upgrade counter, per block id (achievements); schema stays v3
	boosters: { { kind: string, mult: number, minutes: number, count: number, scope: string? } }?, -- booster storage; schema stays v3
	activeBoosters: { { kind: string, mult: number, startsAt: number, endsAt: number } }?, -- local, running + queued; schema stays v3
	pendingBoosters: {
		[string]: { kind: string, mult: number, minutes: number, count: number, scope: string? },
	}?, -- shared activations between their steps (BoosterService); schema stays v3
	auction: {
		lots: { [string]: any }, -- lot id → Auction.Summary of the player's listed lots
		pendingSells: { [string]: any }, -- listings not confirmed yet (AuctionService outbox)
		pendingBuys: { [string]: { price: number, op: string, at: number, seller: number? } },
		returns: { ItemStack }, -- items that did not fit («Забрать»)
	}?, -- the auction; schema stays v3
	-- rats, zombies, bats, kills, deaths, warzonePoints (points taken on the Дворы), playSeconds (time in the game),
	-- referrals («Приглашено друзей»: invited friends who reached the friend level)
	stats: { [string]: number },
	lastPosition: { number }?, -- {x, y, z} where the player left; restored on the next join [владелец]
	lastSeen: number?, -- os.time() of that spot; older than rules.teleport.rejoinReturnSeconds = back to the spawn
	nicknames: { string }?, -- owned nicknames from the nickname case; schema stays v3
	skills: { [string]: number }?, -- the skill tree: branch id → bought levels (Shared/Skills); schema stays v3
	potionBrewedAt: number?, -- server time of the last brew: the potion stand charges from it (Shared/Potions)
	nickname: string?, -- the active nickname (Shared/Nicknames, «Ваши клички»), nil = none; schema stays v3
	trainer: { [string]: number }?, -- strength / agility / needs levels (Config.trainer); schema stays v3
	faction: string?, -- white / black / yellow / latino (Config.factions); nil = none; schema stays v3
	factionChanges: number?, -- «Смен фракций» [клиент]; schema stays v3
	-- the gang (GangService; the gang document in DataStore Gangs_v1 is the truth, this is the player's side):
	-- id = the gang, leftAt = os.time() of the last voluntary leave (rejoin cooldown); schema stays v3
	gang: { id: string?, leftAt: number? }?,
	-- gang steps that move money or membership between the profile and the gang document, settled on load
	gangOps: {
		[string]: {
			kind: string,
			gang: string,
			amount: number?,
			cur: string?,
			what: string?,
			tag: string?,
			at: number,
		},
	}?,
	hudLayout: { [string]: { [string]: { number } } }?, -- mode → element id → {x, y, shown, size} (HudLayout); schema stays v3
	hudLayoutVersion: number?, -- one-time migration to the visible hotbar-side camera control
	settings: Settings?, -- the settings window (SettingsWindow); nil = the defaults; schema stays v3
	-- «Пригласить друга» (ReferralService): by = the inviter's userId, set once on a brand-new profile that joined
	-- through an invite; credited = this friend reached Config.referrals.friendLevel and is in the inviter's record
	referral: { by: number, credited: boolean? }?,
	-- the inviter's side: seen = friend userIds already counted (each pays once), rewarded = rewards paid (≤ maxRewards)
	invites: { seen: { [string]: boolean }, rewarded: number }?,
	-- the «Избранное» card (FavoriteCard): done = added, never shown again; laterUntil = os.time() of the next showing
	favorite: { done: boolean?, laterUntil: number? }?,
	-- /thx (ChatCommandService): the shared boosters already thanked for, booster key → its endsAt (pruned later)
	thanked: { [string]: number }?,
	-- «Ежедневные награды» (DailyService, Shared/Daily): streak = rewards in a row, lastDay = Moscow day number of the
	-- last one, lastAt = its server time
	daily: { streak: number, lastDay: number, lastAt: number }?,
	canteen: number?, -- Столовая: the opening (Daily.canteenPeriod) whose portion was taken
	location: string,
	operationIds: { [string]: boolean },
	tutorial: {
		version: number,
		step: number,
		upgradedAt: number?,
		upgradeSold: boolean?,
		levelSold: boolean?,
		ordinaryCaseOpened: boolean?,
		dropId: string?,
		completedAt: number?,
		legacy: boolean?,
	}?,
}

return {}
