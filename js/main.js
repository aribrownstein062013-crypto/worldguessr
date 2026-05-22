// UI namespace — keeps game.js free of DOM refs
const UI = {
  showLoading(visible) {
    const el = document.getElementById('viewer-loading');
    if (el) el.style.display = visible ? 'flex' : 'none';
  },
  setTimer(seconds) {
    const el = document.getElementById('game-timer-display');
    if (!el) return;
    if (seconds === null) { el.textContent = '∞'; el.className = 'game-timer'; return; }
    const m = Math.floor(seconds / 60);
    const s = String(seconds % 60).padStart(2, '0');
    el.textContent = `${m}:${s}`;
    el.className = seconds <= 10 ? 'game-timer urgent' : (seconds <= 30 ? 'game-timer warning' : 'game-timer');
  },
  setGuessButtonEnabled(enabled) {
    const btn = document.getElementById('btn-make-guess');
    if (btn) btn.disabled = !enabled;
  },
  clearClues() {
    const list = document.getElementById('clues-revealed-list');
    if (list) list.innerHTML = '';
    const cnt = document.getElementById('clues-used-count');
    if (cnt) cnt.textContent = '0 used';
    document.querySelectorAll('.clue-btn').forEach(b => { b.disabled = false; b.classList.remove('used'); });
  },
  showClue(id, icon, label, text) {
    const list = document.getElementById('clues-revealed-list');
    if (!list) return;
    let item = list.querySelector(`[data-clue-id="${id}"]`);
    if (!item) { item = document.createElement('div'); item.className = 'clue-item'; item.dataset.clueId = id; list.appendChild(item); }
    item.innerHTML = `<span class="clue-icon">${icon}</span><div><div class="clue-label">${label}</div><div class="clue-text">${text}</div></div>`;
  },
  updateCluePenalty(penalty) {
    const count = GameState.cluesRevealed.length;
    const el = document.getElementById('clues-used-count');
    if (el) el.textContent = `${count} used (−${penalty} pts)`;
  },
  markClueUsed(clueId) {
    const btn = document.querySelector(`.clue-btn[data-clue="${clueId}"]`);
    if (btn) { btn.disabled = true; btn.classList.add('used'); }
  },
  setEndlessUI(isEndless) {
    const endBtn = document.getElementById('btn-end-game');
    if (endBtn) endBtn.style.display = isEndless ? 'inline-flex' : 'none';
  },
};

// ── Screen management ─────────────────────────────────────

function showScreen(id) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  const t = document.getElementById(id);
  if (t) t.classList.add('active');
  if (id === 'screen-game') setTimeout(() => invalidateGuessMap(), 200);
}

// ── Toasts ────────────────────────────────────────────────

function showToast(msg, type = 'info', duration = 3500) {
  const c = document.getElementById('toast-container');
  const t = document.createElement('div');
  t.className = `toast toast-${type}`; t.textContent = msg;
  c.appendChild(t);
  requestAnimationFrame(() => t.classList.add('visible'));
  setTimeout(() => { t.classList.remove('visible'); setTimeout(() => t.remove(), 400); }, duration);
}

// ── Round result ──────────────────────────────────────────

function showRoundResult(result) {
  document.getElementById('result-round').textContent = result.round;
  document.getElementById('result-distance').textContent = result.guessLat != null ? formatDistance(result.distanceKm) : 'No guess';
  document.getElementById('result-score').textContent = result.score.toLocaleString();
  document.getElementById('result-location-name').textContent = result.locationName || '(looking up location…)';
  document.getElementById('result-base-score').textContent = result.baseScore.toLocaleString();

  const nextBtn = document.getElementById('btn-next-round');
  const isLast = !GameState.isEndless && result.round >= GameState.rounds;
  nextBtn.textContent = isLast ? 'See Results →' : 'Next Round →';

  showScreen('screen-round-result');
  const guessLL = result.guessLat != null ? { lat: result.guessLat, lng: result.guessLng } : null;
  initResultMap('result-map', guessLL, { lat: result.actualLat, lng: result.actualLng }, result.locationName);
}

// ── Game over ─────────────────────────────────────────────

