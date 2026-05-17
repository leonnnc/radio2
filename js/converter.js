/* ============================================
   RADIOFM — CONVERTER PAGE
   Extrae audio de video MP4/WebM/MOV → WAV
   Usa Web Audio API nativo (sin librerías)
   ============================================ */

function renderConverter(container) {
  const platformBadges = [
    ['▶️','YouTube'],['📘','Facebook'],['📸','Instagram'],
    ['🎵','TikTok'],['🐦','Twitter/X'],['🎮','Twitch'],['📺','Vimeo'],['🎶','SoundCloud']
  ].map(([i,n])=>`<span class="badge badge-free">${i} ${n}</span>`).join('');

  container.innerHTML = `
    <div class="page-header">
      <div class="page-header-left">
        <h1>Convertir Video a Audio</h1>
        <p>Sube un archivo local <strong>o</strong> extrae audio de YouTube, Facebook, Instagram y más</p>
      </div>
    </div>

    <div class="tabs" style="margin-bottom:24px">
      <button class="tab-btn active" id="tab-file-btn">📁 Subir Archivo Local</button>
      <button class="tab-btn" id="tab-url-btn">🔗 Desde URL (YouTube / Facebook)</button>
    </div>

    <!-- PANEL ARCHIVO -->
    <div id="conv-panel-file">

    <div class="grid-2" style="gap:24px">

      <!-- PANEL IZQUIERDO: Drop zone + controles -->
      <div style="display:flex;flex-direction:column;gap:16px">

        <!-- Drop Zone -->
        <div class="upload-zone" id="conv-drop-zone" style="padding:50px 30px">
          <div class="upload-zone-icon">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round" style="color:var(--text-muted)">
              <polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2"/>
            </svg>
          </div>
          <h3>Arrastra tu video aquí</h3>
          <p>MP4, WebM, MOV, AVI, MKV — o cualquier formato que soporte tu navegador</p>
          <button class="btn btn-primary" style="margin-top:16px" id="conv-select-btn">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
            Seleccionar Archivo
          </button>
          <input type="file" id="conv-file-input" accept="video/*,audio/*" style="display:none" />
        </div>

        <!-- Archivo seleccionado -->
        <div class="card" id="conv-file-info" style="display:none">
          <div style="display:flex;align-items:center;gap:14px">
            <div style="
              width:48px;height:48px;border-radius:var(--radius-sm);
              background:linear-gradient(135deg,rgba(124,58,237,0.2),rgba(0,212,255,0.2));
              display:flex;align-items:center;justify-content:center;flex-shrink:0;font-size:1.5rem
            ">🎬</div>
            <div style="flex:1;min-width:0">
              <div id="conv-filename" style="font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis"></div>
              <div id="conv-filesize" style="font-size:0.8rem;color:var(--text-secondary);margin-top:2px"></div>
            </div>
            <button class="btn btn-ghost btn-sm" id="conv-clear-btn">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          </div>
        </div>

        <!-- Opciones de conversión -->
        <div class="card" id="conv-options" style="display:none">
          <h3 style="font-size:0.9375rem;margin-bottom:16px">Opciones de Salida</h3>

          <div class="form-group">
            <label class="form-label">Nombre del archivo de salida</label>
            <input class="form-control" id="conv-output-name" placeholder="mi-audio" />
          </div>

          <div class="form-group">
            <label class="form-label">Canales</label>
            <select class="form-control" id="conv-channels">
              <option value="2">Estéreo (2 canales)</option>
              <option value="1">Mono (1 canal)</option>
            </select>
          </div>

          <div class="form-group">
            <label class="form-label">Sample Rate</label>
            <select class="form-control" id="conv-samplerate">
              <option value="44100">44,100 Hz (CD Quality)</option>
              <option value="48000">48,000 Hz (Video/Broadcast)</option>
              <option value="22050">22,050 Hz (Compacto)</option>
            </select>
          </div>

          <button class="btn btn-primary" style="width:100%;margin-top:4px" id="conv-start-btn">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>
            Convertir a WAV
          </button>
        </div>
      </div>

      <!-- PANEL DERECHO: Progreso + resultado -->
      <div style="display:flex;flex-direction:column;gap:16px">

        <!-- Estado / progreso -->
        <div class="card" id="conv-status-card">
          <h3 style="font-size:0.9375rem;margin-bottom:16px">Estado</h3>
          <div id="conv-status-body">
            <div class="empty-state" style="padding:30px">
              <div class="empty-state-icon">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2"/></svg>
              </div>
              <p style="color:var(--text-muted)">Selecciona un archivo para comenzar</p>
            </div>
          </div>
        </div>

        <!-- Preview de audio (después de convertir) -->
        <div class="card" id="conv-result-card" style="display:none">
          <h3 style="font-size:0.9375rem;margin-bottom:16px">Resultado</h3>
          <div id="conv-result-body"></div>
        </div>

        <!-- Historial de conversiones en esta sesión -->
        <div class="card" id="conv-history-card" style="display:none">
          <h3 style="font-size:0.9375rem;margin-bottom:12px">Historial de esta sesión</h3>
          <div id="conv-history-list"></div>
        </div>

        <!-- Formatos soportados -->
        <div class="card">
          <h3 style="font-size:0.9375rem;margin-bottom:12px">Formatos de entrada soportados</h3>
          <div style="display:flex;flex-wrap:wrap;gap:8px">
            ${['MP4','WebM','MOV','AVI','MKV','OGV','MP3','WAV','OGG','FLAC','M4A','AAC'].map(f => `
              <span class="badge badge-free">${f}</span>
            `).join('')}
          </div>
          <p style="font-size:0.8rem;color:var(--text-muted);margin-top:10px">
            * Depende del soporte del navegador para cada codec. Chrome/Edge soportan la mayoría.
          </p>
        </div>
      </div>
    </div>
  `;

  initConverter();

  // ---- Cerrar panel archivo, añadir panel URL ----
  const panelFile = document.getElementById('conv-panel-file');
  const panelUrl  = document.createElement('div');
  panelUrl.id     = 'conv-panel-url';
  panelUrl.style.display = 'none';

  const platformBadges2 = [
    ['▶️','YouTube'],['📘','Facebook'],['📸','Instagram'],
    ['🎵','TikTok'],['🐦','Twitter/X'],['🎮','Twitch'],['📺','Vimeo'],['🎶','SoundCloud']
  ].map(([i,n])=>`<span class="badge badge-free">${i} ${n}</span>`).join('');

  panelUrl.innerHTML = `
    <div class="grid-2" style="gap:24px">
      <div style="display:flex;flex-direction:column;gap:16px">
        <div style="background:rgba(245,158,11,0.08);border:1px solid rgba(245,158,11,0.2);border-radius:var(--radius-md);padding:14px 16px;font-size:0.8125rem;color:var(--text-secondary)">
          ⚠️ <strong style="color:var(--accent-orange)">Uso responsable:</strong>
          Descarga solo contenido que tengas derecho a usar. Usa
          <a href="https://cobalt.tools" target="_blank" style="color:var(--accent-cyan)">cobalt.tools</a> (open-source, gratuito).
        </div>
        <div class="card">
          <div style="font-size:0.8125rem;font-weight:600;color:var(--text-secondary);margin-bottom:10px">Plataformas soportadas</div>
          <div style="display:flex;flex-wrap:wrap;gap:8px">${platformBadges2}</div>
        </div>
        <div class="card">
          <h3 style="font-size:0.9375rem;margin-bottom:16px">Pegar Enlace</h3>
          <div id="url-platform-badge" style="margin-bottom:10px;min-height:22px"></div>
          <div class="form-group">
            <label class="form-label">URL del video</label>
            <input class="form-control" id="conv-url-input" placeholder="https://www.youtube.com/watch?v=..." />
          </div>
          <div class="form-group">
            <label class="form-label">Nombre del archivo de salida</label>
            <input class="form-control" id="conv-url-name" placeholder="mi-audio" />
          </div>
          <button class="btn btn-primary" style="width:100%" id="conv-url-btn">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
            Extraer Audio
          </button>
        </div>
      </div>
        <div class="card" id="url-status-card">
          <h3 style="font-size:0.9375rem;margin-bottom:16px">Estado</h3>
          <div id="url-status-body">
            <div class="empty-state" style="padding:20px"><p style="color:var(--text-muted)">Pega un enlace y presiona Extraer Audio</p></div>
          </div>
        </div>
        <div class="card" id="url-result-card" style="display:none">
          <h3 style="font-size:0.9375rem;margin-bottom:12px">Resultado</h3>
          <div id="url-result-body"></div>
        </div>
        <div class="card" style="background:rgba(0,212,255,0.04)">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px">
            <h3 style="font-size:0.875rem;margin:0">⚡ Servidor de descarga</h3>
            <span id="url-server-hint" style="font-size:0.8rem">Verificando…</span>
          </div>
          <p style="font-size:0.8rem;color:var(--text-secondary);line-height:1.6">
            Esta función requiere el servidor local (usa <strong>yt-dlp</strong> instalado).<br>
            Si no está activo, abre una terminal y ejecuta:<br>
            <code style="color:var(--accent-cyan);background:var(--bg-tertiary);padding:2px 8px;border-radius:4px;display:inline-block;margin-top:4px">
              node /Users/leonnnc/Documents/web/radio2/server.js
            </code>
          </p>
        </div>
      </div>
    </div>
  `;

  panelFile?.parentElement?.appendChild(panelUrl);

  initUrlConverter();

  document.getElementById('tab-file-btn')?.addEventListener('click', () => {
    document.getElementById('conv-panel-file').style.display = '';
    document.getElementById('conv-panel-url').style.display  = 'none';
    document.getElementById('tab-file-btn').classList.add('active');
    document.getElementById('tab-url-btn').classList.remove('active');
  });
  document.getElementById('tab-url-btn')?.addEventListener('click', () => {
    document.getElementById('conv-panel-file').style.display = 'none';
    document.getElementById('conv-panel-url').style.display  = '';
    document.getElementById('tab-url-btn').classList.add('active');
    document.getElementById('tab-file-btn').classList.remove('active');
    // Verificar servidor solo al abrir esta pestaña
    if (typeof checkServerStatus === 'function') checkServerStatus();
  });
} // end renderConverter

