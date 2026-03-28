import React, { useRef, useState, useCallback, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  Platform,
  TouchableOpacity,
  ScrollView,
} from "react-native";
import WebMap, { WebMapRef } from "@/components/WebMap";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { MaterialCommunityIcons, Feather } from "@expo/vector-icons";
import Colors from "@/constants/colors";
import { useSolar } from "@/context/SolarContext";
import { useMapaContext } from "@/context/MapaContext";
import { LogoMini } from "@/components/LogoMini";

/* ─── Utilitários de orientação ────────────────────────────────── */
function azLabel(az: number): string {
  if (az >= 337.5 || az < 22.5) return "N";
  if (az < 67.5) return "NE";
  if (az < 112.5) return "E";
  if (az < 157.5) return "SE";
  if (az < 202.5) return "S";
  if (az < 247.5) return "SO";
  if (az < 292.5) return "O";
  return "NO";
}

/**
 * Fator de orientação baseado em dados PVGIS para Portugal (~39°N, inclinação ~30°).
 * Interpolação linear entre pontos de referência PVGIS Lisboa:
 *   Sul (0° desvio) = 100%  |  SE/SO (45°) = 95%
 *   E/O  (90°)      =  80%  |  NE/NO (135°) = 63%
 *   Norte (180°)    =  56%
 */
function orientationFactor(az: number): number {
  const dev = Math.min(Math.abs(az - 180), 360 - Math.abs(az - 180));
  const pts: [number, number][] = [
    [0, 1.00],
    [45, 0.95],
    [90, 0.80],
    [135, 0.63],
    [180, 0.56],
  ];
  for (let i = 0; i < pts.length - 1; i++) {
    const [d0, f0] = pts[i];
    const [d1, f1] = pts[i + 1];
    if (dev <= d1) return f0 + (f1 - f0) * ((dev - d0) / (d1 - d0));
  }
  return 0.56;
}

