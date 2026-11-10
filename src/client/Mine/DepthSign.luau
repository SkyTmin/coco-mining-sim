--!strict

local Players = game:GetService("Players")
local Shared = game:GetService("ReplicatedStorage").Shared
local Config = require(Shared.Config)
local Format = require(Shared.Format)
local Sfx = require(Shared.Sfx)
local Strings = require(Shared.Strings)
local Queue = require(Shared.Play.DepthQueue)
local Worlds = require(Shared.Mine.Worlds)

local DepthSign = {}
local WIDTH, LENGTH = 6, 2.2
local GOLD = Color3.fromRGB(255, 208, 101)
local GOLD_SECONDS, TICK_INTERVAL = 0.3, 1 / 6

type Digit = { clip: Frame, old: TextLabel, new: TextLabel }
export type Sign = {
	board: Part,
	boundary: BasePart?,
	line: Part?,
	edge: UIStroke,
	digits: { Digit },
	list: Frame,
	glint: Frame,
	queue: Queue.Counter,
	lastDepth: number,
	lastTick: number,
	tickPending: boolean,
	goldAt: number,
	glintAt: number,
}

local function formatDepth(depth: number): string
	return Format.depth(depth, Strings.localeOf(Players.LocalPlayer))
end

local function flat(
	name: string,
	size: Vector3,
	frame: CFrame,
	color: Color3,
	material: Enum.Material,
	parent: Instance
): Part
	local p = Instance.new("Part")
	p.Name, p.Size, p.CFrame, p.Color, p.Material = name, size, frame, color, material
	p.Anchored, p.CanCollide, p.CanQuery, p.CanTouch, p.CastShadow =
		true, false, false, false, false
	p.Parent = parent
	return p
end

function DepthSign.new(parent: Instance, frame: CFrame, depth: number, plot: Instance?): Sign
	local board = flat(
		"DepthSign",
		Vector3.new(LENGTH, 0.12, WIDTH),
		frame * CFrame.new(0, 0.07, 1.84) * CFrame.Angles(0, -math.pi / 2, 0),
		Color3.fromRGB(39, 35, 44),
		Enum.Material.Metal,
		parent
	)
	local surface = Instance.new("SurfaceGui")
	surface.Name, surface.Face, surface.SizingMode =
		"Counter", Enum.NormalId.Top, Enum.SurfaceGuiSizingMode.FixedSize
	surface.CanvasSize, surface.LightInfluence, surface.Parent = Vector2.new(300, 110), 0, board
	local skin = Instance.new("Frame")
	skin.Name, skin.Size, skin.BackgroundColor3, skin.BorderSizePixel =
		"Iron", UDim2.fromScale(1, 1), Color3.fromRGB(42, 40, 48), 0
	skin.Parent = surface
	local edge = Instance.new("UIStroke")
	edge.Thickness, edge.ApplyStrokeMode, edge.Parent = 4, Enum.ApplyStrokeMode.Border, skin
	local list = Instance.new("Frame")
	list.Name, list.Size, list.Position =
		"Digits", UDim2.new(1, -12, 1, -12), UDim2.fromOffset(6, 6)
	list.BackgroundTransparency, list.ClipsDescendants, list.Parent = 1, true, skin
	local glint = Instance.new("Frame")
	glint.Name, glint.Size, glint.BackgroundColor3, glint.BorderSizePixel =
		"Glint", UDim2.fromScale(0.14, 1), GOLD, 0
	glint.ZIndex, glint.Visible, glint.Parent = 8, false, list
	local gradient = Instance.new("UIGradient")
	gradient.Transparency = NumberSequence.new({
		NumberSequenceKeypoint.new(0, 1),
		NumberSequenceKeypoint.new(0.5, 0.78),
		NumberSequenceKeypoint.new(1, 1),
	})
	gradient.Parent = glint

	local boundary = plot and plot:FindFirstChild("Boundary")
	local line: Part? = nil
	if boundary and boundary:IsA("BasePart") then
		boundary.LocalTransparencyModifier = 1
		line = flat(
			"DepthBoundary",
			boundary.Size,
			frame * CFrame.new(0, 0.035, 3.72),
			boundary.Color,
			boundary.Material,
			parent
		)
	end

	return {
		board = board,
		edge = edge,
		list = list,
		glint = glint,
		digits = {},
		boundary = if boundary and boundary:IsA("BasePart") then boundary else nil,
		line = line,
		queue = Queue.new(depth, formatDepth(depth)),
		lastDepth = depth,
		lastTick = -math.huge,
		tickPending = false,
		goldAt = -math.huge,
		glintAt = -math.huge,
	}
