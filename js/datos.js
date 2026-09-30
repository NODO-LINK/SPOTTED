// ============================================================
// SPOTTED · Catálogos compartidos (creador, juego, lobby)
// ============================================================

export const CLASES = [
  { id:'asalto',     nombre:'Asalto',     color:'#ff2d55', stats:{ VELOCIDAD:7,  VIDA:7,  'DAÑO':9, SIGILO:6 },
    arma:'Granada de clavos', armaDesc:'3 cargas. Explota al tocar el suelo y lanza clavos alrededor.',
    habilidad:'Embestida', habDesc:'Carga hacia adelante y derriba al primer enemigo que toque.' },
  { id:'explorador', nombre:'Explorador', color:'#35e0ff', stats:{ VELOCIDAD:10, VIDA:6,  'DAÑO':6, SIGILO:7 },
    arma:'Resortera de acero', armaDesc:'Tiros precisos y silenciosos. Munición propia que se recarga sola.',
    habilidad:'Doble gancho', habDesc:'Dispara dos ganchos y sube a cualquier azotea en un segundo.' },
  { id:'medico',     nombre:'Médico',     color:'#39ff9f', stats:{ VELOCIDAD:7,  VIDA:9,  'DAÑO':5, SIGILO:8 },
    arma:'Pistola de jeringas', armaDesc:'Daña a los enemigos y cura un poco a los aliados que toca.',
    habilidad:'Estación de curación', habDesc:'Planta una estación que cura al equipo cercano por 8 segundos.' },
  { id:'sigilo',     nombre:'Sigilo',     color:'#b06bff', stats:{ VELOCIDAD:8,  VIDA:5,  'DAÑO':7, SIGILO:9 },
    arma:'Cuchillos arrojadizos', armaDesc:'4 cuchillos. Letales por la espalda.',
    habilidad:'Invisible', habDesc:'Desaparece por 3 segundos. Disparar lo revela.' },
  { id:'hacker',     nombre:'Hacker',     color:'#ffd23f', stats:{ VELOCIDAD:9,  VIDA:6,  'DAÑO':6, SIGILO:8 },
    arma:'Pistola de píxeles', armaDesc:'Ráfagas rápidas de poco daño.',
    habilidad:'Hackeo total', habDesc:'Abre búnkeres al instante y apaga drones cercanos por 6 segundos.' },
  { id:'tanque',     nombre:'Tanque',     color:'#ff8a3d', stats:{ VELOCIDAD:5,  VIDA:10, 'DAÑO':8, SIGILO:6 },
    arma:'Martillo de chatarra', armaDesc:'Golpes lentos y brutales. Desmembra.',
    habilidad:'Muro de escudo', habDesc:'Levanta un muro de chatarra que bloquea balas por 6 segundos.' },
];

export const PIELES = ['#fde2d0','#f6cfb4','#eab896','#d9a37a','#c68a5e','#a86e46','#8a5636','#6b3f26','#4e2c1a','#3a2014'];
export const CUERPOS = [ { id:'delgado', nombre:'Delgado' }, { id:'medio', nombre:'Medio' }, { id:'robusto', nombre:'Robusto' } ];
export const ESTATURAS = [ { id:'bajo', nombre:'Bajito' }, { id:'medio', nombre:'Medio' }, { id:'alto', nombre:'Alto' } ];

export const OJOS = [
  { id:'redondos', nombre:'Redondos' }, { id:'almendrados', nombre:'Almendrados' }, { id:'relajados', nombre:'Relajados' },
  { id:'felinos', nombre:'Felinos' }, { id:'puntos', nombre:'Puntitos' },
];
export const CEJAS = [
  { id:'normal', nombre:'Normales' }, { id:'gruesas', nombre:'Gruesas' }, { id:'finas', nombre:'Finas' },
  { id:'arqueadas', nombre:'Arqueadas' }, { id:'cortada', nombre:'Con corte' },
];
export const NARICES = [
  { id:'boton', nombre:'Botón' }, { id:'punto', nombre:'Puntito' }, { id:'triangulo', nombre:'Perfil' },
  { id:'ancha', nombre:'Ancha' }, { id:'ninguna', nombre:'Sin nariz' },
];
export const BOCAS = [
  { id:'sonrisa', nombre:'Sonrisa' }, { id:'gatito', nombre:'Gatito' }, { id:'seria', nombre:'Seria' },
  { id:'colmillo', nombre:'Colmillo' }, { id:'grande', nombre:'Carcajada' },
];
export const DETALLES = [
  { id:'pecas', nombre:'Pecas' }, { id:'cicatriz', nombre:'Cicatriz' }, { id:'lunar', nombre:'Lunar' },
  { id:'curita', nombre:'Curita' }, { id:'ojeras', nombre:'Ojeras' },
];

