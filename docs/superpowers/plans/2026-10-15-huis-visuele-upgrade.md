# Visuele upgrade 3D-huis: implementatieplan

> **Voor agents die dit uitvoeren:** VERPLICHTE SUB-SKILL: gebruik superpowers:subagent-driven-development (aanbevolen) of superpowers:executing-plans om dit plan taak voor taak uit te voeren. Stappen gebruiken checkboxen (`- [ ]`) om de voortgang bij te houden.

**Doel:** het 3D-hoofdscherm wordt een kattenvormig poppenhuis in Gabby's Dollhouse-stijl, met eigen kamers, één stijl, warm licht en tikbare verrassingen, en lichter dan nu.

**Architectuur:** de inline `<script type="module">` met het 3D-huis (`index.html` regels 3226 tot het eind) verhuist naar `js/house/`, opgesplitst per verantwoordelijkheid. Er is geen build-stap: gewone ES-modules via de bestaande importmap. 3D-modellen staan als gecomprimeerde GLB in `assets/models/` en laden in twee stappen. De 2D-spellen in het klassieke script blijven onaangeroerd. De koppeling loopt alleen via `window.KH` en `window.__hub3d`.

**Tech stack:** Three.js r184 (gevendord in `vendor/three/`), GLTFLoader, `@gltf-transform/cli` (alleen als dev-tool), Playwright met het vooraf geïnstalleerde Chromium voor rooktests en screenshots.

**Spec:** `docs/superpowers/specs/2026-10-15-huis-visuele-upgrade-design.md`

## Globale eisen

- Geen build-stap en geen CDN. Alles staat lokaal en Vercel serveert statisch.
- Prestatiebudget in de standaardstand: hooguit 150 draw calls (`renderer.info.render.calls`) en 150.000 driehoeken (`renderer.info.render.triangles`).
- Modellen en texturen samen hooguit 6 MB. De eerste laadstap (huisvorm, licht en lucht) is hooguit 1,5 MB. Texturen zijn maximaal 1024 px.
- Geen SAO, geen bloom en geen nabewerkingsketen.
- Hooguit één lamp met echte schaduw. Andere lichtbronnen werpen geen schaduw.
- Pixelratio maximaal 2 in de hoge stand en maximaal 1,5 in de lage stand.
- Alleen CC0-modellen (of een licentie die vrij gebruik toestaat), elk vermeld in `assets/CREDITS.md`.
- Geen personages, namen, logo's of beelden van Gabby's Dollhouse.
- Teksten in het Nederlands, zonder em dashes.
- Blijft werken: draaien met vinger of muis, automatisch draaien bij stilstand, een tik op een kamer opent het pop-upkaartje met "Spelen!" en dat start `window.KH.launchGame(id)` met de ids `memory`, `puzzel`, `vormen`, `tellen`, `kleuren`, `verkleden`, `speel`, `stickers`. Een tik op de voordeur laat die stuiteren en miauwen. `window.__hub3d.pause()` en `resume()` blijven bestaan.
- Een tik telt alleen als die korter is dan 450 ms en minder dan 7 px beweegt (zoals nu).
- Werk op branch `claude/house-visual-upgrade-avn10s`. Na elke fase pushen en Luuk een korte melding geven. Aan het eind zelf een PR naar `main` openen en mergen, zonder force push.

## Aandachtspunten voor review

1. Slepen dat begint op een verrassing of kamer mag niets activeren. Alleen een korte tik zonder beweging telt. (Test in Taak 1 en Taak 9.)
2. Terug uit een spel (`__hub3d.resume()`) en draaien van een iPad tussen staand en liggend: de canvasgrootte, de camera en de tikvlakken kloppen daarna nog. (Test in Taak 3.)
3. Een model dat niet laadt, of een trage verbinding, mag het huis niet breken. De huisvorm en de kamers blijven aan te tikken, en ontbrekende spullen worden overgeslagen. (Test in Taak 4.)
4. Met het geluid uit spreekt en piept een verrassing niet, maar beweegt wel. (Test in Taak 9.)
5. Op een zwak apparaat schakelt de kwaliteit automatisch omlaag en blijft daar staan. Er mag geen heen-en-weer flikkeren tussen de standen ontstaan. (Test in Taak 3.)

---

## Bestandsstructuur

