// ============================================================
// SPOTTED · Creador de personajes (3 ranuras por jugador)
// En la Fase 2 esto se guarda en la cuenta (Firebase). Por ahora: este celular.
// ============================================================
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { crearPersonaje } from './personaje.js';
import { crearRenderer, luces, ciudadVitrina } from './escena.js';
import * as D from './datos.js';

const $ = s => document.querySelector(s);
const store = {
  get(k, d){ try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch(e){ return d; } },
  set(k, v){ try { localStorage.setItem(k, JSON.stringify(v)); } catch(e){} },
};
function toast(m){ const t = $('#toast'); t.textContent = m; t.classList.add('show'); clearTimeout(toast._t); toast._t = setTimeout(() => t.classList.remove('show'), 2200); }

// ---------- estado ----------
let slots = store.get('spotted_personajes', [null, null, null]);
let slot = store.get('spotted_slot', 0);
let cfg = slots[slot] ? structuredClone(slots[slot]) : D.personajeBase(slot + 1);
let anim = 'idle', exprIdx = 0, tab = 'clase', zona = 'brazoIzq';
const EXPRS = [['normal','😐'],['feliz','😄'],['enojado','😠'],['sorpresa','😮'],['triste','😢'],['dolor','😣']];

// ---------- escena ----------
const canvas = $('#c');
const renderer = crearRenderer(canvas);
const scene = new THREE.Scene();
luces(scene);
const city = ciudadVitrina(scene);
const camera = new THREE.PerspectiveCamera(30, 1, .1, 200);
camera.position.set(.8, 1.35, 8.2);
const controls = new OrbitControls(camera, canvas);
controls.target.set(0, 1.05, 0); controls.enableDamping = true; controls.enablePan = false;
controls.minDistance = 1.6; controls.maxDistance = 11; controls.minPolarAngle = .3; controls.maxPolarAngle = 1.65;

let P = null;
function reconstruir(){
  const t = P ? P.t : 0, rotY = P ? P.root.rotation.y : 0;
  if (P){ scene.remove(P.root); P.dispose(); }
  P = crearPersonaje(cfg, D.CLASES);
  P.t = t; P.root.rotation.y = rotY;
  scene.add(P.root);
}

function resize(){
  const w = innerWidth, h = innerHeight;
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  const portrait = h > w;
  camera.fov = portrait ? 34 : 28;
  // subimos al personaje por encima del panel
  if (portrait) camera.setViewOffset(w, h, 0, h * .12, w, h); else camera.clearViewOffset();
  camera.updateProjectionMatrix();
}
addEventListener('resize', resize); resize();

// ---------- UI ----------
const TABS = [['clase','CLASE'],['cuerpo','CUERPO'],['cara','CARA'],['pelo','PELO'],['barba','BARBA'],['tatuajes','TATUAJES']];
function renderSlots(){
  $('#slots').innerHTML = slots.map((s, i) => `<button data-i="${i}" class="${i === slot ? 'act' : ''}">${s ? s.nombre.slice(0, 10) : 'VACÍO'}<br><span style="opacity:.6">PERSONAJE ${i + 1}</span></button>`).join('');
}
function renderTabs(){ $('#tabs').innerHTML = TABS.map(([id, n]) => `<button data-t="${id}" class="${id === tab ? 'act' : ''}">${n}</button>`).join(''); }
const chips = (list, val, key, multi = false) => `<div class="grid">${list.map(o => {
  const on = multi ? val.includes(o.id) : val === o.id;
  return `<button class="chip ${on ? 'act' : ''}" data-k="${key}" data-v="${o.id === null ? '' : o.id}" ${multi ? 'data-m="1"' : ''}>${o.nombre}</button>`; }).join('')}</div>`;
const colores = (pal, val, key) => `<div class="grid">${pal.map(c => `<button class="sw ${c.toLowerCase() === String(val).toLowerCase() ? 'act' : ''}" style="background:${c}" data-k="${key}" data-v="${c}"></button>`).join('')}
  <label class="picker" title="Color libre">🎨<input type="color" value="${val}" data-k="${key}"></label></div>`;
const sec = t => `<div class="sec">${t}</div>`;

