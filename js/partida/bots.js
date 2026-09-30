// ============================================================
// SPOTTED · Inteligencia de los bots
// Saquean, pelean, huyen de los peligros, van a los airdrops,
// reviven a su equipo y al final corren a la Cornucopia.
// ============================================================
import * as THREE from 'three';
import { sectorDe, puntoEnSector, PLAZA_R, MAP_R } from './mapa.js';
import { armaActual, disparar, recargar, usarCuracion, usarComida, usarPlaca } from './entidades.js';
import { ARMAS, RAREZAS } from './armas.js';

const _o = new THREE.Vector3(), _d = new THREE.Vector3();
const ALCANCE_IDEAL = { porton:6, licuadora:12, tuberia:18, antena:32, clavadora:12, tormenta:16 };

export function sectorPeligroso(G, x, z){
  const s = sectorDe(x, z);
  if (G.fase === 'final') return Math.hypot(x, z) > G.cornuR - 1;
  if (s === 0) return false;
  if (G.sellados.has(s)) return true;
  if (G.porSellar && G.porSellar.n === s && G.porSellar.t < 25) return true;
  const p = G.peligro;
  return !!(p && p.sector === s && (p.activo || p.aviso < 12) && p.tipo !== 'apagon');
}

function puntoSeguro(G, e){
  if (G.fase === 'final' || G.t > G.T.final - 25) { const a = Math.random()*Math.PI*2, r = Math.random()*Math.max(1, G.cornuR*.6); return new THREE.Vector3(Math.cos(a)*r, 0, Math.sin(a)*r); }
  const libres = [];
  for (let n = 1; n <= 12; n++) if (!G.sellados.has(n) && !(G.porSellar && G.porSellar.n === n) && !(G.peligro && G.peligro.sector === n)) libres.push(n);
  if (!libres.length) return new THREE.Vector3(0, 0, 0);
  // prefiere el sector libre más cercano
  libres.sort((a, b) => puntoEnSector(a, 35).distanceTo(e.pos) - puntoEnSector(b, 35).distanceTo(e.pos));
  return puntoEnSector(libres[Math.random() < .7 ? 0 : Math.floor(Math.random()*libres.length)], PLAZA_R + 6 + Math.random()*25);
}

function vision(G, e){
  const s = sectorDe(e.pos.x, e.pos.z);
  if (G.peligro && G.peligro.activo && G.peligro.sector === s){ if (G.peligro.tipo === 'apagon') return 14; if (G.peligro.tipo === 'niebla') return 11; }
  return 26;
}

function ojo(e, v){ return v.set(e.pos.x, e.pos.y + (e.agachado ? 1.0 : 1.55), e.pos.z); }

export function pensarBot(G, e, dt){
  const ai = e.ai;
  ai.pensar -= dt;
  if (e.estado === 'derribado'){
    const comp = G.entidades.filter(o => o.equipo === e.equipo && o.estado === 'vivo').sort((a, b) => a.pos.distanceTo(e.pos) - b.pos.distanceTo(e.pos))[0];
    e.moveDir.set(0, 0); if (comp){ const d = comp.pos.clone().sub(e.pos); d.y = 0; if (d.length() > 1.2) e.moveDir.set(d.x, d.z).normalize(); }
    return;
  }
  if (e.estado !== 'vivo') return;

  if (ai.pensar <= 0){
    ai.pensar = .25 + Math.random()*.1;
    decidir(G, e);
  }
  actuar(G, e, dt);
}

