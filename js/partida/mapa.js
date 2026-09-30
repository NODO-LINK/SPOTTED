// ============================================================
// SPOTTED · Mapa de la ciudad (12 sectores tipo reloj + Cornucopia)
// ============================================================
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { canvasTex } from '../escena.js';

export const MAP_R = 70;
export const PLAZA_R = 12;
export const SECTORES = [
  null,
  { n:1,  nombre:'Barrio Neón',       peligro:'apagon',  tipo:'barrio' },
  { n:2,  nombre:'Avenida del Ojo',   peligro:'drones',  tipo:'avenida' },
  { n:3,  nombre:'Distrito Hospital', peligro:'lluvia',  tipo:'hospital' },
  { n:4,  nombre:'Zona Industrial',   peligro:'perros',  tipo:'industrial' },
  { n:5,  nombre:'Lotes Baldíos',     peligro:'niebla',  tipo:'baldio' },
  { n:6,  nombre:'Mercado Nocturno',  peligro:'apagon',  tipo:'mercado' },
  { n:7,  nombre:'Rascacielos',       peligro:'drones',  tipo:'rascacielos' },
  { n:8,  nombre:'Parque de Skate',   peligro:'lluvia',  tipo:'parque' },
  { n:9,  nombre:'Barrios Bajos',     peligro:'niebla',  tipo:'barrio' },
  { n:10, nombre:'Armería Central',   peligro:'perros',  tipo:'armeria' },
  { n:11, nombre:'Calle Comercial',   peligro:'lluvia',  tipo:'comercial' },
  { n:12, nombre:'Zona Militar',      peligro:'drones',  tipo:'militar' },
];
export const PELIGROS = {
  niebla: { nombre:'NIEBLA TÓXICA',   color:'#9b5cff' },
  drones: { nombre:'DRONES CAZADORES', color:'#ff2d55' },
  perros: { nombre:'PERROS ROBOT',    color:'#ff8a3d' },
  lluvia: { nombre:'LLUVIA DE ÁCIDO', color:'#39ff9f' },
  apagon: { nombre:'APAGÓN',          color:'#35e0ff' },
};

export function sectorDe(x, z){
  if (Math.hypot(x, z) < PLAZA_R) return 0;          // 0 = Cornucopia
  let a = Math.atan2(x, -z); if (a < 0) a += Math.PI*2;  // 0 = norte, horario
  return Math.floor(a / (Math.PI/6)) + 1;
}
export function anguloSector(n){ return (n - .5) * Math.PI/6; }   // ángulo central del sector
export function puntoEnSector(n, r){ const a = anguloSector(n) + (Math.random() - .5)*.4; return new THREE.Vector3(Math.sin(a)*r, 0, -Math.cos(a)*r); }

// ------------------------------------------------------------
function rng(seed){ let s = seed; return () => (s = (s * 16807) % 2147483647) / 2147483647; }

function uvEscalado(geo, w, h, d, k = .25){
  const uv = geo.attributes.uv;
  for (let f = 0; f < 6; f++){
    const [su, sv] = f < 2 ? [d*k, h*k] : f < 4 ? [0, 0] : [w*k, h*k];
    for (let i = 0; i < 4; i++){ const j = f*4 + i; uv.setXY(j, uv.getX(j)*su, uv.getY(j)*sv); }
  }
}

function letrero(texto, color, icono){
  const t = canvasTex(512, 128), x = t.ctx;
  x.fillStyle = '#0b0714'; x.fillRect(0, 0, 512, 128);
  x.strokeStyle = color; x.lineWidth = 8; x.shadowColor = color; x.shadowBlur = 18; x.strokeRect(8, 8, 496, 112);
  x.fillStyle = color; x.font = '900 60px "Chakra Petch", sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle';
  x.fillText((icono ? icono + ' ' : '') + texto, 256, 68);
  return new THREE.MeshBasicMaterial({ map: t.t, fog: true });
}

