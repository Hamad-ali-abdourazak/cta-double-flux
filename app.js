// --- Données et état globaux ---
const state = {
  currentUser: JSON.parse(localStorage.getItem('currentUser')) || null,
  cta: {
    on: false,
    moteur: 5,
    vanneChaude: 0,
    vanneFroide: 0,
    tempNeuf: 18,
    tempSouffle: 20,
    tempRepris: 22,
    tendances: []
  },
  horaires: JSON.parse(localStorage.getItem('horaireCTA') || '[]'),
  conforts: { history: [] },
  compteurs: { history: [], period: 'day' }, // Ajout de la période de consommation
  eclairages: { history: [], etat: {}, horaires: JSON.parse(localStorage.getItem('horairesEclairage') || '[]') }, // Ajout des horaires
  meteo: { history: [] },
  alarmes: {
    data: [
      { id: 1, libelle: "Défaut CTA", niveau: "critique", icone: "bi-exclamation-octagon-fill", etat: "présente", acquittee: false, valide: true },
      { id: 2, libelle: "Filtre encrassé", niveau: "majeure", icone: "bi-exclamation-triangle-fill", etat: "absente", acquittee: false, valide: true },
      { id: 3, libelle: "Maintenance préventive", niveau: "mineure", icone: "bi-info-circle-fill", etat: "présente", acquittee: true, valide: true },
      { id: 4, libelle: "Sonde invalide", niveau: "invalide", icone: "bi-slash-circle-fill", etat: "présente", acquittee: false, valide: false }
    ],
    history: JSON.parse(localStorage.getItem('alarmesHistory') || '[]'),
    currentFilter: 'all'
  },
  evenements: JSON.parse(localStorage.getItem('evenementsHistory') || '[]'),
  chaud: {
    on: false,
    tempChaufferie: 0,
    tempExt: 0,
    pression: 0,
    reseaux: {
        r1: { consigne: 70, depart: 0, retour: 0, vanne: 0, pompe: false },
        r2: { consigne: 65, depart: 0, retour: 0, vanne: 0, pompe: false },
        r3: { depart: 0, retour: 0, debit: 0, pompe: false }
    },
    history: []
  }
};

// --- Initialisation et gestion des utilisateurs ---
if (!state.currentUser) {
  window.location.href = "login.html";
}

function updateRoleUI() {
  if (!state.currentUser) return;
  let badge = document.getElementById('user-badge');
  if (!badge) {
    badge = document.createElement('div');
    badge.id = 'user-badge';
    badge.style.position = 'fixed';
    badge.style.top = '10px';
    badge.style.right = '10px';
    badge.style.zIndex = 10000;
    badge.className = 'badge bg-primary';
    document.body.appendChild(badge);
  }
  badge.innerHTML = `Connecté : ${state.currentUser.login} (${state.currentUser.role}) <button id="logout" class="btn btn-sm btn-light ms-2">Déconnexion</button>`;
  document.getElementById('logout').onclick = function() {
    localStorage.removeItem('currentUser');
    window.location.href = "login.html";
  };
  // Désactiver les contrôles pour l'utilisateur "invite"
  if (state.currentUser.role === "invite") {
    document.querySelectorAll('.btn-danger, .btn-success, .btn-primary, input[type="range"], .form-check-input').forEach(btn => {
        if (!btn.id.includes('evenement')) { // Permettre l'ajout d'événements pour tous les rôles pour la démo
            btn.disabled = true;
        }
    });
    document.querySelectorAll('.form-select').forEach(select => select.disabled = true);
    // Désactiver la consigne général chaud et le bouton Valider
    const consigneInput = document.getElementById('consigne-general-chaud');
    const consigneBtn = document.getElementById('valider-consigne-general-chaud');
    if (consigneInput) consigneInput.disabled = true;
    if (consigneBtn) consigneBtn.disabled = true;
  }
}
updateRoleUI();

// --- Toast notifications améliorées ---
function showToast(msg, type = "success") {
  const container = document.getElementById('toast-container');
  const toast = document.createElement('div');
  toast.className = `toast align-items-center text-bg-${type} border-0 show mb-2`;
  const icon = type === 'success' ? '✅' : type === 'danger' ? '❌' : '⚠️';
  toast.innerHTML = `<div class="d-flex"><div class="toast-body">${icon} ${msg}</div></div>`;
  container.appendChild(toast);
  setTimeout(() => toast.remove(), 3500);
}

// --- Intégration de Chart.js ---
let chartCTA, chartCompteurs, chartMeteo, chartAlarmes, chartChaud;

function createChart(ctx, type, data, options) {
  return new Chart(ctx, { type, data, options });
}

function updateChart(chart, labels, datasets) {
  if (!chart) return;
  chart.data.labels = labels;
  chart.data.datasets = datasets;
  chart.update();
}

function updateChartCTA() {
  const data = state.cta.tendances.slice().reverse();
  const labels = data.map((h, i) => `T-${data.length - i}`);
  const datasets = [
    { label: 'Air Neuf (°C)', data: data.map(h => h.air_neuf), borderColor: '#1976d2', fill: false },
    { label: 'Air Soufflé (°C)', data: data.map(h => h.air_souffle), borderColor: '#43a047', fill: false },
    { label: 'Air Repris (°C)', data: data.map(h => h.air_repris), borderColor: '#e53935', fill: false }
  ];
  if (!chartCTA) {
    chartCTA = createChart(document.getElementById('chart-cta'), 'line', { labels, datasets }, { responsive: true, plugins: { legend: { position: 'top' } } });
  } else {
    updateChart(chartCTA, labels, datasets);
  }
}

// --- Fonctions Compteurs mises à jour ---
function getPeriodData(period) {
    const now = new Date();
    let dataMap = new Map();

    const formatDate = (d) => {
        const date = new Date(d);
        switch (period) {
            case 'day': return date.toLocaleDateString();
            case 'week':
                const startOfWeek = new Date(date);
                startOfWeek.setDate(date.getDate() - date.getDay() + (date.getDay() === 0 ? -6 : 1));
                const endOfWeek = new Date(startOfWeek);
                endOfWeek.setDate(startOfWeek.getDate() + 6);
                return `S.${startOfWeek.toLocaleDateString()} - ${endOfWeek.toLocaleDateString()}`;
            case 'month': return date.toLocaleString('default', { month: 'long', year: 'numeric' });
            case 'year': return date.getFullYear().toString();
        }
    };

    state.compteurs.history.forEach(item => {
        const key = formatDate(item.date);
        if (!dataMap.has(key)) {
            dataMap.set(key, { elec: 0, eau: 0, gaz: 0, start: item.date, end: item.date });
        }
        const periodData = dataMap.get(key);
        // On fait la différence avec la dernière valeur connue pour obtenir la consommation de l'intervalle
        const lastValue = state.compteurs.history.find(h => h.date < item.date);
        const prevElec = lastValue ? lastValue.elec : 0;
        const prevEau = lastValue ? lastValue.eau : 0;
        const prevGaz = lastValue ? lastValue.gaz : 0;

        periodData.elec += (item.elec - prevElec) > 0 ? (item.elec - prevElec) : 0;
        periodData.eau += (item.eau - prevEau) > 0 ? (item.eau - prevEau) : 0;
        periodData.gaz += (item.gaz - prevGaz) > 0 ? (item.gaz - prevGaz) : 0;
        periodData.start = new Date(Math.min(new Date(periodData.start), new Date(item.date)));
        periodData.end = new Date(Math.max(new Date(periodData.end), new Date(item.date)));
    });

    const dataArray = Array.from(dataMap.entries()).map(([key, value]) => ({
        label: key,
        ...value
    }));
    return dataArray.sort((a, b) => new Date(a.start) - new Date(b.start));
}

function updateChartCompteurs() {
    const period = state.compteurs.period;
    const periodData = getPeriodData(period);

    const labels = periodData.map(d => d.label);
    const datasets = [
        { label: 'Électricité (kWh)', data: periodData.map(d => d.elec.toFixed(2)), backgroundColor: '#1976d2' },
        { label: 'Eau (m³)', data: periodData.map(d => d.eau.toFixed(2)), backgroundColor: '#43a047' },
        { label: 'Gaz (m³)', data: periodData.map(d => d.gaz.toFixed(2)), backgroundColor: '#e53935' }
    ];

    if (!chartCompteurs) {
        chartCompteurs = new Chart(document.getElementById('chart-compteurs'), {
            type: 'bar',
            data: { labels, datasets },
            options: {
                responsive: true,
                plugins: {
                  legend: { position: 'top', labels: { font: { size: 16 } } },
                  tooltip: { enabled: true, bodyFont: { size: 15 } }
                },
                scales: {
                  x: {
                    stacked: false,
                    title: { display: true, text: 'Période', font: { size: 16 } },
                    ticks: { font: { size: 14 } }
                  },
                  y: {
                    stacked: false,
                    title: { display: true, text: 'Consommation', font: { size: 16 } },
                    ticks: { font: { size: 14 } },
                    grid: { color: '#eee' }
                  }
                },
                backgroundColor: '#fff',
                barPercentage: 0.7,
                categoryPercentage: 0.6
            }
        });
    } else {
        chartCompteurs.data.labels = labels;
        chartCompteurs.data.datasets = datasets;
        chartCompteurs.update();
    }
}

