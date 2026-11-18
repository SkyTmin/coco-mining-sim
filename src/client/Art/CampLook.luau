--!strict
local Lighting = game:GetService("Lighting")
local Debris = game:GetService("Debris")

local CampLook = {}

export type NameplateData = { name: string, rank: string?, depth: number }
export type MomentKind = "plate" | "ult" | "legendary" | "pickChest" | "core"
export type MomentData = {
	position: Vector3?, -- the entrance of the player it happened to
	color: Color3?, -- world / rarity colour
	userId: number?,
	pickId: string?,
	rarity: string?,
}

local Config = require(game:GetService("ReplicatedStorage").Shared.Config)
local Sfx = require(game:GetService("ReplicatedStorage").Shared.Sfx)
local SoundService = game:GetService("SoundService")
local camp = Config.camp
local initialClock = Lighting.ClockTime
local grade: ColorCorrectionEffect? = nil
local wind: Sound? = nil
local knockAt = 0
local skyReady = false

function CampLook.blend(alpha: number)
	if alpha == 0 and not grade then
		return
	end
	if not grade then
		grade = Instance.new("ColorCorrectionEffect")
		grade.Name, grade.Parent = "CampDusk", Lighting
	end
	if not skyReady then
		local sky = Lighting:FindFirstChildOfClass("Sky") or Instance.new("Sky")
		sky.StarCount, sky.CelestialBodiesShown, sky.Parent = 2800, true, Lighting
		skyReady = true
	end
	Lighting.ClockTime = initialClock + (camp.clockTime - initialClock) * alpha
	grade.TintColor = Color3.new(1, 1, 1):Lerp(Color3.fromRGB(255, 224, 203), alpha)
	grade.Saturation, grade.Contrast = 0.08 * alpha, 0.055 * alpha
	local bus = SoundService:FindFirstChild("MineSfx")
	if not wind and alpha > 0 and bus and bus:IsA("SoundGroup") then
		local clip = Config.sounds.clips.ult_rumble_away[1]
		local sound = Instance.new("Sound")
		sound.Name, sound.SoundId, sound.SoundGroup = "CraterWind", Config.sounds.atlasId, bus
		local region = NumberRange.new(clip[1], clip[1] + clip[2])
		sound.PlaybackRegionsEnabled, sound.PlaybackRegion, sound.LoopRegion = true, region, region
		sound.PlaybackSpeed, sound.Looped, sound.Volume, sound.Parent = 0.68, true, 0, SoundService
		local eq = Instance.new("EqualizerSoundEffect")
		eq.LowGain, eq.MidGain, eq.HighGain, eq.Parent = -12, -4, -18, sound
		wind = sound
	end
	if wind then
		wind.Volume = camp.ambience * 0.48 * alpha
		if alpha > 0 and not wind.IsPlaying then
			wind:Play()
		elseif alpha == 0 and wind.IsPlaying then
			wind:Stop()
		end
	end
	if alpha > 0.8 and os.clock() >= knockAt then
		knockAt = os.clock() + math.random(5, 11)
		Sfx.play("depth_knock", camp.ambience, 0.82)
	end
end

-- The line over a player's head (rank badge, name, depth). Returns the updater; destroy with the character.
local Format = require(game:GetService("ReplicatedStorage").Shared.Format)
local rankBadges = { "◇", "◆", "⚒", "✦", "✧", "★", "❖", "♜", "♛" }
local function rankIndex(id: string?): number
	for i, rank in Config.rebirth.ranks do
		if rank.id == id then
			return i + 1
		end
	end
	return 1
end

function CampLook.nameplate(character: Model): (NameplateData) -> ()
	local gui = Instance.new("BillboardGui")
	gui.Name, gui.Size, gui.StudsOffset, gui.AlwaysOnTop =
		"CampNameplate", UDim2.fromOffset(204, 26), Vector3.new(0, 2.25, 0), false
	gui.MaxDistance, gui.Adornee, gui.Parent =
		camp.nameDistance, character:FindFirstChild("Head"), character
	local pill = Instance.new("TextLabel")
	pill.Name, pill.Size, pill.BackgroundColor3, pill.BackgroundTransparency =
		"Tag", UDim2.fromScale(1, 1), Color3.fromHex("292338"), 0.19
	pill.Font, pill.TextSize, pill.TextColor3, pill.Parent =
		Enum.Font.GothamBold, 15, Color3.fromHex("FFF3D7"), gui
	local corner = Instance.new("UICorner")
	corner.CornerRadius, corner.Parent = UDim.new(1, 0), pill
	local rim = Instance.new("UIStroke")
	rim.Thickness, rim.Parent = 1.3, pill
	return function(data)
		local index = rankIndex(data.rank)
		rim.Color = Color3.fromHex(camp.rankColors[index])
		pill.Text =
			string.format("%s  %s   ⛏ %s", rankBadges[index], data.name, Format.short(data.depth))
	end
