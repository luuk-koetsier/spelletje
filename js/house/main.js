/* ============================================================
   HET HUIS VAN SEP — 3D  (Three.js)
   Ontwerp exact overgenomen uit de design-handoff.
   Kamers openen een modal; "Spelen!" start het bijbehorende 2D-spel
   via window.KH.launchGame(id).
   ============================================================ */
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { PAL, toy, soft, blobShadow, shade } from './style.js';
import { buildShell } from './shell.js';
import { makeCat, reactCat, updateCats } from './cats.js';
import { furnishRooms } from './rooms/index.js';
import { buildGarden } from './garden.js';
import { initialTier, applyTier, createGovernor } from './quality.js';

// Alle kleuren komen uit het pastelpalet in style.js.
const COL=PAL;

// Kamericonen staan in icons.js; de kleurhulp shade() in style.js.

const qs=new URLSearchParams(location.search);
const DEBUG=qs.get('debug')==='1';
const dbgEvents=[];
const canvas=document.getElementById('scene');
const renderer=new THREE.WebGLRenderer({canvas,antialias:true,preserveDrawingBuffer:true});
renderer.shadowMap.type=THREE.PCFShadowMap;
renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=0.95;
// Kwaliteit: high (schaduw, scherp) of low (pixelratio 1, geen schaduw). ?q=low forceert low.
const TIER0=initialTier();
applyTier(renderer,TIER0);

const scene=new THREE.Scene();
scene.fog=new THREE.Fog(COL.sky1,30,68);
{const pmrem=new THREE.PMREMGenerator(renderer);
 scene.environment=pmrem.fromScene(new RoomEnvironment(),0.04).texture;
 scene.environmentIntensity=0.35;pmrem.dispose();}

const camera=new THREE.PerspectiveCamera(44,innerWidth/innerHeight,0.5,120); // near 0.5: genoeg diepteprecisie, de kamers liggen dicht achter de gevel
// Camera: iets van rechtsvoor en een tikje van boven. De afstand past zich aan het scherm aan,
// zodat het hele huis (met oren, snorharen en glijbaan) staand op een telefoon in beeld past.
const TARGET=new THREE.Vector3(0.25,5.4,0);
const CAM_DIR=new THREE.Vector3(0.2,0.18,1).normalize();
const HOUSE_HALF={w:5.1,h:6.3};   // halve breedte (kop, kamers, glijbaan) en hoogte (sokkel tot oren) rond TARGET, met marge
const camEnd=new THREE.Vector3();
function fitCamera(){
  const tanV=Math.tan(THREE.MathUtils.degToRad(camera.fov/2)),aspect=innerWidth/innerHeight;
  const dist=Math.max(HOUSE_HALF.h/tanV,HOUSE_HALF.w/(tanV*aspect))+2.0;
  camEnd.copy(TARGET).addScaledVector(CAM_DIR,dist);
  controls.minDistance=Math.min(9,dist*0.6);controls.maxDistance=dist*1.2;
  // Mist pas achter het huis, ook als de camera staand op een telefoon verder weg staat.
  scene.fog.near=dist+8;scene.fog.far=dist+46;
}
const CAM_START=new THREE.Vector3(2,12,40);
camera.position.copy(CAM_START);

const controls=new OrbitControls(camera,canvas);
controls.enableDamping=true;controls.dampingFactor=0.09;controls.enablePan=false;
controls.minPolarAngle=0.25;controls.maxPolarAngle=Math.PI*0.52;
controls.target.copy(TARGET);controls.autoRotate=false;controls.autoRotateSpeed=0.5;
fitCamera();

// Licht: warme hemel met roze grondkleur en één warme zon. Alleen de zon werpt schaduw (in high).
scene.add(new THREE.HemisphereLight(0xFFF1E2,0xF2C9DC,0.8));
const key=new THREE.DirectionalLight(0xFFE3BF,1.35);
key.position.set(9,13,7.5);
key.shadow.mapSize.set(1024,1024);key.shadow.bias=-0.0005;key.shadow.normalBias=0.03;key.shadow.radius=3;
const scq=key.shadow.camera;scq.near=1;scq.far=40;scq.left=-11;scq.right=11;scq.top=13;scq.bottom=-6;
scene.add(key);scene.add(key.target);key.target.position.set(0,3,0);
// Houdt het apparaat het niet bij, dan eenmalig omlaag naar low (nooit terug).
const gov=createGovernor(renderer,t=>{key.castShadow=t==='high';},TIER0);
key.castShadow=gov.tier==='high';


// ─────────── de huisvorm: een kattenhuis met acht kamers (shell.js)
const shell=buildShell(scene);
const house=shell.group, door=shell.door, anchors=shell.anchors;
const hitboxes=[...shell.slots.map(s=>s.hit),shell.doorHit];
// Oude kamermaat, alleen nog voor de oude inrichting hieronder (die verdwijnt in Taak 7).
const COLW=2.3, FH=2.0, RD=1.9, T=0.16;
// Per kamer een groep voor spulletjes. De oorsprong ligt zo dat de oude inrichting op de vloer
// en tegen de achterwand van de nieuwe plek staat.
const roomObjs=shell.slots.map(s=>{
  const room=s.hit.userData.room;
  const g=new THREE.Group();g.position.set(s.center.x,s.floorY+FH/2-T*0.6,s.center.z-s.size.z/2+RD/2-T*0.7);house.add(g);
  s.hit.userData.group=g;
  return {room,slot:s,group:g,baseZ:g.position.z,hover:0};
});

