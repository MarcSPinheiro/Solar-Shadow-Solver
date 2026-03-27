import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import * as FileSystem from "expo-file-system";
import { Asset } from "expo-asset";
import { Platform } from "react-native";
import type { SolarParams, SolarResults } from "@/context/SolarContext";
import type { RoiParams, RoiResults } from "@/context/RoiContext";
import { ORIENTATIONS } from "@/context/RoiContext";
import type { ClientData } from "@/context/ClientContext";
import type { MapaData } from "@/context/MapaContext";

const MONTHS_PT = ["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"];
const MONTHS_FULL = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho",
                     "Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];

const COMPANY = {
  name: "Pinheiro Instalações Eléctricas e Canalizações Unipessoal Lda",
  address: "Quinta do Chão Grande nº78 Massarocas",
  postal: "3660-409 São Pedro do Sul",
  nif: "506505170",
  phone: "964 119 508",
};

// ─── Logo loader ──────────────────────────────────────────────────────────────
async function getLogoDataUrl(): Promise<string> {
  try {
    const asset = Asset.fromModule(require("@/assets/logo.png"));
    await asset.downloadAsync();
    if (Platform.OS === "web") return asset.uri;
    if (asset.localUri) {
      const b64 = await FileSystem.readAsStringAsync(asset.localUri, {
        encoding: FileSystem.EncodingType.Base64,
      });
      return `data:image/png;base64,${b64}`;
    }
  } catch (_) {}
  return "";
}

// ─── Formatters ───────────────────────────────────────────────────────────────
function fmt(n: number, dec = 0) {
  return n.toLocaleString("pt-PT", { minimumFractionDigits: dec, maximumFractionDigits: dec });
}
function today() {
  return new Date().toLocaleDateString("pt-PT", { day: "2-digit", month: "long", year: "numeric" });
}

