// ============================================================
// SPOTTED · Partida (Fase 1: tú + 23 bots, equipos de 3)
// Parámetros de URL: ?min=15 (duración), ?dif=1 (dificultad de bots)
// ============================================================
import * as THREE from 'three';
import { crearRenderer } from '../escena.js';
import * as D from '../datos.js';
import { construirMapa, sectorDe, MAP_R, PLAZA_R, SECTORES } from './mapa.js';
import { crearFX } from './fx.js';
import { ARMAS, OBJETOS, RAREZAS, modeloArma } from './armas.js';
import { crearEntidad, armaActual, equiparModelo, disparar, recargar, tickArmas, recoger, usarCuracion, usarComida, usarPlaca, morir, danar } from './entidades.js';
import { pensarBot } from './bots.js';
import { crearArena, tiempos } from './peligros.js';
import { crearHUD, dibujarDoberman } from './hud.js';
import { iniciarAudio, sonar } from './audio.js';

const $ = s => document.getElementById(s);
const q = new URLSearchParams(location.search);
const store = { get(k, d){ try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch(e){ return d; } }, set(k, v){ try { localStorage.setItem(k, JSON.stringify(v)); } catch(e){} } };

// ---------------- estado global ----------------
const G = window.G = {
  t: 0, fase: 'intro', entidades: [], botin: [], dificultad: +(q.get('dif') || 1),
  T: tiempos(Math.max(1, +(q.get('min') || 15))),
};

// ---------------- render ----------------
const canvas = $('c');
const renderer = crearRenderer(canvas);
renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
const scene = G.scene = new THREE.Scene();
scene.background = new THREE.Color('#0b0714');
scene.fog = new THREE.Fog('#0b0714', 30, 120);
const hemi = new THREE.HemisphereLight('#bfb4ff', '#1a1030', 1.15); scene.add(hemi);
const sol = new THREE.DirectionalLight('#fff0e0', 1.7); sol.castShadow = true; sol.shadow.mapSize.set(1024, 1024);
Object.assign(sol.shadow.camera, { left:-22, right:22, top:22, bottom:-22, near:1, far:120 }); sol.shadow.bias = -.0008;
scene.add(sol, sol.target);
const rim = new THREE.DirectionalLight('#ff4f7a', .7); rim.position.set(-30, 20, 40); scene.add(rim);
const camera = new THREE.PerspectiveCamera(62, 1, .1, 400);
function resize(){ renderer.setSize(innerWidth, innerHeight, false); camera.aspect = innerWidth/innerHeight; camera.updateProjectionMatrix(); }
addEventListener('resize', resize); resize();

G.M = construirMapa(scene);
G.fx = crearFX(scene);
G.hud = crearHUD(G);

// ---------------- botín ----------------
const _geoItem = new THREE.BoxGeometry(.28, .2, .28);
const anillos = {};
function anillo(col){ return anillos[col] || (anillos[col] = new THREE.MeshBasicMaterial({ color: col, transparent:true, opacity:.6, depthWrite:false })); }
const _anilloGeo = new THREE.RingGeometry(.35, .45, 24);
G.soltarBotin = (pos, o, exacto = false) => {
  const p = exacto ? pos.clone() : pos.clone().add(new THREE.Vector3((Math.random() - .5)*1.6, 0, (Math.random() - .5)*1.6));
  p.y = G.M.alturaSuelo(p.x, p.z, pos.y + .5) + .05;
  const g = new THREE.Group(); g.position.copy(p);
  let col = '#ffffff';
  if (o.tipo === 'arma'){ const m = modeloArma(o.arma, o.rareza); m.rotation.set(Math.PI/2, 0, Math.random()*6); m.position.y = .12; g.add(m); col = RAREZAS[o.rareza].color; }
  else { const def = OBJETOS[o.tipo]; col = o.tipo === 'chaleco' ? RAREZAS[o.rareza || 'comun'].color : def.color;
    const m = new THREE.Mesh(_geoItem, new THREE.MeshStandardMaterial({ color: col, emissive: col, emissiveIntensity:.35, roughness:.5 })); m.position.y = .2; g.add(m); g.userData.gira = m; }
  const a = new THREE.Mesh(_anilloGeo, anillo(col)); a.rotation.x = -Math.PI/2; a.position.y = .03; g.add(a);
  scene.add(g);
  const item = { ...o, pos: p, g, tomado: false };
  G.botin.push(item); return item;
};
function sembrarBotin(){
  const pick = (arr) => arr[Math.floor(Math.random()*arr.length)];
  const armaAl = (r = null) => ({ tipo:'arma', arma: pick(['tuberia','licuadora','porton','antena','clavadora','tuberia','licuadora','clavadora']), rareza: r || (Math.random() < .7 ? 'comun' : 'rara') });
  for (const b of G.M.botin){
    const p = new THREE.Vector3(b.x, 0, b.z);
    const r = Math.random();
    let o;
    if (b.zona === 'HOSPITAL') o = { tipo: r < .5 ? 'inyGrande' : 'inyPeq' };
    else if (b.zona === 'FARMACIA') o = { tipo: r < .75 ? 'inyPeq' : 'inyGrande' };
    else if (b.zona === 'ARMERÍA') o = r < .75 ? armaAl(Math.random() < .4 ? 'epica' : 'rara') : { tipo:'chaleco', rareza:'rara' };
    else if (b.zona === 'MERCADO') o = { tipo: pick(['arepa','arepa','tequenos','malta']) };
    else o = r < .34 ? armaAl() : r < .56 ? { tipo:'chatarra', n: 30 } : r < .68 ? { tipo: pick(['arepa','tequenos','malta']) } : r < .78 ? { tipo:'inyPeq' } : r < .88 ? { tipo:'chaleco', rareza: Math.random() < .75 ? 'comun' : 'rara' } : { tipo:'placa' };
    G.soltarBotin(p, o, true);
    if (o.tipo === 'arma' && Math.random() < .7) G.soltarBotin(p, { tipo:'chatarra', n: 30 });
  }
  // la Cornucopia tiene de lo mejor
  for (let i = 0; i < 12; i++){
    const a = i/12*Math.PI*2, p = new THREE.Vector3(Math.cos(a)*6, 0, Math.sin(a)*6);
    G.soltarBotin(p, i % 3 === 0 ? armaAl(Math.random() < .5 ? 'epica' : 'rara') : i % 3 === 1 ? { tipo:'inyGrande' } : { tipo:'chatarra', n: 40 }, true);
  }
}