// ─────────── katten: één stijl, elf stuks (cats.js)
// Acht bewoners (één per kamer, met een accessoire dat bij de kamer past), Mauwtje bij de deur
// en twee katten in de tuin. De bewoners staan voorlopig op de vloer naast het kamermidden
// (Taak 7 zet ze op hun plek); zo blijft het midden van de kamer vrij om de kamer te openen.
const RESIDENTS={
  memory:   {fur:'#EADBC8',belly:'#FFF8EE',pose:'sit', accessory:'bow'},      // spelletjeskamer
  puzzel:   {fur:'#F2C98A',belly:'#FFF4E0',pose:'sit', accessory:'scarf'},    // hobbyzolder
  vormen:   {fur:'#C9B2F2',belly:'#F7F1FF',pose:'sit', accessory:'glasses'},  // klaslokaaltje
  tellen:   {fur:'#4E4856',belly:'#ECE6F0',pose:'stand',accessory:'none'},    // aquariumkamer
  kleuren:  {fur:'#FFFFFF',belly:'#FFE6EF',pose:'play',accessory:'brush'},    // atelier
  verkleden:{fur:'#F7B6CF',belly:'#FFF0F6',pose:'sit', accessory:'hat'},      // kleedkamer
  speel:    {fur:'#B98A64',belly:'#F5E4CF',pose:'play',accessory:'crown'},    // mini-circus
  stickers: {fur:'#A9B1BE',belly:'#F1F3F6',pose:'loaf',accessory:'none'},     // slaapkamertje
};
const SIT_H=0.98;                                   // hoogte van een zittende kat in cats.js (met oren)
const catHits=[];
function placeCat(spec,pos,scale,roty){
  const c=makeCat(spec);c.position.copy(pos);c.scale.setScalar(scale);c.rotation.y=roty||0;
  scene.add(c);catHits.push(c.userData.hit);return c;
}
for(const s of shell.slots){const r=RESIDENTS[s.id];if(!r)continue;
  const c=placeCat({id:s.id,...r},new THREE.Vector3(s.center.x-0.62,s.floorY,s.center.z),s.size.y*0.45/SIT_H,0.2);
  c.userData.room=s.id;c.userData.hit.userData.catRoom=s.id;}
placeCat({id:'mauwtje',fur:'#FFB35C',belly:'#FFD9A8',pose:'sit',accessory:'none'},anchors.mauwtje,0.95,0.15);
placeCat({id:'tuin1',fur:'#E3DCD6',belly:'#FFFFFF',pose:'play',accessory:'none'},new THREE.Vector3(-3.5,-0.2,2.3),0.8,0.5);
placeCat({id:'tuin2',fur:'#6E6672',belly:'#EDE8EE',pose:'stand',accessory:'none'},new THREE.Vector3(3.15,-0.2,2.85),0.8,-0.5);
hitboxes.unshift(...catHits);
// Groot zacht vlekje onder het huis.
{const b=blobShadow(6.2,0.28);b.scale.set(6.2,1,2.6);b.position.set(0,-0.18,0.3);scene.add(b);}

// ─────────── tuin en lucht: gras, pad, hekje, struiken, bloemen, hondenhok, wolken en flyers (garden.js)
const garden=buildGarden(scene,anchors);

