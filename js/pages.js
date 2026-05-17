/* ============================================
   RADIOFM — PEOPLE, ACCOUNT & PLANS PAGES
   ============================================ */

// ---- PEOPLE ----
function renderPeople(container) {
  container.innerHTML = `
    <div class="page-header">
      <div class="page-header-left">
        <h1>Audiencia</h1>
        <p>${RadioFM.data.people.length} oyentes registrados</p>
      </div>
      <div class="search-bar" style="width:240px">
        ${Icons.search}
        <input type="text" placeholder="Buscar oyentes..." id="people-search" />
      </div>
    </div>
    <div class="card">
      <div class="table-wrapper">
        <table class="table">
          <thead>
            <tr>
              <th>Oyente</th>
              <th>País</th>
              <th>Escuchas</th>
              <th>Favoritas</th>
              <th>Desde</th>
              <th>Rol</th>
            </tr>
          </thead>
          <tbody id="people-tbody"></tbody>
        </table>
      </div>
    </div>
  `;
  renderPeopleTable(RadioFM.data.people);
  document.getElementById('people-search')?.addEventListener('input', e => {
    const q = e.target.value.toLowerCase();
    const filtered = RadioFM.data.people.filter(p => p.name.toLowerCase().includes(q) || p.email.toLowerCase().includes(q));
    renderPeopleTable(filtered);
  });
}

function renderPeopleTable(people) {
  const tbody = document.getElementById('people-tbody');
  if (!tbody) return;
  if (!people.length) {
    tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;padding:40px;color:var(--text-muted)">Sin resultados</td></tr>`;
    return;
  }
  tbody.innerHTML = people.map(p => `
    <tr>
      <td>
        <div style="display:flex;align-items:center;gap:10px">
          <div class="person-avatar" style="background:${getGradient(p.name)}">${p.name.charAt(0)}</div>
          <div>
            <div style="font-weight:600">${p.name}</div>
            <div style="font-size:0.8rem;color:var(--text-muted)">${p.email}</div>
          </div>
        </div>
      </td>
      <td>${p.country}</td>
      <td><strong>${p.listens}</strong></td>
      <td>${p.fav}</td>
      <td style="color:var(--text-secondary)">${p.since}</td>
      <td>
        <span class="badge ${p.role === 'super' ? 'badge-pro' : 'badge-free'}">
          ${p.role === 'super' ? '⭐ Super' : 'Oyente'}
        </span>
      </td>
    </tr>
  `).join('');
}

// ---- ACCOUNT ----
function renderAccount(container) {
  const u = RadioFM.data.user;
  container.innerHTML = `
    <div class="page-header">
      <div class="page-header-left"><h1>Mi Cuenta</h1><p>Gestiona tu perfil y configuración</p></div>
      <button class="btn btn-primary" id="save-profile-btn">Guardar Cambios</button>
    </div>

    <div class="profile-header">
      <div class="profile-avatar-lg">${u.initials}</div>
      <div class="profile-details">
        <div class="profile-name">${u.name}</div>
        <div class="profile-email">${u.email}</div>
        <div class="profile-badges">
          <span class="badge badge-pro">Plan ${u.plan}</span>
          <span class="badge badge-online">Cuenta Activa</span>
        </div>
      </div>
      <button class="btn btn-secondary btn-sm">Cambiar Foto</button>
    </div>

    <div class="grid-2">
      <div class="card">
        <h3 style="margin-bottom:18px;font-size:1rem">Información Personal</h3>
        <div class="form-group">
          <label class="form-label">Nombre</label>
          <input class="form-control" id="acc-name" value="${u.name}" />
        </div>
        <div class="form-group">
          <label class="form-label">Email</label>
          <input class="form-control" id="acc-email" value="${u.email}" />
        </div>
        <div class="form-group">
          <label class="form-label">Zona Horaria</label>
          <select class="form-control">
            <option selected>${u.timezone}</option>
            <option>UTC-3 (Buenos Aires)</option>
            <option>UTC+1 (Madrid)</option>
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">Idioma</label>
          <select class="form-control"><option selected>Español</option><option>English</option></select>
        </div>
      </div>

      <div style="display:flex;flex-direction:column;gap:16px">
        <div class="card">
          <h3 style="margin-bottom:14px;font-size:1rem">Resumen de Cuenta</h3>
          <div class="info-row"><span class="info-key">Plan actual</span><span class="info-val"><span class="badge badge-pro">Pro</span></span></div>
          <div class="info-row"><span class="info-key">Miembro desde</span><span class="info-val">${u.joined}</span></div>
          <div class="info-row"><span class="info-key">Estaciones</span><span class="info-val">${RadioFM.data.stations.length}</span></div>
          <div class="info-row"><span class="info-key">Podcasts</span><span class="info-val">${RadioFM.data.podcasts.length}</span></div>
          <div class="info-row"><span class="info-key">Total oyentes</span><span class="info-val">${fmtNum(RadioFM.getStats().totalListeners)}</span></div>
        </div>
        <div class="card">
          <h3 style="margin-bottom:14px;font-size:1rem">Notificaciones</h3>
          ${[
            ['Alertas de oyentes', true],
            ['Reportes semanales', true],
            ['Nuevos seguidores', false],
            ['Actualizaciones del sistema', true],
          ].map(([label, on]) => `
            <div class="info-row">
              <span class="info-key">${label}</span>
              <label class="toggle"><input type="checkbox" ${on ? 'checked' : ''}><span class="toggle-slider"></span></label>
            </div>
          `).join('')}
        </div>
      </div>
    </div>

    <div class="card" style="margin-top:20px">
      <h3 style="margin-bottom:14px;font-size:1rem;color:var(--accent-red)">Zona de Peligro</h3>
      <div style="display:flex;gap:12px;flex-wrap:wrap">
        <button class="btn btn-danger btn-sm">Cambiar Contraseña</button>
        <button class="btn btn-danger btn-sm">Eliminar Cuenta</button>
      </div>
    </div>
  `;

  document.getElementById('save-profile-btn')?.addEventListener('click', () => {
    const name = document.getElementById('acc-name')?.value.trim();
    if (name) RadioFM.data.user.name = name;
    RadioFM.save();
    Toast.show('Perfil actualizado', 'success');
  });
}