// ---- ESTADO DEL CONVERTIDOR ----
let convFile = null;
const convHistory = [];

function initConverter() {
  const dropZone  = document.getElementById('conv-drop-zone');
  const fileInput = document.getElementById('conv-file-input');
  const selectBtn = document.getElementById('conv-select-btn');
  const clearBtn  = document.getElementById('conv-clear-btn');
  const startBtn  = document.getElementById('conv-start-btn');

  selectBtn?.addEventListener('click', () => fileInput?.click());
  fileInput?.addEventListener('change', e => { if (e.target.files[0]) setConvFile(e.target.files[0]); });

  dropZone?.addEventListener('dragover',  e => { e.preventDefault(); dropZone.classList.add('drag-over'); });
  dropZone?.addEventListener('dragleave', () => dropZone.classList.remove('drag-over'));
  dropZone?.addEventListener('drop', e => {
    e.preventDefault();
    dropZone.classList.remove('drag-over');
    const file = e.dataTransfer.files[0];
    if (file) setConvFile(file);
  });

  clearBtn?.addEventListener('click', clearConvFile);
  startBtn?.addEventListener('click', startConversion);
}

function setConvFile(file) {
  convFile = file;

  // Mostrar info del archivo
  document.getElementById('conv-file-info').style.display = 'block';
  document.getElementById('conv-options').style.display   = 'block';
  document.getElementById('conv-filename').textContent    = file.name;
  document.getElementById('conv-filesize').textContent    = formatFileSize(file.size) + ' · ' + (file.type || 'tipo desconocido');

  // Nombre de salida por defecto
  const baseName = file.name.replace(/\.[^.]+$/, '');
  document.getElementById('conv-output-name').value = baseName;

  // Estado
  setConvStatus('ready', `Archivo listo: <strong>${file.name}</strong>`);
}

