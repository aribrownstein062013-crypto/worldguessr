const STORAGE_KEYS = {
  scores: 'wg_scores',
  streak: 'wg_streak',
  lastPlayed: 'wg_last_played',
  stats: 'wg_stats',
};

function saveScore(mode, subMode, totalScore, maxScore, roundResults) {
  const all = getAllScores();
  const key = subMode ? `${mode}:${subMode}` : mode;
  if (!all[key]) all[key] = [];
  all[key].unshift({
    score: totalScore,
    max: maxScore,
    pct: Math.round((totalScore / maxScore) * 100),
    rounds: roundResults.length,
    date: new Date().toISOString(),
  });
  // Keep top 50 per mode
  all[key] = all[key].slice(0, 50);
  localStorage.setItem(STORAGE_KEYS.scores, JSON.stringify(all));
  updateStreak(totalScore / maxScore >= 0.5);
  updateStats(totalScore, maxScore);
  return getBestScore(key);
}

function getAllScores() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEYS.scores) || '{}');
  } catch {
    return {};
  }
}

function getScores(key) {
  return getAllScores()[key] || [];
}

function getBestScore(key) {
  const scores = getScores(key);
  if (!scores.length) return null;
  return scores.reduce((best, s) => s.score > best.score ? s : best, scores[0]);
}

function getStreak() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEYS.streak) || '{"current":0,"best":0}');
  } catch {
    return { current: 0, best: 0 };
  }
}

function updateStreak(won) {
  const streak = getStreak();
  const today = new Date().toDateString();
  const last = localStorage.getItem(STORAGE_KEYS.lastPlayed);
  if (won) {
    if (last !== today) {
      streak.current += 1;
      streak.best = Math.max(streak.best, streak.current);
    }
  } else {
    streak.current = 0;
  }
  localStorage.setItem(STORAGE_KEYS.streak, JSON.stringify(streak));
  localStorage.setItem(STORAGE_KEYS.lastPlayed, today);
}

function updateStats(score, max) {
  let stats;
  try {
    stats = JSON.parse(localStorage.getItem(STORAGE_KEYS.stats) || '{}');
  } catch {
    stats = {};
  }
  stats.gamesPlayed = (stats.gamesPlayed || 0) + 1;
  stats.totalScore = (stats.totalScore || 0) + score;
  stats.bestScore = Math.max(stats.bestScore || 0, score);
  localStorage.setItem(STORAGE_KEYS.stats, JSON.stringify(stats));
}

function getStats() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEYS.stats) || '{}');
  } catch {
    return {};
  }
}

function clearAllData() {
  Object.values(STORAGE_KEYS).forEach(k => localStorage.removeItem(k));
}
