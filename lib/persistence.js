const { debugServer } = require('./debug');

const UPSTASH_URL = process.env.UPSTASH_REDIS_REST_URL || '';
const UPSTASH_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN || '';
const ENABLED = !!(UPSTASH_URL && UPSTASH_TOKEN);

const READ_CACHE_TTL = 15000;
const readCache = new Map();

async function redis(command) {
  if (!ENABLED) return null;

  try {
    const res = await fetch(UPSTASH_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${UPSTASH_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(command)
    });

    if (!res.ok) {
      debugServer.warn(`Upstash HTTP ${res.status}: ${await res.text()}`);
      return null;
    }

    const data = await res.json();
    return data.result;
  } catch (err) {
    debugServer.warn(`Upstash error: ${err.message}`);
    return null;
  }
}

async function pipeline(commands) {
  if (!ENABLED) return commands.map(() => null);

  try {
    const res = await fetch(`${UPSTASH_URL}/pipeline`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${UPSTASH_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(commands)
    });

    if (!res.ok) {
      debugServer.warn(`Upstash pipeline HTTP ${res.status}`);
      return commands.map(() => null);
    }

    const data = await res.json();
    return data.map(d => (d && d.result != null ? d.result : null));
  } catch (err) {
    debugServer.warn(`Upstash pipeline error: ${err.message}`);
    return commands.map(() => null);
  }
}

function getCached(key) {
  const entry = readCache.get(key);
  if (entry && Date.now() - entry.ts < READ_CACHE_TTL) return entry.value;
  return undefined;
}

function setCache(key, value) {
  readCache.set(key, { value, ts: Date.now() });
}

function incrementCounter(key) {
  if (!ENABLED) return;
  redis(['INCR', key]).catch(() => {});
}

function addToSet(key, member) {
  if (!ENABLED) return;
  redis(['SADD', key, member]).catch(() => {});
}

function incrementSortedSet(key, member) {
  if (!ENABLED) return;
  redis(['ZINCRBY', key, 1, member]).catch(() => {});
}

async function getPublicCounters() {
  const cacheKey = '__publicCounters__';
  const cached = getCached(cacheKey);
  if (cached !== undefined) return cached;

  if (!ENABLED) {
    return {
      totalPageViews: 0,
      totalInstalls: 0,
      totalSubtitleRequests: 0,
      totalSubtitlesServed: 0,
      uniqueVisitors: 0,
      topLanguages: [],
      topPairs: []
    };
  }

  const results = await pipeline([
    ['GET', 'stats:totalPageViews'],
    ['GET', 'stats:totalInstalls'],
    ['GET', 'stats:totalSubtitleRequests'],
    ['GET', 'stats:totalSubtitlesServed'],
    ['SCARD', 'stats:uniqueVisitors'],
    ['ZREVRANGE', 'stats:languages', '0', '9', 'WITHSCORES'],
    ['ZREVRANGE', 'stats:languagePairs', '0', '9', 'WITHSCORES']
  ]);

  function parseSortedSet(arr) {
    if (!Array.isArray(arr)) return [];
    const pairs = [];
    for (let i = 0; i < arr.length; i += 2) {
      pairs.push([arr[i], parseInt(arr[i + 1], 10) || 0]);
    }
    return pairs;
  }

  const counters = {
    totalPageViews: parseInt(results[0], 10) || 0,
    totalInstalls: parseInt(results[1], 10) || 0,
    totalSubtitleRequests: parseInt(results[2], 10) || 0,
    totalSubtitlesServed: parseInt(results[3], 10) || 0,
    uniqueVisitors: parseInt(results[4], 10) || 0,
    topLanguages: parseSortedSet(results[5]),
    topPairs: parseSortedSet(results[6])
  };

  setCache(cacheKey, counters);
  return counters;
}

function isEnabled() {
  return ENABLED;
}

module.exports = {
  incrementCounter,
  addToSet,
  incrementSortedSet,
  getPublicCounters,
  isEnabled
};
