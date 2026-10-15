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
import { furnishRooms } from './rooms/index.js';
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
const TARGET=new THREE.Vector3(0.7,5.4,0);
const CAM_DIR=new THREE.Vector3(0.24,0.2,1).normalize();
const HOUSE_HALF={w:5.9,h:6.6};   // halve breedte en hoogte van het huis rond TARGET, met marge
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

const cats=[];
function makeCat(spec){
  const g=new THREE.Group();
  const bodyCol=spec.body, bellyCol=spec.belly||'#FFF6E9', pointCol=spec.points||bodyCol,
        eyeCol=spec.eye||'#2A2320', stripeCol=spec.stripe, fz=spec.mask?0.085:0;
  const body=new THREE.Mesh(new THREE.SphereGeometry(0.5,20,18),soft(bodyCol));
  body.scale.set(1,1.15,0.92);body.position.y=0.5;body.castShadow=true;g.add(body);
  const belly=new THREE.Mesh(new THREE.SphereGeometry(0.34,18,16),soft(bellyCol));
  belly.scale.set(1,1.2,0.6);belly.position.set(0,0.42,0.3);g.add(belly);
  const head=new THREE.Mesh(new THREE.SphereGeometry(0.4,20,18),soft(bodyCol));
  head.position.set(0,1.12,0.02);head.castShadow=true;g.add(head);
  const cheek=new THREE.Mesh(new THREE.SphereGeometry(0.4,16,14),toy(spec.mask?pointCol:bellyCol,{gloss:0.3}));
  cheek.scale.set(1.02,0.55,0.7);cheek.position.set(0,0.98,0.14);g.add(cheek);
  if(spec.mask){const mk=new THREE.Mesh(new THREE.SphereGeometry(0.24,14,12),toy(pointCol,{gloss:0.3}));
    mk.scale.set(1.15,0.75,0.55);mk.position.set(0,1.1,0.26);g.add(mk);}
  if(spec.ruff){
    for(let i=0;i<14;i++){const a=i/14*Math.PI*2;
      const tuft=new THREE.Mesh(new THREE.ConeGeometry(0.14,0.34,5),soft(spec.ruff));
      tuft.position.set(Math.cos(a)*0.5,0.82,0.1+Math.sin(a)*0.42);
      tuft.rotation.set(Math.sin(a)*0.7,a,Math.cos(a)*0.7);tuft.castShadow=true;g.add(tuft);}
    const chestFur=new THREE.Mesh(new THREE.SphereGeometry(0.34,16,14),soft(spec.ruff));
    chestFur.scale.set(1.05,1,0.7);chestFur.position.set(0,0.5,0.34);g.add(chestFur);
  }
  if(spec.fluff){
    for(const sgn of [-1,1]){const puff=new THREE.Mesh(new THREE.SphereGeometry(0.17,12,10),soft(spec.ruff||bellyCol));
      puff.scale.set(0.9,0.7,0.7);puff.position.set(sgn*0.36,0.98,0.16);g.add(puff);}
  }
  if(spec.flat){const sn=new THREE.Mesh(new THREE.SphereGeometry(0.22,14,12),toy(bodyCol,{gloss:0.3}));
    sn.scale.set(1.1,0.7,0.5);sn.position.set(0,1.06,0.28);g.add(sn);}
  const bigE=spec.bigEars;
  const earR=bigE?0.27:0.19, earH=bigE?0.52:0.34, earX=bigE?0.28:0.24, earY=bigE?1.5:1.44;
  for(const sgn of [-1,1]){
    const ear=new THREE.Mesh(new THREE.ConeGeometry(earR,earH,4),toy(pointCol,{gloss:0.3}));
    ear.position.set(sgn*earX,earY,0);ear.rotation.set(0,Math.PI/4,sgn*(bigE?0.12:0.2));ear.castShadow=true;g.add(ear);
    const inner=new THREE.Mesh(new THREE.ConeGeometry(earR*0.52,earH*0.6,4),toy(COL.pinkEar,{gloss:0.3}));
    inner.position.set(sgn*earX,earY-0.02,0.06);inner.rotation.set(0,Math.PI/4,sgn*(bigE?0.12:0.2));g.add(inner);
    if(spec.tufts){const lx=new THREE.Mesh(new THREE.ConeGeometry(0.03,0.16,4),soft('#fff'));
      lx.position.set(sgn*earX,earY+earH*0.5,0);g.add(lx);}
  }
  const eyes=[];
  for(const sgn of [-1,1]){
    const eye=new THREE.Mesh(new THREE.SphereGeometry(0.075,14,14),toy(eyeCol,{gloss:0.8}));
    eye.position.set(sgn*0.16,1.16,0.34+fz);g.add(eye);eyes.push(eye);
    const gl=new THREE.Mesh(new THREE.SphereGeometry(0.028,10,10),new THREE.MeshBasicMaterial({color:'#fff'}));
    gl.position.set(sgn*0.16+0.03,1.2,0.4+fz);g.add(gl);
  }
  const nose=new THREE.Mesh(new THREE.SphereGeometry(0.055,12,12),toy(COL.pink));
  nose.position.set(0,1.04,0.4+fz);nose.scale.set(1.3,0.8,1);g.add(nose);
  for(const sgn of [-1,1])for(const dy of [-0.03,0.05]){
    const w=new THREE.Mesh(new THREE.CylinderGeometry(0.006,0.006,0.34,6),toy('#fff'));
    w.position.set(sgn*0.32,1.0+dy,0.32);w.rotation.z=Math.PI/2;w.rotation.y=sgn*0.3;g.add(w);
  }
  for(const sgn of [-1,1]){
    const paw=new THREE.Mesh(new THREE.SphereGeometry(0.16,14,12),toy(spec.paws||bellyCol,{gloss:0.3}));
    paw.scale.set(1,0.7,1.3);paw.position.set(sgn*0.2,0.12,0.42);paw.castShadow=true;g.add(paw);
  }
  const tailG=new THREE.Group();tailG.position.set(0.36,0.35,-0.3);
  const curve=new THREE.CatmullRomCurve3([new THREE.Vector3(0,0,0),new THREE.Vector3(0.35,0.1,-0.25),new THREE.Vector3(0.5,0.55,-0.15),new THREE.Vector3(0.32,0.95,0.1)]);
  const tail=new THREE.Mesh(new THREE.TubeGeometry(curve,20,0.11,10,false),toy(spec.tailCol||bodyCol,{gloss:0.3}));
  tail.castShadow=true;tailG.add(tail);
  const tip=new THREE.Mesh(new THREE.SphereGeometry(0.12,12,12),toy(spec.tipCol||spec.tailCol||bellyCol,{gloss:0.3}));
  tip.position.copy(curve.getPoint(1));tailG.add(tip);
  if(stripeCol){
    for(const [dy,rr2] of [[0.14,0.44],[0,0.47],[-0.13,0.45]]){
      const band=new THREE.Mesh(new THREE.TorusGeometry(rr2,0.05,8,26,Math.PI*0.9),toy(stripeCol,{gloss:0.3}));
      band.position.y=0.5+dy*1.15;band.rotation.set(Math.PI/2,0,-0.95*Math.PI);g.add(band);}
    for(const dx of [0,-0.11,0.11]){
      const st=new THREE.Mesh(new THREE.SphereGeometry(0.05,8,8),toy(stripeCol,{gloss:0.3}));
      st.scale.set(0.6,dx===0?2.6:2.0,0.5);st.position.set(dx,1.47,0.05);st.rotation.x=-0.35;g.add(st);}
    for(const tt of [0.45,0.75]){
      const ring=new THREE.Mesh(new THREE.SphereGeometry(0.125,10,10),toy(stripeCol,{gloss:0.3}));
      ring.position.copy(curve.getPoint(tt));ring.scale.set(1,0.6,1);tailG.add(ring);}
  }
  for(const [pc,px2,py2,pz2,pr] of (spec.patches||[])){
    const pa=new THREE.Mesh(new THREE.SphereGeometry(pr,12,10),toy(pc,{gloss:0.3}));
    pa.position.set(px2,py2,pz2);pa.scale.set(1,0.75,0.7);g.add(pa);}
  if(spec.collar){
    const cring=new THREE.Mesh(new THREE.TorusGeometry(0.315,0.045,8,22),toy(spec.collar));
    cring.rotation.x=Math.PI/2;cring.position.y=0.92;g.add(cring);
    const bell=new THREE.Mesh(new THREE.SphereGeometry(0.06,10,10),toy(COL.yellow,{gloss:0.8}));
    bell.position.set(0,0.85,0.32);g.add(bell);}
  g.add(tailG);
  g.userData={eyes,tailG,blink:Math.random()*4,phase:Math.random()*7};
  return g;
}
// Zacht schaduwvlekje onder een kat. Katten in de tuin (y=0.02) staan op het gras (y=-0.19).
// Binnen ligt het vlekje net boven het vloerkleed.
function catBlob(c,r){const out=c.position.y<0.05;const gy=out?-0.185:c.position.y+0.045;
  const b=blobShadow(r);b.position.y=(gy-c.position.y)/c.scale.x;c.add(b);}
