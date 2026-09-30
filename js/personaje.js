// ============================================================
// SPOTTED · Motor de personaje
// Cuerpo cómico de proporciones grandes: cabeza cómica, torso,
// brazos con codo, piernas con rodilla. Cara dibujada en canvas.
// Uso: const p = crearPersonaje(cfg); scene.add(p.root); p.update(dt, 'walk', 'normal');
// ============================================================
import * as THREE from 'three';

const TAU = Math.PI * 2;
const lerp = (a, b, k) => a + (b - a) * k;
const sph = (phi, th) => new THREE.Vector3(-Math.cos(phi)*Math.sin(th), Math.cos(th), Math.sin(phi)*Math.sin(th));
const Y = new THREE.Vector3(0, 1, 0), Z = new THREE.Vector3(0, 0, 1);

// región de la cara sobre la esfera de la cabeza (compartida por cara y barba)
const FACE_PHI0 = Math.PI/2 - 0.85, FACE_PHI_LEN = 1.7;
const FACE_TH0 = Math.PI/2 - 0.45, FACE_TH_LEN = 1.0;

function canvasTex(w, h){
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
  return { c, ctx: c.getContext('2d'), t };
}
function shade(hex, k){ const c = new THREE.Color(hex); c.multiplyScalar(k); return '#' + c.getHexString(); }

const CUERPO = { delgado:{ bw:.86, lt:.86, belly:0 }, medio:{ bw:1, lt:1, belly:0 }, robusto:{ bw:1.28, lt:1.2, belly:1 } };
const ALTURA = { bajo:.88, medio:1, alto:1.1 };
const TORSO = [[0,-0.04],[0.2,-0.04],[0.22,0.04],[0.212,0.22],[0.225,0.4],[0.235,0.49],[0.2,0.555],[0.1,0.6],[0,0.61]];
const rAt = (prof, y) => { for (let i = 1; i < prof.length; i++){ const [r0,y0] = prof[i-1], [r1,y1] = prof[i]; if (y <= y1 && y1 > y0) return lerp(r0, r1, (y - y0)/(y1 - y0)); } return prof[prof.length-1][0]; };

// ------------------------------------------------------------
// TATUAJES (diseños en tinta)
// ------------------------------------------------------------
export function dibujarTatuaje(ctx, id, cx, cy, s, ink = 'rgba(22,24,40,.92)'){
  if (!id) return;
  ctx.save(); ctx.translate(cx, cy); ctx.scale(s, s);
  ctx.strokeStyle = ink; ctx.fillStyle = ink; ctx.lineWidth = 5; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  const P = new Path2D();
  switch (id){
    case 'ojo':
      ctx.beginPath(); ctx.moveTo(-40, 6); ctx.quadraticCurveTo(0, -30, 40, 6); ctx.quadraticCurveTo(0, 40, -40, 6); ctx.stroke();
      ctx.beginPath(); ctx.arc(0, 6, 11, 0, TAU); ctx.fill();
      for (let i = 0; i < 5; i++){ const a = Math.PI + (i + .5)*Math.PI/5; ctx.beginPath(); ctx.moveTo(Math.cos(a)*26, 4 + Math.sin(a)*20); ctx.lineTo(Math.cos(a)*42, 4 + Math.sin(a)*36); ctx.stroke(); }
      break;
    case 'rayo':
      ctx.beginPath(); ctx.moveTo(8,-44); ctx.lineTo(-18,4); ctx.lineTo(2,4); ctx.lineTo(-8,44); ctx.lineTo(22,-8); ctx.lineTo(2,-8); ctx.closePath(); ctx.fill(); break;
    case 'estrellas':
      for (const [x, y, r] of [[-18,-18,16],[20,4,12],[-6,28,9]]){ ctx.beginPath();
        for (let k = 0; k < 10; k++){ const a = -Math.PI/2 + k*Math.PI/5, rr = k % 2 ? r*.45 : r; ctx.lineTo(x + Math.cos(a)*rr, y + Math.sin(a)*rr); }
        ctx.closePath(); ctx.fill(); } break;
    case 'rosa':
      for (let k = 0; k < 3; k++){ ctx.beginPath(); ctx.arc(0, -8, 8 + k*9, k*.8, k*.8 + Math.PI*1.4); ctx.stroke(); }
      ctx.beginPath(); ctx.moveTo(0, 22); ctx.lineTo(0, 46); ctx.stroke();
      ctx.beginPath(); ctx.ellipse(-12, 32, 10, 5, -.5, 0, TAU); ctx.fill(); break;
    case 'codigo':
      for (let k = 0; k < 13; k++){ const w = [2,4,2,6,2,2,4,6,2,4,2,2,6][k]; ctx.fillRect(-36 + k*6, -26, w, 36); }
      ctx.font = '700 16px monospace'; ctx.textAlign = 'center'; ctx.fillText('T-00' , 0, 32); break;
    case 'spot':
      ctx.font = '900 30px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('SPOT', 0, 0);
      ctx.lineWidth = 3; ctx.strokeRect(-46, -22, 92, 44); break;
    case 'tribal':
      ctx.lineWidth = 7;
      ctx.beginPath(); ctx.moveTo(-40, 30); ctx.quadraticCurveTo(-10, -10, 30, -30); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(-30, 42); ctx.quadraticCurveTo(0, 10, 40, -6); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(-40, 10); ctx.quadraticCurveTo(-20, -20, 0, -40); ctx.stroke(); break;
    case 'corona':
      ctx.beginPath(); ctx.moveTo(-36, 20); ctx.lineTo(-36, -14); ctx.lineTo(-18, 4); ctx.lineTo(0, -24); ctx.lineTo(18, 4); ctx.lineTo(36, -14); ctx.lineTo(36, 20); ctx.closePath(); ctx.stroke();
      for (const x of [-36, 0, 36]){ ctx.beginPath(); ctx.arc(x, x === 0 ? -28 : -18, 5, 0, TAU); ctx.fill(); } break;
    case 'lagrima':
      ctx.beginPath(); ctx.moveTo(0, -30); ctx.quadraticCurveTo(24, 10, 0, 28); ctx.quadraticCurveTo(-24, 10, 0, -30); ctx.fill(); break;
  }
  ctx.restore();
}