(()=>{
  const triS=(()=>{const s=new THREE.Shape();s.moveTo(-0.07,0);s.lineTo(0.07,0);s.lineTo(0,-0.17);s.closePath();return new THREE.ShapeGeometry(s);})();
  for(const r of roomObjs){
    const cu=new THREE.QuadraticBezierCurve3(
      new THREE.Vector3(-COLW*0.36,FH*0.30,RD*0.18),
      new THREE.Vector3(0,FH*0.19,RD*0.20),
      new THREE.Vector3(COLW*0.36,FH*0.30,RD*0.18));
    const ln=new THREE.Mesh(new THREE.TubeGeometry(cu,12,0.012,5,false),soft('#fff'));r.group.add(ln);
    for(let i=0;i<4;i++){const pt=cu.getPoint(0.16+0.68*i/3);
      const f=new THREE.Mesh(triS,new THREE.MeshStandardMaterial({color:i%2?'#ffffff':shade(r.room.color,-0.12),side:THREE.DoubleSide,roughness:0.85}));
      f.position.copy(pt);r.group.add(f);}
    const ball=new THREE.Mesh(new THREE.SphereGeometry(0.13,14,12),toy(shade(r.room.color,0.1)));
    ball.position.set(-COLW*0.28,-FH/2+T*0.6+0.13,RD*0.2);ball.castShadow=true;r.group.add(ball);
  }
})();
// ─────────── ingerichte kamers: een eigen thema met spulletjes per kamer
(()=>{
  const fy=-FH/2+T*0.6+0.02;                       // vloerhoogte binnen een kamer
  const RB=(w,h,d,rad,col,gl)=>new THREE.Mesh(new RoundedBoxGeometry(w,h,d,3,rad),toy(col,{gloss:gl??0.5}));
  const CY=(rt,rb,h,col,gl)=>new THREE.Mesh(new THREE.CylinderGeometry(rt,rb,h,16),toy(col,{gloss:gl??0.5}));
  const SP=(r,col,gl)=>new THREE.Mesh(new THREE.SphereGeometry(r,14,12),toy(col,{gloss:gl??0.5}));
  const CO=(r,h,col,gl)=>new THREE.Mesh(new THREE.ConeGeometry(r,h,16),toy(col,{gloss:gl??0.5}));
  const at=(g,m,x,y,z,ry)=>{m.position.set(x,fy+y,z);if(ry)m.rotation.y=ry;m.castShadow=true;m.receiveShadow=true;g.add(m);return m;};
  // ── wanddecoratie: geschilderde mini-schilderijtjes (canvas-textuur) ──
  const wallZ=-RD/2+T*0.7+0.02;
  function star2(c,cx,cy,R){c.beginPath();for(let i=0;i<10;i++){const a=-Math.PI/2+i*Math.PI/5,rad=i%2?R*0.45:R;c.lineTo(cx+Math.cos(a)*rad,cy+Math.sin(a)*rad);}c.closePath();c.fill();}
  function artTex(kind,bg){
    const S=128,cv=document.createElement('canvas');cv.width=cv.height=S;const c=cv.getContext('2d');
    c.fillStyle=bg;c.fillRect(0,0,S,S);c.lineCap='round';c.lineJoin='round';
    if(kind==='cat'){c.fillStyle=COL.orange;c.beginPath();c.arc(64,74,32,0,7);c.fill();
      c.beginPath();c.moveTo(40,54);c.lineTo(32,26);c.lineTo(58,48);c.fill();c.beginPath();c.moveTo(88,54);c.lineTo(96,26);c.lineTo(70,48);c.fill();
      c.fillStyle='#2A2320';c.beginPath();c.arc(53,70,5,0,7);c.fill();c.beginPath();c.arc(75,70,5,0,7);c.fill();c.fillStyle=COL.pink;c.beginPath();c.arc(64,82,4,0,7);c.fill();}
    else if(kind==='landscape'){c.fillStyle=COL.yellow;c.beginPath();c.arc(98,32,15,0,7);c.fill();
      c.fillStyle=shade(COL.green,-0.08);c.beginPath();c.moveTo(0,128);c.quadraticCurveTo(50,86,128,128);c.fill();
      c.fillStyle=COL.green;c.beginPath();c.moveTo(0,128);c.quadraticCurveTo(80,100,128,128);c.fill();}
    else if(kind==='flower'){c.strokeStyle=COL.green;c.lineWidth=6;c.beginPath();c.moveTo(64,122);c.lineTo(64,64);c.stroke();
      c.fillStyle=COL.coral;for(let i=0;i<6;i++){const a=i/6*Math.PI*2;c.beginPath();c.ellipse(64+Math.cos(a)*20,54+Math.sin(a)*20,11,11,0,0,7);c.fill();}
      c.fillStyle=COL.yellow;c.beginPath();c.arc(64,54,12,0,7);c.fill();}
    else if(kind==='rainbow'){[COL.coral,COL.orange,COL.yellow,COL.green,COL.blue].forEach((rc,i)=>{c.strokeStyle=rc;c.lineWidth=8;c.beginPath();c.arc(64,112,18+i*10,Math.PI,0);c.stroke();});}
    else if(kind==='heart'){c.fillStyle=COL.pink;c.beginPath();c.moveTo(64,104);c.bezierCurveTo(6,62,30,18,64,50);c.bezierCurveTo(98,18,122,62,64,104);c.fill();}
    else if(kind==='stars'){c.fillStyle=COL.yellow;star2(c,44,46,16);star2(c,88,64,12);star2(c,60,92,10);}
    else if(kind==='balloon'){[[46,COL.coral],[82,COL.blue]].forEach(([x,col])=>{c.fillStyle=col;c.beginPath();c.ellipse(x,50,17,21,0,0,7);c.fill();c.strokeStyle='#fff';c.lineWidth=2;c.beginPath();c.moveTo(x,71);c.lineTo(64,120);c.stroke();});}
    else {const cols=[COL.coral,COL.blue,COL.green,COL.yellow,COL.purple];for(let i=0;i<8;i++){c.fillStyle=cols[i%5];c.beginPath();c.arc(22+((i*37)%84),24+((i*53)%80),9+(i%3)*4,0,7);c.fill();}}
    const t=new THREE.CanvasTexture(cv);t.colorSpace=THREE.SRGBColorSpace;t.anisotropy=4;return t;
  }
  function painting(g,x,yf,w,h,kind,bg){
    at(g,RB(w+0.07,h+0.07,0.025,0.015,'#fff'),x,yf,wallZ);
    const art=new THREE.Mesh(new THREE.PlaneGeometry(w,h),new THREE.MeshStandardMaterial({map:artTex(kind,bg),roughness:0.85}));
    art.position.set(x,fy+yf,wallZ+0.016);g.add(art);
  }
  function plant(g,x,z){
    at(g,CY(0.1,0.13,0.16,COL.coral),x,0.08,z);
    at(g,SP(0.16,COL.green),x,0.26,z);at(g,SP(0.1,shade(COL.green,0.12)),x-0.08,0.32,z);at(g,SP(0.1,shade(COL.green,-0.06)),x+0.09,0.3,z);
  }
  function stool(g,x,z,col){
    for(const [sx,sz] of [[-0.06,-0.06],[0.06,-0.06],[-0.06,0.06],[0.06,0.06]]){const leg=new THREE.Mesh(new THREE.CylinderGeometry(0.014,0.014,0.16,6),toy(COL.wood));leg.position.set(x+sx,fy+0.08,z+sz);leg.castShadow=true;g.add(leg);}
    at(g,CY(0.12,0.12,0.04,col),x,0.18,z);
  }
  const ART={Memory:['cat','stars'],Puzzel:['abstract','balloon'],Vormen:['abstract','rainbow'],Tellen:['landscape','stars'],Kleuren:['rainbow','flower'],Verkleden:['heart','stars'],Speelkamer:['balloon','cat'],Stickers:['stars','rainbow']};
  const B={
    Memory(g){ // speelkaart-tafeltje + dobbelsteen
      at(g,CY(0.055,0.07,0.26,COL.wood),-0.58,0.13,-0.42);
      at(g,CY(0.26,0.26,0.05,shade(COL.pink,0.14)),-0.58,0.28,-0.42);
      at(g,RB(0.16,0.02,0.22,0.02,'#fff',0.8),-0.66,0.31,-0.42,0.3);
      at(g,RB(0.16,0.02,0.22,0.02,'#fff',0.8),-0.5,0.31,-0.4,-0.25);
      const die=at(g,RB(0.13,0.13,0.13,0.03,'#fff',0.8),-0.28,0.31,-0.3,0.4);
      for(const [dx,dz] of [[0,0],[-0.035,-0.035],[0.035,0.035]]){const pip=SP(0.014,COL.pinkD);pip.position.set(die.position.x+dx,die.position.y+0.066,-0.24+dz);g.add(pip);}
    },
    Puzzel(g){ // speelgoedkist met blokken
      at(g,RB(0.5,0.32,0.34,0.05,COL.woodD,0.3),-0.5,0.16,-0.4);
      const lid=at(g,RB(0.52,0.06,0.36,0.04,shade(COL.woodD,0.12)),-0.5,0.34,-0.55);lid.rotation.x=-0.7;
      [COL.coral,COL.blue,COL.green,COL.yellow].forEach((c,i)=>{const b=at(g,RB(0.13,0.13,0.13,0.03,c),-0.64+i*0.09,0.39+(i%2)*0.03,-0.32,0.3+i*0.2);});
    },
    Vormen(g){ // vormen-sorteerkubus + losse vorm
      at(g,RB(0.42,0.34,0.34,0.05,shade(COL.coral,0.16)),-0.5,0.17,-0.4);
      const circ=new THREE.Mesh(new THREE.CircleGeometry(0.06,18),toy(COL.yellow));circ.position.set(-0.63,fy+0.2,-0.223);g.add(circ);
      const tri=new THREE.Mesh(new THREE.CircleGeometry(0.075,3),toy(COL.blue));tri.position.set(-0.5,fy+0.2,-0.223);g.add(tri);
      const sq=new THREE.Mesh(new THREE.PlaneGeometry(0.1,0.1),toy(COL.green));sq.position.set(-0.37,fy+0.2,-0.223);g.add(sq);
      const star=at(g,CO(0.09,0.14,COL.purple),-0.5,0.42,-0.4);star.rotation.set(0.25,0,0.1);
      at(g,RB(0.12,0.12,0.12,0.02,COL.pink),-0.24,0.06,-0.3,0.5);
    },
    Tellen(g){ // telraam met kraaltjes
      at(g,RB(0.52,0.4,0.07,0.04,COL.wood),-0.44,0.24,-0.42);
      const bcols=[COL.coral,COL.yellow,COL.green,COL.blue,COL.purple];
      for(let row=0;row<3;row++){const ry=0.12+row*0.12;
        const rod=new THREE.Mesh(new THREE.CylinderGeometry(0.008,0.008,0.44,6),toy('#fff',{gloss:0.8}));rod.rotation.z=Math.PI/2;rod.position.set(-0.44,fy+ry,-0.38);g.add(rod);
        for(let bd=0;bd<5;bd++){const bead=SP(0.035,bcols[(bd+row)%5]);bead.position.set(-0.62+bd*0.09,fy+ry,-0.38);bead.castShadow=true;g.add(bead);}}
    },
    Kleuren(g){ // schildersezel + verfpotje
      for(const s of [-1,1]){const leg=new THREE.Mesh(new THREE.CylinderGeometry(0.02,0.02,0.5,8),toy(COL.wood));leg.position.set(-0.5+s*0.13,fy+0.25,-0.4);leg.rotation.z=s*0.14;leg.castShadow=true;g.add(leg);}
      const back=new THREE.Mesh(new THREE.CylinderGeometry(0.02,0.02,0.5,8),toy(COL.wood));back.position.set(-0.5,fy+0.25,-0.47);back.rotation.x=0.24;g.add(back);
      at(g,RB(0.3,0.26,0.03,0.01,'#fff'),-0.5,0.34,-0.36);
      const blob=new THREE.Mesh(new THREE.CircleGeometry(0.06,14),toy(COL.pink));blob.position.set(-0.52,fy+0.36,-0.343);g.add(blob);
      const blob2=new THREE.Mesh(new THREE.CircleGeometry(0.04,14),toy(COL.blue));blob2.position.set(-0.44,fy+0.3,-0.343);g.add(blob2);
      at(g,CY(0.05,0.06,0.1,COL.green),-0.24,0.05,-0.32);
    },
    Verkleden(g){ // kledingrek met hangertjes + hoge hoed
      for(const s of [-1,1]){const post=new THREE.Mesh(new THREE.CylinderGeometry(0.018,0.018,0.5,8),toy('#fff'));post.position.set(-0.5+s*0.24,fy+0.25,-0.42);post.castShadow=true;g.add(post);}
      const bar=new THREE.Mesh(new THREE.CylinderGeometry(0.015,0.015,0.52,8),toy(COL.yellow,{gloss:0.8}));bar.rotation.z=Math.PI/2;bar.position.set(-0.5,fy+0.5,-0.42);g.add(bar);
      for(const [dx,c] of [[-0.13,COL.coral],[0.11,COL.blue]]){
        const hook=new THREE.Mesh(new THREE.TorusGeometry(0.028,0.006,6,12,Math.PI),toy('#ccc',{gloss:0.8}));hook.position.set(-0.5+dx,fy+0.5,-0.42);g.add(hook);
        at(g,RB(0.16,0.22,0.05,0.03,c),-0.5+dx,0.36,-0.42);}
      at(g,CY(0.14,0.14,0.03,'#26241f'),-0.16,0.02,-0.3);
      at(g,CY(0.093,0.093,0.04,COL.pink),-0.16,0.06,-0.3);
      at(g,CY(0.09,0.09,0.17,'#26241f'),-0.16,0.14,-0.3);
    },
    Speelkamer(g){ // trommel met stokjes + tol
      at(g,CY(0.2,0.2,0.24,COL.coral),-0.5,0.14,-0.4);
      for(const yy of [0.02,0.26]){const rim=new THREE.Mesh(new THREE.TorusGeometry(0.2,0.02,8,22),toy('#fff'));rim.rotation.x=Math.PI/2;rim.position.set(-0.5,fy+yy,-0.4);g.add(rim);}
      for(const [dx,rz] of [[-0.06,0.5],[0.06,-0.5]]){const stick=new THREE.Mesh(new THREE.CylinderGeometry(0.012,0.012,0.3,6),toy(COL.wood));stick.position.set(-0.5+dx,fy+0.36,-0.32);stick.rotation.z=rz;stick.castShadow=true;g.add(stick);const knob=SP(0.03,COL.wood);knob.position.set(-0.5+dx*2.6,fy+0.49,-0.32);g.add(knob);}
      const top=at(g,CO(0.1,0.17,COL.blue),-0.2,0.11,-0.3);top.rotation.x=Math.PI;
      at(g,CY(0.014,0.014,0.06,COL.yellow),-0.2,0.21,-0.3);
    },
    Stickers(g){ // wandplank met trofee + sterren
      at(g,RB(0.72,0.04,0.16,0.02,'#fff'),0,0.56,-0.5);
      for(const s of [-1,1]){const br=at(g,RB(0.03,0.12,0.12,0.01,'#fff'),s*0.3,0.5,-0.52);}
      at(g,CY(0.07,0.09,0.05,COL.yellow,0.9),-0.26,0.62,-0.5);
      at(g,CY(0.02,0.02,0.06,COL.yellow,0.9),-0.26,0.67,-0.5);
      at(g,CY(0.11,0.06,0.11,COL.yellow,0.9),-0.26,0.75,-0.5);
      for(const s of [-1,1]){const h=new THREE.Mesh(new THREE.TorusGeometry(0.045,0.012,6,12),toy(COL.yellow,{gloss:0.9}));h.position.set(-0.26+s*0.12,fy+0.75,-0.5);h.rotation.y=Math.PI/2;g.add(h);}
      for(const [dx,c] of [[0.06,COL.coral],[0.2,COL.blue],[0.33,COL.green]]){const st=new THREE.Mesh(new THREE.OctahedronGeometry(0.05),toy(c));st.position.set(dx,fy+0.63,-0.5);st.castShadow=true;g.add(st);}
    },
  };
  for(const r of roomObjs){
    const b=B[r.room.name];if(b)b(r.group);
    const [m1,m2]=ART[r.room.name]||['abstract','stars'];
    painting(r.group,-0.72,1.12,0.34,0.28,m1,shade(r.room.color,0.32));
    painting(r.group,0.72,1.0,0.32,0.26,m2,'#FFF7EE');
    plant(r.group,0.82,0.5);
    stool(r.group,-0.82,0.5,shade(r.room.color,0.1));
  }
})();