// ---------------- personajes ----------------
const NOMBRES = ['CHAMO_77','LA_ROCHA','MAMI_TECH','PANA_NEON','EL_GOCHO','KIKE_SK8','BARBIE_PLOMO','EL_CATIRE','NEGRA_FLOW','TUKI_ZULIA','GATO_GLITCH','MARACUCHO','LA_JEFA','YEYO_PX','CHOCOLATE','EL_BRUJO','FLAKITA','TIGRE_Z','PELUO','KAWAII_KILL','DON_BOLAS','LA_PERLA','NENA_BYTE','VIEJO_LOBO'];
function crearParticipantes(){
  const slots = store.get('spotted_personajes', [null, null, null]), slot = store.get('spotted_slot', 0);
  const miCfg = slots[slot] || slots.find(Boolean) || D.personajeAleatorio(1);
  const nombres = NOMBRES.slice().sort(() => Math.random() - .5);
  let id = 0;
  for (let eq = 0; eq < 8; eq++) for (let k = 0; k < 3; k++){
    const esJ = eq === 0 && k === 0;
    const cfg = esJ ? miCfg : D.personajeAleatorio(id + 1);
    cfg.tributo = id + 1;
    const e = crearEntidad(G, cfg, { nombre: esJ ? (miCfg.nombre || 'TÚ') : nombres[id % nombres.length], equipo: eq, bot: !esJ, id: id++ });
    e.moveDir = new THREE.Vector2(); e.camYaw = 0;
    G.entidades.push(e);
    if (esJ) G.jugador = e;
  }
}

