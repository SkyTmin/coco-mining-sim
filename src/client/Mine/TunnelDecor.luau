--!strict

local Lighting = game:GetService("Lighting")
local TweenService = game:GetService("TweenService")
local Shared = game:GetService("ReplicatedStorage").Shared
local Config = require(Shared.Config)
local Worlds = require(Shared.Mine.Worlds)
local Wave = require(Shared.Mine.UltWave)
local BlockArt = require(script.Parent.BlockArt)

local S = Config.mine.blockSize
local WIDTH = Config.mine.startWidth * S
local ENTRANCE_WIDTH = Config.plots.frameWidth * S
local HEIGHT = Config.mine.height * S
local CUBE = Vector3.one * S
-- Keep the decorative floor above the existing collision plane.
local FLOOR_Y = -S / 2 + 0.035
local depthConfig = Config.fx.depth
local LENGTH = depthConfig.fogEnd
local SIMPLE_FROM = depthConfig.simpleFrom
local NEAR_SPACING = depthConfig.lampSpacing
local MIDDLE_SPACING = depthConfig.middleSpacing
local FAR_SPACING = depthConfig.distantSpacing
local SEGMENT = 2000
local LAMP = Color3.fromRGB(255, 215, 166)
local Tunnel = {}
local fade = TweenInfo.new(2, Enum.EasingStyle.Sine, Enum.EasingDirection.InOut)

local function rgb(bytes: { number }): Color3
	return Color3.fromRGB(bytes[1], bytes[2], bytes[3])
end

local function part(
	parent: Instance,
	name: string,
	size: Vector3,
	cframe: CFrame,
	color: Color3,
	material: Enum.Material?
): Part
	local p = Instance.new("Part")
	p.Name = name
	p.Anchored, p.CanCollide, p.CanQuery, p.CanTouch, p.CastShadow =
		true, false, false, false, false
	p.Size, p.CFrame, p.Color, p.Material =
		size, cframe, color, material or Enum.Material.SmoothPlastic
	p.Parent = parent
	return p
end

local function colorOf(world: Worlds.World): Color3
	return Color3.fromRGB(world.color[1], world.color[2], world.color[3])
end

local function tileGrid(t: any, width: number)
	if t.grid then
		t.grid:Destroy()
	end
	local grid = Instance.new("Folder")
	grid.Name, t.grid = "TunnelBlocks", grid
	t.tiles = {}
	local rock = t.rock or Config.art.worlds[Config.worlds[1].id].lining
	local function cube(name: string, x: number, y: number, depth: number, texture: string)
		local tile = part(grid, name, CUBE, t.frame * CFrame.new(x, y, -depth), Color3.new(1, 1, 1))
		BlockArt.apply(tile, texture)
		if name ~= "PlatformBlock" then
			table.insert(t.tiles, { part = tile, x = x, y = y, base = depth, depth = depth })
		end
	end
	local radius = (width / S - 1) / 2
	for depth = S / 2, SIMPLE_FROM - S / 2, S do
		for x = -radius, radius do
			cube("FloorBlock", x * S, FLOOR_Y, depth, rock)
			cube("CeilingBlock", x * S, HEIGHT + S / 2, depth, rock)
		end
		for _, side in { -1, 1 } do
			for y = S / 2, HEIGHT - S / 2, S do
				cube("WallBlock", side * (width + S) / 2, y, depth, rock)
			end
		end
	end
	if t.platform then
		local platformRadius = (ENTRANCE_WIDTH / S - 1) / 2
		for depth = -S / 2, -t.platform.Size.Z + S / 2, -S do
			for x = -platformRadius, platformRadius do
				cube("PlatformBlock", x * S, FLOOR_Y, depth, t.platformArt or "planks")
			end
		end
	end
	grid.Parent = t.model
end