function decidir(G, e){
  const ai = e.ai;
  // 1) peligro: huir
  if (sectorPeligroso(G, e.pos.x, e.pos.z)){
    if (ai.estado !== 'huir' || !ai.destino || sectorPeligroso(G, ai.destino.x, ai.destino.z)) ai.destino = puntoSeguro(G, e);
    ai.estado = 'huir';
  }
  // 2) enemigo visible
  const vis = vision(G, e); let mejor = null, md = vis;
  ojo(e, _o);
  for (const t of G.entidades){
    if (t.equipo === e.equipo || (t.estado !== 'vivo' && t.estado !== 'derribado')) continue;
    const d = t.pos.distanceTo(e.pos); if (d > md) continue;
    if (t.invisible && d > 3) continue;
    if (G.M.visible(_o, ojo(t, _d))){ mejor = t; md = d; }
  }
  if (ai.estado === 'huir' && mejor && mejor.pos.distanceTo(e.pos) > 14) mejor = null;   // huyendo solo pelea de cerca
  if (mejor && !armaActual(e) && mejor.pos.distanceTo(e.pos) > 5) mejor = null;          // sin arma: primero buscar una
  if (mejor && e.vida < 45 && mejor.pos.distanceTo(e.pos) > 8 && ai.estado !== 'pelea'){ mejor = null; if (usarCuracion(e)) return; }   // herido: evita pelear
  if (mejor){
    if (ai.objetivo !== mejor){ ai.objetivo = mejor; ai.reaccionT = ai.reaccion; }
    ai.vistoT = 0; ai.estado = 'pelea'; return;
  }
  if (ai.estado === 'pelea'){
    ai.vistoT = (ai.vistoT || 0) + .25;
    if (ai.vistoT < 2.5 && ai.objetivo && ai.objetivo.estado !== 'muerto'){ ai.destino = ai.objetivo.pos.clone(); return; }
    ai.estado = 'botin'; ai.objetivo = null;
  }
  if (ai.estado === 'huir' && ai.destino && e.pos.distanceTo(ai.destino) > 3 && sectorPeligroso(G, e.pos.x, e.pos.z)) return;
  // 3) fase final: a la Cornucopia
  if (G.t > G.T.final - 30){ ai.estado = 'huir'; if (!ai.destino || Math.hypot(ai.destino.x, ai.destino.z) > G.cornuR*.7) ai.destino = puntoSeguro(G, e); return; }
  // 4) curarse / comer / placa
  if (e.vida < 60 && usarCuracion(e)) return;
  if (e.hambre < 45) usarComida(e);
  usarPlaca(e);
  // 5) revivir a un compañero
  const caido = G.entidades.find(o => o !== e && o.equipo === e.equipo && o.estado === 'derribado' && o.pos.distanceTo(e.pos) < 35);
  if (caido){ ai.estado = 'revivir'; ai.destino = caido.pos.clone(); ai.caido = caido; return; }
  // 6) airdrop
  const ad = G.airdrop;
  if (ad && ad.enSuelo && !ad.abierto && ad.pos.distanceTo(e.pos) < 45 && armaActual(e)){ ai.estado = 'airdrop'; ai.destino = ad.pos.clone(); return; }
  // 7) botín
  const necesita = e.hambre < 50 || !e.armas[0] || e.chatarra < 40 || e.items.inyPeq + e.items.inyGrande < 2 || e.escudoMax < 40 || e.items.arepa + e.items.tequenos < 1;
  if (necesita){
    const hambriento = e.hambre < 50 && e.items.arepa + e.items.tequenos + e.items.malta < 1;
    let b = null, bd = hambriento ? 45 : 28;
    for (const o of G.botin){
      if (o.tomado) continue;
      const d = o.pos.distanceTo(e.pos); if (d > bd) continue;
      if (sectorPeligroso(G, o.pos.x, o.pos.z)) continue;
      if (hambriento && !['arepa','tequenos','malta','pabellon'].includes(o.tipo) && d > 12) continue;
      if (o.tipo === 'arma' && e.armas[ARMAS[o.arma].slot === 'secundaria' ? 1 : 0]){
        const act = e.armas[ARMAS[o.arma].slot === 'secundaria' ? 1 : 0];
        if (Object.keys(RAREZAS).indexOf(o.rareza) <= Object.keys(RAREZAS).indexOf(act.rareza)) continue;
      }
      b = o; bd = d;
    }
    if (b){ ai.estado = 'botin'; ai.destino = b.pos.clone(); ai.botin = b; return; }
  }
  // 8) seguir al jugador (compañeros) o rondar
  if (G.jugador && e.equipo === G.jugador.equipo && G.jugador.estado === 'vivo' && G.jugador.pos.distanceTo(e.pos) > 10){
    ai.estado = 'seguir'; ai.destino = G.jugador.pos.clone().add(new THREE.Vector3((Math.random() - .5)*6, 0, (Math.random() - .5)*6)); return;
  }
  if (ai.estado !== 'rondar' || !ai.destino || e.pos.distanceTo(ai.destino) < 3){ ai.estado = 'rondar'; ai.destino = puntoSeguro(G, e); }
}