// ---------------- entrada (táctil + teclado/ratón) ----------------
const IN = { mov: new THREE.Vector2(), correr: false, disparo: false, apuntar: false, saltar: false, agachar: false, accion: false, yaw: 0, pitch: -.12 };
const SENS = .0055;
window.IN = IN;
(function controles(){
  // joystick
  const zona = $('stickZona'), base = $('stickBase'), bola = $('stickBola'); let sid = null, c0 = null;
  zona.addEventListener('pointerdown', e => { sid = e.pointerId; zona.setPointerCapture(sid); const r = base.getBoundingClientRect(); c0 = { x: r.left + r.width/2, y: r.top + r.height/2 }; mover(e); iniciarAudio(); });
  const mover = e => { if (e.pointerId !== sid) return; let dx = e.clientX - c0.x, dy = e.clientY - c0.y; const L = Math.hypot(dx, dy), M = 55; if (L > M){ dx *= M/L; dy *= M/L; } bola.style.transform = `translate(${dx}px,${dy}px)`; IN.mov.set(dx/M, -dy/M); IN.correr = L > M*.92; };
  zona.addEventListener('pointermove', mover);
  const soltar = e => { if (e.pointerId !== sid) return; sid = null; IN.mov.set(0, 0); IN.correr = false; bola.style.transform = ''; };
  zona.addEventListener('pointerup', soltar); zona.addEventListener('pointercancel', soltar);
  // mirar: arrastrar en cualquier parte libre de la pantalla (y también sobre el botón de disparo)
  const miradas = new Map();
  const empezarMirar = e => { miradas.set(e.pointerId, { x: e.clientX, y: e.clientY }); };
  const mirar = e => { const m = miradas.get(e.pointerId); if (!m) return; const k = IN.apuntar ? .45 / (armaActual(G.jugador)?.def.zoom || 1) : 1; IN.yaw -= (e.clientX - m.x)*SENS*k; IN.pitch = Math.max(-1.1, Math.min(.9, IN.pitch - (e.clientY - m.y)*SENS*k)); m.x = e.clientX; m.y = e.clientY; };
  const acabarMirar = e => miradas.delete(e.pointerId);
  canvas.addEventListener('pointerdown', e => { if (e.pointerType === 'mouse') return; empezarMirar(e); iniciarAudio(); });
  addEventListener('pointermove', mirar); addEventListener('pointerup', acabarMirar); addEventListener('pointercancel', acabarMirar);
  const boton = (id, down, up) => { const b = $(id); b.addEventListener('pointerdown', e => { e.preventDefault(); iniciarAudio(); down(e); if (id === 'bDisparo') empezarMirar(e); }); if (up){ b.addEventListener('pointerup', up); b.addEventListener('pointercancel', up); b.addEventListener('pointerleave', up); } };
  boton('bDisparo', () => IN.disparo = true, () => IN.disparo = false);
  boton('bApuntar', () => { IN.apuntar = !IN.apuntar; $('bApuntar').classList.toggle('on', IN.apuntar); });
  boton('bSaltar', () => IN.saltar = true);
  boton('bAgachar', () => { IN.agachar = !IN.agachar; $('bAgachar').classList.toggle('on', IN.agachar); });
  boton('bRecargar', () => recargar(G.jugador));
  boton('bCurar', () => usarCuracion(G.jugador));
  boton('bComer', () => usarComida(G.jugador));
  boton('bPlaca', () => usarPlaca(G.jugador));
  boton('bAccion', () => IN.accion = true, () => IN.accion = false);
  for (const i of [0, 1]) $('slot' + i).addEventListener('pointerdown', () => { const J = G.jugador; if (J.armas[i] || J.armas[1 - i] == null){ J.actual = i; equiparModelo(J); } });
  // teclado y ratón (PC)
  const K = {};
  addEventListener('keydown', e => { K[e.code] = true; iniciarAudio();
    if (e.code === 'Space') IN.saltar = true; if (e.code === 'KeyC'){ IN.agachar = !IN.agachar; } if (e.code === 'KeyR') recargar(G.jugador);
    if (e.code === 'KeyQ'){ const J = G.jugador; J.actual = 1 - J.actual; equiparModelo(J); } if (e.code === 'KeyH') usarCuracion(G.jugador); if (e.code === 'KeyF') usarComida(G.jugador); if (e.code === 'KeyG') usarPlaca(G.jugador);
    if (e.code === 'KeyE') IN.accion = true; });
  addEventListener('keyup', e => { K[e.code] = false; if (e.code === 'KeyE') IN.accion = false; });
  canvas.addEventListener('mousedown', e => { if (G.fase !== 'juego' && G.fase !== 'final') return; if (document.pointerLockElement !== canvas) canvas.requestPointerLock?.(); if (e.button === 0) IN.disparo = true; if (e.button === 2) IN.apuntar = true; });
  addEventListener('mouseup', e => { if (e.button === 0) IN.disparo = false; if (e.button === 2) IN.apuntar = false; });
  addEventListener('contextmenu', e => e.preventDefault());
  addEventListener('mousemove', e => { if (document.pointerLockElement !== canvas) return; const k = IN.apuntar ? .45/(armaActual(G.jugador)?.def.zoom || 1) : 1; IN.yaw -= e.movementX*.0025*k; IN.pitch = Math.max(-1.1, Math.min(.9, IN.pitch - e.movementY*.0025*k)); });
  let kbd = false;
  G.teclado = () => {
    if (!K.KeyW && !K.KeyA && !K.KeyS && !K.KeyD){ if (kbd){ IN.mov.set(0, 0); IN.correr = false; kbd = false; } return; }
    IN.mov.set((K.KeyD ? 1 : 0) - (K.KeyA ? 1 : 0), (K.KeyW ? 1 : 0) - (K.KeyS ? 1 : 0)); if (IN.mov.lengthSq() > 1) IN.mov.normalize(); IN.correr = !!K.ShiftLeft; kbd = true;
  };
})();