function renderBody(){
  let h = '';
  if (tab === 'clase'){
    h += sec('CLASE · DEFINE TUS ESTADÍSTICAS') + `<div class="clases">${D.CLASES.map(c => `
      <button class="clase ${cfg.clase === c.id ? 'act' : ''}" style="--cc:${c.color}" data-k="clase" data-v="${c.id}">
        <b>${c.nombre.toUpperCase()}</b>
        <div class="st">${Object.entries(c.stats).map(([k, v]) => `<span>${k}</span><i style="width:${v*10}%"></i>`).join('')}</div>
        <div class="ab"><span>Arma:</span> ${c.arma}<br><span>Habilidad:</span> ${c.habilidad}</div>
      </button>`).join('')}</div>`;
    const c = D.CLASES.find(x => x.id === cfg.clase);
    h += `<div class="note">${c.arma}: ${c.armaDesc}<br>${c.habilidad}: ${c.habDesc}<br>El brazalete de tu brazo izquierdo muestra tu clase.</div>`;
  }
  if (tab === 'cuerpo'){
    h += sec('TONO DE PIEL') + colores(D.PIELES, cfg.piel, 'piel');
    h += sec('TIPO DE CUERPO') + chips(D.CUERPOS, cfg.cuerpo, 'cuerpo');
    h += sec('ESTATURA') + chips(D.ESTATURAS, cfg.estatura, 'estatura');
    h += `<div class="note">La estatura no cambia qué tan fácil es darte en la partida.</div>`;
  }
  if (tab === 'cara'){
    h += sec('OJOS') + chips(D.OJOS, cfg.ojos, 'ojos');
    h += sec('COLOR DE OJOS') + colores(D.PALETA_OJOS, cfg.colorOjos, 'colorOjos');
    h += sec('CEJAS') + chips(D.CEJAS, cfg.cejas, 'cejas');
    h += sec('NARIZ') + chips(D.NARICES, cfg.nariz, 'nariz');
    h += sec('BOCA') + chips(D.BOCAS, cfg.boca, 'boca');
    h += sec('DETALLES') + chips(D.DETALLES, cfg.detalles, 'detalles', true);
  }
  if (tab === 'pelo'){
    h += sec('PEINADO · 15') + chips(D.PEINADOS, cfg.pelo, 'pelo');
    h += sec('COLOR DEL PELO') + colores(D.PALETA_PELO, cfg.colorPelo, 'colorPelo');
  }
  if (tab === 'barba'){
    h += sec('ESTILO') + chips(D.BARBAS, cfg.barba, 'barba');
    h += sec('COLOR DE LA BARBA') + colores(D.PALETA_PELO, cfg.colorBarba, 'colorBarba');
    h += `<div class="grid" style="margin-top:8px"><button class="chip" data-k="igualPelo" data-v="1">Igual al pelo</button></div>`;
  }
  if (tab === 'tatuajes'){
    h += sec('ZONA') + `<div class="grid">${D.ZONAS_TATUAJE.map(z => `<button class="chip ${zona === z.id ? 'act' : ''}" data-k="zona" data-v="${z.id}">${z.nombre}<small>${cfg.tatuajes[z.id] ? D.TATUAJES.find(t => t.id === cfg.tatuajes[z.id]).nombre : '—'}</small></button>`).join('')}</div>`;
    h += sec('DISEÑO') + chips(D.TATUAJES, cfg.tatuajes[zona], 'tatuaje');
    h += `<div class="note">Brazos: en el antebrazo. Piernas: en la pantorrilla, debajo de la bermuda. Cara: en la mejilla.</div>`;
  }
  $('#pbody').innerHTML = h;
}

function cambiar(k, v, fromPicker = false){
  let rebuild = true;
  if (k === 'zona'){ zona = v; rebuild = false; }
  else if (k === 'tatuaje') cfg.tatuajes[zona] = v || null;
  else if (k === 'detalles'){ const i = cfg.detalles.indexOf(v); i >= 0 ? cfg.detalles.splice(i, 1) : cfg.detalles.push(v); }
  else if (k === 'igualPelo') cfg.colorBarba = cfg.colorPelo;
  else cfg[k] = v;
  if (rebuild) reconstruir();
  if (!fromPicker) renderBody();
}

