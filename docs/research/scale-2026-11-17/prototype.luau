-- QA prototype (Edit): how a mine wall with lanes drilled 300…6000 layers deep reads from the player's eye.
-- Builds workspace.QA_FarProto far from the camp, moves the Edit camera, remembers Lighting/camera to restore.
local Lighting = game:GetService("Lighting")
local old = workspace:FindFirstChild("QA_FarProto")
if old then old:Destroy() end
local folder = Instance.new("Folder")
folder.Name = "QA_FarProto"
folder.Parent = workspace
local S, COLS, ROWS = 5, 7, 3
local O = Vector3.new(40000, 2000, 0)
local function p(size, pos, color, mat)
	local b = Instance.new("Part")
	b.Anchored, b.CanCollide, b.CanQuery, b.CanTouch = true, false, false, false
	b.Size, b.Position, b.Color = size, pos, color
	b.Material = mat or Enum.Material.Slate
	b.Parent = folder
	return b
end
local rockColors = { Color3.fromRGB(122, 112, 98), Color3.fromRGB(150, 98, 70), Color3.fromRGB(160, 160, 175), Color3.fromRGB(190, 160, 70), Color3.fromRGB(150, 205, 230) }
local bounds = { 0, 500, 1600, 4000, 9300 } -- world starts in layers
local function worldAt(layer)
	local w = 1
	for i, b in bounds do if layer >= b then w = i end end
	return w
end
-- lanes: column, row, width, height (blocks), depth in layers
local lanes = {
	{ c = 3, r = 0, w = 1, h = 3, depth = 6000 }, -- centre channel, full height
	{ c = 0, r = 1, w = 1, h = 1, depth = 1500 },
	{ c = 6, r = 0, w = 1, h = 1, depth = 3000 },
	{ c = 5, r = 2, w = 1, h = 1, depth = 300 },
	{ c = 1, r = 2, w = 1, h = 1, depth = 800 },
}
local function laneAt(c, r)
	for _, l in lanes do if c >= l.c and c < l.c + l.w and r >= l.r and r < l.r + l.h then return l end end
	return nil
end
local parts = 0
-- the wall face: one block per cell (the real game draws ~60 layers of blocks here)
for c = 0, COLS - 1 do
	for r = 0, ROWS - 1 do
		if not laneAt(c, r) then
			local b = p(Vector3.one * S, O + Vector3.new((c - 3) * S, r * S + S / 2, S / 2), rockColors[1]:Lerp(Color3.new(0,0,0), ((c + r) % 3) * 0.06))
			parts += 1
		end
	end
end
-- each lane: 4 long faces in 2000-stud segments, coloured by world; lamp strips every 100 layers; a glowing end cap
for _, l in lanes do
	local x0 = (l.c - 3) * S - S / 2
	local x1 = x0 + l.w * S
	local y0, y1 = l.r * S, (l.r + l.h) * S
	local cx, cy = (x0 + x1) / 2, (y0 + y1) / 2
	local length = l.depth * S
	local z = 0
	while z < length do
		local seg = math.min(2000, length - z)
		local layer = math.floor((z + seg / 2) / S)
		local col = rockColors[worldAt(layer)]
		local zc = z + seg / 2
		p(Vector3.new(x1 - x0 + 2, 1, seg), O + Vector3.new(cx, y0 - 0.5, zc), col:Lerp(Color3.new(0,0,0), 0.25))
		p(Vector3.new(x1 - x0 + 2, 1, seg), O + Vector3.new(cx, y1 + 0.5, zc), col:Lerp(Color3.new(0,0,0), 0.35))
		p(Vector3.new(1, y1 - y0, seg), O + Vector3.new(x0 - 0.5, cy, zc), col)
		p(Vector3.new(1, y1 - y0, seg), O + Vector3.new(x1 + 0.5, cy, zc), col:Lerp(Color3.new(0,0,0), 0.1))
		parts += 4
		z += seg
	end
	for layer = 50, l.depth - 1, 100 do
		local lamp = p(Vector3.new(x1 - x0 - 0.6, 0.3, 0.6), O + Vector3.new(cx, y1 - 0.2, layer * S), Color3.fromRGB(255, 215, 166), Enum.Material.Neon)
		parts += 1
	end
	for _, b in bounds do
		if b > 0 and b < l.depth then
			local ring = p(Vector3.new(x1 - x0, 0.4, 1.5), O + Vector3.new(cx, y0 + 0.25, b * S), rockColors[worldAt(b)], Enum.Material.Neon)
			parts += 1
		end
	end
	p(Vector3.new(x1 - x0, y1 - y0, 1), O + Vector3.new(cx, cy, length + 0.5), rockColors[worldAt(l.depth)]:Lerp(Color3.new(1,1,1), 0.3), Enum.Material.Neon)
	parts += 1
end
-- dark mass around so the sky does not show between lanes
p(Vector3.new(400, 1, 400), O + Vector3.new(0, -0.5, -150), Color3.fromRGB(60, 60, 66))
-- rock around the 7x3 face (left, right, above) so nothing but the wall is in view
local fw = COLS * S
p(Vector3.new(60, 80, S), O + Vector3.new(-fw / 2 - 30, 40, S / 2), Color3.fromRGB(95, 88, 78))
p(Vector3.new(60, 80, S), O + Vector3.new(fw / 2 + 30, 40, S / 2), Color3.fromRGB(95, 88, 78))
p(Vector3.new(fw, 80 - ROWS * S, S), O + Vector3.new(0, ROWS * S + (80 - ROWS * S) / 2, S / 2), Color3.fromRGB(95, 88, 78))
-- the tunnel the player stands in: side walls and ceiling back to the camera
p(Vector3.new(1, ROWS * S, 60), O + Vector3.new(-fw / 2 - 0.5, ROWS * S / 2, -30), Color3.fromRGB(80, 74, 66))
p(Vector3.new(1, ROWS * S, 60), O + Vector3.new(fw / 2 + 0.5, ROWS * S / 2, -30), Color3.fromRGB(80, 74, 66))
p(Vector3.new(fw + 2, 1, 60), O + Vector3.new(0, ROWS * S + 0.5, -30), Color3.fromRGB(70, 64, 58))
local save = { Lighting.FogStart, Lighting.FogEnd, workspace.CurrentCamera.CFrame }
if not workspace:GetAttribute("QA_FarProtoSave") then
	local a, o = Lighting.Ambient, Lighting.OutdoorAmbient
	workspace:SetAttribute("QA_FarProtoSave", game:GetService("HttpService"):JSONEncode({ Lighting.FogStart, Lighting.FogEnd, { workspace.CurrentCamera.CFrame:GetComponents() }, { a.R, a.G, a.B }, { o.R, o.G, o.B }, Lighting.ClockTime, Lighting.Brightness }))
end
Lighting.Ambient, Lighting.OutdoorAmbient = Color3.fromRGB(150, 140, 130), Color3.fromRGB(150, 140, 130)
Lighting.ClockTime, Lighting.Brightness = 13, 2
Lighting.FogStart, Lighting.FogEnd = 3000, 60000
local eye = O + Vector3.new(0, 7.5, -22)
workspace.CurrentCamera.CFrame = CFrame.lookAt(eye, eye + Vector3.new(0, 0, 1))
return "parts=" .. parts