function updateCompteursTable() {
    const period = state.compteurs.period;
    const periodData = getPeriodData(period);
    const tbody = document.getElementById('period-consumption-table');
    tbody.innerHTML = '';
    
    document.getElementById('table-title').textContent = `Consommation par ${period === 'day' ? 'Jour' : period === 'week' ? 'Semaine' : period === 'month' ? 'Mois' : 'Année'}`;

    periodData.forEach(item => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${item.label}</td>
            <td>${item.elec.toFixed(2)}</td>
            <td>${item.eau.toFixed(2)}</td>
            <td>${item.gaz.toFixed(2)}</td>
        `;
        tbody.appendChild(row);
    });
}

// Écouteurs pour les boutons de période
document.getElementById('show-daily').onclick = () => {
    state.compteurs.period = 'day';
    updateCompteursChartAndTable();
    updateCompteursButtons(document.getElementById('show-daily'));
};
document.getElementById('show-weekly').onclick = () => {
    state.compteurs.period = 'week';
    updateCompteursChartAndTable();
    updateCompteursButtons(document.getElementById('show-weekly'));
};
document.getElementById('show-monthly').onclick = () => {
    state.compteurs.period = 'month';
    updateCompteursChartAndTable();
    updateCompteursButtons(document.getElementById('show-monthly'));
};
document.getElementById('show-yearly').onclick = () => {
    state.compteurs.period = 'year';
    updateCompteursChartAndTable();
    updateCompteursButtons(document.getElementById('show-yearly'));
};

function updateCompteursChartAndTable() {
    updateChartCompteurs();
    updateCompteursTable();
}

function updateCompteursButtons(activeButton) {
    const buttons = document.querySelectorAll('#content-compteurs .btn-outline-secondary');
    buttons.forEach(btn => btn.classList.remove('active'));
    activeButton.classList.add('active');
}

// --- Fonctions restantes (inchangées pour la plupart) ---

function updateChartMeteo() {
  const data = state.meteo.history.slice().reverse();
  const labels = data.map(h => new Date(h.date).toLocaleTimeString());
  const datasets = [
    { label: 'Température (°C)', data: data.map(h => h.temp), borderColor: '#e53935', fill: false },
    { label: 'Humidité (%)', data: data.map(h => h.hum), borderColor: '#1976d2', fill: false }
  ];
  if (!chartMeteo) {
    chartMeteo = createChart(document.getElementById('chart-meteo'), 'line', { labels, datasets }, { responsive: true, plugins: { legend: { position: 'top' } } });
  } else {
    updateChart(chartMeteo, labels, datasets);
  }
  // showToast("Graphique météo mis à jour.", "success"); // Suppression du toast intempestif
}

function updateChartAlarmes() {
  const niveaux = ['critique', 'majeure', 'mineure', 'invalide'];
  const counts = niveaux.map(niv => state.alarmes.data.filter(a => a.niveau === niv && a.etat === "présente").length);
  const datasets = [{
    data: counts,
    backgroundColor: ['#e53935', '#fbc02d', '#43a047', '#757575']
  }];
  if (!chartAlarmes) {
    chartAlarmes = createChart(document.getElementById('chart-alarmes'), 'doughnut', { labels: niveaux, datasets }, { responsive: true, plugins: { legend: { position: 'top' } } });
  } else {
    chartAlarmes.data.datasets[0].data = counts;
    chartAlarmes.update();
  }
}

function updateChartChaud() {
  const data = state.chaud.history.slice().reverse();
  const labels = data.map(h => new Date(h.date).toLocaleTimeString());
  // Barres groupées pour chaque mesure (côte à côte)
  const datasets = [
    { label: 'Départ R1 (°C)', data: data.map(h => h.r1.depart), backgroundColor: '#e53935' },
    { label: 'Retour R1 (°C)', data: data.map(h => h.r1.retour), backgroundColor: '#e57373' },
    { label: 'Départ R2 (°C)', data: data.map(h => h.r2.depart), backgroundColor: '#ff6384' },
    { label: 'Retour R2 (°C)', data: data.map(h => h.r2.retour), backgroundColor: '#ffb6c1' },
    { label: 'Départ R3 (°C)', data: data.map(h => h.r3.depart), backgroundColor: '#36a2eb' },
    { label: 'Pression (bar)', data: data.map(h => h.pression), backgroundColor: '#4bc0c0', yAxisID: 'y1' }
  ];
  const options = {
    responsive: true,
    plugins: {
      legend: { position: 'top', labels: { font: { size: 16 } } },
      tooltip: { enabled: true, bodyFont: { size: 15 } }
    },
    scales: {
      x: {
        title: { display: true, text: 'Heure', font: { size: 16 } },
        ticks: { font: { size: 14 } }
      },
      y: {
        title: { display: true, text: 'Température (°C)', font: { size: 16 } },
        ticks: { font: { size: 14 } },
        grid: { color: '#eee' }
      },
      y1: {
        position: 'right',
        grid: { drawOnChartArea: false },
        title: { display: true, text: 'Pression (bar)', font: { size: 16 } },
        ticks: { font: { size: 14 } }
      }
    },
    backgroundColor: '#fff',
    barPercentage: 0.7,
    categoryPercentage: 0.6
  };
  if (!chartChaud) {
    chartChaud = createChart(document.getElementById('chart-chaud'), 'bar', { labels, datasets }, options);
  } else {
    chartChaud.config.type = 'bar';
    updateChart(chartChaud, labels, datasets);
    chartChaud.options = options;
    chartChaud.update();
  }
}

// --- Navigation par onglets ---
const tabs = ['cta', 'conforts', 'compteurs', 'eclairages', 'meteo', 'alarmes', 'evenements', 'chaud', 'users'];
tabs.forEach(tab => {
  document.getElementById(`tab-${tab}`).onclick = () => showTab(`content-${tab}`);
});

function showTab(tabId) {
  tabs.forEach(tab => {
    document.getElementById(`content-${tab}`).style.display = (tabId === `content-${tab}`) ? 'block' : 'none';
    document.getElementById(`tab-${tab}`).classList.toggle('active', tabId === `content-${tab}`);
  });
  if (tabId === 'content-compteurs') updateCompteursChartAndTable(); // Modification ici pour appeler la nouvelle fonction
  if (tabId === 'content-meteo') updateChartMeteo();
  if (tabId === 'content-alarmes') {
    updateChartAlarmes();
    renderAlarmes();
  }
  if (tabId === 'content-chaud') {
    updateChartChaud();
    updateChaudUI(); // Mettre à jour l'UI de l'onglet Chaud lors de l'affichage
  }
  if (tabId === 'content-cta') updateChartCTA();
}

// --- Gestion des utilisateurs (CRUD localStorage) ---
function getUsers() {
  return JSON.parse(localStorage.getItem('users') || '[]');
}
function saveUsers(users) {
  localStorage.setItem('users', JSON.stringify(users));
}
function renderUsersTable() {
  const users = getUsers();
  const tbody = document.getElementById('users-table-body');
  if (!tbody) return;
  const isRestricted = state.currentUser && (state.currentUser.role === 'invite' || state.currentUser.role === 'operateur');
  tbody.innerHTML = users.map((u, i) => `
    <tr>
      <td>${u.username}</td>
      <td>${u.role}</td>
      <td>
        <button class="btn btn-sm btn-primary me-1" data-edit-user="${i}" ${isRestricted ? 'disabled style="pointer-events:none;opacity:0.5;"' : ''}><i class="bi bi-pencil"></i></button>
        <button class="btn btn-sm btn-danger" data-delete-user="${i}" ${isRestricted ? 'disabled style="pointer-events:none;opacity:0.5;"' : ''}><i class="bi bi-trash"></i></button>
      </td>
    </tr>
  `).join('');
  // Ajout des listeners après rendu
  tbody.querySelectorAll('[data-edit-user]').forEach(btn => {
    btn.onclick = function() {
      const i = Number(this.getAttribute('data-edit-user'));
      editUser(i);
    };
  });
  tbody.querySelectorAll('[data-delete-user]').forEach(btn => {
    btn.onclick = function() {
      const i = Number(this.getAttribute('data-delete-user'));
      deleteUser(i);
    };
  });
}
function editUser(i) {
  const users = getUsers();
  const user = users[i];
  document.getElementById('username').value = user.username;
  document.getElementById('role').value = user.role;
  document.getElementById('password').value = '';
  document.getElementById('userModalLabel').textContent = 'Modifier un utilisateur';
  const modal = new bootstrap.Modal(document.getElementById('userModal'));
  modal.show();
  const form = document.getElementById('user-form');
  form.onsubmit = function(e) {
    e.preventDefault();
    const newPassword = document.getElementById('password').value;
    users[i] = {
      username: document.getElementById('username').value,
      role: document.getElementById('role').value,
      password: newPassword ? newPassword : user.password // conserve l'ancien si champ vide
    };
    saveUsers(users);
    renderUsersTable();
    modal.hide();
  };
}
function deleteUser(i) {
  if (!confirm('Supprimer cet utilisateur ?')) return;
  const users = getUsers();
  users.splice(i, 1);
  saveUsers(users);
  renderUsersTable();
}

// --- Initialisation globale (fusion DOMContentLoaded) ---
document.addEventListener('DOMContentLoaded', () => {
  // Restriction globale pour l'invité : désactive tous les boutons d'action et champs de saisie
  if (state.currentUser && state.currentUser.role === 'invite') {
    // Désactive tous les boutons sauf navigation et logout
    document.querySelectorAll('button, input[type="button"], input[type="submit"], .btn').forEach(btn => {
      // On laisse actifs les onglets de navigation (sidebar) et le bouton logout
      if (!btn.closest('#sidebarMenu') && btn.id !== 'logout') {
        btn.disabled = true;
        btn.style.pointerEvents = 'none';
        btn.style.opacity = '0.5';
      } else if (btn.id === 'logout') {
        btn.disabled = false;
        btn.style.pointerEvents = '';
        btn.style.opacity = '';
      }
    });
    // Désactive tous les champs de saisie
    document.querySelectorAll('input, select, textarea').forEach(input => {
      // On laisse la recherche/filtre d'événements possible
      if (!input.closest('#sidebarMenu') && !input.closest('#evenement-search')) {
        input.readOnly = true;
        input.disabled = true;
        input.style.opacity = '0.7';
      }
    });
  }
  // Initialisation UI générale
  updateChartCTA();
  updateCompteursChartAndTable();
  updateChartMeteo();
  updateChartAlarmes();
  updateChartChaud();
  updateChaudUI();
  showTab('content-cta');

  // Gestion utilisateurs
  renderUsersTable();
  const addUserBtn = document.getElementById('add-user-btn');
  if (addUserBtn) {
    if (state.currentUser && (state.currentUser.role === 'invite' || state.currentUser.role === 'operateur')) {
      addUserBtn.disabled = true;
      addUserBtn.style.pointerEvents = 'none';
      addUserBtn.style.opacity = '0.5';
    } else {
      addUserBtn.onclick = function() {
        document.getElementById('user-form').reset();
        document.getElementById('userModalLabel').textContent = 'Ajouter un utilisateur';
        const modal = new bootstrap.Modal(document.getElementById('userModal'));
        modal.show();
        const form = document.getElementById('user-form');
        form.onsubmit = function(e) {
          e.preventDefault();
          const users = getUsers();
          const username = document.getElementById('username').value;
          const password = document.getElementById('password').value;
          const role = document.getElementById('role').value;
          if (!password) {
            alert('Le mot de passe est obligatoire.');
            return;
          }
          users.push({
            username,
            role,
            password
          });
          saveUsers(users);
          renderUsersTable();
          modal.hide();
        };
      };
    }
  }

  // Sécuriser l'ajout du gestionnaire pour le bouton de consigne général chaud
  const consigneBtn = document.getElementById('valider-consigne-general-chaud');
  if (consigneBtn) {
    consigneBtn.onclick = function() {
      if (state.currentUser.role === "invite") return showToast("Action réservée aux opérateurs/admins", "danger");
      const consigneInput = document.getElementById('consigne-general-chaud');
      const resultat = document.getElementById('resultat-consigne-general-chaud');
      const val = Number(consigneInput.value);
      if (isNaN(val) || val < 40 || val > 90) {
        showToast("Consigne invalide (40-90°C)", "danger");
        return;
      }
      state.chaud.reseaux.r1.consigne = val;
      consigneInput.value = val;
      if (resultat) {
        resultat.style.display = 'inline';
        setTimeout(() => { resultat.style.display = 'none'; }, 2000);
      }
      enregistrerEvenement('action', `Consigne générale chaud réglée à ${val}°C.`, 'chaud');
    };
  }

  const btnStart = document.getElementById('chaud-start');
  const btnStop = document.getElementById('chaud-stop');
  if (btnStart && btnStop) {
    btnStart.disabled = state.chaud.on;
    btnStop.disabled = !state.chaud.on;
  }

  // --- Export Excel (CSV) pour les compteurs ---
  const exportBtn = document.getElementById('export-compteurs');
  if (exportBtn) {
    exportBtn.onclick = function() {
      let csv = '';
      const periods = [
        { key: 'day', label: 'Jour' },
        { key: 'week', label: 'Semaine' },
        { key: 'month', label: 'Mois' },
        { key: 'year', label: 'Année' }
      ];
      periods.forEach(periodObj => {
        const periodData = getPeriodData(periodObj.key);
        csv += `--- ${periodObj.label} ---\n`;
        csv += 'Période,Électricité (kWh),Eau (m³),Gaz (m³)\n';
        periodData.forEach(item => {
          csv += `${item.label},${item.elec.toFixed(2)},${item.eau.toFixed(2)},${item.gaz.toFixed(2)}\n`;
        });
        csv += '\n';
      });
      const blob = new Blob([csv], { type: 'text/csv' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'compteurs.csv';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    };
  }
});
// --- Fonctions d'enregistrement des événements ---
function enregistrerEvenement(type, msg, source, user = state.currentUser.login) {
  state.evenements.unshift({ date: new Date(), type, msg, source, user });
  if (state.evenements.length > 30) state.evenements.pop();
  localStorage.setItem('evenementsHistory', JSON.stringify(state.evenements));
  updateEvenementsList(document.getElementById('evenement-filtre').value, document.getElementById('evenement-search').value, document.getElementById('evenement-source').value, document.getElementById('evenement-user-filter').value);
}

// --- CTA : Simulation temps réel, tendances, programmation horaire ---
function updateCTABadges() {
  const cta = state.cta;
  document.getElementById('badge-air-neuf').textContent = `Air Neuf : ${cta.on ? cta.tempNeuf.toFixed(1) : '--'} °C`;
  document.getElementById('badge-air-souffle').textContent = `Air Soufflé : ${cta.on ? cta.tempSouffle.toFixed(1) : '--'} °C`;
  document.getElementById('badge-air-repris').textContent = `Air Repris : ${cta.on ? cta.tempRepris.toFixed(1) : '--'} °C`;
  document.getElementById('cta-status').textContent = cta.on ? 'ON' : 'OFF';
  document.getElementById('cta-status').className = 'badge ' + (cta.on ? 'bg-success' : 'bg-danger');
  const btn = document.getElementById('cta-onoff');
  if (btn) {
    btn.classList.toggle('off', !cta.on);
    document.getElementById('cta-onoff-label').textContent = cta.on ? 'Arrêter' : 'Démarrer';
    btn.querySelector('#cta-onoff-icon').style.color = cta.on ? '#43e97b' : '#e53935';
  }
}
function simulateCTA() {
  const cta = state.cta;
  if (!cta.on) return;
  cta.tempNeuf = 17 + Math.random() * 2;
  const tempModulation = (cta.vanneChaude / 100) * 10 - (cta.vanneFroide / 100) * 5;
  const moteurEffet = (cta.moteur / 10) * 2;
  cta.tempSouffle = cta.tempNeuf + tempModulation + moteurEffet + (Math.random() - 0.5);
  cta.tempRepris = cta.tempSouffle + 2 + Math.random();
  updateCTABadges();
  enregistrerTendanceCTA();
}
function enregistrerTendanceCTA() {
  const cta = state.cta;
  cta.tendances.unshift({
    date: new Date(),
    air_neuf: cta.tempNeuf,
    air_souffle: cta.tempSouffle,
    air_repris: cta.tempRepris
  });
  if (cta.tendances.length > 20) cta.tendances.pop();
  updateChartCTA();
}
function afficherTendancesCTA() {
  document.getElementById('trend').style.display = 'block';
  let rows = '';
  state.cta.tendances.forEach((t, i) => {
    rows += `<tr><td>${i + 1}</td><td>${t.air_neuf.toFixed(1)}°C</td><td>${t.air_souffle.toFixed(1)}°C</td><td>${t.air_repris.toFixed(1)}°C</td></tr>`;
  });
  document.getElementById('trendTableBody').innerHTML = rows;
}
function cacherTendancesCTA() {
  document.getElementById('trend').style.display = 'none';
}
function toggleCTA() {
  if (state.currentUser.role === "invite") return showToast("Action réservée aux opérateurs/admins", "danger");
  state.cta.on = !state.cta.on;
  updateCTABadges();
  // Met à jour l'état des boutons start/stop
  const btnStart = document.getElementById('cta-start');
  const btnStop = document.getElementById('cta-stop');
  if (btnStart && btnStop) {
    btnStart.disabled = state.cta.on;
    btnStop.disabled = !state.cta.on;
  }
  if (!state.cta.on) cacherTendancesCTA();
  const action = state.cta.on ? "démarrée" : "arrêtée";
  enregistrerEvenement('action', `CTA ${action} en mode manuel.`, 'cta');
}
document.getElementById('annulerHoraire').onclick = () => document.getElementById('horaireInline').style.display = 'none';
document.addEventListener('DOMContentLoaded', function() {
  const btnCtaStart = document.getElementById('cta-start');
  const btnCtaStop = document.getElementById('cta-stop');
  if (btnCtaStart) btnCtaStart.onclick = function() { if (!state.cta.on) toggleCTA(); };
  if (btnCtaStop) btnCtaStop.onclick = function() { if (state.cta.on) toggleCTA(); };

  const btnChaudStart = document.getElementById('chaud-start');
  const btnChaudStop = document.getElementById('chaud-stop');
  if (btnChaudStart) btnChaudStart.onclick = function() { if (!state.chaud.on) toggleChaudSystem(); };
  if (btnChaudStop) btnChaudStop.onclick = function() { if (state.chaud.on) toggleChaudSystem(); };
});
document.getElementById('btnTendances').onclick = afficherTendancesCTA;
document.getElementById('btnFermerTendances').onclick = cacherTendancesCTA;
document.getElementById('btnHoraire').onclick = () => document.getElementById('horaireInline').style.display = 'block';
document.getElementById('ajouterHoraire').onclick = () => {
  if (state.currentUser.role === "invite") return showToast("Action réservée aux opérateurs/admins", "danger");
  const jour = document.getElementById('jourInline').value;
  const debut = document.getElementById('heureDebutInline').value;
  const fin = document.getElementById('heureFinInline').value;
  if (!jour || !debut || !fin) {
    return showToast("Veuillez sélectionner un jour, une heure de début et de fin.", "danger");
  }
  state.horaires.push({ jour, debut, fin });
  localStorage.setItem('horaireCTA', JSON.stringify(state.horaires));
  afficherHoraires();
  enregistrerEvenement('action', `Programmation horaire CTA ajoutée : ${jour}, ${debut}-${fin}.`, 'cta');
};
function afficherHoraires() {
  const horairesTxt = state.horaires.map((h, i) => `<li><span class="icon">🗓️</span> <b>${h.jour}</b> <span class="icon">🕒</span> <b>${h.debut}</b> &rarr; <b>${h.fin}</b> <button class="btn btn-outline-danger btn-sm ms-2" onclick="supprimerHoraire(${i})" ${state.currentUser.role === 'invite' ? 'disabled' : ''}>Supprimer</button></li>`).join('');
  document.getElementById('horaire').innerHTML = "<b>Horaires programmés :</b><ul class='horaire-list'>" + horairesTxt + "</ul>";
}
window.supprimerHoraire = function(i) {
  if (state.currentUser.role === "invite") return showToast("Action réservée aux opérateurs/admins", "danger");
  const horaireSupprime = state.horaires[i];
  state.horaires.splice(i, 1);
  localStorage.setItem('horaireCTA', JSON.stringify(state.horaires));
  afficherHoraires();
  enregistrerEvenement('action', `Programmation horaire CTA supprimée : ${horaireSupprime.jour}, ${horaireSupprime.debut}-${horaireSupprime.fin}.`, 'cta');
};
afficherHoraires();

// --- Conforts ---
document.getElementById('vc-appliquer').onclick = function() {
  if (state.currentUser.role === "invite") return showToast("Action réservée aux opérateurs/admins", "danger");
  const consigne = document.getElementById('vc-consigne').value;
  const vitesse = document.getElementById('vc-vitesse').value;
  const mode = document.getElementById('vc-mode').value;
  const temp = 20 + Math.random() * 4;
  document.getElementById('vc-temp-mesure').textContent = temp.toFixed(1);
  state.conforts.history.unshift({ date: new Date(), consigne, vitesse, mode, temp: temp.toFixed(1) });
  if (state.conforts.history.length > 10) state.conforts.pop();
  updateVCConsigne();
  enregistrerEvenement('action', `Consigne de VMC appliquée: Consigne ${consigne}°C, Vitesse ${vitesse}, Mode ${mode}.`, 'conforts');
};
function updateVCConsigne() {
  let html = state.conforts.history.map(h => `<li class="list-group-item">${new Date(h.date).toLocaleString()} - Consigne ${h.consigne}°C, Vitesse ${h.vitesse}, Mode ${h.mode}, Temp ${h.temp}°C</li>`).join('');
  document.getElementById('vc-history').innerHTML = html;
  document.getElementById('vc-resultat').style.display = 'block';
  document.getElementById('vc-resultat').textContent = "Consigne appliquée !";
  setTimeout(() => { document.getElementById('vc-resultat').style.display = 'none'; }, 2000);
}

// --- Compteurs ---
function updateCompteursHistory(elec, eau, gaz) {
  state.compteurs.history.unshift({ date: new Date(), elec, eau, gaz });
  // Laisser l'historique illimité pour les calculs par période
  // if (state.compteurs.history.length > 20) state.compteurs.history.pop();
  updateCompteursChartAndTable();
}
document.getElementById('refresh-compteurs').onclick = function() {
  const now = new Date();
  // Simuler une consommation aléatoire incrémentale
  const lastHistory = state.compteurs.history[0] || { elec: 0, eau: 0, gaz: 0 };
  let elec = parseFloat(lastHistory.elec) + (Math.random() * 5);
  let eau = parseFloat(lastHistory.eau) + (Math.random() * 0.1);
  let gaz = parseFloat(lastHistory.gaz) + (Math.random() * 0.2);
  
  // Mettre à jour les compteurs bruts
  document.getElementById('compteur-elec').textContent = elec.toFixed(2);
  document.getElementById('compteur-eau').textContent = eau.toFixed(2);
  document.getElementById('compteur-gaz').textContent = gaz.toFixed(2);
  
  updateCompteursHistory(elec, eau, gaz);
  enregistrerEvenement('info', 'Données de consommation des compteurs rafraîchies.', 'compteurs');
};

// --- Eclairages ---
document.getElementById('eclairage-appliquer').onclick = function() {
  if (state.currentUser.role === "invite") return showToast("Action réservée aux opérateurs/admins", "danger");
  const zone = document.getElementById('zone-eclairage').value;
  const lux = document.getElementById('lux-mesure').value;
  const consigne = document.getElementById('lux-consigne').value;
  state.eclairages.history.unshift({ date: new Date(), zone, lux, consigne, action: "Consigne modifiée" });
  if (state.eclairages.history.length > 10) state.eclairages.history.pop();
  updateEclairageHistory();
  document.getElementById('eclairage-resultat').style.display = 'block';
  document.getElementById('eclairage-resultat').textContent = "Consigne appliquée !";
  setTimeout(() => { document.getElementById('eclairage-resultat').style.display = 'none'; }, 2000);
  enregistrerEvenement('action', `Consigne de lux modifiée à ${consigne} pour la zone ${zone}.`, 'eclairages');
};
document.getElementById('eclairage-on').onclick = function() {
  if (state.currentUser.role === "invite") return showToast("Action réservée aux opérateurs/admins", "danger");
  const zone = document.getElementById('zone-eclairage').value;
  state.eclairages.etat[zone] = "Allumé";
  state.eclairages.history.unshift({ date: new Date(), zone, action: "Allumé" });
  updateEclairageHistory();
  document.getElementById('eclairage-etat').textContent = "Allumé";
  enregistrerEvenement('action', `Éclairage allumé pour la zone ${zone}.`, 'eclairages');
};
document.getElementById('eclairage-off').onclick = function() {
  if (state.currentUser.role === "invite") return showToast("Action réservée aux opérateurs/admins", "danger");
  const zone = document.getElementById('zone-eclairage').value;
  state.eclairages.etat[zone] = "Éteint";
  state.eclairages.history.unshift({ date: new Date(), zone, action: "Éteint" });
  updateEclairageHistory();
  document.getElementById('eclairage-etat').textContent = "Éteint";
  enregistrerEvenement('action', `Éclairage éteint pour la zone ${zone}.`, 'eclairages');
};

// Logique de programmation journalière pour l'éclairage
document.getElementById('btnHoraireEclairage').onclick = () => document.getElementById('horaireEclairageInline').style.display = 'block';
document.getElementById('annulerHoraireEclairage').onclick = () => document.getElementById('horaireEclairageInline').style.display = 'none';
document.getElementById('ajouterHoraireEclairage').onclick = () => {
    if (state.currentUser.role === "invite") return showToast("Action réservée aux opérateurs/admins", "danger");
    const zone = document.getElementById('zone-eclairage').value;
    const jour = document.getElementById('jourEclairageInline').value;
    const debut = document.getElementById('heureDebutEclairageInline').value;
    const fin = document.getElementById('heureFinEclairageInline').value;
    if (!jour || !debut || !fin) {
        return showToast("Veuillez sélectionner un jour, une heure de début et de fin.", "danger");
    }
    state.eclairages.horaires.push({ zone, jour, debut, fin });
    localStorage.setItem('horairesEclairage', JSON.stringify(state.eclairages.horaires));
    afficherHorairesEclairage();
    enregistrerEvenement('action', `Programmation horaire éclairage ajoutée pour ${zone} : ${jour}, ${debut}-${fin}.`, 'eclairages');
};

function afficherHorairesEclairage() {
    const horairesTxt = state.eclairages.horaires.map((h, i) => `<li><span class="icon">🗓️</span> <b>${h.zone}</b>, <b>${h.jour}</b> <span class="icon">🕒</span> <b>${h.debut}</b> &rarr; <b>${h.fin}</b> <button class="btn btn-outline-danger btn-sm ms-2" onclick="supprimerHoraireEclairage(${i})" ${state.currentUser.role === 'invite' ? 'disabled' : ''}>Supprimer</button></li>`).join('');
    document.getElementById('horairesEclairage').innerHTML = "<b>Horaires programmés :</b><ul class='horaire-list'>" + horairesTxt + "</ul>";
}
window.supprimerHoraireEclairage = function(i) {
    if (state.currentUser.role === "invite") return showToast("Action réservée aux opérateurs/admins", "danger");
    const horaireSupprime = state.eclairages.horaires[i];
    state.eclairages.horaires.splice(i, 1);
    localStorage.setItem('horairesEclairage', JSON.stringify(state.eclairages.horaires));
    afficherHorairesEclairage();
    enregistrerEvenement('action', `Programmation horaire éclairage supprimée pour ${horaireSupprime.zone} : ${horaireSupprime.jour}, ${horaireSupprime.debut}-${horaireSupprime.fin}.`, 'eclairages');
};
afficherHorairesEclairage();

function updateEclairageHistory() {
  const html = state.eclairages.history.map(h => `<li class="list-group-item">${new Date(h.date).toLocaleString()} - ${h.zone} : ${h.action}${h.lux ? ', Lux ' + h.lux : ''}${h.consigne ? ', Consigne ' + h.consigne : ''}</li>`).join('');
  document.getElementById('eclairage-history').innerHTML = html;
}

// --- Météo ---
function updateMeteoHistory(temp, hum, vent, pression, tendance) {
  state.meteo.history.unshift({ date: new Date(), temp, hum, vent, pression, tendance });
  if (state.meteo.history.length > 20) state.meteo.history.pop();
  let html = state.meteo.history.map(h => `<li class="list-group-item">${new Date(h.date).toLocaleString()} - ${h.temp}°C, ${h.hum}%, ${h.vent}km/h, ${h.pression}hPa, ${h.tendance}</li>`).join('');
  document.getElementById('meteo-history').innerHTML = html;
  updateChartMeteo();
}
document.getElementById('refresh-meteo').onclick = function() {
  let temp = (10 + Math.random() * 20).toFixed(1);
  let hum = (40 + Math.random() * 40).toFixed(1);
  let vent = (5 + Math.random() * 20).toFixed(1);
  let pression = (990 + Math.random() * 20).toFixed(1);
  let tendance = ["Stable", "Hausse", "Baisse"][Math.floor(Math.random() * 3)];
  document.getElementById('meteo-temp').textContent = temp;
  document.getElementById('meteo-hum').textContent = hum;
  document.getElementById('meteo-vent').textContent = vent;
  document.getElementById('meteo-pression').textContent = pression;
  document.getElementById('meteo-tendance').textContent = tendance;
  document.getElementById('meteo-icone').innerHTML = tendance === "Hausse" ? "⬆️" : tendance === "Baisse" ? "⬇️" : "⏺️";
  updateMeteoHistory(temp, hum, vent, pression, tendance);
  enregistrerEvenement('info', 'Données météo rafraîchies.', 'meteo');
};

// --- Alarmes ---
function updateAlarmesBadge() {
  const unacquittedCount = state.alarmes.data.filter(a => a.etat === "présente" && !a.acquittee).length;
  const badge = document.getElementById('alarmes-badge');
  if (unacquittedCount > 0) {
    badge.textContent = unacquittedCount;
    badge.style.display = 'inline';
    // Mettre en place un son d'alarme ici dans une vraie application
  } else {
    badge.style.display = 'none';
  }
}

function renderAlarmes() {
  const tbody = document.getElementById('liste-alarmes');
  tbody.innerHTML = '';

  let filteredAlarmes = state.alarmes.data;
  if (state.alarmes.currentFilter === 'presentes') {
    filteredAlarmes = state.alarmes.data.filter(a => a.etat === 'présente');
  } else if (state.alarmes.currentFilter === 'non-acquittees') {
    filteredAlarmes = state.alarmes.data.filter(a => a.etat === 'présente' && !a.acquittee);
  }

  filteredAlarmes.forEach(al => {
    const rowClass = (al.etat === 'présente' && !al.acquittee) ? 'table-danger clignote' : (al.etat === 'présente' ? 'table-warning' : '');
    const acquitBtnDisabled = al.acquittee || al.etat !== "présente" || state.currentUser.role === 'invite';
    const row = document.createElement('tr');
    row.className = rowClass;
    row.innerHTML = `
      <td><i class="bi ${al.icone} fs-4"></i></td>
      <td>${al.libelle}</td>
      <td>${al.niveau}</td>
      <td>${al.etat}</td>
      <td>${al.acquittee ? 'Oui' : 'Non'}</td>
      <td>
        <button class="btn btn-danger btn-sm" onclick="acquitterAlarme(${al.id})" ${acquitBtnDisabled ? 'disabled' : ''}>Acquitter</button>
      </td>
    `;
    tbody.appendChild(row);
  });
  updateChartAlarmes();
  updateAlarmesBadge();
}

function acquitterAlarme(id) {
  if (state.currentUser.role === "invite") return showToast("Action réservée aux opérateurs/admins", "danger");
  const al = state.alarmes.data.find(a => a.id === id);
  if (al && al.etat === "présente" && !al.acquittee) {
    const commentaire = prompt("Commentaire d'acquittement (obligatoire) :");
    if (!commentaire) return showToast("Acquittement annulé", "warning");
    al.acquittee = true;
    updateAlarmesHistory(`Alarme "${al.libelle}" acquittée par ${state.currentUser.login}. Commentaire : ${commentaire}`);
    renderAlarmes();
    showToast("Alarme acquittée !");
    enregistrerEvenement('action', `Alarme "${al.libelle}" acquittée avec le commentaire : ${commentaire}.`, 'alarmes');
  }
}
window.acquitterAlarme = acquitterAlarme;

function updateAlarmesHistory(msg) {
  state.alarmes.history.unshift({ date: new Date(), msg, user: state.currentUser.login });
  if (state.alarmes.history.length > 30) state.alarmes.history.pop();
  localStorage.setItem('alarmesHistory', JSON.stringify(state.alarmes.history));
  const html = state.alarmes.history.map(h => `<li class="list-group-item">${new Date(h.date).toLocaleString()} - ${h.msg} <span class="text-muted">(${h.user})</span></li>`).join('');
  document.getElementById('alarmes-history').innerHTML = html;
}
document.getElementById('acquitter-toutes').onclick = function() {
  if (state.currentUser.role === "invite") return showToast("Action réservée aux opérateurs/admins", "danger");
  const unacquittedAlarms = state.alarmes.data.filter(a => a.etat === "présente" && !a.acquittee);
  if (unacquittedAlarms.length > 0) {
    unacquittedAlarms.forEach(al => { al.acquittee = true; });
    updateAlarmesHistory("Toutes les alarmes présentes acquittées par " + state.currentUser.login);
    renderAlarmes();
    showToast("Toutes les alarmes ont été acquittées !");
    enregistrerEvenement('action', "Toutes les alarmes présentes ont été acquittées.", 'alarmes');
  }
};
document.getElementById('refresh-alarmes').onclick = renderAlarmes;
document.getElementById('export-alarmes-history').onclick = function() {
  const rows = state.alarmes.history.map(h => `"${new Date(h.date).toLocaleString()}","${h.msg.replace(/"/g, '""')}","${h.user}"`);
  const csv = "Date,Message,Utilisateur\n" + rows.join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = "alarmes_history.csv";
  a.click();
};

