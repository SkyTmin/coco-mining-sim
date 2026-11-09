--!strict
-- Personal controls/display ranges [owner 02.11; ranges/defaults: decision].
local Preferences = {}

Preferences.numbers = {
	volume = { min = 0, max = 1, default = 1 },
	mouseSensitivity = { min = 0.2, max = 3, default = 1 },
	touchSensitivity = { min = 0.2, max = 3, default = 1 },
	brightness = { min = 0.5, max = 1.5, default = 1 },
} :: { [string]: { min: number, max: number, default: number } }

function Preferences.valid(key: string, value: any): boolean
	local range = Preferences.numbers[key]
	return range ~= nil
		and typeof(value) == "number"
		and value == value
		and value >= range.min
		and value <= range.max
end

function Preferences.number(key: string, value: any): number
	local range = Preferences.numbers[key]
	return if Preferences.valid(key, value) then value else range.default
end

return Preferences
