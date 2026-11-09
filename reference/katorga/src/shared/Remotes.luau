--!strict
-- RemoteEvents / RemoteFunctions under ReplicatedStorage.Remotes, created lazily on the server.
--
-- Client → server events:  DigStart(part, hitPoint), DigCancel(), DigFinish(part) [legacy, ignored], Sell(), BuyItem(id, bulk? — Shift: 64 food), UpgradeItem(id),
--                           LevelUp(), InventoryMove(from, to, count?), SelectSlot(n), SpendPoint(kind),
--                           ClaimProfessionPoints(job), UseConsumable(slot), BoosterToItem(storageIndex),
--                           BookUse(sourceSlot, "inv" | "armor", slot | piece) — a book / powder / dispeller on an item,
--                           CaseOpen(caseId, keyId?), CaseClose(caseId), CaseReveal() — reveal ancient overflow after roulette,
--                           ArtifactAssemble(tier: "common"|"rare"|"epic"),
--                           CaseMove(caseId, {container = "case"|"inv", index}, destination, count?, section?)
--                           caseId also accepts "enderChest" for personal storage; CaseOpen rejects it. For the
--                           ender chest (the Хранилище) `section` = the open section the window shows (Shared/Vault);
--                           VaultUnlock(section, "dollars" | "crystals") buys the next section (CaseService).
-- Server → client events:  ProfileUpdated(profile) once, then ProfilePatch(ops) with the changes only, Toast(text), MineReset(mineId, state), Combo(mult, n),
--                          AutoSold(units) — a dug block sold by the auto-sell (the «+0,057 $» at the crosshair)
--                          CaseOpened(caseId), CaseUpdated(caseId, active)
--                          BlockBrokenFx({ {position, size, color, blockId} }) — unreliable, one batch per
--                          frame, only to players within FX_RANGE of the block (DigService)
--                          MineRemoved(buffer) — unreliable confirmed removals by immutable Part IDs;
--                          ordinary Instance deletion is the fallback (Shared.MineNet)
--                          DigAccepted(part, needed), DigRejected(part) — server-side dig timer
-- Client → server:        Exchange(kind, id, count?), TrainerUpgrade(stat), Attack(lookDirection, falling)
-- Server → client:        Sfx(name, anchorPart?, volume?, pitch?) — play an atlas sound locally (Sfx.luau)
-- Client → server:        Creative(op, a?, b?) — test mode (CreativeService): toggle / give id level|bookId /
--                          coins / level / refill / clear; only for players with the CreativeAllowed attribute
-- Client → server:        Swing(kind) → others get SwingFx(userId, kind) (unreliable) — swing animations
-- Server → nearby others: CombatCritFx(model) (unreliable), only after a confirmed damaging critical hit
-- Server → client:        ServerLog(message, isError) — server warnings for CreativeAllowed players
-- Client → server:        DropItem(slot, count?) — throw a stack on the ground (ItemDropService)
-- Server → client:        Knockback(velocity) — melee knockback the victim's client applies (HurtService)
-- Server → client:        AncientRoll(casePart, bookId, level, rarity, overflow) — the Ancient case roulette (AncientRoulette)
-- Server → client:        BookResult(stringsKey) — the outcome of a BookUse (the book window closes on success)
-- Client → server:        EatStart(slot), EatCancel() — hold to eat (FoodService); server → client Ate(itemId)
-- Client → server:        DonateBuy(itemId, count), DonateTopUp(packId), DonateBuyRobux(itemId), StashClaim(index) — the donate shop (DonateService); server →
--                         client DonateBought(itemId, count) after a purchase, DonateCrystals(amount) after a top-up
-- Client → server:        Sprint(on) — sprint intent; NeedsService sets the speed and the character's Sprinting attribute
-- Client → server:        SkillBuy(branchId) — the next level of a skill-tree branch (SkillService)
-- Client → server:        PotionBrew(kind, effectIds, upgraded) — brew at the potion stand; UseConsumable(slot, aim) drinks
--                         or throws a potion (PotionService); server → client PotionResult("brewed")
-- Client → server:        SetHudLayout(mode, layout?) — the player's moved HUD buttons (ProfileService, HudLayout.luau)
-- Client → server:        GangAction(op, arg) — gangs (GangService): "state" | "invites" | "create" {name, tag, desc, color,
--                         icon} | "invite" name | "accept" / "decline" gangId | "leave" | "kick" / "promote" / "demote" /
--                         "transfer" userId | "disband" | "deposit" / "withdraw" dollars | "upgrade" upgradeId |
--                         "settings" {pvp?, color?, icon?, desc?}; server → client GangState(view | false) — the gang
--                         document without op ids + `you` (role) + `now`; GangInvites({ {gang, name, tag, from, expires} })
-- Client → server:        GangChestPage(page) — turn the page of the open gang storage (CaseService; caseId "gangChest",
--                         player attributes GangChestPage / GangChestPages); GangNpc(op, a, b) — База банды NPCs
--                         (GangBaseService): "library" slot (hand a book in) | "forge" slotA slotB (merge two books)
-- Client → server:        GhettoBuy(kind, id, count?) — "trader" (keys / stars for $, 1..64) | "black" (one piece of the
--                         black market; stock in ReplicatedStorage.BlackMarket attributes) (GhettoService)
-- Client → server:        GangHome() — «Домой» in the «Банда» window: to the gang's own house (GangHouseService)
-- Server → client:        TreasureReset() — damage broke the treasure chest capture: the client lets the prompt go
-- Client → server:        Favorite("done" | "later") — the «Избранное» card's outcome (ReferralService; no reward ever)
-- Server → client:        ChatSystem(text, "announce" | "reply" | "error") — a system line in Roblox's chat (ChatWindow:
--                         TextChannel:DisplaySystemMessage in RBXSystem); ChatClient(action, …) — a chat command's
--                         client part (ChatCommandService → ChatCommands): "teleport" location spot? | "gang" sub arg |
--                         "channel" TextChannel? (nil = Общий); window commands use OpenMenu(kind)
-- Client → server:        ChatCommand(id, {args}) — the player card's buttons: "pay" / "gift" / "thx" / "rubb", the same
--                         checks as the typed commands (ChatCommandService); Rubbish({ {slot, id, count} }) — the «Урна» closed
-- Client → server:        DailyClaim() — take today's card of «Ежедневные награды» (DailyService; the window opens by
--                         /daily, the menu tile or the NPC's prompt → OpenMenu("daily"))
-- Этап 8 (PRIS+, рубины):  RemoteFunction PrisQuery("mines") → { now, mines = { {id, location, left, cycle} } } or nil
--                         (PrisService: PRIS+ players only, once a second); server → client EnchantFx(kind, position,
--                         power) — unreliable, a PRIS+ player's Вихрь / Ярость / Бульдозер worked nearby (BookService);
--                         AuctionSell(slot, amount, price, currency?) — currency "rubies" = whole rubies, else dollars;
-- Paid announcements:     server → client AuctionListed(lotId) — the offer card after a listing; RemoteFunction
--                         AuctionAnnounceInfo() → {wait, maxWait, credits, busy, crystals, robux}; AuctionAnnounce(lotId,
--                         "credit" | "robux" | "crystals"); server → client AuctionAnnounced({lot, item, price, cur, seller})
--                         — the banner (AuctionService, client AuctionBanner)
-- Этап 9 (клички, TAB):    NicknameSet(name | "") — make an owned nickname active / take it off (NicknameService);
--                         RemoteFunction PlayerCard(userId) → { u, level, faction, gang, tag, color, nick, pris, blocks,
--                         rats, kills, deaths, canInvite } or nil — the TAB list / chat player card (PlayerCardService)

