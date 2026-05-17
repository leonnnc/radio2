/* ============================================
   RADIOFM — STATIONS PAGE
   ============================================ */

let editingStationId = null;

function renderStations(container) {
  container.innerHTML = `
    <div class="page-header">
      <div class="page-header-left">
        <h1>Mis Estaciones</h1>
        <p>${RadioFM.data.stations.length} estaciones registradas</p>
      </div>
      <button class="btn btn-primary" id="btn-new-station">${Icons.plus} Nueva Estación</button>
    </div>

    <div class="grid-auto anim-stagger" id="stations-grid"></div>

    <!-- Modal Nueva Estación -->
    <div class="modal-overlay" id="modal-new-station">
      <div class="modal">
        <div class="modal-header">
          <h2 class="modal-title">Nueva Estación</h2>
          <button class="modal-close" id="close-station-modal">${Icons.x}</button>
        </div>
        <div class="form-group">
          <label class="form-label">Nombre de la Estación</label>
          <input class="form-control" id="stn-name" placeholder="Ej: Tropical FM" />
        </div>
        <div class="form-group">
          <label class="form-label">Género Musical</label>
          <select class="form-control" id="stn-genre">
            <option>Pop / Hits</option><option>Rock / Indie</option><option>Hip Hop / R&amp;B</option>
            <option>Electronic / House</option><option>Reggaeton / Salsa</option>
            <option>Jazz / Blues</option><option>Clásica</option><option>Otro</option>
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">URL del Stream (opcional)</label>
          <input class="form-control" id="stn-url" placeholder="https://stream.ejemplo.com/radio" />
        </div>
        <div class="form-group">
          <label class="form-label">Emoji / Ícono (Si no usas imagen)</label>
          <input class="form-control" id="stn-emoji" placeholder="🎵" maxlength="2" value="📻" />
        </div>
        <div class="form-group">
          <label class="form-label">Imagen de Portada (Opcional)</label>
          <div style="display:flex;gap:10px;align-items:center">
            <div id="stn-img-preview" style="width:48px;height:48px;border-radius:var(--radius-sm);background:var(--bg-tertiary);display:flex;align-items:center;justify-content:center;overflow:hidden;flex-shrink:0">
              <span style="color:var(--text-muted);font-size:0.8rem">Sin Img</span>
            </div>
            <input type="file" id="stn-img-upload" accept="image/*" class="form-control" style="flex:1" />
            <input type="hidden" id="stn-img-b64" />
          </div>
        </div>
        <div class="form-group">
          <label class="form-label">Descripción</label>
          <textarea class="form-control" id="stn-desc" rows="3" placeholder="Describe tu estación..."></textarea>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" id="cancel-station-modal">Cancelar</button>
          <button class="btn btn-primary" id="save-station-btn">Crear Estación</button>
        </div>
      </div>
    </div>
  `;

  renderStationsGrid();
  bindStationsEvents();
}