const raycaster=new THREE.Raycaster();const ndc=new THREE.Vector2();
let hovered=null,started=false,paused=false;
const tip=document.getElementById('tip');
function castAt(clientX,clientY){
  ndc.x=(clientX/innerWidth)*2-1;ndc.y=-(clientY/innerHeight)*2+1;
  raycaster.setFromCamera(ndc,camera);
  const hits=raycaster.intersectObjects(hitboxes,false),first=hits[0]||null;
  // Een bewoner-kat gaat voor zijn eigen kamer: een tik op de kat opent de kamer niet.
  if(first&&first.object.userData.room){const id=first.object.userData.room.id;
    const c=hits.find(h=>h.object.userData.catRoom===id);if(c)return c;}
  return first;
}
let px0=0,py0=0,pt0=0,moved=false;
canvas.addEventListener('pointerdown',e=>{px0=e.clientX;py0=e.clientY;pt0=performance.now();moved=false;
  if(!started){started=true;controls.autoRotate=false;document.getElementById('hint').style.opacity='0';}});
canvas.addEventListener('pointermove',e=>{
  if(paused)return;
  if(e.buttons){if(Math.hypot(e.clientX-px0,e.clientY-py0)>7)moved=true;}
  const hit=castAt(e.clientX,e.clientY);
  const obj=hit?hit.object:null;
  if(obj!==hovered){hovered=obj;}
  if(obj&&obj.userData.room){
    tip.textContent=obj.userData.room.name;tip.style.left=e.clientX+'px';tip.style.top=e.clientY+'px';tip.style.opacity='1';
    canvas.style.cursor='pointer';
  } else if(obj&&obj.userData.catHit){tip.style.opacity='0';canvas.style.cursor='pointer';}
  else if(obj&&obj.userData.doorHit){tip.textContent='Welkom!';tip.style.left=e.clientX+'px';tip.style.top=e.clientY+'px';tip.style.opacity='1';canvas.style.cursor='pointer';}
  else {tip.style.opacity='0';canvas.style.cursor='grab';}
});
canvas.addEventListener('pointerup',e=>{
  if(paused)return;
  const quick=performance.now()-pt0<450;
  if(!moved&&quick){const hit=castAt(e.clientX,e.clientY);
    if(hit&&hit.object.userData.catHit){tapCat(hit.object.userData.catHit);}
    else if(hit&&hit.object.userData.room){openRoom(hit.object.userData.room);}
    else if(hit&&hit.object.userData.doorHit){dbgEvents.push('door');bounceDoor();meow();}}
});
canvas.addEventListener('pointerleave',()=>{tip.style.opacity='0';hovered=null;});

