/* ============================================
   RADIOFM — DASHBOARD PAGE
   ============================================ */

function renderDashboard(container) {
  const stats = RadioFM.getStats();
  const liveStations = RadioFM.data.stations.filter(s => s.status === 'live');

  // Saludo dinámico por hora
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Buenos días' : hour < 19 ? 'Buenas tardes' : 'Buenas noches';
  const greetIcon = hour < 12 ? '🌅' : hour < 19 ? '☀️' : '🌙';
  const name = RadioFM.data.user.name !== 'Mi Nombre' ? RadioFM.data.user.name : '';

  container.innerHTML = `
    <!-- HERO BANNER -->
    <div style="
      position:relative;overflow:hidden;border-radius:var(--radius-xl);
      background:linear-gradient(135deg,#0d1b2e 0%,#0f0f1a 40%,#1a0d2e 100%);
      border:1px solid rgba(0,212,255,0.12);
      padding:32px 36px 28px;margin-bottom:28px;
    ">
      <!-- Ondas decorativas de fondo -->
      <div style="position:absolute;inset:0;overflow:hidden;pointer-events:none">
        <svg viewBox="0 0 800 200" preserveAspectRatio="none" style="position:absolute;bottom:0;left:0;width:100%;opacity:0.06">
          <path d="M0,100 C100,60 200,140 300,100 C400,60 500,140 600,100 C700,60 800,120 800,100 L800,200 L0,200Z" fill="url(#wg)"/>
          <path d="M0,120 C150,80 250,160 400,120 C550,80 650,150 800,120 L800,200 L0,200Z" fill="url(#wg)" opacity="0.5"/>
          <defs><linearGradient id="wg" x1="0%" y1="0%" x2="100%" y2="0%"><stop offset="0%" stop-color="#00d4ff"/><stop offset="100%" stop-color="#7c3aed"/></linearGradient></defs>
        </svg>
        <!-- Círculo glow -->
        <div style="position:absolute;top:-60px;right:80px;width:260px;height:260px;border-radius:50%;background:radial-gradient(circle,rgba(0,212,255,0.07) 0%,transparent 70%)"></div>
        <div style="position:absolute;bottom:-40px;left:30%;width:180px;height:180px;border-radius:50%;background:radial-gradient(circle,rgba(124,58,237,0.06) 0%,transparent 70%)"></div>
      </div>

      <!-- Contenido -->
      <div style="position:relative;display:flex;align-items:flex-start;justify-content:space-between;flex-wrap:wrap;gap:20px">
        <div>
          <!-- Saludo -->
          <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px">
            <span style="font-size:1.35rem">${greetIcon}</span>
            <span style="font-size:0.875rem;font-weight:500;color:var(--accent-cyan);letter-spacing:0.04em;text-transform:uppercase">${greeting}</span>
          </div>
          <h1 style="font-size:clamp(1.6rem,3vw,2.2rem);font-weight:800;line-height:1.15;margin-bottom:10px;background:linear-gradient(120deg,#fff 30%,var(--accent-cyan));-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text">
            ${name ? `${name},` : ''}<br style="${name ? '' : 'display:none'}">Tu Radio en Línea
          </h1>
          <p style="font-size:0.9rem;color:var(--text-secondary);max-width:420px;line-height:1.6">
            ${stats.liveCount > 0
              ? `Tienes <strong style="color:var(--accent-green)">${stats.liveCount} estación${stats.liveCount > 1 ? 'es' : ''} en vivo</strong> ahora mismo con <strong style="color:#fff">${stats.totalListeners.toLocaleString()} oyentes</strong> conectados.`
              : RadioFM.data.stations.length > 0
                ? 'Tus estaciones están en espera. Actívalas o sube música al <strong style="color:var(--accent-cyan)">Auto DJ</strong> para comenzar a transmitir.'
                : 'Crea tu primera estación y sube música para comenzar a transmitir en línea.'
            }
          </p>

          <!-- Mini live indicator -->
          ${stats.liveCount > 0 ? `
          <div style="display:flex;align-items:center;gap:8px;margin-top:14px">
            <div style="display:flex;gap:3px;align-items:flex-end;height:18px">
              ${[4,7,5,9,6,8,5,7].map(h=>`<div style="width:3px;height:${h}px;background:var(--accent-green);border-radius:2px;animation:eq-wave ${(Math.random()*0.4+0.5).toFixed(2)}s ease-in-out infinite alternate"></div>`).join('')}
            </div>
            <span style="font-size:0.8rem;color:var(--accent-green);font-weight:600">EN VIVO AHORA</span>
          </div>` : ''}
        </div>

        <!-- Botones acción -->
        <div style="display:flex;flex-direction:column;gap:10px;align-items:flex-end;flex-shrink:0">
          <button class="btn btn-primary" id="dash-new-station" style="min-width:168px;justify-content:center">
            ${Icons.plus} Nueva Estación
          </button>
          <button class="btn btn-secondary btn-sm" id="refresh-btn" style="min-width:168px;justify-content:center">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>
            Actualizar datos
          </button>
          ${RadioFM.data.stations.length === 0 ? `
          <button class="btn btn-ghost btn-sm" onclick="Router.navigate('converter')" style="min-width:168px;justify-content:center;color:var(--accent-cyan)">
            🎵 Convertir Audio
          </button>` : ''}
        </div>
      </div>
    </div>


    <!-- STAT CARDS -->
    <div class="grid-stats anim-stagger" id="stat-cards">
      <div class="card stat-card">
        <div class="stat-card-header">
          <span class="stat-label">Oyentes Activos</span>
          <div class="stat-icon" style="background:rgba(0,212,255,0.12);color:var(--accent-cyan)">
            ${Icons.users}
          </div>
        </div>
        <div class="stat-value" id="stat-listeners">0</div>
        <div class="stat-change" style="color:var(--text-muted);font-size:0.78rem">${stats.totalListeners > 0 ? 'Oyentes conectados ahora' : 'Sin transmisiones activas'}</div>
      </div>

      <div class="card stat-card">
        <div class="stat-card-header">
          <span class="stat-label">Estaciones Live</span>
          <div class="stat-icon" style="background:rgba(239,68,68,0.12);color:var(--accent-red)">
            ${Icons.station}
          </div>
        </div>
        <div class="stat-value" id="stat-live">0</div>
        <div class="stat-change up">${Icons.trendUp} ${liveStations.length} de ${RadioFM.data.stations.length} estaciones</div>
      </div>

      <div class="card stat-card">
        <div class="stat-card-header">
          <span class="stat-label">Total Reproducciones</span>
          <div class="stat-icon" style="background:rgba(124,58,237,0.12);color:var(--accent-purple)">
            ${Icons.music}
          </div>
        </div>
        <div class="stat-value" id="stat-plays">0</div>
        <div class="stat-change" style="color:var(--text-muted);font-size:0.78rem">${stats.totalPlays > 0 ? 'Total acumulado' : 'Sube música al Auto DJ para comenzar'}</div>
      </div>

      <div class="card stat-card">
        <div class="stat-card-header">
          <span class="stat-label">Pico de Oyentes</span>
          <div class="stat-icon" style="background:rgba(245,158,11,0.12);color:var(--accent-orange)">
            ${Icons.trendUp}
          </div>
        </div>
        <div class="stat-value" id="stat-peak">0</div>
        <div class="stat-change" style="color:var(--text-muted);font-size:0.78rem">${stats.peakListeners > 0 ? 'Pico histórico registrado' : 'Se registrará al transmitir'}</div>
      </div>
    </div>

    <!-- CHART + ACTIVITY -->
    <div class="grid-2" style="margin-bottom:24px">
      <div class="chart-card">
        <div class="chart-header">
          <div>
            <div class="chart-title">Oyentes Esta Semana</div>
            <div class="chart-subtitle">Oyentes únicos por día</div>
          </div>
          <div class="tabs">
            <button class="tab-btn active" data-period="week">Sem</button>
            <button class="tab-btn" data-period="month">Mes</button>
            <button class="tab-btn" data-period="year">Año</button>
          </div>
        </div>
        <div class="chart-wrapper">
          <canvas id="listeners-chart" height="200"></canvas>
        </div>
      </div>

      <div class="chart-card">
        <div class="chart-header">
          <div>
            <div class="chart-title">Géneros Populares</div>
            <div class="chart-subtitle">Por oyentes totales</div>
          </div>
        </div>
        <div class="bar-chart-wrapper" id="genre-bars"></div>
      </div>
    </div>

    <!-- LIVE STATIONS -->
    <div class="section-title">
      <div class="live-wave">
        <div class="live-wave-bar"></div>
        <div class="live-wave-bar"></div>
        <div class="live-wave-bar"></div>
        <div class="live-wave-bar"></div>
        <div class="live-wave-bar"></div>
      </div>
      Estaciones en Vivo
      <span onclick="Router.navigate('stations')">Ver todas →</span>
    </div>
    <div class="grid-auto anim-stagger" id="live-stations-grid"></div>

    <!-- RECENT PODCASTS -->
    <div class="section-title" style="margin-top:24px">
      ${Icons.podcast} Episodios Recientes
      <span onclick="Router.navigate('podcasts')">Ver todos →</span>
    </div>
    <div class="card" id="recent-podcasts"></div>
  `;

  // Animate counters
  setTimeout(() => {
    animateCounter(document.getElementById('stat-listeners'), stats.totalListeners);
    animateCounter(document.getElementById('stat-live'), stats.liveCount);
    animateCounter(document.getElementById('stat-plays'), stats.totalPlays);
    animateCounter(document.getElementById('stat-peak'), stats.peakListeners);
  }, 100);

  // Render chart
  setTimeout(() => drawListenersChart(), 200);

  // Render genre bars
  renderGenreBars();

  // Render live stations
  renderLiveStationsGrid();

  // Render recent podcasts
  renderRecentPodcasts();

  // Event listeners
  document.getElementById('refresh-btn')?.addEventListener('click', () => {
    Toast.show('Datos actualizados', 'success');
    renderDashboard(container);
  });

  document.getElementById('dash-new-station')?.addEventListener('click', () => {
    Router.navigate('stations');
    setTimeout(() => document.getElementById('btn-new-station')?.click(), 300);
  });

  // Chart period tabs
  document.querySelectorAll('.tab-btn[data-period]').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.tab-btn[data-period]').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      drawListenersChart(btn.dataset.period);
    });
  });
}

