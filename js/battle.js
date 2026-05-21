function generateBattleUrl(imageIds, mode, subMode, rounds) {
  const base = window.location.href.split('?')[0];
  const params = new URLSearchParams({
    battle: '1',
    ids: imageIds.join(','),
    mode,
    rounds: String(rounds),
  });
  if (subMode) params.set('sub', subMode);
  return `${base}?${params}`;
}

function parseBattleUrl(url) {
  try {
    const u = new URL(url);
    const battle = u.searchParams.get('battle');
    if (!battle) return null;
    const ids = (u.searchParams.get('ids') || '').split(',').filter(Boolean);
    if (!ids.length) return null;
    return {
      imageIds: ids,
      mode: u.searchParams.get('mode') || 'world',
      subMode: u.searchParams.get('sub') || null,
      rounds: parseInt(u.searchParams.get('rounds') || '5', 10),
    };
  } catch {
    return null;
  }
}

function checkIsBattleMode() {
  return new URLSearchParams(window.location.search).get('battle') === '1';
}

function getBattleParams() {
  return parseBattleUrl(window.location.href);
}

function encodeBattleResult(nickname, totalScore, maxScore, roundScores) {
  const data = { n: nickname, s: totalScore, m: maxScore, r: roundScores };
  return btoa(JSON.stringify(data));
}

function decodeBattleResult(encoded) {
  try {
    const data = JSON.parse(atob(encoded));
    return { nickname: data.n, totalScore: data.s, maxScore: data.m, roundScores: data.r };
  } catch {
    return null;
  }
}

function buildBattleResultUrl(battleUrl, nickname, totalScore, maxScore, roundScores) {
  const base = battleUrl.split('&result=')[0];
  return `${base}&result=${encodeBattleResult(nickname, totalScore, maxScore, roundScores)}`;
}