// ═══════════════════════════════════════════════════════════════════════════════
// SVG: Cross-section (side view) spacing diagram
// ═══════════════════════════════════════════════════════════════════════════════
function buildCrossSectionSvg(p: SolarParams, r: SolarResults): string {
  const SVG_W = 540;
  const groundY = 200;
  const betaRad = r.panelAngle * Math.PI / 180;
  const projH = r.panelHeight * Math.sin(betaRad);
  const projD = r.panelProjectedDepth;

  // Dynamic scale: fit both panels + annotations
  const scale = Math.min(
    150 / Math.max(projH, 0.05),
    380 / Math.max(r.rowSpacing + projD + 0.3, 0.1),
    85,
  );

  const thick = 5; // panel visual thickness in px
  const dx = thick * Math.sin(betaRad);
  const dy = -thick * Math.cos(betaRad);

  // Panel 1
  const p1Bx = 72;
  const p1By = groundY;
  const p1Tx = p1Bx + projD * scale;
  const p1Ty = groundY - projH * scale;

  // Panel 2 base
  const p2Bx = p1Bx + r.rowSpacing * scale;
  const p2Tx = p2Bx + projD * scale;

  // Sun: trace backward from P1 tip along the shadow ray
  const rxRay = p2Bx - p1Tx;
  const ryRay = p1By - p1Ty; // positive = upward in real coords
  const sunLen = 130;
  const mag = Math.sqrt(rxRay * rxRay + ryRay * ryRay);
  const sunX = p1Tx - (rxRay / mag) * sunLen;
  const sunY = p1Ty + (ryRay / mag) * sunLen; // SVG y is inverted

  const SVG_H = groundY + 72;

  return `<svg viewBox="0 0 ${SVG_W} ${SVG_H}" xmlns="http://www.w3.org/2000/svg" style="width:100%;border-radius:8px">
  <defs>
    <linearGradient id="sky-g" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#D6ECFF"/>
      <stop offset="100%" stop-color="#F0F8FF"/>
    </linearGradient>
    <linearGradient id="panel-g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#2196F3"/>
      <stop offset="100%" stop-color="#0D2B45"/>
    </linearGradient>
  </defs>

  <!-- Background -->
  <rect width="${SVG_W}" height="${groundY}" fill="url(#sky-g)"/>
  <rect y="${groundY}" width="${SVG_W}" height="${SVG_H - groundY}" fill="#C8D4DC"/>

  <!-- Ground line -->
  <line x1="0" y1="${groundY}" x2="${SVG_W}" y2="${groundY}" stroke="#7A94A4" stroke-width="2"/>

  <!-- Gap zone (shadow on ground) -->
  <rect x="${p1Tx}" y="${groundY - 3}" width="${p2Bx - p1Tx}" height="6" fill="#EF4444" rx="2" opacity="0.75"/>

  <!-- Sun ray: tip of P1 → base of P2 -->
  <line x1="${p1Tx}" y1="${p1Ty}" x2="${p2Bx}" y2="${p1By}" stroke="#F5A623" stroke-width="1.5" stroke-dasharray="8,4" opacity="0.9"/>

  <!-- Ray extended to sun position -->
  <line x1="${p1Tx}" y1="${p1Ty}" x2="${Math.max(8, sunX)}" y2="${Math.max(8, sunY)}" stroke="#F5A623" stroke-width="1" stroke-dasharray="8,4" opacity="0.5"/>

  <!-- Panel 1 (solid) -->
  <polygon points="${p1Bx},${p1By} ${p1Tx},${p1Ty} ${p1Tx+dx},${p1Ty+dy} ${p1Bx+dx},${p1By+dy}" fill="url(#panel-g)" stroke="#0D2B45" stroke-width="1.5"/>

  <!-- Panel 2 (ghost) -->
  <polygon points="${p2Bx},${p1By} ${p2Tx},${p1Ty} ${p2Tx+dx},${p1Ty+dy} ${p2Bx+dx},${p1By+dy}" fill="#7BB3D8" stroke="#0D2B45" stroke-width="1.5" opacity="0.75"/>

  <!-- Panel labels -->
  <text x="${(p1Bx+p1Tx)/2+2}" y="${(p1By+p1Ty)/2+4}" text-anchor="middle" font-size="11" fill="white" font-family="Arial" font-weight="bold">P1</text>
  <text x="${(p2Bx+p2Tx)/2+2}" y="${(p1By+p1Ty)/2+4}" text-anchor="middle" font-size="11" fill="#0D2B45" font-family="Arial" font-weight="bold">P2</text>

  <!-- Sun -->
  ${sunX > 12 && sunY > 12 && sunY < groundY - 10
    ? `<circle cx="${sunX}" cy="${sunY}" r="15" fill="#F5A623" opacity="0.9"/>
       <text x="${sunX}" y="${sunY+5}" text-anchor="middle" font-size="13" fill="white">☀</text>`
    : ""}

  <!-- Solar angle label on ray -->
  <text x="${(p1Tx+p2Bx)/2-2}" y="${(p1Ty+p1By)/2-8}" text-anchor="middle" font-size="10" fill="#B45309" font-family="Arial">α = ${r.altitudeAngle.toFixed(1)}°</text>

  <!-- Beta label on panel -->
  <text x="${p1Bx+10}" y="${groundY-10}" font-size="10" fill="white" font-family="Arial" font-weight="bold">β=${r.panelAngle}°</text>

  <!-- h annotation (left) -->
  <line x1="${p1Bx-18}" y1="${p1Ty}" x2="${p1Bx-18}" y2="${groundY}" stroke="#4A6072" stroke-width="1"/>
  <line x1="${p1Bx-24}" y1="${p1Ty}" x2="${p1Bx-12}" y2="${p1Ty}" stroke="#4A6072" stroke-width="1"/>
  <line x1="${p1Bx-24}" y1="${groundY}" x2="${p1Bx-12}" y2="${groundY}" stroke="#4A6072" stroke-width="1"/>
  <text x="${p1Bx-32}" y="${(p1Ty+groundY)/2+4}" text-anchor="middle" font-size="9" fill="#4A6072" font-family="Arial" transform="rotate(-90,${p1Bx-32},${(p1Ty+groundY)/2})">h = ${r.panelHeight}m</text>

  <!-- Gap label -->
  <text x="${(p1Tx+p2Bx)/2}" y="${groundY+16}" text-anchor="middle" font-size="10" fill="#DC2626" font-family="Arial" font-weight="bold">espaço livre = ${r.gap.toFixed(2)} m</text>

  <!-- Row spacing annotation (d) -->
  <line x1="${p1Bx}" y1="${groundY+36}" x2="${p2Bx}" y2="${groundY+36}" stroke="#0D2B45" stroke-width="1.5"/>
  <line x1="${p1Bx}" y1="${groundY+28}" x2="${p1Bx}" y2="${groundY+44}" stroke="#0D2B45" stroke-width="1.5"/>
  <line x1="${p2Bx}" y1="${groundY+28}" x2="${p2Bx}" y2="${groundY+44}" stroke="#0D2B45" stroke-width="1.5"/>
  <text x="${(p1Bx+p2Bx)/2}" y="${groundY+56}" text-anchor="middle" font-size="11" fill="#0D2B45" font-family="Arial" font-weight="bold">d = ${r.rowSpacing.toFixed(2)} m  (distância início a início)</text>
</svg>`;
}

