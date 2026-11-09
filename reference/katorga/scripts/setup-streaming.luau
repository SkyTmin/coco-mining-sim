--!nocheck
-- StreamingEnabled for many players [docs/research/server-scaling.md]: each device loads only the world
-- around its player, and block changes in a mine reach only the players who have that mine loaded.
-- A place property, so it is set in Edit mode (run via scripts/studio-loader.luau) and reaches the game
-- when the owner saves and publishes. Idempotent.
--   models that must arrive whole (NPC rigs, mannequins, case chests) are Atomic.
local CollectionService = game:GetService("CollectionService")

workspace.StreamingEnabled = true
-- the radius / stream-out / integrity properties are not writable from the Studio MCP context (checked
-- 22.10): the Roblox defaults stay (64 studs always loaded, the rest as memory allows, stream out on low
-- memory, pause at the edge). Tuning them is a Properties-panel job (Workspace → Streaming).
local tuned = pcall(function()
	workspace.StreamingTargetRadius = 256
	workspace.StreamOutBehavior = Enum.StreamOutBehavior.Opportunistic
end)

local atomic = 0
local function makeAtomic(model: Instance?)
	if not model or not model:IsA("Model") or model == workspace then
		return
	end
	local parts = 0
	for _, d in ipairs(model:GetDescendants()) do
		if d:IsA("BasePart") then
			parts += 1
		end
	end
	-- only small things: a whole building or the prison map must never stream as one piece
	if parts <= 200 and model.ModelStreamingMode ~= Enum.ModelStreamingMode.Atomic then
		model.ModelStreamingMode = Enum.ModelStreamingMode.Atomic
		atomic += 1
	end
end
for _, d in ipairs(workspace:GetDescendants()) do
	if d:IsA("Humanoid") then
		makeAtomic(d.Parent) -- NPC rigs
	end
end
for _, tag in ipairs({ "ArmorMannequin", "HeldMannequin" }) do
	for _, model in ipairs(CollectionService:GetTagged(tag)) do
		makeAtomic(model)
	end
end
for _, tag in ipairs({ "OrdinaryCase", "AncientCase", "ArtifactCase", "NicknameCase", "EnderChest" }) do
	for _, part in ipairs(CollectionService:GetTagged(tag)) do
		makeAtomic(part:FindFirstAncestorWhichIsA("Model")) -- the chest with its lid and lock
	end
end
return string.format(
	"streaming on (radius %s), %d models atomic",
	if tuned then "256 / opportunistic" else "Roblox defaults",
	atomic
)
