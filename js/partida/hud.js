// ============================================================
// SPOTTED · HUD, minimapa y el anfitrión en pantalla
// ============================================================
import { ARMAS, RAREZAS } from './armas.js';
import { PELIGROS, SECTORES, MAP_R, sectorDe } from './mapa.js';

const $ = s => document.getElementById(s);

// cara del anfitrión (Doberman) dibujada
export function dibujarDoberman(cv, burla = false){
  const x = cv.getContext('2d'), W = cv.width, s = W/100;
  x.clearRect(0, 0, W, W); x.save(); x.scale(s, s);
  x.fillStyle = '#1b1b24'; x.fillRect(0, 0, 100, 100);
  // orejas
  x.fillStyle = '#121218';
  x.beginPath(); x.moveTo(20, 42); x.lineTo(24, 4); x.lineTo(40, 32); x.fill();
  x.beginPath(); x.moveTo(80, 42); x.lineTo(76, 4); x.lineTo(60, 32); x.fill();
  x.fillStyle = '#5a3a2a'; x.beginPath(); x.moveTo(25, 36); x.lineTo(26, 14); x.lineTo(35, 31); x.fill(); x.beginPath(); x.moveTo(75, 36); x.lineTo(74, 14); x.lineTo(65, 31); x.fill();
  // cabeza
  x.fillStyle = '#121218'; x.beginPath(); x.ellipse(50, 52, 30, 30, 0, 0, Math.PI*2); x.fill();
  // marcas color fuego
  x.fillStyle = '#b8743a';
  x.beginPath(); x.ellipse(50, 72, 17, 14, 0, 0, Math.PI*2); x.fill();
  x.beginPath(); x.ellipse(37, 43, 5, 3.5, 0, 0, Math.PI*2); x.fill(); x.beginPath(); x.ellipse(63, 43, 5, 3.5, 0, 0, Math.PI*2); x.fill();
  // ojos
  x.fillStyle = '#ff2d55'; x.shadowColor = '#ff2d55'; x.shadowBlur = 6;
  if (burla){ x.strokeStyle = '#ff2d55'; x.lineWidth = 3; x.beginPath(); x.arc(38, 54, 6, Math.PI*1.1, Math.PI*1.9); x.stroke(); x.beginPath(); x.arc(62, 54, 6, Math.PI*1.1, Math.PI*1.9); x.stroke(); }
  else { x.beginPath(); x.ellipse(38, 52, 6, 5, 0, 0, Math.PI*2); x.fill(); x.beginPath(); x.ellipse(62, 52, 6, 5, 0, 0, Math.PI*2); x.fill(); }
  x.shadowBlur = 0;
  // nariz y boca
  x.fillStyle = '#050508'; x.beginPath(); x.ellipse(50, 66, 7, 5, 0, 0, Math.PI*2); x.fill();
  x.strokeStyle = '#050508'; x.lineWidth = 2.5; x.beginPath(); x.moveTo(50, 70); x.lineTo(50, 76); x.quadraticCurveTo(43, 82, 38, 76); x.moveTo(50, 76); x.quadraticCurveTo(57, 82, 62, 76); x.stroke();
  if (burla){ x.fillStyle = '#ff7a8e'; x.beginPath(); x.ellipse(55, 82, 4, 5, 0, 0, Math.PI*2); x.fill(); }
  // collar con el ojo
  x.fillStyle = '#ff2d55'; x.fillRect(22, 90, 56, 7);
  x.restore();
}

