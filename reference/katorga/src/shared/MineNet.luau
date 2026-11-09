--!strict
-- Fast confirmation of already-authorized removals. Normal Instance replication remains the fallback.
-- IDs identify one Part lifetime, not a grid position: delayed packets cannot remove reset blocks.
local MineNet = {
	ATTRIBUTE = "MineCellId",
	REMOTE = "MineRemoved",
	MAX_IDS = 192, -- 777 bytes including header, below UnreliableRemoteEvent's 1000-byte limit
	MAX_AGE = 3,
}
local HEADER = 9 -- version:u8, server timestamp:f64; remaining bytes are cell IDs:u32

function MineNet.validId(id: any): boolean
	return typeof(id) == "number" and id > 0 and id <= 4294967295 and id % 1 == 0
end

function MineNet.encode(ids: { number }, stamp: number): buffer
	assert(#ids > 0 and #ids <= MineNet.MAX_IDS, "Invalid mine batch size")
	local packet = buffer.create(HEADER + #ids * 4)
	buffer.writeu8(packet, 0, 1)
	buffer.writef64(packet, 1, stamp)
	for n, id in ids do
		assert(MineNet.validId(id), "Invalid mine cell ID")
		buffer.writeu32(packet, HEADER + (n - 1) * 4, id)
	end
	return packet
end

function MineNet.decode(packet: any, now: number): { number }?
	if typeof(packet) ~= "buffer" then
		return nil
	end
	local size = buffer.len(packet)
	if size <= HEADER or size > HEADER + MineNet.MAX_IDS * 4 or (size - HEADER) % 4 ~= 0 then
		return nil
	end
	if buffer.readu8(packet, 0) ~= 1 then
		return nil
	end
	local stamp = buffer.readf64(packet, 1)
	if stamp ~= stamp or stamp < now - MineNet.MAX_AGE or stamp > now + 0.5 then
		return nil
	end
	local ids = {}
	for offset = HEADER, size - 4, 4 do
		local id = buffer.readu32(packet, offset)
		if id == 0 then
			return nil
		end
		table.insert(ids, id)
	end
	return ids
end

return MineNet
