#!/usr/bin/env bash
set -euo pipefail

shopt -s nullglob

trim() {
  local s="$1"
  s="${s#"${s%%[![:space:]]*}"}"
  s="${s%"${s##*[![:space:]]}"}"
  printf '%s' "$s"
}

processed=0

for scale_file in *_scale.md; do
  base_file="${scale_file%_scale.md}.md"

  if [[ ! -f "$base_file" ]]; then
    echo "Skipping $scale_file: missing base file $base_file" >&2
    continue
  fi

  output_file="${base_file%.md}_normalized.md"

  awk -F'|' '
    function trim(s) {
      gsub(/^[[:space:]]+|[[:space:]]+$/, "", s)
      return s
    }

    # First pass: read cpu times from *_scale.md
    NR == FNR {
      if ($0 ~ /^\|/) {
        width = trim($2)
        block = trim($3)
        cpu = trim($4)

        if (width ~ /^[0-9]+(\.[0-9]+)?$/ && block ~ /^[0-9]+(\.[0-9]+)?$/) {
          cpu_map[width SUBSEP block] = cpu
        }
      }
      next
    }

    # Second pass: rewrite base markdown rows
    {
      if ($0 !~ /^\|/) {
        print $0
        next
      }

      width = trim($2)
      block = trim($3)

      if (!(width ~ /^[0-9]+(\.[0-9]+)?$/ && block ~ /^[0-9]+(\.[0-9]+)?$/)) {
        print $0
        next
      }

      key = width SUBSEP block
      if (!(key in cpu_map)) {
        print $0
        next
      }

      cpu = cpu_map[key]
      gpu_total = trim($5)

      if (gpu_total ~ /^-?[0-9]+(\.[0-9]+)?$/ && (gpu_total + 0) != 0) {
        speedup = sprintf("%.6f", (cpu + 0) / (gpu_total + 0))
      } else {
        speedup = trim($8)
      }

      transfer = trim($6)
      gpu_proc = trim($7)

      printf "| %s | %s | %s | %s | %s | %s | %s |\n", width, block, cpu, gpu_total, transfer, gpu_proc, speedup
    }
  ' "$scale_file" "$base_file" > "$output_file"

  echo "Wrote $output_file"
  processed=$((processed + 1))
done

if [[ "$processed" -eq 0 ]]; then
  echo "No *_scale.md files found." >&2
fi
