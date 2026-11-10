--!strict
-- Remote events can truncate numeric keys at the first nil. Encode numeric keys as strings
-- recursively so sparse and mixed tables retain their shape on the wire.

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
