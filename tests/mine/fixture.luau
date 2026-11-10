--!strict

local fs = require("@lune/fs")
local serde = require("@lune/serde")
local Loader = require("../lib/loader")

local config = serde.decode("json", fs.readFile("tests/fixtures/mine-config.json"))
local loader = Loader.withOverrides({ ["src/shared/Config"] = config })
local Fixture = { config = config }

function Fixture.load(module: string): any
	return loader.load("src/shared/Mine/" .. module .. ".luau")
end

function Fixture.random(seed: number): (number, number) -> number
	return function(min: number, max: number): number
		seed = (1664525 * seed + 1013904223) % 4294967296
		return min + math.floor(seed / 4294967296 * (max - min + 1))
	end
end

return Fixture