// ---------------- física y animación de cada personaje ----------------
const GRAV = 22, _v = new THREE.Vector3();
function moverEntidad(e, dt){
  if (e.estado === 'muerto'){
    e.P.root.rotation.x += (-Math.PI/2 - e.P.root.rotation.x)*Math.min(1, dt*6);
    e.P.root.position.y += ((e.suelo + .22) - e.P.root.position.y)*Math.min(1, dt*6);
    e.P.update(dt, 'dead', 'dolor'); return;
  }
  if (e.estado === 'cayendo') return;
  // velocidad
  const derr = e.estado === 'derribado';
  let vel = derr ? .9 : e.agachado ? 2.3 : 4.3;
  const quiereCorrer = e.correr && !derr && !e.agachado && !e.cansado && e.moveDir.lengthSq() > .5;
  if (quiereCorrer) vel = 7.2;
  vel *= e.velMod * (e.hambre <= 0 ? .8 : 1) * (e.vida < 30 && !derr ? .88 : 1) * (e.curandoT > 0 ? .5 : 1) * (e.sin_piernaL || e.sin_piernaR ? .5 : 1);
  // stamina
  if (quiereCorrer){ e.stamina -= 14*dt; e.stRec = .8; } else { e.stRec = (e.stRec || 0) - dt; if (e.stRec <= 0) e.stamina = Math.min(100, e.stamina + 22*dt); }
  if (e.stamina <= 0){ e.stamina = 0; e.cansado = true; } if (e.cansado && e.stamina > 35) e.cansado = false;
  // hambre
  e.hambre = Math.max(0, e.hambre - dt*100/(420*G.T.k));
  if (e.hambre <= 0 && e.estado === 'vivo'){ e.hamT = (e.hamT || 0) + dt; if (e.hamT > 2){ e.hamT = 0; danar(G, e, 1, null, 'hambre', 'ambiente'); } }
  // mover
  const px = e.pos.x, pz = e.pos.z;
  e.pos.x += e.moveDir.x*vel*dt; e.pos.z += e.moveDir.y*vel*dt;
  G.M.resolver(e.pos, .36, e.pos.y);
  // salto y gravedad
  const suelo = G.M.alturaSuelo(e.pos.x, e.pos.z, e.pos.y);
  if (e.saltar && !e.aire && !derr && e.stamina > 8){ e.vy = 7.6; e.aire = true; e.stamina -= 10; }
  e.saltar = false;
  // trepar muros bajos: si choca de frente con algo bajo y salta, sube
  e.vy -= GRAV*dt; e.pos.y += e.vy*dt;
  if (e.pos.y <= suelo){
    if (e.aire && e.vy < -15 && e.estado === 'vivo'){ const d = (-e.vy - 15)*4; danar(G, e, d, null, 'caida', 'ambiente'); e.cojeaT = 2; }
    e.pos.y = suelo; e.vy = 0; e.aire = false;
  } else if (e.pos.y > suelo + .05) e.aire = true;
  e.suelo = suelo;
  // quieto (para drones cazadores)
  const mv = Math.hypot(e.pos.x - px, e.pos.z - pz);
  e.quietoT = mv < .01 ? e.quietoT + dt : 0;
  // orientación
  let yawObj = e.yaw;
  if (!e.bot){ if (e.apuntando || e.disparando || IN.disparo) yawObj = e.camYaw; else if (e.moveDir.lengthSq() > .01) yawObj = Math.atan2(e.moveDir.x, e.moveDir.y); else yawObj = e.P.root.rotation.y; e.yaw = yawObj; }
  let d = (yawObj - e.P.root.rotation.y) % (Math.PI*2); if (d > Math.PI) d -= Math.PI*2; if (d < -Math.PI) d += Math.PI*2;
  e.P.root.rotation.y += d*Math.min(1, dt*12);
  e.P.root.position.copy(e.pos);
  // animación
  let anim = 'idle';
  if (derr) anim = 'downed';
  else if (mv > .002) anim = quiereCorrer ? 'run' : 'walk';
  else if (e.cansado) anim = 'tired';
  e.golpeT = Math.max(0, (e.golpeT || 0) - dt*4);
  e.exprT -= dt; if (e.exprT <= 0) e.expr = 'normal';
  if (e.golpeT > .8){ e.expr = 'sorpresa'; e.exprT = .4; }
  if (e.disparando){ e.expr = 'enojado'; e.exprT = .3; }
  if (e.vida < 25 || (G.peligro && G.peligro.activo && G.peligro.tipo === 'niebla' && G.peligro.sector === sectorDe(e.pos.x, e.pos.z))){ if (e.exprT <= 0) e.expr = 'dolor'; }
  const ap = !derr && (e.apuntando || e.disparando) && !!armaActual(e);
  e.P.update(dt, anim, e.expr, { crouch: e.agachado && !derr, air: e.aire, aim: ap, pitch: ap ? e.pitch : 0, heal: e.curandoT > 0, eat: e.comiendoT > 0, hungry: e.hambre < 20, limp: e.vida < 30 || e.cojeaT > 0, hit: e.golpeT });
  e.cojeaT = Math.max(0, (e.cojeaT || 0) - dt);
  // curación / comida en curso
  if (e.curandoT > 0){ e.curandoT -= dt; if (e.curandoT <= 0 && e.curandoItem){ e.vida = Math.min(100, e.vida + OBJETOS[e.curandoItem].cura); e.curandoItem = null; } }
  if (e.comiendoT > 0) e.comiendoT -= dt;
  tickArmas(e, dt);
  // derribado: se desangra
  if (derr){ e.derribadoT -= dt; if (e.derribadoT <= 0) morir(G, e, e.derribador, null, 'torso', null, false); }
  // revivir
  if (e.reviviendo){
    const t = e.reviviendo;
    if (t.estado !== 'derribado' || t.pos.distanceTo(e.pos) > 1.8 || e.estado !== 'vivo' || e.moveDir.lengthSq() > .05){ e.reviviendo = null; e.revivirT = 0; }
    else {
      e.revivirT += dt;
      if (e.revivirT >= 3){
        t.estado = 'vivo'; t.vida = 30; t.derribadoT = 0; e.revivirT = 0; e.reviviendo = null; e.revividos++; e.show += 15;
        G.fx.chispas(t.pos.clone().setY(t.pos.y + .6)); sonar('recoger', .7);
        G.hud.feed(`${e.nombre} revivió a ${t.nombre} con el desfibrilador`, t.equipo === G.jugador.equipo ? 'bien' : '');
      }
    }
  }
  // recoger botín al pasar
  if (e.estado === 'vivo'){
    for (const o of G.botin){
      if (o.tomado || Math.abs(o.pos.x - e.pos.x) > 1.1 || Math.abs(o.pos.z - e.pos.z) > 1.1 || Math.abs(o.pos.y - e.pos.y) > 1.2) continue;
      let forzar = false;
      if (o.tipo === 'arma' && e.bot){ const s = ARMAS[o.arma].slot === 'secundaria' ? 1 : 0, act = e.armas[s]; forzar = !act || Object.keys(RAREZAS).indexOf(o.rareza) > Object.keys(RAREZAS).indexOf(act.rareza); }
      if (recoger(G, e, o, forzar)){ o.tomado = true; scene.remove(o.g); }
    }
  }
}

