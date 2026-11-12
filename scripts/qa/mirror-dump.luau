--!nocheck
-- QA mirror, step 1 (run on the Play CLIENT via the relay): what the camera sees, as JSON.
-- Roblox refuses pixel readback of captures in Play ("temporary texture id"), so scripts/qa/mirror.mjs dumps the
-- scene here, stops Play, rebuilds it in Edit (mirror-show.luau) and screenshots it there.
-- Plain parts are copied as they are; cel models (EditableMesh, not clonable) are rebuilt from their CelPick /
-- CelChest attribute and placed part by part.
local HttpService = game:GetService("HttpService")
local Lighting = game:GetService("Lighting")
local RADIUS, LIMIT = 90, 4000

local cam = workspace.CurrentCamera
local camPos = cam.CFrame.Position
local look = cam.CFrame.LookVector
local cosFov = math.cos(math.rad(math.max(cam.FieldOfView, 50) * 1.1))

local function r(v: number): number
	return math.round(v * 1000) / 1000
end
local function cf(c: CFrame): { number }
	local t = { c:GetComponents() }
	for i, v in t do
		t[i] = r(v)
	end
	return t
end
local function v3(v: Vector3): { number }
	return { r(v.X), r(v.Y), r(v.Z) }
end

local cels, skip = {}, {}
-- a mirror left in Edit is copied into Play: never dump it back
local stale = workspace:FindFirstChild("PlayMirror")
if stale then
	for _, p in stale:GetDescendants() do
		skip[p] = true
	end
end
for _, m in workspace:GetDescendants() do
	local body = if m:IsA("Model") then m:FindFirstChild("CelBody") else nil
	if
		body
		and body:IsA("BasePart")
		and not skip[body]
		and (m:GetAttribute("CelPick") or m:GetAttribute("CelChest"))
		-- the held pick is hidden in first person
		and body.LocalTransparencyModifier < 0.99
	then
		local parts = {}
		for _, p in m:GetDescendants() do
			if p:IsA("BasePart") then
				skip[p] = true
				table.insert(parts, { n = p.Name, c = cf(p.CFrame) })
			end
		end
		table.insert(cels, {
			pick = m:GetAttribute("CelPick"),
			chest = m:GetAttribute("CelChest"),
			scale = r(m:GetScale()),
			parts = parts,
		})
	end
end

local candidates = {}
for _, p in workspace:GetDescendants() do
	if
		p:IsA("BasePart")
		and not skip[p]
		and p.Transparency < 1
		and p.LocalTransparencyModifier < 0.99
	then
		local d = p.Position - camPos
		local dist = d.Magnitude
		local size = p.Size.Magnitude
		if
			dist < RADIUS + size
			and (dist < size + 3 or d.Unit:Dot(look) > cosFov - size / math.max(dist, 1))
		then
			table.insert(candidates, { p = p, d = dist })
		end
	end
end
table.sort(candidates, function(a, b)
	return a.d < b.d
end)

local parts = {}
for i = 1, math.min(#candidates, LIMIT) do
	local p = candidates[i].p
	local e = {
		k = p.ClassName,
		n = p.Name,
		c = cf(p.CFrame),
		s = v3(p.Size),
		col = p.Color:ToHex(),
		m = p.Material.Name,
		t = r(1 - (1 - p.Transparency) * (1 - p.LocalTransparencyModifier)),
	}
	if p:IsA("Part") then
		e.sh = p.Shape.Name
	elseif p:IsA("MeshPart") then
		e.mesh, e.tex = p.MeshId, p.TextureID
	end
	if p.MaterialVariant ~= "" then
		e.mv = p.MaterialVariant
	end
	local extras = {}
	for _, ch in p:GetChildren() do
		if ch:IsA("Texture") then
			table.insert(extras, {
				k = "Texture",
				tex = ch.Texture,
				f = ch.Face.Name,
				col = ch.Color3:ToHex(),
				t = r(ch.Transparency),
				u = r(ch.StudsPerTileU),
				v = r(ch.StudsPerTileV),
				ou = r(ch.OffsetStudsU),
				ov = r(ch.OffsetStudsV),
			})
		elseif ch:IsA("Decal") then
			table.insert(extras, {
				k = "Decal",
				tex = ch.Texture,
				f = ch.Face.Name,
				col = ch.Color3:ToHex(),
				t = r(ch.Transparency),
			})
		elseif ch:IsA("SpecialMesh") then
			table.insert(extras, {
				k = "SpecialMesh",
				mt = ch.MeshType.Name,
				mesh = ch.MeshId,
				tex = ch.TextureId,
				sc = v3(ch.Scale),
				of = v3(ch.Offset),
			})
		end
	end
	if #extras > 0 then
		e.x = extras
	end
	parts[i] = e
end

local vp = cam.ViewportSize
return HttpService:JSONEncode({
	cam = cf(cam.CFrame),
	fov = r(cam.FieldOfView),
	vp = { vp.X, vp.Y },
	light = {
		clock = Lighting.ClockTime,
		amb = Lighting.Ambient:ToHex(),
		oamb = Lighting.OutdoorAmbient:ToHex(),
		bright = Lighting.Brightness,
	},
	parts = parts,
	cels = cels,
})