function addCat(spec,pos,scale,roty){
  const c=makeCat(spec);c.position.copy(pos);c.scale.setScalar(scale);c.rotation.y=roty||0;
  catBlob(c,0.62);scene.add(c);cats.push(c);return c;
}
function makeLoafCat(spec){
  const g=new THREE.Group();const bodyCol=spec.body,bellyCol=spec.belly||'#FFF6E9',stripeCol=spec.stripe;
  const loaf=new THREE.Mesh(new RoundedBoxGeometry(0.95,0.62,1.15,4,0.3),soft(bodyCol));
  loaf.position.y=0.42;loaf.castShadow=true;g.add(loaf);
  const head=new THREE.Mesh(new THREE.SphereGeometry(0.37,20,18),soft(bodyCol));
  head.position.set(0,0.68,0.52);head.castShadow=true;g.add(head);
  const cheek=new THREE.Mesh(new THREE.SphereGeometry(0.34,14,12),toy(bellyCol,{gloss:0.3}));
  cheek.scale.set(1.05,0.5,0.6);cheek.position.set(0,0.56,0.64);g.add(cheek);
  for(const sgn of [-1,1]){const ear=new THREE.Mesh(new THREE.ConeGeometry(0.17,0.3,4),toy(bodyCol,{gloss:0.3}));
    ear.position.set(sgn*0.22,0.96,0.42);ear.rotation.set(0,Math.PI/4,sgn*0.18);ear.castShadow=true;g.add(ear);
    const inr=new THREE.Mesh(new THREE.ConeGeometry(0.09,0.17,4),toy(COL.pinkEar,{gloss:0.3}));
    inr.position.set(sgn*0.22,0.95,0.48);inr.rotation.set(0,Math.PI/4,sgn*0.18);g.add(inr);}
  const eyes=[];for(const sgn of [-1,1]){const eye=new THREE.Mesh(new THREE.SphereGeometry(0.07,14,14),toy(spec.eye||'#2A2320',{gloss:0.8}));
    eye.position.set(sgn*0.15,0.72,0.82);g.add(eye);eyes.push(eye);
    const gl=new THREE.Mesh(new THREE.SphereGeometry(0.026,10,10),new THREE.MeshBasicMaterial({color:'#fff'}));gl.position.set(sgn*0.15+0.03,0.76,0.87);g.add(gl);}
  const nose=new THREE.Mesh(new THREE.SphereGeometry(0.05,12,12),toy(COL.pink));nose.position.set(0,0.6,0.88);nose.scale.set(1.3,0.8,1);g.add(nose);
  for(const sgn of [-1,1])for(const dy of [-0.02,0.05]){const w=new THREE.Mesh(new THREE.CylinderGeometry(0.005,0.005,0.3,6),toy('#fff'));
    w.position.set(sgn*0.3,0.58+dy,0.78);w.rotation.z=Math.PI/2;w.rotation.y=sgn*0.3;g.add(w);}
  for(const sgn of [-1,1]){const toe=new THREE.Mesh(new THREE.CapsuleGeometry(0.09,0.4,4,8),toy(bellyCol,{gloss:0.3}));
    toe.rotation.x=Math.PI/2;toe.position.set(sgn*0.26,0.14,0.5);toe.castShadow=true;g.add(toe);}
  const tailG=new THREE.Group();const cv=new THREE.CatmullRomCurve3([new THREE.Vector3(0,0.2,-0.55),new THREE.Vector3(0.5,0.16,-0.5),new THREE.Vector3(0.62,0.12,0.1),new THREE.Vector3(0.4,0.16,0.55)]);
  const tail=new THREE.Mesh(new THREE.TubeGeometry(cv,20,0.1,10,false),toy(spec.tailCol||bodyCol,{gloss:0.3}));tail.castShadow=true;tailG.add(tail);g.add(tailG);
  if(stripeCol)for(const tx of [0.2,0.5,0.8]){const b=new THREE.Mesh(new THREE.TorusGeometry(0.1,0.045,8,18),toy(stripeCol,{gloss:0.3}));
    b.position.copy(cv.getPoint(tx));b.rotation.y=Math.PI/2;tailG.add(b);
    const rib=new THREE.Mesh(new THREE.TorusGeometry(0.42,0.05,8,20,Math.PI*0.8),toy(stripeCol,{gloss:0.3}));
    rib.position.set(0,0.42,-0.1+tx*0.9);rib.rotation.set(Math.PI/2,0,Math.PI/2);g.add(rib);}
  if(spec.collar){const cr=new THREE.Mesh(new THREE.TorusGeometry(0.3,0.04,8,20),toy(spec.collar));cr.rotation.x=Math.PI/2.2;cr.position.set(0,0.5,0.5);g.add(cr);}
  g.userData={eyes,tailG,blink:Math.random()*4,phase:Math.random()*7,loaf:true};return g;
}
function makeStandCat(spec){
  const g=new THREE.Group();const bodyCol=spec.body,bellyCol=spec.belly||'#FFF6E9',stripeCol=spec.stripe;
  const torso=new THREE.Mesh(new THREE.CapsuleGeometry(0.4,0.7,6,14),soft(bodyCol));
  torso.rotation.z=Math.PI/2;torso.position.set(0,0.62,0);torso.scale.set(1,1,0.95);torso.castShadow=true;g.add(torso);
  const rump=new THREE.Mesh(new THREE.SphereGeometry(0.42,16,14),soft(bodyCol));rump.position.set(-0.5,0.64,0);g.add(rump);
  const head=new THREE.Mesh(new THREE.SphereGeometry(0.38,20,18),soft(bodyCol));head.position.set(0.66,0.82,0);head.castShadow=true;g.add(head);
  const cheek=new THREE.Mesh(new THREE.SphereGeometry(0.33,14,12),toy(bellyCol,{gloss:0.3}));cheek.scale.set(0.6,0.5,1.05);cheek.position.set(0.82,0.72,0);g.add(cheek);
  for(const sgn of [-1,1]){const ear=new THREE.Mesh(new THREE.ConeGeometry(0.16,0.3,4),toy(bodyCol,{gloss:0.3}));
    ear.position.set(0.6,1.1,sgn*0.2);ear.rotation.set(sgn*0.2,0,0.15);ear.castShadow=true;g.add(ear);
    const inr=new THREE.Mesh(new THREE.ConeGeometry(0.08,0.16,4),toy(COL.pinkEar,{gloss:0.3}));inr.position.set(0.62,1.09,sgn*0.2);inr.rotation.set(sgn*0.2,0,0.15);g.add(inr);}
  const eyes=[];for(const sgn of [-1,1]){const eye=new THREE.Mesh(new THREE.SphereGeometry(0.065,14,14),toy(spec.eye||'#2A2320',{gloss:0.8}));
    eye.position.set(0.88,0.86,sgn*0.16);g.add(eye);eyes.push(eye);}
  const nose=new THREE.Mesh(new THREE.SphereGeometry(0.05,12,10),toy(COL.pink));nose.position.set(1.0,0.78,0);g.add(nose);
  const legs=[];for(const [lx,lz] of [[0.5,0.26],[0.5,-0.26],[-0.44,0.26],[-0.44,-0.26]]){
    const leg=new THREE.Mesh(new THREE.CapsuleGeometry(0.11,0.5,4,8),toy(bodyCol,{gloss:0.3}));
    leg.position.set(lx,0.28,lz);leg.castShadow=true;g.add(leg);
    const paw=new THREE.Mesh(new THREE.SphereGeometry(0.13,12,10),toy(spec.paws||bellyCol,{gloss:0.3}));
    paw.scale.set(1,0.7,1.2);paw.position.set(lx,0.04,lz+0.04);g.add(paw);legs.push(leg);}
  const tailG=new THREE.Group();tailG.position.set(-0.85,0.7,0);
  const cv=new THREE.CatmullRomCurve3([new THREE.Vector3(0,0,0),new THREE.Vector3(-0.3,0.3,0),new THREE.Vector3(-0.2,0.8,0),new THREE.Vector3(0.15,1.0,0)]);
  const tail=new THREE.Mesh(new THREE.TubeGeometry(cv,18,0.09,10,false),toy(spec.tailCol||bodyCol,{gloss:0.3}));tail.castShadow=true;tailG.add(tail);
  const tip=new THREE.Mesh(new THREE.SphereGeometry(0.1,12,12),toy(spec.tipCol||bellyCol,{gloss:0.3}));tip.position.copy(cv.getPoint(1));tailG.add(tip);g.add(tailG);
  if(stripeCol)for(let i=0;i<5;i++){const rib=new THREE.Mesh(new THREE.TorusGeometry(0.4,0.045,8,18,Math.PI*0.9),toy(stripeCol,{gloss:0.3}));
    rib.position.set(0.35-i*0.22,0.62,0);rib.rotation.set(0,0,Math.PI/2);g.add(rib);}
  if(spec.collar){const cr=new THREE.Mesh(new THREE.TorusGeometry(0.3,0.04,8,20),toy(spec.collar));cr.rotation.z=Math.PI/2;cr.position.set(0.7,0.7,0);g.add(cr);}
  g.userData={eyes,tailG,legs,blink:Math.random()*4,phase:Math.random()*7,walk:true};return g;
}
function makePlayCat(spec){
  const g=new THREE.Group();const bodyCol=spec.body,bellyCol=spec.belly||'#FFF6E9';
  const back=new THREE.Mesh(new THREE.SphereGeometry(0.42,18,16),soft(bodyCol));back.scale.set(1,0.7,1.15);back.position.y=0.3;back.castShadow=true;g.add(back);
  const belly=new THREE.Mesh(new THREE.SphereGeometry(0.34,16,14),toy(bellyCol,{gloss:0.3}));belly.scale.set(0.9,0.8,1.05);belly.position.set(0,0.5,0);g.add(belly);
  const head=new THREE.Mesh(new THREE.SphereGeometry(0.36,20,18),toy(bodyCol,{gloss:0.3}));head.position.set(0,0.42,0.62);head.rotation.x=0.6;head.castShadow=true;g.add(head);
  const chin=new THREE.Mesh(new THREE.SphereGeometry(0.3,14,12),toy(bellyCol,{gloss:0.3}));chin.scale.set(1,0.5,0.7);chin.position.set(0,0.28,0.72);g.add(chin);
  for(const sgn of [-1,1]){const ear=new THREE.Mesh(new THREE.ConeGeometry(0.15,0.26,4),toy(bodyCol,{gloss:0.3}));
    ear.position.set(sgn*0.2,0.66,0.5);ear.rotation.set(-0.5,Math.PI/4,sgn*0.18);g.add(ear);}
  const eyes=[];for(const sgn of [-1,1]){const eye=new THREE.Mesh(new THREE.SphereGeometry(0.06,14,14),toy(spec.eye||'#2A2320',{gloss:0.8}));
    eye.position.set(sgn*0.13,0.5,0.86);g.add(eye);eyes.push(eye);}
  const nose=new THREE.Mesh(new THREE.SphereGeometry(0.045,12,10),toy(COL.pink));nose.position.set(0,0.36,0.92);g.add(nose);
  const paws=[];for(const [px,pz,rot] of [[0.24,0.3,0.4],[-0.24,0.3,-0.4],[0.2,-0.3,0.8],[-0.2,-0.3,-0.8]]){
    const leg=new THREE.Mesh(new THREE.CapsuleGeometry(0.08,0.34,4,8),toy(bodyCol,{gloss:0.3}));
    leg.position.set(px,0.62,pz);leg.rotation.set(pz>0?-0.5:0.4,0,rot);g.add(leg);
    const paw=new THREE.Mesh(new THREE.SphereGeometry(0.1,12,10),toy(spec.paws||bellyCol,{gloss:0.3}));
    paw.position.set(px*1.4,0.82,pz*1.1);g.add(paw);paws.push(leg);}
  const tailG=new THREE.Group();tailG.position.set(0,0.3,-0.5);
  const cv=new THREE.CatmullRomCurve3([new THREE.Vector3(0,0,0),new THREE.Vector3(0,0.25,-0.3),new THREE.Vector3(0.3,0.5,-0.2),new THREE.Vector3(0.5,0.4,0.1)]);
  const tail=new THREE.Mesh(new THREE.TubeGeometry(cv,16,0.08,10,false),toy(spec.tailCol||bodyCol,{gloss:0.3}));tail.castShadow=true;tailG.add(tail);g.add(tailG);
  if(spec.collar){const cr=new THREE.Mesh(new THREE.TorusGeometry(0.26,0.035,8,18),toy(spec.collar));cr.rotation.x=1.0;cr.position.set(0,0.34,0.55);g.add(cr);}
  g.userData={eyes,tailG,paws,blink:Math.random()*4,phase:Math.random()*7,play:true};return g;
}
function addSpecial(builder,spec,pos,scale,roty){const c=builder(spec);c.position.copy(pos);c.scale.setScalar(scale);c.rotation.y=roty||0;catBlob(c,builder===makeStandCat?0.95:0.75);scene.add(c);cats.push(c);return c;}
const GREY='#AEB9C6', INK='#3B3A38', SNOW='#FFFFFF', CREAM='#F5E7C8', CHOCO='#6B4A3A';
const BREEDS={
  witPoes:{body:SNOW,belly:'#FFF6E9',patches:[[GREY,0.26,0.74,-0.08,0.2],[GREY,-0.18,1.38,0.04,0.14]],collar:COL.coral},
  gemberTijger:{body:COL.orange,belly:'#FFF3E0',stripe:'#D97706',eye:'#3E8E3E',collar:COL.blue},
  grijsBrits:{body:GREY,belly:'#F0F3F5',eye:'#E8A33D',collar:COL.pink},
  siamees:{body:CREAM,belly:'#FFF9EC',points:CHOCO,mask:true,paws:CHOCO,tailCol:CHOCO,tipCol:'#57422F',eye:'#4D96FF'},
  lapjeskat:{body:SNOW,belly:'#FFF6E9',patches:[['#F5A623',0.27,0.76,0.1,0.2],[INK,-0.24,0.58,-0.12,0.18],['#F5A623',0.17,1.36,-0.02,0.15],[INK,-0.2,1.32,0.08,0.12]],tipCol:INK,collar:COL.green},
  smoking:{body:INK,belly:'#F5F5F2',eye:'#FFD93D'},
  lila:{body:'#C9A7F5',belly:'#F6EFFF',collar:COL.yellow},
  zwartje:{body:INK,belly:'#C9CDD2',eye:'#FFD93D',collar:COL.coral},
  grijsTijger:{body:GREY,belly:'#F0F3F5',stripe:'#7E8A96',eye:'#3E8E3E'},
  creamTijger:{body:CREAM,belly:'#FFF9EC',stripe:'#D8BE93',eye:'#E8A33D'},
  verfPoes:{body:SNOW,belly:'#FFF6E9',patches:[[COL.pink,0.26,0.72,0.12,0.16],[COL.blue,-0.22,0.6,-0.1,0.15],[COL.green,0.1,1.38,0.02,0.12]]},
  pers:{body:'#F3E4C0',belly:'#FFF9EC',ruff:'#FFFDF6',fluff:true,flat:true,eye:'#E8A33D',collar:COL.purple},
  maineCoon:{body:'#8A6A46',belly:'#E9D6B4',ruff:'#D9C29A',fluff:true,stripe:'#5E4326',tufts:true,eye:'#57C24D'},
  oriental:{body:'#C4B7AE',belly:'#EFE9E3',bigEars:true,eye:'#4D96FF',collar:COL.coral},
  lynxKit:{body:'#D8BE93',belly:'#FFF9EC',bigEars:true,tufts:true,stripe:'#A9884F',eye:'#8FD46A'},
  ragdoll:{body:'#EDE3D6',belly:'#FFFDF6',ruff:'#FFFDF6',fluff:true,points:'#7A6552',eye:'#4D96FF',collar:COL.blue},
};
const roomPos=(name,dx,dz)=>{const r=roomObjs.find(o=>o.room.name===name);
  return r?new THREE.Vector3(r.slot.center.x+dx,r.slot.floorY,r.slot.center.z+dz):null;};