// ═══════════════════════════════════════════════════════════════════════════════
// SVG: Top-down layout diagram
// ═══════════════════════════════════════════════════════════════════════════════
function buildLayoutSvg(p: SolarParams, r: SolarResults): string {
  const numRows = parseInt(p.rows) || 4;
  const numCols = parseInt(p.cols) || 5;
  const projD = r.panelProjectedDepth;
  const panelW = r.panelWidth;
  const gap = r.gap;

  const totalNS = numRows * projD + (numRows - 1) * gap;
  const totalEW = numCols * panelW + (numCols - 1) * 0.05;

  const SVG_W = 500;
  const marginH = 50;
  const marginV_top = 50;
  const marginV_bot = 55;

  const scaleX = (SVG_W - 2 * marginH) / Math.max(totalEW, 0.1);
  const maxH = 240;
  const scaleY = Math.min(maxH / Math.max(totalNS, 0.1), scaleX, 70);
  const scale = Math.min(scaleX, scaleY);

  const drawW = totalEW * scale;
  const drawH = totalNS * scale;
  const startX = marginH + (SVG_W - 2 * marginH - drawW) / 2;
  const startY = marginV_top;
  const SVG_H = startY + drawH + marginV_bot;

  let panelRects = "";
  let gapRects = "";

  for (let row = 0; row < numRows; row++) {
    const rowY = startY + row * (projD + gap) * scale;
    if (row < numRows - 1) {
      const gapY = rowY + projD * scale;
      gapRects += `<rect x="${startX}" y="${gapY}" width="${drawW}" height="${gap * scale}" fill="#FEE2E2" stroke="#EF4444" stroke-width="0.5" rx="1"/>`;
    }
    for (let col = 0; col < numCols; col++) {
      const colX = startX + col * (panelW + 0.05) * scale;
      panelRects += `<rect x="${colX.toFixed(1)}" y="${rowY.toFixed(1)}" width="${(panelW * scale).toFixed(1)}" height="${(projD * scale).toFixed(1)}" fill="#1E88E5" stroke="#0D2B45" stroke-width="1" rx="2"/>`;
    }
  }

  // Scale bar (1 meter)
  const sbX = startX;
  const sbY = SVG_H - 20;
  const sbW = scale;

  // Row spacing left annotation
  const hasRowAnnot = numRows > 1;
  const annotX = startX - 28;
  const annotY1 = startY;
  const annotY2 = startY + (projD + gap) * scale;

  return `<svg viewBox="0 0 ${SVG_W} ${SVG_H}" xmlns="http://www.w3.org/2000/svg" style="width:100%;border-radius:8px">
  <rect width="${SVG_W}" height="${SVG_H}" fill="#F0F6FB" rx="8"/>

  <!-- North / South labels -->
  <text x="${startX + drawW/2}" y="24" text-anchor="middle" font-size="15" fill="#0D2B45" font-family="Arial" font-weight="bold">N ↑</text>
  <text x="${startX + drawW/2}" y="${startY + drawH + 22}" text-anchor="middle" font-size="15" fill="#0D2B45" font-family="Arial" font-weight="bold">↓ S</text>

  <!-- East / West -->
  <text x="${startX - 6}" y="${startY + drawH/2 + 4}" text-anchor="end" font-size="10" fill="#6B8FA4" font-family="Arial">O</text>
  <text x="${startX + drawW + 6}" y="${startY + drawH/2 + 4}" text-anchor="start" font-size="10" fill="#6B8FA4" font-family="Arial">E</text>

  <!-- Gap zones -->
  ${gapRects}

  <!-- Panels -->
  ${panelRects}

  <!-- Row spacing annotation -->
  ${hasRowAnnot ? `
  <line x1="${annotX}" y1="${annotY1}" x2="${annotX}" y2="${annotY2}" stroke="#4A6072" stroke-width="1"/>
  <line x1="${annotX-5}" y1="${annotY1}" x2="${annotX+5}" y2="${annotY1}" stroke="#4A6072" stroke-width="1"/>
  <line x1="${annotX-5}" y1="${annotY2}" x2="${annotX+5}" y2="${annotY2}" stroke="#4A6072" stroke-width="1"/>
  <text x="${annotX-7}" y="${(annotY1+annotY2)/2+4}" text-anchor="end" font-size="9" fill="#4A6072" font-family="Arial">d=${r.rowSpacing.toFixed(2)}m</text>
  ` : ""}

  <!-- Gap label -->
  ${hasRowAnnot ? `
  <text x="${startX + drawW + 6}" y="${startY + projD * scale + gap * scale/2 + 4}" text-anchor="start" font-size="9" fill="#DC2626" font-family="Arial">gap ${r.gap.toFixed(2)}m</text>
  ` : ""}

  <!-- Scale bar -->
  <rect x="${sbX}" y="${sbY-3}" width="${sbW}" height="3" fill="#0D2B45"/>
  <line x1="${sbX}" y1="${sbY-6}" x2="${sbX}" y2="${sbY+1}" stroke="#0D2B45" stroke-width="1.5"/>
  <line x1="${sbX+sbW}" y1="${sbY-6}" x2="${sbX+sbW}" y2="${sbY+1}" stroke="#0D2B45" stroke-width="1.5"/>
  <text x="${sbX+sbW/2}" y="${sbY+11}" text-anchor="middle" font-size="9" fill="#4A6072" font-family="Arial">1 metro</text>

  <!-- Dimensions -->
  <text x="${startX+drawW/2}" y="${SVG_H-4}" text-anchor="middle" font-size="9" fill="#4A6072" font-family="Arial">${r.totalWidth.toFixed(2)} m (E-O) × ${r.totalLength.toFixed(2)} m (N-S) — ${numCols}×${numRows} painéis</text>
</svg>`;
}

