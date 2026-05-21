const R = 6371; // Earth radius km

function haversineDistance(lat1, lng1, lat2, lng2) {
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) *
    Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// GeoGuessr-like exponential score, max 5000
function calculateBaseScore(distanceKm) {
  if (distanceKm < 0.025) return 5000;
  return Math.round(5000 * Math.exp(-distanceKm / 2000));
}

function calculateRoundScore(distanceKm, cluePenalty) {
  return Math.max(0, calculateBaseScore(distanceKm) - cluePenalty);
}

function formatDistance(km) {
  if (km < 1) return `${Math.round(km * 1000)} m`;
  if (km < 100) return `${km.toFixed(1)} km`;
  return `${Math.round(km).toLocaleString()} km`;
}

function getScoreRank(score, maxScore) {
  const pct = score / maxScore;
  if (pct >= 0.95) return { label: 'Perfect!',     color: '#ffd700' };
  if (pct >= 0.85) return { label: 'Excellent',    color: '#6eff9c' };
  if (pct >= 0.70) return { label: 'Great',        color: '#4ecdc4' };
  if (pct >= 0.55) return { label: 'Good',         color: '#6c63ff' };
  if (pct >= 0.35) return { label: 'Not bad',      color: '#ffd93d' };
  if (pct >= 0.15) return { label: 'Keep trying',  color: '#ff9a3c' };
  return                   { label: 'Off the map', color: '#ff6b6b' };
}

function buildShareText(mode, totalScore, maxScore, roundResults) {
  const rank = getScoreRank(totalScore, maxScore);
  const squares = roundResults.map(r => {
    const pct = r.score / 5000;
    if (pct >= 0.85) return '🟩';
    if (pct >= 0.55) return '🟨';
    if (pct >= 0.25) return '🟧';
    return '🟥';
  }).join('');
  return `WorldGuessr — ${rank.label}\n${squares}\n${totalScore.toLocaleString()}/${maxScore.toLocaleString()} pts\n#WorldGuessr`;
}
