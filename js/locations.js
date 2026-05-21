// Each area: { name, bbox:[west,south,east,north], weight }
const LOCATIONS = {
  world: {
    name: 'World',
    icon: '🌍',
    desc: 'Random locations worldwide',
    areas: [
      { name: 'Western Europe',   bbox: [-10, 36, 20, 58],  weight: 18 },
      { name: 'Eastern Europe',   bbox: [ 15, 44, 40, 62],  weight: 9 },
      { name: 'Scandinavia',      bbox: [  4, 55, 32, 72],  weight: 5 },
      { name: 'Russia (West)',    bbox: [ 30, 50, 70, 65],  weight: 5 },
      { name: 'Russia (Far East)',bbox: [ 90, 42,135, 68],  weight: 3 },
      { name: 'United States',    bbox: [-125, 25, -65, 50], weight: 22 },
      { name: 'Canada',           bbox: [-140, 43, -52, 70], weight: 5 },
      { name: 'Mexico',           bbox: [ -118, 14, -86, 33], weight: 4 },
      { name: 'Brazil',           bbox: [ -75,-34,  -35,  5], weight: 10 },
      { name: 'Argentina/Chile',  bbox: [ -76,-56,  -53,-17], weight: 5 },
      { name: 'Colombia/Peru',    bbox: [ -82,-18,  -65, 12], weight: 4 },
      { name: 'Japan',            bbox: [ 129, 31, 145, 46], weight: 12 },
      { name: 'South Korea',      bbox: [ 126, 34, 130, 38], weight: 8 },
      { name: 'China',            bbox: [  98, 20, 135, 54], weight: 6 },
      { name: 'Thailand',         bbox: [  97,  5, 106, 21], weight: 6 },
      { name: 'Indonesia',        bbox: [  95,-10, 141,  6], weight: 4 },
      { name: 'India',            bbox: [  68,  8,  97, 36], weight: 8 },
      { name: 'Turkey',           bbox: [  26, 36,  44, 42], weight: 6 },
      { name: 'Israel/Palestine', bbox: [  34, 29,  36, 33], weight: 4 },
      { name: 'South Africa',     bbox: [  16,-35,  33,-22], weight: 7 },
      { name: 'Kenya/Tanzania',   bbox: [  33, -8,  42,  5], weight: 5 },
      { name: 'Nigeria/Ghana',    bbox: [  -3,  4,  15, 14], weight: 4 },
      { name: 'Morocco/Tunisia',  bbox: [ -14, 29,  13, 38], weight: 3 },
      { name: 'Australia',        bbox: [ 113,-44, 154,-10], weight: 9 },
      { name: 'New Zealand',      bbox: [ 166,-47, 178,-34], weight: 6 },
    ],
  },

  continent: {
    EU: {
      name: 'Europe', icon: '🇪🇺', desc: 'Across Europe',
      areas: [
        { name: 'Western Europe',  bbox: [-10, 36, 20, 58],  weight: 20 },
        { name: 'Eastern Europe',  bbox: [ 15, 44, 40, 62],  weight: 12 },
        { name: 'Scandinavia',     bbox: [  4, 55, 32, 72],  weight: 8 },
        { name: 'Iberia',          bbox: [ -9, 35,  5, 44],  weight: 10 },
        { name: 'Balkans',         bbox: [ 13, 39, 29, 47],  weight: 8 },
        { name: 'UK & Ireland',    bbox: [-11, 49,  2, 61],  weight: 12 },
      ],
    },
    NA: {
      name: 'North America', icon: '🌎', desc: 'North America',
      areas: [
        { name: 'United States', bbox: [-125, 25, -65, 50], weight: 22 },
        { name: 'Canada',        bbox: [-140, 43, -52, 70], weight: 8 },
        { name: 'Mexico',        bbox: [-118, 14, -86, 33], weight: 10 },
      ],
    },
    SA: {
      name: 'South America', icon: '🌎', desc: 'South America',
      areas: [
        { name: 'Brazil',          bbox: [-75,-34,-35,  5], weight: 16 },
        { name: 'Argentina/Chile', bbox: [-76,-56,-53,-17], weight: 10 },
        { name: 'Colombia/Peru',   bbox: [-82,-18,-65, 12], weight: 8 },
        { name: 'Bolivia/Ecuador', bbox: [-82,-22,-60,  2], weight: 6 },
      ],
    },
    AS: {
      name: 'Asia', icon: '🌏', desc: 'Across Asia',
      areas: [
        { name: 'Japan',         bbox: [129, 31,145, 46], weight: 15 },
        { name: 'South Korea',   bbox: [126, 34,130, 38], weight: 10 },
        { name: 'China',         bbox: [ 98, 20,135, 54], weight: 8 },
        { name: 'India',         bbox: [ 68,  8, 97, 36], weight: 10 },
        { name: 'Thailand',      bbox: [ 97,  5,106, 21], weight: 8 },
        { name: 'Indonesia',     bbox: [ 95,-10,141,  6], weight: 5 },
        { name: 'Turkey',        bbox: [ 26, 36, 44, 42], weight: 8 },
        { name: 'Russia (East)', bbox: [ 90, 42,135, 68], weight: 4 },
      ],
    },
    AF: {
      name: 'Africa', icon: '🌍', desc: 'Across Africa',
      areas: [
        { name: 'South Africa',   bbox: [ 16,-35, 33,-22], weight: 18 },
        { name: 'Kenya/Tanzania', bbox: [ 33, -8, 42,  5], weight: 12 },
        { name: 'Nigeria/Ghana',  bbox: [ -3,  4, 15, 14], weight: 8 },
        { name: 'Morocco',        bbox: [-14, 29,  0, 36], weight: 10 },
        { name: 'Egypt',          bbox: [ 24, 22, 37, 32], weight: 8 },
      ],
    },
    OC: {
      name: 'Oceania', icon: '🌏', desc: 'Oceania',
      areas: [
        { name: 'Australia',    bbox: [113,-44,154,-10], weight: 18 },
        { name: 'New Zealand',  bbox: [166,-47,178,-34], weight: 12 },
      ],
    },
  },

  country: {
    US: { name: 'United States', flag: '🇺🇸', bbox: [-125, 25, -65, 50] },
    GB: { name: 'United Kingdom', flag: '🇬🇧', bbox: [-11, 49,  2, 61] },
    JP: { name: 'Japan', flag: '🇯🇵', bbox: [129, 31, 145, 46] },
    FR: { name: 'France', flag: '🇫🇷', bbox: [-5, 41, 10, 51] },
    DE: { name: 'Germany', flag: '🇩🇪', bbox: [5, 47, 16, 55] },
    AU: { name: 'Australia', flag: '🇦🇺', bbox: [113, -44, 154, -10] },
    BR: { name: 'Brazil', flag: '🇧🇷', bbox: [-75, -34, -35, 5] },
    IN: { name: 'India', flag: '🇮🇳', bbox: [68, 8, 97, 36] },
    KR: { name: 'South Korea', flag: '🇰🇷', bbox: [126, 34, 130, 38] },
    ZA: { name: 'South Africa', flag: '🇿🇦', bbox: [16, -35, 33, -22] },
    TR: { name: 'Turkey', flag: '🇹🇷', bbox: [26, 36, 44, 42] },
    MX: { name: 'Mexico', flag: '🇲🇽', bbox: [-118, 14, -86, 33] },
    NZ: { name: 'New Zealand', flag: '🇳🇿', bbox: [166, -47, 178, -34] },
    IT: { name: 'Italy', flag: '🇮🇹', bbox: [6, 37, 18, 47] },
    ES: { name: 'Spain', flag: '🇪🇸', bbox: [-9, 35, 5, 44] },
    CA: { name: 'Canada', flag: '🇨🇦', bbox: [-140, 43, -52, 70] },
    TH: { name: 'Thailand', flag: '🇹🇭', bbox: [97, 5, 106, 21] },
    AR: { name: 'Argentina', flag: '🇦🇷', bbox: [-74, -56, -53, -21] },
    KE: { name: 'Kenya', flag: '🇰🇪', bbox: [33, -5, 42, 5] },
    NO: { name: 'Norway', flag: '🇳🇴', bbox: [4, 57, 32, 72] },
    SE: { name: 'Sweden', flag: '🇸🇪', bbox: [10, 55, 25, 70] },
    PL: { name: 'Poland', flag: '🇵🇱', bbox: [14, 49, 24, 55] },
    RU: { name: 'Russia', flag: '🇷🇺', bbox: [30, 50, 100, 75] },
    ID: { name: 'Indonesia', flag: '🇮🇩', bbox: [95, -10, 141, 6] },
    NL: { name: 'Netherlands', flag: '🇳🇱', bbox: [3, 50, 8, 54] },
    CH: { name: 'Switzerland', flag: '🇨🇭', bbox: [5, 45, 11, 48] },
    PT: { name: 'Portugal', flag: '🇵🇹', bbox: [-10, 36, -6, 42] },
    CL: { name: 'Chile', flag: '🇨🇱', bbox: [-76, -56, -65, -17] },
    CO: { name: 'Colombia', flag: '🇨🇴', bbox: [-79, -5, -66, 13] },
    GH: { name: 'Ghana', flag: '🇬🇭', bbox: [-4, 4, 2, 12] },
    NG: { name: 'Nigeria', flag: '🇳🇬', bbox: [2, 4, 15, 14] },
    EG: { name: 'Egypt', flag: '🇪🇬', bbox: [24, 22, 37, 32] },
    IL: { name: 'Israel', flag: '🇮🇱', bbox: [34, 29, 36, 34] },
  },

  famous: {
    name: 'Famous Places',
    icon: '⭐',
    desc: 'Iconic landmarks worldwide',
    places: [
      { name: 'Eiffel Tower, Paris',        lat: 48.858,  lng: 2.295,   bbox: [2.27, 48.84, 2.32, 48.87] },
      { name: 'Times Square, NYC',           lat: 40.758,  lng: -73.985, bbox: [-74.00, 40.75, -73.97, 40.77] },
      { name: 'Tokyo Shibuya Crossing',      lat: 35.659,  lng: 139.700, bbox: [139.69, 35.65, 139.71, 35.67] },
      { name: 'Colosseum, Rome',             lat: 41.890,  lng: 12.492,  bbox: [12.48, 41.88, 12.50, 41.90] },
      { name: 'Big Ben, London',             lat: 51.501,  lng: -0.125,  bbox: [-0.14, 51.49, -0.11, 51.51] },
      { name: 'Sagrada Família, Barcelona',  lat: 41.404,  lng: 2.174,   bbox: [2.16, 41.39, 2.19, 41.42] },
      { name: 'Sydney Opera House',          lat: -33.857, lng: 151.215, bbox: [151.20, -33.87, 151.23, -33.85] },
      { name: 'Santorini, Greece',           lat: 36.393,  lng: 25.461,  bbox: [25.38, 36.36, 25.49, 36.46] },
      { name: 'Acropolis, Athens',           lat: 37.971,  lng: 23.726,  bbox: [23.71, 37.96, 23.74, 37.98] },
      { name: 'Golden Gate Bridge',          lat: 37.819,  lng: -122.479, bbox: [-122.49, 37.81, -122.46, 37.83] },
      { name: 'Amsterdam Canals',            lat: 52.374,  lng: 4.895,   bbox: [4.87, 52.36, 4.92, 52.39] },
      { name: 'Prague Old Town',             lat: 50.087,  lng: 14.421,  bbox: [14.40, 50.08, 14.44, 50.10] },
      { name: 'Budapest Parliament',         lat: 47.507,  lng: 19.046,  bbox: [19.03, 47.49, 19.06, 47.52] },
      { name: 'Kyoto, Japan',                lat: 35.011,  lng: 135.768, bbox: [135.74, 35.00, 135.80, 35.02] },
      { name: 'Ha Long Bay, Vietnam',        lat: 20.910,  lng: 107.184, bbox: [107.16, 20.88, 107.22, 20.95] },
      { name: 'Cape Town Waterfront',        lat: -33.902, lng: 18.423,  bbox: [18.41, -33.91, 18.44, -33.89] },
      { name: 'Cusco, Peru',                 lat: -13.531, lng: -71.967, bbox: [-71.99, -13.55, -71.94, -13.51] },
      { name: 'Istanbul Sultanahmet',        lat: 41.005,  lng: 28.977,  bbox: [28.96, 40.99, 28.99, 41.02] },
      { name: 'Marrakech Medina',            lat: 31.630,  lng: -7.990,  bbox: [-8.01, 31.62, -7.97, 31.64] },
      { name: 'Vancouver, Canada',           lat: 49.283,  lng: -123.117, bbox: [-123.15, 49.27, -123.09, 49.30] },
      { name: 'Dubai Marina',                lat: 25.078,  lng: 55.139,  bbox: [55.12, 25.06, 55.16, 25.10] },
      { name: 'Singapore Marina Bay',        lat:  1.284,  lng: 103.861, bbox: [103.84, 1.27, 103.88, 1.30] },
      { name: 'Rio de Janeiro Copacabana',   lat: -22.971, lng: -43.182, bbox: [-43.20, -22.98, -43.17, -22.96] },
      { name: 'Queenstown, New Zealand',     lat: -45.031, lng: 168.662, bbox: [168.64, -45.05, 168.69, -45.01] },
      { name: 'Reykjavik, Iceland',          lat: 64.135,  lng: -21.895, bbox: [-21.93, 64.12, -21.86, 64.15] },
    ],
  },
};

