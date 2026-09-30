// ============================================================
// SPOTTED · Armas callejeras (Fase 1: 4 armas + 1 legendaria)
// Munición: CHATARRA universal. Rarezas: común, rara, épica, legendaria.
// ============================================================
import * as THREE from 'three';

export const RAREZAS = {
  comun:      { nombre:'Común',      color:'#b8b3c9', mult:1 },
  rara:       { nombre:'Rara',       color:'#35e0ff', mult:1.12 },
  epica:      { nombre:'Épica',      color:'#c084fc', mult:1.25 },
  legendaria: { nombre:'Legendaria', color:'#f5d06f', mult:1.4 },
};

export const ARMAS = {
  tuberia:   { nombre:'Tubería',   tipo:'Rifle',          slot:'principal',  dmg:17, cad:.14, cargador:25, recarga:1.8, disp:.012, alcance:70, perdigones:1, auto:true,  desmembra:false, zoom:1.25 },
  licuadora: { nombre:'Licuadora', tipo:'Subfusil',       slot:'principal',  dmg:11, cad:.075, cargador:35, recarga:1.6, disp:.03, alcance:40, perdigones:1, auto:true,  desmembra:false, zoom:1.15 },
  porton:    { nombre:'Portón',    tipo:'Escopeta',       slot:'principal',  dmg:8.5, cad:.85, cargador:5,  recarga:2.2, disp:.075, alcance:20, perdigones:8, auto:false, desmembra:true,  zoom:1.1 },
  antena:    { nombre:'Antena',    tipo:'Francotirador',  slot:'principal',  dmg:78, cad:1.3, cargador:4,  recarga:2.5, disp:.002, alcance:140, perdigones:1, auto:false, desmembra:true,  zoom:3.2 },
  clavadora: { nombre:'Clavadora', tipo:'Pistola',        slot:'secundaria', dmg:15, cad:.22, cargador:12, recarga:1.3, disp:.018, alcance:40, perdigones:1, auto:false, desmembra:false, zoom:1.15 },
  tormenta:  { nombre:'Tormenta',  tipo:'Legendaria',     slot:'principal',  dmg:14, cad:.05, cargador:100, recarga:3.2, disp:.035, alcance:55, perdigones:1, auto:true, desmembra:true, zoom:1.1, legendaria:true },
};
export const PUNOS = { nombre:'Puños', tipo:'Cuerpo a cuerpo', dmg:12, cad:.5, alcance:1.8, melee:true };

export function nuevaArma(id, rareza = 'comun'){
  const d = ARMAS[id];
  return { id, rareza: d.legendaria ? 'legendaria' : rareza, def: d, balas: d.cargador, cd: 0, recargando: 0 };
}
export function danoArma(a){ return a.def.dmg * RAREZAS[a.rareza].mult; }

// ------------------------------------------------------------
// MODELOS: tubos, cinta, chatarra. El cañón apunta hacia -Y del grupo
// (así queda alineado con el antebrazo al apuntar).
// ------------------------------------------------------------
const mats = {};
function mat(c, o = {}){ const k = c + JSON.stringify(o); return mats[k] || (mats[k] = new THREE.MeshStandardMaterial({ color:c, roughness:.5, metalness:.5, ...o })); }
const cinta = () => mat('#d8cfa4', { metalness:0, roughness:.9 });

