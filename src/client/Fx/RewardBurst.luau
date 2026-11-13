--!strict
-- Level-up burst [владелец 11.11: «эффект когда качаешь что-то … анимация при прокачке из lintly, такой же в точности»].
-- A port of lintly `RewardBurstCard` (branch claude/dazzling-davinci-y4BdL, src/styles.css: reward-scene / reward-flash /
-- reward-rays / reward-relic / reward-copy / reward-fleck): 2.3 s, the screen dims with a flash, rays turn, 18 flecks fly
-- out, the icon card rises from below, overshoots, floats up and fades; the kicker / title / subtitle fade in under it.
-- Keyframes and the per-segment cubic-bezier easing follow the CSS one to one. Bursts queue, never overlap.

local Players = game:GetService("Players")
local RunService = game:GetService("RunService")
local Candy = require(script.Parent.Parent.Ui.Candy)
local Sfx = require(game:GetService("ReplicatedStorage").Shared.Sfx)

export type Palette = { main: Color3, strong: Color3, deep: Color3, soft: Color3 }
export type Burst = {
	icon: string?,
	palette: Palette?,
	kicker: string,
	title: string,
	subtitle: string?,
	-- 0..1, the size of the moment [владелец 11.11: «эффект сопоставимым к редкости»]: common 0.35 … legendary 1.
	-- Fewer flecks, fainter rays and dim, a shorter run and a quieter sound for the small ones.
	power: number?,
	-- draws over the relic icon (a pickaxe model in a ViewportFrame) after the atlas icon is set
	decorate: ((ImageLabel) -> ())?,
}

local DURATION = 2.3
local INK = Color3.fromHex("1E2140")
local hex = Color3.fromHex
local RewardBurst = {}

-- lintly reward-burst palettes (common … legendary) plus the four families
RewardBurst.palettes = {
	common = {
		main = hex("9f968a"),
		strong = hex("e4ded2"),
		deep = hex("63594f"),
		soft = hex("d6cec0"),
	},
	rare = {
		main = hex("4f8cff"),
		strong = hex("9fdcff"),
		deep = hex("173f9b"),
		soft = hex("d7e8ff"),
	},
	epic = {
		main = hex("b066ff"),
		strong = hex("f2a7ff"),
		deep = hex("5f239f"),
		soft = hex("ead8ff"),
	},
	legendary = {
		main = hex("ffcf3e"),
		strong = hex("fff16b"),
		deep = hex("b46b00"),
		soft = hex("fff0b0"),
	},
	storm = {
		main = hex("45CFFF"),
		strong = hex("C9F6FF"),
		deep = hex("1A78D6"),
		soft = hex("D7F3FF"),
	},
	dynamite = {
		main = hex("FF6A2A"),
		strong = hex("FFE0A6"),
		deep = hex("C0241A"),
		soft = hex("FFD9C4"),
	},
	rift = {
		main = hex("FFA51C"),
		strong = hex("FFE6B0"),
		deep = hex("A3560E"),
		soft = hex("FFEBC8"),
	},
	frost = {
		main = hex("9FE3FF"),
		strong = hex("FFFFFF"),
		deep = hex("3A9BE0"),
		soft = hex("E3F7FF"),
	},
}

-- CSS cubic-bezier(x1, y1, x2, y2): solve x(t) = p by Newton, return y(t)
local function bezier(x1: number, y1: number, x2: number, y2: number): (number) -> number
	local function curve(a: number, b: number, t: number): number
		local u = 1 - t
		return 3 * u * u * t * a + 3 * u * t * t * b + t * t * t
	end
	return function(p: number): number
		if p <= 0 then
			return 0
		elseif p >= 1 then
			return 1
		end
		local t = p
		for _ = 1, 8 do
			local x = curve(x1, x2, t) - p
			local u = 1 - t
			local dx = 3 * u * u * x1 + 6 * u * t * (x2 - x1) + 3 * t * t * (1 - x2)
			if math.abs(dx) < 1e-6 then
				break
			end
			t = math.clamp(t - x / dx, 0, 1)
		end
		return curve(y1, y2, t)
	end
end
local EASE = bezier(0.25, 0.1, 0.25, 1) -- CSS `ease`
local RELIC = bezier(0.16, 1.2, 0.2, 1)
local FLECK = bezier(0.14, 0.86, 0.22, 1)