function clearConvFile() {
  convFile = null;
  document.getElementById('conv-file-info').style.display = 'none';
  document.getElementById('conv-options').style.display   = 'none';
  document.getElementById('conv-result-card').style.display = 'none';
  document.getElementById('conv-file-input').value = '';
  setConvStatus('idle');
}

function setConvStatus(state, html = '') {
  const body = document.getElementById('conv-status-body');
  if (!body) return;

  const states = {
    idle: `<div class="empty-state" style="padding:30px">
      <div class="empty-state-icon"><svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2"/></svg></div>
      <p style="color:var(--text-muted)">Selecciona un archivo para comenzar</p>
    </div>`,

    ready: `<div style="display:flex;align-items:center;gap:10px;padding:8px 0">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--accent-cyan)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
      <span style="font-size:0.875rem">${html}</span>
    </div>`,

    processing: `<div>
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:14px">
        <div class="spinner"></div>
        <span style="font-size:0.875rem;font-weight:600">Convirtiendo…</span>
      </div>
      <div style="font-size:0.8rem;color:var(--text-secondary);margin-bottom:10px" id="conv-progress-label">${html}</div>
      <div class="progress-bar"><div class="progress-fill" id="conv-progress-fill" style="width:0%"></div></div>
    </div>`,

    done: `<div style="display:flex;align-items:center;gap:10px;padding:8px 0">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--accent-green)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
      <span style="font-size:0.875rem;color:var(--accent-green);font-weight:600">${html}</span>
    </div>`,

    error: `<div style="display:flex;align-items:center;gap:10px;padding:8px 0">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--accent-red)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
      <span style="font-size:0.875rem;color:var(--accent-red)">${html}</span>
    </div>`,
  };

  body.innerHTML = states[state] || states.idle;
}

