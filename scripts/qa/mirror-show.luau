--!nocheck
-- QA mirror, step 2 (run in EDIT via the relay, Play stopped): rebuilds the dump of mirror-dump.luau in
-- Workspace.PlayMirror and puts the camera where the Play camera was. scripts/qa/mirror.mjs pastes the JSON below.
-- `clear` mode (DUMP = "clear") removes the mirror and gives the camera back.
local HttpService = game:GetService("HttpService")
local AssetService = game:GetService("AssetService")
local DUMP = [==[__DUMP__]==]

local old = workspace:FindFirstChild("PlayMirror")
if old then
	old:Destroy()
end
local cam = workspace.CurrentCamera
local Lighting = game:GetService("Lighting")
local LIGHT = { "Ambient", "OutdoorAmbient", "Brightness", "ExposureCompensation", "ClockTime" }
local function restoreLight()
	for _, k in LIGHT do
		local v = Lighting:GetAttribute("MirrorOrig_" .. k)
		if v ~= nil then
			Lighting[k] = v
			Lighting:SetAttribute("MirrorOrig_" .. k, nil)
		end
	end
end
if DUMP == "clear" then
	restoreLight()
	cam.CameraType = Enum.CameraType.Fixed
	cam.CameraType = Enum.CameraType.Custom
	return "cleared"
end
local data = HttpService:JSONDecode(DUMP)
local folder = Instance.new("Folder")
folder.Name = "PlayMirror"
folder.Parent = workspace
-- hide the Edit world in the mirrored area? No: the dump already holds everything visible near the camera, and the
-- place's own map sits where the Play map was, so nothing is hidden; the mirror just overlays the same spots.

local function cframe(t)
	return CFrame.new(table.unpack(t))
end
local function vec(t)
	return Vector3.new(t[1], t[2], t[3])
end

local meshCache = {}
local made, failed = 0, 0
for _, e in data.parts do
	local part
	if e.k == "MeshPart" and e.mesh and e.mesh ~= "" then
		local proto = meshCache[e.mesh]
		if proto == nil then
			local ok, res = pcall(function()
				return AssetService:CreateMeshPartAsync(Content.fromUri(e.mesh))
			end)
			proto = if ok then res else false
			meshCache[e.mesh] = proto
		end
		if proto then
			part = proto:Clone()
			part.TextureID = e.tex or ""
		else
			failed += 1
			part = Instance.new("Part")
		end
	elseif e.k == "WedgePart" or e.k == "CornerWedgePart" or e.k == "TrussPart" then
		part = Instance.new(e.k)
	else
		part = Instance.new("Part")
		if e.sh then
			pcall(function()
				part.Shape = Enum.PartType[e.sh]
			end)
		end
	end
	part.Anchored, part.CanCollide, part.CanQuery, part.CanTouch = true, false, false, false
	part.Size = vec(e.s)
	part.CFrame = cframe(e.c)
	part.Color = Color3.fromHex(e.col)
	pcall(function()
		part.Material = Enum.Material[e.m]
	end)
	part.Transparency = e.t
	if e.mv then
		part.MaterialVariant = e.mv
	end
	for _, x in e.x or {} do
		if x.k == "Texture" or x.k == "Decal" then
			local d = Instance.new(x.k)
			d.Texture, d.Face, d.Color3, d.Transparency =
				x.tex, Enum.NormalId[x.f], Color3.fromHex(x.col), x.t
			if x.k == "Texture" then
				d.StudsPerTileU, d.StudsPerTileV, d.OffsetStudsU, d.OffsetStudsV =
					x.u, x.v, x.ou, x.ov
			end
			d.Parent = part
		elseif x.k == "SpecialMesh" then
			local m = Instance.new("SpecialMesh")
			pcall(function()
				m.MeshType = Enum.MeshType[x.mt]
			end)
			m.MeshId, m.TextureId, m.Scale, m.Offset = x.mesh, x.tex, vec(x.sc), vec(x.of)
			m.Parent = part
		end
	end
	part.Parent = folder
	made += 1
end

-- cel models: rebuild from the same code, then put every part where it was in Play
local Client = game:GetService("StarterPlayer").StarterPlayerScripts.Client:Clone()
Client.Parent = game:GetService("ServerStorage")
local ok, err = pcall(function()
	local CelMesh = require(Client.Fx.CelMesh)
	local CelPicks = require(Client.Fx.CelPicks)
	local WallRenderer = require(Client.Mine.WallRenderer)
	for _, c in data.cels do
		local template = if c.pick
			then CelPicks.template(c.pick)
			else WallRenderer.chestTemplate(c.chest)
		if template then
			local model = CelMesh.clone(template, c.scale)
			local list = {}
			for _, p in model:GetDescendants() do
				if p:IsA("BasePart") then
					table.insert(list, p)
				end
			end
			for i, p in list do
				local src = c.parts[i]
				if src then
					p.Anchored = true
					p.CFrame = cframe(src.c)
				end
			end
			model.Parent = folder
		end
	end
end)
Client:Destroy()

-- QA light: brighter than the game so every detail shows [владелец 12.11: «сделай сцену ярче»]; --clear restores it
for _, k in LIGHT do
	if Lighting:GetAttribute("MirrorOrig_" .. k) == nil then
		Lighting:SetAttribute("MirrorOrig_" .. k, Lighting[k])
	end
end
Lighting.ClockTime, Lighting.Brightness, Lighting.ExposureCompensation = 13, 3, 0.6
Lighting.Ambient, Lighting.OutdoorAmbient =
	Color3.fromRGB(150, 150, 155), Color3.fromRGB(170, 170, 175)
cam.CameraType = Enum.CameraType.Scriptable
cam.FieldOfView = data.fov
cam.CFrame = cframe(data.cam)
return string.format(
	"mirror: %d parts (%d meshes failed), %d cel models%s; Play viewport %dx%d",
	made,
	failed,
	#data.cels,
	if ok then "" else " — cel error: " .. tostring(err),
	data.vp[1],
	data.vp[2]
)