// ---------------- cámara al hombro ----------------
const camT = new THREE.Vector3();
function camaraJugador(dt){
  const J = G.jugador;
  const a = armaActual(J);
  const ads = IN.apuntar && J.estado === 'vivo';
  const zoom = ads ? (a ? a.def.zoom : 1.1) : 1;
  const fovObj = 62/zoom;
  camera.fov += (fovObj - camera.fov)*Math.min(1, dt*10); camera.updateProjectionMatrix();
  $('mira').classList.toggle('oculto', !(ads && a && a.id === 'antena'));
  const dist = ads ? 1.7 : J.estado === 'derribado' ? 3.6 : 3.3;
  const alto = J.estado === 'derribado' ? .8 : J.agachado ? 1.15 : 1.62;
  const fwd = new THREE.Vector3(Math.sin(IN.yaw)*Math.cos(IN.pitch), Math.sin(IN.pitch), Math.cos(IN.yaw)*Math.cos(IN.pitch));
  const der = new THREE.Vector3(-Math.cos(IN.yaw), 0, Math.sin(IN.yaw));
  const cabeza = new THREE.Vector3(J.pos.x, J.pos.y + alto + .25, J.pos.z);
  const lado = Math.max(0, Math.min(ads ? .6 : .85, G.M.rayo(cabeza, der, 1) - .25));   // no meter la cámara en la pared
  camT.copy(cabeza).addScaledVector(der, lado);
  const atras = fwd.clone().negate();
  const libre = G.M.rayo(camT, atras, dist);
  const pos = camT.clone().addScaledVector(atras, Math.max(.3, Math.min(dist, libre - .25)));
  camera.position.lerp(pos, Math.min(1, dt*20));
  camera.lookAt(camT.clone().addScaledVector(fwd, 10));
  J.camYaw = IN.yaw; J.pitch = IN.pitch;
  // sol y sombras siguen al jugador
  sol.position.set(J.pos.x + 12, J.pos.y + 30, J.pos.z + 8); sol.target.position.copy(J.pos);
}

// disparo del jugador: rayo desde la cámara hasta el centro de la pantalla
function dispararJugador(){
  const J = G.jugador;
  const fwd = new THREE.Vector3(); camera.getWorldDirection(fwd);
  const a = armaActual(J), alc = a ? a.def.alcance : 2;
  const dm = G.M.rayo(camera.position, fwd, alc + 5);
  const punto = camera.position.clone().addScaledVector(fwd, Math.max(2, dm));
  const o = new THREE.Vector3(J.pos.x, J.pos.y + (J.agachado ? 1.05 : 1.5), J.pos.z);
  const dir = punto.sub(o).normalize();
  if (a && !a.def.auto && J._disparoPrevio) return;
  disparar(G, J, o, dir);
}

// ---------------- anfitrión ----------------
const LINEAS_INTRO = [
  '¡Bienvenidos, tributos kawaii! Soy su anfitrión, el creador de este desastre.',
  'Tienen 15 minutos. Solo un equipo sale vivo de esta ciudad.',
  'Yo decido qué sector se pone feo: niebla, drones, perritos robot, lluvia de ácido y apagones. Les aviso 30 segundos antes… si me caen bien.',
  'Desde el minuto 5 voy sellando sectores. Al final, todos a la Cornucopia.',
  'Denme un buen show y les mando regalitos. Denme uno aburrido… y mis drones van por ustedes. ¡A las cápsulas!',
];
const BURLAS_MUERTE = ['¡Uy! Eso dolió hasta aquí.', 'Otro más para el cielo.', 'Qué forma tan fea de irse.', 'Nadie te va a extrañar… bueno, yo un poquito.', '¡Cañonazo! Qué rico sonido.'];
G.anfitrionMuerte = t => { if (Math.random() < .35) G.hud.anfitrion(`${BURLAS_MUERTE[Math.floor(Math.random()*BURLAS_MUERTE.length)]} (${t.nombre})`, 4); };

function intro(){
  dibujarDoberman($('introCara'), true);
  let i = 0, c = 0, txt = '';
  const el = $('introTxt');
  const tick = setInterval(() => {
    if (i >= LINEAS_INTRO.length){ clearInterval(tick); return; }
    const l = LINEAS_INTRO[i];
    txt += l[c++] || ''; el.textContent = txt;
    if (c > l.length){ txt += '\n\n'; i++; c = 0; }
  }, 26);
  $('bSaltarIntro').onclick = () => { clearInterval(tick); iniciarAudio(); $('pIntro').classList.add('oculto'); elegirSalto(); };
}

// ---------------- elegir dónde caer ----------------
let destinoSalto = null;
function elegirSalto(){
  G.fase = 'salto';
  $('pSalto').classList.remove('oculto');
  const cv = $('mapaSalto'), cx = cv.getContext('2d');
  const dibujar = () => { cx.clearRect(0, 0, 512, 512); cx.drawImage(G.M.minimapaBase, 0, 0); if (destinoSalto){ const k = G.M.mmEscala; cx.fillStyle = '#ff2d55'; cx.beginPath(); cx.arc(256 + destinoSalto.x*k, 256 + destinoSalto.z*k, 12, 0, Math.PI*2); cx.fill(); cx.strokeStyle = '#fff'; cx.lineWidth = 3; cx.stroke(); } };
  cv.onpointerdown = e => {
    const r = cv.getBoundingClientRect(), x = (e.clientX - r.left)/r.width*512 - 256, z = (e.clientY - r.top)/r.height*512 - 256;
    const k = G.M.mmEscala, p = new THREE.Vector3(x/k, 0, z/k);
    if (p.length() > MAP_R - 3) p.setLength(MAP_R - 3);
    destinoSalto = p; dibujar();
  };
  dibujar();
  let s = 15; $('saltoT').textContent = s;
  const tm = setInterval(() => { s--; $('saltoT').textContent = s; if (s <= 0){ clearInterval(tm); saltar(); } }, 1000);
  $('bSaltarYa').onclick = () => { clearInterval(tm); saltar(); };
}

