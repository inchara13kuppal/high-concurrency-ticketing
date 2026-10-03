import { Redis } from "@upstash/redis";

const url = process.env.UPSTASH_REDIS_REST_URL;
const token = process.env.UPSTASH_REDIS_REST_TOKEN;

if (!url || !token) {
  throw new Error("Upstash Redis is not configured. Add its REST URL and token secrets.");
}

export const redis = new Redis({ url, token });
export const SEAT_LOCK_SECONDS = 300;

export function seatLockKey(eventId: string, seatNumber: string) {
  return `lock:event_${eventId}:seat_${seatNumber}`;
}

export async function releaseSeatLock(key: string, userId: string) {
  const releaseIfOwner = `
    if redis.call("get", KEYS[1]) == ARGV[1] then
      return redis.call("del", KEYS[1])
    end
    return 0
  `;
  await redis.eval(releaseIfOwner, [key], [userId]);
}