function actuar(G, e, dt){
  const ai = e.ai;
  e.correr = false; e.apuntando = false; e.disparando = false; e.moveDir.set(0, 0);
  if (e.curandoT > 0 && ai.estado !== 'pelea'){ return; }

  if (ai.estado === 'pelea' && ai.objetivo){
    const t = ai.objetivo, d = t.pos.distanceTo(e.pos);
    const a = armaActual(e);
    const ideal = a ? ALCANCE_IDEAL[a.id] || 14 : 1.2;
    const dir = t.pos.clone().sub(e.pos); dir.y = 0; dir.normalize();
    e.yaw = Math.atan2(dir.x, dir.z);
    // moverse: acercarse/alejarse + lateral
    ai.lado = ai.lado || (Math.random() < .5 ? 1 : -1); ai.ladoT = (ai.ladoT || 0) - dt;
    if (ai.ladoT <= 0){ ai.lado *= -1; ai.ladoT = .8 + Math.random()*1.4; e.agachado = Math.random() < .2; }
    const lat = new THREE.Vector2(dir.z, -dir.x).multiplyScalar(ai.lado*.8);
    const av = d > ideal*1.3 ? 1 : d < ideal*.6 ? -1 : 0;
    e.moveDir.set(dir.x*av + lat.x, dir.z*av + lat.y); if (e.moveDir.lengthSq() > 1) e.moveDir.normalize();
    e.correr = d > ideal*2 && e.stamina > 30;
    // disparar
    if (ai.reaccionT > 0){ ai.reaccionT -= dt; return; }
    if (a && a.balas <= 0 && e.chatarra > 0){ recargar(e); return; }
    e.apuntando = true;
    if (!a || d < (a ? a.def.alcance : 2)){
      ojo(e, _o);
      const hb = t.estado === 'derribado' ? t.pos.clone().add(new THREE.Vector3(0, .35, 0)) : t.pos.clone().add(new THREE.Vector3(0, t.agachado ? .9 : 1.2, 0));
      const err = ai.error * (1 + d/25) * (t.moveDir && t.moveDir.lengthSq() > .1 ? 1.4 : 1) * (G.dificultad || 1);
      const dd = hb.sub(_o).normalize().add(new THREE.Vector3((Math.random() - .5)*err*2, (Math.random() - .5)*err*2, (Math.random() - .5)*err*2)).normalize();
      e.pitch = Math.asin(dd.y);
      // ráfagas con pausas
      ai.rafaga = (ai.rafaga || 0) - dt;
      if (ai.rafaga < -(.7 + Math.random()*.9)) ai.rafaga = .3 + Math.random()*.6;
      if (ai.rafaga > 0){ e.disparando = true; disparar(G, e, _o.clone(), dd); }
    }
    return;
  }

  if (ai.estado === 'revivir' && ai.caido){
    const d = ai.caido.pos.distanceTo(e.pos);
    if (ai.caido.estado !== 'derribado'){ ai.estado = 'rondar'; ai.caido = null; return; }
    if (d < 1.4){ e.reviviendo = ai.caido; return; }
    ai.destino = ai.caido.pos.clone();
  }
  if (ai.estado === 'airdrop' && G.airdrop && e.pos.distanceTo(G.airdrop.pos) < 2.2 && !G.airdrop.abierto){ G.abrirAirdrop(e); ai.estado = 'botin'; }
  if (ai.estado === 'botin' && ai.botin && ai.botin.tomado){ ai.botin = null; ai.destino = null; ai.pensar = 0; }

  if (ai.destino){
    const d = ai.destino.clone().sub(e.pos); d.y = 0;
    const L = d.length();
    if (L > .8){
      d.normalize();
      // desvío si está atascado
      if (ai.desvioT > 0){ ai.desvioT -= dt; const a = ai.desvio; d.set(d.x*Math.cos(a) - d.z*Math.sin(a), 0, d.x*Math.sin(a) + d.z*Math.cos(a)); }
      e.moveDir.set(d.x, d.z); e.yaw = Math.atan2(d.x, d.z);
      e.correr = (ai.estado === 'huir' || L > 20) && e.stamina > 25;
    }
    ai.atascoT += dt;
    if (ai.atascoT > 1.2){
      if (ai.ultima && ai.ultima.distanceTo(e.pos) < .5 && L > 1.5){ ai.desvio = (Math.random() < .5 ? 1 : -1)*(Math.PI/2); ai.desvioT = .9; if (Math.random() < .3) e.saltar = true; }
      ai.ultima = e.pos.clone(); ai.atascoT = 0;
    }
  }
}
