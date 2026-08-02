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

async function fetchOpenSubtitles(imdbId, type, season = null, episode = null, videoParams = {}) {
  if (!imdbId) return [];

  const cleanImdb = String(imdbId).replace(/^tt/, '');
  let apiUrl = `https://opensubtitles-v3.strem.io/subtitles/${type}/tt${cleanImdb}`;

  if (type === 'series' && season && episode) {
    apiUrl += `:${season}:${episode}`;
  }

  const queryParams = [];
  const normalized = normalizeVideoParams(videoParams);
  if (normalized.filename) queryParams.push(`filename=${encodeURIComponent(normalized.filename)}`);
  if (normalized.videoSize) queryParams.push(`videoSize=${normalized.videoSize}`);
  if (normalized.videoHash) queryParams.push(`videoHash=${normalized.videoHash}`);

  if (queryParams.length > 0) {
    apiUrl += `/${queryParams.join('&')}`;
  }
  apiUrl += '.json';

  try {
    const response = await axios.get(apiUrl, {
      timeout: 5000,
      headers: {
        'User-Agent': 'Stremio Dual Subtitles Addon/1.0.0 (https://stremio-addons.net)'
      }
    });

    if (!response.data || !Array.isArray(response.data.subtitles)) {
      return [];
    }

    return response.data.subtitles.map(sub => ({
      id: `os-${sub.id}`,
      originalId: sub.id,
      url: sub.url,
      lang: sub.lang,
      source: 'OpenSubtitles v3',
      encoding: sub.SubEncoding || 'UTF-8',
      g: sub.g || null
    }));
  } catch (error) {
    debugServer.warn('OpenSubtitles fetch error:', sanitizeForLogging(error.message));
    return [];
  }
}

module.exports = {
  fetchOpenSubtitles
};
