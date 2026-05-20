import { SolarResult } from "@/contexts/SolarContext";
import { RoiResult } from "@/contexts/RoiContext";

export function buildCrossSectionSvg(result: SolarResult): string {
  const W = 640;
  const H = 320;

  const h = result.panelHeight;
  const w = result.panelProjectedDepth;
  const gap = result.gap;
  const panelRad = result.panelAngle * Math.PI / 180;
  const altDeg = result.altitudeAngle;

  const paddingX = 55;
  const paddingBottom = 45;
  const sunR = 20;
  const sunMargin = sunR + 65; // reserve right side for sun
  const baseline = H - paddingBottom;

  // Full horizontal extent: from p1 base to p2 top + sun margin
  const panelGroupW = (w + gap) + Math.cos(panelRad) * h;
  const panelProjH = Math.sin(panelRad) * h;
  const availW = W - paddingX - sunMargin;
  const scale = Math.min(availW / panelGroupW, (baseline - 85) / (panelProjH * 1.2));

  // Panel 1 (left / north = shadowed)
  const p1x = paddingX;
  const p1yTop = baseline - Math.sin(panelRad) * h * scale;
  const p1xTop = p1x + Math.cos(panelRad) * h * scale;

  // Panel 2 (right / south = front row)
  const p2x = p1x + (w + gap) * scale;
  const p2yTop = baseline - Math.sin(panelRad) * h * scale;
  const p2xTop = p2x + Math.cos(panelRad) * h * scale;

  // Shadow tip (where gap starts on the ground)
  const shadowTipX = p1x + w * scale;
  const shadowTipY = baseline;

  // Sun position: extend the actual ray direction (shadowTip → p2Top) past p2Top
  const rdx = p2xTop - shadowTipX;
  const rdy = p2yTop - shadowTipY;
  const rLen = Math.sqrt(rdx * rdx + rdy * rdy);
  const rndx = rdx / rLen;
  const rndy = rdy / rLen;
  // Clamp sun position to stay within SVG bounds
  const maxExtByX = rndx > 0 ? (W - sunR - 8 - p2xTop) / rndx : 999;
  const maxExtByY = rndy < 0 ? (sunR + 8 - p2yTop) / rndy : 999;
  const sunExt = Math.min(Math.max(50, rLen * 0.55), maxExtByX, maxExtByY);
  const sunX = p2xTop + sunExt * rndx;
  const sunY = p2yTop + sunExt * rndy;

  // Sun rays
  const numRays = 8;
  let sunRaysSvg = "";
  for (let i = 0; i < numRays; i++) {
    const ang = (i * 360 / numRays) * Math.PI / 180;
    const x1 = sunX + (sunR + 4) * Math.cos(ang);
    const y1 = sunY + (sunR + 4) * Math.sin(ang);
    const x2 = sunX + (sunR + 12) * Math.cos(ang);
    const y2 = sunY + (sunR + 12) * Math.sin(ang);
    sunRaysSvg += `<line x1="${x1.toFixed(1)}" y1="${y1.toFixed(1)}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}" stroke="#F5A623" stroke-width="2" stroke-linecap="round"/>`;
  }

  // Altitude angle arc at shadow tip (between horizontal and sun ray direction)
  const arcR = 42;
  // Ray direction from shadowTip toward sun: same as (rndx, rndy)
  const arcEndX = shadowTipX + arcR * rndx;
  const arcEndY = shadowTipY + arcR * rndy;

  // Panel angle arc at p1 base
  const pArcR = 30;
  const pArcEndX = p1x + pArcR * Math.cos(panelRad);
  const pArcEndY = baseline - pArcR * Math.sin(panelRad);

  // Row spacing annotation
  const rowSpX = (p1x + w * scale / 2 + p2x / 2);

  return `
    <svg viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="skyGrad" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stop-color="#BAE6FD"/>
          <stop offset="100%" stop-color="#EFF6FF"/>
        </linearGradient>
      </defs>

      <!-- Sky -->
      <rect width="${W}" height="${baseline}" fill="url(#skyGrad)"/>
      <!-- Ground -->
      <rect x="0" y="${baseline}" width="${W}" height="${H - baseline}" fill="#E2E8F0"/>
      <line x1="0" y1="${baseline}" x2="${W}" y2="${baseline}" stroke="#94A3B8" stroke-width="2"/>

      <!-- Direction labels -->
      <text x="10" y="${baseline - 6}" font-size="11" fill="#64748B" font-family="system-ui" font-style="italic">← Norte</text>
      <text x="${W - 10}" y="${baseline - 6}" text-anchor="end" font-size="11" fill="#B45309" font-family="system-ui" font-weight="bold">Sul →</text>

      <!-- Sun rays -->
      ${sunRaysSvg}
      <!-- Sun body -->
      <circle cx="${sunX.toFixed(1)}" cy="${sunY.toFixed(1)}" r="${sunR}" fill="#FDE68A" stroke="#F5A623" stroke-width="2.5"/>
      <text x="${sunX.toFixed(1)}" y="${(sunY + 4.5).toFixed(1)}" text-anchor="middle" font-size="9" fill="#92400E" font-family="system-ui" font-weight="bold">Sol</text>

      <!-- Sun ray line (grazes top of panel 2 → shadow tip) -->
      <line x1="${(sunX - sunR * rndx).toFixed(1)}" y1="${(sunY - sunR * rndy).toFixed(1)}"
            x2="${shadowTipX}" y2="${shadowTipY}"
            stroke="#F59E0B" stroke-width="1.5" stroke-dasharray="6,3" opacity="0.85"/>

      <!-- Altitude angle arc -->
      <path d="M ${(shadowTipX + arcR).toFixed(1)} ${shadowTipY} A ${arcR} ${arcR} 0 0 1 ${arcEndX.toFixed(1)} ${arcEndY.toFixed(1)}"
            fill="none" stroke="#1E88E5" stroke-width="1.5"/>
      <text x="${(shadowTipX + arcR + 7).toFixed(1)}" y="${(shadowTipY - 12).toFixed(1)}"
            font-size="12" fill="#1E88E5" font-family="system-ui" font-weight="bold">${altDeg.toFixed(1)}°</text>

      <!-- Panel 1 -->
      <line x1="${p1x}" y1="${baseline}" x2="${p1xTop.toFixed(1)}" y2="${p1yTop.toFixed(1)}"
            stroke="#0D2B45" stroke-width="7" stroke-linecap="round"/>
      <!-- Panel 1 incl. angle arc -->
      <path d="M ${(p1x + pArcR).toFixed(1)} ${baseline} A ${pArcR} ${pArcR} 0 0 1 ${pArcEndX.toFixed(1)} ${pArcEndY.toFixed(1)}"
            fill="none" stroke="#94A3B8" stroke-width="1.2"/>
      <text x="${(p1x + pArcR + 5).toFixed(1)}" y="${(baseline - 9).toFixed(1)}"
            font-size="10" fill="#64748B" font-family="system-ui">${result.panelAngle}°</text>

      <!-- Panel 2 -->
      <line x1="${p2x.toFixed(1)}" y1="${baseline}" x2="${p2xTop.toFixed(1)}" y2="${p2yTop.toFixed(1)}"
            stroke="#0D2B45" stroke-width="7" stroke-linecap="round"/>

      <!-- Gap highlight -->
      <line x1="${(p1x + w * scale).toFixed(1)}" y1="${baseline}"
            x2="${p2x.toFixed(1)}" y2="${baseline}"
            stroke="#EF4444" stroke-width="4" stroke-linecap="round"/>

      <!-- Horizontal ground projection of panel -->
      <line x1="${p1x}" y1="${baseline + 14}" x2="${(p1x + w * scale).toFixed(1)}" y2="${baseline + 14}"
            stroke="#94A3B8" stroke-width="1" stroke-dasharray="3,2"/>
      <line x1="${p1x}" y1="${baseline + 10}" x2="${p1x}" y2="${baseline + 18}" stroke="#94A3B8" stroke-width="1"/>
      <line x1="${(p1x + w * scale).toFixed(1)}" y1="${baseline + 10}" x2="${(p1x + w * scale).toFixed(1)}" y2="${baseline + 18}" stroke="#94A3B8" stroke-width="1"/>
      <text x="${(p1x + w * scale / 2).toFixed(1)}" y="${baseline + 28}"
            text-anchor="middle" font-size="10" fill="#64748B" font-family="system-ui">Proj. ${w.toFixed(2)}m</text>

      <!-- Gap label -->
      <text x="${(shadowTipX + (gap * scale) / 2).toFixed(1)}" y="${baseline - 11}"
            text-anchor="middle" font-size="12" fill="#EF4444" font-family="system-ui" font-weight="bold">Gap: ${gap.toFixed(2)}m</text>

      <!-- Row spacing label -->
      <line x1="${p1x}" y1="${(p1yTop - 10).toFixed(1)}" x2="${p2x.toFixed(1)}" y2="${(p1yTop - 10).toFixed(1)}"
            stroke="#1E88E5" stroke-width="1" stroke-dasharray="3,2"/>
      <text x="${((p1x + p2x) / 2).toFixed(1)}" y="${(p1yTop - 15).toFixed(1)}"
            text-anchor="middle" font-size="10" fill="#1E88E5" font-family="system-ui">d = ${result.rowSpacing.toFixed(2)}m</text>
    </svg>
  `;
}