function Tunnel.new(parent: Instance, frame: CFrame, plot: Instance): any
	local model = Instance.new("Folder")
	model.Name, model.Parent = "MineTunnel", parent
	local gray, trim = Color3.fromRGB(64, 66, 72), Color3.fromRGB(98, 107, 120)
	local spans, edges, walls, details = {}, {}, {}, {}
	local platform: BasePart? = nil
	local frameParts = {}
	for _, part in plot:GetChildren() do
		if part:IsA("BasePart") then
			if part.Name == "Platform" then
				platform = part
				part.LocalTransparencyModifier = 1
			end
			if part.Name == "FrameTop" then
				part.LocalTransparencyModifier = 1
			elseif part.Name == "FrameSide" then
				table.insert(frameParts, part)
			end
		end
	end
	local function fixed(
		name: string,
		size: Vector3,
		x: number,
		y: number,
		depth: number,
		color: Color3,
		neon: boolean?
	): Part
		local p = part(
			model,
			name,
			size,
			frame * CFrame.new(x, y, -depth),
			color,
			if neon then Enum.Material.Neon else nil
		)
		if name == "Wall" or name == "Floor" or name == "Ceiling" then
			table.insert(walls, p)
		end
		return p
	end
	for start = SIMPLE_FROM, LENGTH - 1, SEGMENT do
		local length = math.min(SEGMENT, LENGTH - start)
		table.insert(
			spans,
			fixed("Floor", Vector3.new(WIDTH, S, length), 0, FLOOR_Y, start + length / 2, gray)
		)
		table.insert(
			spans,
			fixed(
				"Ceiling",
				Vector3.new(WIDTH, S, length),
				0,
				HEIGHT + S / 2,
				start + length / 2,
				gray
			)
		)
		for _, side in { -1, 1 } do
			table.insert(edges, {
				side = side,
				extra = S / 2,
				part = fixed(
					"Wall",
					Vector3.new(S, HEIGHT, length),
					side * (WIDTH / 2 + S / 2),
					HEIGHT / 2,
					start + length / 2,
					gray
				),
			})
		end
	end
	local lamps = {}
	local function addSupport(depth: number, spacing: number)
		table.insert(
			spans,
			fixed("Arch", Vector3.new(WIDTH, 0.55, 1.1), 0, HEIGHT - 0.25, depth, trim)
		)
		local lamp = fixed("Lamp", Vector3.new(3, 0.3, 0.65), 0, HEIGHT - 0.7, depth, LAMP, true)
		table.insert(lamps, { part = lamp, depth = depth, spacing = spacing })
	end
	for depth = -S / 2, SIMPLE_FROM - 1, 4 * S do
		for _, side in { -1, 1 } do
			table.insert(edges, {
				side = side,
				extra = 0,
				part = fixed(
					"Arch",
					Vector3.new(0.55, HEIGHT, 1.1),
					side * WIDTH / 2,
					HEIGHT / 2,
					depth,
					trim
				),
			})
		end
		addSupport(depth, NEAR_SPACING)
		local pieces = {}
		for i = 1, 3 do
			pieces[i] = fixed("CaveDetail", Vector3.one, 0, 0, depth, trim)
		end
		table.insert(details, { depth = depth, pieces = pieces })
	end
	for depth = SIMPLE_FROM + MIDDLE_SPACING / 2, depthConfig.fogStart - 1, MIDDLE_SPACING do
		addSupport(depth, MIDDLE_SPACING)
	end
	for depth = depthConfig.fogStart, LENGTH - 6, FAR_SPACING do
		local lamp = fixed("Lamp", Vector3.new(3, 0.3, 0.65), 0, HEIGHT - 0.7, depth, LAMP, true)
		table.insert(lamps, { part = lamp, depth = depth, spacing = FAR_SPACING })
	end
	local glow = fixed(
		"DepthGlow",
		Vector3.new(WIDTH * 0.8, HEIGHT * 0.8, 0.2),
		0,
		HEIGHT / 2,
		LENGTH - 7,
		LAMP,
		true
	)
	glow.Transparency = 0.4
	local moving = Instance.new("Folder")
	moving.Name, moving.Parent = "MineDepth", parent
	local mass = part(moving, "FarOreMass", Vector3.one, frame, gray, Enum.Material.Slate)
	local background = part(moving, "FogBackground", Vector3.one, frame, gray, Enum.Material.Neon)
	background.Transparency = 1
	local wallFrames = {}
	for i, p in walls do
		wallFrames[i] = frame:ToObjectSpace(p.CFrame)
	end
	local face = part(moving, "SurvivorFace", Vector3.one, frame, LAMP, Enum.Material.Neon)
	local ticks = {}
	local tickCount = math.ceil((SIMPLE_FROM + 2) / (10 * S))
	for i = 1, tickCount do
		ticks[i] =
			part(moving, "DepthMark", Vector3.new(4, 0.06, 0.35), frame, trim, Enum.Material.Metal)
	end

	local atmosphere = Lighting:FindFirstChildOfClass("Atmosphere")
	local tunnel = {
		model = model,
		frame = frame,
		width = WIDTH,
		spans = spans,
		edges = edges,
		walls = walls,
		wallFrames = wallFrames,
		wallTravel = 0,
		background = background,
		ultimate = false,
		platform = platform,
		frameParts = frameParts,
		details = details,
		lampColor = LAMP,
		tweens = {},
		mass = mass,
		face = face,
		ticks = ticks,
		lamps = lamps,
		glow = glow,
		active = false,
		original = {
			Lighting.Ambient,
			Lighting.OutdoorAmbient,
			Lighting.Brightness,
			Lighting.FogStart,
			Lighting.FogEnd,
			Lighting.FogColor,
			Lighting.ShadowSoftness,
		},
		atmosphere = atmosphere,
		density = if atmosphere then atmosphere.Density else 0,
	}
	tileGrid(tunnel, WIDTH)
	return tunnel