function drawListenersChart(period = 'week') {
  const canvas = document.getElementById('listeners-chart');
  if (!canvas) return;

  const ctx = canvas.getContext('2d');
  const dpr = window.devicePixelRatio || 1;
  const rect = canvas.parentElement.getBoundingClientRect();
  canvas.width  = rect.width * dpr;
  canvas.height = 200 * dpr;
  ctx.scale(dpr, dpr);

  const W = rect.width;
  const H = 200;
  const pad = { top: 20, right: 20, bottom: 30, left: 40 };

  const datasets = {
    week: {
      labels: RadioFM.data.analyticsDays,
      data:   RadioFM.data.analyticsWeek
    },
    month: {
      labels: ['S1','S2','S3','S4'],
      data:   [1840, 2120, 1980, 2450]
    },
    year: {
      labels: ['E','F','M','A','M','J','J','A','S','O','N','D'],
      data:   [8200,9100,7800,10200,11400,9800,12500,13100,11800,14200,13600,15800]
    }
  };

  const ds = datasets[period] || datasets.week;
  const { labels, data } = ds;
  const maxVal = Math.max(...data) * 1.15;

  const chartW = W - pad.left - pad.right;
  const chartH = H - pad.top  - pad.bottom;

  // Clear
  ctx.clearRect(0, 0, W, H);

  // Grid lines
  ctx.strokeStyle = 'rgba(255,255,255,0.05)';
  ctx.lineWidth = 1;
  for (let i = 0; i <= 4; i++) {
    const y = pad.top + (chartH / 4) * i;
    ctx.beginPath();
    ctx.moveTo(pad.left, y);
    ctx.lineTo(W - pad.right, y);
    ctx.stroke();

    // Labels
    ctx.fillStyle = 'rgba(139,156,196,0.8)';
    ctx.font = '11px Inter, sans-serif';
    ctx.textAlign = 'right';
    const val = Math.round(maxVal - (maxVal / 4) * i);
    ctx.fillText(fmtNum(val), pad.left - 6, y + 4);
  }

  // Points
  const pts = data.map((v, i) => ({
    x: pad.left + (i / (data.length - 1)) * chartW,
    y: pad.top  + chartH - (v / maxVal) * chartH
  }));

  // Area gradient
  const grad = ctx.createLinearGradient(0, pad.top, 0, H - pad.bottom);
  grad.addColorStop(0, 'rgba(0,212,255,0.25)');
  grad.addColorStop(1, 'rgba(0,212,255,0)');

  ctx.beginPath();
  ctx.moveTo(pts[0].x, H - pad.bottom);
  pts.forEach(p => ctx.lineTo(p.x, p.y));
  ctx.lineTo(pts[pts.length-1].x, H - pad.bottom);
  ctx.closePath();
  ctx.fillStyle = grad;
  ctx.fill();

  // Line
  ctx.beginPath();
  pts.forEach((p, i) => i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y));
  ctx.strokeStyle = '#00d4ff';
  ctx.lineWidth = 2.5;
  ctx.lineJoin = 'round';
  ctx.stroke();

  // Points
  pts.forEach((p, i) => {
    ctx.beginPath();
    ctx.arc(p.x, p.y, 4, 0, Math.PI*2);
    ctx.fillStyle = '#00d4ff';
    ctx.fill();
    ctx.strokeStyle = 'rgba(9,13,26,0.8)';
    ctx.lineWidth = 2;
    ctx.stroke();

    // X labels
    ctx.fillStyle = 'rgba(139,156,196,0.8)';
    ctx.font = '11px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(labels[i], p.x, H - pad.bottom + 16);
  });
}

