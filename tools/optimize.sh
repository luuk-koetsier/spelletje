#!/usr/bin/env bash
# Comprimeer een glTF/GLB-model voor het 3D-huis.
# Gebruik: tools/optimize.sh <in.glb|in.gltf> <out.glb>
# Meshopt-compressie (in de browser uitgepakt door MeshoptDecoder uit
# vendor/three/examples/jsm/libs/meshopt_decoder.module.js), texturen
# hooguit 1024 px en als webp.
set -euo pipefail
if [ "$#" -ne 2 ]; then
  echo "gebruik: $0 <in.glb> <out.glb>" >&2
  exit 1
fi
npx --yes @gltf-transform/cli@4.5.1 optimize "$1" "$2" \
  --compress meshopt \
  --texture-size 1024 \
  --texture-compress webp
