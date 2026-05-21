const GameState = {
  mode: 'world',
  subMode: null,
  rounds: 5,          // 0 = endless
  timerSeconds: 120,
  currentRound: 0,
  locations: [],
  locationInfos: [],
  roundResults: [],
  cluesRevealed: [],
  cluePenalty: 0,
  timerInterval: null,
  timeLeft: 0,
  isBattle: false,
  battleParams: null,
  isMultiplayer: false,
  isEndless: false,
};

// ── Game init ─────────────────────────────────────────────

async function initGame(options) {
  Object.assign(GameState, {
    mode: options.mode || 'world',
    subMode: options.subMode || null,
    rounds: options.rounds || CONFIG.defaultRounds,
    timerSeconds: options.timerSeconds ?? CONFIG.defaultTimerSeconds,
    currentRound: 0,
    locations: options.locations || [],
    locationInfos: [],
    roundResults: [],
    cluesRevealed: [],
    cluePenalty: 0,
    isBattle: options.isBattle || false,
    battleParams: options.battleParams || null,
    isMultiplayer: options.isMultiplayer || false,
    isEndless: options.rounds === 0,
  });

  showScreen('screen-game');
  updateGameHeader();
  UI.showLoading(true);
  UI.setEndlessUI(GameState.isEndless);

  try {
    if (!GameState.locations.length) {
      // Fetch only the first image so the game starts immediately
      const [first] = await prefetchGameLocations(GameState.mode, GameState.subMode, 1);
      GameState.locations = [first];
      // Silently prefetch remaining rounds in background
      const remaining = GameState.isEndless ? 2 : GameState.rounds - 1;
      if (remaining > 0) {
        prefetchGameLocations(GameState.mode, GameState.subMode, remaining).then(locs => {
          GameState.locations.push(...locs);
          locs.forEach((loc, i) => {
            reverseGeocode(loc.lat, loc.lng)
              .then(info => { GameState.locationInfos[i + 1] = info; })
              .catch(() => { GameState.locationInfos[i + 1] = {}; });
          });
        }).catch(() => {});
      }
    }
    _startGeocodeBackground();
    await startRound(0);
  } catch (e) {
    UI.showLoading(false);
    showToast('Failed to load locations: ' + e.message, 'error');
    showScreen('screen-home');
  }
}

function _startGeocodeBackground() {
  GameState.locations.forEach((img, i) => {
    reverseGeocode(img.lat, img.lng).then(info => {
      GameState.locationInfos[i] = info;
      if (GameState.currentRound === i) refreshHemisphereClue(info);
    }).catch(() => { GameState.locationInfos[i] = {}; });
  });
}

// ── Round lifecycle ───────────────────────────────────────

async function startRound(index) {
  GameState.currentRound = index;
  GameState.cluesRevealed = [];
  GameState.cluePenalty = 0;
  showScreen('screen-game');
  clearGuessMarker();
  UI.clearClues();
  UI.setGuessButtonEnabled(false);
  UI.showLoading(true);
  updateGameHeader();
  startTimer();

  // For endless mode, ensure there's a location for this index
  if (GameState.isEndless && index >= GameState.locations.length) {
    try {
      const [newLoc] = await prefetchGameLocations(GameState.mode, GameState.subMode, 1);
      GameState.locations.push(newLoc);
      reverseGeocode(newLoc.lat, newLoc.lng).then(info => {
        GameState.locationInfos[index] = info;
        if (GameState.currentRound === index) refreshHemisphereClue(info);
      }).catch(() => { GameState.locationInfos[index] = {}; });
    } catch (e) {
      showToast('Could not load next location: ' + e.message, 'error');
      UI.showLoading(false); return;
    }
  }

  const image = GameState.locations[index];
  try {
    try { await initViewer('mapillary-viewer', image.id); }
    catch { showFallbackImage('mapillary-viewer', image.thumb_2048_url || image.thumb_original_url); }
  } finally {
    UI.showLoading(false);
    invalidateGuessMap();
  }

  const locInfo = GameState.locationInfos[index];
  if (locInfo) refreshHemisphereClue(locInfo);
  else UI.showClue('hemisphere', '🌐', 'Hemisphere', 'Determining…');

  // Pre-fetch next location for endless mode in background
  if (GameState.isEndless) {
    const nextIdx = index + 1;
    if (nextIdx >= GameState.locations.length) {
      prefetchGameLocations(GameState.mode, GameState.subMode, 1).then(([loc]) => {
        GameState.locations.push(loc);
        reverseGeocode(loc.lat, loc.lng).then(info => {
          GameState.locationInfos[nextIdx] = info;
        }).catch(() => { GameState.locationInfos[nextIdx] = {}; });
      }).catch(() => {});
    }
  }
}

