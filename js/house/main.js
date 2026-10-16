/* ============================================================
   HET HUIS VAN SEP: 3D home screen (Three.js)
   Bouwt de scene, camera en renderloop. Kamers openen een modal;
   "Spelen!" start het bijbehorende 2D-spel via window.KH.launchGame(id).
   ============================================================ */
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { PAL, toy, soft, blobShadow, shade } from './style.js';
import { buildShell, blinkAt } from './shell.js';
import { makeCat, reactCat, updateCats } from './cats.js';
import { furnishRooms } from './rooms/index.js';
import { buildGarden } from './garden.js';
import { initialTier, applyTier, createGovernor } from './quality.js';
import { addSurprises, updateSurprises } from './surprises.js';
import { attachInput } from './input.js';

// Alle kleuren komen uit het pastelpalet in style.js.
const COL=PAL;

// De kamericonen op het canvas staan in icons.js; iconSVG hieronder is de SVG-kopie voor de modal.

const qs=new URLSearchParams(location.search);
const DEBUG=qs.get('debug')==='1';
const dbgEvents=[];
const dbg=e=>{if(DEBUG)dbgEvents.push(e);};
const canvas=document.getElementById('scene');
const renderer=new THREE.WebGLRenderer({canvas,antialias:true,preserveDrawingBuffer:DEBUG});
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
// Houdt het apparaat het niet bij, dan eenmalig omlaag naar low (nooit terug). In low gaan ook de
// twee PointLights in de kamers uit (de gloeiende lampjes blijven gloeien via hun emissieve materiaal).
const gov=createGovernor(renderer,t=>{key.castShadow=t==='high';roomLights(t==='high');},TIER0);
key.castShadow=gov.tier==='high';
function roomLights(on){scene.traverse(o=>{if(o.isPointLight)o.visible=on;});}


// ─────────── de huisvorm: een kattenhuis met acht kamers (shell.js)
const shell=buildShell(scene);
const house=shell.group, door=shell.door, anchors=shell.anchors;
const roomHits=shell.slots.map(s=>s.hit), doorHit=shell.doorHit;
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
// en twee katten in de tuin. Elke kamer zet zijn bewoner zelf neer (rooms/<id>.js), via
// kit.makeCat in stap B.
const catGroups=[];   // alle katten (ook de bewoners die stap B later toevoegt), voor input.js
function placeCat(spec,pos,scale,roty){
  const c=makeCat(spec);c.position.copy(pos);c.scale.setScalar(scale);c.rotation.y=roty||0;
  scene.add(c);catGroups.push(c);return c;
}
// Voor de inrichters: een kat maken en zijn tikvlak meteen aanmelden. Met spec.room is het de
// bewoner van die kamer (een tik op hem gaat dan voor de kamer zelf).
function residentCat(spec){
  const c=makeCat(spec),h=c.userData.hit;
  if(spec.room){c.userData.room=spec.room;h.userData.catRoom=spec.room;}
  catGroups.push(c);return c;
}
placeCat({id:'mauwtje',fur:'#FFB35C',belly:'#FFD9A8',pose:'sit',accessory:'none'},anchors.mauwtje,0.95,0.15);
placeCat({id:'tuin1',fur:'#E3DCD6',belly:'#FFFFFF',pose:'play',accessory:'none'},new THREE.Vector3(-0.95,-0.2,4.05),0.8,0.5);
placeCat({id:'tuin2',fur:'#6E6672',belly:'#EDE8EE',pose:'stand',accessory:'none'},new THREE.Vector3(3.75,-0.2,2.5),0.8,-0.5);
// Groot zacht vlekje onder het huis.
{const b=blobShadow(6.2,0.28);b.scale.set(6.2,1,2.6);b.position.set(0,-0.18,0.3);scene.add(b);}

// ─────────── tuin en lucht: gras, pad, hekje, struiken, bloemen, hondenhok, wolken en flyers (garden.js)
const garden=buildGarden(scene,anchors);

// ─────────── verrassingen om aan te tikken: deurbel, klok, vogelhuisje, tuinspullen en meer (surprises.js)
const surprises=addSurprises(scene,anchors);


let hovered=null,started=false,paused=false;
const input=attachInput(canvas,camera,controls,{rooms:roomHits,door:doorHit,surprises,cats:catGroups},{
  openRoom,
  door(){dbg('door');bounceDoor();meow();},
  surprise:tapSurprise,
  cat:tapCat,
},{
  paused:()=>paused,
  onStart(){if(!started){started=true;document.getElementById('hint').style.opacity='0';}},
  onHover(o){hovered=o;},
});

let doorBounce=0;function bounceDoor(){doorBounce=1;}
// Tik op een verrassing: logt surprise:<id> en start de reactie (surprises.js).
function tapSurprise(s){dbg('surprise:'+s.id);s.react();}
// Tik op een kat: sprongetje en miauw. Een kat die ook een verrassing is (Mauwtje) reageert als verrassing.
function tapCat(c){const s=surprises.find(q=>q.object===c);if(s)return tapSurprise(s);dbg('cat:'+c.userData.catId);reactCat(c);}

