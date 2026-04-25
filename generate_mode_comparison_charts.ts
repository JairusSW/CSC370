#!/usr/bin/env bun

type ResultRow = {
  matrixWidth: number;
  blockSize: number;
  cpuTime: number | null;
  gpuTotalTime: number | null;
  transferTime: number | null;
  gpuProcessingTime: number | null;
  speedup: number | null;
};

type Series = {
  label: string;
  color: string;
  values: Array<number | null>;
};

const EXPECTED_COLUMNS = [
  "Matrix Width",
  "Block Size",
  "CPU Time (ms)",
  "GPU Total Time (ms)",
  "Total Data Transfer Time (ms)",
  "GPU Processing Time (ms)",
  "Speedup",
];

const WIDTH = 1100;
const HEIGHT = 720;
const MARGIN = {
  top: 72,
  right: 44,
  bottom: 104,
  left: 92,
};

const MODE_STYLES = {
  global: { label: "Global", color: "#2563eb" },
  pinned: { label: "Pinned", color: "#dc2626" },
  unified: { label: "Unified", color: "#16a34a" },
} as const;

type ModeName = keyof typeof MODE_STYLES;

function parseNumber(value: string): number | null {
  const trimmed = value.trim();
  return trimmed === "" ? null : Number(trimmed);
}

function uniqueSorted(values: number[]): number[] {
  return [...new Set(values)].sort((a, b) => a - b);
}

function escapeXml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function formatNumber(value: number): string {
  if (value === 0) {
    return "0";
  }
  if (Math.abs(value) >= 1000 || Math.abs(value) < 0.01) {
    return value.toExponential(1);
  }
  return value.toFixed(2).replace(/\.?0+$/, "");
}

function minMax(values: number[], logScale: boolean): [number, number] {
  const usableValues = logScale ? values.filter((value) => value > 0) : values;
  if (usableValues.length === 0) {
    return [0, 1];
  }

  let min = Math.min(...usableValues);
  let max = Math.max(...usableValues);

  if (min === max) {
    if (logScale) {
      min = min / 10;
      max = max * 10;
    } else {
      min = 0;
      max = max === 0 ? 1 : max * 1.25;
    }
  }

  if (!logScale) {
    min = Math.min(0, min);
    max *= 1.08;
  }

  return [min, max];
}

function makeScaler(min: number, max: number, logScale: boolean): (value: number) => number {
  const plotTop = MARGIN.top;
  const plotBottom = HEIGHT - MARGIN.bottom;
  const plotHeight = plotBottom - plotTop;

  if (logScale) {
    const logMin = Math.log10(min);
    const logMax = Math.log10(max);
    return (value: number) => {
      const normalized = (Math.log10(value) - logMin) / (logMax - logMin);
      return plotBottom - normalized * plotHeight;
    };
  }

  return (value: number) => {
    const normalized = (value - min) / (max - min);
    return plotBottom - normalized * plotHeight;
  };
}

function xForIndex(index: number, count: number): number {
  const plotLeft = MARGIN.left;
  const plotRight = WIDTH - MARGIN.right;
  if (count <= 1) {
    return (plotLeft + plotRight) / 2;
  }
  return plotLeft + (index / (count - 1)) * (plotRight - plotLeft);
}

function linePath(values: Array<number | null>, yForValue: (value: number) => number): string {
  const segments: string[] = [];
  let started = false;

  values.forEach((value, index) => {
    if (value === null) {
      started = false;
      return;
    }

    const x = xForIndex(index, values.length);
    const y = yForValue(value);
    if (!Number.isFinite(y)) {
      started = false;
      return;
    }

    segments.push(`${started ? "L" : "M"} ${x.toFixed(2)} ${y.toFixed(2)}`);
    started = true;
  });

  return segments.join(" ");
}

