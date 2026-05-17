/* ============================================
   RADIOFM — DATA LAYER (Producción)
   Sin datos de demostración.
   Todo se guarda en localStorage.
   ============================================ */

const RadioFM = {

  data: {
    stations: [],
    podcasts: [],
    people:   [],

    analyticsWeek: [0, 0, 0, 0, 0, 0, 0],
    analyticsDays: ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'],

    genreStats: [],

    user: {
      name:     'Mi Nombre',
      email:    '',
      plan:     'Free',
      initials: 'DJ',
      joined:   new Date().getFullYear().toString(),
      timezone: 'America/Bogota (UTC-5)',
      language: 'Español'
    }
  },

  // ---- COMPUTED ----
  getStats() {
    const live          = this.data.stations.filter(s => s.status === 'live');
    const totalListeners = live.reduce((a, s) => a + (s.listeners || 0), 0);
    const totalPlays    = this.data.stations.reduce((a, s) => a + (s.totalPlays || 0), 0);
    const peakListeners = this.data.stations.reduce((m, s) => Math.max(m, s.peak || 0), 0);
    return { totalListeners, liveCount: live.length, totalPlays, peakListeners };
  },

  // Recalcula genreStats desde las estaciones reales
  refreshGenreStats() {
    const counts = {};
    const colors = {
      'Pop / Hits':           '#f59e0b',
      'Rock / Indie':         '#e879f9',
      'Hip Hop / R&B':        '#06b6d4',
      'Electronic / House':   '#10b981',
      'Reggaeton / Salsa':    '#ef4444',
      'Jazz / Blues':         '#8b5cf6',
      'Clásica':              '#a78bfa',
      'Otro':                 '#64748b',
    };
    this.data.stations.forEach(s => {
      counts[s.genre] = (counts[s.genre] || 0) + 1;
    });
    const total = Object.values(counts).reduce((a, v) => a + v, 0) || 1;
    this.data.genreStats = Object.entries(counts).map(([name, n]) => ({
      name,
      pct:   Math.round((n / total) * 100),
      color: colors[name] || '#64748b',
    }));
  },

  // ---- PERSISTENCIA localStorage ----
  save() {
    try {
      localStorage.setItem('radiofm_data_v2', JSON.stringify(this.data));
    } catch (e) { console.warn('[RadioFM] No se pudo guardar:', e); }
  },

  load() {
    try {
      const saved = localStorage.getItem('radiofm_data_v2');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.stations) this.data.stations = parsed.stations;
        if (parsed.podcasts) this.data.podcasts = parsed.podcasts;
        if (parsed.people)   this.data.people   = parsed.people;
        if (parsed.user)     this.data.user      = { ...this.data.user, ...parsed.user };
        if (parsed.analyticsWeek) this.data.analyticsWeek = parsed.analyticsWeek;
        this.refreshGenreStats();
      }
    } catch (e) { console.warn('[RadioFM] No se pudo cargar:', e); }
  },

  // ---- ESTACIONES ----
  addStation(station) {
    station.id         = Date.now();
    station.totalPlays = 0;
    station.peak       = 0;
    station.listeners  = 0;
    station.status     = 'offline';
    station.created    = new Date().toISOString().slice(0, 10);
    this.data.stations.push(station);
    this.refreshGenreStats();
    this.save();
    return station;
  },

  removeStation(id) {
    this.data.stations = this.data.stations.filter(s => s.id !== id);
    this.refreshGenreStats();
    this.save();
  },

  toggleStationStatus(id) {
    const s = this.data.stations.find(s => s.id === id);
    if (s) {
      s.status = s.status === 'live' ? 'offline' : 'live';
      s.listeners = s.status === 'live' ? 0 : 0;
      this.save();
    }
    return s;
  },

  // ---- PODCASTS ----
  addPodcast(ep) {
    ep.id   = Date.now();
    ep.date = new Date().toISOString().slice(0, 10);
    ep.plays = 0;
    this.data.podcasts.unshift(ep);
    this.save();
    return ep;
  },

  removePodcast(id) {
    this.data.podcasts = this.data.podcasts.filter(p => p.id !== id);
    this.save();
  },

  // ---- ANALYTICS: registrar una reproducción ----
  recordPlay(stationId) {
    const s = this.data.stations.find(s => s.id === stationId);
    if (s) {
      s.totalPlays = (s.totalPlays || 0) + 1;
      this.save();
    }
    // Incrementa el dia de hoy en la semana
    const dayIdx = new Date().getDay(); // 0=Dom..6=Sáb
    // Convertir a Lun=0
    const idx = (dayIdx + 6) % 7;
    this.data.analyticsWeek[idx] = (this.data.analyticsWeek[idx] || 0) + 1;
    this.save();
  }
};
