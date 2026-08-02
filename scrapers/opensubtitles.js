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
    let apiUrl = `https://opensubtitles-v3.strem.io/subtitles/${type}/tt${cleanImdb}`;
    if (type === 'series' && season && episode && season !== '0' && episode !== '0') {
      apiUrl += `:${season}:${episode}`;
    }
    const normalized = normalizeVideoParams(videoParams);
    const queryParams = [];
    if (normalized.filename) queryParams.push(`filename=${encodeURIComponent(normalized.filename)}`);
    if (normalized.videoSize) queryParams.push(`videoSize=${normalized.videoSize}`);
    if (normalized.videoHash) queryParams.push(`videoHash=${normalized.videoHash}`);
    if (queryParams.length > 0) apiUrl += `/${queryParams.join('&')}`;
    apiUrl += '.json';
    urlsToTry.push(apiUrl);
  }

  for (const apiUrl of urlsToTry) {
    try {
      const response = await axios.get(apiUrl, {
        timeout: 4000,
        headers: { 'User-Agent': 'Stremio Dual Subtitles Addon/1.0.0' }
      });

      if (response.data && Array.isArray(response.data.subtitles) && response.data.subtitles.length > 0) {
        return response.data.subtitles.map(sub => ({
          id: `os-${sub.id}`,
          originalId: sub.id,
          url: sub.url,
          lang: sub.lang,
          source: isKitsu ? 'Anime Kitsu' : 'OpenSubtitles v3',
          encoding: sub.SubEncoding || 'UTF-8',
          g: sub.g || null
        }));
      }
    } catch (error) {
      debugServer.warn(`OpenSubtitles scraper fetch error for ${apiUrl}:`, sanitizeForLogging(error.message));
    }
  }

  return [];
}

module.exports = {
  fetchOpenSubtitles
};