function showGameOver(totalScore, maxScore) {
  document.getElementById('gameover-score').textContent = totalScore.toLocaleString();
  document.getElementById('gameover-max-score').textContent = maxScore.toLocaleString();
  const rank = getScoreRank(totalScore, maxScore);
  const rankEl = document.getElementById('gameover-rank');
  rankEl.textContent = rank.label; rankEl.style.color = rank.color;
  const pct = Math.round((totalScore / maxScore) * 100);
  document.getElementById('gameover-pct').textContent = `${pct}%`;
  document.getElementById('gameover-progress-fill').style.width = `${pct}%`;
  document.getElementById('gameover-progress-fill').style.background = rank.color;
  document.getElementById('gameover-rounds').innerHTML = GameState.roundResults.map((r, i) => `
    <div class="round-summary">
      <span class="rs-num">R${i + 1}</span>
      <span class="rs-location">${r.locationName || 'Unknown'}</span>
      <span class="rs-dist">${r.guessLat != null ? formatDistance(r.distanceKm) : '—'}</span>
      <span class="rs-score" style="color:${getScoreRank(r.score,5000).color}">${r.score.toLocaleString()}</span>
    </div>`).join('');

  // Multiplayer leaderboard
  if (GameState.isMultiplayer && MP.roomCode) {
    showMPFinalLeaderboard();
  }

  showScreen('screen-game-over');
  setTimeout(() => initGameOverMap('gameover-map', GameState.roundResults), 100);
}

// ── Leaderboard ───────────────────────────────────────────

function showLeaderboard(tab) {
  const activeTab = tab || document.querySelector('.lb-tab.active')?.dataset.mode || 'world';
  document.querySelectorAll('.lb-tab').forEach(t => t.classList.toggle('active', t.dataset.mode === activeTab));
  const scores = getScores(activeTab);
  const streak = getStreak();
  document.getElementById('streak-value').textContent = streak.current;
  document.getElementById('streak-best').textContent = streak.best;
  const list = document.getElementById('lb-list');
  if (!scores.length) { list.innerHTML = '<div class="lb-empty">No scores yet — play a game!</div>'; return; }
  list.innerHTML = scores.slice(0, 20).map((s, i) => `
    <div class="lb-entry ${i === 0 ? 'best' : ''}">
      <span class="lb-rank">${i === 0 ? '🏆' : `#${i + 1}`}</span>
      <span class="lb-score">${s.score.toLocaleString()}</span>
      <span class="lb-max">/ ${s.max.toLocaleString()}</span>
      <span class="lb-pct">${s.pct}%</span>
      <span class="lb-date">${new Date(s.date).toLocaleDateString()}</span>
    </div>`).join('');
}

// ── Settings ──────────────────────────────────────────────

function openSettings() {
  document.getElementById('modal-settings').style.display = 'flex';
  document.getElementById('mapillary-token-input').value = CONFIG.mapillaryToken;
  document.getElementById('anthropic-key-input').value = CONFIG.anthropicKey;
  document.getElementById('firebase-url-input').value = CONFIG.firebaseUrl;
}
function closeSettings() { document.getElementById('modal-settings').style.display = 'none'; }
function saveSettings() {
  CONFIG.mapillaryToken = document.getElementById('mapillary-token-input').value.trim();
  CONFIG.anthropicKey   = document.getElementById('anthropic-key-input').value.trim();
  CONFIG.firebaseUrl    = document.getElementById('firebase-url-input').value.trim();
  closeSettings();
  showToast('Settings saved!', 'success');
}

// ── AI Analysis ───────────────────────────────────────────

function openAIPanel() {
  const btn = document.getElementById('btn-ai-analyze');
  const popup = document.getElementById('ai-hint-popup');
  const text  = document.getElementById('ai-hint-text');

  if (popup.style.display === 'block') { popup.style.display = 'none'; return; }

  btn.disabled = true;
  btn.textContent = '✦ Analyzing…';
  popup.style.display = 'block';
  text.textContent = '';

  const image = GameState.locations?.[GameState.currentRound];
  const thumbUrl = image?.thumb_2048_url || image?.thumb_original_url;
  if (!thumbUrl) { popup.style.display = 'none'; btn.disabled = false; btn.textContent = '✦ AI Overview'; return; }

  analyzeLocationWithAI(thumbUrl, (chunk) => {
    text.textContent += chunk;
  }).catch(() => {
    popup.style.display = 'none';
    showToast('AI overview temporarily unavailable.', 'warning', 3000);
  }).finally(() => {
    btn.disabled = false;
    btn.textContent = '✦ AI Overview';
  });
}
function closeAIPanel() {
  document.getElementById('ai-hint-popup').style.display = 'none';
}

// ── Multiplayer helpers ───────────────────────────────────

function updateMPLeaderboard() {
  if (!GameState.isMultiplayer) return;
  MP._get(`rooms/${MP.roomCode}/players`).then(renderMPLeaderboard).catch(() => {});
}

function renderMPLeaderboard(players) {
  const panel = document.getElementById('mp-live-panel');
  if (!panel || !players) return;
  const sorted = Object.values(players).sort((a, b) => b.totalScore - a.totalScore);
  panel.innerHTML = sorted.map((p, i) => `
    <div class="mp-player ${p.name === MP.playerName ? 'me' : ''}">
      <span class="mp-rank">${i + 1}</span>
      <span class="mp-name">${p.name}${p.isHost ? ' 👑' : ''}${p.done ? ' ✓' : ''}</span>
      <span class="mp-score">${p.totalScore.toLocaleString()}</span>
    </div>`).join('');
}

async function showMPFinalLeaderboard() {
  try {
    const players = await MP._get(`rooms/${MP.roomCode}/players`);
    if (!players) return;
    const sorted = Object.values(players).sort((a, b) => b.totalScore - a.totalScore);
    const el = document.getElementById('gameover-mp-leaderboard');
    if (!el) return;
    el.innerHTML = '<h3>Multiplayer Results</h3>' + sorted.map((p, i) => `
      <div class="mp-final-row ${p.name === MP.playerName ? 'me' : ''}">
        <span>${i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${i+1}`}</span>
        <span>${p.name}${p.isHost ? ' 👑' : ''}</span>
        <span>${p.totalScore.toLocaleString()}</span>
      </div>`).join('');
    el.style.display = 'block';
  } catch {}
}