end

function CampLook.names()
	local players = game:GetService("Players")
	local self = players.LocalPlayer
	local function bind(actor: Instance, character: Model, name: string)
		local head = character:WaitForChild("Head", 8)
		if actor == self or not head or not character.Parent then
			return
		end
		local update = CampLook.nameplate(character)
		local gui = character:FindFirstChild("CampNameplate") :: BillboardGui
		local function refresh()
			update({
				name = name,
				rank = actor:GetAttribute("CampRank"),
				depth = actor:GetAttribute("CampBest") or 0,
			})
			gui.Enabled = self:GetAttribute("OnMinePlatform") ~= true
		end
		local connections = {
			actor:GetAttributeChangedSignal("CampRank"):Connect(refresh),
			actor:GetAttributeChangedSignal("CampBest"):Connect(refresh),
			self:GetAttributeChangedSignal("OnMinePlatform"):Connect(refresh),
		}
		character.Destroying:Once(function()
			for _, c in connections do
				c:Disconnect()
			end
		end)
		refresh()
	end
	local function playerAdded(player: Player)
		player.CharacterAdded:Connect(function(c)
			bind(player, c, player.DisplayName)
		end)
		if player.Character then
			task.spawn(bind, player, player.Character, player.DisplayName)
		end
	end
	players.PlayerAdded:Connect(playerAdded)
	for _, player in players:GetPlayers() do
		playerAdded(player)
	end
	local tags = game:GetService("CollectionService")
	local function bot(m: Instance)
		if m:IsA("Model") then
			task.spawn(bind, m, m, m:GetAttribute("CampName") or m.Name)
		end
	end
	tags:GetInstanceAddedSignal("CampBot"):Connect(bot)
	for _, m in tags:GetTagged("CampBot") do
		bot(m)
	end
end

-- A player's token on the depth scale (avatar circle with a rank-coloured ring). Codex moves the returned part.
function CampLook.scaleToken(
	parent: Instance,
	userId: number,
	rankColor: Color3,
	isSelf: boolean
): BasePart
	local p = Instance.new("Part")
	p.Name, p.Size, p.Anchored, p.CanCollide, p.CanTouch, p.Transparency =
		"Token_" .. userId, Vector3.one * 2, true, false, false, 1
	p:SetAttribute("CampUser", userId)
	local badge = Instance.new("BillboardGui")
	local size = if isSelf then 3.5 else 2.7
	badge.Size, badge.MaxDistance, badge.AlwaysOnTop, badge.Parent =
		UDim2.fromScale(size, size), 175, false, p
	local face = Instance.new("ImageLabel")
	face.Size, face.BackgroundColor3, face.Parent = UDim2.fromScale(0.88, 0.88), rankColor, badge
	face.Position = UDim2.fromScale(0.06, 0.06)
	face.Image = if userId > 0
		then "rbxthumb://type=AvatarHeadShot&id=" .. userId .. "&w=48&h=48"
		else ""
	local round = Instance.new("UICorner")
	round.CornerRadius, round.Parent = UDim.new(1, 0), face
	local rim = Instance.new("UIStroke")
	rim.Color, rim.Thickness, rim.Parent =
		if isSelf then Color3.fromHex("FFD34E") else rankColor, 3, face
	if userId < 0 then
		local glyph = Instance.new("TextLabel")
		glyph.Size, glyph.BackgroundTransparency, glyph.TextScaled, glyph.Text, glyph.Parent =
			UDim2.fromScale(1, 1), 1, true, "⚒", face
	end
	p.Parent = parent
	return p
end

function CampLook.scale()
	local rules = require(game:GetService("ReplicatedStorage").Shared.Play.CampRules)
	local self = game:GetService("Players").LocalPlayer
	local tween = game:GetService("TweenService")
	local plots = workspace:WaitForChild("Plots")
	local tokens = {}
	local root = Instance.new("Folder")
	root.Name, root.Parent = "ScaleTokens", workspace
	while true do
		for i = 1, Config.plots.count do
			local plot = plots:FindFirstChild("Plot_" .. i)
			local id = plot and plot:GetAttribute("CampUser")
			local front = plot and plot:GetAttribute("CampFront")
			local old = tokens[i]
			local rank = plot and plot:GetAttribute("CampRank")
			if old and (old.id ~= id or not front or old.rank ~= rank) then
				old.part:Destroy()
				tokens[i] = nil
				old = nil
			end
			if id and front then
				local y, angle = rules.token(front, i)
				local radius = camp.scaleRadius + 1.7
				local at = Vector3.new(
					math.sin(angle) * radius,
					math.max(1.6, y),
					-math.cos(angle) * radius
				)
				if not old then
					local token = CampLook.scaleToken(
						root,
						id,
						Color3.fromHex(camp.rankColors[rankIndex(rank)]),
						id == self.UserId
					)
					token.Position = at
					tokens[i] = { part = token, id = id, rank = rank }
				elseif old.part.Position ~= at then
					tween
						:Create(old.part, TweenInfo.new(camp.scaleSeconds * 0.7), { Position = at })
						:Play()
				end
			end
		end
		task.wait(camp.scaleSeconds)
	end
