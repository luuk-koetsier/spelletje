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
import { furnishRooms, hasFurnisher } from './rooms/index.js';
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
(()=>{const cv=document.createElement('canvas');cv.width=8;cv.height=256;const c=cv.getContext('2d');
const g=c.createLinearGradient(0,0,0,256);g.addColorStop(0,COL.skyTop);g.addColorStop(.55,COL.sky1);g.addColorStop(1,COL.sky2);
c.fillStyle=g;c.fillRect(0,0,8,256);const t=new THREE.CanvasTexture(cv);t.colorSpace=THREE.SRGBColorSpace;scene.background=t;})();

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
// Per kamer een groep voor de inrichting (slot.group), met de oorsprong midden op de kamervloer.
// De inrichters in rooms/ vullen die in stap B; bij hover schuift de groep iets naar voren.
const roomObjs=shell.slots.map(s=>{
  const room=s.hit.userData.room;
  const g=new THREE.Group();g.name='room-'+s.id;g.position.set(s.center.x,s.floorY,s.center.z);house.add(g);
  s.group=g;s.hit.userData.group=g;
  return {room,slot:s,group:g,baseZ:g.position.z,hover:0};
});

// ─────────── katten: één stijl, elf stuks (cats.js)
// Acht bewoners (één per kamer, met een accessoire dat bij de kamer past), Mauwtje bij de deur
// en twee katten in de tuin. Een kamer met een eigen inrichter (rooms/<id>.js) zet zijn bewoner
// zelf neer, via kit.makeCat in stap B. De andere bewoners staan voorlopig op de vloer naast het
// kamermidden (Taak 8 zet ze op hun plek).
const RESIDENTS={
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
// Voor de inrichters: een kat maken en zijn tikvlak meteen aanmelden. Met spec.room is het de
// bewoner van die kamer (een tik op hem gaat dan voor de kamer zelf).
function residentCat(spec){
  const c=makeCat(spec),h=c.userData.hit;
  if(spec.room){c.userData.room=spec.room;h.userData.catRoom=spec.room;}
  hitboxes.unshift(h);return c;
}
for(const s of shell.slots){const r=RESIDENTS[s.id];if(!r||hasFurnisher(s.id))continue;
  const c=placeCat({id:s.id,...r},new THREE.Vector3(s.center.x-0.62,s.floorY,s.center.z),s.size.y*0.45/SIT_H,0.2);
  c.userData.room=s.id;c.userData.hit.userData.catRoom=s.id;}
placeCat({id:'mauwtje',fur:'#FFB35C',belly:'#FFD9A8',pose:'sit',accessory:'none'},anchors.mauwtje,0.95,0.15);
placeCat({id:'tuin1',fur:'#E3DCD6',belly:'#FFFFFF',pose:'play',accessory:'none'},new THREE.Vector3(-3.5,-0.2,2.3),0.8,0.5);
placeCat({id:'tuin2',fur:'#6E6672',belly:'#EDE8EE',pose:'stand',accessory:'none'},new THREE.Vector3(3.15,-0.2,2.85),0.8,-0.5);
hitboxes.unshift(...catHits);
// Groot zacht vlekje onder het huis.
{const b=blobShadow(6.2,0.28);b.scale.set(6.2,1,2.6);b.position.set(0,-0.18,0.3);scene.add(b);}

function grassTexture(){
  const cv=document.createElement('canvas');cv.width=cv.height=512;const c=cv.getContext('2d');
  c.fillStyle=COL.grass;c.fillRect(0,0,512,512);
  const cols=['#7FC85B','#96D97A','#63AE45','#8AD168','#72C155','#A6E08A'];
  for(let i=0;i<26000;i++){const x=Math.random()*512,y=Math.random()*512;
    c.strokeStyle=cols[(Math.random()*cols.length)|0];c.globalAlpha=0.5+Math.random()*0.5;
    c.lineWidth=1;const len=2+Math.random()*4,ang=-Math.PI/2+(Math.random()-0.5)*0.7;
    c.beginPath();c.moveTo(x,y);c.lineTo(x+Math.cos(ang)*len,y+Math.sin(ang)*len);c.stroke();}
  c.globalAlpha=1;
  for(let i=0;i<40;i++){c.fillStyle='rgba(60,120,50,'+(0.03+Math.random()*0.05)+')';
    c.beginPath();c.arc(Math.random()*512,Math.random()*512,20+Math.random()*70,0,7);c.fill();}
  const t=new THREE.CanvasTexture(cv);t.colorSpace=THREE.SRGBColorSpace;t.wrapS=t.wrapT=THREE.RepeatWrapping;t.repeat.set(6,6);t.anisotropy=8;return t;
}
const grassTex=grassTexture();
const ground=new THREE.Mesh(new THREE.CylinderGeometry(13,13.6,0.7,56),
  [soft(COL.dirt),new THREE.MeshStandardMaterial({map:grassTex,roughness:0.98}),soft(COL.grassD)]);
ground.position.y=-0.55;ground.receiveShadow=true;scene.add(ground);
(()=>{
  const blade=new THREE.PlaneGeometry(0.16,0.32);blade.translate(0,0.16,0);
  const bmat=new THREE.MeshStandardMaterial({map:(()=>{const cv=document.createElement('canvas');cv.width=32;cv.height=64;const c=cv.getContext('2d');
    for(let i=0;i<7;i++){const x=4+i*4;c.strokeStyle=['#5FA83E','#7FC85B','#8FD46A'][i%3];c.lineWidth=2.4;c.beginPath();c.moveTo(x,64);c.quadraticCurveTo(x+(Math.random()-0.5)*8,32,x+(Math.random()-0.5)*14,4);c.stroke();}
    const t=new THREE.CanvasTexture(cv);t.colorSpace=THREE.SRGBColorSpace;return t;})(),
    transparent:true,alphaTest:0.5,side:THREE.DoubleSide,roughness:0.95});
  const N=520;const im=new THREE.InstancedMesh(blade,bmat,N*2);const d=new THREE.Object3D();let k=0;
  for(let i=0;i<N;i++){const a=Math.random()*Math.PI*2,r=Math.random()*12.2;const x=Math.cos(a)*r,z=Math.sin(a)*r;
    if(Math.abs(x)<4.4&&z>-3.4&&z<3.4)continue;if(Math.hypot(x-5.4,z-4.6)<1.9)continue;
    const s=0.7+Math.random()*0.9;
    for(let j=0;j<2;j++){d.position.set(x,-0.2,z);d.rotation.set(0,j*Math.PI/2+Math.random(),0);d.scale.set(s,s,s);d.updateMatrix();im.setMatrixAt(k++,d.matrix);}}
  im.count=k;im.castShadow=true;im.receiveShadow=true;scene.add(im);
})();
const ring=new THREE.Mesh(new THREE.RingGeometry(8.5,12.6,64),new THREE.MeshStandardMaterial({map:grassTex,roughness:1}));
ring.rotation.x=-Math.PI/2;ring.position.y=-0.19;ring.receiveShadow=true;scene.add(ring);

for(let k=0;k<4;k++){
  const stone=new THREE.Mesh(new THREE.CylinderGeometry(0.55,0.6,0.14,20),soft(COL.path));
  stone.position.set(0,-0.14,2.25+k*1.15);stone.receiveShadow=true;scene.add(stone);
}

function bush(x,z,s){const b=new THREE.Group();
  for(const [dx,dy,dz,r] of [[0,0.1,0,0.5],[0.4,-0.02,0.1,0.38],[-0.38,0,0.12,0.34],[0.05,0.32,-0.05,0.34]]){
    const m=new THREE.Mesh(new THREE.SphereGeometry(r,14,12),soft(shade(COL.grassD,dy>0.2?0.08:0)));
    m.position.set(dx,dy+r*0.5,dz);m.castShadow=true;b.add(m);}
  const sh=blobShadow(0.95);sh.position.y=-0.18;b.add(sh);
  b.position.set(x,0,z);b.scale.setScalar(s);scene.add(b);return b;}
function flower(x,z,col){const f=new THREE.Group();
  const stem=new THREE.Mesh(new THREE.CylinderGeometry(0.03,0.04,0.5,6),soft(COL.grassD));
  stem.position.y=0.25;f.add(stem);
  const center=new THREE.Mesh(new THREE.SphereGeometry(0.1,12,12),toy(COL.yellow,{gloss:0.3}));center.position.y=0.54;f.add(center);
  for(let pp=0;pp<6;pp++){const pet=new THREE.Mesh(new THREE.SphereGeometry(0.09,10,10),toy(col,{gloss:0.3}));
    const a=pp/6*Math.PI*2;pet.position.set(Math.cos(a)*0.15,0.54,Math.sin(a)*0.15);pet.scale.set(1,0.6,1);f.add(pet);}
  f.position.set(x,0,z);f.castShadow=true;scene.add(f);return f;}
function tree(x,z,s){const t=new THREE.Group();
  const tr=new THREE.Mesh(new THREE.CylinderGeometry(0.22,0.34,1.5,12),soft(COL.woodD));tr.position.y=0.75;tr.castShadow=true;t.add(tr);
  for(let i=0;i<5;i++){const a=i/5*Math.PI*2;const root=new THREE.Mesh(new THREE.CylinderGeometry(0.05,0.13,0.4,6),soft(COL.woodD));
    root.position.set(Math.cos(a)*0.24,0.08,Math.sin(a)*0.24);root.rotation.set(Math.cos(a)*0.5,0,-Math.sin(a)*0.5);t.add(root);}
  const canopy=new THREE.Group();canopy.position.y=1.9;t.add(canopy);
  for(const [dx,dy,dz,r] of [[0,-0.2,0,0.9],[0.55,-0.5,0.2,0.6],[-0.55,-0.45,-0.1,0.55],[0.12,0.28,0,0.62],[-0.2,-0.05,0.45,0.5],[0.3,0.0,-0.4,0.48]]){
    const m=new THREE.Mesh(new THREE.SphereGeometry(r,18,16),soft(shade(COL.green,(Math.random()-0.5)*0.1)));m.position.set(dx,dy,dz);m.castShadow=true;canopy.add(m);}
  const leafGeo=new THREE.PlaneGeometry(0.22,0.28);
  const leafMat=new THREE.MeshStandardMaterial({color:shade(COL.green,0.08),side:THREE.DoubleSide,roughness:0.9,alphaTest:0.5,
    map:(()=>{const cv=document.createElement('canvas');cv.width=cv.height=32;const c=cv.getContext('2d');c.fillStyle='#E9F6E2';c.beginPath();c.ellipse(16,16,9,14,0,0,7);c.fill();c.strokeStyle='#BBD9AC';c.lineWidth=1.5;c.beginPath();c.moveTo(16,3);c.lineTo(16,29);c.stroke();const tx=new THREE.CanvasTexture(cv);tx.colorSpace=THREE.SRGBColorSpace;return tx;})()});
  const LN=90;const im=new THREE.InstancedMesh(leafGeo,leafMat,LN);const d=new THREE.Object3D();
  for(let i=0;i<LN;i++){const u=Math.random(),v=Math.random();const th=Math.acos(2*v-1),ph=u*Math.PI*2;const rr2=0.85+Math.random()*0.25;
    d.position.set(Math.sin(th)*Math.cos(ph)*rr2,1.9+Math.cos(th)*rr2*0.8-0.1,Math.sin(th)*Math.sin(ph)*rr2);
    d.rotation.set(Math.random()*3,Math.random()*3,Math.random()*3);d.scale.setScalar(0.8+Math.random()*0.5);d.updateMatrix();im.setMatrixAt(i,d.matrix);}
  im.castShadow=true;t.add(im);
  for(const [dx,dy,dz] of [[0.3,1.8,0.5],[-0.4,1.6,0.4],[0.5,2.1,-0.2]]){const a=new THREE.Mesh(new THREE.SphereGeometry(0.12,12,12),toy(COL.coral,{gloss:0.8}));a.position.set(dx,dy,dz);a.castShadow=true;t.add(a);}
  const sh=blobShadow(1.5);sh.position.y=-0.18;t.add(sh);
  t.position.set(x,0,z);t.scale.setScalar(s);t.rotation.y=Math.random()*6;scene.add(t);return t;}

bush(-4.3,3.6,1.05);bush(4.4,3.4,1.15);bush(-6.2,1.0,0.9);bush(6.3,-0.4,0.85);
tree(-6.8,-2.2,1.05);tree(7.0,-3.0,0.92);tree(-8.2,1.6,0.82);tree(8.4,1.2,0.78);
const fcols=[COL.coral,COL.pink,COL.blue,COL.purple,COL.yellow,COL.orange];
for(let k=0;k<14;k++){const a=k/14*Math.PI*2+0.3;const rad=8.5+Math.sin(k*2)*1.6;
  flower(Math.cos(a)*rad,Math.sin(a)*rad*0.7+1.5,fcols[k%fcols.length]);}
flower(-2.2,4.4,COL.pink);flower(2.4,4.6,COL.yellow);flower(1.4,5.2,COL.coral);flower(-1.2,5.0,COL.blue);

for(let k=-5;k<=5;k++){const px=k*1.15;const pz=6.8-Math.abs(k)*0.18;
  const post=new THREE.Mesh(new THREE.BoxGeometry(0.14,0.8,0.14),toy('#fff',{gloss:0.3}));
  post.position.set(px,0.2,pz);post.castShadow=true;scene.add(post);
  const cap=new THREE.Mesh(new THREE.ConeGeometry(0.12,0.16,4),toy(COL.pink,{gloss:0.3}));cap.position.set(px,0.66,pz);cap.rotation.y=Math.PI/4;scene.add(cap);}
for(const yy of [0.28,0.5]){const rail=new THREE.Mesh(new THREE.BoxGeometry(11.6,0.1,0.08),toy('#fff',{gloss:0.3}));rail.position.set(0,yy,6.7);scene.add(rail);}

const clouds=[];
const cloudTex=(()=>{const cv=document.createElement('canvas');cv.width=cv.height=128;const c=cv.getContext('2d');
  const g=c.createRadialGradient(64,64,4,64,64,62);g.addColorStop(0,'rgba(255,255,255,0.98)');g.addColorStop(0.5,'rgba(255,255,255,0.75)');g.addColorStop(1,'rgba(255,255,255,0)');
  c.fillStyle=g;c.beginPath();c.arc(64,64,62,0,7);c.fill();const t=new THREE.CanvasTexture(cv);t.colorSpace=THREE.SRGBColorSpace;return t;})();
function cloud(x,y,z,s){const c=new THREE.Group();
  for(const [dx,dy,sc] of [[0,0,1.5],[1.1,-0.1,1.1],[-1.1,-0.1,1.05],[0.55,0.32,0.95],[-0.5,0.28,0.9],[0,-0.28,1.2]]){
    const sp=new THREE.Sprite(new THREE.SpriteMaterial({map:cloudTex,transparent:true,opacity:0.92,depthWrite:false,fog:true}));
    sp.position.set(dx,dy,0);sp.scale.setScalar(sc*2.0);c.add(sp);}
  c.position.set(x,y,z);c.scale.setScalar(s);c.userData.sx=x;scene.add(c);clouds.push(c);return c;}
cloud(-9,9,-8,1.3);cloud(8,10.5,-11,1.7);cloud(0,12.5,-15,1.5);cloud(11,7.8,-6,1.05);cloud(-13,8.5,-12,1.4);

const sun=new THREE.Mesh(new THREE.SphereGeometry(1.3,24,24),new THREE.MeshBasicMaterial({color:'#FFD54A'}));
sun.position.set(-11,11,-12);scene.add(sun);
const glow=new THREE.Mesh(new THREE.SphereGeometry(1.9,24,24),new THREE.MeshBasicMaterial({color:'#FFE38A',transparent:true,opacity:0.35}));
glow.position.copy(sun.position);scene.add(glow);
for(let k=0;k<12;k++){const ray=new THREE.Mesh(new THREE.ConeGeometry(0.16,0.9,6),new THREE.MeshBasicMaterial({color:'#FFD54A'}));
  const a=k/12*Math.PI*2;ray.position.set(sun.position.x+Math.cos(a)*2.4,sun.position.y+Math.sin(a)*2.4,sun.position.z);
  ray.rotation.z=-a+Math.PI/2;scene.add(ray);}

const rbColors=[COL.coral,COL.orange,COL.yellow,COL.green,COL.blue,COL.purple];
rbColors.forEach((rc,idx)=>{const R=7.2+idx*0.6;
  const arc=new THREE.Mesh(new THREE.TorusGeometry(R,0.32,12,48,Math.PI),new THREE.MeshStandardMaterial({color:rc,roughness:0.55,transparent:true,opacity:0.7}));
  arc.position.set(0,2.5,-7.5);scene.add(arc);});

const balloons=[];
function balloon(x,y,z,col){const b=new THREE.Group();
  const ball=new THREE.Mesh(new THREE.SphereGeometry(0.4,18,16),toy(col,{gloss:0.8}));ball.scale.set(1,1.18,1);ball.castShadow=true;b.add(ball);
  const knot=new THREE.Mesh(new THREE.ConeGeometry(0.08,0.14,8),toy(col));knot.position.y=-0.5;b.add(knot);
  const str=new THREE.Mesh(new THREE.CylinderGeometry(0.008,0.008,1.4,6),toy('#fff'));str.position.y=-1.25;b.add(str);
  b.position.set(x,y,z);b.userData.phase=Math.random()*7;scene.add(b);balloons.push(b);return b;}
balloon(-7.5,4.5,3,COL.coral);balloon(-8.2,5.6,2,COL.yellow);balloon(7.8,4.8,3.2,COL.blue);balloon(8.4,6.0,2.4,COL.pink);

(()=>{const mb=new THREE.Group();
  const post=new THREE.Mesh(new THREE.CylinderGeometry(0.07,0.08,1.0,8),soft(COL.woodD));post.position.y=0.5;post.castShadow=true;mb.add(post);
  const box=new THREE.Mesh(new RoundedBoxGeometry(0.42,0.34,0.62,3,0.1),toy(COL.blue));box.position.y=1.12;box.castShadow=true;mb.add(box);
  const slot=new THREE.Mesh(new THREE.PlaneGeometry(0.2,0.05),new THREE.MeshBasicMaterial({color:'#2C3E60'}));slot.position.set(0,1.12,0.315);mb.add(slot);
  const fpole=new THREE.Mesh(new THREE.CylinderGeometry(0.02,0.02,0.3,6),toy('#fff'));fpole.position.set(0.24,1.32,0);mb.add(fpole);
  const ffl=new THREE.Mesh(new THREE.PlaneGeometry(0.16,0.12),new THREE.MeshStandardMaterial({color:COL.coral,side:THREE.DoubleSide,roughness:0.8}));
  ffl.position.set(0.24,1.44,0.08);ffl.rotation.y=Math.PI/2;mb.add(ffl);
  mb.position.set(anchors.mailbox.x,0,anchors.mailbox.z);mb.rotation.y=-0.2;scene.add(mb);})();
const swing=new THREE.Group();
(()=>{
  const branch=new THREE.Mesh(new THREE.CylinderGeometry(0.09,0.12,1.5,8),soft(COL.woodD));
  branch.position.set(-6.45,1.58,-1.7);
  branch.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),new THREE.Vector3(0.55,0.12,0.83).normalize());
  branch.castShadow=true;scene.add(branch);
  swing.position.set(-6.1,1.62,-1.2);
  const seat=new THREE.Mesh(new RoundedBoxGeometry(0.52,0.07,0.24,2,0.03),toy(COL.yellow,{gloss:0.3}));
  seat.position.y=-1.15;seat.castShadow=true;swing.add(seat);
  for(const sgn of [-1,1]){const rope=new THREE.Mesh(new THREE.CylinderGeometry(0.02,0.02,1.15,6),soft('#EADFCB'));
    rope.position.set(sgn*0.22,-0.575,0);swing.add(rope);}
  scene.add(swing);
})();
(()=>{const pond=new THREE.Group();
  const water=new THREE.Mesh(new THREE.CylinderGeometry(1.35,1.45,0.1,28),new THREE.MeshStandardMaterial({color:'#5BB8D8',roughness:0.08,metalness:0.2,envMapIntensity:1.4}));
  water.position.y=-0.11;pond.add(water);
  const rim=new THREE.Mesh(new THREE.TorusGeometry(1.42,0.1,10,28),soft(COL.path));
  rim.rotation.x=Math.PI/2;rim.position.y=-0.08;pond.add(rim);
  for(const [dx,dz,s] of [[-0.4,0.2,1],[0.5,-0.3,0.7]]){
    const pad=new THREE.Mesh(new THREE.CylinderGeometry(0.26*s,0.26*s,0.03,16),toy(COL.green,{gloss:0.3}));
    pad.position.set(dx,-0.045,dz);pond.add(pad);}
  const fish=new THREE.Mesh(new THREE.SphereGeometry(0.12,10,10),toy(COL.orange));
  fish.scale.set(1.4,0.8,0.8);fish.position.set(0.1,-0.06,0.5);pond.add(fish);
  pond.position.set(5.4,0,4.6);scene.add(pond);})();
