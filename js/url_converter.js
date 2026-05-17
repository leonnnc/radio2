/* ============================================
   RADIOFM — URL CONVERTER
   Usa el servidor (server.js + yt-dlp)
   para descargar audio de YouTube, Facebook, etc.
   ============================================ */

// Forzar el uso del servidor en la nube para probar si Render funciona correctamente
const LOCAL_SERVER = 'https://radio2-zqaq.onrender.com';

const URL_PLATFORMS = [
  { id:'youtube',    re:/youtube\.com|youtu\.be/,   icon:'▶️', name:'YouTube'    },
  { id:'facebook',   re:/facebook\.com|fb\.watch/,  icon:'📘', name:'Facebook'   },
  { id:'instagram',  re:/instagram\.com/,            icon:'📸', name:'Instagram'  },
  { id:'tiktok',     re:/tiktok\.com/,               icon:'🎵', name:'TikTok'     },
  { id:'twitter',    re:/twitter\.com|x\.com/,       icon:'🐦', name:'Twitter/X'  },
  { id:'twitch',     re:/twitch\.tv/,                icon:'🎮', name:'Twitch'     },
  { id:'vimeo',      re:/vimeo\.com/,                icon:'📺', name:'Vimeo'      },
  { id:'soundcloud', re:/soundcloud\.com/,           icon:'🎶', name:'SoundCloud' },
];

function detectPlatform(url) {
  return URL_PLATFORMS.find(p => p.re.test(url)) || null;
}

// Verifica si el servidor local está corriendo
async function checkLocalServer() {
  try {
    const r = await fetch(`${LOCAL_SERVER}/health`, { signal: AbortSignal.timeout(2000) });
    return r.ok;
  } catch {
    return false;
  }
}

function initUrlConverter() {
  const input    = document.getElementById('conv-url-input');
  const btnAudio = document.getElementById('conv-url-btn-audio');
  const btnVideo = document.getElementById('conv-url-btn-video');

  input?.addEventListener('input', () => {
    const p     = detectPlatform(input.value.trim());
    const badge = document.getElementById('url-platform-badge');
    if (badge) {
      badge.innerHTML = p
        ? `<span class="badge badge-pro">${p.icon} ${p.name} detectado</span>`
        : (input.value.trim() ? `<span class="badge badge-offline">Plataforma no reconocida</span>` : '');
    }
  });

  btnAudio?.addEventListener('click', () => extractFromUrl('audio'));
  btnVideo?.addEventListener('click', () => extractFromUrl('video'));
  input?.addEventListener('keydown', e => { if (e.key === 'Enter') extractFromUrl('audio'); });
  // NO llamar checkServerStatus() aquí — se llama al abrir la pestaña URL
}

async function checkServerStatus() {
  const ok = await checkLocalServer();
  const hint = document.getElementById('url-server-hint');
  if (!hint) return;
  if (ok) {
    hint.innerHTML = `<span style="color:var(--accent-green)">✓ Servidor local activo</span>`;
  } else {
    hint.innerHTML = `
      <span style="color:var(--accent-red)">✗ Servidor no detectado</span> —
      Abre una terminal y ejecuta:<br>
      <code style="color:var(--accent-cyan);background:var(--bg-tertiary);padding:2px 8px;border-radius:4px;display:inline-block;margin-top:4px">
        node /Users/leonnnc/Documents/web/radio2/server.js
      </code>
    `;
  }
}