// ── Setup state ───────────────────────────────────────────

let setupState = {
  gameType: 'normal',   // normal | endless | famous
  region: 'world',      // world | continent code | country code
  subRegion: null,      // continent or country code (when region != 'world')
  rounds: 5,
  timerSeconds: 120,
};

function pickGameType(type) {
  setupState.gameType = type;
  document.querySelectorAll('.type-card').forEach(c => c.classList.toggle('active', c.dataset.type === type));
  // Famous Places hides region/rounds pickers
  const regionRow = document.getElementById('setup-region-row');
  const roundsRow = document.getElementById('setup-rounds-row');
  if (regionRow) regionRow.style.display = type === 'famous' ? 'none' : 'block';
  if (roundsRow) roundsRow.style.display = (type === 'endless' || type === 'famous') ? 'none' : 'block';
}

function pickRegion(val) {
  setupState.region = val;
  setupState.subRegion = null;
  document.querySelectorAll('#region-pills .pill').forEach(p => p.classList.toggle('active', p.dataset.value === val));
  const contWrap    = document.getElementById('setup-sub-select');
  const countryWrap = document.getElementById('setup-country-wrap');
  if (contWrap)    contWrap.style.display    = val === 'continent' ? 'block' : 'none';
  if (countryWrap) countryWrap.style.display = val === 'country'   ? 'block' : 'none';
}

// Syncs a pill group + its paired number input, both ways.
function initPillGroup(pillsId, inputId, stateKey) {
  const pills = document.querySelectorAll(`#${pillsId} .pill`);
  const input = document.getElementById(inputId);
  if (!input) return;
  const sync = (val) => {
    setupState[stateKey] = val;
    input.value = val;
    pills.forEach(p => p.classList.toggle('active', Number(p.dataset.value) === val));
  };
  pills.forEach(p => p.addEventListener('click', () => sync(Number(p.dataset.value))));
  input.addEventListener('input', () => {
    const v = parseInt(input.value);
    if (isNaN(v)) return;
    setupState[stateKey] = v;
    pills.forEach(p => p.classList.toggle('active', Number(p.dataset.value) === v));
  });
  input.addEventListener('blur', () => {
    const min = parseInt(input.min) || 0;
    const max = parseInt(input.max) || 9999;
    const v = Math.max(min, Math.min(max, parseInt(input.value) || min));
    sync(v);
  });
}

