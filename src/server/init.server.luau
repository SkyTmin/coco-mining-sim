--!strict

local services = script.Services
local lastBreath = os.clock()

local function breathe()
	if os.clock() - lastBreath > 0.5 then
		task.wait()
		lastBreath = os.clock()
	end
end

for _, service in
	{
		services.PlotService,
		services.MineService,
		services.PickaxeService,
		services.HitService,
		services.CreativeService,
		services.ServerLog,
		services.ProfileService,
	}
do
	local ok, problem = pcall(function()
		require(service).Start()
	end)
	if not ok then
		warn(string.format("[Server] %s failed to start: %s", service.Name, tostring(problem)))
	end
	breathe()
end