function setUrlStatus(state, html) {
  const body = document.getElementById('url-status-body');
  if (!body) return;
  html = html || '';
  const icons = {
    ok:  `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--accent-green)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>`,
    err: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--accent-red)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>`,
  };
  const map = {
    idle:       `<div class="empty-state" style="padding:20px"><p style="color:var(--text-muted)">Pega un enlace y presiona Extraer Audio</p></div>`,
    processing: `<div style="display:flex;align-items:center;gap:10px;padding:8px 0"><div class="spinner"></div><span style="font-size:0.875rem">${html}</span></div>`,
    done:       `<div style="display:flex;align-items:center;gap:10px;padding:8px 0">${icons.ok}<span style="color:var(--accent-green);font-size:0.875rem;font-weight:600">${html}</span></div>`,
    error:      `<div style="display:flex;align-items:flex-start;gap:10px;padding:8px 0">${icons.err}<div style="font-size:0.875rem;line-height:1.6;color:var(--accent-red)">${html}</div></div>`,
  };
  body.innerHTML = map[state] || map.idle;
}

async function extractFromUrl(type = 'audio') {
  const input    = document.getElementById('conv-url-input');
  const nameEl   = document.getElementById('conv-url-name');
  const btnAudio = document.getElementById('conv-url-btn-audio');
  const btnVideo = document.getElementById('conv-url-btn-video');
  const url      = input?.value.trim();

  if (!url) { Toast.show('Pega un enlace primero', 'error'); return; }

  const platform = detectPlatform(url);
  if (!platform) {
    Toast.show('Plataforma no reconocida. Prueba YouTube, Facebook, TikTok...', 'error');
    return;
  }

  if (btnAudio) btnAudio.disabled = true;
  if (btnVideo) btnVideo.disabled = true;
  const resultCard = document.getElementById('url-result-card');
  if (resultCard) resultCard.style.display = 'none';

  // 1. Verificar servidor
  setUrlStatus('processing', 'Verificando servidor local…');
  const serverOk = await checkLocalServer();

  if (!serverOk) {
    setUrlStatus('error', `
      El servidor local no está activo.<br>
      <strong>Solución:</strong> Abre una terminal y ejecuta:<br>
      <code style="color:var(--accent-cyan);background:var(--bg-tertiary);padding:3px 8px;border-radius:4px;display:inline-block;margin-top:6px">
        node /Users/leonnnc/Documents/web/radio2/server.js
      </code><br>
      <span style="font-size:0.8rem;opacity:0.7;margin-top:4px;display:block">
        Déjalo corriendo y vuelve a intentarlo.
      </span>
    `);
    if (btnAudio) btnAudio.disabled = false;
    if (btnVideo) btnVideo.disabled = false;
    return;
  }

  // 2. Obtener metadata primero (para el nombre del archivo)
  let title = nameEl?.value.trim() || '';
  try {
    setUrlStatus('processing', `Obteniendo info del video…`);
    const infoRes = await fetch(`${LOCAL_SERVER}/info`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url }),
      signal: AbortSignal.timeout(15000),
    });
    if (infoRes.ok) {
      const info = await infoRes.json();
      if (!title && info.title) {
        title = info.title.replace(/[/\\?%*:|"<>]/g, '-').slice(0, 60);
        if (nameEl) nameEl.value = title;
      }
      if (info.thumbnail) {
        const thumb = document.getElementById('url-video-thumb');
        if (thumb) { thumb.src = info.thumbnail; thumb.style.display = 'block'; }
      }
    }
  } catch { /* continuar sin metadata */ }

  const ext = type === 'audio' ? '.mp3' : '.mp4';
  const filename = (title || platform.name.toLowerCase() + '-' + type) + ext;

  // 3. Descargar media
  setUrlStatus('processing', `${platform.icon} Descargando ${type} de ${platform.name}… (puede tardar de 30 a 90 segundos)`);

  try {
    const endpoint = type === 'audio' ? '/download' : '/download-video';
    const dlRes = await fetch(`${LOCAL_SERVER}${endpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url }),
      signal: AbortSignal.timeout(200000), // 3 min timeout
    });

    if (!dlRes.ok) {
      const errData = await dlRes.json().catch(() => ({}));
      throw new Error(errData.error || `HTTP ${dlRes.status}`);
    }

    // Leer respuesta como blob
    const blob    = await dlRes.blob();
    const blobUrl = URL.createObjectURL(blob);

    setUrlStatus('done', `¡${type === 'audio' ? 'Audio' : 'Video'} descargado! ${platform.icon} ${platform.name} · ${formatFileSize(blob.size)}`);
    showUrlResult(blobUrl, filename, platform, blob.size, type);
    Toast.show(`✓ "${filename}" listo`, 'success');

  } catch (err) {
    console.error('[URL Converter]', err);
    const msg = err.name === 'TimeoutError'
      ? 'La descarga tardó demasiado. Intenta con un video más corto.'
      : (err.message || 'Error desconocido');

    setUrlStatus('error', `Error al descargar: <em>${msg}</em>`);
    Toast.show(`Error al descargar el ${type}`, 'error');
  } finally {
    if (btnAudio) btnAudio.disabled = false;
    if (btnVideo) btnVideo.disabled = false;
  }
}

function showUrlResult(mediaUrl, filename, platform, size, type = 'audio') {
  const card = document.getElementById('url-result-card');
  const body = document.getElementById('url-result-body');
  if (!card || !body) return;
  card.style.display = 'block';

  const isAudio = type === 'audio';
  const mediaElement = isAudio 
    ? `<audio controls style="width:100%;margin-bottom:14px;accent-color:var(--accent-cyan)" src="${mediaUrl}"></audio>`
    : `<video controls style="width:100%;max-height:300px;background:#000;border-radius:var(--radius-sm);margin-bottom:14px" src="${mediaUrl}"></video>`;

  body.innerHTML = `
    ${mediaElement}
    <div style="font-size:0.8rem;color:var(--text-secondary);margin-bottom:12px">
      📦 ${formatFileSize(size)} · ${isAudio ? 'MP3' : 'MP4'} · ${platform.icon} ${platform.name}
    </div>
    <div style="display:flex;gap:10px;flex-wrap:wrap">
      <a href="${mediaUrl}" download="${filename}" class="btn btn-primary" style="flex:1;justify-content:center">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
        Descargar ${isAudio ? 'MP3' : 'MP4'}
      </a>
      ${isAudio ? `
      <button class="btn btn-secondary" id="url-to-player" style="flex:1">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><polygon points="5,3 19,12 5,21"/></svg>
        Escuchar en Player
      </button>
      <button class="btn btn-secondary" id="url-to-podcast" style="flex:1">
        🎙️ Añadir a Podcasts
      </button>
      ` : ''}
    </div>
  `;

  if (isAudio) {
    document.getElementById('url-to-player')?.addEventListener('click', () => {
      Player.play(
        { name: filename.replace('.mp3',''), emoji: platform.icon, genre: platform.name, status: 'podcast', listeners: 0 },
        mediaUrl
      );
      Toast.show(`▶ Reproduciendo desde ${platform.name}`, 'info');
    });

    document.getElementById('url-to-podcast')?.addEventListener('click', () => {
      const id = Date.now();
      EpisodeAudioMap.set(id, mediaUrl);
      RadioFM.data.podcasts.unshift({
        id, stationId: null,
        title: filename.replace('.mp3',''),
        duration: '?:??', plays: 0,
        date: new Date().toISOString().slice(0,10),
        emoji: platform.icon, status: 'draft',
        description: `Descargado de ${platform.name}`, streamUrl: '',
      });
      RadioFM.save();
      Toast.show(`"${filename.replace('.mp3','')}" añadido a Podcasts`, 'success');
      Router.navigate('podcasts');
    });
  }
}

function formatFileSize(bytes) {
  if (!bytes) return '?';
  if (bytes >= 1048576) return (bytes / 1048576).toFixed(1) + ' MB';
  if (bytes >= 1024)    return (bytes / 1024).toFixed(1) + ' KB';
  return bytes + ' B';
}
