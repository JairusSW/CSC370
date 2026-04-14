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

const COLORS = [
  "#2563eb",
  "#16a34a",
  "#ea580c",
  "#9333ea",
  "#0891b2",
  "#dc2626",
];

const WIDTH = 1100;
const HEIGHT = 720;
const MARGIN = {
  top: 72,
  right: 44,
  bottom: 104,
  left: 92,
};

function usage(): never {
  console.error("Usage: bun run generate_charts.ts [results.md] [charts-dir]");
  process.exit(1);
}

function parseNumber(value: string): number | null {
  const trimmed = value.trim();
  return trimmed === "" ? null : Number(trimmed);
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

function rowValue(rows: ResultRow[], width: number, blockSize: number, key: keyof ResultRow): number | null {
  const row = rows.find((item) => item.matrixWidth === width && item.blockSize === blockSize);
  const value = row?.[key];
  return typeof value === "number" ? value : null;
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

function clampValue(value: number, range?: { min: number; max: number }): number {
  if (!range) {
    return value;
  }
  return Math.min(range.max, Math.max(range.min, value));
}

function renderLegend(series: Series[]): string {
  const startX = MARGIN.left;
  const startY = HEIGHT - 54;
  const itemWidth = 190;

  return series
    .map((item, index) => {
      const x = startX + (index % 5) * itemWidth;
      const y = startY + Math.floor(index / 5) * 24;
      return `
        <g>
          <line x1="${x}" y1="${y}" x2="${x + 28}" y2="${y}" stroke="${item.color}" stroke-width="4" />
          <text x="${x + 36}" y="${y + 5}" font-size="14">${escapeXml(item.label)}</text>
        </g>`;
    })
    .join("");
}

function renderLineChart(
  title: string,
  xLabels: number[],
  yTitle: string,
  series: Series[],
  logScale = false,
  yRange?: { min: number; max: number },
): string {
  const allValues = series.flatMap((item) => item.values).filter((value): value is number => value !== null);
  const [min, max] = yRange ? [yRange.min, yRange.max] : minMax(allValues, logScale);
  const yForValue = makeScaler(min, max, logScale);
  const yForPlotValue = (value: number) => yForValue(clampValue(value, yRange));
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
          <path d="${linePath(item.values, yForPlotValue)}" fill="none" stroke="${item.color}" stroke-width="3" stroke-linejoin="round" stroke-linecap="round" />
          ${item.values
            .map((value, index) => {
              if (value === null || (value <= 0 && logScale && !yRange)) {
                return "";
              }
              const x = xForIndex(index, item.values.length);
              const y = yForPlotValue(value);
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

function renderBarChart(title: string, rows: ResultRow[], blockSize: number): string {
  const labels = rows.map((row) => row.matrixWidth);
  const datasets = [
    { label: "Total Data Transfer Time", color: "#2563eb", values: rows.map((row) => row.transferTime) },
    { label: "GPU Processing Time", color: "#16a34a", values: rows.map((row) => row.gpuProcessingTime) },
  ];
  const allValues = datasets.flatMap((item) => item.values).filter((value): value is number => value !== null);
  const [min, max] = minMax(allValues, false);
  const yForValue = makeScaler(min, max, false);
  const plotLeft = MARGIN.left;
  const plotRight = WIDTH - MARGIN.right;
  const plotTop = MARGIN.top;
  const plotBottom = HEIGHT - MARGIN.bottom;
  const groupWidth = (plotRight - plotLeft) / labels.length;
  const barWidth = Math.min(36, groupWidth / 3);
  const yTicks = Array.from({ length: 5 }, (_, index) => min + (index / 4) * (max - min));

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${HEIGHT}" viewBox="0 0 ${WIDTH} ${HEIGHT}">
  <rect width="100%" height="100%" fill="#ffffff" />
  <text x="${WIDTH / 2}" y="34" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="24" font-weight="700">${escapeXml(title)}</text>
  <text x="${WIDTH / 2}" y="58" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="15">Block Size ${blockSize}</text>
  <text x="${WIDTH / 2}" y="${HEIGHT - 14}" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="16">Matrix Width</text>
  <text x="22" y="${(plotTop + plotBottom) / 2}" text-anchor="middle" transform="rotate(-90 22 ${(plotTop + plotBottom) / 2})" font-family="Arial, Helvetica, sans-serif" font-size="16">Time (ms)</text>
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
    ${labels
      .map((label, index) => {
        const x = plotLeft + index * groupWidth + groupWidth / 2;
        return `<text x="${x.toFixed(2)}" y="${plotBottom + 24}" text-anchor="middle" font-size="13">${label}</text>`;
      })
      .join("")}
    ${datasets
      .map((dataset, datasetIndex) =>
        dataset.values
          .map((value, index) => {
            if (value === null) {
              return "";
            }
            const groupCenter = plotLeft + index * groupWidth + groupWidth / 2;
            const x = groupCenter + (datasetIndex - 0.5) * barWidth - barWidth / 2;
            const y = yForValue(value);
            const height = plotBottom - y;
            return `<rect x="${x.toFixed(2)}" y="${y.toFixed(2)}" width="${barWidth.toFixed(2)}" height="${height.toFixed(2)}" fill="${dataset.color}" />`;
          })
          .join(""),
      )
      .join("")}
    ${renderLegend(datasets)}
  </g>
</svg>
`;
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
  const args = process.argv.slice(2);
  if (args.includes("-h") || args.includes("--help")) {
    usage();
  }

  const inputPath = args[0] ?? "results.md";
  const outDir = args[1] ?? "charts";
  const results = await parseResults(inputPath);

  if (results.length === 0) {
    throw new Error(`No result rows found in ${inputPath}`);
  }

  await Bun.$`mkdir -p ${outDir}`;

  const widths = uniqueSorted(results.map((row) => row.matrixWidth));
  const blockSizes = uniqueSorted(results.map((row) => row.blockSize));
  const blockSizeChartWidths = widths.filter((width) => width >= 256);
  const transferBlockSize = blockSizes.includes(16) ? 16 : blockSizes[0];
  const transferRows = results
    .filter((row) => row.blockSize === transferBlockSize)
    .sort((a, b) => a.matrixWidth - b.matrixWidth);

  const charts = [
    {
      name: "cpu-vs-gpu-total-time",
      svg: renderLineChart(
        "CPU Time vs GPU Total Time",
        widths,
        "Time (ms)",
        [
          {
            label: "CPU Time",
            color: "#dc2626",
            values: widths.map((width) => {
              const row = results.find((item) => item.matrixWidth === width && item.cpuTime !== null);
              return row?.cpuTime ?? null;
            }),
          },
          ...blockSizes.map((blockSize, index) => ({
            label: `GPU Total, Block ${blockSize}`,
            color: COLORS[index % COLORS.length],
            values: widths.map((width) => rowValue(results, width, blockSize, "gpuTotalTime")),
          })),
        ],
        true,
        { min: 0.01, max: 500 },
      ),
    },
    {
      name: "gpu-processing-by-block-size",
      svg: renderLineChart(
        "GPU Processing Time by Block Size",
        widths,
        "GPU Processing Time (ms)",
        blockSizes.map((blockSize, index) => ({
          label: `Block ${blockSize}`,
          color: COLORS[index % COLORS.length],
          values: widths.map((width) => rowValue(results, width, blockSize, "gpuProcessingTime")),
        })),
        true,
      ),
    },
    {
      name: "gpu-processing-vs-block-size",
      svg: renderLineChart(
        "GPU Processing Time vs Block Size",
        blockSizes,
        "GPU Processing Time (ms)",
        blockSizeChartWidths.map((width, index) => ({
          label: `Width ${width}`,
          color: COLORS[index % COLORS.length],
          values: blockSizes.map((blockSize) => rowValue(results, width, blockSize, "gpuProcessingTime")),
        })),
        true,
      ),
    },
    {
      name: "transfer-vs-gpu-processing",
      svg: renderBarChart("Transfer Time vs GPU Processing Time", transferRows, transferBlockSize),
    },
    {
      name: "speedup-by-block-size",
      svg: renderLineChart(
        "Speedup by Block Size",
        widths,
        "Speedup",
        blockSizes.map((blockSize, index) => ({
          label: `Block ${blockSize}`,
          color: COLORS[index % COLORS.length],
          values: widths.map((width) => rowValue(results, width, blockSize, "speedup")),
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
