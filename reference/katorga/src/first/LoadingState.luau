--!strict
-- Readiness facts, not elapsed-time progress. Pure state machine for engine-independent checks.
local State = {}
State.order = { "interface", "profile", "character", "location", "assets" }
function State.new(now: number): any
	return { generation = 1, startedAt = now, facts = {}, failure = nil }
end
function State.retry(state: any, now: number)
	state.generation += 1
	state.startedAt, state.failure = now, nil
	state.facts.location, state.facts.assets = nil, nil
end
function State.phase(state: any): string
	for _, key in State.order do
		if not state.facts[key] then
			return key
		end
	end
	return "ready"
end
function State.commit(state: any, generation: number, key: string, value: boolean): boolean
	if state.generation ~= generation then
		return false
	end
	state.facts[key] = value
	return true
end
function State.expired(state: any, now: number): boolean
	return State.phase(state) ~= "ready" and now - state.startedAt >= 30
end
return State