| Bestand | Verantwoordelijkheid |
|---|---|
| `index.html` | HTML, CSS, klassieke 2D-spellen. Laadt `js/house/main.js` als module. |
| `js/house/main.js` | Renderer, scène, camera, OrbitControls, animatielus, `__hub3d`-brug, opbouw in twee stappen. |
| `js/house/style.js` | Palet `PAL`, materiaalfabrieken `toy()` en `soft()`, schaduwvlekje `blobShadow()`. |
| `js/house/quality.js` | Kwaliteitsstanden en automatisch omlaag schakelen. |
| `js/house/assets.js` | GLB laden met cache en foutafhandeling. |
| `js/house/shell.js` | Kattenvormige huisvorm, dak met oren, gevelgezicht, voordeur, trap of glijbaan, kamerplekken, bordjes. |
| `js/house/rooms/index.js` | `ROOMS`-lijst en de koppeling van kamer aan plek en inrichter. |
| `js/house/rooms/<id>.js` | Eén inrichter per kamer (acht bestanden). |
| `js/house/cats.js` | Eén kattenstijl met varianten en tik-reactie. |
| `js/house/surprises.js` | Register van tikbare verrassingen en hun reacties. |
| `js/house/garden.js` | Tuin, pad, hek, lucht, wolken, vliegers. |
| `js/house/input.js` | Raycast, onderscheid tikken en slepen, hover-tip. |
| `js/house/debug.js` | Alleen actief met `?debug=1`: `window.__house` voor tests. |
| `vendor/three/examples/jsm/loaders/GLTFLoader.js` (+ `utils/BufferGeometryUtils.js`) | Uit `three@0.184.0` (npm), ongewijzigd. |
| `assets/models/*.glb`, `assets/CREDITS.md` | Gecomprimeerde modellen en licenties. |
| `tools/package.json`, `tools/smoke.mjs`, `tools/shot.mjs`, `tools/optimize.sh` | Dev-tools. Staan in `.vercelignore` en worden niet gedeployd. |

## Testaanpak

Er is geen testframework. Elke taak wordt bewezen met twee scripts:

- `node tools/smoke.mjs` laadt `http://127.0.0.1:8765/index.html?debug=1` in headless Chromium (`/opt/pw-browsers/chromium-1194/chrome-linux/chrome`, vlaggen `--use-angle=swiftshader --enable-unsafe-swiftshader --ignore-gpu-blocklist --no-proxy-server`). Het wacht op `window.__house?.ready`, voert de controles uit die bij de taak horen en eindigt met code 0 en `SMOKE OK`, of met code 1 en de eerste fout. Paginafouten en mislukte verzoeken naar het eigen domein tellen als fout. `fonts.googleapis.com` en `favicon.ico` worden genegeerd.
- `node tools/shot.mjs <naam>` maakt `shots/<naam>-phone.png` (390x844) en `shots/<naam>-desk.png` (1280x800). Dat gebeurt via `canvas.toDataURL` na `__house.frame()`, met de lage kwaliteitsstand (`?debug=1&q=low`) zodat SwiftShader het trekt. `shots/` staat in `.gitignore`.

Server tijdens het testen: `python3 -m http.server 8765` vanuit de repo-root. Bekijk na elke visuele taak de screenshots (Read-tool) en beoordeel ze tegen de spec voordat je commit.

---

### Taak 1: Testgereedschap en debug-hook

**Bestanden:**
- Maak: `tools/package.json` (dependency `playwright@1.56`), `tools/smoke.mjs`, `tools/shot.mjs`, `.vercelignore` (`tools/`, `shots/`, `docs/`), `.gitignore` (`tools/node_modules/`, `shots/`)
- Wijzig: inline 3D-module in `index.html` (debug-hook toevoegen)

**Interfaces:**
- Levert: `window.__house` (alleen met `?debug=1`):
  `{ ready: boolean, info(): {calls:number, triangles:number, tier:'high'|'low'}, rooms(): {id:string, x:number, y:number}[], tap(x:number, y:number): void, drag(x0:number,y0:number,x1:number,y1:number): void, frame(): void, events: string[] }`.
  `rooms()` geeft per kamer het schermpunt van het midden. `tap` en `drag` sturen echte pointer-events naar het canvas. `events` logt `open:<id>`, `door`, `surprise:<id>` en `cat:<id>`. `frame()` rendert één beeld synchroon.
- `?q=low` dwingt de lage stand af (in deze taak alleen: geen composer, pixelratio 1, geen schaduw).