// Gestion des filtres d'alarmes
const filtreToutesBtn = document.getElementById('filtre-toutes');
if (filtreToutesBtn) {
  filtreToutesBtn.onclick = function() {
    state.alarmes.currentFilter = 'all';
    updateFilterButtons(this);
    renderAlarmes();
  };
}
const filtrePresentesBtn = document.getElementById('filtre_presentes');
if (filtrePresentesBtn) {
  filtrePresentesBtn.onclick = function() {
    state.alarmes.currentFilter = 'presentes';
    updateFilterButtons(this);
    renderAlarmes();
  };
}
const filtreNonAcquitteesBtn = document.getElementById('filtre_non_acquittees');
if (filtreNonAcquitteesBtn) {
  filtreNonAcquitteesBtn.onclick = function() {
    state.alarmes.currentFilter = 'non-acquittees';
    updateFilterButtons(this);
    renderAlarmes();
  };
}
function updateFilterButtons(activeButton) {
  const buttons = document.querySelectorAll('#content-alarmes .btn-outline-primary');
  buttons.forEach(btn => btn.classList.remove('active'));
  activeButton.classList.add('active');
}

// Simulation d'apparition et de disparition d'alarmes
function simulerAlarmesDynamiques() {
  const nouvellesAlarmes = [
    { id: 5, libelle: "Surchauffe moteur", niveau: "critique", icone: "bi-thermometer-high", etat: "absente", acquittee: false, valide: true },
    { id: 6, libelle: "Défaut de communication", niveau: "majeure", icone: "bi-broadcast-pin", etat: "absente", acquittee: false, valide: true },
    { id: 7, libelle: "Vanne bloquée en position fermée", niveau: "critique", icone: "bi-lock-fill", etat: "absente", acquittee: false, valide: true }
  ];
  nouvellesAlarmes.forEach(al => {
    // 20% de chance qu'une alarme devienne 'présente'
    if (Math.random() < 0.2) {
      const existing = state.alarmes.data.find(a => a.id === al.id);
      if (!existing) {
        state.alarmes.data.push(al);
      } else {
        if (existing.etat === 'absente') {
          existing.etat = 'présente';
          existing.acquittee = false;
          enregistrerEvenement('alerte', `Alarme "${existing.libelle}" est devenue présente.`, 'alarmes', 'Système');
          showToast(`Nouvelle alarme : ${existing.libelle}`, 'danger');
        }
      }
    }
  });

  // 10% de chance qu'une alarme présente disparaisse
  state.alarmes.data.forEach(al => {
    if (al.etat === 'présente' && Math.random() < 0.1) {
      al.etat = 'absente';
      enregistrerEvenement('info', `Alarme "${al.libelle}" est devenue absente.`, 'alarmes', 'Système');
    }
  });
  renderAlarmes();
}
setInterval(simulerAlarmesDynamiques, 5000);

