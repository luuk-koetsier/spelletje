# Bronnen en licenties

Alle 3D-modellen in `assets/models/` komen uit de KayKit-pakketten van
Kay Lousberg (www.kaylousberg.com). Ze zijn vrijgegeven onder
**Creative Commons Zero (CC0 1.0)**:
http://creativecommons.org/publicdomain/zero/1.0/

Vermelding is niet verplicht, maar we noemen de maker graag.

De modellen zijn ongewijzigd van vorm. Ze zijn omgezet van glTF naar GLB
en gecomprimeerd met `tools/optimize.sh` (gltf-transform, meshopt,
texturen hooguit 1024 px als webp). De bestandsnaam begint met het pakket:
`fur-` (Furniture Bits), `res-` (Restaurant Bits), `pro-` (Prototype Bits)
en `city-` (City Builder Bits).

| Pakket | Bron (GitHub) | Licentie | Modellen |
|---|---|---|---|
| KayKit : Furniture Bits 1.0 | https://github.com/KayKit-Game-Assets/KayKit-Furniture-Bits-1.0 | CC0 1.0 | armchair, armchair_pillows, bed_single_A, book_set, book_single, cabinet_medium, cabinet_medium_decorated, cabinet_small, cabinet_small_decorated, cactus_small_A, chair_A, chair_C, chair_stool, couch_pillows, lamp_standing, lamp_table, pictureframe_large_A, pictureframe_large_B, pictureframe_small_A, pictureframe_small_B, pictureframe_small_C, pictureframe_standing_A, pictureframe_standing_B, pillow_A, pillow_B, rug_oval_A, rug_oval_B, rug_rectangle_A, rug_rectangle_stripes_A, shelf_A_big, shelf_A_small, shelf_B_large, shelf_B_small_decorated, table_low, table_medium, table_medium_long |
| KayKit : Restaurant Bits 1.0 | https://github.com/KayKit-Game-Assets/KayKit-Restaurant-Bits-1.0 | CC0 1.0 | chair_stool, crate, crate_lid, jar_A_small, jar_B_small, jar_C_small, jar_D_small |
| KayKit : Prototype Bits 1.0 | https://github.com/KayKit-Game-Assets/KayKit-Prototype-Bits-1.0 | CC0 1.0 | Barrel_A, Barrel_B, Box_B, Box_C, target |
| KayKit : City Builder Bits 1.0 | https://github.com/KayKit-Game-Assets/KayKit-City-Builder-Bits-1.0 | CC0 1.0 | bench, bush |

## Code van derden

| Bestand | Bron | Licentie |
|---|---|---|
| `vendor/three/` | three.js r184 (npm `three@0.184.0`) | MIT |
| `vendor/three/examples/jsm/libs/meshopt_decoder.module.js` | meshoptimizer, via `three@0.184.0` | MIT |