function renderGenreBars() {
  const container = document.getElementById('genre-bars');
  if (!container) return;
  container.innerHTML = RadioFM.data.genreStats.map(g => `
    <div class="bar-row">
      <span class="bar-label">${g.name}</span>
      <div class="bar-track">
        <div class="bar-fill" style="width:0%;background:${g.color}" data-pct="${g.pct}"></div>
      </div>
      <span class="bar-value">${g.pct}%</span>
    </div>
  `).join('');

  setTimeout(() => {
    container.querySelectorAll('.bar-fill').forEach(el => {
      el.style.width = el.dataset.pct + '%';
    });
  }, 300);
}

function renderLiveStationsGrid() {
  const grid = document.getElementById('live-stations-grid');
  if (!grid) return;

  const live = RadioFM.data.stations.filter(s => s.status === 'live');
  if (!live.length) {
    grid.innerHTML = `<div class="empty-state" style="grid-column:1/-1">
      <div class="empty-state-icon">${Icons.station}</div>
      <h3>Sin estaciones en vivo</h3>
      <p>Activa tus estaciones para verlas aquí</p>
    </div>`;
    return;
  }

  grid.innerHTML = live.map(s => stationCardHTML(s)).join('');

  // Event listeners
  grid.querySelectorAll('.station-play-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = parseInt(btn.dataset.id);
      const station = RadioFM.data.stations.find(s => s.id === id);
      if (station) {
        Player.play(station, station.streamUrl);
        Toast.show(`▶ Reproduciendo ${station.name}`, 'info');
      }
    });
  });

  grid.querySelectorAll('.station-autodj-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = parseInt(btn.dataset.id);
      Router.navigate('autodj', id);
    });
  });
}