addCat(BREEDS.gemberTijger,new THREE.Vector3(anchors.mauwtje.x,0.02,anchors.mauwtje.z),0.9,0);
let p;
if(p=roomPos('Speelkamer',-0.4,RD*0.1))addCat(BREEDS.lapjeskat,p,0.62,0.3);
if(p=roomPos('Memory',0.35,RD*0.1))addCat(BREEDS.grijsBrits,p,0.58,-0.4);
if(p=roomPos('Stickers',0,RD*0.05))addCat(BREEDS.siamees,p,0.55,-0.2);
if(p=roomPos('Kleuren',0.4,RD*0.08))addCat(BREEDS.verfPoes,p,0.5,-0.5);
if(p=roomPos('Tellen',-0.38,RD*0.1))addCat(BREEDS.zwartje,p,0.5,0.45);
if(p=roomPos('Puzzel',0.36,RD*0.08))addSpecial(makeLoafCat,BREEDS.creamTijger,p,0.55,-0.4);
if(p=roomPos('Vormen',-0.36,RD*0.06))addCat(BREEDS.pers,p,0.5,0.4);
if(p=roomPos('Verkleden',0.34,RD*0.08))addSpecial(makePlayCat,{body:COL.orange,belly:'#FFF3E0',collar:COL.blue},p,0.55,-0.3);
addCat(BREEDS.smoking,new THREE.Vector3(-5.0,0.02,2.4),0.85,0.9);
addCat(BREEDS.pers,new THREE.Vector3(5.4,0.02,1.6),0.82,-0.7);
addSpecial(makeStandCat,BREEDS.maineCoon,new THREE.Vector3(-2.7,0.02,4.9),0.62,0.5);
addSpecial(makeStandCat,BREEDS.gemberTijger,new THREE.Vector3(6.3,0.02,3.6),0.55,-1.6);
addSpecial(makeStandCat,BREEDS.grijsTijger,new THREE.Vector3(-6.0,0.02,2.2),0.58,1.2);
addSpecial(makeStandCat,BREEDS.oriental,new THREE.Vector3(3.0,0.02,5.6),0.6,-0.8);
addSpecial(makeStandCat,BREEDS.siamees,new THREE.Vector3(-4.5,0.02,-1.5),0.56,2.4);
addSpecial(makeLoafCat,BREEDS.grijsTijger,new THREE.Vector3(-6.2,0.02,3.0),0.62,0.7);
addCat(BREEDS.oriental,new THREE.Vector3(4.2,0.02,5.4),0.66,-0.4);
addSpecial(makePlayCat,{body:INK,belly:'#F5F5F2',collar:COL.yellow},new THREE.Vector3(-3.6,0.02,3.0),0.6,1.2);
addSpecial(makeLoafCat,{body:SNOW,belly:'#FFF6E9',collar:COL.pink},new THREE.Vector3(2.3,0.62,6.7),0.32,Math.PI);
addCat(BREEDS.lynxKit,new THREE.Vector3(7.45,1.72,-2.7),0.42,-0.4);
addCat(BREEDS.creamTijger,new THREE.Vector3(3.2,0.08,0.98),0.45,-0.3);
addCat(BREEDS.ragdoll,new THREE.Vector3(-4.0,0.02,5.6),0.6,-0.3);
function makeSleepCat(bodyCol,bellyCol){
  const s=new THREE.Group();
  const donut=new THREE.Mesh(new THREE.TorusGeometry(0.34,0.21,14,28),toy(bodyCol,{gloss:0.3}));
  donut.rotation.x=Math.PI/2;donut.position.y=0.2;donut.castShadow=true;s.add(donut);
  const mid=new THREE.Mesh(new THREE.SphereGeometry(0.3,14,12),toy(bodyCol,{gloss:0.3}));
  mid.scale.set(1,0.5,1);mid.position.y=0.22;s.add(mid);
  const tl=new THREE.Mesh(new THREE.TorusGeometry(0.36,0.085,10,20,Math.PI*1.15),toy(bodyCol,{gloss:0.3}));
  tl.rotation.x=Math.PI/2;tl.position.y=0.36;s.add(tl);
  const head=new THREE.Mesh(new THREE.SphereGeometry(0.3,18,16),toy(bodyCol,{gloss:0.3}));
  head.position.set(0.3,0.38,0.28);head.castShadow=true;s.add(head);
  const mz=new THREE.Mesh(new THREE.SphereGeometry(0.16,12,10),toy(bellyCol,{gloss:0.3}));
  mz.scale.set(1,0.7,0.8);mz.position.set(0.36,0.32,0.42);s.add(mz);
  for(const sgn of [-1,1]){
    const e=new THREE.Mesh(new THREE.TorusGeometry(0.055,0.014,6,12,Math.PI),toy(INK));
    e.position.set(0.3+sgn*0.11,0.45,0.53);s.add(e);
    const ear=new THREE.Mesh(new THREE.ConeGeometry(0.13,0.22,4),toy(bodyCol,{gloss:0.3}));
    ear.position.set(0.3+sgn*0.16,0.63,0.2);ear.rotation.set(0,Math.PI/4,sgn*0.25);s.add(ear);
    const inner=new THREE.Mesh(new THREE.ConeGeometry(0.07,0.13,4),toy(COL.pinkEar,{gloss:0.3}));
    inner.position.set(0.3+sgn*0.16,0.62,0.25);inner.rotation.set(0,Math.PI/4,sgn*0.25);s.add(inner);}
  const nz=new THREE.Mesh(new THREE.SphereGeometry(0.045,10,8),toy(COL.pink));
  nz.position.set(0.36,0.36,0.55);s.add(nz);
  return s;
}
const sleeper=makeSleepCat(GREY,'#F0F3F5');
sleeper.position.set(-4.6,0.02,4.4);sleeper.rotation.y=0.6;sleeper.scale.setScalar(0.9);
sleeper.userData.s=0.9;scene.add(sleeper);
{const b=blobShadow(0.6);b.position.set(-4.6,-0.18,4.4);scene.add(b);}
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
const zzz=[];
(()=>{const cv=document.createElement('canvas');cv.width=cv.height=64;const c=cv.getContext('2d');
  c.font='800 44px "Baloo 2", system-ui, sans-serif';c.textAlign='center';c.textBaseline='middle';
  c.strokeStyle='rgba(90,70,60,.35)';c.lineWidth=6;c.strokeText('Z',32,34);
  c.fillStyle='#fff';c.fillText('Z',32,34);
  const tex=new THREE.CanvasTexture(cv);
  for(let i=0;i<3;i++){const sp=new THREE.Sprite(new THREE.SpriteMaterial({map:tex,transparent:true}));
    sp.userData.ph=i/3;zzz.push(sp);scene.add(sp);}})();