export function modeloArma(id, rareza = 'comun'){
  const g = new THREE.Group();
  const acento = RAREZAS[rareza].color;
  const glow = mat(acento, { emissive: acento, emissiveIntensity: .6, metalness:.2 });
  const hierro = mat('#5b5f68'), oxido = mat('#8a4b2a', { metalness:.3, roughness:.8 }), madera = mat('#6b4a2b', { metalness:0, roughness:.85 }), negro = mat('#1e1e24');
  const add = (geo, m, p, r) => { const x = new THREE.Mesh(geo, m); x.position.set(...p); if (r) x.rotation.set(...r); x.castShadow = true; g.add(x); return x; };
  const tubo = (r, l, m, p) => add(new THREE.CylinderGeometry(r, r, l, 12), m, p);
  switch (id){
    case 'tuberia':
      tubo(.025, .62, hierro, [0, -.28, .03]);
      add(new THREE.BoxGeometry(.05, .2, .09), madera, [0, .08, .0]);
      add(new THREE.BoxGeometry(.045, .09, .05), negro, [0, -.02, -.06]);
      for (const y of [-.1, -.35]) tubo(.032, .04, cinta(), [0, y, .03]);
      tubo(.03, .03, glow, [0, -.6, .03]);
      break;
    case 'licuadora':
      add(new THREE.CylinderGeometry(.07, .06, .16, 14), mat('#d9dce2', { metalness:.2 }), [0, .02, .02]);
      tubo(.02, .3, hierro, [0, -.18, .04]);
      add(new THREE.BoxGeometry(.04, .1, .05), negro, [0, .06, -.06]);
      add(new THREE.BoxGeometry(.03, .14, .04), glow, [0, -.02, .1]);
      tubo(.026, .03, cinta(), [0, -.12, .04]);
      break;
    case 'porton':
      tubo(.034, .5, oxido, [-.022, -.22, .03]); tubo(.034, .5, oxido, [.022, -.22, .03]);
      add(new THREE.BoxGeometry(.06, .22, .1), madera, [0, .1, 0]);
      add(new THREE.BoxGeometry(.1, .04, .04), hierro, [0, -.05, .03]);   // bisagra
      add(new THREE.BoxGeometry(.1, .03, .04), glow, [0, -.44, .03]);
      break;
    case 'antena':
      tubo(.016, .85, hierro, [0, -.4, .03]);
      for (let i = 0; i < 5; i++) add(new THREE.BoxGeometry(.12 - i*.015, .006, .006), hierro, [0, -.72 + i*.05, .03]);
      add(new THREE.BoxGeometry(.05, .26, .08), madera, [0, .1, 0]);
      add(new THREE.CylinderGeometry(.03, .03, .16, 12), mat('#4fa36a', { transparent:true, opacity:.8, metalness:.1 }), [0, -.02, .09]);   // mira de botella
      tubo(.018, .025, glow, [0, -.84, .03]);
      break;
    case 'clavadora':
      add(new THREE.BoxGeometry(.05, .2, .09), mat('#e0a21a', { metalness:.1 }), [0, -.05, .02]);
      add(new THREE.BoxGeometry(.04, .06, .08), negro, [0, .06, -.02]);
      add(new THREE.BoxGeometry(.03, .04, .03), glow, [0, -.16, .04]);
      break;
    case 'tormenta':
      for (let i = 0; i < 6; i++){ const a = i*Math.PI/3; tubo(.014, .55, hierro, [Math.cos(a)*.035, -.28, .04 + Math.sin(a)*.035]); }
      add(new THREE.CylinderGeometry(.07, .07, .16, 16), mat('#2a2230'), [0, .02, .04]);
      add(new THREE.BoxGeometry(.1, .12, .12), mat('#f5d06f', { metalness:.9, roughness:.2 }), [0, .12, 0]);
      tubo(.05, .02, glow, [0, -.5, .04]);
      break;
  }
  g.userData.boca = new THREE.Object3D(); g.userData.boca.position.set(0, id === 'antena' ? -.86 : id === 'porton' ? -.48 : id === 'tormenta' ? -.56 : id === 'licuadora' ? -.34 : id === 'clavadora' ? -.18 : -.62, .03);
  g.add(g.userData.boca);
  return g;
}

// objetos del suelo
export const OBJETOS = {
  chatarra:   { nombre:'Chatarra',          color:'#b8b3c9', icono:'⚙' },
  inyPeq:     { nombre:'Inyección pequeña', color:'#39ff9f', icono:'💉', cura:25, t:1.5 },
  inyGrande:  { nombre:'Inyección grande',  color:'#39ff9f', icono:'💉', cura:60, t:3 },
  arepa:      { nombre:'Arepa',             color:'#f5d06f', icono:'🫓', hambre:45 },
  tequenos:   { nombre:'Tequeños',          color:'#f5d06f', icono:'🧀', hambre:25 },
  malta:      { nombre:'Malta',             color:'#8a4b2a', icono:'🍺', hambre:20, stamina:60 },
  pabellon:   { nombre:'Pabellón criollo',  color:'#f5d06f', icono:'🍛', hambre:100 },
  chaleco:    { nombre:'Chaleco',           color:'#35e0ff', icono:'🦺' },
  placa:      { nombre:'Placa de chatarra', color:'#35e0ff', icono:'▣', escudo:25 },
};