function renderStationsGrid() {
  const grid = document.getElementById('stations-grid');
  if (!grid) return;

  if (!RadioFM.data.stations.length) {
    grid.innerHTML = `<div class="empty-state" style="grid-column:1/-1">
      <div class="empty-state-icon">${Icons.station}</div>
      <h3>Sin estaciones aún</h3>
      <p>Crea tu primera estación de radio</p>
      <button class="btn btn-primary" onclick="document.getElementById('btn-new-station').click()">
        ${Icons.plus} Crear Estación
      </button>
    </div>`;
    return;
  }

  grid.innerHTML = RadioFM.data.stations.map(s => stationCardHTML(s)).join('');

  grid.querySelectorAll('.station-play-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const s = RadioFM.data.stations.find(s => s.id === parseInt(btn.dataset.id));
      if (s) { Player.play(s, s.streamUrl); Toast.show(`▶ Reproduciendo ${s.name}`, 'info'); }
    });
  });

  grid.querySelectorAll('.station-toggle-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const s = RadioFM.toggleStationStatus(parseInt(btn.dataset.id));
      if (s) {
        Toast.show(s.status === 'live' ? `${s.name} ahora está EN VIVO` : `${s.name} desactivada`, s.status === 'live' ? 'success' : 'info');
        renderStationsGrid();
      }
    });
  });

  grid.querySelectorAll('.station-del-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = parseInt(btn.dataset.id);
      const s = RadioFM.data.stations.find(s => s.id === id);
      if (s && confirm(`¿Eliminar "${s.name}"?`)) {
        RadioFM.removeStation(id);
        Toast.show(`"${s.name}" eliminada`, 'success');
        renderStationsGrid();
      }
    });
  });

  grid.querySelectorAll('.station-autodj-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      Router.navigate('autodj', parseInt(btn.dataset.id));
    });
  });

  grid.querySelectorAll('.station-edit-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = parseInt(btn.dataset.id);
      const s = RadioFM.data.stations.find(st => st.id === id);
      if (s) {
        editingStationId = id;
        document.getElementById('stn-name').value = s.name || '';
        document.getElementById('stn-genre').value = s.genre || 'Otro';
        document.getElementById('stn-url').value = s.streamUrl || '';
        document.getElementById('stn-emoji').value = s.emoji || '📻';
        document.getElementById('stn-desc').value = s.description || '';
        
        const preview = document.getElementById('stn-img-preview');
        if (s.image) {
          document.getElementById('stn-img-b64').value = s.image;
          preview.innerHTML = `<img src="${s.image}" style="width:100%;height:100%;object-fit:cover" />`;
        } else {
          document.getElementById('stn-img-b64').value = '';
          preview.innerHTML = `<span style="color:var(--text-muted);font-size:0.8rem">Sin Img</span>`;
        }
        document.getElementById('stn-img-upload').value = '';

        document.querySelector('.modal-title').textContent = 'Editar Estación';
        document.getElementById('save-station-btn').textContent = 'Guardar Cambios';
        Modal.open('modal-new-station');
      }
    });
  });
}

function bindStationsEvents() {
  document.getElementById('btn-new-station')?.addEventListener('click', () => {
    editingStationId = null;
    document.getElementById('stn-name').value = '';
    document.getElementById('stn-genre').value = 'Pop / Hits';
    document.getElementById('stn-url').value = '';
    document.getElementById('stn-emoji').value = '📻';
    document.getElementById('stn-desc').value = '';
    document.getElementById('stn-img-b64').value = '';
    document.getElementById('stn-img-upload').value = '';
    document.getElementById('stn-img-preview').innerHTML = `<span style="color:var(--text-muted);font-size:0.8rem">Sin Img</span>`;
    
    document.querySelector('.modal-title').textContent = 'Nueva Estación';
    document.getElementById('save-station-btn').textContent = 'Crear Estación';
    Modal.open('modal-new-station');
  });

  document.getElementById('close-station-modal')?.addEventListener('click', () => Modal.close('modal-new-station'));
  document.getElementById('cancel-station-modal')?.addEventListener('click', () => Modal.close('modal-new-station'));

  document.getElementById('stn-img-upload')?.addEventListener('change', e => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_SIZE = 300;
        let w = img.width, h = img.height;
        if (w > h && w > MAX_SIZE) { h *= MAX_SIZE / w; w = MAX_SIZE; }
        else if (h > MAX_SIZE) { w *= MAX_SIZE / h; h = MAX_SIZE; }
        canvas.width = w; canvas.height = h;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, w, h);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
        document.getElementById('stn-img-b64').value = dataUrl;
        document.getElementById('stn-img-preview').innerHTML = `<img src="${dataUrl}" style="width:100%;height:100%;object-fit:cover" />`;
      };
      img.src = event.target.result;
    };
    reader.readAsDataURL(file);
  });

  document.getElementById('save-station-btn')?.addEventListener('click', () => {
    const name = document.getElementById('stn-name')?.value.trim();
    if (!name) { Toast.show('El nombre es obligatorio', 'error'); return; }
    const stationData = {
      name,
      genre: document.getElementById('stn-genre')?.value || 'Otro',
      streamUrl: document.getElementById('stn-url')?.value.trim() || '',
      emoji: document.getElementById('stn-emoji')?.value.trim() || '📻',
      description: document.getElementById('stn-desc')?.value.trim() || '',
      image: document.getElementById('stn-img-b64')?.value || null,
      color: '#00d4ff',
    };

    if (editingStationId) {
      RadioFM.updateStation(editingStationId, stationData);
      Toast.show(`"${name}" actualizada`, 'success');
    } else {
      RadioFM.addStation(stationData);
      Toast.show(`"${name}" creada exitosamente`, 'success');
    }

    Modal.close('modal-new-station');
    renderStationsGrid();
  });
}
