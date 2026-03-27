import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import * as FileSystem from "expo-file-system";
import { Asset } from "expo-asset";
import { Platform } from "react-native";
import type { SolarParams, SolarResults } from "@/context/SolarContext";
import type { RoiParams, RoiResults } from "@/context/RoiContext";
import { ORIENTATIONS, MONTHLY_FACTORS } from "@/context/RoiContext";
import type { ClientData } from "@/context/ClientContext";

const MONTHS_PT = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
const MONTHS_FULL = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
                     "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];

const COMPANY = {
  name: "Pinheiro Instalações Eléctricas e Canalizações Unipessoal Lda",
  address: "Quinta do Chão Grande nº78 Massarocas",
  postal: "3660-409 São Pedro do Sul",
  nif: "506505170",
  phone: "964 119 508",
};

async function getLogoDataUrl(): Promise<string> {
  try {
    const asset = Asset.fromModule(require("@/assets/logo.png"));
    await asset.downloadAsync();
    if (Platform.OS === "web") {
      return asset.uri;
    }
    if (asset.localUri) {
      const b64 = await FileSystem.readAsStringAsync(asset.localUri, {
        encoding: FileSystem.EncodingType.Base64,
      });
      return `data:image/png;base64,${b64}`;
    }
  } catch (_) {}
  return "";
}

function fmt(n: number, dec = 0): string {
  return n.toLocaleString("pt-PT", {
    minimumFractionDigits: dec,
    maximumFractionDigits: dec,
  });
}

function today(): string {
  return new Date().toLocaleDateString("pt-PT", {
    day: "2-digit", month: "long", year: "numeric",
  });
}

function spacingSection(params: SolarParams, results: SolarResults): string {
  const rows = [
    ["Altura do painel (h)", `${params.height} m`],
    ["Largura do painel", `${params.width} m`],
    ["Ângulo de inclinação (β)", `${params.angle}°`],
    ["Latitude / Localização", `${params.latitude}°`],
    ["Nº de fileiras", params.rows || "4"],
    ["Nº de colunas", params.cols || "5"],
  ];
  const res = [
    ["Distância início→início (d)", `${results.rowSpacing.toFixed(2)} m`, "main"],
    ["Espaço livre entre fileiras", `${results.gap.toFixed(2)} m`, "highlight"],
    ["Profundidade projetada do painel", `${results.panelProjectedDepth.toFixed(2)} m`, ""],
    ["Comprimento total do array", `${results.totalLength.toFixed(2)} m`, ""],
    ["Largura total do array", `${results.totalWidth.toFixed(2)} m`, ""],
    ["Ângulo solar (21 Dez)", `${results.altitudeAngle.toFixed(1)}°`, ""],
    ["Declinação solar (21 Dez)", `${results.declinationAngle.toFixed(1)}°`, ""],
  ];

  return `
    <div class="section">
      <div class="section-header">
        <div class="section-icon">📐</div>
        <div>
          <div class="section-title">Dimensionamento — Distâncias entre Painéis</div>
          <div class="section-sub">Solstício de inverno (21 de Dezembro) · Sol mais baixo do ano</div>
        </div>
      </div>

      <div class="two-col">
        <div>
          <div class="sub-title">Parâmetros de entrada</div>
          <table class="data-table">
            ${rows.map(([k, v]) => `<tr><td class="td-key">${k}</td><td class="td-val">${v}</td></tr>`).join("")}
          </table>
        </div>
        <div>
          <div class="sub-title">Resultados do cálculo</div>
          <table class="data-table">
            ${res.map(([k, v, cls]) => `
              <tr class="${cls === "main" ? "row-main" : cls === "highlight" ? "row-highlight" : ""}">
                <td class="td-key">${k}</td>
                <td class="td-val ${cls === "main" ? "val-main" : cls === "highlight" ? "val-highlight" : ""}">${v}</td>
              </tr>`).join("")}
          </table>
        </div>
      </div>

      <div class="formula-box">
        <strong>Fórmula utilizada:</strong>
        d = h·cos(β) + h·sin(β)/tan(α) &nbsp;|&nbsp;
        α = 90° − |lat| + δ &nbsp;|&nbsp; δ = −23,45° (21 Dez)
      </div>
    </div>`;
}

