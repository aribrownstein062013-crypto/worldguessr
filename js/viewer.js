let _viewer = null;
let _fallbackMode = false;
let _compassTimer = null;

function initViewer(containerId, imageId) {
  const token = CONFIG.mapillaryToken;
  destroyViewer();
  _fallbackMode = false;

  // Wikimedia images don't use the mapillary viewer
  if (!token || (imageId && imageId.startsWith('wiki_'))) {
    _fallbackMode = true;
    return Promise.reject(new Error(token ? 'WIKIMEDIA_IMAGE' : 'NO_TOKEN'));
  }

  const container = document.getElementById(containerId);
  if (!container) return Promise.reject(new Error('Viewer container not found'));
  container.innerHTML = '';
  _setCompassVisible(true);

  return new Promise((resolve, reject) => {
    try {
      const ViewerClass = (window.mapillary && window.mapillary.Viewer) || window.Viewer;
      if (!ViewerClass) { _fallbackMode = true; return reject(new Error('mapillary-js not loaded')); }
      // RenderMode.Fill = 1 — fills container edge-to-edge, no black bars
      const renderMode = (window.mapillary?.RenderMode?.Fill) ?? 1;
      _viewer = new ViewerClass({
        accessToken: token,
        container: containerId,
        imageId,
        renderMode,
        component: {
          cover: false,
          direction: { maxWidth: 100 },
          sequence: { minWidth: 70 },
          zoom: true,
        },
      });
      let settled = false;
      const onReady = () => {
        if (settled) return;
        settled = true;
        try { _viewer.resize(); } catch {}
        startCompassPolling();
        resolve(_viewer);
      };
      const onError = (e) => {
        if (settled) return;
        settled = true;
        _fallbackMode = true;
        reject(e);
      };
      _viewer.on('load', onReady);   // v3 compat
      _viewer.on('image', onReady);  // v4 fires when image is set
      _viewer.on('dataloaderror', onError);
      // Safety net — resolve after 6s if neither event fires
      setTimeout(() => { if (!settled && _viewer) onReady(); }, 6000);
    } catch (e) { _fallbackMode = true; reject(e); }
  });
}

function showFallbackImage(containerId, thumbUrl, message) {
  const container = document.getElementById(containerId);
  if (!container) return;
  container.innerHTML = '';
  _setCompassVisible(false);

  if (thumbUrl) {
    const wrapper = document.createElement('div');
    wrapper.className = 'fallback-wrapper';
    const img = document.createElement('img');
    img.src = thumbUrl;
    img.className = 'fallback-image';
    img.alt = 'Location photo';
    img.draggable = false;
    wrapper.appendChild(img);
    container.appendChild(wrapper);
    _addPanZoom(wrapper, img);
  } else if (message) {
    const msg = document.createElement('div');
    msg.className = 'viewer-message';
    msg.textContent = message;
    container.appendChild(msg);
  }
}

function _addPanZoom(wrapper, img) {
  let scale = 1, tx = 0, ty = 0;
  let dragging = false, startX, startY, startTx, startTy;

  const clamp = () => {
    if (scale <= 1) { tx = 0; ty = 0; return; }
    const maxTx = (scale - 1) * wrapper.clientWidth / 2;
    const maxTy = (scale - 1) * wrapper.clientHeight / 2;
    tx = Math.max(-maxTx, Math.min(maxTx, tx));
    ty = Math.max(-maxTy, Math.min(maxTy, ty));
  };

  const apply = () => {
    img.style.transform = `translate(${tx}px, ${ty}px) scale(${scale})`;
  };

  wrapper.addEventListener('wheel', e => {
    e.preventDefault();
    scale = Math.max(1, Math.min(5, scale * (e.deltaY > 0 ? 0.9 : 1.1)));
    clamp(); apply();
  }, { passive: false });

  wrapper.addEventListener('mousedown', e => {
    if (e.button !== 0) return;
    dragging = true;
    startX = e.clientX; startY = e.clientY;
    startTx = tx; startTy = ty;
    wrapper.style.cursor = 'grabbing';
  });

  const onMouseMove = e => {
    if (!dragging) return;
    tx = startTx + (e.clientX - startX);
    ty = startTy + (e.clientY - startY);
    clamp(); apply();
  };
  const onMouseUp = () => {
    if (dragging) { dragging = false; wrapper.style.cursor = 'grab'; }
  };
  window.addEventListener('mousemove', onMouseMove);
  window.addEventListener('mouseup', onMouseUp);

  // Touch support
  let lastTouchDist = null;
  wrapper.addEventListener('touchstart', e => {
    if (e.touches.length === 1) {
      dragging = true;
      startX = e.touches[0].clientX; startY = e.touches[0].clientY;
      startTx = tx; startTy = ty;
    } else if (e.touches.length === 2) {
      dragging = false;
      lastTouchDist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
    }
  }, { passive: true });

  wrapper.addEventListener('touchmove', e => {
    e.preventDefault();
    if (e.touches.length === 1 && dragging) {
      tx = startTx + (e.touches[0].clientX - startX);
      ty = startTy + (e.touches[0].clientY - startY);
      clamp(); apply();
    } else if (e.touches.length === 2 && lastTouchDist) {
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      scale = Math.max(1, Math.min(5, scale * (dist / lastTouchDist)));
      lastTouchDist = dist;
      clamp(); apply();
    }
  }, { passive: false });

  wrapper.addEventListener('touchend', () => { dragging = false; lastTouchDist = null; });
}

function _setCompassVisible(visible) {
  const compass = document.querySelector('.compass');
  if (compass) compass.style.display = visible ? '' : 'none';
}

async function loadViewerImage(containerId, image) {
  if (_fallbackMode || !_viewer || (image.id && image.id.startsWith('wiki_'))) {
    showFallbackImage(containerId, image.thumb_2048_url || image.thumb_original_url);
    return;
  }
  try { await _viewer.moveTo(image.id); } catch {
    showFallbackImage(containerId, image.thumb_2048_url || image.thumb_original_url);
  }
}

function destroyViewer() {
  stopCompassPolling();
  if (_viewer) { try { _viewer.remove(); } catch {} _viewer = null; }
  _fallbackMode = false;
}

function isViewerReady() { return _viewer !== null || _fallbackMode; }

// ── Compass ──────────────────────────────────────────────────
function startCompassPolling() {
  stopCompassPolling();
  const needle = document.getElementById('compass-needle');
  if (!needle || !_viewer) return;
  _setCompassVisible(true);
  const tick = async () => {
    if (!_viewer) return;
    try {
      const pov = await _viewer.getPointOfView();
      if (pov && pov.bearing != null) {
        needle.setAttribute('transform', `rotate(${pov.bearing} 35 35)`);
        const dirEl = document.getElementById('compass-dir');
        if (dirEl) dirEl.textContent = bearingToDir(pov.bearing);
      }
    } catch {}
    _compassTimer = setTimeout(tick, 250);
  };
  _compassTimer = setTimeout(tick, 400);
}

function stopCompassPolling() {
  if (_compassTimer) { clearTimeout(_compassTimer); _compassTimer = null; }
}

function bearingToDir(b) {
  const dirs = ['N','NE','E','SE','S','SW','W','NW','N'];
  return dirs[Math.round(b / 45) % 8];
}
