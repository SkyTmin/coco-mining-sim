--!strict
local Config = require(script.Parent.Parent.Config)
local Pace = {}
function Pace.new(): any
	return { seconds = {} }
end
function Pace.record(state: any, now: number, delta: number)
	local second = math.floor(now)
	local last = state.seconds[#state.seconds]
	if last and last.at == second then
		last.layers += delta
	else
		table.insert(state.seconds, { at = second, layers = delta })
		if #state.seconds > Config.rebirth.paceWindow then
			table.remove(state.seconds, 1)
		end
	end
end
function Pace.rate(state: any): number?
	if #state.seconds < Config.rebirth.paceMinSeconds then
		return nil
	end
	local total = 0
	for _, bucket in state.seconds do
		total += bucket.layers
	end
	return total / #state.seconds
end
function Pace.eta(state: any, front: number, plateDepth: number, lastPlate: boolean?): number?
	if lastPlate then
		return math.huge
	end
	local rate = Pace.rate(state)
	return if rate == nil then nil elseif rate == 0 then math.huge else (plateDepth - front) / rate
end
return Pace
