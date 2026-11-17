--!strict
-- What fell out of a wall chest [владелец 13.11: «награду с сундука надо сделать понятной, чтобы было видно, что оттуда
-- упало»]. Before, the chest's coins simply joined the block coins and a key was a toast at the bottom. Now, at the spot
-- the chest was hit: its name in its colour («Серебряный сундук!»), then one chip per prize pops out of the chest in a
-- column — coins, «Ключ +1» (gold, the biggest), «Новая кирка!» — holds a moment and flies to its place on the HUD
-- (coins to the wallet, the key to the key pill). Pops queue so two chests never overlap.
local TweenService = game:GetService("TweenService")
local Shared = game:GetService("ReplicatedStorage").Shared
local Format = require(Shared.Format)
local Sfx = require(Shared.Sfx)
local Candy = require(script.Parent.Parent.Ui.Candy)
local ChestPop = {}

local offset, scale = UDim2.fromOffset, UDim2.fromScale
local TIER_COLORS = {
	Color3.fromHex("C98A4B"), -- wood
	Color3.fromHex("C7D2E0"), -- silver
	Color3.fromHex("FFC83D"), -- gold
	Color3.fromHex("7FE7FF"), -- crystal
}
local KEY_GOLD = Color3.fromHex("FFC83D")
local HOLD = 1.1

type Prize = { icon: string, text: string, color: Color3, target: GuiObject?, big: boolean }

local function chip(parent: Instance, prize: Prize): (Frame, UIScale)
	local width = if prize.big then 134 else 112
	local box = Candy.frame(
		parent,
		"Prize",
		offset(width, if prize.big then 36 else 30),
		scale(0.5, 0.5),
		prize.color
	)
	box.AnchorPoint = Vector2.new(0.5, 0.5)
	Candy.round(box, 0)
	Candy.stroke(box, 2.5)
	local icon = Candy.icon(box, prize.icon, UDim2.new(0, 26, 0.8, 0), UDim2.new(0, 6, 0.1, 0))
	local aspect = Instance.new("UIAspectRatioConstraint")
	aspect.Parent = icon
	local label = Candy.text(
		box,
		"Label",
		UDim2.new(1, -40, 0.78, 0),
		UDim2.new(0, 34, 0.11, 0),
		if prize.big then 18 else 15
	)
	label.TextXAlignment = Enum.TextXAlignment.Left
	label.Text = prize.text
	local zoom = Instance.new("UIScale")
	zoom.Scale = 0.2
	zoom.Parent = box
	return box, zoom
end

local function centre(gui: GuiObject): UDim2
	return Candy.point(gui.AbsolutePosition + gui.AbsoluteSize / 2)
end

-- the canvas-scaled Position for design offsets `at` (Candy scales offsets by its unit), without moving the gui
local function scaledAt(gui: GuiObject, at: UDim2): UDim2
	local old = gui.Position
	Candy.move(gui, at)
	local target = gui.Position
	gui.Position = old
	return target
end

function ChestPop.new(
	parent: Instance,
	translate: (string, ...any) -> string,
	wallet: Frame
): (any, Vector2?) -> ()
	local layer = Candy.layer(parent, "ChestPop", 13)
	local busyUntil = 0
	return function(reward: any, screen: Vector2?)
		local start = math.max(os.clock(), busyUntil)
		local camera = workspace.CurrentCamera
		local at = screen or (if camera then camera.ViewportSize / 2 else Vector2.new(400, 200))
		local prizes: { Prize } = {}
		if reward.pick then
			table.insert(prizes, {
				icon = "pickaxe",
				text = translate("chest_new_pick"),
				color = Color3.fromHex("D8B4FE"),
				target = nil,
				big = true,
			})
		end
		if reward.keys and reward.keys > 0 then
			table.insert(prizes, {
				icon = "keys",
				text = translate("chest_key", reward.keys),
				color = KEY_GOLD,
				target = wallet:FindFirstChild("Keys") :: GuiObject?,
				big = true,
			})
		end
		if reward.coins and reward.coins > 0 then
			table.insert(prizes, {
				icon = "coin",
				text = "+" .. Format.short(reward.coins),
				color = Candy.panelColor,
				target = wallet,
				big = false,
			})
		end
		local tier = math.clamp(reward.tier or 1, 1, #TIER_COLORS)
		busyUntil = start + 0.25 + #prizes * 0.12 + HOLD + 0.5
		task.delay(start - os.clock(), function()
			local group = Candy.frame(layer, "Chest", offset(1, 1), Candy.point(at))
			group.BackgroundTransparency = 1
			local title = Candy.text(
				group,
				"Title",
				offset(220, 26),
				offset(-110, -18),
				20,
				TIER_COLORS[tier]
			)
			title.Text = translate("chest_tier_" .. tier)
			Candy.stroke(title, 2.5, true)
			title.TextTransparency = 1
			TweenService:Create(title, TweenInfo.new(0.18), { TextTransparency = 0 }):Play()
			TweenService:Create(title, TweenInfo.new(0.3, Enum.EasingStyle.Back), {
				Position = scaledAt(title, offset(-110, -(#prizes * 36 + 34))),
			}):Play()
			Sfx.play(if reward.keys and reward.keys > 0 then "vein_chime" else "coin", 0.7)
			local boxes = {}
			for i, prize in prizes do
				local box, zoom = chip(group, prize)
				Candy.move(box, offset(0, 0))
				local goal = scaledAt(box, offset(0, -(i - 1) * 36 - 18))
				task.delay((i - 1) * 0.12, function()
					TweenService
						:Create(zoom, TweenInfo.new(0.28, Enum.EasingStyle.Back), { Scale = 1 })
						:Play()
					TweenService
						:Create(
							box,
							TweenInfo.new(0.28, Enum.EasingStyle.Back),
							{ Position = goal }
						)
						:Play()
				end)
				boxes[i] = { box = box, zoom = zoom, prize = prize }
			end
			task.wait(0.25 + #prizes * 0.12 + HOLD)
			-- each prize flies to its place on the HUD (coins → wallet, key → key pill); the rest shrink away
			local flight = TweenInfo.new(0.45, Enum.EasingStyle.Quad, Enum.EasingDirection.In)
			for _, entry in boxes do
				local target = entry.prize.target
				if target and target.Visible then
					local from = centre(entry.box)
					entry.box.Parent = layer
					entry.box.Position = from
					TweenService:Create(entry.box, flight, { Position = centre(target) }):Play()
					TweenService:Create(entry.zoom, flight, { Scale = 0.35 }):Play()
				else
					TweenService:Create(entry.zoom, TweenInfo.new(0.3), { Scale = 0 }):Play()
				end
			end
			TweenService:Create(title, TweenInfo.new(0.3), { TextTransparency = 1 }):Play()
			task.wait(0.5)
			for _, entry in boxes do
				entry.box:Destroy()
			end
			group:Destroy()
		end)
	end
end

return ChestPop
