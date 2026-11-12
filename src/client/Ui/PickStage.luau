--!strict
-- The stage behind a pickaxe preview (the «Кирка» page hero, the collection's selected pick)
-- [владелец 12.11: «фон где кирки надо поменять… на максимум, чтобы была разница между ними»].
-- Built like gacha reveal backdrops (a rarity-tinted radial burst whose strength grows with the tier, gold for the top):
--   common     cool grey-blue gradient, a soft light behind the pick, a shadow pedestal
--   rare       blue, 8 slow rays, a rarity rim
--   epic       purple, 12 rays, a glowing ring pedestal, twinkling stars
--   legendary  gold, 16 rays + 8 wide counter-rotating ones, a running gold glint on the rim, more stars
-- The family tints the light and the stars. All GUI: particles do not render inside a ViewportFrame.
-- Sources: devforum «UIGradient [LIVE]» (rotate a gradient, do not rebuild sequences per frame), «Particles in
-- Viewport Frames» (no particles there), gacha rarity colour conventions (gold = top tier).
local RunService = game:GetService("RunService")

local PickStage = {}

local hex = Color3.fromHex
type Look = {
	top: Color3,
	bottom: Color3,
	light: Color3,
	rays: number,
	wide: number,
	rayAlpha: number,
	stars: number,
	rim: Color3?,
	ring: boolean,
	glint: boolean,
}
local LOOKS: { [string]: Look } = {
	starter = {
		top = hex("C08A55"),
		bottom = hex("4E2E16"),
		light = hex("FFE9C8"),
		rays = 0,
		wide = 0,
		rayAlpha = 1,
		stars = 0,
		ring = false,
		glint = false,
	},
	common = {
		top = hex("7D8CA3"),
		bottom = hex("2E3A4F"),
		light = hex("E3EAF4"),
		rays = 0,
		wide = 0,
		rayAlpha = 1,
		stars = 0,
		ring = false,
		glint = false,
	},
	rare = {
		top = hex("3E9BFF"),
		bottom = hex("0E2F73"),
		light = hex("CFEFFF"),
		rays = 8,
		wide = 0,
		rayAlpha = 0.6,
		stars = 0,
		rim = hex("3FA9FF"),
		ring = false,
		glint = false,
	},
	epic = {
		top = hex("A35BFF"),
		bottom = hex("2E0D66"),
		light = hex("F0DCFF"),
		rays = 12,
		wide = 0,
		rayAlpha = 0.5,
		stars = 7,
		rim = hex("B57BFF"),
		ring = true,
		glint = false,
	},
	legendary = {
		top = hex("FFB52E"),
		bottom = hex("7A2E05"),
		light = hex("FFF3B0"),
		rays = 16,
		wide = 8,
		rayAlpha = 0.4,
		stars = 12,
		rim = hex("FFC83D"),
		ring = true,
		glint = true,
	},
}
local FAMILY_LIGHT: { [string]: Color3 } = {
	storm = hex("8BE1FF"),
	dynamite = hex("FF9A5A"),
	rift = hex("FFC266"),
	frost = hex("D8F6FF"),
}

local function frame(
	parent: Instance,
	name: string,
	size: UDim2,
	at: UDim2,
	color: Color3?,
	alpha: number?
): Frame
	local f = Instance.new("Frame")
	f.Name, f.BorderSizePixel, f.Size, f.Position = name, 0, size, at
	f.BackgroundColor3 = color or Color3.new(1, 1, 1)
	f.BackgroundTransparency = alpha or 0
	f.Parent = parent
	return f
end

local function round(gui: GuiObject, radius: UDim)
	local c = Instance.new("UICorner")
	c.CornerRadius = radius
	c.Parent = gui
end

local function gradient(
	gui: GuiObject,
	colors: ColorSequence?,
	alpha: NumberSequence?,
	rotation: number
): UIGradient
	local g = Instance.new("UIGradient")
	if colors then
		g.Color = colors
	end
	if alpha then
		g.Transparency = alpha
	end
	g.Rotation = rotation
	g.Parent = gui
	return g
end

local live: { [Frame]: { spin: { { gui: GuiObject, speed: number } }, stars: { Frame }, glint: UIGradient? } } =
	{}
local loop: RBXScriptConnection? = nil

local function shown(gui: Instance): boolean
	local g: Instance? = gui
	while g do
		if g:IsA("GuiObject") and not g.Visible then
			return false
		elseif g:IsA("LayerCollector") then
			return (g :: any).Enabled ~= false
		end
		g = g.Parent
	end
	return false
end

local function step()
	local t = os.clock()
	for stage, anim in live do
		if not stage.Parent then
			live[stage] = nil
		elseif shown(stage) then
			for _, s in anim.spin do
				s.gui.Rotation = (t * s.speed) % 360
			end
			for i, star in anim.stars do
				-- each star twinkles on its own beat: grows, flashes, fades
				local k = math.max(0, math.sin(t * (1.3 + (i % 4) * 0.35) + i * 1.7))
				local size = star:GetAttribute("Size") :: number
				star.Size = UDim2.fromScale(size * (0.35 + k), size * (0.35 + k))
				for _, bar in star:GetChildren() do
					if bar:IsA("Frame") then
						bar.BackgroundTransparency = 1 - k * 0.95
					end
				end
			end
			if anim.glint then
				anim.glint.Offset = Vector2.new(((t * 0.45) % 2.4) - 1.2, 0)
			end
		end
	end
	if next(live) == nil and loop then
		loop:Disconnect()
		loop = nil
	end
end

-- Build (or rebuild for another pick) the stage inside `parent`, covering `size` at `at`.
-- `corner` = the parent's corner radius (the stage's top corners match it).
function PickStage.apply(
	parent: GuiObject,
	rarity: string,
	family: string?,
	size: UDim2,
	at: UDim2,
	corner: UDim?,
	mini: boolean? -- a small grid cell: the backdrop, one light disc and the rim only
)
	local key = rarity .. "/" .. (family or "") .. (if mini then "/mini" else "")
	local old = parent:FindFirstChild("PickStage") :: Frame?
	if old and old:GetAttribute("Key") == key then
		return
	end
	if old then
		live[old] = nil
		old:Destroy()
	end
	local look = LOOKS[rarity] or LOOKS.common
	local light = look.light
	local familyLight = if family then FAMILY_LIGHT[family] else nil
	if familyLight then
		light = light:Lerp(familyLight, 0.35)
	end

	local stage = frame(parent, "PickStage", size, at, Color3.new(1, 1, 1))
	stage:SetAttribute("Key", key)
	-- ZIndex 1, not 0: with Global ordering a 0 went under its own panel and only the rays showed
	stage.ClipsDescendants, stage.ZIndex = true, 1
	round(stage, corner or UDim.new(0, 12))
	-- 1. the backdrop: light at the top, deep rarity colour at the bottom
	gradient(
		stage,
		ColorSequence.new({
			ColorSequenceKeypoint.new(0, look.top),
			ColorSequenceKeypoint.new(0.55, look.top:Lerp(look.bottom, 0.45)),
			ColorSequenceKeypoint.new(1, look.bottom),
		}),
		nil,
		90
	)
	local anim = { spin = {}, stars = {}, glint = nil :: UIGradient? }
	local centre = UDim2.fromScale(0.5, 0.44)

	-- 2. rays: thin bars from the centre, fading outwards; the whole wheel turns slowly
	local function wheel(count: number, width: number, alpha: number, speed: number, color: Color3)
		if count <= 0 then
			return
		end
		local hub = frame(stage, "Rays", UDim2.fromScale(2.2, 2.2), centre, color, 1)
		hub.AnchorPoint = Vector2.new(0.5, 0.5)
		local ratio = Instance.new("UIAspectRatioConstraint")
		ratio.Parent = hub
		for i = 1, count do
			local holder =
				frame(hub, "Ray", UDim2.fromScale(1, 1), UDim2.fromScale(0.5, 0.5), color, 1)
			holder.AnchorPoint, holder.Rotation = Vector2.new(0.5, 0.5), (i - 1) * 360 / count
			-- a ray = the upper half of a bar through the hub centre, wider at the rim
			local ray =
				frame(holder, "Bar", UDim2.new(width, 0, 0.5, 0), UDim2.fromScale(0.5, 0), color, 0)
			ray.AnchorPoint = Vector2.new(0.5, 0)
			gradient(
				ray,
				nil,
				NumberSequence.new({
					NumberSequenceKeypoint.new(0, 1),
					NumberSequenceKeypoint.new(0.45, alpha),
					NumberSequenceKeypoint.new(0.85, alpha * 0.7 + 0.25),
					NumberSequenceKeypoint.new(1, 1),
				}),
				90
			)
		end
		table.insert(anim.spin, { gui = hub, speed = speed })
	end
	if not mini then
		wheel(look.wide, 0.11, look.rayAlpha + 0.2, -4, light)
		wheel(look.rays, 0.035, look.rayAlpha, 7, light)
	end

	-- 3. the soft light behind the pick: concentric discs, each fainter and larger
	for i, k in if mini then { 0.9 } else { 0.95, 0.7, 0.45 } do
		local disc =
			frame(stage, "Light" .. i, UDim2.fromScale(k, k), centre, light, 0.62 + i * 0.1)
		disc.AnchorPoint = Vector2.new(0.5, 0.5)
		local ratio = Instance.new("UIAspectRatioConstraint")
		ratio.Parent = disc
		round(disc, UDim.new(0.5, 0))
	end

	-- 4. the pedestal: a shadow ellipse, and a glowing ring for the higher tiers; their width follows the height, so
	-- a wide short stage does not get a bar across it [владелец 12.11]
	local function flat(gui: GuiObject, ratio: number)
		local c = Instance.new("UIAspectRatioConstraint")
		c.AspectRatio, c.Parent = ratio, gui
	end
	local shadow = frame(
		stage,
		"Pedestal",
		UDim2.fromScale(0.5, 0.055),
		UDim2.fromScale(0.5, 0.9),
		Color3.new(0, 0, 0),
		0.55
	)
	shadow.AnchorPoint, shadow.Visible = Vector2.new(0.5, 0.5), not mini
	round(shadow, UDim.new(0.5, 0))
	flat(shadow, 9)
	if look.ring and not mini then
		local ring =
			frame(stage, "Ring", UDim2.fromScale(0.62, 0.085), UDim2.fromScale(0.5, 0.9), light, 1)
		ring.AnchorPoint = Vector2.new(0.5, 0.5)
		round(ring, UDim.new(0.5, 0))
		flat(ring, 7)
		local stroke = Instance.new("UIStroke")
		stroke.Color, stroke.Thickness, stroke.Transparency = look.rim or light, 2, 0.1
		stroke.Parent = ring
	end

	-- 5. stars: four-point twinkles at fixed spots around the pick (never over its middle)
	local spots = {
		-- inside the edges: a star in a corner read as a close button [владелец 12.11]
		{ 0.2, 0.2 },
		{ 0.8, 0.18 },
		{ 0.84, 0.55 },
		{ 0.16, 0.6 },
		{ 0.34, 0.12 },
		{ 0.7, 0.74 },
		{ 0.26, 0.4 },
		{ 0.76, 0.36 },
		{ 0.5, 0.1 },
		{ 0.2, 0.8 },
		{ 0.62, 0.16 },
		{ 0.4, 0.78 },
	}
	for i = 1, if mini then 0 else look.stars do
		local spot = spots[i]
		local size = 0.07 + (i % 3) * 0.025
		local star = frame(
			stage,
			"Star",
			UDim2.fromScale(size, size),
			UDim2.fromScale(spot[1], spot[2]),
			light,
			1
		)
		star.AnchorPoint = Vector2.new(0.5, 0.5)
		star:SetAttribute("Size", size)
		local ratio = Instance.new("UIAspectRatioConstraint")
		ratio.Parent = star
		for _, rot in { 0, 90 } do
			local bar = frame(
				star,
				"Bar",
				UDim2.fromScale(0.16, 1),
				UDim2.fromScale(0.5, 0.5),
				Color3.new(1, 1, 1)
			)
			bar.AnchorPoint, bar.Rotation = Vector2.new(0.5, 0.5), rot
			round(bar, UDim.new(0.5, 0))
			gradient(
				bar,
				ColorSequence.new(light, Color3.new(1, 1, 1)),
				NumberSequence.new({
					NumberSequenceKeypoint.new(0, 1),
					NumberSequenceKeypoint.new(0.5, 0),
					NumberSequenceKeypoint.new(1, 1),
				}),
				90
			)
		end
		table.insert(anim.stars, star)
	end

	-- 6. vignette at the bottom (the name and buttons sit below on the panel) and a light haze at the top
	local fade = frame(
		stage,
		"Vignette",
		UDim2.fromScale(1, 0.35),
		UDim2.fromScale(0, 0.65),
		Color3.new(0, 0, 0)
	)
	gradient(
		fade,
		nil,
		NumberSequence.new({ NumberSequenceKeypoint.new(0, 1), NumberSequenceKeypoint.new(1, 0.62) }),
		90
	)

	fade.Visible = not mini

	-- 7. the rim: rarity colour; the legendary one has a gold glint running round it
	if look.rim then
		local rim = Instance.new("UIStroke")
		rim.Color, rim.Thickness, rim.ApplyStrokeMode =
			look.rim, if mini then 2 else 3, Enum.ApplyStrokeMode.Border
		rim.Parent = stage
		if look.glint then
			anim.glint = gradient(
				rim :: any,
				ColorSequence.new({
					ColorSequenceKeypoint.new(0, look.rim),
					ColorSequenceKeypoint.new(0.45, look.rim),
					ColorSequenceKeypoint.new(0.5, Color3.new(1, 1, 1)),
					ColorSequenceKeypoint.new(0.55, look.rim),
					ColorSequenceKeypoint.new(1, look.rim),
				}),
				nil,
				35
			)
		end
	end

	live[stage] = anim
	if not loop then
		loop = RunService.RenderStepped:Connect(step)
	end
end

return PickStage
