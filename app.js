import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { createSoundscape } from './sound.js';

const container = document.querySelector('#scene');
const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.8));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.06;
container.appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0d1c27);
scene.fog = new THREE.FogExp2(0x0d1c27, 0.024);

const initialAspect = window.innerWidth / window.innerHeight;
const camera = new THREE.PerspectiveCamera(initialAspect < .72 ? 47 : 34, initialAspect, 0.1, 120);
camera.position.set(initialAspect < .72 ? 28 : 18, initialAspect < .72 ? 20 : 13, initialAspect < .72 ? 36 : 23);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.055;
controls.target.set(0, 4.2, 0.4);
controls.minDistance = 10;
controls.maxDistance = 52;
controls.minPolarAngle = Math.PI * 0.13;
controls.maxPolarAngle = Math.PI * 0.48;
controls.autoRotate = true;
controls.autoRotateSpeed = 0.34;

const world = new THREE.Group();
world.rotation.y = -0.18;
scene.add(world);

const maxAniso = renderer.capabilities.getMaxAnisotropy();
const signMaterials = [];
const interiorGlowMaterials = [];
const roomLights = [];

function box(name, size, position, material, parent = world, cast = true, receive = true) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(...size), material);
  mesh.name = name;
  mesh.position.set(...position);
  mesh.castShadow = cast;
  mesh.receiveShadow = receive;
  parent.add(mesh);
  return mesh;
}

function cylinder(name, radiusTop, radiusBottom, height, position, material, parent = world, segments = 16) {
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(radiusTop, radiusBottom, height, segments), material);
  mesh.name = name;
  mesh.position.set(...position);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  parent.add(mesh);
  return mesh;
}

function canvasTexture(width, height, draw) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  draw(ctx, width, height);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = maxAniso;
  return texture;
}

function makeBrickTexture() {
  const tex = canvasTexture(768, 512, (ctx, w, h) => {
    ctx.fillStyle = '#332f2e'; ctx.fillRect(0, 0, w, h);
    const bh = 44, bw = 116;
    for (let row = 0; row <= h / bh; row++) {
      const offset = row % 2 ? -bw / 2 : 0;
      for (let col = -1; col < w / bw + 1; col++) {
        const x = col * bw + offset + 3, y = row * bh + 3;
        const shade = 61 + ((row * 17 + col * 23) % 32);
        ctx.fillStyle = `rgb(${shade + 38}, ${shade}, ${shade - 7})`;
        ctx.fillRect(x, y, bw - 6, bh - 6);
        ctx.fillStyle = 'rgba(255,201,143,.10)'; ctx.fillRect(x + 2, y + 2, bw - 10, 3);
        ctx.fillStyle = 'rgba(24,13,10,.16)'; ctx.fillRect(x + 3, y + bh - 11, bw - 12, 3);
        for (let i = 0; i < 22; i++) {
          const grain = 60 + Math.random() * 75;
          ctx.fillStyle = `rgba(${grain + 45},${grain + 8},${grain},.14)`;
          ctx.fillRect(x + Math.random() * (bw - 9), y + Math.random() * (bh - 8), 1 + Math.random() * 8, 1 + Math.random() * 3);
        }
      }
    }
    for (let i = 0; i < 100; i++) {
      ctx.fillStyle = `rgba(19,28,21,${Math.random() * .08})`;
      ctx.fillRect(Math.random() * w, Math.random() * h, 4 + Math.random() * 30, 2 + Math.random() * 16);
    }
    const grad = ctx.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0, 'rgba(20,20,20,.05)'); grad.addColorStop(1, 'rgba(10,5,5,.28)');
    ctx.fillStyle = grad; ctx.fillRect(0, 0, w, h);
  });
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(2.3, 1.45);
  return tex;
}

function makeConcreteTexture() {
  return canvasTexture(512, 512, (ctx, w, h) => {
    ctx.fillStyle = '#727678'; ctx.fillRect(0, 0, w, h);
    for (let i = 0; i < 9000; i++) {
      const v = 80 + Math.random() * 70;
      ctx.fillStyle = `rgba(${v},${v + 3},${v + 4},${Math.random() * .13})`;
      ctx.fillRect(Math.random() * w, Math.random() * h, Math.random() * 3 + 1, Math.random() * 3 + 1);
    }
  });
}

function makeOldPlasterTexture() {
  return canvasTexture(768, 768, (ctx, w, h) => {
    ctx.fillStyle = '#a58a6c'; ctx.fillRect(0, 0, w, h);
    for (let i = 0; i < 21000; i++) {
      const warm = Math.random() > .5;
      ctx.fillStyle = warm ? `rgba(83,56,40,${Math.random() * .09})` : `rgba(244,215,170,${Math.random() * .09})`;
      ctx.fillRect(Math.random() * w, Math.random() * h, 1 + Math.random() * 6, 1 + Math.random() * 5);
    }
    for (let i = 0; i < 30; i++) {
      const x = Math.random() * w, y = Math.random() * h;
      ctx.fillStyle = `rgba(65,56,47,${.03 + Math.random() * .06})`;
      ctx.beginPath(); ctx.ellipse(x, y, 8 + Math.random() * 58, 2 + Math.random() * 13, Math.random(), 0, Math.PI * 2); ctx.fill();
    }
    ctx.strokeStyle = 'rgba(58,48,42,.22)'; ctx.lineWidth = 2;
    for (let i = 0; i < 13; i++) {
      let x = Math.random() * w, y = Math.random() * h;
      ctx.beginPath(); ctx.moveTo(x, y);
      for (let j = 0; j < 5; j++) { x += (Math.random() - .5) * 22; y += 8 + Math.random() * 22; ctx.lineTo(x, y); }
      ctx.stroke();
    }
    const damp = ctx.createLinearGradient(0, 0, 0, h);
    damp.addColorStop(0, 'rgba(38,35,32,.22)'); damp.addColorStop(.32, 'rgba(0,0,0,0)'); damp.addColorStop(1, 'rgba(40,42,34,.17)');
    ctx.fillStyle = damp; ctx.fillRect(0, 0, w, h);
  });
}

function makeTileTexture() {
  const tex = canvasTexture(768, 768, (ctx, w, h) => {
    ctx.fillStyle = '#393a35'; ctx.fillRect(0, 0, w, h);
    const step = 96;
    for (let y = 0; y < h; y += step) for (let x = 0; x < w; x += step) {
      const v = 78 + ((x * 3 + y * 7) / step) % 19;
      ctx.fillStyle = `rgb(${v + 14},${v + 10},${v})`;
      ctx.fillRect(x + 3, y + 3, step - 6, step - 6);
      ctx.fillStyle = 'rgba(23,24,19,.16)'; ctx.fillRect(x + 5, y + step - 12, step - 10, 5);
      for (let i = 0; i < 16; i++) {
        ctx.fillStyle = `rgba(25,22,18,${Math.random() * .12})`;
        ctx.fillRect(x + Math.random() * step, y + Math.random() * step, Math.random() * 7, Math.random() * 4);
      }
    }
    for (let i = 0; i < 25; i++) {
      ctx.fillStyle = `rgba(45,28,18,${Math.random() * .2})`;
      ctx.beginPath(); ctx.ellipse(Math.random() * w, Math.random() * h, 3 + Math.random() * 32, 2 + Math.random() * 15, Math.random(), 0, Math.PI * 2); ctx.fill();
    }
  });
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping; tex.repeat.set(2, 1);
  return tex;
}

function makeWoodTexture() {
  return canvasTexture(512, 512, (ctx, w, h) => {
    ctx.fillStyle = '#5a321d'; ctx.fillRect(0, 0, w, h);
    for (let i = 0; i < 150; i++) {
      const y = Math.random() * h;
      ctx.strokeStyle = Math.random() > .4 ? 'rgba(218,144,74,.17)' : 'rgba(17,10,8,.22)';
      ctx.lineWidth = .5 + Math.random() * 3;
      ctx.beginPath(); ctx.moveTo(0, y); ctx.bezierCurveTo(w * .3, y + Math.random() * 15, w * .6, y - Math.random() * 16, w, y + Math.random() * 12); ctx.stroke();
    }
    ctx.fillStyle = 'rgba(17,8,5,.23)'; ctx.fillRect(0, 0, w, 12); ctx.fillRect(0, h - 13, w, 13);
    for (let i = 0; i < 15; i++) {
      ctx.fillStyle = `rgba(15,9,7,${Math.random() * .25})`;
      ctx.beginPath(); ctx.ellipse(Math.random() * w, Math.random() * h, 1 + Math.random() * 23, 1 + Math.random() * 4, 0, 0, Math.PI * 2); ctx.fill();
    }
  });
}