// ------------------------------------------------------------
// CARA (dibujada)
// ------------------------------------------------------------
function dibujarCara(ctx, cfg, expr, blink){
  ctx.clearRect(0, 0, 512, 512);
  const ink = '#1f1614';
  const L = { cx:172, cy:262 }, R = { cx:340, cy:262 };
  const eyeCol = cfg.colorOjos;

  // sombra de barba
  if (cfg.barba === 'sombra'){
    ctx.save(); ctx.globalAlpha = .28; ctx.fillStyle = cfg.colorBarba;
    ctx.beginPath(); ctx.moveTo(40, 330); ctx.quadraticCurveTo(256, 300, 472, 330); ctx.lineTo(470, 440); ctx.quadraticCurveTo(256, 540, 42, 440); ctx.closePath(); ctx.fill();
    ctx.restore();
  }
  // ojeras
  if (cfg.detalles.includes('ojeras')){
    ctx.strokeStyle = 'rgba(90,60,90,.35)'; ctx.lineWidth = 7;
    for (const e of [L, R]){ ctx.beginPath(); ctx.arc(e.cx, e.cy + 20, 44, Math.PI*.2, Math.PI*.8); ctx.stroke(); }
  }
  // rubor
  ctx.save(); ctx.filter = 'blur(7px)'; ctx.fillStyle = 'rgba(255,110,120,.28)';
  ctx.beginPath(); ctx.ellipse(118, 330, 40, 20, 0, 0, TAU); ctx.fill();
  ctx.beginPath(); ctx.ellipse(394, 330, 40, 20, 0, 0, TAU); ctx.fill(); ctx.restore();
  // pecas
  if (cfg.detalles.includes('pecas')){
    ctx.fillStyle = 'rgba(120,70,40,.55)';
    for (const [x, y] of [[112,318],[130,334],[100,340],[146,322],[400,318],[382,334],[412,340],[366,322],[240,300],[272,300]]){ ctx.beginPath(); ctx.arc(x, y, 4.5, 0, TAU); ctx.fill(); }
  }

  // ----- ojos -----
  const iris = (e, w, h) => {
    ctx.save(); ctx.clip();
    const g = ctx.createLinearGradient(0, e.cy - h, 0, e.cy + h);
    g.addColorStop(0, shade(eyeCol, .45)); g.addColorStop(.6, eyeCol); g.addColorStop(1, shade(eyeCol, 1.4));
    ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(e.cx, e.cy + h*.08, w*.7, h*.78, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = '#120c0a'; ctx.beginPath(); ctx.ellipse(e.cx, e.cy + h*.1, w*.32, h*.38, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.ellipse(e.cx - w*.25, e.cy - h*.28, w*.2, h*.2, -.4, 0, TAU); ctx.fill();
    ctx.beginPath(); ctx.arc(e.cx + w*.28, e.cy + h*.3, w*.09, 0, TAU); ctx.fill();
    ctx.restore();
  };
  const eyeOpen = (e, sx = 1, sy = 1, lid = 0) => {
    const w = 52*sx, h = 62*sy;
    const side = e.cx < 256 ? -1 : 1;
    ctx.save();
    if (lid > 0){ ctx.beginPath(); ctx.rect(e.cx - w - 30, e.cy - h + h*2*lid, (w + 30)*2, h*3); ctx.clip(); }
    // blanco
    ctx.fillStyle = '#fbfaf7'; ctx.beginPath();
    if (cfg.ojos === 'almendrados' || cfg.ojos === 'felinos'){
      const up = cfg.ojos === 'felinos' ? 12 : 0;
      ctx.moveTo(e.cx - w - 6, e.cy + (side < 0 ? up*.2 : -up)); ctx.quadraticCurveTo(e.cx, e.cy - h*1.05, e.cx + w + 6, e.cy + (side > 0 ? up*.2 : -up));
      ctx.moveTo(e.cx - w - 6, e.cy + (side < 0 ? up*.2 : -up)); ctx.quadraticCurveTo(e.cx, e.cy + h*.9, e.cx + w + 6, e.cy + (side > 0 ? up*.2 : -up));
      ctx.beginPath();
      ctx.moveTo(e.cx - w - 6, e.cy + (side < 0 ? up*.2 : -up)); ctx.quadraticCurveTo(e.cx, e.cy - h*1.05, e.cx + w + 6, e.cy + (side > 0 ? up*.2 : -up));
      ctx.quadraticCurveTo(e.cx, e.cy + h*.9, e.cx - w - 6, e.cy + (side < 0 ? up*.2 : -up));
      ctx.fill();
      iris(e, w, h*.8);
      ctx.strokeStyle = ink; ctx.lineWidth = 8; ctx.beginPath();
      ctx.moveTo(e.cx - w - 6, e.cy + (side < 0 ? up*.2 : -up)); ctx.quadraticCurveTo(e.cx, e.cy - h*1.05, e.cx + w + 6, e.cy + (side > 0 ? up*.2 : -up)); ctx.stroke();
      if (cfg.ojos === 'felinos'){ ctx.beginPath(); ctx.moveTo(e.cx + side*(w + 4), e.cy - up + 2); ctx.lineTo(e.cx + side*(w + 22), e.cy - up - 12); ctx.stroke(); }
    } else {
      ctx.ellipse(e.cx, e.cy, w, h, 0, 0, TAU); ctx.fill();
      iris(e, w, h);
      ctx.strokeStyle = ink; ctx.lineWidth = 7; ctx.beginPath(); ctx.ellipse(e.cx, e.cy, w, h, 0, 0, TAU); ctx.stroke();
    }
    ctx.restore();
    if (lid > 0){ const ly = e.cy - h + h*2*lid; ctx.strokeStyle = ink; ctx.lineWidth = 9; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(e.cx - w - 4, ly + 4); ctx.quadraticCurveTo(e.cx, ly - 6, e.cx + w + 4, ly + 4); ctx.stroke(); }
  };
  const eyeDot = (e, s = 1) => { ctx.fillStyle = ink; ctx.beginPath(); ctx.ellipse(e.cx, e.cy, 19*s, 24*s, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(e.cx - 5, e.cy - 7, 5, 0, TAU); ctx.fill(); };
  const eyeClosed = e => { ctx.strokeStyle = ink; ctx.lineWidth = 9; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(e.cx - 36, e.cy + 2); ctx.quadraticCurveTo(e.cx, e.cy + 16, e.cx + 36, e.cy + 2); ctx.stroke(); };
  const eyeHappy = e => { ctx.strokeStyle = ink; ctx.lineWidth = 10; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.arc(e.cx, e.cy + 16, 32, Math.PI*1.12, Math.PI*1.88); ctx.stroke(); };
  const eyePain = e => { const s = e.cx < 256 ? 1 : -1; ctx.strokeStyle = ink; ctx.lineWidth = 10; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.beginPath(); ctx.moveTo(e.cx - s*30, e.cy - 22); ctx.lineTo(e.cx + s*22, e.cy); ctx.lineTo(e.cx - s*30, e.cy + 22); ctx.stroke(); };

  const baseLid = cfg.ojos === 'relajados' ? .26 : 0;
  const draw = (fn) => { fn(L); fn(R); };
  if (blink && !['feliz','dolor'].includes(expr)) draw(eyeClosed);
  else if (expr === 'feliz') draw(eyeHappy);
  else if (expr === 'dolor') draw(eyePain);
  else if (cfg.ojos === 'puntos'){
    const s = expr === 'sorpresa' ? 1.3 : expr === 'enojado' ? .85 : 1; draw(e => eyeDot(e, s));
  } else if (expr === 'sorpresa') draw(e => eyeOpen(e, 1.08, 1.14, 0));
  else if (expr === 'enojado') draw(e => eyeOpen(e, 1, .95, Math.max(baseLid, .24)));
  else if (expr === 'triste') draw(e => eyeOpen(e, 1, .95, baseLid*.5));
  else draw(e => eyeOpen(e, 1, 1, baseLid));

  // cicatriz sobre el ojo izquierdo del personaje (derecha de la imagen)
  if (cfg.detalles.includes('cicatriz')){
    ctx.strokeStyle = 'rgba(150,60,60,.8)'; ctx.lineWidth = 6; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(R.cx + 20, R.cy - 96); ctx.lineTo(R.cx - 6, R.cy + 70); ctx.stroke();
    ctx.lineWidth = 3; for (let k = 0; k < 4; k++){ const y = R.cy - 70 + k*40, x = R.cx + 16 - k*6; ctx.beginPath(); ctx.moveTo(x - 10, y); ctx.lineTo(x + 10, y + 4); ctx.stroke(); }
  }

  // ----- cejas -----
  ctx.strokeStyle = cfg.colorPelo === '#e8e2d8' ? '#8b8175' : shade(cfg.colorPelo, cfg.pelo === 'calvo' ? .8 : 1);
  ctx.lineCap = 'round';
  const bw = { normal:10, gruesas:17, finas:5, arqueadas:8, cortada:10 }[cfg.cejas] || 10;
  ctx.lineWidth = bw;
  const brow = (e, tilt, dy) => {
    const s = e.cx < 256 ? 1 : -1; const y0 = e.cy - 100 + dy;
    ctx.beginPath();
    if (cfg.cejas === 'arqueadas'){ ctx.moveTo(e.cx - 38, y0 + 8 + s*tilt*30); ctx.quadraticCurveTo(e.cx, y0 - 22, e.cx + 38, y0 + 8 - s*tilt*30); }
    else { ctx.moveTo(e.cx - 36, y0 + s*tilt*30); ctx.quadraticCurveTo(e.cx, y0 - 8, e.cx + 36, y0 - s*tilt*30); }
    ctx.stroke();
    if (cfg.cejas === 'cortada' && e.cx > 256){ ctx.save(); ctx.globalCompositeOperation = 'destination-out'; ctx.lineWidth = 6;
      ctx.beginPath(); ctx.moveTo(e.cx + 8, y0 - 16); ctx.lineTo(e.cx + 2, y0 + 16); ctx.stroke(); ctx.restore(); }
  };
  if (expr === 'enojado'){ brow(L, -.55, 14); brow(R, -.55, 14); }
  else if (expr === 'triste' || expr === 'dolor'){ brow(L, .45, 2); brow(R, .45, 2); }
  else if (expr === 'sorpresa'){ brow(L, 0, -16); brow(R, 0, -16); }
  else { brow(L, .05, 0); brow(R, .05, 0); }

  // ----- nariz -----
  const ny = 322; ctx.strokeStyle = 'rgba(80,40,30,.55)'; ctx.fillStyle = 'rgba(80,40,30,.35)'; ctx.lineWidth = 6; ctx.lineCap = 'round';
  if (cfg.nariz === 'boton'){ ctx.beginPath(); ctx.ellipse(256, ny, 16, 11, 0, 0, TAU); ctx.fill(); ctx.fillStyle = 'rgba(255,255,255,.35)'; ctx.beginPath(); ctx.arc(250, ny - 4, 4, 0, TAU); ctx.fill(); }
  else if (cfg.nariz === 'punto'){ ctx.fillStyle = 'rgba(60,30,20,.7)'; ctx.beginPath(); ctx.arc(256, ny, 5, 0, TAU); ctx.fill(); }
  else if (cfg.nariz === 'triangulo'){ ctx.beginPath(); ctx.moveTo(262, ny - 36); ctx.lineTo(272, ny + 4); ctx.lineTo(252, ny + 6); ctx.stroke(); }
  else if (cfg.nariz === 'ancha'){ ctx.beginPath(); ctx.moveTo(232, ny); ctx.quadraticCurveTo(256, ny + 14, 280, ny); ctx.stroke();
    ctx.beginPath(); ctx.arc(240, ny - 2, 4, 0, TAU); ctx.arc(272, ny - 2, 4, 0, TAU); ctx.fill(); }

  // ----- boca -----
  const my = 392; ctx.strokeStyle = ink; ctx.lineWidth = 7; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  let boca = cfg.boca;
  if (expr === 'feliz') boca = 'grande';
  if (expr === 'enojado') boca = 'enojo';
  if (expr === 'sorpresa') boca = 'o';
  if (expr === 'triste' || expr === 'dolor') boca = 'triste';
  if (boca === 'sonrisa'){ ctx.beginPath(); ctx.moveTo(222, my - 4); ctx.quadraticCurveTo(256, my + 22, 290, my - 4); ctx.stroke(); }
  else if (boca === 'gatito'){ ctx.beginPath(); ctx.moveTo(220, my - 2); ctx.quadraticCurveTo(238, my + 18, 256, my); ctx.quadraticCurveTo(274, my + 18, 292, my - 2); ctx.stroke(); }
  else if (boca === 'seria'){ ctx.beginPath(); ctx.moveTo(228, my + 4); ctx.lineTo(284, my + 4); ctx.stroke(); }
  else if (boca === 'colmillo'){ ctx.beginPath(); ctx.moveTo(222, my - 4); ctx.quadraticCurveTo(256, my + 22, 290, my - 4); ctx.stroke();
    ctx.fillStyle = '#fff'; ctx.strokeStyle = ink; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(270, my + 5); ctx.lineTo(282, my + 2); ctx.lineTo(276, my + 20); ctx.closePath(); ctx.fill(); ctx.stroke(); }
  else if (boca === 'grande'){ ctx.fillStyle = '#5a1b1b'; ctx.beginPath(); ctx.moveTo(214, my - 10); ctx.quadraticCurveTo(256, my + 56, 298, my - 10); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#fff'; ctx.fillRect(228, my - 8, 56, 10); ctx.fillStyle = '#ff7a7a'; ctx.beginPath(); ctx.ellipse(256, my + 24, 16, 8, 0, 0, TAU); ctx.fill(); }
  else if (boca === 'enojo'){ ctx.fillStyle = '#5a1b1b'; ctx.beginPath(); ctx.moveTo(226, my + 12); ctx.quadraticCurveTo(256, my - 8, 286, my + 12); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#fff'; ctx.fillRect(236, my + 2, 40, 6); }
  else if (boca === 'o'){ ctx.fillStyle = '#5a1b1b'; ctx.beginPath(); ctx.ellipse(256, my + 6, 14, 18, 0, 0, TAU); ctx.fill(); ctx.stroke(); }
  else if (boca === 'triste'){ ctx.beginPath(); ctx.moveTo(230, my + 12); ctx.quadraticCurveTo(256, my - 6, 282, my + 12); ctx.stroke(); }

  // lunar y curita
  if (cfg.detalles.includes('lunar')){ ctx.fillStyle = '#2b1a14'; ctx.beginPath(); ctx.arc(306, my - 16, 6, 0, TAU); ctx.fill(); }
  if (cfg.detalles.includes('curita')){
    ctx.save(); ctx.translate(126, 318); ctx.rotate(.45);
    ctx.fillStyle = '#f1d3a4'; ctx.strokeStyle = '#cfa46c'; ctx.lineWidth = 3; ctx.beginPath(); ctx.roundRect(-40, -13, 80, 26, 12); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#fbe7c7'; ctx.fillRect(-12, -10, 24, 20); ctx.restore();
  }
  // tatuaje de cara (mejilla izquierda del personaje)
  if (cfg.tatuajes.cara) dibujarTatuaje(ctx, cfg.tatuajes.cara, 420, 262, .42);
}

// ------------------------------------------------------------
// BARBA (capa con la misma forma que la cara)
// ------------------------------------------------------------
function dibujarBarba(ctx, estilo, color){
  ctx.clearRect(0, 0, 512, 512);
  const my = 392;
  ctx.fillStyle = color;
  if (estilo === 'completa'){
    ctx.beginPath(); ctx.moveTo(0, 300); ctx.lineTo(50, 300); ctx.quadraticCurveTo(90, 385, 190, 382); ctx.quadraticCurveTo(256, 372, 322, 382);
    ctx.quadraticCurveTo(422, 385, 462, 300); ctx.lineTo(512, 300); ctx.lineTo(512, 512); ctx.lineTo(0, 512); ctx.closePath(); ctx.fill();
  } else if (estilo === 'candado'){
    ctx.beginPath(); ctx.ellipse(256, my + 34, 74, 90, 0, 0, TAU); ctx.fill();
  }
  // hueco de la boca
  ctx.save(); ctx.globalCompositeOperation = 'destination-out';
  ctx.beginPath(); ctx.ellipse(256, my + 6, 48, 22, 0, 0, TAU); ctx.fill(); ctx.restore();
  // mechones (textura)
  ctx.save(); ctx.globalCompositeOperation = 'source-atop'; ctx.strokeStyle = shade(color, .7); ctx.lineWidth = 3;
  for (let i = 0; i < 160; i++){ const x = Math.random()*512, y = 300 + Math.random()*212; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + (Math.random()-.5)*6, y + 10); ctx.stroke(); }
  ctx.restore();
}

// ------------------------------------------------------------
// PEINADOS
// ------------------------------------------------------------
function construirPelo(g, id, R, M, MD){
  const mk = (geo, mat, p = [0,0,0], s = null) => { const m = new THREE.Mesh(geo, mat); m.position.set(...p); if (s) m.scale.set(...s); m.castShadow = true; g.add(m); return m; };
  const orient = (m, n, dir, len) => { m.position.copy(n.clone().multiplyScalar(R*1.0)).addScaledVector(dir, len*.45); m.quaternion.setFromUnitVectors(Y, dir); };
  const capa = (r, th, mat = M) => mk(new THREE.SphereGeometry(R*r, 40, 20, 0, TAU, 0, th), mat);
  const nuca = (r, th, ext = .7, mat = M) => mk(new THREE.SphereGeometry(R*r, 40, 24, Math.PI - ext, Math.PI + ext*2, 0, th), mat);
  const rapado = () => { const m = new THREE.MeshStandardMaterial({ color: M.color, roughness: .95 }); capa(1.012, 1.28, m); nuca(1.012, 2.0, .72, m); };
  const flequillo = (n, len, th = 1.12, span = .55, grosor = .07) => {
    for (let i = 0; i < n; i++){
      const phi = Math.PI/2 - span + (2*span)*(i/(n-1||1)), nn = sph(phi, th);
      const dir = nn.clone().multiplyScalar(.9).add(new THREE.Vector3(0, -1, 0)).normalize();
      orient(mk(new THREE.SphereGeometry(1, 14, 10), M, [0,0,0], [grosor, len, grosor*.75]), nn, dir, len);
    }
  };
  const patillas = (len = .1) => { for (const s of [-1, 1]){ const nn = sph(Math.PI/2 + s*.95, 1.5);
    const m = mk(new THREE.SphereGeometry(1, 14, 10), M, [0,0,0], [.035, len, .03]); m.position.copy(nn.multiplyScalar(R*1.0)); } };

  switch (id){
    case 'calvo': break;
    case 'rapado': rapado(); break;
    case 'corto':
      capa(1.05, 1.16); nuca(1.045, 1.95, .75); flequillo(6, .075, 1.1, .6, .075); patillas(); break;
    case 'fade':
      rapado();
      mk(new THREE.SphereGeometry(R*1.07, 36, 16, 0, TAU, 0, .9), M, [0, .01, -.005], [1, 1.1, 1]);
      { const m = mk(new THREE.SphereGeometry(1, 20, 14), M, [0,0,0], [.13, .075, .1]);
        m.position.set(0, R*.93, R*.5); m.rotation.x = .45; }
      break;
    case 'desordenado':
      capa(1.05, 1.2); nuca(1.045, 1.9, .75);
      for (let i = 0; i < 20; i++){
        const phi = (i * 2.4) % TAU, th = .25 + (i % 5) * .2;
        const nn = sph(phi, th); const dir = nn.clone().add(new THREE.Vector3(0, .5, 0)).normalize();
        orient(mk(new THREE.SphereGeometry(1, 12, 8), M, [0,0,0], [.05, .1, .04]), nn.multiplyScalar(1.02), dir, .1);
      }
      flequillo(5, .08, 1.1, .5, .06); break;
    case 'afro':
      nuca(1.02, 2.0, .72);
      mk(new THREE.SphereGeometry(.33, 36, 24), M, [0, .1, -.1], [1.05, .95, 1]);
      for (let i = 0; i < 26; i++){ const nn = sph((i*2.4) % TAU, .3 + (i % 6)*.2); mk(new THREE.SphereGeometry(.06, 10, 8), M, [nn.x*.33*1.05, .1 + nn.y*.31, -.1 + nn.z*.33]); }
      break;
    case 'afropuffs':
      rapado();
      for (const s of [-1, 1]){ mk(new THREE.SphereGeometry(.12, 24, 16), M, [s*.17, .2, -.03]); mk(new THREE.TorusGeometry(.06, .015, 8, 20), MD, [s*.12, .15, -.02]).rotation.set(Math.PI/2, 0, s*.8); }
      break;
    case 'trenzas':
      rapado();
      for (let k = -2; k <= 2; k++){
        const pts = [];
        for (let i = 0; i <= 16; i++){
          const ang = lerp(-1.05, 2.05, i/16);            // de la frente (z+) a la nuca (z-) pasando por arriba
          pts.push(new THREE.Vector3(k*.24, Math.cos(ang), -Math.sin(ang)).normalize().multiplyScalar(R*1.035));
        }
        const curve = new THREE.CatmullRomCurve3(pts);
        mk(new THREE.TubeGeometry(curve, 40, .019, 8, false), M);
        for (let i = 1; i < 12; i++){ const p = curve.getPoint(i/12); mk(new THREE.SphereGeometry(.023, 8, 6), MD, [p.x, p.y, p.z]); }
      }
      break;
    case 'rastas':
      capa(1.05, 1.2); nuca(1.045, 1.9, .75);
      for (let i = 0; i < 16; i++){
        const phi = Math.PI/2 + .95 + i*((TAU - 1.9)/15);
        const start = sph(phi, 1.25).multiplyScalar(R*1.02);
        const out = new THREE.Vector3(start.x, 0, start.z).normalize();
        const len = .26 + (i % 3)*.05;
        const curve = new THREE.CatmullRomCurve3([start, start.clone().addScaledVector(out, .05).add(new THREE.Vector3(0, -.1, 0)), start.clone().addScaledVector(out, .07).add(new THREE.Vector3(0, -len, 0))]);
        mk(new THREE.TubeGeometry(curve, 12, .024, 8, false), i % 2 ? M : MD);
      }
      break;
    case 'mohicano':
      { const m = new THREE.MeshStandardMaterial({ color: new THREE.Color(M.color).multiplyScalar(.45), roughness:.95 }); capa(1.01, 1.28, m); nuca(1.01, 2.0, .72, m); }
      for (let i = 0; i < 9; i++){
        const ang = lerp(-.9, 1.5, i/8);
        const n = new THREE.Vector3(0, Math.cos(ang), -Math.sin(ang));
        const h = .2 - Math.abs(i - 3)*.018;
        const m = mk(new THREE.SphereGeometry(1, 14, 10), M, [0,0,0], [.045, h, .075]);
        m.position.copy(n.clone().multiplyScalar(R*1.0 + h*.55)); m.quaternion.setFromUnitVectors(Y, n); m.rotateX(-.25);
      }
      break;
    case 'coleta':
      capa(1.05, 1.16); nuca(1.045, 1.95, .75); flequillo(5, .07, 1.1, .5, .07);
      { const a = new THREE.Vector3(0, .02, -R*1.02), curve = new THREE.CatmullRomCurve3([a, new THREE.Vector3(0, -.06, -.33), new THREE.Vector3(0, -.24, -.36), new THREE.Vector3(0, -.36, -.3)]);
        mk(new THREE.TubeGeometry(curve, 20, .05, 12, false), M); mk(new THREE.SphereGeometry(.05, 12, 10), M, [0, -.36, -.3]);
        mk(new THREE.TorusGeometry(.05, .016, 8, 20), MD, [0, -.01, -.29]); }
      break;
    case 'colaAlta':
      capa(1.05, 1.16); nuca(1.045, 1.95, .75); flequillo(5, .06, 1.1, .5, .07);
      mk(new THREE.SphereGeometry(.11, 24, 16), M, [0, R + .07, -.05]); mk(new THREE.TorusGeometry(.07, .018, 8, 24), MD, [0, R + .0, -.04]).rotation.x = Math.PI/2 - .2;
      break;
    case 'melena':
      capa(1.05, 1.2); nuca(1.05, 2.35, .78);
      mk(new THREE.SphereGeometry(1, 24, 18), M, [0, -.22, -.14], [.25, .3, .1]);
      for (const s of [-1, 1]){ const nn = sph(Math.PI/2 + s*.9, 1.55); const m = mk(new THREE.SphereGeometry(1, 16, 12), M, [0,0,0], [.06, .26, .055]);
        m.position.copy(nn.multiplyScalar(R*1.02)).add(new THREE.Vector3(0, -.1, 0)); m.rotation.z = -s*.08; }
      flequillo(5, .1, 1.08, .55, .08); break;
    case 'bob':
      capa(1.055, 1.2); nuca(1.06, 2.15, .72);
      for (const s of [-1, 1]){ const nn = sph(Math.PI/2 + s*.86, 1.62); const m = mk(new THREE.SphereGeometry(1, 16, 12), M, [0,0,0], [.065, .15, .06]);
        m.position.copy(nn.multiplyScalar(R*1.0)); m.quaternion.setFromUnitVectors(Z, sph(Math.PI/2 + s*.86, 1.62)); }
      flequillo(6, .1, 1.1, .6, .08); break;
    case 'rulos':
      capa(1.03, 1.2); nuca(1.03, 1.95, .75);
      for (let i = 0; i < 46; i++){
        const phi = (i * 2.4) % TAU, th = .15 + ((i * 7) % 12) * .1;
        const back = Math.sin(phi) < .3;
        if (!back && th > 1.2) continue;
        if (back && th > 1.9) continue;
        const nn = sph(phi, th); mk(new THREE.SphereGeometry(.05 + (i % 3)*.008, 10, 8), i % 4 ? M : MD, [nn.x*R*1.07, nn.y*R*1.07, nn.z*R*1.07]);
      }
      break;
  }
}

// ------------------------------------------------------------
// CONSTRUCCIÓN
// ------------------------------------------------------------
export function crearPersonaje(cfg, clases){
  const P = { cfg, root: new THREE.Group(), t: 0, blinkT: 2, blinking: false, faceKey: '', expr: 'normal', pose: {} };
  const C = CUERPO[cfg.cuerpo] || CUERPO.medio, hs = ALTURA[cfg.estatura] || 1;
  const bw = C.bw, lt = C.lt;
  const clase = (clases || []).find(c => c.id === cfg.clase);
  const mats = [];
  const M = (color, o = {}) => { const m = new THREE.MeshStandardMaterial({ color, roughness:.6, metalness:0, ...o }); mats.push(m); return m; };
  const mk = (geo, mat, parent, p = [0,0,0], s = null, r = null) => { const m = new THREE.Mesh(geo, mat); m.position.set(...p); if (s) m.scale.set(...s); if (r) m.rotation.set(...r); m.castShadow = true; m.receiveShadow = true; parent.add(m); return m; };

  const skin = M(cfg.piel, { roughness:.5 });
  const tee = M('#59606b', { roughness:.85 }), teeDark = M('#454b54', { roughness:.85 });
  const pants = M('#1f2329', { roughness:.9 }), pantsHem = M('#16191e', { roughness:.9 });
  const shoeUp = M('#d9dbe0', { roughness:.55 }), shoeSole = M('#f4f4f6', { roughness:.6 }), shoeAcc = M('#59606b', { roughness:.6 });
  const hairM = M(cfg.colorPelo, { roughness:.5 }), hairD = M(shade(cfg.colorPelo, .75), { roughness:.55 });

  const body = new THREE.Group(); P.root.add(body); P.body = body;
  const legLen = .78 * hs, footH = .09;
  const pelvis = new THREE.Group(); pelvis.position.y = footH + legLen; body.add(pelvis); P.pelvis = pelvis; P.pelvisY = pelvis.position.y;

  // ----- piernas -----
  P.legs = {};
  for (const [side, sx] of [['L', 1], ['R', -1]]){
    const hip = new THREE.Group(); hip.position.set(sx*.105*bw, 0, 0); pelvis.add(hip);
    const thighL = .4*hs, shinL = .38*hs;
    mk(new THREE.CapsuleGeometry(.095*lt, thighL - .02, 6, 14), skin, hip, [0, -thighL/2, 0]);
    // bermuda
    mk(new THREE.CylinderGeometry(.115*lt, .122*lt, thighL*.86, 18), pants, hip, [0, -thighL*.43 + .01, 0]);
    mk(new THREE.TorusGeometry(.12*lt, .014, 8, 22), pantsHem, hip, [0, -thighL*.86 + .01, 0], null, [Math.PI/2, 0, 0]);
    const knee = new THREE.Group(); knee.position.y = -thighL; hip.add(knee);
    mk(new THREE.SphereGeometry(.088*lt, 14, 12), skin, knee);
    mk(new THREE.CapsuleGeometry(.08*lt, shinL - .02, 6, 14), skin, knee, [0, -shinL/2, 0]);
    // tatuaje de pantorrilla
    const tz = sx > 0 ? 'piernaIzq' : 'piernaDer';
    if (cfg.tatuajes[tz]){ const tt = canvasTex(128, 128); dibujarTatuaje(tt.ctx, cfg.tatuajes[tz], 64, 64, .95);
      const tm = new THREE.MeshStandardMaterial({ map: tt.t, transparent:true, depthWrite:false, roughness:.6, polygonOffset:true, polygonOffsetFactor:-2 });
      mk(new THREE.CylinderGeometry(.083*lt, .078*lt, .17, 16, 1, true, -1.1, 2.2), tm, knee, [0, -shinL*.4, 0]).castShadow = false; }
    const ankle = new THREE.Group(); ankle.position.y = -shinL; knee.add(ankle);
    // medias + tenis básicos
    mk(new THREE.CylinderGeometry(.078*lt, .078*lt, .07, 14), M('#e9eaee'), ankle, [0, .01, 0]);
    mk(new THREE.SphereGeometry(.1, 20, 14), shoeUp, ankle, [0, -.035, .045], [1, .72, 1.55]);
    mk(new THREE.CylinderGeometry(.105, .105, .04, 22), shoeSole, ankle, [0, -.07, .045], [1, 1, 1.55]);
    mk(new THREE.SphereGeometry(.058, 14, 10), shoeSole, ankle, [0, -.052, .155], [1.05, .62, .9]);
    for (const s of [-1, 1]) mk(new THREE.BoxGeometry(.01, .03, .1), shoeAcc, ankle, [s*.087, -.04, .03]);
    P.legs[side] = { hip, knee, ankle };
  }
  P.footOffset = footH;

  // ----- torso -----
  const spine = new THREE.Group(); spine.position.y = .02; pelvis.add(spine); P.spine = spine;
  const torsoGeo = new THREE.LatheGeometry(TORSO.map(([r, y]) => new THREE.Vector2(r, y)), 40);
  const torso = mk(torsoGeo, tee, spine, [0,0,0], [bw, hs, bw*.8]);
  mk(new THREE.TorusGeometry(.215, .016, 8, 36), teeDark, spine, [0, -.03*hs, 0], [bw, bw*.8, 1], [Math.PI/2, 0, 0]);
  // estampado de tributo (pecho y espalda)
  const pr = canvasTex(256, 256);
  { const x = pr.ctx; x.fillStyle = '#e8e8ec'; x.font = '900 92px "Chakra Petch", sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle';
    x.fillText(String(cfg.tributo).padStart(2, '0'), 128, 128);
    x.font = '700 20px "Chakra Petch", sans-serif'; x.fillText('TRIBUTO', 128, 58);
    x.strokeStyle = '#ff2d55'; x.lineWidth = 5; x.beginPath(); x.moveTo(78, 196); x.quadraticCurveTo(128, 170, 178, 196); x.quadraticCurveTo(128, 222, 78, 196); x.stroke();
    x.fillStyle = '#ff2d55'; x.beginPath(); x.arc(128, 196, 8, 0, TAU); x.fill(); }
  const prM = new THREE.MeshStandardMaterial({ map: pr.t, transparent:true, depthWrite:false, roughness:.8, polygonOffset:true, polygonOffsetFactor:-2 });
  mk(new THREE.CylinderGeometry(rAt(TORSO,.46)+.004, rAt(TORSO,.2)+.004, .26, 24, 1, true, -.62, 1.24), prM, torso, [0, .33, 0]).castShadow = false;
  mk(new THREE.CylinderGeometry(rAt(TORSO,.46)+.004, rAt(TORSO,.2)+.004, .26, 24, 1, true, Math.PI - .62, 1.24), prM, torso, [0, .33, 0]).castShadow = false;

  // cuello
  const neckY = .6*hs;
  mk(new THREE.CylinderGeometry(.075, .085, .12, 16), skin, spine, [0, neckY, 0]);
  if (cfg.tatuajes.cuello){ const tt = canvasTex(128, 128); dibujarTatuaje(tt.ctx, cfg.tatuajes.cuello, 64, 64, .8);
    const tm = new THREE.MeshStandardMaterial({ map: tt.t, transparent:true, depthWrite:false, roughness:.6, polygonOffset:true, polygonOffsetFactor:-2 });
    mk(new THREE.CylinderGeometry(.071, .077, .1, 16, 1, true, -1.3, 2.6), tm, spine, [0, neckY, 0]).castShadow = false; }

  // ----- brazos -----
  P.arms = {};
  for (const [side, sx] of [['L', 1], ['R', -1]]){
    const sh = new THREE.Group(); sh.position.set(sx*(.225*bw + .035), .5*hs, 0); spine.add(sh);
    const upL = .27*hs, foL = .25*hs;
    mk(new THREE.SphereGeometry(.092*lt, 16, 12), tee, sh);
    mk(new THREE.CylinderGeometry(.093*lt, .1*lt, .14, 16), tee, sh, [0, -.065, 0]);
    mk(new THREE.TorusGeometry(.098*lt, .013, 8, 20), teeDark, sh, [0, -.135, 0], null, [Math.PI/2, 0, 0]);
    mk(new THREE.CapsuleGeometry(.07*lt, upL - .02, 6, 12), skin, sh, [0, -upL/2, 0]);
    if (sx > 0 && clase){ // brazalete de clase (brazo izquierdo)
      mk(new THREE.TorusGeometry(.076*lt, .018, 8, 22), M(clase.color, { emissive: clase.color, emissiveIntensity:.35, roughness:.4 }), sh, [0, -upL*.62, 0], null, [Math.PI/2, 0, 0]);
    }
    const elbow = new THREE.Group(); elbow.position.y = -upL; sh.add(elbow);
    mk(new THREE.SphereGeometry(.068*lt, 14, 12), skin, elbow);
    mk(new THREE.CapsuleGeometry(.063*lt, foL - .02, 6, 12), skin, elbow, [0, -foL/2, 0]);
    const tz = sx > 0 ? 'brazoIzq' : 'brazoDer';
    if (cfg.tatuajes[tz]){ const tt = canvasTex(128, 128); dibujarTatuaje(tt.ctx, cfg.tatuajes[tz], 64, 64, .95);
      const tm = new THREE.MeshStandardMaterial({ map: tt.t, transparent:true, depthWrite:false, roughness:.6, polygonOffset:true, polygonOffsetFactor:-2 });
      mk(new THREE.CylinderGeometry(.0655*lt, .063*lt, .14, 16, 1, true, -1.2, 2.4), tm, elbow, [0, -foL*.45, 0]).castShadow = false; }
    const hand = new THREE.Group(); hand.position.y = -foL - .02; elbow.add(hand);
    mk(new THREE.SphereGeometry(.078, 16, 12), skin, hand, [0, -.025, 0], [1, 1.1, .85]);
    mk(new THREE.SphereGeometry(.03, 10, 8), skin, hand, [-sx*.055, -.005, .03]);
    P.arms[side] = { sh, elbow, hand, sx };
  }

  // ----- cabeza -----
  const R = .27;
  const head = new THREE.Group(); head.position.y = neckY + .05; spine.add(head); P.head = head;
  const skull = new THREE.Group(); skull.position.y = R*.88; head.add(skull); P.skull = skull;
  mk(new THREE.SphereGeometry(R, 48, 36), skin, skull);
  // mandíbula suave
  mk(new THREE.SphereGeometry(R*.82, 32, 20), skin, skull, [0, -R*.28, .02], [1, .8, .95]);
  // orejas
  for (const s of [-1, 1]){ mk(new THREE.SphereGeometry(.06, 16, 12), skin, skull, [s*R*.98, -.01, -.01], [.42, 1, .75]); }
  // cara
  P.face = canvasTex(512, 512);
  const faceM = new THREE.MeshStandardMaterial({ map: P.face.t, transparent:true, depthWrite:false, roughness:.4, polygonOffset:true, polygonOffsetFactor:-2 });
  mk(new THREE.SphereGeometry(R*1.004, 48, 24, FACE_PHI0, FACE_PHI_LEN, FACE_TH0, FACE_TH_LEN), faceM, skull).castShadow = false;
  // pelo
  const hairG = new THREE.Group(); skull.add(hairG);
  construirPelo(hairG, cfg.pelo, R, hairM, hairD);
  // barba
  const beardM = M(cfg.colorBarba, { roughness:.75 });
  if (cfg.barba === 'completa' || cfg.barba === 'candado'){
    const bt = canvasTex(512, 512); dibujarBarba(bt.ctx, cfg.barba, cfg.colorBarba);
    const bm = new THREE.MeshStandardMaterial({ map: bt.t, alphaTest:.5, roughness:.8 });
    mk(new THREE.SphereGeometry(R*1.03, 48, 24, FACE_PHI0 - .15, FACE_PHI_LEN + .3, FACE_TH0, FACE_TH_LEN), bm, skull);
    if (cfg.barba === 'completa') mk(new THREE.SphereGeometry(R*1.02, 32, 16, Math.PI/2 - 1.15, 2.3, FACE_TH0 + FACE_TH_LEN - .08, .6), beardM, skull);
  }
  if (['completa','candado','bigote'].includes(cfg.barba)){
    const th = FACE_TH0 + (362/512)*FACE_TH_LEN;
    for (const s of [-1, 1]){ const n = sph(Math.PI/2 + s*.13, th); const m = mk(new THREE.SphereGeometry(1, 16, 10), beardM, skull, [0,0,0], [.05, .02, .026]);
      m.position.copy(n.multiplyScalar(R*1.03)); m.rotation.set(0, 0, s*.25); }
  }
  if (cfg.barba === 'chivera' || cfg.barba === 'candado'){
    const n = sph(Math.PI/2, FACE_TH0 + (478/512)*FACE_TH_LEN);
    const m = mk(new THREE.SphereGeometry(1, 16, 12), beardM, skull, [0,0,0], [.04, .055, .035]); m.position.copy(n.multiplyScalar(R*1.02)).add(new THREE.Vector3(0, -.02, 0));
  }

  P.mats = mats;
  P.R = R;

  // ------------------------------------------------------------
  // ANIMACIÓN
  // ------------------------------------------------------------
  const base = () => ({ py:0, lean:0, twist:0, hL:0, hR:0, kL:.05, kR:.05, sLx:0, sLz:.12, sRx:0, sRz:-.12, eL:-.18, eR:-.18, hx:0, hy:0, hz:0, spin:0 });
  P.pose = base();
  P.objetivo = (t, anim) => {
    const Q = base();
    if (anim === 'idle'){
      const b = Math.sin(t*2);
      Q.py = b*.006; Q.sLz = .12 + b*.02; Q.sRz = -.12 - b*.02; Q.hz = Math.sin(t*.7)*.05; Q.hy = Math.sin(t*.45)*.12; Q.hx = Math.sin(t*1.1)*.02;
      Q.sLx = Math.sin(t*1.1)*.04; Q.sRx = -Math.sin(t*1.1)*.04;
    }
    if (anim === 'walk' || anim === 'run'){
      const run = anim === 'run';
      const p = t * TAU * (run ? 1.55 : 1.05);
      const A = run ? .85 : .45;
      Q.hL = Math.sin(p)*A; Q.hR = Math.sin(p + Math.PI)*A;
      Q.kL = .08 + Math.max(0, -Math.cos(p))*(run ? 1.45 : .85);
      Q.kR = .08 + Math.max(0, -Math.cos(p + Math.PI))*(run ? 1.45 : .85);
      Q.py = Math.abs(Math.cos(p))*(run ? .06 : .035) - (run ? .04 : .01);
      Q.sLx = -Math.sin(p)*(run ? .9 : .5); Q.sRx = Math.sin(p)*(run ? .9 : .5);
      Q.eL = run ? -1.3 : -.35; Q.eR = run ? -1.3 : -.35;
      Q.sLz = .1; Q.sRz = -.1;
      Q.lean = run ? .2 : .04; Q.twist = Math.sin(p)*(run ? .12 : .06);
      Q.hz = Math.sin(p)*.05; Q.hx = run ? -.15 : 0;
    }
    if (anim === 'pose'){
      const c = t % 1.6, j = c < .8 ? Math.sin(c/.8*Math.PI) : 0;
      Q.py = j*.35; Q.sLz = 2.6 + Math.sin(t*12)*.12; Q.sRz = -2.6 - Math.sin(t*12)*.12; Q.eL = -.3; Q.eR = -.3;
      Q.kL = j*1.1; Q.kR = j*1.1; Q.hL = -j*.5; Q.hR = -j*.5; Q.hx = -.15;
    }
    if (anim === 'tired'){   // sin stamina: manos en las rodillas, jadeando
      const b = Math.sin(t*9);
      Q.lean = .55 + b*.03; Q.hL = -.35; Q.hR = -.35; Q.kL = .5; Q.kR = .5; Q.py = -.08;
      Q.sLx = -.9; Q.sRx = -.9; Q.eL = -.2; Q.eR = -.2; Q.hx = -.35 + b*.05;
    }
    if (anim === 'downed'){  // derribado: se arrastra
      const p = t*3.2;
      Q.py = -.62; Q.lean = 1.25; Q.hL = .15; Q.hR = .15; Q.kL = .35 + Math.max(0, Math.sin(p))*.5; Q.kR = .35 + Math.max(0, -Math.sin(p))*.5;
      Q.sLx = -2.4 + Math.sin(p)*.5; Q.sRx = -2.4 - Math.sin(p)*.5; Q.eL = -.4; Q.eR = -.4; Q.sLz = .25; Q.sRz = -.25; Q.hx = -1.0;
    }
    if (anim === 'dead'){ Q.sLz = 1.3; Q.sRz = -1.3; Q.eL = -.2; Q.eR = -.2; Q.kL = .2; Q.kR = .1; Q.hL = -.1; }
    return Q;
  };
  P.update = (dt, anim = 'idle', expr = 'normal', mods = null) => {
    P.t += dt;
    const Q = P.objetivo(P.t, anim), k = 1 - Math.exp(-14*dt), pp = P.pose;
    if (mods){
      if (mods.crouch && anim !== 'downed'){ Q.hL -= .75; Q.hR -= .75; Q.kL += 1.25; Q.kR += 1.25; Q.py -= .3; Q.lean += .22; }
      if (mods.air){ Q.kL = .95; Q.kR = .55; Q.hL = -.55; Q.hR = -.15; }
      if (mods.aim){ Q.sRx = -1.5 - (mods.pitch || 0); Q.sRz = -.04; Q.eR = -.05; Q.sLx = -1.38 - (mods.pitch || 0); Q.sLz = .5; Q.eL = -.55; Q.twist = 0; Q.hx = (mods.pitch || 0)*.5; }
      if (mods.heal){ Q.sLx = -1.1; Q.eL = -1.6; Q.sRx = -.7; Q.sRz = .3; Q.eR = -1.2; Q.hx = .35; }
      if (mods.eat){ Q.sRx = -1.0; Q.eR = -2.1; Q.sRz = .2; }
      if (mods.hungry && !mods.aim){ Q.lean += .18; Q.hx += .15; }
      if (mods.limp && (anim === 'walk' || anim === 'run')){ Q.kR *= .3; Q.py -= .02; Q.sLx = -.35; Q.eL = -1.4; }
      if (mods.hit){ Q.lean -= .12*mods.hit; Q.hx -= .2*mods.hit; }
    }
    for (const key in Q) pp[key] = lerp(pp[key], Q[key], key === 'py' ? Math.min(1, k*1.6) : k);
    P.pelvis.position.y = P.pelvisY + pp.py;
    P.spine.rotation.set(pp.lean, pp.twist, 0);
    P.legs.L.hip.rotation.x = pp.hL; P.legs.R.hip.rotation.x = pp.hR;
    P.legs.L.knee.rotation.x = pp.kL; P.legs.R.knee.rotation.x = pp.kR;
    P.legs.L.ankle.rotation.x = -(pp.hL + pp.kL)*.5; P.legs.R.ankle.rotation.x = -(pp.hR + pp.kR)*.5;
    P.arms.L.sh.rotation.set(pp.sLx, 0, pp.sLz); P.arms.R.sh.rotation.set(pp.sRx, 0, pp.sRz);
    P.arms.L.elbow.rotation.x = pp.eL; P.arms.R.elbow.rotation.x = pp.eR;
    P.head.rotation.set(pp.hx, pp.hy, pp.hz);
    // parpadeo y cara
    P.blinkT -= dt;
    if (P.blinkT <= 0){ if (!P.blinking){ P.blinking = true; P.blinkT = .12; } else { P.blinking = false; P.blinkT = 2 + Math.random()*3.5; } }
    const e = anim === 'pose' ? 'feliz' : anim === 'dead' ? 'dolor' : expr;
    const key = e + (P.blinking && anim !== 'dead' ? 1 : 0);
    if (key !== P.faceKey){ P.faceKey = key; dibujarCara(P.face.ctx, P.cfg, e, P.blinking && anim !== 'dead'); P.face.t.needsUpdate = true; }
  };
  // partes desmembrables: devuelve el grupo para que el juego lo suelte en el mundo
  P.partes = () => ({ cabeza: P.head, brazoL: P.arms.L.sh, brazoR: P.arms.R.sh, piernaL: P.legs.L.hip, piernaR: P.legs.R.hip });
  P.sombras = on => P.root.traverse(o => { if (o.isMesh && !o.material.transparent) o.castShadow = on; });
  P.dispose = () => { P.root.traverse(o => { if (o.geometry) o.geometry.dispose(); if (o.material){ const ms = Array.isArray(o.material) ? o.material : [o.material]; ms.forEach(m => { if (m.map) m.map.dispose(); m.dispose(); }); } }); };
  P.update(0.001);
  return P;
}