const raycaster=new THREE.Raycaster();const ndc=new THREE.Vector2();
let hovered=null,started=false,paused=false;
const tip=document.getElementById('tip');
function castAt(clientX,clientY){
  ndc.x=(clientX/innerWidth)*2-1;ndc.y=-(clientY/innerHeight)*2+1;
  raycaster.setFromCamera(ndc,camera);
  return raycaster.intersectObjects(hitboxes,false)[0]||null;
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
  } else if(obj&&obj.userData.doorHit){tip.textContent='Welkom!';tip.style.left=e.clientX+'px';tip.style.top=e.clientY+'px';tip.style.opacity='1';canvas.style.cursor='pointer';}
  else {tip.style.opacity='0';canvas.style.cursor='grab';}
});
canvas.addEventListener('pointerup',e=>{
  if(paused)return;
  const quick=performance.now()-pt0<450;
  if(!moved&&quick){const hit=castAt(e.clientX,e.clientY);
    if(hit&&hit.object.userData.room){openRoom(hit.object.userData.room);}
    else if(hit&&hit.object.userData.doorHit){dbgEvents.push('door');bounceDoor();meow();}}
});
canvas.addEventListener('pointerleave',()=>{tip.style.opacity='0';hovered=null;});

let doorBounce=0;function bounceDoor(){doorBounce=1;}

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

