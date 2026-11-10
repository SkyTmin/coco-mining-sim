--!strict

local fs = require("@lune/fs")
local process = require("@lune/process")
local Test = require("./lib/expect")

local function discover(directory: string, specs: { string })
	for _, name in fs.readDir("tests/" .. directory) do
		local relative = directory .. name
		if fs.isDir("tests/" .. relative) then
			discover(relative .. "/", specs)
		elseif name:match("%.spec%.luau$") then
			table.insert(specs, relative)
		end
	end
end

local specs: { string } = {}
discover("", specs)
table.sort(specs)
if #specs == 0 then
	print("No specs found.")
	process.exit(1)
end

local loadFailures = 0
for _, path in specs do
	local ok, problem = pcall(function()
		require("./" .. (path:gsub("%.luau$", "")))
	end)
	if not ok then
		loadFailures += 1
		print("FAIL " .. path .. "\n" .. tostring(problem))
	end
end
local passed, failed = Test.counts()
failed += loadFailures
print(string.format("%d passed, %d failed (%d spec files)", passed, failed, #specs))
if failed > 0 then
	process.exit(1)
end
return true
