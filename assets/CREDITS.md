# Bronnen en licenties

Alle 3D-modellen in `assets/models/` komen uit de KayKit-pakketten van
Kay Lousberg (www.kaylousberg.com). Ze zijn vrijgegeven onder
**Creative Commons Zero (CC0 1.0)**:
http://creativecommons.org/publicdomain/zero/1.0/

Vermelding is niet verplicht, maar we noemen de maker graag.

De modellen zijn ongewijzigd van vorm. Ze zijn omgezet van glTF naar GLB
en gecomprimeerd met `tools/optimize.sh` (gltf-transform, meshopt,
texturen hooguit 1024 px als webp). De bestandsnaam begint met het pakket:
`fur-` (Furniture Bits), `res-` (Restaurant Bits) en `pro-` (Prototype Bits).
Alleen de modellen die een kamer echt gebruikt staan in de repo (27 stuks).

| Pakket | Bron (GitHub) | Licentie | Modellen |
|---|---|---|---|
| KayKit : Furniture Bits 1.0 | https://github.com/KayKit-Game-Assets/KayKit-Furniture-Bits-1.0 | CC0 1.0 | bed_single_A, book_single, cabinet_medium, cabinet_medium_decorated, cabinet_small, chair_A, chair_C, chair_stool, couch_pillows, pillow_A, pillow_B, rug_oval_A, rug_oval_B, rug_rectangle_stripes_A, shelf_A_big, shelf_B_large, table_low, table_medium, table_medium_long |
| KayKit : Restaurant Bits 1.0 | https://github.com/KayKit-Game-Assets/KayKit-Restaurant-Bits-1.0 | CC0 1.0 | chair_stool, crate, crate_lid, jar_A_small, jar_B_small, jar_C_small |
| KayKit : Prototype Bits 1.0 | https://github.com/KayKit-Game-Assets/KayKit-Prototype-Bits-1.0 | CC0 1.0 | Box_B, Box_C |

## Code van derden

| Bestand | Bron | Licentie |
|---|---|---|
| `vendor/three/` | three.js r184 (npm `three@0.184.0`) | MIT, zie `vendor/three/LICENSE` (Copyright © 2010-2026 three.js authors) |
| `vendor/three/examples/jsm/libs/meshopt_decoder.module.js` | meshoptimizer 1.1, via `three@0.184.0` | MIT (Copyright (C) 2016-2026 Arseny Kapoulkine, https://github.com/zeux/meshoptimizer); de licentievermelding staat bovenaan het bestand |