// --- Événements ---
function updateEvenementsList(filter, searchTerm = '', sourceFilter = 'all', userFilter = 'all') {
  const filteredEvents = state.evenements
    .filter(ev => filter === "all" || ev.type === filter)
    .filter(ev => sourceFilter === "all" || ev.source === sourceFilter)
    .filter(ev => userFilter === "all" || ev.user === userFilter)
    .filter(ev => ev.msg.toLowerCase().includes(searchTerm.toLowerCase()));

  const html = filteredEvents
    .map(ev => {
      let icon = '';
      let badgeClass = '';
      switch (ev.type) {
        case 'info':
          icon = 'bi-info-circle-fill';
          badgeClass = 'bg-secondary';
          break;
        case 'alerte':
          icon = 'bi-exclamation-triangle-fill';
          badgeClass = 'bg-warning';
          break;
        case 'action':
          icon = 'bi-gear-fill';
          badgeClass = 'bg-info';
          break;
        case 'securite':
          icon = 'bi-shield-fill-check';
          badgeClass = 'bg-dark';
          break;
        case 'maintenance':
          icon = 'bi-tools';
          badgeClass = 'bg-success';
          break;
        case 'anomalie':
          icon = 'bi-robot';
          badgeClass = 'bg-danger';
          break;
      }
      return `<li class="list-group-item"><i class="bi ${icon} me-2"></i>[${new Date(ev.date).toLocaleTimeString()}] <span class="badge ${badgeClass}">${ev.type}</span> <b>(${ev.user})</b> <span class="text-muted">| ${ev.source}</span> ${ev.msg}</li>`;
    })
    .join('');
  document.getElementById('liste-evenements').innerHTML = html;
}
document.getElementById('form-ajout-evenement').onsubmit = function(e) {
  e.preventDefault();
  if (state.currentUser.role === "invite") return showToast("Action réservée aux opérateurs/admins", "danger");
  const msg = document.getElementById('input-evenement').value;
  const type = document.getElementById('input-type-evenement').value;
  enregistrerEvenement(type, msg, 'manuel');
  document.getElementById('input-evenement').value = '';
  showToast("Événement ajouté !");
};
document.getElementById('evenement-filtre').onchange = function() {
  updateEvenementsList(this.value, document.getElementById('evenement-search').value, document.getElementById('evenement-source').value, document.getElementById('evenement-user-filter').value);
};
document.getElementById('evenement-source').onchange = function() {
  updateEvenementsList(document.getElementById('evenement-filtre').value, document.getElementById('evenement-search').value, this.value, document.getElementById('evenement-user-filter').value);
};
document.getElementById('evenement-user-filter').onchange = function() {
  updateEvenementsList(document.getElementById('evenement-filtre').value, document.getElementById('evenement-search').value, document.getElementById('evenement-source').value, this.value);
};
document.getElementById('evenement-search').oninput = function() {
  updateEvenementsList(document.getElementById('evenement-filtre').value, this.value, document.getElementById('evenement-source').value, document.getElementById('evenement-user-filter').value);
};
document.getElementById('export-evenements-history').onclick = function() {
  const rows = state.evenements.map(h => `"${new Date(h.date).toLocaleString()}","${h.type}","${h.source}","${h.user}","${h.msg.replace(/"/g, '""')}"`);
  const csv = "Date,Type,Source,Utilisateur,Message\n" + rows.join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = "evenements_history.csv";
  a.click();
};
// Ajout d'événements de simulation
function simulerEvenement() {
  const events = [
    { type: "info", msg: "Température ambiante ajustée.", source: "thermostat" },
    { type: "action", msg: "CTA démarrée suite à la programmation horaire.", source: "cta", user: "Système" },
    { type: "alerte", msg: "Consommation électrique en légère hausse.", source: "compteurs" },
    { type: "securite", msg: "Tentative de connexion échouée (mdp invalide).", source: "sécurité", user: "Système" },
    { type: "maintenance", msg: "Nettoyage préventif du filtre de la CTA.", source: "maintenance", user: "operateur" },
    { type: "anomalie", msg: "Débit de la vanne chaude hors plage de fonctionnement.", source: "cta", user: "Système" }
  ];
  const event = events[Math.floor(Math.random() * events.length)];
  enregistrerEvenement(event.type, event.msg, event.source, event.user || 'Système');
}
setInterval(simulerEvenement, 10000);
updateEvenementsList("all");