function makeSignTexture(text, options = {}) {
  return canvasTexture(options.vertical ? 384 : 1024, options.vertical ? 1024 : 320, (ctx, w, h) => {
    const grad = ctx.createLinearGradient(0, 0, w, h);
    grad.addColorStop(0, options.dark ? '#50170e' : '#c42a18');
    grad.addColorStop(1, options.dark ? '#2a0a08' : '#80140b');
    ctx.fillStyle = grad; ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = '#eab05d'; ctx.lineWidth = 10; ctx.strokeRect(14, 14, w - 28, h - 28);
    ctx.strokeStyle = 'rgba(255,230,154,.32)'; ctx.lineWidth = 2; ctx.strokeRect(30, 30, w - 60, h - 60);
    ctx.fillStyle = '#ffd98b';
    ctx.shadowColor = '#ff5b22'; ctx.shadowBlur = 22;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    if (options.vertical) {
      ctx.font = '900 118px "STKaiti", "KaiTi", serif';
      [...text].forEach((c, i) => ctx.fillText(c, w / 2, 155 + i * 150));
    } else {
      ctx.font = '900 128px "STKaiti", "KaiTi", serif';
      ctx.fillText(text, w / 2, h * .48);
      ctx.shadowBlur = 0;
      ctx.font = '600 30px Arial'; ctx.letterSpacing = '12px';
      ctx.fillStyle = 'rgba(255,227,169,.75)';
      ctx.fillText('CHARCOAL · BBQ · 1997', w / 2, h * .78);
    }
  });
}

function agePaper(ctx, w, h) {
  const stain = ctx.createLinearGradient(0, 0, w, h);
  stain.addColorStop(0, 'rgba(58,34,15,.18)');
  stain.addColorStop(.4, 'rgba(56,37,22,0)');
  stain.addColorStop(1, 'rgba(39,24,14,.27)');
  ctx.fillStyle = stain; ctx.fillRect(0, 0, w, h);
  for (let i = 0; i < 150; i++) {
    ctx.fillStyle = `rgba(49,31,21,${Math.random() * .1})`;
    ctx.beginPath(); ctx.ellipse(Math.random() * w, Math.random() * h, 1 + Math.random() * 9, .5 + Math.random() * 3, Math.random(), 0, Math.PI * 2); ctx.fill();
  }
  ctx.strokeStyle = 'rgba(255,246,224,.25)'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(w * .1, 0); ctx.lineTo(w * .19, h * .48); ctx.lineTo(w * .12, h); ctx.stroke();
  ctx.fillStyle = 'rgba(235,216,184,.47)';
  for (let i = 0; i < 18; i++) ctx.fillRect(Math.random() * w, Math.random() * h, Math.random() * 14, 1 + Math.random() * 2);
}

function makePosterTexture(title, sub, color = '#f0d7a0') {
  return canvasTexture(512, 768, (ctx, w, h) => {
    ctx.fillStyle = color; ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = '#7f2418'; ctx.lineWidth = 16; ctx.strokeRect(25, 25, w - 50, h - 50);
    ctx.fillStyle = '#7e2018'; ctx.textAlign = 'center';
    ctx.font = '900 126px "STKaiti", serif'; ctx.fillText(title, w / 2, h * .43);
    ctx.font = '700 42px sans-serif'; ctx.fillText(sub, w / 2, h * .66);
    ctx.font = '500 24px sans-serif'; ctx.fillText('老北街 · 炭火现烤', w / 2, h * .79);
    agePaper(ctx, w, h);
  });
}