function refreshHemisphereClue(locInfo) {
  const image = GameState.locations[GameState.currentRound];
  const text = buildClueText('hemisphere', { lat: image.lat, lng: image.lng, ...locInfo });
  UI.showClue('hemisphere', '🌐', 'Hemisphere', text);
}

function requestClue(clueId) {
  if (GameState.cluesRevealed.includes(clueId)) return;
  const cost = getClueCost(clueId);
  const icon = getClueIcon(clueId);
  const label = CLUE_DEFS.find(c => c.id === clueId)?.label || clueId;
  const locInfo = GameState.locationInfos[GameState.currentRound] || {};
  const image = GameState.locations[GameState.currentRound];
  const text = buildClueText(clueId, { lat: image.lat, lng: image.lng, ...locInfo });
  GameState.cluesRevealed.push(clueId);
  GameState.cluePenalty += cost;
  UI.showClue(clueId, icon, label, text);
  UI.updateCluePenalty(GameState.cluePenalty);
  UI.markClueUsed(clueId);
}

function submitGuess(lat, lng) {
  stopTimer();
  const image = GameState.locations[GameState.currentRound];
  const distKm = lat != null ? haversineDistance(lat, lng, image.lat, image.lng) : 20000;
  const baseScore = calculateBaseScore(distKm);
  const roundScore = Math.max(0, baseScore - GameState.cluePenalty);
  const locInfo = GameState.locationInfos[GameState.currentRound] || {};
  const locationName = [locInfo.city, locInfo.countryName].filter(Boolean).join(', ');

  const result = {
    round: GameState.currentRound + 1,
    imageId: image.id,
    actualLat: image.lat,
    actualLng: image.lng,
    guessLat: lat,
    guessLng: lng,
    distanceKm: distKm,
    baseScore,
    cluePenalty: GameState.cluePenalty,
    score: roundScore,
    locationName,
    cluesUsed: [...GameState.cluesRevealed],
  };
  GameState.roundResults.push(result);

  // Sync to multiplayer room
  if (GameState.isMultiplayer && MP.roomCode) {
    MP.updateRoundScore(GameState.currentRound, roundScore).catch(() => {});
    updateMPLeaderboard();
  }

  showRoundResult(result);
}

function skipGuess() { submitGuess(null, null); }

function advanceRound() {
  const next = GameState.currentRound + 1;
  const hasMoreFixed = !GameState.isEndless && next >= GameState.rounds;
  if (hasMoreFixed) {
    endGame();
  } else {
    startRound(next);
  }
}

function endGameEarly() { endGame(); }

function endGame() {
  destroyViewer();
  stopTimer();
  const totalScore = GameState.roundResults.reduce((s, r) => s + r.score, 0);
  const maxScore = GameState.roundResults.length * 5000;

  if (GameState.isMultiplayer && MP.roomCode) {
    MP.markDone(totalScore).catch(() => {});
    MP.stopListening();
  }

  if (!GameState.isBattle && !GameState.isMultiplayer) {
    saveScore(GameState.mode, GameState.subMode, totalScore, maxScore, GameState.roundResults);
  }

  showGameOver(totalScore, maxScore);
}

// ── Timer ─────────────────────────────────────────────────

function startTimer() {
  stopTimer();
  if (!GameState.timerSeconds) { UI.setTimer(null); return; }
  GameState.timeLeft = GameState.timerSeconds;
  UI.setTimer(GameState.timeLeft);
  GameState.timerInterval = setInterval(() => {
    GameState.timeLeft -= 1;
    UI.setTimer(GameState.timeLeft);
    if (GameState.timeLeft <= 0) {
      stopTimer();
      submitGuess(getGuessLatLng()?.lat ?? null, getGuessLatLng()?.lng ?? null);
    }
  }, 1000);
}

function stopTimer() {
  if (GameState.timerInterval) { clearInterval(GameState.timerInterval); GameState.timerInterval = null; }
}

// ── Header ────────────────────────────────────────────────

function updateGameHeader() {
  if (GameState.isEndless) {
    document.getElementById('round-current').textContent = GameState.currentRound + 1;
    document.getElementById('round-total').textContent = '∞';
  } else {
    document.getElementById('round-current').textContent = GameState.currentRound + 1;
    document.getElementById('round-total').textContent = GameState.rounds;
  }
  const totalSoFar = GameState.roundResults.reduce((s, r) => s + r.score, 0);
  document.getElementById('game-score-display').textContent = totalSoFar.toLocaleString();
}
