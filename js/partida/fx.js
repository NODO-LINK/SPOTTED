// ============================================================
// SPOTTED · Efectos: balas, sangre, desmembramiento, cápsula, holograma, drones, perros
// ============================================================
import * as THREE from 'three';
import { canvasTex } from '../escena.js';

export function crearFX(scene){
  const F = { scene, lista: [], restos: [] };
  const trazoM = new THREE.LineBasicMaterial({ color:'#ffe9a8', transparent:true, opacity:.9 });
  const sangreM = new THREE.MeshBasicMaterial({ color:'#a3001b' });
  const sangreSueloM = new THREE.MeshBasicMaterial({ color:'#6d0012', transparent:true, opacity:.85, depthWrite:false });
  const chispaM = new THREE.MeshBasicMaterial({ color:'#ffd23f' });
  const gotaG = new THREE.SphereGeometry(.045, 6, 4), chispaG = new THREE.BoxGeometry(.04, .04, .04);

  F.trazo = (a, b) => {
    const g = new THREE.BufferGeometry().setFromPoints([a, b]);
    const l = new THREE.Line(g, trazoM.clone()); scene.add(l);
    F.lista.push({ o: l, t: .07, tick(dt, it){ l.material.opacity = it.t/.07; }, fin(){ g.dispose(); l.material.dispose(); } });
  };
  F.particulas = (pos, n, mat, geo, vel = 3, vida = .5, grav = 9) => {
    for (let i = 0; i < n; i++){
      const m = new THREE.Mesh(geo, mat); m.position.copy(pos); scene.add(m);
      const v = new THREE.Vector3((Math.random() - .5)*2, Math.random()*1.4, (Math.random() - .5)*2).normalize().multiplyScalar(vel*(.4 + Math.random()*.8));
      F.lista.push({ o: m, t: vida*(.6 + Math.random()*.6), tick(dt){ v.y -= grav*dt; m.position.addScaledVector(v, dt); if (m.position.y < .02){ m.position.y = .02; v.set(0,0,0); } } });
    }
  };
  F.chispas = pos => F.particulas(pos, 5, chispaM, chispaG, 3, .25, 6);
  F.sangre = (pos, n = 10, fuerza = 3) => {
    F.particulas(pos, n, sangreM, gotaG, fuerza, .7, 10);
    const charco = new THREE.Mesh(new THREE.CircleGeometry(.25 + Math.random()*.35, 16), sangreSueloM);
    charco.rotation.x = -Math.PI/2; charco.position.set(pos.x + (Math.random() - .5)*.4, .035 + Math.random()*.005, pos.z + (Math.random() - .5)*.4);
    scene.add(charco); F.restos.push(charco);
    if (F.restos.length > 120){ const r = F.restos.shift(); scene.remove(r); }
  };

  // parte desmembrada: se suelta del cuerpo y rebota
  F.soltarParte = (grupo, fuerza, suelo = 0) => {
    const wp = new THREE.Vector3(); grupo.getWorldPosition(wp);
    scene.attach(grupo);
    const v = fuerza.clone().add(new THREE.Vector3((Math.random() - .5)*2, 2.5 + Math.random()*2, (Math.random() - .5)*2));
    const w = new THREE.Vector3((Math.random() - .5)*12, (Math.random() - .5)*12, (Math.random() - .5)*12);
    const muñon = new THREE.Mesh(new THREE.SphereGeometry(.07, 8, 6), sangreM); grupo.add(muñon);
    let quieto = false, goteo = 0;
    F.lista.push({ o: null, t: 9999, tick(dt){
      if (quieto) return;
      v.y -= 12*dt; grupo.position.addScaledVector(v, dt);
      grupo.rotation.x += w.x*dt; grupo.rotation.y += w.y*dt; grupo.rotation.z += w.z*dt;
      goteo -= dt; if (goteo <= 0){ goteo = .06; F.particulas(grupo.position, 1, sangreM, gotaG, 1, .5, 10); }
      if (grupo.position.y < suelo + .12){ grupo.position.y = suelo + .12; v.y *= -.35; v.x *= .6; v.z *= .6; w.multiplyScalar(.5);
        if (Math.abs(v.y) < .6){ quieto = true; F.sangre(grupo.position, 3, 1); } }
    } });
    F.restos.push(grupo);
  };

  F.update = dt => {
    for (let i = F.lista.length - 1; i >= 0; i--){
      const it = F.lista[i]; it.t -= dt; it.tick && it.tick(dt, it);
      if (it.t <= 0){ if (it.o) scene.remove(it.o); it.fin && it.fin(); F.lista.splice(i, 1); }
    }
  };

  // ---------- cara en el cielo (cañonazo) ----------
  F.caraCielo = (P, nombre, pos) => {
    const t = canvasTex(512, 512), x = t.ctx;
    x.fillStyle = 'rgba(8,4,16,.75)'; x.beginPath(); x.arc(256, 230, 200, 0, Math.PI*2); x.fill();
    x.save(); x.beginPath(); x.arc(256, 230, 190, 0, Math.PI*2); x.clip();
    x.fillStyle = P.cfg.piel; x.fillRect(0, 0, 512, 512);
    x.drawImage(P.face.c, 0, 0, 512, 512, 36, 20, 440, 440);
    x.restore();
    // ojo de VIZZION tachando
    x.strokeStyle = '#ff2d55'; x.lineWidth = 16; x.shadowColor = '#ff2d55'; x.shadowBlur = 20;
    x.beginPath(); x.moveTo(100, 230); x.quadraticCurveTo(256, 120, 412, 230); x.quadraticCurveTo(256, 340, 100, 230); x.stroke();
    x.beginPath(); x.moveTo(90, 60); x.lineTo(422, 400); x.stroke();
    x.shadowBlur = 0; x.fillStyle = '#fff'; x.font = '900 46px "Chakra Petch", sans-serif'; x.textAlign = 'center'; x.fillText(nombre, 256, 490);
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: t.t, transparent:true, fog:false, depthWrite:false }));
    s.scale.set(16, 16, 1); s.position.set(pos.x, 34, pos.z); scene.add(s);
    F.lista.push({ o: s, t: 4.5, tick(dt, it){ s.material.opacity = Math.min(1, it.t/1.2); s.position.y += dt*.8; }, fin(){ t.t.dispose(); s.material.dispose(); } });
  };

  // ---------- holograma del anfitrión (Doberman) ----------
  F.holograma = (pos, texto, dur = 7) => {
    const g = new THREE.Group();
    const hm = new THREE.MeshBasicMaterial({ color:'#35e0ff', transparent:true, opacity:.55, blending:THREE.AdditiveBlending, depthWrite:false, fog:false });
    const rm = new THREE.MeshBasicMaterial({ color:'#ff2d55', transparent:true, opacity:.8, blending:THREE.AdditiveBlending, depthWrite:false, fog:false });
    const add = (geo, m, p, s, r) => { const o = new THREE.Mesh(geo, m); o.position.set(...p); if (s) o.scale.set(...s); if (r) o.rotation.set(...r); g.add(o); };
    add(new THREE.SphereGeometry(1, 24, 18), hm, [0, 0, 0], [2.2, 2.4, 2.2]);                       // cráneo
    add(new THREE.SphereGeometry(1, 20, 14), hm, [0, -.7, 2.1], [1.1, .9, 1.6]);                   // hocico
    add(new THREE.SphereGeometry(.35, 12, 10), hm, [0, -.3, 3.55]);                                 // nariz
    for (const s of [-1, 1]){
      add(new THREE.ConeGeometry(.75, 2.8, 12), hm, [s*1.3, 2.6, -.2], null, [0, 0, -s*.25]);      // orejas puntiagudas
      add(new THREE.SphereGeometry(.38, 12, 10), rm, [s*.85, .45, 1.85]);                          // ojos rojos
    }
    add(new THREE.TorusGeometry(2.3, .12, 8, 40), hm, [0, -2.6, 0], null, [Math.PI/2, 0, 0]);       // collar
    const t = canvasTex(1024, 256), x = t.ctx;
    x.font = '900 64px "Chakra Petch", sans-serif'; x.textAlign = 'center'; x.fillStyle = '#35e0ff'; x.shadowColor = '#35e0ff'; x.shadowBlur = 20;
    const lineas = texto.split('\n'); lineas.forEach((l, i) => x.fillText(l, 512, 90 + i*80));
    const cartel = new THREE.Sprite(new THREE.SpriteMaterial({ map:t.t, transparent:true, fog:false, depthWrite:false })); cartel.scale.set(20, 5, 1); cartel.position.set(0, -6, 0); g.add(cartel);
    g.position.set(pos.x, 28, pos.z); g.scale.setScalar(1.6); scene.add(g);
    F.lista.push({ o: g, t: dur, tick(dt, it){ g.rotation.y += dt*.4; const f = Math.random() < .08 ? .2 : 1; hm.opacity = .5*f*Math.min(1, it.t); rm.opacity = .8*Math.min(1, it.t); } });
    return g;
  };

  // ---------- cápsula tipo halo con el ojo rojo ----------
  F.capsula = () => {
    const g = new THREE.Group();
    const casco = new THREE.MeshStandardMaterial({ color:'#1c1826', metalness:.8, roughness:.3 });
    const cuerpo = new THREE.Mesh(new THREE.CapsuleGeometry(.75, 1.4, 8, 20), casco); cuerpo.castShadow = true; g.add(cuerpo);
    const ojoT = canvasTex(256, 128), x = ojoT.ctx;
    x.strokeStyle = '#ff2d55'; x.lineWidth = 12; x.shadowColor = '#ff2d55'; x.shadowBlur = 16;
    x.beginPath(); x.moveTo(20, 64); x.quadraticCurveTo(128, 0, 236, 64); x.quadraticCurveTo(128, 128, 20, 64); x.stroke();
    x.fillStyle = '#ff2d55'; x.beginPath(); x.arc(128, 64, 22, 0, Math.PI*2); x.fill();
    const ojo = new THREE.Mesh(new THREE.CylinderGeometry(.77, .77, .7, 24, 1, true, -.8, 1.6), new THREE.MeshBasicMaterial({ map:ojoT.t, transparent:true }));
    ojo.position.y = .3; g.add(ojo); g.userData.puerta = ojo;
    const fuego = new THREE.Mesh(new THREE.ConeGeometry(.6, 3, 16, 1, true), new THREE.MeshBasicMaterial({ color:'#ff6a00', transparent:true, opacity:.7, blending:THREE.AdditiveBlending, depthWrite:false }));
    fuego.position.y = 2.6; g.add(fuego); g.userData.fuego = fuego;
    const luz = new THREE.PointLight('#ff2d55', 8, 12, 2); luz.position.y = 1; g.add(luz);
    return g;
  };
  F.crater = (pos) => {
    const t = canvasTex(256, 256), x = t.ctx;
    const gr = x.createRadialGradient(128, 128, 20, 128, 128, 128); gr.addColorStop(0, 'rgba(0,0,0,.9)'); gr.addColorStop(.7, 'rgba(30,10,20,.7)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
    x.fillStyle = gr; x.fillRect(0, 0, 256, 256);
    x.strokeStyle = 'rgba(255,45,85,.9)'; x.lineWidth = 6; x.beginPath(); x.moveTo(60, 128); x.quadraticCurveTo(128, 80, 196, 128); x.quadraticCurveTo(128, 176, 60, 128); x.stroke();
    x.fillStyle = '#ff2d55'; x.beginPath(); x.arc(128, 128, 14, 0, Math.PI*2); x.fill();
    const m = new THREE.Mesh(new THREE.PlaneGeometry(4.5, 4.5), new THREE.MeshBasicMaterial({ map: t.t, transparent:true, depthWrite:false }));
    m.rotation.x = -Math.PI/2; m.position.set(pos.x, pos.y + .04, pos.z); scene.add(m); F.restos.push(m);
    F.particulas(new THREE.Vector3(pos.x, pos.y + .2, pos.z), 18, new THREE.MeshBasicMaterial({ color:'#3a3440' }), new THREE.BoxGeometry(.12, .12, .12), 6, 1.2, 12);
  };

  // ---------- dron de VIZZION / dron cazador ----------
  F.dron = (grande = true) => {
    const g = new THREE.Group(), s = grande ? 1 : .45;
    const m = new THREE.MeshStandardMaterial({ color:'#1c1826', metalness:.7, roughness:.35 });
    g.add(new THREE.Mesh(new THREE.BoxGeometry(2.2*s, .5*s, 1.4*s), m));
    for (const [x, z] of [[-1.3, -.9], [1.3, -.9], [-1.3, .9], [1.3, .9]]){
      const r = new THREE.Mesh(new THREE.TorusGeometry(.55*s, .06*s, 6, 20), m); r.rotation.x = Math.PI/2; r.position.set(x*s, .1*s, z*s); g.add(r);
      const h = new THREE.Mesh(new THREE.BoxGeometry(1*s, .02, .1*s), new THREE.MeshBasicMaterial({ color:'#aaa' })); h.position.set(x*s, .15*s, z*s); h.userData.helice = true; g.add(h);
    }
    const ojo = new THREE.Mesh(new THREE.SphereGeometry(.22*s, 12, 10), new THREE.MeshBasicMaterial({ color:'#ff2d55' })); ojo.position.set(0, -.2*s, .7*s); g.add(ojo);
    const luz = new THREE.PointLight('#ff2d55', grande ? 4 : 2, grande ? 10 : 6, 2); luz.position.y = -.5*s; g.add(luz);
    return g;
  };
  F.giraHelices = (g, dt) => g.children.forEach(c => { if (c.userData.helice) c.rotation.y += dt*40; });

  // ---------- perro robot ----------
  F.perro = () => {
    const g = new THREE.Group();
    const m = new THREE.MeshStandardMaterial({ color:'#3a3440', metalness:.8, roughness:.3 });
    const cuerpo = new THREE.Mesh(new THREE.BoxGeometry(.5, .35, 1), m); cuerpo.position.y = .6; g.add(cuerpo);
    const cabeza = new THREE.Mesh(new THREE.BoxGeometry(.35, .3, .45), m); cabeza.position.set(0, .8, .6); g.add(cabeza);
    const ojo = new THREE.Mesh(new THREE.BoxGeometry(.3, .06, .02), new THREE.MeshBasicMaterial({ color:'#ff8a3d' })); ojo.position.set(0, .84, .83); g.add(ojo);
    g.userData.patas = [];
    for (const [x, z] of [[-.2, -.35], [.2, -.35], [-.2, .35], [.2, .35]]){
      const p = new THREE.Mesh(new THREE.BoxGeometry(.1, .5, .1), m); p.geometry.translate(0, -.25, 0); p.position.set(x, .5, z); g.add(p); g.userData.patas.push(p);
    }
    g.traverse(o => { if (o.isMesh) o.castShadow = true; });
    return g;
  };

  // ---------- caja del airdrop ----------
  F.caja = () => {
    const g = new THREE.Group();
    const m = new THREE.MeshStandardMaterial({ color:'#1c1826', metalness:.6, roughness:.4 });
    const c = new THREE.Mesh(new THREE.BoxGeometry(1.4, 1, 1.4), m); c.position.y = .5; c.castShadow = true; g.add(c);
    const f = new THREE.Mesh(new THREE.BoxGeometry(1.45, .12, 1.45), new THREE.MeshBasicMaterial({ color:'#ff2d55' })); f.position.y = .75; g.add(f);
    const haz = new THREE.Mesh(new THREE.CylinderGeometry(.3, .3, 60, 12, 1, true), new THREE.MeshBasicMaterial({ color:'#ff2d55', transparent:true, opacity:.25, blending:THREE.AdditiveBlending, depthWrite:false }));
    haz.position.y = 30; g.add(haz); g.userData.haz = haz;
    const para = new THREE.Mesh(new THREE.SphereGeometry(1.8, 16, 8, 0, Math.PI*2, 0, Math.PI/2), new THREE.MeshStandardMaterial({ color:'#ff2d55', side:THREE.DoubleSide }));
    para.position.y = 4; g.add(para); g.userData.para = para;
    return g;
  };

  // ---------- lluvia (partículas alrededor de la cámara) ----------
  const N = 700, pos = new Float32Array(N*3);
  for (let i = 0; i < N; i++){ pos[i*3] = (Math.random() - .5)*30; pos[i*3 + 1] = Math.random()*18; pos[i*3 + 2] = (Math.random() - .5)*30; }
  const lg = new THREE.BufferGeometry(); lg.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  F.lluvia = new THREE.Points(lg, new THREE.PointsMaterial({ color:'#39ff9f', size:.09, transparent:true, opacity:.8 }));
  F.lluvia.visible = false; scene.add(F.lluvia);
  F.updateLluvia = (dt, centro) => {
    const p = lg.attributes.position.array;
    for (let i = 0; i < N; i++){ p[i*3 + 1] -= 22*dt; if (p[i*3 + 1] < 0) p[i*3 + 1] += 18; }
    lg.attributes.position.needsUpdate = true; F.lluvia.position.set(centro.x, 0, centro.z);
  };
  return F;
}
