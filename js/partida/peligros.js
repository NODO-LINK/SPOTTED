// ============================================================
// SPOTTED · Reloj de la arena: peligros por sector, sellado,
// airdrops con el holograma del anfitrión y duelo final en la Cornucopia
// ============================================================
import * as THREE from 'three';
import { SECTORES, PELIGROS, sectorDe, puntoEnSector, anguloSector, PLAZA_R, MAP_R } from './mapa.js';
import { danar } from './entidades.js';
import { sonar } from './audio.js';

export function tiempos(minutos){
  const k = minutos/15;          // escala (15 min = partida oficial)
  return { k, dur: 900*k, airdrops: [180, 360, 540, 720].map(s => s*k), cicloPeligro: 60*k, aviso: Math.min(30, 30*k*1.5), sellarDesde: 300*k, sellarCada: 60*k, final: 780*k };
}

const FRASES_PELIGRO = {
  niebla: ['Respiren hondo… o mejor no.', 'Un poquito de niebla para los que se escondían.'],
  drones: ['Mis drones odian a los que se quedan quietos.', '¿Camperos? Qué aburrido. Drones, ¡a trabajar!'],
  perros: ['Suelten a los perritos.', 'Mis perros robot tienen hambre.'],
  lluvia: ['Pronóstico: 100% ácido.', 'Traigan paraguas… ah, verdad que no hay.'],
  apagon: ['Se fue la luz. ¿Les suena?', 'Apagón en la arena. Qué nostalgia.'],
};