export const PEINADOS = [
  { id:'calvo', nombre:'Calvo' }, { id:'rapado', nombre:'Rapado' }, { id:'corto', nombre:'Corto' },
  { id:'fade', nombre:'Fade con copete' }, { id:'desordenado', nombre:'Desordenado' }, { id:'afro', nombre:'Afro' },
  { id:'afropuffs', nombre:'Dos moños' }, { id:'trenzas', nombre:'Trenzas pegadas' }, { id:'rastas', nombre:'Rastas' },
  { id:'mohicano', nombre:'Mohicano' }, { id:'coleta', nombre:'Coleta' }, { id:'colaAlta', nombre:'Moño alto' },
  { id:'melena', nombre:'Melena larga' }, { id:'bob', nombre:'Bob con flequillo' }, { id:'rulos', nombre:'Rulos' },
];
export const BARBAS = [
  { id:'ninguna', nombre:'Sin barba' }, { id:'sombra', nombre:'Sombra' }, { id:'bigote', nombre:'Bigote' },
  { id:'chivera', nombre:'Chivera' }, { id:'candado', nombre:'Candado' }, { id:'completa', nombre:'Completa' },
];

export const ZONAS_TATUAJE = [
  { id:'brazoIzq', nombre:'Brazo izq.' }, { id:'brazoDer', nombre:'Brazo der.' }, { id:'cuello', nombre:'Cuello' },
  { id:'cara', nombre:'Cara' }, { id:'piernaIzq', nombre:'Pierna izq.' }, { id:'piernaDer', nombre:'Pierna der.' },
];
export const TATUAJES = [
  { id:null, nombre:'Nada' }, { id:'ojo', nombre:'Ojo' }, { id:'rayo', nombre:'Rayo' }, { id:'estrellas', nombre:'Estrellas' },
  { id:'rosa', nombre:'Rosa' }, { id:'codigo', nombre:'Código' }, { id:'spot', nombre:'SPOT' }, { id:'tribal', nombre:'Tribal' },
  { id:'corona', nombre:'Corona' }, { id:'lagrima', nombre:'Lágrima' },
];

export const PALETA_PELO = ['#15110f','#3b2618','#6b4226','#a0662f','#d9a441','#f2d680','#e8e2d8','#9aa0a6','#c0392b','#ff5fa2','#8b5cf6','#35e0ff','#39ff9f'];
export const PALETA_OJOS = ['#3b2314','#6b4226','#2e7d32','#1565c0','#35e0ff','#8b5cf6','#ff2d55','#ffd23f','#9aa0a6'];

export function personajeBase(n = 1){
  return {
    nombre: 'TRIBUTO ' + n, clase: 'asalto',
    piel: '#d9a37a', cuerpo: 'medio', estatura: 'medio',
    ojos: 'redondos', colorOjos: '#3b2314', cejas: 'normal', nariz: 'boton', boca: 'sonrisa', detalles: [],
    pelo: 'corto', colorPelo: '#15110f', barba: 'ninguna', colorBarba: '#15110f',
    tatuajes: { brazoIzq:null, brazoDer:null, cuello:null, cara:null, piernaIzq:null, piernaDer:null },
    tributo: 1 + Math.floor(Math.random()*24),
  };
}

export function personajeAleatorio(n = 1){
  const pick = a => a[Math.floor(Math.random()*a.length)];
  const p = personajeBase(n);
  p.clase = pick(CLASES).id; p.piel = pick(PIELES); p.cuerpo = pick(CUERPOS).id; p.estatura = pick(ESTATURAS).id;
  p.ojos = pick(OJOS).id; p.colorOjos = pick(PALETA_OJOS); p.cejas = pick(CEJAS).id; p.nariz = pick(NARICES).id; p.boca = pick(BOCAS).id;
  p.detalles = DETALLES.filter(() => Math.random() < .2).map(d => d.id);
  p.pelo = pick(PEINADOS).id; p.colorPelo = pick(PALETA_PELO); p.barba = Math.random() < .5 ? 'ninguna' : pick(BARBAS).id;
  p.colorBarba = Math.random() < .7 ? p.colorPelo : pick(PALETA_PELO);
  for (const z of ZONAS_TATUAJE) p.tatuajes[z.id] = Math.random() < .3 ? pick(TATUAJES.slice(1)).id : null;
  return p;
}