// --- Distribution chaud ---
const chaudOnOffBtn = document.getElementById('chaud-onoff');
if (chaudOnOffBtn) chaudOnOffBtn.onclick = toggleChaudSystem;
const chaudOnOffIcon = document.getElementById('chaud-onoff-icon');
if (chaudOnOffIcon) chaudOnOffIcon.textContent = state.chaud.on ? '⏼' : '⏻';

// Handlers for Réseau 1
document.getElementById('consigne-chaud-1').onchange = (e) => {
  if (state.currentUser.role === "invite") return showToast("Action réservée aux opérateurs/admins", "danger");
  state.chaud.reseaux.r1.consigne = Number(e.target.value);
  enregistrerEvenement('action', `Consigne du Réseau 1 réglée à ${state.chaud.reseaux.r1.consigne}°C.`, 'chaud');
};
document.getElementById('vanne-chaud-1-slider').oninput = (e) => {
  state.chaud.reseaux.r1.vanne = Number(e.target.value);
  document.getElementById('vanne-chaud-1-val').textContent = state.chaud.reseaux.r1.vanne;
};
document.getElementById('vanne-chaud-1-slider').onchange = (e) => {
  if (state.currentUser.role === "invite") return showToast("Action réservée aux opérateurs/admins", "danger");
  enregistrerEvenement('action', `Vanne 3 voies du Réseau 1 forcée à ${state.chaud.reseaux.r1.vanne}%.`, 'chaud');
};
document.getElementById('pompe-chaud-1').onchange = (e) => {
  if (state.currentUser.role === "invite") return showToast("Action réservée aux opérateurs/admins", "danger");
  state.chaud.reseaux.r1.pompe = e.target.checked;
  document.getElementById('pompe-chaud-1-etat').textContent = state.chaud.reseaux.r1.pompe ? 'ON' : 'OFF';
  const action = state.chaud.reseaux.r1.pompe ? 'démarrée' : 'arrêtée';
  enregistrerEvenement('action', `Pompe du Réseau 1 ${action}.`, 'chaud');
};

