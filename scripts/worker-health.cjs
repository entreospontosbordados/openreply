const Redis = require('ioredis');
const redis = new Redis(process.env.REDIS_URL, { connectTimeout: 5000, maxRetriesPerRequest: 1 });
(async () => {
  try {
    const heartbeat = JSON.parse(await redis.get('health:worker:dm'));
    if (!heartbeat || heartbeat.hostname !== require('node:os').hostname() ||
        Date.now() - Date.parse(heartbeat.checkedAt) > 120000) {
      process.exitCode = 1;
    }
  } catch {
    process.exitCode = 1;
  } finally {
    redis.disconnect();
  }
})();
