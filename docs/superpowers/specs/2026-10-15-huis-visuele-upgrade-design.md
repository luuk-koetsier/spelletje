# Ontwerp: het 3D-huis visueel naar een professioneel niveau

Datum: 2026-10-15
Scope: het 3D-hoofdscherm (het huis) in `index.html`. De losse spelletjes
vallen erbuiten.

## Waarom

Het huis werkt, maar ziet er amateuristisch uit. Luuk wil dat het voelt als
een echt, professioneel kinderspel in de stijl van **Gabby's Dollhouse**.
Sep (bijna 6) speelt op een **iPhone of een oude iPad**, dus het mag niet
zwaarder worden dan nu. Liefst wordt het lichter.

## Wat er nu mis is (vanaf een screenshot op de iPhone)

1. Elke kamer is dezelfde doos met dezelfde spullen (krukje, balletje,
   plantje, rood blokje, vlaggetjes), alleen in een andere kleur.
2. Het huis is een witte kast met dikke planken: geen gevel, ramen,
   plinten, behang of vloerpatroon. Het dak is een plat roze vlak.
3. De belichting is vlak. Alles is even licht, er is geen warmte binnen
   en geen diepte. Het voelt als plastic.
4. Negen felle kamerkleuren plus een roze dak, regenboog en bloemen: er is
   geen palet dat alles samenbindt.
5. Schaal en stijl kloppen niet. De oranje kat is groter dan de voordeur,
   de bloemen zijn bijna zo groot als de katten en de katten hebben
   verschillende stijlen.
6. Rommelige details: kamerlabels worden afgesneden of zitten achter
   spullen ("Mer", "eell'mer"), de titel valt op mobiel achter de knoppen
   en het dak, de regenboog is afgesneden en het gras is een verzameling
   losse sprietjes.
7. De nabewerking (SAO-schaduw, bloom, kleurfilter) kost veel rekenkracht
   op een oude iPad en voegt zichtbaar weinig toe.

## Doelen

- **Het huis is een personage.** Net als bij Gabby is het huis een
  herkenbare kattenvorm: oren op het dak, een ronde vorm, een vriendelijk
  gezichtje in de gevel. Je herkent het silhouet al zonder kamers.
- **Elke kamer is een eigen wereld** met een duidelijke functie, eigen
  inrichting (vijf tot tien eigen spullen) en een eigen bewoner-kat. Geen
  herhaalde vulspullen.
- **Ronde, glanzende speelgoedlook.** Zacht afgeronde vormen, licht
  glanzend plastic van goede kwaliteit, geen scherpe randen.
- **Eén pastelpalet** met roze en paars als basis en per kamer één
  accentkleur.
- **Warm, knus licht**: gloeiende lampjes binnen, zachte schaduw in hoeken
  en onder spullen, een tikje gouden zonlicht van buiten.
- **Verbindingen tussen kamers** (een trap, glijbaan of liftje), zodat het
  één huis is in plaats van losse vakjes.
- **Consistente schaal en stijl** voor alle katten, spullen en de tuin.
- **Rustige, verzorgde buitenkant**: een tuin en lucht die het huis
  omlijsten in plaats van ermee te concurreren.
- **Lichter of even zwaar als nu**, zie de prestatie-eisen.

## Niet-doelen

- De losse spelletjes (Memory, Puzzel enzovoort) worden niet aangepast.
- Geen nieuwe spelmechanieken of kamers. Het blijven acht kamers plus de
  voordeur.
- Geen geluid, stem of voortgangssysteem aanpassen.
- Geen build-stap of framework introduceren. Het blijft een statische site
  die zo op Vercel draait.

## Anti-doelen (dan is het mislukt, ook als het technisch werkt)

- Het haalt op een oude iPad geen vloeiende beweging meer, laadt lang of
  wordt warm.
- Het wordt een kopie van Gabby's Dollhouse: geen personages, namen, logo's
  of beeldmateriaal van Gabby. We nemen de sfeer over, het blijft het huis
  van Sep met zijn eigen katten.
- Het wordt drukker in plaats van rustiger. Meer spullen mag alleen als het
  geheel overzichtelijker oogt.