// ═══════════════════════════════════════════════════════════════════════════════
// SVG: Monthly production bar chart
// ═══════════════════════════════════════════════════════════════════════════════
function buildMonthlyBarChartSvg(monthlyKwh: number[]): string {
  const W = 500;
  const H = 150;
  const mL = 46; const mR = 10; const mT = 14; const mB = 28;
  const cW = W - mL - mR;
  const cH = H - mT - mB;
  const maxVal = Math.max(...monthlyKwh);
  const barW = cW / 12;
  const pad = barW * 0.12;

  let bars = "";
  monthlyKwh.forEach((v, i) => {
    const bH = (v / maxVal) * cH;
    const x = mL + i * barW + pad;
    const y = mT + cH - bH;
    const w = barW - 2 * pad;
    const alpha = (0.55 + 0.45 * v / maxVal).toFixed(2);
    bars += `<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${w.toFixed(1)}" height="${bH.toFixed(1)}" fill="#1E88E5" rx="2" opacity="${alpha}"/>`;
    bars += `<text x="${(x + w/2).toFixed(1)}" y="${H-mB+12}" text-anchor="middle" font-size="8.5" fill="#4A6072" font-family="Arial">${MONTHS_PT[i]}</text>`;
    if (bH > 16) {
      bars += `<text x="${(x+w/2).toFixed(1)}" y="${(y-3).toFixed(1)}" text-anchor="middle" font-size="7.5" fill="#0D2B45" font-family="Arial">${Math.round(v)}</text>`;
    }
  });

  const gridLines = [0, 0.5, 1].map(f => {
    const gy = mT + cH - f * cH;
    const label = Math.round(maxVal * f);
    return `<line x1="${mL}" y1="${gy.toFixed(1)}" x2="${W-mR}" y2="${gy.toFixed(1)}" stroke="#D1DCE8" stroke-width="0.5"/>
<text x="${(mL-4).toFixed(1)}" y="${(gy+3).toFixed(1)}" text-anchor="end" font-size="8" fill="#8CA0B0" font-family="Arial">${label}</text>`;
  }).join("");

  return `<svg viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" style="width:100%">
  ${gridLines}
  ${bars}
  <line x1="${mL}" y1="${mT}" x2="${mL}" y2="${mT+cH}" stroke="#C0CDD8" stroke-width="1"/>
  <line x1="${mL}" y1="${mT+cH}" x2="${W-mR}" y2="${mT+cH}" stroke="#C0CDD8" stroke-width="1"/>
  <text x="12" y="${mT+cH/2}" text-anchor="middle" font-size="8" fill="#4A6072" font-family="Arial" transform="rotate(-90,12,${mT+cH/2})">kWh/mês</text>
</svg>`;
}

// ═══════════════════════════════════════════════════════════════════════════════
// SVG: 25-year cumulative ROI line chart
// ═══════════════════════════════════════════════════════════════════════════════
function buildRoiLineChartSvg(cumulativeNet: number[], cost: number): string {
  const W = 500;
  const H = 180;
  const mL = 64; const mR = 14; const mT = 18; const mB = 28;
  const cW = W - mL - mR;
  const cH = H - mT - mB;

  const minVal = Math.min(...cumulativeNet, -cost * 0.05);
  const maxVal = Math.max(...cumulativeNet, cost * 0.05);
  const range = Math.max(maxVal - minVal, 1);

  const toX = (i: number) => mL + (i / 24) * cW;
  const toY = (v: number) => mT + ((maxVal - v) / range) * cH;

  const zeroY = toY(0);

  // Polyline points
  const pts = cumulativeNet.map((v, i) => `${toX(i).toFixed(1)},${toY(v).toFixed(1)}`).join(" ");

  // Fill area (below zero = loss, above zero = profit)
  const areaLoss = cumulativeNet.map((v, i) => {
    const x = toX(i);
    const y = toY(Math.min(v, 0));
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });
  const lossPoly = [`${toX(0).toFixed(1)},${zeroY.toFixed(1)}`, ...areaLoss, `${toX(24).toFixed(1)},${zeroY.toFixed(1)}`].join(" ");

  const areaProfit = cumulativeNet.map((v, i) => {
    const x = toX(i);
    const y = toY(Math.max(v, 0));
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });
  const profitPoly = [`${toX(0).toFixed(1)},${zeroY.toFixed(1)}`, ...areaProfit, `${toX(24).toFixed(1)},${zeroY.toFixed(1)}`].join(" ");

  // X labels
  const xLabels = [1, 5, 10, 15, 20, 25].map(y => {
    const x = toX(y - 1);
    return `<text x="${x.toFixed(1)}" y="${H-mB+13}" text-anchor="middle" font-size="8.5" fill="#4A6072" font-family="Arial">${y}a</text>
<line x1="${x.toFixed(1)}" y1="${mT}" x2="${x.toFixed(1)}" y2="${mT+cH}" stroke="#EDF2F7" stroke-width="0.5"/>`;
  }).join("");

  // Y labels (3 levels)
  const yVals = [minVal, 0, maxVal];
  const yLabels = yVals.map(v => {
    const y = toY(v);
    const k = Math.abs(v) >= 1000;
    const label = k ? `${(v/1000).toFixed(1)}k€` : `${Math.round(v)}€`;
    const color = v === 0 ? "#DC2626" : "#8CA0B0";
    return `<text x="${(mL-4)}" y="${(y+3).toFixed(1)}" text-anchor="end" font-size="8" fill="${color}" font-family="Arial">${label}</text>
<line x1="${mL}" y1="${y.toFixed(1)}" x2="${W-mR}" y2="${y.toFixed(1)}" stroke="${v===0 ? "#EF4444" : "#EDF2F7"}" stroke-width="${v===0 ? "1" : "0.5"}" ${v===0 ? 'stroke-dasharray="4,3"' : ""}/>`;
  }).join("");

  // Payback marker
  const pbIdx = cumulativeNet.findIndex(v => v >= 0);
  const pbMarker = pbIdx > 0 ? `
<line x1="${toX(pbIdx).toFixed(1)}" y1="${mT}" x2="${toX(pbIdx).toFixed(1)}" y2="${mT+cH}" stroke="#22C55E" stroke-width="1.5" stroke-dasharray="4,3"/>
<text x="${(toX(pbIdx)+3).toFixed(1)}" y="${mT+12}" font-size="8.5" fill="#16A34A" font-family="Arial">Payback: a${pbIdx+1}</text>
` : "";

  // Dots at years 10, 20, 25
  const dots = [9, 19, 24].filter(i => i < cumulativeNet.length).map(i => {
    const x = toX(i);
    const y = toY(cumulativeNet[i]);
    const col = cumulativeNet[i] >= 0 ? "#22C55E" : "#EF4444";
    return `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="3.5" fill="${col}" stroke="white" stroke-width="1"/>`;
  }).join("");

  return `<svg viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" style="width:100%">
  ${xLabels}
  ${yLabels}
  <!-- Loss area -->
  <polygon points="${lossPoly}" fill="#FEE2E2" opacity="0.45"/>
  <!-- Profit area -->
  <polygon points="${profitPoly}" fill="#DCFCE7" opacity="0.55"/>
  <!-- Line -->
  <polyline points="${pts}" fill="none" stroke="#0D2B45" stroke-width="2.2" stroke-linejoin="round" stroke-linecap="round"/>
  ${pbMarker}
  ${dots}
  <!-- Axes -->
  <line x1="${mL}" y1="${mT}" x2="${mL}" y2="${mT+cH}" stroke="#C0CDD8" stroke-width="1"/>
  <line x1="${mL}" y1="${mT+cH}" x2="${W-mR}" y2="${mT+cH}" stroke="#C0CDD8" stroke-width="1"/>
  <text x="12" y="${mT+cH/2}" text-anchor="middle" font-size="8" fill="#4A6072" font-family="Arial" transform="rotate(-90,12,${mT+cH/2})">€ líquido</text>
  <text x="${mL+cW/2}" y="${H-1}" text-anchor="middle" font-size="8.5" fill="#4A6072" font-family="Arial">Anos de operação</text>
</svg>`;
}