// ---- PLANS ----
function renderPlans(container) {
  container.innerHTML = `
    <div class="page-header">
      <div class="page-header-left"><h1>Planes</h1><p>Elige el plan que mejor se adapte a tu proyecto</p></div>
      <div class="tabs">
        <button class="tab-btn active">Mensual</button>
        <button class="tab-btn">Anual <span class="badge badge-pro" style="margin-left:4px">-20%</span></button>
      </div>
    </div>

    <div class="plans-grid">
      ${[
        { name:'Free', price:0, desc:'Para creadores que están comenzando', color:'var(--text-secondary)', features:[
          ['1 estación de radio','✓'], ['Podcasts ilimitados','✓'], ['500 oyentes simultáneos','✓'],
          ['Analíticas básicas','✓'], ['Soporte por email','✓'], ['Dominio personalizado','✗'],
          ['Monetización','✗'], ['API access','✗'],
        ]},
        { name:'Pro', price:19, desc:'Para creadores profesionales y equipos pequeños', featured:true, color:'var(--accent-cyan)', features:[
          ['5 estaciones de radio','✓'], ['Podcasts ilimitados','✓'], ['5,000 oyentes simultáneos','✓'],
          ['Analíticas avanzadas','✓'], ['Soporte prioritario','✓'], ['Dominio personalizado','✓'],
          ['Monetización básica','✓'], ['API access','✗'],
        ]},
        { name:'Business', price:79, desc:'Para redes de radio y grandes empresas', color:'var(--accent-purple)', features:[
          ['Estaciones ilimitadas','✓'], ['Podcasts ilimitados','✓'], ['Oyentes ilimitados','✓'],
          ['Analíticas en tiempo real','✓'], ['Soporte 24/7 dedicado','✓'], ['Dominio personalizado','✓'],
          ['Monetización avanzada','✓'], ['API access completo','✓'],
        ]},
      ].map(p => `
        <div class="plan-card ${p.featured ? 'featured' : ''}">
          <div class="plan-name">${p.name}</div>
          <div class="plan-price" style="color:${p.color}">
            ${p.price === 0 ? 'Gratis' : `<sup>$</sup>${p.price}<span>/mes</span>`}
          </div>
          <div class="plan-desc">${p.desc}</div>
          <ul class="plan-features">
            ${p.features.map(([feat, avail]) => `
              <li class="plan-feature ${avail === '✗' ? 'disabled' : ''}">
                <div class="${avail === '✓' ? 'plan-feature-check' : 'plan-feature-x'}">
                  ${avail === '✓' ? Icons.check : Icons.x}
                </div>
                ${feat}
              </li>
            `).join('')}
          </ul>
          <button class="btn ${p.featured ? 'btn-primary' : 'btn-secondary'}" style="width:100%" onclick="Toast.show('Redirigiendo a checkout...','info')">
            ${RadioFM.data.user.plan === p.name ? '✓ Plan Actual' : `Elegir ${p.name}`}
          </button>
        </div>
      `).join('')}
    </div>

    <div class="card" style="margin-top:28px;text-align:center;padding:32px">
      <h3 style="margin-bottom:8px">¿Necesitas un plan personalizado?</h3>
      <p style="color:var(--text-secondary);margin-bottom:16px">Contáctanos para soluciones enterprise a medida</p>
      <button class="btn btn-secondary" onclick="Toast.show('Abriendo formulario de contacto...','info')">Contactar Ventas</button>
    </div>
  `;
}