export function buildLayoutSvg(result: SolarResult, rows: number, cols: number): string {
  const W = 400;
  const H = 400;

  const w = result.panelWidth;
  const rowSpacing = result.rowSpacing;
  const gap = result.gap;
  const proj = result.panelProjectedDepth;

  const totalW = cols * w;
  const totalH = proj + (rows - 1) * rowSpacing;

  const paddingX = 40;
  const paddingY = 40;

  const scale = Math.min((W - paddingX * 2) / totalW, (H - paddingY * 2) / totalH);

  const startX = (W - totalW * scale) / 2;
  const startY = (H - totalH * scale) / 2;

  let rects = "";
  let gaps = "";

  for (let r = 0; r < rows; r++) {
    const y = startY + r * rowSpacing * scale;
    for (let c = 0; c < cols; c++) {
      const x = startX + c * w * scale;
      rects += `<rect x="${x}" y="${y}" width="${w * scale - 2}" height="${proj * scale}" fill="#1E88E5" stroke="#0D2B45" stroke-width="1" rx="2" />`;
    }
    if (r < rows - 1) {
      gaps += `<rect x="${startX}" y="${y + proj * scale}" width="${totalW * scale}" height="${gap * scale}" fill="rgba(239, 68, 68, 0.2)" />`;
    }
  }

  return `
    <svg viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg">
      <rect width="${W}" height="${H}" fill="#F0F6FB" />

      <!-- N / S Labels -->
      <text x="${W/2}" y="20" text-anchor="middle" font-size="14" font-weight="bold" fill="#0D2B45" font-family="system-ui">N</text>
      <text x="${W/2}" y="${H - 10}" text-anchor="middle" font-size="14" font-weight="bold" fill="#0D2B45" font-family="system-ui">S</text>

      ${gaps}
      ${rects}

      <!-- Dimension lines -->
      <line x1="${startX - 10}" y1="${startY}" x2="${startX - 10}" y2="${startY + totalH * scale}" stroke="#94A3B8" stroke-width="1" />
      <text x="${startX - 15}" y="${H/2}" text-anchor="middle" transform="rotate(-90, ${startX - 15}, ${H/2})" font-size="12" fill="#64748B" font-family="system-ui">${result.totalLength.toFixed(2)}m</text>

      <line x1="${startX}" y1="${startY - 10}" x2="${startX + totalW * scale}" y2="${startY - 10}" stroke="#94A3B8" stroke-width="1" />
      <text x="${W/2}" y="${startY - 15}" text-anchor="middle" font-size="12" fill="#64748B" font-family="system-ui">${result.totalWidth.toFixed(2)}m</text>
    </svg>
  `;
}