function renderLegend(series: Series[]): string {
  const startX = MARGIN.left;
  const startY = HEIGHT - 54;
  const itemWidth = 260;

  return series
    .map((item, index) => {
      const x = startX + (index % 3) * itemWidth;
      const y = startY + Math.floor(index / 3) * 24;
      return `
        <g>
          <line x1="${x}" y1="${y}" x2="${x + 28}" y2="${y}" stroke="${item.color}" stroke-width="4" />
          <text x="${x + 36}" y="${y + 5}" font-size="14">${escapeXml(item.label)}</text>
        </g>`;
    })
    .join("");
}

function renderLineChart(title: string, xLabels: number[], yTitle: string, series: Series[], logScale = false): string {
  const allValues = series.flatMap((item) => item.values).filter((value): value is number => value !== null);
  const [min, max] = minMax(allValues, logScale);
  const yForValue = makeScaler(min, max, logScale);
  const plotLeft = MARGIN.left;
  const plotRight = WIDTH - MARGIN.right;
  const plotTop = MARGIN.top;
  const plotBottom = HEIGHT - MARGIN.bottom;
  const tickCount = 5;

  const yTicks = Array.from({ length: tickCount }, (_, index) => {
    if (logScale) {
      const logMin = Math.log10(min);
      const logMax = Math.log10(max);
      return Math.pow(10, logMin + (index / (tickCount - 1)) * (logMax - logMin));
    }
    return min + (index / (tickCount - 1)) * (max - min);
  });

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${HEIGHT}" viewBox="0 0 ${WIDTH} ${HEIGHT}">
  <rect width="100%" height="100%" fill="#ffffff" />
  <text x="${WIDTH / 2}" y="34" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="24" font-weight="700">${escapeXml(title)}</text>
  <text x="${WIDTH / 2}" y="${HEIGHT - 14}" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="16">Matrix Width</text>
  <text x="22" y="${(plotTop + plotBottom) / 2}" text-anchor="middle" transform="rotate(-90 22 ${(plotTop + plotBottom) / 2})" font-family="Arial, Helvetica, sans-serif" font-size="16">${escapeXml(yTitle)}</text>
  <g font-family="Arial, Helvetica, sans-serif" fill="#111827">
    <line x1="${plotLeft}" y1="${plotBottom}" x2="${plotRight}" y2="${plotBottom}" stroke="#111827" />
    <line x1="${plotLeft}" y1="${plotTop}" x2="${plotLeft}" y2="${plotBottom}" stroke="#111827" />
    ${yTicks
      .map((tick) => {
        const y = yForValue(tick);
        return `
          <line x1="${plotLeft}" y1="${y.toFixed(2)}" x2="${plotRight}" y2="${y.toFixed(2)}" stroke="#e5e7eb" />
          <text x="${plotLeft - 10}" y="${(y + 5).toFixed(2)}" text-anchor="end" font-size="13">${formatNumber(tick)}</text>`;
      })
      .join("")}
    ${xLabels
      .map((label, index) => {
        const x = xForIndex(index, xLabels.length);
        return `
          <line x1="${x.toFixed(2)}" y1="${plotBottom}" x2="${x.toFixed(2)}" y2="${plotBottom + 6}" stroke="#111827" />
          <text x="${x.toFixed(2)}" y="${plotBottom + 24}" text-anchor="middle" font-size="13">${label}</text>`;
      })
      .join("")}
    ${series
      .map(
        (item) => `
          <path d="${linePath(item.values, yForValue)}" fill="none" stroke="${item.color}" stroke-width="3" stroke-linejoin="round" stroke-linecap="round" />
          ${item.values
            .map((value, index) => {
              if (value === null || (value <= 0 && logScale)) {
                return "";
              }
              const x = xForIndex(index, item.values.length);
              const y = yForValue(value);
              return `<circle cx="${x.toFixed(2)}" cy="${y.toFixed(2)}" r="4" fill="${item.color}" />`;
            })
            .join("")}`,
      )
      .join("")}
    ${renderLegend(series)}
  </g>
</svg>
`;
}

async function parseResults(path: string): Promise<ResultRow[]> {
  const text = await Bun.file(path).text();
  const rows: ResultRow[] = [];
  let sawHeader = false;

  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line.startsWith("|") || line.includes("---")) {
      continue;
    }

    const cells = line
      .replace(/^\|/, "")
      .replace(/\|$/, "")
      .split("|")
      .map((cell) => cell.trim());

    if (cells.join("\0") === EXPECTED_COLUMNS.join("\0")) {
      sawHeader = true;
      continue;
    }

    if (!sawHeader || cells.length !== EXPECTED_COLUMNS.length) {
      continue;
    }

    rows.push({
      matrixWidth: Number(cells[0]),
      blockSize: Number(cells[1]),
      cpuTime: parseNumber(cells[2]),
      gpuTotalTime: parseNumber(cells[3]),
      transferTime: parseNumber(cells[4]),
      gpuProcessingTime: parseNumber(cells[5]),
      speedup: parseNumber(cells[6]),
    });
  }

  return rows.filter((row) => Number.isFinite(row.matrixWidth) && Number.isFinite(row.blockSize));
}

function bestValue(
  rows: ResultRow[],
  width: number,
  key: keyof Pick<ResultRow, "gpuTotalTime" | "gpuProcessingTime" | "speedup">,
  objective: "min" | "max",
): number | null {
  const candidates = rows
    .filter((row) => row.matrixWidth === width)
    .map((row) => row[key])
    .filter((value): value is number => value !== null && Number.isFinite(value));

  if (candidates.length === 0) {
    return null;
  }

  return objective === "min" ? Math.min(...candidates) : Math.max(...candidates);
}

function averageValue(
  rows: ResultRow[],
  width: number,
  key: keyof Pick<ResultRow, "gpuTotalTime" | "gpuProcessingTime" | "speedup">,
): number | null {
  const candidates = rows
    .filter((row) => row.matrixWidth === width)
    .map((row) => row[key])
    .filter((value): value is number => value !== null && Number.isFinite(value));

  if (candidates.length === 0) {
    return null;
  }

  const sum = candidates.reduce((acc, value) => acc + value, 0);
  return sum / candidates.length;
}

function valueAtBlock(
  rows: ResultRow[],
  width: number,
  blockSize: number,
  key: keyof Pick<ResultRow, "gpuTotalTime" | "transferTime" | "gpuProcessingTime" | "speedup">,
): number | null {
  const row = rows.find((item) => item.matrixWidth === width && item.blockSize === blockSize);
  const value = row?.[key];
  return typeof value === "number" ? value : null;
}

function blockForBestSpeedup(rows: ResultRow[], width: number): number | null {
  const candidates = rows
    .filter((row) => row.matrixWidth === width && row.speedup !== null)
    .sort((a, b) => (b.speedup ?? -Infinity) - (a.speedup ?? -Infinity));
  return candidates.length > 0 ? candidates[0].blockSize : null;
}

async function writeChart(outDir: string, name: string, svg: string): Promise<string> {
  const path = `${outDir}/${name}.svg`;
  await Bun.write(path, svg);
  return path;
}

async function convertSvgToPng(svgPath: string, pngPath: string): Promise<boolean> {
  const converter = Bun.spawnSync({
    cmd: ["convert", svgPath, pngPath],
    stdout: "pipe",
    stderr: "pipe",
  });

  if (converter.exitCode === 0) {
    return true;
  }

  const stderr = new TextDecoder().decode(converter.stderr).trim();
  console.warn(`Could not write ${pngPath}: ${stderr}`);
  return false;
}

async function main() {
  const outDir = process.argv[2] ?? "charts/comparison";

  const globalRows = await parseResults("results_cuda.md");
  const pinnedRows = await parseResults("results_pinned.md");
  const unifiedRows = await parseResults("results_unified.md");

  const modeRows: Record<ModeName, ResultRow[]> = {
    global: globalRows,
    pinned: pinnedRows,
    unified: unifiedRows,
  };

  const widths = uniqueSorted(
    (Object.values(modeRows) as ResultRow[][]).flatMap((rows) => rows.map((row) => row.matrixWidth)),
  );

  const commonBlockSizes = uniqueSorted(
    Object.values(modeRows)
      .map((rows) => uniqueSorted(rows.map((row) => row.blockSize)))
      .reduce((acc, current) => acc.filter((value) => current.includes(value))),
  );
  const compareBlockSize = commonBlockSizes.includes(16) ? 16 : commonBlockSizes[0];

  await Bun.$`mkdir -p ${outDir}`;

  const charts = [
    {
      name: "best-speedup-by-width",
      svg: renderLineChart(
        "Best Speedup by Matrix Width",
        widths,
        "Speedup",
        (Object.keys(modeRows) as ModeName[]).map((mode) => ({
          label: `${MODE_STYLES[mode].label} (best block)`,
          color: MODE_STYLES[mode].color,
          values: widths.map((width) => bestValue(modeRows[mode], width, "speedup", "max")),
        })),
      ),
    },
    {
      name: "best-gpu-total-time-by-width",
      svg: renderLineChart(
        "Best GPU Total Time by Matrix Width",
        widths,
        "GPU Total Time (ms)",
        (Object.keys(modeRows) as ModeName[]).map((mode) => ({
          label: `${MODE_STYLES[mode].label} (best block)`,
          color: MODE_STYLES[mode].color,
          values: widths.map((width) => bestValue(modeRows[mode], width, "gpuTotalTime", "min")),
        })),
        true,
      ),
    },
    {
      name: `gpu-total-time-block-${compareBlockSize}`,
      svg: renderLineChart(
        `GPU Total Time by Matrix Width (Block Size ${compareBlockSize})`,
        widths,
        "GPU Total Time (ms)",
        (Object.keys(modeRows) as ModeName[]).map((mode) => ({
          label: MODE_STYLES[mode].label,
          color: MODE_STYLES[mode].color,
          values: widths.map((width) => valueAtBlock(modeRows[mode], width, compareBlockSize, "gpuTotalTime")),
        })),
        true,
      ),
    },
    {
      name: `transfer-time-block-${compareBlockSize}`,
      svg: renderLineChart(
        `Transfer Time by Matrix Width (Block Size ${compareBlockSize})`,
        widths,
        "Transfer Time (ms)",
        (Object.keys(modeRows) as ModeName[]).map((mode) => ({
          label: MODE_STYLES[mode].label,
          color: MODE_STYLES[mode].color,
          values: widths.map((width) => valueAtBlock(modeRows[mode], width, compareBlockSize, "transferTime")),
        })),
        true,
      ),
    },
    {
      name: "avg-gpu-total-time-by-width",
      svg: renderLineChart(
        "Average GPU Total Time by Matrix Width",
        widths,
        "GPU Total Time (ms)",
        (Object.keys(modeRows) as ModeName[]).map((mode) => ({
          label: `${MODE_STYLES[mode].label} (avg across blocks)`,
          color: MODE_STYLES[mode].color,
          values: widths.map((width) => averageValue(modeRows[mode], width, "gpuTotalTime")),
        })),
        true,
      ),
    },
    {
      name: "best-block-size-by-width",
      svg: renderLineChart(
        "Block Size with Best Speedup",
        widths,
        "Block Size",
        (Object.keys(modeRows) as ModeName[]).map((mode) => ({
          label: MODE_STYLES[mode].label,
          color: MODE_STYLES[mode].color,
          values: widths.map((width) => blockForBestSpeedup(modeRows[mode], width)),
        })),
      ),
    },
  ];

  const svgPaths: string[] = [];
  let pngCount = 0;

  for (const chart of charts) {
    const svgPath = await writeChart(outDir, chart.name, chart.svg);
    svgPaths.push(svgPath);

    const pngPath = `${outDir}/${chart.name}.png`;
    if (await convertSvgToPng(svgPath, pngPath)) {
      pngCount++;
    }
  }

  console.log(`Wrote ${svgPaths.length} SVG files to ${outDir}`);
  console.log(`Wrote ${pngCount} PNG files to ${outDir}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
