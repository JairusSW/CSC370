#!/usr/bin/env bash
set -euo pipefail

source /opt/scale/bin/scaleenv gfx1100

nvcc -x cu pr3_mmult.cu -o pr3_mmult

if [ "$#" -eq 0 ]; then
    set -- -b 16 -m 256
fi

./pr3_mmult "$@"
