--!strict
local Config = require(script.Parent.Parent.Config)
local Circle = require(script.Parent.Circle)
local ProfileDefaults = {}
function ProfileDefaults.new(now: number): any
	local profile: any = {
		coins = 0,
		pickaxe = "starter",
		stats = { blocks = 0, layers = 0, playSeconds = 0 },
		settings = {
			camera = "first",
			music = 0.7,
			sfx = Config.sounds.rules.defaultSfx,
			ui = 1,
			reducedMotion = false,
			haptics = true,
			effects = "auto",
		},
		firstJoin = now,
		lastJoin = now,
		joins = 0,
	}
	Circle.initialize(profile)
	return profile
end
return ProfileDefaults
