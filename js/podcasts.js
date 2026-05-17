/* ============================================
   RADIOFM — PODCASTS PAGE
   ============================================ */

// Mapa en memoria: episodeId -> blob URL del archivo de audio subido
// (los blob: URLs no se pueden serializar en localStorage, viven solo en la sesión)
const EpisodeAudioMap = new Map();

function renderPodcasts(container) {
  const published = RadioFM.data.podcasts.filter(p => p.status === 'published');
  const drafts    = RadioFM.data.podcasts.filter(p => p.status === 'draft');

  container.innerHTML = `
    <div class="page-header">
      <div class="page-header-left">
        <h1>Podcasts</h1>
        <p>${published.length} publicados · ${drafts.length} borradores</p>
      </div>
      <button class="btn btn-primary" id="btn-new-episode">${Icons.plus} Nuevo Episodio</button>
    </div>

    <div class="tabs" style="margin-bottom:20px">
      <button class="tab-btn active" data-tab="all">Todos</button>
      <button class="tab-btn" data-tab="published">Publicados</button>
      <button class="tab-btn" data-tab="draft">Borradores</button>
    </div>

    <div class="card" id="episodes-list"></div>

    <!-- Upload Zone -->
    <div class="upload-zone" id="upload-zone" style="margin-top:20px">
      <div class="upload-zone-icon">
        <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
      </div>
      <h3>Subir nuevo episodio</h3>
      <p>Arrastra un archivo MP3/WAV aquí o haz clic para seleccionar</p>
      <input type="file" id="ep-file-input" accept="audio/*" style="display:none" />
    </div>
  `;

  renderEpisodesList('all');

  // Tabs
  document.querySelectorAll('.tab-btn[data-tab]').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.tab-btn[data-tab]').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      renderEpisodesList(btn.dataset.tab);
    });
  });

  // Upload zone
  const zone = document.getElementById('upload-zone');
  const input = document.getElementById('ep-file-input');
  zone?.addEventListener('click', () => input?.click());
  zone?.addEventListener('dragover', e => { e.preventDefault(); zone.classList.add('drag-over'); });
  zone?.addEventListener('dragleave', () => zone.classList.remove('drag-over'));
  zone?.addEventListener('drop', e => {
    e.preventDefault();
    zone.classList.remove('drag-over');
    const file = e.dataTransfer.files[0];
    if (file) handleFileUpload(file);
  });
  input?.addEventListener('change', e => { if (e.target.files[0]) handleFileUpload(e.target.files[0]); });

  document.getElementById('btn-new-episode')?.addEventListener('click', () => input?.click());
}

function renderEpisodesList(filter) {
  const list = document.getElementById('episodes-list');
  if (!list) return;

  let eps = RadioFM.data.podcasts;
  if (filter === 'published') eps = eps.filter(p => p.status === 'published');
  if (filter === 'draft')     eps = eps.filter(p => p.status === 'draft');

  if (!eps.length) {
    list.innerHTML = `<div class="empty-state"><div class="empty-state-icon">${Icons.podcast}</div><h3>Sin episodios</h3><p>Sube tu primer episodio de podcast</p></div>`;
    return;
  }

  list.innerHTML = eps.map(ep => episodeRowHTML(ep)).join('');

  list.querySelectorAll('.ep-play-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = parseInt(btn.dataset.id);
      const ep = RadioFM.data.podcasts.find(p => p.id === id);
      if (!ep) return;

      // Buscar URL de audio: primero en el mapa de blobs (archivos subidos en esta sesión),
      // luego en el campo streamUrl del episodio (si fue guardado con URL externa).
      const audioUrl = EpisodeAudioMap.get(id) || ep.streamUrl || '';

      if (!audioUrl) {
        Toast.show('Este episodio no tiene audio. Súbelo primero desde la zona de carga.', 'error');
        return;
      }

      Player.play(
        { name: ep.title, emoji: ep.emoji, genre: 'Podcast', status: 'podcast', listeners: ep.plays },
        audioUrl
      );
      Toast.show(`▶ ${ep.title}`, 'info');
    });
  });
}

function handleFileUpload(file) {
  if (!file.type.startsWith('audio/')) { Toast.show('Solo archivos de audio', 'error'); return; }
  Toast.show(`Cargando "${file.name}"...`, 'info');

  // Crear un blob URL permanente para esta sesión
  const blobUrl = URL.createObjectURL(file);

  // Leer la duración real con AudioContext
  const tempAudio = new Audio();
  tempAudio.src = blobUrl;
  tempAudio.preload = 'metadata';

  tempAudio.addEventListener('loadedmetadata', () => {
    const dur = isFinite(tempAudio.duration) ? formatDuration(tempAudio.duration) : '?:??';
    tempAudio.src = ''; // liberar referencia temporal

    const id = Date.now();
    const ep = {
      id,
      stationId: null,
      title: file.name.replace(/\.[^.]+$/, ''),
      duration: dur,
      plays: 0,
      date: new Date().toISOString().slice(0, 10),
      emoji: '🎙️',
      status: 'draft',
      description: '',
      streamUrl: '' // blob URLs no se persisten; se guarda en EpisodeAudioMap
    };

    // Guardar el blob URL en el mapa en memoria
    EpisodeAudioMap.set(id, blobUrl);

    RadioFM.data.podcasts.unshift(ep);
    RadioFM.save();

    Toast.show(`"${ep.title}" listo — presiona ▶ para escucharlo`, 'success');
    renderEpisodesList('all');

    // Auto-reproducir inmediatamente
    Player.play(
      { name: ep.title, emoji: ep.emoji, genre: 'Podcast', status: 'podcast', listeners: 0 },
      blobUrl
    );
  });

  tempAudio.addEventListener('error', () => {
    Toast.show('No se pudo leer el archivo de audio', 'error');
    URL.revokeObjectURL(blobUrl);
  });
}

function formatDuration(seconds) {
  const s = Math.floor(seconds);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (h > 0) return `${h}:${String(m).padStart(2,'0')}:${String(sec).padStart(2,'0')}`;
  return `${m}:${String(sec).padStart(2,'0')}`;
}
