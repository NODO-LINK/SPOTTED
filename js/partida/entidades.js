// ============================================================
// SPOTTED · Jugadores y bots: vida, escudo, hambre, stamina, armas, daño
// ============================================================
import * as THREE from 'three';
import { crearPersonaje } from '../personaje.js';
import { CLASES } from '../datos.js';
import { ARMAS, PUNOS, OBJETOS, RAREZAS, nuevaArma, danoArma, modeloArma } from './armas.js';
import { sonar } from './audio.js';

const _v = new THREE.Vector3(), _w = new THREE.Vector3();

export function crearEntidad(G, cfg, { nombre, equipo, bot, id }){
  const P = crearPersonaje(cfg, CLASES);
  G.scene.add(P.root);
  if (bot) P.sombras(false);
  const clase = CLASES.find(c => c.id === cfg.clase) || CLASES[0];
  const vida = 100;
  const e = {
    id, nombre, equipo, bot, cfg, P, clase,
    pos: new THREE.Vector3(0, 60, 0), vy: 0, yaw: 0, pitch: 0, suelo: 0,
    vida, escudo: 0, escudoMax: 0, hambre: 100, stamina: 100, cansado: false,
    armas: [null, null], actual: 0, chatarra: 30,
    items: { inyPeq: 0, inyGrande: 0, arepa: 0, tequenos: 0, malta: 0, placa: 0 },
    estado: 'cayendo', derribadoT: 0, revivirT: 0, reviviendo: null,
    kills: 0, dano: 0, revividos: 0, show: 0, asesino: null, vivoHasta: 0,
    agachado: false, aire: false, apuntando: false, disparando: false,
    anim: 'idle', expr: 'normal', exprT: 0, golpeT: 0, curandoT: 0, curandoItem: null, comiendoT: 0,
    quietoT: 0, ultimaPos: new THREE.Vector3(), cd: 0, velMod: 1 + (clase.stats.VELOCIDAD - 7)*.05,
    arma3D: null, ai: bot ? { estado: 'botin', t: 0, objetivo: null, destino: null, atascoT: 0, pensar: Math.random()*.3, error: .1 + Math.random()*.08, reaccion: .45 + Math.random()*.5 } : null,
  };
  e.P.root.position.copy(e.pos);
  return e;
}

export const armaActual = e => e.armas[e.actual];

export function equiparModelo(e){
  const a = armaActual(e);
  if (e.arma3D){ e.arma3D.parent && e.arma3D.parent.remove(e.arma3D); e.arma3D = null; }
  if (!a) return;
  const m = modeloArma(a.id, a.rareza);
  m.rotation.x = 0; m.position.set(0, -.04, .02);
  e.P.arms.R.hand.add(m); e.arma3D = m;
}

// ------------------------------------------------------------
// Puntos de impacto (esferas) para disparos
// ------------------------------------------------------------
export function hitboxes(e){
  const hb = [];
  if (e.estado === 'muerto' || e.estado === 'cayendo') return hb;
  const s = e.P.skull; s.getWorldPosition(_v);
  if (!e.sinCabeza) hb.push({ c: _v.clone(), r: .3, parte: 'cabeza' });
  e.P.spine.getWorldPosition(_w);
  hb.push({ c: _w.clone().add(new THREE.Vector3(0, .32, 0)), r: .36, parte: 'torso' });
  e.P.pelvis.getWorldPosition(_w);
  hb.push({ c: _w.clone().add(new THREE.Vector3(0, -.35, 0)), r: .3, parte: 'piernas' });
  return hb;
}
function raySphere(o, d, c, r){
  const ox = o.x - c.x, oy = o.y - c.y, oz = o.z - c.z;
  const b = ox*d.x + oy*d.y + oz*d.z, cc = ox*ox + oy*oy + oz*oz - r*r, h = b*b - cc;
  if (h < 0) return Infinity; const t = -b - Math.sqrt(h); return t >= 0 ? t : Infinity;
}

