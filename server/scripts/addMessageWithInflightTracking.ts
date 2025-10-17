// export const addMessageWithInflightTracking = `
// 	local data = ARGV[1]
// 	local xaddArgs = {}
// 	for i = 2, #ARGV do
//     	table.insert(xaddArgs, ARGV[i])
//   	end

// 	-- Add message to stream
// 	local redisMessageId = redis.call('XADD', unpack(xaddArgs))

// 	-- Store redisMessageId in hash

// 	return {redisMessageId}`;