local ReplicatedStorage = game:GetService("ReplicatedStorage")
local RunService = game:GetService("RunService")

local FOLDER_NAME = "Remotes"
local Remotes = {}

local function folder(): Folder
	if RunService:IsServer() then
		local existing = ReplicatedStorage:FindFirstChild(FOLDER_NAME)
		if existing then
			return existing :: Folder
		end
		local created = Instance.new("Folder")
		created.Name = FOLDER_NAME
		created.Parent = ReplicatedStorage
		return created
	end
	return ReplicatedStorage:WaitForChild(FOLDER_NAME) :: Folder
end

local function get(className: string, name: string): Instance
	local parent = folder()
	if RunService:IsServer() then
		local existing = parent:FindFirstChild(name)
		if existing then
			return existing
		end
		local created = Instance.new(className)
		created.Name = name
		created.Parent = parent
		return created
	end
	return parent:WaitForChild(name)
end

function Remotes.event(name: string): RemoteEvent
	return get("RemoteEvent", name) :: RemoteEvent
end

-- Cosmetic traffic (others' break particles/sounds): may be dropped, never queues behind gameplay,
-- payload ≤ 1000 bytes [docs/research/server-scaling.md]
function Remotes.unreliable(name: string): UnreliableRemoteEvent
	return get("UnreliableRemoteEvent", name) :: UnreliableRemoteEvent
end

function Remotes.func(name: string): RemoteFunction
	return get("RemoteFunction", name) :: RemoteFunction
end

return Remotes
