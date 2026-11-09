--!strict
local Players = game:GetService("Players")
local RunService = game:GetService("RunService")
local Input = game:GetService("UserInputService")
local Actions = game:GetService("ContextActionService")
local ContentProvider = game:GetService("ContentProvider")
local ReplicatedFirst = game:GetService("ReplicatedFirst")
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local GuiService = game:GetService("GuiService")
local State = require(script.Parent.LoadingState)
local Text = require(script.Parent.LoadingStrings)
local Locale = require(script.Parent.Locale)
local player = Players.LocalPlayer
local Controller = {}
local state = State.new(os.clock())
local started, complete, worker = false, false, false
local profile: any = nil
local snapshotReady = false
local clientReady = false
local locale = Locale.resolve(nil, player)
local generationCharacter: Model? = nil
local gui: ScreenGui? = nil
local retryButton: TextButton? = nil
local caption: TextLabel? = nil
local heading: TextLabel? = nil
local hint: TextLabel? = nil
local spinner: Frame? = nil
local rows: { [string]: TextLabel } = {}
local lastRequest = -math.huge
local pendingBootstrap: boolean? = nil
local preparedPosition: Vector3? = nil

local function text(key: string): string
	local entry = Text[key]
	return entry[locale] or entry.ru
end
local function request(retry: boolean): boolean
	local remotes = ReplicatedStorage:FindFirstChild("Remotes")
	local remote = remotes and remotes:FindFirstChild("ClientBootstrap")
	if remote and remote:IsA("RemoteEvent") and os.clock() - lastRequest >= 2.25 then
		lastRequest = os.clock()
		remote:FireServer(retry)
		return true
	end
	return false
end
local function retry()
	if complete then
		return
	end
	State.retry(state, os.clock())
	worker = false -- old tasks may finish, but generation guards prevent them publishing readiness
	preparedPosition = nil
	pendingBootstrap = player:GetAttribute("ProfileState") == "error"