// ---------------- caída en cápsula ----------------
function saltar(){
  $('pSalto').classList.add('oculto'); $('hud').classList.remove('oculto'); document.body.classList.add('jugando');
  try { screen.orientation && screen.orientation.lock && screen.orientation.lock('landscape').catch(() => {}); } catch(e){}
  if (!destinoSalto){ const a = Math.random()*Math.PI*2, r = 20 + Math.random()*35; destinoSalto = new THREE.Vector3(Math.cos(a)*r, 0, Math.sin(a)*r); }
  G.fase = 'caida';
  for (const e of G.entidades){
    let p;
    if (e === G.jugador) p = destinoSalto.clone();
    else if (e.equipo === G.jugador.equipo) p = destinoSalto.clone().add(new THREE.Vector3((Math.random() - .5)*10, 0, (Math.random() - .5)*10));
    else { const a = Math.random()*Math.PI*2, r = PLAZA_R + 4 + Math.random()*(MAP_R - PLAZA_R - 8); p = new THREE.Vector3(Math.cos(a)*r, 0, Math.sin(a)*r); }
    G.M.resolver(p, .5, 0);
    p.y = G.M.alturaSuelo(p.x, p.z);
    e.destino = p; e.caidaT = e === G.jugador ? 3.2 : 2.2 + Math.random()*3;
    e.caidaTotal = e.caidaT;
    if (e === G.jugador || e.pos.distanceTo(destinoSalto) < 50){
      e.capsula = G.fx.capsula(); if (e !== G.jugador) e.capsula.children.filter(c => c.isLight).forEach(l => e.capsula.remove(l));
      scene.add(e.capsula);
    }
    e.P.root.visible = false;
  }
  IN.yaw = Math.random()*Math.PI*2;
  G.hud.anfitrion('¡Cápsulas abajo! Que empiece el show.', 3);
}
function tickCaida(dt){
  let pendientes = 0;
  for (const e of G.entidades){
    if (e.estado !== 'cayendo') continue;
    e.caidaT -= dt; pendientes++;
    const f = Math.max(0, e.caidaT/e.caidaTotal);
    const y = e.destino.y + f*f*80;
    if (e.capsula){ e.capsula.position.set(e.destino.x, y + 1.2, e.destino.z); e.capsula.userData.fuego.scale.y = 1 + Math.random()*.4; e.capsula.rotation.y += dt*3; }
    e.pos.set(e.destino.x, y, e.destino.z);
    if (e.caidaT <= 0){
      e.estado = 'vivo'; e.pos.copy(e.destino); e.P.root.visible = true; e.P.root.position.copy(e.pos);
      if (e.capsula){
        G.fx.crater(e.pos); const cap = e.capsula; cap.userData.fuego.visible = false;
        const puerta = cap.userData.puerta; const v = new THREE.Vector3((Math.random() - .5)*4, 6, (Math.random() - .5)*4);
        G.fx.lista.push({ o: cap, t: 2.5, tick(dt2){ puerta.position.addScaledVector(v, dt2); v.y -= 14*dt2; puerta.rotation.x += dt2*8; cap.position.y -= dt2*.8; } });
        if (e === G.jugador || e.pos.distanceTo(G.jugador.pos) < 30) sonar('impacto', e === G.jugador ? 1 : .4);
        e.capsula = null;
      }
      if (e === G.jugador){ e.expr = 'feliz'; e.exprT = 1.5; G.fase = 'juego'; G.t = 0; }
    }
  }
  if (G.jugador.estado === 'cayendo'){
    const J = G.jugador;
    camera.position.lerp(new THREE.Vector3(J.pos.x + 6, J.pos.y + 7, J.pos.z + 9), Math.min(1, dt*4));
    camera.lookAt(J.pos.x, J.pos.y - 3, J.pos.z);
    sol.position.set(J.destino.x + 12, 30, J.destino.z + 8); sol.target.position.copy(J.destino);
  }
}

// ---------------- efectos de ambiente del sector del jugador ----------------
const fogBase = new THREE.Color('#0b0714');
function ambiente(dt){
  const J = G.jugador, s = sectorDe(J.pos.x, J.pos.z);
  const p = G.peligro && G.peligro.activo && G.peligro.sector === s ? G.peligro.tipo : null;
  const sellado = s && G.sellados.has(s);
  let near = 30, far = 120, col = fogBase.clone(), luz = 1.15;
  if (p === 'niebla'){ near = 2; far = 16; col.set('#3b1f5c'); }
  if (p === 'apagon'){ near = 1; far = 14; col.set('#000000'); luz = .15; }
  if (p === 'lluvia'){ near = 8; far = 60; col.set('#10261c'); }
  if (sellado){ col.set('#3a0612'); near = 6; far = 50; }
  scene.fog.near += (near - scene.fog.near)*Math.min(1, dt*2); scene.fog.far += (far - scene.fog.far)*Math.min(1, dt*2);
  scene.fog.color.lerp(col, Math.min(1, dt*2)); scene.background.copy(scene.fog.color);
  hemi.intensity += (luz - hemi.intensity)*Math.min(1, dt*2); sol.intensity = 1.7*hemi.intensity/1.15;
  G.fx.lluvia.visible = p === 'lluvia'; if (p === 'lluvia') G.fx.updateLluvia(dt, J.pos);
}