export function construirMapa(scene){
  const R = rng(1234);
  const M = { colliders: [], botin: [], especiales: [], root: new THREE.Group() };
  scene.add(M.root);

  // ---------- suelo ----------
  const g = canvasTex(1024, 1024), gx = g.ctx;
  gx.fillStyle = '#15121e'; gx.fillRect(0, 0, 1024, 1024);
  for (let i = 0; i < 4000; i++){ gx.fillStyle = `rgba(255,255,255,${Math.random()*.03})`; gx.fillRect(Math.random()*1024, Math.random()*1024, 3, 3); }
  g.t.wrapS = g.t.wrapT = THREE.RepeatWrapping; g.t.repeat.set(10, 10);
  const suelo = new THREE.Mesh(new THREE.CircleGeometry(MAP_R + 30, 96), new THREE.MeshStandardMaterial({ map: g.t, roughness: .9 }));
  suelo.rotation.x = -Math.PI/2; suelo.receiveShadow = true; M.root.add(suelo);

  // calles con líneas
  const calleM = new THREE.MeshStandardMaterial({ color:'#1d1a26', roughness:.7, metalness:.2 });
  const lineaM = new THREE.MeshBasicMaterial({ color:'#ffd23f' });
  const S = 16, W = 5;
  const calles = [];
  for (let i = -4; i <= 4; i++){
    const off = i*S + S/2;
    calles.push(new THREE.PlaneGeometry(W, MAP_R*2).rotateX(-Math.PI/2).translate(off, .01, 0));
    calles.push(new THREE.PlaneGeometry(MAP_R*2, W).rotateX(-Math.PI/2).translate(0, .01, off));
  }
  M.root.add(new THREE.Mesh(mergeGeometries(calles), calleM));
  const lineas = [];
  for (let i = -4; i <= 4; i++){ const off = i*S + S/2;
    for (let k = -MAP_R; k < MAP_R; k += 4){ lineas.push(new THREE.PlaneGeometry(.18, 1.6).rotateX(-Math.PI/2).translate(off, .02, k)); lineas.push(new THREE.PlaneGeometry(1.6, .18).rotateX(-Math.PI/2).translate(k, .02, off)); } }
  M.root.add(new THREE.Mesh(mergeGeometries(lineas), lineaM));

  // ---------- plaza de la Cornucopia ----------
  const plaza = new THREE.Mesh(new THREE.CircleGeometry(PLAZA_R, 64), new THREE.MeshStandardMaterial({ color:'#221a33', roughness:.4, metalness:.4 }));
  plaza.rotation.x = -Math.PI/2; plaza.position.y = .03; plaza.receiveShadow = true; M.root.add(plaza);
  const aro = new THREE.Mesh(new THREE.TorusGeometry(PLAZA_R, .12, 8, 96), new THREE.MeshBasicMaterial({ color:'#f5d06f' }));
  aro.rotation.x = Math.PI/2; aro.position.y = .05; M.root.add(aro);
  M.cornucopia = construirCornucopia(); M.root.add(M.cornucopia);
  M.colliders.push({ minX:-2.2, maxX:2.2, minZ:-2.6, maxZ:1.2, h:2.6, cornu:true });

  // ---------- edificios ----------
  const ventanas = [];
  for (const cols of [['#ff2d55','#35e0ff','#8b5cf6'], ['#ffd23f','#ff8a3d','#ff5fa2']]){
    const w = canvasTex(128, 128);
    w.ctx.fillStyle = '#141020'; w.ctx.fillRect(0, 0, 128, 128);
    for (let y = 10; y < 128; y += 32) for (let x = 10; x < 128; x += 32)
      if (Math.random() < .55){ w.ctx.fillStyle = cols[Math.floor(Math.random()*3)]; w.ctx.globalAlpha = .4 + Math.random()*.6; w.ctx.fillRect(x, y, 14, 16); }
    w.t.wrapS = w.t.wrapT = THREE.RepeatWrapping; ventanas.push(w.t);
  }
  const geos = [[], []], techos = [];
  const addBox = (cx, cz, w, d, h, mat = 0, info = null) => {
    const b = new THREE.BoxGeometry(w, h, d); uvEscalado(b, w, h, d); b.translate(cx, h/2, cz);
    geos[mat].push(b);
    techos.push(new THREE.PlaneGeometry(w - .2, d - .2).rotateX(-Math.PI/2).translate(cx, h + .01, cz));
    const c = { minX: cx - w/2, maxX: cx + w/2, minZ: cz - d/2, maxZ: cz + d/2, h, ...(info || {}) };
    M.colliders.push(c); return c;
  };

  const especialesPorTipo = { hospital:0, armeria:0, comercial:0 };
  for (let i = -4; i <= 3; i++) for (let j = -4; j <= 3; j++){
    const cx = i*S + S, cz = j*S + S;          // centro de la manzana
    const dist = Math.hypot(cx, cz);
    if (dist < PLAZA_R + 6 || dist > MAP_R - 6) continue;
    const sec = SECTORES[sectorDe(cx, cz)], tipo = sec.tipo;
    const B = S - W - 1.2;                       // tamaño útil de la manzana
    const alto = (a, b) => a + R()*(b - a);
    let especial = null;
    if (tipo === 'hospital' && especialesPorTipo.hospital < 1){ especial = 'HOSPITAL'; especialesPorTipo.hospital++; }
    else if (tipo === 'armeria' && especialesPorTipo.armeria < 1){ especial = 'ARMERÍA'; especialesPorTipo.armeria++; }
    else if ((tipo === 'comercial' || tipo === 'barrio') && R() < .35){ especial = 'FARMACIA'; }

    if (especial){
      const c = addBox(cx, cz, B*.8, B*.8, especial === 'HOSPITAL' ? 9 : 5, 1, { especial });
      const col = especial === 'HOSPITAL' ? '#ff2d55' : especial === 'FARMACIA' ? '#39ff9f' : '#ffd23f';
      const ico = especial === 'ARMERÍA' ? '✦' : '✚';
      const cartel = new THREE.Mesh(new THREE.PlaneGeometry(B*.6, B*.15), letrero(especial, col, ico));
      // mira hacia la plaza
      const face = Math.abs(cx) > Math.abs(cz) ? (cx > 0 ? 'x-' : 'x+') : (cz > 0 ? 'z-' : 'z+');
      const hh = c.h - 1.2;
      if (face === 'x-'){ cartel.position.set(c.minX - .05, hh, cz); cartel.rotation.y = -Math.PI/2; }
      if (face === 'x+'){ cartel.position.set(c.maxX + .05, hh, cz); cartel.rotation.y = Math.PI/2; }
      if (face === 'z-'){ cartel.position.set(cx, hh, c.minZ - .05); cartel.rotation.y = Math.PI; }
      if (face === 'z+'){ cartel.position.set(cx, hh, c.maxZ + .05); }
      M.root.add(cartel);
      M.especiales.push({ tipo: especial, x: cx, z: cz, c });
      // botín alrededor del edificio especial
      for (let k = 0; k < 7; k++){ const a = R()*Math.PI*2; M.botin.push({ x: cx + Math.cos(a)*(B*.5 + 1.3), z: cz + Math.sin(a)*(B*.5 + 1.3), zona: especial }); }
      continue;
    }
    if (tipo === 'baldio' || tipo === 'parque'){
      // pocos obstáculos bajos (escombros o rampas)
      for (let k = 0; k < 4; k++) addBox(cx + (R() - .5)*B*.7, cz + (R() - .5)*B*.7, alto(1.5, 3), alto(1.5, 3), alto(.6, 1.2), 0);
      for (let k = 0; k < 4; k++) M.botin.push({ x: cx + (R() - .5)*B, z: cz + (R() - .5)*B, zona: tipo });
      continue;
    }
    if (tipo === 'mercado'){
      for (let a = 0; a < 3; a++) for (let b = 0; b < 2; b++) addBox(cx - B*.3 + a*B*.3, cz - B*.2 + b*B*.4, 2.2, 1.6, 1.1, 1);
      for (let k = 0; k < 6; k++) M.botin.push({ x: cx + (R() - .5)*B, z: cz + (R() - .5)*B, zona: 'MERCADO' });
      continue;
    }
    const [hMin, hMax] = tipo === 'rascacielos' ? [16, 30] : tipo === 'militar' ? [2.5, 4] : tipo === 'barrio' ? [3, 7] : tipo === 'industrial' ? [5, 9] : [6, 14];
    if (R() < .5){ addBox(cx, cz, B*alto(.6, .9), B*alto(.6, .9), alto(hMin, hMax), R() < .5 ? 0 : 1); }
    else {
      addBox(cx - B*.25, cz - B*.22, B*.42, B*.4, alto(hMin, hMax), 0);
      addBox(cx + B*.24, cz + B*.2, B*.4, B*.45, alto(hMin, hMax), 1);
    }
    for (let k = 0; k < 3; k++){ const a = R()*Math.PI*2; M.botin.push({ x: cx + Math.cos(a)*(B*.5 + 1), z: cz + Math.sin(a)*(B*.5 + 1), zona: tipo }); }
  }
  // contenedores y muros bajos para cubrirse (se pueden trepar)
  for (let k = 0; k < 60; k++){
    const a = R()*Math.PI*2, r = PLAZA_R + 4 + R()*(MAP_R - PLAZA_R - 10);
    const x = Math.sin(a)*r, z = -Math.cos(a)*r;
    if (M.colliders.some(c => x > c.minX - 1.5 && x < c.maxX + 1.5 && z > c.minZ - 1.5 && z < c.maxZ + 1.5)) continue;
    addBox(x, z, R() < .5 ? 2.4 : 1.2, R() < .5 ? 1.2 : 2.4, R() < .6 ? 1.1 : 2.2, 1);
  }
  const edifM = ventanas.map(t => new THREE.MeshStandardMaterial({ color:'#171222', emissive:'#ffffff', emissiveMap:t, emissiveIntensity:.85, roughness:.8, map:null }));
  for (let m = 0; m < 2; m++) if (geos[m].length){ const mesh = new THREE.Mesh(mergeGeometries(geos[m]), edifM[m]); mesh.castShadow = true; mesh.receiveShadow = true; M.root.add(mesh); }
  const techo = new THREE.Mesh(mergeGeometries(techos), new THREE.MeshStandardMaterial({ color:'#221c30', roughness:.8 })); techo.receiveShadow = true; M.root.add(techo);

  // ---------- borde de la arena (muro de energía) ----------
  const muro = new THREE.Mesh(new THREE.CylinderGeometry(MAP_R + 2, MAP_R + 2, 30, 96, 1, true),
    new THREE.MeshBasicMaterial({ color:'#ff2d55', transparent:true, opacity:.12, side:THREE.DoubleSide, depthWrite:false }));
  muro.position.y = 15; M.root.add(muro);

  // ---------- capas de sector (peligros y sellado) ----------
  M.capas = [null];
  for (let n = 1; n <= 12; n++){
    const a0 = (n - 1)*Math.PI/6;
    const geo = new THREE.RingGeometry(PLAZA_R, MAP_R + 2, 24, 1, Math.PI/2 - a0 - Math.PI/6, Math.PI/6);
    const m = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color:'#ff2d55', transparent:true, opacity:0, depthWrite:false, side:THREE.DoubleSide }));
    m.rotation.x = -Math.PI/2; m.position.y = .08; M.root.add(m);
    M.capas.push(m);
  }
  // etiquetas de números de sector en el suelo (tipo reloj)
  for (let n = 1; n <= 12; n++){
    const t = canvasTex(128, 128); t.ctx.fillStyle = 'rgba(255,255,255,.14)'; t.ctx.font = '900 96px "Chakra Petch", sans-serif'; t.ctx.textAlign = 'center'; t.ctx.textBaseline = 'middle'; t.ctx.fillText(n, 64, 70);
    const p = new THREE.Mesh(new THREE.PlaneGeometry(6, 6), new THREE.MeshBasicMaterial({ map: t.t, transparent:true, depthWrite:false }));
    const a = anguloSector(n); p.position.set(Math.sin(a)*(PLAZA_R + 3.5), .06, -Math.cos(a)*(PLAZA_R + 3.5)); p.rotation.x = -Math.PI/2; p.rotation.z = -a;
    M.root.add(p);
  }

  // ---------- rejilla espacial (rápido en celulares) ----------
  const CEL = 8, grid = new Map();
  const key = (i, j) => i*1000 + j;
  for (const c of M.colliders)
    for (let i = Math.floor(c.minX/CEL); i <= Math.floor(c.maxX/CEL); i++)
      for (let j = Math.floor(c.minZ/CEL); j <= Math.floor(c.maxZ/CEL); j++){ const k = key(i, j); if (!grid.has(k)) grid.set(k, []); grid.get(k).push(c); }
  const vacio = [];
  const cerca = (x, z) => grid.get(key(Math.floor(x/CEL), Math.floor(z/CEL))) || vacio;
  M.cerca = cerca;

  // ---------- consultas ----------
  M.alturaSuelo = (x, z, y = 99) => {      // superficie más alta bajo (x,z) por debajo de y
    let h = 0;
    for (const c of cerca(x, z)) if (x > c.minX && x < c.maxX && z > c.minZ && z < c.maxZ && c.h <= y + .35 && c.h > h) h = c.h;
    return h;
  };
  M.resolver = (p, r, y) => {                 // empuja un círculo fuera de los edificios
    const lista = new Set();
    for (const dx of [-r, r]) for (const dz of [-r, r]) for (const c of cerca(p.x + dx, p.z + dz)) lista.add(c);
    for (const c of lista){
      if (y >= c.h - .3) continue;
      const nx = Math.max(c.minX, Math.min(p.x, c.maxX)), nz = Math.max(c.minZ, Math.min(p.z, c.maxZ));
      const dx = p.x - nx, dz = p.z - nz, d2 = dx*dx + dz*dz;
      if (d2 < r*r){
        if (d2 > 1e-6){ const d = Math.sqrt(d2), k = (r - d)/d; p.x += dx*k; p.z += dz*k; }
        else { // dentro: sale por el lado más cercano
          const m = [p.x - c.minX, c.maxX - p.x, p.z - c.minZ, c.maxZ - p.z], i = m.indexOf(Math.min(...m));
          if (i === 0) p.x = c.minX - r; if (i === 1) p.x = c.maxX + r; if (i === 2) p.z = c.minZ - r; if (i === 3) p.z = c.maxZ + r;
        }
      }
    }
    const d = Math.hypot(p.x, p.z); if (d > MAP_R){ p.x *= MAP_R/d; p.z *= MAP_R/d; }
  };
  // línea de visión 2D + altura (para bots y cámara)
  M.visible = (a, b) => {
    const dx = b.x - a.x, dz = b.z - a.z;
    for (const c of M.colliders){
      if (c.h < 1.3) continue;
      let t0 = 0, t1 = 1;
      for (const [p, dp, lo, hi] of [[a.x, dx, c.minX, c.maxX], [a.z, dz, c.minZ, c.maxZ]]){
        if (Math.abs(dp) < 1e-9){ if (p < lo || p > hi){ t0 = 2; break; } continue; }
        let u0 = (lo - p)/dp, u1 = (hi - p)/dp; if (u0 > u1) [u0, u1] = [u1, u0];
        t0 = Math.max(t0, u0); t1 = Math.min(t1, u1); if (t0 > t1) break;
      }
      if (t0 <= t1 && t0 < 1){ const yA = lerpY(a.y, b.y, t0); if (yA < c.h) return false; }
    }
    return true;
  };
  const lerpY = (a, b, t) => a + (b - a)*t;
  // distancia del rayo hasta el primer edificio (para balas y cámara)
  M.rayo = (o, d, maxD) => {
    let best = maxD;
    for (const c of M.colliders){
      let t0 = 0, t1 = best;
      let ok = true;
      for (const [p, dp, lo, hi] of [[o.x, d.x, c.minX, c.maxX], [o.y, d.y, 0, c.h], [o.z, d.z, c.minZ, c.maxZ]]){
        if (Math.abs(dp) < 1e-9){ if (p < lo || p > hi){ ok = false; break; } continue; }
        let u0 = (lo - p)/dp, u1 = (hi - p)/dp; if (u0 > u1) [u0, u1] = [u1, u0];
        t0 = Math.max(t0, u0); t1 = Math.min(t1, u1); if (t0 > t1){ ok = false; break; }
      }
      if (ok && t0 < best) best = t0;
    }
    if (d.y < 0){ const tg = -o.y / d.y; if (tg < best) best = tg; }
    return best;
  };

  // ---------- minimapa base ----------
  const mm = document.createElement('canvas'); mm.width = mm.height = 512;
  const mx = mm.getContext('2d'), k = 256/(MAP_R + 4);
  mx.fillStyle = '#0d0a16'; mx.beginPath(); mx.arc(256, 256, 256, 0, Math.PI*2); mx.fill();
  mx.fillStyle = '#2a2438'; for (const c of M.colliders) mx.fillRect(256 + c.minX*k, 256 + c.minZ*k, (c.maxX - c.minX)*k, (c.maxZ - c.minZ)*k);
  for (const e of M.especiales){ mx.fillStyle = e.tipo === 'HOSPITAL' ? '#ff2d55' : e.tipo === 'FARMACIA' ? '#39ff9f' : '#ffd23f'; mx.fillRect(256 + e.c.minX*k, 256 + e.c.minZ*k, (e.c.maxX - e.c.minX)*k, (e.c.maxZ - e.c.minZ)*k); }
  mx.strokeStyle = 'rgba(255,255,255,.15)'; mx.lineWidth = 2;
  for (let n = 0; n < 12; n++){ const a = n*Math.PI/6; mx.beginPath(); mx.moveTo(256 + Math.sin(a)*PLAZA_R*k, 256 - Math.cos(a)*PLAZA_R*k); mx.lineTo(256 + Math.sin(a)*MAP_R*k, 256 - Math.cos(a)*MAP_R*k); mx.stroke(); }
  mx.strokeStyle = '#f5d06f'; mx.beginPath(); mx.arc(256, 256, PLAZA_R*k, 0, Math.PI*2); mx.stroke();
  mx.fillStyle = 'rgba(255,255,255,.5)'; mx.font = '700 22px "Chakra Petch", sans-serif'; mx.textAlign = 'center'; mx.textBaseline = 'middle';
  for (let n = 1; n <= 12; n++){ const a = anguloSector(n); mx.fillText(n, 256 + Math.sin(a)*(MAP_R - 6)*k, 256 - Math.cos(a)*(MAP_R - 6)*k); }
  M.minimapaBase = mm; M.mmEscala = k;
  return M;
}

