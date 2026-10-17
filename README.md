# 🏠 Het Huis van Sep

Een vrolijk, kleurrijk browserspel voor Sep (5, bijna 6 jaar), geïnspireerd op
Gabby's Dollhouse en Pok Pok. Puzzeltjes, simpele opdrachtjes en heel veel om
vrij te ontdekken. Alles wordt voorgelezen met een Nederlandse stem, dus lezen
is niet nodig.

## Zo speel je

Open `index.html` via een webserver (of gewoon op Vercel). Het startscherm is
een **3D-poppenhuis in de vorm van een kat**: een lila kop met oren, ogen die af
en toe knipperen en snorharen, en daaronder een roze lijf met acht kamers, een
voordeur en een glijbaan. Sleep met de muis of vinger om het huis rond te
draaien. In het begin draait het huis vanzelf langzaam rond. Tik op een
kamer: er verschijnt een kaartje met **Spelen!**, en dat start het spelletje
van die kamer. Werkt met muis en touch, staand en liggend.

Het huis is gebouwd met Three.js (WebGL). De Three.js-bibliotheek staat lokaal
mee in `vendor/three/`, dus het spel heeft geen CDN en geen build-stap nodig.
Omdat het spel ES-modules gebruikt, moet het via `http(s)` geladen worden (een
webserver of Vercel), niet met een dubbelklik op het bestand.

## De kamers

Elke kamer heeft een eigen thema, een eigen accentkleur en een eigen bewoner:
een speelgoedkat met een accessoire dat bij de kamer past. Een tik op de kat
in een kamer opent ook die kamer.

| Kamer | Thema in het huis | Bewoner | Wat doe je er? |
|---|---|---|---|
| Memory | Spelletjeskamer met een laag tafeltje vol kaartjes, zitkussens en spellendozen | Crèmekleurige kat met een strik | Paartjes zoeken op de speeltafel (4, 6 of 8 paar) |
| Puzzel | Hobbyzolder met een half gelegde puzzel, een kist vol stukjes en een plank met dozen | Zandkleurige kat met een sjaal | Sleep-puzzels van 4, 6 of 9 stukjes; kies zelf uit 5 plaatjes (raket, brandweer, kattenhuis, piratenschip, racebaan) |
| Vormen | Klaslokaaltje met een schoolbord vol krijtvormen, schooltafeltjes en een vormenstoof | Lila juf-kat met een brilletje | Vormen naar de juiste schaduw slepen op het schoolbord |
| Tellen | Aquariumkamer met rondzwemmende visjes, bubbels, een zitbank en een lamp | Donkere kat met een duikbril | Tellen in het aquarium: klik het goede cijfer |
| Kleuren | Atelier met een schildersezel, verfpotten, spetters en tekeningen aan de muur | Witte kat met een kwast | Zes kleurplaten (kat, raket, vis, raceauto, dino, kasteel) en vrij tekenen op de schildersezel |
| Verkleden | Kleedkamer met een podium, een kaptafel vol lampjes, een kledingrek en hoeden | Roze kat met een hoge hoed | De kat op het podium aankleden: hoeden, capes, vleugels, een vriendje en meer. Sticker na 4 soorten kleding |
| Speelkamer | Mini-circus met tentdoek, vlaggetjes, circusballen, een xylofoon en een draaimolentje | Bruine kat met een kroontje | Circustent vol knopjes: xylofoon, bellenblaas, draaimolen, verrassingsdoosjes. Sticker na 5 verschillende speeltjes |
| Stickers | Slaapkamertje met een bed, een maantje als nachtlampje en een muur vol stickers | Grijze kat met een slaapmuts | 18 te verdienen stickers vrij in je plakboek plakken |

Met de spelletjes verdien je stickers voor het stickerboek. Er is geen "game
over" en niets gaat ooit fout: alles mag opnieuw en op je eigen tempo.

## Verrassingen

In en rond het huis kun je overal op tikken. Elke verrassing heeft een ruim,
onzichtbaar tikvlak (op een telefoon minstens zo groot als een vingertop), en
draaien met de vinger zet nooit per ongeluk iets in gang. Met het geluid uit
bewegen de verrassingen wel, maar zeggen ze niets.