function roiSection(params: RoiParams, results: RoiResults, hasBattery: boolean, orientation: string): string {
  const orientLabel = ORIENTATIONS.find((o) => o.label === orientation)?.full ?? orientation;
  const sys = [
    ["Potência total do sistema", `${results.totalPowerKwp.toFixed(2)} kWp`],
    ["Potência por painel", `${params.panelPower} Wp`],
    ["Número de painéis", params.numPanels],
    ["Orientação", `${orientation} — ${orientLabel}`],
    ["Ângulo de inclinação", `${params.inclination}°`],
    ["Potência do inversor", params.inverterPower ? `${params.inverterPower} kW` : "—"],
    ["Armazenamento em baterias", hasBattery ? `Sim (${params.batteryCapacity || "—"} kWh)` : "Não"],
    ["Consumo anual (ano anterior)", params.annualConsumption ? `${fmt(parseFloat(params.annualConsumption))} kWh` : "—"],
  ];
  const fin = [
    ["Investimento total", `${fmt(parseFloat(params.investmentCost))} €`, ""],
    ["Produção anual estimada", `${fmt(results.annualProductionKwh)} kWh`, ""],
    ["Autoconsumo anual", `${fmt(results.selfKwh)} kWh (${Math.round(results.selfRate * 100)}% da produção)`, ""],
    ["Injeção na rede", `${fmt(results.exportKwh)} kWh`, ""],
    ...(results.consumptionCoveredPct !== null
      ? [["Consumo coberto pelo solar", `${Math.round(results.consumptionCoveredPct)}%`, ""]]
      : []),
    ["Poupança anual estimada", `${fmt(results.annualSavingsEur)} €/ano`, "main"],
    ["Poupança mensal estimada", `${fmt(results.annualSavingsEur / 12)} €/mês`, ""],
    ["Retorno do capital (payback)", results.paybackYears > 50 ? "> 50 anos" : `${results.paybackYears.toFixed(1)} anos`, "main"],
    ["Retorno líquido a 20 anos", `${results.netAfter20 >= 0 ? "+" : ""}${fmt(results.netAfter20)} €`, results.netAfter20 >= 0 ? "highlight" : ""],
    ["Retorno líquido a 25 anos", `${results.netAfter25 >= 0 ? "+" : ""}${fmt(results.netAfter25)} €`, results.netAfter25 >= 0 ? "highlight" : ""],
  ];

  // Monthly table
  const monthRows = results.monthlyKwh.map((v, i) => {
    const eur = v * (parseFloat(params.electricityPrice) || 0.22);
    return `<tr>
      <td>${MONTHS_FULL[i]}</td>
      <td class="td-right">${fmt(v)} kWh</td>
      <td class="td-right">${fmt(eur, 2)} €</td>
    </tr>`;
  }).join("");

  // ROI bar chart (simple CSS bars)
  const maxMonthly = Math.max(...results.monthlyKwh);
  const bars = results.monthlyKwh.map((v, i) => {
    const pct = Math.round((v / maxMonthly) * 100);
    return `<div class="bar-item">
      <div class="bar-wrap"><div class="bar-fill" style="height:${pct}%"></div></div>
      <div class="bar-label">${MONTHS_PT[i]}</div>
    </div>`;
  }).join("");

  // 25-year table (every 5 years)
  const years25 = [1, 2, 3, 5, 7, 10, 12, 15, 20, 25].map((y) => {
    const net = results.cumulativeNet[y - 1];
    return `<tr class="${net >= 0 ? "row-highlight" : ""}">
      <td>Ano ${y}</td>
      <td class="td-right">${net >= 0 ? "+" : ""}${fmt(net)} €</td>
      <td class="td-right">${net >= 0 ? "✅ Lucro" : "⏳ Em recuperação"}</td>
    </tr>`;
  }).join("");

  return `
    <div class="section">
      <div class="section-header">
        <div class="section-icon">💶</div>
        <div>
          <div class="section-title">Estudo de Retorno de Investimento (ROI)</div>
          <div class="section-sub">Base: 1550 kWh/kWp/ano · Degradação 0,5%/ano · Aumento preço energia 3%/ano</div>
        </div>
      </div>

      <div class="two-col">
        <div>
          <div class="sub-title">Sistema fotovoltaico</div>
          <table class="data-table">
            ${sys.map(([k, v]) => `<tr><td class="td-key">${k}</td><td class="td-val">${v}</td></tr>`).join("")}
          </table>
        </div>
        <div>
          <div class="sub-title">Análise financeira</div>
          <table class="data-table">
            ${fin.map(([k, v, cls]) => `
              <tr class="${cls === "main" ? "row-main" : cls === "highlight" ? "row-highlight" : ""}">
                <td class="td-key">${k}</td>
                <td class="td-val ${cls === "main" ? "val-main" : cls === "highlight" ? "val-highlight" : ""}">${v}</td>
              </tr>`).join("")}
          </table>
        </div>
      </div>

      <div class="sub-title" style="margin-top:20px">Produção mensal estimada</div>
      <div class="bar-chart">${bars}</div>

      <div class="two-col" style="margin-top:20px">
        <div>
          <div class="sub-title">Detalhe mensal (produção e poupança)</div>
          <table class="data-table">
            <tr><th>Mês</th><th class="td-right">Produção</th><th class="td-right">Poupança est.</th></tr>
            ${monthRows}
          </table>
        </div>
        <div>
          <div class="sub-title">Projecção de retorno acumulado</div>
          <table class="data-table">
            <tr><th>Horizonte</th><th class="td-right">Retorno líquido</th><th class="td-right">Estado</th></tr>
            ${years25}
          </table>
        </div>
      </div>

      <div class="formula-box">
        <strong>Notas:</strong> Valores estimativos. Produção base: 1550 kWh/kWp/ano (Portugal, óptima).
        Autoconsumo calculado com base no perfil de carga e capacidade de armazenamento.
        Consulte um instalador certificado para análise definitiva.
      </div>
    </div>`;
}