end

function Tunnel.width(t: any, blocks: number)
	local width = blocks * S
	if width == t.width then
		return
	end
	t.width = width
	for _, p in t.spans do
		p.Size = Vector3.new(width, p.Size.Y, p.Size.Z)
	end
	for _, edge in t.edges do
		local p = edge.part
		local relative = t.frame:PointToObjectSpace(p.Position)
		p.CFrame = t.frame
			* CFrame.new(edge.side * (width / 2 + edge.extra), relative.Y, relative.Z)
	end
	tileGrid(t, width)
	t.glow.Size = Vector3.new(width * 0.8, HEIGHT * 0.8, 0.2)
	t.decorationWorld = nil
end

local function decorations(t: any, world: Worlds.World)
	if t.decorationWorld == world then
		return
	end
	t.decorationWorld = world
	for _, detail in t.details do
		local side = if detail.depth % 40 < 20 then 1 else -1
		for i, p in detail.pieces do
			p.Transparency = if world.look then (if world.index == 3 then 0.12 else 0) else 1
			if not world.look then
				continue
			end
			local x, y, depth =
				side * (t.width / 2 - 0.58 - (i - 1) * 0.31), 0.5, detail.depth + i * 1.1
			local angle = side * (i - 2) * 0.3
			if world.index == 1 then
				p.Name, p.Material = if i == 1 then "Root" else "Grass", Enum.Material.Wood
				p.Size = if i == 1
					then Vector3.new(0.36, 2.5, 0.35)
					else Vector3.new(0.22, 0.62 + i * 0.12, 0.19)
				p.Color = if i == 1 then rgb(world.look.wall) else rgb(world.look.decor)
				y, angle = if i == 1 then 1.0 else 0.4, if i == 1 then side * 0.47 else angle
			elseif world.index == 2 then
				p.Name, p.Material =
					if i == 3 then "CopperVein" else "Stalactite", Enum.Material.Sandstone
				p.Size = if i == 3
					then Vector3.new(0.22, 0.55, 2.3)
					else Vector3.new(0.44, 1.4 + i * 0.26, 0.56)
				p.Color =
					rgb(world.look.decor):Lerp(rgb(world.look.lamp), if i == 3 then 0.57 else 0.18)
				y, angle =
					if i == 3 then HEIGHT * 0.56 else HEIGHT - 0.8,
					if i == 3 then side * 0.42 else angle
			else
				p.Name, p.Material = "QuartzCrystal", Enum.Material.Neon
				p.Size, p.Color =
					Vector3.new(0.34, 0.65 + i * 0.27, 0.34),
					rgb(world.look.decor):Lerp(rgb(world.look.glow), i * 0.11)
				y = p.Size.Y / 2
			end
			p.CFrame = t.frame
				* CFrame.new(x, y, -depth)
				* CFrame.Angles(0.14 * (i - 2), math.pi / 4, angle)
		end
	end