// ---------------- acción contextual del jugador ----------------
function accionJugador(dt){
  const J = G.jugador;
  if (J.estado !== 'vivo'){ G.hud.accion(null); G.hud.progreso(null); return; }
  let txt = null, hacer = null;
  const caido = G.entidades.find(o => o !== J && o.equipo === J.equipo && o.estado === 'derribado' && o.pos.distanceTo(J.pos) < 1.8);
  if (caido){ txt = `MANTÉN: REVIVIR A ${caido.nombre}`; hacer = () => { J.reviviendo = caido; }; }
  else if (G.airdrop && G.airdrop.enSuelo && !G.airdrop.abierto && G.airdrop.pos.distanceTo(J.pos) < 2.4){ txt = 'ABRIR AIRDROP'; hacer = () => G.abrirAirdrop(J); }
  else {
    const arma = G.botin.find(o => !o.tomado && o.tipo === 'arma' && o.pos.distanceTo(J.pos) < 1.8);
    if (arma){ txt = `CAMBIAR POR ${ARMAS[arma.arma].nombre.toUpperCase()} (${RAREZAS[arma.rareza].nombre})`; hacer = () => { if (recoger(G, J, arma, true)){ arma.tomado = true; scene.remove(arma.g); } IN.accion = false; }; }
  }
  G.hud.accion(txt);
  if (IN.accion && hacer) hacer();
  if (!IN.accion && J.reviviendo){ J.reviviendo = null; J.revivirT = 0; }
  if (J.reviviendo) G.hud.progreso('REVIVIENDO CON EL DESFIBRILADOR', J.revivirT/3);
  else if (J.curandoT > 0) G.hud.progreso('INYECTANDO…', 1 - J.curandoT/OBJETOS[J.curandoItem || 'inyPeq'].t);
  else G.hud.progreso(null);
}

// ---------------- final ----------------
let finMostrado = false, espectando = null, killcamT = 0;
function revisarFin(){
  const vivos = new Set(G.entidades.filter(e => e.estado === 'vivo' || e.estado === 'derribado').map(e => e.equipo));
  const J = G.jugador;
  if (!finMostrado && !vivos.has(J.equipo)){ finMostrado = true; killcamT = 3.5; G.fase = G.fase === 'final' ? 'final' : G.fase; G.posicion = vivos.size + 1; setTimeout(() => pantallaFin(false), 3600); }
  if (vivos.size <= 1 && G.fase !== 'fin'){
    const gan = [...vivos][0];
    G.fase = 'fin'; G.ganador = gan;
    if (gan === J.equipo){ finMostrado = true; setTimeout(() => pantallaFin(true), 2500); }
    else if (espectando){ G.hud.anfitrion(`Ganó el equipo de ${G.entidades.find(e => e.equipo === gan)?.nombre}. You look like success… ellos, no tú.`, 8); }
  }
}
function guardarPerfil(xp, gano){
  const p = store.get('spotted_perfil', { nivel:1, xp:0, victorias:0, eliminaciones:0, partidas:0 });
  p.xp += xp; p.partidas++; p.eliminaciones += G.jugador.kills; if (gano) p.victorias++;
  while (p.xp >= p.nivel*1000){ p.xp -= p.nivel*1000; p.nivel++; }
  store.set('spotted_perfil', p); return p;
}
function pantallaFin(gano){
  const J = G.jugador;
  const xp = Math.round(J.kills*120 + J.dano*.6 + J.revividos*80 + (gano ? 1000 : Math.max(0, 9 - (G.posicion || 8))*80) + Math.min(G.t, G.T.dur)*.5);
  const perfil = guardarPerfil(xp, gano);
  const eq = G.entidades.filter(e => e.equipo === J.equipo);
  const mvp = eq.slice().sort((a, b) => (b.kills*100 + b.dano) - (a.kills*100 + a.dano))[0];
  const fila = (k, v) => `<tr><td>${k}</td><td>${v}</td></tr>`;
  let h = `<div class="fin">`;
  if (gano){
    h += `<canvas id="finCara" width="120" height="120" style="width:84px;height:84px;border-radius:14px"></canvas>
      <h1>¡VICTORIA!</h1><div class="grande">YOU LOOK LIKE SUCCESS</div>
      <p style="color:#cfc8e6">“Sobrevivieron… no me lo esperaba.” — El anfitrión</p>
      <p><b>MVP:</b> ${mvp.nombre} · ${mvp.kills} eliminaciones</p>`;
  } else {
    h += `<h1 style="color:#ff2d55">ELIMINADO</h1><div class="grande" style="color:#fff">PUESTO #${G.posicion || '?'} DE 8</div>
      <p style="color:#cfc8e6">${J.asesino ? `Te eliminó <b>${J.asesino.nombre}</b> con ${armaActual(J.asesino) ? armaActual(J.asesino).def.nombre : 'sus manos'}.` : 'El Sistema te eliminó.'}<br>“${['El Sistema no te vio… hasta que te vio.', 'Casi. Bueno, no tan casi.', 'La próxima agáchate, ¿sí?'][Math.floor(Math.random()*3)]}” — El anfitrión</p>`;
  }
  h += `<table>${fila('Eliminaciones', J.kills)}${fila('Daño hecho', Math.round(J.dano))}${fila('Compañeros revividos', J.revividos)}${fila('Puntos de show', J.show)}${fila('Experiencia ganada', '+' + xp + ' XP')}${fila('Nivel de cuenta', perfil.nivel)}</table>
    <button class="btn" onclick="location.reload()">OTRA PARTIDA</button>
    ${gano ? '' : '<button class="btn gris" id="bEspectar">ESPECTAR</button>'}
    <button class="btn gris" onclick="location.href='index.html'">MI PERSONAJE</button></div>`;
  $('finCaja').innerHTML = h; $('pFin').classList.remove('oculto');
  if (gano) dibujarDoberman($('finCara'), true);
  const be = $('bEspectar'); if (be) be.onclick = () => { $('pFin').classList.add('oculto'); espectando = true; };
}