function construirCornucopia(){
  const g = new THREE.Group();
  const oro = new THREE.MeshStandardMaterial({ color:'#f5d06f', metalness:.85, roughness:.25, emissive:'#5a3a00', emissiveIntensity:.3 });
  const curva = new THREE.CatmullRomCurve3([new THREE.Vector3(0, .2, -2.6), new THREE.Vector3(0, 1.4, -1.8), new THREE.Vector3(0, 2.2, -.4), new THREE.Vector3(0, 1.7, .9), new THREE.Vector3(0, .9, 1.2)]);
  for (let i = 0; i <= 16; i++){
    const u = i/16, p = curva.getPoint(u), t = curva.getTangent(u);
    const r = .25 + (1 - u)*0 + u*1.05;
    const ring = new THREE.Mesh(new THREE.TorusGeometry(r, .09 + u*.05, 10, 28), oro);
    ring.position.copy(p); ring.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), t); ring.castShadow = true;
    g.add(ring);
  }
  const boca = new THREE.Mesh(new THREE.CircleGeometry(1.1, 28), new THREE.MeshBasicMaterial({ color:'#120a00' }));
  boca.position.copy(curva.getPoint(1)); boca.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), curva.getTangent(1)); boca.position.addScaledVector(curva.getTangent(1), -.05);
  g.add(boca);
  const luz = new THREE.PointLight('#f5d06f', 6, 14, 2); luz.position.set(0, 3, 0); g.add(luz);
  return g;
}
