--!strict
local Config = require(script.Parent.Parent.Config)
local Rules = {}
function Rules.space(roles: { [any]: string }, role: string): boolean
	local count = 0
	for _, value in roles do
		if value == role then
			count += 1
		end
	end
	return count < (if role == "guest" then Config.social.guests else Config.social.viewers)
end
local Worlds = require(script.Parent.Parent.Mine.Worlds)
function Rules.depth(front: number): (number, number)
	local world = Worlds.of(front)
	return world.index, math.clamp((front - world.start) / world.length, 0, 1)
end
-- Angles are deterministic by slot. Adjacent tokens at the same depth remain distinct when a neighbour moves.
function Rules.token(front: number, slot: number): (number, number)
	local i, f = Rules.depth(front)
	return (i - 1 + f) * Config.camp.scaleHeight / #Config.worlds,
		(slot - 1) * 2 * math.pi / Config.plots.count
end
function Rules.like(profile: any, from: number, to: number, day: number): boolean
	if from == to then
		return false
	end
	if profile.likesGiven.day ~= day then
		profile.likesGiven = { day = day, ids = {} }
	end
	local key = tostring(to)
	if profile.likesGiven.ids[key] then
		return false
	end
	profile.likesGiven.ids[key] = true
	return true
end
local Keys = require(script.Parent.Keys)
function Rules.payGuest(profile: any, coins: number, seed: number)
	profile.coins += coins * Config.social.guestCoins
	Keys.credit(profile, Config.social.guestKeyHits, seed)
end
return Rules