function yarn(x,z,col,s){const y=new THREE.Group();
  const ball=new THREE.Mesh(new THREE.SphereGeometry(0.16,16,14),toy(col));ball.position.y=0.16;ball.castShadow=true;y.add(ball);
  for(const rot of [[0.4,0.2,0],[1.2,-0.5,0.5],[2.0,0.9,-0.4]]){
    const wrap=new THREE.Mesh(new THREE.TorusGeometry(0.155,0.02,6,20),toy(shade(col,-0.12)));
    wrap.position.y=0.16;wrap.rotation.set(rot[0],rot[1],rot[2]);y.add(wrap);}
  const drd=new THREE.Mesh(new THREE.CylinderGeometry(0.015,0.015,0.5,5),toy(shade(col,-0.1),{gloss:0.3}));
  drd.rotation.z=Math.PI/2;drd.rotation.y=0.4;drd.position.set(0.3,0.02,0.1);y.add(drd);
  y.position.set(x,0,z);y.scale.setScalar(s||1);scene.add(y);}
yarn(-2.1,5.3,COL.pink,1);yarn(-1.7,5.0,COL.blue,0.7);yarn(4.6,2.6,COL.yellow,0.8);
const butterflies=[];
function butterfly(col,R,speed,y0,off){
  const b=new THREE.Group();
  const wgeo=new THREE.CircleGeometry(0.17,10);
  const wmat=new THREE.MeshStandardMaterial({color:col,side:THREE.DoubleSide,roughness:0.7});
  const wlp=new THREE.Group(),wrp=new THREE.Group();
  const wl=new THREE.Mesh(wgeo,wmat);wl.scale.set(1,1.5,1);wl.position.x=-0.15;wlp.add(wl);
  const wr=new THREE.Mesh(wgeo,wmat);wr.scale.set(1,1.5,1);wr.position.x=0.15;wrp.add(wr);
  b.add(wlp);b.add(wrp);
  const bd=new THREE.Mesh(new THREE.CapsuleGeometry(0.035,0.18,4,8),toy('#3B3A38',{gloss:0.3}));bd.rotation.x=Math.PI/2;b.add(bd);
  b.userData={R,speed,y0,off,wl:wlp,wr:wrp};
  scene.add(b);butterflies.push(b);return b;}