// ═══════════════════════════════════════════════════════════════════════════════
// HTML sections
// ═══════════════════════════════════════════════════════════════════════════════
function spacingSection(params: SolarParams, results: SolarResults): string {
  const rows = [
    ["Altura do painel (h)", `${results.panelHeight} m`],
    ["Largura do painel", `${results.panelWidth} m`],
    ["Ângulo de inclinação (β)", `${results.panelAngle}°`],
    ["Latitude", `${params.latitude}°`],
    ["Nº de fileiras", params.rows || "4"],
    ["Nº de colunas", params.cols || "5"],
  ];
  const res = [
    ["Distância início→início (d)", `${results.rowSpacing.toFixed(2)} m`, "main"],
    ["Espaço livre entre fileiras", `${results.gap.toFixed(2)} m`, "highlight"],
    ["Proj. horizontal do painel", `${results.panelProjectedDepth.toFixed(2)} m`, ""],
    ["Comprimento N-S total", `${results.totalLength.toFixed(2)} m`, ""],
    ["Largura E-O total", `${results.totalWidth.toFixed(2)} m`, ""],
    ["Ângulo solar (21 Dez)", `${results.altitudeAngle.toFixed(1)}°`, ""],
    ["Declinação solar (21 Dez)", `${results.declinationAngle.toFixed(1)}°`, ""],
  ];

  const cssSvg = buildCrossSectionSvg(params, results);
  const layoutSvg = buildLayoutSvg(params, results);

  return `
<div class="section">
  <div class="section-header">
    <div class="section-icon">📐</div>
    <div>
      <div class="section-title">Dimensionamento — Distâncias entre Painéis</div>
      <div class="section-sub">Solstício de inverno (21 Dezembro) · condição de sombreamento mais crítica</div>
    </div>
  </div>

  <div class="two-col">
    <div>
      <div class="sub-title">Parâmetros de entrada</div>
      <table class="data-table">
        ${rows.map(([k,v]) => `<tr><td class="td-key">${k}</td><td class="td-val">${v}</td></tr>`).join("")}
      </table>
    </div>
    <div>
      <div class="sub-title">Resultados</div>
      <table class="data-table">
        ${res.map(([k,v,cls]) => `<tr class="${cls==="main"?"row-main":cls==="highlight"?"row-highlight":""}">
          <td class="td-key">${k}</td>
          <td class="td-val ${cls==="main"?"val-main":cls==="highlight"?"val-highlight":""}">${v}</td>
        </tr>`).join("")}
      </table>
    </div>
  </div>

  <div class="sub-title" style="margin-top:18px">Vista de perfil — Diagrama de espaçamento</div>
  <div class="diagram-box">${cssSvg}</div>

  <div class="sub-title" style="margin-top:14px">Vista superior — Disposição do array fotovoltaico</div>
  <div class="diagram-box">${layoutSvg}</div>

  <div class="formula-box">
    <strong>Fórmula:</strong>
    d = h·cos(β) + h·sin(β)/tan(α) &nbsp;|&nbsp;
    α = 90° − |lat| + δ &nbsp;|&nbsp; δ = −23,45° (21 Dez)
  </div>
</div>`;
}

