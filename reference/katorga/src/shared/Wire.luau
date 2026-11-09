--!strict
-- Remote events cut a table at its first nil when the keys are numbers: a sparse inventory
-- {[1] = …, [2] = …, [20] = …} arrives as {[1] = …, [2] = …} and the client "loses" slot 20 and
-- everything after the gap (the bug where items vanished after moving one to a far slot).
-- encode turns every number key into a string key (recursively), decode turns them back, so any
-- table — sparse slots, arrays, mixed — crosses the network intact. DataStore saving has its own
-- encoding in ProfileService.

local Wire = {}

function Wire.encode(value: any): any
	if typeof(value) ~= "table" then
		return value
	end
	local out = {}
	for key, item in pairs(value) do
		out[if typeof(key) == "number" then "#" .. tostring(key) else key] = Wire.encode(item)
	end
	return out
end

function Wire.decode(value: any): any
	if typeof(value) ~= "table" then
		return value
	end
	local out = {}
	for key, item in pairs(value) do
		local number = if typeof(key) == "string" and string.sub(key, 1, 1) == "#"
			then tonumber(string.sub(key, 2))
			else nil
		out[if number then number else key] = Wire.decode(item)
	end
	return out
end

return Wire
