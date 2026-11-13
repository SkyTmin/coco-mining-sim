--!strict
local Config = require(script.Parent.Parent.Config)
local Settings = {}
function Settings.parse(value: any): any?
	if type(value) ~= "table" then
		return nil
	end
	local out = {}
	for key, v in value do
		local valid = false
		if key == "language" then
			valid = type(v) == "string" and table.find(Config.game.languages, v) ~= nil
		elseif key == "sfx" or key == "music" then
			valid = type(v) == "number" and v >= 0 and v <= 1
		elseif key == "haptics" or key == "reducedMotion" then
			valid = type(v) == "boolean"
		else
			return nil
		end
		if not valid then
			return nil
		end
		out[key] = v
	end
	return if next(out) then out else nil
end
return Settings