let doorBounce=0;function bounceDoor(){doorBounce=1;}
// Tik op een kat: sprongetje en miauw. Mauwtje is ook een verrassing (Taak 9).
function tapCat(c){const id=c.userData.catId;dbgEvents.push(id==='mauwtje'?'surprise:mauwtje':'cat:'+id);reactCat(c);}

const modal=document.getElementById('modal');
let currentRoom=null;
function openRoom(room){
  currentRoom=room;dbgEvents.push('open:'+room.id);
  document.getElementById('cardTitle').textContent=room.name;
  document.getElementById('cardText').textContent=roomBlurb(room.name);
  const em=document.getElementById('cardEmoji');em.style.background=room.color;
  em.innerHTML=iconSVG(room.icon);
  document.getElementById('cardHalo').style.background=room.color;
  const play=document.getElementById('cardPlay');play.style.background=room.color;play.style.boxShadow=`0 6px 0 ${shade(room.color,-0.18)}, 0 10px 20px rgba(0,0,0,.2)`;
  modal.classList.add('open');confetti(room.color);pop();
}
document.getElementById('cardClose').onclick=()=>modal.classList.remove('open');
document.getElementById('cardPlay').onclick=()=>{
  modal.classList.remove('open');
  if(currentRoom&&window.KH)window.KH.launchGame(currentRoom.id);
};
modal.addEventListener('pointerdown',e=>{if(e.target===modal)modal.classList.remove('open');});