end
local function makeUi()
	local screen = Instance.new("ScreenGui")
	screen.Name, screen.ResetOnSpawn, screen.IgnoreGuiInset = "ArrivalLoading", false, true
	screen.DisplayOrder = 10000
	local shade = Instance.new("TextButton")
	shade.Name, shade.Text, shade.AutoButtonColor, shade.Modal = "InputShield", "", false, true
	shade.Size, shade.BackgroundColor3, shade.BorderSizePixel =
		UDim2.fromScale(1, 1), Color3.fromRGB(10, 11, 15), 0
	shade.Parent = screen
	local safe = Instance.new("Frame")
	local inset = GuiService:GetGuiInset().Y
	safe.BackgroundTransparency, safe.Position, safe.Size =
		1, UDim2.fromOffset(0, inset), UDim2.new(1, 0, 1, -inset)
	safe.Parent = shade
	local panel = Instance.new("ScrollingFrame")
	panel.CanvasSize, panel.ScrollBarThickness = UDim2.fromOffset(0, 306), 4
	panel.AnchorPoint, panel.Position, panel.Size =
		Vector2.new(0.5, 0.5), UDim2.fromScale(0.5, 0.5), UDim2.new(1, -32, 1, -24)
	panel.BackgroundColor3, panel.BorderSizePixel = Color3.fromRGB(26, 28, 36), 0
	panel.Parent = safe
	local limit = Instance.new("UISizeConstraint")
	limit.MaxSize, limit.Parent = Vector2.new(520, 306), panel
	local border = Instance.new("UIStroke")
	border.Color, border.Thickness, border.Parent = Color3.fromRGB(70, 70, 78), 1, panel
	local accent = Instance.new("Frame")
	accent.Size, accent.BackgroundColor3, accent.BorderSizePixel, accent.Parent =
		UDim2.new(1, 0, 0, 4), Color3.fromRGB(255, 170, 40), 0, panel
	local function label(name: string, y: number, height: number, size: number): TextLabel
		local item = Instance.new("TextLabel")
		item.Name, item.BackgroundTransparency, item.Font, item.TextSize =
			name, 1, Enum.Font.Code, size
		item.TextColor3, item.TextXAlignment, item.TextWrapped =
			Color3.fromRGB(225, 225, 225), Enum.TextXAlignment.Left, true
		item.Position, item.Size, item.Parent =
			UDim2.fromOffset(20, y), UDim2.new(1, -40, 0, height), panel
		return item
	end
	heading = label("Title", 10, 32, 28)
	heading.Size = UDim2.new(1, -88, 0, 32)
	heading.TextColor3 = Color3.fromRGB(255, 170, 40)
	local ring = Instance.new("Frame")
	ring.Name, ring.BackgroundTransparency = "LoadingSpinner", 1
	ring.AnchorPoint, ring.Position, ring.Size =
		Vector2.new(1, 0), UDim2.new(1, -20, 0, 12), UDim2.fromOffset(28, 28)
	ring.Parent = panel
	for index = 0, 11 do
		local angle = math.rad(index * 30 - 90)
		local segment = Instance.new("Frame")
		segment.Name, segment.AnchorPoint = "Segment" .. index, Vector2.new(0.5, 0.5)
		segment.Position = UDim2.fromOffset(14 + math.cos(angle) * 10, 14 + math.sin(angle) * 10)
		segment.Size, segment.Rotation = UDim2.fromOffset(3, 6), index * 30
		segment.BackgroundColor3 = Color3.fromRGB(255, 170, 40)
		segment.BackgroundTransparency, segment.BorderSizePixel = 0.1 + index * 0.065, 0
		segment.Parent = ring
	end
	spinner = ring
	caption = label("Status", 44, 44, 14)
	for index, phase in State.order do
		rows[phase] = label(phase, 90 + (index - 1) * 22, 22, 14)
	end
	hint = label("StreamingNote", 204, 84, 12)
	hint.TextColor3 = Color3.fromRGB(150, 150, 158)
	local button = Instance.new("TextButton")
	button.Name, button.Font, button.TextSize = "LoadingRetry", Enum.Font.Code, 15
	button.TextColor3, button.BackgroundColor3, button.BorderSizePixel =
		Color3.new(1, 1, 1), Color3.fromRGB(40, 110, 220), 0
	button.Position, button.Size, button.Visible =
		UDim2.fromOffset(20, 248), UDim2.new(1, -40, 0, 48), false
	button.Parent = panel
	button.Activated:Connect(retry)
	retryButton = button
	screen.Parent = player:WaitForChild("PlayerGui")
	gui = screen
	ReplicatedFirst:RemoveDefaultLoadingScreen()
end

function Controller.Profile(nextProfile: any)
	profile = nextProfile
	locale = Locale.resolve(nextProfile.locale, player)
end
function Controller.SnapshotReady(value: boolean)
	snapshotReady = value
end
function Controller.ClientReady()
	clientReady = true
	request(false)
end