/* ─── HTML do mapa Leaflet (com rotação de painéis) ────────────── */
const MAP_HTML = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no">
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/>
<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/leaflet.draw/1.0.4/leaflet.draw.css"/>
<style>
* { box-sizing: border-box; margin: 0; padding: 0; }
html, body { height: 100%; overflow: hidden; background: #0D2B45; }
#map { width: 100%; height: 100%; }
.info-bar {
  position: absolute; bottom: 8px; left: 50%; transform: translateX(-50%);
  background: rgba(13,43,69,0.9); color: #fff; padding: 6px 14px;
  border-radius: 16px; font-family: -apple-system,sans-serif; font-size: 12px;
  z-index: 1000; pointer-events: none; white-space: nowrap; max-width: 92%;
  border: 1px solid rgba(245,166,35,0.5);
}
.leaflet-draw-toolbar a { background-color: #0D2B45 !important; }
.leaflet-draw-toolbar a:hover { background-color: #1a3d5c !important; }
.nudge-pad {
  position: absolute; bottom: 48px; left: 8px; z-index: 1001;
  display: grid; grid-template-columns: repeat(3, 30px); grid-template-rows: repeat(3, 30px);
  gap: 2px;
}
.nudge-btn {
  background: rgba(13,43,69,0.88); color: #F5A623; border: 1px solid rgba(245,166,35,0.5);
  border-radius: 6px; font-size: 14px; cursor: pointer; display: flex;
  align-items: center; justify-content: center; width: 30px; height: 30px;
  font-family: -apple-system, sans-serif; user-select: none; -webkit-user-select: none;
  touch-action: manipulation;
}
.nudge-btn:active { background: rgba(30,136,229,0.7); }
.nudge-reset { font-size: 11px; color: #fff; }
#compassBox {
  position: absolute; right: 8px; bottom: 90px; z-index: 1001;
  text-align: center; pointer-events: none;
}
#compassLabel {
  background: rgba(13,43,69,0.93); color: #F5A623;
  font-size: 9px; font-family: -apple-system,sans-serif;
  border-radius: 5px; padding: 2px 7px; margin-top: 2px;
  border: 1px solid rgba(245,166,35,0.45); white-space: nowrap;
}
</style>
</head>
<body>
<div id="map"></div>
<div id="info" class="info-bar">📐 Desenhe a área do telhado</div>

<!-- ── Bússola / orientação Sul ── -->
<div id="compassBox">
  <svg width="58" height="58" viewBox="0 0 58 58" xmlns="http://www.w3.org/2000/svg">
    <circle cx="29" cy="29" r="27" fill="rgba(13,43,69,0.93)" stroke="rgba(245,166,35,0.55)" stroke-width="1.5"/>
    <!-- ticks cardeais -->
    <line x1="29" y1="4"  x2="29" y2="9"  stroke="rgba(255,255,255,0.3)" stroke-width="1"/>
    <line x1="29" y1="49" x2="29" y2="54" stroke="rgba(255,255,255,0.3)" stroke-width="1"/>
    <line x1="4"  y1="29" x2="9"  y2="29" stroke="rgba(255,255,255,0.3)" stroke-width="1"/>
    <line x1="49" y1="29" x2="54" y2="29" stroke="rgba(255,255,255,0.3)" stroke-width="1"/>
    <!-- labels cardeais fixos -->
    <text x="29" y="17" text-anchor="middle" fill="rgba(255,255,255,0.55)" font-size="8" font-family="-apple-system,sans-serif">N</text>
    <text x="29" y="51" text-anchor="middle" fill="#F5A623" font-size="8" font-weight="bold" font-family="-apple-system,sans-serif">S</text>
    <text x="10" y="33" text-anchor="middle" fill="rgba(255,255,255,0.4)" font-size="7" font-family="-apple-system,sans-serif">O</text>
    <text x="48" y="33" text-anchor="middle" fill="rgba(255,255,255,0.4)" font-size="7" font-family="-apple-system,sans-serif">E</text>
    <!-- seta da orientação dos painéis (roda com azimute) -->
    <g id="compassArrow" transform="rotate(180,29,29)">
      <polygon points="29,7 33,22 29,17 25,22" fill="#F5A623"/>
      <line x1="29" y1="17" x2="29" y2="49" stroke="#F5A623" stroke-width="1.2" stroke-dasharray="3,3" opacity="0.5"/>
    </g>
    <circle cx="29" cy="29" r="2.5" fill="#F5A623"/>
  </svg>
  <div id="compassLabel">Sul · ideal</div>
</div>

<div class="nudge-pad" id="nudgePad" style="display:none">
  <div></div>
  <button class="nudge-btn" ontouchstart="nudge(0,-0.5)" onclick="nudge(0,-0.5)">▲</button>
  <div></div>
  <button class="nudge-btn" ontouchstart="nudge(-0.5,0)" onclick="nudge(-0.5,0)">◄</button>
  <button class="nudge-btn nudge-reset" ontouchstart="nudge(0,0,true)" onclick="nudge(0,0,true)">⌂</button>
  <button class="nudge-btn" ontouchstart="nudge(0.5,0)" onclick="nudge(0.5,0)">►</button>
  <div></div>
  <button class="nudge-btn" ontouchstart="nudge(0,0.5)" onclick="nudge(0,0.5)">▼</button>
  <div></div>
</div>

<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/leaflet.draw/1.0.4/leaflet.draw.js"></script>
<script>
var map = L.map('map', { center: [39.6, -8.0], zoom: 7, zoomControl: true });

L.tileLayer(
  'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
  { attribution: '© Esri', maxZoom: 21, maxNativeZoom: 19 }
).addTo(map);

L.tileLayer(
  'https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}',
  { attribution: '', maxZoom: 21, maxNativeZoom: 19, opacity: 0.6 }
).addTo(map);

var drawnItems = new L.FeatureGroup().addTo(map);
var panelLayer = new L.FeatureGroup().addTo(map);

var drawControl = new L.Control.Draw({
  position: 'topright',
  draw: {
    rectangle: { shapeOptions: { color: '#F5A623', weight: 2, fillColor: '#F5A623', fillOpacity: 0.12 } },
    polygon: { shapeOptions: { color: '#F5A623', weight: 2, fillColor: '#F5A623', fillOpacity: 0.12 }, allowIntersection: false },
    polyline: false, circle: false, circlemarker: false, marker: false,
  },
  edit: { featureGroup: drawnItems, remove: true },
});
map.addControl(drawControl);

var CFG = { panelW: 1.0, panelH: 2.0, rowSpacing: 0.5, colSpacing: 0.05, azimuth: 180, manualCount: 0, offsetX: 0, offsetY: 0 };
var currentLayer = null;

/* ── Bússola ── */
function azLabel(az) {
  if (az >= 337.5 || az < 22.5) return 'N';
  if (az < 67.5) return 'NE';
  if (az < 112.5) return 'E';
  if (az < 157.5) return 'SE';
  if (az < 202.5) return 'S';
  if (az < 247.5) return 'SO';
  if (az < 292.5) return 'O';
  return 'NO';
}

function updateCompass() {
  var az = CFG.azimuth;
  var arrow = document.getElementById('compassArrow');
  if (arrow) arrow.setAttribute('transform', 'rotate(' + az + ',29,29)');
  var label = document.getElementById('compassLabel');
  if (label) {
    var dev = Math.round(Math.abs(az - 180));
    var dir = azLabel(az);
    label.textContent = dev === 0 ? 'Sul \u00b7 ideal' : dir + ' \u00b7 ' + dev + '\u00b0 de Sul';
  }
}

function nudge(dx, dy, reset) {
  if (reset) { CFG.offsetX = 0; CFG.offsetY = 0; }
  else { CFG.offsetX += dx; CFG.offsetY += dy; }
  if (currentLayer) onLayerChange(currentLayer);
}

function sendRN(obj) {
  var s = JSON.stringify(obj);
  try { window.ReactNativeWebView.postMessage(s); } catch(e) {
    try { window.parent.postMessage(s, '*'); } catch(e2) {}
  }
}

/* ── Gera SVG da disposição real dos painéis (coordenadas lat/lng → SVG) ── */
function capturePanelSvg() {
  var panels = [];
  panelLayer.eachLayer(function(layer) {
    if (!layer.getLatLngs) return;
    var ll = layer.getLatLngs();
    var ring = Array.isArray(ll[0]) ? ll[0] : ll;
    panels.push(ring.map(function(p) { return [p.lat, p.lng]; }));
  });
  if (panels.length === 0) return '';

  var roofRing = [];
  drawnItems.eachLayer(function(layer) {
    if (!layer.getLatLngs) return;
    var ll = layer.getLatLngs();
    roofRing = (Array.isArray(ll[0]) ? ll[0] : ll).map(function(p) { return [p.lat, p.lng]; });
  });

  /* caixa delimitadora de todos os pontos */
  var allLats = [], allLngs = [];
  panels.forEach(function(p) { p.forEach(function(pt) { allLats.push(pt[0]); allLngs.push(pt[1]); }); });
  roofRing.forEach(function(pt) { allLats.push(pt[0]); allLngs.push(pt[1]); });
  var minLat = Math.min.apply(null, allLats), maxLat = Math.max.apply(null, allLats);
  var minLng = Math.min.apply(null, allLngs), maxLng = Math.max.apply(null, allLngs);
  var latR = (maxLat - minLat) || 1e-5;
  var lngR = (maxLng - minLng) || 1e-5;
  var midLat = (minLat + maxLat) / 2;
  var lngScale = Math.cos(midLat * Math.PI / 180); /* correcção Mercator */

  var W = 500, H = 220, PAD = 20;
  var geoW = lngR * lngScale, geoH = latR;
  var sc = Math.min((W - 2*PAD) / geoW, (H - 2*PAD) / geoH);
  var ox = (W - geoW * sc) / 2, oy = (H - geoH * sc) / 2;
  function sx(lng) { return (ox + (lng - minLng) * lngScale * sc).toFixed(2); }
  function sy(lat) { return (oy + (maxLat - lat) * sc).toFixed(2); } /* Y invertido: Norte=cima */

  /* contorno do telhado */
  var roofSvg = '';
  if (roofRing.length > 0) {
    var rPts = roofRing.map(function(pt) { return sx(pt[1]) + ',' + sy(pt[0]); }).join(' ');
    roofSvg = '<polygon points="' + rPts + '" fill="rgba(100,140,180,0.15)" stroke="#8CA0B0" stroke-width="1.2" stroke-dasharray="4,2"/>';
  }

  /* painéis */
  var panelsSvg = panels.map(function(p) {
    var pts = p.map(function(pt) { return sx(pt[1]) + ',' + sy(pt[0]); }).join(' ');
    return '<polygon points="' + pts + '" fill="#2B6CB0" stroke="#1E88E5" stroke-width="0.5"/>';
  }).join('');

  /* bússola no canto inferior-direito */
  var cpX = W - 28, cpY = H - 28, cr = 18;
  var a = CFG.azimuth * Math.PI / 180;
  var tipX = (cpX + Math.sin(a) * (cr - 3)).toFixed(1);
  var tipY = (cpY - Math.cos(a) * (cr - 3)).toFixed(1);
  var wa = 0.45, wb = 7;
  var b1x = (cpX + Math.sin(a + Math.PI - wa) * wb).toFixed(1);
  var b1y = (cpY - Math.cos(a + Math.PI - wa) * wb).toFixed(1);
  var b2x = (cpX + Math.sin(a + Math.PI + wa) * wb).toFixed(1);
  var b2y = (cpY - Math.cos(a + Math.PI + wa) * wb).toFixed(1);
  var devNum = Math.round(Math.abs(CFG.azimuth - 180));
  var devStr = devNum === 0 ? 'Sul' : azLabel(CFG.azimuth) + ' ' + devNum + '\u00b0';
  var compassSvg =
    '<circle cx="' + cpX + '" cy="' + cpY + '" r="' + cr + '" fill="rgba(13,43,69,0.93)" stroke="rgba(245,166,35,0.5)" stroke-width="1.2"/>'
    + '<text x="' + cpX + '" y="' + (cpY - cr + 9) + '" text-anchor="middle" fill="rgba(255,255,255,0.55)" font-size="7" font-family="Arial,sans-serif">N</text>'
    + '<text x="' + cpX + '" y="' + (cpY + cr - 2) + '" text-anchor="middle" fill="#F5A623" font-size="7" font-weight="bold" font-family="Arial,sans-serif">S</text>'
    + '<text x="' + (cpX - cr + 5) + '" y="' + (cpY + 3) + '" text-anchor="middle" fill="rgba(255,255,255,0.4)" font-size="6" font-family="Arial,sans-serif">O</text>'
    + '<text x="' + (cpX + cr - 5) + '" y="' + (cpY + 3) + '" text-anchor="middle" fill="rgba(255,255,255,0.4)" font-size="6" font-family="Arial,sans-serif">E</text>'
    + '<polygon points="' + tipX + ',' + tipY + ' ' + b1x + ',' + b1y + ' ' + b2x + ',' + b2y + '" fill="#F5A623"/>'
    + '<circle cx="' + cpX + '" cy="' + cpY + '" r="2" fill="#F5A623"/>';

  /* etiqueta de orientação */
  var labelSvg = '<text x="' + (W/2) + '" y="' + (H - 5) + '" text-anchor="middle" fill="rgba(255,255,255,0.5)" font-size="8" font-family="Arial,sans-serif">'
    + panels.length + ' pain\u00e9is \u00b7 ' + devStr + '\u00b7 ' + CFG.panelW.toFixed(2) + '\u00d7' + CFG.panelH.toFixed(2) + ' m'
    + '</text>';

  return '<svg width="' + W + '" height="' + H + '" xmlns="http://www.w3.org/2000/svg">'
    + '<rect width="' + W + '" height="' + H + '" fill="#0D2B45" rx="6"/>'
    + roofSvg + panelsSvg + compassSvg + labelSvg
    + '</svg>';
}

/* ── Geometria ── */
function rotXY(x, y, deg) {
  var r = deg * Math.PI / 180;
  return [ x * Math.cos(r) - y * Math.sin(r), x * Math.sin(r) + y * Math.cos(r) ];
}
function toLatlng(nx, ny, cLat, cLng) {
  return [ cLat + ny / 110574, cLng + nx / (111320 * Math.cos(cLat * Math.PI / 180)) ];
}

/* ── Desenha grelha de painéis rotacionada ── */
function drawPanels(layer) {
  panelLayer.clearLayers();
  var bounds = layer.getBounds ? layer.getBounds() : null;
  if (!bounds) return { drawn: 0, capacity: 0 };

  var center = bounds.getCenter();
  var cLat = center.lat, cLng = center.lng;
  var nw = bounds.getNorthWest();
  var halfW = nw.distanceTo(bounds.getNorthEast()) / 2;
  var halfH = nw.distanceTo(bounds.getSouthWest()) / 2;
  var R = Math.sqrt(halfW * halfW + halfH * halfH) + Math.max(CFG.panelW, CFG.panelH);

  var rotDeg = CFG.azimuth - 180;
  var stepX = CFG.panelW + CFG.colSpacing;
  var stepY = CFG.panelH + CFG.rowSpacing;

  /* limite: se manual > 0 usa-o; senão limita a 500 por performance */
  var limit = CFG.manualCount > 0 ? CFG.manualCount : 500;
  var drawn = 0, capacity = 0, done = false;

  for (var y = -R; y < R && !done; y += stepY) {
    for (var x = -R; x < R && !done; x += stepX) {
      /* 4 cantos do painel no referencial local, com offset de posicionamento */
      var px = x + CFG.offsetX;
      var py = y + CFG.offsetY;
      var corners = [
        [px,                py               ],
        [px + CFG.panelW,   py               ],
        [px + CFG.panelW,   py + CFG.panelH  ],
        [px,                py + CFG.panelH  ]
      ];
      /* Rodar e converter para lat/lng */
      var latlngs = corners.map(function(c) {
        var r = rotXY(c[0], -c[1], rotDeg);
        return toLatlng(r[0], r[1], cLat, cLng);
      });
      /* ← CORRECÇÃO: todos os 4 cantos têm de estar dentro da área */
      var allInside = latlngs.every(function(pt) { return bounds.contains(pt); });
      if (!allInside) continue;

      capacity++; /* quantos cabem na área */
      if (drawn < limit) {
        L.polygon(latlngs, {
          color: '#1E88E5', weight: 0.8, fillColor: '#2B6CB0', fillOpacity: 0.78,
        }).addTo(panelLayer);
        drawn++;
        /* ← CORRECÇÃO: parar ao atingir o número manual */
        if (CFG.manualCount > 0 && drawn >= CFG.manualCount) done = true;
      }
    }
  }
  return { drawn: drawn, capacity: capacity };
}

function onLayerChange(layer) {
  var bounds = layer.getBounds ? layer.getBounds() : null;
  if (!bounds) return;
  var latlngs = layer.getLatLngs ? layer.getLatLngs() : null;
  var area = 0;
  if (latlngs) {
    var flat = Array.isArray(latlngs[0]) ? latlngs[0] : latlngs;
    try { area = L.GeometryUtil.geodesicArea(flat); } catch(e) {}
  }
  var nw = bounds.getNorthWest();
  var boundsW = Math.round(nw.distanceTo(bounds.getNorthEast()));
  var boundsH = Math.round(nw.distanceTo(bounds.getSouthWest()));
  if (!area || area < 1) {
    area = boundsW * boundsH;
  }
  var res = drawPanels(layer);
  var devTxt = (function() {
    var dev = Math.round(Math.abs(CFG.azimuth - 180));
    var dir = azLabel(CFG.azimuth);
    return dev === 0 ? '| Sul (ideal)' : '| ' + dir + ' \u00b7 ' + dev + '\u00b0 de Sul';
  })();
  var label = res.drawn === res.capacity
    ? 'Painéis: ' + res.drawn
    : 'Painéis: ' + res.drawn + ' (cap. ' + res.capacity + ')';
  document.getElementById('info').textContent = 'Área: ' + area.toFixed(0) + ' m\u00B2  |  ' + label + '  ' + devTxt;
  var svg = capturePanelSvg();
  sendRN({ type: 'roofMeasured', area: Math.round(area), panelCount: res.drawn, capacity: res.capacity, boundsW: boundsW, boundsH: boundsH, panelSvg: svg });
}

map.on('draw:created', function(e) {
  drawnItems.clearLayers();
  drawnItems.addLayer(e.layer);
  currentLayer = e.layer;
  document.getElementById('nudgePad').style.display = 'grid';
  onLayerChange(e.layer);
});
map.on('draw:edited', function(e) {
  e.layers.eachLayer(function(l) { currentLayer = l; onLayerChange(l); });
});
map.on('draw:deleted', function() {
  panelLayer.clearLayers();
  currentLayer = null;
  document.getElementById('nudgePad').style.display = 'none';
  document.getElementById('info').textContent = '📐 Desenhe a área do telhado';
  sendRN({ type: 'cleared' });
});

function handleMsg(e) {
  try {
    var d = typeof e.data === 'string' ? JSON.parse(e.data) : e.data;
    if (!d || !d.type) return;
    if (d.type === 'config') {
      if (d.panelW > 0) CFG.panelW = d.panelW;
      if (d.panelH > 0) CFG.panelH = d.panelH;
      if (d.rowSpacing >= 0) CFG.rowSpacing = d.rowSpacing;
      if (d.colSpacing >= 0) CFG.colSpacing = d.colSpacing;
      if (d.azimuth !== undefined) { CFG.azimuth = d.azimuth; updateCompass(); }
      if (d.manualCount !== undefined) CFG.manualCount = d.manualCount;
      drawnItems.eachLayer(function(l) { onLayerChange(l); });
    }
    if (d.type === 'flyTo') { map.flyTo([d.lat, d.lng], d.zoom || 19, { duration: 1.5 }); }
  } catch(err) {}
}
document.addEventListener('message', handleMsg);
window.addEventListener('message', handleMsg);
setTimeout(function() { updateCompass(); sendRN({ type: 'ready' }); }, 600);
</script>
</body>
</html>`;

/* ─── Componente ───────────────────────────────────────────────── */
export default function MapaScreen() {
  const insets = useSafeAreaInsets();
  const { params, results } = useSolar();
  const { setMapaData } = useMapaContext();
  const webRef = useRef<WebMapRef>(null);

  /* Config dos painéis — pré-preenchida com valores do calculador */
  const [panelW, setPanelW] = useState(
    String(parseFloat(params.width) || 1.13)
  );
  const [panelH, setPanelH] = useState(
    String(parseFloat(params.height) || 2.28)
  );
  const [panelPower, setPanelPower] = useState("400");
  const [azimuth, setAzimuth] = useState(180);
  const [manualCount, setManualCount] = useState(""); // vazio = automático

  /* Resultados da área desenhada */
  const [area, setArea] = useState<number | null>(null);
  const [panels, setPanels] = useState<number | null>(null);   // desenhados no mapa
  const [capacity, setCapacity] = useState<number | null>(null); // máx que cabem

  const topInset = Platform.OS === "web" ? 67 : insets.top;
  const bottomInset = Platform.OS === "web" ? 84 : insets.bottom + 80;

  /* ── Derivados ── */
  const factor = orientationFactor(azimuth);
  const penaltyPct = Math.round((1 - factor) * 100);
  const powerWp = parseFloat(panelPower) || 400;
  const isManual = manualCount.trim() !== "" && parseInt(manualCount) > 0;
  /* O WebView já respeitou o manualCount — panels = painéis desenhados */
  const effectivePanels = panels; // fonte de verdade = WebView
  const overflowWarning = isManual && capacity !== null && parseInt(manualCount) > capacity;
  const totalKwp = effectivePanels
    ? ((effectivePanels * powerWp) / 1000).toFixed(2)
    : null;
  const adjKwp = effectivePanels
    ? ((effectivePanels * powerWp * factor) / 1000).toFixed(2)
    : null;

  /* ── Envia config ao WebView ── */
  const pushConfig = useCallback(() => {
    if (!webRef.current) return;
    webRef.current.postMessage(
      JSON.stringify({
        type: "config",
        panelW: parseFloat(panelW) || 1.13,
        panelH: parseFloat(panelH) || 2.28,
        rowSpacing: results?.gap ?? 0.5,
        colSpacing: 0.02,
        azimuth,
        manualCount: isManual ? parseInt(manualCount) : 0,
      })
    );
  }, [panelW, panelH, azimuth, results?.gap, manualCount, isManual]);

  useEffect(() => { pushConfig(); }, [pushConfig]);

  /* ── Mensagens do mapa ── */
  const onMessage = (data: string) => {
    try {
      const d = JSON.parse(data);
      if (d.type === "ready") { pushConfig(); }
      if (d.type === "roofMeasured") {
        setArea(d.area);
        setPanels(d.panelCount);
        setCapacity(d.capacity ?? d.panelCount);
        /* Guardar no contexto global para o relatório PDF */
        const fPanels = d.panelCount as number;
        const fPower = parseFloat(panelPower) || 400;
        const fFactor = orientationFactor(azimuth);
        setMapaData({
          roofArea: d.area,
          panelCount: fPanels,
          capacity: d.capacity ?? fPanels,
          totalKwp: parseFloat(((fPanels * fPower) / 1000).toFixed(2)),
          adjKwp: parseFloat(((fPanels * fPower * fFactor) / 1000).toFixed(2)),
          azimuth,
          orientationLabel: azLabel(azimuth),
          penaltyPct: Math.round((1 - fFactor) * 100),
          panelW: parseFloat(panelW) || 1.13,
          panelH: parseFloat(panelH) || 2.28,
          powerWp: fPower,
          roofBoundsW: d.boundsW ?? 0,
          roofBoundsH: d.boundsH ?? 0,
          panelSvg: d.panelSvg ?? "",
        });
      }
      if (d.type === "cleared") { setArea(null); setPanels(null); setCapacity(null); setMapaData(null); }
    } catch (_) {}
  };

  /* ── Voo para localidade do calculador ── */
  const flyTo = () => {
    if (!webRef.current || !params.latitude) return;
    const lat = parseFloat(params.latitude);
    if (!isNaN(lat))
      webRef.current.postMessage(JSON.stringify({ type: "flyTo", lat, lng: -8.0, zoom: 18 }));
  };

  /* ── Azimute ── */
  const changeAz = (delta: number) =>
    setAzimuth((prev) => (((prev + delta) % 360) + 360) % 360);

  const dirLabel = azLabel(azimuth);
  const isSouth = Math.abs(azimuth - 180) < 30;

  /* ── Render ── */
  return (
    <View style={[styles.root, { paddingTop: topInset }]}>

      {/* ── Cabeçalho ─── */}
      <View style={styles.header}>
        <LogoMini size={38} />
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>Mapa Satélite</Text>
          <Text style={styles.headerSub}>Projeção de painéis no telhado</Text>
        </View>
        {params.latitude ? (
          <TouchableOpacity style={styles.gpsBtn} onPress={flyTo}>
            <MaterialCommunityIcons name="crosshairs-gps" size={20} color={Colors.light.primary} />
          </TouchableOpacity>
        ) : null}
      </View>

      {/* ── Painel de configuração ─── */}
      <View style={styles.configBox}>
        {/* Linha 1 — dimensões, potência e nº painéis */}
        <View style={styles.configRow}>
          <View style={styles.cfgGroup}>
            <Text style={styles.cfgLbl}>Largura (m)</Text>
            <TextInput
              style={styles.cfgInput}
              value={panelW}
              onChangeText={setPanelW}
              keyboardType="numeric"
              placeholder="1.13"
              placeholderTextColor={Colors.light.tabIconDefault}
            />
          </View>
          <Text style={styles.cfgSep}>×</Text>
          <View style={styles.cfgGroup}>
            <Text style={styles.cfgLbl}>Altura (m)</Text>
            <TextInput
              style={styles.cfgInput}
              value={panelH}
              onChangeText={setPanelH}
              keyboardType="numeric"
              placeholder="2.28"
              placeholderTextColor={Colors.light.tabIconDefault}
            />
          </View>
          <View style={styles.cfgGroup}>
            <Text style={styles.cfgLbl}>Potência (Wp)</Text>
            <TextInput
              style={styles.cfgInput}
              value={panelPower}
              onChangeText={setPanelPower}
              keyboardType="numeric"
              placeholder="400"
              placeholderTextColor={Colors.light.tabIconDefault}
            />
          </View>
          <View style={styles.cfgGroup}>
            <Text style={styles.cfgLbl}>Nº Painéis</Text>
            <TextInput
              style={[
                styles.cfgInput,
                isManual && { borderColor: Colors.light.panel, borderWidth: 1.5 },
              ]}
              value={manualCount}
              onChangeText={setManualCount}
              keyboardType="numeric"
              placeholder={panels ? String(panels) : "auto"}
              placeholderTextColor={Colors.light.tabIconDefault}
            />
          </View>
        </View>

        {/* Linha 2 — azimute */}
        <View style={styles.azRow}>
          <MaterialCommunityIcons name="compass-rose" size={18} color={Colors.light.secondary} />
          <Text style={styles.cfgLbl}>Orientação:</Text>

          <TouchableOpacity style={styles.azBtn} onPress={() => changeAz(-5)}>
            <Feather name="chevron-left" size={18} color={Colors.light.text} />
          </TouchableOpacity>

          <View style={styles.azDisplay}>
            <Text style={styles.azDeg}>{azimuth}°</Text>
            <Text style={[styles.azDir, { color: isSouth ? Colors.light.success : Colors.light.primary }]}>
              {dirLabel}
            </Text>
          </View>

          <TouchableOpacity style={styles.azBtn} onPress={() => changeAz(+5)}>
            <Feather name="chevron-right" size={18} color={Colors.light.text} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.azPreset} onPress={() => setAzimuth(180)}>
            <Text style={styles.azPresetTxt}>S</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.azPreset} onPress={() => setAzimuth(135)}>
            <Text style={styles.azPresetTxt}>SE</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.azPreset} onPress={() => setAzimuth(225)}>
            <Text style={styles.azPresetTxt}>SO</Text>
          </TouchableOpacity>

          <View style={[styles.penBadge, penaltyPct > 10 ? styles.penBadgeWarn : styles.penBadgeOk]}>
            <Text style={styles.penTxt}>
              {penaltyPct === 0 ? "Ideal" : `-${penaltyPct}%`}
            </Text>
          </View>
        </View>
      </View>

      {/* ── Mapa ─── */}
      <View style={styles.mapWrap}>
        <WebMap
          ref={webRef}
          html={MAP_HTML}
          onMessage={onMessage}
          onLoadEnd={pushConfig}
          style={styles.webview}
        />
      </View>

      {/* ── Resultados ─── */}
      <View style={[styles.results, { paddingBottom: bottomInset }]}>
        {effectivePanels ? (
          <>
            <View style={styles.cards}>
              {area ? (
                <View style={styles.card}>
                  <Text style={styles.cardVal}>{area} m²</Text>
                  <Text style={styles.cardLbl}>Área do telhado</Text>
                </View>
              ) : null}
              <View style={[styles.card, styles.cardHighlight]}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 3 }}>
                  <Text style={[styles.cardVal, { color: Colors.light.panel }]}>
                    {effectivePanels}
                  </Text>
                  {isManual && (
                    <View style={styles.manualBadge}>
                      <Text style={styles.manualBadgeTxt}>✎</Text>
                    </View>
                  )}
                </View>
                <Text style={styles.cardLbl}>
                  Painéis{"\n"}
                  {isManual ? "definido manualmente" : "calculado pelo mapa"}
                </Text>
              </View>
              <View style={styles.card}>
                <Text style={styles.cardVal}>{totalKwp} kWp</Text>
                <Text style={styles.cardLbl}>Potência total{"\n"}({effectivePanels}×{powerWp}W)</Text>
              </View>
              <View style={[styles.card, { borderColor: Colors.light.success + "80", borderWidth: 1.5 }]}>
                <Text style={[styles.cardVal, { color: Colors.light.success }]}>{adjKwp} kWp</Text>
                <Text style={styles.cardLbl}>
                  Ajustada{"\n"}({dirLabel}{penaltyPct > 0 ? `, -${penaltyPct}%` : ", ideal"})
                </Text>
              </View>
            </View>
            {overflowWarning && (
              <View style={styles.warnRow}>
                <MaterialCommunityIcons name="alert" size={13} color="#D97706" />
                <Text style={styles.warnTxt}>
                  A área só comporta {capacity} painéis — foram desenhados {capacity} de {manualCount} pedidos
                </Text>
              </View>
            )}
            <Text style={styles.note}>
              {isManual
                ? `Visualmente: ${effectivePanels} painéis dentro da área · Limpe "Nº Painéis" para modo auto`
                : "✏️ Edite a forma no mapa · Orientação ideal: Sul (180°)"}
            </Text>
          </>
        ) : (
          <View style={styles.hint}>
            <MaterialCommunityIcons name="gesture-tap" size={22} color={Colors.light.tabIconDefault} />
            <Text style={styles.hintTxt}>
              Introduza o Nº de Painéis acima, ou use ◻/⬡ no mapa para calcular automaticamente.
            </Text>
          </View>
        )}
      </View>
    </View>
  );
}

/* ─── Estilos ──────────────────────────────────────────────────── */
const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.light.background },

  header: {
    flexDirection: "row", alignItems: "center", gap: 10,
    paddingHorizontal: 14, paddingVertical: 8,
    borderBottomWidth: 1, borderBottomColor: Colors.light.border,
    backgroundColor: Colors.light.card,
  },
  headerTitle: { fontSize: 16, fontFamily: "Inter_700Bold", color: Colors.light.text },
  headerSub: { fontSize: 10, fontFamily: "Inter_400Regular", color: Colors.light.textSecondary },
  gpsBtn: { padding: 7, borderRadius: 8, backgroundColor: Colors.light.backgroundSecondary },

  configBox: {
    backgroundColor: Colors.light.card,
    borderBottomWidth: 1, borderBottomColor: Colors.light.border,
    paddingHorizontal: 12, paddingVertical: 8, gap: 6,
  },
  configRow: { flexDirection: "row", alignItems: "flex-end", gap: 6 },
  cfgGroup: { flex: 1, gap: 2 },
  cfgLbl: { fontSize: 9, fontFamily: "Inter_600SemiBold", color: Colors.light.textSecondary, textTransform: "uppercase" },
  cfgInput: {
    borderWidth: 1, borderColor: Colors.light.border, borderRadius: 8,
    paddingHorizontal: 8, paddingVertical: 5,
    fontSize: 14, fontFamily: "Inter_600SemiBold", color: Colors.light.text,
    backgroundColor: Colors.light.backgroundSecondary, textAlign: "center",
  },
  cfgSep: { fontSize: 16, color: Colors.light.textSecondary, paddingBottom: 6 },

  azRow: {
    flexDirection: "row", alignItems: "center", gap: 5,
    flexWrap: "nowrap",
  },
  azBtn: {
    padding: 5, borderRadius: 6,
    backgroundColor: Colors.light.backgroundSecondary,
    borderWidth: 1, borderColor: Colors.light.border,
  },
  azDisplay: {
    flexDirection: "row", alignItems: "baseline", gap: 4,
    backgroundColor: Colors.light.backgroundSecondary,
    borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4,
    borderWidth: 1, borderColor: Colors.light.border, minWidth: 72,
    justifyContent: "center",
  },
  azDeg: { fontSize: 14, fontFamily: "Inter_700Bold", color: Colors.light.text },
  azDir: { fontSize: 12, fontFamily: "Inter_700Bold" },
  azPreset: {
    paddingHorizontal: 7, paddingVertical: 4, borderRadius: 6,
    backgroundColor: Colors.light.secondary + "18",
    borderWidth: 1, borderColor: Colors.light.secondary + "40",
  },
  azPresetTxt: { fontSize: 11, fontFamily: "Inter_600SemiBold", color: Colors.light.secondary },
  penBadge: {
    paddingHorizontal: 8, paddingVertical: 3, borderRadius: 12,
    marginLeft: "auto" as any,
  },
  penBadgeOk: { backgroundColor: Colors.light.success + "22" },
  penBadgeWarn: { backgroundColor: Colors.light.primary + "22" },
  penTxt: { fontSize: 12, fontFamily: "Inter_700Bold", color: Colors.light.text },

  mapWrap: { flex: 1, position: "relative" },
  webview: { flex: 1, backgroundColor: Colors.light.secondary },

  results: {
    backgroundColor: Colors.light.card,
    borderTopWidth: 1, borderTopColor: Colors.light.border,
    padding: 12,
  },
  cards: { flexDirection: "row", gap: 7, marginBottom: 6 },
  card: {
    flex: 1, backgroundColor: Colors.light.backgroundSecondary,
    borderRadius: 10, padding: 8, alignItems: "center", gap: 2,
    borderWidth: 1, borderColor: Colors.light.border,
  },
  cardHighlight: { borderColor: Colors.light.panel, borderWidth: 1.5 },
  cardVal: { fontSize: 13, fontFamily: "Inter_700Bold", color: Colors.light.text },
  cardLbl: {
    fontSize: 8, fontFamily: "Inter_400Regular",
    color: Colors.light.textSecondary, textAlign: "center", lineHeight: 11,
  },
  note: {
    fontSize: 9, fontFamily: "Inter_400Regular",
    color: Colors.light.tabIconDefault, textAlign: "center",
  },
  hint: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 2 },
  hintTxt: {
    flex: 1, fontSize: 12, fontFamily: "Inter_400Regular",
    color: Colors.light.tabIconDefault, lineHeight: 18,
  },
  manualBadge: {
    backgroundColor: Colors.light.panel + "22",
    borderRadius: 4, paddingHorizontal: 3,
  },
  manualBadgeTxt: { fontSize: 10, color: Colors.light.panel },
  warnRow: {
    flexDirection: "row", alignItems: "center", gap: 5,
    backgroundColor: "#FEF3C7", borderRadius: 8,
    paddingHorizontal: 8, paddingVertical: 5, marginBottom: 4,
  },
  warnTxt: { flex: 1, fontSize: 10, fontFamily: "Inter_400Regular", color: "#92400E" },
});
