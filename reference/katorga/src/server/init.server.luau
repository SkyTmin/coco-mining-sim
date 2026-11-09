--!strict
-- Server bootstrap: start services in dependency order.

workspace:SetAttribute("RuntimeReady", false)
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local Config = require(ReplicatedStorage:WaitForChild("Shared").Config)

local Remotes = require(ReplicatedStorage.Shared.Remotes)
-- Create every remote up front so clients never block on WaitForChild.
for _, name in ipairs({
	"Sfx",
	"DigStart",
	"DigFinish",
	"DigAccepted",
	"DigRejected",
	"Sell",
	"BuyItem",
	"UpgradeItem",
	"LevelUp",
	"InventoryMove",
	"SelectSlot",
	"SpendPoint",
	"ClaimPoints",
	"EquipArmor",
	"UseConsumable",
	"OpenCase",
	"ActivateBooster",
	"CaseOpened",
	"CaseUpdated",
	"CaseOpen",
	"CaseMove",
	"CaseClose",
	"ArtifactAssemble",
	"ProfileUpdated",
	"ProfilePatch",
	"Toast",
	"MineReset",
	"Combo",
	"OpenMenu",
	"Teleport",
	"TeleportChannel",
	"SetLocale",
	"SetAutoLocale",
	"Creative",
	"DropItem",
	"ServerLog",
	"Swing",
	"FactionChoose",
	"HitConfirm",
	"HurtImpact",
	"Knockback",
	"FactionLeave",
	"FactionChestOpened",
	"FactionChestMove",
	"FactionChestClose",
	"SetHudLayout",
	"EatStart",
	"EatCancel",
	"Ate",
	"DonateBuy",
	"DonateTopUp",
	"DonateBuyRobux",
	"StashClaim",
	"DonateBought",
	"DonateCrystals",
	"AutoSold",
	"BoosterToItem",
	"BookUse",
	"BookResult",
	"AncientRoll",
	"GangAction",
	"GangState",
	"GangInvites",
	"GangChestPage",
	"VaultUnlock",
	"GangHome",
	"GangNpc",
	"GhettoBuy",
	"TreasureReset",
	"Favorite",
	"ChatClient",
	"ChatSystem",
	"ChatCommand",
	"Rubbish",
	"DailyClaim",
	"AuctionAnnounced",
	"AuctionListed",
}) do
	Remotes.event(name)
end
-- These listeners are part of client bootstrap. Create their channels before expensive
-- scenery/service startup so loading does not stall waiting for cosmetic traffic.
for _, name in ipairs({
	"SwingFx",
	"ItemPickupFx",
	"CombatCritFx",
	"EnchantFx",
	"ArrowFired",
	"DigCrackFx",
	"BlockBrokenFx",
	"Motion",
	"MotionFx",
}) do
	Remotes.unreliable(name)
end
Remotes.unreliable(require(ReplicatedStorage.Shared.MineNet).REMOTE)

local AvatarService = require(script.Services.AvatarService)
local CommercePolicyService = require(script.Services.CommercePolicyService)
local NpcBodyService = require(script.Services.NpcBodyService)
local SignService = require(script.Services.SignService)
local ProfileService = require(script.Services.ProfileService)
local ProfessionService = require(script.Services.ProfessionService)
local TextureService = require(script.Services.TextureService)
local MineService = require(script.Services.MineService)
local DigService = require(script.Services.DigService)
local EconomyService = require(script.Services.EconomyService)
local NeedsService = require(script.Services.NeedsService)
local AchievementService = require(script.Services.AchievementService)
local GlobalBoosterService = require(script.Services.GlobalBoosterService)
local BoosterService = require(script.Services.BoosterService)
local AuctionService = require(script.Services.AuctionService)
local CaseService = require(script.Services.CaseService)
local ArtifactService = require(script.Services.ArtifactService)
local LocationService = require(script.Services.LocationService)
local CombatService = require(script.Services.CombatService)
local BowService = require(script.Services.BowService)
local HungerService = require(script.Services.HungerService)
local DeathService = require(script.Services.DeathService)
local TrainerService = require(script.Services.TrainerService)
local FallService = require(script.Services.FallService)
local LavaService = require(script.Services.LavaService)
local LightingService = require(script.Services.LightingService)
local HurtService = require(script.Services.HurtService)
local CreativeService = require(script.Services.CreativeService)
local ItemDropService = require(script.Services.ItemDropService)
local BossService = require(script.Services.BossService)
local FactionService = require(script.Services.FactionService)
local FactionStorageService = require(script.Services.FactionStorageService)
local MobService = require(script.Services.MobService)
local NameplateService = require(script.Services.NameplateService)
local CollisionGroups = require(script.Services.CollisionGroups)
local LeaderboardService = require(script.Services.LeaderboardService)

