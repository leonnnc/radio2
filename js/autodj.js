/* ============================================
   RADIOFM — AUTO DJ
   Igual que Zeno.FM: playlist de archivos MP3/WAV
   que transmite automáticamente cuando no hay
   broadcast en vivo.
   ============================================ */

// Almacén en memoria: stationId → [{ id, name, url, duration, size }]
const AutoDJPlaylists = new Map();

// Estado del reproductor Auto DJ por estación
const AutoDJState = new Map(); // stationId → { playing, currentIdx, audio }
const AutoDJLoaded = new Set(); // stationId → booleano

async function loadAutoDJPlaylist(stationId) {
  try {
    const saved = localStorage.getItem('autodj_meta_' + stationId);
    if (!saved) return;
    const metaList = JSON.parse(saved);
    const pl = [];
    for (const meta of metaList) {
      const blob = await localforage.getItem('dj_blob_' + meta.id);
      if (blob) {
        pl.push({
          ...meta,
          url: URL.createObjectURL(blob)
        });
        // Sincronización silenciosa con la nube en caso de reinicio del servidor
        fetch(`https://radio2-zqaq.onrender.com/autodj/upload?stationId=${stationId}&filename=${encodeURIComponent(meta.id+'.'+meta.type.split('/')[1])}`, {
          method: 'POST', body: blob
        }).catch(()=>{});
      }
    }
    AutoDJPlaylists.set(stationId, pl);
  } catch (err) {
    console.error('[AutoDJ] Error loading playlist:', err);
  }
}

function saveAutoDJPlaylist(stationId) {
  const pl = AutoDJPlaylists.get(stationId) || [];
  const metaList = pl.map(t => ({
    id: t.id, name: t.name, duration: t.duration, size: t.size, type: t.type
  }));
  localStorage.setItem('autodj_meta_' + stationId, JSON.stringify(metaList));
}