end

local function digit(sign: Sign, i: number): Digit
	local window = sign.digits[i]
	if not window then
		local clip = Instance.new("Frame")
		clip.Name, clip.Size = "Digit" .. i, UDim2.fromScale(0.12, 1)
		clip.BackgroundColor3, clip.BorderSizePixel, clip.ClipsDescendants =
			Color3.fromRGB(71, 56, 37), 0, true
		clip.Parent = sign.list
		local function glyph(name: string): TextLabel
			local text = Instance.new("TextLabel")
			text.Name, text.Size, text.BackgroundTransparency = name, UDim2.fromScale(1, 1), 1
			text.Font, text.TextScaled, text.TextColor3 =
				Enum.Font.GothamBlack, true, Color3.fromRGB(255, 233, 176)
			text.TextStrokeColor3, text.TextStrokeTransparency = Color3.fromRGB(34, 29, 29), 0
			local size = Instance.new("UITextSizeConstraint")
			size.MinTextSize, size.MaxTextSize, size.Parent = 9, 72, text
			text.Parent = clip
			return text
		end
		window = { clip = clip, old = glyph("Previous"), new = glyph("Current") }
		sign.digits[i] = window
	end
	return window
end

function DepthSign.refresh(sign: Sign)
	sign.queue = Queue.new(sign.lastDepth, formatDepth(sign.lastDepth))
end

function DepthSign.step(
	sign: Sign,
	now: number,
	depth: number,
	rolling: boolean,
	reduced: boolean,
	audible: boolean
)
	local previous = sign.lastDepth
	sign.lastDepth = depth
	if depth // 100 > previous // 100 then
		sign.goldAt = now
	end
	if depth // 1000 > previous // 1000 then
		sign.glintAt = now
	end
	local q = sign.queue
	local text = if previous == depth then q.text else formatDepth(depth)
	local changed = Queue.step(q, now, depth, text, rolling, reduced)
	if rolling and not reduced then
		sign.tickPending = false
	elseif changed and audible then
		sign.tickPending = true
	end
	if sign.tickPending and audible and now - sign.lastTick >= TICK_INTERVAL then
		sign.tickPending, sign.lastTick = false, now
		Sfx.play("depth_knock", 0.55)
	end

	local world = Worlds.of(depth)
	local rgb = world.color
	sign.edge.Color = Color3.fromRGB(rgb[1], rgb[2], rgb[3])
		:Lerp(GOLD, math.max(0, 1 - (now - sign.goldAt) / GOLD_SECONDS))
	local sweep = (now - sign.glintAt) / GOLD_SECONDS
	sign.glint.Visible = not reduced and sweep < 1
	if sign.glint.Visible then
		sign.glint.Position = UDim2.fromScale(-0.14 + 1.14 * sweep, 0)
	end

	local width = math.min(0.14, 0.96 / #q.columns)
	local start = (1 - width * #q.columns) / 2
	for i in q.columns do
		local d = digit(sign, i)
		local old, new, oldY, newY, light = Queue.pose(q, now, i)
		d.clip.Visible, d.clip.BackgroundTransparency = true, 1 - light
		d.clip.Size, d.clip.Position =
			UDim2.fromScale(width, 1), UDim2.fromScale(start + (i - 1) * width, 0)
		d.old.Text, d.new.Text = old, new
		d.old.Position, d.new.Position = UDim2.fromScale(0, oldY), UDim2.fromScale(0, newY)
		d.old.TextTransparency = if rolling then 0.30 else 0
		d.new.TextTransparency = if rolling then 0.18 else 0
	end
	for i = #q.columns + 1, #sign.digits do
		sign.digits[i].clip.Visible = false
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
				local old = signs[origin]
				if typeof(depth) == "number" then
					if not old then
						signs[origin] = DepthSign.new(parent, origin.CFrame, depth, plot)
					end
				elseif old then
					old.board:Destroy()
					if old.line then
						old.line:Destroy()
					end
					if old.boundary then
						old.boundary.LocalTransparencyModifier = 0
					end
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
