-- QA (Studio, client): dumps the visible MineCandy GUI as flat absolute boxes. Studio Play gives no pixels, so
-- rebuild the dump in Edit with scripts/qa/gui-rebuild.luau (DATA = this output) and take `agent.mjs shot edit`: real
-- Roblox fonts. Remove StarterGui.QAGuiSnapshot afterwards.
-- dumps the visible MineCandy GUI as flat absolute boxes (for an Edit-mode rebuild with real fonts)
local Http = game:GetService("HttpService")
local pl = game:GetService("Players").LocalPlayer
local root = pl.PlayerGui:WaitForChild("MineCandy")
local vp = workspace.CurrentCamera.ViewportSize
local out = {}
local function c3(c) return { math.round(c.R * 255), math.round(c.G * 255), math.round(c.B * 255) } end
local function visit(obj, rots)
	if obj:IsA("GuiObject") and not obj.Visible then return end
	local myRots = rots
	if obj:IsA("GuiObject") then
		local p, s = obj.AbsolutePosition, obj.AbsoluteSize
		local cx, cy = p.X + s.X / 2, p.Y + s.Y / 2
		local total = obj.Rotation
		for i = #rots, 1, -1 do
			local r = rots[i]
			local a = math.rad(r[3])
			local dx, dy = cx - r[1], cy - r[2]
			cx, cy = r[1] + dx * math.cos(a) - dy * math.sin(a), r[2] + dx * math.sin(a) + dy * math.cos(a)
			total += r[3]
		end
		local e = { k = obj.ClassName, x = cx, y = cy, w = s.X, h = s.Y, r = total, bg = c3(obj.BackgroundColor3), bt = obj.BackgroundTransparency }
		if obj:IsA("TextLabel") or obj:IsA("TextButton") then
			e.t, e.tc, e.tt, e.sc, e.ts = obj.Text, c3(obj.TextColor3), obj.TextTransparency, obj.TextScaled, obj.TextSize
			e.xa, e.ya, e.wr, e.rich = obj.TextXAlignment.Name, obj.TextYAlignment.Name, obj.TextWrapped, obj.RichText
			e.font = obj.FontFace.Family; e.wt = obj.FontFace.Weight.Name
		end
		if obj:IsA("ImageLabel") or obj:IsA("ImageButton") then
			e.img, e.ro, e.rs, e.ic, e.it = obj.Image, { obj.ImageRectOffset.X, obj.ImageRectOffset.Y }, { obj.ImageRectSize.X, obj.ImageRectSize.Y }, c3(obj.ImageColor3), obj.ImageTransparency
			e.st = obj.ScaleType.Name
		end
		for _, ch in obj:GetChildren() do
			if ch:IsA("UICorner") then e.cr = { ch.CornerRadius.Scale, ch.CornerRadius.Offset }
			elseif ch:IsA("UIStroke") and ch.Enabled then e.sk = { c3(ch.Color), ch.Thickness, ch.ApplyStrokeMode.Name, ch.Transparency }
			elseif ch:IsA("UITextSizeConstraint") then e.mx, e.mn = ch.MaxTextSize, ch.MinTextSize
			elseif ch:IsA("UIGradient") and ch.Enabled then
				local ks = {}
				for _, k in ch.Color.Keypoints do table.insert(ks, { k.Time, c3(k.Value) }) end
				e.gr = { ks, ch.Rotation }
			end
		end
		table.insert(out, e)
		if obj.Rotation ~= 0 then
			myRots = table.clone(rots)
			table.insert(myRots, { p.X + s.X / 2, p.Y + s.Y / 2, obj.Rotation })
		end
	end
	local kids = {}
	for i, ch in obj:GetChildren() do if ch:IsA("GuiObject") then table.insert(kids, { ch, i }) end end
	table.sort(kids, function(a, b) if a[1].ZIndex ~= b[1].ZIndex then return a[1].ZIndex < b[1].ZIndex end return a[2] < b[2] end)
	for _, k in kids do visit(k[1], myRots) end
end
local canvas = root:FindFirstChild("Canvas")
local layers = {}
for i, ch in canvas:GetChildren() do if ch:IsA("GuiObject") then table.insert(layers, { ch, i }) end end
table.sort(layers, function(a, b) if a[1].ZIndex ~= b[1].ZIndex then return a[1].ZIndex < b[1].ZIndex end return a[2] < b[2] end)
for _, l in layers do visit(l[1], {}) end
return Http:JSONEncode({ vp = { vp.X, vp.Y }, items = out })