- [ ] **Stap 1:** schrijf `tools/smoke.mjs` met de controles `geen paginafouten`, `__house.ready binnen 60 s`, `rooms().length === 8`, `tap op elk kamermidden logt open:<id> voor alle acht ids`, `drag van 120 px vanaf een kamermidden logt niets`, `tap op de voordeur logt door`.
- [ ] **Stap 2:** draai `cd tools && npm i && node smoke.mjs`. Verwacht: FAIL op `__house.ready`.
- [ ] **Stap 3:** voeg de debug-hook en `?q=low` toe aan de bestaande module. `openRoom` en de deurtik pushen naar `events`.
- [ ] **Stap 4:** draai `node smoke.mjs`. Verwacht: `SMOKE OK`. Draai `node shot.mjs baseline` en controleer dat het huis zichtbaar is op de screenshots (geen lege afbeelding).
- [ ] **Stap 5:** commit `Testgereedschap: rooktest, screenshots en debug-hook`.

### Taak 2: 3D-module verhuist naar `js/house/main.js`

**Bestanden:**
- Maak: `js/house/main.js` (de inhoud van de inline module, letterlijk overgezet)
- Wijzig: `index.html` (inline module vervangen door `<script type="module" src="js/house/main.js"></script>`)

**Interfaces:** ongewijzigd. Dit is een pure verhuizing.

- [ ] **Stap 1:** verplaats de module zonder inhoudelijke wijziging. Relatieve paden in de module blijven via de importmap werken.
- [ ] **Stap 2:** draai `node tools/smoke.mjs`. Verwacht: `SMOKE OK`. Draai `node tools/shot.mjs verhuisd` en vergelijk met `baseline`: die moeten gelijk zijn.
- [ ] **Stap 3:** commit `Verplaats het 3D-huis naar js/house/main.js`.

### Taak 3: Prestatiebasis, palet en licht (fase 1)

**Bestanden:**
- Maak: `js/house/quality.js`, `js/house/style.js`
- Wijzig: `js/house/main.js` (composer, SAO, bloom en grade-shader eruit, lichtopstelling, materialen via `style.js`)

**Interfaces:**
- Levert `quality.js`: `initialTier(): 'high'|'low'` (`low` bij `?q=low`, bij `navigator.hardwareConcurrency <= 2`, of bij een WebGL1-context) en `createGovernor(renderer, onChange:(tier)=>void): { tick(dtSeconds:number): void, tier: 'high'|'low' }`. De governor schakelt naar `low` als het gemiddelde over 3 s onder 28 fps ligt. Daarna blijft hij `low`, zonder terugschakelen. In `low`: pixelratio 1, schaduwkaart uit, de schaduwlamp werpt geen schaduw. In `high`: pixelratio `min(2, devicePixelRatio)`, één `DirectionalLight` met een PCF-schaduwkaart van 1024.
- Levert `style.js`: `PAL` (object met hex-strings, minimaal `pink`, `pinkD`, `lilac`, `lilacD`, `cream`, `mint`, `sky`, `butter`, `peach`, `wood`, plus `room` met een accentkleur per kamer-id), `toy(hex, {gloss?:number}) -> MeshStandardMaterial` (glanzend speelgoedplastic, roughness rond 0,35, gecachet per kleur en gloss), `soft(hex) -> MeshStandardMaterial` (stof en mat, roughness rond 0,9) en `blobShadow(radius:number, opacity?:number) -> Mesh` (plat vlak met een radiale gradiënttextuur, één gedeelde textuur, `depthWrite:false`).
- Licht: `HemisphereLight` (warm boven, licht roze onder), één warme `DirectionalLight` als zon, `scene.environment` uit `RoomEnvironment`, tone mapping ACES met exposure tussen 0,9 en 1,1. Stem de waarden af op de screenshots: niets mag overbelicht zijn (zie de commits `a6850b3` en `f24c7ed`).