// ------------------------------------------------------------
// Disparar: o = origen, dir = dirección normalizada
// ------------------------------------------------------------
export function disparar(G, e, o, dir){
  const a = armaActual(e);
  if (!a){ // puños
    if (e.cd > 0) return false; e.cd = PUNOS.cad;
    for (const t of G.entidades){
      if (t === e || t.equipo === e.equipo || (t.estado !== 'vivo' && t.estado !== 'derribado')) continue;
      if (t.pos.distanceTo(e.pos) < PUNOS.alcance){ danar(G, t, PUNOS.dmg, e, 'punos', 'torso', dir); sonar('golpe', .6); return true; }
    }
    return true;
  }
  if (a.recargando > 0 || e.cd > 0) return false;
  if (a.balas <= 0){ recargar(e); return false; }
  e.cd = a.def.cad; a.balas--;
  const esc = a.id === 'porton', fr = a.id === 'antena';
  const cerca = G.jugador ? e.pos.distanceTo(G.jugador.pos) : 0;
  sonar(esc ? 'escopeta' : fr ? 'franco' : 'disparo', e === G.jugador ? 1 : Math.max(0, 1 - cerca/60)*.8);
  e.ruidoT = 1.5;
  const boca = new THREE.Vector3(); if (e.arma3D) e.arma3D.userData.boca.getWorldPosition(boca); else boca.copy(o);
  const disp = a.def.disp * (e.apuntando ? .5 : 1) * (e.agachado ? .7 : 1) * (e.cansado ? 1.8 : 1);
  for (let k = 0; k < a.def.perdigones; k++){
    const d = dir.clone().add(new THREE.Vector3((Math.random() - .5)*2*disp, (Math.random() - .5)*2*disp, (Math.random() - .5)*2*disp)).normalize();
    const maxD = G.M.rayo(o, d, a.def.alcance);
    let mejor = maxD, blanco = null, parte = null;
    for (const t of G.entidades){
      if (t === e || t.equipo === e.equipo) continue;
      for (const h of hitboxes(t)){ const tt = raySphere(o, d, h.c, h.r); if (tt < mejor){ mejor = tt; blanco = t; parte = h.parte; } }
    }
    for (const p of G.perros){ if (p.vida <= 0) continue; const tt = raySphere(o, d, p.g.position.clone().add(new THREE.Vector3(0, .6, 0)), .6); if (tt < mejor){ mejor = tt; blanco = p; parte = 'perro'; } }
    const fin = o.clone().addScaledVector(d, mejor);
    if (k === 0 || Math.random() < .3) G.fx.trazo(boca, fin);
    if (blanco && parte === 'perro'){ blanco.vida -= danoArma(a); G.fx.chispas(fin); if (e === G.jugador) G.hud.hitmarker(); }
    else if (blanco){
      let dmg = danoArma(a) * (parte === 'cabeza' ? (fr ? 2.5 : 2) : parte === 'piernas' ? .8 : 1);
      if (esc) dmg *= Math.max(.3, 1 - mejor/a.def.alcance);
      danar(G, blanco, dmg, e, a.id, parte, d);
    } else if (mejor < a.def.alcance) G.fx.chispas(fin);
  }
  return true;
}

export function recargar(e){
  const a = armaActual(e);
  if (!a || a.recargando > 0 || a.balas >= a.def.cargador || e.chatarra <= 0) return;
  a.recargando = a.def.recarga; e.golpeArma = .35;   // le da un golpe al arma
  sonar('recarga', .5);
}

export function tickArmas(e, dt){
  e.cd = Math.max(0, e.cd - dt);
  const a = armaActual(e);
  if (a && a.recargando > 0){
    a.recargando -= dt;
    if (a.recargando <= 0){ const n = Math.min(a.def.cargador - a.balas, e.chatarra); a.balas += n; e.chatarra -= n; a.recargando = 0; }
  }
  if (e.golpeArma > 0){ e.golpeArma -= dt; if (e.arma3D) e.arma3D.rotation.z = Math.sin(e.golpeArma*40)*.4*(e.golpeArma/.35); }
  else if (e.arma3D) e.arma3D.rotation.z = 0;
}