- Iets wat Sep nu kan doen, werkt niet meer (zie "Wat blijft").
- Een mix van stijlen: een paar mooie modellen naast oude blokjes.

## Wat blijft (moet na de upgrade nog precies zo werken)

- Het huis rondslepen met vinger of muis, en het automatisch draaien als
  er niets gebeurt.
- Op een kamer tikken opent het juiste spelletje (`openRoom`, de `ROOMS`-
  lijst met ids `memory`, `puzzel`, `vormen`, `tellen`, `kleuren`,
  `verkleden`, `speel`, `stickers`).
- De brug naar de 2D-spellen, `window.__hub3d.pause()` en `resume()`.
- Op de voordeur tikken laat de deur stuiteren en miauwen.
- Het pop-upkaartje met de knop "Spelen!" dat verschijnt als je op een
  kamer tikt, blijft bestaan. Het krijgt de nieuwe stijl mee.
- [OPEN VRAAG AAN LUUK: verrassingen om aan te tikken, zie onderaan.]
- Geen externe CDN: alles staat lokaal in de repo, zoals Three.js nu in
  `vendor/three/`.

## Beslissingen van Luuk

- Stijlrichting: Gabby's Dollhouse.
- Kant-en-klare 3D-modellen mogen gebruikt worden. Het hoeft niet allemaal
  uit code te komen.
- Doelapparaten: iPhone en oude iPad. Niet te zwaar.

## Kamers en hun thema (mijn invulling, sluit aan op de spelletjes)

| Kamer | Thema | Voorbeelden van inrichting |
|---|---|---|
| Memory | Spelletjeskamer | Lage tafel met omgedraaide kaartjes, zitkussens, kast met spellendozen |
| Puzzel | Hobbyzolder | Halve puzzel op een kleed, kist met stukjes, plank met dozen |
| Vormen | Klaslokaaltje | Schoolbord met vormen, tafeltjes, vormenstoof |
| Tellen | Aquariumkamer | Groot aquarium met visjes, bubbels, zitbank |
| Kleuren | Atelier | Schildersezel, verfpotten, spetters op de vloer, kwasten in een pot |
| Verkleden | Kleedkamer met podium | Spiegel met lampjes, kledingrek, hoedenplank, gordijntjes |
| Speelkamer | Mini-circus | Gestreept tentdoek, xylofoon, draaimolentje, ballen |
| Stickers | Slaapkamertje | Bed, muur vol stickers, groot plakboek, nachtlampje |

Elke kamer krijgt een eigen bewoner-kat die past bij het thema (kwastje bij
het atelier, hoedje bij de kleedkamer). Daarnaast blijft Mauwtje, de oranje
mascotte, bij de voordeur, en lopen er hooguit twee katten in de tuin. Dat
zijn er in totaal maximaal elf. Alle katten hebben één stijl en delen
zoveel mogelijk één basismodel met eigen kleuren en accessoires.

Kamernamen worden niet meer als tekst op de achterwand geprint (dat werd
afgesneden). Sep kan nog niet lezen, dus het icoon is belangrijker dan de
tekst: een bordje of embleem boven elke kamer, altijd volledig zichtbaar.

## Prestatie-eisen

Richtwaarde voor de oudste iPad: een iPad uit ongeveer 2018 (A10-chip).

- Vloeiend draaien op een recente iPhone, en minstens rond de 30 beelden
  per seconde op de oude iPad.
- Ongeveer 150 draw calls of minder. Herhaalde spullen worden samengevoegd
  of als instances getekend.
- Ongeveer 150.000 driehoeken of minder in beeld.
- Alle modellen en texturen samen ongeveer 6 MB of minder, gecomprimeerd.
  Texturen maximaal 1024 pixels.
- Geen SAO en geen bloom meer. Zachte schaduw en diepte komen uit
  goedkope trucs: ingebakken schaduw in vertex-kleuren of texturen, en
  zachte schaduwvlekjes onder spullen en katten. Hooguit één lamp met
  echte schaduw, met een kleine schaduwkaart.
- Warmte binnen via gloeiende lampjes (emissief materiaal) en hooguit een
  paar lichtbronnen zonder schaduw.