// ---------------- bucle principal ----------------
const clock = new THREE.Clock();
let camOrbita = 0;
const PASOS = Math.max(1, +(q.get('pasos') || 1)), NORENDER = q.has('norender');   // solo para pruebas: simula más rápido
let fpsN = 0, fpsT = 0; G.fps = 0;
function loop(){
  requestAnimationFrame(loop);
  const dtr = Math.min(clock.getDelta(), .05);
  fpsN++;
  for (let i = 0; i < PASOS; i++) paso(dtr);
  if (!NORENDER || fpsN % 20 === 0) renderer.render(scene, camera);
}
setInterval(() => { G.fps = fpsN; fpsN = 0; }, 1000);
window.__paso = (dt) => paso(dt); window.__cam = camera;
window.__sectorDe = sectorDe; window.__danar = (t, d, a, w, p) => danar(G, t, d, a, w, p);
function paso(dt){
  const J = G.jugador;
  if (G.fase !== 'intro' && G.fase !== 'salto' && G.entidades.some(e => e.estado === 'cayendo')) tickCaida(dt);
  if (G.fase === 'juego' || G.fase === 'final' || G.fase === 'fin'){
    if (G.fase !== 'fin') G.t += dt;
    G.teclado();
    // jugador
    if (J.estado === 'vivo' || J.estado === 'derribado'){
      const f = new THREE.Vector2(Math.sin(IN.yaw), Math.cos(IN.yaw)), r = new THREE.Vector2(-Math.cos(IN.yaw), Math.sin(IN.yaw));
      J.moveDir.set(f.x*IN.mov.y + r.x*IN.mov.x, f.y*IN.mov.y + r.y*IN.mov.x);
      if (J.moveDir.lengthSq() > 1) J.moveDir.normalize();
      J.correr = IN.correr; J.agachado = IN.agachar && J.estado === 'vivo'; J.apuntando = IN.apuntar;
      if (IN.saltar){ J.saltar = true; IN.saltar = false; if (J.agachado){ IN.agachar = false; $('bAgachar').classList.remove('on'); } }
      J.disparando = IN.disparo && J.estado === 'vivo' && J.curandoT <= 0;
      if (J.disparando) dispararJugador();
      J._disparoPrevio = IN.disparo;
    } else J.moveDir.set(0, 0);
    // bots
    for (const e of G.entidades){ if (e.bot) pensarBot(G, e, dt); }
    for (const e of G.entidades) moverEntidad(e, dt);
    G.arena.update(dt);
    revisarFin();
    accionJugador(dt);
    // cámara
    if (J.estado === 'vivo' || J.estado === 'derribado'){ camaraJugador(dt); ambiente(dt); G.hud.derribado(J.estado === 'derribado' ? `DERRIBADO · ARRÁSTRATE HACIA TU EQUIPO · ${Math.ceil(J.derribadoT)} s` : null); }
    else {
      G.hud.derribado(null);
      // killcam: mira a quien te eliminó desde donde caíste
      let foco = J.asesino && J.asesino.estado !== 'muerto' ? J.asesino : G.entidades.find(e => e.estado === 'vivo');
      if (G.fase === 'fin') foco = G.entidades.find(e => e.equipo === G.ganador && e.estado === 'vivo') || foco;
      if (foco){
        camOrbita += dt*.3;
        const p = killcamT > 0 ? J.pos.clone().add(new THREE.Vector3(0, 2, 0)) : foco.pos.clone().add(new THREE.Vector3(Math.sin(camOrbita)*5, 3, Math.cos(camOrbita)*5));
        camera.position.lerp(p, Math.min(1, dt*3)); camera.lookAt(foco.pos.x, foco.pos.y + 1.2, foco.pos.z);
        sol.position.set(foco.pos.x + 12, 30, foco.pos.z + 8); sol.target.position.copy(foco.pos);
      }
      killcamT -= dt;
    }
    // victoria: cámara orbitando a los ganadores en pose
    if (G.fase === 'fin' && G.ganador === J.equipo){
      const gs = G.entidades.filter(e => e.equipo === J.equipo && e.estado !== 'muerto');
      gs.forEach(e => { e.moveDir.set(0, 0); e.P.update(0, 'pose', 'feliz'); });
      const c = gs[0]?.pos || J.pos; camOrbita += dt*.35;
      camera.position.lerp(new THREE.Vector3(c.x + Math.sin(camOrbita)*6, c.y + 2.6, c.z + Math.cos(camOrbita)*6), Math.min(1, dt*2)); camera.lookAt(c.x, c.y + 1.2, c.z);
    }
    // botín girando
    for (const o of G.botin) if (!o.tomado && o.g.userData.gira && Math.abs(o.pos.x - camera.position.x) < 25 && Math.abs(o.pos.z - camera.position.z) < 25) o.g.userData.gira.rotation.y += dt*1.5;
  }
  G.fx.update(dt);
  G.hud.update(dt);
}

// ---------------- arranque ----------------
crearParticipantes();
sembrarBotin();
G.arena = crearArena(G);
camera.position.set(0, 60, 80); camera.lookAt(0, 0, 0);
intro();
loop();
const ld = $('load'); ld.style.opacity = 0; setTimeout(() => ld.remove(), 500);
