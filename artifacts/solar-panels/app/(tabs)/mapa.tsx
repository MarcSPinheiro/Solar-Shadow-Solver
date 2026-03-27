import React, { useRef, useState, useCallback, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  Platform,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import WebMap, { WebMapRef } from "@/components/WebMap";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import Colors from "@/constants/colors";
import { useSolar } from "@/context/SolarContext";
import { LogoMini } from "@/components/LogoMini";

/* ─── HTML do mapa Leaflet ─────────────────────────────────────── */
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
  background: rgba(13,43,69,0.88); color: #fff; padding: 6px 14px;
  border-radius: 16px; font-family: -apple-system,sans-serif; font-size: 12px;
  z-index: 1000; pointer-events: none; white-space: nowrap; max-width: 90%;
  border: 1px solid rgba(245,166,35,0.4);
}
.leaflet-draw-toolbar a { background-color: #0D2B45 !important; }
.leaflet-draw-toolbar a:hover { background-color: #1a3d5c !important; }
</style>
</head>
<body>
<div id="map"></div>
<div id="info" class="info-bar">📐 Use a ferramenta para desenhar a área do telhado</div>

<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/leaflet.draw/1.0.4/leaflet.draw.js"></script>
<script>
var map = L.map('map', { center: [39.6, -8.0], zoom: 7, zoomControl: true });

// Esri Satellite (gratuito, sem API key)
L.tileLayer(
  'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
  { attribution: '© Esri', maxZoom: 21, maxNativeZoom: 19 }
).addTo(map);

// Labels layer
L.tileLayer(
  'https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}',
  { attribution: '', maxZoom: 21, maxNativeZoom: 19, opacity: 0.6 }
).addTo(map);

var drawnItems = new L.FeatureGroup().addTo(map);
var panelLayer = new L.FeatureGroup().addTo(map);

var drawControl = new L.Control.Draw({
  position: 'topright',
  draw: {
    rectangle: {
      shapeOptions: { color: '#F5A623', weight: 2, fillColor: '#F5A623', fillOpacity: 0.15 },
    },
    polygon: {
      shapeOptions: { color: '#F5A623', weight: 2, fillColor: '#F5A623', fillOpacity: 0.15 },
      allowIntersection: false,
    },
    polyline: false, circle: false, circlemarker: false, marker: false,
  },
  edit: { featureGroup: drawnItems, remove: true },
});
map.addControl(drawControl);

// Configuração dos painéis (actualizada por postMessage)
var CFG = { panelW: 1.0, panelH: 2.0, rowSpacing: 0.5, colSpacing: 0.05 };

function sendRN(obj) {
  var s = JSON.stringify(obj);
  try { window.ReactNativeWebView.postMessage(s); } catch(e) {
    try { window.parent.postMessage(s, '*'); } catch(e2) {}
  }
}

function latM(m) { return m / 110574; }
function lngM(m, lat) { return m / (111320 * Math.cos(lat * Math.PI / 180)); }

function getBoundsArea(bounds) {
  var nw = bounds.getNorthWest(), ne = bounds.getNorthEast(), sw = bounds.getSouthWest();
  return nw.distanceTo(ne) * nw.distanceTo(sw);
}

function drawPanels(layer) {
  panelLayer.clearLayers();
  var bounds = layer.getBounds ? layer.getBounds() : null;
  if (!bounds) return 0;

  var nw = bounds.getNorthWest(), se = bounds.getSouthEast();
  var centerLat = (nw.lat + se.lat) / 2;

  var stepLat = latM(CFG.panelH + CFG.rowSpacing);
  var stepLng = lngM(CFG.panelW + CFG.colSpacing, centerLat);
  var pLat    = latM(CFG.panelH);
  var pLng    = lngM(CFG.panelW, centerLat);

  var count = 0, drawn = 0;
  var lat = nw.lat;
  while (lat - pLat >= se.lat - 0.000001) {
    var lng = nw.lng;
    while (lng + pLng <= se.lng + 0.000001) {
      count++;
      if (drawn < 300) {
        L.rectangle([[lat, lng],[lat - pLat, lng + pLng]], {
          color: '#1E88E5', weight: 0.8,
          fillColor: '#2B6CB0', fillOpacity: 0.75,
        }).addTo(panelLayer);
        drawn++;
      }
      lng += stepLng;
    }
    lat -= stepLat;
  }
  return count;
}

function onLayerChange(layer) {
  var bounds = layer.getBounds ? layer.getBounds() : null;
  if (!bounds) return;

  var latlngs = layer.getLatLngs ? layer.getLatLngs() : null;
  var area;
  if (latlngs) {
    var flat = Array.isArray(latlngs[0]) ? latlngs[0] : latlngs;
    try { area = L.GeometryUtil.geodesicArea(flat); } catch(e) { area = 0; }
  }
  if (!area || area < 1) area = getBoundsArea(bounds);

  var count = drawPanels(layer);
  var kw = (count * 0.4).toFixed(1);
  document.getElementById('info').textContent =
    'Área: ' + area.toFixed(0) + ' m\u00B2  |  Painéis: ' + count + '  |  ~' + kw + ' kWp';

  sendRN({ type: 'roofMeasured', area: Math.round(area), panelCount: count,
    lat: bounds.getCenter().lat, lng: bounds.getCenter().lng });
}

map.on('draw:created', function(e) {
  drawnItems.clearLayers();
  drawnItems.addLayer(e.layer);
  onLayerChange(e.layer);
});
map.on('draw:edited', function(e) {
  e.layers.eachLayer(function(l) { onLayerChange(l); });
});
map.on('draw:deleted', function() {
  panelLayer.clearLayers();
  document.getElementById('info').textContent = '📐 Use a ferramenta para desenhar a área do telhado';
  sendRN({ type: 'cleared' });
});

function handleMsg(e) {
  try {
    var d = typeof e.data === 'string' ? JSON.parse(e.data) : e.data;
    if (!d || !d.type) return;
    if (d.type === 'config') {
      if (d.panelW) CFG.panelW = d.panelW;
      if (d.panelH) CFG.panelH = d.panelH;
      if (d.rowSpacing !== undefined) CFG.rowSpacing = d.rowSpacing;
      drawnItems.eachLayer(function(l) { onLayerChange(l); });
    }
    if (d.type === 'flyTo') {
      map.flyTo([d.lat, d.lng], d.zoom || 19, { duration: 1.5 });
    }
  } catch(err) {}
}
document.addEventListener('message', handleMsg);
window.addEventListener('message', handleMsg);

setTimeout(function() { sendRN({ type: 'ready' }); }, 800);
</script>
</body>
</html>`;

/* ─── Componente React Native ──────────────────────────────────── */
export default function MapaScreen() {
  const insets = useSafeAreaInsets();
  const { params, results } = useSolar();
  const webRef = useRef<WebMapRef>(null);
  const [ready, setReady] = useState(true);
  const [area, setArea] = useState<number | null>(null);
  const [panels, setPanels] = useState<number | null>(null);

  const topInset = Platform.OS === "web" ? 67 : insets.top;
  const bottomInset = Platform.OS === "web" ? 84 : insets.bottom + 80;

  /* Envia dimensões dos painéis para o WebView */
  const pushConfig = useCallback(() => {
    if (!webRef.current) return;
    const cfg = {
      type: "config",
      panelW: parseFloat(params.panelWidth) || 1.0,
      panelH: parseFloat(params.panelHeight) || 2.0,
      rowSpacing: results?.gap ?? 0.5,
    };
    webRef.current.postMessage(JSON.stringify(cfg));
  }, [params.panelWidth, params.panelHeight, results?.gap]);

  useEffect(() => {
    if (ready) pushConfig();
  }, [ready, pushConfig]);

  /* Mensagens vindas do mapa */
  const onMessage = (data: string) => {
    try {
      const d = JSON.parse(data);
      if (d.type === "ready") { setReady(true); pushConfig(); }
      if (d.type === "roofMeasured") { setArea(d.area); setPanels(d.panelCount); }
      if (d.type === "cleared") { setArea(null); setPanels(null); }
    } catch (_) {}
  };

  /* Centra o mapa na localidade calculada */
  const flyToLocation = () => {
    if (!webRef.current || !params.latitude) return;
    const lat = parseFloat(params.latitude);
    if (isNaN(lat)) return;
    webRef.current.postMessage(JSON.stringify({ type: "flyTo", lat, lng: -8.0, zoom: 18 }));
  };

  const powerKwp = panels ? (panels * 0.4).toFixed(1) : null;
  const panelLabel = `${params.panelWidth || "1.0"} × ${params.panelHeight || "2.0"} m`;

  return (
    <View style={[styles.root, { paddingTop: topInset }]}>

      {/* ── Cabeçalho ─── */}
      <View style={styles.header}>
        <LogoMini size={40} />
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>Mapa Satélite</Text>
          <Text style={styles.headerSub}>Dimensione os painéis no telhado</Text>
        </View>
        {params.latitude ? (
          <TouchableOpacity style={styles.gpsBtn} onPress={flyToLocation}>
            <MaterialCommunityIcons name="crosshairs-gps" size={20} color={Colors.light.primary} />
          </TouchableOpacity>
        ) : null}
      </View>

      {/* ── Mapa ─── */}
      <View style={styles.mapWrap}>
        {!ready && (
          <View style={styles.loading}>
            <ActivityIndicator color={Colors.light.primary} size="large" />
            <Text style={styles.loadTxt}>A carregar mapa satélite…</Text>
          </View>
        )}
        <WebMap
          ref={webRef}
          html={MAP_HTML}
          onMessage={onMessage}
          onLoadEnd={() => setReady(true)}
          style={styles.webview}
        />
      </View>

      {/* ── Resultados ─── */}
      <View style={[styles.results, { paddingBottom: bottomInset }]}>
        {area ? (
          <>
            <View style={styles.cards}>
              <View style={styles.card}>
                <Text style={styles.cardVal}>{area} m²</Text>
                <Text style={styles.cardLbl}>Área do telhado</Text>
              </View>
              <View style={[styles.card, { borderColor: Colors.light.panel, borderWidth: 1.5 }]}>
                <Text style={[styles.cardVal, { color: Colors.light.panel }]}>{panels}</Text>
                <Text style={styles.cardLbl}>Painéis ({panelLabel})</Text>
              </View>
              <View style={styles.card}>
                <Text style={[styles.cardVal, { color: Colors.light.success }]}>{powerKwp} kWp</Text>
                <Text style={styles.cardLbl}>Potência estimada</Text>
              </View>
            </View>
            <Text style={styles.note}>
              Clique na forma para editar · 🗑 para apagar · Painéis de 400W
            </Text>
          </>
        ) : (
          <View style={styles.hint}>
            <MaterialCommunityIcons name="gesture-tap" size={22} color={Colors.light.tabIconDefault} />
            <Text style={styles.hintTxt}>
              Use ◻ ou ⬡ na barra do mapa para desenhar a área do telhado.{"\n"}
              Os painéis aparecem automaticamente.
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
    flexDirection: "row", alignItems: "center", gap: 12,
    paddingHorizontal: 16, paddingVertical: 10,
    borderBottomWidth: 1, borderBottomColor: Colors.light.border,
    backgroundColor: Colors.light.card,
  },
  headerTitle: { fontSize: 17, fontFamily: "Inter_700Bold", color: Colors.light.text },
  headerSub: { fontSize: 11, fontFamily: "Inter_400Regular", color: Colors.light.textSecondary },
  gpsBtn: {
    padding: 8, borderRadius: 10,
    backgroundColor: Colors.light.backgroundSecondary,
  },
  mapWrap: { flex: 1, position: "relative" },
  webview: { flex: 1, backgroundColor: Colors.light.secondary },
  loading: {
    ...StyleSheet.absoluteFillObject, backgroundColor: Colors.light.secondary,
    justifyContent: "center", alignItems: "center", gap: 14, zIndex: 10,
  },
  loadTxt: { color: "#fff", fontFamily: "Inter_400Regular", fontSize: 14 },
  results: {
    backgroundColor: Colors.light.card,
    borderTopWidth: 1, borderTopColor: Colors.light.border,
    padding: 14,
  },
  cards: { flexDirection: "row", gap: 10, marginBottom: 8 },
  card: {
    flex: 1, backgroundColor: Colors.light.backgroundSecondary,
    borderRadius: 12, padding: 10, alignItems: "center", gap: 3,
    borderWidth: 1, borderColor: Colors.light.border,
  },
  cardVal: { fontSize: 16, fontFamily: "Inter_700Bold", color: Colors.light.text },
  cardLbl: {
    fontSize: 9, fontFamily: "Inter_400Regular",
    color: Colors.light.textSecondary, textAlign: "center",
  },
  note: {
    fontSize: 10, fontFamily: "Inter_400Regular",
    color: Colors.light.tabIconDefault, textAlign: "center",
  },
  hint: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 4 },
  hintTxt: {
    flex: 1, fontSize: 12, fontFamily: "Inter_400Regular",
    color: Colors.light.tabIconDefault, lineHeight: 18,
  },
});