- [ ] **Stap 1:** breid de smoke uit: `info().calls <= 150`, `info().triangles <= 150000` (voorlopig alleen loggen, zonder te falen, tot Taak 11), na `resize` naar 844x390 en terug klopt `rooms()` nog met een tik die `open:<id>` geeft, `__hub3d.pause(); __hub3d.resume()` gevolgd door een kamertik werkt nog, en `?q=low` geeft `tier === 'low'`.
- [ ] **Stap 2:** draai smoke. Verwacht: FAIL op `tier`.
- [ ] **Stap 3:** implementeer `quality.js` en `style.js`, verwijder de nabewerking uit `main.js` (en de dan ongebruikte bestanden uit `vendor/three/examples/jsm/postprocessing` en `shaders`), en zet alle `M()`- en `F()`-aanroepen om naar `toy()` en `soft()` met het nieuwe palet.
- [ ] **Stap 4:** test de governor door in een unit-achtige check in smoke `createGovernor` met nep-dt's te voeden: 3 s aan 40 ms per beeld geeft `low`, en daarna 3 s aan 10 ms blijft `low`.
- [ ] **Stap 5:** smoke OK, `shot.mjs fase1`, screenshots beoordelen op een rustig palet, geen overbelichting en zachte schaduwvlekjes.
- [ ] **Stap 6:** commit, push, en meld Luuk dat fase 1 op de preview staat.

### Taak 4: Modellen-pijplijn en laden in stappen

**Bestanden:**
- Maak: `vendor/three/examples/jsm/loaders/GLTFLoader.js`, `vendor/three/examples/jsm/utils/BufferGeometryUtils.js` (uit `npm pack three@0.184.0`), `js/house/assets.js`, `tools/optimize.sh`, `assets/models/`, `assets/CREDITS.md`
- Wijzig: `js/house/main.js`

**Interfaces:**
- Levert `assets.js`: `loadModel(name:string) -> Promise<THREE.Group|null>` (laadt `assets/models/<name>.glb`, cachet per naam, geeft bij een fout `null` en logt `console.warn`, nooit een throw), `cloneModel(name:string) -> THREE.Group|null` (alleen na laden) en `preload(names:string[]) -> Promise<void>`.
- `main.js` bouwt in twee stappen: stap A (huisvorm, licht, lucht, kamertikvlakken) rendert direct en zet `__house.ready`, stap B (`preload` van alle kamermodellen en daarna de inrichting en katten) vult aan.
- `tools/optimize.sh <in.glb> <out.glb>`: `npx @gltf-transform/cli optimize` met meshopt-compressie, texture-resize naar 1024 en webp. De bijbehorende `MeshoptDecoder` komt uit `vendor/three/examples/jsm/libs/meshopt_decoder.module.js` (ook uit `three@0.184.0`).

Bronnen: haal CC0-modellen met `git clone --depth 1` uit openbare GitHub-repo's. In deze omgeving werkt `git clone` van github.com wel, maar `kenney.nl`, `quaternius.com` en `poly.pizza` niet. Zoek eerst op GitHub (Kenney-starterkits van `KenneyNL` en andere repo's waarvan de licentie CC0 vermeldt). Lever een kandidatenlijst op met per model de repo, de licentie en een preview-screenshot via `shot.mjs`. **Poort:** als er voor de kamers onvoldoende passende meubels en speelgoed te vinden zijn, stop dan en vraag Luuk om `kenney.nl` en `quaternius.com` toe te voegen onder Allowed domains in de netwerkinstelling van de omgeving. Bouw niet verder met een mix van stijlen.

- [ ] **Stap 1:** smoke uitbreiden: met `?debug=1&failmodels=1` (laat `loadModel` altijd `null` geven) blijft `ready` waar, `rooms().length === 8` en geven alle kamertikken `open:<id>`.
- [ ] **Stap 2:** draai smoke. Verwacht: FAIL (de vlag bestaat nog niet).
- [ ] **Stap 3:** vendor de loader-bestanden, implementeer `assets.js` en het laden in twee stappen.
- [ ] **Stap 4:** zoek en selecteer modellen, optimaliseer ze naar `assets/models/` en vul `CREDITS.md`. Controleer de totale grootte met `du -ch assets/models/*.glb` (hooguit 6 MB) en de bestanden van stap A (hooguit 1,5 MB).
- [ ] **Stap 5:** smoke OK, commit `Modellen-pijplijn en laden in stappen`.

### Taak 5: Kattenvormige huisvorm (fase 2)

**Bestanden:**
- Maak: `js/house/shell.js`, `js/house/rooms/index.js`
- Wijzig: `js/house/main.js` (oude opbouw met `backWall`, `slab`, `wall`, `plinth`, `roof`, `door` en `roomTexture` eruit)

