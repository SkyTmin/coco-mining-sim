--!strict
local Config = require(script.Parent.Parent.Config)
local Telemetry = {}
function Telemetry.quality(from: any, to: any, reason: any): boolean
	if
		type(from) ~= "number"
		or type(to) ~= "number"
		or from % 1 ~= 0
		or to % 1 ~= 0
		or from < 1
		or to < 1
		or from > Config.game.qualityLevels
		or to > Config.game.qualityLevels
	then
		return false
	end
	return reason == "manual"
		or reason == "auto_up" and to == from + 1
		or reason == "auto_down" and to == from - 1
end
return Telemetry
