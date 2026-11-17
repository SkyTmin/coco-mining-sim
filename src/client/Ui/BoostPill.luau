--!strict
-- A temporary-bonus pill under the wallet [владелец 13.11: «сделай также, понятно и ясно»]: an icon, one line
-- («Разгон ×1,5», «Лихорадка ×5 · 26 с») and a thin bar (progress to the next tier / time left). It replaces the dotted
-- rings that floated over the wall: the bonus now sits where the coins are, so the eye links «×5» to the money.
local TweenService = game:GetService("TweenService")
local Candy = require(script.Parent.Candy)
local BoostPill = {}
local offset, scale = UDim2.fromOffset, UDim2.fromScale
-- the pills of one wallet, in creation order; visible ones stack without gaps
local stacks: { [Frame]: { any } } = {}

export type Pill = {
	box: Frame,
	surface: Frame,
	label: TextLabel,
	side: TextLabel,
	fill: Frame,
	icon: ImageLabel,
	shown: boolean,
	zoom: UIScale,
	wallet: Frame,
}

-- the wallet is 118 × 42, the key pill hangs 8 below it (27 high): pills stack under that, 6 apart
local function slotAt(slot: number): UDim2
	return UDim2.new(0, 0, 1, 43 + (slot - 1) * 36)
end

local function restack(wallet: Frame)
	local slot = 0
	for _, pill in stacks[wallet] or {} do
		if pill.shown then
			slot += 1
			Candy.move(pill.box, slotAt(slot))
		end
	end
end

function BoostPill.new(wallet: Frame, name: string, iconKey: string, color: Color3): Pill
	local box, surface = Candy.panel(wallet, name, offset(146, 30), slotAt(1))
	local plate = Candy.frame(surface, "Plate", UDim2.new(0, 30, 1, 0), scale(0, 0), color)
	Candy.round(plate)
	local icon = Candy.icon(plate, iconKey, scale(0.8, 0.8), scale(0.1, 0.1))
	local label = Candy.text(surface, "Label", UDim2.new(1, -72, 0.62, 0), offset(34, 1), 14)
	label.TextXAlignment = Enum.TextXAlignment.Left
	-- seconds left (or empty) on the right, quieter than the name
	local side = Candy.text(surface, "Side", UDim2.new(0, 34, 0.62, 0), UDim2.new(1, -37, 0, 1), 13)
	side.TextXAlignment = Enum.TextXAlignment.Right
	side.TextColor3 = Color3.fromHex("6B6F8C")
	local fill = Candy.bar(surface, UDim2.new(1, -40, 0, 5), UDim2.new(0, 34, 1, -9), color)
	local zoom = Instance.new("UIScale")
	zoom.Parent = box
	box.Visible = false
	local pill = {
		box = box,
		surface = surface,
		label = label,
		side = side,
		fill = fill,
		icon = icon,
		shown = false,
		zoom = zoom,
		wallet = wallet,
	}
	stacks[wallet] = stacks[wallet] or {}
	table.insert(stacks[wallet], pill)
	return pill
end

-- show / hide with a short pop (skipped with «less motion»)
function BoostPill.show(pill: Pill, visible: boolean, reduced: boolean?)
	if pill.shown == visible then
		return
	end
	pill.shown = visible
	pill.box.Visible = visible
	restack(pill.wallet)
	if visible and not reduced then
		pill.zoom.Scale = 0.6
		TweenService:Create(
			pill.zoom,
			TweenInfo.new(0.28, Enum.EasingStyle.Back, Enum.EasingDirection.Out),
			{ Scale = 1 }
		):Play()
	else
		pill.zoom.Scale = 1
	end
end

function BoostPill.set(pill: Pill, text: string, ratio: number, side: string?)
	pill.label.Text = text
	pill.side.Text = side or ""
	Candy.fit(pill.label, UDim2.new(1, if side then -72 else -38, 0.62, 0), UDim2.fromOffset(34, 1))
	pill.fill.Size = UDim2.fromScale(math.clamp(ratio, 0, 1), 1)
end

return BoostPill