export function buildMonthlyBarChartSvg(monthlyKwh: number[]): string {
  const W = 600;
  const H = 250;
  const paddingX = 40;
  const paddingY = 30;
  const maxVal = Math.max(...monthlyKwh) * 1.1;
  const barWidth = (W - paddingX * 2) / 12 * 0.6;
  const spacing = (W - paddingX * 2) / 12;

  const labels = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

  let bars = "";
  monthlyKwh.forEach((val, i) => {
    const h = (val / maxVal) * (H - paddingY * 2);
    const x = paddingX + i * spacing + (spacing - barWidth) / 2;
    const y = H - paddingY - h;
    bars += `<rect x="${x}" y="${y}" width="${barWidth}" height="${h}" fill="#1E88E5" rx="2" />`;
    bars += `<text x="${x + barWidth/2}" y="${H - paddingY + 15}" text-anchor="middle" font-size="10" fill="#64748B" font-family="system-ui">${labels[i]}</text>`;
  });

  return `
    <svg viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg">
      <!-- Grid -->
      <line x1="${paddingX}" y1="${H - paddingY}" x2="${W - paddingX}" y2="${H - paddingY}" stroke="#E2E8F0" stroke-width="2" />
      <line x1="${paddingX}" y1="${paddingY}" x2="${W - paddingX}" y2="${paddingY}" stroke="#E2E8F0" stroke-width="1" stroke-dasharray="4,4" />
      <text x="${paddingX - 5}" y="${paddingY + 4}" text-anchor="end" font-size="10" fill="#64748B" font-family="system-ui">${Math.round(maxVal)} kWh</text>

      ${bars}
    </svg>
  `;
}

