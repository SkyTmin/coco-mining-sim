--!strict
-- Full pre-release test-progress reset [owner 03.11]. Old namespaces remain an archive.
-- Schema versions describe record formats and MUST NOT be changed for a release reset.
local StorageNames = {}
local studio = game:GetService("RunService"):IsStudio()

StorageNames.ProductionDataEpoch = "release1_20261103"
StorageNames.LegacyProfileStore = "PlayerProfiles_v3" -- read-only receipt-recognition exception
StorageNames.Environment = if studio then "studio" else "live"
StorageNames.LivePrefix = "K_L_" .. StorageNames.ProductionDataEpoch .. "_"
StorageNames.StudioPrefix = "K_S_" .. StorageNames.ProductionDataEpoch .. "_"
StorageNames.Prefix = if studio then StorageNames.StudioPrefix else StorageNames.LivePrefix

function StorageNames.progress(base: string): string
	return StorageNames.Prefix .. base
end

-- Auditable namespace inventory. Purchase receipt history is retained separately by the
-- read-only legacy receipt guard, never erased or replayed through a gameplay epoch change.
StorageNames.catalog = {
	dataStores = {
		"PlayerProfiles_v3",
		"PlayerTransfers_v1",
		"AuctionLots_v1",
		"Gangs_v1",
		"GangTags_v1",
		"GangChest_v1",
		"FactionStorage_v1",
		"Referrals_v1",
		"TopNames_v1",
	},
	orderedDataStores = {
		"Top_ratsClean_v1",
		"Top_money_v1",
		"Top_level_v1",
		"Top_blocksClean_v1",
		"Top_deaths_v1",
	},
	memorySortedMaps = { "AuctionIndex_v1", "SharedBoosters_v1" },
	memoryHashMaps = {
		"AuctionAnnounce_v1",
		"GangInvites_v1",
		"ServerAffinity_v1",
		"ServerPresence_v1",
		"ServerInvites_v1",
	},
	messageTopics = {
		"ProfileRelease",
		"AuctionSold",
		"AuctionAnnounce",
		"Gangs_v1",
		"SharedBoosters",
		"Referrals_v1",
		"Chat_v1",
	},
	qaDataStores = { "PlayerProfiles_v3_QA", "PlayerTransfers_QA_v1" },
}

return StorageNames
