--!strict
-- [решение] TZ-03g §3: reserve an emitter once per frame; recolor only after 0.9 seconds.
local Pool = {}
type Slot = { index: number, color: string?, last: number, frame: number }
export type Bank = {
	slots: { Slot },
	available: { [string]: { Slot } },
	cold: { Slot },
	frame: number,
}
function Pool.new(count: number): Bank
	local slots = {}
	for i = 1, count do
		slots[i] = { index = i, last = -math.huge, frame = -1 }
	end
	return { slots = slots, available = {}, cold = {}, frame = 0 }
end
function Pool.clear(bank: Bank)
	for _, slot in bank.slots do
		slot.last = -math.huge
	end
end
function Pool.begin(bank: Bank, now: number)
	bank.frame += 1
	table.clear(bank.available)
	table.clear(bank.cold)
	for _, slot in bank.slots do
		if slot.color then
			local group = bank.available[slot.color] or {}
			bank.available[slot.color] = group
			table.insert(group, slot)
		end
		if now - slot.last > 0.9 then
			table.insert(bank.cold, slot)
		end
	end
end
function Pool.take(bank: Bank, color: string, now: number): (number?, boolean)
	local group = bank.available[color]
	local slot = group and table.remove(group)
	while slot and slot.frame == bank.frame do
		slot = group and table.remove(group)
	end
	local changed = false
	if not slot then
		slot = table.remove(bank.cold)
		while slot and (slot.frame == bank.frame or now - slot.last <= 0.9) do
			slot = table.remove(bank.cold)
		end
		if slot then
			changed = slot.color ~= color
			slot.color = color
		end
	end
	if not slot then
		return nil, false
	end
	slot.frame, slot.last = bank.frame, now
	return slot.index, changed
end
return Pool