async function renderAutoDJ(container, stationId) {
  const station = RadioFM.data.stations.find(s => s.id === stationId);
  if (!station) return;

  if (!AutoDJLoaded.has(stationId)) {
    container.innerHTML = `<div class="page-header"><h1>Cargando Auto DJ...</h1><div class="spinner" style="margin-top:10px"></div></div>`;
    await loadAutoDJPlaylist(stationId);
    AutoDJLoaded.add(stationId);
  }

  const playlist = AutoDJPlaylists.get(stationId) || [];

  container.innerHTML = `
    <div class="page-header">
      <div class="page-header-left">
        <button class="btn btn-secondary btn-sm" onclick="Router.navigate('stations')" style="margin-bottom:8px">
          ← Volver a Estaciones
        </button>
        <h1>${station.emoji} Auto DJ — ${station.name}</h1>
        <p>Sube música MP3/WAV para transmitir automáticamente cuando no hay broadcast en vivo</p>
      </div>
    </div>

    <div class="card" style="margin-bottom:22px;padding:20px;display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:20px">
      <div style="flex:1;min-width:300px">
        <h3 style="font-size:1rem;margin-bottom:6px">📻 Enlace de Transmisión Pública</h3>
        <p style="font-size:0.875rem;color:var(--text-muted)">Comparte este enlace para que tus oyentes sintonicen la radio desde cualquier reproductor web o móvil.</p>
        <p style="font-size:0.75rem;color:var(--accent-cyan);margin-top:6px">✓ Este enlace transmite directamente desde tu Servidor Cloud usando Icecast y FFmpeg.</p>
      </div>
      <div style="display:flex;align-items:center;gap:10px;background:var(--bg-tertiary);padding:8px 12px;border-radius:var(--radius-md);border:1px solid rgba(255,255,255,0.05);flex:1;max-width:500px">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--accent-cyan)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0"><circle cx="12" cy="12" r="10"/><path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"/><path d="M2 12h20"/></svg>
        <code style="font-family:monospace;font-size:0.875rem;color:var(--text-primary);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;flex:1">
          https://radio2-zqaq.onrender.com/stream/station-${station.id}
        </code>
        <button class="btn btn-ghost btn-sm btn-icon" id="autodj-copy-url" data-url="https://radio2-zqaq.onrender.com/stream/station-${station.id}" title="Copiar URL">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
        </button>
      </div>
    </div>

    <div class="grid-2" style="gap:24px">

      <!-- COLUMNA IZQUIERDA: Upload + controles -->
      <div style="display:flex;flex-direction:column;gap:16px">

        <!-- Upload zone -->
        <div class="upload-zone" id="autodj-drop" style="padding:36px 24px">
          <div class="upload-zone-icon">
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round" style="color:var(--text-muted)"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>
          </div>
          <h3>Subir Media</h3>
          <p>Arrastra archivos MP3 o WAV, o haz clic para seleccionar</p>
          <p style="font-size:0.75rem;color:var(--text-muted);margin-top:4px">Puedes subir varios archivos a la vez</p>
          <button class="btn btn-primary" style="margin-top:14px" id="autodj-select-btn">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
            Seleccionar Archivos
          </button>
          <input type="file" id="autodj-file-input" accept=".mp3,.wav,audio/mpeg,audio/wav" multiple style="display:none" />
        </div>

        <!-- Controles del player Auto DJ -->
        <div class="card" id="autodj-player-card" style="${playlist.length ? '' : 'display:none'}">
          <h3 style="font-size:0.9375rem;margin-bottom:14px">🎛️ Controles Auto DJ</h3>

          <!-- Now playing -->
          <div id="autodj-now-playing" style="background:var(--bg-tertiary);border-radius:var(--radius-sm);padding:12px 14px;margin-bottom:14px;display:flex;align-items:center;gap:10px">
            <div class="equalizer" id="autodj-eq" style="display:none">
              <div class="eq-bar"></div><div class="eq-bar"></div>
              <div class="eq-bar"></div><div class="eq-bar"></div>
            </div>
            <div style="flex:1;min-width:0">
              <div id="autodj-track-name" style="font-weight:600;font-size:0.875rem;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">Sin pista seleccionada</div>
              <div id="autodj-track-info" style="font-size:0.75rem;color:var(--text-muted)">Presiona Play para comenzar</div>
            </div>
          </div>

          <!-- Progress bar -->
          <div class="player-seek" id="autodj-seek" style="margin-bottom:10px;cursor:pointer">
            <div class="player-seek-fill" id="autodj-seek-fill"></div>
          </div>
          <div style="display:flex;justify-content:space-between;font-size:0.75rem;color:var(--text-muted);margin-bottom:14px">
            <span id="autodj-time-cur">0:00</span>
            <span id="autodj-time-total">0:00</span>
          </div>

          <!-- Botones -->
          <div style="display:flex;gap:8px;flex-wrap:wrap">
            <button class="btn btn-primary" style="flex:1" id="autodj-play-btn">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><polygon points="5,3 19,12 5,21"/></svg>
              Play
            </button>
            <button class="btn btn-secondary" id="autodj-prev-btn">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="19 20 9 12 19 4 19 20"/><line x1="5" y1="19" x2="5" y2="5"/></svg>
            </button>
            <button class="btn btn-secondary" id="autodj-next-btn">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="5 4 15 12 5 20 5 4"/><line x1="19" y1="5" x2="19" y2="19"/></svg>
            </button>
            <button class="btn btn-secondary" id="autodj-shuffle-btn" title="Aleatorio">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="16 3 21 3 21 8"/><line x1="4" y1="20" x2="21" y2="3"/><polyline points="21 16 21 21 16 21"/><line x1="15" y1="15" x2="21" y2="21"/></svg>
            </button>
            <button class="btn btn-secondary" id="autodj-restart-btn" title="Reiniciar playlist">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 .49-3.5"/></svg>
            </button>
          </div>

          <!-- Volumen -->
          <div style="display:flex;align-items:center;gap:10px;margin-top:12px">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/></svg>
            <input type="range" id="autodj-volume" min="0" max="100" value="80" style="flex:1;accent-color:var(--accent-cyan)" />
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/></svg>
          </div>
        </div>
      </div>

      <!-- COLUMNA DERECHA: Playlist -->
      <div style="display:flex;flex-direction:column;gap:16px">

        <!-- Upload progress -->
        <div id="autodj-upload-progress" style="display:none" class="card">
          <div style="display:flex;align-items:center;gap:10px;margin-bottom:10px">
            <div class="spinner"></div>
            <span id="autodj-upload-label" style="font-size:0.875rem;font-weight:600">Subiendo archivos…</span>
          </div>
          <div class="progress-bar"><div class="progress-fill" id="autodj-progress-fill" style="width:0%"></div></div>
        </div>

        <!-- Playlist card -->
        <div class="card" style="flex:1">
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:14px">
            <h3 style="font-size:0.9375rem;margin:0">📋 Playlist <span id="autodj-count" style="font-size:0.8rem;color:var(--text-muted);font-weight:400">(${playlist.length} pistas)</span></h3>
            <div style="display:flex;gap:8px">
              <button class="btn btn-secondary btn-sm" id="autodj-clear-all" ${!playlist.length ? 'disabled' : ''}>Limpiar todo</button>
            </div>
          </div>
          <div id="autodj-playlist-list">
            ${playlist.length
              ? playlist.map((t, i) => autoDJTrackHTML(t, i, stationId)).join('')
              : `<div class="empty-state" style="padding:30px">
                  <div class="empty-state-icon"><svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg></div>
                  <h3>Playlist vacía</h3>
                  <p>Sube archivos MP3 o WAV para comenzar</p>
                </div>`
            }
          </div>
        </div>
      </div>
    </div>
  `;

  initAutoDJ(stationId);
}