async function startConversion() {
  if (!convFile) return;

  const outputName   = (document.getElementById('conv-output-name')?.value.trim() || 'audio') + '.wav';
  const channels     = parseInt(document.getElementById('conv-channels')?.value     || '2');
  const sampleRate   = parseInt(document.getElementById('conv-samplerate')?.value   || '44100');
  const startBtn     = document.getElementById('conv-start-btn');

  startBtn.disabled = true;
  setConvStatus('processing', 'Leyendo archivo…');

  try {
    // 1. Leer el archivo como ArrayBuffer
    const arrayBuffer = await readFileAsArrayBuffer(convFile, pct => {
      updateProgress(pct * 0.3, 'Leyendo archivo…');
    });

    updateProgress(30, 'Decodificando audio…');

    // 2. Decodificar con Web Audio API
    const audioCtx    = new (window.AudioContext || window.webkitAudioContext)({ sampleRate });
    const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);
    await audioCtx.close();

    updateProgress(70, 'Codificando WAV…');

    // 3. Mezclar canales según la selección
    const finalBuffer = mixChannels(audioBuffer, channels);

    // 4. Codificar a WAV PCM 16-bit
    const wavBlob = encodeWAV(finalBuffer);

    updateProgress(100, '¡Conversión completada!');

    // 5. Mostrar resultado
    const blobUrl  = URL.createObjectURL(wavBlob);
    showConvResult(outputName, wavBlob, blobUrl, audioBuffer.duration);

    // Historial
    convHistory.unshift({ name: outputName, size: wavBlob.size, url: blobUrl, duration: audioBuffer.duration });
    renderConvHistory();

    setConvStatus('done', `Conversión exitosa — ${formatFileSize(wavBlob.size)}`);
    Toast.show(`✓ "${outputName}" listo para descargar`, 'success');

  } catch (err) {
    console.error('[Converter]', err);
    const msg = err.message || 'Error desconocido';
    setConvStatus('error', `Error: ${msg}`);
    Toast.show(`Error en la conversión: ${msg}`, 'error');
  } finally {
    startBtn.disabled = false;
  }
}