function buildHtml(
  logoUrl: string,
  client: ClientData,
  solarParams: SolarParams | null,
  solarResults: SolarResults | null,
  roiParams: RoiParams | null,
  roiResults: RoiResults | null,
  roiHasBattery: boolean,
  roiOrientation: string
): string {
  const hasSpacing = solarResults !== null && solarParams !== null;
  const hasRoi = roiResults !== null && roiParams !== null;

  return `<!DOCTYPE html>
<html lang="pt">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>Relatório FotoCalc — ${client.name || "Cliente"}</title>
  <style>
    * { margin:0; padding:0; box-sizing:border-box; }
    body { font-family: 'Arial', sans-serif; font-size: 11pt; color: #1a2a3a; background:#fff; }

    /* Header */
    .company-header {
      background: #0D2B45;
      color: #fff;
      padding: 20px 28px;
      display: flex;
      align-items: center;
      gap: 18px;
      page-break-inside: avoid;
    }
    .company-logo { width: 72px; height: 72px; object-fit: contain; background: transparent; }
    .company-name { font-size: 15pt; font-weight: bold; margin-bottom: 4px; }
    .company-detail { font-size: 9pt; color: rgba(255,255,255,0.8); margin-top: 2px; }
    .header-right { margin-left: auto; text-align: right; }
    .report-title { font-size: 18pt; font-weight: bold; color: #F5A623; }
    .report-date { font-size: 9pt; color: rgba(255,255,255,0.7); margin-top: 4px; }

    /* Client block */
    .client-block {
      background: #F7F9FC;
      border: 1px solid #D1DCE8;
      border-radius: 8px;
      padding: 16px 20px;
      margin: 18px 28px;
      display: flex;
      gap: 32px;
    }
    .client-label { font-size: 8pt; text-transform: uppercase; letter-spacing: 0.5px; color: #4A6072; margin-bottom: 4px; font-weight: bold; }
    .client-value { font-size: 12pt; font-weight: bold; color: #0D2B45; }
    .client-sub { font-size: 10pt; color: #4A6072; margin-top: 2px; }

    /* Section */
    .section { margin: 0 28px 24px; page-break-inside: avoid; }
    .section-header { display: flex; align-items: flex-start; gap: 12px; margin-bottom: 14px; border-bottom: 2px solid #0D2B45; padding-bottom: 8px; }
    .section-icon { font-size: 18pt; }
    .section-title { font-size: 13pt; font-weight: bold; color: #0D2B45; }
    .section-sub { font-size: 8.5pt; color: #4A6072; margin-top: 2px; }
    .sub-title { font-size: 10pt; font-weight: bold; color: #0D2B45; margin-bottom: 8px; }

    /* Layout */
    .two-col { display: flex; gap: 20px; }
    .two-col > div { flex: 1; }

    /* Table */
    .data-table { width: 100%; border-collapse: collapse; font-size: 9.5pt; }
    .data-table th { background: #0D2B45; color: #fff; padding: 6px 8px; text-align: left; font-size: 9pt; }
    .data-table th.td-right { text-align: right; }
    .data-table td { padding: 5px 8px; border-bottom: 1px solid #EDF2F7; }
    .td-key { color: #4A6072; width: 60%; }
    .td-val { font-weight: bold; color: #0D2B45; text-align: right; }
    .td-right { text-align: right; }
    .row-main { background: #EBF4FF; }
    .row-main td { color: #0D2B45; font-weight: bold; }
    .row-highlight { background: #F0FFF4; }
    .val-main { color: #1E88E5; font-size: 11pt; }
    .val-highlight { color: #22C55E; font-size: 11pt; }

    /* Bar chart */
    .bar-chart { display: flex; align-items: flex-end; gap: 4px; height: 80px; padding: 0 4px; margin: 8px 0 4px; border-bottom: 1px solid #D1DCE8; }
    .bar-item { flex: 1; display: flex; flex-direction: column; align-items: center; height: 100%; }
    .bar-wrap { flex: 1; width: 100%; display: flex; align-items: flex-end; }
    .bar-fill { width: 100%; background: linear-gradient(to top, #0D52A0, #1E88E5); border-radius: 2px 2px 0 0; min-height: 2px; }
    .bar-label { font-size: 7pt; color: #4A6072; margin-top: 2px; }

    /* Formula box */
    .formula-box {
      background: #FFF8E7;
      border: 1px solid #F5A623;
      border-radius: 6px;
      padding: 10px 14px;
      margin-top: 14px;
      font-size: 9pt;
      color: #5a3e00;
    }

    /* Footer */
    .footer {
      border-top: 1px solid #D1DCE8;
      margin: 20px 28px 0;
      padding-top: 10px;
      font-size: 8pt;
      color: #8CA0B0;
      display: flex;
      justify-content: space-between;
    }

    @media print {
      .section { page-break-inside: avoid; }
    }
  </style>
</head>
<body>

  <!-- Company header -->
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

  <!-- Client info -->
  <div class="client-block">
    <div>
      <div class="client-label">Cliente</div>
      <div class="client-value">${client.name || "—"}</div>
      ${client.address ? `<div class="client-sub">${client.address}</div>` : ""}
    </div>
    ${client.nif ? `<div><div class="client-label">NIF</div><div class="client-value">${client.nif}</div></div>` : ""}
    ${client.phone ? `<div><div class="client-label">Contacto</div><div class="client-value">${client.phone}</div></div>` : ""}
    ${client.email ? `<div><div class="client-label">E-mail</div><div class="client-value">${client.email}</div></div>` : ""}
  </div>

  <!-- Spacing study -->
  ${hasSpacing ? spacingSection(solarParams!, solarResults!) : `
    <div class="section">
      <div class="section-header">
        <div class="section-icon">📐</div>
        <div><div class="section-title">Dimensionamento</div></div>
      </div>
      <p style="color:#8CA0B0;font-style:italic">Sem dados de dimensionamento — realize o cálculo no separador "Calcular".</p>
    </div>`}

  <!-- ROI study -->
  ${hasRoi ? roiSection(roiParams!, roiResults!, roiHasBattery, roiOrientation) : `
    <div class="section">
      <div class="section-header">
        <div class="section-icon">💶</div>
        <div><div class="section-title">Estudo de Retorno de Investimento</div></div>
      </div>
      <p style="color:#8CA0B0;font-style:italic">Sem dados de ROI — realize o cálculo no separador "Retorno".</p>
    </div>`}

  <!-- Footer -->
  <div class="footer">
    <span>${COMPANY.name} · NIF ${COMPANY.nif}</span>
    <span>FotoCalc — Relatório gerado em ${today()}</span>
  </div>

</body>
</html>`;
}

// ─── Public API ───────────────────────────────────────────────────────────────
export interface GeneratePdfOptions {
  client: ClientData;
  solarParams: SolarParams | null;
  solarResults: SolarResults | null;
  roiParams: RoiParams | null;
  roiResults: RoiResults | null;
  roiHasBattery: boolean;
  roiOrientation: string;
}

export async function generateAndSharePdf(opts: GeneratePdfOptions): Promise<void> {
  const logoUrl = await getLogoDataUrl();

  const html = buildHtml(
    logoUrl,
    opts.client,
    opts.solarParams,
    opts.solarResults,
    opts.roiParams,
    opts.roiResults,
    opts.roiHasBattery,
    opts.roiOrientation
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
