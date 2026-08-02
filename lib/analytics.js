const {
  incrementCounter,
  addToSet,
  incrementSortedSet,
  getPublicCounters,
  isEnabled: persistenceEnabled
} = require('./persistence');

const analytics = {
  totalPageViews: 0,
  totalInstalls: 0,
  totalSubtitleRequests: 0,
  totalSubtitlesServed: 0,
  hourlyStats: new Array(24).fill(null).map(() => ({
    pageViews: 0,
    installs: 0,
    subtitleRequests: 0,
    timestamp: null
  })),
  languageStats: {},
  dailyStats: new Array(7).fill(null).map(() => ({
    pageViews: 0,
    installs: 0,
    subtitleRequests: 0,
    date: null
  })),
  recentActivity: [],
  serverStartTime: Date.now(),
  uniqueVisitors: new Set(),
  contentStats: {}
};

function hashIP(ip) {
  let hash = 0;
  for (let i = 0; i < ip.length; i++) {
    const char = ip.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return hash.toString(16);
}

function getCurrentHourIndex() {
  return new Date().getHours();
}

function getCurrentDayIndex() {
  return new Date().getDay();
}

function updateHourlyStats(field) {
  const hourIndex = getCurrentHourIndex();
  const currentHour = new Date().setMinutes(0, 0, 0);

  if (analytics.hourlyStats[hourIndex].timestamp !== currentHour) {
    analytics.hourlyStats[hourIndex] = {
      pageViews: 0,
      installs: 0,
      subtitleRequests: 0,
      timestamp: currentHour
    };
  }

  analytics.hourlyStats[hourIndex][field]++;
}

function updateDailyStats(field) {
  const dayIndex = getCurrentDayIndex();
  const today = new Date().toDateString();

  if (analytics.dailyStats[dayIndex].date !== today) {
    analytics.dailyStats[dayIndex] = {
      pageViews: 0,
      installs: 0,
      subtitleRequests: 0,
      date: today
    };
  }

  analytics.dailyStats[dayIndex][field]++;
}

function addActivity(type, details) {
  analytics.recentActivity.unshift({
    type,
    details,
    timestamp: Date.now()
  });

  if (analytics.recentActivity.length > 100) {
    analytics.recentActivity.pop();
  }
}

function trackPageView(ip, page) {
  analytics.totalPageViews++;
  updateHourlyStats('pageViews');
  updateDailyStats('pageViews');

  const hashedIP = hashIP(ip || 'unknown');
  analytics.uniqueVisitors.add(hashedIP);
  addActivity('pageView', { page });

  incrementCounter('stats:totalPageViews');
  addToSet('stats:uniqueVisitors', hashedIP);
}

function trackInstall(ip, mainLang, transLang) {
  analytics.totalInstalls++;
  updateHourlyStats('installs');
  updateDailyStats('installs');

  const langPair = `${mainLang}+${transLang}`;
  analytics.languageStats[langPair] = (analytics.languageStats[langPair] || 0) + 1;
  analytics.languageStats[mainLang] = (analytics.languageStats[mainLang] || 0) + 1;
  analytics.languageStats[transLang] = (analytics.languageStats[transLang] || 0) + 1;

  addActivity('install', { mainLang, transLang });

  incrementCounter('stats:totalInstalls');
  incrementSortedSet('stats:languages', mainLang);
  incrementSortedSet('stats:languages', transLang);
  incrementSortedSet('stats:languagePairs', langPair);
}

function trackSubtitleRequest(mainLang, transLang, contentType, contentId) {
  analytics.totalSubtitleRequests++;
  updateHourlyStats('subtitleRequests');
  updateDailyStats('subtitleRequests');

  if (contentId) {
    const imdbId = contentId.split(':')[0];
    const key = contentType + '/' + imdbId;
    if (!analytics.contentStats[key]) {
      analytics.contentStats[key] = { type: contentType, imdbId: imdbId, count: 0, lastSeen: null };
    }
    analytics.contentStats[key].count++;
    analytics.contentStats[key].lastSeen = Date.now();
  }

  addActivity('subtitleRequest', { mainLang, transLang, contentType, contentId: contentId ? contentId.split(':')[0] : null });
  incrementCounter('stats:totalSubtitleRequests');
}

function trackSubtitleServed() {
  analytics.totalSubtitlesServed++;
  incrementCounter('stats:totalSubtitlesServed');
}

function formatUptime(seconds) {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);

  if (days > 0) return `${days}d ${hours}h ${minutes}m`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

function formatTimeAgo(timestamp) {
  const seconds = Math.floor((Date.now() - timestamp) / 1000);
  if (seconds < 60) return 'Just now';
  if (seconds < 3600) return Math.floor(seconds / 60) + 'm ago';
  if (seconds < 86400) return Math.floor(seconds / 3600) + 'h ago';
  return Math.floor(seconds / 86400) + 'd ago';
}

async function getAnalyticsSummary() {
  const now = Date.now();
  const uptime = Math.floor((now - analytics.serverStartTime) / 1000);

  let persistent = null;
  if (persistenceEnabled()) {
    try {
      persistent = await getPublicCounters();
    } catch (_) {}
  }

  const todayIndex = getCurrentDayIndex();
  const todayStats = analytics.dailyStats[todayIndex].date === new Date().toDateString()
    ? analytics.dailyStats[todayIndex]
    : { pageViews: 0, installs: 0, subtitleRequests: 0 };

  const totals = persistent ? {
    totalPageViews: persistent.totalPageViews,
    totalInstalls: persistent.totalInstalls,
    totalSubtitleRequests: persistent.totalSubtitleRequests,
    totalSubtitlesServed: persistent.totalSubtitlesServed,
    uniqueVisitors: persistent.uniqueVisitors
  } : {
    totalPageViews: analytics.totalPageViews,
    totalInstalls: analytics.totalInstalls,
    totalSubtitleRequests: analytics.totalSubtitleRequests,
    totalSubtitlesServed: analytics.totalSubtitlesServed,
    uniqueVisitors: analytics.uniqueVisitors.size
  };

  const topLanguages = (persistent && persistent.topLanguages.length > 0)
    ? persistent.topLanguages
    : Object.entries(analytics.languageStats)
        .filter(([key]) => !key.includes('+'))
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10);

  const topPairs = (persistent && persistent.topPairs.length > 0)
    ? persistent.topPairs
    : Object.entries(analytics.languageStats)
        .filter(([key]) => key.includes('+'))
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10);

  const hourlyChart = [];
  for (let i = 0; i < 24; i++) {
    const hourIndex = (getCurrentHourIndex() - 23 + i + 24) % 24;
    hourlyChart.push({
      hour: hourIndex,
      ...analytics.hourlyStats[hourIndex]
    });
  }

  const popularContent = Object.values(analytics.contentStats)
    .sort((a, b) => b.count - a.count)
    .slice(0, 20);

  return {
    overview: {
      ...totals,
      uptime: formatUptime(uptime),
      persistenceEnabled: persistenceEnabled()
    },
    today: todayStats,
    topLanguages,
    topPairs,
    popularContent,
    hourlyChart,
    recentActivity: analytics.recentActivity.slice(0, 20)
  };
}

async function getPublicStats() {
  if (persistenceEnabled()) {
    try {
      const counters = await getPublicCounters();
      return {
        totalSubtitlesServed: counters.totalSubtitlesServed,
        totalInstalls: counters.totalInstalls,
        totalPageViews: counters.totalPageViews,
        uniqueVisitors: counters.uniqueVisitors,
        topPairs: counters.topPairs.slice(0, 5),
        live: true
      };
    } catch (_) {}
  }

  return {
    totalSubtitlesServed: analytics.totalSubtitlesServed,
    totalInstalls: analytics.totalInstalls,
    totalPageViews: analytics.totalPageViews,
    uniqueVisitors: analytics.uniqueVisitors.size,
    topPairs: Object.entries(analytics.languageStats)
      .filter(([k]) => k.includes('+'))
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5),
    live: false
  };
}

module.exports = {
  analytics,
  trackPageView,
  trackInstall,
  trackSubtitleRequest,
  trackSubtitleServed,
  getAnalyticsSummary,
  getPublicStats,
  formatTimeAgo
};
