--!strict

local Test = {}
local scopes: { string } = {}
local passed = 0
local failed = 0

local function equal(a: any, b: any): boolean
	if a == b then
		return true
	end
	if typeof(a) ~= "table" or typeof(b) ~= "table" then
		return false
	end
	for key, value in a do
		if not equal(value, b[key]) then
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

function Test.expect(value: any)
	return {
		toBe = function(expected: any)
			assert(
				value == expected,
				string.format("Expected %s, got %s", tostring(expected), tostring(value))
			)
		end,
		toEqual = function(expected: any)
			assert(equal(value, expected), "Expected deeply equal values")
		end,
		toBeCloseTo = function(expected: number, eps: number)
			assert(
				typeof(value) == "number" and math.abs(value - expected) <= eps,
				string.format(
					"Expected %s +/- %s, got %s",
					tostring(expected),
					tostring(eps),
					tostring(value)
				)
			)
		end,
		toThrow = function()
			assert(typeof(value) == "function", "Expected a function")
			assert(not pcall(value), "Expected the function to throw")
		end,
	}
end

function Test.describe(name: string, body: () -> ())
	table.insert(scopes, name)
	local ok, problem = pcall(body)
	table.remove(scopes)
	if not ok then
		error(problem, 0)
	end
end

function Test.it(name: string, body: () -> ())
	local title = table.concat(scopes, " / ") .. " / " .. name
	local ok, problem = xpcall(body, debug.traceback)
	if ok then
		passed += 1
		print("PASS " .. title)
	else
		failed += 1
		print("FAIL " .. title .. "\n" .. tostring(problem))
	end
end

function Test.counts(): (number, number)
	return passed, failed
end

return Test