-- [08.11] the service starts below run back to back; on a cold server the chain exceeded Roblox's script time limit
-- («Script timeout: exhausted allowed execution time») and every later service — the Sfx remote the client waits
-- for among them — never started, so the loading screen hung on «Интерфейс». breathe() yields one frame whenever
-- the chain has run for more than half a second; the order of the starts is unchanged.
local lastBreath = os.clock()
local function breathe()
	if os.clock() - lastBreath > 0.5 then
		task.wait()
		lastBreath = os.clock()
	end
end
AvatarService.Start() -- first: the StarterCharacter must exist before anyone spawns
breathe()
CommercePolicyService.Start() -- account restrictions resolve asynchronously; gated actions fail closed meanwhile
breathe()
local MatteWindows = require(ReplicatedStorage.Shared.MatteWindows)
MatteWindows.Apply(workspace:FindFirstChild("Ghetto"))
MatteWindows.Apply(game:GetService("ServerStorage"):FindFirstChild("GangHouseTemplate"))
NpcBodyService.Start() -- the map's R15 NPCs → our block body in their costumes
breathe()
SignService.Start() -- sign posts no longer cover the text
breathe()
HungerService.Start()
breathe()
DeathService.Start()
breathe()
require(script.Services.TutorialService).Start()
breathe()
ProfileService.Start()
breathe()
require(script.Services.ServerAffinityService).Start()
breathe()
FactionService.Start()
breathe()
ProfessionService.Start()
breathe()
TextureService.Start()
breathe()
local warzoneScenery = workspace:FindFirstChild("Warzone")
if warzoneScenery then
	local ok, err = pcall(
		require(game:GetService("ReplicatedStorage").Shared.WarzoneLayout).apply,
		warzoneScenery
	)
	if not ok then
		warn("[WarzoneLayout] " .. tostring(err))
	end
