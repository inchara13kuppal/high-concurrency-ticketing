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

export async function acquireSeatLocks(eventId: string, seatNumbers: string[], userId: string) {
  const keys = seatNumbers.map((seatNumber) => seatLockKey(eventId, seatNumber));
  const acquireAllOrNone = `
    for i = 1, #KEYS do
      local owner = redis.call("get", KEYS[i])
      if owner and owner ~= ARGV[1] then
        return {0, i}
      end
    end
    for i = 1, #KEYS do
      redis.call("set", KEYS[i], ARGV[1], "EX", ARGV[2])
    end
    return {1}
  `;
  const result = (await redis.eval(acquireAllOrNone, keys, [userId, String(SEAT_LOCK_SECONDS)])) as number[];
  return result[0] === 1
    ? { locked: true as const }
    : { locked: false as const, conflictIndex: Number(result[1]) - 1 };
}

export async function refreshSeatLocks(eventId: string, seatNumbers: string[], userId: string) {
  const keys = seatNumbers.map((seatNumber) => seatLockKey(eventId, seatNumber));
  const refreshAllOrNone = `
    for i = 1, #KEYS do
      if redis.call("get", KEYS[i]) ~= ARGV[1] then
        return {0, i}
      end
    end
    for i = 1, #KEYS do
      redis.call("expire", KEYS[i], ARGV[2])
    end
    return {1}
  `;
  const result = (await redis.eval(refreshAllOrNone, keys, [userId, String(SEAT_LOCK_SECONDS)])) as number[];
  return result[0] === 1
    ? { owned: true as const }
    : { owned: false as const, conflictIndex: Number(result[1]) - 1 };
}

export async function releaseSeatLocks(eventId: string, seatNumbers: string[], userId: string) {
  const keys = seatNumbers.map((seatNumber) => seatLockKey(eventId, seatNumber));
  const releaseOwnedLocks = `
    local released = 0
    for i = 1, #KEYS do
      if redis.call("get", KEYS[i]) == ARGV[1] then
        released = released + redis.call("del", KEYS[i])
      end
    end
    return released
  `;
  await redis.eval(releaseOwnedLocks, keys, [userId]);
}