end

function Tunnel.atmosphere(
	t: any,
	active: boolean,
	front: number,
	quality: number,
	ultimate: boolean?
)
	if not active then
		if t.active then
			for _, tween in t.tweens do
				tween:Cancel()
			end
			table.clear(t.tweens)
			local old = t.original
			Lighting.Ambient, Lighting.OutdoorAmbient, Lighting.Brightness = old[1], old[2], old[3]
			Lighting.FogStart, Lighting.FogEnd, Lighting.FogColor = old[4], old[5], old[6]
			Lighting.ShadowSoftness = old[7]
			if t.atmosphere then
				t.atmosphere.Parent = Lighting
				t.atmosphere.Density = t.density
			end
		end
		t.active, t.ultimate = false, false
		t.background.Transparency = 1
		t.mass.Transparency = 0
		return
	end
	local world = Worlds.of(front)
	decorations(t, world)
	local wasUltimate = t.ultimate
	local dome = ultimate == true
	if t.active and t.world == world and t.quality == quality and wasUltimate == dome then
		return
	end
	local changed = not t.active or t.world ~= world
	local shouldFade = t.active and t.world ~= world
	t.active, t.world, t.quality, t.ultimate = true, world, quality, dome
	local look = world.look
	local fog = if look
		then rgb(look.fog)
		else colorOf(world):Lerp(Color3.fromRGB(34, 37, 51), 0.65)
	if changed then
		for _, tween in t.tweens do
			tween:Cancel()
		end
		table.clear(t.tweens)
		local function paint(instance: Instance, key: string, value: Color3)
			if shouldFade then
				local tween = TweenService:Create(instance, fade, { [key] = value })
				table.insert(t.tweens, tween)
				tween:Play()
			else
				(instance :: any)[key] = value
			end
		end
		local art = Config.art.worlds[world.id]
		BlockArt.preload(world.id, world.index == 1)
		t.lampColor = Color3.fromHex(art.light)
		if not dome then
			paint(Lighting, "FogColor", fog)
		end
		paint(t.glow, "Color", if look then rgb(look.glow) else colorOf(Worlds.of(world.finish)))
		local rock = art.lining
		t.rock, t.platformArt = rock, if world.index == 1 then "planks" else rock
		for _, wall in t.walls do
			BlockArt.apply(wall, rock)
		end
		for _, tile in t.grid:GetChildren() do
			BlockArt.apply(tile, if tile.Name == "PlatformBlock" then t.platformArt else rock)
		end
		BlockArt.apply(t.mass, rock)
		for _, side in t.frameParts do
			BlockArt.apply(side, rock)
		end
		for _, beam in t.spans do
			if beam.Name == "Arch" then
				BlockArt.apply(beam, "beam")
				beam.Transparency = if world.index == 1 then 0 else 1
			end
		end
		for _, entry in t.edges do
			if entry.part.Name == "Arch" then
				BlockArt.apply(entry.part, "beam")
				entry.part.Transparency = if world.index == 1 then 0 else 1
			end
		end
		for _, lamp in t.lamps do
			paint(lamp.part, "Color", t.lampColor)
		end
	end
	Lighting.Ambient = Color3.fromRGB(118, 112, 109)
	Lighting.OutdoorAmbient = Color3.fromRGB(126, 119, 115)
	Lighting.Brightness, Lighting.ShadowSoftness = 1.32, 0.55
	if dome then
		for _, tween in t.tweens do
			tween:Cancel()
		end
		if t.atmosphere then
			t.atmosphere.Parent = nil
		end
		local lining = Color3.fromHex(Config.art.worlds[world.id].liningFog)
		Lighting.FogStart, Lighting.FogEnd, Lighting.FogColor =
			Wave.fogStart * S, Wave.fogEnd * S, lining
		t.background.Color = lining
	else
		Lighting.FogStart, Lighting.FogEnd = depthConfig.fogStart, LENGTH
		if wasUltimate then
			Lighting.FogColor = fog
		end
		if t.atmosphere then
			t.atmosphere.Parent = Lighting
			t.atmosphere.Density = 0
		end
	end