export function buildRoiLineChartSvg(cumulativeNet: number[]): string {
  const W = 600;
  const H = 250;
  const paddingX = 50;
  const paddingY = 30;

  const minVal = Math.min(...cumulativeNet, 0);
  const maxVal = Math.max(...cumulativeNet);
  const range = maxVal - minVal;

  const zeroY = H - paddingY - ((0 - minVal) / range) * (H - paddingY * 2);
  const stepX = (W - paddingX * 2) / 24;

  let d = `M ${paddingX} ${H - paddingY - ((cumulativeNet[0] - minVal) / range) * (H - paddingY * 2)}`;
  let points = "";

  cumulativeNet.forEach((val, i) => {
    const x = paddingX + i * stepX;
    const y = H - paddingY - ((val - minVal) / range) * (H - paddingY * 2);
    if (i > 0) d += ` L ${x} ${y}`;
    if (i % 5 === 0 || i === 24) {
      points += `<circle cx="${x}" cy="${y}" r="3" fill="#0D2B45" />`;
      points += `<text x="${x}" y="${H - paddingY + 20}" text-anchor="middle" font-size="10" fill="#64748B" font-family="system-ui">Ano ${i+1}</text>`;
    }
  });

  return `
    <svg viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg">
      <!-- Zero Line -->
      <line x1="${paddingX}" y1="${zeroY}" x2="${W - paddingX}" y2="${zeroY}" stroke="#EF4444" stroke-width="1" stroke-dasharray="4,4" />
      <text x="${paddingX - 5}" y="${zeroY + 4}" text-anchor="end" font-size="10" fill="#EF4444" font-family="system-ui">0 €</text>

      <!-- Max Line -->
      <text x="${paddingX - 5}" y="${paddingY + 4}" text-anchor="end" font-size="10" fill="#10B981" font-family="system-ui">${Math.round(maxVal)} €</text>

      <!-- Min Line -->
      <text x="${paddingX - 5}" y="${H - paddingY + 4}" text-anchor="end" font-size="10" fill="#EF4444" font-family="system-ui">${Math.round(minVal)} €</text>

      <!-- Path -->
      <path d="${d}" fill="none" stroke="#0D2B45" stroke-width="3" stroke-linejoin="round" />
      ${points}
    </svg>
  `;
}
