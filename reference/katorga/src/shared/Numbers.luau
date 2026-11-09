--!strict
-- Fail closed before numeric values cross an inventory/currency mutation boundary.
local Numbers = {}
local MAX_SAFE_INTEGER = 9007199254740991

function Numbers.finite(value: any): boolean
	return typeof(value) == "number" and value == value and math.abs(value) < math.huge
end

function Numbers.integer(value: any, minimum: number?): boolean
	return Numbers.finite(value)
		and value >= (minimum or 0)
		and value <= MAX_SAFE_INTEGER
		and value == math.floor(value)
end

function Numbers.canAfford(balance: any, cost: any): boolean
	return Numbers.integer(balance) and Numbers.integer(cost) and balance >= cost
end

function Numbers.canCredit(balance: any, amount: any): boolean
	return Numbers.integer(balance)
		and Numbers.integer(amount)
		and Numbers.integer(balance + amount)
end

return Numbers