// Handlers for Réseau 2
document.getElementById('consigne-chaud-2').onchange = (e) => {
  if (state.currentUser.role === "invite") return showToast("Action réservée aux opérateurs/admins", "danger");
  state.chaud.reseaux.r2.consigne = Number(e.target.value);
  enregistrerEvenement('action', `Consigne du Réseau 2 réglée à ${state.chaud.reseaux.r2.consigne}°C.`, 'chaud');
};
document.getElementById('vanne-chaud-2-slider').oninput = (e) => {
  state.chaud.reseaux.r2.vanne = Number(e.target.value);
  document.getElementById('vanne-chaud-2-val').textContent = state.chaud.reseaux.r2.vanne;
};
document.getElementById('vanne-chaud-2-slider').onchange = (e) => {
  if (state.currentUser.role === "invite") return showToast("Action réservée aux opérateurs/admins", "danger");
  enregistrerEvenement('action', `Vanne 3 voies du Réseau 2 forcée à ${state.chaud.reseaux.r2.vanne}%.`, 'chaud');
};
document.getElementById('pompe-chaud-2').onchange = (e) => {
  if (state.currentUser.role === "invite") return showToast("Action réservée aux opérateurs/admins", "danger");
  state.chaud.reseaux.r2.pompe = e.target.checked;
  document.getElementById('pompe-chaud-2-etat').textContent = state.chaud.reseaux.r2.pompe ? 'ON' : 'OFF';
  const action = state.chaud.reseaux.r2.pompe ? 'démarrée' : 'arrêtée';
  enregistrerEvenement('action', `Pompe du Réseau 2 ${action}.`, 'chaud');
};