function roomBlurb(n){return ({
  Memory:'Vind de dezelfde kaartjes! Klaar om te spelen?',
  Puzzel:'Leg de stukjes op de goede plek!',
  Vormen:'Ken jij alle vormen? Kom binnen!',
  Tellen:'1, 2, 3… tel je mee?',
  Kleuren:'Kies je kleuren en maak iets moois!',
  Verkleden:'Kies een leuke outfit voor de poes!',
  Speelkamer:'De leukste kamer van het huis!',
  Stickers:'Verzamel glimmende stickers!'})[n]||'Klaar om te spelen?';}

function iconSVG(k){const p={
  memory:'<rect x="4" y="4" width="7" height="9" rx="1.5"/><rect x="13" y="9" width="7" height="9" rx="1.5"/>',
  puzzle:'<path d="M5 8h3a2 2 0 114 0h3v3a2 2 0 110 4v3H5v-3a2 2 0 100-4z"/>',
  shapes:'<circle cx="8" cy="8" r="3.5"/><path d="M15 5l3.5 6h-7z"/><rect x="12" y="13" width="7" height="6" rx="1"/>',
  count:'<path d="M6 8l2-1v9M12 8a2 2 0 114 1.5L12 16h5M4 20h16"/>',
  palette:'<path d="M12 4a8 7 0 100 14 2 2 0 002-2 1.5 1.5 0 011.5-1.5H18a3 3 0 003-3A7 6 0 0012 4z"/><circle cx="8" cy="9" r="1"/><circle cx="12" cy="7" r="1"/><circle cx="15" cy="9" r="1"/>',
  dressup:'<path d="M9 4l-4 3 2 3 2-1v9h6V9l2 1 2-3-4-3a3 3 0 01-6 0z"/>',
  play:'<circle cx="12" cy="12" r="8"/><path d="M12 4a8 8 0 010 16M4 12h16"/>',
  sticker:'<path d="M12 3l2.5 5 5.5.8-4 4 1 5.4-5-2.6-5 2.6 1-5.4-4-4 5.5-.8z"/>'}[k]||'';
  return `<svg viewBox="0 0 24 24">${p}</svg>`;}

function confetti(only){
  const layer=document.getElementById('confetti');const cs=only?[only,shade(only,0.2),'#fff']:[COL.coral,COL.blue,COL.yellow,COL.green,COL.pink,COL.purple];
  for(let i=0;i<80;i++){const d=document.createElement('div');d.className='conf';
    d.style.left=Math.random()*100+'%';d.style.background=cs[i%cs.length];
    d.style.borderRadius=Math.random()>0.5?'50%':'2px';
    const dur=1.4+Math.random()*1.3;d.style.animation=`fall ${dur}s cubic-bezier(.3,.6,.6,1) ${Math.random()*0.3}s forwards`;
    d.style.transform=`translateY(-20px)`;layer.appendChild(d);setTimeout(()=>d.remove(),(dur+0.4)*1000);}
}