// ------------------------------------------------------------
// Daño, derribo, muerte y desmembramiento
// ------------------------------------------------------------
export function danar(G, t, dmg, atacante, arma, parte = 'torso', dir = null){
  if (t.estado !== 'vivo' && t.estado !== 'derribado') return;
  if (atacante && atacante.equipo === t.equipo && atacante !== t) return;   // sin fuego amigo
  let d = dmg * (atacante && atacante.bot && t.bot ? .38 : 1);   // entre bots pelean más lento (la partida dura más)
  if (t.estado === 'vivo' && t.escudo > 0){ const abs = Math.min(t.escudo, d); t.escudo -= abs; d -= abs; }
  t.vida -= d; t.golpeT = 1; t.ultimaCausa = arma;
  if (atacante && atacante !== t){ atacante.dano += dmg; if (atacante === G.jugador){ G.hud.hitmarker(parte === 'cabeza'); sonar('hit', .7); } }
  if (t === G.jugador) G.hud.dolor(dmg);
  if (parte !== 'ambiente'){ const hb = hitboxes(t).find(h => h.parte === parte) || hitboxes(t)[0]; if (hb) G.fx.sangre(hb.c, Math.min(14, 3 + dmg/6), 2.5); }
  if (t.bot && atacante && atacante !== t && t.estado === 'vivo') { t.ai.objetivo = atacante; t.ai.estado = 'pelea'; }
  if (t.vida > 0) return;

  const desmembra = arma && ((ARMAS[arma] && ARMAS[arma].desmembra) || parte === 'cabeza' && arma === 'antena' || arma === 'explosion');
  if (t.estado === 'vivo' && companeroVivo(G, t)){
    t.estado = 'derribado'; t.vida = 30; t.derribadoT = 30; t.escudo = 0; t.derribador = atacante;
    G.hud.feed(`${atacante ? atacante.nombre : 'EL SISTEMA'} derribó a ${t.nombre}`, t.equipo === G.jugador?.equipo ? 'mal' : '');
    if (desmembra) desmembrar(G, t, parte, dir, true);
    return;
  }
  morir(G, t, atacante || t.derribador, arma, parte, dir, desmembra);
}

function companeroVivo(G, t){ return G.entidades.some(o => o !== t && o.equipo === t.equipo && o.estado === 'vivo'); }

function desmembrar(G, t, parte, dir, soloUno = false){
  const pz = t.P.partes(), f = (dir || new THREE.Vector3(0, 0, 1)).clone().multiplyScalar(4);
  const O = () => new THREE.Object3D();
  const quitar = k => {
    if (!pz[k] || t['sin_' + k]) return; t['sin_' + k] = true; G.fx.soltarParte(pz[k], f, t.suelo);
    // el cuerpo sigue animándose sin tocar la parte que salió volando
    if (k === 'cabeza'){ t.sinCabeza = true; t.P.head = O(); }
    if (k === 'brazoL') t.P.arms.L = { sh:O(), elbow:O(), hand:O(), sx:1 };
    if (k === 'brazoR'){ t.P.arms.R = { sh:O(), elbow:O(), hand:O(), sx:-1 }; t.arma3D = null; }
    if (k === 'piernaL') t.P.legs.L = { hip:O(), knee:O(), ankle:O() };
    if (k === 'piernaR') t.P.legs.R = { hip:O(), knee:O(), ankle:O() };
  };
  if (parte === 'cabeza') quitar('cabeza');
  else if (parte === 'piernas') quitar(Math.random() < .5 ? 'piernaL' : 'piernaR');
  else quitar(Math.random() < .5 ? 'brazoL' : 'brazoR');
  if (!soloUno && Math.random() < .35) quitar(['brazoL','brazoR','piernaL','piernaR'][Math.floor(Math.random()*4)]);
}

export function morir(G, t, atacante, arma, parte, dir, desmembra){
  if (t.estado === 'muerto') return;
  t.estado = 'muerto'; t.vida = 0; t.vivoHasta = G.t; t.causa = arma || 'desangrado'; t.asesino = atacante && atacante !== t ? atacante : null;
  if (t.asesino){ t.asesino.kills++; t.asesino.show += 30; }
  if (desmembra) desmembrar(G, t, parte, dir);
  G.fx.sangre(t.pos.clone().add(new THREE.Vector3(0, .3, 0)), 16, 3);
  sonar('canon', t === G.jugador ? 1 : .7);
  G.fx.caraCielo(t.P, t.nombre, t.pos);
  G.hud.feed(`${t.asesino ? t.asesino.nombre : 'EL SISTEMA'} ✕ ${t.nombre}`, t.equipo === G.jugador?.equipo ? 'mal' : t.asesino === G.jugador ? 'bien' : '');
  if (t.arma3D){ t.arma3D.parent && t.arma3D.parent.remove(t.arma3D); t.arma3D = null; }
  // suelta su botín
  for (const a of t.armas) if (a) G.soltarBotin(t.pos, { tipo:'arma', arma:a.id, rareza:a.rareza, balas:a.balas });
  if (t.chatarra > 0) G.soltarBotin(t.pos, { tipo:'chatarra', n: t.chatarra });
  for (const [k, n] of Object.entries(t.items)) for (let i = 0; i < n; i++) G.soltarBotin(t.pos, { tipo:k });
  t.armas = [null, null];
  G.anfitrionMuerte && G.anfitrionMuerte(t);
}