const modal=document.getElementById('modal');
let currentRoom=null;
function openRoom(room){
  currentRoom=room;dbg('open:'+room.id);
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
  if(!currentRoom)return;
  if(window.KH)window.KH.launchGame(currentRoom.id);
  else if(window.toonFout)window.toonFout('de spelletjes zijn niet geladen');
};
modal.addEventListener('pointerdown',e=>{if(e.target===modal)modal.classList.remove('open');});

function roomBlurb(n){return ({
  Memory:'Vind twee dezelfde kaartjes! Klaar om te spelen?',
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
  shell.eyes.scale.y=blinkAt(t);
  garden.update(t);
  updateSurprises(dt);
  renderer.render(scene,camera);
}

addEventListener('resize',()=>{camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight);
  onResize();});
// Bij draaien of een echte formaatwissel (breedte meer dan 10% anders, of de verhouding meer dan 25%)
// wordt de camera opnieuw passend gemaakt. Een adresbalk die op een telefoon verschijnt of verdwijnt
// verandert alleen de hoogte een beetje: dan blijven de draaiing en de zoom van het kind staan. Alleen
// als het huis dan uit beeld zou vallen (de camera stond op de startafstand of verder), schuift de
// camera langs dezelfde kijkrichting net zo ver terug als nodig is.
let fitW=innerWidth,fitAspect=innerWidth/innerHeight;
function onResize(){
  const a=innerWidth/innerHeight;
  if(introT<1||Math.abs(innerWidth/fitW-1)>0.1||Math.abs(a/fitAspect-1)>0.25){fitW=innerWidth;fitAspect=a;refitCamera();return;}
  const before=camEnd.distanceTo(TARGET),dist=camera.position.distanceTo(controls.target);
  fitCamera();
  const need=camEnd.distanceTo(TARGET);
  controls.maxDistance=Math.max(controls.maxDistance,dist);
  if(dist>=before*0.98&&dist<need){
    camera.position.sub(controls.target).setLength(need).add(controls.target);controls.update();
  }
}
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
    camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight);fitCamera();fitW=innerWidth;fitAspect=camera.aspect;},
};

