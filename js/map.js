let _guessMap = null;
let _guessMarker = null;
let _resultMap = null;
let _gameoverMap = null;

const DARK_TILE = 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png';
const DARK_ATTR = '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> © <a href="https://carto.com/">CARTO</a>';

function makeIcon(color, label) {
  return L.divIcon({
    className: '',
    html: `<div class="map-pin" style="background:${color}">${label || ''}</div>`,
    iconSize: [28, 28],
    iconAnchor: [14, 28],
    popupAnchor: [0, -30],
  });
}

function initGuessMap(containerId, onGuessChange) {
  destroyGuessMap();
  const map = L.map(containerId, {
    zoomControl: true,
    attributionControl: false,
    worldCopyJump: false,
    maxBounds: [[-90, -180], [90, 180]],
    minZoom: 1,
  });
  map.setView([20, 0], 2);
  L.tileLayer(DARK_TILE, { attribution: DARK_ATTR, subdomains: 'abcd', maxZoom: 19 }).addTo(map);
  L.control.attribution({ prefix: false }).addTo(map);

  map.on('click', (e) => {
    const { lat, lng } = e.latlng;
    if (_guessMarker) {
      _guessMarker.setLatLng([lat, lng]);
    } else {
      _guessMarker = L.marker([lat, lng], { icon: makeIcon('#6c63ff', '?'), draggable: true }).addTo(map);
      _guessMarker.on('dragend', () => {
        if (onGuessChange) onGuessChange(_guessMarker.getLatLng());
      });
    }
    if (onGuessChange) onGuessChange({ lat, lng });
  });
  _guessMap = map;
  return map;
}

function clearGuessMarker() {
  if (_guessMarker && _guessMap) {
    _guessMap.removeLayer(_guessMarker);
    _guessMarker = null;
  }
}

function getGuessLatLng() {
  if (!_guessMarker) return null;
  const ll = _guessMarker.getLatLng();
  return { lat: ll.lat, lng: ll.lng };
}

function destroyGuessMap() {
  clearGuessMarker();
  if (_guessMap) {
    _guessMap.remove();
    _guessMap = null;
  }
}

function invalidateGuessMap() {
  if (_guessMap) setTimeout(() => _guessMap.invalidateSize(), 100);
}

function initResultMap(containerId, guessLatLng, actualLatLng, locationName) {
  if (_resultMap) { _resultMap.remove(); _resultMap = null; }
  const map = L.map(containerId, { zoomControl: true, attributionControl: false });
  L.tileLayer(DARK_TILE, { attribution: DARK_ATTR, subdomains: 'abcd', maxZoom: 19 }).addTo(map);

  const actualPin = L.marker([actualLatLng.lat, actualLatLng.lng], {
    icon: makeIcon('#6eff9c', '★'),
  }).addTo(map).bindPopup(`<b>Actual:</b> ${locationName || 'Unknown'}`).openPopup();

  let points = [[actualLatLng.lat, actualLatLng.lng]];

  if (guessLatLng) {
    L.marker([guessLatLng.lat, guessLatLng.lng], {
      icon: makeIcon('#6c63ff', '⊕'),
    }).addTo(map).bindPopup('<b>Your guess</b>');

    L.polyline(
      [[guessLatLng.lat, guessLatLng.lng], [actualLatLng.lat, actualLatLng.lng]],
      { color: '#ffd700', weight: 2, dashArray: '6 4', opacity: 0.8 }
    ).addTo(map);
    points.push([guessLatLng.lat, guessLatLng.lng]);
  }

  const bounds = L.latLngBounds(points).pad(0.3);
  map.fitBounds(bounds);
  _resultMap = map;
  return map;
}

function initGameOverMap(containerId, roundResults) {
  if (_gameoverMap) { _gameoverMap.remove(); _gameoverMap = null; }
  const map = L.map(containerId, { zoomControl: true, attributionControl: false });
  L.tileLayer(DARK_TILE, { attribution: DARK_ATTR, subdomains: 'abcd', maxZoom: 19 }).addTo(map);

  const allPoints = [];
  roundResults.forEach((r, i) => {
    if (!r.actualLat) return;
    const num = String(i + 1);
    L.marker([r.actualLat, r.actualLng], { icon: makeIcon('#6eff9c', num) })
      .addTo(map).bindPopup(`<b>Round ${num} — Actual</b><br>${r.locationName || ''}`);
    allPoints.push([r.actualLat, r.actualLng]);
    if (r.guessLat != null) {
      L.marker([r.guessLat, r.guessLng], { icon: makeIcon('#6c63ff', num) })
        .addTo(map).bindPopup(`<b>Round ${num} — Your guess</b>`);
      L.polyline(
        [[r.guessLat, r.guessLng], [r.actualLat, r.actualLng]],
        { color: '#ffd700', weight: 2, dashArray: '5 4', opacity: 0.7 }
      ).addTo(map);
      allPoints.push([r.guessLat, r.guessLng]);
    }
  });

  if (allPoints.length) {
    map.fitBounds(L.latLngBounds(allPoints).pad(0.15));
  } else {
    map.setView([20, 0], 2);
  }
  _gameoverMap = map;
  return map;
}
