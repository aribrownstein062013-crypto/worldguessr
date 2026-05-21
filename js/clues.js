// Countries that drive on the LEFT (ISO 3166-1 alpha-2)
const LEFT_HAND_TRAFFIC = new Set([
  'AG','AI','AU','BB','BM','BN','BT','BW','CY','FK','GD','GG','GY',
  'HK','ID','IE','IM','IN','JE','JM','JP','KE','KN','KY','KI','LC',
  'LK','LS','MO','MS','MT','MU','MV','MW','MY','MZ','NA','NP','NZ',
  'PG','PK','SC','SB','SG','SH','SZ','TC','TH','TO','TT','TV','TZ',
  'UG','VC','VG','WS','ZA','ZM','ZW','GB',
]);

// Country code → primary script family
const SCRIPT_BY_COUNTRY = {
  // Latin
  US:'Latin', CA:'Latin', GB:'Latin', AU:'Latin', NZ:'Latin', IE:'Latin',
  FR:'Latin', DE:'Latin', ES:'Latin', IT:'Latin', PT:'Latin', NL:'Latin',
  BE:'Latin', CH:'Latin', AT:'Latin', SE:'Latin', NO:'Latin', DK:'Latin',
  FI:'Latin', PL:'Latin', CZ:'Latin', SK:'Latin', HU:'Latin', RO:'Latin',
  HR:'Latin', SI:'Latin', MX:'Latin', BR:'Latin', AR:'Latin', CL:'Latin',
  CO:'Latin', PE:'Latin', VE:'Latin', EC:'Latin', BO:'Latin', PY:'Latin',
  UY:'Latin', ZA:'Latin', NG:'Latin', GH:'Latin', KE:'Latin', TZ:'Latin',
  UG:'Latin', MZ:'Latin', ZW:'Latin', ZM:'Latin', MW:'Latin', BW:'Latin',
  NA:'Latin', TH:'Latin', ID:'Latin', PH:'Latin', MY:'Latin', VN:'Latin',
  TR:'Latin', AZ:'Latin', UZ:'Latin', TM:'Latin', KZ:'Latin',
  // Cyrillic
  RU:'Cyrillic', UA:'Cyrillic', BY:'Cyrillic', BG:'Cyrillic', RS:'Cyrillic',
  MK:'Cyrillic', ME:'Cyrillic', BA:'Cyrillic', MN:'Cyrillic', KG:'Cyrillic',
  TJ:'Cyrillic',
  // Arabic / Perso-Arabic
  SA:'Arabic', AE:'Arabic', EG:'Arabic', MA:'Arabic', DZ:'Arabic',
  TN:'Arabic', LY:'Arabic', IQ:'Arabic', SY:'Arabic', JO:'Arabic',
  LB:'Arabic', YE:'Arabic', OM:'Arabic', QA:'Arabic', BH:'Arabic',
  KW:'Arabic', IR:'Arabic (Perso-Arabic)', PK:'Arabic (Urdu)',
  // Devanagari
  IN:'Devanagari (Hindi/regional)', NP:'Devanagari',
  // East Asian
  CN:'Chinese characters', TW:'Chinese characters', HK:'Chinese characters',
  MO:'Chinese characters',
  JP:'Japanese (Kanji + Kana)',
  KR:'Hangul (Korean)',
  // Other
  GR:'Greek', CY:'Greek', IL:'Hebrew', GE:'Georgian', AM:'Armenian',
  ET:'Ethiopic (Amharic)', ER:'Ethiopic',
  TH:'Thai script', KH:'Khmer', MM:'Myanmar script', LK:'Sinhala',
  IN:'Devanagari / regional scripts',
};

// Rough Köppen climate zone from lat, lng, and month
function getClimateZone(lat, lng, month) {
  const absLat = Math.abs(lat);
  // Polar
  if (absLat > 66) return 'Polar / Tundra';
  // Tropical band
  if (absLat < 15) {
    // Rough monsoon vs rainforest check
    if (absLat < 5) return 'Tropical Rainforest';
    return 'Tropical / Monsoon';
  }
  // Desert / arid check (very rough by known arid regions)
  const isArid =
    (lat > 15 && lat < 35 && lng > -20 && lng < 60) || // Sahara / Arabian
    (lat > 20 && lat < 35 && lng > 90 && lng < 110) || // Thar / central Asia
    (lat < -15 && lat > -35 && lng > 10 && lng < 30) || // Namib / Kalahari
    (lat > 30 && lat < 50 && lng > 50 && lng < 80) ||  // Central Asia
    (lat < -15 && lat > -45 && lng > -75 && lng < -65); // Atacama
  if (isArid) return 'Arid / Desert';
  // Mediterranean (subtropical dry summer)
  const isMed =
    (absLat > 30 && absLat < 45 && (lng > -10 && lng < 45)) ||
    (lat < -30 && lat > -40 && (lng > 110 || (lng > -75 && lng < -65)));
  if (isMed) return 'Mediterranean / Subtropical';
  // Temperate
  if (absLat < 55) return 'Temperate / Continental';
  return 'Subarctic / Boreal';
}