function pop(){ if(window.KH&&window.KH.sound)window.KH.pop(); }
function meow(){ if(window.KH&&window.KH.sound)window.KH.meow(); }

const soundBtn=document.getElementById('soundBtn');
soundBtn.onclick=()=>{const on=window.KH?window.KH.toggleSound():true;soundBtn.querySelector('svg').innerHTML=on
  ?'<path d="M4 9v6h4l5 4V5L8 9H4z"/><path d="M16 9a3 3 0 010 6M18.5 7a6 6 0 010 10"/>'
  :'<path d="M4 9v6h4l5 4V5L8 9H4z"/><path d="M17 9l4 6M21 9l-4 6"/>';if(on)pop();};
document.getElementById('homeBtn').onclick=()=>{resetCam=1;started=true;controls.autoRotate=false;};

let resetCam=0,introT=0;const clock=new THREE.Clock();
function animate(){
  requestAnimationFrame(animate);
  if(paused){return;}
  const rawDt=clock.getDelta();gov.tick(rawDt);
  const dt=Math.min(rawDt,0.05);const t=clock.elapsedTime;
  if(introT<1){introT=Math.min(1,introT+dt/1.7);const e=1-Math.pow(1-introT,3);
    camera.position.lerpVectors(CAM_START,camEnd,e);camera.lookAt(TARGET);
    if(introT>=1){controls.update();}
  } else if(resetCam>0){resetCam=Math.max(0,resetCam-dt/0.9);
    camera.position.lerp(camEnd,0.08);controls.target.lerp(TARGET,0.1);controls.update();
  } else {controls.update();}

  for(const r of roomObjs){
    const want=(hovered&&hovered.userData.group===r.group)?1:0;
    r.hover+=(want-r.hover)*Math.min(1,dt*12);
    r.group.position.z=r.baseZ+r.hover*0.16;
    r.group.scale.setScalar(1+r.hover*0.03);
  }
  if(doorBounce>0){doorBounce=Math.max(0,doorBounce-dt/0.5);const s=Math.sin(doorBounce*Math.PI);door.position.y=door.userData.baseY+s*0.12;door.rotation.z=Math.sin(doorBounce*Math.PI*3)*0.04*s;}

  updateCats(dt,t);
  garden.update(t);
  renderer.render(scene,camera);
}

addEventListener('resize',()=>{camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight);
  refitCamera();});
// Na draaien of formaatwissel: zelfde kijkhoek houden, maar de afstand opnieuw passend maken,
// zodat het huis na liggend naar staand weer helemaal in beeld staat (ook buiten de testmodus).
function refitCamera(){
  fitCamera();
  if(introT<1)return; // de intro vliegt zelf naar camEnd
  const off=camera.position.clone().sub(controls.target);
  if(off.lengthSq()<1e-6)off.copy(CAM_DIR);
  controls.target.copy(TARGET);
  camera.position.copy(TARGET).addScaledVector(off.normalize(),camEnd.distanceTo(TARGET));
  controls.update();
}
renderer.setSize(innerWidth,innerHeight);

// bridge naar de 2D-spellen: pauzeer/hervat de 3D-render
window.__hub3d={
  pause(){paused=true;},
  resume(){paused=false;clock.getDelta();resetCam=1;started=true;controls.autoRotate=false;
    camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight);fitCamera();},
};

