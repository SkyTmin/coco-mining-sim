--!strict

local Players = game:GetService("Players")
local Shared = game:GetService("ReplicatedStorage").Shared
local Config = require(Shared.Config)
local Format = require(Shared.Format)
local Sfx = require(Shared.Sfx)
local Strings = require(Shared.Strings)
local Queue = require(Shared.Play.DepthQueue)

local DepthSign = {}
local S = Config.mine.blockSize
local CREAM = Color3.fromRGB(255, 244, 222)
local GOLD = Color3.fromRGB(255, 208, 101)
local FADE, PUNCH = 0.25, 0.3

export type Sign = {
	board: Part,
	base: CFrame,
	incoming: TextLabel,
	outgoing: TextLabel,
	queue: Queue.Queue,
	at: number,
	punch: boolean,
	gold: boolean,
}

local function formatDepth(depth: number): string
	return Format.depth(depth, Strings.localeOf(Players.LocalPlayer))
end

function DepthSign.new(parent: Instance, frame: CFrame, depth: number): Sign
	local base = frame * CFrame.new(-0.85, 1.72, 1.65) * CFrame.Angles(math.rad(-55), 0, 0)
	local board = Instance.new("Part")
	board.Name, board.CFrame, board.Size = "DepthSign", base, Vector3.new(S * 2, S * 0.65, 0.22)
	board.Color, board.Material = Color3.fromRGB(39, 58, 76), Enum.Material.SmoothPlastic
	board.Anchored, board.CanCollide, board.CanTouch, board.CanQuery, board.CastShadow =
		true, false, false, false, false
	board.Parent = parent
	local surface = Instance.new("SurfaceGui")
	surface.Face, surface.CanvasSize, surface.LightInfluence =
		Enum.NormalId.Back, Vector2.new(420, 140), 0
	surface.Parent = board
	local function digits(name: string): TextLabel
		local label = Instance.new("TextLabel")
		label.Name, label.AnchorPoint, label.Position =
			name, Vector2.new(0.5, 0.5), UDim2.fromScale(0.5, 0.5)
		label.Size, label.Font, label.TextScaled =
			UDim2.fromScale(0.94, 0.84), Enum.Font.GothamBold, true
		label.TextColor3, label.BackgroundTransparency, label.Text = CREAM, 1, ""
		label.Parent = surface
		return label
	end
	local incoming, outgoing = digits("FrontDepth"), digits("PreviousDepth")
	incoming.Text, outgoing.Visible = formatDepth(depth), false
	return {
		board = board,
		base = base,
		incoming = incoming,
		outgoing = outgoing,
		queue = Queue.new(depth),
		at = -math.huge,
		punch = false,
		gold = false,
	}
end

function DepthSign.refresh(sign: Sign)
	sign.incoming.Text = formatDepth(sign.queue.shown)
end

function DepthSign.step(
	sign: Sign,
	now: number,
	depth: number,
	finish: boolean,
	reduced: boolean,
	audible: boolean
)
	local before = sign.queue.shown
	local nextDepth, punch = Queue.step(sign.queue, now, depth, finish)
	if nextDepth then
		sign.outgoing.Text = sign.incoming.Text
		DepthSign.refresh(sign)
		sign.at, sign.punch, sign.gold = now, punch, nextDepth // 100 > before // 100
		if audible then
			Sfx.play("depth_knock", if punch then 0.29 else 0.17)
		end
	elseif sign.at == -math.huge then
		return
	end

	local t = now - sign.at
	local strength = if sign.punch then 1 else 0.55
	local kick = if reduced then 0 else math.max(0, 1 - t / PUNCH)
	local flight = if reduced then 1 else math.clamp(t / 0.12, 0, 1)
	sign.incoming.Position = UDim2.fromScale(0.5, 0.5 - 0.25 * (1 - flight) ^ 2)
	sign.incoming.Size = UDim2.fromScale(0.94, 0.84 * (1 + 0.23 * strength * kick))
	sign.incoming.TextColor3 = if sign.gold
		then CREAM:Lerp(GOLD, math.max(0, 1 - t / PUNCH))
		else CREAM
	local out = math.clamp(t / FADE, 0, 1)
	sign.outgoing.Visible = not reduced and out < 1
	if sign.outgoing.Visible then
		sign.outgoing.Position = UDim2.fromScale(0.5 - out * 0.13, 0.5 + out * 0.61)
		sign.outgoing.Rotation, sign.outgoing.TextTransparency = -132 * out, out
	end
	sign.board.CFrame = if kick > 0
		then sign.base * CFrame.Angles(math.sin(t * 78) * kick * 0.045 * strength, 0, 0)
		else sign.base
	if t >= PUNCH then
		sign.at = -math.huge
	end
end

function DepthSign.spectators(parent: Instance, plots: Instance, own: number)
	local signs: { [BasePart]: Sign } = {}
	for index = 1, Config.plots.count do
		if index == own then
			continue
		end
		task.spawn(function()
			local plot = plots:WaitForChild("Plot_" .. index, 8)
			local origin = plot and plot:WaitForChild("Origin", 8)
			if not origin or not origin:IsA("BasePart") then
				return
			end
			local function update()
				local depth = origin:GetAttribute("MineFront")
				if typeof(depth) == "number" then
					if not signs[origin] then
						signs[origin] = DepthSign.new(parent, origin.CFrame, depth)
					end
				elseif signs[origin] then
					signs[origin].board:Destroy()
					signs[origin] = nil
				end
			end
			origin:GetAttributeChangedSignal("MineFront"):Connect(update)
			update()
		end)
	end
	return signs
end

return DepthSign