const CLUE_DEFS = [
  { id: 'hemisphere',   label: 'Hemisphere',       cost: 0, icon: '🌐' },
  { id: 'driving_side', label: 'Driving Side',      cost: 0, icon: '🚗' },
  { id: 'climate',      label: 'Climate Zone',      cost: 0, icon: '🌤️' },
  { id: 'language',     label: 'Language / Script', cost: 0, icon: '✍️' },
  { id: 'continent',    label: 'Continent',         cost: 0, icon: '🗺️' },
  { id: 'country',      label: 'Country',           cost: 0, icon: '🏳️' },
];

const COUNTRY_TO_CONTINENT = {
  // North America
  US:'North America', CA:'North America', MX:'North America', GT:'North America',
  BZ:'North America', HN:'North America', SV:'North America', NI:'North America',
  CR:'North America', PA:'North America', CU:'North America', JM:'North America',
  HT:'North America', DO:'North America', TT:'North America', BB:'North America',
  // South America
  BR:'South America', AR:'South America', CL:'South America', CO:'South America',
  VE:'South America', PE:'South America', EC:'South America', BO:'South America',
  PY:'South America', UY:'South America', GY:'South America', SR:'South America',
  // Europe
  GB:'Europe', IE:'Europe', FR:'Europe', DE:'Europe', IT:'Europe', ES:'Europe',
  PT:'Europe', NL:'Europe', BE:'Europe', CH:'Europe', AT:'Europe', SE:'Europe',
  NO:'Europe', DK:'Europe', FI:'Europe', PL:'Europe', CZ:'Europe', SK:'Europe',
  HU:'Europe', RO:'Europe', BG:'Europe', GR:'Europe', HR:'Europe', SI:'Europe',
  RS:'Europe', BA:'Europe', ME:'Europe', MK:'Europe', AL:'Europe', XK:'Europe',
  UA:'Europe', BY:'Europe', MD:'Europe', LT:'Europe', LV:'Europe', EE:'Europe',
  RU:'Europe/Asia', CY:'Europe', MT:'Europe', LU:'Europe', LI:'Europe',
  // Africa
  ZA:'Africa', NG:'Africa', KE:'Africa', TZ:'Africa', EG:'Africa', MA:'Africa',
  DZ:'Africa', TN:'Africa', LY:'Africa', ET:'Africa', GH:'Africa', CI:'Africa',
  CM:'Africa', MZ:'Africa', ZW:'Africa', ZM:'Africa', MW:'Africa', BW:'Africa',
  NA:'Africa', SN:'Africa', UG:'Africa', AO:'Africa', MG:'Africa', RW:'Africa',
  // Asia
  CN:'Asia', JP:'Asia', KR:'Asia', IN:'Asia', ID:'Asia', TH:'Asia', VN:'Asia',
  PH:'Asia', MY:'Asia', SG:'Asia', MM:'Asia', KH:'Asia', LA:'Asia', BD:'Asia',
  NP:'Asia', LK:'Asia', PK:'Asia', AF:'Asia', IR:'Asia', IQ:'Asia', SY:'Asia',
  JO:'Asia', LB:'Asia', IL:'Asia', PS:'Asia', SA:'Asia', AE:'Asia', QA:'Asia',
  KW:'Asia', BH:'Asia', OM:'Asia', YE:'Asia', TR:'Asia', GE:'Asia', AM:'Asia',
  AZ:'Asia', KZ:'Asia', UZ:'Asia', TM:'Asia', TJ:'Asia', KG:'Asia', MN:'Asia',
  TW:'Asia', HK:'Asia', MO:'Asia', BN:'Asia', TL:'Asia',
  // Oceania
  AU:'Oceania', NZ:'Oceania', PG:'Oceania', FJ:'Oceania', SB:'Oceania',
  VU:'Oceania', WS:'Oceania', TO:'Oceania', FM:'Oceania', PW:'Oceania',
  MH:'Oceania', NR:'Oceania', KI:'Oceania', TV:'Oceania',
};

function buildClueText(clueId, locationInfo) {
  const { lat, lng, countryCode, countryName } = locationInfo;
  switch (clueId) {
    case 'hemisphere':
      return lat >= 0 ? 'Northern Hemisphere' : 'Southern Hemisphere';
    case 'driving_side':
      return LEFT_HAND_TRAFFIC.has(countryCode)
        ? 'Drive on the LEFT side of the road'
        : 'Drive on the RIGHT side of the road';
    case 'climate': {
      const month = new Date().getMonth() + 1;
      return `Climate: ${getClimateZone(lat, lng, month)}`;
    }
    case 'language': {
      const script = SCRIPT_BY_COUNTRY[countryCode] || 'Latin / regional';
      return `Primary script: ${script}`;
    }
    case 'continent': {
      const cont = COUNTRY_TO_CONTINENT[countryCode] || 'Unknown';
      return `Continent: ${cont}`;
    }
    case 'country':
      return `Country: ${countryName || 'Unknown'}`;
    default:
      return 'Unknown clue';
  }
}

function getClueCost(clueId) {
  return CLUE_DEFS.find(c => c.id === clueId)?.cost ?? 0;
}

function getClueIcon(clueId) {
  return CLUE_DEFS.find(c => c.id === clueId)?.icon ?? '❓';
}