-- Fixed, small local set: hotbar icons and already streamed nearby geometry, never map previews
-- or the entire Workspace. MaterialVariant textures stream normally (PreloadAsync does not support them).
local function criticalAssets(root: BasePart): ({ Instance }, { Instance })
	local assets, owned, seen = {}, {}, {}
	local function add(object: Instance, key: string)
		if #assets < 32 and key ~= "" and not seen[key] then
			seen[key] = true
			table.insert(assets, object)
		end
	end
	local shared = ReplicatedStorage:FindFirstChild("Shared")
	local configModule = shared and shared:FindFirstChild("Config")
	if configModule then
		local config = require(configModule :: ModuleScript)
		local icons: { [string]: boolean } = {}
		for slot = 1, 9 do
			local stack = profile and profile.inventory and profile.inventory[slot]
			if stack then
				local id = config.iconFor(stack.id, stack.level)
				if id and id ~= "" then
					icons[id] = true
				end
			end
		end
		-- Keep the real HUD consumers alive. Raw content-ID strings take a different engine
		-- loading path and can report Failure even while this exact ImageLabel.IsLoaded=true.
		local playerGui = player:FindFirstChildOfClass("PlayerGui")
		local hud = playerGui and playerGui:FindFirstChild("PrisonHud")
		if hud then
			for _, object in hud:GetDescendants() do
				if
					(object:IsA("ImageLabel") or object:IsA("ImageButton")) and icons[object.Image]
				then
					add(object, "image:" .. object.Image)
					icons[object.Image] = nil
				end
			end
		end
		for id in icons do
			local image = Instance.new("ImageLabel")
			image.Image = id
			table.insert(owned, image)
			add(image, "image:" .. id)
		end
	end
	local params = OverlapParams.new()
	params.MaxParts = 96
	for _, part in workspace:GetPartBoundsInRadius(root.Position, 40, params) do
		if part:IsA("MeshPart") then
			if part.MeshId ~= "" or part.TextureID ~= "" then
				add(part, "mesh:" .. part.MeshId .. ":" .. part.TextureID)
			end
		end
		for _, child in part:GetChildren() do
			if child:IsA("Decal") or child:IsA("Texture") then
				if child.Texture ~= "" then
					add(child, "texture:" .. child.Texture)
				end
			end
		end
	end
	return assets, owned
end

local function hasFloor(character: Model, root: BasePart): boolean
	local params = RaycastParams.new()
	params.FilterType, params.FilterDescendantsInstances, params.RespectCanCollide =
		Enum.RaycastFilterType.Exclude, { character }, true
	return workspace:Raycast(root.Position, Vector3.new(0, -80, 0), params) ~= nil
end
local function invalidateLocation()
	State.retry(state, os.clock())
	worker, preparedPosition = false, nil
