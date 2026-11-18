--!strict
local Config = require(script.Parent.Parent.Config)
local State = require(script.Parent.Parent.Mine.MineState)
local Shapes = require(script.Parent.Parent.Mine.Shapes)
local Validate = require(script.Parent.Parent.Mine.Validate)
local cfg = Config.social
local Duel = {}
function Duel.wall(seed: number): any
	local state = State.new(seed, cfg.duelWidth, cfg.duelHeight)
	state.duel = true
	return state
end
function Duel.hit(st: any, x: number, y: number, relative: number): any?
	local depth = Validate.target(st, true, x, y, relative)
	if not depth then
		return nil
	end
	local cells, ranges = {}, {}
	for _, point in Shapes.cells("square3", x, y, st.width, st.height) do
		if State.removeCell(st, point.x, point.y, depth, ranges) then
			table.insert(cells, { x = point.x, y = point.y, dRel = relative, gen = 0 })
		end
	end
	return {
		delta = State.advance(st),
		front = st.front,
		cells = cells,
		blocks = #cells,
		accepted = true,
		charge = 0,
		plateDamage = 0,
		damage = {},
		width = st.width,
		height = st.height,
		runs = {},
		events = {},
		finds = {},
		coins = 0,
	}
end
function Duel.outcome(a: number, b: number, forfeit: string?): (string, string)
	if forfeit then
		return if forfeit == "a" then "loss" else "win", if forfeit == "b" then "loss" else "win"
	end
	if a == b then
		return "draw", "draw"
	end
	return if a > b then "win" else "loss", if b > a then "win" else "loss"
end
function Duel.reward(
	p: any,
	outcome: string,
	aborted: boolean,
	day: number,
	rate: number,
	roll: number
): number
	if aborted or outcome == "draw" then
		return 0
	end
	if outcome == "win" then
		p.duelWins += 1
	end
	if p.duelRewardsToday.day ~= day then
		p.duelRewardsToday = { day = day, count = 0 }
	end
	if p.duelRewardsToday.count >= cfg.rewardLimit then
		return 0
	end
	local amount = math.floor(rate * (if outcome == "win" then cfg.winMinutes else cfg.loseMinutes))
	if amount < 0 or not (p.coins + amount < math.huge) then
		return 0
	end
	p.duelRewardsToday.count += 1
	p.coins += amount
	if outcome == "win" and roll < cfg.keyChance then
		p.keys += 1
	end
	return amount
end
return Duel