end

-- One of the six reactions over a character's head for 3 s [ТЗ-06 §9]. id: like|fire|bolt|wow|party|gem.
local EMOJI =
	{ like = "👍", fire = "🔥", bolt = "⚡", wow = "😮", party = "🎉", gem = "💎" }
function CampLook.reaction(character: Model, id: string)
	local head = character:FindFirstChild("Head") :: BasePart?
	if not head then
		return
	end
	local gui = Instance.new("BillboardGui")
	gui.Size, gui.StudsOffset, gui.Adornee = UDim2.fromOffset(60, 60), Vector3.new(0, 5, 0), head
	local label = Instance.new("TextLabel")
	label.Size, label.BackgroundTransparency, label.TextScaled = UDim2.fromScale(1, 1), 1, true
	label.Text, label.Parent = EMOJI[id] or "👍", gui
	gui.Parent = character
	gui.Name = "react_" .. id
	label.Font = Enum.Font.GothamBold
	label.Rotation = -8
	game:GetService("TweenService")
		:Create(
			gui,
			TweenInfo.new(0.3, Enum.EasingStyle.Back),
			{ StudsOffset = Vector3.new(0, 5.6, 0) }
		)
		:Play()
	Debris:AddItem(gui, Config.social.reactionSeconds)
end

-- A moment everyone sees [ТЗ-06 §12.2]. Codex decides who sees it (hideOthersFx), this only draws and plays it.
function CampLook.moment(kind: MomentKind, data: MomentData)
	if not data.position then
		return
	end
	local beam = Instance.new("Part")
	beam.Anchored, beam.CanCollide, beam.CanQuery, beam.Material =
		true, false, false, Enum.Material.Neon
	beam.Size, beam.Color = Vector3.new(2, 200, 2), data.color or Color3.new(1, 1, 1)
	beam.CFrame = CFrame.new(data.position + Vector3.new(0, 100, 0))
	beam.Name = "Moment_" .. kind
	beam.Parent = workspace
	Debris:AddItem(beam, 3)
end

-- Display meshes are shared templates. Only the local copies rotate.
function CampLook.showcases()
	local picks = require(script.Parent.Parent.Fx.CelPicks)
	local PickModel = require(game:GetService("ReplicatedStorage").Shared.Models.PickModel)
	local shown: { [Attachment]: Model } = {}
	local root = workspace:WaitForChild("Plots")
	local function bind(a: Instance)
		if not a:IsA("Attachment") or a.Name ~= "Item" then
			return
		end
		local generation = 0
		local function refresh()
			generation += 1
			local current = generation
			if shown[a] then
				shown[a]:Destroy()
				shown[a] = nil
			end
			local id = a:GetAttribute("Pick")
			if not id or not a.Parent then
				return
			end
			local template = picks.template(id)
			if current ~= generation or not a:IsDescendantOf(root) then
				return
			end
			local m = if template
				then template:Clone()
				else PickModel.forPick(id, a.WorldCFrame, true)
			m.Name = "DisplayPick"
			for _, p in m:GetDescendants() do
				if p:IsA("BasePart") then
					p.Anchored, p.CanCollide, p.CanQuery, p.CanTouch = true, false, false, false
				end
			end
			m:PivotTo(a.WorldCFrame)
			local glow = Instance.new("Highlight")
			local colors = { "BA9569", "8CAB91", "69C3F2", "BE85FA", "FFBE50" }
			local stars = Config.progress.rarities[Config.pickaxes[id].rarity].stars
			glow.OutlineColor =
				Color3.fromHex(if a:GetAttribute("Golden") then "FFE495" else colors[stars + 1])
			glow.FillColor, glow.FillTransparency, glow.OutlineTransparency =
				glow.OutlineColor, 0.85, 0.32
			glow.DepthMode, glow.Parent = Enum.HighlightDepthMode.Occluded, m
			shown[a] = m
			m.Parent = a.Parent
		end
		a:GetAttributeChangedSignal("Pick"):Connect(refresh)
		a:GetAttributeChangedSignal("Golden"):Connect(refresh)
		a.Destroying:Once(function()
			generation += 1
			if shown[a] then
				shown[a]:Destroy()
				shown[a] = nil
			end
		end)
		task.defer(refresh)
	end
	root.DescendantAdded:Connect(bind)
	for _, item in root:GetDescendants() do
		bind(item)
	end
	game:GetService("RunService").Heartbeat:Connect(function()
		local angle = os.clock() * 0.55
		for mount, model in shown do
			model:PivotTo(mount.WorldCFrame * CFrame.Angles(0, angle, math.rad(16)))
		end
	end)
end
return CampLook