function getWeightedRandomArea(areas) {
  const totalWeight = areas.reduce((s, a) => s + a.weight, 0);
  let r = Math.random() * totalWeight;
  for (const area of areas) {
    r -= area.weight;
    if (r <= 0) return area;
  }
  return areas[areas.length - 1];
}

function getRandomSubBbox(bbox, size) {
  const [west, south, east, north] = bbox;
  const lngRange = Math.max(0, east - west - size);
  const latRange = Math.max(0, north - south - size);
  const lng = west + Math.random() * lngRange;
  const lat = south + Math.random() * latRange;
  return [lng, lat, lng + size, lat + size];
}

function getSearchBbox(mode, subMode) {
  if (mode === 'world') {
    const area = getWeightedRandomArea(LOCATIONS.world.areas);
    return { bbox: getRandomSubBbox(area.bbox, CONFIG.bboxSize), areaName: area.name };
  }
  if (mode === 'continent') {
    const contDef = LOCATIONS.continent[subMode];
    if (!contDef) throw new Error('Unknown continent: ' + subMode);
    const area = getWeightedRandomArea(contDef.areas);
    return { bbox: getRandomSubBbox(area.bbox, CONFIG.bboxSize), areaName: area.name };
  }
  if (mode === 'country') {
    const countryDef = LOCATIONS.country[subMode];
    if (!countryDef) throw new Error('Unknown country: ' + subMode);
    return { bbox: getRandomSubBbox(countryDef.bbox, CONFIG.bboxSize), areaName: countryDef.name };
  }
  if (mode === 'famous') {
    const places = LOCATIONS.famous.places;
    const place = places[Math.floor(Math.random() * places.length)];
    return { bbox: place.bbox, areaName: place.name, placeName: place.name };
  }
  throw new Error('Unknown mode: ' + mode);
}
