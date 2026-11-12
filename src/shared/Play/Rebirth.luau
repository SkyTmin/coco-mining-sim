--!strict
local Shared = script.Parent.Parent
local Config = require(Shared.Config)
local Persistence = require(Shared.Persistence)
local State = require(Shared.Mine.MineState)
local Codec = require(Shared.Mine.MineCodec)
local Worlds = require(Shared.Mine.Worlds)
local Circle = require(script.Parent.Circle)
local Family = require(script.Parent.Family)
local Ranks = require(script.Parent.Ranks)
local Rebirth = {}
local function integer(value: any, low: number, high: number): boolean
	return type(value) == "number" and value % 1 == 0 and value >= low and value <= high
end
function Rebirth.cupsFor(plate: number): number
	return if plate >= Config.rebirth.firstAfterWorld then Config.rebirth.cups[plate] or 0 else 0
end
function Rebirth.quote(profile: any, eta: number?): any
	local gain = Rebirth.cupsFor(profile.circleDeepestPlate)
	local available = gain > 0 and not profile.loadFailed
	local after = profile.cups + gain
	local families = {}
	for _, family in Config.familyRules.order do
		if Family.best(profile, family) then
			table.insert(families, family)
		end
	end
	local lift = Ranks.liftMax(after, profile.deepestWorld)
	return {
		serial = profile.rebirths,
		gain = gain,
		cups = profile.cups,
		after = after,
		available = available,
		profitable = available
			and gain / Config.rebirth.profitableRatio >= 1 + profile.cups
			and (eta == nil or eta > Config.rebirth.profitableEtaSeconds),
		percent = math.floor(Config.rebirth.percentScale * gain / (1 + profile.cups)),
		rank = Ranks.of(after),
		liftMax = lift,
		start = math.clamp(profile.liftChoice or lift, 1, lift),
		families = families,
		family = if table.find(families, profile.family) then profile.family else families[1] or "",
	}
end
function Rebirth.validate(profile: any, choice: any): string?
	if
		not integer(choice.serial, 0, Config.game.maxExactInteger)
		or not integer(choice.gain, 0, Config.game.maxExactInteger)
		or not integer(choice.start, 0, Config.game.maxExactInteger)
		or type(choice.family) ~= "string"
	then
		return "unavailable"
	end
	if choice.serial ~= profile.rebirths then
		return "stale"
	end
	local q = Rebirth.quote(profile)
	if not q.available then
		return "unavailable"
	end
	if q.gain ~= choice.gain then
		return "changed"
	end
	if
		not table.find(q.families, choice.family) and not (#q.families == 0 and choice.family == "")
	then
		return "family"
	end
	if choice.start < 1 or choice.start > q.liftMax then
		return "start"
	end
	return nil
end
function Rebirth.plan(profile: any, choice: any, seed: number, depth: number): (any?, string?)
	-- All validation, copies and encoding finish BEFORE the assignment-only commit.
	local ok, plan, reason = pcall(function()
		if profile.v ~= Circle.profileVersion or not Persistence.finiteTree(profile) then
			return nil, "unavailable"
		end
		local p = Persistence.copy(profile)
		if not Circle.migrate(p) then
			return nil, "unavailable"
		end
		local failure = Rebirth.validate(p, choice)
		if failure then
			return nil, failure
		end
		if
			not integer(seed, 1, Config.rebirth.seedMax)
			or depth ~= Worlds.at(choice.start).start
			or p.rebirths >= Config.game.maxExactInteger
			or p.cups + choice.gain > Config.game.maxExactInteger
			or type(choice.playSeconds) ~= "number"
			or not (choice.playSeconds >= 0 and choice.playSeconds < math.huge)
		then
			return nil, "unavailable"
		end
		if p.mine and p.mine.seed == seed then
			return nil, "unavailable"
		end
		p.coins, p.cups, p.rebirths = 0, p.cups + choice.gain, p.rebirths + 1
		p.circle = Circle.new()
		p.circle.hitSize = Ranks.startSize(p.cups)
		p.circleDeepestPlate, p.circleStartWorld = 0, choice.start
		p.circleStartedAt, p.circleWorldAt = choice.playSeconds, choice.playSeconds
		if Ranks.liftMax(p.cups, p.deepestWorld) > 1 then
			p.liftChoice = choice.start
		end
		if choice.family == "" then
			p.family, p.pickaxe, p.pickaxeGolden = nil, "starter", false
		else
			Family.change(p, choice.family, p.familyChangeDay, true)
			p.family = choice.family
			p.pickaxe, p.pickaxeGolden = Family.best(p, choice.family)
		end
		p.nextFamily = {}
		if p.rewards.masterEpic == "none" and Ranks.master(p.cups) then
			p.rewards.masterEpic = "pending"
		end
		local state = State.new(seed, p.width, Config.mine.height, depth)
		p.mine = Codec.encode(state)
		return { values = p, state = state }, nil
	end)
	return if ok then plan else nil, if ok then reason else "unavailable"
end
function Rebirth.commit(profile: any, plan: any)
	local p = plan.values
	profile.coins, profile.cups, profile.rebirths = p.coins, p.cups, p.rebirths
	profile.circle, profile.circleDeepestPlate, profile.circleStartWorld =
		p.circle, p.circleDeepestPlate, p.circleStartWorld
	profile.circleStartedAt, profile.circleWorldAt, profile.liftChoice =
		p.circleStartedAt, p.circleWorldAt, p.liftChoice
	profile.family, profile.pickaxe, profile.pickaxeGolden = p.family, p.pickaxe, p.pickaxeGolden
	profile.nextFamily, profile.rewards, profile.mine = p.nextFamily, p.rewards, p.mine
end
return Rebirth