$('#pbody').addEventListener('click', e => {
  const b = e.target.closest('[data-k]'); if (!b || b.tagName === 'INPUT') return;
  cambiar(b.dataset.k, b.dataset.v);
});
$('#pbody').addEventListener('input', e => {
  const i = e.target.closest('input[type=color]'); if (!i) return;
  cambiar(i.dataset.k, i.value, true);
});
$('#pbody').addEventListener('change', e => { if (e.target.matches('input[type=color]')) renderBody(); });
$('#tabs').addEventListener('click', e => { const b = e.target.closest('button'); if (!b) return; tab = b.dataset.t; renderTabs(); renderBody(); $('#pbody').scrollTop = 0; });
$('#slots').addEventListener('click', e => {
  const b = e.target.closest('button'); if (!b) return;
  slot = +b.dataset.i; store.set('spotted_slot', slot);
  cfg = slots[slot] ? structuredClone(slots[slot]) : D.personajeBase(slot + 1);
  $('#nombre').value = cfg.nombre; reconstruir(); renderSlots(); renderBody();
});
$('#nombre').addEventListener('input', e => { cfg.nombre = e.target.value.toUpperCase().replace(/[^A-Z0-9ÁÉÍÓÚÑ _.\-]/g, '').slice(0, 16); });
$('#rnd').onclick = () => { const n = cfg.nombre, t = cfg.tributo; cfg = D.personajeAleatorio(slot + 1); cfg.nombre = n; cfg.tributo = t; reconstruir(); renderBody(); };
$('#save').onclick = () => {
  if ((cfg.nombre || '').trim().length < 2){ toast('PONLE NOMBRE A TU TRIBUTO'); $('#nombre').focus(); return; }
  slots[slot] = structuredClone(cfg); store.set('spotted_personajes', slots); renderSlots();
  toast(`TRIBUTO ${String(cfg.tributo).padStart(2, '0')} · ${cfg.nombre} GUARDADO`);
};
document.querySelectorAll('.preview [data-a]').forEach(b => b.onclick = () => {
  anim = b.dataset.a; document.querySelectorAll('.preview [data-a]').forEach(x => x.classList.toggle('act', x === b));
});
$('#expr').onclick = () => { exprIdx = (exprIdx + 1) % EXPRS.length; $('#expr').textContent = EXPRS[exprIdx][1]; };

// ---------- arranque ----------
$('#nombre').value = cfg.nombre;
reconstruir(); renderSlots(); renderTabs(); renderBody();
const clock = new THREE.Clock();
let walkA = 0;
(function loop(){
  const dt = Math.min(clock.getDelta(), .05);
  // al caminar/correr da vueltas por la plataforma
  if (anim === 'walk' || anim === 'run'){
    walkA += dt * (anim === 'run' ? .9 : .45);
    const r = .45;
    P.root.position.set(Math.cos(walkA)*r, 0, Math.sin(walkA)*r);
    P.root.rotation.y = Math.atan2(-Math.sin(walkA), Math.cos(walkA));
  } else {
    P.root.position.multiplyScalar(1 - Math.min(1, dt*6));
    let d = (0 - P.root.rotation.y) % (Math.PI*2); if (d > Math.PI) d -= Math.PI*2; if (d < -Math.PI) d += Math.PI*2;
    P.root.rotation.y += d * Math.min(1, dt*5);
  }
  P.update(dt, anim, EXPRS[exprIdx][0]);
  city.eye.material.opacity = .75 + Math.sin(clock.elapsedTime*1.7)*.2;
  controls.update();
  renderer.render(scene, camera);
  requestAnimationFrame(loop);
})();
const ld = $('#load'); ld.style.opacity = 0; setTimeout(() => ld.remove(), 500);
window.__dbg = { get cfg(){ return cfg; }, set(k, v){ cambiar(k, v); }, setCfg(c){ cfg = c; reconstruir(); renderBody(); }, get P(){ return P; }, anim(a){ anim = a; }, expr(i){ exprIdx = i; } };