-- keyframes: { {at, {values}} … }, each segment eased; returns the values at progress p
local function sample(frames: { { any } }, p: number, ease: (number) -> number): { number }
	if p <= frames[1][1] then
		return frames[1][2]
	end
	for i = 2, #frames do
		local a, b = frames[i - 1], frames[i]
		if p <= b[1] then
			local k = ease((p - a[1]) / (b[1] - a[1]))
			local out = {}
			for j, v in a[2] do
				out[j] = v + (b[2][j] - v) * k
			end
			return out
		end
	end
	return frames[#frames][2]
end

local SCENE = { { 0, { 0 } }, { 0.07, { 1 } }, { 0.88, { 1 } }, { 1, { 0 } } }
local FLASH =
	{ { 0, { 0, 0.7 } }, { 0.12, { 1, 1 } }, { 0.32, { 0.72, 1.054 } }, { 1, { 0, 1.18 } } }
local RAYS = { { 0, { 0, 0.55, 0 } }, { 0.14, { 0.9, 0.95, 26 } }, { 1, { 0, 1.35, 178 } } }
-- opacity, y (share of the screen height), scale, rotation
local RELIC_FRAMES = {
	{ 0, { 0, 0.34, 0.42, -12 } },
	{ 0.14, { 1, 0, 1.16, 4 } },
	{ 0.28, { 1, -0.02, 0.96, -2 } },
	{ 0.58, { 1, -0.04, 1.05, 2 } },
	{ 1, { 0, -0.18, 0.88, -4 } },
}
local COPY = {
	{ 0, { 0, 18, 0.96 } },
	{ 0.18, { 0, 18, 0.96 } },
	{ 0.32, { 1, 0, 1 } },
	{ 0.82, { 1, 0, 1 } },
	{ 1, { 0, -10, 0.98 } },
}

local gui: ScreenGui? = nil
local parts: any = nil
local queue: { Burst } = {}
local playing = false

local function circle(parent: Instance, name: string, z: number): Frame
	local f = Instance.new("Frame")
	f.Name, f.AnchorPoint, f.Position, f.BorderSizePixel, f.ZIndex =
		name, Vector2.new(0.5, 0.5), UDim2.fromScale(0.5, 0.48), 0, z
	local corner = Instance.new("UICorner")
	corner.CornerRadius, corner.Parent = UDim.new(0.5, 0), f
	f.Parent = parent
	return f
end

local function build(): any
	local screen = Instance.new("ScreenGui")
	screen.Name, screen.ResetOnSpawn, screen.DisplayOrder, screen.IgnoreGuiInset =
		"RewardBurst", false, 40, true
	screen.Enabled = false
	local root = Instance.new("CanvasGroup")
	root.Name, root.Size, root.BackgroundTransparency, root.Parent =
		"Scene", UDim2.fromScale(1, 1), 1, screen
	local dim = Instance.new("Frame")
	dim.Name, dim.Size, dim.BackgroundColor3, dim.BorderSizePixel, dim.Parent =
		"Dim", UDim2.fromScale(1, 1), hex("1F1A17"), 0, root
	-- the radial flash, faked with soft concentric discs (Roblox has no radial gradient)
	local glows = {}
	for i, k in { 1.0, 0.74, 0.5, 0.3 } do
		local g = circle(root, "Glow" .. i, 2)
		g.Size = UDim2.fromScale(k * 0.9, k * 0.9)
		local aspect = Instance.new("UIAspectRatioConstraint")
		aspect.Parent = g
		glows[i] = g
	end
	-- rays: six long bars through the centre, a gradient shows both ends and hides the middle = twelve rays
	local rays = Instance.new("Frame")
	rays.Name, rays.AnchorPoint, rays.Position, rays.Size, rays.BackgroundTransparency, rays.ZIndex =
		"Rays", Vector2.new(0.5, 0.5), UDim2.fromScale(0.5, 0.48), UDim2.fromScale(1.2, 1.2), 1, 3
	local aspect = Instance.new("UIAspectRatioConstraint")
	aspect.Parent = rays
	rays.Parent = root
	local bars = {}
	for i = 1, 6 do
		local bar = Instance.new("Frame")
		bar.Name, bar.AnchorPoint, bar.Position, bar.BorderSizePixel =
			"Ray" .. i, Vector2.new(0.5, 0.5), UDim2.fromScale(0.5, 0.5), 0
		bar.Size, bar.Rotation, bar.ZIndex = UDim2.fromScale(0.07, 1), (i - 1) * 30, 3
		local grad = Instance.new("UIGradient")
		grad.Rotation = 90
		grad.Transparency = NumberSequence.new({
			NumberSequenceKeypoint.new(0, 1),
			NumberSequenceKeypoint.new(0.12, 0.25),
			NumberSequenceKeypoint.new(0.4, 0.55),
			NumberSequenceKeypoint.new(0.5, 1),
			NumberSequenceKeypoint.new(0.6, 0.55),
			NumberSequenceKeypoint.new(0.88, 0.25),
			NumberSequenceKeypoint.new(1, 1),
		})
		grad.Parent = bar
		bar.Parent = rays
		bars[i] = bar
	end
	-- flecks: 18 pills flying out of the centre
	local flecks = {}
	for i = 0, 17 do
		local f = Instance.new("Frame")
		f.Name, f.AnchorPoint, f.Size, f.ZIndex =
			"Fleck" .. i, Vector2.new(0.5, 0.5), UDim2.fromOffset(12, 28), 4
		local corner = Instance.new("UICorner")
		corner.CornerRadius, corner.Parent = UDim.new(1, 0), f
		local stroke = Instance.new("UIStroke")
		stroke.Color, stroke.Thickness, stroke.ApplyStrokeMode, stroke.Parent =
			INK, 2, Enum.ApplyStrokeMode.Border, f
		local grad = Instance.new("UIGradient")
		grad.Rotation, grad.Parent = 90, f
		f.Parent = root
		flecks[i + 1] = {
			frame = f,
			stroke = stroke,
			grad = grad,
			r = i * 20,
			tx = math.cos(i * 0.74) * (110 + i * 6),
			ty = math.sin(i * 1.08) * (88 + i * 5),
			delay = i * 0.018,
		}
	end
	-- the relic: a rounded card with the icon
	local relic = Instance.new("Frame")
	relic.Name, relic.AnchorPoint, relic.ZIndex = "Relic", Vector2.new(0.5, 0.5), 5
	relic.Size = UDim2.fromScale(0.3, 0.3)
	local relicAspect = Instance.new("UIAspectRatioConstraint")
	relicAspect.Parent = relic
	local relicCorner = Instance.new("UICorner")
	relicCorner.CornerRadius, relicCorner.Parent = UDim.new(0.28, 0), relic
	local relicStroke = Instance.new("UIStroke")
	relicStroke.Color, relicStroke.Thickness, relicStroke.ApplyStrokeMode, relicStroke.Parent =
		INK, 7, Enum.ApplyStrokeMode.Border, relic
	local relicGrad = Instance.new("UIGradient")
	relicGrad.Rotation, relicGrad.Parent = 90, relic
	local relicScale = Instance.new("UIScale")
	relicScale.Parent = relic
	local shine = circle(relic, "Shine", 5)
	shine.Position, shine.Size, shine.BackgroundTransparency =
		UDim2.fromScale(0.5, 0.42), UDim2.fromScale(0.86, 0.86), 0.35
	local icon = Candy.icon(relic, nil, UDim2.fromScale(0.74, 0.74), UDim2.fromScale(0.13, 0.13))
	icon.ZIndex = 6
	relic.Parent = root
	-- the copy
	local copy = Instance.new("Frame")
	copy.Name, copy.AnchorPoint, copy.BackgroundTransparency, copy.ZIndex =
		"Copy", Vector2.new(0.5, 0), 1, 7
	copy.Size = UDim2.fromScale(0.8, 0.22)
	local copyScale = Instance.new("UIScale")
	copyScale.Parent = copy
	local function line(name: string, y: number, h: number, size: number): TextLabel
		local t = Instance.new("TextLabel")
		t.Name, t.BackgroundTransparency, t.Size, t.Position, t.ZIndex =
			name, 1, UDim2.fromScale(1, h), UDim2.fromScale(0, y), 7
		t.FontFace, t.TextScaled, t.TextColor3 = Candy.font, true, hex("FFF8EC")
		local s = Instance.new("UIStroke")
		s.Color, s.Thickness, s.Parent = INK, 3, t
		local limit = Instance.new("UITextSizeConstraint")
		limit.MaxTextSize, limit.Parent = size, t
		t.Parent = copy
		return t
	end
	local kicker = line("Kicker", 0, 0.24, 20)
	local title = line("Title", 0.24, 0.46, 46)
	local subtitle = line("Subtitle", 0.72, 0.28, 24)
	copy.Parent = root
	screen.Parent = Players.LocalPlayer:WaitForChild("PlayerGui")
	gui = screen
	return {
		root = root,
		dim = dim,
		glows = glows,
		rays = rays,
		bars = bars,
		flecks = flecks,
		relic = relic,
		relicGrad = relicGrad,
		relicScale = relicScale,
		shine = shine,
		icon = icon,
		copy = copy,
		copyScale = copyScale,
		kicker = kicker,
		title = title,
		subtitle = subtitle,
	}
end

local function paint(p: Palette)
	parts.dim.BackgroundColor3 = hex("1F1A17")
	local glowColors = { p.deep, p.soft, p.strong, Color3.new(1, 1, 1) }
	for i, g in parts.glows do
		g.BackgroundColor3 = glowColors[i]
	end
	for _, bar in parts.bars do
		bar.BackgroundColor3 = p.strong
	end
	for _, f in parts.flecks do
		f.frame.BackgroundColor3 = Color3.new(1, 1, 1)
		f.grad.Color = ColorSequence.new(p.strong, p.deep)
	end
	parts.relic.BackgroundColor3 = Color3.new(1, 1, 1)
	parts.relicGrad.Color = ColorSequence.new(p.soft, p.main:Lerp(hex("FFF8EC"), 0.54))
	parts.shine.BackgroundColor3 = p.strong
end

local function play(burst: Burst)
	if not parts then
		parts = build()
	end
	local screen = gui :: ScreenGui
	paint(burst.palette or RewardBurst.palettes.legendary)
	Candy.setIcon(parts.icon, burst.icon)
	local old = parts.icon:FindFirstChild("CelIcon")
	if old then
		old:Destroy()
	end
	if burst.decorate then
		burst.decorate(parts.icon)
	end
	local power = math.clamp(burst.power or 1, 0.2, 1)
	local duration = DURATION * (0.7 + 0.3 * power)
	local fleckCount = math.max(4, math.floor(18 * power + 0.5))
	parts.kicker.Text, parts.title.Text, parts.subtitle.Text =
		burst.kicker, burst.title, burst.subtitle or ""
	screen.Enabled = true
	Sfx.play("card_morph", 0.3 + 0.2 * power)
	local started = os.clock()
	local done = false
	local connection
	connection = RunService.RenderStepped:Connect(function()
		local now = os.clock() - started
		local p = math.min(now / duration, 1)
		local view = screen.AbsoluteSize
		local scene = sample(SCENE, p, EASE)[1]
		parts.root.GroupTransparency = 1 - scene
		local flash = sample(FLASH, p, EASE)
		parts.dim.BackgroundTransparency = 1 - 0.72 * flash[1] * (0.45 + 0.55 * power)
		for i, g in parts.glows do
			g.BackgroundTransparency = 1
				- flash[1] * ({ 0.35, 0.45, 0.55, 0.5 })[i] * (0.5 + 0.5 * power)
			local k = ({ 1.0, 0.74, 0.5, 0.3 })[i] * 0.9 * flash[2] * (0.7 + 0.3 * power)
			g.Size = UDim2.fromScale(k, k)
		end
		local rays = sample(RAYS, p, EASE)
		parts.rays.Rotation = rays[3]
		parts.rays.Size = UDim2.fromScale(1.2 * rays[2], 1.2 * rays[2])
		for _, bar in parts.bars do
			bar.BackgroundTransparency = 1 - 0.72 * rays[1] * power
		end
		for index, f in parts.flecks do
			f.frame.Visible = index <= fleckCount
			local q = math.clamp((now - f.delay) / 1.2, 0, 1)
			local e = FLECK(q)
			local alpha = if q < 0.15 then q / 0.15 else 1 - (q - 0.15) / 0.85
			f.frame.Position = UDim2.new(0.5, f.tx * e, 0.48, f.ty * e)
			f.frame.Rotation = f.r
			local s = 0.28 + 0.72 * e
			f.frame.Size = UDim2.fromOffset(12 * s, 28 * s)
			f.frame.BackgroundTransparency = 1 - alpha
			f.stroke.Transparency = 1 - alpha
		end
		local relic = sample(RELIC_FRAMES, p, RELIC)
		parts.relic.Position = UDim2.new(0.5, 0, 0.42 + relic[2], 0)
		parts.relicScale.Scale = relic[3]
		parts.relic.Rotation = relic[4]
		parts.relic.Visible = relic[1] > 0.01
		local copy = sample(COPY, p, EASE)
		parts.copy.Position = UDim2.new(0.5, 0, 0.66, copy[2] * view.Y / 720)
		parts.copyScale.Scale = copy[3]
		for _, t in { parts.kicker, parts.title, parts.subtitle } do
			t.TextTransparency = 1 - copy[1]
			local stroke = t:FindFirstChildOfClass("UIStroke")
			if stroke then
				stroke.Transparency = 1 - copy[1]
			end
		end
		if p >= 1 and not done then
			done = true
			connection:Disconnect()
			screen.Enabled = false
			playing = false
			if #queue > 0 then
				play(table.remove(queue, 1) :: Burst)
				playing = true
			end
		end
	end)
end

-- Show a burst; a burst already on screen finishes first. Repeated bursts within one purchase run are merged to the
-- latest one so holding «buy ×10» does not stack ten overlays.
function RewardBurst.show(burst: Burst)
	game:GetService("Players").LocalPlayer:SetAttribute("MineAudioDuckUntil", os.clock() + DURATION)
	if playing then
		if #queue > 0 then
			queue[#queue] = burst
		else
			table.insert(queue, burst)
		end
		return
	end
	playing = true
	play(burst)
end

return RewardBurst
