// Firebase Realtime Database REST API — no SDK needed.
// Users need to create a free Firebase project, enable Realtime Database,
// and set rules to: { "rules": { ".read": true, ".write": true } }
const MP = {
  roomCode: null,
  playerId: null,
  playerName: 'Player',
  isHost: false,
  _eventSource: null,
  _onPlayersUpdate: null,

  get baseUrl() {
    return (CONFIG.firebaseUrl || '').replace(/\/$/, '');
  },

  _pid() {
    let id = sessionStorage.getItem('wg_player_id');
    if (!id) { id = 'p' + Math.random().toString(36).slice(2, 10); sessionStorage.setItem('wg_player_id', id); }
    return id;
  },

  async _get(path) {
    if (!this.baseUrl) throw new Error('NO_FIREBASE');
    const res = await fetch(`${this.baseUrl}/${path}.json`);
    if (!res.ok) throw new Error(`Firebase error ${res.status}`);
    return res.json();
  },

  async _put(path, data) {
    if (!this.baseUrl) throw new Error('NO_FIREBASE');
    const res = await fetch(`${this.baseUrl}/${path}.json`, {
      method: 'PUT', body: JSON.stringify(data),
      headers: { 'Content-Type': 'application/json' },
    });
    if (!res.ok) throw new Error(`Firebase error ${res.status}`);
    return res.json();
  },

  async _patch(path, data) {
    if (!this.baseUrl) throw new Error('NO_FIREBASE');
    const res = await fetch(`${this.baseUrl}/${path}.json`, {
      method: 'PATCH', body: JSON.stringify(data),
      headers: { 'Content-Type': 'application/json' },
    });
    if (!res.ok) throw new Error(`Firebase error ${res.status}`);
    return res.json();
  },

  async _codeExists(code) {
    const val = await this._get(`rooms/${code}/state`);
    return val !== null;
  },

  async _generateCode() {
    for (let i = 0; i < 15; i++) {
      const code = String(Math.floor(10000 + Math.random() * 90000));
      if (!(await this._codeExists(code))) return code;
    }
    throw new Error('Could not generate a unique room code. Try again.');
  },

  async createRoom(imageIds, options) {
    const code = await this._generateCode();
    this.roomCode = code;
    this.playerId = this._pid();
    this.playerName = options.playerName || 'Host';
    this.isHost = true;

    await this._put(`rooms/${code}`, {
      host: this.playerId,
      mode: options.mode,
      subMode: options.subMode || null,
      rounds: options.rounds,
      timerSeconds: options.timerSeconds,
      imageIds,
      state: 'playing',
      created: Date.now(),
      players: {
        [this.playerId]: {
          name: this.playerName,
          isHost: true,
          roundScores: {},
          totalScore: 0,
          currentRound: 0,
          done: false,
        },
      },
    });

    // Auto-clean stale rooms older than 12h (best-effort)
    this._scheduleCleanup(code);
    return code;
  },

  async joinRoom(code, playerName) {
    const room = await this._get(`rooms/${code}`);
    if (!room) throw new Error('Room not found. Check the code and try again.');
    if (room.state === 'finished') throw new Error('That game is already finished.');

    this.roomCode = code;
    this.playerId = this._pid();
    this.playerName = playerName || 'Player';
    this.isHost = false;

    await this._put(`rooms/${code}/players/${this.playerId}`, {
      name: this.playerName,
      isHost: false,
      roundScores: {},
      totalScore: 0,
      currentRound: 0,
      done: false,
    });
    return room;
  },

  async updateRoundScore(roundIndex, score) {
    if (!this.roomCode || !this.playerId) return;
    const path = `rooms/${this.roomCode}/players/${this.playerId}`;
    const current = await this._get(`${path}/roundScores`) || {};
    current[roundIndex] = score;
    const total = Object.values(current).reduce((s, v) => s + v, 0);
    await this._patch(path, { roundScores: current, totalScore: total, currentRound: roundIndex + 1 });
  },

  async markDone(totalScore) {
    if (!this.roomCode || !this.playerId) return;
    await this._patch(`rooms/${this.roomCode}/players/${this.playerId}`, {
      done: true, totalScore,
    });
  },

  listenToPlayers(callback) {
    if (!this.roomCode || !this.baseUrl) return;
    this.stopListening();
    this._onPlayersUpdate = callback;
    const url = `${this.baseUrl}/rooms/${this.roomCode}/players.json`;
    const es = new EventSource(url);
    const handle = (e) => {
      try {
        const msg = JSON.parse(e.data);
        if (msg.data) callback(msg.data);
      } catch {}
    };
    es.addEventListener('put', handle);
    es.addEventListener('patch', handle);
    es.onerror = () => {}; // silently ignore disconnects
    this._eventSource = es;
  },

  stopListening() {
    if (this._eventSource) { this._eventSource.close(); this._eventSource = null; }
  },

  reset() {
    this.stopListening();
    this.roomCode = null;
    this.isHost = false;
    // Don't reset playerId — persists in sessionStorage
  },

  _scheduleCleanup(code) {
    setTimeout(async () => {
      try { await this._put(`rooms/${code}/state`, 'finished'); } catch {}
    }, 12 * 60 * 60 * 1000);
  },
};
