--!strict

local fs = require("@lune/fs")
local luau = require("@lune/luau")
local serde = require("@lune/serde")

type Node = {
	path: string,
	Parent: Node?,
	FindFirstChild: (Node, string) -> Node?,
	WaitForChild: (Node, string) -> Node,
}

-- Lune filesystem calls can yield, so index children before using __index.
local directories: { [string]: boolean } = {}
local files: { [string]: boolean } = {}
local ignored = { [".git"] = true, build = true, ["node_modules"] = true, ["sim-out"] = true }

local function index(directory: string)
	directories[directory] = true
	for _, name in fs.readDir(directory) do
		if not ignored[name] then
			local path = if directory == "." then name else directory .. "/" .. name
			if fs.isDir(path) then
				index(path)
			elseif name:match("%.luau$") or name:match("%.json$") then
				files[path] = true
			end
		end
	end
end

local function instance(path: string): Node
	local function findChild(_: Node, name: string): Node?
		local base = if path == "." then name else path .. "/" .. name
		if directories[base] then
			return instance(base)
		end
		for _, extension in { ".luau", ".json" } do
			if files[base .. extension] then
				return instance(base .. extension)
			end
		end
		return nil
	end

	return setmetatable({
		path = path,
		FindFirstChild = findChild,
		WaitForChild = function(self: Node, name: string): Node
			local child = findChild(self, name)
			assert(child, "No child " .. name .. " in " .. path)
			return child
		end,
	}, {
		__index = function(self: Node, key: string)
			if key == "Parent" then
				if path == "." then
					return nil
				end
				return instance(path:match("^(.*)/[^/]+$") or ".")
			end
			return findChild(self, key)
		end,
	}) :: any
end

local function createLoader(overrides: { [string]: any })
	local results: { [string]: { [number]: any, n: number } } = {}
	local loading: { [string]: boolean } = {}

	local function requireNode(module: Node): any
		local path = module.path
		if overrides[path] ~= nil then
			return overrides[path]
		end
		local cached = results[path]
		if cached then
			return cached[1]
		end
		assert(not loading[path], "Cyclic require: " .. path)
		loading[path] = true
		local ok, result = pcall(function()
			local sourcePath = if directories[path] then path .. "/init.luau" else path
			local source = fs.readFile(sourcePath)
			if sourcePath:match("%.json$") then
				return table.pack(serde.decode("json", source))
			end
			local chunk = luau.load(source, {
				debugName = sourcePath,
				environment = { script = module, require = requireNode },
			})
			return table.pack(chunk())
		end)
		loading[path] = nil
		if not ok then
			error(result, 0)
		end
		assert(result.n == 1, "Expected one return value from " .. path)
		results[path] = result
		return result[1]
	end

	return {
		load = function(path: string): any
			if not directories["."] then
				index(".")
			end
			local normalized = path:gsub("\\", "/"):gsub("^%./", ""):gsub("/init%.luau$", "")
			return requireNode(instance(normalized))
		end,
	}
end

return { load = createLoader({}).load, withOverrides = createLoader }
