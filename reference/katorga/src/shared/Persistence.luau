--!strict
-- Immutable snapshots and exact acquisition ownership at durable boundaries.
local Persistence = {}

function Persistence.copy(value: any): any
	if typeof(value) ~= "table" then
		return value
	end
	local out = {}
	for key, child in value do
		out[key] = Persistence.copy(child)
	end
	return out
end

function Persistence.equal(a: any, b: any): boolean
	if a == b then
		return true
	end
	if typeof(a) ~= "table" or typeof(b) ~= "table" then
		return false
	end
	for key, value in a do
		if not Persistence.equal(value, b[key]) then
			return false
		end
	end
	for key in b do
		if a[key] == nil then
			return false
		end
	end
	return true
end

function Persistence.finiteTree(value: any): boolean
	if typeof(value) == "number" then
		return value == value and math.abs(value) < math.huge
	elseif typeof(value) == "table" then
		for key, child in value do
			if not Persistence.finiteTree(key) or not Persistence.finiteTree(child) then
				return false
			end
		end
	end
	return true
end

function Persistence.owns(lock: any, job: string, token: string): boolean
	return typeof(lock) == "table" and lock.job == job and lock.token == token
end

return Persistence