butterfly(COL.yellow,6.2,0.32,2.4,0);butterfly(COL.pink,7.6,0.26,1.7,2.4);butterfly('#7FD8F0',5.2,0.4,3.0,4.4);
const sparkles=[];
for(let i=0;i<6;i++){const s=new THREE.Mesh(new THREE.OctahedronGeometry(0.13),new THREE.MeshBasicMaterial({color:i%2?'#FFF3B0':'#FFD93D',transparent:true,opacity:0.95}));
  const a=i/6*Math.PI*2+0.5;s.position.set(Math.cos(a)*5.6,7.6+Math.sin(i*2.7)*1.1,Math.sin(a)*1.6+0.6);
  s.userData.off=i;scene.add(s);sparkles.push(s);}

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
  for(const cl of clouds){cl.position.x+=dt*0.35;if(cl.position.x>16)cl.position.x=-16;}
  for(const b of balloons){b.position.y+=Math.sin(t*1.2+b.userData.phase)*0.003;b.rotation.z=Math.sin(t*0.9+b.userData.phase)*0.08;}
  glow.material.opacity=0.3+Math.sin(t*1.5)*0.06;
  for(const b of butterflies){const u=b.userData;const ang=t*u.speed+u.off;
    b.position.set(Math.cos(ang)*u.R,u.y0+Math.sin(t*2.1+u.off)*0.35,Math.sin(ang)*u.R*0.72+1.2);
    b.rotation.y=-ang;const fl=0.35+Math.abs(Math.sin(t*9+u.off))*0.75;
    u.wl.rotation.z=fl;u.wr.rotation.z=-fl;}
  swing.rotation.x=Math.sin(t*1.15)*0.16;
  for(const s of sparkles){const k=0.75+Math.sin(t*2.6+s.userData.off*1.3)*0.45;s.scale.setScalar(Math.max(0.25,k));s.rotation.y+=dt*1.5;}
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
  // Schermpunt in elke kamer op diepte k: 0 is de kameropening, 1 de achterwand (op halve hoogte).
  const fronts=(k)=>{house.updateMatrixWorld(true);return shell.slots.map(s=>{const o=new THREE.Object3D();
      o.position.set(s.center.x,s.center.y,s.center.z+s.size.z*(0.5-k));house.add(o);const p=pt(o);house.remove(o);return {id:s.id,...p};});};
  const visBox=(root,skip)=>{const b=new THREE.Box3(),m=new THREE.Box3();
    root.traverse(o=>{if(o.isMesh&&o.visible&&o!==skip)b.union(m.setFromObject(o));});return b;};
  const fire=(type,x,y,buttons)=>canvas.dispatchEvent(new PointerEvent(type,{pointerId:1,pointerType:'touch',isPrimary:true,
    clientX:x,clientY:y,buttons,button:0,bubbles:true,cancelable:true}));
  window.__house={
    ready:false,events:dbgEvents,
    info(){const i=renderer.info.render;return {calls:i.calls,triangles:i.triangles,tier:gov.tier,azimuth:Math.round(THREE.MathUtils.radToDeg(controls.getAzimuthalAngle()))};},
    // Per kamer: het midden van de kamer als schermpunt (daar tikt een kind) en de maat van het tikvlak.
    rooms(){return hitboxes.filter(h=>h.userData.room).map(h=>{const id=h.userData.room.id;
      return {id,...fronts(0.5).find(f=>f.id===id),...rect(h)};});},
    // Schermpunt per kamer op diepte k (0: de kameropening, 0.5: het kamermidden, 1: de achterwand).
    fronts(k=0){return fronts(k);},
    // Verberg (of toon weer) de spullen en de bewoner van één kamer, om de draw calls per kamer te meten.
    hideRoom(id,hide=true){const r=roomObjs.find(q=>q.slot.id===id);if(r)r.group.visible=!hide;},
    // Camera dichtbij recht voor één kamer (iets van rechts en van boven), voor een close-up.
    focusRoom(id){const s=shell.slots.find(q=>q.id===id);if(!s)return false;
      const c=house.localToWorld(s.center.clone());resetCam=0;controls.minDistance=0;
      const tanV=Math.tan(THREE.MathUtils.degToRad(camera.fov/2)),d=Math.max(1.5/(tanV*camera.aspect),1.25/tanV)+1.2;
      controls.target.copy(c);camera.position.copy(c).addScaledVector(new THREE.Vector3(0.2,0.16,1).normalize(),d);controls.update();return true;},
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
    // Camera direct naar de startstand, en het uitdempen van een sleepbeweging direct afmaken
    // (headless rendert te traag om daarop te wachten).
    home(){this.settle();resetCam=0;controls.target.copy(TARGET);camera.position.copy(camEnd);controls.update();},
    settle(){for(let i=0;i<300;i++)controls.update();},
    stageB:'pending',
    assets(){return assetInfo();},
  };
}
// Stap A: huisvorm, licht, lucht en kamertikvlakken staan er al en renderen direct.
animate();
if(DEBUG)window.__house.ready=true;
// Stap B: de kamermodellen op de achtergrond laden. Wat niet laadt wordt overgeslagen.
// Daarna richt furnishRooms de kamers in, ook als er modellen ontbreken (die worden overgeslagen).
// De laadcode zit in een losse import, zodat stap A er nooit op wacht of door breekt.
let assetInfo=()=>null;
import('./assets.js').then(a=>{
  assetInfo=()=>({...a.stats,wanted:a.MODELS.length});
  return a.preload(a.MODELS).then(()=>furnishRooms(shell.slots,{cloneModel:a.cloneModel,toy,soft,blobShadow,PAL,makeCat:residentCat}));
}).catch(e=>console.warn('stap B:',e)).finally(()=>{if(DEBUG)window.__house.stageB='done';});
setTimeout(()=>{if(!started){controls.autoRotate=true;}},2000);
setTimeout(()=>{const l=document.getElementById('load');if(l){l.style.opacity='0';setTimeout(()=>l.remove(),500);}},700);
