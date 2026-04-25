#!/usr/bin/env bash
set -euo pipefail

output_file="${1:-results_unified.md}"
read -r -a widths <<< "${WIDTHS:-4 8 16 32 64 128 256 512 1024 2048}"
read -r -a block_sizes <<< "${BLOCK_SIZES:-2 4 8 16 32}"

if [ -f /opt/scale/bin/scaleenv ]; then
    # shellcheck disable=SC1091
    source /opt/scale/bin/scaleenv gfx1100
fi

nvcc -x cu pr3_mmult.cu -o pr3_mmult

{
    printf '# CUDA Matrix Multiplication Results\n\n'
    printf '| Matrix Width | Block Size | CPU Time (ms) | GPU Total Time (ms) | Total Data Transfer Time (ms) | GPU Processing Time (ms) | Speedup |\n'
    printf '| --- | --- | --- | --- | --- | --- | --- |\n'
} > "$output_file"

extract_time() {
    local label="$1"
    local text="$2"

    awk -v label="$label" '
        index($0, label) {
            for (i = 1; i <= NF; i++) {
                if ($i ~ /^[-+]?[0-9]*\.?[0-9]+$/) {
                    value = $i
                }
            }
            print value
            exit
        }
    ' <<< "$text"
}

for width in "${widths[@]}"; do
    for block_size in "${block_sizes[@]}"; do
        if (( block_size > width )); then
            continue
        fi

        printf 'Running matrix width %s with block size %s...\n' "$width" "$block_size"

        status="SUCCESS"
        run_output="$(./pr3_mmult_unified -b "$block_size" -m "$width" 2>&1)" || status="ERROR"

        if ! grep -q 'SUCCESS!' <<< "$run_output"; then
            status="ERROR"
        fi

        if [ "$status" = "SUCCESS" ]; then
            cpu_time="$(extract_time 'CPU Matrix Multiply Time' "$run_output")"
            gpu_total_time="$(extract_time 'GPU Total Time' "$run_output")"
            gpu_processing_time="$(extract_time 'GPU Kernel Multiply Time' "$run_output")"
            d2h_time="$(extract_time 'D2HTransfer Time' "$run_output")"
            h2d_time="$(extract_time 'H2D Transfer Time' "$run_output")"
            speedup="$(extract_time 'Speedup' "$run_output")"
            transfer_time="$(awk -v a="$d2h_time" -v b="$h2d_time" 'BEGIN { printf "%.6f", a + b }')"
        else
            cpu_time=""
            gpu_total_time=""
            transfer_time=""
            gpu_processing_time=""
            speedup=""
        fi

        printf '| %s | %s | %s | %s | %s | %s | %s |\n' \
            "$width" \
            "$block_size" \
            "$cpu_time" \
            "$gpu_total_time" \
            "$transfer_time" \
            "$gpu_processing_time" \
            "$speedup" >> "$output_file"
    done
done

printf '\nWrote results to %s\n' "$output_file"