**Interfaces:**
- Levert `shell.js`: `buildShell(scene) -> { group: THREE.Group, slots: Slot[], door: THREE.Object3D, doorHit: THREE.Mesh, anchors: Record<string, THREE.Vector3> }`. `Slot = { id:string, center:THREE.Vector3, size:THREE.Vector3, floorY:number, hit:THREE.Mesh }`. Acht slots, één per kamer-id, en `hit.userData.room` wijst naar het `ROOMS`-item. `anchors` bevat minstens `doorbell`, `clock`, `birdhouse`, `mailbox`, `flowerpot`, `mauwtje`, `doghouse`, `wateringcan`, `ball`.
- Levert `rooms/index.js`: `ROOMS` (zelfde ids en namen als nu, `color` uit `PAL.room`) en `furnishRooms(slots, kit) -> void`. Dat roept per kamer `rooms/<id>.js` aan als die bestaat. Tot Taak 7 is dat een lege functie.
- Vorm: een rond kattenlijf met twee oren op het dak en een vriendelijk gezichtje in de gevel boven de deur. Drie verdiepingen, met de voordeur in het midden onderaan. Plinten, behang (canvas-textuur per kamer, rustig patroon in de accentkleur) en een vloerpatroon. Een trap of glijbaan die de verdiepingen zichtbaar verbindt. Boven elke kamer een bordje met het kamericoon (`drawIcon` uit de huidige code), altijd volledig zichtbaar en zonder tekst op de achterwand.
- Staand op 390x844 moet het hele huis in beeld passen, met elk kamertikvlak minstens 70x70 px op het scherm. Pas `camEnd`, `TARGET` en `minDistance`/`maxDistance` aan.

- [ ] **Stap 1:** smoke uitbreiden: elk van de acht `rooms()`-punten ligt binnen het viewport op 390x844, de rechthoek van elk tikvlak op het scherm is minstens 70x70 px, en de deur wordt via `anchors` getikt en logt `door`.
- [ ] **Stap 2:** draai smoke. Verwacht: FAIL op de maat van de tikvlakken.
- [ ] **Stap 3:** implementeer `shell.js` en `rooms/index.js`.
- [ ] **Stap 4:** smoke OK, `shot.mjs fase2`, en beoordeel of het silhouet als kat leest en er geen afgesneden bordjes zijn. Bekijk ook vanuit twee draaihoeken (`drag` gevolgd door `frame`).
- [ ] **Stap 5:** commit, push en meld Luuk fase 2.

### Taak 6: Katten in één stijl

**Bestanden:**
- Maak: `js/house/cats.js`
- Wijzig: `js/house/main.js` (`makeCat`, `makeLoafCat`, `makeStandCat`, `makePlayCat`, `makeSleepCat`, `addCat` en `addSpecial` eruit)

**Interfaces:**
- Levert: `makeCat({ id:string, fur:string, belly:string, pose:'sit'|'loaf'|'stand'|'play', accessory?:'brush'|'hat'|'bow'|'glasses'|'crown'|'scarf'|'none' }) -> THREE.Group`. Daarbij is `userData.catId = id` en zit er een `blobShadow` onder. `reactCat(group) -> void` geeft een sprongetje met squash en stretch van 0,5 s en `window.KH.meow()`.
- Eén basismodel (een GLB uit Taak 4 als dat in stijl past, anders de huidige code-kat verfijnd tot één vorm). Elf katten: acht bewoners (één per kamer-id), `mauwtje` (oranje, `fur:'#FFB35C'`, `belly:'#FFD9A8'`) bij de deur, en `tuin1` en `tuin2`. Een bewoner is ongeveer 0,45 keer de kamerhoogte en Mauwtje is kleiner dan de deur.
- Een tik op een kat logt `cat:<id>` (`mauwtje` logt `surprise:mauwtje`, zie Taak 9).

- [ ] **Stap 1:** smoke uitbreiden: elf objecten met `userData.catId`, en de bounding box van Mauwtje is lager dan die van de deur.
- [ ] **Stap 2:** draai smoke. Verwacht: FAIL.
- [ ] **Stap 3:** implementeer `cats.js` en zet de katten op hun plek. De bewoners komen pas in Taak 7 in hun kamer, tot dan op `slot.center`.
- [ ] **Stap 4:** smoke OK, screenshots beoordelen op één stijl en kloppende schaal, en commit.

### Taak 7: Kamers inrichten, deel 1 (Memory, Puzzel, Vormen, Tellen)

