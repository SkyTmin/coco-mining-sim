--!strict
-- Deliberately small placeholders. Claude replaces these hooks; outcomes and durations arrive from the server.
local TweenService = game:GetService("TweenService")
local Config = require(game:GetService("ReplicatedStorage").Shared.Config)
local Sfx = require(game:GetService("ReplicatedStorage").Shared.Sfx)
local FamilyFx = {}
local locate: (any, number?) -> BasePart? = function(_cell: any, _front: number?)
	return nil
end
local showResult: (any) -> () = function(_result: any) end
local notice: (string) -> () = function(_key: string) end
local frozen: { [BasePart]: Color3 } = {}

function FamilyFx.configure(
	find: (any, number?) -> BasePart?,
	result: (any) -> (),
	text: (string) -> ()
)
	locate, showResult, notice = find, result, text
end

function FamilyFx.perk(event: any)
	local family = Config.families[event.family]
	if not family then
		return
	end
	task.delay(event.delayMs / 1000, function()
		for _, cell in event.points do
			local part = locate(cell, event.front)
			if part then
				local color = part.Color
				part.Color = Color3.fromHex(family.color)
				TweenService:Create(part, TweenInfo.new(event.durationMs / 1000), { Color = color })
					:Play()
			end
		end
	end)
end

function FamilyFx.ult(family: string, event: any)
	task.delay(event.delayMs / 1000, function()
		notice("family_ult_" .. family)
	end)
end

function FamilyFx.frozen(cells: { any })
	for part, color in frozen do
		if part.Parent then
			part.Color = color
			part:SetAttribute("FamilyFrozen", nil)
		end
	end
	table.clear(frozen)
	for _, cell in cells do
		local part = locate(cell, nil)
		if part then
			frozen[part] = part.Color
			part.Color = part.Color:Lerp(Color3.fromHex(Config.families.frost.color), 0.3)
			part:SetAttribute("FamilyFrozen", true)
		end
	end
end

function FamilyFx.chestOpen(result: any)
	showResult(result)
	Sfx.play("buy_soft", 0.3)
end

return FamilyFx
