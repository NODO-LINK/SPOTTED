// ============================================================
// SPOTTED · Sonidos sintetizados (sin archivos)
// ============================================================
let ctx = null, master = null;
export function iniciarAudio(){
  if (ctx) return;
  try { ctx = new (window.AudioContext || window.webkitAudioContext)(); master = ctx.createGain(); master.gain.value = .5; master.connect(ctx.destination); } catch(e){ ctx = null; }
}
function ruido(dur){
  const b = ctx.createBuffer(1, Math.floor(ctx.sampleRate*dur), ctx.sampleRate), d = b.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = (Math.random()*2 - 1) * (1 - i/d.length);
  const s = ctx.createBufferSource(); s.buffer = b; return s;
}
function env(g, a, peak, dur){ const t = ctx.currentTime; g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(peak, t + a); g.gain.exponentialRampToValueAtTime(.0001, t + dur); }

export function sonar(tipo, vol = 1){
  if (!ctx) return;
  try {
    const g = ctx.createGain(); g.connect(master);
    if (tipo === 'disparo' || tipo === 'escopeta' || tipo === 'franco'){
      const n = ruido(tipo === 'franco' ? .5 : tipo === 'escopeta' ? .35 : .15);
      const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = tipo === 'franco' ? 1400 : tipo === 'escopeta' ? 1100 : 2400;
      n.connect(f); f.connect(g); env(g, .002, (tipo === 'disparo' ? .5 : .9)*vol, tipo === 'franco' ? .5 : .3); n.start();
    } else if (tipo === 'golpe'){
      const o = ctx.createOscillator(); o.type = 'square'; o.frequency.setValueAtTime(180, ctx.currentTime); o.frequency.exponentialRampToValueAtTime(60, ctx.currentTime + .12);
      o.connect(g); env(g, .002, .3*vol, .15); o.start(); o.stop(ctx.currentTime + .2);
    } else if (tipo === 'hit'){
      const o = ctx.createOscillator(); o.type = 'triangle'; o.frequency.value = 1300; o.connect(g); env(g, .001, .25*vol, .08); o.start(); o.stop(ctx.currentTime + .1);
    } else if (tipo === 'canon'){
      const n = ruido(1.6); const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 180;
      n.connect(f); f.connect(g); env(g, .005, 1.4*vol, 1.6); n.start();
      const o = ctx.createOscillator(); o.frequency.setValueAtTime(70, ctx.currentTime); o.frequency.exponentialRampToValueAtTime(30, ctx.currentTime + 1);
      const g2 = ctx.createGain(); g2.connect(master); o.connect(g2); env(g2, .005, .8*vol, 1.2); o.start(); o.stop(ctx.currentTime + 1.3);
    } else if (tipo === 'alerta'){
      for (let i = 0; i < 3; i++){ const o = ctx.createOscillator(), gg = ctx.createGain(); o.type = 'sawtooth'; o.frequency.value = 520; o.connect(gg); gg.connect(master);
        const t = ctx.currentTime + i*.28; gg.gain.setValueAtTime(0, t); gg.gain.linearRampToValueAtTime(.12*vol, t + .02); gg.gain.linearRampToValueAtTime(0, t + .2); o.start(t); o.stop(t + .22); }
    } else if (tipo === 'recoger'){
      const o = ctx.createOscillator(); o.type = 'sine'; o.frequency.setValueAtTime(600, ctx.currentTime); o.frequency.exponentialRampToValueAtTime(1200, ctx.currentTime + .1);
      o.connect(g); env(g, .005, .2*vol, .15); o.start(); o.stop(ctx.currentTime + .16);
    } else if (tipo === 'impacto'){
      const n = ruido(.9); const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 300; n.connect(f); f.connect(g); env(g, .005, 1.2*vol, .9); n.start();
    } else if (tipo === 'recarga'){
      const n = ruido(.08); const f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 2500; n.connect(f); f.connect(g); env(g, .001, .4*vol, .08); n.start();
    }
  } catch(e){}
}