// Handler for Réseau 3
document.getElementById('pompe-chaud-3').onchange = (e) => {
  if (state.currentUser.role === "invite") return showToast("Action réservée aux opérateurs/admins", "danger");
  state.chaud.reseaux.r3.pompe = e.target.checked;
  document.getElementById('pompe-chaud-3-etat').textContent = state.chaud.reseaux.r3.pompe ? 'ON' : 'OFF';
  const action = state.chaud.reseaux.r3.pompe ? 'démarrée' : 'arrêtée';
  enregistrerEvenement('action', `Pompe du Réseau 3 ${action}.`, 'chaud');
};

function toggleChaudSystem() {
  if (state.currentUser.role === "invite") return showToast("Action réservée aux opérateurs/admins", "danger");
  state.chaud.on = !state.chaud.on;
  if (!state.chaud.on) {
      Object.keys(state.chaud.reseaux).forEach(r => {
          state.chaud.reseaux[r].pompe = false;
          if (state.chaud.reseaux[r].vanne !== undefined) { state.chaud.reseaux[r].vanne = 0; }
      });
  }
  updateChaudUI();
  // Update start/stop button states after toggling
  const btnStart = document.getElementById('chaud-start');
  const btnStop = document.getElementById('chaud-stop');
  if (btnStart && btnStop) {
    btnStart.disabled = state.chaud.on;
    btnStop.disabled = !state.chaud.on;
  }
  const action = state.chaud.on ? "démarré" : "arrêté";
  enregistrerEvenement('action', `Système de distribution chaud ${action}.`, 'chaud');
}

function updateChaudUI() {
    const chaud = state.chaud;
    document.getElementById('chaud-status').textContent = chaud.on ? 'ON' : 'OFF';
    document.getElementById('chaud-status').className = 'badge ' + (chaud.on ? 'bg-success' : 'bg-danger');
    const btn = document.getElementById('chaud-onoff');
    if (btn) {
      btn.classList.toggle('off', !chaud.on);
      document.getElementById('chaud-onoff-label').textContent = chaud.on ? 'Arrêter' : 'Démarrer';
      btn.querySelector('#chaud-onoff-icon').style.color = chaud.on ? '#43e97b' : '#e53935';
      document.getElementById('chaud-onoff-icon').textContent = chaud.on ? '⏼' : '⏻';
    }
    document.getElementById('chaud-pression').textContent = chaud.pression.toFixed(2);
    document.getElementById('chaud-temp-chaufferie').textContent = chaud.tempChaufferie.toFixed(1);
  let tempExtNum = typeof chaud.tempExt === 'number' ? chaud.tempExt : Number(chaud.tempExt);
  if (isNaN(tempExtNum)) tempExtNum = 0;
  document.getElementById('chaud-temp-ext').textContent = tempExtNum.toFixed(1);

    // Update Réseau 1 UI
    document.getElementById('depart-chaud-1').textContent = chaud.reseaux.r1.depart.toFixed(1);
    document.getElementById('retour-chaud-1').textContent = chaud.reseaux.r1.retour.toFixed(1);
    document.getElementById('vanne-chaud-1-val').textContent = chaud.reseaux.r1.vanne;
    document.getElementById('vanne-chaud-1-slider').value = chaud.reseaux.r1.vanne;
    document.getElementById('pompe-chaud-1-etat').textContent = chaud.reseaux.r1.pompe ? 'ON' : 'OFF';
    document.getElementById('pompe-chaud-1').checked = chaud.reseaux.r1.pompe;

    // Update Réseau 2 UI
    document.getElementById('depart-chaud-2').textContent = chaud.reseaux.r2.depart.toFixed(1);
    document.getElementById('retour-chaud-2').textContent = chaud.reseaux.r2.retour.toFixed(1);
    document.getElementById('vanne-chaud-2-val').textContent = chaud.reseaux.r2.vanne;
    document.getElementById('vanne-chaud-2-slider').value = chaud.reseaux.r2.vanne;
    document.getElementById('pompe-chaud-2-etat').textContent = chaud.reseaux.r2.pompe ? 'ON' : 'OFF';
    document.getElementById('pompe-chaud-2').checked = chaud.reseaux.r2.pompe;

    // Update Réseau 3 UI
    document.getElementById('depart-chaud-3').textContent = chaud.reseaux.r3.depart.toFixed(1);
    document.getElementById('retour-chaud-3').textContent = chaud.reseaux.r3.retour.toFixed(1);
    document.getElementById('debit-chaud-3').textContent = chaud.reseaux.r3.debit.toFixed(2);
    document.getElementById('pompe-chaud-3-etat').textContent = chaud.reseaux.r3.pompe ? 'ON' : 'OFF';
    document.getElementById('pompe-chaud-3').checked = chaud.reseaux.r3.pompe;
}

