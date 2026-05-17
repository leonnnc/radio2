/* ============================================
   RADIOFM — PLAYER JS (Sin simulaciones)
   Solo reproduce audio real.
   ============================================ */

const Player = (() => {
  let audio = null;
  let currentStation = null;
  let isPlaying = false;

  const el = {
    player:    () => document.getElementById('global-player'),
    art:       () => document.getElementById('player-art'),
    title:     () => document.getElementById('player-title'),
    subtitle:  () => document.getElementById('player-subtitle'),
    playPause: () => document.getElementById('btn-play-pause'),
    seekFill:  () => document.getElementById('player-seek-fill'),
    seekTrack: () => document.getElementById('player-seek'),
    timeEl:    () => document.getElementById('player-time-cur'),
    totalEl:   () => document.getElementById('player-time-total'),
    volume:    () => document.getElementById('player-volume'),
    eqBars:    () => document.getElementById('player-eq'),
  };

  function init() {
    audio = new Audio();
    audio.preload = 'metadata';

    audio.addEventListener('timeupdate',     onTimeUpdate);
    audio.addEventListener('loadedmetadata', onMetadata);
    audio.addEventListener('ended',          onEnded);
    audio.addEventListener('error',          onError);
    audio.addEventListener('playing',        () => { setPlayState(true);  showEqualizer(true); });
    audio.addEventListener('pause',          () => { setPlayState(false); showEqualizer(false); });
    audio.addEventListener('waiting',        () => showLoading(true));
    audio.addEventListener('canplay',        () => showLoading(false));

    // Volumen
    const vol = el.volume();
    if (vol) {
      vol.value = 80;
      audio.volume = 0.8;
      vol.addEventListener('input', e => { audio.volume = e.target.value / 100; });
    }

    // Seek
    el.seekTrack()?.addEventListener('click', onSeekClick);

    // Botones de control
    el.playPause()?.addEventListener('click', togglePlay);
    document.getElementById('btn-prev')?.addEventListener('click', () => skip(-10));
    document.getElementById('btn-next')?.addEventListener('click', () => skip(10));
  }

  function play(station, streamUrl) {
    // Si no hay URL real, informar al usuario y no hacer nada más
    if (!streamUrl) {
      Toast.show('Esta estación no tiene URL de stream configurada.', 'error');
      return;
    }

    currentStation = station;

    // Mostrar player
    el.player()?.classList.remove('hidden');

    // Actualizar UI
    const art   = el.art();
    const title = el.title();
    const sub   = el.subtitle();

    if (art) {
      if (station.image) {
        art.innerHTML = `<img src="${station.image}" style="width:100%;height:100%;object-fit:cover;border-radius:var(--radius-sm)">`;
      } else {
        art.textContent = station.emoji || '📻';
      }
    }
    if (title) title.textContent = station.name;
    if (sub) {
      const isLive = station.status === 'live';
      sub.innerHTML = `
        ${isLive ? '<span class="badge badge-live" style="font-size:0.65rem">LIVE</span>' : ''}
        ${station.genre}${station.listeners > 0 ? ' • ' + station.listeners.toLocaleString() + ' oyentes' : ''}
      `;
    }
    art?.classList.toggle('playing', station.status === 'live');

    // Configurar crossOrigin solo para URLs remotas (no blob:)
    if (streamUrl.startsWith('blob:')) {
      audio.removeAttribute('crossorigin');
    } else {
      audio.crossOrigin = 'anonymous';
    }

    // Resetear tiempos
    const timeEl = el.timeEl();
    const totEl  = el.totalEl();
    const fill   = el.seekFill();
    if (timeEl) timeEl.textContent = '0:00';
    if (totEl)  totEl.textContent  = '…';
    if (fill)   fill.style.width   = '0%';

    audio.src = streamUrl;
    audio.load();
    audio.play().catch(err => {
      console.error('[RadioFM] Error al reproducir:', err);
      Toast.show(`No se pudo reproducir: ${err.message || 'formato no compatible'}`, 'error');
      setPlayState(false);
      showEqualizer(false);
    });
  }

  function togglePlay() {
    if (!audio.src) return;
    if (isPlaying) {
      audio.pause();
    } else {
      audio.play().catch(err => {
        Toast.show(`Error: ${err.message}`, 'error');
      });
    }
  }

  function skip(seconds) {
    if (audio.src && audio.duration && isFinite(audio.duration)) {
      audio.currentTime = Math.max(0, Math.min(audio.currentTime + seconds, audio.duration));
    }
  }

  function setPlayState(playing) {
    isPlaying = playing;
    const pp = el.playPause();
    if (!pp) return;
    pp.innerHTML = playing
      ? `<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>`
      : `<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><polygon points="5,3 19,12 5,21"/></svg>`;
  }

  function showEqualizer(show) {
    const eq = el.eqBars();
    if (eq) eq.style.display = show ? 'flex' : 'none';
  }

  function showLoading(state) {
    const pp = el.playPause();
    if (!pp) return;
    if (state) {
      pp.innerHTML = `<div class="spinner" style="width:16px;height:16px;border-width:2px"></div>`;
    }
  }

  function onTimeUpdate() {
    if (!audio.duration || !isFinite(audio.duration)) return;
    const pct    = (audio.currentTime / audio.duration) * 100;
    const fill   = el.seekFill();
    const timeEl = el.timeEl();
    if (fill)   fill.style.width = pct + '%';
    if (timeEl) timeEl.textContent = formatTime(audio.currentTime);
  }

  function onMetadata() {
    const totEl = el.totalEl();
    if (totEl) {
      totEl.textContent = isFinite(audio.duration) ? formatTime(audio.duration) : '∞';
    }
  }

  function onEnded() {
    setPlayState(false);
    showEqualizer(false);
    const fill = el.seekFill();
    if (fill) fill.style.width = '0%';
  }

  function onError() {
    const err  = audio.error;
    const msgs = { 1:'Abortado', 2:'Error de red', 3:'Error de decodificación', 4:'Formato no compatible' };
    const msg  = err ? (msgs[err.code] || `Código ${err.code}`) : 'Error desconocido';
    console.error('[RadioFM] MediaError:', err);
    Toast.show(`Error de audio: ${msg}`, 'error');
    setPlayState(false);
    showEqualizer(false);
  }

  function onSeekClick(e) {
    if (!audio.duration || !isFinite(audio.duration)) return;
    const rect = e.currentTarget.getBoundingClientRect();
    audio.currentTime = ((e.clientX - rect.left) / rect.width) * audio.duration;
  }

  function formatTime(s) {
    s = Math.floor(s);
    const h   = Math.floor(s / 3600);
    const m   = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    if (h > 0) return `${h}:${String(m).padStart(2,'0')}:${String(sec).padStart(2,'0')}`;
    return `${m}:${String(sec).padStart(2,'0')}`;
  }

  function stop() {
    audio.pause();
    audio.src = '';
    setPlayState(false);
    showEqualizer(false);
    el.player()?.classList.add('hidden');
    currentStation = null;
  }

  function getCurrent()   { return currentStation; }
  function getIsPlaying() { return isPlaying; }

  return { init, play, stop, togglePlay, getCurrent, getIsPlaying };
})();
