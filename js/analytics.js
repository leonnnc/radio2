/* ============================================
   RADIOFM — ANALYTICS PAGE
   ============================================ */

function renderAnalytics(container) {
  const stats = RadioFM.getStats();

  container.innerHTML = `
    <div class="page-header">
      <div class="page-header-left">
        <h1>Analíticas</h1>
        <p>Estadísticas de tu plataforma en los últimos 30 días</p>
      </div>
      <div class="tabs">
        <button class="tab-btn active" data-aperiod="week">7 días</button>
        <button class="tab-btn" data-aperiod="month">30 días</button>
        <button class="tab-btn" data-aperiod="year">12 meses</button>
      </div>
    </div>

    <div class="grid-stats anim-stagger" style="margin-bottom:24px">
      <div class="card stat-card">
        <div class="stat-card-header"><span class="stat-label">Oyentes Únicos</span></div>
        <div class="stat-value">4.2K</div>
        <div class="stat-change up">${Icons.trendUp} +18% vs periodo anterior</div>
      </div>
      <div class="card stat-card">
        <div class="stat-card-header"><span class="stat-label">Horas Escuchadas</span></div>
        <div class="stat-value">12.8K</div>
        <div class="stat-change up">${Icons.trendUp} +9.3%</div>
      </div>
      <div class="card stat-card">
        <div class="stat-card-header"><span class="stat-label">Sesiones</span></div>
        <div class="stat-value">31.4K</div>
        <div class="stat-change down">${Icons.trendDown} -2.1%</div>
      </div>
      <div class="card stat-card">
        <div class="stat-card-header"><span class="stat-label">Duración Media</span></div>
        <div class="stat-value">24m</div>
        <div class="stat-change up">${Icons.trendUp} +5.7%</div>
      </div>
    </div>

    <div class="analytics-grid">
      <div class="chart-card">
        <div class="chart-header">
          <div><div class="chart-title">Oyentes por Día</div><div class="chart-subtitle">Oyentes únicos diarios</div></div>
          <div class="chart-legend">
            <div class="legend-item"><div class="legend-dot" style="background:#00d4ff"></div>Oyentes</div>
            <div class="legend-item"><div class="legend-dot" style="background:#7c3aed"></div>Sesiones</div>
          </div>
        </div>
        <div class="chart-wrapper"><canvas id="analytics-chart" height="200"></canvas></div>
      </div>

      <div class="chart-card">
        <div class="chart-header"><div class="chart-title">Top Países</div></div>
        <div class="bar-chart-wrapper" id="country-bars"></div>
      </div>
    </div>

    <div class="grid-2" style="margin-top:20px">
      <div class="chart-card">
        <div class="chart-header"><div class="chart-title">Horas Pico</div><div class="chart-subtitle">Oyentes por hora del día</div></div>
        <div class="chart-wrapper"><canvas id="hourly-chart" height="160"></canvas></div>
      </div>
      <div class="chart-card">
        <div class="chart-header"><div class="chart-title">Top Estaciones</div></div>
        <div id="top-stations-list"></div>
      </div>
    </div>
  `;

  setTimeout(() => {
    drawAnalyticsChart();
    drawHourlyChart();
    renderCountryBars();
    renderTopStations();
  }, 150);

  document.querySelectorAll('.tab-btn[data-aperiod]').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.tab-btn[data-aperiod]').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      drawAnalyticsChart(btn.dataset.aperiod);
    });
  });
}

function drawAnalyticsChart(period = 'week') {
  const canvas = document.getElementById('analytics-chart');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const dpr = window.devicePixelRatio || 1;
  const rect = canvas.parentElement.getBoundingClientRect();
  canvas.width  = rect.width * dpr;
  canvas.height = 200 * dpr;
  ctx.scale(dpr, dpr);

  const W = rect.width, H = 200;
  const pad = { top:20, right:20, bottom:30, left:45 };
  const chartW = W - pad.left - pad.right;
  const chartH = H - pad.top - pad.bottom;

  const datasets = {
    week:  { labels: ['Lun','Mar','Mié','Jue','Vie','Sáb','Dom'], data1: [210,340,285,420,510,480,620], data2: [380,520,440,680,790,730,950] },
    month: { labels: ['S1','S2','S3','S4'], data1: [1840,2120,1980,2450], data2: [2900,3300,3100,3800] },
    year:  { labels: ['E','F','M','A','M','J','J','A','S','O','N','D'], data1: [8200,9100,7800,10200,11400,9800,12500,13100,11800,14200,13600,15800], data2: [12000,13500,11800,15000,17200,14900,18500,19800,17500,21500,20800,24000] },
  };
  const ds = datasets[period] || datasets.week;
  ctx.clearRect(0, 0, W, H);

  const maxVal = Math.max(...ds.data2) * 1.15;

  // Grid
  ctx.strokeStyle = 'rgba(255,255,255,0.05)';
  ctx.lineWidth = 1;
  for (let i = 0; i <= 4; i++) {
    const y = pad.top + (chartH / 4) * i;
    ctx.beginPath(); ctx.moveTo(pad.left, y); ctx.lineTo(W - pad.right, y); ctx.stroke();
    ctx.fillStyle = 'rgba(139,156,196,0.8)'; ctx.font = '11px Inter,sans-serif'; ctx.textAlign = 'right';
    ctx.fillText(fmtNum(Math.round(maxVal - (maxVal/4)*i)), pad.left - 6, y + 4);
  }

  function drawLine(data, color, alpha) {
    const pts = data.map((v, i) => ({
      x: pad.left + (i / (data.length-1)) * chartW,
      y: pad.top  + chartH - (v / maxVal) * chartH
    }));
    const grad = ctx.createLinearGradient(0, pad.top, 0, H - pad.bottom);
    grad.addColorStop(0, color.replace(')', `,${alpha})`).replace('rgb', 'rgba'));
    grad.addColorStop(1, color.replace(')', ',0)').replace('rgb', 'rgba'));
    ctx.beginPath(); ctx.moveTo(pts[0].x, H - pad.bottom);
    pts.forEach(p => ctx.lineTo(p.x, p.y));
    ctx.lineTo(pts[pts.length-1].x, H - pad.bottom);
    ctx.closePath(); ctx.fillStyle = grad; ctx.fill();
    ctx.beginPath(); pts.forEach((p,i) => i===0 ? ctx.moveTo(p.x,p.y) : ctx.lineTo(p.x,p.y));
    ctx.strokeStyle = color; ctx.lineWidth = 2.5; ctx.lineJoin = 'round'; ctx.stroke();
    pts.forEach((p, i) => {
      ctx.beginPath(); ctx.arc(p.x, p.y, 4, 0, Math.PI*2);
      ctx.fillStyle = color; ctx.fill();
      ctx.strokeStyle = 'rgba(9,13,26,0.9)'; ctx.lineWidth = 2; ctx.stroke();
      ctx.fillStyle = 'rgba(139,156,196,0.8)'; ctx.font = '11px Inter,sans-serif'; ctx.textAlign = 'center';
      ctx.fillText(ds.labels[i], p.x, H - pad.bottom + 16);
    });
  }

  drawLine(ds.data2, 'rgb(124,58,237)', 0.2);
  drawLine(ds.data1, 'rgb(0,212,255)',  0.25);
}

