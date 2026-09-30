// ============================================================
// SPOTTED · Escena de vitrina (ciudad neón de fondo)
// ============================================================
import * as THREE from 'three';

export function canvasTex(w, h){
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
  return { c, ctx: c.getContext('2d'), t };
}

export function crearRenderer(canvas){
  const renderer = new THREE.WebGLRenderer({ canvas, antialias:true, powerPreference:'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.1;
  return renderer;
}

export function luces(scene){
  scene.add(new THREE.HemisphereLight('#cfc6ff', '#1a1030', 1.0));
  const key = new THREE.DirectionalLight('#fff4ec', 2.3);
  key.position.set(2.5, 6, 4); key.castShadow = true;
  key.shadow.mapSize.set(1024, 1024);
  Object.assign(key.shadow.camera, { left:-3, right:3, top:4, bottom:-2 });
  key.shadow.radius = 5; key.shadow.bias = -0.0005;
  scene.add(key);
  const r1 = new THREE.DirectionalLight('#35e0ff', 2.0); r1.position.set(-4, 3, -3); scene.add(r1);
  const r2 = new THREE.DirectionalLight('#ff4f7a', 1.8); r2.position.set(4, 2.5, -3.5); scene.add(r2);
  const f = new THREE.PointLight('#8b5cf6', 5, 8, 2); f.position.set(0, .8, 2.4); scene.add(f);
  return key;
}

export function ciudadVitrina(scene){
  scene.background = new THREE.Color('#0b0714');
  scene.fog = new THREE.FogExp2('#0b0714', 0.04);
  const g = canvasTex(512, 512);
  g.ctx.fillStyle = '#0e0a18'; g.ctx.fillRect(0,0,512,512);
  g.ctx.strokeStyle = 'rgba(139,92,246,.35)'; g.ctx.lineWidth = 2;
  for (let i = 0; i <= 512; i += 64){ g.ctx.beginPath(); g.ctx.moveTo(i,0); g.ctx.lineTo(i,512); g.ctx.stroke(); g.ctx.beginPath(); g.ctx.moveTo(0,i); g.ctx.lineTo(512,i); g.ctx.stroke(); }
  g.t.wrapS = g.t.wrapT = THREE.RepeatWrapping; g.t.repeat.set(24, 24);
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(120, 120), new THREE.MeshStandardMaterial({ map:g.t, roughness:.35, metalness:.4 }));
  ground.rotation.x = -Math.PI/2; ground.receiveShadow = true; scene.add(ground);
  const plat = new THREE.Mesh(new THREE.CylinderGeometry(1.6, 1.7, .1, 64), new THREE.MeshStandardMaterial({ color:'#171127', roughness:.3, metalness:.5 }));
  plat.position.y = -.05; plat.receiveShadow = true; scene.add(plat);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(1.62, .02, 8, 96), new THREE.MeshBasicMaterial({ color:'#ff2d55' }));
  ring.rotation.x = Math.PI/2; ring.position.y = .005; scene.add(ring);

  const w = canvasTex(128, 256);
  w.ctx.fillStyle = '#120d1f'; w.ctx.fillRect(0,0,128,256);
  const cols = ['#ff2d55','#35e0ff','#8b5cf6','#ffd23f','#ff5fa2'];
  for (let y = 8; y < 256; y += 16) for (let x = 8; x < 128; x += 16)
    if (Math.random() < .45){ w.ctx.fillStyle = cols[Math.floor(Math.random()*cols.length)]; w.ctx.globalAlpha = .35 + Math.random()*.6; w.ctx.fillRect(x, y, 8, 9); }
  w.ctx.globalAlpha = 1; w.t.wrapS = w.t.wrapT = THREE.RepeatWrapping;
  for (let i = 0; i < 36; i++){
    const a = (i/36)*Math.PI*2 + Math.random()*.1, d = 10 + Math.random()*12, h = 4 + Math.random()*14, bw = 1.5 + Math.random()*2.5;
    const tex = w.t.clone(); tex.needsUpdate = true; tex.repeat.set(bw/2, h/4);
    const b = new THREE.Mesh(new THREE.BoxGeometry(bw, h, bw), new THREE.MeshStandardMaterial({ color:'#130e20', emissive:'#ffffff', emissiveMap:tex, emissiveIntensity:.9, roughness:.8 }));
    b.position.set(Math.cos(a)*d, h/2, Math.sin(a)*d); b.rotation.y = -a; scene.add(b);
  }
  // ojo del Sistema
  const e = canvasTex(512, 256), x = e.ctx;
  x.shadowColor = '#ff2d55'; x.shadowBlur = 30; x.strokeStyle = '#ff2d55'; x.lineWidth = 16;
  x.beginPath(); x.moveTo(40,150); x.quadraticCurveTo(256,10,472,150); x.quadraticCurveTo(256,290,40,150); x.stroke();
  x.fillStyle = '#ff2d55'; x.beginPath(); x.arc(256,150,52,0,Math.PI*2); x.fill();
  x.fillStyle = '#0b0714'; x.beginPath(); x.arc(272,136,16,0,Math.PI*2); x.fill();
  const eye = new THREE.Mesh(new THREE.PlaneGeometry(9, 4.5), new THREE.MeshBasicMaterial({ map:e.t, transparent:true, fog:false, depthWrite:false }));
  eye.position.set(0, 9, -24); scene.add(eye);
  return { eye };
}