function roiSection(params: RoiParams, results: RoiResults, hasBattery: boolean, orientation: string): string {
  const orientLabel = ORIENTATIONS.find(o => o.label === orientation)?.full ?? orientation;

  const sys = [
    ["Potência total", `${results.totalPowerKwp.toFixed(2)} kWp`],
    ["Potência por painel", `${params.panelPower} Wp`],
    ["Número de painéis", params.numPanels],
    ["Orientação", `${orientation} — ${orientLabel}`],
    ["Inclinação", `${params.inclination}°`],
    ["Inversor", params.inverterPower ? `${params.inverterPower} kW` : "—"],
    ["Baterias", hasBattery ? `Sim (${params.batteryCapacity || "—"} kWh)` : "Não"],
    ["Consumo anual", params.annualConsumption ? `${fmt(parseFloat(params.annualConsumption))} kWh` : "—"],
  ];
  const fin = [
    ["Investimento total", `${fmt(parseFloat(params.investmentCost))} €`, ""],
    ["Produção anual est.", `${fmt(results.annualProductionKwh)} kWh`, ""],
    ["Autoconsumo", `${fmt(results.selfKwh)} kWh (${Math.round(results.selfRate*100)}% da prod.)`, ""],
    ["Injeção na rede", `${fmt(results.exportKwh)} kWh`, ""],
    ...(results.consumptionCoveredPct !== null
      ? [["Consumo coberto", `${Math.round(results.consumptionCoveredPct)}%`, ""]]
      : []),
    ["Poupança anual", `${fmt(results.annualSavingsEur)} €/ano`, "main"],
    ["Poupança mensal", `${fmt(results.annualSavingsEur/12)} €/mês`, ""],
    ["Payback", results.paybackYears > 50 ? "> 50 anos" : `${results.paybackYears.toFixed(1)} anos`, "main"],
    ["Retorno líquido 20 anos", `${results.netAfter20 >= 0 ? "+" : ""}${fmt(results.netAfter20)} €`, results.netAfter20 >= 0 ? "highlight" : ""],
    ["Retorno líquido 25 anos", `${results.netAfter25 >= 0 ? "+" : ""}${fmt(results.netAfter25)} €`, results.netAfter25 >= 0 ? "highlight" : ""],
  ];

  const monthRows = results.monthlyKwh.map((v, i) => {
    const eur = v * (parseFloat(params.electricityPrice) || 0.22);
    return `<tr><td>${MONTHS_FULL[i]}</td><td class="td-right">${fmt(v)} kWh</td><td class="td-right">${fmt(eur,2)} €</td></tr>`;
  }).join("");

  const years25Rows = [1,2,3,5,7,10,12,15,20,25].map(y => {
    const net = results.cumulativeNet[y-1];
    return `<tr class="${net >= 0 ? "row-highlight" : ""}">
      <td>Ano ${y}</td>
      <td class="td-right">${net>=0?"+":""}${fmt(net)} €</td>
      <td class="td-right">${net>=0?"✅ Lucro":"⏳ Recuperação"}</td>
    </tr>`;
  }).join("");

  const barSvg = buildMonthlyBarChartSvg(results.monthlyKwh);
  const roiSvg = buildRoiLineChartSvg(results.cumulativeNet, parseFloat(params.investmentCost));

  return `
<div class="section">
  <div class="section-header">
    <div class="section-icon">💶</div>
    <div>
      <div class="section-title">Estudo de Retorno de Investimento (ROI)</div>
      <div class="section-sub">Base: 1 550 kWh/kWp/ano · Degradação 0,5%/ano · Aumento preço energia 3%/ano</div>
    </div>
  </div>

  <div class="two-col">
    <div>
      <div class="sub-title">Sistema fotovoltaico</div>
      <table class="data-table">
        ${sys.map(([k,v]) => `<tr><td class="td-key">${k}</td><td class="td-val">${v}</td></tr>`).join("")}
      </table>
    </div>
    <div>
      <div class="sub-title">Análise financeira</div>
      <table class="data-table">
        ${fin.map(([k,v,cls]) => `<tr class="${cls==="main"?"row-main":cls==="highlight"?"row-highlight":""}">
          <td class="td-key">${k}</td>
          <td class="td-val ${cls==="main"?"val-main":cls==="highlight"?"val-highlight":""}">${v}</td>
        </tr>`).join("")}
      </table>
    </div>
  </div>

  <div class="sub-title" style="margin-top:18px">Produção mensal estimada (kWh)</div>
  <div class="diagram-box">${barSvg}</div>

  <div class="two-col" style="margin-top:14px">
    <div>
      <div class="sub-title">Detalhe mensal</div>
      <table class="data-table">
        <tr><th>Mês</th><th class="td-right">Produção</th><th class="td-right">Poupança est.</th></tr>
        ${monthRows}
      </table>
    </div>
    <div>
      <div class="sub-title">Projecção acumulada (25 anos)</div>
      <table class="data-table">
        <tr><th>Horizonte</th><th class="td-right">Retorno líquido</th><th class="td-right">Estado</th></tr>
        ${years25Rows}
      </table>
    </div>
  </div>

  <div class="sub-title" style="margin-top:18px">Retorno líquido acumulado ao longo de 25 anos</div>
  <div class="diagram-box">${roiSvg}</div>

  <div class="formula-box">
    <strong>Notas:</strong> Valores estimativos. Produção base: 1 550 kWh/kWp/ano (Portugal, orientação óptima).
    Autoconsumo calculado com base no perfil de carga e armazenamento. Consulte um instalador certificado.
  </div>
</div>`;
}