function drawHourlyChart() {
  const canvas = document.getElementById('hourly-chart');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const dpr = window.devicePixelRatio || 1;
  const rect = canvas.parentElement.getBoundingClientRect();
  canvas.width  = rect.width * dpr;
  canvas.height = 160 * dpr;
  ctx.scale(dpr, dpr);
  const W = rect.width, H = 160;
  const data = [12,8,5,3,2,4,18,42,65,78,72,60,55,70,80,85,90,88,76,82,70,58,40,22];
  const hours = ['0','','','3','','','6','','','9','','','12','','','15','','','18','','','21','',''];
  const max = Math.max(...data);
  const pad = {top:10,right:10,bottom:25,left:10};
  const bW = (W - pad.left - pad.right) / data.length;
  ctx.clearRect(0,0,W,H);
  data.forEach((v, i) => {
    const x = pad.left + i * bW;
    const h = ((v/max) * (H - pad.top - pad.bottom));
    const y = H - pad.bottom - h;
    const pct = v/max;
    const r = Math.round(0 + pct*124), g = Math.round(212 - pct*100), b = 255;
    ctx.fillStyle = `rgba(${r},${g},${b},0.7)`;
    const radius = Math.min(3, bW/2 - 1);
    ctx.beginPath();
    ctx.roundRect(x+1, y, bW-2, h, [radius,radius,0,0]);
    ctx.fill();
    if (hours[i]) {
      ctx.fillStyle = 'rgba(139,156,196,0.7)'; ctx.font = '10px Inter,sans-serif'; ctx.textAlign = 'center';
      ctx.fillText(hours[i], x + bW/2, H - 8);
    }
  });
}

function renderCountryBars() {
  const el = document.getElementById('country-bars');
  if (!el) return;
  const countries = [
    { name: '🇲🇽 México',    pct: 28, color: '#ef4444' },
    { name: '🇨🇴 Colombia',  pct: 22, color: '#f59e0b' },
    { name: '🇦🇷 Argentina', pct: 18, color: '#10b981' },
    { name: '🇪🇸 España',    pct: 14, color: '#06b6d4' },
    { name: '🇨🇱 Chile',     pct: 10, color: '#8b5cf6' },
    { name: '🇵🇪 Perú',      pct: 8,  color: '#ec4899' },
  ];
  el.innerHTML = countries.map(c => `
    <div class="bar-row">
      <span class="bar-label" style="width:110px">${c.name}</span>
      <div class="bar-track"><div class="bar-fill" style="width:0%;background:${c.color}" data-pct="${c.pct}"></div></div>
      <span class="bar-value">${c.pct}%</span>
    </div>
  `).join('');
  setTimeout(() => el.querySelectorAll('.bar-fill').forEach(b => b.style.width = b.dataset.pct+'%'), 300);
}

function renderTopStations() {
  const el = document.getElementById('top-stations-list');
  if (!el) return;
  const sorted = [...RadioFM.data.stations].sort((a,b) => b.totalPlays - a.totalPlays).slice(0,5);
  const max = sorted[0]?.totalPlays || 1;
  el.innerHTML = sorted.map((s,i) => `
    <div class="bar-row" style="padding:8px 0">
      <span style="width:20px;font-size:0.75rem;color:var(--text-muted);flex-shrink:0">#${i+1}</span>
      <span style="font-size:1.2rem;flex-shrink:0">${s.emoji}</span>
      <div style="flex:1;min-width:0">
        <div style="font-size:0.875rem;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${s.name}</div>
        <div class="bar-track" style="margin-top:4px">
          <div class="bar-fill" style="width:0%;background:${s.color}" data-pct="${Math.round((s.totalPlays/max)*100)}"></div>
        </div>
      </div>
      <span class="bar-value" style="width:55px">${fmtNum(s.totalPlays)}</span>
    </div>
  `).join('');
  setTimeout(() => el.querySelectorAll('.bar-fill').forEach(b => b.style.width = b.dataset.pct+'%'), 300);
}