function simulateChaud() {
  const chaud = state.chaud;
  if (!chaud.on) {
      chaud.tempChaufferie = 20 + Math.random();
      chaud.pression = 0;
      Object.keys(chaud.reseaux).forEach(r => {
          chaud.reseaux[r].depart = 20 + Math.random();
          chaud.reseaux[r].retour = chaud.reseaux[r].depart - (Math.random());
          if (chaud.reseaux[r].debit !== undefined) { chaud.reseaux[r].debit = 0; }
      });
  } else {
      chaud.tempChaufferie = 75 + Math.random() * 5;
      chaud.tempExt = (10 + Math.random() * 20).toFixed(1);
      chaud.pression = 1.5 + Math.random() * 0.5;

      // Réseau 1
      if (chaud.reseaux.r1.pompe) {
          // Régulation de la vanne pour atteindre la consigne
          const consigneR1 = chaud.reseaux.r1.consigne;
          if (chaud.reseaux.r1.depart < consigneR1 - 1) {
              chaud.reseaux.r1.vanne = Math.min(100, chaud.reseaux.r1.vanne + 5);
          } else if (chaud.reseaux.r1.depart > consigneR1 + 1) {
              chaud.reseaux.r1.vanne = Math.max(0, chaud.reseaux.r1.vanne - 5);
          }
          const vanneEffet = chaud.reseaux.r1.vanne / 100;
          chaud.reseaux.r1.depart = chaud.tempChaufferie * vanneEffet + (consigneR1 - consigneR1 * vanneEffet) + (Math.random() - 0.5);
          chaud.reseaux.r1.retour = chaud.reseaux.r1.depart - (10 + Math.random() * 5);
      } else {
          chaud.reseaux.r1.depart = 20 + Math.random();
          chaud.reseaux.r1.retour = chaud.reseaux.r1.depart - (Math.random());
      }

      // Réseau 2
      if (chaud.reseaux.r2.pompe) {
          const consigneR2 = chaud.reseaux.r2.consigne;
          if (chaud.reseaux.r2.depart < consigneR2 - 1) {
              chaud.reseaux.r2.vanne = Math.min(100, chaud.reseaux.r2.vanne + 5);
          } else if (chaud.reseaux.r2.depart > consigneR2 + 1) {
              chaud.reseaux.r2.vanne = Math.max(0, chaud.reseaux.r2.vanne - 5);
          }
          const vanneEffet = chaud.reseaux.r2.vanne / 100;
          chaud.reseaux.r2.depart = chaud.tempChaufferie * vanneEffet + (consigneR2 - consigneR2 * vanneEffet) + (Math.random() - 0.5);
          chaud.reseaux.r2.retour = chaud.reseaux.r2.depart - (10 + Math.random() * 5);
      } else {
          chaud.reseaux.r2.depart = 20 + Math.random();
          chaud.reseaux.r2.retour = chaud.reseaux.r2.depart - (Math.random());
      }
      
      // Réseau 3
      if (chaud.reseaux.r3.pompe) {
          chaud.reseaux.r3.depart = (65 + Math.random() * 5);
          chaud.reseaux.r3.retour = chaud.reseaux.r3.depart - (15 + Math.random() * 5);
          chaud.reseaux.r3.debit = (3 + Math.random()).toFixed(2);
      } else {
          chaud.reseaux.r3.depart = 20 + Math.random();
          chaud.reseaux.r3.retour = chaud.reseaux.r3.depart - (Math.random());
          chaud.reseaux.r3.debit = 0;
      }
  }

  updateChaudHistory();
  updateChaudUI();
}

function updateChaudHistory() {
  const chaud = state.chaud;
  chaud.history.unshift({
    date: new Date(),
    pression: chaud.pression,
    r1: { depart: chaud.reseaux.r1.depart, retour: chaud.reseaux.r1.retour, vanne: chaud.reseaux.r1.vanne, pompe: chaud.reseaux.r1.pompe },
    r2: { depart: chaud.reseaux.r2.depart, retour: chaud.reseaux.r2.retour, vanne: chaud.reseaux.r2.vanne, pompe: chaud.reseaux.r2.pompe },
    r3: { depart: chaud.reseaux.r3.depart, retour: chaud.reseaux.r3.retour, debit: chaud.reseaux.r3.debit, pompe: chaud.reseaux.r3.pompe }
  });
  if (chaud.history.length > 30) chaud.history.pop();
  let html = chaud.history.map(h => `<li class="list-group-item">${new Date(h.date).toLocaleString()} - Pression: ${h.pression.toFixed(2)} bar | R1: ${h.r1.depart.toFixed(1)}°C, R2: ${h.r2.depart.toFixed(1)}°C, R3: ${h.r3.depart.toFixed(1)}°C</li>`).join('');
  document.getElementById('chaud-history').innerHTML = html;
  updateChartChaud();
}

// --- Mise à jour des curseurs CTA ---
document.getElementById('slider-moteur').oninput = function() {
  if (state.currentUser.role === "invite") return showToast("Action réservée aux opérateurs/admins", "danger");
  state.cta.moteur = Number(this.value);
  document.getElementById('val-moteur').textContent = this.value;
};
document.getElementById('slider-moteur').onchange = function() {
    enregistrerEvenement('action', `Vitesse moteur CTA forcée à ${this.value}.`, 'cta');
};

document.getElementById('slider-vanne-chaude').oninput = function() {
  if (state.currentUser.role === "invite") return showToast("Action réservée aux opérateurs/admins", "danger");
  state.cta.vanneChaude = Number(this.value);
  document.getElementById('val-vanne-chaude').textContent = this.value;
};
document.getElementById('slider-vanne-chaude').onchange = function() {
    enregistrerEvenement('action', `Vanne chaude CTA forcée à ${this.value}%.`, 'cta');
};

document.getElementById('slider-vanne-froide').oninput = function() {
  if (state.currentUser.role === "invite") return showToast("Action réservée aux opérateurs/admins", "danger");
  state.cta.vanneFroide = Number(this.value);
  document.getElementById('val-vanne-froide').textContent = this.value;
};
document.getElementById('slider-vanne-froide').onchange = function() {
    enregistrerEvenement('action', `Vanne froide CTA forcée à ${this.value}%.`, 'cta');
};

// --- Boucles de simulation ---
setInterval(simulateCTA, 3000);
setInterval(simulateChaud, 3000);
setInterval(() => {
    document.getElementById('refresh-compteurs').click();
    document.getElementById('refresh-meteo').click();
}, 5000);


// --- Initialisation de la vue ---
document.addEventListener('DOMContentLoaded', () => {
  updateChartCTA();
  updateCompteursChartAndTable();
  updateChartMeteo();
  updateChartAlarmes();
  updateChartChaud();
  updateChaudUI();
  showTab('content-cta');

  // Sécuriser l'ajout du gestionnaire pour le bouton de consigne général chaud
  const consigneBtn = document.getElementById('valider-consigne-general-chaud');
  if (consigneBtn) {
    consigneBtn.onclick = function() {
      if (state.currentUser.role === "invite") return showToast("Action réservée aux opérateurs/admins", "danger");
      const consigneInput = document.getElementById('consigne-general-chaud');
      const resultat = document.getElementById('resultat-consigne-general-chaud');
      const val = Number(consigneInput.value);
      if (isNaN(val) || val < 40 || val > 90) {
        showToast("Consigne invalide (40-90°C)", "danger");
        return;
      }
      state.chaud.reseaux.r1.consigne = val;
      consigneInput.value = val;
      if (resultat) {
        resultat.style.display = 'inline';
        setTimeout(() => { resultat.style.display = 'none'; }, 2000);
      }
      enregistrerEvenement('action', `Consigne générale chaud réglée à ${val}°C.`, 'chaud');
    };
  }

  const btnStart = document.getElementById('chaud-start');
  const btnStop = document.getElementById('chaud-stop');
  if (btnStart && btnStop) {
    btnStart.disabled = state.chaud.on;
    btnStop.disabled = !state.chaud.on;
  }
// --- Export Excel (CSV) pour les compteurs ---
  const exportBtn = document.getElementById('export-compteurs');
  if (exportBtn) {
    exportBtn.onclick = function() {
      let csv = '';
      const periods = [
        { key: 'day', label: 'Jour' },
        { key: 'week', label: 'Semaine' },
        { key: 'month', label: 'Mois' },
        { key: 'year', label: 'Année' }
      ];
      periods.forEach(periodObj => {
        const periodData = getPeriodData(periodObj.key);
        csv += `--- ${periodObj.label} ---\n`;
        csv += 'Période,Électricité (kWh),Eau (m³),Gaz (m³)\n';
        periodData.forEach(item => {
          csv += `${item.label},${item.elec.toFixed(2)},${item.eau.toFixed(2)},${item.gaz.toFixed(2)}\n`;
        });
        csv += '\n';
      });
      const blob = new Blob([csv], { type: 'text/csv' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'compteurs.csv';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    };
  }
});