function updateProgress(pct, label) {
  const fill  = document.getElementById('conv-progress-fill');
  const lbl   = document.getElementById('conv-progress-label');
  if (fill) fill.style.width  = Math.round(pct) + '%';
  if (lbl)  lbl.textContent   = label;
}

function showConvResult(name, blob, url, duration) {
  const card = document.getElementById('conv-result-card');
  const body = document.getElementById('conv-result-body');
  if (!card || !body) return;
  card.style.display = 'block';

  body.innerHTML = `
    <!-- Preview de audio -->
    <div style="margin-bottom:16px">
      <audio controls style="width:100%;border-radius:var(--radius-sm);accent-color:var(--accent-cyan)" src="${url}"></audio>
    </div>

    <!-- Info -->
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:16px;font-size:0.8rem">
      <div class="info-row" style="padding:6px 0"><span class="info-key">Archivo</span><span class="info-val" style="font-size:0.8rem;max-width:140px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${name}</span></div>
      <div class="info-row" style="padding:6px 0"><span class="info-key">Tamaño</span><span class="info-val">${formatFileSize(blob.size)}</span></div>
      <div class="info-row" style="padding:6px 0"><span class="info-key">Duración</span><span class="info-val">${formatDurationConv(duration)}</span></div>
      <div class="info-row" style="padding:6px 0"><span class="info-key">Formato</span><span class="info-val">WAV PCM 16-bit</span></div>
    </div>

    <!-- Acciones -->
    <div style="display:flex;gap:10px;flex-wrap:wrap">
      <a href="${url}" download="${name}" class="btn btn-primary" style="flex:1;justify-content:center">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
        Descargar WAV
      </a>
      <button class="btn btn-secondary" id="conv-send-to-podcasts" style="flex:1">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/></svg>
        Añadir a Podcasts
      </button>
    </div>
  `;

  // Botón "Añadir a Podcasts"
  document.getElementById('conv-send-to-podcasts')?.addEventListener('click', () => {
    const id = Date.now();
    const ep = {
      id, stationId: null,
      title: name.replace(/\.wav$/, ''),
      duration: formatDurationConv(duration),
      plays: 0,
      date: new Date().toISOString().slice(0, 10),
      emoji: '🎵', status: 'draft',
      description: 'Convertido desde video', streamUrl: ''
    };
    EpisodeAudioMap.set(id, url);
    RadioFM.data.podcasts.unshift(ep);
    RadioFM.save();
    Toast.show(`"${ep.title}" añadido a Podcasts`, 'success');
    Router.navigate('podcasts');
  });
}

function renderConvHistory() {
  const card = document.getElementById('conv-history-card');
  const list = document.getElementById('conv-history-list');
  if (!card || !list || !convHistory.length) return;
  card.style.display = 'block';
  list.innerHTML = convHistory.map((h, i) => `
    <div style="display:flex;align-items:center;gap:10px;padding:8px 0;border-bottom:1px solid var(--border-subtle)">
      <span style="font-size:1rem">🎵</span>
      <div style="flex:1;min-width:0">
        <div style="font-size:0.875rem;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${h.name}</div>
        <div style="font-size:0.75rem;color:var(--text-muted)">${formatFileSize(h.size)} · ${formatDurationConv(h.duration)}</div>
      </div>
      <a href="${h.url}" download="${h.name}" class="btn btn-secondary btn-sm btn-icon" title="Descargar">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
      </a>
    </div>
  `).join('');
}

// ---- UTILIDADES DE CONVERSIÓN ----

function readFileAsArrayBuffer(file, onProgress) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload  = e => resolve(e.target.result);
    reader.onerror = e => reject(new Error('No se pudo leer el archivo'));
    reader.onprogress = e => { if (e.lengthComputable) onProgress(e.loaded / e.total); };
    reader.readAsArrayBuffer(file);
  });
}