// ═══════════════════════════════════════════════════════════════════════════════
// Section: Mapa Satélite
// ═══════════════════════════════════════════════════════════════════════════════
function mapaSection(m: MapaData): string {
  const dirLabel = m.orientationLabel;
  const penalty = m.penaltyPct > 0 ? ` (−${m.penaltyPct}% orientação ${dirLabel})` : " (orientação óptima)";
  return `
<div class="section" style="page-break-before:always">
  <div class="section-header">
    <span class="section-icon">🛰️</span>
    <div>
      <div class="section-title">Projeção no Telhado — Mapa Satélite</div>
      <div class="section-sub">Posicionamento dos painéis sobre a cobertura real</div>
    </div>
  </div>

  <table class="data-table" style="margin-bottom:14px">
    <thead>
      <tr><th colspan="2">Dimensões do Painel</th></tr>
    </thead>
    <tbody>
      <tr><td class="td-key">Largura × Altura</td><td class="td-val">${m.panelW.toFixed(2)} m × ${m.panelH.toFixed(2)} m</td></tr>
      <tr><td class="td-key">Potência unitária</td><td class="td-val">${m.powerWp} Wp</td></tr>
      <tr><td class="td-key">Orientação</td><td class="td-val">${dirLabel} (${m.azimuth}°)</td></tr>
    </tbody>
  </table>

  <table class="data-table">
    <thead>
      <tr><th colspan="2">Resultados da Projeção</th></tr>
    </thead>
    <tbody>
      <tr><td class="td-key">Área do telhado desenhada</td><td class="td-val">${fmt(m.roofArea)} m²</td></tr>
      <tr class="row-main">
        <td class="td-key">Painéis posicionados no telhado</td>
        <td class="td-val val-main">${m.panelCount} painéis</td>
      </tr>
      ${m.capacity > m.panelCount ? `<tr><td class="td-key">Capacidade máx. da área</td><td class="td-val">${m.capacity} painéis</td></tr>` : ""}
      <tr><td class="td-key">Potência total instalada</td><td class="td-val">${m.totalKwp.toFixed(2)} kWp</td></tr>
      <tr class="row-highlight">
        <td class="td-key">Potência ajustada à orientação${penalty}</td>
        <td class="td-val val-highlight">${m.adjKwp.toFixed(2)} kWp</td>
      </tr>
    </tbody>
  </table>

  <div class="formula-box" style="margin-top:12px">
    <strong>Nota:</strong> A potência ajustada tem em conta a penalização de rendimento devida à orientação
    (Sul = 0%, SE/SO ≈ 4%, E/O ≈ 16%, Norte ≈ 45%). O posicionamento foi definido pelo técnico sobre imagem satélite.
  </div>
</div>`;
}

