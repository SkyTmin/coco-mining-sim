--!strict

export type Settings = {
	language: string?,
	camera: string,
	music: number,
	sfx: number,
	ui: number,
	reducedMotion: boolean,
	haptics: boolean,
	effects: string,
	autoQuality: number,
}

export type Circle = {
	hitSize: number,
	pickLevels: { [string]: number },
	cards: { [string]: number },
}

export type Profile = {
	cups: number,
	rebirths: number,
	circleDeepestPlate: number,
	circleStartWorld: number,
	circleStartedAt: number,
	circleWorldAt: number,
	liftChoice: number?,
	worldBest: { [string]: number },
	rewards: { masterEpic: "none" | "pending" | "claimed" },
	collection: { [string]: { count: number, golden: number } },
	family: string?,
	nextFamily: { [string]: boolean },
	skills: { [string]: { number } },
	keys: number,
	keyHits: number,
	chestPity: { epic: number, legendary: number },
	staged: { [string]: boolean },
	familyChangeDay: number,
	pickaxeGolden: boolean,
	boughtPickaxes: { [string]: boolean },
	pickChestsOpened: number,
	merges: number,
	wallChestsOpened: number,
	keySerial: number,
	wallChestKeyCounter: number,
	ultCounter: number,
	circle: Circle,
	width: number,
	unlocked: { cards: { [string]: boolean }, worlds: { [string]: boolean } },
	deepestWorld: number,
	platesBroken: number,
	hitCounter: number,
	critCounter: number,
	funnel: { [string]: boolean },
	v: number,
	coins: number,
	pickaxe: string,
	stats: { blocks: number, layers: number, playSeconds: number },
	settings: Settings,
	firstJoin: number,
	lastJoin: number,
	joins: number,
	mine: any?,
	loadFailed: boolean?,
}

export type ProfilePatchOp = {
	k: string,
	v: any?,
	d: boolean?,
}

return {}