end
local function prepareLocation(character: Model, root: BasePart)
	worker = true
	local position = root.Position
	preparedPosition = position
	local generation = state.generation
	task.spawn(function()
		local ok = pcall(function()
			if workspace.StreamingEnabled then
				player:RequestStreamAroundAsync(position, 8)
			end
		end)
		if generation ~= state.generation or player.Character ~= character then
			return
		end
		-- A finished streaming request is only a request, not proof of ground. Require actual
		-- replicated collision beneath this character, not a distant named map folder.
		if (root.Position - position).Magnitude > 16 then
			invalidateLocation()
			return
		end
		if not ok or not hasFloor(character, root) then
			worker = false
			return
		end
		State.commit(state, generation, "location", true)
		local assetsOk, assets, owned = pcall(criticalAssets, root)
		if not assetsOk then
			worker, state.failure = false, "asset_error"
			return
		end
		local failed, succeeded, failures = false, 0, {}
		player:SetAttribute("LoadingAssetCount", #assets)
		player:SetAttribute("LoadingAssetFailures", nil)
		local loaded = pcall(function()
			ContentProvider:PreloadAsync(assets, function(id: string, status: Enum.AssetFetchStatus)
				if status ~= Enum.AssetFetchStatus.Success then
					failed = true
					if #failures < 8 then
						table.insert(failures, id .. " " .. tostring(status))
					end
				else
					succeeded += 1
				end
			end)
		end)
		for _, object in owned do
			object:Destroy()
		end
		if generation ~= state.generation or player.Character ~= character then
			return
		end
		player:SetAttribute("LoadingAssetSucceeded", succeeded)
		player:SetAttribute(
			"LoadingAssetFailures",
			if #failures > 0
				then table.concat(failures, "\n")
				elseif not loaded then "PreloadAsync exception"
				else nil
		)
		-- Mine/world safety can move the same character while assets are in flight. The old
		-- area's success is not proof for its new position; restart from current geometry.
		if (root.Position - position).Magnitude > 16 or not hasFloor(character, root) then
			invalidateLocation()
			return
		end
		worker = false
		if loaded and not failed then
			State.commit(state, generation, "assets", true)
		else
			state.failure = "asset_error"
		end
	end)
end

local function step()
	state.facts.interface = clientReady and workspace:GetAttribute("RuntimeReady") == true
	local profileState = player:GetAttribute("ProfileState")
	if pendingBootstrap ~= nil and request(pendingBootstrap) then
		pendingBootstrap = nil
	end
	state.facts.profile = profileState == "ready" and profile ~= nil and snapshotReady
	local character = player.Character
	local root = character and character:FindFirstChild("HumanoidRootPart")
	local humanoid = character and character:FindFirstChildOfClass("Humanoid")
	if character ~= generationCharacter then
		generationCharacter = character
		invalidateLocation()
	end
	if
		preparedPosition
		and root
		and root:IsA("BasePart")
		and (root.Position - preparedPosition).Magnitude > 16
	then
		invalidateLocation()
	end
	local target = character and character:GetAttribute("ArrivalPosition")
	state.facts.character = character ~= nil
		and root ~= nil
		and root:IsA("BasePart")
		and humanoid ~= nil
		and humanoid.Health > 0
		and character:GetAttribute("SpawnReady") == true
		and typeof(target) == "Vector3"
		and (root.Position - target).Magnitude < 32
	if profileState == "error" and pendingBootstrap == nil then
		state.failure = "profile_error"
	elseif state.failure == "profile_error" then
		state.failure = nil
	end
	if
		(not state.facts.profile or not state.facts.character)
		and profileState ~= "error"
		and pendingBootstrap == nil
	then
		request(false)
	end
	if
		state.facts.assets
		and state.facts.character
		and not hasFloor(character :: Model, root :: BasePart)
	then
		invalidateLocation()
	end
	if
		not state.failure
		and state.facts.interface
		and state.facts.profile
		and state.facts.character
		and not state.facts.assets
		and not worker
	then
		prepareLocation(character :: Model, root :: BasePart)
	end
	if State.expired(state, os.clock()) and not state.failure then
		state.failure = "error"
	end
	local phase = State.phase(state)
	player:SetAttribute("LoadingPhase", if state.failure then state.failure else phase)
	if heading then
		heading.Text = text("title")
	end
	if caption then
		caption.Text = text(state.failure or "joining")
	end
	if hint then
		hint.Text, hint.Visible = text("hint"), state.failure == nil
	end
	if retryButton then
		retryButton.Text, retryButton.Visible = text("retry"), state.failure ~= nil
	end
	for key, row in rows do
		row.Text = (if state.facts[key] then "✓  " else "·  ") .. text(key)
		row.TextColor3 = if state.facts[key]
			then Color3.fromRGB(90, 220, 90)
			else Color3.fromRGB(150, 150, 158)
	end
	if phase == "ready" and not state.failure then
		complete = true
		player:SetAttribute("LoadingBlocked", false)
		Actions:UnbindAction("ArrivalLoading")
		RunService:UnbindFromRenderStep("ArrivalLoading")
		if gui then
			gui:Destroy()
			gui = nil
		end
		return
	end
end

function Controller.Start()
	if started then
		return
	end
	started = true
	player:SetAttribute("LoadingBlocked", true)
	-- The main WindowInput module later owns PlayerModule controls. This early action and
	-- render guard also cover the period before StarterPlayerScripts has initialized.
	Actions:BindActionAtPriority("ArrivalLoading", function()
		return Enum.ContextActionResult.Sink
	end, false, 10000, table.unpack(Enum.PlayerActions:GetEnumItems()))
	RunService:BindToRenderStep("ArrivalLoading", Enum.RenderPriority.Last.Value, function(dt)
		if complete then
			return
		end
		if spinner then
			spinner.Visible = state.failure == nil
			if spinner.Visible then
				spinner.Rotation = (spinner.Rotation + dt * 300) % 360
			end
		end
		Input.MouseBehavior, Input.MouseIconEnabled = Enum.MouseBehavior.Default, true
		player:Move(Vector3.zero)
		local humanoid = player.Character and player.Character:FindFirstChildOfClass("Humanoid")
		if humanoid then
			humanoid.Jump = false
		end
	end)
	makeUi()
	task.spawn(function()
		while not complete do
			step()
			task.wait(0.15)
		end
	end)
end
return Controller
