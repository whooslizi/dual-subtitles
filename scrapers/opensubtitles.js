const axios = require('axios');
const { debugServer, sanitizeForLogging } = require('../lib/debug');

function normalizeVideoParams(params = {}) {
  const normalized = {};
  if (!params || typeof params !== 'object') return normalized;

  for (const key of ['filename', 'videoSize', 'videoHash']) {
    let value = params[key];
    if (Array.isArray(value)) value = value[0];
    if (value == null) continue;
    const s = String(value).trim();
    if (s) normalized[key] = s;
  }
  return normalized;
}

async function fetchOpenSubtitles(mediaId, type, season = null, episode = null, videoParams = {}) {
  if (!mediaId) return [];

  const rawId = String(mediaId);
  const isKitsu = rawId.startsWith('kitsu:');
  const isMal = rawId.startsWith('mal:');
  const isAnilist = rawId.startsWith('anilist:');

  const urlsToTry = [];

  if (isKitsu) {
    urlsToTry.push(`https://anime-kitsu.strem.fun/subtitles/anime/${rawId}.json`);
    urlsToTry.push(`https://opensubtitles-v3.strem.io/subtitles/anime/${rawId}.json`);
  } else if (isMal || isAnilist) {
    urlsToTry.push(`https://opensubtitles-v3.strem.io/subtitles/anime/${rawId}.json`);
  } else {
    const cleanImdb = rawId.replace(/^tt/, '');
    const mainType = type === 'series' ? 'series' : 'movie';
    let baseId = `tt${cleanImdb}`;
    if (type === 'series' && season && episode && season !== '0' && episode !== '0') {
      baseId += `:${season}:${episode}`;
    }

    const norm = normalizeVideoParams(videoParams);
    const extraParts = [];
    if (norm.videoHash) extraParts.push(`videoHash=${norm.videoHash}`);
    if (norm.videoSize) extraParts.push(`videoSize=${norm.videoSize}`);
    if (norm.filename) extraParts.push(`filename=${encodeURIComponent(norm.filename)}`);

    if (extraParts.length > 0) {
      urlsToTry.push(`https://opensubtitles-v3.strem.io/subtitles/${mainType}/${baseId}/${extraParts.join('/')}.json`);
    }
    
    urlsToTry.push(`https://opensubtitles-v3.strem.io/subtitles/${mainType}/${baseId}.json`);
    if (type === 'series' && season && episode) {
      urlsToTry.push(`https://opensubtitles-v3.strem.io/subtitles/series/tt${cleanImdb}.json`);
    }
    urlsToTry.push(`https://opensubtitles.strem.io/stremio/v1/subtitles/${mainType}/tt${cleanImdb}.json`);
  }

  const allFound = [];
  const seenIds = new Set();

  for (const apiUrl of urlsToTry) {
    try {
      const response = await axios.get(apiUrl, {
        timeout: 6000,
        headers: { 'User-Agent': 'Stremio Dual Subtitles Addon/1.0.0' }
      });

      if (response.data && Array.isArray(response.data.subtitles)) {
        for (const sub of response.data.subtitles) {
          if (sub && (sub.id || sub.url) && !seenIds.has(sub.id || sub.url)) {
            const sid = sub.id || sub.url;
            seenIds.add(sid);
            allFound.push({
              id: `os-${sid}`,
              originalId: sub.id || sid,
              url: sub.url,
              lang: sub.lang,
              source: isKitsu ? 'Anime Kitsu' : 'OpenSubtitles v3',
              encoding: sub.SubEncoding || 'UTF-8',
              g: sub.g || null
            });
          }
        }
      }
    } catch (error) {
      debugServer.warn(`OpenSubtitles scraper fetch notice for ${apiUrl}:`, sanitizeForLogging(error.message));
    }
  }

  return allFound;
}

module.exports = {
  fetchOpenSubtitles
};
