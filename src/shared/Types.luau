--!strict

export type Settings = {
	language: string?,
	camera: string,
	music: number,
	sfx: number,
	ui: number,
	reducedMotion: boolean,
	effects: string,
}

export type Profile = {
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