**Bestanden:**
- Maak: `js/house/rooms/memory.js`, `puzzel.js`, `vormen.js`, `tellen.js`
- Wijzig: `js/house/rooms/index.js`, `js/house/main.js` (oude inrichting rond `// ─────────── ingerichte kamers` eruit, en ook `painting`, `plant`, `stool` en `artTex` als niets ze meer gebruikt)

**Interfaces:**
- Elk bestand exporteert `furnish(slot:Slot, kit:{ cloneModel, toy, soft, blobShadow, PAL, makeCat }) -> void`. Dat voegt vijf tot tien eigen spullen toe aan `slot` (niet herhaald uit andere kamers, behalve generieke bouwstenen als een kleed), plus de bewoner-kat met een passend accessoire. Het voegt geen tikvlakken toe.
- Thema's (uit de spec): Memory is een spelletjeskamer (lage tafel met kaartjes, zitkussens, kast met spellendozen). Puzzel is een hobbyzolder (halve puzzel op een kleed, kist met stukjes, plank met dozen). Vormen is een klaslokaaltje (schoolbord met vormen, tafeltjes, vormenstoof). Tellen is een aquariumkamer (groot aquarium met visjes, bubbels, zitbank).
- Per kamer hooguit 12 draw calls. Statische spullen binnen een kamer mogen met `BufferGeometryUtils.mergeGeometries` per materiaal worden samengevoegd.
- Er komen alleen dingen in die binnen `slot.size` passen en de kat niet bedekken vanuit de standaardcamera.

- [ ] **Stap 1:** smoke uitbreiden: per gemeubileerde kamer is het aantal draw calls te meten via `info()` voor en na het verbergen van die kamer (debug-hook `hideRoom(id)`, voeg toe aan `__house`), en dat is hooguit 12. Alle kamertikken werken nog.
- [ ] **Stap 2:** implementeer de vier kamers.
- [ ] **Stap 3:** smoke OK, en een screenshot per kamer van dichtbij (debug-hook `focusRoom(id)`, voeg toe aan `__house`), beoordeeld op een herkenbaar thema, geen herhaling en de kat goed zichtbaar.
- [ ] **Stap 4:** commit.

### Taak 8: Kamers inrichten, deel 2 (Kleuren, Verkleden, Speelkamer, Stickers)

Zelfde interfaces, regels en stappen als Taak 7, voor `rooms/kleuren.js` (atelier: ezel, verfpotten, spetters, kwasten in een pot), `rooms/verkleden.js` (kleedkamer met podium: spiegel met lampjes, kledingrek, hoedenplank, gordijntjes), `rooms/speel.js` (mini-circus: gestreept tentdoek, xylofoon, draaimolentje, ballen) en `rooms/stickers.js` (slaapkamertje: bed, muur vol stickers, groot plakboek, nachtlampje). Warme lampjes als emissief materiaal en hooguit twee `PointLight`'s zonder schaduw voor het hele huis, in de kamers die het meest profiteren. Commit, push, en meld Luuk fase 3 (alle kamers).

### Taak 9: Tikbare verrassingen

**Bestanden:**
- Maak: `js/house/surprises.js`, `js/house/input.js`
- Wijzig: `index.html` (`window.KH` uitbreiden), `js/house/main.js` (pointer-afhandeling verhuist naar `input.js`)

**Interfaces:**
- `window.KH` krijgt `say(lines:string[]) -> void` (kiest met `pick` een zin, vervangt `{NAAM}` door `NAAM` en roept `speak` aan, die al rekening houdt met `soundOn`) en `sfx(name:string) -> void` (roept `sfx[name]()` aan als het geluid aan staat en de naam bestaat).
- `surprises.js`: `addSurprises(scene, anchors) -> Surprise[]` met `Surprise = { id:string, object:THREE.Object3D, hit:THREE.Mesh, react():void }`. Het tikvlak is minstens 1,6 keer de objectgrootte, met `hit.userData.surprise = id`. Ids en reacties staan in de tabel van de spec: `mauwtje`, `deurbel`, `klok`, `brievenbus`, `bloempot`, `vogelhuisje`, `hond`, `gieter`, `voetbal`, `lucht`. De zinnen komen letterlijk uit de oude handlers in `scenes.hub` (`index.html` rond regels 1940 tot 2020). Animaties zijn eenvoudige tweens in de animatielus, zonder animatiebestanden.
- `input.js`: `attachInput(canvas, camera, controls, targets:{ rooms:Mesh[], door:Mesh, surprises:Surprise[], cats:Group[] }, handlers:{ openRoom, door, surprise, cat }) -> void`. Volgorde bij een tik: verrassing, kat, deur, kamer. Een tik op een verrassing in een kamer opent die kamer dus niet. Het onderscheid tussen tikken en slepen gebeurt zoals in de globale eisen.
- Elke reactie pusht `surprise:<id>` naar `__house.events`.