// ═══════════════════════════════════════════════════════════════════════════════
// Full HTML document
// ═══════════════════════════════════════════════════════════════════════════════
function buildHtml(
  logoUrl: string,
  client: ClientData,
  solarParams: SolarParams | null,
  solarResults: SolarResults | null,
  roiParams: RoiParams | null,
  roiResults: RoiResults | null,
  roiHasBattery: boolean,
  roiOrientation: string,
  mapaData: MapaData | null
): string {
  const hasSpacing = solarResults !== null && solarParams !== null;
  const hasRoi = roiResults !== null && roiParams !== null;
  const hasMapa = mapaData !== null;

  return `<!DOCTYPE html>
<html lang="pt">
<head>
<meta charset="UTF-8"/>
<title>Relatório Solar — ${client.name || "Cliente"}</title>
<style>
  *{margin:0;padding:0;box-sizing:border-box}
  body{font-family:Arial,sans-serif;font-size:11pt;color:#1a2a3a;background:#fff}
  .company-header{background:#0D2B45;color:#fff;padding:18px 26px;display:flex;align-items:center;gap:16px}
  .company-logo{width:68px;height:68px;object-fit:contain}
  .company-name{font-size:14pt;font-weight:bold;margin-bottom:3px}
  .company-detail{font-size:9pt;color:rgba(255,255,255,0.78);margin-top:2px}
  .header-right{margin-left:auto;text-align:right}
  .report-title{font-size:17pt;font-weight:bold;color:#F5A623}
  .report-date{font-size:9pt;color:rgba(255,255,255,0.65);margin-top:4px}
  .client-block{background:#F7F9FC;border:1px solid #D1DCE8;border-radius:8px;padding:14px 18px;margin:16px 26px;display:flex;gap:28px;flex-wrap:wrap}
  .client-label{font-size:8pt;text-transform:uppercase;letter-spacing:.4px;color:#4A6072;margin-bottom:3px;font-weight:bold}
  .client-value{font-size:12pt;font-weight:bold;color:#0D2B45}
  .client-sub{font-size:10pt;color:#4A6072;margin-top:2px}
  .section{margin:0 26px 22px;page-break-inside:avoid}
  .section-header{display:flex;align-items:flex-start;gap:10px;margin-bottom:12px;border-bottom:2px solid #0D2B45;padding-bottom:7px}
  .section-icon{font-size:17pt}
  .section-title{font-size:12pt;font-weight:bold;color:#0D2B45}
  .section-sub{font-size:8.5pt;color:#4A6072;margin-top:2px}
  .sub-title{font-size:10pt;font-weight:bold;color:#0D2B45;margin-bottom:7px}
  .two-col{display:flex;gap:18px}
  .two-col>div{flex:1}
  .data-table{width:100%;border-collapse:collapse;font-size:9pt}
  .data-table th{background:#0D2B45;color:#fff;padding:5px 7px;text-align:left;font-size:8.5pt}
  .data-table th.td-right{text-align:right}
  .data-table td{padding:4px 7px;border-bottom:1px solid #EDF2F7}
  .td-key{color:#4A6072;width:58%}
  .td-val{font-weight:bold;color:#0D2B45;text-align:right}
  .td-right{text-align:right}
  .row-main{background:#EBF4FF}
  .row-main td{color:#0D2B45;font-weight:bold}
  .row-highlight{background:#F0FFF4}
  .val-main{color:#1E88E5;font-size:11pt}
  .val-highlight{color:#16A34A;font-size:11pt}
  .diagram-box{border:1px solid #D1DCE8;border-radius:8px;overflow:hidden;margin-bottom:6px}
  .formula-box{background:#FFF8E7;border:1px solid #F5A623;border-radius:6px;padding:9px 13px;margin-top:12px;font-size:9pt;color:#5a3e00}
  .footer{border-top:1px solid #D1DCE8;margin:18px 26px 0;padding-top:9px;font-size:8pt;color:#8CA0B0;display:flex;justify-content:space-between}
  @media print{.section{page-break-inside:avoid}}
</style>
</head>
<body>

<div class="company-header">
  ${logoUrl ? `<img src="${logoUrl}" class="company-logo" alt="Logo"/>` : ""}
  <div>
    <div class="company-name">${COMPANY.name}</div>
    <div class="company-detail">${COMPANY.address} · ${COMPANY.postal}</div>
    <div class="company-detail">NIF: ${COMPANY.nif} &nbsp;|&nbsp; Tel: ${COMPANY.phone}</div>
  </div>
  <div class="header-right">
    <div class="report-title">Relatório Solar</div>
    <div class="report-date">Emitido em ${today()}</div>
  </div>
</div>

<div class="client-block">
  <div>
    <div class="client-label">Cliente</div>
    <div class="client-value">${client.name || "—"}</div>
    ${client.address ? `<div class="client-sub">${client.address}</div>` : ""}
  </div>
  ${client.nif ? `<div><div class="client-label">NIF</div><div class="client-value">${client.nif}</div></div>` : ""}
  ${client.phone ? `<div><div class="client-label">Contacto</div><div class="client-value">${client.phone}</div></div>` : ""}
  ${client.email ? `<div><div class="client-label">E-mail</div><div class="client-value">${client.email}</div></div>` : ""}
  ${client.notes ? `<div><div class="client-label">Notas</div><div class="client-sub">${client.notes}</div></div>` : ""}
</div>

${hasSpacing ? spacingSection(solarParams!, solarResults!) : ""}
${hasRoi ? roiSection(roiParams!, roiResults!, roiHasBattery, roiOrientation) : ""}
${hasMapa ? mapaSection(mapaData!) : ""}

<div class="footer">
  <span>${COMPANY.name} · NIF ${COMPANY.nif}</span>
  <span>FotoCalc · ${today()}</span>
</div>
</body>
</html>`;
}

// ═══════════════════════════════════════════════════════════════════════════════
// Public API
// ═══════════════════════════════════════════════════════════════════════════════
export interface GeneratePdfOptions {
  client: ClientData;
  solarParams: SolarParams | null;
  solarResults: SolarResults | null;
  roiParams: RoiParams | null;
  roiResults: RoiResults | null;
  roiHasBattery: boolean;
  roiOrientation: string;
  mapaData: MapaData | null;
}

export async function generateAndSharePdf(opts: GeneratePdfOptions): Promise<void> {
  const logoUrl = await getLogoDataUrl();
  const html = buildHtml(
    logoUrl, opts.client,
    opts.solarParams, opts.solarResults,
    opts.roiParams, opts.roiResults,
    opts.roiHasBattery, opts.roiOrientation,
    opts.mapaData
  );

  if (Platform.OS === "web") {
    const w = window.open("", "_blank");
    if (w) {
      w.document.write(html);
      w.document.close();
      setTimeout(() => w.print(), 600);
    }
    return;
  }

  const { uri } = await Print.printToFileAsync({ html, base64: false });
  const canShare = await Sharing.isAvailableAsync();
  if (canShare) {
    await Sharing.shareAsync(uri, {
      mimeType: "application/pdf",
      dialogTitle: "Relatório Solar — Pinheiro Instalações",
    });
  } else {
    await Print.printAsync({ uri });
  }
}