function angLerp(a,b,f){let d=((b-a+Math.PI)%(2*Math.PI))-Math.PI;if(d<-Math.PI)d+=2*Math.PI;return a+d*Math.min(1,f);}
function yardPoint(from){
  for(let i=0;i<16;i++){
    const a=Math.random()*Math.PI*2, r=4.2+Math.random()*3.8;
    const x=Math.cos(a)*r, z=Math.sin(a)*r*0.85+1.6;
    if(Math.abs(x)<4.3 && z<3.2) continue;
    if(z<-3.2 || z>6.1) continue;
    if(Math.hypot(x-5.4,z-4.6)<2.1) continue;
    if(from && Math.hypot(x-from.x,z-from.z)<2.2) continue;
    return new THREE.Vector3(x,0.02,z);
  }
  return new THREE.Vector3(from?-from.x:6,0.02,4);
}
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

  for(const c of cats){const u=c.userData;
    u.tailG.rotation.z=Math.sin(t*2.2+u.phase)*0.5;
    u.tailG.rotation.x=Math.sin(t*1.7+u.phase)*0.12;
    u.blink-=dt;if(u.blink<0){const b=Math.max(0,1+u.blink*8);u.eyes.forEach(e=>e.scale.y=b<0.15?0.12:1);if(u.blink<-0.13){u.blink=2+Math.random()*3;u.eyes.forEach(e=>e.scale.y=1);}}
    if(u.walk&&u.legs){
      if(u.tx===undefined){u.baseY=c.position.y;u.speed=0.85+Math.random()*0.6;u.state='walk';u.timer=1+Math.random()*2;u.gait=Math.random()*7;u.tx=yardPoint(c.position);}
      const to=new THREE.Vector3().subVectors(u.tx,c.position);to.y=0;const dist=to.length();
      if(u.state==='walk'){
        const want=Math.atan2(-to.z,to.x);
        c.rotation.y=angLerp(c.rotation.y,want,dt*3.2);
        const align=Math.max(0,Math.cos(((want-c.rotation.y+Math.PI)%(2*Math.PI))-Math.PI));
        const step=u.speed*dt*(0.35+0.65*align);
        c.position.addScaledVector(to.normalize(),Math.min(step,dist));
        u.gait+=dt*u.speed*6.5;
        const gp=[0,Math.PI,Math.PI,0];
        u.legs.forEach((l,i)=>{l.rotation.z=Math.sin(u.gait+gp[i])*0.5;});
        c.position.y=u.baseY+Math.abs(Math.sin(u.gait))*0.06;
        c.rotation.z=Math.sin(u.gait)*0.035;
        c.rotation.x=-0.04+Math.sin(u.gait*2)*0.015;
        if(dist<0.35){u.state='pause';u.timer=0.8+Math.random()*2.6;}
      }else{
        u.legs.forEach(l=>l.rotation.z*=Math.pow(0.02,dt));
        c.position.y+=(u.baseY-c.position.y)*Math.min(1,dt*6);
        c.rotation.z*=Math.pow(0.05,dt);c.rotation.x*=Math.pow(0.05,dt);
        c.rotation.y+=Math.sin(t*0.6+u.phase)*dt*0.35;
        u.timer-=dt;if(u.timer<0){u.tx=yardPoint(c.position);u.state='walk';}
      }
    }else{
      c.position.y+=Math.sin(t*1.6+u.phase)*0.0009;
      c.rotation.z=Math.sin(t*1.6+u.phase)*0.02;
    }
    if(u.play&&u.paws)u.paws.forEach((l,i)=>{l.rotation.z+=Math.sin(t*5+u.phase+i*1.3)*0.01;});
  }
  for(const cl of clouds){cl.position.x+=dt*0.35;if(cl.position.x>16)cl.position.x=-16;}
  for(const b of balloons){b.position.y+=Math.sin(t*1.2+b.userData.phase)*0.003;b.rotation.z=Math.sin(t*0.9+b.userData.phase)*0.08;}
  glow.material.opacity=0.3+Math.sin(t*1.5)*0.06;
  for(const b of butterflies){const u=b.userData;const ang=t*u.speed+u.off;
    b.position.set(Math.cos(ang)*u.R,u.y0+Math.sin(t*2.1+u.off)*0.35,Math.sin(ang)*u.R*0.72+1.2);
    b.rotation.y=-ang;const fl=0.35+Math.abs(Math.sin(t*9+u.off))*0.75;
    u.wl.rotation.z=fl;u.wr.rotation.z=-fl;}
  swing.rotation.x=Math.sin(t*1.15)*0.16;
  for(const s of sparkles){const k=0.75+Math.sin(t*2.6+s.userData.off*1.3)*0.45;s.scale.setScalar(Math.max(0.25,k));s.rotation.y+=dt*1.5;}
  {const e=Math.sin(t*1.5)*0.03;const k=sleeper.userData.s;sleeper.scale.set(k*(1+e),k*(1-e),k*(1+e));}
  for(const z of zzz){z.userData.ph+=dt*0.3;if(z.userData.ph>1)z.userData.ph-=1;const ph=z.userData.ph;
    z.position.set(-4.25+ph*0.3,0.85+ph*0.9,4.65);z.scale.setScalar(0.22+ph*0.3);z.material.opacity=(1-ph)*(ph<0.08?ph/0.08:1);}
  renderer.render(scene,camera);
}