| Verrassing | Waar | Wat gebeurt er? |
|---|---|---|
| Mauwtje de kat | Voor het huis, rechts van het pad | Springt op, miauwt en zegt iets liefs |
| Voordeur | Midden onderaan | Stuitert en miauwt |
| Deurbel | Naast de voordeur | Ding-dong, en de deur gaat even open |
| Koekoeksklok | Op het voorhoofd van de kat | Wiebelt, de wijzers draaien rond en de koekoek komt naar buiten |
| Vogelhuisje | Bovenop de kop, tussen de oren | Een vogeltje kijkt naar buiten: tsjilp |
| Bloempot | Op de sokkel naast de deur | De bloem gaat open en draait een rondje |
| Brievenbus | Bij het pad | Het klepje gaat open en er vliegt een briefje uit |
| Hond in zijn hok | Links in de tuin | Kijkt naar buiten en blaft |
| Voetbal | In de tuin | Stuitert een stukje weg en rolt terug |
| Gieter | Op de sokkel rechts | Giet water en er groeien bloemetjes |
| Ballonnen in de lucht | Boven het huis | Maken een sprongetje en een pirouette |

Verder zijn er twee tuinkatten (een tik geeft een sprongetje en een miauw),
wolken en een vlinder.

## Voor de ouders

- Geluid (stem en effectjes) zet je aan of uit met het knopje rechtsboven. Het
  huisje ernaast zet het 3D-huis terug in de startstand.
- Voortgang (stickers) wordt op het apparaat zelf bewaard.
- Geen accounts en geen advertenties.
- Op een ouder of trager apparaat schakelt het huis vanzelf naar een lichtere
  stand (lagere resolutie, geen echte schaduw, minder lampjes) en blijft daar.

## Voor ontwikkelaars

De 3D-code staat in `js/house/` (ES-modules zonder build-stap): `main.js`
(renderer, camera, animatielus en de brug `window.__hub3d` naar de
2D-spellen), `shell.js` (de kattenvorm), `rooms/` (één inrichter per kamer),
`cats.js`, `garden.js`, `surprises.js`, `input.js` en `quality.js`. De
modellen staan in `assets/models/` met hun licenties in `assets/CREDITS.md`.

Prestatiebudget: hooguit 150 draw calls en 150.000 driehoeken per beeld, ook in
de hoge stand met de schaduwpas meegeteld.

Testen gaat met twee scripts in `tools/` (eenmalig `cd tools && npm install`).
Start eerst een server vanuit de repo-root:

```sh
python3 -m http.server 8765
```

- **Safari 15-check**: `cd tools && node compat.mjs`. Het spel moet blijven werken
  op een iPad Air 2 (iPadOS 15.8, kan niet verder bijgewerkt worden). Daarom geen
  import map en geen JavaScript of CSS die nieuwer is dan Safari 15. De
  three.js-bibliotheek in `vendor/three/build/three.core.js` is daarvoor eenmalig
  omgezet met esbuild (`--target=safari15`); doe dat opnieuw na een update van three.js.
- **Smoke-test**: `cd tools && node smoke.mjs`. Laadt het huis in headless
  Chromium met `?debug=1` en controleert onder meer de kamertikken, de
  verrassingen en hun tikvlakken, de katten, draaien en de adresbalk op een
  telefoon, de titel tegenover de knoppen, het budget in de lage en de hoge
  stand en de lampen. Eindigt met `SMOKE OK` of met de eerste fout.
- **Screenshots**: `node tools/shot.mjs <naam> [kamer-id]` maakt
  `shots/<naam>-phone.png` (390x844) en `shots/<naam>-desk.png` (1280x800);
  met een kamer-id een close-up van die kamer.
- **Modellen comprimeren**: `tools/optimize.sh <in.glb> <uit.glb>` (gltf-transform
  met meshopt, texturen hooguit 1024 px als webp). Zet een nieuw model daarna in
  `MODEL_SETS` in `js/house/assets.js` en in `assets/CREDITS.md`; de smoke-test
  faalt op modellen die niemand gebruikt.

Handig bij het testen: `?debug=1` geeft `window.__house` (testhaakjes),
`?q=low` of `?q=high` zet de kwaliteitsstand vast, en `?failmodels=1` laat
alle modellen mislukken om te zien dat het huis heel blijft.
