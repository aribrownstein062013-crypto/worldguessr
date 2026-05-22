// ── Mapillary (optional — requires token for 360° view) ─────

async function _fetchMapillaryImagesInBbox(bbox, isPano = true) {
  const [west, south, east, north] = bbox;
  const token = CONFIG.mapillaryToken;
  const fields = 'id,thumb_2048_url,thumb_original_url,computed_geometry';
  const params = new URLSearchParams({
    access_token: token, fields,
    bbox: `${west},${south},${east},${north}`,
    limit: '100',
  });
  if (isPano) params.set('is_pano', 'true');
  const res = await fetch(`${CONFIG.mapillaryGraphUrl}/images?${params}`);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error?.message || `Mapillary error ${res.status}`);
  }
  return (await res.json()).data || [];
}

async function _fetchMapillaryImageById(imageId) {
  const token = CONFIG.mapillaryToken;
  const fields = 'id,thumb_2048_url,thumb_original_url,computed_geometry';
  const params = new URLSearchParams({ access_token: token, fields });
  const res = await fetch(`${CONFIG.mapillaryGraphUrl}/${imageId}?${params}`);
  if (!res.ok) throw new Error(`Mapillary error ${res.status}`);
  const img = await res.json();
  const [lng, lat] = img.computed_geometry.coordinates;
  return { ...img, lat, lng };
}

// ── Wikimedia Commons (free, no token needed) ────────────────

async function _getRandomWikimediaImage(mode, subMode) {
  for (let attempt = 0; attempt < CONFIG.maxRetries; attempt++) {
    try {
      const { bbox } = getSearchBbox(mode, subMode);
      const [west, south, east, north] = bbox;
      const lat = south + Math.random() * (north - south);
      const lng = west + Math.random() * (east - west);

      const searchRes = await fetch(
        'https://commons.wikimedia.org/w/api.php?' + new URLSearchParams({
          action: 'query', list: 'geosearch',
          gscoord: `${lat}|${lng}`, gsradius: '10000',
          gslimit: '30', gsnamespace: '6', format: 'json', origin: '*',
        })
      );
      const results = ((await searchRes.json())?.query?.geosearch || [])
        .filter(r => /\.(jpg|jpeg|png)$/i.test(r.title));
      if (!results.length) continue;

      const picked = results[Math.floor(Math.random() * results.length)];
      const infoRes = await fetch(
        'https://commons.wikimedia.org/w/api.php?' + new URLSearchParams({
          action: 'query', titles: picked.title, prop: 'imageinfo',
          iiprop: 'url', iiurlwidth: '1280', format: 'json', origin: '*',
        })
      );
      const thumbUrl = Object.values((await infoRes.json())?.query?.pages || {})[0]
        ?.imageinfo?.[0]?.thumburl;
      if (!thumbUrl) continue;

      return {
        id: `wiki_${picked.pageid}_${picked.lat.toFixed(5)}_${picked.lon.toFixed(5)}`,
        thumb_2048_url: thumbUrl,
        lat: picked.lat,
        lng: picked.lon,
        source: 'wikimedia',
      };
    } catch {}
  }
  throw new Error('No images found for this region. Try a different area.');
}

async function _fetchWikimediaImageById(imageId) {
  // ID format: wiki_{pageId}_{lat}_{lng}
  const parts = imageId.split('_');
  const lat = parseFloat(parts[2]);
  const lng = parseFloat(parts[3]);
  const pageId = parts[1];

  const infoRes = await fetch(
    'https://commons.wikimedia.org/w/api.php?' + new URLSearchParams({
      action: 'query', pageids: pageId, prop: 'imageinfo',
      iiprop: 'url', iiurlwidth: '1280', format: 'json', origin: '*',
    })
  );
  const thumbUrl = Object.values((await infoRes.json())?.query?.pages || {})[0]
    ?.imageinfo?.[0]?.thumburl || null;

  return { id: imageId, thumb_2048_url: thumbUrl, lat, lng, source: 'wikimedia' };
}

// ── Public API ───────────────────────────────────────────────

async function getRandomImageForMode(mode, subMode) {
  const makeAttempt = async () => {
    const { bbox } = getSearchBbox(mode, subMode);
    const pano = await _fetchMapillaryImagesInBbox(bbox, true);
    if (!pano.length) throw new Error('empty');
    const img = pano[Math.floor(Math.random() * pano.length)];
    const [lng, lat] = img.computed_geometry.coordinates;
    return { ...img, lat, lng };
  };
  // Fire 5 parallel attempts per wave; return as soon as any succeeds
  for (let wave = 0; wave < 8; wave++) {
    try {
      return await Promise.any(Array.from({ length: 5 }, makeAttempt));
    } catch {}
  }
  throw new Error('No 360° images found. Try a different region.');
}

// Returns { id, thumb_2048_url, lat, lng } regardless of source
async function fetchImageById(imageId) {
  if (imageId.startsWith('wiki_')) return _fetchWikimediaImageById(imageId);
  return _fetchMapillaryImageById(imageId);
}

async function reverseGeocode(lat, lng) {
  const params = new URLSearchParams({
    lat, lon: lng, format: 'json', zoom: '10',
    'accept-language': 'en',
  });
  const res = await fetch(
    `${CONFIG.nominatimUrl}?${params}`,
    { headers: { 'User-Agent': 'WorldGuessr/1.0 (free-geoguessr-alternative)' } }
  );
  if (!res.ok) return {};
  const json = await res.json();
  const addr = json.address || {};
  const code = (json.address?.country_code || '').toUpperCase();
  return {
    countryCode: code,
    countryName: addr.country || '',
    city: addr.city || addr.town || addr.village || addr.county || '',
    state: addr.state || '',
    displayName: json.display_name || '',
  };
}

async function prefetchGameLocations(mode, subMode, count) {
  const jobs = Array.from({ length: count }, () => getRandomImageForMode(mode, subMode));
  return Promise.all(jobs);
}