function mixChannels(audioBuffer, targetChannels) {
  // Si ya tiene los canales deseados, devolver directo
  if (audioBuffer.numberOfChannels === targetChannels) return audioBuffer;

  const ctx = new OfflineAudioContext(targetChannels, audioBuffer.length, audioBuffer.sampleRate);
  const src = ctx.createBufferSource();
  src.buffer = audioBuffer;
  src.connect(ctx.destination);
  src.start(0);
  // Nota: OfflineAudioContext.startRendering() es async pero devolvemos el buffer original
  // ya mezclado por Web Audio internamente. Para mayor fidelidad usamos la conversión manual:
  const out   = new AudioBuffer({ length: audioBuffer.length, sampleRate: audioBuffer.sampleRate, numberOfChannels: targetChannels });
  const inCh  = audioBuffer.numberOfChannels;

  for (let c = 0; c < targetChannels; c++) {
    const outData = out.getChannelData(c);
    if (inCh === 1) {
      // Mono → Estéreo: copiar el mismo canal
      outData.set(audioBuffer.getChannelData(0));
    } else if (targetChannels === 1) {
      // Estéreo → Mono: promediar todos los canales
      for (let i = 0; i < audioBuffer.length; i++) {
        let sum = 0;
        for (let j = 0; j < inCh; j++) sum += audioBuffer.getChannelData(j)[i];
        outData[i] = sum / inCh;
      }
    } else {
      // n → m: usar canal disponible o silencio
      outData.set(audioBuffer.getChannelData(Math.min(c, inCh - 1)));
    }
  }
  return out;
}

function encodeWAV(audioBuffer) {
  const numChannels = audioBuffer.numberOfChannels;
  const sampleRate  = audioBuffer.sampleRate;
  const numSamples  = audioBuffer.length;
  const bytesPerSample = 2; // 16-bit
  const blockAlign  = numChannels * bytesPerSample;
  const dataBytes   = numSamples * blockAlign;
  const buffer      = new ArrayBuffer(44 + dataBytes);
  const view        = new DataView(buffer);

  // WAV header
  writeStr(view, 0,  'RIFF');
  view.setUint32(4,  36 + dataBytes, true);
  writeStr(view, 8,  'WAVE');
  writeStr(view, 12, 'fmt ');
  view.setUint32(16, 16, true);           // chunk size
  view.setUint16(20, 1,  true);           // PCM format
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate,  true);
  view.setUint32(28, sampleRate * blockAlign, true); // byte rate
  view.setUint16(32, blockAlign,  true);
  view.setUint16(34, 16, true);           // bits per sample
  writeStr(view, 36, 'data');
  view.setUint32(40, dataBytes, true);

  // PCM samples (interleaved)
  let offset = 44;
  for (let i = 0; i < numSamples; i++) {
    for (let ch = 0; ch < numChannels; ch++) {
      const sample = audioBuffer.getChannelData(ch)[i];
      // Clamp y convertir float32 → int16
      const int16  = Math.max(-32768, Math.min(32767, Math.round(sample * 32767)));
      view.setInt16(offset, int16, true);
      offset += 2;
    }
  }

  return new Blob([buffer], { type: 'audio/wav' });
}

function writeStr(view, offset, str) {
  for (let i = 0; i < str.length; i++) {
    view.setUint8(offset + i, str.charCodeAt(i));
  }
}

// ---- FORMAT HELPERS ----
function formatFileSize(bytes) {
  if (bytes >= 1073741824) return (bytes / 1073741824).toFixed(1) + ' GB';
  if (bytes >= 1048576)    return (bytes / 1048576).toFixed(1) + ' MB';
  if (bytes >= 1024)       return (bytes / 1024).toFixed(1) + ' KB';
  return bytes + ' B';
}

function formatDurationConv(seconds) {
  const s = Math.floor(seconds);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (h > 0) return `${h}:${String(m).padStart(2,'0')}:${String(sec).padStart(2,'0')}`;
  return `${m}:${String(sec).padStart(2,'0')}`;
}