// ------------------------------------------------------------
// Recoger objetos
// ------------------------------------------------------------
export function recoger(G, e, o, forzarArma = false){
  if (o.tipo === 'arma'){
    const def = ARMAS[o.arma], slot = def.slot === 'secundaria' ? 1 : 0;
    if (e.armas[slot] && !forzarArma) return false;
    if (e.armas[slot]) G.soltarBotin(e.pos, { tipo:'arma', arma:e.armas[slot].id, rareza:e.armas[slot].rareza, balas:e.armas[slot].balas });
    const a = nuevaArma(o.arma, o.rareza); if (o.balas != null) a.balas = o.balas;
    e.armas[slot] = a; if (e.actual !== slot && !armaActual(e)) e.actual = slot; if (e.actual === slot || !e.armas[e.actual]) { e.actual = slot; }
    equiparModelo(e);
  } else if (o.tipo === 'chatarra') e.chatarra = Math.min(300, e.chatarra + (o.n || 30));
  else if (o.tipo === 'chaleco'){
    const max = { comun:25, rara:40, epica:50, legendaria:50 }[o.rareza || 'comun'];
    if (max <= e.escudoMax) return false;
    e.escudoMax = max; e.escudo = Math.max(e.escudo, max*.6); e.chalecoRareza = o.rareza;
    ponerChaleco(e, o.rareza);
  } else if (e.items[o.tipo] != null){
    if (e.items[o.tipo] >= 6) return false;
    e.items[o.tipo]++;
  } else return false;
  if (e === G.jugador){ sonar('recoger', .6); G.hud.aviso(`+ ${o.tipo === 'arma' ? ARMAS[o.arma].nombre + ' (' + RAREZAS[o.rareza].nombre + ')' : o.tipo === 'chaleco' ? 'Chaleco ' + RAREZAS[o.rareza||'comun'].nombre : OBJETOS[o.tipo].nombre}`); }
  return true;
}

// chaleco visible por rareza: cartón y cinta / de obra / placas de chatarra
function ponerChaleco(e, rareza){
  if (e.chaleco3D) e.chaleco3D.parent.remove(e.chaleco3D);
  const col = { comun:'#a8875a', rara:'#ff8a3d', epica:'#6b7280', legendaria:'#f5d06f' }[rareza || 'comun'];
  const m = new THREE.MeshStandardMaterial({ color: col, roughness: rareza === 'epica' ? .35 : .85, metalness: rareza === 'epica' ? .7 : 0 });
  const g = new THREE.Group();
  const s = e.cfg.cuerpo === 'robusto' ? 1.28 : e.cfg.cuerpo === 'delgado' ? .86 : 1;
  const v = new THREE.Mesh(new THREE.CylinderGeometry(.25*s, .24*s, .34, 20), m); v.scale.z = .82; v.position.y = .3; g.add(v);
  if (rareza === 'rara'){ const b = new THREE.Mesh(new THREE.CylinderGeometry(.252*s, .252*s, .04, 20), new THREE.MeshBasicMaterial({ color:'#e8ff3a' })); b.scale.z = .83; b.position.y = .26; g.add(b); }
  if (rareza === 'epica' || rareza === 'legendaria') for (let i = 0; i < 4; i++){ const p = new THREE.Mesh(new THREE.BoxGeometry(.1, .12, .03), m); p.position.set(-.075 + (i%2)*.15, .22 + Math.floor(i/2)*.14, .22*s); g.add(p); }
  e.P.spine.add(g); e.chaleco3D = g;
}

export function usarCuracion(e){
  if (e.curandoT > 0 || e.vida >= 100) return false;
  const it = e.items.inyGrande > 0 && e.vida < 50 ? 'inyGrande' : e.items.inyPeq > 0 ? 'inyPeq' : e.items.inyGrande > 0 ? 'inyGrande' : null;
  if (!it) return false;
  e.items[it]--; e.curandoItem = it; e.curandoT = OBJETOS[it].t; return true;
}
export function usarComida(e){
  const it = e.hambre < 55 && e.items.arepa > 0 ? 'arepa' : e.items.tequenos > 0 ? 'tequenos' : e.items.malta > 0 ? 'malta' : e.items.arepa > 0 ? 'arepa' : null;
  if (!it || e.hambre > 95) return false;
  e.items[it]--; const o = OBJETOS[it]; e.hambre = Math.min(100, e.hambre + o.hambre); if (o.stamina) e.stamina = Math.min(100, e.stamina + o.stamina); e.comiendoT = 1.2; return true;
}
export function usarPlaca(e){ if (e.items.placa <= 0 || e.escudoMax <= 0 || e.escudo >= e.escudoMax) return false; e.items.placa--; e.escudo = Math.min(e.escudoMax, e.escudo + 25); return true; }