// ---- HTML de una pista en la playlist ----
function autoDJTrackHTML(track, index, stationId) {
  return `
    <div class="episode-row autodj-track" id="autodj-track-${track.id}" data-index="${index}">
      <div style="width:28px;text-align:center;font-size:0.8rem;color:var(--text-muted);flex-shrink:0">${index + 1}</div>
      <div class="episode-thumb">🎵</div>
      <div class="episode-info">
        <div class="episode-title">${track.name}</div>
        <div class="episode-meta">
          <span>${track.duration}</span>
          <span>${formatDJFileSize(track.size)}</span>
        </div>
      </div>
      <div class="episode-actions" style="gap:6px">
        <button class="btn btn-secondary btn-sm btn-icon autodj-play-track" data-id="${track.id}" data-index="${index}" title="Reproducir">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><polygon points="5,3 19,12 5,21"/></svg>
        </button>
        <button class="btn btn-ghost btn-sm btn-icon autodj-remove-track" data-id="${track.id}" data-stationid="${stationId}" title="Eliminar">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>
      </div>
    </div>
  `;
}

// ---- INIT ----
function initAutoDJ(stationId) {
  const dropZone  = document.getElementById('autodj-drop');
  const fileInput = document.getElementById('autodj-file-input');
  const selectBtn = document.getElementById('autodj-select-btn');

  selectBtn?.addEventListener('click', () => fileInput?.click());
  fileInput?.addEventListener('change', e => {
    if (e.target.files?.length) handleDJUpload([...e.target.files], stationId);
  });
  dropZone?.addEventListener('dragover',  e => { e.preventDefault(); dropZone.classList.add('drag-over'); });
  dropZone?.addEventListener('dragleave', () => dropZone.classList.remove('drag-over'));
  dropZone?.addEventListener('drop', e => {
    e.preventDefault();
    dropZone.classList.remove('drag-over');
    const files = [...e.dataTransfer.files].filter(f => f.type.startsWith('audio/'));
    if (files.length) handleDJUpload(files, stationId);
  });

  // Botones de playlist
  document.getElementById('autodj-clear-all')?.addEventListener('click', async () => {
    if (confirm('¿Limpiar toda la playlist?')) {
      const pl = AutoDJPlaylists.get(stationId) || [];
      for (const t of pl) await localforage.removeItem('dj_blob_' + t.id);
      AutoDJPlaylists.set(stationId, []);
      saveAutoDJPlaylist(stationId);
      stopDJ(stationId);
      
      // Borrar de la nube
      fetch('https://radio2-zqaq.onrender.com/autodj/clear', {
        method: 'POST', body: JSON.stringify({ stationId })
      }).catch(()=>{});

      renderAutoDJ(document.getElementById('page-content'), stationId);
    }
  });

  // Botones de tracks
  document.querySelectorAll('.autodj-play-track').forEach(btn => {
    btn.addEventListener('click', () => playDJTrack(stationId, parseInt(btn.dataset.index)));
  });
  document.querySelectorAll('.autodj-remove-track').forEach(btn => {
    btn.addEventListener('click', async () => {
      const id  = parseInt(btn.dataset.id);
      const pl  = AutoDJPlaylists.get(stationId) || [];
      const track = pl.find(t => t.id === id);
      
      await localforage.removeItem('dj_blob_' + id);
      AutoDJPlaylists.set(stationId, pl.filter(t => t.id !== id));
      saveAutoDJPlaylist(stationId);
      
      // Borrar de la nube
      if (track) {
        fetch('https://radio2-zqaq.onrender.com/autodj/delete', {
          method: 'POST', body: JSON.stringify({ stationId, filename: id + '.' + track.type.split('/')[1] })
        }).catch(()=>{});
      }

      renderAutoDJ(document.getElementById('page-content'), stationId);
    });
  });

  // Controles del player DJ
  document.getElementById('autodj-play-btn')?.addEventListener('click', () => toggleDJPlay(stationId));
  document.getElementById('autodj-prev-btn')?.addEventListener('click', () => prevDJTrack(stationId));
  document.getElementById('autodj-next-btn')?.addEventListener('click', () => nextDJTrack(stationId));
  document.getElementById('autodj-restart-btn')?.addEventListener('click', () => playDJTrack(stationId, 0));
  document.getElementById('autodj-shuffle-btn')?.addEventListener('click', () => shuffleDJPlaylist(stationId));

  document.getElementById('autodj-volume')?.addEventListener('input', e => {
    const state = AutoDJState.get(stationId);
    if (state?.audio) state.audio.volume = e.target.value / 100;
  });

  document.getElementById('autodj-seek')?.addEventListener('click', e => {
    const state = AutoDJState.get(stationId);
    if (!state?.audio?.duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    state.audio.currentTime = ((e.clientX - rect.left) / rect.width) * state.audio.duration;
  });

  // Botón de copiar URL
  document.getElementById('autodj-copy-url')?.addEventListener('click', e => {
    const btn = e.currentTarget;
    navigator.clipboard.writeText(btn.dataset.url).then(() => {
      Toast.show('URL copiada al portapapeles', 'success');
    }).catch(() => {
      Toast.show('No se pudo copiar la URL', 'error');
    });
  });

  // Restaurar estado del player si había uno activo
  const state = AutoDJState.get(stationId);
  if (state) updateDJPlayerUI(stationId);
}

// ---- UPLOAD ----
async function handleDJUpload(files, stationId) {
  const progressCard = document.getElementById('autodj-upload-progress');
  const progressFill = document.getElementById('autodj-progress-fill');
  const progressLabel = document.getElementById('autodj-upload-label');
  if (progressCard) progressCard.style.display = 'block';

  const pl = AutoDJPlaylists.get(stationId) || [];

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    if (!file.type.startsWith('audio/')) continue;

    if (progressLabel) progressLabel.textContent = `Cargando ${i + 1}/${files.length}: ${file.name}`;
    if (progressFill)  progressFill.style.width = ((i / files.length) * 100) + '%';

    const blobUrl  = URL.createObjectURL(file);
    const duration = await getAudioDuration(blobUrl);

    const trackId = Date.now() + i;
    await localforage.setItem('dj_blob_' + trackId, file);

    // Subir archivo a la nube para Icecast
    await fetch(`https://radio2-zqaq.onrender.com/autodj/upload?stationId=${stationId}&filename=${encodeURIComponent(trackId+'.'+file.type.split('/')[1])}`, {
      method: 'POST', body: file
    }).catch(e => console.error('Error subiendo a nube:', e));

    pl.push({
      id:       trackId,
      name:     file.name.replace(/\.[^.]+$/, ''),
      url:      blobUrl,
      duration: formatDJTime(duration),
      size:     file.size,
      type:     file.type,
    });

    // Pequeña pausa para UX
    await new Promise(r => setTimeout(r, 150));
  }

  if (progressFill) progressFill.style.width = '100%';
  if (progressLabel) progressLabel.textContent = `¡${files.length} pista(s) lista(s)!`;

  AutoDJPlaylists.set(stationId, pl);
  saveAutoDJPlaylist(stationId);

  setTimeout(() => {
    renderAutoDJ(document.getElementById('page-content'), stationId);
    Toast.show(`${files.length} pista(s) añadidas al Auto DJ`, 'success');
  }, 600);
}

