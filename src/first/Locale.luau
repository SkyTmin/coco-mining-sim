--!strict

local ReplicatedStorage = game:GetService("ReplicatedStorage")
local Locale = {}

function Locale.translator(player: Player): (string) -> string
	local shared = ReplicatedStorage:WaitForChild("Shared")
	local strings = require(shared:WaitForChild("Strings"))
	return function(key)
		return strings.t(key, strings.localeOf(player))
	end
end

return Locale