function makeBeerAdTexture(brand, slogan, blue = false) {
  return canvasTexture(640, 900, (ctx, w, h) => {
    const bg = ctx.createLinearGradient(0, 0, w, h);
    bg.addColorStop(0, blue ? '#0874aa' : '#16714d');
    bg.addColorStop(1, blue ? '#05314c' : '#073b2c');
    ctx.fillStyle = bg; ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = 'rgba(255,255,255,.13)';
    for (let i = 0; i < 70; i++) {
      ctx.beginPath(); ctx.arc(Math.random() * w, Math.random() * h, 2 + Math.random() * 9, 0, Math.PI * 2); ctx.fill();
    }
    ctx.strokeStyle = '#f6df93'; ctx.lineWidth = 14; ctx.strokeRect(22, 22, w - 44, h - 44);
    ctx.fillStyle = '#fff2bd'; ctx.textAlign = 'center'; ctx.shadowColor = 'rgba(0,0,0,.35)'; ctx.shadowBlur = 12;
    ctx.font = '900 102px "STKaiti", serif'; ctx.fillText(brand, w / 2, 190);
    ctx.font = '900 66px sans-serif'; ctx.fillText('冰 镇', w / 2, 290);
    ctx.fillStyle = 'rgba(255,255,255,.92)';
    ctx.beginPath(); ctx.ellipse(w / 2, 535, 128, 218, -.08, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = blue ? '#1678a7' : '#1c704e'; ctx.fillRect(w / 2 - 95, 390, 190, 295);
    ctx.fillStyle = '#fff2bd'; ctx.font = '900 50px serif'; ctx.fillText('哈', w / 2, 515);
    ctx.fillStyle = '#f4dda0'; ctx.font = '800 47px sans-serif'; ctx.fillText(slogan, w / 2, 820);
    agePaper(ctx, w, h);
  });
}

function makeRetroStarPoster(name, caption, palette) {
  return canvasTexture(620, 900, (ctx, w, h) => {
    const g = ctx.createLinearGradient(0, 0, w, h);
    g.addColorStop(0, palette[0]); g.addColorStop(1, palette[1]);
    ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = 'rgba(248,224,183,.9)'; ctx.beginPath(); ctx.arc(w / 2, 360, 172, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#2b1b20';
    ctx.beginPath(); ctx.moveTo(140, 335); ctx.quadraticCurveTo(165, 112, 330, 145); ctx.quadraticCurveTo(510, 160, 500, 405); ctx.quadraticCurveTo(455, 245, 397, 215); ctx.quadraticCurveTo(290, 280, 140, 335); ctx.fill();
    ctx.fillStyle = '#d99d78'; ctx.beginPath(); ctx.ellipse(w / 2, 390, 125, 150, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#1a171b';
    ctx.fillRect(207, 350, 93, 35); ctx.fillRect(323, 350, 93, 35); ctx.fillRect(295, 360, 36, 8);
    ctx.fillStyle = '#8b2f31'; ctx.beginPath(); ctx.ellipse(w / 2, 466, 39, 13, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#19141a'; ctx.beginPath(); ctx.moveTo(94, 900); ctx.quadraticCurveTo(125, 575, w / 2, 560); ctx.quadraticCurveTo(500, 575, 535, 900); ctx.fill();
    ctx.fillStyle = '#ffe49b'; ctx.textAlign = 'center'; ctx.shadowColor = '#7c1c25'; ctx.shadowBlur = 8;
    ctx.font = '900 82px "STKaiti", serif'; ctx.fillText(name, w / 2, 705);
    ctx.shadowBlur = 0; ctx.font = '700 30px sans-serif'; ctx.letterSpacing = '5px'; ctx.fillText(caption, w / 2, 764);
    ctx.fillStyle = 'rgba(255,239,190,.7)'; ctx.font = '500 21px sans-serif'; ctx.fillText('北方音像出版社 · 1998', w / 2, 832);
    ctx.strokeStyle = 'rgba(255,230,170,.65)'; ctx.lineWidth = 7; ctx.strokeRect(18, 18, w - 36, h - 36);
    agePaper(ctx, w, h);
  });
}

function makeHandMenuTexture() {
  return canvasTexture(720, 940, (ctx, w, h) => {
    ctx.fillStyle = '#191d1c'; ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = '#8d7657'; ctx.lineWidth = 22; ctx.strokeRect(12, 12, w - 24, h - 24);
    ctx.fillStyle = '#efe9d8'; ctx.textAlign = 'center'; ctx.font = '900 74px "STKaiti", serif'; ctx.fillText('今日串单', w / 2, 115);
    ctx.textAlign = 'left'; ctx.font = '700 43px "STKaiti", serif';
    const lines = ['羊肉大串    6', '牛肉小串    3', '烤鸡架     18', '烤实蛋     12', '锦州干豆腐  8', '拍黄瓜     10'];
    lines.forEach((line, i) => ctx.fillText(line, 86, 225 + i * 104));
    ctx.fillStyle = '#e85e47'; ctx.font = '900 44px "STKaiti", serif'; ctx.fillText('花生毛豆免费续！', 90, 872);
  });
}

const brick = new THREE.MeshStandardMaterial({ map: makeBrickTexture(), roughness: .82, color: 0xc99d91 });
const concreteTex = makeConcreteTexture();
concreteTex.wrapS = concreteTex.wrapT = THREE.RepeatWrapping;
concreteTex.repeat.set(4, 3);
const concrete = new THREE.MeshStandardMaterial({ map: concreteTex, color: 0x778187, roughness: .52, metalness: .08 });
const darkMetal = new THREE.MeshStandardMaterial({ color: 0x24292b, metalness: .76, roughness: .28 });
const paintedMetal = new THREE.MeshStandardMaterial({ color: 0x34505a, metalness: .5, roughness: .4 });
const wood = new THREE.MeshStandardMaterial({ map: makeWoodTexture(), roughness: .78 });
const wornPlaster = new THREE.TextureLoader().load('./textures/worn-plaster.jpg');
wornPlaster.colorSpace = THREE.SRGBColorSpace;
wornPlaster.anisotropy = maxAniso;
const plaster = new THREE.MeshStandardMaterial({ map: wornPlaster, color: 0xc9ae8d, roughness: .95 });
const tile = new THREE.MeshStandardMaterial({ map: makeTileTexture(), roughness: .84 });
const redPlastic = new THREE.MeshStandardMaterial({ color: 0xa52b20, roughness: .55 });
const glass = new THREE.MeshPhysicalMaterial({ color: 0xa7bec5, transparent: true, opacity: .09, roughness: .04, metalness: 0, transmission: .18 });
const wetRoad = new THREE.MeshStandardMaterial({ map: makeConcreteTexture(), color: 0x47535b, roughness: .2, metalness: .36 });

// Diorama plinth and wet street.
cylinder('miniature plinth', 11.8, 12.4, .65, [0, -.58, .25], new THREE.MeshStandardMaterial({ color: 0x12171b, metalness: .55, roughness: .3 }), world, 48);
const street = box('wet street', [22.4, .18, 18], [0, -.15, .3], wetRoad);
street.geometry.translate(0, 0, 0);
box('sidewalk', [13.5, .28, 3.1], [0, .05, 5.45], new THREE.MeshStandardMaterial({ color: 0x4d565a, roughness: .34, metalness: .13 }));
for (let x = -6; x <= 6; x += 1.5) box('curb segment', [1.38, .35, .28], [x, .14, 3.98], concrete);
for (let x = -9; x < 10; x += 2.4) box('road dash', [1.2, .012, .1], [x, -.045, -5.7], new THREE.MeshStandardMaterial({ color: 0xb0a88b, roughness: .38 }), world, false, true);

// Reflected pools of light on wet asphalt.
const glowTex = canvasTexture(256, 256, (ctx, w, h) => {
  const g = ctx.createRadialGradient(w / 2, h / 2, 3, w / 2, h / 2, w / 2);
  g.addColorStop(0, 'rgba(255,135,48,.62)'); g.addColorStop(.35, 'rgba(255,81,30,.24)'); g.addColorStop(1, 'rgba(255,45,15,0)');
  ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
});
function lightPool(x, z, sx, sy, opacity = .45) {
  const m = new THREE.MeshBasicMaterial({ map: glowTex, transparent: true, opacity, depthWrite: false, blending: THREE.AdditiveBlending });
  const p = new THREE.Mesh(new THREE.PlaneGeometry(sx, sy), m);
  p.rotation.x = -Math.PI / 2; p.position.set(x, -.045, z); world.add(p);
  return m;
}
const signPool = lightPool(0, 4.15, 12, 6, .5);
const roomPool = lightPool(-1.2, 4.3, 8, 5, .32);

// Main brick shop shell.
const shop = new THREE.Group();
world.add(shop);
box('back wall', [11.8, 5.7, .35], [0, 2.92, -2.8], brick, shop);
box('left wall', [.38, 5.7, 6.2], [-5.72, 2.92, .1], brick, shop);
box('right wall', [.38, 5.7, 6.2], [5.72, 2.92, .1], brick, shop);
box('roof', [12.2, .38, 6.5], [0, 5.73, .1], darkMetal, shop);
box('interior floor', [11.25, .12, 5.9], [0, .24, .12], new THREE.MeshStandardMaterial({ color: 0x665748, roughness: .48 }), shop);
box('left facade pier', [1.0, 5.2, .52], [-5.15, 2.7, 3.16], brick, shop);
box('right facade pier', [.95, 5.2, .52], [5.18, 2.7, 3.16], brick, shop);
box('top facade beam', [10, .58, .5], [0, 5.22, 3.16], brick, shop);
box('bottom window sill', [10.1, .45, .48], [0, .5, 3.18], concrete, shop);

// Front windows and center door.
box('left glass', [6.0, 3.58, .07], [-1.78, 2.55, 3.23], glass, shop, false, false);
box('door glass', [2.25, 3.9, .08], [3.68, 2.36, 3.27], glass, shop, false, false);
for (const x of [-4.82, 1.28, 2.52, 4.82]) box('window mullion', [.12, 4.05, .14], [x, 2.55, 3.33], darkMetal, shop);
box('window transom', [9.8, .12, .14], [0, 4.35, 3.33], darkMetal, shop);
const handle = cylinder('door handle', .035, .035, .75, [3.1, 2.35, 3.42], new THREE.MeshStandardMaterial({ color: 0xb19c6d, metalness: .9, roughness: .15 }), shop, 10);
handle.rotation.z = Math.PI / 2;

// Main illuminated sign and vertical blade sign.
const signTex = makeSignTexture('老北街 · 东北烧烤');
const signMat = new THREE.MeshStandardMaterial({ map: signTex, emissiveMap: signTex, emissive: 0xff3a17, emissiveIntensity: .92, roughness: .34 });
signMaterials.push(signMat);
box('main neon sign', [10.7, 1.55, .32], [0, 5.82, 3.28], signMat, shop);
const signFrame = box('sign frame', [11.08, 1.87, .22], [0, 5.82, 3.19], darkMetal, shop);
signFrame.renderOrder = -1;
const vTex = makeSignTexture('大串啤酒', { vertical: true, dark: true });
const vMat = new THREE.MeshStandardMaterial({ map: vTex, emissiveMap: vTex, emissive: 0xff381e, emissiveIntensity: .82, roughness: .32 });
signMaterials.push(vMat);
const blade = box('vertical sign', [.72, 2.35, .15], [-6.0, 4.42, 2.45], vMat, shop);
blade.rotation.y = Math.PI / 2;
box('blade sign bracket', [.16, .15, 1.05], [-5.82, 5.35, 2.33], darkMetal, shop);

// Corrugated awning.
const awning = box('rain awning', [11.35, .14, 1.38], [0, 4.86, 3.79], paintedMetal, shop);
awning.rotation.x = -.13;
for (let x = -5.45; x <= 5.45; x += .28) {
  const rib = box('awning rib', [.035, .05, 1.42], [x, 4.91, 3.8], new THREE.MeshStandardMaterial({ color: 0x65808a, metalness: .58, roughness: .34 }), shop);
  rib.rotation.x = -.13;
}

// Interior ceiling, warm wall and menu band.
const warmWall = new THREE.MeshStandardMaterial({ map: wornPlaster, color: 0xb39475, emissive: 0xff7a2b, emissiveIntensity: .06, roughness: .92 });
interiorGlowMaterials.push(warmWall);
box('warm back wall', [9.8, 4.5, .06], [-.15, 2.6, -2.6], warmWall, shop, false, true);
box('menu strip', [8.7, .82, .08], [-.55, 4.3, -2.5], new THREE.MeshStandardMaterial({ map: makeSignTexture('羊肉串  ·  烤腰子  ·  锦州干豆腐', { dark: true }), emissive: 0xb92c15, emissiveIntensity: .25 }), shop, false, false);

// Layered ads, hand-written menus and fictional retro-star posters.
function addWallPoster(texture, x, y, z, w, h, rotationY = 0, tilt = 0, parent = shop) {
  const paper = new THREE.MeshStandardMaterial({ map: texture, roughness: .82, side: THREE.DoubleSide });
  const poster = new THREE.Mesh(new THREE.PlaneGeometry(w, h), paper);
  poster.position.set(x, y, z); poster.rotation.y = rotationY; poster.rotation.z = tilt; poster.castShadow = true; parent.add(poster);
  return poster;
}
addWallPoster(makeBeerAdTexture('哈北啤酒', '够爽 · 够朋友'), -4.55, 2.62, -2.51, 1.34, 1.88, 0, -.025);
addWallPoster(makeRetroStarPoster('林北风', '最火金曲 · 磁带热卖', ['#9a2b35', '#251523']), -2.82, 2.78, -2.505, 1.28, 1.86, 0, .018);
addWallPoster(makePosterTexture('撸', '串儿管够'), -1.18, 2.48, -2.50, 1.02, 1.5, 0, -.035);
addWallPoster(makeHandMenuTexture(), .2, 2.83, -2.505, 1.24, 1.64, 0, .022);
addWallPoster(makeRetroStarPoster('齐小眉', '今晚不打烊', ['#1e6277', '#17283c']), 1.77, 2.68, -2.50, 1.14, 1.68, 0, -.018);
addWallPoster(makeBeerAdTexture('雪原纯生', '东北人的啤酒', true), 3.36, 2.66, -2.50, 1.3, 1.82, 0, .028);

// Left side wall: old calendar, faded ad and a dense collage of small flyers.
addWallPoster(makePosterTexture('福', '天天有客', '#e2c38e'), -5.50, 3.15, -1.42, 1.02, 1.46, Math.PI / 2, .025);
addWallPoster(makeRetroStarPoster('赵远山', '北方喜剧之夜', ['#b37028', '#4a2319']), -5.50, 2.52, .05, 1.22, 1.72, Math.PI / 2, -.04);
addWallPoster(makeBeerAdTexture('松江啤酒', '干杯老铁'), -5.50, 2.72, 1.63, 1.1, 1.58, Math.PI / 2, .025);
for (let i = 0; i < 7; i++) {
  const flyer = makePosterTexture(i % 2 ? '串' : '酒', i % 2 ? '十串送一串' : '三瓶送花生', i % 3 ? '#d9c69f' : '#b7d0ca');
  addWallPoster(flyer, -5.495, 1.03 + (i % 3) * .54, -2.05 + Math.floor(i / 3) * .58, .42, .52, Math.PI / 2, (i - 3) * .018);
}

// Tables, grills and stools.
function addTable(x, z, rotation = 0, parent = shop) {
  const g = new THREE.Group(); g.position.set(x, .28, z); g.rotation.y = rotation; parent.add(g);
  box('wood table top', [2.05, .14, .82], [0, 1.15, 0], wood, g);
  for (const lx of [-.78, .78]) for (const lz of [-.25, .25]) box('table leg', [.1, 1.08, .1], [lx, .58, lz], darkMetal, g);
  for (const side of [-1, 1]) {
    const seat = cylinder('round stool', .27, .29, .12, [0, .68, side * .82], redPlastic, g, 20);
    box('stool stem', [.11, .58, .11], [0, .36, side * .82], darkMetal, g);
    for (const d of [-1, 1]) box('stool foot', [.5, .05, .07], [d * .13, .08, side * .82], darkMetal, g);
    seat.rotation.y = Math.random();
  }
  // Dishes and green beer bottles.
  cylinder('plate', .22, .22, .025, [-.35, 1.24, 0], new THREE.MeshStandardMaterial({ color: 0xdfd9c9, roughness: .5 }), g, 24);
  const bottleMat = new THREE.MeshStandardMaterial({ color: 0x144a35, transparent: true, opacity: .78, metalness: .1, roughness: .2 });
  const bottle = cylinder('beer bottle', .075, .1, .42, [.44, 1.43, -.08], bottleMat, g, 14);
  cylinder('bottle neck', .04, .055, .16, [.44, 1.72, -.08], bottleMat, g, 12);
  return g;
}
addTable(-3.35, -.15, .06);
addTable(-.45, 1.5, -.04);
addTable(2.3, -.35, .04);

// Condiment caddies, tissue boxes and deliberately mismatched everyday clutter.
const condimentColors = [0x8f231d, 0xd3b05a, 0x365d35];
for (const [x, z] of [[-3.35, -.15], [-.45, 1.5], [2.3, -.35]]) {
  box('tissue box', [.34, .19, .22], [x - .34, 1.58, z + .1], new THREE.MeshStandardMaterial({ color: 0xd6cfc1, roughness: .8 }), shop);
  condimentColors.forEach((c, i) => {
    cylinder('condiment bottle', .045, .06, .27, [x + .16 + i * .13, 1.67, z - .12], new THREE.MeshStandardMaterial({ color: c, roughness: .62 }), shop, 10);
  });
}

// Sticker-covered drinks fridge and a battered standing fan.
const fridgeMat = new THREE.MeshStandardMaterial({ color: 0xc7d2d0, roughness: .4, metalness: .12 });
box('drinks fridge', [1.18, 2.45, .85], [4.64, 1.55, .84], fridgeMat, shop);
box('fridge glass', [.98, 1.75, .04], [4.64, 1.7, 1.28], new THREE.MeshPhysicalMaterial({ color: 0x4e7480, emissive: 0x94d8ef, emissiveIntensity: .3, transparent: true, opacity: .42, roughness: .12 }), shop, false, false);
for (let y = 1.05; y < 2.3; y += .42) for (let x = 4.32; x < 5.02; x += .22) cylinder('fridge bottle', .035, .045, .25, [x, y, 1.33], new THREE.MeshStandardMaterial({ color: Math.random() > .5 ? 0x2a6349 : 0x79511f, roughness: .3 }), shop, 8);
addWallPoster(makePosterTexture('冰', '啤酒可乐', '#4da7c2'), 4.15, 2.62, 1.275, .38, .52, 0, -.05);
const fanStand = cylinder('fan stand', .06, .07, 1.75, [-4.55, 1.05, 2.16], darkMetal, shop, 10);
const fanHead = cylinder('fan head', .5, .5, .12, [-4.55, 2.05, 2.16], darkMetal, shop, 24); fanHead.rotation.x = Math.PI / 2;
for (let a = 0; a < Math.PI * 2; a += Math.PI / 3) {
  const fanBlade = box('fan blade', [.08, .7, .035], [-4.55, 2.05, 2.06], paintedMetal, shop); fanBlade.rotation.z = a;
}

const counter = box('grill counter', [3.4, 1.0, 1.15], [3.62, .82, -1.77], darkMetal, shop);
box('counter top', [3.65, .12, 1.32], [3.62, 1.37, -1.77], new THREE.MeshStandardMaterial({ color: 0x757a78, metalness: .72, roughness: .25 }), shop);
for (let x = 2.35; x < 4.95; x += .33) {
  const skewer = cylinder('skewer', .018, .018, .82, [x, 1.53, -1.77], new THREE.MeshStandardMaterial({ color: 0xc7a978, metalness: .3, roughness: .45 }), shop, 8);
  skewer.rotation.z = Math.PI / 2;
  cylinder('meat', .075, .085, .16, [x, 1.57, -1.77], new THREE.MeshStandardMaterial({ color: 0x8b2f1f, roughness: .68 }), shop, 8).rotation.z = Math.PI / 2;
}

// Hanging bulbs and independent room lights.
const bulbGlowMat = new THREE.MeshStandardMaterial({ color: 0xffc16c, emissive: 0xff9d38, emissiveIntensity: 3.5, roughness: .2 });
interiorGlowMaterials.push(bulbGlowMat);
for (const x of [-3.65, -1.25, 1.15, 3.55]) {
  cylinder('bulb cord', .013, .013, .65, [x, 4.92, .15], darkMetal, shop, 7);
  const bulb = new THREE.Mesh(new THREE.SphereGeometry(.105, 14, 10), bulbGlowMat);
  bulb.position.set(x, 4.54, .15); shop.add(bulb);
  const light = new THREE.PointLight(0xff9d43, 135, 9.5, 2.05);
  light.position.set(x, 4.35, .25); light.castShadow = x === -1.25 || x === 1.15;
  if (light.castShadow) light.shadow.mapSize.set(512, 512);
  shop.add(light); roomLights.push(light);
}
const kitchenLight = new THREE.PointLight(0xff7e31, 155, 8, 2);
kitchenLight.position.set(3.7, 3.2, -1.6); shop.add(kitchenLight); roomLights.push(kitchenLight);

// The second storey is built as a separate cutaway layer, in the spirit of a
// hand-made miniature: the facade and roof can lift away to reveal both rooms.
const upper = new THREE.Group();
upper.position.y = 5.78;
world.add(upper);
box('upstairs worn tile floor', [11.55, .19, 6.15], [0, .2, .05], tile, upper);
box('upstairs rear brick', [11.75, 3.85, .35], [0, 2.15, -2.8], brick, upper);
box('upstairs rear plaster', [11.1, 3.3, .055], [0, 2.08, -2.57], plaster, upper, false);
box('upstairs left wall', [.36, 3.95, 6.25], [-5.72, 2.12, .08], brick, upper);
box('upstairs right wall', [.36, 3.95, 6.25], [5.72, 2.12, .08], brick, upper);
box('upstairs left plaster', [.055, 3.25, 5.8], [-5.48, 2.05, .06], plaster, upper, false);
box('upstairs right plaster', [.055, 3.25, 5.8], [5.48, 2.05, .06], plaster, upper, false);
box('private room partition', [.16, 3.15, 3.48], [.12, 1.78, -1.02], plaster, upper);
box('partition dark wood edge', [.2, 3.22, .12], [.12, 1.78, .76], wood, upper);
box('upstairs skirting back', [11.1, .17, .1], [0, .42, -2.48], wood, upper);
for (const x of [-5.4, -.1, 5.4]) box('upstairs skirting', [.1, .17, 5.7], [x, .42, .1], wood, upper);

const upperFacade = new THREE.Group(); upper.add(upperFacade);
box('upper left pier', [.9, 3.68, .45], [-5.16, 2.16, 3.15], brick, upperFacade);
box('upper right pier', [.9, 3.68, .45], [5.16, 2.16, 3.15], brick, upperFacade);
box('upper sill', [10.0, .62, .48], [0, .64, 3.16], concrete, upperFacade);
box('upper lintel', [10.0, .49, .48], [0, 3.83, 3.16], brick, upperFacade);
box('upper center pier', [.46, 2.93, .46], [.16, 2.22, 3.16], brick, upperFacade);
for (const x of [-4.45, -2.08, 2.13, 4.46]) {
  box('upper window frame', [.1, 2.74, .12], [x, 2.22, 3.4], darkMetal, upperFacade);
  box('upper window transom', [2.23, .11, .13], [x < 0 ? -3.29 : 3.3, 2.85, 3.4], darkMetal, upperFacade);
}
box('left private room glass', [4.36, 2.67, .065], [-2.56, 2.22, 3.34], glass, upperFacade, false, false);
box('right private room glass', [4.30, 2.67, .065], [2.58, 2.22, 3.34], glass, upperFacade, false, false);
const upperRoof = new THREE.Group(); upper.add(upperRoof);
box('upper roof cap', [12.3, .32, 6.55], [0, 4.31, .04], darkMetal, upperRoof);
for (let x = -5.8; x < 6; x += .29) {
  box('roof seam', [.032, .037, 6.45], [x, 4.49, .04], paintedMetal, upperRoof);
}
box('rain gutter', [12.3, .18, .23], [0, 4.22, 3.38], darkMetal, upperRoof);
for (const x of [-5.95, 5.95]) cylinder('downpipe', .066, .066, 9.55, [x, 4.73, 3.35], paintedMetal, world, 10);

// Upstairs: two lived-in private dining rooms, not a pristine showroom.
const upstairsWood = new THREE.MeshStandardMaterial({ map: makeWoodTexture(), roughness: .82 });
function upstairsDining(x, z, angle) {
  const g = new THREE.Group(); g.position.set(x, .3, z); g.rotation.y = angle; upper.add(g);
  box('scarred upstairs round table', [2.6, .14, 1.12], [0, 1.08, 0], upstairsWood, g);
  for (const lx of [-1.03, 1.03]) for (const lz of [-.41, .41]) box('table leg', [.12, 1.03, .12], [lx, .57, lz], darkMetal, g);
  for (const xSeat of [-.78, .78]) for (const side of [-1, 1]) {
    box('mismatched chair seat', [.53, .1, .48], [xSeat, .65, side * .87], side > 0 ? redPlastic : wood, g);
    box('chair back', [.53, .67, .09], [xSeat, .98, side * 1.12], side > 0 ? redPlastic : wood, g);
    for (const dx of [-.18, .18]) box('chair leg', [.055, .59, .055], [xSeat + dx, .33, side * .87], darkMetal, g);
  }
  const enamel = new THREE.MeshStandardMaterial({ color: 0xd4d1be, roughness: .67 });
  for (const [px, pz] of [[-.68,-.13],[.66,.16],[.18,-.3]]) cylinder('used enamel plate', .18, .18, .025, [px, 1.17, pz], enamel, g, 22);
  for (const [bx,bz] of [[-.15,.26],[.44,-.28],[-.42,.28]]) {
    cylinder('green beer bottle', .065, .09, .39, [bx, 1.39, bz], new THREE.MeshStandardMaterial({ color: 0x245a38, metalness: .1, roughness: .24, transparent: true, opacity: .82 }), g, 12);
    cylinder('beer bottle neck', .035, .04, .15, [bx, 1.66, bz], new THREE.MeshStandardMaterial({ color: 0x2c6b42, roughness: .24 }), g, 10);
  }
  box('crumpled paper napkins', [.26, .04, .17], [.06, 1.19, -.03], new THREE.MeshStandardMaterial({ color: 0xc9c0aa, roughness: 1 }), g);
}
upstairsDining(-2.65, -.65, .07);
upstairsDining(2.75, -.75, -.07);
for (const [x, title, caption] of [[-3.75, '沈北雪', '金曲点唱'],[-2.05, '赵大山', '今夜开怀'],[1.75, '齐小眉', '再来一首'],[3.85, '林北风', '北方音像']]) {
  addWallPoster(makeRetroStarPoster(title, caption, x < 0 ? ['#803827','#231d23'] : ['#1e6371','#1a3040']), x, 2.56, -2.515, 1.08, 1.54, 0, (x % 3) * .013, upper);
}
addWallPoster(makeBeerAdTexture('哈北啤酒', '夜里照样冰'), -5.445, 2.05, -.2, 1.1, 1.55, Math.PI / 2, -.03, upper);
addWallPoster(makePosterTexture('东北', '烧烤 · 朋友 · 夜', '#d0b286'), 5.445, 2.12, -.55, 1.13, 1.58, -Math.PI / 2, .02, upper);
addWallPoster(makeHandMenuTexture(), .215, 1.94, -.65, .96, 1.26, Math.PI / 2, .04, upper);
const upstairsBulb = new THREE.MeshStandardMaterial({ color: 0xffd393, emissive: 0xffa646, emissiveIntensity: 2.8 });
for (const x of [-2.7, 2.7]) {
  cylinder('private room lamp cord', .018, .018, .55, [x, 3.8, -.4], darkMetal, upper, 8);
  cylinder('private room metal shade', .38, .18, .22, [x, 3.42, -.4], darkMetal, upper, 18);
  cylinder('private room warm bulb', .16, .16, .07, [x, 3.28, -.4], upstairsBulb, upper, 14);
  const light = new THREE.PointLight(0xffab57, 140, 7.5, 2);
  light.position.set(x, 3.18, -.3); upper.add(light); roomLights.push(light);
}
interiorGlowMaterials.push(upstairsBulb);

// Side stair gives the new storey an actual entrance and a readable silhouette.
const stair = new THREE.Group(); world.add(stair);
const stairTread = new THREE.MeshStandardMaterial({ map: makeConcreteTexture(), color: 0x939b96, metalness: .1, roughness: .68 });
for (let i = 0; i < 16; i++) {
  const y = .43 + i * .345, z = 4.04 - i * .38;
  box('worn exterior stair tread', [1.55, .16, .39], [7.2, y, z], stairTread, stair);
  box('stair dark riser', [1.55, .3, .08], [7.2, y - .22, z - .16], darkMetal, stair);
  if (i % 4 === 0) for (const x of [6.32, 8.08]) cylinder('stair rail post', .045, .045, 1.1, [x, y + .48, z], paintedMetal, stair, 9);
}
box('second-floor stair landing', [2.0, .19, 1.1], [6.8, 5.95, -2.18], stairTread, stair);
for (const x of [6.3, 8.1]) {
  const rail = box('sloping stair handrail', [.07, .07, 6.25], [x, 3.72, 1.2], paintedMetal, stair);
  rail.rotation.x = -.72;
}
box('upstairs side doorway', [.07, 2.5, 1.13], [5.95, 7.1, -2.03], darkMetal, world);
box('side door lighted glass', [.08, 1.98, .92], [6.0, 7.17, -2.03], glass, world, false, false);
const floorPlaqueTex = makeSignTexture('二楼包间', { dark: true });
const floorPlaqueMat = new THREE.MeshStandardMaterial({ map: floorPlaqueTex, emissiveMap: floorPlaqueTex, emissive: 0xff4f20, emissiveIntensity: .45 });
signMaterials.push(floorPlaqueMat);
const floorPlaque = box('second-floor private room plaque', [2.4, .69, .14], [0, 6.87, 3.5], floorPlaqueMat, world);

// Exterior sign light wash.
const signLightA = new THREE.PointLight(0xff3a1f, 95, 12, 2.0);
signLightA.position.set(-2.3, 5.7, 4.35); world.add(signLightA);
const signLightB = new THREE.PointLight(0xff5b2a, 70, 11, 2.0);
signLightB.position.set(2.8, 5.5, 4.15); world.add(signLightB);

// Rooftop ventilation, chimney and old AC unit.
cylinder('exhaust stack', .48, .48, 2.6, [3.65, 11.12, -.8], darkMetal, world, 18);
const hood = cylinder('chimney hood', .7, .42, .45, [3.65, 12.54, -.8], darkMetal, world, 18);
hood.rotation.y = .2;
const chimney = new THREE.Group(); world.add(chimney);
chimney.add(world.children.find(child => child.name === 'exhaust stack'));
chimney.add(hood);
box('ac body', [1.62, 1.15, .58], [-3.8, 4.02, -3.13], new THREE.MeshStandardMaterial({ color: 0x777c78, roughness: .7, metalness: .18 }), world);
const fan = cylinder('ac fan', .41, .41, .06, [-3.8, 4.02, -3.46], darkMetal, world, 24);
fan.rotation.x = Math.PI / 2;
for (let a = 0; a < Math.PI * 2; a += Math.PI / 4) {
  const blade = box('fan blade', [.05, .55, .025], [-3.8, 4.02, -3.51], paintedMetal, world);
  blade.rotation.z = a;
}

// Outdoor folding table, stools and produce crates.
addTable(-3.5, 5.05, .08, world).scale.set(.85, .85, .85);
for (let y = .45; y <= .95; y += .5) box('beer crate', [1.15, .42, .7], [4.75, y, 5.38], new THREE.MeshStandardMaterial({ color: 0x195f45, roughness: .65 }), world);
for (let i = 0; i < 8; i++) cylinder('beer in crate', .055, .075, .46, [4.37 + (i % 4) * .24, 1.36, 5.17 + Math.floor(i / 4) * .28], new THREE.MeshStandardMaterial({ color: 0x134c36, transparent: true, opacity: .8, roughness: .23 }), world, 10);

// Menu board on sidewalk.
const boardMat = new THREE.MeshStandardMaterial({ map: makePosterTexture('烤', '羊肉大串 ¥6', '#e6d4aa'), roughness: .72 });
const menuBoard = box('sidewalk menu', [1.0, 1.45, .11], [1.55, 1.05, 5.45], boardMat, world);
menuBoard.rotation.y = -.16;
for (const dx of [-.33, .33]) {
  const leg = box('menu board leg', [.08, 1.05, .08], [1.55 + dx, .48, 5.45], darkMetal, world);
  leg.rotation.z = dx > 0 ? -.12 : .12;
}

// Red plastic rain canopy over outdoor table.
const canopyMat = new THREE.MeshPhysicalMaterial({ color: 0xa81712, transparent: true, opacity: .72, roughness: .35, transmission: .08, side: THREE.DoubleSide });
const canopy = new THREE.Mesh(new THREE.CylinderGeometry(2.65, 2.65, .06, 8), canopyMat);
canopy.position.set(-3.7, 4.0, 5.15); canopy.scale.z = .52; canopy.rotation.y = Math.PI / 8; world.add(canopy);
cylinder('canopy pole', .045, .055, 3.8, [-3.7, 2.05, 5.15], paintedMetal, world, 10);

// Rear utility poles keep both cables outside the upstairs rooms.
const utilityZ = -4.8;
cylinder('utility pole', .14, .19, 8.9, [-9.1, 4.38, utilityZ], darkMetal, world, 14);
cylinder('utility support pole', .14, .19, 8.9, [9.1, 4.38, utilityZ], darkMetal, world, 14);
box('lamp arm', [2.0, .11, .11], [-8.18, 7.3, utilityZ], darkMetal, world);
const lampShade = cylinder('lamp shade', .54, .28, .24, [-7.25, 7.06, utilityZ], darkMetal, world, 18);
const streetBulbMat = new THREE.MeshStandardMaterial({ color: 0xffd38a, emissive: 0xffad42, emissiveIntensity: 2.1 });
cylinder('street bulb', .23, .23, .08, [-7.25, 6.92, utilityZ], streetBulbMat, world, 16);
const streetLight = new THREE.PointLight(0xffb464, 240, 14, 2.0);
streetLight.position.set(-7.2, 6.7, utilityZ + .2); streetLight.castShadow = true; streetLight.shadow.mapSize.set(512, 512); world.add(streetLight);
const exteriorLights = [streetLight];
const streetLampPools = [];
const streetLampLenses = [];
const facadeLampLenses = [];

// A pair of clearly visible street lamps frames the storefront.
function addStreetLamp(x, z, facing = 1) {
  const lampGroup = new THREE.Group();
  lampGroup.position.set(x, 0, z); world.add(lampGroup);
  cylinder('street lamp pole', .1, .15, 5.45, [0, 2.67, 0], darkMetal, lampGroup, 14);
  box('street lamp arm', [1.22, .11, .11], [facing * .54, 5.25, 0], darkMetal, lampGroup);
  const elbow = cylinder('street lamp elbow', .11, .11, .62, [facing * 1.09, 5.05, 0], darkMetal, lampGroup, 12);
  elbow.rotation.z = Math.PI / 2;
  const shade = cylinder('street lamp shade', .42, .23, .24, [facing * 1.1, 4.84, 0], darkMetal, lampGroup, 18);
  const lensMat = new THREE.MeshStandardMaterial({ color: 0xffe4ac, emissive: 0xffb354, emissiveIntensity: 4.6, roughness: .22 });
  streetLampLenses.push(lensMat);
  const lens = cylinder('street lamp lens', .22, .28, .1, [facing * 1.1, 4.67, 0], lensMat, lampGroup, 18);
  const light = new THREE.PointLight(0xffbd6a, 360, 14, 1.9);
  light.position.set(facing * 1.1, 4.58, 0); light.castShadow = true; light.shadow.mapSize.set(512, 512); lampGroup.add(light);
  exteriorLights.push(light);
  streetLampPools.push(lightPool(x + facing * 1.1, z, 5.8, 5.8, .28));
}
addStreetLamp(-8.6, 4.8, 1);
addStreetLamp(8.9, 4.8, -1);

// Small downlights make the facade legible without losing the rainy-night mood.
for (const x of [-4.2, -2.1, 0, 2.1, 4.2]) {
  const fixture = cylinder('facade downlight', .11, .15, .2, [x, 4.72, 4.0], darkMetal, world, 12);
  fixture.rotation.x = Math.PI / 2;
  const lensMat = new THREE.MeshStandardMaterial({ color: 0xffd59a, emissive: 0xffa64b, emissiveIntensity: 2.5 });
  facadeLampLenses.push(lensMat);
  const lens = cylinder('facade lamp lens', .095, .095, .025, [x, 4.63, 4.11], lensMat, world, 12);
  lens.rotation.x = Math.PI / 2;
  const spot = new THREE.SpotLight(0xffba6a, 150, 10, .58, .55, 1.6);
  spot.position.set(x, 4.62, 4.12);
  spot.target.position.set(x, .3, 3.7);
  world.add(spot, spot.target);
  exteriorLights.push(spot);
}

// A roadside tree makes the season switch visible even from the default view.
const tree = new THREE.Group(); tree.position.set(-8.45, .05, 5.6); world.add(tree);
const bark = new THREE.MeshStandardMaterial({ color: 0x544236, roughness: .95 });
cylinder('roadside tree trunk', .16, .28, 4.4, [0, 2.1, 0], bark, tree, 12);
for (const [angle, length] of [[-.8, 2.45], [.5, 2.15], [1.5, 1.7], [-1.7, 1.8]]) {
  const branch = cylinder('winter-visible branch', .055, .11, length, [Math.sin(angle) * .55, 3.8, Math.cos(angle) * .47], bark, tree, 8);
  branch.rotation.z = angle * .46;
}
const leafMat = new THREE.MeshStandardMaterial({ color: 0x547450, roughness: 1, side: THREE.DoubleSide });
const leaves = new THREE.Group(); tree.add(leaves);
for (let i = 0; i < 64; i++) {
  const a = i * 2.4, r = .35 + (i % 6) * .19;
  const tuft = new THREE.Mesh(new THREE.IcosahedronGeometry(.24 + (i % 4) * .055, 0), leafMat);
  tuft.position.set(Math.cos(a) * r, 4.15 + Math.sin(i * 2.6) * .58, Math.sin(a) * r * .72);
  tuft.castShadow = true; leaves.add(tuft);
}
const snowCoverMat = new THREE.MeshStandardMaterial({ color: 0xd9e5e4, roughness: .98 });
const winterSnow = new THREE.Group(); world.add(winterSnow);
for (const [x, y, z, sx] of [[-4,4.98,3.79,2.4],[0,4.98,3.79,2.6],[4,4.98,3.79,2.4],[0,10.31,2.75,5.6],[-8.6,.08,-.8,1.2],[9.4,.08,-.8,1.4]]) {
  const patch = new THREE.Mesh(new THREE.BoxGeometry(sx,.06,.38), snowCoverMat);
  patch.name = y > 9 ? 'roof snow patch' : 'snow cover';
  patch.position.set(x,y,z); winterSnow.add(patch);
}
winterSnow.visible = false;

function wire(points) {
  const curve = new THREE.CatmullRomCurve3(points.map(p => new THREE.Vector3(...p)));
  const tube = new THREE.Mesh(new THREE.TubeGeometry(curve, 32, .018, 5, false), darkMetal);
  tube.castShadow = true; world.add(tube);
}
wire([[-9.1, 8.1, utilityZ - .12], [-4.5, 7.25, utilityZ - .12], [0, 7.05, utilityZ - .12], [4.5, 7.25, utilityZ - .12], [9.1, 8.1, utilityZ - .12]]);
wire([[-9.1, 7.8, utilityZ + .12], [-4.5, 6.95, utilityZ + .12], [0, 6.75, utilityZ + .12], [4.5, 6.95, utilityZ + .12], [9.1, 7.8, utilityZ + .12]]);

// Manhole and drains.
const manhole = cylinder('manhole', .82, .82, .05, [4.2, -.02, -3.0], new THREE.MeshStandardMaterial({ color: 0x2b3438, metalness: .7, roughness: .36 }), world, 32);
for (let a = 0; a < Math.PI * 2; a += Math.PI / 8) {
  const mark = box('manhole spoke', [.64, .018, .035], [4.2, .015, -3.0], darkMetal, world, false, true);
  mark.rotation.y = a;
}
for (let x = -1.2; x < 1.3; x += .18) box('drain slot', [.09, .025, .75], [x, .02, 4.75], darkMetal, world, false, true);

// Steam/smoke sprites.
const smokeTex = canvasTexture(128, 128, (ctx, w, h) => {
  const g = ctx.createRadialGradient(w / 2, h / 2, 1, w / 2, h / 2, w / 2);
  g.addColorStop(0, 'rgba(220,225,220,.5)'); g.addColorStop(.45, 'rgba(170,180,180,.18)'); g.addColorStop(1, 'rgba(120,130,130,0)');
  ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
});
const smokeParticles = [];
for (let i = 0; i < 16; i++) {
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: smokeTex, transparent: true, opacity: .15, depthWrite: false }));
  s.position.set(3.65 + (Math.random() - .5) * .2, 12.8 + Math.random() * 3.5, -.8 + (Math.random() - .5) * .2);
  const scale = .45 + Math.random() * .75; s.scale.set(scale, scale, scale); s.userData.phase = Math.random() * 10;
  world.add(s); smokeParticles.push(s);
}

// Rain as thousands of short line segments.
const rainCount = 1900;
const rainData = new Float32Array(rainCount * 6);
const rainVelocity = new Float32Array(rainCount);
for (let i = 0; i < rainCount; i++) {
  const x = (Math.random() - .5) * 34;
  const y = Math.random() * 22;
  const z = (Math.random() - .5) * 28;
  const len = .12 + Math.random() * .24;
  rainData[i * 6] = x; rainData[i * 6 + 1] = y; rainData[i * 6 + 2] = z;
  rainData[i * 6 + 3] = x + .035; rainData[i * 6 + 4] = y - len; rainData[i * 6 + 5] = z + .018;
  rainVelocity[i] = .12 + Math.random() * .14;
}
const rainGeom = new THREE.BufferGeometry();
rainGeom.setAttribute('position', new THREE.BufferAttribute(rainData, 3));
const rain = new THREE.LineSegments(rainGeom, new THREE.LineBasicMaterial({ color: 0xb9d7e5, transparent: true, opacity: .24, depthWrite: false, blending: THREE.AdditiveBlending }));
scene.add(rain);
const snowCount = 850;
const snowCoords = new Float32Array(snowCount * 3);
for (let i = 0; i < snowCount; i++) {
  snowCoords[i * 3] = (Math.random() - .5) * 34;
  snowCoords[i * 3 + 1] = Math.random() * 19;
  snowCoords[i * 3 + 2] = (Math.random() - .5) * 28;
}
const snowGeom = new THREE.BufferGeometry();
snowGeom.setAttribute('position', new THREE.BufferAttribute(snowCoords, 3));
const snow = new THREE.Points(snowGeom, new THREE.PointsMaterial({ color: 0xeaf6fb, size: .09, transparent: true, opacity: .76, depthWrite: false }));
scene.add(snow); snow.visible = false;

// Ambient night lighting.
const hemisphere = new THREE.HemisphereLight(0x9bc6df, 0x26333a, 2.15);
scene.add(hemisphere);
const moon = new THREE.DirectionalLight(0xa8d0ee, 3.35);
moon.position.set(-9, 15, -7); moon.castShadow = true; moon.shadow.mapSize.set(1024, 1024);
moon.shadow.camera.left = -16; moon.shadow.camera.right = 16; moon.shadow.camera.top = 16; moon.shadow.camera.bottom = -16;
scene.add(moon);
const rim = new THREE.PointLight(0x2a7fb9, 1.5, 22);
rim.position.set(9, 5, -7); scene.add(rim);
const cameraFill = new THREE.DirectionalLight(0x8eb9d2, 1.45);
cameraFill.position.set(7, 9, 12); scene.add(cameraFill);

// UI state and smooth light transitions.
const state = { sign: true, room: true, floor: '1', view: 'outside', season: 'autumn', weather: 'rain', time: 'night' };
const sound = createSoundscape(() => state);
const targets = { sign: 1, room: 1 };
let signLevel = 1, roomLevel = 1;
roomLights.forEach(light => { light.userData.onIntensity = light.intensity; });
exteriorLights.forEach(light => { light.userData.onIntensity = light.intensity; });
const firstFacadeNames = new Set(['roof','left facade pier','right facade pier','top facade beam','bottom window sill','left glass','door glass','window mullion','window transom','main neon sign','sign frame','vertical sign','blade sign bracket','rain awning','awning rib']);
const firstFacadeMeshes = shop.children.filter(child => firstFacadeNames.has(child.name));

function bindSwitch(id, key) {
  const button = document.querySelector(id);
  button.addEventListener('click', () => {
    state[key] = !state[key]; targets[key] = state[key] ? 1 : 0;
    button.classList.toggle('is-on', state[key]);
    button.setAttribute('aria-pressed', String(state[key]));
  });
}
bindSwitch('#sign-switch', 'sign');
bindSwitch('#room-switch', 'room');

const rotateButton = document.querySelector('#auto-rotate');
rotateButton.addEventListener('click', () => {
  controls.autoRotate = !controls.autoRotate;
  rotateButton.classList.toggle('is-active', controls.autoRotate);
  rotateButton.setAttribute('aria-pressed', String(controls.autoRotate));
});

function setView() {
  const inside = state.view === 'inside';
  const second = state.floor === '2';
  upper.visible = !(inside && !second);
  upperRoof.visible = !inside;
  upperFacade.visible = !inside;
  chimney.visible = !inside;
  smokeParticles.forEach(particle => { particle.visible = !inside; });
  winterSnow.children.forEach(patch => { if (patch.name === 'roof snow patch') patch.visible = !inside; });
  firstFacadeMeshes.forEach(mesh => { mesh.visible = !(inside && !second); });
  floorPlaque.visible = !(inside && !second);
  controls.autoRotate = false;
  rotateButton.classList.remove('is-active');
  rotateButton.setAttribute('aria-pressed', 'false');
  const portrait = window.innerWidth / window.innerHeight < .72;
  if (inside && second) {
    camera.position.set(portrait ? 13 : 12.2, portrait ? 16.2 : 13.3, portrait ? 19 : 15.2);
    controls.target.set(0, 7.5, .05);
  } else if (inside) {
    camera.position.set(portrait ? 11 : 10.5, portrait ? 10.2 : 8.1, portrait ? 18 : 14);
    controls.target.set(0, 2.6, 0);
  } else if (second) {
    camera.position.set(portrait ? 20 : 16, portrait ? 15 : 11.6, portrait ? 25 : 21);
    controls.target.set(0, 7.2, .25);
  } else {
    camera.position.set(portrait ? 28 : 18, portrait ? 20 : 13, portrait ? 36 : 23);
    controls.target.set(0, 4.2, .4);
  }
  controls.update();
  sound.updateScene();
}
const seasonNames = { spring: '春', summer: '夏', autumn: '秋', winter: '冬' };
const weatherNames = { clear: '晴', rain: '雨', snow: '雪' };
const timeNames = { day: '白天', dusk: '黄昏', night: '夜' };
function applyAtmosphere() {
  const palettes = {
    day: { sky: 0x9db4c1, hemi: 3.1, moon: 4.1, fill: 2.1, lamp: 0, rim: .4 },
    dusk: { sky: 0x4b4b61, hemi: 2.55, moon: 3.3, fill: 1.65, lamp: .42, rim: .85 },
    night: { sky: 0x0d1c27, hemi: 2.15, moon: 3.35, fill: 1.45, lamp: 1, rim: 1.5 },
  };
  const p = palettes[state.time];
  const sunny = state.weather === 'clear' && state.time === 'day';
  const sky = sunny ? 0x83c6f3 : p.sky;
  scene.background.setHex(sky);
  scene.fog.color.setHex(sky);
  scene.fog.density = sunny ? .004 : state.weather === 'clear' ? .013 : state.weather === 'snow' ? .032 : .024;
  hemisphere.color.setHex(sunny ? 0xdcefff : 0x9bc6df);
  hemisphere.groundColor.setHex(sunny ? 0x8b7961 : 0x26333a);
  hemisphere.intensity = sunny ? 3.7 : p.hemi;
  moon.color.setHex(sunny ? 0xffe8af : 0xa8d0ee);
  moon.position.set(sunny ? -8 : -9, sunny ? 18 : 15, sunny ? 11 : -7);
  moon.intensity = sunny ? 5.4 : p.moon;
  cameraFill.color.setHex(sunny ? 0xffe2b9 : 0x8eb9d2);
  cameraFill.intensity = sunny ? 1.6 : p.fill;
  rim.intensity = sunny ? .15 : p.rim;
  renderer.toneMappingExposure = sunny ? 1.28 : state.time === 'day' ? 1.12 : 1.06;
  exteriorLights.forEach(light => { light.intensity = light.userData.onIntensity * p.lamp; });
  streetLampPools.forEach(pool => { pool.opacity = p.lamp * .28; });
  streetLampLenses.forEach(lens => { lens.emissiveIntensity = p.lamp * 4.6; });
  facadeLampLenses.forEach(lens => { lens.emissiveIntensity = p.lamp * 2.5; });
  rain.visible = state.weather === 'rain';
  snow.visible = state.weather === 'snow';
  leaves.visible = state.season !== 'winter';
  leafMat.color.setHex({ spring: 0xab5977, summer: 0x2e6140, autumn: 0x944117, winter: 0x6d5741 }[state.season]);
  winterSnow.visible = state.season === 'winter';
  wetRoad.color.setHex(sunny ? 0xa9b3ae : state.time === 'day' ? 0x687984 : 0x47535b);
  wetRoad.roughness = state.weather === 'clear' ? .84 : state.weather === 'snow' ? .58 : .2;
  wetRoad.metalness = state.weather === 'clear' ? .03 : .36;
  const weatherTime = state.time === 'night' ? `${weatherNames[state.weather]}夜` : `${weatherNames[state.weather]}天 · ${timeNames[state.time]}`;
  document.querySelector('#scene-status').textContent = `${seasonNames[state.season]}日 · ${weatherTime} · 营业中`;
  document.querySelector('#scene-caption').textContent = state.weather === 'rain' ? '一间被雨声包住的小店' : state.weather === 'snow' ? '热串和雪花，都是东北的冬夜' : '炭火还旺，来坐会儿吧';
  document.querySelector('#ambience-caption').textContent = `${state.weather.toUpperCase()} / CHARCOAL / ${state.time.toUpperCase()}`;
  sound.updateScene();
}
document.querySelectorAll('.picker-group').forEach(group => {
  group.addEventListener('click', event => {
    const button = event.target.closest('button[data-value]');
    if (!button || !group.contains(button)) return;
    const key = group.dataset.setting;
    state[key] = button.dataset.value;
    group.querySelectorAll('button').forEach(option => {
      const selected = option === button;
      option.classList.toggle('selected', selected);
      option.setAttribute('aria-pressed', String(selected));
    });
    if (key === 'floor' || key === 'view') setView();
    if (key === 'season' || key === 'weather' || key === 'time') applyAtmosphere();
  });
});
document.querySelector('#reset-view').addEventListener('click', () => {
  state.floor = '1'; state.view = 'outside';
  for (const setting of ['floor','view']) document.querySelectorAll(`.picker-group[data-setting="${setting}"] button`).forEach(option => {
    const selected = option.dataset.value === state[setting];
    option.classList.toggle('selected', selected); option.setAttribute('aria-pressed', String(selected));
  });
  setView();
});
applyAtmosphere();

const panel = document.querySelector('.controls');
const panelToggle = document.querySelector('#panel-toggle');
function setPanelOpen(open) {
  panel.classList.toggle('is-open', open);
  panelToggle.setAttribute('aria-expanded', String(open));
  document.querySelector('#panel-toggle-label').textContent = open ? '收起设置' : '打开设置';
}
panelToggle.addEventListener('click', () => setPanelOpen(!panel.classList.contains('is-open')));

let interacted = false;
controls.addEventListener('start', () => {
  if (!interacted) { interacted = true; document.querySelector('#hint').style.opacity = '.15'; }
  if (window.matchMedia('(max-width: 640px)').matches) setPanelOpen(false);
});

const clock = new THREE.Clock();
function animate() {
  requestAnimationFrame(animate);
  const elapsed = clock.getElapsedTime();
  const positions = rainGeom.attributes.position.array;
  for (let i = 0; rain.visible && i < rainCount; i++) {
    const idx = i * 6;
    positions[idx + 1] -= rainVelocity[i];
    positions[idx + 4] -= rainVelocity[i];
    positions[idx] += .006; positions[idx + 3] += .006;
    if (positions[idx + 1] < -.1) {
      const resetY = 14 + Math.random() * 8;
      const len = .12 + Math.random() * .24;
      positions[idx + 1] = resetY; positions[idx + 4] = resetY - len;
    }
  }
  if (rain.visible) rainGeom.attributes.position.needsUpdate = true;
  if (snow.visible) {
    const flakes = snowGeom.attributes.position.array;
    for (let i = 0; i < snowCount; i++) {
      flakes[i * 3] += Math.sin(elapsed * .7 + i) * .002;
      flakes[i * 3 + 1] -= .018 + (i % 5) * .003;
      if (flakes[i * 3 + 1] < 0) flakes[i * 3 + 1] = 16 + Math.random() * 5;
    }
    snowGeom.attributes.position.needsUpdate = true;
  }

  smokeParticles.forEach((s, i) => {
    s.position.y += .0025 + i * .00005;
    s.position.x += Math.sin(elapsed * .34 + s.userData.phase) * .0015;
    if (s.position.y > 16.3) s.position.y = 12.75;
    const fade = 1 - Math.max(0, (s.position.y - 12.8) / 3.5);
    s.material.opacity = .13 * fade;
  });

  signLevel = THREE.MathUtils.lerp(signLevel, targets.sign, .075);
  roomLevel = THREE.MathUtils.lerp(roomLevel, targets.room, .075);
  signMaterials.forEach((m, i) => { m.emissiveIntensity = .02 + signLevel * (i ? .4 : .47); });
  signLightA.intensity = signLevel * 65; signLightB.intensity = signLevel * 50;
  signPool.opacity = signLevel * .3;
  interiorGlowMaterials.forEach((m, i) => { m.emissiveIntensity = .02 + roomLevel * (i ? 2.5 : .06); });
  roomLights.forEach(l => { l.intensity = roomLevel * l.userData.onIntensity; });
  roomPool.opacity = roomLevel * .32;

  // Imperfect fluorescent/neon shimmer.
  if (state.sign && Math.sin(elapsed * 7.7) > .995) signLightA.intensity *= .72;
  streetBulbMat.emissiveIntensity = (state.time === 'day' ? .05 : state.time === 'dusk' ? .8 : 2.05) + Math.sin(elapsed * 1.6) * .04;

  controls.update();
  renderer.render(scene, camera);
}
animate();

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.fov = camera.aspect < .72 ? 47 : 34;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.8));
});