function getAudioDuration(url) {
  return new Promise(resolve => {
    const a = new Audio(url);
    a.addEventListener('loadedmetadata', () => resolve(a.duration || 0));
    a.addEventListener('error', () => resolve(0));
    setTimeout(() => resolve(0), 5000);
  });
}

// ---- PLAYER ----
function getOrCreateDJState(stationId) {
  if (!AutoDJState.has(stationId)) {
    AutoDJState.set(stationId, {
      playing: false,
      currentIdx: 0,
      shuffle: false,
      audio: new Audio(),
    });
    const state = AutoDJState.get(stationId);
    state.audio.volume = 0.8;
    state.audio.addEventListener('ended', () => nextDJTrack(stationId));
    state.audio.addEventListener('timeupdate', () => updateDJSeek(stationId));
    state.audio.addEventListener('error', () => nextDJTrack(stationId));
  }
  return AutoDJState.get(stationId);
}

function playDJTrack(stationId, index) {
  const pl    = AutoDJPlaylists.get(stationId) || [];
  if (!pl.length) return;
  const idx   = ((index % pl.length) + pl.length) % pl.length;
  const state = getOrCreateDJState(stationId);

  state.audio.pause();
  state.currentIdx = idx;
  state.audio.src  = pl[idx].url;
  state.audio.load();
  state.audio.play().catch(err => Toast.show(`Error: ${err.message}`, 'error'));
  state.playing = true;

  updateDJPlayerUI(stationId);
  highlightDJTrack(idx);
}