// niet eindeloos op Google Fonts wachten (traag of geblokkeerd netwerk): max 2,5 s
await Promise.race([document.fonts.ready,new Promise(r=>setTimeout(r,2500))]).catch(()=>{});
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
    // De zwaarste zichtbare meshes (driehoeken per mesh, met naam van de mesh en zijn ouder), om het budget te bewaken.
    heavy(n=20){const out=[];scene.traverseVisible(o=>{if(!o.isMesh||o.material===undefined||o.material.opacity===0)return;
        const g=o.geometry,t=(g.index?g.index.count:g.attributes.position.count)/3*(o.isInstancedMesh?o.count:1);
        out.push({name:o.name||'?',parent:(o.parent&&o.parent.name)||'?',tris:Math.round(t),cast:o.castShadow});});
      out.sort((a,b)=>b.tris-a.tris);return out.slice(0,n);},
    // Eén beeld meten, met en zonder de schaduwpas. renderer.info telt normaal alleen de hoofdpas
    // (three.js zet de teller na de schaduwpas op nul); met autoReset uit telt de schaduwpas mee.
    budget(){const inf=renderer.info,i=inf.render;camera.updateMatrixWorld();renderer.render(scene,camera);
      const main={calls:i.calls,triangles:i.triangles};
      inf.autoReset=false;inf.reset();renderer.render(scene,camera);const all={calls:i.calls,triangles:i.triangles};inf.autoReset=true;
      return {tier:gov.tier,shadow:renderer.shadowMap.enabled&&key.castShadow,calls:main.calls,triangles:main.triangles,
        shadowCalls:all.calls-main.calls,shadowTriangles:all.triangles-main.triangles,totalCalls:all.calls,totalTriangles:all.triangles};},
    // Per kamer: het midden van de kamer als schermpunt (daar tikt een kind) en de maat van het tikvlak.
    rooms(){return roomHits.map(h=>{const id=h.userData.room.id;
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
    door(){return pt(doorHit);},
    // Verrassingen: id, tikpunt (midden van het tikvlak) op het scherm, of de reactie loopt, en hoeveel
    // keer zo groot het tikvlak is als het object (kleinste as).
    surprises(){scene.updateMatrixWorld(true);return surprises.map(s=>({id:s.id,...pt(s.hit),active:s.active,ratio:s.hit.userData.ratio}));},
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
    // Wereldpunt naar schermpunt.
    project(x,y,z){camera.updateMatrixWorld();const q=new THREE.Vector3(x,y,z).project(camera);return {x:Math.round((q.x+1)/2*innerWidth),y:Math.round((1-q.y)/2*innerHeight)};},
    tap(x,y){fire('pointerdown',x,y,1);fire('pointerup',x,y,0);},
    // Wat een tik op dit schermpunt zou raken, zonder iets te activeren: 'surprise:<id>', 'cat:<id>', 'door', 'room:<id>' of null.
    pickAt(x,y){camera.updateMatrixWorld();scene.updateMatrixWorld(true);const p=input.pick(x,y);if(!p)return null;
      return p.kind==='surprise'?'surprise:'+p.target.id:p.kind==='cat'?'cat:'+p.target.userData.catId:p.kind==='room'?'room:'+p.target.id:'door';},
    // Camerastand: azimut en polaire hoek in graden, afstand tot het doelpunt, en de afstand van de startstand.
    cam(){return {azimuth:+THREE.MathUtils.radToDeg(controls.getAzimuthalAngle()).toFixed(2),polar:+THREE.MathUtils.radToDeg(controls.getPolarAngle()).toFixed(2),
      distance:+camera.position.distanceTo(controls.target).toFixed(3),home:+camEnd.distanceTo(TARGET).toFixed(3)};},
    drag(x0,y0,x1,y1){fire('pointerdown',x0,y0,1);
      for(let i=1;i<=6;i++)fire('pointermove',x0+(x1-x0)*i/6,y0+(y1-y0)*i/6,1);
      fire('pointerup',x1,y1,0);},
    frame(){camera.updateMatrixWorld();renderer.render(scene,camera);},
    // Camera direct naar de startstand, en het uitdempen van een sleepbeweging direct afmaken
    // (headless rendert te traag om daarop te wachten).
    home(){this.settle();resetCam=0;controls.target.copy(TARGET);camera.position.copy(camEnd);controls.update();},
    settle(){for(let i=0;i<300;i++)controls.update();},
    // Lampen in de scène: aantal PointLights en aantal lampen dat schaduw werpt.
    lights(){let point=0,pointOn=0,shadow=0;scene.traverse(o=>{if(!o.isLight)return;if(o.isPointLight){point++;let on=o.visible&&o.intensity>0;o.traverseAncestors(a=>{if(!a.visible)on=false;});if(on)pointOn++;}if(o.castShadow)shadow++;});return {point,pointOn,shadow};},
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
        doghouse:w(garden.parts.doghouse),doghouseRect:(()=>{const b=visBox(garden.parts.doghouse);let x0=1e9,y0=1e9,x1=-1e9,y1=-1e9;
          for(const x of [b.min.x,b.max.x])for(const y of [b.min.y,b.max.y])for(const z of [b.min.z,b.max.z]){const q=new THREE.Vector3(x,y,z).project(camera);
            const sx=(q.x+1)/2*innerWidth,sy=(1-q.y)/2*innerHeight;x0=Math.min(x0,sx);x1=Math.max(x1,sx);y0=Math.min(y0,sy);y1=Math.max(y1,sy);}
          return {x0:Math.round(x0),y0:Math.round(y0),x1:Math.round(x1),y1:Math.round(y1)};})(),doghouseAnchor:{x:anchors.doghouse.x,y:anchors.doghouse.y,z:anchors.doghouse.z},
        flowerTop:(()=>{const f=garden.group.getObjectByName('garden-flower-heads');f.computeBoundingBox();return f.boundingBox.max.y;})(),
        calls:calls-calls0,triangles:tris-tris0};},
  };
}
// Stap A: huisvorm, licht, lucht en kamertikvlakken staan er al en renderen direct.
animate();
// Het huis staat er: de governor gaat meten, na 2 s opwarmen (de eerste shaders zijn dan gecompileerd).
gov.arm();
if(DEBUG)window.__house.ready=true;
// Stap B: de kamermodellen op de achtergrond laden. Wat niet laadt wordt overgeslagen.
// Daarna richt furnishRooms de kamers in, ook als er modellen ontbreken (die worden overgeslagen).
// De laadcode zit in een losse import, zodat stap A er nooit op wacht of door breekt.
let assetInfo=()=>null;
import('./assets.js').then(a=>{
  assetInfo=()=>({...a.stats,wanted:a.MODELS.length});
  return a.preload(a.MODELS).then(()=>furnishRooms(shell.slots,{cloneModel:a.cloneModel,toy,soft,blobShadow,PAL,makeCat:residentCat}));
}).catch(e=>console.warn('stap B:',e)).finally(()=>{
  roomLights(gov.tier==='high');
  // De nieuwe spullen brengen nieuwe shaders mee: opnieuw even opwarmen voordat de governor meet.
  if(gov.tier==='high')gov.arm();
  if(DEBUG)window.__house.stageB='done';});
setTimeout(()=>{if(!started){controls.autoRotate=true;}},2000);
setTimeout(()=>{const l=document.getElementById('load');if(l){l.style.opacity='0';setTimeout(()=>l.remove(),500);}},700);
