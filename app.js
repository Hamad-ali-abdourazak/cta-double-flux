let tempNeuf = [18], tempSouffle = [20], tempRepris = [22];
let moteur = 5, vanneChaude = 0, vanneFroide = 0;
let horaire = [];

function drawCTASchema() {
  const canvas = document.getElementById('ctaCanvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Caisson principal
  ctx.fillStyle = "#f3f3f3";
  ctx.strokeStyle = "#888";
  ctx.lineWidth = 3;
  ctx.fillRect(100, 100, 700, 220);
  ctx.strokeRect(100, 100, 700, 220);

  // Echangeur (orange)
  ctx.save();
  ctx.translate(450, 210);
  ctx.rotate(Math.PI/4);
  ctx.fillStyle = "#ffb74d";
  ctx.fillRect(-40, -40, 80, 80);
  ctx.strokeStyle = "#ff9800";
  ctx.lineWidth = 3;
  ctx.strokeRect(-40, -40, 80, 80);
  ctx.restore();

  // Ventilateurs
  ctx.beginPath();
  ctx.arc(170, 210, 28, 0, 2 * Math.PI);
  ctx.fillStyle = "#bdbdbd";
  ctx.fill();
  ctx.strokeStyle = "#607d8b";
  ctx.lineWidth = 3;
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(730, 210, 28, 0, 2 * Math.PI);
  ctx.fillStyle = "#bdbdbd";
  ctx.fill();
  ctx.strokeStyle = "#607d8b";
  ctx.lineWidth = 3;
  ctx.stroke();

  // Flèches de flux d'air
  function drawArrow(x1, y1, x2, y2, color) {
    ctx.save();
    ctx.strokeStyle = color;
    ctx.fillStyle = color;
    ctx.lineWidth = 7;
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
    // Tête de flèche
    const angle = Math.atan2(y2 - y1, x2 - x1);
    ctx.beginPath();
    ctx.moveTo(x2, y2);
    ctx.lineTo(x2 - 15 * Math.cos(angle - 0.3), y2 - 15 * Math.sin(angle - 0.3));
    ctx.lineTo(x2 - 15 * Math.cos(angle + 0.3), y2 - 15 * Math.sin(angle + 0.3));
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }
  drawArrow(60, 210, 170, 210, "#2196f3"); 
  drawArrow(730, 210, 840, 210, "#43a047"); 
  drawArrow(840, 130, 730, 130, "#e53935"); 
  drawArrow(170, 130, 60, 130, "#757575"); 

  // Températures dynamiques
  ctx.font = "bold 18px Arial";
  ctx.fillStyle = "#1976d2";
  ctx.fillText(`Air Neuf : ${tempNeuf[tempNeuf.length-1].toFixed(1)}°C`, 60, 250);
  ctx.fillStyle = "#43a047";
  ctx.fillText(`Air Soufflé : ${tempSouffle[tempSouffle.length-1].toFixed(1)}°C`, 700, 250);
  ctx.fillStyle = "#e53935";
  ctx.fillText(`Air Repris : ${tempRepris[tempRepris.length-1].toFixed(1)}°C`, 700, 120);
}

function updateCTABadges() {
  if (document.getElementById('badge-air-neuf')) {
    document.getElementById('badge-air-neuf').textContent =
      `Air Neuf : ${tempNeuf[tempNeuf.length-1].toFixed(1)} °C`;
    document.getElementById('badge-air-souffle').textContent =
      `Air Soufflé : ${tempSouffle[tempSouffle.length-1].toFixed(1)} °C`;
    document.getElementById('badge-air-repris').textContent =
      `Air Repris : ${tempRepris[tempRepris.length-1].toFixed(1)} °C`;
  }
}

function updateMoteur() {
  moteur = parseFloat(document.getElementById('moteur').value);
  document.getElementById('moteurVal').textContent = moteur;
  simulate();
  drawCTASchema();
  updateCTABadges();
}

function updateVannes() {
  vanneChaude = parseInt(document.getElementById('vanneChaude').value);
  vanneFroide = parseInt(document.getElementById('vanneFroide').value);
  document.getElementById('vanneChaudeVal').textContent = vanneChaude;
  document.getElementById('vanneFroideVal').textContent = vanneFroide;
  simulate();
  drawCTASchema();
  updateCTABadges();
}

function simulate() {
  let lastNeuf = tempNeuf[tempNeuf.length-1];
  let lastSouffle = tempSouffle[tempSouffle.length-1];
  let lastRepris = tempRepris[tempRepris.length-1];

  let newNeuf = lastNeuf + (Math.random()-0.5)*0.2;
  let newSouffle = lastSouffle + (vanneChaude - vanneFroide)*0.01 + (moteur-5)*0.02 + (Math.random()-0.5)*0.1;
  let newRepris = newSouffle + 2 + (Math.random()-0.5)*0.1;

  tempNeuf.push(newNeuf);
  tempSouffle.push(newSouffle);
  tempRepris.push(newRepris);

  if (tempNeuf.length > 10) tempNeuf.shift();
  if (tempSouffle.length > 10) tempSouffle.shift();
  if (tempRepris.length > 10) tempRepris.shift();
  updateCTABadges();
}

function afficherTendances() {
  document.getElementById('trend').style.display = 'block';
  const len = tempNeuf.length;
  let rows = '';
  for (let i = 0; i < len; i++) {
    rows += `<tr>
      <th scope="row">${i + 1}</th>
      <td>${tempNeuf[i].toFixed(1)}</td>
      <td>${tempSouffle[i].toFixed(1)}</td>
      <td>${tempRepris[i].toFixed(1)}</td>
    </tr>`;
  }
  document.getElementById('trendTableBody').innerHTML = rows;
}

function cacherTendances() {
  document.getElementById('trend').style.display = 'none';
}

function programmerHoraire() {
  document.getElementById('horaireInline').style.display = 'block';
}

document.addEventListener('DOMContentLoaded', function() {
  drawCTASchema();
  updateCTABadges();
  document.getElementById('moteurVal').textContent = moteur;
  document.getElementById('vanneChaudeVal').textContent = vanneChaude;
  document.getElementById('vanneFroideVal').textContent = vanneFroide;

  document.getElementById('moteur').addEventListener('input', updateMoteur);
  document.getElementById('vanneChaude').addEventListener('input', updateVannes);
  document.getElementById('vanneFroide').addEventListener('input', updateVannes);
  document.getElementById('btnTendances').addEventListener('click', afficherTendances);
  document.getElementById('btnFermerTendances').addEventListener('click', cacherTendances);
  document.getElementById('btnHoraire').addEventListener('click', programmerHoraire);

  document.getElementById('ajouterHoraire').onclick = function() {
    const debut = document.getElementById('heureDebutInline').value;
    const fin = document.getElementById('heureFinInline').value;
    if (!debut || !fin) {
      alert("Veuillez sélectionner une heure de début et de fin.");
      return;
    }
    horaire.push({debut, fin});
    let horairesTxt = `<ul class="horaire-list">` +
      horaire.map(h => `<li><span class="icon">🕒</span> <b>${h.debut}</b> &rarr; <b>${h.fin}</b></li>`).join('') +
      `</ul>`;
    document.getElementById('horaire').innerHTML =
      "<b>Horaires programmés :</b>" + horairesTxt;
    document.getElementById('heureDebutInline').value = '';
    document.getElementById('heureFinInline').value = '';
    document.getElementById('horaireInline').style.display = 'none';
  };

  // Onglets sidebar
  const tabCTA = document.getElementById('tab-cta');
  const tabConforts = document.getElementById('tab-conforts');
  const contentCTA = document.getElementById('content-cta');
  const contentConforts = document.getElementById('content-conforts');
  if (tabCTA && tabConforts && contentCTA && contentConforts) {
    tabCTA.onclick = function(e) {
      e.preventDefault();
      contentCTA.style.display = '';
      contentConforts.style.display = 'none';
      tabCTA.classList.add('active');
      tabConforts.classList.remove('active');
      drawCTASchema();
    };
    tabConforts.onclick = function(e) {
      e.preventDefault();
      contentCTA.style.display = 'none';
      contentConforts.style.display = '';
      tabConforts.classList.add('active');
      tabCTA.classList.remove('active');
    };
  }

  // Ventilo-convecteur
  const btnVC = document.getElementById('vc-appliquer');
  if (btnVC) {
    btnVC.onclick = function() {
      const vitesse = document.getElementById('vc-vitesse').value;
      const consigne = document.getElementById('vc-consigne').value;
      const res = document.getElementById('vc-resultat');
      res.style.display = '';
      res.textContent = `Ventilo-convecteur réglé sur vitesse ${vitesse} et consigne ${consigne}°C.`;
    };
  }
});

// Simulation automatique
setInterval(() => {
  simulate();
  drawCTASchema();
  updateCTABadges();
}, 2000);