function buildGameOptions() {
  let mode, subMode;
  if (setupState.gameType === 'famous') {
    mode = 'famous'; subMode = null;
  } else if (setupState.region === 'continent') {
    mode = 'continent'; subMode = setupState.subRegion;
  } else if (setupState.region === 'country') {
    mode = 'country'; subMode = setupState.subRegion;
  } else {
    mode = 'world'; subMode = null;
  }
  return {
    mode, subMode,
    rounds: setupState.gameType === 'endless' ? 0 : (setupState.gameType === 'famous' ? 5 : setupState.rounds),
    timerSeconds: setupState.timerSeconds,
  };
}

// ── Multiplayer screen ────────────────────────────────────

async function createMPRoom() {
  if (!CONFIG.firebaseUrl) { showToast('Add your Firebase Database URL in Settings to use multiplayer.', 'warning', 7000); return; }
  const btn = document.getElementById('btn-create-room');
  const nameInput = document.getElementById('mp-name-input');
  const name = nameInput.value.trim() || 'Host';
  btn.disabled = true; btn.textContent = 'Setting up…';
  try {
    const opts = buildGameOptions();
    const locs = await prefetchGameLocations(opts.mode, opts.subMode, opts.rounds || 5);
    const imageIds = locs.map(l => l.id);
    const code = await MP.createRoom(imageIds, { ...opts, playerName: name });
    document.getElementById('mp-room-code-display').textContent = code;
    document.getElementById('mp-room-code-box').style.display = 'flex';
    showToast(`Room ${code} created! Share the code.`, 'success');

    MP.listenToPlayers(renderMPLeaderboard);

    // Start game locally
    await initGame({ ...opts, locations: locs, isMultiplayer: true });
    document.getElementById('mp-live-panel').style.display = 'block';
  } catch (e) {
    showToast('Failed: ' + e.message, 'error');
  } finally {
    btn.disabled = false; btn.textContent = 'Create Room';
  }
}

async function joinMPRoom() {
  if (!CONFIG.firebaseUrl) { showToast('Add your Firebase Database URL in Settings.', 'warning', 7000); return; }
  const code = document.getElementById('mp-join-code').value.trim();
  const name = document.getElementById('mp-join-name').value.trim() || 'Player';
  if (!code || code.length !== 5) { showToast('Enter a 5-digit room code', 'warning'); return; }
  const btn = document.getElementById('btn-join-room');
  btn.disabled = true; btn.textContent = 'Joining…';
  try {
    const room = await MP.joinRoom(code, name);
    const imageIds = room.imageIds;
    const locs = await Promise.all(imageIds.map(id => fetchImageById(id)));
    MP.listenToPlayers(renderMPLeaderboard);
    await initGame({
      mode: room.mode, subMode: room.subMode,
      rounds: room.rounds, timerSeconds: room.timerSeconds,
      locations: locs, isMultiplayer: true,
    });
    document.getElementById('mp-live-panel').style.display = 'block';
    showToast(`Joined room ${code}!`, 'success');
  } catch (e) {
    showToast('Failed to join: ' + e.message, 'error');
  } finally {
    btn.disabled = false; btn.textContent = 'Join Room';
  }
}

// ── Battle helpers ────────────────────────────────────────

async function handleBattleJoin() {
  const params = getBattleParams();
  if (!params) { showScreen('screen-home'); return; }
  initGuessMap('guess-map', () => UI.setGuessButtonEnabled(true));
  showToast('Loading battle locations…', 'info', 4000);
  try {
    const locations = await Promise.all(params.imageIds.map(id => fetchImageById(id)));
    await initGame({ mode: params.mode, subMode: params.subMode, rounds: params.rounds, timerSeconds: CONFIG.defaultTimerSeconds, locations, isBattle: true, battleParams: params });
  } catch (e) {
    showToast('Failed to load battle: ' + e.message, 'error');
    showScreen('screen-home');
  }
}