end

function Tunnel.moves(
	t: any,
	win: any,
	offset: number,
	visible: number,
	survivor: boolean,
	plateDistance: number?,
	parts: { BasePart },
	frames: { CFrame },
	travel: number?
)
	local function move(p: BasePart, x: number, y: number, depth: number)
		table.insert(parts, p)
		table.insert(frames, t.frame * CFrame.new(x, y, -depth))
	end
	for _, tile in t.tiles do
		local depth = tile.base
			+ math.max(
					0,
					math.ceil(
						((travel or 0) - Config.plots.platformDepth * S - tile.base) / SIMPLE_FROM
					)
				)
				* SIMPLE_FROM
		if depth ~= tile.depth then
			tile.depth = depth
			move(tile.part, tile.x, tile.y, depth)
		end
	end
	local wallTravel = math.max(0, (travel or 0) - Config.plots.platformDepth * S)
	if wallTravel ~= t.wallTravel then
		t.wallTravel = wallTravel
		for i, p in t.walls do
			table.insert(parts, p)
			table.insert(frames, t.frame * CFrame.new(0, 0, -wallTravel) * t.wallFrames[i])
		end
	end
	local world = Worlds.of(win.front)
	local rock = colorOf(world):Lerp(Color3.fromRGB(70, 65, 62), 0.46)
	local width, height = win.width * S, win.height * S
	t.background.Transparency = if t.ultimate then 0 else 1
	t.mass.Transparency = if t.ultimate then 1 else 0
	if t.ultimate then
		t.background.Size = Vector3.new(width * 2, height * 2, 0.2)
		move(t.background, 0, height / 2, (travel or 0) + (Wave.fogEnd + 8) * S)
	end
	local start = offset + visible * S
	if plateDistance and math.abs(plateDistance - start) < S then
		start = plateDistance + S
	end
	start = math.min(LENGTH - 1, start)
	local massLength = math.min(SEGMENT, LENGTH - start)
	t.mass.Size = Vector3.new(width, height - 0.06, massLength)
	move(t.mass, 0, height / 2, start + massLength / 2)
	local showFace = survivor and plateDistance ~= offset
	t.face.Transparency = if showFace then 0.16 else 1
	if showFace then
		t.face.Size, t.face.Color =
			Vector3.new(width - 0.4, height - 0.4, 0.14), rock:Lerp(LAMP, 0.55)
		move(t.face, 0, height / 2, offset - 0.1)
	end

	local markerSpacing = 10 * S
	local n = math.max(0, math.ceil((win.front + (-2 - offset) / S) / 10) * 10)
	local depth = offset + (n - win.front) * S
	for _, tick in t.ticks do
		tick.Transparency = if depth < SIMPLE_FROM then 0 else 1
		if depth < SIMPLE_FROM then
			move(tick, 0, 0.045, depth)
		end
		depth += markerSpacing
	end
end

return Tunnel
