let tempNeuf = [18], tempSouffle = [20], tempRepris = [22];
let moteur = 5, vanneChaude = 0, vanneFroide = 0;
let horaire = [];

function drawCTASchema() {
  const canvas = document.getElementById('ctaCanvas');
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Facteur d'agrandissement et décalage pour centrage
  const f = 1.2;
  const dx = 40; // Décalage horizontal vers la gauche
  const dy = 60;

  ctx.font = `bold ${20 * f}px Arial`;
  ctx.textBaseline = "top";

  // Caisson principal
  ctx.strokeStyle = 'blue';
  ctx.lineWidth = 2;
  ctx.strokeRect(dx + 100*f, dy + 120*f, 500*f, 160*f);

  // Roue de récupération
  ctx.beginPath();
  ctx.strokeStyle = 'orange';
  ctx.lineWidth = 2;
  ctx.ellipse(dx + 350*f, dy + 200*f, 60*f, 40*f, 0, 0, 2 * Math.PI);
  ctx.stroke();
  ctx.closePath();

  // Registre air neuf
  ctx.fillStyle = 'lightblue';
  ctx.fillRect(dx + 60*f, dy + 150*f, 40*f, 100*f);

  // Registre air mélangé
  ctx.fillStyle = 'lightgreen';
  ctx.fillRect(dx + 600*f, dy + 150*f, 40*f, 100*f);

  // Moteur soufflage/reprise
  ctx.fillStyle = 'gray';
  ctx.fillRect(dx + 180*f, dy + 260*f, 40*f, 30*f);
  ctx.fillRect(dx + 480*f, dy + 260*f, 40*f, 30*f);

  // Vanne chaude
  ctx.fillStyle = 'red';
  ctx.fillRect(dx + 250*f, dy + 120*f, 20*f, 20*f);

  // Vanne froide
  ctx.fillStyle = 'blue';
  ctx.fillRect(dx + 430*f, dy + 120*f, 20*f, 20*f);

  // Textes lisibles et espacés
  ctx.fillStyle = 'black';
  ctx.fillText('Air Neuf', dx + 30*f, dy + 110*f);
  ctx.fillText('Air Mélangé', dx + 600*f, dy + 110*f);
  ctx.fillText('Moteur', dx + 170*f, dy + 295*f);
  ctx.fillText('Moteur', dx + 470*f, dy + 295*f);

  ctx.fillStyle = 'red';
  ctx.fillText('Vanne chaude', dx + 220*f, dy + 85*f);

  ctx.fillStyle = 'blue';
  ctx.fillText('Vanne froide', dx + 410*f, dy + 85*f);

  ctx.fillStyle = 'black';
  ctx.fillText(`T° Air Neuf: ${tempNeuf[tempNeuf.length-1].toFixed(1)}°C`, dx + 30*f, dy + 260*f);
  ctx.fillText(`T° Air Soufflé: ${tempSouffle[tempSouffle.length-1].toFixed(1)}°C`, dx + 300*f, dy + 260*f);
  ctx.fillText(`T° Air Repris: ${tempRepris[tempRepris.length-1].toFixed(1)}°C`, dx + 520*f, dy + 260*f);

  ctx.fillStyle = 'orange';
  ctx.fillText('Roue de récupération', dx + 270*f, dy + 160*f);
}

function updateMoteur() {
  moteur = parseFloat(document.getElementById('moteur').value);
  document.getElementById('moteurVal').textContent = moteur;
  simulate();
  drawCTASchema();
}

function updateVannes() {
  vanneChaude = parseInt(document.getElementById('vanneChaude').value);
  vanneFroide = parseInt(document.getElementById('vanneFroide').value);
  document.getElementById('vanneChaudeVal').textContent = vanneChaude;
  document.getElementById('vanneFroideVal').textContent = vanneFroide;
  simulate();
  drawCTASchema();
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
}

function afficherTendances() {
  document.getElementById('trend').style.display = 'block';
  document.getElementById('trendNeuf').textContent = tempNeuf.map(t=>t.toFixed(1)).join(' | ');
  document.getElementById('trendSouffle').textContent = tempSouffle.map(t=>t.toFixed(1)).join(' | ');
  document.getElementById('trendRepris').textContent = tempRepris.map(t=>t.toFixed(1)).join(' | ');
}

function cacherTendances() {
  document.getElementById('trend').style.display = 'none';
}

function programmerHoraire() {
  let debut = prompt("Entrer l'heure de début (HH:MM) :");
  if (!debut) return;
  let fin = prompt("Entrer l'heure de fin (HH:MM) :");
  if (!fin) return;
  horaire.push({debut, fin});
  document.getElementById('horaire').textContent =
    "Horaires programmés : " +
    horaire.map(h => `${h.debut} - ${h.fin}`).join(', ');
}

setInterval(() => {
  simulate();
  drawCTASchema();
}, 2000);

window.onload = function() {
  drawCTASchema();
  document.getElementById('moteurVal').textContent = moteur;
  document.getElementById('vanneChaudeVal').textContent = vanneChaude;
  document.getElementById('vanneFroideVal').textContent = vanneFroide;

  document.getElementById('moteur').addEventListener('input', updateMoteur);
  document.getElementById('vanneChaude').addEventListener('input', updateVannes);
  document.getElementById('vanneFroide').addEventListener('input', updateVannes);
  document.getElementById('btnTendances').addEventListener('click', afficherTendances);
  document.getElementById('btnFermerTendances').addEventListener('click', cacherTendances);
  document.getElementById('btnHoraire').addEventListener('click', programmerHoraire);
};