// ── DOM setup ─────────────────────────────────────────────

function populateSelects() {
  const contSel = document.getElementById('setup-continent-select');
  if (contSel) {
    Object.entries(LOCATIONS.continent).forEach(([code, def]) => {
      const o = document.createElement('option'); o.value = code; o.textContent = `${def.icon} ${def.name}`;
      contSel.appendChild(o);
    });
    contSel.addEventListener('change', e => { setupState.subRegion = e.target.value; });
  }
  const countrySel = document.getElementById('setup-country-select');
  if (countrySel) {
    Object.entries(LOCATIONS.country).sort((a, b) => a[1].name.localeCompare(b[1].name)).forEach(([code, def]) => {
      const o = document.createElement('option'); o.value = code; o.textContent = `${def.flag} ${def.name}`;
      countrySel.appendChild(o);
    });
    countrySel.addEventListener('change', e => { setupState.subRegion = e.target.value; });
  }
}

document.addEventListener('DOMContentLoaded', () => {
  if (checkIsBattleMode()) { handleBattleJoin(); return; }

  initGuessMap('guess-map', () => UI.setGuessButtonEnabled(true));
  populateSelects();

  // ── Home ──
  document.getElementById('btn-play').addEventListener('click', () => showScreen('screen-setup'));
  document.getElementById('btn-multiplayer').addEventListener('click', () => showScreen('screen-multiplayer'));
  document.getElementById('btn-battle').addEventListener('click', () => showScreen('screen-battle'));
  document.getElementById('btn-leaderboard').addEventListener('click', () => { showLeaderboard('world'); showScreen('screen-leaderboard'); });
  document.getElementById('btn-settings-home').addEventListener('click', openSettings);

  // ── Setup ──
  document.querySelectorAll('.type-card').forEach(c => c.addEventListener('click', () => pickGameType(c.dataset.type)));
  document.querySelectorAll('#region-pills .pill').forEach(b => b.addEventListener('click', () => pickRegion(b.dataset.value)));
  initPillGroup('rounds-pills', 'rounds-custom', 'rounds');
  initPillGroup('timer-pills',  'timer-custom',  'timerSeconds');
  document.getElementById('setup-back').addEventListener('click', () => showScreen('screen-home'));
  document.getElementById('btn-start-game').addEventListener('click', () => {
    if (setupState.region === 'continent' && !setupState.subRegion) { showToast('Pick a continent', 'warning'); return; }
    if (setupState.region === 'country' && !setupState.subRegion) { showToast('Pick a country', 'warning'); return; }
    initGame(buildGameOptions());
  });

  // ── Game ──
  document.getElementById('btn-make-guess').addEventListener('click', () => {
    const ll = getGuessLatLng();
    if (!ll) { showToast('Click the map to place your guess first', 'warning'); return; }
    submitGuess(ll.lat, ll.lng);
  });
  document.getElementById('btn-skip-guess').addEventListener('click', () => { if (confirm('Skip this round with no points?')) skipGuess(); });
  document.getElementById('btn-end-game').addEventListener('click', () => { if (confirm('End the game and see your score?')) endGameEarly(); });
  document.getElementById('btn-ai-analyze').addEventListener('click', openAIPanel);
  document.getElementById('btn-close-ai').addEventListener('click', closeAIPanel);
  document.getElementById('float-map').addEventListener('mouseenter', () => setTimeout(() => invalidateGuessMap(), 260));
  document.getElementById('btn-settings-game').addEventListener('click', openSettings);
  document.getElementById('btn-clear-guess')?.addEventListener('click', () => { clearGuessMarker(); UI.setGuessButtonEnabled(false); });

  // ── Round result ──
  document.getElementById('btn-next-round').addEventListener('click', advanceRound);

  // ── Game over ──
  document.getElementById('btn-play-again').addEventListener('click', () => { MP.reset(); showScreen('screen-setup'); });
  document.getElementById('btn-view-leaderboard').addEventListener('click', () => { showLeaderboard(GameState.mode); showScreen('screen-leaderboard'); });
  document.getElementById('btn-share-result').addEventListener('click', () => {
    const total = GameState.roundResults.reduce((s, r) => s + r.score, 0);
    const max = GameState.roundResults.length * 5000;
    const text = buildShareText(GameState.mode, total, max, GameState.roundResults);
    if (navigator.clipboard) navigator.clipboard.writeText(text).then(() => showToast('Result copied!', 'success'));
    else prompt('Copy your result:', text);
  });

  // ── Leaderboard ──
  document.getElementById('lb-back').addEventListener('click', () => showScreen('screen-home'));
  document.querySelectorAll('.lb-tab').forEach(tab => tab.addEventListener('click', () => showLeaderboard(tab.dataset.mode)));

  // ── Multiplayer ──
  document.getElementById('mp-back').addEventListener('click', () => showScreen('screen-home'));
  document.getElementById('btn-create-room').addEventListener('click', createMPRoom);
  document.getElementById('btn-join-room').addEventListener('click', joinMPRoom);
  document.querySelectorAll('#mp-region-pills .pill').forEach(b => b.addEventListener('click', () => {
    document.querySelectorAll('#mp-region-pills .pill').forEach(p => p.classList.remove('active'));
    b.classList.add('active');
    pickRegion(b.dataset.value);
  }));
  initPillGroup('mp-rounds-pills', 'mp-rounds-custom', 'rounds');
  initPillGroup('mp-timer-pills',  'mp-timer-custom',  'timerSeconds');
  document.getElementById('btn-copy-room-code').addEventListener('click', () => {
    const code = document.getElementById('mp-room-code-display').textContent;
    navigator.clipboard?.writeText(code);
    showToast('Code copied!', 'success');
  });

  // ── Battle ──
  document.getElementById('battle-back').addEventListener('click', () => showScreen('screen-home'));
  document.getElementById('btn-generate-battle').addEventListener('click', async () => {
    const mode = document.querySelector('#battle-mode-pills .pill.active')?.dataset.value || 'world';
    const rounds = parseInt(document.querySelector('#battle-rounds-pills .pill.active')?.dataset.value || '5');
    const btn = document.getElementById('btn-generate-battle');
    btn.disabled = true; btn.textContent = 'Generating…';
    try {
      const locs = await prefetchGameLocations(mode, null, rounds);
      const url = generateBattleUrl(locs.map(l => l.id), mode, null, rounds);
      document.getElementById('battle-link-input').value = url;
      document.getElementById('battle-link-box').style.display = 'flex';
      document.getElementById('btn-play-battle').style.display = 'inline-block';
      document.getElementById('btn-play-battle').dataset.url = url;
      showToast('Challenge link ready!', 'success');
    } catch (e) { showToast('Failed: ' + e.message, 'error'); }
    finally { btn.disabled = false; btn.textContent = 'Generate Challenge Link'; }
  });
  document.getElementById('btn-copy-link').addEventListener('click', () => {
    const v = document.getElementById('battle-link-input').value;
    navigator.clipboard?.writeText(v); showToast('Link copied!', 'success');
  });
  document.getElementById('btn-play-battle').addEventListener('click', e => { if (e.target.dataset.url) window.location.href = e.target.dataset.url; });
  document.getElementById('btn-join-battle').addEventListener('click', () => {
    const url = document.getElementById('battle-join-input').value.trim();
    if (!url) { showToast('Paste a challenge link first', 'warning'); return; }
    window.location.href = url;
  });
  document.querySelectorAll('#battle-mode-pills .pill, #battle-rounds-pills .pill').forEach(btn => {
    btn.addEventListener('click', () => {
      btn.closest('.option-pills').querySelectorAll('.pill').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
    });
  });

  // ── Settings ──
  document.getElementById('settings-close').addEventListener('click', closeSettings);
  document.getElementById('settings-overlay').addEventListener('click', closeSettings);
  document.getElementById('btn-save-settings').addEventListener('click', saveSettings);

});
