import { SolarResult } from "@/contexts/SolarContext";
import { RoiResult } from "@/contexts/RoiContext";

export function buildCrossSectionSvg(result: SolarResult): string {
  const W = 600;
  const H = 250;
  
  const h = result.panelHeight;
  const w = result.panelProjectedDepth;
  const gap = result.gap;
  
  // Scale to fit: 2 panels + 1 gap
  const totalW = w * 2 + gap;
  const totalH = h * 1.5;
  const paddingX = 40;
  const paddingY = 40;
  
  const scale = Math.min((W - paddingX * 2) / totalW, (H - paddingY * 2) / totalH);
  
  const baseline = H - paddingY;
  const p1_x = paddingX;
  const p1_y_top = baseline - Math.sin(result.panelAngle * Math.PI / 180) * h * scale;
  const p1_x_top = p1_x + Math.cos(result.panelAngle * Math.PI / 180) * h * scale;
  
  const p2_x = p1_x + (w + gap) * scale;
  const p2_y_top = baseline - Math.sin(result.panelAngle * Math.PI / 180) * h * scale;
  const p2_x_top = p2_x + Math.cos(result.panelAngle * Math.PI / 180) * h * scale;

  return `
    <svg viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="sky" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stop-color="#E1F0FA" />
          <stop offset="100%" stop-color="#FFFFFF" />
        </linearGradient>
      </defs>
      <rect width="${W}" height="${H}" fill="url(#sky)" />
      
      <!-- Ground -->
      <line x1="0" y1="${baseline}" x2="${W}" y2="${baseline}" stroke="#94A3B8" stroke-width="2" />
      <rect x="0" y="${baseline}" width="${W}" height="${H - baseline}" fill="#F1F5F9" />
      
      <!-- Sun Ray -->
      <line x1="${p2_x_top + 100}" y1="${p2_y_top - 100 * Math.tan(result.altitudeAngle * Math.PI / 180)}" x2="${p2_x - gap * scale}" y2="${baseline}" stroke="#F5A623" stroke-width="2" stroke-dasharray="6,4" />
      
      <!-- Panels -->
      <line x1="${p1_x}" y1="${baseline}" x2="${p1_x_top}" y2="${p1_y_top}" stroke="#0D2B45" stroke-width="6" stroke-linecap="round" />
      <line x1="${p2_x}" y1="${baseline}" x2="${p2_x_top}" y2="${p2_y_top}" stroke="#0D2B45" stroke-width="6" stroke-linecap="round" />
      
      <!-- Gap Highlight -->
      <line x1="${p1_x + w * scale}" y1="${baseline}" x2="${p2_x}" y2="${baseline}" stroke="#EF4444" stroke-width="4" />
      
      <!-- Annotations -->
      <text x="${p1_x + w * scale + (gap * scale) / 2}" y="${baseline - 10}" text-anchor="middle" font-size="12" fill="#EF4444" font-family="system-ui">Gap: ${gap.toFixed(2)}m</text>
      <text x="${p1_x + (w * scale) / 2}" y="${baseline + 20}" text-anchor="middle" font-size="12" fill="#0D2B45" font-family="system-ui">Projeção: ${w.toFixed(2)}m</text>
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