addEventListener('resize',()=>{camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight);
  fitCamera();if(DEBUG){camera.position.copy(camEnd);controls.target.copy(TARGET);controls.update();}});
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
  const fire=(type,x,y,buttons)=>canvas.dispatchEvent(new PointerEvent(type,{pointerId:1,pointerType:'touch',isPrimary:true,
    clientX:x,clientY:y,buttons,button:0,bubbles:true,cancelable:true}));
  window.__house={
    ready:false,events:dbgEvents,
    info(){const i=renderer.info.render;return {calls:i.calls,triangles:i.triangles,tier:gov.tier};},
    rooms(){return hitboxes.filter(h=>h.userData.room).map(h=>({id:h.userData.room.id,...pt(h),...rect(h)}));},
    door(){return pt(hitboxes.find(h=>h.userData.doorHit));},
    // Ankerpunten van de huisvorm, als schermpunten.
    anchors(){const out={};for(const [k,v] of Object.entries(anchors)){camera.updateMatrixWorld();const q=v.clone().project(camera);
      out[k]={x:Math.round((q.x+1)/2*innerWidth),y:Math.round((1-q.y)/2*innerHeight)};}return out;},
    // Schermrechthoek van de hele huisvorm (alle 8 hoeken van de omhullende doos).
    bounds(){camera.updateMatrixWorld();const b=new THREE.Box3().setFromObject(house);let x0=1e9,y0=1e9,x1=-1e9,y1=-1e9;
      for(let i=0;i<8;i++){const v=new THREE.Vector3(i&1?b.max.x:b.min.x,i&2?b.max.y:b.min.y,i&4?b.max.z:b.min.z).project(camera);
        const sx=(v.x+1)/2*innerWidth,sy=(1-v.y)/2*innerHeight;x0=Math.min(x0,sx);x1=Math.max(x1,sx);y0=Math.min(y0,sy);y1=Math.max(y1,sy);}
      return {x0:Math.round(x0),y0:Math.round(y0),x1:Math.round(x1),y1:Math.round(y1)};},
    tap(x,y){fire('pointerdown',x,y,1);fire('pointerup',x,y,0);},
    drag(x0,y0,x1,y1){fire('pointerdown',x0,y0,1);
      for(let i=1;i<=6;i++)fire('pointermove',x0+(x1-x0)*i/6,y0+(y1-y0)*i/6,1);
      fire('pointerup',x1,y1,0);},
    frame(){camera.updateMatrixWorld();renderer.render(scene,camera);},
    stageB:'pending',
    assets(){return assetInfo();},
  };
}
// Stap A: huisvorm, licht, lucht en kamertikvlakken staan er al en renderen direct.
animate();
if(DEBUG)window.__house.ready=true;
// Stap B: de kamermodellen op de achtergrond laden. Wat niet laadt wordt overgeslagen.
// Daarna richt furnishRooms de kamers in (vanaf Taak 7); katten volgen in Taak 6.
// De laadcode zit in een losse import, zodat stap A er nooit op wacht of door breekt.
let assetInfo=()=>null;
import('./assets.js').then(a=>{
  assetInfo=()=>({...a.stats,wanted:a.MODELS.length});
  return a.preload(a.MODELS).then(()=>furnishRooms(shell.slots,{cloneModel:a.cloneModel,THREE}));
}).catch(e=>console.warn('stap B:',e)).finally(()=>{if(DEBUG)window.__house.stageB='done';});
setTimeout(()=>{if(!started){controls.autoRotate=true;}},2000);
setTimeout(()=>{const l=document.getElementById('load');if(l){l.style.opacity='0';setTimeout(()=>l.remove(),500);}},700);