function toggleDJPlay(stationId) {
  const state = AutoDJState.get(stationId);
  const pl    = AutoDJPlaylists.get(stationId) || [];
  if (!pl.length) return;

  if (!state) {
    playDJTrack(stationId, 0);
    return;
  }

  if (state.playing) {
    state.audio.pause();
    state.playing = false;
  } else {
    if (!state.audio.src) state.audio.src = pl[state.currentIdx]?.url;
    state.audio.play().catch(() => {});
    state.playing = true;
  }
  updateDJPlayerUI(stationId);
}

function nextDJTrack(stationId) {
  const state = AutoDJState.get(stationId) || getOrCreateDJState(stationId);
  const pl    = AutoDJPlaylists.get(stationId) || [];
  if (!pl.length) return;

  const next = state.shuffle
    ? Math.floor(Math.random() * pl.length)
    : (state.currentIdx + 1) % pl.length;

  playDJTrack(stationId, next);
}

function prevDJTrack(stationId) {
  const state = getOrCreateDJState(stationId);
  const pl    = AutoDJPlaylists.get(stationId) || [];
  if (!pl.length) return;
  playDJTrack(stationId, (state.currentIdx - 1 + pl.length) % pl.length);
}

function stopDJ(stationId) {
  const state = AutoDJState.get(stationId);
  if (state) { state.audio.pause(); state.playing = false; }
}

function shuffleDJPlaylist(stationId) {
  const state = getOrCreateDJState(stationId);
  state.shuffle = !state.shuffle;
  const btn = document.getElementById('autodj-shuffle-btn');
  if (btn) btn.style.color = state.shuffle ? 'var(--accent-cyan)' : '';
  Toast.show(state.shuffle ? '🔀 Modo aleatorio activado' : '🔀 Modo aleatorio desactivado', 'info');
}

// ---- UI UPDATES ----
function updateDJPlayerUI(stationId) {
  const state = AutoDJState.get(stationId);
  const pl    = AutoDJPlaylists.get(stationId) || [];
  if (!state || !pl.length) return;

  const track   = pl[state.currentIdx];
  const nameEl  = document.getElementById('autodj-track-name');
  const infoEl  = document.getElementById('autodj-track-info');
  const playBtn = document.getElementById('autodj-play-btn');
  const eq      = document.getElementById('autodj-eq');
  const card    = document.getElementById('autodj-player-card');

  if (card)    card.style.display = '';
  if (nameEl)  nameEl.textContent = track?.name || 'Sin pista';
  if (infoEl)  infoEl.textContent = `Pista ${state.currentIdx + 1} de ${pl.length} · ${track?.duration || '?:??'}`;
  if (eq)      eq.style.display   = state.playing ? 'flex' : 'none';

  if (playBtn) {
    playBtn.innerHTML = state.playing
      ? `<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg> Pausar`
      : `<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><polygon points="5,3 19,12 5,21"/></svg> Play`;
  }
}

function updateDJSeek(stationId) {
  const state  = AutoDJState.get(stationId);
  if (!state?.audio?.duration) return;
  const pct    = (state.audio.currentTime / state.audio.duration) * 100;
  const fill   = document.getElementById('autodj-seek-fill');
  const curEl  = document.getElementById('autodj-time-cur');
  const totEl  = document.getElementById('autodj-time-total');
  if (fill)  fill.style.width    = pct + '%';
  if (curEl) curEl.textContent   = formatDJTime(state.audio.currentTime);
  if (totEl) totEl.textContent   = formatDJTime(state.audio.duration);
}

function highlightDJTrack(activeIdx) {
  document.querySelectorAll('.autodj-track').forEach((el, i) => {
    el.style.background = i === activeIdx ? 'rgba(0,212,255,0.06)' : '';
    el.style.borderLeft = i === activeIdx ? '3px solid var(--accent-cyan)' : '3px solid transparent';
  });
}

// ---- HELPERS ----
function formatDJTime(s) {
  if (!s || !isFinite(s)) return '?:??';
  s = Math.floor(s);
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60;
  if (h > 0) return `${h}:${String(m).padStart(2,'0')}:${String(sec).padStart(2,'0')}`;
  return `${m}:${String(sec).padStart(2,'0')}`;
}

function formatDJFileSize(bytes) {
  if (!bytes) return '';
  if (bytes >= 1048576) return (bytes / 1048576).toFixed(1) + ' MB';
  return (bytes / 1024).toFixed(0) + ' KB';
}
