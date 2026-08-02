const axios = require('axios');
const { debugServer, sanitizeForLogging } = require('../lib/debug');

async function fetchSubdl(imdbId, type, season = null, episode = null, languages = []) {
  if (!imdbId) return [];

  const cleanImdb = String(imdbId).replace(/^tt/, '');
  const langQuery = languages.length > 0 ? languages.join(',') : 'eng,vie,tur,spa,fre,ger';

  try {
    const apiUrl = `https://api.subdl.com/api/v1/subtitles?imdb_id=tt${cleanImdb}&languages=${encodeURIComponent(langQuery)}`;
    const response = await axios.get(apiUrl, {
      timeout: 4000,
      headers: { 'User-Agent': 'Stremio Dual Subtitles Addon/1.0.0' }
    });

    if (!response.data || !Array.isArray(response.data.subtitles)) {
      return [];
    }

    return response.data.subtitles.map(sub => ({
      id: `subdl-${sub.id || Math.random().toString(36).substring(2, 9)}`,
      originalId: sub.id,
      url: sub.url && sub.url.startsWith('http') ? sub.url : `https://dl.subdl.com${sub.url}`,
      lang: sub.lang || sub.language || 'eng',
      source: 'Subdl',
      encoding: 'UTF-8',
      g: 'subdl'
    }));
  } catch (error) {
    debugServer.warn('Subdl fetch error:', sanitizeForLogging(error.message));
    return [];
  }
}

module.exports = {
  fetchSubdl
};