export function crearArena(G){
  const A = {};
  G.sellados = new Set();
  G.peligro = null; G.peligroN = 0;
  G.airdrop = null; G.airdropN = 0;
  G.perros = []; G.drones = [];
  G.cornuR = MAP_R + 10;

  const elegirSector = () => {
    // el anfitrión elige donde hay más gente escondida
    const cuenta = new Array(13).fill(0);
    for (const e of G.entidades) if (e.estado === 'vivo') cuenta[sectorDe(e.pos.x, e.pos.z)]++;
    let mejor = null, mc = -1;
    for (let n = 1; n <= 12; n++){ if (G.sellados.has(n) || (G.porSellar && G.porSellar.n === n) || (G.peligro && G.peligro.sector === n)) continue; const c = cuenta[n] + Math.random()*.9; if (c > mc){ mc = c; mejor = n; } }
    return mejor;
  };

  const iniciarPeligro = () => {
    const n = elegirSector(); if (!n) return;
    const tipo = SECTORES[n].peligro;
    G.peligro = { sector: n, tipo, aviso: G.T.aviso, activo: false, dur: G.T.cicloPeligro*.9, t: 0 };
    const fr = FRASES_PELIGRO[tipo][Math.floor(Math.random()*2)];
    G.hud.anfitrion(`SECTOR ${n} · ${SECTORES[n].nombre.toUpperCase()}: ${PELIGROS[tipo].nombre} en ${Math.round(G.T.aviso)} s. ${fr}`);
    if (sectorDe(G.jugador.pos.x, G.jugador.pos.z) === n) sonar('alerta');
  };

  const activarPeligro = p => {
    p.activo = true;
    if (p.tipo === 'perros') for (let i = 0; i < 4; i++){
      const g = G.fx.perro(); const pos = puntoEnSector(p.sector, PLAZA_R + 8 + Math.random()*40);
      g.position.copy(pos); G.scene.add(g); G.perros.push({ g, vida: 60, cd: 0, sector: p.sector });
    }
    if (p.tipo === 'drones') for (let i = 0; i < 3; i++){
      const g = G.fx.dron(false); g.position.copy(puntoEnSector(p.sector, 30)).setY(10); G.scene.add(g);
      G.drones.push({ g, objetivo: null, cd: 0, sector: p.sector });
    }
  };

  const terminarPeligro = () => {
    for (const d of G.drones) G.scene.remove(d.g); G.drones = [];
    for (const p of G.perros) G.scene.remove(p.g); G.perros = [];
    G.peligro = null;
  };

  const sellar = () => {
    const libres = []; for (let n = 1; n <= 12; n++) if (!G.sellados.has(n)) libres.push(n);
    if (!libres.length) return;
    // sella el sector con menos gente (empuja a todos a pelear)
    const cuenta = n => G.entidades.filter(e => e.estado === 'vivo' && sectorDe(e.pos.x, e.pos.z) === n).length;
    libres.sort((a, b) => cuenta(a) - cuenta(b) + (Math.random() - .5));
    const n = libres[0];
    G.porSellar = { n, t: Math.max(12, G.T.aviso) };
    G.hud.anfitrion(`El SECTOR ${n} se sella en ${Math.round(G.porSellar.t)} s. Para siempre. ¡Muévanse!`);
    if (sectorDe(G.jugador.pos.x, G.jugador.pos.z) === n) sonar('alerta');
  };

  // ---------------- airdrop ----------------
  const lanzarAirdrop = () => {
    G.airdropN++;
    const libres = []; for (let n = 1; n <= 12; n++) if (!G.sellados.has(n)) libres.push(n);
    const pos = G.airdropN >= 4 || !libres.length ? new THREE.Vector3((Math.random() - .5)*6, 0, (Math.random() - .5)*6) : puntoEnSector(libres[Math.floor(Math.random()*libres.length)], PLAZA_R + 8 + Math.random()*30);
    pos.y = G.M.alturaSuelo(pos.x, pos.z);
    const dron = G.fx.dron(true); const ang = Math.random()*Math.PI*2;
    dron.position.set(Math.cos(ang)*(MAP_R + 20), 38, Math.sin(ang)*(MAP_R + 20)); G.scene.add(dron);
    G.airdrop = { pos, dron, caja: null, enSuelo: false, abierto: false, fase: 'vuelo', sector: sectorDe(pos.x, pos.z) };
    G.fx.holograma(pos, `AIRDROP VIZZION · SECTOR ${G.airdrop.sector || 'CENTRO'}\nArma legendaria · Escudo · Comida de lujo`, 8);
    G.hud.anfitrion(`¡Regalito! Mi dron va al ${G.airdrop.sector ? 'sector ' + G.airdrop.sector : 'centro'}: arma legendaria, escudo completo y pabellón. ¡A pelearlo!`);
    sonar('alerta', .8);
  };
  G.abrirAirdrop = e => {
    const ad = G.airdrop; if (!ad || ad.abierto || !ad.enSuelo) return;
    ad.abierto = true; ad.caja.userData.haz.visible = false;
    G.soltarBotin(ad.pos, { tipo:'arma', arma:'tormenta', rareza:'legendaria' });
    G.soltarBotin(ad.pos, { tipo:'chaleco', rareza:'epica' });
    G.soltarBotin(ad.pos, { tipo:'pabellon' }); G.soltarBotin(ad.pos, { tipo:'placa' }); G.soltarBotin(ad.pos, { tipo:'placa' });
    G.soltarBotin(ad.pos, { tipo:'chatarra', n: 80 });
    if (e){ e.show += 20; G.hud.feed(`${e.nombre} abrió el airdrop de VIZZION`, e === G.jugador ? 'bien' : ''); }
  };

  // ---------------- tick ----------------
  let proxPeligro = 40*G.T.k + 20, proxSello = G.T.sellarDesde;
  A.update = dt => {
    const t = G.t;
    // peligros
    if (G.fase === 'juego'){
      if (!G.peligro && t >= proxPeligro){ iniciarPeligro(); proxPeligro = t + G.T.cicloPeligro + G.T.aviso*.3; }
      if (G.peligro){
        const p = G.peligro;
        if (!p.activo){ p.aviso -= dt; if (p.aviso <= 0) activarPeligro(p); }
        else { p.t += dt; if (p.t > p.dur) terminarPeligro(); }
      }
      if (t >= proxSello && G.sellados.size < 11 && !G.porSellar){ sellar(); proxSello += G.T.sellarCada; }
      if (G.porSellar){ G.porSellar.t -= dt; if (G.porSellar.t <= 0){ const n = G.porSellar.n; G.sellados.add(n); G.porSellar = null; if (G.peligro && G.peligro.sector === n) terminarPeligro(); G.hud.anfitrion(`SECTOR ${n} SELLADO. Quedan ${12 - G.sellados.size}.`, 4); } }
      if (t >= G.T.final){
        G.fase = 'final'; terminarPeligro(); G.porSellar = null; for (let n = 1; n <= 12; n++) G.sellados.add(n); G.cornuR = PLAZA_R + 8;
        G.hud.anfitrion('¡Se cerró la ciudad! Todos a la CORNUCOPIA. Solo uno sale de aquí.');
        sonar('alerta', 1);
      }
    } else if (G.fase === 'final'){
      // el anillo se encoge hasta los 15:00 y luego sigue hasta cero (muerte súbita)
      const restante = Math.max(1, G.T.dur - t);
      const objetivo = t < G.T.dur ? 2.5 : 0;
      G.cornuR = Math.max(objetivo, G.cornuR - (G.cornuR - objetivo)*dt/restante*1.2 - (t >= G.T.dur ? dt*.6 : 0));
    }
    // airdrops
    if (G.airdropN < G.T.airdrops.length && t >= G.T.airdrops[G.airdropN]) lanzarAirdrop();
    const ad = G.airdrop;
    if (ad){
      G.fx.giraHelices(ad.dron, dt);
      if (ad.fase === 'vuelo'){
        const obj = new THREE.Vector3(ad.pos.x, 38, ad.pos.z), d = obj.clone().sub(ad.dron.position);
        if (d.length() < 1){ ad.fase = 'cae'; ad.caja = G.fx.caja(); ad.caja.position.copy(ad.dron.position).setY(36); G.scene.add(ad.caja); }
        else { d.normalize(); ad.dron.position.addScaledVector(d, dt*18); ad.dron.lookAt(obj.x, 38, obj.z); }
      } else {
        if (ad.dron.visible){ ad.dron.position.y += dt*6; if (ad.dron.position.y > 90){ ad.dron.visible = false; G.scene.remove(ad.dron); } }
        if (ad.fase === 'cae'){
          ad.caja.position.y -= dt*6;
          if (ad.caja.position.y <= ad.pos.y){ ad.caja.position.y = ad.pos.y; ad.fase = 'suelo'; ad.enSuelo = true; ad.caja.userData.para.visible = false; sonar('impacto', .6); }
        }
        ad.caja.userData.haz.material.opacity = .15 + Math.sin(t*4)*.1;
      }
    }
    // daño ambiental
    A.tickDanos(dt);
    // capas del minimapa y del suelo
    for (let n = 1; n <= 12; n++){
      const c = G.M.capas[n];
      if (G.sellados.has(n)){ c.material.color.set('#ff2d55'); c.material.opacity = .22 + Math.sin(t*3)*.05; }
      else if (G.porSellar && G.porSellar.n === n){ c.material.color.set('#ff2d55'); c.material.opacity = .06 + Math.abs(Math.sin(t*6))*.14; }
      else if (G.peligro && G.peligro.sector === n){ c.material.color.set(PELIGROS[G.peligro.tipo].color); c.material.opacity = G.peligro.activo ? .25 : .08 + Math.abs(Math.sin(t*5))*.12; }
      else c.material.opacity = 0;
    }
    // drones cazadores
    for (const d of G.drones){
      G.fx.giraHelices(d.g, dt);
      if (!d.objetivo || d.objetivo.estado !== 'vivo' || sectorDe(d.objetivo.pos.x, d.objetivo.pos.z) !== d.sector || d.objetivo.quietoT < 2.5){
        d.objetivo = G.entidades.filter(e => e.estado === 'vivo' && e.quietoT > 2.5 && sectorDe(e.pos.x, e.pos.z) === d.sector).sort((a, b) => b.quietoT - a.quietoT)[0] || null;
      }
      const obj = d.objetivo ? d.objetivo.pos.clone().setY(d.objetivo.pos.y + 5) : puntoEnSector(d.sector, 30).setY(12);
      d.g.position.lerp(obj, Math.min(1, dt*.8));
      d.cd -= dt;
      if (d.objetivo && d.g.position.distanceTo(obj) < 3 && d.cd <= 0){
        d.cd = .5; danar(G, d.objetivo, 8, null, 'dron', 'torso'); G.fx.trazo(d.g.position.clone(), d.objetivo.pos.clone().setY(d.objetivo.pos.y + 1.2));
      }
    }
    // perros robot
    for (const p of G.perros){
      if (p.vida <= 0){ if (p.g.visible){ p.g.visible = false; G.fx.chispas(p.g.position.clone().setY(.6)); G.fx.chispas(p.g.position.clone().setY(.8)); } continue; }
      const obj = G.entidades.filter(e => e.estado === 'vivo' && sectorDe(e.pos.x, e.pos.z) === p.sector).sort((a, b) => a.pos.distanceTo(p.g.position) - b.pos.distanceTo(p.g.position))[0];
      const pata = Math.sin(t*14);
      p.g.userData.patas.forEach((l, i) => l.rotation.x = (i % 2 ? pata : -pata)*.6);
      if (!obj) continue;
      const d = obj.pos.clone().sub(p.g.position); d.y = 0; const L = d.length();
      p.g.rotation.y = Math.atan2(d.x, d.z);
      if (L > 1.1){ d.normalize(); const np = p.g.position.clone().addScaledVector(d, dt*6.2); G.M.resolver(np, .5, 0); p.g.position.copy(np); }
      p.cd -= dt;
      if (L < 1.4 && p.cd <= 0){ p.cd = .9; danar(G, obj, 12, null, 'perro', 'piernas'); }
    }
  };

  A.tickDanos = dt => {
    for (const e of G.entidades){
      if (e.estado !== 'vivo' && e.estado !== 'derribado') continue;
      const s = sectorDe(e.pos.x, e.pos.z);
      let dps = 0, causa = 'ambiente';
      if (G.fase === 'final'){ if (Math.hypot(e.pos.x, e.pos.z) > G.cornuR){ dps = 12; causa = 'cornucopia'; } }
      else if (s && G.sellados.has(s)){ dps = 7; causa = 'sellado'; }
      else if (G.peligro && G.peligro.activo && G.peligro.sector === s){
        if (G.peligro.tipo === 'niebla'){ dps = 4; causa = 'niebla'; }
        if (G.peligro.tipo === 'lluvia'){ dps = e.pos.y > .5 ? 2 : 5; causa = 'lluvia'; }
      }
      if (dps){ e.ambT = (e.ambT || 0) + dt; if (e.ambT > .5){ danar(G, e, dps*e.ambT, null, causa, 'ambiente'); e.ambT = 0; } }
    }
  };
  return A;
}