- Een eenvoudige kwaliteitsstand: als het apparaat het niet bijhoudt,
  schakelt het automatisch naar een lichtere stand (lagere resolutie,
  geen echte schaduw).
- Laadscherm blijft. Het huis is binnen een paar seconden zichtbaar op
  4G. Daarvoor laadt het in stappen: eerst de huisvorm, licht en lucht,
  daarna vullen de kamers, katten en tuin zich aan. De eerste stap is
  hooguit ongeveer 1,5 MB.

## Bronnen voor 3D-modellen

- Alleen modellen met een licentie die vrij gebruik toestaat, bij voorkeur
  CC0 (zoals Kenney en Quaternius). Elke bron komt met licentie in een
  `CREDITS.md`.
- Formaat: glTF/GLB, gecomprimeerd (bijvoorbeeld met gltf-transform via
  npm), lokaal in de repo onder een map als `assets/`.
- De Claude-omgeving kan nu alleen bij GitHub en het npm-register.
  Kenney.nl, Quaternius.com en Poly Pizza zijn geblokkeerd. Eerst zoeken
  naar CC0-modellen die via GitHub of npm te halen zijn. Als dat te weinig
  oplevert, vraagt Claude aan Luuk om die sites toe te voegen aan de
  netwerkinstelling van de omgeving.
- De huisvorm zelf is uniek en zit in geen enkel pakket. Die wordt in code
  opgebouwd met afgeronde vormen, in dezelfde stijl als de modellen.
- Alles moet in één stijl samenvallen. Als een model niet past, wordt het
  aangepast (kleur, materiaal) of vervangen. Geen stijlmix.

## Werkwijze

- Werk op branch `claude/house-visual-upgrade-avn10s`.
- In fases, zodat Luuk tussendoor op zijn telefoon kan kijken via de
  Vercel-preview van de branch. Na elke fase een korte melding met wat er
  te zien is. Volgorde: eerst stijl, palet, licht en prestatiebasis, dan
  de huisvorm, dan de kamers, dan tuin en lucht, en tot slot afwerking
  (animaties, UI).
- Visuele controle voor elke push. In deze omgeving rendert headless
  Chromium de 3D-scène nu niet (de screenshot blijft leeg of loopt vast).
  De bouwer moet eerst een werkende manier vinden om de scène vast te
  leggen, bijvoorbeeld een enkel frame renderen op lage resolutie zonder
  nabewerking en dat als afbeelding opslaan.
- Na elke fase checken op een telefoonformaat (staand) en desktop.
- Geen em dashes in nieuwe teksten. Teksten in het Nederlands.

## Losse fixes die meegaan

- De titel "Het Huis van Sep" valt op mobiel niet meer achter de knoppen of
  het dak.
- De regenboog wordt niet meer afgesneden, of verdwijnt.
- Tuin: minder losse spullen, bloemen en gras op een logische schaal.

## Mijn keuzes (Luuk kan ze nog wijzigen)

- De spelletjes zelf vallen buiten deze ronde.
- De kamerthema's in de tabel hierboven.
- De concrete prestatiecijfers en de iPad uit ongeveer 2018 als ondergrens.
- Geen SAO en bloom meer.
- Laden in stappen, met de huisvorm eerst.
- Maximaal elf katten: acht bewoners, Mauwtje en twee tuinkatten.
- Het pop-upkaartje bij een kamer blijft, in de nieuwe stijl.
- De 3D-code mag uit `index.html` naar losse ES-module-bestanden
  verhuizen, zonder build-stap, als dat het overzichtelijker maakt.

## Aan de bouwer

- De precieze indeling van de kamers binnen de kattenvorm, zolang het
  acht kamers plus voordeur blijven die staand op een telefoon goed te zien
  en aan te tikken zijn.
- Welke modellen precies, en of de katten een model worden of een
  verbeterde versie van de huidige code-katten, zolang het één stijl is.
- Het exacte kleurpalet binnen de richting roze en paars pastel.
- Welke verbinding tussen kamers (trap, glijbaan, lift).
- De techniek voor zachte schaduw en de kwaliteitsstand.