await document.fonts.ready.catch(()=>{});
if(DEBUG){
  // Testhook (alleen met ?debug=1): vaste camera, geen intro en geen automatisch draaien.
  introT=1;started=true;controls.autoRotate=false;camera.position.copy(camEnd);camera.lookAt(TARGET);controls.update();
  const pt=(o)=>{camera.updateMatrixWorld();const v=o.getWorldPosition(new THREE.Vector3()).project(camera);
    return {x:Math.round((v.x+1)/2*innerWidth),y:Math.round((1-v.y)/2*innerHeight)};};
  // Schermrechthoek (w,h in px) van de voorkant van een tikvlak.
  const rect=(o)=>{camera.updateMatrixWorld();o.geometry.computeBoundingBox();const b=o.geometry.boundingBox;
    let x0=1e9,y0=1e9,x1=-1e9,y1=-1e9;
    for(const [x,y] of [[b.min.x,b.min.y],[b.max.x,b.min.y],[b.min.x,b.max.y],[b.max.x,b.max.y]]){
      const v=o.localToWorld(new THREE.Vector3(x,y,b.max.z)).project(camera);
      const sx=(v.x+1)/2*innerWidth,sy=(1-v.y)/2*innerHeight;
      x0=Math.min(x0,sx);x1=Math.max(x1,sx);y0=Math.min(y0,sy);y1=Math.max(y1,sy);}
    // Alleen het deel dat op het scherm valt telt.
    x0=Math.max(0,x0);y0=Math.max(0,y0);x1=Math.min(innerWidth,x1);y1=Math.min(innerHeight,y1);
    return {w:Math.max(0,Math.round(x1-x0)),h:Math.max(0,Math.round(y1-y0))};};
  const visBox=(root,skip)=>{const b=new THREE.Box3(),m=new THREE.Box3();
    root.traverse(o=>{if(o.isMesh&&o.visible&&o!==skip)b.union(m.setFromObject(o));});return b;};
  const fire=(type,x,y,buttons)=>canvas.dispatchEvent(new PointerEvent(type,{pointerId:1,pointerType:'touch',isPrimary:true,
    clientX:x,clientY:y,buttons,button:0,bubbles:true,cancelable:true}));
  window.__house={
    ready:false,events:dbgEvents,
    info(){const i=renderer.info.render;return {calls:i.calls,triangles:i.triangles,tier:gov.tier};},
    rooms(){return hitboxes.filter(h=>h.userData.room).map(h=>({id:h.userData.room.id,...pt(h),...rect(h)}));},
    door(){return pt(hitboxes.find(h=>h.userData.doorHit));},
    // Wereldomhullende van de zichtbare delen (zonder schaduwvlekje en tikvlak).
    // Katten: id, tikpunt op het scherm, bovenkant en hoogte, en bij een bewoner de kamerhoogte.
    cats(){const out=[];scene.updateMatrixWorld(true);
      scene.traverse(o=>{if(!o.userData||o.userData.catId===undefined)return;const b=visBox(o,o.userData.shadow);
        const s=shell.slots.find(q=>q.id===o.userData.room);
        out.push({id:o.userData.catId,room:o.userData.room||null,...pt(o.userData.hit),top:b.max.y,height:b.max.y-b.min.y,roomH:s?s.size.y:null,jumpY:o.userData.pivot.position.y});});
      return out;},
    doorBox(){scene.updateMatrixWorld(true);const b=visBox(door);return {top:b.max.y,bottom:b.min.y};},
    // Ankerpunten van de huisvorm, als schermpunten.
    anchors(){const out={};for(const [k,v] of Object.entries(anchors)){camera.updateMatrixWorld();const q=v.clone().project(camera);
      out[k]={x:Math.round((q.x+1)/2*innerWidth),y:Math.round((1-q.y)/2*innerHeight)};}return out;},
    // Schermrechthoek van de hele huisvorm (alle 8 hoeken van de omhullende doos).
    // Schermrechthoek van de zichtbare huisvorm: elk hoekpunt van elke zichtbare mesh geprojecteerd.
    bounds(){camera.updateMatrixWorld();house.updateMatrixWorld(true);let x0=1e9,y0=1e9,x1=-1e9,y1=-1e9;const v=new THREE.Vector3();
      house.traverse(o=>{if(!o.isMesh||!o.visible)return;const pos=o.geometry.attributes.position;
        for(let i=0;i<pos.count;i++){v.fromBufferAttribute(pos,i).applyMatrix4(o.matrixWorld).project(camera);
          const sx=(v.x+1)/2*innerWidth,sy=(1-v.y)/2*innerHeight;if(sx<x0)x0=sx;if(sx>x1)x1=sx;if(sy<y0)y0=sy;if(sy>y1)y1=sy;}});
      return {x0:Math.round(x0),y0:Math.round(y0),x1:Math.round(x1),y1:Math.round(y1)};},
    tap(x,y){fire('pointerdown',x,y,1);fire('pointerup',x,y,0);},
    drag(x0,y0,x1,y1){fire('pointerdown',x0,y0,1);
      for(let i=1;i<=6;i++)fire('pointermove',x0+(x1-x0)*i/6,y0+(y1-y0)*i/6,1);
      fire('pointerup',x1,y1,0);},
    frame(){camera.updateMatrixWorld();renderer.render(scene,camera);},
    stageB:'pending',
    assets(){return assetInfo();},
    // Tuin: de flyers (schermpunt), het hondenhok en zijn anker, en wat de tuin kost aan draw calls.
    garden(){camera.updateMatrixWorld();scene.updateMatrixWorld(true);
      const w=o=>{const v=o.getWorldPosition(new THREE.Vector3());return {x:v.x,y:v.y,z:v.z};};
      const inScene=o=>{let ok=false;o.traverseAncestors(a=>{if(a===scene)ok=true;});return ok;};
      const i=renderer.info.render;renderer.render(scene,camera);const calls=i.calls,tris=i.triangles;
      garden.group.visible=false;renderer.render(scene,camera);const calls0=i.calls,tris0=i.triangles;garden.group.visible=true;
      renderer.render(scene,camera);
      return {flyers:garden.flyers.map(f=>({kind:f.userData.flyer,inScene:inScene(f),...pt(f)})),
        doghouse:w(garden.parts.doghouse),doghouseAnchor:{x:anchors.doghouse.x,y:anchors.doghouse.y,z:anchors.doghouse.z},
        flowerTop:(()=>{const f=garden.group.getObjectByName('garden-flower-heads');f.computeBoundingBox();return f.boundingBox.max.y;})(),
        calls:calls-calls0,triangles:tris-tris0};},
  };
}
// Stap A: huisvorm, licht, lucht en kamertikvlakken staan er al en renderen direct.
animate();
if(DEBUG)window.__house.ready=true;
// Stap B: de kamermodellen op de achtergrond laden. Wat niet laadt wordt overgeslagen.
// Daarna richt furnishRooms de kamers in (vanaf Taak 7).
// De laadcode zit in een losse import, zodat stap A er nooit op wacht of door breekt.
let assetInfo=()=>null;
import('./assets.js').then(a=>{
  assetInfo=()=>({...a.stats,wanted:a.MODELS.length});
  return a.preload(a.MODELS).then(()=>furnishRooms(shell.slots,{cloneModel:a.cloneModel,THREE}));
}).catch(e=>console.warn('stap B:',e)).finally(()=>{if(DEBUG)window.__house.stageB='done';});
setTimeout(()=>{if(!started){controls.autoRotate=true;}},2000);
setTimeout(()=>{const l=document.getElementById('load');if(l){l.style.opacity='0';setTimeout(()=>l.remove(),500);}},700);