end
MineService.Start()
breathe()
DigService.Start()
breathe()
EconomyService.Start()
breathe()
NeedsService.Start()
breathe()
require(script.Services.FoodService).Start() -- eating over 1.6 s like Minecraft (client Eating.luau)
breathe()
require(script.Services.DonateService).Start() -- the donate shop: crystals for Robux, goods for crystals
breathe()
AchievementService.Start()
breathe()
GlobalBoosterService.Start()
breathe()
require(script.Services.GangService).Start() -- gangs: shared documents, invites, quests, treasury, upgrades
breathe()
require(script.Services.GangChestService).Start() -- the gang storage on the База банды (one server at a time)
breathe()
AuctionService.Start()
breathe()
BoosterService.Start()
breathe()
CaseService.Start()
breathe()
ArtifactService.Start()
breathe()
require(script.Services.MotionService).Start() -- fast movement snapshots between players (client Motion.luau)
breathe()
CombatService.Start()
breathe()
require(script.Services.BookService).Start() -- ancient books: applying from the hand, the 32 effects
breathe()
BowService.Start()
breathe()
LocationService.Start()
breathe()
require(script.Services.GangHouseService).Start() -- База банды: a house of its own for every gang (copies of a template)
breathe()
require(script.Services.GangBaseService).Start() -- База банды: Библиотекарь, Кузнец, Шнырь
breathe()
require(script.Services.GhettoMineService).Start()
breathe()
require(script.Services.GhettoService).Start() -- Гетто: Торговец, Чёрный рынок, Сундук с сокровищами
breathe()
require(script.Services.WarzoneService).Start() -- Дворы: four faction points captured by digging at the beacons
breathe()
TrainerService.Start()
breathe()
require(script.Services.SkillService).Start() -- the skill tree: buying levels, the oblivion scroll
breathe()
require(script.Services.PotionService).Start() -- the potion stand: brewing, drinking, splash potions
breathe()
require(script.Services.WorldSafetyService).Start() -- exterior guards and same-location recovery below the map
breathe()
FallService.Start()
breathe()
LavaService.Start()
breathe()
LightingService.Start()
breathe()
HurtService.Start()
breathe()
CreativeService.Start()
breathe()
ItemDropService.Start()
breathe()
BossService.Start()
breathe()
FactionStorageService.Start()
breathe()
CollisionGroups.Start() -- players and mobs pass through each other
breathe()
MobService.Start()
breathe()
NameplateService.Start()
breathe()
LeaderboardService.Start() -- the spawn top boards (global, OrderedDataStore)
breathe()
require(script.Services.ReferralService).Start() -- inviting friends (Referrals_v1), play time, the «Избранное» card
breathe()
require(script.Services.ChatService).Start() -- the chat (Roblox draws it): faction / gang TextChannels, announcements
breathe()
require(script.Services.ChatCommandService).Start() -- every chat command (TextChatCommands) and the bin (Rubbish)
breathe()
require(script.Services.ActionsService).Start()
breathe()
require(script.Services.DailyService).Start() -- the canteen portion and the daily rewards (/daily)
breathe()
require(script.Services.PrisService).Start() -- PRIS+: the PrisPlus attribute, the mine respawn board (PrisQuery)
breathe()
require(script.Services.NicknameService).Start() -- клички: «Ваши клички» (NicknameSet), the shown name (этап 9)
breathe()
require(script.Services.PlayerCardService).Start() -- the TAB list / chat player card numbers (PlayerCard, этап 9)
breathe()
require(ReplicatedStorage.Shared.Sfx).listen() -- creates the Sfx remote clients wait for
breathe()

-- Hearts by level [вики LEVELS.md: +0,5 сердца за уровень]: kept on every character once a second — a new character
-- (the profile may load after the first spawn) starts full. EconomyService heals explicitly on level-up;
-- equipment capacity changes preserve current HP. [2-player test 27.10: first spawn preceded the profile]
local freshCharacters: { [Model]: boolean } = {}
local function watchPlayer(player: Player)
	player.AutoJumpEnabled = false -- [владелец] no auto-jump on touch
	local function added(character: Model)
		freshCharacters[character] = true
		local humanoid = character:WaitForChild("Humanoid") :: Humanoid
		humanoid.AutoJumpEnabled = false
	end
	player.CharacterAdded:Connect(added)
	if player.Character then
		task.spawn(added, player.Character)
	end
end
game:GetService("Players").PlayerAdded:Connect(watchPlayer)
for _, player in ipairs(game:GetService("Players"):GetPlayers()) do
	watchPlayer(player)
end
task.spawn(function()
	while true do
		task.wait(1)
		for _, player in ipairs(game:GetService("Players"):GetPlayers()) do
			local profile = ProfileService.Get(player)
			local character = player.Character
			local humanoid = character and character:FindFirstChildOfClass("Humanoid")
			if not profile or not character or not humanoid or humanoid.Health <= 0 then
				continue
			end
			local rule = Config.levelRule(profile.level)
			-- + the armor book Танк
			local target = (if rule then rule.hearts else 10) * 2
				+ require(script.Services.BookService).bonusHealth(profile)
			if humanoid.MaxHealth ~= target then
				humanoid.MaxHealth = target
				humanoid.Health = if freshCharacters[character]
					then target
					else math.clamp(humanoid.Health, 0, target)
			end
			freshCharacters[character] = nil
		end
		for character in pairs(freshCharacters) do
			if not character.Parent then
				freshCharacters[character] = nil
			end
		end
	end
end)

print("[coco-prison] server started, locations:", #Config.locationsFile.locations)
-- Studio: every item needs its name (and books their description) in all locales — see ItemInfo
if game:GetService("RunService"):IsStudio() then
	local missing = require(ReplicatedStorage.Shared.ItemInfo).audit()
	if #missing > 0 then
		warn("[ItemInfo] missing translations: " .. table.concat(missing, ", "))
	end
end
workspace:SetAttribute("RuntimeReady", true)