- [ ] **Stap 1:** smoke uitbreiden: voor elk van de tien ids is er via de debug-hook `surprises()` (schermpunt per id) een tik die `surprise:<id>` logt en geen `open:`. Slepen vanaf elk verrassingspunt logt niets. Met `localStorage.kh_sound='uit'` en een gestubde `speechSynthesis.speak` wordt bij een verrassing `speak` 0 keer aangeroepen.
- [ ] **Stap 2:** draai smoke. Verwacht: FAIL.
- [ ] **Stap 3:** implementeer `KH.say` en `KH.sfx`, `surprises.js` en `input.js`.
- [ ] **Stap 4:** smoke OK, screenshots, commit.

### Taak 10: Tuin en lucht

**Bestanden:**
- Maak: `js/house/garden.js`
- Wijzig: `js/house/main.js` (`grassTexture`, `bush`, `flower`, `tree`, `cloud`, `balloon`, `yarn`, `butterfly`, de regenboog, de zon en de losse grassprieten eruit)

**Interfaces:**
- Levert: `buildGarden(scene, anchors) -> { update(t:number): void, flyers: THREE.Object3D[] }`. `flyers` zijn de dingen in de lucht, getikt via de verrassing `lucht`.
- Rustig: één grasvlak met een zachte textuur, een pad naar de deur, een laag hek, een paar struiken en bloemen op schaal (een bloem is lager dan een zittende kat), het hondenhok op `anchors.doghouse`, een zachte gradiëntlucht met een paar wolken. De regenboog verdwijnt, of staat volledig in beeld bij de standaardcamera op 390x844 en 1280x800.
- Gras en bloemen via `InstancedMesh`. De hele tuin hooguit 25 draw calls.

- [ ] **Stap 1:** implementeer, smoke OK (inclusief de tik op `lucht` en `hond`).
- [ ] **Stap 2:** screenshots: de tuin omlijst het huis en concurreert er niet mee.
- [ ] **Stap 3:** commit, push, en meld Luuk fase 4.

### Taak 11: Afwerking, UI en prestatiecontrole (fase 5)

**Bestanden:**
- Wijzig: `index.html` (CSS van de titel, de knoppen, het pop-upkaartje en het laadscherm), `js/house/main.js`, `tools/smoke.mjs`, `README.md`

**Eisen:**
- Op 390x844 overlapt de titel "Het Huis van Sep" de knoppen niet (smoke: de `getBoundingClientRect` van de titel en van elke knop snijden elkaar niet) en staat de titel niet over het dak bij de startcamera. Houd rekening met de safe area (`env(safe-area-inset-top)`).
- Het pop-upkaartje krijgt het nieuwe palet en ronde speelgoedvormen. De hover-tip toont de kamernaam.
- Een kleine idle-animatie: de katten ademen en het gezicht in de gevel knippert af en toe met de ogen.
- Het budget is nu hard in de smoke: `calls <= 150` en `triangles <= 150000` in de stand `high` met alle stappen geladen.
- README: de kamertabel en de verrassingen kloppen met de nieuwe werkelijkheid, plus een korte sectie "Voor ontwikkelaars" (smoke, shot, optimize).

- [ ] **Stap 1:** maak de budgetcontrole hard en voeg de titeloverlap-controle toe. Draai smoke en noteer de waarden.
- [ ] **Stap 2:** implementeer de afwerking, en verlaag het aantal draw calls of driehoeken als het budget faalt.
- [ ] **Stap 3:** smoke OK, eindscreenshots, en vraag een whole-branch review aan (superpowers:requesting-code-review).
- [ ] **Stap 4:** controleer dat er geen em dashes in nieuwe tekst staan (`git diff main -- . ':!vendor' | grep '^+' | grep -c '—'` geeft 0) en geen geheimen.
- [ ] **Stap 5:** open een PR naar `main` met de screenshots in de beschrijving, merge die zelf (geen force push), controleer de productie-deploy op spelletje-peach.vercel.app en meld Luuk het resultaat met de vraag om het op de oude iPad te testen.
