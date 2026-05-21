const CONFIG = {
  mapillaryGraphUrl: 'https://graph.mapillary.com',
  nominatimUrl: 'https://nominatim.openstreetmap.org/reverse',
  defaultRounds: 5,
  defaultTimerSeconds: 120,
  maxRetries: 12,
  bboxSize: 0.099,  // Mapillary max area = 0.010 sq°; 0.099×0.099 = 0.0098
  version: '1.1.0',

  get mapillaryToken() { return localStorage.getItem('wg_mapillary_token') || 'MLY|27276881368646318|2a63237a003ca7358d490d56d15b4cbe'; },
  set mapillaryToken(v) { localStorage.setItem('wg_mapillary_token', v); },

  get anthropicKey() { return localStorage.getItem('wg_anthropic_key') || ''; },
  set anthropicKey(v) { localStorage.setItem('wg_anthropic_key', v); },

  get firebaseUrl() { return localStorage.getItem('wg_firebase_url') || ''; },
  set firebaseUrl(v) { localStorage.setItem('wg_firebase_url', v); },
};