function renderRecentPodcasts() {
  const container = document.getElementById('recent-podcasts');
  if (!container) return;

  const published = RadioFM.data.podcasts.filter(p => p.status === 'published').slice(0, 4);
  container.innerHTML = published.map(ep => episodeRowHTML(ep)).join('');

  container.querySelectorAll('.ep-play-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = parseInt(btn.dataset.id);
      const ep = RadioFM.data.podcasts.find(p => p.id === id);
      if (!ep) return;

      // Buscar URL real: blob subido en esta sesión o streamUrl externo
      const audioUrl = (typeof EpisodeAudioMap !== 'undefined' && EpisodeAudioMap.get(id))
        || ep.streamUrl || '';

      if (!audioUrl) {
        Toast.show('Este episodio no tiene audio. Ve a Podcasts y súbelo.', 'error');
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

// ---- SHARED CARD TEMPLATES ----
function stationCardHTML(s) {
  const isLive = s.status === 'live';
  const coverBg = s.image 
    ? `background:url(${s.image}) center/cover no-repeat` 
    : `background:linear-gradient(135deg,${s.color}22,${s.color}44)`;

  return `
    <div class="station-card hover-lift">
      <div class="station-cover">
        <div class="station-cover-art" style="${coverBg}">
          ${s.image ? '' : `<span style="font-size:3rem">${s.emoji}</span>`}
        </div>
        <div class="station-cover-overlay"></div>
        ${isLive ? `<div class="station-cover-badge"><span class="badge badge-live">LIVE</span></div>` : ''}
        <div class="station-cover-play">
          <button class="play-circle station-play-btn" data-id="${s.id}">
            ${Icons.play}
          </button>
        </div>
        <div class="station-cover-listeners">
          ${Icons.users}
          ${s.listeners.toLocaleString()} oyentes
        </div>
      </div>
      <div class="station-body">
        <div class="station-name">${s.name}</div>
        <div class="station-genre">${s.genre}</div>
        <div class="station-meta">
          <span class="badge ${isLive ? 'badge-live' : 'badge-offline'}">
            ${isLive ? 'EN VIVO' : 'OFFLINE'}
          </span>
          <div class="station-actions">
            <button class="station-action-btn station-toggle-btn" data-id="${s.id}" data-tooltip="${isLive ? 'Detener' : 'Activar'}">
              ${isLive ? Icons.pause : Icons.play}
            </button>
            <button class="station-action-btn station-autodj-btn" data-id="${s.id}" data-tooltip="Auto DJ" style="color:var(--accent-cyan)">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>
            </button>
            <button class="station-action-btn station-edit-btn" data-id="${s.id}" data-tooltip="Editar">
              ${Icons.edit}
            </button>
            <button class="station-action-btn danger station-del-btn" data-id="${s.id}" data-tooltip="Eliminar">
              ${Icons.trash}
            </button>
          </div>
        </div>
      </div>
    </div>
  `;
}

function episodeRowHTML(ep) {
  return `
    <div class="episode-row">
      <div class="episode-thumb">${ep.emoji}</div>
      <div class="episode-info">
        <div class="episode-title">${ep.title}</div>
        <div class="episode-meta">
          <span>${Icons.clock} ${ep.duration}</span>
          <span>${Icons.users} ${ep.plays.toLocaleString()} plays</span>
          <span>📅 ${ep.date}</span>
        </div>
      </div>
      <div class="episode-actions">
        <span class="badge ${ep.status === 'published' ? 'badge-online' : 'badge-offline'}">
          ${ep.status === 'published' ? 'Publicado' : 'Borrador'}
        </span>
        <button class="btn btn-secondary btn-sm btn-icon ep-play-btn" data-id="${ep.id}">
          ${Icons.play}
        </button>
      </div>
    </div>
  `;
}