export function crearHUD(G){
  const H = {};
  dibujarDoberman($('anfCara'), true);
  let anfT = 0, cola = [];
  H.feed = (txt, cls = '') => {
    const d = document.createElement('div'); d.textContent = txt; if (cls) d.className = cls;
    $('feed').prepend(d); setTimeout(() => d.remove(), 6000);
    while ($('feed').children.length > 5) $('feed').lastChild.remove();
  };
  H.aviso = txt => { const d = document.createElement('div'); d.textContent = txt; $('avisos').appendChild(d); setTimeout(() => d.remove(), 1800); while ($('avisos').children.length > 3) $('avisos').firstChild.remove(); };
  H.anfitrion = (txt, dur = 6) => { cola.push([txt, dur]); if (anfT <= 0) siguiente(); };
  const siguiente = () => { const n = cola.shift(); if (!n){ $('anfitrion').classList.add('oculto'); return; } $('anfitrion').querySelector('p').textContent = n[0]; $('anfitrion').classList.remove('oculto'); anfT = n[1]; };
  let hitT = 0;
  H.hitmarker = (cab = false) => { const h = $('hitm'); h.classList.toggle('cab', cab); h.style.opacity = 1; hitT = .12; };
  let dolorT = 0;
  H.dolor = dmg => { dolorT = Math.min(1, dolorT + dmg/40); };

  let lento = 0;
  H.update = dt => {
    if (anfT > 0){ anfT -= dt; if (anfT <= 0) siguiente(); }
    if (hitT > 0){ hitT -= dt; if (hitT <= 0) $('hitm').style.opacity = 0; }
    dolorT = Math.max(0, dolorT - dt*.8);
    $('vig').style.boxShadow = `inset 0 0 ${80 + dolorT*80}px rgba(255,0,40,${dolorT*.7})`;
    lento -= dt; if (lento > 0) return; lento = .1;
    const J = G.jugador; if (!J) return;
    const rest = Math.max(0, G.T.dur - G.t);
    $('reloj').textContent = G.fase === 'final' && G.t > G.T.dur ? 'MUERTE SÚBITA' : `${Math.floor(rest/60)}:${String(Math.floor(rest % 60)).padStart(2, '0')}`;
    const vivos = G.entidades.filter(e => e.estado !== 'muerto').length;
    const equipos = new Set(G.entidades.filter(e => e.estado !== 'muerto').map(e => e.equipo)).size;
    $('vivos').textContent = `${vivos} VIVOS · ${equipos} EQUIPOS · ${J.kills} ✕`;
    // alerta del sector
    const al = $('alerta'), s = sectorDe(J.pos.x, J.pos.z);
    if (G.fase === 'final'){ al.textContent = Math.hypot(J.pos.x, J.pos.z) > G.cornuR ? '⚠ FUERA DE LA CORNUCOPIA' : 'DUELO EN LA CORNUCOPIA'; al.style.background = 'rgba(245,208,111,.85)'; al.style.color = '#000'; }
    else if (s && G.sellados.has(s)){ al.textContent = `⚠ SECTOR ${s} SELLADO · SAL YA`; al.style.background = 'rgba(255,45,85,.9)'; al.style.color = '#fff'; }
    else if (G.porSellar && G.porSellar.n === s){ al.textContent = `⚠ ESTE SECTOR SE SELLA EN ${Math.ceil(G.porSellar.t)} s`; al.style.background = 'rgba(255,45,85,.9)'; al.style.color = '#fff'; }
    else if (G.peligro && G.peligro.sector === s){ const p = G.peligro; al.textContent = p.activo ? `⚠ ${PELIGROS[p.tipo].nombre}` : `${PELIGROS[p.tipo].nombre} EN ${Math.ceil(p.aviso)} s`; al.style.background = PELIGROS[p.tipo].color; al.style.color = '#000'; }
    else al.textContent = s ? `SECTOR ${s} · ${SECTORES[s].nombre.toUpperCase()}` : 'CORNUCOPIA', al.style.background = 'rgba(0,0,0,.4)', al.style.color = '#fff';
    // vitales
    $('bVida').style.width = Math.max(0, J.estado === 'derribado' ? J.vida/30*100 : J.vida) + '%';
    $('bVida').style.background = J.estado === 'derribado' ? '#ff8a3d' : '';
    $('tVida').textContent = Math.ceil(Math.max(0, J.vida));
    $('bEscudo').style.width = (J.escudoMax ? J.escudo/50*100 : 0) + '%';
    $('bHambre').style.width = J.hambre + '%'; $('bStamina').style.width = J.stamina + '%';
    $('bStamina').style.opacity = J.cansado ? .4 : 1;
    // armas
    for (let i = 0; i < 2; i++){
      const a = J.armas[i], el = $('slot' + i);
      el.classList.toggle('act', J.actual === i);
      el.querySelector('b').textContent = a ? a.def.nombre : '—';
      el.querySelector('b').style.color = a ? RAREZAS[a.rareza].color : '#777';
    }
    const a = J.armas[J.actual];
    $('municion').innerHTML = a ? `${a.recargando > 0 ? '…' : a.balas} / ${a.def.cargador} <small>⚙ ${J.chatarra}</small>` : `PUÑOS <small>⚙ ${J.chatarra}</small>`;
    $('nIny').textContent = J.items.inyPeq + J.items.inyGrande;
    $('nComida').textContent = J.items.arepa + J.items.tequenos + J.items.malta;
    $('nPlaca').textContent = J.items.placa;
    H.minimapa();
  };

  // ---------- minimapa ----------
  const mm = $('mm'), mx = mm.getContext('2d');
  H.minimapa = (cv = mm, ctx = mx, grande = false) => {
    const W = cv.width, k = W/512, e = G.M.mmEscala*k;
    ctx.clearRect(0, 0, W, W);
    ctx.drawImage(G.M.minimapaBase, 0, 0, W, W);
    const c = W/2;
    for (let n = 1; n <= 12; n++){
      let col = null;
      if (G.sellados && G.sellados.has(n)) col = 'rgba(255,45,85,.45)';
      else if (G.porSellar && G.porSellar.n === n) col = 'rgba(255,45,85,.22)';
      else if (G.peligro && G.peligro.sector === n) col = PELIGROS[G.peligro.tipo].color + (G.peligro.activo ? '88' : '44');
      if (!col) continue;
      const a0 = (n - 1)*Math.PI/6 - Math.PI/2;
      ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(c, c); ctx.arc(c, c, (MAP_R + 3)*e, a0, a0 + Math.PI/6); ctx.closePath(); ctx.fill();
    }
    if (G.fase === 'final'){ ctx.strokeStyle = '#f5d06f'; ctx.lineWidth = 3*k; ctx.beginPath(); ctx.arc(c, c, G.cornuR*e, 0, Math.PI*2); ctx.stroke(); }
    if (G.airdrop && !G.airdrop.abierto){ ctx.fillStyle = '#ff2d55'; ctx.beginPath(); ctx.arc(c + G.airdrop.pos.x*e, c + G.airdrop.pos.z*e, 8*k, 0, Math.PI*2); ctx.fill(); ctx.fillStyle = '#fff'; ctx.font = `700 ${14*k}px sans-serif`; ctx.textAlign = 'center'; ctx.fillText('✦', c + G.airdrop.pos.x*e, c + G.airdrop.pos.z*e + 5*k); }
    const J = G.jugador; if (!J || grande) return;
    for (const o of G.entidades){
      if (o === J || o.equipo !== J.equipo || o.estado === 'muerto') continue;
      ctx.fillStyle = o.estado === 'derribado' ? '#ff8a3d' : '#39ff9f'; ctx.beginPath(); ctx.arc(c + o.pos.x*e, c + o.pos.z*e, 6*k, 0, Math.PI*2); ctx.fill();
    }
    ctx.save(); ctx.translate(c + J.pos.x*e, c + J.pos.z*e); ctx.rotate(-J.camYaw + Math.PI);
    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.moveTo(0, -14*k); ctx.lineTo(9*k, 10*k); ctx.lineTo(-9*k, 10*k); ctx.closePath(); ctx.fill(); ctx.restore();
  };

  H.accion = (txt) => { const b = $('bAccion'); if (!txt){ b.classList.add('oculto'); return; } b.textContent = txt; b.classList.remove('oculto'); };
  H.progreso = (txt, f) => { const p = $('progreso'); if (txt == null){ p.classList.add('oculto'); return; } p.classList.remove('oculto'); p.querySelector('span').textContent = txt; p.querySelector('i').style.width = (f*100) + '%'; };
  H.derribado = txt => { const d = $('derribadoTxt'); if (!txt){ d.classList.add('oculto'); return; } d.classList.remove('oculto'); d.textContent = txt; };
  return H;
}
