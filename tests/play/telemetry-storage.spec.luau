--!strict
local Test = require("../lib/expect")
local Loader = require("../lib/loader")
local Storage = Loader.load("src/shared/Play/StoragePolicy.luau")
local Telemetry = Loader.load("src/shared/Play/Telemetry.luau")
local expect = Test.expect
Test.describe("Stage 5 diagnostics", function()
	Test.it(
		"keeps current stores and isolates only the configured place in each environment",
		function()
			local cfg = { livePrefix = "CMS_L_", studioPrefix = "CMS_S_", isolatedPlaces = { 123 } }
			expect(Storage.name(cfg, false, 87020443315503, "Profiles_v1")).toBe(
				"CMS_L_Profiles_v1"
			)
			expect(Storage.name(cfg, true, 87020443315503, "Profiles_v1_QA")).toBe(
				"CMS_S_Profiles_v1_QA"
			)
			expect(Storage.name(cfg, false, 123, "Profiles_v1")).toBe("CMS_L_Profiles_v1_P123")
			expect(Storage.name(cfg, true, 123, "Profiles_v1_QA")).toBe("CMS_S_Profiles_v1_QA_P123")
		end
	)
	Test.it(
		"accepts bounded quality diagnostics and rejects forged levels, reasons and directions",
		function()
			for _, row in { { 2, 1, "auto_down" }, { 2, 3, "auto_up" }, { 1, 3, "manual" } } do
				expect(Telemetry.quality(table.unpack(row))).toBe(true)
			end
			for _, row in
				{
					{ 0, 1, "manual" },
					{ 1, 4, "manual" },
					{ 0 / 0, 1, "manual" },
					{ 1, math.huge, "manual" },
					{ "1", 2, "auto_up" },
					{ 1, 3, "auto_up" },
					{ 2, 3, "auto_down" },
					{ 1, 2, "coins" },
				}
			do
				expect(Telemetry.quality(table.unpack(row))).toBe(false)
			end
		end
	)
end)
return true
